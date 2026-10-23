const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const hook = path.resolve(__dirname, '../.claude/hooks/git-workflow.cjs');
const cache = path.resolve(__dirname, '../node_modules/.cache');
fs.mkdirSync(cache, { recursive: true });

function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
}
function identity(cwd) {
  git(cwd, 'config', 'user.name', 'Hook Test'); git(cwd, 'config', 'user.email', 'hook-test@example.invalid');
  git(cwd, 'config', 'commit.gpgsign', 'false'); git(cwd, 'config', 'core.autocrlf', 'false');
}
function fixture() {
  const folder = fs.mkdtempSync(path.join(cache, 'git-workflow-tests-'));
  const remote = path.join(folder, 'remote.git'), local = path.join(folder, 'local'), other = path.join(folder, 'other');
  git(folder, 'init', '--bare', remote); git(folder, 'init', '--initial-branch=main', local); identity(local);
  fs.writeFileSync(path.join(local, 'game.txt'), 'initial\n');
  git(local, 'add', 'game.txt'); git(local, 'commit', '-m', 'initial');
  git(local, 'remote', 'add', 'origin', remote); git(local, 'push', '--set-upstream', 'origin', 'main');
  git(folder, 'clone', '--branch', 'main', remote, other); identity(other);
  return { folder, remote, local, other };
}
function input(cwd, extra = {}) {
  return JSON.stringify({ cwd, session_id: 'test-session', tool_name: 'Write', tool_input: { file_path: 'game.txt' }, ...extra });
}
function invoke(cwd, mode, extra) {
  return spawnSync(process.execPath, [hook, mode], { cwd, input: input(cwd, extra), encoding: 'utf8', windowsHide: true });
}
function before(cwd) { const r = invoke(cwd, 'before'); assert.equal(r.status, 0, r.stderr); }
function finish(cwd, extra) { const r = invoke(cwd, 'finish', extra); assert.equal(r.status, 0, r.stderr); return JSON.parse(r.stdout); }
function advance(cwd, file = 'remote.txt') {
  fs.writeFileSync(path.join(cwd, file), 'remote contribution\n');
  git(cwd, 'add', file); git(cwd, 'commit', '-m', 'remote work'); git(cwd, 'push');
}

test('editing starts with the other contributor’s latest commit', () => {
  const { local, other } = fixture(); advance(other); before(local);
  assert.equal(git(local, 'rev-parse', 'HEAD'), git(other, 'rev-parse', 'HEAD'));
  assert.equal(fs.readFileSync(path.join(local, 'remote.txt'), 'utf8'), 'remote contribution\n');
});

test('pre-existing user edits survive pull and are not requested for automatic commit', () => {
  const { local, other } = fixture(); fs.writeFileSync(path.join(local, 'game.txt'), 'user edit\n');
  advance(other); before(local);
  assert.equal(fs.readFileSync(path.join(local, 'game.txt'), 'utf8'), 'user edit\n');
  assert.deepEqual(finish(local), {});
  assert.equal(git(local, 'diff', '--cached'), '');
});

test('Stop continues the agent when its new changes are uncommitted', () => {
  const { local } = fixture(); before(local);
  fs.writeFileSync(path.join(local, 'game.txt'), 'agent change\n');
  const r = finish(local); assert.equal(r.decision, 'block'); assert.match(r.reason, /game\.txt/);
  assert.equal(git(local, 'diff', '--cached'), '');
});

test('a commit still requires push; a completed push permits Stop', () => {
  const { local } = fixture(); before(local);
  fs.writeFileSync(path.join(local, 'game.txt'), 'agent change\n');
  git(local, 'add', 'game.txt'); git(local, 'commit', '-m', 'agent change');
  assert.equal(finish(local).decision, 'block'); git(local, 'push');
  assert.deepEqual(finish(local), {});
  assert.equal(git(local, 'rev-list', '--left-right', '--count', 'HEAD...origin/main'), '0\t0');
});

test('divergent history blocks edits without discarding either contributor’s commit', () => {
  const { local, other } = fixture();
  fs.writeFileSync(path.join(local, 'local.txt'), 'local work\n');
  git(local, 'add', 'local.txt'); git(local, 'commit', '-m', 'local work');
  const original = git(local, 'rev-parse', 'HEAD'); advance(other);
  const r = invoke(local, 'before'); assert.equal(r.status, 2); assert.match(r.stderr, /git pull/);
  assert.equal(git(local, 'rev-parse', 'HEAD'), original);
  assert.equal(git(local, 'rev-parse', 'origin/main'), git(other, 'rev-parse', 'HEAD'));
});

test('new branches pull the default base and publish their own name', () => {
  const { local, other } = fixture(); git(local, 'switch', '-c', 'feature'); advance(other); before(local);
  fs.writeFileSync(path.join(local, 'feature.txt'), 'feature\n');
  git(local, 'add', 'feature.txt'); git(local, 'commit', '-m', 'feature');
  const r = finish(local); assert.equal(r.decision, 'block'); assert.match(r.reason, /--set-upstream origin feature/);
  git(local, 'push', '--set-upstream', 'origin', 'feature'); assert.deepEqual(finish(local), {});
});

test('an unavailable remote blocks editing and preserves existing files', () => {
  const { local, folder } = fixture(); git(local, 'remote', 'set-url', 'origin', path.join(folder, 'missing.git'));
  const original = fs.readFileSync(path.join(local, 'game.txt'), 'utf8');
  assert.equal(invoke(local, 'before').status, 2);
  assert.equal(fs.readFileSync(path.join(local, 'game.txt'), 'utf8'), original);
});

test('Git recovery commands remain possible after a failed pull', () => {
  const { local, folder } = fixture(); git(local, 'remote', 'set-url', 'origin', path.join(folder, 'missing.git'));
  assert.equal(invoke(local, 'before', { tool_name: 'Bash', tool_input: { command: 'git remote -v' } }).status, 0);
});

test('concurrent hooks serialize Git operations instead of colliding on index locks', async () => {
  const { local } = fixture();
  const one = () => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [hook, 'before'], { cwd: local, windowsHide: true });
    let err = ''; child.stderr.on('data', d => { err += d; }); child.stdout.resume();
    child.on('error', reject); child.on('close', code => code === 0 ? resolve() : reject(new Error(err)));
    child.stdin.end(input(local));
  });
  await Promise.all([one(), one()]); assert.deepEqual(finish(local), {});
});

test('a persistent Stop failure is reported without an infinite continuation loop', () => {
  const { local } = fixture(); before(local); fs.writeFileSync(path.join(local, 'game.txt'), 'unfinished\n');
  const r = finish(local, { stop_hook_active: true });
  assert.equal(r.decision, undefined); assert.match(r.systemMessage, /미커밋 변경/);
});
