"use strict";
/*
 * Illustrative agent-based model of an exit-voice-loyalty decline spiral.
 * Not a validated empirical model; see the epistemic note on the page.
 */

const GRID = 10;
const N = GRID * GRID;
const MAX_HISTORY = 400;

class Simulation {
  constructor(params) {
    this.params = params;
    this.reset();
  }

  reset() {
    const { initialTrust } = this.params;
    this.round = 0;
    this.capacity = 100;
    this.agents = [];
    for (let i = 0; i < N; i++) {
      this.agents.push({
        id: i,
        trust: clamp(gauss(initialTrust, 9), 5, 100),
        outsideDraw: Math.random(),
        loyaltyDraw: Math.random(),
        exited: false,
        lastAction: "none",
      });
    }
    this.history = { capacity: [], avgTrust: [], remaining: [], exits: [], voiceHeard: [], voiceIgnored: [] };
    this.cumExits = 0;
    this.cumVoiceHeard = 0;
    this.cumVoiceIgnored = 0;
    this.spiralRound = null;
    this._record();
  }

  step() {
    const p = this.params;
    this.round++;
    const remaining = this.agents.filter((a) => !a.exited);
    const capFactor = 1 + (1 - this.capacity / 100); // low capacity accelerates decline
    let exitsThisRound = 0;
    let voiceHeardThisRound = 0;
    let voiceIgnoredThisRound = 0;

    for (const a of remaining) {
      a.lastAction = "none";
      // Baseline institutional decline pressure on trust.
      a.trust -= p.declinePressure * capFactor * (0.6 + 0.8 * Math.random());
      a.trust = clamp(a.trust, 0, 100);

      const hasOutsideOption = a.outsideDraw < p.outsideOptions;
      const exitThreshold = 22 + a.loyaltyDraw * 10;
      const voiceThreshold = 45 + a.loyaltyDraw * 15;

      if (a.trust < exitThreshold && hasOutsideOption) {
        a.exited = true;
        a.lastAction = "exit";
        exitsThisRound++;
      } else if (a.trust < voiceThreshold) {
        a.lastAction = "voice";
        if (Math.random() < p.responsiveness) {
          a.trust = clamp(a.trust + 6, 0, 100);
          this.capacity = clamp(this.capacity + 1.2, 0, 100);
          voiceHeardThisRound++;
        } else {
          a.trust = clamp(a.trust - 4, 0, 100);
          voiceIgnoredThisRound++;
        }
      }
    }

    // Each exit permanently removes a slice of self-correcting capacity.
    this.capacity = clamp(this.capacity - exitsThisRound * 1.6, 0, 100);
    // Slow passive capacity drift toward the average trust of who's left.
    const stillHere = this.agents.filter((a) => !a.exited);
    const avgTrust = stillHere.length ? stillHere.reduce((s, a) => s + a.trust, 0) / stillHere.length : 0;
    this.capacity = clamp(this.capacity + (avgTrust - 50) * 0.01, 0, 100);

    this.cumExits += exitsThisRound;
    this.cumVoiceHeard += voiceHeardThisRound;
    this.cumVoiceIgnored += voiceIgnoredThisRound;

    if (this.spiralRound === null && this.capacity < 20 && this.cumExits > N * 0.25) {
      this.spiralRound = this.round;
    }

    this._record();
    return { exitsThisRound, voiceHeardThisRound, voiceIgnoredThisRound };
  }

  _record() {
    const h = this.history;
    const stillHere = this.agents.filter((a) => !a.exited);
    const avgTrust = stillHere.length ? stillHere.reduce((s, a) => s + a.trust, 0) / stillHere.length : 0;
    h.capacity.push(this.capacity);
    h.avgTrust.push(avgTrust);
    h.remaining.push(stillHere.length);
    h.exits.push(this.cumExits);
    h.voiceHeard.push(this.cumVoiceHeard);
    h.voiceIgnored.push(this.cumVoiceIgnored);
    for (const k of Object.keys(h)) {
      if (h[k].length > MAX_HISTORY) h[k].shift();
    }
  }
}

function gauss(mean, sd) {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + z * sd;
}
function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

// ---------- rendering ----------

function hexToRgb(hex) {
  hex = hex.trim().replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  const num = parseInt(hex, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// Colorblind-safe diverging scale (Okabe-Ito orange -> blue) instead of
// a red/green gradient, which is indistinguishable under most forms of
// color vision deficiency.
function trustColor(a, low, high, exitedColor) {
  if (a.exited) return exitedColor;
  const t = a.trust / 100;
  const r = Math.round(low[0] + (high[0] - low[0]) * t);
  const g = Math.round(low[1] + (high[1] - low[1]) * t);
  const b = Math.round(low[2] + (high[2] - low[2]) * t);
  return `rgb(${r},${g},${b})`;
}

function drawAgents(canvas, sim) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const styles = getComputedStyle(document.documentElement);
  const lowRgb = hexToRgb(styles.getPropertyValue("--dot-low"));
  const highRgb = hexToRgb(styles.getPropertyValue("--dot-high"));
  const exitedColor = styles.getPropertyValue("--dot-exited").trim();
  const ringColor = styles.getPropertyValue("--dot-ring").trim();
  const strokeColor = styles.getPropertyValue("--dot-stroke").trim();

  const cell = Math.min(w, h) / GRID;
  const r = cell * 0.32;
  for (const a of sim.agents) {
    const cx = (a.id % GRID) * cell + cell / 2;
    const cy = Math.floor(a.id / GRID) * cell + cell / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, a.exited ? r * 0.55 : r, 0, Math.PI * 2);
    ctx.fillStyle = trustColor(a, lowRgb, highRgb, exitedColor);
    ctx.globalAlpha = a.exited ? 0.45 : 1;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = strokeColor;
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (a.lastAction === "voice") {
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.35, 0, Math.PI * 2);
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
  }
}

