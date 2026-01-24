import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { getSoundManager } from '../utils/SoundManager';
import { getParticleManager } from '../utils/ParticleManager';

export interface ProjectileConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  target: Enemy;
  damage: number;
  speed?: number;
  texture?: string;
  color?: number;
  projectileType?: 'arrow' | 'magic' | 'fire';
}

export class Projectile extends Phaser.GameObjects.Container {
  public damage: number;
  public target: Enemy;
  public speed: number;
  public projectileColor: number;
  public projectileType: string;

  private sprite: Phaser.GameObjects.Sprite;
  private trail: Phaser.GameObjects.Graphics;
  private glow: Phaser.GameObjects.Graphics;
  private trailParticles: Phaser.GameObjects.Graphics[] = [];
  private lastTrailTime: number = 0;

  constructor(config: ProjectileConfig) {
    super(config.scene, config.x, config.y);

    this.damage = config.damage;
    this.target = config.target;
    this.speed = config.speed || 450;
    this.projectileColor = config.color || 0xFFFF00;
    this.projectileType = config.projectileType || 'arrow';

    // Glow effect (behind)
    this.glow = config.scene.add.graphics();
    this.glow.setBlendMode(Phaser.BlendModes.ADD);
    this.add(this.glow);

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

    // 투사체 타입별 시각 효과
    this.setupProjectileVisuals();

    config.scene.add.existing(this);
  }

  private setupProjectileVisuals(): void {
    switch (this.projectileType) {
      case 'magic':
        this.projectileColor = 0x9966FF;
        this.glow.fillStyle(0x9966FF, 0.4);
        this.glow.fillCircle(0, 0, 15);
        break;
      case 'fire':
        this.projectileColor = 0xFF6600;
        this.glow.fillStyle(0xFF6600, 0.5);
        this.glow.fillCircle(0, 0, 12);
        break;
      default: // arrow
        this.glow.fillStyle(this.projectileColor, 0.3);
        this.glow.fillCircle(0, 0, 8);
    }
  }

  public update(delta: number): boolean {
    if (!this.target || !this.target.active) {
      this.cleanupTrails();
      this.destroy();
      return false;
    }

    // Move towards target
    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y - 20;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 15) {
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
    this.drawTrail(angle, delta);

    // Create particle trail
    this.createTrailParticle();

    // Update depth
    this.setDepth(this.y + 100);

    return false;
  }

  private drawTrail(angle: number, delta: number): void {
    this.trail.clear();

    // 타입별 트레일
    const trailLength = this.projectileType === 'magic' ? 25 : 20;

    for (let i = 0; i < 5; i++) {
      const offset = -5 - i * 4;
      const alpha = 0.5 - i * 0.1;
      const size = 4 - i * 0.6;

      this.trail.fillStyle(this.projectileColor, alpha);
      this.trail.fillCircle(
        Math.cos(angle + Math.PI) * -offset,
        Math.sin(angle + Math.PI) * -offset,
        size
      );
    }

    // 빛나는 코어
    this.trail.fillStyle(0xFFFFFF, 0.8);
    this.trail.fillCircle(0, 0, 3);
  }

  private createTrailParticle(): void {
    const now = Date.now();
    if (now - this.lastTrailTime < 30) return;
    this.lastTrailTime = now;

    const particle = this.scene.add.graphics();
    particle.setPosition(this.x, this.y);
    particle.setDepth(this.y - 1);
    particle.fillStyle(this.projectileColor, 0.6);
    particle.fillCircle(0, 0, Phaser.Math.Between(2, 4));

    this.trailParticles.push(particle);

    this.scene.tweens.add({
      targets: particle,
      alpha: 0,
      scaleX: 0.3,
      scaleY: 0.3,
      duration: 200,
      onComplete: () => {
        const idx = this.trailParticles.indexOf(particle);
        if (idx > -1) this.trailParticles.splice(idx, 1);
        particle.destroy();
      },
    });
  }

  private cleanupTrails(): void {
    this.trailParticles.forEach(p => p.destroy());
    this.trailParticles = [];
  }

  private onHit(): void {
    const soundManager = getSoundManager();
    soundManager?.playArrowHit();

    const particleManager = getParticleManager();

    if (this.target && this.target.active) {
      // 크리티컬 확률 (10%)
      const isCritical = Math.random() < 0.1;
      const finalDamage = isCritical ? this.damage * 2 : this.damage;

      // 데미지 숫자 표시
      particleManager?.showDamageNumber(this.target.x, this.target.y, finalDamage, isCritical);

      // 히트 이펙트
      particleManager?.showHitEffect(this.x, this.y, this.projectileColor);

      const killed = this.target.takeDamage(finalDamage);
      if (killed) {
        this.scene.events.emit('enemyKilled', this.target);
        this.target.die();
      }
    }

    // 화려한 임팩트 이펙트
    this.createImpactEffect();

    this.cleanupTrails();
    this.destroy();
  }

  private createImpactEffect(): void {
    // 메인 임팩트
    const impact = this.scene.add.graphics();
    impact.setPosition(this.x, this.y);
    impact.setDepth(this.y + 50);
    impact.fillStyle(this.projectileColor, 0.8);
    impact.fillCircle(0, 0, 10);
    impact.fillStyle(0xFFFFFF, 0.9);
    impact.fillCircle(0, 0, 5);

    this.scene.tweens.add({
      targets: impact,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 150,
      onComplete: () => impact.destroy(),
    });

    // 스파크
    for (let i = 0; i < 6; i++) {
      const spark = this.scene.add.graphics();
      spark.setPosition(this.x, this.y);
      spark.setDepth(this.y + 49);
      spark.fillStyle(this.projectileColor, 0.9);
      spark.fillCircle(0, 0, 2);

      const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
      const dist = Phaser.Math.Between(15, 30);

      this.scene.tweens.add({
        targets: spark,
        x: this.x + Math.cos(angle) * dist,
        y: this.y + Math.sin(angle) * dist,
        alpha: 0,
        duration: 200,
        onComplete: () => spark.destroy(),
      });
    }
  }
}
