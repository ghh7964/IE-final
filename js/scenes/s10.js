// 장면 10: 반전 (몰입). 3D 현장은 수원을 담지 못하므로, 흐린 현장 위에 2D 경기도 지도를 펼친다.
// 1: 수원(경기과학고) → 파주(한민고)로 불빛의 호(담당 교사), 연표 2015. 2. / 2016 / 2016. 11.
// 2: 2021 나 입학 → 대학 → 2026 캠프 강사로 파주에 돌아옴(노란 호)
const K = 620, KY = 780, X0 = 0, Y0 = 60, LON0 = 126.4, LAT0 = 38.15;
const P = (lon, lat) => [X0 + (lon - LON0) * K, Y0 + (LAT0 - lat) * KY];
const f = (n) => n.toFixed(1);
const poly = (pts) => "M" + pts.map(([a, b]) => P(a, b)).map(([x, y]) => `${f(x)} ${f(y)}`).join("L") + "Z";

// 경기도 윤곽(단순화)
const GG = [
  [126.55, 37.75], [126.68, 37.80], [126.70, 37.93], [126.85, 37.98], [127.00, 38.05], [127.05, 38.15],
  [127.15, 38.30], [127.30, 38.30], [127.40, 38.22], [127.50, 38.10], [127.55, 37.95], [127.70, 37.88],
  [127.85, 37.75], [127.75, 37.62], [127.80, 37.48], [127.85, 37.35], [127.75, 37.20], [127.60, 37.10],
  [127.55, 36.98], [127.35, 36.93], [127.15, 36.90], [126.95, 36.93], [126.82, 37.00], [126.75, 37.08],
  [126.62, 37.15], [126.65, 37.25], [126.72, 37.32], [126.78, 37.40], [126.75, 37.47], [126.80, 37.55],
  [126.72, 37.60], [126.62, 37.62], [126.55, 37.68],
];
const SEOUL = [
  [126.80, 37.57], [126.86, 37.66], [126.97, 37.70], [127.08, 37.69], [127.18, 37.60],
  [127.15, 37.48], [127.05, 37.43], [126.92, 37.45], [126.83, 37.50],
];
const SUWON = P(127.0, 37.29), PAJU = P(126.77, 37.79), UIJ = P(127.05, 37.74), UNI = P(126.92, 37.55);

function qArc(a, b, push) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  let dx = b[0] - a[0], dy = b[1] - a[1];
  const L = Math.hypot(dx, dy); const nx = -dy / L, ny = dx / L;
  return `M${f(a[0])} ${f(a[1])}Q${f(mx + nx * push)} ${f(my + ny * push)} ${f(b[0])} ${f(b[1])}`;
}
const person = (cls, color) =>
  `<g class="fig ${cls}" style="color:${color}"><g transform="translate(0 -6) scale(.78)"><circle cx="0" cy="-31" r="9"/><path d="M-14 13v-19a14 14 0 0 1 28 0v19z"/></g></g>`;

const ITEMS = [
  { d: "2015. 2.", t: "경기과학고 → 한민고", s: "과학영재학교 정보컴퓨터 교사", sub: 1 },
  { d: "2016.", t: "한민고 방과후 ‘정보올림피아드’ 강좌", s: "2016학년도 1텀 · 토요일", sub: 1 },
  { d: "2016. 11.", t: "채점 사이트 학교 대회 기록 시작", s: "CodeUp", sub: 1 },
  { d: "2021.", t: "나, 한민고 입학", s: "", sub: 2, me: true },
  { d: "2025 · 2026.", t: "캠프 강사·멘토로 돌아감", s: "", sub: 2, me: true },
];

let root, svg, figT, figMe, arc1, arcOut, arcBack, items;
let timers = [], rafs = [];
const clearT = () => { timers.forEach(clearTimeout); timers = []; rafs.forEach(cancelAnimationFrame); rafs = []; };
const at = (ms, fn) => timers.push(setTimeout(fn, ms));
const place = (g, [x, y]) => g.setAttribute("transform", `translate(${f(x)} ${f(y)})`);
const ptAt = (path, k) => { const L = path.getTotalLength(); const p = path.getPointAtLength(L * k); return [p.x, p.y]; };
function moveAlong(g, path, dur, done) {
  const t0 = performance.now();
  const tick = (now) => {
    const k = Math.min(1, (now - t0) / dur);
    const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    place(g, ptAt(path, e));
    if (k < 1) rafs.push(requestAnimationFrame(tick)); else done?.();
  };
  rafs.push(requestAnimationFrame(tick));
}
const showItem = (i, on) => items[i].classList.toggle("shown", on);
const drawPath = (p, on, anim) => { p.classList.toggle("anim", !!anim); p.classList.toggle("drawn", on); };

function finalState(sub) {
  root.classList.add("no-tr");
  ITEMS.forEach((it, i) => showItem(i, it.sub <= sub));
  drawPath(arc1, true);
  place(figT, [PAJU[0] - 14, PAJU[1]]);
  figT.classList.add("shown");
  svg.querySelector(".figlab.t").classList.add("shown");
  const two = sub >= 2;
  drawPath(arcOut, two); drawPath(arcBack, two);
  place(figMe, [PAJU[0] + 16, PAJU[1]]);
  figMe.classList.toggle("shown", two);
  svg.querySelector(".figlab.me").classList.toggle("shown", two);
  root.querySelector(".uni").classList.toggle("shown", two);
  void root.offsetWidth;
  requestAnimationFrame(() => root.classList.remove("no-tr"));
}

