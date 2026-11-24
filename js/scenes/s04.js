// 장면 4: 비어 있는 2학년 — 준거 1 정규 교육과정과 비교과 활동의 연결
// 계단은 분석 층 홀로그램: 해 질 녘 학교 위 하늘에 떠 있는 발광 발판 + 반투명 과목 블록.
//   발판 = '알고리즘·프로그래밍 계열 과목이 그 학기에 있는가'. 있음 → 발광 실선, 처음과 끝 사이에 없음 → 붉은 점선(빈칸).
//   블록 색: 프로그래밍·알고리즘 = 학교색 / AI·데이터 = --ai / 기타 = --night-soft
// 1 경기북과학고 본관 위: 끊김 없는 계단 · 2 한민고 위: 2025·2026 입학생 계단과 2학년 빈칸
// 3 입학년도 자동 재생(2021 → 2024 → 2025·2026 입학생) + 비율 막대
// 4 첫 관문: 재학 당시 2학년 1학기 '정보'(편제 문서 + 숫자)
// 5 빈칸 아래를 받친 비교과 블록 5개 → 실이 모두 3D 현장의 AI 라운지로

const COLS = ["1학년 1학기", "1학년 2학기", "2학년 1학기", "2학년 2학기", "3학년 1학기", "3학년 2학기"];
const CW = 150, CH = 46, GAP = 6, RISE = 34, BASE = 300;
const STAIR = { x: 50, y: 112, w: 900, h: 360 };
const floorY = (c) => BASE - c * RISE;

const GBS = [
  { id: "py", t: "파이썬 프로그래밍", c: 0, k: "prog" },
  { id: "alg", t: "알고리즘 설계", c: 1, k: "prog", ev: "1" },
  { id: "isc", t: "정보과학", c: 2, k: "prog" },
  { id: "aip", t: "인공지능 알고리즘", c: 3, k: "ai", path: true },
  { id: "ap", t: "AP 프로그래밍과 문제해결", c: 4, s: 2, k: "prog" },
  { id: "sem", t: "정보과학 과제 연구", c: 4, s: 2, k: "prog" },
];

// 한민고 입학년도별 편제(코호트가 실제로 거치는 경로). 같은 id는 같은 블록이 자리·색만 바꾸며 이어진다.
//   한 해의 개설 로드맵(횡단면)이 아니라 입학년도별 편제표로 그린다.
const YEARS = [
  { label: "2021 입학", sub: "재학 당시", stamp: "2021~2023 재학.", src: "2021 입학생 편제 · 교육계획서 2022: 98쪽", chips: [
    { id: "pp", t: "프로그래밍실습Ⅰ", c: 0, s: 2, k: "prog" },
    { id: "info", t: "정보", c: 2, k: "etc", path: true },
    { id: "isc", t: "정보과학", c: 3, k: "prog", note: "알고리즘 26/68시간", nb: true },
    { id: "res", t: "정보과제연구", c: 2, s: 2, k: "etc" },
    { id: "aib", t: "인공지능기초", c: 4, k: "ai" },
    { id: "ds", t: "자료구조", c: 5, k: "prog" },
  ] },
  { label: "2022~2024 입학", stamp: "2022~2024 입학생.", src: "2022~2024 입학생 편제 · 교육계획서 2024: 44~47쪽, 2026: 41~42, 97쪽", chips: [
    { id: "info", t: "정보", c: 0, s: 2, k: "etc", path: true },
    { id: "aib", t: "인공지능 기초", c: 2, k: "ai" },
    { id: "isc", t: "정보과학", c: 3, k: "prog" },
    { id: "res", t: "정보과제연구", c: 3, k: "etc" },
    { id: "ds", t: "자료구조", c: 4, s: 2, k: "prog" },
    { id: "dsci3", t: "데이터과학", c: 4, s: 2, k: "ai" },
    { id: "mai", t: "수리와 인공지능", c: 4, s: 2, k: "ai" },
  ] },
  { label: "2025·2026 입학", tick: "2025·26 입학", stamp: "2025·2026 입학생.", src: "2025·2026 입학생 편제 · 교육계획서 2026: 37~40쪽", chips: [
    { id: "info", t: "정보", c: 0, s: 2, k: "etc", path: true },
    { id: "aib", t: "인공지능 기초", c: 2, k: "ai" },
    { id: "dsci2", t: "데이터 과학", c: 3, k: "ai" },
    { id: "res", t: "정보과제 연구", c: 3, k: "etc" },
    { id: "isc", t: "정보과학 · 11과목 중 택1", c: 4, s: 2, k: "prog" },
    { id: "mai", t: "수리와 인공지능", c: 4, s: 2, k: "ai" },
  ] },
];
const YNOW = 2, YMINE = 0, YFIRST = 1;   // 4-3 눈금은 2022~2024 → 2025·26 두 칸(2021 입학은 4-4 첫 관문에서만 쓴다)
const EXTRA = ["방과후 강좌", "CPS 동아리", "정보캠프", "올림피아드 지도", "야간 활동"];

