import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { SoundManager } from '../utils/SoundManager';

// 기본 건물 내부 씬 클래스
export class BuildingScene extends Phaser.Scene {
  protected buildingName: string = '';
  protected fromScene: string = 'GameScene';
  protected buildingKey: string = '';
  protected player!: Player;
  protected cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  protected canMove: boolean = true;
  protected playerShadow!: Phaser.GameObjects.Ellipse;

  protected readonly ROOM_WIDTH = 1280;
  protected readonly ROOM_HEIGHT = 720;

  constructor(config: { key: string }) {
    super(config);
  }

  init(data: { fromScene?: string; buildingName?: string; buildingKey?: string }): void {
    this.fromScene = data.fromScene || 'GameScene';
    this.buildingName = data.buildingName || this.buildingName;
    this.buildingKey = data.buildingKey || '';
    // 씬 재진입 시 canMove 초기화
    this.canMove = true;
  }

  preload(): void {
    // Player에서 필요한 리소스 로드
  }

  create(): void {
    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.cameras.main.setBackgroundColor(0x1a1a2e);

    // 플레이어용 빈 텍스처 생성 (drawImage 에러 방지)
    if (!this.textures.exists('player_empty')) {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      this.textures.addCanvas('player_empty', canvas);
    }

    this.cursors = this.input.keyboard!.createCursorKeys();

    this.createRoom();
    this.createPlayer();
    this.createUI();
  }

  protected createRoom(): void {
    const { width, height } = this.cameras.main;
    const graphics = this.add.graphics();

    // 바닥
    graphics.fillStyle(0x2a2a3a, 1);
    graphics.fillRect(0, 0, width, height);

    // 바닥 패턴
    graphics.fillStyle(0x3a3a4a, 0.5);
    for (let x = 0; x < width; x += 50) {
      for (let y = 0; y < height; y += 50) {
        if ((x + y) % 100 === 0) {
          graphics.fillRect(x, y, 50, 50);
        }
      }
    }

    // 벽
    graphics.fillStyle(0x4a4a5a, 1);
    graphics.fillRect(0, 0, width, 80);

    // 벽 디테일
    graphics.lineStyle(3, 0x5a5a6a, 1);
    graphics.strokeRect(10, 10, width - 20, 60);

    // 출구 표시 (하단)
    graphics.fillStyle(0x3a5a3a, 0.8);
    graphics.fillRect(width / 2 - 40, height - 50, 80, 50);

    graphics.fillStyle(0x4a7a4a, 1);
    graphics.fillRect(width / 2 - 35, height - 45, 70, 40);

    const exitText = this.add.text(width / 2, height - 25, '▼ 나가기', {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '12px',
      color: '#aaffaa',
    });
    exitText.setOrigin(0.5, 0.5);
  }

  protected createPlayer(): void {
    const { width, height } = this.cameras.main;

    // Player 클래스 사용
    this.player = new Player(this, width / 2, height - 120);
    this.player.setDepth(100);

    // 플레이어 그림자
    this.playerShadow = this.add.ellipse(width / 2, height - 96, 35, 14, 0x000000, 0.35);
    this.playerShadow.setDepth(99);
  }

  protected createUI(): void {
    const { width } = this.cameras.main;

    // 건물 이름
    const titleBg = this.add.graphics();
    titleBg.fillStyle(0x0a0a15, 0.9);
    titleBg.fillRoundedRect(width / 2 - 100, 10, 200, 40, 20);
    titleBg.lineStyle(2, 0x00d4ff, 0.6);
    titleBg.strokeRoundedRect(width / 2 - 100, 10, 200, 40, 20);

    const title = this.add.text(width / 2, 30, this.buildingName, {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '18px',
      color: '#00d4ff',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);
  }

  protected exitBuilding(): void {
    this.canMove = false;
    this.cameras.main.fadeOut(500, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(this.fromScene, { returnFromBuilding: this.buildingKey });
    });
  }

  update(time: number, delta: number): void {
    if (!this.canMove || !this.player) return;

    const { width, height } = this.cameras.main;

    // Player 클래스의 update 호출
    this.player.update(time, delta);

    // 키보드 이동
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

    // 이동 제한
    this.player.x = Phaser.Math.Clamp(this.player.x, 30, width - 30);
    this.player.y = Phaser.Math.Clamp(this.player.y, 100, height - 60);

    // 그림자 위치 업데이트
    if (this.playerShadow) {
      this.playerShadow.setPosition(this.player.x, this.player.y + 24);
    }

    // 출구 체크 (하단)
    if (this.player.y > height - 80 &&
        this.player.x > width / 2 - 50 &&
        this.player.x < width / 2 + 50) {
      this.exitBuilding();
    }
  }
}

