'use strict';
/**
 * Test tích hợp qua HTTP (T-30, T-31, T-32 + hồi quy bộ đề cũ) trên một CSDL tạm,
 * không đụng data/vuon-toan.db. Dựng app giống server/index.js nhưng lắng nghe cổng ngẫu nhiên.
 * Đăng nhập bằng tài khoản synthetic hocsinh01 qua route /api/auth/login có sẵn (không sửa auth).
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const DB_FILE = path.join(os.tmpdir(), `vuon-toan-test-${process.pid}-${Date.now()}.db`);
process.env.DB_PATH = DB_FILE; // phải đặt trước khi require server/db.js

const express = require('express');
const db = require('../server/db');
const { attachUser } = require('../server/auth');
const api = require('../server/api');
const seed = require('../data/seed.json');

const SET_ID = 'phieu-uoc-luong';
let server, base, token;

async function call(method, url, body) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
}

before(async () => {
  const app = express();
  app.use(express.json({ limit: '256kb' }));
  app.use(attachUser(db));
  app.use('/api', api);
  await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
  const login = await call('POST', '/api/auth/login', { username: 'hocsinh01', password: '123456' });
  assert.equal(login.status, 200, JSON.stringify(login.data));
  token = login.data.token;
});

after(() => {
  server?.close();
  db.close();
  for (const f of [DB_FILE, `${DB_FILE}-wal`, `${DB_FILE}-shm`]) fs.rmSync(f, { force: true });
});

test('T-30: bộ phieu-uoc-luong xuất hiện trong bài học bai-10 của luồng học bình thường', async () => {
  const { status, data } = await call('GET', '/api/lessons');
  assert.equal(status, 200);
  const lesson = data.lessons.find(l => l.id === 'bai-10');
  assert.ok(lesson.questionSets.some(s => s.id === SET_ID));
  assert.equal(lesson.locked, false, 'hocsinh01 đã hoàn thành bai-9 trong seed nên bai-10 phải mở');
  // phiếu cũ vẫn đứng đầu để thẻ "Bài 10" ở trang chủ tiếp tục mở exercise.html như trước
  assert.equal(lesson.questionSets[0].id, 'phieu-bai-9-10');
});

test('T-31: API lấy câu hỏi không trả đáp án đúng hay khoảng chấp nhận', async () => {
  const { status, data } = await call('GET', `/api/question-sets/${SET_ID}/questions`);
  assert.equal(status, 200);
  assert.equal(data.questions.length, 12);
  for (const q of data.questions) {
    assert.equal(q.type, 'estimate');
    assert.deepEqual(Object.keys(q).filter(k => q[k] !== undefined).sort(), ['category', 'id', 'points', 'prompt', 'type']);
  }
  const raw = JSON.stringify(data);
  for (const q of seed.questionSets[SET_ID].questions) {
    assert.ok(!raw.includes(`"${q.correctAnswer}"`), `lộ đáp án ${q.correctAnswer}`);
  }
});

test('T-32 + B-06: nộp bài → server chấm, lưu attempts/progress, phân biệt 4 trường hợp', async () => {
  const answers = {
    'uoc-luong-01__est': '240', 'uoc-luong-01': '228', // đúng cả hai
    'uoc-luong-02__est': '250', 'uoc-luong-02': '999', // ước lượng đúng, tính sai
    'uoc-luong-03__est': '10', 'uoc-luong-03': '248',  // ước lượng sai, tính đúng
    'uoc-luong-04__est': 'abc', 'uoc-luong-04': '-5',  // cả hai không hợp lệ
  };
  const { status, data } = await call('POST', '/api/submissions', { setId: SET_ID, answers, durationSec: 30 });
  assert.equal(status, 200, JSON.stringify(data));
  assert.equal(data.correctCount, 1);
  assert.equal(data.totalCount, 12);
  assert.equal(data.scorePercent, 8); // 5 / 60 điểm

  const byId = Object.fromEntries(data.detail.map(d => [d.questionId, d]));
  assert.equal(byId['uoc-luong-01'].outcome, 'estimate-ok_exact-ok');
  assert.equal(byId['uoc-luong-02'].outcome, 'estimate-ok_exact-wrong');
  assert.equal(byId['uoc-luong-03'].outcome, 'estimate-wrong_exact-ok');
  assert.equal(byId['uoc-luong-04'].outcome, 'estimate-wrong_exact-wrong');
  assert.deepEqual(byId['uoc-luong-01'].acceptRange, { lo: 183, hi: 273 }); // chỉ lộ SAU khi nộp

  // Lưu bền: attempts giữ cả ước lượng và kết quả trong answers_json (R7)
  const row = db.prepare("SELECT * FROM attempts WHERE ref_id=? ORDER BY id DESC LIMIT 1").get(SET_ID);
  assert.equal(row.score_percent, 8);
  assert.deepEqual(JSON.parse(row.answers_json), answers);

  // "Tải lại trang": đọc lại tiến độ qua API
  const progress = await call('GET', '/api/me/progress');
  const lesson = progress.data.lessons.find(l => l.id === 'bai-10');
  assert.ok(lesson.bestScore >= 8);
});

test('nộp đủ 12 câu đúng cả hai bước → 100%', async () => {
  const answers = {};
  for (const q of seed.questionSets[SET_ID].questions) {
    answers[q.id] = q.correctAnswer;
    answers[`${q.id}__est`] = String(Math.round(Number(q.correctAnswer) / 10) * 10);
  }
  const { data } = await call('POST', '/api/submissions', { setId: SET_ID, answers });
  assert.equal(data.scorePercent, 100);
  assert.equal(data.correctCount, 12);
});

test('T-17 (qua API): phiếu cũ phieu-bai-9-10 vẫn chấm như trước', async () => {
  const qs = seed.questionSets['phieu-bai-9-10'].questions;
  const all = Object.fromEntries(qs.map(q => [q.id, q.correctAnswer]));
  const full = await call('POST', '/api/submissions', { setId: 'phieu-bai-9-10', answers: all });
  assert.equal(full.data.scorePercent, 100);
  assert.ok(full.data.detail.every(d => d.correct && d.type === undefined));

  const none = await call('POST', '/api/submissions', { setId: 'phieu-bai-9-10', answers: {} });
  assert.equal(none.data.scorePercent, 0);
});
