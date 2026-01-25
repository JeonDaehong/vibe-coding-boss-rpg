import Phaser from 'phaser';
import { SUMMON_CONFIG } from '../config/GameConfig';

export class Ghoul extends Phaser.GameObjects.Container {
  public scene: Phaser.Scene;
  private config = SUMMON_CONFIG.GIANT_GHOUL;

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
  private isAttacking: boolean = false;

  // 스프라이트
  private body_sprite!: Phaser.GameObjects.Graphics;
  private shadow!: Phaser.GameObjects.Graphics;
  private aura!: Phaser.GameObjects.Graphics;
  private healthBarBg!: Phaser.GameObjects.Graphics;
  private healthBar!: Phaser.GameObjects.Graphics;

  // 애니메이션
  private animTimer: number = 0;
  private breathTimer: number = 0;

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
    // 그림자
    this.shadow = this.scene.add.graphics();
    this.shadow.fillStyle(0x000000, 0.4);
    this.shadow.fillEllipse(0, 60, 80, 20);
    this.add(this.shadow);

    // 오라 효과
    this.aura = this.scene.add.graphics();
    this.add(this.aura);

    // 거대 구울 몸체
    this.body_sprite = this.scene.add.graphics();
    this.add(this.body_sprite);

    this.drawGhoul();
  }

  private drawGhoul(): void {
    this.body_sprite.clear();
    this.aura.clear();

    const breath = Math.sin(this.breathTimer * 2) * 3;
    const idle = Math.sin(this.animTimer * 4) * 2;

    // 어둠의 오라
    this.aura.fillStyle(0x6633aa, 0.2 + Math.sin(this.animTimer * 3) * 0.1);
    this.aura.fillCircle(0, -40, 70 + Math.sin(this.animTimer * 2) * 5);
    this.aura.fillStyle(0x9944ff, 0.15);
    this.aura.fillCircle(0, -40, 55);

    // 다리 (굵은 다리)
    this.body_sprite.fillStyle(0x443366);
    // 왼쪽 다리
    this.body_sprite.fillRect(-30, 10, 20, 50);
    this.body_sprite.fillRect(-35, 55, 25, 10);
    // 오른쪽 다리
    this.body_sprite.fillRect(10, 10, 20, 50);
    this.body_sprite.fillRect(10, 55, 25, 10);

    // 다리 하이라이트
    this.body_sprite.fillStyle(0x554477, 0.5);
    this.body_sprite.fillRect(-28, 12, 6, 45);
    this.body_sprite.fillRect(12, 12, 6, 45);

    // 몸통
    this.body_sprite.fillStyle(0x553388);
    this.body_sprite.fillRoundedRect(-40, -60 + breath, 80, 75, 15);

    // 몸통 디테일
    this.body_sprite.fillStyle(0x442266);
    this.body_sprite.fillRect(-35, -40 + breath, 70, 8);
    this.body_sprite.fillRect(-35, -25 + breath, 70, 8);
    this.body_sprite.fillRect(-35, -10 + breath, 70, 8);

    // 몸통 하이라이트
    this.body_sprite.fillStyle(0x664499, 0.6);
    this.body_sprite.fillRect(-38, -58 + breath, 15, 70);

    // 팔
    const armSwing = Math.sin(this.animTimer * 3) * 8;
    // 왼팔
    this.body_sprite.fillStyle(0x553388);
    this.body_sprite.fillRoundedRect(-65, -50 + breath + armSwing, 30, 60, 8);
    // 왼손 (클로)
    this.body_sprite.fillStyle(0x443366);
    this.body_sprite.fillCircle(-50, 15 + breath + armSwing, 15);
    // 클로
    this.body_sprite.fillStyle(0x222222);
    for (let i = 0; i < 3; i++) {
      this.body_sprite.fillTriangle(
        -58 + i * 8, 20 + breath + armSwing,
        -55 + i * 8, 35 + breath + armSwing,
        -52 + i * 8, 20 + breath + armSwing
      );
    }

    // 오른팔
    this.body_sprite.fillStyle(0x553388);
    this.body_sprite.fillRoundedRect(35, -50 + breath - armSwing, 30, 60, 8);
    // 오른손
    this.body_sprite.fillStyle(0x443366);
    this.body_sprite.fillCircle(50, 15 + breath - armSwing, 15);
    // 클로
    this.body_sprite.fillStyle(0x222222);
    for (let i = 0; i < 3; i++) {
      this.body_sprite.fillTriangle(
        42 + i * 8, 20 + breath - armSwing,
        45 + i * 8, 35 + breath - armSwing,
        48 + i * 8, 20 + breath - armSwing
      );
    }

    // 머리
    this.body_sprite.fillStyle(0x664499);
    this.body_sprite.fillCircle(0, -80 + breath + idle, 35);

    // 머리 디테일
    this.body_sprite.fillStyle(0x553388);
    this.body_sprite.fillCircle(0, -75 + breath + idle, 30);

    // 뿔
    this.body_sprite.fillStyle(0x222222);
    // 왼쪽 뿔
    this.body_sprite.fillTriangle(-25, -100 + breath + idle, -35, -130 + breath + idle, -15, -95 + breath + idle);
    // 오른쪽 뿔
    this.body_sprite.fillTriangle(25, -100 + breath + idle, 35, -130 + breath + idle, 15, -95 + breath + idle);

    // 뿔 하이라이트
    this.body_sprite.fillStyle(0x333344, 0.6);
    this.body_sprite.fillTriangle(-27, -102 + breath + idle, -33, -125 + breath + idle, -22, -100 + breath + idle);
    this.body_sprite.fillTriangle(27, -102 + breath + idle, 33, -125 + breath + idle, 22, -100 + breath + idle);

    // 눈 (빛나는 효과)
    const eyeGlow = 0.7 + Math.sin(this.animTimer * 5) * 0.3;
    this.body_sprite.fillStyle(0xff0066, eyeGlow);
    this.body_sprite.fillCircle(-12, -82 + breath + idle, 8);
    this.body_sprite.fillCircle(12, -82 + breath + idle, 8);

    // 눈 코어
    this.body_sprite.fillStyle(0xffffff);
    this.body_sprite.fillCircle(-12, -82 + breath + idle, 4);
    this.body_sprite.fillCircle(12, -82 + breath + idle, 4);

    // 눈 하이라이트
    this.body_sprite.fillStyle(0xff88aa, 0.5);
    this.body_sprite.fillCircle(-14, -84 + breath + idle, 2);
    this.body_sprite.fillCircle(10, -84 + breath + idle, 2);

    // 입 (이빨)
    this.body_sprite.fillStyle(0x220022);
    this.body_sprite.fillRect(-15, -65 + breath + idle, 30, 12);

    // 이빨
    this.body_sprite.fillStyle(0xffffff);
    for (let i = 0; i < 5; i++) {
      // 위 이빨
      this.body_sprite.fillTriangle(
        -12 + i * 6, -65 + breath + idle,
        -9 + i * 6, -58 + breath + idle,
        -6 + i * 6, -65 + breath + idle
      );
      // 아래 이빨
      this.body_sprite.fillTriangle(
        -12 + i * 6, -53 + breath + idle,
        -9 + i * 6, -60 + breath + idle,
        -6 + i * 6, -53 + breath + idle
      );
    }
  }

  private createHealthBar(): void {
    this.healthBarBg = this.scene.add.graphics();
    this.healthBarBg.fillStyle(0x000000, 0.7);
    this.healthBarBg.fillRect(-40, -145, 80, 10);
    this.add(this.healthBarBg);

    this.healthBar = this.scene.add.graphics();
    this.add(this.healthBar);
    this.updateHealthBar();
  }

  private updateHealthBar(): void {
    this.healthBar.clear();
    const percent = this.currentHealth / this.maxHealth;

    // 보라색 체력바
    this.healthBar.fillStyle(0x9944ff);
    this.healthBar.fillRect(-38, -143, 76 * percent, 6);

    // 하이라이트
    this.healthBar.fillStyle(0xcc66ff, 0.5);
    this.healthBar.fillRect(-38, -143, 76 * percent, 2);
  }

  private createSpawnEffect(): void {
    // 거대한 마법진
    const circle = this.scene.add.graphics();
    circle.setPosition(this.x, this.y + 60);
    circle.lineStyle(4, 0x9944ff, 0.9);
    circle.strokeCircle(0, 0, 80);
    circle.lineStyle(2, 0xff44ff, 0.7);
    circle.strokeCircle(0, 0, 60);
    circle.lineStyle(2, 0x6633aa, 0.5);
    circle.strokeCircle(0, 0, 40);

    // 룬 문양
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const rune = this.scene.add.graphics();
      rune.setPosition(this.x + Math.cos(angle) * 60, this.y + 60);
      rune.fillStyle(0xff44ff, 0.8);
      rune.fillRect(-4, -4, 8, 8);
      rune.setDepth(this.depth + 1);

      this.scene.tweens.add({
        targets: rune,
        y: rune.y - 100,
        alpha: 0,
        rotation: Math.PI * 2,
        duration: 1000,
        delay: i * 50,
        onComplete: () => rune.destroy(),
      });
    }

    // 어둠 기둥
    const pillar = this.scene.add.graphics();
    pillar.setPosition(this.x, this.y);
    pillar.fillStyle(0x6633aa, 0.5);
    pillar.fillRect(-50, -200, 100, 260);
    pillar.setDepth(this.depth - 1);

    this.scene.tweens.add({
      targets: [circle, pillar],
      alpha: 0,
      duration: 800,
      onComplete: () => {
        circle.destroy();
        pillar.destroy();
      },
    });

    // 소환 사운드 대신 화면 흔들림
    this.scene.cameras.main.shake(300, 0.01);
  }

  public setTarget(target: any): void {
    this.target = target;
  }

  public update(time: number, delta: number, groundY: number, enemies: any[]): void {
    if (!this.isAlive) return;

    this.animTimer += delta / 1000;
    this.breathTimer += delta / 1000;

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
    this.velocityY += 1000 * (delta / 1000);
    this.velocityY = Math.min(this.velocityY, 600);

    this.x += this.velocityX * (delta / 1000);
    this.y += this.velocityY * (delta / 1000);

    // 지면 충돌
    if (this.y >= groundY - 65) {
      this.y = groundY - 65;
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
        if (time - this.lastAttackTime > 1500 && !this.isAttacking) {
          this.performAttack(time);
        }
      }
    } else {
      // 주인을 따라다님
      const dx = this.owner.x - this.x;
      this.facingRight = dx > 0;

      if (Math.abs(dx) > 100) {
        this.velocityX = dx > 0 ? this.config.speed * 0.5 : -this.config.speed * 0.5;
      } else {
        this.velocityX = 0;
      }
    }

    // 속도 감쇠
    this.velocityX *= 0.92;
  }

  private performAttack(time: number): void {
    this.lastAttackTime = time;
    this.isAttacking = true;

    // 강력한 내려찍기 공격
    const smashX = this.x + (this.facingRight ? 60 : -60);
    const smashY = this.y + 40;

    // 공격 이펙트 - 충격파
    const shockwave = this.scene.add.graphics();
    shockwave.setPosition(smashX, smashY);
    shockwave.lineStyle(6, 0x9944ff, 0.9);
    shockwave.strokeCircle(0, 0, 10);
    shockwave.setDepth(this.y + 2);

    this.scene.tweens.add({
      targets: shockwave,
      scaleX: 4,
      scaleY: 1.5,
      alpha: 0,
      duration: 400,
      onComplete: () => shockwave.destroy(),
    });

    // 균열 이펙트
    for (let i = 0; i < 5; i++) {
      const crack = this.scene.add.graphics();
      crack.setPosition(smashX + (i - 2) * 20, smashY);
      crack.fillStyle(0x6633aa, 0.8);
      crack.fillRect(-2, 0, 4, 30 + Math.random() * 20);
      crack.setDepth(this.y + 1);

      this.scene.tweens.add({
        targets: crack,
        alpha: 0,
        y: crack.y + 10,
        duration: 500,
        delay: i * 30,
        onComplete: () => crack.destroy(),
      });
    }

    // 범위 데미지
    const attackRadius = 100;
    const enemies = (this.scene as any).monsters || [];

    for (const enemy of enemies) {
      if (enemy.isDead) continue;
      const dist = Phaser.Math.Distance.Between(smashX, smashY, enemy.x, enemy.y);
      if (dist <= attackRadius) {
        const knockbackDir = enemy.x > smashX ? 1 : -1;
        enemy.takeDamage(this.attack, knockbackDir, time);
        this.createHitEffect(enemy.x, enemy.y - 20);
      }
    }

    // 보스도 체크
    const boss = (this.scene as any).boss;
    if (boss && !boss.isDead) {
      const dist = Phaser.Math.Distance.Between(smashX, smashY, boss.x, boss.y);
      if (dist <= attackRadius + 30) {
        const knockbackDir = boss.x > smashX ? 1 : -1;
        boss.takeDamage(this.attack, knockbackDir, time);
        this.createHitEffect(boss.x, boss.y - 40);
      }
    }

    // 화면 흔들림
    this.scene.cameras.main.shake(100, 0.005);

    this.scene.time.delayedCall(500, () => {
      this.isAttacking = false;
    });
  }

  private createHitEffect(x: number, y: number): void {
    const hit = this.scene.add.graphics();
    hit.setPosition(x, y);

    // 보라색 폭발
    hit.fillStyle(0x9944ff, 0.9);
    hit.fillCircle(0, 0, 25);
    hit.fillStyle(0xff44ff, 0.7);
    hit.fillCircle(0, 0, 15);
    hit.fillStyle(0xffffff, 0.5);
    hit.fillCircle(0, 0, 8);
    hit.setDepth(1000);

    this.scene.tweens.add({
      targets: hit,
      alpha: 0,
      scaleX: 2.5,
      scaleY: 2.5,
      duration: 250,
      onComplete: () => hit.destroy(),
    });

    // 큰 데미지 숫자 표시 (구울 공격)
    const dmgText = this.scene.add.text(x, y - 20, `${this.attack}`, {
      fontSize: '28px',
      color: '#CC66FF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(1001);

    this.scene.tweens.add({
      targets: dmgText,
      y: dmgText.y - 50,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0,
      duration: 1000,
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

    if (this.currentHealth <= 0) {
      this.die();
    }
  }

  private die(): void {
    this.isAlive = false;

    // 거대한 폭발 이펙트
    for (let i = 0; i < 15; i++) {
      const particle = this.scene.add.graphics();
      particle.setPosition(this.x, this.y - 40);
      particle.fillStyle(0x9944ff, 0.8);
      particle.fillCircle(0, 0, 10 + Math.random() * 10);
      particle.setDepth(this.depth + 1);

      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;

      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * speed,
        y: particle.y + Math.sin(angle) * speed - 30,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: 600,
        onComplete: () => particle.destroy(),
      });
    }

    // 영혼 분리 이펙트
    const soul = this.scene.add.graphics();
    soul.setPosition(this.x, this.y - 60);
    soul.fillStyle(0x6633aa, 0.7);
    soul.fillCircle(0, 0, 30);
    soul.fillStyle(0x9944ff, 0.5);
    soul.fillCircle(0, 0, 20);
    soul.setDepth(this.depth + 2);

    this.scene.tweens.add({
      targets: soul,
      y: soul.y - 100,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 2,
      duration: 1000,
      onComplete: () => soul.destroy(),
    });

    this.scene.cameras.main.shake(200, 0.008);

    this.destroy();
  }

  public getHitbox(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x - 40, this.y - 130, 80, 190);
  }
}
