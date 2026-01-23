// Game Constants
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

// Map Configuration
export const MAP_CENTER_X = GAME_WIDTH / 2;
export const MAP_CENTER_Y = GAME_HEIGHT / 2;

// Guardian Stone
export const GUARDIAN_STONE = {
  x: MAP_CENTER_X,
  y: MAP_CENTER_Y,
  health: 2000,
};

// 등급 시스템 (F ~ SSS)
export const GRADES: { [key: string]: { color: number; name: string; chance: number; multiplier: number } } = {
  F:   { color: 0x808080, name: 'F',   chance: 0.40,   multiplier: 1.0 },
  E:   { color: 0x32CD32, name: 'E',   chance: 0.25,   multiplier: 1.3 },
  D:   { color: 0x1E90FF, name: 'D',   chance: 0.15,   multiplier: 1.7 },
  C:   { color: 0x9932CC, name: 'C',   chance: 0.10,   multiplier: 2.2 },
  B:   { color: 0xFFA500, name: 'B',   chance: 0.05,   multiplier: 3.0 },
  A:   { color: 0xFF4500, name: 'A',   chance: 0.03,   multiplier: 4.0 },
  S:   { color: 0xFFD700, name: 'S',   chance: 0.015,  multiplier: 5.5 },
  SS:  { color: 0xFF69B4, name: 'SS',  chance: 0.004,  multiplier: 8.0 },
  SSS: { color: 0x00FFFF, name: 'SSS', chance: 0.001,  multiplier: 12.0 },
};

// 유닛 기본 스탯 (등급 multiplier 적용됨)
export const BASE_UNIT_STATS = {
  ARCHER: {
    name: '궁수',
    health: 50,
    damage: 15,
    attackSpeed: 1000,
    range: 180,
  },
  MAGE: {
    name: '마법사',
    health: 40,
    damage: 25,
    attackSpeed: 1500,
    range: 200,
  },
  KNIGHT: {
    name: '기사',
    health: 100,
    damage: 20,
    attackSpeed: 1200,
    range: 100,
  },
};

// 영웅 (이동 불가)
export const UNIT_STATS = {
  F_ARCHER: {
    name: 'F급 궁수',
    grade: 'F',
    health: 50,
    damage: 15,
    attackSpeed: 1000,
    range: 180,
  },
  HERO: {
    name: '수호왕',
    grade: 'SSS',
    health: 1000,
    damage: 80,
    attackSpeed: 600,
    range: 250,
  },
};

// 적 타입 정의
export type EnemyType = 'GROUND' | 'FLYING' | 'TUNNELING' | 'TELEPORT' | 'BOSS';

// 적 스탯 (다양한 타입)
export const ENEMY_STATS: { [key: string]: {
  name: string;
  health: number;
  damage: number;
  speed: number;
  goldReward: number;
  color: number;
  type: EnemyType;
  special?: string;
}} = {
  // 일반 지상 유닛
  GOBLIN: {
    name: '고블린',
    health: 40,
    damage: 8,
    speed: 60,
    goldReward: 5,
    color: 0x2E8B57,
    type: 'GROUND',
  },
  GOBLIN_WARRIOR: {
    name: '고블린 전사',
    health: 80,
    damage: 15,
    speed: 50,
    goldReward: 10,
    color: 0x228B22,
    type: 'GROUND',
  },
  ORC: {
    name: '오크',
    health: 150,
    damage: 25,
    speed: 40,
    goldReward: 20,
    color: 0x556B2F,
    type: 'GROUND',
  },
  ORC_BERSERKER: {
    name: '오크 광전사',
    health: 200,
    damage: 40,
    speed: 55,
    goldReward: 35,
    color: 0x8B0000,
    type: 'GROUND',
    special: 'enrage', // 체력 낮으면 속도/공격력 증가
  },
  TROLL: {
    name: '트롤',
    health: 400,
    damage: 50,
    speed: 30,
    goldReward: 50,
    color: 0x4A5D23,
    type: 'GROUND',
    special: 'regenerate', // 체력 재생
  },

  // 공중 유닛 (경로 무시, 직선 이동)
  BAT: {
    name: '박쥐',
    health: 25,
    damage: 5,
    speed: 80,
    goldReward: 8,
    color: 0x4B0082,
    type: 'FLYING',
  },
  HARPY: {
    name: '하피',
    health: 60,
    damage: 12,
    speed: 70,
    goldReward: 15,
    color: 0x9400D3,
    type: 'FLYING',
  },
  DRAGON: {
    name: '드래곤',
    health: 300,
    damage: 60,
    speed: 45,
    goldReward: 100,
    color: 0xFF4500,
    type: 'FLYING',
    special: 'firebreath', // 범위 공격
  },

  // 땅굴 유닛 (중간까지 경로 무시)
  MOLE: {
    name: '두더지',
    health: 50,
    damage: 10,
    speed: 55,
    goldReward: 12,
    color: 0x8B4513,
    type: 'TUNNELING',
  },
  SAND_WORM: {
    name: '모래 지렁이',
    health: 180,
    damage: 35,
    speed: 40,
    goldReward: 40,
    color: 0xD2691E,
    type: 'TUNNELING',
  },

  // 순간이동 유닛 (랜덤하게 순간이동)
  BLINKER: {
    name: '블링커',
    health: 35,
    damage: 8,
    speed: 45,
    goldReward: 15,
    color: 0x00CED1,
    type: 'TELEPORT',
    special: 'blink', // 주기적 순간이동
  },
  SHADOW: {
    name: '그림자',
    health: 70,
    damage: 20,
    speed: 50,
    goldReward: 25,
    color: 0x2F4F4F,
    type: 'TELEPORT',
    special: 'phase', // 공격 회피
  },

  // 보스
  GOBLIN_KING: {
    name: '고블린 왕',
    health: 800,
    damage: 60,
    speed: 35,
    goldReward: 200,
    color: 0xFFD700,
    type: 'BOSS',
    special: 'summon', // 부하 소환
  },
  DEMON_LORD: {
    name: '마왕',
    health: 2000,
    damage: 100,
    speed: 25,
    goldReward: 500,
    color: 0x8B0000,
    type: 'BOSS',
    special: 'aura', // 주변 적 강화
  },
};

