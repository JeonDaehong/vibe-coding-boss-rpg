import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SKILL_TYPES } from '../config/GameConfig';
import { Player } from '../entities/Player';

export class UIScene extends Phaser.Scene {
  private gameScene!: Phaser.Scene;
  private player!: Player;

  // HP/EXP 바
  private hpBarBg!: Phaser.GameObjects.Graphics;
  private hpBar!: Phaser.GameObjects.Graphics;
  private expBarBg!: Phaser.GameObjects.Graphics;
  private expBar!: Phaser.GameObjects.Graphics;

  // 텍스트
  private hpText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private expText!: Phaser.GameObjects.Text;

  // 스킬 슬롯
  private skillSlots: Phaser.GameObjects.Container[] = [];
  private skillCooldownOverlays: Map<string, Phaser.GameObjects.Graphics> = new Map();

  // 콤보 표시
  private comboContainer!: Phaser.GameObjects.Container;
  private comboText!: Phaser.GameObjects.Text;
  private comboCountText!: Phaser.GameObjects.Text;
  private lastComboCount: number = 0;

  // 조작 안내
  private controlsText!: Phaser.GameObjects.Text;

  // 맵 이름
  private mapNameText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    this.gameScene = this.scene.get('GameScene');
    this.player = (this.gameScene as any).player;

