// 3D 현장 층: 한민고·경기북과학고 캠퍼스 로우폴리 모형(전부 절차적 지오메트리, 외부 모델·사진 텍스처 없음).
// 엔진은 createWorld(container)의 반환값을 ctx.world로 쓴다. 'three'는 index.html의 importmap이 vendor/로 연결한다.
//
// 좌표: 1 단위 ≈ 1 m. +x = 동쪽, +z = 남쪽, +y = 위. 한민고 배치는 위성사진(1px ≈ 0.4 m)에서 옮겼다.
// 한민고는 원점 부근, 경기북과학고는 동쪽(+x 420)에 둔다(실제 거리와 무관한 무대 배치).
import * as THREE from "three";

const DEG = Math.PI / 180;
const S = 0.4;                                        // 위성사진 1px ≈ 0.4 m
const P = (px, py) => [(px - 600) * S, (py - 650) * S];
const A = Math.atan2(180, 440);                       // 한민고 교사동 축(로컬 +z = 남남동, 로컬 +x = 운동장 쪽)
const GBS = { x: 420, z: 40 };                        // 경기북과학고 무대 위치

export const SHOT_NAMES = ["both-top", "dawn-both", "hanmin-wide", "hanmin-se", "hanmin-lounge", "gbs-wide", "gbs-front", "gbs-info2", "top-down", "map"];

// ───────── 작은 도구 ─────────
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
function hash2(i, j) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function vnoise(x, z) {
  const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash2(i, j), b = hash2(i + 1, j), c = hash2(i, j + 1), d = hash2(i + 1, j + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, z) { let s = 0, amp = 0.5, f = 1; for (let k = 0; k < 5; k++) { s += amp * vnoise(x * f, z * f); f *= 2.03; amp *= 0.5; } return s / 0.96875; }
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const C = (hex) => new THREE.Color(hex);

// ───────── 지형 높이 ─────────
function campusMask(x, z) {
  const eH = Math.hypot((x + 52) / 182, (z + 2) / 208);
  const eG = Math.hypot((x - GBS.x) / 140, (z - GBS.z) / 148);
  return Math.min(smooth(1.0, 1.5, eH), smooth(1.0, 1.55, eG));
}
function heightAt(x, z) {
  const m = campusMask(x, z);
  if (m <= 0) return -0.4;
  const n = fbm(x * 0.0042 + 3.1, z * 0.0042 + 7.7);
  const r = 1 - Math.abs(fbm(x * 0.0021 + 11, z * 0.0021 + 5) * 2 - 1);
  const hgt = 14 + 90 * n * n + 70 * r * r;
  // 한민고는 서·북쪽 산자락이 높고, 경기북과학고는 북쪽 뒷산이 높다
  const biasH = 0.3 + 1.35 * smooth(-160, 240, -(x + 52) * 0.8 - z * 0.6);
  const biasG = 0.3 + 0.8 * smooth(-120, 260, -(z - GBS.z));
  const wG = smooth(170, 330, x);
  const bias = biasH * (1 - wG) + biasG * wG;
  // 한민고 동쪽 들판(두 학교 사이 낮은 골짜기)
  const farm = Math.exp(-(((x - 205) / 85) ** 2) - (((z - 90) / 280) ** 2));
  return m * hgt * bias * (1 - 0.88 * farm) - 0.4;
}

// ───────── 창문(인스턴스) 모음: 그룹별로 불을 켜고 끈다 ─────────
const FACE_Q = {
  "+x": new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2),
  "-x": new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2),
  "+z": new THREE.Quaternion(),
  "-z": new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI),
};
class Windows {
  constructor() { this.items = []; this.r = rng(7); }
  // obj 로컬 좌표의 상자(중심 x,z, 폭 w(x), 깊이 d(z), 바닥 y0)에 층별 창문을 붙인다.
  box(obj, { x = 0, z = 0, w, d, y0 = 0, floors, fh, faces, group, spacing = 3.6, skip }) {
    obj.updateWorldMatrix(true, false);
    const M = new THREE.Matrix4(), p = new THREE.Vector3(), s = new THREE.Vector3();
    for (const face of faces) {
      const alongZ = face[1] === "x";
      const span = alongZ ? d : w;
      const n = Math.max(1, Math.floor((span - 3) / spacing));
      const off = (span - (n - 1) * spacing) / 2;
      for (let f = 0; f < floors; f++) {
        const y = y0 + f * fh + fh * 0.52;
        for (let k = 0; k < n; k++) {
          const t = -span / 2 + off + k * spacing;
          const sign = face[0] === "+" ? 1 : -1;
          if (alongZ) p.set(x + sign * (w / 2 + 0.06), y, z + t); else p.set(x + t, y, z + sign * (d / 2 + 0.06));
          if (skip?.(face, alongZ ? z + t : x + t, y)) continue;
          s.set(spacing * 0.6, fh * 0.42, 1);
          M.compose(p, FACE_Q[face], s).premultiply(obj.matrixWorld);
          const g = typeof group === "function" ? group(face, alongZ ? z + t : x + t, y, f) : group;
          this.items.push({ m: M.clone(), group: g, h: this.r(), floor: f });
        }
      }
    }
  }
  // 낱개 창 하나(크기 직접 지정)
  one(obj, { x, y, z, face, w, h, group, floor = 0 }) {
    obj.updateWorldMatrix(true, false);
    const M = new THREE.Matrix4();
    M.compose(new THREE.Vector3(x, y, z), FACE_Q[face], new THREE.Vector3(w, h, 1)).premultiply(obj.matrixWorld);
    this.items.push({ m: M, group, h: this.r(), floor });
  }
  build(parent) {
    const geo = new THREE.PlaneGeometry(1, 1);
    const mat = new THREE.MeshBasicMaterial({ toneMapped: false });
    const mesh = new THREE.InstancedMesh(geo, mat, this.items.length);
    this.items.forEach((it, i) => { mesh.setMatrixAt(i, it.m); mesh.setColorAt(i, C("#000")); });
    mesh.instanceMatrix.needsUpdate = true;
    parent.add(mesh);
    this.mesh = mesh;
    return mesh;
  }
}

