import Phaser from 'phaser';
import { canPlaceUnit } from '../config/PathConfig';
import { getSoundManager } from '../utils/SoundManager';
import { GRADES } from '../config/GameConfig';

export interface UnitConfig {
  scene: Phaser.Scene;
  x: number;
  y: number;
  texture: string;
  name: string;
  grade: string;
  health: number;
  damage: number;
  attackSpeed: number;
  range: number;
  isMovable?: boolean; // 이동 가능 여부 (기본값: true)
}

export class Unit extends Phaser.GameObjects.Container {
  public unitName: string;
  public grade: string;
  public maxHealth: number;
  public currentHealth: number;
  public damage: number;
  public attackSpeed: number;
  public range: number;
  public target: Phaser.GameObjects.Container | null = null;
  public lastAttackTime: number = 0;
  public isBeingDragged: boolean = false;
  public isMovable: boolean;

  private sprite: Phaser.GameObjects.Sprite;
  private healthBar: Phaser.GameObjects.Graphics;
  private rangeCircle: Phaser.GameObjects.Graphics;
  private gradeText: Phaser.GameObjects.Text;
  private isSelected: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private invalidPlacement: boolean = false;
  private placementIndicator: Phaser.GameObjects.Graphics;

  constructor(config: UnitConfig) {
    super(config.scene, config.x, config.y);

    this.unitName = config.name;
    this.grade = config.grade;
    this.maxHealth = config.health;
    this.currentHealth = config.health;
    this.damage = config.damage;
    this.attackSpeed = config.attackSpeed;
    this.range = config.range;
    this.isMovable = config.isMovable !== false; // 기본값 true

    // Placement indicator (shows valid/invalid placement)
    this.placementIndicator = config.scene.add.graphics();
    this.placementIndicator.setVisible(false);
    this.add(this.placementIndicator);

    // Create sprite
    this.sprite = config.scene.add.sprite(0, 0, config.texture);
    this.sprite.setOrigin(0.5, 1);
    this.add(this.sprite);

    // Create range indicator (hidden by default)
    this.rangeCircle = config.scene.add.graphics();
    this.rangeCircle.lineStyle(2, 0x00FF00, 0.3);
    this.rangeCircle.fillStyle(0x00FF00, 0.1);
    this.rangeCircle.strokeCircle(0, -20, this.range);
    this.rangeCircle.fillCircle(0, -20, this.range);
    this.rangeCircle.setVisible(false);
    this.add(this.rangeCircle);

    // Create health bar
    this.healthBar = config.scene.add.graphics();
    this.add(this.healthBar);
    this.updateHealthBar();

    // Create grade indicator
    const gradeColor = this.getGradeColor();
    this.gradeText = config.scene.add.text(0, -this.sprite.height - 15, this.grade, {
      fontSize: '12px',
      color: gradeColor,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.add(this.gradeText);

    // Make interactive (draggable only if movable)
    this.sprite.setInteractive({ useHandCursor: true, draggable: this.isMovable });
    this.sprite.on('pointerover', () => this.onPointerOver());
    this.sprite.on('pointerout', () => this.onPointerOut());
    this.sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.onPointerDown(pointer));

    // Drag events (only for movable units)
    if (this.isMovable) {
      config.scene.input.on('drag', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Sprite) => {
        if (gameObject === this.sprite) {
          this.onDrag(pointer);
        }
      });

      config.scene.input.on('dragstart', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Sprite) => {
        if (gameObject === this.sprite) {
          this.onDragStart();
        }
      });

      config.scene.input.on('dragend', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Sprite) => {
        if (gameObject === this.sprite) {
          this.onDragEnd();
        }
      });
    }

    config.scene.add.existing(this);
  }

  private getGradeColor(): string {
    const gradeData = GRADES[this.grade];
    if (gradeData) {
      return '#' + gradeData.color.toString(16).padStart(6, '0');
    }
    return '#FFFFFF';
  }

  public getGradeColorHex(): number {
    const gradeData = GRADES[this.grade];
    return gradeData ? gradeData.color : 0xFFFFFF;
  }

  private updateHealthBar(): void {
    this.healthBar.clear();
    const barWidth = 30;
    const barHeight = 4;
    const x = -barWidth / 2;
    const y = -this.sprite.height - 8;

    // Background
    this.healthBar.fillStyle(0x000000, 0.7);
    this.healthBar.fillRect(x - 1, y - 1, barWidth + 2, barHeight + 2);

    // Health
    const healthPercent = this.currentHealth / this.maxHealth;
    const healthColor = healthPercent > 0.5 ? 0x00FF00 : healthPercent > 0.25 ? 0xFFFF00 : 0xFF0000;
    this.healthBar.fillStyle(healthColor);
    this.healthBar.fillRect(x, y, barWidth * healthPercent, barHeight);
  }

  private onPointerOver(): void {
    if (!this.isBeingDragged) {
      this.rangeCircle.setVisible(true);
      this.sprite.setTint(0xCCCCCC);
    }
  }

  private onPointerOut(): void {
    if (!this.isSelected && !this.isBeingDragged) {
      this.rangeCircle.setVisible(false);
    }
    if (!this.isBeingDragged) {
      this.sprite.clearTint();
    }
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    // Toggle selection
    this.isSelected = !this.isSelected;
    this.rangeCircle.setVisible(this.isSelected);
    this.scene.events.emit('unitSelected', this.isSelected ? this : null);
  }

  private onDragStart(): void {
    this.isBeingDragged = true;
    this.dragStartX = this.x;
    this.dragStartY = this.y;
    this.sprite.setAlpha(0.8);
    this.rangeCircle.setVisible(true);
    this.setDepth(10000); // Bring to front while dragging
  }

  private onDrag(pointer: Phaser.Input.Pointer): void {
    // Use pointer world position directly
    this.x = pointer.worldX;
    this.y = pointer.worldY;

    // Check if placement is valid (inside walls and not on path)
    this.invalidPlacement = !canPlaceUnit(this.x, this.y);

    // Update placement indicator
    this.updatePlacementIndicator();
  }

  private updatePlacementIndicator(): void {
    this.placementIndicator.clear();
    this.placementIndicator.setVisible(true);

    if (this.invalidPlacement) {
      // Red indicator for invalid placement
      this.placementIndicator.fillStyle(0xFF0000, 0.3);
      this.placementIndicator.fillCircle(0, -20, 25);
      this.placementIndicator.lineStyle(2, 0xFF0000, 0.8);
      this.placementIndicator.strokeCircle(0, -20, 25);
      // X mark
      this.placementIndicator.lineStyle(3, 0xFF0000, 1);
      this.placementIndicator.lineBetween(-10, -30, 10, -10);
      this.placementIndicator.lineBetween(-10, -10, 10, -30);
    } else {
      // Green indicator for valid placement
      this.placementIndicator.fillStyle(0x00FF00, 0.2);
      this.placementIndicator.fillCircle(0, -20, 25);
      this.placementIndicator.lineStyle(2, 0x00FF00, 0.6);
      this.placementIndicator.strokeCircle(0, -20, 25);
    }
  }

  private onDragEnd(): void {
    this.isBeingDragged = false;
    this.sprite.setAlpha(1);
    this.placementIndicator.setVisible(false);

    const soundManager = getSoundManager();

    if (this.invalidPlacement) {
      // Return to original position
      this.x = this.dragStartX;
      this.y = this.dragStartY;

      // Play invalid placement sound
      soundManager?.playInvalidPlacement();

      // Show invalid placement feedback
      this.scene.cameras.main.shake(100, 0.005);

      const warningText = this.scene.add.text(this.x, this.y - 60, '배치 불가!', {
        fontSize: '16px',
        color: '#FF0000',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5);

      this.scene.tweens.add({
        targets: warningText,
        y: warningText.y - 30,
        alpha: 0,
        duration: 800,
        onComplete: () => warningText.destroy(),
      });
    } else {
      // Play valid placement sound
      soundManager?.playUnitPlace();
    }

    // Update depth based on new Y position
    this.setDepth(this.y);

    if (!this.isSelected) {
      this.rangeCircle.setVisible(false);
    }
  }

  public deselect(): void {
    this.isSelected = false;
    this.rangeCircle.setVisible(false);
  }

  public select(): void {
    this.isSelected = true;
    this.rangeCircle.setVisible(true);
  }

  public findTarget(enemies: Phaser.GameObjects.Container[]): void {
    if (!enemies || enemies.length === 0) {
      this.target = null;
      return;
    }

    let closestEnemy: Phaser.GameObjects.Container | null = null;
    let closestDistance = this.range;

    for (const enemy of enemies) {
      if (!enemy.active) continue;

      const distance = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
      if (distance <= this.range && distance < closestDistance) {
        closestDistance = distance;
        closestEnemy = enemy;
      }
    }

    this.target = closestEnemy;
  }

  public attack(time: number): boolean {
    if (!this.target || !this.target.active) return false;
    if (time - this.lastAttackTime < this.attackSpeed) return false;

    this.lastAttackTime = time;

    // Face target
    if (this.target.x < this.x) {
      this.sprite.setFlipX(true);
    } else {
      this.sprite.setFlipX(false);
    }

    // Attack animation
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.2,
      scaleY: 0.9,
      duration: 50,
      yoyo: true,
    });

    return true;
  }

  public takeDamage(amount: number): boolean {
    this.currentHealth -= amount;
    this.updateHealthBar();

    // Damage flash
    this.sprite.setTint(0xFF0000);
    this.scene.time.delayedCall(100, () => {
      if (this.active) this.sprite.clearTint();
    });

    if (this.currentHealth <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  private die(): void {
    // Death effect
    const deathEffect = this.scene.add.sprite(this.x, this.y - 20, 'death_effect');
    deathEffect.setAlpha(0.8);
    this.scene.tweens.add({
      targets: deathEffect,
      alpha: 0,
      scale: 1.5,
      duration: 300,
      onComplete: () => deathEffect.destroy(),
    });

    this.scene.events.emit('unitDied', this);
    this.destroy();
  }

  public update(time: number, enemies: Phaser.GameObjects.Container[]): void {
    if (!this.isBeingDragged) {
      this.findTarget(enemies);
    }
  }
}
