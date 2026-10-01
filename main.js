import Lenis from "lenis";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));
const NS = "http://www.w3.org/2000/svg";

/* =========================================================
   1) Smooth scroll
   ========================================================= */
const lenis = reduceMotion ? null : new Lenis({ lerp: 0.085 });

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
function columnMarkup(stroke = "#fff") {
  const s = (d, w = 1.2, o = 1) => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" opacity="${o}"/>`;
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
  return out;
}
const drawColumn = (svg) => { svg.innerHTML = columnMarkup(); };

// --- ลวดลายโรมันสำหรับพื้นหลังแต่ละ section ---
// ช่อมะกอก (laurel wreath)
function laurelMarkup() {
  const R = 78, rad = Math.PI / 180;
  let branch = `<path d="M${(Math.cos(105 * rad) * R).toFixed(1)} ${(Math.sin(105 * rad) * R).toFixed(1)}A${R} ${R} 0 0 1 ${(Math.cos(255 * rad) * R).toFixed(1)} ${(Math.sin(255 * rad) * R).toFixed(1)}"/>`;
  for (let i = 0; i < 11; i++) {
    const deg = 108 + i * 14, x = (Math.cos(deg * rad) * R).toFixed(1), y = (Math.sin(deg * rad) * R).toFixed(1);
    for (const tilt of [-30, 30]) branch += `<ellipse cx="11" rx="11" ry="4" transform="translate(${x} ${y}) rotate(${deg + 90 + tilt})"/>`;
  }
  return `<g>${branch}</g><g transform="scale(-1 1)">${branch}</g><path d="M-10 86L0 76L10 86"/>`;
}
// วิหาร (หน้าจั่ว + เสา 6 ต้น + บันได)
function templeMarkup() {
  let out = '<path d="M20 70L150 14L280 70Z"/><path d="M48 64L150 22L252 64" opacity=".6"/><path d="M20 70H280V84H20Z"/>';
  for (let x = 30; x < 280; x += 12) out += `<path d="M${x} 73V81" opacity=".5"/>`;
  for (let i = 0; i < 6; i++) {
    const x = 32 + i * 43.6;
    out += `<path d="M${x - 3} 84H${x + 21}V90H${x - 3}Z"/><path d="M${x} 90V164M${x + 18} 90V164"/><path d="M${x + 6} 92V162M${x + 12} 92V162" opacity=".5"/><path d="M${x - 3} 164H${x + 21}V170H${x - 3}Z"/>`;
  }
  return out + '<path d="M16 170H284V178H16Z"/><path d="M8 178H292V186H8Z"/><path d="M0 186H300V194H0Z"/>';
}
// ดวงอาทิตย์ (Sol) วงแหวน + รัศมี
function sunMarkup() {
  let d = "";
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), r = i % 2 ? 76 : 96;
    d += `M${(c * 36).toFixed(1)} ${(s * 36).toFixed(1)}L${(c * r).toFixed(1)} ${(s * r).toFixed(1)}`;
  }
  return `<circle r="96"/><circle r="30" opacity=".6"/><circle r="24"/><path d="${d}"/>`;
}
// แอมโฟรา (ไหโรมัน)
const amphoraMarkup = () => '<path d="M44 10H76M48 10V40M72 10V40"/><path d="M48 40C10 70 14 140 52 196M72 40C110 70 106 140 68 196"/>'
  + '<path d="M48 18C24 18 22 50 36 56M72 18C96 18 98 50 84 56"/><path d="M23 92H97" opacity=".6"/><path d="M52 196H68M52 196L46 206M68 196L74 206M46 206H74"/>';
// ม้วนคัมภีร์
const scrollMarkup = () => '<path d="M22 14h16v92H22zM26 8h8v6h-8zM26 106h8v6h-8zM162 14h16v92h-16zM166 8h8v6h-8zM166 106h8v6h-8z"/>'
  + '<path d="M38 26H162M38 94H162"/><path d="M56 46H144M56 60H144M56 74H116" opacity=".6"/>';
