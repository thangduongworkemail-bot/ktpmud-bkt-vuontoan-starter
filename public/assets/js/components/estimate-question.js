/**
 * Giao diện 2 bước cho câu hỏi type 'estimate' ("Ước lượng trước khi tính đúng").
 * Dùng trong trang làm bài chung lesson.html (pages/lesson.js).
 *
 * - Bước 1: nhập ước lượng rồi bấm "Chốt" (hoặc Enter). Sau khi chốt, ô bị khóa.
 * - Bước 2: ô "Tính đúng" chỉ mở sau khi đã chốt ước lượng (R3).
 * - Ước lượng đã chốt được lưu sessionStorage theo người dùng + bộ đề, để tải lại
 *   trang giữa 2 bước không mất (ADR-003, B-05); xóa khi nộp bài thành công.
 * - Đáp án gửi lên server: answers[id] = kết quả đúng, answers[id + '__est'] = ước lượng.
 * - Kiểm tra đầu vào ở client chỉ để báo lỗi dễ hiểu (B-12); server vẫn tự chấm lại.
 */
window.MathApp = window.MathApp || {};
window.MathApp.components = window.MathApp.components || {};

(function () {
  const SUFFIX = '__est';
  const VALID = /^\d{1,6}$/;
  const INVALID_MSG = 'Em chỉ nhập số tự nhiên (không có dấu trừ, dấu phẩy hay chữ), tối đa 6 chữ số nhé.';
  const EMPTY_EST_MSG = 'Em nhập số ước lượng trước rồi mới chốt nhé.';

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const storageKey = (setId, userId) => `vuontoan:estimate:${userId || 'anon'}:${setId}`;

  function loadSaved(key) {
    try { return JSON.parse(sessionStorage.getItem(key) || '{}') || {}; } catch { return {}; }
  }
  function writeSaved(key, data) {
    try { sessionStorage.setItem(key, JSON.stringify(data)); } catch { /* bị chặn storage: vẫn làm bài bình thường */ }
  }

  const inputCls = 'w-40 h-14 text-center rounded-2xl bg-surface-container-low text-primary font-headline-lg focus:outline-none focus:ring-4 focus:ring-primary-fixed disabled:opacity-50 disabled:cursor-not-allowed read-only:bg-surface-container';

  function renderBody(q) {
    const id = esc(q.id);
    return `
      <p class="mt-1 font-body-md text-body-md text-on-surface-variant">Ước lượng trước, rồi mới tính kết quả đúng của phép tính <strong class="text-on-surface">${esc(q.prompt)}</strong>.</p>
      <div class="mt-3 grid gap-5 sm:grid-cols-2" data-estimate-q="${id}">
        <div>
          <label for="est-${id}" class="block font-headline-sm text-label-lg text-primary">Bước 1 · Ước lượng</label>
          <p id="est-hint-${id}" class="font-label-sm text-label-sm text-on-surface-variant">Làm tròn số cho dễ nhẩm. Chưa cần tính chính xác.</p>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <input id="est-${id}" data-est-input="${id}" type="text" inputmode="numeric" autocomplete="off"
              aria-describedby="est-hint-${id} est-err-${id}" placeholder="Khoảng..." class="${inputCls}"/>
            <button type="button" data-est-lock="${id}" class="h-14 px-5 rounded-2xl bg-primary text-on-primary font-headline-sm shadow-[0_3px_0_0_#005320] active:translate-y-0.5 transition-all disabled:bg-surface-container disabled:text-on-surface-variant disabled:shadow-none">Chốt ước lượng</button>
          </div>
          <p id="est-err-${id}" class="mt-1 min-h-[1.25rem] font-label-sm text-label-sm text-error" aria-live="polite"></p>
        </div>
        <div>
          <label for="exact-${id}" class="block font-headline-sm text-label-lg text-primary">Bước 2 · Tính đúng</label>
          <p id="exact-hint-${id}" class="font-label-sm text-label-sm text-on-surface-variant">Chốt ước lượng xong thì ô này mới mở.</p>
          <input id="exact-${id}" data-exact-input="${id}" type="text" inputmode="numeric" autocomplete="off" disabled
            aria-describedby="exact-hint-${id} exact-err-${id}" placeholder="Kết quả..." class="mt-2 ${inputCls}"/>
          <p id="exact-err-${id}" class="mt-1 min-h-[1.25rem] font-label-sm text-label-sm text-error" aria-live="polite"></p>
        </div>
        <div data-est-feedback="${id}" class="hidden sm:col-span-2 rounded-2xl p-4 font-body-md text-body-md" role="status" aria-live="polite"></div>
      </div>`;
  }

  function setError(el, errEl, msg) {
    errEl.textContent = msg || '';
    if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
  }

  /**
   * Gắn sự kiện cho mọi câu estimate trong container.
   * opts: { setId, userId, answers, onChange, submitButton }
   */
  function bind(container, opts) {
    const key = storageKey(opts.setId, opts.userId);
    const saved = loadSaved(key);
    const blocks = [...container.querySelectorAll('[data-estimate-q]')];
    const focusables = () => blocks.flatMap((b) => [b.querySelector('[data-est-input]'), b.querySelector('[data-exact-input]')])
      .filter((el) => !el.disabled && !el.readOnly);

    function focusNext(fromEl) {
      const list = focusables();
      const next = list[list.indexOf(fromEl) + 1];
      (next || opts.submitButton)?.focus();
    }

    blocks.forEach((block) => {
      const id = block.dataset.estimateQ;
      const est = block.querySelector('[data-est-input]');
      const lockBtn = block.querySelector('[data-est-lock]');
      const exact = block.querySelector('[data-exact-input]');
      const estErr = block.querySelector(`#est-err-${CSS.escape(id)}`);
      const exactErr = block.querySelector(`#exact-err-${CSS.escape(id)}`);
      const exactHint = block.querySelector(`#exact-hint-${CSS.escape(id)}`);

      function lock({ silent } = {}) {
        const value = est.value.trim();
        if (!value) { setError(est, estErr, EMPTY_EST_MSG); est.focus(); return false; }
        if (!VALID.test(value)) { setError(est, estErr, INVALID_MSG); est.focus(); return false; }
        setError(est, estErr, '');
        est.value = value;
        est.readOnly = true;
        lockBtn.disabled = true;
        lockBtn.textContent = 'Đã chốt ✓';
        exact.disabled = false;
        exactHint.textContent = `Em đã chốt ước lượng ${value}. Giờ tính kết quả đúng nhé.`;
        opts.answers[id + SUFFIX] = value;
        saved[id] = value;
        writeSaved(key, saved);
        opts.onChange?.();
        if (!silent) exact.focus();
        return true;
      }

      function checkExact() {
        const value = exact.value.trim();
        setError(exact, exactErr, value && !VALID.test(value) ? INVALID_MSG : '');
        return !value || VALID.test(value);
      }

      lockBtn.addEventListener('click', () => lock());
      est.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); if (!est.readOnly) lock(); } });
      est.addEventListener('input', () => { if (estErr.textContent) setError(est, estErr, ''); });
      exact.addEventListener('input', () => {
        opts.answers[id] = exact.value.trim();
        if (exactErr.textContent) checkExact();
        opts.onChange?.();
      });
      exact.addEventListener('blur', checkExact);
      exact.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (checkExact() && exact.value.trim()) focusNext(exact);
      });

      // Khôi phục ước lượng đã chốt trước khi tải lại trang (B-05)
      if (saved[id] != null && VALID.test(String(saved[id]))) {
        est.value = String(saved[id]);
        lock({ silent: true });
      }
    });
  }

  /** Câu estimate tính là "đã trả lời" khi đã chốt ước lượng và đã nhập kết quả. */
  function isAnswered(q, answers) {
    return VALID.test(String(answers[q.id + SUFFIX] ?? '')) && String(answers[q.id] ?? '').trim() !== '';
  }

  /** Ô nhập đầu tiên đang sai định dạng (để báo lỗi + focus trước khi nộp), hoặc null. */
  function firstInvalid(container) {
    for (const el of container.querySelectorAll('[data-est-input], [data-exact-input]')) {
      const v = el.value.trim();
      if (v && !VALID.test(v)) {
        const errEl = container.querySelector(`#${el.id.startsWith('est-') ? 'est' : 'exact'}-err-${CSS.escape(el.dataset.estInput || el.dataset.exactInput)}`);
        if (errEl) setError(el, errEl, INVALID_MSG);
        return el;
      }
    }
    return null;
  }

  const OUTCOME_STYLE = {
    'estimate-ok_exact-ok': 'bg-secondary-fixed text-on-secondary-fixed',
    'estimate-ok_exact-wrong': 'bg-tertiary-fixed text-on-tertiary-fixed',
    'estimate-wrong_exact-ok': 'bg-tertiary-fixed text-on-tertiary-fixed',
    'estimate-wrong_exact-wrong': 'bg-error-container text-on-error-container',
  };
  const mark = (ok) => (ok ? '✓' : '✗');
  const shown = (part) => (part.value == null ? '(chưa nhập / không hợp lệ)' : part.value);

  /** Hiển thị phản hồi 4 trường hợp (B-06) từ `detail` server trả về sau khi nộp. */
  function showFeedback(container, detail) {
    (detail || []).filter((d) => d.type === 'estimate').forEach((d) => {
      const box = container.querySelector(`[data-est-feedback="${CSS.escape(d.questionId)}"]`);
      if (!box) return;
      box.className = `sm:col-span-2 rounded-2xl p-4 font-body-md text-body-md ${OUTCOME_STYLE[d.outcome] || ''}`;
      box.innerHTML = `<p class="font-headline-sm">${esc(d.feedback)}</p>
        <p class="mt-1">${mark(d.estimate.ok)} Ước lượng của em: <strong>${esc(shown(d.estimate))}</strong> — khoảng hợp lý: ${d.acceptRange.lo} đến ${d.acceptRange.hi}.</p>
        <p>${mark(d.exact.ok)} Kết quả của em: <strong>${esc(shown(d.exact))}</strong> — đáp án đúng: ${esc(d.correctAnswer)}.</p>`;
    });
  }

  function clearSaved(setId, userId) {
    try { sessionStorage.removeItem(storageKey(setId, userId)); } catch { /* ignore */ }
  }

  window.MathApp.components.EstimateQuestion = { SUFFIX, renderBody, bind, isAnswered, firstInvalid, showFeedback, clearSaved };
})();