// 연구소 - 내부 구현 없음 (준비중)
export class LabScene extends BuildingScene {
  constructor() {
    super({ key: 'LabScene' });
    this.buildingName = '연구소';
  }

  protected createRoom(): void {
    super.createRoom();
    const { width, height } = this.cameras.main;

    const text = this.add.text(width / 2, height / 2, '🚧 준비중입니다 🚧', {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '24px',
      color: '#ffaa00',
    });
    text.setOrigin(0.5, 0.5);
  }
}

// 상점 - 내부 구현 없음 (준비중)
export class ShopScene extends BuildingScene {
  constructor() {
    super({ key: 'ShopScene' });
    this.buildingName = '상점';
  }

  protected createRoom(): void {
    super.createRoom();
    const { width, height } = this.cameras.main;

    const text = this.add.text(width / 2, height / 2, '🚧 준비중입니다 🚧', {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '24px',
      color: '#ffaa00',
    });
    text.setOrigin(0.5, 0.5);
  }
}

// 별의 장막
export class StarScene extends BuildingScene {
  constructor() {
    super({ key: 'StarScene' });
    this.buildingName = '별의 장막';
  }

  protected createRoom(): void {
    const { width, height } = this.cameras.main;
    const graphics = this.add.graphics();

    // 어두운 신비로운 배경
    graphics.fillStyle(0x0a0a1a, 1);
    graphics.fillRect(0, 0, width, height);

    // 별들
    for (let i = 0; i < 100; i++) {
      const x = Phaser.Math.Between(10, width - 10);
      const y = Phaser.Math.Between(10, height - 100);
      const size = Phaser.Math.Between(1, 3);
      const alpha = Phaser.Math.FloatBetween(0.3, 1);
      graphics.fillStyle(0xffffff, alpha);
      graphics.fillCircle(x, y, size);
    }

    // 마법진
    graphics.lineStyle(2, 0x9966ff, 0.8);
    graphics.strokeCircle(width / 2, height / 2 - 50, 120);
    graphics.strokeCircle(width / 2, height / 2 - 50, 100);
    graphics.strokeCircle(width / 2, height / 2 - 50, 80);

    // 마법진 문양
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const x1 = width / 2 + Math.cos(angle) * 120;
      const y1 = height / 2 - 50 + Math.sin(angle) * 120;
      const x2 = width / 2 + Math.cos(angle + Math.PI) * 120;
      const y2 = height / 2 - 50 + Math.sin(angle + Math.PI) * 120;
      graphics.lineBetween(x1, y1, x2, y2);
    }

    // 중앙 빛
    graphics.fillStyle(0x9966ff, 0.3);
    graphics.fillCircle(width / 2, height / 2 - 50, 50);
    graphics.fillStyle(0xcc99ff, 0.5);
    graphics.fillCircle(width / 2, height / 2 - 50, 25);

    // 출구
    graphics.fillStyle(0x3a5a3a, 0.8);
    graphics.fillRect(width / 2 - 40, height - 50, 80, 50);
    graphics.fillStyle(0x4a7a4a, 1);
    graphics.fillRect(width / 2 - 35, height - 45, 70, 40);

    const exitText = this.add.text(width / 2, height - 25, '나가기 (ESC)', {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '12px',
      color: '#aaffaa',
    });
    exitText.setOrigin(0.5, 0.5);

    // NPC
    const npcText = this.add.text(width / 2, height - 180, '🔮 점술사: "별이 당신의 운명을 말해주고 있어요..."', {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '16px',
      color: '#cc99ff',
      backgroundColor: '#0a0a1a',
      padding: { x: 10, y: 5 },
    });
    npcText.setOrigin(0.5, 0.5);
  }
}

// 던전 모드 타입
interface DungeonMode {
  name: string;
  description: string;
  color: number;
  icon: string;
  maxLevel: number;
  unlockedLevel: number;
}

