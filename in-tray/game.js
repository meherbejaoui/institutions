"use strict";
/*
 * The In-Tray: a playable model of deferral incentives.
 * All dossiers below are synthetic/illustrative, not drawn from real case files.
 * Hidden payoff structure by design: the player discovers it by playing.
 */

const TEMPLATES = [
  { id: "t1", title: "Operating permit renewal", summary: "The facility's cooling system readings deviate from the 2019 technical spec by 4%. Everything else in the file is complete." },
  { id: "t2", title: "Staffing determination", summary: "The proposed grade for a technical advisor role sits one step above the ceiling listed on the salary scale for that position family." },
  { id: "t3", title: "Subsidy disbursement", summary: "The beneficiary's declared production figures run 9% above the auditor's spot-check from last quarter." },
  { id: "t4", title: "Procurement file", summary: "The winning bid arrived four hours after the posted submission deadline. It is the lowest-cost compliant bid received." },
  { id: "t5", title: "Environmental compliance certificate", summary: "The emissions monitoring report has a three-month gap in the data, attributed to an equipment fault by the operator." },
  { id: "t6", title: "Land-use exception", summary: "The proposed use conflicts with a zoning clause last updated in 2016, though the surrounding parcels have since changed use." },
  { id: "t7", title: "Pension file", summary: "The years-of-service count is disputed by two days across two personnel records held by different departments." },
  { id: "t8", title: "Import license", summary: "The declared tariff code does not exactly match the accompanying technical datasheet, though both point to the same product family." },
  { id: "t9", title: "Grant renewal", summary: "The prior-year interim report was filed eleven days after the deadline, with a short explanation attached." },
  { id: "t10", title: "Concession transfer", summary: "The buyer's financial guarantee is denominated in a currency the concession contract does not explicitly list." },
];

const ROUNDS = 16;
const BASE_BLAME_P = 0.16;
const BLAME_P_PER_CYCLE = 0.05;
const BLAME_PENALTY = 18;
const BACKLOG_DRAG_PER_ROUND = 0.35;

class InTrayGame {
  constructor() {
    this.round = 0;
    this.careerScore = 100;
    this.backlogCount = 0;
    this.pendingCount = 0;
    this.clearedCount = 0;
    this.newPool = shuffle(TEMPLATES.map((t) => t.id));
    this.reissueQueue = []; // {templateId, cycle, dueRound}
    this.chains = {}; // templateId -> {cycle, firstRound, history:[{round, action}], resolved}
    this.log = [];
    this.current = null;
    this.over = false;
    this.usedTemplateOnce = new Set();
  }

  nextDossier() {
    if (this.round >= ROUNDS && this.reissueQueue.every((r) => r.dueRound > this.round)) {
      this.over = true;
      this.current = null;
      return null;
    }
    this.round++;
    if (this.round > ROUNDS * 2) { // hard safety stop
      this.over = true;
      this.current = null;
      return null;
    }

    // Due reissue takes priority.
    const dueIdx = this.reissueQueue.findIndex((r) => r.dueRound <= this.round);
    if (dueIdx !== -1) {
      const item = this.reissueQueue.splice(dueIdx, 1)[0];
      this.current = { templateId: item.templateId, cycle: item.cycle, isReissue: true };
      return this.current;
    }

    if (this.newPool.length > 0) {
      const templateId = this.newPool.shift();
      this.chains[templateId] = { cycle: 0, firstRound: this.round, history: [], resolved: false };
      this.usedTemplateOnce.add(templateId);
      this.current = { templateId, cycle: 0, isReissue: false };
      return this.current;
    }

    if (this.reissueQueue.length > 0) {
      // Nothing due yet but session still has budget: pull the earliest scheduled one early.
      this.reissueQueue.sort((a, b) => a.dueRound - b.dueRound);
      const item = this.reissueQueue.shift();
      this.current = { templateId: item.templateId, cycle: item.cycle, isReissue: true };
      return this.current;
    }

    if (this.round <= ROUNDS) return this.nextDossier();
    this.over = true;
    this.current = null;
    return null;
  }

