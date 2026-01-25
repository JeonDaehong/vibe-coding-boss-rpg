import Phaser from 'phaser';
import { PHYSICS, PLAYER_STATS, LEVEL_CONFIG, SKILL_TYPES } from '../config/GameConfig';
import { MinionGhoul } from './MinionGhoul';
import { Ghoul } from './Ghoul';

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

  // 소환수
  public minionGhouls: MinionGhoul[] = [];
  public giantGhoul: Ghoul | null = null;

  // 콤보
  private comboCount: number = 0;
  private lastHitTime: number = 0;

  // 스프라이트
  private body_sprite!: Phaser.GameObjects.Graphics;
  private hair!: Phaser.GameObjects.Graphics;
  private staff!: Phaser.GameObjects.Graphics;
  private aura!: Phaser.GameObjects.Graphics;

  // 애니메이션
  private animTimer: number = 0;
  private walkFrame: number = 0;
  private castingEffect: boolean = false;

  // 히트박스
  public hitbox = { width: 40, height: 60 };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.scene = scene;

    // 스탯 초기화
    this.maxHealth = PLAYER_STATS.maxHealth;
    this.currentHealth = this.maxHealth;
    this.attack = PLAYER_STATS.baseAttack;
    this.defense = PLAYER_STATS.defense;
    this.expToNextLevel = LEVEL_CONFIG.baseExp;

    // 스킬 쿨다운 초기화
    for (const skill of Object.keys(SKILL_TYPES)) {
      this.skillCooldowns.set(skill, 0);
      this.lastSkillTime.set(skill, 0);
    }

    this.createSprite();
    scene.add.existing(this);
  }

  private createSprite(): void {
    // 오라 (뒤에 그림)
    this.aura = this.scene.add.graphics();
    this.add(this.aura);

    // 몸체
    this.body_sprite = this.scene.add.graphics();
    this.add(this.body_sprite);

    // 머리카락
    this.hair = this.scene.add.graphics();
    this.add(this.hair);

    // 지팡이
    this.staff = this.scene.add.graphics();
    this.add(this.staff);

    this.drawPlayer();
  }

  private drawPlayer(): void {
    this.body_sprite.clear();
    this.hair.clear();
    this.staff.clear();
    this.aura.clear();

    const bounce = Math.sin(this.animTimer * 8) * 2;
    const walk = Math.sin(this.animTimer * 12) * 4;
    const isWalking = Math.abs(this.velocityX) > 10;

    // 피격 시 깜빡임
    if (this.isInvincible && Math.floor(this.invincibleTimer * 10) % 2 === 0) {
      return;
    }

    // 암흑 보호막 활성화 시 오라
    if (this.darkShieldActive) {
      this.aura.fillStyle(0x4444aa, 0.3 + Math.sin(this.animTimer * 6) * 0.1);
      this.aura.fillCircle(0, -25, 45);
      this.aura.lineStyle(2, 0x6666ff, 0.6);
      this.aura.strokeCircle(0, -25, 45);
    }

    // 소환술사 오라 (기본)
    this.aura.fillStyle(0x9944ff, 0.15 + Math.sin(this.animTimer * 3) * 0.05);
    this.aura.fillCircle(0, -25, 35);

    // 다리 (도트 스타일)
    this.body_sprite.fillStyle(0x222233);
    // 왼다리
    const leftLegOffset = isWalking ? walk : 0;
    this.body_sprite.fillRect(-8, 5, 6, 20 + leftLegOffset * 0.3);
    // 오른다리
    const rightLegOffset = isWalking ? -walk : 0;
    this.body_sprite.fillRect(2, 5, 6, 20 + rightLegOffset * 0.3);

    // 부츠
    this.body_sprite.fillStyle(0x443355);
    this.body_sprite.fillRect(-10, 22 + leftLegOffset * 0.3, 10, 6);
    this.body_sprite.fillRect(0, 22 + rightLegOffset * 0.3, 10, 6);

    // 로브 (몸통)
    this.body_sprite.fillStyle(0x332244);
    this.body_sprite.fillRoundedRect(-15, -30 + bounce, 30, 40, 5);

    // 로브 디테일
    this.body_sprite.fillStyle(0x443366);
    this.body_sprite.fillRect(-12, -25 + bounce, 24, 3);
    this.body_sprite.fillRect(-12, -15 + bounce, 24, 3);
    this.body_sprite.fillRect(-12, -5 + bounce, 24, 3);

    // 로브 하이라이트
    this.body_sprite.fillStyle(0x554477, 0.5);
    this.body_sprite.fillRect(-13, -28 + bounce, 6, 35);

    // 벨트
    this.body_sprite.fillStyle(0x886644);
    this.body_sprite.fillRect(-14, 0 + bounce, 28, 5);
    // 버클
    this.body_sprite.fillStyle(0xffcc00);
    this.body_sprite.fillRect(-4, 0 + bounce, 8, 5);

    // 어깨
    this.body_sprite.fillStyle(0x443366);
    this.body_sprite.fillCircle(-15, -25 + bounce, 8);
    this.body_sprite.fillCircle(15, -25 + bounce, 8);

    // 팔
    const armSwing = isWalking ? Math.sin(this.animTimer * 12) * 8 : Math.sin(this.animTimer * 3) * 3;
    // 왼팔
    this.body_sprite.fillStyle(0x332244);
    this.body_sprite.fillRect(-22, -25 + bounce + armSwing, 8, 25);
    // 오른팔 (지팡이 든 팔)
    this.body_sprite.fillRect(14, -25 + bounce - armSwing, 8, 25);

    // 손
    this.body_sprite.fillStyle(0xffddcc);
    this.body_sprite.fillCircle(-18, 2 + bounce + armSwing, 5);
    this.body_sprite.fillCircle(18, 2 + bounce - armSwing, 5);

    // 얼굴 (여성 캐릭터)
    this.body_sprite.fillStyle(0xffddcc);
    this.body_sprite.fillCircle(0, -42 + bounce, 14);

    // 얼굴 하이라이트
    this.body_sprite.fillStyle(0xffeedd, 0.5);
    this.body_sprite.fillCircle(-4, -45 + bounce, 5);

    // 눈
    this.body_sprite.fillStyle(0x6644aa);
    this.body_sprite.fillEllipse(-5, -44 + bounce, 5, 4);
    this.body_sprite.fillEllipse(5, -44 + bounce, 5, 4);
    // 눈동자
    this.body_sprite.fillStyle(0x220033);
    this.body_sprite.fillCircle(-5, -44 + bounce, 2);
    this.body_sprite.fillCircle(5, -44 + bounce, 2);
    // 눈 하이라이트
    this.body_sprite.fillStyle(0xffffff);
    this.body_sprite.fillCircle(-6, -45 + bounce, 1);
    this.body_sprite.fillCircle(4, -45 + bounce, 1);

    // 눈썹
    this.body_sprite.lineStyle(1, 0x553366);
    this.body_sprite.beginPath();
    this.body_sprite.moveTo(-8, -48 + bounce);
    this.body_sprite.lineTo(-2, -48 + bounce);
    this.body_sprite.stroke();
    this.body_sprite.beginPath();
    this.body_sprite.moveTo(2, -48 + bounce);
    this.body_sprite.lineTo(8, -48 + bounce);
    this.body_sprite.stroke();

    // 볼터치
    this.body_sprite.fillStyle(0xffaaaa, 0.4);
    this.body_sprite.fillCircle(-9, -40 + bounce, 3);
    this.body_sprite.fillCircle(9, -40 + bounce, 3);

    // 입 (미소)
    this.body_sprite.lineStyle(1, 0xcc8888);
    this.body_sprite.beginPath();
    this.body_sprite.arc(0, -38 + bounce, 3, 0.2, Math.PI - 0.2, false);
    this.body_sprite.stroke();

    // 머리카락 (긴 보라색 머리)
    this.hair.fillStyle(0x6633aa);
    // 앞머리
    this.hair.fillRect(-12, -55 + bounce, 24, 12);
    // 앞머리 웨이브
    this.hair.fillTriangle(-14, -55 + bounce, -8, -60 + bounce, -2, -55 + bounce);
    this.hair.fillTriangle(2, -55 + bounce, 8, -60 + bounce, 14, -55 + bounce);

    // 옆머리
    this.hair.fillRect(-16, -52 + bounce, 5, 25);
    this.hair.fillRect(11, -52 + bounce, 5, 25);

    // 뒷머리 (길게)
    this.hair.fillRect(-14, -50 + bounce, 28, 8);
    this.hair.fillRoundedRect(-12, -42 + bounce, 24, 40, 5);

    // 머리카락 하이라이트
    this.hair.fillStyle(0x9955cc, 0.5);
    this.hair.fillRect(-10, -54 + bounce, 4, 10);
    this.hair.fillRect(2, -42 + bounce, 4, 25);

    // 마녀 모자
    this.hair.fillStyle(0x221133);
    // 모자 챙
    this.hair.fillEllipse(0, -55 + bounce, 24, 6);
    // 모자 본체
    this.hair.fillTriangle(-15, -55 + bounce, 0, -85 + bounce, 15, -55 + bounce);
    // 모자 밴드
    this.hair.fillStyle(0x9944ff);
    this.hair.fillRect(-12, -60 + bounce, 24, 4);
    // 모자 버클
    this.hair.fillStyle(0xffcc00);
    this.hair.fillCircle(0, -58 + bounce, 4);

    // 지팡이
    const staffX = 25;
    const staffY = -armSwing;

    // 지팡이 막대
    this.staff.fillStyle(0x442233);
    this.staff.fillRect(staffX - 3, -30 + bounce + staffY, 6, 55);

    // 지팡이 장식
    this.staff.fillStyle(0x553344);
    this.staff.fillRect(staffX - 5, -25 + bounce + staffY, 10, 6);
    this.staff.fillRect(staffX - 5, -5 + bounce + staffY, 10, 6);

    // 지팡이 머리 (해골)
    this.staff.fillStyle(0xdddddd);
    this.staff.fillCircle(staffX, -40 + bounce + staffY, 10);
    // 해골 눈
    this.staff.fillStyle(0x9944ff, 0.8 + Math.sin(this.animTimer * 5) * 0.2);
    this.staff.fillCircle(staffX - 3, -41 + bounce + staffY, 3);
    this.staff.fillCircle(staffX + 3, -41 + bounce + staffY, 3);
    // 해골 이빨
    this.staff.fillStyle(0xffffff);
    for (let i = 0; i < 4; i++) {
      this.staff.fillRect(staffX - 5 + i * 3, -34 + bounce + staffY, 2, 3);
    }

    // 시전 이펙트
    if (this.castingEffect) {
      this.aura.fillStyle(0xff6600, 0.6 + Math.sin(this.animTimer * 10) * 0.3);
      this.aura.fillCircle(staffX, -40 + bounce + staffY, 15);
      this.aura.lineStyle(2, 0xffaa00, 0.8);
      this.aura.strokeCircle(staffX, -40 + bounce + staffY, 18 + Math.sin(this.animTimer * 8) * 3);
    }
  }

  public moveLeft(): void {
    if (this.isDead) return;
    this.velocityX = -PHYSICS.playerSpeed;
    this.facingRight = false;
  }

  public moveRight(): void {
    if (this.isDead) return;
    this.velocityX = PHYSICS.playerSpeed;
    this.facingRight = true;
  }

  public jump(): void {
    if (this.isDead) return;

    if (this.isOnGround) {
      this.velocityY = -PHYSICS.playerJumpPower;
      this.isOnGround = false;
      this.canDoubleJump = true;
      this.createJumpEffect();
    } else if (this.canDoubleJump) {
      this.velocityY = -PHYSICS.doubleJumpPower;
      this.canDoubleJump = false;
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
    this.scene.time.delayedCall(100, () => this.castingEffect = false);

    const dir = this.facingRight ? 1 : -1;
    const startX = this.x + dir * 30;
    const startY = this.y - 30;

    // 파이어볼 생성
    const fireball = this.scene.add.graphics();
    fireball.setPosition(startX, startY);
    (fireball as any).velocityX = dir * 600;
    (fireball as any).damage = SKILL_TYPES.FIREBALL.damage + this.attack * 0.5;
    (fireball as any).isActive = true;

    // 파이어볼 그리기
    const drawFireball = () => {
      fireball.clear();
      const time = this.scene.time.now / 100;
      // 핵심
      fireball.fillStyle(0xffff00, 0.9);
      fireball.fillCircle(0, 0, 12);
      // 외곽 불꽃
      fireball.fillStyle(0xff6600, 0.8);
      fireball.fillCircle(0, 0, 18 + Math.sin(time) * 2);
      // 불꽃 꼬리
      for (let i = 0; i < 5; i++) {
        fireball.fillStyle(0xff4400, 0.6 - i * 0.1);
        fireball.fillCircle(-dir * (10 + i * 8), Math.sin(time + i) * 5, 10 - i * 1.5);
      }
    };

    // 파이어볼 리스트에 추가
    (this.scene as any).projectiles = (this.scene as any).projectiles || [];
    (this.scene as any).projectiles.push({
      graphics: fireball,
      update: () => {
        if (!(fireball as any).isActive) return;
        fireball.x += (fireball as any).velocityX * (1 / 60);
        fireball.setDepth(fireball.y);
        drawFireball();

        // 화면 밖 체크
        if (fireball.x < this.scene.cameras.main.scrollX - 100 ||
            fireball.x > this.scene.cameras.main.scrollX + 1400) {
          (fireball as any).isActive = false;
          fireball.destroy();
        }
      },
      damage: (fireball as any).damage,
      hitbox: { x: fireball.x, y: fireball.y, width: 30, height: 30 },
      getHitbox: () => new Phaser.Geom.Rectangle(fireball.x - 15, fireball.y - 15, 30, 30),
      destroy: () => {
        (fireball as any).isActive = false;
        // 폭발 이펙트
        const explosion = this.scene.add.graphics();
        explosion.setPosition(fireball.x, fireball.y);
        explosion.fillStyle(0xff6600, 0.8);
        explosion.fillCircle(0, 0, 25);
        explosion.fillStyle(0xffff00, 0.6);
        explosion.fillCircle(0, 0, 15);
        explosion.setDepth(fireball.y + 1);

        this.scene.tweens.add({
          targets: explosion,
          scaleX: 2,
          scaleY: 2,
          alpha: 0,
          duration: 200,
          onComplete: () => explosion.destroy(),
        });
        fireball.destroy();
      },
    });

    // 시전 이펙트
    this.createCastEffect(0xff6600);
  }

  // Q - 구울 소환
  public summonGhoulMinion(): void {
    if (!this.canUseSkill('GHOUL_SUMMON') || this.isDead) return;
    if (this.minionGhouls.length >= ((SKILL_TYPES as any).GHOUL_SUMMON.maxCount || 3)) {
      // 가장 오래된 구울 제거
      const oldest = this.minionGhouls.shift();
      if (oldest) oldest.destroy();
    }

    this.useSkill('GHOUL_SUMMON');
    this.castingEffect = true;
    this.scene.time.delayedCall(300, () => this.castingEffect = false);

    const spawnX = this.x + (this.facingRight ? 50 : -50);
    const ghoul = new MinionGhoul(this.scene, spawnX, this.y, this);
    this.minionGhouls.push(ghoul);

    // 소환수 리스트에 추가
    (this.scene as any).summons = (this.scene as any).summons || [];
    (this.scene as any).summons.push(ghoul);

    this.createCastEffect(0x664488);
  }

  // W - 뼈가시 (관통)
  public castBoneSpike(): void {
    if (!this.canUseSkill('BONE_SPIKE') || this.isDead) return;

    this.useSkill('BONE_SPIKE');
    this.castingEffect = true;
    this.scene.time.delayedCall(200, () => this.castingEffect = false);

    const dir = this.facingRight ? 1 : -1;
    const damage = SKILL_TYPES.BONE_SPIKE.damage + this.attack * 0.8;

    // 럴커 스타일 뼈 가시 - 여러 개가 연속으로 나옴
    for (let i = 0; i < 8; i++) {
      this.scene.time.delayedCall(i * 60, () => {
        const spikeX = this.x + dir * (60 + i * 50);
        const spikeY = this.y + 20;

        // 뼈 가시 스프라이트
        const spike = this.scene.add.graphics();
        spike.setPosition(spikeX, spikeY);

        // 땅에서 솟아오르는 뼈
        spike.fillStyle(0xffffcc);
        spike.fillTriangle(-8, 0, 0, -60 - Math.random() * 20, 8, 0);
        spike.fillTriangle(-5, -10, 0, -70 - Math.random() * 15, 5, -10);
        spike.fillTriangle(-12, 0, -4, -40, 0, 0);
        spike.fillTriangle(0, 0, 4, -40, 12, 0);

        // 어둠 하이라이트
        spike.fillStyle(0xccccaa, 0.5);
        spike.fillTriangle(-6, 0, -2, -55, 2, 0);

        spike.setDepth(spikeY);
        spike.setScale(0, 0);

        // 솟아오르는 애니메이션
        this.scene.tweens.add({
          targets: spike,
          scaleY: 1,
          scaleX: 1,
          duration: 100,
          ease: 'Back.easeOut',
          onComplete: () => {
            // 데미지 체크
            const hitbox = new Phaser.Geom.Rectangle(spikeX - 20, spikeY - 80, 40, 80);
            this.scene.events.emit('boneSpikeHit', hitbox, damage);

            // 사라지는 애니메이션
            this.scene.time.delayedCall(200, () => {
              this.scene.tweens.add({
                targets: spike,
                scaleY: 0,
                alpha: 0,
                duration: 150,
                onComplete: () => spike.destroy(),
              });
            });
          },
        });

        // 땅 흔들림 파티클
        const dust = this.scene.add.graphics();
        dust.setPosition(spikeX, spikeY);
        dust.fillStyle(0x666666, 0.6);
        for (let j = 0; j < 3; j++) {
          dust.fillCircle((j - 1) * 10, 5, 6);
        }
        dust.setDepth(spikeY - 1);

        this.scene.tweens.add({
          targets: dust,
          y: dust.y - 20,
          alpha: 0,
          scaleX: 1.5,
          duration: 300,
          onComplete: () => dust.destroy(),
        });
      });
    }

    this.createCastEffect(0xffffcc);
    this.scene.cameras.main.shake(200, 0.005);
  }

  // E - 시체 폭탄
  public castCorpseBomb(): void {
    if (!this.canUseSkill('CORPSE_BOMB') || this.isDead) return;

    this.useSkill('CORPSE_BOMB');
    this.castingEffect = true;
    this.scene.time.delayedCall(300, () => this.castingEffect = false);

    const dir = this.facingRight ? 1 : -1;
    const targetX = this.x + dir * 200;
    const targetY = this.y;
    const damage = SKILL_TYPES.CORPSE_BOMB.damage + this.attack;
    const radius = SKILL_TYPES.CORPSE_BOMB.radius || 120;

    // 시체 폭탄 투사체
    const bomb = this.scene.add.graphics();
    bomb.setPosition(this.x + dir * 30, this.y - 20);

    // 시체 모양 (구체)
    bomb.fillStyle(0x556633);
    bomb.fillCircle(0, 0, 15);
    bomb.fillStyle(0x88aa44, 0.5);
    bomb.fillCircle(-3, -3, 6);
    // 독기
    bomb.fillStyle(0x44ff44, 0.4);
    bomb.fillCircle(5, -5, 8);

    bomb.setDepth(this.y + 1);

    // 포물선 이동
    this.scene.tweens.add({
      targets: bomb,
      x: targetX,
      y: targetY,
      duration: 500,
      ease: 'Quad.easeIn',
      onUpdate: () => {
        // 궤적에 독기 파티클
        const trail = this.scene.add.graphics();
        trail.setPosition(bomb.x, bomb.y);
        trail.fillStyle(0x88ff44, 0.5);
        trail.fillCircle(0, 0, 5 + Math.random() * 5);
        trail.setDepth(bomb.depth - 1);

        this.scene.tweens.add({
          targets: trail,
          alpha: 0,
          scaleX: 0.5,
          scaleY: 0.5,
          duration: 200,
          onComplete: () => trail.destroy(),
        });
      },
      onComplete: () => {
        bomb.destroy();

        // 폭발!
        const explosion = this.scene.add.graphics();
        explosion.setPosition(targetX, targetY);

        // 폭발 원
        explosion.fillStyle(0x88ff44, 0.7);
        explosion.fillCircle(0, 0, radius);
        explosion.fillStyle(0xccff88, 0.5);
        explosion.fillCircle(0, 0, radius * 0.6);
        explosion.fillStyle(0xffffff, 0.3);
        explosion.fillCircle(0, 0, radius * 0.3);
        explosion.setDepth(targetY + 2);

        this.scene.tweens.add({
          targets: explosion,
          scaleX: 1.5,
          scaleY: 1.5,
          alpha: 0,
          duration: 400,
          onComplete: () => explosion.destroy(),
        });

        // 독 파티클
        for (let i = 0; i < 15; i++) {
          const particle = this.scene.add.graphics();
          particle.setPosition(targetX, targetY);
          particle.fillStyle(0x88ff44, 0.8);
          particle.fillCircle(0, 0, 8 + Math.random() * 8);
          particle.setDepth(targetY + 1);

          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * radius;
          this.scene.tweens.add({
            targets: particle,
            x: particle.x + Math.cos(angle) * dist,
            y: particle.y + Math.sin(angle) * dist - 30,
            alpha: 0,
            duration: 600,
            onComplete: () => particle.destroy(),
          });
        }

        // 데미지 히트박스
        const hitbox = new Phaser.Geom.Circle(targetX, targetY, radius);
        this.scene.events.emit('corpseBombHit', hitbox, damage);

        this.scene.cameras.main.shake(200, 0.01);
      },
    });

    this.createCastEffect(0x88ff44);
  }

  // R - 거대 구울 소환 (각성기)
  public summonGiantGhoul(): void {
    if (!this.canUseSkill('GIANT_GHOUL') || this.isDead) return;
    if (this.giantGhoul && this.giantGhoul.isAlive) {
      // 이미 구울이 있으면 소환 불가
      return;
    }

    this.useSkill('GIANT_GHOUL');
    this.castingEffect = true;
    this.scene.time.delayedCall(500, () => this.castingEffect = false);

    const spawnX = this.x + (this.facingRight ? 80 : -80);
    this.giantGhoul = new Ghoul(this.scene, spawnX, this.y, this);

    // 소환수 리스트에 추가
    (this.scene as any).summons = (this.scene as any).summons || [];
    (this.scene as any).summons.push(this.giantGhoul);

    this.createCastEffect(0x663399);

    // 화면 연출
    this.scene.cameras.main.flash(300, 100, 50, 150);
  }

  // A - 암흑 보호막
  public castDarkShield(): void {
    if (!this.canUseSkill('DARK_SHIELD') || this.isDead) return;

    this.useSkill('DARK_SHIELD');
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
    this.castingEffect = true;
    this.scene.time.delayedCall(500, () => this.castingEffect = false);

    const damage = SKILL_TYPES.DEATH_WAVE.damage + this.attack * 1.2;
    const radius = SKILL_TYPES.DEATH_WAVE.radius || 200;

    // 죽음의 파동 - 동심원 확산
    for (let i = 0; i < 3; i++) {
      this.scene.time.delayedCall(i * 150, () => {
        const wave = this.scene.add.graphics();
        wave.setPosition(this.x, this.y - 20);
        wave.lineStyle(5, 0x220022, 0.9);
        wave.strokeCircle(0, 0, 30);
        wave.fillStyle(0x440044, 0.4);
        wave.fillCircle(0, 0, 30);
        wave.setDepth(this.y + 2);

        this.scene.tweens.add({
          targets: wave,
          scaleX: radius / 30,
          scaleY: (radius / 30) * 0.6,
          alpha: 0,
          duration: 400,
          onComplete: () => wave.destroy(),
        });
      });
    }

    // 해골 파티클
    for (let i = 0; i < 8; i++) {
      const skull = this.scene.add.graphics();
      skull.setPosition(this.x, this.y - 20);

      // 해골 그리기
      skull.fillStyle(0xdddddd, 0.8);
      skull.fillCircle(0, 0, 8);
      skull.fillStyle(0x220022);
      skull.fillCircle(-3, -1, 2);
      skull.fillCircle(3, -1, 2);
      skull.fillRect(-3, 3, 6, 2);

      skull.setDepth(this.y + 3);

      const angle = (i / 8) * Math.PI * 2;
      this.scene.tweens.add({
        targets: skull,
        x: skull.x + Math.cos(angle) * radius,
        y: skull.y + Math.sin(angle) * radius * 0.6,
        alpha: 0,
        rotation: Math.PI * 2,
        duration: 500,
        delay: 100,
        onComplete: () => skull.destroy(),
      });
    }

    // 어둠 이펙트
    const darkness = this.scene.add.graphics();
    darkness.setPosition(this.x, this.y);
    darkness.fillStyle(0x000000, 0.5);
    darkness.fillCircle(0, 0, radius);
    darkness.setDepth(this.y);

    this.scene.tweens.add({
      targets: darkness,
      alpha: 0,
      duration: 600,
      onComplete: () => darkness.destroy(),
    });

    // 데미지 히트박스
    const hitbox = new Phaser.Geom.Circle(this.x, this.y, radius);
    this.scene.events.emit('deathWaveHit', hitbox, damage);

    this.scene.cameras.main.shake(300, 0.015);
    this.createCastEffect(0x220022);
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

    // 죽음 이펙트
    const deathEffect = this.scene.add.graphics();
    deathEffect.setPosition(this.x, this.y - 30);
    deathEffect.fillStyle(0x9944ff, 0.8);
    deathEffect.fillCircle(0, 0, 40);
    deathEffect.setDepth(this.y + 10);

    this.scene.tweens.add({
      targets: deathEffect,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 500,
      onComplete: () => deathEffect.destroy(),
    });

    // 영혼 이펙트
    const soul = this.scene.add.graphics();
    soul.setPosition(this.x, this.y - 30);
    soul.fillStyle(0xffffff, 0.6);
    soul.fillCircle(0, 0, 20);
    soul.setDepth(this.y + 11);

    this.scene.tweens.add({
      targets: soul,
      y: soul.y - 100,
      alpha: 0,
      duration: 1500,
      onComplete: () => soul.destroy(),
    });

    this.setAlpha(0.3);
    this.scene.events.emit('playerDied');
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

    // 방향 설정
    this.setScale(this.facingRight ? 1 : -1, 1);

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
