(()=>{
'use strict';
const $=id=>document.getElementById(id);
const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rad=d=>d*Math.PI/180, deg=r=>r*180/Math.PI;
const fmt=(v,d=1)=>Number.isFinite(v)?v.toFixed(d).replace('.',','):'—';
const faceNames={front:'Principal',right:'Derecha',back:'Posterior',left:'Izquierda',roof:'Cubierta'};
let playTimer=null,lastSunTimes={rise:null,noon:null,set:null};
const COMMUNES=Array.isArray(window.HIDROLAB_COMMUNES)?window.HIDROLAB_COMMUNES:[];

function dayOfYear(date){const start=new Date(date.getFullYear(),0,0);return Math.floor((date-start)/86400000)}
function solarPosition(date,lat,lon,tz){
  const n=dayOfYear(date),hour=date.getHours()+date.getMinutes()/60+date.getSeconds()/3600;
  const gamma=2*Math.PI/365*(n-1+(hour-12)/24);
  const eq=229.18*(0.000075+0.001868*Math.cos(gamma)-0.032077*Math.sin(gamma)-0.014615*Math.cos(2*gamma)-0.040849*Math.sin(2*gamma));
  const dec=0.006918-0.399912*Math.cos(gamma)+0.070257*Math.sin(gamma)-0.006758*Math.cos(2*gamma)+0.000907*Math.sin(2*gamma)-0.002697*Math.cos(3*gamma)+0.00148*Math.sin(3*gamma);
  let tst=hour*60+eq+4*lon-60*tz;tst=((tst%1440)+1440)%1440;
  const ha=tst/4-180,phi=rad(lat),har=rad(ha);
  const cosz=clamp(Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(har),-1,1);
  const zen=Math.acos(cosz),alt=90-deg(zen);
  let az=deg(Math.atan2(Math.sin(har),Math.cos(har)*Math.sin(phi)-Math.tan(dec)*Math.cos(phi)))+180;az=(az+360)%360;
  return {az,alt,decl:deg(dec),eqtime:eq,ha};
}
function hhmm(mins){mins=((Math.round(mins)%1440)+1440)%1440;return String(Math.floor(mins/60)).padStart(2,'0')+':'+String(mins%60).padStart(2,'0')}
function localDate(){const d=$('date').value?new Date($('date').value+'T00:00:00'):new Date();const mins=+$('time-range').value;d.setHours(Math.floor(mins/60),mins%60,0,0);return d}
function dirName(az){const n=['Norte','NE','Oriente','SE','Sur','SO','Poniente','NO'];return n[Math.round(((az%360)+360)%360/45)%8]}
function faceAzimuths(a){return {front:(a+360)%360,right:(a+90)%360,back:(a+180)%360,left:(a+270)%360}}
function angleDiff(a,b){return ((a-b+540)%360)-180}
function faceIncidence(sun,az){if(sun.alt<=0)return 0;return Math.max(0,Math.cos(rad(sun.alt))*Math.cos(rad(angleDiff(sun.az,az))))}
function sunTimes(date,lat,lon,tz){let rise=null,set=null,best=null,bestAlt=-999;for(let m=0;m<1440;m+=2){const d=new Date(date);d.setHours(Math.floor(m/60),m%60,0,0);const s=solarPosition(d,lat,lon,tz);if(s.alt>0&&rise===null)rise=m;if(s.alt>0)set=m;if(s.alt>bestAlt){bestAlt=s.alt;best=m}}return {rise,set,noon:best}}
function rotate2(x,y,az){const a=rad(az);return [x*Math.cos(a)+y*Math.sin(a),-x*Math.sin(a)+y*Math.cos(a)]}
function modelGeometry(){
 const W=Math.max(.5,+$('width').value||8),L=Math.max(.5,+$('length').value||12),H=Math.max(.5,+$('height').value||5.5),az=+$('building-az').value;
 const local=[[-W/2,-L/2],[W/2,-L/2],[W/2,L/2],[-W/2,L/2]],base=local.map(([x,y])=>rotate2(x,y,az));
 return {W,L,H,az,bottom:base.map(([x,y])=>({x,y,z:0})),top:base.map(([x,y])=>({x,y,z:H}))};
}
function projectFactory(g,shadowPts=[]){
 const all=[...g.bottom,...g.top,...shadowPts];let maxR=1;all.forEach(p=>maxR=Math.max(maxR,Math.abs(p.x),Math.abs(p.y),Math.abs(p.z)*.7));
 const scale=clamp(260/(maxR*2.3),10,27),cx=360,cy=390;
 return p=>[cx+(p.x-p.y)*scale,cy+(p.x+p.y)*scale*.43-p.z*scale*1.48];
}
function svgPoint(P,p){const q=P(p);return q[0].toFixed(1)+','+q[1].toFixed(1)}
function initCommunes(){
 const regions=[...new Set(COMMUNES.map(c=>c.region))].sort((a,b)=>a.localeCompare(b,'es'));$('region-select').innerHTML=regions.map(r=>`<option>${r}</option>`).join('');
 const preferred=COMMUNES.find(c=>c.comuna.toLowerCase()==='peñaflor');if(preferred){$('region-select').value=preferred.region;populateCommuneSelect(preferred.comuna)}else populateCommuneSelect();
}
function populateCommuneSelect(preferred){
 const region=$('region-select').value,list=COMMUNES.filter(c=>c.region===region).sort((a,b)=>a.comuna.localeCompare(b.comuna,'es'));$('commune-select').innerHTML=list.map(c=>`<option value="${c.cut}">${c.comuna}</option>`).join('');if(preferred){const p=list.find(c=>c.comuna===preferred);if(p)$('commune-select').value=p.cut}applyCommune();
}
function applyCommune(){const c=COMMUNES.find(x=>x.cut===$('commune-select').value);if(!c)return;$('lat').value=c.lat.toFixed(4);$('lon').value=c.lon.toFixed(4);$('geo-status').textContent=`${c.comuna} · ${c.provincia} · ${c.region} · coordenada representativa ${c.lat.toFixed(4)}°, ${c.lon.toFixed(4)}°`;update()}

function renderStage(sun){
 const g=modelGeometry(),altForShadow=Math.max(.35,sun.alt),sAlt=rad(altForShadow),sAz=rad(sun.az);
 const sx=Math.sin(sAz)*Math.cos(sAlt),sy=Math.cos(sAz)*Math.cos(sAlt),sz=Math.sin(sAlt);
 const shadow=sun.alt>0?g.top.map(p=>({x:p.x-sx/sz*p.z,y:p.y-sy/sz*p.z,z:0})):g.bottom.map(p=>({...p}));
 const P=projectFactory(g,shadow),faceAz=faceAzimuths(g.az);
 const inc={front:faceIncidence(sun,faceAz.front),right:faceIncidence(sun,faceAz.right),back:faceIncidence(sun,faceAz.back),left:faceIncidence(sun,faceAz.left),roof:sun.alt>0?Math.sin(rad(sun.alt)):0};
 const faces=[['front',[g.bottom[0],g.bottom[1],g.top[1],g.top[0]],inc.front],['right',[g.bottom[1],g.bottom[2],g.top[2],g.top[1]],inc.right],['back',[g.bottom[2],g.bottom[3],g.top[3],g.top[2]],inc.back],['left',[g.bottom[3],g.bottom[0],g.top[0],g.top[3]],inc.left]];
 faces.sort((a,b)=>a[1].reduce((s,p)=>s+p.x+p.y,0)-b[1].reduce((s,p)=>s+p.x+p.y,0));
 const grid=[];for(let i=-22;i<=22;i+=2){let a=P({x:i,y:-22,z:0}),b=P({x:i,y:22,z:0});grid.push(`<line class="ground-grid" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`);a=P({x:-22,y:i,z:0});b=P({x:22,y:i,z:0});grid.push(`<line class="ground-grid" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`)}
 const compass={N:{x:0,y:15,z:0},E:{x:15,y:0,z:0},S:{x:0,y:-15,z:0},O:{x:-15,y:0,z:0}};
 const sunRadius=14+Math.max(0,sun.alt)*.08,dist=16,sp3={x:dist*Math.sin(sAz)*Math.cos(rad(Math.max(0,sun.alt))),y:dist*Math.cos(sAz)*Math.cos(rad(Math.max(0,sun.alt))),z:9+dist*Math.sin(rad(Math.max(0,sun.alt)))};const sp=P(sp3),center=P({x:0,y:0,z:g.H*.55});
 const faceSvg=faces.map(([name,pts,v])=>{const lit=sun.alt>0&&v>.001,fill=lit?`hsl(43 83% ${68-Math.min(24,v*20)}%)`:'#a9bdc6';const mid=pts.reduce((a,p)=>({x:a.x+p.x/4,y:a.y+p.y/4,z:a.z+p.z/4}),{x:0,y:0,z:0}),m=P(mid);return `<polygon points="${pts.map(p=>svgPoint(P,p)).join(' ')}" fill="${fill}" class="building-edge"/><rect x="${m[0]-46}" y="${m[1]-13}" width="92" height="26" rx="13" fill="${lit?'rgba(255,246,201,.93)':'rgba(239,246,248,.94)'}" stroke="rgba(50,75,85,.18)"/><text x="${m[0]}" y="${m[1]-1}" class="face-label" text-anchor="middle">${faceNames[name]}</text><text x="${m[0]}" y="${m[1]+10}" class="face-status-label" text-anchor="middle" fill="${lit?'#7a5700':'#4b6570'}">${lit?'SOL DIRECTO':'SOMBRA'}</text>`}).join('');
 const roofFill=sun.alt>0?'#efc85d':'#b6c6cc';
 let rays='';if(sun.alt>0){const roofCenter=P({x:0,y:0,z:g.H});rays=`<line class="sun-ray" x1="${sp[0]}" y1="${sp[1]}" x2="${center[0]}" y2="${center[1]}"/><line class="sun-ray-soft" x1="${sp[0]}" y1="${sp[1]}" x2="${roofCenter[0]}" y2="${roofCenter[1]}"/>`;g.top.forEach(p=>{const q=P(p);rays+=`<line class="sun-ray-soft" x1="${sp[0]}" y1="${sp[1]}" x2="${q[0]}" y2="${q[1]}"/>`})}
 let shLines='';if(sun.alt>0){g.top.forEach((p,i)=>{const a=P(p),b=P(shadow[i]);shLines+=`<line class="shadow-line" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`})}
 const shadowPoly=sun.alt>0?`<polygon class="shadow-shape" points="${shadow.map(p=>svgPoint(P,p)).join(' ')}"/>`:'';
 const compassSvg=Object.entries(compass).map(([k,p])=>{const q=P(p);return `<circle cx="${q[0]}" cy="${q[1]}" r="11" fill="#fff" stroke="#9fb4bc"/><text x="${q[0]}" y="${q[1]+4}" text-anchor="middle" class="compass-label">${k}</text>`}).join('');
 $('solar-stage').innerHTML=`<svg viewBox="0 0 720 560"><defs><filter id="sunGlow"><feGaussianBlur stdDeviation="7"/></filter></defs><rect width="720" height="560" fill="#f8fbfc"/>${grid.join('')}${shadowPoly}${shLines}${faceSvg}<polygon points="${g.top.map(p=>svgPoint(P,p)).join(' ')}" fill="${roofFill}" class="building-edge"/>${rays}${sun.alt>0?`<circle cx="${sp[0]}" cy="${sp[1]}" r="${sunRadius+10}" fill="rgba(246,190,44,.18)" filter="url(#sunGlow)"/><circle cx="${sp[0]}" cy="${sp[1]}" r="${sunRadius}" fill="#ffc928" stroke="#a97700" stroke-width="2.5"/><text x="${sp[0]}" y="${sp[1]+4}" text-anchor="middle" class="sun-label">SOL</text>`:''}${compassSvg}</svg>`;
 const shLen=sun.alt>0?g.H/Math.tan(rad(sun.alt)):NaN,shDir=(sun.az+180)%360;
 $('shadow-length').textContent=sun.alt>0?fmt(shLen,1)+' m':'—';$('shadow-direction').textContent=sun.alt>0?`${Math.round(shDir)}° · ${dirName(shDir)}`:'—';
 return {inc,faceAz};
}
function renderFacades(sun,data){
 const grid=$('facade-grid');grid.innerHTML='';Object.keys(faceNames).forEach(k=>{const v=data.inc[k],az=k==='roof'?null:data.faceAz[k],lit=sun.alt>0&&v>.001,c=document.createElement('div');c.className='facade-card '+(lit?'is-lit':'is-shaded');const orient=k==='roof'?'Plano horizontal':`${Math.round(az)}° · ${dirName(az)}`;c.innerHTML=`<strong>${faceNames[k]}</strong><span>${orient}</span><div class="facade-meter"><span style="width:${Math.round(v*100)}%"></span></div><small>${sun.alt<=0?'Noche':lit?`${Math.round(v*100)}% · sol directo`:'Sombra propia'}</small>`;grid.append(c)})
}
function polarPoint(az,alt,cx=260,cy=260,R=205){const rr=R*(1-clamp(alt,0,90)/90),a=rad(az);return [cx+rr*Math.sin(a),cy-rr*Math.cos(a)]}
function renderSunPath(date,lat,lon,tz,current){
 const pts=[],hours=[];for(let m=240;m<=1320;m+=10){const d=new Date(date);d.setHours(Math.floor(m/60),m%60,0,0);const s=solarPosition(d,lat,lon,tz);if(s.alt>=0){pts.push(polarPoint(s.az,s.alt));if(m%60===0)hours.push({m,s,p:polarPoint(s.az,s.alt)})}}
 const cur=polarPoint(current.az,Math.max(0,current.alt)),cx=260,cy=260,R=205;let grid='';[0,30,60,90].forEach(alt=>{const r=R*(1-alt/90);grid+=`<circle cx="${cx}" cy="${cy}" r="${r}" class="polar-grid"/><text x="${cx+5}" y="${cy-r+13}" class="alt-label">${alt}°</text>`});[0,45,90,135,180,225,270,315].forEach(az=>{const p=polarPoint(az,0);grid+=`<line x1="${cx}" y1="${cy}" x2="${p[0]}" y2="${p[1]}" class="polar-axis"/>`});
 const labels=[['N',0],['NE',45],['E',90],['SE',135],['S',180],['SO',225],['O',270],['NO',315]].map(([t,a])=>{const p=polarPoint(a,-8);return `<text x="${p[0]}" y="${p[1]+4}" class="compass-label" text-anchor="middle">${t}</text>`}).join('');
 const path=pts.length?`<polyline points="${pts.map(p=>p.join(',')).join(' ')}" class="sunpath-line"/>`:'';
 const dots=hours.map(h=>`<circle cx="${h.p[0]}" cy="${h.p[1]}" r="4" class="sunpath-hour"/><text x="${h.p[0]+6}" y="${h.p[1]-5}" class="alt-label">${hhmm(h.m)}</text>`).join('');
 $('sun-path').innerHTML=`<svg viewBox="0 0 520 520"><rect width="520" height="520" fill="#fbfcfc"/>${grid}${labels}${path}${dots}${current.alt>0?`<line x1="${cx}" y1="${cy}" x2="${cur[0]}" y2="${cur[1]}" class="sunpath-ray"/><circle cx="${cur[0]}" cy="${cur[1]}" r="10" class="sunpath-current"/><text x="${cur[0]+13}" y="${cur[1]-10}" class="face-label">Ahora · ${Math.round(current.az)}° / ${fmt(current.alt,1)}°</text>`:''}</svg>`
}
function renderTimeline(date,lat,lon,tz,buildAz){
 const out=$('daily-timeline');out.innerHTML='';const faz=faceAzimuths(buildAz);Object.keys(faceNames).forEach(k=>{const row=document.createElement('div');row.className='timeline-row';const lab=document.createElement('strong');lab.textContent=faceNames[k];const tr=document.createElement('div');tr.className='timeline-track';for(let m=240;m<=1320;m+=30){const d=new Date(date);d.setHours(Math.floor(m/60),m%60,0,0);const s=solarPosition(d,lat,lon,tz),v=k==='roof'?(s.alt>0?Math.sin(rad(s.alt)):0):faceIncidence(s,faz[k]);const cell=document.createElement('div');cell.className='timeline-cell';cell.style.setProperty('--i',(0.05+v*.92).toFixed(2));cell.title=`${hhmm(m)} · ${s.alt>0?Math.round(v*100)+'%':'noche'}`;tr.append(cell)}row.append(lab,tr);out.append(row)});const axis=document.createElement('div');axis.className='timeline-axis';axis.innerHTML='<span>04:00</span><span>08:30</span><span>13:00</span><span>17:30</span><span>22:00</span>';out.append(axis)
}
function renderEave(sun,faceAz){
 const key=$('eave-face').value,az=faceAz[key],delta=Math.abs(angleDiff(sun.az,az)),wh=+$('window-h').value,depth=+$('eave-depth').value,gap=+$('eave-gap').value;$('window-h-label').textContent=fmt(wh,2);$('eave-depth-label').textContent=fmt(depth,2);$('eave-gap-label').textContent=fmt(gap,2);$('eave-face-name').textContent=faceNames[key];
 const sunlit=sun.alt>0&&delta<90;let profile=NaN,drop=0,shade=0;if(sunlit){profile=deg(Math.atan(Math.tan(rad(sun.alt))/Math.max(.001,Math.cos(rad(delta)))));drop=depth*Math.tan(rad(profile));shade=clamp((drop-gap)/wh,0,1)}$('profile-angle').textContent=sunlit?fmt(profile,1)+'°':'—';$('shadow-drop').textContent=sunlit?fmt(drop,2)+' m':'—';$('shade-pct').textContent=sunlit?Math.round(shade*100)+'%':'—';
 const scale=115,wallX=190,baseY=335,topY=baseY-wh*scale,eaveY=topY-gap*scale,eaveX2=wallX+depth*scale,shY=sunlit?Math.min(baseY,eaveY+drop*scale):eaveY,rayStartX=470,rayStartY=sunlit?Math.max(40,eaveY-(rayStartX-eaveX2)*Math.tan(rad(profile))):65;
 $('eave-visual').innerHTML=`<svg viewBox="0 0 620 390"><rect width="620" height="390" fill="#fbfcfc"/><rect x="${wallX-6}" y="45" width="12" height="305" fill="#647b85"/><rect x="${wallX-6}" y="${topY}" width="12" height="${wh*scale}" fill="#72c2df"/><line x1="${wallX}" y1="${eaveY}" x2="${eaveX2}" y2="${eaveY}" stroke="#344b55" stroke-width="12"/><rect x="${wallX-6}" y="${Math.max(topY,shY)}" width="12" height="${Math.max(0,baseY-Math.max(topY,shY))}" fill="#27343b" opacity=".68"/>${sunlit?`<line x1="${rayStartX}" y1="${rayStartY}" x2="${eaveX2}" y2="${eaveY}" stroke="#dfa200" stroke-width="2.4" stroke-dasharray="7 5"/><line x1="${eaveX2}" y1="${eaveY}" x2="${wallX}" y2="${shY}" stroke="#dfa200" stroke-width="2.4" stroke-dasharray="7 5"/><circle cx="${rayStartX}" cy="${rayStartY}" r="18" fill="#ffc928" stroke="#a97700" stroke-width="2"/>`:''}<text x="${wallX-18}" y="${topY+wh*scale/2}" text-anchor="end" class="face-label">Ventana ${fmt(wh,2)} m</text><text x="${(wallX+eaveX2)/2}" y="${eaveY-12}" text-anchor="middle" class="face-label">Alero ${fmt(depth,2)} m</text><text x="410" y="350" class="face-label">${sunlit?`Sombreado estimado: ${Math.round(shade*100)}%`:'Fachada sin sol directo'}</text></svg>`;
 $('eave-message').textContent=!sunlit?'En este instante el sol está detrás de esta fachada; el alero no controla radiación directa sobre la ventana.':shade>=.95?'El alero cubre prácticamente toda la altura de la ventana en este instante.':shade>.5?'El alero sombrea más de la mitad de la ventana en este instante.':shade>0?'El alero genera sombreado parcial sobre la ventana.':'La sombra del alero todavía no alcanza la ventana con esta geometría y posición solar.'
}
function update(){
 const mins=+$('time-range').value;$('time-label').textContent=hhmm(mins);const buildAz=+$('building-az').value;$('building-az-label').textContent=`${buildAz}° · ${dirName(buildAz)}`;const lat=+$('lat').value,lon=+$('lon').value,tz=+$('tz').value,date=localDate(),sun=solarPosition(date,lat,lon,tz);$('sun-az').textContent=fmt(sun.az,1)+'°';$('sun-alt').textContent=fmt(sun.alt,1)+'°';
 lastSunTimes=sunTimes(date,lat,lon,tz);$('sunrise').textContent=lastSunTimes.rise===null?'Sin salida':hhmm(lastSunTimes.rise);$('solar-noon').textContent=lastSunTimes.noon===null?'—':hhmm(lastSunTimes.noon);$('sunset').textContent=lastSunTimes.set===null?'Sin puesta':hhmm(lastSunTimes.set);const stat=$('sun-status');stat.textContent=sun.alt>0?`☀ ${fmt(sun.alt,1)}° · ${Math.round(sun.az)}° ${dirName(sun.az)}`:'Noche · sol bajo horizonte';stat.className='sun-status '+(sun.alt>0?'day':'night');const data=renderStage(sun);renderFacades(sun,data);renderSunPath(date,lat,lon,tz,sun);renderTimeline(date,lat,lon,tz,buildAz);renderEave(sun,data.faceAz)
}
function setPreset(type){const now=new Date();let y=now.getFullYear(),m=now.getMonth()+1,d=now.getDate();if(type==='winter'){m=6;d=21}else if(type==='equinox'){m=9;d=21}else if(type==='summer'){m=12;d=21}$('date').value=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;update()}
function togglePlay(){if(playTimer){clearInterval(playTimer);playTimer=null;$('play').textContent='▶ Recorrer el día';return}$('play').textContent='❚❚ Pausar';playTimer=setInterval(()=>{let v=+$('time-range').value+10;if(v>1320)v=240;$('time-range').value=v;update()},170)}
function jumpTo(kind){const v=lastSunTimes[kind];if(v!==null){$('time-range').value=clamp(v,240,1320);update()}}
function init(){
 initCommunes();const now=new Date();$('date').value=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;$('time-range').value=Math.round(clamp(now.getHours()*60+now.getMinutes(),240,1320)/5)*5;
 $('region-select').addEventListener('change',()=>populateCommuneSelect());$('commune-select').addEventListener('change',applyCommune);
 ['lat','lon','date','tz','time-range','width','length','height','building-az','window-h','eave-depth','eave-gap','eave-face'].forEach(id=>$(id).addEventListener('input',update));
 $('play').addEventListener('click',togglePlay);$('noon').addEventListener('click',()=>{$('time-range').value=720;update()});$('sunrise-btn').addEventListener('click',()=>jumpTo('rise'));$('sunset-btn').addEventListener('click',()=>jumpTo('set'));
 qa('[data-preset]').forEach(b=>b.addEventListener('click',()=>setPreset(b.dataset.preset)));qa('[data-az]').forEach(b=>b.addEventListener('click',()=>{$('building-az').value=b.dataset.az;update()}));update()
}
init();
})();
