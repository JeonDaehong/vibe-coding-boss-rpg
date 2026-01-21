import Phaser from 'phaser';

// 스킬 인터페이스
export interface Skill {
  name: string;
  key: string;
  damage: number;
  cooldown: number;
  manaCost: number;
  currentCooldown: number;
  maxUses?: number; // 전투당 최대 사용 횟수 (성검 낙하용)
  currentUses?: number;
  duration?: number; // 지속 스킬용
  isActive?: boolean;
}

// 물리 바디를 가진 게임 오브젝트 (Sprite 상속 X)
export class Player extends Phaser.GameObjects.Container {
  public health: number = 500;
  public maxHealth: number = 500;
  public mana: number = 100;
  public maxMana: number = 100;
  public shield: number = 0; // 보호막
  public speed: number = 200;

  // 버프 상태
  public isLimitBreak: boolean = false; // 한계 돌파 활성화
  public attackPowerMultiplier: number = 1;
  public attackSpeedMultiplier: number = 1;

  // 스킬 시스템
  public skills: Map<string, Skill> = new Map();

  private targetX: number | null = null;
  private targetY: number | null = null;
  private isMovingToTarget: boolean = false;

  private playerGraphics: Phaser.GameObjects.Graphics;

  // 물리 바디 참조
  public body!: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    // 씬에 추가
    scene.add.existing(this);

    // 물리 바디 추가
    scene.physics.add.existing(this);

    // 물리 설정
    if (this.body) {
      this.body.setCollideWorldBounds(true);
      this.body.setSize(48, 48);
      this.body.setOffset(-24, -24);
    }

    // 스킬 초기화
    this.initializeSkills();

