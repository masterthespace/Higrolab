const $=id=>document.getElementById(id);
const fmt=(n,d=0)=>Number.isFinite(n)?n.toFixed(d).replace('.',','):'—';
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));

const Rsi=.13,Rse=.04;
const WALL_MATERIALS={
  gypsum:{name:'Yeso-cartón',lambda:.25,color:'#ded8c8',class:'estimate'},
  vapor:{name:'Barrera de vapor',r:.001,color:'#7ec5cf',class:'physical'},
  osb:{name:'OSB',lambda:.13,color:'#bf956c',class:'estimate'},
  wood:{name:'Madera',lambda:.13,color:'#c69d72',class:'estimate'},
  concrete:{name:'Hormigón armado',lambda:1.63,color:'#aeb5b7',class:'normative'},
  masonry:{name:'Albañilería cerámica',lambda:.72,color:'#c97858',class:'estimate'},
  eps20:{name:'EPS 20 kg/m³',lambda:.0384,color:'#dce99d',class:'normative'},
  eps:{name:'EPS genérico',lambda:.038,color:'#e2efa9',class:'estimate'},
  mineral:{name:'Lana mineral',lambda:.040,color:'#e5d99c',class:'estimate'},
  glass:{name:'Lana de vidrio',lambda:.042,color:'#f0d66f',class:'normative'},
  air:{name:'Cámara de aire',r:.18,color:'#d9eef2',class:'estimate'},
  fibro:{name:'Fibrocemento',lambda:.23,color:'#c6ccca',class:'estimate'},
  stucco:{name:'Estuco / mortero',lambda:.87,color:'#cbb7a2',class:'estimate'},
  eifsBase:{name:'EIFS · capa base + terminación',r:.02,color:'#e7c9a4',class:'estimate'},
  custom:{name:'Personalizado',lambda:.04,color:'#d7dbe7',class:'custom'}
};

let wallLayers=[
 {type:'gypsum',e:12.5},
 {type:'vapor',e:.2},
 {type:'concrete',e:150},
 {type:'eps20',e:50},
 {type:'eifsBase',e:5}
];

