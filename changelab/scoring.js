// Original teaching cases, not verbatim Kieso problems. Four objectives, 25 points each.
export const durationMs=20*60*1000;
const near=(answer,expected)=>Number.isFinite(Number(answer))&&Math.abs(Number(answer)-expected)<=Math.max(1,Math.abs(expected)*0.0001);
export function caseData(variant){
 const k=variant+1;
 return [
  {id:'policy',title:'01 · Inventory policy',subtitle:'Accounting policy / retrospective application',minutes:5,
   document:`The audit committee approves a justified switch from weighted-average cost to FIFO, effective 1 January 2026. Inventory at 31 December 2025 was €${(80000*k).toLocaleString('en-US')} under weighted average and €${(92000*k).toLocaleString('en-US')} under FIFO. The difference is wholly attributable to periods preceding 2026. Ignore income taxes.`,
   questions:[{key:'treatment',label:'Reporting treatment',type:'select',options:['retrospective','prospective','current-income']},{key:'amount',label:'Increase in inventory (€)',type:'number'},{key:'debit',label:'Debit account',type:'select',options:['inventory','retained-earnings','sales-revenue','depreciation-expense']},{key:'credit',label:'Credit account',type:'select',options:['inventory','retained-earnings','sales-revenue','depreciation-expense']},{key:'comparatives',label:'Restate affected comparatives?',type:'select',options:['yes','no']}],
   expected:{treatment:'retrospective',amount:12000*k,debit:'inventory',credit:'retained-earnings',comparatives:'yes'}},
  {id:'estimate',title:'02 · Engineering memorandum',subtitle:'Accounting estimate / prospective depreciation',minutes:5,
   document:`Equipment originally cost €${(300000*k).toLocaleString('en-US')} with zero residual value and a 10-year straight-line life. After four complete years, fresh engineering evidence supports a revised TOTAL useful life of 16 years from acquisition. The original estimate was reasonable. Assume one full year of depreciation follows the revision.`,
   questions:[{key:'treatment',label:'Reporting treatment',type:'select',options:['retrospective','prospective','error-correction']},{key:'carrying',label:'Carrying amount at revision (€)',type:'number'},{key:'remaining',label:'Revised remaining life (years)',type:'number'},{key:'depreciation',label:'Revised annual depreciation (€)',type:'number'},{key:'restatement',label:'Restate earlier depreciation?',type:'select',options:['yes','no']}],
   expected:{treatment:'prospective',carrying:180000*k,remaining:12,depreciation:15000*k,restatement:'no'}},
  {id:'error',title:'03 · Missing depreciation',subtitle:'Material prior-period error / correction',minutes:5,
   document:`While preparing 2026 statements, you discover that €${(20000*k).toLocaleString('en-US')} of depreciation was omitted from issued 2025 statements. The 2025 books are closed. The error is material. Ignore taxes.`,
   questions:[{key:'profit',label:'Effect on reported 2025 profit',type:'select',options:['overstated','understated','no-effect']},{key:'amount',label:'Gross correcting amount (€)',type:'number'},{key:'debit',label:'Debit account for historical adjustment',type:'select',options:['retained-earnings','current-depreciation-expense','cash','revenue']},{key:'credit',label:'Credit account',type:'select',options:['accumulated-depreciation','equipment','cash','retained-earnings']},{key:'comparatives',label:'Restate affected 2025 comparatives?',type:'select',options:['yes','no']}],
   expected:{profit:'overstated',amount:20000*k,debit:'retained-earnings',credit:'accumulated-depreciation',comparatives:'yes'}},
  {id:'timing',title:'04 · Advance rent',subtitle:'Counterbalancing error / two-year analysis',minutes:3,
   document:`On 1 January 2025, Meridian received €${(24000*k).toLocaleString('en-US')} for services supplied equally in 2025 and 2026. The entire receipt was incorrectly recognized as 2025 rental income; no additional income is recorded in 2026. Ignore taxes.`,
   questions:[{key:'income2025',label:'Correct 2025 rental income (€)',type:'number'},{key:'effect2025',label:'2025 profit misstatement',type:'select',options:['overstated','understated','no-effect']},{key:'effect2026',label:'2026 profit misstatement',type:'select',options:['overstated','understated','no-effect']},{key:'amount',label:'Absolute profit misstatement in EACH year (€)',type:'number'},{key:'ignore',label:'Can the errors be ignored because the two-year net is zero?',type:'select',options:['yes','no']}],
   expected:{income2025:12000*k,effect2025:'overstated',effect2026:'understated',amount:12000*k,ignore:'no'}}
 ];
}
export function scoreAnswers(variant,answers){
 const cases=caseData(variant);let total=0;const breakdown=[];
 for(const c of cases){let score=0;const row=answers?.[c.id]||{};const items=[];
  for(const q of c.questions){const expected=c.expected[q.key];const correct=q.type==='number'?near(row[q.key],expected):row[q.key]===expected;score+=correct?5:0;items.push({key:q.key,correct});}
  total+=score;breakdown.push({id:c.id,score,max:25,items});
 }
 return {total,breakdown};
}
export function validateAnswers(answers){
 if(!answers||typeof answers!=='object'||Array.isArray(answers))return false;
 if(JSON.stringify(answers).length>6000)return false;
 for(const [id,row] of Object.entries(answers)){
  if(!['policy','estimate','error','timing'].includes(id)||!row||typeof row!=='object'||Array.isArray(row))return false;
  for(const [key,v] of Object.entries(row))if(!/^[a-zA-Z0-9]{1,30}$/.test(key)||!['string','number'].includes(typeof v)||String(v).length>100)return false;
 }
 return true;
}