import Phaser from 'phaser';
import { Enemy } from './Enemy';

export interface ProjectileConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  target: Enemy;
  damage: number;
  speed?: number;
  texture?: string;
}

export class Projectile extends Phaser.GameObjects.Container {
  public damage: number;
  public target: Enemy;
  public speed: number;

  private sprite: Phaser.GameObjects.Sprite;
  private trail: Phaser.GameObjects.Graphics;

  constructor(config: ProjectileConfig) {
    super(config.scene, config.x, config.y);

    this.damage = config.damage;
    this.target = config.target;
    this.speed = config.speed || 400;

    // Trail effect
    this.trail = config.scene.add.graphics();
    this.add(this.trail);

    // Sprite
    this.sprite = config.scene.add.sprite(0, 0, config.texture || 'arrow');
    this.sprite.setOrigin(0.5, 0.5);
    this.add(this.sprite);

    // Rotate towards target
    const angle = Phaser.Math.Angle.Between(this.x, this.y, config.target.x, config.target.y);
    this.sprite.setRotation(angle);

    config.scene.add.existing(this);
  }

  public update(delta: number): boolean {
    if (!this.target || !this.target.active) {
      this.destroy();
      return false;
    }

    // Move towards target
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y - 20; // Aim at center of enemy
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 15) {
      // Hit target
      this.onHit();
      return true;
    }

    // Update position
    const moveDistance = this.speed * (delta / 1000);
    this.x += (dx / distance) * moveDistance;
    this.y += (dy / distance) * moveDistance;

    // Update rotation
    const angle = Math.atan2(dy, dx);
    this.sprite.setRotation(angle);

    // Draw trail
    this.drawTrail();

    // Update depth based on y position
    this.setDepth(this.y);

    return false;
  }

  private drawTrail(): void {
    this.trail.clear();
    this.trail.fillStyle(0xFFFF00, 0.3);
    this.trail.fillCircle(-5, 0, 3);
    this.trail.fillStyle(0xFFFF00, 0.2);
    this.trail.fillCircle(-10, 0, 2);
  }

  private onHit(): void {
    if (this.target && this.target.active) {
      const killed = this.target.takeDamage(this.damage);
      if (killed) {
        // Emit kill event with gold reward
        this.scene.events.emit('enemyKilled', this.target);
        this.target.die();
      }
    }

    // Impact effect
    const impact = this.scene.add.sprite(this.x, this.y, 'hit_effect');
    impact.setScale(0.3);
    this.scene.tweens.add({
      targets: impact,
      alpha: 0,
      scale: 0.6,
      duration: 150,
      onComplete: () => impact.destroy(),
    });

    this.destroy();
  }
}
