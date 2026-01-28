import Phaser from 'phaser';
import { CRYSTAL_TOWER_CONFIG } from '../config/GameConfig';
import { SoundManager } from '../utils/SoundManager';

export class CrystalTower extends Phaser.GameObjects.Container {
  public scene: Phaser.Scene;
  public currentHealth: number;
  public maxHealth: number;
  public isDead: boolean = false;

  private crystalBody!: Phaser.GameObjects.Graphics;
  private crystalGlow!: Phaser.GameObjects.Graphics;
  private healthBar!: Phaser.GameObjects.Graphics;
  private healthBarBg!: Phaser.GameObjects.Graphics;
  private lastProjectileTime: number = 0;
  private projectileInterval: number = 2000;
  private projectiles: Phaser.GameObjects.Graphics[] = [];
  private soundManager: SoundManager;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.scene = scene;

    this.maxHealth = CRYSTAL_TOWER_CONFIG.health;
    this.currentHealth = this.maxHealth;
    this.soundManager = new SoundManager();

    this.createSprite();
    this.createHealthBar();

    scene.add.existing(this);
  }

  private createSprite(): void {
    // 글로우 효과
    this.crystalGlow = this.scene.add.graphics();
    this.crystalGlow.fillStyle(CRYSTAL_TOWER_CONFIG.color, 0.3);
    this.crystalGlow.fillEllipse(0, -30, 80, 120);
    this.add(this.crystalGlow);

    // 수정탑 본체
    this.crystalBody = this.scene.add.graphics();

    // 받침대
    this.crystalBody.fillStyle(0x333344, 1);
    this.crystalBody.fillRect(-25, -10, 50, 15);
    this.crystalBody.fillStyle(0x222233, 1);
    this.crystalBody.fillRect(-20, 5, 40, 10);

    // 수정
    this.crystalBody.fillStyle(CRYSTAL_TOWER_CONFIG.color, 0.9);
    this.crystalBody.beginPath();
    this.crystalBody.moveTo(0, -90);
    this.crystalBody.lineTo(-20, -30);
    this.crystalBody.lineTo(-15, -10);
    this.crystalBody.lineTo(15, -10);
    this.crystalBody.lineTo(20, -30);
    this.crystalBody.closePath();
    this.crystalBody.fillPath();

    // 수정 하이라이트
    this.crystalBody.fillStyle(0xffffff, 0.4);
    this.crystalBody.beginPath();
    this.crystalBody.moveTo(-5, -80);
    this.crystalBody.lineTo(-12, -40);
    this.crystalBody.lineTo(-5, -35);
    this.crystalBody.closePath();
    this.crystalBody.fillPath();

    this.add(this.crystalBody);

    // 반짝임 애니메이션
    this.scene.tweens.add({
      targets: this.crystalGlow,
      alpha: 0.5,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createHealthBar(): void {
    const barWidth = 60;
    const barHeight = 8;
    const barY = -100;

    // 배경
    this.healthBarBg = this.scene.add.graphics();
    this.healthBarBg.fillStyle(0x000000, 0.7);
    this.healthBarBg.fillRect(-barWidth / 2 - 2, barY - 2, barWidth + 4, barHeight + 4);
    this.add(this.healthBarBg);

    // 체력바
    this.healthBar = this.scene.add.graphics();
    this.add(this.healthBar);

    this.updateHealthBar();
  }

  private updateHealthBar(): void {
    const barWidth = 60;
    const barHeight = 8;
    const barY = -100;
    const hpPercent = this.currentHealth / this.maxHealth;

    this.healthBar.clear();
    this.healthBar.fillStyle(0x44aaff, 1);
    this.healthBar.fillRect(-barWidth / 2, barY, barWidth * hpPercent, barHeight);
  }

  public update(time: number, delta: number, targetX: number, targetY: number): void {
    if (this.isDead) return;

    // 투사체 발사
    if (time - this.lastProjectileTime > this.projectileInterval) {
      this.fireProjectile(targetX, targetY);
      this.lastProjectileTime = time;
    }

    // 투사체 업데이트
    this.updateProjectiles(delta, targetX, targetY);
  }

  private fireProjectile(targetX: number, targetY: number): void {
    const projectile = this.scene.add.graphics();
    projectile.setPosition(this.x, this.y - 50);

    // 에너지 구체
    projectile.fillStyle(CRYSTAL_TOWER_CONFIG.color, 0.9);
    projectile.fillCircle(0, 0, 10);
    projectile.fillStyle(0xffffff, 0.6);
    projectile.fillCircle(-3, -3, 4);
    projectile.setDepth(1000);

    // 방향 계산
    const dx = targetX - this.x;
    const dy = targetY - (this.y - 50);
    const dist = Math.sqrt(dx * dx + dy * dy);
    (projectile as any).velX = (dx / dist) * CRYSTAL_TOWER_CONFIG.projectileSpeed;
    (projectile as any).velY = (dy / dist) * CRYSTAL_TOWER_CONFIG.projectileSpeed;
    (projectile as any).lifetime = 0;

    this.projectiles.push(projectile);
    this.soundManager.playCrystalProjectile();
  }

  private updateProjectiles(delta: number, playerX: number, playerY: number): void {
    const dt = delta / 1000;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.active) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // 이동
      p.x += (p as any).velX * dt;
      p.y += (p as any).velY * dt;
      (p as any).lifetime += delta;

      // 수명 체크 (4초)
      if ((p as any).lifetime > 4000) {
        p.destroy();
        this.projectiles.splice(i, 1);
        continue;
      }

      // 플레이어 충돌 체크
      const dx = p.x - playerX;
      const dy = p.y - playerY;
      if (Math.sqrt(dx * dx + dy * dy) < 30) {
        // 히트 이벤트 발생
        this.scene.events.emit('crystalProjectileHit', CRYSTAL_TOWER_CONFIG.projectileDamage);

        // 충돌 이펙트
        const hit = this.scene.add.graphics();
        hit.setPosition(p.x, p.y);
        hit.fillStyle(CRYSTAL_TOWER_CONFIG.color, 0.8);
        hit.fillCircle(0, 0, 20);
        this.scene.tweens.add({
          targets: hit,
          alpha: 0,
          scaleX: 2,
          scaleY: 2,
          duration: 200,
          onComplete: () => hit.destroy(),
        });

        p.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }

  public takeDamage(amount: number): void {
    if (this.isDead) return;

    this.currentHealth -= amount;

    // 피격 효과
    this.scene.tweens.add({
      targets: this.crystalBody,
      alpha: 0.5,
      duration: 100,
      yoyo: true,
    });

    // 파편 이펙트
    for (let i = 0; i < 5; i++) {
      const shard = this.scene.add.graphics();
      shard.setPosition(this.x + Phaser.Math.Between(-20, 20), this.y - 50);
      shard.fillStyle(CRYSTAL_TOWER_CONFIG.color, 0.8);
      shard.fillTriangle(-4, 0, 0, -8, 4, 0);

      this.scene.tweens.add({
        targets: shard,
        x: shard.x + Phaser.Math.Between(-40, 40),
        y: shard.y + Phaser.Math.Between(-60, -20),
        alpha: 0,
        angle: Phaser.Math.Between(-180, 180),
        duration: 400,
        onComplete: () => shard.destroy(),
      });
    }

    this.updateHealthBar();

    if (this.currentHealth <= 0) {
      this.die();
    }
  }

  private die(): void {
    this.isDead = true;
    this.soundManager.playCrystalBreak();

    // 모든 투사체 제거
    for (const p of this.projectiles) {
      p.destroy();
    }
    this.projectiles = [];

    // 파괴 이펙트
    for (let i = 0; i < 15; i++) {
      const shard = this.scene.add.graphics();
      shard.setPosition(this.x, this.y - 50);
      shard.fillStyle(CRYSTAL_TOWER_CONFIG.color, 0.9);
      const size = Phaser.Math.Between(5, 15);
      shard.fillTriangle(-size / 2, 0, 0, -size, size / 2, 0);

      const angle = (i / 15) * Math.PI * 2;
      const dist = Phaser.Math.Between(60, 120);

      this.scene.tweens.add({
        targets: shard,
        x: this.x + Math.cos(angle) * dist,
        y: this.y - 50 + Math.sin(angle) * dist,
        alpha: 0,
        angle: Phaser.Math.Between(-360, 360),
        duration: 600,
        delay: i * 30,
        onComplete: () => shard.destroy(),
      });
    }

    // 폭발 플래시
    const flash = this.scene.add.graphics();
    flash.setPosition(this.x, this.y - 50);
    flash.fillStyle(0xffffff, 0.8);
    flash.fillCircle(0, 0, 30);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 3,
      scaleY: 3,
      duration: 300,
      onComplete: () => flash.destroy(),
    });

    // 이벤트 발생
    this.scene.events.emit('crystalDestroyed');

    // 페이드아웃 후 제거
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 300,
      onComplete: () => this.destroy(),
    });
  }

  public getHitbox(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.x - 20,
      this.y - 90,
      40,
      100
    );
  }

  public destroyProjectiles(): void {
    for (const p of this.projectiles) {
      p.destroy();
    }
    this.projectiles = [];
  }
}
