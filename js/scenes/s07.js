// 장면 7: 한 사람에게 묶인 선 — 준거 3 학교 여건과 지속가능성
// 1 현장+분석: 밤의 한민고. 업무 6개에서 나온 발광 실이 불 켜진 AI 라운지(3D) 한 곳으로 모인다.
//   경기북과학고는 같은 종류의 일 4개가 부서 4곳으로 흩어진다(작은 분석 도식).
// 2 기록: 2019 교육계획서(정보 교사 1명, 인터넷망 관리까지) → 2021 교사 둘, 그러나 알고리즘 쪽 실은 여전히 라운지에
// 3 현장+분석: 분업 ✓ · 조정 ✕(보고서 Ⅳ-3) → 2021~2022 라운지 불이 꺼지고 "야간 활동 거의 없음" 쪽지가 붙는다
// 4 기록: 터미널 diff/grep — 7년 같은 목적 문장, 2023년에 시작한 백야 코딩이 2025년 계획서에 처음
const STAMP = "경기도 파주 · 한민고 · 2026학년도 업무분장";
// 단계마다 이야기하는 때가 다르다
const STAMPS = { 1: STAMP, 2: "경기도 파주 · 한민고 · 2019 → 2021", 3: "경기도 파주 · 한민고 · 2021~2022.", 4: "한민고 · CPS 운영계획서 2018 → 2025" };

const TASKS = ["AI 정보교육 중심고 운영", "정보 캠프", "정보 방과후", "정보 활용 대회", "정보올림피아드 지도", "정보학술동아리 운영"];
const GBS = [["AP", "교육과정운영부"], ["과학동아리", "융합과학교육부"], ["R&amp;E · 자율동아리", "학생연구지원부"], ["졸업생 DB", "입학진로상담부 진로진학팀"]];
const TERM = [
  ["cmd", "diff CPS_계획서_2018 CPS_계획서_2024"],
  ["out", "  운영 목적: 변경 없음   <em>(7년 동안 같은 문장)</em>", "purpose"],
  ["out", "  활동 목록: 거의 그대로"],
  ["cmd", 'grep "백야 코딩" CPS_계획서_*'],
  ["out", "  CPS_계획서_2025: 1학기 … <mark>백야 코딩</mark>"],
];

let root, raf = 0, timers = [], typeTimer = 0, curSub = 0;

// 업무 라벨(1단계)·담당 교사(2단계)에서 3D 라운지로 가는 실: 매 프레임 끝점을 라운지 화면 좌표로 맞춘다
const f = (n) => n.toFixed(1);
function threadPath(x1, y1, x2, y2, down) {
  // 담당 교사 → 라운지: 아래로 떨어졌다가 한 번만 휘어 창에 수평으로 들어간다(S자로 꿈틀대지 않게)
  if (down) return `M${f(x1)} ${f(y1)} C${f(x1)} ${f(y2)}, ${f(x1 + (x2 - x1) * 0.35)} ${f(y2)}, ${f(x2)} ${f(y2)}`;
  const mx = (x1 + x2) / 2;
  return `M${f(x1)} ${f(y1)} C${f(x1 - 90)} ${f(y1 + 40)}, ${f(mx + 40)} ${f(y2 - 120)}, ${f(x2)} ${f(y2)}`;
}
function track(ctx) {
  const p = ctx.anchor?.("lounge");
  const lx = p ? p.x : 468, ly = p ? p.y : 527;
  const box = root.getBoundingClientRect();
  const k = box.width / root.offsetWidth || 1;
  root.querySelectorAll(".s7-dyn path[data-from]").forEach((path) => {
    const src = root.querySelector(path.dataset.from);
    if (!src) return;
    const r = src.getBoundingClientRect();
    const down = path.dataset.side === "bottom";   // 담당 교사 → 아래로 내려가 라운지
    const x = down ? (r.left - box.left) / k + r.width * 0.3 / k : (r.left - box.left) / k - 10;
    const y = down ? (r.bottom - box.top) / k + 2 : (r.top - box.top) / k + r.height / 2;
    path.setAttribute("d", threadPath(x, y, lx, ly, down));
  });
  raf = requestAnimationFrame(() => track(ctx));
}

