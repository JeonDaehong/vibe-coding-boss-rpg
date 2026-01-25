import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    // Background
    this.cameras.main.setBackgroundColor(0x87CEEB);

    // Title
    this.add.text(centerX, centerY - 80, '⚔️ 메이플 어드벤처 ⚔️', {
      fontSize: '48px',
      color: '#FFD700',
      fontFamily: 'Arial',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Loading text
    const loadingText = this.add.text(centerX, centerY + 20, '로딩 중...', {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Generate textures
    this.generateTextures();
  }

  private generateTextures(): void {
    // Hit effect
    const hitGraphics = this.make.graphics({ x: 0, y: 0 });
    hitGraphics.fillStyle(0xFFFFFF, 0.8);
    hitGraphics.fillCircle(15, 15, 15);
    hitGraphics.generateTexture('hit_effect', 30, 30);
    hitGraphics.destroy();

    // Gold particle
    const goldGraphics = this.make.graphics({ x: 0, y: 0 });
    goldGraphics.fillStyle(0xFFD700);
    goldGraphics.fillCircle(8, 8, 8);
    goldGraphics.generateTexture('gold_particle', 16, 16);
    goldGraphics.destroy();

    // Death effect
    const deathGraphics = this.make.graphics({ x: 0, y: 0 });
    deathGraphics.fillStyle(0xFFFFFF, 0.6);
    deathGraphics.fillCircle(20, 20, 15);
    deathGraphics.generateTexture('death_effect', 40, 40);
    deathGraphics.destroy();
  }

  create(): void {
    console.log('PreloadScene create - starting game scenes');

    // 바로 게임 씬 시작
    this.scene.start('GameScene');
    this.scene.launch('UIScene');
  }
}
