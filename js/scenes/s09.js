// 장면 9: 수사 결론 (몰입, 밤, 두 학교를 위에서)
// 1 자막: "학교 유형 때문일까?" → 가설 → "절반만 맞다."
// 2 분석: 각 학교 위(3D 위치)에 발광 동심원. 중심 목적 → 조직·문서 → 사람.
//   안쪽 활동은 종이 쪽지(문서가 따른다), 바깥 활동은 실에 매달려 있다.
//   한민고의 실은 AI 라운지에서 솟은 불빛(담당 교사)으로, 경기북 ALPS·GCC는 '학생 기수'로.
// 3 끊기: 앞으로 넘어오면 저절로(녹화용, 11/23) 불빛이 한 번 당겨졌다가 → 라운지 불이 꺼지고 실이 끊어져 바깥 활동이 흩어진다.
//   현장도 한 단계 더 어두워져 9-2(구조)와 9-3(끊김)이 다른 화면으로 읽힌다. 불빛(교사) 클릭이나 C로 되돌려 볼 수 있다.
const R0 = 62, R1 = 160, R2 = 250;
const BEAM = 300;                      // 라운지에서 솟는 불빛 기둥 높이(px)
const rad = (d) => (d * Math.PI) / 180;
const pol = (r, d) => [r * Math.cos(rad(d)), r * Math.sin(rad(d))];
const f = (n) => n.toFixed(1);
const lerp = (a, b, t) => a + (b - a) * t;
const lp = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const dOf = (p) => `M${f(p[0][0])} ${f(p[0][1])}C${f(p[1][0])} ${f(p[1][1])} ${f(p[2][0])} ${f(p[2][1])} ${f(p[3][0])} ${f(p[3][1])}`;
function split(pts, t) {
  const left = [pts[0]], right = [pts[pts.length - 1]];
  let cur = pts;
  while (cur.length > 1) {
    const nx = [];
    for (let i = 0; i < cur.length - 1; i++) nx.push(lp(cur[i], cur[i + 1], t));
    left.push(nx[0]); right.unshift(nx[nx.length - 1]);
    cur = nx;
  }
  return [left, right];
}

// 한민고 바깥(사람) 활동: [id, 이름, 각도, 흩어질 방향]
const HM_OUT = [
  ["olym", "올림피아드 지도", 118, [-14, 34]],
  ["camp", "정보캠프", 150, [-26, 52]],
  ["night", "야간 활동", 182, [-12, 64]],
  ["after", "방과후 강좌", 214, [-30, 46]],
  ["cps", "CPS 동아리", 246, [-18, 58]],
];
// 안쪽(조직·문서) 활동
// 안쪽 활동에는 맡은 주체가 도장으로 찍혀 있다(보고서 그림 1 "항목 아래 작은 글씨는 그 일을 맡은 주체", Ⅲ-2 부서 배정)
const HM_IN = [["정규 정보 과목", 90, "정보 교사 2명"]];
const GB_IN = [["AP", 225, "교육과정운영부"], ["과학동아리", 315, "융합과학교육부"], ["R&E", 45, "학생연구지원부"], ["정규 정보 과목", 135, "정보 교사 3명"]];
const GB_OUT = [["alps", "ALPS", 202], ["gcc", "GCC", 158]];
const COHORT_DX = -405;
// 그동안 모은 증거(번호)가 제자리에 꽂힌다: 활동 이름 옆에 그것을 보여 준 증거 번호
const EXM = { top: [2, 3, 4], night: [5], cps: [6], hmIn: [1], hmCore: [], alps: [7, 8, 9, 10], gbIn: [] };
const exRow = (nums, x, y) => `<g class="exrow" transform="translate(${x} ${y})">${nums.map((n, i) =>
  `<g class="ex-pin" style="--k:${n}"><rect x="${i * 40}" y="-12" width="36" height="24"/><text x="${i * 40 + 18}" y="5">${String(n).padStart(2, "0")}</text></g>`).join("")}</g>`;                // 경기북 중심에서 '학생 기수'까지(두 학교 사이)

const person = (x, y, s = 1, cls = "") =>
  `<g class="pp ${cls}" transform="translate(${x} ${y}) scale(${s})"><circle cx="0" cy="-31" r="9"/><path d="M-14 13v-19a14 14 0 0 1 28 0v19z"/></g>`;

