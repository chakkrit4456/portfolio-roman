import Lenis from "lenis";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));
const NS = "http://www.w3.org/2000/svg";

/* =========================================================
   1) Smooth scroll
   ========================================================= */
const lenis = reduceMotion ? null : new Lenis({ duration: 1.3, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });

document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const target = document.querySelector(a.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: -64, duration: 1.6 });
    else target.scrollIntoView();
  });
});

/* =========================================================
   2) ภาพแนวแกะพิมพ์ (สร้างด้วยโค้ด)
   ========================================================= */
// --- เมฆแบบ dither (Bayer 8x8) ---
function makeNoise(seed) {
  const hash = (x, y) => {
    let h = (x * 374761393 + y * 668265263 + seed * 144269504) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const smooth = (t) => t * t * (3 - 2 * t);
  const value = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = smooth(x - xi), yf = smooth(y - yi);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
  return (x, y) => {
    let v = 0, amp = 0.5, f = 1;
    for (let o = 0; o < 5; o++) { v += value(x * f, y * f) * amp; f *= 2; amp *= 0.5; }
    return v;
  };
}
const BAYER = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21].map((v) => (v + 0.5) / 64);

function drawDither(canvas) {
  const box = canvas.parentElement.getBoundingClientRect();
  const px = +canvas.dataset.px || (window.innerWidth < 720 ? 3 : 2); // ขนาดจุด dither (มือถือใช้จุดใหญ่ขึ้น = เร็วขึ้น)
  const w = Math.max(40, Math.round(box.width / px)), h = Math.max(40, Math.round(box.height / px));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(w, h);
  const noise = makeNoise(+canvas.dataset.seed || 1);
  const bank = canvas.dataset.mode === "bank";
  const drift = canvas.dataset.mode === "drift";
  const sc = drift ? 3 / w : 5 / Math.max(w, h);
  const [cr, cg, cb] = canvas.dataset.ink === "blue" ? [8, 71, 196] : [255, 255, 255];
  for (let y = 0; y < h; y++) {
    const ny = y / h;
    for (let x = 0; x < w; x++) {
      let v = noise(x * sc * (bank ? 1.4 : 1), y * sc * (bank ? 2.2 : 1.2));
      if (bank) v = (v - 0.4) * 2.4 - (1 - ny) * 1.6 + 0.35;             // กองเมฆด้านล่าง
      else if (drift) v = (v - 0.55) * 3.5;                              // เมฆบางๆ กระจายทั้งหน้า
      else v = (v - 0.5) * 2.6 * (0.3 + 0.7 * Math.sin(ny * Math.PI)); // เมฆกระจายกลางภาพ
      const on = v > BAYER[(y & 7) * 8 + (x & 7)];
      const i = (y * w + x) * 4;
      img.data[i] = cr; img.data[i + 1] = cg; img.data[i + 2] = cb;
      img.data[i + 3] = on ? 235 : 0;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// --- รังสีแผ่ออก + มัดเส้น (วาดลง canvas ครั้งเดียว แล้วหมุนด้วย CSS บน GPU) ---
function drawRays(canvas) {
  const box = canvas.parentElement.getBoundingClientRect();
  const size = Math.ceil(Math.max(box.width, box.height) * 1.15);
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  canvas.width = canvas.height = Math.round(size * dpr);
  Object.assign(canvas.style, { position: "absolute", width: size + "px", height: size + "px", left: "50%", top: "50%", margin: `${-size / 2}px 0 0 ${-size / 2}px` });
  const ctx = canvas.getContext("2d");
  const k = (size * dpr) / 1000; // วาดในพิกัด -500..500
  ctx.setTransform(k, 0, 0, k, (size * dpr) / 2, (size * dpr) / 2);
  ctx.strokeStyle = "#fff";
  ctx.globalAlpha = 0.75;
  ctx.lineWidth = 1.2 / k * Math.min(k, 1.2);
  ctx.beginPath();
  for (let i = 0; i < 180; i++) {
    const ang = (i / 180) * Math.PI * 2, r0 = 170, r1 = i % 2 ? 300 : 330;
    ctx.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0);
    ctx.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
  }
  ctx.stroke();
  ctx.globalAlpha = 0.45;
  ctx.lineWidth *= 0.7;
  ctx.beginPath();
  [[-260, -300, 0.6], [280, -260, 2.4], [-300, 240, -0.9], [250, 300, 3.8]].forEach(([cx, cy, dir]) => {
    for (let i = 0; i < 26; i++) {
      const ang = dir + (i / 26 - 0.5) * 0.9, len = 260 + (i % 5) * 40;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
    }
  });
  ctx.stroke();
}

// --- ปีกเฮอร์มีสแบบลายเส้น ---
function drawWing(svg) {
  const g = document.createElementNS(NS, "g");
  g.setAttribute("fill", "#0b0b0d");
  g.setAttribute("stroke", "#fff");
  g.setAttribute("stroke-linejoin", "round");
  const sx = 110, sy = 300; // โคนปีก
  const rows = [
    { n: 11, len: [320, 170], w: 34, spread: [-0.95, -0.12] }, // ขนปีกหลัก
    { n: 10, len: [200, 115], w: 28, spread: [-0.85, -0.1] },
    { n: 9, len: [120, 75], w: 22, spread: [-0.75, -0.05] },
  ];
  rows.forEach((row, ri) => {
    for (let i = 0; i < row.n; i++) {
      const t = i / (row.n - 1);
      const a = row.spread[0] + (row.spread[1] - row.spread[0]) * t;
      const L = row.len[0] + (row.len[1] - row.len[0]) * t;
      const bx = sx + ri * 18 + t * 40, by = sy - ri * 10 - t * 12;
      const ex = bx + Math.cos(a) * L, ey = by + Math.sin(a) * L;
      const nx = -Math.sin(a) * row.w, ny = Math.cos(a) * row.w;
      const mx = (bx + ex) / 2, my = (by + ey) / 2;
      const feather = document.createElementNS(NS, "path");
      feather.setAttribute("d", `M${bx} ${by} Q${mx + nx} ${my + ny} ${ex} ${ey} Q${mx - nx * 0.4} ${my - ny * 0.4} ${bx} ${by} Z`);
      feather.setAttribute("stroke-width", "1.3");
      g.appendChild(feather);
      // เส้นแรเงา
      const hatch = document.createElementNS(NS, "path");
      let hd = `M${bx} ${by}L${ex} ${ey}`;
      for (let k = 1; k < 8; k++) {
        const u = k / 8, px = bx + (ex - bx) * u, py = by + (ey - by) * u;
        hd += `M${px} ${py}l${(nx * 0.7 * (1 - u * 0.5)).toFixed(1)} ${(ny * 0.7 * (1 - u * 0.5)).toFixed(1)}`;
      }
      hatch.setAttribute("d", hd);
      hatch.setAttribute("stroke-width", ".6");
      hatch.setAttribute("opacity", ".7");
      hatch.setAttribute("fill", "none");
      g.appendChild(hatch);
    }
  });
  svg.appendChild(g);
  return g;
}

// --- เสาไอโอนิกลายเส้น ---
function drawColumn(svg) {
  const s = (d, w = 1.2, o = 1) => `<path d="${d}" fill="none" stroke="#fff" stroke-width="${w}" opacity="${o}"/>`;
  let out = "";
  out += s("M60 70 H240 V88 H60 Z", 1.4);                               // abacus
  out += s("M80 88 Q70 110 92 118 Q110 122 110 104 M220 88 Q230 110 208 118 Q190 122 190 104", 1.4); // volute
  out += s("M88 118 H212 L204 132 H96 Z", 1.2);
  for (let i = 0; i <= 10; i++) {                                       // flutes
    const x = 100 + i * 10;
    out += s(`M${x} 132 L${x - 2} 440`, i === 0 || i === 10 ? 1.4 : 0.8, i === 0 || i === 10 ? 1 : 0.7);
  }
  for (let y = 140; y < 440; y += 7) out += s(`M${160 + (y % 14)} ${y} l36 -3`, 0.5, 0.18); // แรเงาด้านขวา
  out += s("M90 440 H210 L218 456 H82 Z", 1.3);
  out += s("M70 456 H230 V474 H70 Z", 1.4);
  out += s("M40 474 H260 V490 H40 Z", 1.4);
  svg.innerHTML = out;
}

const drawAll = () => {
  document.querySelectorAll("canvas.dither").forEach(drawDither);
  document.querySelectorAll("canvas.rays").forEach(drawRays);
};
drawAll();
drawWing(document.getElementById("wing"));
drawColumn(document.getElementById("columnArt"));

// วาดใหม่เฉพาะตอนความกว้างเปลี่ยน (มือถือ: แถบที่อยู่ของเบราว์เซอร์ยืด/หดจะเปลี่ยนแค่ความสูง ไม่ต้องวาดใหม่)
let lastW = window.innerWidth, resizeT;
window.addEventListener("resize", () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => {
    const widthChanged = window.innerWidth !== lastW;
    lastW = window.innerWidth;
    measure();
    if (widthChanged) { drawAll(); drawDither(bgCloud.canvas); }
  }, 200);
});

