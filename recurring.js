/* VVKBD Productivity recurring schedule engine - data only */
(function(){
'use strict';
const KEY='vvkbd_v2',PRAYER_CUTOFF='2026-08-31',PRAYER_WEEKLY_START='2026-09-02',pad=n=>String(n).padStart(2,'0');
const dateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
function load(){try{const d=JSON.parse(localStorage.getItem(KEY)||'{}');d.tasks=Array.isArray(d.tasks)?d.tasks:[];return d}catch(e){return{tasks:[]}}}
function save(d){localStorage.setItem(KEY,JSON.stringify(d))}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function previousWeekday(){let d=new Date();while(d.getDay()===0||d.getDay()===6)d.setDate(d.getDate()-1);return d}
function hm(v){const m=String(v||'').match(/T(\d{2}):(\d{2})/);return m?{h:+m[1],m:+m[2]}:{h:9,m:0}}
function makeDT(day,h,m){return `${dateKey(day)}T${pad(h)}:${pad(m)}`}
function isPrayer(t){return String(t.title||'').trim().toLowerCase()==='prayer'}
function materialisePrayer(d,master){
 const sh={h:19,m:0},eh={h:20,m:0};
 d.tasks=d.tasks.filter(t=>!(t.masterId===master.id&&isPrayer(t)&&dateKey(new Date(t.start))>PRAYER_CUTOFF));
 let changed=false;
 for(let day=new Date();dateKey(day)<=PRAYER_CUTOFF;day=addDays(day,1)){
   const k=dateKey(day),id=master.id+'::daily::'+k;
   if(k===dateKey(new Date(master.start))||d.tasks.some(t=>t.id===id))continue;
   d.tasks.push({id,masterId:master.id,title:'Prayer',start:makeDT(day,sh.h,sh.m),end:makeDT(day,eh.h,eh.m),reminder:master.reminder||'30',priority:master.priority||'Medium',repeat:'None',notes:'Prayer — daily through 31 August 2026',done:false,generated:true});changed=true;
 }
 for(let day=new Date(PRAYER_WEEKLY_START+'T12:00');day<addDays(new Date(),90);day=addDays(day,7)){
   const k=dateKey(day),id=master.id+'::weekly::'+k;
   if(d.tasks.some(t=>t.id===id))continue;
   d.tasks.push({id,masterId:master.id,title:'Prayer',start:makeDT(day,19,0),end:makeDT(day,20,0),reminder:master.reminder||'30',priority:master.priority||'Medium',repeat:'None',notes:'Prayer — Wednesdays at 19:00',done:false,generated:true});changed=true;
 }
 master.notes='Prayer: daily through 31 August 2026; Wednesdays at 19:00 from 2 September 2026.';
 return changed;
}
function installEditableTarget(){
 const salesInput=document.getElementById('salesTarget');
 if(!salesInput)return;
 salesInput.readOnly=false;
 salesInput.disabled=false;
 salesInput.removeAttribute('readonly');
 salesInput.style.pointerEvents='auto';
 salesInput.style.userSelect='text';
 if(!document.getElementById('editableTargetHint')){
   const hint=document.createElement('div');
   hint.id='editableTargetHint';
   hint.className='muted';
   hint.style.margin='-3px 0 10px';
   hint.textContent='Editable: enter your daily target in rand, then tap Save sales numbers.';
   salesInput.insertAdjacentElement('afterend',hint);
 }
}
function protectEditableSalesInput(){
 if(typeof window.render!=='function'||window.__vvkbdRenderFixed)return;
 const originalRender=window.render;
 window.render=function(){
   const input=document.getElementById('salesTarget');
   const focused=input&&document.activeElement===input;
   const typed=focused?input.value:null;
   originalRender();
   if(focused&&input){input.value=typed;input.focus();}
   installEditableTarget();
 };
 window.__vvkbdRenderFixed=true;
}
function materialise(){
 const d=load();let changed=false,anchor=previousWeekday(),anchorKey=dateKey(anchor);
 d.sales=d.sales||{leads:0,calls:0,quotes:0,sold:0,target:2500};
 if(!d.sales.target||+d.sales.target===5000){d.sales.target=2500;changed=true}
 const prayerMasters=d.tasks.filter(t=>isPrayer(t)&&!t.masterId);
 for(const master of prayerMasters){if(materialisePrayer(d,master))changed=true}
 let sales=d.tasks.find(t=>String(t.title||'').trim().toLowerCase()==='sales'&&!t.masterId);
 if(!sales){sales={id:'sales-weekdays',title:'Sales',repeat:'Weekdays (Mon–Fri)',priority:'High',reminder:'none',notes:'VVKBD sales activity — Monday to Friday',done:false};d.tasks.push(sales);changed=true}
 sales.repeat='Weekdays (Mon–Fri)';sales.start=anchorKey+'T09:00';sales.end=anchorKey+'T17:00';
 let gym=d.tasks.find(t=>String(t.title||'').trim().toLowerCase()==='gym'&&!t.masterId);
 if(!gym){gym={id:'gym-weekdays',title:'Gym',repeat:'Weekdays (Mon–Fri)',priority:'Medium',reminder:'15',notes:'Gym — Monday to Friday',done:false};d.tasks.push(gym);changed=true}
 gym.repeat='Weekdays (Mon–Fri)';gym.start=anchorKey+'T06:00';gym.end=anchorKey+'T07:00';gym.reminder='15';
 const masters=d.tasks.filter(t=>t.repeat&&t.repeat!=='None'&&!t.masterId&&!isPrayer(t));
 for(const master of masters){
   const sh=hm(master.start),eh=hm(master.end),first=dateKey(new Date(master.start));
   for(let i=0;i<90;i++){
     const day=addDays(new Date(),i),k=dateKey(day);
     if(master.repeat==='Weekdays (Mon–Fri)'&&(day.getDay()===0||day.getDay()===6))continue;
     if(master.repeat==='Weekly'&&day.getDay()!==new Date(master.start).getDay())continue;
     if(master.repeat==='Monthly'&&day.getDate()!==new Date(master.start).getDate())continue;
     const id=master.id+'::'+k;if(k===first||d.tasks.some(t=>t.id===id))continue;
     d.tasks.push({id,masterId:master.id,title:master.title,start:makeDT(day,sh.h,sh.m),end:makeDT(day,eh.h,eh.m),reminder:master.reminder||'none',priority:master.priority||'Medium',repeat:'None',notes:master.notes||'',done:false,generated:true});changed=true;
   }
 }
 if(changed)save(d);
 setTimeout(function(){installEditableTarget();protectEditableSalesInput()},100);
}
materialise();
setInterval(materialise,60000);
setTimeout(function(){installEditableTarget();protectEditableSalesInput()},300);
})();