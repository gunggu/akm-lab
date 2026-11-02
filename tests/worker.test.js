import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker, { CASES, model } from '../worker.js';

// Disposable in-memory SQLite implements the D1 surface used by this Worker.
// This exercises SQL, transactions and HTTP behavior without production access.
class D1 {
  constructor() { this.sqlite = new DatabaseSync(':memory:'); this.sqlite.exec('PRAGMA foreign_keys=ON'); }
  prepare(sql) {
    const db=this.sqlite;
    const executeWith=args=>{const stmt=db.prepare(sql); if(stmt.columns().length)return {results:stmt.all(...args),meta:{changes:0}};const r=stmt.run(...args);return {results:[],meta:{changes:Number(r.changes)}};};
    // Keep bound execution synchronous so a batch is one SQLite transaction.
    const bound=args=>({bind:(...v)=>bound(v),first:async()=>db.prepare(sql).get(...args)||null,all:async()=>({results:db.prepare(sql).all(...args)}),run:async()=>executeWith(args),execute:()=>executeWith(args)});
    return bound([]);
  }
  async batch(statements) {
    this.sqlite.exec('BEGIN');
    try { const output=statements.map(statement=>statement.execute());this.sqlite.exec('COMMIT');return output; }
    catch(error) { this.sqlite.exec('ROLLBACK');throw error; }
  }
}
const ADMIN='disposable-instructor-key';
async function request(env,path,{data,token,admin=false,raw,method}={}) {
  const headers={};if(admin)headers['X-Admin-Key']=ADMIN;if(token)headers.Authorization='Bearer '+token;
  if(data!==undefined||raw!==undefined)headers['content-type']='application/json';
  const response=await worker.fetch(new Request('https://example.test'+path,{method:method||(data!==undefined||raw!==undefined?'POST':'GET'),headers,body:raw??(data!==undefined?JSON.stringify(data):undefined)}),env);
  const text=await response.text();let body;try{body=JSON.parse(text);}catch{body=text;}
  return {status:response.status,body,headers:response.headers};
}
async function setup() {
  const env={DB:new D1(),TOKEN_SECRET:'test-only-token-secret',ADMIN_KEY:ADMIN,BUILD_ID:'test-build',ASSETS:{fetch:async url=>new Response(readFileSync(new URL('../public'+url.pathname,import.meta.url)),{headers:{'content-type':url.pathname.endsWith('.js')?'application/javascript':'text/html'}})}};
  env.DB.sqlite.exec(readFileSync(new URL('../schema.sql',import.meta.url),'utf8'));
  assert.equal((await request(env,'/api/admin/migrate',{admin:true,data:{}})).status,200);
  return env;
}
async function enroll(env,niu) {
  const code='test-enrollment-'+niu;
  const hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(niu+'|'+code))).toString('hex');
  env.DB.sqlite.prepare('INSERT INTO roster(niu,name,access_hash,role,case_id) VALUES(?,?,?,\'lessor\',1)').run(niu,'Test '+niu,hash);
  const result=await request(env,'/api/register',{data:{niu,pin:'test-only-pin',classCode:code}});
  assert.equal(result.status,200);return result.body.token;
}
async function pair() {
  const env=await setup(),a=await enroll(env,'9001'),b=await enroll(env,'9002');
  assert.equal((await request(env,'/api/admin/allocate',{admin:true,data:{}})).status,200);
  const aMe=(await request(env,'/api/me',{token:a})).body;
  const tokens={lessor:aMe.user.role==='lessor'?a:b,lessee:aMe.user.role==='lessee'?a:b};
  await request(env,'/api/match',{token:a,data:{partnerNiu:'9002'}});
  const bMe=(await request(env,'/api/me',{token:b})).body;
  assert.equal((await request(env,'/api/confirm',{token:b,data:{interactionId:bMe.partners[0].interactionId}})).status,200);
  return {env,a,b,...tokens};
}
function answer(role) {
  return {classification:role==='lessor'?'Finance lease':'Lessee right-of-use model',pv:'728667905',rouAsset:'728667905',firstInterest:'58293432',reason:'Risks and rewards assessed.',statementImpact:'Receivable or ROU asset and liability.',reflection:'Explain selling profit and interest separately.',journal:JSON.stringify(['Commencement','Year 1'].flatMap(event=>[{event,account:'Test debit',side:'Debit',amount:100},{event,account:'Test credit',side:'Credit',amount:100}]))};
}

