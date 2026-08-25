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
  mono:{name:'Monolítico',u:5.80},
  dvhUnknown:{name:'DVH <6 mm / sin dato',u:3.58},
  dvh6:{name:'DVH 6 mm',u:3.28},
  dvh9:{name:'DVH 9 mm',u:3.01},
  dvh12:{name:'DVH 12 mm',u:2.85},
  dvh15:{name:'DVH 15 mm',u:2.80}
};
const DOOR_PRESETS={
  solid0:{name:'Madera sólida · opaca',leafU:1.70,glass:0,glassU:5.80,frameU:1.70,frame:.0878},
  solid40:{name:'Madera sólida · 40% vidrio',leafU:1.70,glass:.40,glassU:5.80,frameU:1.70,frame:.0878},
  solid85:{name:'Madera sólida · 85% vidrio',leafU:1.70,glass:.85,glassU:5.80,frameU:1.70,frame:.0878},
  panel0:{name:'Madera entablerada · opaca',leafU:2.63,glass:0,glassU:5.80,frameU:1.25,frame:.0878},
  panel45:{name:'Madera entablerada · 45% vidrio',leafU:2.53,glass:.45,glassU:5.80,frameU:1.25,frame:.0878},
  panel85:{name:'Madera entablerada · 85% vidrio',leafU:2.18,glass:.85,glassU:5.80,frameU:1.25,frame:.0878},
  custom:{name:'U personalizado',custom:true}
};

/* Biblioteca ampliada a partir de fuentes MINVU / LOSCAT.
   No se asigna resistencia térmica a membranas o terminaciones cuando
   no existe un valor térmico respaldado apropiado. */
const MATERIALS={
  gypsum870:{group:'Placas y revestimientos',name:'Yeso cartón 870 kg/m³',lambda:.31,defaultMm:10,source:'Informe MINVU 1007 · NCh853'},
  gypsum650:{group:'Placas y revestimientos',name:'Yeso cartón 650 kg/m³',lambda:.24,defaultMm:10,source:'Listado térmico MINVU · NCh853'},
  osb600:{group:'Placas y revestimientos',name:'OSB 600 kg/m³',lambda:.103,defaultMm:9.5,source:'Listado térmico MINVU · NCh853'},
  osb690:{group:'Placas y revestimientos',name:'OSB 690 kg/m³',lambda:.106,defaultMm:11.1,source:'Informe MINVU 1007 · NCh853'},
  pine:{group:'Maderas',name:'Madera / pino genérico',lambda:.15,defaultMm:19,source:'Manual Construcción +PDA MINVU · referencia NCh853'},
  concrete2400:{group:'Hormigones',name:'Hormigón armado normal 2400 kg/m³',lambda:1.63,defaultMm:100,source:'MINVU · Anexo materiales / NCh853'},
  concreteLight1000:{group:'Hormigones',name:'Hormigón áridos ligeros 1000 kg/m³',lambda:.33,defaultMm:100,source:'MINVU · Anexo materiales'},
  concreteLight1400:{group:'Hormigones',name:'Hormigón áridos ligeros 1400 kg/m³',lambda:.55,defaultMm:100,source:'MINVU · Anexo materiales'},
  cellular600:{group:'Hormigones',name:'Hormigón celular silíceo 600 kg/m³',lambda:.34,defaultMm:100,source:'MINVU · Anexo materiales'},
  cellular1000:{group:'Hormigones',name:'Hormigón celular silíceo 1000 kg/m³',lambda:.67,defaultMm:100,source:'MINVU · Anexo materiales'},
  mass1600:{group:'Hormigones',name:'Hormigón en masa 1600 kg/m³',lambda:.73,defaultMm:100,source:'MINVU · Anexo materiales'},
  mass2000:{group:'Hormigones',name:'Hormigón en masa 2000 kg/m³',lambda:1.16,defaultMm:100,source:'MINVU · Anexo materiales'},
  glass13:{group:'Aislantes LOSCAT',name:'Lana vidrio AISLHOGAR 13 kg/m³',lambda:.041,defaultMm:80,source:'LOSCAT E14 2026 · R100/LV.1.1'},
  glass11:{group:'Aislantes LOSCAT',name:'Lana vidrio AISLANGLASS 11 kg/m³',lambda:.042,defaultMm:80,source:'LOSCAT E14 2026 · R100/LV.2.1'},
  glass14:{group:'Aislantes LOSCAT',name:'Lana vidrio AISLANGLASS 14 kg/m³',lambda:.040,defaultMm:80,source:'LOSCAT E14 2026 · R100/LV.2.2'},
  glass32:{group:'Aislantes LOSCAT',name:'Lana vidrio AISLANGLASS 32 kg/m³',lambda:.036,defaultMm:80,source:'LOSCAT E14 2026 · R100/LV.2.3'},
  mineral40:{group:'Aislantes LOSCAT',name:'Lana mineral 40 kg/m³',lambda:.042,defaultMm:80,source:'LOSCAT E14 2026 · solución acreditada'},
  eps15:{group:'Aislantes LOSCAT',name:'EPS 15 kg/m³',lambda:.0413,defaultMm:50,source:'LOSCAT E14 2026 · R100/PE'},
  eps20:{group:'Aislantes LOSCAT',name:'EPS 20 kg/m³',lambda:.0384,defaultMm:50,source:'LOSCAT E14 2026 · R100/PE.7.3'},
  eps30:{group:'Aislantes LOSCAT',name:'EPS 30 kg/m³',lambda:.0361,defaultMm:50,source:'LOSCAT E14 2026 · R100/PE.7.4'},
  xps:{group:'Aislantes LOSCAT',name:'XPS Foamular 250 · 24,8 kg/m³',lambda:.028,defaultMm:50.8,source:'LOSCAT E14 2026 · R100/PX.1.1'},
  pu:{group:'Aislantes LOSCAT',name:'Poliuretano proyectado celda cerrada 29 kg/m³',lambda:.027,defaultMm:50,source:'LOSCAT E14 2026 · R100/PU.3.1'},
  tyvek:{group:'Membranas',name:'Membrana hidrófuga Tyvek Homewrap',lambda:.011,defaultMm:.2,source:'Listado térmico MINVU · ensayo IDIEM'},
  vapor:{group:'Membranas',name:'Barrera de vapor / polietileno',fixedR:0,defaultMm:.2,source:'Sin crédito térmico automático'},
  membrane:{group:'Membranas',name:'Membrana hidrófuga genérica',fixedR:0,defaultMm:.5,source:'Sin crédito térmico automático'},
  zinc:{group:'Cubiertas',name:'Cubierta de zinc',fixedR:0,defaultMm:.5,source:'Sin crédito térmico automático en HIDROLAB'},
  shingle:{group:'Cubiertas',name:'Teja asfáltica',fixedR:0,defaultMm:6,source:'Usar dato declarado si se desea considerar térmicamente'},
  ceramicTile:{group:'Cubiertas',name:'Teja cerámica',fixedR:0,defaultMm:15,source:'Usar dato declarado si se desea considerar térmicamente'},
  gravel:{group:'Pisos / radier',name:'Gravilla / base granular',lambdaCustom:1.50,defaultMm:100,source:'Valor editable por usuario; verificar material real'},
  polyethylene:{group:'Pisos / radier',name:'Polietileno',fixedR:0,defaultMm:.2,source:'Barrera de humedad · sin crédito térmico automático'},
  screed:{group:'Pisos / radier',name:'Mortero / sobrelosa',lambdaCustom:1.00,defaultMm:40,source:'Valor editable por usuario'},
  floatingFloor:{group:'Pisos / radier',name:'Piso flotante / terminación',lambdaCustom:.15,defaultMm:8,source:'Valor editable según producto'},
  custom:{group:'Personalizado',name:'Material personalizado',lambdaCustom:.10,defaultMm:10,source:'Valor ingresado por usuario'}
};