function drawChart(canvas, sim) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const pad = { l: 34, r: 8, t: 10, b: 20 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;
  const styles = getComputedStyle(document.documentElement);
  const border = styles.getPropertyValue("--border").trim();
  const muted = styles.getPropertyValue("--text-muted").trim();
  const chart2 = styles.getPropertyValue("--chart-2").trim();
  const dotHigh = styles.getPropertyValue("--dot-high").trim();

  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, pad.t + plotH);
  ctx.lineTo(pad.l + plotW, pad.t + plotH);
  ctx.stroke();

  ctx.fillStyle = muted;
  ctx.font = "11px sans-serif";
  ctx.fillText("100", 2, pad.t + 4);
  ctx.fillText("0", 10, pad.t + plotH + 4);

  // Dash pattern is a second, non-color encoding for the two series,
  // so the lines stay distinguishable independent of color vision.
  const series = [
    { key: "capacity", color: chart2, max: 100, dash: [] },
    { key: "avgTrust", color: dotHigh, max: 100, dash: [6, 4] },
  ];
  const n = sim.history.capacity.length;
  if (n < 2) return;
  const xFor = (i) => pad.l + (i / Math.max(n - 1, 1)) * plotW;

  for (const s of series) {
    const data = sim.history[s.key];
    ctx.beginPath();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2.5;
    ctx.setLineDash(s.dash);
    for (let i = 0; i < data.length; i++) {
      const x = xFor(i);
      const y = pad.t + plotH - (data[i] / s.max) * plotH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

// ---------- wiring ----------

window.addEventListener("DOMContentLoaded", () => {
  const agentsCanvas = document.getElementById("agents-canvas");
  const chartCanvas = document.getElementById("chart-canvas");

  const sliders = {
    declinePressure: document.getElementById("declinePressure"),
    responsiveness: document.getElementById("responsiveness"),
    outsideOptions: document.getElementById("outsideOptions"),
    initialTrust: document.getElementById("initialTrust"),
  };
  const outputs = {
    declinePressure: document.getElementById("declinePressure-out"),
    responsiveness: document.getElementById("responsiveness-out"),
    outsideOptions: document.getElementById("outsideOptions-out"),
    initialTrust: document.getElementById("initialTrust-out"),
  };

  function readParams() {
    return {
      declinePressure: parseFloat(sliders.declinePressure.value),
      responsiveness: parseFloat(sliders.responsiveness.value),
      outsideOptions: parseFloat(sliders.outsideOptions.value),
      initialTrust: parseFloat(sliders.initialTrust.value),
    };
  }

  function syncOutputs() {
    outputs.declinePressure.textContent = sliders.declinePressure.value;
    outputs.responsiveness.textContent = Math.round(sliders.responsiveness.value * 100) + "%";
    outputs.outsideOptions.textContent = Math.round(sliders.outsideOptions.value * 100) + "%";
    outputs.initialTrust.textContent = sliders.initialTrust.value;
  }

  let sim = new Simulation(readParams());
  let running = false;
  let timer = null;

  const roundEl = document.getElementById("stat-round");
  const capEl = document.getElementById("stat-capacity");
  const remainEl = document.getElementById("stat-remaining");
  const exitsEl = document.getElementById("stat-exits");
  const spiralBanner = document.getElementById("spiral-banner");
  const playBtn = document.getElementById("play-btn");
  const resetBtn = document.getElementById("reset-btn");
  const speedSelect = document.getElementById("speed-select");

  function render() {
    drawAgents(agentsCanvas, sim);
    drawChart(chartCanvas, sim);
    roundEl.textContent = sim.round;
    capEl.textContent = Math.round(sim.capacity);
    remainEl.textContent = sim.agents.filter((a) => !a.exited).length + " / " + N;
    exitsEl.textContent = sim.cumExits;
    if (sim.spiralRound !== null) {
      spiralBanner.hidden = false;
      spiralBanner.textContent =
        `Spiral reached at round ${sim.spiralRound}: exits have outpaced the institution's capacity to recover.`;
    } else {
      spiralBanner.hidden = true;
    }
  }

  function tick() {
    sim.step();
    render();
    const alive = sim.agents.some((a) => !a.exited);
    if (sim.round >= MAX_HISTORY - 1 || !alive) {
      stop();
    }
  }

  function speedMs() {
    return { slow: 500, normal: 220, fast: 70 }[speedSelect.value] || 220;
  }

  function start() {
    running = true;
    playBtn.textContent = "Pause";
    timer = setInterval(tick, speedMs());
  }
  function stop() {
    running = false;
    playBtn.textContent = "Run";
    clearInterval(timer);
  }

  playBtn.addEventListener("click", () => (running ? stop() : start()));
  resetBtn.addEventListener("click", () => {
    stop();
    sim = new Simulation(readParams());
    render();
  });
  speedSelect.addEventListener("change", () => {
    if (running) { stop(); start(); }
  });
  for (const key of Object.keys(sliders)) {
    sliders[key].addEventListener("input", () => {
      syncOutputs();
      sim.params = readParams();
    });
  }

  syncOutputs();
  render();
  window.addEventListener("resize", render);
});
