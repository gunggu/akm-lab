import {caseFor,publicCase,fieldsFor,scoreSubmission,validateAnswers,DURATION_MS,verifyCase} from './model.js';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
const err=(message,status=400)=>json({error:message},status);
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
async function digest(s){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));}
async function mac(secret,payload){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(payload)));}
async function verifyPin(niu,pin,secret,stored){
 if(!stored)return false;
 if(!stored.startsWith('p2$'))return stored===await digest(`${niu}|${pin}|${secret}`);
 const [tag,iter,salt,want]=stored.split('$');let n=Number(iter);
 if(!/^[a-f0-9]{32}$/.test(salt)||!/^[a-f0-9]{64}$/.test(want)||!Number.isInteger(n)||n<10000||n>200000)return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(`${niu}|${pin}|${secret}`),'PBKDF2',false,['deriveBits']);
 const saltBytes=new Uint8Array(salt.match(/../g).map(v=>parseInt(v,16)));
 return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:saltBytes,iterations:n,hash:'SHA-256'},key,256))===want;
}
const issued=()=>new Date().toISOString();
async function token(env,niu){const payload=`cf.${niu}.${Math.floor(Date.now()/1000)+8*3600}`;return `${payload}.${await mac(env.TOKEN_SECRET,payload)}`;}
async function user(req,env){
 const raw=(req.headers.get('authorization')||'').replace(/^Bearer /i,'');const parts=raw.split('.');
 if(parts.length!==4||parts[0]!=='cf'||!/^[0-9]{4,12}$/.test(parts[1])||!/^\d+$/.test(parts[2])||Number(parts[2])<=Date.now()/1000)return null;
 const payload=parts.slice(0,3).join('.');if(await mac(env.TOKEN_SECRET,payload)!==parts[3])return null;
 return env.DB.prepare('SELECT niu,name FROM students WHERE niu=?').bind(parts[1]).first();
}
const admin=(req,env)=>{const x=req.headers.get('x-admin-key')||'',secret=env.ADMIN_KEY||'';return secret.length>0&&x.length===secret.length&&x===secret;};
const cur=db=>db.prepare('SELECT * FROM cf_sessions ORDER BY id DESC LIMIT 1').first();
const sessionData=s=>s?{id:s.id,status:s.status,variant:s.variant,startedAt:s.started_at,endsAt:s.ends_at,remainingMs:s.status==='running'?Math.max(0,Date.parse(s.ends_at)-Date.now()):0,expired:s.status==='running'&&Date.parse(s.ends_at)<=Date.now()}:null;
const open=s=>s?.status==='running'&&s.ends_at>issued();
const unlocked=s=>!s||s.status==='closed'||(s.status==='running'&&!open(s));
async function ready(env){if(!env.DB||!env.TOKEN_SECRET||!env.ADMIN_KEY)return false;try{
 await env.DB.batch([
  env.DB.prepare('SELECT niu,name,pin_hash FROM students LIMIT 0'),
  env.DB.prepare('SELECT id,status,variant FROM cf_sessions LIMIT 0'),
  env.DB.prepare('SELECT method,answers,score FROM cf_attempts LIMIT 0'),
  env.DB.prepare('SELECT id FROM cf_login_limits LIMIT 0')
 ]);return true;
 }catch{return false;}}
