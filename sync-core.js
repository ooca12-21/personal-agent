(function(root){
'use strict';
const clone=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const identified=a=>Array.isArray(a)&&a.every(x=>object(x)&&typeof x.id==='string');
// Rebase only changes made since the last acknowledged cloud snapshot.
// Deletion wins over stale edits; independent fields and child additions merge.
function merge(base,local,remote){
 if(same(local,base))return clone(remote);
 if(same(remote,base)||same(local,remote))return clone(local);
 if(Array.isArray(local)&&Array.isArray(remote)){
  const b=Array.isArray(base)?base:[];
  if(identified(local)&&identified(remote)&&identified(b)){
   const bm=new Map(b.map(x=>[x.id,x])),lm=new Map(local.map(x=>[x.id,x])),rm=new Map(remote.map(x=>[x.id,x]));
   const orderChanged=!same(local.filter(x=>bm.has(x.id)).map(x=>x.id),b.filter(x=>lm.has(x.id)).map(x=>x.id));
   const order=orderChanged?[...local,...remote]:[...remote,...local],out=[],seen=new Set();
   for(const x of order){const id=x.id;if(seen.has(id))continue;seen.add(id);if(bm.has(id)&&(!lm.has(id)||!rm.has(id)))continue;out.push(merge(bm.get(id),lm.get(id),rm.get(id)));}
   return out.filter(x=>x!==undefined);
  }
  // Primitive arrays are sets (tags and deleted-record markers).
  return [...new Set([...remote,...local])].filter(x=>!b.includes(x)||(local.includes(x)&&remote.includes(x)));
 }
 if(object(local)&&object(remote)){
  const b=object(base)?base:{},out={};
  for(const key of new Set([...Object.keys(b),...Object.keys(local),...Object.keys(remote)])){
   const value=merge(b[key],local[key],remote[key]);if(value!==undefined)out[key]=value;
  }return out;
 }
 // A later synchronized edit wins when both devices edit the same field.
 return clone(local);
}
function valid(x){return object(x)&&Array.isArray(x.tasks)&&Array.isArray(x.history)&&Array.isArray(x.tags)&&Array.isArray(x.trash);}
function empty(){return {tasks:[],history:[],tags:[],trash:[],removedHistoryIds:[],subtaskDateDefaultsApplied:true};}
function normalize(x,model,today){
 if(!valid(x))throw new Error('云端数据格式不兼容，请先导出记录。');
 model.migrate(x,today);
 for(const t of x.tasks)if(t.done)for(const s of t.subtasks||[])if(!s.done){s.done=true;s.completedAt=t.completedAt||null;if(!x.removedHistoryIds.includes(s.id)&&!x.history.some(r=>r.id===s.id))x.history.push({...clone(s),parentId:t.id,parentTitle:t.title,isSubtask:true});}
 return x;
}
const api={clone,same,merge,valid,empty,normalize};
if(typeof module==='object'&&module.exports)module.exports=api;else root.AgentSyncCore=api;
})(typeof window==='object'?window:globalThis);
