# RUBRIC_CHECKLIST.md — Tự chấm theo đề chính thức

Bảng tự kiểm của nhóm **173820_N32 · Track B** theo đề *KTPMUD Hack Marathon 2026* (bản v1.0.2 trên trang đề) và các erratum #25, #28.
Mỗi dòng "Xong" phải có bằng chứng: commit, file hoặc link CI. Cập nhật trước PC-2 (18/11) và trước Freeze (19/11).

Nguồn:
- Đề: <https://fossbk-spec.github.io/ktpmud-book/exams/KTPMUD_Hack_Marathon_2026_De_Thi_Chinh_Thuc_v1.0.0_20261103>
- Progress Check: <https://fossbk-spec.github.io/ktpmud-book/exams/KTPMUD_Hack_Marathon_2026_Progress_Check>
- Erratum kênh nộp: `fossbk-spec/ktpmud-project#25`. Draft PR tại PC-2: `#28`. Hỏi đáp Track B: `#32`.

## 1. Điểm trần — kiểm tra trước tiên

Vi phạm một dòng dưới đây thì điểm bị chặn trần, bất kể các phần khác tốt đến đâu.

| Điều kiện (đề §9.3) | Trần | Trạng thái | Bằng chứng |
|---|---|---|---|
| MVP không chạy được từ clean checkout | ≤ 49/100 | ☐ | `npm ci && npm run reset-db && npm start` trên bản clone mới |
| Không có test tự động hoặc CI | ≤ 59/100 | ☐ | `npm test` xanh; workflow `.github/workflows/test.yml` xanh trên PR |
| Thiếu `AI_USE.md` sau hạn bổ sung | ≤ 70/100 | ☐ | `docs/AI_USE.md` |
| Thành viên không giải thích được phần mình làm | Điều chỉnh điểm cá nhân | ☐ | Mỗi người tập trả lời "vì sao" cho phần của mình (mục 5) |
| Có PII/PHI, secret, hoặc truy cập production | Dừng chấm | ☐ | `docs/SECURITY_PRIVACY_CHECKLIST.md` |

## 2. Rubric 100 điểm

Đề không công bố mô tả từng mức (đủ/một phần/0). Cột "Cần chứng minh" là cột bằng chứng của đề.

| Tiêu chí | Điểm | Cần chứng minh | Bằng chứng của nhóm | Tự chấm |
|---|---:|---|---|---:|
| Phân tích yêu cầu, phạm vi, acceptance criteria | 14 | `REQUIREMENTS.md`, truy vết, khớp đặc tả | `docs/Requirements.md` (R1–R10 ↔ B-01..B-12 ↔ T-xx) | |
| Kiến trúc & quyết định thiết kế cho phần mở rộng | 18 | `DECISIONS.md`/ADR, lý do lựa chọn | `docs/Decisions.md` ADR-001..006 | |
| MVP chạy end-to-end | 12 | Chạy sạch, demo, artifact | Mục 4 bên dưới | |
| Thiết kế test & CI | 13 | Bộ test, ca biên/âm, Actions | `test/*.test.js`, `docs/Test_plan.md`, `docs/TEST_REPORT.md`, workflow | |
| Bảo mật, quyền riêng tư, ranh giới dữ liệu/AI | 8 | Checklist, scanner, review | `docs/SECURITY_PRIVACY_CHECKLIST.md`, `docs/AI_USE.md` | |
| Bảo trì & bàn giao | 5 | README, code rõ, tái lập được | README mục chạy/test, `CLAUDE.md`, comment trong `server/estimate.js` | |
| Demo & vấn đáp cá nhân | 10 | Demo trực tiếp, câu hỏi ngẫu nhiên, tập trung vào VÌ SAO | Slide + kịch bản ≤ 7 phút trong `slides/` | |
| **Track B** — Đúng sư phạm/kỹ thuật của dạng bài & chấm tất định | 8 | | ADR-002, ADR-004, T-01..T-16 | |
| **Track B** — Tích hợp đúng luồng/API/DB hiện có | 7 | | ADR-001, ADR-003, ADR-005, T-17, T-30..T-32 | |
| **Track B** — UX/khả năng tiếp cận & phản hồi cho học sinh | 5 | | 4 phản hồi (R5), bàn phím (T-33), báo lỗi nhập | |
| **Tổng** | **100** | | | |

