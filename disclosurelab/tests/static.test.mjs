import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const student = readFileSync(new URL('../index.html',import.meta.url),'utf8');
const review = readFileSync(new URL('../review.html',import.meta.url),'utf8');
const script = doc => {
 const match=doc.match(/<script>([\s\S]*?)<\/script>/);
 assert.ok(match,'single inline application script exists');
 return match[1];
};
test('all scripts are syntactically valid',()=>{
 assert.doesNotThrow(()=>new Script(script(student)));
 assert.doesNotThrow(()=>new Script(script(review)));
});
test('student-facing source contains evidence, workpaper and export but no answer or grading engine',()=>{
 for(const id of ['id:\'A\'','id:\'B\'','id:\'C\'','id:\'D\'','id:\'E\'','id:\'F\''])assert.ok(student.includes(id));
 for(const id of ['w1','w2','w3','w4','w5','w6','w7'])assert.ok(student.includes("id:'"+id+"'"));
 for(const banned of ['answerKey','correctAnswer','expectedAnswer','modelSolution','scoreSubmission','gradeSubmission','chatgpt','ignore previous instructions','as an ai','prompt injection','solution:']){
  assert.ok(!student.toLowerCase().includes(banned.toLowerCase()),banned);
 }
 assert.ok(student.includes('application/json'));
 assert.ok(!/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b/.test(student));
});
test('browser input is handled as data',()=>{
 assert.ok(student.includes('textarea.value'));
 assert.ok(student.includes('JSON.stringify(payload,null,2)'));
 assert.ok(!/\.innerHTML\s*=\s*[^;]*responses\b/.test(student));
 assert.ok(review.includes('p.textContent=safe(r.responses[key]'));
});
test('reviewer checks the file format and limits file size',()=>{
 assert.ok(review.includes("file.size>300000"));
 assert.ok(review.includes('function valid(o)'));
 assert.ok(review.includes('csvCell'));
});
