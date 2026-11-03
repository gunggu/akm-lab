import { validateWorksheet, selectSavedWork, comparisonRows } from './worksheet.js';
import {studentPrompt, misconception, DEBRIEF_QUESTIONS} from './pedagogy.js';

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = value => new Intl.NumberFormat('en-ID', {maximumFractionDigits:0}).format(Number(value) || 0);
const base = location.pathname.startsWith('/lease-lab') ? '/lease-lab' : '';
let token = sessionStorage.getItem('leaseToken'), snapshot = null, report = null;
let summaryCases = [], summaryIndex = null;
let loadedIdentity = null, generation = 0, draftTimer, draftRequest = null, dirty = false;
let controllers = new Set(), journalSequence = 0, submitting = false, adminGeneration = 0;

function msg(text = '', success = false) {
  $('message').textContent = text;
  $('message').classList.toggle('success', success);
}
function view(id) {
  msg(); document.body.classList.toggle('presenting',id==='caseSummary');
  for (const name of ['gate','student','admin','caseSummary']) $(name).classList.toggle('hidden', name !== id);
}
function resetIdentity() {
  clearTimeout(draftTimer);
  for (const controller of controllers) controller.abort();
  controllers.clear();
  generation++;
  token = null; snapshot = null; loadedIdentity = null; draftRequest = null; dirty = false; submitting = false;
  sessionStorage.removeItem('leaseToken');
  $('work').reset(); $('journalRows').replaceChildren(); $('worksheetFields').disabled = false;
  $('recoverDraft').classList.add('hidden'); $('submissionNotice').classList.add('hidden');
  $('welcome').textContent=''; $('terms').replaceChildren(); $('caseTitle').textContent='';
  $('partners').replaceChildren(); $('candidates').replaceChildren(); $('comparison').replaceChildren();
  for (const form of ['login','register','recover']) $(form).reset();
}
async function api(path, data, admin = false) {
  const controller = new AbortController(); controllers.add(controller);
  const timer = setTimeout(() => controller.abort(), 12000);
  const headers = {'content-type':'application/json'};
  if (token) headers.Authorization = 'Bearer ' + token;
  if (admin) headers['X-Admin-Key'] = $('adminKey').value;
  try {
    const response = await fetch(base + '/api/' + path, {method:data === undefined ? 'GET' : 'POST', headers, signal:controller.signal, body:data === undefined ? undefined : JSON.stringify(data)});
    if (!response.headers.get('content-type')?.includes('application/json')) throw Error('The server returned an unexpected response. Check your connection and refresh.');
    const body = await response.json();
    if (!response.ok) { const error = Error(body.error || 'Request failed.'); error.status = response.status; throw error; }
    return body;
  } catch (error) {
    if (error.name === 'AbortError') throw Error('The request timed out or was cancelled. Refresh to check whether it completed before trying again.');
    if (error instanceof TypeError) throw Error('Unable to reach the server. Check your connection; your unsaved work remains in this tab.');
    throw error;
  } finally { clearTimeout(timer); controllers.delete(controller); }
}
async function busy(button, task) {
  if (button.dataset.pending) return;
  button.dataset.pending = 'true'; button.disabled = true; button.setAttribute('aria-busy','true');
  const original = button.textContent; button.textContent = 'Working…';
  try { await task(); } catch (error) { msg(error.message); }
  finally { delete button.dataset.pending; button.textContent = original; button.removeAttribute('aria-busy'); button.disabled = false; syncControls(); }
}
function syncControls() {
  $('classControls').disabled = !report; $('enrollmentControls').disabled = !report;
  for (const id of ['exportCSV','exportJSON','discussionBtn','caseSummaryBtn']) $(id).disabled = !report || !!$(id).dataset.pending;
  if (report) {
    const phase = report.allocation;
    const states = {allocate:phase !== 'open', reset:phase !== 'active' || report.interactions.length > 0 || report.submissions.length > 0 || report.drafts.length > 0,
      reopen:phase !== 'active', closeLate:phase !== 'late', closeSubs:!report.submissionsOpen, openSubs:report.submissionsOpen, assignLate:!['active','late'].includes(phase)};
    for (const [id, disabled] of Object.entries(states)) $(id).disabled = disabled || !!$(id).dataset.pending;
  }
  $('submitBtn').disabled = submitting || !!snapshot?.submission || snapshot?.submissionsOpen === false || !!$('submitBtn').dataset.pending;
  $('saveDraft').disabled = !!snapshot?.submission || snapshot?.submissionsOpen === false || !!$('saveDraft').dataset.pending;
}
function worksheet() {
  return {...Object.fromEntries(new FormData($('work'))), journal:JSON.stringify(journal())};
}
function journal() {
  return [...$('journalRows').children].map(row => ({event:row.querySelector('.event').value, account:row.querySelector('.account').value, side:row.querySelector('.side').value, amount:Number(row.querySelector('.amount').value)}));
}
function lineRow(data = {}) {
  const row = document.createElement('tr'), id = ++journalSequence;
  row.innerHTML = '<td><select class="event" aria-label="Accounting event, line '+id+'"><option>Commencement</option><option>Year 1</option></select></td><td><input class="account" maxlength="120" aria-label="Account name, line '+id+'" placeholder="e.g. Lease liability"></td><td><select class="side" aria-label="Debit or credit, line '+id+'"><option>Debit</option><option>Credit</option></select></td><td><input class="amount" type="number" step="1" min="1" aria-label="Amount in IDR, line '+id+'"></td><td><button class="secondary remove" type="button" aria-label="Remove journal line '+id+'">×</button></td>';
  for (const key of ['event','account','side','amount']) if (data[key] !== undefined) row.querySelector('.'+key).value = data[key];
  row.querySelector('.remove').onclick = () => { row.remove(); balance(); queueDraft(); };
  $('journalRows').append(row);
}
function balance() {
  const totals = {};
  for (const line of journal()) { const sum = totals[line.event] ??= {Debit:0,Credit:0}; sum[line.side] += line.amount; }
  $('balance').textContent = Object.entries(totals).map(([event, sum]) => event+': Dr '+fmt(sum.Debit)+' / Cr '+fmt(sum.Credit)+(sum.Debit > 0 && sum.Credit > 0 && Math.abs(sum.Debit-sum.Credit) <= 1 ? ' • balanced' : ' • incomplete or unbalanced')).join(' | ');
}
function populate(data) {
  if (!data) return;
  for (const [key,value] of Object.entries(data)) { const el = $('work').elements.namedItem(key); if (el) el.value = value; }
  if (data.journal) try { const lines = JSON.parse(data.journal); if (Array.isArray(lines)) { $('journalRows').replaceChildren(); lines.forEach(lineRow); } } catch { msg('Saved journal could not be read. Ask your instructor before submitting.'); }
  balance();
}
function queueDraft() {
  if (!snapshot || snapshot.waiting || snapshot.submission || !snapshot.submissionsOpen || submitting) return;
  dirty = true; $('saveStatus').textContent = 'Unsaved changes…';
  clearTimeout(draftTimer); const current = generation;
  draftTimer = setTimeout(() => { if (current === generation) saveDraft(); }, 1400);
}
async function saveDraft() {
  clearTimeout(draftTimer);
  if (!snapshot || snapshot.waiting || snapshot.submission || !snapshot.submissionsOpen) return;
  if (draftRequest) { await draftRequest; if (dirty) return saveDraft(); return; }
  const current = generation, data = worksheet(); dirty = false;
  $('saveStatus').textContent = 'Saving draft…';
  const pending = (async () => {
    try { await api('draft', {data}); if (current === generation) { $('saveStatus').textContent = dirty ? 'Unsaved changes…' : 'Draft saved at '+new Date().toLocaleTimeString(); snapshot.draft = {data,updated_at:new Date().toISOString()}; } }
    catch (error) { if (current === generation) { dirty = true; $('saveStatus').textContent = 'Draft not saved: '+error.message; } }
  })();
  draftRequest = pending;
  try { await pending; } finally { if (draftRequest === pending) draftRequest = null; }
}
function journalTable(raw) {
  let lines; try { lines = JSON.parse(raw); } catch { return '<p>Journal unavailable.</p>'; }
  if (!Array.isArray(lines)) return '<p>Journal unavailable.</p>';
  return '<div class="table-wrap" role="region" aria-label="Submitted journal" tabindex="0"><table><thead><tr><th>Event</th><th>Account</th><th>Side</th><th>IDR</th></tr></thead><tbody>'+lines.map(line=>'<tr><td>'+esc(line.event)+'</td><td>'+esc(line.account)+'</td><td>'+esc(line.side)+'</td><td>'+esc(fmt(line.amount))+'</td></tr>').join('')+'</tbody></table></div>';
}
function renderComparison(s) {
  if (!s.submission) return $('comparison').textContent = 'Submit your own worksheet once to unlock comparison. Keep your first attempt independent.';
  if (!s.comparisons.length) return $('comparison').textContent = 'Your first answer is locked. Waiting for confirmed counterparts to submit; use Refresh to check.';
  $('comparison').innerHTML = '<p class="notice">Differences can be correct: a lessor’s operating asset is not a lessee’s liability; a manufacturer’s selling profit differs from finance income. Reconcile the cash, timing and accounting model during your debrief.</p>'+s.comparisons.map(peer => '<details><summary>Compare with '+esc(peer.partner.name)+'</summary><div class="table-wrap" role="region" aria-label="Accounting comparison" tabindex="0"><table class="comparison"><thead><tr><th>Measure / explanation (legacy answers may use earlier labels)</th><th>Your submitted answer</th><th>Counterpart answer</th></tr></thead><tbody>'+comparisonRows(s.submission.data, peer.data).map(([name,a,b])=>'<tr><th scope="row">'+esc(name)+'</th><td>'+esc(a ?? '—')+'</td><td>'+esc(b ?? '—')+'</td></tr>').join('')+'</tbody></table></div><h3>Your journal</h3>'+journalTable(s.submission.data.journal)+'<h3>Counterpart journal</h3>'+journalTable(peer.data.journal)+'</details>').join('');
}
async function load() {
  const current = generation;
  try {
    const s = await api('me'); if (current !== generation) return;
    snapshot = s; view('student'); $('welcome').textContent = s.user.name+' · '+s.user.niu;
    $('active').classList.toggle('hidden', !!s.waiting);
    if (s.waiting) { $('role').textContent = 'CHECKED IN'; $('status').textContent = 'Waiting for instructor assignment. Stay signed in and use Refresh after the instructor announces allocation.'; return; }
    const u = s.user, c = s.case, lessor = u.role === 'lessor';
    $('role').textContent = lessor ? 'MANUFACTURER / DEALER LESSOR' : 'LESSEE REPRESENTATIVE';
    $('status').textContent = 'Case '+c.id+' · '+s.partners.filter(p=>p.status==='confirmed').length+' confirmed interactions'+(!s.submissionsOpen?' · Submissions closed':'');
    $('caseTitle').textContent = (lessor?c.brand:c.lesseeCompany)+' · '+c.asset;
    const terms = [['Manufacturer',c.brand],['Lessee company',c.lesseeCompany],['Fair value',fmt(c.fv)],...(lessor?[['Manufacturer carrying cost',fmt(c.cost)]]:[]),['Annual payment',fmt(c.rent)],['Lease term',c.years+' years'],['Useful life',c.life+' years'],['Annual rate',c.rate*100+'%'],['Payment timing',c.due==='beginning'?'Beginning of year':'End of year'],['Cash at commencement',fmt(c.due==='beginning'?c.rent:0)],['Unguaranteed residual at lease end',fmt(c.residual)]];
    $('terms').innerHTML = terms.map(([name,value])=>'<div class="detail"><span>'+esc(name)+'</span><b>'+esc(value)+'</b></div>').join(''); $('caseNote').textContent=c.note; $('chapterPrompt').textContent=studentPrompt(c.id,u.role);
    const identity = u.niu+'|'+u.role+'|'+c.id;
    if (loadedIdentity !== identity || s.submission) {
      $('worksheetFields').disabled = false; $('work').reset(); $('journalRows').replaceChildren();
      const select = $('work').elements.namedItem('classification');
      select.innerHTML = '<option value="">Choose…</option>'+(lessor?'<option>Finance lease</option><option>Operating lease</option>':'<option>Lessee right-of-use model</option>');
      $('rouField').classList.toggle('hidden',lessor); $('work').elements.namedItem('rouAsset').disabled=lessor;
      for (const event of ['Commencement','Year 1']) for (const side of ['Debit','Credit']) lineRow({event,side});
      const saved = selectSavedWork(s.submission,s.draft); populate(saved.data); loadedIdentity=identity;
      $('recoverDraft').classList.toggle('hidden',!saved.preservedDraft);
      $('recoverDraft').onclick=()=>download('lease-lab-preserved-draft.json',JSON.stringify(saved.preservedDraft,null,2),'application/json');
      $('submissionNotice').classList.toggle('hidden',!s.submission);
      $('submissionNotice').textContent=s.submission?(s.submission.data.worksheetVersion==='v2.1'?'First answer submitted ':'Existing submission saved ')+s.submission.submitted_at+'. This answer is locked for independent assessment.'+(s.submission.data.worksheetVersion!=='v2.1'?' Legacy worksheet: its original measurement labels may differ; ask your instructor before comparing amounts.':'')+(saved.preservedDraft?' A different saved draft is preserved; download it below.':''):'';
    }
    $('classLabel').textContent=lessor?'Lessor classification':'Lessee accounting model';
    $('pvLabel').textContent=lessor?'Finance receivable after commencement cash / operating asset carrying amount (IDR)':'Lease liability after commencement cash (IDR)';
    $('interestLabel').textContent=lessor?'Year 1 finance income, 0 for operating (IDR)':'Year 1 interest expense (IDR)';
    $('reasonLabel').textContent=lessor?'Explain classification, manufacturer selling profit and commencement cash':'Explain the ROU asset, outstanding liability and payment timing';
    $('worksheetFields').disabled=!!s.submission || !s.submissionsOpen;
    $('saveStatus').textContent=s.submission?'Submitted answer locked':!s.submissionsOpen?'Submissions and draft saves are closed':dirty?'Unsaved changes…':s.draft?'Draft saved '+s.draft.updated_at:'No saved draft yet';
    $('partners').innerHTML=s.partners.length?'<h3>Your requests & interactions</h3>'+s.partners.map(p=>'<div class="counterpart"><b>'+esc(p.name)+'</b> ('+esc(p.niu)+') <span class="pill">'+esc(p.status)+'</span> '+(p.status==='requested'&&p.initiatedBy!==u.niu?'<button type="button" class="confirm" data-id="'+p.interactionId+'">Confirm discussion</button>':'')+'</div>').join(''):'<p>No interactions recorded. Request a discussion below, meet, and ask your counterpart to confirm.</p>';
    for (const button of document.querySelectorAll('.confirm')) button.onclick=()=>busy(button,async()=>{await api('confirm',{interactionId:Number(button.dataset.id)});await load();});
    renderComparison(s); syncControls();
    const q = await api('queue'); if(current!==generation)return;
    $('candidates').innerHTML=q.candidates.length?q.candidates.map(p=>{const exists=s.partners.some(peer=>peer.niu===p.niu);return '<div class="counterpart row"><span><b>'+esc(p.name)+'</b> ('+esc(p.niu)+')</span><button type="button" class="request secondary" data-niu="'+esc(p.niu)+'" '+(exists?'disabled':'')+'>'+(exists?'Discussion requested':'Request discussion')+'</button></div>';}).join(''):'<p>No counterpart listed. Ask your instructor.</p>';
    for(const button of document.querySelectorAll('.request'))if(!button.disabled)button.onclick=()=>busy(button,async()=>{await api('match',{partnerNiu:button.dataset.niu});await load();msg('Request sent. Meet your counterpart and ask them to confirm.',true);});
  } catch(error) { if(current!==generation)return; if(error.status===401){resetIdentity();view('gate');} msg(error.message); }
}
function clearReport() { summaryCases=[];summaryIndex=null;$('caseSummaryContent').replaceChildren();$('summaryCaseTabs').replaceChildren(); $('enrollmentStatus').textContent='Load the dashboard to configure the shared code.'; adminGeneration++; report=null; $('stats').textContent='Dashboard not loaded. Enter your key and load the dashboard.'; $('adminTable').replaceChildren(); $('discussion').replaceChildren(); syncControls(); }
async function loadAdmin() {
  clearReport(); const currentAdmin=adminGeneration; $('stats').textContent='Loading dashboard…';
  try {
    const r=await api('admin',undefined,true); if(currentAdmin!==adminGeneration)return; report=r; view('admin'); $('enrollmentStatus').textContent=r.enrollmentCodeConfigured?'A shared class code is configured. Set a new code below if needed; existing logins are unchanged.':'Set the shared class code below before students check in.';
    const matched=new Set(r.interactions.filter(x=>x.status==='confirmed').flatMap(x=>[x.lessor_niu,x.lessee_niu]));
    $('stats').textContent='Checked in: '+r.students.length+' · Phase: '+r.allocation+' · Confirmed interactions: '+r.interactions.filter(x=>x.status==='confirmed').length+' · Awaiting interaction: '+(r.students.length-matched.size)+' · Submitted: '+r.submissions.length+' · Drafts: '+r.drafts.length+' · Submissions '+(r.submissionsOpen?'open':'closed');
    $('adminTable').innerHTML='<thead><tr><th>NIU</th><th>Student</th><th>Case</th><th>Role</th><th>Confirmed counterparts</th><th>Submission</th></tr></thead><tbody>'+r.students.map(student=>'<tr><td>'+esc(student.niu)+'</td><td>'+esc(student.name)+'</td><td>'+esc(student.assigned_at?student.case_id:'Waiting')+'</td><td>'+esc(student.assigned_at?student.role:'—')+'</td><td>'+r.interactions.filter(x=>x.status==='confirmed'&&(x.lessor_niu===student.niu||x.lessee_niu===student.niu)).map(x=>esc(x.lessor_niu===student.niu?x.lessee_niu:x.lessor_niu)).join('; ')+'</td><td>'+(r.submissions.some(x=>x.niu===student.niu)?'Submitted':'Pending')+'</td></tr>').join('')+'</tbody>';
  } catch(error) { if(currentAdmin===adminGeneration){clearReport();throw error;} } finally {syncControls();}
}
async function adminAction(path,data={}) { await api('admin/'+path,data,true); await loadAdmin(); msg('Action completed. The dashboard now shows the updated phase.',true); }
function download(name,text,type) { const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }

