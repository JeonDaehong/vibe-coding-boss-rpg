import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { TrentBoss } from '../entities/TrentBoss';
import { SoundManager } from '../utils/SoundManager';

export class BossBattleScene extends Phaser.Scene {
  private player!: Player;
  private boss!: TrentBoss;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private ctrlKey!: Phaser.Input.Keyboard.Key;
  private shiftKey!: Phaser.Input.Keyboard.Key;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private keyQ!: Phaser.Input.Keyboard.Key;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyR!: Phaser.Input.Keyboard.Key;
  private keyT!: Phaser.Input.Keyboard.Key;
  private escKey!: Phaser.Input.Keyboard.Key;

  private playerShadow!: Phaser.GameObjects.Ellipse;
  private isDashing: boolean = false;
  private dashCooldown: number = 0;
  private isJumping: boolean = false;

  private bossName: string = '트렌트';
  private floorLevel: number = 1;

  // 대화 시스템
  private dialogueContainer!: Phaser.GameObjects.Container;
  private isDialogueActive: boolean = false;
  private battleStarted: boolean = false;

  // 보스 체력바 UI (상단)
  private bossHealthBarContainer!: Phaser.GameObjects.Container;
  private bossHealthBar!: Phaser.GameObjects.Graphics;
  private bossHealthText!: Phaser.GameObjects.Text;

  // 전송진
  private portal!: Phaser.GameObjects.Container;
  private portalActive: boolean = false;

  // 보상 아이템들
  private rewards: Phaser.GameObjects.Container[] = [];

  // 사운드 매니저
  private soundManager!: SoundManager;

  constructor() {
    super({ key: 'BossBattleScene' });
  }

  init(data: { bossName?: string; floorLevel?: number }): void {
    this.bossName = data.bossName || '트렌트';
    this.floorLevel = data.floorLevel || 1;
    this.battleStarted = false;
    this.isDialogueActive = false;
    this.portalActive = false;
    this.rewards = [];
  }

