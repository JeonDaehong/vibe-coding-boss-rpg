import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  MAP_CENTER_X,
  MAP_CENTER_Y,
  GUARDIAN_STONE,
  UNIT_STATS,
  ENEMY_STATS,
  WAVE_CONFIG,
  ECONOMY,
  getRandomGrade,
  generateUnitStats,
  getEnemyForWave,
  EnemyType,
} from '../config/GameConfig';
import {
  ENEMY_PATHS,
  GATE_INDICES,
  PATH_WIDTH,
  isPointOnPath,
  OUTER_GATE_POSITIONS,
  INNER_GATE_POSITIONS,
  GATE_MAPPING,
} from '../config/PathConfig';
import { Unit } from '../entities/Unit';
import { Enemy } from '../entities/Enemy';
import { Gate } from '../entities/Gate';
import { GuardianStone } from '../entities/GuardianStone';
import { Projectile } from '../entities/Projectile';
import { SoundManager, initSoundManager, getSoundManager } from '../utils/SoundManager';

export class GameScene extends Phaser.Scene {
  // Game state
  public gold: number = ECONOMY.startingGold;
  public wave: number = 0;
  public isGameOver: boolean = false;

  // Entities
  public units: Unit[] = [];
  public enemies: Enemy[] = [];
  public outerGates: Map<string, Gate> = new Map();
  public innerGates: Map<string, Gate> = new Map();
  public guardianStone!: GuardianStone;
  public hero!: Unit;

  // Projectiles
  private projectiles: Projectile[] = [];

  // Wave system
  private waveTimer!: Phaser.Time.TimerEvent;
  private spawnTimer: Phaser.Time.TimerEvent | null = null;

  // Graphics
  private mapGraphics!: Phaser.GameObjects.Graphics;
  private pathGraphics!: Phaser.GameObjects.Graphics;

