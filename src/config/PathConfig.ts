import { MAP_CENTER_X, MAP_CENTER_Y, GAME_WIDTH, GAME_HEIGHT } from './GameConfig';

// 성벽 구조:
// - 외곽 성벽: 11시, 1시, 5시, 7시에 외문
// - 내곽 성벽: 12시, 3시, 6시, 9시에 내문
//
// 적 이동 경로:
// - 11시 외문 → 9시 내문 → 수호석
// - 1시 외문 → 12시 내문 → 수호석
// - 5시 외문 → 3시 내문 → 수호석
// - 7시 외문 → 6시 내문 → 수호석

// 외곽 성벽 게이트 위치 (11시, 1시, 5시, 7시)
export const OUTER_GATE_POSITIONS = {
  NORTH_WEST: { x: 150, y: 150 },    // 11시
  NORTH_EAST: { x: 1130, y: 150 },   // 1시
  SOUTH_EAST: { x: 1130, y: 570 },   // 5시
  SOUTH_WEST: { x: 150, y: 570 },    // 7시
};

// 내곽 성벽 게이트 위치 (12시, 3시, 6시, 9시)
export const INNER_GATE_POSITIONS = {
  NORTH: { x: MAP_CENTER_X, y: 250 },      // 12시
  EAST: { x: MAP_CENTER_X + 250, y: MAP_CENTER_Y },   // 3시
  SOUTH: { x: MAP_CENTER_X, y: 470 },      // 6시
  WEST: { x: MAP_CENTER_X - 250, y: MAP_CENTER_Y },   // 9시
};

// 적 스폰 위치 (성벽 바깥)
export const SPAWN_POINTS = {
  NORTH_WEST: { x: 30, y: 30 },      // 11시 방향 밖
  NORTH_EAST: { x: 1250, y: 30 },    // 1시 방향 밖
  SOUTH_EAST: { x: 1250, y: 690 },   // 5시 방향 밖
  SOUTH_WEST: { x: 30, y: 690 },     // 7시 방향 밖
};

// 미로형 경로 - 각 방향별
export const ENEMY_PATHS = {
  // 11시 외문 → 9시 내문 → 수호석
  NORTH_WEST: [
    { x: 30, y: 30 },         // Spawn (성벽 밖)
    { x: 80, y: 80 },
    { x: 120, y: 120 },
    { x: 150, y: 150 },       // 외문 (11시) - index 3
    { x: 180, y: 200 },
    { x: 220, y: 250 },
    { x: 260, y: 300 },
    { x: 300, y: 340 },
    { x: 350, y: 360 },
    { x: INNER_GATE_POSITIONS.WEST.x, y: INNER_GATE_POSITIONS.WEST.y }, // 내문 (9시) - index 9
    { x: 440, y: 360 },
    { x: 500, y: 370 },
    { x: 560, y: 365 },
    { x: MAP_CENTER_X, y: MAP_CENTER_Y }, // 수호석
  ],

  // 1시 외문 → 12시 내문 → 수호석
  NORTH_EAST: [
    { x: 1250, y: 30 },       // Spawn (성벽 밖)
    { x: 1200, y: 80 },
    { x: 1160, y: 120 },
    { x: 1130, y: 150 },      // 외문 (1시) - index 3
    { x: 1080, y: 180 },
    { x: 1000, y: 200 },
    { x: 920, y: 220 },
    { x: 840, y: 240 },
    { x: 760, y: 250 },
    { x: INNER_GATE_POSITIONS.NORTH.x, y: INNER_GATE_POSITIONS.NORTH.y }, // 내문 (12시) - index 9
    { x: 640, y: 290 },
    { x: 640, y: 330 },
    { x: 640, y: 360 },
    { x: MAP_CENTER_X, y: MAP_CENTER_Y }, // 수호석
  ],

  // 5시 외문 → 3시 내문 → 수호석
  SOUTH_EAST: [
    { x: 1250, y: 690 },      // Spawn (성벽 밖)
    { x: 1200, y: 640 },
    { x: 1160, y: 600 },
    { x: 1130, y: 570 },      // 외문 (5시) - index 3
    { x: 1080, y: 540 },
    { x: 1000, y: 520 },
    { x: 920, y: 500 },
    { x: 880, y: 460 },
    { x: 860, y: 400 },
    { x: INNER_GATE_POSITIONS.EAST.x, y: INNER_GATE_POSITIONS.EAST.y }, // 내문 (3시) - index 9
    { x: 840, y: 360 },
    { x: 780, y: 360 },
    { x: 720, y: 360 },
    { x: MAP_CENTER_X, y: MAP_CENTER_Y }, // 수호석
  ],

  // 7시 외문 → 6시 내문 → 수호석
  SOUTH_WEST: [
    { x: 30, y: 690 },        // Spawn (성벽 밖)
    { x: 80, y: 640 },
    { x: 120, y: 600 },
    { x: 150, y: 570 },       // 외문 (7시) - index 3
    { x: 200, y: 540 },
    { x: 280, y: 520 },
    { x: 360, y: 500 },
    { x: 440, y: 480 },
    { x: 520, y: 470 },
    { x: INNER_GATE_POSITIONS.SOUTH.x, y: INNER_GATE_POSITIONS.SOUTH.y }, // 내문 (6시) - index 9
    { x: 640, y: 440 },
    { x: 640, y: 400 },
    { x: 640, y: 380 },
    { x: MAP_CENTER_X, y: MAP_CENTER_Y }, // 수호석
  ],
};

// Path width for collision detection
export const PATH_WIDTH = 35;

// Gate indices in paths
export const GATE_INDICES = {
  OUTER_GATE: 3,   // 외문 위치 인덱스
  INNER_GATE: 9,   // 내문 위치 인덱스
};

// 외문 방향과 내문 방향 매핑
export const GATE_MAPPING = {
  NORTH_WEST: 'WEST',   // 11시 → 9시
  NORTH_EAST: 'NORTH',  // 1시 → 12시
  SOUTH_EAST: 'EAST',   // 5시 → 3시
  SOUTH_WEST: 'SOUTH',  // 7시 → 6시
};

// Function to check if a point is on any path
export function isPointOnPath(x: number, y: number, margin: number = PATH_WIDTH): boolean {
  for (const pathKey of Object.keys(ENEMY_PATHS)) {
    const path = ENEMY_PATHS[pathKey as keyof typeof ENEMY_PATHS];

    for (let i = 0; i < path.length - 1; i++) {
      const p1 = path[i];
      const p2 = path[i + 1];

      const dist = distanceToLineSegment(x, y, p1.x, p1.y, p2.x, p2.y);
      if (dist < margin) {
        return true;
      }
    }
  }
  return false;
}

// Calculate distance from a point to a line segment
function distanceToLineSegment(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
  }

  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));

  const nearestX = x1 + t * dx;
  const nearestY = y1 + t * dy;

  return Math.sqrt((px - nearestX) * (px - nearestX) + (py - nearestY) * (py - nearestY));
}
