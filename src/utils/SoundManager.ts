/**
 * SoundManager - Web Audio API 기반 프로시저럴 사운드
 * 외부 파일 없이 코드로 효과음 생성
 */
export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume: number = 0.3;

  constructor() {
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.volume;
      this.masterGain.connect(this.ctx.destination);
    } catch {
      console.warn('Web Audio API not available');
    }
  }

  private ensureContext(): boolean {
    if (!this.ctx || !this.masterGain) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'sine', vol: number = 0.2, detune: number = 0): void {
    if (!this.ensureContext()) return;
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    gain.gain.setValueAtTime(vol, this.ctx!.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start();
    osc.stop(this.ctx!.currentTime + duration);
  }

  private playNoise(duration: number, vol: number = 0.1): void {
    if (!this.ensureContext()) return;
    const bufferSize = this.ctx!.sampleRate * duration;
    const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * vol;
    }
    const source = this.ctx!.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx!.createGain();
    gain.gain.setValueAtTime(vol, this.ctx!.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx!.currentTime + duration);
    source.connect(gain);
    gain.connect(this.masterGain!);
    source.start();
  }

  // 파이어볼 발사
  playFireball(): void {
    this.playTone(200, 0.3, 'sawtooth', 0.15);
    this.playTone(150, 0.4, 'sine', 0.1, -10);
    this.playNoise(0.15, 0.08);
  }

  // 파이어볼 폭발
  playFireballExplosion(): void {
    this.playNoise(0.3, 0.2);
    this.playTone(80, 0.4, 'sine', 0.15);
    this.playTone(60, 0.5, 'triangle', 0.1);
  }

  // 다크 스파이크 낙하
  playDarkSpike(): void {
    this.playTone(400, 0.15, 'square', 0.1);
    this.playTone(150, 0.3, 'sawtooth', 0.12);
    this.playNoise(0.1, 0.06);
  }

  // 다크 스파이크 착지
  playDarkSpikeImpact(): void {
    this.playTone(60, 0.3, 'sine', 0.2);
    this.playNoise(0.15, 0.12);
  }

  // 다크 메테오 시전
  playDarkMeteorCast(): void {
    this.playTone(100, 0.8, 'sawtooth', 0.1);
    this.playTone(80, 1.0, 'sine', 0.08);
  }

  // 메테오 충돌
  playMeteorImpact(): void {
    this.playNoise(0.4, 0.25);
    this.playTone(40, 0.5, 'sine', 0.2);
    this.playTone(55, 0.4, 'triangle', 0.12);
  }

  // 뼈가시
  playBoneSpike(): void {
    this.playTone(300, 0.12, 'square', 0.08);
    this.playTone(120, 0.2, 'sawtooth', 0.1);
  }

  // 시체 폭탄 폭발
  playCorpseBomb(): void {
    this.playNoise(0.5, 0.2);
    this.playTone(50, 0.6, 'sine', 0.18);
    this.playTone(70, 0.4, 'triangle', 0.1);
  }

  // 죽음의 파동
  playDeathWave(): void {
    this.playTone(60, 0.8, 'sine', 0.15);
    this.playTone(90, 0.6, 'sawtooth', 0.1);
    this.playNoise(0.3, 0.1);
  }

  // 보호막
  playShield(): void {
    this.playTone(500, 0.3, 'sine', 0.1);
    this.playTone(600, 0.25, 'sine', 0.08);
  }

  // 저주
  playCurse(): void {
    this.playTone(180, 0.4, 'sawtooth', 0.1);
    this.playTone(120, 0.5, 'sine', 0.08);
  }

  // 영혼 흡수
  playSoulDrain(): void {
    this.playTone(250, 0.3, 'sine', 0.1);
    this.playTone(350, 0.25, 'triangle', 0.08);
  }

  // 보스 공격
  playBossAttack(): void {
    this.playNoise(0.2, 0.15);
    this.playTone(70, 0.4, 'sawtooth', 0.12);
  }

  // 보스 각성
  playBossAwaken(): void {
    this.playTone(80, 1.0, 'sawtooth', 0.15);
    this.playTone(100, 0.8, 'sine', 0.12);
    this.playTone(60, 1.2, 'triangle', 0.1);
    this.playNoise(0.5, 0.1);
  }

  // 플레이어 피격
  playPlayerHit(): void {
    this.playNoise(0.1, 0.12);
    this.playTone(200, 0.15, 'square', 0.08);
  }

  // 플레이어 사망
  playPlayerDeath(): void {
    this.playTone(300, 0.2, 'sine', 0.12);
    this.playTone(200, 0.3, 'sine', 0.1);
    this.playTone(100, 0.5, 'sine', 0.08);
  }

  // 레벨업
  playLevelUp(): void {
    this.playTone(400, 0.15, 'sine', 0.1);
    setTimeout(() => this.playTone(500, 0.15, 'sine', 0.1), 100);
    setTimeout(() => this.playTone(600, 0.2, 'sine', 0.12), 200);
  }

  // 대쉬
  playDash(): void {
    this.playNoise(0.08, 0.1);
    this.playTone(300, 0.1, 'sine', 0.06);
  }

  // 몬스터 사망
  playMonsterDeath(): void {
    this.playTone(150, 0.2, 'sawtooth', 0.08);
    this.playNoise(0.1, 0.06);
  }

  // 점프
  playJump(): void {
    this.playTone(250, 0.1, 'sine', 0.06);
  }
}