// ───────── 재질·텍스처 ─────────
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
function makeMaterials() {
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.88, metalness: 0, flatShading: true, ...o });
  const panel = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = "#24385e"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#7c93bb"; g.lineWidth = 2;
    for (let i = 0; i <= w; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); }
    g.lineWidth = 3; for (let j = 0; j <= h; j += 32) { g.beginPath(); g.moveTo(0, j); g.lineTo(w, j); g.stroke(); }
  }, [6, 3]);
  const field = canvasTex(256, 384, (g, w, h) => {
    for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? "#3f8c45" : "#4b9a50"; g.fillRect(0, (i * h) / 12, w, h / 12 + 1); }
    g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 3;
    g.strokeRect(8, 8, w - 16, h - 16);
    g.beginPath(); g.moveTo(8, h / 2); g.lineTo(w - 8, h / 2); g.stroke();
    g.beginPath(); g.arc(w / 2, h / 2, 34, 0, Math.PI * 2); g.stroke();
    g.strokeRect(w / 2 - 70, 8, 140, 56); g.strokeRect(w / 2 - 70, h - 64, 140, 56);
  });
  const curtain = canvasTex(64, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#4fbcb1"); gr.addColorStop(1, "#2f9a92");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = "#24524f"; g.fillRect(0, h - 14, w, 14);
    g.fillStyle = "rgba(20,70,66,.8)"; for (let i = 0; i < w; i += 16) g.fillRect(i, 0, 2, h);
    g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(0, 10, w, 18);
  });
  const glow = canvasTex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.25, "rgba(255,255,255,.45)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  return {
    std,
    hWall: std("#d9dcdf"), hBase: std("#7d8792"), hTrim: std("#eef0f1"), hRoof: std("#9aa1a8"),
    glass: new THREE.MeshStandardMaterial({ color: "#5b86ad", roughness: 0.2, metalness: 0.35, flatShading: true }),
    panel: new THREE.MeshStandardMaterial({ map: panel, color: "#ffffff", roughness: 0.35, metalness: 0.4, flatShading: true }),
    frame: std("#e9ecee"),
    dorm: std("#ebe8e1"), dormRoof: std("#5d646d"),
    gym: std("#cdb9a3"), gymRoof: std("#d9dee3"),
    small: std("#c2ab92"), smallRoof: std("#6d4b3c"),
    plaza: std("#b3b3ab", { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    road: std("#53575d", { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    track: std("#3f83d6", { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    field: new THREE.MeshStandardMaterial({ map: field, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    court: std("#4f9a6c", { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    courtB: std("#3c78b8", { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    gStone: std("#b4ada2"), gWall: std("#c2bcb2"), gWall2: std("#d3cdc1"), gWall3: std("#d9ccb8"), gPanel: std("#c3c8cc"),
    gBrick: std("#c6a687"), gDorm: std("#e2dace"), gGym: std("#c9ced3"), gGymRoof: std("#e6e8ea"), gSlot: std("#5d646b"),
    gRoofGreen: std("#9dd2a2"), gSign: std("#2e4f9a"), gold: std("#c9a14c", { metalness: 0.35, roughness: 0.5 }),
    dome: std("#eef1f3", { flatShading: false, roughness: 0.4 }), orange: std("#e2763d"), step: std("#b5b4ad"), hedge: std("#3f7c3f"),
    dirt: std("#d2bb93", { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    gGlass: (() => { const cache = {}; return (w, floors) => {
      const k = `${w}x${floors}`;
      if (!cache[k]) { const tx = curtain.clone(); tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(Math.round(w / 4.8), floors); tx.needsUpdate = true;
        cache[k] = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.25, metalness: 0.3, flatShading: true }); }
      return cache[k]; }; })(),
    glowTex: glow,
  };
}

// ───────── 형태 도우미 ─────────
function box(parent, mat, { x = 0, y = 0, z = 0, w, h, d, ry = 0 }) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z); m.rotation.y = ry;
  m.castShadow = m.receiveShadow = true;
  parent.add(m); return m;
}
function hipRoof(parent, mat, { x = 0, y, z = 0, w, d, h, ry = 0, inset = 0.55 }) {
  // 사각 뿔대(모임지붕): 4각 원기둥을 45° 돌려 직사각형으로 늘인다
  const g = new THREE.CylinderGeometry(inset * 0.7071, 0.7071 * 1.04, h, 4, 1);
  g.rotateY(Math.PI / 4);
  const m = new THREE.Mesh(g, mat);
  m.scale.set(w, 1, d);
  m.position.set(x, y + h / 2, z); m.rotation.y = ry;
  m.castShadow = m.receiveShadow = true;
  parent.add(m); return m;
}
function flat(parent, mat, geo, y) {
  const m = new THREE.Mesh(geo, mat);
  m.position.y = y; m.receiveShadow = true; parent.add(m); return m;
}
function polyGeo(pts) {
  const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ShapeGeometry(sh); g.rotateX(-Math.PI / 2); return g;
}
function ribbonGeo(pts, width) {
  const pos = [], idx = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b[0] - a[0], dz = b[1] - a[1]; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    const nx = -dz * width / 2, nz = dx * width / 2;
    pos.push(pts[i][0] + nx, 0, pts[i][1] + nz, pts[i][0] - nx, 0, pts[i][1] - nz);
    if (i) { const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// 두 점(p0→p1) 사이에 놓인 긴 동(생활관 날개 등)
function segGroup(parent, p0, p1, extra = 0) {
  const vx = p1[0] - p0[0], vz = p1[1] - p0[1];
  const g = new THREE.Group();
  g.position.set((p0[0] + p1[0]) / 2, 0, (p0[1] + p1[1]) / 2);
  g.rotation.y = Math.atan2(-vz, vx);                 // 로컬 +x가 p0→p1 방향
  parent.add(g);
  return { g, len: Math.hypot(vx, vz) + extra };
}

// ───────── 한민고 ─────────
function buildHanmin(root, M, W, anchors) {
  const g = new THREE.Group(); g.name = "hanmin"; root.add(g);

  // 바닥: 포장 마당, 도로
  const plaza = [[340, 770], [372, 540], [60, 300], [175, 245], [470, 195], [700, 175], [735, 300], [885, 640], [875, 725], [770, 920], [705, 1085], [540, 1115], [440, 1045], [345, 795]].map(([a, b]) => P(a, b));
  flat(g, M.plaza, polyGeo(plaza), 0.02);
  const roads = [
    [[345, 780], [450, 1040], [545, 1100], [700, 1082], [762, 920], [870, 700], [872, 640], [748, 440], [700, 300], [690, 250], [740, 120], [800, 40]],
    [[762, 920], [850, 965], [1000, 1180], [1080, 1330]],
    [[520, 240], [560, 355]],
  ];
  roads.forEach((r) => flat(g, M.road, ribbonGeo(r.map(([a, b]) => P(a, b)), 7), 0.05));
  roadsideTrees(g, roads[0].map(([a, b]) => P(a, b)), [-40, 0], 7);

  // 교사동: 운동장을 마주한 긴 본동 + 뒤(서쪽)로 뻗은 핑거 4개. 치수는 지도(자료/사진/한민고/한민고 지도.jpg)의
  //   건물 윤곽을 본동 축으로 재서 옮겼다(본동 길이 190 기준, 1px ≈ 0.342). 양 끝 핑거는 본동 양 끝에 붙는다.
  //   태양광: 핑거마다 남쪽으로 기운 판 하나가 핑거 끝에서 본동 운동장 쪽 끝까지 이어지고, 기둥 줄이 받친다(아래는 비어 있다).
  const sch = new THREE.Group(); sch.position.set(-3.4, 0, 55); sch.rotation.y = A; g.add(sch);
  const FH = 4.1, H = FH * 4, L = 190, S = L / 556;
  const BW = 75 * S, BX = 8 - BW / 2, BACK = 8 - BW;  // 본동 폭과 중심, 뒷면(서쪽) x
  // 정면 사진(slide07·06)에서 잰 위치. z = 북쪽 끝(-95)에서부터 m.
  //   유리 상자: 2~3층, 운동장 쪽으로 튀어나옴(1층은 현관). 그 오른쪽(북쪽) 끝 구간은 교실 창 대신 큰 네모 창·좁고 긴 창·작은 창.
  const GZ = -42.5, GW = 33, EZ = GZ - GW / 2;       // EZ: 끝 구간 시작(-59)
  const LZ = -63.6, LW = 10.6, LD = 6;              // AI 라운지: 끝 구간 4층, 큰 네모 창 두 개 뒤의 방
  // 교사동 정문: 운동장에서 볼 때 왼쪽에서 두 번째 핑거 앞. 1~2층이 안으로 파여 있고 기둥이 서며, 1층 위에 차양(사진 slide06·07)
  const E0 = 17, E1 = 36, EC = (E0 + E1) / 2, RD = 5;
  const span = (z0, z1) => ({ z: (z0 + z1) / 2, d: z1 - z0 });
  const lowBody = (mat, y, h, pad) => {
    box(sch, mat, { x: BX, y, ...span(-L / 2 - pad / 2, E0), w: BW + pad, h });
    box(sch, mat, { x: BX, y, ...span(E1, L / 2 + pad / 2), w: BW + pad, h });
    box(sch, mat, { x: BX - RD / 2, y, ...span(E0, E1), w: BW - RD + pad, h });
  };
  lowBody(M.hBase, 0, FH, 0.4);
  lowBody(M.hWall, FH, FH, 0);
  box(sch, M.hWall, { x: BX, y: FH * 2, z: 0, w: BW, d: L, h: FH });
  box(sch, M.std("#2a313b"), { x: 8 - RD + 0.06, y: 0, z: EC, w: 0.1, d: E1 - E0 - 0.2, h: FH * 2 });     // 안쪽 유리문 벽(그늘)
  [E0 + 0.4, EC, E1 - 0.4].forEach((zz) => box(sch, M.frame, { x: 7.6, y: 0, z: zz, w: 0.8, d: 0.8, h: FH * 2 }));
  box(sch, M.hTrim, { x: 8 - RD + (RD + 5) / 2, y: FH - 0.55, z: EC, w: RD + 5, d: 11, h: 0.5 });     // 차양
  [-4, 4].forEach((dz) => box(sch, M.frame, { x: 12.4, y: 0, z: EC + dz, w: 0.3, d: 0.3, h: FH - 0.55 }));
  // 4층: 라운지 자리만 비우고 벽을 잇는다(라운지 뒤쪽은 막는다)
  const l0 = LZ - LW / 2, l1 = LZ + LW / 2;
  box(sch, M.hWall, { x: BX, y: FH * 3, z: (-L / 2 + l0) / 2, w: BW, d: l0 + L / 2, h: FH });
  box(sch, M.hWall, { x: BX, y: FH * 3, z: (l1 + L / 2) / 2, w: BW, d: L / 2 - l1, h: FH });
  box(sch, M.hWall, { x: (BACK + 8 - LD) / 2, y: FH * 3, z: LZ, w: BW - LD, d: LW, h: FH });
  box(sch, M.hTrim, { x: BX, y: H, z: 0, w: BW + 0.6, d: L + 0.6, h: 0.9 });
  // 라운지 쪽(생활관 쪽 끝 핑거)의 4층은 통째로 정보 공간이라 라운지와 함께 켜진다
  const NZ = -L / 2 + 112 * S;
  W.box(sch, { x: BX, z: 0, w: BW, d: L, floors: 4, fh: FH, faces: ["+x", "-x", "+z", "-z"],
    group: (face, p, y, f) => f === 3 && (face === "-z" || (face === "-x" && p < NZ)) ? "lounge" : "class",
    skip: (f, lz, y) => f === "+x" && ((lz < EZ + 0.5 && y > FH) || (Math.abs(lz - GZ) < GW / 2 && y > FH && y < FH * 3) || (lz > E0 - 1 && lz < E1 + 1 && y < FH * 2)) });
  // 끝 구간 창(2~4층). 큰 네모 창 2개(4층은 라운지), 좁고 긴 창 2개, 중간 창 1개, 작은 창 2개
  for (let f = 1; f < 4; f++) {
    const y = f * FH + FH * 0.55;
    const win = (z, w, h, yy = y) => W.one(sch, { x: 8.06, y: yy, z, face: "+x", w, h, group: f === 3 ? "lounge" : "class", floor: f });
    if (f < 3) { win(-61, 3.8, 2.4); win(-66.1, 3.8, 2.4); }
    win(-72.05, 1.1, 2.5); win(-75.2, 1.1, 2.5); win(-79.2, 2.2, 2.1);
    win(-83.4, 1.2, 1.2, y + 0.5); win(-86, 1.2, 1.2, y + 0.5);   // 2층 것은 사진에서 나무에 가려 있었다
  }
  const ROOF = H + 0.9;
  const post = (x, z, h) => box(sch, M.frame, { x, y: ROOF, z, w: 0.35, d: 0.35, h });
  // 핑거: [본동 축 시작, 끝, 운동장 쪽 끝에서 잰 깊이] (지도 px)
  [[0, 112, 154], [175, 263, 243], [330, 398, 242], [475, 556, 210]].forEach(([u0, u1, v], wi) => {
    const zc = -L / 2 + ((u0 + u1) / 2) * S, d = (u1 - u0) * S;
    const end = 8 - v * S, wl = BACK - end, xc = (BACK + end) / 2;
    box(sch, M.hBase, { x: xc, z: zc, w: wl, d: d + 0.4, h: FH });
    box(sch, M.hWall, { x: xc, y: FH, z: zc, w: wl, d, h: H - FH });
    box(sch, M.hTrim, { x: xc, y: H, z: zc, w: wl + 0.6, d: d + 0.6, h: 0.9 });
    W.box(sch, { x: xc, z: zc, w: wl, d, floors: 4, fh: FH, faces: ["-x", "+z", "-z"], group: wi === 0 ? (face, p, y, f) => (f === 3 ? "lounge" : "class") : "class" });
    const rise = 4.5, low = 1.4, tilt = Math.atan(rise / d);
    const px0 = end - 1, px1 = 9, pw = px1 - px0, pxc = (px0 + px1) / 2;
    const pn = box(sch, M.panel, { x: pxc, y: 0, z: zc, w: pw, d: (d + 2) / Math.cos(tilt), h: 0.35 });
    pn.position.y = ROOF + low + rise / 2; pn.rotation.x = tilt;
    const dz = d / 2 - 1.5;
    for (let k = -pw / 2 + 2; k <= pw / 2 - 1; k += 8)
      [-dz, 0, dz].forEach((q) => post(pxc + k, zc + q, low + (rise * (d / 2 - q)) / d - 0.25));
  });
  // 운동장 쪽 유리 커튼월(3~4층) + 2층에서 튀어나온 유리 공간(라운지 아님, 불은 켜지 않는다)
  box(sch, M.gGlass(GW, 2), { x: 9.6, y: FH, z: GZ, w: 3.2, d: GW, h: FH * 2 });
  box(sch, M.hTrim, { x: 9.6, y: FH * 3, z: GZ, w: 3.6, d: GW + 0.4, h: 0.4 });
  box(sch, M.hTrim, { x: 9.6, y: FH - 0.4, z: GZ, w: 3.6, d: GW + 0.4, h: 0.4 });
  // AI 라운지: 4층 벽 안쪽 방. 벽면에 큰 네모 창 두 개가 나 있다(다른 층의 같은 자리 창과 같은 크기).
  const ly0 = FH * 0.55 - 1.2, ly1 = FH * 0.55 + 1.2;
  const lounge = buildLounge(sch, M, { x: 8 - LD, z: LZ, y: FH * 3, w: LW, depth: LD, h: FH, flush: true,
    openings: [{ z: -61 - LZ, w: 3.8, y0: ly0, y1: ly1 }, { z: -66.1 - LZ, w: 3.8, y0: ly0, y1: ly1 }] });
  anchors.lounge = lounge.anchor;

  // 운동장: 파란 트랙 + 인조잔디
  const fld = new THREE.Group(); fld.position.set(42, 0, -4); fld.rotation.y = A; g.add(fld);
  const tg = new THREE.PlaneGeometry(82, 118); tg.rotateX(-Math.PI / 2);
  flat(fld, M.track, tg, 0.06);
  const fg = new THREE.PlaneGeometry(62, 98); fg.rotateX(-Math.PI / 2);
  flat(fld, M.field, fg, 0.09);
  // 운동장 남쪽 끝 스탠드(계단)
  for (let k = 0; k < 4; k++) box(fld, M.hTrim, { x: -45 - k * 1.6, y: 0, z: 0, w: 1.6, h: 0.5 + k * 0.5, d: 90 });
  anchors["hanmin-field"] = new THREE.Vector3(42, 0, -4);

  // 체육관: 낮은 상자 + 둥근(볼트) 지붕
  const gym = new THREE.Group(); gym.position.set(15, 0, -98); gym.rotation.y = A; g.add(gym);
  box(gym, M.gym, { w: 44, d: 58, h: 10 });
  // 축을 로컬 z로 눕힌 반원기둥(위로 볼록)
  const vg = new THREE.CylinderGeometry(1, 1, 58.6, 18, 1, false, -Math.PI / 2, Math.PI);
  vg.rotateX(-Math.PI / 2);
  const vault = new THREE.Mesh(vg, M.gymRoof);
  vault.scale.set(23, 5.5, 1); vault.position.set(0, 10, 0); vault.castShadow = vault.receiveShadow = true;
  gym.add(vault);
  W.box(gym, { w: 44, d: 58, floors: 2, fh: 4.6, faces: ["+x", "-z", "+z"], group: "other", spacing: 6 });
  // 농구장
  const cg = new THREE.PlaneGeometry(32, 46); cg.rotateX(-Math.PI / 2);
  const ct = flat(g, M.courtB, cg, 0.06); ct.position.set(-34, 0.06, -94); ct.rotation.y = A;

  // 생활관 두 동(위성사진에서 꺾인 'ㄱ'자 두 채, 8층)
  const DFH = 3.3, DH = DFH * 8, DY = 1.2;
  const dorm = (pts, name) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const { g: sg, len } = segGroup(g, P(...pts[i]), P(...pts[i + 1]), 16);
      box(sg, M.hBase, { w: len, d: 17.4, h: DY + DFH });
      box(sg, M.dorm, { y: DY + DFH, w: len, d: 17, h: DH - DFH });
      hipRoof(sg, M.dormRoof, { y: DY + DH, w: len + 1.5, d: 18.5, h: 4.2, inset: 0.6 });
      W.box(sg, { w: len - 14, d: 17, y0: DY, floors: 8, fh: DFH, faces: ["+z", "-z"], group: "dorm", spacing: 3.3 });
    }
    anchors[name] = new THREE.Vector3(...((p) => [p[0], DY + DH / 2, p[1]])(P(...pts[1])));
  };
  dorm([[95, 335], [185, 500], [372, 548]], "hanmin-dorm-a");
  dorm([[185, 282], [348, 352], [522, 292]], "hanmin-dorm");

  // 북쪽 작은 건물(갈색 모임지붕, 4층)
  const sm = new THREE.Group(); sm.position.set(...((p) => [p[0], 0, p[1]])(P(620, 232))); sm.rotation.y = A - 20 * DEG; g.add(sm);
  box(sm, M.small, { w: 52, d: 26, h: 14 });
  hipRoof(sm, M.smallRoof, { y: 14, w: 54, d: 28, h: 5, inset: 0.45 });
  W.box(sm, { w: 52, d: 26, floors: 4, fh: 3.4, faces: ["+x", "-x", "+z", "-z"], group: "other", spacing: 4 });

  // 서쪽 언덕의 테니스·풋살장
  [[190, 870, M.court], [208, 1010, M.court], [226, 1150, M.courtB]].forEach(([a, b, m]) => {
    const cg2 = new THREE.PlaneGeometry(26, 36); cg2.rotateX(-Math.PI / 2);
    const c = flat(g, m, cg2, 0.07); const [x, z] = P(a, b); c.position.x = x; c.position.z = z; c.rotation.y = -8 * DEG;
  });

  anchors.hanmin = new THREE.Vector3(-25, 10, 5);
  anchors["hanmin-teaching"] = sch.localToWorld(new THREE.Vector3(0, H / 2, 0));
  return { group: g, lounge };
}

// 도로 바깥쪽(캠퍼스 중심의 반대편)에 둥근 가로수를 줄지어 심는다.
function roadsideTrees(parent, pts, center, off) {
  const r = rng(11), spots = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.floor(L / 11);
    let nx = -(z1 - z0) / L, nz = (x1 - x0) / L;
    const mx = (x0 + x1) / 2 - center[0], mz = (z0 + z1) / 2 - center[1];
    if (nx * mx + nz * mz < 0) { nx = -nx; nz = -nz; }
    for (let k = 0; k < n; k++) { const t = (k + 0.5) / n; spots.push([x0 + (x1 - x0) * t + nx * off, z0 + (z1 - z0) * t + nz * off]); }
  }
  const geo = new THREE.IcosahedronGeometry(1, 0);
  const mesh = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 1 }), spots.length);
  const M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
  spots.forEach(([x, z], i) => {
    const rad = 2.4 + r() * 1.4;
    p.set(x, rad * 1.25, z); s.set(rad, rad * 1.2, rad); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6);
    mesh.setMatrixAt(i, M4.compose(p, q, s));
    mesh.setColorAt(i, c.set("#3f7a3c").lerp(C("#7a9a45"), r() * 0.7));
  });
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
}

// AI 라운지: 본동 면에서 튀어나온 유리 공간. 안쪽 벽이 빛나고, 피규어를 세울 수 있다.
function buildLounge(parent, M, { x, z, y, w, depth, h, flush = false, openings = null }) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  const slab = (yy) => box(g, M.hTrim, { x: depth / 2, y: yy, z: 0, w: depth + 0.6, d: w + 0.6, h: 0.45 });
  if (!flush) { slab(-0.45); slab(h - 0.2); }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h - 0.2), new THREE.MeshBasicMaterial({ color: "#101826", toneMapped: false }));
  back.rotation.y = Math.PI / 2; back.position.set(0.08, (h - 0.2) / 2, 0); g.add(back);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(depth, w), M.std("#c9c2b4"));
  floor.rotation.x = -Math.PI / 2; floor.position.set(depth / 2, 0.01, 0); floor.receiveShadow = true; g.add(floor);
  const glassMat = new THREE.MeshStandardMaterial({ color: "#a8d8ff", transparent: true, opacity: 0.16, roughness: 0.1, metalness: 0.2, depthWrite: false, side: THREE.DoubleSide });
  if (openings) {
    // 벽면에 뚫린 창(사진: 큰 네모 창 두 개). 창 사이·위아래는 벽이다.
    const T = 0.5, wx = depth - T / 2;
    const ops = [...openings].sort((a, b) => a.z - b.z);
    let zc = -w / 2;
    const wall = (z0, z1, y0, y1) => z1 - z0 > 0.01 && box(g, M.hWall, { x: wx, y: y0, z: (z0 + z1) / 2, w: T, d: z1 - z0, h: y1 - y0 });
    ops.forEach((o) => {
      const z0 = o.z - o.w / 2, z1 = o.z + o.w / 2;
      wall(zc, z0, 0, h); wall(z0, z1, 0, o.y0); wall(z0, z1, o.y1, h); zc = z1;
      const gp = new THREE.Mesh(new THREE.PlaneGeometry(o.w, o.y1 - o.y0), glassMat);
      gp.rotation.y = Math.PI / 2; gp.position.set(depth - 0.1, (o.y0 + o.y1) / 2, o.z); g.add(gp);
      box(g, M.frame, { x: depth - 0.1, y: o.y0, z: o.z, w: 0.12, d: 0.12, h: o.y1 - o.y0 });   // 가운데 창틀
    });
    wall(zc, w / 2, 0, h);
  } else {
    const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h - 0.2), glassMat);
    front.rotation.y = Math.PI / 2; front.position.set(depth, (h - 0.2) / 2, 0); g.add(front);
    [-1, 1].forEach((s) => { const side = new THREE.Mesh(new THREE.PlaneGeometry(depth, h - 0.2), glassMat); side.position.set(depth / 2, (h - 0.2) / 2, (s * w) / 2); g.add(side); });
    for (let k = 0; k <= 6; k++) box(g, M.frame, { x: depth, y: 0, z: -w / 2 + (k * w) / 6, w: 0.18, d: 0.18, h: h - 0.2 });
  }
  // 안쪽 조명과 바깥으로 번지는 빛
  const light = new THREE.PointLight("#d9f2ff", 0, 26, 2); light.position.set(depth * 0.6, h - 0.8, 0); g.add(light);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: M.glowTex, color: "#9fe9ff", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  halo.scale.set(w * 1.35, h * 2.2, 1); halo.position.set(depth + 1.5, h / 2, 0); g.add(halo);
  // 책상 두 줄
  [-w / 4, w / 4].forEach((zz) => box(g, M.std("#e8e4dc"), { x: openings ? depth * 0.3 : depth * 0.55, y: 0, z: zz, w: 1.6, d: w / 2 - 1.5, h: 0.75 }));
  const anchor = openings ? new THREE.Vector3(depth * 0.62, 0, openings[0].z) : new THREE.Vector3(depth * 0.55, 0, 0);
  parent.updateWorldMatrix(true, true);
  return { group: g, back, glass: glassMat, light, halo, anchor: g.localToWorld(anchor.clone()), floorY: 0, width: w, depth };
}