export default {
  mode: "immersive", letterbox: false, dark: true,
  stamp: "수원 → 파주 · 2015. 2.",
  build(el) {
    root = el;
    el.innerHTML = `
      <svg class="s10-map" viewBox="0 0 1600 900" aria-label="경기도 지도: 수원에서 파주로 이어진 선">
        <defs><filter id="s10glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        <path class="gg" d="${poly(GG)}"/>
        <path class="seoul" d="${poly(SEOUL)}"/>
        <text class="lab-seoul" x="${f(P(127.07, 37.6)[0])}" y="${f(P(127.07, 37.6)[1])}">서울</text>
        <text class="lab-gg" x="${f(P(127.45, 37.3)[0])}" y="${f(P(127.45, 37.3)[1])}">경기도</text>

        <path class="arc1" pathLength="1" d="${qArc(SUWON, PAJU, -150)}"/>
        <path class="arc-out" pathLength="1" d="${qArc(PAJU, UNI, -40)}"/>
        <path class="arc-back" pathLength="1" d="${qArc(UNI, PAJU, -70)}"/>

        <g class="city dim"><circle cx="${f(UIJ[0])}" cy="${f(UIJ[1])}" r="5"/><text x="${f(UIJ[0] + 14)}" y="${f(UIJ[1] + 7)}">의정부 · 경기북과학고</text></g>
        <g class="city uni"><circle cx="${f(UNI[0])}" cy="${f(UNI[1])}" r="6"/><text x="${f(UNI[0] + 16)}" y="${f(UNI[1] + 8)}">대학</text></g>
        <g class="city suwon"><circle cx="${f(SUWON[0])}" cy="${f(SUWON[1])}" r="9"/>
          <text class="nm" x="${f(SUWON[0] + 20)}" y="${f(SUWON[1] + 10)}">수원</text>
          <text class="sb" x="${f(SUWON[0] + 20)}" y="${f(SUWON[1] + 40)}">경기과학고 · 과학영재학교</text></g>
        <g class="city paju"><circle cx="${f(PAJU[0])}" cy="${f(PAJU[1])}" r="9"/>
          <text class="nm" x="${f(PAJU[0] + 30)}" y="${f(PAJU[1] - 4)}">파주</text>
          <text class="sb" x="${f(PAJU[0] + 30)}" y="${f(PAJU[1] + 26)}">한민고 · 일반고</text></g>

        ${person("t", "var(--lamp-deep)")}
        ${person("me", "var(--lamp)")}
        <text class="figlab t" x="${f(PAJU[0] - 34)}" y="${f(PAJU[1] - 14)}">담당 교사</text>
        <text class="figlab me" x="${f(PAJU[0] + 16)}" y="${f(PAJU[1] - 52)}">나</text>
      </svg>
      <ol class="s10-tl">${ITEMS.map((it) => `<li class="${it.me ? "me" : ""}"><span class="d">${it.d}</span><span class="t">${it.t}</span>${it.s ? `<span class="s">${it.s}</span>` : ""}</li>`).join("")}</ol>
      <div class="lt s10-lt" data-out="2"><h2>영재학교의 지도 방식이<br>한 사람을 따라 일반고로 옮겨 왔다</h2></div>
      <div class="lt s10-lt" data-in="2"><h2>그 교실에서 배운 내가,<br>2026년 강사로 돌아간다</h2></div>`;
    svg = el.querySelector("svg");
    figT = svg.querySelector(".fig.t"); figMe = svg.querySelector(".fig.me");
    arc1 = svg.querySelector(".arc1"); arcOut = svg.querySelector(".arc-out"); arcBack = svg.querySelector(".arc-back");
    items = [...el.querySelectorAll(".s10-tl li")];
  },
  step(sub, ctx, { instant, dir }) {
    clearT();
    root.dataset.sub = String(sub);
    ctx.stamp(sub === 2 ? "파주 · 2021 → 2026" : "수원 → 파주 · 2015. 2.", instant);
    if (instant || ctx.reduced || dir < 0) { finalState(sub); return; }
    if (sub === 1) {
      finalState(0);
      ITEMS.forEach((_, i) => showItem(i, false));
      drawPath(arc1, false); figT.classList.remove("shown"); svg.querySelector(".figlab.t").classList.remove("shown");
      requestAnimationFrame(() => {
        place(figT, SUWON);
        at(150, () => { figT.classList.add("shown"); showItem(0, true); });
        at(700, () => { drawPath(arc1, true, true); moveAlong(figT, arc1, 1800, () => { place(figT, [PAJU[0] - 14, PAJU[1]]); svg.querySelector(".figlab.t").classList.add("shown"); }); });
        at(2300, () => showItem(1, true));
        at(3300, () => showItem(2, true));
      });
    } else {
      finalState(1);
      at(200, () => { showItem(3, true); place(figMe, [PAJU[0] + 16, PAJU[1]]); figMe.classList.add("shown"); svg.querySelector(".figlab.me").classList.add("shown"); });
      at(1300, () => { root.querySelector(".uni").classList.add("shown"); drawPath(arcOut, true, true); moveAlong(figMe, arcOut, 1000); });
      at(2600, () => { drawPath(arcBack, true, true); moveAlong(figMe, arcBack, 1400, () => place(figMe, [PAJU[0] + 16, PAJU[1]])); });
      at(3300, () => showItem(4, true));
    }
  },
  leave() { clearT(); },
};