for(const form of ['register','login','recover'])$(form).onsubmit=event=>{
  event.preventDefault(); const button=$(form).querySelector('button');
  busy(button,async()=>{
    const data=Object.fromEntries(new FormData($(form)));
    if(form==='recover'){await api(form,data);$(form).reset();msg('PIN reset. Sign in using your new PIN.',true);return;}
    const result=await api(form,data);resetIdentity();token=result.token;sessionStorage.setItem('leaseToken',token);await load();
  });
};
$('work').addEventListener('input',()=>{balance();queueDraft();});
$('addLine').onclick=()=>{lineRow();queueDraft();};
$('saveDraft').onclick=()=>busy($('saveDraft'),saveDraft);
$('work').onsubmit=event=>{
  event.preventDefault(); const data=worksheet(),error=validateWorksheet(data,snapshot.user.role);
  if(error){msg(error);$('message').focus();return;}
  if(!confirm('Submit your first independent answer? It will be locked and cannot be replaced.'))return;
  busy($('submitBtn'),async()=>{
    submitting=true;clearTimeout(draftTimer);if(draftRequest)await draftRequest;
    try{await api('submit',{data});dirty=false;await load();msg('Your first worksheet was submitted and locked.',true);}finally{submitting=false;}
  });
};
$('refresh').onclick=()=>busy($('refresh'),load);
$('logout').onclick=()=>{if(dirty&&!confirm('Some changes are not saved. Sign out and leave them behind?'))return;resetIdentity();view('gate');};
$('teacherLink').onclick=()=>{view('admin');clearReport();history.replaceState(null,'',base+'/admin');};
$('goBack').onclick=()=>{clearReport();$('adminKey').value='';$('sharedEnrollmentCode').value='';view('gate');history.replaceState(null,'',base||'/');};
$('adminKey').addEventListener('input',clearReport);
$('loadAdmin').onclick=()=>busy($('loadAdmin'),loadAdmin);
$('migrate').onclick=()=>busy($('migrate'),async()=>{if(!$('adminKey').value)throw Error('Enter your instructor key first.');if(!confirm('Initialize missing V2 tables? Use only during planned setup.'))return;await api('admin/migrate',{},true);await loadAdmin();msg('Database setup completed.',true);});
const commands={allocate:['allocate','Finalize attendance and randomize roles? Verify the attendance list first.'],reset:['reset','Reset this unused allocation? No draft, interaction or submission may exist.'],reopen:['reopen','Open late check-in?'],closeLate:['close-late',null],closeSubs:['close-submissions','Close submissions AND draft saves? Announce this to students first.'],openSubs:['open-submissions',null]};
for(const[id,[path,question]]of Object.entries(commands))$(id).onclick=()=>busy($(id),()=>{if(question&&!confirm(question))return;return adminAction(path,path==='reset'?{confirm:'RESET_UNSTARTED_SESSION'}:{});});
$('setEnrollmentCode').onclick=()=>busy($('setEnrollmentCode'),async()=>{
  const code=$('sharedEnrollmentCode').value.trim();
  if(code.length<6||code.length>64)throw Error('Choose a class code of 6–64 characters.');
  await api('admin/enrollment-code',{code},true);$('sharedEnrollmentCode').value='';await loadAdmin();msg('Class enrollment code updated. Announce the code to attending students; their personal PINs are unchanged.',true);
});
$('assignLate').onclick=()=>busy($('assignLate'),async()=>{const niu=$('lateNiu').value.trim();if(!/^\d{4,12}$/.test(niu))throw Error('Enter a registered short NIU of 4–12 digits.');await adminAction('late',{niu,role:$('lateRole').value,caseId:Number($('lateCase').value)});});