  decide(action) {
    if (!this.current) return null;
    const { templateId } = this.current;
    const chain = this.chains[templateId];
    chain.history.push({ round: this.round, action });
    let event = null;

    if (action === "approve") {
      const p = Math.min(0.55, BASE_BLAME_P + BLAME_P_PER_CYCLE * chain.cycle);
      const blamed = Math.random() < p;
      chain.resolved = true;
      chain.resolvedRound = this.round;
      chain.blamed = blamed;
      this.clearedCount++;
      if (blamed) {
        this.careerScore -= BLAME_PENALTY;
        event = { type: "blame", templateId };
      }
    } else if (action === "refuse") {
      chain.cycle++;
      this.backlogCount++;
      const dueRound = this.round + 3 + Math.floor(Math.random() * 4); // +3..+6
      this.reissueQueue.push({ templateId, cycle: chain.cycle, dueRound });
    } else if (action === "request_docs") {
      chain.cycle++;
      this.pendingCount++;
      const dueRound = this.round + 2 + Math.floor(Math.random() * 3); // +2..+4
      this.reissueQueue.push({ templateId, cycle: chain.cycle, dueRound });
    }

    this.careerScore -= this.backlogCount * BACKLOG_DRAG_PER_ROUND * 0.15;
    this.careerScore = Math.max(0, Math.round(this.careerScore * 100) / 100);
    this.current = null;
    return event;
  }

  openChains() {
    return Object.entries(this.chains).filter(([, c]) => !c.resolved);
  }

  clearedChains() {
    return Object.entries(this.chains).filter(([, c]) => c.resolved);
  }

