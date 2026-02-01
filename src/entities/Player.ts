import Phaser from 'phaser';
import { PHYSICS, PLAYER_STATS, LEVEL_CONFIG, SKILL_TYPES } from '../config/GameConfig';
import { SoundManager } from '../utils/SoundManager';

export class Player extends Phaser.GameObjects.Container {
  public scene: Phaser.Scene;

  // 스탯
  public level: number = 1;
  public currentHealth: number;
  public maxHealth: number;
  public attack: number;
  public defense: number;
  public currentExp: number = 0;
  public expToNextLevel: number;
  public gold: number = 0;

  // 물리
  private velocityX: number = 0;
  private velocityY: number = 0;
  private isOnGround: boolean = false;
  private canDoubleJump: boolean = true;
  private facingRight: boolean = true;

  // 상태
  private isAttacking: boolean = false;
  private isDead: boolean = false;
  private isInvincible: boolean = false;
  private invincibleTimer: number = 0;

  // 버프/디버프
  private darkShieldActive: boolean = false;
  private darkShieldTimer: number = 0;
  private damageReduction: number = 1.0;

  // 스킬 쿨다운
  private skillCooldowns: Map<string, number> = new Map();
  private lastSkillTime: Map<string, number> = new Map();

  // 콤보
  private comboCount: number = 0;
  private lastHitTime: number = 0;

  // 스프라이트
  private playerSprite!: Phaser.GameObjects.Sprite;
  private aura!: Phaser.GameObjects.Graphics;
  private effectsGraphics!: Phaser.GameObjects.Graphics;

  // 애니메이션
  private animTimer: number = 0;
  private walkFrame: number = 0;
  private castingEffect: boolean = false;
  private bobOffset: number = 0;

  // 대쉬
  private lastLeftTap: number = 0;
  private lastRightTap: number = 0;
  private isDashing: boolean = false;
  private dashCooldown: number = 0;
  private readonly DASH_DISTANCE: number = 150;
  private readonly DASH_DOUBLE_TAP_TIME: number = 250;
  private readonly DASH_COOLDOWN: number = 500;

  // 히트박스
  public hitbox = { width: 40, height: 60 };

  // 사운드
  private soundManager: SoundManager;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.scene = scene;

    // 스탯 초기화
    this.maxHealth = PLAYER_STATS.maxHealth;
    this.currentHealth = this.maxHealth;
    this.attack = PLAYER_STATS.baseAttack;
    this.defense = PLAYER_STATS.defense;
    this.expToNextLevel = LEVEL_CONFIG.baseExp;

    // 스킬 쿨다운 초기화 (처음에 바로 사용 가능하도록 충분히 과거 시간으로)
    for (const skill of Object.keys(SKILL_TYPES)) {
      this.skillCooldowns.set(skill, 0);
      this.lastSkillTime.set(skill, -100000);
    }

    // 사운드 매니저 초기화
    this.soundManager = new SoundManager();

