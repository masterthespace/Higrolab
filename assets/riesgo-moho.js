const A=17.62,B=243.12,R_SI=0.13,R_SE=0.04,$=id=>document.getElementById(id),
fmt=(n,d=1)=>Number.isFinite(n)?n.toFixed(d).replace('.',','):'—',
clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
let inputMode='measured',layers=[];

const MATERIALS={
  eps:{name:'EPS',lambda:0.038,min:20,max:100,step:10,thickness:50,source:'NCh853:2021 / valor según densidad; verificar producto'},
  concrete:{name:'Hormigón armado',lambda:1.63,min:100,max:250,step:10,thickness:150,source:'NCh853:2021 · hormigón armado normal · ρ 2400 kg/m³'},
  masonry_armada:{name:'Albañilería armada',lambda:0.80,min:150,max:150,step:1,thickness:150,source:'Preset HIDROLAB · verificar solución real/LOSCAT'},
  masonry_reforzada:{name:'Albañilería reforzada',lambda:0.80,min:150,max:150,step:1,thickness:150,source:'Preset HIDROLAB · verificar solución real/LOSCAT'},
  fibercement:{name:'Placa fibrocemento / Permanit',lambda:0.35,min:4,max:12,step:2,thickness:8,source:'Preset HIDROLAB · usar ficha/ensayo del producto'},
  osb:{name:'OSB',lambda:0.13,min:11,max:11,step:1,thickness:11,source:'Preset HIDROLAB · verificar densidad/producto'},
  glasswool:{name:'Lana de vidrio',lambda:0.040,min:80,max:140,step:10,thickness:100,source:'Preset HIDROLAB · usar λ acreditada del producto'},
  mineralwool:{name:'Lana mineral',lambda:0.039,min:80,max:140,step:10,thickness:100,source:'Preset HIDROLAB · usar λ acreditada del producto'},
  gypsum:{name:'Yeso-cartón',lambda:0.25,min:12,max:12,step:1,thickness:12,source:'Preset HIDROLAB · verificar producto/densidad'},
  plaster:{name:'Estuco / mortero',lambda:0.87,min:5,max:25,step:5,thickness:15,source:'Preset HIDROLAB · no asumir como valor acreditado'},
  air:{name:'Cámara de aire',R:0.18,kind:'air',thickness:25,source:'NCh853:2021 · cámara no ventilada 25 mm · flujo horizontal'},
  gypsum_eps:{name:'Panel yeso-cartón + EPS (interior)',R:0.523,kind:'composite',thickness:30,product:'Volcapol 30 mm'},
  custom:{name:'Material personalizado',lambda:0.20,min:1,max:300,step:1,thickness:20,source:'Valor ingresado por usuario'}
};
const GYPSUM_EPS_PRODUCTS={
  'vol_20':{label:'Volcapol 20 mm · Yeso 10 + EPS 10',thickness:20,R:.281},
  'vol_25':{label:'Volcapol 25 mm · Yeso 10 + EPS 15',thickness:25,R:.402},
  'vol_30':{label:'Volcapol 30 mm · Yeso 10 + EPS 20',thickness:30,R:.523},
  'vol_32_5':{label:'Volcapol 32,5 mm · Yeso 12,5 + EPS 20',thickness:32.5,R:.532},
  'vol_35':{label:'Volcapol 35 mm · Yeso 15 + EPS 20',thickness:35,R:.542},
  'vol_40':{label:'Volcapol 40 mm · Yeso 10 + EPS 30',thickness:40,R:.765},
  'vol_42_5':{label:'Volcapol 42,5 mm · Yeso 12,5 + EPS 30',thickness:42.5,R:.774},
  'vol_45':{label:'Volcapol 45 mm · Yeso 15 + EPS 30',thickness:45,R:.784},
  'vol_50':{label:'Volcapol 50 mm · Yeso 10 + EPS 40',thickness:50,R:1.007},
  'vol_52_5':{label:'Volcapol 52,5 mm · Yeso 12,5 + EPS 40',thickness:52.5,R:1.017},
  'vol_55':{label:'Volcapol 55 mm · Yeso 15 + EPS 40',thickness:55,R:1.026},
  'poli_r_20':{label:'Poligyp Regular 20 mm · Yeso 10 + EPS 10',thickness:20,R:.24},
  'poli_r_30':{label:'Poligyp Regular 30 mm · Yeso 10 + EPS 20',thickness:30,R:.48},
  'poli_r_40':{label:'Poligyp Regular 40 mm · Yeso 10 + EPS 30',thickness:40,R:.73},
  'poli_g_20':{label:'Poligyp Plusgrafito 20 mm · Yeso 10 + EPS 10',thickness:20,R:.29},
  'poli_g_30':{label:'Poligyp Plusgrafito 30 mm · Yeso 10 + EPS 20',thickness:30,R:.59},
  'poli_g_40':{label:'Poligyp Plusgrafito 40 mm · Yeso 10 + EPS 30',thickness:40,R:.88}
};
const TEMPLATES={
  eifs_concrete:[['eps',50],['concrete',150],['plaster',15]],
  eifs_masonry_armada:[['eps',50],['masonry_armada',150],['plaster',15]],
  eifs_masonry_reforzada:[['eps',50],['masonry_reforzada',150],['plaster',15]],
  light_wall:[['eps',50],['fibercement',8],['air',25],['osb',11],['glasswool',100],['gypsum',12]],
  custom:[['eps',50],['concrete',150],['plaster',15]]
};

