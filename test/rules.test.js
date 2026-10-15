const Y = require('../src/engine.js');
const A = require('../src/ai.js');
let pass = 0, fail = 0;
function eq(a, b, msg) {
  const ja = JSON.stringify(a), jb = JSON.stringify(b);
  if (ja === jb) pass++; else { fail++; console.log('FAIL', msg, '\n  got', ja, '\n  exp', jb); }
}
const W = (n, p, v, cfg) => Y.walk(n, p, v, cfg || {}).path;
const H = Y.HOME, D = Y.DONE;
// 막대: 값별 예시
const ST = { '-1': [1, 0, 0, 0], 1: [0, 1, 0, 0], 2: [1, 1, 0, 0], 3: [1, 1, 1, 0], 4: [1, 1, 1, 1], 5: [0, 0, 0, 0] };
const sticks = v => ST[v].map(Boolean);

// 1. 값 계산
eq(Y.valueOf(sticks(-1), { backdo: true }), -1, '빽도');
eq(Y.valueOf(sticks(-1), { backdo: false }), 1, '빽도 없으면 도');
eq([1, 2, 3, 4, 5].map(v => Y.valueOf(sticks(v), { backdo: true })), [1, 2, 3, 4, 5], '도개걸윷모');

// 2. 이동 경로
eq(W(H, 0, 1), [1], '출발 도');
eq(W(H, 0, 5), [1, 2, 3, 4, 5], '출발 모 → 모 자리');
eq(W(5, 4, 3), [20, 21, 22], '모에서 멈췄다 걸 → 방');
eq(W(4, 3, 3), [5, 6, 7], '모를 지나가면 바깥길');
eq(W(22, 21, 2), [27, 28], '방에 멈췄다가 → 사려·안찌 쪽');
eq(W(21, 20, 3), [22, 23, 24], '방을 지나가면 곧게(모도→속모)');
eq(W(26, 25, 3), [22, 27, 28], '뒷모개에서 방 지나 안찌');
eq(W(10, 9, 2), [25, 26], '뒷모에 멈췄다가 지름길');
eq(W(24, 23, 2), [15, 16], '속모에서 찌모 지나 날도');
eq(W(15, 14, 1), [16], '찌모에서는 그냥 날밭으로');
eq(W(19, 18, 1), [0], '날윷 도 → 참먹이에 멈춤(아직 안 남)');
eq(W(19, 18, 2), [0, D], '참먹이를 지나면 남');
eq(W(0, 19, 1), [D], '참먹이에 있던 말은 도만 나와도 남');
eq(W(28, 27, 1), [0], '안찌 → 참먹이');
eq(W(28, 27, 3), [0, D], '안찌에서 걸 → 남');
eq(W(19, 18, 1, { landFinish: true }), [0, D], '참먹이 멈춤=남 설정');
// 빽도
eq(W(1, 0, -1), [0], '도 자리에서 빽도 → 참먹이');
eq(Y.walk(1, 0, -1, {}).prev, 19, '빽도로 간 참먹이');
eq(W(20, 5, -1), [5], '모도에서 빽도 → 모');
eq(W(23, 22, -1), [22], '속윷에서 빽도 → 방');
eq(Y.walk(23, 22, -1, {}).prev, 21, '방으로 물러나면 곧은 줄(모개) 쪽이 뒤');
eq(W(22, 26, -1), [26], '뒷모개에서 온 말은 뒷모개로');
eq(W(15, 24, -1), [24], '속모에서 온 찌모 → 속모로');
eq(W(16, 15, -1), [15], '날도 → 찌모');
eq(Y.walk(16, 15, -1, {}).prev, 14, '찌모를 지나친 뒤 연속 빽도는 찌윷 쪽');

// 3. 남은 거리
eq(Y.remaining(H, 0), 21, '출발 전 21');
eq(Y.remaining(5, 4), 12, '모 자리 12');
eq(Y.remaining(10, 9), 7, '뒷모 자리 7');
eq(Y.remaining(22, 21), 4, '방 자리 4');
eq(Y.remaining(0, 19), 1, '참먹이 1');

