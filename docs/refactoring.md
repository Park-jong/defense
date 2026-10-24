# 리팩토링 진행과 검증

Phaser 3.80.1, 기존 게임 규칙, 저장 버전 1을 유지하면서 전투와 화면의 책임을 순서대로 분리한다.

- [x] 검증 기준 확보: 실제 소스를 읽는 공통 테스트 로더와 데스크톱·모바일 브라우저 시나리오
- [x] 데이터·설정 분리: `src/data/`, `LayoutConfig`, 장면별 `MapRuntime`
- [ ] 유닛 상태와 배치·강화·판매·탑승·하차·재배치 명령 분리
- [ ] 전투 진행과 화면·사운드 연출 분리
- [ ] 저장 처리, HUD, 입력, 카메라와 장면 종료 처리 분리
- [ ] 실제 전투 코어를 밸런스 시뮬레이터와 공유

## 현재 경계

| 위치 | 책임 |
| --- | --- |
| `src/data/` | 고정 게임 규칙과 유닛·적·맵·스킬 정의. Phaser·DOM·화면 배치를 참조하지 않는다. |
| `src/game/map.ts` | 전장별 경로와 건설 금지 칸을 새로 생성한다. 화면 원점은 인자로 받고 공유 전역 상태를 만들지 않는다. |
| `src/interface/layout.ts` | 데스크톱·모바일 배치와 렌더링 배율. 기존 UI용 배치는 앱 부팅 전에 선택한다. |
| `src/config.ts`, `src/catalog.ts` | 기존 import 경로를 위한 재수출. 값과 정의는 각 담당 모듈에만 둔다. |
| `sim/helpers/load-source.cjs` | 테스트·시뮬레이터가 TypeScript 소스를 모듈별 상대 경로로 읽는다. 로더마다 캐시와 대체 객체를 분리한다. |

`GameScene`은 자신의 `MapRuntime`을 소유하고, `drawMap`에 같은 인스턴스를 전달한다. 적의 진입 경로, 타겟 우선순위, 건설 제한과 화면 표시는 이 인스턴스를 사용한다. 저장 검증도 동일한 팩토리를 사용하되 다른 전장의 상태를 바꾸지 않는다.

`MapRuntime`의 기본 원점은 맵 내부의 `y = 0`이다. 현재 게임은 기존 좌표를 보존하도록 데스크톱 `mapY = 56`, 모바일 `mapY = 0`을 전달한다. `LayoutConfig` 생성이나 배율 변경은 이미 만든 전장의 경로를 바꾸지 않는다.

`sim/balance.mjs`는 현재 독립된 전장과 분리된 데이터를 읽는다. 전투 구현 공유는 후속 단계이며, 현재 시뮬레이터에는 기존 전투 계산이 남아 있다.

## 검증 실행

```sh
npm test
npm run build
node sim/balance.mjs
```

브라우저 검증은 Chrome과 Playwright가 필요하다. Playwright는 저장소 밖에 설치할 수 있다. 예를 들어 별도의 `/tmp/defense-browser-qa` 경로에 설치한다.

```sh
npm install --prefix /tmp/defense-browser-qa --no-save --no-package-lock playwright
```

첫 번째 터미널에서 개발 서버를 실행한다.

```sh
npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

두 번째 터미널에서 검증을 실행한다. 이미 다른 경로에 Playwright가 설치되어 있다면 `PLAYWRIGHT_MODULE`을 그 패키지의 절대 경로로 지정한다.

```sh
PLAYWRIGHT_MODULE=/tmp/defense-browser-qa/node_modules/playwright \
FRONTIER_URL=http://127.0.0.1:5174 \
node sim/browser-smoke.cjs
```

데스크톱·모바일에서 전장 선택, 병력 배치, 특화·강화, 재배치, 보상, 저장 복원, 지휘관, 일시정지, 업적·외형, 벙커 제한을 확인한다. 스크린샷은 Git에서 제외된 `node_modules/.cache/frontier-qa/`에 저장한다. 테스트 접근용 핸들은 개발 응답에만 주입한다.

다음 단계는 게임 상태의 단일 소유자를 정하고 유닛 명령부터 옮기는 것이다. Scene과 새 코어에 같은 상태를 복제하지 않고, 기능별로 이전하면서 기존 동작 테스트를 유지한다. 각 단계는 관련 테스트와 빌드, 화면에 영향이 있을 때의 브라우저 검증을 통과한 뒤 커밋·푸시한다.