  // Sound
  public soundManager!: SoundManager;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x1a2a1a);

    // Initialize sound manager
    this.soundManager = initSoundManager(this);

    // Resume audio on first interaction
    this.input.once('pointerdown', () => {
      this.soundManager.resumeAudioContext();
    });

    this.drawMap();
    this.drawOuterWalls();
    this.drawInnerWalls();
    this.drawPaths();
    this.createGates();
    this.createGuardianStone();
    this.createInitialUnits();
    this.setupEventListeners();
    this.startWaveSystem();

    // Depth sorting
    this.time.addEvent({
      delay: 100,
      callback: this.sortDepths,
      callbackScope: this,
      loop: true,
    });
  }

  private drawMap(): void {
    this.mapGraphics = this.add.graphics();

    // 배경 (성벽 바깥 - 어두운 숲)
    this.mapGraphics.fillStyle(0x0a150a);
    this.mapGraphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 외성 내부 (잔디)
    this.mapGraphics.fillStyle(0x1a3a1a);
    this.mapGraphics.fillRect(80, 80, GAME_WIDTH - 160, GAME_HEIGHT - 160);

    // 내성 내부 (더 밝은 잔디)
    this.mapGraphics.fillStyle(0x2a4a2a);
    const innerRadius = 200;
    this.mapGraphics.fillCircle(MAP_CENTER_X, MAP_CENTER_Y, innerRadius);

    // 중앙 석판
    this.mapGraphics.fillStyle(0x3a3a4a);
    this.mapGraphics.fillCircle(MAP_CENTER_X, MAP_CENTER_Y, 80);
    this.mapGraphics.lineStyle(3, 0x4a4a5a);
    this.mapGraphics.strokeCircle(MAP_CENTER_X, MAP_CENTER_Y, 80);
  }

  private drawOuterWalls(): void {
    const wallColor = 0x4a4a4a;
    const wallTopColor = 0x5a5a5a;
    const wallThickness = 25;

    // 외곽 성벽 - 사각형 형태로 11시, 1시, 5시, 7시에 문
    // 상단 좌측 (11시 왼쪽)
    this.drawWallSegment(80, 80, OUTER_GATE_POSITIONS.NORTH_WEST.x - 40, 80, wallThickness, 'horizontal');
    // 상단 우측 (11시~1시 사이)
    this.drawWallSegment(OUTER_GATE_POSITIONS.NORTH_WEST.x + 40, 80, OUTER_GATE_POSITIONS.NORTH_EAST.x - 40, 80, wallThickness, 'horizontal');
    // 상단 우측 끝 (1시 오른쪽)
    this.drawWallSegment(OUTER_GATE_POSITIONS.NORTH_EAST.x + 40, 80, GAME_WIDTH - 80, 80, wallThickness, 'horizontal');

    // 하단 좌측 (7시 왼쪽)
    this.drawWallSegment(80, GAME_HEIGHT - 80, OUTER_GATE_POSITIONS.SOUTH_WEST.x - 40, GAME_HEIGHT - 80, wallThickness, 'horizontal');
    // 하단 중앙 (7시~5시 사이)
    this.drawWallSegment(OUTER_GATE_POSITIONS.SOUTH_WEST.x + 40, GAME_HEIGHT - 80, OUTER_GATE_POSITIONS.SOUTH_EAST.x - 40, GAME_HEIGHT - 80, wallThickness, 'horizontal');
    // 하단 우측 끝 (5시 오른쪽)
    this.drawWallSegment(OUTER_GATE_POSITIONS.SOUTH_EAST.x + 40, GAME_HEIGHT - 80, GAME_WIDTH - 80, GAME_HEIGHT - 80, wallThickness, 'horizontal');

    // 좌측 상단 (11시 위)
    this.drawWallSegment(80, 80, 80, OUTER_GATE_POSITIONS.NORTH_WEST.y - 40, wallThickness, 'vertical');
    // 좌측 중앙 (11시~7시 사이)
    this.drawWallSegment(80, OUTER_GATE_POSITIONS.NORTH_WEST.y + 40, 80, OUTER_GATE_POSITIONS.SOUTH_WEST.y - 40, wallThickness, 'vertical');
    // 좌측 하단 (7시 아래)
    this.drawWallSegment(80, OUTER_GATE_POSITIONS.SOUTH_WEST.y + 40, 80, GAME_HEIGHT - 80, wallThickness, 'vertical');

    // 우측 상단 (1시 위)
    this.drawWallSegment(GAME_WIDTH - 80, 80, GAME_WIDTH - 80, OUTER_GATE_POSITIONS.NORTH_EAST.y - 40, wallThickness, 'vertical');
    // 우측 중앙 (1시~5시 사이)
    this.drawWallSegment(GAME_WIDTH - 80, OUTER_GATE_POSITIONS.NORTH_EAST.y + 40, GAME_WIDTH - 80, OUTER_GATE_POSITIONS.SOUTH_EAST.y - 40, wallThickness, 'vertical');
    // 우측 하단 (5시 아래)
    this.drawWallSegment(GAME_WIDTH - 80, OUTER_GATE_POSITIONS.SOUTH_EAST.y + 40, GAME_WIDTH - 80, GAME_HEIGHT - 80, wallThickness, 'vertical');

    // 코너 타워
    this.drawCornerTower(80, 80);
    this.drawCornerTower(GAME_WIDTH - 80, 80);
    this.drawCornerTower(GAME_WIDTH - 80, GAME_HEIGHT - 80);
    this.drawCornerTower(80, GAME_HEIGHT - 80);
  }

  private drawInnerWalls(): void {
    const wallThickness = 20;
    const innerRadius = 200;

    // 내성 벽 - 12시, 3시, 6시, 9시에 문이 있는 원형/다이아몬드 형태
    // 12시 ~ 3시
    this.drawWallArc(MAP_CENTER_X, MAP_CENTER_Y, innerRadius, -Math.PI / 2 + 0.4, 0 - 0.4, wallThickness);
    // 3시 ~ 6시
    this.drawWallArc(MAP_CENTER_X, MAP_CENTER_Y, innerRadius, 0 + 0.4, Math.PI / 2 - 0.4, wallThickness);
    // 6시 ~ 9시
    this.drawWallArc(MAP_CENTER_X, MAP_CENTER_Y, innerRadius, Math.PI / 2 + 0.4, Math.PI - 0.4, wallThickness);
    // 9시 ~ 12시
    this.drawWallArc(MAP_CENTER_X, MAP_CENTER_Y, innerRadius, Math.PI + 0.4, Math.PI * 1.5 - 0.4, wallThickness);
  }

  private drawWallArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number, thickness: number): void {
    this.mapGraphics.lineStyle(thickness, 0x4a4a4a);
    this.mapGraphics.beginPath();
    this.mapGraphics.arc(cx, cy, radius, startAngle, endAngle);
    this.mapGraphics.strokePath();

    // 성벽 위 장식
    this.mapGraphics.lineStyle(thickness - 10, 0x5a5a5a);
    this.mapGraphics.beginPath();
    this.mapGraphics.arc(cx, cy, radius, startAngle, endAngle);
    this.mapGraphics.strokePath();
  }

  private drawWallSegment(x1: number, y1: number, x2: number, y2: number, thickness: number, direction: 'horizontal' | 'vertical'): void {
    const wallColor = 0x4a4a4a;
    const wallTopColor = 0x5a5a5a;
    const wallDarkColor = 0x3a3a3a;

    if (direction === 'horizontal') {
      // Main wall body
      this.mapGraphics.fillStyle(wallColor);
      this.mapGraphics.fillRect(x1, y1 - thickness / 2, x2 - x1, thickness);

      // Wall top
      this.mapGraphics.fillStyle(wallTopColor);
      this.mapGraphics.fillRect(x1, y1 - thickness / 2 - 5, x2 - x1, 8);

      // Battlements
      this.mapGraphics.fillStyle(0x6a6a6a);
      for (let x = x1; x < x2 - 15; x += 30) {
        this.mapGraphics.fillRect(x + 8, y1 - thickness / 2 - 15, 14, 12);
      }

      // Shadow
      this.mapGraphics.fillStyle(wallDarkColor, 0.6);
      this.mapGraphics.fillRect(x1, y1 + thickness / 2, x2 - x1, 5);
    } else {
      // Main wall body
      this.mapGraphics.fillStyle(wallColor);
      this.mapGraphics.fillRect(x1 - thickness / 2, y1, thickness, y2 - y1);

      // Wall side
      this.mapGraphics.fillStyle(wallTopColor);
      this.mapGraphics.fillRect(x1 - thickness / 2 - 5, y1, 8, y2 - y1);

      // Battlements
      this.mapGraphics.fillStyle(0x6a6a6a);
      for (let y = y1; y < y2 - 15; y += 30) {
        this.mapGraphics.fillRect(x1 - thickness / 2 - 15, y + 8, 12, 14);
      }

      // Shadow
      this.mapGraphics.fillStyle(wallDarkColor, 0.6);
      this.mapGraphics.fillRect(x1 + thickness / 2, y1, 5, y2 - y1);
    }
  }

  private drawCornerTower(x: number, y: number): void {
    const towerSize = 40;
    const halfSize = towerSize / 2;

    // Tower base
    this.mapGraphics.fillStyle(0x3a3a3a);
    this.mapGraphics.fillRect(x - halfSize, y - halfSize, towerSize, towerSize);

    // Tower body
    this.mapGraphics.fillStyle(0x4a4a4a);
    this.mapGraphics.fillRect(x - halfSize + 3, y - halfSize - 8, towerSize - 6, towerSize + 3);

    // Tower top
    this.mapGraphics.fillStyle(0x5a5a5a);
    this.mapGraphics.fillRect(x - halfSize - 2, y - halfSize - 12, towerSize + 4, 8);

    // Battlements
    this.mapGraphics.fillStyle(0x6a6a6a);
    this.mapGraphics.fillRect(x - halfSize - 4, y - halfSize - 20, 10, 12);
    this.mapGraphics.fillRect(x + halfSize - 6, y - halfSize - 20, 10, 12);

    // Flag
    this.mapGraphics.fillStyle(0x8B0000);
    this.mapGraphics.fillRect(x - 2, y - halfSize - 35, 4, 20);
    this.mapGraphics.fillTriangle(x + 2, y - halfSize - 35, x + 2, y - halfSize - 22, x + 18, y - halfSize - 28);
  }

  private drawPaths(): void {
    this.pathGraphics = this.add.graphics();

    // Draw each path
    for (const pathKey of Object.keys(ENEMY_PATHS)) {
      const path = ENEMY_PATHS[pathKey as keyof typeof ENEMY_PATHS];
      this.drawSinglePath(path);
    }
  }

  private drawSinglePath(waypoints: { x: number; y: number }[]): void {
    // Path border (darker)
    this.pathGraphics.lineStyle(PATH_WIDTH + 6, 0x2a2015, 0.5);
    this.pathGraphics.beginPath();
    this.pathGraphics.moveTo(waypoints[0].x, waypoints[0].y);
    for (let i = 1; i < waypoints.length; i++) {
      this.pathGraphics.lineTo(waypoints[i].x, waypoints[i].y);
    }
    this.pathGraphics.strokePath();

    // Main path (dirt road)
    this.pathGraphics.lineStyle(PATH_WIDTH, 0x3d3020, 0.7);
    this.pathGraphics.beginPath();
    this.pathGraphics.moveTo(waypoints[0].x, waypoints[0].y);
    for (let i = 1; i < waypoints.length; i++) {
      this.pathGraphics.lineTo(waypoints[i].x, waypoints[i].y);
    }
    this.pathGraphics.strokePath();

    // Center line
    this.pathGraphics.lineStyle(3, 0x4d4030, 0.4);
    this.pathGraphics.beginPath();
    this.pathGraphics.moveTo(waypoints[0].x, waypoints[0].y);
    for (let i = 1; i < waypoints.length; i++) {
      this.pathGraphics.lineTo(waypoints[i].x, waypoints[i].y);
    }
    this.pathGraphics.strokePath();
  }

  private createGates(): void {
    // 외문 (11시, 1시, 5시, 7시)
    for (const [key, pos] of Object.entries(OUTER_GATE_POSITIONS)) {
      const gate = new Gate({
        scene: this,
        x: pos.x,
        y: pos.y,
        isOuter: true,
        direction: key,
        health: 200,
      });
      gate.setDepth(pos.y);
      this.outerGates.set(key, gate);
    }

    // 내문 (12시, 3시, 6시, 9시)
    for (const [key, pos] of Object.entries(INNER_GATE_POSITIONS)) {
      const gate = new Gate({
        scene: this,
        x: pos.x,
        y: pos.y,
        isOuter: false,
        direction: key,
        health: 150,
      });
      gate.setDepth(pos.y);
      this.innerGates.set(key, gate);
    }
  }

  private createGuardianStone(): void {
    this.guardianStone = new GuardianStone({
      scene: this,
      x: GUARDIAN_STONE.x,
      y: GUARDIAN_STONE.y,
      health: GUARDIAN_STONE.health,
    });
    this.guardianStone.setDepth(GUARDIAN_STONE.y + 100);
  }

  private createInitialUnits(): void {
    // 각 외문 근처에 F급 활잡이 배치
    for (const [key, pos] of Object.entries(OUTER_GATE_POSITIONS)) {
      let validX = pos.x + 60;
      let validY = pos.y;

      // 경로 위가 아닌 곳 찾기
      let attempts = 0;
      while (isPointOnPath(validX, validY) && attempts < 30) {
        validX += 20;
        attempts++;
      }

      const archer = new Unit({
        scene: this,
        x: validX,
        y: validY,
        texture: 'archer_f',
        name: UNIT_STATS.F_ARCHER.name,
        grade: UNIT_STATS.F_ARCHER.grade,
        health: UNIT_STATS.F_ARCHER.health,
        damage: UNIT_STATS.F_ARCHER.damage,
        attackSpeed: UNIT_STATS.F_ARCHER.attackSpeed,
        range: UNIT_STATS.F_ARCHER.range,
      });
      archer.setDepth(validY);
      this.units.push(archer);
    }

    // 왕 (수호석 옆, 이동 불가)
    this.hero = new Unit({
      scene: this,
      x: GUARDIAN_STONE.x + 60,
      y: GUARDIAN_STONE.y + 20,
      texture: 'hero',
      name: UNIT_STATS.HERO.name,
      grade: UNIT_STATS.HERO.grade,
      health: UNIT_STATS.HERO.health,
      damage: UNIT_STATS.HERO.damage,
      attackSpeed: UNIT_STATS.HERO.attackSpeed,
      range: UNIT_STATS.HERO.range,
      isMovable: false,
    });
    this.hero.setDepth(GUARDIAN_STONE.y + 50);
    this.units.push(this.hero);
  }

  private setupEventListeners(): void {
    this.events.on('enemyKilled', (enemy: Enemy) => {
      this.gold += enemy.goldReward;
      this.events.emit('goldChanged', this.gold);
      this.soundManager.playEnemyDeath();
      this.soundManager.playGoldCollect();

      const index = this.enemies.indexOf(enemy);
      if (index > -1) {
        this.enemies.splice(index, 1);
      }
    });

    this.events.on('gateDestroyed', (gate: Gate) => {
      console.log(`Gate destroyed: ${gate.direction}`);
      this.soundManager.playGateDestroyed();
    });

    this.events.on('guardianDestroyed', () => {
      this.gameOver();
    });

    this.events.on('purchaseUnit', () => {
      this.spawnRandomUnit();
    });
  }

  private startWaveSystem(): void {
    this.time.delayedCall(WAVE_CONFIG.startDelay, () => {
      this.startNextWave();

      this.waveTimer = this.time.addEvent({
        delay: WAVE_CONFIG.waveInterval,
        callback: this.startNextWave,
        callbackScope: this,
        loop: true,
      });
    });
  }

  private startNextWave(): void {
    if (this.isGameOver) return;

    this.wave++;
    this.events.emit('waveStarted', this.wave);
    this.soundManager.playWaveStart();

    const enemyCount = WAVE_CONFIG.enemiesPerWave + Math.floor(this.wave * 1.5);

    let spawned = 0;
    this.spawnTimer = this.time.addEvent({
      delay: WAVE_CONFIG.enemySpawnInterval,
      callback: () => {
        if (spawned < enemyCount && !this.isGameOver) {
          this.spawnEnemy();
          spawned++;
        }
      },
      repeat: enemyCount - 1,
    });
  }

  private spawnEnemy(): void {
    // 랜덤 경로 선택
    const pathKeys = Object.keys(ENEMY_PATHS) as (keyof typeof ENEMY_PATHS)[];
    const pathKey = Phaser.Math.RND.pick(pathKeys);
    const fullPath = ENEMY_PATHS[pathKey];

    // 게이트 상태 확인
    const outerGate = this.outerGates.get(pathKey);
    const innerGateKey = GATE_MAPPING[pathKey as keyof typeof GATE_MAPPING];
    const innerGate = this.innerGates.get(innerGateKey);

    // 경로 끝 결정
    let endIndex = fullPath.length - 1;

    if (outerGate && !outerGate.isDestroyed) {
      endIndex = GATE_INDICES.OUTER_GATE;
    } else if (innerGate && !innerGate.isDestroyed) {
      endIndex = GATE_INDICES.INNER_GATE;
    }

    const path = fullPath.slice(0, endIndex + 1);

    // 웨이브에 따른 적 타입 결정
    const enemyTypeKey = getEnemyForWave(this.wave);
    const enemyStats = ENEMY_STATS[enemyTypeKey];
    const texture = enemyTypeKey.toLowerCase();

    // 난이도 스케일링
    const difficultyScale = Math.pow(WAVE_CONFIG.difficultyScale, this.wave - 1);
    const healthMultiplier = difficultyScale;
    const damageMultiplier = 1 + (this.wave - 1) * 0.08;

    const spawnPoint = fullPath[0];

    const enemy = new Enemy({
      scene: this,
      x: spawnPoint.x,
      y: spawnPoint.y,
      texture: texture,
      name: enemyStats.name,
      health: Math.floor(enemyStats.health * healthMultiplier),
      damage: Math.floor(enemyStats.damage * damageMultiplier),
      speed: enemyStats.speed,
      goldReward: enemyStats.goldReward + Math.floor(this.wave / 2),
      targetPath: path,
      enemyType: enemyStats.type as EnemyType,
      special: enemyStats.special,
      color: enemyStats.color,
    });

    (enemy as any).pathKey = pathKey;
    (enemy as any).innerGateKey = innerGateKey;

    enemy.setDepth(spawnPoint.y);
    this.enemies.push(enemy);
  }

  private spawnRandomUnit(): void {
    if (this.gold < ECONOMY.randomUnitCost) return;

    this.gold -= ECONOMY.randomUnitCost;
    this.events.emit('goldChanged', this.gold);

    let x: number, y: number;
    let attempts = 0;

    do {
      x = MAP_CENTER_X + Phaser.Math.Between(-150, 150);
      y = MAP_CENTER_Y + Phaser.Math.Between(-100, 100);
      attempts++;
    } while (isPointOnPath(x, y) && attempts < 50);

    // 랜덤 등급 결정
    const grade = getRandomGrade();
    const stats = generateUnitStats(grade);

    // 등급에 따른 텍스처 결정
    const textureMap: { [key: string]: string } = {
      ARCHER: 'archer_f',
      MAGE: 'mage',
      KNIGHT: 'knight',
    };
    const texture = textureMap[stats.type] || 'archer_f';

    const unit = new Unit({
      scene: this,
      x: x,
      y: y,
      texture: texture,
      name: stats.name,
      grade: stats.grade,
      health: stats.health,
      damage: stats.damage,
      attackSpeed: stats.attackSpeed,
      range: stats.range,
    });
    unit.setDepth(y);
    this.units.push(unit);
    this.soundManager.playUnitSummon();

    // 등급별 스폰 이펙트
    const gradeColors: { [key: string]: number } = {
      F: 0x808080,
      E: 0x32CD32,
      D: 0x1E90FF,
      C: 0x9932CC,
      B: 0xFFA500,
      A: 0xFF4500,
      S: 0xFFD700,
      SS: 0xFF69B4,
      SSS: 0x00FFFF,
    };
    const effectColor = gradeColors[grade] || 0xFFFFFF;

    // Spawn effect
    const effect = this.add.graphics();
    effect.setPosition(x, y);
    effect.fillStyle(effectColor, 0.6);
    effect.fillCircle(0, 0, 35);
    effect.lineStyle(3, effectColor, 1);
    effect.strokeCircle(0, 0, 40);
    this.tweens.add({
      targets: effect,
      alpha: 0,
      scale: 2.5,
      duration: 400,
      onComplete: () => effect.destroy(),
    });

    // 높은 등급일 경우 추가 이펙트
    if (['S', 'SS', 'SSS'].includes(grade)) {
      this.cameras.main.flash(200, 255, 215, 0, false);

      // 파티클 이펙트
      for (let i = 0; i < 12; i++) {
        const particle = this.add.graphics();
        particle.setPosition(x, y);
        particle.fillStyle(effectColor, 1);
        particle.fillCircle(0, 0, 5);

        const angle = (i / 12) * Math.PI * 2;
        this.tweens.add({
          targets: particle,
          x: x + Math.cos(angle) * 80,
          y: y + Math.sin(angle) * 80,
          alpha: 0,
          duration: 600,
          ease: 'Power2',
          onComplete: () => particle.destroy(),
        });
      }

      // 등급 텍스트 표시
      const gradeText = this.add.text(x, y - 60, `★ ${grade}급 ★`, {
        fontSize: '24px',
        color: '#' + effectColor.toString(16).padStart(6, '0'),
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5);

      this.tweens.add({
        targets: gradeText,
        y: gradeText.y - 40,
        alpha: 0,
        duration: 1500,
        onComplete: () => gradeText.destroy(),
      });
    }
  }

  private sortDepths(): void {
    for (const unit of this.units) {
      if (unit.active && !unit.isBeingDragged) {
        unit.setDepth(unit.y);
      }
    }
    for (const enemy of this.enemies) {
      if (enemy.active) enemy.setDepth(enemy.y);
    }
  }

  private gameOver(): void {
    this.isGameOver = true;
    this.soundManager.playGameOver();

    if (this.waveTimer) this.waveTimer.destroy();
    if (this.spawnTimer) this.spawnTimer.destroy();

    const overlay = this.add.rectangle(MAP_CENTER_X, MAP_CENTER_Y, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7);
    overlay.setDepth(1000);

    const gameOverText = this.add.text(MAP_CENTER_X, MAP_CENTER_Y - 50, 'GAME OVER', {
      fontSize: '64px',
      color: '#FF0000',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);
    gameOverText.setDepth(1001);

    const waveText = this.add.text(MAP_CENTER_X, MAP_CENTER_Y + 30, `도달 웨이브: ${this.wave}`, {
      fontSize: '32px',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);
    waveText.setDepth(1001);

    const restartBtn = this.add.text(MAP_CENTER_X, MAP_CENTER_Y + 100, '다시 시작', {
      fontSize: '28px',
      color: '#FFD700',
      backgroundColor: '#333333',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    restartBtn.setDepth(1001);

    restartBtn.on('pointerover', () => restartBtn.setStyle({ color: '#FFFFFF' }));
    restartBtn.on('pointerout', () => restartBtn.setStyle({ color: '#FFD700' }));
    restartBtn.on('pointerdown', () => {
      this.scene.restart();
      this.scene.get('UIScene').scene.restart();
    });
  }

  update(time: number, delta: number): void {
    if (this.isGameOver) return;

    // Update units
    for (const unit of this.units) {
      if (!unit.active) continue;

      unit.update(time, this.enemies);

      if (unit.target && unit.attack(time)) {
        const projectile = new Projectile({
          scene: this,
          x: unit.x,
          y: unit.y - 20,
          target: unit.target as Enemy,
          damage: unit.damage,
        });
        this.projectiles.push(projectile);
        this.soundManager.playArrowShoot();
      }
    }

    // Update enemies
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;

      enemy.update(time);

      if (enemy.hasReachedEnd()) {
        this.handleEnemyAttack(enemy, time);
      }
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      if (!projectile.active) {
        this.projectiles.splice(i, 1);
        continue;
      }
      projectile.update(delta);
    }

    // Clean up
    this.units = this.units.filter((u) => u.active);
    this.enemies = this.enemies.filter((e) => e.active);
    this.projectiles = this.projectiles.filter((p) => p.active);
  }

  private handleEnemyAttack(enemy: Enemy, time: number): void {
    enemy.isAttacking = true;

    if (time - enemy.lastAttackTime < enemy.attackSpeed) return;
    enemy.lastAttackTime = time;

    const pathKey = (enemy as any).pathKey as string;
    const innerGateKey = (enemy as any).innerGateKey as string;
    const target = enemy.targetPath[enemy.targetPath.length - 1];

    // 수호석 공격 체크
    if (Math.abs(target.x - MAP_CENTER_X) < 30 && Math.abs(target.y - MAP_CENTER_Y) < 30) {
      this.guardianStone.takeDamage(enemy.damage);
      this.soundManager.playGuardianHit();
      return;
    }

    // 외문 공격 체크
    const outerGate = this.outerGates.get(pathKey);
    if (outerGate && !outerGate.isDestroyed) {
      this.soundManager.playGateHit();
      const destroyed = outerGate.takeDamage(enemy.damage);
      if (destroyed) {
        const fullPath = ENEMY_PATHS[pathKey as keyof typeof ENEMY_PATHS];
        const innerGate = this.innerGates.get(innerGateKey);

        if (innerGate && !innerGate.isDestroyed) {
          enemy.targetPath = fullPath.slice(0, GATE_INDICES.INNER_GATE + 1);
        } else {
          enemy.targetPath = [...fullPath];
        }
        // 성문 다음 지점부터 이동하도록 설정
        enemy.currentPathIndex = GATE_INDICES.OUTER_GATE + 1;
        enemy.isAttacking = false;
      }
      return;
    }

    // 내문 공격 체크
    const innerGate = this.innerGates.get(innerGateKey);
    if (innerGate && !innerGate.isDestroyed) {
      this.soundManager.playGateHit();
      const destroyed = innerGate.takeDamage(enemy.damage);
      if (destroyed) {
        const fullPath = ENEMY_PATHS[pathKey as keyof typeof ENEMY_PATHS];
        enemy.targetPath = [...fullPath];
        // 성문 다음 지점부터 이동하도록 설정
        enemy.currentPathIndex = GATE_INDICES.INNER_GATE + 1;
        enemy.isAttacking = false;
      }
      return;
    }
  }
}