// ───────── 경기북과학고(학교 캠퍼스 맵·3D 배치도·항공사진·정면 사진을 보고 옮긴 배치) ─────────
// 로컬 좌표: +z = 남쪽(정문·운동장 쪽), 1 단위 ≈ 1 m. 캠퍼스 맵 1px ≈ 0.5 m.
// 앞쪽 흙 운동장, 그 북쪽에 동서로 긴 본관(5층), 본관 뒤 왼쪽 일반강의동·오른쪽 과학실험동(천문대 돔 2개),
// 서쪽에 남학생기숙사(ㄷ자)·여학생기숙사(ㄱ자), 운동장 왼쪽에 다목적동. 본관·뒤쪽 건물은 2 m 높은 단 위에 있다.
export function buildGBS(root, M, W, anchors) {
  const g = new THREE.Group(); g.name = "gbs"; g.position.set(GBS.x + 15, 0, GBS.z + 10); root.add(g);
  const FH = 3.8, UP = 2;
  // 바닥·도로·나무
  flat(g, M.plaza, polyGeo([[-112, 94], [84, 94], [84, -116], [-112, -116]]), 0.02);
  const loop = [[-108, 92], [-108, -113], [79, -113], [79, 92], [-108, 92]];
  flat(g, M.road, ribbonGeo(loop, 7), 0.05);
  flat(g, M.road, ribbonGeo([[79, 92], [110, 112], [190, 150]], 8), 0.05);           // 정문(남동쪽)
  roadsideTrees(g, loop, [-14, -10], 6);
  roadsideTrees(g, [[-50, 22], [-50, 78]], [0, 50], 3);                               // 운동장 서쪽 나무 줄
  // 단(본관·강의동·실험동·기숙사가 올라앉은 높이 2 m의 판)
  box(g, M.plaza, { x: -15, y: 0, z: -57, w: 182, d: 108, h: UP });
  // 흙 운동장
  const fg = new THREE.PlaneGeometry(112, 58); fg.rotateX(-Math.PI / 2);
  flat(g, M.dirt, fg, 0.06).position.set(17.5, 0.06, 49);
  [-1, 1].forEach((s) => box(g, M.frame, { x: 17.5 + s * 52, z: 49, w: 1.2, d: 7.3, h: 2.4 }));   // 골대 자리

  // 본관: 왼쪽 석재 탑 + 가운데 청록 유리(2~4층) + 금색 기둥 퍼골라(5층은 기둥만) + 오른쪽 유리 날개
  const bg = new THREE.Group(); bg.position.set(12.5, UP, -12); g.add(bg);
  const D = 18, H5 = FH * 5;
  box(bg, M.gStone, { x: -39.75, w: 15.5, d: D, h: H5 + 1.4 });
  box(bg, M.gRoofGreen, { x: -39.75, y: H5 + 1.4, w: 15.9, d: D + 0.4, h: 0.3 });
  W.box(bg, { x: -39.75, w: 15.5, d: D, floors: 5, fh: FH, faces: ["+z", "-z", "-x"], group: "gbs-class", spacing: 3.4 });
  box(bg, M.gWall, { x: -7, w: 50, d: D, h: FH * 4 });
  box(bg, M.gGlass(50, 3), { x: -7, y: FH, z: D / 2 + 0.2, w: 50, d: 0.4, h: FH * 3 });
  W.box(bg, { x: -7, w: 50, d: D, floors: 1, fh: FH, faces: ["+z"], group: "gbs-class", spacing: 4.2 });
  W.box(bg, { x: -7, w: 50, d: D, floors: 4, fh: FH, faces: ["-z"], group: "gbs-class" });
  box(bg, M.gWall2, { x: -21, y: FH * 4, w: 22, d: D, h: FH + 0.6 });                // 5층 왼쪽(학교 이름 띠)
  box(bg, M.gSign, { x: -21, y: FH * 4 + 1.2, z: D / 2 + 0.05, w: 18, d: 0.1, h: 1.6 });
  box(bg, M.gWall2, { x: 4, y: FH * 4, z: -3.5, w: 28, d: 11, h: FH });               // 5층 오른쪽은 뒤로 물러남
  box(bg, M.gRoofGreen, { x: -7, y: FH * 4, w: 50.2, d: D + 0.2, h: 0.25 });
  W.box(bg, { x: -21, y0: FH * 4, w: 22, d: D, floors: 1, fh: FH, faces: ["+z", "-z"], group: "gbs-class", spacing: 3.4 });
  W.box(bg, { x: 4, y0: FH * 4, z: -3.5, w: 28, d: 11, floors: 1, fh: FH, faces: ["+z"], group: "gbs-class", spacing: 3.4 });
  for (let k = 0; k < 7; k++) {                                                        // 금색 기둥 7개 + 위 보
    const x = -10 + (k * 28) / 6;
    box(bg, M.gold, { x, z: D / 2 + 0.7, w: 0.9, d: 0.9, h: H5 + 1.2 });
    box(bg, M.gold, { x, y: H5 + 0.6, z: 3.1, w: 0.5, d: 12.6, h: 0.6 });
  }
  box(bg, M.gold, { x: 4, y: H5 + 0.4, z: D / 2 + 0.7, w: 29, d: 1, h: 0.9 });
  box(bg, M.gPanel, { x: 32.75, w: 29.5, d: D, h: FH * 2 });                          // 오른쪽 날개: 아래 회색 판넬
  box(bg, M.gGlass(29.5, 3), { x: 32.75, y: FH * 2, w: 29.5, d: D, h: FH * 3 + 0.4 });
  box(bg, M.gRoofGreen, { x: 32.75, y: FH * 5 + 0.4, w: 29.9, d: D + 0.4, h: 0.3 });
  W.box(bg, { x: 32.75, w: 29.5, d: D, floors: 2, fh: FH, faces: ["+z", "+x"], group: "gbs-class", spacing: 4.4 });
  // 운동장 쪽 계단식 화단 스탠드
  for (let k = 0; k < 4; k++) {
    box(g, M.step, { x: 12.5, y: 0, z: -2.5 + k * 3, w: 95, d: 3, h: UP - k * 0.5 });
    if (k % 2) box(g, M.hedge, { x: 12.5, y: UP - k * 0.5, z: -2.5 + k * 3 - 0.8, w: 80, d: 1, h: 0.55 });
  }
  // 주황 지붕 캐노피(오른쪽 앞) + 흰 계단실
  box(g, M.orange, { x: 27, y: 3.6, z: 10, w: 11, d: 7, h: 0.35 });
  [[-5, -3], [5, -3], [-5, 3], [5, 3]].forEach(([dx, dz]) => box(g, M.frame, { x: 27 + dx, z: 10 + dz, w: 0.25, d: 0.25, h: 3.6 }));
  box(g, M.frame, { x: 27, z: 11, w: 6, d: 3.5, h: 2.4 });

  // 일반강의동(본관 뒤 왼쪽, 4층) — 정보 2실은 동쪽 면 3층(가운데 창 셋)으로 둔다
  const lg = new THREE.Group(); lg.position.set(-19, UP, -61); g.add(lg);
  box(lg, M.gWall3, { w: 22, d: 47, h: FH * 4 });
  box(lg, M.gRoofGreen, { y: FH * 4, w: 22.4, d: 47.4, h: 0.3 });
  const info2 = (f, lz, y) => f === "+x" && Math.abs(lz) < 6 && y > FH * 2 && y < FH * 3;
  W.box(lg, { w: 22, d: 47, floors: 4, fh: FH, faces: ["+x", "-x", "+z", "-z"], group: "gbs-class", spacing: 3.4, skip: info2 });
  W.box(lg, { w: 22, d: 12, y0: FH * 2, floors: 1, fh: FH, faces: ["+x"], group: "room:gbs-info2", spacing: 3 });
  // 과학실험동(본관 뒤 오른쪽, 4층, 옥상에 천문대 돔 2개)
  const sg = new THREE.Group(); sg.position.set(31, UP, -61); g.add(sg);
  box(sg, M.gBrick, { w: 27, d: 47, h: FH * 4 });
  box(sg, M.gGlass(20, 3), { x: -13.7, y: FH, z: 6, w: 0.4, d: 20, h: FH * 3 });
  box(sg, M.gRoofGreen, { y: FH * 4, w: 27.4, d: 47.4, h: 0.3 });
  [[-4, -10], [5, 9]].forEach(([dx, dz]) => {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.8, 1.6, 20), M.dome); drum.position.set(dx, FH * 4 + 1.1, dz);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(3.8, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.dome); dome.position.set(dx, FH * 4 + 1.9, dz);
    drum.castShadow = dome.castShadow = true; sg.add(drum, dome);
  });
  W.box(sg, { w: 27, d: 47, floors: 4, fh: FH, faces: ["+x", "+z", "-z"], group: "gbs-class", spacing: 3.6 });
  W.box(sg, { w: 27, d: 47, floors: 1, fh: FH, faces: ["-x"], group: "gbs-class", spacing: 3.6 });

  // 기숙사: 남학생(ㄷ자, 6층), 여학생(ㄱ자, 5층)
  const dorm = (x, z, w, d, floors, faces) => {
    box(g, M.gDorm, { x, y: UP, z, w, d, h: floors * 3.2 });
    box(g, M.gRoofGreen, { x, y: UP + floors * 3.2, z, w: w + 0.4, d: d + 0.4, h: 0.3 });
    const o = new THREE.Group(); o.position.set(x, UP, z); g.add(o);
    W.box(o, { w, d, floors, fh: 3.2, faces, group: "gbs-dorm", spacing: 3.3 });
  };
  dorm(-96.25, -85, 12.5, 40, 6, ["+x", "-x"]);
  dorm(-80, -70, 45, 12, 6, ["+z", "-z"]);
  dorm(-63.5, -84, 12, 26, 6, ["+x", "-x"]);
  dorm(-78.75, -44.5, 42.5, 11, 5, ["+z", "-z"]);
  dorm(-94.5, -31, 11, 22, 5, ["+x", "-x"]);
  // 다목적동(운동장 왼쪽, 체육관·급식): 큰 회색 판넬 상자, 세로 홈
  const mg = new THREE.Group(); mg.position.set(-75, 0, 38.75); g.add(mg);
  box(mg, M.gGym, { w: 35, d: 52.5, h: 14 });
  box(mg, M.gGymRoof, { y: 14, w: 35.4, d: 52.9, h: 0.5 });
  for (let k = 0; k < 6; k++) box(mg, M.gSlot, { x: 17.6, y: 3, z: -20 + k * 8, w: 0.2, d: 1.2, h: 10 });
  W.box(mg, { w: 35, d: 52.5, floors: 1, fh: 3.4, faces: ["+x", "+z"], group: "other", spacing: 5 });

  g.updateWorldMatrix(true, true);
  anchors.gbs = bg.localToWorld(new THREE.Vector3(0, 8, 0));
  anchors["gbs-main"] = bg.localToWorld(new THREE.Vector3(0, 9, D / 2));
  anchors["gbs-field"] = g.localToWorld(new THREE.Vector3(17.5, 0, 49));
  anchors["gbs-info2"] = lg.localToWorld(new THREE.Vector3(11.2, FH * 2.5, 0));
  anchors["gbs-lab"] = anchors["gbs-info2"];
  anchors["gbs-info2-normal"] = new THREE.Vector3(1, 0, 0).applyQuaternion(g.quaternion);
  anchors["gbs-dorm"] = g.localToWorld(new THREE.Vector3(-80, 12, -70));
  // 정보 2실 불빛 번짐
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: M.glowTex, color: "#9fe9ff", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  halo.scale.set(11, 5.5, 1); halo.position.set(13.8, FH * 2.55, 0); lg.add(halo);
  return { group: g, info2Halo: halo };
}