function solutionJournal(lines) {
 return '<div class="table-wrap"><table><thead><tr><th>Date</th><th>Debit</th><th>Credit</th><th>Amount (IDR)</th><th>Explanation</th></tr></thead><tbody>'+lines.map(x=>'<tr><td>'+esc(x.date)+'</td><td>'+esc(x.debit)+'</td><td>'+esc(x.credit)+'</td><td>'+esc(fmt(x.amount))+'</td><td>'+esc(x.reason)+'</td></tr>').join('')+'</tbody></table></div>';
}
function solutionSchedule(rows) {
 return '<div class="table-wrap"><table><thead><tr><th>Year</th><th>Opening balance</th><th>Interest</th><th>Payment</th><th>Closing balance</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+x.year+'</td><td>'+fmt(x.opening)+'</td><td>'+fmt(x.interest)+'</td><td>'+fmt(x.payment)+'</td><td>'+fmt(x.closing)+'</td></tr>').join('')+'</tbody></table></div>';
}
function solutionMetrics(o) {
 return '<div class="table-wrap"><table><thead><tr><th>Measurement</th><th>IDR</th></tr></thead><tbody>'+Object.entries(o).filter(([,v])=>v!==null).map(([k,v])=>'<tr><td>'+esc(k.replace(/([A-Z])/g,' $1').replace(/^./,x=>x.toUpperCase()))+'</td><td>'+fmt(v)+'</td></tr>').join('')+'</tbody></table></div>';
}
$('loadAnswerKeys').onclick=()=>busy($('loadAnswerKeys'),async()=>{
 const target=$('answerKeyContent');target.textContent='Loading instructor solutions…';
 try {
  const result=await api('admin/answer-keys',undefined,true);
  target.innerHTML='<p class="muted">'+esc(result.reference)+'</p>'+result.cases.map(c=>
   '<details class="panel"><summary><b>Case '+c.id+' · '+esc(c.manufacturer)+' / '+esc(c.lessee)+'</b> — '+esc(c.asset)+'</summary>'+
   '<h3>Classification and reasoning</h3><p>'+esc(c.classification)+'. '+esc(c.rationale)+'</p>'+
   '<h3>Measurement</h3>'+solutionMetrics(c.amounts)+
   '<h3>Lessee journal entries</h3>'+solutionJournal(c.journal.lessee)+
   '<h3>Manufacturer/dealer lessor journal entries</h3>'+solutionJournal(c.journal.lessor)+
   '<h3>Effective-interest schedule</h3>'+solutionSchedule(c.schedule)+
   '<h3>Discussion notes</h3><ul>'+c.cautions.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></details>'
  ).join('');
 } catch(error){target.textContent=error.message;throw error;}
});

