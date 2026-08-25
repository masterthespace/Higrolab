const $=id=>document.getElementById(id);
const fmt=(n,d=0)=>Number.isFinite(n)?n.toFixed(d).replace('.',','):'—';
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

function num(id,fallback=0,min=-Infinity,max=Infinity){
  const el=$(id),raw=el?Number(el.value):NaN;
  return clamp(Number.isFinite(raw)?raw:fallback,min,max);
}

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
  if(mode==='known'){
    $('ach').disabled=false;
    return num('ach',.5,0,10);
  }
  const v=Math.max(0,Number(mode)||0);
  $('ach').value=v.toFixed(2);
  $('ach').disabled=true;
  return v;
}

function syncRoofArea(g){
  const manual=$('roofManual').checked;
  $('roofArea').readOnly=!manual;
  if(!manual)$('roofArea').value=g.roof.toFixed(1);
  $('roofModeHelp').textContent=manual?'Área manual definida por usuario':'Área automática = huella de la vivienda';
}

function syncFloor(){
  const type=$('floorType').value;
  const adiabatic=type==='adiabatic';
  $('floorU').disabled=adiabatic;
  $('floorUWrap').classList.toggle('hl2-disabled',adiabatic);
  if(type==='ground'){
    $('floorULabel').textContent='U equivalente piso-terreno [W/m²K]';
    $('floorMethodNote').textContent='Valor equivalente ingresado por usuario; HIDROLAB no aplica factor oculto.';
  }else if(type==='adiabatic'){
    $('floorULabel').textContent='U piso [W/m²K]';
    $('floorMethodNote').textContent='Recinto acondicionado contiguo: se considera sin flujo térmico.';
  }else{
    $('floorULabel').textContent='U piso [W/m²K]';
    $('floorMethodNote').textContent='Piso ventilado / exterior: U · A · ΔT.';
  }
}

function calculate(){
  const g=geometry();
  const Ti=num('ti',20),Te=num('te',5),dT=Math.abs(Ti-Te);

  syncRoofArea(g);
  syncFloor();

  const winA=num('windowArea',12,0);
  const doorA=num('doorArea',4,0);
  const wallA=Math.max(0,g.grossWalls-winA-doorA);

  const wallU=num('wallU',.60,.01);
  const winU=num('windowU',2.8,.01);
  const doorU=num('doorU',2.2,.01);
  const roofA=num('roofArea',g.roof,0);
  const roofU=num('roofU',.45,.01);
  const floorType=$('floorType').value;
  const floorU=num('floorU',.60,.01);
  const ach=achValue();
  const bridgeH=num('bridgeH',0,0);

  const wallLoss=wallU*wallA*dT;
  const windowLoss=winU*winA*dT;
  const doorLoss=doorU*doorA*dT;
  const roofLoss=roofU*roofA*dT;
  const floorLoss=floorType==='adiabatic'?0:floorU*g.floor*dT;
  const airLoss=.33*ach*g.volume*dT;
  const bridgeLoss=bridgeH*dT;

  const transmission=wallLoss+windowLoss+doorLoss+roofLoss+floorLoss;
  const total=transmission+airLoss+bridgeLoss;
  const totalSafe=Math.max(total,1);

  const parts=[
    {id:'walls',name:'Muros',loss:wallLoss},
    {id:'windows',name:'Ventanas',loss:windowLoss},
    {id:'roof',name:'Techumbre',loss:roofLoss},
    {id:'floor',name:'Piso',loss:floorLoss},
    {id:'air',name:'Ventilación / infiltración',loss:airLoss},
    {id:'doors',name:'Puertas',loss:doorLoss},
    {id:'bridges',name:'Puentes térmicos',loss:bridgeLoss}
  ].sort((a,b)=>b.loss-a.loss);

  $('deltaTOut').textContent=fmt(dT,1);
  $('usefulAreaOut').textContent=fmt(g.useful,1);
  $('footprintOut').textContent=fmt(g.footprint,1);
  $('volumeOut').textContent=fmt(g.volume,1);
  $('grossWallOut').textContent=fmt(g.grossWalls,1);

  $('wallArea').textContent=fmt(wallA,1)+' m²';
  $('wallGrossHelp').textContent=`${fmt(g.grossWalls,1)} m² brutos − ${fmt(winA+doorA,1)} m² de vanos`;
  $('floorArea').textContent=fmt(g.floor,1)+' m²';

  $('wallLoss').textContent=fmt(wallLoss,0);
  $('windowLoss').textContent=fmt(windowLoss,0);
  $('doorLoss').textContent=fmt(doorLoss,0);
  $('roofLoss').textContent=fmt(roofLoss,0);
  $('floorLoss').textContent=fmt(floorLoss,0);
  $('airLoss').textContent=fmt(airLoss,0);
  $('bridgeLoss').textContent=fmt(bridgeLoss,0)+' W';
  $('bridgeStatus').textContent=bridgeH>0?`ΣψL = ${fmt(bridgeH,2)} W/K`:'No considerados';
  $('airFormula').textContent=`0,33 × ${fmt(ach,2)} × ${fmt(g.volume,0)} × ${fmt(dT,1)}`;

  $('kw').textContent=fmt(total/1000,2);
  $('total').textContent=fmt(total,0)+' W';
  $('specific').textContent=fmt(g.useful?total/g.useful:0,1)+' W/m²';
  $('trans').textContent=fmt(transmission,0)+' W';
  $('otherLoss').textContent=fmt(airLoss+bridgeLoss,0)+' W';
  $('resultSentence').textContent=`Para mantener ${fmt(Ti,1)} °C con ${fmt(Te,1)} °C exterior, la vivienda pierde aproximadamente ${fmt(total/1000,2)} kW en estas condiciones.`;

  const max=Math.max(...parts.map(p=>p.loss),1);
  $('lossRanking').innerHTML=parts.map((p,i)=>`
    <div class="heat-rank-row">
      <span class="rank">${i+1}</span>
      <div><b>${p.name}</b><small>${fmt(p.loss/totalSafe*100,0)}% del total</small></div>
      <div class="heat-rank-track"><i style="width:${p.loss/max*100}%"></i></div>
      <strong>${fmt(p.loss,0)} W</strong>
    </div>`).join('');

  const dom=parts.find(p=>p.loss>0)||parts[0];
  $('dominantAdvice').innerHTML=`<b>Prioridad: ${dom.name}</b><span>Concentra aproximadamente ${fmt(dom.loss/totalSafe*100,0)}% de la pérdida instantánea calculada.</span>`;

  const ids={walls:'hmWalls',windows:'hmWindows',roof:'hmRoof',floor:'hmFloor',air:'hmAir',doors:'hmDoors',bridges:'hmBridges'};
  parts.forEach(p=>{
    const out=$(ids[p.id]);
    if(out)out.textContent=fmt(p.loss/totalSafe*100,0)+'%';
    const tile=document.querySelector(`.hl2-hm-item[data-part="${p.id}"]`);
    if(tile){
      tile.style.setProperty('--heat',clamp(p.loss/max,0,1));
      tile.classList.toggle('zero',p.loss<.5);
    }
  });

  renderImprovements({g,dT,wallA,wallU,winA,winU,roofA,roofU,ach,total});

  window.__heatloss={
    Ti,Te,dT,g,wallA,winA,doorA,roofA,floorArea:g.floor,
    wallU,winU,doorU,roofU,floorType,floorU,ach,bridgeH,
    wallLoss,windowLoss,doorLoss,roofLoss,floorLoss,airLoss,bridgeLoss,
    transmission,total,parts
  };
}

