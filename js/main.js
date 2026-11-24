// 발표 엔진: 단계 상태 기계, 원문 창 하이라이트, 분할/몰입 모드, 키보드, 발표자 창 동기화.
import { STEPS } from "./steps.js";
import { SCENES } from "./scenes/index.js";
import { SHOTS } from "./shots.js";
import { createVideo } from "./video.js";

const $ = (id) => document.getElementById(id);
const deck = $("deck");
const params = new URLSearchParams(location.search);
if (params.has("rec")) document.body.classList.add("rec");      // 녹화 도구가 찍을 때: 진행 표시·필름 질감 빼기
const reportPane = $("reportPane");
const reportScroll = $("reportScroll");
const reportDoc = $("reportDoc");
const reportLocation = $("reportLocation");
const scenesEl = $("scenes");
const stampEl = $("stamp");
const visualEl = $("visual");
const stringsEl = $("strings");
const chapterEl = $("chapter");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduced) document.body.classList.add("no-motion");

const ctx = {
  state: { hands: null, cut: false },   // 장면끼리 공유하는 값(예: 손 든 사람 수)
  reduced,
  deck,
  world: null,                           // 3D 현장(js/world.js). 준비되기 전에는 null
  emit: (msg) => channel.postMessage(msg),
  // 장소·시각 자막을 장면 중간에 바꾼다(예: 파주 → 의정부)
  stamp: (text, instant) => { if (stampEl.dataset.text !== text) typeStamp(text, instant); },
  // 3D 위치(앵커 이름 또는 [x,y,z])를 현재 장면 좌표(.visual 기준 px)로
  anchor(name) {
    const p = ctx.world?.screenPos?.(name);
    if (!p) return null;
    return { x: p.x - visualEl.offsetLeft, y: p.y, visible: p.visible };
  },
};

// ───────── 무대 크기 맞추기 ─────────
function fit() {
  const s = Math.min(innerWidth / 1600, innerHeight / 900);
  deck.style.transform = `translate(-50%, -50%) scale(${s})`;
}
addEventListener("resize", fit);
fit();

// ───────── 장면 DOM 만들기 ─────────
const sceneEls = SCENES.map((sc, i) => {
  const el = document.createElement("section");
  el.className = "scene" + (sc.dark ? " dark" : "");
  el.dataset.scene = String(i);
  el.dataset.mode = sc.mode || "split";
  scenesEl.appendChild(el);
  try { sc.build?.(el, ctx); } catch (e) { console.error(`장면 ${i} build 오류`, e); }
  return el;
});

// ───────── 증거 번호: 장면 안의 기록 문서 [data-ex="N"] ─────────
// 처음 나온 단계부터 기록철 오른쪽에 색인표(N)가 붙고, 화면에 나와 있는 동안 그 색인표가 빠져나온다.
// 문서가 화면에서 물러날 때(앞으로 갈 때) 기록철 색인표 자리로 접혀 들어간다.
const pad2 = (n) => String(n).padStart(2, "0");
function shownAt(n, sub) {
  for (let e = n; e && !e.classList.contains("scene"); e = e.parentElement) {
    if (e.dataset.in && sub < Number(e.dataset.in)) return false;
    if (e.dataset.out && sub >= Number(e.dataset.out)) return false;
  }
  return true;
}
const EX = new Map();   // N → { first: 단계 번호, els: [{ n, scene }] }
sceneEls.forEach((el, si) => {
  const subs = STEPS.filter((s) => s.scene === si).map((s) => s.sub);
  el.querySelectorAll("[data-ex]").forEach((n) => {
    const k = Number(n.dataset.ex);
    if (!n.querySelector(":scope > .ex-no")) n.insertAdjacentHTML("afterbegin", `<span class="ex-no">증거 ${pad2(k)}</span>`);
    const sub = subs.find((x) => shownAt(n, x));
    if (sub == null) return;
    const idx = STEPS.findIndex((s) => s.scene === si && s.sub === sub);
    const e = EX.get(k) || { first: Infinity, els: [] };
    e.first = Math.min(e.first, idx); e.els.push({ n, scene: si }); EX.set(k, e);
  });
});
const exTabs = document.createElement("div");
exTabs.className = "ex-tabs"; exTabs.setAttribute("aria-hidden", "true");
exTabs.innerHTML = [...EX.keys()].sort((a, b) => a - b).map((k) => `<i data-n="${k}">${pad2(k)}</i>`).join("");
reportPane.prepend(exTabs);
ctx.exhibits = EX;
function visibleExhibits(i) {
  const st = STEPS[i], out = new Map();
  EX.forEach((e, k) => e.els.forEach(({ n, scene }) => { if (scene === st.scene && shownAt(n, st.sub)) out.set(k, n); }));
  return out;
}
function exRects(i) {
  const { r: dr, k } = deckRect(), out = [];
  visibleExhibits(i).forEach((n, key) => {
    const r = n.getBoundingClientRect();
    if (r.width) out.push([key, { x: (r.left - dr.left) / k, y: (r.top - dr.top) / k, w: r.width / k, h: r.height / k }]);
  });
  return out;
}
function updateExhibits(i, before) {
  const now = visibleExhibits(i);
  exTabs.querySelectorAll("i").forEach((t) => {
    const k = Number(t.dataset.n);
    t.classList.toggle("filed", EX.get(k).first <= i);
    t.classList.toggle("cur", now.has(k) && deck.dataset.mode === "split");
  });
  if (!before?.length || reduced || deck.dataset.mode !== "split") return;
  const { r: dr, k: sc } = deckRect();
  before.filter(([key]) => !now.has(key)).forEach(([key, r], j) => {
    const tab = exTabs.querySelector(`i[data-n="${key}"]`);
    if (!tab) return;
    // 색인표는 접힌 문서가 도착할 때까지 빠져나온 채로 기다렸다가, 받아서 한 번에 들어간다
    tab.classList.add("cur");
    const tr = tab.getBoundingClientRect();
    const tx = (tr.left - dr.left) / sc + tr.width / sc / 2, ty = (tr.top - dr.top) / sc + tr.height / sc / 2;
    const g = document.createElement("div");
    g.className = "ex-ghost"; g.textContent = pad2(key);
    Object.assign(g.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });
    deck.appendChild(g);
    const s = Math.max(0.06, 40 / r.w);
    // 끝에서 0.25로 남았다가 지워지면 색인표 위에서 한 번 번쩍인다 → 색인표에 닿으며 완전히 녹아 사라지게
    const end = `translate(${tx - (r.x + r.w / 2)}px, ${ty - (r.y + r.h / 2)}px) scale(${s}, ${Math.max(0.06, 28 / r.h)})`;
    g.animate([
      { transform: "translate(0,0) scale(1)", opacity: 0.9 },
      { transform: `translate(${(tx - (r.x + r.w / 2)) * 0.7}px, ${(ty - (r.y + r.h / 2)) * 0.7}px) scale(${1 - (1 - s) * 0.7}, ${1 - (1 - Math.max(0.06, 28 / r.h)) * 0.7})`, opacity: 0.45, offset: 0.7 },
      { transform: end, opacity: 0 },
    ], { duration: 760, delay: j * 90, easing: "cubic-bezier(.5,0,.2,1)", fill: "both" }).onfinish = () => {
      g.remove();
      if (!visibleExhibits(cur).has(key) || deck.dataset.mode !== "split") tab.classList.remove("cur");
    };
  });
}

