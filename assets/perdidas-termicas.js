const $=id=>document.getElementById(id);
const fmt=(n,d=0)=>Number.isFinite(n)?n.toFixed(d).replace('.',','):'—';
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function num(id,fallback=0,min=-Infinity,max=Infinity){
  const el=$(id),raw=el?Number(el.value):NaN;
  return clamp(Number.isFinite(raw)?raw:fallback,min,max);
}

/* ============================================================
   FUENTES OFICIALES INCORPORADAS
   - Manual CEV 2025: Tablas 4, 5, 6 y 7.
   - LOSCAT E14 2026 DITEC-MINVU: aislantes con λ vigente.
   - Memorias de cálculo publicadas por MINVU: yeso, OSB, pino.
   ============================================================ */
const WINDOW_FRAMES={
  wood:{name:'Madera',u:2.6,glassFrac:.75},
  pvc:{name:'PVC',u:2.8,glassFrac:.80},
  steel:{name:'Acero',u:5.8,glassFrac:.85},
  alu:{name:'Aluminio sin RPT',u:5.8,glassFrac:.85},
  aluRpt:{name:'Aluminio con RPT',u:3.3,glassFrac:.80}
};
const WINDOW_GLASSES={
  mono:{name:'Vidrio monolítico',u:5.80},
  dvhUnknown:{name:'DVH <6 mm / sin dato',u:3.58},
  dvh6:{name:'DVH 6 mm',u:3.28},
  dvh9:{name:'DVH 9 mm',u:3.01},
  dvh12:{name:'DVH 12 mm',u:2.85},
  dvh15:{name:'DVH 15 mm',u:2.80}
};
const DOOR_PRESETS={
  solid0:{name:'Madera sólida opaca',leafU:1.70,glass:0,glassU:5.80,frameU:1.70,frame:.0878},
  solid40:{name:'Madera sólida 40% vidriada',leafU:1.70,glass:.40,glassU:5.80,frameU:1.70,frame:.0878},
  solid85:{name:'Madera sólida 85% vidriada',leafU:1.70,glass:.85,glassU:5.80,frameU:1.70,frame:.0878},
  panel0:{name:'Madera entablerada opaca',leafU:2.63,glass:0,glassU:5.80,frameU:1.25,frame:.0878},
  panel45:{name:'Madera entablerada 45% vidriada',leafU:2.53,glass:.45,glassU:5.80,frameU:1.25,frame:.0878},
  panel85:{name:'Madera entablerada 85% vidriada',leafU:2.18,glass:.85,glassU:5.80,frameU:1.25,frame:.0878}
};
const MATERIALS={
  gypsum:{name:'Yeso cartón 870 kg/m³',lambda:.31,defaultMm:10,source:'Memoria térmica publicada MINVU · NCh853'},
  osb:{name:'OSB 690 kg/m³',lambda:.106,defaultMm:11.1,source:'Memoria térmica publicada MINVU · NCh853'},
  pine:{name:'Pino / madera estructural',lambda:.104,defaultMm:19,source:'Memoria térmica publicada MINVU · NCh853'},
  glass14:{name:'Lana vidrio AISLANGLASS 14 kg/m³',lambda:.040,defaultMm:80,source:'LOSCAT E14 2026 · R100/LV'},
  glass13:{name:'Lana vidrio AISLHOGAR 13 kg/m³',lambda:.041,defaultMm:80,source:'LOSCAT E14 2026 · R100/LV.1.1'},
  eps25:{name:'EPS 25 kg/m³',lambda:.037,defaultMm:50,source:'LOSCAT E14 2026 · techumbre 1.1.M.A1.5'},
  zinc:{name:'Zinc',lambda:112,defaultMm:.5,source:'Referencia oficial MINVU'},
  vapor:{name:'Barrera de vapor / polietileno',fixedR:0,defaultMm:.2,source:'Sin crédito térmico automático'},
  membrane:{name:'Membrana hidrófuga',fixedR:0,defaultMm:.5,source:'Sin crédito térmico automático'},
  shingle:{name:'Teja asfáltica',fixedR:0,defaultMm:6,source:'Sin crédito térmico automático; usar dato acreditado si se desea considerar'},
  custom:{name:'Material personalizado',lambda:.10,defaultMm:10,source:'Valor ingresado por usuario'}
};