// 지저 던전 - 메뉴 선택 시스템
export class DungeonScene extends Phaser.Scene {
  private selectedModeIndex: number = 0;
  private selectedLevel: number = 1;
  private isSelectingLevel: boolean = false;
  private modeButtons: Phaser.GameObjects.Container[] = [];
  private levelButtons: Phaser.GameObjects.Container[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private ctrlKey!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;
  private ambientGlow!: Phaser.GameObjects.Graphics;
  private levelPanel!: Phaser.GameObjects.Container;
  private soundManager!: SoundManager;

  private dungeonModes: DungeonMode[] = [
    { name: '지저 탐험', description: '던전을 탐험하며 자원을 수집합니다', color: 0x4488aa, icon: '🔍', maxLevel: 10, unlockedLevel: 1 },
    { name: '지저 정복', description: '강력한 몬스터들을 처치하세요', color: 0xaa4444, icon: '⚔️', maxLevel: 10, unlockedLevel: 1 },
    { name: '심연의 길', description: '끝없는 어둠 속으로...', color: 0x6622aa, icon: '🌀', maxLevel: 10, unlockedLevel: 1 },
  ];

  constructor() {
    super({ key: 'DungeonScene' });
  }

  create(): void {
    this.cameras.main.fadeIn(500, 0, 0, 0);

    // 던전 BGM 재생
    this.soundManager = SoundManager.getInstance(this);
    this.soundManager.playBGM('dungeon');

    // 씬 재진입 시 배열 초기화
    this.modeButtons = [];
    this.levelButtons = [];
    this.selectedModeIndex = 0;
    this.selectedLevel = 1;
    this.isSelectingLevel = false;

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.ctrlKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL);
    this.escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    this.createBackground();
    this.createModeSelection();
    this.createExitButton();
    this.updateModeSelection();
  }