    this.createSprite();
    scene.add.existing(this);
  }

  private createSprite(): void {
    // 오라 (뒤에 그림)
    this.aura = this.scene.add.graphics();
    this.add(this.aura);

    // 이펙트용 그래픽스
    this.effectsGraphics = this.scene.add.graphics();
    this.add(this.effectsGraphics);

    // 플레이어 스프라이트
    this.playerSprite = this.scene.add.sprite(0, 0, 'lily_right');
    // 이미지 1280x853을 히트박스 높이(60)에 맞춤
    this.playerSprite.setDisplaySize(200, 150);
    this.playerSprite.setOrigin(0.3, 0.7);
    this.add(this.playerSprite);

    this.drawPlayer();
  }

  private drawPlayer(): void {
    this.aura.clear();
    this.effectsGraphics.clear();

    const isWalking = Math.abs(this.velocityX) > 10;

    // 피격 시 깜빡임
    if (this.isInvincible && Math.floor(this.invincibleTimer * 10) % 2 === 0) {
      this.playerSprite.setVisible(false);
      return;
    }
    this.playerSprite.setVisible(true);

    // 스프라이트 방향 설정 (공격 중에는 전용 텍스처 사용하므로 flipX 안함)
    if (!this.castingEffect) {
      this.playerSprite.setFlipX(!this.facingRight);
    }
    // 원점이 중앙(0.5)이 아니므로 뒤집을 때 x 위치 보정
    // displayWidth=200, origin.x=0.3 -> 보정값 = (0.5 - 0.3) * 200 * 2 = 80
    const flipOffsetX = this.facingRight ? 0 : -80;

    // 걷기 애니메이션 (상하 움직임 + 기울기)
    if (isWalking) {
      this.bobOffset = Math.sin(this.animTimer * 15) * 3;
      const tilt = Math.sin(this.animTimer * 15) * 0.05 * (this.facingRight ? 1 : -1);
      this.playerSprite.setRotation(tilt);
      this.playerSprite.x = flipOffsetX;
      this.playerSprite.y = this.bobOffset;

      // 걷기 먼지 파티클
      if (Math.random() < 0.15) {
        this.createWalkDust();
      }
    } else {
      // 대기 애니메이션 (부드러운 호흡)
      this.bobOffset = Math.sin(this.animTimer * 3) * 2;
      this.playerSprite.setRotation(0);
      this.playerSprite.x = flipOffsetX;
      this.playerSprite.y = this.bobOffset;
    }

    // 대쉬 중일 때 잔상 효과
    if (this.isDashing) {
      this.playerSprite.setTint(0x00ffff);
    } else {
      this.playerSprite.clearTint();
    }

    // 암흑 보호막 활성화 시 오라
    if (this.darkShieldActive) {
      this.aura.fillStyle(0x4444aa, 0.3 + Math.sin(this.animTimer * 6) * 0.1);
      this.aura.fillCircle(0, -30, 55);
      this.aura.lineStyle(3, 0x6666ff, 0.8);
      this.aura.strokeCircle(0, -30, 55);
      // 룬 이펙트
      for (let i = 0; i < 6; i++) {
        const angle = this.animTimer * 2 + (i / 6) * Math.PI * 2;
        const rx = Math.cos(angle) * 45;
        const ry = Math.sin(angle) * 25;
        this.aura.fillStyle(0x8888ff, 0.7);
        this.aura.fillCircle(rx, -30 + ry, 4);
      }
    }

    // 소환술사 오라 (기본)
    const auraSize = 45 + Math.sin(this.animTimer * 3) * 5;
    this.aura.fillStyle(0x9944ff, 0.1 + Math.sin(this.animTimer * 3) * 0.05);
    this.aura.fillCircle(0, -30, auraSize);

    // 마법 파티클
    for (let i = 0; i < 4; i++) {
      const angle = this.animTimer + (i / 4) * Math.PI * 2;
      const px = Math.cos(angle) * 30;
      const py = Math.sin(angle) * 15 - 30;
      this.aura.fillStyle(0xcc66ff, 0.5 + Math.sin(this.animTimer * 5 + i) * 0.3);
      this.aura.fillCircle(px, py, 3);
    }

    // 시전 이펙트
    if (this.castingEffect) {
      // 손 주변 마법 효과
      const handX = this.facingRight ? 25 : -25;
      this.effectsGraphics.fillStyle(0xff6600, 0.8 + Math.sin(this.animTimer * 10) * 0.2);
      this.effectsGraphics.fillCircle(handX, -25 + this.bobOffset, 18);
      this.effectsGraphics.lineStyle(3, 0xffaa00, 0.9);
      this.effectsGraphics.strokeCircle(handX, -25 + this.bobOffset, 22 + Math.sin(this.animTimer * 8) * 4);

      // 스파크 이펙트
      for (let i = 0; i < 6; i++) {
        const sparkAngle = this.animTimer * 8 + (i / 6) * Math.PI * 2;
        const sparkDist = 25 + Math.sin(this.animTimer * 12 + i) * 5;
        const sx = handX + Math.cos(sparkAngle) * sparkDist;
        const sy = -25 + this.bobOffset + Math.sin(sparkAngle) * sparkDist * 0.6;
        this.effectsGraphics.fillStyle(0xffff00, 0.8);
        this.effectsGraphics.fillCircle(sx, sy, 2);
      }
    }
  }

  private createWalkDust(): void {
    const dust = this.scene.add.graphics();
    dust.setPosition(this.x + Phaser.Math.Between(-10, 10), this.y);
    dust.fillStyle(0x888888, 0.4);
    dust.fillCircle(0, 0, 4 + Math.random() * 3);
    dust.setDepth(this.y - 1);

    this.scene.tweens.add({
      targets: dust,
      y: dust.y - 15,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 0.5,
      duration: 250,
      onComplete: () => dust.destroy(),
    });
  }

  public moveLeft(): void {
    if (this.isDead || this.isDashing) return;
    this.velocityX = -PHYSICS.playerSpeed;
    this.facingRight = false;
  }

  public moveRight(): void {
    if (this.isDead || this.isDashing) return;
    this.velocityX = PHYSICS.playerSpeed;
    this.facingRight = true;
  }

  public tryDashLeft(): void {
    if (this.isDead || this.isDashing || this.dashCooldown > 0) return;

    const now = this.scene.time.now;
    if (now - this.lastLeftTap < this.DASH_DOUBLE_TAP_TIME) {
      this.performDash(-1);
    }
    this.lastLeftTap = now;
  }

  public tryDashRight(): void {
    if (this.isDead || this.isDashing || this.dashCooldown > 0) return;

    const now = this.scene.time.now;
    if (now - this.lastRightTap < this.DASH_DOUBLE_TAP_TIME) {
      this.performDash(1);
    }
    this.lastRightTap = now;
  }

  private performDash(direction: number): void {
    this.isDashing = true;
    this.dashCooldown = this.DASH_COOLDOWN;
    this.facingRight = direction > 0;
    this.soundManager.playDash();

    const startX = this.x;
    const endX = this.x + direction * this.DASH_DISTANCE;

    // 대쉬 시작 이펙트
    this.createDashStartEffect();

    // 잔상 생성
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 20, () => {
        this.createDashAfterImage(startX + (endX - startX) * (i / 5));
      });
    }

    // 순간이동
    this.scene.tweens.add({
      targets: this,
      x: endX,
      duration: 80,
      ease: 'Power2',
      onComplete: () => {
        this.isDashing = false;
        this.createDashEndEffect();
      },
    });

    // 무적 프레임
    this.isInvincible = true;
    this.invincibleTimer = 0.15;

    // 카메라 효과
    this.scene.cameras.main.shake(50, 0.003);
  }

  private createDashStartEffect(): void {
    // 대쉬 시작 - 가벼운 바람 선
    const dir = this.facingRight ? -1 : 1;
    for (let i = 0; i < 3; i++) {
      const line = this.scene.add.graphics();
      line.setPosition(this.x + dir * (10 + i * 8), this.y - 20 + Phaser.Math.Between(-15, 15));
      line.lineStyle(2, 0x00ffff, 0.6 - i * 0.15);
      line.beginPath();
      line.moveTo(0, 0);
      line.lineTo(dir * 20, 0);
      line.stroke();
      line.setDepth(this.y + 1);

      this.scene.tweens.add({
        targets: line,
        alpha: 0,
        x: line.x + dir * 15,
        duration: 150,
        onComplete: () => line.destroy(),
      });
    }
  }

  private createDashAfterImage(posX: number): void {
    const afterImage = this.scene.add.sprite(posX, this.y, 'lily_right');
    afterImage.setDisplaySize(200, 150);
    afterImage.setOrigin(0.3, 0.7);
    afterImage.setFlipX(!this.facingRight);
    afterImage.setTint(0x00ffff);
    afterImage.setAlpha(0.4);
    afterImage.setDepth(this.y - 1);

    // 크기 변하지 않고 제자리에서 투명하게 사라짐
    this.scene.tweens.add({
      targets: afterImage,
      alpha: 0,
      duration: 150,
      onComplete: () => afterImage.destroy(),
    });
  }

  private createDashEndEffect(): void {
    // 도착 지점 가벼운 바람 선
    const dir = this.facingRight ? 1 : -1;
    for (let i = 0; i < 3; i++) {
      const line = this.scene.add.graphics();
      line.setPosition(this.x - dir * (5 + i * 6), this.y - 20 + Phaser.Math.Between(-12, 12));
      line.lineStyle(2, 0x00ffff, 0.5 - i * 0.12);
      line.beginPath();
      line.moveTo(0, 0);
      line.lineTo(-dir * 18, 0);
      line.stroke();
      line.setDepth(this.y + 1);

      this.scene.tweens.add({
        targets: line,
        alpha: 0,
        duration: 120,
        onComplete: () => line.destroy(),
      });
    }
  }

  public jump(): void {
    if (this.isDead) return;

    if (this.isOnGround) {
      this.velocityY = -PHYSICS.playerJumpPower;
      this.isOnGround = false;
      this.canDoubleJump = true;
      this.soundManager.playJump();
      this.createJumpEffect();
    } else if (this.canDoubleJump) {
      this.velocityY = -PHYSICS.doubleJumpPower;
      this.canDoubleJump = false;
      this.soundManager.playJump();
      this.createDoubleJumpEffect();
    }
  }

  private createJumpEffect(): void {
    const dust = this.scene.add.graphics();
    dust.setPosition(this.x, this.y + 25);
    dust.fillStyle(0x888888, 0.6);
    for (let i = 0; i < 5; i++) {
      dust.fillCircle((i - 2) * 8, 0, 5 - i * 0.5);
    }
    dust.setDepth(this.y - 1);

    this.scene.tweens.add({
      targets: dust,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 0.5,
      duration: 300,
      onComplete: () => dust.destroy(),
    });
  }

  private createDoubleJumpEffect(): void {
    // 마법 원 효과
    const circle = this.scene.add.graphics();
    circle.setPosition(this.x, this.y);
    circle.lineStyle(3, 0x9944ff, 0.8);
    circle.strokeCircle(0, 0, 20);
    circle.setDepth(this.y - 1);

    this.scene.tweens.add({
      targets: circle,
      scaleX: 2,
      scaleY: 0.5,
      alpha: 0,
      duration: 300,
      onComplete: () => circle.destroy(),
    });

    // 마법 파티클
    for (let i = 0; i < 8; i++) {
      const particle = this.scene.add.graphics();
      particle.setPosition(this.x, this.y);
      particle.fillStyle(0x9944ff, 0.8);
      particle.fillCircle(0, 0, 4);
      particle.setDepth(this.y);

      const angle = (i / 8) * Math.PI * 2;
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * 30,
        y: particle.y + Math.sin(angle) * 30,
        alpha: 0,
        duration: 300,
        onComplete: () => particle.destroy(),
      });
    }
  }

  // ===== 스킬 시스템 =====

  public canUseSkill(skillName: string): boolean {
    const skill = (SKILL_TYPES as any)[skillName];
    if (!skill) return false;

    const lastTime = this.lastSkillTime.get(skillName) || 0;
    const now = this.scene.time.now;

    return (now - lastTime >= skill.cooldown);
  }

  public getSkillCooldownPercent(skillName: string): number {
    const skill = (SKILL_TYPES as any)[skillName];
    if (!skill) return 0;

    const lastTime = this.lastSkillTime.get(skillName) || 0;
    const now = this.scene.time.now;
    const elapsed = now - lastTime;

    if (elapsed >= skill.cooldown) return 0;
    return 1 - (elapsed / skill.cooldown);
  }

  private useSkill(skillName: string): void {
    this.lastSkillTime.set(skillName, this.scene.time.now);
  }

  // CTRL - 파이어볼
  public castFireball(): void {
    if (!this.canUseSkill('FIREBALL') || this.isDead) return;

    this.useSkill('FIREBALL');
    this.castingEffect = true;
    this.soundManager.playFireball();
    this.soundManager.playAttackVoice();

    // 공격 스프라이트 변경
    this.playerSprite.setTexture(this.facingRight ? 'lily_attack_right' : 'lily_attack_left');
    this.playerSprite.setFlipX(false);
    this.scene.time.delayedCall(150, () => {
      this.castingEffect = false;
      this.playerSprite.setTexture('lily_right');
    });

    const dir = this.facingRight ? 1 : -1;
    const startX = this.x + dir * 30;
    const startY = this.y - 35;

    // 시전 차지 이펙트
    const chargeEffect = this.scene.add.graphics();
    chargeEffect.setPosition(startX, startY);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      chargeEffect.fillStyle(0xff6600, 0.8);
      chargeEffect.fillCircle(Math.cos(angle) * 40, Math.sin(angle) * 40, 5);
    }
    chargeEffect.setDepth(startY + 1);

    this.scene.tweens.add({
      targets: chargeEffect,
      scaleX: 0.1,
      scaleY: 0.1,
      duration: 100,
      onComplete: () => chargeEffect.destroy(),
    });

    // 파이어볼 생성
    const fireball = this.scene.add.graphics();
    fireball.setPosition(startX, startY);
    (fireball as any).velocityX = dir * 700;
    (fireball as any).damage = SKILL_TYPES.FIREBALL.damage + this.attack * 0.5;
    (fireball as any).isActive = true;

    // 파이어볼 그리기 (더 화려하게)
    const drawFireball = () => {
      fireball.clear();
      const time = this.scene.time.now / 80;

      // 외곽 글로우
      fireball.fillStyle(0xff2200, 0.3);
      fireball.fillCircle(0, 0, 28 + Math.sin(time) * 3);

      // 불꽃 꼬리 (더 많이)
      for (let i = 0; i < 8; i++) {
        const tailX = -dir * (8 + i * 10);
        const tailY = Math.sin(time * 2 + i * 0.5) * (4 + i);
        fireball.fillStyle(0xff4400, 0.7 - i * 0.08);
        fireball.fillCircle(tailX, tailY, 12 - i * 1.2);
      }

      // 외곽 불꽃
      fireball.fillStyle(0xff6600, 0.9);
      fireball.fillCircle(0, 0, 20 + Math.sin(time * 1.5) * 2);

      // 중간층
      fireball.fillStyle(0xffaa00, 0.95);
      fireball.fillCircle(0, 0, 14);

      // 핵심 (하얀 빛)
      fireball.fillStyle(0xffffcc, 1);
      fireball.fillCircle(0, 0, 8);

      // 스파크 이펙트
      for (let i = 0; i < 4; i++) {
        const sparkAngle = time * 3 + (i / 4) * Math.PI * 2;
        const sparkDist = 18 + Math.sin(time * 5 + i) * 3;
        fireball.fillStyle(0xffff00, 0.8);
        fireball.fillCircle(Math.cos(sparkAngle) * sparkDist, Math.sin(sparkAngle) * sparkDist, 3);
      }

      // 트레일 파티클 생성
      if (Math.random() < 0.4) {
        const trail = this.scene.add.graphics();
        trail.setPosition(fireball.x - dir * 15 + Phaser.Math.Between(-5, 5), fireball.y + Phaser.Math.Between(-8, 8));
        trail.fillStyle(0xff6600, 0.7);
        trail.fillCircle(0, 0, 4 + Math.random() * 4);
        trail.setDepth(fireball.depth - 1);

        this.scene.tweens.add({
          targets: trail,
          alpha: 0,
          scaleX: 0.3,
          scaleY: 0.3,
          y: trail.y - 20,
          duration: 200,
          onComplete: () => trail.destroy(),
        });
      }
    };

    // 파이어볼 리스트에 추가
    (this.scene as any).projectiles = (this.scene as any).projectiles || [];
    (this.scene as any).projectiles.push({
      graphics: fireball,
      update: () => {
        if (!(fireball as any).isActive || !fireball.active) return;
        fireball.x += (fireball as any).velocityX * (1 / 60);
        fireball.setDepth(fireball.y);
        drawFireball();

        if (fireball.x < this.scene.cameras.main.scrollX - 100 ||
            fireball.x > this.scene.cameras.main.scrollX + 1400) {
          (fireball as any).isActive = false;
          if (fireball.active) fireball.destroy();
        }
      },
      damage: (fireball as any).damage,
      hitbox: { x: fireball.x, y: fireball.y, width: 35, height: 35 },
      getHitbox: () => new Phaser.Geom.Rectangle(fireball.x - 17, fireball.y - 17, 35, 35),
      destroy: () => {
        if (!(fireball as any).isActive) return;
        (fireball as any).isActive = false;

        // 폭발 위치 저장 (destroy 후에도 사용)
        const fx = fireball.x;
        const fy = fireball.y;
        const fd = fireball.depth;

        // 파이어볼 즉시 제거
        if (fireball.active) fireball.destroy();

        // 대형 폭발 이펙트
        for (let ring = 0; ring < 3; ring++) {
          this.scene.time.delayedCall(ring * 50, () => {
            const explosion = this.scene.add.graphics();
            explosion.setPosition(fx, fy);
            explosion.fillStyle(0xff6600, 0.8 - ring * 0.2);
            explosion.fillCircle(0, 0, 30 + ring * 15);
            explosion.setDepth(fd + 2);

            this.scene.tweens.add({
              targets: explosion,
              scaleX: 1.5 + ring * 0.3,
              scaleY: 1.5 + ring * 0.3,
              alpha: 0,
              duration: 250,
              onComplete: () => explosion.destroy(),
            });
          });
        }

        // 불꽃 파티클
        for (let i = 0; i < 15; i++) {
          const particle = this.scene.add.graphics();
          particle.setPosition(fx, fy);
          particle.fillStyle([0xff6600, 0xffaa00, 0xffff00][Math.floor(Math.random() * 3)], 0.9);
          particle.fillCircle(0, 0, 4 + Math.random() * 5);
          particle.setDepth(fd + 3);

          const angle = Math.random() * Math.PI * 2;
          const speed = 50 + Math.random() * 100;
          this.scene.tweens.add({
            targets: particle,
            x: particle.x + Math.cos(angle) * speed,
            y: particle.y + Math.sin(angle) * speed - 30,
            alpha: 0,
            duration: 400,
            onComplete: () => particle.destroy(),
          });
        }

        // 화면 흔들림
        this.scene.cameras.main.shake(100, 0.008);
      },
    });

    // 시전 이펙트
    this.createCastEffect(0xff6600);
  }

  // Q - 다크 스파이크
  public castDarkSpike(): void {
    if (!this.canUseSkill('DARK_SPIKE') || this.isDead) return;

    this.useSkill('DARK_SPIKE');
    this.soundManager.playDarkSpike();
    this.soundManager.playSkillVoice();

    const damage = SKILL_TYPES.DARK_SPIKE.damage + this.attack * 0.8;
    const spikeCount = (SKILL_TYPES.DARK_SPIKE as any).spikeCount || 3;

    // 플레이어 앞쪽에 3개의 스파이크 낙하
    const dir = this.facingRight ? 1 : -1;
    for (let i = 0; i < spikeCount; i++) {
      this.scene.time.delayedCall(i * 200, () => {
        const targetX = this.x + dir * (80 + i * 100);
        const targetY = this.y + 20;
        const startY = targetY - 300;

        // 경고 표시
        const warning = this.scene.add.graphics();
        warning.setPosition(targetX, targetY);
        warning.fillStyle(0x440066, 0.4);
        warning.fillEllipse(0, 0, 60, 15);
        warning.setDepth(targetY - 1);

        this.scene.tweens.add({
          targets: warning,
          alpha: 0.8,
          scaleX: 1.2,
          duration: 150,
          yoyo: true,
          onComplete: () => warning.destroy(),
        });

        // 암흑 송곳 낙하
        this.scene.time.delayedCall(150, () => {
          const spike = this.scene.add.graphics();
          spike.setPosition(targetX, startY);

          // 암흑 송곳 모양
          spike.fillStyle(0x440066);
          spike.fillTriangle(-12, 0, 0, 80, 12, 0);
          spike.fillStyle(0x660088, 0.8);
          spike.fillTriangle(-6, 5, 0, 75, 6, 5);
          // 보라 글로우
          spike.fillStyle(0x8800cc, 0.4);
          spike.fillCircle(0, 40, 18);
          spike.setDepth(targetY + 1);

          // 낙하 트윈
          this.scene.tweens.add({
            targets: spike,
            y: targetY - 40,
            duration: 120,
            ease: 'Quad.easeIn',
            onComplete: () => {
              // 충돌 이펙트
              const impact = this.scene.add.graphics();
              impact.setPosition(targetX, targetY);
              impact.fillStyle(0x660088, 0.7);
              impact.fillCircle(0, 0, 35);
              impact.fillStyle(0x8800cc, 0.4);
              impact.fillCircle(0, 0, 50);
              impact.setDepth(targetY + 2);

              this.scene.tweens.add({
                targets: impact,
                scaleX: 1.5,
                scaleY: 0.5,
                alpha: 0,
                duration: 300,
                onComplete: () => impact.destroy(),
              });

              // 파편
              for (let p = 0; p < 6; p++) {
                const shard = this.scene.add.graphics();
                shard.setPosition(targetX, targetY);
                shard.fillStyle(0x660088, 0.8);
                shard.fillTriangle(-3, 0, 0, -10, 3, 0);
                shard.setDepth(targetY + 3);
                const angle = Math.random() * Math.PI * 2;
                this.scene.tweens.add({
                  targets: shard,
                  x: shard.x + Math.cos(angle) * 40,
                  y: shard.y + Math.sin(angle) * 40 - 20,
                  alpha: 0,
                  rotation: Math.random() * 3,
                  duration: 300,
                  onComplete: () => shard.destroy(),
                });
              }

              // 데미지 히트박스
              const hitbox = new Phaser.Geom.Rectangle(targetX - 30, targetY - 80, 60, 80);
              this.scene.events.emit('darkSpikeHit', hitbox, damage);

              // 사라짐
              this.scene.tweens.add({
                targets: spike,
                alpha: 0,
                scaleY: 0.5,
                duration: 200,
                onComplete: () => spike.destroy(),
              });
            },
          });
        });
      });
    }

    this.createCastEffect(0x440066);
    this.scene.cameras.main.shake(200, 0.006);
  }

  // W - 뼈가시 (관통)
  public castBoneSpike(): void {
    if (!this.canUseSkill('BONE_SPIKE') || this.isDead) return;

    this.useSkill('BONE_SPIKE');
    this.soundManager.playBoneSpike();
    this.soundManager.playSkillVoice();
    this.castingEffect = true;
    this.scene.time.delayedCall(300, () => this.castingEffect = false);

    const dir = this.facingRight ? 1 : -1;
    const damage = SKILL_TYPES.BONE_SPIKE.damage + this.attack * 0.8;

    // 시전 이펙트 - 땅에 균열
    const groundCrack = this.scene.add.graphics();
    groundCrack.setPosition(this.x, this.y + 25);
    groundCrack.lineStyle(3, 0x8866aa, 0.9);
    for (let i = 0; i < 5; i++) {
      groundCrack.beginPath();
      groundCrack.moveTo(0, 0);
      groundCrack.lineTo(dir * (20 + i * 15), Phaser.Math.Between(-5, 5));
      groundCrack.stroke();
    }
    groundCrack.setDepth(this.y);

    this.scene.tweens.add({
      targets: groundCrack,
      alpha: 0,
      duration: 400,
      onComplete: () => groundCrack.destroy(),
    });

    // 럴커 스타일 뼈 가시 - 10개로 증가
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 50, () => {
        const spikeX = this.x + dir * (50 + i * 55);
        const spikeY = this.y + 20;
        const spikeHeight = 70 + Math.random() * 30 + (i < 5 ? i * 10 : (9 - i) * 10);

        // 뼈 가시 스프라이트
        const spike = this.scene.add.graphics();
        spike.setPosition(spikeX, spikeY);

        // 메인 뼈 가시 (더 디테일)
        spike.fillStyle(0xeeeedd);
        spike.fillTriangle(-10, 0, 0, -spikeHeight, 10, 0);

        // 보조 뼈
        spike.fillStyle(0xddddcc);
        spike.fillTriangle(-15, 0, -6, -spikeHeight * 0.6, 0, 0);
        spike.fillTriangle(0, 0, 6, -spikeHeight * 0.6, 15, 0);

        // 작은 뼈 조각들
        spike.fillStyle(0xccccbb);
        spike.fillTriangle(-18, 0, -12, -spikeHeight * 0.35, -8, 0);
        spike.fillTriangle(8, 0, 12, -spikeHeight * 0.35, 18, 0);

        // 하이라이트
        spike.fillStyle(0xffffff, 0.6);
        spike.fillTriangle(-4, -5, 0, -spikeHeight + 10, 2, -5);

        // 어둠 쉐도우
        spike.fillStyle(0x886688, 0.4);
        spike.fillTriangle(2, 0, 6, -spikeHeight * 0.8, 10, 0);

        // 네크로맨서 마법 빛
        spike.fillStyle(0x9966ff, 0.5);
        spike.fillCircle(0, -spikeHeight * 0.7, 5);

        spike.setDepth(spikeY);
        spike.setScale(0, 0);

        // 솟아오르는 애니메이션 (더 강렬하게)
        this.scene.tweens.add({
          targets: spike,
          scaleY: 1.2,
          scaleX: 1,
          duration: 80,
          ease: 'Back.easeOut',
          onComplete: () => {
            this.scene.tweens.add({
              targets: spike,
              scaleY: 1,
              duration: 50,
            });

            // 데미지 체크
            const hitbox = new Phaser.Geom.Rectangle(spikeX - 25, spikeY - spikeHeight - 10, 50, spikeHeight + 10);
            this.scene.events.emit('boneSpikeHit', hitbox, damage);

            // 마법 파티클
            for (let p = 0; p < 4; p++) {
              const magicParticle = this.scene.add.graphics();
              magicParticle.setPosition(spikeX + Phaser.Math.Between(-15, 15), spikeY - spikeHeight * Math.random());
              magicParticle.fillStyle(0xaa88ff, 0.8);
              magicParticle.fillCircle(0, 0, 3);
              magicParticle.setDepth(spikeY + 1);

              this.scene.tweens.add({
                targets: magicParticle,
                y: magicParticle.y - 30,
                alpha: 0,
                duration: 300,
                delay: p * 30,
                onComplete: () => magicParticle.destroy(),
              });
            }

            // 사라지는 애니메이션
            this.scene.time.delayedCall(250, () => {
              this.scene.tweens.add({
                targets: spike,
                scaleY: 0,
                scaleX: 0.5,
                alpha: 0,
                duration: 120,
                onComplete: () => spike.destroy(),
              });
            });
          },
        });

        // 땅 폭발 파티클 (더 많이)
        for (let j = 0; j < 6; j++) {
          const dust = this.scene.add.graphics();
          dust.setPosition(spikeX + Phaser.Math.Between(-20, 20), spikeY);
          dust.fillStyle([0x665555, 0x776666, 0x554444][Math.floor(Math.random() * 3)], 0.7);
          dust.fillCircle(0, 0, 4 + Math.random() * 4);
          dust.setDepth(spikeY - 1);

          this.scene.tweens.add({
            targets: dust,
            x: dust.x + Phaser.Math.Between(-25, 25),
            y: dust.y - 25 - Math.random() * 20,
            alpha: 0,
            duration: 350,
            onComplete: () => dust.destroy(),
          });
        }

        // 작은 뼈 조각 파티클
        if (Math.random() < 0.5) {
          const boneShard = this.scene.add.graphics();
          boneShard.setPosition(spikeX + Phaser.Math.Between(-10, 10), spikeY - 20);
          boneShard.fillStyle(0xddddcc, 0.9);
          boneShard.fillTriangle(-3, 0, 0, -8, 3, 0);
          boneShard.setDepth(spikeY + 1);

          this.scene.tweens.add({
            targets: boneShard,
            x: boneShard.x + Phaser.Math.Between(-40, 40),
            y: boneShard.y - 40,
            rotation: Math.random() * 3,
            alpha: 0,
            duration: 400,
            onComplete: () => boneShard.destroy(),
          });
        }
      });
    }

    this.createCastEffect(0xaa88ff);
    this.scene.cameras.main.shake(300, 0.008);
  }

  // E - 시체 폭탄
  public castCorpseBomb(): void {
    if (!this.canUseSkill('CORPSE_BOMB') || this.isDead) return;

    this.useSkill('CORPSE_BOMB');
    this.soundManager.playCorpseBomb();
    this.soundManager.playSkillVoice();
    this.castingEffect = true;
    this.scene.time.delayedCall(400, () => this.castingEffect = false);

    const dir = this.facingRight ? 1 : -1;
    const targetX = this.x + dir * 220;
    const targetY = this.y;
    const damage = SKILL_TYPES.CORPSE_BOMB.damage + this.attack;
    const radius = SKILL_TYPES.CORPSE_BOMB.radius || 130;

    // 시체 폭탄 투사체 컨테이너
    const bombContainer = this.scene.add.container(this.x + dir * 30, this.y - 30);

    // 메인 폭탄
    const bomb = this.scene.add.graphics();
    bomb.fillStyle(0x445522);
    bomb.fillCircle(0, 0, 18);
    bomb.fillStyle(0x668833, 0.7);
    bomb.fillCircle(-4, -4, 8);
    // 독기 글로우
    bomb.fillStyle(0x66ff44, 0.4);
    bomb.fillCircle(0, 0, 25);

    // 회전하는 독 파티클
    const poisonOrbit = this.scene.add.graphics();
    bombContainer.add(bomb);
    bombContainer.add(poisonOrbit);
    bombContainer.setDepth(this.y + 1);

    let bombRotation = 0;

    // 포물선 이동 (곡선 추가)
    const startY = this.y - 30;
    this.scene.tweens.add({
      targets: bombContainer,
      x: targetX,
      duration: 550,
      ease: 'Linear',
    });

    // Y축 포물선
    this.scene.tweens.add({
      targets: bombContainer,
      y: { from: startY, to: targetY - 60 },
      duration: 275,
      ease: 'Quad.easeOut',
      yoyo: true,
      onUpdate: () => {
        // 회전 효과
        bombRotation += 0.15;
        poisonOrbit.clear();
        for (let i = 0; i < 4; i++) {
          const angle = bombRotation + (i / 4) * Math.PI * 2;
          poisonOrbit.fillStyle(0x88ff44, 0.6);
          poisonOrbit.fillCircle(Math.cos(angle) * 22, Math.sin(angle) * 22, 5);
        }

        // 독 트레일
        if (Math.random() < 0.6) {
          const trail = this.scene.add.graphics();
          trail.setPosition(bombContainer.x + Phaser.Math.Between(-8, 8), bombContainer.y + Phaser.Math.Between(-8, 8));
          trail.fillStyle([0x88ff44, 0x66dd33, 0xaaff66][Math.floor(Math.random() * 3)], 0.7);
          trail.fillCircle(0, 0, 4 + Math.random() * 5);
          trail.setDepth(bombContainer.depth - 1);

          this.scene.tweens.add({
            targets: trail,
            alpha: 0,
            scaleX: 0.3,
            scaleY: 0.3,
            y: trail.y + 15,
            duration: 250,
            onComplete: () => trail.destroy(),
          });
        }
      },
      onComplete: () => {
        bombContainer.destroy();

        // 대폭발! 여러 단계
        for (let stage = 0; stage < 4; stage++) {
          this.scene.time.delayedCall(stage * 60, () => {
            const explosion = this.scene.add.graphics();
            explosion.setPosition(targetX, targetY);

            const stageRadius = radius * (0.4 + stage * 0.2);
            explosion.fillStyle([0x66ff44, 0x88ff66, 0xaaff88, 0xccffaa][stage], 0.8 - stage * 0.15);
            explosion.fillCircle(0, 0, stageRadius);
            explosion.setDepth(targetY + 2 + stage);

            this.scene.tweens.add({
              targets: explosion,
              scaleX: 1.3,
              scaleY: 1.3,
              alpha: 0,
              duration: 300,
              onComplete: () => explosion.destroy(),
            });
          });
        }

        // 독 스플래시 파티클 (많이)
        for (let i = 0; i < 25; i++) {
          const particle = this.scene.add.graphics();
          particle.setPosition(targetX, targetY);
          particle.fillStyle([0x88ff44, 0x66dd22, 0xaaff66][Math.floor(Math.random() * 3)], 0.9);
          const pSize = 6 + Math.random() * 10;
          particle.fillCircle(0, 0, pSize);
          particle.setDepth(targetY + 3);

          const angle = (i / 25) * Math.PI * 2 + Math.random() * 0.3;
          const dist = 30 + Math.random() * radius;
          this.scene.tweens.add({
            targets: particle,
            x: particle.x + Math.cos(angle) * dist,
            y: particle.y + Math.sin(angle) * dist * 0.7 - 40,
            alpha: 0,
            scaleX: 0.3,
            scaleY: 0.3,
            duration: 500 + Math.random() * 200,
            onComplete: () => particle.destroy(),
          });
        }

        // 독 연기 기둥
        for (let s = 0; s < 5; s++) {
          const smoke = this.scene.add.graphics();
          smoke.setPosition(targetX + Phaser.Math.Between(-radius * 0.5, radius * 0.5), targetY);
          smoke.fillStyle(0x88ff44, 0.4);
          smoke.fillCircle(0, 0, 20 + Math.random() * 15);
          smoke.setDepth(targetY + 1);

          this.scene.tweens.add({
            targets: smoke,
            y: smoke.y - 80 - Math.random() * 40,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 800,
            delay: s * 50,
            onComplete: () => smoke.destroy(),
          });
        }

        // 해골 이펙트 (독에서 튀어나오는)
        for (let sk = 0; sk < 3; sk++) {
          const skull = this.scene.add.graphics();
          skull.setPosition(targetX + Phaser.Math.Between(-40, 40), targetY);
          skull.fillStyle(0xddddcc, 0.8);
          skull.fillCircle(0, 0, 10);
          skull.fillStyle(0x228822);
          skull.fillCircle(-3, -2, 3);
          skull.fillCircle(3, -2, 3);
          skull.setDepth(targetY + 4);

          this.scene.tweens.add({
            targets: skull,
            y: skull.y - 60 - Math.random() * 30,
            rotation: Math.random() * 4 - 2,
            alpha: 0,
            duration: 600,
            delay: sk * 80,
            onComplete: () => skull.destroy(),
          });
        }

        // 데미지 히트박스
        const hitbox = new Phaser.Geom.Circle(targetX, targetY, radius);
        this.scene.events.emit('corpseBombHit', hitbox, damage);

        this.scene.cameras.main.shake(250, 0.015);
        this.scene.cameras.main.flash(100, 100, 255, 100, false);
      },
    });

    this.createCastEffect(0x88ff44);
  }

  // R - 다크 메테오 (궁극기)
  public castDarkMeteor(): void {
    if (!this.canUseSkill('DARK_METEOR') || this.isDead) return;

    this.useSkill('DARK_METEOR');
    this.soundManager.playDarkMeteorCast();
    this.soundManager.playSkillVoice();

    const damage = SKILL_TYPES.DARK_METEOR.damage + this.attack * 1.5;
    const meteorCount = (SKILL_TYPES.DARK_METEOR as any).meteorCount || 8;
    const radius = (SKILL_TYPES.DARK_METEOR as any).radius || 80;
    const camX = this.scene.cameras.main.scrollX;
    const camW = this.scene.cameras.main.width;

    // 시전 연출 - 하늘 어둡게
    const darkOverlay = this.scene.add.graphics();
    darkOverlay.fillStyle(0x000000, 0.4);
    darkOverlay.fillRect(camX, 0, camW, 720);
    darkOverlay.setDepth(999);
    this.scene.tweens.add({
      targets: darkOverlay,
      alpha: 0,
      duration: 2000,
      onComplete: () => darkOverlay.destroy(),
    });

    // 메테오 랜덤 낙하
    for (let i = 0; i < meteorCount; i++) {
      this.scene.time.delayedCall(200 + i * 180, () => {
        const targetX = camX + 100 + Math.random() * (camW - 200);
        const targetY = this.y + 20;
        const startX = targetX - 120;
        const startY = -50;

        // 메테오 본체
        const meteor = this.scene.add.graphics();
        meteor.setPosition(startX, startY);

        // 암흑 운석
        meteor.fillStyle(0x330044, 0.9);
        meteor.fillCircle(0, 0, 22);
        meteor.fillStyle(0x550066, 0.7);
        meteor.fillCircle(-4, -4, 12);
        meteor.fillStyle(0x880099, 0.5);
        meteor.fillCircle(0, 0, 28);
        meteor.setDepth(1000);

        // 꼬리 트레일 타이머
        const trailTimer = this.scene.time.addEvent({
          delay: 30,
          repeat: 20,
          callback: () => {
            const trail = this.scene.add.graphics();
            trail.setPosition(meteor.x, meteor.y);
            trail.fillStyle(0x660088, 0.6);
            trail.fillCircle(0, 0, 10 + Math.random() * 8);
            trail.setDepth(999);
            this.scene.tweens.add({
              targets: trail,
              alpha: 0,
              scaleX: 0.3,
              scaleY: 0.3,
              duration: 200,
              onComplete: () => trail.destroy(),
            });
          },
        });

        // 낙하
        this.scene.tweens.add({
          targets: meteor,
          x: targetX,
          y: targetY - 20,
          duration: 400,
          ease: 'Quad.easeIn',
          onComplete: () => {
            trailTimer.destroy();

            // 대폭발
            for (let ring = 0; ring < 3; ring++) {
              this.scene.time.delayedCall(ring * 40, () => {
                const blast = this.scene.add.graphics();
                blast.setPosition(targetX, targetY);
                blast.fillStyle([0x550066, 0x770088, 0x9900aa][ring], 0.7 - ring * 0.15);
                blast.fillCircle(0, 0, radius * (0.5 + ring * 0.3));
                blast.setDepth(1001);
                this.scene.tweens.add({
                  targets: blast,
                  scaleX: 1.5,
                  scaleY: 1.5,
                  alpha: 0,
                  duration: 300,
                  onComplete: () => blast.destroy(),
                });
              });
            }

            // 파편
            for (let p = 0; p < 8; p++) {
              const shard = this.scene.add.graphics();
              shard.setPosition(targetX, targetY);
              shard.fillStyle(0x880099, 0.8);
              shard.fillCircle(0, 0, 4 + Math.random() * 4);
              shard.setDepth(1002);
              const angle = Math.random() * Math.PI * 2;
              this.scene.tweens.add({
                targets: shard,
                x: shard.x + Math.cos(angle) * (40 + Math.random() * 60),
                y: shard.y + Math.sin(angle) * (40 + Math.random() * 60) - 30,
                alpha: 0,
                duration: 400,
                onComplete: () => shard.destroy(),
              });
            }

            // 데미지 히트박스
            const hitbox = new Phaser.Geom.Circle(targetX, targetY, radius);
            this.scene.events.emit('darkMeteorHit', hitbox, damage);

            meteor.destroy();
            this.scene.cameras.main.shake(150, 0.012);
          },
        });
      });
    }

    this.createCastEffect(0x330044);
    this.scene.cameras.main.flash(200, 50, 0, 80);
  }

  // A - 암흑 보호막
  public castDarkShield(): void {
    if (!this.canUseSkill('DARK_SHIELD') || this.isDead) return;

    this.useSkill('DARK_SHIELD');
    this.soundManager.playShield();
    this.darkShieldActive = true;
    this.darkShieldTimer = SKILL_TYPES.DARK_SHIELD.duration || 8000;
    this.damageReduction = SKILL_TYPES.DARK_SHIELD.damageReduction || 0.5;

    // 방어막 시각 효과
    const shield = this.scene.add.graphics();
    shield.setPosition(this.x, this.y - 25);
    shield.lineStyle(4, 0x4444ff, 0.8);
    shield.strokeCircle(0, 0, 50);
    shield.fillStyle(0x4444aa, 0.3);
    shield.fillCircle(0, 0, 50);
    shield.setDepth(this.y + 1);

    this.scene.tweens.add({
      targets: shield,
      scaleX: 0.8,
      scaleY: 0.8,
      alpha: 0.5,
      duration: 300,
      yoyo: true,
      repeat: 2,
      onComplete: () => shield.destroy(),
    });

    this.createCastEffect(0x4444aa);
  }

  // S - 저주
  public castCurse(): void {
    if (!this.canUseSkill('CURSE') || this.isDead) return;

    this.useSkill('CURSE');
    this.soundManager.playCurse();
    this.soundManager.playSkillVoice();

    const radius = 200;
    const duration = SKILL_TYPES.CURSE.duration || 6000;
    const debuffAmount = SKILL_TYPES.CURSE.debuffAmount || 0.3;

    // 저주 파동
    const curse = this.scene.add.graphics();
    curse.setPosition(this.x, this.y);
    curse.lineStyle(3, 0x660066, 0.8);
    curse.strokeCircle(0, 0, 20);
    curse.setDepth(this.y + 1);

    this.scene.tweens.add({
      targets: curse,
      scaleX: radius / 20,
      scaleY: radius / 20,
      alpha: 0,
      duration: 500,
      onComplete: () => curse.destroy(),
    });

    // 저주 룬
    for (let i = 0; i < 6; i++) {
      const rune = this.scene.add.graphics();
      const angle = (i / 6) * Math.PI * 2;
      rune.setPosition(this.x + Math.cos(angle) * 60, this.y + Math.sin(angle) * 30);
      rune.fillStyle(0x9900ff, 0.8);
      rune.fillRect(-5, -5, 10, 10);
      rune.rotation = Math.PI / 4;
      rune.setDepth(this.y + 2);

      this.scene.tweens.add({
        targets: rune,
        x: this.x + Math.cos(angle) * radius,
        y: this.y + Math.sin(angle) * (radius * 0.5),
        alpha: 0,
        rotation: Math.PI * 2,
        duration: 600,
        delay: i * 50,
        onComplete: () => rune.destroy(),
      });
    }

    // 저주 효과 적용 이벤트
    this.scene.events.emit('curseHit', new Phaser.Geom.Circle(this.x, this.y, radius), duration, debuffAmount);

    this.createCastEffect(0x660066);
  }

  // D - 영혼 흡수
  public castSoulDrain(): void {
    if (!this.canUseSkill('SOUL_DRAIN') || this.isDead) return;

    this.useSkill('SOUL_DRAIN');
    this.soundManager.playSoulDrain();
    this.soundManager.playSkillVoice();
    this.castingEffect = true;
    this.scene.time.delayedCall(400, () => this.castingEffect = false);

    const dir = this.facingRight ? 1 : -1;
    const range = 180;
    const damage = SKILL_TYPES.SOUL_DRAIN.damage + this.attack * 0.7;
    const healPercent = SKILL_TYPES.SOUL_DRAIN.healPercent || 0.5;

    // 영혼 흡수 빔
    const beam = this.scene.add.graphics();
    beam.setPosition(this.x, this.y - 25);

    // 빔 그리기
    beam.fillStyle(0x00ffcc, 0.6);
    beam.fillRect(dir * 20, -10, dir * range, 20);
    beam.fillStyle(0x88ffee, 0.4);
    beam.fillRect(dir * 20, -5, dir * range, 10);
    beam.setDepth(this.y + 1);

    this.scene.tweens.add({
      targets: beam,
      alpha: 0,
      scaleY: 0.5,
      duration: 400,
      onComplete: () => beam.destroy(),
    });

    // 영혼 파티클 (되돌아오는 효과)
    for (let i = 0; i < 10; i++) {
      this.scene.time.delayedCall(i * 30, () => {
        const soul = this.scene.add.graphics();
        soul.setPosition(this.x + dir * (range + 30), this.y - 25 + Phaser.Math.Between(-20, 20));
        soul.fillStyle(0x00ffcc, 0.8);
        soul.fillCircle(0, 0, 6);
        soul.setDepth(this.y + 2);

        this.scene.tweens.add({
          targets: soul,
          x: this.x,
          y: this.y - 25,
          alpha: 0.3,
          duration: 300,
          onComplete: () => soul.destroy(),
        });
      });
    }

    // 히트 영역
    const hitbox = new Phaser.Geom.Rectangle(
      this.x + (dir > 0 ? 20 : -range - 20),
      this.y - 40,
      range,
      50
    );
    this.scene.events.emit('soulDrainHit', hitbox, damage, healPercent, this);

    this.createCastEffect(0x00ffcc);
  }

  // F - 죽음의 파동
  public castDeathWave(): void {
    if (!this.canUseSkill('DEATH_WAVE') || this.isDead) return;

    this.useSkill('DEATH_WAVE');
    this.soundManager.playDeathWave();
    this.soundManager.playSkillVoice();
    this.castingEffect = true;
    this.scene.time.delayedCall(600, () => this.castingEffect = false);

    const damage = SKILL_TYPES.DEATH_WAVE.damage + this.attack * 1.2;
    const radius = SKILL_TYPES.DEATH_WAVE.radius || 220;

    // 시전 준비 - 에너지 수집
    for (let e = 0; e < 12; e++) {
      const energy = this.scene.add.graphics();
      const startAngle = (e / 12) * Math.PI * 2;
      const startDist = 80 + Math.random() * 40;
      energy.setPosition(this.x + Math.cos(startAngle) * startDist, this.y - 30 + Math.sin(startAngle) * startDist * 0.5);
      energy.fillStyle(0x8844aa, 0.8);
      energy.fillCircle(0, 0, 5);
      energy.setDepth(this.y + 1);

      this.scene.tweens.add({
        targets: energy,
        x: this.x,
        y: this.y - 30,
        scaleX: 0.5,
        scaleY: 0.5,
        duration: 200,
        delay: e * 15,
        onComplete: () => energy.destroy(),
      });
    }

    // 메인 폭발 (약간 딜레이 후)
    this.scene.time.delayedCall(180, () => {
      // 중앙 폭발
      const coreBlast = this.scene.add.graphics();
      coreBlast.setPosition(this.x, this.y - 20);
      coreBlast.fillStyle(0x9955cc, 0.9);
      coreBlast.fillCircle(0, 0, 40);
      coreBlast.fillStyle(0xcc88ff, 0.7);
      coreBlast.fillCircle(0, 0, 25);
      coreBlast.fillStyle(0xffffff, 0.5);
      coreBlast.fillCircle(0, 0, 10);
      coreBlast.setDepth(this.y + 5);

      this.scene.tweens.add({
        targets: coreBlast,
        scaleX: 2,
        scaleY: 2,
        alpha: 0,
        duration: 250,
        onComplete: () => coreBlast.destroy(),
      });

      // 죽음의 파동 - 5개의 동심원
      for (let i = 0; i < 5; i++) {
        this.scene.time.delayedCall(i * 80, () => {
          const wave = this.scene.add.graphics();
          wave.setPosition(this.x, this.y - 20);

          // 파동 라인
          wave.lineStyle(8 - i, [0x6622aa, 0x8833bb, 0x9944cc, 0xaa55dd, 0xbb66ee][i], 0.9 - i * 0.1);
          wave.strokeCircle(0, 0, 25);

          // 내부 필
          wave.fillStyle([0x440066, 0x550077, 0x660088, 0x770099, 0x8800aa][i], 0.3 - i * 0.05);
          wave.fillCircle(0, 0, 25);

          wave.setDepth(this.y + 2 + i);

          this.scene.tweens.add({
            targets: wave,
            scaleX: (radius / 25) * (1 + i * 0.1),
            scaleY: (radius / 25) * 0.5 * (1 + i * 0.1),
            alpha: 0,
            duration: 450,
            ease: 'Quad.easeOut',
            onComplete: () => wave.destroy(),
          });
        });
      }

      // 해골 파티클 (더 많이, 더 화려하게)
      for (let i = 0; i < 16; i++) {
        const skull = this.scene.add.graphics();
        skull.setPosition(this.x, this.y - 20);

        // 더 디테일한 해골
        skull.fillStyle(0xeeeedd, 0.9);
        skull.fillCircle(0, 0, 10);
        skull.fillStyle(0x6622aa, 0.8);
        skull.fillCircle(-3, -2, 3);
        skull.fillCircle(3, -2, 3);
        skull.fillStyle(0x220022);
        skull.fillRect(-4, 4, 8, 3);
        // 이빨
        skull.fillStyle(0xffffff, 0.7);
        for (let t = 0; t < 3; t++) {
          skull.fillRect(-3 + t * 2, 4, 1, 2);
        }

        skull.setDepth(this.y + 4);

        const angle = (i / 16) * Math.PI * 2;
        const dist = radius * (0.8 + Math.random() * 0.4);
        this.scene.tweens.add({
          targets: skull,
          x: skull.x + Math.cos(angle) * dist,
          y: skull.y + Math.sin(angle) * dist * 0.5 - 20,
          alpha: 0,
          rotation: Math.PI * 3,
          scaleX: 0.5,
          scaleY: 0.5,
          duration: 600,
          delay: Math.random() * 100,
          ease: 'Quad.easeOut',
          onComplete: () => skull.destroy(),
        });
      }

      // 영혼 파티클
      for (let sp = 0; sp < 20; sp++) {
        const spirit = this.scene.add.graphics();
        spirit.setPosition(this.x + Phaser.Math.Between(-30, 30), this.y - 20 + Phaser.Math.Between(-20, 20));
        spirit.fillStyle(0xaa77dd, 0.7);
        spirit.fillCircle(0, 0, 4 + Math.random() * 4);
        // 꼬리
        spirit.fillStyle(0x8855bb, 0.5);
        spirit.fillEllipse(0, 8, 4, 10);
        spirit.setDepth(this.y + 3);

        const spAngle = Math.random() * Math.PI * 2;
        const spDist = 50 + Math.random() * (radius - 50);
        this.scene.tweens.add({
          targets: spirit,
          x: spirit.x + Math.cos(spAngle) * spDist,
          y: spirit.y + Math.sin(spAngle) * spDist * 0.5 - 40,
          rotation: Math.random() * 2 - 1,
          alpha: 0,
          duration: 700,
          delay: sp * 20,
          onComplete: () => spirit.destroy(),
        });
      }

      // 바닥 균열 이펙트
      for (let c = 0; c < 8; c++) {
        const crack = this.scene.add.graphics();
        crack.setPosition(this.x, this.y + 25);
        const crackAngle = (c / 8) * Math.PI * 2;
        crack.lineStyle(3, 0x6622aa, 0.8);
        crack.beginPath();
        crack.moveTo(0, 0);
        let px = 0, py = 0;
        for (let seg = 0; seg < 5; seg++) {
          px += Math.cos(crackAngle + Phaser.Math.Between(-20, 20) * 0.01) * 25;
          py += Math.sin(crackAngle + Phaser.Math.Between(-20, 20) * 0.01) * 15;
          crack.lineTo(px, py);
        }
        crack.stroke();
        crack.setDepth(this.y - 1);

        this.scene.tweens.add({
          targets: crack,
          alpha: 0,
          duration: 600,
          delay: c * 30,
          onComplete: () => crack.destroy(),
        });
      }

      // 어둠 필드
      const darkness = this.scene.add.graphics();
      darkness.setPosition(this.x, this.y);
      darkness.fillStyle(0x110011, 0.6);
      darkness.fillCircle(0, -20, radius);
      darkness.setDepth(this.y);

      this.scene.tweens.add({
        targets: darkness,
        alpha: 0,
        scaleX: 1.2,
        scaleY: 0.8,
        duration: 700,
        onComplete: () => darkness.destroy(),
      });

      // 데미지 히트박스
      const hitbox = new Phaser.Geom.Circle(this.x, this.y, radius);
      this.scene.events.emit('deathWaveHit', hitbox, damage);

      this.scene.cameras.main.shake(350, 0.02);
      this.scene.cameras.main.flash(150, 80, 30, 120, false);
    });

    this.createCastEffect(0x8844aa);
  }

  private createCastEffect(color: number): void {
    // 시전 마법진
    const circle = this.scene.add.graphics();
    circle.setPosition(this.x, this.y + 20);
    circle.lineStyle(3, color, 0.8);
    circle.strokeCircle(0, 0, 25);

    // 룬 문양
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      circle.fillStyle(color, 0.6);
      circle.fillCircle(Math.cos(angle) * 20, Math.sin(angle) * 10, 4);
    }

    circle.setDepth(this.y - 1);

    this.scene.tweens.add({
      targets: circle,
      scaleX: 1.5,
      scaleY: 0.5,
      alpha: 0,
      duration: 400,
      onComplete: () => circle.destroy(),
    });
  }

  public takeDamage(amount: number, time: number): void {
    if (this.isDead || this.isInvincible) return;

    // 암흑 보호막 적용
    const actualDamage = Math.max(1, (amount - this.defense) * this.damageReduction);
    this.currentHealth -= actualDamage;

    // 피격 사운드
    this.soundManager.playPlayerHit();
    this.soundManager.playHitVoice();

    // 피격 효과
    this.isInvincible = true;
    this.invincibleTimer = 1;

    // 데미지 텍스트
    const dmgText = this.scene.add.text(this.x, this.y - 60, `${Math.floor(actualDamage)}`, {
      fontSize: '20px',
      color: '#FF4444',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(1000);

    this.scene.tweens.add({
      targets: dmgText,
      y: dmgText.y - 30,
      alpha: 0,
      duration: 600,
      onComplete: () => dmgText.destroy(),
    });

    // 콤보 리셋
    this.comboCount = 0;

    // 피격 이펙트
    const hit = this.scene.add.graphics();
    hit.setPosition(this.x, this.y - 30);
    hit.fillStyle(0xff0000, 0.5);
    hit.fillCircle(0, 0, 30);
    hit.setDepth(this.y + 1);

    this.scene.tweens.add({
      targets: hit,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 200,
      onComplete: () => hit.destroy(),
    });

    this.scene.cameras.main.shake(100, 0.008);

    if (this.currentHealth <= 0) {
      this.currentHealth = 0;
      this.die();
    }
  }

  public heal(amount: number): void {
    const healAmount = Math.min(amount, this.maxHealth - this.currentHealth);
    this.currentHealth += healAmount;

    // 힐 이펙트
    const healText = this.scene.add.text(this.x, this.y - 60, `+${Math.floor(healAmount)}`, {
      fontSize: '20px',
      color: '#44FF44',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(1000);

    this.scene.tweens.add({
      targets: healText,
      y: healText.y - 30,
      alpha: 0,
      duration: 600,
      onComplete: () => healText.destroy(),
    });

    // 힐 파티클
    for (let i = 0; i < 8; i++) {
      const particle = this.scene.add.graphics();
      particle.setPosition(this.x + Phaser.Math.Between(-20, 20), this.y + Phaser.Math.Between(-40, 10));
      particle.fillStyle(0x44ff44, 0.8);
      particle.fillCircle(0, 0, 4);
      particle.setDepth(this.y + 1);

      this.scene.tweens.add({
        targets: particle,
        y: particle.y - 30,
        alpha: 0,
        duration: 500,
        delay: i * 30,
        onComplete: () => particle.destroy(),
      });
    }
  }

  public gainExp(amount: number): void {
    this.currentExp += amount;

    while (this.currentExp >= this.expToNextLevel) {
      this.currentExp -= this.expToNextLevel;
      this.levelUp();
    }
  }

  public gainGold(amount: number): void {
    this.gold += amount;
    this.scene.events.emit('goldChanged', this.gold);
  }

  private levelUp(): void {
    this.level++;
    this.soundManager.playLevelUp();

    // 스탯 증가
    this.maxHealth += LEVEL_CONFIG.statGrowth.health;
    this.attack += LEVEL_CONFIG.statGrowth.attack;
    this.defense += LEVEL_CONFIG.statGrowth.defense;

    // 체력 회복
    this.currentHealth = this.maxHealth;

    // 다음 레벨 경험치
    this.expToNextLevel = Math.floor(LEVEL_CONFIG.baseExp * Math.pow(LEVEL_CONFIG.expMultiplier, this.level - 1));

    // 레벨업 이펙트
    this.createLevelUpEffect();
    this.scene.events.emit('levelUp', this.level);
  }

  private createLevelUpEffect(): void {
    // 레벨업 텍스트
    const lvlText = this.scene.add.text(this.x, this.y - 80, 'LEVEL UP!', {
      fontSize: '28px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(1000);

    this.scene.tweens.add({
      targets: lvlText,
      y: lvlText.y - 40,
      alpha: 0,
      duration: 1500,
      onComplete: () => lvlText.destroy(),
    });

    // 마법 파티클
    for (let i = 0; i < 20; i++) {
      const particle = this.scene.add.graphics();
      particle.setPosition(this.x, this.y - 30);
      particle.fillStyle(0xffd700, 0.9);
      particle.fillCircle(0, 0, 5);
      particle.setDepth(this.y + 1);

      const angle = (i / 20) * Math.PI * 2;
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * 80,
        y: particle.y + Math.sin(angle) * 50,
        alpha: 0,
        duration: 800,
        delay: i * 20,
        onComplete: () => particle.destroy(),
      });
    }

    // 기둥 이펙트
    const pillar = this.scene.add.graphics();
    pillar.setPosition(this.x, this.y);
    pillar.fillStyle(0xffd700, 0.4);
    pillar.fillRect(-30, -200, 60, 250);
    pillar.setDepth(this.y - 1);

    this.scene.tweens.add({
      targets: pillar,
      alpha: 0,
      duration: 1000,
      onComplete: () => pillar.destroy(),
    });
  }

  private die(): void {
    this.isDead = true;
    this.soundManager.playPlayerDeath();

    // 죽음 모션 - 회전 + 페이드
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      angle: 360,
      duration: 1000,
      ease: 'Quad.easeIn',
    });

    // 죽음 폭발 이펙트
    const deathEffect = this.scene.add.graphics();
    deathEffect.setPosition(this.x, this.y - 30);
    deathEffect.fillStyle(0x660033, 0.8);
    deathEffect.fillCircle(0, 0, 40);
    deathEffect.setDepth(this.y + 10);

    this.scene.tweens.add({
      targets: deathEffect,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 600,
      onComplete: () => deathEffect.destroy(),
    });

    // 영혼 파티클 상승
    for (let i = 0; i < 8; i++) {
      const soul = this.scene.add.graphics();
      soul.setPosition(this.x + Phaser.Math.Between(-20, 20), this.y - 20);
      soul.fillStyle(0xffffff, 0.6);
      soul.fillCircle(0, 0, 6 + Math.random() * 6);
      soul.setDepth(this.y + 11);

      this.scene.tweens.add({
        targets: soul,
        y: soul.y - 80 - Math.random() * 60,
        x: soul.x + Phaser.Math.Between(-30, 30),
        alpha: 0,
        duration: 1200 + i * 100,
        delay: i * 80,
        onComplete: () => soul.destroy(),
      });
    }

    this.scene.cameras.main.shake(300, 0.015);
    this.scene.cameras.main.flash(200, 80, 0, 40);

    this.scene.events.emit('playerDied');
  }

  public respawn(x: number, y: number): void {
    this.isDead = false;
    this.x = x;
    this.y = y;
    this.currentHealth = this.maxHealth;
    this.velocityX = 0;
    this.velocityY = 0;
    this.isInvincible = true;
    this.invincibleTimer = 2;
    this.angle = 0;
    this.setAlpha(1);
    this.darkShieldActive = false;
    this.damageReduction = 1.0;

    // 부활 이펙트
    const reviveEffect = this.scene.add.graphics();
    reviveEffect.setPosition(x, y);
    reviveEffect.fillStyle(0xffd700, 0.5);
    reviveEffect.fillCircle(0, -30, 50);
    reviveEffect.setDepth(y + 10);

    this.scene.tweens.add({
      targets: reviveEffect,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 600,
      onComplete: () => reviveEffect.destroy(),
    });
  }

  public addCombo(): void {
    const now = this.scene.time.now;
    if (now - this.lastHitTime < 3000) {
      this.comboCount++;
    } else {
      this.comboCount = 1;
    }
    this.lastHitTime = now;
  }

  public getComboCount(): number {
    const now = this.scene.time.now;
    if (now - this.lastHitTime > 3000) {
      this.comboCount = 0;
    }
    return this.comboCount;
  }

  public update(time: number, delta: number, groundY: number, platforms: any[] = []): void {
    if (this.isDead) return;

    this.animTimer += delta / 1000;

    // 무적 타이머
    if (this.isInvincible) {
      this.invincibleTimer -= delta / 1000;
      if (this.invincibleTimer <= 0) {
        this.isInvincible = false;
      }
    }

    // 암흑 보호막 타이머
    if (this.darkShieldActive) {
      this.darkShieldTimer -= delta;
      if (this.darkShieldTimer <= 0) {
        this.darkShieldActive = false;
        this.damageReduction = 1.0;
      }
    }

    // 대쉬 쿨다운
    if (this.dashCooldown > 0) {
      this.dashCooldown -= delta;
    }

    // 자연 회복
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + PLAYER_STATS.healthRegen * (delta / 1000));

    // 중력
    this.velocityY += PHYSICS.gravity * (delta / 1000);
    this.velocityY = Math.min(this.velocityY, PHYSICS.maxFallSpeed);

    // 위치 업데이트
    this.x += this.velocityX * (delta / 1000);
    this.y += this.velocityY * (delta / 1000);

    // 플랫폼 충돌
    this.isOnGround = false;
    for (const platform of platforms) {
      if (this.velocityY >= 0 &&
          this.y >= platform.y - 30 && this.y <= platform.y + 10 &&
          this.x >= platform.x && this.x <= platform.x + platform.width) {
        this.y = platform.y - 30;
        this.velocityY = 0;
        this.isOnGround = true;
        this.canDoubleJump = true;
        break;
      }
    }

    // 지면 충돌
    if (this.y >= groundY - 30) {
      this.y = groundY - 30;
      this.velocityY = 0;
      this.isOnGround = true;
      this.canDoubleJump = true;
    }

    // 속도 감쇠
    this.velocityX *= 0.85;

    // 스프라이트 업데이트
    this.drawPlayer();
    this.setDepth(this.y);
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
