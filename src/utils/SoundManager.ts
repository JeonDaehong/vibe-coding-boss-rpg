import Phaser from 'phaser';

// 웹 오디오 기반 사운드 매니저
export class SoundManager {
  private static instance: SoundManager;
  private scene: Phaser.Scene;
  private audioContext: AudioContext | null = null;
  private bgmGainNode: GainNode | null = null;
  private sfxGainNode: GainNode | null = null;
  private currentBGM: OscillatorNode | null = null;
  private bgmInterval: number | null = null;
  private bgmVolume: number = 0.3;
  private sfxVolume: number = 0.5;
  private currentBGMType: string = '';

  private constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initAudioContext();
  }

  public static getInstance(scene: Phaser.Scene): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager(scene);
    } else {
      SoundManager.instance.scene = scene;
    }
    return SoundManager.instance;
  }

  private initAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      // BGM 게인 노드
      this.bgmGainNode = this.audioContext.createGain();
      this.bgmGainNode.gain.value = this.bgmVolume;
      this.bgmGainNode.connect(this.audioContext.destination);

      // SFX 게인 노드
      this.sfxGainNode = this.audioContext.createGain();
      this.sfxGainNode.gain.value = this.sfxVolume;
      this.sfxGainNode.connect(this.audioContext.destination);
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  // 스킬 효과음 재생
  public playSFX(type: 'slash' | 'thrust' | 'vortex' | 'shield' | 'limitbreak' | 'holy' | 'hit' | 'dash' | 'jump' | 'boss_attack' | 'boss_ultimate' | 'victory' | 'defeat' | 'reward' | 'portal'): void {
    if (!this.audioContext || !this.sfxGainNode) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    switch (type) {
      case 'slash': // 기본 공격
        this.playTone([400, 800, 600], [0.1, 0.05], 'sawtooth', 0.3);
        break;
      case 'thrust': // 결정타 (Q)
        this.playTone([300, 600, 900, 700], [0.05, 0.1, 0.1], 'square', 0.4);
        break;
      case 'vortex': // 와류의 검 (W)
        this.playSwirl();
        break;
      case 'shield': // 철벽 태세 (E)
        this.playTone([200, 400, 300, 500], [0.1, 0.1, 0.15], 'sine', 0.3);
        break;
      case 'limitbreak': // 한계 돌파 (R)
        this.playPowerUp();
        break;
      case 'holy': // 성검 낙하 (T)
        this.playHolyStrike();
        break;
      case 'hit': // 피격
        this.playTone([200, 100], [0.1], 'square', 0.2);
        break;
      case 'dash': // 대쉬
        this.playTone([300, 500, 400], [0.05, 0.05], 'sine', 0.2);
        break;
      case 'jump': // 점프
        this.playTone([200, 400, 350], [0.1, 0.1], 'sine', 0.15);
        break;
      case 'boss_attack': // 보스 공격
        this.playTone([150, 100, 80], [0.15, 0.2], 'sawtooth', 0.4);
        break;
      case 'boss_ultimate': // 보스 궁극기
        this.playBossUltimate();
        break;
      case 'victory': // 승리
        this.playVictory();
        break;
      case 'defeat': // 패배
        this.playDefeat();
        break;
      case 'reward': // 보상 획득
        this.playTone([400, 600, 800, 1000], [0.1, 0.1, 0.15], 'sine', 0.3);
        break;
      case 'portal': // 포탈
        this.playTone([300, 400, 500, 400, 300], [0.1, 0.1, 0.1, 0.1], 'sine', 0.2);
        break;
    }
  }

  private playTone(frequencies: number[], durations: number[], type: OscillatorType, volume: number): void {
    if (!this.audioContext || !this.sfxGainNode) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    let time = now;
    frequencies.forEach((freq, i) => {
      osc.frequency.setValueAtTime(freq, time);
      if (i < durations.length) {
        time += durations[i];
      }
    });

    const totalDuration = durations.reduce((a, b) => a + b, 0);
    gain.gain.setValueAtTime(volume * this.sfxVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + totalDuration + 0.1);

    osc.start(now);
    osc.stop(now + totalDuration + 0.15);
  }

  private playSwirl(): void {
    if (!this.audioContext || !this.sfxGainNode) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // 회전하는 느낌의 사운드
    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(this.sfxGainNode);

      const startFreq = 200 + i * 100;
      osc.frequency.setValueAtTime(startFreq, now + i * 0.1);
      osc.frequency.exponentialRampToValueAtTime(startFreq * 2, now + i * 0.1 + 0.3);

      gain.gain.setValueAtTime(0.15 * this.sfxVolume, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.35);

      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.4);
    }
  }

  private playPowerUp(): void {
    if (!this.audioContext || !this.sfxGainNode) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // 파워업 사운드
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.5);

    gain.gain.setValueAtTime(0.3 * this.sfxVolume, now);
    gain.gain.setValueAtTime(0.4 * this.sfxVolume, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

    osc.start(now);
    osc.stop(now + 0.9);
  }

  private playHolyStrike(): void {
    if (!this.audioContext || !this.sfxGainNode) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // 신성한 일격 사운드
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(this.sfxGainNode);

      osc.frequency.setValueAtTime(800 + i * 200, now);
      osc.frequency.exponentialRampToValueAtTime(400 + i * 100, now + 0.3);

      gain.gain.setValueAtTime(0.25 * this.sfxVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

      osc.start(now);
      osc.stop(now + 0.6);
    }

    // 폭발음
    setTimeout(() => {
      this.playTone([100, 80, 60], [0.1, 0.2], 'sawtooth', 0.5);
    }, 400);
  }

  private playBossUltimate(): void {
    if (!this.audioContext || !this.sfxGainNode) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // 위협적인 사운드
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.frequency.setValueAtTime(80, now);
    osc.frequency.linearRampToValueAtTime(60, now + 1);
    osc.frequency.setValueAtTime(200, now + 1);
    osc.frequency.exponentialRampToValueAtTime(50, now + 1.5);

    gain.gain.setValueAtTime(0.4 * this.sfxVolume, now);
    gain.gain.linearRampToValueAtTime(0.5 * this.sfxVolume, now + 1);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 2);

    osc.start(now);
    osc.stop(now + 2.1);
  }

  private playVictory(): void {
    if (!this.audioContext || !this.sfxGainNode) return;

    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone([freq], [0.3], 'sine', 0.3);
      }, i * 150);
    });
  }

  private playDefeat(): void {
    if (!this.audioContext || !this.sfxGainNode) return;

    const notes = [392, 349, 311, 262]; // G4, F4, D#4, C4
    notes.forEach((freq, i) => {
      setTimeout(() => {
        this.playTone([freq], [0.4], 'sine', 0.3);
      }, i * 200);
    });
  }

  // BGM 재생
  public playBGM(type: 'village' | 'dungeon' | 'boss'): void {
    if (this.currentBGMType === type) return;

    this.stopBGM();
    this.currentBGMType = type;

    switch (type) {
      case 'village':
        this.playVillageBGM();
        break;
      case 'dungeon':
        this.playDungeonBGM();
        break;
      case 'boss':
        this.playBossBGM();
        break;
    }
  }

  private playVillageBGM(): void {
    if (!this.audioContext || !this.bgmGainNode) return;

    const ctx = this.audioContext;

    // 평화로운 마을 멜로디
    const melody = [
      { freq: 392, dur: 0.5 },  // G4
      { freq: 440, dur: 0.5 },  // A4
      { freq: 494, dur: 0.5 },  // B4
      { freq: 523, dur: 1.0 },  // C5
      { freq: 494, dur: 0.5 },  // B4
      { freq: 440, dur: 0.5 },  // A4
      { freq: 392, dur: 1.0 },  // G4
      { freq: 349, dur: 0.5 },  // F4
      { freq: 392, dur: 0.5 },  // G4
      { freq: 440, dur: 1.0 },  // A4
      { freq: 392, dur: 0.5 },  // G4
      { freq: 349, dur: 0.5 },  // F4
      { freq: 330, dur: 1.0 },  // E4
    ];

    let noteIndex = 0;
    const totalDuration = melody.reduce((sum, note) => sum + note.dur, 0) * 1000;

    const playNote = () => {
      if (!this.audioContext || !this.bgmGainNode) return;

      const note = melody[noteIndex];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = note.freq;
      osc.connect(gain);
      gain.connect(this.bgmGainNode);

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(this.bgmVolume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + note.dur * 0.9);

      osc.start(now);
      osc.stop(now + note.dur);

      noteIndex = (noteIndex + 1) % melody.length;
    };

    playNote();
    let elapsed = melody[0].dur * 1000;

    const scheduleNext = () => {
      if (this.currentBGMType !== 'village') return;

      playNote();
      const currentNote = melody[noteIndex === 0 ? melody.length - 1 : noteIndex - 1];
      elapsed += currentNote.dur * 1000;

      if (elapsed >= totalDuration) {
        // BGM 끝난 후 잠시 대기 후 반복
        setTimeout(() => {
          if (this.currentBGMType === 'village') {
            elapsed = 0;
            noteIndex = 0;
            scheduleNext();
          }
        }, 2000);
      } else {
        setTimeout(scheduleNext, currentNote.dur * 1000);
      }
    };

    setTimeout(scheduleNext, melody[0].dur * 1000);
  }

  private playDungeonBGM(): void {
    if (!this.audioContext || !this.bgmGainNode) return;

    const ctx = this.audioContext;

    // 어두운 던전 멜로디
    const melody = [
      { freq: 165, dur: 1.0 },  // E3
      { freq: 175, dur: 0.5 },  // F3
      { freq: 165, dur: 0.5 },  // E3
      { freq: 147, dur: 1.0 },  // D3
      { freq: 165, dur: 0.5 },  // E3
      { freq: 147, dur: 0.5 },  // D3
      { freq: 131, dur: 1.0 },  // C3
      { freq: 147, dur: 0.5 },  // D3
      { freq: 165, dur: 1.5 },  // E3
    ];

    let noteIndex = 0;
    const totalDuration = melody.reduce((sum, note) => sum + note.dur, 0) * 1000;

    const playNote = () => {
      if (!this.audioContext || !this.bgmGainNode) return;

      const note = melody[noteIndex];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.value = note.freq;
      osc.connect(gain);
      gain.connect(this.bgmGainNode);

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(this.bgmVolume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + note.dur * 0.9);

      osc.start(now);
      osc.stop(now + note.dur);

      noteIndex = (noteIndex + 1) % melody.length;
    };

    playNote();
    let elapsed = melody[0].dur * 1000;

    const scheduleNext = () => {
      if (this.currentBGMType !== 'dungeon') return;

      playNote();
      const currentNote = melody[noteIndex === 0 ? melody.length - 1 : noteIndex - 1];
      elapsed += currentNote.dur * 1000;

      if (elapsed >= totalDuration) {
        setTimeout(() => {
          if (this.currentBGMType === 'dungeon') {
            elapsed = 0;
            noteIndex = 0;
            scheduleNext();
          }
        }, 3000);
      } else {
        setTimeout(scheduleNext, currentNote.dur * 1000);
      }
    };

    setTimeout(scheduleNext, melody[0].dur * 1000);
  }

  private playBossBGM(): void {
    if (!this.audioContext || !this.bgmGainNode) return;

    const ctx = this.audioContext;

    // 긴장감 있는 보스 멜로디
    const melody = [
      { freq: 110, dur: 0.25 }, // A2
      { freq: 110, dur: 0.25 }, // A2
      { freq: 165, dur: 0.25 }, // E3
      { freq: 110, dur: 0.25 }, // A2
      { freq: 131, dur: 0.5 },  // C3
      { freq: 123, dur: 0.5 },  // B2
      { freq: 110, dur: 0.25 }, // A2
      { freq: 110, dur: 0.25 }, // A2
      { freq: 165, dur: 0.25 }, // E3
      { freq: 175, dur: 0.25 }, // F3
      { freq: 165, dur: 0.5 },  // E3
      { freq: 147, dur: 0.5 },  // D3
    ];

    let noteIndex = 0;
    const totalDuration = melody.reduce((sum, note) => sum + note.dur, 0) * 1000;

    const playNote = () => {
      if (!this.audioContext || !this.bgmGainNode) return;

      const note = melody[noteIndex];
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc2.type = 'square';
      osc.frequency.value = note.freq;
      osc2.frequency.value = note.freq * 2;

      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(this.bgmGainNode!);

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(this.bgmVolume * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + note.dur * 0.8);

      osc.start(now);
      osc2.start(now);
      osc.stop(now + note.dur);
      osc2.stop(now + note.dur);

      noteIndex = (noteIndex + 1) % melody.length;
    };

    playNote();
    let elapsed = melody[0].dur * 1000;

    const scheduleNext = () => {
      if (this.currentBGMType !== 'boss') return;

      playNote();
      const currentNote = melody[noteIndex === 0 ? melody.length - 1 : noteIndex - 1];
      elapsed += currentNote.dur * 1000;

      if (elapsed >= totalDuration) {
        setTimeout(() => {
          if (this.currentBGMType === 'boss') {
            elapsed = 0;
            noteIndex = 0;
            scheduleNext();
          }
        }, 1000);
      } else {
        setTimeout(scheduleNext, currentNote.dur * 1000);
      }
    };

    setTimeout(scheduleNext, melody[0].dur * 1000);
  }

  public stopBGM(): void {
    this.currentBGMType = '';
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    if (this.currentBGM) {
      try {
        this.currentBGM.stop();
      } catch (e) {}
      this.currentBGM = null;
    }
  }

  public setBGMVolume(volume: number): void {
    this.bgmVolume = Math.max(0, Math.min(1, volume));
    if (this.bgmGainNode) {
      this.bgmGainNode.gain.value = this.bgmVolume;
    }
  }

  public setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    if (this.sfxGainNode) {
      this.sfxGainNode.gain.value = this.sfxVolume;
    }
  }
}