const state={
  windowRows:[{name:'V1',w:120,h:100,q:1}],
  doorRows:[{name:'P1',w:90,h:210,q:1}],
  roofLayers:[
    {mat:'gypsum',mm:10},{mat:'vapor',mm:.2},{mat:'glass14',mm:80},
    {mat:'osb',mm:11.1},{mat:'membrane',mm:.5},{mat:'zinc',mm:.5}
  ],
  floorLayers:[
    {mat:'osb',mm:18},{mat:'glass14',mm:80},{mat:'osb',mm:11.1}
  ]
};

function geometry(){
  const L=num('length',8,1),W=num('width',7,1),H=num('height',2.5,1.8),N=Math.round(num('levels',1,1,4));
  const footprint=L*W;
  const useful=footprint*N;
  const roof=footprint;
  const floor=footprint;
  const grossWalls=2*(L+W)*H*N;
  const volume=footprint*H*N;
  return {L,W,H,N,footprint,useful,roof,floor,grossWalls,volume};
}
function achValue(){
  const mode=$('airMode').value;
  if(mode==='known'){$('ach').disabled=false;return num('ach',.5,0,10)}
  const v=Math.max(0,Number(mode)||0);$('ach').value=v.toFixed(2);$('ach').disabled=true;return v;
}
function syncRoofArea(g){
  const manual=$('roofManual').checked;
  $('roofArea').readOnly=!manual;
  if(!manual)$('roofArea').value=g.roof.toFixed(2);
  $('roofModeHelp').textContent=manual?'Área térmica definida manualmente':'Área automática = huella horizontal de la vivienda';
}
function syncFloor(){
  const type=$('floorType').value,adiabatic=type==='adiabatic';
  $('floorU').disabled=adiabatic;
  $('floorUWrap').classList.toggle('hl2-disabled',adiabatic);
  if(type==='ground'){
    $('floorULabel').textContent='U equivalente piso-terreno [W/m²K]';
    $('floorMethodNote').textContent='Usa U equivalente obtenido según NCh3117 / CEV o una fuente técnica respaldada.';
  }else if(type==='adiabatic'){
    $('floorULabel').textContent='U piso [W/m²K]';
    $('floorMethodNote').textContent='Recinto acondicionado contiguo: flujo térmico considerado 0.';
  }else{
    $('floorULabel').textContent='U piso ventilado [W/m²K]';
    $('floorMethodNote').textContent='Piso exterior / ventilado: U · A · ΔT.';
  }
  updateFloorBuilderAvailability();
}
function syncFloorArea(g){
  const manual=$('floorManual').checked;
  $('floorAreaInput').readOnly=!manual;
  if(!manual)$('floorAreaInput').value=g.floor.toFixed(2);
  $('floorAreaHelp').textContent=manual?'Superficie de piso expuesto definida manualmente.':'Área automática = largo × ancho de la planta.';
  return num('floorAreaInput',g.floor,0);
}
function bridgeCoefficient(){
  if(!$('bridgeEnabled')?.checked)return 0;
  if($('bridgeMode').value==='direct')return num('bridgeH',0,0);
  return num('bridgeLength',0,0)*num('bridgePsi',.10,0);
}
function syncBridgeUI(){
  const enabled=$('bridgeEnabled').checked;
  $('bridgePanel').classList.toggle('hl2-hidden',!enabled);
  if(!enabled)return;
  const direct=$('bridgeMode').value==='direct';
  $('bridgeAssistant').classList.toggle('hl2-hidden',direct);
  $('bridgeDirect').classList.toggle('hl2-hidden',!direct);
}

