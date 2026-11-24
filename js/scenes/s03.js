// 장면 3: 근거 — 책상 위 자료 더미 (분할, 흐려진 현장 위 어두운 책상)
// 보고서가 기댄 자료를 원래 생김새대로 책상에 올린다. 자료의 한계는 질의응답에서 답한다(11/22 사용자 결정).
// 자료는 보고서 참고문헌 그대로다(11/22 대조). 외부 기록(CodeUp·solved.ac·기사·이임식 게시물)은 해당 장면에서 따로 나온다.
// 1 공식 문서: 표지가 한 부씩 놓인다. 한민고 | 교육부 고시 | 경기북과학고 세 묶음.
//   앞줄은 주된 자료(두 학교의 2026학년도 계획서, 붉은 연필 밑줄), 뒷줄은 역대 계획서와 운영계획서.
//   여러 해치는 해마다 한 부씩 겹쳐 쌓여 아래 부의 연도가 위로 비죽 보인다.
// 2 공식 문서에 담기지 않는 것: 공식 문서 더미가 왼쪽 위로 밀려나 흐려지고,
//   재질이 다른 자료(블로그 화면, 위키 화면, 내 줄 공책 메모)가 놓인다. 학생이 쓴 글은 가림 막대로만 보인다.
let root = null, timer = 0;

const BIG = 220, SMALL = 106, ROW = 150;
const col = (k) => 20 + k * 112;          // 뒷줄 칸: 한민고 0~3, 경기북과학고 4~7(한 칸 띄움)
const COVERS = [
  // 앞줄: 주된 자료
  { x: 40, y: 340, w: BIG, sc: "hanmin", yr: "2026학년도", t: "학교교육계획서", sch: "한민고등학교", r: -2, main: true, ev: 1 },
  { x: 520, y: 346, w: BIG, sc: "gbs", yr: "2026학년도", t: "학교 교육과정 운영계획(안)", sch: "경기북과학고등학교", r: 1.6, main: true },
  // 뒷줄: 한민고
  { x: col(0), y: ROW, w: SMALL, sc: "hanmin", yr: "2016학년도 1텀", t: "방과후학교 운영계획서", sch: "한민고등학교", under: ["2015학년도"], r: -1.2 },
  { x: col(1), y: ROW, w: SMALL, sc: "hanmin", yr: "2024학년도", t: "교육계획서", sch: "한민고등학교", under: ["2022학년도", "2021학년도", "2020학년도", "2019학년도"], r: .9 },
  { x: col(2), y: ROW, w: SMALL, sc: "hanmin", yr: "2022학년도 2학기", t: "교과진도 운영계획", sch: "한민고등학교", r: -.6 },
  { x: col(3), y: ROW, w: SMALL, sc: "hanmin", yr: "2025학년도", t: "창체동아리 운영계획 (CPS)", sch: "한민고등학교", under: ["2024", "2023", "2022", "2021", "2020", "2019", "2018"].map((y) => `${y}학년도`), r: 1.1 },
  // 뒷줄: 경기북과학고
  { x: col(4) + 30, y: ROW, w: SMALL, sc: "gbs", yr: "2026학년도", t: "자율동아리 연간 운영 계획", sch: "경기북과학고등학교", under: ["2025학년도", "2024학년도"], r: -.9 },
  { x: col(5) + 30, y: ROW, w: SMALL, sc: "gbs", yr: "2023학년도", t: "자율동아리 운영계획서 (ALPS)", sch: "경기북과학고등학교", r: 1.3 },
  { x: col(6) + 30, y: ROW, w: SMALL, sc: "gbs", yr: "2026학년도", t: "과학동아리 운영계획서 (18개)", sch: "경기북과학고등학교", r: -1 },
  { x: col(7) + 30, y: ROW, w: SMALL, sc: "gbs", yr: "2026학년도", t: "방과후학교 가정통신문", sch: "경기북과학고등학교", under: ["2025학년도", "2024학년도", "2023학년도"], r: .8 },
  // 앞줄 가운데: 정규 과목의 기준(교육과정 고시)
  { x: 300, y: 430, w: SMALL + 20, sc: "nat", yr: "제2022-33호", t: "과학 계열 선택 과목 교육과정", sch: "교육부 고시", under: ["제2015-74호"], r: -.8 },
];
// 경기북과학고 홈페이지 학교소식: 한국정보올림피아드 수상 게시물(게시일만)
const KOI = ["2020. 11. 3.", "2022. 6. 28.", "2022. 9. 7.", "2023. 7. 21.", "2023. 9. 12.", "2025. 8. 26."];

