// 장면 12: 엔딩 (몰입, 레터박스)
// 1 밤의 AI 라운지 클로즈업(불 켜짐). 장면 0과 같은 구도. 라운지 안에 2기 선배와 '나'.
//   선배(2018~2019 캠프 강사 → 2023 교생) → 나(2023 올림피아드 준비 → 2025·2026 캠프 강사·멘토) → 후배.
//   보고서 Ⅴ-3: 반두라의 모방학습, 계획서에 적히지 않은 잠재적 교육과정의 긍정적 결과.
// 2 맺음(약 30초, 대본의 세 문장에 맞춰 세 번 바뀐다. 보고서 Ⅴ-3 두 문단):
//   ① AI 시대에도 알고리즘 사고는 기본기 → ② 과학고는 정규 과목, 일반고는 교사 개인 = 교육조건의 평등
//   → ③ "수업과 공동체를, 다음 사람이 이어받을 수 있게." 카메라가 라운지에서 천천히 물러나고,
//   ①은 들어오면 뜨고, ②·③은 발표자가 → 로 넘긴다(← 로 되돌림). 단계 표(steps.js)는 그대로 한 단계.
//   6-4에서 홀로 남았던 라운지 불빛 둘레로 교사동 창들이 하나씩 켜진다(한 사람의 불이 학교의 불로).
// 3 감사 인사(녹화 발표라 QR·드래그 안내는 뺐다).
let root, me = null, senior = null, timers = [], raf = 0;
const SPREAD = 0.86;                               // 교사동 창이 켜지는 비율(늘 비어 있는 방은 빼고)
const NEXT = ["ArrowRight", "PageDown", " ", "Enter"], PREV = ["ArrowLeft", "PageUp"];
let curSub = 0;
const clearT = () => { timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(raf); };
function spread(w, dur) {
  const t0 = performance.now();
  const tick = (now) => {
    const k = Math.min(1, (now - t0) / dur);
    w.setGroup("class", SPREAD * (1 - Math.pow(1 - k, 2)));
    if (k < 1) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
}

const lampColor = () => getComputedStyle(document.documentElement).getPropertyValue("--lamp").trim();
function ensureMe(ctx) {
  if (me || !ctx.world?.ok) return;
  me = ctx.world.addFigure("lounge", lampColor(), { offset: [0.9, 0, 0.55], glow: 0.45 });
  const teal = getComputedStyle(document.documentElement).getPropertyValue("--hanmin").trim();
  senior = ctx.world.addFigure("lounge", teal, { offset: [-0.4, 0, 0.55], glow: 0.3 });
}
function dropMe() { me?.remove(); me = null; senior?.remove(); senior = null; }

export default {
  mode: "immersive", letterbox: true, dark: true,
  stamp: "경기도 파주 · 한민고 · 2026.",
  shots: { 1: { rooms: { "hanmin-lounge": true } }, 2: { rooms: { "hanmin-lounge": true } }, 3: { rooms: { "hanmin-lounge": true } } },

  build(el) {
    root = el;
    el.innerHTML = `
      <!-- 1 선배 → 나 → 후배 -->
      <div class="s12-chain" data-out="2">
        <div class="n sen"><b>2기 선배</b><span>2018~2019 정보캠프 강사</span><span>2023 교생으로 모교에</span></div>
        <i class="arr" aria-hidden="true"></i>
        <div class="n me"><b>나</b><span>2023 선배 도움으로 올림피아드 준비</span><span>2025 · 2026 캠프 강사·멘토</span></div>
        <i class="arr" aria-hidden="true"></i>
        <div class="n nxt"><b>후배</b><span>앞으로 캠프를 이어 갈 사람</span></div>
      </div>
      <div class="s12-cap" data-out="2"><p class="subtitle-big">선배를 보며 교사를 꿈꾸게 됐다</p><small>반두라의 모방학습 · 어느 계획서에도 없던 잠재적 교육과정</small></div>

      <!-- 2 맺음: 세 문장 -->
      <div class="anchor-label s12-pl pass" data-anchor="lounge" data-in="2" data-out="3"><b>나</b><i>2025 · 2026 캠프 강사·멘토</i></div>
      <div class="s12-end" data-in="2" data-out="3">
        <p class="e1"><small>AI가 코드를 써 주는 시대에도</small><b>알고리즘 사고는 <em>기본기</em></b></p>
        <p class="e2"><span class="pair"><span><i>과학고</i>정규 과목으로 보장</span><span><i>일반고</i>교사 개인에게</span></span><b><em>교육조건의 평등</em> 문제</b></p>
        <p class="e3"><small>내가 만든 수업과 공동체를</small><b>다음 사람이 이어받을 수 있게.</b></p>
      </div>

      <!-- 3 감사 -->
      <div class="s12-qa pass" data-in="3">
        <div class="s12-thx"><b>감사합니다</b><small>컴퓨터공학과 구현호</small></div>
      </div>`;
  },

  enter(ctx) { ensureMe(ctx); },

  step(sub, ctx, { instant, dir, arrive }) {
    ensureMe(ctx);
    clearT();
    curSub = sub;
    const w = ctx.world;
    // 2단계부터는 '나' 혼자(선배는 1단계에서만)
    senior?.object && (senior.object.visible = sub === 1);
    root.classList.toggle("s12-still", !!(instant || ctx.reduced));
    ctx.stamp(sub <= 2 ? "경기도 파주 · 한민고 · 2026." : "", instant);
    const still = instant || ctx.reduced || dir < 0;
    if (sub === 1) { root.dataset.ph = "0"; w?.ok && w.setGroup("class", null); return; }
    if (sub >= 3 || still) {
      // 끝 상태: 물러난 카메라, 켜진 교사동
      root.dataset.ph = "3";
      if (w?.ok) { w.setGroup("class", SPREAD); if (sub === 2) w.setShot("hanmin-wide", { instant }); }
      return;
    }
    root.dataset.ph = "0";
    w?.ok && w.setGroup("class", 0);
    timers.push(setTimeout(() => { if (root.dataset.ph === "0") root.dataset.ph = "1"; }, (arrive || 0) + 1000));
  },

  // 영상 모드의 상태 이름 꼬리: 12-2(①) · 12-2b(②) · 12-2c(③)
  videoState(sub) {
    if (sub !== 2) return "";
    const ph = Number(root.dataset.ph || 0);
    return ph >= 3 ? "c" : ph === 2 ? "b" : "";
  },

  // 12-2 안에서 ①→②→③을 직접 넘긴다. ③에서 한 번 더 누르면 다음 단계(감사)로.
  key(e, ctx) {
    if (curSub !== 2) return false;
    const ph = Number(root.dataset.ph || 0), w = ctx.world;
    if (NEXT.includes(e.key) && ph < 3) {
      clearT();
      const n = Math.max(ph, 1) + 1;
      root.dataset.ph = String(n);
      if (n === 3 && w?.ok) { w.setShot("hanmin-wide", { duration: 13000 }); spread(w, 10000); }
      return true;
    }
    if (PREV.includes(e.key) && ph > 1) {
      clearT();
      root.dataset.ph = String(ph - 1);
      if (ph === 3 && w?.ok) { w.setShot("hanmin-lounge", { duration: 1600 }); w.setGroup("class", 0); }
      return true;
    }
    return false;
  },

  leave(ctx) { clearT(); ctx?.world?.ok && ctx.world.setGroup("class", null); dropMe(); },
};
