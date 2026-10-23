/* ═══════════════════════════════════════════════════════════════
   KTCH — Premium Minimalist Food Ordering & Kitchen Intelligence
   Vanilla JavaScript (ES6+) Complete State-Driven Engine
   Fixes: Full Table Binding, Item Customizations Preservation,
   Floor Plan Rendering, Status Lifecycle Sync & LocalStorage Persistence
   ═══════════════════════════════════════════════════════════════ */

"use strict";

const STORAGE_KEY = "KTCH_RESTAURANT_STATE_v2";

// ─── UTILITY HELPERS ───
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const formatCurrency = (n) => `$${Number(n || 0).toFixed(2)}`;
const genId = () => "KTCH-" + Math.random().toString(36).substring(2, 8).toUpperCase();

const timeAgo = (ts) => {
  if (!ts) return "Just now";
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diff < 45) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m ago`;
};

// ═══════════════════ WEB AUDIO SOUND SYNTHESIZER ═══════════════════
const SoundSynth = {
  ctx: null,
  enabled: true,
  lastPlayTime: 0,
  minInterval: 120, // Rate limit to prevent audio buffer floods and tab crashes

  init() {
    if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      } catch (err) {
        console.warn("Could not create AudioContext:", err);
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  },

  initMuteState() {
    try {
      const saved = localStorage.getItem("ktch_sound_enabled");
      if (saved !== null) {
        this.enabled = JSON.parse(saved);
      }
    } catch (_) {}
    this.updateUI();
  },

  updateUI() {
    const icon = $("#sound-icon");
    const label = $("#sound-label");
    if (icon) icon.textContent = this.enabled ? "🔔" : "🔕";
    if (label) label.textContent = this.enabled ? "Audio On" : "Muted";
  },

  toggle() {
    this.enabled = !this.enabled;
    try {
      localStorage.setItem("ktch_sound_enabled", JSON.stringify(this.enabled));
    } catch (_) {}
    this.updateUI();
    showToast(this.enabled ? "Audio notifications enabled 🔔" : "Audio muted 🔕", "info");
    if (this.enabled) this.playTone(520, "sine", 0.08, 0.08);
  },

  playTone(freq, type, duration, startGain = 0.12, endGain = 0.001) {
    if (!this.enabled) return;
    const nowMs = Date.now();
    if (nowMs - this.lastPlayTime < this.minInterval) return;
    this.lastPlayTime = nowMs;

    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(startGain, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(endGain, 0.0001), now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      // Explicit node lifecycle cleanup to prevent hardware channel exhaustion
      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch (_) {}
      };

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      console.warn("Audio safely skipped:", e);
    }
  },

  playTap() {
    this.playTone(340, "sine", 0.04, 0.05);
  },

  playClick() {
    this.playTone(580, "triangle", 0.04, 0.05);
  },

  playItemAdded() {
    if (!this.enabled) return;
    const nowMs = Date.now();
    if (nowMs - this.lastPlayTime < this.minInterval) return;
    this.lastPlayTime = nowMs;

    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      [523.25, 659.25].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.06);
        gain.gain.setValueAtTime(0.08, now + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.18);
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.onended = () => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch (_) {}
        };

        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.18);
      });
    } catch (e) {
      console.warn("Audio safely skipped:", e);
    }
  },

  playOrderSent() {
    // Genuine new kitchen order notification - plays once per received order
    if (!this.enabled) return;
    const nowMs = Date.now();
    if (nowMs - this.lastPlayTime < this.minInterval) return;
    this.lastPlayTime = nowMs;

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

        osc.onended = () => {
          try {
            osc.disconnect();
            gain.disconnect();
          } catch (_) {}
        };

        osc.start(now + i * 0.06);
        osc.stop(now + i * 0.06 + 0.35);
      });
    } catch (e) {
      console.warn("Kitchen notification safely skipped:", e);
    }
  },
};

// ═══════════════════ AMBIENT FX PARTICLES ═══════════════════
const AmbientEngine = {
  canvas: null,
  ctx: null,
  particles: [],

  init() {
    this.canvas = $("#ambient-canvas");
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");
    this.resize();
    window.addEventListener("resize", () => this.resize());

    const count = 28;
    this.particles = Array.from({ length: count }, () => ({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      radius: Math.random() * 2 + 1,
      speedY: Math.random() * 0.25 + 0.1,
      speedX: (Math.random() - 0.5) * 0.2,
      alpha: Math.random() * 0.4 + 0.1,
      pulse: Math.random() * 0.02 + 0.01,
    }));
    this.loop();
  },

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  },

  loop() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let p of this.particles) {
      p.y -= p.speedY;
      p.x += p.speedX;
      if (p.y < -10) p.y = this.canvas.height + 10;
      if (p.x < -10) p.x = this.canvas.width + 10;
      if (p.x > this.canvas.width + 10) p.x = -10;

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(245, 200, 61, ${p.alpha})`;
      this.ctx.fill();
    }
    requestAnimationFrame(() => this.loop());
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
    const colors = ["#F5C83D", "#E87A28", "#171717", "#5B8C5A", "#F6F3EE"];
    const count = 75;
    const ox = originX || window.innerWidth / 2;
    const oy = originY || window.innerHeight / 2;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const speed = Math.random() * 10 + 5;
      this.pieces.push({
        x: ox,
        y: oy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 3,
        size: Math.random() * 6 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 8,
        gravity: 0.22,
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
      p.vy += p.gravity;
      p.alpha -= 0.015;

      if (p.alpha <= 0 || p.y > this.canvas.height) {
        this.pieces.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(p.x, p.y, p.size, p.size * 0.6);
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

// ═══════════════════ 78 MENU ITEMS MASTER CATALOG ═══════════════════
const MENU_ITEMS = [
  // ─── 1. BURGERS & SANDWICHES ───
  {
    id: "bg-1",
    name: "Cheesy Beef Burger",
    price: 8.99,
    rating: 4.7,
    reviews: 86,
    prepTime: "12-15 min",
    badge: "NEW",
    image: "assets/images/burger-double.jpg",
    desc: "Double patty, cheddar, house sauce",
    category: "Burgers",
    popularity: 98,
  },
  {
    id: "bg-2",
    name: "Classic Cheeseburger",
    price: 7.49,
    rating: 4.8,
    reviews: 412,
    prepTime: "12-15 min",
    badge: "BESTSELLER",
    image: "assets/images/burger-classic.jpg",
    desc: "Beef patty, cheddar, pickles",
    category: "Burgers",
    popularity: 100,
  },
  {
    id: "bg-3",
    name: "Crispy Wing Box",
    price: 9.99,
    rating: 4.6,
    reviews: 102,
    prepTime: "15-18 min",
    badge: "",
    image: "assets/images/crispy-wings.jpg",
    desc: "8pc spicy buffalo wings, ranch dip",
    category: "Chicken & Sides",
    popularity: 92,
  },
  {
    id: "bg-4",
    name: "Cold Brew Cooler",
    price: 4.49,
    rating: 4.9,
    reviews: 41,
    prepTime: "5-8 min",
    badge: "",
    image: "assets/images/cold-brew.jpg",
    desc: "Iced cold brew, vanilla foam",
    category: "Beverages & Shakes",
    popularity: 90,
  },
  {
    id: "bg-5",
    name: "Pepperoni Supreme",
    price: 12.49,
    rating: 4.8,
    reviews: 64,
    prepTime: "18-22 min",
    badge: "NEW",
    image: "assets/images/pizza-pepperoni.jpg",
    desc: "Loaded pepperoni, mozzarella, basil",
    category: "Pizzas",
    popularity: 96,
  },
  {
    id: "bg-6",
    name: "Margherita Pizza",
    price: 11.99,
    rating: 4.7,
    reviews: 289,
    prepTime: "20-25 min",
    badge: "",
    image: "assets/images/pizza-margherita.jpg",
    desc: "San marzano tomato, fresh mozzarella",
    category: "Pizzas",
    popularity: 93,
  },
  {
    id: "bg-7",
    name: "Loaded Fries",
    price: 6.49,
    rating: 4.6,
    reviews: 198,
    prepTime: "10-12 min",
    badge: "",
    image: "assets/images/loaded-fries.jpg",
    desc: "Cheese sauce, bacon bits, jalapeños",
    category: "Chicken & Sides",
    popularity: 88,
  },
  {
    id: "bg-8",
    name: "Chocolate Shake",
    price: 5.49,
    rating: 4.9,
    reviews: 156,
    prepTime: "5-8 min",
    badge: "",
    image: "assets/images/chocolate-shake.jpg",
    desc: "Rich chocolate, whipped cream",
    category: "Beverages & Shakes",
    popularity: 94,
  },
  {
    id: "bg-9",
    name: "Crispy Chicken Sandwich",
    price: 8.49,
    rating: 4.7,
    reviews: 134,
    prepTime: "12-15 min",
    badge: "",
    image: "assets/images/chicken-burger.jpg",
    desc: "Panko fried chicken, slaw, spicy mayo",
    category: "Burgers",
    popularity: 89,
  },
  {
    id: "bg-10",
    name: "Artisan Grilled Panini",
    price: 7.99,
    rating: 4.6,
    reviews: 92,
    prepTime: "10-12 min",
    badge: "",
    image: "assets/images/grilled-panini.jpg",
    desc: "Smoked turkey, provolone, basil pesto",
    category: "Burgers",
    popularity: 82,
  },
  {
    id: "bg-11",
    name: "Golden Garlic Breadsticks",
    price: 5.99,
    rating: 4.8,
    reviews: 215,
    prepTime: "8-10 min",
    badge: "TRENDING",
    image: "assets/images/breadsticks.jpg",
    desc: "Warm garlic butter, parmesan, marinara",
    category: "Chicken & Sides",
    popularity: 95,
  },
  {
    id: "bg-12",
    name: "Mango Parfait Bliss",
    price: 6.49,
    rating: 4.9,
    reviews: 178,
    prepTime: "5-8 min",
    badge: "",
    image: "assets/images/mango-parfait.jpg",
    desc: "Fresh sweet mango, cream, garden mint",
    category: "Desserts",
    popularity: 91,
  },

  // ─── 2. KTCH ARTISANAL RICE BOWLS & MUSUBI ───
  {
    id: "ms-1",
    name: "California Sushi Roll",
    price: 9.99,
    rating: 4.9,
    reviews: 450,
    prepTime: "10-12 min",
    badge: "BESTSELLER",
    image: "assets/images/hero-sushi.jpg",
    desc: "Fresh salmon, avocado, cucumber, orange tobiko",
    category: "Rice Bowls & Musubi",
    popularity: 99,
  },
  {
    id: "ms-2",
    name: "Signature Musubi Trio",
    price: 9.50,
    rating: 4.9,
    reviews: 320,
    prepTime: "8-10 min",
    badge: "BESTSELLER",
    image: "assets/images/musubi-riceballs.jpg",
    desc: "Buta Pork, Karaage Chicken, and Seared Spam Musubi",
    category: "Rice Bowls & Musubi",
    popularity: 97,
  },
  {
    id: "ms-3",
    name: "Buta Pork Belly Musubi",
    price: 5.00,
    rating: 4.8,
    reviews: 190,
    prepTime: "6-8 min",
    badge: "",
    image: "assets/images/hero-sushi.jpg",
    desc: "Braised chashu pork, rice, tare, crisp nori",
    category: "Rice Bowls & Musubi",
    popularity: 87,
  },
  {
    id: "ms-4",
    name: "Karaage Chicken Musubi",
    price: 5.00,
    rating: 4.7,
    reviews: 145,
    prepTime: "6-8 min",
    badge: "",
    image: "assets/images/musubi-riceballs.jpg",
    desc: "Crispy fried chicken, spicy kewpie mayo, nori",
    category: "Rice Bowls & Musubi",
    popularity: 85,
  },
  {
    id: "ms-5",
    name: "Classic Spam Musubi",
    price: 5.00,
    rating: 4.9,
    reviews: 280,
    prepTime: "5-7 min",
    badge: "TRENDING",
    image: "assets/images/musubi-riceballs.jpg",
    desc: "Glazed seared spam, furikake rice, crisp nori",
    category: "Rice Bowls & Musubi",
    popularity: 95,
  },
  {
    id: "ms-6",
    name: "Salmon Chirashi Rice Bowl",
    price: 12.50,
    rating: 4.9,
    reviews: 310,
    prepTime: "10-14 min",
    badge: "NEW",
    image: "assets/images/hero-sushi.jpg",
    desc: "Atlantic salmon sashimi, avocado, sushi rice, tamari",
    category: "Rice Bowls & Musubi",
    popularity: 94,
  },
  {
    id: "ms-7",
    name: "KTCH Signature Bento Combo",
    price: 15.00,
    rating: 4.9,
    reviews: 520,
    prepTime: "14-18 min",
    badge: "BESTSELLER",
    image: "assets/images/musubi-riceballs.jpg",
    desc: "2 choice musubi, chicken karaage, edamame, miso soup",
    category: "Rice Bowls & Musubi",
    popularity: 99,
  },

  // ─── 3. MORE PIZZAS ───
  {
    id: "pz-3",
    name: "Quattro Formaggi Pizza",
    price: 13.49,
    rating: 4.8,
    reviews: 154,
    prepTime: "18-22 min",
    badge: "",
    image: "assets/images/pizza-margherita.jpg",
    desc: "Mozzarella, gorgonzola, parmesan, fontina",
    category: "Pizzas",
    popularity: 88,
  },
  {
    id: "pz-4",
    name: "Spicy Diavola Pizza",
    price: 12.99,
    rating: 4.7,
    reviews: 142,
    prepTime: "18-22 min",
    badge: "TRENDING",
    image: "assets/images/pizza-pepperoni.jpg",
    desc: "Calabrian chili, spicy salami, hot honey drizzle",
    category: "Pizzas",
    popularity: 91,
  },
  {
    id: "pz-5",
    name: "Wild Mushroom & Truffle Pizza",
    price: 14.25,
    rating: 4.9,
    reviews: 260,
    prepTime: "20-24 min",
    badge: "BESTSELLER",
    image: "assets/images/pizza-margherita.jpg",
    desc: "Roasted portobello, thyme, white truffle oil",
    category: "Pizzas",
    popularity: 96,
  },

  // ─── 4. MORE SIDES & WINGS ───
  {
    id: "sd-3",
    name: "Osaka Takoyaki (6 pcs)",
    price: 8.00,
    rating: 4.8,
    reviews: 210,
    prepTime: "10-12 min",
    badge: "",
    image: "assets/images/breadsticks.jpg",
    desc: "Tender octopus balls, otafuku sauce, bonito flakes",
    category: "Chicken & Sides",
    popularity: 89,
  },
  {
    id: "sd-4",
    name: "Truffle Parmesan Fries",
    price: 5.99,
    rating: 4.7,
    reviews: 165,
    prepTime: "8-10 min",
    badge: "NEW",
    image: "assets/images/loaded-fries.jpg",
    desc: "Hand-cut russets, white truffle oil, pecorino",
    category: "Chicken & Sides",
    popularity: 86,
  },
  {
    id: "sd-5",
    name: "Japanese Chicken Karaage",
    price: 7.99,
    rating: 4.9,
    reviews: 340,
    prepTime: "10-12 min",
    badge: "BESTSELLER",
    image: "assets/images/crispy-wings.jpg",
    desc: "Ginger soy double-fried chicken, kewpie mayo",
    category: "Chicken & Sides",
    popularity: 95,
  },

  // ─── 5. BEVERAGES & SWEET TREATS ───
  {
    id: "bv-2",
    name: "Iced Hojicha Roasted Tea",
    price: 4.00,
    rating: 4.9,
    reviews: 198,
    prepTime: "4-6 min",
    badge: "BESTSELLER",
    image: "assets/images/cold-brew.jpg",
    desc: "Artisanal roasted green tea, oat milk, cane sugar",
    category: "Beverages & Shakes",
    popularity: 93,
  },
  {
    id: "bv-3",
    name: "Sparkling Yuzu Citrus",
    price: 4.00,
    rating: 4.8,
    reviews: 140,
    prepTime: "3-5 min",
    badge: "TRENDING",
    image: "assets/images/cold-brew.jpg",
    desc: "Japanese yuzu sparkling tonic, fresh garden mint",
    category: "Beverages & Shakes",
    popularity: 90,
  },
  {
    id: "bv-4",
    name: "Strawberry Cream Shake",
    price: 5.99,
    rating: 4.8,
    reviews: 125,
    prepTime: "5-8 min",
    badge: "NEW",
    image: "assets/images/chocolate-shake.jpg",
    desc: "Fresh strawberries, sweet cream, biscuit crumbles",
    category: "Beverages & Shakes",
    popularity: 89,
  },
  {
    id: "ds-2",
    name: "Uji Matcha Soft Serve",
    price: 5.00,
    rating: 4.9,
    reviews: 240,
    prepTime: "4-6 min",
    badge: "BESTSELLER",
    image: "assets/images/mango-parfait.jpg",
    desc: "Ceremonial green tea soft cream, sweet red bean",
    category: "Desserts",
    popularity: 94,
  },
  {
    id: "ds-3",
    name: "Mochi Trio Platter",
    price: 6.00,
    rating: 4.8,
    reviews: 185,
    prepTime: "4-6 min",
    badge: "NEW",
    image: "assets/images/mango-parfait.jpg",
    desc: "Soft pounded rice cakes: azuki red bean, matcha, yuzu",
    category: "Desserts",
    popularity: 88,
  },
];

// Dynamically generate additional seasonal items to reach exactly 78 catalog items
(function expandTo78Items() {
  const categories = ["Burgers", "Pizzas", "Chicken & Sides", "Rice Bowls & Musubi", "Beverages & Shakes", "Desserts"];
  const badges = ["", "NEW", "", "TRENDING", "", "BESTSELLER", ""];
  const itemTemplates = [
    { name: "Smoked Brisket Burger", cat: "Burgers", price: 11.49, img: "assets/images/burger-double.jpg", desc: "14-hour smoked brisket, cheddar, pickled red onions" },
    { name: "Spicy Kimchi Cheeseburger", cat: "Burgers", price: 9.49, img: "assets/images/burger-classic.jpg", desc: "Aged beef patty, house kimchi, spicy gochujang glaze" },
    { name: "Bacon Avocado Club", cat: "Burgers", price: 8.99, img: "assets/images/grilled-panini.jpg", desc: "Crispy bacon, smashed avocado, vine tomato, sourdough" },
    { name: "Buffalo Blue Cheese Burger", cat: "Burgers", price: 9.99, img: "assets/images/burger-double.jpg", desc: "Sharp blue cheese crumbles, buffalo glaze, celery relish" },
    { name: "Truffle Wagyu Slider Duo", cat: "Burgers", price: 10.99, img: "assets/images/burger-classic.jpg", desc: "Two mini wagyu burgers with black truffle butter" },
    { name: "Prosciutto & Arugula Pizza", cat: "Pizzas", price: 13.99, img: "assets/images/pizza-margherita.jpg", desc: "Dry-cured prosciutto, baby arugula, shaved parmesan" },
    { name: "Spicy Chorizo Flatbread", cat: "Pizzas", price: 12.49, img: "assets/images/pizza-pepperoni.jpg", desc: "Spanish chorizo, smoked paprika, roasted bell peppers" },
    { name: "Garlic White Mushroom Pizza", cat: "Pizzas", price: 12.99, img: "assets/images/pizza-margherita.jpg", desc: "Roasted garlic ricotta base, sautéed cremini, fresh thyme" },
    { name: "Honey BBQ Chicken Pizza", cat: "Pizzas", price: 13.49, img: "assets/images/pizza-pepperoni.jpg", desc: "Grilled chicken, smoky honey bbq sauce, red onions, cilantro" },
    { name: "Honey Glazed Soy Wings", cat: "Chicken & Sides", price: 9.99, img: "assets/images/crispy-wings.jpg", desc: "Crispy drumsticks with sweet garlic soy glaze" },
    { name: "Parmesan Truffle Tots", cat: "Chicken & Sides", price: 6.49, img: "assets/images/loaded-fries.jpg", desc: "Crispy potato tots tossed in white truffle oil and herbs" },
    { name: "Crispy Panko Onion Rings", cat: "Chicken & Sides", price: 5.49, img: "assets/images/breadsticks.jpg", desc: "Thick sweet onion rings with spicy chipotle dip" },
    { name: "Sweet Potato Waffle Fries", cat: "Chicken & Sides", price: 5.99, img: "assets/images/loaded-fries.jpg", desc: "Cinnamon sea salt seasoning, marshmallow maple sauce" },
    { name: "Unagi Broiled Eel Musubi", cat: "Rice Bowls & Musubi", price: 6.00, img: "assets/images/hero-sushi.jpg", desc: "Kabayaki freshwater eel, sansho pepper, sweet tare" },
    { name: "Mentaiko Spicy Roe Musubi", cat: "Rice Bowls & Musubi", price: 5.00, img: "assets/images/musubi-riceballs.jpg", desc: "Marinated Hokkaido pollock roe, seasoned rice, nori" },
    { name: "Ume Shiso Plum Musubi", cat: "Rice Bowls & Musubi", price: 5.00, img: "assets/images/musubi-riceballs.jpg", desc: "Pickled ume plum, Japanese red shiso leaf, fluffy rice" },
    { name: "Crispy Tofu Teriyaki Bowl", cat: "Rice Bowls & Musubi", price: 11.50, img: "assets/images/musubi-riceballs.jpg", desc: "Glazed organic tofu, steamed edamame, sesame sushi rice" },
    { name: "Tokyo Drip Iced Latte", cat: "Beverages & Shakes", price: 4.80, img: "assets/images/cold-brew.jpg", desc: "Organic espresso, creamy oat milk, vanilla drizzle" },
    { name: "Matcha Mint Lemonade", cat: "Beverages & Shakes", price: 4.50, img: "assets/images/cold-brew.jpg", desc: "Uji ceremonial green tea with fresh squeezed lemon" },
    { name: "Caramel Sea Salt Shake", cat: "Beverages & Shakes", price: 5.80, img: "assets/images/chocolate-shake.jpg", desc: "Hand-spun vanilla shake, salted caramel ribbon, whipped cream" },
    { name: "Warm Custard Taiyaki Waffle", cat: "Desserts", price: 5.00, img: "assets/images/breadsticks.jpg", desc: "Fish-shaped crisp waffle with rich warm vanilla custard" },
    { name: "Black Sesame Gelato Cup", cat: "Desserts", price: 4.80, img: "assets/images/mango-parfait.jpg", desc: "Roasted Japanese black sesame gelato with candied pecans" },
  ];

  let idCounter = 1;
  while (MENU_ITEMS.length < 78) {
    const tmpl = itemTemplates[idCounter % itemTemplates.length];
    const cat = tmpl.cat;
    const rating = +(4.6 + (idCounter % 4) * 0.1).toFixed(1);
    const reviews = 30 + (idCounter * 17) % 350;
    const badge = badges[idCounter % badges.length];
    MENU_ITEMS.push({
      id: `item-gen-${idCounter}`,
      name: `${tmpl.name}`,
      price: tmpl.price,
      rating,
      reviews,
      prepTime: "10-15 min",
      badge,
      image: tmpl.img,
      desc: tmpl.desc,
      category: cat,
      popularity: 75 + (idCounter % 24),
    });
    idCounter++;
  }
})();

// ═══════════════════ APPLICATION STATE ═══════════════════
const INITIAL_TABLES = [
  { id: 1, name: "Table 1", capacity: "2 Guests", location: "Indoor Window", status: "available", currentOrderId: null },
  { id: 2, name: "Table 2", capacity: "4 Guests", location: "Cozy Booth", status: "preparing", currentOrderId: null },
  { id: 3, name: "Table 3", capacity: "2 Guests", location: "Dining Room", status: "available", currentOrderId: null },
  { id: 4, name: "Table 4", capacity: "4 Guests", location: "Patio Garden", status: "available", currentOrderId: null },
  { id: 5, name: "Table 5", capacity: "6 Guests", location: "Family Dining", status: "preparing", currentOrderId: null },
  { id: 6, name: "Table 6", capacity: "1 Guest", location: "Chef Counter", status: "available", currentOrderId: null },
  { id: 7, name: "Table 7", capacity: "2 Guests", location: "High Top", status: "available", currentOrderId: null },
  { id: 8, name: "Table 8", capacity: "4 Guests", location: "Private Booth", status: "available", currentOrderId: null },
];

const state = {
  activeCategory: "All Items",
  activeSort: "popular", // popular | price-low | price-high | rating
  searchTerm: "",
  favorites: new Set(["bg-1", "bg-2", "bg-5", "ms-1"]),
  selectedTable: 1, // 1 to 8 or "takeout"
  floorFilter: "all",
  cart: [
    { itemId: "bg-1", qty: 1, spice: "Mild", extras: [{ name: "Cheddar Slice", price: 1.00 }], notes: "Extra crispy edges", unitPrice: 9.99 },
    { itemId: "bg-5", qty: 1, spice: "Shichimi 🔥", extras: [], notes: "", unitPrice: 12.49 },
    { itemId: "bg-4", qty: 1, spice: "Mild", extras: [], notes: "Less ice please", unitPrice: 4.49 },
  ],
  orders: {}, // orderId -> { id, tableId, items, status, createdAt, total, subtotal, tax }
  tables: JSON.parse(JSON.stringify(INITIAL_TABLES)),
  history: [],
  kdsFilter: "all",
  activeStaffView: "kitchen",
};

// Seed baseline demo orders if none exist
function seedBaselineOrders() {
  if (Object.keys(state.orders).length === 0) {
    const o1 = genId();
    state.orders[o1] = {
      id: o1,
      tableId: 2,
      status: "in-preparation",
      createdAt: Date.now() - 480000,
      items: [
        { name: "Cheesy Beef Burger", qty: 1, price: 9.99, spice: "Mild", extras: [{ name: "Cheddar Slice", price: 1.00 }], notes: "Medium rare" },
        { name: "Loaded Fries", qty: 1, price: 6.49, spice: "Mild", extras: [], notes: "Extra jalapeños" },
      ],
      subtotal: 16.48,
      tax: 1.44,
      total: 17.92,
    };
    state.tables[1].status = "preparing";
    state.tables[1].currentOrderId = o1;

    const o2 = genId();
    state.orders[o2] = {
      id: o2,
      tableId: 5,
      status: "queued",
      createdAt: Date.now() - 120000,
      items: [
        { name: "Pepperoni Supreme", qty: 1, price: 12.49, spice: "Mild", extras: [], notes: "" },
        { name: "Cold Brew Cooler", qty: 2, price: 4.49, spice: "Mild", extras: [], notes: "Oat milk" },
      ],
      subtotal: 21.47,
      tax: 1.88,
      total: 23.35,
    };
    state.tables[4].status = "preparing";
    state.tables[4].currentOrderId = o2;
  }
}

// ═══════════════════ LOCAL STORAGE PERSISTENCE ═══════════════════
function saveState() {
  try {
    const payload = {
      orders: state.orders,
      tables: state.tables,
      history: state.history,
      cart: state.cart,
      selectedTable: state.selectedTable,
      favorites: Array.from(state.favorites),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("Could not save to localStorage", err);
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      seedBaselineOrders();
      return false;
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      if (parsed.orders && typeof parsed.orders === "object") state.orders = parsed.orders;
      if (Array.isArray(parsed.tables) && parsed.tables.length === 8) state.tables = parsed.tables;
      if (Array.isArray(parsed.history)) state.history = parsed.history;
      if (Array.isArray(parsed.cart)) state.cart = parsed.cart;
      if (parsed.selectedTable !== undefined) state.selectedTable = parsed.selectedTable;
      if (Array.isArray(parsed.favorites)) state.favorites = new Set(parsed.favorites);
      return true;
    }
  } catch (err) {
    console.warn("Error loading state from localStorage, falling back to defaults", err);
    seedBaselineOrders();
  }
  return false;
}

// Multi-Tab Synchronization
window.addEventListener("storage", (e) => {
  if (e.key === STORAGE_KEY && e.newValue) {
    try {
      const parsed = JSON.parse(e.newValue);
      if (parsed) {
        if (parsed.orders) state.orders = parsed.orders;
        if (parsed.tables) state.tables = parsed.tables;
        if (parsed.history) state.history = parsed.history;
        if (parsed.cart) state.cart = parsed.cart;
        if (parsed.selectedTable !== undefined) state.selectedTable = parsed.selectedTable;
        if (parsed.favorites) state.favorites = new Set(parsed.favorites);
        renderAll();
      }
    } catch (err) {}
  }
});

// ═══════════════════ TABLE STATUS SYNCHRONIZATION ═══════════════════
function syncTableStatuses() {
  const activeOrders = Object.values(state.orders);

  state.tables.forEach((table) => {
    const tableOrders = activeOrders.filter((o) => o.tableId === table.id);

    if (tableOrders.length === 0) {
      table.status = "available";
      table.currentOrderId = null;
    } else {
      // Prioritize active order statuses
      const hasPrep = tableOrders.some((o) => o.status === "queued" || o.status === "in-preparation");
      const hasReady = tableOrders.some((o) => o.status === "ready");
      const hasServed = tableOrders.some((o) => o.status === "served");

      if (hasPrep) {
        table.status = "preparing";
      } else if (hasReady) {
        table.status = "ready";
      } else if (hasServed) {
        table.status = "served";
      }
      table.currentOrderId = tableOrders[0].id;
    }
  });
}

function selectTable(tableId, rerender = true) {
  state.selectedTable = tableId === "takeout" ? "takeout" : Number(tableId);

  // Update Active Table Banner on menu
  const bannerName = $("#active-table-display");
  const bannerChip = $("#active-table-status-pill");
  const cartSelect = $("#cart-table-select");

  if (state.selectedTable === "takeout") {
    if (bannerName) bannerName.textContent = "Takeout / Food Truck Pick-up";
    if (bannerChip) {
      bannerChip.textContent = "Takeout";
      bannerChip.className = "table-status-pill pill-ready";
    }
    if (cartSelect) cartSelect.value = "takeout";
  } else {
    const table = state.tables.find((t) => t.id === state.selectedTable);
    if (table) {
      if (bannerName) bannerName.textContent = `${table.name} (${table.location} · ${table.capacity})`;
      if (bannerChip) {
        bannerChip.textContent = table.status.toUpperCase();
        bannerChip.className = `table-status-pill pill-${table.status.slice(0, 5)}`;
      }
      if (cartSelect) cartSelect.value = String(table.id);
    }
  }

  if (rerender) {
    renderFloorPlan();
    saveState();
  }
}

// ═══════════════════ FLOOR PLAN RENDERING ═══════════════════
function renderFloorPlan() {
  const floorGrid = $("#floor-tables-grid");
  const modalGrid = $("#modal-table-grid");
  syncTableStatuses();

  // Update Legend counters
  const countAvail = state.tables.filter((t) => t.status === "available").length;
  const countPrep = state.tables.filter((t) => t.status === "preparing").length;
  const countReady = state.tables.filter((t) => t.status === "ready").length;
  const countServed = state.tables.filter((t) => t.status === "served").length;

  const elAvail = $("#floor-count-avail");
  const elPrep = $("#floor-count-prep");
  const elReady = $("#floor-count-ready");
  const elServed = $("#floor-count-served");

  if (elAvail) elAvail.textContent = countAvail;
  if (elPrep) elPrep.textContent = countPrep;
  if (elReady) elReady.textContent = countReady;
  if (elServed) elServed.textContent = countServed;

  // Filter tables
  let tablesToShow = state.tables;
  if (state.floorFilter && state.floorFilter !== "all") {
    tablesToShow = state.tables.filter((t) => t.status === state.floorFilter);
  }

  const generateTableHtml = (t) => {
    const isSelected = state.selectedTable === t.id;
    const tableOrders = Object.values(state.orders).filter((o) => o.tableId === t.id);
    const hasOrder = tableOrders.length > 0;
    const activeOrder = tableOrders[0];

    let statusPillClass = "pill-avail";
    let statusLabel = "Available";
    let actionBtnClass = "btn-table-order";
    let actionBtnLabel = `+ Order for Table ${t.id}`;

    if (t.status === "preparing") {
      statusPillClass = "pill-prep";
      statusLabel = "In Prep";
      actionBtnClass = "btn-table-active";
      actionBtnLabel = `👨‍🍳 View Ticket (${timeAgo(activeOrder?.createdAt)})`;
    } else if (t.status === "ready") {
      statusPillClass = "pill-ready";
      statusLabel = "Ready to Serve";
      actionBtnClass = "btn-table-active";
      actionBtnLabel = `🛎️ Ready to Serve`;
    } else if (t.status === "served") {
      statusPillClass = "pill-served";
      statusLabel = "Served / Dining";
      actionBtnClass = "btn-table-settle";
      actionBtnLabel = `💳 Settle Bill (${formatCurrency(activeOrder?.total)})`;
    }

    let summaryHtml = `<div class="table-order-summary">Ready for diners · No active ticket</div>`;
    if (hasOrder && activeOrder) {
      const itemsSnippet = activeOrder.items.map((i) => `${i.qty}x ${i.name}`).join(", ");
      summaryHtml = `
        <div class="table-order-summary">
          <strong>#${activeOrder.id}:</strong> ${itemsSnippet}
          <div class="table-order-total">Total: ${formatCurrency(activeOrder.total)}</div>
        </div>
      `;
    }

    return `
      <div class="floor-table-card${isSelected ? " selected-table" : ""}" data-table-id="${t.id}">
        <div class="table-card-top">
          <div class="table-num-wrap">
            <span class="table-num-title">${t.name}</span>
            <span class="table-capacity-tag">${t.capacity}</span>
          </div>
          <span class="table-status-pill ${statusPillClass}">● ${statusLabel}</span>
        </div>
        <div class="table-card-body">
          <div style="font-size:0.75rem; color:#888; margin-bottom:4px;">📍 ${t.location}</div>
          ${summaryHtml}
        </div>
        <button class="table-btn-action ${actionBtnClass}" data-action-table="${t.id}" data-status="${t.status}">
          ${actionBtnLabel}
        </button>
      </div>
    `;
  };

  const html = tablesToShow.map(generateTableHtml).join("");
  if (floorGrid) floorGrid.innerHTML = html;
  if (modalGrid) modalGrid.innerHTML = html;
  // Note: Event delegation is registered once in initEventListeners, preventing listener duplication
}

function handleFloorGridClick(e) {
  // Check if an action button was clicked
  const actionBtn = e.target.closest("[data-action-table]");
  if (actionBtn) {
    e.stopPropagation();
    const tId = parseInt(actionBtn.dataset.actionTable, 10);
    const status = actionBtn.dataset.status;

    if (status === "served") {
      const order = Object.values(state.orders).find((o) => o.tableId === tId && o.status === "served");
      if (order) {
        settleBill(order.id);
        return;
      }
    }

    if (status === "preparing" || status === "ready") {
      toggleStaffMode();
      return;
    }

    // Select table and scroll to menu
    selectTable(tId);
    showToast(`Ordering for Table ${tId}! Browse menu below 🍽️`, "info");
    const menuSection = $("#menu");
    if (menuSection) menuSection.scrollIntoView({ behavior: "smooth" });
    return;
  }

  // Check if card itself was clicked
  const card = e.target.closest(".floor-table-card");
  if (card) {
    const tId = parseInt(card.dataset.tableId, 10);
    if (!isNaN(tId)) {
      selectTable(tId);
    }
  }
}

// ═══════════════════ PRODUCT GRID RENDERING ═══════════════════
function renderProductGrid() {
  const gridEl = $("#food-cards-grid");
  const countEl = $("#menu-total-count");
  const emptyState = $("#menu-empty-state");
  if (!gridEl) return;

  // 1. Filter by category
  let items = state.activeCategory === "All Items"
    ? [...MENU_ITEMS]
    : MENU_ITEMS.filter((i) => i.category === state.activeCategory);

  // 2. Filter by search term
  if (state.searchTerm && state.searchTerm.trim()) {
    const term = state.searchTerm.toLowerCase().trim();
    items = items.filter((i) =>
      i.name.toLowerCase().includes(term) ||
      (i.desc && i.desc.toLowerCase().includes(term)) ||
      i.category.toLowerCase().includes(term)
    );
  }

  // 3. Sort items
  if (state.activeSort === "popular") {
    items.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
  } else if (state.activeSort === "price-low") {
    items.sort((a, b) => a.price - b.price);
  } else if (state.activeSort === "price-high") {
    items.sort((a, b) => b.price - a.price);
  } else if (state.activeSort === "rating") {
    items.sort((a, b) => b.rating - a.rating);
  }

  if (countEl) countEl.textContent = state.activeCategory === "All Items" && !state.searchTerm ? "78" : items.length;

  if (items.length === 0) {
    gridEl.innerHTML = "";
    if (emptyState) emptyState.classList.remove("hidden");
    return;
  }

  if (emptyState) emptyState.classList.add("hidden");

  // 4-column cards
  gridEl.innerHTML = items.map((item) => {
    const isFav = state.favorites.has(item.id);
    const badgeHtml = item.badge
      ? `<span class="product-badge">${item.badge}</span>`
      : `<span class="badge-spacer"></span>`;

    return `
      <div class="product-card" data-id="${item.id}">
        <div class="product-card-top">
          ${badgeHtml}
          <button class="btn-fav${isFav ? " active" : ""}" data-fav-id="${item.id}" aria-label="Favorite ${item.name}" title="Toggle Favorite">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
        </div>

        <div class="product-img-wrap" data-action="custom" data-id="${item.id}">
          <img src="${item.image}" alt="${item.name}" class="product-img" loading="lazy" />
        </div>

        <h3 class="product-name" data-action="custom" data-id="${item.id}">${item.name}</h3>
        <p class="product-desc">${item.desc}</p>

        <div class="product-meta-row">
          <span class="product-rating">
            <span class="star-icon">★</span>
            <span>${item.rating}</span>
            <span class="review-count">(${item.reviews})</span>
          </span>
          <span class="product-time">
            <span class="clock-icon">🕒</span>
            <span>${item.prepTime}</span>
          </span>
        </div>

        <div class="product-bottom-row">
          <span class="product-price">${formatCurrency(item.price)}</span>
          <button class="btn-add-circle" data-action="quick-add" data-id="${item.id}" aria-label="Add ${item.name} to cart" title="Add to Cart">+</button>
        </div>
      </div>
    `;
  }).join("");
}

// ═══════════════════ CART SYSTEM & DRAWER ═══════════════════
function addToCart(itemId, qty = 1, spice = "Mild", extras = [], notes = "", unitPrice = null) {
  const item = MENU_ITEMS.find((m) => m.id === itemId);
  if (!item) return;

  const extrasCost = extras.reduce((sum, e) => sum + (e.price || 0), 0);
  const finalUnitPrice = unitPrice !== null ? unitPrice : (item.price + extrasCost);

  // Check if identical customization already exists in cart
  const extrasKey = extras.map((e) => e.name).sort().join("|");
  const existing = state.cart.find((c) =>
    c.itemId === itemId &&
    c.spice === spice &&
    c.notes === notes &&
    (c.extras || []).map((e) => e.name).sort().join("|") === extrasKey
  );

  if (existing) {
    existing.qty += qty;
  } else {
    state.cart.push({
      itemId,
      qty,
      spice,
      extras,
      notes,
      unitPrice: finalUnitPrice,
    });
  }

  updateCartBadge();
  renderCartDrawer();
  saveState();
}

function removeFromCart(index) {
  state.cart.splice(index, 1);
  updateCartBadge();
  renderCartDrawer();
  SoundSynth.playClick();
  saveState();
}

function updateCartQty(index, delta) {
  if (!state.cart[index]) return;
  state.cart[index].qty += delta;
  if (state.cart[index].qty <= 0) {
    removeFromCart(index);
    return;
  }
  SoundSynth.playClick();
  updateCartBadge();
  renderCartDrawer();
  saveState();
}

function updateCartBadge() {
  const totalQty = state.cart.reduce((sum, item) => sum + item.qty, 0);
  const badge = $("#cart-badge-count");
  const drawerCount = $("#cart-drawer-count");

  if (badge) {
    badge.textContent = totalQty;
    badge.style.display = totalQty > 0 ? "flex" : "none";
  }
  if (drawerCount) {
    drawerCount.textContent = `${totalQty} item${totalQty === 1 ? "" : "s"}`;
  }
}

function renderCartDrawer() {
  const listEl = $("#cart-items-list");
  const emptyEl = $("#cart-empty-message");
  const footerEl = $("#cart-drawer-footer");
  const subtotalEl = $("#cart-subtotal-val");
  const taxEl = $("#cart-tax-val");
  const totalEl = $("#cart-total-val");
  const checkoutLabel = $("#btn-checkout-label");

  if (!listEl) return;

  // Sync Cart dropdown value with state.selectedTable
  const cartSelect = $("#cart-table-select");
  if (cartSelect) {
    cartSelect.value = state.selectedTable === "takeout" ? "takeout" : String(state.selectedTable);
  }

  if (state.cart.length === 0) {
    listEl.innerHTML = "";
    if (emptyEl) emptyEl.classList.remove("hidden");
    if (footerEl) footerEl.style.display = "none";
    return;
  }

  if (emptyEl) emptyEl.classList.add("hidden");
  if (footerEl) footerEl.style.display = "flex";

  let subtotal = 0;

  listEl.innerHTML = state.cart.map((entry, idx) => {
    const item = MENU_ITEMS.find((m) => m.id === entry.itemId);
    if (!item) return "";

    const lineTotal = entry.unitPrice * entry.qty;
    subtotal += lineTotal;

    const extrasSnippet = (entry.extras || []).map((e) => `+ ${e.name} (${formatCurrency(e.price)})`).join(", ");
    const metaParts = [];
    if (entry.spice) metaParts.push(entry.spice);
    if (extrasSnippet) metaParts.push(extrasSnippet);
    if (entry.notes) metaParts.push(`"${entry.notes}"`);

    return `
      <div class="cart-item-row">
        <img src="${item.image}" alt="${item.name}" class="cart-item-thumb" />
        <div class="cart-item-info">
          <span class="cart-item-name">${item.name}</span>
          <span class="cart-item-meta">${metaParts.join(" · ") || "Standard preparation"}</span>
          <span class="cart-item-price">${formatCurrency(lineTotal)} <small style="font-weight:400; color:#888;">(${formatCurrency(entry.unitPrice)} ea)</small></span>
        </div>
        <div class="cart-stepper">
          <button class="cart-step-btn" data-cart-idx="${idx}" data-delta="-1" aria-label="Decrease quantity">−</button>
          <span class="cart-step-val">${entry.qty}</span>
          <button class="cart-step-btn" data-cart-idx="${idx}" data-delta="1" aria-label="Increase quantity">+</button>
        </div>
      </div>
    `;
  }).join("");

  const tax = subtotal * 0.0875;
  const grandTotal = subtotal + tax;

  if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
  if (taxEl) taxEl.textContent = formatCurrency(tax);
  if (totalEl) totalEl.textContent = formatCurrency(grandTotal);

  if (checkoutLabel) {
    checkoutLabel.textContent = state.selectedTable === "takeout"
      ? "Confirm Takeout Order"
      : `Send Order to Kitchen (Table ${state.selectedTable})`;
  }
}

function openCartDrawer() {
  const drawer = $("#cart-drawer");
  const backdrop = $("#cart-drawer-backdrop");
  if (drawer && backdrop) {
    drawer.classList.add("active");
    backdrop.classList.add("active");
    renderCartDrawer();
  }
}

function closeCartDrawer() {
  const drawer = $("#cart-drawer");
  const backdrop = $("#cart-drawer-backdrop");
  if (drawer && backdrop) {
    drawer.classList.remove("active");
    backdrop.classList.remove("active");
  }
}

// ═══════════════════ ITEM CUSTOMIZATION MODAL ═══════════════════
let currentCustomItem = null;
let currentCustomQty = 1;

function openItemModal(item) {
  currentCustomItem = item;
  currentCustomQty = 1;

  const overlay = $("#modal-overlay");
  const nameEl = $("#modal-item-name");
  const descEl = $("#modal-item-desc");
  const priceEl = $("#modal-item-price");
  const imgEl = $("#modal-item-img");
  const qtyEl = $("#qty-value");
  const notesEl = $("#kitchen-notes");

  if (nameEl) nameEl.textContent = item.name;
  if (descEl) descEl.textContent = item.desc;
  if (priceEl) priceEl.textContent = formatCurrency(item.price);
  if (imgEl) {
    imgEl.src = item.image;
    imgEl.alt = item.name;
  }
  if (qtyEl) qtyEl.textContent = "1";
  if (notesEl) notesEl.value = "";

  // Reset checkboxes
  $$("#extras-group input[type='checkbox']").forEach((cb) => (cb.checked = false));

  // Default mild spice
  const mildRadio = $('input[name="spice"][value="Mild"]');
  if (mildRadio) mildRadio.checked = true;

  if (overlay) overlay.classList.add("active");
}

function closeItemModal() {
  const overlay = $("#modal-overlay");
  if (overlay) overlay.classList.remove("active");
  currentCustomItem = null;
}

// ═══════════════════ RESERVATION MODAL ═══════════════════
function openReservationModal() {
  const overlay = $("#reservation-modal-overlay");
  if (overlay) {
    overlay.classList.add("active");

    const dateInput = $("#res-date");
    if (dateInput && !dateInput.value) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      dateInput.value = tomorrow.toISOString().split("T")[0];
    }
  }
}

function closeReservationModal() {
  const overlay = $("#reservation-modal-overlay");
  if (overlay) overlay.classList.remove("active");
}

// ═══════════════════ RECEIPT MODAL ═══════════════════
function openReceiptModal(order) {
  const overlay = $("#receipt-modal-overlay");
  if (!overlay) return;

  const recOrder = $("#rec-order");
  const recTable = $("#rec-table");
  const recDate = $("#rec-date");
  const itemsTable = $("#rec-items-table");
  const recSubtotal = $("#rec-subtotal");
  const recTax = $("#rec-tax");
  const recGrand = $("#rec-grand");

  if (recOrder) recOrder.textContent = order.id;
  if (recTable) {
    recTable.textContent = order.tableId
      ? `Table ${order.tableId} (Dine-In)`
      : "Takeout / Food Truck Pick-up";
  }
  if (recDate) {
    recDate.textContent = new Date(order.createdAt).toLocaleDateString() + " " +
      new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  if (itemsTable) {
    let sub = 0;
    itemsTable.innerHTML = order.items.map((i) => {
      const line = i.price * i.qty;
      sub += line;
      const extrasStr = (i.extras || []).map((e) => `+ ${e.name}`).join(", ");
      const customSubtext = [i.spice, extrasStr, i.notes ? `"${i.notes}"` : ""].filter(Boolean).join(" · ");

      return `
        <div class="rec-item-row" style="margin-bottom:6px;">
          <div>
            <div>${i.qty}x ${i.name}</div>
            ${customSubtext ? `<div style="font-size:0.68rem; color:#666;">${customSubtext}</div>` : ""}
          </div>
          <span style="font-weight:600;">${formatCurrency(line)}</span>
        </div>
      `;
    }).join("");

    const tax = order.tax !== undefined ? order.tax : (sub * 0.0875);
    const total = order.total !== undefined ? order.total : (sub + tax);

    if (recSubtotal) recSubtotal.textContent = formatCurrency(sub);
    if (recTax) recTax.textContent = formatCurrency(tax);
    if (recGrand) recGrand.textContent = formatCurrency(total);
  }

  overlay.classList.add("active");
  ConfettiEngine.burst();
}

function closeReceiptModal() {
  const overlay = $("#receipt-modal-overlay");
  if (overlay) overlay.classList.remove("active");
}

// ═══════════════════ STAFF KDS & POS OPERATIONS ═══════════════════
function toggleStaffMode() {
  const overlay = $("#staff-drawer-overlay");
  if (overlay) {
    overlay.classList.toggle("active");
    if (overlay.classList.contains("active")) {
      renderKDS();
      renderFloorPlan();
      renderBills();
      renderHistory();
    }
  }
}

function renderKDS() {
  const board = $("#kds-board");
  const empty = $("#kds-empty");
  const staffKdsBadge = $("#staff-kds-count");
  if (!board) return;

  const activeOrders = Object.values(state.orders).filter(
    (o) => o.status === "queued" || o.status === "in-preparation" || o.status === "ready"
  );

  if (staffKdsBadge) staffKdsBadge.textContent = activeOrders.length;

  let filtered = activeOrders;
  if (state.kdsFilter !== "all") {
    filtered = activeOrders.filter((o) => o.status === state.kdsFilter);
  }

  if (filtered.length === 0) {
    board.innerHTML = "";
    if (empty) empty.style.display = "block";
    return;
  }

  if (empty) empty.style.display = "none";

  board.innerHTML = filtered.map((ord) => {
    let tagClass = "kds-tag-queued";
    let nextAction = "Start Preparation";
    let nextStatus = "in-preparation";

    if (ord.status === "in-preparation") {
      tagClass = "kds-tag-prep";
      nextAction = "Mark Ready to Serve";
      nextStatus = "ready";
    } else if (ord.status === "ready") {
      tagClass = "kds-tag-ready";
      nextAction = "Confirm Served & Settle";
      nextStatus = "served";
    }

    const itemsHtml = ord.items.map((i) => {
      const extrasHtml = (i.extras || []).map((e) => `<span class="kds-tag-extra">+ ${e.name}</span>`).join("");
      const spiceHtml = i.spice ? `<span class="kds-tag-spice">${i.spice}</span>` : "";
      const noteHtml = i.notes ? `<div class="kds-note-box">📝 "${i.notes}"</div>` : "";

      return `
        <div style="border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:8px; margin-bottom:8px;">
          <div class="kds-item-line">
            <span><strong>${i.qty}x</strong> ${i.name}</span>
            <span>${formatCurrency(i.price * i.qty)}</span>
          </div>
          <div class="kds-custom-tags">${spiceHtml}${extrasHtml}</div>
          ${noteHtml}
        </div>
      `;
    }).join("");

    return `
      <div class="kds-ticket-card">
        <div class="kds-ticket-head">
          <div>
            <strong>#${ord.id}</strong>
            <div style="font-size:0.75rem; color:#A8A69E; margin-top:2px;">
              ${ord.tableId ? `📍 Table ${ord.tableId}` : "🥡 Takeout Pick-up"}
            </div>
            <div class="kds-ticket-time">🕒 ${timeAgo(ord.createdAt)}</div>
          </div>
          <span class="kds-tag-status ${tagClass}">${ord.status}</span>
        </div>
        <div class="kds-ticket-body">${itemsHtml}</div>
        <button class="kds-action-btn" data-order-id="${ord.id}" data-next="${nextStatus}">${nextAction} &rarr;</button>
      </div>
    `;
  }).join("");
}

function advanceOrderStatus(orderId, nextStatus) {
  const order = state.orders[orderId];
  if (!order) return;

  order.status = nextStatus;

  // Status transition toast feedback only - no audio loop or runaway beeps
  if (nextStatus === "served") {
    showToast(`Order #${orderId} marked served! Ready for check settlement.`, "success");
  } else if (nextStatus === "ready") {
    showToast(`Order #${orderId} is READY for service! 🛎️`, "info");
  } else if (nextStatus === "in-preparation") {
    showToast(`Order #${orderId} is now in preparation 👨‍🍳`, "info");
  }

  syncTableStatuses();
  renderKDS();
  renderFloorPlan();
  renderBills();
  saveState();
}

function renderBills() {
  const grid = $("#bills-grid");
  const empty = $("#bills-empty");
  const billsBadge = $("#staff-bills-count");
  if (!grid) return;

  const served = Object.values(state.orders).filter((o) => o.status === "served");
  if (billsBadge) billsBadge.textContent = served.length;

  if (served.length === 0) {
    grid.innerHTML = "";
    if (empty) empty.style.display = "block";
    return;
  }

  if (empty) empty.style.display = "none";

  grid.innerHTML = served.map((ord) => `
    <div class="bill-card">
      <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
        <strong>#${ord.id}</strong>
        <span style="font-weight:800; color:var(--accent-yellow); font-size:1.1rem;">${formatCurrency(ord.total)}</span>
      </div>
      <div style="font-size:0.75rem; color:#A8A69E; margin-bottom:12px;">
        ${ord.tableId ? `Table ${ord.tableId} · Dine-In` : "Takeout / Food Truck"} · Placed ${timeAgo(ord.createdAt)}
      </div>
      <button class="kds-action-btn" data-bill-id="${ord.id}">Settle &amp; Print Paid Receipt</button>
    </div>
  `).join("");
}

function settleBill(orderId) {
  const order = state.orders[orderId];
  if (!order) return;

  order.status = "settled";
  order.settledAt = Date.now();
  state.history.unshift(order);
  delete state.orders[orderId];

  // Sync table status so table is released back to available
  syncTableStatuses();

  showToast(`Bill #${orderId} settled in full! Table is now available. 🧾`, "success");

  renderKDS();
  renderFloorPlan();
  renderBills();
  renderHistory();
  saveState();

  openReceiptModal(order);
}

function renderHistory() {
  const tbody = $("#history-tbody");
  if (!tbody) return;

  if (state.history.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:24px; color:#888;">No orders settled yet</td></tr>`;
    return;
  }

  tbody.innerHTML = state.history.map((ord) => {
    const tableLabel = ord.tableId ? `Table ${ord.tableId}` : "Takeout";
    const itemsList = ord.items.map((i) => `${i.qty}x ${i.name}`).join(", ");
    const timeFormatted = new Date(ord.settledAt || ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `
      <tr>
        <td><strong>#${ord.id}</strong></td>
        <td>${tableLabel}</td>
        <td>${itemsList}</td>
        <td>${timeFormatted}</td>
        <td><strong>${formatCurrency(ord.total)}</strong></td>
        <td><button class="utility-btn" data-receipt-id="${ord.id}">View Receipt</button></td>
      </tr>
    `;
  }).join("");
}

// ═══════════════════ TOAST NOTIFICATIONS ═══════════════════
function showToast(msg, type = "success") {
  const container = $("#toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// ═══════════════════ CLOCK & LIVE TIMERS ═══════════════════
function startClock() {
  const clock = $("#header-clock");
  const update = () => {
    const d = new Date();
    if (clock) {
      clock.textContent = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    }
  };
  update();
  setInterval(update, 1000);

  // Periodic refresh of live elapsed timers on KDS tickets
  setInterval(() => {
    renderKDS();
  }, 30000);
}

// ═══════════════════ MASTER RENDER ═══════════════════
function renderAll() {
  updateCartBadge();
  renderProductGrid();
  renderFloorPlan();
  renderCartDrawer();
  renderKDS();
  renderBills();
  renderHistory();
  selectTable(state.selectedTable, false);
}

// ═══════════════════ EVENT LISTENERS & SETUP ═══════════════════
let isSubmittingOrder = false;

function initEventListeners() {
  // Navigation scrolling & active tab indicator
  $$(".nav-item").forEach((link) => {
    link.addEventListener("click", (e) => {
      const navTarget = link.dataset.nav;
      if (navTarget === "reservation") {
        e.preventDefault();
        openReservationModal();
        return;
      }
      $$(".nav-item").forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
    });
  });

  // Mobile menu hamburger
  const hamburger = $("#nav-mobile-toggle");
  const navMenu = $("#nav-links-list");
  if (hamburger && navMenu) {
    hamburger.addEventListener("click", () => {
      navMenu.classList.toggle("mobile-open");
    });
    $$(".nav-item").forEach((l) => {
      l.addEventListener("click", () => navMenu.classList.remove("mobile-open"));
    });
  }

  // Cart open / close buttons
  const btnOpenCart = $("#btn-open-cart");
  const btnCloseCart = $("#btn-close-cart");
  const backdropCart = $("#cart-drawer-backdrop");
  const btnBrowse = $("#btn-cart-browse-menu");

  if (btnOpenCart) btnOpenCart.addEventListener("click", openCartDrawer);
  if (btnCloseCart) btnCloseCart.addEventListener("click", closeCartDrawer);
  if (backdropCart) backdropCart.addEventListener("click", closeCartDrawer);
  if (btnBrowse) {
    btnBrowse.addEventListener("click", () => {
      closeCartDrawer();
      const menuEl = $("#menu");
      if (menuEl) menuEl.scrollIntoView({ behavior: "smooth" });
    });
  }

  // Cart Table Assignment Dropdown Change
  const cartSelect = $("#cart-table-select");
  if (cartSelect) {
    cartSelect.addEventListener("change", (e) => {
      selectTable(e.target.value);
      renderCartDrawer();
    });
  }

  // Checkout with Duplicate Protection
  const btnCheckout = $("#btn-cart-checkout");
  if (btnCheckout) {
    btnCheckout.addEventListener("click", () => {
      if (isSubmittingOrder) return;
      if (state.cart.length === 0) return;

      isSubmittingOrder = true;
      btnCheckout.disabled = true;
      btnCheckout.textContent = "Sending Order to Kitchen...";

      try {
        const orderId = genId();
        let subtotal = 0;

        // Fully preserve item customizations, extras with prices, and kitchen notes
        const orderItems = state.cart.map((entry) => {
          const item = MENU_ITEMS.find((m) => m.id === entry.itemId);
          const lineTotal = entry.unitPrice * entry.qty;
          subtotal += lineTotal;

          return {
            name: item.name,
            price: entry.unitPrice,
            basePrice: item.price,
            qty: entry.qty,
            spice: entry.spice || "Mild",
            extras: entry.extras || [],
            notes: entry.notes || "",
          };
        });

        const tax = subtotal * 0.0875;
        const total = subtotal + tax;
        const isDineIn = state.selectedTable !== "takeout";
        const tableId = isDineIn ? Number(state.selectedTable) : null;

        const order = {
          id: orderId,
          tableId: tableId,
          createdAt: Date.now(),
          status: "queued",
          items: orderItems,
          subtotal: subtotal,
          tax: tax,
          total: total,
        };

        state.orders[orderId] = order;

        // Update table status if dine-in
        if (isDineIn) {
          const table = state.tables.find((t) => t.id === tableId);
          if (table) {
            table.status = "preparing";
            table.currentOrderId = orderId;
          }
        }

        // Clear cart
        state.cart = [];
        updateCartBadge();
        renderCartDrawer();
        closeCartDrawer();
        syncTableStatuses();
        renderFloorPlan();
        renderKDS();
        saveState();

        SoundSynth.playOrderSent();
        ConfettiEngine.burst();
        showToast(`Order #${orderId} sent to kitchen for ${isDineIn ? `Table ${tableId}` : "Takeout"}! 👨‍🍳`, "success");
        openReceiptModal(order);
      } finally {
        setTimeout(() => {
          isSubmittingOrder = false;
          if (btnCheckout) {
            btnCheckout.disabled = false;
            btnCheckout.innerHTML = `<span>Send Order to Kitchen</span><span class="checkout-arrow">&rarr;</span>`;
          }
        }, 1200);
      }
    });
  }

  // Reservation open buttons
  const btnHeroRes = $("#btn-hero-reservation");
  const btnCloseRes = $("#reservation-modal-close");
  const overlayRes = $("#reservation-modal-overlay");
  const footerResLink = $("#footer-reservation-link");

  if (btnHeroRes) btnHeroRes.addEventListener("click", openReservationModal);
  if (footerResLink) {
    footerResLink.addEventListener("click", (e) => {
      e.preventDefault();
      openReservationModal();
    });
  }
  if (btnCloseRes) btnCloseRes.addEventListener("click", closeReservationModal);
  if (overlayRes) {
    overlayRes.addEventListener("click", (e) => {
      if (e.target === overlayRes) closeReservationModal();
    });
  }

  // Reservation Form Submit Handler
  const resForm = $("#reservation-form");
  if (resForm) {
    resForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("#res-name").value.trim();
      const phone = $("#res-phone").value.trim();
      const email = $("#res-email").value.trim();
      const guests = $("#res-guests").value;
      const date = $("#res-date").value;
      const time = $("#res-time").value;

      if (!name || !phone || !email || !date) {
        showToast("Please fill in all required fields", "info");
        return;
      }

      SoundSynth.playOrderSent();
      ConfettiEngine.burst();
      closeReservationModal();
      showToast(`Reservation confirmed for ${name} (${guests} guests on ${date} at ${time})! 🎉`, "success");
      resForm.reset();
    });
  }

  // Customization modal handlers
  const btnCloseModal = $("#modal-close");
  const overlayModal = $("#modal-overlay");
  const qtyPlus = $("#qty-plus");
  const qtyMinus = $("#qty-minus");
  const btnAddToOrder = $("#btn-add-to-order");

  if (btnCloseModal) btnCloseModal.addEventListener("click", closeItemModal);
  if (overlayModal) {
    overlayModal.addEventListener("click", (e) => {
      if (e.target === overlayModal) closeItemModal();
    });
  }
  if (qtyPlus) {
    qtyPlus.addEventListener("click", () => {
      currentCustomQty++;
      $("#qty-value").textContent = currentCustomQty;
      SoundSynth.playClick();
    });
  }
  if (qtyMinus) {
    qtyMinus.addEventListener("click", () => {
      if (currentCustomQty > 1) {
        currentCustomQty--;
        $("#qty-value").textContent = currentCustomQty;
        SoundSynth.playClick();
      }
    });
  }
  if (btnAddToOrder) {
    btnAddToOrder.addEventListener("click", () => {
      if (!currentCustomItem) return;
      const spice = $('input[name="spice"]:checked')?.value || "Mild";
      const notes = $("#kitchen-notes")?.value.trim() || "";

      // Read selected extras and prices
      const extras = [];
      $$("#extras-group input[type='checkbox']:checked").forEach((cb) => {
        let price = 0.50;
        if (cb.value.includes("Cheddar")) price = 1.00;
        extras.push({ name: cb.value, price: price });
      });

      addToCart(currentCustomItem.id, currentCustomQty, spice, extras, notes);
      SoundSynth.playItemAdded();
      showToast(`Added ${currentCustomQty}x ${currentCustomItem.name} to order! 🛍️`, "success");
      closeItemModal();
    });
  }

  // Receipt modal close & print
  const btnCloseRec = $("#receipt-modal-close");
  const overlayRec = $("#receipt-modal-overlay");
  const btnPrintRec = $("#btn-print-receipt");

  if (btnCloseRec) btnCloseRec.addEventListener("click", closeReceiptModal);
  if (overlayRec) {
    overlayRec.addEventListener("click", (e) => {
      if (e.target === overlayRec) closeReceiptModal();
    });
  }
  if (btnPrintRec) {
    btnPrintRec.addEventListener("click", () => {
      window.print();
    });
  }

  // Category filter tabs
  $$(".category-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      $$(".category-pill").forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      state.activeCategory = pill.dataset.category;
      renderProductGrid();
    });
  });

  // Search input & clear button
  const searchInput = $("#menu-search-input");
  const searchClear = $("#menu-search-clear");
  const resetFiltersBtn = $("#btn-reset-filters");

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      state.searchTerm = e.target.value;
      if (searchClear) searchClear.classList.toggle("hidden", !e.target.value);
      renderProductGrid();
    });
  }

  if (searchClear) {
    searchClear.addEventListener("click", () => {
      searchInput.value = "";
      state.searchTerm = "";
      searchClear.classList.add("hidden");
      renderProductGrid();
    });
  }

  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener("click", () => {
      state.searchTerm = "";
      state.activeCategory = "All Items";
      if (searchInput) searchInput.value = "";
      if (searchClear) searchClear.classList.add("hidden");
      $$(".category-pill").forEach((p) => p.classList.toggle("active", p.dataset.category === "All Items"));
      renderProductGrid();
    });
  }

  // Nav Search button focus
  const navSearchBtn = $("#nav-search-btn");
  if (navSearchBtn) {
    navSearchBtn.addEventListener("click", () => {
      const menuSection = $("#menu");
      if (menuSection) menuSection.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => {
        if (searchInput) searchInput.focus();
      }, 500);
    });
  }

  // Sort dropdown handling
  const sortBtn = $("#sort-dropdown-btn");
  const sortWrap = $("#sort-dropdown-wrap");
  const currentSortLabel = $("#current-sort-label");

  if (sortBtn && sortWrap) {
    sortBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      sortWrap.classList.toggle("open");
    });

    document.addEventListener("click", () => {
      sortWrap.classList.remove("open");
    });

    $$(".sort-option").forEach((opt) => {
      opt.addEventListener("click", (e) => {
        e.stopPropagation();
        $$(".sort-option").forEach((o) => o.classList.remove("active"));
        opt.classList.add("active");
        state.activeSort = opt.dataset.sort;
        if (currentSortLabel) currentSortLabel.textContent = opt.textContent;
        sortWrap.classList.remove("open");
        renderProductGrid();
      });
    });
  }

  // Staff Mode Toggle
  const btnToggleStaff = $("#btn-toggle-staff-mode");
  const btnCloseStaff = $("#btn-close-staff-mode");
  if (btnToggleStaff) btnToggleStaff.addEventListener("click", toggleStaffMode);
  if (btnCloseStaff) btnCloseStaff.addEventListener("click", toggleStaffMode);

  // Staff Subtabs
  $$(".staff-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".staff-tab-btn").forEach((b) => b.classList.remove("active"));
      $$(".staff-subview").forEach((v) => v.classList.remove("active"));

      btn.classList.add("active");
      const target = btn.dataset.staffView;
      const viewEl = $(`#staff-view-${target}`);
      if (viewEl) viewEl.classList.add("active");
    });
  });

  // Floor Plan Tables Grid (main page & modal) - Delegated click handlers
  const floorGrid = $("#floor-tables-grid");
  if (floorGrid) floorGrid.addEventListener("click", handleFloorGridClick);
  const modalGrid = $("#modal-table-grid");
  if (modalGrid) modalGrid.addEventListener("click", handleFloorGridClick);

  // Floor Plan Filter Chips (All, Available, In Prep, Ready, Served) - One-time attachment, silent state navigation
  const floorFilterChips = $$("[data-floor-filter]");
  floorFilterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      floorFilterChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      state.floorFilter = chip.dataset.floorFilter;
      renderFloorPlan();
    });
  });

  // KDS Filter Chips - One-time attachment, silent queue navigation
  const kdsFilterChips = $$("[data-kds-filter]");
  kdsFilterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      kdsFilterChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      state.kdsFilter = chip.dataset.kdsFilter;
      renderKDS();
    });
  });

  // KDS Action Buttons Event Delegation (#kds-board)
  const kdsBoard = $("#kds-board");
  if (kdsBoard) {
    kdsBoard.addEventListener("click", (e) => {
      const btn = e.target.closest(".kds-action-btn");
      if (btn && btn.dataset.orderId && btn.dataset.next) {
        advanceOrderStatus(btn.dataset.orderId, btn.dataset.next);
      }
    });
  }

  // Bills Grid Event Delegation (#bills-grid)
  const billsGrid = $("#bills-grid");
  if (billsGrid) {
    billsGrid.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-bill-id]");
      if (btn && btn.dataset.billId) {
        settleBill(btn.dataset.billId);
      }
    });
  }

  // History Table Event Delegation (#history-tbody)
  const historyTbody = $("#history-tbody");
  if (historyTbody) {
    historyTbody.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-receipt-id]");
      if (btn && btn.dataset.receiptId) {
        const ord = state.history.find((h) => h.id === btn.dataset.receiptId);
        if (ord) openReceiptModal(ord);
      }
    });
  }

  // Cart Stepper Event Delegation (#cart-items-list)
  const cartList = $("#cart-items-list");
  if (cartList) {
    cartList.addEventListener("click", (e) => {
      const btn = e.target.closest(".cart-step-btn");
      if (btn && btn.dataset.cartIdx !== undefined && btn.dataset.delta !== undefined) {
        const idx = parseInt(btn.dataset.cartIdx, 10);
        const delta = parseInt(btn.dataset.delta, 10);
        updateCartQty(idx, delta);
      }
    });
  }

  // Product Grid Event Delegation (#food-cards-grid)
  const foodGrid = $("#food-cards-grid");
  if (foodGrid) {
    foodGrid.addEventListener("click", (e) => {
      const favBtn = e.target.closest(".btn-fav");
      if (favBtn) {
        e.stopPropagation();
        const id = favBtn.dataset.favId;
        if (state.favorites.has(id)) {
          state.favorites.delete(id);
          favBtn.classList.remove("active");
          showToast("Removed from favorites", "info");
        } else {
          state.favorites.add(id);
          favBtn.classList.add("active");
          showToast("Added to favorites! ❤️", "success");
        }
        saveState();
        return;
      }

      const addBtn = e.target.closest(".btn-add-circle");
      if (addBtn) {
        e.stopPropagation();
        const id = addBtn.dataset.id;
        const item = MENU_ITEMS.find((m) => m.id === id);
        if (!item) return;
        addToCart(item.id, 1, "Mild", [], "", item.price);
        SoundSynth.playItemAdded();
        showToast(`Added ${item.name} to order! 🛍️`, "success");
        return;
      }

      const customEl = e.target.closest("[data-action='custom']");
      if (customEl) {
        const id = customEl.dataset.id;
        const item = MENU_ITEMS.find((m) => m.id === id);
        if (item) openItemModal(item);
      }
    });
  }

  // Sound toggle button in utility bar
  const soundToggle = $("#sound-toggle");
  if (soundToggle) soundToggle.addEventListener("click", () => SoundSynth.toggle());

  // Demo reset
  const btnReset = $("#btn-reset-demo");
  if (btnReset) {
    btnReset.addEventListener("click", () => {
      localStorage.removeItem(STORAGE_KEY);
      state.cart = [
        { itemId: "bg-1", qty: 1, spice: "Mild", extras: [{ name: "Cheddar Slice", price: 1.00 }], notes: "Extra crispy edges", unitPrice: 9.99 },
        { itemId: "bg-5", qty: 1, spice: "Shichimi 🔥", extras: [], notes: "", unitPrice: 12.49 },
        { itemId: "bg-4", qty: 1, spice: "Mild", extras: [], notes: "Less ice please", unitPrice: 4.49 },
      ];
      state.orders = {};
      state.history = [];
      state.tables = JSON.parse(JSON.stringify(INITIAL_TABLES));
      state.selectedTable = 1;
      state.activeCategory = "All Items";
      state.activeSort = "popular";
      state.searchTerm = "";

      seedBaselineOrders();
      renderAll();
      saveState();

      SoundSynth.playTone(440, "sine", 0.1);
      showToast("Demo state reset to reference defaults! ↺", "info");
    });
  }
}

// ═══════════════════ APPLICATION INITIALIZATION ═══════════════════
document.addEventListener("DOMContentLoaded", () => {
  SoundSynth.initMuteState();
  AmbientEngine.init();
  ConfettiEngine.init();
  startClock();
  loadState();
  initEventListeners();
  renderAll();
});
