import type { TowerKey } from './data/units';

export type MoeLine = 'deploy' | 'wave' | 'streak' | 'clear' | 'skill' | 'idle' | 'danger';
interface Character {
  name: string; color: string; mark: string;
  deploy: string; wave: string; streak: string; clear: string; skill: string; idle: string; danger: string;
}

/** Atlas order is explicit so adding a gameplay unit cannot silently move a portrait. */
export const MOE_ROSTER: TowerKey[] = [
  'arrow', 'cannon', 'frost', 'sniper', 'marine', 'firebat', 'templar', 'cruiser', 'bunker',
  'support', 'observer', 'ghost', 'goliath', 'zealot', 'highTemplar', 'reaver', 'scout', 'carrier',
];
export const MOE_CHARACTERS: Record<TowerKey, Character> = {
  arrow: { name: '히토리', color: '#f27fae', mark: '♫', deploy: '히, 히토리… 음 맞췄어요.', wave: '첫 소절만… 같이 들어 주세요.', streak: '지금, 박자 맞았죠…?', clear: '끝까지… 연주했어요.', skill: '이번 솔로는, 놓치지 않을게요!', idle: '사람 많은 곳은… 아직 연습 중이에요.', danger: '손이 떨려도… 연주는 계속!' },
  cannon: { name: '메구밍', color: '#ef765e', mark: '✹', deploy: '포격 무대, 준비됐나요?', wave: '오늘의 하늘도 붉게 물들이겠어요!', streak: '이것이 완벽한 탄착이에요!', clear: '근사한 폭발이었어요. 잠깐만 쉴게요.', skill: '모든 마력을, 이 한 발에!', idle: '다음 포격의 이름을 생각하고 있어요.', danger: '물러서세요! 크게 터집니다!' },
  frost: { name: '에밀리아', color: '#bda5ef', mark: '❄', deploy: '차가운 바람은 제가 막을게요.', wave: '다들 제 뒤에서 천천히 와요.', streak: '눈꽃이 하나 더 피었네요.', clear: '이제 따뜻한 곳에서 쉬어요.', skill: '얼음의 정령들, 힘을 빌려줘!', idle: '지휘관님, 손이 차갑지는 않으세요?', danger: '조금만 더, 얼음벽이 버텨 줄 거예요!' },
  sniper: { name: '시논', color: '#76d4d7', mark: '◎', deploy: '사선 확보. 여기면 충분해.', wave: '바람 확인. 조준 들어간다.', streak: '흔들림 없이, 다음 표적.', clear: '남은 탄약까지 확인했어.', skill: '멀리 있어도 놓치지 않아.', idle: '숨을 고르면, 시야도 맑아져.', danger: '접근하는 표적은 내가 맡을게.' },
  marine: { name: '아스카', color: '#ef795d', mark: '★', deploy: '내가 선두야. 잘 보고 따라와!', wave: '이번 방어선, 내가 책임질게!', streak: '이 정도는 준비 운동이지!', clear: '봤지? 깔끔하게 끝냈잖아!', skill: '화력 집중! 지금 밀어붙여!', idle: '다음 작전도 선두 자리는 내 거야.', danger: '아직 멀었어! 진형 유지해!' },
  firebat: { name: '키타', color: '#ffa168', mark: '♨', deploy: '기타도 화력도, 튜닝 끝!', wave: '오늘 무대도 뜨겁게 가 보자!', streak: '좋아! 리듬이 붙었어!', clear: '마지막 코드까지 완벽했어!', skill: '불꽃처럼 울려라, 내 기타!', idle: '다음 합주, 지휘관도 들으러 와!', danger: '박자 놓치지 마! 같이 버티자!' },
  templar: { name: '세이버', color: '#96bdf3', mark: '◇', deploy: '검을 걸고, 이 자리를 지키겠습니다.', wave: '방어선을 향해, 검을 드십시오.', streak: '빛은 아직 꺾이지 않았습니다.', clear: '모두의 용기가 만든 승리입니다.', skill: '이 검에 모인 빛이여, 길을 열어라!', idle: '잠시 쉬시지요. 경계는 제가 맡겠습니다.', danger: '제 검이 닿는 한, 물러서지 않습니다.' },
  cruiser: { name: '마키마', color: '#ee718b', mark: '♜', deploy: '함대 배치, 내가 정리해 둘게.', wave: '전 포문, 지정한 좌표로.', streak: '응, 예정대로야.', clear: '수고했어. 보고는 짧게 해도 돼.', skill: '지금이야. 주포를 개방해.', idle: '지휘관, 다음 항로도 함께 정할까?', danger: '침착하게. 지시는 내가 내릴게.' },
  bunker: { name: '메이플', color: '#e9819d', mark: '⬟', deploy: '방패 준비 끝! 다들 모여!', wave: '이번에도 내가 앞에 설게!', streak: '어? 방패로도 잘 되네!', clear: '다들 무사해? 그럼 대성공!', skill: '내 뒤는 절대 못 지나가!', idle: '방패 뒤에 앉으면 제법 편해.', danger: '괜찮아! 아직 더 막을 수 있어!' },
  support: { name: '미쿠', color: '#69ded7', mark: '♪', deploy: '지원 채널 연결! 노래 시작할게요.', wave: '모두의 박자를 하나로 맞춰요!', streak: '멋진 하모니가 되고 있어요!', clear: '마지막 음까지, 함께해 줘서 고마워요!', skill: '이 멜로디를, 모두의 힘으로!', idle: '지휘관님은 어떤 노래를 좋아하세요?', danger: '제 목소리 들리죠? 조금만 더 힘내요!' },
  observer: { name: '니지카', color: '#f3cf79', mark: '◉', deploy: '탐지 박자, 내가 맞춰 줄게!', wave: '전방 신호 확인! 하나, 둘, 셋!', streak: '좋아, 서로 호흡이 딱 맞아!', clear: '오늘도 끝까지 잘 맞췄네!', skill: '놓친 신호까지, 전부 울려라!', idle: '다음 합주 시간도 잡아 둘까?', danger: '옆길에 신호! 그쪽도 확인해 줘!' },
  ghost: { name: '2B', color: '#b6c6da', mark: '⌖', deploy: '사격 지원 개시. 포드, 주변을 확인해.', wave: '표적 좌표 수신. 작전 개시.', streak: '다음 좌표로 이동.', clear: '위협 제거. 귀환 경로 확인.', skill: '포드, 사격 경로를 동기화해.', idle: '이상 없음. 경계를 계속한다.', danger: '침투 확인. 여기서 차단한다.' },
  goliath: { name: 'D.Va', color: '#ec93cc', mark: '✥', deploy: '메카 준비 완료! 출격할게!', wave: '이번 판도 정면으로 간다!', streak: '연속 명중! 아직 시작이야!', clear: '좋아! 다음 작전도 준비됐어!', skill: '양쪽 화력, 한 번에 쏟아붓자!', idle: '대기 시간엔 장비 점검부터!', danger: '내 메카 뒤로! 내가 막을게!' },
  zealot: { name: '요르', color: '#ec8b91', mark: '⚔', deploy: '두 자루 모두, 준비됐어요.', wave: '다가오는 위협은 제가 맡겠습니다.', streak: '다치신 분은 안 계시죠?', clear: '이제 안심하셔도 괜찮아요.', skill: '틈은 제가 열어 드릴게요!', idle: '차라도 한 잔 준비해 드릴까요?', danger: '제 뒤로 오세요. 서둘러요!' },
  highTemplar: { name: '프리렌', color: '#cbb7f1', mark: '☾', deploy: '여기라면 마력이 잘 모이겠네.', wave: '서두르지 마. 차례대로 정리하면 돼.', streak: '응, 이 정도면 충분해.', clear: '끝났네. 잠깐 쉬어도 되겠지?', skill: '마력을 모아서, 한 점으로.', idle: '저쪽 성에는 어떤 마법서가 있을까.', danger: '뒤로 물러나. 내가 막고 있을게.' },
  reaver: { name: '료', color: '#8ba8ed', mark: '♬', deploy: '저음 준비됐어.', wave: '첫 박자부터, 무겁게.', streak: '나쁘지 않은 그루브네.', clear: '마지막 진동까지 깔끔해.', skill: '이 저음, 바닥까지 전해 줄게.', idle: '베이스 줄 갈아야 하는데…', danger: '리듬 안 끊기게, 여기서 버티자.' },
  scout: { name: '레이', color: '#a7dafa', mark: '➤', deploy: '정찰 좌표 수신. 출격합니다.', wave: '상공 경계, 이상 없습니다.', streak: '다음 경로를 확인합니다.', clear: '정찰 종료. 귀환하겠습니다.', skill: '비행 경로, 지금 바꿉니다.', idle: '대기 중입니다. 지시해 주세요.', danger: '접근 신호. 상공에서 엄호합니다.' },
  carrier: { name: '루카', color: '#edaacb', mark: '♛', deploy: '편대의 선율을 맞추겠습니다.', wave: '첫 악장, 모든 기체 출격하세요.', streak: '아름다운 합주가 이어지는군요.', clear: '수고했어요. 이제 귀환할 시간입니다.', skill: '날개마다, 이 선율을 실어 주세요.', idle: '지휘관님께 들려 드릴 곡이 있어요.', danger: '귀환 항로는 제가 지키겠습니다.' },
};

/** Pure presentation state: never participates in damage, rewards, RNG or saves. */
export class MoeStreak {
  count = 0;
  private last = -Infinity;
  reset(): void { this.count = 0; this.last = -Infinity; }
  kill(seconds: number): number {
    this.count = seconds - this.last <= 4 ? this.count + 1 : 1;
    this.last = seconds;
    return this.count === 5 || this.count === 10 || this.count >= 20 && this.count % 10 === 0 ? this.count : 0;
  }
  alive(seconds: number): boolean { return this.count > 0 && seconds - this.last <= 4; }
}
