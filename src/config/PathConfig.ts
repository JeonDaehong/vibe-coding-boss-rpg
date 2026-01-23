import { MAP_CENTER_X, MAP_CENTER_Y, GAME_WIDTH, GAME_HEIGHT } from './GameConfig';

// 맵 영역 정의
export const MAP_BOUNDS = {
  OUTER_WALL: 100,  // 외벽 위치
  INNER_RADIUS: 180, // 내성 반지름
};

// 외곽 성벽 게이트 위치
export const OUTER_GATE_POSITIONS = {
  NORTH_WEST: { x: 200, y: 100 },    // 11시
  NORTH_EAST: { x: 1080, y: 100 },   // 1시
  SOUTH_EAST: { x: 1080, y: 620 },   // 5시
  SOUTH_WEST: { x: 200, y: 620 },    // 7시
};

// 내곽 성벽 게이트 위치
export const INNER_GATE_POSITIONS = {
  NORTH: { x: MAP_CENTER_X, y: MAP_CENTER_Y - 160 },      // 12시
  EAST: { x: MAP_CENTER_X + 160, y: MAP_CENTER_Y },       // 3시
  SOUTH: { x: MAP_CENTER_X, y: MAP_CENTER_Y + 160 },      // 6시
  WEST: { x: MAP_CENTER_X - 160, y: MAP_CENTER_Y },       // 9시
};

// 그리드 기반 직각 경로 - 맵 전체를 활용
export const ENEMY_PATHS = {
  // 11시(좌상) → 9시 내문 → 수호석
  NORTH_WEST: [
    { x: 50, y: 50 },
    { x: 150, y: 100 },
    { x: 200, y: 100 },       // 외문 - index 2
    { x: 200, y: 160 },
    { x: 120, y: 160 },
    { x: 120, y: 220 },
    { x: 200, y: 220 },
    { x: 280, y: 220 },
    { x: 280, y: 160 },
    { x: 360, y: 160 },
    { x: 360, y: 220 },
    { x: 360, y: 280 },
    { x: 280, y: 280 },
    { x: 200, y: 280 },
    { x: 200, y: 340 },
    { x: 280, y: 340 },
    { x: 360, y: 340 },
    { x: 420, y: 340 },
    { x: INNER_GATE_POSITIONS.WEST.x, y: INNER_GATE_POSITIONS.WEST.y }, // 내문 - index 19
    { x: 520, y: 360 },
    { x: MAP_CENTER_X, y: MAP_CENTER_Y },
  ],

  // 1시(우상) → 12시 내문 → 수호석
  NORTH_EAST: [
    { x: 1230, y: 50 },
    { x: 1130, y: 100 },
    { x: 1080, y: 100 },      // 외문 - index 2
    { x: 1080, y: 160 },
    { x: 1160, y: 160 },
    { x: 1160, y: 220 },
    { x: 1080, y: 220 },
    { x: 1000, y: 220 },
    { x: 1000, y: 160 },
    { x: 920, y: 160 },
    { x: 920, y: 220 },
    { x: 920, y: 280 },
    { x: 1000, y: 280 },
    { x: 1000, y: 340 },
    { x: 920, y: 340 },
    { x: 840, y: 340 },
    { x: 840, y: 280 },
    { x: 760, y: 280 },
    { x: 680, y: 240 },
    { x: INNER_GATE_POSITIONS.NORTH.x, y: INNER_GATE_POSITIONS.NORTH.y }, // 내문 - index 19
    { x: 640, y: 280 },
    { x: MAP_CENTER_X, y: MAP_CENTER_Y },
  ],

  // 5시(우하) → 3시 내문 → 수호석
  SOUTH_EAST: [
    { x: 1230, y: 670 },
    { x: 1130, y: 620 },
    { x: 1080, y: 620 },      // 외문 - index 2
    { x: 1080, y: 560 },
    { x: 1160, y: 560 },
    { x: 1160, y: 500 },
    { x: 1080, y: 500 },
    { x: 1000, y: 500 },
    { x: 1000, y: 560 },
    { x: 920, y: 560 },
    { x: 920, y: 500 },
    { x: 920, y: 440 },
    { x: 1000, y: 440 },
    { x: 1000, y: 380 },
    { x: 920, y: 380 },
    { x: 840, y: 380 },
    { x: 840, y: 440 },
    { x: 840, y: 360 },
    { x: INNER_GATE_POSITIONS.EAST.x, y: INNER_GATE_POSITIONS.EAST.y }, // 내문 - index 18
    { x: 760, y: 360 },
    { x: MAP_CENTER_X, y: MAP_CENTER_Y },
  ],

  // 7시(좌하) → 6시 내문 → 수호석
  SOUTH_WEST: [
    { x: 50, y: 670 },
    { x: 150, y: 620 },
    { x: 200, y: 620 },       // 외문 - index 2
    { x: 200, y: 560 },
    { x: 120, y: 560 },
    { x: 120, y: 500 },
    { x: 200, y: 500 },
    { x: 280, y: 500 },
    { x: 280, y: 560 },
    { x: 360, y: 560 },
    { x: 360, y: 500 },
    { x: 360, y: 440 },
    { x: 280, y: 440 },
    { x: 200, y: 440 },
    { x: 200, y: 380 },
    { x: 280, y: 380 },
    { x: 360, y: 380 },
    { x: 440, y: 420 },
    { x: 520, y: 460 },
    { x: INNER_GATE_POSITIONS.SOUTH.x, y: INNER_GATE_POSITIONS.SOUTH.y }, // 내문 - index 19
    { x: 640, y: 440 },
    { x: MAP_CENTER_X, y: MAP_CENTER_Y },
  ],
};

// Path width
export const PATH_WIDTH = 26;

// Gate indices
export const GATE_INDICES = {
  OUTER_GATE: 2,
  INNER_GATE: 19,
};

// Gate mapping
export const GATE_MAPPING = {
  NORTH_WEST: 'WEST',
  NORTH_EAST: 'NORTH',
  SOUTH_EAST: 'EAST',
  SOUTH_WEST: 'SOUTH',
};

// 성벽 안인지 확인
export function isInsideWalls(x: number, y: number): boolean {
  return x > MAP_BOUNDS.OUTER_WALL &&
         x < GAME_WIDTH - MAP_BOUNDS.OUTER_WALL &&
         y > MAP_BOUNDS.OUTER_WALL &&
         y < GAME_HEIGHT - MAP_BOUNDS.OUTER_WALL;
}

// 경로 위인지 확인
export function isPointOnPath(x: number, y: number, margin: number = PATH_WIDTH): boolean {
  for (const pathKey of Object.keys(ENEMY_PATHS)) {
    const path = ENEMY_PATHS[pathKey as keyof typeof ENEMY_PATHS];
    for (let i = 0; i < path.length - 1; i++) {
      const p1 = path[i];
      const p2 = path[i + 1];
      const dist = distanceToLineSegment(x, y, p1.x, p1.y, p2.x, p2.y);
      if (dist < margin) return true;
    }
  }
  return false;
}

// 유닛 배치 가능 여부
export function canPlaceUnit(x: number, y: number): boolean {
  return isInsideWalls(x, y) && !isPointOnPath(x, y);
}

function distanceToLineSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  const nearestX = x1 + t * dx;
  const nearestY = y1 + t * dy;
  return Math.sqrt((px - nearestX) ** 2 + (py - nearestY) ** 2);
}
