/* 윷놀이 컴퓨터 — 잡기·업기·위험도를 따져서 한 수씩 고름 */
(function (root) {
  'use strict';
  var Y = root.YUT || (typeof require !== 'undefined' ? require('./engine.js') : null);

  function dist(cfg) {
    var p = Y.P_FLAT[cfg.prob] || 0.5, q = 1 - p, d = {};
    var k1 = 4 * p * q * q * q;
    d[5] = q * q * q * q;
    d[2] = 6 * p * p * q * q;
    d[3] = 4 * p * p * p * q;
    d[4] = p * p * p * p;
    if (cfg.backdo) { d[-1] = p * q * q * q; d[1] = k1 - d[-1]; } else d[1] = k1;
    var nk = cfg.nak || 0;
    for (var k in d) d[k] *= (1 - nk);
    return d;
  }

  // 상대들이 다음 차례에 이 칸에 올 확률(대충)
  function threatMap(s, me) {
    var D = dist(s.cfg), keys = Object.keys(D).map(Number), miss = {};
    function add(node, pr) { if (Y.onBoard(node)) miss[node] = (miss[node] === undefined ? 1 : miss[node]) * (1 - Math.min(pr, 0.95)); }
    s.pieces.forEach(function (arr, t) {
      if (t === me || s.ranks.indexOf(t) >= 0) return;
      var srcs = [], seen = {}, home = false;
      arr.forEach(function (p) {
        if (p.node === Y.HOME) { if (!home) { home = true; srcs.push(p); } }
        else if (Y.onBoard(p.node) && !seen[p.node]) { seen[p.node] = 1; srcs.push(p); }
      });
      srcs.forEach(function (p) {
        var reach = {};
        keys.forEach(function (v) {
          if (v < 0 && p.node === Y.HOME) return;
          var w = Y.walk(p.node, p.prev, v, s.cfg);
          reach[w.node] = (reach[w.node] || 0) + D[v];
          if (v === 4 || v === 5) {
            if (w.node === Y.DONE) return;
            keys.forEach(function (v2) {
              if (v2 < 0) return;
              var w2 = Y.walk(w.node, w.prev, v2, s.cfg);
              reach[w2.node] = (reach[w2.node] || 0) + D[v] * D[v2] * 0.8;
            });
          }
        });
        for (var n in reach) add(Number(n), reach[n]);
      });
    });
    var risk = {};
    for (var n2 in miss) risk[n2] = 1 - miss[n2];
    return risk;
  }

  function worth(rem) { return (22 - rem) + 5; }

  function score(s, m, risk) {
    var t = s.turn, P = s.pieces[t], c = m.group.length;
    var p0 = P[m.pid];
    var r0 = Y.remaining(p0.node, p0.prev);
    var r1 = m.finish ? 0 : Y.remaining(m.to, m.prev);
    var sc = (r0 - r1) * (1 + 0.6 * (c - 1));
    if (p0.node === Y.HOME && m.v > 0) sc -= 0.5; // 판 위 말을 먼저 쓰는 쪽이 대체로 나음
    // 잡기
    m.caught.forEach(function (cp) {
      var q = s.pieces[cp[0]][cp[1]];
      sc += worth(Y.remaining(q.node, q.prev)) + 6;
    });
    if (m.caught.length) sc += 7; // 한 번 더
    if (m.finish) sc += 4 * c;
    // 위험
    var valBefore = p0.node === Y.HOME ? 0 : c * worth(r0);
    var valAfter = m.finish ? 0 : (c + m.stack.length) * worth(r1);
    var rb = p0.node === Y.HOME ? 0 : (risk[p0.node] || 0);
    var ra = m.finish ? 0 : (risk[m.to] || 0);
    if (m.caught.length) ra *= 0.5; // 잡은 뒤 한 번 더 던지므로 달아날 기회
    sc += rb * valBefore * 0.9;      // 위험한 자리에서 빠져나옴
    sc -= ra * valAfter * 0.9;
    // 같은 칸의 다른 말들이 남겨지면 그대로 위험 — 이미 rb에 포함
    if (m.stack.length) sc += 1.5 * m.stack.length;
    return sc;
  }

  var LEVEL = { easy: { noise: 7, rand: 0.3 }, normal: { noise: 2, rand: 0.05 }, hard: { noise: 0, rand: 0 } };

  function choose(s, level, rng) {
    rng = rng || Math.random;
    var moves = Y.allMoves(s);
    if (!moves.length) return null;
    var L = LEVEL[level] || LEVEL.normal;
    if (rng() < L.rand) return moves[Math.floor(rng() * moves.length)];
    var risk = threatMap(s, s.turn), best = null, bs = -1e9;
    moves.forEach(function (m) {
      var sc = score(s, m, risk) + (rng() - 0.5) * 2 * L.noise;
      if (sc > bs) { bs = sc; best = m; }
    });
    return best;
  }

  var YAI = { choose: choose, threatMap: threatMap, dist: dist, score: score };
  if (typeof module !== 'undefined' && module.exports) module.exports = YAI; else root.YAI = YAI;
})(this);
