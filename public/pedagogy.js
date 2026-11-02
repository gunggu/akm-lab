// Original LeaseLab teaching prompts aligned to Kieso, Weygandt & Warfield,
// Intermediate Accounting IFRS, International Adaptation (2024, 5th ed.), Ch. 20.
// This is instructor-authored material; no textbook examples or solutions reproduced.
export const CHAPTER_REFERENCE = "Kieso, Weygandt & Warfield (2024), Intermediate Accounting IFRS, International Adaptation, 5th ed., Chapter 20: Accounting for Leases; interpreted alongside IFRS 16.";
const CASE_PROMPTS = {
  1:{lessor:"Explain whether a four-year term within a five-year useful life transfers substantially all risks and rewards. Then distinguish the manufacturer’s selling profit on commencement from the finance income earned during Year 1.",lessee:"Explain why a lease liability and ROU asset arise even though legal title remains with Astra. Reconcile the first-year cash payment, interest, reduction in liability and ROU depreciation.",misconception:"A finance lease is not simply rental revenue; the manufacturer’s commencement-date selling result differs from subsequent financing income."},
  2:{lessor:"Explain the retained residual exposure and relatively short lease term. Why does Nusantara continue to recognize the packaging line and depreciation instead of manufacturer selling profit?",lessee:"Why does Bumi Segar recognize an ROU asset and liability even though Nusantara uses operating-lease accounting? Show how interest, payment and depreciation affect Year 1.",misconception:"The lessor’s operating classification does not exempt the lessee from the IFRS 16 right-of-use model."},
  3:{lessor:"The first installment is paid immediately on 1 January. Distinguish gross contractual PV, cash received at commencement and the net investment remaining. Explain selling profit and the base used for Year 1 finance income.",lessee:"Distinguish total initial ROU asset cost from the lease liability remaining after the first Rp110 million payment. Explain why interest is not charged on cash already paid at commencement.",misconception:"An annuity-due contract needs a separate commencement cash entry; the opening ROU asset need not equal the post-payment lease liability."},
  4:{lessor:"Explain why the lessor retains the equipment fleet and residual-value exposure. Connect the operating-lease model to rental income, depreciation and the Year 1 carrying amount.",lessee:"Compare your initial ROU asset and liability with Garuda’s continuing underlying asset. Explain why the different accounts do not mean two companies recognized the same asset.",misconception:"The two parties’ asset measurements have different accounting meanings; compare underlying PPE with ROU asset carefully."},
  5:{lessor:"Analyze whether lease payments recover substantially all fair value and whether the term covers a major part of economic life. Reconcile manufacturer profit and Year 1 finance return.",lessee:"Show how a substantial four-year contractual commitment becomes a lease liability and how Year 1 interest and ROU depreciation affect profit differently.",misconception:"A low remaining asset life does not automatically mean immediate expensing; liability accretion and ROU depreciation remain distinct."}
};
export function studentPrompt(caseId,role){return CASE_PROMPTS[caseId]?.[role]||"";}
export function misconception(caseId){return CASE_PROMPTS[caseId]?.misconception||"";}
export const DEBRIEF_QUESTIONS=[
 "Which contract terms support lessor classification, and which facts would change the conclusion?",
 "What is paid at commencement, and what liability/receivable remains immediately afterward?",
 "Why are finance income and manufacturer selling profit not interchangeable?",
 "Why does a lessee generally recognize an ROU asset even when the lessor uses operating-lease accounting?",
 "How do Year 1 cash flow, finance cost, depreciation and year-end carrying amounts reconcile?"
];
