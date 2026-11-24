// 장면 0: 콜드 오픈 — 불빛으로 연다
// 1 밤 10시 40분의 한민고. 교실 불은 다 꺼졌고 교사동에는 AI 라운지 쪽 4층 불만 남아 있다.
//   (페이지를 막 열었으면 검은 화면에서 대기하다가 첫 →에 어둠이 걷힌다)
// 2 카메라가 그 창으로 다가가고 자막 한 줄(임시 문구, 윤문 예정).
// 9번에서 이 불이 꺼지고(실 끊기), 12번에서 다시 켜진 불로 끝난다(수미상관).
const NEXT_KEYS = ["ArrowRight", "PageDown", " ", "Enter"];
let root = null, timers = [];
let armed = true, waiting = false;
const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

export default {
  mode: "immersive",
  letterbox: true,
  stamp: "경기도 파주 · 한민고 · 2023. 22:40",
  shots: {
    1: { shot: "hanmin-wide", time: 22.67, dim: 0.05 },
    2: { shot: "hanmin-lounge", time: 22.67, dim: 0.15 },
  },

  build(el) {
    root = el;
    el.innerHTML = `
      <div class="s0-black pass" aria-hidden="true"></div>
      <p class="subtitle-big s0-sub">다들 기숙사로 돌아간 밤, 우리만 교사동에 남아 있었다.</p>`;
  },

  enter() { clearTimers(); },

  step(sub, ctx, { instant, dir }) {
    const still = instant || ctx.reduced;
    root.classList.toggle("s0-still", !!still);
    root.classList.remove("s0-subon");
    clearTimers();
    // 처음 연 상태이거나, 대기 중에 3D가 늦게 떠서 같은 단계를 다시 그리는 경우에는 계속 대기한다
    const first = armed || (waiting && instant && sub === 1); armed = false; waiting = false;
    root.classList.toggle("s0-dark", sub === 1 && first);
    if (sub === 1) { waiting = first; return; }
    if (!still && dir > 0) timers.push(setTimeout(() => root.classList.add("s0-subon"), 2400));   // 카메라가 창에 닿은 뒤
    else root.classList.add("s0-subon");
  },

  leave() { clearTimers(); waiting = false; root.classList.remove("s0-dark"); },

  key(e) {
    if (!waiting || !NEXT_KEYS.includes(e.key)) return false;
    waiting = false;
    root.classList.remove("s0-still", "s0-dark");   // 어둠이 천천히 걷힌다
    return true;
  },
};