// 웨이브 설정 (난이도 상승)
export const WAVE_CONFIG = {
  startDelay: 2000,
  waveInterval: 25000,
  enemiesPerWave: 8,
  enemySpawnInterval: 800,
  difficultyScale: 1.15, // 웨이브당 난이도 증가
  bossWaveInterval: 10, // 10웨이브마다 보스
};

// 경제
export const ECONOMY = {
  startingGold: 150,
  randomUnitCost: 50,
  randomCardCost: 30,
};

// 색상
export const COLORS = {
  WALL: 0x4A4A4A,
  WALL_STROKE: 0x2A2A2A,
  OUTER_WALL: 0x5C5C5C,
  INNER_WALL: 0x3C3C3C,
  GROUND: 0x2D4A3E,
  GROUND_INNER: 0x3D5A4E,
  GATE_HEALTH: 0x00FF00,
  GATE_DAMAGE: 0xFF0000,
  GUARDIAN_GLOW: 0x00FFFF,
  UI_PANEL: 0x1a1a2e,
  UI_BORDER: 0x4a4a6e,
  GOLD: 0xFFD700,
};

// 랜덤 등급 뽑기
export function getRandomGrade(): string {
  const rand = Math.random();
  let cumulative = 0;

  for (const [grade, data] of Object.entries(GRADES)) {
    cumulative += data.chance;
    if (rand < cumulative) {
      return grade;
    }
  }
  return 'F';
}

// 등급에 따른 유닛 스탯 생성
export function generateUnitStats(grade: string) {
  const gradeData = GRADES[grade];
  const baseTypes = ['ARCHER', 'MAGE', 'KNIGHT'];
  const baseType = baseTypes[Math.floor(Math.random() * baseTypes.length)];
  const base = BASE_UNIT_STATS[baseType as keyof typeof BASE_UNIT_STATS];
  const mult = gradeData.multiplier;

  return {
    name: `${grade}급 ${base.name}`,
    grade: grade,
    health: Math.floor(base.health * mult),
    damage: Math.floor(base.damage * mult),
    attackSpeed: Math.max(300, Math.floor(base.attackSpeed / (1 + (mult - 1) * 0.3))),
    range: Math.floor(base.range * (1 + (mult - 1) * 0.2)),
    type: baseType,
  };
}

// 웨이브에 따른 적 선택
export function getEnemyForWave(wave: number): string {
  const isBossWave = wave % WAVE_CONFIG.bossWaveInterval === 0 && wave > 0;

  if (isBossWave) {
    return wave >= 20 ? 'DEMON_LORD' : 'GOBLIN_KING';
  }

  // 웨이브에 따라 다양한 적 등장
  const enemies: { type: string; minWave: number; weight: number }[] = [
    { type: 'GOBLIN', minWave: 1, weight: 40 },
    { type: 'GOBLIN_WARRIOR', minWave: 3, weight: 25 },
    { type: 'BAT', minWave: 4, weight: 20 },
    { type: 'ORC', minWave: 6, weight: 15 },
    { type: 'MOLE', minWave: 7, weight: 15 },
    { type: 'HARPY', minWave: 8, weight: 12 },
    { type: 'BLINKER', minWave: 10, weight: 10 },
    { type: 'ORC_BERSERKER', minWave: 12, weight: 10 },
    { type: 'SAND_WORM', minWave: 14, weight: 8 },
    { type: 'SHADOW', minWave: 15, weight: 8 },
    { type: 'TROLL', minWave: 18, weight: 6 },
    { type: 'DRAGON', minWave: 25, weight: 4 },
  ];

  const available = enemies.filter(e => wave >= e.minWave);
  const totalWeight = available.reduce((sum, e) => sum + e.weight, 0);
  let rand = Math.random() * totalWeight;

  for (const enemy of available) {
    rand -= enemy.weight;
    if (rand <= 0) return enemy.type;
  }

  return 'GOBLIN';
}