/* =========================================================
   3) Parallax + loop
   - ตำแหน่งแต่ละ section ถูกวัดเก็บไว้ครั้งเดียว (ไม่อ่าน layout ทุกเฟรม)
   - ในลูปมีแต่การเขียน transform -> GPU composite อย่างเดียว
   ========================================================= */
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const heroLayers = [...document.querySelectorAll("#heroArt .art-layer")].map((el) => ({ el, depth: +el.dataset.depth, last: "" }));
const speedLayers = [...document.querySelectorAll(".art-layer[data-speed]")].map((el) => ({
  el, speed: +el.dataset.speed, host: el.parentElement, top: 0, h: 0, last: "",
}));
const progressBar = document.querySelector(".progress span");
const nav = document.querySelector(".nav");
const layout = { vh: window.innerHeight, max: 1 };

// --- พื้นหลังทั้งหน้า: จุดกริด + เมฆ dither + ลวดลายลายเส้น แต่ละชิ้นเลื่อนด้วยความลึกต่างกัน ---
const GRID = 44; // ต้องตรงกับ background-size ของ .bg-grid
const PARKED = "translate3d(0, -200vh, 0)";
const bgHost = document.getElementById("bgParallax");
const bgGrid = { el: bgHost.querySelector(".bg-grid"), last: "" };
const bgCloud = { el: bgHost.querySelector(".bg-cloud"), canvas: bgHost.querySelector(".bg-dither"), depth: 0.2, last: "" };

