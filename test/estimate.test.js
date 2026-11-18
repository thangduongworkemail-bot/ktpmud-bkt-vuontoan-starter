'use strict';
/**
 * Test đơn vị cho quy tắc chấm "Ước lượng trước khi tính đúng".
 * Mã T-xx khớp docs/Test_plan.md. Chạy: npm test  (hoặc node --test test/estimate.test.js)
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  ESTIMATE_TOLERANCE_PERCENT, OUTCOMES, FEEDBACK, parseAnswer, acceptRange, gradeEstimate,
} = require('../server/estimate');
const { gradeQuestion } = require('../server/grading');

/** 12 câu + ước lượng ví dụ ở docs/Test_plan.md mục 2: [n, lo, hi, ước lượng ví dụ]. */
const PLAN = [
  [228, 183, 273, 240], [235, 188, 282, 250], [248, 199, 297, 240], [133, 107, 159, 140],
  [159, 128, 190, 150], [112, 90, 134, 120], [426, 341, 511, 420], [420, 336, 504, 400],
  [49, 40, 58, 50], [52, 42, 62, 50], [61, 49, 73, 60], [71, 57, 85, 70],
];

test('hằng số sai số là 20% (ADR-002)', () => {
  assert.equal(ESTIMATE_TOLERANCE_PERCENT, 20);
});

test('khoảng khớp công thức số nguyên của ADR-002 với mọi n từ 0 đến 5000', () => {
  for (let n = 0; n <= 5000; n++) {
    assert.deepEqual(acceptRange(n), { lo: Math.floor((4 * n + 4) / 5), hi: Math.floor((6 * n) / 5) }, `n=${n}`);
  }
});

describe('Trường hợp bình thường', () => {
  test('T-01: n = 228 cho khoảng 183 – 273', () => {
    assert.deepEqual(acceptRange(228), { lo: 183, hi: 273 });
  });

  test('T-02: ước lượng 240, kết quả 228 → câu đúng', () => {
    const r = gradeEstimate('228', '240', '228');
    assert.equal(r.estimate.ok, true);
    assert.equal(r.exact.ok, true);
    assert.equal(r.correct, true);
  });

  test('T-03: 12 câu của bộ đề với ước lượng ví dụ đều hợp lý, khoảng đúng như bảng', () => {
    for (const [n, lo, hi, guess] of PLAN) {
      assert.deepEqual(acceptRange(n), { lo, hi }, `n=${n}`);
      assert.equal(gradeEstimate(String(n), String(guess), String(n)).correct, true, `n=${n}, ước lượng=${guess}`);
    }
  });

  test('T-04: cùng input chấm hai lần cho cùng kết quả (tất định)', () => {
    assert.deepEqual(gradeEstimate('228', '240', '229'), gradeEstimate('228', '240', '229'));
    assert.deepEqual(gradeEstimate('49', ' 50 ', '49'), gradeEstimate('49', ' 50 ', '49'));
  });

  test('ước lượng trùng đúng đáp án vẫn là ước lượng hợp lý', () => {
    assert.equal(gradeEstimate('228', '228', '228').correct, true);
  });
});

describe('Trường hợp biên', () => {
  test('T-05: ước lượng đúng bằng lo (183) → hợp lý', () => {
    assert.equal(gradeEstimate('228', '183', '228').estimate.ok, true);
  });
  test('T-06: ước lượng lo − 1 (182) → chưa hợp lý', () => {
    assert.equal(gradeEstimate('228', '182', '228').estimate.ok, false);
  });
  test('T-07: ước lượng đúng bằng hi (273) → hợp lý', () => {
    assert.equal(gradeEstimate('228', '273', '228').estimate.ok, true);
  });
  test('T-08: ước lượng hi + 1 (274) → chưa hợp lý', () => {
    assert.equal(gradeEstimate('228', '274', '228').estimate.ok, false);
  });
  test('T-09: n nhỏ nhất (49) và lớn nhất (426) của bộ câu hỏi', () => {
    assert.deepEqual(acceptRange(49), { lo: 40, hi: 58 });
    assert.deepEqual(acceptRange(426), { lo: 341, hi: 511 });
    for (const n of [49, 426]) {
      const { lo, hi } = acceptRange(n);
      assert.equal(gradeEstimate(String(n), String(lo - 1), String(n)).estimate.ok, false);
      assert.equal(gradeEstimate(String(n), String(lo), String(n)).estimate.ok, true);
      assert.equal(gradeEstimate(String(n), String(hi), String(n)).estimate.ok, true);
      assert.equal(gradeEstimate(String(n), String(hi + 1), String(n)).estimate.ok, false);
    }
  });
  test('đầu vào đúng 6 chữ số vẫn hợp lệ, khoảng trắng đầu cuối được bỏ', () => {
    assert.equal(parseAnswer('999999'), 999999);
    assert.equal(parseAnswer('  240 '), 240);
    assert.equal(parseAnswer('0'), 0);
  });
});