// นาฬิกาแดด (ครึ่งวงกลม + รัศมี)
function sundialMarkup() {
  let d = "M-96 0H96M-90 0A90 90 0 0 1 90 0M-20 0A20 20 0 0 1 20 0";
  for (let a = 195; a < 360; a += 15) {
    const c = Math.cos((a * Math.PI) / 180), s = Math.sin((a * Math.PI) / 180);
    d += `M${(c * 28).toFixed(1)} ${(s * 28).toFixed(1)}L${(c * 82).toFixed(1)} ${(s * 82).toFixed(1)}`;
  }
  return `<path d="${d}"/>`;
}
const ROMAN = {
  laurel: ["-100 -100 200 200", laurelMarkup, "clamp(180px, 28vw, 400px)"],
  temple: ["0 0 300 200", templeMarkup, "clamp(220px, 36vw, 520px)"],
  sun: ["-100 -100 200 200", sunMarkup, "clamp(150px, 16vw, 240px)"],
  column: ["0 0 300 500", () => columnMarkup("currentColor"), "clamp(90px, 13vw, 190px)"],
  amphora: ["0 0 120 216", amphoraMarkup, "clamp(110px, 15vw, 220px)"],
  sundial: ["-100 -96 200 100", sundialMarkup, "clamp(200px, 30vw, 440px)"],
  scroll: ["0 0 200 120", scrollMarkup, "clamp(104px, 11vw, 150px)"],
};
const orn = (type, pos, cls = "") => {
  const [box, markup, w] = ROMAN[type];
  return `<div class="sec-orn ${cls}" style="${pos};--w:${w}"><svg viewBox="${box}">${markup()}</svg></div>`;
};
const layer = (speed, inner, cls = "", sx = 0) => `<div class="sec-layer ${cls}" data-speed="${speed}" data-speed-x="${sx}">${inner}</div>`;
// ทิวทัศน์โรมันลายเส้น (Hero ฝั่งซ้าย ใต้ปุ่ม): วิหาร ต้นไซเปรส สะพานส่งน้ำ เสาหัก และนก
function skylineMarkup() {
  let d = "M0 140H520M20 70L95 40L170 70ZM20 70H170V78H20ZM16 128H174V134H16ZM10 134H180V140H10Z";
  for (let i = 0; i < 6; i++) { const x = 28 + i * 26.4; d += `M${x} 78V128M${x + 8} 78V128`; }                      // เสาวิหาร
  d += "M205 140V126M232 140V128M260 84H470M260 92H470";                                                           // ลำต้นไซเปรส + รางน้ำ
  for (let i = 0; i < 5; i++) { const x = 260 + i * 42; d += `M${x + 6} 140V112A15 15 0 0 1 ${x + 36} 112V140`; }   // ซุ้มสะพาน
  d += "M484 140V104H500V140M481 104H503M486 104l3-7 5 4 4-6M506 140v-9h12v9M506 134h12";                          // เสาหัก + ท่อนเสาล้ม
  return `<svg class="skyline" viewBox="0 0 520 150"><path d="${d}"/><ellipse cx="205" cy="92" rx="9" ry="34"/><ellipse cx="232" cy="104" rx="7" ry="24"/>`
    + '<path d="M300 44q6-6 12 0q6-6 12 0M344 28q5-5 10 0q5-5 10 0M388 52q4-4 8 0q4-4 8 0" opacity=".7"/></svg>';
}
// เข็มทิศเล็ก (แถวบนของ section III)
const COMPASS = '<svg class="compass" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20"/><circle cx="24" cy="24" r="14" opacity=".5"/>'
  + '<path d="M24 2v8M24 38v8M2 24h8M38 24h8"/><path d="M24 10l5 14-5 14-5-14z"/><path d="M24 10l5 14h-10z" fill="currentColor"/></svg>';
