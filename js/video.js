// 영상 모드: 3D를 띄우지 않고, 단계마다 미리 녹화한 영상을 튼다(녹화용 · 성능이 모자란 PC용).
// 영상은 video/<상태>.mp4(앞 단계에서 넘어오는 전환)와 video/<상태>.b.mp4(다음 단계에서 뒤로 돌아오는 전환).
// 목록은 video/manifest.json(tools/record_video.js가 만든다).

// HTML은 개발 서버(Live Server)가 새로고침 스크립트를 끼워 보내므로 그것과 공백을 빼고 비교한다(녹화 도구와 같은 규칙)
const normHtml = (t) => t.replace(/<!-- Code injected by live-server -->[\s\S]*?<\/script>/, "").replace(/\s+/g, "");
// steps.js는 대본(notes)을 빼고 화면에 쓰이는 값만 비교한다: 대본만 고쳐도 다시 녹화하라고 하지 않게(녹화 도구와 같은 규칙)
import { STEPS } from "./steps.js";
const stepsKey = () => JSON.stringify(STEPS.map(({ notes, ...s }) => s));

export function createVideo(deck) {
  const mk = () => {
    const v = document.createElement("video");
    v.className = "vid back"; v.muted = true; v.playsInline = true; v.preload = "auto";
    deck.insertBefore(v, deck.querySelector(".report-pane"));
    return v;
  };
  let front = mk(), back = mk();
  const toast = document.createElement("div");
  toast.className = "vtoast"; deck.appendChild(toast);
  let toastT = 0;

  let clips = null, on = false, token = 0, shown = null;
  const blobs = new Map();

  async function load() {
    if (clips) return clips;
    try {
      const r = await fetch("video/manifest.json", { cache: "no-cache" });
      if (!r.ok) throw new Error(r.status);
      clips = new Set((await r.json()).clips);
    } catch { clips = new Set(); }
    return clips;
  }
  // 강의실 네트워크가 느려도 끊기지 않게, 지금 위치부터 차례로 전부 받아 둔다.
  let prefetching = false;
  async function prefetch(order) {
    if (prefetching) return; prefetching = true;
    const want = order.filter((n) => clips.has(n)), total = want.length;
    let n = 0;
    for (const name of want) {
      if (!on) break;
      if (!blobs.has(name)) {
        try { const r = await fetch(`video/${name}.mp4`); if (r.ok) blobs.set(name, URL.createObjectURL(await r.blob())); }
        catch (e) { console.warn("[video] 미리 받기 실패", name, e); }
      }
      n++;
      document.title = n < total ? `영상 불러오는 중 ${n}/${total}` : document.title.replace(/^영상 불러오는 중.*$/, "영상 준비 완료");
    }
    prefetching = false;
    if (on) say(`영상 ${blobs.size}개 준비 완료`, 1800);
  }
  const url = (name) => blobs.get(name) || `video/${name}.mp4`;

  // 녹화가 지금 덱과 맞는지: 모든 단계의 영상이 있고, 화면을 바꾸는 파일의 해시가 녹화 때와 같은지
  async function status() {
    await load();
    let m = null;
    try { m = await (await fetch("video/manifest.json", { cache: "no-cache" })).json(); } catch { return { complete: false, fresh: false }; }
    const complete = !!m.steps?.length && m.steps.every((id) => clips.has(id));
    let fresh = false;
    try {
      const enc = new TextEncoder(), parts = [];
      for (const f of m.files) {
        const r = await fetch(f, { cache: "no-cache" });
        if (!r.ok) throw new Error(f);
        const body = f === "js/steps.js" ? enc.encode(stepsKey()) : f.endsWith(".html") ? enc.encode(normHtml(await r.text())) : new Uint8Array(await r.arrayBuffer());
        parts.push(enc.encode(f + "\n"), body, enc.encode("\n"));
      }
      const all = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
      parts.reduce((o, p) => (all.set(p, o), o + p.length), 0);
      const hex = [...new Uint8Array(await crypto.subtle.digest("SHA-256", all))].map((b) => b.toString(16).padStart(2, "0")).join("");
      fresh = hex === m.hash;
    } catch (e) { console.warn("[video] 녹화 확인 실패", e); }
    return { complete, fresh };
  }

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // 영상 요소에 name을 넣고 첫 장면이 준비될 때까지(시간 넘으면 false)
  function loadInto(v, name, ms) {
    v.dataset.name = name; v.src = url(name);
    return new Promise((res) => {
      const end = (ok) => { clearTimeout(t); v.removeEventListener("loadeddata", yes); v.removeEventListener("error", no); res(ok); };
      const yes = () => end(true), no = () => end(false), t = setTimeout(no, ms);
      v.addEventListener("loadeddata", yes); v.addEventListener("error", no);
    });
  }
  // how: "play" 처음부터 재생 · "end" 마지막 장면에 멈춤 · "start" 첫 장면에 멈춤
  async function show(name, how) {
    if (!on) return;
    const my = ++token;
    if (!clips.has(name)) { console.warn(`[video] 영상 없음: ${name}`); say(`영상 없음: ${name}`); return; }
    let v = back;
    if (v.dataset.name !== name) {
      // 빠르게 여러 번 넘기면 영상 요소가 새 영상을 못 받고 멈추는 일이 있다: 0.8초 안에 안 되면 새 요소로 바꿔 다시 받는다
      let ok = await loadInto(v, name, 800);
      if (my !== token) { if (!ok) delete v.dataset.name; return; }
      if (!ok) {
        const nv = mk(); v.remove(); back = v = nv;
        ok = await loadInto(v, name, 4000);
        if (my !== token) { if (!ok) delete v.dataset.name; return; }
        if (!ok) console.warn(`[video] 영상을 불러오지 못함: ${name}`);
      }
    }
    v.pause();
    const t = how === "end" ? Math.max(0, v.duration - 0.04) : 0;
    if (Math.abs(v.currentTime - t) > 0.01) {
      v.currentTime = t;
      await Promise.race([new Promise((res) => v.addEventListener("seeked", res, { once: true })), wait(800)]);
      if (my !== token) return;
    }
    if (how === "play") { try { await Promise.race([v.play(), wait(800)]); } catch (e) { console.warn(e); } }
    if (my !== token) { v.pause(); return; }
    [front, back] = [v, front];
    front.classList.remove("back"); back.classList.add("back"); back.pause();
    shown = { name, how };
  }
  function play() {   // 지금 멈춰 있는 영상(예: 콜드 오픈의 대기)을 이어서 튼다
    if (on && front.paused && !front.ended) front.play().catch((e) => console.warn(e));
  }

  function say(text, ms = 3200) {
    toast.textContent = text; toast.classList.add("on");
    clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove("on"), ms);
  }

  return {
    get on() { return on; },
    get shown() { return shown; },
    async enable(order) {
      const c = await load();
      if (!c.size) { say("녹화 영상이 없어 영상 모드를 켤 수 없습니다"); return false; }
      on = true; deck.classList.add("video");
      prefetch(order);
      status().then((st) => { if (!st.complete || !st.fresh) { say(st.complete ? "녹화 뒤에 덱이 바뀌었습니다 · 다시 녹화하세요" : "녹화되지 않은 단계가 있습니다", 5000); console.warn("[video]", st); } });
      return true;
    },
    disable() {
      on = false; token++; deck.classList.remove("video");
      [front, back].forEach((v) => { v.pause(); v.classList.add("back"); });
    },
    has: (name) => !!clips?.has(name),
    show, play, say, status,
  };
}