// 4. 게임 흐름
const teams = [{ name: 'A' }, { name: 'B' }];
let s = Y.newGame(teams, { pieces: 2 });
const thr = v => { s = Y.apply(s, { type: 'throw', sticks: sticks(v) }); };
const mv = (ri, pid) => { s = Y.apply(s, { type: 'move', ri, pid }); };
thr(-1);
eq([s.turn, s.phase], [1, 'throw'], '말 없을 때 빽도 → 차례 넘어감');
thr(5); eq([s.phase, s.throwsLeft], ['throw', 1], '모 → 한 번 더');
thr(4); thr(2);
eq(s.pending, [5, 4, 2], '모·윷·개 모아 둠');
eq(s.phase, 'move', '이제 움직이기');
mv(2, 0); // 개 → 2
mv(0, 1); // 모 → 5
eq(s.pieces[1].map(p => p.node), [2, 5], '두 말 움직임');
mv(0, 0); // 윷: 2 → 6
eq(s.turn, 0, '다 쓰면 다음 차례');
// A: 걸 → 3
thr(3); mv(0, 0);
eq(s.pieces[0][0].node, 3, 'A 걸');
// B: 개 하나만 갖고 5(모) 자리에서 지름길 2 → 21? 대신 6에서 개 → 8
thr(1); // 도: 5 → 20 (모 자리에 멈춰 있었으니 지름길)
mv(0, 1);
eq(s.pieces[1][1].node, 20, '모 자리에서 도 → 모도');
// A: 개로 3 → 5 , 업기 테스트 위해 다른 말
thr(2); mv(0, 0);
eq(s.pieces[0][0].node, 5, 'A 모 자리');
// B: 빽도 → 20 → 5 : A를 잡음 + 한 번 더
thr(-1); mv(0, 1);
eq([s.pieces[1][1].node, s.pieces[0][0].node, s.turn, s.phase], [5, H, 1, 'throw'], '빽도로 잡고 한 번 더');
thr(1); // B 도 하나: 둘 중 고르기
eq(Y.allMoves(s).length, 2, '판 위 말 둘(출발 대기 없음)');
mv(0, 0); // 6 → 7
// A: 도로 출발
thr(1); mv(0, 0);
eq(s.pieces[0][0].node, 1, 'A 다시 출발');
// B: 업기 — 5 자리 말을 개 → 21, 그다음 7 말은... 업기 직접 확인
s = Y.newGame(teams, { pieces: 3 });
thr(2); mv(0, 0); // A0 → 2
thr(3); mv(0, 0); // B0 → 3
thr(2); mv(0, 1); // A1 → 2 업기
eq(s.pieces[0].map(p => p.node), [2, 2, H], 'A 업기');
thr(5); thr(1); mv(1, 1); // B: 도로 출발 1, 모는 B0 3 → 8
mv(0, 0);
thr(4); thr(3);
eq(Y.movesFor(s, 0).length, 2, '업은 말은 한 무리(무리+출발)');
mv(0, 0); // 윷: 2 → 6, 둘 다 감
eq(s.pieces[0].map(p => p.node), [6, 6, H], '업은 말 같이 이동');
mv(0, 0); // 걸: 6 → 9
thr(5); thr(5); thr(5); thr(2); // B 모모모개
mv(3, 1); // B1(1) 개 → 3
mv(0, 0); // B0 8 → 13? 8+5 = 13
mv(0, 0); // 13 → 18
mv(0, 1); // B1 3 → 8 ... not catching
eq(s.turn, 0, '');
// 끝내기
s = Y.newGame(teams, { pieces: 1 });
s.pieces[0][0] = { node: 19, prev: 18 };
thr(2); mv(0, 0);
eq([s.phase, s.winner], ['over', 0], '남아서 승리');

// 5. 순서 고정
s = Y.newGame(teams, { pieces: 2, freeOrder: false });
thr(4); thr(1);
let bad = false; try { mv(1, 0); } catch (e) { bad = true; }
eq(bad, true, '순서 고정이면 뒤 결과 먼저 못 씀');
eq(Y.allMoves(s).every(m => m.ri === 0), true, '순서 고정 이동 목록');

// 6. 낙
s = Y.newGame(teams, { pieces: 2, nak: 0.1 });
s = Y.apply(s, { type: 'throw', sticks: sticks(4) });
s = Y.apply(s, { type: 'throw', sticks: sticks(2), nak: true });
eq([s.phase, s.pending], ['move', [4]], '윷 다음 낙 → 윷만 씀');

// 7. 확률
const d = A.dist({ prob: 'half', backdo: true });
eq(Math.round((d[-1] + d[1] + d[2] + d[3] + d[4] + d[5]) * 1000), 1000, '확률 합 1');
eq(Math.round(d[-1] * 10000), 625, '빽도 1/16');

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
