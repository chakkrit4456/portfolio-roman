/* =========================================================
   Detail modal — กดการ์ดทักษะ/รางวัล และผลงาน เพื่อดูรายละเอียด
   ใส่รูปจริงได้ที่ assets/works/<id>.jpg (ถ้าไม่มี จะแสดงภาพลายเส้นแทน)
   ========================================================= */
const DETAILS = {
  // ---- ทักษะ & รางวัล ----
  award: {
    kicker: "AWARD · รางวัล",
    title: "ชนะเลิศระดับจังหวัด",
    text: "ได้รับรางวัลชนะเลิศอันดับ 1 การแข่งขันทำสื่อดิจิทัลคอนเทนต์ ประเภท Motion Graphic & Info Graphic ระดับจังหวัดร้อยเอ็ด",
    points: ["วางโครงเรื่อง (Storyboard) และลำดับการเล่าเรื่อง", "ออกแบบกราฟิกและ Info Graphic ให้อ่านง่าย", "ทำ Motion Graphic ให้มีจังหวะและน่าติดตาม"],
    tags: ["Motion Graphic", "Info Graphic", "Storytelling"],
  },
  vnet: {
    kicker: "V-NET · ทดสอบระดับชาติ",
    title: "V-NET ระดับดีเยี่ยม",
    text: "ผลการทดสอบทางการศึกษาระดับชาติด้านอาชีวศึกษา (V-NET) ระดับ ปวช. ได้คะแนนในระดับดีเยี่ยม",
    points: ["สะท้อนความรู้พื้นฐานวิชาชีพที่แน่น", "วินัยและความตั้งใจในการเรียน"],
    tags: ["V-NET", "ปวช."],
  },
  design: {
    kicker: "SKILL · GRAPHIC",
    title: "Graphic Design",
    text: "ออกแบบแบนเนอร์ โปสเตอร์ สื่อประชาสัมพันธ์ และงานกราฟิกหลากหลายรูปแบบ ทั้งสำหรับสื่อออนไลน์และสื่อสิ่งพิมพ์",
    points: ["แบนเนอร์และโพสต์โซเชียลมีเดีย", "โปสเตอร์ประชาสัมพันธ์กิจกรรม", "จัดวางตัวอักษรและโทนสีให้สื่อสารชัดเจน"],
    tags: ["Poster", "Banner", "Layout"],
  },
  motion: {
    kicker: "SKILL · MOTION",
    title: "Motion & Video",
    text: "ตัดต่อวิดีโอและสร้าง Motion Graphic สำหรับสื่อออนไลน์ ให้เนื้อหาน่าสนใจและเข้าใจง่าย",
    points: ["ตัดต่อวิดีโอ ใส่เสียงและซับไตเติล", "ทำแอนิเมชันตัวอักษรและกราฟิก", "ทำคลิปสั้นสำหรับโซเชียลมีเดีย"],
    tags: ["Video Editing", "Animation"],
  },
  webapp: {
    kicker: "SKILL · DEVELOPMENT",
    title: "Web & App",
    text: "มีประสบการณ์พัฒนาโปรเจกต์เว็บไซต์และแอปพลิเคชันแอนดรอยด์ ตั้งแต่ออกแบบหน้าจอจนถึงเขียนโค้ด",
    points: ["เว็บไซต์ด้วย HTML / CSS / JavaScript", "แอปพลิเคชันแอนดรอยด์", "ออกแบบ UI ให้ใช้งานง่าย"],
    tags: ["Web", "Android", "UI"],
  },
  ai: {
    kicker: "SKILL · AI",
    title: "AI Prompting",
    text: "มีทักษะการเขียน Prompt และใช้เครื่องมือ AI ช่วยเพิ่มประสิทธิภาพในการทำงาน ทั้งงานออกแบบ งานเขียน และงานโค้ด",
    points: ["เขียน Prompt ให้ได้ผลลัพธ์ตรงความต้องการ", "ใช้ AI ช่วยคิดไอเดียและร่างงาน", "ใช้ AI ช่วยเขียนและตรวจโค้ด"],
    tags: ["Prompt", "Generative AI"],
  },
  // ---- ผลงานที่คัดสรร ----
  ecommerce: {
    kicker: "PROJECT 01",
    title: "E-commerce Platform",
    text: "ระบบร้านค้าออนไลน์ครบวงจร มีตะกร้าสินค้า ชำระเงิน และหลังบ้านจัดการสต็อก",
    points: ["หน้ารายการสินค้าและค้นหา", "ตะกร้าสินค้าและชำระเงิน", "หลังบ้านจัดการสินค้าและสต็อก"],
    tags: ["Node.js", "MongoDB", "React"],
  },
  aihub: {
    kicker: "PROJECT 02",
    title: "AI Hub",
    text: "แพลตฟอร์มรวมเครื่องมือ AI สำหรับสรุปข้อความ แปลภาษา และช่วยเขียนโค้ด",
    points: ["สรุปข้อความยาวให้กระชับ", "แปลภาษา", "ผู้ช่วยเขียนโค้ด"],
    tags: ["Python", "FastAPI", "LLM"],
  },
  speech: {
    kicker: "PROJECT 03",
    title: "Speech-to-Report",
    text: "แปลงเสียงพูดเป็นข้อความและสร้างรายงานอัตโนมัติ ลดเวลาการทำเอกสาร",
    points: ["บันทึกเสียงและถอดความอัตโนมัติ", "จัดรูปแบบเป็นรายงานพร้อมใช้", "ลดเวลาการทำเอกสาร"],
    tags: ["Speech API", "JavaScript"],
  },
  eportfolio: {
    kicker: "PROJECT 04",
    title: "E-Portfolio System",
    text: "ระบบแฟ้มสะสมผลงานออนไลน์สำหรับนักเรียน พร้อมระบบประเมินโดยครู",
    points: ["นักเรียนอัปโหลดและจัดการผลงาน", "ครูประเมินและให้คะแนน", "สรุปผลเป็นรายบุคคล"],
    tags: ["PHP", "MySQL", "Tailwind"],
  },
};

