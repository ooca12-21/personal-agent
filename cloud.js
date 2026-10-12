(function(root){
'use strict';
const C=root.AgentSyncCore,config=root.AgentCloudConfig;
const GUEST='pa-prototype-v1',PREFIX='pa-account-v1:',IMPORTED='pa-imported-v1:';
function create(hooks){
 let client=null,user=null,epoch=0,flight=null,timer=null,base=C.empty(),revision=0,importHandled=false,status='仅保存在此设备',issue=root.location&&/[?&]error=/.test(root.location.search)?'GitHub 登录未成功，请重试；若持续失败请联系管理员检查登录配置。':'',cacheIssue='';
 const emit=()=>{try{if(user&&localStorage.getItem(IMPORTED+user.id)==='yes')importHandled=true}catch{}return hooks.status({user,status,issue:cacheIssue||issue,available:!!client,importAvailable:!!user&&!importHandled&&guestHasData()})};
 const guest=()=>{try{return JSON.parse(localStorage.getItem(GUEST))}catch{return null}};
 const guestHasData=()=>{const g=guest();return !!g&&['tasks','history','trash'].some(k=>g[k]?.length)};
 function persist(){
  try{if(user)localStorage.setItem(PREFIX+user.id,JSON.stringify({state:hooks.get(),base,revision,importHandled}));else localStorage.setItem(GUEST,JSON.stringify(hooks.get()));cacheIssue='';return true}
  catch{status='此设备保存失败，请导出记录';cacheIssue='此设备缓存保存失败，请导出记录';emit();return false}
 }
 function capture(){persist();if(user){status=navigator.onLine?'等待同步':'离线 · 待同步';emit();schedule()}}
 function schedule(){clearTimeout(timer);timer=setTimeout(()=>sync(),700)}
 function readable(error){const message=error?.message||'';if(/fetch|network|offline/i.test(message))return '连接失败，任务仍保存在此设备';if(/JWT|token|expired/i.test(message))return '登录已过期，请重新登录';if(/relation|function|schema|permission/i.test(message))return '云端尚未配置完成';return '同步失败，请稍后重试或导出记录'}
 function normalized(x){return C.normalize(C.clone(x),hooks.model,hooks.today())}
 async function sync(){
  if(!client||!user)return;
  if(flight){schedule();return}
  if(!navigator.onLine){status='离线 · 待同步';emit();return}
  const stamp=epoch,owner=user.id,token={};flight=token;status='同步中…';issue='';emit();
  const alive=()=>epoch===stamp&&user?.id===owner;
  try{
   const {data,error}=await client.from('agent_documents').select('revision,payload').eq('user_id',owner).maybeSingle();
   if(error)throw error;if(!alive())return;
   const remote=data?normalized(data.payload):normalized(C.empty());
   const merged=normalized(C.merge(base,hooks.get(),remote));base=C.clone(remote);revision=data?.revision||0;hooks.set(merged);persist();
   for(let attempts=0;attempts<4;attempts++){
    const sent=C.clone(hooks.get());
    if(revision&&C.same(sent,base)){status='已同步';issue='';emit();return}
    const response=await client.rpc('agent_sync',{expected_revision:revision,new_payload:sent});
    if(response.error)throw response.error;if(!alive())return;
    const row=response.data?.[0];if(!row)throw new Error('Missing sync response');
    const cloud=normalized(row.payload);
    hooks.set(normalized(C.merge(row.applied?sent:base,hooks.get(),cloud)));base=C.clone(cloud);revision=row.revision;persist();
    if(row.applied&&C.same(hooks.get(),base)){status='已同步';issue='';emit();return}
   }
   status='等待合并 · 稍后重试';schedule();emit();
  }catch(error){if(alive()){status='未同步 · 本地已保存';issue=readable(error);emit()}}
  finally{if(flight===token)flight=null}
 }
 function switchUser(next){
  if(next?.id===user?.id&&!!next===!!user){if(next){user=next;emit();sync()}return}
  persist();epoch++;user=next;clearTimeout(timer);base=C.empty();revision=0;importHandled=false;
  let value;
  if(user){try{const cache=JSON.parse(localStorage.getItem(PREFIX+user.id));if(cache&&C.valid(cache.state)&&C.valid(cache.base)){value=cache.state;base=cache.base;revision=cache.revision||0;importHandled=!!cache.importHandled}}catch{}value=value||C.empty()}
  else value=guest()||C.empty();
  hooks.switch(normalized(value));status=user?'等待同步':'仅保存在此设备';issue='';emit();if(user)sync();
 }
 async function init(){
  if(!config?.url||!config?.key||!root.supabase){issue='云端连接未就绪，可继续本地使用';emit();return}
  client=root.supabase.createClient(config.url,config.key,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'pa-auth-v1'}});
  client.auth.onAuthStateChange((event,session)=>{setTimeout(()=>switchUser(session?.user||null),0)});
  try{const {data,error}=await client.auth.getSession();if(error)throw error;switchUser(data.session?.user||null)}catch(error){issue=readable(error);emit()}
  setInterval(()=>{if(document.visibilityState==='visible'&&user)sync()},15000);
  window.addEventListener('online',sync);window.addEventListener('offline',()=>{if(user){status='离线 · 待同步';emit()}});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sync()});emit();
 }
 async function login(){if(!client)return;const {error}=await client.auth.signInWithOAuth({provider:'github',options:{redirectTo:config.redirect}});if(error){issue=readable(error);emit()}}
 async function logout(){if(!client)return;persist();const {error}=await client.auth.signOut({scope:'local'});if(error){issue='退出失败，请重试';emit();return}switchUser(null)}
 function importGuest(){if(!user)return;const value=guest();if(!value)return;hooks.set(normalized(C.importDocument(hooks.get(),normalized(value))));importHandled=true;try{localStorage.setItem(IMPORTED+user.id,'yes')}catch{}capture()}
 function skipImport(){importHandled=true;try{localStorage.setItem(IMPORTED+user.id,'yes')}catch{}persist();emit()}
 return {init,capture,sync,login,logout,importGuest,skipImport,info:()=>({user,status,issue,importHandled})};
}
root.AgentCloud={create};
})(window);