const ST_GBS = "경기도 의정부 · 경기북과학고 · 2026.";
const ST_HM = (y) => `경기도 파주 · 한민고 · ${y}`;

// ───────── 배치 계산 ─────────
function layout(chips) {
  const top = COLS.map((_, c) => floorY(c) - 4);
  const out = chips.map((ch) => {
    const s = ch.s || 1;
    const cols = Array.from({ length: s }, (_, k) => ch.c + k);
    const y = Math.min(...cols.map((c) => top[c])) - CH;
    cols.forEach((c) => (top[c] = y - GAP));
    return { ...ch, s, x: ch.c * CW + 5, y, w: CW * s - 10 };
  });
  const path = new Set();
  chips.forEach((ch) => { if (ch.k === "prog" || ch.path) for (let k = 0; k < (ch.s || 1); k++) path.add(ch.c + k); });
  const first = Math.min(...path), last = Math.max(...path);
  const treads = COLS.map((_, c) => (path.has(c) ? "solid" : c > first && c < last ? "gap" : "none"));
  return { chips: out, treads };
}
function weights(chips) {
  const w = { prog: 0, ai: 0, etc: 0 };
  chips.forEach((ch) => (w[ch.k] += ch.s || 1));
  return w;
}

// ───────── 계단 DOM ─────────
function makeStair(cls, school, year, extraAttrs = "") {
  let d = `M 0 ${BASE}`;
  COLS.forEach((_, c) => { d += ` L ${c * CW} ${floorY(c)} L ${(c + 1) * CW} ${floorY(c)}`; });
  return `
    <div class="s4-stair ${cls}" ${extraAttrs} style="left:${STAIR.x}px;top:${STAIR.y}px;width:${STAIR.w}px;height:${STAIR.h}px">
      <svg class="s4-profile pass" viewBox="0 0 ${STAIR.w} ${STAIR.h}" aria-hidden="true"><path d="${d}"/></svg>
      <div class="s4-school"><span class="sch ${cls === "s4-gb" ? "gbs" : "hanmin"}">${school}</span><small class="s4-year">${year}</small></div>
      ${COLS.map((n, c) => `
        <div class="s4-tread none" data-c="${c}" style="left:${c * CW}px;top:${floorY(c)}px;width:${CW}px"></div>
        <div class="s4-col" style="left:${c * CW}px;top:${floorY(c) + 12}px;width:${CW}px">${n}</div>`).join("")}
      <div class="s4-gaplabel"><b class="g1">빈칸</b><b class="g2">보완형</b><span>알고리즘 설계 기본기</span></div>
      <div class="s4-chips"></div>
    </div>`;
}

