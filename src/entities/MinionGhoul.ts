import Phaser from 'phaser';
import { SUMMON_CONFIG } from '../config/GameConfig';

export class MinionGhoul extends Phaser.GameObjects.Container {
  public scene: Phaser.Scene;
  private config = SUMMON_CONFIG.GHOUL;

  // 상태
  public currentHealth: number;
  public maxHealth: number;
  public attack: number;
  public isAlive: boolean = true;
  public owner: Phaser.GameObjects.Container;

  // 수명 (1분)
  private spawnTime: number;
  private lifetime: number;

  // 물리
  private velocityX: number = 0;
  private velocityY: number = 0;
  private isOnGround: boolean = false;
  private facingRight: boolean = true;

  // 전투
  private target: any = null;
  private lastAttackTime: number = 0;

  // 스프라이트
  private body_sprite!: Phaser.GameObjects.Graphics;
  private aura!: Phaser.GameObjects.Graphics;
  private healthBarBg!: Phaser.GameObjects.Graphics;
  private healthBar!: Phaser.GameObjects.Graphics;

  // 애니메이션
  private animTimer: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, owner: Phaser.GameObjects.Container) {
    super(scene, x, y);
    this.scene = scene;
    this.owner = owner;

    this.maxHealth = this.config.health;
    this.currentHealth = this.maxHealth;
    this.attack = this.config.attack;
    this.spawnTime = scene.time.now;
    this.lifetime = this.config.lifetime || 60000;

    this.createSprite();
    this.createHealthBar();
    this.createSpawnEffect();

    scene.add.existing(this);
  }

  private createSprite(): void {
    // 오라
    this.aura = this.scene.add.graphics();
    this.add(this.aura);

    // 구울 몸체
    this.body_sprite = this.scene.add.graphics();
    this.add(this.body_sprite);

    this.drawGhoul();
  }

  private drawGhoul(): void {
    this.body_sprite.clear();
    this.aura.clear();

    const bounce = Math.sin(this.animTimer * 6) * 2;
    const legOffset = Math.sin(this.animTimer * 8) * 3;

    // 어둠 오라
    this.aura.fillStyle(0x664488, 0.2 + Math.sin(this.animTimer * 4) * 0.1);
    this.aura.fillCircle(0, -20, 35);

    // 다리
    this.body_sprite.fillStyle(0x443366);
    this.body_sprite.fillRect(-12, 5, 8, 22 + legOffset * 0.5);
    this.body_sprite.fillRect(4, 5, 8, 22 - legOffset * 0.5);

    // 발
    this.body_sprite.fillStyle(0x332255);
    this.body_sprite.fillRect(-14, 25 + legOffset * 0.5, 12, 6);
    this.body_sprite.fillRect(2, 25 - legOffset * 0.5, 12, 6);

    // 몸통
    this.body_sprite.fillStyle(0x553377);
    this.body_sprite.fillRoundedRect(-18, -35 + bounce, 36, 45, 8);

    // 몸통 디테일
    this.body_sprite.fillStyle(0x442266, 0.6);
    this.body_sprite.fillRect(-15, -25 + bounce, 30, 4);
    this.body_sprite.fillRect(-15, -15 + bounce, 30, 4);

    // 팔
    const armSwing = Math.sin(this.animTimer * 5) * 6;
    // 왼팔
    this.body_sprite.fillStyle(0x553377);
    this.body_sprite.fillRoundedRect(-28, -30 + bounce + armSwing, 12, 35, 4);
    // 클로
    this.body_sprite.fillStyle(0x222222);
    this.body_sprite.fillTriangle(-28, 5 + bounce + armSwing, -25, 15 + bounce + armSwing, -22, 5 + bounce + armSwing);
    this.body_sprite.fillTriangle(-24, 5 + bounce + armSwing, -21, 15 + bounce + armSwing, -18, 5 + bounce + armSwing);

    // 오른팔
    this.body_sprite.fillStyle(0x553377);
    this.body_sprite.fillRoundedRect(16, -30 + bounce - armSwing, 12, 35, 4);
    // 클로
    this.body_sprite.fillStyle(0x222222);
    this.body_sprite.fillTriangle(18, 5 + bounce - armSwing, 21, 15 + bounce - armSwing, 24, 5 + bounce - armSwing);
    this.body_sprite.fillTriangle(22, 5 + bounce - armSwing, 25, 15 + bounce - armSwing, 28, 5 + bounce - armSwing);

    // 머리
    this.body_sprite.fillStyle(0x664488);
    this.body_sprite.fillCircle(0, -48 + bounce, 18);

    // 뿔 (작은 뿔)
    this.body_sprite.fillStyle(0x222222);
    this.body_sprite.fillTriangle(-12, -58 + bounce, -16, -72 + bounce, -8, -55 + bounce);
    this.body_sprite.fillTriangle(12, -58 + bounce, 16, -72 + bounce, 8, -55 + bounce);

    // 눈 (빛나는 효과)
    const eyeGlow = 0.7 + Math.sin(this.animTimer * 6) * 0.3;
    this.body_sprite.fillStyle(0xff4466, eyeGlow);
    this.body_sprite.fillCircle(-6, -50 + bounce, 5);
    this.body_sprite.fillCircle(6, -50 + bounce, 5);

    // 눈 코어
    this.body_sprite.fillStyle(0xffffff, 0.8);
    this.body_sprite.fillCircle(-6, -50 + bounce, 2);
    this.body_sprite.fillCircle(6, -50 + bounce, 2);

    // 입 (이빨)
    this.body_sprite.fillStyle(0x110011);
    this.body_sprite.fillRect(-8, -40 + bounce, 16, 8);

    // 이빨
    this.body_sprite.fillStyle(0xffffff);
    for (let i = 0; i < 3; i++) {
      this.body_sprite.fillTriangle(
        -6 + i * 4, -40 + bounce,
        -4 + i * 4, -36 + bounce,
        -2 + i * 4, -40 + bounce
      );
    }
  }

  private createHealthBar(): void {
    this.healthBarBg = this.scene.add.graphics();
    this.healthBarBg.fillStyle(0x000000, 0.7);
    this.healthBarBg.fillRect(-20, -75, 40, 6);
    this.add(this.healthBarBg);

    this.healthBar = this.scene.add.graphics();
    this.add(this.healthBar);
    this.updateHealthBar();
  }

  private updateHealthBar(): void {
    this.healthBar.clear();
    const percent = this.currentHealth / this.maxHealth;
    this.healthBar.fillStyle(0x8844aa);
    this.healthBar.fillRect(-19, -74, 38 * percent, 4);
  }

  private createSpawnEffect(): void {
    // 소환 이펙트 - 어둠 파티클
    for (let i = 0; i < 10; i++) {
      const particle = this.scene.add.graphics();
      const angle = (i / 10) * Math.PI * 2;
      const dist = 60;
      particle.setPosition(this.x + Math.cos(angle) * dist, this.y + Math.sin(angle) * dist);

      particle.fillStyle(0x664488, 0.8);
      particle.fillCircle(0, 0, 6);
      particle.setDepth(this.depth + 1);

      this.scene.tweens.add({
        targets: particle,
        x: this.x,
        y: this.y - 30,
        alpha: 0,
        duration: 400,
        delay: i * 25,
        onComplete: () => particle.destroy(),
      });
    }

    // 마법진
    const circle = this.scene.add.graphics();
    circle.setPosition(this.x, this.y + 20);
    circle.lineStyle(3, 0x664488, 0.8);
    circle.strokeCircle(0, 0, 30);
    circle.lineStyle(2, 0x9966cc, 0.6);
    circle.strokeCircle(0, 0, 20);
    circle.setDepth(this.depth - 1);

    this.scene.tweens.add({
      targets: circle,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 0.5,
      duration: 500,
      onComplete: () => circle.destroy(),
    });
  }

  public update(time: number, delta: number, groundY: number, enemies: any[]): void {
    if (!this.isAlive) return;

    this.animTimer += delta / 1000;

    // 수명 체크 (1분)
    if (time - this.spawnTime >= this.lifetime) {
      this.die();
      return;
    }

    // 가장 가까운 적 찾기
    this.findNearestEnemy(enemies);

    // AI 행동
    this.updateAI(time, delta);

    // 물리
    this.velocityY += 1200 * (delta / 1000);
    this.velocityY = Math.min(this.velocityY, 800);

    this.x += this.velocityX * (delta / 1000);
    this.y += this.velocityY * (delta / 1000);

    // 지면 충돌
    if (this.y >= groundY - 30) {
      this.y = groundY - 30;
      this.velocityY = 0;
      this.isOnGround = true;
    }

    // 방향 설정
    this.setScale(this.facingRight ? 1 : -1, 1);

    // 스프라이트 업데이트
    this.drawGhoul();
    this.setDepth(this.y);
  }

  private findNearestEnemy(enemies: any[]): void {
    let nearestDist = this.config.detectRange;
    let nearest = null;

    for (const enemy of enemies) {
      if (enemy.isDead) continue;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = enemy;
      }
    }

    this.target = nearest;
  }

  private updateAI(time: number, delta: number): void {
    if (this.target && !this.target.isDead) {
      // 적을 향해 이동
      const dx = this.target.x - this.x;
      this.facingRight = dx > 0;

      if (Math.abs(dx) > this.config.attackRange) {
        this.velocityX = this.facingRight ? this.config.speed : -this.config.speed;
      } else {
        this.velocityX = 0;
        // 공격
        if (time - this.lastAttackTime > 1200) {
          this.performAttack(time);
        }
      }
    } else {
      // 주인을 따라다님
      const dx = this.owner.x - this.x;
      this.facingRight = dx > 0;

      if (Math.abs(dx) > 60) {
        this.velocityX = dx > 0 ? this.config.speed * 0.7 : -this.config.speed * 0.7;
      } else {
        this.velocityX = 0;
      }
    }

    // 속도 감쇠
    this.velocityX *= 0.9;
  }

  private performAttack(time: number): void {
    this.lastAttackTime = time;

    if (!this.target) return;

    // 공격 이펙트 - 클로 공격
    const slashEffect = this.scene.add.graphics();
    slashEffect.setPosition(this.x + (this.facingRight ? 30 : -30), this.y - 15);

    // 클로 이펙트
    slashEffect.lineStyle(4, 0x8844aa, 0.9);
    slashEffect.beginPath();
    slashEffect.moveTo(-15, -15);
    slashEffect.lineTo(15, 15);
    slashEffect.stroke();
    slashEffect.beginPath();
    slashEffect.moveTo(-10, -20);
    slashEffect.lineTo(10, 10);
    slashEffect.stroke();
    slashEffect.beginPath();
    slashEffect.moveTo(-20, -10);
    slashEffect.lineTo(20, 20);
    slashEffect.stroke();

    slashEffect.setDepth(this.y + 1);

    this.scene.tweens.add({
      targets: slashEffect,
      alpha: 0,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 200,
      onComplete: () => slashEffect.destroy(),
    });

    // 데미지 적용
    const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
    if (dist <= this.config.attackRange + 30) {
      const knockbackDir = this.facingRight ? 1 : -1;
      this.target.takeDamage(this.attack, knockbackDir, time);

      // 보스에게 주는 데미지 강조 표시
      this.createDamageEffect(this.target.x, this.target.y - 40);
    }
  }

  private createDamageEffect(x: number, y: number): void {
    // 보라색 피격 이펙트
    const hit = this.scene.add.graphics();
    hit.setPosition(x, y);
    hit.fillStyle(0x8844aa, 0.9);
    hit.fillCircle(0, 0, 18);
    hit.fillStyle(0xcc66ff, 0.7);
    hit.fillCircle(0, 0, 10);
    hit.setDepth(1000);

    this.scene.tweens.add({
      targets: hit,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 200,
      onComplete: () => hit.destroy(),
    });

    // 데미지 숫자 (구울 공격임을 표시)
    const dmgText = this.scene.add.text(x, y - 10, `${this.attack}`, {
      fontSize: '20px',
      color: '#AA66FF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(1001);

    this.scene.tweens.add({
      targets: dmgText,
      y: dmgText.y - 40,
      alpha: 0,
      duration: 800,
      onComplete: () => dmgText.destroy(),
    });
  }

  public takeDamage(amount: number): void {
    this.currentHealth -= amount;
    this.updateHealthBar();

    // 피격 플래시
    this.body_sprite.setAlpha(0.5);

    this.scene.time.delayedCall(100, () => {
      if (this.isAlive) {
        this.body_sprite.setAlpha(1);
      }
    });

    // 피격 이펙트
    const hit = this.scene.add.graphics();
    hit.setPosition(this.x, this.y - 30);
    hit.fillStyle(0xff4444, 0.6);
    hit.fillCircle(0, 0, 15);
    hit.setDepth(this.y + 1);

    this.scene.tweens.add({
      targets: hit,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 150,
      onComplete: () => hit.destroy(),
    });

    if (this.currentHealth <= 0) {
      this.die();
    }
  }

  private die(): void {
    this.isAlive = false;

    // 죽음 이펙트 - 어둠 파편
    for (let i = 0; i < 10; i++) {
      const particle = this.scene.add.graphics();
      particle.setPosition(this.x, this.y - 25);

      particle.fillStyle(0x664488, 0.8);
      particle.fillCircle(0, 0, 6 + Math.random() * 4);
      particle.setDepth(this.depth);

      const angle = (i / 10) * Math.PI * 2;
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * 50,
        y: particle.y + Math.sin(angle) * 30 - 20,
        alpha: 0,
        duration: 400,
        onComplete: () => particle.destroy(),
      });
    }

    // 영혼 이펙트
    const soul = this.scene.add.graphics();
    soul.setPosition(this.x, this.y - 35);
    soul.fillStyle(0x664488, 0.6);
    soul.fillCircle(0, 0, 15);
    soul.setDepth(this.depth + 1);

    this.scene.tweens.add({
      targets: soul,
      y: soul.y - 60,
      alpha: 0,
      duration: 700,
      onComplete: () => soul.destroy(),
    });

    this.destroy();
  }

  public getHitbox(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x - 18, this.y - 65, 36, 90);
  }
}