function renderImprovements(c){
  const wallTarget=num('improveWallU',.40,.01);
  const winTarget=num('improveWindowU',1.8,.01);
  const roofTarget=num('improveRoofU',.30,.01);
  const achTarget=num('improveAch',.30,0);
  const opts=[
    {name:'Mejorar muros',save:Math.max(0,(c.wallU-wallTarget)*c.wallA*c.dT),note:`U ${fmt(c.wallU,2)} → ${fmt(wallTarget,2)}`},
    {name:'Mejorar ventanas',save:Math.max(0,(c.winU-winTarget)*c.winA*c.dT),note:`U ${fmt(c.winU,2)} → ${fmt(winTarget,2)}`},
    {name:'Mejorar techumbre',save:Math.max(0,(c.roofU-roofTarget)*c.roofA*c.dT),note:`U ${fmt(c.roofU,2)} → ${fmt(roofTarget,2)}`},
    {name:'Reducir infiltración',save:Math.max(0,.33*(c.ach-achTarget)*c.g.volume*c.dT),note:`${fmt(c.ach,2)} → ${fmt(achTarget,2)} ACH`}
  ].sort((a,b)=>b.save-a.save);

  const mx=Math.max(...opts.map(o=>o.save),1);
  $('improvementRanking').innerHTML=opts.map((o,i)=>`
    <div class="improvement-row ${i===0&&o.save>0?'best':''}">
      <div><small>${i===0&&o.save>0?'MAYOR IMPACTO ESTIMADO':''}</small><b>${o.name}</b><span>${o.note}</span></div>
      <div class="improvement-track"><i style="width:${o.save/mx*100}%"></i></div>
      <strong>−${fmt(o.save,0)} W</strong>
    </div>`).join('');
}

function bind(){
  const ids=['ti','te','length','width','height','levels','wallU','windowArea','windowU','doorArea','doorU','roofArea','roofU','floorU','ach','bridgeH','improveWallU','improveWindowU','improveRoofU','improveAch'];
  ids.forEach(id=>$(id)?.addEventListener('input',calculate));
  $('roofManual').addEventListener('change',calculate);
  $('floorType').addEventListener('change',calculate);
  $('airMode').addEventListener('change',calculate);
  calculate();
}
window.addEventListener('DOMContentLoaded',bind);

window.HIDROLAB_HEATLOSS_REPORT=()=>window.__heatloss?{
  title:'Pérdidas térmicas de la vivienda',
  conditions:{
    Ti:window.__heatloss.Ti,Te:window.__heatloss.Te,dT:window.__heatloss.dT,
    volume:window.__heatloss.g.volume,floorArea:window.__heatloss.g.useful,
    footprint:window.__heatloss.g.footprint,grossWalls:window.__heatloss.g.grossWalls
  },
  wall:{
    layers:[],
    Rt:null,U:window.__heatloss.wallU,area:window.__heatloss.wallA,loss:window.__heatloss.wallLoss,
    source:'U ingresado directamente por usuario'
  },
  inputs:{
    windowArea:window.__heatloss.winA,windowU:window.__heatloss.winU,
    doorArea:window.__heatloss.doorA,doorU:window.__heatloss.doorU,
    roofArea:window.__heatloss.roofA,roofU:window.__heatloss.roofU,
    floorArea:window.__heatloss.floorArea,floorType:window.__heatloss.floorType,floorU:window.__heatloss.floorU,
    bridgeH:window.__heatloss.bridgeH
  },
  elements:window.__heatloss.parts,
  total:window.__heatloss.total,
  transmission:window.__heatloss.transmission,
  airLoss:window.__heatloss.airLoss,
  bridgeLoss:window.__heatloss.bridgeLoss,
  ach:window.__heatloss.ach,
  energy:{
    h8:window.__heatloss.total/1000*8,
    h12:window.__heatloss.total/1000*12,
    h24:window.__heatloss.total/1000*24
  }
}:null;
