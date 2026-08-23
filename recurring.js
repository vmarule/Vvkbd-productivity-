/* VVKBD Productivity recurring schedule engine - data only */
(function(){
'use strict';
const KEY='vvkbd_v2',pad=n=>String(n).padStart(2,'0');
const dateKey=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
function load(){try{const d=JSON.parse(localStorage.getItem(KEY)||'{}');d.tasks=Array.isArray(d.tasks)?d.tasks:[];return d}catch(e){return{tasks:[]}}}
function save(d){localStorage.setItem(KEY,JSON.stringify(d))}
function addDays(d,n){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function previousWeekday(){let d=new Date();while(d.getDay()===0||d.getDay()===6)d.setDate(d.getDate()-1);return d}
function hm(v){const m=String(v||'').match(/T(\d{2}):(\d{2})/);return m?{h:+m[1],m:+m[2]}:{h:9,m:0}}
function makeDT(day,h,m){return `${dateKey(day)}T${pad(h)}:${pad(m)}`}
function materialise(){
 const d=load();let changed=false,anchor=previousWeekday(),anchorKey=dateKey(anchor);
 let sales=d.tasks.find(t=>String(t.title||'').trim().toLowerCase()==='sales'&&!t.masterId);
 if(!sales){sales={id:'sales-weekdays',title:'Sales',repeat:'Weekdays (Mon–Fri)',priority:'High',reminder:'none',notes:'VVKBD sales activity — Monday to Friday',done:false};d.tasks.push(sales);changed=true}
 sales.repeat='Weekdays (Mon–Fri)';sales.start=anchorKey+'T09:00';sales.end=anchorKey+'T17:00';
 let gym=d.tasks.find(t=>String(t.title||'').trim().toLowerCase()==='gym'&&!t.masterId);
 if(!gym){gym={id:'gym-weekdays',title:'Gym',repeat:'Weekdays (Mon–Fri)',priority:'Medium',reminder:'15',notes:'Gym — Monday to Friday',done:false};d.tasks.push(gym);changed=true}
 gym.repeat='Weekdays (Mon–Fri)';gym.start=anchorKey+'T06:00';gym.end=anchorKey+'T07:00';gym.reminder='15';
 const masters=d.tasks.filter(t=>t.repeat&&t.repeat!=='None'&&!t.masterId);
 for(const master of masters){const sh=hm(master.start),eh=hm(master.end),first=dateKey(new Date(master.start));for(let i=0;i<90;i++){const day=addDays(new Date(),i);if(master.repeat==='Weekdays (Mon–Fri)'&&(day.getDay()===0||day.getDay()===6))continue;if(master.repeat==='Weekly'&&day.getDay()!==new Date(master.start).getDay())continue;if(master.repeat==='Monthly'&&day.getDate()!==new Date(master.start).getDate())continue;const k=dateKey(day),id=master.id+'::'+k;if(k===first||d.tasks.some(t=>t.id===id))continue;d.tasks.push({id,masterId:master.id,title:master.title,start:makeDT(day,sh.h,sh.m),end:makeDT(day,eh.h,eh.m),reminder:master.reminder||'none',priority:master.priority||'Medium',repeat:'None',notes:master.notes||'',done:false,generated:true});changed=true}}
 if(changed)save(d);
}
materialise();setInterval(materialise,60000);
})();