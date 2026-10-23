import Phaser from 'phaser';
import { GAME_W, H, useMobileLayout } from './config';
import { GameScene } from './GameScene';
import { setupRotateHint } from './mobile';

// 가로로 긴 터치 화면(휴대폰)은 맵 오른쪽에 패널을 둔 모바일 배치를 쓴다. ?layout=mobile|desktop으로 강제할 수 있다.
const layout = new URLSearchParams(location.search).get('layout');
const phoneLike = window.matchMedia('(pointer: coarse)').matches
  && Math.max(innerWidth, innerHeight) / Math.min(innerWidth, innerHeight) >= 1.6;
if (layout === 'mobile' || (layout !== 'desktop' && phoneLike)) useMobileLayout();

setupRotateHint();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: H,
  backgroundColor: '#101512',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  // requestAnimationFrame은 숨겨진 탭에서 멈추므로 setTimeout 루프를 쓴다.
  fps: { target: 60, forceSetTimeOut: true },
  scene: GameScene,
});

// Phaser는 탭이 숨겨지면(HIDDEN) loop.pause()를 호출한다. 창이 가려지거나 최소화돼도
// 게임이 계속 진행되도록 부팅 전에 핸들러를 비운다 (start()에서 이 인스턴스 메서드가 등록됨).
Object.assign(game, { onHidden() {}, onVisible() {} });
