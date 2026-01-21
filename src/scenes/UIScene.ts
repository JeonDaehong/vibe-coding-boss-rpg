import Phaser from 'phaser';
import { GameScene } from './GameScene';

export class UIScene extends Phaser.Scene {
  private healthBar!: Phaser.GameObjects.Graphics;
  private healthText!: Phaser.GameObjects.Text;
  private manaBar!: Phaser.GameObjects.Graphics;
  private manaText!: Phaser.GameObjects.Text;
  private shieldBar!: Phaser.GameObjects.Graphics;
  private shieldText!: Phaser.GameObjects.Text;
  private skillSlots: Map<string, Phaser.GameObjects.Container> = new Map();
  private skillCooldowns: Map<string, number> = new Map();
  private isBossBattle: boolean = false;

  constructor() {
    super({ key: 'UIScene' });
  }

  init(data: { isBossBattle?: boolean }): void {
    this.isBossBattle = data?.isBossBattle || false;
  }

  create(): void {
    // HP 바
    this.createHealthBar();

    // 보호막 바
    this.createShieldBar();

    // MP 바
    this.createManaBar();

    // 스킬 슬롯 UI (QWERT + Ctrl, Shift, Space)
    this.createSkillSlots();
  }

  private createShieldBar(): void {
    const x = 20;
    const y = 48;
    const width = 220;
    const height = 8;

    // 배경
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a0f, 0.6);
    bg.fillRoundedRect(x, y, width, height, 2);

    // 보호막 바
    this.shieldBar = this.add.graphics();

