import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // 로딩 바 생성
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, '로딩 중...', {
      fontSize: '20px',
      color: '#ffffff',
    });
    loadingText.setOrigin(0.5, 0.5);

    const percentText = this.add.text(width / 2, height / 2, '0%', {
      fontSize: '18px',
      color: '#ffffff',
    });
    percentText.setOrigin(0.5, 0.5);

    // 로딩 진행률 이벤트
    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x00ff00, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
      percentText.setText(`${Math.floor(value * 100)}%`);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
    });

    // 게임 에셋 로드
    this.loadAssets();
  }

  private loadAssets(): void {
    // 플레이어 placeholder (나중에 실제 스프라이트로 교체)
    this.load.image('player', this.createPlaceholderTexture('player', 0x3498db));

    // 몬스터 placeholder
    this.load.image('monster', this.createPlaceholderTexture('monster', 0xe74c3c));

    // 타일맵 placeholder
    this.load.image('tile_grass', this.createPlaceholderTexture('grass', 0x27ae60));
    this.load.image('tile_stone', this.createPlaceholderTexture('stone', 0x7f8c8d));
  }

  private createPlaceholderTexture(key: string, color: number): string {
    // 임시 텍스처를 동적으로 생성
    const graphics = this.make.graphics({ x: 0, y: 0 });
    graphics.fillStyle(color, 1);
    graphics.fillRect(0, 0, 64, 64);
    graphics.lineStyle(2, 0xffffff, 1);
    graphics.strokeRect(0, 0, 64, 64);
    graphics.generateTexture(key, 64, 64);
    graphics.destroy();

    // 이미 생성된 텍스처를 반환하므로 빈 문자열 반환
    return '';
  }

  create(): void {
    // placeholder 텍스처 직접 생성
    this.createPlaceholderGraphics();

    // GameScene 시작
    this.scene.start('GameScene');
    this.scene.start('UIScene');
  }

  private createPlaceholderGraphics(): void {
    // 플레이어 텍스처
    const playerGraphics = this.make.graphics({ x: 0, y: 0 });
    playerGraphics.fillStyle(0x3498db, 1);
    playerGraphics.fillCircle(32, 32, 28);
    playerGraphics.lineStyle(3, 0x2980b9, 1);
    playerGraphics.strokeCircle(32, 32, 28);
    playerGraphics.generateTexture('player', 64, 64);
    playerGraphics.destroy();

    // 몬스터 텍스처
    const monsterGraphics = this.make.graphics({ x: 0, y: 0 });
    monsterGraphics.fillStyle(0xe74c3c, 1);
    monsterGraphics.fillCircle(32, 32, 28);
    monsterGraphics.lineStyle(3, 0xc0392b, 1);
    monsterGraphics.strokeCircle(32, 32, 28);
    monsterGraphics.generateTexture('monster', 64, 64);
    monsterGraphics.destroy();
  }
}
