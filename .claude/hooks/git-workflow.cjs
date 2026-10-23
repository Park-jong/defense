const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
let root, lockPath, locked = false;
const mode = process.argv[2];

function git(args, optional = false) {
  const r = spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 45000 });
  if (r.error || r.status !== 0) {
    if (optional) return null;
    throw new Error(r.error?.message || r.stderr.trim() || `git ${args[0]} 실패`);
  }
  return r.stdout.trim();
}

function changes() {
  const r = spawnSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], { cwd: root, encoding: 'utf8', windowsHide: true });
  if (r.status !== 0) throw new Error(r.stderr || '작업 폴더 상태를 읽을 수 없습니다.');
  const entries = r.stdout.split('\0'), files = {};
  for (let i = 0; i < entries.length; i++) {
    if (!entries[i]) continue;
    const status = entries[i].slice(0, 2), file = entries[i].slice(3);
    if (/[RC]/.test(status)) i++;
    const absolute = path.resolve(root, file);
    files[file] = fs.existsSync(absolute) && fs.statSync(absolute).isFile()
      ? createHash('sha256').update(fs.readFileSync(absolute)).digest('hex') : 'deleted';
  }
  return files;
}

function acquireLock() {
  const deadline = Date.now() + 20000;
  while (true) {
    try {
      const handle = fs.openSync(lockPath, 'wx');
      fs.writeFileSync(handle, String(process.pid)); fs.closeSync(handle); locked = true; return;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      try {
        const pid = Number(fs.readFileSync(lockPath, 'utf8'));
        if (pid > 0) process.kill(pid, 0);
      } catch (check) {
        if (check.code === 'ESRCH') { fs.unlinkSync(lockPath); continue; }
      }
      if (Date.now() >= deadline) throw new Error('다른 Git 동기화가 실행 중입니다. 해당 작업이 끝난 뒤 다시 시도하세요.');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
}

function run(input) {
  // Leave Git commands available for recovery and publication after a failed pull.
  const command = input.tool_input?.command ?? input.tool_input?.cmd ?? '';
  if (mode === 'before' && /^\s*git\s/.test(command)) return {};
  const location = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: input.cwd || process.cwd(), encoding: 'utf8', windowsHide: true,
  });
  if (location.status !== 0) return {};
  root = location.stdout.trim();
  const stateDir = path.join(git(['rev-parse', '--absolute-git-dir']), 'agent-workflow');
  fs.mkdirSync(stateDir, { recursive: true });
  const session = createHash('sha256').update(input.session_id || 'default').digest('hex').slice(0, 24);
  const statePath = path.join(stateDir, session + '.json');
  lockPath = path.join(stateDir, 'sync.lock');
  acquireLock();
  const branch = git(['symbolic-ref', '--short', 'HEAD'], true);
  if (!branch) throw new Error('분리된 HEAD 상태입니다. 작업 브랜치로 전환한 뒤 다시 시도하세요.');
  const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : null;
  if (mode === 'before') {
    if (git(['diff', '--name-only', '--diff-filter=U'])) throw new Error('해결되지 않은 병합 충돌이 있습니다. 먼저 충돌을 해결하세요.');
    const upstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], true);
    if (upstream) git(['pull', '--ff-only']);
    else {
      const remoteHead = git(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], true) || 'origin/main';
      git(['pull', '--ff-only', 'origin', remoteHead.replace(/^origin\//, '')]);
    }
    if (!state || state.branch !== branch) fs.writeFileSync(statePath, JSON.stringify({ branch, head: git(['rev-parse', 'HEAD']), baseline: changes() }));
    return {};
  }
  if (mode !== 'finish') throw new Error(`알 수 없는 실행 모드: ${mode}`);
  if (!state) return {};
  if (state.branch !== branch) throw new Error('작업 중 브랜치가 바뀌었습니다. 현재 작업 범위를 확인하고 커밋·푸시를 마무리하세요.');
  const pending = Object.entries(changes()).filter(([file, hash]) => state.baseline[file] !== hash).map(([file]) => file);
  const upstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], true);
  const ahead = upstream ? Number(git(['rev-list', '--count', `${upstream}..HEAD`])) : Number(git(['rev-parse', 'HEAD']) !== state.head);
  if (!pending.length && !ahead) { fs.unlinkSync(statePath); return {}; }
  const reason = [
    '이 프로젝트는 수정 완료 후 커밋과 원격 푸시를 자동으로 수행합니다. 사용자에게 재확인을 요청하지 말고 계속 처리하세요.',
    pending.length ? `미커밋 변경: ${pending.join(', ')}` : '',
    ahead ? `아직 게시되지 않은 커밋: ${ahead}개` : '',
    '관련 검증을 완료하고 이번 작업의 변경만 명시적으로 스테이징한 뒤 한국어 메시지로 커밋하세요. 기존 사용자 변경은 포함하지 마세요.',
    upstream ? '현재 브랜치의 기존 upstream으로 일반 git push를 실행하세요.' : `git push --set-upstream origin ${branch} 명령으로 현재 브랜치를 게시하세요.`,
    'git status와 로컬·원격 커밋 차이로 완료를 확인하세요. 강제 푸시나 변경 폐기는 사용하지 마세요.',
  ].filter(Boolean).join('\n');
  // Report persistent errors instead of triggering an endless Stop continuation.
  return input.stop_hook_active ? { systemMessage: reason } : { decision: 'block', reason };
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { raw += chunk; });
process.stdin.on('end', () => {
  try { process.stdout.write(JSON.stringify(run(JSON.parse(raw || '{}'))) + '\n'); }
  catch (error) {
    if (mode === 'finish') process.stdout.write(JSON.stringify({ decision: 'block', reason: `Git 자동 게시를 마무리하세요: ${error.message}` }) + '\n');
    else { process.stderr.write(`수정 전 git pull에 실패하여 편집을 중단합니다: ${error.message}\n`); process.exitCode = 2; }
  } finally { if (locked) fs.unlinkSync(lockPath); }
});
