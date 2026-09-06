/* VVKBD Productivity recurring schedule engine - patched */
(function(){'use strict';
const KEY='vvkbd_v2',DELETED='vvkbd_deleted_events',DEFAULTS='vvkbd_defaults_installed_v2',pad=n=>String(n).padStart(2,'0');
const dateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const load=()=>{try{const d=JSON.parse(localStorage.getItem(KEY)||'{}');d.tasks=Array.isArray(d.tasks)?d.tasks:[];return d}catch(e){return{tasks:[]}}};
const save=d=>localStorage.setItem(KEY,JSON.stringify(d));
const deleted=()=>{try{return new Set(JSON.parse(localStorage.getItem(DELETED)||'[]'))}catch(e){return new Set()}};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const hm=v=>{const m=String(v||'').match(/T(\d{2}):(\d{2})/);return m?{h:+m[1],m:+m[2]}:{h:9,m:0}};
const makeDT=(d,h,m)=>`${dateKey(d)}T${pad(h)}:${pad(m)}`;
function duration(task){const s=new Date(task.start),e=new Date(task.end);return (!isNaN(s)&&!isNaN(e)&&e>s)?e-s:0}
function isPrayer(t){return String(t.title||'').trim().toLowerCase()==='prayer'}
function materialise(){
 const d=load(),del=deleted();d.tasks=d.tasks.filter(t=>!del.has(String(t.id)));d.sales=d.sales||{};
 if(!Number.isFinite(Number(d.sales.target))||Number(d.sales.target)<=0)d.sales.target=2500;
 // Defaults are installed once only. User edits/deletions are never overwritten.
 if(!localStorage.getItem(DEFAULTS)){
   const today=new Date(),k=dateKey(today),titles=d.tasks.map(t=>String(t.title||'').toLowerCase());
   if(!titles.includes('gym'))d.tasks.push({id:'recurring-gym-master',title:'Gym',start:k+'T06:00',end:k+'T07:00',repeat:'Weekdays (Mon–Fri)',reminder:'15',priority:'Medium',notes:'',done:false,recurringMaster:true});
   if(!titles.includes('sales'))d.tasks.push({id:'recurring-sales-master',title:'Sales',start:k+'T09:00',end:k+'T17:00',repeat:'Weekdays (Mon–Fri)',reminder:'none',priority:'Medium',notes:'',done:false,recurringMaster:true});
   localStorage.setItem(DEFAULTS,'1');
 }
 const masters=d.tasks.filter(t=>t&&t.repeat&&t.repeat!=='None'&&!t.masterId&&!t.generated&&!isPrayer(t));
 masters.forEach(master=>{
   const base=new Date(master.start),dur=duration(master);if(isNaN(base)||!dur)return;
   const sh=hm(master.start),eh=hm(master.end),repeat=String(master.repeat),startDay=new Date(base.getFullYear(),base.getMonth(),base.getDate());
   for(let i=0;i<90;i++){
     const day=addDays(new Date(),i);if(day<startDay)continue;
     if(repeat==='Weekdays (Mon–Fri)'&&(day.getDay()===0||day.getDay()===6))continue;
     if(repeat==='Weekly'&&day.getDay()!==base.getDay())continue;
     if(repeat==='Monthly'&&day.getDate()!==base.getDate())continue;
     const os=new Date(day.getFullYear(),day.getMonth(),day.getDate(),sh.h,sh.m,base.getSeconds(),base.getMilliseconds()),oe=new Date(os.getTime()+dur),id=master.id+'::'+dateKey(os);
     if(del.has(id)||d.tasks.some(t=>t.id===id))continue;
     d.tasks.push({id,masterId:master.id,title:master.title,start:makeDT(os,os.getHours(),os.getMinutes()),end:makeDT(oe,oe.getHours(),oe.getMinutes()),reminder:master.reminder||'none',priority:master.priority||'Medium',repeat:'None',notes:master.notes||'',done:false,generated:true});
   }
 });
 save(d);
 if(typeof window.installEditableTarget==='function')window.installEditableTarget();
}
window.vvkbdRecurring={materialise};
try{materialise()}catch(e){console.warn('VVKBD recurrence error',e)}
setInterval(()=>{try{materialise()}catch(e){}},60000);
})();