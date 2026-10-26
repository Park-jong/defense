import Phaser from 'phaser';
import { GAME_W, H, RENDER_SCALE, setRenderScale, useMobileLayout } from './config';
import { GameScene } from './GameScene';
import { setupRotateHint } from './mobile';
import './cursors.css';
import { applyThemeDocument } from './themes';
import './themes.css';
import { registerBishoujoPortraits } from './bishoujoPortraitAssets';
import { registerMoeAtlas } from './moePortraits';
import moeAtlasUrl from './assets/bishoujo-roster-homage.png';
import './moePresentation.css';
import './commandConsole.css';
import './themeUnlock.css';

applyThemeDocument();
registerBishoujoPortraits(import.meta.glob<string>('./assets/bishoujo/*.webp', { eager: true, query: '?url', import: 'default' }));
registerMoeAtlas(moeAtlasUrl);

// 가로로 긴 터치 화면(휴대폰)은 맵 오른쪽에 패널을 둔 모바일 배치를 쓴다. ?layout=mobile|desktop으로 강제할 수 있다.
const layout = new URLSearchParams(location.search).get('layout');
const phoneLike = window.matchMedia('(pointer: coarse)').matches
  && Math.max(innerWidth, innerHeight) / Math.min(innerWidth, innerHeight) >= 1.6;
if (layout === 'mobile' || (layout !== 'desktop' && phoneLike)) useMobileLayout();

// 화면에 실제로 보일 크기 × 픽셀 밀도만큼 캔버스를 크게 그린다 (0.5 단위, 1~2.5배). 일반 모니터는 1배.
const fit = Math.min(innerWidth / GAME_W, innerHeight / H);
setRenderScale(Math.min(2.5, Math.max(1, Math.round(fit * devicePixelRatio * 2) / 2)));

// Phaser 텍스트는 해상도를 지정하지 않으면 1배로 그려 카메라 줌에서 번진다. 모든 텍스트에 기본 해상도를 준다.
const factory = Phaser.GameObjects.GameObjectFactory.prototype as unknown as {
  text: (x: number, y: number, text: string | string[], style?: Phaser.Types.GameObjects.Text.TextStyle) => Phaser.GameObjects.Text;
};
const addText = factory.text;
factory.text = function (this: unknown, x, y, text, style = {}) {
  return addText.call(this, x, y, text, { resolution: RENDER_SCALE, ...style });
};

setupRotateHint();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W * RENDER_SCALE,
  height: H * RENDER_SCALE,
  backgroundColor: '#101512',
  // 전체화면은 문서 전체를 대상으로 한다. Phaser 기본값은 캔버스만 감싼 div를 띄워 body에 붙은 HTML 상황판이 가려진다.
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, fullscreenTarget: document.documentElement },
  // requestAnimationFrame은 숨겨진 탭에서 멈추므로 setTimeout 루프를 쓴다.
  fps: { target: 60, forceSetTimeOut: true },
  scene: GameScene,
});

// Phaser는 탭이 숨겨지면(HIDDEN) loop.pause()를 호출한다. 창이 가려지거나 최소화돼도
// 게임이 계속 진행되도록 부팅 전에 핸들러를 비운다 (start()에서 이 인스턴스 메서드가 등록됨).
Object.assign(game, { onHidden() {}, onVisible() {} });
