import Phaser from 'phaser';
import { MINI_BOSS_CONFIG } from '../config/GameConfig';
import { SoundManager } from '../utils/SoundManager';

export interface MiniBossConfig {
  name: string;
  health: number;
  attack: number;
  defense: number;
  exp: number;
  gold: number;
  color: number;
  size: { width: number; height: number };
  attackPatterns: string[];
}

export class MiniBoss extends Phaser.GameObjects.Container {
  public scene: Phaser.Scene;
  public config: MiniBossConfig;
  public currentHealth: number;
  public maxHealth: number;
  public isDead: boolean = false;
  public isReviving: boolean = false;

  private target: any = null;
  private sibling: MiniBoss | null = null;
  private reviveTimer: number = 0;
  private attackCooldown: number = 0;
  private currentAttack: string | null = null;
  private facingRight: boolean = true;
  private velocityX: number = 0;
  private velocityY: number = 0;
  private isOnGround: boolean = true;

  private bossBody!: Phaser.GameObjects.Graphics;
  private healthBar!: Phaser.GameObjects.Graphics;
  private healthBarBg!: Phaser.GameObjects.Graphics;
  private nameText!: Phaser.GameObjects.Text;
  private soundManager: SoundManager;

  private readonly GRAVITY = 800;
  private readonly MOVE_SPEED = 80;
  private readonly ATTACK_RANGE = 100;
  private readonly CHASE_RANGE = 400;

  constructor(scene: Phaser.Scene, x: number, y: number, configKey: 'SHADOW_TWIN_A' | 'SHADOW_TWIN_B') {
    super(scene, x, y);
    this.scene = scene;
    this.config = MINI_BOSS_CONFIG[configKey];

    this.maxHealth = this.config.health;
    this.currentHealth = this.maxHealth;
    this.soundManager = new SoundManager();

    this.createSprite();
    this.createHealthBar();

    scene.add.existing(this);
  }

