/* ═══════════════════════════════════════════════════════════════
   RestroFlow — Restaurant Order & Kitchen Workflow System
   Vanilla JavaScript (ES6+) — Ultra-Luxury State-Driven Engine
   ═══════════════════════════════════════════════════════════════ */

"use strict";

// ─── UTILITY HELPERS ───
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const formatCurrency = (n) => `₹${Number(n || 0).toFixed(2)}`;
const genId = () => "ORD-" + Math.random().toString(36).substring(2, 8).toUpperCase();

const timeAgo = (ts) => {
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m ago`;
};

const formatDate = (ts) => {
  const d = new Date(ts);
  return (
    d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
  );
};

// ═══════════════════ WEB AUDIO SOUND SYNTHESIZER ═══════════════════
// Pure vanilla Web Audio API synthesis — zero external dependencies
const SoundSynth = {
  ctx: null,
  enabled: true,

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  },

  toggle() {
    this.enabled = !this.enabled;
    const btn = $("#sound-toggle");
    const icon = $("#sound-icon");
    const label = $("#sound-label");
    if (btn) btn.classList.toggle("muted", !this.enabled);
    if (icon) icon.textContent = this.enabled ? "🔔" : "🔕";
    if (label) label.textContent = this.enabled ? "Audio On" : "Muted";
    showToast(this.enabled ? "Sound effects enabled 🔔" : "Sound muted 🔕", "info");
    if (this.enabled) this.playTap();
  },

  playTone(freq, type, duration, startGain = 0.15, endGain = 0.001) {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(startGain, now);
      gain.gain.exponentialRampToValueAtTime(endGain, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      // AudioContext policy suppression gracefully handled
    }
  },

  // Soft tactile acoustic tap when selecting table or clicking filters
  playTap() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = "sine";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.06);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } catch (e) {}
  },

  // Soft tactile micro-click for buttons & steppers
  playClick() {
    this.playTone(600, "triangle", 0.04, 0.08);
  },

  // Melodic ascending harmonic chime when adding item to ticket
  playItemAdded() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.07);
        gain.gain.setValueAtTime(0.1, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.22);
      });
    } catch (e) {}
  },

  // Warm culinary flourish when sending order to kitchen
  playOrderSent() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [440, 554.37, 659.25, 880].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.12, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.35);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.35);
      });
    } catch (e) {}
  },

  // Classic brass kitchen service bell (Ding! 🛎️)
  playBell() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      // Fundamental + bright overtone
      [1760, 2640].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now);
        const startG = idx === 0 ? 0.22 : 0.08;
        gain.gain.setValueAtTime(startG, now);
        gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.9);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.9);
      });
    } catch (e) {}
  },

  // Celebratory luxury coin / gold chime on bill settlement
  playSettleCash() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const chord = [587.33, 739.99, 880.0, 1174.66]; // D Major bright
      chord.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.14, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.5);
      });
    } catch (e) {}
  },
};

// ═══════════════════ AMBIENT PARTICLES CANVAS ═══════════════════
const AmbientEngine = {
  canvas: null,
  ctx: null,
  particles: [],
  width: 0,
  height: 0,
  mouseX: -1000,
  mouseY: -1000,
  animId: null,

  init() {
    this.canvas = $("#ambient-canvas");
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");
    this.resize();

    window.addEventListener("resize", () => this.resize());
    window.addEventListener("mousemove", (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });

    const count = Math.min(50, Math.floor((this.width * this.height) / 30000));
    this.particles = Array.from({ length: count }, () => this.createParticle());
    this.loop();
  },

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
  },

  createParticle(randomY = true) {
    return {
      x: Math.random() * this.width,
      y: randomY ? Math.random() * this.height : this.height + 10,
      radius: Math.random() * 2.2 + 0.8,
      speedY: Math.random() * 0.35 + 0.15,
      speedX: (Math.random() - 0.5) * 0.25,
      alpha: Math.random() * 0.5 + 0.2,
      pulse: Math.random() * 0.02 + 0.01,
      angle: Math.random() * Math.PI * 2,
    };
  },

  loop() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.y -= p.speedY;
      p.angle += 0.02;
      p.x += Math.sin(p.angle) * 0.3 + p.speedX;

      // Mouse gentle repulsion
      const dx = p.x - this.mouseX;
      const dy = p.y - this.mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 100) {
        p.x += (dx / dist) * 1.5;
        p.y += (dy / dist) * 1.5;
      }

      p.alpha += Math.sin(p.angle) * 0.005;
      if (p.alpha < 0.1) p.alpha = 0.1;
      if (p.alpha > 0.6) p.alpha = 0.6;

      if (p.y < -10 || p.x < -20 || p.x > this.width + 20) {
        this.particles[i] = this.createParticle(false);
      }

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(91, 140, 90, ${p.alpha})`;
      this.ctx.shadowColor = "rgba(91, 140, 90, 0.3)";
      this.ctx.shadowBlur = p.radius * 3;
      this.ctx.fill();
      this.ctx.restore();
    }

    this.animId = requestAnimationFrame(() => this.loop());
  },
};

