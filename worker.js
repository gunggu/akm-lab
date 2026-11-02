const CASES=[
{id:1,brand:"Astra Precision Machines",asset:"CNC machining center",cost:580000000,fv:800000000,rent:220000000,years:4,life:5,rate:0.08,due:"end",residual:0,leaseType:"finance",note:"A highly specialized machine; a substantial portion of its economic life is leased."},
{id:2,brand:"Nusantara Packaging Systems",asset:"Modular packaging line",cost:320000000,fv:490000000,rent:65000000,years:3,life:10,rate:0.09,due:"end",residual:300000000,leaseType:"operating",note:"The lessor retains the equipment and significant residual-value exposure."},
{id:3,brand:"Cakra Industrial Print",asset:"Industrial label printer",cost:250000000,fv:360000000,rent:110000000,years:3,life:4,rate:0.07,due:"beginning",residual:0,leaseType:"finance",note:"Most of the printer's economic life is covered by the contract."},
{id:4,brand:"Garuda Cold Chain Equipment",asset:"Refrigeration equipment fleet",cost:420000000,fv:600000000,rent:80000000,years:3,life:9,rate:0.08,due:"end",residual:390000000,leaseType:"operating",note:"The lessor expects substantial use and residual value following the lease."},
{id:5,brand:"Merapi Automation Works",asset:"Robotic manufacturing arm",cost:600000000,fv:900000000,rent:280000000,years:4,life:5,rate:0.10,due:"end",residual:0,leaseType:"finance",note:"The lease spans most of useful life, and lease payments recover substantially all fair value."}
];
const json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const fail=(m,s=400)=>json({error:m},s);
async function digest(text){let bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(text));return Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,"0")).join("");}
async function signature(env,payload){const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(env.TOKEN_SECRET),"HMAC",false,["sign"]);const sig=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(payload));return Array.from(new Uint8Array(sig)).map(x=>x.toString(16).padStart(2,"0")).join("");}
async function token(env,niu){let payload=niu+"."+Math.floor(Date.now()/1000+12*3600);return payload+"."+await signature(env,payload);}
async function actor(req,env){let t=(req.headers.get("Authorization")||"").replace(/^Bearer /,"");let p=t.split(".");if(p.length!==3||!(/^\d{4,12}$/.test(p[0]))||Number(p[1])<Date.now()/1000)return null;let expected=await signature(env,p[0]+"."+p[1]);if(expected!==p[2])return null;return await env.DB.prepare("SELECT niu,name,role,case_id FROM students WHERE niu=?").bind(p[0]).first();}
const roleCase=(students)=>{let counts=CASES.map(c=>({id:c.id,lessor:0,lessee:0}));for(let s of students){let row=counts[s.case_id-1];row[s.role]++;}let pending=counts.filter(x=>x.lessor!==x.lessee);if(pending.length){let c=pending[Math.floor(Math.random()*pending.length)];return {case_id:c.id,role:c.lessor>c.lessee?"lessee":"lessor"};}let targets=[6,6,5,5,5];let eligible=counts.filter((x,i)=>x.lessor<targets[i]);if(!eligible.length)eligible=counts;let min=Math.min(...eligible.map(x=>x.lessor+x.lessee));let opts=eligible.filter(x=>x.lessor+x.lessee===min),c=opts[Math.floor(Math.random()*opts.length)];return {case_id:c.id,role:Math.random()<.5?"lessor":"lessee"};};
const calc=(c)=>{let d=c.rate,n=c.years,pv=c.rent*(1-Math.pow(1+d,-n))/d*(c.due==="beginning"?(1+d):1);return {pv,interestYearOne:c.due==="beginning"?(pv-c.rent)*d:pv*d,depreciation:c.leaseType==="operating"?c.cost/c.life:pv/(c.years),lessorCostOfSales:c.leaseType==="finance"?c.cost:0};};
export default {async fetch(request,env){
const url=new URL(request.url),path=url.pathname.replace(/^\/lease-lab(?=\/|$)/,"")||"/";
if(path==="/api/health")return json({service:"lease-lab",route:"ok",databaseBound:!!env.DB,secretsConfigured:!!(env.TOKEN_SECRET&&env.CLASS_CODE&&env.ADMIN_KEY)});
if(path==="/"||path==="/admin")return env.ASSETS.fetch(new URL("/index.html",request.url));
if(!env.DB||!env.TOKEN_SECRET||!env.CLASS_CODE||!env.ADMIN_KEY)return fail("Server not configured: set D1 and all secrets.",503);
let body={};
if(request.method==="POST"){try{body=await request.json();}catch{return fail("Invalid JSON.");}}
try{
if(path==="/"||path==="/admin"){return env.ASSETS.fetch(new URL("/index.html",request.url));}
if(path==="/api/cases")return json(CASES.map(({leaseType,note,...safe})=>safe));
if(path==="/api/register"&&request.method==="POST"){
let niu=String(body.niu||"").trim(),name=String(body.name||"").trim(),pin=String(body.pin||""),access=String(body.classCode||"");
if(access!==env.CLASS_CODE)return fail("Invalid classroom access code.",403);
if(!/^\d{4,12}$/.test(niu)||name.length<2||name.length>80||pin.length<6)return fail("Use 4–12 digit NIU, your name, and a PIN of 6+ characters.");
if(await env.DB.prepare("SELECT niu FROM students WHERE niu=?").bind(niu).first())return fail("NIU already registered. Use Sign in.",409);
let current=(await env.DB.prepare("SELECT role,case_id FROM students").all()).results;let assigned=roleCase(current);let hash=await digest(niu+"|"+pin+"|"+env.TOKEN_SECRET);
await env.DB.prepare("INSERT INTO students(niu,name,pin_hash,role,case_id) VALUES(?,?,?,?,?)").bind(niu,name,hash,assigned.role,assigned.case_id).run();
return json({token:await token(env,niu)});
}
if(path==="/api/login"&&request.method==="POST"){
let niu=String(body.niu||"").trim(),pin=String(body.pin||"");let st=await env.DB.prepare("SELECT pin_hash FROM students WHERE niu=?").bind(niu).first();
if(!st||st.pin_hash!==await digest(niu+"|"+pin+"|"+env.TOKEN_SECRET))return fail("Unknown NIU or incorrect PIN.",401);
return json({token:await token(env,niu)});
}
if(path.startsWith("/api/admin")){
if(request.headers.get("X-Admin-Key")!==env.ADMIN_KEY)return fail("Unauthorized instructor.",403);
let students=(await env.DB.prepare("SELECT niu,name,role,case_id,created_at FROM students ORDER BY created_at,niu").all()).results;
let matches=(await env.DB.prepare("SELECT * FROM matches ORDER BY id").all()).results;
let submits=(await env.DB.prepare("SELECT * FROM submissions ORDER BY submitted_at").all()).results;
const submissions=submits.map(x=>({...x,data:JSON.parse(x.data)}));
if(path==="/api/admin/discussion"){
const discussions=CASES.map(c=>{const members=students.filter(s=>s.case_id===c.id),answers=submissions.filter(a=>members.some(s=>s.niu===a.niu));const byRole=role=>answers.filter(a=>members.some(s=>s.niu===a.niu&&s.role===role));const amounts=(arr,key)=>arr.map(a=>Number(String(a.data[key]??"").replace(/[, ]/g,""))).filter(Number.isFinite);const median=values=>{if(!values.length)return null;values.sort((a,b)=>a-b);let i=Math.floor(values.length/2);return values.length%2?values[i]:(values[i-1]+values[i])/2;};return {caseId:c.id,manufacturer:c.brand,asset:c.asset,expectedType:c.leaseType,expected:calc(c),participants:members.length,pairs:matches.filter(m=>m.case_id===c.id).length,submissions:answers.length,lesseeSubmissions:byRole("lessee").length,lessorSubmissions:byRole("lessor").length,classification:{finance:answers.filter(a=>String(a.data.classification).toLowerCase().startsWith("finance")).length,operating:answers.filter(a=>String(a.data.classification).toLowerCase().startsWith("operating")).length},medianLesseePV:median(amounts(byRole("lessee"),"pv")),medianLessorPV:median(amounts(byRole("lessor"),"pv")),medianLesseeInterest:median(amounts(byRole("lessee"),"firstInterest")),medianLessorInterest:median(amounts(byRole("lessor"),"firstInterest"))};});
return json({generatedAt:new Date().toISOString(),discussions});
}
return json({students,matches,submissions,cases:CASES.map(c=>({...c,expected:calc(c)}))});
}
const user=await actor(request,env);if(!user)return fail("Please sign in.",401);
const c=CASES[user.case_id-1];
if(path==="/api/me"){
let match=await env.DB.prepare("SELECT * FROM matches WHERE lessor_niu=? OR lessee_niu=?").bind(user.niu,user.niu).first();
let partner=null,partnerSubmission=null;
if(match){let pn=user.role==="lessor"?match.lessee_niu:match.lessor_niu;partner=await env.DB.prepare("SELECT niu,name,role FROM students WHERE niu=?").bind(pn).first();}
let mine=await env.DB.prepare("SELECT data,submitted_at FROM submissions WHERE niu=?").bind(user.niu).first();
if(mine&&partner){let ps=await env.DB.prepare("SELECT data,submitted_at FROM submissions WHERE niu=?").bind(partner.niu).first();if(ps)partnerSubmission={data:JSON.parse(ps.data),submitted_at:ps.submitted_at};}
const studentCase=user.role==="lessor"?c:((({cost,leaseType,...rest})=>rest)(c));
return json({user,case:studentCase,match,partner,submission:mine?{data:JSON.parse(mine.data),submitted_at:mine.submitted_at}:null,partnerSubmitted:!!partnerSubmission,partnerSubmission:mine?partnerSubmission:null});
}
if(path==="/api/queue"){
let rows=(await env.DB.prepare("SELECT s.niu,s.name FROM students s LEFT JOIN matches m ON s.niu=m.lessee_niu WHERE s.case_id=? AND s.role='lessee' AND m.id IS NULL ORDER BY s.created_at").bind(user.case_id).all()).results;
return json({candidates:user.role==="lessor"?rows:[]});
}
if(path==="/api/match"&&request.method==="POST"){
if(user.role!=="lessor")return fail("Only lessors may claim a partner.",403);
let pn=String(body.lesseeNiu||"").trim();
let r=await env.DB.prepare("INSERT INTO matches(case_id,lessor_niu,lessee_niu) SELECT ?,?,s.niu FROM students s WHERE s.niu=? AND s.role='lessee' AND s.case_id=? AND NOT EXISTS (SELECT 1 FROM matches m WHERE m.lessor_niu=? OR m.lessee_niu=s.niu)").bind(user.case_id,user.niu,pn,user.case_id,user.niu).run();
if(r.meta.changes!==1)return fail("Partner unavailable or already matched. Refresh the queue.",409);
return json({ok:true});
}
if(path==="/api/submit"&&request.method==="POST"){
let matched=await env.DB.prepare("SELECT id FROM matches WHERE lessor_niu=? OR lessee_niu=?").bind(user.niu,user.niu).first();if(!matched)return fail("Find your partner before submitting.");
let input=body.data;if(!input||typeof input!=="object")return fail("Submission missing.");
let fields=["classification","reason","pv","firstInterest","firstEntry","yearEndEntry","statementImpact","reflection"];
for(let f of fields)if(String(input[f]??"").trim().length===0)return fail("Complete all fields: "+f);
let serialized=JSON.stringify(input);if(serialized.length>10000)return fail("Submission too long.");
await env.DB.prepare("INSERT INTO submissions(niu,data) VALUES(?,?) ON CONFLICT(niu) DO UPDATE SET data=excluded.data,submitted_at=CURRENT_TIMESTAMP").bind(user.niu,serialized).run();
return json({ok:true});
}
return fail("Not found.",404);
}catch(e){return fail(e.message||"Server error.",500);}
}};