  private createSprite(): void {
    this.bossBody = this.scene.add.graphics();

    // 몸체
    this.bossBody.fillStyle(this.config.color, 1);
    this.bossBody.fillRoundedRect(
      -this.config.size.width / 2,
      -this.config.size.height,
      this.config.size.width,
      this.config.size.height,
      8
    );

    // 눈
    this.bossBody.fillStyle(0xff0000, 1);
    this.bossBody.fillCircle(-12, -this.config.size.height + 20, 6);
    this.bossBody.fillCircle(12, -this.config.size.height + 20, 6);

    // 글로우
    this.bossBody.fillStyle(0xffffff, 0.3);
    this.bossBody.fillCircle(-14, -this.config.size.height + 18, 2);
    this.bossBody.fillCircle(10, -this.config.size.height + 18, 2);

    // 뿔 (Twin A)
    if (this.config.attackPatterns.includes('slash')) {
      this.bossBody.fillStyle(0x220022, 1);
      this.bossBody.fillTriangle(-25, -this.config.size.height, -20, -this.config.size.height - 25, -15, -this.config.size.height);
      this.bossBody.fillTriangle(15, -this.config.size.height, 20, -this.config.size.height - 25, 25, -this.config.size.height);
    }

    // 어깨 장식 (Twin B)
    if (this.config.attackPatterns.includes('slam')) {
      this.bossBody.fillStyle(0x330033, 1);
      this.bossBody.fillCircle(-this.config.size.width / 2 - 5, -this.config.size.height + 30, 12);
      this.bossBody.fillCircle(this.config.size.width / 2 + 5, -this.config.size.height + 30, 12);
    }

    this.add(this.bossBody);

    // 이름
    this.nameText = this.scene.add.text(0, -this.config.size.height - 40, this.config.name, {
      fontSize: '12px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.add(this.nameText);
  }

  private createHealthBar(): void {
    const barWidth = 80;
    const barHeight = 8;
    const barY = -this.config.size.height - 25;

    this.healthBarBg = this.scene.add.graphics();
    this.healthBarBg.fillStyle(0x000000, 0.7);
    this.healthBarBg.fillRect(-barWidth / 2 - 2, barY - 2, barWidth + 4, barHeight + 4);
    this.add(this.healthBarBg);

    this.healthBar = this.scene.add.graphics();
    this.add(this.healthBar);

    this.updateHealthBar();
  }

  private updateHealthBar(): void {
    const barWidth = 80;
    const barHeight = 8;
    const barY = -this.config.size.height - 25;
    const hpPercent = this.currentHealth / this.maxHealth;

    this.healthBar.clear();

    // 색상 - HP에 따라
    let color = 0x44ff44;
    if (hpPercent < 0.3) color = 0xff4444;
    else if (hpPercent < 0.6) color = 0xffaa00;

    this.healthBar.fillStyle(color, 1);
    this.healthBar.fillRect(-barWidth / 2, barY, barWidth * hpPercent, barHeight);
  }

  public setTarget(target: any): void {
    this.target = target;
  }

  public setSibling(sibling: MiniBoss): void {
    this.sibling = sibling;
  }

  public update(time: number, delta: number, groundY: number): void {
    if (this.isDead && !this.isReviving) return;

    const dt = delta / 1000;

    // 중력
    this.velocityY += this.GRAVITY * dt;

    // 이동 적용
    this.y += this.velocityY * dt;

    // 바닥 충돌
    if (this.y >= groundY) {
      this.y = groundY;
      this.velocityY = 0;
      this.isOnGround = true;
    }

    if (this.isReviving) {
      this.reviveTimer -= delta;
      if (this.reviveTimer <= 0) {
        this.completeRevive();
      }
      return;
    }

    // 쿨다운 감소
    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
    }

    // AI
    if (this.target && !this.target.isDead) {
      const dx = this.target.x - this.x;
      const dist = Math.abs(dx);

      // 방향 전환
      this.facingRight = dx > 0;
      this.bossBody.setScale(this.facingRight ? 1 : -1, 1);

      // 공격 범위 내
      if (dist < this.ATTACK_RANGE && this.attackCooldown <= 0) {
        this.performRandomAttack(time);
      }
      // 추적 범위 내
      else if (dist < this.CHASE_RANGE && dist > this.ATTACK_RANGE) {
        const dir = dx > 0 ? 1 : -1;
        this.x += dir * this.MOVE_SPEED * dt;
      }
    }
  }

  private performRandomAttack(time: number): void {
    const patterns = this.config.attackPatterns;
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];

    this.currentAttack = pattern;
    this.attackCooldown = 2000;
    this.soundManager.playBossAttack();

    switch (pattern) {
      case 'slash':
        this.attackSlash(time);
        break;
      case 'dash':
        this.attackDash(time);
        break;
      case 'projectile':
        this.attackProjectile(time);
        break;
      case 'slam':
        this.attackSlam(time);
        break;
      case 'spin':
        this.attackSpin(time);
        break;
      case 'summon':
        this.attackSummon(time);
        break;
    }
  }

  // Twin A 공격 패턴
  private attackSlash(time: number): void {
    const dir = this.facingRight ? 1 : -1;

    // 슬래시 이펙트
    const slash = this.scene.add.graphics();
    slash.setPosition(this.x + dir * 40, this.y - 40);
    slash.lineStyle(4, 0xff4444, 0.9);
    slash.beginPath();
    slash.arc(0, 0, 50, -Math.PI / 4, Math.PI / 4, false);
    slash.stroke();

    this.scene.tweens.add({
      targets: slash,
      scaleX: dir * 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 200,
      onComplete: () => slash.destroy(),
    });

    // 데미지 판정
    this.scene.time.delayedCall(100, () => {
      if (this.target) {
        const dx = Math.abs(this.target.x - this.x);
        const dy = Math.abs(this.target.y - this.y);
        if (dx < 80 && dy < 60) {
          this.scene.events.emit('miniBossAttackHit', this.config.attack);
        }
      }
    });
  }