function ps(T){return 6.112*Math.exp(A*T/(B+T))}
function pv(T,RH){return ps(T)*RH/100}
function dew(T,RH){const g=Math.log(clamp(RH,1,100)/100)+A*T/(B+T);return B*g/(A-g)}
function threshold(p,target){const l=Math.log((p/target)/6.112);return B*l/(A-l)}
function scoreStyle(score){
  if(score<40)return{level:'BAJO',color:'#2f9b67'};
  if(score<60)return{level:'ATENCIÓN',color:'#d1aa2f'};
  if(score<80)return{level:'ELEVADO',color:'#e68432'};
  return{level:'MUY ALTO',color:'#d34e4e'}
}
function makeLayer(type,thickness){
  const m=MATERIALS[type]||MATERIALS.custom;
  return{id:(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)),type,name:m.name,thickness:thickness??m.thickness,lambda:m.lambda??null,R:m.R??null,kind:m.kind||'solid',source:m.source||'Preset HIDROLAB'}
}
function loadTemplate(name){
  layers=(TEMPLATES[name]||TEMPLATES.custom).map(([t,e])=>makeLayer(t,e));
  renderQuickControls(name);renderLayers();render()
}
function layerThickness(type,fallback){return layers.find(l=>l.type===type)?.thickness??fallback}
function renderQuickControls(name){
  const host=$('wallQuickControls');if(!host)return;let h='';
  if(name==='eifs_concrete'){
    h=`<label>EPS EIFS [mm]<input data-quick="eps" type="range" min="20" max="100" step="10" value="${layerThickness('eps',50)}"><b data-qout="eps">${layerThickness('eps',50)} mm</b></label>
       <label>Hormigón armado [mm]<input data-quick="concrete" type="range" min="100" max="250" step="10" value="${layerThickness('concrete',150)}"><b data-qout="concrete">${layerThickness('concrete',150)} mm</b></label>`;
  }else if(name==='eifs_masonry_armada'||name==='eifs_masonry_reforzada'){
    h=`<label>EPS EIFS [mm]<input data-quick="eps" type="range" min="20" max="100" step="10" value="${layerThickness('eps',50)}"><b data-qout="eps">${layerThickness('eps',50)} mm</b></label><label>Núcleo de albañilería<b>150 mm</b></label>`;
  }else if(name==='light_wall'){
    const wool=layers.find(l=>l.type==='glasswool'||l.type==='mineralwool');
    h=`<label>EPS exterior [mm]<input data-quick="eps" type="range" min="20" max="100" step="10" value="${layerThickness('eps',50)}"><b data-qout="eps">${layerThickness('eps',50)} mm</b></label>
       <label>Permanit [mm]<input data-quick="fibercement" type="range" min="4" max="12" step="2" value="${layerThickness('fibercement',8)}"><b data-qout="fibercement">${layerThickness('fibercement',8)} mm</b></label>
       <label>Entramado estructural [mm]<select id="studDepth"><option>60</option><option selected>70</option><option>80</option><option>90</option></select><b>Referencia geométrica</b></label>
       <label>Aislación [mm]<input data-quick="${wool?.type||'glasswool'}" type="range" min="80" max="140" step="10" value="${wool?.thickness||100}"><b data-qout="${wool?.type||'glasswool'}">${wool?.thickness||100} mm</b></label>
       <label>Tipo de lana<select id="woolType"><option value="glasswool"${wool?.type==='glasswool'?' selected':''}>Lana de vidrio</option><option value="mineralwool"${wool?.type==='mineralwool'?' selected':''}>Lana mineral</option></select><b>λ editable abajo</b></label>`;
  }
  host.innerHTML=h;
  host.querySelectorAll('[data-quick]').forEach(el=>el.addEventListener('input',()=>{
    const type=el.dataset.quick,l=layers.find(x=>x.type===type);if(l){l.thickness=+el.value;const o=host.querySelector(`[data-qout="${type}"]`);if(o)o.textContent=`${el.value} mm`;renderLayers();render()}
  }));
  const woolType=$('woolType');if(woolType)woolType.onchange=()=>{
    const i=layers.findIndex(l=>l.type==='glasswool'||l.type==='mineralwool');if(i>=0){const old=layers[i],m=MATERIALS[woolType.value];layers[i]={...old,type:woolType.value,name:m.name,lambda:m.lambda};renderQuickControls('light_wall');renderLayers();render()}
  }
}
function layerR(l){
  if(l.kind==='air'||l.kind==='composite')return clamp(+l.R||0,0,5);
  return (clamp(+l.thickness||0,0,1000)/1000)/clamp(+l.lambda||.001,.001,10)
}
function thermal(){const rLayers=layers.reduce((s,l)=>s+layerR(l),0),rTotal=R_SI+rLayers+R_SE;return{rLayers,rTotal,U:1/rTotal}}
function estimatedSurfaceTemperature(ti,te,u){return ti-u*R_SI*(ti-te)}
function persistenceData(){
  const raw=$('duration').value;
  if(raw==='manual'){
    const hours=clamp(+$('durationHours').value||0,0,24);
    const penalty=15*(hours/24);
    return{mode:'manual',hours,penalty,label:`${fmt(hours,1)} h/día`}
  }
  const level=clamp(+raw||1,1,4);
  return{mode:'preset',hours:null,penalty:(level-1)*5,label:$('duration').selectedOptions[0]?.textContent||''}
}
function data(){
  const ta=+$('ta').value,rh=clamp(+$('rh').value,1,100),te=+$('te').value,th=thermal(),measuredTs=+$('ts').value,
  ts=inputMode==='estimated'?estimatedSurfaceTemperature(ta,te,th.U):measuredTs,p=pv(ta,rh),rhs=100*p/ps(ts),d=dew(ta,rh),t80=threshold(p,.8),persist=persistenceData();
  let base=rhs<=65?10:rhs<70?20:rhs<80?40:rhs<90?65:rhs<100?82:95,score=clamp(base+persist.penalty,0,100);
  return{ta,rh,te,ts,p,rhs,d,t80,score,persist,...th}
}
function materialOptions(selected){return Object.entries(MATERIALS).map(([k,m])=>`<option value="${k}"${k===selected?' selected':''}>${m.name}</option>`).join('')}
function renderLayers(){
  const host=$('wallLayers');if(!host)return;
  host.innerHTML=layers.map((l,i)=>{
    const air=l.kind==='air',composite=l.kind==='composite';
    const productPicker=composite?`<label class="composite-picker">Producto / espesor<select class="composite-product">${Object.entries(GYPSUM_EPS_PRODUCTS).map(([k,p])=>`<option value="${k}"${Math.abs(p.R-l.R)<.0001&&p.thickness===l.thickness?' selected':''}>${p.label}</option>`).join('')}</select></label>`:'';
    return `<div class="wall-layer${composite?' composite-layer':''}" data-id="${l.id}">${productPicker}
      <div class="layer-order">${i+1}</div>
      <div class="layer-main"><select class="layer-type">${materialOptions(l.type)}</select><span class="layer-position">${i===0?'EXTERIOR':i===layers.length-1?'INTERIOR':''}</span></div>
      <label>${air?'Espesor ref.':composite?'Espesor total':'Espesor'} [mm]<input class="layer-thickness" ${composite?'readonly':''} type="number" min="1" max="1000" step="${MATERIALS[l.type]?.step||1}" value="${l.thickness}"></label>
      <label>${air?'R cámara [m²K/W]':composite?'R producto [m²K/W]':'λ [W/mK]'}<input class="layer-prop" ${composite?'readonly':''} type="number" min=".001" step="${air?'.01':'.001'}" value="${air||composite?l.R:l.lambda}"></label>
      <div class="layer-r"><span>R capa</span><b>${fmt(layerR(l),3)}</b></div><div class="layer-source"><span>Origen</span><small>${l.source||'Preset HIDROLAB'}</small></div>
      <div class="layer-actions"><button class="layer-up" type="button" title="Mover capa hacia arriba" aria-label="Mover capa hacia arriba"><span>↑</span></button><button class="layer-down" type="button" title="Mover capa hacia abajo" aria-label="Mover capa hacia abajo"><span>↓</span></button><button class="layer-delete" type="button" title="Eliminar capa" aria-label="Eliminar capa"><span>×</span></button></div>
    </div>`
  }).join('');
  host.querySelectorAll('.wall-layer').forEach(row=>{
    const id=row.dataset.id,get=()=>layers.find(l=>l.id===id);
    const cp=row.querySelector('.composite-product');
    if(cp)cp.onchange=e=>{const l=get(),p=GYPSUM_EPS_PRODUCTS[e.target.value];if(l&&p){l.thickness=p.thickness;l.R=p.R;l.product=p.label;renderLayers();render()}};
    row.querySelector('.layer-type').onchange=e=>{const l=get(),m=MATERIALS[e.target.value];if(!l||!m)return;l.type=e.target.value;l.name=m.name;l.kind=m.kind||'solid';l.lambda=m.lambda??null;l.R=m.R??null;l.thickness=m.thickness;l.product=m.product||null;l.source=m.source||'Preset HIDROLAB';$('wallTemplate').value='custom';renderQuickControls('custom');renderLayers();render()};
    row.querySelector('.layer-thickness').oninput=e=>{const l=get();if(l){l.thickness=+e.target.value;$('wallTemplate').value='custom';const rb=row.querySelector('.layer-r b');if(rb)rb.textContent=fmt(layerR(l),3);render()}};
    row.querySelector('.layer-prop').oninput=e=>{const l=get();if(l){if(l.kind==='air')l.R=+e.target.value;else l.lambda=+e.target.value;$('wallTemplate').value='custom';const rb=row.querySelector('.layer-r b');if(rb)rb.textContent=fmt(layerR(l),3);render()}};
    row.querySelector('.layer-delete').onclick=()=>{layers=layers.filter(l=>l.id!==id);$('wallTemplate').value='custom';renderLayers();render()};
    row.querySelector('.layer-up').onclick=()=>{const i=layers.findIndex(l=>l.id===id);if(i>0)[layers[i-1],layers[i]]=[layers[i],layers[i-1]];renderLayers();render()};
    row.querySelector('.layer-down').onclick=()=>{const i=layers.findIndex(l=>l.id===id);if(i>=0&&i<layers.length-1)[layers[i+1],layers[i]]=[layers[i],layers[i+1]];renderLayers();render()}
  })
}

