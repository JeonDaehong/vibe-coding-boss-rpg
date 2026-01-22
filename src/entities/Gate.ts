import Phaser from 'phaser';

export interface GateConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  isOuter: boolean;
  direction: string;
  health: number;
}

export class Gate extends Phaser.GameObjects.Container {
  public maxHealth: number;
  public currentHealth: number;
  public isOuter: boolean;
  public direction: string;
  public isDestroyed: boolean = false;

  private sprite: Phaser.GameObjects.Sprite;
  private healthBar: Phaser.GameObjects.Graphics;
  private healthText: Phaser.GameObjects.Text;
  private damageOverlay: Phaser.GameObjects.Graphics;

  constructor(config: GateConfig) {
    super(config.scene, config.x, config.y);

    this.maxHealth = config.health;
    this.currentHealth = config.health;
    this.isOuter = config.isOuter;
    this.direction = config.direction;

    // Sprite
    const texture = config.isOuter ? 'outer_gate' : 'inner_gate';
    this.sprite = config.scene.add.sprite(0, 0, texture);
    this.sprite.setOrigin(0.5, 0.5);
    this.add(this.sprite);

    // Damage overlay
    this.damageOverlay = config.scene.add.graphics();
    this.add(this.damageOverlay);

    // Health bar
    this.healthBar = config.scene.add.graphics();
    this.add(this.healthBar);

    // Health text
    this.healthText = config.scene.add.text(0, -40, `${this.currentHealth}`, {
      fontSize: '14px',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);
    this.add(this.healthText);

    this.updateHealthBar();

    config.scene.add.existing(this);
  }

  private updateHealthBar(): void {
    this.healthBar.clear();
    const barWidth = 60;
    const barHeight = 8;
    const x = -barWidth / 2;
    const y = -50;

    // Background
    this.healthBar.fillStyle(0x000000, 0.8);
    this.healthBar.fillRoundedRect(x - 2, y - 2, barWidth + 4, barHeight + 4, 3);

    // Health
    const healthPercent = this.currentHealth / this.maxHealth;
    const healthColor = healthPercent > 0.5 ? 0x00FF00 : healthPercent > 0.25 ? 0xFFFF00 : 0xFF0000;
    this.healthBar.fillStyle(healthColor);
    this.healthBar.fillRoundedRect(x, y, barWidth * healthPercent, barHeight, 2);

    // Border
    this.healthBar.lineStyle(1, 0xFFFFFF, 0.5);
    this.healthBar.strokeRoundedRect(x - 2, y - 2, barWidth + 4, barHeight + 4, 3);

    // Update text
    this.healthText.setText(`${Math.ceil(this.currentHealth)}`);

    // Update damage overlay
    this.updateDamageOverlay(healthPercent);
  }

  private updateDamageOverlay(healthPercent: number): void {
    this.damageOverlay.clear();

    if (healthPercent < 0.75) {
      // Crack effects
      this.damageOverlay.lineStyle(2, 0x000000, 0.5);

      if (healthPercent < 0.75) {
        this.damageOverlay.lineBetween(-10, -15, 5, 0);
      }
      if (healthPercent < 0.5) {
        this.damageOverlay.lineBetween(10, -10, 0, 5);
        this.damageOverlay.lineBetween(-15, 5, -5, 15);
      }
      if (healthPercent < 0.25) {
        this.damageOverlay.lineBetween(-20, -5, -10, 10);
        this.damageOverlay.lineBetween(15, -5, 20, 10);
        this.damageOverlay.lineBetween(0, -20, 5, -5);
      }

      // Damage tint
      const tintIntensity = Math.floor((1 - healthPercent) * 100);
      this.sprite.setTint(
        Phaser.Display.Color.GetColor(255, 255 - tintIntensity, 255 - tintIntensity)
      );
    }
  }

  public takeDamage(amount: number): boolean {
    if (this.isDestroyed) return false;

    this.currentHealth -= amount;
    this.updateHealthBar();

    // Shake effect
    this.scene.tweens.add({
      targets: this,
      x: this.x + (Math.random() - 0.5) * 8,
      y: this.y + (Math.random() - 0.5) * 4,
      duration: 50,
      yoyo: true,
      repeat: 2,
    });

    // Damage particles
    for (let i = 0; i < 3; i++) {
      const particle = this.scene.add.graphics();
      particle.fillStyle(0x808080);
      particle.fillRect(0, 0, 4, 4);
      particle.setPosition(this.x + (Math.random() - 0.5) * 40, this.y);

      this.scene.tweens.add({
        targets: particle,
        y: particle.y + 30 + Math.random() * 20,
        alpha: 0,
        duration: 400,
        onComplete: () => particle.destroy(),
      });
    }

    if (this.currentHealth <= 0) {
      this.currentHealth = 0;
      this.isDestroyed = true;
      this.onDestroy();
      return true;
    }
    return false;
  }

  private onDestroy(): void {
    // Destruction effect
    this.scene.cameras.main.shake(200, 0.01);

    // Explosion particles
    for (let i = 0; i < 20; i++) {
      const particle = this.scene.add.graphics();
      particle.fillStyle(Phaser.Math.Between(0x404040, 0x808080));
      particle.fillRect(0, 0, Phaser.Math.Between(4, 10), Phaser.Math.Between(4, 10));
      particle.setPosition(this.x, this.y);

      this.scene.tweens.add({
        targets: particle,
        x: particle.x + (Math.random() - 0.5) * 100,
        y: particle.y + (Math.random() - 0.5) * 80 - 20,
        rotation: Math.random() * 3,
        alpha: 0,
        duration: 600,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }

    // Fade out gate
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.3,
      duration: 300,
    });

    // Emit event
    this.scene.events.emit('gateDestroyed', this);
  }

  public repair(amount: number): void {
    if (this.isDestroyed) return;

    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
    this.updateHealthBar();
  }
}