function renderTerm(n, partial = null) {
  const body = root.querySelector(".s7-term-body");
  let h = "";
  for (let i = 0; i < TERM.length && i <= n; i++) {
    const [kind, txt, ev] = TERM[i];
    if (i === n && partial !== null) { h += `<div class="cmd"><b>$</b> ${partial}<i class="cur"></i></div>`; break; }
    h += kind === "cmd" ? `<div class="cmd"><b>$</b> ${txt}</div>` : `<div class="out"${ev ? ' data-ev="4"' : ""}>${txt}</div>`;
  }
  if (partial === null && n >= TERM.length - 1) h += `<div class="cmd"><b>$</b> <i class="cur"></i></div>`;
  body.innerHTML = h;
}
function typeTerm() {
  let line = 0, ch = 0;
  const next = () => {
    if (line >= TERM.length) { renderTerm(TERM.length - 1); root.classList.add("s7-term-done"); return; }
    const [kind, txt] = TERM[line];
    if (kind === "cmd") {
      if (ch <= txt.length) { renderTerm(line, txt.slice(0, ch)); ch++; typeTimer = setTimeout(next, 42); return; }
      renderTerm(line); line++; ch = 0; typeTimer = setTimeout(next, 380); return;
    }
    renderTerm(line); line++; typeTimer = setTimeout(next, 520);
  };
  next();
}

// 7-3 순서(도착 뒤 ms): 분업 ✓ → 조정 → 조정 ✕ → 라운지 불 꺼짐 → 쪽지가 붙는다
const S3 = { c1: 0, c2: 900, c3: 1700, off: 2400, stick: 2900 };
function clearAll() { cancelAnimationFrame(raf); raf = 0; timers.forEach(clearTimeout); timers = []; clearTimeout(typeTimer); typeTimer = 0; }

