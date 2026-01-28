import Phaser from 'phaser';
import { SoundManager } from '../utils/SoundManager';

interface RunePillar {
  x: number;
  y: number;
  runeIndex: number;
  isActive: boolean;
  isLit: boolean;
  container: Phaser.GameObjects.Container;
  pillarGraphics: Phaser.GameObjects.Graphics;
  runeGraphics: Phaser.GameObjects.Graphics;
  glowGraphics: Phaser.GameObjects.Graphics;
}

export class PuzzleSystem {
  private scene: Phaser.Scene;
  private pillars: RunePillar[] = [];
  private correctSequence: number[] = [];
  private playerSequence: number[] = [];
  private sequenceLength: number = 5;
  private isShowingSequence: boolean = false;
  private isPuzzleActive: boolean = false;
  private isInputEnabled: boolean = false;
  private timeRemaining: number;
  private timeLimit: number;
  private onComplete: () => void;
  private onFail: () => void;
  private soundManager: SoundManager;
  private timerText!: Phaser.GameObjects.Text;
  private instructionText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private groundY: number;

  // 룬 심볼 색상
  private readonly RUNE_COLORS = [
    0xff4444, // 빨강
    0x44ff44, // 초록
    0x4444ff, // 파랑
    0xffff44, // 노랑
    0xff44ff, // 분홍
  ];

  constructor(
    scene: Phaser.Scene,
    groundY: number,
    timeLimit: number,
    onComplete: () => void,
    onFail: () => void
  ) {
    this.scene = scene;
    this.groundY = groundY;
    this.timeLimit = timeLimit;
    this.timeRemaining = timeLimit;
    this.onComplete = onComplete;
    this.onFail = onFail;
    this.soundManager = new SoundManager();
  }

  public start(): void {
    this.isPuzzleActive = true;
    this.timeRemaining = this.timeLimit;

    this.createPillars();
    this.createUI();
    this.generateSequence();

    // 시퀀스 보여주기 시작
    this.scene.time.delayedCall(1500, () => {
      this.showSequence();
    });
  }

