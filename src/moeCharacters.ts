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
  arrow: { name: '리본', color: '#f27fae', mark: '➶', deploy: '리본, 도착! 첫발은 내가 찜!', wave: '자, 별까지 날려 볼까?', streak: '또 명중! 나 좀 잘하는데?', clear: '완벽한 착지! 다음은 어디야?', skill: '한 발로는 아쉽지!', idle: '지휘관, 내 조준 실력 보고 있지?', danger: '잠깐! 저쪽도 봐 줘!' },
  cannon: { name: '바이올렛', color: '#b395f2', mark: '✹', deploy: '안전거리 확보. 귀 막아.', wave: '계산 끝. 포격 개시.', streak: '탄착 오차, 0.', clear: '정리 완료. 포신 식히는 중.', skill: '이건 좀… 크게 터질 거야.', idle: '말 걸지 마. 탄도 계산 중이니까.', danger: '방어선 접근. 포각 수정.' },
  frost: { name: '네베', color: '#89e0f4', mark: '❄', deploy: '조용히… 겨울이 왔어요.', wave: '서두르지 마세요. 곧 얼어붙을 테니.', streak: '눈꽃이 하나 더 피었네요.', clear: '다시 고요해졌어요.', skill: '잠시, 멈춰 주시겠어요?', idle: '지휘관님, 손이 차갑지는 않으세요?', danger: '얼음의 벽, 조금만 더 버텨 줘요.' },
  sniper: { name: '이클립스', color: '#a899ee', mark: '◎', deploy: '보이지 않아도, 곁에 있어.', wave: '표적 확인. 숨을 멈춰.', streak: '움직임이 너무 읽히는걸.', clear: '한 발도 낭비하지 않았어.', skill: '시야 밖도, 내 사거리야.', idle: '쉿. 지금은 바람을 듣는 중.', danger: '놓친 표적은 내가 맡지.' },
  marine: { name: '세라', color: '#75a8f5', mark: '★', deploy: '세라, 배치 완료! 믿고 맡겨!', wave: '전원 준비! 우리 차례야!', streak: '좋아, 이 기세로 밀어붙여!', clear: '수고했어! 다들 무사하지?', skill: '나만 따라와!', idle: '끝나고 다 같이 밥 먹으러 가자!', danger: '아직 안 끝났어! 진형 유지!' },
  firebat: { name: '엠버', color: '#ffa168', mark: '♨', deploy: '따뜻한 인사 한 방, 어때?', wave: '오늘은 좀 화끈하게 간다!', streak: '불붙었네! 나 말고 전황이!', clear: '자, 노릇하게 잘 끝났네!', skill: '화력은 아끼면 손해야!', idle: '마시멜로… 가져올 걸 그랬나?', danger: '뜨거운 건 내가 맡을게!' },
  templar: { name: '아스트라', color: '#b4dafa', mark: '◇', deploy: '별의 뜻을 따라, 이곳에.', wave: '빛은 물러서지 않습니다.', streak: '별들의 궤도가 겹치는군요.', clear: '고요한 빛이 돌아왔습니다.', skill: '푸른 별이여, 응답하라.', idle: '당신에게서 낯익은 별빛이 느껴집니다.', danger: '두려움에 빛을 잃지 마세요.' },
  cruiser: { name: '루주', color: '#ee718b', mark: '♜', deploy: '함장 루주, 전장에 닻을 내리지.', wave: '전 포문 개방. 품위 있게 끝내자.', streak: '이것이 함대의 격이란다.', clear: '승리의 항로는 언제나 이쪽이지.', skill: '주포, 별을 꿰뚫어라!', idle: '지휘관, 내 함교의 차 한 잔 어때?', danger: '내 뒤로. 함대는 물러서지 않아.' },
  bunker: { name: '로제', color: '#dba2b7', mark: '⬟', deploy: '여기는 안전해. 내 뒤에 있어.', wave: '모두 제자리에. 내가 지킬게.', streak: '함께하면, 이렇게 강하구나.', clear: '잘 버텼어. 잠깐 쉬자.', skill: '방어벽, 끝까지 버텨 줘!', idle: '네 자리도 비워 뒀어, 지휘관.', danger: '괜찮아. 아직 내가 있잖아.' },
  support: { name: '민트', color: '#84dcb7', mark: '✚', deploy: '상태 확인할게요. 다친 곳은요?', wave: '지원 장치 정상. 무리하지 마세요!', streak: '생체 신호, 모두 안정적이에요!', clear: '검진 시간이에요. 줄 서 주세요!', skill: '지원 신호, 연결합니다!', idle: '지휘관님도 물 한 잔 드세요.', danger: '긴급 지원! 혼자 버티지 마세요!' },
  observer: { name: '뉘', color: '#bb86ed', mark: '◉', deploy: '들켰나? 내가 먼저 봤는데~', wave: '숨바꼭질은 내가 전문이지!', streak: '약점, 다 보인다고?', clear: '깜짝! 벌써 끝났네?', skill: '비밀은 여기까지야~', idle: '지휘관의 비밀도… 아, 농담이야!', danger: '우회하는 애들 발견! 이쪽!' },
  ghost: { name: '실베', color: '#b6c6da', mark: '⌖', deploy: '실베. 교신은 짧게.', wave: '한 발이면 충분해.', streak: '다음.', clear: '위협 없음. 복귀 대기.', skill: '표적, 침묵시킨다.', idle: '…듣고 있어. 계속 말해.', danger: '침투 확인. 내가 차단한다.' },
  goliath: { name: '테아', color: '#6dd1ca', mark: '✥', deploy: '좋아! 무거운 건 내게 맡겨!', wave: '정면 돌파? 딱 내 취향이지!', streak: '아직 몸도 안 풀렸는데!', clear: '이 정도면 준비 운동이지!', skill: '양쪽 다 맛 좀 봐라!', idle: '이 팔로도 차는 안 쏟는다고!', danger: '한 발짝도 못 지나가!' },
  zealot: { name: '솔', color: '#f5cf78', mark: '⚔', deploy: '맹세할게. 검은 꺾이지 않아.', wave: '빛의 이름으로, 앞으로!', streak: '내 검끝을 따라와!', clear: '이 승리를 그대에게!', skill: '망설임까지 베어 내겠어!', idle: '검술 대련… 함께해 주겠어?', danger: '여기서 물러설 수는 없어!' },
  highTemplar: { name: '루네', color: '#df9bea', mark: '☾', deploy: '꿈에서 본 자리가 여기였네.', wave: '별자리들이 술렁이고 있어.', streak: '어머, 별이 쏟아지네?', clear: '이제 좋은 꿈을 꿀 수 있겠어.', skill: '밤하늘아, 폭풍을 내려 줘.', idle: '잠깐 졸아도… 마법은 안 멈춰.', danger: '이런 결말은 꿈에 없었는데…!' },
  reaver: { name: '코코', color: '#e4af75', mark: '⚒', deploy: '뚝딱뚝딱! 준비 끝!', wave: '신제품 시운전, 시작할게!', streak: '내 작품, 성능 확실하지?', clear: '고장 없음! 대성공이야!', skill: '특제 스캐럽, 배달 갑니다!', idle: '지휘관 장비도 개조해 줄까?', danger: '고장 난 건 아니야! 잠깐만!' },
  scout: { name: '스카이', color: '#74c9fa', mark: '➤', deploy: '스카이, 착륙! 아, 출격인가?', wave: '구름 위까지 올라가 보자!', streak: '너무 빨라서 안 보이지?', clear: '승리의 곡예비행! 유후!', skill: '고도 낮추고, 전속력!', idle: '땅 위는… 좀 답답하네!', danger: '내가 위에서 엄호할게!' },
  carrier: { name: '오렐리아', color: '#ead69b', mark: '♛', deploy: '함대가 왔습니다. 안심하세요.', wave: '모든 기체에, 출격을 허가합니다.', streak: '아름다운 편대 비행이군요.', clear: '돌아오세요. 모두 훌륭했습니다.', skill: '별의 날개들이여, 나아가세요.', idle: '오늘의 별빛은 유난히 따뜻하네요.', danger: '귀환 항로는 제가 지키겠습니다.' },
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
