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
function draw(d){
  const W=900,H=410,L=62,R=25,T=25,BT=52,minX=Math.min(-5,Math.floor(d.d-5),Math.floor(d.te-2)),maxX=Math.max(25,Math.ceil(d.ta+3)),minY=40,maxY=110,sx=x=>L+(x-minX)/(maxX-minX)*(W-L-R),sy=y=>T+(maxY-y)/(maxY-minY)*(H-T-BT);
  let s=`<rect width="${W}" height="${H}" fill="#fbfcfc"/>`;[[40,70,'#e8f5ef'],[70,80,'#eef5dc'],[80,90,'#fff5db'],[90,100,'#fff0e5'],[100,110,'#fde8e8']].forEach(z=>s+=`<rect x="${L}" y="${sy(z[1])}" width="${W-L-R}" height="${sy(z[0])-sy(z[1])}" fill="${z[2]}"/>`);
  [50,60,70,80,90,100].forEach(y=>s+=`<line x1="${L}" y1="${sy(y)}" x2="${W-R}" y2="${sy(y)}" stroke="#dfe7ea"/><text x="${L-9}" y="${sy(y)+4}" text-anchor="end" font-size="11" fill="#667983">${y}%</text>`);
  let pts=[];for(let x=minX;x<=maxX;x+=.2)pts.push(`${sx(x)},${sy(clamp(100*d.p/ps(x),minY,maxY))}`);const st=scoreStyle(d.score);
  s+=`<polyline fill="none" stroke="#176d91" stroke-width="4" points="${pts.join(' ')}"/><circle cx="${sx(d.ts)}" cy="${sy(clamp(d.rhs,minY,maxY))}" r="7" fill="${st.color}" stroke="white" stroke-width="3"/><line x1="${sx(d.d)}" y1="${T}" x2="${sx(d.d)}" y2="${H-BT}" stroke="#c84b4b" stroke-dasharray="6 5"/><text x="${sx(d.d)+5}" y="${T+16}" font-size="11" fill="#b94444">Rocío ${fmt(d.d)}°C</text><text x="${W/2}" y="${H-6}" text-anchor="middle" font-size="12" font-weight="700" fill="#52636c">Temperatura superficial interior del muro (°C)</text><text x="16" y="${H/2}" transform="rotate(-90 16 ${H/2})" text-anchor="middle" font-size="12" font-weight="700" fill="#52636c">HR superficial</text>`;$('chart').innerHTML=s
}

function vaporEstimate(){
  const hours=$('duration').value==='manual'?clamp(+$('durationHours').value||0,0,24):0;
  const people=clamp(+$('vaporPeople').value||0,0,20);
  const perPerson=clamp(+$('vaporPerPerson').value||0,0,500);
  const extra=clamp(+$('vaporExtra').value||0,0,5000);
  const humanRate=people*perPerson,totalRate=humanRate+extra;
  const grams=totalRate*hours,kg=grams/1000,liters=kg; // 1 kg water ≈ 1 L liquid equivalent
  return{hours,people,perPerson,extra,humanRate,totalRate,grams,kg,liters}
}
function renderVaporEstimate(){
  const card=$('vaporCard');if(!card)return;
  const manual=$('duration').value==='manual';
  const intro=$('vaporIntro'),state=$('vaporState');
  card.classList.toggle('vapor-active',manual);
  if(!manual){
    card.classList.remove('vapor-high');
    if(intro)intro.textContent='Activa “Ingresar horas manualmente” para calcular la humedad liberada durante ese período.';
    if(state)state.textContent='ESPERANDO HORAS';
    $('vaporLiters').textContent='—';$('vaporMass').textContent='—';$('vaporTankLabel').textContent='0 L';$('vaporFill').style.height='0%';
    $('vaporBreakdown').innerHTML='Selecciona <b>Ingresar horas manualmente</b> en Persistencia estimada.';
    return
  }
  const v=vaporEstimate(),high=v.hours>=10;
  card.classList.toggle('vapor-high',high);
  if(intro)intro.textContent=high?'Período prolongado: visualiza cuánta agua equivalente se libera durante las horas indicadas.':'Estimación acumulada durante las horas manuales indicadas.';
  if(state)state.textContent=high?'PERÍODO PROLONGADO':'CÁLCULO ACTIVO';
  $('vaporLiters').textContent=fmt(v.liters,2);
  $('vaporMass').textContent=`${fmt(v.kg,2)} kg de agua`;
  $('vaporTankLabel').textContent=`${fmt(v.liters,2)} L`;
  $('vaporFill').style.height=`${Math.min(100,v.liters/10*100)}%`;
  $('vaporBreakdown').innerHTML=`${fmt(v.hours,1)} h × (${v.people} pers. × ${fmt(v.perPerson,0)} g/h + ${fmt(v.extra,0)} g/h adicionales) = <b>${fmt(v.grams,0)} g</b> = <b>${fmt(v.liters,2)} L eq.</b>`;
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
  renderVaporEstimate();
}
function setMode(mode){inputMode=mode==='estimated'?'estimated':'measured';$('modeMeasured').classList.toggle('active',inputMode==='measured');$('modeEstimated').classList.toggle('active',inputMode==='estimated');$('measuredPanel').classList.toggle('hidden',inputMode!=='measured');$('estimatedPanel').classList.toggle('hidden',inputMode!=='estimated');render()}

