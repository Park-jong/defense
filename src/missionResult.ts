import { MAX_WAVE } from './data/rules';
import { commandIconUrl } from './commandIcons';
import './missionResult.css';

interface ResultOptions {
  win: boolean; wave: number; bossLeaked: boolean;
  onContinue?: () => void; onRestart: () => void; onReport: () => void;
}

/** HTML controls keep the result screen accessible to keyboard and touch users. */
export function showMissionResult(options: ResultOptions): () => void {
  const root = document.createElement('section');
  root.className = 'mission-result';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-labelledby', 'mission-result-title');
  const panel = document.createElement('div');
  panel.className = 'mission-result-panel';
  const eyebrow = document.createElement('small');
  eyebrow.textContent = options.win ? 'MISSION COMPLETE' : 'SIGNAL LOST';
  const title = document.createElement('h2');
  title.id = 'mission-result-title';
  title.textContent = options.win ? '방어 작전 성공' : '기지 함락';
  const message = document.createElement('p');
  message.textContent = options.win ? `${MAX_WAVE}개 웨이브를 모두 방어했습니다.`
    : `웨이브 ${options.wave} · ${options.bossLeaked ? '적 지휘 개체가 방어선을 돌파했습니다.' : '기지 방어선이 무너졌습니다.'}`;
  const actions = document.createElement('div');
  actions.className = 'mission-result-actions';
  const addAction = (icon: string, label: string, hint: string, action: () => void) => {
    const button = document.createElement('button');
    button.type = 'button'; button.setAttribute('aria-label', label); button.title = hint;
    const image = document.createElement('img');
    image.src = commandIconUrl(icon); image.alt = ''; image.width = image.height = 32;
    const caption = document.createElement('span'); caption.textContent = label;
    button.append(image, caption); button.addEventListener('click', action); actions.append(button);
  };
  if (options.onContinue) addAction('endless', '계속 플레이', '병력과 자원을 유지하고 51웨이브부터 계속 방어합니다.', options.onContinue);
  addAction('resume', '작전 재시작', '같은 설정으로 새 작전을 시작합니다.', options.onRestart);
  addAction('stats', '전투 통계 / 업적', '이번 작전의 전과와 업적을 확인합니다.', options.onReport);
  panel.append(eyebrow, title, message, actions); root.append(panel); document.body.append(root);
  actions.querySelector('button')?.focus({ preventScroll: true });
  return () => root.remove();
}