// ───────── 원문 불러와 하이라이트 표시 ─────────
const norm = (s) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/ /g, " ");

function wrapRange(root, start, end, stepIdx) {
  // root의 텍스트에서 [start, end) 구간을 <mark class="hl" data-step>으로 감싼다(여러 노드에 걸쳐도 됨).
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const parts = [];
  let pos = 0, n;
  while ((n = walker.nextNode())) {
    const len = n.nodeValue.length;
    const a = Math.max(start, pos), b = Math.min(end, pos + len);
    if (a < b) parts.push([n, a - pos, b - pos]);
    pos += len;
    if (pos >= end) break;
  }
  for (const [node, a, b] of parts) {
    const r = document.createRange();
    r.setStart(node, a); r.setEnd(node, b);
    const m = document.createElement("mark");
    m.className = "hl"; m.dataset.step = String(stepIdx);
    r.surroundContents(m);
  }
}

async function loadReport() {
  try {
    const res = await fetch("report_fragment.html", { cache: "no-cache" });
    reportDoc.innerHTML = await res.text();
  } catch (e) {
    reportDoc.innerHTML = '<p class="rp-loading">원문을 불러오지 못했습니다. python3 -m http.server로 띄웠는지 확인하세요.</p>';
    console.error(e);
    return;
  }
  const blocks = [...reportDoc.querySelectorAll("p, li, td, h2, h3, figcaption")];
  let missing = 0;
  STEPS.forEach((st, i) => {
    (st.hl || []).forEach((needle) => {
      const nn = norm(needle);
      const hits = blocks.filter((b) => norm(b.textContent).includes(nn));
      if (hits.length !== 1) {
        missing++;
        console.warn(`[원문 강조] 단계 ${i + 1}: "${needle}" → ${hits.length}곳에서 발견`);
        if (!hits.length) return;
      }
      const b = hits[0];
      const idx = norm(b.textContent).indexOf(nn);
      wrapRange(b, idx, idx + nn.length, i);
      b.classList.add("hl-host");
    });
  });
  window.__hlMissing = missing;
}