const glow = (pos, color) => `<div class="sec-glow" style="${pos};--c:${color}"></div>`;
// แถบจารึกละตินวิ่งช้าๆ (ข้อความซ้ำ 2 ชุดเพื่อวนต่อเนื่อง)
const MOTTO = "DOCENDO DISCIMVS · SAPIENTIA · DISCIPLINA · VIRTVS · AD ASTRA PER ASPERA · LABOR OMNIA VINCIT · ".repeat(3);
const inscr = (side) => `<div class="inscr ${side}"><span>${MOTTO}${MOTTO}</span></div>`;
// แต่ละ section มีพื้นหลังคนละแบบ (สไตล์อยู่ที่ .bg-<id> ใน style.css) + เลขโรมันที่มุมขวาบน
// ทุก section เป็น parallax: ชั้นที่เลื่อนแนวตั้งคนละความเร็ว + แถบลวดลายขอบบน/ล่างที่เลื่อนแนวนอนสวนทางกัน (strip)
const SECTION_BG = {
  // Hero: วงแหวนหลังภาพ + พระอาทิตย์ (ตำแหน่ง/ขนาดคำนวณใน placeHeroSun() ให้อยู่ในที่ว่างเท่านั้น) + ลำแสงแผ่จากพระอาทิตย์ + ทิวทัศน์โรมันใต้ปุ่ม + ฉากมุม ข้อความขอบ ดาว และตัวบอกให้เลื่อน
  home: { bg: layer(-0.08, "", "halo") + '<i class="sunburst"></i>' + orn("sun", "", "hero-sun") + skylineMarkup()
    + '<i class="corner tl"></i><i class="corner tr"></i><i class="corner bl"></i><i class="corner br"></i>'
    + '<span class="edge-text l">ROMA · MMXXVI · PORTFOLIO</span><span class="edge-text r">N 16°03′ · E 103°39′ · ROI ET</span>'
    + '<i class="spark"></i><i class="spark s2"></i><i class="spark s3"></i><span class="scroll-cue">SCROLL<i></i></span>' },
  about: { num: "I", bg: layer(-0.1, "", "fibre") + layer(-0.07, orn("temple", "right:2%;bottom:7%"), "fit")
    + '<i class="frame"></i>' + layer(0, '<i class="meander top"></i>', "strip top", 0.08) + layer(0, '<i class="meander bottom"></i>', "strip bottom", -0.08) }, // กระดาษ parchment + วิหาร
  skills: { num: "II", bg: layer(0, '<i class="dentil top"></i><i class="rule top"></i>', "strip top", 0.07)
    + layer(0, '<i class="dentil bottom"></i><i class="rule bottom"></i>', "strip bottom", -0.07) },                             // โมเสก (อยู่ใน .band-art)
  // III: ดวงอาทิตย์โผล่จากมุมซ้ายบน + สะพานส่งน้ำ 2 ชั้นมีน้ำไหลด้านบน ในช่องว่างด้านล่าง (ไม่ทับรายการผลงาน)
  //      + ไม้บรรทัดช่างที่ขอบซ้าย/ขวา + ป้ายกำกับภาพ
  //      + แถวบนแบบแปลนช่าง: จุดกริด เส้นบอกระยะ เข็มทิศ มาตราส่วน (อยู่ในช่องว่างด้านบน)
  projects: { num: "III", bg: layer(-0.14, glow("left:-18%;top:4%", "rgba(168, 132, 58, .13)")) + orn("sun", "left:0;top:0", "gold corner") + layer(-0.08, "", "plan-dots")
    + '<i class="dim"><b>C · PEDES</b></i>' + COMPASS + '<span class="scale">SCALA I : C</span>'
    + '<i class="ruler l"></i><i class="ruler r"></i><span class="fig">FIG. III — AQVAE DVCTVS</span><i class="water"></i>'
    + layer(0, '<i class="arcade-top"></i>', "strip bottom", -0.05) + layer(0, '<i class="arcade"></i>', "strip bottom", 0.08) },
  // IV: แสงทอง + กำแพงหินก้อน (ไกล เลื่อนช้า) + วิหารเล็กมุมซ้ายบน
  //     + แถบ frieze กับแนวเสาเลื่อนแนวนอนสวนทางกัน (อยู่ในช่องว่างบน/ล่างเท่านั้น จึงไม่ทับรายการ)
  experience: { num: "IV", bg: layer(-0.16, glow("right:-20%;top:-6%", "rgba(168, 132, 58, .16)")) + layer(-0.1, "", "ashlar")
    + layer(0.02, orn("temple", "", "gold emblem"), "fit")
    + layer(0, '<i class="frieze top"></i>', "strip top", -0.06) + layer(0, '<i class="frieze bottom"></i>', "strip bottom", -0.06)
    + layer(0, '<i class="colonnade"></i>', "strip bottom", 0.09) },
  // V: ช่อมะกอกทองใหญ่ (ไกล) + แอมโฟรา (ใกล้) + แถบจารึกละตินบน/ล่าง
  education: { num: "V", bg: layer(-0.12, glow("left:-22%;top:8%", "rgba(8, 71, 196, .07)") + orn("laurel", "right:5%;top:18%", "gold xl"))
    + layer(-0.06, "", "stars") + layer(0.08, orn("amphora", "left:3%;bottom:10%"), "fit") + orn("scroll", "", "gold emblem") + inscr("top") + inscr("bottom") },
  // VI: แสงทอง + วงแหวนมุมขวาล่าง + ตาข่ายอิฐมุมซ้ายบน (คนละความลึก) + นาฬิกาแดด (ใกล้) + ลายคลื่นบน/ล่างไหลสวนทางกัน
  faq: { num: "VI", bg: layer(-0.18, glow("right:-14%;top:-10%", "rgba(168, 132, 58, .13)")) + layer(-0.12, "", "rings") + layer(-0.05, "", "lattice")
    + layer(0.1, orn("sundial", "left:2%;bottom:12%"), "fit")
    + layer(0, '<i class="wave top"></i>', "strip top", 0.1) + layer(0, '<i class="wave bottom"></i>', "strip bottom", -0.1) },
  contact: { num: "VII" },                                                                                          // ท้องฟ้ากลางคืน (อยู่ใน .contact-art)
};
Object.entries(SECTION_BG).forEach(([id, c]) => {
  const sec = document.getElementById(id);
  if (!sec) return;
  // เลขโรมันอยู่ในช่องว่างด้านบน (padding-top) ของ section จึงไม่มีเนื้อหาใดวางทับ
  if (c.num) sec.insertAdjacentHTML("afterbegin", `<span class="sec-mark reveal" aria-hidden="true">${c.num}</span>`);
  if (!c.bg) return;
  sec.classList.add("has-bg");
  sec.insertAdjacentHTML("afterbegin", `<div class="sec-bg bg-${id}" aria-hidden="true">${c.bg}</div>`);
});