  create(): void {
    this.cameras.main.fadeIn(500, 0, 0, 0);

    // 사운드 매니저 초기화
    this.soundManager = SoundManager.getInstance(this);
    this.soundManager.playBGM('boss');

    // 플레이어용 빈 텍스처 생성
    if (!this.textures.exists('player_empty')) {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      this.textures.addCanvas('player_empty', canvas);
    }

    // 키 설정
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.ctrlKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.CTRL);
    this.shiftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyQ = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.keyW = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyE = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyR = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.keyT = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.T);
    this.escKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    // 배경 생성
    this.createArena();

    // 플레이어 생성
    this.createPlayer();

    // 보스 생성
    this.createBoss();

    // 보스 체력바 UI (상단) 생성
    this.createBossHealthBar();

    // UI 씬 시작 (보스전 모드로)
    this.scene.launch('UIScene', { isBossBattle: true });

    // 보스전 대화 시작
    this.startBossDialogue();
  }

  private createArena(): void {
    const { width, height } = this.cameras.main;
    const graphics = this.add.graphics();

    // 어두운 숲 바닥
    graphics.fillStyle(0x1a2a1a, 1);
    graphics.fillRect(0, 0, width, height);

    // 바닥 텍스처 (이끼, 나뭇잎)
    graphics.fillStyle(0x2a3a2a, 0.5);
    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      graphics.fillEllipse(x, y, Phaser.Math.Between(20, 60), Phaser.Math.Between(15, 40));
    }

    // 나뭇잎 장식
    graphics.fillStyle(0x3d5a37, 0.4);
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      graphics.fillEllipse(x, y, 15, 8);
    }

    // 테두리 나무들
    graphics.fillStyle(0x3a2a1a, 1);
    for (let i = 0; i < 20; i++) {
      const x = i < 10 ? 20 : width - 20;
      const y = 50 + (i % 10) * 60;
      graphics.fillRoundedRect(x - 15, y - 30, 30, 80, 5);
      graphics.fillStyle(0x2d5a27, 1);
      graphics.fillCircle(x, y - 50, 25);
      graphics.fillStyle(0x3a2a1a, 1);
    }

    // 상단/하단 나무
    for (let i = 0; i < 15; i++) {
      const x = 80 + i * 80;
      graphics.fillRoundedRect(x - 10, 10, 20, 50, 5);
      graphics.fillStyle(0x2d5a27, 1);
      graphics.fillCircle(x, -5, 20);
      graphics.fillStyle(0x3a2a1a, 1);

      graphics.fillRoundedRect(x - 10, height - 40, 20, 50, 5);
    }

    // 아레나 중앙 원형 표시
    graphics.lineStyle(2, 0x4a6a4a, 0.5);
    graphics.strokeCircle(width / 2, height / 2 + 50, 200);
    graphics.strokeCircle(width / 2, height / 2 + 50, 250);
  }

  private createPlayer(): void {
    const { width, height } = this.cameras.main;

    this.player = new Player(this, width / 2, height - 100);
    this.player.setDepth(100);
    this.player.resetBattleSkills(); // 스킬 사용 횟수 리셋

    this.playerShadow = this.add.ellipse(this.player.x, this.player.y + 24, 35, 14, 0x000000, 0.35);
    this.playerShadow.setDepth(99);
  }

  private createBoss(): void {
    const { width, height } = this.cameras.main;

    this.boss = new TrentBoss(this, width / 2, height / 2 - 50);
  }

  private createBossHealthBar(): void {
    const { width } = this.cameras.main;

    this.bossHealthBarContainer = this.add.container(width / 2, 40);
    this.bossHealthBarContainer.setDepth(1000);
    this.bossHealthBarContainer.setScrollFactor(0);

    // 배경
    const bgWidth = 600;
    const bgHeight = 35;
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a0a, 0.9);
    bg.fillRoundedRect(-bgWidth / 2 - 5, -bgHeight / 2 - 5, bgWidth + 10, bgHeight + 10, 8);
    bg.lineStyle(2, 0x442222, 0.8);
    bg.strokeRoundedRect(-bgWidth / 2 - 5, -bgHeight / 2 - 5, bgWidth + 10, bgHeight + 10, 8);
    this.bossHealthBarContainer.add(bg);

    // 보스 이름
    const bossNameText = this.add.text(-bgWidth / 2, -bgHeight / 2 - 20, `${this.bossName} (${this.floorLevel}층)`, {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '14px',
      color: '#ff6644',
      fontStyle: 'bold',
    });
    this.bossHealthBarContainer.add(bossNameText);

    // 체력바
    this.bossHealthBar = this.add.graphics();
    this.bossHealthBarContainer.add(this.bossHealthBar);

    // 체력 텍스트
    this.bossHealthText = this.add.text(bgWidth / 2, 0, '', {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '12px',
      color: '#ffffff',
    });
    this.bossHealthText.setOrigin(1, 0.5);
    this.bossHealthBarContainer.add(this.bossHealthText);

    this.updateBossHealthBar();
  }

  private updateBossHealthBar(): void {
    if (!this.boss || !this.bossHealthBar) return;

    const bgWidth = 600;
    const bgHeight = 35;
    const ratio = Math.max(0, this.boss.health / this.boss.maxHealth);

    this.bossHealthBar.clear();

    // 체력 바 배경
    this.bossHealthBar.fillStyle(0x1a1a1a, 1);
    this.bossHealthBar.fillRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight, 5);

    // 체력 바 (색상 변화)
    let color = 0x44aa44;
    if (ratio < 0.3) color = 0xaa2222;
    else if (ratio < 0.7) color = 0xaaaa22;

    this.bossHealthBar.fillStyle(color, 1);
    this.bossHealthBar.fillRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth * ratio, bgHeight, 5);

    // 하이라이트
    this.bossHealthBar.fillStyle(0xffffff, 0.15);
    this.bossHealthBar.fillRoundedRect(-bgWidth / 2, -bgHeight / 2, bgWidth * ratio, bgHeight / 2, 5);

    // 70%, 30% 마커 표시
    this.bossHealthBar.lineStyle(2, 0xffff00, 0.8);
    this.bossHealthBar.lineBetween(-bgWidth / 2 + bgWidth * 0.7, -bgHeight / 2, -bgWidth / 2 + bgWidth * 0.7, bgHeight / 2);
    this.bossHealthBar.lineStyle(2, 0xff4400, 0.8);
    this.bossHealthBar.lineBetween(-bgWidth / 2 + bgWidth * 0.3, -bgHeight / 2, -bgWidth / 2 + bgWidth * 0.3, bgHeight / 2);

    // 텍스트 업데이트
    if (this.bossHealthText) {
      this.bossHealthText.setText(`${Math.floor(this.boss.health)} / ${this.boss.maxHealth}`);
    }
  }

  private startBossDialogue(): void {
    this.isDialogueActive = true;

    const { width, height } = this.cameras.main;

    // 대화 컨테이너 생성
    this.dialogueContainer = this.add.container(0, 0);
    this.dialogueContainer.setDepth(500);

    // 대화 배경
    const dialogueBg = this.add.graphics();
    dialogueBg.fillStyle(0x000000, 0.85);
    dialogueBg.fillRoundedRect(50, height - 200, width - 100, 150, 15);
    dialogueBg.lineStyle(3, 0x00d4ff, 0.8);
    dialogueBg.strokeRoundedRect(50, height - 200, width - 100, 150, 15);
    this.dialogueContainer.add(dialogueBg);

    // 대화 시퀀스
    const dialogues = [
      { speaker: '???', text: '누구냐... 이 깊은 숲에 발을 들이다니...', color: '#ff6644' },
      { speaker: this.bossName, text: '나는 이 숲의 수호자, 트렌트다.', color: '#ff6644' },
      { speaker: '주인공', text: '지저 정복을 위해 왔다. 물러서라!', color: '#00d4ff' },
      { speaker: this.bossName, text: '하하하... 어리석은 인간이여.\n이 숲을 지나가려면 나를 쓰러뜨려야 할 것이다!', color: '#ff6644' },
      { speaker: '주인공', text: '좋아, 덤벼라!', color: '#00d4ff' },
    ];

    let dialogueIndex = 0;

    const showDialogue = () => {
      if (dialogueIndex >= dialogues.length) {
        // 대화 종료, 전투 시작
        this.tweens.add({
          targets: this.dialogueContainer,
          alpha: 0,
          duration: 300,
          onComplete: () => {
            this.dialogueContainer.destroy();
            this.isDialogueActive = false;
            this.battleStarted = true;
            this.playBossIntro();
          },
        });
        return;
      }

      const dialogue = dialogues[dialogueIndex];

      // 기존 텍스트 제거
      this.dialogueContainer.getAll().forEach((child, index) => {
        if (index > 0) child.destroy();
      });

      // 대화 배경 다시 추가 (제거됐을 수 있음)
      const bg = this.add.graphics();
      bg.fillStyle(0x000000, 0.85);
      bg.fillRoundedRect(50, height - 200, width - 100, 150, 15);
      bg.lineStyle(3, dialogue.speaker === '주인공' ? 0x00d4ff : 0xff6644, 0.8);
      bg.strokeRoundedRect(50, height - 200, width - 100, 150, 15);
      this.dialogueContainer.add(bg);

      // 화자 이름
      const speakerText = this.add.text(80, height - 190, dialogue.speaker, {
        fontFamily: '"Noto Sans KR", sans-serif',
        fontSize: '18px',
        color: dialogue.color,
        fontStyle: 'bold',
      });
      this.dialogueContainer.add(speakerText);

      // 대화 내용 (타이핑 효과)
      const contentText = this.add.text(80, height - 155, '', {
        fontFamily: '"Noto Sans KR", sans-serif',
        fontSize: '16px',
        color: '#ffffff',
        wordWrap: { width: width - 180 },
        lineSpacing: 8,
      });
      this.dialogueContainer.add(contentText);

      // 타이핑 효과
      let charIndex = 0;
      const typeText = () => {
        // 텍스트 객체가 삭제되었는지 체크
        if (!contentText || !contentText.active) return;
        if (charIndex < dialogue.text.length) {
          contentText.setText(dialogue.text.substring(0, charIndex + 1));
          charIndex++;
          this.time.delayedCall(30, typeText);
        }
      };
      typeText();

      // 계속하기 안내
      const continueText = this.add.text(width - 100, height - 65, 'Ctrl로 계속...', {
        fontFamily: '"Noto Sans KR", sans-serif',
        fontSize: '12px',
        color: '#888888',
      });
      continueText.setOrigin(1, 0.5);
      this.dialogueContainer.add(continueText);

      // 깜빡임 효과
      this.tweens.add({
        targets: continueText,
        alpha: { from: 1, to: 0.3 },
        duration: 500,
        yoyo: true,
        repeat: -1,
      });

      dialogueIndex++;
    };

    // Ctrl 키로 대화 진행
    const advanceDialogue = () => {
      if (this.isDialogueActive && Phaser.Input.Keyboard.JustDown(this.ctrlKey)) {
        showDialogue();
      }
    };

    // 업데이트 이벤트에 추가
    this.events.on('update', advanceDialogue);

    // 첫 대화 표시
    showDialogue();
  }

  private playBossIntro(): void {
    const { width, height } = this.cameras.main;

    // 보스 이름 표시
    const introContainer = this.add.container(width / 2, height / 2);
    introContainer.setDepth(500);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRect(-width / 2, -50, width, 100);
    introContainer.add(bg);

    const floorText = this.add.text(0, -20, `지저 정복 ${this.floorLevel}층`, {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '20px',
      color: '#aaaaaa',
    });
    floorText.setOrigin(0.5, 0.5);
    introContainer.add(floorText);

    const bossText = this.add.text(0, 15, this.bossName, {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '36px',
      color: '#ff6644',
      fontStyle: 'bold',
    });
    bossText.setOrigin(0.5, 0.5);
    introContainer.add(bossText);

    // 페이드 아웃
    this.tweens.add({
      targets: introContainer,
      alpha: 0,
      duration: 500,
      delay: 2000,
      onComplete: () => introContainer.destroy(),
    });
  }

  update(_time: number, delta: number): void {
    if (!this.player) return;

    // UI 업데이트는 항상 실행 (대화 중에도)
    const uiScene = this.scene.get('UIScene') as any;
    if (uiScene) {
      if (uiScene.updateHealthBar) {
        uiScene.updateHealthBar(this.player.health, this.player.maxHealth);
      }
      if (uiScene.updateManaBar) {
        uiScene.updateManaBar(this.player.mana, this.player.maxMana);
      }
      if (uiScene.updateShieldBar) {
        uiScene.updateShieldBar(this.player.shield, this.player.maxHealth);
      }
    }

    // 대화 중에는 나머지 업데이트 중지
    if (this.isDialogueActive) return;

    // 전송진 체크
    if (this.portalActive && this.portal) {
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        this.portal.x, this.portal.y
      );
      if (dist < 50) {
        this.enterPortal();
        return;
      }
    }

    // 쿨타임 감소
    if (this.dashCooldown > 0) this.dashCooldown -= delta;

    // ESC로 나가기
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.exitBattle();
      return;
    }

    // 플레이어 업데이트
    this.player.update(_time, delta);
    this.handlePlayerInput(_time, delta);

    // 플레이어 그림자
    if (this.playerShadow) {
      this.playerShadow.setPosition(this.player.x, this.player.y + 24);
    }

    // 보스 업데이트
    if (this.boss && !this.boss.isDead && this.battleStarted) {
      this.boss.update(_time, delta, this.player);

      // 보스 체력바 업데이트
      this.updateBossHealthBar();

      // 궁극기 트리거 체크
      this.boss.checkUltimateTrigger(this.player, this.soundManager);
    }

    // 보스 처치 확인
    if (this.boss && this.boss.isDead && !this.portalActive) {
      this.onBossDefeated();
    }

    // 플레이어 사망 확인
    if (this.player.health <= 0 && this.battleStarted) {
      this.playerDied();
    }
  }

  private onBossDefeated(): void {
    this.portalActive = true; // 중복 호출 방지
    this.soundManager.playSFX('victory');

    const { width, height } = this.cameras.main;

    // 승리 메시지
    const victoryText = this.add.text(width / 2, height / 3, '승리!', {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '64px',
      color: '#ffdd00',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6,
    });
    victoryText.setOrigin(0.5, 0.5);
    victoryText.setDepth(600);
    victoryText.setAlpha(0);

    this.tweens.add({
      targets: victoryText,
      alpha: 1,
      scale: { from: 0.5, to: 1.2 },
      duration: 500,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: victoryText,
          scale: 1,
          duration: 200,
        });
      },
    });

    // 보상 쏟아지기
    this.time.delayedCall(500, () => this.spawnRewards());

    // 전송진 생성 (3초 후)
    this.time.delayedCall(3000, () => this.createPortal());
  }

  private spawnRewards(): void {
    const { width, height } = this.cameras.main;
    const rewardTypes = [
      { icon: '💰', name: '골드', color: 0xffdd00 },
      { icon: '💎', name: '보석', color: 0x00ddff },
      { icon: '⚔️', name: '무기 조각', color: 0xaaaaaa },
      { icon: '🔮', name: '마법석', color: 0xaa44ff },
      { icon: '📜', name: '스킬 서적', color: 0xffaa44 },
    ];

    // 15-25개 보상 생성
    const rewardCount = Phaser.Math.Between(15, 25);

    for (let i = 0; i < rewardCount; i++) {
      this.time.delayedCall(i * 80, () => {
        this.soundManager.playSFX('reward');

        const reward = rewardTypes[Phaser.Math.Between(0, rewardTypes.length - 1)];
        const startX = width / 2 + Phaser.Math.Between(-50, 50);
        const startY = height / 2 - 100;
        const targetX = width / 2 + Phaser.Math.Between(-200, 200);
        const targetY = height / 2 + Phaser.Math.Between(50, 150);

        const rewardContainer = this.add.container(startX, startY);
        rewardContainer.setDepth(550);

        // 아이템 배경
        const bg = this.add.graphics();
        bg.fillStyle(reward.color, 0.3);
        bg.fillCircle(0, 0, 20);
        bg.lineStyle(2, reward.color, 0.8);
        bg.strokeCircle(0, 0, 20);
        rewardContainer.add(bg);

        // 아이콘
        const icon = this.add.text(0, 0, reward.icon, {
          fontSize: '18px',
        });
        icon.setOrigin(0.5, 0.5);
        rewardContainer.add(icon);

        this.rewards.push(rewardContainer);

        // 위로 튀어오른 후 떨어지는 애니메이션
        this.tweens.add({
          targets: rewardContainer,
          x: targetX,
          y: startY - 100,
          duration: 300,
          ease: 'Quad.easeOut',
          onComplete: () => {
            this.tweens.add({
              targets: rewardContainer,
              y: targetY,
              duration: 400,
              ease: 'Bounce.easeOut',
            });
          },
        });

        // 빛나는 효과
        this.tweens.add({
          targets: rewardContainer,
          alpha: { from: 1, to: 0.7 },
          duration: 300,
          yoyo: true,
          repeat: -1,
        });
      });
    }

    // 획득 메시지
    this.time.delayedCall(rewardCount * 80 + 500, () => {
      const acquireText = this.add.text(width / 2, height / 2 + 200, '보상을 획득했습니다!', {
        fontFamily: '"Noto Sans KR", sans-serif',
        fontSize: '20px',
        color: '#ffffff',
        backgroundColor: '#000000aa',
        padding: { x: 20, y: 10 },
      });
      acquireText.setOrigin(0.5, 0.5);
      acquireText.setDepth(600);

      this.tweens.add({
        targets: acquireText,
        alpha: 0,
        y: height / 2 + 180,
        duration: 2000,
        delay: 2000,
        onComplete: () => acquireText.destroy(),
      });
    });
  }

  private createPortal(): void {
    const { width, height } = this.cameras.main;

    this.soundManager.playSFX('portal');

    this.portal = this.add.container(width / 2, height / 2 + 50);
    this.portal.setDepth(400);
    this.portal.setAlpha(0);

    // 전송진 그래픽
    const portalGraphics = this.add.graphics();

    // 애니메이션 변수
    let angle = 0;

    const drawPortal = () => {
      portalGraphics.clear();

      // 외곽 원
      portalGraphics.lineStyle(4, 0x00ddff, 0.8);
      portalGraphics.strokeCircle(0, 0, 60);

      // 내부 회전 원
      portalGraphics.lineStyle(3, 0x00aaff, 0.6);
      portalGraphics.strokeCircle(0, 0, 45);

      // 회전하는 마법진 문양
      for (let i = 0; i < 6; i++) {
        const a = angle + (i / 6) * Math.PI * 2;
        const x1 = Math.cos(a) * 50;
        const y1 = Math.sin(a) * 50;
        const x2 = Math.cos(a + Math.PI) * 50;
        const y2 = Math.sin(a + Math.PI) * 50;

        portalGraphics.lineStyle(2, 0x44ffff, 0.5);
        portalGraphics.lineBetween(x1, y1, x2, y2);
      }

      // 중심 빛
      portalGraphics.fillStyle(0x00ffff, 0.4 + Math.sin(angle * 2) * 0.2);
      portalGraphics.fillCircle(0, 0, 30);

      portalGraphics.fillStyle(0xffffff, 0.3);
      portalGraphics.fillCircle(0, 0, 15);

      angle += 0.03;
    };

    this.portal.add(portalGraphics);

    // 안내 텍스트
    const portalText = this.add.text(0, 85, '전송진으로 이동하세요', {
      fontFamily: '"Noto Sans KR", sans-serif',
      fontSize: '14px',
      color: '#00ddff',
    });
    portalText.setOrigin(0.5, 0.5);
    this.portal.add(portalText);

    // 등장 애니메이션
    this.tweens.add({
      targets: this.portal,
      alpha: 1,
      scale: { from: 0, to: 1 },
      duration: 500,
      ease: 'Back.easeOut',
    });

    // 전송진 회전 애니메이션
    this.time.addEvent({
      delay: 16,
      callback: drawPortal,
      loop: true,
    });

    // 텍스트 깜빡임
    this.tweens.add({
      targets: portalText,
      alpha: { from: 1, to: 0.5 },
      duration: 500,
      yoyo: true,
      repeat: -1,
    });
  }

  private enterPortal(): void {
    this.portalActive = false;
    this.soundManager.stopBGM();

    this.cameras.main.fadeOut(500, 255, 255, 255);

    this.time.delayedCall(500, () => {
      this.scene.stop('UIScene');
      this.scene.start('GameScene', { returnFromBuilding: 'DungeonScene' });
    });
  }

  private handlePlayerInput(time: number, delta: number): void {
    // 이동
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown) vx = -1;
    else if (this.cursors.right.isDown) vx = 1;
    if (this.cursors.up.isDown) vy = -1;
    else if (this.cursors.down.isDown) vy = 1;

    // 대각선 이동 정규화
    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    this.player.setVelocity(vx * this.player.speed, vy * this.player.speed);

    // 기본 공격
    const ctrlPressed = Phaser.Input.Keyboard.JustDown(this.ctrlKey);
    if (ctrlPressed) {
      this.performBasicAttack();
    }

    // 대쉬
    if (Phaser.Input.Keyboard.JustDown(this.shiftKey) && !this.isDashing && this.dashCooldown <= 0) {
      this.performDash();
    }

    // 점프
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && !this.isJumping) {
      this.performJump();
    }

    // 스킬
    this.handleSkillInput();
  }

  private performBasicAttack(): void {
    this.soundManager.playSFX('slash');

    let dirX = 1;
    let dirY = 0;
    if (this.cursors.left.isDown) dirX = -1;
    else if (this.cursors.right.isDown) dirX = 1;
    if (this.cursors.up.isDown) dirY = -1;
    else if (this.cursors.down.isDown) dirY = 1;

    const slashEffect = this.add.graphics();
    slashEffect.setDepth(this.player.depth + 1);

    const slashRadius = 60;
    const startAngle = Math.atan2(dirY, dirX) - 0.8;
    const endAngle = startAngle + 1.6;

    slashEffect.lineStyle(8, 0x888899, 0.6);
    slashEffect.beginPath();
    slashEffect.arc(this.player.x, this.player.y, slashRadius, startAngle, endAngle);
    slashEffect.strokePath();

    slashEffect.lineStyle(4, 0xccccdd, 0.9);
    slashEffect.beginPath();
    slashEffect.arc(this.player.x, this.player.y, slashRadius, startAngle, endAngle);
    slashEffect.strokePath();

    slashEffect.lineStyle(2, 0xffffff, 1);
    slashEffect.beginPath();
    slashEffect.arc(this.player.x, this.player.y, slashRadius, startAngle, endAngle);
    slashEffect.strokePath();

    // 보스 피격 체크
    const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.boss.x, this.boss.y);
    if (dist < slashRadius + 60) {
      const baseDamage = 10 * this.player.attackPowerMultiplier;
      this.boss.takeDamage(Math.floor(baseDamage));
    }

    this.tweens.add({
      targets: slashEffect,
      alpha: 0,
      duration: 100,
      onComplete: () => slashEffect.destroy(),
    });
  }

  private performDash(): void {
    this.soundManager.playSFX('dash');
    this.isDashing = true;
    this.dashCooldown = 1000;

    let dashX = 0;
    let dashY = 0;

    if (this.cursors.left.isDown) dashX = -1;
    else if (this.cursors.right.isDown) dashX = 1;
    if (this.cursors.up.isDown) dashY = -1;
    else if (this.cursors.down.isDown) dashY = 1;

    if (dashX === 0 && dashY === 0) dashX = 1;

    const dashDistance = 120;
    const targetX = this.player.x + dashX * dashDistance;
    const targetY = this.player.y + dashY * dashDistance;

    this.tweens.add({
      targets: this.player,
      x: targetX,
      y: targetY,
      duration: 100,
      onComplete: () => {
        this.isDashing = false;
      },
    });
  }

  private performJump(): void {
    this.soundManager.playSFX('jump');
    this.isJumping = true;

    this.tweens.add({
      targets: this.player,
      y: this.player.y - 50,
      duration: 200,
      ease: 'Quad.easeOut',
      yoyo: true,
      onComplete: () => {
        this.isJumping = false;
      },
    });
  }

  private handleSkillInput(): void {
    // Q: 결정타
    if (Phaser.Input.Keyboard.JustDown(this.keyQ)) {
      this.useSkillQ();
    }
    // W: 와류의 검
    if (Phaser.Input.Keyboard.JustDown(this.keyW)) {
      this.useSkillW();
    }
    // E: 철벽 태세
    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this.useSkillE();
    }
    // R: 한계 돌파
    if (Phaser.Input.Keyboard.JustDown(this.keyR)) {
      this.useSkillR();
    }
    // T: 성검 낙하
    if (Phaser.Input.Keyboard.JustDown(this.keyT)) {
      this.useSkillT();
    }
  }

  private useSkillQ(): void {
    if (!this.player.canUseSkill('Q')) return;
    this.soundManager.playSFX('thrust');
    this.player.useSkill('Q');

    let dirX = 1, dirY = 0;
    if (this.cursors.left.isDown) dirX = -1;
    else if (this.cursors.right.isDown) dirX = 1;
    if (this.cursors.up.isDown) dirY = -1;
    else if (this.cursors.down.isDown) dirY = 1;

    const thrustLength = 120;
    const thrustEffect = this.add.graphics();
    thrustEffect.setDepth(this.player.depth + 1);

    const startX = this.player.x + dirX * 20;
    const startY = this.player.y + dirY * 20;
    const endX = this.player.x + dirX * thrustLength;
    const endY = this.player.y + dirY * thrustLength;

    const angle = Math.atan2(dirY, dirX);
    const perpX = Math.cos(angle + Math.PI / 2);
    const perpY = Math.sin(angle + Math.PI / 2);

    thrustEffect.fillStyle(0xccccdd, 0.9);
    thrustEffect.beginPath();
    thrustEffect.moveTo(endX, endY);
    thrustEffect.lineTo(startX + perpX * 8, startY + perpY * 8);
    thrustEffect.lineTo(startX - perpX * 8, startY - perpY * 8);
    thrustEffect.closePath();
    thrustEffect.fillPath();

    thrustEffect.lineStyle(3, 0xffffff, 0.9);
    thrustEffect.lineBetween(startX, startY, endX, endY);

    // 보스 피격
    const dist = Phaser.Math.Distance.Between(endX, endY, this.boss.x, this.boss.y);
    if (dist < 80) {
      this.boss.takeDamage(Math.floor(30 * this.player.attackPowerMultiplier));
    }

    this.tweens.add({
      targets: thrustEffect,
      alpha: 0,
      duration: 120,
      onComplete: () => thrustEffect.destroy(),
    });

    const uiScene = this.scene.get('UIScene') as any;
    if (uiScene?.setSkillCooldown) {
      uiScene.setSkillCooldown('Q', 5000);
    }
  }

  private useSkillW(): void {
    if (!this.player.canUseSkill('W')) return;
    this.soundManager.playSFX('vortex');
    this.player.useSkill('W');

    const vortexContainer = this.add.container(this.player.x, this.player.y);
    vortexContainer.setDepth(this.player.depth + 1);

    const swordGraphics = this.add.graphics();
    vortexContainer.add(swordGraphics);

    let angle = 0;
    const radius = 70;
    let hitCount = 0;

    const updateVortex = () => {
      swordGraphics.clear();
      for (let i = 0; i < 4; i++) {
        const swordAngle = angle + (i * Math.PI * 2) / 4;
        for (let j = 0; j < 5; j++) {
          const trailAngle = swordAngle - j * 0.08;
          const trailRadius = radius - j * 3;
          const tx = Math.cos(trailAngle) * trailRadius;
          const ty = Math.sin(trailAngle) * trailRadius * 0.7;
          swordGraphics.lineStyle(4 - j * 0.5, 0xccccdd, 0.8 - j * 0.15);
          swordGraphics.lineBetween(0, 0, tx, ty);
        }
      }
      angle += 0.2;
      vortexContainer.setPosition(this.player.x, this.player.y);
    };

    const updateEvent = this.time.addEvent({ delay: 16, callback: updateVortex, loop: true });

    const damageEvent = this.time.addEvent({
      delay: 500,
      callback: () => {
        hitCount++;
        const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.boss.x, this.boss.y);
        if (dist < radius + 60) {
          this.boss.takeDamage(Math.floor(10 * this.player.attackPowerMultiplier));
        }
        if (hitCount >= 6) damageEvent.destroy();
      },
      loop: true,
    });

    this.time.delayedCall(3000, () => {
      updateEvent.destroy();
      damageEvent.destroy();
      this.tweens.add({
        targets: vortexContainer,
        alpha: 0,
        duration: 200,
        onComplete: () => vortexContainer.destroy(),
      });
    });

    const uiScene = this.scene.get('UIScene') as any;
    if (uiScene?.setSkillCooldown) {
      uiScene.setSkillCooldown('W', 10000);
    }
  }

  private useSkillE(): void {
    if (!this.player.canUseSkill('E')) return;
    this.soundManager.playSFX('shield');
    this.player.useSkill('E');
    this.player.applyShield(50);

    const shieldGraphics = this.add.graphics();
    shieldGraphics.setDepth(this.player.depth + 1);

    const drawShield = () => {
      shieldGraphics.clear();
      shieldGraphics.lineStyle(5, 0x888899, 0.8);
      shieldGraphics.strokeCircle(this.player.x, this.player.y, 42);
      shieldGraphics.fillStyle(0x555566, 0.4);
      shieldGraphics.fillCircle(this.player.x, this.player.y, 36);
    };

    const updateEvent = this.time.addEvent({ delay: 16, callback: drawShield, loop: true });

    this.time.delayedCall(3000, () => {
      updateEvent.destroy();
      this.player.shield = 0;
      this.tweens.add({
        targets: shieldGraphics,
        alpha: 0,
        duration: 200,
        onComplete: () => shieldGraphics.destroy(),
      });
    });

    const uiScene = this.scene.get('UIScene') as any;
    if (uiScene?.setSkillCooldown) {
      uiScene.setSkillCooldown('E', 20000);
    }
  }

  private useSkillR(): void {
    if (!this.player.canUseSkill('R')) return;
    this.soundManager.playSFX('limitbreak');
    this.player.useSkill('R');
    this.player.applyLimitBreak();

    const auraGraphics = this.add.graphics();
    auraGraphics.setDepth(this.player.depth - 1);

    let elapsed = 0;
    const drawAura = () => {
      elapsed += 16;
      auraGraphics.clear();
      for (let i = 0; i < 6; i++) {
        const xOffset = (i - 2.5) * 12;
        const yOffset = Math.sin(elapsed * 0.008 + i) * 15;
        const height = 40 + Math.sin(elapsed * 0.01 + i * 0.5) * 10;
        auraGraphics.lineStyle(2, 0xff6644, 0.5);
        auraGraphics.lineBetween(
          this.player.x + xOffset, this.player.y + 20 - yOffset,
          this.player.x + xOffset, this.player.y + 20 - yOffset - height
        );
      }
      auraGraphics.lineStyle(3, 0xcc3311, 0.6);
      auraGraphics.strokeCircle(this.player.x, this.player.y, 35);
    };

    const updateEvent = this.time.addEvent({ delay: 16, callback: drawAura, loop: true });

    this.time.delayedCall(5000, () => {
      updateEvent.destroy();
      this.player.removeLimitBreak();
      this.tweens.add({
        targets: auraGraphics,
        alpha: 0,
        duration: 200,
        onComplete: () => auraGraphics.destroy(),
      });
    });

    const uiScene = this.scene.get('UIScene') as any;
    if (uiScene?.setSkillCooldown) {
      uiScene.setSkillCooldown('R', 20000);
    }
  }

  private useSkillT(): void {
    if (!this.player.canUseSkill('T')) return;
    this.soundManager.playSFX('holy');
    this.player.useSkill('T');

    // 성검 낙하 - 보스에게 큰 데미지
    const { width, height } = this.cameras.main;

    const skyLight = this.add.graphics();
    skyLight.fillStyle(0xffffaa, 0.3);
    skyLight.fillRect(0, 0, width, height);
    skyLight.setDepth(900);

    this.tweens.add({
      targets: skyLight,
      alpha: 0,
      duration: 500,
      delay: 1000,
      onComplete: () => skyLight.destroy(),
    });

    // 검 낙하
    const sword = this.add.graphics();
    sword.setDepth(950);
    sword.setPosition(this.boss.x, -100);

    sword.fillStyle(0xffffdd, 1);
    sword.beginPath();
    sword.moveTo(0, -60);
    sword.lineTo(-12, 30);
    sword.lineTo(0, 20);
    sword.lineTo(12, 30);
    sword.closePath();
    sword.fillPath();
    sword.fillStyle(0xffffff, 0.8);
    sword.fillRect(-3, -50, 6, 60);
    sword.fillStyle(0x8b7355, 1);
    sword.fillRect(-8, 30, 16, 20);

    this.tweens.add({
      targets: sword,
      y: this.boss.y,
      duration: 500,
      ease: 'Quad.easeIn',
      onComplete: () => {
        // 폭발
        const explosion = this.add.graphics();
        explosion.setDepth(850);
        explosion.fillStyle(0xffffaa, 0.9);
        explosion.fillRect(this.boss.x - 80, this.boss.y - 8, 160, 16);
        explosion.fillRect(this.boss.x - 8, this.boss.y - 80, 16, 160);
        explosion.fillStyle(0xffff88, 0.7);
        explosion.fillCircle(this.boss.x, this.boss.y, 70);

        this.boss.takeDamage(Math.floor(300 * this.player.attackPowerMultiplier));

        this.tweens.add({
          targets: explosion,
          alpha: 0,
          scale: 2,
          duration: 400,
          onComplete: () => explosion.destroy(),
        });

        this.tweens.add({
          targets: sword,
          alpha: 0,
          duration: 200,
          onComplete: () => sword.destroy(),
        });
      },
    });

    const uiScene = this.scene.get('UIScene') as any;
    if (uiScene?.setSkillCooldown) {
      uiScene.setSkillCooldown('T', 60000);
    }
  }

  private playerDied(): void {
    if (!this.battleStarted) return;
    this.battleStarted = false; // 중복 호출 방지

    this.soundManager.playSFX('defeat');

    const { width, height } = this.cameras.main;

    // 플레이어 사망 모션 애니메이션
    this.playDeathAnimation();

    // 1.5초 후 게임오버 UI 표시
    this.time.delayedCall(1500, () => {
      const gameOverBg = this.add.graphics();
      gameOverBg.fillStyle(0x000000, 0);
      gameOverBg.fillRect(0, 0, width, height);
      gameOverBg.setDepth(1000);

      // 서서히 어두워지는 효과
      this.tweens.add({
        targets: gameOverBg,
        alpha: { from: 0, to: 0.8 },
        duration: 500,
      });

      const gameOverText = this.add.text(width / 2, height / 2 - 30, '패배...', {
        fontFamily: '"Noto Sans KR", sans-serif',
        fontSize: '48px',
        color: '#ff4444',
        fontStyle: 'bold',
      });
      gameOverText.setOrigin(0.5, 0.5);
      gameOverText.setDepth(1001);
      gameOverText.setAlpha(0);

      this.tweens.add({
        targets: gameOverText,
        alpha: 1,
        y: height / 2 - 50,
        duration: 800,
        ease: 'Power2',
      });

      const respawnText = this.add.text(width / 2, height / 2 + 30, '마을 교회에서 부활합니다...', {
        fontFamily: '"Noto Sans KR", sans-serif',
        fontSize: '18px',
        color: '#aaaaaa',
      });
      respawnText.setOrigin(0.5, 0.5);
      respawnText.setDepth(1001);
      respawnText.setAlpha(0);

      this.tweens.add({
        targets: respawnText,
        alpha: 1,
        delay: 500,
        duration: 500,
      });

      this.time.delayedCall(3000, () => {
        this.soundManager.stopBGM();
        this.scene.stop('UIScene');
        // 교회에서 부활
        this.scene.start('ChurchScene', {
          fromScene: 'GameScene',
          buildingKey: 'church',
          respawn: true
        });
      });
    });
  }

  private playDeathAnimation(): void {
    // 플레이어 조작 비활성화
    this.player.setVelocity(0, 0);
    (this.player as any).canMove = false;

    // 피격 흔들림 효과
    this.cameras.main.shake(200, 0.02);

    // 플레이어 위치에 붉은 오버레이 이펙트
    const deathOverlay = this.add.graphics();
    deathOverlay.fillStyle(0xff0000, 0.5);
    deathOverlay.fillCircle(this.player.x, this.player.y, 40);
    deathOverlay.setDepth(101);

    this.tweens.add({
      targets: deathOverlay,
      alpha: 0,
      duration: 500,
      onComplete: () => deathOverlay.destroy(),
    });

    // 플레이어 페이드 아웃 + 아래로 내려감 (쓰러지는 효과)
    this.tweens.add({
      targets: this.player,
      alpha: 0.4,
      y: this.player.y + 30,
      duration: 800,
      ease: 'Power2',
    });

    // 사망 이펙트: 붉은 파티클
    this.createDeathParticles();

    // 영혼이 빠져나가는 효과
    this.time.delayedCall(500, () => {
      this.createSoulEffect();
    });
  }

  private createDeathParticles(): void {
    const { x, y } = this.player;

    // 붉은 파티클 (피)
    for (let i = 0; i < 15; i++) {
      const particle = this.add.graphics();
      particle.fillStyle(0xff4444, 0.8);
      particle.fillCircle(0, 0, Phaser.Math.Between(3, 8));
      particle.setPosition(x, y);
      particle.setDepth(99);

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.Between(30, 80);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance - 20,
        alpha: 0,
        duration: Phaser.Math.Between(400, 800),
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  private createSoulEffect(): void {
    const { x, y } = this.player;

    // 영혼 (반투명 흰색 실루엣)
    const soul = this.add.graphics();
    soul.fillStyle(0xffffff, 0.6);
    // 간단한 유령 모양
    soul.fillEllipse(0, -10, 30, 40);
    soul.fillTriangle(-15, 10, 15, 10, 0, 30);
    soul.setPosition(x, y);
    soul.setDepth(105);

    // 영혼이 위로 올라가며 사라짐
    this.tweens.add({
      targets: soul,
      y: y - 150,
      alpha: 0,
      duration: 1500,
      ease: 'Sine.easeIn',
      onComplete: () => soul.destroy(),
    });

    // 영혼 흔들림 효과
    this.tweens.add({
      targets: soul,
      x: { value: x + 10, duration: 200, yoyo: true, repeat: 3 },
      ease: 'Sine.easeInOut',
    });
  }

  private exitBattle(victory: boolean = false): void {
    this.scene.stop('UIScene');
    this.cameras.main.fadeOut(500, 0, 0, 0);

    this.time.delayedCall(500, () => {
      this.scene.start('DungeonScene', {
        victory,
        bossName: this.bossName,
        floorLevel: this.floorLevel,
      });
    });
  }
}