/* ---------- สร้าง modal ---------- */
const modal = document.createElement("div");
modal.className = "dmodal";
modal.setAttribute("role", "dialog");
modal.setAttribute("aria-modal", "true");
modal.hidden = true;
modal.innerHTML = `
  <div class="dmodal-backdrop" data-close></div>
  <div class="dmodal-panel">
    <button class="dmodal-close" data-close aria-label="ปิด">✕</button>
    <figure class="dmodal-media"><img alt="" /><canvas></canvas></figure>
    <div class="dmodal-body">
      <p class="label dmodal-kicker"></p>
      <h3 class="dmodal-title"></h3>
      <p class="dmodal-text"></p>
      <ul class="dmodal-points"></ul>
      <div class="p-tags dmodal-tags"></div>
    </div>
  </div>`;
document.body.appendChild(modal);

const $ = (s) => modal.querySelector(s);
const img = $(".dmodal-media img");
const canvas = $(".dmodal-media canvas");
let lastFocus = null;

// ภาพลายเส้นแทนรูปจริง (โทนเดียวกับเว็บ)
function drawArt(seed) {
  const w = (canvas.width = 800), h = (canvas.height = 450);
  const ctx = canvas.getContext("2d");
  let r = [...seed].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  const rand = () => ((r = (r * 1664525 + 1013904223) >>> 0) / 4294967296);
  ctx.fillStyle = "#0b0b0d"; ctx.fillRect(0, 0, w, h);
  const cx = w * (0.25 + rand() * 0.5), cy = h * (0.3 + rand() * 0.5);
  ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = 1;
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2 + rand() * 0.05, len = 200 + rand() * 500;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len); ctx.stroke();
  }
  ctx.fillStyle = "#2f63d8";
  for (let i = 0; i < 1400; i++) {
    const x = rand() * w, y = h * 0.6 + rand() * h * 0.4;
    if (rand() < (y - h * 0.6) / (h * 0.4)) ctx.fillRect(x | 0, y | 0, 2, 2);
  }
}

function open(id, trigger) {
  const d = DETAILS[id];
  if (!d) return;
  $(".dmodal-kicker").textContent = `[ ${d.kicker} ]`;
  $(".dmodal-title").textContent = d.title;
  $(".dmodal-text").textContent = d.text;
  $(".dmodal-points").innerHTML = "";
  d.points.forEach((p) => { const li = document.createElement("li"); li.textContent = p; $(".dmodal-points").appendChild(li); });
  $(".dmodal-tags").innerHTML = "";
  d.tags.forEach((t) => { const s = document.createElement("span"); s.textContent = t; $(".dmodal-tags").appendChild(s); });

  drawArt(id);
  canvas.style.display = "block";
  img.style.display = "none";
  img.alt = d.title;
  img.onload = () => { img.style.display = "block"; canvas.style.display = "none"; };
  img.onerror = () => {};
  img.src = d.img || `assets/works/${id}.jpg`;

  lastFocus = trigger;
  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add("open"));
  document.documentElement.classList.add("dmodal-lock");
  $(".dmodal-close").focus();
}

function close() {
  modal.classList.remove("open");
  document.documentElement.classList.remove("dmodal-lock");
  setTimeout(() => { modal.hidden = true; }, 350);
  lastFocus?.focus();
}

document.querySelectorAll("[data-detail]").forEach((el) => {
  el.addEventListener("click", () => open(el.dataset.detail, el));
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(el.dataset.detail, el); }
  });
});
modal.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) close(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) close(); });
// กันไม่ให้ Lenis เลื่อนหน้าเมื่อ scroll ใน modal
modal.setAttribute("data-lenis-prevent", "");
