import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Nothing to preload in boot
  }

  create(): void {
    this.scene.start('PreloadScene');
  }
}