function wallVizColor(type){
  const map={eps:'#d9e8a5',concrete:'#aeb8ba',masonry_armada:'#caa582',masonry_reforzada:'#caa582',fibercement:'#bfc9cc',osb:'#c99b67',glasswool:'#f2d779',mineralwool:'#d5c77b',gypsum:'#e6e3dc',plaster:'#d8d0c4',air:'#dff1f6',composite:'#d7e9ac'};
  return map[type]||'#c8d4d8'
}
function renderWallGraphic(d){
  const host=$('wallStackViz');if(!host)return;
  const totalMm=Math.max(1,layers.reduce((s,l)=>s+(+l.thickness||0),0));
  host.innerHTML=layers.map((l,i)=>{
    const mm=Math.max(1,+l.thickness||1);
    const flex=Math.max(.45,Math.min(5,mm/30));
    return `<div class="wall-viz-layer" style="flex:${flex};background:${wallVizColor(l.type)}" title="${l.product||l.name}: ${fmt(mm,0)} mm · R ${fmt(layerR(l),3)}"><span>${i+1}</span><b>${l.product||l.name}</b><small>${fmt(mm,0)} mm</small></div>`
  }).join('');
  $('wallVizTe').textContent=fmt(d.te,1)+' °C';$('wallVizTi').textContent=fmt(d.ta,1)+' °C';
  $('wallVizR').textContent=fmt(d.rTotal,3)+' m²K/W';$('wallVizU').textContent=fmt(d.U,2)+' W/m²K';$('wallVizTsi').textContent=fmt(d.ts,1)+' °C'
}
function renderDependencyFlow(d){
  const set=(id,val)=>{const e=$(id);if(e)e.textContent=val};
  set('flowTi',fmt(d.ta,1)+' °C');set('flowRh',fmt(d.rh,0)+' %');set('flowDew',fmt(d.d,1)+' °C');
  set('flowLayers',layers.length+' capas');set('flowR',fmt(d.rTotal,3));set('flowU',fmt(d.U,2));
  set('flowTsi',fmt(d.ts,1)+' °C');set('flowTsi2',fmt(d.ts,1));set('flowDew2',fmt(d.d,1));
  const margin=d.ts-d.d,box=$('flowRiskBox');
  let txt='Margen favorable',cls='good';
  if(margin<=0){txt='Superficie en o bajo el punto de rocío · condensación posible';cls='bad'}
  else if(margin<2){txt='Margen crítico · muy cerca del punto de rocío';cls='bad'}
  else if(margin<4){txt='Margen reducido · atención';cls='warn'}
  set('flowRiskText',txt);
  if(box)box.className='dep-final '+cls
}