  private createBackground(): void {
    const { width, height } = this.cameras.main;
    const graphics = this.add.graphics();

    // 칠흑같이 어두운 배경
    graphics.fillStyle(0x050505, 1);
    graphics.fillRect(0, 0, width, height);

    // 피로 물든 듯한 바닥 얼룩
    graphics.fillStyle(0x1a0505, 0.4);
    for (let i = 0; i < 12; i++) {
      const bx = Phaser.Math.Between(50, width - 50);
      const by = Phaser.Math.Between(50, height - 50);
      graphics.fillEllipse(bx, by, Phaser.Math.Between(40, 80), Phaser.Math.Between(30, 50));
    }

    // 동굴 벽면
    for (let y = 0; y < height; y += 35) {
      const wallWidth = 60 + Phaser.Math.Between(-15, 25);
      graphics.fillStyle(0x151515, 1);
      graphics.fillRect(0, y, wallWidth, 40);
      graphics.fillRect(width - wallWidth, y, wallWidth, 40);
    }

    // 천장
    graphics.fillStyle(0x0a0a0a, 1);
    graphics.fillRect(0, 0, width, 60);

    // 종유석
    for (let i = 0; i < 15; i++) {
      const sx = 80 + i * 80;
      const sh = Phaser.Math.Between(20, 50);
      graphics.fillStyle(0x1a1a1a, 1);
      graphics.beginPath();
      graphics.moveTo(sx - 8, 60);
      graphics.lineTo(sx, 60 + sh);
      graphics.lineTo(sx + 8, 60);
      graphics.closePath();
      graphics.fillPath();
    }

    // 심연 빛 효과
    this.ambientGlow = this.add.graphics();
    this.ambientGlow.setDepth(1);

    this.tweens.add({
      targets: { intensity: 0 },
      intensity: 1,
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: (tween) => {
        const intensity = tween.getValue() as number;
        this.ambientGlow.clear();
        this.ambientGlow.fillStyle(0x440022, 0.15 + intensity * 0.1);
        this.ambientGlow.fillEllipse(width / 2, height, width, 300);
      },
    });

    // 횃불
    const torchPositions = [{ x: 80, y: 150 }, { x: width - 80, y: 150 }];
    torchPositions.forEach((pos, index) => {
      graphics.fillStyle(0x2a1a0a, 1);
      graphics.fillRect(pos.x - 4, pos.y, 8, 30);

      const torchLight = this.add.graphics();
      torchLight.setDepth(2);

      this.tweens.add({
        targets: { flicker: 0 },
        flicker: 1,
        duration: 120 + index * 40,
        yoyo: true,
        repeat: -1,
        onUpdate: (tween) => {
          const flicker = tween.getValue() as number;
          torchLight.clear();
          torchLight.fillStyle(0x661100, 0.9);
          torchLight.fillCircle(pos.x, pos.y - 8, 12 + flicker * 3);
          torchLight.fillStyle(0xaa3300, 0.7);
          torchLight.fillCircle(pos.x, pos.y - 14, 7 + flicker * 2);
          torchLight.fillStyle(0x441100, 0.12);
          torchLight.fillCircle(pos.x, pos.y, 50);
        },
      });
    });

    // 타이틀
    const titleBg = this.add.graphics();
    titleBg.fillStyle(0x0a0a12, 0.9);
    titleBg.fillRoundedRect(width / 2 - 180, 80, 360, 60, 10);
    titleBg.lineStyle(2, 0xaa2222, 0.8);
    titleBg.strokeRoundedRect(width / 2 - 180, 80, 360, 60, 10);

    const title = this.add.text(width / 2, 110, '지저 던전', {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '32px',
      color: '#cc4444',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);

    // 타이틀 펄스
    this.tweens.add({
      targets: title,
      alpha: { from: 1, to: 0.7 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
    });
  }

  private createModeSelection(): void {
    const { width, height } = this.cameras.main;
    const startY = 200;
    const spacing = 130;

    this.dungeonModes.forEach((mode, index) => {
      const container = this.add.container(width / 2, startY + index * spacing);
      container.setDepth(10);

      // 배경
      const bg = this.add.graphics();
      bg.fillStyle(0x0a0a15, 0.9);
      bg.fillRoundedRect(-200, -45, 400, 90, 12);
      bg.lineStyle(2, mode.color, 0.6);
      bg.strokeRoundedRect(-200, -45, 400, 90, 12);

      // 아이콘
      const icon = this.add.text(-170, 0, mode.icon, { fontSize: '32px' });
      icon.setOrigin(0.5, 0.5);

      // 모드 이름
      const name = this.add.text(-120, -15, mode.name, {
        fontFamily: '"Noto Sans KR", sans-serif',
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold',
      });
      name.setOrigin(0, 0.5);

      // 설명
      const desc = this.add.text(-120, 15, mode.description, {
        fontFamily: '"Noto Sans KR", sans-serif',
        fontSize: '13px',
        color: '#888888',
      });
      desc.setOrigin(0, 0.5);

      // 레벨 표시
      const levelText = this.add.text(160, 0, `Lv.1-${mode.unlockedLevel}`, {
        fontFamily: '"Noto Sans KR", sans-serif',
        fontSize: '14px',
        color: '#aaaaaa',
      });
      levelText.setOrigin(0.5, 0.5);

      container.add([bg, icon, name, desc, levelText]);
      container.setData('bg', bg);
      container.setData('mode', mode);
      this.modeButtons.push(container);

      // 클릭 이벤트
      const hitArea = this.add.rectangle(0, 0, 400, 90, 0x000000, 0);
      hitArea.setInteractive({ useHandCursor: true });
      hitArea.on('pointerdown', () => {
        this.selectedModeIndex = index;
        this.updateModeSelection();
        this.openLevelSelection();
      });
      container.add(hitArea);
    });
  }

  private createExitButton(): void {
    const { width, height } = this.cameras.main;

    const exitBtn = this.add.container(width / 2, height - 60);
    exitBtn.setDepth(10);

    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2a, 0.9);
    bg.fillRoundedRect(-80, -22, 160, 44, 22);
    bg.lineStyle(2, 0x666688, 0.6);
    bg.strokeRoundedRect(-80, -22, 160, 44, 22);

    const text = this.add.text(0, 0, '마을로 돌아가기', {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '15px',
      color: '#aaaacc',
    });
    text.setOrigin(0.5, 0.5);

    exitBtn.add([bg, text]);

    const hitArea = this.add.rectangle(0, 0, 160, 44, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', () => this.exitToVillage());
    exitBtn.add(hitArea);
  }

  private updateModeSelection(): void {
    this.modeButtons.forEach((btn, index) => {
      const bg = btn.getData('bg') as Phaser.GameObjects.Graphics;
      const mode = btn.getData('mode') as DungeonMode;
      bg.clear();

      if (index === this.selectedModeIndex) {
        bg.fillStyle(0x1a1a25, 0.95);
        bg.fillRoundedRect(-200, -45, 400, 90, 12);
        bg.lineStyle(3, mode.color, 1);
        bg.strokeRoundedRect(-200, -45, 400, 90, 12);

        // 글로우 효과
        bg.lineStyle(6, mode.color, 0.3);
        bg.strokeRoundedRect(-203, -48, 406, 96, 14);
      } else {
        bg.fillStyle(0x0a0a15, 0.7);
        bg.fillRoundedRect(-200, -45, 400, 90, 12);
        bg.lineStyle(2, mode.color, 0.4);
        bg.strokeRoundedRect(-200, -45, 400, 90, 12);
      }
    });
  }

  private openLevelSelection(): void {
    if (this.isSelectingLevel) return;
    this.isSelectingLevel = true;
    this.selectedLevel = 1;

    const { width, height } = this.cameras.main;
    const mode = this.dungeonModes[this.selectedModeIndex];

    // 레벨 선택 패널
    this.levelPanel = this.add.container(width / 2, height / 2);
    this.levelPanel.setDepth(100);

    // 어두운 오버레이
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(-width / 2, -height / 2, width, height);
    this.levelPanel.add(overlay);

    // 패널 배경
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0a0a15, 0.98);
    panelBg.fillRoundedRect(-280, -220, 560, 440, 15);
    panelBg.lineStyle(3, mode.color, 0.8);
    panelBg.strokeRoundedRect(-280, -220, 560, 440, 15);
    this.levelPanel.add(panelBg);

    // 제목
    const title = this.add.text(0, -180, `${mode.icon} ${mode.name}`, {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '26px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5, 0.5);
    this.levelPanel.add(title);

    // 레벨 선택 안내
    const subtitle = this.add.text(0, -140, '층을 선택하세요', {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '14px',
      color: '#888888',
    });
    subtitle.setOrigin(0.5, 0.5);
    this.levelPanel.add(subtitle);

    // 레벨 버튼들 (2x5 그리드)
    this.levelButtons = [];
    for (let i = 0; i < 10; i++) {
      const col = i % 5;
      const row = Math.floor(i / 5);
      const x = -180 + col * 90;
      const y = -60 + row * 100;
      const level = i + 1;
      const isUnlocked = level <= mode.unlockedLevel;

      const btnContainer = this.add.container(x, y);

      const btnBg = this.add.graphics();
      if (isUnlocked) {
        btnBg.fillStyle(0x1a1a2a, 1);
        btnBg.fillRoundedRect(-35, -35, 70, 70, 10);
        btnBg.lineStyle(2, mode.color, 0.6);
        btnBg.strokeRoundedRect(-35, -35, 70, 70, 10);
      } else {
        btnBg.fillStyle(0x0a0a0a, 0.8);
        btnBg.fillRoundedRect(-35, -35, 70, 70, 10);
        btnBg.lineStyle(2, 0x333333, 0.4);
        btnBg.strokeRoundedRect(-35, -35, 70, 70, 10);
      }

      const levelNum = this.add.text(0, isUnlocked ? -5 : 0, isUnlocked ? `${level}` : '🔒', {
        fontFamily: '"Noto Sans KR", sans-serif',
        fontSize: isUnlocked ? '24px' : '20px',
        color: isUnlocked ? '#ffffff' : '#444444',
        fontStyle: 'bold',
      });
      levelNum.setOrigin(0.5, 0.5);

      btnContainer.add([btnBg, levelNum]);

      if (isUnlocked) {
        const floorText = this.add.text(0, 20, '층', {
          fontFamily: '"Noto Sans KR", sans-serif',
          fontSize: '12px',
          color: '#888888',
        });
        floorText.setOrigin(0.5, 0.5);
        btnContainer.add(floorText);

        const hitArea = this.add.rectangle(0, 0, 70, 70, 0x000000, 0);
        hitArea.setInteractive({ useHandCursor: true });
        hitArea.on('pointerdown', () => {
          this.selectedLevel = level;
          this.startDungeon();
        });
        btnContainer.add(hitArea);
      }

      btnContainer.setData('bg', btnBg);
      btnContainer.setData('level', level);
      btnContainer.setData('unlocked', isUnlocked);
      this.levelButtons.push(btnContainer);
      this.levelPanel.add(btnContainer);
    }

    // 닫기 버튼
    const closeBtn = this.add.container(0, 180);
    const closeBg = this.add.graphics();
    closeBg.fillStyle(0x2a2a3a, 0.9);
    closeBg.fillRoundedRect(-60, -18, 120, 36, 18);
    closeBg.lineStyle(2, 0x666688, 0.6);
    closeBg.strokeRoundedRect(-60, -18, 120, 36, 18);

    const closeText = this.add.text(0, 0, '뒤로가기', {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '14px',
      color: '#aaaacc',
    });
    closeText.setOrigin(0.5, 0.5);

    closeBtn.add([closeBg, closeText]);
    const closeHit = this.add.rectangle(0, 0, 120, 36, 0x000000, 0);
    closeHit.setInteractive({ useHandCursor: true });
    closeHit.on('pointerdown', () => this.closeLevelSelection());
    closeBtn.add(closeHit);
    this.levelPanel.add(closeBtn);

    // 등장 애니메이션
    this.levelPanel.setAlpha(0);
    this.levelPanel.setScale(0.9);
    this.tweens.add({
      targets: this.levelPanel,
      alpha: 1,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  private closeLevelSelection(): void {
    if (!this.isSelectingLevel) return;

    this.tweens.add({
      targets: this.levelPanel,
      alpha: 0,
      scale: 0.9,
      duration: 150,
      onComplete: () => {
        this.levelPanel.destroy();
        this.levelButtons = [];
        this.isSelectingLevel = false;
      },
    });
  }

  private startDungeon(): void {
    const mode = this.dungeonModes[this.selectedModeIndex];
    console.log(`Starting ${mode.name} Level ${this.selectedLevel}`);

    this.closeLevelSelection();

    // 지저 정복 모드 - 보스전
    if (mode.name === '지저 정복') {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        // 층에 따라 다른 보스
        let bossName = '트렌트';
        if (this.selectedLevel === 1) bossName = '트렌트';
        // 추후 다른 층 보스 추가

        this.scene.start('BossBattleScene', {
          bossName,
          floorLevel: this.selectedLevel,
        });
      });
      return;
    }

    // 다른 모드는 아직 준비 중
    const { width, height } = this.cameras.main;
    const notice = this.add.text(width / 2, height / 2, `${mode.name} ${this.selectedLevel}층\n준비 중입니다...`, {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '24px',
      color: '#ffaa44',
      align: 'center',
    });
    notice.setOrigin(0.5, 0.5);
    notice.setDepth(200);

    this.tweens.add({
      targets: notice,
      alpha: 0,
      y: height / 2 - 50,
      duration: 2000,
      delay: 1000,
      onComplete: () => notice.destroy(),
    });
  }

  private exitToVillage(): void {
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene', { returnFromBuilding: 'DungeonScene' });
    });
  }

  update(): void {
    // ESC로 나가기
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      if (this.isSelectingLevel) {
        this.closeLevelSelection();
      } else {
        this.exitToVillage();
      }
    }

    // 방향키로 모드 선택
    if (!this.isSelectingLevel) {
      if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
        this.selectedModeIndex = Math.max(0, this.selectedModeIndex - 1);
        this.updateModeSelection();
      } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
        this.selectedModeIndex = Math.min(this.dungeonModes.length - 1, this.selectedModeIndex + 1);
        this.updateModeSelection();
      }

      // Ctrl로 모드 선택 → 레벨 선택 창 열기
      if (Phaser.Input.Keyboard.JustDown(this.ctrlKey)) {
        this.openLevelSelection();
      }
    } else {
      // 레벨 선택 창이 열린 상태
      // 방향키로 레벨 선택
      const mode = this.dungeonModes[this.selectedModeIndex];
      if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
        if (this.selectedLevel > 1) {
          this.selectedLevel--;
          this.updateLevelSelection();
        }
      } else if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
        if (this.selectedLevel < mode.unlockedLevel) {
          this.selectedLevel++;
          this.updateLevelSelection();
        }
      } else if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
        // 위로 5칸 (위쪽 줄)
        if (this.selectedLevel > 5) {
          this.selectedLevel -= 5;
          this.updateLevelSelection();
        }
      } else if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
        // 아래로 5칸 (아래쪽 줄)
        if (this.selectedLevel <= 5 && this.selectedLevel + 5 <= mode.unlockedLevel) {
          this.selectedLevel += 5;
          this.updateLevelSelection();
        }
      }

      // Ctrl로 선택된 층 시작
      if (Phaser.Input.Keyboard.JustDown(this.ctrlKey)) {
        this.startDungeon();
      }
    }
  }

  private updateLevelSelection(): void {
    // 레벨 버튼 선택 상태 업데이트
    const mode = this.dungeonModes[this.selectedModeIndex];
    this.levelButtons.forEach((btn) => {
      const level = btn.getData('level') as number;
      const isUnlocked = btn.getData('unlocked') as boolean;
      const bg = btn.getData('bg') as Phaser.GameObjects.Graphics;

      bg.clear();
      if (level === this.selectedLevel && isUnlocked) {
        // 선택된 레벨
        bg.fillStyle(0x2a3a5a, 1);
        bg.fillRoundedRect(-35, -35, 70, 70, 10);
        bg.lineStyle(3, 0xffdd44, 1);
        bg.strokeRoundedRect(-35, -35, 70, 70, 10);
      } else if (isUnlocked) {
        bg.fillStyle(0x1a1a2a, 1);
        bg.fillRoundedRect(-35, -35, 70, 70, 10);
        bg.lineStyle(2, mode.color, 0.6);
        bg.strokeRoundedRect(-35, -35, 70, 70, 10);
      } else {
        bg.fillStyle(0x0a0a0a, 0.8);
        bg.fillRoundedRect(-35, -35, 70, 70, 10);
        bg.lineStyle(2, 0x333333, 0.4);
        bg.strokeRoundedRect(-35, -35, 70, 70, 10);
      }
    });
  }
}

