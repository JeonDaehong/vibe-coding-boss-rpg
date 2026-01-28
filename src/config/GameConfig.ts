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
  TOWER_1 = 'tower_1',
  TOWER_2 = 'tower_2',
  TOWER_3 = 'tower_3',
  TOWER_4 = 'tower_4',
  TOWER_5 = 'tower_5',
}

// 맵 설정
export const MAP_CONFIG = {
  [MapType.VILLAGE]: {
    name: '어둠의 마을',
    width: 1600,
    groundY: 580,
    hasMonsters: false,
    hasBoss: false,
    nextMap: MapType.TOWER_1,
    portalX: 1500,
    ambientColor: 0x0a0812,
  },
  [MapType.FIELD]: {
    name: '저주받은 숲',
    width: 2400,
    groundY: 580,
    hasMonsters: true,
    hasBoss: false,
    nextMap: MapType.BOSS,
    portalX: 2300,
    ambientColor: 0x080a06,
  },
  [MapType.BOSS]: {
    name: '암흑군주의 영역',
    width: 1600,
    groundY: 580,
    hasMonsters: false,
    hasBoss: true,
    nextMap: null,
    portalX: null,
    ambientColor: 0x0a0410,
  },
  [MapType.TOWER_1]: {
    name: '마탑 1층 - 시련의 방',
    width: 1400,
    groundY: 580,
    hasMonsters: false,
    hasBoss: false,
    nextMap: MapType.TOWER_2,
    portalX: null,
    ambientColor: 0x0a0515,
  },
  [MapType.TOWER_2]: {
    name: '마탑 2층 - 수정의 방',
    width: 1800,
    groundY: 580,
    hasMonsters: false,
    hasBoss: false,
    nextMap: MapType.TOWER_3,
    portalX: null,
    ambientColor: 0x050a15,
  },
  [MapType.TOWER_3]: {
    name: '마탑 3층 - 쌍둥이의 방',
    width: 1600,
    groundY: 580,
    hasMonsters: false,
    hasBoss: false,
    nextMap: MapType.TOWER_4,
    portalX: null,
    ambientColor: 0x100510,
  },
  [MapType.TOWER_4]: {
    name: '마탑 4층 - 지혜의 방',
    width: 1400,
    groundY: 580,
    hasMonsters: false,
    hasBoss: false,
    nextMap: MapType.TOWER_5,
    portalX: null,
    ambientColor: 0x051010,
  },
  [MapType.TOWER_5]: {
    name: '마탑 5층 - 암흑의 정점',
    width: 1600,
    groundY: 580,
    hasMonsters: false,
    hasBoss: true,
    nextMap: null,
    portalX: null,
    ambientColor: 0x0a0510,
  },
};

// 탑 층별 설정
export const TOWER_CONFIG = {
  [MapType.TOWER_1]: {
    floorType: 'wave',
    duration: 180000,
    waveInterval: 15000,
    enemiesPerWave: 5,
    totalWaves: 12,
  },
  [MapType.TOWER_2]: {
    floorType: 'crystal',
    crystalCount: 3,
    projectileInterval: 3000,
    projectileDamage: 10,
  },
  [MapType.TOWER_3]: {
    floorType: 'miniboss',
    reviveTimer: 20000,
  },
  [MapType.TOWER_4]: {
    floorType: 'puzzle',
    timeLimit: 120000,
    sequenceLength: 5,
  },
  [MapType.TOWER_5]: {
    floorType: 'boss',
  },
};

// 몬스터 타입
export const MONSTER_TYPES = {
  SHADOW_SPRITE: {
    name: '그림자 요정',
    health: 60,
    attack: 12,
    exp: 25,
    gold: 15,
    color: 0x6644aa,
    size: { width: 35, height: 30 },
    speed: 60,
  },
  DARK_WOLF: {
    name: '어둠 늑대',
    health: 45,
    attack: 18,
    exp: 30,
    gold: 20,
    color: 0x442244,
    size: { width: 40, height: 25 },
    speed: 100,
  },
  UNDEAD_KNIGHT: {
    name: '언데드 기사',
    health: 100,
    attack: 22,
    exp: 45,
    gold: 30,
    color: 0x334422,
    size: { width: 45, height: 50 },
    speed: 50,
  },
};

