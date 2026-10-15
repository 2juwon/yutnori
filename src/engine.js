/* 윷놀이 규칙 엔진 — 상태는 JSON, apply로만 바뀜 */
(function (root) {
  'use strict';

  // ── 말판 ─────────────────────────────────────────────
  // 0 참먹이(출발·도착, 오른쪽 아래) → 1~4 오른쪽 위로 → 5 모(오른쪽 위 모서리)
  // → 6~9 위쪽 왼쪽으로 → 10 뒷모(왼쪽 위) → 11~14 왼쪽 아래로 → 15 찌모(왼쪽 아래)
  // → 16~19 아래쪽 오른쪽으로 → 0 참먹이
  // 지름길: 5 → 20 모도 → 21 모개 → 22 방 → 23 속윷 → 24 속모 → 15 찌모
  //         10 → 25 뒷모도 → 26 뒷모개 → 22 방 → 27 사려 → 28 안찌 → 0 참먹이
  var HOME = -1, DONE = 99;
  var NAMES = ['참먹이', '도', '개', '걸', '윷', '모', '뒷도', '뒷개', '뒷걸', '뒷윷', '뒷모',
    '찌도', '찌개', '찌걸', '찌윷', '찌모', '날도', '날개', '날걸', '날윷',
    '모도', '모개', '방', '속윷', '속모', '뒷모도', '뒷모개', '사려', '안찌'];
  var VAL_NAME = { '-1': '빽도', 1: '도', 2: '개', 3: '걸', 4: '윷', 5: '모' };

  // 한 칸 앞으로. first = 이번 이동의 첫 걸음(=그 자리에 멈춰 있었음)
  function next(cur, prev, first) {
    if (cur === 0) return DONE;            // 참먹이를 지나면 남
    if (first) {
      if (cur === 5) return 20;
      if (cur === 10) return 25;
      if (cur === 22) return 27;
    }
    if (cur >= 1 && cur <= 18) return cur + 1;
    if (cur === 19) return 0;
    switch (cur) {
      case 20: return 21;
      case 21: return 22;
      case 22: return prev === 26 ? 27 : 23;   // 지나갈 때는 곧게
      case 23: return 24;
      case 24: return 15;
      case 25: return 26;
      case 26: return 22;
      case 27: return 28;
      case 28: return 0;
    }
    throw new Error('bad node ' + cur);
  }

  // 뒤로 한 칸 간 뒤, 그 칸에서의 '왔던 쪽'
  function backPrev(to, from) {
    if (to === 0) return 19;
    if (to >= 1 && to <= 19) return to - 1;        // 찌모(15)도 찌윷(14) 쪽
    switch (to) {
      case 20: return 5;
      case 21: return 20;
      case 22: return from === 27 ? 26 : 21;        // 곧은 줄 방향
      case 23: return 22;
      case 24: return 23;
      case 25: return 10;
      case 26: return 25;
      case 27: return 22;
      case 28: return 27;
    }
    return 0;
  }

  // 말(무리) 하나를 v칸 움직인 결과 경로. {path:[노드...], node, prev}
  function walk(node, prev, v, cfg) {
    var path = [];
    if (v < 0) {
      // 빽도: 왔던 길로 한 칸
      var to = prev;
      path.push(to);
      return { path: path, node: to, prev: backPrev(to, node) };
    }
    var cur = node, p = prev;
    for (var i = 0; i < v; i++) {
      if (cur === HOME) { p = 0; cur = 1; path.push(1); continue; }
      var nx = next(cur, p, i === 0);
      if (nx === DONE) { path.push(DONE); return { path: path, node: DONE, prev: cur }; }
      p = cur; cur = nx;
      path.push(cur);
    }
    if (cfg && cfg.landFinish && cur === 0) { path.push(DONE); return { path: path, node: DONE, prev: 0 }; }
    return { path: path, node: cur, prev: p };
  }

  // 그 자리에 멈춘 상태에서 끝까지 남은 칸 수(가장 빠른 길 = 규칙대로 갈 때)
  function remaining(node, prev) {
    if (node === DONE) return 0;
    if (node === HOME) return 21;
    var n = 0, cur = node, p = prev, first = true;
    while (cur !== DONE && n < 40) { var nx = next(cur, p, first); first = false; p = cur; cur = nx; n++; }
    return n;
  }

  // ── 윷 던지기 ─────────────────────────────────────────
  // sticks[i] = true면 배(평평한 면)가 위. 0번 윷가락에 빽도 표시
  var P_FLAT = { half: 0.5, real: 1 / (1 + Math.PI / 2) };
  function rollSticks(rng, cfg) {
    var p = P_FLAT[cfg.prob] || 0.5, s = [];
    for (var i = 0; i < 4; i++) s.push(rng() < p);
    var nak = cfg.nak ? rng() < cfg.nak : false;
    return { sticks: s, nak: nak };
  }
  function valueOf(sticks, cfg) {
    var k = 0; for (var i = 0; i < 4; i++) if (sticks[i]) k++;
    if (k === 0) return 5;
    if (k === 1) return (cfg.backdo && sticks[0]) ? -1 : 1;
    return k; // 2 개, 3 걸, 4 윷
  }

  // ── 상태 ─────────────────────────────────────────────
  var DEFAULT_CFG = {
    pieces: 4,        // 한 편 말 수 (2~5)
    backdo: true,     // 빽도 있음
    nak: 0,           // 낙 확률 (0이면 없음)
    prob: 'half',     // 'half' 반반 / 'real' 진짜 윷(반원기둥)
    freeOrder: true,  // 나온 결과를 원하는 순서로 써도 됨
    landFinish: false,// 참먹이에 멈춰도 난 것으로 침
    catchExtra: true  // 잡으면 한 번 더 (빽도로 잡아도)
  };

  function newGame(teams, cfg, first) {
    var c = {}; for (var k in DEFAULT_CFG) c[k] = DEFAULT_CFG[k];
    if (cfg) for (var k2 in cfg) if (cfg[k2] !== undefined) c[k2] = cfg[k2];
    var pieces = teams.map(function () {
      var a = []; for (var i = 0; i < c.pieces; i++) a.push({ node: HOME, prev: 0 }); return a;
    });
    return {
      v: 1, cfg: c, teams: teams, pieces: pieces,
      turn: first || 0, phase: 'throw', throwsLeft: 1, pending: [],
      winner: -1, ranks: [], seq: 0, last: null
    };
  }

  function clone(s) { return JSON.parse(JSON.stringify(s)); }

  function onBoard(n) { return n !== HOME && n !== DONE; }

  // 무리(같은 칸의 내 말들). 대표 = 가장 앞 번호
  function groupOf(s, t, pid) {
    var n = s.pieces[t][pid].node, g = [];
    if (n === HOME) return [pid];
    s.pieces[t].forEach(function (p, i) { if (p.node === n) g.push(i); });
    return g;
  }

  // 이번 결과로 움직일 수 있는 말 목록
  function movesFor(s, ri) {
    var t = s.turn, v = s.pending[ri], out = [], seen = {}, homeDone = false;
    s.pieces[t].forEach(function (p, i) {
      if (p.node === DONE) return;
      if (p.node === HOME) {
        if (v < 0 || homeDone) return;
        homeDone = true;
      } else {
        if (seen[p.node]) return;
        seen[p.node] = 1;
      }
      out.push(describe(s, ri, i));
    });
    return out;
  }

  function describe(s, ri, pid) {
    var t = s.turn, v = s.pending[ri], p = s.pieces[t][pid];
    var g = groupOf(s, t, pid);
    var w = walk(p.node, p.prev, v, s.cfg);
    var caught = [], stack = [];
    if (onBoard(w.node)) {
      s.pieces.forEach(function (arr, tt) {
        arr.forEach(function (q, j) {
          if (q.node !== w.node) return;
          if (tt === t) { if (g.indexOf(j) < 0) stack.push(j); }
          else caught.push([tt, j]);
        });
      });
    }
    return { ri: ri, pid: pid, v: v, from: p.node, to: w.node, path: w.path, prev: w.prev,
      group: g, caught: caught, stack: stack, finish: w.node === DONE };
  }

  function allMoves(s) {
    if (s.phase !== 'move') return [];
    var out = [];
    for (var ri = 0; ri < s.pending.length; ri++) {
      if (!s.cfg.freeOrder && ri > 0) break;
      out = out.concat(movesFor(s, ri));
    }
    return out;
  }

  // 쓸 수 없는 결과(말판에 말이 없을 때 빽도) 버리기
  function prune(s, log) {
    var t = s.turn;
    var hasBoard = s.pieces[t].some(function (p) { return onBoard(p.node); });
    var kept = [];
    s.pending.forEach(function (v) {
      if (v < 0 && !hasBoard) { log.push({ k: 'waste', t: t, v: v }); return; }
      kept.push(v);
    });
    // 순서 고정이면 맨 앞이 못 쓰는 것만 버림 — 위에서 함께 처리됨
    s.pending = kept;
  }

  function nextTurn(s, log) {
    var n = s.teams.length;
    for (var i = 1; i <= n; i++) {
      var t = (s.turn + i) % n;
      if (s.ranks.indexOf(t) < 0) { s.turn = t; break; }
    }
    s.phase = 'throw'; s.throwsLeft = 1; s.pending = [];
    log.push({ k: 'turn', t: s.turn });
  }

  function settle(s, log) {
    // 던질 차례가 남았으면 던지기, 아니면 움직이기/다음 사람
    if (s.phase === 'over') return;
    if (s.throwsLeft > 0) { s.phase = 'throw'; return; }
    prune(s, log);
    if (s.pending.length === 0) { nextTurn(s, log); return; }
    s.phase = 'move';
  }

  // action: {type:'throw', sticks:[4], nak:bool} | {type:'move', ri, pid}
  function apply(state, a) {
    var s = clone(state), log = [];
    if (s.phase === 'over') throw new Error('게임이 끝났어요');
    if (a.type === 'throw') {
      if (s.phase !== 'throw' || s.throwsLeft <= 0) throw new Error('지금은 던질 차례가 아니에요');
      s.throwsLeft--;
      if (a.nak) {
        log.push({ k: 'nak', t: s.turn });
        // 낙: 이번 던지기는 무효. 이미 나온 윷·모 결과는 그대로 씀
      } else {
        var v = valueOf(a.sticks, s.cfg);
        s.pending.push(v);
        log.push({ k: 'throw', t: s.turn, v: v, sticks: a.sticks });
        if (v === 4 || v === 5) s.throwsLeft++;
      }
      settle(s, log);
    } else if (a.type === 'move') {
      if (s.phase !== 'move') throw new Error('지금은 말을 움직일 때가 아니에요');
      if (!s.cfg.freeOrder && a.ri !== 0) throw new Error('나온 순서대로 써야 해요');
      if (a.ri < 0 || a.ri >= s.pending.length) throw new Error('없는 결과예요');
      var t = s.turn, p = s.pieces[t][a.pid];
      if (!p || p.node === DONE) throw new Error('움직일 수 없는 말이에요');
      var v2 = s.pending[a.ri];
      if (v2 < 0 && p.node === HOME) throw new Error('빽도는 판 위의 말만');
      var m = describe(s, a.ri, a.pid);
      s.pending.splice(a.ri, 1);
      m.group.forEach(function (i) { s.pieces[t][i].node = m.to; s.pieces[t][i].prev = m.prev; });
      m.stack.forEach(function (i) { s.pieces[t][i].prev = m.prev; });
      m.caught.forEach(function (c) { s.pieces[c[0]][c[1]].node = HOME; s.pieces[c[0]][c[1]].prev = 0; });
      log.push({ k: 'move', t: t, v: v2, pid: a.pid, group: m.group, from: m.from, to: m.to, path: m.path,
        caught: m.caught, stack: m.stack, finish: m.finish });
      if (m.caught.length && (s.cfg.catchExtra || v2 > 0)) { s.throwsLeft++; log.push({ k: 'bonus', t: t }); }
      if (s.pieces[t].every(function (q) { return q.node === DONE; })) {
        s.ranks.push(t);
        if (s.winner < 0) s.winner = t;
        log.push({ k: 'win', t: t });
        s.phase = 'over'; s.pending = []; s.throwsLeft = 0;
      } else settle(s, log);
    } else throw new Error('알 수 없는 동작');
    s.seq++;
    s.last = log;
    return s;
  }

  function stats(s, t) {
    var home = 0, done = 0, board = 0;
    s.pieces[t].forEach(function (p) { if (p.node === HOME) home++; else if (p.node === DONE) done++; else board++; });
    return { home: home, done: done, board: board };
  }

  var YUT = {
    HOME: HOME, DONE: DONE, NAMES: NAMES, VAL_NAME: VAL_NAME, DEFAULT_CFG: DEFAULT_CFG,
    next: next, walk: walk, remaining: remaining, rollSticks: rollSticks, valueOf: valueOf,
    newGame: newGame, apply: apply, allMoves: allMoves, movesFor: movesFor, describe: describe,
    groupOf: groupOf, stats: stats, clone: clone, onBoard: onBoard, P_FLAT: P_FLAT
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = YUT; else root.YUT = YUT;
})(this);
