// Shared structural validation. Passing these checks is not an accounting grade.
export const EVENTS = ["Commencement", "Year 1"];
export function validateWorksheet(data, role) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return "Invalid worksheet.";
  const allowed = role === "lessor" ? ["Finance lease", "Operating lease"] : ["Lessee right-of-use model"];
  if (!allowed.includes(data.classification)) return "Choose the accounting model for your assigned role.";
  for (const key of ["pv", "firstInterest", ...(role === "lessee" ? ["rouAsset"] : [])]) {
    const value = data[key];
    if (!["string", "number"].includes(typeof value) || String(value).trim() === "" || !Number.isSafeInteger(Number(value)) || Number(value) < 0) return "Enter a nonnegative whole IDR amount for " + key + ".";
  }
  for (const key of ["reason", "statementImpact", "reflection"]) {
    if (typeof data[key] !== "string" || !data[key].trim() || data[key].length > 4000) return "Complete " + key + " (maximum 4,000 characters).";
  }
  let lines;
  try { lines = JSON.parse(data.journal); } catch { return "Invalid journal data."; }
  if (!Array.isArray(lines) || lines.length < 4 || lines.length > 60) return "Enter 4–60 journal lines covering commencement and Year 1.";
  const totals = Object.fromEntries(EVENTS.map(event => [event, { Debit: 0, Credit: 0 }]));
  for (const line of lines) {
    if (!line || !EVENTS.includes(line.event) || typeof line.account !== "string" || !line.account.trim() || line.account.length > 120 || !["Debit", "Credit"].includes(line.side) || !["number", "string"].includes(typeof line.amount) || !Number.isSafeInteger(Number(line.amount)) || Number(line.amount) <= 0) return "Each journal line needs an event, account, Debit/Credit, and a positive whole IDR amount.";
    totals[line.event][line.side] += Number(line.amount);
    if (!Number.isSafeInteger(totals[line.event][line.side])) return "Journal total exceeds the supported amount.";
  }
  for (const event of EVENTS) {
    const sum = totals[event];
    if (!sum.Debit || !sum.Credit || Math.abs(sum.Debit - sum.Credit) > 1) return event + " requires equal, positive debit and credit totals (IDR 1 tolerance).";
  }
  if (JSON.stringify(data).length > 16000) return "Submission exceeds size limit.";
  return null;
}

export function selectSavedWork(submission, draft) {
  // A submitted attempt is immutable. Never silently discard an older-version draft.
  const content = data => JSON.stringify(Object.fromEntries(Object.entries(data).filter(([key]) => key !== "worksheetVersion").sort(([a], [b]) => a.localeCompare(b))));
  if (submission) return { data: submission.data, submitted: true, preservedDraft: draft && content(draft.data) !== content(submission.data) ? draft : null };
  return { data: draft?.data || null, submitted: false, preservedDraft: null };
}

export function comparisonRows(mine, peer) {
  return [
    ["Accounting model", mine.classification, peer.classification],
    ["Recognized liability / lessor asset or receivable (IDR)", mine.pv, peer.pv],
    ["ROU asset (lessee only, IDR)", mine.rouAsset, peer.rouAsset],
    ["Year 1 interest expense / finance income (IDR)", mine.firstInterest, peer.firstInterest],
    ["Accounting judgment", mine.reason, peer.reason],
    ["Financial statement effects", mine.statementImpact, peer.statementImpact],
    ["Reconciliation explanation", mine.reflection, peer.reflection]
  ];
}
