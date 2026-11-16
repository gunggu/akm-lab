import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import worker from '../worker.js';import {caseFor} from '../model.js';
class MockD1{
 constructor(){this.db=new DatabaseSync(':memory:');}
 prepare(sql){return new Stmt(this.db,sql,[])}
 async batch(stmts){return Promise.all(stmts.map(s=>s.all()))}
 exec(sql){this.db.exec(sql)}
}
class Stmt{
 constructor(db,sql,args){this.db=db;this.sql=sql;this.args=args}
 bind(...args){return new Stmt(this.db,this.sql,args)}
 async first(){const x=this.db.prepare(this.sql).get(...this.args);return x||null}
 async all(){return {results:this.db.prepare(this.sql).all(...this.args)}}
 async run(){const r=this.db.prepare(this.sql).run(...this.args);return {meta:{changes:r.changes}}}
}
const mkEnv=()=>{const DB=new MockD1();DB.exec('CREATE TABLE students(niu TEXT PRIMARY KEY,name TEXT NOT NULL,pin_hash TEXT NOT NULL,role TEXT NOT NULL,case_id INTEGER NOT NULL);');DB.exec(readFileSync(new URL('../schema.sql',import.meta.url),'utf8'));for(let i=1;i<=10;i++){const niu=String(1000+i),pin='password'+i,secret='test-shared-student-secret';const hashed=createHash('sha256').update(niu+'|'+pin+'|'+secret).digest('hex');DB.prepare('INSERT INTO students(niu,name,pin_hash,role,case_id) VALUES(?,?,?, ?,1)').bind(niu,'Student '+i,hashed,'lessor').run();}return {DB,TOKEN_SECRET:'test-shared-student-secret',ADMIN_KEY:'test-instructor-secret',ASSETS:{fetch:async()=>new Response('<html></html>',{headers:{'content-type':'text/html'}})}};};
const req=(path,method='GET',data=null,headers={})=>new Request('https://example.org/cashflow-lab'+path,{method,headers:{...(data!==null?{'content-type':'application/json'}:{}),...headers},body:data!==null?JSON.stringify(data):undefined});
async function call(env,path,method='GET',data=null,headers={}){const r=await worker.fetch(req(path,method,data,headers),env);const j=await r.json();return {status:r.status,...j};}
const instr={'x-admin-key':'test-instructor-secret'};
test('Shared login, privacy, balanced allocation, server start, immutable final submission, dashboard and replay',async()=>{
 const env=mkEnv();assert.equal((await call(env,'/api/ready')).ready,true);
 assert.equal((await call(env,'/api/admin/new','POST',{variant:0},{})).status,403);
 const sessions=await call(env,'/api/admin/new','POST',{variant:0},instr);assert.equal(sessions.session.status,'pending');
 const tokens=[];for(let i=1;i<=10;i++){const niu=String(1000+i);const login=await call(env,'/api/login','POST',{niu,pin:'password'+i});assert.equal(login.status,200);tokens.push(login.token);const joined=await call(env,'/api/join','POST',{}, {authorization:'Bearer '+login.token});assert.equal(joined.status,200);}
 let panel=await call(env,'/api/admin/dashboard','GET',null,instr);assert.equal(panel.direct,5);assert.equal(panel.indirect,5);assert.equal(panel.participants,10);
 const auth={authorization:'Bearer '+tokens[0]};let state=await call(env,'/api/state','GET',null,auth);assert.equal(state.status,200);assert.equal(state.score,null);assert.equal(state.case.notes.length,7);assert.equal(state.case.operating,undefined);assert.equal(state.case.d,undefined);
 assert.equal((await call(env,'/api/save','POST',{answers:{}},auth)).status,409);
 await call(env,'/api/admin/start','POST',{},instr);
 const x=await call(env,'/api/save','POST',{answers:{operating:{}}},auth);assert.equal(x.saved,true);
 const finish=await call(env,'/api/submit','POST',{answers:{}},auth);assert.equal(finish.submitted,true);assert.equal((await call(env,'/api/submit','POST',{answers:{}},auth)).status,409);
 state=await call(env,'/api/state','GET',null,auth);assert.equal(state.score,null,'Scores are embargoed during running period');
 panel=await call(env,'/api/admin/dashboard','GET',null,instr);assert.equal(panel.submitted,1);assert.equal(panel.attempts[0].score,0);
 await call(env,'/api/admin/close','POST',{},instr);state=await call(env,'/api/state','GET',null,auth);assert.equal(state.score,0);assert(state.breakdown.length>10);
 const next=await call(env,'/api/admin/new','POST',{variant:2},instr);assert.equal(next.session.variant,2);assert.equal(next.session.status,'pending');
 assert.equal((await call(env,'/api/join','POST',{},auth)).status,200);
});
test('Login throttling and unauthorized access cannot expose answers',async()=>{const env=mkEnv();for(let i=0;i<5;i++)assert.equal((await call(env,'/api/login','POST',{niu:'1001',pin:'wrong-pass'})).status,401);assert.equal((await call(env,'/api/login','POST',{niu:'1001',pin:'password1'})).status,429);assert.equal((await call(env,'/api/admin/dashboard')).status,403);assert.equal((await call(env,'/api/state')).status,401);});