// ───────── 지형·나무 ─────────
function buildTerrain(root, quality) {
  const SIZE = 3600, SEG = quality === "low" ? 110 : 150;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2); geo.translate(180, 0, 0);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  const cLow = C("#7d9a5c"), cMid = C("#47703d"), cHigh = C("#2f5631"), cFarm = C("#a39a6a"), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = heightAt(x, z);
    pos.setY(i, h);
    const n = vnoise(x * 0.02, z * 0.02);
    if (h < 3) tmp.copy(cLow).lerp(cFarm, smooth(0.45, 0.8, n) * 0.6);
    else tmp.copy(cMid).lerp(cHigh, smooth(20, 90, h)).lerp(cLow, (n - 0.5) * 0.25 + 0.05);
    col.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
  mesh.receiveShadow = true; root.add(mesh);

  // 나무: 낮은 원뿔 숲
  const N = 2600, r = rng(42);
  const tg = new THREE.ConeGeometry(1, 1, 6, 1); tg.translate(0, 0.5, 0);
  const trees = new THREE.InstancedMesh(tg, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 1 }), N);
  const M4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const tc1 = C("#2e5a30"), tc2 = C("#4d7d3e"), tc3 = C("#6b7f3a"), tcol = new THREE.Color();
  let k = 0;
  for (let tries = 0; k < N && tries < N * 8; tries++) {
    const x = 180 + (r() - 0.5) * 1700, z = (r() - 0.5) * 1500;
    const m = campusMask(x, z);
    const h = heightAt(x, z);
    if (m < 0.3 || h < 2.5) continue;
    if (vnoise(x * 0.012, z * 0.012) < 0.33) continue;   // 숲 사이 빈터
    const ht = 9 + r() * 9;
    p.set(x, h - 0.6, z); s.set(3 + r() * 2.5, ht, 3 + r() * 2.5); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6);
    trees.setMatrixAt(k, M4.compose(p, q, s));
    tcol.copy(tc1).lerp(r() < 0.5 ? tc2 : tc3, r() * 0.8);
    trees.setColorAt(k, tcol);
    k++;
  }
  trees.count = k; trees.userData.full = k;
  trees.castShadow = true; trees.receiveShadow = true;
  root.add(trees);
  return { terrain: mesh, trees };
}

