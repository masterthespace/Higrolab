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
    mechanical:{velocity:0,eff:1,label:'Extractor / ventilador'}
  }[strategy];
  return{...base,windFactor}
}
function practicalFlow(){
  if(strategy==='mechanical'){
    const q=Math.max(10,+$('mechanicalFlow').value||10);
    return{flow:q,low:q,high:q,area:0,label:'Extractor / ventilador',estimated:false}
  }
  const w=Math.max(.1,+$('openW').value||.1),h=Math.max(.1,+$('openH').value||.1),
    pct=clamp(+$('openPct').value||5,5,100)/100,p=strategyParams(),
    area=w*h*pct,
    v=p.velocity*p.windFactor,
    q=area*v*p.eff*3600,
    uncertainty=strategy==='single'?.45:.32;
  return{
    flow:Math.max(5,q),low:Math.max(3,q*(1-uncertainty)),high:q*(1+uncertainty),
    area,label:p.label,estimated:true
  }
}
function activeFlow(){
  if(ventMode==='technical') return Math.max(1,+$('flow').value||1);
  return practicalFlow().flow
}
function initialState(){
  // Initial indoor humidity is the steady estimate under a modest background air exchange,
  // not under the temporary window-opening flow.
  const vol=volume(),background=Math.max(15,vol*.35);
  return backgroundEquilibrium(background)
}
function crossVentilation(){
  const vol=volume(),Q=activeFlow(),tH=ventMinutes/60,e0=initialState(),
    ach=Q/vol,decay=Math.exp(-ach*tH),
    ah1=e0.aho+(e0.ahi-e0.aho)*decay,rh1=rhFromAH(ah1,e0.Ti),
    excess0=Math.max(0,e0.ahi-e0.aho),excess1=Math.max(0,ah1-e0.aho),
    reduction=excess0>0?(1-excess1/excess0)*100:0,
    gramsRemoved=Math.max(0,(e0.ahi-ah1)*vol),airChanges=ach*tH;
  return{...e0,Q,tH,ach,ah0:e0.ahi,ah1,rh1,reduction,gramsRemoved,airChanges}
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
  if(dry.delta<=.2)return{label:'NO CONVIENE',cls:'bad',text:'El aire exterior no es más seco en términos absolutos que el interior estimado. Abrir ventanas puede no reducir la humedad y sí enfriar las superficies. Prioriza extracción localizada o deshumidificación.'};
  if(c.rh1<=target)return{label:'OBJETIVO ALCANZABLE',cls:'great',text:`Con ${c.Q.toFixed(0)} m³/h estimados durante ${ventMinutes} min, la HR podría bajar aproximadamente de ${fmt(c.RH,0)}% a ${fmt(c.rh1,0)}%, alcanzando el objetivo seleccionado.`};
  if(c.reduction>=50)return{label:'RECOMENDADA',cls:'great',text:`La estrategia seleccionada tiene buena capacidad de secado. En ${ventMinutes} min podría retirar cerca del ${fmt(c.reduction,0)}% del exceso de vapor sobre el nivel exterior.`};
  if(c.reduction>=25)return{label:'AYUDA PARCIAL',cls:'mild',text:`La ventilación ayuda, pero ${ventMinutes} min no serían suficientes para acercarse totalmente al objetivo. Prueba más tiempo, mayor apertura o ventilación cruzada.`};
  return{label:'EFECTO BAJO',cls:'bad',text:`Con esta apertura y ${ventMinutes} min el efecto sería limitado. Una estrategia cruzada o mayor apertura produciría más renovaciones de aire.`}
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
  $('practicalVentPanel').classList.toggle('hidden',ventMode!=='practical');
  $('technicalVentPanel').classList.toggle('hidden',ventMode!=='technical');render()
}
function setStrategy(s){
  strategy=s;
  document.querySelectorAll('[data-strategy]').forEach(b=>b.classList.toggle('active',b.dataset.strategy===strategy));
  $('naturalVentFields').classList.toggle('hidden',strategy==='mechanical');
  $('mechanicalFields').classList.toggle('hidden',strategy!=='mechanical');
  render()
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
  for(let m=0;m<=ventMinutes;m+=Math.max(.5,ventMinutes/40)){
    const ah=c.aho+(c.ah0-c.aho)*Math.exp(-c.ach*(m/60)),rh=rhFromAH(ah,c.Ti);
    pts.push(`${sx(m)},${sy(clamp(rh,minY,maxY))}`)
  }
  s+=`<polyline points="${pts.join(' ')}" fill="none" stroke="#1683a4" stroke-width="4"/><circle cx="${sx(0)}" cy="${sy(clamp(c.RH,minY,maxY))}" r="5" fill="#d26056"/><circle cx="${sx(ventMinutes)}" cy="${sy(clamp(c.rh1,minY,maxY))}" r="6" fill="#399461"/><text x="${W/2}" y="${H-8}" text-anchor="middle" font-size="11" fill="#60747c">Minutos con la estrategia seleccionada</text>`;
  $('ventTimelineChart').innerHTML=s
}
function drawTechnicalCurve(){
  const W=900,H=410,L=62,R=25,T=25,BT=52,minX=5,maxX=500,minY=30,maxY=110,
    sx=x=>L+(x-minX)/(maxX-minX)*(W-L-R),sy=y=>T+(maxY-y)/(maxY-minY)*(H-T-BT);
  let s=`<rect width="${W}" height="${H}" fill="#fbfcfc"/>`;
  [[30,60,'#e8f5ef'],[60,70,'#eef5dc'],[70,80,'#fff5db'],[80,100,'#fff0e5'],[100,110,'#fde8e8']].forEach(z=>s+=`<rect x="${L}" y="${sy(z[1])}" width="${W-L-R}" height="${sy(z[0])-sy(z[1])}" fill="${z[2]}"/>`);
  [40,50,60,70,80,90,100].forEach(y=>s+=`<line x1="${L}" y1="${sy(y)}" x2="${W-R}" y2="${sy(y)}" stroke="#dfe7ea"/><text x="${L-10}" y="${sy(y)+4}" text-anchor="end" font-size="11" fill="#667983">${y}%</text>`);
  let pts=[];for(let x=5;x<=500;x+=5)pts.push(`${sx(x)},${sy(clamp(backgroundEquilibrium(x).RH,minY,maxY))}`);
  const q=clamp(activeFlow(),5,500),e=backgroundEquilibrium(q),hc=humidityClass(e.RH);
  s+=`<polyline points="${pts.join(' ')}" fill="none" stroke="#176d91" stroke-width="4"/><circle cx="${sx(q)}" cy="${sy(clamp(e.RH,minY,maxY))}" r="7" fill="${hc.color}" stroke="white" stroke-width="3"/><text x="${W/2}" y="${H-6}" text-anchor="middle" font-size="12" font-weight="700" fill="#52636c">Caudal continuo equivalente (m³/h)</text><text x="16" y="${H/2}" transform="rotate(-90 16 ${H/2})" text-anchor="middle" font-size="12" font-weight="700" fill="#52636c">HR interior de equilibrio</text>`;
  $('chart').innerHTML=s
}
function renderHouse(c){
  const hc=humidityClass(c.rh1),initial=humidityClass(c.RH);
  $('houseRhText').textContent=`${fmt(c.RH,0)} % HR`;
  $('houseRhText').style.fill=initial.color;
  $('houseRhAfterText').textContent=`tras ventilar: ${fmt(c.rh1,0)} % HR`;
  $('houseRhAfterText').style.fill=hc.color;
  $('houseAchText').textContent=`${fmt(c.ach,2)} ACH durante apertura`;
  $('houseStatus').textContent=hc.label;$('houseStatus').style.color=hc.color;

  const improvement=clamp(c.reduction/100,0,1);
  $('humidityCloud').style.opacity=clamp(.72-improvement*.62,.05,.72);
  $('roomStop1').setAttribute('stop-color', improvement>.65?'#e7f7eb':improvement>.3?'#eef3e6':'#e7ecee');
  $('roomStop2').setAttribute('stop-color', improvement>.65?'#d9f0df':improvement>.3?'#e4eee0':'#dce4e7');

  $('rightWindow').style.opacity=strategy==='single'?'.28':'1';
  $('doorOpening').style.opacity=strategy==='window_door'?'1':'0';
  $('singleReturn').style.opacity=strategy==='single'?'1':'0';
  $('airOut').style.opacity=strategy==='single'?'.35':'1';

  const dur=clamp(2.5-Math.log10(Math.max(5,c.Q))*.7,.4,2.3);
  document.querySelectorAll('.air-stream').forEach(g=>g.style.setProperty('--air-duration',`${dur}s`));
  $('airMotionLabel').textContent=`${ventMode==='technical'?'Caudal conocido':strategyParams().label}: ${fmt(c.Q,0)} m³/h`;
}
function renderComparison(vol,req){
  if(!$('proposalSlider'))return;
  const current=Math.max(1,activeFlow()),proposed=Math.max(1,+$('proposalSlider').value||1),
    a=backgroundEquilibrium(current),b=backgroundEquilibrium(proposed);
  $('cmpCurrentFlow').textContent=fmt(current,0);$('cmpPropFlow').textContent=fmt(proposed,0);
  $('cmpCurrentRh').textContent=`${fmt(a.RH,0)}%`;$('cmpPropRh').textContent=`${fmt(b.RH,0)}%`;
  $('cmpCurrentAch').textContent=fmt(current/vol,2);$('cmpPropAch').textContent=fmt(proposed/vol,2);
  const delta=b.RH-a.RH;$('compareDelta').textContent=`${delta>0?'+':''}${fmt(delta,0)} pp`;
  $('compareDelta').className=delta<0?'better':delta>0?'worse':'';
  $('proposalLabel').textContent=`${fmt(proposed,0)} m³/h`
}
function render(){
  const vol=volume(),moist=moistureKgDay(),pf=practicalFlow(),c=crossVentilation(),
    dry=dryingData(c),advice=recommendation(c,dry,c),req=required(),reqAch=Number.isFinite(req)?req/vol:Infinity;

  $('volOut').textContent=fmt(vol,1);$('moistOut').textContent=fmt(moist,2);$('waterL').textContent=`${fmt(moist,1)} L`;
  $('waterFill').style.height=`${Math.min(100,moist/12*100)}%`;

  if(ventMode==='practical' && strategy!=='mechanical'){
    $('effectiveArea').textContent=fmt(pf.area,2);$('estimatedFlow').textContent=fmt(pf.flow,0);
    $('estimatedRange').textContent=`${fmt(pf.low,0)}–${fmt(pf.high,0)}`;$('openAch').textContent=fmt(pf.flow/vol,2)
  }
  $('strategyBadge').textContent=ventMode==='technical'?'CAUDAL CONOCIDO':pf.estimated?'CAUDAL ESTIMADO':'CAUDAL INGRESADO';
  $('strategyBadge').className='drying-badge '+(pf.estimated?'mild':'good');

  $('scenarioText').textContent=`${ventMode==='technical'?'Caudal técnico':pf.label} · ${ventMinutes} min · ${fmt(c.Q,0)} m³/h`;

  $('activeFlow').textContent=fmt(c.Q,0);$('beforeVentRh').textContent=fmt(c.RH,0);$('afterVentRh').textContent=fmt(c.rh1,0);
  $('vaporReduction').textContent=fmt(c.reduction,0);$('impactPct').textContent=fmt(c.reduction,0);
  $('impactRing').style.setProperty('--impact-pct',`${clamp(c.reduction,0,100)}%`);
  $('waterRemoved').textContent=`${fmt(c.gramsRemoved,0)} g`;$('ventAirChanges').textContent=fmt(c.airChanges,2);
  $('reqflow').textContent=Number.isFinite(req)?`${fmt(req,0)} m³/h`:'No viable';$('reqach').textContent=Number.isFinite(reqAch)?fmt(reqAch,2):'—';

  $('ventAdviceText').textContent=advice.text;$('ventAdviceBadge').textContent=advice.label;$('ventAdviceBadge').className=`drying-badge ${advice.cls}`;
  $('timelineSubtitle').textContent=`${fmt(c.RH,0)}% → ${fmt(c.rh1,0)}% HR en ${ventMinutes} min`;

  let cls='safe',txt=`La estrategia seleccionada reduce el exceso de vapor aproximadamente ${fmt(c.reduction,0)}% en ${ventMinutes} min.`;
  if(dry.delta<=.2){cls='danger';txt='Con estas condiciones exteriores no hay capacidad neta de secado significativa.'}
  else if(c.rh1>=80){cls='danger';txt='Aun después de ventilar, la HR estimada seguiría muy alta.'}
  else if(c.rh1>=70){cls='warn';txt='La ventilación ayuda, pero la HR posterior seguiría alta.'}
  else if(c.rh1>=60){cls='warn';txt='La ventilación mejora el ambiente y deja la HR en una zona moderada.'}
  $('status').className='callout '+cls;$('status').innerHTML=`<b>${txt}</b> Resultado estimado: ${fmt(c.RH,0)}% → ${fmt(c.rh1,0)}% HR.`;

  // Drying section
  $('aho').textContent=`${fmt(dry.outside,2)} g/m³`;$('ahi').textContent=`${fmt(dry.inside,2)} g/m³`;
  $('aho2').textContent=fmt(dry.outside,2);$('ahi2').textContent=fmt(dry.inside,2);
  $('outsideState').textContent=`${fmt(c.Te,1)}°C · ${fmt(c.RHe,0)}% HR`;
  $('insideState').textContent=`${fmt(c.Ti,1)}°C · ${fmt(c.RH,0)}% HR`;
  $('dryingPer100').textContent=dry.delta>0?`${fmt(dry.per100,2)} L / 100 m³`:'Sin capacidad neta';
  $('dryingBadge').textContent=dry.label;$('dryingBadge').className=`drying-badge ${dry.cls}`;
  $('dew').textContent=fmt(dewFromAH(c.ahi,c.Ti),1);

  renderHouse(c);drawTimeline(c);renderComparison(vol,req);drawTechnicalCurve()
}