    // 플레이어 그래픽 생성 (Container 안에)
    this.playerGraphics = scene.add.graphics();
    this.drawPlayer();
  }

  private drawPlayer(): void {
    if (!this.playerGraphics) return;

    this.playerGraphics.clear();
    this.playerGraphics.setDepth(100);

    const x = this.x;
    const y = this.y;

    // 몸통 (3D 느낌)
    this.playerGraphics.fillStyle(0x2a4a8a, 1);
    this.playerGraphics.fillRoundedRect(x - 14, y - 2, 28, 32, 6);

    this.playerGraphics.fillStyle(0x3a6aaa, 1);
    this.playerGraphics.fillRoundedRect(x - 12, y - 4, 24, 30, 5);

    // 목
    this.playerGraphics.fillStyle(0xffd5b4, 1);
    this.playerGraphics.fillRect(x - 5, y - 12, 10, 10);

    // 머리 (3D)
    this.playerGraphics.fillStyle(0xeac5a4, 1);
    this.playerGraphics.fillCircle(x, y - 22, 14);

    this.playerGraphics.fillStyle(0xffd5b4, 1);
    this.playerGraphics.fillCircle(x, y - 23, 13);

    // 머리카락
    this.playerGraphics.fillStyle(0x3a2a1a, 1);
    this.playerGraphics.fillEllipse(x, y - 32, 18, 10);
    this.playerGraphics.fillRect(x - 10, y - 35, 20, 10);

    // 눈
    this.playerGraphics.fillStyle(0xffffff, 1);
    this.playerGraphics.fillEllipse(x - 5, y - 24, 5, 4);
    this.playerGraphics.fillEllipse(x + 5, y - 24, 5, 4);

    this.playerGraphics.fillStyle(0x2a2a2a, 1);
    this.playerGraphics.fillCircle(x - 5, y - 24, 2);
    this.playerGraphics.fillCircle(x + 5, y - 24, 2);

    // 한계 돌파 효과 (붉은 테두리)
    if (this.isLimitBreak) {
      this.playerGraphics.lineStyle(3, 0xff4444, 0.8);
      this.playerGraphics.strokeCircle(x, y - 5, 30);
    }
  }

  private initializeSkills(): void {
    // Q: 결정타 - 정면으로 강 찌르기
    this.skills.set('Q', {
      name: '결정타',
      key: 'Q',
      damage: 30,
      cooldown: 5000, // 5초
      manaCost: 30,
      currentCooldown: 0,
    });

    // W: 와류의 검 - 주변으로 검 휘두르기 (3초간)
    this.skills.set('W', {
      name: '와류의 검',
      key: 'W',
      damage: 10, // 0.5초마다 10 데미지 x 6회
      cooldown: 10000, // 10초
      manaCost: 50,
      currentCooldown: 0,
      duration: 3000, // 3초
      isActive: false,
    });

    // E: 철벽 태세 - 3초간 보호막
    this.skills.set('E', {
      name: '철벽 태세',
      key: 'E',
      damage: 0,
      cooldown: 20000, // 20초
      manaCost: 0,
      currentCooldown: 0,
      duration: 3000, // 3초
      isActive: false,
    });

    // R: 한계 돌파 - 5초간 공격속도/공격력 증가
    this.skills.set('R', {
      name: '한계 돌파',
      key: 'R',
      damage: 0,
      cooldown: 20000, // 20초
      manaCost: 0,
      currentCooldown: 0,
      duration: 5000, // 5초
      isActive: false,
    });

    // T: 성검 낙하 - 맵 전체 공격
    this.skills.set('T', {
      name: '성검 낙하',
      key: 'T',
      damage: 300,
      cooldown: 60000, // 60초
      manaCost: 100,
      currentCooldown: 0,
      maxUses: 3,
      currentUses: 3, // 전투당 3회
    });
  }

  public getSkill(key: string): Skill | undefined {
    return this.skills.get(key);
  }

  public canUseSkill(key: string): boolean {
    const skill = this.skills.get(key);
    if (!skill) return false;

    // 쿨타임 체크
    if (skill.currentCooldown > 0) return false;

    // 마나 체크
    if (this.mana < skill.manaCost) return false;

    // 사용 횟수 체크 (성검 낙하)
    if (skill.maxUses !== undefined && skill.currentUses !== undefined) {
      if (skill.currentUses <= 0) return false;
    }

    return true;
  }

  public useSkill(key: string): boolean {
    const skill = this.skills.get(key);
    if (!skill || !this.canUseSkill(key)) return false;

    // 마나 소모
    this.mana -= skill.manaCost;

    // 쿨타임 설정
    skill.currentCooldown = skill.cooldown;

    // 사용 횟수 감소 (성검 낙하)
    if (skill.currentUses !== undefined) {
      skill.currentUses--;
    }

    // 스킬명 외치기 효과
    this.shoutSkillName(skill.name);

    return true;
  }

  private shoutSkillName(skillName: string): void {
    // 스킬명 텍스트 표시
    const text = this.scene.add.text(this.x, this.y - 60, skillName, {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '24px',
      color: '#ffdd00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    });
    text.setOrigin(0.5, 0.5);
    text.setDepth(1000);

    // 애니메이션
    this.scene.tweens.add({
      targets: text,
      y: this.y - 100,
      alpha: 0,
      scale: 1.3,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  // 보호막으로 데미지 흡수
  public applyShield(amount: number): void {
    this.shield = amount;
  }

  // 한계 돌파 버프 적용
  public applyLimitBreak(): void {
    this.isLimitBreak = true;
    this.attackPowerMultiplier = 1.5;
    this.attackSpeedMultiplier = 1.5;
  }

  // 한계 돌파 버프 해제
  public removeLimitBreak(): void {
    this.isLimitBreak = false;
    this.attackPowerMultiplier = 1;
    this.attackSpeedMultiplier = 1;
  }

  // 전투 시작 시 스킬 사용 횟수 리셋
  public resetBattleSkills(): void {
    const holySkill = this.skills.get('T');
    if (holySkill && holySkill.maxUses !== undefined) {
      holySkill.currentUses = holySkill.maxUses;
    }
  }

  public moveTo(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
    this.isMovingToTarget = true;
  }

  public stopMoveTo(): void {
    this.isMovingToTarget = false;
    this.targetX = null;
    this.targetY = null;
  }

  // Sprite 호환 메서드들
  public setVelocity(x: number, y: number): this {
    if (this.body) {
      this.body.setVelocity(x, y);
    }
    return this;
  }

  public setVelocityX(x: number): this {
    if (this.body) {
      this.body.setVelocityX(x);
    }
    return this;
  }

  public setVelocityY(y: number): this {
    if (this.body) {
      this.body.setVelocityY(y);
    }
    return this;
  }

  public setCollideWorldBounds(value: boolean): this {
    if (this.body) {
      this.body.setCollideWorldBounds(value);
    }
    return this;
  }

  public setSize(width: number, height: number): this {
    if (this.body) {
      this.body.setSize(width, height);
    }
    return this;
  }

  public update(time: number, delta: number): void {
    if (this.isMovingToTarget && this.targetX !== null && this.targetY !== null) {
      const distance = Phaser.Math.Distance.Between(this.x, this.y, this.targetX, this.targetY);

      if (distance < 10) {
        // 목표 지점에 도착
        this.setVelocity(0, 0);
        this.stopMoveTo();
      } else {
        // 목표 지점으로 이동
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.targetX, this.targetY);
        this.setVelocity(
          Math.cos(angle) * this.speed,
          Math.sin(angle) * this.speed
        );
      }
    }

    // 플레이어 그래픽 업데이트
    this.drawPlayer();

    // 마나 자동 회복 (초당 2)
    if (this.mana < this.maxMana) {
      this.mana = Math.min(this.maxMana, this.mana + (5 * delta) / 1000);
    }

    // 스킬 쿨타임 감소
    this.skills.forEach((skill) => {
      if (skill.currentCooldown > 0) {
        skill.currentCooldown = Math.max(0, skill.currentCooldown - delta);
      }
    });
  }

  public takeDamage(amount: number): void {
    let remainingDamage = amount;

    // 보호막이 있으면 먼저 소모
    if (this.shield > 0) {
      if (this.shield >= remainingDamage) {
        this.shield -= remainingDamage;
        remainingDamage = 0;

        // 보호막 흡수 효과
        this.showDamageFlash(0x00aaff);
        return;
      } else {
        remainingDamage -= this.shield;
        this.shield = 0;
      }
    }

    this.health = Math.max(0, this.health - remainingDamage);

    // 피격 효과
    this.showDamageFlash(0xff0000);

    if (this.health <= 0) {
      this.die();
    }
  }

  private showDamageFlash(color: number): void {
    const flash = this.scene.add.graphics();
    flash.fillStyle(color, 0.5);
    flash.fillCircle(this.x, this.y - 10, 35);
    flash.setDepth(this.depth + 1);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 150,
      onComplete: () => flash.destroy(),
    });
  }

  public useMana(amount: number): boolean {
    if (this.mana >= amount) {
      this.mana -= amount;
      return true;
    }
    return false;
  }

  private die(): void {
    console.log('Player died!');
    // TODO: 게임 오버 처리
  }

  public destroy(fromScene?: boolean): void {
    if (this.playerGraphics) {
      this.playerGraphics.destroy();
    }
    super.destroy(fromScene);
  }
}