## 3. Yêu cầu Track B (B-01..B-12)

| Mã | Yêu cầu (tóm tắt từ đề §8) | Cách đáp ứng | Test | Trạng thái |
|---|---|---|---|---|
| B-01 | Dạng bài mới vào được từ luồng học có sẵn, không phải trang demo riêng | Trang chủ → thẻ Bài 10 → phiếu Bài 10 → "Phiếu luyện tập: Ước lượng…" (ADR-005) | T-30 | Đã code |
| B-02 | ≥ 12 câu synthetic, tái lập được | `data/seed.json` bộ `phieu-uoc-luong`, `npm run reset-db` | T-20 | Đã code |
| B-03 | Quy tắc tạo & chấm rõ, tất định, test được | ADR-002, ADR-006, `server/estimate.js` | T-01..T-12 | Đã code |
| B-04 | API không trả đáp án trước khi nộp | `GET /api/question-sets/:id/questions` không có `correct_answer`/khoảng | T-31 | Đã code |
| B-05 | Server chấm & lưu; refresh không mất trạng thái | `attempts`/`progress`; ước lượng đã chốt lưu `sessionStorage` (ADR-003) | T-32, T-33 (tay) | Đã code |
| B-06 | Phản hồi phân biệt "ước lượng hợp lý" và "kết quả đúng" | 4 `outcome` + câu phản hồi | T-13..T-16, T-32 | Đã code |
| B-07 | Không sửa `server/auth.js`, session, tài khoản mẫu, deployment | `git diff` so với tag (mục 6) | T-40 | Cần chạy trước Freeze |
| B-08 | Test tự động: bình thường, biên, không hợp lệ, chấm điểm | `test/estimate.test.js`, `test/api.test.js`, `test/seed.test.js` | T-01..T-20 | Đã code |
| B-09 | Có `npm test`, chạy được từ clean checkout | `"test": "node --test"` | T-41 | Cần thử trên bản clone mới |
| B-10 | CI chạy `npm ci` + `npm test` trên Pull Request | `.github/workflows/test.yml` (Node 18/20/22) | T-42 | Cần mở PR trong fork để thấy xanh |
| B-11 | Không PII/secret; chỉ alias/tài khoản synthetic | Checklist bảo mật, test tài khoản seed | T-43 | Cần rà soát |
| B-12 | Luồng chính dùng được bằng bàn phím, lỗi dễ hiểu | Enter để chốt, Tab/Enter để chuyển ô, lỗi `aria-live` dưới từng ô | T-33 (tay) | Cần thử tay |

## 4. Deliverable (đề §6, 14 mục)

| # | Deliverable | Vị trí | Trạng thái |
|---|---|---|---|
| 1 | URL fork + SHA commit đã freeze | `submission/…/source-ref.json` | ☐ |
| 2 | Tag `bkt-2026-<ma-nhom>-rc1` | Tag trên fork | ☐ |
| 3 | MVP chạy được từ clean checkout | Repo | ☐ |
| 4 | README có lệnh cài/chạy/test | `README.md` | ☐ |
| 5 | REQUIREMENTS + acceptance criteria | `docs/Requirements.md` | ☐ |
| 6 | DECISIONS / ADR | `docs/Decisions.md` | ☐ |
| 7 | Mã nguồn + test tự động | `server/`, `public/`, `test/` | ☐ |
| 8 | Workflow CI | `.github/workflows/test.yml` | ☐ |
| 9 | TEST_REPORT (môi trường, kết quả, giới hạn) | `docs/TEST_REPORT.md` | ☐ |
| 10 | SECURITY_PRIVACY_CHECKLIST | `docs/SECURITY_PRIVACY_CHECKLIST.md` | ☐ |
| 11 | AI_USE | `docs/AI_USE.md` | ☐ |
| 12 | CONTRIBUTIONS (thành viên ↔ việc ↔ commit/review) | `docs/CONTRIBUTIONS.md` | ☐ |
| 13 | Slide/kịch bản demo ≤ 7 phút | `submission/…/slides/` | ☐ |
| 14 | PR vào `ktpmud-project` theo schema BKT | Mục 6 | ☐ |