/* ---------- dimensions builders ---------- */
function dimArea(row,unit){
  const f=unit==='cm'?.01:1;
  return Math.max(0,row.w*f)*Math.max(0,row.h*f)*Math.max(0,row.q);
}
function renderDimRows(kind){
  const isWin=kind==='window';
  const rows=isWin?state.windowRows:state.doorRows;
  const unit=$(isWin?'winUnit':'doorUnit').value;
  const root=$(isWin?'windowDimensionRows':'doorDimensionRows');
  root.innerHTML=rows.map((r,i)=>`
    <div class="hl2-dim-row" data-kind="${kind}" data-index="${i}">
      <input data-k="name" value="${r.name}" aria-label="Nombre">
      <input data-k="w" type="number" min="0" step="${unit==='cm'?1:.01}" value="${r.w}" aria-label="Ancho">
      <input data-k="h" type="number" min="0" step="${unit==='cm'?1:.01}" value="${r.h}" aria-label="Alto">
      <input data-k="q" type="number" min="1" step="1" value="${r.q}" aria-label="Cantidad">
      <strong>${fmt(dimArea(r,unit),2)} m²</strong>
      <button type="button" data-remove="${i}" aria-label="Eliminar">×</button>
    </div>`).join('');
  root.querySelectorAll('input').forEach(el=>el.addEventListener('input',e=>{
    const row=e.target.closest('.hl2-dim-row'),i=Number(row.dataset.index),k=e.target.dataset.k;
    rows[i][k]=k==='name'?e.target.value:Number(e.target.value||0);
    renderDimRows(kind); updateBuilder(kind);
  }));
  root.querySelectorAll('[data-remove]').forEach(btn=>btn.addEventListener('click',()=>{
    rows.splice(Number(btn.dataset.remove),1);renderDimRows(kind);updateBuilder(kind);
  }));
}
function windowComplexU(){
  const f=WINDOW_FRAMES[$('winFrame').value],g=WINDOW_GLASSES[$('winGlass').value];
  return g.u*f.glassFrac+f.u*(1-f.glassFrac);
}
function doorComplexU(){
  if($('doorPreset').value==='custom')return num('doorCustomU',2.2,.1);
  const p=DOOR_PRESETS[$('doorPreset').value];
  const leaf=Math.max(0,1-p.glass-p.frame);
  return leaf*p.leafU+p.glass*p.glassU+p.frame*p.frameU;
}
function updateBuilder(kind){
  if(kind==='window'){
    const area=state.windowRows.reduce((a,r)=>a+dimArea(r,$('winUnit').value),0);
    const u=windowComplexU();
    $('winCalcArea').textContent=fmt(area,2)+' m²';$('winCalcU').textContent=fmt(u,2);
  }else{
    const area=state.doorRows.reduce((a,r)=>a+dimArea(r,$('doorUnit').value),0);
    const u=doorComplexU();
    $('doorCalcArea').textContent=fmt(area,2)+' m²';$('doorCalcU').textContent=fmt(u,2);
    const custom=$('doorPreset').value==='custom';
    $('doorCustomU').disabled=!custom;
    if(custom){
      $('doorPresetExplain').textContent='Valor total ingresado por usuario / fabricante.';
    }else{
      const p=DOOR_PRESETS[$('doorPreset').value],leaf=Math.max(0,1-p.glass-p.frame);
      $('doorPresetExplain').textContent=`Hoja ${(leaf*100).toFixed(1)}% · vidrio ${(p.glass*100).toFixed(0)}% · marco ${(p.frame*100).toFixed(2)}%`;
    }
  }
}
function applyWindowBuilder(){
  const area=state.windowRows.reduce((a,r)=>a+dimArea(r,$('winUnit').value),0),u=windowComplexU();
  $('windowArea').value=area.toFixed(2);$('windowU').value=u.toFixed(2);
  const f=WINDOW_FRAMES[$('winFrame').value],g=WINDOW_GLASSES[$('winGlass').value];
  $('windowSource').textContent=`CEV por defecto: ${f.name} + ${g.name}. U ponderado HIDROLAB ${fmt(u,2)} W/m²K.`;
  calculate();
}
function applyDoorBuilder(){
  const area=state.doorRows.reduce((a,r)=>a+dimArea(r,$('doorUnit').value),0),u=doorComplexU();
  $('doorArea').value=area.toFixed(2);$('doorU').value=u.toFixed(2);
  $('doorSource').textContent=$('doorPreset').value==='custom'
    ? 'U total personalizado aplicado.'
    : `Preset CEV: ${DOOR_PRESETS[$('doorPreset').value].name}. U ponderado ${fmt(u,2)} W/m²K.`;
  calculate();
}

