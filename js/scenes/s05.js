// 장면 5: 기록은 남아 있다 — 채점 사이트에서 '한민고'로 검색되는 비공개 대회 120개
// 1 흐린 현장 위에 대회 하나 = 발광 점 하나. 연도별로 쌓인다.
// 2 교육과정 층위(국가 → 지역 → 학교 → 교사). 학교 층에는 이 경로가 없고(붉은 ✕), 교사 층에만 불빛.
//   점 그래프는 사라지지 않고 아래로 물러나 교사 층과 이어진다.

const DATA = [
  [2016, 7], [2017, 33], [2018, 11], [2019, 8], [2020, 8], [2021, 16],
  [2022, 24], [2023, 3], [2024, 7], [2025, 2], [2026, 1],
];
const PER_ROW = 3, DOT = 16, DG = 6;
const CHART = { x: 60, y: 330, w: 880, h: 360 };
const COL_W = CHART.w / DATA.length, BASE_Y = 320;

// 보고서 Ⅳ-1: 교육과정이 국가와 학교를 거쳐 교사 수준까지 내려온다(국가 · 학교 · 교사 세 층)
const LAYERS = [
  { name: "국가 수준", doc: "국가 교육과정 · 성취기준", cls: "" },
  { name: "학교 수준", doc: "교육계획서", cls: "no", note: "✕ 활동 사이 연결은 적혀 있지 않다" },
  { name: "교사 수준", doc: "교사 교육과정", cls: "yes", note: "대회 120개", ev: "2" },
];
const LG = 128;   // 층 사이 간격

let root;

export default {
  mode: "split",
  stamp: "codeup.kr · 2016. 11. ~ 2026. 5.",

  build(el) {
    root = el;
    let dots = "", labels = "", k = 0;
    DATA.forEach(([y, n], ci) => {
      const cx = ci * COL_W + COL_W / 2;
      const w = PER_ROW * DOT + (PER_ROW - 1) * DG;
      for (let i = 0; i < n; i++) {
        const r = Math.floor(i / PER_ROW), c = i % PER_ROW;
        dots += `<i class="s5-dot" style="left:${cx - w / 2 + c * (DOT + DG)}px;top:${BASE_Y - (r + 1) * (DOT + DG)}px;--k:${k++}"></i>`;
      }
      const rows = Math.ceil(n / PER_ROW);
      labels += `<b class="s5-n" style="left:${cx}px;top:${BASE_Y - rows * (DOT + DG) - 32}px">${n}</b>`;
      labels += `<span class="s5-y" style="left:${cx}px;top:${BASE_Y + 10}px">${y}</span>`;
    });
    el.innerHTML = `
      <div class="s5-total" data-out="2">
        <div class="num s5-big" data-ev="1">120<small>개</small></div>
        <p>제목에 '한민고'가 들어간 비공개 대회</p>
        <p class="mix">수업 · 수행평가 · 방과후 · 캠프 · 동아리가 한곳에</p>
      </div>

      <div class="s5-chart" style="left:${CHART.x}px;top:${CHART.y}px;width:${CHART.w}px;height:${CHART.h}px">
        <div class="s5-base"></div>
        ${dots}${labels}
      </div>

      <div class="s5-layers" data-in="2">
        ${LAYERS.map((L, i) => `
          <div class="s5-layer ${L.cls}" style="top:${i * LG}px;--d:${i * 110}ms"${L.ev ? ` data-ev="${L.ev}"` : ""}>
            <div class="in"><b>${L.name}</b><span>${L.doc}</span>${L.note ? `<em>${L.note}</em>` : ""}</div>
          </div>`).join("")}
        <svg class="s5-drop pass" viewBox="0 0 1000 900" aria-hidden="true"><path d="M 500 ${96 + (LAYERS.length - 1) * LG + 72} L 500 566"/></svg>
      </div>

      <div class="lt" data-out="2"><h2>기록은 남아 있다</h2></div>
      <div class="lt" data-in="2"><h2>계획서엔 없는 연결, 교사가 직접 이었다</h2></div>
    `;
  },

  step(sub, ctx, { instant }) {
    const inst = instant || ctx.reduced;
    const chart = root.querySelector(".s5-chart");
    chart.classList.toggle("back", sub >= 2);
    if (sub === 1 && !inst) {
      chart.classList.remove("play"); void chart.offsetWidth; chart.classList.add("play");
    } else chart.classList.remove("play");
  },
};
