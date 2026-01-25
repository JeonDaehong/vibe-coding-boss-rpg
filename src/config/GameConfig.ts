import Phaser from 'phaser';

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const PHYSICS = {
  gravity: 1400,
  playerSpeed: 260,
  playerJumpPower: 580,
  doubleJumpPower: 480,
  maxFallSpeed: 900,
};

export const PLAYER_STATS = {
  maxHealth: 150,
  healthRegen: 0.3,
  baseAttack: 25,
  defense: 5,
};

export const LEVEL_CONFIG = {
  baseExp: 80,
  expMultiplier: 1.6,
  statGrowth: {
    health: 20,
    attack: 4,
    defense: 2,
  },
};

// 맵 타입
export enum MapType {
  VILLAGE = 'village',
  FIELD = 'field',
  BOSS = 'boss',
}

// 맵 설정
export const MAP_CONFIG = {
  [MapType.VILLAGE]: {
    name: '네온 시티',
    width: 1600,
    groundY: 580,
    hasMonsters: false,
    hasBoss: false,
    nextMap: MapType.FIELD,
    portalX: 1500,
    ambientColor: 0x1a1a2e,
  },
  [MapType.FIELD]: {
    name: '폐허 거리',
    width: 2400,
    groundY: 580,
    hasMonsters: true,
    hasBoss: false,
    nextMap: MapType.BOSS,
    portalX: 2300,
    ambientColor: 0x16213e,
  },
  [MapType.BOSS]: {
    name: '트롤왕의 영역',
    width: 1600,
    groundY: 580,
    hasMonsters: false,
    hasBoss: true,
    nextMap: null,
    portalX: null,
    ambientColor: 0x0f0f23,
  },
};

// 몬스터 타입
export const MONSTER_TYPES = {
  CYBER_SLIME: {
    name: '사이버 슬라임',
    health: 60,
    attack: 12,
    exp: 25,
    gold: 15,
    color: 0x00ff88,
    size: { width: 35, height: 30 },
    speed: 60,
  },
  DRONE: {
    name: '경비 드론',
    health: 45,
    attack: 18,
    exp: 30,
    gold: 20,
    color: 0xff4466,
    size: { width: 40, height: 25 },
    speed: 100,
  },
  MUTANT: {
    name: '변이체',
    health: 100,
    attack: 22,
    exp: 45,
    gold: 30,
    color: 0x9944ff,
    size: { width: 45, height: 50 },
    speed: 50,
  },
};

// 보스 설정
export const BOSS_CONFIG = {
  TROLL_KING: {
    name: '트롤왕 그룬딕',
    health: 2000,
    attack: 45,
    defense: 15,
    exp: 500,
    gold: 300,
    size: { width: 120, height: 150 },
    color: 0x44aa44,
    phases: [
      { healthPercent: 1.0, attackSpeed: 1.0, moveSpeed: 80 },
      { healthPercent: 0.6, attackSpeed: 1.3, moveSpeed: 100 },
      { healthPercent: 0.3, attackSpeed: 1.6, moveSpeed: 120 },
    ],
  },
};

// 스킬 타입
export const SKILL_TYPES = {
  FIREBALL: {
    name: '파이어볼',
    key: 'CTRL',
    manaCost: 8,
    cooldown: 300,
    damage: 30,
    description: '화염구를 발사합니다',
    color: 0xff6600,
  },
  GHOUL_SUMMON: {
    name: '구울 소환',
    key: 'Q',
    manaCost: 0,
    cooldown: 8000,
    damage: 0,
    duration: 60000,
    maxCount: 3,
    description: '구울을 소환합니다 (1분간 지속)',
    color: 0x664488,
  },
  BONE_SPIKE: {
    name: '뼈가시',
    key: 'W',
    manaCost: 35,
    cooldown: 4000,
    damage: 45,
    description: '관통하는 뼈가시를 발사합니다',
    color: 0xffffcc,
  },
  CORPSE_BOMB: {
    name: '시체 폭탄',
    key: 'E',
    manaCost: 50,
    cooldown: 6000,
    damage: 80,
    radius: 120,
    description: '범위 폭발을 일으킵니다',
    color: 0x88ff44,
  },
  GIANT_GHOUL: {
    name: '거대 구울',
    key: 'R',
    manaCost: 100,
    cooldown: 60000,
    damage: 0,
    duration: 20000,
    description: '강력한 거대 구울을 소환합니다',
    color: 0x663399,
  },
  DARK_SHIELD: {
    name: '암흑 보호막',
    key: 'A',
    manaCost: 30,
    cooldown: 15000,
    duration: 8000,
    damageReduction: 0.5,
    description: '받는 피해를 50% 감소시킵니다',
    color: 0x4444aa,
  },
  CURSE: {
    name: '저주',
    key: 'S',
    manaCost: 25,
    cooldown: 10000,
    duration: 6000,
    debuffAmount: 0.3,
    description: '적의 공격력을 30% 감소시킵니다',
    color: 0x660066,
  },
  SOUL_DRAIN: {
    name: '영혼 흡수',
    key: 'D',
    manaCost: 45,
    cooldown: 12000,
    damage: 60,
    healPercent: 0.5,
    description: '적에게 피해를 주고 체력을 흡수합니다',
    color: 0x00ffcc,
  },
  DEATH_WAVE: {
    name: '죽음의 파동',
    key: 'F',
    manaCost: 60,
    cooldown: 20000,
    damage: 100,
    radius: 200,
    description: '주변 모든 적에게 피해를 줍니다',
    color: 0x220022,
  },
};

// 소환수 설정
export const SUMMON_CONFIG = {
  GHOUL: {
    health: 120,
    attack: 25,
    speed: 140,
    attackRange: 60,
    detectRange: 250,
    color: 0x664488,
    lifetime: 60000, // 1분
  },
  GIANT_GHOUL: {
    health: 500,
    attack: 60,
    speed: 120,
    attackRange: 80,
    detectRange: 300,
    color: 0x553388,
    lifetime: 60000, // 1분
  },
};

// 키 설정
export const KEY_CONFIG = {
  left: 'LEFT',
  right: 'RIGHT',
  jump: 'SPACE',
  attack: 'CTRL',
  skill_q: 'Q',
  skill_w: 'W',
  skill_e: 'E',
  skill_r: 'R',
  skill_a: 'A',
  skill_s: 'S',
  skill_d: 'D',
  skill_f: 'F',
};

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: 0x0a0a15,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    pixelArt: true,
    antialias: false,
  },
};
