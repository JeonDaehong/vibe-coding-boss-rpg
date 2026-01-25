import Phaser from 'phaser';
import { BOSS_CONFIG, GAME_WIDTH } from '../config/GameConfig';

export class TrollKing extends Phaser.GameObjects.Container {
  public scene: Phaser.Scene;
  private config = BOSS_CONFIG.TROLL_KING;

  // 상태
  public currentHealth: number;
  public maxHealth: number;
  public attack: number;
  public defense: number;
  public isDead: boolean = false;
  public isCursed: boolean = false;
  public curseTimer: number = 0;
  private curseDebuff: number = 1.0;

  // 페이즈
  private currentPhase: number = 0;
  private phaseConfig: any;

  // 물리
  private velocityX: number = 0;
  private velocityY: number = 0;
  private isOnGround: boolean = false;
  private facingRight: boolean = false;

  // 전투
  private target: any = null;
  private lastAttackTime: number = 0;
  private isAttacking: boolean = false;
  private attackPattern: number = 0;

  // 스프라이트
  private body_sprite!: Phaser.GameObjects.Graphics;
  private crown!: Phaser.GameObjects.Graphics;
  private weapon!: Phaser.GameObjects.Graphics;
  private healthBarBg!: Phaser.GameObjects.Graphics;
  private healthBar!: Phaser.GameObjects.Graphics;
  private nameText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;

  // 애니메이션
  private animTimer: number = 0;
  private hitFlash: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.scene = scene;

    this.maxHealth = this.config.health;
    this.currentHealth = this.maxHealth;
    this.attack = this.config.attack;
    this.defense = this.config.defense;
    this.phaseConfig = this.config.phases[0];

    this.createSprite();
    this.createHealthBar();
    this.createBossIntro();

