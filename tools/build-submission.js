#!/usr/bin/env node
/**
 * Chuẩn bị thư mục nộp bài BKT cho ktpmud-project (đề §11, erratum #25 #28).
 * - Chép tài liệu trong docs/ sang submission/<slug>_<ma_nhom>/artifacts/ với đúng tên file đề yêu cầu,
 *   để docs/ là nguồn duy nhất (artifacts/ là bản sinh ra, không commit).
 * - Kiểm tra sơ bộ giống scripts/validate_submission.py: thiếu file, file rỗng, còn giá trị mẫu REPLACE_VOI...
 * Chạy: npm run build:submission
 * Sau đó copy cả thư mục sang fork ktpmud-project và chạy validate_submission.py ở đó.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FOLDER = path.join(ROOT, 'submission', 'hoang_mai_toan_173820_n32');
const ARTIFACTS = {
  'REQUIREMENTS.md': 'docs/Requirements.md',
  'DECISIONS.md': 'docs/Decisions.md',
  'TEST_REPORT.md': 'docs/TEST_REPORT.md',
  'SECURITY_PRIVACY_CHECKLIST.md': 'docs/SECURITY_PRIVACY_CHECKLIST.md',
  'AI_USE.md': 'docs/AI_USE.md',
  'CONTRIBUTIONS.md': 'docs/CONTRIBUTIONS.md',
};
const SOURCE_REF_FIELDS = ['starter_repo', 'starter_commit', 'fork_url', 'final_commit', 'release_tag', 'ci_run_url'];
const isPlaceholder = v => typeof v === 'string' && (v.trim().startsWith('REPLACE_VOI') || ['MSSV1', 'MSSV2', 'MSSV3', 'YYYY-MM-DD'].includes(v.trim()));

const problems = [];
const outDir = path.join(FOLDER, 'artifacts');
fs.mkdirSync(outDir, { recursive: true });
for (const [name, src] of Object.entries(ARTIFACTS)) {
  const from = path.join(ROOT, src);
  if (!fs.existsSync(from)) { problems.push(`thiếu ${src}`); continue; }
  fs.copyFileSync(from, path.join(outDir, name));
  if (fs.statSync(from).size === 0) problems.push(`${src} rỗng`);
}

for (const [file, fields] of [['submission.json', ['case_study_slug', 'case_study_id', 'group_code', 'members']], ['source-ref.json', SOURCE_REF_FIELDS]]) {
  const json = JSON.parse(fs.readFileSync(path.join(FOLDER, file), 'utf8'));
  for (const f of fields) {
    const values = Array.isArray(json[f]) ? json[f] : [json[f]];
    if (!json[f] || values.length === 0) problems.push(`${file}: thiếu "${f}"`);
    for (const v of values) if (isPlaceholder(v)) problems.push(`${file}: "${f}" còn giá trị mẫu ${v}`);
  }
}

console.log(`Đã chép ${Object.keys(ARTIFACTS).length} artifact vào ${path.relative(ROOT, outDir)}`);
if (problems.length) {
  console.log('Còn phải xử lý trước khi nộp:');
  for (const p of problems) console.log(`  - ${p}`);
  process.exitCode = 1;
} else {
  console.log('Không phát hiện vấn đề. Nhớ chạy validate_submission.py trong ktpmud-project.');
}