    // 텍스트 (보호막이 있을 때만 표시)
    this.shieldText = this.add.text(x + width - 8, y + height / 2, '', {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '8px',
      color: '#00aaff',
    });
    this.shieldText.setOrigin(1, 0.5);
  }

  public updateShieldBar(current: number, maxHealth: number): void {
    const x = 24;
    const y = 48;
    const width = 212;
    const height = 6;
    const ratio = Math.max(0, current / maxHealth);

    this.shieldBar.clear();

    if (current > 0) {
      this.shieldBar.fillStyle(0x00aaff, 0.9);
      this.shieldBar.fillRoundedRect(x, y, width * ratio, height, 2);

      // 상단 하이라이트
      this.shieldBar.fillStyle(0xffffff, 0.2);
      this.shieldBar.fillRoundedRect(x, y, width * ratio, height / 2, 2);

      this.shieldText.setText(`🛡️${Math.floor(current)}`);
    } else {
      this.shieldText.setText('');
    }
  }

  private createHealthBar(): void {
    const x = 20;
    const y = 20;
    const width = 220;
    const height = 24;

    // 배경 - 글래스모피즘 스타일
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a0f, 0.85);
    bg.fillRoundedRect(x, y, width, height, 4);
    bg.lineStyle(1, 0x2a2a3a, 0.6);
    bg.strokeRoundedRect(x, y, width, height, 4);

    // HP 바
    this.healthBar = this.add.graphics();

    // 아이콘
    const hpIcon = this.add.text(x + 6, y + height / 2, '♥', {
      fontSize: '12px',
      color: '#ff4757',
    });
    hpIcon.setOrigin(0, 0.5);

    // 텍스트 (updateHealthBar보다 먼저 생성)
    this.healthText = this.add.text(x + width - 8, y + height / 2, '100/100', {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '11px',
      color: '#ffffff',
    });
    this.healthText.setOrigin(1, 0.5);

    // 초기 HP바 업데이트
    this.updateHealthBar(500, 500);
  }

  private createManaBar(): void {
    const x = 20;
    const y = 58;
    const width = 220;
    const height = 18;

    // 배경
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a0f, 0.85);
    bg.fillRoundedRect(x, y, width, height, 3);
    bg.lineStyle(1, 0x2a2a3a, 0.6);
    bg.strokeRoundedRect(x, y, width, height, 3);

    // MP 바
    this.manaBar = this.add.graphics();

    // 아이콘
    const mpIcon = this.add.text(x + 6, y + height / 2, '◆', {
      fontSize: '10px',
      color: '#00d4ff',
    });
    mpIcon.setOrigin(0, 0.5);

    // 텍스트 (updateManaBar보다 먼저 생성)
    this.manaText = this.add.text(x + width - 8, y + height / 2, '100/100', {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '10px',
      color: '#ffffff',
    });
    this.manaText.setOrigin(1, 0.5);

    // 초기 MP바 업데이트
    this.updateManaBar(100, 100);
  }

  private createSkillSlots(): void {
    const { width, height } = this.cameras.main;

    // 스킬 슬롯 설정 - 실제 스킬 데이터
    const skills = [
      { key: 'Q', name: '결정타', color: 0x00d4ff, icon: '🗡️', manaCost: 30 },
      { key: 'W', name: '와류의 검', color: 0x8866ff, icon: '🌀', manaCost: 50 },
      { key: 'E', name: '철벽 태세', color: 0x00aaff, icon: '🛡️', manaCost: 0 },
      { key: 'R', name: '한계 돌파', color: 0xff4444, icon: '🔥', manaCost: 0 },
      { key: 'T', name: '성검 낙하', color: 0xffdd00, icon: '⚔️', manaCost: 100 },
    ];

    const specialSkills = [
      { key: 'Ctrl', name: '공격', color: 0x95a5a6, icon: '👊' },
      { key: 'Shift', name: '대쉬', color: 0x00d4ff, icon: '💨' },
      { key: 'Space', name: '점프', color: 0x34495e, icon: '⬆' },
    ];

    const slotSize = 48;
    const gap = 6;

    // 메인 스킬 슬롯 (QWERT)
    const totalMainWidth = skills.length * (slotSize + gap) - gap;
    const mainStartX = width / 2 - totalMainWidth / 2;
    const mainY = height - 65;

    skills.forEach((skill, i) => {
      const x = mainStartX + i * (slotSize + gap);
      const slot = this.createSkillSlot(x, mainY, slotSize, skill.key, skill.icon, skill.color, false);
      this.skillSlots.set(skill.key, slot);
    });

    // 특수 스킬 슬롯 (Ctrl, Shift, Space) - 왼쪽에 배치
    const specialStartX = mainStartX - (specialSkills.length * (slotSize + gap)) - 15;

    specialSkills.forEach((skill, i) => {
      const x = specialStartX + i * (slotSize + gap);
      const slot = this.createSkillSlot(x, mainY, slotSize, skill.key, skill.icon, skill.color, true);
      this.skillSlots.set(skill.key, slot);
    });
  }

  private createSkillSlot(
    x: number, y: number,
    size: number,
    key: string,
    icon: string,
    color: number,
    isSpecial: boolean
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // 슬롯 배경 - 글래스모피즘
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a0f, 0.9);
    bg.fillRoundedRect(0, 0, size, size, 8);

    // 스킬 색상 인디케이터 (하단)
    const colorIndicator = this.add.graphics();
    colorIndicator.fillStyle(color, 0.6);
    colorIndicator.fillRoundedRect(4, size - 6, size - 8, 3, 1);

    // 테두리
    const border = this.add.graphics();
    border.lineStyle(1, isSpecial ? 0x3a3a4a : 0x00d4ff, isSpecial ? 0.4 : 0.5);
    border.strokeRoundedRect(0, 0, size, size, 8);

    // 스킬 아이콘
    const iconText = this.add.text(size / 2, size / 2 - 4, icon, {
      fontSize: '18px',
    });
    iconText.setOrigin(0.5, 0.5);

    // 키 표시
    const keyDisplay = key.length > 2 ? key.substring(0, 3) : key;
    const keyText = this.add.text(size / 2, size - 8, keyDisplay, {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: isSpecial ? '8px' : '10px',
      color: '#666666',
    });
    keyText.setOrigin(0.5, 0.5);

    // 쿨타임 오버레이 (처음엔 숨김)
    const cooldownOverlay = this.add.graphics();
    cooldownOverlay.setAlpha(0);
    cooldownOverlay.name = 'cooldown';

    // 쿨타임 텍스트
    const cooldownText = this.add.text(size / 2, size / 2, '', {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    cooldownText.setOrigin(0.5, 0.5);
    cooldownText.name = 'cooldownText';

    container.add([bg, colorIndicator, border, iconText, keyText, cooldownOverlay, cooldownText]);

    return container;
  }

  public updateHealthBar(current: number, max: number): void {
    const x = 24;
    const y = 23;
    const width = 212;
    const height = 18;
    const ratio = Math.max(0, current / max);

    this.healthBar.clear();

    // 체력에 따른 색상
    let color = 0x2ecc71; // 녹색
    if (ratio < 0.3) color = 0xff4757; // 빨강
    else if (ratio < 0.6) color = 0xffa502; // 주황

    // 메인 바
    this.healthBar.fillStyle(color, 0.9);
    this.healthBar.fillRoundedRect(x, y, width * ratio, height, 3);

    // 상단 하이라이트
    this.healthBar.fillStyle(0xffffff, 0.15);
    this.healthBar.fillRoundedRect(x, y, width * ratio, height / 2, 3);

    if (this.healthText) {
      this.healthText.setText(`${Math.floor(current)}/${max}`);
    }
  }

  public updateManaBar(current: number, max: number): void {
    const x = 24;
    const y = 61;
    const width = 212;
    const height = 12;
    const ratio = Math.max(0, current / max);

    this.manaBar.clear();
    this.manaBar.fillStyle(0x00d4ff, 0.9);
    this.manaBar.fillRoundedRect(x, y, width * ratio, height, 2);

    // 상단 하이라이트
    this.manaBar.fillStyle(0xffffff, 0.15);
    this.manaBar.fillRoundedRect(x, y, width * ratio, height / 2, 2);

    if (this.manaText) {
      this.manaText.setText(`${Math.floor(current)}/${max}`);
    }
  }

  public setSkillCooldown(key: string, duration: number): void {
    const slot = this.skillSlots.get(key);
    if (!slot) return;

    const cooldownOverlay = slot.getByName('cooldown') as Phaser.GameObjects.Graphics;
    const cooldownText = slot.getByName('cooldownText') as Phaser.GameObjects.Text;

    if (!cooldownOverlay || !cooldownText) return;

    const size = 48;
    this.skillCooldowns.set(key, duration);

    // 쿨타임 애니메이션
    const startTime = this.time.now;

    const updateCooldown = () => {
      const elapsed = this.time.now - startTime;
      const remaining = Math.max(0, duration - elapsed);
      const ratio = remaining / duration;

      cooldownOverlay.clear();
      cooldownOverlay.fillStyle(0x000000, 0.7);
      cooldownOverlay.fillRoundedRect(0, 0, size, size * ratio, 8);
      cooldownOverlay.setAlpha(1);

      if (remaining > 0) {
        cooldownText.setText((remaining / 1000).toFixed(1));
      } else {
        cooldownOverlay.setAlpha(0);
        cooldownText.setText('');
        this.skillCooldowns.delete(key);

        // 쿨다운 완료 이펙트
        const flashEffect = this.add.graphics();
        flashEffect.fillStyle(0x00d4ff, 0.3);
        flashEffect.fillRoundedRect(slot.x, slot.y, size, size, 8);

        this.tweens.add({
          targets: flashEffect,
          alpha: 0,
          duration: 200,
          onComplete: () => flashEffect.destroy(),
        });

        return;
      }

      this.time.delayedCall(50, updateCooldown);
    };

    updateCooldown();
  }

  update(): void {
    // 보스전 모드에서는 BossBattleScene에서 직접 UI 업데이트
    if (this.isBossBattle) {
      return;
    }

    // GameScene에서 플레이어 상태를 가져와서 UI 업데이트
    const gameScene = this.scene.get('GameScene') as GameScene;
    if (gameScene && gameScene.getPlayer) {
      const player = gameScene.getPlayer();
      if (player) {
        this.updateHealthBar(player.health, player.maxHealth);
        this.updateShieldBar(player.shield, player.maxHealth);
        this.updateManaBar(player.mana, player.maxMana);
      }
    }
  }
}