// --- โมเสกโรมันลายเกล็ดปลา (TECH STACK): กระเบื้องน้ำเงินบน canvas หนึ่ง, ขอบเกล็ดสีทองแยกอีก canvas เพื่อให้ระยิบด้วย CSS ---
function drawMosaic(base) {
  const gold = base.nextElementSibling;
  const box = base.parentElement.getBoundingClientRect();
  const W = Math.ceil(box.width), H = Math.ceil(box.height);
  const small = window.innerWidth < 720;
  const p = small ? 10 : 13, R = small ? 90 : 150; // ขนาดกระเบื้อง, รัศมีเกล็ด
  gold.width = base.width = W;
  gold.height = base.height = H;
  const ctx = base.getContext("2d"), gtx = gold.getContext("2d");
  ctx.fillStyle = "#06338f"; // ร่องยาแนว
  ctx.fillRect(0, 0, W, H);
  gtx.fillStyle = "#e6cf9a";
  let seed = 9;
  const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const BLUES = ["#0a4fd6", "#0847c4", "#063fae"];
  // เหรียญกลม (emblema) ด้านขวาข้างหัวข้อ — ชั้นนี้สูงกว่า section 24% จึงบวกส่วนที่ล้นด้านบน (≈9.7%)
  const mx = W * 0.8, my = H * 0.097 + (small ? 180 : 310), mR = Math.min(170, W * 0.2);
  for (let y = 0; y < H; y += p) {
    for (let x = 0; x < W; x += p) {
      const px = x + p / 2, py = y + p / 2;
      // เกล็ดแถวบนทับแถวล่าง: หาเกล็ดบนสุดที่ครอบจุดนี้
      let d = R;
      for (let k = Math.ceil((py - R) / R); k <= Math.floor((py + R) / R); k++) {
        const off = (k & 1) * R;
        const cx = Math.round((px - off) / (2 * R)) * 2 * R + off;
        const dd = Math.hypot(px - cx, py - k * R);
        if (dd <= R) { d = dd; break; }
      }
      const t = d / R, size = p - 2 + (rand() - 0.5);
      const tx = x + 1 + (rand() - 0.5) * 1.6, ty = y + 1 + (rand() - 0.5) * 1.6;
      let fill = t > 0.9 ? "#063fae" : t < 0.14 ? "#3d74ea" : BLUES[Math.floor(d / p) % 3], gilt = t > 0.9;
      const dm = Math.hypot(px - mx, py - my);
      if (dm < mR) { // วงแหวนทอง 3 ชั้น + กลีบสลับสี 16 กลีบ
        const u = dm / mR, wedge = Math.floor((Math.atan2(py - my, px - mx) + Math.PI) / (Math.PI / 8)) % 2;
        gilt = u > 0.9 || (u > 0.56 && u < 0.64) || u < 0.14;
        fill = gilt ? "#063fae" : u > 0.64 ? (wedge ? "#3d74ea" : "#052c7d") : wedge ? "#0a4fd6" : "#2f63d8";
      }
      ctx.fillStyle = fill;
      ctx.globalAlpha = 0.75 + rand() * 0.25;
      ctx.fillRect(tx, ty, size, size);
      if (gilt) { gtx.globalAlpha = 0.35 + rand() * 0.5; gtx.fillRect(tx, ty, size, size); }
    }
  }
}

