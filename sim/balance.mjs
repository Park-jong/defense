// 헤드리스 밸런스 시뮬레이션 (Phaser 없이 Node에서 실행)
//
// 실행 방법 (프로젝트 루트에서):
//   node sim/balance.mjs
// 공유 소스 로더로 실제 TypeScript 데이터와 경로를 읽는다 (Phaser/DOM 불필요).
//
// 게임 로직 출처: src/GameScene.ts (startWave / spawn / step / towerAct / hit / stats / upgradeCost / sellValue)
// 고정 dt = 1/60 스텝. 데이터는 src/data, 경로는 독립된 MapRuntime을 사용한다.

import { createSourceLoader } from './helpers/load-source.cjs';

const load = createSourceLoader();
const { T, COLS, ROWS, MAX_UNIT_LEVEL, MAX_WAVE, CLEAR_BONUS_BASE, CLEAR_BONUS_PER_WAVE } = load('./data/rules');
const { TOWER_DEFS } = load('./data/units');
const { ENEMY_DEFS } = load('./data/enemies');
const { createMapRuntime } = load('./game/map');
const { createLayoutConfig } = load('./interface/layout');
const { waypoints: WP, pathCells } = createMapRuntime('frontier', createLayoutConfig('desktop').mapY);

const DT = 1 / 60;

// ---------------------------------------------------------------- 게임 코어 (GameScene 재현)
class Game {
  constructor() {
    this.gold = 150; this.lives = 20; this.wave = 0;
    this.towers = []; this.enemies = []; this.projs = [];
    this.spawnQ = []; this.spawnT = 0; this.waveActive = false;
    this.over = false; this.win = false; this.bossLeaked = false;
    this.leaks = 0; // 현재 웨이브 누수 수
  }

  stats(t) {
    const d = TOWER_DEFS[t.k], l = t.lvl - 1;
    return {
      dmg: d.dmg * Math.pow(1.6, l),
      range: d.range * (1 + .08 * l),
      rate: d.rate * Math.pow(.92, l),
      splash: d.splash ? d.splash * (1 + .1 * l) : 0,
      slow: d.slow ? Math.max(.2, d.slow - .08 * l) : 0,
    };
  }
  upgradeCost(t) { return Math.round(TOWER_DEFS[t.k].cost * .8 * t.lvl); }
  sellValue(t) { return Math.round(t.spent * .7); }

  cellFree(c, r) {
    return c >= 0 && r >= 0 && c < COLS && r < ROWS && !pathCells.has(c + ',' + r)
      && !this.towers.some(t => t.c === c && t.r === r);
  }
  placeTower(k, c, r) {
    const d = TOWER_DEFS[k];
    if (!this.cellFree(c, r) || this.gold < d.cost) return false;
    this.gold -= d.cost;
    this.towers.push({ k, c, r, x: (c + .5) * T, y: (r + .5) * T, lvl: 1, cd: 0, spent: d.cost });
    return true;
  }
  upgrade(t) {
    if (t.lvl >= MAX_UNIT_LEVEL || this.gold < this.upgradeCost(t)) return false;
    const c = this.upgradeCost(t);
    this.gold -= c; t.spent += c; t.lvl++;
    return true;
  }

  startWave() {
    if (this.over || this.waveActive || this.wave >= MAX_WAVE) return false;
    this.wave++;
    const w = this.wave, q = [], n = 6 + Math.floor(w * 1.6);
    for (let i = 0; i < n; i++) {
      let t = 'grunt';
      if (w >= 3 && i % 3 === 1) t = 'runner';
      if (w >= 5 && i % 4 === 3) t = 'tank';
      q.push(t);
    }
    if (w % 10 === 0) q.push('boss');
    this.spawnQ = q; this.spawnT = 0; this.waveActive = true; this.leaks = 0;
    return true;
  }

  spawn(type) {
    const d = ENEMY_DEFS[type], hp = d.hp * Math.pow(1.17, this.wave - 1);
    this.enemies.push({
      type, x: WP[0].x, y: WP[0].y, seg: 1, hp, max: hp, speed: d.speed,
      slow: 1, slowT: 0, reward: d.reward + Math.floor(this.wave / 4), r: d.r, dead: false,
    });
  }

  killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    this.gold += e.reward;
  }

  step(dt) {
    if (this.spawnQ.length) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        this.spawn(this.spawnQ.shift());
        this.spawnT = Math.max(.35, .9 - this.wave * .02);
      }
    }

    for (const e of this.enemies) {
      e.slowT = Math.max(0, e.slowT - dt);
      if (!e.slowT) e.slow = 1;
      let mv = e.speed * e.slow * dt;
      while (mv > 0 && e.seg < WP.length) {
        const tg = WP[e.seg], dx = tg.x - e.x, dy = tg.y - e.y, dist = Math.hypot(dx, dy);
        if (dist <= mv) { e.x = tg.x; e.y = tg.y; e.seg++; mv -= dist; }
        else { e.x += dx / dist * mv; e.y += dy / dist * mv; mv = 0; }
      }
      if (e.seg >= WP.length) {
        e.dead = true;
        this.leaks++;
        if (e.type === 'boss') { this.bossLeaked = true; this.lives = 0; } else this.lives--;
      }
    }

    for (const t of this.towers) this.towerAct(t, dt);

    for (const p of this.projs) {
      const e = p.tgt;
      if (e.dead) { p.dead = true; continue; }
      const dx = e.x - p.x, dy = e.y - p.y, dist = Math.hypot(dx, dy), mv = 420 * dt;
      if (dist <= mv + e.r) { this.hit(p); p.dead = true; }
      else { p.x += dx / dist * mv; p.y += dy / dist * mv; }
    }
    this.projs = this.projs.filter(p => !p.dead);
    this.enemies = this.enemies.filter(e => !e.dead);

    if (this.waveActive && !this.spawnQ.length && !this.enemies.length && this.lives > 0) {
      this.waveActive = false;
      if (this.wave >= MAX_WAVE) { this.over = true; this.win = true; }
      else this.gold += CLEAR_BONUS_BASE + this.wave * CLEAR_BONUS_PER_WAVE;
    }
    if (this.lives <= 0 && !this.over) { this.over = true; this.win = false; }
  }

  towerAct(t, dt) {
    const st = this.stats(t);
    t.cd -= dt;
    let best = null, bp = -Infinity;
    for (const e of this.enemies) {
      if (e.dead || Math.hypot(e.x - t.x, e.y - t.y) > st.range) continue;
      const nx = WP[Math.min(e.seg, WP.length - 1)];
      const p = e.seg * 10000 - Math.hypot(nx.x - e.x, nx.y - e.y);
      if (p > bp) { bp = p; best = e; }
    }
    if (!best) return;
    if (t.cd > 0) return;
    t.cd = st.rate;
    this.projs.push({ x: t.x, y: t.y, tgt: best, k: t.k, st, dead: false });
  }

  hit(p) {
    const e = p.tgt, st = p.st;
    if (st.splash) {
      for (const o of this.enemies) {
        if (o.dead || Math.hypot(o.x - e.x, o.y - e.y) > st.splash) continue;
        o.hp -= st.dmg;
        if (o.hp <= 0) this.killEnemy(o);
      }
    } else {
      e.hp -= st.dmg;
      if (e.hp <= 0) this.killEnemy(e);
    }
    if (st.slow && !e.dead) {
      e.slow = Math.min(e.slow, st.slow); e.slowT = 2;
    }
  }

  invested() { return this.towers.reduce((s, t) => s + t.spent, 0); }
}

// ---------------------------------------------------------------- 경로 기하
// 경로를 1px 간격으로 샘플링 (적은 WP[0]에서 시작해 마지막 WP까지 이동)
const PATH_PTS = [];
for (let i = 0; i < WP.length - 1; i++) {
  const a = WP[i], b = WP[i + 1], len = Math.hypot(b.x - a.x, b.y - a.y);
  for (let s = 0; s < len; s++) PATH_PTS.push({ x: a.x + (b.x - a.x) * s / len, y: a.y + (b.y - a.y) * s / len });
}
const PATH_LEN = PATH_PTS.length; // px (1px 샘플)

/** 중심(x,y), 반경 range 안에 들어오는 경로 길이(px) */
function coverage(x, y, range) {
  let n = 0;
  for (const p of PATH_PTS) if (Math.hypot(p.x - x, p.y - y) <= range) n++;
  return n;
}

/** 경로 셀과 (8방향) 인접한 빈 셀 중 해당 타워 사거리가 경로를 가장 많이 덮는 칸 */
function bestCell(game, k) {
  const range = TOWER_DEFS[k].range;
  let best = null, bs = 0;
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
    if (!game.cellFree(c, r)) continue;
    let adj = false;
    for (let dc = -1; dc <= 1 && !adj; dc++) for (let dr = -1; dr <= 1; dr++) {
      if (pathCells.has((c + dc) + ',' + (r + dr))) { adj = true; break; }
    }
    if (!adj) continue;
    const s = coverage((c + .5) * T, (r + .5) * T, range);
    if (s > bs) { bs = s; best = { c, r }; }
  }
  return best;
}

// ---------------------------------------------------------------- 전략
// pick(game) -> 이번에 지을 타워 종류
const STRATEGIES = {
  'a) 화살탑 위주': {
    pick: () => 'arrow',
  },
  'b) 대포+냉기 혼합': {
    // 대포 2 : 냉기 1 비율
    pick: g => (g.towers.length % 3 === 1 ? 'frost' : 'cannon'),
  },
  'c) 저격탑 위주(후반)': {
    // 웨이브 8 이전엔 화살탑으로 버티고, 이후 저격탑
    pick: g => (g.wave < 8 ? 'arrow' : 'sniper'),
  },
};

