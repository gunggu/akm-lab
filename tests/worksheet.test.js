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
  assert.equal(rows[1][1],320000000);assert.equal(rows[1][2],164534153);assert.equal(rows.length,7);
});
test('validation rejects non-object and abusive or missing values',()=>{
  assert.ok(validateWorksheet(null,'lessee'));assert.ok(validateWorksheet([],'lessor'));assert.ok(validateWorksheet({classification:'Finance lease',pv:Infinity},'lessor'));
});
