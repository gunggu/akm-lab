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
 if(path==="/api/health")return json({service:"lease-lab",route:"ok",databaseBound:!!env.DB,secretsConfigured:!!(env.TOKEN_SECRET&&env.ADMIN_KEY)});
 if(path==="/"||path==="/admin")return env.ASSETS.fetch(new URL("/index.html",request.url));
 if(!env.DB||!env.TOKEN_SECRET||!env.ADMIN_KEY)return fail("Server not configured: set D1 and all secrets.",503);
 let body={};if(request.method==="POST"){try{body=await request.json();}catch{return fail("Invalid JSON.");}}
 try{
 if(path==="/api/register"&&request.method==="POST"){
  const niu=String(body.niu||"").trim(),pin=String(body.pin||""),code=String(body.classCode||"").trim();
  if(!/^\d{4,12}$/.test(niu)||pin.length<8||code.length<10)return fail("Enter a valid short NIU, individual enrollment code and 8+ character PIN.");
  const allocation=(await env.DB.prepare("SELECT value FROM settings WHERE key='allocation'").first())?.value||"open";
  if(allocation!=="open")return fail("Check-in closed. Contact instructor.",403);
  const hash=await digest(niu+"|"+code),pinHash=await digest(niu+"|"+pin+"|"+env.TOKEN_SECRET);
  const result=await env.DB.prepare("INSERT INTO students(niu,name,pin_hash,role,case_id) SELECT niu,name,?,'lessor',1 FROM roster WHERE niu=? AND access_hash=? AND claimed_at IS NULL AND NOT EXISTS(SELECT 1 FROM students WHERE students.niu=roster.niu)").bind(pinHash,niu,hash).run();
  if(result.meta.changes!==1)return fail("Invalid NIU or individual code, or NIU already registered. Try Sign in.",403);
  await env.DB.prepare("UPDATE roster SET claimed_at=CURRENT_TIMESTAMP WHERE niu=?").bind(niu).run();
  return json({token:await token(env,niu)});
 }
 if(path==="/api/login"&&request.method==="POST"){
  const niu=String(body.niu||"").trim(),pin=String(body.pin||"");
  const student=await env.DB.prepare("SELECT pin_hash FROM students WHERE niu=?").bind(niu).first();
  if(!student||student.pin_hash!==await digest(niu+"|"+pin+"|"+env.TOKEN_SECRET))return fail("Unknown NIU or incorrect PIN.",401);
  return json({token:await token(env,niu)});
 }
 if(path.startsWith("/api/admin")){
  if(request.headers.get("X-Admin-Key")!==env.ADMIN_KEY)return fail("Unauthorized instructor.",403);
  const allocation=(await env.DB.prepare("SELECT value FROM settings WHERE key='allocation'").first())?.value||"open";
  if(path==="/api/admin/allocate"&&request.method==="POST"){
   if(allocation!=="open")return fail("Roles have already been randomized.",409);
   const enrolled=(await env.DB.prepare("SELECT niu FROM students ORDER BY niu").all()).results.map(x=>x.niu);
   if(enrolled.length<2)return fail("At least two students must check in.");
   const claim=await env.DB.prepare("UPDATE settings SET value='closed' WHERE key='allocation' AND value='open'").run();
   if(claim.meta.changes!==1)return fail("Check-in already closed.",409);
   for(let i=enrolled.length-1;i>0;i--){const n=new Uint32Array(1);crypto.getRandomValues(n);const j=n[0]%(i+1);[enrolled[i],enrolled[j]]=[enrolled[j],enrolled[i]];}
   const groups=[[],[],[],[],[]],active=Math.min(5,Math.floor(enrolled.length/2));let cursor=0;
   for(let i=0;i<active;i++){groups[i].push({niu:enrolled[cursor++],role:"lessor"},{niu:enrolled[cursor++],role:"lessee"});}
   while(cursor<enrolled.length){
    const min=Math.min(...groups.slice(0,active).map(x=>x.length));
    const choices=groups.slice(0,active).map((x,i)=>x.length===min?i:-1).filter(i=>i>=0);
    const n=new Uint32Array(1);crypto.getRandomValues(n);const idx=choices[n[0]%choices.length],group=groups[idx];
    const a=group.filter(x=>x.role==="lessor").length,b=group.length-a;
    group.push({niu:enrolled[cursor++],role:a<=b?"lessor":"lessee"});
   }
   await env.DB.batch(groups.flatMap((group,i)=>group.map(x=>env.DB.prepare("UPDATE students SET role=?,case_id=? WHERE niu=?").bind(x.role,i+1,x.niu))));
   return json({ok:true,checkedIn:enrolled.length,caseCounts:groups.map((g,i)=>({caseId:i+1,lessors:g.filter(x=>x.role==="lessor").length,lessees:g.filter(x=>x.role==="lessee").length}))});
  }
  const students=(await env.DB.prepare("SELECT niu,name,role,case_id,created_at FROM students ORDER BY created_at,niu").all()).results;
  const matches=(await env.DB.prepare("SELECT * FROM interactions ORDER BY id").all()).results;
  const raw=(await env.DB.prepare("SELECT * FROM submissions ORDER BY submitted_at").all()).results;
  const submissions=raw.map(x=>({...x,data:JSON.parse(x.data)}));
  if(path==="/api/admin/discussion"){
   const discussions=CASES.map(c=>{
    const members=students.filter(s=>allocation==="closed"&&s.case_id===c.id);
    const answers=submissions.filter(a=>members.some(m=>m.niu===a.niu));
    const byRole=role=>answers.filter(a=>members.some(m=>m.niu===a.niu&&m.role===role));
    const median=(arr,key)=>{let v=arr.map(a=>Number(String(a.data[key]??"").replace(/[, ]/g,""))).filter(Number.isFinite).sort((a,b)=>a-b);if(!v.length)return null;let i=Math.floor(v.length/2);return v.length%2?v[i]:(v[i-1]+v[i])/2;};
    return {caseId:c.id,manufacturer:c.brand,asset:c.asset,expectedType:c.leaseType,expected:calc(c),participants:members.length,interactions:matches.filter(m=>m.case_id===c.id).length,submissions:answers.length,lesseeSubmissions:byRole("lessee").length,lessorSubmissions:byRole("lessor").length,classification:{finance:answers.filter(a=>String(a.data.classification).toLowerCase().startsWith("finance")).length,operating:answers.filter(a=>String(a.data.classification).toLowerCase().startsWith("operating")).length},medianLesseePV:median(byRole("lessee"),"pv"),medianLessorPV:median(byRole("lessor"),"pv")};
   });return json({generatedAt:new Date().toISOString(),discussions});
  }
  return json({students,matches,submissions,allocation,cases:CASES.map(c=>({...c,expected:calc(c)}))});
 }
 const user=await actor(request,env);if(!user)return fail("Please sign in.",401);
 const allocation=(await env.DB.prepare("SELECT value FROM settings WHERE key='allocation'").first())?.value||"open";
 if(allocation!=="closed"){
  if(path==="/api/me")return json({waiting:true,user:{niu:user.niu,name:user.name},partners:[]});
  return fail("Waiting for instructor to close check-in and allocate roles.",409);
 }
 const c=CASES[user.case_id-1];
 if(path==="/api/me"){
  const links=(await env.DB.prepare("SELECT lessor_niu,lessee_niu FROM interactions WHERE lessor_niu=? OR lessee_niu=? ORDER BY id").bind(user.niu,user.niu).all()).results;
  const partners=[];
  for(const link of links){const niu=user.role==="lessor"?link.lessee_niu:link.lessor_niu;const p=await env.DB.prepare("SELECT niu,name,role FROM students WHERE niu=?").bind(niu).first();if(p)partners.push(p);}
  const mine=await env.DB.prepare("SELECT data,submitted_at FROM submissions WHERE niu=?").bind(user.niu).first();
  const comparisons=[];
  if(mine)for(const partner of partners){const sub=await env.DB.prepare("SELECT data FROM submissions WHERE niu=?").bind(partner.niu).first();if(sub)comparisons.push({partner,data:JSON.parse(sub.data)});}
  const studentCase=user.role==="lessor"?((({leaseType,...rest})=>rest)(c)):((({cost,leaseType,...rest})=>rest)(c));
  return json({user,case:studentCase,partners,submission:mine?{data:JSON.parse(mine.data),submitted_at:mine.submitted_at}:null,comparisons});
 }
 if(path==="/api/queue"){
  const target=user.role==="lessor"?"lessee":"lessor";
  const candidates=(await env.DB.prepare("SELECT niu,name,role FROM students WHERE case_id=? AND role=? ORDER BY name").bind(user.case_id,target).all()).results;
  return json({candidates});
 }
 if(path==="/api/match"&&request.method==="POST"){
  const niu=String(body.partnerNiu||body.lesseeNiu||"").trim();
  const peer=await env.DB.prepare("SELECT role,case_id FROM students WHERE niu=?").bind(niu).first();
  if(!peer||peer.case_id!==user.case_id||peer.role===user.role)return fail("Select the opposite role for the same manufacturer case.",403);
  const lessor=user.role==="lessor"?user.niu:niu,lessee=user.role==="lessee"?user.niu:niu;
  await env.DB.prepare("INSERT OR IGNORE INTO interactions(case_id,lessor_niu,lessee_niu) VALUES(?,?,?)").bind(user.case_id,lessor,lessee).run();
  return json({ok:true});
 }
 if(path==="/api/submit"&&request.method==="POST"){
  const linked=await env.DB.prepare("SELECT id FROM interactions WHERE lessor_niu=? OR lessee_niu=?").bind(user.niu,user.niu).first();
  if(!linked)return fail("Record at least one counterpart interaction first.");
  const input=body.data;if(!input||typeof input!=="object")return fail("Submission missing.");
  for(const f of ["classification","reason","pv","firstInterest","firstEntry","yearEndEntry","statementImpact","reflection"])if(!String(input[f]??"").trim())return fail("Complete field: "+f);
  const data=JSON.stringify(input);if(data.length>10000)return fail("Submission too long.");
  await env.DB.prepare("INSERT INTO submissions(niu,data) VALUES(?,?) ON CONFLICT(niu) DO UPDATE SET data=excluded.data,submitted_at=CURRENT_TIMESTAMP").bind(user.niu,data).run();
  return json({ok:true});
 }
 return fail("Not found.",404);
 }catch(e){return fail(e.message||"Server error.",500);}
}};