function summaryMoney(value){return value===null||value===undefined?'—':fmt(value);}
function summaryInitial(c){return c.classification.startsWith('Finance')?c.amounts.liabilityAfterCommencement:c.assumptions.carryingCost;}
function summaryMetrics(items){return items.map(([label,value])=>'<div class="detail"><span>'+esc(label)+'</span><b>'+esc(summaryMoney(value))+'</b></div>').join('');}
function renderCaseSummary(index=null){
 summaryIndex=index;
 $('summaryPrevious').disabled=index===null||index===0;
 $('summaryNext').disabled=index===null||index===summaryCases.length-1;
 $('summaryOverview').setAttribute('aria-current',index===null?'page':'false');
 $('summaryCaseTabs').innerHTML=summaryCases.map((c,i)=>'<button type="button" class="secondary summary-case" data-index="'+i+'" aria-current="'+(i===index?'page':'false')+'">Case '+c.id+'</button>').join('');
 for(const button of document.querySelectorAll('.summary-case'))button.onclick=()=>renderCaseSummary(Number(button.dataset.index));
 const target=$('caseSummaryContent');
 if(index===null){
  $('caseSummaryTitle').textContent='Five lease cases · Discussion summary';
  target.innerHTML='<p class="notice">Compare the accounting models first. The operating lessor retains its underlying asset, while its lessee still recognizes a liability and a right-of-use asset.</p><div class="table-wrap" role="region" aria-label="All five lease cases" tabindex="0"><table class="summary-overview"><caption class="sr-only">Contract and initial accounting comparison</caption><thead><tr><th scope="col">Case / asset</th><th scope="col">Contract</th><th scope="col">Lessor model</th><th scope="col">Lessor initial receivable / asset</th><th scope="col">Lessee liability</th><th scope="col">Lessee ROU asset</th></tr></thead><tbody>'+summaryCases.map(c=>'<tr><th scope="row">Case '+c.id+'<br>'+esc(c.asset)+'</th><td>'+c.assumptions.years+' years<br>'+esc(fmt(c.assumptions.rental))+' / year<br>'+esc(c.assumptions.paymentTiming==='beginning'?'Beginning of year':'End of year')+'</td><td>'+esc(c.classification)+'</td><td>'+esc(summaryMoney(summaryInitial(c)))+'</td><td>'+esc(summaryMoney(c.amounts.liabilityAfterCommencement))+'</td><td>'+esc(summaryMoney(c.amounts.rouAssetAtCommencement))+'</td></tr>').join('')+'</tbody></table></div><h2>Lead the discussion</h2><ol>'+DEBRIEF_QUESTIONS.map(q=>'<li>'+esc(q)+'</li>').join('')+'</ol>';
 }else{
  const c=summaryCases[index],a=c.amounts,t=c.assumptions,finance=c.classification.startsWith('Finance');
  $('caseSummaryTitle').textContent='Case '+c.id+' · '+c.asset;
  target.innerHTML='<p><b>'+esc(c.manufacturer)+'</b> ↔ <b>'+esc(c.lessee)+'</b></p><p class="notice"><b>'+esc(c.classification)+'.</b> '+esc(c.rationale)+'</p><div class="card"><h2>Contract at a glance</h2><p>'+t.years+'-year lease · '+t.usefulLife+'-year useful life · '+esc(fmt(t.rental))+' annual payment · '+esc(t.paymentTiming==='beginning'?'paid at the beginning of each year':'paid at each year-end')+' · '+esc((t.annualRate*100).toFixed(0))+'% annual rate</p>'+summaryMetrics([['Fair value',t.fairValue],['Manufacturer carrying cost',t.carryingCost],['Unguaranteed residual at lease end',t.unguaranteedResidual],['Cash paid / received at commencement',a.cashAtCommencement]])+'</div><div class="case-grid"><article class="card"><h2>Lessor</h2>'+summaryMetrics(finance?[['Initial finance receivable after cash',a.liabilityAfterCommencement],['Sales revenue at commencement',a.lessorRevenue],['Cost of sales',a.lessorCostOfSales],['Selling profit at commencement',a.lessorSellingProfit],['Year 1 finance income',a.lessorFinanceIncomeYear1],['Year 1 closing receivable',a.lessorReceivableYear1End]]:[['Underlying asset retained at commencement',t.carryingCost],['Year 1 rental income',a.lessorOperatingRentalIncomeYear1],['Year 1 depreciation',a.lessorDepreciationYear1],['Year 1 closing underlying asset',a.lessorUnderlyingAssetYear1End],['Selling profit at commencement',0]])+'</article><article class="card"><h2>Lessee · ROU model</h2>'+summaryMetrics([['Initial liability after cash',a.liabilityAfterCommencement],['Initial ROU asset',a.rouAssetAtCommencement],['Year 1 interest expense',a.year1Interest],['Year 1 ROU depreciation',a.rouDepreciationYear1],['Year 1 closing liability',a.year1EndLiability],['Year 1 closing ROU asset',a.rouAssetAtYear1End]])+'</article></div><div class="notice"><h2>Key discussion point</h2><p>'+esc(misconception(c.id))+'</p></div>';
 }
 $('caseSummaryTitle').focus();
}
$('caseSummaryBtn').onclick=()=>busy($('caseSummaryBtn'),async()=>{
 const current=adminGeneration;
 const result=await api('admin/answer-keys',undefined,true);
 if(current!==adminGeneration)return;
 summaryCases=result.cases;view('caseSummary');renderCaseSummary();
});
$('closeCaseSummary').onclick=()=>{view('admin');$('caseSummaryBtn').focus();};
$('summaryOverview').onclick=()=>renderCaseSummary();
$('summaryPrevious').onclick=()=>{if(summaryIndex!==null&&summaryIndex>0)renderCaseSummary(summaryIndex-1);};
$('summaryNext').onclick=()=>{if(summaryIndex!==null&&summaryIndex<summaryCases.length-1)renderCaseSummary(summaryIndex+1);};