function wallInterfaceProfile(d){
  const Ti=d.ta,Te=d.te,rt=Math.max(.0001,d.rTotal),q=(Ti-Te)/rt;
  const rev=[...layers].reverse(); // interior -> exterior
  const points=[{label:'Superficie interior',temp:Ti-q*R_SI,kind:'surface'}];
  let t=points[0].temp;
  rev.forEach((l,i)=>{
    t-=q*layerR(l);
    points.push({label:i===rev.length-1?'Superficie exterior':`Interfaz ${i+1}`,temp:t,kind:'interface',layer:l});
  });
  return{q,rev,points,tse:Te+q*R_SE};
}
function renderMoistureWall(d,v){
  const svg=$('moistureWallSvg'); if(!svg)return;
  const V=clamp(+$('vaporRoomVolume').value||40,5,1000);
  const ah=absHumidity(d.ta,d.rh),sat=absHumidity(d.ta,100),currentG=ah*V,capacityG=sat*V,reserveG=Math.max(0,capacityG-currentG);
  const pct=clamp(ah/sat*100,0,100),profile=wallInterfaceProfile(d),dewT=d.d;

  $('mwDew').textContent=fmt(dewT,1)+' °C';$('mwTi').textContent=fmt(d.ta,1)+' °C';$('mwTsi').textContent=fmt(d.ts,1)+' °C';
  $('mwU').textContent=fmt(d.U,2)+' W/m²K';$('mwTe').textContent=fmt(d.te,1)+' °C';
  $('airWaterAh').textContent=fmt(ah,1)+' g/m³';$('airWaterCurrent').textContent=fmt(currentG/1000,2);
  $('airWaterCapacity').textContent=fmt(capacityG/1000,2);$('airWaterReserve').textContent=fmt(reserveG/1000,2);
  $('airWaterDew').textContent=fmt(dewT,1);$('airWaterPercent').textContent=fmt(pct,0)+'%';$('airWaterFill').style.width=pct+'%';$('airWaterPercent').parentElement.style.setProperty('--p',pct+'%');

  let airState='Margen amplio',airCls='good';
  if(d.rh>=80){airState='Carga de humedad alta';airCls='warn'}
  if(d.rh>=95){airState='Muy cerca de saturación';airCls='bad'}
  $('airWaterState').textContent=airState;
  $('airWaterMessage').className='air-water-message '+airCls;
  $('airWaterMessage').innerHTML=`A ${fmt(d.ta,1)} °C y ${fmt(d.rh,0)}% HR, el aire del recinto contiene aproximadamente <b>${fmt(currentG/1000,2)} L eq.</b> de agua en fase vapor. A la misma temperatura podría contener hasta <b>${fmt(capacityG/1000,2)} L eq.</b> antes de llegar a 100% HR.`;

  if($('periodVsReserve')){
    const gen=v?.grams||0,ratio=reserveG>0?gen/reserveG:Infinity;
    $('periodVsReserve').textContent=gen>0?(ratio*100<999?fmt(ratio*100,0)+'% del margen':'>999% del margen'):'—';
    let txt='Activa horas manuales para comparar la generación con el margen actual.';
    if(gen>0&&ratio<.5)txt='La generación es menor que la mitad del margen de vapor disponible del aire.';
    else if(gen>0&&ratio<1)txt='La generación consumiría una parte importante del margen si todo permaneciera en el aire.';
    else if(gen>0)txt='La generación supera el margen actual del aire: sin extracción/ventilación, parte no podría mantenerse como vapor a esta temperatura.';
    $('periodImpactText').textContent=txt;
  }

  // SVG wall, matching the reference: interior left, exterior right.
  const W=1000,H=390,x0=185,x1=820,yTop=70,yBot=315;
  const weights=profile.rev.map(l=>Math.max(.55,Math.min(4.5,(+l.thickness||10)/35)));
  const sumW=weights.reduce((a,b)=>a+b,0);
  let xs=[x0],acc=x0;
  weights.forEach(w=>{acc+=(x1-x0)*w/sumW;xs.push(acc)});
  const tMin=Math.min(d.te,...profile.points.map(p=>p.temp),dewT)-2;
  const tMax=Math.max(d.ta,...profile.points.map(p=>p.temp),dewT)+2;
  const sy=t=>yBot-(t-tMin)/(tMax-tMin)*(yBot-yTop);

  let s=`<defs><linearGradient id="roomWarm" x1="0" x2="1"><stop offset="0" stop-color="#f4eadc"/><stop offset="1" stop-color="#fbf7f1"/></linearGradient><linearGradient id="outsideCold" x1="0" x2="1"><stop offset="0" stop-color="#eaf4f8"/><stop offset="1" stop-color="#d5e9f2"/></linearGradient><filter id="softShadow"><feDropShadow dx="0" dy="3" stdDeviation="5" flood-opacity=".12"/></filter></defs>`;
  s+=`<rect x="20" y="35" width="${x0-35}" height="310" rx="16" fill="url(#roomWarm)"/><rect x="${x1+15}" y="35" width="${W-x1-35}" height="310" rx="16" fill="url(#outsideCold)"/>`;
  s+=`<text x="50" y="70" font-size="15" font-weight="800" fill="#72583b">INTERIOR</text><text x="50" y="94" font-size="24" font-weight="900" fill="#573d24">${fmt(d.ta,1)} °C</text>`;
  s+=`<text x="${x1+45}" y="70" font-size="15" font-weight="800" fill="#3e6b80">EXTERIOR</text><text x="${x1+45}" y="94" font-size="24" font-weight="900" fill="#26556b">${fmt(d.te,1)} °C</text>`;

  profile.rev.forEach((l,i)=>{
    const xa=xs[i],xb=xs[i+1],name=(l.product||l.name);
    s+=`<rect x="${xa}" y="${yTop}" width="${xb-xa}" height="${yBot-yTop}" fill="${wallVizColor(l.type)}" stroke="#60747b" stroke-width="1" filter="url(#softShadow)"/>`;
    if(xb-xa>55)s+=`<text x="${(xa+xb)/2}" y="${yBot-18}" text-anchor="middle" font-size="10" font-weight="800" fill="#2f4952">${name.length>16?name.slice(0,14)+'…':name}</text>`;
  });

  // Dew point reference
  const dewY=sy(dewT);
  s+=`<line x1="${x0-18}" y1="${dewY}" x2="${x1+18}" y2="${dewY}" stroke="#d65353" stroke-width="2" stroke-dasharray="8 6" opacity=".8"/>`;
  s+=`<rect x="${x0+10}" y="${dewY-27}" width="142" height="22" rx="11" fill="#fff0f0"/><text x="${x0+20}" y="${dewY-12}" font-size="11" font-weight="800" fill="#b83e3e">Punto rocío ${fmt(dewT,1)} °C</text>`;

  // Temperature path: interior air -> surface/interfaces -> exterior air
  const pTemps=[{x:95,temp:d.ta,label:'Aire interior'},...profile.points.map((p,i)=>({x:xs[i],temp:p.temp,label:p.label})),{x:900,temp:d.te,label:'Aire exterior'}];
  const poly=pTemps.map(p=>`${p.x},${sy(p.temp)}`).join(' ');
  s+=`<polyline points="${poly}" fill="none" stroke="#7a2bc0" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
  pTemps.forEach((p,i)=>{
    const yy=sy(p.temp),isEdge=i===0||i===pTemps.length-1;
    s+=`<circle cx="${p.x}" cy="${yy}" r="${isEdge?6:7}" fill="${isEdge?'#19789b':'#8b3bd1'}" stroke="white" stroke-width="3"/>`;
    const labelY=i%2===0?yy-14:yy+24;
    s+=`<text x="${p.x}" y="${labelY}" text-anchor="middle" font-size="${isEdge?12:11}" font-weight="900" fill="${isEdge?'#17617c':'#67309a'}">${fmt(p.temp,1)}°C</text>`;
  });
  s+=`<text x="${W/2}" y="372" text-anchor="middle" font-size="11" fill="#6a7d84">Perfil estacionario de temperatura · Rsi/Rse incluidos · esquema visual no a escala</text>`;
  svg.innerHTML=s;
}

function renderCurrentMoistureState(d){
  const V=clamp(+$('vaporRoomVolume')?.value||40,5,1000);
  const ah=absHumidity(d.ta,d.rh);
  const sat=absHumidity(d.ta,100);
  const currentG=ah*V;
  const capacityG=sat*V;
  const reserveG=Math.max(0,capacityG-currentG);
  const pct=clamp(ah/sat*100,0,100);

  if($('airWaterAh'))$('airWaterAh').textContent=fmt(ah,1)+' g/m³';
  if($('airWaterCurrent'))$('airWaterCurrent').textContent=fmt(currentG/1000,2);
  if($('airWaterCapacity'))$('airWaterCapacity').textContent=fmt(capacityG/1000,2);
  if($('airWaterReserve'))$('airWaterReserve').textContent=fmt(reserveG/1000,2);
  if($('airWaterDew'))$('airWaterDew').textContent=fmt(d.d,1);
  if($('airWaterPercent'))$('airWaterPercent').textContent=fmt(pct,0)+'%';
  if($('airWaterPercent')?.parentElement)$('airWaterPercent').parentElement.style.setProperty('--p',pct+'%');

  let state='Margen amplio',cls='good';
  if(d.rh>=80){state='Carga de humedad alta';cls='warn'}
  if(d.rh>=95){state='Muy cerca de saturación';cls='bad'}
  if($('airWaterState'))$('airWaterState').textContent=state;
  if($('airWaterMessage')){
    $('airWaterMessage').className='air-water-message '+cls;
    $('airWaterMessage').innerHTML=
      `A <b>${fmt(d.ta,1)} °C</b> y <b>${fmt(d.rh,0)}% HR</b>, el aire contiene aproximadamente <b>${fmt(ah,1)} g/m³</b> de vapor. `+
      `En un recinto de ${fmt(V,0)} m³ esto equivale a <b>${fmt(currentG/1000,2)} L</b>. A la misma temperatura, el margen hasta saturación es de aproximadamente <b>${fmt(reserveG/1000,2)} L</b>.`;
  }

  if($('awTi'))$('awTi').textContent=fmt(d.ta,1);
  if($('awRh'))$('awRh').textContent=fmt(d.rh,0);
  if($('awAh'))$('awAh').textContent=fmt(ah,1);
  if($('awTsi'))$('awTsi').textContent=fmt(d.ts,1);
  if($('awRhs'))$('awRhs').textContent=fmt(d.rhs,0);
  if($('awMargin'))$('awMargin').textContent=fmt(d.ts-d.d,1)+' °C';
  if($('awT80'))$('awT80').textContent=fmt(d.t80,1)+' °C';
  if($('awScore'))$('awScore').textContent=fmt(d.score,0)+' / 100';

  let surfaceState='Condición favorable',surfaceCls='good',msg='';
  if(d.rhs>=100){
    surfaceState='Saturación / condensación posible';surfaceCls='bad';
    msg=`La superficie interior está a ${fmt(d.ts,1)} °C, igual o por debajo del punto de rocío (${fmt(d.d,1)} °C). Existe condición de condensación superficial posible.`;
  }else if(d.rhs>=90){
    surfaceState='HR superficial muy alta';surfaceCls='bad';
    msg=`El aire interior tiene ${fmt(d.rh,0)}% HR, pero al enfriarse hasta ${fmt(d.ts,1)} °C junto al muro alcanza aproximadamente ${fmt(d.rhs,0)}% HR superficial. El margen respecto del punto de rocío es solo ${fmt(d.ts-d.d,1)} °C.`;
  }else if(d.rhs>=80){
    surfaceState='Zona de atención';surfaceCls='warn';
    msg=`La misma humedad absoluta del aire interior pasa de ${fmt(d.rh,0)}% HR a aproximadamente ${fmt(d.rhs,0)}% HR al enfriarse junto a la superficie del muro.`;
  }else{
    msg=`La misma humedad absoluta del aire interior pasa de ${fmt(d.rh,0)}% HR a aproximadamente ${fmt(d.rhs,0)}% HR al enfriarse de ${fmt(d.ta,1)} °C a ${fmt(d.ts,1)} °C junto al muro.`;
  }
  if($('awSurfaceState'))$('awSurfaceState').textContent=surfaceState;
  if($('airToWallMessage')){
    $('airToWallMessage').className='air-to-wall-message '+surfaceCls;
    $('airToWallMessage').innerHTML=`<b>${surfaceState}</b><span>${msg}</span>`;
  }

  // Reuse wall visualization, now without any period/vapor source dependency.
  renderMoistureWall(d,{hours:0,grams:0,liters:0});
}
function draw(d){
  const W=900,H=410,L=64,R=28,T=30,BT=62;
  const minX=Math.floor(Math.min(-5,d.d-5,d.te-2)/5)*5;
  const maxX=Math.ceil(Math.max(25,d.ta+4,d.ts+4)/5)*5;
  const minY=40,maxY=110;
  const sx=x=>L+(x-minX)/(maxX-minX)*(W-L-R),sy=y=>T+(maxY-y)/(maxY-minY)*(H-T-BT);
  let s=`<defs>
    <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#19789b" stop-opacity=".18"/><stop offset="1" stop-color="#19789b" stop-opacity=".015"/></linearGradient>
    <filter id="pointGlow"><feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#19789b" flood-opacity=".35"/></filter>
  </defs><rect width="${W}" height="${H}" rx="18" fill="#fbfcfc"/>`;
  [[40,70,'#e8f5ef'],[70,80,'#eef5dc'],[80,90,'#fff5db'],[90,100,'#fff0e5'],[100,110,'#fde8e8']].forEach(z=>s+=`<rect x="${L}" y="${sy(z[1])}" width="${W-L-R}" height="${sy(z[0])-sy(z[1])}" fill="${z[2]}"/>`);

  [50,60,70,80,90,100].forEach(y=>s+=`<line x1="${L}" y1="${sy(y)}" x2="${W-R}" y2="${sy(y)}" stroke="#dce6e9"/><text x="${L-10}" y="${sy(y)+4}" text-anchor="end" font-size="11" fill="#687c84">${y}%</text>`);
  for(let x=Math.ceil(minX/5)*5;x<=maxX;x+=5){
    s+=`<line x1="${sx(x)}" y1="${T}" x2="${sx(x)}" y2="${H-BT}" stroke="#e6edef" stroke-width="1"/>`;
    s+=`<line x1="${sx(x)}" y1="${H-BT}" x2="${sx(x)}" y2="${H-BT+7}" stroke="#6f8188" stroke-width="1.5"/>`;
    s+=`<text x="${sx(x)}" y="${H-BT+25}" text-anchor="middle" font-size="12" font-weight="800" fill="#536a73">${x}°</text>`;
  }

  let pts=[];for(let x=minX;x<=maxX;x+=.15)pts.push([sx(x),sy(clamp(100*d.p/ps(x),minY,maxY))]);
  const linePts=pts.map(p=>p.join(',')).join(' ');
  const areaPts=`${sx(minX)},${sy(minY)} ${linePts} ${sx(maxX)},${sy(minY)}`;
  const st=scoreStyle(d.score);
  s+=`<polygon points="${areaPts}" fill="url(#curveFill)"/><polyline fill="none" stroke="#176f94" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" points="${linePts}"/>`;

  // Dew point marker
  s+=`<line x1="${sx(d.d)}" y1="${T}" x2="${sx(d.d)}" y2="${H-BT}" stroke="#d65353" stroke-width="2" stroke-dasharray="7 6"/>`;
  s+=`<rect x="${Math.min(W-145,sx(d.d)+7)}" y="${T+8}" width="128" height="25" rx="12" fill="#fff0f0"/><text x="${Math.min(W-138,sx(d.d)+15)}" y="${T+25}" font-size="11" font-weight="800" fill="#b83f3f">Rocío ${fmt(d.d,1)}°C</text>`;

  // Current surface marker + vertical guide + label
  const px=sx(d.ts),py=sy(clamp(d.rhs,minY,maxY));
  s+=`<line x1="${px}" y1="${py}" x2="${px}" y2="${H-BT}" stroke="${st.color}" stroke-width="1.5" stroke-dasharray="4 5" opacity=".75"/>`;
  s+=`<circle cx="${px}" cy="${py}" r="10" fill="white" stroke="${st.color}" stroke-width="5" filter="url(#pointGlow)"/>`;
  const bx=Math.max(L+5,Math.min(W-R-165,px-75)),by=Math.max(T+42,py-62);
  s+=`<rect x="${bx}" y="${by}" width="150" height="46" rx="12" fill="white" stroke="#cadce1"/><text x="${bx+12}" y="${by+18}" font-size="10" fill="#6b7e85">SUPERFICIE ACTUAL</text><text x="${bx+12}" y="${by+36}" font-size="14" font-weight="900" fill="#173f4d">${fmt(d.ts,1)}°C · ${fmt(d.rhs,0)}% HR</text>`;

  s+=`<text x="${W/2}" y="${H-10}" text-anchor="middle" font-size="12" font-weight="800" fill="#455e68">Temperatura superficial interior del muro (°C)</text>`;
  s+=`<text x="18" y="${H/2}" transform="rotate(-90 18 ${H/2})" text-anchor="middle" font-size="12" font-weight="800" fill="#455e68">HR superficial</text>`;
  $('chart').innerHTML=s;
}

