import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, MAP_CONFIG, MapType, MONSTER_TYPES, KEY_CONFIG } from '../config/GameConfig';
import { Player } from '../entities/Player';
import { Monster } from '../entities/Monster';
import { TrollKing } from '../entities/TrollKing';

export class GameScene extends Phaser.Scene {
  public player!: Player;
  public monsters: Monster[] = [];
  public boss: TrollKing | null = null;
  public projectiles: any[] = [];

  private currentMap: MapType = MapType.VILLAGE;
  private mapConfig: any;
  private groundY: number = 580;
  private platforms: any[] = [];

  // 입력
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys: any = {};

  // 배경
  private backgrounds: Phaser.GameObjects.Graphics[] = [];
  private neonLights: Phaser.GameObjects.Graphics[] = [];

  // 포탈
  private portal: Phaser.GameObjects.Container | null = null;
  private portalActive: boolean = false;

  // NPC
  private npc: Phaser.GameObjects.Container | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    this.load.image('lily_right', 'assets/images/lily_1.png');
    this.load.image('lily_left', 'assets/images/lily_2.png');
    this.load.image('lily_attack_right', 'assets/images/lily_3.png');
    this.load.image('lily_attack_left', 'assets/images/lily_4.png');
  }

  create(): void {
    this.mapConfig = MAP_CONFIG[this.currentMap];
    this.groundY = this.mapConfig.groundY;

    this.createBackground();
    this.createPlatforms();
    this.createPlayer();
    this.setupInput();
    this.setupCamera();
    this.setupEventListeners();

    if (this.currentMap === MapType.VILLAGE) {
      this.createVillageNPC();
    }

    this.createPortal();
    this.spawnMonsters();

    // 파티클 이펙트
    this.createAmbientEffects();
  }

  private createBackground(): void {
    const width = this.mapConfig.width;
    const ambientColor = this.mapConfig.ambientColor;

    // 기본 배경 - 어두운 하늘
    const bg = this.add.graphics();
    bg.fillGradientStyle(ambientColor, ambientColor, 0x000005, 0x000005);
    bg.fillRect(0, 0, width, GAME_HEIGHT);
    bg.setScrollFactor(0.1);
    this.backgrounds.push(bg);

    if (this.currentMap === MapType.VILLAGE) {
      this.createVillageBackground(width);
    } else if (this.currentMap === MapType.FIELD) {
      this.createFieldBackground(width);
    } else if (this.currentMap === MapType.BOSS) {
      this.createBossBackground(width);
    }

    // 지면 - 돌/흙 질감
    const ground = this.add.graphics();
    ground.fillStyle(0x1a1510);
    ground.fillRect(0, this.groundY, width, 200);
    // 풀/이끼 라인
    ground.lineStyle(2, 0x223315, 0.6);
    ground.beginPath();
    ground.moveTo(0, this.groundY);
    ground.lineTo(width, this.groundY);
    ground.stroke();
    // 돌 패턴
    for (let i = 0; i < width; i += 60) {
      ground.fillStyle(0x222018, 0.6);
      ground.fillRect(i, this.groundY + 3, 40 + Math.random() * 15, 4);
      if (Math.random() < 0.3) {
        ground.fillStyle(0x181510, 0.4);
        ground.fillRect(i + 10, this.groundY + 10, 20, 3);
      }
    }
    ground.setDepth(-1);
    this.backgrounds.push(ground);
  }

  private createVillageBackground(width: number): void {
    // 어둠의 마을 - 돌집, 횃불, 안개, 멀리 보이는 성
    const far = this.add.graphics();
    far.setScrollFactor(0.2);

    // 멀리 보이는 성 실루엣
    far.fillStyle(0x0a0812);
    far.fillRect(width * 0.6, 100, 80, 300);
    far.fillRect(width * 0.63, 60, 30, 340);
    far.fillRect(width * 0.7, 120, 60, 280);
    far.fillTriangle(width * 0.63, 60, width * 0.645, 20, width * 0.66, 60);
    // 성 창문 빛
    far.fillStyle(0x442200, 0.4);
    far.fillRect(width * 0.64, 100, 8, 12);
    far.fillRect(width * 0.64, 150, 8, 12);
    this.backgrounds.push(far);

    // 돌집들
    const houses = this.add.graphics();
    houses.setScrollFactor(0.7);
    const housePositions = [100, 350, 600, 900, 1200];
    for (const hx of housePositions) {
      const hh = 80 + Math.random() * 40;
      const hw = 70 + Math.random() * 30;
      // 돌벽
      houses.fillStyle(0x2a2520);
      houses.fillRect(hx, this.groundY - hh, hw, hh);
      // 지붕
      houses.fillStyle(0x1a1815);
      houses.fillTriangle(hx - 10, this.groundY - hh, hx + hw / 2, this.groundY - hh - 30, hx + hw + 10, this.groundY - hh);
      // 문
      houses.fillStyle(0x3a2a1a);
      houses.fillRect(hx + hw / 2 - 10, this.groundY - 35, 20, 35);
      // 창문 빛
      houses.fillStyle(0x553300, 0.5);
      houses.fillRect(hx + 10, this.groundY - hh + 15, 12, 14);
    }
    this.backgrounds.push(houses);

    // 횃불들
    for (let i = 0; i < 5; i++) {
      const torch = this.add.graphics();
      const tx = 200 + i * 300;
      torch.setPosition(tx, this.groundY - 50);
      // 기둥
      torch.fillStyle(0x3a2a1a);
      torch.fillRect(-3, 0, 6, 50);
      // 불꽃 글로우
      torch.fillStyle(0x884400, 0.3);
      torch.fillCircle(0, -5, 20);
      torch.fillStyle(0xff6600, 0.6);
      torch.fillCircle(0, -5, 8);
      torch.fillStyle(0xffaa00, 0.8);
      torch.fillCircle(0, -7, 4);
      torch.setDepth(this.groundY - 1);
      this.backgrounds.push(torch);

      // 깜빡임
      this.tweens.add({
        targets: torch,
        alpha: 0.7,
        duration: 200 + Math.random() * 300,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private createFieldBackground(width: number): void {
    // 저주받은 숲 - 뒤틀린 나무, 도깨비불, 폐허
    const treeLine = this.add.graphics();
    treeLine.setScrollFactor(0.3);

    // 뒤쪽 나무 실루엣
    for (let i = 0; i < width / 120; i++) {
      const tx = i * 120 + Math.random() * 40;
      const th = 200 + Math.random() * 150;
      treeLine.fillStyle(0x0a0c06);
      // 뒤틀린 줄기
      treeLine.fillRect(tx, GAME_HEIGHT - th - 60, 12, th);
      treeLine.fillRect(tx - 20, GAME_HEIGHT - th - 20, 8, th * 0.4);
      treeLine.fillRect(tx + 15, GAME_HEIGHT - th, 8, th * 0.3);
      // 수관
      treeLine.fillStyle(0x0c1008, 0.8);
      treeLine.fillCircle(tx + 6, GAME_HEIGHT - th - 70, 40 + Math.random() * 20);
    }
    this.backgrounds.push(treeLine);

    // 앞쪽 나무
    const frontTrees = this.add.graphics();
    frontTrees.setScrollFactor(0.6);
    for (let i = 0; i < width / 200; i++) {
      const tx = i * 200 + Math.random() * 80;
      const th = 120 + Math.random() * 80;
      frontTrees.fillStyle(0x15180e);
      frontTrees.fillRect(tx, GAME_HEIGHT - th - 30, 15, th);
      // 가지
      frontTrees.fillStyle(0x121510);
      frontTrees.fillRect(tx - 25, GAME_HEIGHT - th + 10, 10, 6);
      frontTrees.fillRect(tx + 20, GAME_HEIGHT - th + 30, 12, 5);
      // 잎
      frontTrees.fillStyle(0x1a2010, 0.7);
      frontTrees.fillCircle(tx + 7, GAME_HEIGHT - th - 35, 30);
    }
    this.backgrounds.push(frontTrees);

    // 폐허 돌기둥
    const ruins = this.add.graphics();
    ruins.setScrollFactor(0.8);
    for (let i = 0; i < 4; i++) {
      const rx = 500 + i * 500;
      const rh = 40 + Math.random() * 60;
      ruins.fillStyle(0x282420);
      ruins.fillRect(rx, this.groundY - rh, 20, rh);
      ruins.fillRect(rx - 5, this.groundY - rh, 30, 8);
      // 이끼
      ruins.fillStyle(0x223315, 0.4);
      ruins.fillRect(rx, this.groundY - rh + 10, 12, 5);
    }
    this.backgrounds.push(ruins);
  }

  private createBossBackground(width: number): void {
    // 암흑 신전 - 기둥, 균열 바닥, 보라 오라, 번개
    const temple = this.add.graphics();
    temple.setScrollFactor(0.4);

    // 벽면
    temple.fillStyle(0x0c0818);
    temple.fillRect(0, 50, width, 500);

    // 거대 기둥들
    for (let i = 0; i < 6; i++) {
      const px = 100 + i * 280;
      temple.fillStyle(0x1a1428);
      temple.fillRect(px, 100, 40, 450);
      // 기둥 상단 장식
      temple.fillStyle(0x221a35);
      temple.fillRect(px - 10, 90, 60, 20);
      // 기둥 균열
      temple.lineStyle(1, 0x332850, 0.5);
      temple.beginPath();
      temple.moveTo(px + 20, 150);
      temple.lineTo(px + 15, 200);
      temple.lineTo(px + 25, 250);
      temple.stroke();
    }
    this.backgrounds.push(temple);

    // 보라색 오라 광원들
    for (let i = 0; i < 4; i++) {
      const glow = this.add.graphics();
      glow.setPosition(200 + i * 350, 200 + Math.random() * 100);
      glow.setScrollFactor(0.5);
      glow.fillStyle(0x440066, 0.15);
      glow.fillCircle(0, 0, 60);
      glow.fillStyle(0x660088, 0.1);
      glow.fillCircle(0, 0, 100);
      this.backgrounds.push(glow);

      this.tweens.add({
        targets: glow,
        alpha: 0.5,
        duration: 1500 + Math.random() * 1000,
        yoyo: true,
        repeat: -1,
      });
    }

    // 바닥 균열
    const cracks = this.add.graphics();
    cracks.setDepth(-1);
    cracks.lineStyle(2, 0x440066, 0.4);
    for (let i = 0; i < 10; i++) {
      const cx = Math.random() * width;
      cracks.beginPath();
      cracks.moveTo(cx, this.groundY);
      let px = cx, py = this.groundY;
      for (let s = 0; s < 4; s++) {
        px += Phaser.Math.Between(-20, 20);
        py += Phaser.Math.Between(5, 15);
        cracks.lineTo(px, py);
      }
      cracks.stroke();
    }
    this.backgrounds.push(cracks);
  }

  private createPlatforms(): void {
    this.platforms = [];

    // 맵별 플랫폼
    if (this.currentMap === MapType.VILLAGE) {
      // 마을 - 건물 지붕 플랫폼
      this.addPlatform(200, 450, 150);
      this.addPlatform(500, 380, 120);
      this.addPlatform(800, 420, 180);
      this.addPlatform(1100, 350, 150);
    } else if (this.currentMap === MapType.FIELD) {
      // 필드 - 파괴된 차량, 잔해
      this.addPlatform(300, 480, 100);
      this.addPlatform(600, 420, 150);
      this.addPlatform(900, 450, 120);
      this.addPlatform(1200, 380, 180);
      this.addPlatform(1500, 420, 140);
      this.addPlatform(1800, 480, 100);
      this.addPlatform(2100, 400, 160);
    } else if (this.currentMap === MapType.BOSS) {
      // 보스맵 - 아레나
      this.addPlatform(300, 450, 200);
      this.addPlatform(800, 400, 200);
      this.addPlatform(1100, 450, 200);
    }
  }

  private addPlatform(x: number, y: number, width: number): void {
    const platform = this.add.graphics();
    platform.setPosition(x, y);

    // 돌 플랫폼
    platform.fillStyle(0x2a2520);
    platform.fillRect(0, 0, width, 15);

    // 상단 이끼
    platform.lineStyle(2, 0x223315, 0.5);
    platform.beginPath();
    platform.moveTo(0, 0);
    platform.lineTo(width, 0);
    platform.stroke();

    // 돌 질감
    platform.fillStyle(0x1a1810, 0.3);
    platform.fillRect(5, 3, width * 0.3, 4);
    platform.fillRect(width * 0.5, 3, width * 0.25, 4);

    platform.setDepth(y);

    this.platforms.push({ x, y, width });
  }

  private createPlayer(): void {
    this.player = new Player(this, 150, this.groundY - 50);
  }

  private setupInput(): void {
    if (!this.input.keyboard) return;

    this.cursors = this.input.keyboard.createCursorKeys();

    this.keys = {
      space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      ctrl: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL),
      q: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q),
      w: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      e: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
      r: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R),
      a: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      f: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F),
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
    };
  }

  private setupCamera(): void {
    this.cameras.main.setBounds(0, 0, this.mapConfig.width, GAME_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  private setupEventListeners(): void {
    // 스킬 히트 이벤트
    this.events.on('boneSpikeHit', this.handleBoneSpikeHit, this);
    this.events.on('corpseBombHit', this.handleCorpseBombHit, this);
    this.events.on('curseHit', this.handleCurseHit, this);
    this.events.on('soulDrainHit', this.handleSoulDrainHit, this);
    this.events.on('deathWaveHit', this.handleDeathWaveHit, this);
    this.events.on('darkSpikeHit', this.handleBoneSpikeHit, this); // same rect hit logic
    this.events.on('darkMeteorHit', this.handleCorpseBombHit, this); // same circle hit logic

    // 보스 처치
    this.events.on('bossDefeated', (rewards: any) => {
      this.player.gainExp(rewards.exp);
      this.player.gainGold(rewards.gold);
    });

    // 플레이어 사망 → 2초 후 마을 부활
    this.events.on('playerDied', () => {
      this.time.delayedCall(2000, () => {
        // 마을로 전환
        if (this.currentMap !== MapType.VILLAGE) {
          this.transitionToMap(MapType.VILLAGE);
          this.time.delayedCall(600, () => {
            this.player.respawn(150, this.groundY - 50);
          });
        } else {
          this.player.respawn(150, this.groundY - 50);
        }
      });
    });
  }

  private handleBoneSpikeHit(hitbox: Phaser.Geom.Rectangle, damage: number): void {
    // 몬스터 체크
    for (const monster of this.monsters) {
      if (monster.isDead) continue;
      const mHitbox = monster.getHitbox();
      if (Phaser.Geom.Intersects.RectangleToRectangle(hitbox, mHitbox)) {
        monster.takeDamage(damage, 0, this.time.now);
        this.player.addCombo();
      }
    }

    // 보스 체크
    if (this.boss && !this.boss.isDead) {
      const bHitbox = this.boss.getHitbox();
      if (Phaser.Geom.Intersects.RectangleToRectangle(hitbox, bHitbox)) {
        this.boss.takeDamage(damage, 0, this.time.now);
        this.player.addCombo();
      }
    }
  }

  private handleCorpseBombHit(hitbox: Phaser.Geom.Circle, damage: number): void {
    // 몬스터 체크
    for (const monster of this.monsters) {
      if (monster.isDead) continue;
      const mHitbox = monster.getHitbox();
      if (Phaser.Geom.Intersects.CircleToRectangle(hitbox, mHitbox)) {
        monster.takeDamage(damage, monster.x > hitbox.x ? 1 : -1, this.time.now);
        this.player.addCombo();
      }
    }

    // 보스 체크
    if (this.boss && !this.boss.isDead) {
      const bHitbox = this.boss.getHitbox();
      if (Phaser.Geom.Intersects.CircleToRectangle(hitbox, bHitbox)) {
        this.boss.takeDamage(damage, this.boss.x > hitbox.x ? 1 : -1, this.time.now);
        this.player.addCombo();
      }
    }
  }

  private handleCurseHit(hitbox: Phaser.Geom.Circle, duration: number, debuffAmount: number): void {
    // 보스에게 저주 적용
    if (this.boss && !this.boss.isDead) {
      const bHitbox = this.boss.getHitbox();
      if (Phaser.Geom.Intersects.CircleToRectangle(hitbox, bHitbox)) {
        this.boss.applyCurse(duration, debuffAmount);
      }
    }
  }

  private handleSoulDrainHit(hitbox: Phaser.Geom.Rectangle, damage: number, healPercent: number, player: Player): void {
    let totalDamage = 0;

    // 몬스터 체크
    for (const monster of this.monsters) {
      if (monster.isDead) continue;
      const mHitbox = monster.getHitbox();
      if (Phaser.Geom.Intersects.RectangleToRectangle(hitbox, mHitbox)) {
        monster.takeDamage(damage, 0, this.time.now);
        totalDamage += damage;
        this.player.addCombo();
      }
    }

    // 보스 체크
    if (this.boss && !this.boss.isDead) {
      const bHitbox = this.boss.getHitbox();
      if (Phaser.Geom.Intersects.RectangleToRectangle(hitbox, bHitbox)) {
        this.boss.takeDamage(damage, 0, this.time.now);
        totalDamage += damage;
        this.player.addCombo();
      }
    }

    // 흡수 치유
    if (totalDamage > 0) {
      player.heal(totalDamage * healPercent);
    }
  }

  private handleDeathWaveHit(hitbox: Phaser.Geom.Circle, damage: number): void {
    // 몬스터 체크
    for (const monster of this.monsters) {
      if (monster.isDead) continue;
      const mHitbox = monster.getHitbox();
      if (Phaser.Geom.Intersects.CircleToRectangle(hitbox, mHitbox)) {
        const dir = monster.x > hitbox.x ? 1 : -1;
        monster.takeDamage(damage, dir, this.time.now);
        this.player.addCombo();
      }
    }

    // 보스 체크
    if (this.boss && !this.boss.isDead) {
      const bHitbox = this.boss.getHitbox();
      if (Phaser.Geom.Intersects.CircleToRectangle(hitbox, bHitbox)) {
        const dir = this.boss.x > hitbox.x ? 1 : -1;
        this.boss.takeDamage(damage, dir, this.time.now);
        this.player.addCombo();
      }
    }
  }

  private createVillageNPC(): void {
    this.npc = this.add.container(400, this.groundY - 40);

    // NPC 몸체
    const body = this.add.graphics();

    // 로브
    body.fillStyle(0x4444aa);
    body.fillRoundedRect(-15, -25, 30, 45, 5);

    // 얼굴
    body.fillStyle(0xffddcc);
    body.fillCircle(0, -35, 12);

    // 후드
    body.fillStyle(0x333388);
    body.fillTriangle(-15, -45, 0, -55, 15, -45);

    // 눈
    body.fillStyle(0x00ffff);
    body.fillCircle(-4, -37, 3);
    body.fillCircle(4, -37, 3);

    this.npc.add(body);

    // NPC 말풍선
    const bubble = this.add.graphics();
    bubble.fillStyle(0x000000, 0.8);
    bubble.fillRoundedRect(-80, -90, 160, 40, 10);
    bubble.fillTriangle(-5, -50, 5, -50, 0, -40);
    this.npc.add(bubble);

    const text = this.add.text(0, -70, '포탈로 모험을 떠나세요!', {
      fontSize: '12px',
      color: '#FFFFFF',
    }).setOrigin(0.5);
    this.npc.add(text);

    this.npc.setDepth(this.groundY);

    // 깜빡임
    this.tweens.add({
      targets: this.npc,
      y: this.npc.y - 5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createPortal(): void {
    if (!this.mapConfig.portalX) return;

    this.portal = this.add.container(this.mapConfig.portalX, this.groundY - 60);
    this.portalActive = true;

    // 포탈 이펙트
    const portalBase = this.add.graphics();

    // 외곽 링
    portalBase.lineStyle(4, 0x9944ff, 0.8);
    portalBase.strokeEllipse(0, 0, 80, 120);

    // 내부 소용돌이
    portalBase.fillStyle(0x6633aa, 0.5);
    portalBase.fillEllipse(0, 0, 60, 100);

    portalBase.fillStyle(0x9955cc, 0.4);
    portalBase.fillEllipse(0, 0, 40, 70);

    portalBase.fillStyle(0xcc88ff, 0.3);
    portalBase.fillEllipse(0, 0, 20, 40);

    this.portal.add(portalBase);

    // 포탈 파티클
    this.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        if (!this.portal) return;

        const particle = this.add.graphics();
        particle.setPosition(this.portal.x, this.portal.y);

        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * 20;
        particle.x += Math.cos(angle) * dist;
        particle.y += Math.sin(angle) * dist * 1.5;

        particle.fillStyle(0x9944ff, 0.8);
        particle.fillCircle(0, 0, 3 + Math.random() * 3);
        particle.setDepth(this.groundY + 1);

        this.tweens.add({
          targets: particle,
          x: this.portal!.x,
          y: this.portal!.y,
          alpha: 0,
          duration: 500,
          onComplete: () => particle.destroy(),
        });
      },
    });

    // 포탈 회전 애니메이션
    this.tweens.add({
      targets: portalBase,
      rotation: Math.PI * 2,
      duration: 5000,
      repeat: -1,
    });

    // 맵 이름 표시
    const nextMapName = this.mapConfig.nextMap ? (MAP_CONFIG as any)[this.mapConfig.nextMap].name : '';
    const mapNameText = this.add.text(this.mapConfig.portalX, this.groundY - 140, `→ ${nextMapName}`, {
      fontSize: '16px',
      color: '#FFFFFF',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.portal.add(mapNameText);
    this.portal.setDepth(this.groundY);
  }

  private spawnMonsters(): void {
    if (!this.mapConfig.hasMonsters) return;

    const monsterTypes = Object.keys(MONSTER_TYPES);

    // 필드맵 몬스터 스폰
    for (let i = 0; i < 8; i++) {
      const typeKey = monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
      const type = (MONSTER_TYPES as any)[typeKey];
      const x = 400 + i * 200 + Math.random() * 100;

      const monster = new Monster(this, x, this.groundY - 30, type);
      this.monsters.push(monster);
    }

    // 리스폰 타이머
    this.time.addEvent({
      delay: 10000,
      loop: true,
      callback: () => {
        // 죽은 몬스터 정리
        this.monsters = this.monsters.filter(m => !m.isDead);

        // 몬스터 수 유지
        if (this.monsters.length < 5 && this.mapConfig.hasMonsters) {
          const typeKey = monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
          const type = (MONSTER_TYPES as any)[typeKey];
          const x = this.cameras.main.scrollX + GAME_WIDTH + 100 + Math.random() * 200;

          const monster = new Monster(this, x, this.groundY - 30, type);
          this.monsters.push(monster);
        }
      },
    });
  }

  private spawnBoss(): void {
    if (!this.mapConfig.hasBoss || this.boss) return;

    this.boss = new TrollKing(this, this.mapConfig.width - 300, this.groundY - 100);
    this.boss.setTarget(this.player);
  }

  private createAmbientEffects(): void {
    // 안개/먼지 파티클
    this.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => {
        if (Math.random() > 0.5) {
          const fog = this.add.graphics();
          fog.setPosition(
            this.cameras.main.scrollX + Math.random() * GAME_WIDTH,
            this.groundY - 20 - Math.random() * 60
          );
          fog.fillStyle(0x888888, 0.08);
          fog.fillCircle(0, 0, 20 + Math.random() * 30);
          fog.setDepth(-1);

          this.tweens.add({
            targets: fog,
            x: fog.x + 40 + Math.random() * 30,
            alpha: 0,
            duration: 2000 + Math.random() * 1000,
            onComplete: () => fog.destroy(),
          });
        }
      },
    });

    // 도깨비불 (필드맵) / 보라 파티클 (보스맵)
    if (this.currentMap === MapType.FIELD || this.currentMap === MapType.BOSS) {
      this.time.addEvent({
        delay: 1500,
        loop: true,
        callback: () => {
          const orb = this.add.graphics();
          const ox = this.cameras.main.scrollX + Math.random() * GAME_WIDTH;
          const oy = 200 + Math.random() * 300;
          orb.setPosition(ox, oy);
          const color = this.currentMap === MapType.FIELD ? 0x44ff88 : 0x8844ff;
          orb.fillStyle(color, 0.4);
          orb.fillCircle(0, 0, 4);
          orb.fillStyle(color, 0.15);
          orb.fillCircle(0, 0, 10);
          orb.setDepth(0);

          this.tweens.add({
            targets: orb,
            y: oy - 40,
            x: ox + Phaser.Math.Between(-30, 30),
            alpha: 0,
            duration: 2500,
            onComplete: () => orb.destroy(),
          });
        },
      });
    }
  }

  private checkPortalCollision(): void {
    if (!this.portal || !this.portalActive) return;

    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.portal.x, this.portal.y);

    if (dist < 50 && this.mapConfig.nextMap) {
      this.transitionToMap(this.mapConfig.nextMap);
    }
  }

  private transitionToMap(nextMap: MapType): void {
    this.portalActive = false;

    // 화면 페이드 아웃
    this.cameras.main.fadeOut(500, 0, 0, 0);

    this.time.delayedCall(500, () => {
      // 현재 맵 정리
      this.monsters.forEach(m => m.destroy());
      this.monsters = [];
      if (this.boss) {
        this.boss.destroy();
        this.boss = null;
      }
      this.backgrounds.forEach(b => b.destroy());
      this.backgrounds = [];
      this.neonLights.forEach(n => n.destroy());
      this.neonLights = [];
      if (this.portal) {
        this.portal.destroy();
        this.portal = null;
      }
      if (this.npc) {
        this.npc.destroy();
        this.npc = null;
      }

      // 플랫폼 정리
      this.platforms = [];

      // 새 맵 설정
      this.currentMap = nextMap;
      this.mapConfig = MAP_CONFIG[nextMap];
      this.groundY = this.mapConfig.groundY;

      // 새 맵 생성
      this.createBackground();
      this.createPlatforms();
      this.createPortal();

      if (nextMap === MapType.BOSS) {
        this.spawnBoss();
      } else {
        this.spawnMonsters();
      }

      // 플레이어 위치 리셋
      this.player.x = 150;
      this.player.y = this.groundY - 50;

      // 카메라 재설정
      this.setupCamera();

      // 화면 페이드 인
      this.cameras.main.fadeIn(500, 0, 0, 0);

      // 맵 이름 표시
      const mapName = this.add.text(GAME_WIDTH / 2, 100, this.mapConfig.name, {
        fontSize: '36px',
        color: '#FFFFFF',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 5,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

      this.tweens.add({
        targets: mapName,
        alpha: 0,
        duration: 500,
        delay: 2000,
        onComplete: () => mapName.destroy(),
      });
    });
  }

  update(time: number, delta: number): void {
    // 입력 처리
    this.handleInput();

    // 플레이어 업데이트
    this.player.update(time, delta, this.groundY, this.platforms);

    // 맵 경계
    this.player.x = Phaser.Math.Clamp(this.player.x, 30, this.mapConfig.width - 30);

    // 몬스터 업데이트
    for (const monster of this.monsters) {
      if (!monster.isDead) {
        monster.update(time, delta);

        // 플레이어 충돌
        const mHitbox = monster.getHitbox();
        const pHitbox = this.player.getHitbox();
        if (Phaser.Geom.Intersects.RectangleToRectangle(mHitbox, pHitbox)) {
          this.player.takeDamage(monster.attack, time);
        }

        // 몬스터 사망 처리
        if (monster.isDead) {
          this.player.gainExp(monster.expReward);
          this.player.gainGold(monster.goldReward);
        }
      }
    }

    // 보스 업데이트
    if (this.boss && !this.boss.isDead) {
      this.boss.update(time, delta, this.groundY);
    }

    // 투사체 업데이트
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (proj.update) proj.update();

      // 몬스터 충돌
      if (proj.getHitbox) {
        const projHitbox = proj.getHitbox();

        for (const monster of this.monsters) {
          if (monster.isDead) continue;
          const mHitbox = monster.getHitbox();
          if (Phaser.Geom.Intersects.RectangleToRectangle(projHitbox, mHitbox)) {
            const dir = monster.x > proj.graphics.x ? 1 : -1;
            monster.takeDamage(proj.damage, dir, time);
            this.player.addCombo();
            if (proj.destroy) proj.destroy();
            this.projectiles.splice(i, 1);
            break;
          }
        }

        // 보스 충돌
        if (this.boss && !this.boss.isDead && this.projectiles[i]) {
          const bHitbox = this.boss.getHitbox();
          if (Phaser.Geom.Intersects.RectangleToRectangle(projHitbox, bHitbox)) {
            const dir = this.boss.x > proj.graphics.x ? 1 : -1;
            this.boss.takeDamage(proj.damage, dir, time);
            this.player.addCombo();
            if (proj.destroy) proj.destroy();
            this.projectiles.splice(i, 1);
          }
        }
      }

      // 비활성 투사체 정리
      if (proj.graphics && !proj.graphics.active) {
        this.projectiles.splice(i, 1);
      }
    }

    // 포탈 충돌
    this.checkPortalCollision();

    // 죽은 몬스터 정리
    this.monsters = this.monsters.filter(m => !m.isDead || m.active);
  }

  private handleInput(): void {
    // 이동
    // 대쉬 체크 (더블탭)
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left)) {
      this.player.tryDashLeft();
    }
    if (Phaser.Input.Keyboard.JustDown(this.cursors.right)) {
      this.player.tryDashRight();
    }

    // 이동
    if (this.cursors.left.isDown) {
      this.player.moveLeft();
    } else if (this.cursors.right.isDown) {
      this.player.moveRight();
    }

    // 점프 (Space 또는 Up)
    if (Phaser.Input.Keyboard.JustDown(this.keys.space) || Phaser.Input.Keyboard.JustDown(this.keys.up)) {
      this.player.jump();
    }

    // 기본 공격 (Ctrl) - 파이어볼
    if (Phaser.Input.Keyboard.JustDown(this.keys.ctrl)) {
      this.player.castFireball();
    }

    // Q - 다크 스파이크
    if (Phaser.Input.Keyboard.JustDown(this.keys.q)) {
      this.player.castDarkSpike();
    }

    // W - 뼈가시
    if (Phaser.Input.Keyboard.JustDown(this.keys.w)) {
      this.player.castBoneSpike();
    }

    // E - 시체 폭탄
    if (Phaser.Input.Keyboard.JustDown(this.keys.e)) {
      this.player.castCorpseBomb();
    }

    // R - 다크 메테오
    if (Phaser.Input.Keyboard.JustDown(this.keys.r)) {
      this.player.castDarkMeteor();
    }

    // A - 암흑 보호막
    if (Phaser.Input.Keyboard.JustDown(this.keys.a)) {
      this.player.castDarkShield();
    }

    // S - 저주
    if (Phaser.Input.Keyboard.JustDown(this.keys.s)) {
      this.player.castCurse();
    }

    // D - 영혼 흡수
    if (Phaser.Input.Keyboard.JustDown(this.keys.d)) {
      this.player.castSoulDrain();
    }

    // F - 죽음의 파동
    if (Phaser.Input.Keyboard.JustDown(this.keys.f)) {
      this.player.castDeathWave();
    }
  }
}
