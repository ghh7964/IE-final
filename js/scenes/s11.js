// 장면 11: 개선 방안 (분할, 새벽 현장)
// 1: 한민고에 남길 인수인계 문서 다섯 장(종이)
// 2: 경기북과학고 한 장(세미나 계획·기출을 다음 기수에, 현황 표 정비)
// 3: 장면 9에서 끊겼던 실(바깥 활동의 끊긴 끝)을 사람이 아니라 '학교의 기록' 묶음에 다시 묶는다
// 인수인계서 양식: 인계(지금, 사람에게 걸린 상태) → 인수(제안, 조직이 맡는 자리). 장면 9의 부서 도장을 인수 칸에 찍는다.
// c: 그 제안이 메우는 빈자리(보고서 Ⅳ·Ⅴ-2에서 쓴 개념)
const KIT = [
  { n: "①", t: "연계를 계획에", from: "기장이 옮겨 쓴 동아리 계획서", to: "정보과 운영 계획 · 학년말 대조 갱신", c: "통합성을 문서로", rot: -1.4 },
  { n: "②", t: "부서 업무로", from: "교사 개인의 졸업생 연락망 · 캠프 기록", to: "3학년부 · 교육정보부 · 두 정보 교사", c: "조정의 원리", rot: 1.1 },
  { n: "③", t: "공식 창구로", from: "학급방 · CPS 내부 공지", to: "공식 신청 창구 · 전교생 공지", c: "허용적 평등 → 보장적 평등", rot: 0.8 },
  { n: "④", t: "2학년에 통로를", from: "2학년 알고리즘 과목 없음", to: "소인수 선택 · 공동교육과정 · SLAT", c: "계속성 · 계열성", rot: -1 },
  { n: "⑤", t: "교육과정 평가로", from: "평가 계획이 빈 정보과 계획", to: "교육과정 평가 · 운영 기록", c: "질적 평가", rot: 1.3 },
];
const figs = (n, cls, cap) => `<span class="s11-figs ${cls}">${'<svg viewBox="-16 -42 32 56"><circle cx="0" cy="-31" r="9"/><path d="M-14 13v-19a14 14 0 0 1 28 0v19z"/></svg>'.repeat(n)}<small>${cap}</small></span>`;
const ACTS = ["방과후 강좌", "야간 활동", "정보캠프", "CPS 동아리", "올림피아드 지도"];
const REC = { x: 440, y: 210, w: 250, h: 300 };          // 기록 묶음(종이)의 자리
const AY = (i) => 180 + i * 92;                           // 활동 i의 y
const AX = 250;                                           // 활동 점의 x
const person = (x, y, s, cls = "") =>
  `<g class="pp ${cls}" transform="translate(${x} ${y}) scale(${s})"><circle cx="0" cy="-31" r="9"/><path d="M-14 13v-19a14 14 0 0 1 28 0v19z"/></g>`;

function tieSvg() {
  const inY = (i) => REC.y + 70 + i * 40;                 // 묶음 왼쪽 가장자리에 닿는 자리
  const acts = ACTS.map((a, i) => `<g class="act" style="--i:${i}">
      <path class="tail" d="M${AX} ${AY(i)}c8 10 6 26 -4 36"/>
      <path class="retie" pathLength="1" d="M${AX} ${AY(i)}C${AX + 90} ${AY(i)} ${REC.x - 90} ${inY(i)} ${REC.x - 6} ${inY(i)}"/>
      <circle class="dot" cx="${AX}" cy="${AY(i)}" r="6"/>
      <text class="alab" x="${AX - 18}" y="${AY(i) + 9}">${a}</text></g>`).join("");
  const R = REC.x + REC.w + 6, T1 = [800, 250], T2 = [800, 520];
  return `<svg class="s11-tie pass" viewBox="0 0 1000 900" aria-label="끊긴 바깥 활동을 학교의 기록에 다시 묶고, 기록을 정보 교사 둘과 다음 사람이 이어받는 도식">
    ${acts}
    <path class="hand" pathLength="1" d="M${R} ${REC.y + 100}C${R + 50} ${REC.y + 100} ${T1[0] - 90} ${T1[1] - 20} ${T1[0] - 44} ${T1[1] - 20}"/>
    <path class="hand next" pathLength="1" d="M${R} ${REC.y + 220}C${R + 50} ${REC.y + 220} ${T2[0] - 90} ${T2[1] - 20} ${T2[0] - 30} ${T2[1] - 20}"/>
    <g class="who-g g1">${person(T1[0] - 18, T1[1], 1.1)}${person(T1[0] + 26, T1[1], 1.1)}
      <text class="who" x="${T1[0] + 4}" y="${T1[1] + 52}">정보 교사 2명</text>
      <text class="who-s" x="${T1[0] + 4}" y="${T1[1] + 82}">나누어 맡고</text></g>
    <g class="who-g g2">${person(T2[0], T2[1], 1.1, "nxt")}
      <text class="who" x="${T2[0]}" y="${T2[1] + 52}">다음 사람</text>
      <text class="who-s" x="${T2[0]}" y="${T2[1] + 82}">이어받는다</text></g>
  </svg>`;
}

