import Phaser from 'phaser';
import { H, W } from './config';
import { GameScene } from './GameScene';
import { setupRotateHint } from './mobile';

setupRotateHint();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
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
