import Phaser from 'phaser';

export interface EnemyConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  texture: string;
  name: string;
  health: number;
  damage: number;
  speed: number;
  goldReward: number;
  targetPath: { x: number; y: number }[];
}

export class Enemy extends Phaser.GameObjects.Container {
  public enemyName: string;
  public maxHealth: number;
  public currentHealth: number;
  public damage: number;
  public speed: number;
  public goldReward: number;
  public targetPath: { x: number; y: number }[];
  public currentPathIndex: number = 0;
  public isAttacking: boolean = false;
  public lastAttackTime: number = 0;
  public attackSpeed: number = 1000;

  private sprite: Phaser.GameObjects.Sprite;
  private healthBar: Phaser.GameObjects.Graphics;
  private shadow: Phaser.GameObjects.Ellipse;

  constructor(config: EnemyConfig) {
    super(config.scene, config.x, config.y);

    this.enemyName = config.name;
    this.maxHealth = config.health;
    this.currentHealth = config.health;
    this.damage = config.damage;
    this.speed = config.speed;
    this.goldReward = config.goldReward;
    this.targetPath = config.targetPath;

    // Shadow
    this.shadow = config.scene.add.ellipse(0, 0, 30, 10, 0x000000, 0.3);
    this.add(this.shadow);

    // Create sprite
    this.sprite = config.scene.add.sprite(0, -5, config.texture);
    this.sprite.setOrigin(0.5, 1);
    this.add(this.sprite);

    // Create health bar
    this.healthBar = config.scene.add.graphics();
    this.add(this.healthBar);
    this.updateHealthBar();

    // Walking animation
    this.startWalkingAnimation();

    config.scene.add.existing(this);
  }

  private startWalkingAnimation(): void {
    this.scene.tweens.add({
      targets: this.sprite,
      y: -8,
      duration: 200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private updateHealthBar(): void {
    this.healthBar.clear();
    const barWidth = 30;
    const barHeight = 4;
    const x = -barWidth / 2;
    const y = -this.sprite.height - 10;

    // Background
    this.healthBar.fillStyle(0x000000, 0.7);
    this.healthBar.fillRect(x - 1, y - 1, barWidth + 2, barHeight + 2);

    // Health
    const healthPercent = this.currentHealth / this.maxHealth;
    this.healthBar.fillStyle(0xFF0000);
    this.healthBar.fillRect(x, y, barWidth * healthPercent, barHeight);
  }

  public takeDamage(amount: number): boolean {
    this.currentHealth -= amount;
    this.updateHealthBar();

    // Damage flash
    this.sprite.setTint(0xFFFFFF);
    this.scene.time.delayedCall(50, () => {
      if (this.active) this.sprite.clearTint();
    });

    // Hit effect
    const hitEffect = this.scene.add.sprite(this.x, this.y - 20, 'hit_effect');
    hitEffect.setScale(0.5);
    this.scene.tweens.add({
      targets: hitEffect,
      alpha: 0,
      scale: 1,
      duration: 200,
      onComplete: () => hitEffect.destroy(),
    });

    // Knockback
    this.scene.tweens.add({
      targets: this,
      x: this.x + (Math.random() - 0.5) * 10,
      duration: 50,
      yoyo: true,
    });

    if (this.currentHealth <= 0) {
      return true;
    }
    return false;
  }

  public die(): void {
    // Death effect
    const deathEffect = this.scene.add.sprite(this.x, this.y - 20, 'death_effect');
    this.scene.tweens.add({
      targets: deathEffect,
      alpha: 0,
      scale: 2,
      duration: 400,
      onComplete: () => deathEffect.destroy(),
    });

    // Gold particles
    for (let i = 0; i < 5; i++) {
      const particle = this.scene.add.sprite(this.x, this.y - 20, 'gold_particle');
      particle.setScale(0.5);
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + (Math.random() - 0.5) * 60,
        y: particle.y - 30 - Math.random() * 30,
        alpha: 0,
        duration: 600,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }

    this.scene.tweens.killTweensOf(this.sprite);
    this.destroy();
  }

  public moveTowardsTarget(): void {
    if (this.isAttacking || this.currentPathIndex >= this.targetPath.length) return;

    const target = this.targetPath[this.currentPathIndex];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 5) {
      this.currentPathIndex++;
      return;
    }

    const vx = (dx / distance) * this.speed * 0.016; // Assuming 60fps
    const vy = (dy / distance) * this.speed * 0.016;

    this.x += vx;
    this.y += vy;

    // Face direction
    if (dx < 0) {
      this.sprite.setFlipX(true);
    } else {
      this.sprite.setFlipX(false);
    }
  }

  public hasReachedEnd(): boolean {
    return this.currentPathIndex >= this.targetPath.length;
  }

  public update(time: number): void {
    if (!this.isAttacking) {
      this.moveTowardsTarget();
    }
  }

  public setDepth(depth: number): this {
    super.setDepth(depth);
    return this;
  }
}