// 교회 - 부활 장소
export class ChurchScene extends BuildingScene {
  private isRespawn: boolean = false;

  constructor() {
    super({ key: 'ChurchScene' });
    this.buildingName = '교회';
    this.buildingKey = 'ChurchScene'; // 기본값 설정
  }

  init(data: { fromScene?: string; buildingName?: string; buildingKey?: string; respawn?: boolean }): void {
    super.init(data);
    this.isRespawn = data.respawn || false;
    // 부활로 온 경우 buildingKey 설정
    if (!this.buildingKey) {
      this.buildingKey = 'ChurchScene';
    }
  }

  protected createRoom(): void {
    const { width, height } = this.cameras.main;
    const graphics = this.add.graphics();

    // 교회 내부 바닥 (대리석)
    graphics.fillStyle(0xf5f5f0, 1);
    graphics.fillRect(0, 0, width, height);

    // 바닥 패턴 (체크)
    for (let x = 0; x < width; x += 60) {
      for (let y = 0; y < height; y += 60) {
        if ((Math.floor(x / 60) + Math.floor(y / 60)) % 2 === 0) {
          graphics.fillStyle(0xe8e8e0, 1);
          graphics.fillRect(x, y, 60, 60);
        }
      }
    }

    // 벽 (스테인드글라스 느낌)
    graphics.fillStyle(0x8b7355, 1);
    graphics.fillRect(0, 0, width, 100);

    // 스테인드글라스 창문들
    const windowColors = [0xff6666, 0x66ff66, 0x6666ff, 0xffff66, 0xff66ff];
    for (let i = 0; i < 5; i++) {
      const wx = 150 + i * 220;
      graphics.fillStyle(0x4a4a4a, 1);
      graphics.fillRect(wx - 35, 20, 70, 60);
      graphics.fillStyle(windowColors[i], 0.7);
      graphics.fillRect(wx - 30, 25, 60, 50);

      // 창 분할선
      graphics.lineStyle(2, 0x333333, 1);
      graphics.lineBetween(wx, 25, wx, 75);
      graphics.lineBetween(wx - 30, 50, wx + 30, 50);
    }

    // 제단
    graphics.fillStyle(0x8b6914, 1);
    graphics.fillRect(width / 2 - 80, 150, 160, 80);
    graphics.fillStyle(0xaa8834, 1);
    graphics.fillRect(width / 2 - 75, 155, 150, 70);

    // 십자가
    graphics.fillStyle(0xffd700, 1);
    graphics.fillRect(width / 2 - 8, 120, 16, 60);
    graphics.fillRect(width / 2 - 25, 135, 50, 12);

    // 촛불들
    const candlePositions = [
      { x: width / 2 - 60, y: 160 },
      { x: width / 2 + 60, y: 160 },
    ];
    candlePositions.forEach(pos => {
      // 촛대
      graphics.fillStyle(0x8b6914, 1);
      graphics.fillRect(pos.x - 5, pos.y, 10, 25);
      // 촛불
      graphics.fillStyle(0xffffcc, 1);
      graphics.fillRect(pos.x - 3, pos.y - 15, 6, 15);
      // 불꽃
      graphics.fillStyle(0xff8800, 0.9);
      graphics.fillCircle(pos.x, pos.y - 20, 6);
      graphics.fillStyle(0xffff00, 0.8);
      graphics.fillCircle(pos.x, pos.y - 22, 3);
    });

    // 긴 의자들
    for (let row = 0; row < 3; row++) {
      const benchY = 320 + row * 100;
      // 왼쪽 의자
      graphics.fillStyle(0x6b4423, 1);
      graphics.fillRect(100, benchY, 250, 40);
      graphics.fillStyle(0x8b5a2b, 1);
      graphics.fillRect(105, benchY + 5, 240, 30);

      // 오른쪽 의자
      graphics.fillStyle(0x6b4423, 1);
      graphics.fillRect(width - 350, benchY, 250, 40);
      graphics.fillStyle(0x8b5a2b, 1);
      graphics.fillRect(width - 345, benchY + 5, 240, 30);
    }

    // 출구
    graphics.fillStyle(0x3a5a3a, 0.8);
    graphics.fillRect(width / 2 - 40, height - 50, 80, 50);
    graphics.fillStyle(0x4a7a4a, 1);
    graphics.fillRect(width / 2 - 35, height - 45, 70, 40);

    const exitText = this.add.text(width / 2, height - 25, '▼ 나가기', {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '12px',
      color: '#aaffaa',
    });
    exitText.setOrigin(0.5, 0.5);

    // 신부 NPC
    const priestContainer = this.add.container(width / 2, 260);
    priestContainer.setDepth(50);

    // 신부 그래픽
    const priestGraphics = this.add.graphics();

    // 로브
    priestGraphics.fillStyle(0x2a2a4a, 1);
    priestGraphics.fillEllipse(0, 20, 35, 50);
    priestGraphics.fillRect(-17, -10, 34, 30);

    // 얼굴
    priestGraphics.fillStyle(0xffd5b5, 1);
    priestGraphics.fillCircle(0, -20, 12);

    // 머리카락
    priestGraphics.fillStyle(0x4a4a4a, 1);
    priestGraphics.fillEllipse(0, -28, 14, 8);

    priestContainer.add(priestGraphics);

    // 대화 표시
    const dialogueBubble = this.add.graphics();
    dialogueBubble.fillStyle(0xffffff, 0.95);
    dialogueBubble.fillRoundedRect(-120, -80, 240, 50, 10);
    dialogueBubble.lineStyle(2, 0x4a4a4a, 0.8);
    dialogueBubble.strokeRoundedRect(-120, -80, 240, 50, 10);
    priestContainer.add(dialogueBubble);

    const dialogueText = this.add.text(0, -55, this.isRespawn
      ? '신의 가호로 부활하셨습니다.\n몸조심하세요, 용사여.'
      : '신의 축복이 함께 하길.\n언제든 쉬어가세요.',
      {
        fontFamily: '"Noto Sans KR", sans-serif',
        fontSize: '12px',
        color: '#333333',
        align: 'center',
      });
    dialogueText.setOrigin(0.5, 0.5);
    priestContainer.add(dialogueText);

    // 부활 효과 (부활로 온 경우)
    if (this.isRespawn) {
      this.playRespawnEffect();
    }
  }

