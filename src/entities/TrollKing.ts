import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/GameConfig';

/**
 * 암흑군주 모르가스 (Dark Lord Morgas)
 * Dark fantasy boss with 7 attack patterns and 3 phases.
 * Keeps the same public interface as the original TrollKing.
 */
export class TrollKing extends Phaser.GameObjects.Container {
  public scene: Phaser.Scene;

  // --- Stats ---
  public currentHealth: number;
  public maxHealth: number = 3000;
  public attack: number = 50;
  public defense: number = 12;
  public isDead: boolean = false;
  public isCursed: boolean = false;
  public curseTimer: number = 0;
  private curseDebuff: number = 1.0;

  private readonly EXP_REWARD = 800;
  private readonly GOLD_REWARD = 500;
  private readonly MAP_WIDTH = 1600;

  // --- Phase ---
  private currentPhase: number = 0; // 0,1,2
  private damageMult: number = 1.0;
  private attackSpeedMult: number = 1.0;

  // --- Physics ---
  private velocityX: number = 0;
  private velocityY: number = 0;
  private isOnGround: boolean = false;
  private facingRight: boolean = false;
  private patrolDir: number = 1; // 1=right, -1=left

  // --- Combat ---
  private target: any = null;
  private lastAttackTime: number = 0;
  private isAttacking: boolean = false;
  private baseCooldown: number = 3000;

  // --- Graphics children ---
  private body_sprite!: Phaser.GameObjects.Graphics;
  private auraGfx!: Phaser.GameObjects.Graphics;
  private healthBarBg!: Phaser.GameObjects.Graphics;
  private healthBar!: Phaser.GameObjects.Graphics;
  private nameText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;

  // --- Animation ---
  private animTimer: number = 0;
  private hitFlash: boolean = false;

  // --- Active projectiles / effects ---
  private activeOrbs: { gfx: Phaser.GameObjects.Graphics; vx: number; vy: number; x: number; y: number; trackTime: number; born: number }[] = [];
  private deathFieldGfx: Phaser.GameObjects.Graphics | null = null;
  private deathFieldTimer: number = 0;
  private deathFieldX: number = 0;
  private deathFieldY: number = 0;

  // --- Summon attack ---
  private summonAttackCooldown: number = 0;

  // --- Void pull state ---
  private voidPullActive: boolean = false;
  private voidPullTimer: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    this.scene = scene;
    this.currentHealth = this.maxHealth;

    this.createSprite();
    this.createHealthBar();
    this.createBossIntro();