// 보스 설정
export const BOSS_CONFIG = {
  DARK_LORD: {
    name: '암흑군주 모르가스',
    health: 3000,
    attack: 50,
    defense: 12,
    exp: 800,
    gold: 500,
    size: { width: 100, height: 160 },
    color: 0x220033,
    phases: [
      { healthPercent: 1.0, attackSpeed: 1.0, moveSpeed: 40 },
      { healthPercent: 0.7, attackSpeed: 1.3, moveSpeed: 50 },
      { healthPercent: 0.3, attackSpeed: 1.8, moveSpeed: 60 },
    ],
  },
};

// 미니보스 설정 (3층)
export const MINI_BOSS_CONFIG = {
  SHADOW_TWIN_A: {
    name: '그림자 쌍둥이 - 알파',
    health: 800,
    attack: 35,
    defense: 8,
    exp: 200,
    gold: 150,
    color: 0x442266,
    size: { width: 60, height: 80 },
    attackPatterns: ['slash', 'dash', 'projectile'],
  },
  SHADOW_TWIN_B: {
    name: '그림자 쌍둥이 - 베타',
    health: 800,
    attack: 35,
    defense: 8,
    exp: 200,
    gold: 150,
    color: 0x662244,
    size: { width: 60, height: 80 },
    attackPatterns: ['slam', 'spin', 'summon'],
  },
};

// 수정탑 설정 (2층)
export const CRYSTAL_TOWER_CONFIG = {
  health: 200,
  color: 0x44aaff,
  projectileDamage: 20,
  projectileSpeed: 300,
  size: { width: 40, height: 100 },
};

// 스킬 타입
export const SKILL_TYPES = {
  FIREBALL: {
    name: '암흑 화염',
    key: 'CTRL',
    manaCost: 8,
    cooldown: 300,
    damage: 30,
    description: '암흑 화염구를 발사합니다',
    color: 0x660033,
  },
  DARK_SPIKE: {
    name: '다크 스파이크',
    key: 'Q',
    manaCost: 20,
    cooldown: 5000,
    damage: 40,
    spikeCount: 3,
    description: '하늘에서 암흑 가시가 3개 낙하합니다',
    color: 0x440066,
  },
  BONE_SPIKE: {
    name: '뼈가시',
    key: 'W',
    manaCost: 35,
    cooldown: 4000,
    damage: 45,
    description: '관통하는 뼈가시를 발사합니다',
    color: 0x886677,
  },
  CORPSE_BOMB: {
    name: '네크로 폭탄',
    key: 'E',
    manaCost: 50,
    cooldown: 6000,
    damage: 80,
    radius: 120,
    description: '네크로 에너지로 범위 폭발을 일으킵니다',
    color: 0x663388,
  },
  DARK_METEOR: {
    name: '다크 메테오',
    key: 'R',
    manaCost: 100,
    cooldown: 45000,
    damage: 120,
    meteorCount: 8,
    radius: 80,
    description: '맵 전체에 암흑 운석을 떨어뜨립니다',
    color: 0x330044,
  },
  DARK_SHIELD: {
    name: '암흑 보호막',
    key: 'A',
    manaCost: 30,
    cooldown: 15000,
    duration: 8000,
    damageReduction: 0.5,
    description: '받는 피해를 50% 감소시킵니다',
    color: 0x220044,
  },
  CURSE: {
    name: '저주',
    key: 'S',
    manaCost: 25,
    cooldown: 10000,
    duration: 6000,
    debuffAmount: 0.3,
    description: '적의 공격력을 30% 감소시킵니다',
    color: 0x330033,
  },
  SOUL_DRAIN: {
    name: '영혼 흡수',
    key: 'D',
    manaCost: 45,
    cooldown: 12000,
    damage: 60,
    healPercent: 0.5,
    description: '적에게 피해를 주고 체력을 흡수합니다',
    color: 0x005544,
  },
  DEATH_WAVE: {
    name: '죽음의 파동',
    key: 'F',
    manaCost: 60,
    cooldown: 20000,
    damage: 100,
    radius: 200,
    description: '주변 모든 적에게 암흑 피해를 줍니다',
    color: 0x110011,
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
  backgroundColor: 0x050208,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    pixelArt: true,
    antialias: false,
  },
};