const PERSON_ACTIVITY_RATES={sleep:32,tv:45,desk:50,light:60,housework:120,exercise:160,hardExercise:250};
const PERSON_ACTIVITY_LABELS={
  sleep:'Dormir',tv:'Ver TV / leer / descansar sentado',desk:'Trabajar sentado / computador',
  light:'Actividad ligera de pie',housework:'Limpiar / ordenar la casa',
  exercise:'Ejercicio moderado en casa',hardExercise:'Ejercicio intenso'
};
const PERSON_ACTION_LABELS={none:'Sin acción adicional',cooking:'Cocinando',shower:'Duchándose'};

let vaporPersonState=[
  {activity:'tv',action:'none',actionAmount:1}
];

function syncVaporPersonState(){
  const n=clamp(Math.round(+$('vaporPeople').value||0),0,8);
  while(vaporPersonState.length<n)vaporPersonState.push({activity:'tv',action:'none',actionAmount:1});
  if(vaporPersonState.length>n)vaporPersonState=vaporPersonState.slice(0,n);
}
function renderVaporPersons(){
  const host=$('vaporPersonRows');if(!host)return;
  syncVaporPersonState();
  if(!vaporPersonState.length){
    host.innerHTML='<div class="vapor-no-people">Sin personas seleccionadas.</div>';
    return;
  }
  host.innerHTML=vaporPersonState.map((p,i)=>{
    const actionField=p.action==='cooking'
      ?`<label><span>Tiempo cocinando</span><select class="vp-action-amount" data-i="${i}"><option value=".5"${p.actionAmount==.5?' selected':''}>30 min</option><option value="1"${p.actionAmount==1?' selected':''}>1 h</option><option value="2"${p.actionAmount==2?' selected':''}>2 h</option><option value="3"${p.actionAmount==3?' selected':''}>3 h</option></select></label>`
      :p.action==='shower'
      ?`<label><span>N.º de duchas</span><select class="vp-action-amount" data-i="${i}"><option value="1"${p.actionAmount==1?' selected':''}>1 ducha</option><option value="2"${p.actionAmount==2?' selected':''}>2 duchas</option></select></label>`
      :`<div class="vp-action-empty"><span>Acción adicional</span><b>—</b></div>`;
    return `<div class="vapor-person-card">
      <div class="vapor-person-title"><span>${i+1}</span><b>Persona ${i+1}</b><small id="vpContribution${i}">—</small></div>
      <div class="vapor-person-grid">
        <label><span>Actividad durante el período</span>
          <select class="vp-activity" data-i="${i}">
            <option value="sleep"${p.activity==='sleep'?' selected':''}>Dormir</option>
            <option value="tv"${p.activity==='tv'?' selected':''}>Ver TV / leer / descansar</option>
            <option value="desk"${p.activity==='desk'?' selected':''}>Trabajar sentado / computador</option>
            <option value="light"${p.activity==='light'?' selected':''}>Actividad ligera de pie</option>
            <option value="housework"${p.activity==='housework'?' selected':''}>Limpiar / ordenar la casa</option>
            <option value="exercise"${p.activity==='exercise'?' selected':''}>Ejercicio moderado en casa</option>
            <option value="hardExercise"${p.activity==='hardExercise'?' selected':''}>Ejercicio intenso</option>
          </select>
        </label>
        <label><span>¿Qué está haciendo además?</span>
          <select class="vp-action" data-i="${i}">
            <option value="none"${p.action==='none'?' selected':''}>Nada adicional</option>
            <option value="cooking"${p.action==='cooking'?' selected':''}>Cocinando</option>
            <option value="shower"${p.action==='shower'?' selected':''}>Duchándose</option>
          </select>
        </label>
        ${actionField}
      </div>
    </div>`
  }).join('');

  host.querySelectorAll('.vp-activity').forEach(el=>el.onchange=e=>{
    const i=+e.target.dataset.i;vaporPersonState[i].activity=e.target.value;renderVaporEstimate()
  });
  host.querySelectorAll('.vp-action').forEach(el=>el.onchange=e=>{
    const i=+e.target.dataset.i;vaporPersonState[i].action=e.target.value;vaporPersonState[i].actionAmount=1;renderVaporPersons();renderVaporEstimate()
  });
  host.querySelectorAll('.vp-action-amount').forEach(el=>el.onchange=e=>{
    const i=+e.target.dataset.i;vaporPersonState[i].actionAmount=+e.target.value;renderVaporEstimate()
  });
}
function vaporEstimate(){
  const hours=$('duration').value==='manual'?clamp(+$('durationHours').value||0,0,24):0;
  syncVaporPersonState();

  const persons=vaporPersonState.map((p,i)=>{
    const rate=PERSON_ACTIVITY_RATES[p.activity]||45;
    const metabolicGrams=rate*hours;
    let actionGrams=0,actionDescription='sin acción adicional';
    if(p.action==='cooking'){
      const actionHours=Math.min(hours,Math.max(0,+p.actionAmount||0));
      actionGrams=600*actionHours;
      actionDescription=`cocinando ${fmt(actionHours,1)} h`;
    }else if(p.action==='shower'){
      const showers=Math.max(0,+p.actionAmount||0);
      actionGrams=660*showers;
      actionDescription=`${fmt(showers,0)} ducha${showers===1?'':'s'}`;
    }
    return{index:i+1,activity:p.activity,activityLabel:PERSON_ACTIVITY_LABELS[p.activity],rate,metabolicGrams,
      action:p.action,actionDescription,actionGrams,totalGrams:metabolicGrams+actionGrams}
  });

  const peopleGrams=persons.reduce((s,p)=>s+p.totalGrams,0);
  const loads=Math.max(0,+$('vaporLaundryLoads').value||0);
  const laundryGrams=loads*1800;

  const heaterType=$('vaporHeaterQuick').value;
  const heaterHours=Math.min(hours,clamp(+$('vaporHeaterHours').value||0,0,24));
  let heaterGrams=0,heaterRate=0;
  if(heaterType==='gas'){heaterRate=.22*1.60*1000;heaterGrams=heaterRate*heaterHours}
  if(heaterType==='paraffin'){heaterRate=.20*1.25*1000;heaterGrams=heaterRate*heaterHours}

  const grams=peopleGrams+laundryGrams+heaterGrams,kg=grams/1000,liters=kg;
  return{hours,persons,peopleGrams,loads,laundryGrams,heaterType,heaterHours,heaterRate,heaterGrams,grams,kg,liters}
}