const ring = (r, extra = "") => `<circle r="${r}" ${extra}/>`;
const spokes = (n, r0, r1, alt = r1) => {
  let d = "";
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, r = i % 2 ? alt : r1, c = Math.cos(a), sn = Math.sin(a);
    d += `M${(c * r0).toFixed(1)} ${(sn * r0).toFixed(1)}L${(c * r).toFixed(1)} ${(sn * r).toFixed(1)}`;
  }
  return `<path d="${d}"/>`;
};
const ORNAMENTS = {
  astrolabe: () => ring(96) + ring(82) + ring(60, 'stroke-dasharray="2 5"') + ring(34) + spokes(72, 82, 90, 86) + spokes(12, 82, 96) + spokes(4, 0, 60),
  burst: () => ring(22) + spokes(60, 30, 96, 62),
  orbit: () => [0, 60, 120].map((a) => `<ellipse rx="96" ry="36" transform="rotate(${a})"/>`).join("") + ring(8) + '<circle cx="96" r="2.5" fill="currentColor"/>',
  mark: () => ring(40) + spokes(4, 14, 96),
};
// [ลาย, x%, ตำแหน่งตามความยาวหน้า 0..1, ความลึก, ขนาด, สีน้ำเงิน?, องศาหมุนต่อ px ที่เลื่อน]
const bgOrns = [
  ["astrolabe", 88, 0.1, 0.12, "clamp(220px, 38vw, 560px)", false, 0.02],
  ["mark", 22, 0.2, 0.4, "clamp(56px, 8vw, 110px)", true, 0.05],
  ["burst", 6, 0.3, 0.22, "clamp(160px, 26vw, 380px)", true, -0.03],
  ["mark", 70, 0.45, 0.35, "clamp(56px, 8vw, 110px)", false, -0.05],
  ["orbit", 12, 0.62, 0.12, "clamp(240px, 40vw, 600px)", false, 0.015],
  ["mark", 40, 0.7, 0.45, "clamp(48px, 6vw, 90px)", true, 0.06],
  ["astrolabe", 94, 0.78, 0.3, "clamp(180px, 28vw, 420px)", true, -0.02],
  ["burst", 52, 0.93, 0.18, "clamp(180px, 30vw, 440px)", false, 0.025],
].map(([type, x, at, depth, size, blue, rot]) => {
  const el = document.createElement("div");
  el.className = `bg-orn${blue ? " blue" : ""}`;
  el.style.cssText = `left:${x}%;--s:${size}`;
  el.innerHTML = `<svg viewBox="-100 -100 200 200">${ORNAMENTS[type]()}</svg>`;
  bgHost.appendChild(el);
  return { el, at, depth, rot, r: 0, base: 0, last: "" };
});