const state={
  windowRows:[
    {name:'V1',w:120,h:100,q:1,frame:'pvc',glass:'dvh15'},
    {name:'V2',w:150,h:120,q:1,frame:'aluRpt',glass:'dvh12'}
  ],
  doorRows:[
    {name:'P1',w:90,h:210,q:1,preset:'solid0',customU:2.2}
  ],
  roofLayers:[
    {mat:'gypsum870',mm:10},{mat:'vapor',mm:.2},{mat:'glass14',mm:80},
    {mat:'osb690',mm:11.1},{mat:'membrane',mm:.5},{mat:'zinc',mm:.5}
  ],
  floorLayers:[
    {mat:'osb690',mm:18},{mat:'glass14',mm:80},{mat:'osb690',mm:11.1}
  ],
  energyPeriods:[
    {start:'19:00',end:'07:00',ti:20,te:7}
  ],
  improvementBackup:null,
  improvementApplied:null,
  improvementReference:null
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
function cevMinimumVentilationAch(g){
  const bedrooms=Math.round(num('bedrooms',3,0,20));
  const np=bedrooms+1;
  // Manual CEV 2025, Anexo D, Ecuación 16:
  // Fmin = (0.3*AV + 2.5*NP)*3.6 / VV  [Ren/h]
  return g.volume>0?((.3*g.useful+2.5*np)*3.6/g.volume):0;
}

/* HIDROLAB V8.9.7 · helpers geométricos requeridos por cálculo principal */
function wallGrossArea(g){
  const manual=$('wallGrossManual')?.checked;
  $('wallGrossManualWrap')?.classList.toggle('hl2-hidden',!manual);
  if(manual){
    const fallback=g?.grossWalls||0;
    const el=$('wallGrossAreaInput');
    if(el && (!el.value || Number(el.value)<=0)) el.value=fallback.toFixed(2);
    return num('wallGrossAreaInput',fallback,0);
  }
  return g?.grossWalls||0;
}

function groundPerimeter(g){
  const auto=2*((g?.L||0)+(g?.W||0));
  const manual=$('groundPerimeterManual')?.checked;
  if($('groundPerimeter')) $('groundPerimeter').readOnly=!manual;
  if(!manual && $('groundPerimeter')) $('groundPerimeter').value=auto.toFixed(2);
  return num('groundPerimeter',auto,0);
}

function thermalDirection(Ti,Te){
  if(Ti>Te)return 'out';
  if(Ti<Te)return 'in';
  return 'zero';
}

function achValue(g=geometry()){
  const mode=$('airMode').value;
  const known=mode==='known';

  $('airKnownFields')?.classList.toggle('hl2-hidden',!known);
  $('airCevFields')?.classList.toggle('hl2-hidden',known);

  if(known){
    const total=num('ach',.50,0,10);
    return {total,vent:null,infiltration:null,mode};
  }

  const vent=cevMinimumVentilationAch(g);
  const infiltration=num('infiltrationAch',.20,0,10);
  const total=vent+infiltration;

  if($('cevVentAchOut')) $('cevVentAchOut').textContent=fmt(vent,2)+' ACH';
  if($('cevInfiltrationOut')) $('cevInfiltrationOut').textContent=fmt(infiltration,2)+' ACH';
  if($('cevTotalAchOut')) $('cevTotalAchOut').textContent=fmt(total,2)+' ACH';
  if($('cevVentHelp')){
    const bedrooms=Math.round(num('bedrooms',3,0,20));
    $('cevVentHelp').textContent=`CEV: superficie útil ${fmt(g.useful,1)} m² · volumen ${fmt(g.volume,1)} m³ · personas consideradas ${bedrooms+1}.`;
  }

  return {total,vent,infiltration,mode};
}
function syncRoofArea(g){
  const manual=$('roofManual').checked;
  $('roofArea').readOnly=!manual;
  if(!manual)$('roofArea').value=g.roof.toFixed(2);
  $('roofModeHelp').textContent=manual?'Área térmica definida manualmente':'Área automática = huella horizontal de la vivienda';
}
function syncFloor(){
  const type=$('floorType').value;
  const adiabatic=type==='adiabatic';
  const ground=type==='ground';
  $('floorVentilatedFields')?.classList.toggle('hl2-hidden',ground||adiabatic);
  $('floorGroundFields')?.classList.toggle('hl2-hidden',!ground);
  $('floorUWrap').classList.toggle('hl2-disabled',adiabatic);
  $('floorU').disabled=adiabatic||ground;
  if(type==='ground'){
    $('floorMethodNote').textContent='Piso contra terreno: pérdida lineal Ls·P·ΔT según enfoque NCh3117/CEV.';
  }else if(type==='adiabatic'){
    $('floorMethodNote').textContent='Recinto acondicionado contiguo: flujo térmico considerado 0.';
  }else{
    $('floorMethodNote').textContent='Piso ventilado: Φ = U·A·ΔT.';
  }
  updateFloorBuilderAvailability();
}function syncFloorArea(g){
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
function windowRowU(row){
  const f=WINDOW_FRAMES[row.frame]||WINDOW_FRAMES.pvc;
  const g=WINDOW_GLASSES[row.glass]||WINDOW_GLASSES.dvh15;
  return g.u*f.glassFrac+f.u*(1-f.glassFrac);
}
function doorRowU(row){
  if(row.preset==='custom')return Math.max(.1,Number(row.customU)||2.2);
  const p=DOOR_PRESETS[row.preset]||DOOR_PRESETS.solid0;
  const leaf=Math.max(0,1-p.glass-p.frame);
  return leaf*p.leafU+p.glass*p.glassU+p.frame*p.frameU;
}
function frameOptions(v){
  return Object.entries(WINDOW_FRAMES).map(([k,x])=>`<option value="${k}" ${k===v?'selected':''}>${x.name}</option>`).join('');
}
function glassOptions(v){
  return Object.entries(WINDOW_GLASSES).map(([k,x])=>`<option value="${k}" ${k===v?'selected':''}>${x.name}</option>`).join('');
}
function doorOptions(v){
  return Object.entries(DOOR_PRESETS).map(([k,x])=>`<option value="${k}" ${k===v?'selected':''}>${x.name}</option>`).join('');
}

function renderDimRows(kind){
  const isWin=kind==='window';
  const rows=isWin?state.windowRows:state.doorRows;
  const unit=$(isWin?'winUnit':'doorUnit').value;
  const root=$(isWin?'windowDimensionRows':'doorDimensionRows');

  if(isWin){
    root.innerHTML=rows.map((r,i)=>`
      <div class="hl2-window-row" data-index="${i}">
        <input data-k="name" value="${r.name}" aria-label="Nombre">
        <input data-k="w" inputmode="decimal" type="number" min="0" step="${unit==='cm'?1:.01}" value="${r.w}" aria-label="Ancho">
        <input data-k="h" inputmode="decimal" type="number" min="0" step="${unit==='cm'?1:.01}" value="${r.h}" aria-label="Alto">
        <input data-k="q" inputmode="numeric" type="number" min="1" step="1" value="${r.q}" aria-label="Cantidad">
        <select data-k="frame">${frameOptions(r.frame)}</select>
        <select data-k="glass">${glassOptions(r.glass)}</select>
        <strong data-u>${fmt(windowRowU(r),2)}</strong>
        <strong data-subtotal>${fmt(dimArea(r,unit),2)}</strong>
        <button type="button" data-remove="${i}" aria-label="Eliminar">×</button>
      </div>`).join('');
  }else{
    root.innerHTML=rows.map((r,i)=>`
      <div class="hl2-door-row" data-index="${i}">
        <input data-k="name" value="${r.name}" aria-label="Nombre">
        <input data-k="w" inputmode="decimal" type="number" min="0" step="${unit==='cm'?1:.01}" value="${r.w}" aria-label="Ancho">
        <input data-k="h" inputmode="decimal" type="number" min="0" step="${unit==='cm'?1:.01}" value="${r.h}" aria-label="Alto">
        <input data-k="q" inputmode="numeric" type="number" min="1" step="1" value="${r.q}" aria-label="Cantidad">
        <div class="hl2-door-type-cell">
          <select data-k="preset">${doorOptions(r.preset)}</select>
          ${r.preset==='custom'?`<input data-k="customU" type="number" min=".1" step=".01" value="${r.customU||2.2}" aria-label="U personalizado">`:''}
        </div>
        <strong data-u>${fmt(doorRowU(r),2)}</strong>
        <strong data-subtotal>${fmt(dimArea(r,unit),2)}</strong>
        <button type="button" data-remove="${i}" aria-label="Eliminar">×</button>
      </div>`).join('');
  }

  root.querySelectorAll('input,select').forEach(el=>{
    const eventName=el.tagName==='SELECT'?'change':'input';
    el.addEventListener(eventName,e=>{
      const row=e.target.closest(isWin?'.hl2-window-row':'.hl2-door-row');
      const i=Number(row.dataset.index),k=e.target.dataset.k;
      if(k==='name'||k==='frame'||k==='glass'||k==='preset')rows[i][k]=e.target.value;
      else rows[i][k]=e.target.value===''?0:Number(e.target.value);

      // A change of door preset alters row structure only when custom input appears/disappears.
      if(!isWin && k==='preset'){
        renderDimRows(kind);
      }else{
        const subtotal=row.querySelector('[data-subtotal]');
        const uout=row.querySelector('[data-u]');
        if(subtotal)subtotal.textContent=fmt(dimArea(rows[i],unit),2);
        if(uout)uout.textContent=fmt(isWin?windowRowU(rows[i]):doorRowU(rows[i]),2);
      }
      updateBuilderSummary(kind);
    });
    if(el.tagName==='INPUT'){
      el.addEventListener('change',e=>{
        const row=e.target.closest(isWin?'.hl2-window-row':'.hl2-door-row');
        const i=Number(row.dataset.index),k=e.target.dataset.k;
        if(k==='q'){rows[i][k]=Math.max(1,Math.round(Number(e.target.value)||1));e.target.value=rows[i][k]}
        else if(k!=='name'){rows[i][k]=Math.max(0,Number(e.target.value)||0);e.target.value=rows[i][k]}
        updateBuilderSummary(kind);
      });
    }
  });

  root.querySelectorAll('[data-remove]').forEach(btn=>btn.addEventListener('click',()=>{
    rows.splice(Number(btn.dataset.remove),1);
    renderDimRows(kind);
    updateBuilderSummary(kind);
  }));
}
function builderWeighted(kind){
  const isWin=kind==='window',rows=isWin?state.windowRows:state.doorRows,unit=$(isWin?'winUnit':'doorUnit').value;
  let area=0,ua=0;
  rows.forEach(r=>{
    const a=dimArea(r,unit),u=isWin?windowRowU(r):doorRowU(r);
    area+=a;ua+=a*u;
  });
  return {area,u:area>0?ua/area:0};
}
function updateBuilderSummary(kind){
  const x=builderWeighted(kind);
  if(kind==='window'){
    $('winCalcArea').textContent=fmt(x.area,2)+' m²';
    $('winCalcU').textContent=fmt(x.u,2)+' W/m²K';
  }else{
    $('doorCalcArea').textContent=fmt(x.area,2)+' m²';
    $('doorCalcU').textContent=fmt(x.u,2)+' W/m²K';
  }
}
function updateBuilder(kind){updateBuilderSummary(kind)}
function applyWindowBuilder(){
  const x=builderWeighted('window');
  $('windowArea').value=x.area.toFixed(2);$('windowU').value=x.u.toFixed(3);
  $('windowSource').textContent=`U ponderado por ${state.windowRows.length} tipo(s) de ventana calculados con valores por defecto CEV.`;
  calculate();
}
function applyDoorBuilder(){
  const x=builderWeighted('door');
  $('doorArea').value=x.area.toFixed(2);$('doorU').value=x.u.toFixed(3);
  $('doorSource').textContent=`U ponderado por ${state.doorRows.length} tipo(s) de puerta. Presets CEV y/o U personalizados.`;
  calculate();
}

/* ---------- layers builders ---------- */
function materialOptions(selected){
  const groups={};
  Object.entries(MATERIALS).forEach(([k,m])=>{
    (groups[m.group||'Otros']??=[]).push([k,m]);
  });
  return Object.entries(groups).map(([g,items])=>`<optgroup label="${g}">${items.map(([k,m])=>`<option value="${k}" ${k===selected?'selected':''}>${m.name}</option>`).join('')}</optgroup>`).join('');
}
function materialLambda(layer){
  const m=MATERIALS[layer.mat];
  if(layer.lambdaCustom!==undefined)return Number(layer.lambdaCustom)||0;
  if(m.lambdaCustom!==undefined)return Number(m.lambdaCustom)||0;
  return Number(m.lambda)||0;
}
function layerR(layer){
  const m=MATERIALS[layer.mat];
  if(m.fixedR!==undefined)return m.fixedR;
  const lambda=materialLambda(layer);
  return lambda>0?(layer.mm/1000)/lambda:0;
}
function renderLayers(kind){
  const rows=kind==='roof'?state.roofLayers:state.floorLayers;
  const root=$(kind==='roof'?'roofLayers':'floorLayers');
  root.innerHTML=rows.map((r,i)=>{
    const m=MATERIALS[r.mat],lambda=materialLambda(r);
    return `<div class="hl2-layer-row" data-kind="${kind}" data-index="${i}">
      <select data-k="mat">${materialOptions(r.mat)}</select>
      <input data-k="mm" type="number" min="0" step=".1" value="${r.mm}">
      <input data-k="lambda" type="number" min=".001" step=".001" value="${lambda}" ${(MATERIALS[r.mat].lambdaCustom!==undefined||r.mat==='custom'||r.mat==='gravel'||r.mat==='screed'||r.mat==='floatingFloor')?'':'readonly'}>
      <strong>${fmt(layerR(r),3)}</strong>
      <button type="button" data-remove="${i}">×</button>
      <small>${m.source}</small>
    </div>`;
  }).join('');
  root.querySelectorAll('select[data-k="mat"]').forEach(el=>el.addEventListener('change',e=>{
    const row=e.target.closest('.hl2-layer-row'),i=Number(row.dataset.index),mat=e.target.value;
    rows[i]={mat,mm:MATERIALS[mat].defaultMm,lambdaCustom:MATERIALS[mat].lambdaCustom!==undefined?MATERIALS[mat].lambdaCustom:(mat==='custom'?.10:undefined)};
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
  let rsi,rse;
  if(kind==='roof'){rsi=.10;rse=.04}
  else if(floorBuilderMode()==='ground'){rsi=.17;rse=0}
  else {rsi=.17;rse=.04}
  const rt=rsi+rLayers+rse,u=rt>0?1/rt:0;
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
function floorBuilderMode(){
  return document.querySelector('input[name="floorBuilderMode"]:checked')?.value||'ventilated';
}
function loadSlabPreset(){
  state.floorLayers=[
    {mat:'floatingFloor',mm:8,lambdaCustom:.15},
    {mat:'screed',mm:40,lambdaCustom:1.00},
    {mat:'concrete2400',mm:100},
    {mat:'polyethylene',mm:.2},
    {mat:'eps20',mm:50},
    {mat:'gravel',mm:100,lambdaCustom:1.50}
  ];
  document.querySelector('input[name="floorBuilderMode"][value="ground"]').checked=true;
  renderLayers('floor');updateLayerCalc('floor');updateFloorBuilderAvailability();
}
function applyFloorBuilder(){
  const mode=floorBuilderMode(),c=layerCalc('floor');
  if(mode==='ground'){
    $('floorBuilderNotice').innerHTML='<b>No aplicado:</b> el U 1D de capas no sustituye la pérdida lineal Ls calculada según NCh3117. Usa este constructor solo para estudiar la resistencia de las capas y luego ingresa el Ls obtenido mediante el método correspondiente.';
    return;
  }
  $('floorType').value='exterior';
  $('floorU').value=c.u.toFixed(3);
  syncFloor();calculate();
}
function updateFloorBuilderAvailability(){
  const motherType=$('floorType').value;
  const mode=floorBuilderMode();
  $('groundApplyOptions')?.classList.toggle('hl2-hidden',mode!=='ground');
  $('floorLayerTitle').textContent=mode==='ground'?'Capas del radier aislado':'Capas del piso ventilado';
  $('floorUCalcLabel').textContent=mode==='ground'?'U 1D de capas':'U calculado';
  if(mode==='ground'){
    $('floorBuilderNotice').innerHTML='<b>Radier sobre terreno:</b> las capas permiten estudiar la resistencia de la solución, pero la transmisión real al terreno debe evaluarse con NCh3117. El U mostrado es 1D y no se aplica automáticamente.';
  }else{
    $('floorBuilderNotice').innerHTML='<b>Piso ventilado:</b> el U puede calcularse por capas homogéneas según NCh853, con las resistencias superficiales correspondientes.';
  }
}

/* ---------- hourly energy simulator ---------- */
function timeHours(start,end){
  const [sh,sm]=start.split(':').map(Number),[eh,em]=end.split(':').map(Number);
  let a=sh+sm/60,b=eh+em/60;
  if(b<=a)b+=24;
  return b-a;
}
function heatLossCoefficient(){
  const g=geometry(),winA=num('windowArea',0,0),doorA=num('doorArea',0,0);
  const gross=wallGrossArea(g),wallA=Math.max(0,gross-winA-doorA);
  const floorA=syncFloorArea(g);
  let H=num('wallU',0,0)*wallA+num('windowU',0,0)*winA+num('doorU',0,0)*doorA;
  H+=num('roofU',0,0)*num('roofArea',g.roof,0);
  const floorType=$('floorType').value;
  if(floorType==='exterior')H+=num('floorU',0,0)*floorA;
  if(floorType==='ground')H+=num('floorLs',0,0)*groundPerimeter(g);
  H+=.33*achValue(g).total*g.volume;
  H+=bridgeCoefficient();
  return H;
}
function renderEnergyPeriods(){
  const root=$('energyPeriods');
  root.innerHTML=state.energyPeriods.map((r,i)=>`
    <div class="hl2-period-row" data-index="${i}">
      <input data-k="start" type="time" value="${r.start}">
      <input data-k="end" type="time" value="${r.end}">
      <input data-k="ti" type="number" step=".5" value="${r.ti}">
      <input data-k="te" type="number" step=".5" value="${r.te}">
      <strong data-hours>— h</strong>
      <strong data-energy>— kWh</strong>
      <button type="button" data-remove="${i}">×</button>
    </div>`).join('');
  root.querySelectorAll('input').forEach(el=>el.addEventListener('input',e=>{
    const row=e.target.closest('.hl2-period-row'),i=Number(row.dataset.index),k=e.target.dataset.k;
    state.energyPeriods[i][k]=(k==='start'||k==='end')?e.target.value:Number(e.target.value||0);
    updateEnergySimulator();
  }));
  root.querySelectorAll('[data-remove]').forEach(btn=>btn.addEventListener('click',()=>{
    state.energyPeriods.splice(Number(btn.dataset.remove),1);renderEnergyPeriods();updateEnergySimulator();
  }));
  updateEnergySimulator();
}
function updateEnergySimulator(){
  if(!$('energyPeriods'))return;
  const H=heatLossCoefficient();
  let totalHours=0,heatingKwh=0,coolingKwh=0,absKwh=0;
  document.querySelectorAll('.hl2-period-row').forEach((el,i)=>{
    const r=state.energyPeriods[i],hours=timeHours(r.start,r.end);
    const signedDT=r.ti-r.te;
    const kwh=H*Math.abs(signedDT)/1000*hours;
    totalHours+=hours;absKwh+=kwh;
    if(signedDT>0)heatingKwh+=kwh;
    if(signedDT<0)coolingKwh+=kwh;
    el.querySelector('[data-hours]').textContent=fmt(hours,1)+' h';
    el.querySelector('[data-energy]').textContent=fmt(kwh,2)+' kWh '+(signedDT>0?'pérdida':signedDT<0?'ganancia':'sin flujo');
  });
  $('energyTotalKwh').textContent=fmt(heatingKwh,2);
  $('energyCoolingKwh').textContent=fmt(coolingKwh,2);
  $('energyTotalHours').textContent=fmt(totalHours,1)+' h';
  $('energyAverageKw').textContent=fmt(totalHours?absKwh/totalHours:0,2)+' kW';
  $('energyDirectionNote').textContent=coolingKwh>0
    ? 'Los períodos con exterior más cálido se muestran como ganancia térmica hacia el interior y no se convierten a consumo de estufas/parafina.'
    : 'Todos los períodos configurados corresponden a pérdida de calor hacia el exterior.';

  // Heating equipment equivalences use only heating-loss energy.
  const electricKw=num('electricHeaterKw',2,.1);
  $('electricHours').textContent=fmt(heatingKwh/electricKw,1)+' h';

  const hpKw=num('heatPumpKw',3.5,.1),cop=num('heatPumpCop',3.2,1);
  $('heatPumpHours').textContent=fmt(heatingKwh/hpKw,1)+' h';
  const hpElec=heatingKwh/cop;
  $('heatPumpElectricity').textContent=fmt(hpElec,2)+' kWh eléctricos equivalentes';

  const fuel=num('keroseneKwhL',10,1),eff=num('keroseneEff',85,1,100)/100,lph=num('keroseneLph',.25,.01);
  const liters=heatingKwh/(fuel*eff);
  $('keroseneLiters').textContent=fmt(liters,2)+' L equivalentes';
  $('keroseneHours').textContent=fmt(liters/lph,1)+' h';

  const ePrice=num('electricPrice',0,0),kPrice=num('kerosenePrice',0,0);
  $('electricCost').textContent=ePrice>0?'$ '+Math.round(heatingKwh*ePrice).toLocaleString('es-CL'):'Ingresa tarifa';
  $('heatPumpCost').textContent=ePrice>0?'$ '+Math.round(hpElec*ePrice).toLocaleString('es-CL'):'Ingresa tarifa';
  $('keroseneCost').textContent=kPrice>0?'$ '+Math.round(liters*kPrice).toLocaleString('es-CL'):'Ingresa precio';
  window.__heatlossEnergy={totalHours,totalKwh:heatingKwh,coolingKwh,hpElec,liters,H};
}
/* ---------- heat loss mother module ---------- */
function calculate(){
  const g=geometry(),Ti=num('ti',20),Te=num('te',5),signedDT=Ti-Te,dT=Math.abs(signedDT),direction=thermalDirection(Ti,Te);
  syncRoofArea(g);syncFloor();const floorA=syncFloorArea(g);syncBridgeUI();

  const winA=num('windowArea',12,0),doorA=num('doorArea',4,0);
  const grossWalls=wallGrossArea(g);
  const wallA=Math.max(0,grossWalls-winA-doorA);
  const wallU=num('wallU',.60,.01),winU=num('windowU',2.8,.01),doorU=num('doorU',2.2,.01);
  const roofA=num('roofArea',g.roof,0),roofU=num('roofU',.45,.01);
  const floorType=$('floorType').value,floorU=num('floorU',.60,.01),floorLs=num('floorLs',.50,0),groundP=groundPerimeter(g);
  const air=achValue(g),ach=air.total,bridgeH=bridgeCoefficient();

  const wallLoss=wallU*wallA*dT,windowLoss=winU*winA*dT,doorLoss=doorU*doorA*dT;
  const roofLoss=roofU*roofA*dT;
  const floorLoss=floorType==='adiabatic'?0:(floorType==='ground'?floorLs*groundP*dT:floorU*floorA*dT);
  const airLoss=.33*ach*g.volume*dT,bridgeLoss=bridgeH*dT;
  const transmission=wallLoss+windowLoss+doorLoss+roofLoss+floorLoss,total=transmission+airLoss+bridgeLoss,totalSafe=Math.max(total,1);

  const parts=[
    {id:'walls',name:'Muros',loss:wallLoss},{id:'windows',name:'Ventanas',loss:windowLoss},
    {id:'roof',name:'Techumbre',loss:roofLoss},{id:'floor',name:floorType==='ground'?'Piso-terreno':'Piso',loss:floorLoss},
    {id:'air',name:'Ventilación / infiltración',loss:airLoss},{id:'doors',name:'Puertas',loss:doorLoss},
    {id:'bridges',name:'Puentes térmicos adicionales',loss:bridgeLoss}
  ].sort((a,b)=>b.loss-a.loss);

  $('deltaTOut').textContent=fmt(dT,1);$('usefulAreaOut').textContent=fmt(g.useful,1);$('footprintOut').textContent=fmt(g.footprint,1);
  $('volumeOut').textContent=fmt(g.volume,1);$('grossWallOut').textContent=fmt(g.grossWalls,1);
  $('wallGrossConsideredOut').textContent=fmt(grossWalls,1)+' m²';
  $('wallOpeningsOut').textContent=fmt(winA+doorA,1)+' m²';
  $('wallArea').textContent=fmt(wallA,1)+' m²';
  $('wallGrossHelp').textContent=`Cálculo: ${fmt(grossWalls,1)} − ${fmt(winA+doorA,1)} = ${fmt(wallA,1)} m² netos`;
  $('wallLoss').textContent=fmt(wallLoss,0);$('windowLoss').textContent=fmt(windowLoss,0);$('doorLoss').textContent=fmt(doorLoss,0);
  $('roofLoss').textContent=fmt(roofLoss,0);$('floorLoss').textContent=fmt(floorLoss,0);$('airLoss').textContent=fmt(airLoss,0);

  if(floorType==='ground'){
    $('groundMethodNote').textContent=`Φ = ${fmt(floorLs,2)} W/m·K × ${fmt(groundP,2)} m × ${fmt(dT,1)} K`;
  }

  $('bridgeLoss').textContent=fmt(bridgeLoss,0)+' W';$('bridgeHOut').textContent=fmt(bridgeH,2)+' W/K';
  if($('bridgeEnabled').checked){
    $('bridgeCalcText').textContent=$('bridgeMode').value==='assistant'
      ? `${fmt(num('bridgeLength',0),1)} m × ${fmt(num('bridgePsi',.10),2)} W/m·K`
      : 'Valor ΣψL ingresado directamente';
  }else $('bridgeCalcText').textContent='Puentes térmicos desactivados';
  $('bridgeStatus').textContent=bridgeH>0?`Añaden ${fmt(bridgeLoss,0)} W con |ΔT| ${fmt(dT,1)} K`:'No considerados';

  $('airFormula').textContent=air.mode==='cevMin'
    ? `ACH usado = ${fmt(air.vent,2)} ventilación CEV + ${fmt(air.infiltration,2)} infiltración = ${fmt(ach,2)} ACH`
    : `Pérdida aire = 0,33 × ${fmt(ach,2)} ACH × ${fmt(g.volume,0)} m³ × ${fmt(dT,1)} K`;

  $('kw').textContent=fmt(total/1000,2);$('total').textContent=fmt(total,0)+' W';
  $('specific').textContent=fmt(g.useful?total/g.useful:0,1)+' W/m²';$('trans').textContent=fmt(transmission,0)+' W';
  $('otherLoss').textContent=fmt(airLoss+bridgeLoss,0)+' W';

  if(direction==='out'){
    $('resultSentence').textContent=`Para mantener ${fmt(Ti,1)} °C con ${fmt(Te,1)} °C exterior, la vivienda pierde aproximadamente ${fmt(total/1000,2)} kW hacia el exterior.`;
    $('thermalDirectionNotice').className='hl2-direction-notice heating';
    $('thermalDirectionNotice').innerHTML='<b>Modo calefacción:</b> el interior está más cálido que el exterior; el resultado representa pérdida de calor.';
  }else if(direction==='in'){
    $('resultSentence').textContent=`Con ${fmt(Te,1)} °C exterior y ${fmt(Ti,1)} °C interior, la envolvente recibe aproximadamente ${fmt(total/1000,2)} kW desde el exterior.`;
    $('thermalDirectionNotice').className='hl2-direction-notice cooling';
    $('thermalDirectionNotice').innerHTML='<b>Flujo hacia el interior:</b> este valor es una ganancia térmica por transmisión/aire, no una pérdida de calefacción.';
  }else{
    $('resultSentence').textContent='No existe diferencia de temperatura entre interior y exterior; las pérdidas sensibles calculadas son nulas.';
    $('thermalDirectionNotice').className='hl2-direction-notice neutral';
    $('thermalDirectionNotice').textContent='ΔT = 0 K.';
  }

  const max=Math.max(...parts.map(p=>p.loss),1);
  $('lossRanking').innerHTML=parts.map((p,i)=>`<div class="heat-rank-row"><span class="rank">${i+1}</span><div><b>${p.name}</b><small>${fmt(p.loss/totalSafe*100,0)}% del total</small></div><div class="heat-rank-track"><i style="width:${p.loss/max*100}%"></i></div><strong>${fmt(p.loss,0)} W</strong></div>`).join('');
  const dom=parts.find(p=>p.loss>0)||parts[0];
  $('dominantAdvice').innerHTML=`<b>Prioridad: ${dom.name}</b><span>Concentra aproximadamente ${fmt(dom.loss/totalSafe*100,0)}% de la magnitud térmica calculada.</span>`;

  const ids={walls:'hmWalls',windows:'hmWindows',roof:'hmRoof',floor:'hmFloor',air:'hmAir',doors:'hmDoors',bridges:'hmBridges'};
  parts.forEach(p=>{const o=$(ids[p.id]);if(o)o.textContent=fmt(p.loss/totalSafe*100,0)+'%'});

  const scenario={g,dT,wallA,wallU,winA,winU,roofA,roofU,ach,total};
  if(!state.improvementApplied)state.improvementReference={...scenario};
  renderImprovements(state.improvementReference||scenario);
  updateEnergySimulator();

  window.__heatloss={Ti,Te,dT,signedDT,direction,g,grossWalls,wallA,winA,doorA,roofA,floorArea:floorA,
    wallU,winU,doorU,roofU,floorType,floorU,floorLs,groundPerimeter:groundP,ach,airMode:air.mode,
    ventilationAch:air.vent,infiltrationAch:air.infiltration,bridgeH,
    wallLoss,windowLoss,doorLoss,roofLoss,floorLoss,airLoss,bridgeLoss,transmission,total,parts,
    windowSource:$('windowSource').textContent,doorSource:$('doorSource').textContent};
}

function restoreImprovementBaselineFields(){
  const b=state.improvementBackup;
  if(!b)return;
  $('wallU').value=b.wallU;$('windowU').value=b.windowU;$('roofU').value=b.roofU;
  $('airMode').value=b.airMode;$('ach').value=b.ach;$('windowSource').textContent=b.windowSource;
}
function applyImprovement(type,target){
  if(!state.improvementBackup){
    state.improvementBackup={
      wallU:$('wallU').value,windowU:$('windowU').value,roofU:$('roofU').value,
      ach:$('ach').value,airMode:$('airMode').value,windowSource:$('windowSource').textContent
    };
  }else{
    restoreImprovementBaselineFields();
  }
  if(type==='wall')$('wallU').value=target;
  if(type==='window'){
    $('windowU').value=target;
    $('windowSource').textContent='Escenario de mejora aplicado desde Simular mejoras.';
  }
  if(type==='roof')$('roofU').value=target;
  if(type==='ach'){
    $('airMode').value='known';$('ach').disabled=false;$('ach').value=target;
  }
  state.improvementApplied=type;
  calculate();
  const names={wall:'muros',window:'ventanas',roof:'techumbre',ach:'hermeticidad/aire'};
  $('improvementApplied').classList.remove('hl2-hidden');
  $('improvementApplied').innerHTML=`<b>Escenario aplicado al resultado:</b> ${names[type]}. Cada botón compara contra la misma condición base. <button id="resetAppliedImprovement" type="button">Restaurar condición base</button>`;
  $('resetAppliedImprovement').addEventListener('click',resetAppliedImprovement);
}
function resetAppliedImprovement(){
  if(!state.improvementBackup)return;
  restoreImprovementBaselineFields();
  state.improvementBackup=null;state.improvementApplied=null;state.improvementReference=null;
  $('improvementApplied').classList.add('hl2-hidden');calculate();
}
function renderImprovements(c){
  const wallTarget=num('improveWallU',.40,.01),winTarget=num('improveWindowU',1.8,.01),roofTarget=num('improveRoofU',.30,.01),achTarget=num('improveAch',.30,0);
  const opts=[
    {type:'wall',name:'Mejorar muros',target:wallTarget,save:Math.max(0,(c.wallU-wallTarget)*c.wallA*c.dT),note:`U ${fmt(c.wallU,2)} → ${fmt(wallTarget,2)}`},
    {type:'window',name:'Mejorar ventanas',target:winTarget,save:Math.max(0,(c.winU-winTarget)*c.winA*c.dT),note:`U ${fmt(c.winU,2)} → ${fmt(winTarget,2)}`},
    {type:'roof',name:'Mejorar techumbre',target:roofTarget,save:Math.max(0,(c.roofU-roofTarget)*c.roofA*c.dT),note:`U ${fmt(c.roofU,2)} → ${fmt(roofTarget,2)}`},
    {type:'ach',name:'Reducir infiltración',target:achTarget,save:Math.max(0,.33*(c.ach-achTarget)*c.g.volume*c.dT),note:`${fmt(c.ach,2)} → ${fmt(achTarget,2)} ACH`}
  ].sort((a,b)=>b.save-a.save);
  const mx=Math.max(...opts.map(o=>o.save),1);
  $('improvementRanking').innerHTML=opts.map((o,i)=>`
    <div class="improvement-row ${i===0&&o.save>0?'best':''}">
      <div><small>${i===0&&o.save>0?'MAYOR IMPACTO ESTIMADO':''}</small><b>${o.name}</b><span>${o.note}</span></div>
      <div class="improvement-track"><i style="width:${o.save/mx*100}%"></i></div>
      <div class="hl2-improve-action"><strong>−${fmt(o.save,0)} W</strong><small>Nuevo total ≈ ${fmt((c.total-o.save)/1000,2)} kW</small><button type="button" data-apply-improvement="${o.type}" data-target="${o.target}" ${o.save<=.1?'disabled':''}>Aplicar mejora</button></div>
    </div>`).join('');
  $('improvementRanking').querySelectorAll('[data-apply-improvement]').forEach(btn=>btn.addEventListener('click',()=>{
    applyImprovement(btn.dataset.applyImprovement,Number(btn.dataset.target));
  }));
}
function syncImprovementPreset(selectId,inputId){
  const sel=$(selectId),inp=$(inputId),custom=sel.value==='custom';inp.disabled=!custom;if(!custom)inp.value=sel.value;
}

function bind(){
  renderDimRows('window');renderDimRows('door');updateBuilderSummary('window');updateBuilderSummary('door');
  renderLayers('roof');renderLayers('floor');updateLayerCalc('roof');updateLayerCalc('floor');
  renderEnergyPeriods();

  $('addWindowRow').addEventListener('click',()=>{
    state.windowRows.push({name:`V${state.windowRows.length+1}`,w:120,h:100,q:1,frame:'pvc',glass:'dvh15'});
    renderDimRows('window');updateBuilderSummary('window');
  });
  $('addDoorRow').addEventListener('click',()=>{
    state.doorRows.push({name:`P${state.doorRows.length+1}`,w:90,h:210,q:1,preset:'solid0',customU:2.2});
    renderDimRows('door');updateBuilderSummary('door');
  });
  $('winUnit').addEventListener('change',()=>{renderDimRows('window');updateBuilderSummary('window')});
  $('doorUnit').addEventListener('change',()=>{renderDimRows('door');updateBuilderSummary('door')});
  $('applyWindows').addEventListener('click',applyWindowBuilder);
  $('applyDoors').addEventListener('click',applyDoorBuilder);

  $('addRoofLayer').addEventListener('click',()=>{
    state.roofLayers.push({mat:'custom',mm:10,lambdaCustom:.10});
    renderLayers('roof');updateLayerCalc('roof');
  });
  $('addFloorLayer').addEventListener('click',()=>{
    state.floorLayers.push({mat:'custom',mm:10,lambdaCustom:.10});
    renderLayers('floor');updateLayerCalc('floor');
  });
  $('loadSlabPreset').addEventListener('click',loadSlabPreset);
  document.querySelectorAll('input[name="floorBuilderMode"]').forEach(x=>x.addEventListener('change',()=>{
    updateFloorBuilderAvailability();updateLayerCalc('floor');
  }));
  $('applyRoof').addEventListener('click',applyRoofBuilder);
  $('applyFloor').addEventListener('click',applyFloorBuilder);

  $('addEnergyPeriod').addEventListener('click',()=>{
    state.energyPeriods.push({start:'07:00',end:'12:00',ti:num('ti',20),te:num('te',5)});
    renderEnergyPeriods();
  });
  ['electricHeaterKw','heatPumpKw','heatPumpCop','keroseneKwhL','keroseneEff','keroseneLph','electricPrice','kerosenePrice']
    .forEach(id=>$(id)?.addEventListener('input',updateEnergySimulator));

  [['improveWallPreset','improveWallU'],['improveWindowPreset','improveWindowU'],['improveRoofPreset','improveRoofU'],['improveAchPreset','improveAch']].forEach(([sel,inp])=>{
    syncImprovementPreset(sel,inp);$(sel).addEventListener('change',()=>{syncImprovementPreset(sel,inp);calculate()});
  });

  const ids=['ti','te','length','width','height','levels','wallU','wallGrossAreaInput','windowArea','windowU','doorArea','doorU','roofArea','roofU','floorAreaInput','floorU','floorLs','groundPerimeter','ach','bedrooms','infiltrationAch','bridgeLength','bridgePsi','bridgeH','improveWallU','improveWindowU','improveRoofU','improveAch'];
  ids.forEach(id=>$(id)?.addEventListener('input',calculate));
  $('roofManual')?.addEventListener('change',calculate);$('floorManual')?.addEventListener('change',calculate);$('wallGrossManual')?.addEventListener('change',calculate);$('groundPerimeterManual')?.addEventListener('change',calculate);
  $('floorType')?.addEventListener('change',calculate);$('airMode')?.addEventListener('change',calculate);
  $('bridgeEnabled')?.addEventListener('change',calculate);$('bridgeMode')?.addEventListener('change',calculate);
  updateFloorBuilderAvailability();calculate();
}
window.addEventListener('DOMContentLoaded',bind);

window.HIDROLAB_HEATLOSS_REPORT=()=>window.__heatloss?{
  title:'Pérdidas térmicas de la vivienda',
  conditions:{Ti:window.__heatloss.Ti,Te:window.__heatloss.Te,dT:window.__heatloss.dT,volume:window.__heatloss.g.volume,floorArea:window.__heatloss.g.useful,footprint:window.__heatloss.g.footprint,grossWalls:window.__heatloss.g.grossWalls},
  wall:{layers:[],Rt:null,U:window.__heatloss.wallU,area:window.__heatloss.wallA,loss:window.__heatloss.wallLoss,source:'U ingresado directamente por usuario'},
  inputs:{windowArea:window.__heatloss.winA,windowU:window.__heatloss.winU,windowType:window.__heatloss.windowSource,
    doorArea:window.__heatloss.doorA,doorU:window.__heatloss.doorU,doorType:window.__heatloss.doorSource,
    roofArea:window.__heatloss.roofA,roofU:window.__heatloss.roofU,floorArea:window.__heatloss.floorArea,floorType:window.__heatloss.floorType,floorU:window.__heatloss.floorU,floorLs:window.__heatloss.floorLs,groundPerimeter:window.__heatloss.groundPerimeter,bridgeH:window.__heatloss.bridgeH},
  elements:window.__heatloss.parts,total:window.__heatloss.total,transmission:window.__heatloss.transmission,airLoss:window.__heatloss.airLoss,bridgeLoss:window.__heatloss.bridgeLoss,ach:window.__heatloss.ach,energySchedule:window.__heatlossEnergy||null
}:null;