describe('Đầu vào không hợp lệ (R6)', () => {
  test('T-10: rỗng, null, undefined → không hợp lệ, không ném lỗi', () => {
    for (const v of ['', '   ', null, undefined]) {
      assert.equal(parseAnswer(v), null, `input=${JSON.stringify(v)}`);
      const r = gradeEstimate('228', v, v);
      assert.equal(r.estimate.valid, false);
      assert.equal(r.exact.valid, false);
      assert.equal(r.correct, false);
    }
  });
  test('T-11: chữ, số âm, thập phân, ký hiệu mũ, có khoảng trắng giữa → không hợp lệ', () => {
    for (const v of ['abc', '-5', '12.5', '12,5', '1e3', '12 3', '+12', '０１２', {}, [], true]) {
      assert.equal(parseAnswer(v), null, `input=${JSON.stringify(v)}`);
    }
  });
  test('T-12: 7 chữ số trở lên hoặc chuỗi rất dài → không hợp lệ', () => {
    assert.equal(parseAnswer('0000000'), null);
    assert.equal(parseAnswer('1234567'), null);
    assert.equal(parseAnswer('9'.repeat(10000)), null);
  });
  test('ước lượng không hợp lệ nhưng kết quả đúng → không tính đúng câu', () => {
    const r = gradeEstimate('228', '1e3', '228');
    assert.equal(r.estimate.valid, false);
    assert.equal(r.exact.ok, true);
    assert.equal(r.correct, false);
  });
  test('correct_answer hỏng trong DB → báo lỗi rõ ràng thay vì chấm sai im lặng', () => {
    assert.throws(() => gradeEstimate('12.5', '12', '12'), RangeError);
    assert.throws(() => acceptRange(-1), RangeError);
  });
});

describe('Phản hồi 4 trường hợp (R5, B-06)', () => {
  test('T-13: ước lượng hợp lý, kết quả đúng → trường hợp 1', () => {
    assert.equal(gradeEstimate('228', '240', '228').outcome, OUTCOMES.BOTH_OK);
  });
  test('T-14: ước lượng hợp lý, kết quả sai → trường hợp 2', () => {
    assert.equal(gradeEstimate('228', '240', '238').outcome, OUTCOMES.EXACT_WRONG);
  });
  test('T-15: ước lượng chưa hợp lý, kết quả đúng → trường hợp 3', () => {
    assert.equal(gradeEstimate('228', '100', '228').outcome, OUTCOMES.ESTIMATE_WRONG);
  });
  test('T-16: cả hai sai → trường hợp 4', () => {
    assert.equal(gradeEstimate('228', '100', '238').outcome, OUTCOMES.BOTH_WRONG);
  });
  test('4 trường hợp có 4 câu phản hồi khác nhau', () => {
    const messages = Object.values(OUTCOMES).map(o => FEEDBACK[o]);
    assert.equal(new Set(messages).size, 4);
    for (const m of messages) assert.ok(m && m.length > 0);
  });
});

describe('Chấm theo type (server/grading.js)', () => {
  test('T-17: 4 type cũ vẫn so sánh chuỗi chính xác sau trim + lowercase như trước', () => {
    const cases = [
      [{ id: 'mc', type: 'multiple-choice', correct_answer: 'B' }, ' b ', true],
      [{ id: 'mc', type: 'multiple-choice', correct_answer: 'B' }, 'C', false],
      [{ id: 'in', type: 'input', correct_answer: '9' }, '9', true],
      [{ id: 'in', type: 'input', correct_answer: '9' }, '09', false], // không so sánh số với type cũ
      [{ id: 'cp', type: 'compare', correct_answer: '=' }, '=', true],
      [{ id: 'cp', type: 'compare', correct_answer: '=' }, '<', false],
      [{ id: 'pt', type: 'paint', correct_answer: 'green' }, 'GREEN', true],
      [{ id: 'pt', type: 'paint', correct_answer: 'green' }, undefined, false],
    ];
    for (const [q, given, expected] of cases) {
      const r = gradeQuestion(q, { [q.id]: given });
      assert.deepEqual(r, { questionId: q.id, correct: expected, correctAnswer: q.correct_answer }, `${q.type} ← ${given}`);
    }
  });

  test('câu estimate đọc ước lượng ở khóa <id>__est và kết quả ở khóa <id> (ADR-003)', () => {
    const q = { id: 'uoc-luong-01', type: 'estimate', correct_answer: '228' };
    const r = gradeQuestion(q, { 'uoc-luong-01__est': '240', 'uoc-luong-01': '228' });
    assert.equal(r.correct, true);
    assert.equal(r.type, 'estimate');
    assert.deepEqual(r.acceptRange, { lo: 183, hi: 273 });
    assert.equal(gradeQuestion(q, { 'uoc-luong-01': '228' }).correct, false, 'thiếu ước lượng thì không tính đúng');
  });

  test('T-18: điểm theo ADR-004 — câu chỉ đúng khi cả hai bước đúng', () => {
    const qs = PLAN.slice(0, 4).map(([n], i) => ({ id: `q${i}`, type: 'estimate', correct_answer: String(n), points: 5 }));
    const answers = {
      q0__est: '240', q0: '228', // đúng cả hai
      q1__est: '250', q1: '999', // ước lượng đúng, tính sai
      q2__est: '10', q2: '248',  // ước lượng sai, tính đúng
      q3__est: '', q3: '',       // bỏ trống
    };
    let earned = 0, max = 0, correct = 0;
    for (const q of qs) {
      max += q.points;
      if (gradeQuestion(q, answers).correct) { earned += q.points; correct++; }
    }
    assert.equal(correct, 1);
    assert.equal(Math.round((earned / max) * 100), 25);
  });
});
