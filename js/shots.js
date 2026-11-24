// 샷 목록(감독 대본): 단계마다 3D 현장을 어떻게 비출지.
//   shot  : world.js의 카메라 샷 이름. 같은 샷이 이어지면 카메라는 그대로 있다(원테이크).
//   time  : 시각(0~24). 하루의 흐름이 이야기의 흐름이다.
//           새벽(제목) → 해 질 녘(두 학교, 계단) → 밤(라운지, 업무, ALPS, 결론) → 새벽(제안) → 밤의 라운지(엔딩)
//   rooms : 방 하나만 따로 켜고 끈다. { "hanmin-lounge": false } 등. 적지 않으면 시각 기본값.
//   dim   : 현장을 얼마나 어둡게 덮을지(0~1). 문서·도식이 주인공일 때 올린다.
//   blur  : 현장을 흐리게(px). 기록 장면에서 현장이 '뒤에서 대기'할 때.
//   orbit : 드래그로 돌려 보기(Q&A).
// 장면 모듈이 step()에서 ctx.world를 직접 움직여도 된다(예: 6-1 시간 흐름). 엔진이 먼저 이 표를 적용한다.
export const SHOTS = {
  "0-1": { dim: 1 },
  "0-2": { dim: 1 },

  "1-1": { shot: "dawn-both", time: 5.8, dim: 0.2 },
  "1-2": { shot: "dawn-both", time: 6.1, dim: 0.55, blur: 3 },

  "2-1": { shot: "dawn-both", time: 17.6, dim: 0.05 },
  "2-2": { shot: "both-top", time: 17.9, dim: 0.1 },
  "2-3": { shot: "both-top", time: 18.0, dim: 0.8, blur: 6 },

  "3-1": { shot: "hanmin-se", time: 18.2, dim: 0.78, blur: 7 },
  "3-2": { shot: "hanmin-se", time: 18.2, dim: 0.82, blur: 7 },

  "4-1": { shot: "gbs-front", time: 18.4, dim: 0.35 },
  "4-2": { shot: "hanmin-wide", time: 18.5, dim: 0.4, arrive: true },
  "4-3": { shot: "hanmin-wide", time: 18.5, dim: 0.45 },
  "4-4": { shot: "hanmin-wide", time: 18.5, dim: 0.45 },
  "4-5": { shot: "hanmin-wide", time: 18.6, dim: 0.45 },

  "5-1": { shot: "hanmin-wide", time: 19, dim: 0.82, blur: 7 },
  "5-2": { shot: "hanmin-wide", time: 19, dim: 0.85, blur: 7 },

  "6-1": { shot: "hanmin-lounge", time: 22, dim: 0.3 },
  "6-2": { shot: "hanmin-lounge", time: 22, dim: 0.7, blur: 4 },
  "6-3": { shot: "gbs-info2", time: 22, dim: 0.25, arrive: true },
  "6-4": { shot: "hanmin-wide", time: 19, dim: 0, arrive: true },   // 경기북에서 건너오는 긴 이동: 도착한 뒤 시계가 흐른다   // arrive: 카메라가 거의 도착했을 때 장면 내용과 실을 띄운다

  "7-1": { shot: "hanmin-wide", time: 22, dim: 0.62, arrive: true },
  "7-2": { shot: "hanmin-wide", time: 22, dim: 0.62 },
  // 7-3: 도착할 때까지 라운지는 켜져 있고, 기사 스크랩이 쌓인 뒤 장면(s07)이 불을 끈다
  "7-3": { shot: "hanmin-lounge", time: 22, rooms: { "hanmin-lounge": true }, dim: 0.2, arrive: true },
  "7-4": { shot: "hanmin-wide", time: 22, dim: 0.86, blur: 8 },

  "8-1": { shot: "gbs-info2", time: 22, dim: 0.15, arrive: true },
  "8-2": { shot: "gbs-wide", time: 22, dim: 0.78, blur: 5 },

  "9-1": { shot: "both-top", time: 22.5, dim: 0.6, arrive: true },
  "9-2": { shot: "both-top", time: 22.5, dim: 0.35 },
  "9-3": { shot: "both-top", time: 22.5, dim: 0.35 },

  "10-1": { shot: "map", time: 23, dim: 0.9, blur: 6 },

  "11-1": { shot: "hanmin-wide", time: 6.3, dim: 0.62, blur: 3 },
  "11-2": { shot: "hanmin-wide", time: 6.4, dim: 0.62, blur: 3 },
  "11-3": { shot: "hanmin-wide", time: 6.6, dim: 0.4 },

  "12-1": { shot: "hanmin-lounge", time: 22, dim: 0.15 },
  "12-2": { shot: "hanmin-lounge", time: 22, dim: 0.15 },
  "12-3": { shot: "hanmin-wide", time: 22, dim: 0.2, orbit: true },
};
