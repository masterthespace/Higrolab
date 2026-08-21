const A=17.62,B=243.12,$=id=>document.getElementById(id),
fmt=(n,d=1)=>Number.isFinite(n)?n.toFixed(d).replace('.',','):'—',
clamp=(x,a,b)=>Math.min(b,Math.max(a,x));

let volumeMode='dims',moistMode='sources',ventMode='practical',strategy='cross',ventMinutes=15;

function ps(T){return 6.112*Math.exp(A*T/(B+T))}
function pv(T,RH){return ps(T)*RH/100}
function absHumidity(T,RH){return 216.7*pv(T,RH)/(T+273.15)}
function rhFromAH(ah,T){return 100*(ah*(T+273.15)/216.7)/ps(T)}
function dewFromAH(ah,T){const p=Math.max(.001,ah*(T+273.15)/216.7),l=Math.log(p/6.112);return B*l/(A-l)}

function volume(){
  if(volumeMode==='direct')return Math.max(1,+$('vol').value||1);
  return Math.max(1,(+$('roomL').value||0)*(+$('roomW').value||0)*(+$('roomH').value||0))
}
function moistureKgDay(){
  if(moistMode==='manual')return Math.max(0,+$('moist').value||0);
  const people=Math.max(0,+$('people').value||0),ph=clamp(+$('personHours').value||0,0,24),
    pr=Math.max(0,+$('personRate').value||0),showers=Math.max(0,+$('showers').value||0),
    showerL=Math.max(0,+$('showerLiters').value||0),cooking=Math.max(0,+$('cooking').value||0),
    laundry=Math.max(0,+$('laundry').value||0),laundryL=Math.max(0,+$('laundryLiters').value||0);
  return (people*ph*pr)/1000 + showers*showerL + cooking + laundry*laundryL
}
function backgroundEquilibrium(flow){
  const Ti=+$('ti').value,Te=+$('te').value,RHe=clamp(+$('rhe').value,1,100),
    Ggh=moistureKgDay()*1000/24,aho=absHumidity(Te,RHe),
    ahi=aho+Ggh/Math.max(1,flow),RH=rhFromAH(ahi,Ti);
  return{RH,Ti,Te,RHe,aho,ahi,Ggh}
}
function required(){
  const Ti=+$('ti').value,Te=+$('te').value,RHe=clamp(+$('rhe').value,1,100),
    target=clamp(+$('target').value,20,95),Ggh=moistureKgDay()*1000/24,
    aho=absHumidity(Te,RHe),ahTarget=absHumidity(Ti,target);
  if(ahTarget<=aho)return Infinity;
  return Ggh/Math.max(1e-8,ahTarget-aho)
}
function strategyParams(){
  const wind=$('windLevel')?.value||'light';
  const windFactor={calm:.55,light:1,moderate:1.55,strong:2.15}[wind]||1;
  const base={
    single:{velocity:.12,eff:.45,label:'Una ventana'},
    cross:{velocity:.30,eff:.62,label:'Dos ventanas cruzadas'},
    window_door:{velocity:.38,eff:.70,label:'Ventana + puerta'},
    mechanical:{velocity:0,eff:1,label:'Extractor / ventilador'},
    dehumidifier:{velocity:0,eff:1,label:'Deshumidificador'}
  }[strategy];
  return{...base,windFactor}
}
function practicalFlow(){
  if(strategy==='mechanical'){
    const q=Math.max(10,+$('mechanicalFlow').value||10);
    return{flow:q,low:q,high:q,area:0,label:'Extractor / ventilador',estimated:false}
  }
  if(strategy==='dehumidifier'){
    return{flow:0,low:0,high:0,area:0,label:'Deshumidificador',estimated:false}
  }
  const w=Math.max(.1,+$('openW').value||.1),h=Math.max(.1,+$('openH').value||.1),
    pct=clamp(+$('openPct').value||5,5,100)/100,p=strategyParams(),
    area=w*h*pct,v=p.velocity*p.windFactor,q=area*v*p.eff*3600,
    uncertainty=strategy==='single'?.45:.32;
  return{flow:Math.max(5,q),low:Math.max(3,q*(1-uncertainty)),high:q*(1+uncertainty),area,label:p.label,estimated:true}
}
function activeFlow(){
  if(ventMode==='technical')return Math.max(1,+$('flow').value||1);
  return practicalFlow().flow
}
function initialState(){
  const vol=volume(),background=Math.max(15,vol*.35);
  return backgroundEquilibrium(background)
}
function dehumidifierResult(){
  const vol=volume(),e0=initialState(),hours=ventMinutes/60,
    cap=Math.max(0,+$('dehumCapacity').value||0),
    factor=clamp(+$('dehumFactor').value||0,10,100)/100,
    effectiveLph=cap/24*factor,
    gramsPotential=effectiveLph*1000*hours,
    targetAH=absHumidity(e0.Ti,clamp(+$('target').value,20,95)),
    minAH=Math.max(targetAH,0),
    maxRemovable=Math.max(0,(e0.ahi-minAH)*vol),
    gramsRemoved=Math.min(gramsPotential,maxRemovable),
    ah1=Math.max(minAH,e0.ahi-gramsRemoved/vol),
    rh1=rhFromAH(ah1,e0.Ti),
    excess0=Math.max(0,e0.ahi-targetAH),
    excess1=Math.max(0,ah1-targetAH),
    reduction=excess0>0?(1-excess1/excess0)*100:0;
  return{...e0,Q:0,tH:hours,ach:0,ah0:e0.ahi,ah1,rh1,reduction,gramsRemoved,airChanges:0,
    dehum:true,effectiveLph,gramsPotential}
}
function actionResult(){
  if(ventMode==='practical'&&strategy==='dehumidifier')return dehumidifierResult();
  const vol=volume(),Q=activeFlow(),tH=ventMinutes/60,e0=initialState(),
    ach=Q/vol,decay=Math.exp(-ach*tH),
    ah1=e0.aho+(e0.ahi-e0.aho)*decay,rh1=rhFromAH(ah1,e0.Ti),
    excess0=Math.max(0,e0.ahi-e0.aho),excess1=Math.max(0,ah1-e0.aho),
    reduction=excess0>0?(1-excess1/excess0)*100:0,
    gramsRemoved=Math.max(0,(e0.ahi-ah1)*vol),airChanges=ach*tH;
  return{...e0,Q,tH,ach,ah0:e0.ahi,ah1,rh1,reduction,gramsRemoved,airChanges,dehum:false}
}
function dryingData(e){
  const delta=e.ahi-e.aho,per100=Math.max(0,delta*100/1000);
  let label='NO CONVIENE',cls='bad';
  if(delta>5){label='MUY FAVORABLE';cls='great'}
  else if(delta>2){label='FAVORABLE';cls='good'}
  else if(delta>.5){label='POCO EFECTIVO';cls='mild'}
  return{outside:e.aho,inside:e.ahi,delta,per100,label,cls}
}
function recommendation(e,dry,c){
  const target=clamp(+$('target').value,20,95);
  if(c.dehum){
    if(c.rh1<=target)return{label:'OBJETIVO ALCANZABLE',cls:'great',text:`Con el deshumidificador configurado durante ${formatDuration()} la HR podría bajar aproximadamente de ${fmt(c.RH,0)}% a ${fmt(c.rh1,0)}%, hasta el objetivo seleccionado.`};
    return{label:'DESHUMIDIFICACIÓN ÚTIL',cls:'good',text:`El equipo retiraría aproximadamente ${fmt(c.gramsRemoved/1000,2)} L equivalentes en ${formatDuration()}, reduciendo la HR estimada de ${fmt(c.RH,0)}% a ${fmt(c.rh1,0)}%.`};
  }
  if(dry.delta<=.2)return{label:'NO CONVIENE',cls:'bad',text:'El aire exterior no es más seco en términos absolutos que el interior estimado. Abrir ventanas puede no reducir la humedad y sí enfriar las superficies.'};
  if(c.rh1<=target)return{label:'OBJETIVO ALCANZABLE',cls:'great',text:`Con ${fmt(c.Q,0)} m³/h estimados durante ${formatDuration()}, la HR podría bajar de ${fmt(c.RH,0)}% a ${fmt(c.rh1,0)}%, alcanzando el objetivo.`};
  if(c.reduction>=50)return{label:'RECOMENDADA',cls:'great',text:`La estrategia seleccionada tiene buena capacidad de secado. En ${formatDuration()} podría retirar cerca del ${fmt(c.reduction,0)}% del exceso de vapor sobre el nivel exterior.`};
  if(c.reduction>=25)return{label:'AYUDA PARCIAL',cls:'mild',text:`La ventilación ayuda, pero ${formatDuration()} no serían suficientes para acercarse totalmente al objetivo. Prueba más tiempo o una estrategia cruzada.`};
  return{label:'EFECTO BAJO',cls:'bad',text:`Con esta apertura y ${formatDuration()} el efecto sería limitado.`}
}
function formatDuration(){
  if(ventMinutes>=60){
    const h=ventMinutes/60;
    return `${fmt(h,h%1?1:0)} h`;
  }
  return `${ventMinutes} min`
}
function setDurationButtonsForStrategy(){
  const host=$('ventTimeButtons');
  if(!host)return;
  const vals=strategy==='dehumidifier'
    ? [[60,'1 h'],[120,'2 h'],[240,'4 h'],[480,'8 h']]
    : [[4,'4 min'],[5,'5 min'],[10,'10 min'],[15,'15 min'],[20,'20 min'],[30,'30 min']];
  if(strategy==='dehumidifier' && ventMinutes<60)ventMinutes=120;
  if(strategy!=='dehumidifier' && ventMinutes>=60)ventMinutes=15;
  host.innerHTML=vals.map(([v,l])=>`<button type="button" data-min="${v}" class="${v===ventMinutes?'active':''}">${l}</button>`).join('');
  host.querySelectorAll('[data-min]').forEach(b=>b.onclick=()=>{ventMinutes=+b.dataset.min;setDurationButtonsForStrategy();render()});
  $('durationQuestion').textContent=strategy==='dehumidifier'?'¿Cuánto tiempo funcionará?':'¿Cuánto tiempo abrirás?'
}
function setVolumeMode(mode){
  volumeMode=mode==='direct'?'direct':'dims';
  document.querySelectorAll('[data-volume-mode]').forEach(b=>b.classList.toggle('active',b.dataset.volumeMode===volumeMode));
  $('dimsFields').classList.toggle('hidden',volumeMode!=='dims');$('directVolField').classList.toggle('hidden',volumeMode!=='direct');render()
}
function setMoistMode(mode){
  moistMode=mode==='manual'?'manual':'sources';
  document.querySelectorAll('[data-moist-mode]').forEach(b=>b.classList.toggle('active',b.dataset.moistMode===moistMode));
  $('sourceFields').classList.toggle('hidden',moistMode!=='sources');$('manualMoistField').classList.toggle('hidden',moistMode!=='manual');render()
}
function setVentMode(mode){
  ventMode=mode==='technical'?'technical':'practical';
  document.querySelectorAll('[data-vent-mode]').forEach(b=>b.classList.toggle('active',b.dataset.ventMode===ventMode));
  $('practicalVentPanel').classList.toggle('hidden',ventMode!=='practical');$('technicalVentPanel').classList.toggle('hidden',ventMode!=='technical');render()
}
function setStrategy(s){
  strategy=s;
  document.querySelectorAll('[data-strategy]').forEach(b=>b.classList.toggle('active',b.dataset.strategy===strategy));
  $('naturalVentFields').classList.toggle('hidden',strategy==='mechanical'||strategy==='dehumidifier');
  $('mechanicalFields').classList.toggle('hidden',strategy!=='mechanical');
  $('dehumidifierFields').classList.toggle('hidden',strategy!=='dehumidifier');
  setDurationButtonsForStrategy();render()
}
function humidityClass(rh){
  if(rh<60)return{label:'CONTROLADA',color:'#2f9867'};
  if(rh<70)return{label:'MODERADA',color:'#c7a12b'};
  if(rh<80)return{label:'ALTA',color:'#e18431'};
  return{label:'MUY ALTA',color:'#cf4f4f'}
}
function drawTimeline(c){
  const W=900,H=280,L=58,R=24,T=20,B=45,minY=30,maxY=100,
    sx=m=>L+m/Math.max(1,ventMinutes)*(W-L-R),sy=rh=>T+(maxY-rh)/(maxY-minY)*(H-T-B);
  let s=`<rect width="${W}" height="${H}" fill="#fbfcfc"/>`;
  [40,50,60,70,80,90].forEach(y=>s+=`<line x1="${L}" y1="${sy(y)}" x2="${W-R}" y2="${sy(y)}" stroke="#e1e8ea"/><text x="${L-8}" y="${sy(y)+4}" text-anchor="end" font-size="10" fill="#6d7e85">${y}%</text>`);
  const target=clamp(+$('target').value,20,95);
  s+=`<line x1="${L}" y1="${sy(target)}" x2="${W-R}" y2="${sy(target)}" stroke="#6ca24b" stroke-width="2" stroke-dasharray="6 5"/><text x="${W-R-4}" y="${sy(target)-6}" text-anchor="end" font-size="10" fill="#5c8c40">Objetivo ${fmt(target,0)}%</text>`;
  let pts=[];
  for(let m=0;m<=ventMinutes;m+=Math.max(1,ventMinutes/50)){
    let ah;
    if(c.dehum){
      const frac=m/ventMinutes,removed=c.gramsRemoved*frac;
      ah=Math.max(c.ah1,c.ah0-removed/volume());
    }else{
      ah=c.aho+(c.ah0-c.aho)*Math.exp(-c.ach*(m/60))
    }
    pts.push(`${sx(m)},${sy(clamp(rhFromAH(ah,c.Ti),minY,maxY))}`)
  }
  s+=`<polyline points="${pts.join(' ')}" fill="none" stroke="#1683a4" stroke-width="4"/><circle cx="${sx(0)}" cy="${sy(clamp(c.RH,minY,maxY))}" r="5" fill="#d26056"/><circle cx="${sx(ventMinutes)}" cy="${sy(clamp(c.rh1,minY,maxY))}" r="6" fill="#399461"/><text x="${W/2}" y="${H-8}" text-anchor="middle" font-size="11" fill="#60747c">${c.dehum?'Tiempo de funcionamiento':'Tiempo de ventilación'}</text>`;
  $('ventTimelineChart').innerHTML=s
}
function renderHouse(c){
  const hc=humidityClass(c.rh1),initial=humidityClass(c.RH);
  $('houseRhText').textContent=`${fmt(c.RH,0)} % HR`;$('houseRhText').style.fill=initial.color;
  $('houseRhAfterText').textContent=`después: ${fmt(c.rh1,0)} % HR`;$('houseRhAfterText').style.fill=hc.color;
  $('houseAchText').textContent=c.dehum?'Sin renovación de aire':`${fmt(c.ach,2)} ACH durante apertura`;
  $('houseStatus').textContent=hc.label;$('houseStatus').style.color=hc.color;
  const improvement=clamp(c.reduction/100,0,1);
  $('humidityCloud').style.opacity=clamp(.72-improvement*.62,.05,.72);
  $('roomStop1').setAttribute('stop-color', improvement>.65?'#e7f7eb':improvement>.3?'#eef3e6':'#e7ecee');
  $('roomStop2').setAttribute('stop-color', improvement>.65?'#d9f0df':improvement>.3?'#e4eee0':'#dce4e7');
  $('rightWindow').style.opacity=strategy==='single'||strategy==='dehumidifier'?'.28':'1';
  $('doorOpening').style.opacity=strategy==='window_door'?'1':'0';
  $('singleReturn').style.opacity=strategy==='single'?'1':'0';
  $('airOut').style.opacity=strategy==='single'?'.35':strategy==='dehumidifier'?'0':'1';
  $('airIn').style.opacity=strategy==='dehumidifier'?'0':'1';
  if(!c.dehum){
    const dur=clamp(2.5-Math.log10(Math.max(5,c.Q))*.7,.4,2.3);
    document.querySelectorAll('.air-stream').forEach(g=>g.style.setProperty('--air-duration',`${dur}s`))
  }
  $('airMotionLabel').textContent=c.dehum?`Extracción de agua: ${fmt(c.effectiveLph,2)} L/h efectivos`:`${ventMode==='technical'?'Caudal conocido':strategyParams().label}: ${fmt(c.Q,0)} m³/h`
}
function renderDewRisk(c){
  const ts=+$('surfaceTempRef').value||0,
    db=dewFromAH(c.ah0,c.Ti),da=dewFromAH(c.ah1,c.Ti),
    mb=ts-db,ma=ts-da;
  $('dewBefore').textContent=fmt(db,1);$('dewAfter').textContent=fmt(da,1);
  $('marginBefore').textContent=fmt(mb,1);$('marginAfter').textContent=fmt(ma,1);
  let label='BAJO',cls='great',text='La temperatura superficial de referencia queda claramente por sobre el punto de rocío después de la estrategia.';
  if(ma<=0){label='CONDENSACIÓN POSIBLE';cls='bad';text='La temperatura superficial de referencia queda igual o por debajo del punto de rocío estimado después de la estrategia.'}
  else if(ma<2){label='MARGEN BAJO';cls='bad';text='La estrategia mejora el punto de rocío, pero el margen superficial sigue siendo menor a 2 °C.'}
  else if(ma<4){label='ATENCIÓN';cls='mild';text='Existe margen positivo, aunque todavía relativamente estrecho frente a enfriamientos adicionales de la superficie.'}
  $('dewRiskBadge').textContent=label;$('dewRiskBadge').className=`drying-badge ${cls}`;
  $('dewRiskText').className='callout '+(ma<=0?'danger':ma<4?'warn':'safe');
  $('dewRiskText').innerHTML=`<b>${text}</b> La estrategia cambia el punto de rocío de ${fmt(db,1)} °C a ${fmt(da,1)} °C; con una superficie a ${fmt(ts,1)} °C, el margen final es ${fmt(ma,1)} °C.`;

  const min=-5,max=30,pos=v=>clamp((v-min)/(max-min)*100,0,100);
  $('surfaceMarker').style.left=pos(ts)+'%';$('surfaceMarker').textContent=`Superficie ${fmt(ts,1)}°`;
  $('dewMarkerBefore').style.left=pos(db)+'%';$('dewMarkerBefore').textContent=`Rocío antes ${fmt(db,1)}°`;
  $('dewMarkerAfter').style.left=pos(da)+'%';$('dewMarkerAfter').textContent=`Rocío después ${fmt(da,1)}°`
}
function renderWaterStory(c){
  const liters=c.gramsRemoved/1000,delta=Math.max(0,c.ah0-c.ah1);
  $('removedLiters').textContent=fmt(liters,3);$('removedGrams').textContent=`${fmt(c.gramsRemoved,0)} g`;
  $('ahBefore').textContent=`${fmt(c.ah0,2)} g/m³`;$('ahAfter').textContent=`${fmt(c.ah1,2)} g/m³`;$('ahDelta').textContent=`${fmt(delta,2)} g/m³`;
  $('bottleFill').style.height=`${Math.min(100,liters/1.2*100)}%`;
  $('waterStoryBadge').textContent=c.dehum?'AGUA CONDENSADA EN EL EQUIPO':'AGUA EVACUADA CON EL AIRE';
  $('waterStoryText').textContent=c.dehum
    ?`En ${formatDuration()}, el deshumidificador podría condensar aproximadamente ${fmt(liters,2)} L de agua desde el aire del recinto bajo el factor de trabajo configurado.`
    :`Durante ${formatDuration()}, la estrategia podría evacuar aproximadamente ${fmt(c.gramsRemoved,0)} g de agua desde el aire, equivalentes a ${fmt(liters,3)} L de agua líquida.`
}
function render(){
  const vol=volume(),moist=moistureKgDay(),pf=practicalFlow(),c=actionResult(),
    dry=dryingData(c),advice=recommendation(c,dry,c),req=required(),reqAch=Number.isFinite(req)?req/vol:Infinity;

  $('volOut').textContent=fmt(vol,1);$('moistOut').textContent=fmt(moist,2);$('waterL').textContent=`${fmt(moist,1)} L`;
  $('waterFill').style.height=`${Math.min(100,moist/12*100)}%`;

  if(ventMode==='practical'&&strategy!=='mechanical'&&strategy!=='dehumidifier'){
    $('effectiveArea').textContent=fmt(pf.area,2);$('estimatedFlow').textContent=fmt(pf.flow,0);
    $('estimatedRange').textContent=`${fmt(pf.low,0)}–${fmt(pf.high,0)}`;$('openAch').textContent=fmt(pf.flow/vol,2)
  }
  $('strategyBadge').textContent=ventMode==='technical'?'CAUDAL CONOCIDO':strategy==='dehumidifier'?'EXTRACCIÓN DIRECTA':pf.estimated?'CAUDAL ESTIMADO':'CAUDAL INGRESADO';
  $('strategyBadge').className='drying-badge '+(strategy==='dehumidifier'?'good':pf.estimated?'mild':'good');
  $('scenarioText').textContent=strategy==='dehumidifier'
    ?`Deshumidificador · ${formatDuration()} · ${fmt(c.effectiveLph,2)} L/h efectivos`
    :`${ventMode==='technical'?'Caudal técnico':pf.label} · ${formatDuration()} · ${fmt(c.Q,0)} m³/h`;

  $('activeFlow').textContent=c.dehum?'—':fmt(c.Q,0);$('beforeVentRh').textContent=fmt(c.RH,0);$('afterVentRh').textContent=fmt(c.rh1,0);
  $('vaporReduction').textContent=fmt(c.reduction,0);$('impactPct').textContent=fmt(c.reduction,0);
  $('impactRing').style.setProperty('--impact-pct',`${clamp(c.reduction,0,100)}%`);
  $('waterRemoved').textContent=`${fmt(c.gramsRemoved,0)} g`;$('ventAirChanges').textContent=c.dehum?'0,00':fmt(c.airChanges,2);
  $('reqflow').textContent=Number.isFinite(req)?`${fmt(req,0)} m³/h`:'No viable';$('reqach').textContent=Number.isFinite(reqAch)?fmt(reqAch,2):'—';

  $('ventAdviceText').textContent=advice.text;$('ventAdviceBadge').textContent=advice.label;$('ventAdviceBadge').className=`drying-badge ${advice.cls}`;
  $('timelineSubtitle').textContent=`${fmt(c.RH,0)}% → ${fmt(c.rh1,0)}% HR en ${formatDuration()}`;

  let cls='safe',txt=`La estrategia reduce el exceso de vapor aproximadamente ${fmt(c.reduction,0)}% en ${formatDuration()}.`;
  if(!c.dehum&&dry.delta<=.2){cls='danger';txt='Con estas condiciones exteriores no hay capacidad neta de secado significativa.'}
  else if(c.rh1>=80){cls='danger';txt='Aun después de la estrategia, la HR estimada seguiría muy alta.'}
  else if(c.rh1>=70){cls='warn';txt='La estrategia ayuda, pero la HR posterior seguiría alta.'}
  else if(c.rh1>=60){cls='warn';txt='La estrategia mejora el ambiente y deja la HR en una zona moderada.'}
  $('status').className='callout '+cls;$('status').innerHTML=`<b>${txt}</b> Resultado estimado: ${fmt(c.RH,0)}% → ${fmt(c.rh1,0)}% HR.`;

  $('aho').textContent=`${fmt(dry.outside,2)} g/m³`;$('ahi').textContent=`${fmt(dry.inside,2)} g/m³`;
  $('outsideState').textContent=`${fmt(c.Te,1)}°C · ${fmt(c.RHe,0)}% HR`;
  $('insideState').textContent=`${fmt(c.Ti,1)}°C · ${fmt(c.RH,0)}% HR`;
  $('dryingPer100').textContent=dry.delta>0?`${fmt(dry.per100,2)} L / 100 m³`:'Sin capacidad neta';
  $('dryingBadge').textContent=c.dehum?'NO APLICA AL EQUIPO':dry.label;$('dryingBadge').className=`drying-badge ${c.dehum?'mild':dry.cls}`;

  renderHouse(c);drawTimeline(c);renderWaterStory(c);renderDewRisk(c)
}

document.querySelectorAll('[data-volume-mode]').forEach(b=>b.onclick=()=>setVolumeMode(b.dataset.volumeMode));
document.querySelectorAll('[data-moist-mode]').forEach(b=>b.onclick=()=>setMoistMode(b.dataset.moistMode));
document.querySelectorAll('[data-vent-mode]').forEach(b=>b.onclick=()=>setVentMode(b.dataset.ventMode));
document.querySelectorAll('[data-strategy]').forEach(b=>b.onclick=()=>setStrategy(b.dataset.strategy));

['roomL','roomW','roomH','vol','ti','te','rhe','target','people','showers','cooking','laundry','personHours','personRate','showerLiters','laundryLiters','moist','openW','openH','openPct','windLevel','mechanicalFlow','flow','dehumCapacity','dehumFactor','dehumTank','surfaceTempRef'].forEach(id=>$(id)?.addEventListener('input',render));

setVolumeMode('dims');setMoistMode('sources');setVentMode('practical');setStrategy('cross');setDurationButtonsForStrategy();render();
