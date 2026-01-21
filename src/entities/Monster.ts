import Phaser from 'phaser';
import { Player } from './Player';

export class Monster extends Phaser.Physics.Arcade.Sprite {
  public health: number = 50;
  public maxHealth: number = 50;
  public damage: number = 10;
  public speed: number = 80;
  public detectionRange: number = 300;
  public attackRange: number = 50;
  public attackCooldown: number = 1000;

  public isAttacking: boolean = false;
  private lastAttackTime: number = 0;
  private healthBar!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'monster');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // 물리 설정
    this.setCollideWorldBounds(true);
    this.setSize(48, 48);

    // 체력바 생성
    this.createHealthBar();

    // 그림자 효과
    this.createShadow();
  }

  private createHealthBar(): void {
    this.healthBar = this.scene.add.graphics();
    this.updateHealthBar();
  }

  private createShadow(): void {
    const shadow = this.scene.add.ellipse(this.x, this.y + 24, 40, 16, 0x000000, 0.3);
    shadow.setDepth(this.depth - 1);

    this.scene.events.on('update', () => {
      if (this.active) {
        shadow.setPosition(this.x, this.y + 24);
      } else {
        shadow.destroy();
      }
    });
  }

  private updateHealthBar(): void {
    this.healthBar.clear();

    const width = 50;
    const height = 6;
    const x = this.x - width / 2;
    const y = this.y - 45;
    const ratio = this.health / this.maxHealth;

    // 배경
    this.healthBar.fillStyle(0x000000, 0.7);
    this.healthBar.fillRect(x, y, width, height);

    // 체력
    this.healthBar.fillStyle(0xe74c3c, 1);
    this.healthBar.fillRect(x, y, width * ratio, height);
  }

  public update(time: number, delta: number, player: Player): void {
    if (!this.active) return;

    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    if (distance <= this.attackRange) {
      // 공격 범위 내: 공격
      this.setVelocity(0, 0);
      if (time - this.lastAttackTime >= this.attackCooldown) {
        this.attack(player);
        this.lastAttackTime = time;
      }
    } else if (distance <= this.detectionRange) {
      // 감지 범위 내: 추적
      const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
      this.setVelocity(
        Math.cos(angle) * this.speed,
        Math.sin(angle) * this.speed
      );
    } else {
      // 범위 밖: 정지 또는 배회
      this.setVelocity(0, 0);
    }

    // 체력바 위치 업데이트
    this.updateHealthBar();
  }

  public attack(player: Player): void {
    this.isAttacking = true;
    player.takeDamage(this.damage);

    // 공격 애니메이션 효과
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        this.isAttacking = false;
      },
    });
  }

  public takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);

    // 피격 효과
    this.scene.tweens.add({
      targets: this,
      tint: 0xffffff,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        this.clearTint();
      },
    });

    this.updateHealthBar();

    if (this.health <= 0) {
      this.die();
    }
  }

  private die(): void {
    // 사망 효과
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0.5,
      duration: 300,
      onComplete: () => {
        this.healthBar.destroy();
        this.destroy();
      },
    });
  }
}
