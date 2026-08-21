const A=17.62,B=243.12,R_SI=0.13,R_SE=0.04,$=id=>document.getElementById(id),
fmt=(n,d=1)=>Number.isFinite(n)?n.toFixed(d).replace('.',','):'—',
clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
let inputMode='measured',layers=[];

const MATERIALS={
  eps:{name:'EPS',lambda:0.038,min:20,max:100,step:10,thickness:50},
  concrete:{name:'Hormigón armado',lambda:1.63,min:100,max:250,step:10,thickness:150},
  masonry_armada:{name:'Albañilería armada',lambda:0.80,min:150,max:150,step:1,thickness:150},
  masonry_reforzada:{name:'Albañilería reforzada',lambda:0.80,min:150,max:150,step:1,thickness:150},
  fibercement:{name:'Placa fibrocemento / Permanit',lambda:0.35,min:4,max:12,step:2,thickness:8},
  osb:{name:'OSB',lambda:0.13,min:11,max:11,step:1,thickness:11},
  glasswool:{name:'Lana de vidrio',lambda:0.040,min:80,max:140,step:10,thickness:100},
  mineralwool:{name:'Lana mineral',lambda:0.039,min:80,max:140,step:10,thickness:100},
  gypsum:{name:'Yeso-cartón',lambda:0.25,min:12,max:12,step:1,thickness:12},
  plaster:{name:'Estuco / mortero',lambda:0.87,min:5,max:25,step:5,thickness:15},
  air:{name:'Cámara de aire',R:0.18,kind:'air',thickness:25},
  custom:{name:'Material personalizado',lambda:0.20,min:1,max:300,step:1,thickness:20}
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
  return{id:(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)),type,name:m.name,thickness:thickness??m.thickness,lambda:m.lambda??null,R:m.R??null,kind:m.kind||'solid'}
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
  if(l.kind==='air')return clamp(+l.R||0,0,2);
  return (clamp(+l.thickness||0,0,1000)/1000)/clamp(+l.lambda||.001,.001,10)
}
function thermal(){const rLayers=layers.reduce((s,l)=>s+layerR(l),0),rTotal=R_SI+rLayers+R_SE;return{rLayers,rTotal,U:1/rTotal}}
function estimatedSurfaceTemperature(ti,te,u){return ti-u*R_SI*(ti-te)}
function data(){
  const ta=+$('ta').value,rh=clamp(+$('rh').value,1,100),te=+$('te').value,th=thermal(),measuredTs=+$('ts').value,
  ts=inputMode==='estimated'?estimatedSurfaceTemperature(ta,te,th.U):measuredTs,p=pv(ta,rh),rhs=100*p/ps(ts),d=dew(ta,rh),t80=threshold(p,.8),dur=+$('duration').value;
  let base=rhs<=65?10:rhs<70?20:rhs<80?40:rhs<90?65:rhs<100?82:95,score=clamp(base+(dur-1)*5,0,100);
  return{ta,rh,te,ts,p,rhs,d,t80,dur,score,...th}
}
function materialOptions(selected){return Object.entries(MATERIALS).map(([k,m])=>`<option value="${k}"${k===selected?' selected':''}>${m.name}</option>`).join('')}
function renderLayers(){
  const host=$('wallLayers');if(!host)return;
  host.innerHTML=layers.map((l,i)=>{
    const air=l.kind==='air';
    return `<div class="wall-layer" data-id="${l.id}">
      <div class="layer-order">${i+1}</div>
      <div class="layer-main"><select class="layer-type">${materialOptions(l.type)}</select><span class="layer-position">${i===0?'EXTERIOR':i===layers.length-1?'INTERIOR':''}</span></div>
      <label>${air?'Espesor ref.':'Espesor'} [mm]<input class="layer-thickness" type="number" min="1" max="1000" step="${MATERIALS[l.type]?.step||1}" value="${l.thickness}"></label>
      <label>${air?'R cámara [m²K/W]':'λ [W/mK]'}<input class="layer-prop" type="number" min=".001" step="${air?'.01':'.001'}" value="${air?l.R:l.lambda}"></label>
      <div class="layer-r"><span>R capa</span><b>${fmt(layerR(l),3)}</b></div>
      <div class="layer-actions"><button class="layer-up" type="button">↑</button><button class="layer-down" type="button">↓</button><button class="layer-delete" type="button">×</button></div>
    </div>`
  }).join('');
  host.querySelectorAll('.wall-layer').forEach(row=>{
    const id=row.dataset.id,get=()=>layers.find(l=>l.id===id);
    row.querySelector('.layer-type').onchange=e=>{const l=get(),m=MATERIALS[e.target.value];if(!l||!m)return;l.type=e.target.value;l.name=m.name;l.kind=m.kind||'solid';l.lambda=m.lambda??null;l.R=m.R??null;l.thickness=m.thickness;$('wallTemplate').value='custom';renderQuickControls('custom');renderLayers();render()};
    row.querySelector('.layer-thickness').oninput=e=>{const l=get();if(l){l.thickness=+e.target.value;$('wallTemplate').value='custom';render()}};
    row.querySelector('.layer-prop').oninput=e=>{const l=get();if(l){if(l.kind==='air')l.R=+e.target.value;else l.lambda=+e.target.value;$('wallTemplate').value='custom';render()}};
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
function setMode(mode){inputMode=mode==='estimated'?'estimated':'measured';$('modeMeasured').classList.toggle('active',inputMode==='measured');$('modeEstimated').classList.toggle('active',inputMode==='estimated');$('measuredPanel').classList.toggle('hidden',inputMode!=='measured');$('estimatedPanel').classList.toggle('hidden',inputMode!=='estimated');render()}
function render(){
  const d=data(),st=scoreStyle(d.score);
  if(inputMode==='measured'){$('tsSlider').min=Math.floor(d.d-5);$('tsSlider').max=Math.ceil(d.ta+5);$('tsSlider').value=d.ts;$('tsLabel').textContent=fmt(d.ts)+' °C';$('tsMinLabel').textContent=$('tsSlider').min+' °C';$('tsMaxLabel').textContent=$('tsSlider').max+' °C'}
  else{$('rLayers').textContent=fmt(d.rLayers,3);$('rTotal').textContent=fmt(d.rTotal,3);$('uCalculated').textContent=fmt(d.U,2);$('tsEstimated').textContent=fmt(d.ts,1)}
  $('rhs').textContent=fmt(d.rhs,0);$('dew').textContent=fmt(d.d);$('t80').textContent=fmt(d.t80);$('margin').textContent=fmt(d.ts-d.d);$('score').textContent=fmt(d.score,0);$('scoreLevel').textContent=`${st.level} · 0 = bajo · 100 = muy alto`;$('scoreBar').style.width=d.score+'%';$('scoreBar').style.background=st.color;$('score').style.color=st.color;
  let cls='safe',txt='Humedad superficial relativamente baja para este indicador.';if(d.rhs>=100){cls='danger';txt='La superficie está en condición de saturación o condensación posible.'}else if(d.rhs>=90){cls='danger';txt='Humedad superficial muy alta; si persiste, la condición requiere atención.'}else if(d.rhs>=80){cls='warn';txt='Humedad superficial elevada; la persistencia aumenta el riesgo preventivo.'}else if(d.rhs>=70){cls='warn';txt='Zona de atención: la superficie está acumulando una HR mayor que el aire del recinto.'}
  const source=inputMode==='estimated'?` T° superficial estimada: ${fmt(d.ts)} °C · U calculada: ${fmt(d.U,2)} W/m²K.`:` T° superficial interior medida: ${fmt(d.ts)} °C.`;$('status').className='callout '+cls;$('status').innerHTML=`<b>${txt}</b> HR superficial estimada: ${fmt(d.rhs,0)}%.${source}`;draw(d)
}
$('modeMeasured').onclick=()=>setMode('measured');$('modeEstimated').onclick=()=>setMode('estimated');$('wallTemplate').onchange=e=>loadTemplate(e.target.value);$('addLayer').onclick=()=>{layers.push(makeLayer('custom',20));$('wallTemplate').value='custom';renderQuickControls('custom');renderLayers();render()};$('tsSlider').oninput=()=>{$('ts').value=$('tsSlider').value;render()};['ta','rh','ts','te','duration'].forEach(id=>$(id).addEventListener('input',render));
loadTemplate('eifs_concrete');render();