// ───────── 하늘·조명 열쇠틀(시각 → 색) ─────────
const KEYS = [
  [0, { top: "#060b18", hor: "#1d2946", bot: "#0b1220", hs: "#7086bd", hg: "#1d2531", hi: 0.9, sc: "#b4c6ee", si: 0.75, day: 0, star: 1 }],
  [4.6, { top: "#070d1c", hor: "#1d2946", bot: "#0b1220", hs: "#7086bd", hg: "#1d2531", hi: 0.9, sc: "#b4c6ee", si: 0.75, day: 0, star: 1 }],
  [5.6, { top: "#22305a", hor: "#e19a7b", bot: "#2a2f3a", hs: "#8d8fb8", hg: "#3a3a3a", hi: 0.8, sc: "#ffa37e", si: 0.9, day: 0.25, star: 0.3 }],
  [6.6, { top: "#4c78ba", hor: "#f5c8a2", bot: "#55595e", hs: "#a9c1e6", hg: "#55513f", hi: 1.15, sc: "#ffd3aa", si: 2.0, day: 0.75, star: 0 }],
  [8, { top: "#3a74c9", hor: "#cfe1f3", bot: "#6b7275", hs: "#bcd3ef", hg: "#5c5a45", hi: 1.4, sc: "#fff4e2", si: 3.0, day: 1, star: 0 }],
  [16.5, { top: "#3a74c9", hor: "#cfe1f3", bot: "#6b7275", hs: "#bcd3ef", hg: "#5c5a45", hi: 1.4, sc: "#fff4e2", si: 3.0, day: 1, star: 0 }],
  [18, { top: "#45679f", hor: "#f0ae80", bot: "#55565a", hs: "#a6b4d6", hg: "#4c463a", hi: 1.05, sc: "#ffb27a", si: 1.8, day: 0.6, star: 0 }],
  [19, { top: "#1b2a52", hor: "#b06866", bot: "#2a2c36", hs: "#7d86b3", hg: "#2a2830", hi: 0.75, sc: "#ff9470", si: 0.6, day: 0.18, star: 0.25 }],
  [20, { top: "#0e1837", hor: "#2e3763", bot: "#121726", hs: "#7385b5", hg: "#1f2430", hi: 0.9, sc: "#b4c6ee", si: 0.7, day: 0, star: 0.75 }],
  [21.5, { top: "#080e21", hor: "#1d2946", bot: "#0b1220", hs: "#7086bd", hg: "#1d2531", hi: 0.9, sc: "#b4c6ee", si: 0.75, day: 0, star: 1 }],
  [24, { top: "#060b18", hor: "#1d2946", bot: "#0b1220", hs: "#7086bd", hg: "#1d2531", hi: 0.9, sc: "#b4c6ee", si: 0.75, day: 0, star: 1 }],
];
function sampleKeys(hour) {
  const h = ((hour % 24) + 24) % 24;
  let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1][0] <= h) i++;
  const [h0, a] = KEYS[i], [h1, b] = KEYS[i + 1];
  const t = h1 > h0 ? clamp01((h - h0) / (h1 - h0)) : 0;
  const out = {};
  for (const k in a) out[k] = typeof a[k] === "string" ? C(a[k]).lerp(C(b[k]), t) : a[k] + (b[k] - a[k]) * t;
  return out;
}

