'use strict';
/**
 * Chấm từng câu hỏi theo `type`. POST /api/submissions gọi hàm này cho mọi câu.
 * - 4 type cũ (multiple-choice, input, compare, paint): GIỮ NGUYÊN so sánh chuỗi
 *   chính xác sau trim + lowercase (docs/architecture-reference.md mục 4).
 * - type 'estimate': chấm 2 bước theo server/estimate.js (ADR-001..004).
 */
const { gradeEstimate, ESTIMATE_KEY_SUFFIX } = require('./estimate');

function gradeQuestion(q, answers) {
  if (q.type === 'estimate') {
    const r = gradeEstimate(q.correct_answer, answers[q.id + ESTIMATE_KEY_SUFFIX], answers[q.id]);
    return {
      questionId: q.id,
      correct: r.correct,
      correctAnswer: q.correct_answer,
      type: 'estimate',
      outcome: r.outcome,
      feedback: r.feedback,
      acceptRange: r.range, // chỉ trả về SAU khi nộp (B-04)
      estimate: r.estimate,
      exact: r.exact,
    };
  }
  const given = answers[q.id] == null ? '' : String(answers[q.id]).trim().toLowerCase();
  const ok = given === String(q.correct_answer).trim().toLowerCase();
  return { questionId: q.id, correct: ok, correctAnswer: q.correct_answer };
}

module.exports = { gradeQuestion };
