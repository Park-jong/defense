export const ENEMY_DEFS = {
  grunt:  { hp: 40,   speed: 60,  reward: 5,   color: 0xe57373, r: 11 },
  runner: { hp: 25,   speed: 110, reward: 5,   color: 0xffb74d, r: 9 },
  tank:   { hp: 160,  speed: 40,  reward: 12,  color: 0x8d6e63, r: 14 },
  boss:   { hp: 1200, speed: 34,  reward: 120, color: 0xab47bc, r: 19 },
  medic:  { hp: 90, speed: 48, reward: 10, color: 0x76d6a5, r: 12 },
  splitter: { hp: 130, speed: 50, reward: 10, color: 0xe3c36b, r: 13 },
  shielder: { hp: 110, speed: 46, reward: 11, color: 0x72a9ed, r: 12 },
};
export type EnemyKey = keyof typeof ENEMY_DEFS;
