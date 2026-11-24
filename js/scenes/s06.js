// 장면 6: 밤의 교실 — 준거 2 교수·학습 설계와 학습공동체 (기준 장면)
// 1 기록: 수업 게시판 공지 두 장(2022. 5. / 2022. 11.)에 붉은 연필 → 학습 준비도 · 개별화 수업(분석)
// 2 분석: 스키너의 교수 원리 계단(단계적 제시 → 개별 진도 → 즉각적 피드백). 보고서 Ⅳ-2에 있는 개념만 쓴다.
// 3 현장: 같은 밤 의정부, 경기북과학고 정보 2실. 세미나를 이끄는 사람이 학생.
// 4 현장: 한민고 19시 → 22시. 교사동 교실 불이 꺼지고 생활관이 켜지는데 AI 라운지 하나만 남는다(임장 교사).
//   보고서 Ⅳ-3 문장이라 준거 2의 끝, 준거 3(일이 그 한 사람에게)으로 넘어가는 다리로 둔다(11/23).
// 밤 장면은 2023학년도(야간 활동이 다시 열린 해, 보고서 Ⅳ-3). 게시판 공지는 2022학년도 수업.
const NIGHT = "경기도 파주 · 한민고 · 2023.";
const PAIUJU = "경기도 파주 · 한민고 · 수업 게시판 · 2022.";
const PAJU22 = "경기도 파주 · 한민고 · 2022.";
const UIJEONGBU = "경기도 의정부 · 경기북과학고 · 2023.";

let raf = 0, timer = 0, teacher = null;
const pad = (n) => String(n).padStart(2, "0");
const hhmm = (h) => { const m = Math.round(h * 60); return `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`; };

function ensureFigures(ctx) {
  if (teacher || !ctx.world?.ok) return;
  teacher = ctx.world.addFigure("lounge", "teacher", { offset: [0, 0, 0] });
}

