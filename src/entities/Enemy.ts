import Phaser from 'phaser';
import { EnemyType, MAP_CENTER_X, MAP_CENTER_Y } from '../config/GameConfig';
import { getParticleManager } from '../utils/ParticleManager';

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
  enemyType?: EnemyType;
  special?: string;
  color?: number;
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
  public enemyType: EnemyType;
  public special: string;
  public color: number;

  private sprite: Phaser.GameObjects.Sprite;
  private healthBar: Phaser.GameObjects.Graphics;
  private shadow: Phaser.GameObjects.Ellipse;
  private typeIndicator: Phaser.GameObjects.Graphics;
  private auraEffect: Phaser.GameObjects.Graphics;
  private lastBlinkTime: number = 0;
  private blinkCooldown: number = 3000;
  private isUnderground: boolean = false;
  private surfaceIndex: number = 0;
  private lastFootstepTime: number = 0;

  constructor(config: EnemyConfig) {
    super(config.scene, config.x, config.y);

    this.enemyName = config.name;
    this.maxHealth = config.health;
    this.currentHealth = config.health;
    this.damage = config.damage;
    this.speed = config.speed;
    this.goldReward = config.goldReward;
    this.targetPath = [...config.targetPath];
    this.enemyType = config.enemyType || 'GROUND';
    this.special = config.special || '';
    this.color = config.color || 0x2E8B57;

    // 타입별 초기화
    this.initializeByType();

    // Aura effect (behind everything)
    this.auraEffect = config.scene.add.graphics();
    this.add(this.auraEffect);
    this.createAuraEffect();

    // Shadow - 더 부드럽게
    this.shadow = config.scene.add.ellipse(0, 5, 35, 12, 0x000000, 0.4);
    this.add(this.shadow);

    // Create sprite with better visuals
    this.sprite = config.scene.add.sprite(0, -5, config.texture);
    this.sprite.setOrigin(0.5, 1);
    this.sprite.setTint(this.color);
    this.add(this.sprite);

    // Type indicator
    this.typeIndicator = config.scene.add.graphics();
    this.add(this.typeIndicator);
    this.drawTypeIndicator();

    // Create health bar
    this.healthBar = config.scene.add.graphics();
    this.add(this.healthBar);
    this.updateHealthBar();

    // Animation
    this.startAnimation();

    // 스폰 이펙트
    this.showSpawnEffect();

    config.scene.add.existing(this);
  }

  private createAuraEffect(): void {
    if (this.enemyType === 'BOSS') {
      // 보스 오오라
      this.auraEffect.fillStyle(0xFF00FF, 0.15);
      this.auraEffect.fillCircle(0, -20, 50);
      this.auraEffect.fillStyle(0xFF00FF, 0.1);
      this.auraEffect.fillCircle(0, -20, 65);

      // 오오라 펄스 애니메이션
      this.scene.tweens.add({
        targets: this.auraEffect,
        scaleX: 1.2,
        scaleY: 1.2,
        alpha: 0.5,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else if (this.enemyType === 'FLYING') {
      // 비행 유닛 빛
      this.auraEffect.fillStyle(0x88FFFF, 0.1);
      this.auraEffect.fillCircle(0, -30, 25);
    } else if (this.enemyType === 'TELEPORT') {
      // 순간이동 유닛 마법진
      this.auraEffect.lineStyle(1, 0x00FFFF, 0.3);
      this.auraEffect.strokeCircle(0, 0, 25);
      this.auraEffect.strokeCircle(0, 0, 20);
    }
  }

  private showSpawnEffect(): void {
    const particleManager = getParticleManager();
    particleManager?.showSpawnEffect(this.x, this.y, this.color, true);

    // 페이드 인
    this.setAlpha(0);
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 300,
      ease: 'Power2',
    });
  }

  private initializeByType(): void {
    switch (this.enemyType) {
      case 'FLYING':
        // 공중 유닛: 직선 이동 (경로 단순화)
        this.targetPath = [
          this.targetPath[0],
          { x: MAP_CENTER_X, y: MAP_CENTER_Y },
        ];
        this.currentPathIndex = 0;
        break;

      case 'TUNNELING':
        // 땅굴 유닛: 중간까지 숨어서 이동
        this.isUnderground = true;
        this.surfaceIndex = Math.floor(this.targetPath.length * 0.5);
        break;

      case 'TELEPORT':
        this.lastBlinkTime = 0;
        break;

      case 'BOSS':
        // 보스는 느리지만 강력
        this.attackSpeed = 800;
        break;
    }
  }

  private drawTypeIndicator(): void {
    this.typeIndicator.clear();

    switch (this.enemyType) {
      case 'FLYING':
        // 날개 표시
        this.typeIndicator.fillStyle(0xFFFFFF, 0.6);
        this.typeIndicator.fillTriangle(-15, -25, -25, -35, -15, -35);
        this.typeIndicator.fillTriangle(15, -25, 25, -35, 15, -35);
        break;

      case 'TUNNELING':
        if (this.isUnderground) {
          // 땅 아래 표시
          this.typeIndicator.fillStyle(0x8B4513, 0.8);
          this.typeIndicator.fillEllipse(0, 5, 40, 15);
        }
        break;

      case 'TELEPORT':
        // 마법 오오라
        this.typeIndicator.lineStyle(2, 0x00FFFF, 0.5);
        this.typeIndicator.strokeCircle(0, -20, 20);
        break;

      case 'BOSS':
        // 왕관
        this.typeIndicator.fillStyle(0xFFD700, 1);
        this.typeIndicator.fillTriangle(-10, -50, 0, -60, 10, -50);
        this.typeIndicator.fillRect(-12, -50, 24, 8);
        break;
    }
  }

  private startAnimation(): void {
    if (this.enemyType === 'FLYING') {
      // 떠있는 애니메이션
      this.scene.tweens.add({
        targets: this.sprite,
        y: -15,
        duration: 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.shadow.setAlpha(0.2);
    } else if (this.isUnderground) {
      // 땅속 이동
      this.sprite.setAlpha(0.3);
      this.shadow.setAlpha(0);
    } else {
      // 일반 걷기
      this.scene.tweens.add({
        targets: this.sprite,
        y: -8,
        duration: 200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private updateHealthBar(): void {
    this.healthBar.clear();
    const barWidth = this.enemyType === 'BOSS' ? 60 : 35;
    const barHeight = this.enemyType === 'BOSS' ? 8 : 5;
    const x = -barWidth / 2;
    const y = -this.sprite.height - 18;

    // Background with gradient effect
    this.healthBar.fillStyle(0x000000, 0.8);
    this.healthBar.fillRoundedRect(x - 2, y - 2, barWidth + 4, barHeight + 4, 3);

    // Background bar
    this.healthBar.fillStyle(0x330000, 0.9);
    this.healthBar.fillRoundedRect(x, y, barWidth, barHeight, 2);

    // Health
    const healthPercent = this.currentHealth / this.maxHealth;
    let healthColor = 0xFF0000;
    if (this.enemyType === 'BOSS') {
      healthColor = 0xFF00FF;
    } else if (healthPercent > 0.6) {
      healthColor = 0xFF4444;
    } else if (healthPercent > 0.3) {
      healthColor = 0xFF8800;
    }

    this.healthBar.fillStyle(healthColor);
    this.healthBar.fillRoundedRect(x, y, barWidth * healthPercent, barHeight, 2);

    // Shine effect
    this.healthBar.fillStyle(0xFFFFFF, 0.3);
    this.healthBar.fillRoundedRect(x, y, barWidth * healthPercent, barHeight / 3, 1);

    // Boss special border
    if (this.enemyType === 'BOSS') {
      this.healthBar.lineStyle(2, 0xFFD700, 0.8);
      this.healthBar.strokeRoundedRect(x - 2, y - 2, barWidth + 4, barHeight + 4, 3);

      // Boss name tag
      this.healthBar.fillStyle(0x000000, 0.7);
      this.healthBar.fillRoundedRect(x - 5, y - 18, barWidth + 10, 14, 3);
      this.healthBar.lineStyle(1, 0xFFD700, 0.5);
      this.healthBar.strokeRoundedRect(x - 5, y - 18, barWidth + 10, 14, 3);
    }
  }

  public takeDamage(amount: number): boolean {
    // 땅속이면 데미지 감소
    if (this.isUnderground) {
      amount = Math.floor(amount * 0.3);
    }

    // 그림자 특수능력: 일정 확률로 회피
    if (this.special === 'phase' && Math.random() < 0.25) {
      this.showDodgeEffect();
      return false;
    }

    this.currentHealth -= amount;
    this.updateHealthBar();

    // 광전사 특수능력: 체력 낮으면 강화
    if (this.special === 'enrage' && this.currentHealth < this.maxHealth * 0.3) {
      this.speed *= 1.5;
      this.damage *= 1.5;
      this.sprite.setTint(0xFF0000);
      this.special = ''; // 한번만 발동
    }

    // Damage flash
    this.sprite.setTint(0xFFFFFF);
    this.scene.time.delayedCall(50, () => {
      if (this.active) {
        this.sprite.setTint(this.color);
        if (this.special === 'enrage') this.sprite.setTint(0xFF0000);
      }
    });

    // Hit effect
    this.showHitEffect();

    if (this.currentHealth <= 0) {
      return true;
    }
    return false;
  }

  private showHitEffect(): void {
    const hitEffect = this.scene.add.graphics();
    hitEffect.setPosition(this.x, this.y - 20);
    hitEffect.fillStyle(0xFFFFFF, 0.8);
    hitEffect.fillCircle(0, 0, 15);

    this.scene.tweens.add({
      targets: hitEffect,
      alpha: 0,
      scale: 2,
      duration: 150,
      onComplete: () => hitEffect.destroy(),
    });
  }

  private showDodgeEffect(): void {
    const dodgeText = this.scene.add.text(this.x, this.y - 40, 'MISS!', {
      fontSize: '14px',
      color: '#00FFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.scene.tweens.add({
      targets: dodgeText,
      y: dodgeText.y - 20,
      alpha: 0,
      duration: 500,
      onComplete: () => dodgeText.destroy(),
    });

    // 순간이동 이펙트
    this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
    });
  }

  public die(): void {
    const particleManager = getParticleManager();

    // 파티클 매니저로 사망 이펙트
    particleManager?.showDeathExplosion(this.x, this.y - 20, this.color, this.enemyType === 'BOSS');

    // 골드 획득 표시
    particleManager?.showGoldGain(this.x, this.y - 30, this.goldReward);

    if (this.enemyType === 'BOSS') {
      // 보스 사망 - 화면 효과
      this.scene.cameras.main.shake(500, 0.02);
      this.scene.cameras.main.flash(300, 255, 200, 100);

      // 거대한 폭발
      for (let ring = 0; ring < 3; ring++) {
        this.scene.time.delayedCall(ring * 150, () => {
          const shockwave = this.scene.add.graphics();
          shockwave.setPosition(this.x, this.y - 20);
          shockwave.setDepth(9999);
          shockwave.lineStyle(4 - ring, 0xFFD700, 0.8);
          shockwave.strokeCircle(0, 0, 20);

          this.scene.tweens.add({
            targets: shockwave,
            scaleX: 4 + ring,
            scaleY: 4 + ring,
            alpha: 0,
            duration: 500,
            onComplete: () => shockwave.destroy(),
          });
        });
      }

      // 보스 전용 골드 파티클 폭발
      for (let i = 0; i < 25; i++) {
        this.scene.time.delayedCall(i * 20, () => {
          const gold = this.scene.add.graphics();
          gold.setPosition(this.x, this.y - 20);
          gold.setDepth(9998);
          gold.fillStyle(0xFFD700, 1);
          gold.fillCircle(0, 0, Phaser.Math.Between(4, 8));
          gold.fillStyle(0xFFFFAA, 0.6);
          gold.fillCircle(-2, -2, Phaser.Math.Between(2, 4));

          const angle = Math.random() * Math.PI * 2;
          const dist = Phaser.Math.Between(50, 150);

          this.scene.tweens.add({
            targets: gold,
            x: this.x + Math.cos(angle) * dist,
            y: this.y - 20 + Math.sin(angle) * dist - 50,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => gold.destroy(),
          });
        });
      }

      // 승리 텍스트
      const victoryText = this.scene.add.text(this.x, this.y - 80, 'BOSS KILLED!', {
        fontSize: '28px',
        color: '#FFD700',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 5,
      }).setOrigin(0.5).setDepth(10000);

      this.scene.tweens.add({
        targets: victoryText,
        y: victoryText.y - 50,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 300,
        yoyo: true,
        hold: 800,
        onComplete: () => {
          this.scene.tweens.add({
            targets: victoryText,
            alpha: 0,
            duration: 300,
            onComplete: () => victoryText.destroy(),
          });
        },
      });
    } else {
      // 일반 적 사망 - 가벼운 효과
      const deathEffect = this.scene.add.graphics();
      deathEffect.setPosition(this.x, this.y - 20);
      deathEffect.setDepth(this.y + 10);
      deathEffect.fillStyle(this.color, 0.8);
      deathEffect.fillCircle(0, 0, 20);

      this.scene.tweens.add({
        targets: deathEffect,
        alpha: 0,
        scaleX: 2.5,
        scaleY: 2.5,
        duration: 300,
        onComplete: () => deathEffect.destroy(),
      });

      // 파편
      for (let i = 0; i < 8; i++) {
        const fragment = this.scene.add.graphics();
        fragment.setPosition(this.x, this.y - 20);
        fragment.setDepth(this.y + 9);
        fragment.fillStyle(this.color, 0.9);
        fragment.fillCircle(0, 0, Phaser.Math.Between(2, 5));

        const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
        const dist = Phaser.Math.Between(20, 50);

        this.scene.tweens.add({
          targets: fragment,
          x: this.x + Math.cos(angle) * dist,
          y: this.y - 20 + Math.sin(angle) * dist,
          alpha: 0,
          duration: 400,
          ease: 'Power2',
          onComplete: () => fragment.destroy(),
        });
      }
    }

    this.scene.tweens.killTweensOf(this.sprite);
    this.scene.tweens.killTweensOf(this.auraEffect);
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

      // 땅굴 유닛: 지상으로 올라오기
      if (this.enemyType === 'TUNNELING' && this.isUnderground && this.currentPathIndex >= this.surfaceIndex) {
        this.surfaceFromUnderground();
      }
      return;
    }

    // 트롤 재생 능력
    if (this.special === 'regenerate' && this.currentHealth < this.maxHealth) {
      this.currentHealth = Math.min(this.maxHealth, this.currentHealth + 0.5);
      this.updateHealthBar();

      // 재생 이펙트
      if (Math.random() < 0.05) {
        const healParticle = this.scene.add.graphics();
        healParticle.setPosition(this.x + Phaser.Math.Between(-15, 15), this.y);
        healParticle.setDepth(this.y + 5);
        healParticle.fillStyle(0x00FF00, 0.7);
        healParticle.fillCircle(0, 0, 3);

        this.scene.tweens.add({
          targets: healParticle,
          y: healParticle.y - 25,
          alpha: 0,
          duration: 500,
          onComplete: () => healParticle.destroy(),
        });
      }
    }

    const vx = (dx / distance) * this.speed * 0.016;
    const vy = (dy / distance) * this.speed * 0.016;

    this.x += vx;
    this.y += vy;

    // Face direction
    if (dx < 0) {
      this.sprite.setFlipX(true);
    } else {
      this.sprite.setFlipX(false);
    }

    // 발자국/먼지 효과
    this.createFootstepEffect();
  }

  private createFootstepEffect(): void {
    const now = Date.now();
    if (now - this.lastFootstepTime < 200) return;
    this.lastFootstepTime = now;

    if (this.isUnderground) {
      // 땅굴 유닛 - 흙 입자
      const dirt = this.scene.add.graphics();
      dirt.setPosition(this.x, this.y + 5);
      dirt.setDepth(this.y - 1);
      dirt.fillStyle(0x8B4513, 0.5);
      dirt.fillCircle(0, 0, 4);

      this.scene.tweens.add({
        targets: dirt,
        y: dirt.y - 10,
        alpha: 0,
        scaleX: 0.5,
        scaleY: 0.5,
        duration: 300,
        onComplete: () => dirt.destroy(),
      });
    } else if (this.enemyType === 'FLYING') {
      // 비행 유닛 - 깃털/바람
      if (Math.random() < 0.3) {
        const feather = this.scene.add.graphics();
        feather.setPosition(this.x, this.y - 30);
        feather.setDepth(this.y - 1);
        feather.fillStyle(0xFFFFFF, 0.4);
        feather.fillEllipse(0, 0, 6, 3);

        this.scene.tweens.add({
          targets: feather,
          y: feather.y + 40,
          x: feather.x + Phaser.Math.Between(-20, 20),
          alpha: 0,
          rotation: Math.PI,
          duration: 800,
          onComplete: () => feather.destroy(),
        });
      }
    } else if (this.enemyType !== 'TELEPORT') {
      // 지상 유닛 - 먼지
      if (Math.random() < 0.4) {
        const dust = this.scene.add.graphics();
        dust.setPosition(this.x + Phaser.Math.Between(-8, 8), this.y + 3);
        dust.setDepth(this.y - 1);
        dust.fillStyle(0x8B7355, 0.3);
        dust.fillCircle(0, 0, Phaser.Math.Between(2, 4));

        this.scene.tweens.add({
          targets: dust,
          y: dust.y - 8,
          alpha: 0,
          scaleX: 1.5,
          scaleY: 1.5,
          duration: 400,
          onComplete: () => dust.destroy(),
        });
      }
    }
  }

  private surfaceFromUnderground(): void {
    this.isUnderground = false;
    this.sprite.setAlpha(1);
    this.shadow.setAlpha(0.3);
    this.drawTypeIndicator();

    // 출현 이펙트
    const burstEffect = this.scene.add.graphics();
    burstEffect.setPosition(this.x, this.y);
    burstEffect.fillStyle(0x8B4513, 0.8);
    burstEffect.fillCircle(0, 0, 30);

    this.scene.tweens.add({
      targets: burstEffect,
      alpha: 0,
      scale: 2,
      duration: 300,
      onComplete: () => burstEffect.destroy(),
    });

    // 걷기 애니메이션 시작
    this.scene.tweens.add({
      targets: this.sprite,
      y: -8,
      duration: 200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private tryBlink(time: number): void {
    if (time - this.lastBlinkTime < this.blinkCooldown) return;
    if (Math.random() > 0.3) return; // 30% 확률

    this.lastBlinkTime = time;

    // 순간이동 이펙트
    const blinkEffect = this.scene.add.graphics();
    blinkEffect.setPosition(this.x, this.y - 20);
    blinkEffect.fillStyle(0x00FFFF, 0.8);
    blinkEffect.fillCircle(0, 0, 20);

    this.scene.tweens.add({
      targets: blinkEffect,
      alpha: 0,
      scale: 2,
      duration: 200,
      onComplete: () => blinkEffect.destroy(),
    });

    // 다음 웨이포인트로 순간이동 (1-2개 건너뜀)
    const skip = Math.floor(Math.random() * 2) + 1;
    this.currentPathIndex = Math.min(this.currentPathIndex + skip, this.targetPath.length - 1);
    const newPos = this.targetPath[this.currentPathIndex];
    this.x = newPos.x;
    this.y = newPos.y;
  }

  public hasReachedEnd(): boolean {
    return this.currentPathIndex >= this.targetPath.length;
  }

  public update(time: number): void {
    if (!this.isAttacking) {
      // 순간이동 유닛 특수 행동
      if (this.enemyType === 'TELEPORT' && this.special === 'blink') {
        this.tryBlink(time);
      }

      this.moveTowardsTarget();
    }
  }

  public setDepth(depth: number): this {
    super.setDepth(depth);
    return this;
  }
}
