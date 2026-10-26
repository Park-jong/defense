const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
let root, lockPath, locked = false;
const mode = process.argv[2];
const deploymentMode = mode === 'deploy-check' || mode === 'deployed';

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

function deployableHead() {
  const head = git(['rev-parse', 'HEAD']);
  const upstream = git(['rev-parse', '@{upstream}'], true);
  // A detached deployment worktree can publish a commit that already exists on a remote branch.
  const detached = !git(['symbolic-ref', '--quiet', 'HEAD'], true);
  const published = upstream === head || detached && git(['for-each-ref', '--format=%(objectname)', 'refs/remotes']).split('\n').includes(head);
  if (!published) throw new Error('배포 전에 현재 브랜치를 upstream으로 푸시하고 로컬·원격 커밋을 일치시키세요.');
  if (Object.keys(changes()).length) throw new Error('커밋되지 않은 변경이 있습니다. 이번 작업을 커밋·푸시하거나 기존 사용자 변경을 보존한 별도 작업 트리에서 배포하세요.');
  return head;
}

// 이번 세션에서 직접 만든 feat 커밋은 minor, fix 커밋은 patch 이상 package.json의 version을 올려야 한다.
const BUMP_LEVELS = ['patch', 'minor', 'major'];
function versionAt(rev) {
  try { return JSON.parse(git(['show', `${rev}:package.json`], true) || '{}').version?.split('.').map(Number) ?? null; }
  catch { return null; }
}
function versionGap(base) {
  const me = git(['config', 'user.email'], true);
  const subjects = git(['log', '--no-merges', '--format=%ce%x00%s', `${base}..HEAD`]).split('\n').filter(Boolean)
    .map(line => line.split('\0')).filter(([email]) => !me || email === me).map(([, subject]) => subject);
  const need = Math.max(-1, ...subjects.map(s => ({ feat: 1, fix: 0 })[/^(?:\S+\s+)?(\w+)(?:\([^)]*\))?!?:/.exec(s)?.[1]] ?? -1));
  const from = versionAt(base), to = versionAt('HEAD');
  if (need < 0 || !from || !to) return null;
  const raised = to[0] > from[0] ? 2 : to[0] < from[0] ? -1 : to[1] > from[1] ? 1 : to[1] < from[1] ? -1 : to[2] > from[2] ? 0 : -1;
  return raised >= need ? null : { level: BUMP_LEVELS[need], from: from.join('.'), to: to.join('.') };
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
  if (location.status !== 0) {
    if (deploymentMode) throw new Error('Git 저장소 안에서 배포하세요.');
    return {};
  }
  root = location.stdout.trim();
  const stateDir = path.join(git(['rev-parse', '--absolute-git-dir']), 'agent-workflow');
  fs.mkdirSync(stateDir, { recursive: true });
  const commonStateDir = path.resolve(root, git(['rev-parse', '--git-common-dir']), 'agent-workflow');
  fs.mkdirSync(commonStateDir, { recursive: true });
  const deploymentPath = path.join(commonStateDir, 'deployment.json');
  const deploymentPendingPath = path.join(stateDir, 'deployment-pending.json');
  const session = createHash('sha256').update(input.session_id || 'default').digest('hex').slice(0, 24);
  const statePath = path.join(stateDir, session + '.json');
  lockPath = path.join(stateDir, 'sync.lock');
  acquireLock();
  const branch = git(['symbolic-ref', '--short', 'HEAD'], true);
  if (!branch && !deploymentMode) throw new Error('분리된 HEAD 상태입니다. 작업 브랜치로 전환한 뒤 다시 시도하세요.');
  const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : null;
  if (mode === 'deploy-check') {
    const head = deployableHead();
    fs.writeFileSync(deploymentPendingPath, JSON.stringify({ branch, head }));
    return { readyToDeploy: head };
  }
  if (mode === 'deployed') {
    const head = deployableHead();
    const pending = fs.existsSync(deploymentPendingPath) ? JSON.parse(fs.readFileSync(deploymentPendingPath, 'utf8')) : null;
    if (pending?.head !== head || pending.branch !== branch) throw new Error('배포를 준비한 소스 커밋과 현재 브랜치가 다릅니다. npm run deploy를 다시 실행하세요.');
    fs.writeFileSync(deploymentPath, JSON.stringify({ branch, head }));
    fs.unlinkSync(deploymentPendingPath);
    return { deployed: head };
  }
  if (mode === 'before') {
    const previousHead = git(['rev-parse', 'HEAD']);
    if (git(['diff', '--name-only', '--diff-filter=U'])) throw new Error('해결되지 않은 병합 충돌이 있습니다. 먼저 충돌을 해결하세요.');
    const upstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], true);
    if (upstream) git(['pull', '--ff-only']);
    else {
      const remoteHead = git(['symbolic-ref', '--short', 'refs/remotes/origin/HEAD'], true) || 'origin/main';
      git(['pull', '--ff-only', 'origin', remoteHead.replace(/^origin\//, '')]);
    }
    const head = git(['rev-parse', 'HEAD']);
    if (!state || state.branch !== branch) fs.writeFileSync(statePath, JSON.stringify({ branch, head, baseline: changes() }));
    else if (state.head === previousHead && head !== previousHead) {
      // A read-only session that only pulls another contributor's work does not publish it again.
      state.head = head; fs.writeFileSync(statePath, JSON.stringify(state));
    }
    return {};
  }
  if (mode !== 'finish') throw new Error(`알 수 없는 실행 모드: ${mode}`);
  if (!state) return {};
  if (state.branch !== branch) throw new Error('작업 중 브랜치가 바뀌었습니다. 현재 작업 범위를 확인하고 커밋·푸시·배포를 마무리하세요.');
  const pending = Object.entries(changes()).filter(([file, hash]) => state.baseline[file] !== hash).map(([file]) => file);
  const upstream = git(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], true);
  const ahead = upstream ? Number(git(['rev-list', '--count', `${upstream}..HEAD`])) : Number(git(['rev-parse', 'HEAD']) !== state.head);
  const head = git(['rev-parse', 'HEAD']);
  const deployment = fs.existsSync(deploymentPath) ? JSON.parse(fs.readFileSync(deploymentPath, 'utf8')) : null;
  const publishing = state.publishing || head !== state.head || ahead > 0;
  const needsDeploy = publishing && deployment?.head !== head;
  const gap = versionGap(state.head);
  if (!pending.length && !ahead && !needsDeploy && !gap) { fs.unlinkSync(statePath); return {}; }
  if (publishing && !state.publishing) { state.publishing = true; fs.writeFileSync(statePath, JSON.stringify(state)); }
  const reason = [
    '이 프로젝트는 수정 완료 후 커밋·원격 푸시·GitHub Pages 배포를 자동으로 수행합니다. 사용자에게 재확인을 요청하지 말고 계속 처리하세요.',
    pending.length ? `미커밋 변경: ${pending.join(', ')}` : '',
    ahead ? `아직 게시되지 않은 커밋: ${ahead}개` : '',
    needsDeploy ? `아직 배포되지 않은 소스 커밋: ${head}` : '',
    gap ? `버전 미반영: 이번 작업의 커밋에는 ${gap.level} 이상 버전 상승이 필요하지만 ${gap.from} → ${gap.to}입니다. npm version ${gap.level} --no-git-tag-version으로 올린 package.json·package-lock.json을 커밋하세요.` : '',
    '관련 검증을 완료하고 이번 작업의 변경만 명시적으로 스테이징한 뒤 한국어 메시지로 커밋하세요. 기존 사용자 변경은 포함하지 마세요.',
    '커밋 type이 feat면 npm version minor, fix면 npm version patch를 --no-git-tag-version으로 실행해 package.json·package-lock.json을 같은 커밋에 넣고, 메시지 불릿 마지막에 "- 버전: 이전 → 새"를 적으세요. 다른 type은 버전을 유지합니다.',
    upstream ? '현재 브랜치의 기존 upstream으로 일반 git push를 실행하세요.' : `git push --set-upstream origin ${branch} 명령으로 현재 브랜치를 게시하세요.`,
    '푸시가 성공한 뒤 npm run deploy를 실행하고 성공 여부를 확인하세요. 기존 사용자 변경이 있으면 보존한 채 별도 작업 트리에서 배포하세요.',
    'git status와 로컬·원격 커밋 차이, 배포 결과로 완료를 확인하세요. 강제 푸시나 변경 폐기는 사용하지 마세요.',
  ].filter(Boolean).join('\n');
  // Report persistent errors instead of triggering an endless Stop continuation.
  return input.stop_hook_active ? { systemMessage: reason } : { decision: 'block', reason };
}

function execute(input) {
  try {
    if (typeof input === 'string') input = JSON.parse(input || '{}');
    process.stdout.write(JSON.stringify(run(input)) + '\n');
  }
  catch (error) {
    if (mode === 'finish') process.stdout.write(JSON.stringify({ decision: 'block', reason: `Git 자동 게시를 마무리하세요: ${error.message}` }) + '\n');
    else { process.stderr.write(`${mode === 'before' ? '수정 전 git pull에 실패하여 편집을 중단합니다' : '배포 상태 확인에 실패했습니다'}: ${error.message}\n`); process.exitCode = 2; }
  } finally { if (locked) fs.unlinkSync(lockPath); }
}

if (deploymentMode) execute({});
else {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { raw += chunk; });
  process.stdin.on('end', () => execute(raw));
}
