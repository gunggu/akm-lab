import { validateWorksheet } from "./public/worksheet.js";
import { buildInstructorGuide } from "./instructor-guide.js";
export const CASES=[
{id:1,brand:"Astra Precision Machines",asset:"CNC machining center",lesseeCompany:"Pratama Aerospace Components",cost:580000000,fv:728667905,rent:220000000,years:4,life:5,rate:0.08,due:"end",residual:0,leaseType:"finance",note:"A highly specialized machine; a substantial portion of its economic life is leased."},
{id:2,brand:"Nusantara Packaging Systems",asset:"Modular packaging line",lesseeCompany:"Bumi Segar Foods",cost:320000000,fv:490000000,rent:65000000,years:3,life:10,rate:0.09,due:"end",residual:300000000,leaseType:"operating",note:"The lessor retains the equipment and significant residual-value exposure."},
{id:3,brand:"Cakra Industrial Print",asset:"Industrial label printer",lesseeCompany:"Satria Medical Labels",cost:250000000,fv:308881998,rent:110000000,years:3,life:4,rate:0.07,due:"beginning",residual:0,leaseType:"finance",note:"Most of the printer's economic life is covered by the contract."},
{id:4,brand:"Garuda Cold Chain Equipment",asset:"Refrigeration equipment fleet",lesseeCompany:"Aruna Fresh Logistics",cost:420000000,fv:600000000,rent:80000000,years:3,life:9,rate:0.08,due:"end",residual:390000000,leaseType:"operating",note:"The lessor expects substantial use and residual value following the lease."},
{id:5,brand:"Merapi Automation Works",asset:"Robotic manufacturing arm",lesseeCompany:"Baskara Automotive Parts",cost:600000000,fv:887562325,rent:280000000,years:4,life:5,rate:0.10,due:"end",residual:0,leaseType:"finance",note:"The lease spans most of useful life, and lease payments recover substantially all fair value."}
];
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const fail=(m,s=400)=>json({error:m},s);
async function digest(text){let bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));return Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,"0")).join("");}
async function signature(env,payload){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(env.TOKEN_SECRET),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const sig=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(payload));return Array.from(new Uint8Array(sig)).map(x=>x.toString(16).padStart(2,"0")).join("");}
async function token(env,niu){let payload=niu+"."+Math.floor(Date.now()/1000+12*3600);return payload+"."+await signature(env,payload);}
async function actor(req,env){let t=(req.headers.get("Authorization")||"").replace(/^Bearer /,"");let p=t.split(".");if(p.length!==3||!(/^\d{4,12}$/.test(p[0]))||Number(p[1])<Date.now()/1000)return null;let expected=await signature(env,p[0]+"."+p[1]);if(expected!==p[2])return null;return await env.DB.prepare("SELECT niu,name,role,case_id,assigned_at FROM students WHERE niu=?").bind(p[0]).first();}

