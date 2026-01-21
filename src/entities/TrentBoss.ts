import Phaser from 'phaser';
import { Player } from './Player';
import { SoundManager } from '../utils/SoundManager';

// 공격 패턴 타입
type AttackPattern = 'root_slam' | 'leaf_storm' | 'branch_sweep' | 'seed_bomb' | 'nature_wrath';

export class TrentBoss extends Phaser.GameObjects.Container {
  public health: number = 2000;
  public maxHealth: number = 2000;
  public damage: number = 25;
  public isAttacking: boolean = false;
  public isDead: boolean = false;

  private bossGraphics!: Phaser.GameObjects.Graphics;
  private healthBar!: Phaser.GameObjects.Graphics;
  private nameText!: Phaser.GameObjects.Text;
  private shadow!: Phaser.GameObjects.Ellipse;

  private attackCooldown: number = 2500;
  private lastAttackTime: number = 0;
  private currentPattern: AttackPattern | null = null;

  // 궁극기 트리거
  private ultimate70Triggered: boolean = false;
  private ultimate30Triggered: boolean = false;
  private isUltimateCharging: boolean = false;

  private attackPatterns: AttackPattern[] = [
    'root_slam',      // 뿌리 내려찍기
    'leaf_storm',     // 나뭇잎 폭풍
    'branch_sweep',   // 가지 휘두르기
    'seed_bomb',      // 씨앗 폭탄
    'nature_wrath',   // 자연의 분노 (광역)
  ];

  // 물리 바디
  declare public body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // 물리 설정
    if (this.body) {
      this.body.setSize(120, 150);
      this.body.setOffset(-60, -75);
      this.body.setImmovable(true);
    }

    // 그림자 생성
    this.shadow = scene.add.ellipse(x, y + 80, 140, 40, 0x000000, 0.4);
    this.shadow.setDepth(49);

    // 보스 그래픽 생성
    this.bossGraphics = scene.add.graphics();
    this.drawBoss();

    // 체력바 생성 (화면 상단 UI로 대체되므로 숨김)
    this.healthBar = scene.add.graphics();
    // this.updateHealthBar(); // 상단 UI 사용