function absHumidity(T,RH){
  // g/m³ from vapor pressure in hPa
  return 216.7*pv(T,clamp(RH,0.1,100))/(T+273.15);
}
function rhFromAbsHumidity(T,ah){
  const e=Math.max(0,ah)*(T+273.15)/216.7;
  return 100*e/ps(T);
}

function practicalVentilation(){
  const mode=$('vaporVentPractical')?.value||'closed';
  const V=clamp(+$('vaporRoomVolume')?.value||40,5,1000);
  let ach=0, known=false, label='Recinto prácticamente cerrado', note='Sin renovación de aire considerada en la simulación.';
  if(mode==='undercut'){
    const w=clamp(+$('doorWidthCm')?.value||80,30,200), g=clamp(+$('doorGapCm')?.value||1,.1,10);
    const area=w*g;
    label='Puerta cerrada con holgura inferior';
    note=`Área libre geométrica ≈ ${fmt(area,0)} cm². Es una vía de transferencia entre recintos, pero no permite deducir ACH sin diferencia de presión o caudal medido. Por seguridad de cálculo se mantiene ACH = 0.`;
  }else if(mode==='ajar'){
    label='Puerta entreabierta'; note='Mejora la transferencia con el resto de la vivienda, pero no garantiza renovación con aire exterior. ACH no asignado automáticamente.';
  }else if(mode==='windowCrack'){
    label='Ventana ligeramente abierta'; note='El caudal depende de viento, temperatura, geometría y apertura. ACH no asignado automáticamente.';
  }else if(mode==='windowOpen'){
    label='Ventana abierta'; note='Existe potencial de renovación exterior, pero sin geometría y fuerzas impulsoras no se asigna un ACH automático.';
  }else if(mode==='cross'){
    label='Ventilación cruzada'; note='Puede producir renovaciones altas, pero depende de aberturas, viento y presión. Usa “Personalizado” si dispones de ACH calculado/medido.';
  }else if(mode==='extractor'){
    const q=Math.max(0,+$('extractorFlow')?.value||0); ach=q/V; known=true; label='Extractor mecánico'; note=`${fmt(q,0)} m³/h ÷ ${fmt(V,0)} m³ = ${fmt(ach,2)} ACH.`;
  }else if(mode==='custom'){
    ach=clamp(+$('vaporCustomAch')?.value||0,0,20); known=true; label='ACH personalizado'; note=`Se usa ${fmt(ach,2)} ACH ingresado por el usuario.`;
  }
  return{mode,V,ach,known,label,note};
}
function renderPracticalVentilation(){
  const x=practicalVentilation(), mode=x.mode;
  $('doorGapFields')?.classList.toggle('hidden',mode!=='undercut');
  $('extractorFields')?.classList.toggle('hidden',mode!=='extractor');
  $('customAchFields')?.classList.toggle('hidden',mode!=='custom');
  if($('doorGapArea')&&mode==='undercut'){
    const a=(+$('doorWidthCm').value||80)*(+$('doorGapCm').value||1);
    $('doorGapArea').textContent=`Área libre aproximada: ${fmt(a,0)} cm². No equivale por sí sola a un ACH.`;
  }
  if($('vaporVentMode'))$('vaporVentMode').value=String(x.ach);
  if($('ventScenarioStatus')){
    $('ventScenarioStatus').className='vent-scenario-status '+(x.known?'measured':'transfer');
    $('ventScenarioStatus').innerHTML=`<b>${x.label}</b><span>${x.note}</span>`;
  }
}
function vaporImpactEstimate(v){
  const enabled=!!$('vaporImpactEnabled')?.checked;
  if(!enabled||!v.hours)return{enabled:false};
  const Ti=+$('ta').value||18, RH0=clamp(+$('rh').value||70,1,100);
  const V=clamp(+$('vaporRoomVolume').value||40,5,1000);
  renderPracticalVentilation();
  const pvx=practicalVentilation();
  const ach=pvx.ach;
  const To=+$('vaporOutdoorT').value||0, RHo=clamp(+$('vaporOutdoorRH').value||80,1,100);
  const c0=absHumidity(Ti,RH0), cout=absHumidity(To,RHo);
  const G=v.hours>0?v.grams/v.hours:0; // g/h averaged across selected period
  let cRaw;
  if(ach<=0)cRaw=c0+v.grams/V;
  else{
    const e=Math.exp(-ach*v.hours);
    cRaw=cout+(c0-cout)*e+(G/(ach*V))*(1-e);
  }
  const sat=absHumidity(Ti,100);
  const excessG=Math.max(0,(cRaw-sat)*V);
  const cFinal=Math.min(cRaw,sat);
  const rhRaw=rhFromAbsHumidity(Ti,cRaw);
  const rhFinal=Math.min(100,rhRaw);
  const dew0=dew(Ti,RH0);
  const dewFinal=dew(Ti,Math.min(99.999,Math.max(.1,rhFinal)));
  return{enabled:true,Ti,RH0,V,ach,To,RHo,c0,cout,G,cRaw,cFinal,rhRaw,rhFinal,dew0,dewFinal,excessG,sat,vent:pvx};
}
function renderVaporImpact(v){
  const enabled=!!$('vaporImpactEnabled')?.checked;
  $('vaporImpactControls')?.classList.toggle('hidden',!enabled);
  $('vaporImpactResult')?.classList.toggle('hidden',!enabled);
  $('vaporImpactMessage')?.classList.toggle('hidden',!enabled);
  if(!enabled)return;
  const x=vaporImpactEstimate(v);
  if(!x.enabled){
    $('vaporImpactMessage').innerHTML='<b>Selecciona horas manuales</b> para ejecutar la simulación.';
    ['impactRh0','impactRh1','impactDew0','impactDew1','impactAirWater','impactCondensed'].forEach(id=>$(id).textContent='—');
    return;
  }
  $('impactRh0').textContent=fmt(x.RH0,0);
  $('impactRh1').textContent=fmt(x.rhFinal,0);
  $('impactDew0').textContent=fmt(x.dew0,1);
  $('impactDew1').textContent=fmt(x.dewFinal,1);
  $('impactAirWater').textContent=fmt(x.cFinal,1);
  $('impactCondensed').textContent=fmt(x.excessG,0);

  const d=data(), tsi=d.ts;
  const delta=x.rhFinal-x.RH0;
  let state='estable', cls='good';
  if(x.excessG>0){state='saturación / condensación potencial';cls='bad'}
  else if(x.dewFinal>=tsi){state='riesgo de condensación sobre el muro';cls='bad'}
  else if(x.rhFinal>=80){state='humedad interior muy alta';cls='warn'}
  else if(delta>5){state='aumento relevante de HR';cls='warn'}
  $('vaporImpactMessage').className='vapor-impact-message '+cls;
  $('vaporImpactMessage').innerHTML=
    `<b>${state}</b><span>Con ${fmt(v.liters,2)} L eq. liberados en ${fmt(v.hours,1)} h, la HR pasa de ${fmt(x.RH0,0)}% a ${fmt(x.rhFinal,0)}% en este escenario. `+
    `El punto de rocío pasa de ${fmt(x.dew0,1)} °C a ${fmt(x.dewFinal,1)} °C. `+
    `${x.ach>0?`Ventilación considerada: ${fmt(x.ach,2)} ACH; aire exterior ${fmt(x.To,1)} °C / ${fmt(x.RHo,0)}% HR.`:`${x.vent?.label||'Escenario'}: no se asignó ACH automáticamente; para el balance se usa 0 ACH.`}</span>`;
}
function renderVaporEstimate(){
  const card=$('vaporCard');if(!card)return;
  renderVaporPersons();
  const manual=$('duration').value==='manual';
  const intro=$('vaporIntro'),state=$('vaporState');
  $('vaporHeaterHoursWrap')?.classList.toggle('hidden',$('vaporHeaterQuick').value==='none');

  if(!manual){
    if(intro)intro.textContent='Activa “Ingresar horas manualmente” para incorporar la producción de vapor durante ese período.';
    if(state)state.textContent='ESPERANDO HORAS';
    $('vaporLiters').textContent='—';$('vaporMass').textContent='—';$('vaporTankLabel').textContent='0 L';$('vaporFill').style.height='0%';
    $('vaporBreakdown').innerHTML='Selecciona <b>Ingresar horas manualmente</b> en Persistencia estimada.';
    renderMoistureWall(data(),{hours:0,grams:0,liters:0});
    return;
  }

  const v=vaporEstimate();
  if(intro)intro.textContent='Producción acumulada durante las horas seleccionadas. Se compara con la capacidad actual del aire, sin asumir que todo queda retenido.';
  if(state)state.textContent=v.hours>=10?'PERÍODO PROLONGADO':'CÁLCULO ACTIVO';
  $('vaporLiters').textContent=fmt(v.liters,2);
  $('vaporMass').textContent=`${fmt(v.kg,2)} kg de agua`;
  $('vaporTankLabel').textContent=`${fmt(v.liters,2)} L`;
  $('vaporFill').style.height=`${Math.min(100,v.liters/5*100)}%`;

  v.persons.forEach((p,i)=>{const el=$(`vpContribution${i}`);if(el)el.textContent=`+${fmt(p.totalGrams/1000,2)} L`});
  const peopleLines=v.persons.map(p=>`<span><b>Persona ${p.index}</b>: ${p.activityLabel} = ${fmt(p.metabolicGrams/1000,2)} L${p.actionGrams>0?` + ${p.actionDescription} = ${fmt(p.actionGrams/1000,2)} L`:''}</span>`).join('');
  const extras=[
    v.laundryGrams>0?`<span><b>Ropa secándose:</b> ${fmt(v.loads,1)} carga(s) = ${fmt(v.laundryGrams/1000,2)} L</span>`:'',
    v.heaterGrams>0?`<span><b>Estufa ${v.heaterType==='gas'?'a gas':'a parafina'}:</b> ${fmt(v.heaterHours,1)} h = ${fmt(v.heaterGrams/1000,2)} L</span>`:''
  ].filter(Boolean).join('');
  $('vaporBreakdown').innerHTML=`<div class="vapor-breakdown-list">${peopleLines||'<span>Sin aporte de personas.</span>'}${extras}</div><div class="vapor-total-line">Total liberado durante ${fmt(v.hours,1)} h: <b>${fmt(v.grams,0)} g = ${fmt(v.liters,2)} L eq.</b></div>`;
  renderMoistureWall(data(),v);
}