  longestChains(n) {
    return Object.entries(this.chains)
      .sort((a, b) => b[1].cycle - a[1].cycle)
      .slice(0, n);
  }
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function templateById(id) {
  return TEMPLATES.find((t) => t.id === id);
}

function actionLabel(a) {
  return { approve: "Approved", refuse: "Refused", request_docs: "Requested further documents" }[a] || a;
}

// ---------- UI wiring ----------

window.addEventListener("DOMContentLoaded", () => {
  const startScreen = document.getElementById("screen-start");
  const playScreen = document.getElementById("screen-play");
  const debriefScreen = document.getElementById("screen-debrief");

  const startBtn = document.getElementById("start-btn");
  const dossierTitle = document.getElementById("dossier-title");
  const dossierMeta = document.getElementById("dossier-meta");
  const dossierSummary = document.getElementById("dossier-summary");
  const roundEl = document.getElementById("play-round");
  const scoreEl = document.getElementById("play-score");
  const backlogEl = document.getElementById("play-backlog");
  const pendingEl = document.getElementById("play-pending");
  const toast = document.getElementById("toast");

  let game = null;

  function showDossier() {
    const d = game.current;
    if (!d) return finish();
    const t = templateById(d.templateId);
    dossierTitle.textContent = t.title;
    dossierMeta.textContent = d.isReissue
      ? `Reissue, cycle ${d.cycle}, round ${game.round} of ~${ROUNDS}`
      : `New, round ${game.round} of ~${ROUNDS}`;
    dossierSummary.textContent = t.summary;
    updateStats();
  }

  function updateStats() {
    roundEl.textContent = Math.min(game.round, ROUNDS);
    scoreEl.textContent = Math.round(game.careerScore);
    backlogEl.textContent = game.backlogCount;
    pendingEl.textContent = game.pendingCount;
  }

  function flashToast(msg) {
    toast.textContent = msg;
    toast.hidden = false;
    clearTimeout(flashToast._t);
    flashToast._t = setTimeout(() => (toast.hidden = true), 2600);
  }

  function act(action) {
    const templateId = game.current.templateId;
    const event = game.decide(action);
    if (event && event.type === "blame") {
      flashToast(`Audit note: the "${templateById(templateId).title}" file you approved was flagged. Career score −${BLAME_PENALTY}.`);
    }
    game.nextDossier();
    if (game.over) { finish(); return; }
    showDossier();
  }

  document.getElementById("btn-approve").addEventListener("click", () => act("approve"));
  document.getElementById("btn-refuse").addEventListener("click", () => act("refuse"));
  document.getElementById("btn-docs").addEventListener("click", () => act("request_docs"));

  startBtn.addEventListener("click", () => {
    game = new InTrayGame();
    game.nextDossier();
    startScreen.hidden = true;
    playScreen.hidden = false;
    showDossier();
  });

  function finish() {
    playScreen.hidden = true;
    debriefScreen.hidden = false;
    renderDebrief();
  }

  function renderDebrief() {
    document.getElementById("d-score").textContent = Math.round(game.careerScore);
    document.getElementById("d-cleared").textContent = game.clearedCount;
    document.getElementById("d-open").textContent = game.openChains().length;
    document.getElementById("d-backlog").textContent = game.backlogCount;
    document.getElementById("d-pending").textContent = game.pendingCount;
    const blamed = Object.values(game.chains).filter((c) => c.blamed).length;
    document.getElementById("d-blamed").textContent = blamed;

    // Longest chain timelines
    const timelineWrap = document.getElementById("d-timelines");
    timelineWrap.innerHTML = "";
    const longest = game.longestChains(2).filter(([, c]) => c.history.length > 0);
    if (longest.length === 0) {
      timelineWrap.innerHTML = "<p><em>No file in this session was deferred more than once: you approved early and often. Play again and try leaning on Refuse or Request Documents to see a chain form.</em></p>";
    }
    for (const [templateId, chain] of longest) {
      const t = templateById(templateId);
      const el = document.createElement("div");
      el.className = "card";
      const steps = chain.history.map((h) => `<div class="tl-step"><span class="tl-round">Round ${h.round}</span><span class="tl-action">${actionLabel(h.action)}</span></div><span class="tl-arrow">&rarr;</span>`).join("");
      const finalStep = chain.resolved
        ? `<div class="tl-step tl-final"><span class="tl-round">Round ${chain.resolvedRound}</span><span class="tl-action">${chain.blamed ? "Approved, later flagged" : "Approved, cleared"}</span></div>`
        : `<div class="tl-step tl-open"><span class="tl-round">&ndash;</span><span class="tl-action">Still open at session end</span></div>`;
      el.innerHTML = `<h3 style="margin-top:0">${t.title}</h3><div class="timeline">${steps}${finalStep}</div>`;
      timelineWrap.appendChild(el);
    }

    // Survival-style chart: rounds-to-clear for cleared files
    const chartCanvas = document.getElementById("d-chart");
    drawDurationChart(chartCanvas, game.clearedChains().map(([, c]) => c.resolvedRound - c.firstRound));
  }

  document.getElementById("replay-btn").addEventListener("click", () => {
    debriefScreen.hidden = true;
    startScreen.hidden = false;
  });
});

function drawDurationChart(canvas, durations) {
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const styles = getComputedStyle(document.documentElement);
  const border = styles.getPropertyValue("--border").trim();
  const accent = styles.getPropertyValue("--accent").trim();
  const muted = styles.getPropertyValue("--text-muted").trim();

  const pad = { l: 30, r: 10, t: 10, b: 24 };
  const plotW = w - pad.l - pad.r;
  const plotH = h - pad.t - pad.b;

  ctx.strokeStyle = border;
  ctx.beginPath();
  ctx.moveTo(pad.l, pad.t);
  ctx.lineTo(pad.l, pad.t + plotH);
  ctx.lineTo(pad.l + plotW, pad.t + plotH);
  ctx.stroke();

  if (durations.length === 0) {
    ctx.fillStyle = muted;
    ctx.font = "12px sans-serif";
    ctx.fillText("No cleared files this session.", pad.l + 8, pad.t + plotH / 2);
    return;
  }

  const maxD = Math.max(...durations, 1);
  const buckets = maxD + 1;
  const counts = new Array(buckets).fill(0);
  durations.forEach((d) => counts[d]++);
  const maxCount = Math.max(...counts, 1);
  const barW = plotW / buckets;

  ctx.fillStyle = accent;
  counts.forEach((c, i) => {
    const bh = (c / maxCount) * plotH;
    ctx.fillRect(pad.l + i * barW + 2, pad.t + plotH - bh, Math.max(barW - 4, 2), bh);
  });

  ctx.fillStyle = muted;
  ctx.font = "11px sans-serif";
  ctx.fillText("0", pad.l - 2, pad.t + plotH + 14);
  ctx.fillText(String(maxD) + " rounds", pad.l + plotW - 50, pad.t + plotH + 14);
}