function renderStair(stair, chips, { instant = false, hideGapAt = [] } = {}) {
  const { chips: laid, treads } = layout(chips);
  hideGapAt.forEach((c) => { if (treads[c] === "gap") treads[c] = "none"; });
  const box = stair.querySelector(".s4-chips");
  if (instant) stair.classList.add("noanim");
  const seen = new Set();
  laid.forEach((ch, i) => {
    let n = box.querySelector(`[data-id="${ch.id}"]`);
    const fresh = !n;
    if (fresh) {
      n = document.createElement("div");
      n.dataset.id = ch.id;
      n.dataset.avoid = "";        // 붉은 실이 칩의 테두리 위를 지나지 않게(main.js textBoxes)
      n.innerHTML = `<span class="t"></span><i class="note"></i>`;
      box.appendChild(n);
      Object.assign(n.style, { left: `${ch.x}px`, top: `${ch.y - 26}px`, width: `${ch.w}px`, height: `${CH}px` });
      n.classList.add("gone");
      void n.offsetWidth;
    }
    seen.add(ch.id);
    n.className = `s4-chip ${ch.k}`;
    if (ch.ev) n.dataset.ev = ch.ev; else delete n.dataset.ev;
    n.querySelector(".t").textContent = ch.t;
    const note = n.querySelector(".note");
    note.textContent = ch.note || "";
    note.hidden = !ch.note;
    note.classList.toggle("below", !!ch.nb);
    n.style.transitionDelay = fresh && !instant ? `${i * 50}ms` : "0ms";
    Object.assign(n.style, { left: `${ch.x}px`, top: `${ch.y}px`, width: `${ch.w}px`, height: `${CH}px` });
  });
  box.querySelectorAll(".s4-chip").forEach((n) => n.classList.toggle("gone", !seen.has(n.dataset.id)));
  stair.querySelectorAll(".s4-tread").forEach((t, c) => { t.className = `s4-tread ${treads[c]}`; });
  // 빈칸이 두 칸 이상 이어질 때만 이름표
  const runs = [];
  treads.forEach((s, c) => { if (s === "gap") (runs.length && runs.at(-1).end === c - 1 ? (runs.at(-1).end = c) : runs.push({ start: c, end: c })); });
  const big = runs.find((r) => r.end > r.start);
  const gl = stair.querySelector(".s4-gaplabel");
  gl.classList.toggle("show", !!big);
  if (big) {
    Object.assign(gl.style, { left: `${big.start * CW}px`, width: `${(big.end - big.start + 1) * CW}px`, top: `${floorY(big.start) + 44}px` });
    gl.dataset.cx = String(STAIR.x + ((big.start + big.end + 1) / 2) * CW);
    gl.dataset.y = String(STAIR.y + floorY(big.end));
  }
  if (instant) { void stair.offsetWidth; stair.classList.remove("noanim"); }
}

// ───────── 장면 상태 ─────────
let root, gb, hm, timers = [], raf = 0, curSub = 1, curYear = YNOW, ctxRef = null;
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

function setYear(k, { instant = false, hideGapAt = [] } = {}) {
  curYear = k;
  const y = YEARS[k];
  renderStair(hm, y.chips, { instant, hideGapAt });
  hm.querySelector(".s4-year").textContent = y.sub ? `${y.label} · ${y.sub}` : `${y.label}생`;
  root.querySelectorAll(".s4-tick").forEach((t) => { const i = +t.dataset.k; t.classList.toggle("cur", i === k); if (i <= k) t.classList.add("seen"); });
  root.querySelector(".s4-src").textContent = y.src;
  const w = weights(y.chips);
  ["prog", "ai", "etc"].forEach((kind) => {
    const seg = root.querySelector(`.s4-ratio .${kind}`);
    seg.style.flexGrow = String(w[kind] || 0.0001);
    seg.querySelector("b").textContent = w[kind] ? String(w[kind]) : "";
    seg.classList.toggle("empty", !w[kind]);
  });
  if (curSub === 3) ctxRef?.stamp(ST_HM(y.stamp), true);
}


// 5단계: 비교과 블록에서 3D 현장의 라운지로 모이는 실(매 프레임)
const BRICK_W = 150, BRICK_Y = 452, BRICK_H = 46;
const brickX = (i) => 105 + i * (BRICK_W + 8);
function threadLoop() {
  const svg = root.querySelector(".s4-threads");
  const a = ctxRef?.anchor?.("lounge");
  const L = a ? { x: a.x, y: a.y } : { x: 470, y: 560 };
  const fb = root.querySelector(".s4-lounge");
  if (!a) Object.assign(fb.style, { left: `${L.x}px`, top: `${L.y}px` });
  svg.querySelectorAll("path").forEach((p, i) => {
    const bx = brickX(i) + BRICK_W / 2, by = BRICK_Y + BRICK_H;
    p.setAttribute("d", `M ${bx} ${by} C ${bx} ${by + 40}, ${L.x + (bx - L.x) * 0.25} ${L.y - 50}, ${L.x} ${L.y}`);
  });
  raf = requestAnimationFrame(threadLoop);
}

