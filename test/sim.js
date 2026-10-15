// 컴퓨터끼리 대국: 끝나는지, 잘 두는 쪽이 이기는지
const Y = require('../src/engine.js');
const A = require('../src/ai.js');
function rng(seed) { let x = seed >>> 0 || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
function play(levels, cfg, seed) {
  const r = rng(seed);
  let s = Y.newGame(levels.map((l, i) => ({ name: 'P' + i })), cfg, seed % levels.length);
  let steps = 0, catches = 0, throws = 0;
  while (s.phase !== 'over') {
    if (++steps > 5000) throw new Error('끝나지 않음 ' + seed);
    if (s.phase === 'throw') { const t = Y.rollSticks(r, s.cfg); s = Y.apply(s, { type: 'throw', sticks: t.sticks, nak: t.nak }); throws++; }
    else {
      const lv = levels[s.turn];
      const m = lv === 'random' ? (() => { const a = Y.allMoves(s); return a[Math.floor(r() * a.length)]; })() : A.choose(s, lv, r);
      s = Y.apply(s, { type: 'move', ri: m.ri, pid: m.pid });
      if (s.last.some(e => e.k === 'move' && e.caught.length)) catches++;
    }
    // 불변식: 말 수, 남 = DONE
    s.pieces.forEach(a => { if (a.length !== s.cfg.pieces) throw new Error('말 수'); });
  }
  return { winner: s.winner, throws, catches };
}
function match(levels, cfg, n) {
  const w = levels.map(() => 0); let th = 0, ca = 0;
  for (let i = 1; i <= n; i++) { const g = play(levels, cfg, i * 7919); w[g.winner]++; th += g.throws; ca += g.catches; }
  console.log(levels.join(' vs '), JSON.stringify(cfg), '승:', w.join('/'), `평균 던지기 ${(th / n).toFixed(0)} 잡기 ${(ca / n).toFixed(1)}`);
}
const N = +process.argv[2] || 400;
match(['hard', 'random'], {}, N);
match(['random', 'hard'], {}, N);
match(['hard', 'easy'], {}, N);
match(['hard', 'normal'], {}, N);
match(['normal', 'normal', 'normal'], {}, N);
match(['hard', 'random', 'random', 'random'], { pieces: 4 }, N);
match(['hard', 'random'], { prob: 'real', backdo: false, freeOrder: false, nak: 0.05 }, N);
match(['hard', 'random'], { pieces: 2, landFinish: true, catchExtra: false }, N);
match(['hard', 'random'], { pieces: 5 }, N);
