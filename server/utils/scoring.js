export function normalizeRoundType(rt) {
  if (!rt) return "";
  return String(rt).trim().toLowerCase();
}

export function displayRoundType(rt) {
  if (!rt) return "";
  const s = String(rt).trim();
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function computeCodingScoreFromFlags(answers) {
  if (!answers) return null;
  const vals = Array.isArray(answers) ? answers : Object.values(answers || {});
  if (!vals.length) return null;
  const passed = vals.filter(v => {
    if (v === true || v === "true" || v === "passed") return true;
    if (typeof v === "object" && v !== null && (v.passed === true || v.passed === "true")) return true;
    return false;
  }).length;

  if (passed >= 2) return 100;
  if (passed === 1) return 50;
  return 0;
}

export function computePercentAnswered(answers) {
  if (!answers) return 0;
  const vals = Array.isArray(answers) ? answers : Object.values(answers || {});
  if (!vals.length) return 0;
  const answered = vals.filter(v => v !== null && v !== undefined && String(v).trim() !== "").length;
  return Math.round((answered / vals.length) * 100);
}

export function computeMcqScore(questions, answers) {
  if (!Array.isArray(questions) || !questions.length) return null;
  let total = 0, correct = 0;
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q || q.correct == null) continue;
    total++;
    const ua = (answers?.[i] ?? "").toString().trim().toLowerCase();
    const ca = (q.correct ?? "").toString().trim().toLowerCase();
    if (ua && ca && ua === ca) correct++;
  }
  if (!total) return null;
  return Math.round((correct / total) * 100);
}