function rings(cls, core, name, typ, side, np = [0, R2 + 46, "middle"]) {
  // side: 고리 이름을 놓을 쪽(+1 오른쪽, -1 왼쪽)
  return `<g class="rings ${cls}">
    <circle class="z2" r="${R2}"/><circle class="z1" r="${R1}"/><circle class="z0" r="${R0}"/>
    <text class="core" y="-4">${core}</text>
    <text class="zlab" x="${side * (R0 + R1) / 2}" y="7">조직·문서</text>
    <text class="zlab ppl" x="${side * (R1 + R2) / 2}" y="7">사람</text>
    <text class="sname" x="${np[0]}" y="${np[1]}" style="text-anchor:${np[2]}">${name}</text>
    <text class="stype" x="${np[0]}" y="${np[1] + 30}" style="text-anchor:${np[2]}">${typ}</text>
  </g>`;
}
const slip = ([label, a, owner], r = 112, i = 0) => {
  const [x, y] = pol(r, a), sw = owner.length * 18.5 + 24, w = Math.max(label.length * 20 + 30, sw + 20);
  return `<g class="slip" transform="translate(${f(x)} ${f(y)})" style="--j:${i}"><rect class="pg" x="${-w / 2}" y="-34" width="${w}" height="72"/><text class="sl" y="-7">${label}</text>
    <g class="seal"><g transform="rotate(-3)"><rect x="${-sw / 2}" y="5" width="${sw}" height="27" rx="2"/><text y="25">${owner}</text></g></g></g>`;
};

let root, svg, hmG, gbG, beamG, cap, hint, sub = 0, timers = [], raf = 0, loop = 0, cutOn = false, cutT = 0, ctxRef = null;
const threads = [];   // { id, whole, a, b, item, ang }

const clearT = () => { timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(raf); };

function caption(ctx) {
  const h = ctx?.state?.hands;
  const n = typeof h === "number" && Number.isFinite(h) && h > 0 ? h : null;
  return n ? `아까 손 드신 ${n}명이 떠올린 그 활동,<br>그 선생님이 떠난 뒤에도 남아 있을까요?` : "처음에 떠올린 그 활동,<br>그 선생님이 떠난 뒤에도 남아 있을까요?";
}

// 현재 화면에서의 위치(3D 앵커를 매 프레임 따라간다)
let H = [418, 414], G = [1223, 480], L = [446, 429];
function readAnchors(ctx) {
  const h = ctx.anchor?.("hanmin"), g = ctx.anchor?.("gbs"), l = ctx.anchor?.("lounge");
  if (h?.visible) H = [h.x, h.y];
  if (g?.visible) G = [g.x, g.y];
  if (l?.visible) L = [l.x, l.y];
}
const beamTop = () => [L[0], H[1] - R2 - 64];

function threadBase(th) {
  const P = add(H, pol(R2, th.ang)), B = add(beamTop(), [-14, 12]);
  return [P, [P[0] - 50, P[1] - 70], [B[0] - 230, B[1] + 30], B];
}
function layout() {
  hmG.setAttribute("transform", `translate(${f(H[0])} ${f(H[1])})`);
  gbG.setAttribute("transform", `translate(${f(G[0])} ${f(G[1])})`);
  const T = beamTop();
  beamG.querySelector(".beam").setAttribute("d", `M${f(L[0])} ${f(L[1])}L${f(T[0])} ${f(T[1] + 26)}`);
  beamG.querySelector(".src").setAttribute("transform", `translate(${f(L[0])} ${f(L[1])})`);
  beamG.querySelector(".top").setAttribute("transform", `translate(${f(T[0])} ${f(T[1])})`);
  threads.forEach((th) => {
    const base = threadBase(th);
    th.whole.setAttribute("d", dOf(base));
    // 끊긴 모양: 활동 쪽(a)은 늘어져 떨어지고, 교사 쪽(b)은 위로 감긴다
    const [A0, B0] = split(base, 0.62), t = cutT;
    const P0 = A0[0], E = [lerp(P0[0], A0[3][0], 0.25), P0[1] + 120];
    const A1 = [P0, [lerp(P0[0], E[0], 0.2), P0[1] + 60], [E[0] + 6, E[1] - 40], E];
    const P3 = B0[3], B1 = [[P3[0] - 10, P3[1] + 26], [P3[0] - 8, P3[1] + 18], [P3[0] - 4, P3[1] + 8], P3];
    const wob = Math.sin(t * Math.PI * 3) * (1 - t) * 12;
    const A = A0.map((p, i) => lp(p, A1[i], t)); A[3] = [A[3][0], A[3][1] + wob];
    const B = B0.map((p, i) => lp(p, B1[i], t));
    th.a.setAttribute("d", dOf(A)); th.b.setAttribute("d", dOf(B));
  });
  // 경기북: ALPS·GCC → 학생 기수
  const C = add(G, [COHORT_DX + 58, -8]);
  gbG.parentNode.querySelectorAll(".th.gb").forEach((p) => {
    const a = Number(p.dataset.ang), P = add(G, pol(R2, a));
    p.setAttribute("d", `M${f(P[0])} ${f(P[1])}C${f(P[0] - 60)} ${f(P[1])} ${f(C[0] + 50)} ${f(C[1])} ${f(C[0])} ${f(C[1])}`);
  });
  svg.querySelector(".cohort").setAttribute("transform", `translate(${f(G[0] + COHORT_DX)} ${f(G[1])})`);
}

