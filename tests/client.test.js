import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { validateWorksheet, selectSavedWork, comparisonRows } from '../public/worksheet.js';

// A deliberately small DOM facade tests request/state lifecycle, not browser layout.
function client(fetchImpl, timers={setTimeout,clearTimeout}) {
  const elements=new Map();
  class Element {
    constructor(){this.value='';this.disabled=false;this.dataset={};this.children=[];this.attributes={};this.classList={toggle(){},add(){},remove(){}};this.textContent='';}
    addEventListener(){}
    setAttribute(k,v){this.attributes[k]=v;}
    removeAttribute(k){delete this.attributes[k];}
    querySelector(){return new Element();}
    replaceChildren(){this.children=[];}
    reset(){if(this.elements)for(const field of this.fields.values())field.value='';}
  }
  const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
  for(const[,id]of html.matchAll(/\bid="([^"]+)"/g))elements.set(id,new Element());
  const work=elements.get('work');work.fields=new Map();
  for(const field of ['classification','pv','firstInterest','rouAsset','reason','statementImpact','reflection'])work.fields.set(field,new Element());
  work.elements={namedItem:key=>work.fields.get(key)};
  const session=new Map();
  const context=vm.createContext({document:{getElementById:id=>{assert.ok(elements.has(id),id);return elements.get(id);}},location:{pathname:'/lease-lab'},history:{replaceState(){}},sessionStorage:{getItem:k=>session.get(k),setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)},window:{addEventListener(){}},setTimeout:timers.setTimeout,clearTimeout:timers.clearTimeout,AbortController,fetch:fetchImpl,Intl,URL,Blob,confirm:()=>false,validateWorksheet,selectSavedWork,comparisonRows});
  const code=readFileSync(new URL('../public/app.js',import.meta.url),'utf8').replace(/^import[^\n]*\n/,'');
  vm.runInContext(code,context);
  return {elements,run:code=>vm.runInContext(code,context)};
}
test('sign-out clears pending autosave and all scalar worksheet state',()=>{
  let cancelled=false;
  const c=client(()=>{}, {setTimeout:()=>1,clearTimeout:()=>{cancelled=true;}});
  c.run("token='prior-user';snapshot={user:{niu:'9001'}};draftTimer=123;dirty=true;$('work').elements.namedItem('pv').value='999';$('work').elements.namedItem('reason').value='Prior answer';resetIdentity();");
  assert.equal(c.run('token'),null);assert.equal(c.run('snapshot'),null);assert.equal(c.run('dirty'),false);
  assert.equal(c.elements.get('work').elements.namedItem('pv').value,'');assert.equal(c.elements.get('work').elements.namedItem('reason').value,'');assert.equal(cancelled,true);
});
test('unexpected non-JSON upstream error is readable and pending button is released',async()=>{
  const c=client(async()=>new Response('<html>Unavailable</html>',{status:502,headers:{'content-type':'text/html'}}));
  await c.run("busy($('loadAdmin'),()=>api('admin'))");
  assert.match(c.elements.get('message').textContent,/unexpected response/);
  assert.equal(c.elements.get('loadAdmin').disabled,false);assert.equal(c.elements.get('loadAdmin').attributes['aria-busy'],undefined);
  assert.equal(c.elements.get('classControls').disabled,true);
});
test('timeout gives recovery guidance and does not automatically retry a command',async()=>{
  let calls=0;
  const c=client((url,{signal})=>{calls++;return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError'))));},{setTimeout:callback=>{queueMicrotask(callback);return 1;},clearTimeout:()=>{}});
  await c.run("busy($('loadAdmin'),()=>api('admin/reset',{}))");
  assert.match(c.elements.get('message').textContent,/timed out or was cancelled/);assert.equal(calls,1);assert.equal(c.elements.get('loadAdmin').disabled,false);
});
test('changing views clears stale instructor messages',()=>{
  const c=client(()=>{});c.run("msg('Refresh dashboard first.');view('gate');");assert.equal(c.elements.get('message').textContent,'');
});
