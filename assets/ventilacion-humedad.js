const A=17.62,B=243.12,$=id=>document.getElementById(id),
fmt=(n,d=1)=>Number.isFinite(n)?n.toFixed(d).replace('.',','):'—',
clamp=(x,a,b)=>Math.min(b,Math.max(a,x));

let volumeMode='dims',moistMode='sources',ventMinutes=15;

function ps(T){return 6.112*Math.exp(A*T/(B+T))}
function pv(T,RH){return ps(T)*RH/100}
function absHumidity(T,RH){return 216.7*pv(T,RH)/(T+273.15)}
function rhFromAH(ah,T){const p=ah*(T+273.15)/216.7;return 100*p/ps(T)}
function dewFromAH(ah,T){const p=Math.max(.001,ah*(T+273.15)/216.7),l=Math.log(p/6.112);return B*l/(A-l)}

function volume(){
  if(volumeMode==='direct')return Math.max(1,+$('vol').value||1);
  return Math.max(1,(+$('roomL').value||0)*(+$('roomW').value||0)*(+$('roomH').value||0))
}
function moistureKgDay(){
  if(moistMode==='manual')return Math.max(0,+$('moist').value||0);
  const people=Math.max(0,+$('people').value||0),
        ph=clamp(+$('personHours').value||0,0,24),
        pr=Math.max(0,+$('personRate').value||0),
        showers=Math.max(0,+$('showers').value||0),
        showerL=Math.max(0,+$('showerLiters').value||0),
        cooking=Math.max(0,+$('cooking').value||0),
        laundry=Math.max(0,+$('laundry').value||0),
        laundryL=Math.max(0,+$('laundryLiters').value||0);
  return (people*ph*pr)/1000 + showers*showerL + cooking + laundry*laundryL
}
function equilibrium(flow){
  const Ti=+$('ti').value,Te=+$('te').value,RHe=clamp(+$('rhe').value,1,100),
        Ggh=moistureKgDay()*1000/24,
        aho=absHumidity(Te,RHe),
        ahi=aho+Ggh/Math.max(1,flow),
        RH=rhFromAH(ahi,Ti);
  return{RH,Ti,Te,RHe,aho,ahi,Ggh}
}
function required(){
  const Ti=+$('ti').value,Te=+$('te').value,RHe=clamp(+$('rhe').value,1,100),
        target=clamp(+$('target').value,20,95),
        Ggh=moistureKgDay()*1000/24,
        aho=absHumidity(Te,RHe),
        ahTarget=absHumidity(Ti,target);
  if(ahTarget<=aho)return Infinity;
  return Ggh/Math.max(1e-8,ahTarget-aho)
}
function setVolumeMode(mode){
  volumeMode=mode==='direct'?'direct':'dims';
  document.querySelectorAll('[data-volume-mode]').forEach(b=>b.classList.toggle('active',b.dataset.volumeMode===volumeMode));
  $('dimsFields').classList.toggle('hidden',volumeMode!=='dims');
  $('directVolField').classList.toggle('hidden',volumeMode!=='direct');
  render()
}
function setMoistMode(mode){
  moistMode=mode==='manual'?'manual':'sources';
  document.querySelectorAll('[data-moist-mode]').forEach(b=>b.classList.toggle('active',b.dataset.moistMode===moistMode));
  $('sourceFields').classList.toggle('hidden',moistMode!=='sources');
  $('manualMoistField').classList.toggle('hidden',moistMode!=='manual');
  render()
}
function humidityClass(rh){
  if(rh<60)return{label:'CONTROLADA',color:'#2f9867'};
  if(rh<70)return{label:'MODERADA',color:'#c7a12b'};
  if(rh<80)return{label:'ALTA',color:'#e18431'};
  return{label:'MUY ALTA',color:'#cf4f4f'}
}
function dryingData(e){
  const delta=e.ahi-e.aho,per100=Math.max(0,delta*100/1000);
  let label='DESFAVORABLE',cls='bad';
  if(delta>5){label='MUY FAVORABLE';cls='great'}
  else if(delta>2){label='FAVORABLE';cls='good'}
  else if(delta>.5){label='POCO EFECTIVO';cls='mild'}
  return{outside:e.aho,inside:e.ahi,delta,per100,label,cls}
}
function crossVentilation(){
  const vol=volume(),
        Q=Math.max(1,+$('crossFlow').value||1),
        tH=ventMinutes/60,
        e0=equilibrium(Math.max(1,+$('flow').value||1)),
        ah0=e0.ahi,aho=e0.aho,
        ach=Q/vol,
        decay=Math.exp(-ach*tH),
        ah1=aho+(ah0-aho)*decay,
        rh1=rhFromAH(ah1,e0.Ti),
        excess0=Math.max(0,ah0-aho),
        excess1=Math.max(0,ah1-aho),
        reduction=excess0>0?(1-excess1/excess0)*100:0,
        gramsRemoved=Math.max(0,(ah0-ah1)*vol),
        airChanges=ach*tH;
  return{...e0,Q,tH,ach,ah0,ah1,rh1,reduction,gramsRemoved,airChanges,aho}
}
function recommendation(e,dry,cross){
  const target=clamp(+$('target').value,20,95);
  if(dry.delta<=0.2){
    return{label:'NO CONVIENE',cls:'bad',
      text:`Con las condiciones ingresadas, el aire exterior no es más seco en términos absolutos que el aire interior estimado. Ventilar puede no reducir la humedad y sí enfriar el recinto. Prioriza extracción localizada o deshumidificación.`}
  }
  if(e.RH<=target){
    return{label:'MANTENCIÓN',cls:'good',
      text:`La HR estimada ya está cerca o por debajo del objetivo. Una ventilación breve sirve principalmente para evacuar picos de vapor después de duchas, cocina o secado de ropa.`}
  }
  if(cross.reduction>=50){
    return{label:'RECOMENDADA',cls:'great',
      text:`El aire exterior tiene capacidad de secado y una ventilación cruzada de ${ventMinutes} min podría retirar aproximadamente ${fmt(cross.reduction,0)}% del exceso de vapor sobre el nivel exterior en este modelo.`}
  }
  return{label:'AYUDA PARCIAL',cls:'mild',
    text:`El aire exterior ayuda a secar, pero con ${ventMinutes} min y el caudal simulado la reducción del exceso de vapor sería de aproximadamente ${fmt(cross.reduction,0)}%. Puedes aumentar el tiempo o el caudal de ventilación cruzada.`}
}
function drawMain(){
  const W=900,H=410,L=62,R=25,T=25,BT=52,minX=5,maxX=500,minY=30,maxY=110,
        sx=x=>L+(x-minX)/(maxX-minX)*(W-L-R),
        sy=y=>T+(maxY-y)/(maxY-minY)*(H-T-BT);
  let s=`<rect width="${W}" height="${H}" fill="#fbfcfc"/>`;
  [[30,60,'#e8f5ef'],[60,70,'#eef5dc'],[70,80,'#fff5db'],[80,100,'#fff0e5'],[100,110,'#fde8e8']].forEach(z=>s+=`<rect x="${L}" y="${sy(z[1])}" width="${W-L-R}" height="${sy(z[0])-sy(z[1])}" fill="${z[2]}"/>`);
  [40,50,60,70,80,90,100].forEach(y=>s+=`<line x1="${L}" y1="${sy(y)}" x2="${W-R}" y2="${sy(y)}" stroke="#dfe7ea"/><text x="${L-10}" y="${sy(y)+4}" text-anchor="end" font-size="11" fill="#667983">${y}%</text>`);
  [50,100,150,200,250,300,350,400,450,500].forEach(x=>s+=`<line x1="${sx(x)}" y1="${T}" x2="${sx(x)}" y2="${H-BT}" stroke="#e7edef"/><text x="${sx(x)}" y="${H-26}" text-anchor="middle" font-size="10" fill="#667983">${x}</text>`);
  let pts=[];for(let x=5;x<=500;x+=5)pts.push(`${sx(x)},${sy(clamp(equilibrium(x).RH,minY,maxY))}`);
  const flow=Math.max(1,+$('flow').value||1),e=equilibrium(flow),hc=humidityClass(e.RH);
  s+=`<polyline points="${pts.join(' ')}" fill="none" stroke="#176d91" stroke-width="4"/><circle cx="${sx(clamp(flow,minX,maxX))}" cy="${sy(clamp(e.RH,minY,maxY))}" r="7" fill="${hc.color}" stroke="white" stroke-width="3"/><text x="${W/2}" y="${H-6}" text-anchor="middle" font-size="12" font-weight="700" fill="#52636c">Caudal de ventilación (m³/h)</text><text x="16" y="${H/2}" transform="rotate(-90 16 ${H/2})" text-anchor="middle" font-size="12" font-weight="700" fill="#52636c">HR interior de equilibrio</text>`;
  $('chart').innerHTML=s
}
function drawVentTimeline(cross){
  const W=900,H=280,L=58,R=24,T=20,B=45,minY=30,maxY=100,
        sx=m=>L+m/Math.max(1,ventMinutes)*(W-L-R),
        sy=rh=>T+(maxY-rh)/(maxY-minY)*(H-T-B);
  let s=`<rect width="${W}" height="${H}" fill="#fbfcfc"/>`;
  [40,50,60,70,80,90].forEach(y=>s+=`<line x1="${L}" y1="${sy(y)}" x2="${W-R}" y2="${sy(y)}" stroke="#e1e8ea"/><text x="${L-8}" y="${sy(y)+4}" text-anchor="end" font-size="10" fill="#6d7e85">${y}%</text>`);
  const target=clamp(+$('target').value,20,95);
  s+=`<line x1="${L}" y1="${sy(target)}" x2="${W-R}" y2="${sy(target)}" stroke="#6ca24b" stroke-width="2" stroke-dasharray="6 5"/><text x="${W-R-4}" y="${sy(target)-6}" text-anchor="end" font-size="10" fill="#5c8c40">Objetivo ${fmt(target,0)}%</text>`;
  let pts=[];
  for(let m=0;m<=ventMinutes;m+=Math.max(.5,ventMinutes/40)){
    const ah=cross.aho+(cross.ah0-cross.aho)*Math.exp(-cross.ach*(m/60));
    const rh=rhFromAH(ah,cross.Ti);
    pts.push(`${sx(m)},${sy(clamp(rh,minY,maxY))}`);
  }
  s+=`<polyline points="${pts.join(' ')}" fill="none" stroke="#1683a4" stroke-width="4"/><circle cx="${sx(0)}" cy="${sy(clamp(cross.RH,minY,maxY))}" r="5" fill="#d26056"/><circle cx="${sx(ventMinutes)}" cy="${sy(clamp(cross.rh1,minY,maxY))}" r="6" fill="#399461"/><text x="${W/2}" y="${H-8}" text-anchor="middle" font-size="11" fill="#60747c">Minutos de ventilación cruzada</text>`;
  $('ventTimelineChart').innerHTML=s
}
function renderHouse(e,ach,flow){
  const hc=humidityClass(e.RH),opacity=clamp((e.RH-40)/60,.06,.8);
  $('humidityCloud').style.opacity=opacity;
  $('houseRhText').textContent=`${fmt(e.RH,0)} % HR`;
  $('houseRhText').style.fill=hc.color;
  $('houseAchText').textContent=`${fmt(ach,2)} ACH`;
  $('houseStatus').textContent=hc.label;$('houseStatus').style.color=hc.color;
  const room=$('houseViz');
  room.style.setProperty('--room-risk-color',hc.color);
  room.classList.toggle('house-good',e.RH<60);
  const dur=clamp(2.6-Math.log10(Math.max(5,flow))*.7,.45,2.5);
  document.querySelectorAll('.air-stream').forEach(g=>g.style.setProperty('--air-duration',`${dur}s`));
  $('airMotionLabel').textContent=flow<40?'Movimiento de aire bajo':flow<120?'Ventilación moderada':'Ventilación intensa'
}
function renderComparison(vol,req){
  const current=Math.max(1,+$('flow').value||1),proposed=Math.max(1,+$('proposalSlider').value||1),
        a=equilibrium(current),b=equilibrium(proposed);
  $('cmpCurrentFlow').textContent=fmt(current,0);$('cmpPropFlow').textContent=fmt(proposed,0);
  $('cmpCurrentRh').textContent=`${fmt(a.RH,0)}%`;$('cmpPropRh').textContent=`${fmt(b.RH,0)}%`;
  $('cmpCurrentAch').textContent=fmt(current/vol,2);$('cmpPropAch').textContent=fmt(proposed/vol,2);
  const delta=b.RH-a.RH;$('compareDelta').textContent=`${delta>0?'+':''}${fmt(delta,0)} pp`;
  $('compareDelta').className=delta<0?'better':delta>0?'worse':'';
  $('proposalLabel').textContent=`${fmt(proposed,0)} m³/h`
}
function render(){
  const vol=volume(),flow=Math.max(1,+$('flow').value||1),moist=moistureKgDay(),
        e=equilibrium(flow),req=required(),ach=flow/vol,reqAch=Number.isFinite(req)?req/vol:Infinity,
        hc=humidityClass(e.RH),dry=dryingData(e),cross=crossVentilation(),advice=recommendation(e,dry,cross);

  $('volOut').textContent=fmt(vol,1);
  $('flowSlider').value=clamp(flow,5,500);$('flowLabel').textContent=`${fmt(flow,0)} m³/h`;
  $('moistOut').textContent=fmt(moist,2);$('waterL').textContent=`${fmt(moist,1)} L`;
  $('waterFill').style.height=`${Math.min(100,moist/12*100)}%`;

  $('ach').textContent=fmt(ach,2);$('eqrh').textContent=fmt(e.RH,0);
  $('reqflow').textContent=Number.isFinite(req)?fmt(req,0):'No viable';
  $('reqach').textContent=Number.isFinite(reqAch)?fmt(reqAch,2):'—';

  $('rhTankFill').style.height=`${clamp(e.RH,0,100)}%`;$('rhTankFill').style.background=hc.color;
  $('tankTarget').style.bottom=`${clamp(+$('target').value,0,100)}%`;$('tankRh').textContent=`${fmt(e.RH,0)}%`;

  let cls='safe',txt='La HR estimada queda en una zona relativamente controlada para este modelo.';
  if(e.RH>=100){cls='danger';txt='El balance predice saturación: la generación de vapor supera la capacidad de evacuación del caudal actual.'}
  else if(e.RH>=80){cls='danger';txt='La HR de equilibrio es muy alta. Aumentar ventilación o reducir generación de humedad disminuye el valor.'}
  else if(e.RH>=70){cls='warn';txt='La HR estimada es alta; conviene revisar caudal, fuentes de humedad y temperatura interior.'}
  else if(e.RH>=60){cls='warn';txt='La HR estimada está en una zona moderada-alta. El objetivo seleccionado puede requerir más caudal.'}
  $('status').className='callout '+cls;
  $('status').innerHTML=`<b>${txt}</b> Con ${fmt(flow,0)} m³/h y ${fmt(moist,2)} L eq./día de vapor, el equilibrio estimado es ${fmt(e.RH,0)}% HR.`;

  $('aho').textContent=`${fmt(dry.outside,2)} g/m³`;$('ahi').textContent=`${fmt(dry.inside,2)} g/m³`;
  $('aho2').textContent=fmt(dry.outside,2);$('ahi2').textContent=fmt(dry.inside,2);
  $('outsideState').textContent=`${fmt(e.Te,1)}°C · ${fmt(e.RHe,0)}% HR`;
  $('insideState').textContent=`${fmt(e.Ti,1)}°C · ${fmt(e.RH,0)}% HR`;
  $('dryingPer100').textContent=dry.delta>0?`${fmt(dry.per100,2)} L / 100 m³`:'Sin capacidad neta';
  $('dryingBadge').textContent=dry.label;$('dryingBadge').className=`drying-badge ${dry.cls}`;
  $('dew').textContent=fmt(dewFromAH(e.ahi,e.Ti),1);

  $('crossFlowLabel').textContent=`${fmt(cross.Q,0)} m³/h`;
  $('vaporReduction').textContent=fmt(cross.reduction,0);
  $('beforeVentRh').textContent=`${fmt(cross.RH,0)}%`;$('afterVentRh').textContent=`${fmt(cross.rh1,0)}%`;
  $('waterRemoved').textContent=`${fmt(cross.gramsRemoved,0)} g`;
  $('ventAirChanges').textContent=fmt(cross.airChanges,2);
  $('impactRing').style.setProperty('--impact-pct',`${clamp(cross.reduction,0,100)}%`);
  $('ventAdviceText').textContent=advice.text;
  $('ventAdviceBadge').textContent=advice.label;$('ventAdviceBadge').className=`drying-badge ${advice.cls}`;
  $('timelineSubtitle').textContent=`${fmt(cross.RH,0)}% → ${fmt(cross.rh1,0)}% HR en ${ventMinutes} min`;

  renderHouse(e,ach,flow);renderComparison(vol,req);drawVentTimeline(cross);drawMain()
}