// 인쇄본과 같은 쪽으로 원문을 낱장(.sheet)으로 나눈다. report_pages.json = 인쇄본 쪽마다 처음 시작하는 블록의 앞부분.
async function paginate() {
  let pages;
  try { pages = await (await fetch("report_pages.json", { cache: "no-cache" })).json(); } catch { return; }
  const key = (el) => norm((el.matches("figure") ? el.querySelector("figcaption")?.textContent : el.textContent) || "").replace(/\s+/g, " ").trim();
  const blocks = [...reportDoc.querySelectorAll("p, h2, h3, table, figure, li")];
  const starts = new Map();                         // 블록 → 그 블록에서 시작하는 쪽 번호
  for (const pg of pages.slice(1)) {
    if (!pg.first) continue;
    const want = pg.first.startsWith("FIG:") ? pg.first.slice(4) : pg.first;
    const hit = blocks.find((el) => !starts.has(el) && key(el).startsWith(want));
    if (hit) starts.set(hit, pg.page); else console.warn(`[원문 쪽] ${pg.page}쪽 시작 블록을 찾지 못함: ${want}`);
  }
  // 맨 위 자식 단위로 자르되, 감싸는 상자(예: 참고문헌) 안에서 시작하면 그 상자를 둘로 나눈다.
  const units = [];
  for (const top of [...reportDoc.children]) {
    const inner = [...starts.keys()].filter((b) => b !== top && top.contains(b));
    if (!inner.length) { units.push({ node: top, page: starts.get(top) }); continue; }
    let shell = top.cloneNode(false), page = starts.get(top);
    for (const ch of [...top.childNodes]) {
      const sp = [...starts.entries()].find(([b]) => b === ch || ch.contains?.(b))?.[1];
      if (sp && shell.childNodes.length) { units.push({ node: shell, page }); shell = top.cloneNode(false); page = sp; }
      else if (sp) page = sp;
      shell.appendChild(ch);
    }
    units.push({ node: shell, page });
  }
  const frag = document.createDocumentFragment();
  let sheet = null;
  const open = (n) => { sheet = document.createElement("section"); sheet.className = "sheet"; sheet.dataset.page = String(n); frag.appendChild(sheet); };
  open(1);
  for (const u of units) {
    if (u.page && sheet.childNodes.length) open(u.page);
    sheet.appendChild(u.node);
  }
  frag.querySelectorAll(".sheet").forEach((sh) => { const f = document.createElement("footer"); f.className = "sheet-no"; f.textContent = sh.dataset.page; sh.appendChild(f); });
  reportDoc.innerHTML = ""; reportDoc.appendChild(frag);
}

function centerOn(marks, instant) {
  if (!marks.length) return;
  requestAnimationFrame(() => {
    // 화면 좌표(getBoundingClientRect)가 아니라 문서 안 위치(offsetTop)로 잰다: 몰입 → 분할로 넘어올 때 기록철이
    // 기울어진 채 미끄러져 들어오는 중이라 화면 좌표로 재면 자리가 달라진다(바로 이동 · 넘겨서 도착이 같은 자리여야 영상 모드 이음새가 맞는다).
    const yIn = (el) => { let y = 0; for (let e = el; e && e !== reportScroll; e = e.offsetParent) y += e.offsetTop; return y; };
    const a = marks[0], b = marks[marks.length - 1];
    const mid = (yIn(a) + yIn(b) + b.offsetHeight) / 2;
    const top = Math.max(0, Math.min(mid - reportScroll.clientHeight * 0.42, reportScroll.scrollHeight - reportScroll.clientHeight));
    reportScroll.scrollTo({ top, behavior: instant || reduced ? "auto" : "smooth" });
  });
}

function updateReport(i, instant) {
  const marks = [...reportDoc.querySelectorAll(`mark.hl[data-step="${i}"]`)];
  reportDoc.querySelectorAll("mark.hl.on").forEach((m) => m.classList.remove("on"));
  reportDoc.querySelectorAll(".has-hl").forEach((m) => m.classList.remove("has-hl"));
  marks.forEach((m) => { m.classList.add("on"); m.closest(".hl-host")?.classList.add("has-hl"); });
  reportPane.classList.toggle("tracking", marks.length > 0);
  const pg = marks[0]?.closest(".sheet")?.dataset.page;
  reportLocation.innerHTML = `${STEPS[i].loc || ""}${pg ? `<small>보고서 ${pg}쪽</small>` : ""}`;
  centerOn(marks, instant);
}

// ───────── 타임스탬프 타이핑 ─────────
let stampTimer = 0;
function typeStamp(text, instant) {
  clearInterval(stampTimer);
  stampEl.dataset.text = text || "";
  stampEl.textContent = "";
  if (!text) return;
  if (instant || reduced) { stampEl.textContent = text; return; }
  let k = 0;
  stampEl.innerHTML = '<span></span><i class="caret"></i>';
  const span = stampEl.firstChild;
  stampTimer = setInterval(() => {
    span.textContent = text.slice(0, ++k);
    if (k >= text.length) { clearInterval(stampTimer); setTimeout(() => stampEl.querySelector(".caret")?.remove(), 1600); }
  }, 55);
}