export default {
  mode: "split",
  stamp: PAIUJU,
  chapter: { n: "준거 2", title: "학생마다 다른 다음 문제", sub: "교수·학습 설계와 학습공동체" },
  pins: { 4: "lounge" },        // 6-4: 원문 문장 → 불 켜진 라운지 창

  build(el) {
    el.innerHTML = `
      <!-- 1 현장: 시계와 3D 위치 라벨 -->
      <div class="s6-clock" data-in="4" aria-label="시각"><span class="s6-hhmm">19:00</span></div>
      <div class="anchor-label s6-pl s6-pl-teach" data-anchor="hanmin-teaching" data-in="4"><b>교사동</b><i class="s6-before">면학 2타임 · 교실</i><i class="s6-after">21시 · 교실 소등</i></div>
      <div class="anchor-label s6-pl s6-pl-dorm" data-anchor="hanmin-dorm" data-in="4"><b>생활관 면학실</b><i>면학 3타임 21:00~22:50</i></div>
      <div class="anchor-label s6-pl s6-pl-lounge" data-anchor="lounge" data-in="4"><b>AI 라운지</b><i>임장 교사 1명</i></div>

      <!-- 2 기록: 게시판 공지 두 장 -->
      <article class="paper doc-post s6-note s6-note-a" data-out="2" data-ex="2" style="--rot:-1.6deg">
        <header class="post-h"><div><b>담당 교사</b><small>수업 게시판 · 2022. 5.</small></div></header>
        <p><mark class="s6-m1" data-ev="1">1099까지 못 푼 사람: 1099까지</mark><br>전체: 본인 현재 문제수<mark class="s6-m2">+50개</mark></p>
      </article>
      <article class="paper doc-post s6-note s6-note-b" data-out="2" data-ex="3" style="--rot:2deg">
        <header class="post-h"><div><b>담당 교사</b><small>수업 게시판 · 2022. 11. 14.</small></div></header>
        <p><mark class="s6-m3">현호를 위한 문제 한개 더 추가</mark></p>
      </article>
      <svg class="s6-an pass" viewBox="0 0 1000 900" data-out="2" aria-hidden="true">
        <path class="holo" d="M520 300 C600 300 640 330 690 330"/>
        <path class="holo" d="M512 522 C600 522 640 560 690 560"/>
      </svg>
      <div class="hl-label s6-al s6-al-1" data-out="2"><b>학습 준비도</b><span>출발선에 따라 과제를 다르게</span></div>
      <div class="hl-label s6-al s6-al-2" data-out="2"><b>개별화 수업</b><span>진도가 빠른 학생에게 개인별 심화 문제</span></div>

      <!-- 3 분석: 도구 사다리 -->
      <div class="s6-ladder" data-in="2" data-out="3">
        <svg class="pass" viewBox="0 0 880 440" aria-hidden="true">
          <path class="holo s6-stair" d="M20 400 H300 V270 H580 V140 H860"/>
        </svg>
        <div class="s6-rung r1"><b>단계적 제시</b><small>단원별 문제를 CodeUp에</small></div>
        <div class="s6-rung r2"><b>개별 진도</b><small>출발선마다 다른 과제</small></div>
        <div class="s6-rung r3"><b>즉각적 피드백</b><small>몇 초 만에 채점 · 힌트는 한 걸음만</small></div>
        <div class="s6-who"><span class="figure-person"></span>설계한 사람: 교사</div>
      </div>
      <div class="s6-pair" data-in="2" data-out="3"><span data-ev="2"><b>스키너의 교수 원리</b> · 행동주의</span></div>

      <!-- 4 현장: 경기북과학고 정보 2실 -->
      <div class="anchor-label s6-pl s6-pl-gbs" data-anchor="gbs-info2" data-in="3" data-out="4"><b>정보 2실</b><i>자율동아리 ALPS 세미나</i></div>
      <div class="s6-sem" data-in="3" data-out="4">
        <svg class="pass" viewBox="0 0 420 330" aria-hidden="true"><path class="holo" d="M20 310 L400 20"/></svg>
        <span class="t t1">정렬 · 시간복잡도</span>
        <span class="t t2">…</span>
        <span class="t t3">세그먼트 트리</span>
        <span class="t t5">그래프 · 트리 알고리즘</span>
        <small class="ax0">기초</small><small class="ax1">고급 자료구조</small>
      </div>
      <div class="s6-lead" data-in="3" data-out="4" data-ev="3"><span class="figure-person s6-stu"></span><b>세미나 진행</b><em>학생</em></div>
      <div class="s6-peer" data-in="3" data-out="4"><b>자발적 동료학습</b><span>역할을 나눈 협동학습이라기보다<br>함께 모여 서로 가르치는 학습</span></div>

      <!-- 제목(하단 자막) -->
      <div class="lt" data-out="2"><h2>학생마다 다음 문제가 달랐다</h2></div>
      <div class="lt" data-in="2" data-out="3"><h2>스키너의 교수 원리 그대로</h2></div>
      <div class="lt" data-in="3" data-out="4"><h2>학생이 직접 세미나를 이끌었다</h2></div>
      <div class="lt" data-in="4"><h2>밤 9시, 교사동에 켜진 불 하나</h2></div>
    `;
  },

  enter(ctx) { ensureFigures(ctx); },

  step(sub, ctx, { instant, arrive }) {
    ensureFigures(ctx);
    cancelAnimationFrame(raf); clearTimeout(timer);
    const el = document.querySelector('.scene[data-scene="6"]');
    const w = ctx.world;
    ctx.stamp(sub === 2 ? PAJU22 : sub === 3 ? UIJEONGBU : sub === 4 ? NIGHT : PAIUJU, instant);

    if (sub === 4) {
      // 19시에서 22시로: 시계가 흐르고, 21시를 넘으면 생활관 라벨이 켜진다
      const clock = el.querySelector(".s6-hhmm");
      const run = () => {
        const h = w?.ok ? w.time : 22;
        clock.textContent = hhmm(h);
        el.classList.toggle("s6-after9", h >= 21);
        el.classList.toggle("s6-late", h >= 21.6);
        raf = requestAnimationFrame(run);
      };
      if (w?.ok) {
        if (instant || ctx.reduced) w.setTime(22);
        else { w.setTime(19); timer = setTimeout(() => w.setTime(22, { duration: 7000 }), 900 + (arrive || 0)); }
      }
      run();
    } else {
      el.classList.add("s6-after9", "s6-late");
    }
  },

  leave() { cancelAnimationFrame(raf); clearTimeout(timer); teacher?.remove(); teacher = null; },
};