export default {
  mode: "split",
  stamp: ST_GBS,
  chapter: { n: "준거 1", title: "비어 있는 2학년", sub: "정규 교육과정과 비교과 활동의 연결" },
  // 현장: 해 질 녘. 계단·문서가 주인공일 때 더 어둡게, 마지막에 라운지가 보이도록 다시 밝게
  shots: {
    1: { shot: "gbs-front", time: 18.4, dim: 0.5 },
    2: { shot: "hanmin-wide", time: 18.5, dim: 0.42 },
    3: { shot: "hanmin-wide", time: 18.5, dim: 0.68, blur: 2 },
    4: { shot: "hanmin-wide", time: 18.5, dim: 0.74, blur: 3 },
    5: { shot: "hanmin-wide", time: 18.7, dim: 0.38 },
  },

  build(el, ctx) {
    root = el; ctxRef = ctx;
    el.innerHTML = `
      ${makeStair("s4-gb", "경기북과학고", "2025학년도 입학생부터", 'data-out="2"')}
      <div class="hl-label s4-flag" data-out="2">1학년 2학기 시험에 동적계획법</div>
      <svg class="s4-flagline pass" viewBox="0 0 1000 900" data-out="2" aria-hidden="true"><path class="holo" d="M 230 210 L 278 ${STAIR.y + floorY(1) - 4 - CH - 2}"/></svg>

      ${makeStair("s4-hm", "한민고", "2025·2026 입학생", 'data-in="2"')}

      <!-- 3 연도 + 비율 -->
      <div class="s4-years" data-in="3" data-out="4">
        <div class="s4-track">
          <div class="s4-rail"></div>
          ${YEARS.map((y, i) => i < YFIRST ? "" : `<button class="s4-tick" data-k="${i}" style="left:${170 + (i - YFIRST) * 560}px"><b>${y.tick || y.label}</b>${y.sub ? `<small>${y.sub}</small>` : ""}</button>`).join("")}
        </div>
        <div class="s4-ratio" data-ev="3">
          <div class="prog"><b></b><span>프로그래밍</span></div><div class="ai"><b></b><span>AI·데이터</span></div><div class="etc"><b></b><span>기타</span></div>
        </div>
        <div class="s4-shift"><span class="from">프로그래밍</span><span class="arr">→</span><span class="to">인공지능 · 데이터</span></div>
        <div class="s4-src"></div>
      </div>

      <!-- 4 첫 관문 -->
      <div class="s4-gatelabel" data-in="4" data-out="5" data-ev="4">첫 관문</div>
      <!-- 계획서에서 오려 낸 표 조각: 위아래가 찢긴 복사지, 계획서 서식(남색 머리칸·파란 괘선), 테이프로 붙임 -->
      <article class="paper doc-cut s4-plan" data-in="4" data-out="5" data-ex="1" style="--rot:-1.4deg">
        <i class="cut-tape" aria-hidden="true"></i>
        <table><tr><th colspan="5">2학년 1학기 과학 선택 <small>(5과목 중 3과목)</small></th></tr>
          <tr><td>물리학Ⅰ</td><td>화학Ⅰ</td><td>생명과학Ⅰ</td><td>지구과학Ⅰ</td><td><span class="circle-red">정보</span></td></tr></table>
        <p class="cut-pf"><b>64</b>한민고 2022학년도 교육계획서</p>
      </article>
      <div class="s4-entry" data-in="4" data-out="5">
        <div class="s4-e1"><span class="num">과학 3 <i>→</i> 2</span><p>선택과목 안내에서도 "서울대 입시에 불리"</p></div>
        <div class="s4-e2">
          <div class="s4-grades">${Array.from({ length: 9 }, (_, i) => `<span${i === 0 ? ' class="one"' : ""}>${i + 1}</span>`).join("")}</div>
          <p><b>석차 9등급 · 1등급 1명</b> 수강 인원이 적은 상대평가</p>
        </div>
      </div>

      <!-- 5 비교과 블록 → 라운지 -->
      <svg class="s4-threads pass" viewBox="0 0 1000 900" data-in="5" aria-hidden="true">
        ${EXTRA.map(() => `<path class="holo"/>`).join("")}
      </svg>
      <div class="s4-extra" data-in="5">
        <div class="s4-row" data-ev="5" style="left:${brickX(0)}px;top:${BRICK_Y}px;width:${brickX(EXTRA.length-1)+BRICK_W-brickX(0)}px;height:${BRICK_H}px"></div>
        ${EXTRA.map((t, i) => `<div class="s4-brick" style="left:${brickX(i)}px;top:${BRICK_Y}px;width:${BRICK_W}px;height:${BRICK_H}px;--d:${i * 70}ms">${t}</div>`).join("")}
      </div>
      <div class="anchor-label s4-lounge" data-anchor="lounge" data-in="5"><b>AI 라운지</b><i>담당 교사 1명</i></div>

      <!-- 하단 자막 -->
      <div class="lt" data-out="2"><h2>경기북과학고는 매 학기 한 계단씩 오른다</h2></div>
      <div class="lt" data-in="2" data-out="3"><h2>한민고는 2025 입학생부터 2학년 계단이 비었다</h2></div>
      <div class="lt" data-in="3" data-out="4"><h2>정보과학은 3학년 택1로 밀리고, 자료구조는 빠졌다</h2></div>
      <div class="lt" data-in="4" data-out="5"><h2>내가 다닐 때는, 정보 과목 선택부터 쉽지 않았다</h2></div>
      <div class="lt" data-in="5"><h2>빈칸을 메운 활동은 모두 교사 한 명에게 모여 있다</h2></div>
    `;
    gb = el.querySelector(".s4-gb");
    hm = el.querySelector(".s4-hm");
    hm.querySelector(".s4-gaplabel").dataset.ev = "2";     // 4-2: '알고리즘의 수직적 계열이 약해졌다' → 2학년 빈칸
    renderStair(gb, GBS, { instant: true });
    setYear(YNOW, { instant: true });
    el.querySelectorAll(".s4-tick").forEach((b) => b.addEventListener("click", () => {
      if (curSub !== 3) return;
      clearTimers(); setYear(+b.dataset.k); b.blur();
    }));
  },

  step(sub, ctx, { instant, dir }) {
    clearTimers(); cancelAnimationFrame(raf);
    ctxRef = ctx; curSub = sub;
    const inst = instant || ctx.reduced;
    root.dataset.sub = String(sub);

    if (sub === 1) ctx.stamp(ST_GBS, instant);
    else if (sub === 2 || sub === 5) ctx.stamp(ST_HM("2025·2026 입학생."), instant);
    else if (sub === 4) ctx.stamp(ST_HM("2022."), instant);

    if (sub <= 2) setYear(YNOW, { instant: true });
    else if (sub === 3) {
      if (inst || dir < 0) {
        root.querySelectorAll(".s4-tick").forEach((t) => t.classList.add("seen"));
        setYear(YNOW, { instant: inst });
        ctx.stamp(ST_HM("입학년도별 편제."), true);
      } else {
        // 연도는 발표자가 직접 넘긴다(→ 2021 → 2024 → 2025·26 → 다음 단계)
        root.querySelectorAll(".s4-tick").forEach((t) => t.classList.remove("seen"));
        setYear(YFIRST);
      }
    } else if (sub === 4) setYear(YMINE, { instant: inst, hideGapAt: [4] });   // 3학년 1학기 점선은 이 단계의 시선을 흩뜨리므로 감춘다
    else setYear(YNOW, { instant: inst });

    hm.classList.toggle("gate", sub === 4);
    hm.classList.toggle("filled", sub === 5);
    if (sub === 5) threadLoop();
  },

  leave() { clearTimers(); cancelAnimationFrame(raf); },

  // 영상 모드의 상태 이름 꼬리: 4-3(2022~2024) · 4-3b(2025·26)
  videoState(sub) { return sub === 3 && curYear === YEARS.length - 1 ? "b" : ""; },

  key(e) {
    if (curSub !== 3) return false;
    const k = e.key;
    if (/^[1-2]$/.test(k)) { setYear(YFIRST + +k - 1); return true; }
    if (["ArrowRight", "PageDown", " ", "Enter"].includes(k) && curYear < YEARS.length - 1) { setYear(curYear + 1); return true; }
    if (["ArrowLeft", "PageUp"].includes(k) && curYear > YFIRST) { setYear(curYear - 1); return true; }
    return false;
  },
};