function csvEscape(x){return `"${String(x??'').replaceAll('"','""')}"`;}
function endpoint(r,env){return new URL(r.url).pathname.replace(/^\/cashflow-lab(?=\/|$)/,'')||'/';}
const onlySafe=(a,method)=>validateAnswers(method,a);
const signedDoc=c=>({case:publicCase(c),answerFields:fieldsFor('direct')});
export default {async fetch(req,env){
 const path=endpoint(req,env);
 if(path==='/api/health')return json({service:'cashflow-lab',version:'1.0.0',alive:true});
 if(path==='/'||path==='/admin'||path==='/app.js'){
  if(!['GET','HEAD'].includes(req.method))return err('Method not allowed',405);
  const resource=path==='/app.js'?'/app.js':'/index.html';
  const asset=await env.ASSETS.fetch(new URL(resource,req.url));
  const h=new Headers(asset.headers);h.set('cache-control','no-store');h.set('x-content-type-options','nosniff');h.set('referrer-policy','no-referrer');
  if(resource==='/index.html')h.set('content-security-policy',"default-src 'none'; base-uri 'none'; form-action 'self'; script-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:");
  return new Response(asset.body,{status:asset.status,headers:h});
 }
 if(path==='/api/ready'){const ok=await ready(env);return json({service:'cashflow-lab',ready:ok},ok?200:503);}
 if(!path.startsWith('/api/'))return err('Not found',404);
 if(!await ready(env))return err('CashFlow Lab not configured. Apply additive schema.sql and configure Worker secrets.',503);
 if(['POST','PUT'].includes(req.method)&&!String(req.headers.get('content-type')||'').includes('application/json'))return err('JSON request required',415);
 let body={};if(['POST','PUT'].includes(req.method)){try{body=await req.json()}catch{return err('Invalid JSON request')}}
 try {
  if(path==='/api/login'&&req.method==='POST'){
   const niu=String(body.niu??'').trim(),pin=String(body.pin??'');
   if(!/^\d{4,12}$/.test(niu)||pin.length<8||pin.length>128)return err('Incorrect NIU or PIN',401);
   const id=await digest(`cf|${niu}|${req.headers.get('CF-Connecting-IP')||'unknown'}`);
   const lock=await env.DB.prepare('SELECT failures,locked_until FROM cf_login_limits WHERE id=?').bind(id).first();
   if(lock?.locked_until&&lock.locked_until>issued())return err('Too many login attempts. Try again later.',429);
   const row=await env.DB.prepare('SELECT niu,name,pin_hash FROM students WHERE niu=?').bind(niu).first();
   if(!row||!(await verifyPin(niu,pin,env.TOKEN_SECRET,row.pin_hash))){
    const previous=Number(lock?.failures||0),fails=previous+1,locked=fails>=5?new Date(Date.now()+15*60*1000).toISOString():null;
    await env.DB.prepare('INSERT INTO cf_login_limits(id,failures,locked_until) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET failures=excluded.failures,locked_until=excluded.locked_until').bind(id,locked?0:fails,locked).run();
    return err('Incorrect NIU or PIN',401);
   }
   await env.DB.prepare('DELETE FROM cf_login_limits WHERE id=?').bind(id).run();
   return json({token:await token(env,niu),student:{niu:row.niu,name:row.name}});
  }
  if(path.startsWith('/api/admin/')){
   if(!admin(req,env))return err('Instructor access denied',403);
   let s=await cur(env.DB);
   if(path==='/api/admin/new'&&req.method==='POST'){
    if(s&&['pending','running'].includes(s.status))return err('Close current session first',409);
    const variant=Number(body.variant);if(![0,1,2].includes(variant))return err('Choose case A, B or C');
    await env.DB.prepare("INSERT INTO cf_sessions(status,variant) VALUES('pending',?)").bind(variant).run();s=await cur(env.DB);
    return json({session:sessionData(s)});
   }
   if(path==='/api/admin/start'&&req.method==='POST'){
    if(s?.status!=='pending')return err('Create a pending session first',409);
    const start=issued(),end=new Date(Date.now()+DURATION_MS).toISOString();
    const r=await env.DB.prepare("UPDATE cf_sessions SET status='running',started_at=?,ends_at=? WHERE id=? AND status='pending'").bind(start,end,s.id).run();
    if(r.meta.changes!==1)return err('Session start conflict',409);
    return json({session:sessionData(await cur(env.DB))});
   }
   if(path==='/api/admin/close'&&req.method==='POST'){
    if(!s||!['pending','running'].includes(s.status))return err('No active session',409);
    await env.DB.prepare("UPDATE cf_sessions SET status='closed',closed_at=? WHERE id=?").bind(issued(),s.id).run();
    return json({session:sessionData(await cur(env.DB))});
   }
   if(path==='/api/admin/dashboard'&&req.method==='GET'){
    const attempts=s?(await env.DB.prepare('SELECT a.niu,st.name,a.method,a.answers,a.score,a.submitted_at,a.updated_at FROM cf_attempts a JOIN students st ON st.niu=a.niu WHERE a.session_id=? ORDER BY st.name').bind(s.id).all()).results:[];
    const c=caseFor(s?.variant||0);
    const submitted=attempts.filter(a=>a.submitted_at);
    const diagnostics={};for(const a of submitted){
     const result=scoreSubmission(c,a.method,JSON.parse(a.answers));
     for(const key of result.diagnostics)diagnostics[`${a.method}:${key}`]=(diagnostics[`${a.method}:${key}`]||0)+1;
     for(const pattern of result.patterns)diagnostics[pattern]=(diagnostics[pattern]||0)+1;
    }
    return json({session:sessionData(s),participants:attempts.length,submitted:submitted.length,direct:attempts.filter(a=>a.method==='direct').length,indirect:attempts.filter(a=>a.method==='indirect').length,average:submitted.length?Math.round(submitted.reduce((total,a)=>total+a.score,0)/submitted.length*10)/10:null,diagnostics,
     attempts:attempts.map(a=>({niu:a.niu,name:a.name,method:a.method,score:a.score,submittedAt:a.submitted_at,updatedAt:a.updated_at,sectionScores:a.submitted_at?scoreSubmission(c,a.method,JSON.parse(a.answers)).sums:null})),
     instructorKey:s?{case:c,correct:{direct:c.direct,indirect:c.indirect,common:c.common,totals:{operating:c.operating,investing:c.investing,financing:c.financing,cash1:c.d.cash1}}}:null});
   }
   if(path==='/api/admin/export'&&req.method==='GET'){
    if(!s)return err('No session',404);
    const attempts=(await env.DB.prepare('SELECT a.*,st.name FROM cf_attempts a JOIN students st ON st.niu=a.niu WHERE a.session_id=? ORDER BY a.niu').bind(s.id).all()).results;
    const header=['session','niu','name','method','score','submitted_at','answers'];const csv=[header.map(csvEscape).join(','),...attempts.map(a=>[a.session_id,a.niu,a.name,a.method,a.score,a.submitted_at,a.answers].map(csvEscape).join(','))].join('\r\n');
    return new Response(csv,{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':`attachment; filename="cashflow-lab-session-${s.id}.csv"`,'cache-control':'no-store'}});
   }
   return err('Unknown instructor action',404);
  }
  const actor=await user(req,env);if(!actor)return err('Sign in with your existing NIU and PIN',401);
  const s=await cur(env.DB);
  if(path==='/api/join'&&req.method==='POST'){
   if(!s||!['pending','running'].includes(s.status)||s.status==='running'&&!open(s))return err('No class session accepting participants',409);
   // Single SQLite statement ensures balance using current counts at insertion. Existing assignment is immutable.
   await env.DB.prepare(`INSERT OR IGNORE INTO cf_attempts(session_id,niu,method)
    SELECT ?,?,CASE WHEN (SELECT COUNT(*) FROM cf_attempts WHERE session_id=? AND method='direct') < (SELECT COUNT(*) FROM cf_attempts WHERE session_id=? AND method='indirect') THEN 'direct'
    WHEN (SELECT COUNT(*) FROM cf_attempts WHERE session_id=? AND method='indirect') < (SELECT COUNT(*) FROM cf_attempts WHERE session_id=? AND method='direct') THEN 'indirect'
    WHEN abs(random())%2=0 THEN 'direct' ELSE 'indirect' END
    WHERE EXISTS(SELECT 1 FROM cf_sessions WHERE id=? AND status IN ('pending','running') AND (status='pending' OR ends_at>?))`
   ).bind(s.id,actor.niu,s.id,s.id,s.id,s.id,s.id,issued()).run();
   const attempt=await env.DB.prepare('SELECT method FROM cf_attempts WHERE session_id=? AND niu=?').bind(s.id,actor.niu).first();
   if(!attempt)return err('Cannot join this session',409);
   return json({method:attempt.method,session:sessionData(s)});
  }
  if(path==='/api/state'&&req.method==='GET'){
   const a=s?await env.DB.prepare('SELECT method,answers,score,submitted_at FROM cf_attempts WHERE session_id=? AND niu=?').bind(s.id,actor.niu).first():null;
   const complete=unlocked(s);
   const c=s?caseFor(s.variant):null;
   return json({student:actor,session:sessionData(s),method:a?.method||null,answers:a?JSON.parse(a.answers):{},submitted:!!a?.submitted_at,score:a?.submitted_at&&complete?a.score:null,
    breakdown:a?.submitted_at&&complete?scoreSubmission(c,a.method,JSON.parse(a.answers)).breakdown:null,
    case:a?publicCase(c):null,fields:a?fieldsFor(a.method):null});
  }
  if(path==='/api/save'&&req.method==='POST'||path==='/api/submit'&&req.method==='POST'){
   if(!open(s))return err('Class exercise is not running or has ended',409);
   const a=await env.DB.prepare('SELECT method,submitted_at FROM cf_attempts WHERE session_id=? AND niu=?').bind(s.id,actor.niu).first();
   if(!a)return err('Join the class exercise first',409);
   if(a.submitted_at)return err('Final submission is locked',409);
   if(!onlySafe(body.answers,a.method))return err('Invalid answer data',400);
   const answers=JSON.stringify(body.answers);const isSubmit=path==='/api/submit';
   const c=caseFor(s.variant);const scored=isSubmit?scoreSubmission(c,a.method,body.answers):null;
   const t=issued();
   const update=await env.DB.prepare(`UPDATE cf_attempts SET answers=?,updated_at=?,score=?,submitted_at=?
     WHERE session_id=? AND niu=? AND submitted_at IS NULL
     AND EXISTS(SELECT 1 FROM cf_sessions WHERE id=? AND status='running' AND ends_at>?)`)
    .bind(answers,t,isSubmit?scored.score:null,isSubmit?t:null,s.id,actor.niu,s.id,t).run();
   if(update.meta.changes!==1)return err('Response was not accepted; deadline or submission state changed',409);
   return json({saved:!isSubmit,submitted:isSubmit});
  }
  return err('Unknown student action',404);
 }catch(e){console.error('cashflow-lab-error',String(e).slice(0,400));return err('Unexpected server error. No data were changed deliberately.',500);}
}};