export default {
  mode: "split",
  stamp: STAMP,
  chapter: { n: "준거 3", title: "한 사람에게 묶인 선", sub: "학교 여건과 지속가능성" },
  shots: { 1: { dim: 0.38 }, 2: { dim: 0.5 } },
  pins: { 1: "lounge" },        // 7-1: '모두 한 교사에게' → 불 켜진 라운지(그 교사가 있는 곳)

  build(el) {
    root = el;
    el.innerHTML = `
      <!-- 실(분석): 1·2단계에서 라운지로 모인다 -->
      <svg class="s7-dyn pass" viewBox="0 0 1000 900" aria-hidden="true">
        <g class="s7-g1">${TASKS.map((_, i) => `<path class="holo" pathLength="1" style="--d:${i * 90}ms" data-from='.s7-task[data-i="${i}"]'/>`).join("")}</g>
        <g class="s7-g2"><path class="holo" pathLength="1" data-from=".s7-tA" data-side="bottom"/></g>
      </svg>

      <!-- 1 한민고: 업무 6개 -->
      <div class="s7-tasks" data-out="2">
        <div class="s7-colh"><span class="sch hanmin">한민고</span> 교육정보부 업무분장</div>
        ${TASKS.map((t, i) => `<div class="s7-task" data-i="${i}">${t}</div>`).join("")}
      </div>
      <div class="anchor-label s7-pl" data-anchor="lounge" data-out="2"><b>담당 교사 1명</b></div>

      <!-- 1 경기북과학고: 같은 종류의 일 4개 → 부서 4곳 -->
      <div class="s7-gbs" data-out="2">
        <div class="s7-colh"><span class="sch gbs">경기북과학고</span> 부서별 업무분장</div>
        ${GBS.map(([t, d]) => `<div class="s7-grow"><span>${t}</span><i></i><b>${d}</b></div>`).join("")}
        <span class="src">두 학교 2026학년도 교육계획서</span>
      </div>

      <!-- 2 기록: 2019 교육계획서 -->
      <article class="paper doc-cut s7-plan" data-in="2" data-out="3" data-ex="4" style="--rot:-1.4deg">
        <i class="cut-tape" aria-hidden="true"></i>
        <table><tr><th>정보 교사 담당 업무</th></tr>
          <tr><td>정보 수업 · CPS 동아리 · 정보캠프</td></tr><tr><td>올림피아드 지도</td></tr>
          <tr><td><span class="mark-red">교내 유선망·업무망 IP 관리</span></td></tr></table>
        <p class="cut-pf"><b>18 · 111 · 128~129</b>한민고 2019학년도 교육계획서</p>
      </article>
      <!-- 2 분석: 교사 수 연표와 두 교사의 실 -->
      <div class="s7-tl" data-in="2" data-out="3">
        <i class="s7-span" data-ev="2"></i>
        <div class="s7-node" style="--x:40px"><small>2019</small><b>1명</b></div>
        <div class="s7-node" style="--x:220px"><small>2020</small><b>1명</b></div>
        <div class="s7-node n21" style="--x:400px"><small>2021</small><b>2명</b><em>AI 융합교육 중심학교 사업</em></div>
      </div>
      <div class="s7-two" data-in="2" data-out="3">
        <div class="s7-tA"><span class="figure-person"></span><b>담당 교사</b><p>캠프 · 방과후 · 대회<br>올림피아드 · 동아리</p></div>
        <div class="s7-tB"><span class="figure-person"></span><b>새 교사</b><p>정규 과목<br>인공지능기초 · 자료구조<br>정보과제연구</p></div>
      </div>

      <!-- 3 현장: 꺼진 라운지 창 바로 아래 붙인 공책 쪽지(나의 경험) + 분석: 분업·조정 -->
      <div class="s7-pin" data-anchor="lounge" data-in="3" data-out="4">
        <i class="cut-tape" aria-hidden="true"></i>
        <article class="paper doc-memo s7-dark" data-ex="5" style="--rot:1.5deg">
          <h4>AI 라운지 · 2021~2022학년도 밤</h4>
          <p>야간 활동 거의 없음</p>
          <span class="src">코로나19와 담당 교사의 개인 사정 · 2023학년도에 재개</span>
        </article>
      </div>
      <div class="s7-coord" data-in="3" data-out="4">
        <small>교육행정 조직의 원리</small>
        <div class="s7-row ok"><i>✓</i><b>분업의 원리</b><span>전공과 기능에 따라 일을 나눈다</span><em>두 학교 모두 · 정보 일은 정보 교사에게</em></div>
        <div class="s7-row no" data-ev="3"><i>✕</i><b>조정의 원리</b><span>차질이 생기면 다른 사람이 대신 맡는다</span><em>한민고 · 대신 맡을 사람이 없었다</em></div>
      </div>
      <!-- 4 기록: 터미널 -->
      <div class="s7-term" data-in="4" data-ex="6">
        <div class="s7-term-bar">CPS 운영계획서 2018~2025</div>
        <div class="s7-term-body"></div>
      </div>
      <div class="s7-gap" data-in="4">
        <div class="s7-axis"></div>
        ${[2022, 2023, 2024, 2025, 2026].map((y, i) => `<span class="s7-y" style="--x:${i}">${y}</span>`).join("")}
        <div class="s7-m real" style="--x:1"><i></i><span>현장<b>백야 코딩 시작</b></span></div>
        <div class="s7-m paper-m" style="--x:3"><i></i><span>계획서<b>처음 등장</b></span></div>
        <div class="s7-br"><span>2년</span></div>
      </div>

      <!-- 제목(하단 자막) -->
      <div class="lt" data-out="2"><h2>정보 분야 업무 여섯 가지가 교사 한 명에게</h2></div>
      <div class="lt" data-in="2" data-out="3"><h2>교사가 둘로 늘어도 비교과는 여전히 한 사람에게</h2></div>
      <div class="lt" data-in="3" data-out="4"><h2>일은 나누었지만, 대신 맡을 사람이 없었다</h2></div>
      <div class="lt" data-in="4"><h2>계획서는 따라오지 못했다</h2></div>
    `;
  },

  step(sub, ctx, { instant, dir, arrive }) {
    clearAll();
    curSub = sub;
    const still = instant || ctx.reduced;
    root.dataset.sub = String(sub);
    ctx.stamp?.(STAMPS[sub], instant);
    root.classList.toggle("s7-still", !!still);
    root.classList.remove("s7-draw");
    if (sub <= 2) {
      track(ctx);
      if (still) root.classList.add("s7-draw");
      else timers.push(setTimeout(() => root.classList.add("s7-draw"), sub === 1 ? 500 : 900));
    }
    // 7-3을 떠날 때는 순서 클래스를 그대로 둔다(묶음째 서서히 사라지게). 여기서 지우면 쪽지가 0.14초 만에 꺼져
    // 보고서로 접혀 들어가는 증거 05와 겹쳐 한 번 깜빡인다. 다시 7-3에 들어올 때 처음부터 다시 쌓는다.
    if (sub === 3) {
      root.classList.remove("s7-c1", "s7-c2", "s7-c3", "s7-stick");
      const lights = (on) => ctx.world?.setRoom?.("hanmin-lounge", on);
      if (still || dir < 0) { root.classList.add("s7-c1", "s7-c2", "s7-c3", "s7-stick"); lights(false); }
      else {
        lights(true);
        const at = (ms, fn) => timers.push(setTimeout(fn, (arrive || 0) + ms));
        at(S3.c1, () => root.classList.add("s7-c1"));
        at(S3.c2, () => root.classList.add("s7-c2"));
        at(S3.c3, () => root.classList.add("s7-c3"));
        at(S3.off, () => lights(false));
        at(S3.stick, () => root.classList.add("s7-stick"));
      }
    }
    root.classList.remove("s7-term-done");
    if (sub === 4) {
      if (still || dir < 0) { renderTerm(TERM.length - 1); root.classList.add("s7-term-done"); }
      else { renderTerm(0, ""); timers.push(setTimeout(typeTerm, 600)); }
    }
  },

  // 7-3: 붉은 실은 조정의 원리 줄이 나온 뒤에(앞으로 넘어올 때만)
  stringDelay(sub, dir) { return sub === 3 && dir >= 0 ? S3.c2 : 0; },

  leave() { clearAll(); },
};