function measure() {
  layout.vh = window.innerHeight;
  layout.max = Math.max(1, document.documentElement.scrollHeight - layout.vh);
  const sy = window.scrollY;
  speedLayers.forEach((l) => {
    const r = l.host.getBoundingClientRect();
    l.top = r.top + sy;
    l.h = r.height;
  });
  bgOrns.forEach((o) => {
    o.r = o.el.offsetWidth / 2;
    o.base = o.at * (layout.vh + layout.max * o.depth);
  });
  // ชั้นเมฆต้องสูงพอให้เลื่อนได้จนสุดหน้า
  bgCloud.el.style.height = `${Math.ceil(layout.vh + layout.max * bgCloud.depth)}px`;
  lastY = -1; // บังคับให้เฟรมถัดไปคำนวณตำแหน่งใหม่
}
let lastY = -1;
measure();
drawDither(bgCloud.canvas);
bgHost.classList.add("ready");
new ResizeObserver(() => measure()).observe(document.body);
window.addEventListener("load", measure);

const mouse = { x: 0, y: 0 }, s = { x: 0, y: 0 };
if (finePointer) {
  window.addEventListener("pointermove", (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
}

const setT = (o, v) => { if (o.last !== v) { o.el.style.transform = v; o.last = v; } };
let last = performance.now(), navHidden = false, prevScroll = 0;

function frame(now) {
  requestAnimationFrame(frame);
  lenis?.raf(now);
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;

  const y = window.scrollY;
  const { vh, max } = layout;
  s.x = damp(s.x, mouse.x, 4, dt);
  s.y = damp(s.y, mouse.y, 4, dt);
  const mouseMoving = Math.abs(s.x - mouse.x) + Math.abs(s.y - mouse.y) > 0.0005;
  if (y === lastY && !mouseMoving) return; // ไม่มีอะไรเปลี่ยน ไม่ต้องทำงาน
  lastY = y;

  progressBar.style.transform = `scaleX(${(y / max).toFixed(4)})`;

  // ซ่อนเมนูตอนเลื่อนลง แสดงตอนเลื่อนขึ้น
  if (Math.abs(y - prevScroll) > 4) {
    const hide = y > prevScroll && y > 200 && !nav.classList.contains("open");
    if (hide !== navHidden) { nav.classList.toggle("hidden", hide); navHidden = hide; }
    prevScroll = y;
  }

  // พื้นหลังทั้งหน้า: กริดวนซ้ำทุก 1 ช่อง, เมฆและลวดลายเลื่อนช้ากว่าเนื้อหาตามความลึก
  setT(bgGrid, `translate3d(0, ${(-(y * 0.06) % GRID).toFixed(1)}px, 0)`);
  setT(bgCloud, `translate3d(${(-s.x * 14).toFixed(1)}px, ${(-y * bgCloud.depth).toFixed(1)}px, 0)`);
  bgOrns.forEach((o) => {
    const top = o.base - y * o.depth;
    if (top < -o.r || top > vh + o.r) return setT(o, PARKED);
    setT(o, `translate3d(${(-s.x * o.depth * 60).toFixed(1)}px, ${top.toFixed(1)}px, 0) rotate(${(y * o.rot).toFixed(2)}deg)`);
  });

  // Hero: แต่ละชั้นขยับตามเมาส์ + การเลื่อนด้วยความลึกต่างกัน
  if (y < vh * 1.3) {
    heroLayers.forEach((l) => {
      setT(l, `translate3d(${(-s.x * l.depth * 28).toFixed(1)}px, ${(y * l.depth * 0.25 - s.y * l.depth * 22).toFixed(1)}px, 0)`);
    });
  }

  // Section อื่น: เลื่อนตามตำแหน่งบนจอ (ใช้ค่าที่วัดเก็บไว้)
  speedLayers.forEach((l) => {
    const top = l.top - y;
    if (top + l.h < -200 || top > vh + 200) return;
    const rel = top + l.h / 2 - vh / 2;
    setT(l, `translate3d(${(-s.x * 12).toFixed(1)}px, ${(rel * l.speed).toFixed(1)}px, 0)`);
  });
}
requestAnimationFrame(frame);

// หยุด CSS animation ของส่วนที่อยู่นอกจอ ประหยัดแบตมือถือ
const visIO = new IntersectionObserver((entries) => entries.forEach((en) => en.target.classList.toggle("offscreen", !en.isIntersecting)));
document.querySelectorAll(".hero-art, .contact, .ticker").forEach((el) => visIO.observe(el));

/* =========================================================
   4) UI
   ========================================================= */
// เมนูมือถือ
const burger = document.querySelector(".burger");
burger.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  burger.setAttribute("aria-expanded", open);
  if (open) { nav.classList.remove("hidden"); navHidden = false; }
});
document.querySelectorAll(".mobile-menu a").forEach((a) => a.addEventListener("click", () => {
  nav.classList.remove("open");
  burger.setAttribute("aria-expanded", "false");
}));