const round=n=>Math.round(n);
const presentValue=c=>c.rent*((1-(1+c.rate)**(-c.years))/c.rate)*(c.due==="beginning"?1+c.rate:1);
export const model=c=>{
 const pv=presentValue(c),commencementCash=c.due==="beginning"?c.rent:0,firstInterest=(pv-(c.due==="beginning"?c.rent:0))*c.rate,fin=c.leaseType==="finance";
 const revenue=fin?Math.min(c.fv,pv):0,costSales=fin?c.cost:0;
 return {classification:c.leaseType,pv:round(pv),leaseLiabilityAtCommencement:round(pv-(c.due==="beginning"?c.rent:0)),rouAsset:round(pv),cashAtCommencement:commencementCash,lessorInitialMeasurement:fin?round(pv-commencementCash):c.cost,lessorNetInvestment:fin?round(pv-commencementCash):null,firstInterest:round(firstInterest),lesseeInterest:round(firstInterest),lessorFinanceIncome:fin?round(firstInterest):0,lessorRevenue:round(revenue),lessorCostOfSales:round(costSales),sellingProfit:round(revenue-costSales),operatingDepreciation:!fin?round(c.cost/c.life):null,operatingRentalIncome:!fin?c.rent:null,lesseeDepreciation:round(pv/c.years),timing:c.due};
};
const result=(r,k)=>r?.results||[];
const setting=async(env,key)=>((await env.DB.prepare("SELECT value FROM settings WHERE key=?").bind(key).first())||{}).value;
const authAdmin=(r,env)=>{const a=r.headers.get("X-Admin-Key")||"",b=env.ADMIN_KEY||"";return !!b&&a.length===b.length&&a===b;};
async function pinDigest(niu,pin,secret){
 const salt=new Uint8Array(16);crypto.getRandomValues(salt);
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(niu+"|"+pin+"|"+secret),"PBKDF2",false,["deriveBits"]);
 const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt,iterations:100000,hash:"SHA-256"},key,256);
 return "p2$100000$"+Array.from(salt,b=>b.toString(16).padStart(2,"0")).join("")+"$"+Array.from(new Uint8Array(bits),b=>b.toString(16).padStart(2,"0")).join("");
}
async function verifyPin(niu,pin,secret,stored){
 if(!stored)return false;
 if(!stored.startsWith("p2$"))return stored===await digest(niu+"|"+pin+"|"+secret);
 const [tag,iter,salt,expected]=stored.split("$");
 if(!/^[a-f0-9]{32}$/.test(salt)||!Number.isInteger(+iter)||+iter>200000||+iter<10000)return false;
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(niu+"|"+pin+"|"+secret),"PBKDF2",false,["deriveBits"]);
 const bytes=new Uint8Array(salt.match(/../g).map(x=>parseInt(x,16)));
 const derived=await crypto.subtle.deriveBits({name:"PBKDF2",salt:bytes,iterations:+iter,hash:"SHA-256"},key,256);
 const hex=Array.from(new Uint8Array(derived),b=>b.toString(16).padStart(2,"0")).join("");
 return hex===expected;
}
const safeCase=(c,role)=>role==="lessor"?((({leaseType,note,...v})=>({...v,note}))(c)):((({cost,leaseType,note,...v})=>({...v,note}))(c));
async function audit(env,actor,action,details=""){await env.DB.prepare("INSERT INTO audit_events(actor,action,details) VALUES(?,?,?)").bind(actor,action,details).run();}
async function panel(env){
 const students=result(await env.DB.prepare("SELECT niu,name,role,case_id,assigned_at,created_at FROM students ORDER BY created_at,niu").all());
 const interactions=result(await env.DB.prepare("SELECT * FROM interactions ORDER BY id").all());
 const submissions=result(await env.DB.prepare("SELECT * FROM submissions ORDER BY submitted_at").all()).map(x=>({...x,data:JSON.parse(x.data)}));
 const drafts=result(await env.DB.prepare("SELECT niu,updated_at FROM drafts").all());
 return {students,interactions,submissions,drafts,allocation:await setting(env,"allocation")||"open",cases:CASES.map(c=>({...c,expected:model(c)}))};
}