    // 이름 표시 (화면 상단 UI로 대체되므로 숨김)
    this.nameText = scene.add.text(x, y - 140, '', {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '20px',
      color: '#ff6644',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });
    this.nameText.setOrigin(0.5, 0.5);
    this.nameText.setDepth(200);
  }

  private drawBoss(): void {
    this.bossGraphics.clear();
    this.bossGraphics.setDepth(100);

    const x = this.x;
    const y = this.y;

    // 뿌리 (바닥)
    this.bossGraphics.fillStyle(0x4a3728, 1);
    for (let i = 0; i < 5; i++) {
      const rx = x + (i - 2) * 25;
      const ry = y + 60;
      this.bossGraphics.fillEllipse(rx, ry, 20, 30);
    }

    // 몸통 (나무 줄기)
    this.bossGraphics.fillStyle(0x5c4033, 1);
    this.bossGraphics.fillRoundedRect(x - 40, y - 60, 80, 140, 10);

    // 나무 껍질 텍스처
    this.bossGraphics.fillStyle(0x4a3728, 0.6);
    for (let i = 0; i < 6; i++) {
      const ty = y - 50 + i * 20;
      this.bossGraphics.fillRoundedRect(x - 35, ty, 70, 8, 3);
    }

    // 나무 구멍 (눈 역할)
    this.bossGraphics.fillStyle(0x1a1a1a, 1);
    this.bossGraphics.fillEllipse(x - 15, y - 30, 18, 25);
    this.bossGraphics.fillEllipse(x + 15, y - 30, 18, 25);

    // 눈 빛
    this.bossGraphics.fillStyle(0xff4422, 0.9);
    this.bossGraphics.fillCircle(x - 15, y - 32, 6);
    this.bossGraphics.fillCircle(x + 15, y - 32, 6);

    this.bossGraphics.fillStyle(0xffaa00, 0.7);
    this.bossGraphics.fillCircle(x - 13, y - 34, 3);
    this.bossGraphics.fillCircle(x + 17, y - 34, 3);

    // 입 (으르렁거리는 구멍)
    this.bossGraphics.fillStyle(0x1a1a1a, 1);
    this.bossGraphics.fillEllipse(x, y + 5, 30, 15);

    // 가지 (팔)
    this.bossGraphics.fillStyle(0x5c4033, 1);
    // 왼쪽 가지
    this.bossGraphics.beginPath();
    this.bossGraphics.moveTo(x - 40, y - 40);
    this.bossGraphics.lineTo(x - 90, y - 60);
    this.bossGraphics.lineTo(x - 100, y - 80);
    this.bossGraphics.lineTo(x - 85, y - 55);
    this.bossGraphics.lineTo(x - 35, y - 30);
    this.bossGraphics.closePath();
    this.bossGraphics.fillPath();

    // 오른쪽 가지
    this.bossGraphics.beginPath();
    this.bossGraphics.moveTo(x + 40, y - 40);
    this.bossGraphics.lineTo(x + 90, y - 60);
    this.bossGraphics.lineTo(x + 100, y - 80);
    this.bossGraphics.lineTo(x + 85, y - 55);
    this.bossGraphics.lineTo(x + 35, y - 30);
    this.bossGraphics.closePath();
    this.bossGraphics.fillPath();

    // 나뭇잎 (머리 부분)
    this.bossGraphics.fillStyle(0x2d5a27, 1);
    this.bossGraphics.fillCircle(x, y - 90, 45);
    this.bossGraphics.fillCircle(x - 30, y - 75, 30);
    this.bossGraphics.fillCircle(x + 30, y - 75, 30);
    this.bossGraphics.fillCircle(x - 20, y - 110, 25);
    this.bossGraphics.fillCircle(x + 20, y - 110, 25);

    // 나뭇잎 하이라이트
    this.bossGraphics.fillStyle(0x3d7a37, 0.7);
    this.bossGraphics.fillCircle(x - 5, y - 95, 20);
    this.bossGraphics.fillCircle(x - 25, y - 80, 15);
    this.bossGraphics.fillCircle(x + 20, y - 80, 15);
  }

  private updateHealthBar(): void {
    this.healthBar.clear();
    this.healthBar.setDepth(200);

    const width = 200;
    const height = 16;
    const x = this.x - width / 2;
    const y = this.y - 170;
    const ratio = Math.max(0, this.health / this.maxHealth);

    // 배경
    this.healthBar.fillStyle(0x1a1a1a, 0.9);
    this.healthBar.fillRoundedRect(x - 2, y - 2, width + 4, height + 4, 4);

    // 체력 바
    const color = ratio > 0.5 ? 0x44aa44 : ratio > 0.25 ? 0xaaaa44 : 0xaa4444;
    this.healthBar.fillStyle(color, 1);
    this.healthBar.fillRoundedRect(x, y, width * ratio, height, 3);

    // 하이라이트
    this.healthBar.fillStyle(0xffffff, 0.2);
    this.healthBar.fillRoundedRect(x, y, width * ratio, height / 2, 3);
  }

  public update(time: number, _delta: number, player: Player): void {
    if (this.isDead || !this.active) return;

    // 궁극기 충전 중에는 일반 공격 안 함
    if (this.isUltimateCharging) return;

    // 그림자 위치
    this.shadow.setPosition(this.x, this.y + 80);

    // 보스 다시 그리기
    this.drawBoss();
    // 체력바는 BossBattleScene의 상단 UI에서 처리
    // this.updateHealthBar();

    // 공격 패턴 실행
    if (time - this.lastAttackTime >= this.attackCooldown && !this.isAttacking) {
      this.executeRandomPattern(player);
      this.lastAttackTime = time;
    }
  }

  // 궁극기 트리거 체크
  public checkUltimateTrigger(player: Player, soundManager: SoundManager): void {
    if (this.isDead || this.isUltimateCharging) return;

    const healthPercent = this.health / this.maxHealth;

    // 70% 궁극기
    if (!this.ultimate70Triggered && healthPercent <= 0.7) {
      this.ultimate70Triggered = true;
      this.executeUltimate(player, soundManager, 1);
    }
    // 30% 궁극기
    else if (!this.ultimate30Triggered && healthPercent <= 0.3) {
      this.ultimate30Triggered = true;
      this.executeUltimate(player, soundManager, 2);
    }
  }

  private executeUltimate(player: Player, soundManager: SoundManager, phase: number): void {
    this.isUltimateCharging = true;
    this.isAttacking = true;

    soundManager.playSFX('boss_ultimate');

    const { width, height } = this.scene.cameras.main;

    // 화면 어둡게
    const darkness = this.scene.add.graphics();
    darkness.fillStyle(0x000000, 0);
    darkness.fillRect(0, 0, width, height);
    darkness.setDepth(300);

    this.scene.tweens.add({
      targets: darkness,
      fillAlpha: 0.6,
      duration: 500,
    });

    // 궁극기 준비 모션
    const chargeContainer = this.scene.add.container(this.x, this.y);
    chargeContainer.setDepth(305);

    // 경고 텍스트
    const warningText = this.scene.add.text(0, -180, phase === 1 ? '숲의 분노!' : '멸망의 뿌리!', {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '32px',
      color: '#ff2222',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5,
    });
    warningText.setOrigin(0.5, 0.5);
    chargeContainer.add(warningText);

    // 텍스트 펄스
    this.scene.tweens.add({
      targets: warningText,
      scale: { from: 1, to: 1.3 },
      duration: 300,
      yoyo: true,
      repeat: -1,
    });

    // 에너지 모으는 이펙트
    let chargeTime = 0;
    const chargeGraphics = this.scene.add.graphics();
    chargeGraphics.setDepth(304);

    const chargeEvent = this.scene.time.addEvent({
      delay: 16,
      callback: () => {
        chargeGraphics.clear();
        chargeTime += 16;

        // 보스 주변 에너지 모임
        const intensity = Math.min(chargeTime / 2000, 1);

        // 바깥에서 안으로 모이는 파티클
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + chargeTime * 0.002;
          const maxDist = 200;
          const dist = maxDist * (1 - intensity * 0.5) + Math.sin(chargeTime * 0.01 + i) * 20;
          const px = this.x + Math.cos(angle) * dist;
          const py = this.y + Math.sin(angle) * dist * 0.6;

          chargeGraphics.fillStyle(phase === 1 ? 0x44ff44 : 0xff4444, 0.7);
          chargeGraphics.fillCircle(px, py, 8 + intensity * 5);
        }

        // 중심 빛
        chargeGraphics.fillStyle(phase === 1 ? 0x88ff88 : 0xff8888, 0.3 + intensity * 0.3);
        chargeGraphics.fillCircle(this.x, this.y, 60 + intensity * 40);

        // 눈 빛나기
        chargeGraphics.fillStyle(0xff0000, 0.9);
        chargeGraphics.fillCircle(this.x - 15, this.y - 32, 10 + intensity * 5);
        chargeGraphics.fillCircle(this.x + 15, this.y - 32, 10 + intensity * 5);

        // 카메라 흔들림
        if (chargeTime % 200 < 20) {
          this.scene.cameras.main.shake(100, 0.01 + intensity * 0.02);
        }
      },
      loop: true,
    });

    // 2초 후 궁극기 발동
    this.scene.time.delayedCall(2000, () => {
      chargeEvent.destroy();
      chargeGraphics.destroy();
      chargeContainer.destroy();

      // 궁극기 실행
      if (phase === 1) {
        this.ultimatePhase1(player, darkness);
      } else {
        this.ultimatePhase2(player, darkness);
      }
    });
  }

  // 1페이즈 궁극기: 숲의 분노 - 전방위 뿌리 폭발
  private ultimatePhase1(player: Player, darkness: Phaser.GameObjects.Graphics): void {
    const { width, height } = this.scene.cameras.main;

    // 대규모 카메라 흔들림
    this.scene.cameras.main.shake(1000, 0.04);
    this.scene.cameras.main.flash(300, 100, 200, 100);

    // 전방위 뿌리 공격
    const roots: { x: number; y: number; delay: number }[] = [];

    // 원형으로 뿌리 배치
    for (let ring = 1; ring <= 4; ring++) {
      const numRoots = ring * 8;
      const radius = ring * 80;

      for (let i = 0; i < numRoots; i++) {
        const angle = (i / numRoots) * Math.PI * 2;
        roots.push({
          x: this.x + Math.cos(angle) * radius,
          y: this.y + Math.sin(angle) * radius * 0.6,
          delay: ring * 200,
        });
      }
    }

    roots.forEach((root) => {
      this.scene.time.delayedCall(root.delay, () => {
        // 경고 원
        const warning = this.scene.add.graphics();
        warning.setDepth(301);
        warning.fillStyle(0xff4400, 0.4);
        warning.fillCircle(root.x, root.y, 35);
        warning.lineStyle(3, 0xff2200, 0.8);
        warning.strokeCircle(root.x, root.y, 35);

        this.scene.time.delayedCall(400, () => {
          warning.destroy();

          // 뿌리 솟아오름
          const rootGraphic = this.scene.add.graphics();
          rootGraphic.setDepth(302);

          // 뿌리 애니메이션
          let rootHeight = 0;
          const maxHeight = 80 + Phaser.Math.Between(0, 40);

          const growEvent = this.scene.time.addEvent({
            delay: 16,
            callback: () => {
              rootGraphic.clear();
              rootHeight += 10;

              // 뿌리 그리기
              rootGraphic.fillStyle(0x4a3020, 1);
              rootGraphic.fillEllipse(root.x, root.y - rootHeight / 2, 15, rootHeight);

              // 가시
              for (let j = 0; j < 3; j++) {
                const thornY = root.y - rootHeight * (j + 1) / 4;
                rootGraphic.fillStyle(0x3a2010, 1);
                rootGraphic.beginPath();
                rootGraphic.moveTo(root.x, thornY);
                rootGraphic.lineTo(root.x - 12, thornY + 8);
                rootGraphic.lineTo(root.x + 12, thornY + 8);
                rootGraphic.closePath();
                rootGraphic.fillPath();
              }

              if (rootHeight >= maxHeight) {
                growEvent.destroy();

                // 플레이어 피격 체크
                const dist = Phaser.Math.Distance.Between(root.x, root.y, player.x, player.y);
                if (dist < 50) {
                  player.takeDamage(35);
                }

                // 뿌리 사라짐
                this.scene.tweens.add({
                  targets: rootGraphic,
                  alpha: 0,
                  duration: 500,
                  delay: 300,
                  onComplete: () => rootGraphic.destroy(),
                });
              }
            },
            loop: true,
          });
        });
      });
    });

    // 궁극기 종료
    this.scene.time.delayedCall(3000, () => {
      this.scene.tweens.add({
        targets: darkness,
        alpha: 0,
        duration: 500,
        onComplete: () => darkness.destroy(),
      });
      this.isUltimateCharging = false;
      this.isAttacking = false;
    });
  }

  // 2페이즈 궁극기: 멸망의 뿌리 - 추적 + 광역
  private ultimatePhase2(player: Player, darkness: Phaser.GameObjects.Graphics): void {
    const { width, height } = this.scene.cameras.main;

    // 카메라 효과
    this.scene.cameras.main.shake(1500, 0.05);
    this.scene.cameras.main.flash(500, 150, 50, 50);

    // 플레이어 추적 공격 (5회)
    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 500, () => {
        // 플레이어 현재 위치에 경고
        const targetX = player.x;
        const targetY = player.y;

        const warning = this.scene.add.graphics();
        warning.setDepth(301);

        let warningSize = 0;
        const warningEvent = this.scene.time.addEvent({
          delay: 16,
          callback: () => {
            warning.clear();
            warningSize += 3;

            warning.lineStyle(4, 0xff0000, 0.8);
            warning.strokeCircle(targetX, targetY, Math.min(warningSize, 60));
            warning.fillStyle(0xff0000, 0.2);
            warning.fillCircle(targetX, targetY, Math.min(warningSize, 60));

            // 십자 표시
            warning.lineStyle(3, 0xff0000, 0.6);
            warning.lineBetween(targetX - 40, targetY, targetX + 40, targetY);
            warning.lineBetween(targetX, targetY - 40, targetX, targetY + 40);

            if (warningSize >= 60) warningEvent.destroy();
          },
          loop: true,
        });

        this.scene.time.delayedCall(400, () => {
          warningEvent.destroy();
          warning.destroy();

          // 거대 뿌리 폭발
          const explosion = this.scene.add.graphics();
          explosion.setDepth(302);

          // 메인 뿌리
          explosion.fillStyle(0x4a3020, 1);
          for (let j = 0; j < 8; j++) {
            const angle = (j / 8) * Math.PI * 2;
            const dist = 50;
            const rx = targetX + Math.cos(angle) * dist * 0.5;
            const ry = targetY + Math.sin(angle) * dist * 0.3;
            explosion.fillEllipse(rx, ry - 40, 12, 80);
          }

          // 중심 폭발
          explosion.fillStyle(0x3a2010, 1);
          explosion.fillCircle(targetX, targetY, 45);

          // 흙 파편
          for (let j = 0; j < 15; j++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 50 + Math.random() * 40;
            explosion.fillStyle(0x6a5a4a, 0.8);
            explosion.fillCircle(
              targetX + Math.cos(angle) * dist,
              targetY + Math.sin(angle) * dist * 0.5,
              3 + Math.random() * 4
            );
          }

          // 피격 체크
          const dist = Phaser.Math.Distance.Between(targetX, targetY, player.x, player.y);
          if (dist < 80) {
            player.takeDamage(50);
          }

          this.scene.tweens.add({
            targets: explosion,
            alpha: 0,
            duration: 600,
            delay: 200,
            onComplete: () => explosion.destroy(),
          });
        });
      });
    }

    // 마지막에 전체 화면 공격
    this.scene.time.delayedCall(3000, () => {
      // 안전지대 표시
      const safeX = this.x;
      const safeY = this.y + 100;
      const safeRadius = 80;

      const safeZone = this.scene.add.graphics();
      safeZone.setDepth(303);

      let safeTime = 0;
      const safeEvent = this.scene.time.addEvent({
        delay: 16,
        callback: () => {
          safeZone.clear();
          safeTime += 16;

          // 안전지대 표시
          const pulse = Math.sin(safeTime * 0.01) * 0.2;
          safeZone.fillStyle(0x44ff44, 0.3 + pulse);
          safeZone.fillCircle(safeX, safeY, safeRadius);
          safeZone.lineStyle(4, 0x44ff44, 0.9);
          safeZone.strokeCircle(safeX, safeY, safeRadius);

          // 화살표
          safeZone.lineStyle(3, 0x88ff88, 0.7);
          safeZone.lineBetween(safeX, safeY - safeRadius - 30, safeX, safeY - safeRadius - 10);
          safeZone.lineBetween(safeX - 10, safeY - safeRadius - 20, safeX, safeY - safeRadius - 10);
          safeZone.lineBetween(safeX + 10, safeY - safeRadius - 20, safeX, safeY - safeRadius - 10);
        },
        loop: true,
      });

      // 1.5초 후 전체 공격
      this.scene.time.delayedCall(1500, () => {
        safeEvent.destroy();
        safeZone.destroy();

        this.scene.cameras.main.flash(300, 100, 50, 0);

        // 전체 화면 뿌리
        const finalAttack = this.scene.add.graphics();
        finalAttack.setDepth(302);

        // 안전지대 외 전체 공격
        for (let i = 0; i < 50; i++) {
          let rx, ry;
          do {
            rx = Phaser.Math.Between(50, width - 50);
            ry = Phaser.Math.Between(100, height - 100);
          } while (Phaser.Math.Distance.Between(rx, ry, safeX, safeY) < safeRadius + 20);

          finalAttack.fillStyle(0x4a3020, 0.9);
          finalAttack.fillEllipse(rx, ry - 30, 10, 60);
        }

        // 안전지대 밖이면 피격
        const distToSafe = Phaser.Math.Distance.Between(safeX, safeY, player.x, player.y);
        if (distToSafe > safeRadius) {
          player.takeDamage(80);
        }

        this.scene.tweens.add({
          targets: finalAttack,
          alpha: 0,
          duration: 800,
          delay: 500,
          onComplete: () => finalAttack.destroy(),
        });
      });
    });

    // 궁극기 종료
    this.scene.time.delayedCall(5500, () => {
      this.scene.tweens.add({
        targets: darkness,
        alpha: 0,
        duration: 500,
        onComplete: () => darkness.destroy(),
      });
      this.isUltimateCharging = false;
      this.isAttacking = false;
    });
  }

  private executeRandomPattern(player: Player): void {
    const randomIndex = Phaser.Math.Between(0, this.attackPatterns.length - 1);
    this.currentPattern = this.attackPatterns[randomIndex];

    this.isAttacking = true;

    switch (this.currentPattern) {
      case 'root_slam':
        this.patternRootSlam(player);
        break;
      case 'leaf_storm':
        this.patternLeafStorm(player);
        break;
      case 'branch_sweep':
        this.patternBranchSweep(player);
        break;
      case 'seed_bomb':
        this.patternSeedBomb(player);
        break;
      case 'nature_wrath':
        this.patternNatureWrath(player);
        break;
    }
  }

  // 패턴 1: 뿌리 내려찍기 - 연속 3회 뿌리 공격
  private patternRootSlam(player: Player): void {
    this.showPatternName('뿌리 내려찍기!');

    // 화면 흔들림
    this.scene.cameras.main.shake(200, 0.01);

    // 3연속 공격
    for (let wave = 0; wave < 3; wave++) {
      this.scene.time.delayedCall(wave * 400, () => {
        const targetX = player.x + Phaser.Math.Between(-30, 30);
        const targetY = player.y + Phaser.Math.Between(-30, 30);

        // 경고 - 땅이 갈라지는 효과
        const warning = this.scene.add.graphics();
        warning.setDepth(50);

        // 균열 애니메이션
        let crackSize = 0;
        const crackEvent = this.scene.time.addEvent({
          delay: 16,
          callback: () => {
            warning.clear();
            crackSize += 5;

            // 균열 선들
            warning.lineStyle(3, 0x4a3728, 0.8);
            for (let i = 0; i < 8; i++) {
              const angle = (i / 8) * Math.PI * 2 + Math.random() * 0.3;
              const len = crackSize + Math.random() * 10;
              warning.lineBetween(
                targetX, targetY,
                targetX + Math.cos(angle) * len,
                targetY + Math.sin(angle) * len * 0.6
              );
            }

            // 중심 원
            warning.fillStyle(0xff4400, 0.3 + crackSize * 0.005);
            warning.fillCircle(targetX, targetY, 20 + crackSize * 0.5);

            if (crackSize >= 60) crackEvent.destroy();
          },
          loop: true,
        });

        // 공격 발동
        this.scene.time.delayedCall(500, () => {
          crackEvent.destroy();
          warning.destroy();

          // 카메라 흔들림
          this.scene.cameras.main.shake(150, 0.02);

          // 거대한 뿌리 솟아오름
          const root = this.scene.add.graphics();
          root.setDepth(150);

          // 메인 뿌리
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const dist = 25 + Math.random() * 20;
            const rx = targetX + Math.cos(angle) * dist;
            const ry = targetY + Math.sin(angle) * dist * 0.5;
            const height = 60 + Math.random() * 40;

            // 뿌리 몸체
            root.fillStyle(0x5c4033, 1);
            root.fillEllipse(rx, ry - height / 2, 12 + Math.random() * 8, height);

            // 뿌리 하이라이트
            root.fillStyle(0x7a5a43, 0.6);
            root.fillEllipse(rx - 2, ry - height / 2, 6, height * 0.8);
          }

          // 중심 폭발
          root.fillStyle(0x4a3728, 1);
          root.fillCircle(targetX, targetY, 35);
          root.fillStyle(0x3a2718, 1);
          root.fillCircle(targetX, targetY, 25);

          // 흙 파편
          for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 40 + Math.random() * 30;
            const px = targetX + Math.cos(angle) * dist;
            const py = targetY + Math.sin(angle) * dist * 0.5;
            root.fillStyle(0x6a5a4a, 0.8);
            root.fillCircle(px, py, 4 + Math.random() * 4);
          }

          // 충격파
          const shockwave = this.scene.add.graphics();
          shockwave.setDepth(149);
          shockwave.lineStyle(4, 0x8b7355, 0.8);
          shockwave.strokeCircle(targetX, targetY, 30);

          this.scene.tweens.add({
            targets: shockwave,
            scaleX: 3,
            scaleY: 2,
            alpha: 0,
            duration: 300,
            onComplete: () => shockwave.destroy(),
          });

          // 플레이어 피격 체크
          const dist = Phaser.Math.Distance.Between(targetX, targetY, player.x, player.y);
          if (dist < 80) {
            player.takeDamage(this.damage);
          }

          // 뿌리 사라짐
          this.scene.tweens.add({
            targets: root,
            alpha: 0,
            y: '-=30',
            duration: 600,
            delay: 400,
            onComplete: () => root.destroy(),
          });
        });
      });
    }

    this.scene.time.delayedCall(2000, () => {
      this.isAttacking = false;
    });
  }

  // 패턴 2: 나뭇잎 폭풍 - 회오리 형태로 나뭇잎 발사
  private patternLeafStorm(player: Player): void {
    this.showPatternName('나뭇잎 폭풍!');

    // 회오리 중심 이펙트
    const vortex = this.scene.add.graphics();
    vortex.setDepth(115);

    let vortexAngle = 0;
    const vortexEvent = this.scene.time.addEvent({
      delay: 16,
      callback: () => {
        vortex.clear();
        vortexAngle += 0.1;

        // 회오리 선들
        for (let i = 0; i < 6; i++) {
          const a = vortexAngle + (i / 6) * Math.PI * 2;
          const outerR = 60 + Math.sin(vortexAngle * 2 + i) * 10;

          vortex.lineStyle(3, 0x3d7a37, 0.6);
          vortex.beginPath();
          vortex.arc(this.x, this.y - 60, outerR, a, a + 0.5);
          vortex.strokePath();
        }

        // 중심 원
        vortex.fillStyle(0x2d5a27, 0.4);
        vortex.fillCircle(this.x, this.y - 60, 30);
      },
      loop: true,
    });

    // 3웨이브 나뭇잎 발사
    for (let wave = 0; wave < 3; wave++) {
      this.scene.time.delayedCall(wave * 600, () => {
        const numLeaves = 16;

        for (let i = 0; i < numLeaves; i++) {
          this.scene.time.delayedCall(i * 30, () => {
            const baseAngle = (i / numLeaves) * Math.PI * 2 + wave * 0.3;
            const leaf = this.scene.add.graphics();
            leaf.setDepth(120);

            let leafX = this.x;
            let leafY = this.y - 60;
            let leafAngle = baseAngle;
            const speed = 6 + wave;
            let rotation = Math.random() * Math.PI * 2;
            let traveled = 0;

            const moveEvent = this.scene.time.addEvent({
              delay: 16,
              callback: () => {
                // 나선형 이동
                leafAngle += 0.02;
                leafX += Math.cos(leafAngle) * speed;
                leafY += Math.sin(leafAngle) * speed;
                rotation += 0.2;
                traveled += speed;

                leaf.clear();

                // 나뭇잎 그리기 (회전)
                leaf.save();
                leaf.translateCanvas(leafX, leafY);
                leaf.rotateCanvas(rotation);

                // 나뭇잎 모양
                leaf.fillStyle(0x4d8a47, 0.9);
                leaf.fillEllipse(0, 0, 18, 10);
                leaf.fillStyle(0x3d7a37, 0.8);
                leaf.fillEllipse(0, 0, 12, 6);

                // 잎맥
                leaf.lineStyle(1, 0x2d5a27, 0.6);
                leaf.lineBetween(-8, 0, 8, 0);

                leaf.restore();

                // 잔상 효과
                const trail = this.scene.add.graphics();
                trail.setDepth(119);
                trail.fillStyle(0x3d7a37, 0.3);
                trail.fillEllipse(leafX, leafY, 10, 6);
                this.scene.tweens.add({
                  targets: trail,
                  alpha: 0,
                  duration: 150,
                  onComplete: () => trail.destroy(),
                });

                // 플레이어 충돌 체크
                const dist = Phaser.Math.Distance.Between(leafX, leafY, player.x, player.y);
                if (dist < 25) {
                  player.takeDamage(8);

                  // 피격 이펙트
                  const hit = this.scene.add.graphics();
                  hit.fillStyle(0x5d9a57, 0.8);
                  hit.fillCircle(leafX, leafY, 20);
                  this.scene.tweens.add({
                    targets: hit,
                    alpha: 0,
                    scale: 2,
                    duration: 200,
                    onComplete: () => hit.destroy(),
                  });

                  moveEvent.destroy();
                  leaf.destroy();
                }

                if (traveled > 800) {
                  moveEvent.destroy();
                  this.scene.tweens.add({
                    targets: leaf,
                    alpha: 0,
                    duration: 100,
                    onComplete: () => leaf.destroy(),
                  });
                }
              },
              loop: true,
            });
          });
        }
      });
    }

    this.scene.time.delayedCall(2500, () => {
      vortexEvent.destroy();
      this.scene.tweens.add({
        targets: vortex,
        alpha: 0,
        duration: 300,
        onComplete: () => vortex.destroy(),
      });
      this.isAttacking = false;
    });
  }

  // 패턴 3: 가지 휘두르기 - 양쪽 연속 휘두르기
  private patternBranchSweep(player: Player): void {
    this.showPatternName('가지 휘두르기!');

    // 보스가 기를 모으는 효과
    const chargeEffect = this.scene.add.graphics();
    chargeEffect.setDepth(95);

    let chargeTime = 0;
    const chargeEvent = this.scene.time.addEvent({
      delay: 16,
      callback: () => {
        chargeEffect.clear();
        chargeTime += 16;

        // 가지가 움직이는 효과
        const shake = Math.sin(chargeTime * 0.02) * 5;
        chargeEffect.lineStyle(8, 0x5c4033, 0.8);
        chargeEffect.lineBetween(this.x - 40, this.y - 40, this.x - 90 + shake, this.y - 60);
        chargeEffect.lineBetween(this.x + 40, this.y - 40, this.x + 90 - shake, this.y - 60);

        // 빛나는 효과
        chargeEffect.fillStyle(0xffaa00, 0.3 + Math.sin(chargeTime * 0.01) * 0.2);
        chargeEffect.fillCircle(this.x, this.y - 30, 50);
      },
      loop: true,
    });

    // 왼쪽 휘두르기
    this.scene.time.delayedCall(500, () => {
      chargeEvent.destroy();
      chargeEffect.destroy();

      this.executeSweep(player, -1); // 왼쪽에서 오른쪽

      // 오른쪽 휘두르기
      this.scene.time.delayedCall(400, () => {
        this.executeSweep(player, 1); // 오른쪽에서 왼쪽
      });
    });

    this.scene.time.delayedCall(1500, () => {
      this.isAttacking = false;
    });
  }

  private executeSweep(player: Player, direction: number): void {
    const startAngle = direction > 0 ? -0.8 : 0.8 + Math.PI;
    const endAngle = direction > 0 ? 0.8 : -0.8 + Math.PI;
    const sweepRange = 180;

    // 카메라 흔들림
    this.scene.cameras.main.shake(100, 0.015);

    // 휘두르기 애니메이션
    const sweep = this.scene.add.graphics();
    sweep.setDepth(130);

    let currentAngle = startAngle;
    const sweepSpeed = 0.15 * direction;

    const sweepEvent = this.scene.time.addEvent({
      delay: 16,
      callback: () => {
        sweep.clear();
        currentAngle += sweepSpeed;

        // 가지 본체
        const branchEndX = this.x + Math.cos(currentAngle) * sweepRange;
        const branchEndY = this.y + Math.sin(currentAngle) * sweepRange * 0.6;

        // 두꺼운 가지
        sweep.lineStyle(25, 0x4a3728, 1);
        sweep.lineBetween(this.x, this.y, branchEndX, branchEndY);

        sweep.lineStyle(18, 0x5c4033, 1);
        sweep.lineBetween(this.x, this.y, branchEndX, branchEndY);

        sweep.lineStyle(8, 0x6c5043, 0.8);
        sweep.lineBetween(this.x, this.y, branchEndX, branchEndY);

        // 가지 끝 돌기들
        for (let i = 0; i < 3; i++) {
          const thornAngle = currentAngle + (i - 1) * 0.3;
          const thornLen = 30;
          const thornX = branchEndX + Math.cos(thornAngle) * thornLen;
          const thornY = branchEndY + Math.sin(thornAngle) * thornLen * 0.6;

          sweep.lineStyle(8, 0x5c4033, 0.9);
          sweep.lineBetween(branchEndX, branchEndY, thornX, thornY);
        }

        // 궤적 잔상
        const trail = this.scene.add.graphics();
        trail.setDepth(125);
        trail.lineStyle(15, 0x8b7355, 0.4);
        trail.lineBetween(this.x, this.y, branchEndX, branchEndY);
        this.scene.tweens.add({
          targets: trail,
          alpha: 0,
          duration: 100,
          onComplete: () => trail.destroy(),
        });

        // 바람 이펙트
        const windX = branchEndX + Phaser.Math.Between(-20, 20);
        const windY = branchEndY + Phaser.Math.Between(-20, 20);
        sweep.lineStyle(2, 0xaaaaaa, 0.5);
        sweep.lineBetween(windX, windY, windX + direction * 30, windY - 10);

        // 플레이어 피격 체크
        const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        const playerAngle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(playerAngle - currentAngle));

        if (dist < sweepRange + 30 && angleDiff < 0.4) {
          player.takeDamage(this.damage + 5);

          // 넉백 효과
          const knockbackAngle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
          const knockbackDist = 50;
          this.scene.tweens.add({
            targets: player,
            x: player.x + Math.cos(knockbackAngle) * knockbackDist,
            y: player.y + Math.sin(knockbackAngle) * knockbackDist,
            duration: 100,
          });
        }

        // 휘두르기 완료 체크
        if ((direction > 0 && currentAngle >= endAngle) || (direction < 0 && currentAngle <= endAngle)) {
          sweepEvent.destroy();
          this.scene.tweens.add({
            targets: sweep,
            alpha: 0,
            duration: 150,
            onComplete: () => sweep.destroy(),
          });
        }
      },
      loop: true,
    });
  }

  // 패턴 4: 씨앗 폭탄 - 대량 투척 + 독가스
  private patternSeedBomb(player: Player): void {
    this.showPatternName('씨앗 폭탄!');

    // 보스가 씨앗을 모으는 효과
    const gather = this.scene.add.graphics();
    gather.setDepth(140);

    let gatherTime = 0;
    const gatherEvent = this.scene.time.addEvent({
      delay: 16,
      callback: () => {
        gather.clear();
        gatherTime += 16;

        // 씨앗들이 모이는 효과
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + gatherTime * 0.003;
          const dist = 80 - gatherTime * 0.1;
          if (dist > 20) {
            const sx = this.x + Math.cos(angle) * dist;
            const sy = this.y - 80 + Math.sin(angle) * dist * 0.5;
            gather.fillStyle(0x8b6914, 0.8);
            gather.fillCircle(sx, sy, 6);
          }
        }

        // 중심 빛
        gather.fillStyle(0xffcc00, 0.4 + Math.sin(gatherTime * 0.01) * 0.2);
        gather.fillCircle(this.x, this.y - 80, 25);
      },
      loop: true,
    });

    this.scene.time.delayedCall(600, () => {
      gatherEvent.destroy();
      gather.destroy();

      // 대량 씨앗 발사
      const numSeeds = 8;

      for (let i = 0; i < numSeeds; i++) {
        this.scene.time.delayedCall(i * 100, () => {
          // 플레이어 주변 + 랜덤 위치
          const targetX = player.x + Phaser.Math.Between(-120, 120);
          const targetY = player.y + Phaser.Math.Between(-80, 80);

          // 씨앗 생성
          const seed = this.scene.add.graphics();
          seed.setDepth(145);
          seed.setPosition(this.x, this.y - 100);

          // 씨앗 그리기
          seed.fillStyle(0x8b6914, 1);
          seed.fillEllipse(0, 0, 14, 18);
          seed.fillStyle(0x6b4914, 1);
          seed.fillEllipse(-2, -3, 6, 8);
          seed.lineStyle(2, 0x4b2904, 0.8);
          seed.strokeEllipse(0, 0, 14, 18);

          // 경고 원 (점점 커짐)
          const warning = this.scene.add.graphics();
          warning.setDepth(45);

          let warningSize = 0;
          const warningEvent = this.scene.time.addEvent({
            delay: 16,
            callback: () => {
              warning.clear();
              warningSize += 2;
              warning.lineStyle(3, 0xff4400, 0.6);
              warning.strokeCircle(targetX, targetY, Math.min(warningSize, 50));
              warning.fillStyle(0xff4400, 0.15);
              warning.fillCircle(targetX, targetY, Math.min(warningSize, 50));
            },
            loop: true,
          });

          // 포물선 궤적
          const startY = this.y - 100;

          this.scene.tweens.add({
            targets: seed,
            x: targetX,
            y: targetY,
            duration: 600,
            ease: 'Quad.easeIn',
            onUpdate: (tween) => {
              // 포물선 Y 계산
              const progress = tween.progress;
              const arcY = startY + (targetY - startY) * progress + Math.sin(progress * Math.PI) * -100;
              seed.y = arcY;

              // 회전 효과
              seed.rotation += 0.2;
            },
            onComplete: () => {
              seed.destroy();
              warningEvent.destroy();
              warning.destroy();

              // 폭발 + 독가스
              this.createSeedExplosion(targetX, targetY, player);
            },
          });
        });
      }
    });

    this.scene.time.delayedCall(3000, () => {
      this.isAttacking = false;
    });
  }

  private createSeedExplosion(x: number, y: number, player: Player): void {
    // 카메라 미세 흔들림
    this.scene.cameras.main.shake(80, 0.008);

    // 폭발 이펙트
    const explosion = this.scene.add.graphics();
    explosion.setDepth(150);

    // 메인 폭발
    explosion.fillStyle(0xffaa00, 0.9);
    explosion.fillCircle(x, y, 40);
    explosion.fillStyle(0xff6600, 0.8);
    explosion.fillCircle(x, y, 30);
    explosion.fillStyle(0xffcc44, 0.7);
    explosion.fillCircle(x, y, 18);

    // 파편들
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const dist = 35 + Math.random() * 20;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;

      explosion.fillStyle(0x8b6914, 0.8);
      explosion.fillCircle(px, py, 4 + Math.random() * 4);
    }

    // 플레이어 피격 체크
    const dist = Phaser.Math.Distance.Between(x, y, player.x, player.y);
    if (dist < 55) {
      player.takeDamage(12);
    }

    // 폭발 확장 애니메이션
    this.scene.tweens.add({
      targets: explosion,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 300,
      onComplete: () => explosion.destroy(),
    });

    // 독가스 생성
    const gas = this.scene.add.graphics();
    gas.setDepth(48);

    let gasTime = 0;
    const gasEvent = this.scene.time.addEvent({
      delay: 16,
      callback: () => {
        gas.clear();
        gasTime += 16;

        const gasAlpha = 0.4 - gasTime * 0.0003;
        if (gasAlpha <= 0) {
          gasEvent.destroy();
          gas.destroy();
          return;
        }

        // 물결치는 독가스
        for (let i = 0; i < 3; i++) {
          const offset = Math.sin(gasTime * 0.005 + i) * 10;
          gas.fillStyle(0x66aa44, gasAlpha - i * 0.1);
          gas.fillEllipse(x + offset, y - i * 5, 60 + i * 10, 35 + i * 5);
        }

        // 독가스 데미지 (0.5초마다)
        if (gasTime % 500 < 20) {
          const gasDist = Phaser.Math.Distance.Between(x, y, player.x, player.y);
          if (gasDist < 50) {
            player.takeDamage(3);
          }
        }
      },
      loop: true,
    });

    // 1.5초 후 가스 제거
    this.scene.time.delayedCall(1500, () => {
      gasEvent.destroy();
      this.scene.tweens.add({
        targets: gas,
        alpha: 0,
        duration: 300,
        onComplete: () => gas.destroy(),
      });
    });
  }

  // 패턴 5: 자연의 분노 - 화면 전체 궁극기
  private patternNatureWrath(player: Player): void {
    this.showPatternName('자연의 분노!!');

    // 안전지대 위치
    const safeX = this.x + Phaser.Math.Between(-150, 150);
    const safeY = this.y + Phaser.Math.Between(80, 180);
    const safeRadius = 75;

    // 화면 어둡게
    const darkness = this.scene.add.graphics();
    darkness.fillStyle(0x000000, 0);
    darkness.fillRect(0, 0, 1280, 720);
    darkness.setDepth(200);
    darkness.setScrollFactor(0);

    this.scene.tweens.add({
      targets: darkness,
      fillAlpha: 0.5,
      duration: 500,
    });

    // 보스 눈 빛나는 효과
    const eyeGlow = this.scene.add.graphics();
    eyeGlow.setDepth(205);

    let glowTime = 0;
    const glowEvent = this.scene.time.addEvent({
      delay: 16,
      callback: () => {
        eyeGlow.clear();
        glowTime += 16;

        const glowIntensity = 0.5 + Math.sin(glowTime * 0.02) * 0.3;
        const glowSize = 15 + Math.sin(glowTime * 0.015) * 5;

        // 눈 빛
        eyeGlow.fillStyle(0xff2200, glowIntensity);
        eyeGlow.fillCircle(this.x - 15, this.y - 32, glowSize);
        eyeGlow.fillCircle(this.x + 15, this.y - 32, glowSize);

        // 광선
        eyeGlow.lineStyle(3, 0xff4400, glowIntensity * 0.5);
        eyeGlow.lineBetween(this.x - 15, this.y - 32, this.x - 15 - glowSize, this.y - 32 - glowSize);
        eyeGlow.lineBetween(this.x + 15, this.y - 32, this.x + 15 + glowSize, this.y - 32 - glowSize);
      },
      loop: true,
    });

    // 안전지대 표시 (빛나는 원)
    const safeZone = this.scene.add.graphics();
    safeZone.setDepth(210);

    let safeTime = 0;
    const safeEvent = this.scene.time.addEvent({
      delay: 16,
      callback: () => {
        safeZone.clear();
        safeTime += 16;

        // 빛나는 안전지대
        const pulse = Math.sin(safeTime * 0.01) * 0.2;
        safeZone.fillStyle(0x44ff44, 0.2 + pulse);
        safeZone.fillCircle(safeX, safeY, safeRadius);

        // 테두리 회전 효과
        for (let i = 0; i < 8; i++) {
          const angle = safeTime * 0.003 + (i / 8) * Math.PI * 2;
          const px = safeX + Math.cos(angle) * safeRadius;
          const py = safeY + Math.sin(angle) * safeRadius;
          safeZone.fillStyle(0x88ff88, 0.8);
          safeZone.fillCircle(px, py, 5);
        }

        safeZone.lineStyle(3, 0x44ff44, 0.8 + pulse);
        safeZone.strokeCircle(safeX, safeY, safeRadius);

        // "여기로!" 텍스트 효과
        safeZone.lineStyle(2, 0x88ff88, 0.6);
        safeZone.lineBetween(safeX, safeY - safeRadius - 20, safeX, safeY - safeRadius - 5);
        safeZone.lineBetween(safeX - 10, safeY - safeRadius - 15, safeX, safeY - safeRadius - 5);
        safeZone.lineBetween(safeX + 10, safeY - safeRadius - 15, safeX, safeY - safeRadius - 5);
      },
      loop: true,
    });

    // 카운트다운
    let countdown = 3;
    const countText = this.scene.add.text(this.x, this.y - 100, countdown.toString(), {
      fontSize: '72px',
      color: '#ff2222',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    });
    countText.setOrigin(0.5, 0.5);
    countText.setDepth(220);

    const countEvent = this.scene.time.addEvent({
      delay: 600,
      callback: () => {
        countdown--;

        // 카운트다운 숫자 효과
        this.scene.tweens.add({
          targets: countText,
          scale: 1.5,
          duration: 100,
          yoyo: true,
        });

        // 화면 흔들림 증가
        this.scene.cameras.main.shake(100, 0.01 + (3 - countdown) * 0.01);

        if (countdown > 0) {
          countText.setText(countdown.toString());
        } else {
          countText.destroy();
          countEvent.destroy();
        }
      },
      repeat: 2,
    });

    // 2초 후 공격 발동
    this.scene.time.delayedCall(2000, () => {
      glowEvent.destroy();
      eyeGlow.destroy();
      safeEvent.destroy();
      safeZone.destroy();

      // 대격변 발동!
      this.scene.cameras.main.shake(500, 0.04);
      this.scene.cameras.main.flash(300, 100, 50, 0);

      // 거대한 덩굴/뿌리 폭발
      const wrath = this.scene.add.graphics();
      wrath.setDepth(215);

      // 바닥에서 솟아오르는 뿌리들
      const roots: { x: number; y: number; height: number; maxHeight: number; angle: number }[] = [];
      for (let i = 0; i < 40; i++) {
        // 안전지대 밖에만 생성
        let rx, ry;
        do {
          rx = this.x + Phaser.Math.Between(-350, 350);
          ry = this.y + Phaser.Math.Between(-200, 250);
        } while (Phaser.Math.Distance.Between(rx, ry, safeX, safeY) < safeRadius + 30);

        roots.push({
          x: rx,
          y: ry,
          height: 0,
          maxHeight: 60 + Math.random() * 80,
          angle: Math.random() * 0.4 - 0.2,
        });
      }

      // 뿌리 솟아오르는 애니메이션
      let wrathTime = 0;
      const wrathEvent = this.scene.time.addEvent({
        delay: 16,
        callback: () => {
          wrath.clear();
          wrathTime += 16;

          // 어두운 배경
          wrath.fillStyle(0x1a3a1a, 0.6);
          wrath.fillRect(this.x - 400, this.y - 250, 800, 500);

          // 뿌리 그리기
          roots.forEach((root) => {
            if (root.height < root.maxHeight) {
              root.height += 8;
            }

            // 뿌리 몸체
            wrath.fillStyle(0x4a3020, 1);
            const wobble = Math.sin(wrathTime * 0.01 + root.x * 0.01) * 3;

            // 뿌리 모양 (아래에서 위로)
            wrath.beginPath();
            wrath.moveTo(root.x - 8, root.y);
            wrath.lineTo(root.x - 5 + wobble, root.y - root.height * 0.5);
            wrath.lineTo(root.x - 3 + wobble, root.y - root.height);
            wrath.lineTo(root.x + 3 + wobble, root.y - root.height);
            wrath.lineTo(root.x + 5 + wobble, root.y - root.height * 0.5);
            wrath.lineTo(root.x + 8, root.y);
            wrath.closePath();
            wrath.fillPath();

            // 뿌리 하이라이트
            wrath.fillStyle(0x5a4030, 0.7);
            wrath.fillEllipse(root.x + wobble, root.y - root.height * 0.7, 4, root.height * 0.5);

            // 끝 가시
            if (root.height >= root.maxHeight * 0.9) {
              wrath.fillStyle(0x3a2010, 1);
              wrath.beginPath();
              wrath.moveTo(root.x + wobble, root.y - root.height);
              wrath.lineTo(root.x - 6 + wobble, root.y - root.height + 10);
              wrath.lineTo(root.x + 6 + wobble, root.y - root.height + 10);
              wrath.closePath();
              wrath.fillPath();
            }
          });

          // 나뭇잎/덩굴 파편
          if (wrathTime < 500) {
            for (let i = 0; i < 5; i++) {
              const fx = this.x + Phaser.Math.Between(-300, 300);
              const fy = this.y + Phaser.Math.Between(-150, 200);

              if (Phaser.Math.Distance.Between(fx, fy, safeX, safeY) > safeRadius) {
                wrath.fillStyle(0x3d6a37, 0.7);
                wrath.fillEllipse(fx, fy, 8 + Math.random() * 6, 4 + Math.random() * 4);
              }
            }
          }
        },
        loop: true,
      });

      // 플레이어 피격 체크 (연속 데미지)
      let damageCount = 0;
      const damageEvent = this.scene.time.addEvent({
        delay: 200,
        callback: () => {
          damageCount++;
          const distToSafe = Phaser.Math.Distance.Between(safeX, safeY, player.x, player.y);
          if (distToSafe > safeRadius) {
            player.takeDamage(15);

            // 피격 이펙트
            const hitFx = this.scene.add.graphics();
            hitFx.fillStyle(0x5c4033, 0.6);
            hitFx.fillCircle(player.x, player.y, 30);
            hitFx.setDepth(216);
            this.scene.tweens.add({
              targets: hitFx,
              alpha: 0,
              scale: 1.5,
              duration: 200,
              onComplete: () => hitFx.destroy(),
            });
          }

          if (damageCount >= 5) {
            damageEvent.destroy();
          }
        },
        loop: true,
      });

      // 1.5초 후 종료
      this.scene.time.delayedCall(1500, () => {
        wrathEvent.destroy();
        damageEvent.destroy();

        this.scene.tweens.add({
          targets: [wrath, darkness],
          alpha: 0,
          duration: 500,
          onComplete: () => {
            wrath.destroy();
            darkness.destroy();
          },
        });

        this.isAttacking = false;
      });
    });
  }

  private showPatternName(name: string): void {
    // 배경 플래시
    const flash = this.scene.add.graphics();
    flash.fillStyle(0x5c4033, 0.3);
    flash.fillRect(this.x - 200, this.y - 200, 400, 60);
    flash.setDepth(199);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 800,
      onComplete: () => flash.destroy(),
    });

    // 메인 텍스트
    const text = this.scene.add.text(this.x, this.y - 180, name, {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '28px',
      color: '#ffcc00',
      fontStyle: 'bold',
      stroke: '#442200',
      strokeThickness: 5,
    });
    text.setOrigin(0.5, 0.5);
    text.setDepth(200);
    text.setScale(0.5);

    // 등장 애니메이션
    this.scene.tweens.add({
      targets: text,
      scale: 1.2,
      duration: 150,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: text,
          scale: 1,
          duration: 100,
        });
      },
    });

    // 사이드 라인 효과
    const leftLine = this.scene.add.graphics();
    const rightLine = this.scene.add.graphics();
    leftLine.setDepth(199);
    rightLine.setDepth(199);

    leftLine.lineStyle(3, 0xffaa00, 0.8);
    leftLine.lineBetween(this.x - 150, this.y - 180, this.x - 80, this.y - 180);
    rightLine.lineStyle(3, 0xffaa00, 0.8);
    rightLine.lineBetween(this.x + 80, this.y - 180, this.x + 150, this.y - 180);

    // 페이드 아웃
    this.scene.tweens.add({
      targets: [text, leftLine, rightLine],
      y: '-=40',
      alpha: 0,
      duration: 1200,
      delay: 300,
      onComplete: () => {
        text.destroy();
        leftLine.destroy();
        rightLine.destroy();
      },
    });
  }

  public takeDamage(amount: number): void {
    if (this.isDead) return;

    this.health = Math.max(0, this.health - amount);

    // 피격 효과
    const flash = this.scene.add.graphics();
    flash.fillStyle(0xffffff, 0.5);
    flash.fillRoundedRect(this.x - 50, this.y - 70, 100, 160, 10);
    flash.setDepth(101);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 100,
      onComplete: () => flash.destroy(),
    });

    // 데미지 텍스트
    const dmgText = this.scene.add.text(this.x, this.y - 80, `-${amount}`, {
      fontSize: '24px',
      color: '#ff4444',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    });
    dmgText.setOrigin(0.5, 0.5);
    dmgText.setDepth(200);

    this.scene.tweens.add({
      targets: dmgText,
      y: this.y - 130,
      alpha: 0,
      duration: 800,
      onComplete: () => dmgText.destroy(),
    });

    this.updateHealthBar();

    if (this.health <= 0) {
      this.die();
    }
  }

  private die(): void {
    this.isDead = true;

    // 사망 연출
    const deathText = this.scene.add.text(this.x, this.y - 100, '트렌트 처치!', {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '32px',
      color: '#ffdd00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    });
    deathText.setOrigin(0.5, 0.5);
    deathText.setDepth(300);

    this.scene.tweens.add({
      targets: deathText,
      y: this.y - 200,
      scale: 1.5,
      duration: 2000,
      onComplete: () => deathText.destroy(),
    });

    // 보스 사라짐
    this.scene.tweens.add({
      targets: [this.bossGraphics, this.shadow],
      alpha: 0,
      duration: 1000,
      onComplete: () => {
        this.bossGraphics.destroy();
        this.shadow.destroy();
        this.healthBar.destroy();
        this.nameText.destroy();
        this.destroy();
      },
    });

    // TODO: 보상 드롭, 스테이지 클리어 처리
  }

  public destroy(fromScene?: boolean): void {
    if (this.bossGraphics) this.bossGraphics.destroy();
    if (this.healthBar) this.healthBar.destroy();
    if (this.nameText) this.nameText.destroy();
    if (this.shadow) this.shadow.destroy();
    super.destroy(fromScene);
  }
}