const cover = (c, i) => `
  <div class="s3-pile ${c.sc}${c.main ? " main" : ""}" style="left:${c.x}px;top:${c.y}px;--w:${c.w}px;--r:${c.r}deg;--i:${i}">
    ${(c.under || []).map((y, k) => `<div class="s3-under" style="--k:${k + 1}"><span>${y}</span></div>`).join("")}
    <div class="paper s3-cover">
      <span class="cv-yr">${c.yr}</span>
      <b class="cv-t"${c.ev ? ` data-ev="${c.ev}"` : ""}>${c.main ? `<span class="mark-red">${c.t}</span>` : c.t}</b>
      <span class="cv-sch">${c.sch}</span>
    </div>
  </div>`;

// 가림 막대: 학생이 쓴 글의 내용은 보이지 않게(길이만 다르게)
const bars = (ws) => `<div class="s3-bars">${ws.map((w) => `<i style="width:${w}%"></i>`).join("")}</div>`;

export default {
  mode: "split",
  stamp: "",

  build(el) {
    root = el;
    el.innerHTML = `
      <div class="s3-off">
        ${COVERS.map(cover).join("")}
        <div class="s3-pile s3-web gbs" style="left:770px;top:372px;--w:180px;--r:1.2deg;--i:${COVERS.length}">
          <div class="paper s3-koi">
            <div class="wk-h"><span>학교소식</span><span>수상현황</span></div>
            ${KOI.map((d) => `<p><span>${d}</span>한국정보올림피아드</p>`).join("")}
          </div>
        </div>
      </div>

      <div class="s3-sup">
        <article class="paper doc-post s3-blog" style="--rot:-1.6deg;--i:0">
          <div class="post-h"><div><b data-ev="2">한얼 블로그</b><small>한민고 홍보대사 · 2026. 3.</small></div></div>
          ${bars([96, 88, 92, 54, 0, 90, 72])}
        </article>
        <div class="s3-wikis" style="--rot:1.4deg;--i:1">
          <div class="s3-wtab" style="--k:2"><span>정보</span></div>
          <div class="s3-wtab" style="--k:1"><span>GBS Coding Contest</span></div>
          <article class="paper doc-wiki s3-wiki">
            <div class="wk-h"><span>GBSWiki</span><span>경기북과학고 재학생 위키</span></div>
            <h3>ALPS</h3>
            ${bars([94, 82, 90, 46])}
          </article>
        </div>
        <article class="paper doc-memo s3-memo" style="--rot:-1deg;--i:2">
          <p class="m-h">나의 경험</p>
          <p>한민고 재학 2021 ~ 2023학년도</p>
          <p>졸업 후 캠프 강사·멘토 2025·2026</p>
        </article>
      </div>

      <div class="lt" data-out="2"><h2>근거는 두 학교의 공식 문서</h2></div>
      <div class="lt" data-in="2"><h2>문서에 없는 것은 학생 기록과 내 경험으로</h2></div>
    `;
  },

  enter(ctx, { instant, dir }) {
    clearTimeout(timer);
    root.classList.remove("s3-landed", "s3-landing");
    if (instant || ctx.reduced || dir < 0) { root.classList.add("s3-landed"); return; }
    void root.offsetWidth;
    root.classList.add("s3-landing");
    requestAnimationFrame(() => root.classList.add("s3-landed"));
    timer = setTimeout(() => root.classList.remove("s3-landing"), 3600);
  },

  step(sub, ctx, { instant }) {
    root.dataset.sub = String(sub);
    const still = !!(instant || ctx.reduced);
    root.classList.toggle("s3-still", still);
    if (still) { clearTimeout(timer); root.classList.remove("s3-landing"); root.classList.add("s3-landed"); }
  },

  leave() { clearTimeout(timer); },
};