function wallMaterialOptions(type){
 return Object.entries(WALL_MATERIALS).map(([k,v])=>`<option value="${k}"${k===type?' selected':''}>${v.name}</option>`).join('')
}
function layerR(l){
 const m=WALL_MATERIALS[l.type]||WALL_MATERIALS.custom;
 if(m.r!=null)return m.r;
 return (Math.max(.1,+l.e||1)/1000)/Math.max(.001,+l.lambda||m.lambda||.04)
}
function setPreset(name){
 if(name==='timber')wallLayers=[
  {type:'gypsum',e:12.5},{type:'vapor',e:.2},{type:'wood',e:15},{type:'mineral',e:90},{type:'osb',e:11},{type:'air',e:25},{type:'fibro',e:8}
 ];
 if(name==='concreteEIFS')wallLayers=[
  {type:'gypsum',e:12.5},{type:'concrete',e:150},{type:'eps20',e:50},{type:'eifsBase',e:5}
 ];
 if(name==='masonry')wallLayers=[
  {type:'gypsum',e:12.5},{type:'masonry',e:140},{type:'eps20',e:40},{type:'stucco',e:15}
 ];
 renderWallRows();calculate();
}
function renderWallRows(){
 const host=$('wallLayerRows');host.innerHTML='';
 wallLayers.forEach((l,i)=>{
  const m=WALL_MATERIALS[l.type]||WALL_MATERIALS.custom;
  const row=document.createElement('div');row.className='wall-layer-row';
  row.innerHTML=`<span class="layer-number">${i+1}</span><div class="field"><label>Material</label><select class="wl-type" data-i="${i}">${wallMaterialOptions(l.type)}</select></div>
  <div class="field"><label>Espesor [mm]</label><input class="wl-e" data-i="${i}" type="number" min=".1" step=".1" value="${l.e}"></div>
  <div class="field"><label>λ / R</label><input class="wl-prop" data-i="${i}" type="number" min=".0001" step=".001" value="${m.r!=null?m.r:(l.lambda||m.lambda||.04)}"><small>${m.r!=null?'R [m²K/W]':'λ [W/mK]'}</small></div>
  <div class="layer-r"><small>R capa</small><b>${fmt(layerR(l),3)}</b></div>
  <div class="layer-actions"><button class="wl-up" data-i="${i}" title="Subir">↑</button><button class="wl-down" data-i="${i}" title="Bajar">↓</button><button class="wl-del" data-i="${i}" title="Eliminar">×</button></div>`;
  host.append(row)
 });
 host.querySelectorAll('.wl-type').forEach(el=>el.onchange=()=>{
   const i=+el.dataset.i,m=WALL_MATERIALS[el.value];wallLayers[i].type=el.value;wallLayers[i].lambda=m.lambda;renderWallRows();calculate()
 });
 host.querySelectorAll('.wl-e').forEach(el=>el.oninput=()=>{wallLayers[+el.dataset.i].e=Math.max(.1,+el.value||.1);calculate();renderWallVisual()});
 host.querySelectorAll('.wl-prop').forEach(el=>el.oninput=()=>{
   const i=+el.dataset.i,m=WALL_MATERIALS[wallLayers[i].type];
   if(m.r!=null){WALL_MATERIALS[wallLayers[i].type]={...m,r:Math.max(.0001,+el.value||.0001)}}else wallLayers[i].lambda=Math.max(.001,+el.value||.001);
   calculate()
 });
 host.querySelectorAll('.wl-up').forEach(el=>el.onclick=()=>{const i=+el.dataset.i;if(i>0)[wallLayers[i-1],wallLayers[i]]=[wallLayers[i],wallLayers[i-1]];renderWallRows();calculate()});
 host.querySelectorAll('.wl-down').forEach(el=>el.onclick=()=>{const i=+el.dataset.i;if(i<wallLayers.length-1)[wallLayers[i+1],wallLayers[i]]=[wallLayers[i],wallLayers[i+1]];renderWallRows();calculate()});
 host.querySelectorAll('.wl-del').forEach(el=>el.onclick=()=>{if(wallLayers.length>1)wallLayers.splice(+el.dataset.i,1);renderWallRows();calculate()});
 renderWallVisual()
}
function renderWallVisual(){
 const h=$('wallLayersVisual');if(!h)return;
 const weights=wallLayers.map(l=>clamp((+l.e||1),3,80)),sum=weights.reduce((a,b)=>a+b,0);
 h.innerHTML=`<div class="wall-side-label interior">INTERIOR</div>`+wallLayers.map((l,i)=>{
   const m=WALL_MATERIALS[l.type]||WALL_MATERIALS.custom;
   return `<div class="wall-v-layer" style="flex:${weights[i]};background:${m.color}" title="${esc(m.name)} · ${l.e} mm"><b>${esc(m.name)}</b><span>${fmt(l.e,1)} mm</span></div>`
 }).join('')+`<div class="wall-side-label exterior">EXTERIOR</div>`
}
function geometry(){
 const L=Math.max(1,+$('length').value||1),W=Math.max(1,+$('width').value||1),H=Math.max(1.8,+$('height').value||2.4),N=clamp(+$('levels').value||1,1,4);
 const floor=L*W*N,roof=L*W,grossWalls=2*(L+W)*H*N,volume=L*W*H*N;
 return {L,W,H,N,floor,roof,grossWalls,volume}
}
function selectedWindowU(){
 return $('windowPreset').value==='custom'?Math.max(.1,+$('windowUCustom').value||2.5):+$('windowPreset').value
}
function selectedAch(){
 const mode=document.querySelector('input[name="airMode"]:checked')?.value||'ach';
 return mode==='scenario'?+$('airScenario').value:Math.max(0,+$('ach').value||0)
}
function wallCalc(){
 const Rt=Rsi+Rse+wallLayers.reduce((s,l)=>s+layerR(l),0),U=1/Rt;return{Rt,U}
}
function calculate(){
 const g=geometry(),Ti=+$('ti').value||20,Te=+$('te').value||5,dT=Math.abs(Ti-Te);
 const w=wallCalc(),winA=Math.max(0,+$('windowArea').value||0),doorA=Math.max(0,+$('doorArea').value||0),wallA=Math.max(0,g.grossWalls-winA-doorA);
 const winU=selectedWindowU(),doorU=Math.max(.1,+$('doorU').value||2.2),roofA=Math.max(0,+$('roofArea').value||g.roof),roofU=Math.max(.01,+$('roofU').value||.45);
 const floorType=$('floorType').value,floorU=Math.max(.01,+$('floorU').value||.6);
 const wallLoss=w.U*wallA*dT,windowLoss=winU*winA*dT,doorLoss=doorU*doorA*dT,roofLoss=roofU*roofA*dT;
 let floorLoss=0;
 if(floorType==='exterior')floorLoss=floorU*g.floor*dT;
 else if(floorType==='ground')floorLoss=floorU*g.floor*dT*.65; // deliberately simplified ground factor
 const ach=selectedAch(),airLoss=.33*ach*g.volume*dT;
 const transmission=wallLoss+windowLoss+doorLoss+roofLoss+floorLoss,total=transmission+airLoss;
 const parts=[
  {id:'walls',name:'Muros',loss:wallLoss},{id:'windows',name:'Ventanas',loss:windowLoss},{id:'roof',name:'Techumbre',loss:roofLoss},
  {id:'air',name:'Ventilación / infiltración',loss:airLoss},{id:'floor',name:'Piso',loss:floorLoss},{id:'doors',name:'Puertas',loss:doorLoss}
 ].sort((a,b)=>b.loss-a.loss);

 $('volumeOut').textContent=fmt(g.volume,1);$('floorAreaOut').textContent=fmt(g.floor,1);$('grossWallOut').textContent=fmt(g.grossWalls,1);$('deltaTOut').textContent=fmt(dT,1);
 $('wallRt').textContent=fmt(w.Rt,3);$('wallU').textContent=fmt(w.U,2);$('wallArea').textContent=fmt(wallA,1);$('wallLoss').textContent=fmt(wallLoss,0);
 $('windowLoss').textContent=fmt(windowLoss,0)+' W';$('doorLoss').textContent=fmt(doorLoss,0)+' W';$('roofLoss').textContent=fmt(roofLoss,0)+' W';$('floorLoss').textContent=fmt(floorLoss,0)+' W';
 $('airLoss').textContent=fmt(airLoss,0)+' W';$('airFormula').textContent=`0,33 × ${fmt(ach,2)} ACH × ${fmt(g.volume,0)} m³ × ${fmt(dT,1)} °C`;
 $('trans').textContent=fmt(transmission,0);$('vent').textContent=fmt(airLoss,0);$('total').textContent=fmt(total,0);$('specific').textContent=fmt(g.floor?total/g.floor:0,1);
 $('kw').textContent=fmt(total/1000,2)+' kW';$('e8').textContent=fmt(total/1000*8,1);$('e12').textContent=fmt(total/1000*12,1);$('e24').textContent=fmt(total/1000*24,1);
 $('roofVisualText').textContent=`U ${fmt(roofU,2)} · ${fmt(roofLoss,0)} W`;
 $('wallExplainer').innerHTML=`El muro tiene <b>U ${fmt(w.U,2)} W/m²K</b>. Con ${fmt(wallA,1)} m² netos y ΔT ${fmt(dT,1)} °C, transmite aproximadamente <b>${fmt(wallLoss,0)} W</b>. La capa con mayor resistencia es <b>${esc([...wallLayers].sort((a,b)=>layerR(b)-layerR(a))[0] ? WALL_MATERIALS[[...wallLayers].sort((a,b)=>layerR(b)-layerR(a))[0].type].name : '—')}</b>.`;

 const max=Math.max(...parts.map(p=>p.loss),1);
 const totalSafe=Math.max(total,1);
 $('lossRanking').innerHTML=parts.map((p,i)=>`<div class="heat-rank-row"><span class="rank">${i+1}</span><div><b>${p.name}</b><small>${fmt(p.loss/totalSafe*100,0)}% del total</small></div><div class="heat-rank-track"><i style="width:${p.loss/max*100}%"></i></div><strong>${fmt(p.loss,0)} W</strong></div>`).join('');
 const dom=parts[0];
 $('dominantAdvice').innerHTML=`<b>Mayor pérdida: ${dom.name}</b><span>Representa aproximadamente ${fmt(dom.loss/totalSafe*100,0)}% de la pérdida calculada. Una mejora en este componente tendría, en principio, el mayor impacto instantáneo.</span>`;
 const ids={walls:'hmWalls',windows:'hmWindows',roof:'hmRoof',air:'hmAir',floor:'hmFloor',doors:'hmDoors'};
 parts.forEach(p=>{const el=$(ids[p.id]);if(el)el.textContent=fmt(p.loss/totalSafe*100,0)+'%'});
 $('hmTotal').textContent=fmt(total/1000,2);
 document.querySelectorAll('#houseHeatmap [data-part]').forEach(el=>{
   const p=parts.find(x=>x.id===el.dataset.part);const intensity=p?clamp(p.loss/max,0,1):0;el.style.setProperty('--heat',intensity)
 });
 const wattsPerM2=g.floor?total/g.floor:0;
 $('demandFill').style.width=clamp(wattsPerM2/120*100,2,100)+'%';
 let di='Carga instantánea baja para estas condiciones.';
 if(wattsPerM2>=35)di='Carga instantánea moderada para estas condiciones.';
 if(wattsPerM2>=70)di='Carga instantánea elevada; revisa los componentes dominantes.';
 if(wattsPerM2>=110)di='Carga instantánea muy elevada; la envolvente o infiltración requiere atención.';
 $('demandInterpretation').textContent=di;
 renderImprovements({g,dT,w,wallA,winA,winU,roofA,roofU,ach,total});
 window.__heatloss={Ti,Te,dT,g,w,wallA,winA,winU,doorA,doorU,roofA,roofU,floorType,floorU,ach,wallLoss,windowLoss,doorLoss,roofLoss,floorLoss,airLoss,transmission,total,parts}
}
function renderImprovements(c){
 const wallTarget=Math.max(.05,+$('improveWallU').value||.45),winTarget=Math.max(.1,+$('improveWindowU').value||1.8),roofTarget=Math.max(.05,+$('improveRoofU').value||.3),achTarget=Math.max(0,+$('improveAch').value||.3);
 const opts=[
  {name:'Mejorar muros',save:Math.max(0,(c.w.U-wallTarget)*c.wallA*c.dT),note:`U ${fmt(c.w.U,2)} → ${fmt(wallTarget,2)}`},
  {name:'Mejorar ventanas',save:Math.max(0,(c.winU-winTarget)*c.winA*c.dT),note:`U ${fmt(c.winU,2)} → ${fmt(winTarget,2)}`},
  {name:'Mejorar techumbre',save:Math.max(0,(c.roofU-roofTarget)*c.roofA*c.dT),note:`U ${fmt(c.roofU,2)} → ${fmt(roofTarget,2)}`},
  {name:'Reducir infiltración',save:Math.max(0,.33*(c.ach-achTarget)*c.g.volume*c.dT),note:`${fmt(c.ach,2)} → ${fmt(achTarget,2)} ACH`}
 ].sort((a,b)=>b.save-a.save);
 const mx=Math.max(...opts.map(x=>x.save),1);
 $('improvementRanking').innerHTML=opts.map((o,i)=>`<div class="improvement-row ${i===0?'best':''}"><div><small>${i===0?'MAYOR IMPACTO ESTIMADO':''}</small><b>${o.name}</b><span>${o.note}</span></div><div class="improvement-track"><i style="width:${o.save/mx*100}%"></i></div><strong>−${fmt(o.save,0)} W</strong></div>`).join('')
}
function syncPanels(){
 document.querySelectorAll('.env-tab').forEach(b=>b.classList.toggle('active',b.dataset.panel===window.__activePanel));
 document.querySelectorAll('.env-panel').forEach(p=>p.classList.toggle('active',p.id==='panel-'+window.__activePanel))
}
function syncAirMode(){
 const mode=document.querySelector('input[name="airMode"]:checked')?.value||'ach';
 $('achPanel').classList.toggle('hidden',mode!=='ach');$('airScenarioPanel').classList.toggle('hidden',mode!=='scenario');
 document.querySelectorAll('.air-mode').forEach(l=>l.classList.toggle('active',l.querySelector('input').checked));calculate()
}
function syncFloor(){
 const type=$('floorType').value;$('floorUWrap').classList.toggle('hidden',type==='adiabatic');
 $('floorMethodNote').textContent=type==='ground'?'Piso sobre terreno: esta versión usa una corrección simplificada del intercambio con terreno; no es un cálculo CEV/NCh853 completo.':type==='adiabatic'?'Recinto acondicionado contiguo: se considera adiabático, sin flujo térmico, coherente con la definición CEV de elemento adiabático.':'Piso ventilado / sobre exterior: pérdida calculada como U·A·ΔT.';
 calculate()
}
function bind(){
 window.__activePanel='walls';
 document.querySelectorAll('.env-tab').forEach(b=>b.onclick=()=>{window.__activePanel=b.dataset.panel;syncPanels()});
 $('addWallLayer').onclick=()=>{wallLayers.push({type:'custom',e:50,lambda:.04});renderWallRows();calculate()};
 $('wallPresetTimber').onclick=()=>setPreset('timber');$('wallPresetConcreteEIFS').onclick=()=>setPreset('concreteEIFS');$('wallPresetMasonry').onclick=()=>setPreset('masonry');
 ['ti','te','length','width','height','levels','windowArea','windowUCustom','doorArea','doorU','roofArea','roofU','floorU','ach','improveWallU','improveWindowU','improveRoofU','improveAch'].forEach(id=>$(id)?.addEventListener('input',calculate));
 $('windowPreset').onchange=()=>{$('windowCustomWrap').classList.toggle('hidden',$('windowPreset').value!=='custom');calculate()};
 $('floorType').onchange=syncFloor;
 document.querySelectorAll('input[name="airMode"]').forEach(x=>x.onchange=syncAirMode);$('airScenario').onchange=calculate;
 renderWallRows();syncPanels();syncAirMode();syncFloor();calculate()
}
window.addEventListener('DOMContentLoaded',bind);

window.HIDROLAB_HEATLOSS_REPORT=()=>window.__heatloss?{
 title:'Pérdidas térmicas de la vivienda',
 conditions:{Ti:window.__heatloss.Ti,Te:window.__heatloss.Te,dT:window.__heatloss.dT,volume:window.__heatloss.g.volume,floorArea:window.__heatloss.g.floor,grossWalls:window.__heatloss.g.grossWalls},
 wall:{layers:wallLayers.map((l,i)=>({order:i+1,name:WALL_MATERIALS[l.type].name,thickness:l.e,R:layerR(l),sourceClass:WALL_MATERIALS[l.type].class})),Rt:window.__heatloss.w.Rt,U:window.__heatloss.w.U,area:window.__heatloss.wallA,loss:window.__heatloss.wallLoss},
 elements:window.__heatloss.parts,total:window.__heatloss.total,transmission:window.__heatloss.transmission,airLoss:window.__heatloss.airLoss,ach:window.__heatloss.ach,
 energy:{h8:window.__heatloss.total/1000*8,h12:window.__heatloss.total/1000*12,h24:window.__heatloss.total/1000*24}
}:null;
