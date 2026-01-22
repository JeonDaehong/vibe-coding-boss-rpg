import Phaser from 'phaser';

// 사운드 매니저 - Web Audio API로 효과음 생성
export class SoundManager {
  private scene: Phaser.Scene;
  private audioContext: AudioContext | null = null;
  private masterVolume: number = 0.5;
  private isMuted: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initAudioContext();
  }

  private initAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  public setVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  private getVolume(): number {
    return this.isMuted ? 0 : this.masterVolume;
  }

  // 화살 발사 사운드
  public playArrowShoot(): void {
    if (!this.audioContext || this.isMuted) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, this.audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.2 * this.getVolume(), this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.1);
  }

  // 화살 명중 사운드
  public playArrowHit(): void {
    if (!this.audioContext || this.isMuted) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.05);

    gainNode.gain.setValueAtTime(0.15 * this.getVolume(), this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.08);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.08);
  }

  // 적 사망 사운드
  public playEnemyDeath(): void {
    if (!this.audioContext || this.isMuted) return;

    // 저음 펑 소리
    const oscillator1 = this.audioContext.createOscillator();
    const gainNode1 = this.audioContext.createGain();

    oscillator1.connect(gainNode1);
    gainNode1.connect(this.audioContext.destination);

    oscillator1.type = 'sine';
    oscillator1.frequency.setValueAtTime(150, this.audioContext.currentTime);
    oscillator1.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.2);

    gainNode1.gain.setValueAtTime(0.3 * this.getVolume(), this.audioContext.currentTime);
    gainNode1.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

    oscillator1.start(this.audioContext.currentTime);
    oscillator1.stop(this.audioContext.currentTime + 0.2);

    // 노이즈 효과
    this.playNoise(0.05, 0.15);
  }

  // 골드 획득 사운드
  public playGoldCollect(): void {
    if (!this.audioContext || this.isMuted) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523, this.audioContext.currentTime); // C5
    oscillator.frequency.setValueAtTime(659, this.audioContext.currentTime + 0.05); // E5
    oscillator.frequency.setValueAtTime(784, this.audioContext.currentTime + 0.1); // G5

    gainNode.gain.setValueAtTime(0.2 * this.getVolume(), this.audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.2 * this.getVolume(), this.audioContext.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.2);
  }

  // 웨이브 시작 사운드
  public playWaveStart(): void {
    if (!this.audioContext || this.isMuted) return;

    const playNote = (frequency: number, startTime: number, duration: number) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(frequency, startTime);

      gainNode.gain.setValueAtTime(0.2 * this.getVolume(), startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const now = this.audioContext.currentTime;
    playNote(262, now, 0.15);        // C4
    playNote(330, now + 0.1, 0.15);  // E4
    playNote(392, now + 0.2, 0.15);  // G4
    playNote(523, now + 0.3, 0.3);   // C5
  }

  // 게이트 피격 사운드
  public playGateHit(): void {
    if (!this.audioContext || this.isMuted) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(60, this.audioContext.currentTime + 0.15);

    gainNode.gain.setValueAtTime(0.25 * this.getVolume(), this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.15);

    this.playNoise(0.1, 0.1);
  }

  // 게이트 파괴 사운드
  public playGateDestroyed(): void {
    if (!this.audioContext || this.isMuted) return;

    // 큰 폭발음
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(30, this.audioContext.currentTime + 0.5);

    gainNode.gain.setValueAtTime(0.4 * this.getVolume(), this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.5);

    this.playNoise(0.2, 0.4);
  }

  // 수호석 피격 사운드
  public playGuardianHit(): void {
    if (!this.audioContext || this.isMuted) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(150, this.audioContext.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.3 * this.getVolume(), this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.2);
  }

  // 유닛 소환 사운드
  public playUnitSummon(): void {
    if (!this.audioContext || this.isMuted) return;

    const playNote = (frequency: number, startTime: number, duration: number) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, startTime);

      gainNode.gain.setValueAtTime(0.15 * this.getVolume(), startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const now = this.audioContext.currentTime;
    playNote(392, now, 0.1);        // G4
    playNote(523, now + 0.08, 0.1); // C5
    playNote(659, now + 0.16, 0.15); // E5
    playNote(784, now + 0.24, 0.2); // G5
  }

  // 유닛 배치 사운드
  public playUnitPlace(): void {
    if (!this.audioContext || this.isMuted) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
    oscillator.frequency.setValueAtTime(500, this.audioContext.currentTime + 0.05);

    gainNode.gain.setValueAtTime(0.15 * this.getVolume(), this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.1);
  }

  // 배치 불가 사운드
  public playInvalidPlacement(): void {
    if (!this.audioContext || this.isMuted) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
    oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.2 * this.getVolume(), this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.2);
  }

  // 버튼 클릭 사운드
  public playButtonClick(): void {
    if (!this.audioContext || this.isMuted) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);

    gainNode.gain.setValueAtTime(0.1 * this.getVolume(), this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + 0.05);
  }

  // 게임 오버 사운드
  public playGameOver(): void {
    if (!this.audioContext || this.isMuted) return;

    const playNote = (frequency: number, startTime: number, duration: number) => {
      const oscillator = this.audioContext!.createOscillator();
      const gainNode = this.audioContext!.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext!.destination);

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(frequency, startTime);

      gainNode.gain.setValueAtTime(0.25 * this.getVolume(), startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const now = this.audioContext.currentTime;
    // 슬픈 하강 멜로디
    playNote(392, now, 0.3);        // G4
    playNote(349, now + 0.25, 0.3);  // F4
    playNote(330, now + 0.5, 0.3);   // E4
    playNote(262, now + 0.75, 0.5);  // C4
  }

  // 노이즈 생성 (폭발, 타격 등에 사용)
  private playNoise(volume: number, duration: number): void {
    if (!this.audioContext) return;

    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const output = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    whiteNoise.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    whiteNoise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    gainNode.gain.setValueAtTime(volume * this.getVolume(), this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    whiteNoise.start(this.audioContext.currentTime);
    whiteNoise.stop(this.audioContext.currentTime + duration);
  }

  // 오디오 컨텍스트 재개 (사용자 상호작용 후 필요)
  public resumeAudioContext(): void {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}

// 전역 사운드 매니저 인스턴스
let soundManagerInstance: SoundManager | null = null;

export function initSoundManager(scene: Phaser.Scene): SoundManager {
  soundManagerInstance = new SoundManager(scene);
  return soundManagerInstance;
}

export function getSoundManager(): SoundManager | null {
  return soundManagerInstance;
}
