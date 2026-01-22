import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/GameConfig';

export class PreloadScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBox!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    this.createLoadingScreen();
    this.generateGameAssets();
  }

  private createLoadingScreen(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // Background
    this.cameras.main.setBackgroundColor(0x1a1a2e);

    // Progress box
    this.progressBox = this.add.graphics();
    this.progressBox.fillStyle(0x222222, 0.8);
    this.progressBox.fillRoundedRect(centerX - 160, centerY - 25, 320, 50, 10);

    // Progress bar
    this.progressBar = this.add.graphics();

    // Loading text
    this.loadingText = this.add.text(centerX, centerY - 60, '로딩 중...', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    // Title
    this.add.text(centerX, centerY - 120, '🏰 랜덤 디펜스 🏰', {
      fontSize: '48px',
      color: '#FFD700',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Progress events
    this.load.on('progress', (value: number) => {
      this.progressBar.clear();
      this.progressBar.fillStyle(0x00FFFF, 1);
      this.progressBar.fillRoundedRect(centerX - 150, centerY - 15, 300 * value, 30, 5);
    });

    this.load.on('complete', () => {
      this.progressBar.destroy();
      this.progressBox.destroy();
      this.loadingText.destroy();
    });
  }

  private generateGameAssets(): void {
    // Generate all textures programmatically for the 2.5D look
    this.generateUnitTextures();
    this.generateEnemyTextures();
    this.generateBuildingTextures();
    this.generateEffectTextures();
    this.generateUITextures();
  }

  private generateUnitTextures(): void {
    // F급 활잡이 (Archer)
    const archerGraphics = this.make.graphics({ x: 0, y: 0 });
    this.drawUnit(archerGraphics, 0x8B4513, 0xDEB887, true);
    archerGraphics.generateTexture('archer_f', 40, 50);
    archerGraphics.destroy();

    // 주인공 (Hero)
    const heroGraphics = this.make.graphics({ x: 0, y: 0 });
    this.drawHero(heroGraphics);
    heroGraphics.generateTexture('hero', 50, 60);
    heroGraphics.destroy();

    // Arrow projectile
    const arrowGraphics = this.make.graphics({ x: 0, y: 0 });
    arrowGraphics.fillStyle(0x8B4513);
    arrowGraphics.fillRect(0, 2, 15, 2);
    arrowGraphics.fillStyle(0xC0C0C0);
    arrowGraphics.fillTriangle(15, 0, 15, 6, 20, 3);
    arrowGraphics.generateTexture('arrow', 20, 6);
    arrowGraphics.destroy();
  }

  private drawUnit(graphics: Phaser.GameObjects.Graphics, bodyColor: number, skinColor: number, hasBow: boolean): void {
    // Shadow
    graphics.fillStyle(0x000000, 0.3);
    graphics.fillEllipse(20, 48, 30, 10);

    // Body (2.5D style)
    graphics.fillStyle(bodyColor);
    graphics.fillRoundedRect(10, 20, 20, 25, 3);

    // Head
    graphics.fillStyle(skinColor);
    graphics.fillCircle(20, 12, 10);

    // Eyes
    graphics.fillStyle(0x000000);
    graphics.fillCircle(17, 10, 2);
    graphics.fillCircle(23, 10, 2);

    if (hasBow) {
      // Bow
      graphics.lineStyle(2, 0x654321);
      graphics.beginPath();
      graphics.arc(35, 25, 12, -1.2, 1.2);
      graphics.strokePath();

      // Bowstring
      graphics.lineStyle(1, 0xFFFFFF);
      graphics.lineBetween(32, 14, 32, 36);
    }
  }

  private drawHero(graphics: Phaser.GameObjects.Graphics): void {
    // Glow effect
    graphics.fillStyle(0xFFD700, 0.3);
    graphics.fillCircle(25, 30, 28);

    // Shadow
    graphics.fillStyle(0x000000, 0.4);
    graphics.fillEllipse(25, 57, 35, 12);

    // Cape
    graphics.fillStyle(0x8B0000);
    graphics.fillTriangle(15, 25, 35, 25, 25, 55);

    // Armor body
    graphics.fillStyle(0xC0C0C0);
    graphics.fillRoundedRect(12, 22, 26, 30, 4);

    // Gold trim
    graphics.lineStyle(2, 0xFFD700);
    graphics.strokeRoundedRect(12, 22, 26, 30, 4);

    // Head
    graphics.fillStyle(0xFFE4C4);
    graphics.fillCircle(25, 14, 12);

    // Crown
    graphics.fillStyle(0xFFD700);
    graphics.fillTriangle(15, 6, 20, 0, 20, 6);
    graphics.fillTriangle(20, 6, 25, -2, 25, 6);
    graphics.fillTriangle(25, 6, 30, 0, 30, 6);
    graphics.fillTriangle(30, 6, 35, 6, 30, 0);
    graphics.fillRect(15, 6, 20, 4);

    // Sword
    graphics.fillStyle(0xC0C0C0);
    graphics.fillRect(40, 20, 4, 30);
    graphics.fillStyle(0xFFD700);
    graphics.fillRect(38, 18, 8, 4);
  }

  private generateEnemyTextures(): void {
    // Basic Goblin
    const goblinGraphics = this.make.graphics({ x: 0, y: 0 });
    this.drawGoblin(goblinGraphics, 0x2E8B57, 1);
    goblinGraphics.generateTexture('goblin', 35, 45);
    goblinGraphics.destroy();

    // Goblin Warrior
    const goblinWarriorGraphics = this.make.graphics({ x: 0, y: 0 });
    this.drawGoblin(goblinWarriorGraphics, 0x228B22, 1.2, true);
    goblinWarriorGraphics.generateTexture('goblin_warrior', 42, 54);
    goblinWarriorGraphics.destroy();

    // Orc
    const orcGraphics = this.make.graphics({ x: 0, y: 0 });
    this.drawOrc(orcGraphics);
    orcGraphics.generateTexture('orc', 50, 60);
    orcGraphics.destroy();
  }

  private drawGoblin(graphics: Phaser.GameObjects.Graphics, color: number, scale: number, hasWeapon: boolean = false): void {
    const s = scale;

    // Shadow
    graphics.fillStyle(0x000000, 0.3);
    graphics.fillEllipse(17 * s, 42 * s, 25 * s, 8 * s);

    // Body
    graphics.fillStyle(color);
    graphics.fillRoundedRect(8 * s, 20 * s, 18 * s, 20 * s, 3);

    // Head (larger, goblin style)
    graphics.fillStyle(color);
    graphics.fillCircle(17 * s, 12 * s, 11 * s);

    // Ears (pointy)
    graphics.fillTriangle(4 * s, 8 * s, 8 * s, 5 * s, 10 * s, 15 * s);
    graphics.fillTriangle(30 * s, 8 * s, 26 * s, 5 * s, 24 * s, 15 * s);

    // Eyes (red, menacing)
    graphics.fillStyle(0xFF0000);
    graphics.fillCircle(13 * s, 10 * s, 3 * s);
    graphics.fillCircle(21 * s, 10 * s, 3 * s);

    // Pupils
    graphics.fillStyle(0x000000);
    graphics.fillCircle(14 * s, 10 * s, 1.5 * s);
    graphics.fillCircle(22 * s, 10 * s, 1.5 * s);

    // Nose
    graphics.fillStyle(0x1E6B37);
    graphics.fillCircle(17 * s, 14 * s, 2 * s);

    if (hasWeapon) {
      // Sword
      graphics.fillStyle(0x808080);
      graphics.fillRect(32 * s, 15 * s, 3 * s, 25 * s);
      graphics.fillStyle(0x654321);
      graphics.fillRect(30 * s, 23 * s, 7 * s, 4 * s);
    }
  }

  private drawOrc(graphics: Phaser.GameObjects.Graphics): void {
    // Shadow
    graphics.fillStyle(0x000000, 0.4);
    graphics.fillEllipse(25, 57, 40, 12);

    // Body (large and muscular)
    graphics.fillStyle(0x556B2F);
    graphics.fillRoundedRect(10, 25, 30, 30, 5);

    // Arms
    graphics.fillStyle(0x556B2F);
    graphics.fillEllipse(8, 35, 10, 18);
    graphics.fillEllipse(42, 35, 10, 18);

    // Head
    graphics.fillStyle(0x556B2F);
    graphics.fillCircle(25, 15, 14);

    // Lower jaw (orc style)
    graphics.fillStyle(0x4A5F2F);
    graphics.fillEllipse(25, 22, 12, 8);

    // Tusks
    graphics.fillStyle(0xFFFFF0);
    graphics.fillTriangle(18, 22, 15, 30, 21, 25);
    graphics.fillTriangle(32, 22, 35, 30, 29, 25);

    // Eyes (angry)
    graphics.fillStyle(0xFF4500);
    graphics.fillCircle(20, 12, 4);
    graphics.fillCircle(30, 12, 4);

    graphics.fillStyle(0x000000);
    graphics.fillCircle(21, 12, 2);
    graphics.fillCircle(31, 12, 2);

    // War paint
    graphics.lineStyle(2, 0x8B0000);
    graphics.lineBetween(15, 8, 20, 16);
    graphics.lineBetween(30, 8, 35, 16);

    // Axe
    graphics.fillStyle(0x808080);
    graphics.fillRect(45, 10, 4, 35);
    graphics.fillStyle(0x696969);
    graphics.fillTriangle(43, 10, 55, 20, 43, 30);
  }

  private generateBuildingTextures(): void {
    // Outer Gate
    const outerGateGraphics = this.make.graphics({ x: 0, y: 0 });
    this.drawGate(outerGateGraphics, 80, 60, 0x5C5C5C, true);
    outerGateGraphics.generateTexture('outer_gate', 80, 60);
    outerGateGraphics.destroy();

    // Inner Gate
    const innerGateGraphics = this.make.graphics({ x: 0, y: 0 });
    this.drawGate(innerGateGraphics, 60, 50, 0x4A4A4A, false);
    innerGateGraphics.generateTexture('inner_gate', 60, 50);
    innerGateGraphics.destroy();

    // Guardian Stone
    const stoneGraphics = this.make.graphics({ x: 0, y: 0 });
    this.drawGuardianStone(stoneGraphics);
    stoneGraphics.generateTexture('guardian_stone', 80, 100);
    stoneGraphics.destroy();

    // Wall segment
    const wallGraphics = this.make.graphics({ x: 0, y: 0 });
    wallGraphics.fillStyle(0x4A4A4A);
    wallGraphics.fillRect(0, 0, 40, 20);
    wallGraphics.fillStyle(0x3A3A3A);
    wallGraphics.fillRect(0, 15, 40, 8);
    // Battlements
    wallGraphics.fillStyle(0x5A5A5A);
    for (let i = 0; i < 4; i++) {
      wallGraphics.fillRect(i * 10 + 2, -5, 6, 8);
    }
    wallGraphics.generateTexture('wall_segment', 40, 28);
    wallGraphics.destroy();
  }

  private drawGate(graphics: Phaser.GameObjects.Graphics, width: number, height: number, color: number, isOuter: boolean): void {
    // Gate shadow
    graphics.fillStyle(0x000000, 0.3);
    graphics.fillEllipse(width / 2, height - 5, width * 0.8, 15);

    // Gate base (3D effect)
    graphics.fillStyle(color - 0x101010);
    graphics.fillRect(5, height - 20, width - 10, 20);

    // Gate pillars
    graphics.fillStyle(color);
    graphics.fillRect(0, 10, 15, height - 15);
    graphics.fillRect(width - 15, 10, 15, height - 15);

    // Pillar tops
    graphics.fillStyle(color + 0x202020);
    graphics.fillRect(-2, 5, 19, 10);
    graphics.fillRect(width - 17, 5, 19, 10);

    // Gate arch
    graphics.fillStyle(color + 0x101010);
    graphics.fillRect(15, 0, width - 30, 15);

    // Gate door (wooden)
    graphics.fillStyle(0x654321);
    graphics.fillRect(18, 15, width - 36, height - 35);

    // Door details
    graphics.lineStyle(2, 0x4A3520);
    graphics.lineBetween(width / 2, 15, width / 2, height - 20);
    graphics.strokeRect(20, 17, (width - 40) / 2 - 3, height - 39);
    graphics.strokeRect(width / 2 + 1, 17, (width - 40) / 2 - 3, height - 39);

    // Metal reinforcements
    graphics.fillStyle(0x808080);
    graphics.fillCircle(width / 2 - 8, height / 2, 3);
    graphics.fillCircle(width / 2 + 8, height / 2, 3);

    if (isOuter) {
      // Flags on outer gate
      graphics.fillStyle(0x8B0000);
      graphics.fillTriangle(7, 0, 7, -15, 25, -7);
      graphics.fillTriangle(width - 7, 0, width - 7, -15, width - 25, -7);
    }
  }

  private drawGuardianStone(graphics: Phaser.GameObjects.Graphics): void {
    // Glow effect (multiple layers)
    graphics.fillStyle(0x00FFFF, 0.1);
    graphics.fillCircle(40, 50, 45);
    graphics.fillStyle(0x00FFFF, 0.2);
    graphics.fillCircle(40, 50, 35);
    graphics.fillStyle(0x00FFFF, 0.3);
    graphics.fillCircle(40, 50, 25);

    // Shadow
    graphics.fillStyle(0x000000, 0.4);
    graphics.fillEllipse(40, 95, 50, 15);

    // Stone base
    graphics.fillStyle(0x2F4F4F);
    graphics.fillRoundedRect(15, 70, 50, 25, 5);

    // Main crystal
    graphics.fillStyle(0x00CED1);
    graphics.beginPath();
    graphics.moveTo(40, 10);
    graphics.lineTo(55, 35);
    graphics.lineTo(55, 65);
    graphics.lineTo(40, 80);
    graphics.lineTo(25, 65);
    graphics.lineTo(25, 35);
    graphics.closePath();
    graphics.fillPath();

    // Crystal highlights
    graphics.fillStyle(0x40E0D0, 0.6);
    graphics.beginPath();
    graphics.moveTo(40, 15);
    graphics.lineTo(30, 40);
    graphics.lineTo(30, 55);
    graphics.lineTo(40, 45);
    graphics.closePath();
    graphics.fillPath();

    // Inner glow
    graphics.fillStyle(0xFFFFFF, 0.4);
    graphics.fillCircle(40, 45, 10);

    // Runes on base
    graphics.lineStyle(2, 0x00FFFF);
    graphics.lineBetween(20, 82, 25, 77);
    graphics.lineBetween(25, 77, 30, 82);
    graphics.lineBetween(50, 82, 55, 77);
    graphics.lineBetween(55, 77, 60, 82);
  }

  private generateEffectTextures(): void {
    // Hit effect
    const hitGraphics = this.make.graphics({ x: 0, y: 0 });
    hitGraphics.fillStyle(0xFF4500, 0.8);
    hitGraphics.fillCircle(15, 15, 15);
    hitGraphics.fillStyle(0xFFFF00, 0.6);
    hitGraphics.fillCircle(15, 15, 8);
    hitGraphics.generateTexture('hit_effect', 30, 30);
    hitGraphics.destroy();

    // Gold particle
    const goldGraphics = this.make.graphics({ x: 0, y: 0 });
    goldGraphics.fillStyle(0xFFD700);
    goldGraphics.fillCircle(8, 8, 8);
    goldGraphics.fillStyle(0xFFFACD, 0.8);
    goldGraphics.fillCircle(6, 6, 4);
    goldGraphics.generateTexture('gold_particle', 16, 16);
    goldGraphics.destroy();

    // Death effect
    const deathGraphics = this.make.graphics({ x: 0, y: 0 });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x = 20 + Math.cos(angle) * 15;
      const y = 20 + Math.sin(angle) * 15;
      deathGraphics.fillStyle(0xFF0000, 0.6);
      deathGraphics.fillCircle(x, y, 5);
    }
    deathGraphics.generateTexture('death_effect', 40, 40);
    deathGraphics.destroy();
  }

  private generateUITextures(): void {
    // Button
    const buttonGraphics = this.make.graphics({ x: 0, y: 0 });
    buttonGraphics.fillStyle(0x4a4a6e);
    buttonGraphics.fillRoundedRect(0, 0, 150, 50, 10);
    buttonGraphics.lineStyle(2, 0x7a7aae);
    buttonGraphics.strokeRoundedRect(0, 0, 150, 50, 10);
    buttonGraphics.generateTexture('button', 150, 50);
    buttonGraphics.destroy();

    // Button hover
    const buttonHoverGraphics = this.make.graphics({ x: 0, y: 0 });
    buttonHoverGraphics.fillStyle(0x6a6a8e);
    buttonHoverGraphics.fillRoundedRect(0, 0, 150, 50, 10);
    buttonHoverGraphics.lineStyle(2, 0x9a9ace);
    buttonHoverGraphics.strokeRoundedRect(0, 0, 150, 50, 10);
    buttonHoverGraphics.generateTexture('button_hover', 150, 50);
    buttonHoverGraphics.destroy();

    // Panel
    const panelGraphics = this.make.graphics({ x: 0, y: 0 });
    panelGraphics.fillStyle(0x1a1a2e, 0.9);
    panelGraphics.fillRoundedRect(0, 0, 200, 100, 10);
    panelGraphics.lineStyle(2, 0x4a4a6e);
    panelGraphics.strokeRoundedRect(0, 0, 200, 100, 10);
    panelGraphics.generateTexture('panel', 200, 100);
    panelGraphics.destroy();

    // Card back (for gacha)
    const cardGraphics = this.make.graphics({ x: 0, y: 0 });
    cardGraphics.fillStyle(0x2a2a4e);
    cardGraphics.fillRoundedRect(0, 0, 80, 120, 8);
    cardGraphics.lineStyle(2, 0xFFD700);
    cardGraphics.strokeRoundedRect(0, 0, 80, 120, 8);
    // Pattern
    cardGraphics.fillStyle(0xFFD700, 0.3);
    cardGraphics.fillCircle(40, 60, 25);
    cardGraphics.lineStyle(1, 0xFFD700, 0.5);
    cardGraphics.strokeCircle(40, 60, 35);
    cardGraphics.generateTexture('card_back', 80, 120);
    cardGraphics.destroy();
  }

  create(): void {
    // Transition to game
    this.time.delayedCall(500, () => {
      this.scene.start('GameScene');
      this.scene.start('UIScene');
    });
  }
}
