import test from 'node:test';
import assert from 'node:assert/strict';
import { selectSavedWork, comparisonRows, validateWorksheet } from '../public/worksheet.js';

test('saved-work selection preserves distinct drafts alongside locked submission',()=>{
  const submitted={data:{reason:'Original answer'},submitted_at:'2026-01-01'},draft={data:{reason:'Newer legacy draft'},updated_at:'2026-01-02'};
  const result=selectSavedWork(submitted,draft);assert.equal(result.submitted,true);assert.equal(result.data.reason,'Original answer');assert.equal(result.preservedDraft,draft);
  assert.equal(selectSavedWork(null,draft).data.reason,'Newer legacy draft');
  assert.equal(selectSavedWork(null,null).data,null);
  assert.equal(selectSavedWork(submitted,{data:submitted.data}).preservedDraft,null);
  assert.equal(selectSavedWork({data:{...submitted.data,worksheetVersion:'v2.1'}},{data:submitted.data}).preservedDraft,null);
});
test('comparison shows accounting measurements and narrative without claiming equality',()=>{
  const rows=comparisonRows({pv:320000000,classification:'Operating lease'},{pv:164534153,classification:'Lessee right-of-use model'});
  assert.equal(rows[1][1],320000000);assert.equal(rows[1][2],164534153);assert.equal(rows.length,8);
});
test('validation rejects non-object and abusive or missing values',()=>{
  assert.ok(validateWorksheet(null,'lessee'));assert.ok(validateWorksheet([],'lessor'));assert.ok(validateWorksheet({classification:'Finance lease',pv:Infinity},'lessor'));
});
function noEntryWorksheet(){
  return {classification:'Operating lease',pv:320000000,firstInterest:0,reason:'Lessor retains risks and rewards.',statementImpact:'Rental income and depreciation.',reflection:'Lessee recognizes an ROU asset.',omitCommencement:true,commencementReason:'Asset already recognized; no cash, costs or reclassification at commencement.',journal:JSON.stringify([{event:'Year 1',account:'Cash',side:'Debit',amount:65000000},{event:'Year 1',account:'Rental income',side:'Credit',amount:65000000},{event:'Year 1',account:'Depreciation expense',side:'Debit',amount:32000000},{event:'Year 1',account:'Accumulated depreciation',side:'Credit',amount:32000000}])};
}
test('operating lessor can explain no commencement entry while retaining balanced Year 1 journals',()=>{
  const data=noEntryWorksheet();assert.equal(validateWorksheet(data,'lessor',{due:'end'}),null);
  assert.match(validateWorksheet({...data,commencementReason:''},'lessor',{due:'end'}),/Explain why/);
  assert.match(validateWorksheet({...data,journal:'[]'},'lessor',{due:'end'}),/Year 1/);
});
test('no-entry declaration cannot remove finance, lessee or prepaid commencement requirements',()=>{
  const data=noEntryWorksheet();
  assert.match(validateWorksheet({...data,classification:'Finance lease'},'lessor',{due:'end'}),/Commencement entries are required/);
  assert.match(validateWorksheet({...data,classification:'Lessee right-of-use model',rouAsset:320000000},'lessee',{due:'end'}),/Commencement entries are required/);
  assert.match(validateWorksheet(data,'lessor',{due:'beginning'}),/Commencement entries are required/);
  const lines=JSON.parse(data.journal);lines.push({event:'Commencement',account:'Equipment',side:'Debit',amount:1});
  assert.match(validateWorksheet({...data,journal:JSON.stringify(lines)},'lessor',{due:'end'}),/Remove commencement lines/);
});