// 시각에 따른 창문 그룹 기본값(0~1): 21시 전후로 교실은 꺼지고 생활관이 켜진다.
function autoOn(group, hour, h) {
  const hr = ((hour % 24) + 24) % 24;
  switch (group) {
    case "class": case "gbs-class": {
      if (hr < 7.4) return 0;
      if (h > 0.88) return 0;                                   // 늘 비어 있는 방
      return hr < 20.7 + h * 0.45 ? 1 : 0;                      // 야간 자율학습이 끝나면 차례로 꺼진다
    }
    case "dorm": case "gbs-dorm": {
      if (hr >= 0.2 && hr < 6.4) return 0;
      if (hr >= 6.4 && hr < 8) return h < 0.5 ? 1 : 0;
      const base = h < 0.18 ? 1 : 0;
      return hr >= 21 + h * 0.55 || hr < 0.2 ? (h < 0.86 ? 1 : 0) : base;
    }
    case "lounge": return hr >= 18 || hr < 0.2 ? 1 : 0;
    case "room:gbs-info2": return hr >= 18 || hr < 0.5 ? 1 : 0;      // 밤에 켜진 정보 2실
    default: return hr >= 7.5 && hr < 22.5 && h < 0.35 ? 1 : 0;
  }
}
const ON_COLOR = { class: C("#ffe8ad"), "gbs-class": C("#ffe8ad"), dorm: C("#ffc878"), "gbs-dorm": C("#ffc878"), "room:gbs-info2": C("#c8f5ff"), lounge: C("#dff6ff"), other: C("#ffd894") };

// ───────── 샷(카메라 구도) ─────────
function orbit(t, az, el, dist) {
  const a = az * DEG, e = el * DEG;
  return new THREE.Vector3(t.x + Math.sin(a) * Math.cos(e) * dist, t.y + Math.sin(e) * dist, t.z + Math.cos(a) * Math.cos(e) * dist);
}

