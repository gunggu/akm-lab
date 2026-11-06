import {caseData,scoreAnswers,validateAnswers,durationMs} from './scoring.js';
const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const error=(message,status=400)=>response({error:message},status);
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
const digest=async s=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
async function hmac(secret,payload){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(payload)));}
async function token(env,niu){const payload=`cl.${niu}.${Math.floor(Date.now()/1000)+12*3600}`;return `${payload}.${await hmac(env.TOKEN_SECRET,payload)}`;}
async function authStudent(request,env){const raw=(request.headers.get('authorization')||'').replace(/^Bearer /i,'');const p=raw.split('.');if(p.length!==4||p[0]!=='cl'||!/^\d{4,12}$/.test(p[1])||!/^\d+$/.test(p[2])||Number(p[2])<=Date.now()/1000)return null;const payload=p.slice(0,3).join('.');if((await hmac(env.TOKEN_SECRET,payload))!==p[3])return null;return await env.DB.prepare('SELECT niu,name FROM students WHERE niu=?').bind(p[1]).first();}
async function verifyPin(niu,pin,secret,stored){
 if(!stored)return false;
 if(!stored.startsWith('p2$'))return stored===await digest(`${niu}|${pin}|${secret}`);
 const [tag,iter,salt,expected]=stored.split('$');const n=Number(iter);
 if(!/^[a-f0-9]{32}$/.test(salt)||!Number.isInteger(n)||n<10000||n>200000||!/^[a-f0-9]{64}$/.test(expected))return false;
 const bytes=new Uint8Array(salt.match(/../g).map(x=>parseInt(x,16)));
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(`${niu}|${pin}|${secret}`),'PBKDF2',false,['deriveBits']);
 return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:bytes,iterations:n,hash:'SHA-256'},key,256))===expected;
}
async function hashPin(niu,pin,secret){const salt=crypto.getRandomValues(new Uint8Array(16));const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(`${niu}|${pin}|${secret}`),'PBKDF2',false,['deriveBits']);return `p2$100000$${hex(salt)}$${hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:100000,hash:'SHA-256'},key,256))}`;}
const admin=(req,env)=>{const a=req.headers.get('x-admin-key')||'',b=env.ADMIN_KEY||'';return !!b&&a.length===b.length&&a===b;};
const epoch=s=>s?Date.parse(String(s).replace(' ','T')+(String(s).includes('Z')?'':'Z')):NaN;
const isRunning=s=>s?.status==='running'&&Date.now()<epoch(s.ends_at);
const currentSession=async db=>db.prepare("SELECT * FROM cl_sessions ORDER BY id DESC LIMIT 1").first();
const enoughTime=s=>isRunning(s);
const publicSession=s=>s?{id:s.id,status:s.status,startedAt:s.started_at,endsAt:s.ends_at,remainingMs:s.status==='running'?Math.max(0,epoch(s.ends_at)-Date.now()):0}:null;
async function ready(env){if(!env.DB||!env.TOKEN_SECRET||!env.ADMIN_KEY)return false;try{await env.DB.prepare('SELECT niu,pin_hash FROM students LIMIT 0').all();await env.DB.prepare('SELECT id,status FROM cl_sessions LIMIT 0').all();await env.DB.prepare('SELECT session_id,niu FROM cl_attempts LIMIT 0').all();return true;}catch{return false;}}
function cleanCases(v){return caseData(v).map(({expected,...c})=>c);}
function rateKey(niu,ip){return digest(`changelab|${niu}|${ip}`);}
export default {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname.replace(/^\/change-lab(?=\/|$)/,'')||'/';
 if(path==='/api/health')return response({service:'change-lab',alive:true});
 if(path==='/'||path==='/admin'||path==='/app.js'){
  if(!['GET','HEAD'].includes(request.method))return error('Method not allowed',405);
  const resource=path==='/app.js'?'/app.js':'/index.html';
  const asset=await env.ASSETS.fetch(new URL(resource,request.url));const headers=new Headers(asset.headers);headers.set('cache-control','no-store');headers.set('x-content-type-options','nosniff');return new Response(asset.body,{status:asset.status,headers});
 }
 if(!path.startsWith('/api/'))return error('Not found',404);
 if(!await ready(env))return error('ChangeLab database setup incomplete. Instructor: apply schema.sql to existing D1 and configure TOKEN_SECRET/ADMIN_KEY.',503);
 if(request.method==='OPTIONS')return error('Method not allowed',405);
 if(['POST','PUT'].includes(request.method)&&!String(request.headers.get('content-type')||'').includes('application/json'))return error('JSON content type required',415);
 let body={};if(['POST','PUT'].includes(request.method)){try{body=await request.json()}catch{return error('Invalid JSON')}}
 try{
  if(path==='/api/login'&&request.method==='POST'){
   const niu=String(body.niu||'').trim(),pin=String(body.pin||'');if(!/^\d{4,12}$/.test(niu)||pin.length<8||pin.length>128)return error('Invalid NIU or PIN',401);
   // Shared login throttle table used by LeaseLab. Never write student records on successful login.
   const key=await rateKey(niu,request.headers.get('CF-Connecting-IP')||'unknown');
   const limit=await env.DB.prepare('SELECT failures,locked_until FROM login_limits WHERE id=?').bind(key).first();
   if(limit?.locked_until&&epoch(limit.locked_until)>Date.now())return error('Too many failed attempts. Retry later.',429);
   const user=await env.DB.prepare('SELECT niu,name,pin_hash FROM students WHERE niu=?').bind(niu).first();
   if(!user||!(await verifyPin(niu,pin,env.TOKEN_SECRET,user.pin_hash))){
    await env.DB.prepare("INSERT INTO login_limits(id,failures,locked_until) VALUES(?,1,NULL) ON CONFLICT(id) DO UPDATE SET failures=CASE WHEN locked_until IS NOT NULL AND locked_until<CURRENT_TIMESTAMP THEN 1 ELSE failures+1 END,locked_until=CASE WHEN failures>=4 THEN datetime('now','+15 minutes') ELSE NULL END").bind(key).run();return error('Invalid NIU or PIN',401);
   }
   await env.DB.prepare('DELETE FROM login_limits WHERE id=?').bind(key).run();
   return response({token:await token(env,niu),name:user.name,niu:user.niu});
  }
  if(path==='/api/enroll'&&request.method==='POST'){
   // Roster-verified enrollment with existing instructor-issued generic LeaseLab class code.
   const niu=String(body.niu||'').trim(),pin=String(body.pin||''),code=String(body.classCode||'').trim();
   if(!/^\d{4,12}$/.test(niu)||pin.length<8||pin.length>128||code.length<6||code.length>64)return error('Invalid enrollment details');
   const configured=await env.DB.prepare("SELECT value FROM settings WHERE key='enrollment_code_hash'").first();
   if(!configured||!(await verifyPin('class-enrollment',code,env.TOKEN_SECRET,configured.value)))return error('Class code not accepted',403);
   const hashed=await hashPin(niu,pin,env.TOKEN_SECRET);
   const insert=await env.DB.prepare("INSERT INTO students(niu,name,pin_hash,role,case_id) SELECT niu,name,?,'lessor',1 FROM roster WHERE niu=? AND NOT EXISTS(SELECT 1 FROM students WHERE students.niu=roster.niu)").bind(hashed,niu).run();
   if(insert.meta.changes!==1)return error('NIU already enrolled or not found on roster. Existing users should sign in.',403);
   await env.DB.prepare('UPDATE roster SET claimed_at=COALESCE(claimed_at,CURRENT_TIMESTAMP) WHERE niu=?').bind(niu).run();
   return response({token:await token(env,niu)});
  }
  if(path.startsWith('/api/admin/')){
   if(!admin(request,env))return error('Invalid instructor key',403);
   let s=await currentSession(env.DB);
   if(path==='/api/admin/new'&&request.method==='POST'){
    if(s&&['pending','running'].includes(s.status))return error('Close the existing session first.',409);
    await env.DB.prepare("INSERT INTO cl_sessions(status) VALUES('pending')").run();s=await currentSession(env.DB);return response({session:publicSession(s)});
   }
   if(path==='/api/admin/start'&&request.method==='POST'){
    if(!s||s.status!=='pending')return error('Create a pending session first.',409);
    const now=new Date(),end=new Date(now.getTime()+durationMs);
    const r=await env.DB.prepare("UPDATE cl_sessions SET status='running',started_at=?,ends_at=? WHERE id=? AND status='pending'").bind(now.toISOString(),end.toISOString(),s.id).run();
    if(r.meta.changes!==1)return error('Session start conflict.',409);
    return response({session:publicSession(await currentSession(env.DB))});
   }
   if(path==='/api/admin/close'&&request.method==='POST'){
    if(!s||!['pending','running'].includes(s.status))return error('No active session.',409);
    await env.DB.prepare("UPDATE cl_sessions SET status='closed',closed_at=CURRENT_TIMESTAMP WHERE id=? AND status IN ('pending','running')").bind(s.id).run();
    return response({session:publicSession(await currentSession(env.DB))});
   }
   if(path==='/api/admin/dashboard'&&request.method==='GET'){
    const students=await env.DB.prepare('SELECT COUNT(*) n FROM students').first();
    const attempts=s?(await env.DB.prepare('SELECT a.niu,st.name,a.variant,a.score,a.submitted_at,a.updated_at,a.answers FROM cl_attempts a JOIN students st ON st.niu=a.niu WHERE session_id=? ORDER BY st.name').bind(s.id).all()).results:[];
    return response({session:publicSession(s),studentCount:students.n,participants:attempts.length,submitted:attempts.filter(a=>a.submitted_at).length,average:attempts.some(a=>a.submitted_at)?Math.round(attempts.filter(a=>a.submitted_at).reduce((t,a)=>t+a.score,0)/attempts.filter(a=>a.submitted_at).length*10)/10:null,attempts:attempts.map(a=>({niu:a.niu,name:a.name,variant:a.variant,score:a.score,submitted_at:a.submitted_at,updated_at:a.updated_at,breakdown:a.submitted_at?scoreAnswers(a.variant,JSON.parse(a.answers)).breakdown:null})),key:s&& (s.status==='closed'||(s.status==='running'&&!isRunning(s)))?caseData(0).map(c=>({id:c.id,expected:c.expected})):null});
   }
   if(path==='/api/admin/export'&&request.method==='GET'){
    if(!s)return error('No session.',404);
    const data=(await env.DB.prepare('SELECT a.*,st.name FROM cl_attempts a JOIN students st ON a.niu=st.niu WHERE session_id=? ORDER BY a.niu').bind(s.id).all()).results;
    const escape=x=>'"'+String(x??'').replaceAll('"','""')+'"';
    const csv=[['session','niu','name','variant','score','submitted_at','answers'].map(escape).join(','),...data.map(x=>[x.session_id,x.niu,x.name,x.variant,x.score,x.submitted_at,x.answers].map(escape).join(','))].join('\r\n');
    return new Response(csv,{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':`attachment; filename="changelab-session-${s.id}.csv"`,'cache-control':'no-store'}});
   }
   return error('Unknown instructor action',404);
  }
  const student=await authStudent(request,env);if(!student)return error('Please sign in.',401);
  const s=await currentSession(env.DB);
  if(path==='/api/state'&&request.method==='GET'){
   const a=s?await env.DB.prepare('SELECT * FROM cl_attempts WHERE session_id=? AND niu=?').bind(s.id,student.niu).first():null;
   const final=!!a?.submitted_at;const ended=!!s&&(s.status==='closed'||(s.status==='running'&&!isRunning(s)));
   return response({student,session:publicSession(s),attempt:a?{answers:JSON.parse(a.answers),submitted:final,score:final&&ended?a.score:null,updatedAt:a.updated_at}:null,cases:a?cleanCases(a.variant):null,review:final&&ended?scoreAnswers(a.variant,JSON.parse(a.answers)).breakdown:null});
  }
  if(path==='/api/start'&&request.method==='POST'){
   if(!s||!enoughTime(s))return error('No running session. Ask your instructor to start the activity.',409);
   const variant=crypto.getRandomValues(new Uint32Array(1))[0]%3;
   await env.DB.prepare('INSERT OR IGNORE INTO cl_attempts(session_id,niu,variant) VALUES(?,?,?)').bind(s.id,student.niu,variant).run();
   const a=await env.DB.prepare('SELECT * FROM cl_attempts WHERE session_id=? AND niu=?').bind(s.id,student.niu).first();
   return response({session:publicSession(s),attempt:{answers:JSON.parse(a.answers),submitted:!!a.submitted_at},cases:cleanCases(a.variant)});
  }
  if(path==='/api/save'&&request.method==='POST'){
   if(!s||!enoughTime(s))return error('The 20-minute session has ended.',409);
   if(!validateAnswers(body.answers))return error('Invalid answers payload',400);
   const a=await env.DB.prepare('SELECT submitted_at FROM cl_attempts WHERE session_id=? AND niu=?').bind(s.id,student.niu).first();
   if(!a)return error('Start the activity before saving.',409);
   if(a.submitted_at)return error('Submission is locked.',409);
   const update=await env.DB.prepare('UPDATE cl_attempts SET answers=?,updated_at=CURRENT_TIMESTAMP WHERE session_id=? AND niu=? AND submitted_at IS NULL').bind(JSON.stringify(body.answers),s.id,student.niu).run();
   if(update.meta.changes!==1)return error('Save conflict.',409);
   return response({saved:true,at:new Date().toISOString()});
  }
  if(path==='/api/submit'&&request.method==='POST'){
   if(!s||!enoughTime(s))return error('The 20-minute session has ended.',409);
   if(!validateAnswers(body.answers))return error('Invalid answers payload',400);
   const a=await env.DB.prepare('SELECT variant,submitted_at FROM cl_attempts WHERE session_id=? AND niu=?').bind(s.id,student.niu).first();
   if(!a||a.submitted_at)return error('No active attempt or already submitted.',409);
   const grade=scoreAnswers(a.variant,body.answers);
   const r=await env.DB.prepare('UPDATE cl_attempts SET answers=?,score=?,submitted_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE session_id=? AND niu=? AND submitted_at IS NULL').bind(JSON.stringify(body.answers),grade.total,s.id,student.niu).run();
   if(r.meta.changes!==1)return error('Submission already finalized.',409);
   return response({submitted:true,message:'Answer sheet submitted. Results unlock after session ends.'});
  }
  return error('Endpoint not found',404);
 }catch(e){return error('Request could not be completed. Contact the instructor if it persists.',503)}
}};