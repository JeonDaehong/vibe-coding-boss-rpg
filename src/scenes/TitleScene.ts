import Phaser from 'phaser';

export class TitleScene extends Phaser.Scene {
  private idInput!: HTMLInputElement;
  private pwInput!: HTMLInputElement;
  private loginContainer!: HTMLDivElement;

  constructor() {
    super({ key: 'TitleScene' });
  }

  preload(): void {
    // 타이틀 배경 이미지 로드
    this.load.image('title_bg', '/assets/images/title_bg.png');

    // 로드 에러 처리
    this.load.on('loaderror', () => {
      console.log('Background image not found, using fallback');
    });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // 배경 이미지 또는 폴백 배경
    if (this.textures.exists('title_bg')) {
      const bg = this.add.image(width / 2, height / 2, 'title_bg');
      bg.setDisplaySize(width, height);
    } else {
      // 폴백: 그라데이션 배경 생성
      this.createFallbackBackground(width, height);
    }

    // 어두운 오버레이 (가독성 향상)
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.3);

    // 게임 타이틀 - "지저 정복"
    this.createTitle(width, height);

    // 로그인 UI 생성
    this.createLoginUI(width, height);
  }

  private createFallbackBackground(width: number, height: number): void {
    const graphics = this.add.graphics();

    // 어두운 용암 동굴 느낌의 배경
    graphics.fillStyle(0x1a0a0a, 1);
    graphics.fillRect(0, 0, width, height);

    // 용암 균열 효과
    graphics.lineStyle(3, 0xff4500, 0.6);
    for (let i = 0; i < 15; i++) {
      const startX = Phaser.Math.Between(0, width);
      const startY = Phaser.Math.Between(0, height);
      graphics.beginPath();
      graphics.moveTo(startX, startY);
      for (let j = 0; j < 5; j++) {
        graphics.lineTo(
          startX + Phaser.Math.Between(-100, 100),
          startY + Phaser.Math.Between(50, 150) * (j + 1) / 3
        );
      }
      graphics.strokePath();
    }

    // 용암 기둥 효과 (양쪽)
    for (let i = 0; i < 5; i++) {
      const leftX = 50 + i * 30;
      const rightX = width - 50 - i * 30;
      const pillarHeight = Phaser.Math.Between(200, 400);

      graphics.fillStyle(0xff6600, 0.3 + i * 0.1);
      graphics.fillRect(leftX - 10, height - pillarHeight, 20, pillarHeight);
      graphics.fillRect(rightX - 10, height - pillarHeight, 20, pillarHeight);
    }

    // 바닥 용암
    graphics.fillStyle(0xff4500, 0.5);
    graphics.fillRect(0, height - 50, width, 50);

    // 연기/안개 효과
    for (let i = 0; i < 20; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(height - 200, height);
      const size = Phaser.Math.Between(30, 80);
      graphics.fillStyle(0x333333, 0.1);
      graphics.fillCircle(x, y, size);
    }

    // 중앙 계단과 왕좌 실루엣
    graphics.fillStyle(0x2a1515, 1);
    // 계단
    for (let i = 0; i < 8; i++) {
      const stepWidth = 300 - i * 20;
      const stepY = height - 100 - i * 30;
      graphics.fillRect(width / 2 - stepWidth / 2, stepY, stepWidth, 25);
    }

    // 왕좌 실루엣
    graphics.fillStyle(0x1a0808, 1);
    graphics.fillRect(width / 2 - 60, height - 380, 120, 150);
    // 왕좌 뿔
    graphics.fillTriangle(
      width / 2 - 80, height - 380,
      width / 2 - 40, height - 450,
      width / 2 - 40, height - 380
    );
    graphics.fillTriangle(
      width / 2 + 80, height - 380,
      width / 2 + 40, height - 450,
      width / 2 + 40, height - 380
    );

    // 빛나는 눈
    graphics.fillStyle(0xff0000, 1);
    graphics.fillCircle(width / 2 - 20, height - 340, 8);
    graphics.fillCircle(width / 2 + 20, height - 340, 8);
  }

  private createTitle(width: number, height: number): void {
    // 타이틀 그림자
    const titleShadow = this.add.text(width / 2 + 5, 85, '지저 정복', {
      fontFamily: '"Noto Serif KR", "Times New Roman", serif',
      fontSize: '68px',
      color: '#000000',
      fontStyle: 'bold',
    });
    titleShadow.setOrigin(0.5, 0.5);
    titleShadow.setAlpha(0.6);

    // 메인 타이틀
    const title = this.add.text(width / 2, 80, '지저 정복', {
      fontFamily: '"Noto Serif KR", "Times New Roman", serif',
      fontSize: '68px',
      color: '#ff6b35',
      fontStyle: 'bold',
      stroke: '#8b0000',
      strokeThickness: 8,
    });
    title.setOrigin(0.5, 0.5);

    // 타이틀 글로우 효과
    this.tweens.add({
      targets: title,
      alpha: { from: 1, to: 0.85 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 서브타이틀
    const subtitle = this.add.text(width / 2, 135, 'CONQUEST OF THE UNDERGROUND', {
      fontFamily: '"Cinzel", "Times New Roman", serif',
      fontSize: '16px',
      color: '#ffd700',
      letterSpacing: 6,
    });
    subtitle.setOrigin(0.5, 0.5);
  }

  private createLoginUI(width: number, height: number): void {
    // HTML 로그인 폼 생성
    this.loginContainer = document.createElement('div');
    this.loginContainer.id = 'login-container';
    this.loginContainer.innerHTML = `
      <style>
        #login-container {
          position: absolute;
          left: 50%;
          top: 55%;
          transform: translate(-50%, -50%);
          background: linear-gradient(135deg, rgba(20, 20, 40, 0.95) 0%, rgba(40, 20, 30, 0.95) 100%);
          padding: 40px 50px;
          border-radius: 16px;
          border: 2px solid #ff6b35;
          box-shadow: 0 0 30px rgba(255, 107, 53, 0.3), inset 0 0 20px rgba(0, 0, 0, 0.5);
          text-align: center;
          min-width: 320px;
        }
        #login-container h2 {
          color: #ffd700;
          margin-bottom: 30px;
          font-family: serif;
          font-size: 24px;
          text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        }
        #login-container input {
          width: 100%;
          padding: 14px 18px;
          margin-bottom: 16px;
          border: 2px solid #444;
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.6);
          color: #fff;
          font-size: 16px;
          outline: none;
          transition: all 0.3s ease;
          box-sizing: border-box;
        }
        #login-container input:focus {
          border-color: #ff6b35;
          box-shadow: 0 0 10px rgba(255, 107, 53, 0.5);
        }
        #login-container input::placeholder {
          color: #888;
        }
        #login-btn {
          width: 100%;
          padding: 16px;
          margin-top: 10px;
          background: linear-gradient(135deg, #ff6b35 0%, #8b0000 100%);
          border: none;
          border-radius: 8px;
          color: #fff;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        #login-btn:hover {
          background: linear-gradient(135deg, #ff8c5a 0%, #a00000 100%);
          transform: translateY(-2px);
          box-shadow: 0 5px 20px rgba(255, 107, 53, 0.4);
        }
        #login-btn:active {
          transform: translateY(0);
        }
        .social-login {
          margin-top: 25px;
          padding-top: 20px;
          border-top: 1px solid #444;
        }
        .social-login p {
          color: #888;
          font-size: 14px;
          margin-bottom: 15px;
        }
        .social-buttons {
          display: flex;
          gap: 10px;
          justify-content: center;
        }
        .social-btn {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: 2px solid #444;
          background: rgba(0, 0, 0, 0.5);
          color: #fff;
          font-size: 20px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .social-btn:hover {
          border-color: #ff6b35;
          transform: scale(1.1);
        }
        .social-btn.google { color: #ea4335; }
        .social-btn.kakao { color: #fee500; background: #fee500; color: #000; }
        .social-btn.naver { color: #03c75a; }
      </style>
      <h2>🔥 로그인 🔥</h2>
      <input type="text" id="login-id" placeholder="아이디" />
      <input type="password" id="login-pw" placeholder="비밀번호" />
      <button id="login-btn">게임 시작</button>
      <div class="social-login">
        <p>소셜 로그인</p>
        <div class="social-buttons">
          <button class="social-btn google">G</button>
          <button class="social-btn kakao">K</button>
          <button class="social-btn naver">N</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.loginContainer);

    // 로그인 버튼 이벤트
    const loginBtn = document.getElementById('login-btn');
    loginBtn?.addEventListener('click', () => this.handleLogin());

    // 소셜 버튼 이벤트 (현재는 동일하게 로그인 처리)
    document.querySelectorAll('.social-btn').forEach(btn => {
      btn.addEventListener('click', () => this.handleLogin());
    });

    // 엔터키로 로그인
    document.getElementById('login-pw')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.handleLogin();
    });
  }

  private handleLogin(): void {
    // 로그인 UI 제거
    if (this.loginContainer) {
      this.loginContainer.style.opacity = '0';
      this.loginContainer.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        this.loginContainer.remove();
      }, 500);
    }

    // 페이드 아웃 후 게임 씬으로 전환
    this.cameras.main.fadeOut(1000, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('GameScene');
      this.scene.start('UIScene');
    });
  }

  shutdown(): void {
    // 씬 종료시 HTML 요소 제거
    if (this.loginContainer && this.loginContainer.parentNode) {
      this.loginContainer.remove();
    }
  }
}