/* ---------- layers builders ---------- */
function materialOptions(selected){
  return Object.entries(MATERIALS).map(([k,m])=>`<option value="${k}" ${k===selected?'selected':''}>${m.name}</option>`).join('');
}
function layerR(layer){
  const m=MATERIALS[layer.mat];
  if(m.fixedR!==undefined)return m.fixedR;
  const lambda=layer.lambdaCustom||m.lambda;
  return lambda>0?(layer.mm/1000)/lambda:0;
}
function renderLayers(kind){
  const rows=kind==='roof'?state.roofLayers:state.floorLayers;
  const root=$(kind==='roof'?'roofLayers':'floorLayers');
  root.innerHTML=rows.map((r,i)=>{
    const m=MATERIALS[r.mat],lambda=r.lambdaCustom||m.lambda||0;
    return `<div class="hl2-layer-row" data-kind="${kind}" data-index="${i}">
      <select data-k="mat">${materialOptions(r.mat)}</select>
      <input data-k="mm" type="number" min="0" step=".1" value="${r.mm}">
      <input data-k="lambda" type="number" min=".001" step=".001" value="${lambda}" ${r.mat==='custom'?'':'readonly'}>
      <strong>${fmt(layerR(r),3)}</strong>
      <button type="button" data-remove="${i}">×</button>
      <small>${m.source}</small>
    </div>`;
  }).join('');
  root.querySelectorAll('select[data-k="mat"]').forEach(el=>el.addEventListener('change',e=>{
    const row=e.target.closest('.hl2-layer-row'),i=Number(row.dataset.index),mat=e.target.value;
    rows[i]={mat,mm:MATERIALS[mat].defaultMm,lambdaCustom:mat==='custom'?(MATERIALS[mat].lambda||.1):undefined};
    renderLayers(kind);updateLayerCalc(kind);
  }));
  root.querySelectorAll('input').forEach(el=>el.addEventListener('input',e=>{
    const row=e.target.closest('.hl2-layer-row'),i=Number(row.dataset.index),k=e.target.dataset.k,v=Number(e.target.value||0);
    if(k==='mm')rows[i].mm=v;
    if(k==='lambda')rows[i].lambdaCustom=v;
    row.querySelector('strong').textContent=fmt(layerR(rows[i]),3);
    updateLayerCalc(kind);
  }));
  root.querySelectorAll('[data-remove]').forEach(btn=>btn.addEventListener('click',()=>{
    rows.splice(Number(btn.dataset.remove),1);renderLayers(kind);updateLayerCalc(kind);
  }));
}
function layerCalc(kind){
  const rows=kind==='roof'?state.roofLayers:state.floorLayers;
  const rLayers=rows.reduce((a,r)=>a+layerR(r),0);
  const rsi=kind==='roof'?.10:.17,rse=.04,rt=rsi+rLayers+rse,u=rt>0?1/rt:0;
  return {rLayers,rt,u};
}
function updateLayerCalc(kind){
  const c=layerCalc(kind);
  if(kind==='roof'){
    $('roofLayersR').textContent=fmt(c.rLayers,3);$('roofRt').textContent=fmt(c.rt,3);$('roofCalcU').textContent=fmt(c.u,2)+' W/m²K';
  }else{
    $('floorLayersR').textContent=fmt(c.rLayers,3);$('floorRt').textContent=fmt(c.rt,3);$('floorCalcU').textContent=fmt(c.u,2)+' W/m²K';
  }
}
function applyRoofBuilder(){
  const c=layerCalc('roof');$('roofU').value=c.u.toFixed(3);calculate();
}
function applyFloorBuilder(){
  if($('floorType').value!=='exterior')$('floorType').value='exterior';
  syncFloor();
  const c=layerCalc('floor');$('floorU').value=c.u.toFixed(3);calculate();
}
function updateFloorBuilderAvailability(){
  const ground=$('floorType').value==='ground';
  const adiabatic=$('floorType').value==='adiabatic';
  $('floorGroundWarning').classList.toggle('active',ground||adiabatic);
  $('floorGroundWarning').innerHTML=ground
    ? '<b>Piso contra terreno:</b> el Manual CEV lo calcula con base en NCh3117. No uses el U de este constructor de piso ventilado; ingresa un U equivalente respaldado en el módulo madre.'
    : adiabatic
      ? '<b>Piso adiabático:</b> al colindar con un recinto acondicionado, HIDROLAB considera flujo térmico 0.'
      : '<b>Piso ventilado:</b> este constructor puede calcular un U homogéneo por capas con Rsi 0,17 y Rse 0,04 m²K/W.';
}