    scene.add.existing(this);
  }

  // ===================== SPRITE CREATION =====================

  private createSprite(): void {
    this.auraGfx = this.scene.add.graphics();
    this.add(this.auraGfx);

    this.body_sprite = this.scene.add.graphics();
    this.add(this.body_sprite);

    this.drawBoss();
  }

  private drawBoss(): void {
    this.body_sprite.clear();
    this.auraGfx.clear();

    const breath = Math.sin(this.animTimer * 2) * 3;
    const idle = Math.sin(this.animTimer * 3) * 2;
    const flash = this.hitFlash;

    // === Dark aura (phase 1+) ===
    if (this.currentPhase >= 1) {
      const auraAlpha = 0.15 + Math.sin(this.animTimer * 4) * 0.08;
      const auraRadius = this.currentPhase >= 2 ? 140 : 110;
      this.auraGfx.fillStyle(0x330066, auraAlpha);
      this.auraGfx.fillCircle(0, -50, auraRadius);

      // shadow tendrils
      for (let i = 0; i < 6; i++) {
        const angle = this.animTimer * 1.5 + (i / 6) * Math.PI * 2;
        const tx = Math.cos(angle) * (auraRadius - 20);
        const ty = -50 + Math.sin(angle) * (auraRadius - 30);
        this.auraGfx.fillStyle(0x220044, 0.4);
        this.auraGfx.fillEllipse(tx, ty, 18, 8);
      }
    }

    // === Phase 2 dark flames ===
    if (this.currentPhase >= 2) {
      for (let i = 0; i < 8; i++) {
        const fx = -40 + (i / 8) * 80;
        const fy = -140 + Math.sin(this.animTimer * 6 + i) * 15 - 10;
        this.auraGfx.fillStyle(0x660033, 0.5 + Math.sin(this.animTimer * 8 + i * 2) * 0.3);
        this.auraGfx.fillEllipse(fx, fy + breath, 10, 20);
      }
    }

    // === Dark particles floating around ===
    for (let i = 0; i < 10; i++) {
      const pAngle = this.animTimer * 0.8 + (i / 10) * Math.PI * 2;
      const pDist = 60 + Math.sin(this.animTimer * 2 + i) * 20;
      const px = Math.cos(pAngle) * pDist;
      const py = -60 + Math.sin(pAngle) * pDist * 0.5;
      this.body_sprite.fillStyle(0x8844cc, 0.3 + Math.sin(this.animTimer * 3 + i) * 0.2);
      this.body_sprite.fillCircle(px, py + breath, 3);
    }

    // === Dark robes (body) ===
    const robeColor = flash ? 0xffffff : 0x110022;
    this.body_sprite.fillStyle(robeColor);
    // main robe shape - wide at bottom, narrow at top
    this.body_sprite.fillTriangle(-50, 80, 50, 80, 0, -60 + breath);
    this.body_sprite.fillRoundedRect(-40, -70 + breath, 80, 100, 10);

    // robe bottom detail
    this.body_sprite.fillStyle(flash ? 0xffffff : 0x0a0015);
    this.body_sprite.fillRect(-50, 60, 100, 20);

    // === Hood ===
    this.body_sprite.fillStyle(flash ? 0xffffff : 0x110022);
    this.body_sprite.fillCircle(0, -90 + breath + idle, 38);
    // hood top point
    this.body_sprite.fillTriangle(-30, -115 + breath + idle, 30, -115 + breath + idle, 0, -140 + breath + idle);

    // === Face shadow ===
    this.body_sprite.fillStyle(0x050008);
    this.body_sprite.fillEllipse(0, -85 + breath + idle, 30, 24);

    // === Glowing purple eyes ===
    const eyeGlow = 0.6 + Math.sin(this.animTimer * 4) * 0.3;
    const eyeColor = this.currentPhase >= 2 ? 0xff2222 : 0xaa44ff;
    // eye glow halos
    this.body_sprite.fillStyle(eyeColor, eyeGlow * 0.3);
    this.body_sprite.fillCircle(-10, -88 + breath + idle, 8);
    this.body_sprite.fillCircle(10, -88 + breath + idle, 8);
    // eyes
    this.body_sprite.fillStyle(flash ? 0xffffff : eyeColor, eyeGlow);
    this.body_sprite.fillCircle(-10, -88 + breath + idle, 4);
    this.body_sprite.fillCircle(10, -88 + breath + idle, 4);
    // bright center
    this.body_sprite.fillStyle(0xffffff, 0.8);
    this.body_sprite.fillCircle(-10, -89 + breath + idle, 1.5);
    this.body_sprite.fillCircle(10, -89 + breath + idle, 1.5);

    // === Spectral crown ===
    const crownAlpha = 0.6 + Math.sin(this.animTimer * 3) * 0.2;
    this.body_sprite.fillStyle(0x8800aa, crownAlpha);
    this.body_sprite.fillRect(-25, -135 + breath + idle, 50, 8);
    for (let i = 0; i < 5; i++) {
      this.body_sprite.fillTriangle(
        -22 + i * 11, -135 + breath + idle,
        -17 + i * 11, -152 + breath + idle,
        -12 + i * 11, -135 + breath + idle
      );
    }
    // crown gems - purple glow
    this.body_sprite.fillStyle(0xcc66ff, crownAlpha);
    this.body_sprite.fillCircle(0, -133 + breath + idle, 4);
    this.body_sprite.fillCircle(-15, -131 + breath + idle, 3);
    this.body_sprite.fillCircle(15, -131 + breath + idle, 3);

    // === Shadow tendrils from robe bottom ===
    for (let i = 0; i < 5; i++) {
      const tx = -40 + i * 20;
      const tendrilLen = 15 + Math.sin(this.animTimer * 3 + i * 1.5) * 8;
      this.body_sprite.fillStyle(0x110022, 0.5);
      this.body_sprite.fillEllipse(tx, 80 + tendrilLen * 0.5, 6, tendrilLen);
    }

    // === Arms (sleeves) ===
    const armSwing = this.isAttacking ? 20 : Math.sin(this.animTimer * 2.5) * 6;
    this.body_sprite.fillStyle(flash ? 0xffffff : 0x110022);
    // left arm
    this.body_sprite.fillRoundedRect(-65, -55 + breath + armSwing, 25, 70, 8);
    // right arm
    this.body_sprite.fillRoundedRect(40, -55 + breath - armSwing, 25, 70, 8);

    // skeletal hands glow
    this.body_sprite.fillStyle(0x553388, 0.6);
    this.body_sprite.fillCircle(-52, 20 + breath + armSwing, 8);
    this.body_sprite.fillCircle(52, 20 + breath - armSwing, 8);

    // === Curse overlay ===
    if (this.isCursed) {
      this.body_sprite.lineStyle(3, 0x9944ff, 0.6 + Math.sin(this.animTimer * 8) * 0.3);
      this.body_sprite.strokeCircle(0, -50, 80);
    }
  }

  // ===================== HEALTH BAR =====================

  private createHealthBar(): void {
    const barWidth = 400;
    const barX = GAME_WIDTH / 2 - barWidth / 2;
    const barY = 50;

    this.healthBarBg = this.scene.add.graphics();
    this.healthBarBg.fillStyle(0x0a000f, 0.9);
    this.healthBarBg.fillRoundedRect(barX - 10, barY - 10, barWidth + 20, 40, 10);
    this.healthBarBg.lineStyle(3, 0x6622aa);
    this.healthBarBg.strokeRoundedRect(barX - 10, barY - 10, barWidth + 20, 40, 10);
    this.healthBarBg.setScrollFactor(0);
    this.healthBarBg.setDepth(1000);

    this.healthBar = this.scene.add.graphics();
    this.healthBar.setScrollFactor(0);
    this.healthBar.setDepth(1001);
    this.updateHealthBar();

    this.nameText = this.scene.add.text(GAME_WIDTH / 2, barY - 25, '암흑군주 모르가스', {
      fontSize: '24px',
      color: '#AA44FF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1002);

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
    const percent = Math.max(0, this.currentHealth / this.maxHealth);

    let color = 0x8844cc;
    if (this.currentPhase === 1) color = 0xaa22aa;
    if (this.currentPhase === 2) color = 0xff2244;

    this.healthBar.fillStyle(color);
    this.healthBar.fillRoundedRect(barX, barY, barWidth * percent, 20, 5);

    this.healthBar.fillStyle(0xffffff, 0.25);
    this.healthBar.fillRoundedRect(barX, barY, barWidth * percent, 8, { tl: 5, tr: 5, bl: 0, br: 0 });

    // phase dividers at 70% and 30%
    const markers = [0.7, 0.3];
    for (const m of markers) {
      const lineX = barX + barWidth * m;
      this.healthBar.lineStyle(2, 0xffffff, 0.5);
      this.healthBar.beginPath();
      this.healthBar.moveTo(lineX, barY);
      this.healthBar.lineTo(lineX, barY + 20);
      this.healthBar.stroke();
    }
  }

  // ===================== BOSS INTRO =====================

  private createBossIntro(): void {
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x0a000f, 0.8);
    overlay.fillRect(0, 0, GAME_WIDTH, 720);
    overlay.setScrollFactor(0);
    overlay.setDepth(999);

    const bossName = this.scene.add.text(GAME_WIDTH / 2, 300, '암흑군주 모르가스', {
      fontSize: '64px',
      color: '#AA44FF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setAlpha(0);

    const subText = this.scene.add.text(GAME_WIDTH / 2, 360, '- Dark Lord Morgas -', {
      fontSize: '28px',
      color: '#6622AA',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000).setAlpha(0);

    this.scene.tweens.add({ targets: bossName, alpha: 1, duration: 500 });
    this.scene.tweens.add({ targets: subText, alpha: 1, duration: 500, delay: 300 });

    this.scene.time.delayedCall(2000, () => {
      this.scene.tweens.add({
        targets: [overlay, bossName, subText],
        alpha: 0,
        duration: 500,
        onComplete: () => { overlay.destroy(); bossName.destroy(); subText.destroy(); },
      });
    });

    this.scene.cameras.main.shake(500, 0.02);
  }

  // ===================== PUBLIC INTERFACE =====================

  public get isAlive(): boolean {
    return !this.isDead;
  }

  public setTarget(target: any): void {
    this.target = target;
  }

  public applyCurse(duration: number, debuffAmount: number): void {
    this.isCursed = true;
    this.curseDebuff = 1 - debuffAmount;
    this.curseTimer = duration;
  }

  public getHitbox(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(this.x - 50, this.y - 150, 100, 230);
  }

  public takeDamage(amount: number, knockbackDir: number, time: number): boolean {
    if (this.isDead) return false;

    const actualDamage = Math.max(1, amount - this.defense);
    this.currentHealth -= actualDamage;
    this.hitFlash = true;
    this.updateHealthBar();

    // damage text
    const dmgText = this.scene.add.text(
      this.x + Phaser.Math.Between(-30, 30), this.y - 120,
      `${Math.floor(actualDamage)}`,
      { fontSize: '24px', color: '#FFFFFF', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 }
    ).setOrigin(0.5).setDepth(1000);

    this.scene.tweens.add({
      targets: dmgText, y: dmgText.y - 40, alpha: 0, duration: 600,
      onComplete: () => dmgText.destroy(),
    });

    this.velocityX = knockbackDir * 20;

    if (this.currentHealth <= 0) {
      this.die();
    }

    return true;
  }

  // ===================== UPDATE =====================

  public update(time: number, delta: number, groundY: number, summons: any[] = []): void {
    if (this.isDead) return;

    this.animTimer += delta / 1000;

    // curse timer
    if (this.isCursed) {
      this.curseTimer -= delta;
      if (this.curseTimer <= 0) {
        this.isCursed = false;
        this.curseDebuff = 1.0;
      }
    }

    this.attackNearbySummons(time, summons);
    this.checkPhase();
    this.updateAI(time, delta);
    this.updateOrbs(time, delta);
    this.updateDeathField(time, delta);
    this.updateVoidPull(delta);

    // gravity
    this.velocityY += 1200 * (delta / 1000);
    this.velocityY = Math.min(this.velocityY, 800);

    this.x += this.velocityX * (delta / 1000);
    this.y += this.velocityY * (delta / 1000);

    // ground
    if (this.y >= groundY - 90) {
      this.y = groundY - 90;
      this.velocityY = 0;
      this.isOnGround = true;
    }

    // patrol boundaries
    if (this.x < 100) { this.x = 100; this.patrolDir = 1; }
    if (this.x > this.MAP_WIDTH - 100) { this.x = this.MAP_WIDTH - 100; this.patrolDir = -1; }

    if (this.hitFlash) this.hitFlash = false;

    this.setScale(this.facingRight ? -1 : 1, 1);
    this.drawBoss();
    this.setDepth(this.y);
  }

  // ===================== AI =====================

  private updateAI(time: number, delta: number): void {
    if (!this.target || this.isAttacking) {
      // patrol when no target or attacking
      if (!this.isAttacking && !this.target) {
        this.velocityX = this.patrolDir * 40;
      }
      return;
    }

    const dx = this.target.x - this.x;
    const dist = Math.abs(dx);
    this.facingRight = dx > 0;

    const cooldown = this.baseCooldown / this.attackSpeedMult;

    if (time - this.lastAttackTime > cooldown) {
      // choose random attack
      this.performRandomAttack(time);
    } else {
      // patrol / chase
      if (dist > 200) {
        // chase toward player at patrol speed
        this.velocityX = (dx > 0 ? 1 : -1) * 40;
      } else {
        this.velocityX *= 0.9;
      }
    }
  }

  private performRandomAttack(time: number): void {
    const available: number[] = [0, 1, 2, 3, 4, 5, 6];
    // phase 1+ add Dark Nova (7)
    if (this.currentPhase >= 1) available.push(7);
    // phase 2+ add Death Field (8)
    if (this.currentPhase >= 2) available.push(8);

    const chosen = available[Math.floor(Math.random() * available.length)];

    switch (chosen) {
      case 0: this.attackShadowSlash(time); break;
      case 1: this.attackDarkOrbs(time); break;
      case 2: this.attackGroundEruption(time); break;
      case 3: this.attackVoidPull(time); break;
      case 4: this.attackSoulChains(time); break;
      case 5: this.attackShadowRain(time); break;
      case 6: this.attackTeleportStrike(time); break;
      case 7: this.attackDarkNova(time); break;
      case 8: this.attackDeathField(time); break;
    }
  }

  // ===================== ATTACK PATTERNS =====================

  /** 안전한 scene 접근 확인 */
  private get sceneActive(): boolean {
    return !this.isDead && this.scene && this.active;
  }

  /** (a) Shadow Slash: fast dark arc in front, range 180px */
  private attackShadowSlash(time: number): void {
    this.lastAttackTime = time;
    this.isAttacking = true;

    if (!this.target) { this.isAttacking = false; return; }

    const dir = this.facingRight ? 1 : -1;
    const warnX = this.x + dir * 80;
    const warnY = this.y - 60;

    // 경고 표시
    const warn = this.scene.add.graphics();
    warn.setPosition(warnX, warnY);
    warn.lineStyle(3, 0x660033, 0.6);
    warn.strokeCircle(0, 0, 90);
    warn.fillStyle(0x330066, 0.15);
    warn.fillCircle(0, 0, 90);
    warn.setDepth(this.y + 1);

    this.scene.tweens.add({
      targets: warn, alpha: 0, duration: 400,
      onComplete: () => warn.destroy(),
    });

    this.scene.time.delayedCall(200, () => {
      if (!this.sceneActive) return;
      const slashX = this.x + dir * 80;
      const slashY = this.y - 60;

      const slash = this.scene.add.graphics();
      slash.setPosition(slashX, slashY);
      slash.fillStyle(0x330066, 0.8);
      slash.slice(0, 0, 90, Phaser.Math.DegToRad(-60), Phaser.Math.DegToRad(60), false);
      slash.fillPath();
      slash.setDepth(this.y + 2);
      slash.setScale(dir, 1);

      this.scene.tweens.add({
        targets: slash, alpha: 0, scaleX: dir * 1.5, scaleY: 1.5, duration: 250,
        onComplete: () => slash.destroy(),
      });

      if (this.target) {
        const d = Phaser.Math.Distance.Between(slashX, slashY, this.target.x, this.target.y);
        if (d < 180) {
          this.target.takeDamage(this.attack * this.damageMult * this.curseDebuff, time);
        }
      }
    });

    this.scene.time.delayedCall(500, () => { if (this.sceneActive) this.isAttacking = false; });
  }

  /** (b) Dark Orbs: 3 slow tracking orbs */
  private attackDarkOrbs(time: number): void {
    this.lastAttackTime = time;
    this.isAttacking = true;

    // 시전 경고 - 보스 주변 빛
    const castWarn = this.scene.add.graphics();
    castWarn.setPosition(this.x, this.y - 70);
    castWarn.lineStyle(3, 0x8800cc, 0.6);
    castWarn.strokeCircle(0, 0, 40);
    castWarn.setDepth(this.y + 1);
    this.scene.tweens.add({ targets: castWarn, alpha: 0, scaleX: 2, scaleY: 2, duration: 500, onComplete: () => castWarn.destroy() });

    for (let i = 0; i < 3; i++) {
      this.scene.time.delayedCall(i * 200, () => {
        if (!this.sceneActive || !this.target) return;
        const gfx = this.scene.add.graphics();
        const ox = this.x;
        const oy = this.y - 70;
        gfx.setPosition(ox, oy);
        gfx.fillStyle(0x6600aa, 0.9);
        gfx.fillCircle(0, 0, 12);
        gfx.fillStyle(0xcc88ff, 0.5);
        gfx.fillCircle(0, 0, 6);
        gfx.setDepth(this.y + 1);

        this.activeOrbs.push({ gfx, vx: 0, vy: 0, x: ox, y: oy, trackTime: 2000, born: time });
      });
    }

    this.scene.time.delayedCall(800, () => { if (this.sceneActive) this.isAttacking = false; });
  }

  /** (c) Ground Eruption: 4 pillars near player */
  private attackGroundEruption(time: number): void {
    this.lastAttackTime = time;
    this.isAttacking = true;

    if (!this.target) { this.isAttacking = false; return; }

    const px = this.target.x;
    const py = this.target.y;

    for (let i = 0; i < 4; i++) {
      const ex = px + Phaser.Math.Between(-120, 120);
      const ey = py + 40; // ground level approx

      // warning marker
      const warn = this.scene.add.graphics();
      warn.setPosition(ex, ey);
      warn.fillStyle(0x660033, 0.4);
      warn.fillEllipse(0, 0, 40, 10);
      warn.setDepth(this.y - 1);

      this.scene.tweens.add({
        targets: warn, alpha: 0.8, duration: 400, yoyo: true,
        onComplete: () => warn.destroy(),
      });

      this.scene.time.delayedCall(600 + i * 150, () => {
        if (!this.sceneActive) return;
        const pillar = this.scene.add.graphics();
        pillar.setPosition(ex, ey);
        pillar.fillStyle(0x440066, 0.9);
        pillar.fillRect(-12, -120, 24, 120);
        pillar.fillStyle(0x8800cc, 0.6);
        pillar.fillRect(-8, -120, 16, 120);
        pillar.setDepth(this.y + 2);
        pillar.setAlpha(0);

        this.scene.tweens.add({
          targets: pillar, alpha: 1, duration: 100,
          onComplete: () => {
            this.scene.tweens.add({
              targets: pillar, alpha: 0, duration: 400,
              onComplete: () => pillar.destroy(),
            });
          },
        });

        // damage
        if (this.target) {
          const d = Phaser.Math.Distance.Between(ex, ey - 60, this.target.x, this.target.y);
          if (d < 60) {
            this.target.takeDamage(this.attack * 0.8 * this.damageMult * this.curseDebuff, time);
          }
        }

        this.scene.cameras.main.shake(100, 0.008);
      });
    }

    this.scene.time.delayedCall(1200, () => { if (this.sceneActive) this.isAttacking = false; });
  }

  /** (d) Void Pull: gravity well pulling player, then explosion */
  private attackVoidPull(time: number): void {
    this.lastAttackTime = time;
    this.isAttacking = true;

    // 경고 - 중력장 범위
    const warn = this.scene.add.graphics();
    warn.setPosition(this.x, this.y - 50);
    warn.lineStyle(3, 0x8800cc, 0.5);
    warn.strokeCircle(0, 0, 150);
    warn.fillStyle(0x440066, 0.1);
    warn.fillCircle(0, 0, 150);
    warn.setDepth(this.y);
    this.scene.tweens.add({ targets: warn, alpha: 0, duration: 1500, onComplete: () => warn.destroy() });

    const vortex = this.scene.add.graphics();
    vortex.setPosition(this.x, this.y - 50);
    vortex.setDepth(this.y + 1);

    let elapsed = 0;
    const pullDuration = 1500;
    const pullEvent = this.scene.time.addEvent({
      delay: 16,
      repeat: Math.floor(pullDuration / 16),
      callback: () => {
        if (!this.sceneActive) { pullEvent.destroy(); if (vortex.active) vortex.destroy(); return; }
        elapsed += 16;
        vortex.clear();
        const r = 30 + Math.sin(elapsed * 0.01) * 10;
        vortex.lineStyle(3, 0x8800cc, 0.7);
        vortex.strokeCircle(0, 0, r);
        vortex.strokeCircle(0, 0, r * 0.6);

        if (this.target) {
          const pdx = this.x - this.target.x;
          const pullStrength = 1.5;
          if (Math.abs(pdx) > 30) {
            this.target.x += Math.sign(pdx) * pullStrength;
          }
        }
      },
    });

    this.scene.time.delayedCall(pullDuration + 100, () => {
      if (vortex.active) vortex.destroy();
      if (!this.sceneActive) return;

      const boom = this.scene.add.graphics();
      boom.setPosition(this.x, this.y - 50);
      boom.fillStyle(0x440066, 0.8);
      boom.fillCircle(0, 0, 40);
      boom.setDepth(this.y + 2);

      this.scene.tweens.add({
        targets: boom, scaleX: 3, scaleY: 3, alpha: 0, duration: 300,
        onComplete: () => boom.destroy(),
      });

      if (this.target) {
        const d = Phaser.Math.Distance.Between(this.x, this.y - 50, this.target.x, this.target.y);
        if (d < 150) {
          this.target.takeDamage(this.attack * 1.2 * this.damageMult * this.curseDebuff, time);
        }
      }

      this.scene.cameras.main.shake(200, 0.015);
      this.isAttacking = false;
    });
  }

  /** (e) Soul Chains: projectile toward player */
  private attackSoulChains(time: number): void {
    this.lastAttackTime = time;
    this.isAttacking = true;

    if (!this.target) { this.isAttacking = false; return; }

    const startX = this.x + (this.facingRight ? 40 : -40);
    const startY = this.y - 60;
    const tx = this.target.x;
    const ty = this.target.y - 30;
    const angle = Math.atan2(ty - startY, tx - startX);
    const speed = 350;

    // 경고 - 발사 방향 라인
    const aimLine = this.scene.add.graphics();
    aimLine.setPosition(startX, startY);
    aimLine.lineStyle(2, 0x6600aa, 0.4);
    aimLine.beginPath();
    aimLine.moveTo(0, 0);
    aimLine.lineTo(Math.cos(angle) * 300, Math.sin(angle) * 300);
    aimLine.stroke();
    aimLine.setDepth(this.y);
    this.scene.tweens.add({ targets: aimLine, alpha: 0, duration: 600, onComplete: () => aimLine.destroy() });

    const chain = this.scene.add.graphics();
    let cx = startX;
    let cy = startY;
    chain.setDepth(this.y + 1);

    const chainEvent = this.scene.time.addEvent({
      delay: 16,
      repeat: 60,
      callback: () => {
        if (!this.sceneActive) { chainEvent.destroy(); if (chain.active) chain.destroy(); return; }
        cx += Math.cos(angle) * speed * 0.016;
        cy += Math.sin(angle) * speed * 0.016;

        chain.clear();
        chain.setPosition(cx, cy);
        chain.fillStyle(0x6600aa, 0.8);
        chain.fillCircle(0, 0, 8);
        // chain links trailing
        for (let i = 1; i <= 4; i++) {
          const lx = -Math.cos(angle) * i * 14;
          const ly = -Math.sin(angle) * i * 14;
          chain.fillStyle(0x440066, 0.6 - i * 0.1);
          chain.fillCircle(lx, ly, 5);
        }

        // hit check
        if (this.target) {
          const d = Phaser.Math.Distance.Between(cx, cy, this.target.x, this.target.y - 30);
          if (d < 40) {
            this.target.takeDamage(this.attack * 0.9 * this.damageMult * this.curseDebuff, time);
            chainEvent.destroy();
            // impact
            this.scene.tweens.add({
              targets: chain, alpha: 0, scaleX: 2, scaleY: 2, duration: 200,
              onComplete: () => chain.destroy(),
            });
          }
        }
      },
    });

    // cleanup if missed
    this.scene.time.delayedCall(1200, () => {
      if (chain.active) {
        if (this.scene) {
          this.scene.tweens.add({
            targets: chain, alpha: 0, duration: 150,
            onComplete: () => chain.destroy(),
          });
        } else {
          chain.destroy();
        }
      }
    });

    this.scene.time.delayedCall(600, () => { if (this.sceneActive) this.isAttacking = false; });
  }

  /** (f) Shadow Rain: 6 dark projectiles from above */
  private attackShadowRain(time: number): void {
    this.lastAttackTime = time;
    this.isAttacking = true;

    if (!this.target) { this.isAttacking = false; return; }

    const baseX = this.target.x;

    // 경고 - 낙하 범위 전체
    const rainWarn = this.scene.add.graphics();
    rainWarn.setPosition(baseX, this.target.y + 40);
    rainWarn.fillStyle(0x330044, 0.2);
    rainWarn.fillRect(-150, -10, 300, 20);
    rainWarn.lineStyle(2, 0x660088, 0.5);
    rainWarn.strokeRect(-150, -10, 300, 20);
    rainWarn.setDepth(this.y - 1);
    this.scene.tweens.add({ targets: rainWarn, alpha: 0, duration: 1000, onComplete: () => rainWarn.destroy() });

    for (let i = 0; i < 6; i++) {
      const rx = baseX + (i - 2.5) * 50;
      const ry = this.target.y - 300;

      this.scene.time.delayedCall(i * 120, () => {
        if (!this.sceneActive) return;

        // warning shadow on ground
        const shadow = this.scene.add.graphics();
        shadow.setPosition(rx, this.target ? this.target.y + 40 : ry + 340);
        shadow.fillStyle(0x330044, 0.4);
        shadow.fillEllipse(0, 0, 30, 8);
        shadow.setDepth(this.y - 1);

        const proj = this.scene.add.graphics();
        proj.setPosition(rx, ry);
        proj.fillStyle(0x6600aa, 0.9);
        proj.fillEllipse(0, 0, 14, 20);
        proj.fillStyle(0xaa66ff, 0.5);
        proj.fillEllipse(0, 0, 8, 12);
        proj.setDepth(this.y + 2);

        this.scene.tweens.add({
          targets: proj,
          y: (this.target ? this.target.y + 40 : ry + 340),
          duration: 500,
          onComplete: () => {
            proj.destroy();
            shadow.destroy();

            // impact
            const impact = this.scene.add.graphics();
            impact.setPosition(rx, this.target ? this.target.y + 40 : ry + 340);
            impact.fillStyle(0x440066, 0.7);
            impact.fillCircle(0, 0, 20);
            impact.setDepth(this.y + 1);

            this.scene.tweens.add({
              targets: impact, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 200,
              onComplete: () => impact.destroy(),
            });

            if (this.target) {
              const d = Math.abs(this.target.x - rx);
              if (d < 40) {
                this.target.takeDamage(this.attack * 0.6 * this.damageMult * this.curseDebuff, time);
              }
            }
          },
        });
      });
    }

    this.scene.time.delayedCall(1200, () => { if (this.sceneActive) this.isAttacking = false; });
  }

  /** (g) Teleport Strike: teleport behind player, pause, strike */
  private attackTeleportStrike(time: number): void {
    this.lastAttackTime = time;
    this.isAttacking = true;

    if (!this.target) { this.isAttacking = false; return; }

    // 경고 - "!" 표시
    const alertText = this.scene.add.text(this.x, this.y - 170, '!', {
      fontSize: '48px', color: '#FF2244', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(this.y + 5);
    this.scene.tweens.add({ targets: alertText, alpha: 0, y: alertText.y - 20, duration: 400, onComplete: () => alertText.destroy() });

    const vanish = this.scene.add.graphics();
    vanish.setPosition(this.x, this.y - 50);
    vanish.fillStyle(0x330066, 0.7);
    vanish.fillCircle(0, 0, 40);
    vanish.setDepth(this.y + 1);

    this.scene.tweens.add({
      targets: vanish, alpha: 0, scaleX: 2, scaleY: 2, duration: 300,
      onComplete: () => vanish.destroy(),
    });

    this.setAlpha(0);

    this.scene.time.delayedCall(400, () => {
      if (!this.sceneActive || !this.target) { this.setAlpha(1); this.isAttacking = false; return; }

      // teleport behind player
      const behindDir = this.target.x > this.x ? 1 : -1;
      this.x = this.target.x + behindDir * 80;
      this.facingRight = behindDir < 0;

      // appear effect
      const appear = this.scene.add.graphics();
      appear.setPosition(this.x, this.y - 50);
      appear.fillStyle(0x6600aa, 0.6);
      appear.fillCircle(0, 0, 30);
      appear.setDepth(this.y + 1);

      this.setAlpha(1);

      this.scene.tweens.add({
        targets: appear, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 200,
        onComplete: () => appear.destroy(),
      });

      // 착지 경고 표시
      const landWarn = this.scene.add.graphics();
      landWarn.setPosition(this.x, this.y + 40);
      landWarn.fillStyle(0x660033, 0.3);
      landWarn.fillEllipse(0, 0, 120, 20);
      landWarn.setDepth(this.y - 1);
      this.scene.tweens.add({ targets: landWarn, alpha: 0, duration: 300, onComplete: () => landWarn.destroy() });

      // brief pause then strike
      this.scene.time.delayedCall(300, () => {
        if (!this.sceneActive) return;

        const strikeGfx = this.scene.add.graphics();
        strikeGfx.setPosition(this.x + (this.facingRight ? -60 : 60), this.y - 50);
        strikeGfx.fillStyle(0x8800cc, 0.9);
        strikeGfx.fillEllipse(0, 0, 60, 30);
        strikeGfx.setDepth(this.y + 2);

        this.scene.tweens.add({
          targets: strikeGfx, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 250,
          onComplete: () => strikeGfx.destroy(),
        });

        if (this.target) {
          const d = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
          if (d < 150) {
            this.target.takeDamage(this.attack * 1.5 * this.damageMult * this.curseDebuff, time);
          }
        }

        this.scene.cameras.main.shake(100, 0.01);
        this.isAttacking = false;
      });
    });
  }

  /** Phase 1+ : Dark Nova - AoE burst radius 200 */
  private attackDarkNova(time: number): void {
    this.lastAttackTime = time;
    this.isAttacking = true;

    // 경고 - 폭발 범위
    const novaWarn = this.scene.add.graphics();
    novaWarn.setPosition(this.x, this.y - 50);
    novaWarn.lineStyle(3, 0xaa44ff, 0.5);
    novaWarn.strokeCircle(0, 0, 200);
    novaWarn.fillStyle(0x440066, 0.1);
    novaWarn.fillCircle(0, 0, 200);
    novaWarn.setDepth(this.y);
    this.scene.tweens.add({ targets: novaWarn, alpha: 0, duration: 500, onComplete: () => novaWarn.destroy() });

    const charge = this.scene.add.graphics();
    charge.setPosition(this.x, this.y - 50);
    charge.setDepth(this.y + 1);

    let chargeElapsed = 0;
    const chargeEvent = this.scene.time.addEvent({
      delay: 16, repeat: 30,
      callback: () => {
        if (!this.sceneActive) { chargeEvent.destroy(); return; }
        chargeElapsed += 16;
        charge.clear();
        const r = (chargeElapsed / 500) * 30;
        charge.fillStyle(0x8800cc, 0.5);
        charge.fillCircle(0, 0, r);
      },
    });

    this.scene.time.delayedCall(500, () => {
      if (charge.active) charge.destroy();
      if (!this.sceneActive) return;

      // explosion
      const nova = this.scene.add.graphics();
      nova.setPosition(this.x, this.y - 50);
      nova.fillStyle(0x6600aa, 0.7);
      nova.fillCircle(0, 0, 40);
      nova.setDepth(this.y + 2);

      this.scene.tweens.add({
        targets: nova, scaleX: 5, scaleY: 5, alpha: 0, duration: 400,
        onComplete: () => nova.destroy(),
      });

      // ring
      const ring = this.scene.add.graphics();
      ring.setPosition(this.x, this.y - 50);
      ring.lineStyle(4, 0xaa44ff, 0.8);
      ring.strokeCircle(0, 0, 30);
      ring.setDepth(this.y + 3);

      this.scene.tweens.add({
        targets: ring, scaleX: 7, scaleY: 7, alpha: 0, duration: 500,
        onComplete: () => ring.destroy(),
      });

      if (this.target) {
        const d = Phaser.Math.Distance.Between(this.x, this.y - 50, this.target.x, this.target.y);
        if (d < 200) {
          this.target.takeDamage(this.attack * 1.3 * this.damageMult * this.curseDebuff, time);
        }
      }

      this.scene.cameras.main.shake(200, 0.02);
      this.isAttacking = false;
    });
  }

  /** Phase 2+ : Death Field - persistent dark zone */
  private attackDeathField(time: number): void {
    this.lastAttackTime = time;
    this.isAttacking = true;

    if (!this.target) { this.isAttacking = false; return; }

    this.deathFieldX = this.target.x;
    this.deathFieldY = this.target.y + 20;
    this.deathFieldTimer = 3000;

    // 경고 - 위험 지대 표시
    const dfWarn = this.scene.add.graphics();
    dfWarn.setPosition(this.deathFieldX, this.deathFieldY);
    dfWarn.lineStyle(3, 0x660088, 0.6);
    dfWarn.strokeEllipse(0, 0, 160, 40);
    dfWarn.fillStyle(0x330044, 0.2);
    dfWarn.fillEllipse(0, 0, 160, 40);
    dfWarn.setDepth(this.y - 1);
    this.scene.tweens.add({
      targets: dfWarn, alpha: 0.8, duration: 200, yoyo: true, repeat: 2,
      onComplete: () => dfWarn.destroy(),
    });

    if (this.deathFieldGfx) this.deathFieldGfx.destroy();
    this.deathFieldGfx = this.scene.add.graphics();
    this.deathFieldGfx.setDepth(this.y - 1);

    this.scene.time.delayedCall(400, () => { if (this.sceneActive) this.isAttacking = false; });
  }

  // ===================== ORB UPDATE =====================

  private updateOrbs(time: number, delta: number): void {
    for (let i = this.activeOrbs.length - 1; i >= 0; i--) {
      const orb = this.activeOrbs[i];
      const age = time - orb.born;

      if (age < orb.trackTime && this.target) {
        // track toward player
        const angle = Math.atan2(this.target.y - 30 - orb.y, this.target.x - orb.x);
        const speed = 80;
        orb.vx = Math.cos(angle) * speed;
        orb.vy = Math.sin(angle) * speed;
      }

      orb.x += orb.vx * (delta / 1000);
      orb.y += orb.vy * (delta / 1000);
      orb.gfx.setPosition(orb.x, orb.y);

      // hit check
      if (this.target) {
        const d = Phaser.Math.Distance.Between(orb.x, orb.y, this.target.x, this.target.y - 30);
        if (d < 30) {
          this.target.takeDamage(this.attack * 0.7 * this.damageMult * this.curseDebuff, time);
          this.explodeOrb(orb);
          this.activeOrbs.splice(i, 1);
          continue;
        }
      }

      // expire after 4s
      if (age > 4000) {
        this.explodeOrb(orb);
        this.activeOrbs.splice(i, 1);
      }
    }
  }

  private explodeOrb(orb: { gfx: Phaser.GameObjects.Graphics; x: number; y: number }): void {
    const boom = this.scene.add.graphics();
    boom.setPosition(orb.x, orb.y);
    boom.fillStyle(0x6600aa, 0.7);
    boom.fillCircle(0, 0, 15);
    boom.setDepth(this.y + 1);

    this.scene.tweens.add({
      targets: boom, scaleX: 2, scaleY: 2, alpha: 0, duration: 200,
      onComplete: () => boom.destroy(),
    });

    orb.gfx.destroy();
  }

  // ===================== DEATH FIELD UPDATE =====================

  private updateDeathField(time: number, delta: number): void {
    if (this.deathFieldTimer <= 0) {
      if (this.deathFieldGfx) { this.deathFieldGfx.destroy(); this.deathFieldGfx = null; }
      return;
    }

    this.deathFieldTimer -= delta;

    if (this.deathFieldGfx) {
      this.deathFieldGfx.clear();
      const pulse = Math.sin(this.animTimer * 6) * 0.2;
      this.deathFieldGfx.setPosition(this.deathFieldX, this.deathFieldY);
      this.deathFieldGfx.fillStyle(0x330044, 0.35 + pulse);
      this.deathFieldGfx.fillEllipse(0, 0, 160, 40);
      this.deathFieldGfx.fillStyle(0x660088, 0.2 + pulse);
      this.deathFieldGfx.fillEllipse(0, -10, 120, 60);

      // damage every ~500ms (check every frame but use modular timing)
      if (this.target && Math.floor(this.animTimer * 2) !== Math.floor((this.animTimer - delta / 1000) * 2)) {
        const d = Phaser.Math.Distance.Between(this.deathFieldX, this.deathFieldY, this.target.x, this.target.y);
        if (d < 100) {
          this.target.takeDamage(this.attack * 0.4 * this.damageMult * this.curseDebuff, time);
        }
      }
    }

    if (this.deathFieldTimer <= 0 && this.deathFieldGfx) {
      this.scene.tweens.add({
        targets: this.deathFieldGfx, alpha: 0, duration: 300,
        onComplete: () => { if (this.deathFieldGfx) { this.deathFieldGfx.destroy(); this.deathFieldGfx = null; } },
      });
    }
  }

  // ===================== VOID PULL UPDATE =====================

  private updateVoidPull(delta: number): void {
    // void pull handled inline via time events; stub kept for extensibility
  }

  // ===================== PHASE CHECK =====================

  private checkPhase(): void {
    const pct = this.currentHealth / this.maxHealth;

    if (pct <= 0.3 && this.currentPhase < 2) {
      this.currentPhase = 2;
      this.onPhaseChange(2);
    } else if (pct <= 0.7 && this.currentPhase < 1) {
      this.currentPhase = 1;
      this.onPhaseChange(1);
    }
  }

  private onPhaseChange(phase: number): void {
    this.phaseText.setText(`Phase ${phase + 1}`);

    if (phase === 1) {
      this.phaseText.setColor('#AA44FF');
      this.attackSpeedMult = 1.3;
      this.createPhaseChangeEffect('각성!');

      // darken screen briefly
      const dark = this.scene.add.graphics();
      dark.fillStyle(0x0a000f, 0.5);
      dark.fillRect(0, 0, GAME_WIDTH, 720);
      dark.setScrollFactor(0).setDepth(998);
      this.scene.tweens.add({ targets: dark, alpha: 0, duration: 1000, onComplete: () => dark.destroy() });
    } else if (phase === 2) {
      this.phaseText.setColor('#FF2244');
      this.damageMult = 1.5;
      this.attackSpeedMult = 1.8;
      this.baseCooldown = 2000;
      this.createPhaseChangeEffect('최후의 각성!!');

      // deep purple flash
      const flash = this.scene.add.graphics();
      flash.fillStyle(0x440066, 0.7);
      flash.fillRect(0, 0, GAME_WIDTH, 720);
      flash.setScrollFactor(0).setDepth(998);
      this.scene.tweens.add({ targets: flash, alpha: 0, duration: 800, onComplete: () => flash.destroy() });
    }
  }

  private createPhaseChangeEffect(text: string): void {
    const alert = this.scene.add.text(GAME_WIDTH / 2, 200, text, {
      fontSize: '48px',
      color: '#AA44FF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1100);

    this.scene.tweens.add({
      targets: alert, scaleX: 1.3, scaleY: 1.3, alpha: 0, duration: 1000,
      onComplete: () => alert.destroy(),
    });

    // dark shockwaves
    for (let i = 0; i < 3; i++) {
      const wave = this.scene.add.graphics();
      wave.setPosition(this.x, this.y - 50);
      wave.lineStyle(4, 0x8800cc, 0.8);
      wave.strokeCircle(0, 0, 20);
      wave.setDepth(this.depth + 1);

      this.scene.tweens.add({
        targets: wave, scaleX: 5 + i, scaleY: 5 + i, alpha: 0, duration: 600, delay: i * 100,
        onComplete: () => wave.destroy(),
      });
    }

    this.scene.cameras.main.shake(400, 0.02);
  }

  // ===================== SUMMON ATTACK =====================

  private attackNearbySummons(time: number, summons: any[]): void {
    this.summonAttackCooldown = Math.max(0, this.summonAttackCooldown - 16);
    if (this.summonAttackCooldown > 0) return;

    for (const summon of summons) {
      if (!summon.isAlive) continue;
      const dist = Phaser.Math.Distance.Between(this.x, this.y, summon.x, summon.y);
      if (dist < 120) {
        summon.takeDamage(this.attack * 0.5 * this.curseDebuff);
        this.summonAttackCooldown = 1500;

        const fx = this.scene.add.graphics();
        fx.setPosition(summon.x, summon.y - 30);
        fx.fillStyle(0x6600aa, 0.8);
        fx.fillCircle(0, 0, 25);
        fx.setDepth(summon.y + 1);

        this.scene.tweens.add({
          targets: fx, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 200,
          onComplete: () => fx.destroy(),
        });
        break;
      }
    }
  }

  // ===================== DEATH =====================

  private die(): void {
    this.isDead = true;

    // clean up orbs
    for (const orb of this.activeOrbs) orb.gfx.destroy();
    this.activeOrbs = [];
    if (this.deathFieldGfx) { this.deathFieldGfx.destroy(); this.deathFieldGfx = null; }

    // dark overlay
    const victoryOverlay = this.scene.add.graphics();
    victoryOverlay.fillStyle(0x0a000f, 0);
    victoryOverlay.fillRect(0, 0, GAME_WIDTH, 720);
    victoryOverlay.setScrollFactor(0).setDepth(998);

    this.scene.tweens.add({ targets: victoryOverlay, alpha: 0.6, duration: 1000 });

    // dark explosion particles
    for (let i = 0; i < 25; i++) {
      this.scene.time.delayedCall(i * 80, () => {
        if (!this.scene) return;
        const ex = this.scene.add.graphics();
        ex.setPosition(this.x + Phaser.Math.Between(-60, 60), this.y - Phaser.Math.Between(0, 150));
        const colors = [0x6600aa, 0x330066, 0x8800cc, 0x440044];
        ex.fillStyle(colors[i % colors.length], 0.9);
        ex.fillCircle(0, 0, 15 + Math.random() * 20);
        ex.setDepth(this.depth + 2);

        this.scene.tweens.add({
          targets: ex, scaleX: 2, scaleY: 2, alpha: 0, duration: 350,
          onComplete: () => ex.destroy(),
        });
      });
    }

    // victory text
    this.scene.time.delayedCall(2000, () => {
      if (!this.scene) return;
      const vt = this.scene.add.text(GAME_WIDTH / 2, 300, 'VICTORY!', {
        fontSize: '72px', color: '#AA44FF', fontStyle: 'bold', stroke: '#000000', strokeThickness: 8,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

      const rt = this.scene.add.text(GAME_WIDTH / 2, 380, `+${this.EXP_REWARD} EXP  +${this.GOLD_REWARD} GOLD`, {
        fontSize: '32px', color: '#FFFFFF', stroke: '#000000', strokeThickness: 4,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

      this.scene.tweens.add({ targets: vt, scaleX: 1.1, scaleY: 1.1, duration: 500, yoyo: true, repeat: -1 });

      this.scene.events.emit('bossDefeated', { exp: this.EXP_REWARD, gold: this.GOLD_REWARD });
    });

    // fade boss out
    this.scene.tweens.add({
      targets: this, alpha: 0, y: this.y - 50, duration: 2000,
      onComplete: () => {
        this.healthBarBg.destroy();
        this.healthBar.destroy();
        this.nameText.destroy();
        this.phaseText.destroy();
        this.destroy();
      },
    });
  }
}