/** 모든 골드를 소비: 원하는 타워를 지을 수 있으면 건설, 아니면 가장 낮은 레벨(싼 순)부터 업그레이드 */
function spendAll(game, strat) {
  for (;;) {
    const k = strat.pick(game);
    if (game.gold >= TOWER_DEFS[k].cost) {
      const cell = bestCell(game, k);
      if (cell && game.placeTower(k, cell.c, cell.r)) continue;
    }
    const ups = game.towers
      .filter(t => t.lvl < MAX_UNIT_LEVEL && game.gold >= game.upgradeCost(t))
      .sort((a, b) => a.lvl - b.lvl || game.upgradeCost(a) - game.upgradeCost(b));
    if (ups.length && game.upgrade(ups[0])) continue;
    break;
  }
}

// ---------------------------------------------------------------- 보스 분석
function bossInfo(wave) {
  const d = ENEMY_DEFS.boss;
  return { hp: d.hp * Math.pow(1.17, wave - 1), time: PATH_LEN / d.speed };
}
/** 현재 타워 구성의 이론 DPS: 합계, 그리고 보스 통과 중 사거리 내 체류 시간을 반영한 총 피해량 */
function towerPotential(game, bossSpeed) {
  let dps = 0, dmgOverPath = 0;
  for (const t of game.towers) {
    const st = game.stats(t), d = st.dmg / st.rate;
    dps += d;
    dmgOverPath += d * coverage(t.x, t.y, st.range) / bossSpeed; // 사거리 내 체류시간(s) * DPS
  }
  return { dps, dmgOverPath };
}

// ---------------------------------------------------------------- 시뮬레이션 실행
function runStrategy(name, strat) {
  const g = new Game();
  const rows = [];
  const bossSnap = {};
  let result = null;

  while (!g.over) {
    spendAll(g, strat);
    if (!g.startWave()) break;
    const w = g.wave;
    const pre = { gold: g.gold, towers: g.towers.length, invested: g.invested() };
    if (w % 10 === 0) bossSnap[w] = towerPotential(g, ENEMY_DEFS.boss.speed);
    let steps = 0;
    while (!g.over && g.waveActive && steps++ < 60 * 3600) g.step(DT);
    rows.push({ wave: w, ...pre, leaks: g.leaks, lives: g.lives });
  }

  if (g.win) result = '승리';
  else if (g.bossLeaked) result = `패배: 웨이브 ${g.wave} 보스 누수`;
  else result = `패배: 웨이브 ${g.wave} 생명 소진`;
  return { name, rows, bossSnap, result, finalTowers: g.towers };
}

const pad = (v, n) => String(v).padStart(n);

for (const [name, strat] of Object.entries(STRATEGIES)) {
  const r = runStrategy(name, strat);
  console.log(`\n=== 전략 ${name} ===`);
  console.log('웨이브 | 보유골드(건설후) | 타워수 | 총투자액 | 누수 | 남은생명');
  for (const x of r.rows) {
    console.log(`${pad(x.wave, 6)} | ${pad(x.gold, 16)} | ${pad(x.towers, 6)} | ${pad(x.invested, 8)} | ${pad(x.leaks, 4)} | ${pad(x.lives, 8)}`);
  }
  const cnt = {};
  for (const t of r.finalTowers) { const key = `${t.k}Lv${t.lvl}`; cnt[key] = (cnt[key] || 0) + 1; }
  console.log('최종 타워 구성:', JSON.stringify(cnt));
  console.log('최종 결과:', r.result);

  console.log(`보스 분석 (경로 길이 ${PATH_LEN}px, 보스 속도 ${ENEMY_DEFS.boss.speed}px/s, 슬로우 미적용)`);
  console.log('웨이브 | 보스 체력 | 통과 시간(s) | 필요 DPS | 타워 합계 DPS | 체류 반영 총피해 | 총피해/체력');
  for (let w = 10; w <= MAX_WAVE; w += 10) {
    const b = bossInfo(w), s = r.bossSnap[w];
    const need = (b.hp / b.time).toFixed(1);
    if (s) {
      console.log(`${pad(w, 6)} | ${pad(b.hp.toFixed(0), 9)} | ${pad(b.time.toFixed(1), 12)} | ${pad(need, 8)} | ${pad(s.dps.toFixed(1), 13)} | ${pad(s.dmgOverPath.toFixed(0), 16)} | ${pad((s.dmgOverPath / b.hp).toFixed(2), 10)}`);
    } else {
      console.log(`${pad(w, 6)} | ${pad(b.hp.toFixed(0), 9)} | ${pad(b.time.toFixed(1), 12)} | ${pad(need, 8)} | (해당 웨이브 미도달)`);
    }
  }
}
