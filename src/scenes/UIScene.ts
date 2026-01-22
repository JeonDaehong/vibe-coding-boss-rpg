import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, ECONOMY } from '../config/GameConfig';
import { Unit } from '../entities/Unit';

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
    // Top panel background
    const topPanel = this.add.graphics();
    topPanel.fillStyle(0x1a1a2e, 0.9);
    topPanel.fillRoundedRect(10, 10, 300, 60, 10);
    topPanel.lineStyle(2, 0x4a4a6e);
    topPanel.strokeRoundedRect(10, 10, 300, 60, 10);

    // Gold icon
    this.goldIcon = this.add.graphics();
    this.goldIcon.setPosition(35, 40);
    this.goldIcon.fillStyle(0xFFD700);
    this.goldIcon.fillCircle(0, 0, 15);
    this.goldIcon.fillStyle(0xFFFACD, 0.8);
    this.goldIcon.fillCircle(-3, -3, 8);
    this.goldIcon.lineStyle(2, 0xDAA520);
    this.goldIcon.strokeCircle(0, 0, 15);

    // Gold text
    this.goldText = this.add.text(60, 30, `${this.currentGold}`, {
      fontSize: '28px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });

    // Gold label
    this.add.text(60, 50, 'GOLD', {
      fontSize: '12px',
      color: '#AAAAAA',
    });

    // Wave panel
    const wavePanel = this.add.graphics();
    wavePanel.fillStyle(0x1a1a2e, 0.9);
    wavePanel.fillRoundedRect(GAME_WIDTH / 2 - 80, 10, 160, 50, 10);
    wavePanel.lineStyle(2, 0x8B0000);
    wavePanel.strokeRoundedRect(GAME_WIDTH / 2 - 80, 10, 160, 50, 10);

    // Wave text
    this.waveText = this.add.text(GAME_WIDTH / 2, 35, 'WAVE 0', {
      fontSize: '24px',
      color: '#FF4444',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Skull decorations
    this.createSkullIcon(GAME_WIDTH / 2 - 65, 35);
    this.createSkullIcon(GAME_WIDTH / 2 + 65, 35);
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
    // Bottom panel background
    const bottomPanel = this.add.graphics();
    bottomPanel.fillStyle(0x1a1a2e, 0.95);
    bottomPanel.fillRoundedRect(GAME_WIDTH / 2 - 200, GAME_HEIGHT - 90, 400, 80, 15);
    bottomPanel.lineStyle(2, 0x4a4a6e);
    bottomPanel.strokeRoundedRect(GAME_WIDTH / 2 - 200, GAME_HEIGHT - 90, 400, 80, 15);

    // Decorative corners
    bottomPanel.fillStyle(0xFFD700, 0.5);
    bottomPanel.fillCircle(GAME_WIDTH / 2 - 185, GAME_HEIGHT - 75, 5);
    bottomPanel.fillCircle(GAME_WIDTH / 2 + 185, GAME_HEIGHT - 75, 5);
    bottomPanel.fillCircle(GAME_WIDTH / 2 - 185, GAME_HEIGHT - 25, 5);
    bottomPanel.fillCircle(GAME_WIDTH / 2 + 185, GAME_HEIGHT - 25, 5);

    // Unit summon button
    this.unitButton = this.createButton(
      GAME_WIDTH / 2 - 95,
      GAME_HEIGHT - 50,
      '유닛 소환',
      `${ECONOMY.randomUnitCost}G`,
      0x4a7a4e,
      () => this.onUnitButtonClick()
    );

    // Card button
    this.cardButton = this.createButton(
      GAME_WIDTH / 2 + 95,
      GAME_HEIGHT - 50,
      '카드 뽑기',
      `${ECONOMY.randomCardCost}G`,
      0x7a4a7e,
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

    // Button background
    const bg = this.add.graphics();
    bg.fillStyle(color);
    bg.fillRoundedRect(-75, -30, 150, 60, 10);
    bg.lineStyle(2, color + 0x303030);
    bg.strokeRoundedRect(-75, -30, 150, 60, 10);
    container.add(bg);

    // Shine effect
    const shine = this.add.graphics();
    shine.fillStyle(0xFFFFFF, 0.1);
    shine.fillRoundedRect(-70, -28, 140, 25, 8);
    container.add(shine);

    // Label
    const labelText = this.add.text(0, -10, label, {
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    container.add(labelText);

    // Cost
    const costText = this.add.text(0, 12, cost, {
      fontSize: '14px',
      color: '#FFD700',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(costText);

    // Make interactive
    const hitArea = this.add.rectangle(0, 0, 150, 60, 0x000000, 0);
    hitArea.setInteractive({ useHandCursor: true });
    container.add(hitArea);

    hitArea.on('pointerover', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 100,
      });
      bg.clear();
      bg.fillStyle(color + 0x202020);
      bg.fillRoundedRect(-75, -30, 150, 60, 10);
      bg.lineStyle(2, 0xFFFFFF);
      bg.strokeRoundedRect(-75, -30, 150, 60, 10);
    });

    hitArea.on('pointerout', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
      });
      bg.clear();
      bg.fillStyle(color);
      bg.fillRoundedRect(-75, -30, 150, 60, 10);
      bg.lineStyle(2, color + 0x303030);
      bg.strokeRoundedRect(-75, -30, 150, 60, 10);
    });

    hitArea.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 50,
        yoyo: true,
      });
      onClick();
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
    const announcement = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `WAVE ${wave}`, {
      fontSize: '72px',
      color: '#FF0000',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: announcement,
      alpha: 1,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 300,
      yoyo: true,
      hold: 500,
      onComplete: () => announcement.destroy(),
    });
  }

  private onUnitButtonClick(): void {
    if (this.currentGold >= ECONOMY.randomUnitCost) {
      this.gameScene.events.emit('purchaseUnit');

      // Button feedback
      this.showPurchaseEffect(this.unitButton, '유닛 소환!');
    } else {
      this.showInsufficientGold();
    }
  }

  private onCardButtonClick(): void {
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