function syncPersistenceUI(){
  const manual=$('duration').value==='manual';
  $('manualHoursWrap').classList.toggle('hidden',!manual);
  if(manual){
    const h=clamp(+$('durationHours').value||0,0,24);
    $('durationHours').value=h;
    $('durationHoursSlider').value=h;
    $('durationHoursOut').textContent=fmt(h,1)+' h';
    $('durationPenaltyOut').textContent='+'+fmt(15*(h/24),1)+' puntos';
  }
}
function setMode(mode){inputMode=mode==='estimated'?'estimated':'measured';$('modeMeasured').classList.toggle('active',inputMode==='measured');$('modeEstimated').classList.toggle('active',inputMode==='estimated');$('measuredPanel').classList.toggle('hidden',inputMode!=='measured');$('estimatedPanel').classList.toggle('hidden',inputMode!=='estimated');render()}

window.HIDROLAB_RISK_REPORT=()=>{
  const d=data(),st=scoreStyle(d.score);
  return{
    inputMode,modeLabel:inputMode==='estimated'?'Temperatura superficial estimada mediante muro':'Temperatura superficial medida',
    ta:d.ta,rh:d.rh,te:d.te,ts:d.ts,p:d.p,rhs:d.rhs,dew:d.d,t80:d.t80,margin:d.ts-d.d,
    score:d.score,scoreLevel:st.level,persistence:{...d.persist},
    thermal:{rsi:R_SI,rse:R_SE,rLayers:d.rLayers,rTotal:d.rTotal,U:d.U},
    layers:layers.map((l,i)=>({order:i+1,position:i===0?'Exterior':i===layers.length-1?'Interior':'Intermedia',
      name:l.product||l.name,thickness:l.thickness,lambda:l.lambda,Rdeclared:l.R,Rlayer:layerR(l),kind:l.kind,source:l.source||'Preset HIDROLAB'})),
    airState:{volume:clamp(+$('vaporRoomVolume').value||40,5,1000),absoluteHumidity:absHumidity(d.ta,d.rh),saturationHumidity:absHumidity(d.ta,100),surfaceRH:d.rhs,dew:d.d}
  }
};