const io = new IntersectionObserver(
  (entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add("visible");
    // ล้าง delay หลังโผล่ครบ เพื่อให้ hover ตอบสนองทันที
    if (en.target.style.transitionDelay) setTimeout(() => (en.target.style.transitionDelay = ""), 1600);
    en.target.querySelectorAll("[data-count]").forEach(countUp);
    io.unobserve(en.target);
  }),
  { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
);
// TECH STACK: แยกตัวอักษรหัวข้อ + แสงตามเมาส์บนการ์ด
document.querySelectorAll(".display-md").forEach((h) => {
  const text = h.textContent.trim();
  h.setAttribute("aria-label", text);
  h.innerHTML = [...text].map((c, i) => `<span class="ch" aria-hidden="true" style="--i:${i}">${c === " " ? "&nbsp;" : c}</span>`).join("");
});
document.querySelectorAll(".skill-card").forEach((card) => {
  card.insertAdjacentHTML("afterbegin", '<span class="sc-shine" aria-hidden="true"></span>');
  card.addEventListener("pointermove", (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  });
});

// FAQ: เปิด/ปิดแบบยืดหดนุ่มๆ
document.querySelectorAll(".faq details").forEach((d) => {
  const summary = d.querySelector("summary");
  let anim = null;
  summary.addEventListener("click", (e) => {
    if (reduceMotion) return;
    e.preventDefault();
    anim?.cancel();
    const start = d.offsetHeight;
    d.classList.add("animating");
    let end;
    if (d.open) {
      d.classList.add("closing");
      end = summary.offsetHeight;
    } else {
      d.open = true;
      end = d.offsetHeight;
    }
    anim = d.animate({ height: [`${start}px`, `${end}px`] }, { duration: 550, easing: "cubic-bezier(.16, 1, .3, 1)" });
    anim.onfinish = anim.oncancel = () => {
      if (d.classList.contains("closing")) d.open = false;
      d.classList.remove("animating", "closing");
      anim = null;
    };
  });
});

// ปุ่มติดต่อ: ดึงเข้าหาเมาส์เล็กน้อย (magnetic)
const cta = document.querySelector(".contact .hero-cta");
if (cta && !reduceMotion && matchMedia("(hover: hover)").matches) {
  const last = cta.lastElementChild;
  last.addEventListener("transitionend", function done(e) {
    if (e.target !== last || e.propertyName !== "transform") return;
    cta.classList.add("ready");
    last.removeEventListener("transitionend", done);
  });
  cta.querySelectorAll(".btn").forEach((btn) => {
    btn.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      btn.style.setProperty("--tx", `${((e.clientX - r.left) / r.width - .5) * 10}px`);
      btn.style.setProperty("--ty", `${((e.clientY - r.top) / r.height - .5) * 8 - 3}px`);
    });
    btn.addEventListener("pointerleave", () => { btn.style.removeProperty("--tx"); btn.style.removeProperty("--ty"); });
  });
}

document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

// หัวข้อ section: เส้นใต้ลากเข้า + stagger รายการในแต่ละกลุ่ม
document.querySelectorAll("section").forEach((sec) => {
  const secIO = new IntersectionObserver(([en]) => {
    if (!en.isIntersecting) return;
    sec.classList.add("in-view");
    secIO.disconnect();
  }, { threshold: 0.15 });
  secIO.observe(sec);
  sec.querySelectorAll(".project.reveal, .skill-card.reveal, details.reveal").forEach((el, i) => {
    el.style.transitionDelay = `${(i % 6) * 0.08}s`;
  });
});

function countUp(el) {
  const target = +el.dataset.count, t0 = performance.now();
  const step = (now) => {
    const q = Math.min((now - t0) / 1600, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - q, 4))) + (el.dataset.suffix || "");
    if (q < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const roles = ["Full-Stack Developer", "Network & Cloud", "UI/UX", "Problem Solver"];
const typedEl = document.getElementById("typed");
let ri = 0, ci = 0, deleting = false;
(function type() {
  const word = roles[ri];
  typedEl.textContent = word.slice(0, ci);
  if (!deleting && ci < word.length) ci++;
  else if (deleting && ci > 0) ci--;
  else if (!deleting) { deleting = true; return setTimeout(type, 1600); }
  else { deleting = false; ri = (ri + 1) % roles.length; }
  setTimeout(type, deleting ? 35 : 80);
})();

const navLinks = [...document.querySelectorAll(".links a")];
const navIO = new IntersectionObserver(
  (entries) => entries.forEach((en) => {
    if (en.isIntersecting) navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${en.target.id}`));
  }),
  { rootMargin: "-50% 0px -50% 0px" }
);
document.querySelectorAll("main section[id]").forEach((sec) => navIO.observe(sec));
