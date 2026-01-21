import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // 로딩 화면에 필요한 최소한의 에셋만 로드
  }

  create(): void {
    // 게임 설정 초기화
    this.scale.refresh();

    // PreloadScene으로 이동
    this.scene.start('PreloadScene');
  }
}