/* ---------- heat loss mother module ---------- */
function calculate(){
  const g=geometry(),Ti=num('ti',20),Te=num('te',5),dT=Math.abs(Ti-Te);
  syncRoofArea(g);syncFloor();const floorA=syncFloorArea(g);syncBridgeUI();
  const winA=num('windowArea',12,0),doorA=num('doorArea',4,0);
  const wallA=Math.max(0,g.grossWalls-winA-doorA);
  const wallU=num('wallU',.60,.01),winU=num('windowU',2.8,.01),doorU=num('doorU',2.2,.01);
  const roofA=num('roofArea',g.roof,0),roofU=num('roofU',.45,.01);
  const floorType=$('floorType').value,floorU=num('floorU',.60,.01),ach=achValue(),bridgeH=bridgeCoefficient();

  const wallLoss=wallU*wallA*dT,windowLoss=winU*winA*dT,doorLoss=doorU*doorA*dT;
  const roofLoss=roofU*roofA*dT,floorLoss=floorType==='adiabatic'?0:floorU*floorA*dT;
  const airLoss=.33*ach*g.volume*dT,bridgeLoss=bridgeH*dT;
  const transmission=wallLoss+windowLoss+doorLoss+roofLoss+floorLoss,total=transmission+airLoss+bridgeLoss,totalSafe=Math.max(total,1);

  const parts=[
    {id:'walls',name:'Muros',loss:wallLoss},{id:'windows',name:'Ventanas',loss:windowLoss},
    {id:'roof',name:'Techumbre',loss:roofLoss},{id:'floor',name:'Piso',loss:floorLoss},
    {id:'air',name:'Ventilación / infiltración',loss:airLoss},{id:'doors',name:'Puertas',loss:doorLoss},
    {id:'bridges',name:'Puentes térmicos',loss:bridgeLoss}
  ].sort((a,b)=>b.loss-a.loss);

  $('deltaTOut').textContent=fmt(dT,1);$('usefulAreaOut').textContent=fmt(g.useful,1);$('footprintOut').textContent=fmt(g.footprint,1);
  $('volumeOut').textContent=fmt(g.volume,1);$('grossWallOut').textContent=fmt(g.grossWalls,1);
  $('wallArea').textContent=fmt(wallA,1)+' m²';
  $('wallGrossHelp').textContent=`${fmt(g.grossWalls,1)} m² verticales brutos − ${fmt(winA+doorA,1)} m² de vanos`;
  $('wallLoss').textContent=fmt(wallLoss,0);$('windowLoss').textContent=fmt(windowLoss,0);$('doorLoss').textContent=fmt(doorLoss,0);
  $('roofLoss').textContent=fmt(roofLoss,0);$('floorLoss').textContent=fmt(floorLoss,0);$('airLoss').textContent=fmt(airLoss,0);
  $('bridgeLoss').textContent=fmt(bridgeLoss,0)+' W';$('bridgeHOut').textContent=fmt(bridgeH,2)+' W/K';
  if($('bridgeEnabled').checked){
    $('bridgeCalcText').textContent=$('bridgeMode').value==='assistant'
      ? `${fmt(num('bridgeLength',0),1)} m × ${fmt(num('bridgePsi',.10),2)} W/m·K`
      : 'Valor ΣψL ingresado directamente';
  }else $('bridgeCalcText').textContent='Puentes térmicos desactivados';
  $('bridgeStatus').textContent=bridgeH>0?`Añaden ${fmt(bridgeLoss,0)} W con ΔT ${fmt(dT,1)} °C`:'No considerados';
  $('airFormula').textContent=`0,33 × ${fmt(ach,2)} × ${fmt(g.volume,0)} × ${fmt(dT,1)}`;

  $('kw').textContent=fmt(total/1000,2);$('total').textContent=fmt(total,0)+' W';
  $('specific').textContent=fmt(g.useful?total/g.useful:0,1)+' W/m²';$('trans').textContent=fmt(transmission,0)+' W';
  $('otherLoss').textContent=fmt(airLoss+bridgeLoss,0)+' W';
  $('resultSentence').textContent=`Para mantener ${fmt(Ti,1)} °C con ${fmt(Te,1)} °C exterior, la vivienda pierde aproximadamente ${fmt(total/1000,2)} kW en estas condiciones.`;

  const max=Math.max(...parts.map(p=>p.loss),1);
  $('lossRanking').innerHTML=parts.map((p,i)=>`<div class="heat-rank-row"><span class="rank">${i+1}</span><div><b>${p.name}</b><small>${fmt(p.loss/totalSafe*100,0)}% del total</small></div><div class="heat-rank-track"><i style="width:${p.loss/max*100}%"></i></div><strong>${fmt(p.loss,0)} W</strong></div>`).join('');
  const dom=parts.find(p=>p.loss>0)||parts[0];
  $('dominantAdvice').innerHTML=`<b>Prioridad: ${dom.name}</b><span>Concentra aproximadamente ${fmt(dom.loss/totalSafe*100,0)}% de la pérdida instantánea calculada.</span>`;
  const ids={walls:'hmWalls',windows:'hmWindows',roof:'hmRoof',floor:'hmFloor',air:'hmAir',doors:'hmDoors',bridges:'hmBridges'};
  parts.forEach(p=>{const o=$(ids[p.id]);if(o)o.textContent=fmt(p.loss/totalSafe*100,0)+'%'});

  renderImprovements({g,dT,wallA,wallU,winA,winU,roofA,roofU,ach,total});
  window.__heatloss={Ti,Te,dT,g,wallA,winA,doorA,roofA,floorArea:floorA,wallU,winU,doorU,roofU,floorType,floorU,ach,bridgeH,
    wallLoss,windowLoss,doorLoss,roofLoss,floorLoss,airLoss,bridgeLoss,transmission,total,parts,
    windowSource:$('windowSource').textContent,doorSource:$('doorSource').textContent};
}

