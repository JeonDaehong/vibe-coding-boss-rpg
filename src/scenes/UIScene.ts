import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, ECONOMY } from '../config/GameConfig';
import { Unit } from '../entities/Unit';
import { getSoundManager } from '../utils/SoundManager';

export class UIScene extends Phaser.Scene {
  private goldText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private goldIcon!: Phaser.GameObjects.Graphics;

  // Buttons
  private unitButton!: Phaser.GameObjects.Container;
  private cardButton!: Phaser.GameObjects.Container;

  // Unit Info Panel
  private unitInfoPanel!: Phaser.GameObjects.Container;
  private selectedUnit: Unit | null = null;

  // Game scene reference
  private gameScene!: Phaser.Scene;

  // Current values
  private currentGold: number = ECONOMY.startingGold;
  private currentWave: number = 0;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    this.gameScene = this.scene.get('GameScene');

    this.createTopPanel();
    this.createBottomPanel();
    this.createUnitInfoPanel();
    this.setupEventListeners();
  }

  private createTopPanel(): void {
    // Top panel background with gradient effect
    const topPanel = this.add.graphics();

    // 그라디언트 배경
    topPanel.fillStyle(0x0a0a1a, 0.95);
    topPanel.fillRoundedRect(10, 10, 320, 70, 15);
    topPanel.fillStyle(0x1a1a3e, 0.8);
    topPanel.fillRoundedRect(12, 12, 316, 40, 12);

    // 빛나는 테두리
    topPanel.lineStyle(3, 0xFFD700, 0.6);
    topPanel.strokeRoundedRect(10, 10, 320, 70, 15);
    topPanel.lineStyle(1, 0xFFFFFF, 0.3);
    topPanel.strokeRoundedRect(12, 12, 316, 66, 13);

    // Gold icon - 더 화려하게
    this.goldIcon = this.add.graphics();
    this.goldIcon.setPosition(40, 45);

    // 빛 효과
    this.goldIcon.fillStyle(0xFFD700, 0.2);
    this.goldIcon.fillCircle(0, 0, 25);

    // 코인 그림자
    this.goldIcon.fillStyle(0x8B6914, 1);
    this.goldIcon.fillCircle(2, 2, 16);

    // 메인 코인
    this.goldIcon.fillStyle(0xFFD700);
    this.goldIcon.fillCircle(0, 0, 16);

    // 하이라이트
    this.goldIcon.fillStyle(0xFFFFAA, 0.9);
    this.goldIcon.fillCircle(-4, -4, 8);
    this.goldIcon.fillStyle(0xFFFFFF, 0.6);
    this.goldIcon.fillCircle(-5, -5, 4);

    // 코인 테두리
    this.goldIcon.lineStyle(2, 0xDAA520);
    this.goldIcon.strokeCircle(0, 0, 16);

    // G 표시
    const gText = this.add.text(40, 45, 'G', {
      fontSize: '14px',
      color: '#8B6914',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Gold text
    this.goldText = this.add.text(70, 32, `${this.currentGold}`, {
      fontSize: '32px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    });

    // 코인 반짝임 애니메이션
    this.tweens.add({
      targets: this.goldIcon,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Gold label
    this.add.text(70, 58, 'GOLD', {
      fontSize: '12px',
      color: '#CCAA66',
      fontStyle: 'bold',
    });

    // Wave panel - 더 화려하게
    const wavePanel = this.add.graphics();

    // 배경
    wavePanel.fillStyle(0x1a0a0a, 0.95);
    wavePanel.fillRoundedRect(GAME_WIDTH / 2 - 100, 10, 200, 55, 12);
    wavePanel.fillStyle(0x2a1a1a, 0.8);
    wavePanel.fillRoundedRect(GAME_WIDTH / 2 - 98, 12, 196, 35, 10);

    // 빛나는 테두리
    wavePanel.lineStyle(3, 0xFF4444, 0.7);
    wavePanel.strokeRoundedRect(GAME_WIDTH / 2 - 100, 10, 200, 55, 12);
    wavePanel.lineStyle(1, 0xFF6666, 0.4);
    wavePanel.strokeRoundedRect(GAME_WIDTH / 2 - 98, 12, 196, 51, 10);

    // Wave text
    this.waveText = this.add.text(GAME_WIDTH / 2, 37, 'WAVE 0', {
      fontSize: '28px',
      color: '#FF4444',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Skull decorations - 더 멋지게
    this.createSkullIcon(GAME_WIDTH / 2 - 80, 37);
    this.createSkullIcon(GAME_WIDTH / 2 + 80, 37);

    // 장식 라인
    wavePanel.lineStyle(2, 0xFF4444, 0.3);
    wavePanel.lineBetween(GAME_WIDTH / 2 - 60, 55, GAME_WIDTH / 2 + 60, 55);
  }

  private createSkullIcon(x: number, y: number): void {
    const skull = this.add.graphics();
    skull.setPosition(x, y);
    skull.fillStyle(0xFFFFFF, 0.8);
    skull.fillCircle(0, -2, 8);
    skull.fillRoundedRect(-6, 0, 12, 8, 2);
    skull.fillStyle(0x000000);
    skull.fillCircle(-3, -3, 2);
    skull.fillCircle(3, -3, 2);
    skull.fillTriangle(-1, 1, 1, 1, 0, 4);
  }

  private createBottomPanel(): void {
    // Bottom panel background - 화려한 디자인
    const bottomPanel = this.add.graphics();

    // 그림자
    bottomPanel.fillStyle(0x000000, 0.5);
    bottomPanel.fillRoundedRect(GAME_WIDTH / 2 - 198, GAME_HEIGHT - 88, 400, 85, 18);

    // 메인 배경
    bottomPanel.fillStyle(0x0a0a1a, 0.95);
    bottomPanel.fillRoundedRect(GAME_WIDTH / 2 - 200, GAME_HEIGHT - 95, 400, 85, 18);

    // 내부 그라디언트
    bottomPanel.fillStyle(0x1a1a3e, 0.7);
    bottomPanel.fillRoundedRect(GAME_WIDTH / 2 - 195, GAME_HEIGHT - 90, 390, 45, 12);

    // 빛나는 테두리
    bottomPanel.lineStyle(3, 0x4488FF, 0.6);
    bottomPanel.strokeRoundedRect(GAME_WIDTH / 2 - 200, GAME_HEIGHT - 95, 400, 85, 18);
    bottomPanel.lineStyle(1, 0x6699FF, 0.3);
    bottomPanel.strokeRoundedRect(GAME_WIDTH / 2 - 198, GAME_HEIGHT - 93, 396, 81, 16);

    // 장식 다이아몬드
    const diamondPositions = [
      { x: GAME_WIDTH / 2 - 185, y: GAME_HEIGHT - 80 },
      { x: GAME_WIDTH / 2 + 185, y: GAME_HEIGHT - 80 },
      { x: GAME_WIDTH / 2 - 185, y: GAME_HEIGHT - 25 },
      { x: GAME_WIDTH / 2 + 185, y: GAME_HEIGHT - 25 },
    ];

    diamondPositions.forEach(pos => {
      // 다이아몬드 모양
      bottomPanel.fillStyle(0x4488FF, 0.8);
      bottomPanel.fillTriangle(pos.x, pos.y - 6, pos.x - 5, pos.y, pos.x, pos.y + 6);
      bottomPanel.fillTriangle(pos.x, pos.y - 6, pos.x + 5, pos.y, pos.x, pos.y + 6);
      bottomPanel.fillStyle(0xAADDFF, 0.5);
      bottomPanel.fillCircle(pos.x, pos.y, 3);
    });

    // 중앙 장식 라인
    bottomPanel.lineStyle(2, 0x4488FF, 0.4);
    bottomPanel.lineBetween(GAME_WIDTH / 2 - 5, GAME_HEIGHT - 85, GAME_WIDTH / 2 - 5, GAME_HEIGHT - 20);
    bottomPanel.lineBetween(GAME_WIDTH / 2 + 5, GAME_HEIGHT - 85, GAME_WIDTH / 2 + 5, GAME_HEIGHT - 20);

    // Unit summon button
    this.unitButton = this.createButton(
      GAME_WIDTH / 2 - 100,
      GAME_HEIGHT - 52,
      '유닛 소환',
      `${ECONOMY.randomUnitCost}G`,
      0x2a6a3e,
      () => this.onUnitButtonClick()
    );

    // Card button
    this.cardButton = this.createButton(
      GAME_WIDTH / 2 + 100,
      GAME_HEIGHT - 52,
      '카드 뽑기',
      `${ECONOMY.randomCardCost}G`,
      0x6a2a6e,
      () => this.onCardButtonClick()
    );
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    cost: string,
    color: number,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // 버튼 그림자
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.4);
    shadow.fillRoundedRect(-73, -26, 150, 60, 12);
    container.add(shadow);

    // Button background - 그라디언트 효과
    const bg = this.add.graphics();
    bg.fillStyle(color - 0x101010);
    bg.fillRoundedRect(-75, -30, 150, 60, 12);
    bg.fillStyle(color);
    bg.fillRoundedRect(-75, -30, 150, 55, 12);
    bg.fillStyle(color + 0x151515);
    bg.fillRoundedRect(-73, -28, 146, 25, 10);
    container.add(bg);

    // 빛나는 테두리
    const border = this.add.graphics();
    border.lineStyle(2, color + 0x404040);
    border.strokeRoundedRect(-75, -30, 150, 60, 12);
    border.lineStyle(1, 0xFFFFFF, 0.3);
    border.strokeRoundedRect(-73, -28, 146, 56, 10);
    container.add(border);

    // 아이콘 (유닛 소환 = 검, 카드 = 카드 모양)
    const icon = this.add.graphics();
    icon.setPosition(-55, 0);
    if (label.includes('유닛')) {
      // 검 아이콘
      icon.fillStyle(0xCCCCCC, 0.9);
      icon.fillRect(-2, -12, 4, 18); // 검날
      icon.fillStyle(0x8B4513);
      icon.fillRect(-5, 6, 10, 4); // 손잡이 가드
      icon.fillStyle(0x654321);
      icon.fillRect(-2, 10, 4, 6); // 손잡이
      icon.fillStyle(0xFFD700);
      icon.fillCircle(0, -12, 3); // 검 끝 장식
    } else {
      // 카드 아이콘
      icon.fillStyle(0xFFFFFF, 0.9);
      icon.fillRoundedRect(-8, -12, 16, 24, 2);
      icon.fillStyle(color + 0x303030);
      icon.fillRoundedRect(-6, -10, 12, 20, 1);
      icon.fillStyle(0xFFD700);
      icon.fillCircle(0, 0, 4); // 카드 중앙 원
      icon.lineStyle(1, 0xFFD700);
      icon.strokeCircle(0, 0, 6);
    }
    container.add(icon);

    // Label
    const labelText = this.add.text(10, -10, label, {
      fontSize: '16px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);
    container.add(labelText);

    // Cost - 코인 아이콘 추가
    const coinIcon = this.add.graphics();
    coinIcon.setPosition(-10, 14);
    coinIcon.fillStyle(0xFFD700);
    coinIcon.fillCircle(0, 0, 8);
    coinIcon.fillStyle(0xFFFFAA, 0.7);
    coinIcon.fillCircle(-2, -2, 4);
    coinIcon.lineStyle(1, 0xDAA520);
    coinIcon.strokeCircle(0, 0, 8);
    container.add(coinIcon);

    const costText = this.add.text(15, 14, cost, {
      fontSize: '14px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0, 0.5);
    container.add(costText);

    // Make interactive
    const hitArea = this.add.rectangle(0, 0, 150, 60, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);

    // Hover 시 빛나는 효과
    const glowEffect = this.add.graphics();
    glowEffect.setVisible(false);
    container.add(glowEffect);

    hitArea.on('pointerover', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 100,
        ease: 'Back.easeOut',
      });

      bg.clear();
      bg.fillStyle(color);
      bg.fillRoundedRect(-75, -30, 150, 60, 12);
      bg.fillStyle(color + 0x252525);
      bg.fillRoundedRect(-73, -28, 146, 55, 10);
      bg.fillStyle(color + 0x353535);
      bg.fillRoundedRect(-71, -26, 142, 25, 8);

      border.clear();
      border.lineStyle(3, 0xFFFFFF, 0.8);
      border.strokeRoundedRect(-75, -30, 150, 60, 12);

      glowEffect.clear();
      glowEffect.setVisible(true);
      glowEffect.fillStyle(0xFFFFFF, 0.1);
      glowEffect.fillRoundedRect(-80, -35, 160, 70, 15);
    });

    hitArea.on('pointerout', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });

      bg.clear();
      bg.fillStyle(color - 0x101010);
      bg.fillRoundedRect(-75, -30, 150, 60, 12);
      bg.fillStyle(color);
      bg.fillRoundedRect(-75, -30, 150, 55, 12);
      bg.fillStyle(color + 0x151515);
      bg.fillRoundedRect(-73, -28, 146, 25, 10);

      border.clear();
      border.lineStyle(2, color + 0x404040);
      border.strokeRoundedRect(-75, -30, 150, 60, 12);
      border.lineStyle(1, 0xFFFFFF, 0.3);
      border.strokeRoundedRect(-73, -28, 146, 56, 10);

      glowEffect.setVisible(false);
    });

    hitArea.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scaleX: 0.92,
        scaleY: 0.92,
        duration: 50,
        yoyo: true,
        onComplete: () => onClick(),
      });

      // 클릭 파티클
      for (let i = 0; i < 8; i++) {
        const particle = this.add.graphics();
        particle.setPosition(x, y);
        particle.fillStyle(0xFFFFFF, 0.8);
        particle.fillCircle(0, 0, 3);

        const angle = (i / 8) * Math.PI * 2;
        this.tweens.add({
          targets: particle,
          x: x + Math.cos(angle) * 40,
          y: y + Math.sin(angle) * 40,
          alpha: 0,
          duration: 300,
          onComplete: () => particle.destroy(),
        });
      }
    });

    // 부드러운 호버 애니메이션
    this.tweens.add({
      targets: container,
      y: y - 2,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    return container;
  }

  private createUnitInfoPanel(): void {
    // Create container for unit info panel (initially hidden)
    this.unitInfoPanel = this.add.container(GAME_WIDTH - 110, 200);
    this.unitInfoPanel.setVisible(false);
    this.unitInfoPanel.setDepth(100);

    // Panel background
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x1a1a2e, 0.95);
    panelBg.fillRoundedRect(-100, -20, 200, 280, 12);
    panelBg.lineStyle(3, 0x4a4a6e);
    panelBg.strokeRoundedRect(-100, -20, 200, 280, 12);
    this.unitInfoPanel.add(panelBg);

    // Decorative top border
    const topBorder = this.add.graphics();
    topBorder.fillStyle(0xFFD700, 0.8);
    topBorder.fillRoundedRect(-90, -15, 180, 5, 2);
    this.unitInfoPanel.add(topBorder);

    // Close button (X)
    const closeBtn = this.add.text(85, -10, '✕', {
      fontSize: '20px',
      color: '#FF6666',
      fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerover', () => closeBtn.setColor('#FFFFFF'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#FF6666'));
    closeBtn.on('pointerdown', () => this.hideUnitInfoPanel());

    this.unitInfoPanel.add(closeBtn);

    // Title
    const titleBg = this.add.graphics();
    titleBg.fillStyle(0x2a2a4e, 0.8);
    titleBg.fillRoundedRect(-85, 0, 170, 30, 5);
    this.unitInfoPanel.add(titleBg);

    const title = this.add.text(0, 15, '유닛 정보', {
      fontSize: '16px',
      color: '#FFD700',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.unitInfoPanel.add(title);
  }

  private showUnitInfoPanel(unit: Unit): void {
    this.selectedUnit = unit;
    this.unitInfoPanel.setVisible(true);

    // Clear previous content (keep first 4 elements: bg, border, close btn, title bg, title)
    while (this.unitInfoPanel.list.length > 5) {
      const child = this.unitInfoPanel.list[5];
      if (child instanceof Phaser.GameObjects.GameObject) {
        child.destroy();
      }
      this.unitInfoPanel.remove(child);
    }

    // Unit portrait background
    const portraitBg = this.add.graphics();
    portraitBg.fillStyle(0x2a2a4e, 0.9);
    portraitBg.fillRoundedRect(-40, 40, 80, 80, 8);
    portraitBg.lineStyle(2, unit.getGradeColorHex());
    portraitBg.strokeRoundedRect(-40, 40, 80, 80, 8);
    this.unitInfoPanel.add(portraitBg);

    // Unit name
    const nameText = this.add.text(0, 135, unit.unitName, {
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.unitInfoPanel.add(nameText);

    // Grade badge
    const gradeBadge = this.add.graphics();
    const gradeColor = unit.getGradeColorHex();
    gradeBadge.fillStyle(gradeColor);
    gradeBadge.fillRoundedRect(-20, 155, 40, 25, 5);
    gradeBadge.lineStyle(1, 0xFFFFFF, 0.5);
    gradeBadge.strokeRoundedRect(-20, 155, 40, 25, 5);
    this.unitInfoPanel.add(gradeBadge);

    const gradeText = this.add.text(0, 167, unit.grade, {
      fontSize: '16px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.unitInfoPanel.add(gradeText);

    // Stats
    const statsStartY = 195;
    const statsData = [
      { label: 'HP', value: `${unit.currentHealth}/${unit.maxHealth}`, color: '#00FF00' },
      { label: '공격력', value: `${unit.damage}`, color: '#FF6666' },
      { label: '공속', value: `${(1000 / unit.attackSpeed).toFixed(1)}/초`, color: '#66AAFF' },
      { label: '사거리', value: `${unit.range}`, color: '#FFAA00' },
    ];

    statsData.forEach((stat, index) => {
      const y = statsStartY + index * 22;

      // Stat row background
      const rowBg = this.add.graphics();
      rowBg.fillStyle(index % 2 === 0 ? 0x2a2a4e : 0x252540, 0.6);
      rowBg.fillRect(-85, y - 8, 170, 20);
      this.unitInfoPanel.add(rowBg);

      // Label
      const label = this.add.text(-80, y, stat.label, {
        fontSize: '13px',
        color: '#AAAAAA',
      });
      this.unitInfoPanel.add(label);

      // Value
      const value = this.add.text(80, y, stat.value, {
        fontSize: '13px',
        color: stat.color,
        fontStyle: 'bold',
      }).setOrigin(1, 0);
      this.unitInfoPanel.add(value);
    });

    // Animate panel appearance
    this.unitInfoPanel.setAlpha(0);
    this.unitInfoPanel.setScale(0.8);
    this.tweens.add({
      targets: this.unitInfoPanel,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 150,
      ease: 'Back.easeOut',
    });
  }

  private hideUnitInfoPanel(): void {
    const soundManager = getSoundManager();
    soundManager?.playButtonClick();

    // Deselect current unit
    if (this.selectedUnit && this.selectedUnit.active) {
      this.selectedUnit.deselect();
    }
    this.selectedUnit = null;

    // Animate panel disappearance
    this.tweens.add({
      targets: this.unitInfoPanel,
      alpha: 0,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: 100,
      onComplete: () => {
        this.unitInfoPanel.setVisible(false);
      },
    });
  }

  private setupEventListeners(): void {
    // Listen to game scene events
    this.gameScene.events.on('goldChanged', (gold: number) => {
      this.updateGold(gold);
    });

    this.gameScene.events.on('waveStarted', (wave: number) => {
      this.updateWave(wave);
    });

    // Listen for unit selection
    this.gameScene.events.on('unitSelected', (unit: Unit | null) => {
      if (unit) {
        this.showUnitInfoPanel(unit);
      } else {
        this.hideUnitInfoPanel();
      }
    });

    // Listen for unit death to close panel if selected unit dies
    this.gameScene.events.on('unitDied', (unit: Unit) => {
      if (this.selectedUnit === unit) {
        this.hideUnitInfoPanel();
      }
    });
  }

  private updateGold(gold: number): void {
    const oldGold = this.currentGold;
    this.currentGold = gold;

    // Animate gold change
    this.tweens.add({
      targets: this.goldText,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        this.goldText.setText(`${gold}`);
      },
    });

    // Gold particle effect
    if (gold > oldGold) {
      this.createGoldParticle();
    }
  }

  private createGoldParticle(): void {
    const particle = this.add.graphics();
    particle.fillStyle(0xFFD700);
    particle.fillCircle(0, 0, 5);
    particle.setPosition(90, 40);

    this.tweens.add({
      targets: particle,
      y: particle.y - 20,
      alpha: 0,
      duration: 500,
      onComplete: () => particle.destroy(),
    });
  }

  private updateWave(wave: number): void {
    this.currentWave = wave;
    this.waveText.setText(`WAVE ${wave}`);

    // Wave start animation
    this.tweens.add({
      targets: this.waveText,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 200,
      yoyo: true,
    });

    // Flash effect
    this.cameras.main.flash(200, 100, 0, 0, false);

    // Show wave announcement
    this.showWaveAnnouncement(wave);
  }

  private showWaveAnnouncement(wave: number): void {
    // 화면 어둡게
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    overlay.setDepth(1000);

    this.tweens.add({
      targets: overlay,
      alpha: 0.4,
      duration: 200,
      yoyo: true,
      hold: 800,
      onComplete: () => overlay.destroy(),
    });

    // 배경 효과
    const bgEffect = this.add.graphics();
    bgEffect.setPosition(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    bgEffect.setDepth(1001);
    bgEffect.fillStyle(0xFF0000, 0.3);
    bgEffect.fillCircle(0, 0, 50);

    this.tweens.add({
      targets: bgEffect,
      scaleX: 15,
      scaleY: 15,
      alpha: 0,
      duration: 600,
      onComplete: () => bgEffect.destroy(),
    });

    // WAVE 텍스트 (위)
    const waveLabel = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, 'W A V E', {
      fontSize: '32px',
      color: '#FFAAAA',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0).setDepth(1002);

    // 숫자 (아래)
    const waveNumber = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, `${wave}`, {
      fontSize: '96px',
      color: '#FF0000',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 10,
    }).setOrigin(0.5).setAlpha(0).setScale(0.5).setDepth(1002);

    // 장식 라인
    const lineLeft = this.add.graphics();
    lineLeft.setPosition(GAME_WIDTH / 2 - 150, GAME_HEIGHT / 2);
    lineLeft.setDepth(1001);
    lineLeft.lineStyle(4, 0xFF4444, 0);
    lineLeft.lineBetween(0, 0, -100, 0);

    const lineRight = this.add.graphics();
    lineRight.setPosition(GAME_WIDTH / 2 + 150, GAME_HEIGHT / 2);
    lineRight.setDepth(1001);
    lineRight.lineStyle(4, 0xFF4444, 0);
    lineRight.lineBetween(0, 0, 100, 0);

    // 애니메이션 시퀀스
    this.tweens.add({
      targets: waveLabel,
      alpha: 1,
      y: GAME_HEIGHT / 2 - 60,
      duration: 300,
      ease: 'Back.easeOut',
    });

    this.tweens.add({
      targets: waveNumber,
      alpha: 1,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 400,
      delay: 100,
      ease: 'Back.easeOut',
      onComplete: () => {
        // 숫자 펄스
        this.tweens.add({
          targets: waveNumber,
          scaleX: 1.3,
          scaleY: 1.3,
          duration: 100,
          yoyo: true,
        });
      },
    });

    // 라인 애니메이션
    this.tweens.add({
      targets: [lineLeft, lineRight],
      alpha: 1,
      scaleX: 1.5,
      duration: 300,
      delay: 200,
    });

    // 파티클 효과
    for (let i = 0; i < 20; i++) {
      this.time.delayedCall(i * 30, () => {
        const particle = this.add.graphics();
        particle.setPosition(
          GAME_WIDTH / 2 + Phaser.Math.Between(-200, 200),
          GAME_HEIGHT / 2 + Phaser.Math.Between(-100, 100)
        );
        particle.setDepth(1001);
        particle.fillStyle(Phaser.Math.RND.pick([0xFF0000, 0xFF4444, 0xFFAAAA]), 0.8);
        particle.fillCircle(0, 0, Phaser.Math.Between(2, 5));

        this.tweens.add({
          targets: particle,
          y: particle.y - 50,
          alpha: 0,
          duration: 500,
          onComplete: () => particle.destroy(),
        });
      });
    }

    // 전체 페이드아웃
    this.time.delayedCall(1000, () => {
      this.tweens.add({
        targets: [waveLabel, waveNumber, lineLeft, lineRight],
        alpha: 0,
        y: '+=30',
        duration: 300,
        onComplete: () => {
          waveLabel.destroy();
          waveNumber.destroy();
          lineLeft.destroy();
          lineRight.destroy();
        },
      });
    });
  }

  private onUnitButtonClick(): void {
    const soundManager = getSoundManager();
    soundManager?.playButtonClick();

    if (this.currentGold >= ECONOMY.randomUnitCost) {
      this.gameScene.events.emit('purchaseUnit');

      // Button feedback
      this.showPurchaseEffect(this.unitButton, '유닛 소환!');
    } else {
      this.showInsufficientGold();
    }
  }

  private onCardButtonClick(): void {
    const soundManager = getSoundManager();
    soundManager?.playButtonClick();

    if (this.currentGold >= ECONOMY.randomCardCost) {
      // Card system placeholder
      this.showNotImplemented();
    } else {
      this.showInsufficientGold();
    }
  }

  private showPurchaseEffect(button: Phaser.GameObjects.Container, text: string): void {
    const effect = this.add.text(button.x, button.y - 50, text, {
      fontSize: '20px',
      color: '#00FF00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: effect,
      y: effect.y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => effect.destroy(),
    });
  }

  private showInsufficientGold(): void {
    const soundManager = getSoundManager();
    soundManager?.playInvalidPlacement();

    const warning = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '골드가 부족합니다!', {
      fontSize: '32px',
      color: '#FF0000',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: warning,
      y: warning.y - 30,
      alpha: 0,
      duration: 1000,
      onComplete: () => warning.destroy(),
    });

    // Shake gold display
    this.tweens.add({
      targets: this.goldText,
      x: this.goldText.x + 5,
      duration: 50,
      yoyo: true,
      repeat: 3,
    });
  }

  private showNotImplemented(): void {
    const text = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '준비 중입니다...', {
      fontSize: '28px',
      color: '#FFFF00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      alpha: 0,
      duration: 1500,
      onComplete: () => text.destroy(),
    });
  }

  update(): void {
    // Update gold from game scene
    const gameScene = this.gameScene as any;
    if (gameScene.gold !== undefined && gameScene.gold !== this.currentGold) {
      this.currentGold = gameScene.gold;
      this.goldText.setText(`${this.currentGold}`);
    }

    // Update unit info panel if a unit is selected
    if (this.selectedUnit && this.selectedUnit.active && this.unitInfoPanel.visible) {
      // Could update HP here if needed
    }
  }
}
