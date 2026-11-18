'use strict';
/** T-20: bộ câu hỏi estimate trong data/seed.json đúng yêu cầu B-02. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const seed = require(path.join(__dirname, '..', 'data', 'seed.json'));

const SET_ID = 'phieu-uoc-luong';

test('T-20: seed có bộ phieu-uoc-luong gắn bài học có sẵn, ≥ 12 câu estimate hợp lệ', () => {
  const set = seed.questionSets[SET_ID];
  assert.ok(set, `thiếu bộ ${SET_ID}`);
  assert.ok(seed.lessons.some(l => l.id === set.lessonId), `lessonId ${set.lessonId} không có trong lessons`);

  const estimates = set.questions.filter(q => q.type === 'estimate');
  assert.ok(estimates.length >= 12, `chỉ có ${estimates.length} câu estimate`);

  for (const q of estimates) {
    assert.match(q.correctAnswer, /^\d{1,6}$/, `${q.id}: đáp án phải là số nguyên không âm`);
    const m = /^(\d+) ([×:]) (\d+)$/.exec(q.prompt);
    assert.ok(m, `${q.id}: prompt "${q.prompt}" phải có dạng "a × b" hoặc "a : b"`);
    const [a, op, b] = [Number(m[1]), m[2], Number(m[3])];
    const n = op === '×' ? a * b : a / b;
    assert.ok(Number.isInteger(n), `${q.id}: phép chia ${q.prompt} phải chia hết`);
    assert.equal(String(n), q.correctAnswer, `${q.id}: đáp án không khớp phép tính ${q.prompt}`);
    assert.ok(n >= 49, `${q.id}: đáp án quá nhỏ khiến khoảng ±20% quá hẹp (ADR-002)`);
  }
});

test('id câu hỏi không trùng trên toàn bộ seed (bảng questions dùng id làm khóa chính)', () => {
  const ids = Object.values(seed.questionSets).flatMap(s => s.questions.map(q => q.id));
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(dupes, []);
});

test('tài khoản seed chỉ là tài khoản synthetic (B-11)', () => {
  for (const u of seed.users) {
    assert.match(u.username, /^(hocsinh\d{2}|giaovien\d{2})$/, `tài khoản lạ: ${u.username}`);
  }
});