// ═══════════════════ CONFETTI ENGINE ═══════════════════
const ConfettiEngine = {
  canvas: null,
  ctx: null,
  pieces: [],
  animating: false,

  init() {
    this.canvas = $("#confetti-canvas");
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");
    this.resize();
    window.addEventListener("resize", () => this.resize());
  },

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  burst(originX, originY) {
    this.resize();
    const colors = ["#5b8c5a", "#f0efe8", "#4d9088", "#8b6cad", "#c4b99a", "#5a7fa3"];
    const count = 90;
    const ox = originX || window.innerWidth / 2;
    const oy = originY || window.innerHeight / 2;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = Math.random() * 12 + 6;
      this.pieces.push({
        x: ox,
        y: oy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 4,
        size: Math.random() * 7 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10,
        tiltAngle: 0,
        tiltSpeed: Math.random() * 0.1 + 0.05,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        gravity: 0.28,
        friction: 0.97,
        alpha: 1,
      });
    }

    if (!this.animating) {
      this.animating = true;
      this.animate();
    }
  },

  animate() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const p = this.pieces[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= p.friction;
      p.vy *= p.friction;
      p.vy += p.gravity;
      p.tiltAngle += p.tiltSpeed;
      p.tilt = Math.sin(p.tiltAngle) * 12;
      p.rotation += p.rotationSpeed;
      p.alpha -= 0.012;

      if (p.alpha <= 0 || p.y > this.canvas.height + 20) {
        this.pieces.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size + p.tilt, p.size * 0.6);
      this.ctx.restore();
    }

    if (this.pieces.length > 0) {
      requestAnimationFrame(() => this.animate());
    } else {
      this.animating = false;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  },
};

// ─── CURATED DIGITAL MENU DATA ───
const MENU = [
  // Starters
  { id: "s1", name: "Paneer Tikka Royale", price: 249, category: "Starters", emoji: "🧀" },
  { id: "s2", name: "Crispy Pepper Wings", price: 299, category: "Starters", emoji: "🍗" },
  { id: "s3", name: "Golden Calamari", price: 349, category: "Starters", emoji: "🦑" },
  { id: "s4", name: "Truffle Spring Rolls", price: 199, category: "Starters", emoji: "🥟" },
  // Mains
  { id: "m1", name: "Butter Chicken Velvet", price: 399, category: "Mains", emoji: "🍛" },
  { id: "m2", name: "Grilled Herb Salmon", price: 599, category: "Mains", emoji: "🐟" },
  { id: "m3", name: "Artisanal Margherita", price: 449, category: "Mains", emoji: "🍕" },
  { id: "m4", name: "Nawabi Lamb Biryani", price: 499, category: "Mains", emoji: "🍚" },
  // Drinks
  { id: "d1", name: "Saffron Mango Lassi", price: 129, category: "Drinks", emoji: "🥭" },
  { id: "d2", name: "Vanilla Cold Brew", price: 149, category: "Drinks", emoji: "☕" },
  { id: "d3", name: "Sparkling Mint Lime", price: 99, category: "Drinks", emoji: "🍋" },
  { id: "d4", name: "Royal Masala Chai", price: 79, category: "Drinks", emoji: "🍵" },
  // Desserts
  { id: "de1", name: "Warm Gulab Jamun", price: 149, category: "Desserts", emoji: "🟤" },
  { id: "de2", name: "Belgian Lava Gateau", price: 249, category: "Desserts", emoji: "🍫" },
  { id: "de3", name: "Pistachio Rasmalai", price: 179, category: "Desserts", emoji: "🍮" },
  { id: "de4", name: "Berry Crème Sundae", price: 199, category: "Desserts", emoji: "🍨" },
];

const CATEGORIES = [...new Set(MENU.map((i) => i.category))];
const TAX_RATE = 0.05; // 5% GST
const SERVICE_RATE = 0.1; // 10% Service Charge

// ═══════════════════ APPLICATION STATE ═══════════════════
const state = {
  tables: Array.from({ length: 8 }, (_, i) => ({
    id: i + 1,
    status: "available", // available | ordering | preparing | ready | served
    currentOrderId: null,
  })),
  orders: {}, // orderId -> order object
  draftItems: {}, // tableId -> [ items ]
  history: [],
  selectedTable: null,
  activeMenuCategory: "Starters",
  serviceChargeEnabled: {}, // orderId -> bool
  tableFilter: "all", // all | available | preparing | ready | served
  kdsFilter: "all", // all | queued | in-preparation | ready
};

// ─── PRE-LOADED DEMO DATA ───
function seedDemoData() {
  const now = Date.now();

  // Order 1 — Table 2, Queued
  const o1 = genId();
  state.orders[o1] = {
    id: o1,
    tableId: 2,
    items: [
      {
        menuId: "s1",
        name: "Paneer Tikka Royale",
        price: 249,
        qty: 2,
        spice: "Medium",
        extras: ["Extra Cheese"],
        notes: "Garnish with fresh coriander",
        emoji: "🧀",
      },
      {
        menuId: "d1",
        name: "Saffron Mango Lassi",
        price: 129,
        qty: 1,
        spice: "Mild",
        extras: [],
        notes: "Less sweet please",
        emoji: "🥭",
      },
    ],
    status: "queued",
    createdAt: now - 8 * 60000,
  };
  state.tables[1].status = "preparing";
  state.tables[1].currentOrderId = o1;

  // Order 2 — Table 5, In Preparation
  const o2 = genId();
  state.orders[o2] = {
    id: o2,
    tableId: 5,
    items: [
      {
        menuId: "m1",
        name: "Butter Chicken Velvet",
        price: 399,
        qty: 1,
        spice: "Hot",
        extras: ["No Onions"],
        notes: "Chef alert: Peanut allergy!",
        emoji: "🍛",
      },
      {
        menuId: "m4",
        name: "Nawabi Lamb Biryani",
        price: 499,
        qty: 1,
        spice: "Medium",
        extras: [],
        notes: "Serve with double raita",
        emoji: "🍚",
      },
      {
        menuId: "d3",
        name: "Sparkling Mint Lime",
        price: 99,
        qty: 2,
        spice: "Mild",
        extras: ["Less Ice"],
        notes: "",
        emoji: "🍋",
      },
    ],
    status: "in-preparation",
    createdAt: now - 16 * 60000,
  };
  state.tables[4].status = "preparing";
  state.tables[4].currentOrderId = o2;

  // Order 3 — Table 7, Served (ready for guest billing)
  const o3 = genId();
  state.orders[o3] = {
    id: o3,
    tableId: 7,
    items: [
      {
        menuId: "m3",
        name: "Artisanal Margherita",
        price: 449,
        qty: 1,
        spice: "Mild",
        extras: ["Extra Cheese", "Gluten-Free"],
        notes: "Crispy crust",
        emoji: "🍕",
      },
      {
        menuId: "de2",
        name: "Belgian Lava Gateau",
        price: 249,
        qty: 2,
        spice: "Mild",
        extras: [],
        notes: "Extra warm chocolate sauce",
        emoji: "🍫",
      },
      {
        menuId: "d2",
        name: "Vanilla Cold Brew",
        price: 149,
        qty: 1,
        spice: "Mild",
        extras: [],
        notes: "",
        emoji: "☕",
      },
    ],
    status: "served",
    createdAt: now - 38 * 60000,
  };
  state.tables[6].status = "served";
  state.tables[6].currentOrderId = o3;

  // Initial Completed Order History records
  state.history = [
    {
      id: "ORD-HIST01",
      tableId: 3,
      items: [
        { name: "Crispy Pepper Wings", qty: 2, price: 299 },
        { name: "Royal Masala Chai", qty: 2, price: 79 },
      ],
      total: 835.8,
      completedAt: now - 2 * 3600000,
      status: "completed",
    },
    {
      id: "ORD-HIST02",
      tableId: 1,
      items: [
        { name: "Grilled Herb Salmon", qty: 1, price: 599 },
        { name: "Berry Crème Sundae", qty: 1, price: 199 },
      ],
      total: 922.53,
      completedAt: now - 4.5 * 3600000,
      status: "completed",
    },
  ];

  // Default selection to Table 1 for immediate live interactivity
  state.selectedTable = 1;
  state.tables[0].status = "ordering";
  state.draftItems[1] = [];
}