Sản phẩm chỉ có slide/mockup/video mà không chạy được từ mã nguồn đã nộp sẽ **không được nhận**.

## 5. Quy tắc đề (§5) — nhắc cả nhóm

Được phép: dùng AI để giải thích code, gợi ý test, refactor, viết tài liệu, debug; thư viện mã nguồn mở có license tương thích (ghi rõ); tài liệu công khai.

Không được phép:
- Dùng dữ liệu thật của học sinh/giáo viên; kết nối starter tới production/Railway/CSDL thật.
- Commit token, API key, cookie, mật khẩu thật, file `.env`.
- Tìm, chia sẻ hoặc cố đoán hidden test; chép code nhóm khác; thuê người ngoài.
- **Dùng AI trong buổi vấn đáp trực tiếp**, kể cả khi được yêu cầu sửa lỗi tại chỗ.
- Để agent tự merge, release hoặc tự xác nhận bài làm đúng.

Vấn đáp: demo ≤ 7 phút, hỏi đáp ≤ 8 phút, đủ thành viên. Thầy chọn ngẫu nhiên một người giải thích code/test/quyết định AI/ca lỗi, và có thể yêu cầu chạy lại test hoặc sửa một lỗi nhỏ **không dùng AI**.
Mỗi người cần trả lời được, ví dụ:
- Vì sao chọn ±20% và vì sao dùng số nguyên?
- Vì sao cần cả hai bước đúng mới tính đúng câu?
- Vì sao dùng khóa `__est` và chấp nhận rằng thứ tự hai bước chỉ được giữ ở giao diện?
- Vì sao giao diện đặt ở `lesson.js`?
- Ô nhập `1e3` thì chuyện gì xảy ra ở client và ở server?
- Chạy lại một test cụ thể như thế nào? (`node --test test/estimate.test.js`)

## 6. Mốc thời gian & thủ tục nộp

| Mốc | Thời điểm | Việc phải có |
|---|---|---|
| PC-2 | 18/11/2026, 9:30–11:30 | `progress/PROGRESS.md` mục PC-2. Comment ở #18 có 4 dòng: Nhóm/Track, Fork, Commit PC-2 (SHA 40 ký tự), Draft PR. **Draft PR vào `ktpmud-project` với check `validate` xanh trước 11:30** (#28). |
| Freeze | 23:59 19/11/2026 | Tag `bkt-2026-<ma-nhom>-rc1` trên fork; ghi SHA cuối vào `source-ref.json` và PROGRESS |
| M4 nộp | 20/11/2026 | **Không mở PR mới.** Cập nhật `source-ref.json` + artifacts trên cùng nhánh, rồi bấm "Ready for review" |
| Demo/Vấn đáp | 21/11/2026 | Demo ≤ 7 phút + vấn đáp |

Cách nộp (erratum #25, #28; `CONTRIBUTING.md` của `ktpmud-project`):
1. Không mở PR vào starter repo. CI của fork chạy trên PR **trong fork** (ví dụ `work` → `main`).
2. Fork `fossbk-spec/ktpmud-project`, tạo nhánh `submit/hoang_mai_toan-<ma_nhom>`.
3. Copy `submissions/_TEMPLATE_BKT_VUONTOAN/` thành `submissions/hoang_mai_toan_<ma_nhom>/`. Tên thư mục phải chỉ gồm chữ thường, số và `_`, ví dụ `hoang_mai_toan_173820_n32`.
4. Chạy `npm run build:submission` trong repo này để chép artifact vào `submission/`. Sau đó copy nội dung thư mục đó sang `ktpmud-project`.
5. Chạy `python scripts/validate_submission.py submissions/hoang_mai_toan_<ma_nhom>` trong `ktpmud-project` và phải ra `[PASSED]`.
6. PR chỉ được đụng **đúng một** thư mục `submissions/hoang_mai_toan_<ma_nhom>/`.

Kiểm tra B-07 (T-40): `git diff 057a48205f50f0f30d6260be1a44b343a167a3e7 -- server/auth.js Dockerfile DEPLOY.md` phải rỗng. Trong `server/api.js`, chỉ được khác ở dòng `require('./grading')` và thân route `POST /submissions`.