function renderImprovements(c){
  const wallTarget=num('improveWallU',.40,.01),winTarget=num('improveWindowU',1.8,.01),roofTarget=num('improveRoofU',.30,.01),achTarget=num('improveAch',.30,0);
  const opts=[
    {name:'Mejorar muros',save:Math.max(0,(c.wallU-wallTarget)*c.wallA*c.dT),note:`U ${fmt(c.wallU,2)} → ${fmt(wallTarget,2)}`},
    {name:'Mejorar ventanas',save:Math.max(0,(c.winU-winTarget)*c.winA*c.dT),note:`U ${fmt(c.winU,2)} → ${fmt(winTarget,2)}`},
    {name:'Mejorar techumbre',save:Math.max(0,(c.roofU-roofTarget)*c.roofA*c.dT),note:`U ${fmt(c.roofU,2)} → ${fmt(roofTarget,2)}`},
    {name:'Reducir infiltración',save:Math.max(0,.33*(c.ach-achTarget)*c.g.volume*c.dT),note:`${fmt(c.ach,2)} → ${fmt(achTarget,2)} ACH`}
  ].sort((a,b)=>b.save-a.save);
  const mx=Math.max(...opts.map(o=>o.save),1);
  $('improvementRanking').innerHTML=opts.map((o,i)=>`<div class="improvement-row ${i===0&&o.save>0?'best':''}"><div><small>${i===0&&o.save>0?'MAYOR IMPACTO ESTIMADO':''}</small><b>${o.name}</b><span>${o.note}</span></div><div class="improvement-track"><i style="width:${o.save/mx*100}%"></i></div><strong>−${fmt(o.save,0)} W</strong></div>`).join('');
}
function syncImprovementPreset(selectId,inputId){
  const sel=$(selectId),inp=$(inputId),custom=sel.value==='custom';inp.disabled=!custom;if(!custom)inp.value=sel.value;
}

