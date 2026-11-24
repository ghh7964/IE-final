// 장면 2: 두 기숙학교 (분할)
// 1 해 질 녘 두 학교 전경. 위쪽(하늘 자리)에 학교별 숫자, 점선 지시선이 3D 학교 위치로 내려간다(사진은 3D와 겹쳐서 뺌).
// 2 위에서 내려다보면 각 학교 부지에 중심 목적의 원이 뜬다(분석 층): 한민 '수능·진학', 경기북 '과학 연구'.
// 3 15초 설명: 흐려진 현장 위에 온라인 채점 사이트 화면 하나(사용자 캡처 참고, 로고·아이디 없이).
//   제출 칸에 코드가 한 글자씩 입력되고 → 마우스가 '제출'을 누르고 → 채점 현황에 줄이 생겨 "채점 중"에서 "맞았습니다!!"로.
let root = null, raf = 0, timers = [];
const CODE = ["n = int(input())", "print(n * (n + 1) // 2)"];
const later = (ms, f) => timers.push(setTimeout(f, ms));
const clearAll = () => { timers.forEach(clearTimeout); timers = []; };

// 앞에서부터 k글자까지 입력된 상태로 그린다(줄바꿈 포함)
function setCode(k) {
  const lines = root.querySelectorAll(".oj-ln");
  let r = k;
  CODE.forEach((t, j) => {
    const n = Math.max(0, Math.min(t.length, r));
    lines[j].querySelector("b").textContent = t.slice(0, n);
    lines[j].classList.toggle("cur", r >= 0 && (r <= t.length || j === CODE.length - 1));
    r -= t.length + 1;
  });
}

function judge(still) {
  const total = CODE.join("\n").length;
  root.classList.remove("s2-typing", "s2-press", "s2-sent", "s2-judged", "s2-aim");
  if (still) { setCode(total); root.querySelectorAll(".oj-ln").forEach((l) => l.classList.remove("cur")); root.classList.add("s2-sent", "s2-judged"); return; }
  setCode(0);
  root.classList.add("s2-typing");
  // 타이핑: 한 글자 60ms, 줄바꿈에서 잠깐 쉰다
  let t = 700;
  for (let k = 1; k <= total; k++) { t += CODE.join("\n")[k - 1] === "\n" ? 320 : 60; const kk = k; later(t, () => setCode(kk)); }
  // 마우스가 제출 버튼으로 → 누름 → 채점 중 → 맞았습니다
  const ptr = root.querySelector(".oj-ptr"), btn = root.querySelector(".oj-submit");
  ptr.style.left = `${btn.offsetLeft + btn.offsetWidth + 150}px`; ptr.style.top = `${btn.offsetTop - 70}px`;
  later(t + 300, () => { root.classList.remove("s2-typing"); root.classList.add("s2-aim");
    ptr.style.left = `${btn.offsetLeft + btn.offsetWidth * 0.6}px`; ptr.style.top = `${btn.offsetTop + btn.offsetHeight * 0.55}px`; });
  later(t + 1000, () => root.classList.add("s2-press"));
  later(t + 1180, () => { root.classList.remove("s2-press"); root.classList.add("s2-sent"); });
  later(t + 3100, () => root.classList.add("s2-judged"));
}

const SCHOOLS = [
  { key: "hanmin", name: "한민고등학교", place: "경기도 파주", kind: "기숙형 사립 일반고",
    img: "assets/a_hanmin_aerial.jpg", alt: "한민고등학교 항공사진", rot: -2.4,
    n1: ["1,044", "재학생"], n2: ["2", "정보 교사"] },
  { key: "gbs", name: "경기북과학고등학교", place: "경기도 의정부", kind: "기숙형 공립 과학고",
    img: "assets/a_gbs_front.jpg", alt: "경기북과학고등학교 본관", rot: 2.2,
    n1: ["265", "재학생"], n2: ["3", "정보과학 교사"] },
];

const col = (s, i) => `
  <section class="s2-col s2-col-${s.key}" data-out="2">
    <div class="s2-facts">
      <h3><span class="sch ${s.key}"${i === 0 ? ' data-ev="1"' : ""}>${s.name}</span></h3>
      <p class="s2-kind">${s.kind}</p>
      <div class="s2-nums">
        <span class="num">${s.n1[0]}<small>명</small></span><span class="s2-nl">${s.n1[1]}</span>
        <span class="num">${s.n2[0]}<small>명</small></span><span class="s2-nl">${s.n2[1]}</span>
      </div>
    </div>
  </section>`;

// 요소의 장면 좌표(변환 전 px)
function pos(n) { let x = 0, y = 0; for (let e = n; e && e !== root; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; } return { x, y }; }

