// 장면 1: 제목 → 질문 (몰입, 새벽빛 두 학교 위)
// 1 제목·부제·이름. 두 학교의 실제 위치를 3D 라벨로 짚는다(부제의 학교 이름과 같은 색).
// 2 질문 + 손 든 사람 수(숫자 키로 입력, Backspace로 지움). 현장은 흐려진다.
let root = null, cur = 0, buf = "";
const MAX_FIG = 30;

function render(ctx) {
  const h = ctx.state.hands;
  root.querySelector(".s1-hands").classList.toggle("has", h !== null && h !== undefined);
  root.querySelector(".s1-num").textContent = h ?? "";
  const figs = root.querySelector(".s1-figs");
  const n = Math.min(h || 0, MAX_FIG);
  figs.innerHTML = Array.from({ length: n }, (_, k) => `<span class="figure-person" style="--k:${k}"></span>`).join("") +
    ((h || 0) > MAX_FIG ? `<em>+${h - MAX_FIG}</em>` : "");
}

export default {
  mode: "immersive",
  stamp: "",

  build(el, ctx) {
    root = el;
    el.innerHTML = `
      <div class="s1-title" data-out="2">
        <h1>학교 유형에 따른<br>정보 분야 심화학습 지원 구조 비교</h1>
        <p class="s1-subt"><span class="sch hanmin">한민고등학교</span>와 <span class="sch gbs">경기북과학고등학교</span>의<br>알고리즘 문제해결 교육 및 학습공동체를 중심으로</p>
        <p class="s1-author">컴퓨터공학과 구현호</p>
      </div>
      <div class="anchor-label s1-pl s1-pl-h" data-anchor="hanmin" data-out="2"><b>한민고</b><i>경기도 파주</i></div>
      <div class="anchor-label s1-pl s1-pl-g" data-anchor="gbs" data-out="2"><b>경기북과학고</b><i>경기도 의정부</i></div>

      <div class="s1-q" data-in="2">
        <h2>학교 다닐 때 좋았던 수업이나 동아리 중에,<br><em>그 선생님이 안 계셨으면 없었을</em> 활동이 있나요?</h2>
        <div class="s1-hands" aria-live="polite">
          <p class="s1-ask">잠깐 떠올려 보세요</p>
          <div class="s1-count"><span class="s1-num"></span><span class="s1-unit">명</span></div>
          <div class="s1-figs" aria-hidden="true"></div>
        </div>
      </div>`;
    render(ctx);
  },

  step(sub, ctx, { instant }) {
    cur = sub;
    root.classList.toggle("s1-still", !!(instant || ctx.reduced));
    buf = ctx.state.hands == null ? "" : String(ctx.state.hands);
    render(ctx);
  },

  leave() { cur = 0; },

  // 녹화 발표라 손 든 수를 세지 않는다(숫자 입력 끔)
  key(e, ctx) {
    if (true || cur !== 2 || e.metaKey || e.ctrlKey || e.altKey) return false;
    if (/^[0-9]$/.test(e.key)) {
      if (buf.length < 3) buf = (buf === "0" ? "" : buf) + e.key;
    } else if (e.key === "Backspace" || e.key === "Delete") {
      buf = buf.slice(0, -1);
    } else return false;
    const hands = buf === "" ? null : Number(buf);
    ctx.state.hands = hands;
    ctx.emit({ type: "hands", hands });
    root.classList.remove("s1-still");
    render(ctx);
    return true;
  },
};