  private createPillars(): void {
    const mapWidth = 1400;
    const startX = 200;
    const spacing = (mapWidth - 400) / 4;

    for (let i = 0; i < 5; i++) {
      const x = startX + i * spacing;
      const y = this.groundY;

      const container = this.scene.add.container(x, y);

      // 기둥 본체
      const pillarGraphics = this.scene.add.graphics();
      pillarGraphics.fillStyle(0x333344, 1);
      pillarGraphics.fillRect(-25, -120, 50, 120);
      pillarGraphics.fillStyle(0x222233, 1);
      pillarGraphics.fillRect(-30, -130, 60, 15);
      pillarGraphics.fillRect(-30, -5, 60, 10);
      container.add(pillarGraphics);

      // 룬 심볼
      const runeGraphics = this.scene.add.graphics();
      this.drawRune(runeGraphics, i, 0x666677);
      container.add(runeGraphics);

      // 글로우 효과 (비활성)
      const glowGraphics = this.scene.add.graphics();
      glowGraphics.setAlpha(0);
      container.add(glowGraphics);

      // 번호 표시
      const numText = this.scene.add.text(0, -140, `${i + 1}`, {
        fontSize: '16px',
        color: '#888888',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      container.add(numText);

      const pillar: RunePillar = {
        x,
        y,
        runeIndex: i,
        isActive: false,
        isLit: false,
        container,
        pillarGraphics,
        runeGraphics,
        glowGraphics,
      };

      this.pillars.push(pillar);
    }
  }

  private drawRune(graphics: Phaser.GameObjects.Graphics, index: number, color: number): void {
    graphics.clear();
    graphics.lineStyle(3, color, 1);

    const cx = 0;
    const cy = -65;
    const size = 20;

    switch (index) {
      case 0: // 삼각형
        graphics.beginPath();
        graphics.moveTo(cx, cy - size);
        graphics.lineTo(cx - size, cy + size);
        graphics.lineTo(cx + size, cy + size);
        graphics.closePath();
        graphics.stroke();
        break;
      case 1: // 원
        graphics.strokeCircle(cx, cy, size);
        break;
      case 2: // 사각형
        graphics.strokeRect(cx - size, cy - size, size * 2, size * 2);
        break;
      case 3: // X
        graphics.beginPath();
        graphics.moveTo(cx - size, cy - size);
        graphics.lineTo(cx + size, cy + size);
        graphics.moveTo(cx + size, cy - size);
        graphics.lineTo(cx - size, cy + size);
        graphics.stroke();
        break;
      case 4: // 다이아몬드
        graphics.beginPath();
        graphics.moveTo(cx, cy - size);
        graphics.lineTo(cx + size, cy);
        graphics.lineTo(cx, cy + size);
        graphics.lineTo(cx - size, cy);
        graphics.closePath();
        graphics.stroke();
        break;
    }
  }

  private createUI(): void {
    // 안내 텍스트
    this.instructionText = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      100,
      '룬의 순서를 기억하세요!',
      {
        fontSize: '24px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

    // 타이머
    this.timerText = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      140,
      '',
      {
        fontSize: '32px',
        color: '#ffaa00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

    // 진행도
    this.progressText = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      180,
      '',
      {
        fontSize: '18px',
        color: '#88ff88',
        stroke: '#000000',
        strokeThickness: 2,
      }
    ).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

    this.updateTimerDisplay();
  }

  private generateSequence(): void {
    this.correctSequence = [];
    for (let i = 0; i < this.sequenceLength; i++) {
      this.correctSequence.push(Math.floor(Math.random() * 5));
    }
  }

  private showSequence(): void {
    this.isShowingSequence = true;
    this.instructionText.setText('순서를 기억하세요!');

    let delay = 0;
    for (let i = 0; i < this.correctSequence.length; i++) {
      this.scene.time.delayedCall(delay, () => {
        this.lightUpPillar(this.correctSequence[i], true);
      });
      delay += 800;

      this.scene.time.delayedCall(delay, () => {
        this.lightUpPillar(this.correctSequence[i], false);
      });
      delay += 300;
    }

    // 시퀀스 표시 완료 후 입력 활성화
    this.scene.time.delayedCall(delay + 500, () => {
      this.isShowingSequence = false;
      this.isInputEnabled = true;
      this.instructionText.setText('기둥에 다가가 ↑를 눌러 활성화하세요!');
      this.updateProgressDisplay();
    });
  }

  private lightUpPillar(index: number, lit: boolean): void {
    const pillar = this.pillars[index];
    if (!pillar) return;

    pillar.isLit = lit;

    if (lit) {
      // 룬 색상 변경
      this.drawRune(pillar.runeGraphics, index, this.RUNE_COLORS[index]);

      // 글로우 효과
      pillar.glowGraphics.clear();
      pillar.glowGraphics.fillStyle(this.RUNE_COLORS[index], 0.4);
      pillar.glowGraphics.fillEllipse(0, -65, 60, 80);
      pillar.glowGraphics.setAlpha(1);

      this.soundManager.playRuneActivate();

      // 파티클
      for (let i = 0; i < 8; i++) {
        const particle = this.scene.add.graphics();
        particle.setPosition(pillar.x, pillar.y - 65);
        particle.fillStyle(this.RUNE_COLORS[index], 0.8);
        particle.fillCircle(0, 0, 4);

        const angle = (i / 8) * Math.PI * 2;
        this.scene.tweens.add({
          targets: particle,
          x: pillar.x + Math.cos(angle) * 40,
          y: pillar.y - 65 + Math.sin(angle) * 30,
          alpha: 0,
          duration: 400,
          onComplete: () => particle.destroy(),
        });
      }
    } else {
      this.drawRune(pillar.runeGraphics, index, 0x666677);
      pillar.glowGraphics.setAlpha(0);
    }
  }

  public activatePillar(pillarIndex: number): void {
    if (!this.isInputEnabled || this.isShowingSequence) return;

    const pillar = this.pillars[pillarIndex];
    if (!pillar || pillar.isActive) return;

    // 활성화 이펙트
    this.lightUpPillar(pillarIndex, true);
    pillar.isActive = true;

    // 입력 기록
    this.playerSequence.push(pillarIndex);
    this.updateProgressDisplay();

    // 정답 체크
    const currentIndex = this.playerSequence.length - 1;
    if (this.playerSequence[currentIndex] !== this.correctSequence[currentIndex]) {
      // 틀림!
      this.handleWrongInput();
      return;
    }

    // 완료 체크
    if (this.playerSequence.length === this.correctSequence.length) {
      this.handleSuccess();
    }
  }

  private handleWrongInput(): void {
    this.isInputEnabled = false;
    this.soundManager.playPuzzleFail();

    this.instructionText.setText('틀렸습니다! 다시 시작합니다...');
    this.instructionText.setColor('#ff4444');

    // 모든 기둥 빨간색으로 깜빡임
    for (const pillar of this.pillars) {
      this.scene.tweens.add({
        targets: pillar.container,
        alpha: 0.3,
        duration: 150,
        yoyo: true,
        repeat: 2,
      });
    }

    // 리셋
    this.scene.time.delayedCall(1500, () => {
      this.resetPuzzle();
    });
  }

  private resetPuzzle(): void {
    this.playerSequence = [];

    for (const pillar of this.pillars) {
      pillar.isActive = false;
      pillar.isLit = false;
      this.drawRune(pillar.runeGraphics, pillar.runeIndex, 0x666677);
      pillar.glowGraphics.setAlpha(0);
      pillar.container.setAlpha(1);
    }

    this.instructionText.setText('순서를 기억하세요!');
    this.instructionText.setColor('#ffffff');
    this.updateProgressDisplay();

    // 시퀀스 다시 보여주기
    this.scene.time.delayedCall(1000, () => {
      this.showSequence();
    });
  }

  private handleSuccess(): void {
    this.isInputEnabled = false;
    this.isPuzzleActive = false;
    this.soundManager.playPuzzleSuccess();

    this.instructionText.setText('성공!');
    this.instructionText.setColor('#44ff44');
    this.instructionText.setFontSize(36);

    // 모든 기둥 빛나게
    for (const pillar of this.pillars) {
      this.scene.tweens.add({
        targets: pillar.glowGraphics,
        alpha: 1,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 500,
        yoyo: true,
        repeat: 2,
      });
    }

    this.scene.time.delayedCall(2000, () => {
      this.cleanup();
      this.onComplete();
    });
  }

  private updateTimerDisplay(): void {
    const seconds = Math.ceil(this.timeRemaining / 1000);
    this.timerText.setText(`${seconds}초`);

    if (seconds <= 30) {
      this.timerText.setColor('#ff4444');
    }
  }

  private updateProgressDisplay(): void {
    this.progressText.setText(`진행: ${this.playerSequence.length} / ${this.sequenceLength}`);
  }

  public update(delta: number): void {
    if (!this.isPuzzleActive) return;

    this.timeRemaining -= delta;
    this.updateTimerDisplay();

    if (this.timeRemaining <= 0) {
      this.handleTimeout();
    }
  }

  private handleTimeout(): void {
    this.isPuzzleActive = false;
    this.isInputEnabled = false;
    this.soundManager.playPuzzleFail();

    this.instructionText.setText('시간 초과!');
    this.instructionText.setColor('#ff4444');
    this.instructionText.setFontSize(36);

    this.scene.time.delayedCall(2000, () => {
      this.cleanup();
      this.onFail();
    });
  }

  public checkPlayerNearPillar(playerX: number, playerY: number): number {
    for (let i = 0; i < this.pillars.length; i++) {
      const pillar = this.pillars[i];
      const dx = Math.abs(playerX - pillar.x);
      const dy = Math.abs(playerY - pillar.y);

      if (dx < 40 && dy < 50 && !pillar.isActive) {
        return i;
      }
    }
    return -1;
  }

  public getTimeRemaining(): number {
    return this.timeRemaining;
  }

  public isActive(): boolean {
    return this.isPuzzleActive;
  }

  public isWaitingForInput(): boolean {
    return this.isInputEnabled && !this.isShowingSequence;
  }

  private cleanup(): void {
    for (const pillar of this.pillars) {
      pillar.container.destroy();
    }
    this.pillars = [];

    this.timerText.destroy();
    this.instructionText.destroy();
    this.progressText.destroy();
  }
}