// ───────── 현장(3D) ─────────
// 장면의 world와 단계의 world를 합쳐 적용한다: { shot, time, timeDur, rooms:{이름:켜짐}, dim(0~1), blur(px), orbit }
let worldPrev = {};
// 우선순위: 샷 목록(shots.js) < 장면 모듈의 shots[sub] < 단계의 world
const worldSpec = (i) => { const st = STEPS[i], sc = SCENES[st.scene]; return { ...(SHOTS[`${st.scene}-${st.sub}`] || {}), ...(sc.shots?.[st.sub] || {}), ...(st.world || {}) }; };
function applyWorld(i, instant) {
  const ws = worldSpec(i);
  deck.style.setProperty("--world-dim", String(ws.dim ?? 0));
  deck.style.setProperty("--world-blur", `${ws.blur ?? 0}px`);
  const w = ctx.world;
  if (!w) return;
  const imm = deck.dataset.mode === "immersive";
  w.setFrame(imm ? 800 : 1100, imm ? 1600 : 1000, { instant });
  if (ws.shot && (ws.shot !== w.shot || instant)) w.setShot(ws.shot, { instant, duration: ws.dur });
  if (ws.time != null && (ws.time !== w.time || instant)) w.setTime(ws.time, { duration: instant ? 0 : (ws.timeDur ?? 1600) });
  const rooms = ws.rooms || {}, old = worldPrev.rooms || {};
  for (const k of new Set([...Object.keys(old), ...Object.keys(rooms)])) w.setRoom(k, k in rooms ? rooms[k] : null);
  w.setOrbit(!!ws.orbit, deck);
  worldPrev = ws;
}
async function bootWorld() {
  if (video.on) return;      // 영상 모드에서는 3D를 띄우지 않는다(V로 실시간에 돌아올 때 띄운다)
  try {
    const { createWorld } = await import("./world.js");
    // 화질: 주소에 ?q=high|low|min 을 붙이면 고정, 없으면 느릴 때 자동으로 낮춘다.
    const qForced = new URLSearchParams(location.search).get("q");
    ctx.world = await createWorld($("world"), {
      mode: deck.dataset.mode, quality: qForced || "high", autoQuality: !qForced,
      drift: !params.has("rec"),   // 녹화 때는 카메라 흔들림을 꺼서, 언제 찍어도 같은 단계는 같은 화면이 되게 한다
      onQuality: (q, fps) => { document.body.classList.toggle("low", q !== "high"); console.info(`[world] ${fps}fps → 화질 ${q}`); },
    });
    if (qForced && qForced !== "high") { document.body.classList.add("low"); ctx.world.setQuality?.(qForced); }
    applyWorld(cur, true);
    const st = STEPS[cur];
    SCENES[st.scene].step?.(st.sub, ctx, { instant: true, dir: 1 });
  } catch (e) { console.error("[world] 3D 현장을 띄우지 못했습니다", e); }
}

// ───────── 3D 위치 라벨: 장면 안의 [data-anchor="이름"]을 그 위치에 붙인다 ─────────
let lampY = 380;
function trackLamp() {
  if (cur < 0) return;
  const m = reportDoc.querySelector(`mark.hl[data-step="${cur}"]`);
  let y = 380;
  if (m) {
    const { r: dr, k } = deckRect();
    const a = m.getBoundingClientRect();
    const marks = reportDoc.querySelectorAll(`mark.hl[data-step="${cur}"]`);
    const b = marks[marks.length - 1].getBoundingClientRect();
    y = ((a.top + b.bottom) / 2 - dr.top) / k;
  }
  lampY += (Math.max(120, Math.min(820, y)) - lampY) * 0.12;
  deck.style.setProperty("--ly", `${lampY.toFixed(1)}px`);
}
function trackAnchors() {
  trackLamp();
  const el = cur >= 0 ? sceneEls[STEPS[cur].scene] : null;
  if (el && ctx.world) {
    el.querySelectorAll("[data-anchor]").forEach((n) => {
      const p = ctx.anchor(n.dataset.anchor);
      if (!p) return;
      n.style.left = `${p.x}px`; n.style.top = `${p.y}px`;
    });
  }
  updateString();
  requestAnimationFrame(trackAnchors);
}

// ───────── 붉은 실: 원문의 지금 문장 ↔ 화면의 대상(data-ev="단계" 또는 단계의 pin) ─────────
let stringTimer = 0, stringState = null;
function deckRect() { const r = deck.getBoundingClientRect(); return { r, k: r.width / 1600 }; }
function stringEnds() {
  if (!stringState || deck.dataset.mode !== "split") return null;
  const { i } = stringState, st = STEPS[i];
  const marks = [...reportDoc.querySelectorAll(`mark.hl[data-step="${i}"]`)];
  if (!marks.length) return null;
  const { r: dr, k } = deckRect();
  const pr = (marks[0].closest(".sheet") || reportPane).getBoundingClientRect();
  const mr = marks[0].getBoundingClientRect();
  const sx = (pr.right - dr.left) / k - 12, sy = (mr.top + mr.height / 2 - dr.top) / k;
  if (sy < 80 || sy > 880) return null;
  let ex, ey, no = null;
  const pin = st.pin || SCENES[st.scene].pins?.[st.sub];
  if (pin && ctx.world) {
    const p = ctx.world.screenPos(pin);
    if (!p?.visible) return null;
    ex = p.x; ey = p.y;
  } else {
    const t = sceneEls[st.scene].querySelector(`[data-ev~="${st.sub}"]`);
    if (!t) return null;
    const tr = t.getBoundingClientRect();
    if (!tr.width) return null;
    // 실은 대상 글자 바로 앞에서 멈춘다(끝 핀이 글자를 덮지 않게)
    ex = (tr.left - dr.left) / k - 14; ey = (tr.top + tr.height / 2 - dr.top) / k;
    no = t.closest("[data-ex]")?.dataset.ex ?? null;
  }
  return { sx, sy, ex, ey, no };
}
// 곡선 모양 후보: [첫 손잡이의 처짐(null=기본), 손잡이 길이 비율]. 맨 앞이 기본 모양이다.
const SHAPES = [[null, 0.42], [-60, 0.42], [-130, 0.42], [-200, 0.5], [90, 0.42], [160, 0.5], [240, 0.6],
  [null, 0.8], [-60, 0.8], [-130, 0.9], [90, 0.8], [160, 0.9], [null, 0.2], [-60, 0.2], [90, 0.2], [-160, 0.2], [-230, 0.2], [-300, 0.2], [160, 0.2], [240, 0.2]];
