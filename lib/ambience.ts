import type { Ambience } from "./story";

/**
 * Placeholder score & atmosphere, synthesized live with WebAudio.
 * In the real product this entire engine is replaced by ElevenLabs
 * narration, sound design, and music stems.
 */
export class AmbienceEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseGain: GainNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private droneGain: GainNode | null = null;
  private drone: OscillatorNode | null = null;
  private droneB: OscillatorNode | null = null;

  private ensure() {
    if (this.ctx) return;
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // brown-ish noise loop — the "air" of each scene
    const seconds = 4;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.value = 400;
    noiseFilter.Q.value = 0.6;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0;

    noise.connect(noiseFilter).connect(noiseGain).connect(master);
    noise.start();

    // two detuned sines — the drone that stands in for the score
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0;
    const drone = ctx.createOscillator();
    drone.type = "sine";
    drone.frequency.value = 65;
    const droneB = ctx.createOscillator();
    droneB.type = "sine";
    droneB.frequency.value = 65 * 1.503; // a wide, slightly impure fifth
    const droneBGain = ctx.createGain();
    droneBGain.gain.value = 0.35;
    drone.connect(droneGain);
    droneB.connect(droneBGain).connect(droneGain);
    droneGain.connect(master);
    drone.start();
    droneB.start();

    this.ctx = ctx;
    this.master = master;
    this.noiseGain = noiseGain;
    this.noiseFilter = noiseFilter;
    this.droneGain = droneGain;
    this.drone = drone;
    this.droneB = droneB;
  }

  setScene(a: Ambience) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const ramp = 2.2;
    this.noiseFilter!.frequency.setTargetAtTime(a.noiseHz, t, ramp);
    this.noiseGain!.gain.setTargetAtTime(a.noiseGain, t, ramp);
    this.drone!.frequency.setTargetAtTime(a.droneHz, t, ramp);
    this.droneB!.frequency.setTargetAtTime(a.droneHz * 1.503, t, ramp);
    this.droneGain!.gain.setTargetAtTime(a.droneGain, t, ramp);
  }

  async play(scene: Ambience) {
    this.ensure();
    const ctx = this.ctx!;
    await ctx.resume();
    // the engine may have been disposed while resume() was pending
    if (this.ctx !== ctx) return;
    this.setScene(scene);
    this.master!.gain.setTargetAtTime(1, ctx.currentTime, 0.8);
  }

  /** one teletype key-click */
  tick() {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 1800 + Math.random() * 900;
    g.gain.setValueAtTime(0.028, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.035);
  }

  pause() {
    if (!this.ctx || !this.master) return;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
  }

  dispose() {
    this.ctx?.close();
    this.ctx = null;
  }
}
