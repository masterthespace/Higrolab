const A=17.62,B=243.12,R_SI=0.13,$=id=>document.getElementById(id),
fmt=(n,d=1)=>Number.isFinite(n)?n.toFixed(d).replace('.',','):'—',
clamp=(x,a,b)=>Math.min(b,Math.max(a,x));

let inputMode='measured';

function ps(T){return 6.112*Math.exp(A*T/(B+T))}
function pv(T,RH){return ps(T)*RH/100}
function dew(T,RH){
  const g=Math.log(clamp(RH,1,100)/100)+A*T/(B+T);
  return B*g/(A-g)
}
function threshold(p,target){
  const l=Math.log((p/target)/6.112);
  return B*l/(A-l)
}
function estimatedSurfaceTemperature(ti,te,u){
  u=clamp(u,.1,6);
  return ti-u*R_SI*(ti-te)
}
function scoreStyle(score){
  if(score<40)return{level:'BAJO',color:'#2f9b67',className:'risk-green'};
  if(score<60)return{level:'ATENCIÓN',color:'#d1aa2f',className:'risk-yellow'};
  if(score<80)return{level:'ELEVADO',color:'#e68432',className:'risk-orange'};
  return{level:'MUY ALTO',color:'#d34e4e',className:'risk-red'}
}
function data(){
  const ta=+$('ta').value,
        rh=clamp(+$('rh').value,1,100),
        te=+$('te').value,
        u=clamp(+$('uWall').value,.1,6),
        measuredTs=+$('ts').value,
        ts=inputMode==='estimated'?estimatedSurfaceTemperature(ta,te,u):measuredTs,
        p=pv(ta,rh),
        rhs=100*p/ps(ts),
        d=dew(ta,rh),
        t80=threshold(p,.8),
        dur=+$('duration').value;

  let base=rhs<=65?10:rhs<70?20:rhs<80?40:rhs<90?65:rhs<100?82:95;
  let score=clamp(base+(dur-1)*5,0,100);
  return{ta,rh,te,u,ts,p,rhs,d,t80,dur,score,mode:inputMode}
}
function draw(d){
  const W=900,H=410,L=62,R=25,T=25,BT=52,
        minX=Math.min(-5,Math.floor(d.d-5),Math.floor(d.te-2)),
        maxX=Math.max(25,Math.ceil(d.ta+3)),
        minY=40,maxY=110,
        sx=x=>L+(x-minX)/(maxX-minX)*(W-L-R),
        sy=y=>T+(maxY-y)/(maxY-minY)*(H-T-BT);

  let s=`<rect width="${W}" height="${H}" fill="#fbfcfc"/>`;
  [[40,70,'#e8f5ef'],[70,80,'#eef5dc'],[80,90,'#fff5db'],[90,100,'#fff0e5'],[100,110,'#fde8e8']].forEach(z=>
    s+=`<rect x="${L}" y="${sy(z[1])}" width="${W-L-R}" height="${sy(z[0])-sy(z[1])}" fill="${z[2]}"/>`
  );
  [50,60,70,80,90,100].forEach(y=>
    s+=`<line x1="${L}" y1="${sy(y)}" x2="${W-R}" y2="${sy(y)}" stroke="#dfe7ea"/>
        <text x="${L-9}" y="${sy(y)+4}" text-anchor="end" font-size="11" fill="#667983">${y}%</text>`
  );
  let pts=[];
  for(let x=minX;x<=maxX;x+=.2)pts.push(`${sx(x)},${sy(clamp(100*d.p/ps(x),minY,maxY))}`);
  const st=scoreStyle(d.score);
  s+=`<polyline fill="none" stroke="#176d91" stroke-width="4" points="${pts.join(' ')}"/>
      <circle cx="${sx(d.ts)}" cy="${sy(clamp(d.rhs,minY,maxY))}" r="7" fill="${st.color}" stroke="white" stroke-width="3"/>
      <line x1="${sx(d.d)}" y1="${T}" x2="${sx(d.d)}" y2="${H-BT}" stroke="#c84b4b" stroke-dasharray="6 5"/>
      <text x="${sx(d.d)+5}" y="${T+16}" font-size="11" fill="#b94444">Rocío ${fmt(d.d)}°C</text>
      <text x="${W/2}" y="${H-6}" text-anchor="middle" font-size="12" font-weight="700" fill="#52636c">Temperatura superficial interior del muro (°C)</text>
      <text x="16" y="${H/2}" transform="rotate(-90 16 ${H/2})" text-anchor="middle" font-size="12" font-weight="700" fill="#52636c">HR superficial</text>`;
  $('chart').innerHTML=s
}
function setMode(mode){
  inputMode=mode==='estimated'?'estimated':'measured';
  $('modeMeasured').classList.toggle('active',inputMode==='measured');
  $('modeEstimated').classList.toggle('active',inputMode==='estimated');
  $('measuredPanel').classList.toggle('hidden',inputMode!=='measured');
  $('estimatedPanel').classList.toggle('hidden',inputMode!=='estimated');
  render()
}
function syncPreset(){
  const v=$('uPreset').value;
  if(v!=='manual')$('uWall').value=v;
  render()
}
function render(){
  const d=data(),st=scoreStyle(d.score);

  if(inputMode==='measured'){
    $('tsSlider').min=Math.floor(d.d-5);
    $('tsSlider').max=Math.ceil(d.ta+5);
    $('tsSlider').value=d.ts;
    $('tsLabel').textContent=fmt(d.ts)+' °C';
    $('tsMinLabel').textContent=$('tsSlider').min+' °C';
    $('tsMaxLabel').textContent=$('tsSlider').max+' °C';
  }else{
    $('tsEstimated').textContent=fmt(d.ts,1);
    const q=$('estimateQuality');
    const delta=d.ta-d.te;
    q.className='estimate-quality'+(Math.abs(delta)<2?' mild':'');
    q.querySelector('b').textContent=Math.abs(delta)<2?'Estimación con bajo gradiente térmico':'Estimación orientativa';
  }

  $('rhs').textContent=fmt(d.rhs,0);
  $('dew').textContent=fmt(d.d);
  $('t80').textContent=fmt(d.t80);
  $('margin').textContent=fmt(d.ts-d.d);
  $('score').textContent=fmt(d.score,0);
  $('scoreLevel').textContent=`${st.level} · 0 = bajo · 100 = muy alto`;
  $('scoreBar').style.width=d.score+'%';
  $('scoreBar').style.background=st.color;
  $('score').style.color=st.color;

  let cls='safe',txt='Humedad superficial relativamente baja para este indicador.';
  if(d.rhs>=100){
    cls='danger';txt='La superficie está en condición de saturación o condensación posible.'
  }else if(d.rhs>=90){
    cls='danger';txt='Humedad superficial muy alta; si persiste, la condición requiere atención.'
  }else if(d.rhs>=80){
    cls='warn';txt='Humedad superficial elevada; la persistencia aumenta el riesgo preventivo.'
  }else if(d.rhs>=70){
    cls='warn';txt='Zona de atención: la superficie está acumulando una HR mayor que el aire del recinto.'
  }

  const source=inputMode==='estimated'
    ?` T° superficial interior estimada: ${fmt(d.ts)} °C (Ti ${fmt(d.ta)} °C · Te ${fmt(d.te)} °C · U ${fmt(d.u,2)} W/m²K).`
    :` T° superficial interior medida: ${fmt(d.ts)} °C.`;

  $('status').className='callout '+cls;
  $('status').innerHTML=`<b>${txt}</b> HR superficial estimada: ${fmt(d.rhs,0)}%.${source}`;
  draw(d)
}

$('modeMeasured').onclick=()=>setMode('measured');
$('modeEstimated').onclick=()=>setMode('estimated');
$('uPreset').onchange=syncPreset;
$('uWall').addEventListener('input',()=>{$('uPreset').value='manual';render()});
$('tsSlider').oninput=()=>{$('ts').value=$('tsSlider').value;render()};
['ta','rh','ts','te','duration'].forEach(id=>$(id).addEventListener('input',render));

render();