$('discussionBtn').onclick=()=>busy($('discussionBtn'),async()=>{
  const r=await api('admin/discussion',undefined,true);$('discussion').classList.remove('hidden');
  $('discussion').innerHTML='<h2>Discussion dashboard</h2><div class="panel"><b>Chapter 20 · Discussion</b><ol>'+DEBRIEF_QUESTIONS.map(question=>'<li>'+esc(question)+'</li>').join('')+'</ol></div><p>Compare class submissions with the worked solutions. Discuss differences in classification, measurement and journal entries.</p><div class="grid">'+r.discussions.map(d=>'<article class="card"><span class="eyebrow">Case '+d.caseId+'</span><h3>'+esc(d.manufacturer)+'</h3><p>Participants '+d.participants+' · Confirmed interactions '+d.interactions+' · Submissions '+d.submissions+' · Legacy worksheets '+d.legacySubmissions+'</p><p>Lessor classification: '+d.finance+' finance / '+d.operating+' operating</p><p>Median lessor receivable / operating asset: '+(d.medianLessor==null?'—':fmt(d.medianLessor))+'</p><p>Median recognized lessee liability: '+(d.medianLessee==null?'—':fmt(d.medianLessee))+'</p><p>Median ROU asset: '+(d.medianROU==null?'—':fmt(d.medianROU))+'</p><details><summary>Accounting benchmark</summary><p><b>Kieso Chapter 20 teaching focus:</b> '+esc(misconception(d.caseId))+'</p><p>Reconcile commencement cash, receivable/liability, ROU asset, selling profit and Year 1 effects. The amounts below are instructor benchmarks, not automated grades.</p><pre>'+esc(JSON.stringify(d.expected,null,2))+'</pre></details></article>').join('')+'</div>';
});
$('exportJSON').onclick=()=>{if(report)download('lease-lab-report.json',JSON.stringify(report,null,2),'application/json');};
$('exportCSV').onclick=()=>{
  if(!report)return;const cols=['niu','name','role','case_id','assigned_at','submitted_at'];
  const safe=value=>{let text=String(value??'');if(/^[=+\-@\t\r]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
  download('lease-lab-attendance.csv',[cols.join(','),...report.students.map(student=>{const row={...student,submitted_at:report.submissions.find(x=>x.niu===student.niu)?.submitted_at||''};return cols.map(key=>safe(row[key])).join(',');})].join('\r\n'),'text/csv');
};
window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
syncControls();
if(location.pathname.replace(/\/$/,'').endsWith('/admin'))view('admin');else if(token)load();else view('gate');
