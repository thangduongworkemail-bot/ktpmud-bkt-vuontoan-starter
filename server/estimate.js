'use strict';
/**
 * Quy tắc chấm dạng bài "Ước lượng trước khi tính đúng" (type = 'estimate').
 * Thuần logic, không phụ thuộc DB/Express để test trực tiếp (docs/Test_plan.md).
 *
 * - ADR-002: khoảng chấp nhận ±ESTIMATE_TOLERANCE_PERCENT quanh đáp án đúng n,
 *   tính hoàn toàn bằng số nguyên (không dùng số thực để tránh sai số làm tròn).
 *   Với 20%: lo = ⌈4n/5⌉ = ⌊(4n + 4)/5⌋, hi = ⌊6n/5⌋.
 * - ADR-003: ước lượng gửi kèm trong cùng object answers với khóa `<id>__est`.
 * - ADR-004: một câu chỉ tính đúng khi ước lượng hợp lý VÀ kết quả đúng.
 * - R6: chỉ nhận chuỗi số nguyên không âm, tối đa 6 chữ số, sau khi trim.
 */

/** Hằng số duy nhất quyết định độ rộng khoảng — đổi ở đây là đủ. */
const ESTIMATE_TOLERANCE_PERCENT = 20;
/** Hậu tố khóa chứa ước lượng trong object answers (ADR-003). */
const ESTIMATE_KEY_SUFFIX = '__est';
const INTEGER_INPUT = /^\d{1,6}$/;

/** 4 trường hợp phản hồi của R5 / B-06. */
const OUTCOMES = Object.freeze({
  BOTH_OK: 'estimate-ok_exact-ok',
  EXACT_WRONG: 'estimate-ok_exact-wrong',
  ESTIMATE_WRONG: 'estimate-wrong_exact-ok',
  BOTH_WRONG: 'estimate-wrong_exact-wrong',
});

const FEEDBACK = Object.freeze({
  [OUTCOMES.BOTH_OK]: 'Ước lượng hợp lý và tính đúng. Giỏi lắm!',
  [OUTCOMES.EXACT_WRONG]: 'Ước lượng hợp lý, nhưng kết quả tính chưa đúng. Em tính lại cẩn thận nhé.',
  [OUTCOMES.ESTIMATE_WRONG]: 'Kết quả tính đúng, nhưng ước lượng còn xa quá. Em thử làm tròn số rồi nhẩm nhé.',
  [OUTCOMES.BOTH_WRONG]: 'Ước lượng chưa hợp lý và kết quả tính chưa đúng. Mình cùng làm lại nhé.',
});

/**
 * Chuyển đầu vào thành số nguyên không âm theo R6.
 * Trả về null nếu không hợp lệ (rỗng, chữ, số âm, thập phân, `1e3`, >6 chữ số...).
 * Không bao giờ ném lỗi.
 */
function parseAnswer(raw) {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const text = String(raw).trim();
  if (!INTEGER_INPUT.test(text)) return null;
  return Number(text);
}

/** Khoảng chấp nhận [lo, hi] (đã bao gồm hai đầu) cho đáp án đúng n (số nguyên ≥ 0). */
function acceptRange(n, percent = ESTIMATE_TOLERANCE_PERCENT) {
  if (!Number.isSafeInteger(n) || n < 0) throw new RangeError(`Đáp án đúng phải là số nguyên không âm, nhận được: ${n}`);
  const down = 100 - percent;
  const up = 100 + percent;
  return {
    lo: Math.floor((n * down + 99) / 100), // ⌈n·(100−p)/100⌉
    hi: Math.floor((n * up) / 100),        // ⌊n·(100+p)/100⌋
  };
}

/**
 * Chấm một câu estimate.
 * @param {string|number} correctAnswer giá trị `correct_answer` trong DB (chuỗi số nguyên)
 * @param {*} estimateRaw giá trị học sinh gửi ở khóa `<id>__est`
 * @param {*} exactRaw giá trị học sinh gửi ở khóa `<id>`
 */
function gradeEstimate(correctAnswer, estimateRaw, exactRaw) {
  const n = parseAnswer(correctAnswer);
  if (n === null) throw new RangeError(`correct_answer của câu estimate không hợp lệ: ${correctAnswer}`);
  const { lo, hi } = acceptRange(n);
  const estimate = parseAnswer(estimateRaw);
  const exact = parseAnswer(exactRaw);
  const estimateOk = estimate !== null && estimate >= lo && estimate <= hi;
  const exactOk = exact !== null && exact === n;
  const outcome = estimateOk
    ? (exactOk ? OUTCOMES.BOTH_OK : OUTCOMES.EXACT_WRONG)
    : (exactOk ? OUTCOMES.ESTIMATE_WRONG : OUTCOMES.BOTH_WRONG);
  return {
    correct: estimateOk && exactOk,
    outcome,
    feedback: FEEDBACK[outcome],
    range: { lo, hi },
    estimate: { value: estimate, valid: estimate !== null, ok: estimateOk },
    exact: { value: exact, valid: exact !== null, ok: exactOk },
  };
}

module.exports = {
  ESTIMATE_TOLERANCE_PERCENT,
  ESTIMATE_KEY_SUFFIX,
  OUTCOMES,
  FEEDBACK,
  parseAnswer,
  acceptRange,
  gradeEstimate,
};
