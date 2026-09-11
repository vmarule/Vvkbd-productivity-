/* VVKBD Productivity recurring schedule engine - stability patch */
(function(){'use strict';
const KEY='vvkbd_v2',DELETED='vvkbd_deleted_events',DEFAULTS='vvkbd_defaults_installed_v2';
const pad=n=>String(n).padStart(2,'0');
const dateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const load=()=>{try{const d=JSON.parse(localStorage.getItem(KEY)||'{}');d.tasks=Array.isArray(d.tasks)?d.tasks:[];d.goals=Array.isArray(d.goals)?d.goals:[];d.sales=d.sales||{};return d}catch(e){return{tasks:[],goals:[],sales:{}}}};
const save=d=>{localStorage.setItem(KEY,JSON.stringify(d));};
const deleted=()=>{try{return new Set(JSON.parse(localStorage.getItem(DELETED)||'[]').map(String))}catch(e){return new Set()}};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const hm=v=>{const m=String(v||'').match(/T(\d{2}):(\d{2})/);return m?{h:+m[1],m:+m[2]}:{h:9,m:0}};
const makeDT=(d,h,m,s=0)=>`${dateKey(d)}T${pad(h)}:${pad(m)}${s?':'+pad(s):''}`;
function localParse(v){const m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);if(!m)return new Date(v);return new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+(m[6]||0),0)}
function duration(task){const s=localParse(task.start),e=localParse(task.end);return(!isNaN(s)&&!isNaN(e)&&e>s)?e-s:0}
function hasRepeat(t){return t&&t.repeat&&String(t.repeat)!=='None'}
function matches(day,base,repeat){repeat=String(repeat||'');if(repeat==='Daily')return true;if(repeat==='Weekdays (Mon–Fri)')return day.getDay()>0&&day.getDay()<6;if(repeat==='Weekly')return day.getDay()===base.getDay();if(repeat==='Monthly')return day.getDate()===base.getDate();return false}
function materialise(){
 const d=load(),del=deleted();
 d.tasks=d.tasks.filter(t=>!del.has(String(t.id)));
 if(!Number.isFinite(Number(d.sales.target))||Number(d.sales.target)<=0)d.sales.target=5000;
 if(!localStorage.getItem(DEFAULTS)){
   const today=new Date(),k=dateKey(today),titles=d.tasks.map(t=>String(t.title||'').trim().toLowerCase());
   if(!titles.includes('gym'))d.tasks.push({id:'recurring-gym-master',title:'Gym',start:k+'T06:00',end:k+'T07:00',repeat:'Weekdays (Mon–Fri)',reminder:'15',priority:'Medium',notes:'',done:false,recurringMaster:true});
   if(!titles.includes('sales'))d.tasks.push({id:'recurring-sales-master',title:'Sales',start:k+'T09:00',end:k+'T17:00',repeat:'Weekdays (Mon–Fri)',reminder:'none',priority:'Medium',notes:'',done:false,recurringMaster:true});
   localStorage.setItem(DEFAULTS,'1');
 }
 const masters=d.tasks.filter(t=>t&&!t.masterId&&!t.generated&&hasRepeat(t));
 const horizon=365;
 masters.forEach(master=>{
   const base=localParse(master.start),dur=duration(master);if(isNaN(base)||!dur)return;
   const sh=hm(master.start),startDay=new Date(base.getFullYear(),base.getMonth(),base.getDate());
   for(let i=0;i<horizon;i++){
     const day=addDays(new Date(),i);if(day<startDay||!matches(day,base,master.repeat))continue;
     const os=new Date(day.getFullYear(),day.getMonth(),day.getDate(),sh.h,sh.m,base.getSeconds(),base.getMilliseconds());
     const oe=new Date(os.getTime()+dur),id=String(master.id)+'::'+dateKey(os);
     if(del.has(id)||d.tasks.some(t=>String(t.id)===id))continue;
     d.tasks.push({id,masterId:master.id,title:master.title,start:makeDT(os,os.getHours(),os.getMinutes(),os.getSeconds()),end:makeDT(oe,oe.getHours(),oe.getMinutes(),oe.getSeconds()),reminder:master.reminder||'none',priority:master.priority||'Medium',repeat:'None',notes:master.notes||'',done:false,generated:true});
   }
 });
 save(d);
 if(typeof window.installEditableTarget==='function')window.installEditableTarget();
}

