(()=>{
'use strict';
const $=id=>document.getElementById(id);
const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rad=d=>d*Math.PI/180, deg=r=>r*180/Math.PI;
const fmt=(v,d=1)=>Number.isFinite(v)?v.toFixed(d).replace('.',','):'—';
let playTimer=null;
let communeCache=[];
const BCN='https://arcgiswebad.bcn.cl/arcgis/rest/services/tematico/Comunas_Generalizadas/MapServer/0/query';
const faceNames={front:'Principal',right:'Derecha',back:'Posterior',left:'Izquierda',roof:'Cubierta'};

function dayOfYear(date){
  const start=new Date(date.getFullYear(),0,0);
  return Math.floor((date-start)/86400000);
}
function solarPosition(date,lat,lon,tz){
  const n=dayOfYear(date);
  const hour=date.getHours()+date.getMinutes()/60+date.getSeconds()/3600;
  const gamma=2*Math.PI/365*(n-1+(hour-12)/24);
  const eq=229.18*(0.000075+0.001868*Math.cos(gamma)-0.032077*Math.sin(gamma)-0.014615*Math.cos(2*gamma)-0.040849*Math.sin(2*gamma));
  const dec=0.006918-0.399912*Math.cos(gamma)+0.070257*Math.sin(gamma)-0.006758*Math.cos(2*gamma)+0.000907*Math.sin(2*gamma)-0.002697*Math.cos(3*gamma)+0.00148*Math.sin(3*gamma);
  let tst=hour*60 + eq + 4*lon - 60*tz;
  tst=((tst%1440)+1440)%1440;
  let ha=tst/4-180;
  const phi=rad(lat), har=rad(ha);
  const cosz=clamp(Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(har),-1,1);
  const zen=Math.acos(cosz), alt=90-deg(zen);
  let az=deg(Math.atan2(Math.sin(har),Math.cos(har)*Math.sin(phi)-Math.tan(dec)*Math.cos(phi)))+180;
  az=(az+360)%360;
  return {az,alt,decl:deg(dec),eqtime:eq,ha};
}
function localDate(){
  const d=$('date').value?new Date($('date').value+'T00:00:00'):new Date();
  const mins=+$('time-range').value;
  d.setHours(Math.floor(mins/60),mins%60,0,0);
  return d;
}
function hhmm(mins){
  mins=((Math.round(mins)%1440)+1440)%1440;
  return String(Math.floor(mins/60)).padStart(2,'0')+':'+String(mins%60).padStart(2,'0');
}
function dirName(az){
  const names=['Norte','NE','Oriente','SE','Sur','SO','Poniente','NO'];
  return names[Math.round((az%360)/45)%8];
}
function faceAzimuths(buildAz){
  return {front:buildAz%360,right:(buildAz+90)%360,back:(buildAz+180)%360,left:(buildAz+270)%360};
}
function angleDiff(a,b){return ((a-b+540)%360)-180;}
function faceIncidence(sun,faceAz){
  if(sun.alt<=0)return 0;
  const dot=Math.cos(rad(sun.alt))*Math.cos(rad(angleDiff(sun.az,faceAz)));
  return Math.max(0,dot);
}
function sunriseSunset(date,lat,lon,tz){
  let first=null,last=null;
  for(let m=0;m<1440;m+=5){
    const d=new Date(date); d.setHours(Math.floor(m/60),m%60,0,0);
    const a=solarPosition(d,lat,lon,tz).alt;
    if(a>0 && first===null)first=m;
    if(a>0)last=m;
  }
  return {rise:first,set:last};
}
function project(x,y,z){
  const sx=350+(x-y)*22;
  const sy=350+(x+y)*8.6-z*31;
  return [sx,sy];
}
function rotate2(x,y,az){
  const a=rad(az); return [x*Math.cos(a)+y*Math.sin(a),-x*Math.sin(a)+y*Math.cos(a)];
}
function polygonAreaCentroid(ring){
  let a=0,cx=0,cy=0;
  for(let i=0;i<ring.length-1;i++){
    const [x0,y0]=ring[i],[x1,y1]=ring[i+1],cross=x0*y1-x1*y0;
    a+=cross; cx+=(x0+x1)*cross; cy+=(y0+y1)*cross;
  }
  a*=0.5;
  if(Math.abs(a)<1e-12)return null;
  return {area:a,cx:cx/(6*a),cy:cy/(6*a)};
}
function geometryCentroid(geom){
  if(!geom||!geom.rings)return null;
  let area=0,cx=0,cy=0;
  geom.rings.forEach(r=>{const c=polygonAreaCentroid(r);if(c){area+=c.area;cx+=c.cx*c.area;cy+=c.cy*c.area;}});
  if(Math.abs(area)<1e-12)return null;
  return {lon:cx/area,lat:cy/area};
}
async function loadCommuneList(){
  $('geo-status').textContent='Consultando comunas en BCN…';
  try{
    const url=BCN+'?where=1%3D1&outFields=cod_comuna%2Cnom_com%2Cnom_prov%2Cnom_reg&returnGeometry=false&f=json';
    const r=await fetch(url,{mode:'cors'}); if(!r.ok)throw new Error('HTTP '+r.status);
    const j=await r.json();
    communeCache=(j.features||[]).map(f=>f.attributes).sort((a,b)=>String(a.nom_com).localeCompare(String(b.nom_com),'es'));
    $('geo-status').textContent=`${communeCache.length} comunas disponibles desde BCN. Escribe para filtrar.`;
    filterCommunes();
  }catch(e){
    $('geo-status').textContent='No fue posible consultar BCN. Puedes usar latitud/longitud manualmente.';
    communeCache=[];
  }
}
function filterCommunes(){
  const q=$('commune-search').value.trim().toLocaleLowerCase('es');
  const box=$('commune-results'); box.innerHTML='';
  if(!communeCache.length||q.length<2)return;
  communeCache.filter(c=>String(c.nom_com).toLocaleLowerCase('es').includes(q)).slice(0,10).forEach(c=>{
    const b=document.createElement('button'); b.type='button';
    const left=document.createElement('span'); left.textContent=c.nom_com;
    const small=document.createElement('small'); small.textContent=c.nom_reg;
    b.append(left,small); b.addEventListener('click',()=>selectCommune(c)); box.append(b);
  });
}
async function selectCommune(c){
  $('commune-search').value=c.nom_com; $('commune-results').innerHTML='';
  $('geo-status').textContent=`Obteniendo centro geométrico de ${c.nom_com}…`;
  try{
    const where=encodeURIComponent('cod_comuna='+Number(c.cod_comuna));
    const url=BCN+`?where=${where}&outFields=cod_comuna%2Cnom_com&returnGeometry=true&outSR=4326&f=json`;
    const r=await fetch(url,{mode:'cors'}); if(!r.ok)throw new Error('HTTP '+r.status);
    const j=await r.json(); const f=j.features?.[0]; const center=geometryCentroid(f?.geometry);
    if(!center)throw new Error('sin geometría');
    $('lat').value=center.lat.toFixed(5); $('lon').value=center.lon.toFixed(5);
    $('geo-status').textContent=`${c.nom_com}, ${c.nom_reg} · coordenada representativa obtenida desde cartografía BCN.`;
    update();
  }catch(e){
    $('geo-status').textContent='No fue posible obtener la geometría. Mantén o ingresa coordenadas manuales.';
  }
}
function modelGeometry(){
  const W=Math.max(.5,+$('width').value||8),L=Math.max(.5,+$('length').value||12),H=Math.max(.5,+$('height').value||5.5),az=+$('building-az').value;
  const local=[[-W/2,-L/2],[W/2,-L/2],[W/2,L/2],[-W/2,L/2]];
  const base=local.map(([x,y])=>rotate2(x,y,az));
  const bottom=base.map(([x,y])=>({x,y,z:0})),top=base.map(([x,y])=>({x,y,z:H}));
  return {W,L,H,az,bottom,top};
}
function renderStage(sun){
  const g=modelGeometry();
  const sAlt=rad(Math.max(.1,sun.alt)),sAz=rad(sun.az);
  const sx=Math.sin(sAz)*Math.cos(sAlt), sy=Math.cos(sAz)*Math.cos(sAlt), sz=Math.sin(sAlt);
  const shadow=g.top.map(p=>({x:p.x-sx/sz*p.z,y:p.y-sy/sz*p.z,z:0}));
  const P=p=>project(p.x,p.y,p.z).join(',');
  const faceAz=faceAzimuths(g.az);
  const inc={front:faceIncidence(sun,faceAz.front),right:faceIncidence(sun,faceAz.right),back:faceIncidence(sun,faceAz.back),left:faceIncidence(sun,faceAz.left),roof:sun.alt>0?Math.sin(rad(sun.alt)):0};
  const faceDefs=[
    ['front',[g.bottom[0],g.bottom[1],g.top[1],g.top[0]],inc.front],
    ['right',[g.bottom[1],g.bottom[2],g.top[2],g.top[1]],inc.right],
    ['back',[g.bottom[2],g.bottom[3],g.top[3],g.top[2]],inc.back],
    ['left',[g.bottom[3],g.bottom[0],g.top[0],g.top[3]],inc.left]
  ];
  faceDefs.sort((a,b)=>a[1].reduce((s,p)=>s+p.x+p.y,0)-b[1].reduce((s,p)=>s+p.x+p.y,0));
  const grid=[]; for(let i=-14;i<=14;i+=2){let a=project(i,-14,0),b=project(i,14,0);grid.push(`<line class="ground-grid" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`);a=project(-14,i,0);b=project(14,i,0);grid.push(`<line class="ground-grid" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`)}
  const sunDist=12, sunPt={x:sunDist*Math.sin(sAz)*Math.cos(sAlt),y:sunDist*Math.cos(sAz)*Math.cos(sAlt),z:8+sunDist*Math.sin(sAlt)};
  const sp=project(sunPt.x,sunPt.y,sunPt.z), center=project(0,0,g.H/2);
  const northA=project(-11,10,0),northB=project(-11,14,0);
  const faces=faceDefs.map(([name,pts,v])=>{
    const alpha=.16+.60*v; const fill=`rgba(222,177,35,${alpha.toFixed(3)})`;
    const mid=pts.reduce((a,p)=>({x:a.x+p.x/4,y:a.y+p.y/4,z:a.z+p.z/4}),{x:0,y:0,z:0}),m=project(mid.x,mid.y,mid.z);
    return `<polygon points="${pts.map(P).join(' ')}" fill="${fill}" class="building-edge"/><text x="${m[0]}" y="${m[1]}" class="face-label" text-anchor="middle">${faceNames[name]}</text>`;
  }).join('');
  $('solar-stage').innerHTML=`<svg viewBox="0 0 700 520" aria-hidden="true"><rect width="700" height="520" fill="#f9fbfc"/>${grid.join('')}<polygon class="shadow-shape" points="${shadow.map(P).join(' ')}"/>${faces}<polygon points="${g.top.map(P).join(' ')}" fill="rgba(222,177,35,${(.12+.72*inc.roof).toFixed(3)})" class="building-edge"/><line class="sun-ray" x1="${sp[0]}" y1="${sp[1]}" x2="${center[0]}" y2="${center[1]}"/><circle cx="${sp[0]}" cy="${sp[1]}" r="17" fill="#efc13d" stroke="#c89300"/><text x="${sp[0]}" y="${sp[1]+4}" text-anchor="middle" class="sun-label">SOL</text><line class="north-arrow" x1="${northA[0]}" y1="${northA[1]}" x2="${northB[0]}" y2="${northB[1]}"/><polygon points="${northB[0]},${northB[1]-8} ${northB[0]-5},${northB[1]+2} ${northB[0]+5},${northB[1]+2}" fill="#244c5c"/><text x="${northB[0]}" y="${northB[1]-13}" text-anchor="middle" class="face-label">N</text></svg>`;
  return {inc,faceAz};
}
function renderFacades(sun,data){
  const grid=$('facade-grid');grid.innerHTML='';
  Object.keys(faceNames).forEach(k=>{
    const v=data.inc[k],az=k==='roof'?null:data.faceAz[k]; const c=document.createElement('div');c.className='facade-card';
    const orient=k==='roof'?'Plano horizontal':`${Math.round(az)}° · ${dirName(az)}`;
    c.innerHTML=`<strong>${faceNames[k]}</strong><span>${orient}</span><div class="facade-meter"><span style="width:${Math.round(v*100)}%"></span></div><small>${sun.alt>0?(v>0?`${Math.round(v*100)}% incidencia geométrica`:'Sin sol directo'):'Noche'}</small>`;grid.append(c);
  });
}
function renderTimeline(date,lat,lon,tz,buildAz){
  const out=$('daily-timeline');out.innerHTML=''; const faceAz=faceAzimuths(buildAz);
  Object.keys(faceNames).forEach(k=>{
    const row=document.createElement('div');row.className='timeline-row';const label=document.createElement('strong');label.textContent=faceNames[k];const tr=document.createElement('div');tr.className='timeline-track';
    for(let m=300;m<=1260;m+=30){const d=new Date(date);d.setHours(Math.floor(m/60),m%60,0,0);const sun=solarPosition(d,lat,lon,tz);const v=k==='roof'?(sun.alt>0?Math.sin(rad(sun.alt)):0):faceIncidence(sun,faceAz[k]);const cell=document.createElement('div');cell.className='timeline-cell';cell.style.setProperty('--i',(0.06+v*.88).toFixed(2));cell.title=`${hhmm(m)} · ${Math.round(v*100)}%`;tr.append(cell)}row.append(label,tr);out.append(row);
  });
  const axis=document.createElement('div');axis.className='timeline-axis';axis.innerHTML='<span>05:00</span><span>09:00</span><span>13:00</span><span>17:00</span><span>21:00</span>';out.append(axis);
}
function renderEave(sun,faceAz){
  const key=$('eave-face').value,az=faceAz[key],delta=Math.abs(angleDiff(sun.az,az));
  const wh=+$('window-h').value,depth=+$('eave-depth').value,gap=+$('eave-gap').value;
  $('window-h-label').textContent=fmt(wh,2);$('eave-depth-label').textContent=fmt(depth,2);$('eave-gap-label').textContent=fmt(gap,2);$('eave-face-name').textContent=faceNames[key];
  const sunlit=sun.alt>0&&delta<90;
  let profile=NaN,drop=0,shade=0;
  if(sunlit){profile=deg(Math.atan(Math.tan(rad(sun.alt))/Math.max(.001,Math.cos(rad(delta)))));drop=depth*Math.tan(rad(profile));shade=clamp((drop-gap)/wh,0,1);}
  $('profile-angle').textContent=sunlit?fmt(profile,1)+'°':'—';$('shadow-drop').textContent=sunlit?fmt(drop,2)+' m':'—';$('shade-pct').textContent=sunlit?Math.round(shade*100)+'%':'—';
  const H=wh,W=1.5,scale=115,wallX=190,baseY=335,topY=baseY-H*scale,eaveY=topY-gap*scale,eaveX2=wallX+depth*scale;
  const shY=sunlit?Math.min(baseY,eaveY+drop*scale):eaveY;
  const rayStartX=460,rayStartY=sunlit?Math.max(45,eaveY-(rayStartX-eaveX2)*Math.tan(rad(profile))):60;
  $('eave-visual').innerHTML=`<svg viewBox="0 0 620 390"><rect width="620" height="390" fill="#fbfcfc"/><line x1="${wallX}" y1="45" x2="${wallX}" y2="350" stroke="#425d68" stroke-width="10"/><rect x="${wallX-5}" y="${topY}" width="10" height="${H*scale}" fill="#7bc5df"/><line x1="${wallX}" y1="${eaveY}" x2="${eaveX2}" y2="${eaveY}" stroke="#384f58" stroke-width="12"/><rect x="${wallX-5}" y="${Math.max(topY,shY)}" width="10" height="${Math.max(0,baseY-Math.max(topY,shY))}" fill="#3a4650" opacity=".55"/><line x1="${rayStartX}" y1="${rayStartY}" x2="${eaveX2}" y2="${eaveY}" stroke="#d3a118" stroke-width="2" stroke-dasharray="7 5"/><line x1="${eaveX2}" y1="${eaveY}" x2="${wallX}" y2="${shY}" stroke="#d3a118" stroke-width="2" stroke-dasharray="7 5"/><circle cx="${rayStartX}" cy="${rayStartY}" r="16" fill="#efc13d"/><text x="${wallX-18}" y="${topY+H*scale/2}" text-anchor="end" class="face-label">Ventana ${fmt(wh,2)} m</text><text x="${(wallX+eaveX2)/2}" y="${eaveY-12}" text-anchor="middle" class="face-label">Alero ${fmt(depth,2)} m</text><text x="410" y="350" class="face-label">${sunlit?`Sombreado estimado: ${Math.round(shade*100)}%`:'Fachada sin sol directo'}</text></svg>`;
  let msg;if(!sunlit)msg='En este instante el sol está detrás del plano de esta fachada, por lo que el alero no controla radiación directa sobre esa ventana.';else if(shade>=.95)msg='El alero cubre prácticamente toda la altura de la ventana en este instante.';else if(shade>.5)msg='El alero sombrea más de la mitad de la ventana en este instante.';else if(shade>0)msg='El alero genera sombreado parcial sobre la ventana.';else msg='La sombra del alero todavía no alcanza la ventana con esta geometría y posición solar.';
  $('eave-message').textContent=msg;
}
function update(){
  const mins=+$('time-range').value;$('time-label').textContent=hhmm(mins);
  const buildAz=+$('building-az').value;$('building-az-label').textContent=`${buildAz}° · ${dirName(buildAz)}`;
  const lat=+$('lat').value,lon=+$('lon').value,tz=+$('tz').value,date=localDate();
  const sun=solarPosition(date,lat,lon,tz);
  $('sun-az').textContent=fmt(sun.az,1)+'°';$('sun-alt').textContent=fmt(sun.alt,1)+'°';
  const ss=sunriseSunset(date,lat,lon,tz);$('sunrise').textContent=ss.rise===null?'Sin salida':hhmm(ss.rise);$('sunset').textContent=ss.set===null?'Sin puesta':hhmm(ss.set);
  const stat=$('sun-status');stat.textContent=sun.alt>0?`☀ Sol a ${fmt(sun.alt,1)}°`:'Noche / sol bajo horizonte';stat.className='sun-status '+(sun.alt>0?'day':'night');
  const data=renderStage(sun);renderFacades(sun,data);renderTimeline(date,lat,lon,tz,buildAz);renderEave(sun,data.faceAz);
}
function setPreset(type){
  const now=new Date();let y=now.getFullYear(),m=now.getMonth()+1,d=now.getDate();
  if(type==='winter'){m=6;d=21}else if(type==='equinox'){m=9;d=21}else if(type==='summer'){m=12;d=21}
  $('date').value=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;update();
}
function togglePlay(){
  if(playTimer){clearInterval(playTimer);playTimer=null;$('play').textContent='▶ Recorrer el día';return;}
  $('play').textContent='❚❚ Pausar';
  playTimer=setInterval(()=>{let v=+$('time-range').value+10;if(v>1260)v=300;$('time-range').value=v;update();},160);
}
function init(){
  const now=new Date();$('date').value=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const minutes=clamp(now.getHours()*60+now.getMinutes(),300,1260);$('time-range').value=Math.round(minutes/5)*5;
  ['lat','lon','date','tz','time-range','width','length','height','building-az','window-h','eave-depth','eave-gap','eave-face'].forEach(id=>$(id).addEventListener('input',update));
  $('commune-search').addEventListener('input',filterCommunes);$('load-communes').addEventListener('click',loadCommuneList);$('play').addEventListener('click',togglePlay);$('noon').addEventListener('click',()=>{$('time-range').value=720;update()});
  qa('[data-preset]').forEach(b=>b.addEventListener('click',()=>setPreset(b.dataset.preset)));qa('[data-az]').forEach(b=>b.addEventListener('click',()=>{$('building-az').value=b.dataset.az;update()}));
  update();loadCommuneList();
}
init();
})();