const drawAll = () => {
  document.querySelectorAll("canvas.mosaic").forEach(drawMosaic);
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
const speedLayers = [...document.querySelectorAll("[data-speed]")].map((el) => ({
  el, speed: +el.dataset.speed, sx: +el.dataset.speedX || 0, host: el.parentElement, top: 0, h: 0, last: "",
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
  ["mark", 46, 0.34, 0.4, "clamp(56px, 8vw, 110px)", true, 0.05],
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

// พระอาทิตย์ของ Hero: วางในที่ว่างระหว่างแถบเมนูกับเนื้อหา (เหนือชื่อ ชิดขวาของคอลัมน์ข้อความ) จึงไม่มี UI ใดทับ
// (ถ้าที่ว่างไม่พอ เช่น บนมือถือ จะซ่อนไปเลย)
const heroSec = document.getElementById("home"), heroText = heroSec.querySelector(".hero-text");
const heroArt = document.getElementById("heroArt"), heroBg = heroSec.querySelector(".sec-bg");
const heroSun = heroBg.querySelector(".hero-sun"), heroSky = heroBg.querySelector(".skyline");
function placeHeroSun() {
  const h = heroSec.getBoundingClientRect(), t = heroText.getBoundingClientRect(), a = heroArt.getBoundingClientRect();
  const x0 = heroBg.getBoundingClientRect().left; // ขอบซ้ายของชั้นพื้นหลัง (เต็มจอ)
  const NAV = 72; // ความสูงแถบเมนู + ระยะห่าง
  const gap = t.top - h.top - NAV;
  const size = Math.min(gap - 24, 240), hasSun = size >= 90;
  heroBg.classList.toggle("no-sun", !hasSun);
  if (hasSun) {
    const left = t.right - x0 - size, top = NAV + (gap - size) / 2;
    heroSun.style.width = `${size}px`;
    heroSun.style.left = `${left}px`;
    heroSun.style.top = `${top}px`;
    // จุดศูนย์กลาง/รัศมีของพระอาทิตย์ ให้ลำแสง (.sunburst) แผ่ออกจากตรงนั้นและเว้นช่องรอบพระอาทิตย์
    heroBg.style.setProperty("--sx", `${left + size / 2}px`);
    heroBg.style.setProperty("--sy", `${top + size / 2}px`);
    heroBg.style.setProperty("--sr", `${size / 2}px`);
  }
  // ทิวทัศน์: วางในที่ว่างใต้ปุ่มเท่านั้น (จอแคบที่ภาพอยู่ใต้ข้อความ หรือที่ว่างไม่พอ = ซ่อน)
  const stacked = a.top >= t.bottom - 1;
  const w = Math.min(t.width * 0.8, 560, (h.bottom - t.bottom - 56) * (520 / 150));
  const hasSky = !stacked && w >= 220;
  heroSky.style.display = hasSky ? "" : "none";
  if (hasSky) {
    heroSky.style.width = `${w}px`;
    heroSky.style.left = `${t.left - x0}px`;
  }
}

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
  placeHeroSun();
  // ชั้นเมฆต้องสูงพอให้เลื่อนได้จนสุดหน้า
  const cloudH = Math.ceil(layout.vh + layout.max * bgCloud.depth);
  if (cloudH !== bgCloud.h) { bgCloud.h = cloudH; bgCloud.el.style.height = `${cloudH}px`; }
  lastY = -1; // บังคับให้เฟรมถัดไปคำนวณตำแหน่งใหม่
}
let lastY = -1;
measure();
drawDither(bgCloud.canvas);
bgHost.classList.add("ready");
let measureT;
new ResizeObserver(() => { clearTimeout(measureT); measureT = setTimeout(measure, 150); }).observe(document.body);
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
  updateCursor(dt, now);

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
    setT(l, `translate3d(${(rel * l.sx - s.x * 12).toFixed(1)}px, ${(rel * l.speed).toFixed(1)}px, 0)`);
  });
}
requestAnimationFrame(frame);