let shapeIdx = 0, shapeAt = 0, shapeKey = "";
const curve = ({ sx, sy, ex, ey }, s = SHAPES[shapeIdx]) => {
  // 실은 살짝 처진다. 거리가 짧아도 뒤로 꼬이지 않게 손잡이 길이를 거리에 맞춘다.
  const dx = Math.max(40, (ex - sx) * s[1]), sag = s[0] ?? Math.min(70, Math.abs(ex - sx) * 0.12 + 18);
  // 끝은 대상 글줄 높이에서 수평으로 들어간다: 옆 글자 위를 비스듬히 가로지르지 않게
  return `M${sx.toFixed(1)} ${sy.toFixed(1)} C${(sx + dx).toFixed(1)} ${(sy + sag).toFixed(1)}, ${(ex - dx).toFixed(1)} ${ey.toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`;
};
// 실이 화면 글자 위를 지나지 않도록, 글자를 피하는 첫 모양을 고른다(0.4초마다, 지금 모양이 괜찮으면 유지).
const probe = document.createElementNS("http://www.w3.org/2000/svg", "path");
function textBoxes() {
  const scene = sceneEls[STEPS[cur].scene], { r: dr, k } = deckRect(), out = [];
  const w = document.createTreeWalker(scene, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const t = w.currentNode;
    if (!t.textContent.trim()) continue;
    let o = 1, el = t.parentElement;
    if (getComputedStyle(el).visibility === "hidden") continue;
    for (let e = el; e && e !== scene; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity);
    if (o < 0.3) continue;
    const rg = document.createRange(); rg.selectNodeContents(t);
    for (const rc of rg.getClientRects()) out.push([(rc.left - dr.left) / k - 4, (rc.top - dr.top) / k - 3, (rc.right - dr.left) / k + 4, (rc.bottom - dr.top) / k + 3]);
  }
  // 글자 말고 상자 전체를 피해야 하는 것(칩 등). 실이 닿는 대상 상자는 뺀다.
  const sub = STEPS[cur].sub;
  for (const b of scene.querySelectorAll("[data-avoid]")) {
    if (b.matches(`[data-ev~="${sub}"]`) || b.querySelector(`[data-ev~="${sub}"]`)) continue;
    const rc = b.getBoundingClientRect();
    if (rc.width) out.push([(rc.left - dr.left) / k - 6, (rc.top - dr.top) / k - 6, (rc.right - dr.left) / k + 6, (rc.bottom - dr.top) / k + 6]);
  }
  return out;
}
function hits(e, s, boxes) {
  probe.setAttribute("d", curve(e, s));
  const L = probe.getTotalLength(); let n = 0;
  for (let d = 0; d < L - 30; d += 5) {
    const q = probe.getPointAtLength(d);
    if (q.x < 600 || q.y < 0 || q.y > 900) { if (q.y < 0 || q.y > 900) n += 1; continue; }
    for (const b of boxes) if (q.x > b[0] && q.x < b[2] && q.y > b[1] && q.y < b[3]) { n++; break; }
  }
  return n;
}
function pickShape(e) {
  const now = performance.now(), key = `${stringState.i}`;
  if (key === shapeKey && now - shapeAt < 400) return;
  if (key !== shapeKey) shapeIdx = 0;
  shapeKey = key; shapeAt = now;
  const boxes = textBoxes();
  if (!hits(e, SHAPES[shapeIdx], boxes)) return;
  let best = shapeIdx, bestN = Infinity;
  for (let j = 0; j < SHAPES.length; j++) {
    const n = hits(e, SHAPES[j], boxes);
    if (n < bestN) { best = j; bestN = n; }
    if (!n) break;
  }
  shapeIdx = best;
}
function scheduleString(i, instant, extra = 0) {
  clearTimeout(stringTimer);
  stringsEl.innerHTML = ""; stringState = null;
  // 장 자막이 떠 있는 동안에는 장면 내용이 가려져 있으므로 실을 걸지 않는다(clearChapter가 다시 부른다)
  if (deck.classList.contains("chaptering")) return;
  // 원문이 제자리로 스크롤되고 장면 요소가 나타난 뒤에 실을 건다. 이후에는 매 프레임 끝점을 따라간다.
  stringTimer = setTimeout(() => { stringState = { i, anim: !(instant || reduced) }; }, instant || reduced ? 60 : 900 + extra);
}
function updateString() {
  if (!stringState) return;
  const e = stringEnds();
  stringsEl.style.opacity = e ? "1" : "0";
  if (!e) return;
  pickShape(e);
  let path = stringsEl.querySelector("path");
  if (!path) {
    stringsEl.innerHTML = `<path class="${stringState.anim ? "s-draw" : ""}" d="${curve(e)}"/><circle class="pin" r="5"/><circle class="pin pin-end" r="5"/>`
      + (e.no ? `<g class="mtag"><ellipse rx="19" ry="14"/><text y="5">${pad2(e.no)}</text></g>` : "");
    path = stringsEl.querySelector("path");
    path.style.setProperty("--len", String(Math.ceil(path.getTotalLength())));
  }
  path.setAttribute("d", curve(e));
  const [a, b] = stringsEl.querySelectorAll("circle");
  a.setAttribute("cx", e.sx); a.setAttribute("cy", e.sy); b.setAttribute("cx", e.ex); b.setAttribute("cy", e.ey);
  stringsEl.querySelector(".mtag")?.setAttribute("transform", `translate(${(e.sx - 8).toFixed(1)} ${e.sy.toFixed(1)}) rotate(-4)`);
}

