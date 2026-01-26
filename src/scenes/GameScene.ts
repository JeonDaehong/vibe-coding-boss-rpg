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
  public summons: any[] = [];

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

    // 기본 배경
    const bg = this.add.graphics();
    bg.fillGradientStyle(ambientColor, ambientColor, 0x000011, 0x000011);
    bg.fillRect(0, 0, width, GAME_HEIGHT);
    bg.setScrollFactor(0.1);
    this.backgrounds.push(bg);

    // 사이버펑크 도시 스카이라인
    const skyline = this.add.graphics();
    skyline.setScrollFactor(0.3);

    // 뒷 건물들
    for (let i = 0; i < width / 100; i++) {
      const buildingHeight = 150 + Math.random() * 200;
      const buildingX = i * 100;
      const buildingWidth = 60 + Math.random() * 30;

      // 건물 본체
      skyline.fillStyle(0x111122);
      skyline.fillRect(buildingX, GAME_HEIGHT - buildingHeight - 100, buildingWidth, buildingHeight);

      // 창문 (네온)
      const windowColors = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff00];
      for (let j = 0; j < buildingHeight / 20; j++) {
        for (let k = 0; k < buildingWidth / 15; k++) {
          if (Math.random() > 0.3) {
            skyline.fillStyle(windowColors[Math.floor(Math.random() * windowColors.length)], 0.6);
            skyline.fillRect(buildingX + 5 + k * 15, GAME_HEIGHT - buildingHeight - 90 + j * 20, 8, 12);
          }
        }
      }
    }
    this.backgrounds.push(skyline);

    // 앞쪽 건물들
    const buildings = this.add.graphics();
    buildings.setScrollFactor(0.5);

    for (let i = 0; i < width / 80; i++) {
      const buildingHeight = 100 + Math.random() * 150;
      const buildingX = i * 80 + Math.random() * 20;
      const buildingWidth = 50 + Math.random() * 20;

      // 건물 본체
      buildings.fillStyle(0x1a1a2e);
      buildings.fillRect(buildingX, GAME_HEIGHT - buildingHeight - 50, buildingWidth, buildingHeight);

      // 창문
      for (let j = 0; j < buildingHeight / 25; j++) {
        for (let k = 0; k < buildingWidth / 12; k++) {
          if (Math.random() > 0.4) {
            const windowColor = Math.random() > 0.5 ? 0x00ffff : 0xff66ff;
            buildings.fillStyle(windowColor, 0.5);
            buildings.fillRect(buildingX + 3 + k * 12, GAME_HEIGHT - buildingHeight - 40 + j * 25, 6, 15);
          }
        }
      }
    }
    this.backgrounds.push(buildings);

    // 네온 간판들
    this.createNeonSigns();

    // 지면
    const ground = this.add.graphics();
    // 바닥
    ground.fillStyle(0x222233);
    ground.fillRect(0, this.groundY, width, 200);
    // 바닥 라인
    ground.lineStyle(3, 0x00ffff, 0.5);
    ground.beginPath();
    ground.moveTo(0, this.groundY);
    ground.lineTo(width, this.groundY);
    ground.stroke();
    // 바닥 패턴
    for (let i = 0; i < width; i += 100) {
      ground.fillStyle(0x333344, 0.5);
      ground.fillRect(i, this.groundY + 5, 80, 5);
    }
    ground.setDepth(-1);
    this.backgrounds.push(ground);
  }

  private createNeonSigns(): void {
    const signTexts = ['CYBER', 'NEON', 'TOKYO', '2077', 'GAME', 'RPG'];
    const colors = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff00, 0xff4444];

    for (let i = 0; i < this.mapConfig.width / 400; i++) {
      const sign = this.add.graphics();
      sign.setPosition(200 + i * 400, 150 + Math.random() * 100);
      sign.setScrollFactor(0.6);

      const color = colors[Math.floor(Math.random() * colors.length)];

      // 네온 테두리
      sign.lineStyle(4, color, 0.8);
      sign.strokeRect(-40, -15, 80, 30);

      // 네온 글로우
      sign.fillStyle(color, 0.2);
      sign.fillRect(-45, -20, 90, 40);

      this.neonLights.push(sign);

      // 깜빡임 효과
      this.tweens.add({
        targets: sign,
        alpha: 0.6,
        duration: 500 + Math.random() * 500,
        yoyo: true,
        repeat: -1,
        delay: Math.random() * 1000,
      });
    }
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

    // 플랫폼 본체
    platform.fillStyle(0x333344);
    platform.fillRect(0, 0, width, 15);

    // 네온 엣지
    platform.lineStyle(2, 0x00ffff, 0.6);
    platform.beginPath();
    platform.moveTo(0, 0);
    platform.lineTo(width, 0);
    platform.stroke();

    // 글로우
    platform.fillStyle(0x00ffff, 0.1);
    platform.fillRect(0, -5, width, 5);

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

    // 보스 처치
    this.events.on('bossDefeated', (rewards: any) => {
      this.player.gainExp(rewards.exp);
      this.player.gainGold(rewards.gold);
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
    // 빗방울 효과
    this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        if (Math.random() > 0.7) {
          const rain = this.add.graphics();
          rain.setPosition(
            this.cameras.main.scrollX + Math.random() * GAME_WIDTH,
            0
          );
          rain.lineStyle(1, 0x6688aa, 0.3);
          rain.beginPath();
          rain.moveTo(0, 0);
          rain.lineTo(5, 30);
          rain.stroke();
          rain.setDepth(-1);

          this.tweens.add({
            targets: rain,
            y: GAME_HEIGHT,
            x: rain.x + 20,
            duration: 800,
            onComplete: () => rain.destroy(),
          });
        }
      },
    });

    // 네온 반짝임
    this.time.addEvent({
      delay: 2000,
      loop: true,
      callback: () => {
        if (this.neonLights.length > 0) {
          const light = this.neonLights[Math.floor(Math.random() * this.neonLights.length)];
          this.tweens.add({
            targets: light,
            alpha: 0.3,
            duration: 100,
            yoyo: true,
            repeat: 2,
          });
        }
      },
    });
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
        monster.update(time, delta, this.summons);

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
      this.boss.update(time, delta, this.groundY, this.summons);
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

    // 소환수 업데이트
    const enemies: any[] = [...this.monsters];
    if (this.boss && !this.boss.isDead) enemies.push(this.boss);

    for (let i = this.summons.length - 1; i >= 0; i--) {
      const summon = this.summons[i];
      if (summon.isAlive) {
        summon.update(time, delta, this.groundY, enemies);
      } else {
        this.summons.splice(i, 1);
      }
    }

    // 죽은 소환수 정리
    this.player.minionGhouls = this.player.minionGhouls.filter((s: any) => s.isAlive);

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

    // Q - 구울 소환
    if (Phaser.Input.Keyboard.JustDown(this.keys.q)) {
      this.player.summonGhoulMinion();
    }

    // W - 뼈가시
    if (Phaser.Input.Keyboard.JustDown(this.keys.w)) {
      this.player.castBoneSpike();
    }

    // E - 시체 폭탄
    if (Phaser.Input.Keyboard.JustDown(this.keys.e)) {
      this.player.castCorpseBomb();
    }

    // R - 거대 구울
    if (Phaser.Input.Keyboard.JustDown(this.keys.r)) {
      this.player.summonGiantGhoul();
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
