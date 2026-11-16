/** CashFlow Lab: original, arithmetically self-contained 2026 IAS 7 teaching case. */
export const DURATION_MS=20*60*1000;
const BASE={
 cash0:95,cash1:200,revenue:900,cogs:430,ar0:150,ar1:190,
 allowance0:25,allowance1:31,writeoffs:12,badDebt:18,
 inventory0:140,inventory1:165,inventoryWriteDown:9,
 ap0:90,ap1:118,wagesExpense:125,wagesPay0:28,wagesPay1:40,
 adminExpense:110,prepaid0:16,prepaid1:25,
 warrantyExpense:22,warranty0:37,warranty1:45,
 taxExpense:50,taxPay0:21,taxPay1:29,
 depreciation:42,amortization:8,
 interestExpense:14,interestPay0:8,interestPay1:10,
 interestIncome:5,disposalGain:16,
 ppeCost0:820,ppeCost1:940,accDep0:220,accDep1:200,
 disposedCost:95,disposedAccDep:62,ppeCashPurchase:140,ppeNoncashLease:75,
 intangible0:100,intangible1:92,land0:160,land1:220,ociRevaluation:60,
 debt0:300,debt1:430,borrowings:100,repayDebt:45,
 divPay0:20,divPay1:30,divDeclared:75,shareIssue:80,
 equity0:732,equity1:899
};
export const VARIANTS=[{id:0,scale:1,name:'Case A — 2026'},{id:1,scale:2,name:'Case B — 2026'},{id:2,scale:3,name:'Case C — 2026'}];
export const num=n=>'€'+(n*1000).toLocaleString('en-GB');
export function caseFor(variant=0){
 const v=VARIANTS.find(v=>v.id===Number(variant)); if(!v)throw new Error('Unsupported case variant');
 const d=Object.fromEntries(Object.entries(BASE).map(([k,n])=>[k,Math.round(n*v.scale)]));
 const supplierPurchases=d.cogs+d.inventory1-d.inventory0;
 const customerCash=d.revenue+d.ar0-d.ar1-d.writeoffs;
 const supplierCash=supplierPurchases+d.ap0-d.ap1;
 const wagesCash=d.wagesExpense+d.wagesPay0-d.wagesPay1;
 const adminCash=d.adminExpense+d.prepaid1-d.prepaid0;
 const warrantyCash=d.warranty0+d.warrantyExpense-d.warranty1;
 const taxCash=d.taxExpense+d.taxPay0-d.taxPay1;
 const dividendCash=d.divDeclared+d.divPay0-d.divPay1;
 const interestCash=d.interestExpense+d.interestPay0-d.interestPay1;
 const ppeCarrying=d.disposedCost-d.disposedAccDep;
 const disposalProceeds=ppeCarrying+d.disposalGain;
 const netAr0=d.ar0-d.allowance0,netAr1=d.ar1-d.allowance1;
 const profit=d.revenue-d.cogs-d.badDebt-d.wagesExpense-d.adminExpense-d.warrantyExpense-d.depreciation-d.amortization-d.taxExpense-d.interestExpense+d.interestIncome+d.disposalGain;
 const indirect={
  depreciation:d.depreciation,amortization:d.amortization,disposalGain:-d.disposalGain,
  interestExpense:d.interestExpense,interestIncome:-d.interestIncome,
  netReceivables:netAr0-netAr1,inventory:d.inventory0-d.inventory1,tradePayables:d.ap1-d.ap0,
  wagesPayable:d.wagesPay1-d.wagesPay0,prepaid:d.prepaid0-d.prepaid1,
  warranty:d.warranty1-d.warranty0,taxesPayable:d.taxPay1-d.taxPay0
 };
 const direct={collections:customerCash,suppliers:-supplierCash,wages:-wagesCash,administration:-adminCash,warrantySettlements:-warrantyCash,incomeTaxPaid:-taxCash};
 const common={equipmentPurchase:-d.ppeCashPurchase,disposalProceeds,interestReceived:d.interestIncome,netBorrowing:d.borrowings-d.repayDebt,sharesIssued:d.shareIssue,dividendsPaid:-dividendCash,interestPaid:-interestCash};
 const operating=Object.values(direct).reduce((a,b)=>a+b,0);
 const indirectOperating=profit+Object.values(indirect).reduce((a,b)=>a+b,0);
 const investing=common.equipmentPurchase+common.disposalProceeds+common.interestReceived;
 const financing=common.netBorrowing+common.sharesIssued+common.dividendsPaid+common.interestPaid;
 const change=operating+investing+financing;
 const bs0={cash:d.cash0,netReceivables:netAr0,inventory:d.inventory0,prepayments:d.prepaid0,netPPE:d.ppeCost0-d.accDep0,intangibles:d.intangible0,land:d.land0,tradePayables:d.ap0,wagesPayable:d.wagesPay0,warrantyProvision:d.warranty0,taxPayable:d.taxPay0,interestPayable:d.interestPay0,borrowings:d.debt0,dividendsPayable:d.divPay0,equity:d.equity0};
 const bs1={cash:d.cash1,netReceivables:netAr1,inventory:d.inventory1,prepayments:d.prepaid1,netPPE:d.ppeCost1-d.accDep1,intangibles:d.intangible1,land:d.land1,tradePayables:d.ap1,wagesPayable:d.wagesPay1,warrantyProvision:d.warranty1,taxPayable:d.taxPay1,interestPayable:d.interestPay1,borrowings:d.debt1,dividendsPayable:d.divPay1,equity:d.equity1};
 return {variant:v.id,company:'Merapi Industrial Systems plc',year:2026,currency:'EUR',unit:'thousands',d,bs0,bs1,profit,direct,indirect,common,operating,indirectOperating,investing,financing,change,customerCash,supplierPurchases,supplierCash,disposalProceeds,ppeCarrying,dividendCash,interestCash};
}
export function verifyCase(c){
 const d=c.d;
 const assets=b=>b.cash+b.netReceivables+b.inventory+b.prepayments+b.netPPE+b.intangibles+b.land;
 const liabilities=b=>b.tradePayables+b.wagesPayable+b.warrantyProvision+b.taxPayable+b.interestPayable+b.borrowings+b.dividendsPayable;
 const tests={
  'opening balance sheet balances':assets(c.bs0)===liabilities(c.bs0)+c.bs0.equity,
  'closing balance sheet balances':assets(c.bs1)===liabilities(c.bs1)+c.bs1.equity,
  'gross receivables rollforward':d.ar0+d.revenue-c.customerCash-d.writeoffs===d.ar1,
  'allowance rollforward':d.allowance0+d.badDebt-d.writeoffs===d.allowance1,
  'inventory rollforward':d.inventory0+c.supplierPurchases-d.cogs===d.inventory1,
  'gross equipment rollforward':d.ppeCost0+d.ppeCashPurchase+d.ppeNoncashLease-d.disposedCost===d.ppeCost1,
  'accumulated depreciation rollforward':d.accDep0+d.depreciation-d.disposedAccDep===d.accDep1,
  'disposal proceeds':c.disposalProceeds-c.ppeCarrying===d.disposalGain,
  'debt rollforward':d.debt0+d.borrowings+d.ppeNoncashLease-d.repayDebt===d.debt1,
  'dividends payable':d.divPay0+d.divDeclared-c.dividendCash===d.divPay1,
  'equity rollforward':d.equity0+c.profit+d.shareIssue-d.divDeclared+d.ociRevaluation===d.equity1,
  'land revaluation':d.land0+d.ociRevaluation===d.land1,
  'direct and indirect agree':c.operating===c.indirectOperating,
  'cash flow reconciles':d.cash0+c.change===d.cash1,
  'interest payable':d.interestPay0+d.interestExpense-c.interestCash===d.interestPay1,
  'inventory write down counted only once':d.inventory0+c.supplierPurchases-(d.cogs-d.inventoryWriteDown)-d.inventoryWriteDown===d.inventory1,
 };
 return {ok:Object.values(tests).every(Boolean),checks:tests};
}
const directFields=[
 ['collections','Cash received from customers',12],['suppliers','Cash paid to suppliers (negative)',12],
 ['wages','Cash paid to employees (negative)',7],['administration','Cash paid for other operating expenses (negative)',8],
 ['warrantySettlements','Cash warranty settlements (negative)',8],['incomeTaxPaid','Income taxes paid (negative)',8]
];
const indirectFields=[
 ['depreciation','Depreciation adjustment',5],['amortization','Amortization adjustment',3],
 ['disposalGain','Remove disposal gain',5],['interestExpense','Interest expense adjustment',5],
 ['interestIncome','Interest income adjustment',4],['netReceivables','Change in NET receivables',7],
 ['inventory','Inventory movement',5],['tradePayables','Trade payables movement',4],
 ['wagesPayable','Accrued wages movement',4],['prepaid','Prepaid expenses movement',4],
 ['warranty','Warranty provision movement',4],['taxesPayable','Income tax payable movement',5]
];
const commonFields=[
 ['equipmentPurchase','Cash machinery purchases (negative)',7],['disposalProceeds','Cash equipment disposal proceeds',4],
 ['interestReceived','Interest received — investing',3],['netBorrowing','Net cash borrowing (proceeds minus repayments)',5],
 ['sharesIssued','Ordinary shares issued for cash',2],['dividendsPaid','Dividends PAID (negative)',3],
 ['interestPaid','Interest PAID — financing (negative)',1]
];
const totalFields=[['operating','Net operating cash flow',4],['investing','Net investing cash flow',2],['financing','Net financing cash flow',2],['cash1','Closing cash balance',2]];
const reasoningFields=[
 ['lease','Machinery acquired by finance lease',2.5,[['noncash','Exclude from current-period cash movements; disclose as significant noncash investing/financing activity'],['investing','Include as investing cash purchase'],['financing','Include the initial lease liability as financing cash proceeds']]],
 ['writeoff','Receivable write-off',2.5,[['noncash','Do not treat the write-off as a cash receipt'],['collections','Add it to collections'],['financing','Report it as a financing cash outflow']]],
 ['gain','Gain on equipment disposal',2.5,[['remove','Deduct gain from profit in indirect CFO; show cash proceeds in investing'],['investing-gain','Report the gain itself as cash investing proceeds'],['add','Add the gain to profit in indirect CFO']]],
 ['interest','2026 company policy for cash interest paid',2.5,[['financing','Financing (the policy specified in this case)'],['operating','Operating regardless of the stated policy'],['investing','Investing because interest income is investing']]]
];
export function fieldsFor(method){if(!['direct','indirect'].includes(method))throw Error('Invalid method');return {operating:method==='direct'?directFields:indirectFields,common:commonFields,totals:totalFields,reasoning:reasoningFields};}
export const maxScore=100;
export const fieldMax={operating:55,common:25,totals:10,reasoning:10};
const near=(v,expected)=>v!==null&&v!==''&&v!==undefined&&Number.isFinite(Number(v))&&Math.abs(Number(v)-expected)<=0.001;
export function scoreSubmission(c,method,answers){
 const f=fieldsFor(method),e={operating:method==='direct'?c.direct:c.indirect,common:c.common,totals:{operating:c.operating,investing:c.investing,financing:c.financing,cash1:c.d.cash1},reasoning:{lease:'noncash',writeoff:'noncash',gain:'remove',interest:'financing'}};
 let score=0;const breakdown=[],diagnostics=[];const sums={operating:0,common:0,totals:0,reasoning:0};
 for(const section of ['operating','common','totals','reasoning']){
  for(const row of f[section]){
   const [key,label,points]=row,actual=answers?.[section]?.[key];const expected=e[section][key];
   const correct=section==='reasoning'?actual===expected:near(actual,expected);
   if(correct){score+=points;sums[section]+=points;} else diagnostics.push(`${section}.${key}`);
   breakdown.push({section,key,label,points,correct,expected,actual:actual??null});
  }
 }
 const patterns=[];const a=answers?.operating||{};
 if(method==='direct'){
  if(near(a.collections,c.customerCash+c.d.writeoffs))patterns.push('Receivable write-offs incorrectly treated as cash collections');
  if(near(a.suppliers,-(c.supplierCash-c.d.inventoryWriteDown)))patterns.push('Inventory write-down counted twice in supplier payments');
 } else {
  if(near(a.disposalGain,c.d.disposalGain))patterns.push('Disposal gain added to operating cash instead of deducted');
  if(near(a.netReceivables,c.d.ar0-c.d.ar1))patterns.push('Gross instead of net receivable adjustment');
 }
 if(near(answers?.common?.equipmentPurchase,-(c.d.ppeCashPurchase+c.d.ppeNoncashLease)))patterns.push('Noncash finance-lease machinery treated as cash purchase');
 if(near(answers?.common?.dividendsPaid,-c.d.divDeclared))patterns.push('Dividends declared mistaken for cash dividends paid');
 return {score,breakdown,sums,diagnostics,patterns};
}
export function validateAnswers(method,answers){
 if(!['direct','indirect'].includes(method))return false;
 if(!answers||typeof answers!=='object'||Array.isArray(answers)||JSON.stringify(answers).length>6500)return false;
 const allowed=fieldsFor(method);
 for(const [section,obj] of Object.entries(answers)){
  if(!Object.hasOwn(allowed,section)||!obj||typeof obj!=='object'||Array.isArray(obj))return false;
  for(const [k,v] of Object.entries(obj)){
   if(!allowed[section].some(f=>f[0]===k)||!['string','number'].includes(typeof v)||String(v).length>70)return false;
   if(section!=='reasoning'&&v!==''&&(!Number.isFinite(Number(v))||Math.abs(Number(v))>1000000))return false;
   if(section==='reasoning'&&!allowed.reasoning.find(f=>f[0]===k)[3].some(x=>x[0]===v)&&v!=='')return false;
  }
 }
 return true;
}
export function publicCase(c){
 const d=c.d;
 return {company:c.company,year:c.year,variant:c.variant,unit:'€ thousands; enter signed amounts in thousands',
  policies:{interestPaid:'financing',interestReceived:'investing',dividendsPaid:'financing',fiscalYear:'2026; IFRS 18 not early adopted'},
  incomeStatement:[['Revenue',d.revenue],['Cost of goods sold (including write-down)',-d.cogs],['Expected credit-loss expense',-d.badDebt],['Employee expenses',-d.wagesExpense],['Other operating expenses',-d.adminExpense],['Warranty expense',-d.warrantyExpense],['Depreciation',-d.depreciation],['Amortization',-d.amortization],['Interest expense',-d.interestExpense],['Interest income',d.interestIncome],['Gain on machinery disposal',d.disposalGain],['Income tax expense',-d.taxExpense],['Profit for the year',c.profit]],
  balanceSheet:[['Cash',d.cash0,d.cash1],['Trade receivables, gross',d.ar0,d.ar1],['Loss allowance (deduction)',-d.allowance0,-d.allowance1],['Inventory',d.inventory0,d.inventory1],['Prepaid expenses',d.prepaid0,d.prepaid1],['Property, plant and equipment, cost',d.ppeCost0,d.ppeCost1],['Accumulated depreciation (deduction)',-d.accDep0,-d.accDep1],['Intangible assets, net',d.intangible0,d.intangible1],['Land',d.land0,d.land1],['Trade payables',d.ap0,d.ap1],['Wages payable',d.wagesPay0,d.wagesPay1],['Warranty provision',d.warranty0,d.warranty1],['Income tax payable',d.taxPay0,d.taxPay1],['Interest payable',d.interestPay0,d.interestPay1],['Borrowings (including lease liability)',d.debt0,d.debt1],['Dividends payable',d.divPay0,d.divPay1],['Equity',d.equity0,d.equity1]],
  notes:[
   {title:'Receivable movements',body:`Gross accounts receivable were reduced by ${num(d.writeoffs)} through customer write-offs. Bad-debt expense of ${num(d.badDebt)} was recognized; the write-offs did NOT involve cash.`},
   {title:'Inventory and procurement',body:`Cost of goods sold includes a ${num(d.inventoryWriteDown)} inventory write-down. Trade payables arise solely from inventory purchases; no non-inventory purchases are included.`},
   {title:'Machinery movements',body:`Machinery with original cost ${num(d.disposedCost)} and accumulated depreciation ${num(d.disposedAccDep)} was sold, resulting in a ${num(d.disposalGain)} gain. Other machinery was purchased for cash. A separate ${num(d.ppeNoncashLease)} machinery acquisition was financed directly through a new finance-lease liability and had NO initial cash payment.`},
   {title:'Other operating movements',body:'All employee expense is settled through wages payable. Other operating expense is settled through prepaid expenses. Warranty settlements are cash payments; the warranty expense is the year’s provision charge. There were no noncash movements in these balances.'},
   {title:'Borrowings, shares and dividends',body:`Cash borrowings were ${num(d.borrowings)} and cash debt principal repayments were ${num(d.repayDebt)}. The finance-lease inception added ${num(d.ppeNoncashLease)} to borrowings without cash. New shares were issued for ${num(d.shareIssue)} cash. Dividends of ${num(d.divDeclared)} were declared, but actual cash dividends must be calculated from dividends payable.`},
   {title:'Interest, tax and investments',body:'All interest income was received in cash. Interest paid is a financing activity under this entity’s 2026 IAS 7 policy; interest received is investing. All income tax expense runs through the income tax payable account. No noncash income tax movements occurred.'},
   {title:'Land revaluation and context',body:`The ${num(d.ociRevaluation)} rise in land value was a noncash revaluation recorded in other comprehensive income. Management forecasts 18% revenue growth next year; this forecast does not establish any 2026 cash collections.`}
  ]};
}