document.querySelectorAll('[data-volume-mode]').forEach(b=>b.onclick=()=>setVolumeMode(b.dataset.volumeMode));
document.querySelectorAll('[data-moist-mode]').forEach(b=>b.onclick=()=>setMoistMode(b.dataset.moistMode));
document.querySelectorAll('[data-vent-mode]').forEach(b=>b.onclick=()=>setVentMode(b.dataset.ventMode));
document.querySelectorAll('[data-strategy]').forEach(b=>b.onclick=()=>setStrategy(b.dataset.strategy));
document.querySelectorAll('[data-min]').forEach(b=>b.onclick=()=>{ventMinutes=+b.dataset.min;document.querySelectorAll('[data-min]').forEach(x=>x.classList.toggle('active',x===b));render()});

['roomL','roomW','roomH','vol','ti','te','rhe','target','people','showers','cooking','laundry','personHours','personRate','showerLiters','laundryLiters','moist','openW','openH','openPct','windLevel','mechanicalFlow','flow'].forEach(id=>$(id)?.addEventListener('input',render));
$('proposalSlider')?.addEventListener('input',render);
$('useRequired')?.addEventListener('click',()=>{const r=required();if(Number.isFinite(r)){$('proposalSlider').value=clamp(Math.round(r/5)*5,5,500);render()}});
$('applyProposal')?.addEventListener('click',()=>{setVentMode('technical');$('flow').value=$('proposalSlider').value;render()});

setVolumeMode('dims');setMoistMode('sources');setVentMode('practical');setStrategy('cross');render();