document.querySelectorAll('[data-volume-mode]').forEach(b=>b.onclick=()=>setVolumeMode(b.dataset.volumeMode));
document.querySelectorAll('[data-moist-mode]').forEach(b=>b.onclick=()=>setMoistMode(b.dataset.moistMode));
document.querySelectorAll('[data-min]').forEach(b=>b.onclick=()=>{ventMinutes=+b.dataset.min;document.querySelectorAll('[data-min]').forEach(x=>x.classList.toggle('active',x===b));render()});
$('flowSlider').oninput=()=>{$('flow').value=$('flowSlider').value;render()};
$('flow').oninput=render;$('proposalSlider').oninput=render;$('crossFlow').oninput=render;
$('useRequired').onclick=()=>{const r=required();if(Number.isFinite(r)){$('proposalSlider').value=clamp(Math.round(r/5)*5,5,500);render()}};
$('applyProposal').onclick=()=>{$('flow').value=$('proposalSlider').value;$('flowSlider').value=$('proposalSlider').value;render()};
['roomL','roomW','roomH','vol','ti','te','rhe','target','people','showers','cooking','laundry','personHours','personRate','showerLiters','laundryLiters','moist'].forEach(id=>$(id).addEventListener('input',render));
setVolumeMode('dims');setMoistMode('sources');render();