// ───────── 장 자막 ─────────
let chapterTimer = 0;
function playChapter(c) {
  chapterEl.innerHTML = `<div><b>${c.n}</b><strong>${c.title}</strong>${c.sub ? `<span>${c.sub}</span>` : ""}</div>`;
  chapterEl.classList.add("on"); deck.classList.add("chaptering");
  chapterTimer = setTimeout(clearChapter, reduced ? 900 : 2100);
}
function clearChapter() {
  clearTimeout(chapterTimer);
  const was = deck.classList.contains("chaptering");
  chapterEl.classList.remove("on"); deck.classList.remove("chaptering");
  // 장 자막이 걷힌 뒤 장면 내용이 다시 보일 때 실을 건다
  if (was && cur >= 0) scheduleString(cur, false);
}

// ───────── 단계 전환 ─────────
let cur = -1;
const clamp = (v) => Math.max(0, Math.min(v, STEPS.length - 1));

let revealTimer = 0;
function applyReveals(el, sub, delay = 0) {
  clearTimeout(revealTimer);
  el.querySelectorAll("[data-out]").forEach((n) => n.classList.toggle("off", sub >= Number(n.dataset.out)));
  const ins = [...el.querySelectorAll("[data-in]")];
  ins.forEach((n) => { if (sub < Number(n.dataset.in)) n.classList.remove("on"); });
  const reveal = () => ins.forEach((n) => { if (sub >= Number(n.dataset.in)) n.classList.add("on"); });
  // 긴 카메라 이동(샷의 arrive)이면 새로 나올 내용은 카메라가 거의 도착했을 때 띄운다
  if (delay) revealTimer = setTimeout(reveal, delay); else reveal();
}
// 이번 전환의 카메라 이동이 끝나 갈 때까지 기다릴 시간(ms). 샷에 arrive가 있고 실제로 샷이 바뀔 때만.
function arriveDelay(i, instant) {
  const ws = worldSpec(i), w = ctx.world;
  if (instant || reduced || !ws.arrive || !w?.ok || !ws.shot || ws.shot === w.shot) return 0;
  return Math.round((ws.dur ?? 2200) * 0.75);
}