/* In-app backup: protects localStorage data from accidental browser/device loss. */
function exportBackup(){const raw=localStorage.getItem(KEY)||'{}';const payload={version:1,exportedAt:new Date().toISOString(),data:JSON.parse(raw)};const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));a.download='vvkbd-productivity-backup-'+dateKey(new Date())+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function importBackup(file){const r=new FileReader();r.onload=()=>{try{const p=JSON.parse(r.result);const data=p&&p.data?p.data:p;if(!data||!Array.isArray(data.tasks))throw Error('Invalid backup');localStorage.setItem(KEY,JSON.stringify(data));materialise();location.reload()}catch(e){alert('Backup could not be imported. Please choose a valid VVKBD JSON backup.')}};r.readAsText(file)}
function installTools(){const more=document.getElementById('more');if(!more||document.getElementById('vvkbdMaintenanceTools'))return;const card=document.createElement('div');card.id='vvkbdMaintenanceTools';card.className='card';card.innerHTML='<h2>Data & reminders</h2><p class="muted">Back up your local data and enable phone reminders.</p><div class="row"><button class="light" id="vvkbdExport">Export backup</button><button class="light" id="vvkbdImport">Import backup</button></div><input id="vvkbdBackupFile" type="file" accept="application/json" style="display:none"><button class="primary" id="vvkbdNotify" style="margin-top:8px;width:100%">Enable phone reminders</button><div id="vvkbdNotifyStatus" class="muted" style="margin-top:7px"></div>';
 more.appendChild(card);
 document.getElementById('vvkbdExport').onclick=exportBackup;
 document.getElementById('vvkbdImport').onclick=()=>document.getElementById('vvkbdBackupFile').click();
 document.getElementById('vvkbdBackupFile').onchange=e=>{if(e.target.files[0])importBackup(e.target.files[0])};
 const status=document.getElementById('vvkbdNotifyStatus');
 const update=()=>{status.textContent=('Notification' in window)?(Notification.permission==='granted'?'Phone reminders enabled.':'Tap to enable phone reminders.'):'This browser does not support notifications.'};update();
 document.getElementById('vvkbdNotify').onclick=async()=>{if(!('Notification' in window)){update();return}try{const p=await Notification.requestPermission();update();if(p==='granted')scheduleNotifications()}catch(e){status.textContent='Notification permission could not be enabled.'}};
}

/* Best-effort local notifications while the app/PWA is running. */
function scheduleNotifications(){if(!('Notification' in window)||Notification.permission!=='granted')return;const d=load(),now=Date.now(),seenKey='vvkbd_notified_reminders_'+dateKey(new Date()),seen=new Set(JSON.parse(localStorage.getItem(seenKey)||'[]'));d.tasks.forEach(t=>{const mins=Number(t.reminder);if(!Number.isFinite(mins)||mins<0)return;const start=localParse(t.start);if(isNaN(start))return;const at=start.getTime()-mins*60000;if(at<=now&&at>now-65000&&!seen.has(String(t.id))){try{new Notification('VVKBD reminder',{body:`${t.title||'Task'} starts at ${start.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`,tag:String(t.id)})}catch(e){}seen.add(String(t.id))}});localStorage.setItem(seenKey,JSON.stringify([...seen]))}

window.vvkbdRecurring={materialise,exportBackup,importBackup};
try{materialise();setTimeout(installTools,500);scheduleNotifications()}catch(e){console.warn('VVKBD recurrence error',e)}
setInterval(()=>{try{materialise();scheduleNotifications()}catch(e){}},60000);
window.addEventListener('load',()=>{installTools();scheduleNotifications()});
})();