  private playRespawnEffect(): void {
    const { width, height } = this.cameras.main;

    // 빛 효과
    const light = this.add.graphics();
    light.setDepth(200);
    light.fillStyle(0xffffaa, 0.6);
    light.fillCircle(width / 2, height - 120, 80);

    this.tweens.add({
      targets: light,
      alpha: 0,
      scale: 2,
      duration: 1500,
      onComplete: () => light.destroy(),
    });

    // 파티클 효과
    for (let i = 0; i < 20; i++) {
      const particle = this.add.graphics();
      particle.setDepth(201);
      particle.fillStyle(0xffffcc, 0.8);
      particle.fillCircle(0, 0, 3);

      const startX = width / 2 + Phaser.Math.Between(-30, 30);
      const startY = height - 120;
      particle.setPosition(startX, startY);

      this.tweens.add({
        targets: particle,
        x: startX + Phaser.Math.Between(-50, 50),
        y: startY - Phaser.Math.Between(50, 150),
        alpha: 0,
        duration: 1500,
        delay: i * 50,
        onComplete: () => particle.destroy(),
      });
    }

    // 부활 메시지
    const respawnText = this.add.text(width / 2, height / 2 - 100, '부활했습니다', {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '28px',
      color: '#ffdd88',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    });
    respawnText.setOrigin(0.5, 0.5);
    respawnText.setDepth(300);
    respawnText.setAlpha(0);

    this.tweens.add({
      targets: respawnText,
      alpha: 1,
      y: height / 2 - 120,
      duration: 500,
      onComplete: () => {
        this.tweens.add({
          targets: respawnText,
          alpha: 0,
          duration: 1000,
          delay: 1500,
          onComplete: () => respawnText.destroy(),
        });
      },
    });
  }
}

// 촌장의 집 - 내부 구현 없음 (준비중)
export class MayorScene extends BuildingScene {
  constructor() {
    super({ key: 'MayorScene' });
    this.buildingName = '촌장의 집';
  }

  protected createRoom(): void {
    super.createRoom();
    const { width, height } = this.cameras.main;

    const text = this.add.text(width / 2, height / 2, '🚧 준비중입니다 🚧', {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '24px',
      color: '#ffaa00',
    });
    text.setOrigin(0.5, 0.5);
  }
}