test('Case 3 separates commencement cash, receivable, ROU and selling profit',()=>{
  const result=model(CASES[2]);
  assert.equal(result.cashAtCommencement,110000000);assert.equal(result.lessorNetInvestment,198881998);
  assert.equal(result.leaseLiabilityAtCommencement,198881998);assert.equal(result.rouAsset,308881998);
  assert.equal(result.lessorRevenue,308881998);assert.equal(result.sellingProfit,58881998);
  assert.equal(result.lessorFinanceIncome,13921740);
});
test('all five cases agree with independently discounted payment schedules',()=>{
  for(const c of CASES){const start=c.due==='beginning'?0:1;let total=0;for(let i=0;i<c.years;i++)total+=c.rent/(1+c.rate)**(i+start);assert.equal(model(c).pv,Math.round(total));assert.equal(model(c).leaseLiabilityAtCommencement,Math.round(total-(start===0?c.rent:0)));}
  assert.equal(model(CASES[1]).lessorInitialMeasurement,320000000);
  assert.equal(model(CASES[3]).lessorInitialMeasurement,420000000);
});
test('health is liveness; readiness detects configuration, schema and complete setup',async()=>{
  assert.equal((await request({},'/api/health')).status,200);
  assert.equal((await request({},'/api/ready')).status,503);
  const env=await setup();assert.equal((await request(env,'/lease-lab/api/ready')).body.ready,true);
  env.DB.sqlite.exec('DROP TABLE login_limits');assert.equal((await request(env,'/api/ready')).status,503);
  assert.equal((await request(env,'/api/health')).status,200);
});
test('page routes, trailing slash redirect and module assets work at both bases',async()=>{
  const env=await setup();
  for(const base of ['','/lease-lab']){
    assert.equal((await request(env,base+'/')).status,200);
    assert.equal((await request(env,base+'/admin')).status,200);
    const redirect=await request(env,base+'/admin/');assert.equal(redirect.status,308);assert.equal(redirect.headers.get('location'),'https://example.test'+base+'/admin');
    for(const file of ['/app.js','/worksheet.js']){const asset=await request(env,base+file);assert.equal(asset.status,200);assert.equal(asset.headers.get('content-type'),'application/javascript');}
  }
  assert.equal((await request(env,'/missing-page')).status,404);
});
test('unauthorized admin access reveals neither dashboard nor setup state',async()=>{
  const env=await setup();assert.equal((await request(env,'/api/admin')).status,403);
  env.DB.sqlite.exec('DROP TABLE drafts');assert.equal((await request(env,'/api/admin')).status,403);
});
test('54 attendees allocate exactly 27 lessors and 27 lessees with paired case quotas',async()=>{
  const env=await setup();
  for(let i=0;i<54;i++)env.DB.sqlite.prepare("INSERT INTO students(niu,name,pin_hash,role,case_id) VALUES(?,?,?,'lessor',1)").run(String(9100+i),'Disposable attendee '+i,'not-a-login-fixture');
  const allocation=await request(env,'/api/admin/allocate',{admin:true,data:{}});assert.equal(allocation.status,200);
  assert.deepEqual(allocation.body.groups.map(group=>[group.lessors,group.lessees]),[[6,6],[6,6],[5,5],[5,5],[5,5]]);
  assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) n FROM students WHERE role='lessor'").get().n,27);
  assert.equal((await request(env,'/api/admin/allocate',{admin:true,data:{}})).status,409);
});
test('register, waiting state, login, allocation and bilateral confirmation',async()=>{
  const env=await setup(),token=await enroll(env,'9001');
  assert.equal((await request(env,'/api/me',{token})).body.waiting,true);
  const login=await request(env,'/api/login',{data:{niu:'9001',pin:'test-only-pin'}});assert.equal(login.status,200);
  const p=await pair();assert.equal((await request(p.env,'/api/me',{token:p.a})).body.partners[0].status,'confirmed');
});
test('first submission is immutable, drafts preserved, peer answers gated',async()=>{
  const p=await pair(),draft=answer('lessor');draft.reason='Saved draft before first submission';
  assert.equal((await request(p.env,'/api/draft',{token:p.lessor,data:{data:draft}})).status,200);
  const first=answer('lessor');assert.equal((await request(p.env,'/api/submit',{token:p.lessor,data:{data:first}})).status,200);
  let me=(await request(p.env,'/api/me',{token:p.lessor})).body;assert.equal(me.comparisons.length,0);
  assert.equal((await request(p.env,'/api/submit',{token:p.lessee,data:{data:answer('lessee')}})).status,200);
  me=(await request(p.env,'/api/me',{token:p.lessor})).body;assert.equal(me.comparisons.length,1);
  const changed={...first,reason:'Changed after viewing peer'};
  assert.equal((await request(p.env,'/api/submit',{token:p.lessor,data:{data:changed}})).status,409);
  assert.equal((await request(p.env,'/api/draft',{token:p.lessor,data:{data:changed}})).status,409);
  me=(await request(p.env,'/api/me',{token:p.lessor})).body;assert.equal(me.submission.data.reason,first.reason);assert.equal(me.draft.data.reason,draft.reason);
  assert.equal(me.submission.data.worksheetVersion,'v2.1');
  assert.equal(p.env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM audit_events WHERE action='submit-first'").get().n,2);
});
test('late arrivals can be assigned while late check-in remains open',async()=>{
  const p=await pair();assert.equal((await request(p.env,'/api/admin/reopen',{admin:true,data:{}})).status,200);
  const late=await enroll(p.env,'9003');assert.equal((await request(p.env,'/api/me',{token:late})).body.waiting,true);
  assert.equal((await request(p.env,'/api/queue',{token:late})).status,409);
  assert.equal((await request(p.env,'/api/admin/late',{admin:true,data:{niu:'9003',role:'lessee',caseId:1}})).status,200);
  assert.equal((await request(p.env,'/api/me',{token:late})).body.user.role,'lessee');
});
test('closure blocks drafts and submissions; reset preserves existing work',async()=>{
  const p=await pair();
  assert.equal((await request(p.env,'/api/admin/reset',{admin:true,data:{confirm:'RESET_UNSTARTED_SESSION'}})).status,409);
  await request(p.env,'/api/admin/close-submissions',{admin:true,data:{}});
  assert.equal((await request(p.env,'/api/draft',{token:p.lessor,data:{data:answer('lessor')}})).status,403);
  assert.equal((await request(p.env,'/api/submit',{token:p.lessor,data:{data:answer('lessor')}})).status,403);
});
test('server rejects wrong role, invalid numeric amounts, unexpected events and unbalanced journals',async()=>{
  const p=await pair();
  for(const patch of [{classification:'Operating lease'},{pv:'NaN'},{firstInterest:-1},{rouAsset:''}])assert.equal((await request(p.env,'/api/submit',{token:p.lessee,data:{data:{...answer('lessee'),...patch}}})).status,400);
  const invalid=answer('lessee'),lines=JSON.parse(invalid.journal);lines[0].event='Unexpected event';invalid.journal=JSON.stringify(lines);
  assert.equal((await request(p.env,'/api/submit',{token:p.lessee,data:{data:invalid}})).status,400);
  lines[0].event='Commencement';lines[0].amount=200;invalid.journal=JSON.stringify(lines);
  assert.equal((await request(p.env,'/api/submit',{token:p.lessee,data:{data:invalid}})).status,400);
});
test('malformed JSON and unauthorized student calls return useful errors',async()=>{
  const env=await setup();assert.equal((await request(env,'/api/register',{raw:'{'})).status,400);assert.equal((await request(env,'/api/me')).status,401);
  assert.equal((await request(env,'/lease-lab',{raw:'niu=example&pin=not-real'})).status,405);
});
test('concurrent first submissions preserve exactly one accepted answer',async()=>{
  const p=await pair();const first=answer('lessor'),second={...first,reason:'Another concurrent answer'};
  const results=await Promise.all([request(p.env,'/api/submit',{token:p.lessor,data:{data:first}}),request(p.env,'/api/submit',{token:p.lessor,data:{data:second}})]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
  assert.equal(p.env.DB.sqlite.prepare('SELECT COUNT(*) n FROM submissions').get().n,1);
  assert.equal(p.env.DB.sqlite.prepare("SELECT COUNT(*) n FROM audit_events WHERE action='submit-first'").get().n,1);
});
