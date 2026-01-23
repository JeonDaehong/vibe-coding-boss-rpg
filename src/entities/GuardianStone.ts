import Phaser from 'phaser';

export interface GuardianStoneConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  health: number;
}

export class GuardianStone extends Phaser.GameObjects.Container {
  public maxHealth: number;
  public currentHealth: number;

  private sprite: Phaser.GameObjects.Sprite;
  private healthBar: Phaser.GameObjects.Graphics;
  private healthText: Phaser.GameObjects.Text;
  private glowEffect: Phaser.GameObjects.Graphics;
  private pulseTimer!: Phaser.Time.TimerEvent;

  constructor(config: GuardianStoneConfig) {
    super(config.scene, config.x, config.y);

    this.maxHealth = config.health;
    this.currentHealth = config.health;

    // Glow effect (animated)
    this.glowEffect = config.scene.add.graphics();
    this.add(this.glowEffect);

    // Sprite
    this.sprite = config.scene.add.sprite(0, 0, 'guardian_stone');
    this.sprite.setOrigin(0.5, 0.5);
    this.add(this.sprite);

    // Health bar
    this.healthBar = config.scene.add.graphics();
    this.add(this.healthBar);

    // Health text
    this.healthText = config.scene.add.text(0, 60, `HP: ${this.currentHealth}/${this.maxHealth}`, {
      fontSize: '16px',
      color: '#00FFFF',
      stroke: '#000000',
      strokeThickness: 3,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add(this.healthText);

    // Title
    const titleText = config.scene.add.text(0, -70, '수호석', {
      fontSize: '18px',
      color: '#FFD700',
      stroke: '#000000',
      strokeThickness: 4,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add(titleText);

    this.updateHealthBar();
    this.startGlowAnimation();

    config.scene.add.existing(this);
  }

  private startGlowAnimation(): void {
    // Pulsing glow effect
    let glowAlpha = 0.3;
    let increasing = true;

    this.pulseTimer = this.scene.time.addEvent({
      delay: 50,
      callback: () => {
        if (increasing) {
          glowAlpha += 0.02;
          if (glowAlpha >= 0.6) increasing = false;
        } else {
          glowAlpha -= 0.02;
          if (glowAlpha <= 0.2) increasing = true;
        }

        this.drawGlow(glowAlpha);
      },
      loop: true,
    });

    // Floating animation
    this.scene.tweens.add({
      targets: this.sprite,
      y: -5,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private drawGlow(alpha: number): void {
    const healthPercent = this.currentHealth / this.maxHealth;
    const glowColor = healthPercent > 0.5 ? 0x00FFFF : healthPercent > 0.25 ? 0xFFFF00 : 0xFF4500;

    this.glowEffect.clear();
    this.glowEffect.fillStyle(glowColor, alpha * 0.3);
    this.glowEffect.fillCircle(0, 0, 60);
    this.glowEffect.fillStyle(glowColor, alpha * 0.5);
    this.glowEffect.fillCircle(0, 0, 45);
    this.glowEffect.fillStyle(glowColor, alpha * 0.7);
    this.glowEffect.fillCircle(0, 0, 30);
  }

  private updateHealthBar(): void {
    this.healthBar.clear();
    const barWidth = 80;
    const barHeight = 10;
    const x = -barWidth / 2;
    const y = 45;

    // Background
    this.healthBar.fillStyle(0x000000, 0.8);
    this.healthBar.fillRoundedRect(x - 2, y - 2, barWidth + 4, barHeight + 4, 4);

    // Health gradient effect
    const healthPercent = this.currentHealth / this.maxHealth;
    const healthColor = healthPercent > 0.5 ? 0x00FFFF : healthPercent > 0.25 ? 0xFFFF00 : 0xFF4500;

    this.healthBar.fillStyle(healthColor);
    this.healthBar.fillRoundedRect(x, y, barWidth * healthPercent, barHeight, 3);

    // Shine effect
    this.healthBar.fillStyle(0xFFFFFF, 0.3);
    this.healthBar.fillRoundedRect(x, y, barWidth * healthPercent, barHeight / 3, 2);

    // Border
    this.healthBar.lineStyle(2, 0x00FFFF, 0.8);
    this.healthBar.strokeRoundedRect(x - 2, y - 2, barWidth + 4, barHeight + 4, 4);

    // Update text
    this.healthText.setText(`HP: ${Math.ceil(this.currentHealth)}/${this.maxHealth}`);
  }

  public takeDamage(amount: number): boolean {
    this.currentHealth -= amount;
    this.updateHealthBar();

    // Light shake (reduced intensity)
    this.scene.cameras.main.shake(100, 0.005);

    // Flash effect
    this.sprite.setTint(0xFF0000);
    this.scene.time.delayedCall(100, () => {
      if (this.active) this.sprite.clearTint();
    });

    // Warning particles
    for (let i = 0; i < 10; i++) {
      const particle = this.scene.add.graphics();
      particle.fillStyle(0xFF0000);
      particle.fillCircle(0, 0, 3);
      particle.setPosition(this.x + (Math.random() - 0.5) * 60, this.y - 20);

      this.scene.tweens.add({
        targets: particle,
        y: particle.y - 50,
        alpha: 0,
        duration: 500,
        onComplete: () => particle.destroy(),
      });
    }

    if (this.currentHealth <= 0) {
      this.currentHealth = 0;
      this.onDestroy();
      return true;
    }
    return false;
  }

  private onDestroy(): void {
    // Stop animations
    this.pulseTimer.destroy();
    this.scene.tweens.killTweensOf(this.sprite);

    // Massive explosion
    this.scene.cameras.main.shake(1000, 0.05);
    this.scene.cameras.main.flash(500, 255, 0, 0);

    // Explosion particles
    for (let i = 0; i < 50; i++) {
      const particle = this.scene.add.graphics();
      const color = Phaser.Math.RND.pick([0x00FFFF, 0xFF0000, 0xFFFF00, 0xFFFFFF]);
      particle.fillStyle(color);
      particle.fillCircle(0, 0, Phaser.Math.Between(3, 8));
      particle.setPosition(this.x, this.y);

      const angle = Math.random() * Math.PI * 2;
      const distance = Phaser.Math.Between(50, 150);

      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * distance,
        y: particle.y + Math.sin(angle) * distance,
        alpha: 0,
        duration: 800,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }

    // Fade out
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 500,
    });

    // Emit game over event
    this.scene.time.delayedCall(500, () => {
      this.scene.events.emit('guardianDestroyed');
    });
  }
}