function riskTraceability(d){
  const homogeneous=!layers.some(l=>['glasswool','mineralwool'].includes(l.type)) && $('wallTemplate').value!=='light_wall';
  const uClass=homogeneous?'NORMATIVO / MÉTODO NCh853':'ESTIMACIÓN HIDROLAB';
  const uText=homogeneous
    ?'R = e/λ, Rtot = Rsi + ΣR + Rse y U = 1/Rtot son el método para capas homogéneas de NCh853:2021. La acreditación exige respaldar cada λ o la solución completa.'
    :'La solución contiene entramados o posibles caminos térmicos paralelos. La suma 1D mostrada es orientativa y no constituye por sí sola un cálculo NCh853 completo de elemento heterogéneo.';
  const normCond=`Para muro, Res. Ex. 1802/2025 usa Rsi = 0,13 y Rse = 0,04 m²K/W. Para acreditación de condensación exige NCh1973, Ti = 19 °C, HR interior hasta 75%, clima exterior oficial según emplazamiento y al menos sección de mayor y menor resistencia térmica.`;
  if($('traceUClass')) $('traceUClass').textContent=uClass;
  if($('traceUText')) $('traceUText').textContent=uText;
  if($('traceCondText')) $('traceCondText').textContent=normCond;
}

function render(){
  const d=data();riskTraceability(d);renderWallGraphic(d);st=scoreStyle(d.score);
  if(inputMode==='measured'){$('tsSlider').min=Math.floor(d.d-5);$('tsSlider').max=Math.ceil(d.ta+5);$('tsSlider').value=d.ts;$('tsLabel').textContent=fmt(d.ts)+' °C';$('tsMinLabel').textContent=$('tsSlider').min+' °C';$('tsMaxLabel').textContent=$('tsSlider').max+' °C'}
  else{$('rLayers').textContent=fmt(d.rLayers,3);$('rTotal').textContent=fmt(d.rTotal,3);$('uCalculated').textContent=fmt(d.U,2);$('tsEstimated').textContent=fmt(d.ts,1)}
  $('rhs').textContent=fmt(d.rhs,0);$('dew').textContent=fmt(d.d);$('t80').textContent=fmt(d.t80);$('margin').textContent=fmt(d.ts-d.d);$('score').textContent=fmt(d.score,0);$('scoreLevel').textContent=`${st.level} · 0 = bajo · 100 = muy alto`;$('scoreBar').style.width=d.score+'%';$('scoreBar').style.background=st.color;$('score').style.color=st.color;
  let cls='safe',txt='Humedad superficial relativamente baja para este indicador.';if(d.rhs>=100){cls='danger';txt='La superficie está en condición de saturación o condensación posible.'}else if(d.rhs>=90){cls='danger';txt='Humedad superficial muy alta; si persiste, la condición requiere atención.'}else if(d.rhs>=80){cls='warn';txt='Humedad superficial elevada; la persistencia aumenta el riesgo preventivo.'}else if(d.rhs>=70){cls='warn';txt='Zona de atención: la superficie está acumulando una HR mayor que el aire del recinto.'}
  const source=inputMode==='estimated'?` T° superficial estimada: ${fmt(d.ts)} °C · U calculada: ${fmt(d.U,2)} W/m²K.`:` T° superficial interior medida: ${fmt(d.ts)} °C.`;const persistence=` Persistencia: ${d.persist.label} · aporte al índice +${fmt(d.persist.penalty,1)}.`;$('status').className='callout '+cls;$('status').innerHTML=`<b>${txt}</b> HR superficial estimada: ${fmt(d.rhs,0)}%.${source}${persistence}`;renderCurrentMoistureState(d);draw(d)
}
$('modeMeasured').onclick=()=>setMode('measured');
$('modeEstimated').onclick=()=>setMode('estimated');
$('wallTemplate').onchange=e=>loadTemplate(e.target.value);
$('addLayer').onclick=()=>{layers.push(makeLayer('custom',20));$('wallTemplate').value='custom';renderQuickControls('custom');renderLayers();render()};
$('tsSlider').oninput=()=>{$('ts').value=$('tsSlider').value;render()};
['ta','rh','ts','te'].forEach(id=>$(id).addEventListener('input',render));
$('vaporRoomVolume')?.addEventListener('input',render);
$('duration').addEventListener('change',()=>{syncPersistenceUI();render()});
$('durationHours').addEventListener('input',()=>{const h=clamp(+$('durationHours').value||0,0,24);$('durationHoursSlider').value=h;syncPersistenceUI();render()});
$('durationHoursSlider').addEventListener('input',()=>{$('durationHours').value=$('durationHoursSlider').value;syncPersistenceUI();render()});
loadTemplate('eifs_concrete');syncPersistenceUI();render();