function setCut(on, ctx, immediate) {
  cancelAnimationFrame(raf);
  cutOn = on;
  if (ctx) ctx.state.cut = on;
  root.classList.toggle("cut", on);
  cap.querySelector(".after").innerHTML = caption(ctx);
  // 라운지 불: 끊기면 꺼진다
  if (ctx?.world?.ok) ctx.world.setRoom("hanmin-lounge", on ? false : null);
  // 끊기면 현장이 한 단계 더 어두워진다(다음 단계로 넘어가면 main.js가 그 단계의 값으로 되돌린다)
  if (sub === 3) document.getElementById("deck")?.style.setProperty("--world-dim", on ? "0.62" : "0.35");
  if (immediate || ctx?.reduced || !on) { cutT = on ? 1 : 0; layout(); return; }
  root.querySelectorAll(".spark").forEach((s) => { s.classList.remove("go"); void s.getBBox(); s.classList.add("go"); });
  const t0 = performance.now(), D = 1100;
  const tick = (now) => {
    const k = Math.min(1, (now - t0) / D);
    cutT = 1 - Math.pow(1 - k, 3);
    if (k < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}

export default {
  mode: "immersive", letterbox: false, dark: true,
  stamp: "경기도 파주 · 의정부 · 밤",
  shots: { 2: { dim: 0.5 }, 3: { dim: 0.55 } },

  build(el, ctx) {
    root = el; ctxRef = ctx;
    const hmOut = HM_OUT.map(([id, lab, a, s]) => {
      const [x, y] = pol(R2, a);
      return `<g class="out" data-id="${id}" style="--sx:${s[0]}px;--sy:${s[1]}px;--r:${(s[0] > -20 ? -1 : 1) * 6}deg"><g transform="translate(${f(x)} ${f(y)})">
        <path class="tail" d="M0 0c6 -14 22 -16 20 -34"/><circle class="dot" r="6"/><text class="olab" x="-16" y="9">${lab}</text>${EXM[id] ? exRow(EXM[id], -52 - (EXM[id].length - 1) * 40, 36) : ""}</g></g>`;
    }).join("");
    const gbOut = GB_OUT.map(([id, lab, a]) => {
      const [x, y] = pol(R2, a);
      return `<g class="out gbo ${id}" transform="translate(${f(x)} ${f(y)})"><circle class="dot" r="6"/><text class="olab" x="-16" y="-14">${lab}</text>${id === "alps" ? `<text class="note" x="-16" y="-46">2024~ 연간 계획에서 사라짐</text>${exRow(EXM.alps, -250, 24)}` : ""}</g>`;
    }).join("");
    el.innerHTML = `
      <div class="s9-q" data-out="2">
        <p class="q1">학교 유형 때문일까?</p>
        <p class="q2">과학고라서 제도가 있고, 일반고라서 사람에게 기댄다.</p>
        <p class="q3">꼭 그렇지는 않다.</p>
      </div>
      <svg class="s9-map" data-in="2" viewBox="0 0 1600 900" aria-label="두 학교의 정보 분야 활동을 학교의 중심 목적에서의 거리에 따라 배치한 그림">
        <g class="beamunder"><path class="beam"/><g class="src"><circle class="glowdot" r="9"/></g></g>
        <g class="hm">${rings("hm", "수능·진학", "한민고등학교", "일반고", 1, [168, 252, "start"])}${HM_IN.map((s, i) => slip(s, 116, i)).join("")}${exRow(EXM.hmIn, 102, 112)}${exRow(EXM.hmCore, -18, 34)}</g>
        <g class="gb">${rings("gb", "과학 연구", "경기북과학고등학교", "과학고", -1)}${GB_IN.map((s, i) => slip(s, 142, i + 1)).join("")}${exRow(EXM.gbIn, 196, -100)}</g>
        <g class="gbth">${GB_OUT.map(([id, , a]) => `<path class="th gb ${id}" data-ang="${a}"/>`).join("")}</g>
        <g class="cohort">
          <g class="old">${person(-26, 14, 0.8)}${person(0, 14, 0.8)}${person(26, 14, 0.8)}</g>
          <g class="new">${person(-26, 14, 0.8)}${person(0, 14, 0.8)}${person(26, 14, 0.8)}</g>
          <text class="who" y="62">학생 기수</text>
          <text class="who-s swap" y="88">해마다 바뀐다</text>
        </g>
        <g class="hmth"></g>
        <g class="hm-out-layer"></g>
        <g class="beamg">
          <g class="top" role="button" aria-label="담당 교사(클릭하면 실이 끊어진다)">
            <circle class="hit" r="60" cy="-10"/>
            ${person(0, 14, 1.15, "t-fig")}
            <text class="who" x="40" y="-14" text-anchor="start">담당 교사 1명</text>
            <text class="who-s" x="40" y="14" text-anchor="start">AI 라운지의 불빛</text>
            ${exRow(EXM.top, 40, 42)}
          </g>
        </g>
      </svg>
      <div class="lt s9-cap" data-in="2"><h2 class="before">중심에 가까울수록 <span class="k-doc">조직과 문서</span>, 멀수록 <span class="k-ppl">사람</span></h2><h2 class="after"></h2></div>`;
    svg = el.querySelector(".s9-map");
    hmG = svg.querySelector("g.hm"); gbG = svg.querySelector("g.gb"); beamG = svg;
    cap = el.querySelector(".s9-cap");
    hint = svg.querySelector(".hint");
    gbOut && gbG.insertAdjacentHTML("beforeend", gbOut);

    const NS = "http://www.w3.org/2000/svg";
    const mk = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v)); parent.appendChild(n); return n; };
    const thL = svg.querySelector(".hmth"), outL = svg.querySelector(".hm-out-layer");
    outL.innerHTML = hmOut;
    // 바깥 활동 묶음은 한민 중심을 따라 움직인다
    HM_OUT.forEach(([id, , a], i) => {
      const th = { id, ang: a };
      th.whole = mk("path", { class: "th whole", pathLength: "1", style: `--i:${i}` }, thL);
      th.a = mk("path", { class: "th piece a" }, thL);
      th.b = mk("path", { class: "th piece b" }, thL);
      th.spark = mk("circle", { class: "spark", r: 5 }, thL);
      threads.push(th);
    });
    svg.querySelector(".top").addEventListener("click", () => { if (sub === 3) setCut(!cutOn, ctxRef, false); });
  },

  enter(ctx) {
    ctxRef = ctx;
    cancelAnimationFrame(loop);
    const outL = svg.querySelector(".hm-out-layer");
    const tick = () => {
      readAnchors(ctx);
      outL.setAttribute("transform", `translate(${f(H[0])} ${f(H[1])})`);
      layout();
      threads.forEach((th) => {
        const [A0] = split(threadBase(th), 0.62);
        th.spark.setAttribute("cx", f(A0[3][0])); th.spark.setAttribute("cy", f(A0[3][1]));
      });
      loop = requestAnimationFrame(tick);
    };
    tick();
  },

  step(s, ctx, { instant, dir, arrive }) {
    ctxRef = ctx;
    clearT();
    sub = s;
    root.dataset.sub = String(s);
    const q3 = root.querySelector(".q3"), q2 = root.querySelector(".q2");
    q2.classList.remove("show"); q3.classList.remove("show");
    if (s === 1) {
      if (instant || ctx.reduced) { q2.classList.add("show"); q3.classList.add("show"); }
      else { timers.push(setTimeout(() => q2.classList.add("show"), 900)); timers.push(setTimeout(() => q3.classList.add("show"), 2600)); }
    }
    root.classList.toggle("drawing", s === 2 && !instant && !ctx.reduced && dir > 0);
    if (root.classList.contains("drawing")) {
      // 증거 번호는 화면 왼쪽(물러난 기록철 자리)에서 날아와 꽂힌다
      const rr = root.getBoundingClientRect(), k = rr.width / 1600;
      root.querySelectorAll(".ex-pin").forEach((p) => {
        const r = p.getBoundingClientRect();
        const cx = (r.left + r.width / 2 - rr.left) / k, cy = (r.top + r.height / 2 - rr.top) / k;
        p.style.setProperty("--fx", `${(-40 - cx).toFixed(0)}px`); p.style.setProperty("--fy", `${(450 - cy).toFixed(0)}px`);
      });
    }
    root.classList.remove("pre");
    if (s < 3) setCut(false, ctx, true);
    else if (instant || ctx.reduced || dir < 0) setCut(true, ctx, true);
    else {
      // 9-2와 같은 그림에서 시작해, 불빛이 한 번 팽팽해진 뒤 끊어진다
      setCut(false, ctx, true);
      const a = arrive || 0;
      timers.push(setTimeout(() => root.classList.add("pre"), a + 500));
      timers.push(setTimeout(() => { root.classList.remove("pre"); setCut(true, ctx, false); }, a + 1500));
    }
  },

  leave(ctx) {
    clearT(); cancelAnimationFrame(loop);
    root.classList.remove("drawing", "pre");
    ctx?.world?.ok && ctx.world.setRoom("hanmin-lounge", null);
  },

  key(e, ctx) {
    if (sub !== 3 || !(e.key === "c" || e.key === "C")) return false;
    setCut(!cutOn, ctx, false);
    return true;
  },
};