function show(i, opts = {}) {
  i = clamp(i);
  const prevIdx = cur;
  const instant = !!opts.instant;
  const prev = cur >= 0 ? STEPS[cur] : null;
  const st = STEPS[i];
  const sc = SCENES[st.scene];
  const el = sceneEls[st.scene];
  const dir = cur < 0 ? 1 : Math.sign(i - cur) || 1;
  const exBefore = prev && !instant && dir > 0 && deck.dataset.mode === "split" ? exRects(cur) : null;
  cur = i;

  clearChapter();
  if (!prev || prev.scene !== st.scene) {
    if (prev) {
      sceneEls[prev.scene].classList.remove("active");
      try { SCENES[prev.scene].leave?.(ctx); } catch (e) { console.error(e); }
    }
    el.classList.add("active");
    try { sc.enter?.(ctx, { instant, dir }); } catch (e) { console.error(e); }
    typeStamp(sc.stamp, instant);
    if (sc.chapter && !instant && dir > 0 && prev) playChapter(sc.chapter);
  }
  deck.dataset.mode = st.mode || sc.mode || "split";
  deck.classList.toggle("letterboxed", !!(st.letterbox ?? sc.letterbox));
  const arrive = arriveDelay(i, instant);
  applyWorld(i, instant);

  applyReveals(el, st.sub, arrive);
  try { sc.step?.(st.sub, ctx, { instant, dir, arrive }); } catch (e) { console.error(`장면 ${st.scene} step 오류`, e); }
  if (video.on) video.show(...clipFor(i, prevIdx, instant, dir));
  if (prevIdx >= 0) navigated = true;

  updateReport(i, instant);
  updateExhibits(i, exBefore);
  // 장면 안 연출이 끝난 뒤 실이 걸려야 하면 장면이 더 기다릴 시간을 알려 준다(예: 7-3 쪽지가 붙은 뒤)
  scheduleString(i, instant, arrive + (instant ? 0 : sc.stringDelay?.(st.sub, dir) ?? 0));
  $("curStep").textContent = String(i + 1).padStart(2, "0");
  $("totStep").textContent = String(STEPS.length).padStart(2, "0");
  $("progressBar").style.width = `${((i + 1) / STEPS.length) * 100}%`;
  const hash = `#s${st.scene}-${st.sub}`;
  if (location.hash !== hash) history.replaceState(null, "", hash);
  document.title = `${i + 1}/${STEPS.length} · ${st.loc || "발표"}`;
  overviewList.querySelectorAll("button").forEach((b, k) => b.classList.toggle("cur", k === i));
  broadcast();
}

function fromHash() {
  const m = location.hash.match(/^#s(\d+)-(\d+)$/);
  if (!m) return 0;
  const k = STEPS.findIndex((s) => s.scene === +m[1] && s.sub === +m[2]);
  return k < 0 ? 0 : k;
}

// ───────── 장면 목록(O) ─────────
const overview = $("overview");
const overviewList = $("overviewList");
STEPS.forEach((s, k) => {
  const li = document.createElement("li");
  const b = document.createElement("button");
  b.innerHTML = `<b>${s.scene}-${s.sub}</b><span>${s.loc}${s.opt ? " ★" : ""}</span>`;
  b.onclick = () => { overview.hidden = true; show(k, { instant: true }); };
  li.appendChild(b); overviewList.appendChild(li);
});

// ───────── 단축 모드(S): ★ 단계를 건너뛴다 ─────────
let short = false;
const step = (d) => { let j = cur + d; while (short && STEPS[j]?.opt) j += d; return Math.max(0, Math.min(STEPS.length - 1, j)); };

// 발표 속도 목표: 대본 음절 수 ÷ 초당 4.8음절 + 단계별 멈춤(애니메이션·질문·장 자막)
const RATE = 4.8;
const PAUSE = { "0-1": 5, "1-2": 3, "4-1": 3, "4-3": 3, "6-4": 7, "7-1": 3, "8-1": 3, "9-3": 4 };
const budget = (s) => (s.notes || "").replace(/\([^)]*\)/g, "").replace(/\s/g, "").length / RATE + (PAUSE[`${s.scene}-${s.sub}`] ?? 1.5);
const targetAt = (i) => STEPS.slice(0, i + 1).reduce((t, s) => t + (short && s.opt ? 0 : budget(s)), 0);

// ───────── 키보드 ─────────
async function toggleFullscreen() {
  try { document.fullscreenElement ? await document.exitFullscreen() : await document.documentElement.requestFullscreen(); }
  catch (e) { console.warn(e); }
}
addEventListener("keydown", (e) => {
  if (e.target.closest?.("input, textarea")) return;
  const sc = SCENES[STEPS[cur].scene];
  try { if (sc.key?.(e, ctx)) { e.preventDefault(); afterSceneKey(e); return; } } catch (err) { console.error(err); }
  const k = e.key;
  if (["ArrowRight", "PageDown", " ", "Enter"].includes(k)) { e.preventDefault(); show(step(1)); }
  else if (["ArrowLeft", "PageUp"].includes(k)) { e.preventDefault(); show(step(-1)); }
  else if (k === "Home") show(0, { instant: true });
  else if (k === "End") show(STEPS.length - 1, { instant: true });
  else if (k === "f" || k === "F") toggleFullscreen();
  else if (k === "b" || k === "B" || k === ".") deck.classList.toggle("blacked");
  else if (k === "o" || k === "O") overview.hidden = !overview.hidden;
  else if (k === "v" || k === "V") setVideo(!video.on, "수동");
  else if (k === "p" || k === "P") window.open("presenter.html", "presenter", "width=1100,height=760");
  else if (k === "s" || k === "S") { short = !short; broadcast(); }
  else if (k === "Escape") clearChapter();
  else if (k === "q" || k === "Q") {   // 수동 전환: high → low → min → high
    const order = ["high", "low", "min"], q = order[(order.indexOf(ctx.world?.quality ?? "high") + 1) % 3];
    document.body.classList.toggle("low", q !== "high"); ctx.world?.setQuality?.(q, true);
  }
});
addEventListener("hashchange", () => show(fromHash(), { instant: true }));