  private attackDash(time: number): void {
    const dir = this.facingRight ? 1 : -1;
    const startX = this.x;
    const endX = this.x + dir * 200;

    // 대시 잔상
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 30, () => {
        const ghost = this.scene.add.graphics();
        ghost.setPosition(startX + (endX - startX) * (i / 5), this.y);
        ghost.fillStyle(this.config.color, 0.5);
        ghost.fillRoundedRect(-30, -80, 60, 80, 8);
        ghost.setAlpha(0.6 - i * 0.1);

        this.scene.tweens.add({
          targets: ghost,
          alpha: 0,
          duration: 200,
          onComplete: () => ghost.destroy(),
        });
      });
    }

    // 이동
    this.scene.tweens.add({
      targets: this,
      x: endX,
      duration: 150,
    });

    // 데미지 판정
    this.scene.time.delayedCall(150, () => {
      if (this.target) {
        const dx = Math.abs(this.target.x - this.x);
        const dy = Math.abs(this.target.y - this.y);
        if (dx < 50 && dy < 60) {
          this.scene.events.emit('miniBossAttackHit', this.config.attack * 0.8);
        }
      }
    });
  }

  private attackProjectile(time: number): void {
    const dir = this.facingRight ? 1 : -1;

    const projectile = this.scene.add.graphics();
    projectile.setPosition(this.x + dir * 30, this.y - 40);
    projectile.fillStyle(0x9944ff, 0.9);
    projectile.fillCircle(0, 0, 12);
    projectile.fillStyle(0xffffff, 0.5);
    projectile.fillCircle(-3, -3, 4);

    const targetX = this.target ? this.target.x : this.x + dir * 300;

    this.scene.tweens.add({
      targets: projectile,
      x: targetX,
      duration: 600,
      ease: 'Linear',
      onUpdate: () => {
        if (this.target) {
          const dx = Math.abs(projectile.x - this.target.x);
          const dy = Math.abs(projectile.y - this.target.y);
          if (dx < 25 && dy < 40) {
            this.scene.events.emit('miniBossAttackHit', this.config.attack * 0.6);
            projectile.destroy();
          }
        }
      },
      onComplete: () => projectile.destroy(),
    });
  }

  // Twin B 공격 패턴
  private attackSlam(time: number): void {
    // 점프 후 내려찍기
    this.velocityY = -400;

    this.scene.time.delayedCall(400, () => {
      // 착지 충격파
      const shockwave = this.scene.add.graphics();
      shockwave.setPosition(this.x, this.y);
      shockwave.lineStyle(3, 0xff4444, 0.8);
      shockwave.strokeCircle(0, 0, 20);

      this.scene.tweens.add({
        targets: shockwave,
        scaleX: 5,
        scaleY: 2,
        alpha: 0,
        duration: 300,
        onComplete: () => shockwave.destroy(),
      });

      // 데미지 판정
      if (this.target) {
        const dx = Math.abs(this.target.x - this.x);
        if (dx < 100) {
          this.scene.events.emit('miniBossAttackHit', this.config.attack * 1.2);
        }
      }
    });
  }

  private attackSpin(time: number): void {
    // 회전 공격
    const spinEffect = this.scene.add.graphics();
    spinEffect.setPosition(this.x, this.y - 40);
    spinEffect.lineStyle(3, this.config.color, 0.8);
    spinEffect.strokeCircle(0, 0, 50);

    this.scene.tweens.add({
      targets: this.bossBody,
      angle: 360,
      duration: 500,
      onComplete: () => {
        this.bossBody.angle = 0;
      },
    });

    this.scene.tweens.add({
      targets: spinEffect,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 500,
      onComplete: () => spinEffect.destroy(),
    });

    // 다중 데미지 판정
    for (let i = 0; i < 3; i++) {
      this.scene.time.delayedCall(i * 150, () => {
        if (this.target) {
          const dx = Math.abs(this.target.x - this.x);
          const dy = Math.abs(this.target.y - this.y);
          if (dx < 70 && dy < 60) {
            this.scene.events.emit('miniBossAttackHit', this.config.attack * 0.4);
          }
        }
      });
    }
  }

  private attackSummon(time: number): void {
    // 작은 그림자 소환
    for (let i = 0; i < 3; i++) {
      const shadow = this.scene.add.graphics();
      const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;
      const dist = 80;
      shadow.setPosition(this.x + Math.cos(angle) * dist, this.y - 30);
      shadow.fillStyle(0x220022, 0.8);
      shadow.fillCircle(0, 0, 15);
      shadow.fillStyle(0xff0000, 1);
      shadow.fillCircle(-3, -3, 3);
      shadow.fillCircle(3, -3, 3);

      // 플레이어 방향으로 날아감
      if (this.target) {
        const dx = this.target.x - shadow.x;
        const dy = this.target.y - shadow.y;
        const d = Math.sqrt(dx * dx + dy * dy);

        this.scene.tweens.add({
          targets: shadow,
          x: shadow.x + (dx / d) * 200,
          y: shadow.y + (dy / d) * 200,
          duration: 800,
          delay: i * 150,
          onUpdate: () => {
            if (this.target) {
              const ddx = Math.abs(shadow.x - this.target.x);
              const ddy = Math.abs(shadow.y - this.target.y);
              if (ddx < 20 && ddy < 40) {
                this.scene.events.emit('miniBossAttackHit', this.config.attack * 0.3);
                shadow.destroy();
              }
            }
          },
          onComplete: () => shadow.destroy(),
        });
      }
    }
  }

  public takeDamage(amount: number, knockbackDir: number, time: number): boolean {
    if (this.isDead) return false;

    const actualDamage = Math.max(1, amount - this.config.defense);
    this.currentHealth -= actualDamage;

    // 피격 이펙트
    this.scene.tweens.add({
      targets: this.bossBody,
      alpha: 0.5,
      duration: 100,
      yoyo: true,
    });

    // 데미지 텍스트
    const dmgText = this.scene.add.text(this.x, this.y - this.config.size.height - 50, `${Math.floor(actualDamage)}`, {
      fontSize: '18px',
      color: '#FFFF44',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.scene.tweens.add({
      targets: dmgText,
      y: dmgText.y - 30,
      alpha: 0,
      duration: 600,
      onComplete: () => dmgText.destroy(),
    });

    this.updateHealthBar();

    if (this.currentHealth <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  private die(): void {
    this.isDead = true;
    this.soundManager.playMonsterDeath();

    // 죽음 이펙트
    for (let i = 0; i < 10; i++) {
      const particle = this.scene.add.graphics();
      particle.setPosition(this.x, this.y - 40);
      particle.fillStyle(this.config.color, 0.8);
      particle.fillCircle(0, 0, 8);

      const angle = (i / 10) * Math.PI * 2;
      this.scene.tweens.add({
        targets: particle,
        x: this.x + Math.cos(angle) * 80,
        y: this.y - 40 + Math.sin(angle) * 60,
        alpha: 0,
        duration: 500,
        onComplete: () => particle.destroy(),
      });
    }

    // 이벤트 발생
    this.scene.events.emit('miniBossKilled', this);

    // 페이드아웃
    this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      duration: 300,
    });
  }

  public startRevive(): void {
    if (!this.isDead) return;

    this.isReviving = true;
    this.reviveTimer = 3000; // 3초간 부활 애니메이션
    this.soundManager.playReviveWarning();

    // 부활 이펙트
    const reviveGlow = this.scene.add.graphics();
    reviveGlow.setPosition(this.x, this.y - 40);
    reviveGlow.fillStyle(0xff00ff, 0.3);
    reviveGlow.fillCircle(0, 0, 50);

    this.scene.tweens.add({
      targets: reviveGlow,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0.8,
      duration: 1500,
      yoyo: true,
      repeat: 1,
      onComplete: () => reviveGlow.destroy(),
    });

    // 깜빡임
    this.scene.tweens.add({
      targets: this,
      alpha: 0.8,
      duration: 200,
      yoyo: true,
      repeat: 7,
    });
  }

  private completeRevive(): void {
    this.isDead = false;
    this.isReviving = false;
    this.currentHealth = this.maxHealth * 0.5; // 50% HP로 부활
    this.alpha = 1;
    this.updateHealthBar();

    // 부활 완료 이펙트
    const burst = this.scene.add.graphics();
    burst.setPosition(this.x, this.y - 40);
    burst.fillStyle(0xff00ff, 0.6);
    burst.fillCircle(0, 0, 30);

    this.scene.tweens.add({
      targets: burst,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 400,
      onComplete: () => burst.destroy(),
    });

    this.scene.events.emit('miniBossRevived', this);
  }

  public cancelRevive(): void {
    this.isReviving = false;
    this.reviveTimer = 0;
  }

  public getHitbox(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.x - this.config.size.width / 2,
      this.y - this.config.size.height,
      this.config.size.width,
      this.config.size.height
    );
  }
}