function bind(){
  renderDimRows('window');renderDimRows('door');updateBuilder('window');updateBuilder('door');
  renderLayers('roof');renderLayers('floor');updateLayerCalc('roof');updateLayerCalc('floor');

  $('addWindowRow').addEventListener('click',()=>{state.windowRows.push({name:`V${state.windowRows.length+1}`,w:120,h:100,q:1});renderDimRows('window');updateBuilder('window')});
  $('addDoorRow').addEventListener('click',()=>{state.doorRows.push({name:`P${state.doorRows.length+1}`,w:90,h:210,q:1});renderDimRows('door');updateBuilder('door')});
  $('winUnit').addEventListener('change',()=>{renderDimRows('window');updateBuilder('window')});
  $('doorUnit').addEventListener('change',()=>{renderDimRows('door');updateBuilder('door')});
  $('winFrame').addEventListener('change',()=>updateBuilder('window'));$('winGlass').addEventListener('change',()=>updateBuilder('window'));
  $('doorPreset').addEventListener('change',()=>updateBuilder('door'));$('doorCustomU').addEventListener('input',()=>updateBuilder('door'));
  $('applyWindows').addEventListener('click',applyWindowBuilder);$('applyDoors').addEventListener('click',applyDoorBuilder);

  $('addRoofLayer').addEventListener('click',()=>{state.roofLayers.push({mat:'custom',mm:10,lambdaCustom:.10});renderLayers('roof');updateLayerCalc('roof')});
  $('addFloorLayer').addEventListener('click',()=>{state.floorLayers.push({mat:'custom',mm:10,lambdaCustom:.10});renderLayers('floor');updateLayerCalc('floor')});
  $('applyRoof').addEventListener('click',applyRoofBuilder);$('applyFloor').addEventListener('click',applyFloorBuilder);

  [['improveWallPreset','improveWallU'],['improveWindowPreset','improveWindowU'],['improveRoofPreset','improveRoofU'],['improveAchPreset','improveAch']].forEach(([sel,inp])=>{
    syncImprovementPreset(sel,inp);$(sel).addEventListener('change',()=>{syncImprovementPreset(sel,inp);calculate()});
  });

  const ids=['ti','te','length','width','height','levels','wallU','windowArea','windowU','doorArea','doorU','roofArea','roofU','floorAreaInput','floorU','ach','bridgeLength','bridgePsi','bridgeH','improveWallU','improveWindowU','improveRoofU','improveAch'];
  ids.forEach(id=>$(id)?.addEventListener('input',calculate));
  $('roofManual').addEventListener('change',calculate);$('floorManual').addEventListener('change',calculate);
  $('floorType').addEventListener('change',calculate);$('airMode').addEventListener('change',calculate);
  $('bridgeEnabled').addEventListener('change',calculate);$('bridgeMode').addEventListener('change',calculate);
  calculate();
}
window.addEventListener('DOMContentLoaded',bind);

window.HIDROLAB_HEATLOSS_REPORT=()=>window.__heatloss?{
  title:'Pérdidas térmicas de la vivienda',
  conditions:{Ti:window.__heatloss.Ti,Te:window.__heatloss.Te,dT:window.__heatloss.dT,volume:window.__heatloss.g.volume,floorArea:window.__heatloss.g.useful,footprint:window.__heatloss.g.footprint,grossWalls:window.__heatloss.g.grossWalls},
  wall:{layers:[],Rt:null,U:window.__heatloss.wallU,area:window.__heatloss.wallA,loss:window.__heatloss.wallLoss,source:'U ingresado directamente por usuario'},
  inputs:{windowArea:window.__heatloss.winA,windowU:window.__heatloss.winU,windowType:window.__heatloss.windowSource,
    doorArea:window.__heatloss.doorA,doorU:window.__heatloss.doorU,doorType:window.__heatloss.doorSource,
    roofArea:window.__heatloss.roofA,roofU:window.__heatloss.roofU,floorArea:window.__heatloss.floorArea,floorType:window.__heatloss.floorType,floorU:window.__heatloss.floorU,bridgeH:window.__heatloss.bridgeH},
  elements:window.__heatloss.parts,total:window.__heatloss.total,transmission:window.__heatloss.transmission,airLoss:window.__heatloss.airLoss,bridgeLoss:window.__heatloss.bridgeLoss,ach:window.__heatloss.ach
}:null;