// ───────── 발표자 창 동기화 ─────────
const channel = new BroadcastChannel("edu-final-deck");
function broadcast() {
  const st = STEPS[cur], nx = step(1) !== cur ? STEPS[step(1)] : null;
  channel.postMessage({
    type: "state", index: cur, total: STEPS.length,
    loc: st.loc, notes: st.notes, opt: !!st.opt, id: `${st.scene}-${st.sub}`, short,
    target: Math.round(targetAt(cur)), total_target: Math.round(targetAt(STEPS.length - 1)),
    next: nx ? { loc: nx.loc, notes: nx.notes, id: `${nx.scene}-${nx.sub}` } : null,
    hands: ctx.state.hands,
  });
}
channel.onmessage = ({ data }) => {
  if (data?.type === "cmd") {
    if (data.cmd === "next") {
      // 발표자 창의 '다음'도 장면 전용 키 처리(예: 장면 0의 대기 → 타이핑)를 먼저 거친다.
      const fake = { key: "ArrowRight", preventDefault() {}, target: document.body };
      let handled = false;
      try { handled = !!SCENES[STEPS[cur].scene].key?.(fake, ctx); } catch (e) { console.error(e); }
      if (handled) afterSceneKey(fake); else show(step(1));
    }
    else if (data.cmd === "prev") {
      const fake = { key: "ArrowLeft", preventDefault() {}, target: document.body };
      let handled = false;
      try { handled = !!SCENES[STEPS[cur].scene].key?.(fake, ctx); } catch (e) { console.error(e); }
      if (handled) afterSceneKey(fake); else show(step(-1));
    }
    else if (data.cmd === "short") { short = !short; broadcast(); }
    else if (data.cmd === "goto") show(data.index, { instant: true });
    else if (data.cmd === "hello") broadcast();
  }
};

// ───────── 영상 모드(?video, V로 전환) ─────────
// 단계마다 미리 녹화한 전환 영상을 튼다. 앞으로: <상태>.mp4, 뒤로: <상태>.b.mp4(실제 덱의 뒤로 가기를 녹화한 것).
// <상태>는 단계 id에, 장면 안에서 →로 넘기는 곳이 있으면 장면의 videoState()가 붙이는 꼬리(b, c …)다
// (4-3 연도: 4-3 · 4-3b, 12-2 문구: 12-2 · 12-2b · 12-2c). 녹화: tools/record_video.js
const video = createVideo(deck);
let navigated = false;
const sid = (st) => `${st.scene}-${st.sub}`;
function stateName(i) {
  const st = STEPS[i];
  return sid(st) + (SCENES[st.scene].videoState?.(st.sub) || "");
}
function clipFor(i, prevIdx, instant, dir) {
  const name = stateName(i);
  if (prevIdx < 0 || instant) return [name, i === 0 && !navigated ? "start" : "end"];
  if (dir > 0 && i === prevIdx + 1) return [name, "play"];
  if (dir < 0 && i === prevIdx - 1 && video.has(`${name}.b`)) return [`${name}.b`, "play"];
  return [name, "end"];
}
// 장면이 키를 직접 처리했을 때(콜드 오픈의 시작, 12-2 안의 문구 넘기기) 영상도 맞춘다
function afterSceneKey(e) {
  if (!video.on) return;
  const st = STEPS[cur];
  const fwd = ["ArrowRight", "PageDown", " ", "Enter"].includes(e.key), back = ["ArrowLeft", "PageUp"].includes(e.key);
  if (st.scene === 0 && fwd) video.play();
  else if (SCENES[st.scene].videoState && (fwd || back)) video.show(back ? `${stateName(cur)}.b` : stateName(cur), "play");
}
async function setVideo(on, why) {
  if (on === video.on) return;
  if (on) {
    // 지금 위치부터 차례로 미리 받는다(없는 이름은 video.js가 건너뛴다)
    const order = STEPS.slice(cur).concat(STEPS.slice(0, cur)).flatMap((s) => ["", "b", "c"].flatMap((x) => [`${sid(s)}${x}`, `${sid(s)}${x}.b`]));
    if (!(await video.enable(order))) return;
    ctx.world?.setActive?.(false);
    video.show(...clipFor(cur, -1, true));
    if (why) video.say(`영상 모드 · ${why} · V로 전환`);
  } else {
    video.disable();
    if (!ctx.world) await bootWorld();
    else { ctx.world.setActive?.(true); applyWorld(cur, true); }
    video.say("실시간 모드 · V로 전환");
  }
}

// ───────── 시작 ─────────
loadReport().then(paginate).then(() => { updateReport(cur, true); scheduleString(cur, true); });
show(fromHash(), { instant: true });
document.fonts?.ready.then(() => { updateReport(cur, true); scheduleString(cur, true); });
if (params.has("video")) setVideo(true).then(() => { if (!video.on) bootWorld(); });
else bootWorld();
requestAnimationFrame(trackAnchors);
addEventListener("resize", () => scheduleString(cur, true));
window.__deck = { show, get cur() { return cur; }, STEPS, SCENES, ctx, worldSpec, video, setVideo, stateName };