window.HIDROLAB_RISK_REPORT=()=>{
  const d=data(),st=scoreStyle(d.score),v=vaporEstimate();
  return{
    inputMode,modeLabel:inputMode==='estimated'?'Temperatura superficial estimada mediante muro':'Temperatura superficial medida',
    ta:d.ta,rh:d.rh,te:d.te,ts:d.ts,p:d.p,rhs:d.rhs,dew:d.d,t80:d.t80,margin:d.ts-d.d,
    score:d.score,scoreLevel:st.level,persistence:{...d.persist},
    thermal:{rsi:R_SI,rse:R_SE,rLayers:d.rLayers,rTotal:d.rTotal,U:d.U},
    layers:layers.map((l,i)=>({order:i+1,position:i===0?'Exterior':i===layers.length-1?'Interior':'Intermedia',
      name:l.product||l.name,thickness:l.thickness,lambda:l.lambda,Rdeclared:l.R,Rlayer:layerR(l),kind:l.kind,source:l.source||'Preset HIDROLAB'})),
    vapor:{active:d.persist.mode==='manual',hours:v.hours,people:v.people,perPerson:v.perPerson,extra:v.extra,
      humanRate:v.humanRate,totalRate:v.totalRate,grams:v.grams,kg:v.kg,liters:v.liters}
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
  const d=data();riskTraceability(d),st=scoreStyle(d.score);
  if(inputMode==='measured'){$('tsSlider').min=Math.floor(d.d-5);$('tsSlider').max=Math.ceil(d.ta+5);$('tsSlider').value=d.ts;$('tsLabel').textContent=fmt(d.ts)+' °C';$('tsMinLabel').textContent=$('tsSlider').min+' °C';$('tsMaxLabel').textContent=$('tsSlider').max+' °C'}
  else{$('rLayers').textContent=fmt(d.rLayers,3);$('rTotal').textContent=fmt(d.rTotal,3);$('uCalculated').textContent=fmt(d.U,2);$('tsEstimated').textContent=fmt(d.ts,1)}
  $('rhs').textContent=fmt(d.rhs,0);$('dew').textContent=fmt(d.d);$('t80').textContent=fmt(d.t80);$('margin').textContent=fmt(d.ts-d.d);$('score').textContent=fmt(d.score,0);$('scoreLevel').textContent=`${st.level} · 0 = bajo · 100 = muy alto`;$('scoreBar').style.width=d.score+'%';$('scoreBar').style.background=st.color;$('score').style.color=st.color;
  let cls='safe',txt='Humedad superficial relativamente baja para este indicador.';if(d.rhs>=100){cls='danger';txt='La superficie está en condición de saturación o condensación posible.'}else if(d.rhs>=90){cls='danger';txt='Humedad superficial muy alta; si persiste, la condición requiere atención.'}else if(d.rhs>=80){cls='warn';txt='Humedad superficial elevada; la persistencia aumenta el riesgo preventivo.'}else if(d.rhs>=70){cls='warn';txt='Zona de atención: la superficie está acumulando una HR mayor que el aire del recinto.'}
  const source=inputMode==='estimated'?` T° superficial estimada: ${fmt(d.ts)} °C · U calculada: ${fmt(d.U,2)} W/m²K.`:` T° superficial interior medida: ${fmt(d.ts)} °C.`;const persistence=` Persistencia: ${d.persist.label} · aporte al índice +${fmt(d.persist.penalty,1)}.`;$('status').className='callout '+cls;$('status').innerHTML=`<b>${txt}</b> HR superficial estimada: ${fmt(d.rhs,0)}%.${source}${persistence}`;renderVaporEstimate();draw(d)
}
$('modeMeasured').onclick=()=>setMode('measured');
$('modeEstimated').onclick=()=>setMode('estimated');
$('wallTemplate').onchange=e=>loadTemplate(e.target.value);
$('addLayer').onclick=()=>{layers.push(makeLayer('custom',20));$('wallTemplate').value='custom';renderQuickControls('custom');renderLayers();render()};
$('tsSlider').oninput=()=>{$('ts').value=$('tsSlider').value;render()};
['ta','rh','ts','te'].forEach(id=>$(id).addEventListener('input',render));
$('duration').addEventListener('change',()=>{syncPersistenceUI();render()});
$('durationHours').addEventListener('input',()=>{const h=clamp(+$('durationHours').value||0,0,24);$('durationHoursSlider').value=h;syncPersistenceUI();render()});
$('durationHoursSlider').addEventListener('input',()=>{$('durationHours').value=$('durationHoursSlider').value;syncPersistenceUI();render()});
['vaporPeople','vaporPerPerson','vaporExtra'].forEach(id=>$(id).addEventListener('input',renderVaporEstimate));
loadTemplate('eifs_concrete');syncPersistenceUI();render();