    scene.add.existing(this);
  }

  private createSprite(): void {
    this.body_sprite = this.scene.add.graphics();
    this.add(this.body_sprite);

    this.crown = this.scene.add.graphics();
    this.add(this.crown);

    this.weapon = this.scene.add.graphics();
    this.add(this.weapon);

    this.drawTrollKing();
  }

  private drawTrollKing(): void {
    this.body_sprite.clear();
    this.crown.clear();
    this.weapon.clear();

    const breath = Math.sin(this.animTimer * 2) * 4;
    const idle = Math.sin(this.animTimer * 3) * 3;

    // 분노 상태면 빨간 오라
    if (this.currentPhase >= 2) {
      this.body_sprite.fillStyle(0xff4444, 0.2 + Math.sin(this.animTimer * 5) * 0.1);
      this.body_sprite.fillCircle(0, -50, 100);
    }

    // 다리
    this.body_sprite.fillStyle(this.hitFlash ? 0xffffff : 0x336633);
    this.body_sprite.fillRect(-40, 20, 30, 60);
    this.body_sprite.fillRect(10, 20, 30, 60);

    // 발
    this.body_sprite.fillStyle(this.hitFlash ? 0xffffff : 0x224422);
    this.body_sprite.fillRect(-50, 75, 45, 15);
    this.body_sprite.fillRect(5, 75, 45, 15);

    // 발톱
    this.body_sprite.fillStyle(0x111111);
    for (let i = 0; i < 3; i++) {
      this.body_sprite.fillTriangle(-45 + i * 12, 85, -40 + i * 12, 95, -35 + i * 12, 85);
      this.body_sprite.fillTriangle(10 + i * 12, 85, 15 + i * 12, 95, 20 + i * 12, 85);
    }

    // 몸통
    const bodyColor = this.hitFlash ? 0xffffff : (this.currentPhase >= 2 ? 0x558844 : 0x44aa44);
    this.body_sprite.fillStyle(bodyColor);
    this.body_sprite.fillRoundedRect(-55, -70 + breath, 110, 95, 20);

    // 배
    this.body_sprite.fillStyle(this.hitFlash ? 0xffffff : 0x66bb66);
    this.body_sprite.fillEllipse(0, -30 + breath, 70, 50);

    // 가슴 근육
    this.body_sprite.fillStyle(0x338833, 0.5);
    this.body_sprite.fillEllipse(-20, -55 + breath, 30, 25);
    this.body_sprite.fillEllipse(20, -55 + breath, 30, 25);

    // 어깨
    this.body_sprite.fillStyle(this.hitFlash ? 0xffffff : 0x44aa44);
    this.body_sprite.fillCircle(-55, -55 + breath, 25);
    this.body_sprite.fillCircle(55, -55 + breath, 25);

    // 팔
    const armSwing = this.isAttacking ? 30 : Math.sin(this.animTimer * 3) * 10;
    // 왼팔
    this.body_sprite.fillStyle(this.hitFlash ? 0xffffff : 0x44aa44);
    this.body_sprite.fillRoundedRect(-90, -60 + breath + armSwing, 35, 80, 10);
    // 오른팔 (무기 든 팔)
    this.body_sprite.fillRoundedRect(55, -60 + breath - armSwing, 35, 80, 10);

    // 손
    this.body_sprite.fillStyle(this.hitFlash ? 0xffffff : 0x338833);
    this.body_sprite.fillCircle(-72, 25 + breath + armSwing, 20);
    this.body_sprite.fillCircle(72, 25 + breath - armSwing, 20);

    // 손톱
    this.body_sprite.fillStyle(0x111111);
    for (let i = 0; i < 3; i++) {
      this.body_sprite.fillTriangle(-82 + i * 8, 35 + breath + armSwing, -78 + i * 8, 50 + breath + armSwing, -74 + i * 8, 35 + breath + armSwing);
    }

    // 머리
    this.body_sprite.fillStyle(this.hitFlash ? 0xffffff : 0x44aa44);
    this.body_sprite.fillCircle(0, -100 + breath + idle, 45);

    // 얼굴
    this.body_sprite.fillStyle(this.hitFlash ? 0xffffff : 0x55bb55);
    this.body_sprite.fillEllipse(0, -95 + breath + idle, 35, 30);

    // 눈
    const eyeColor = this.currentPhase >= 2 ? 0xff4444 : 0xff8800;
    this.body_sprite.fillStyle(this.hitFlash ? 0xffffff : 0x222222);
    this.body_sprite.fillEllipse(-15, -105 + breath + idle, 14, 10);
    this.body_sprite.fillEllipse(15, -105 + breath + idle, 14, 10);
    this.body_sprite.fillStyle(eyeColor);
    this.body_sprite.fillCircle(-15, -105 + breath + idle, 5);
    this.body_sprite.fillCircle(15, -105 + breath + idle, 5);
    // 눈 하이라이트
    this.body_sprite.fillStyle(0xffffff, 0.7);
    this.body_sprite.fillCircle(-17, -107 + breath + idle, 2);
    this.body_sprite.fillCircle(13, -107 + breath + idle, 2);

    // 코
    this.body_sprite.fillStyle(this.hitFlash ? 0xffffff : 0x338833);
    this.body_sprite.fillCircle(-5, -90 + breath + idle, 8);
    this.body_sprite.fillCircle(5, -90 + breath + idle, 8);

    // 입
    this.body_sprite.fillStyle(0x222222);
    this.body_sprite.fillRect(-20, -78 + breath + idle, 40, 12);

    // 이빨 (송곳니 강조)
    this.body_sprite.fillStyle(0xffffee);
    this.body_sprite.fillTriangle(-18, -78 + breath + idle, -12, -65 + breath + idle, -6, -78 + breath + idle);
    this.body_sprite.fillTriangle(6, -78 + breath + idle, 12, -65 + breath + idle, 18, -78 + breath + idle);
    // 작은 이빨들
    for (let i = 0; i < 3; i++) {
      this.body_sprite.fillRect(-8 + i * 6, -78 + breath + idle, 4, 6);
    }

    // 귀
    this.body_sprite.fillStyle(this.hitFlash ? 0xffffff : 0x44aa44);
    this.body_sprite.fillTriangle(-40, -110 + breath + idle, -55, -130 + breath + idle, -35, -95 + breath + idle);
    this.body_sprite.fillTriangle(40, -110 + breath + idle, 55, -130 + breath + idle, 35, -95 + breath + idle);

    // 왕관
    this.crown.fillStyle(0xffd700);
    this.crown.fillRect(-30, -155 + breath + idle, 60, 15);
    // 왕관 뾰족한 부분
    for (let i = 0; i < 5; i++) {
      this.crown.fillTriangle(-25 + i * 12, -155 + breath + idle, -19 + i * 12, -175 + breath + idle, -13 + i * 12, -155 + breath + idle);
    }
    // 보석
    this.crown.fillStyle(0xff0044);
    this.crown.fillCircle(0, -150 + breath + idle, 6);
    this.crown.fillStyle(0x44ff44);
    this.crown.fillCircle(-18, -148 + breath + idle, 4);
    this.crown.fillCircle(18, -148 + breath + idle, 4);

    // 왕관 하이라이트
    this.crown.fillStyle(0xffff88, 0.5);
    this.crown.fillRect(-28, -153 + breath + idle, 20, 4);

    // 거대한 곤봉 무기
    this.weapon.fillStyle(0x664422);
    this.weapon.fillRect(80, -30 + breath - armSwing, 20, 100);
    // 곤봉 머리
    this.weapon.fillStyle(0x554411);
    this.weapon.fillCircle(90, -50 + breath - armSwing, 35);
    // 박힌 스파이크
    this.weapon.fillStyle(0x888888);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const sx = 90 + Math.cos(angle) * 30;
      const sy = -50 + breath - armSwing + Math.sin(angle) * 30;
      this.weapon.fillTriangle(sx, sy, sx + Math.cos(angle) * 15, sy + Math.sin(angle) * 15, sx + Math.cos(angle + 0.3) * 10, sy + Math.sin(angle + 0.3) * 10);
    }

    // 저주 상태면 보라색 오라
    if (this.isCursed) {
      this.body_sprite.lineStyle(3, 0x9944ff, 0.6 + Math.sin(this.animTimer * 8) * 0.3);
      this.body_sprite.strokeCircle(0, -50, 80);
    }
  }

  private createHealthBar(): void {
    // 보스 체력바 (화면 상단 고정)
    const barWidth = 400;
    const barX = GAME_WIDTH / 2 - barWidth / 2;
    const barY = 50;

    this.healthBarBg = this.scene.add.graphics();
    this.healthBarBg.fillStyle(0x000000, 0.8);
    this.healthBarBg.fillRoundedRect(barX - 10, barY - 10, barWidth + 20, 40, 10);
    this.healthBarBg.lineStyle(3, 0x666666);
    this.healthBarBg.strokeRoundedRect(barX - 10, barY - 10, barWidth + 20, 40, 10);
    this.healthBarBg.setScrollFactor(0);
    this.healthBarBg.setDepth(1000);

    this.healthBar = this.scene.add.graphics();
    this.healthBar.setScrollFactor(0);
    this.healthBar.setDepth(1001);
    this.updateHealthBar();

    // 보스 이름
    this.nameText = this.scene.add.text(GAME_WIDTH / 2, barY - 25, this.config.name, {
      fontSize: '24px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);

    // 페이즈 표시
    this.phaseText = this.scene.add.text(GAME_WIDTH / 2 + 180, barY + 10, 'Phase 1', {
      fontSize: '14px',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);
  }

  private updateHealthBar(): void {
    this.healthBar.clear();

    const barWidth = 400;
    const barX = GAME_WIDTH / 2 - barWidth / 2;
    const barY = 50;
    const percent = this.currentHealth / this.maxHealth;

    // 페이즈에 따른 색상
    let color = 0x44ff44;
    if (this.currentPhase === 1) color = 0xffaa00;
    if (this.currentPhase === 2) color = 0xff4444;

    // 체력바
    this.healthBar.fillStyle(color);
    this.healthBar.fillRoundedRect(barX, barY, barWidth * percent, 20, 5);

    // 하이라이트
    this.healthBar.fillStyle(0xffffff, 0.3);
    this.healthBar.fillRoundedRect(barX, barY, barWidth * percent, 8, { tl: 5, tr: 5, bl: 0, br: 0 });

    // 페이즈 구분선
    for (let i = 1; i < 3; i++) {
      const lineX = barX + barWidth * (this.config.phases[i].healthPercent);
      this.healthBar.lineStyle(2, 0xffffff, 0.5);
      this.healthBar.beginPath();
      this.healthBar.moveTo(lineX, barY);
      this.healthBar.lineTo(lineX, barY + 20);
      this.healthBar.stroke();
    }
  }

  private createBossIntro(): void {
    // 보스 등장 연출
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, GAME_WIDTH, 720);
    overlay.setScrollFactor(0);
    overlay.setDepth(999);

    const bossName = this.scene.add.text(GAME_WIDTH / 2, 300, this.config.name, {
      fontSize: '64px',
      color: '#FF4444',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setAlpha(0);

    const subText = this.scene.add.text(GAME_WIDTH / 2, 360, '- 1스테이지 보스 -', {
      fontSize: '28px',
      color: '#FFAA00',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setAlpha(0);

    this.scene.tweens.add({
      targets: bossName,
      alpha: 1,
      duration: 500,
    });

    this.scene.tweens.add({
      targets: subText,
      alpha: 1,
      duration: 500,
      delay: 300,
    });

    this.scene.time.delayedCall(2000, () => {
      this.scene.tweens.add({
        targets: [overlay, bossName, subText],
        alpha: 0,
        duration: 500,
        onComplete: () => {
          overlay.destroy();
          bossName.destroy();
          subText.destroy();
        },
      });
    });

    this.scene.cameras.main.shake(500, 0.02);
  }

  public setTarget(target: any): void {
    this.target = target;
  }

  public applyCurse(duration: number, debuffAmount: number): void {
    this.isCursed = true;
    this.curseDebuff = 1 - debuffAmount;
    this.curseTimer = duration;
  }

  public update(time: number, delta: number, groundY: number, summons: any[] = []): void {
    if (this.isDead) return;

    this.animTimer += delta / 1000;

    // 저주 타이머
    if (this.isCursed) {
      this.curseTimer -= delta;
      if (this.curseTimer <= 0) {
        this.isCursed = false;
        this.curseDebuff = 1.0;
      }
    }

    // 소환수 공격 (근처에 있으면)
    this.attackNearbySummons(time, summons);

    // 페이즈 체크
    this.checkPhase();

    // AI 행동
    this.updateAI(time, delta);

    // 물리
    this.velocityY += 1200 * (delta / 1000);
    this.velocityY = Math.min(this.velocityY, 800);

    this.x += this.velocityX * (delta / 1000);
    this.y += this.velocityY * (delta / 1000);

    // 지면 충돌
    if (this.y >= groundY - 90) {
      this.y = groundY - 90;
      this.velocityY = 0;
      this.isOnGround = true;
    }

    // 피격 플래시 해제
    if (this.hitFlash) {
      this.hitFlash = false;
    }

    // 방향 설정
    this.setScale(this.facingRight ? 1 : -1, 1);

    // 스프라이트 업데이트
    this.drawTrollKing();
    this.setDepth(this.y);
  }

  private summonAttackCooldown: number = 0;

  private attackNearbySummons(time: number, summons: any[]): void {
    this.summonAttackCooldown = Math.max(0, this.summonAttackCooldown - 16);
    if (this.summonAttackCooldown > 0) return;

    for (const summon of summons) {
      if (!summon.isAlive) continue;

      const dist = Phaser.Math.Distance.Between(this.x, this.y, summon.x, summon.y);
      if (dist < 120) {
        // 소환수 공격
        summon.takeDamage(this.attack * 0.5 * this.curseDebuff);
        this.summonAttackCooldown = 1500;

        // 공격 이펙트
        const attackEffect = this.scene.add.graphics();
        attackEffect.setPosition(summon.x, summon.y - 30);
        attackEffect.fillStyle(0x44aa44, 0.8);
        attackEffect.fillCircle(0, 0, 25);
        attackEffect.setDepth(summon.y + 1);

        this.scene.tweens.add({
          targets: attackEffect,
          alpha: 0,
          scaleX: 1.5,
          scaleY: 1.5,
          duration: 200,
          onComplete: () => attackEffect.destroy(),
        });

        break;
      }
    }
  }

  private checkPhase(): void {
    const healthPercent = this.currentHealth / this.maxHealth;

    for (let i = this.config.phases.length - 1; i >= 0; i--) {
      if (healthPercent <= this.config.phases[i].healthPercent) {
        if (this.currentPhase !== i) {
          this.currentPhase = i;
          this.phaseConfig = this.config.phases[i];
          this.onPhaseChange(i);
        }
        break;
      }
    }
  }

  private onPhaseChange(phase: number): void {
    this.phaseText.setText(`Phase ${phase + 1}`);

    if (phase === 1) {
      this.phaseText.setColor('#FFAA00');
      this.createPhaseChangeEffect('분노');
    } else if (phase === 2) {
      this.phaseText.setColor('#FF4444');
      this.createPhaseChangeEffect('광폭화!');
    }
  }

  private createPhaseChangeEffect(text: string): void {
    // 분노 이펙트
    const phaseAlert = this.scene.add.text(GAME_WIDTH / 2, 200, text, {
      fontSize: '48px',
      color: '#FF4444',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1100);

    this.scene.tweens.add({
      targets: phaseAlert,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0,
      duration: 1000,
      onComplete: () => phaseAlert.destroy(),
    });

    // 충격파
    for (let i = 0; i < 3; i++) {
      const wave = this.scene.add.graphics();
      wave.setPosition(this.x, this.y - 50);
      wave.lineStyle(4, 0xff4444, 0.8);
      wave.strokeCircle(0, 0, 20);
      wave.setDepth(this.depth + 1);

      this.scene.tweens.add({
        targets: wave,
        scaleX: 5 + i,
        scaleY: 5 + i,
        alpha: 0,
        duration: 600,
        delay: i * 100,
        onComplete: () => wave.destroy(),
      });
    }

    this.scene.cameras.main.shake(300, 0.015);
  }

  private updateAI(time: number, delta: number): void {
    if (!this.target) return;

    const dx = this.target.x - this.x;
    this.facingRight = dx < 0;

    // 공격 쿨다운
    const attackCooldown = 2000 / this.phaseConfig.attackSpeed;

    if (!this.isAttacking && time - this.lastAttackTime > attackCooldown) {
      const dist = Math.abs(dx);

      if (dist < 150) {
        // 근접 공격
        this.performMeleeAttack(time);
      } else if (dist < 400 && this.currentPhase >= 1) {
        // 돌진 공격 (페이즈 2부터)
        this.performChargeAttack(time);
      } else {
        // 접근
        this.velocityX = (this.facingRight ? -1 : 1) * this.phaseConfig.moveSpeed;
      }
    } else if (!this.isAttacking) {
      // 접근
      const dist = Math.abs(dx);
      if (dist > 100) {
        this.velocityX = (this.facingRight ? -1 : 1) * this.phaseConfig.moveSpeed;
      } else {
        this.velocityX *= 0.9;
      }
    }
  }

  private performMeleeAttack(time: number): void {
    this.lastAttackTime = time;
    this.isAttacking = true;

    // 곤봉 내려치기
    const attackX = this.x + (this.facingRight ? -80 : 80);
    const attackY = this.y;

    // 공격 이펙트
    this.scene.time.delayedCall(300, () => {
      const smash = this.scene.add.graphics();
      smash.setPosition(attackX, attackY + 50);

      // 충격파
      smash.lineStyle(6, 0x886644, 0.9);
      smash.strokeCircle(0, 0, 20);
      smash.setDepth(this.y + 2);

      this.scene.tweens.add({
        targets: smash,
        scaleX: 4,
        scaleY: 1.5,
        alpha: 0,
        duration: 300,
        onComplete: () => smash.destroy(),
      });

      // 바닥 균열
      for (let i = 0; i < 4; i++) {
        const crack = this.scene.add.graphics();
        crack.setPosition(attackX + (i - 1.5) * 30, attackY + 70);
        crack.fillStyle(0x443322);
        crack.fillRect(-3, 0, 6, 20 + Math.random() * 15);
        crack.setDepth(this.y + 1);

        this.scene.tweens.add({
          targets: crack,
          alpha: 0,
          duration: 400,
          delay: i * 50,
          onComplete: () => crack.destroy(),
        });
      }

      // 데미지
      if (this.target) {
        const dist = Math.abs(this.target.x - attackX);
        if (dist < 120) {
          const damage = this.attack * this.curseDebuff;
          this.target.takeDamage(damage, time);
        }
      }

      this.scene.cameras.main.shake(150, 0.01);
    });

    this.scene.time.delayedCall(600, () => {
      this.isAttacking = false;
    });
  }

  private performChargeAttack(time: number): void {
    this.lastAttackTime = time;
    this.isAttacking = true;

    // 돌진 준비
    const chargeEffect = this.scene.add.graphics();
    chargeEffect.setPosition(this.x, this.y - 50);
    chargeEffect.fillStyle(0xff4444, 0.5);
    chargeEffect.fillCircle(0, 0, 60);
    chargeEffect.setDepth(this.depth - 1);

    this.scene.tweens.add({
      targets: chargeEffect,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 400,
      onComplete: () => chargeEffect.destroy(),
    });

    // 돌진
    this.scene.time.delayedCall(400, () => {
      const chargeDir = this.facingRight ? -1 : 1;
      this.velocityX = chargeDir * 500;

      // 돌진 잔상
      for (let i = 0; i < 5; i++) {
        this.scene.time.delayedCall(i * 50, () => {
          const trail = this.scene.add.graphics();
          trail.setPosition(this.x, this.y - 50);
          trail.fillStyle(0x44aa44, 0.4);
          trail.fillCircle(0, 0, 40);
          trail.setDepth(this.depth - 1);

          this.scene.tweens.add({
            targets: trail,
            alpha: 0,
            duration: 200,
            onComplete: () => trail.destroy(),
          });
        });
      }
    });

    this.scene.time.delayedCall(700, () => {
      // 돌진 충돌 체크
      if (this.target) {
        const dist = Math.abs(this.target.x - this.x);
        if (dist < 100) {
          const damage = this.attack * 1.5 * this.curseDebuff;
          this.target.takeDamage(damage, time);

          // 큰 충격
          this.scene.cameras.main.shake(200, 0.02);
        }
      }
      this.isAttacking = false;
      this.velocityX = 0;
    });
  }

  public takeDamage(amount: number, knockbackDir: number, time: number): boolean {
    if (this.isDead) return false;

    const actualDamage = Math.max(1, amount - this.defense);
    this.currentHealth -= actualDamage;
    this.hitFlash = true;
    this.updateHealthBar();

    // 데미지 텍스트
    const dmgText = this.scene.add.text(this.x + Phaser.Math.Between(-30, 30), this.y - 120, `${Math.floor(actualDamage)}`, {
      fontSize: '24px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(1000);

    this.scene.tweens.add({
      targets: dmgText,
      y: dmgText.y - 40,
      alpha: 0,
      duration: 600,
      onComplete: () => dmgText.destroy(),
    });

    // 가벼운 넉백
    this.velocityX = knockbackDir * 30;

    if (this.currentHealth <= 0) {
      this.die();
    }

    return true;
  }

  private die(): void {
    this.isDead = true;

    // 승리 연출
    const victoryOverlay = this.scene.add.graphics();
    victoryOverlay.fillStyle(0x000000, 0);
    victoryOverlay.fillRect(0, 0, GAME_WIDTH, 720);
    victoryOverlay.setScrollFactor(0);
    victoryOverlay.setDepth(998);

    this.scene.tweens.add({
      targets: victoryOverlay,
      alpha: 0.5,
      duration: 1000,
    });

    // 폭발 이펙트
    for (let i = 0; i < 20; i++) {
      this.scene.time.delayedCall(i * 100, () => {
        const explosion = this.scene.add.graphics();
        explosion.setPosition(this.x + Phaser.Math.Between(-50, 50), this.y - Phaser.Math.Between(0, 150));
        explosion.fillStyle(0xff8844, 0.9);
        explosion.fillCircle(0, 0, 20 + Math.random() * 20);
        explosion.setDepth(this.depth + 2);

        this.scene.tweens.add({
          targets: explosion,
          scaleX: 2,
          scaleY: 2,
          alpha: 0,
          duration: 300,
          onComplete: () => explosion.destroy(),
        });
      });
    }

    // 승리 텍스트
    this.scene.time.delayedCall(2000, () => {
      const victoryText = this.scene.add.text(GAME_WIDTH / 2, 300, 'VICTORY!', {
        fontSize: '72px',
        color: '#FFD700',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 8,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

      const rewardText = this.scene.add.text(GAME_WIDTH / 2, 380, `+${this.config.exp} EXP  +${this.config.gold} GOLD`, {
        fontSize: '32px',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

      this.scene.tweens.add({
        targets: victoryText,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 500,
        yoyo: true,
        repeat: -1,
      });

      // 보상 이벤트
      this.scene.events.emit('bossDefeated', { exp: this.config.exp, gold: this.config.gold });
    });

    // 보스 사라짐
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      y: this.y - 50,
      duration: 2000,
      onComplete: () => {
        this.healthBarBg.destroy();
        this.healthBar.destroy();
        this.nameText.destroy();
        this.phaseText.destroy();
        this.destroy();
      },
    });
  }

  public getHitbox(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x - 60, this.y - 150, 120, 240);
  }
}
