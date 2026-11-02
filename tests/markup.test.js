import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
test('every static form control has a unique id and associated visible label',()=>{
  const allIds=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(allIds).size,allIds.length,'Duplicate DOM ids');
  const labelTargets=new Set([...html.matchAll(/<label\b[^>]*\bfor="([^"]+)"/g)].map(match=>match[1]));
  for(const[control]of html.matchAll(/<(?:input|select|textarea)\b[^>]*>/g)){
    const id=control.match(/\bid="([^"]+)"/)?.[1];assert.ok(id,'Control needs id: '+control);assert.ok(labelTargets.has(id),'Missing label for '+id);
  }
});
test('client static element references resolve in the document',()=>{
  const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]));
  for(const[,id]of app.matchAll(/\$\('([^']+)'\)/g))assert.ok(ids.has(id),'Missing element '+id);
});