    this.createStatusBars();
    this.createSkillBar();
    this.createGoldDisplay();
    this.createComboDisplay();
    this.createControlsGuide();
    this.setupEventListeners();
  }

  private createStatusBars(): void {
    const barX = 20;
    const barY = 20;
    const barWidth = 250;
    const barHeight = 22;
    const gap = 8;

    // 상태바 패널 배경
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x000000, 0.7);
    panelBg.fillRoundedRect(10, 10, 280, 100, 10);
    panelBg.lineStyle(2, 0x00ffff, 0.4);
    panelBg.strokeRoundedRect(10, 10, 280, 100, 10);

    // 레벨 표시
    const levelBg = this.add.graphics();
    levelBg.fillStyle(0x9944ff, 0.9);
    levelBg.fillCircle(45, 45, 28);
    levelBg.lineStyle(3, 0xcc66ff);
    levelBg.strokeCircle(45, 45, 28);
    levelBg.fillStyle(0x000000, 0.3);
    levelBg.fillCircle(45, 45, 22);

    this.levelText = this.add.text(45, 45, '1', {
      fontSize: '22px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // HP 바
    const hpStartX = 80;
    const hpY = 25;

    this.hpBarBg = this.add.graphics();
    this.hpBarBg.fillStyle(0x333333);
    this.hpBarBg.fillRoundedRect(hpStartX, hpY, barWidth - 30, barHeight, 5);
    this.hpBarBg.lineStyle(2, 0x555555);
    this.hpBarBg.strokeRoundedRect(hpStartX, hpY, barWidth - 30, barHeight, 5);

    this.hpBar = this.add.graphics();

    // HP 아이콘
    const hpIcon = this.add.graphics();
    hpIcon.fillStyle(0xFF4444);
    hpIcon.fillCircle(hpStartX - 15, hpY + barHeight / 2, 8);
    hpIcon.fillStyle(0xFF8888, 0.6);
    hpIcon.fillCircle(hpStartX - 17, hpY + barHeight / 2 - 2, 4);

    this.hpText = this.add.text(hpStartX + (barWidth - 30) / 2, hpY + barHeight / 2, '', {
      fontSize: '14px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    // EXP 바
    const expY = hpY + barHeight + gap;

    this.expBarBg = this.add.graphics();
    this.expBarBg.fillStyle(0x333333);
    this.expBarBg.fillRoundedRect(hpStartX, expY, barWidth - 30, 14, 3);
    this.expBarBg.lineStyle(1, 0x555555);
    this.expBarBg.strokeRoundedRect(hpStartX, expY, barWidth - 30, 14, 3);

    this.expBar = this.add.graphics();

    this.expText = this.add.text(hpStartX + (barWidth - 30) / 2, expY + 7, '', {
      fontSize: '11px',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 1,
    }).setOrigin(0.5);

    // 초기 업데이트
    this.updateHpBar();
    this.updateExpBar();
  }

  private createSkillBar(): void {
    const skillBarY = GAME_HEIGHT - 70;
    const startX = GAME_WIDTH / 2 - 270;
    const slotSize = 50;
    const gap = 6;

    // 스킬바 배경
    const skillBarBg = this.add.graphics();
    skillBarBg.fillStyle(0x000000, 0.8);
    skillBarBg.fillRoundedRect(startX - 15, skillBarY - 15, 570, 80, 10);
    skillBarBg.lineStyle(2, 0x9944ff, 0.6);
    skillBarBg.strokeRoundedRect(startX - 15, skillBarY - 15, 570, 80, 10);

    const skills = [
      { key: 'Ctrl', name: '파이어볼', skillKey: 'FIREBALL', color: 0xff6600 },
      { key: 'Q', name: '구울 소환', skillKey: 'GHOUL_SUMMON', color: 0x664488 },
      { key: 'W', name: '뼈가시', skillKey: 'BONE_SPIKE', color: 0xffffcc },
      { key: 'E', name: '시체폭탄', skillKey: 'CORPSE_BOMB', color: 0x88ff44 },
      { key: 'R', name: '거대구울', skillKey: 'GIANT_GHOUL', color: 0x663399 },
      { key: 'A', name: '보호막', skillKey: 'DARK_SHIELD', color: 0x4444aa },
      { key: 'S', name: '저주', skillKey: 'CURSE', color: 0x660066 },
      { key: 'D', name: '영혼흡수', skillKey: 'SOUL_DRAIN', color: 0x00ffcc },
      { key: 'F', name: '죽음파동', skillKey: 'DEATH_WAVE', color: 0x220022 },
    ];

    skills.forEach((skillData, index) => {
      const x = startX + index * (slotSize + gap);
      const slot = this.createSkillSlot(x, skillBarY + 20, slotSize, skillData);
      this.skillSlots.push(slot);
    });
  }

  private createSkillSlot(
    x: number,
    y: number,
    size: number,
    skillData: { key: string; name: string; skillKey: string; color: number }
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // 슬롯 배경
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.9);
    bg.fillRoundedRect(-size / 2, -size / 2, size, size, 6);
    bg.lineStyle(2, skillData.color, 0.7);
    bg.strokeRoundedRect(-size / 2, -size / 2, size, size, 6);
    container.add(bg);

    // 스킬 아이콘 (색상 + 심볼)
    const icon = this.add.graphics();
    icon.fillStyle(skillData.color, 0.8);
    icon.fillCircle(0, -3, 14);
    icon.lineStyle(2, 0xFFFFFF, 0.4);
    icon.strokeCircle(0, -3, 14);

    // 스킬별 심볼
    this.drawSkillSymbol(icon, skillData.skillKey);
    container.add(icon);

    // 쿨다운 오버레이
    const cooldownOverlay = this.add.graphics();
    cooldownOverlay.setVisible(false);
    container.add(cooldownOverlay);
    this.skillCooldownOverlays.set(skillData.skillKey, cooldownOverlay);

    // 쿨다운 텍스트
    const cooldownText = this.add.text(0, -3, '', {
      fontSize: '14px',
      color: '#FFFFFF',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);
    container.add(cooldownText);
    (container as any).cooldownText = cooldownText;

    // 키 표시
    const keyBg = this.add.graphics();
    keyBg.fillStyle(0x000000, 0.9);
    keyBg.fillRoundedRect(-12, 12, 24, 16, 3);
    container.add(keyBg);

    const keyText = this.add.text(0, 20, skillData.key, {
      fontSize: '10px',
      color: '#00FFFF',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(keyText);

    // 스킬 데이터 저장
    (container as any).skillKey = skillData.skillKey;
    (container as any).skillColor = skillData.color;
    (container as any).bg = bg;

    return container;
  }

  private drawSkillSymbol(graphics: Phaser.GameObjects.Graphics, skillKey: string): void {
    graphics.lineStyle(2, 0xffffff, 0.8);

    switch (skillKey) {
      case 'FIREBALL':
        // 불꽃 모양
        graphics.beginPath();
        graphics.arc(0, -3, 6, 0, Math.PI * 2, false);
        graphics.stroke();
        break;
      case 'GHOUL_SUMMON':
        // 구울 모양
        graphics.fillStyle(0xffffff, 0.8);
        graphics.fillCircle(0, -3, 6);
        // 뿔
        graphics.beginPath();
        graphics.moveTo(-4, -6);
        graphics.lineTo(-6, -12);
        graphics.moveTo(4, -6);
        graphics.lineTo(6, -12);
        graphics.stroke();
        break;
      case 'BONE_SPIKE':
        // 가시 모양
        graphics.beginPath();
        graphics.moveTo(-5, 5);
        graphics.lineTo(0, -8);
        graphics.lineTo(5, 5);
        graphics.stroke();
        break;
      case 'CORPSE_BOMB':
        // 폭발 모양
        graphics.beginPath();
        graphics.arc(0, -3, 8, 0, Math.PI * 2, false);
        graphics.stroke();
        graphics.fillStyle(0xffffff, 0.5);
        graphics.fillCircle(0, -3, 4);
        break;
      case 'GIANT_GHOUL':
        // 뿔 달린 모양
        graphics.beginPath();
        graphics.moveTo(-6, 0);
        graphics.lineTo(-4, -8);
        graphics.moveTo(6, 0);
        graphics.lineTo(4, -8);
        graphics.stroke();
        break;
      case 'DARK_SHIELD':
        // 방패 모양
        graphics.beginPath();
        graphics.arc(0, -3, 7, Math.PI * 0.2, Math.PI * 0.8, false);
        graphics.lineTo(0, 5);
        graphics.closePath();
        graphics.stroke();
        break;
      case 'CURSE':
        // 저주 문양
        graphics.beginPath();
        graphics.moveTo(-5, -5);
        graphics.lineTo(5, 3);
        graphics.moveTo(5, -5);
        graphics.lineTo(-5, 3);
        graphics.stroke();
        break;
      case 'SOUL_DRAIN':
        // 소용돌이
        graphics.beginPath();
        graphics.arc(0, -3, 6, 0, Math.PI * 1.5, false);
        graphics.stroke();
        break;
      case 'DEATH_WAVE':
        // 파동 모양
        graphics.beginPath();
        graphics.arc(0, -3, 4, 0, Math.PI * 2, false);
        graphics.stroke();
        graphics.beginPath();
        graphics.arc(0, -3, 8, 0, Math.PI * 2, false);
        graphics.stroke();
        break;
    }
  }

  private createGoldDisplay(): void {
    // 골드 패널
    const goldPanel = this.add.graphics();
    goldPanel.fillStyle(0x000000, 0.7);
    goldPanel.fillRoundedRect(GAME_WIDTH - 150, 20, 130, 40, 8);
    goldPanel.lineStyle(2, 0xFFD700, 0.5);
    goldPanel.strokeRoundedRect(GAME_WIDTH - 150, 20, 130, 40, 8);

    // 골드 아이콘
    const goldIcon = this.add.graphics();
    goldIcon.setPosition(GAME_WIDTH - 130, 40);
    goldIcon.fillStyle(0xFFD700);
    goldIcon.fillCircle(0, 0, 12);
    goldIcon.fillStyle(0xFFFF88, 0.6);
    goldIcon.fillCircle(-3, -3, 5);
    goldIcon.lineStyle(2, 0xDAA520);
    goldIcon.strokeCircle(0, 0, 12);

    // G 표시
    this.add.text(GAME_WIDTH - 130, 40, 'G', {
      fontSize: '10px',
      color: '#8B6914',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 골드 텍스트
    this.goldText = this.add.text(GAME_WIDTH - 50, 40, '0', {
      fontSize: '20px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(1, 0.5);

    // 골드 아이콘 애니메이션
    this.tweens.add({
      targets: goldIcon,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createComboDisplay(): void {
    this.comboContainer = this.add.container(GAME_WIDTH / 2, 150);
    this.comboContainer.setVisible(false);

    // 콤보 배경
    const comboBg = this.add.graphics();
    comboBg.fillStyle(0x000000, 0.7);
    comboBg.fillRoundedRect(-80, -30, 160, 60, 10);
    comboBg.lineStyle(2, 0xff6600, 0.6);
    comboBg.strokeRoundedRect(-80, -30, 160, 60, 10);
    this.comboContainer.add(comboBg);

    // 콤보 숫자
    this.comboCountText = this.add.text(0, -5, '0', {
      fontSize: '36px',
      color: '#FF6600',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5);
    this.comboContainer.add(this.comboCountText);

    // COMBO 텍스트
    this.comboText = this.add.text(0, 18, 'COMBO', {
      fontSize: '14px',
      color: '#FFAA00',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.comboContainer.add(this.comboText);
  }

  private createControlsGuide(): void {
    // 조작 안내 (우측 하단)
    const guidePanel = this.add.graphics();
    guidePanel.fillStyle(0x000000, 0.6);
    guidePanel.fillRoundedRect(GAME_WIDTH - 200, GAME_HEIGHT - 120, 190, 110, 8);
    guidePanel.lineStyle(1, 0x00ffff, 0.3);
    guidePanel.strokeRoundedRect(GAME_WIDTH - 200, GAME_HEIGHT - 120, 190, 110, 8);

    this.controlsText = this.add.text(GAME_WIDTH - 105, GAME_HEIGHT - 65,
      '← → : 이동\nSpace/↑ : 점프\nCtrl : 파이어볼\nQ W E R : 스킬\nA S D F : 보조 스킬', {
        fontSize: '11px',
        color: '#88FFFF',
        align: 'center',
        lineSpacing: 4,
      }).setOrigin(0.5);
  }

  private setupEventListeners(): void {
    // 레벨업 이벤트
    this.gameScene.events.on('levelUp', (level: number) => {
      this.showLevelUpEffect(level);
    });

    // 골드 변경 이벤트
    this.gameScene.events.on('goldChanged', (gold: number) => {
      this.updateGoldDisplay(gold);
    });
  }

  private updateHpBar(): void {
    if (!this.player) return;

    const barX = 80;
    const barY = 30;
    const barWidth = 220;
    const barHeight = 22;

    const hpPercent = this.player.currentHealth / this.player.maxHealth;

    this.hpBar.clear();

    // 체력에 따른 색상
    let color = 0x44FF44;
    if (hpPercent < 0.3) color = 0xFF4444;
    else if (hpPercent < 0.6) color = 0xFFAA00;

    // HP 바 채우기
    this.hpBar.fillStyle(color);
    this.hpBar.fillRoundedRect(barX + 2, barY + 2, (barWidth - 4) * hpPercent, barHeight - 4, 3);

    // 하이라이트
    this.hpBar.fillStyle(0xFFFFFF, 0.3);
    this.hpBar.fillRoundedRect(barX + 2, barY + 2, (barWidth - 4) * hpPercent, (barHeight - 4) / 2, { tl: 3, tr: 3, bl: 0, br: 0 });

    // 텍스트 업데이트
    if (this.hpText) {
      this.hpText.setText(`${Math.floor(this.player.currentHealth)} / ${this.player.maxHealth}`);
    }
  }

  private updateExpBar(): void {
    if (!this.player) return;

    const barX = 80;
    const barY = 90;
    const barWidth = 220;

    const expPercent = this.player.currentExp / this.player.expToNextLevel;

    this.expBar.clear();
    this.expBar.fillStyle(0xFFFF44);
    this.expBar.fillRoundedRect(barX + 1, barY + 1, (barWidth - 2) * expPercent, 12, 2);

    if (this.expText) {
      this.expText.setText(`${this.player.currentExp} / ${this.player.expToNextLevel}`);
    }
  }

  private updateSkillCooldowns(): void {
    if (!this.player) return;

    for (const slot of this.skillSlots) {
      const skillKey = (slot as any).skillKey;
      const cooldownPercent = this.player.getSkillCooldownPercent(skillKey);
      const overlay = this.skillCooldownOverlays.get(skillKey);
      const cooldownText = (slot as any).cooldownText;
      const bg = (slot as any).bg;

      if (overlay) {
        if (cooldownPercent > 0) {
          overlay.setVisible(true);
          overlay.clear();
          overlay.fillStyle(0x000000, 0.7);

          // 원형 쿨다운 표시
          const size = 50;
          const startAngle = -Math.PI / 2;
          const endAngle = startAngle + (Math.PI * 2 * cooldownPercent);

          overlay.beginPath();
          overlay.moveTo(0, -3);
          overlay.arc(0, -3, 16, startAngle, endAngle, false);
          overlay.closePath();
          overlay.fillPath();

          // 쿨다운 시간 표시
          const skill = (SKILL_TYPES as any)[skillKey];
          const remainingTime = (skill.cooldown * cooldownPercent) / 1000;
          if (remainingTime >= 1) {
            cooldownText.setText(`${Math.ceil(remainingTime)}`);
            cooldownText.setVisible(true);
          } else {
            cooldownText.setVisible(false);
          }

          // 슬롯 어둡게
          bg.setAlpha(0.5);
        } else {
          overlay.setVisible(false);
          cooldownText.setVisible(false);
          bg.setAlpha(1);
        }
      }
    }
  }

  private updateGoldDisplay(gold: number): void {
    const oldGold = parseInt(this.goldText.text) || 0;

    // 숫자 애니메이션
    this.tweens.add({
      targets: this.goldText,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 100,
      yoyo: true,
      onComplete: () => {
        this.goldText.setText(`${gold}`);
      },
    });

    // 골드 획득 이펙트
    if (gold > oldGold) {
      const diff = gold - oldGold;
      const effect = this.add.text(GAME_WIDTH - 80, 70, `+${diff}`, {
        fontSize: '18px',
        color: '#FFD700',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5);

      this.tweens.add({
        targets: effect,
        y: effect.y - 30,
        alpha: 0,
        duration: 800,
        onComplete: () => effect.destroy(),
      });
    }
  }

  private updateComboDisplay(): void {
    if (!this.player) return;

    const combo = this.player.getComboCount();

    if (combo >= 3) {
      this.comboContainer.setVisible(true);
      this.comboCountText.setText(`${combo}`);

      // 콤보에 따른 색상
      let color = '#FF6600';
      let label = 'COMBO';
      let fontSize = 36;

      if (combo >= 30) {
        color = '#FF00FF';
        label = 'LEGENDARY!';
        fontSize = 44;
      } else if (combo >= 20) {
        color = '#00FFFF';
        label = 'AMAZING!';
        fontSize = 42;
      } else if (combo >= 10) {
        color = '#FFFF00';
        label = 'GREAT!';
        fontSize = 40;
      } else if (combo >= 5) {
        color = '#FF8800';
        label = 'NICE!';
        fontSize = 38;
      }

      this.comboCountText.setStyle({
        fontSize: `${fontSize}px`,
        color: color,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 5,
      });
      this.comboText.setText(label);

      // 콤보 증가 애니메이션
      if (combo > this.lastComboCount && combo > 3) {
        this.tweens.add({
          targets: this.comboContainer,
          scaleX: 1.2,
          scaleY: 1.2,
          duration: 100,
          yoyo: true,
        });
      }
    } else {
      if (this.comboContainer.visible && this.lastComboCount >= 3) {
        // 콤보 종료 페이드아웃
        this.tweens.add({
          targets: this.comboContainer,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            this.comboContainer.setVisible(false);
            this.comboContainer.setAlpha(1);
          },
        });
      }
    }

    this.lastComboCount = combo;
  }

  private showLevelUpEffect(level: number): void {
    this.levelText.setText(`${level}`);

    // 레벨 표시 애니메이션
    this.tweens.add({
      targets: this.levelText,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 200,
      yoyo: true,
    });

    // 레벨업 알림
    const levelUpText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100, `LEVEL ${level}!`, {
      fontSize: '48px',
      color: '#FFD700',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: levelUpText,
      alpha: 1,
      y: levelUpText.y - 30,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(800, () => {
          this.tweens.add({
            targets: levelUpText,
            alpha: 0,
            y: levelUpText.y - 20,
            duration: 300,
            onComplete: () => levelUpText.destroy(),
          });
        });
      },
    });

    // 파티클 효과
    for (let i = 0; i < 20; i++) {
      const particle = this.add.graphics();
      particle.setPosition(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100);
      particle.fillStyle(0x9944ff, 0.9);
      particle.fillCircle(0, 0, 4 + Math.random() * 4);

      const angle = (i / 20) * Math.PI * 2;
      this.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * 150,
        y: particle.y + Math.sin(angle) * 80,
        alpha: 0,
        duration: 800,
        delay: i * 20,
        onComplete: () => particle.destroy(),
      });
    }
  }

  update(): void {
    if (!this.player) {
      this.player = (this.gameScene as any).player;
      return;
    }

    this.updateHpBar();
    this.updateExpBar();
    this.updateSkillCooldowns();
    this.levelText.setText(`${this.player.level}`);
    this.goldText.setText(`${this.player.gold}`);
    this.updateComboDisplay();
  }
}