let root;
export default {
  mode: "split", letterbox: false, dark: true,
  stamp: "경기도 파주 · 한민고 · 새벽",
  // 붉은 실: 1 다섯 장의 문서, 2 경기북과학고 한 장, 3 학교의 기록 묶음 (data-ev)

  build(el) {
    root = el;
    el.innerHTML = `
      <div class="s11-kit" data-out="3">
        ${KIT.map((k, i) => `<article class="paper s11-memo m${i + 1}" style="--rot:${k.rot}deg;--i:${i}">
          <h4><span class="sch hanmin">한민고</span> 인수인계 ${k.n}</h4>
          <h3${i === 0 ? ' data-ev="1"' : ""}>${k.t}</h3>
          <dl class="s11-hand"><dt>인계</dt><dd class="from"><s>${k.from}</s></dd><dt>인수</dt><dd class="to"><span class="seal">${k.to}</span></dd></dl>
          <em class="s11-why">${k.c}</em></article>`).join("")}
      </div>
      <article class="paper s11-memo s11-gbs" data-in="2" data-out="3" data-ev="2" style="--rot:-.7deg;--i:0">
        <h4><span class="sch gbs">경기북과학고</span> 인수인계</h4>
        <h3>세미나 계획을 다음 기수에</h3>
        <dl class="s11-hand row">
          <div><dt>인계</dt><dd class="from">${figs(3, "old", "이번 기수")}<s>ALPS 세미나 계획 · GCC 기출</s></dd></div>
          <div><dt>인수</dt><dd class="to">${figs(3, "new", "다음 기수")}<span class="seal">졸업생 멘토링 계획과 함께 보관</span></dd></div>
        </dl>
        <p class="s11-also"><span class="mark-red">자율동아리 현황 표는 실제 운영 목록에 맞게</span></p>
      </article>

      <div class="s11-3" data-in="3">
        ${tieSvg()}
        <article class="paper s11-rec r3" style="--rot:3deg"></article>
        <article class="paper s11-rec r2" style="--rot:-2deg"></article>
        <article class="paper s11-rec r1" style="--rot:.6deg" data-ev="3">
          <h4>학교의 기록</h4>
          <ol><li>연계 계획</li><li>부서 업무</li><li>공식 창구</li><li>2학년 통로</li><li>평가 기록</li></ol>
        </article>
      </div>

      <div class="lt s11-lt" data-out="2"><h2>한민고에 남길 인수인계 문서 다섯 장</h2></div>
      <div class="lt s11-lt" data-in="2" data-out="3"><h2>경기북과학고에도 한 장</h2></div>
      <div class="lt s11-lt" data-in="3"><h2>헌신으로 쌓은 활동, 학교가 기록하고 함께 이어 가야 한다</h2></div>`;
  },

  step(sub, ctx, { instant, dir, arrive }) {
    root.dataset.sub = String(sub);
    // 인계 줄이 그어지고 인수 칸에 도장이 찍힌다(앞으로 넘길 때만)
    root.classList.remove("stamping"); void root.offsetWidth;
    root.style.setProperty("--arr", `${arrive || 0}ms`);
    root.classList.toggle("stamping", sub < 3 && !instant && !ctx.reduced && dir > 0);
    root.classList.toggle("drawing", sub === 3 && !instant && !ctx.reduced && dir > 0);
  },
  leave() { root.classList.remove("drawing", "stamping"); },
};