async function migrate(env){
 const db=env.DB;
 await db.prepare("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY,value TEXT NOT NULL)").run();
 await db.prepare("INSERT OR IGNORE INTO settings(key,value) VALUES('allocation','open')").run();
 await db.prepare("CREATE TABLE IF NOT EXISTS interactions (id INTEGER PRIMARY KEY AUTOINCREMENT,case_id INTEGER NOT NULL,lessor_niu TEXT NOT NULL REFERENCES students(niu),lessee_niu TEXT NOT NULL REFERENCES students(niu),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(lessor_niu,lessee_niu))").run();
 const add=async(table,column,ddl)=>{
  const columns=(await db.prepare("PRAGMA table_info("+table+")").all()).results.map(x=>x.name);
  if(!columns.includes(column)){
   try{await db.prepare("ALTER TABLE "+table+" ADD COLUMN "+ddl).run();}
   catch(e){if(!String(e.message).includes("duplicate column name"))throw e;}
  }
 };
 await add("students","assigned_at","assigned_at TEXT");
 await add("interactions","status","status TEXT NOT NULL DEFAULT 'requested'");
 await add("interactions","initiated_by","initiated_by TEXT");
 await add("interactions","confirmed_at","confirmed_at TEXT");
 await db.prepare("CREATE TABLE IF NOT EXISTS allocation_guard (id TEXT PRIMARY KEY)").run();
 await db.prepare("CREATE TABLE IF NOT EXISTS drafts (niu TEXT PRIMARY KEY REFERENCES students(niu),data TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
 await db.prepare("CREATE TABLE IF NOT EXISTS audit_events (id INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT NOT NULL,action TEXT NOT NULL,details TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
 await db.prepare("CREATE TABLE IF NOT EXISTS login_limits (id TEXT PRIMARY KEY,failures INTEGER NOT NULL DEFAULT 0,locked_until TEXT)").run();
 await db.prepare("INSERT OR IGNORE INTO settings(key,value) VALUES('submissions','open')").run();
 await db.prepare("UPDATE settings SET value='active' WHERE key='allocation' AND value='closed'").run();
 await db.prepare("UPDATE interactions SET initiated_by=lessor_niu WHERE initiated_by IS NULL").run();
 await db.prepare("CREATE INDEX IF NOT EXISTS idx_interactions_status ON interactions(status)").run();
}

async function probeReadiness(env){
 if(!env.DB||!env.TOKEN_SECRET||!env.ADMIN_KEY)return {ok:false,reason:"configuration-pending"};
 try{
  const checks=[
   "SELECT niu,name,pin_hash,role,case_id,assigned_at,created_at FROM students LIMIT 0",
   "SELECT niu,name,access_hash,claimed_at FROM roster LIMIT 0",
   "SELECT niu,data,submitted_at FROM submissions LIMIT 0",
   "SELECT key,value FROM settings LIMIT 0",
   "SELECT id,case_id,lessor_niu,lessee_niu,status,initiated_by,confirmed_at FROM interactions LIMIT 0",
   "SELECT id FROM allocation_guard LIMIT 0", "SELECT niu,data,updated_at FROM drafts LIMIT 0",
   "SELECT actor,action,details FROM audit_events LIMIT 0", "SELECT id,failures,locked_until FROM login_limits LIMIT 0"
  ];
  await env.DB.batch(checks.map(sql=>env.DB.prepare(sql)));
  for(const key of ["allocation","submissions"])if(!await setting(env,key))return {ok:false,reason:"setup-pending"};
  return {ok:true,reason:"ready"};
 }catch{return {ok:false,reason:"database-or-schema-unavailable"};}
}

async function readiness(env){
 let timer;
 try{return await Promise.race([probeReadiness(env),new Promise(resolve=>{timer=setTimeout(()=>resolve({ok:false,reason:"database-timeout"}),5000);})]);}
 finally{clearTimeout(timer);}
}

export default {async fetch(request,env){
 const url=new URL(request.url),path=url.pathname.replace(/^\/lease-lab(?=\/|$)/,"")||"/";
 if(path==="/admin/"){
  url.pathname=url.pathname.slice(0,-1);
  return new Response(null,{status:308,headers:{location:url.toString()}});
 }
 if(path==="/api/health")return json({service:"lease-lab",version:"v2.2",route:"ok",readiness:"use-api-ready",build:env.BUILD_ID||"unreported"});
 if(path==="/api/ready"){
  const ready=await readiness(env);
  return json({service:"lease-lab",version:"v2.2",ready:ready.ok,reason:ready.reason,build:env.BUILD_ID||"unreported"},ready.ok?200:503);
 }
 if(path==="/"||path==="/admin"||["/worksheet.js","/app.js"].includes(path)){
  if(!["GET","HEAD"].includes(request.method))return fail("Reload before submitting. The application script may not have loaded.",405);
  return env.ASSETS.fetch(new URL(["/worksheet.js","/app.js"].includes(path)?path:"/index.html",request.url));
 }
 if(!path.startsWith("/api/"))return fail("Page not found.",404);
 if(!env.DB||!env.TOKEN_SECRET||!env.ADMIN_KEY)return fail("Server not configured.",503);
 if(path==="/api/admin/migrate"&&request.method==="POST"){
  if(!authAdmin(request,env))return fail("Invalid instructor key.",403);
  try{await migrate(env);return json({ok:true,migrationReady:true});}
  catch(e){return fail("Database setup could not be completed. Ask the instructor to check the deployment.",503);}
 }
 // Authenticate instructor requests before revealing any setup state.
 if(path.startsWith("/api/admin")&&!authAdmin(request,env))return fail("Invalid instructor key.",403);
 const ready=await readiness(env);
 if(!ready.ok)return fail("Database setup is not ready. Ask the instructor to check setup before signing in.",503);
 let body={};if(["POST","PUT"].includes(request.method)){try{body=await request.json()}catch{return fail("Invalid JSON.")}}
 try {
 if(path==="/api/register"&&request.method==="POST"){
  if(!["open","late"].includes(await setting(env,"allocation")) )return fail("Check-in closed. Contact the instructor.",403);
  const niu=String(body.niu||"").trim(),pin=String(body.pin||""),code=String(body.classCode||"").trim();
  if(!/^\d{4,12}$/.test(niu)||pin.length<8||pin.length>128||code.length<6||code.length>64)return fail("Enter your short NIU, instructor class code (6–64 characters) and personal PIN of 8–128 characters.");
  const enrollmentHash=await setting(env,"enrollment_code_hash");
  if(!enrollmentHash)return fail("The instructor must set the class enrollment code before check-in can begin.",503);
  if(!await verifyPin("class-enrollment",code,env.TOKEN_SECRET,enrollmentHash))return fail("Incorrect class enrollment code. Ask your instructor for the current code.",403);
  const hashed=await pinDigest(niu,pin,env.TOKEN_SECRET);
  const inserted=await env.DB.prepare("INSERT INTO students(niu,name,pin_hash,role,case_id) SELECT niu,name,?,'lessor',1 FROM roster WHERE niu=? AND claimed_at IS NULL AND EXISTS(SELECT 1 FROM settings WHERE key='allocation' AND value IN ('open','late')) AND NOT EXISTS(SELECT 1 FROM students WHERE students.niu=roster.niu)").bind(hashed,niu).run();
  if(inserted.meta.changes!==1)return fail("Enrollment unavailable. Check your rostered short NIU or sign in if already registered.",403);
  await env.DB.prepare("UPDATE roster SET claimed_at=CURRENT_TIMESTAMP WHERE niu=?").bind(niu).run();
  await audit(env,niu,"check-in");
  return json({token:await token(env,niu)});
 }
 if(path==="/api/recover"&&request.method==="POST"){
  const niu=String(body.niu||"").trim(),code=String(body.classCode||"").trim(),newPin=String(body.pin||"");
  if(!/^\d{4,12}$/.test(niu)||code.length<10||newPin.length<8||newPin.length>128)return fail("Invalid recovery fields.");
  const proof=await digest(niu+"|"+code),newHash=await pinDigest(niu,newPin,env.TOKEN_SECRET);
  const r=await env.DB.prepare("UPDATE students SET pin_hash=? WHERE niu=? AND EXISTS(SELECT 1 FROM roster WHERE niu=? AND access_hash=?)").bind(newHash,niu,niu,proof).run();
  if(r.meta.changes!==1)return fail("Recovery verification failed.",403);
  await audit(env,niu,"pin-recovery");return json({ok:true});
 }
 if(path==="/api/login"&&request.method==="POST"){
  const niu=String(body.niu||"").trim(),pin=String(body.pin||"");
  if(!/^\d{4,12}$/.test(niu)||pin.length>128)return fail("Incorrect NIU or PIN.",401);
  const key=await digest("login|"+niu+"|"+(request.headers.get("CF-Connecting-IP")||"unknown"));
  const rate=await env.DB.prepare("SELECT failures,locked_until FROM login_limits WHERE id=?").bind(key).first();
  if(rate?.locked_until&&Date.parse(rate.locked_until)>Date.now())return fail("Too many attempts. Try again in 15 minutes.",429);
  const user=await env.DB.prepare("SELECT pin_hash FROM students WHERE niu=?").bind(niu).first();
  if(!user||!await verifyPin(niu,pin,env.TOKEN_SECRET,user.pin_hash)){
   await env.DB.prepare("INSERT INTO login_limits(id,failures,locked_until) VALUES(?,1,NULL) ON CONFLICT(id) DO UPDATE SET failures=CASE WHEN locked_until IS NOT NULL AND locked_until<CURRENT_TIMESTAMP THEN 1 ELSE failures+1 END, locked_until=CASE WHEN failures>=4 THEN datetime('now','+15 minutes') ELSE NULL END").bind(key).run();
   return fail("Incorrect NIU or PIN.",401);
  }
  await env.DB.prepare("DELETE FROM login_limits WHERE id=?").bind(key).run();
  if(!user.pin_hash.startsWith("p2$"))await env.DB.prepare("UPDATE students SET pin_hash=? WHERE niu=?").bind(await pinDigest(niu,pin,env.TOKEN_SECRET),niu).run();
  return json({token:await token(env,niu)});
 }
 if(path.startsWith("/api/admin")){
  if(!authAdmin(request,env))return fail("Invalid instructor key.",403);
  const state=await setting(env,"allocation")||"open";
  if(path==="/api/admin/enrollment-code"&&request.method==="POST"){
   const code=String(body.code||"").trim();
   if(code.length<6||code.length>64)return fail("Choose a class enrollment code of 6–64 characters.");
   const hash=await pinDigest("class-enrollment",code,env.TOKEN_SECRET);
   await env.DB.batch([
    env.DB.prepare("INSERT INTO settings(key,value) VALUES('enrollment_code_hash',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(hash),
    env.DB.prepare("INSERT INTO audit_events(actor,action,details) VALUES('instructor','set-class-enrollment-code','code updated; value not recorded')")
   ]);
   return json({ok:true,enrollmentCodeConfigured:true});
  }
  if(path==="/api/admin/allocate"&&request.method==="POST"){
   if(state!=="open")return fail("Allocation already finalized.",409);
   const nius=result(await env.DB.prepare("SELECT niu FROM students ORDER BY niu").all()).map(x=>x.niu);
   if(nius.length<2)return fail("At least two students must check in.");
   for(let i=nius.length-1;i>0;i--){const a=new Uint32Array(1);crypto.getRandomValues(a);const j=a[0]%(i+1);[nius[i],nius[j]]=[nius[j],nius[i]];}
   const groups=Array.from({length:5},()=>[]),active=Math.min(5,Math.floor(nius.length/2));
   const pairCount=Math.floor(nius.length/2);let n=0;
   // Allocate whole pairs so 54 attendees produce 27 of each role, not 29/25.
   for(let i=0;i<active;i++){
    const pairs=Math.floor(pairCount/active)+(i<pairCount%active?1:0);
    for(let j=0;j<pairs;j++)groups[i].push({niu:nius[n++],role:"lessor"},{niu:nius[n++],role:"lessee"});
   }
   if(n<nius.length){
    const least=Math.min(...groups.slice(0,active).map(g=>g.length));
    const candidates=groups.slice(0,active).map((g,i)=>g.length===least?i:-1).filter(i=>i>=0);
    const random=new Uint32Array(2);crypto.getRandomValues(random);
    groups[candidates[random[0]%candidates.length]].push({niu:nius[n],role:random[1]%2?"lessor":"lessee"});
   }
   const batch=[env.DB.prepare("INSERT INTO allocation_guard(id) VALUES('class')"),...groups.flatMap((g,i)=>g.map(x=>env.DB.prepare("UPDATE students SET role=?,case_id=?,assigned_at=CURRENT_TIMESTAMP WHERE niu=?").bind(x.role,i+1,x.niu))),env.DB.prepare("UPDATE settings SET value='active' WHERE key='allocation' AND value='open'"),env.DB.prepare("INSERT INTO audit_events(actor,action,details) VALUES('instructor','allocate',?)").bind(JSON.stringify(groups.map((g,i)=>({caseId:i+1,lessor:g.filter(x=>x.role==="lessor").length,lessee:g.filter(x=>x.role==="lessee").length}))))];
   await env.DB.batch(batch);
   return json({ok:true,checkedIn:nius.length,groups:groups.map((g,i)=>({caseId:i+1,lessors:g.filter(x=>x.role==="lessor").length,lessees:g.filter(x=>x.role==="lessee").length}))});
  }
  if(path==="/api/admin/reset"&&request.method==="POST"){
  if(state!=="active"||body.confirm!=="RESET_UNSTARTED_SESSION")return fail("Reset requires instructor confirmation during active session.",409);
  const anyInteraction=await env.DB.prepare("SELECT 1 FROM interactions LIMIT 1").first();
  const anySubmission=await env.DB.prepare("SELECT 1 FROM submissions LIMIT 1").first();
  const anyDraft=await env.DB.prepare("SELECT 1 FROM drafts LIMIT 1").first();
  if(anyInteraction||anySubmission||anyDraft)return fail("Cannot reset after drafts, interactions or submissions. Preserve student work.",409);
  await env.DB.batch([
   env.DB.prepare("DELETE FROM allocation_guard WHERE id='class'"),
   env.DB.prepare("UPDATE students SET assigned_at=NULL"),
   env.DB.prepare("UPDATE settings SET value='open' WHERE key='allocation'"),
   env.DB.prepare("INSERT INTO audit_events(actor,action,details) VALUES('instructor','reset-unstarted','reopen allocation')")
  ]);return json({ok:true});
 }
 if(path==="/api/admin/late"&&request.method==="POST"){
   if(!["active","late"].includes(state))return fail("Assign late arrivals during an active simulation or open late check-in.",409);
   const niu=String(body.niu||"").trim(),role=String(body.role||"").trim(),caseId=Number(body.caseId);
   if(!/^\d{4,12}$/.test(niu)||!["lessor","lessee"].includes(role)||!Number.isInteger(caseId)||caseId<1||caseId>5)return fail("Invalid late-arrival assignment.");
   const enrolled=await env.DB.prepare("SELECT niu FROM students WHERE niu=?").bind(niu).first();
   if(!enrolled)return fail("Student must have registered before finalization. Instructor can reopen check-in explicitly.",409);
   const existing=await env.DB.prepare("SELECT 1 FROM interactions WHERE lessor_niu=? OR lessee_niu=?").bind(niu,niu).first();
   const work=await env.DB.prepare("SELECT 1 FROM drafts WHERE niu=? UNION SELECT 1 FROM submissions WHERE niu=? LIMIT 1").bind(niu,niu).first();
   if(existing||work)return fail("Cannot move student after draft, interaction or submission exists.");
   await env.DB.batch([env.DB.prepare("UPDATE students SET role=?,case_id=?,assigned_at=CURRENT_TIMESTAMP WHERE niu=?").bind(role,caseId,niu),env.DB.prepare("INSERT INTO audit_events(actor,action,details) VALUES('instructor','reassign',?)").bind(JSON.stringify({niu,role,caseId}))]);
   return json({ok:true});
  }
  if(path==="/api/admin/reopen"&&request.method==="POST"){
   if(state!=="active")return fail("Check-in can be reopened only during simulation.");
   await env.DB.prepare("UPDATE settings SET value='late' WHERE key='allocation' AND value='active'").run();
   await audit(env,"instructor","reopen-late-checkin");
   return json({ok:true});
  }
  if(path==="/api/admin/close-late"&&request.method==="POST"){
   if(state!=="late")return fail("Late check-in is not open.");
   await env.DB.prepare("UPDATE settings SET value='active' WHERE key='allocation'").run();
   await audit(env,"instructor","close-late-checkin");
   return json({ok:true});
  }
  if(path==="/api/admin/close-submissions"&&request.method==="POST"){
   await env.DB.prepare("INSERT INTO settings(key,value) VALUES('submissions','closed') ON CONFLICT(key) DO UPDATE SET value='closed'").run();
   await audit(env,"instructor","close-submissions");return json({ok:true});
  }
  if(path==="/api/admin/open-submissions"&&request.method==="POST"){
   await env.DB.prepare("INSERT INTO settings(key,value) VALUES('submissions','open') ON CONFLICT(key) DO UPDATE SET value='open'").run();
   await audit(env,"instructor","open-submissions");return json({ok:true});
  }
  if(path==="/api/admin/answer-keys"&&request.method==="GET")return json({cases:CASES.map(buildInstructorGuide),reference:"Kieso, Weygandt & Warfield, Intermediate Accounting IFRS, International Adaptation, fifth edition, Chapter 20; IFRS 16.",note:"Instructor-only worked solutions. Each amount is rounded to whole IDR. The first-year calculations use unrounded intermediate amounts."});
  if(path==="/api/admin/audit")return json({events:result(await env.DB.prepare("SELECT * FROM audit_events ORDER BY id DESC LIMIT 150").all())});
  const report=await panel(env);
  if(path==="/api/admin/discussion"){
   const discussions=CASES.map(c=>{
    const members=report.students.filter(x=>x.case_id===c.id&&(state==="active"||state==="late"));
    const answers=report.submissions.filter(x=>members.some(s=>s.niu===x.niu));
    const role=r=>answers.filter(x=>members.some(s=>s.niu===x.niu&&s.role===r));
    const currentRole=r=>role(r).filter(x=>x.data.worksheetVersion==="v2.1");
    const median=(xs,key)=>{const a=xs.filter(x=>x.data[key]!==undefined&&x.data[key]!==null&&String(x.data[key]).trim()!=="").map(x=>Number(String(x.data[key]).replace(/[ ,]/g,""))).filter(Number.isFinite).sort((a,b)=>a-b);return a.length?a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2:null;};
    return {caseId:c.id,manufacturer:c.brand,expectedType:c.leaseType,expected:model(c),participants:members.length,interactions:report.interactions.filter(x=>x.case_id===c.id&&x.status==="confirmed").length,submissions:answers.length,legacySubmissions:answers.filter(x=>x.data.worksheetVersion!=="v2.1").length,lessorSubmissions:role("lessor").length,lesseeSubmissions:role("lessee").length,finance:role("lessor").filter(x=>x.data.classification==="Finance lease").length,operating:role("lessor").filter(x=>x.data.classification==="Operating lease").length,medianLessor:median(currentRole("lessor"),"pv"),medianLessee:median(currentRole("lessee"),"pv"),medianROU:median(currentRole("lessee"),"rouAsset")};
   });return json({discussions});
  }
  return json({...report,enrollmentCodeConfigured:!!await setting(env,"enrollment_code_hash"),submissionsOpen:(await setting(env,"submissions"))!=="closed"});
 }
 const user=await actor(request,env);if(!user)return fail("Please sign in.",401);
 const state=await setting(env,"allocation")||"open";
 if(path==="/api/me"&&state==="open")return json({waiting:true,user:{niu:user.niu,name:user.name}});
 if(path==="/api/me"&&state==="late"){
  const assigned=await env.DB.prepare("SELECT role,case_id,assigned_at FROM students WHERE niu=?").bind(user.niu).first();
  if(!user.assigned_at)return json({waiting:true,user:{niu:user.niu,name:user.name}});
 }
 if(!["active","late"].includes(state))return fail("Waiting for instructor assignment.",409);
 if(!user.assigned_at&&path==="/api/me")return json({waiting:true,user:{niu:user.niu,name:user.name}});
 if(!user.assigned_at&&path!=="/api/me")return fail("Waiting for instructor assignment.",409);
 const c=CASES[user.case_id-1];if(!c)return fail("Instructor must assign your company.",409);
 if(path==="/api/me"){
  const links=result(await env.DB.prepare("SELECT * FROM interactions WHERE lessor_niu=? OR lessee_niu=? ORDER BY id").bind(user.niu,user.niu).all());
  const partners=[];for(const link of links){const niu=user.role==="lessor"?link.lessee_niu:link.lessor_niu;const p=await env.DB.prepare("SELECT niu,name,role FROM students WHERE niu=?").bind(niu).first();if(p)partners.push({...p,status:link.status,interactionId:link.id,initiatedBy:link.initiated_by});}
  const mine=await env.DB.prepare("SELECT data,submitted_at FROM submissions WHERE niu=?").bind(user.niu).first();
  const draft=await env.DB.prepare("SELECT data,updated_at FROM drafts WHERE niu=?").bind(user.niu).first();
  const comparisons=[];if(mine)for(const p of partners.filter(x=>x.status==="confirmed")){const a=await env.DB.prepare("SELECT data FROM submissions WHERE niu=?").bind(p.niu).first();if(a)comparisons.push({partner:{niu:p.niu,name:p.name},data:JSON.parse(a.data)});}
  return json({user,case:safeCase(c,user.role),partners,submission:mine?{data:JSON.parse(mine.data),submitted_at:mine.submitted_at}:null,draft:draft?{data:JSON.parse(draft.data),updated_at:draft.updated_at}:null,comparisons,submissionsOpen:(await setting(env,"submissions"))!=="closed"});
 }
 if(path==="/api/queue"){
  const opposite=user.role==="lessor"?"lessee":"lessor";
  return json({candidates:result(await env.DB.prepare("SELECT niu,name,role FROM students WHERE case_id=? AND role=? ORDER BY name").bind(user.case_id,opposite).all())});
 }
 if(path==="/api/match"&&request.method==="POST"){
  const niu=String(body.partnerNiu||"").trim();
  const peer=await env.DB.prepare("SELECT niu,role,case_id FROM students WHERE niu=?").bind(niu).first();
  if(!peer||peer.case_id!==user.case_id||peer.role===user.role)return fail("Counterpart must hold the opposite role for the same case.",403);
  const lessor=user.role==="lessor"?user.niu:niu,lessee=user.role==="lessee"?user.niu:niu;
  const r=await env.DB.prepare("INSERT OR IGNORE INTO interactions(case_id,lessor_niu,lessee_niu,status,initiated_by) VALUES(?,?,?,'requested',?)").bind(user.case_id,lessor,lessee,user.niu).run();
  return json({ok:true,created:r.meta.changes===1});
 }
 if(path==="/api/confirm"&&request.method==="POST"){
  const id=Number(body.interactionId);
  const r=await env.DB.prepare("UPDATE interactions SET status='confirmed',confirmed_at=CURRENT_TIMESTAMP WHERE id=? AND status='requested' AND initiated_by<>? AND (lessor_niu=? OR lessee_niu=?)").bind(id,user.niu,user.niu,user.niu).run();
  if(!r.meta.changes)return fail("Only the requested counterpart may confirm this interaction.",403);
  return json({ok:true});
 }
 if(path==="/api/draft"&&request.method==="POST"){
  if(await setting(env,"submissions")==="closed")return fail("Submissions closed.",403);
  if(!user.assigned_at)return fail("No assignment yet.",409);
  if(await env.DB.prepare("SELECT 1 FROM submissions WHERE niu=?").bind(user.niu).first())return fail("Your submitted worksheet is locked. Any earlier saved draft is preserved.",409);
  if(!body.data||typeof body.data!=="object"||Array.isArray(body.data)||JSON.stringify(body.data).length>16000)return fail("Invalid draft or draft too large.");
  await env.DB.prepare("INSERT INTO drafts(niu,data) VALUES(?,?) ON CONFLICT(niu) DO UPDATE SET data=excluded.data,updated_at=CURRENT_TIMESTAMP").bind(user.niu,JSON.stringify(body.data||{})).run();
  return json({ok:true});
 }
 if(path==="/api/submit"&&request.method==="POST"){
  if(!user.assigned_at)return fail("No assignment yet.",409);
  if(await setting(env,"submissions")==="closed")return fail("Submissions closed.",403);
  const confirmed=await env.DB.prepare("SELECT id FROM interactions WHERE status='confirmed' AND (lessor_niu=? OR lessee_niu=?)").bind(user.niu,user.niu).first();
  if(!confirmed)return fail("You need at least one counterpart-confirmed interaction.",409);
  const data=body.data,error=validateWorksheet(data,user.role);
  if(error)return fail(error);
  const writes=await env.DB.batch([
   env.DB.prepare("INSERT OR IGNORE INTO submissions(niu,data) VALUES(?,?)").bind(user.niu,JSON.stringify({...data,worksheetVersion:"v2.1"})),
   env.DB.prepare("INSERT INTO audit_events(actor,action,details) SELECT ?,'submit-first','v2.1' WHERE changes()=1").bind(user.niu)
  ]);
  const inserted=writes[0];
  if(inserted.meta.changes!==1)return fail("Your first submission is locked. It cannot be replaced after comparison is available.",409);
  return json({ok:true});
 }
 return fail("Not found.",404);
 }catch(e){return fail("Request could not be completed. Check setup or try again.",500);}
}};
