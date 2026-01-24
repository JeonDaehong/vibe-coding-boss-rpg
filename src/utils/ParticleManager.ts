import Phaser from 'phaser';

export class ParticleManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // 플로팅 데미지 텍스트
  public showDamageNumber(x: number, y: number, damage: number, isCritical: boolean = false): void {
    const color = isCritical ? '#FF0000' : '#FFFFFF';
    const fontSize = isCritical ? '28px' : '18px';
    const prefix = isCritical ? '크리티컬! ' : '';

    const text = this.scene.add.text(x + Phaser.Math.Between(-10, 10), y - 30, `${prefix}${Math.floor(damage)}`, {
      fontSize: fontSize,
      color: color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: isCritical ? 4 : 3,
    }).setOrigin(0.5).setDepth(10000);

    if (isCritical) {
      this.scene.tweens.add({
        targets: text,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 100,
        yoyo: true,
      });
    }

    this.scene.tweens.add({
      targets: text,
      y: text.y - 50,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  // 골드 획득 이펙트
  public showGoldGain(x: number, y: number, amount: number): void {
    const text = this.scene.add.text(x, y - 20, `+${amount}G`, {
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10000);

    // 골드 파티클
    for (let i = 0; i < 8; i++) {
      const coin = this.scene.add.graphics();
      coin.setPosition(x, y);
      coin.fillStyle(0xFFD700, 1);
      coin.fillCircle(0, 0, 4);
      coin.lineStyle(1, 0xFFA500);
      coin.strokeCircle(0, 0, 4);
      coin.setDepth(9999);

      const angle = (i / 8) * Math.PI * 2;
      this.scene.tweens.add({
        targets: coin,
        x: x + Math.cos(angle) * 40,
        y: y + Math.sin(angle) * 40 - 30,
        alpha: 0,
        duration: 500,
        ease: 'Power2',
        onComplete: () => coin.destroy(),
      });
    }

    this.scene.tweens.add({
      targets: text,
      y: text.y - 40,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  // 히트 이펙트 (타격감)
  public showHitEffect(x: number, y: number, color: number = 0xFFFFFF): void {
    // 메인 히트 스파크
    const spark = this.scene.add.graphics();
    spark.setPosition(x, y);
    spark.fillStyle(color, 1);
    spark.fillCircle(0, 0, 12);
    spark.fillStyle(0xFFFFFF, 0.8);
    spark.fillCircle(0, 0, 6);
    spark.setDepth(9998);

    this.scene.tweens.add({
      targets: spark,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 150,
      onComplete: () => spark.destroy(),
    });

    // 스파크 라인
    for (let i = 0; i < 6; i++) {
      const line = this.scene.add.graphics();
      line.setPosition(x, y);
      const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
      const length = Phaser.Math.Between(15, 30);

      line.lineStyle(2, color, 1);
      line.lineBetween(0, 0, Math.cos(angle) * length, Math.sin(angle) * length);
      line.setDepth(9997);

      this.scene.tweens.add({
        targets: line,
        alpha: 0,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 200,
        onComplete: () => line.destroy(),
      });
    }
  }

  // 사망 이펙트 (폭발)
  public showDeathExplosion(x: number, y: number, color: number, isBoss: boolean = false): void {
    const particleCount = isBoss ? 30 : 15;
    const maxRadius = isBoss ? 120 : 60;

    // 화면 흔들림
    if (isBoss) {
      this.scene.cameras.main.shake(400, 0.015);
      this.scene.cameras.main.flash(200, 255, 200, 100);
    }

    // 폭발 원
    const explosion = this.scene.add.graphics();
    explosion.setPosition(x, y);
    explosion.fillStyle(color, 0.8);
    explosion.fillCircle(0, 0, 20);
    explosion.setDepth(9999);

    this.scene.tweens.add({
      targets: explosion,
      alpha: 0,
      scaleX: isBoss ? 4 : 2.5,
      scaleY: isBoss ? 4 : 2.5,
      duration: 400,
      ease: 'Power2',
      onComplete: () => explosion.destroy(),
    });

    // 파티클들
    for (let i = 0; i < particleCount; i++) {
      const particle = this.scene.add.graphics();
      particle.setPosition(x, y);

      const pColor = Math.random() > 0.5 ? color : 0xFFFFFF;
      particle.fillStyle(pColor, 1);
      const size = Phaser.Math.Between(3, isBoss ? 10 : 6);
      particle.fillCircle(0, 0, size);
      particle.setDepth(9998);

      const angle = Math.random() * Math.PI * 2;
      const distance = Phaser.Math.Between(30, maxRadius);
      const duration = Phaser.Math.Between(300, 600);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        duration: duration,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }

    // 보스 추가 이펙트
    if (isBoss) {
      // 충격파
      const shockwave = this.scene.add.graphics();
      shockwave.setPosition(x, y);
      shockwave.lineStyle(4, 0xFFD700, 1);
      shockwave.strokeCircle(0, 0, 20);
      shockwave.setDepth(9996);

      this.scene.tweens.add({
        targets: shockwave,
        scaleX: 6,
        scaleY: 6,
        alpha: 0,
        duration: 600,
        onComplete: () => shockwave.destroy(),
      });
    }
  }

  // 레벨업/강화 이펙트
  public showLevelUpEffect(x: number, y: number, text: string = 'LEVEL UP!'): void {
    // 빛 기둥
    const pillar = this.scene.add.graphics();
    pillar.setPosition(x, y);
    pillar.fillStyle(0xFFD700, 0.3);
    pillar.fillRect(-30, -200, 60, 200);
    pillar.setDepth(9990);

    this.scene.tweens.add({
      targets: pillar,
      alpha: 0,
      duration: 1000,
      onComplete: () => pillar.destroy(),
    });

    // 반짝이는 파티클
    for (let i = 0; i < 20; i++) {
      const sparkle = this.scene.add.graphics();
      const startX = x + Phaser.Math.Between(-40, 40);
      const startY = y + Phaser.Math.Between(0, 30);
      sparkle.setPosition(startX, startY);
      sparkle.fillStyle(0xFFD700, 1);
      sparkle.fillStar(0, 0, 5, 4, 2, 5);
      sparkle.setDepth(9991);

      this.scene.tweens.add({
        targets: sparkle,
        y: startY - Phaser.Math.Between(100, 200),
        alpha: 0,
        duration: Phaser.Math.Between(800, 1500),
        delay: i * 50,
        onComplete: () => sparkle.destroy(),
      });
    }

    // 텍스트
    const levelText = this.scene.add.text(x, y - 50, text, {
      fontSize: '32px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(10000);

    this.scene.tweens.add({
      targets: levelText,
      y: levelText.y - 60,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 300,
      yoyo: true,
      hold: 500,
      onComplete: () => {
        this.scene.tweens.add({
          targets: levelText,
          alpha: 0,
          duration: 300,
          onComplete: () => levelText.destroy(),
        });
      },
    });
  }

  // 스폰 이펙트
  public showSpawnEffect(x: number, y: number, color: number, isEnemy: boolean = true): void {
    // 소환진
    const circle = this.scene.add.graphics();
    circle.setPosition(x, y + 5);
    circle.lineStyle(3, color, 0.8);
    circle.strokeCircle(0, 0, 5);
    circle.setDepth(y - 10);

    this.scene.tweens.add({
      targets: circle,
      scaleX: 8,
      scaleY: 4,
      alpha: 0,
      duration: 500,
      onComplete: () => circle.destroy(),
    });

    // 마법 파티클
    for (let i = 0; i < 8; i++) {
      const magic = this.scene.add.graphics();
      const angle = (i / 8) * Math.PI * 2;
      magic.setPosition(x + Math.cos(angle) * 30, y + Math.sin(angle) * 15);
      magic.fillStyle(color, 1);
      magic.fillCircle(0, 0, 4);
      magic.setDepth(y + 100);

      this.scene.tweens.add({
        targets: magic,
        x: x,
        y: y - 20,
        alpha: 0,
        duration: 400,
        ease: 'Power2',
        onComplete: () => magic.destroy(),
      });
    }
  }

  // 순간이동 이펙트
  public showTeleportEffect(fromX: number, fromY: number, toX: number, toY: number): void {
    // 시작점 이펙트
    const startEffect = this.scene.add.graphics();
    startEffect.setPosition(fromX, fromY);
    startEffect.fillStyle(0x00FFFF, 0.8);
    startEffect.fillCircle(0, 0, 20);
    startEffect.setDepth(9999);

    this.scene.tweens.add({
      targets: startEffect,
      alpha: 0,
      scaleX: 0.1,
      scaleY: 0.1,
      duration: 200,
      onComplete: () => startEffect.destroy(),
    });

    // 도착점 이펙트
    const endEffect = this.scene.add.graphics();
    endEffect.setPosition(toX, toY);
    endEffect.fillStyle(0x00FFFF, 0);
    endEffect.fillCircle(0, 0, 5);
    endEffect.setDepth(9999);

    this.scene.tweens.add({
      targets: endEffect,
      alpha: 0.8,
      scaleX: 4,
      scaleY: 4,
      duration: 200,
      yoyo: true,
      onComplete: () => endEffect.destroy(),
    });

    // 라인 연결
    const line = this.scene.add.graphics();
    line.setDepth(9998);
    line.lineStyle(2, 0x00FFFF, 0.5);
    line.lineBetween(fromX, fromY, toX, toY);

    this.scene.tweens.add({
      targets: line,
      alpha: 0,
      duration: 300,
      onComplete: () => line.destroy(),
    });
  }

  // 투사체 트레일
  public createProjectileTrail(x: number, y: number, color: number): void {
    const trail = this.scene.add.graphics();
    trail.setPosition(x, y);
    trail.fillStyle(color, 0.5);
    trail.fillCircle(0, 0, 4);
    trail.setDepth(y - 1);

    this.scene.tweens.add({
      targets: trail,
      alpha: 0,
      scaleX: 0.3,
      scaleY: 0.3,
      duration: 150,
      onComplete: () => trail.destroy(),
    });
  }

  // 회복 이펙트
  public showHealEffect(x: number, y: number, amount: number): void {
    const text = this.scene.add.text(x, y - 30, `+${amount}`, {
      fontSize: '18px',
      color: '#00FF00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10000);

    // 하트/십자 파티클
    for (let i = 0; i < 5; i++) {
      const heart = this.scene.add.graphics();
      heart.setPosition(x + Phaser.Math.Between(-20, 20), y);
      heart.fillStyle(0x00FF00, 1);
      heart.fillCircle(0, 0, 3);
      heart.setDepth(9999);

      this.scene.tweens.add({
        targets: heart,
        y: heart.y - 40,
        alpha: 0,
        duration: 600,
        delay: i * 100,
        onComplete: () => heart.destroy(),
      });
    }

    this.scene.tweens.add({
      targets: text,
      y: text.y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => text.destroy(),
    });
  }

  // 분노/강화 이펙트
  public showEnrageEffect(x: number, y: number): void {
    // 빨간 오오라
    const aura = this.scene.add.graphics();
    aura.setPosition(x, y - 20);
    aura.fillStyle(0xFF0000, 0.3);
    aura.fillCircle(0, 0, 30);
    aura.setDepth(y - 1);

    this.scene.tweens.add({
      targets: aura,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 500,
      repeat: 2,
      onComplete: () => aura.destroy(),
    });

    const text = this.scene.add.text(x, y - 60, '분노!', {
      fontSize: '20px',
      color: '#FF0000',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10000);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 20,
      alpha: 0,
      duration: 1000,
      onComplete: () => text.destroy(),
    });
  }

  // 웨이브 시작 이펙트
  public showWaveStartEffect(wave: number): void {
    const centerX = this.scene.cameras.main.centerX;
    const centerY = this.scene.cameras.main.centerY;

    // 화면 가장자리 경고
    const warning = this.scene.add.graphics();
    warning.setDepth(9000);
    warning.fillStyle(0xFF0000, 0.2);
    warning.fillRect(0, 0, this.scene.cameras.main.width, 50);
    warning.fillRect(0, this.scene.cameras.main.height - 50, this.scene.cameras.main.width, 50);

    this.scene.tweens.add({
      targets: warning,
      alpha: 0,
      duration: 1000,
      repeat: 2,
      yoyo: true,
      onComplete: () => warning.destroy(),
    });
  }
}

// 싱글톤 인스턴스
let particleManagerInstance: ParticleManager | null = null;

export function initParticleManager(scene: Phaser.Scene): ParticleManager {
  particleManagerInstance = new ParticleManager(scene);
  return particleManagerInstance;
}

export function getParticleManager(): ParticleManager | null {
  return particleManagerInstance;
}