// ───────── 본체 ─────────
export async function createWorld(container, opts = {}) {
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  } catch (e) {
    console.warn("[world] WebGL을 쓸 수 없어 3D 층을 끕니다.", e);
    container.classList.add("no-webgl");
    return stubWorld();
  }
  let quality = opts.quality || "high";
  const dpr = () => Math.min(window.devicePixelRatio || 1, quality === "min" ? 0.7 : quality === "low" ? 1 : 1.5);
  renderer.setPixelRatio(dpr());
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.className = "world-canvas";
  Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", display: "block" });
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.5, 14000);
  scene.fog = new THREE.Fog("#152038", 400, 3000);

  // 하늘(카메라를 따라다니는 큰 구) + 별
  const skyU = { top: { value: C("#000") }, horizon: { value: C("#000") }, bottom: { value: C("#000") } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(6000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
    fragmentShader: "uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(horizon, top, pow(min(1.0, h * 2.2), 0.65)) : mix(horizon, bottom, min(1.0, -h * 6.0)); gl_FragColor = vec4(c, 1.0); \n#include <colorspace_fragment>\n }",
  }));
  sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
  const starGeo = new THREE.BufferGeometry(), sr = rng(3), sp = [];
  for (let i = 0; i < 900; i++) {
    const u = sr() * Math.PI * 2, v = 0.06 + sr() * 0.94;
    const y = v, rr = Math.sqrt(1 - y * y);
    sp.push(Math.cos(u) * rr * 5500, y * 5500, Math.sin(u) * rr * 5500);
  }
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: "#dfe8ff", size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  stars.frustumCulled = false; scene.add(stars);

  const hemi = new THREE.HemisphereLight("#fff", "#444", 1); scene.add(hemi);
  const sun = new THREE.DirectionalLight("#fff", 2);
  sun.castShadow = quality !== "low";
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -280, right: 280, top: 280, bottom: -280, near: 10, far: 1600 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.6;
  scene.add(sun, sun.target);

  // 모형
  const M = makeMaterials();
  const W = new Windows();
  const anchors = {};
  const root = new THREE.Group(); scene.add(root);
  const { trees } = buildTerrain(root, quality);
  const hanmin = buildHanmin(root, M, W, anchors);
  const gbs = buildGBS(root, M, W, anchors);
  const winMesh = W.build(root);

  // 위치 표지(지도 샷용 빛기둥)
  const beacons = new THREE.Group(); beacons.visible = false; scene.add(beacons);
  const beam = (pos, color) => {
    const b = new THREE.Group(); b.position.set(pos.x, 0, pos.z);
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false });
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(5, 9, 360, 20, 1, true), m); cyl.position.y = 180; b.add(cyl);
    const ring = new THREE.Mesh(new THREE.RingGeometry(40, 46, 48), m.clone()); ring.rotation.x = -Math.PI / 2; ring.position.y = 1.5; ring.material.opacity = 0.8; b.add(ring);
    beacons.add(b); return b;
  };
  const beaconH = beam(anchors.hanmin, "#38c2b2"), beaconG = beam(anchors.gbs, "#9a8cff");

  // 샷 정의(16:9 기준). split 모드처럼 화면이 좁으면 자동으로 뒤로 물러난다.
  const lounge = anchors.lounge.clone();
  const nH = new THREE.Vector3(Math.cos(A), 0, -Math.sin(A));   // 교사동 운동장 쪽 법선
  const uH = new THREE.Vector3(Math.sin(A), 0, Math.cos(A));    // 교사동 축(남남동)
  const labA = anchors["gbs-info2"], labN = anchors["gbs-info2-normal"];
  const mid = new THREE.Vector3((anchors.hanmin.x + anchors.gbs.x) / 2, 0, 20);
  const SHOTS = {
    "dawn-both": () => ({ target: new THREE.Vector3(mid.x, 18, mid.z - 20), pos: orbit(new THREE.Vector3(mid.x, 18, mid.z - 20), 0, 14, 640), fov: 38 }),
    "hanmin-wide": () => { const t = new THREE.Vector3(-40, 30, 4); return { target: t, pos: orbit(t, 98, 12, 400), fov: 36 }; },
    "hanmin-se": () => { const t = new THREE.Vector3(-20, 8, 30); return { target: t, pos: orbit(t, 52, 26, 340), fov: 34 }; },
    "hanmin-lounge": () => {
      const t = lounge.clone().add(new THREE.Vector3(0, 2, 0)).addScaledVector(nH, 2.5);
      return { target: t, pos: t.clone().addScaledVector(nH, 30).addScaledVector(uH, 7).add(new THREE.Vector3(0, 2.5, 0)), fov: 34, tight: true };
    },
    "gbs-wide": () => { const t = anchors["gbs-field"].clone().add(new THREE.Vector3(-14, 6, -40)); return { target: t, pos: orbit(t, 14, 30, 290), fov: 34 }; },
    "gbs-front": () => { const t = anchors["gbs-main"].clone().add(new THREE.Vector3(0, 1, 0)); return { target: t, pos: orbit(t, 8, 7, 120), fov: 38 }; },
    "gbs-info2": () => {
      const t = labA.clone().addScaledVector(labN, 1);
      return { target: t, pos: t.clone().addScaledVector(labN, 34).add(new THREE.Vector3(0, 20, 20)), fov: 34, tight: true };
    },
    "both-top": () => { const t = new THREE.Vector3(mid.x - 10, 0, mid.z); return { target: t, pos: new THREE.Vector3(mid.x - 10, 820, mid.z + 300), fov: 34 }; },
    "top-down": () => { const t = new THREE.Vector3(-34, 0, 0); return { target: t, pos: new THREE.Vector3(-34, 640, 90), fov: 36 }; },
    "map": () => { const t = new THREE.Vector3(mid.x, 0, mid.z); return { target: t, pos: new THREE.Vector3(mid.x, 1700, mid.z + 420), fov: 30 }; },
  };

  let mode = opts.mode || "split";
  let shotName = "hanmin-wide";
  const cam = { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 36 };
  let tween = null;
  // 초점 영역: 캔버스는 무대 전체(1600)를 덮고, 피사체는 이 영역 가운데에 오게 한다.
  const focus = { cx: null, w: null, cur: null };
  const framed = (name) => {
    const s = (SHOTS[name] || SHOTS["hanmin-wide"])();
    const aspect = focus.w && H0 ? focus.w / H0 : (camera.aspect || 16 / 9);
    if (aspect < 16 / 9 - 0.01) {
      const k = Math.min(2.1, Math.pow((16 / 9) / aspect, s.tight ? 0.55 : 0.8));
      s.pos = s.target.clone().add(s.pos.clone().sub(s.target).multiplyScalar(k));
    }
    return s;
  };
  function setPose(p) { cam.pos.copy(p.pos); cam.target.copy(p.target); cam.fov = p.fov; dirty = true; }
  function setFrame(cx, w, o = {}) {
    focus.cx = cx; focus.w = w;
    if (focus.cur == null || o.instant || reduced) focus.cur = cx;
    const to = framed(shotName);
    if (tween) tween.to = to; else if (o.instant || reduced) setPose(to); else tween = { from: { pos: cam.pos.clone(), target: cam.target.clone(), fov: cam.fov }, to, t0: performance.now(), dur: 900 };
    dirty = true; kick();
  }
  // 지금 카메라에서 그 샷까지의 이동 거리(긴 이동이면 장면 내용을 도착 무렵에 띄우는 데 쓴다)
  function travel(name) {
    if (name === "gbs-lab") name = "gbs-info2";
    if (!SHOTS[name]) return 0;
    const to = framed(name);
    return cam.pos.distanceTo(to.pos) + cam.target.distanceTo(to.target);
  }
  function setShot(name, o = {}) {
    if (name === "gbs-lab") name = "gbs-info2";
    if (!SHOTS[name]) { console.warn(`[world] 모르는 샷: ${name}`); return; }
    shotName = name;
    const to = framed(name);
    if (o.instant || reduced) { tween = null; setPose(to); return; }
    tween = { from: { pos: cam.pos.clone(), target: cam.target.clone(), fov: cam.fov }, to, t0: performance.now(), dur: o.duration ?? 2200 };
    kick();
  }

  // 시간
  let hour = 21, timeTween = null;
  const overrides = {};
  const offNight = C("#0c1322"), offDay = C("#7f97ad"), tmpC = new THREE.Color();
  function applyTime() {
    const k = sampleKeys(hour);
    skyU.top.value.copy(k.top); skyU.horizon.value.copy(k.hor); skyU.bottom.value.copy(k.bot);
    scene.fog.color.copy(k.hor);
    hemi.color.copy(k.hs); hemi.groundColor.copy(k.hg); hemi.intensity = k.hi;
    sun.color.copy(k.sc); sun.intensity = k.si;
    const hr = ((hour % 24) + 24) % 24;
    const isSun = hr > 5.2 && hr < 18.8;
    if (isSun) { const f = ((hr - 6) / 12) * Math.PI; sunDir.set(Math.cos(f), Math.max(0.12, Math.sin(f) * 0.95 + 0.1), Math.sin(f) * 0.55 + 0.35).normalize(); }
    else sunDir.set(-0.35, 0.8, 0.45).normalize();
    stars.material.opacity = k.star * 0.9;
    const day = k.day;
    const off = offNight.clone().lerp(offDay, day);
    W.items.forEach((it, i) => {
      const ov = overrides[it.group];
      let on = ov == null ? autoOn(it.group, hour, it.h) : typeof ov === "number" ? (it.h < ov ? 1 : 0) : ov ? 1 : 0;
      tmpC.copy(off).lerp(ON_COLOR[it.group] || ON_COLOR.other, on * (1 - 0.82 * day));
      winMesh.setColorAt(i, tmpC);
    });
    winMesh.instanceColor.needsUpdate = true;
    const lov = overrides.lounge;
    const lOn = lov == null ? autoOn("lounge", hour, 0) : Number(lov === true ? 1 : lov || 0);
    const lit = lOn * (1 - 0.7 * day);
    hanmin.lounge.back.material.color.copy(C("#101826")).lerp(C("#dff6ff"), lit);
    hanmin.lounge.light.intensity = lit * 260;
    // 꺼지면 유리 너머 방 벽이 바깥벽과 같은 색이라 창이 없어 보인다 → 다른 꺼진 창처럼 어두운 유리로
    hanmin.lounge.glass.color.copy(off).lerp(C("#a8d8ff"), lOn);
    hanmin.lounge.glass.opacity = 0.16 + 0.74 * (1 - lOn);
    hanmin.lounge.halo.material.opacity = lOn * (1 - day) * 0.6;
    const iov = overrides["room:gbs-info2"];
    const iOn = iov == null ? autoOn("room:gbs-info2", hour, 0) : Number(iov === true ? 1 : iov || 0);
    gbs.info2Halo.material.opacity = iOn * (1 - day) * 0.75;
    dirty = true;
  }
  const sunDir = new THREE.Vector3(0, 1, 0);
  function setTime(h, o = {}) {
    if (o.duration && !reduced) { timeTween = { from: hour, to: h, t0: performance.now(), dur: o.duration }; kick(); return; }
    timeTween = null; hour = h; applyTime(); kick();
  }
  // 방 하나(창 몇 개)만 따로 켜고 끈다: setRoom("gbs-info2", false), setRoom("hanmin-lounge", true), null이면 시각 기본값
  function setRoom(name, v) { setGroup(name === "hanmin-lounge" ? "lounge" : `room:${name}`, v); }
  function setGroup(name, v) { if (v == null) delete overrides[name]; else overrides[name] = v; applyTime(); kick(); }

  // 피규어(얼굴 없는 원기둥 + 구)
  const FIG = { teacher: "#1d8078", student: "#ece6d6", gbs: "#6557a5", ai: "#c98355", night: "#7fe3d6" };
  const figGeo = { body: new THREE.CylinderGeometry(0.27, 0.36, 1.15, 12), head: new THREE.SphereGeometry(0.23, 14, 10) };
  figGeo.body.translate(0, 0.575, 0); figGeo.head.translate(0, 1.43, 0);
  const figures = new Set();
  function addFigure(where = "lounge", kind = "student", o = {}) {
    const base = typeof where === "string" ? (anchors[where]?.clone() ?? new THREE.Vector3()) : new THREE.Vector3(...where);
    if (o.offset) base.add(new THREE.Vector3(...o.offset));
    const mat = new THREE.MeshStandardMaterial({ color: FIG[kind] || kind, roughness: 0.6, flatShading: false });
    if (o.glow) { mat.emissive.set(FIG[kind] || kind); mat.emissiveIntensity = o.glow; }
    const g = new THREE.Group();
    const b = new THREE.Mesh(figGeo.body, mat), hd = new THREE.Mesh(figGeo.head, mat);
    b.castShadow = hd.castShadow = true;
    g.add(b, hd); g.position.copy(base); g.scale.setScalar(o.scale || 1);
    scene.add(g); figures.add(g); dirty = true; kick();
    return {
      object: g,
      setColor: (c) => { mat.color.set(FIG[c] || c); dirty = true; kick(); },
      remove: () => { scene.remove(g); mat.dispose(); figures.delete(g); dirty = true; kick(); },
    };
  }
  function clearFigures() { [...figures].forEach((g) => { scene.remove(g); g.children[0].material.dispose(); }); figures.clear(); dirty = true; kick(); }

  function setBeacons(v) {
    const o = typeof v === "object" && v ? v : { hanmin: !!v, gbs: !!v };
    beaconH.visible = !!o.hanmin; beaconG.visible = !!o.gbs; beacons.visible = beaconH.visible || beaconG.visible;
    dirty = true; kick();
  }

  // 자유 탐색: 드래그로 돌리고 휠로 당긴다(Q&A 장면).
  const look = { yaw: 0, pitch: 0, zoom: 1, on: false, el: null, drag: null };
  const onDown = (e) => { if (!look.on) return; look.drag = { x: e.clientX, y: e.clientY, yaw: look.yaw, pitch: look.pitch }; e.preventDefault(); };
  const onMove = (e) => {
    if (!look.drag) return;
    look.yaw = look.drag.yaw - (e.clientX - look.drag.x) * 0.006;
    look.pitch = Math.max(-0.5, Math.min(0.6, look.drag.pitch + (e.clientY - look.drag.y) * 0.004));
    dirty = true; kick();
  };
  const onUp = () => { look.drag = null; };
  const onWheel = (e) => { if (!look.on) return; look.zoom = Math.max(0.35, Math.min(2.2, look.zoom * Math.exp(e.deltaY * 0.0012))); dirty = true; kick(); e.preventDefault(); };
  function setOrbit(on, el) {
    if (el && el !== look.el) {
      look.el?.removeEventListener("pointerdown", onDown); look.el?.removeEventListener("wheel", onWheel);
      look.el = el; el.addEventListener("pointerdown", onDown); el.addEventListener("wheel", onWheel, { passive: false });
      addEventListener("pointermove", onMove); addEventListener("pointerup", onUp);
    }
    look.on = !!on;
    if (!on) { look.yaw = 0; look.pitch = 0; look.zoom = 1; look.drag = null; }
    dirty = true; kick();
  }

  // 크기·모드·품질
  let W0 = 0, H0 = 0;
  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h || (w === W0 && h === H0)) return;
    W0 = w; H0 = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const to = framed(shotName);
    if (tween) tween.to = to; else setPose(to);
    dirty = true; kick();
  }
  const ro = new ResizeObserver(resize); ro.observe(container);
  function setMode(m) { mode = m; resize(); }
  function setQuality(q, manual) {
    if (manual) perf.auto = false;   // 손으로 바꾸면 자동 조절은 멈춘다
    quality = q === "min" || q === "low" ? q : "high";
    renderer.setPixelRatio(dpr());
    sun.castShadow = quality === "high";
    trees.count = quality !== "high" ? Math.floor(trees.userData.full * 0.55) : trees.userData.full;
    W0 = 0; resize(); dirty = true; kick();
  }

  // 렌더 루프: 보일 때만 돈다. 움직임이 없으면 다시 그리지 않는다.
  let active = true, inView = true, raf = 0, dirty = true, lastT = performance.now();
  const drift = () => quality === "high" && !reduced && opts.drift !== false;
  // 자동 화질: 연속으로 그린 프레임 간격이 평균 40ms(25fps)를 넘으면 한 단계씩 낮춘다(high → low → min). 다시 올리지는 않는다.
  const perf = { last: 0, cont: false, dts: [], auto: opts.autoQuality !== false };
  function watchPerf(now) {
    if (!perf.auto || quality === "min") return;
    const dt = now - perf.last, cont = perf.cont; perf.last = now;
    if (!cont || dt <= 0) return;               // 쉬었다가 다시 그린 첫 프레임은 빼고, 연속 프레임만 잰다
    perf.dts.push(dt);
    if (perf.dts.length < 45 && perf.dts.reduce((a, b) => a + b, 0) < 1500) return;
    const avg = perf.dts.reduce((a, b) => a + b, 0) / perf.dts.length; perf.dts.length = 0;
    if (avg > 40) { const next = quality === "high" ? "low" : "min"; setQuality(next); opts.onQuality?.(next, Math.round(1000 / avg)); }
  }
  const io = new IntersectionObserver((es) => { inView = es.some((e) => e.isIntersecting); kick(); });
  io.observe(container);
  const onVis = () => kick();
  document.addEventListener("visibilitychange", onVis);
  const frames = { n: 0, t0: performance.now() };
  const v = new THREE.Vector3();
  function frame(now) {
    raf = 0;
    if (!active || !inView || document.hidden) return;
    if (tween) {
      const t = clamp01((now - tween.t0) / tween.dur), e = ease(t);
      cam.pos.lerpVectors(tween.from.pos, tween.to.pos, e);
      // 높이가 크게 바뀌면 중간에 살짝 솟아오르는 길로
      const lift = Math.sin(Math.PI * e) * Math.min(160, tween.from.pos.distanceTo(tween.to.pos) * 0.12);
      cam.pos.y += lift;
      cam.target.lerpVectors(tween.from.target, tween.to.target, e);
      cam.fov = tween.from.fov + (tween.to.fov - tween.from.fov) * e;
      if (t >= 1) { setPose(tween.to); tween = null; }
      dirty = true;
    }
    if (timeTween) {
      const t = clamp01((now - timeTween.t0) / timeTween.dur);
      hour = timeTween.from + (timeTween.to - timeTween.from) * ease(t);
      applyTime();
      if (t >= 1) timeTween = null;
    }
    const drifting = drift() && !look.drag;
    let framing = false;
    if (focus.cx != null && focus.cur !== focus.cx) {
      const d0 = focus.cx - focus.cur;
      focus.cur = Math.abs(d0) < 0.5 ? focus.cx : focus.cur + d0 * 0.09;
      framing = true; dirty = true;
    }
    if (dirty || drifting) {
      if (focus.cur != null && W0 && Math.abs(focus.cur - W0 / 2) > 0.5) camera.setViewOffset(W0, H0, W0 / 2 - focus.cur, 0, W0, H0);
      else if (camera.view?.enabled) camera.clearViewOffset();
      v.copy(cam.pos).sub(cam.target);
      if (drifting) v.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.sin(now * 0.00011) * 0.018);
      if (look.on) {
        v.applyAxisAngle(new THREE.Vector3(0, 1, 0), look.yaw);
        const side = new THREE.Vector3(0, 1, 0).cross(v).normalize();
        v.applyAxisAngle(side, -look.pitch).multiplyScalar(look.zoom);
      }
      camera.position.copy(cam.target).add(v);
      camera.lookAt(cam.target);
      if (camera.fov !== cam.fov) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }
      sky.position.copy(camera.position); stars.position.copy(camera.position);
      const d = v.length();
      scene.fog.near = Math.max(160, d * 0.85); scene.fog.far = scene.fog.near + 1700 + d * 1.6;
      sun.target.position.copy(cam.target); sun.target.position.y = 0;
      sun.position.copy(sun.target.position).addScaledVector(sunDir, 700);
      const sh = Math.min(900, Math.max(160, d * 0.75));
      if (sun.shadow.camera.right !== sh) Object.assign(sun.shadow.camera, { left: -sh, right: sh, top: sh, bottom: -sh }), sun.shadow.camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      dirty = false;
      frames.n++;
      watchPerf(now);
    }
    lastT = now;
    if (tween || timeTween || drifting || framing || look.drag) raf = requestAnimationFrame(frame);
    perf.cont = !!raf;
  }
  function kick() { if (!raf && active && inView && !document.hidden) raf = requestAnimationFrame(frame); }
  function setActive(on) { active = !!on; if (active) { dirty = true; kick(); } }

  function screenPos(name) {
    const a = typeof name === "string" ? anchors[name] : new THREE.Vector3(...name);
    if (!a) return null;
    camera.updateMatrixWorld(); const p = a.clone().project(camera);
    return { x: ((p.x + 1) / 2) * W0, y: ((1 - p.y) / 2) * H0, visible: p.z < 1 && Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1 };
  }
  function stats() {
    const info = renderer.info.render;
    const el = (performance.now() - frames.t0) / 1000;
    return { triangles: info.triangles, calls: info.calls, windows: W.items.length, trees: trees.count, frames: frames.n, fps: el > 0 ? frames.n / el : 0 };
  }
  function resetFps() { frames.n = 0; frames.t0 = performance.now(); }
  function dispose() {
    active = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
    document.removeEventListener("visibilitychange", onVis);
    scene.traverse((o) => { o.geometry?.dispose?.(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach((mm) => { mm.map?.dispose?.(); mm.dispose?.(); }); });
    renderer.dispose(); canvas.remove();
  }

  resize();
  applyTime();
  setPose(framed(shotName));
  kick();

  return {
    ok: true,
    setShot, travel, setTime, setGroup, setRoom, setMode, setQuality, setActive, setBeacons, setFrame, setOrbit,
    addFigure, clearFigures, screenPos, resize, dispose, stats, resetFps,
    get shot() { return shotName; }, get time() { return hour; }, get mode() { return mode; }, get quality() { return quality; },
    shots: Object.keys(SHOTS), anchors: Object.keys(anchors).filter((k) => !k.endsWith("-normal")),
    _three: { THREE, scene, camera, renderer },
  };
}

function stubWorld() {
  const no = () => {};
  return { ok: false, setFrame: no, setOrbit: no, setShot: no, setTime: no, setGroup: no, setRoom: no, setMode: no, setQuality: no, setActive: no, setBeacons: no,
    addFigure: () => ({ object: null, setColor: no, remove: no }), clearFigures: no, screenPos: () => null, resize: no, dispose: no,
    stats: () => ({}), resetFps: no, shot: null, time: 21, mode: "split", shots: SHOT_NAMES, anchors: [] };
}
