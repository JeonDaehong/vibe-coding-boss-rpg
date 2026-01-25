import Phaser from 'phaser';

interface MonsterConfig {
  name: string;
  health: number;
  attack: number;
  exp: number;
  gold: number;
  color: number;
  size: { width: number; height: number };
  speed: number;
}

export class Monster extends Phaser.GameObjects.Container {
  public scene: Phaser.Scene;
  public config: MonsterConfig;

  // 상태
  public currentHealth: number;
  public maxHealth: number;
  public attack: number;
  public expReward: number;
  public goldReward: number;
  public isDead: boolean = false;

  // 물리
  private velocityX: number = 0;
  private velocityY: number = 0;
  private isOnGround: boolean = false;
  private facingRight: boolean = true;

  // AI
  private patrolDir: number = 1;
  private patrolTimer: number = 0;
  private isHit: boolean = false;
  private hitTimer: number = 0;
  private attackCooldown: number = 0;
  private target: any = null;

  // 스프라이트
  private body_sprite!: Phaser.GameObjects.Graphics;
  private healthBarBg!: Phaser.GameObjects.Graphics;
  private healthBar!: Phaser.GameObjects.Graphics;

  // 히트박스
  public hitbox: { width: number; height: number };

  // 애니메이션
  private animTimer: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, config: MonsterConfig) {
    super(scene, x, y);
    this.scene = scene;
    this.config = config;

    this.maxHealth = config.health;
    this.currentHealth = this.maxHealth;
    this.attack = config.attack;
    this.expReward = config.exp;
    this.goldReward = config.gold;
    this.hitbox = { width: config.size.width, height: config.size.height };

    this.createSprite();
    this.createHealthBar();

    scene.add.existing(this);
  }

  private createSprite(): void {
    this.body_sprite = this.scene.add.graphics();
    this.add(this.body_sprite);
    this.drawMonster();
  }

  private drawMonster(): void {
    this.body_sprite.clear();

    const bounce = Math.sin(this.animTimer * 6) * 3;
    const color = this.config.color;

    // 사이버펑크 스타일 몬스터
    // 몸체
    this.body_sprite.fillStyle(this.isHit ? 0xffffff : color, this.isHit ? 0.8 : 1);
    this.body_sprite.fillRoundedRect(
      -this.hitbox.width / 2,
      -this.hitbox.height + bounce,
      this.hitbox.width,
      this.hitbox.height,
      8
    );

    // 네온 엣지
    this.body_sprite.lineStyle(2, 0x00ffff, 0.6);
    this.body_sprite.strokeRoundedRect(
      -this.hitbox.width / 2,
      -this.hitbox.height + bounce,
      this.hitbox.width,
      this.hitbox.height,
      8
    );

    // 눈 (빛나는 효과)
    const eyeGlow = 0.8 + Math.sin(this.animTimer * 8) * 0.2;
    this.body_sprite.fillStyle(0xff0044, eyeGlow);
    this.body_sprite.fillCircle(-8, -this.hitbox.height + 15 + bounce, 5);
    this.body_sprite.fillCircle(8, -this.hitbox.height + 15 + bounce, 5);

    // 눈 하이라이트
    this.body_sprite.fillStyle(0xffffff, 0.8);
    this.body_sprite.fillCircle(-9, -this.hitbox.height + 14 + bounce, 2);
    this.body_sprite.fillCircle(7, -this.hitbox.height + 14 + bounce, 2);

    // 회로 패턴
    this.body_sprite.lineStyle(1, 0x00ffff, 0.4);
    this.body_sprite.beginPath();
    this.body_sprite.moveTo(-this.hitbox.width / 2 + 5, -this.hitbox.height / 2 + bounce);
    this.body_sprite.lineTo(0, -this.hitbox.height / 2 + 10 + bounce);
    this.body_sprite.lineTo(this.hitbox.width / 2 - 5, -this.hitbox.height / 2 + bounce);
    this.body_sprite.stroke();

    // 기계적 디테일
    this.body_sprite.fillStyle(0x222222, 0.5);
    this.body_sprite.fillRect(-this.hitbox.width / 4, -8 + bounce, this.hitbox.width / 2, 4);
  }

  private createHealthBar(): void {
    this.healthBarBg = this.scene.add.graphics();
    this.healthBarBg.fillStyle(0x000000, 0.7);
    this.healthBarBg.fillRect(-20, -this.hitbox.height - 15, 40, 6);
    this.healthBarBg.setVisible(false);
    this.add(this.healthBarBg);

    this.healthBar = this.scene.add.graphics();
    this.healthBar.setVisible(false);
    this.add(this.healthBar);
    this.updateHealthBar();
  }

  private updateHealthBar(): void {
    this.healthBar.clear();
    const percent = this.currentHealth / this.maxHealth;
    this.healthBar.fillStyle(0xff4444);
    this.healthBar.fillRect(-19, -this.hitbox.height - 14, 38 * percent, 4);
  }

  public update(time: number, delta: number, summons: any[] = []): void {
    if (this.isDead) return;

    this.animTimer += delta / 1000;
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);

    // 피격 상태 해제
    if (this.isHit && time - this.hitTimer > 200) {
      this.isHit = false;
      this.body_sprite.setAlpha(1);
    }

    // 가장 가까운 소환수 찾기
    this.findNearestTarget(summons);

    // AI 행동
    this.updateAI(time, delta);

    // 소환수 공격
    if (this.target && this.attackCooldown <= 0) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
      if (dist < 60) {
        this.attackSummon(time);
      }
    }

    // 중력
    this.velocityY += 800 * (delta / 1000);
    this.velocityY = Math.min(this.velocityY, 600);

    // 위치 업데이트
    this.x += this.velocityX * (delta / 1000);
    this.y += this.velocityY * (delta / 1000);

    // 지면 충돌 (580이 기본 지면)
    const groundY = 580;
    if (this.y >= groundY - this.hitbox.height / 2) {
      this.y = groundY - this.hitbox.height / 2;
      this.velocityY = 0;
      this.isOnGround = true;
    }

    // 방향 설정
    this.setScale(this.facingRight ? 1 : -1, 1);

    // 스프라이트 업데이트
    this.drawMonster();
    this.setDepth(this.y);
  }

  private findNearestTarget(summons: any[]): void {
    let nearestDist = 150;
    let nearest = null;

    for (const summon of summons) {
      if (!summon.isAlive) continue;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, summon.x, summon.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = summon;
      }
    }

    this.target = nearest;
  }

  private attackSummon(time: number): void {
    if (!this.target || !this.target.isAlive) return;

    this.attackCooldown = 1000;

    // 공격 이펙트
    const attackEffect = this.scene.add.graphics();
    attackEffect.setPosition(this.x + (this.facingRight ? 20 : -20), this.y - this.hitbox.height / 2);
    attackEffect.fillStyle(0xff4444, 0.8);
    attackEffect.fillCircle(0, 0, 15);
    attackEffect.setDepth(this.y + 1);

    this.scene.tweens.add({
      targets: attackEffect,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 150,
      onComplete: () => attackEffect.destroy(),
    });

    // 데미지 적용
    this.target.takeDamage(this.attack);
  }

  private updateAI(time: number, delta: number): void {
    // 소환수를 발견하면 추적
    if (this.target && this.target.isAlive) {
      const dx = this.target.x - this.x;
      this.facingRight = dx > 0;

      if (Math.abs(dx) > 50) {
        this.velocityX = this.facingRight ? this.config.speed * 1.2 : -this.config.speed * 1.2;
      } else {
        this.velocityX = 0;
      }
      return;
    }

    // 순찰
    this.patrolTimer += delta;

    if (this.patrolTimer > 2000 + Math.random() * 2000) {
      this.patrolTimer = 0;
      this.patrolDir *= -1;
    }

    // 이동
    if (!this.isHit) {
      this.velocityX = this.patrolDir * this.config.speed;
      this.facingRight = this.patrolDir > 0;
    }

    // 속도 감쇠
    this.velocityX *= 0.95;
  }

  public takeDamage(amount: number, knockbackDir: number, time: number): boolean {
    if (this.isDead) return false;

    this.currentHealth -= amount;
    this.isHit = true;
    this.hitTimer = time;

    // 피격 효과
    this.body_sprite.setAlpha(0.5);
    this.healthBarBg.setVisible(true);
    this.healthBar.setVisible(true);
    this.updateHealthBar();

    // 넉백
    this.velocityX = knockbackDir * 200;
    this.velocityY = -150;
    this.isOnGround = false;

    // 데미지 텍스트
    const dmgText = this.scene.add.text(this.x, this.y - this.hitbox.height - 20, `${Math.floor(amount)}`, {
      fontSize: '18px',
      color: '#FFFF00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(1000);

    this.scene.tweens.add({
      targets: dmgText,
      y: dmgText.y - 30,
      alpha: 0,
      duration: 500,
      onComplete: () => dmgText.destroy(),
    });

    // 피격 파티클
    for (let i = 0; i < 5; i++) {
      const particle = this.scene.add.graphics();
      particle.setPosition(this.x + Phaser.Math.Between(-15, 15), this.y - this.hitbox.height / 2);
      particle.fillStyle(this.config.color, 0.8);
      particle.fillCircle(0, 0, 4);
      particle.setDepth(this.y + 1);

      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Phaser.Math.Between(-30, 30),
        y: particle.y + Phaser.Math.Between(-40, 10),
        alpha: 0,
        duration: 300,
        onComplete: () => particle.destroy(),
      });
    }

    if (this.currentHealth <= 0) {
      this.die();
    }

    return true;
  }

  private die(): void {
    this.isDead = true;

    // 죽음 이펙트 - 글리치 효과
    for (let i = 0; i < 10; i++) {
      const glitch = this.scene.add.graphics();
      glitch.setPosition(this.x + Phaser.Math.Between(-20, 20), this.y - Phaser.Math.Between(0, this.hitbox.height));
      glitch.fillStyle(this.config.color, 0.7);
      glitch.fillRect(-5, -2, 10, 4);
      glitch.setDepth(this.y + 1);

      this.scene.tweens.add({
        targets: glitch,
        x: glitch.x + Phaser.Math.Between(-40, 40),
        y: glitch.y + Phaser.Math.Between(-30, 30),
        alpha: 0,
        duration: 400,
        delay: i * 30,
        onComplete: () => glitch.destroy(),
      });
    }

    // 전기 스파크
    for (let i = 0; i < 5; i++) {
      const spark = this.scene.add.graphics();
      spark.setPosition(this.x, this.y - this.hitbox.height / 2);
      spark.lineStyle(2, 0x00ffff, 0.9);
      spark.beginPath();
      spark.moveTo(0, 0);
      spark.lineTo(Phaser.Math.Between(-20, 20), Phaser.Math.Between(-20, 20));
      spark.stroke();
      spark.setDepth(this.y + 2);

      this.scene.tweens.add({
        targets: spark,
        alpha: 0,
        duration: 200,
        delay: i * 50,
        onComplete: () => spark.destroy(),
      });
    }

    // EXP 파티클
    for (let i = 0; i < 5; i++) {
      const exp = this.scene.add.graphics();
      exp.setPosition(this.x + Phaser.Math.Between(-20, 20), this.y - Phaser.Math.Between(0, 30));
      exp.fillStyle(0xffff00, 0.9);
      exp.fillCircle(0, 0, 5);
      exp.setDepth(this.y + 1);

      this.scene.tweens.add({
        targets: exp,
        y: exp.y - 50,
        alpha: 0,
        duration: 600,
        delay: i * 50,
        onComplete: () => exp.destroy(),
      });
    }

    // 페이드 아웃
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 300,
      onComplete: () => {
        this.destroy();
      },
    });
  }

  public getHitbox(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.x - this.hitbox.width / 2,
      this.y - this.hitbox.height,
      this.hitbox.width,
      this.hitbox.height
    );
  }
}