// ═══════════════════ TOAST NOTIFICATION SYSTEM ═══════════════════
function showToast(message, type = "info") {
  const container = $("#toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  const iconMap = {
    success: "✨",
    info: "ℹ️",
    warn: "⚠️",
    error: "❌",
  };
  const iconSpan = document.createElement("span");
  iconSpan.textContent = iconMap[type] || "•";

  const textSpan = document.createElement("span");
  textSpan.textContent = message;

  toast.appendChild(iconSpan);
  toast.appendChild(textSpan);
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("removing");
    setTimeout(() => toast.remove(), 280);
  }, 3200);
}

// ═══════════════════ LIVE HEADER CLOCK ═══════════════════
function updateClock() {
  const clockEl = $("#header-clock");
  if (!clockEl) return;
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ═══════════════════ TOP NAVIGATION ═══════════════════
function initNav() {
  $$(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      SoundSynth.playClick();
      window.location.hash = btn.dataset.view;
      switchToView(btn.dataset.view);
    });
  });

  window.addEventListener("hashchange", () => {
    const view = window.location.hash.replace("#", "");
    if (["tables", "kitchen", "bills", "history"].includes(view)) {
      switchToView(view);
    }
  });

  const initialView = window.location.hash.replace("#", "");
  if (["tables", "kitchen", "bills", "history"].includes(initialView)) {
    switchToView(initialView);
  }

  const soundBtn = $("#sound-toggle");
  if (soundBtn) {
    soundBtn.addEventListener("click", () => SoundSynth.toggle());
  }
}