// หยุด CSS animation ของส่วนที่อยู่นอกจอ ประหยัดแบตมือถือ
const visIO = new IntersectionObserver((entries) => entries.forEach((en) => en.target.classList.toggle("offscreen", !en.isIntersecting)));
document.querySelectorAll("#home, .hero-art, .band, #projects, #education, .contact, .ticker").forEach((el) => visIO.observe(el));

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

// TECH STACK: แสงส่องโมเสกตามเมาส์ (จอสัมผัสใช้ animation ลอยเองจาก CSS)
const band = document.querySelector(".band"), bandGlow = document.querySelector(".band-glow");
if (band && bandGlow && finePointer && !reduceMotion) {
  band.addEventListener("pointermove", (e) => {
    const r = band.getBoundingClientRect();
    bandGlow.classList.add("follow");
    bandGlow.style.transform = `translate3d(${(e.clientX - r.left).toFixed(0)}px, ${(e.clientY - r.top).toFixed(0)}px, 0)`;
  }, { passive: true });
}

/* ---------------------------------------------------------
   เคอร์เซอร์แบบกำหนดเอง: ไอคอนประจำ section อยู่ตรงตำแหน่งเมาส์ (จุดชี้ = กลางไอคอน)
   ไอคอนและสีเปลี่ยนตาม section ที่เมาส์อยู่ ทั้งตอนขยับเมาส์และตอนเลื่อนหน้า (ดู .cursor ใน style.css)
   --------------------------------------------------------- */