// 기록(위쪽 열)과 현장(3D 학교 위치)을 잇는 지시선
function trackLeaders(ctx) {
  const svg = root.querySelector(".s2-leaders");
  const paths = svg.querySelectorAll("path"), dots = svg.querySelectorAll("circle");
  SCHOOLS.forEach((s, i) => {
    const a = ctx.anchor(s.key), box = root.querySelector(`.s2-col-${s.key} .s2-facts`);
    if (!a || !box) return;
    const p = pos(box), x0 = p.x + 40, y0 = p.y + box.offsetHeight + 14;
    paths[i].setAttribute("d", `M${x0.toFixed(1)} ${y0.toFixed(1)} L${a.x.toFixed(1)} ${(a.y - 12).toFixed(1)}`);
    dots[i].setAttribute("cx", a.x.toFixed(1)); dots[i].setAttribute("cy", (a.y - 4).toFixed(1));
  });
  raf = requestAnimationFrame(() => trackLeaders(ctx));
}

export default {
  mode: "split",
  stamp: "경기도 파주 · 경기도 의정부",

  build(el) {
    root = el;
    el.innerHTML = `
      ${SCHOOLS.map(col).join("")}
      <svg class="s2-leaders pass" viewBox="0 0 1000 900" data-out="2" aria-hidden="true">
        <path class="s2-ld"/><path class="s2-ld s2-lg"/>
        <circle r="7" class="s2-dot"/><circle r="7" class="s2-dot s2-lg"/>
      </svg>

      <div class="s2-ring s2-ring-h" data-anchor="hanmin">
        <div class="s2-ring-in" data-in="2" data-out="3"><span>한민고</span><small>계획서의 중기 과제</small><b data-ev="2">수능 · 진학</b></div>
      </div>
      <div class="s2-ring s2-ring-g" data-anchor="gbs">
        <div class="s2-ring-in" data-in="2" data-out="3"><span>경기북과학고</span><small>과학고의 중심 목적</small><b>과학 연구</b></div>
      </div>

      <!-- 3 온라인 채점 사이트 화면(간단히): 문제 → 코드 제출 → 채점 현황 -->
      <div class="s2-oj" data-in="3">
        <header class="oj-top"><b data-ev="3">온라인 채점 사이트</b><small>예: CodeUp · 백준</small><nav><span class="on">문제</span><span>제출</span><span>채점 현황</span><span>게시판</span></nav></header>
        <div class="oj-body">
          <section class="oj-prob">
            <h3>1001번 <span>1부터 N까지의 합</span></h3>
            <table class="oj-lim"><tr><th>시간 제한</th><th>메모리 제한</th><th>정답 비율</th></tr><tr><td>1 초</td><td>128 MB</td><td>52.4%</td></tr></table>
            <h5>문제</h5>
            <p>정수 N이 주어질 때, 1부터 N까지의 합을 구하시오.</p>
            <div class="oj-ex"><div><h6>예제 입력</h6><pre>10</pre></div><div><h6>예제 출력</h6><pre>55</pre></div></div>
          </section>
          <section class="oj-side">
            <h5>제출</h5>
            <pre class="oj-code">${CODE.map((c, j) => `<span class="oj-ln"><i>${j + 1}</i><b>${c}</b></span>`).join("")}</pre>
            <span class="oj-submit">제출</span>
            <svg class="oj-ptr" viewBox="0 0 20 28" aria-hidden="true"><path d="M2 2 L2 22 L7.5 17 L11 25.5 L14.5 24 L11 15.8 L18 15.8 Z"/></svg>
            <h5>채점 현황</h5>
            <table class="oj-stat"><tr><th>문제</th><th>결과</th><th>시간</th></tr>
              <tr class="oj-row"><td>1001</td><td class="oj-res"><span class="oj-wait">채점 중 <i></i></span><b class="oj-ok">맞았습니다!!</b></td><td class="oj-time"></td></tr></table>
          </section>
        </div>
      </div>

      <div class="lt" data-out="2"><h2>두 기숙학교</h2><p>기숙학교라 야간에도 학교 안에서 활동할 수 있다</p></div>
      <div class="lt" data-in="2" data-out="3"><h2>닮은 여건, 다른 중심 목적</h2></div>
      <div class="lt" data-in="3"><h2>코드를 내면 몇 초 만에 채점된다</h2></div>
    `;
  },

  step(sub, ctx, { instant }) {
    const still = !!(instant || ctx.reduced);
    root.classList.toggle("s2-still", still);
    root.dataset.sub = String(sub);
    ctx.stamp(sub >= 3 ? "알고리즘 문제 풀이 · 온라인 채점 사이트" : "경기도 파주 · 경기도 의정부", instant);
    cancelAnimationFrame(raf); clearAll();
    if (sub === 1) trackLeaders(ctx);
    if (sub >= 3) judge(still);
  },

  leave() { cancelAnimationFrame(raf); clearAll(); },
};
