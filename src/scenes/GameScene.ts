import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Monster } from '../entities/Monster';
import { SoundManager } from '../utils/SoundManager';

interface Building {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
  roofColor: number;
  icon: string;
  sceneName: string;
}

interface NPC {
  sprite: Phaser.GameObjects.Container;
  body: Phaser.Physics.Arcade.Body;
  targetX: number;
  targetY: number;
  speed: number;
  waitTime: number;
  name: string;
}

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private monsters!: Phaser.GameObjects.Group;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

  // 시나리오 관련
  private isIntroPlaying: boolean = true;
  private canMove: boolean = false;
  private dialogueContainer!: Phaser.GameObjects.Container;
  private dialogueText!: Phaser.GameObjects.Text;
  private spawnLight!: Phaser.GameObjects.Graphics;
  private nameTagText!: Phaser.GameObjects.Text;
  private characterImage!: Phaser.GameObjects.Image;

  // 대화 시스템
  private dialogues: string[] = [];
  private dialogueIndex: number = 0;
  private isTyping: boolean = false;
  private currentTypeTimer?: Phaser.Time.TimerEvent;
  private ctrlKey!: Phaser.Input.Keyboard.Key;
  private shiftKey!: Phaser.Input.Keyboard.Key;
  private spaceKey!: Phaser.Input.Keyboard.Key;

  // 스킬 키
  private keyQ!: Phaser.Input.Keyboard.Key;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyR!: Phaser.Input.Keyboard.Key;
  private keyT!: Phaser.Input.Keyboard.Key;
  private dialogueComplete: boolean = false;

  // 버튼 관련
  private choiceButtons: Phaser.GameObjects.Container[] = [];
  private selectedButtonIndex: number = 0;

  // 대쉬/점프 관련
  private isDashing: boolean = false;
  private dashCooldown: number = 0;
  private isJumping: boolean = false;
  private jumpCooldown: number = 0;
  private playerShadow!: Phaser.GameObjects.Ellipse;

  // 미니맵 관련
  private minimap!: Phaser.GameObjects.Container;
  private minimapPlayerDot!: Phaser.GameObjects.Graphics;

  // NPC 관련
  private npcs: NPC[] = [];
  private npcGroup!: Phaser.Physics.Arcade.Group;

  // 건물 관련
  private buildings: Building[] = [];
  private buildingBodies: Phaser.Physics.Arcade.Sprite[] = [];
  private buildingEntrances: { zone: Phaser.GameObjects.Zone; building: Building; light: Phaser.GameObjects.Graphics }[] = [];

  // 장애물 관련
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private treePositions: { x: number; y: number; size: number }[] = [];
  private pondPositions: { x: number; y: number; width: number; height: number }[] = [];

  // 맵 크기
  private readonly WORLD_WIDTH = 2400;
  private readonly WORLD_HEIGHT = 1800;

  // 건물에서 복귀 관련
  private returnFromBuilding: string | null = null;
  private buildingEntryCooldown: number = 0; // 건물 재입장 방지 쿨다운

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { returnFromBuilding?: string }): void {
    this.returnFromBuilding = data?.returnFromBuilding || null;
  }

  preload(): void {
    this.load.image('player_portrait', '/assets/images/player1.png');
  }

  create(): void {
    this.cameras.main.fadeIn(1000, 0, 0, 0);

    // 마을 BGM 재생
    const soundManager = SoundManager.getInstance(this);
    soundManager.playBGM('village');

    // 플레이어용 빈 텍스처 생성 (drawImage 에러 방지)
    if (!this.textures.exists('player_empty')) {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      this.textures.addCanvas('player_empty', canvas);
    }

    // 물리 그룹 초기화
    this.obstacles = this.physics.add.staticGroup();
    this.npcGroup = this.physics.add.group();

    this.createGrasslandMap();
    this.createBuildings();
    this.createNPCs();

    // 건물에서 복귀하는 경우
    if (this.returnFromBuilding) {
      this.spawnPlayerAtBuilding(this.returnFromBuilding);
    } else {
      this.playIntroSequence();
    }

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.ctrlKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL);
    this.shiftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // 스킬 키 초기화
    this.keyQ = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.keyW = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyE = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyR = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.keyT = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.T);

    this.monsters = this.add.group();

    this.cameras.main.setBounds(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT);
    this.cameras.main.setZoom(1);
  }

  private createGrasslandMap(): void {
    const worldWidth = this.WORLD_WIDTH;
    const worldHeight = this.WORLD_HEIGHT;

    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // 3D 느낌의 그라데이션 배경
    const bgGraphics = this.add.graphics();
    bgGraphics.setDepth(0);

    // 배경 그라데이션 (위에서 아래로 밝아짐 - 3D 조명 효과)
    for (let y = 0; y < worldHeight; y += 20) {
      const brightness = 0.7 + (y / worldHeight) * 0.3;
      const r = Math.floor(74 * brightness);
      const g = Math.floor(124 * brightness);
      const b = Math.floor(35 * brightness);
      const color = (r << 16) | (g << 8) | b;
      bgGraphics.fillStyle(color, 1);
      bgGraphics.fillRect(0, y, worldWidth, 20);
    }

    // 타일 그리드 (3D 원근감)
    const tileGraphics = this.add.graphics();
    tileGraphics.setDepth(0);

    const tileSize = 64;
    for (let x = 0; x < worldWidth; x += tileSize) {
      for (let y = 0; y < worldHeight; y += tileSize) {
        const shade = Phaser.Math.Between(0, 4);
        const baseColors = [0x4a7c23, 0x5a8c33, 0x3a6c13, 0x4a8c2a, 0x5a9c3a];
        const brightness = 0.8 + (y / worldHeight) * 0.2;

        let color = baseColors[shade];
        const r = Math.floor(((color >> 16) & 0xff) * brightness);
        const g = Math.floor(((color >> 8) & 0xff) * brightness);
        const b = Math.floor((color & 0xff) * brightness);
        color = (r << 16) | (g << 8) | b;

        tileGraphics.fillStyle(color, 1);
        tileGraphics.fillRect(x, y, tileSize, tileSize);

        // 타일 경계 (3D 느낌)
        tileGraphics.lineStyle(1, 0x3a5c13, 0.2);
        tileGraphics.strokeRect(x, y, tileSize, tileSize);
      }
    }

    const centerX = worldWidth / 2;
    const centerY = worldHeight / 2;

    // 마을 광장 (3D 느낌의 돌바닥)
    this.create3DPlaza(centerX, centerY);

    this.createFlowers(worldWidth, worldHeight);
    this.create3DTrees(worldWidth, worldHeight);
    this.create3DPonds(worldWidth, worldHeight);
    this.create3DPaths(centerX, centerY);
  }

  private create3DPlaza(centerX: number, centerY: number): void {
    const graphics = this.add.graphics();
    graphics.setDepth(1);

    // 광장 그림자
    graphics.fillStyle(0x000000, 0.3);
    graphics.fillEllipse(centerX + 5, centerY + 10, 260, 140);

    // 광장 바닥 (3D 깊이감)
    graphics.fillStyle(0x6b5344, 1);
    graphics.fillEllipse(centerX, centerY, 250, 130);

    graphics.fillStyle(0x8b7355, 1);
    graphics.fillEllipse(centerX, centerY - 5, 240, 120);

    graphics.fillStyle(0x9c8465, 1);
    graphics.fillEllipse(centerX, centerY - 8, 220, 110);

    // 돌 패턴
    for (let i = 0; i < 30; i++) {
      const angle = (i / 30) * Math.PI * 2;
      const dist = Phaser.Math.Between(30, 100);
      const px = centerX + Math.cos(angle) * dist;
      const py = centerY + Math.sin(angle) * dist * 0.5;
      graphics.fillStyle(0x7a6355, 0.5);
      graphics.fillEllipse(px, py, 15, 8);
    }

    // 우물 (3D)
    graphics.fillStyle(0x000000, 0.4);
    graphics.fillEllipse(centerX + 3, centerY + 5, 55, 30);

    graphics.fillStyle(0x4a4a4a, 1);
    graphics.fillEllipse(centerX, centerY, 50, 28);

    graphics.fillStyle(0x5a5a5a, 1);
    graphics.fillEllipse(centerX, centerY - 3, 45, 25);

    graphics.fillStyle(0x2a4a6a, 0.9);
    graphics.fillEllipse(centerX, centerY - 5, 35, 20);

    // 우물 테두리
    graphics.lineStyle(3, 0x6a6a6a, 1);
    graphics.strokeEllipse(centerX, centerY - 3, 48, 27);

    // 우물 충돌체
    const wellBody = this.add.rectangle(centerX, centerY, 50, 50, 0x000000, 0) as Phaser.GameObjects.Rectangle;
    this.physics.add.existing(wellBody, true);
    this.obstacles.add(wellBody);
  }

  private createFlowers(worldWidth: number, worldHeight: number): void {
    const graphics = this.add.graphics();
    graphics.setDepth(1);

    const flowerColors = [0xff6b6b, 0xffd93d, 0x6bcb77, 0x4d96ff, 0xff6fff, 0xffffff];

    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(150, worldWidth - 150);
      const y = Phaser.Math.Between(150, worldHeight - 150);

      if (this.isNearCenter(x, y, 200)) continue;
      if (this.isNearBuilding(x, y)) continue;

      const color = flowerColors[Phaser.Math.Between(0, flowerColors.length - 1)];

      // 꽃 그림자
      graphics.fillStyle(0x000000, 0.2);
      graphics.fillCircle(x + 1, y + 2, 5);

      // 꽃잎
      graphics.fillStyle(color, 0.9);
      for (let p = 0; p < 5; p++) {
        const angle = (p / 5) * Math.PI * 2;
        const px = x + Math.cos(angle) * 4;
        const py = y + Math.sin(angle) * 4;
        graphics.fillCircle(px, py, 3);
      }

      // 꽃 중심
      graphics.fillStyle(0xffff00, 1);
      graphics.fillCircle(x, y, 2);
    }
  }

  private create3DTrees(worldWidth: number, worldHeight: number): void {
    this.treePositions = [];

    // 맵 가장자리에 나무
    for (let i = 0; i < 15; i++) {
      this.treePositions.push({ x: Phaser.Math.Between(80, 150), y: Phaser.Math.Between(150, worldHeight - 150), size: Phaser.Math.Between(35, 50) });
      this.treePositions.push({ x: Phaser.Math.Between(worldWidth - 150, worldWidth - 80), y: Phaser.Math.Between(150, worldHeight - 150), size: Phaser.Math.Between(35, 50) });
      this.treePositions.push({ x: Phaser.Math.Between(150, worldWidth - 150), y: Phaser.Math.Between(80, 150), size: Phaser.Math.Between(35, 50) });
      this.treePositions.push({ x: Phaser.Math.Between(150, worldWidth - 150), y: Phaser.Math.Between(worldHeight - 150, worldHeight - 80), size: Phaser.Math.Between(35, 50) });
    }

    // 나무 그리기 및 충돌체 생성
    this.treePositions.forEach(tree => {
      this.draw3DTree(tree.x, tree.y, tree.size);

      // 나무 충돌체 (나무 기둥 부분만)
      const treeBody = this.add.rectangle(tree.x, tree.y + tree.size * 0.3, 20, tree.size * 0.5, 0x000000, 0);
      this.physics.add.existing(treeBody, true);
      this.obstacles.add(treeBody);
    });
  }

  private draw3DTree(x: number, y: number, size: number): void {
    const graphics = this.add.graphics();
    graphics.setDepth(y / 10 + 2); // y축 기반 깊이 정렬

    // 그림자 (3D)
    graphics.fillStyle(0x000000, 0.3);
    graphics.fillEllipse(x + 8, y + size + 15, size * 1.5, size * 0.5);

    // 나무 기둥 (3D)
    graphics.fillStyle(0x4a3020, 1);
    graphics.fillRect(x - 10, y - 5, 20, size + 25);

    graphics.fillStyle(0x5c4033, 1);
    graphics.fillRect(x - 8, y - 5, 8, size + 25);

    // 나뭇잎 (3D 레이어)
    const leafLayers = [
      { offset: 0, scale: 1, color: 0x1a6b1a },
      { offset: -8, scale: 0.9, color: 0x228b22 },
      { offset: -15, scale: 0.75, color: 0x2d9b2d },
      { offset: -22, scale: 0.5, color: 0x32a852 },
    ];

    leafLayers.forEach(layer => {
      graphics.fillStyle(layer.color, 1);
      graphics.fillCircle(x, y + layer.offset, size * layer.scale);
      graphics.fillCircle(x - size * 0.4 * layer.scale, y + 8 + layer.offset, size * 0.7 * layer.scale);
      graphics.fillCircle(x + size * 0.4 * layer.scale, y + 8 + layer.offset, size * 0.7 * layer.scale);
    });

    // 하이라이트
    graphics.fillStyle(0x4aca4a, 0.4);
    graphics.fillCircle(x - size * 0.2, y - size * 0.3, size * 0.3);
  }

  private create3DPonds(worldWidth: number, worldHeight: number): void {
    this.pondPositions = [
      { x: 500, y: 1400, width: Phaser.Math.Between(120, 160), height: Phaser.Math.Between(80, 100) },
      { x: worldWidth - 400, y: 450, width: Phaser.Math.Between(120, 160), height: Phaser.Math.Between(80, 100) },
    ];

    this.pondPositions.forEach(pond => {
      const graphics = this.add.graphics();
      graphics.setDepth(1);

      // 호수 둑 (3D)
      graphics.fillStyle(0x5c4033, 0.8);
      graphics.fillEllipse(pond.x + 3, pond.y + 5, pond.width + 25, pond.height + 15);

      graphics.fillStyle(0x6b5344, 1);
      graphics.fillEllipse(pond.x, pond.y, pond.width + 20, pond.height + 10);

      // 물 (3D 깊이감)
      graphics.fillStyle(0x2a5a8a, 0.9);
      graphics.fillEllipse(pond.x, pond.y, pond.width, pond.height);

      graphics.fillStyle(0x3a6a9a, 0.8);
      graphics.fillEllipse(pond.x, pond.y - 3, pond.width - 10, pond.height - 8);

      // 반사광
      graphics.fillStyle(0x87ceeb, 0.4);
      graphics.fillEllipse(pond.x - pond.width * 0.2, pond.y - pond.height * 0.2, pond.width * 0.4, pond.height * 0.25);

      // 호수 충돌체
      const pondBody = this.add.rectangle(pond.x, pond.y, pond.width, pond.height * 0.7, 0x000000, 0);
      this.physics.add.existing(pondBody, true);
      this.obstacles.add(pondBody);
    });
  }

  private create3DPaths(centerX: number, centerY: number): void {
    const graphics = this.add.graphics();
    graphics.setDepth(1);

    const pathWidth = 50;

    // 길 그리기 함수
    const drawPathSegment = (x: number, y: number, w: number, h: number) => {
      // 그림자
      graphics.fillStyle(0x000000, 0.2);
      graphics.fillRect(x + 2, y + 3, w, h);

      // 메인 길
      graphics.fillStyle(0x7a6345, 1);
      graphics.fillRect(x, y, w, h);

      // 하이라이트
      graphics.fillStyle(0x9a8365, 0.5);
      graphics.fillRect(x, y, w, h * 0.3);
    };

    // 수평 길
    for (let i = 200; i < centerX - 130; i += 20) {
      drawPathSegment(i, centerY - pathWidth / 2, 22, pathWidth);
    }
    for (let i = centerX + 130; i < this.WORLD_WIDTH - 200; i += 20) {
      drawPathSegment(i, centerY - pathWidth / 2, 22, pathWidth);
    }

    // 수직 길
    for (let i = 200; i < centerY - 130; i += 20) {
      drawPathSegment(centerX - pathWidth / 2, i, pathWidth, 22);
    }
    for (let i = centerY + 130; i < this.WORLD_HEIGHT - 200; i += 20) {
      drawPathSegment(centerX - pathWidth / 2, i, pathWidth, 22);
    }
  }

  private isNearCenter(x: number, y: number, radius: number): boolean {
    const centerX = this.WORLD_WIDTH / 2;
    const centerY = this.WORLD_HEIGHT / 2;
    const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
    return dist < radius;
  }

  private isNearBuilding(x: number, y: number): boolean {
    for (const building of this.buildings) {
      if (Math.abs(x - building.x) < building.width && Math.abs(y - building.y) < building.height) {
        return true;
      }
    }
    return false;
  }

  private createBuildings(): void {
    const centerX = this.WORLD_WIDTH / 2;

    this.buildings = [
      { name: '연구소', x: 280, y: 280, width: 150, height: 110, color: 0x5a6a7a, roofColor: 0x3a4a5a, icon: '🔬', sceneName: 'LabScene' },
      { name: '상점', x: this.WORLD_WIDTH - 280, y: 280, width: 130, height: 100, color: 0x9b7924, roofColor: 0x7b5914, icon: '🛒', sceneName: 'ShopScene' },
      { name: '별의 장막', x: centerX, y: 180, width: 140, height: 120, color: 0x5a4a7a, roofColor: 0x3a2a5a, icon: '✨', sceneName: 'StarScene' },
      { name: '교회', x: 380, y: this.WORLD_HEIGHT - 320, width: 120, height: 140, color: 0xeaeaea, roofColor: 0x9a5a3a, icon: '⛪', sceneName: 'ChurchScene' },
      { name: '촌장의 집', x: this.WORLD_WIDTH - 380, y: this.WORLD_HEIGHT - 320, width: 140, height: 110, color: 0xaa8a6a, roofColor: 0x7a5a3a, icon: '🏠', sceneName: 'MayorScene' },
    ];

    this.buildings.forEach(building => {
      this.draw3DBuilding(building);
    });

    // 지저 던전은 동굴 형태로 별도 생성
    this.createDungeonCave(centerX, this.WORLD_HEIGHT - 180);
  }

  private draw3DBuilding(building: Building): void {
    const { x, y, width, height, color, roofColor, name } = building;
    const graphics = this.add.graphics();
    graphics.setDepth(y / 10 + 5);

    // 건물 그림자 (3D)
    graphics.fillStyle(0x000000, 0.4);
    graphics.fillRect(x - width / 2 + 12, y - height / 2 + 15, width, height);

    // 건물 측면 (3D 깊이)
    const darkerColor = this.darkenColor(color, 0.7);
    graphics.fillStyle(darkerColor, 1);
    graphics.fillRect(x - width / 2 + 8, y - height / 2 + 8, width, height);

    // 건물 정면
    graphics.fillStyle(color, 1);
    graphics.fillRect(x - width / 2, y - height / 2, width, height);

    // 건물 하이라이트 (상단)
    const lighterColor = this.lightenColor(color, 1.2);
    graphics.fillStyle(lighterColor, 0.5);
    graphics.fillRect(x - width / 2, y - height / 2, width, height * 0.15);

    // 지붕 (3D)
    graphics.fillStyle(0x000000, 0.3);
    graphics.beginPath();
    graphics.moveTo(x - width / 2 - 8, y - height / 2 + 8);
    graphics.lineTo(x + 5, y - height / 2 - 48);
    graphics.lineTo(x + width / 2 + 18, y - height / 2 + 8);
    graphics.closePath();
    graphics.fillPath();

    graphics.fillStyle(this.darkenColor(roofColor, 0.8), 1);
    graphics.beginPath();
    graphics.moveTo(x - width / 2 - 12, y - height / 2);
    graphics.lineTo(x, y - height / 2 - 50);
    graphics.lineTo(x + width / 2 + 12, y - height / 2);
    graphics.closePath();
    graphics.fillPath();

    graphics.fillStyle(roofColor, 1);
    graphics.beginPath();
    graphics.moveTo(x - width / 2 - 12, y - height / 2);
    graphics.lineTo(x, y - height / 2 - 50);
    graphics.lineTo(x, y - height / 2);
    graphics.closePath();
    graphics.fillPath();

    // 문 (3D)
    const doorHeight = 45;
    const doorWidth = 35;
    graphics.fillStyle(0x3a2515, 1);
    graphics.fillRect(x - doorWidth / 2, y + height / 2 - doorHeight, doorWidth, doorHeight);

    graphics.fillStyle(0x4a3525, 1);
    graphics.fillRect(x - doorWidth / 2 + 3, y + height / 2 - doorHeight + 3, doorWidth - 6, doorHeight - 3);

    // 문 손잡이
    graphics.fillStyle(0xffd700, 1);
    graphics.fillCircle(x + doorWidth / 2 - 10, y + height / 2 - doorHeight / 2, 3);

    // 창문 (3D)
    if (name !== '지저 던전 입구') {
      this.draw3DWindow(graphics, x - width / 2 + 25, y - 10, 30, 35);
      this.draw3DWindow(graphics, x + width / 2 - 55, y - 10, 30, 35);
    }

    // 건물 이름 표시
    const nameTag = this.add.container(x, y - height / 2 - 70);
    nameTag.setDepth(1000);

    const nameBg = this.add.graphics();
    const textWidth = name.length * 14 + 40;
    nameBg.fillStyle(0x0a0a12, 0.9);
    nameBg.fillRoundedRect(-textWidth / 2, -14, textWidth, 28, 14);
    nameBg.lineStyle(2, 0x00d4ff, 0.6);
    nameBg.strokeRoundedRect(-textWidth / 2, -14, textWidth, 28, 14);

    const iconText = this.add.text(-textWidth / 2 + 14, 0, building.icon, { fontSize: '14px' });
    iconText.setOrigin(0, 0.5);

    const nameText = this.add.text(10, 0, name, {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    nameText.setOrigin(0.5, 0.5);

    nameTag.add([nameBg, iconText, nameText]);

    // 건물 충돌체
    const buildingBody = this.physics.add.sprite(x, y, '');
    buildingBody.setVisible(false);
    buildingBody.body!.setSize(width - 30, height - 20);
    buildingBody.setImmovable(true);
    (buildingBody.body as Phaser.Physics.Arcade.Body).pushable = false;
    this.buildingBodies.push(buildingBody);

    // 입구 영역 및 불빛 효과
    const entranceLight = this.add.graphics();
    entranceLight.setDepth(y / 10 + 4);

    // 입구 바닥 타일 빛 효과 (고정)
    const entranceTile = this.add.graphics();
    entranceTile.setDepth(1); // 바닥 레벨

    // 입구 바닥 타일 기본 형태
    entranceTile.fillStyle(0x8a7a5a, 1);
    entranceTile.fillRect(x - 30, y + height / 2, 60, 40);
    entranceTile.lineStyle(2, 0x6a5a3a, 1);
    entranceTile.strokeRect(x - 30, y + height / 2, 60, 40);

    // 입구 타일 빛나는 효과 (애니메이션)
    const entranceGlow = this.add.graphics();
    entranceGlow.setDepth(2);

    // 입구 불빛 애니메이션
    this.tweens.add({
      targets: { intensity: 0 },
      intensity: 1,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        const intensity = tween.getValue() as number;
        entranceLight.clear();
        entranceGlow.clear();

        // 입구 바닥 타일 글로우 효과
        entranceGlow.fillStyle(0xffee88, 0.2 + intensity * 0.25);
        entranceGlow.fillRect(x - 28, y + height / 2 + 2, 56, 36);

        // 빛 테두리
        entranceGlow.lineStyle(3, 0xffdd66, 0.4 + intensity * 0.4);
        entranceGlow.strokeRect(x - 30, y + height / 2, 60, 40);

        // 빛 파티클 효과
        for (let i = 0; i < 3; i++) {
          const px = x - 20 + i * 20;
          const py = y + height / 2 + 20 - intensity * 10;
          entranceGlow.fillStyle(0xffffaa, 0.3 + intensity * 0.3);
          entranceGlow.fillCircle(px, py, 3 + intensity * 2);
        }

        // 문에서 나오는 따뜻한 빛
        entranceLight.fillStyle(0xffaa44, 0.15 + intensity * 0.12);
        entranceLight.fillEllipse(x, y + height / 2 + 25, 70, 35);

        entranceLight.fillStyle(0xffcc66, 0.1 + intensity * 0.1);
        entranceLight.fillEllipse(x, y + height / 2 + 15, 50, 25);

        entranceLight.fillStyle(0xffdd88, 0.25 + intensity * 0.2);
        entranceLight.fillRect(x - doorWidth / 2, y + height / 2 - doorHeight, doorWidth, doorHeight);
      },
    });

    // 입구 존
    const entranceZone = this.add.zone(x, y + height / 2 + 20, 60, 40);
    this.buildingEntrances.push({ zone: entranceZone, building, light: entranceLight });
  }

  private createDungeonCave(x: number, y: number): void {
    const graphics = this.add.graphics();
    graphics.setDepth(y / 10 + 5);

    const caveWidth = 120;
    const caveHeight = 80;

    // 경고 구역 - 어두운 바닥 (던전 주변)
    const warningZone = this.add.graphics();
    warningZone.setDepth(1);
    warningZone.fillStyle(0x1a0a0a, 0.4);
    warningZone.fillEllipse(x, y, 350, 200);
    warningZone.fillStyle(0x2a0a0a, 0.3);
    warningZone.fillEllipse(x, y, 280, 160);

    // 경고 표지판들
    const warningPositions = [
      { wx: x - 130, wy: y - 40 },
      { wx: x + 130, wy: y - 40 },
    ];
    warningPositions.forEach(pos => {
      // 표지판 기둥
      graphics.fillStyle(0x4a3a2a, 1);
      graphics.fillRect(pos.wx - 3, pos.wy, 6, 40);

      // 표지판 (삼각형)
      graphics.fillStyle(0xaa2222, 1);
      graphics.beginPath();
      graphics.moveTo(pos.wx, pos.wy - 30);
      graphics.lineTo(pos.wx - 20, pos.wy);
      graphics.lineTo(pos.wx + 20, pos.wy);
      graphics.closePath();
      graphics.fillPath();

      // 테두리
      graphics.lineStyle(2, 0xffaa00, 0.8);
      graphics.beginPath();
      graphics.moveTo(pos.wx, pos.wy - 28);
      graphics.lineTo(pos.wx - 18, pos.wy - 2);
      graphics.lineTo(pos.wx + 18, pos.wy - 2);
      graphics.closePath();
      graphics.strokePath();
    });

    // 해골 장식
    const skullDeco = this.add.graphics();
    skullDeco.setDepth(y / 10 + 3);
    const skullPositions = [
      { sx: x - 100, sy: y + 20 },
      { sx: x + 100, sy: y + 20 },
    ];
    skullPositions.forEach(pos => {
      skullDeco.fillStyle(0x888888, 0.8);
      skullDeco.fillCircle(pos.sx, pos.sy, 10);
      skullDeco.fillStyle(0x222222, 1);
      skullDeco.fillCircle(pos.sx - 3, pos.sy - 2, 3);
      skullDeco.fillCircle(pos.sx + 3, pos.sy - 2, 3);
      skullDeco.fillStyle(0x666666, 1);
      skullDeco.fillRect(pos.sx - 5, pos.sy + 4, 10, 4);
    });

    // 동굴 주변 바위들
    graphics.fillStyle(0x3a3a3a, 1);
    graphics.fillCircle(x - 70, y - 20, 35);
    graphics.fillCircle(x + 70, y - 20, 35);
    graphics.fillCircle(x - 50, y - 40, 28);
    graphics.fillCircle(x + 50, y - 40, 28);
    graphics.fillCircle(x - 30, y - 55, 25);
    graphics.fillCircle(x + 30, y - 55, 25);
    graphics.fillCircle(x, y - 60, 30);

    // 동굴 입구 어두운 부분 (구멍)
    graphics.fillStyle(0x0a0a0a, 1);
    graphics.fillEllipse(x, y, caveWidth, caveHeight);

    // 동굴 내부 깊이감
    graphics.fillStyle(0x151515, 1);
    graphics.fillEllipse(x, y - 5, caveWidth - 15, caveHeight - 10);

    graphics.fillStyle(0x1a1a1a, 1);
    graphics.fillEllipse(x, y - 10, caveWidth - 30, caveHeight - 20);

    // 동굴 입구 테두리 (바위)
    graphics.lineStyle(8, 0x4a4a4a, 1);
    graphics.strokeEllipse(x, y, caveWidth + 5, caveHeight + 5);

    graphics.lineStyle(4, 0x5a5a5a, 1);
    graphics.strokeEllipse(x, y, caveWidth, caveHeight);

    // 동굴 위쪽 바위 디테일
    graphics.fillStyle(0x4a4a4a, 1);
    graphics.fillEllipse(x - 40, y - 35, 20, 15);
    graphics.fillEllipse(x + 40, y - 35, 20, 15);
    graphics.fillEllipse(x, y - 45, 25, 18);

    // 종유석 효과
    graphics.fillStyle(0x3a3a3a, 1);
    graphics.beginPath();
    graphics.moveTo(x - 30, y - 35);
    graphics.lineTo(x - 25, y - 15);
    graphics.lineTo(x - 35, y - 15);
    graphics.closePath();
    graphics.fillPath();

    graphics.beginPath();
    graphics.moveTo(x + 20, y - 38);
    graphics.lineTo(x + 25, y - 18);
    graphics.lineTo(x + 15, y - 18);
    graphics.closePath();
    graphics.fillPath();

    graphics.beginPath();
    graphics.moveTo(x - 5, y - 42);
    graphics.lineTo(x, y - 20);
    graphics.lineTo(x - 10, y - 20);
    graphics.closePath();
    graphics.fillPath();

    // 이름 표시
    const nameTag = this.add.container(x, y - 100);
    nameTag.setDepth(1000);

    const nameBg = this.add.graphics();
    const textWidth = 160;
    nameBg.fillStyle(0x0a0a12, 0.95);
    nameBg.fillRoundedRect(-textWidth / 2, -14, textWidth, 28, 14);
    nameBg.lineStyle(2, 0xff4422, 0.8);
    nameBg.strokeRoundedRect(-textWidth / 2, -14, textWidth, 28, 14);

    const iconText = this.add.text(-textWidth / 2 + 14, 0, '⚠️', { fontSize: '14px' });
    iconText.setOrigin(0, 0.5);

    const nameText = this.add.text(10, 0, '지저 던전 입구', {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '13px',
      color: '#ff6644',
      fontStyle: 'bold',
    });
    nameText.setOrigin(0.5, 0.5);

    nameTag.add([nameBg, iconText, nameText]);

    // 이름표 펄스 효과
    this.tweens.add({
      targets: nameTag,
      scaleX: { from: 1, to: 1.05 },
      scaleY: { from: 1, to: 1.05 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 번개 효과 그래픽
    const lightningGraphics = this.add.graphics();
    lightningGraphics.setDepth(1000);

    // 번개 효과 - 랜덤하게 발생
    this.time.addEvent({
      delay: 3000,
      loop: true,
      callback: () => {
        // 랜덤 확률로 번개 발생
        if (Phaser.Math.Between(1, 100) > 40) return;

        const side = Phaser.Math.Between(0, 1);
        const lx = side === 0 ? x - Phaser.Math.Between(80, 140) : x + Phaser.Math.Between(80, 140);
        const ly = y - Phaser.Math.Between(60, 100);

        // 번개 그리기
        lightningGraphics.clear();
        lightningGraphics.lineStyle(3, 0xffff88, 1);

        let currentX = lx;
        let currentY = ly - 80;

        lightningGraphics.beginPath();
        lightningGraphics.moveTo(currentX, currentY);

        for (let i = 0; i < 5; i++) {
          currentX += Phaser.Math.Between(-15, 15);
          currentY += 25;
          lightningGraphics.lineTo(currentX, currentY);
        }
        lightningGraphics.strokePath();

        // 번개 글로우
        lightningGraphics.lineStyle(8, 0xffffaa, 0.3);
        currentX = lx;
        currentY = ly - 80;
        lightningGraphics.beginPath();
        lightningGraphics.moveTo(currentX, currentY);
        for (let i = 0; i < 5; i++) {
          currentX += Phaser.Math.Between(-15, 15);
          currentY += 25;
          lightningGraphics.lineTo(currentX, currentY);
        }
        lightningGraphics.strokePath();

        // 화면 플래시 효과
        const flash = this.add.graphics();
        flash.setDepth(999);
        flash.fillStyle(0xffffff, 0.15);
        flash.fillRect(x - 200, y - 150, 400, 300);

        // 번개 사라짐
        this.time.delayedCall(100, () => {
          lightningGraphics.clear();
          flash.destroy();
        });
      },
    });

    // 동굴 입구 빛 효과 (붉은 빛)
    const entranceLight = this.add.graphics();
    entranceLight.setDepth(y / 10 + 4);

    const entranceGlow = this.add.graphics();
    entranceGlow.setDepth(2);

    // 입구 빛 애니메이션
    this.tweens.add({
      targets: { intensity: 0 },
      intensity: 1,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        const intensity = tween.getValue() as number;
        entranceLight.clear();
        entranceGlow.clear();

        // 동굴 내부에서 나오는 붉은 빛
        entranceGlow.fillStyle(0xff4422, 0.15 + intensity * 0.2);
        entranceGlow.fillEllipse(x, y, caveWidth - 20, caveHeight - 15);

        entranceGlow.fillStyle(0xff6644, 0.2 + intensity * 0.15);
        entranceGlow.fillEllipse(x, y + 5, caveWidth - 40, caveHeight - 25);

        // 입구 바닥 빛
        entranceLight.fillStyle(0xff4422, 0.15 + intensity * 0.15);
        entranceLight.fillEllipse(x, y + caveHeight / 2 + 10, 100, 35);
      },
    });

    // 연기/안개 파티클 효과
    this.time.addEvent({
      delay: 800,
      loop: true,
      callback: () => {
        const smokeX = x + Phaser.Math.Between(-40, 40);
        const smoke = this.add.graphics();
        smoke.setDepth(y / 10 + 6);
        smoke.fillStyle(0x220000, 0.4);
        smoke.fillCircle(smokeX, y - 20, Phaser.Math.Between(8, 15));

        this.tweens.add({
          targets: smoke,
          y: -80,
          alpha: 0,
          duration: 2000,
          onComplete: () => smoke.destroy(),
        });
      },
    });

    // 던전 건물 데이터 (buildings 배열에 추가)
    const dungeonBuilding: Building = {
      name: '지저 던전 입구',
      x: x,
      y: y,
      width: caveWidth,
      height: caveHeight,
      color: 0x4a4a4a,
      roofColor: 0x2a2a2a,
      icon: '⚔',
      sceneName: 'DungeonScene'
    };
    this.buildings.push(dungeonBuilding);

    // 입구 존 (동굴 안쪽으로 들어가면 입장)
    const entranceZone = this.add.zone(x, y, 60, 40);
    this.buildingEntrances.push({ zone: entranceZone, building: dungeonBuilding, light: entranceLight });
  }

  private draw3DWindow(graphics: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
    // 창틀 (어두운)
    graphics.fillStyle(0x4a3a2a, 1);
    graphics.fillRect(x - 2, y - 2, w + 4, h + 4);

    // 유리
    graphics.fillStyle(0x87ceeb, 0.9);
    graphics.fillRect(x, y, w, h);

    // 창틀 가운데
    graphics.fillStyle(0x5a4a3a, 1);
    graphics.fillRect(x + w / 2 - 2, y, 4, h);
    graphics.fillRect(x, y + h / 2 - 2, w, 4);

    // 반사광
    graphics.fillStyle(0xffffff, 0.3);
    graphics.fillRect(x + 3, y + 3, w / 2 - 5, h / 2 - 5);
  }

  private darkenColor(color: number, factor: number): number {
    const r = Math.floor(((color >> 16) & 0xff) * factor);
    const g = Math.floor(((color >> 8) & 0xff) * factor);
    const b = Math.floor((color & 0xff) * factor);
    return (r << 16) | (g << 8) | b;
  }

  private lightenColor(color: number, factor: number): number {
    const r = Math.min(255, Math.floor(((color >> 16) & 0xff) * factor));
    const g = Math.min(255, Math.floor(((color >> 8) & 0xff) * factor));
    const b = Math.min(255, Math.floor((color & 0xff) * factor));
    return (r << 16) | (g << 8) | b;
  }

  private createNPCs(): void {
    const npcData = [
      { name: '마을 주민', color: 0xe74c3c, hairColor: 0x4a3020 },
      { name: '농부', color: 0x8b6914, hairColor: 0x5a4030 },
      { name: '상인', color: 0x2ecc71, hairColor: 0x2a2a2a },
      { name: '여행자', color: 0x3498db, hairColor: 0x6a4a30 },
      { name: '기사', color: 0x7f8c8d, hairColor: 0x3a3a3a },
      { name: '마법사', color: 0x9b59b6, hairColor: 0x8a8a8a },
      { name: '어부', color: 0x1abc9c, hairColor: 0x5a3a20 },
      { name: '광부', color: 0x34495e, hairColor: 0x2a2a2a },
      { name: '사냥꾼', color: 0x27ae60, hairColor: 0x4a3020 },
      { name: '학자', color: 0xf39c12, hairColor: 0x6a5a4a },
    ];

    for (let i = 0; i < 10; i++) {
      let x, y;
      let attempts = 0;

      do {
        x = Phaser.Math.Between(350, this.WORLD_WIDTH - 350);
        y = Phaser.Math.Between(450, this.WORLD_HEIGHT - 450);
        attempts++;
      } while ((this.isNearCenter(x, y, 180) || this.isNearBuilding(x, y)) && attempts < 20);

      if (attempts < 20) {
        const npc = this.create3DNPC(x, y, npcData[i].name, npcData[i].color, npcData[i].hairColor);
        this.npcs.push(npc);
      }
    }
  }

  private create3DNPC(x: number, y: number, name: string, color: number, hairColor: number): NPC {
    const container = this.add.container(x, y);
    container.setDepth(y / 10 + 3);

    const graphics = this.add.graphics();

    // 그림자
    graphics.fillStyle(0x000000, 0.3);
    graphics.fillEllipse(0, 22, 35, 12);

    // 몸통 (3D)
    graphics.fillStyle(this.darkenColor(color, 0.8), 1);
    graphics.fillRoundedRect(-14, -2, 28, 32, 6);

    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(-12, -4, 24, 30, 5);

    // 목
    graphics.fillStyle(0xffd5b4, 1);
    graphics.fillRect(-5, -12, 10, 10);

    // 머리 (3D)
    graphics.fillStyle(0xeac5a4, 1);
    graphics.fillCircle(0, -22, 14);

    graphics.fillStyle(0xffd5b4, 1);
    graphics.fillCircle(0, -23, 13);

    // 머리카락
    graphics.fillStyle(hairColor, 1);
    graphics.fillEllipse(0, -32, 18, 10);
    graphics.fillRect(-10, -35, 20, 10);

    // 눈
    graphics.fillStyle(0xffffff, 1);
    graphics.fillEllipse(-5, -24, 5, 4);
    graphics.fillEllipse(5, -24, 5, 4);

    graphics.fillStyle(0x2a2a2a, 1);
    graphics.fillCircle(-5, -24, 2);
    graphics.fillCircle(5, -24, 2);

    container.add(graphics);

    // NPC 충돌체 생성
    const npcBody = this.physics.add.sprite(x, y, '');
    npcBody.setVisible(false);
    npcBody.body!.setSize(30, 40);
    npcBody.setImmovable(true);
    (npcBody.body as Phaser.Physics.Arcade.Body).pushable = false;
    this.npcGroup.add(npcBody);

    return {
      sprite: container,
      body: npcBody.body as Phaser.Physics.Arcade.Body,
      targetX: x,
      targetY: y,
      speed: Phaser.Math.Between(25, 45),
      waitTime: Phaser.Math.Between(1000, 3000),
      name: name,
    };
  }

  private updateNPCs(delta: number): void {
    this.npcs.forEach(npc => {
      if (npc.waitTime > 0) {
        npc.waitTime -= delta;
        return;
      }

      const dx = npc.targetX - npc.sprite.x;
      const dy = npc.targetY - npc.sprite.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 10) {
        let newX, newY;
        let attempts = 0;

        do {
          newX = Phaser.Math.Between(350, this.WORLD_WIDTH - 350);
          newY = Phaser.Math.Between(450, this.WORLD_HEIGHT - 450);
          attempts++;
        } while ((this.isNearCenter(newX, newY, 180) || this.isNearBuilding(newX, newY)) && attempts < 10);

        npc.targetX = newX;
        npc.targetY = newY;
        npc.waitTime = Phaser.Math.Between(2000, 5000);
        return;
      }

      const moveX = (dx / distance) * npc.speed * (delta / 1000);
      const moveY = (dy / distance) * npc.speed * (delta / 1000);

      npc.sprite.x += moveX;
      npc.sprite.y += moveY;
      npc.sprite.setDepth(npc.sprite.y / 10 + 3);

      // 충돌체 위치 업데이트
      npc.body.position.x = npc.sprite.x - 15;
      npc.body.position.y = npc.sprite.y - 20;
    });
  }

  private checkBuildingEntrance(): void {
    if (!this.player || this.isIntroPlaying) return;

    // 쿨다운 중이면 입장 불가
    if (this.buildingEntryCooldown > 0) return;

    for (const entrance of this.buildingEntrances) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        entrance.zone.x, entrance.zone.y
      );

      if (distance < 35) {
        this.enterBuilding(entrance.building);
        return;
      }
    }
  }

  private enterBuilding(building: Building): void {
    this.canMove = false;

    // 화면 페이드 아웃 후 씬 전환
    this.cameras.main.fadeOut(500, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(building.sceneName, {
        fromScene: 'GameScene',
        buildingName: building.name,
        buildingKey: building.sceneName  // 복귀 시 사용할 건물 키
      });
    });
  }

  private playIntroSequence(): void {
    const centerX = this.WORLD_WIDTH / 2;
    const centerY = this.WORLD_HEIGHT / 2;

    this.cameras.main.centerOn(centerX, centerY);

    this.spawnLight = this.add.graphics();
    this.spawnLight.setDepth(10);

    let lightIntensity = 0;
    const lightTimer = this.time.addEvent({
      delay: 30,
      callback: () => {
        lightIntensity += 0.05;
        this.spawnLight.clear();

        // 빛 기둥
        this.spawnLight.fillStyle(0xffffff, Math.min(lightIntensity, 0.8));
        this.spawnLight.fillRect(centerX - 25, centerY - 300, 50, 300);

        // 광원 원
        this.spawnLight.fillStyle(0xffffaa, Math.min(lightIntensity * 0.5, 0.4));
        this.spawnLight.fillCircle(centerX, centerY, lightIntensity * 80);

        // 파티클
        for (let i = 0; i < 5; i++) {
          const px = centerX + Phaser.Math.Between(-40, 40);
          const py = centerY - Phaser.Math.Between(0, 200);
          this.spawnLight.fillStyle(0xffffdd, 0.6);
          this.spawnLight.fillCircle(px, py, Phaser.Math.Between(2, 5));
        }

        if (lightIntensity >= 1.5) {
          lightTimer.destroy();
          this.spawnPlayer(centerX, centerY + 50);
        }
      },
      loop: true,
    });
  }

  private spawnPlayer(x: number, y: number): void {
    this.player = new Player(this, x, y);
    this.player.setAlpha(0);
    this.player.setDepth(100);

    // 플레이어 그림자
    this.playerShadow = this.add.ellipse(x, y + 24, 35, 14, 0x000000, 0.35);
    this.playerShadow.setDepth(99);

    // 충돌 설정
    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.collider(this.player, this.npcGroup);
    this.physics.add.collider(this.player, this.buildingBodies);

    this.tweens.add({
      targets: this.player,
      alpha: 1,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        this.tweens.add({
          targets: this.spawnLight,
          alpha: 0,
          duration: 1500,
          onComplete: () => {
            this.spawnLight.destroy();
            this.startDialogue();
          },
        });
      },
    });

    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
  }

  private spawnPlayerAtBuilding(buildingKey: string): void {
    // 해당 건물 찾기
    const building = this.buildings.find(b => b.sceneName === buildingKey);

    let spawnX = this.WORLD_WIDTH / 2;
    let spawnY = this.WORLD_HEIGHT / 2;

    if (building) {
      // 던전은 동굴이므로 아래쪽에서 스폰
      if (buildingKey === 'DungeonScene') {
        spawnX = building.x;
        spawnY = building.y + building.height / 2 + 60; // 동굴 아래쪽
      } else {
        // 일반 건물은 입구 앞에 스폰
        spawnX = building.x;
        spawnY = building.y + building.height / 2 + 80;
      }
    }

    // 플레이어 생성
    this.player = new Player(this, spawnX, spawnY);
    this.player.setDepth(100);

    // 플레이어 그림자
    this.playerShadow = this.add.ellipse(spawnX, spawnY + 24, 35, 14, 0x000000, 0.35);
    this.playerShadow.setDepth(99);

    // 충돌 설정
    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.collider(this.player, this.npcGroup);
    this.physics.add.collider(this.player, this.buildingBodies);

    // 카메라 팔로우
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    // 즉시 이동 가능하게 설정
    this.isIntroPlaying = false;
    this.canMove = true;

    // 건물 재입장 방지 쿨다운 설정 (1.5초)
    this.buildingEntryCooldown = 1500;

    // 미니맵 및 UI 활성화
    this.createMinimap();
    this.scene.launch('UIScene');
  }

  private startDialogue(): void {
    this.dialogues = [
      '으으... 머리가 아파...',
      '여기는... 어디지...?',
      '분명 집에서 자고 있었는데...',
      '이게 뭐야... 숲속 마을...?',
      '설마... 이세계...?!',
      '아니, 그런 건 만화에서나 나오는 거잖아.',
      '근데 이 상황은 대체...',
      '일단 침착하자. 주변을 둘러봐야겠어.',
      '건물들이 보이네. 마을인 것 같아.',
      '우선 이곳을 탐색해보자.',
    ];
    this.dialogueIndex = 0;

    // 대화 중에는 UIScene(스킬 UI) 숨기기
    if (this.scene.isActive('UIScene')) {
      this.scene.setVisible(false, 'UIScene');
    }

    this.createDialogueUI();

    this.time.delayedCall(500, () => {
      this.showNextDialogue();
    });
  }

  private createDialogueUI(): void {
    const { width, height } = this.cameras.main;

    // 전체 대화 컨테이너 (z축 최상단)
    this.dialogueContainer = this.add.container(0, 0);
    this.dialogueContainer.setScrollFactor(0);
    this.dialogueContainer.setDepth(10000); // 최상단

    // 어두운 배경 오버레이
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, width, height);

    // 캐릭터 전신 이미지 (왼쪽, 대사창보다 뒤에)
    this.characterImage = this.add.image(160, height - 280, 'player_portrait');
    this.characterImage.setOrigin(0.5, 0.5);
    this.characterImage.setScale(0.8); // 크기 조절

    // 캐릭터 이미지에 약간의 그림자 효과
    const charShadow = this.add.graphics();
    charShadow.fillStyle(0x000000, 0.3);
    charShadow.fillEllipse(160, height - 100, 120, 30);

    // 대화창 배경 (하단) - 캐릭터 이미지보다 z축 앞에
    const dialogBg = this.add.graphics();

    // 그라데이션 효과의 대화창
    dialogBg.fillStyle(0x0a0a15, 0.95);
    dialogBg.fillRect(0, height - 180, width, 180);

    // 상단 라인
    dialogBg.fillStyle(0x00d4ff, 0.8);
    dialogBg.fillRect(0, height - 180, width, 3);

    // 대화창 내부 디자인
    dialogBg.fillStyle(0x0f0f1a, 0.8);
    dialogBg.fillRoundedRect(30, height - 165, width - 60, 130, 8);

    dialogBg.lineStyle(1, 0x1a3a5a, 0.6);
    dialogBg.strokeRoundedRect(30, height - 165, width - 60, 130, 8);

    // 이름 태그
    const nameTagBg = this.add.graphics();
    nameTagBg.fillStyle(0x00d4ff, 0.2);
    nameTagBg.fillRoundedRect(50, height - 155, 80, 28, 14);
    nameTagBg.lineStyle(1, 0x00d4ff, 0.5);
    nameTagBg.strokeRoundedRect(50, height - 155, 80, 28, 14);

    this.nameTagText = this.add.text(90, height - 141, '???', {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '13px',
      color: '#00d4ff',
      fontStyle: 'bold',
    });
    this.nameTagText.setOrigin(0.5, 0.5);

    // 대사 텍스트
    this.dialogueText = this.add.text(60, height - 115, '', {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '18px',
      color: '#e8e8e8',
      wordWrap: { width: width - 120 },
      lineSpacing: 8,
    });

    // 건너뛰기 버튼
    const skipBtnBg = this.add.graphics();
    skipBtnBg.fillStyle(0x1a1a2a, 0.9);
    skipBtnBg.fillRoundedRect(width - 120, 20, 100, 35, 17);
    skipBtnBg.lineStyle(1, 0x3a3a5a, 0.8);
    skipBtnBg.strokeRoundedRect(width - 120, 20, 100, 35, 17);

    const skipText = this.add.text(width - 70, 37, '건너뛰기', {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '13px',
      color: '#888888',
    });
    skipText.setOrigin(0.5, 0.5);

    const skipHitArea = this.add.rectangle(width - 70, 37, 100, 35, 0xffffff, 0);
    skipHitArea.setInteractive({ useHandCursor: true });
    skipHitArea.on('pointerdown', () => {
      this.skipAllDialogue();
    });

    // 컨트롤 힌트
    const hintText = this.add.text(width - 50, height - 25, 'Ctrl ▶', {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '12px',
      color: '#00d4ff',
    });
    hintText.setOrigin(1, 0.5);
    hintText.setAlpha(0.7);

    this.tweens.add({
      targets: hintText,
      alpha: { from: 0.7, to: 0.3 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // 컨테이너에 추가 (순서 중요: 먼저 추가된 것이 뒤에 배치됨)
    // overlay -> charShadow -> characterImage (뒤) -> dialogBg (앞)
    this.dialogueContainer.add([
      overlay, charShadow, this.characterImage, dialogBg,
      nameTagBg, this.nameTagText, this.dialogueText,
      skipBtnBg, skipText, skipHitArea, hintText
    ]);

    // 등장 애니메이션
    this.dialogueContainer.setAlpha(0);
    this.tweens.add({
      targets: this.dialogueContainer,
      alpha: 1,
      duration: 400,
      ease: 'Power2',
    });
  }

  private showNextDialogue(): void {
    if (this.dialogueIndex >= this.dialogues.length) {
      this.hideDialogueUI();
      this.showChoiceButtons();
      return;
    }
    this.showDialogue(this.dialogues[this.dialogueIndex]);
    this.dialogueIndex++;
  }

  private showDialogue(text: string): void {
    this.dialogueText.setText('');
    this.isTyping = true;
    this.dialogueComplete = false;

    let charIndex = 0;
    this.currentTypeTimer = this.time.addEvent({
      delay: 35,
      callback: () => {
        this.dialogueText.setText(text.substring(0, charIndex + 1));
        charIndex++;
        if (charIndex >= text.length) {
          this.currentTypeTimer?.destroy();
          this.isTyping = false;
          this.dialogueComplete = true;
        }
      },
      loop: true,
    });
  }

  private skipToEndOfDialogue(): void {
    if (this.currentTypeTimer) {
      this.currentTypeTimer.destroy();
    }
    this.dialogueText.setText(this.dialogues[this.dialogueIndex - 1] || '');
    this.isTyping = false;
    this.dialogueComplete = true;
  }

  private skipAllDialogue(): void {
    if (this.currentTypeTimer) {
      this.currentTypeTimer.destroy();
    }
    this.hideDialogueUI();
    this.showChoiceButtons();
  }

  private hideDialogueUI(): void {
    this.tweens.add({
      targets: this.dialogueContainer,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        this.dialogueContainer.setVisible(false);
      },
    });
  }

  private showChoiceButtons(): void {
    const { width, height } = this.cameras.main;

    this.choiceButtons.forEach(btn => btn.destroy());
    this.choiceButtons = [];
    this.selectedButtonIndex = 0;

    const buttonData = [
      { text: '튜토리얼 보기', callback: () => this.onTutorialClick() },
      { text: '진행하기', callback: () => this.startGame() },
    ];

    buttonData.forEach((data, i) => {
      const btn = this.createModernButton(width / 2, height / 2 - 30 + i * 70, data.text, data.callback, i);
      this.choiceButtons.push(btn);

      btn.setAlpha(0);
      btn.setScale(0.9);
      this.tweens.add({
        targets: btn,
        alpha: 1,
        scale: 1,
        duration: 300,
        delay: i * 100,
        ease: 'Back.easeOut',
      });
    });

    this.updateButtonSelection();
  }

  private createModernButton(x: number, y: number, text: string, callback: () => void, index: number): Phaser.GameObjects.Container {
    const btnWidth = 280;
    const btnHeight = 55;

    const container = this.add.container(x, y);
    container.setScrollFactor(0);
    container.setDepth(9999);
    container.setData('callback', callback);
    container.setData('index', index);

    const bg = this.add.graphics();
    this.drawModernButton(bg, btnWidth, btnHeight, false);

    const btnText = this.add.text(0, 0, text, {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '18px',
      color: '#b0b0b0',
      fontStyle: 'bold',
    });
    btnText.setOrigin(0.5, 0.5);

    container.add([bg, btnText]);
    container.setData('bg', bg);
    container.setData('text', btnText);

    const hitArea = this.add.rectangle(0, 0, btnWidth, btnHeight, 0xffffff, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);

    container.setSize(btnWidth, btnHeight);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      this.selectedButtonIndex = index;
      this.updateButtonSelection();
    });

    container.on('pointerdown', () => {
      this.onButtonClick(index);
    });

    hitArea.on('pointerover', () => {
      this.selectedButtonIndex = index;
      this.updateButtonSelection();
    });

    hitArea.on('pointerdown', () => {
      this.onButtonClick(index);
    });

    return container;
  }

  private drawModernButton(graphics: Phaser.GameObjects.Graphics, width: number, height: number, selected: boolean): void {
    graphics.clear();

    if (selected) {
      // 글로우
      graphics.fillStyle(0x00d4ff, 0.2);
      graphics.fillRoundedRect(-width / 2 - 4, -height / 2 - 4, width + 8, height + 8, 12);

      graphics.fillStyle(0x12121a, 0.98);
      graphics.fillRoundedRect(-width / 2, -height / 2, width, height, 10);

      graphics.lineStyle(2, 0x00d4ff, 1);
      graphics.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);

      // 내부 하이라이트
      graphics.fillStyle(0x00d4ff, 0.1);
      graphics.fillRoundedRect(-width / 2 + 3, -height / 2 + 3, width - 6, height / 2 - 3, 8);
    } else {
      graphics.fillStyle(0x12121a, 0.95);
      graphics.fillRoundedRect(-width / 2, -height / 2, width, height, 10);

      graphics.lineStyle(1, 0x3a3a4a, 0.6);
      graphics.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);
    }
  }

  private updateButtonSelection(): void {
    this.choiceButtons.forEach((btn, i) => {
      const bg = btn.getData('bg') as Phaser.GameObjects.Graphics;
      const text = btn.getData('text') as Phaser.GameObjects.Text;
      const selected = i === this.selectedButtonIndex;

      this.drawModernButton(bg, 280, 55, selected);
      text.setColor(selected ? '#00d4ff' : '#b0b0b0');

      this.tweens.add({
        targets: btn,
        scale: selected ? 1.05 : 1,
        duration: 150,
        ease: 'Power2',
      });
    });
  }

  private onButtonClick(index: number): void {
    const btn = this.choiceButtons[index];
    if (!btn) return;

    this.tweens.add({
      targets: btn,
      scale: 0.95,
      duration: 80,
      yoyo: true,
      onComplete: () => {
        const callback = btn.getData('callback') as () => void;
        if (callback) callback();
      },
    });
  }

  private onTutorialClick(): void {
    this.showNotification('준비중입니다');
    this.time.delayedCall(1200, () => {
      this.startGame();
    });
  }

  private showNotification(message: string): void {
    const { width, height } = this.cameras.main;

    const container = this.add.container(width / 2, height / 2 - 100);
    container.setScrollFactor(0);
    container.setDepth(10000);

    const bg = this.add.graphics();
    bg.fillStyle(0x00d4ff, 0.15);
    bg.fillRoundedRect(-110, -22, 220, 44, 22);
    bg.lineStyle(2, 0x00d4ff, 0.6);
    bg.strokeRoundedRect(-110, -22, 220, 44, 22);

    const text = this.add.text(0, 0, message, {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '16px',
      color: '#00d4ff',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5, 0.5);

    container.add([bg, text]);

    this.tweens.add({
      targets: container,
      alpha: 0,
      y: '-=30',
      duration: 500,
      delay: 800,
      onComplete: () => container.destroy(),
    });
  }

  private startGame(): void {
    this.choiceButtons.forEach((btn, i) => {
      this.tweens.add({
        targets: btn,
        alpha: 0,
        scale: 0.9,
        duration: 200,
        delay: i * 50,
        onComplete: () => btn.destroy(),
      });
    });

    this.time.delayedCall(300, () => {
      this.choiceButtons = [];
      this.isIntroPlaying = false;
      this.canMove = true;
      this.createMinimap();
      this.scene.launch('UIScene');
    });
  }

  private createMinimap(): void {
    const { width } = this.cameras.main;
    const mapSize = 150;
    const padding = 15;

    this.minimap = this.add.container(width - mapSize - padding, padding);
    this.minimap.setScrollFactor(0);
    this.minimap.setDepth(500);

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a12, 0.9);
    bg.fillRoundedRect(0, 0, mapSize, mapSize, 10);
    bg.lineStyle(2, 0x00d4ff, 0.5);
    bg.strokeRoundedRect(0, 0, mapSize, mapSize, 10);

    const mapArea = this.add.graphics();
    mapArea.fillStyle(0x3a5c2a, 0.7);
    mapArea.fillRoundedRect(8, 8, mapSize - 16, mapSize - 16, 6);

    // 건물 표시
    this.buildings.forEach(building => {
      const bx = 8 + ((building.x / this.WORLD_WIDTH) * (mapSize - 16));
      const by = 8 + ((building.y / this.WORLD_HEIGHT) * (mapSize - 16));
      mapArea.fillStyle(building.color, 0.9);
      mapArea.fillRect(bx - 5, by - 5, 10, 10);
    });

    // 중앙 광장
    mapArea.fillStyle(0x8b7355, 0.9);
    mapArea.fillCircle(mapSize / 2, mapSize / 2, 8);

    this.minimapPlayerDot = this.add.graphics();
    this.minimapPlayerDot.fillStyle(0x00d4ff, 1);
    this.minimapPlayerDot.fillCircle(0, 0, 5);
    this.minimapPlayerDot.lineStyle(2, 0xffffff, 0.9);
    this.minimapPlayerDot.strokeCircle(0, 0, 5);

    const label = this.add.text(mapSize / 2, mapSize + 10, 'MINIMAP', {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '10px',
      color: '#5a5a6a',
    });
    label.setOrigin(0.5, 0);

    this.minimap.add([bg, mapArea, this.minimapPlayerDot, label]);

    this.minimap.setAlpha(0);
    this.tweens.add({
      targets: this.minimap,
      alpha: 1,
      duration: 400,
    });
  }

  private updateMinimap(): void {
    if (!this.minimapPlayerDot || !this.player) return;

    const mapSize = 150;
    const mapPadding = 8;
    const mapInnerSize = mapSize - mapPadding * 2;

    const playerMapX = mapPadding + (this.player.x / this.WORLD_WIDTH) * mapInnerSize;
    const playerMapY = mapPadding + (this.player.y / this.WORLD_HEIGHT) * mapInnerSize;

    this.minimapPlayerDot.setPosition(playerMapX, playerMapY);
  }

  update(time: number, delta: number): void {
    if (this.dashCooldown > 0) this.dashCooldown -= delta;
    if (this.jumpCooldown > 0) this.jumpCooldown -= delta;
    if (this.buildingEntryCooldown > 0) this.buildingEntryCooldown -= delta;

    this.updateNPCs(delta);

    // Ctrl 키 처리
    const ctrlPressed = Phaser.Input.Keyboard.JustDown(this.ctrlKey);
    if (ctrlPressed) {
      if (this.choiceButtons.length > 0) {
        this.onButtonClick(this.selectedButtonIndex);
        return;
      }
      if (this.isIntroPlaying && this.dialogueContainer && this.dialogueContainer.alpha > 0) {
        if (this.isTyping) {
          this.skipToEndOfDialogue();
        } else if (this.dialogueComplete) {
          this.showNextDialogue();
        }
        return; // 대화 중이면 기본 공격 안함
      }
    }

    // 버튼 선택
    if (this.choiceButtons.length > 0) {
      if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
        this.selectedButtonIndex = Math.max(0, this.selectedButtonIndex - 1);
        this.updateButtonSelection();
      } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
        this.selectedButtonIndex = Math.min(this.choiceButtons.length - 1, this.selectedButtonIndex + 1);
        this.updateButtonSelection();
      }
    }

    if (!this.player || !this.canMove) return;

    // 건물 입장 체크
    this.checkBuildingEntrance();

    // 미니맵 업데이트
    this.updateMinimap();

    // 플레이어 그림자
    if (this.playerShadow) {
      this.playerShadow.setPosition(this.player.x, this.player.y + 24);
    }

    // 플레이어 깊이
    this.player.setDepth(this.player.y / 10 + 50);

    this.player.update(time, delta);
    this.handleKeyboardMovement();

    // 대쉬
    if (Phaser.Input.Keyboard.JustDown(this.shiftKey) && !this.isDashing && this.dashCooldown <= 0) {
      this.performDash();
    }

    // 점프 (쿨타임 없음)
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && !this.isJumping) {
      this.performJump();
    }

    // 기본 공격 (Ctrl)
    if (ctrlPressed) {
      this.performBasicAttack();
    }

    // 스킬 키 처리
    this.handleSkillInput();

    this.monsters.getChildren().forEach((monster) => {
      (monster as Monster).update(time, delta, this.player);
    });
  }

  // 기본 공격 - 검 베기
  private performBasicAttack(): void {
    // 공격 방향
    let dirX = 1;
    let dirY = 0;
    if (this.cursors.left.isDown) dirX = -1;
    else if (this.cursors.right.isDown) dirX = 1;
    if (this.cursors.up.isDown) dirY = -1;
    else if (this.cursors.down.isDown) dirY = 1;

    // 베기 이펙트
    const slashEffect = this.add.graphics();
    slashEffect.setDepth(this.player.depth + 1);

    const slashRadius = 60;
    const startAngle = Math.atan2(dirY, dirX) - 0.8;
    const endAngle = startAngle + 1.6;

    // 검 베기 호 (arc)
    slashEffect.lineStyle(8, 0x888899, 0.6);
    slashEffect.beginPath();
    slashEffect.arc(this.player.x, this.player.y, slashRadius, startAngle, endAngle);
    slashEffect.strokePath();

    slashEffect.lineStyle(4, 0xccccdd, 0.9);
    slashEffect.beginPath();
    slashEffect.arc(this.player.x, this.player.y, slashRadius, startAngle, endAngle);
    slashEffect.strokePath();

    slashEffect.lineStyle(2, 0xffffff, 1);
    slashEffect.beginPath();
    slashEffect.arc(this.player.x, this.player.y, slashRadius, startAngle, endAngle);
    slashEffect.strokePath();

    // 끝점 섬광
    const endX = this.player.x + Math.cos(endAngle) * slashRadius;
    const endY = this.player.y + Math.sin(endAngle) * slashRadius;
    slashEffect.fillStyle(0xffffff, 0.8);
    slashEffect.fillCircle(endX, endY, 5);

    // 이펙트 사라짐
    this.tweens.add({
      targets: slashEffect,
      alpha: 0,
      duration: 100,
      onComplete: () => slashEffect.destroy(),
    });

    // TODO: 범위 내 몬스터에게 기본 데미지 적용
  }

  private performDash(): void {
    if (this.isDashing) return;

    this.isDashing = true;
    this.dashCooldown = 1000;

    let dashX = 0;
    let dashY = 0;

    if (this.cursors.left.isDown) dashX = -1;
    else if (this.cursors.right.isDown) dashX = 1;
    if (this.cursors.up.isDown) dashY = -1;
    else if (this.cursors.down.isDown) dashY = 1;

    if (dashX === 0 && dashY === 0) dashX = 1;

    const dashDistance = 150;
    const dashDuration = 150;

    // 대쉬 이펙트
    const dashEffect = this.add.graphics();
    dashEffect.fillStyle(0x00d4ff, 0.4);
    dashEffect.fillCircle(this.player.x, this.player.y, 25);
    dashEffect.setDepth(this.player.depth - 1);

    this.tweens.add({
      targets: dashEffect,
      alpha: 0,
      scale: 2,
      duration: 200,
      onComplete: () => dashEffect.destroy(),
    });

    // 잔상
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 40, () => {
        const afterImage = this.add.ellipse(this.player.x, this.player.y, 40, 50, 0x00d4ff, 0.25 - i * 0.08);
        afterImage.setDepth(this.player.depth - 2);
        this.tweens.add({
          targets: afterImage,
          alpha: 0,
          duration: 200,
          onComplete: () => afterImage.destroy(),
        });
      });
    }

    const targetX = this.player.x + dashX * dashDistance;
    const targetY = this.player.y + dashY * dashDistance;

    const clampedX = Phaser.Math.Clamp(targetX, 50, this.WORLD_WIDTH - 50);
    const clampedY = Phaser.Math.Clamp(targetY, 50, this.WORLD_HEIGHT - 50);

    this.tweens.add({
      targets: this.player,
      x: clampedX,
      y: clampedY,
      duration: dashDuration,
      ease: 'Power2',
      onComplete: () => {
        this.isDashing = false;
      },
    });

    const uiScene = this.scene.get('UIScene') as any;
    if (uiScene && uiScene.setSkillCooldown) {
      uiScene.setSkillCooldown('Shift', 1000);
    }
  }

  private performJump(): void {
    if (this.isJumping) return;

    this.isJumping = true;
    // 쿨타임 제거

    const jumpHeight = 50;
    const jumpDuration = 350;

    this.tweens.add({
      targets: this.playerShadow,
      scaleX: 0.5,
      scaleY: 0.5,
      alpha: 0.15,
      duration: jumpDuration / 2,
      yoyo: true,
    });

    const originalY = this.player.y;

    this.tweens.add({
      targets: this.player,
      y: originalY - jumpHeight,
      duration: jumpDuration / 2,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: this.player,
          y: originalY,
          duration: jumpDuration / 2,
          ease: 'Quad.easeIn',
          onComplete: () => {
            this.isJumping = false;

            // 착지 이펙트
            const landEffect = this.add.graphics();
            landEffect.fillStyle(0x888888, 0.3);
            landEffect.fillEllipse(this.player.x, this.player.y + 20, 30, 12);
            landEffect.setDepth(this.player.depth - 1);

            this.tweens.add({
              targets: landEffect,
              alpha: 0,
              scaleX: 1.5,
              scaleY: 1.5,
              duration: 150,
              onComplete: () => landEffect.destroy(),
            });
          },
        });
      },
    });

    // 점프는 쿨타임이 없으므로 UI 업데이트 제거
  }

  private handleKeyboardMovement(): void {
    if (!this.canMove || this.isDashing) return;

    const speed = 250;
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown) vx = -speed;
    else if (this.cursors.right.isDown) vx = speed;

    if (this.cursors.up.isDown) vy = -speed;
    else if (this.cursors.down.isDown) vy = speed;

    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    this.player.setVelocity(vx, vy);
  }

  public getPlayer(): Player {
    return this.player;
  }

  private handleSkillInput(): void {
    if (!this.player || !this.canMove) return;

    // Q: 결정타
    if (Phaser.Input.Keyboard.JustDown(this.keyQ)) {
      this.useSkillQ();
    }

    // W: 와류의 검
    if (Phaser.Input.Keyboard.JustDown(this.keyW)) {
      this.useSkillW();
    }

    // E: 철벽 태세
    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this.useSkillE();
    }

    // R: 한계 돌파
    if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
      this.useSkillR();
    }

    // T: 성검 낙하
    if (Phaser.Input.Keyboard.JustDown(this.keyT)) {
      this.useSkillT();
    }
  }

  // Q: 결정타 - 정면으로 강 찌르기
  private useSkillQ(): void {
    if (!this.player.canUseSkill('Q')) {
      this.showSkillError('Q');
      return;
    }

    this.player.useSkill('Q');
    const skill = this.player.getSkill('Q')!;

    // UI 쿨타임 표시
    const uiScene = this.scene.get('UIScene') as any;
    if (uiScene && uiScene.setSkillCooldown) {
      uiScene.setSkillCooldown('Q', skill.cooldown);
    }

    // 찌르기 방향
    let dirX = 1;
    let dirY = 0;
    if (this.cursors.left.isDown) dirX = -1;
    else if (this.cursors.right.isDown) dirX = 1;
    if (this.cursors.up.isDown) dirY = -1;
    else if (this.cursors.down.isDown) dirY = 1;

    const thrustLength = 120;

    // 찌르기 시각 효과
    const thrustEffect = this.add.graphics();
    thrustEffect.setDepth(this.player.depth + 1);

    const startX = this.player.x + dirX * 20;
    const startY = this.player.y + dirY * 20;
    const endX = this.player.x + dirX * thrustLength;
    const endY = this.player.y + dirY * thrustLength;

    // 검 모양 (찌르기 - 뾰족한 삼각형)
    const angle = Math.atan2(dirY, dirX);
    const perpX = Math.cos(angle + Math.PI / 2);
    const perpY = Math.sin(angle + Math.PI / 2);

    // 검날 (삼각형)
    thrustEffect.fillStyle(0xccccdd, 0.9);
    thrustEffect.beginPath();
    thrustEffect.moveTo(endX, endY); // 검 끝
    thrustEffect.lineTo(startX + perpX * 8, startY + perpY * 8);
    thrustEffect.lineTo(startX - perpX * 8, startY - perpY * 8);
    thrustEffect.closePath();
    thrustEffect.fillPath();

    // 검날 중심 하이라이트
    thrustEffect.lineStyle(3, 0xffffff, 0.9);
    thrustEffect.lineBetween(startX, startY, endX, endY);

    // 찌르기 충격 효과 (끝점에서 퍼지는 선)
    for (let i = 0; i < 4; i++) {
      const spreadAngle = angle + (i - 1.5) * 0.3;
      const lineEndX = endX + Math.cos(spreadAngle) * 25;
      const lineEndY = endY + Math.sin(spreadAngle) * 25;
      thrustEffect.lineStyle(2, 0xffffcc, 0.7);
      thrustEffect.lineBetween(endX, endY, lineEndX, lineEndY);
    }

    // 이펙트 사라짐
    this.tweens.add({
      targets: thrustEffect,
      alpha: 0,
      duration: 120,
      onComplete: () => thrustEffect.destroy(),
    });
  }

  // W: 와류의 검 - 3초간 주변 휘두르기
  private useSkillW(): void {
    if (!this.player.canUseSkill('W')) {
      this.showSkillError('W');
      return;
    }

    this.player.useSkill('W');
    const skill = this.player.getSkill('W')!;

    // UI 쿨타임 표시
    const uiScene = this.scene.get('UIScene') as any;
    if (uiScene && uiScene.setSkillCooldown) {
      uiScene.setSkillCooldown('W', skill.cooldown);
    }

    // 와류 이펙트 컨테이너
    const vortexContainer = this.add.container(this.player.x, this.player.y);
    vortexContainer.setDepth(this.player.depth + 1);

    const swordGraphics = this.add.graphics();
    vortexContainer.add(swordGraphics);

    let hitCount = 0;
    const maxHits = 6;
    const hitInterval = 500;

    let angle = 0;
    const rotationSpeed = 0.2;
    const radius = 70;

    const updateVortex = () => {
      swordGraphics.clear();

      // 회전하는 검 슬래시 궤적
      for (let i = 0; i < 4; i++) {
        const swordAngle = angle + (i * Math.PI * 2) / 4;

        // 슬래시 궤적 (은색 검의 잔상)
        for (let j = 0; j < 5; j++) {
          const trailAngle = swordAngle - j * 0.08;
          const trailRadius = radius - j * 3;
          const tx = Math.cos(trailAngle) * trailRadius;
          const ty = Math.sin(trailAngle) * trailRadius * 0.7;

          swordGraphics.lineStyle(4 - j * 0.5, 0xccccdd, 0.8 - j * 0.15);
          swordGraphics.lineBetween(0, 0, tx, ty);
        }
      }

      // 바닥 슬래시 자국
      swordGraphics.lineStyle(1, 0x666677, 0.3);
      swordGraphics.strokeCircle(0, 0, radius * 0.9);

      angle += rotationSpeed;
      vortexContainer.setPosition(this.player.x, this.player.y);
    };

    const updateEvent = this.time.addEvent({
      delay: 16,
      callback: updateVortex,
      loop: true,
    });

    // 0.5초마다 데미지 + 슬래시 이펙트
    const damageEvent = this.time.addEvent({
      delay: hitInterval,
      callback: () => {
        hitCount++;

        // 슬래시 히트 이펙트 (십자 베기)
        const hitEffect = this.add.graphics();
        hitEffect.setDepth(vortexContainer.depth + 1);

        // X자 슬래시
        hitEffect.lineStyle(4, 0xffffff, 0.8);
        hitEffect.lineBetween(this.player.x - 50, this.player.y - 30, this.player.x + 50, this.player.y + 30);
        hitEffect.lineBetween(this.player.x + 50, this.player.y - 30, this.player.x - 50, this.player.y + 30);

        hitEffect.lineStyle(2, 0xffddaa, 0.6);
        hitEffect.lineBetween(this.player.x - 50, this.player.y - 30, this.player.x + 50, this.player.y + 30);
        hitEffect.lineBetween(this.player.x + 50, this.player.y - 30, this.player.x - 50, this.player.y + 30);

        this.tweens.add({
          targets: hitEffect,
          alpha: 0,
          scale: 1.2,
          duration: 120,
          onComplete: () => hitEffect.destroy(),
        });

        if (hitCount >= maxHits) {
          damageEvent.destroy();
        }
      },
      loop: true,
    });

    // 3초 후 종료
    this.time.delayedCall(3000, () => {
      updateEvent.destroy();
      damageEvent.destroy();

      this.tweens.add({
        targets: vortexContainer,
        alpha: 0,
        scale: 1.3,
        duration: 200,
        onComplete: () => vortexContainer.destroy(),
      });
    });
  }

  // E: 철벽 태세 - 3초간 보호막
  private useSkillE(): void {
    if (!this.player.canUseSkill('E')) {
      this.showSkillError('E');
      return;
    }

    this.player.useSkill('E');
    const skill = this.player.getSkill('E')!;

    // UI 쿨타임 표시
    const uiScene = this.scene.get('UIScene') as any;
    if (uiScene && uiScene.setSkillCooldown) {
      uiScene.setSkillCooldown('E', skill.cooldown);
    }

    // 보호막 적용 (50)
    this.player.applyShield(50);

    // 방패 시각 효과
    const shieldContainer = this.add.container(this.player.x, this.player.y);
    shieldContainer.setDepth(this.player.depth + 1);

    const shieldGraphics = this.add.graphics();
    shieldContainer.add(shieldGraphics);

    // 방패 그리기 (철벽 느낌)
    const drawShield = (intensity: number) => {
      shieldGraphics.clear();

      // 방패 테두리 (철 느낌)
      shieldGraphics.lineStyle(5, 0x888899, 0.8 + intensity * 0.2);
      shieldGraphics.strokeCircle(0, 0, 42);

      shieldGraphics.lineStyle(3, 0xaaaaaa, 0.9);
      shieldGraphics.strokeCircle(0, 0, 38);

      // 내부 금속판
      shieldGraphics.fillStyle(0x555566, 0.4 + intensity * 0.2);
      shieldGraphics.fillCircle(0, 0, 36);

      // 십자 철장 무늬
      shieldGraphics.lineStyle(3, 0x777788, 0.6 + intensity * 0.2);
      shieldGraphics.lineBetween(-30, 0, 30, 0);
      shieldGraphics.lineBetween(0, -30, 0, 30);

      // 대각선 보강재
      shieldGraphics.lineStyle(2, 0x666677, 0.5);
      shieldGraphics.lineBetween(-22, -22, 22, 22);
      shieldGraphics.lineBetween(22, -22, -22, 22);

      // 중앙 보스 (볼록한 장식)
      shieldGraphics.fillStyle(0x999999, 0.8);
      shieldGraphics.fillCircle(0, 0, 8);
      shieldGraphics.fillStyle(0xbbbbbb, 0.6);
      shieldGraphics.fillCircle(-2, -2, 4);

      // 금속 반짝임
      if (intensity > 0.5) {
        shieldGraphics.fillStyle(0xffffff, (intensity - 0.5) * 0.4);
        shieldGraphics.fillCircle(-15, -15, 3);
      }
    };

    // 펄스 애니메이션
    this.tweens.add({
      targets: { intensity: 0 },
      intensity: 1,
      duration: 500,
      yoyo: true,
      repeat: 5,
      onUpdate: (tween) => {
        const intensity = tween.getValue() as number;
        drawShield(intensity);
        shieldContainer.setPosition(this.player.x, this.player.y);
      },
    });

    // 3초 후 종료
    this.time.delayedCall(3000, () => {
      this.player.shield = 0;

      this.tweens.add({
        targets: shieldContainer,
        alpha: 0,
        scale: 0.8,
        duration: 200,
        onComplete: () => shieldContainer.destroy(),
      });
    });
  }

  // R: 한계 돌파 - 5초간 공격력/속도 증가
  private useSkillR(): void {
    if (!this.player.canUseSkill('R')) {
      this.showSkillError('R');
      return;
    }

    this.player.useSkill('R');
    const skill = this.player.getSkill('R')!;

    // UI 쿨타임 표시
    const uiScene = this.scene.get('UIScene') as any;
    if (uiScene && uiScene.setSkillCooldown) {
      uiScene.setSkillCooldown('R', skill.cooldown);
    }

    // 버프 적용
    this.player.applyLimitBreak();

    // 투기 이펙트 (검사의 기합)
    const auraContainer = this.add.container(this.player.x, this.player.y);
    auraContainer.setDepth(this.player.depth - 1);

    const auraGraphics = this.add.graphics();
    auraContainer.add(auraGraphics);

    // 발동 이펙트 - 기합 폭발 (원형)
    const burstEffect = this.add.graphics();
    burstEffect.setDepth(this.player.depth + 2);

    // 원형 폭발파
    burstEffect.lineStyle(4, 0xff6644, 0.8);
    burstEffect.strokeCircle(this.player.x, this.player.y, 30);
    burstEffect.lineStyle(2, 0xffaa66, 0.6);
    burstEffect.strokeCircle(this.player.x, this.player.y, 45);

    this.tweens.add({
      targets: burstEffect,
      alpha: 0,
      scale: 1.8,
      duration: 250,
      onComplete: () => burstEffect.destroy(),
    });

    // 지속 오라 애니메이션 (붉은 투기)
    const drawAura = (time: number, intensity: number) => {
      auraGraphics.clear();

      // 상승하는 기운 (세로 선들)
      for (let i = 0; i < 6; i++) {
        const xOffset = (i - 2.5) * 12;
        const yOffset = Math.sin(time * 0.008 + i) * 15;
        const height = 40 + Math.sin(time * 0.01 + i * 0.5) * 10;

        auraGraphics.lineStyle(2, 0xff6644, 0.5 * intensity);
        auraGraphics.lineBetween(xOffset, 20 - yOffset, xOffset, 20 - yOffset - height);
      }

      // 발밑 투기
      auraGraphics.lineStyle(2, 0xff4422, 0.4 * intensity);
      auraGraphics.strokeEllipse(0, 25, 50 + Math.sin(time * 0.01) * 5, 15);

      // 붉은 테두리
      auraGraphics.lineStyle(3, 0xcc3311, 0.6 * intensity);
      auraGraphics.strokeCircle(0, 0, 35 + Math.sin(time * 0.015) * 3);
    };

    let elapsed = 0;
    const updateAura = this.time.addEvent({
      delay: 16,
      callback: () => {
        elapsed += 16;
        const remaining = 5000 - elapsed;
        const intensity = remaining > 500 ? 1 : remaining / 500;

        drawAura(elapsed, intensity);
        auraContainer.setPosition(this.player.x, this.player.y);
      },
      loop: true,
    });

    // 5초 후 종료
    this.time.delayedCall(5000, () => {
      updateAura.destroy();
      this.player.removeLimitBreak();

      this.tweens.add({
        targets: auraContainer,
        alpha: 0,
        duration: 200,
        onComplete: () => auraContainer.destroy(),
      });
    });
  }

  // T: 성검 낙하 - 맵 전체 공격
  private useSkillT(): void {
    if (!this.player.canUseSkill('T')) {
      this.showSkillError('T');
      return;
    }

    this.player.useSkill('T');
    const skill = this.player.getSkill('T')!;

    // UI 쿨타임 표시
    const uiScene = this.scene.get('UIScene') as any;
    if (uiScene && uiScene.setSkillCooldown) {
      uiScene.setSkillCooldown('T', skill.cooldown);
    }

    // 화면 전체에 성검 낙하 효과
    const numSwords = 15;
    const { width, height } = this.cameras.main;
    const camX = this.cameras.main.scrollX;
    const camY = this.cameras.main.scrollY;

    // 하늘에서 빛 내려오기
    const skyLight = this.add.graphics();
    skyLight.setScrollFactor(0);
    skyLight.setDepth(900);
    skyLight.fillStyle(0xffffaa, 0.3);
    skyLight.fillRect(0, 0, width, height);

    this.tweens.add({
      targets: skyLight,
      alpha: 0,
      duration: 500,
      delay: 1500,
      onComplete: () => skyLight.destroy(),
    });

    // 검들 생성
    for (let i = 0; i < numSwords; i++) {
      this.time.delayedCall(i * 80, () => {
        const targetX = camX + Phaser.Math.Between(50, width - 50);
        const targetY = camY + Phaser.Math.Between(100, height - 100);

        // 경고 표시
        const warning = this.add.graphics();
        warning.setDepth(800);
        warning.fillStyle(0xff0000, 0.3);
        warning.fillCircle(targetX, targetY, 40);
        warning.lineStyle(2, 0xff0000, 0.6);
        warning.strokeCircle(targetX, targetY, 40);

        // 검 생성 (위에서 시작)
        const sword = this.add.graphics();
        sword.setDepth(950);
        sword.setPosition(targetX, targetY - 400);

        // 검 그리기
        sword.fillStyle(0xffffdd, 1);
        sword.beginPath();
        sword.moveTo(0, -40);
        sword.lineTo(-8, 20);
        sword.lineTo(0, 15);
        sword.lineTo(8, 20);
        sword.closePath();
        sword.fillPath();

        // 검 빛
        sword.fillStyle(0xffffff, 0.8);
        sword.fillRect(-2, -35, 4, 45);

        // 자루
        sword.fillStyle(0x8b7355, 1);
        sword.fillRect(-5, 20, 10, 15);

        // 검 낙하 애니메이션
        this.tweens.add({
          targets: sword,
          y: targetY,
          duration: 300,
          ease: 'Quad.easeIn',
          onComplete: () => {
            warning.destroy();

            // 착지 폭발
            const explosion = this.add.graphics();
            explosion.setDepth(850);

            // 십자가 빛
            explosion.fillStyle(0xffffaa, 0.9);
            explosion.fillRect(targetX - 60, targetY - 5, 120, 10);
            explosion.fillRect(targetX - 5, targetY - 60, 10, 120);

            // 원형 폭발
            explosion.fillStyle(0xffff88, 0.7);
            explosion.fillCircle(targetX, targetY, 50);
            explosion.fillStyle(0xffffff, 0.5);
            explosion.fillCircle(targetX, targetY, 30);

            // 폭발 애니메이션
            this.tweens.add({
              targets: explosion,
              alpha: 0,
              scale: 2,
              duration: 400,
              onComplete: () => explosion.destroy(),
            });

            // 검 사라짐
            this.tweens.add({
              targets: sword,
              alpha: 0,
              duration: 200,
              onComplete: () => sword.destroy(),
            });

            // TODO: 범위 내 모든 몬스터에게 300 데미지
          },
        });
      });
    }
  }

  private showSkillError(key: string): void {
    const skill = this.player.getSkill(key);
    let message = '';

    if (skill) {
      if (skill.currentCooldown > 0) {
        message = `쿨타임 ${(skill.currentCooldown / 1000).toFixed(1)}초`;
      } else if (this.player.mana < skill.manaCost) {
        message = '마나 부족';
      } else if (skill.currentUses !== undefined && skill.currentUses <= 0) {
        message = '사용 횟수 초과';
      }
    }

    if (message) {
      const errorText = this.add.text(this.player.x, this.player.y - 40, message, {
        fontFamily: '"Noto Sans KR", sans-serif',
        fontSize: '14px',
        color: '#ff6666',
        stroke: '#000000',
        strokeThickness: 2,
      });
      errorText.setOrigin(0.5, 0.5);
      errorText.setDepth(1000);

      this.tweens.add({
        targets: errorText,
        y: this.player.y - 70,
        alpha: 0,
        duration: 800,
        onComplete: () => errorText.destroy(),
      });
    }
  }
}