function switchToView(viewName) {
  $$(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.view === viewName));
  $$(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${viewName}`));
  render();
}

// ═══════════════════ MASTER RENDER ═══════════════════
function render() {
  updateNavBadges();
  renderTables();
  renderMenu();
  renderTicket();
  renderKDS();
  renderBills();
  renderHistory();
}

function updateNavBadges() {
  // KDS active count
  const kdsCount = Object.values(state.orders).filter(
    (o) => o.status === "queued" || o.status === "in-preparation" || o.status === "ready"
  ).length;
  const kdsBadge = $("#nav-kds-badge");
  if (kdsBadge) {
    kdsBadge.textContent = kdsCount;
    kdsBadge.classList.toggle("zero", kdsCount === 0);
  }

  // Bills awaiting checkout count
  const billsCount = Object.values(state.orders).filter((o) => o.status === "served").length;
  const billsBadge = $("#nav-bills-badge");
  if (billsBadge) {
    billsBadge.textContent = billsCount;
    billsBadge.classList.toggle("zero", billsCount === 0);
  }
}

// ─── 1. TABLES & FLOOR PLAN ───
function renderTables() {
  const grid = $("#table-grid");
  if (!grid) return;
  grid.innerHTML = "";

  // Update counts in filter pills
  const counts = { available: 0, preparing: 0, ready: 0, served: 0 };
  state.tables.forEach((t) => {
    if (counts[t.status] !== undefined) counts[t.status]++;
  });

  const cAvail = $("#count-avail");
  const cPrep = $("#count-prep");
  const cReady = $("#count-ready");
  const cServed = $("#count-served");
  if (cAvail) cAvail.textContent = counts.available;
  if (cPrep) cPrep.textContent = counts.preparing;
  if (cReady) cReady.textContent = counts.ready;
  if (cServed) cServed.textContent = counts.served;

  // Table selection hint badge
  const selHint = $("#table-selection-status");
  if (selHint) {
    if (state.selectedTable) {
      const tbl = state.tables[state.selectedTable - 1];
      selHint.textContent = `Table ${tbl.id} Selected (${tbl.status.toUpperCase()})`;
    } else {
      selHint.textContent = "Click a table to begin";
    }
  }

  // Render cards
  state.tables.forEach((tbl) => {
    const card = document.createElement("div");
    const isSelected = state.selectedTable === tbl.id;
    const isDimmed = state.tableFilter !== "all" && tbl.status !== state.tableFilter;

    card.className = `table-card${isSelected ? " selected" : ""}${isDimmed ? " dimmed" : ""}`;
    card.dataset.status = tbl.status;
    card.id = `table-card-${tbl.id}`;

    const icons = {
      available: "🟢",
      ordering: "📝",
      preparing: "🔥",
      ready: "✅",
      served: "🍽️",
    };
    const labels = {
      available: "Available",
      ordering: "Ordering",
      preparing: "Preparing",
      ready: "Ready",
      served: "Served",
    };

    card.innerHTML = `
      <span class="table-icon">${icons[tbl.status]}</span>
      <div class="table-num">Table ${tbl.id}</div>
      <div class="table-status">${labels[tbl.status]}</div>
    `;

    card.addEventListener("click", () => {
      SoundSynth.playTap();
      selectTable(tbl.id);
    });

    grid.appendChild(card);
  });
}

function initTableFilters() {
  $$(".legend-filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      SoundSynth.playClick();
      $$(".legend-filter-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.tableFilter = btn.dataset.filter;
      renderTables();
    });
  });
}

function selectTable(tableId) {
  const tbl = state.tables[tableId - 1];
  state.selectedTable = tableId;

  if (!state.draftItems[tableId]) {
    state.draftItems[tableId] = [];
  }

  // If table is available, place into ordering mode
  if (tbl.status === "available") {
    tbl.status = "ordering";
  }

  render();
}

// ─── 2. DIGITAL MENU & CUSTOMIZATION ───
function renderMenu() {
  const tabsEl = $("#menu-category-tabs");
  const itemsEl = $("#menu-items");
  const hint = $("#menu-empty-hint");
  const targetLabel = $("#menu-target-table");

  if (!tabsEl || !itemsEl || !hint) return;
  tabsEl.innerHTML = "";
  itemsEl.innerHTML = "";

  if (!state.selectedTable) {
    hint.classList.remove("hidden");
    if (targetLabel) targetLabel.textContent = "—";
    return;
  }

  hint.classList.add("hidden");
  if (targetLabel) targetLabel.textContent = `Ordering for Table ${state.selectedTable}`;

  // Category navigation tabs
  CATEGORIES.forEach((cat) => {
    const btn = document.createElement("button");
    btn.className = `cat-tab${cat === state.activeMenuCategory ? " active" : ""}`;
    btn.textContent = cat;
    btn.id = `cat-tab-${cat.toLowerCase()}`;
    btn.addEventListener("click", () => {
      SoundSynth.playClick();
      state.activeMenuCategory = cat;
      renderMenu();
    });
    tabsEl.appendChild(btn);
  });

  // Filtered menu items
  const items = MENU.filter((i) => i.category === state.activeMenuCategory);
  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "menu-card";
    card.id = `menu-item-${item.id}`;
    card.innerHTML = `
      <span class="item-emoji">${item.emoji}</span>
      <span class="item-name">${item.name}</span>
      <span class="item-cat">${item.category}</span>
      <span class="item-price">${formatCurrency(item.price)}</span>
    `;
    card.addEventListener("click", () => {
      SoundSynth.playClick();
      openItemModal(item);
    });
    itemsEl.appendChild(card);
  });
}

// ─── ITEM CUSTOMIZATION MODAL ───
let modalItem = null;
let modalQty = 1;

function openItemModal(item) {
  if (!state.selectedTable) {
    showToast("Please select a table on the floor plan first!", "warn");
    return;
  }
  const tbl = state.tables[state.selectedTable - 1];
  if (tbl.status !== "ordering" && tbl.status !== "available") {
    showToast(`Table ${tbl.id} already has an active order (${tbl.status.toUpperCase()}).`, "warn");
    return;
  }

  modalItem = item;
  modalQty = 1;

  $("#modal-item-name").textContent = `${item.emoji} ${item.name}`;
  $("#modal-item-price").textContent = formatCurrency(item.price);
  $("#qty-value").textContent = modalQty;

  // Reset defaults
  const mildRadio = document.querySelector('input[name="spice"][value="Mild"]');
  if (mildRadio) mildRadio.checked = true;
  $$('#extras-group input[type="checkbox"]').forEach((cb) => (cb.checked = false));
  $("#kitchen-notes").value = "";

  $("#modal-overlay").classList.add("open");
}

function closeModal() {
  $("#modal-overlay").classList.remove("open");
  modalItem = null;
}

function initModal() {
  $("#modal-close").addEventListener("click", () => {
    SoundSynth.playClick();
    closeModal();
  });

  $("#modal-overlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      SoundSynth.playClick();
      closeModal();
    }
  });

  $("#qty-minus").addEventListener("click", () => {
    SoundSynth.playClick();
    if (modalQty > 1) {
      modalQty--;
      $("#qty-value").textContent = modalQty;
    }
  });

  $("#qty-plus").addEventListener("click", () => {
    SoundSynth.playClick();
    if (modalQty < 20) {
      modalQty++;
      $("#qty-value").textContent = modalQty;
    }
  });

  $("#btn-add-to-order").addEventListener("click", addItemToOrder);
}

function addItemToOrder() {
  if (!modalItem || !state.selectedTable) return;
  const tableId = state.selectedTable;
  const tbl = state.tables[tableId - 1];

  if (tbl.status === "available") tbl.status = "ordering";

  const spice = document.querySelector('input[name="spice"]:checked')?.value || "Mild";
  const extras = [];
  $$('#extras-group input[type="checkbox"]:checked').forEach((cb) => extras.push(cb.value));
  const notes = $("#kitchen-notes").value.trim();

  if (!state.draftItems[tableId]) state.draftItems[tableId] = [];

  state.draftItems[tableId].push({
    menuId: modalItem.id,
    name: modalItem.name,
    price: modalItem.price,
    qty: modalQty,
    spice,
    extras: [...extras],
    notes,
    emoji: modalItem.emoji,
  });

  SoundSynth.playItemAdded();
  showToast(`Added ${modalQty}× ${modalItem.name} to Table ${tableId} ✨`, "success");
  closeModal();
  render();
}

// ─── 3. ORDER TICKET SIDEBAR ───
function renderTicket() {
  const label = $("#ticket-table-label");
  const stateTag = $("#ticket-state-tag");
  const itemsEl = $("#ticket-items");
  const subtotalEl = $("#ticket-subtotal-value");
  const sendBtn = $("#btn-send-kitchen");

  if (!label || !itemsEl || !subtotalEl || !sendBtn) return;

  if (!state.selectedTable) {
    label.textContent = "—";
    if (stateTag) {
      stateTag.textContent = "Idle";
      stateTag.className = "ticket-state-tag";
    }
    itemsEl.innerHTML =
      '<p style="color:var(--text-muted);font-size:.82rem;text-align:center;margin-top:2.5rem;">Select a table on the floor plan</p>';
    subtotalEl.textContent = "₹0.00";
    sendBtn.disabled = true;
    return;
  }

  const tableId = state.selectedTable;
  const tbl = state.tables[tableId - 1];
  label.textContent = `Table ${tableId}`;

  // If table is active in kitchen or served, show read-only status
  if (
    tbl.currentOrderId &&
    (tbl.status === "preparing" || tbl.status === "ready" || tbl.status === "served")
  ) {
    const order = state.orders[tbl.currentOrderId];
    if (order) {
      const statusLabels = {
        queued: "Queued",
        "in-preparation": "In Preparation",
        ready: "Ready to Serve",
        served: "Served",
      };
      if (stateTag) {
        stateTag.textContent = statusLabels[order.status] || order.status;
        stateTag.className = "ticket-state-tag active-draft";
      }

      itemsEl.innerHTML = `
        <div style="background:rgba(212,168,83,.08);border:1px solid rgba(212,168,83,.25);border-radius:8px;padding:.6rem .8rem;margin-bottom:.8rem;text-align:center;">
          <div style="font-size:.72rem;color:var(--text-muted);">ACTIVE TICKET: <strong style="color:var(--text-primary);">${order.id}</strong></div>
          <div style="font-size:.76rem;font-weight:700;color:var(--accent);margin-top:.15rem;">STATUS: ${statusLabels[order.status] || order.status}</div>
        </div>
      `;

      let total = 0;
      order.items.forEach((it) => {
        total += it.price * it.qty;
        const el = document.createElement("div");
        el.className = "ticket-item";
        el.innerHTML = `
          <div class="ticket-item-info">
            <div class="ticket-item-name">${it.emoji || "🍽️"} ${it.name} ×${it.qty}</div>
            ${it.extras.length ? `<div class="ticket-item-mods">${it.extras.join(", ")}</div>` : ""}
            ${it.notes ? `<div class="ticket-item-notes">"${it.notes}"</div>` : ""}
          </div>
          <div class="ticket-item-price">${formatCurrency(it.price * it.qty)}</div>
        `;
        itemsEl.appendChild(el);
      });

      subtotalEl.textContent = formatCurrency(total);
      sendBtn.disabled = true;
      return;
    }
  }

  // Draft items ticket
  const draft = state.draftItems[tableId] || [];
  if (stateTag) {
    stateTag.textContent = draft.length > 0 ? "Drafting" : "Empty";
    stateTag.className = `ticket-state-tag${draft.length > 0 ? " active-draft" : ""}`;
  }

  if (draft.length === 0) {
    itemsEl.innerHTML =
      '<p style="color:var(--text-muted);font-size:.82rem;text-align:center;margin-top:2.5rem;">Ticket empty — choose culinary items from the menu</p>';
    subtotalEl.textContent = "₹0.00";
    sendBtn.disabled = true;
    return;
  }

  itemsEl.innerHTML = "";
  let subtotal = 0;

  draft.forEach((item, idx) => {
    subtotal += item.price * item.qty;
    const row = document.createElement("div");
    row.className = "ticket-item";
    row.innerHTML = `
      <div class="ticket-item-info">
        <div class="ticket-item-name">${item.emoji || "🍽️"} ${item.name}</div>
        ${item.spice !== "Mild" ? `<div class="ticket-item-mods">🌶 ${item.spice}</div>` : ""}
        ${item.extras.length ? `<div class="ticket-item-mods">${item.extras.join(", ")}</div>` : ""}
        ${item.notes ? `<div class="ticket-item-notes">"${item.notes}"</div>` : ""}
      </div>
      <div class="ticket-item-actions">
        <div class="ticket-qty-row">
          <button class="ticket-qty-btn" data-action="dec" data-idx="${idx}">−</button>
          <span class="ticket-qty-val">${item.qty}</span>
          <button class="ticket-qty-btn" data-action="inc" data-idx="${idx}">+</button>
        </div>
        <button class="ticket-remove-btn" data-idx="${idx}">Remove</button>
      </div>
      <div class="ticket-item-price">${formatCurrency(item.price * item.qty)}</div>
    `;

    // Quantity modifiers
    row.querySelector('[data-action="dec"]').addEventListener("click", () => {
      SoundSynth.playClick();
      if (draft[idx].qty > 1) {
        draft[idx].qty--;
      } else {
        draft.splice(idx, 1);
      }
      if (draft.length === 0 && state.tables[tableId - 1].status === "ordering") {
        state.tables[tableId - 1].status = "available";
      }
      render();
    });

    row.querySelector('[data-action="inc"]').addEventListener("click", () => {
      SoundSynth.playClick();
      if (draft[idx].qty < 20) draft[idx].qty++;
      render();
    });

    row.querySelector(".ticket-remove-btn").addEventListener("click", () => {
      SoundSynth.playClick();
      draft.splice(idx, 1);
      if (draft.length === 0 && state.tables[tableId - 1].status === "ordering") {
        state.tables[tableId - 1].status = "available";
      }
      render();
    });

    itemsEl.appendChild(row);
  });

  subtotalEl.textContent = formatCurrency(subtotal);
  sendBtn.disabled = draft.length === 0;
}

function initTicket() {
  const sendBtn = $("#btn-send-kitchen");
  if (sendBtn) {
    sendBtn.addEventListener("click", sendToKitchen);
  }
}

function sendToKitchen() {
  const tableId = state.selectedTable;
  if (!tableId) return;
  const draft = state.draftItems[tableId];
  if (!draft || draft.length === 0) return;

  const tbl = state.tables[tableId - 1];
  const orderId = genId();

  state.orders[orderId] = {
    id: orderId,
    tableId,
    items: JSON.parse(JSON.stringify(draft)),
    status: "queued",
    createdAt: Date.now(),
  };

  tbl.status = "preparing";
  tbl.currentOrderId = orderId;
  delete state.draftItems[tableId];

  SoundSynth.playOrderSent();
  showToast(`Order ${orderId} fired to Kitchen for Table ${tableId}! 🔥`, "success");
  render();
}

// ─── 4. KITCHEN DISPLAY SYSTEM (KDS) ───
function renderKDS() {
  const board = $("#kds-board");
  const empty = $("#kds-empty");
  if (!board || !empty) return;
  board.innerHTML = "";

  const allActiveOrders = Object.values(state.orders).filter(
    (o) => o.status === "queued" || o.status === "in-preparation" || o.status === "ready"
  );

  // Update KDS filter counts
  const kdsCounts = { all: allActiveOrders.length, queued: 0, "in-preparation": 0, ready: 0 };
  allActiveOrders.forEach((o) => {
    if (kdsCounts[o.status] !== undefined) kdsCounts[o.status]++;
  });

  const kAll = $("#kds-count-all");
  const kQueued = $("#kds-count-queued");
  const kPrep = $("#kds-count-prep");
  const kReady = $("#kds-count-ready");
  if (kAll) kAll.textContent = kdsCounts.all;
  if (kQueued) kQueued.textContent = kdsCounts.queued;
  if (kPrep) kPrep.textContent = kdsCounts["in-preparation"];
  if (kReady) kReady.textContent = kdsCounts.ready;

  // Filter based on selected filter
  let displayedOrders = allActiveOrders;
  if (state.kdsFilter !== "all") {
    displayedOrders = allActiveOrders.filter((o) => o.status === state.kdsFilter);
  }

  // Sort: queued first, in-prep second, ready third; oldest first
  const statusPriority = { queued: 0, "in-preparation": 1, ready: 2 };
  displayedOrders.sort(
    (a, b) => statusPriority[a.status] - statusPriority[b.status] || a.createdAt - b.createdAt
  );

  if (displayedOrders.length === 0) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  displayedOrders.forEach((order) => {
    const elapsed = Math.floor((Date.now() - order.createdAt) / 1000);
    let urgency = "";
    if (elapsed > 1200) urgency = "critical";
    else if (elapsed > 600) urgency = "warn";

    const badgeMap = {
      queued: { label: "Queued", cls: "queued" },
      "in-preparation": { label: "In Preparation", cls: "in-prep" },
      ready: { label: "Ready to Serve", cls: "ready" },
    };
    const badgeInfo = badgeMap[order.status] || { label: order.status, cls: "" };

    const card = document.createElement("div");
    card.className = "kds-ticket";
    card.id = `kds-${order.id}`;
    if (urgency) card.dataset.urgency = urgency;

    let itemsHTML = "";
    order.items.forEach((it) => {
      const mods = [];
      if (it.spice && it.spice !== "Mild") mods.push(`🌶 ${it.spice}`);
      if (it.extras && it.extras.length) mods.push(...it.extras);

      itemsHTML += `
        <div class="kds-item">
          <span class="kds-item-qty">${it.qty}×</span>
          <div class="kds-item-details">
            <div class="kds-item-name">${it.emoji || "🍽️"} ${it.name}</div>
            ${mods.length ? `<div class="kds-item-mods">⚠ ${mods.join(" · ")}</div>` : ""}
            ${it.notes ? `<div class="kds-item-notes">📝 "${it.notes}"</div>` : ""}
          </div>
        </div>
      `;
    });

    let actionsHTML = "";
    if (order.status === "queued") {
      actionsHTML = `<button class="btn-sm btn-warning kds-action" data-order="${order.id}" data-action="start">▶ Start Preparing</button>`;
    } else if (order.status === "in-preparation") {
      actionsHTML = `<button class="btn-sm btn-success kds-action" data-order="${order.id}" data-action="ready">✅ Mark Ready</button>`;
    } else if (order.status === "ready") {
      actionsHTML = `<button class="btn-sm btn-teal kds-action" data-order="${order.id}" data-action="served">🍽️ Mark Served</button>`;
    }

    card.innerHTML = `
      <div class="kds-ticket-header">
        <div class="kds-ticket-header-left">
          <span class="kds-order-id">${order.id}</span>
          <span class="kds-table-num">Table ${order.tableId}</span>
        </div>
        <div style="text-align:right">
          <span class="kds-badge ${badgeInfo.cls}">${badgeInfo.label}</span>
          <div class="kds-time">${timeAgo(order.createdAt)}</div>
        </div>
      </div>
      <div class="kds-ticket-body">${itemsHTML}</div>
      <div class="kds-ticket-actions">${actionsHTML}</div>
    `;

    board.appendChild(card);
  });

  // Action listeners
  $$(".kds-action").forEach((btn) => {
    btn.addEventListener("click", () => {
      const orderId = btn.dataset.order;
      const action = btn.dataset.action;
      handleKDSAction(orderId, action);
    });
  });
}

function initKDSFilters() {
  $$(".kds-filter-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      SoundSynth.playClick();
      $$(".kds-filter-chip").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.kdsFilter = btn.dataset.kdsFilter;
      renderKDS();
    });
  });
}

function handleKDSAction(orderId, action) {
  const order = state.orders[orderId];
  if (!order) return;
  const tbl = state.tables[order.tableId - 1];

  switch (action) {
    case "start":
      order.status = "in-preparation";
      SoundSynth.playClick();
      showToast(`Order ${orderId} is now under active preparation 🔥`, "info");
      break;
    case "ready":
      order.status = "ready";
      tbl.status = "ready";
      SoundSynth.playBell();
      showToast(`Order ${orderId} (Table ${order.tableId}) is READY TO SERVE! 🛎️`, "success");
      break;
    case "served":
      order.status = "served";
      tbl.status = "served";
      SoundSynth.playClick();
      showToast(`Order ${orderId} served to Table ${order.tableId} 🍽️`, "success");
      break;
  }
  render();
}

// ─── 5. BILLS & GUEST SETTLEMENT ───
function renderBills() {
  const container = $("#bills-container");
  const empty = $("#bills-empty");
  if (!container || !empty) return;
  container.innerHTML = "";

  const servedOrders = Object.values(state.orders).filter((o) => o.status === "served");

  if (servedOrders.length === 0) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  servedOrders.forEach((order) => {
    const isServiceEnabled = state.serviceChargeEnabled[order.id] ?? false;

    let subtotal = 0;
    let itemsHTML = "";
    order.items.forEach((it) => {
      const lineTotal = it.price * it.qty;
      subtotal += lineTotal;
      itemsHTML += `
        <div class="bill-line item-line">
          <span class="bill-item-name">${it.emoji || "🍽️"} ${it.name} ×${it.qty}</span>
          <span>${formatCurrency(lineTotal)}</span>
        </div>
      `;
    });

    const tax = subtotal * TAX_RATE;
    const service = isServiceEnabled ? subtotal * SERVICE_RATE : 0;
    const grandTotal = subtotal + tax + service;

    const card = document.createElement("div");
    card.className = "bill-card";
    card.id = `bill-${order.id}`;
    card.innerHTML = `
      <div class="bill-header">
        <div class="bill-header-left">
          <span class="bill-table-name">🪑 Table ${order.tableId}</span>
          <span class="bill-order-id">${order.id} · ${formatDate(order.createdAt)}</span>
        </div>
      </div>
      <div class="bill-body">
        ${itemsHTML}
        <hr class="bill-divider" />
        <div class="bill-line subtotal">
          <span>Subtotal</span>
          <span>${formatCurrency(subtotal)}</span>
        </div>
        <div class="bill-line tax">
          <span>GST (5%)</span>
          <span>${formatCurrency(tax)}</span>
        </div>
        <label class="bill-service-toggle">
          <input type="checkbox" ${isServiceEnabled ? "checked" : ""} data-order="${order.id}" class="service-toggle" />
          Service Charge (10%)
        </label>
        ${
          isServiceEnabled
            ? `
        <div class="bill-line service">
          <span>Service Charge</span>
          <span>${formatCurrency(service)}</span>
        </div>`
            : ""
        }
        <hr class="bill-divider" />
        <div class="bill-line grand-total">
          <span>Grand Total</span>
          <span>${formatCurrency(grandTotal)}</span>
        </div>
      </div>
      <div class="bill-card-actions">
        <button class="btn-sm btn-success settle-btn" data-order="${order.id}" data-total="${grandTotal.toFixed(2)}">
          💳 Settle Bill &amp; Free Table
        </button>
        <button class="btn-receipt-view" data-order="${order.id}">
          🧾 View Guest Check
        </button>
      </div>
    `;

    container.appendChild(card);
  });

  // Service charge checkboxes
  $$(".service-toggle").forEach((toggle) => {
    toggle.addEventListener("change", (e) => {
      SoundSynth.playClick();
      const orderId = e.target.dataset.order;
      state.serviceChargeEnabled[orderId] = e.target.checked;
      renderBills();
    });
  });

  // Settle buttons
  $$(".settle-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const rect = btn.getBoundingClientRect();
      ConfettiEngine.burst(rect.left + rect.width / 2, rect.top);
      settleBill(btn.dataset.order, parseFloat(btn.dataset.total));
    });
  });

  // Receipt preview buttons
  $$(".btn-receipt-view").forEach((btn) => {
    btn.addEventListener("click", () => {
      SoundSynth.playClick();
      const order = state.orders[btn.dataset.order];
      if (order) openReceiptModal(order);
    });
  });
}

function settleBill(orderId, total) {
  const order = state.orders[orderId];
  if (!order) return;
  const tbl = state.tables[order.tableId - 1];

  // Archive to Order History
  state.history.unshift({
    id: order.id,
    tableId: order.tableId,
    items: order.items.map((i) => ({
      name: i.name,
      qty: i.qty,
      price: i.price,
      spice: i.spice,
      extras: i.extras,
    })),
    total,
    completedAt: Date.now(),
    status: "completed",
  });

  // Reset table
  tbl.status = "available";
  tbl.currentOrderId = null;

  // Cleanup active maps
  delete state.orders[orderId];
  delete state.serviceChargeEnabled[orderId];
  delete state.draftItems[order.tableId];

  SoundSynth.playSettleCash();
  showToast(
    `Payment settled for Table ${order.tableId} (${formatCurrency(total)}). Table is now Available! ✨`,
    "success"
  );
  render();
}

// ─── GUEST RECEIPT MODAL ───
function openReceiptModal(orderRecord) {
  const overlay = $("#receipt-modal-overlay");
  if (!overlay) return;

  $("#rec-table").textContent = `Table ${orderRecord.tableId}`;
  $("#rec-order").textContent = orderRecord.id;
  $("#rec-date").textContent = formatDate(orderRecord.createdAt || orderRecord.completedAt || Date.now());

  const itemsTable = $("#rec-items-table");
  itemsTable.innerHTML = "";
  let subtotal = 0;

  orderRecord.items.forEach((it) => {
    const lineTotal = it.price * it.qty;
    subtotal += lineTotal;
    const row = document.createElement("div");
    row.className = "rec-item-row";
    row.innerHTML = `
      <div class="rec-item-left">
        <span class="rec-item-name">${it.qty}× ${it.name}</span>
        ${it.extras && it.extras.length ? `<span class="rec-item-mods">${it.extras.join(", ")}</span>` : ""}
      </div>
      <span class="rec-item-price">${formatCurrency(lineTotal)}</span>
    `;
    itemsTable.appendChild(row);
  });

  const tax = subtotal * TAX_RATE;
  const isServiceEnabled = state.serviceChargeEnabled[orderRecord.id] ?? false;
  const service = isServiceEnabled ? subtotal * SERVICE_RATE : 0;
  const grandTotal = orderRecord.total || subtotal + tax + service;

  $("#rec-subtotal").textContent = formatCurrency(subtotal);
  $("#rec-tax").textContent = formatCurrency(tax);

  const serviceRow = $("#rec-service-row");
  if (serviceRow) {
    serviceRow.style.display = service > 0 ? "flex" : "none";
    $("#rec-service").textContent = formatCurrency(service);
  }

  $("#rec-grand").textContent = formatCurrency(grandTotal);

  overlay.classList.add("open");
}

function initReceiptModal() {
  const closeBtn = $("#receipt-modal-close");
  const overlay = $("#receipt-modal-overlay");
  const printBtn = $("#btn-print-receipt");

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      SoundSynth.playClick();
      overlay.classList.remove("open");
    });
  }

  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        SoundSynth.playClick();
        overlay.classList.remove("open");
      }
    });
  }

  if (printBtn) {
    printBtn.addEventListener("click", () => {
      SoundSynth.playClick();
      window.print();
    });
  }
}

// ─── 6. ORDER HISTORY ───
function renderHistory() {
  const metricsEl = $("#history-metrics");
  const tbody = $("#history-tbody");
  if (!metricsEl || !tbody) return;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayOrders = state.history.filter((h) => h.completedAt >= todayStart.getTime());
  const totalRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);

  metricsEl.innerHTML = `
    <div class="metric-card">
      <span class="metric-label">Total Orders Today</span>
      <span class="metric-value orders">${todayOrders.length}</span>
    </div>
    <div class="metric-card">
      <span class="metric-label">Total Revenue Today</span>
      <span class="metric-value revenue">${formatCurrency(totalRevenue)}</span>
    </div>
  `;

  const search = ($("#history-search").value || "").toLowerCase();
  const filtered = state.history.filter((h) => {
    const text = `${h.id} table ${h.tableId} ${h.items.map((i) => i.name).join(" ")}`.toLowerCase();
    return text.includes(search);
  });

  tbody.innerHTML = "";
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:2.5rem;">No past order records found</td></tr>`;
    return;
  }

  filtered.forEach((h) => {
    const itemsSummary = h.items.map((i) => `${i.qty}× ${i.name}`).join(", ");
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-weight:700;color:var(--accent-hover)">${h.id}</td>
      <td><strong>Table ${h.tableId}</strong></td>
      <td style="max-width:280px;line-height:1.4;">${itemsSummary}</td>
      <td style="font-weight:700;color:var(--clr-available)">${formatCurrency(h.total)}</td>
      <td>${formatDate(h.completedAt)}</td>
      <td><span class="history-badge">Completed</span></td>
      <td><button class="btn-history-receipt" data-hist-id="${h.id}">🧾 Receipt</button></td>
    `;
    tbody.appendChild(tr);
  });

  // History receipt click
  $$(".btn-history-receipt").forEach((btn) => {
    btn.addEventListener("click", () => {
      SoundSynth.playClick();
      const rec = state.history.find((h) => h.id === btn.dataset.histId);
      if (rec) openReceiptModal(rec);
    });
  });
}

function initHistorySearch() {
  const searchInput = $("#history-search");
  if (searchInput) {
    searchInput.addEventListener("input", () => renderHistory());
  }
}

// ═══════════════════ LIVE KDS ELAPSED TIMER ═══════════════════
function updateKDSTimes() {
  $$(".kds-time").forEach((el) => {
    const card = el.closest(".kds-ticket");
    if (!card) return;
    const orderId = card.id.replace("kds-", "");
    const order = state.orders[orderId];
    if (order) {
      el.textContent = timeAgo(order.createdAt);
      const elapsed = Math.floor((Date.now() - order.createdAt) / 1000);
      if (elapsed > 1200) card.dataset.urgency = "critical";
      else if (elapsed > 600) card.dataset.urgency = "warn";
      else delete card.dataset.urgency;
    }
  });
}

// ═══════════════════ KEYBOARD SHORTCUTS ═══════════════════
function initKeyboardShortcuts() {
  window.addEventListener("keydown", (e) => {
    // Avoid interfering with typing in inputs / notes
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
      if (e.key === "Escape") {
        closeModal();
        const recModal = $("#receipt-modal-overlay");
        if (recModal) recModal.classList.remove("open");
      }
      return;
    }

    if (e.key === "1") switchToView("tables");
    else if (e.key === "2") switchToView("kitchen");
    else if (e.key === "3") switchToView("bills");
    else if (e.key === "4") switchToView("history");
    else if (e.key === "s" || e.key === "S") SoundSynth.toggle();
    else if (e.key === "Escape") {
      closeModal();
      const recModal = $("#receipt-modal-overlay");
      if (recModal) recModal.classList.remove("open");
    } else if (e.key === "Enter" && $("#modal-overlay")?.classList.contains("open")) {
      addItemToOrder();
    }
  });
}

// ═══════════════════ INITIALIZATION ═══════════════════
function init() {
  seedDemoData();
  AmbientEngine.init();
  ConfettiEngine.init();

  initNav();
  initTableFilters();
  initModal();
  initReceiptModal();
  initTicket();
  initKDSFilters();
  initHistorySearch();
  initKeyboardShortcuts();

  render();

  // Header clock
  updateClock();
  setInterval(updateClock, 1000);

  // KDS real-time ticket aging
  setInterval(updateKDSTimes, 4000);
}

document.addEventListener("DOMContentLoaded", init);
