// 장면 8: ALPS는 어디로 — 준거 3(경기북과학고)
// 1 현장: 같은 밤 의정부, 정보 2실. 연도 2022 → 2025가 흐르는 동안 2023까지 켜져 있던 창이 2024부터 꺼지고,
//   간판의 ALPS가 지워진다. 연도별 기록은 종이 조각으로(11/23: 2026 정보 분야 주제 카드와 'AI·개발·로봇' 간판은 대본과 함께 뺌).
// 2 분석: 그래도 잘하는 학생은 있다. 두 학교를 숫자로 나란히 놓지 않고(서론: 실력 비교 안 함), 경기북과학고 수상 게시물이 2025년까지 이어지는 것만 보인다.
const Y0 = 2022, Y1 = 2025;

// 연도별 기록: 출처마다 원래 생김새로(위키 화면 · 오린 계획서 표 · 목록 속 빈 자리 · 두 문서 대조)
// 내용은 보고서(Ⅲ-2 · Ⅳ-3)에 적힌 것만 쓴다. 다른 동아리 이름 같은 세부는 글 없이 회색 막대로 둔다.
const SCRAPS = [
  `<article class="paper doc-wiki s8-scrap s8-wk" data-y="2022" data-ex="7" style="--rot:-1.2deg">
    <div class="wk-h"><span>GBSWiki</span><span>경기북과학고 재학생 위키</span></div>
    <h3>ALPS</h3>
    <p><span class="mark-red" data-ev="1">마지막 수정 <b>2022. 12. 23.</b></span></p>
  </article>`,
  `<article class="paper doc-cut s8-scrap s8-cut" data-y="2023" data-ex="8" style="--rot:.9deg">
    <i class="cut-tape" aria-hidden="true"></i>
    <table><tr><th colspan="2"><span>2023</span> ALPS 운영계획</th></tr>
      <tr><td>회원 9명 · 지도교사 1명</td><td>매주 세미나 · 연말 GCC</td></tr></table>
  </article>`,
  `<article class="paper doc-cut s8-scrap s8-cut s8-list" data-y="2024" data-ex="9" style="--rot:-.6deg">
    <i class="cut-tape" aria-hidden="true"></i>
    <table><tr><th><span>2024</span> 자율동아리 연간 계획 <small>· 2025 · 2026도</small></th></tr>
      <tr><td class="bars" aria-hidden="true"><i></i><i></i><i></i><i></i></td></tr>
      <tr><td class="gap"><span>ALPS</span><em>이름이 없다</em></td></tr></table>
  </article>`,
  `<article class="paper doc-plan s8-scrap s8-two" data-y="2025" data-ex="10" style="--rot:1.1deg">
    <div class="plan-h"><span><b>2025</b> 자율동아리 · 두 문서</span><span>같은 해</span></div>
    <div class="s8-docs">
      <div><small>2026 운영계획 58쪽 · 현황 표</small><b>20개</b><em class="in">ALPS 있음</em></div>
      <div><small>자율동아리 연간 계획</small><b>17개</b><em class="out">ALPS 없음</em></div>
    </div>
    <p class="s8-gapnote">현황 표의 상당수가 연간 계획에 없다</p>
  </article>`,
];

let root, ctxRef = null, timers = [];

function setYear(y) {
  root.dataset.year = String(y);
  root.querySelector(".s8-year").textContent = String(y);
  root.querySelectorAll(".s8-scrap").forEach((e) => e.classList.toggle("on", Number(e.dataset.y) <= y));
  const state = y <= 2023 ? "a" : "b";
  root.querySelectorAll(".s8-sign").forEach((e) => e.classList.toggle("show", e.dataset.s === state));
  // 2023년까지는 정보 2실에 불이 켜져 있고, 2024년부터 꺼진다
  ctxRef?.world?.setRoom?.("gbs-info2", y <= 2023 ? true : false);
}

function clearAll() { timers.forEach(clearTimeout); timers = []; }
// 카메라가 정보 2실에 거의 도착한 뒤(arrive)부터 2022 조각 → 2023 … 순서로 하나씩 쌓는다.
// 이동하는 동안에는 연도·간판·조각을 숨기고 창의 불만 켜 둔다.
function play(arrive = 0) {
  clearAll();
  const start = () => { root.classList.remove("s8-wait"); setYear(Y0); };
  if (arrive) {
    // 지난번 2025 상태가 서서히 사라지며 비치지 않게, 숨기는 순간에는 전환 없이 바로 숨긴다
    root.classList.add("s8-wait", "s8-snap");
    void root.offsetWidth;
    requestAnimationFrame(() => root.classList.remove("s8-snap"));
    root.querySelectorAll(".s8-scrap").forEach((e) => e.classList.remove("on"));
    ctxRef?.world?.setRoom?.("gbs-info2", true);
    timers.push(setTimeout(start, arrive));
  } else start();
  for (let y = Y0 + 1; y <= Y1; y++) timers.push(setTimeout(() => setYear(y), arrive + 1100 + (y - Y0 - 1) * 1500));
}


export default {
  mode: "split",
  stamp: "경기도 의정부 · 경기북과학고 정보 2실 · 2022 → 2025",

  build(el) {
    root = el;
    el.innerHTML = `
      <!-- 1 현장: 연도(시계 자리)와 정보 2실 간판 -->
      <div class="s8-year" data-out="2">2025</div>
      <div class="anchor-label s8-pl" data-anchor="gbs-info2" data-out="2">
        <div class="s8-sign" data-s="a"><b>ALPS</b><i>알고리즘 세미나 · 대회 준비</i></div>
        <div class="s8-sign" data-s="b"><b class="gone">ALPS</b><i>자율동아리 연간 계획에서 사라짐</i></div>
      </div>

      <!-- 1 기록: 연도별 종이 조각 -->
      <div class="s8-scraps" data-out="2">
        ${SCRAPS.join("")}
      </div>

      <!-- 2 분석: 잘하는 학생은 있다 -->
      <div class="s8-stat" data-in="2">
        <h3>경기북과학고 한국정보올림피아드 수상 게시물</h3>
        <div class="s8-years" data-ev="2">${[2020, 2021, 2022, 2023, 2024, 2025].map((y, i) => `<i class="${[2021, 2024].includes(y) ? "no" : ""}" style="--k:${i}">${y}</i>`).join("")}</div>
        <span class="src">학교 홈페이지 수상현황 게시판 · 2021·2024년은 게시물 없음</span>
        <h3 class="h2">온라인 채점 사이트의 학교별 기록</h3>
        <p class="s8-note">두 학교 모두 실력을 갖춘 재학생과 졸업생이 여전히 있다</p>
        <span class="src">solved.ac 소속 랭킹 · 2026. 11. · 졸업생 포함</span>
      </div>
      <div class="s8-concl" data-in="2"><span>예전보다 줄어든 것</span><b>함께 모여 공부할 동아리와 대회</b></div>

      <!-- 제목(하단 자막) -->
      <div class="lt" data-out="2"><h2>ALPS는 어디로</h2></div>
      <div class="lt" data-in="2"><h2>잘하는 학생은 여전히 있다</h2></div>
    `;
  },

  step(sub, ctx, { instant, dir, arrive }) {
    clearAll();
    ctxRef = ctx;
    root.dataset.sub = String(sub);
    root.classList.remove("s8-wait");
    if (sub === 1 && !(instant || ctx.reduced || dir < 0)) play(arrive || 0);
    else setYear(Y1);
  },

  leave(ctx) {
    clearAll();
    (ctx || ctxRef)?.world?.setRoom?.("gbs-info2", null);
  },
};