const CURSOR_ICONS = {
  home: '<path d="M12 20C6 18 4 12 6 5M12 20C18 18 20 12 18 5M6 9l-3-1M6.5 13l-3 .5M8.5 16.5l-2.5 2M18 9l3-1M17.5 13l3 .5M15.5 16.5l2.5 2"/>',       // ช่อมะกอก
  about: '<path d="M3 9L12 3l9 6zM5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 18h18M2 21h20"/>',                                                              // วิหาร
  skills: '<path d="M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z"/>',                                                                      // กระเบื้องโมเสก
  projects: '<path d="M4 21V11a8 8 0 0 1 16 0v10M8 21V11a4 4 0 0 1 8 0v10M2 21h20"/>',                                                          // ซุ้มโค้ง
  experience: '<path d="M6 4h12v3H6zM8 7v11M12 7v11M16 7v11M5 18h14v3H5z"/>',                                                                   // เสา
  education: '<path d="M9 3h6M10 3v3M14 3v3M10 6c-5 4-4 10 1 14M14 6c5 4 4 10-1 14M10.5 20h3M10 4.5C7 5 7 8 8.5 9M14 4.5c3 .5 3 3.5 1.5 4.5"/>', // แอมโฟรา
  faq: '<path d="M2 19h20M4 19a8 8 0 0 1 16 0M12 19V9M12 19l-5-6M12 19l5-6"/>',                                                                 // นาฬิกาแดด
  contact: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',                   // ดวงอาทิตย์
};
const cur = { el: null, point: null, x: -100, y: -100, target: null, lastTarget: undefined, moved: false, seen: false, scrollY: -1, nextCheck: 0, theme: "home", link: false };

function setCursorTarget(el) {
  const id = el?.closest?.("main > section")?.id, theme = id in CURSOR_ICONS ? id : "home";
  const link = !!el?.closest?.("a, button, summary, .clickable");
  if (theme !== cur.theme) { cur.theme = theme; cur.el.dataset.theme = theme; }
  if (link !== cur.link) { cur.link = link; cur.el.classList.toggle("link", link); }
}

// เรียกทุกเฟรม: เขียนตำแหน่งแค่ครั้งเดียวต่อเฟรม (เมาส์ส่ง event ถี่กว่าเฟรมมาก)
// และเช็ก section ใต้เมาส์ใหม่เมื่อหน้าเลื่อน โดยไม่ถี่เกินทุก 120ms
function updateCursor(dt, now) {
  if (!cur.seen) return;
  if (cur.moved) {
    cur.moved = false;
    cur.point.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0)`;
    if (cur.target !== cur.lastTarget) { cur.lastTarget = cur.target; setCursorTarget(cur.target); }
  }
  if (window.scrollY !== cur.scrollY && now > cur.nextCheck) {
    cur.scrollY = window.scrollY;
    cur.nextCheck = now + 120;
    cur.lastTarget = undefined;
    setCursorTarget(document.elementFromPoint(cur.x, cur.y));
  }
}

if (finePointer) {
  cur.el = document.createElement("div");
  cur.el.className = "cursor";
  cur.el.dataset.theme = "home";
  cur.el.setAttribute("aria-hidden", "true");
  const icons = Object.entries(CURSOR_ICONS).map(([id, d]) => `<svg class="cur-icon i-${id}" viewBox="0 0 24 24">${d}</svg>`).join("");
  cur.el.innerHTML = `<div class="cur-point"><i class="cur-ring"></i><span class="cur-icons">${icons}</span></div>`;
  document.body.appendChild(cur.el);
  cur.point = cur.el.firstElementChild;
  document.documentElement.classList.add("has-cursor"); // ซ่อนเคอร์เซอร์ของระบบเฉพาะเมื่อเคอร์เซอร์นี้พร้อมใช้

  window.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    cur.x = e.clientX;
    cur.y = e.clientY;
    cur.target = e.target;
    cur.moved = true;
    if (!cur.seen) { cur.seen = true; cur.el.classList.add("on"); }
  }, { passive: true });
  document.documentElement.addEventListener("mouseleave", () => { cur.seen = false; cur.el.classList.remove("on"); });
  window.addEventListener("pointerdown", () => cur.el.classList.add("down"), { passive: true });
  window.addEventListener("pointerup", () => cur.el.classList.remove("down"), { passive: true });
}

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
