// Game Constants
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

// Map Configuration (2.5D isometric-style)
export const MAP_CENTER_X = GAME_WIDTH / 2;
export const MAP_CENTER_Y = GAME_HEIGHT / 2;

// Gate positions (11시, 1시, 5시, 7시 방향)
export const GATE_POSITIONS = {
  NORTH_WEST: { x: 200, y: 150, angle: -135, name: '11시' },   // 11시
  NORTH_EAST: { x: 1080, y: 150, angle: -45, name: '1시' },    // 1시
  SOUTH_EAST: { x: 1080, y: 570, angle: 45, name: '5시' },     // 5시
  SOUTH_WEST: { x: 200, y: 570, angle: 135, name: '7시' },     // 7시
};

// Spawn points (outside the walls)
export const SPAWN_POINTS = {
  NORTH_WEST: { x: 50, y: 50 },
  NORTH_EAST: { x: 1230, y: 50 },
  SOUTH_EAST: { x: 1230, y: 670 },
  SOUTH_WEST: { x: 50, y: 670 },
};

// Inner gate positions (closer to center)
export const INNER_GATE_POSITIONS = {
  NORTH_WEST: { x: 350, y: 280 },
  NORTH_EAST: { x: 930, y: 280 },
  SOUTH_EAST: { x: 930, y: 440 },
  SOUTH_WEST: { x: 350, y: 440 },
};

// Guardian Stone (center)
export const GUARDIAN_STONE = {
  x: MAP_CENTER_X,
  y: MAP_CENTER_Y,
  health: 1000,
};

// Unit Stats
export const UNIT_STATS = {
  F_ARCHER: {
    name: 'F급 활잡이',
    grade: 'F',
    health: 50,
    damage: 10,
    attackSpeed: 1000, // ms
    range: 150,
    color: 0x8B4513, // brown
  },
  HERO: {
    name: '주인공',
    grade: 'S',
    health: 500,
    damage: 50,
    attackSpeed: 800,
    range: 100,
    color: 0xFFD700, // gold
  },
};

// Enemy Stats
export const ENEMY_STATS = {
  BASIC_GOBLIN: {
    name: '고블린',
    health: 30,
    damage: 5,
    speed: 50,
    goldReward: 5,
    color: 0x2E8B57, // green
  },
  GOBLIN_WARRIOR: {
    name: '고블린 전사',
    health: 60,
    damage: 10,
    speed: 40,
    goldReward: 10,
    color: 0x228B22, // forest green
  },
  ORC: {
    name: '오크',
    health: 120,
    damage: 20,
    speed: 30,
    goldReward: 25,
    color: 0x556B2F, // dark olive
  },
};

// Wave Configuration
export const WAVE_CONFIG = {
  startDelay: 3000,
  waveInterval: 30000,
  enemiesPerWave: 5,
  enemySpawnInterval: 1500,
};

// Economy
export const ECONOMY = {
  startingGold: 100,
  randomUnitCost: 50,
  randomCardCost: 30,
};

// Grades and colors
export const GRADES = {
  F: { color: 0x808080, name: 'F', chance: 0.40 },
  E: { color: 0x32CD32, name: 'E', chance: 0.30 },
  D: { color: 0x1E90FF, name: 'D', chance: 0.15 },
  C: { color: 0x9932CC, name: 'C', chance: 0.10 },
  B: { color: 0xFFA500, name: 'B', chance: 0.04 },
  A: { color: 0xFF4500, name: 'A', chance: 0.009 },
  S: { color: 0xFFD700, name: 'S', chance: 0.001 },
};

// Colors
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
