const A=17.62, B=243.12;
const $=id=>document.getElementById(id);
const state={ti:8.4,rhi:74,te:1,rhe:98,surface:5};

function clamp(x,a,b){return Math.min(b,Math.max(a,x))}
function satPressure(T){return 6.112*Math.exp((A*T)/(B+T))}
function vaporPressure(T,RH){return (RH/100)*satPressure(T)}
function dewPoint(T,RH){
  const g=Math.log(RH/100)+(A*T)/(B+T);
  return B*g/(A-g);
}
function thresholdFromPv(pv, targetRH){
  const l=Math.log((pv/targetRH)/6.112);
  return B*l/(A-l);
}
function surfaceRH(pv,Ts){return 100*pv/satPressure(Ts)}
function f(n,d=1){return Number.isFinite(n)?n.toFixed(d).replace('.',','):'—'}

const pairs=[['ti','tiN'],['rhi','rhiN'],['te','teN'],['rhe','rheN']];
pairs.forEach(([rangeId,numId])=>{
  const r=$(rangeId), n=$(numId);
  r.addEventListener('input',()=>{n.value=r.value;state[rangeId]=+r.value;render()});
  n.addEventListener('input',()=>{let v=+n.value;v=clamp(v,+r.min,+r.max);r.value=v;state[rangeId]=v;render()});
});

const presets={
  excel:{ti:8.4,rhi:74,te:1,rhe:98},
  comfort:{ti:20,rhi:50,te:5,rhe:80},
  humid:{ti:18,rhi:82,te:8,rhe:95},
  winter:{ti:16,rhi:70,te:-2,rhe:90}
};
document.querySelectorAll('.preset').forEach(b=>b.addEventListener('click',()=>{
  Object.assign(state,presets[b.dataset.preset]);
  syncInputs(); render();
}));

$('surface').addEventListener('input',()=>{state.surface=+$('surface').value;renderSimulator()});

function syncInputs(){
  pairs.forEach(([r,n])=>{ $(r).value=state[r]; $(n).value=state[r]; });
}

function diagnose(rh){
  if(rh>=80)return ['AMBIENTE INTERIOR MUY HÚMEDO','very'];
  if(rh>=70)return ['AMBIENTE INTERIOR HÚMEDO','high'];
  if(rh>=60)return ['HUMEDAD INTERIOR MODERADA-ALTA','high'];
  return ['HUMEDAD INTERIOR MODERADA','mod'];
}

function render(){
  const dpi=dewPoint(state.ti,state.rhi);
  const dpe=dewPoint(state.te,state.rhe);
  const pvi=vaporPressure(state.ti,state.rhi);
  const pve=vaporPressure(state.te,state.rhe);
  const ahi=216.7*pvi/(state.ti+273.15);
  const t90=thresholdFromPv(pvi,.9);
  const t80=thresholdFromPv(pvi,.8);
  const t70=thresholdFromPv(pvi,.7);

  $('dpi').textContent=f(dpi)+' °C';
  $('dpe').textContent=f(dpe)+' °C';
  $('margin').textContent=f(state.ti-dpi)+' °C';
  $('pvi').textContent=f(pvi,2)+' hPa';
  $('pve').textContent=f(pve,2)+' hPa';
  $('ahi').textContent=f(ahi,2)+' g/m³';
  $('t100').textContent=f(dpi)+' °C';
  $('t90').textContent=f(t90)+' °C';
  $('t80').textContent=f(t80)+' °C';
  $('t70').textContent=f(t70)+' °C';

  const [txt,cls]=diagnose(state.rhi);
  $('diagnosis').className='diagnosis '+cls;
  $('diagnosis').textContent=txt;

  const lo=Math.floor(Math.min(state.te-4,dpi-5));
  const hi=Math.ceil(state.ti+3);
  $('surface').min=lo; $('surface').max=hi;
  if(state.surface<lo||state.surface>hi) state.surface=(dpi+state.ti)/2;
  $('surface').value=state.surface;
  $('surfaceMin').textContent=lo+' °C'; $('surfaceMax').textContent=hi+' °C';

  drawChart(pvi,lo,hi,dpi,t90,t80,t70);
  renderSimulator();
}

function renderSimulator(){
  const pvi=vaporPressure(state.ti,state.rhi);
  const dpi=dewPoint(state.ti,state.rhi);
  const rh=surfaceRH(pvi,state.surface);
  const gap=state.surface-dpi;
  $('simTemp').textContent=f(state.surface)+' °C';
  $('surfaceRh').textContent=f(Math.min(rh,199))+' %';
  $('surfaceGap').textContent=(gap>=0?'+':'')+f(gap)+' °C';

  let text,cls,op,filter;
  if(rh>=100){text='CONDENSACIÓN POSIBLE';cls='danger';op=1;filter='saturate(.8) brightness(.86)'}
  else if(rh>=90){text='MUY CERCA DE SATURACIÓN';cls='danger';op=.65;filter='saturate(.9) brightness(.92)'}
  else if(rh>=80){text='RIESGO HIGROTÉRMICO ALTO';cls='warn';op=.2;filter='brightness(.96)'}
  else if(rh>=70){text='ZONA DE ATENCIÓN';cls='warn';op=0;filter='brightness(1)'}
  else{text='MARGEN HIGROTÉRMICO MAYOR';cls='safe';op=0;filter='brightness(1.03)'}
  $('simRisk').className='risk-badge '+cls;$('simRisk').textContent=text;
  $('drops').style.opacity=op;$('wall').style.filter=filter;
}

function drawChart(pv,xMin,xMax,dpi,t90,t80,t70){
  const svg=$('rhChart'), W=720,H=390, L=62,R=25,T=25,BM=52;
  const pw=W-L-R, ph=H-T-BM, yMin=40,yMax=110;
  const sx=x=>L+(x-xMin)/(xMax-xMin)*pw;
  const sy=y=>T+(yMax-y)/(yMax-yMin)*ph;
  let s=`<rect width="${W}" height="${H}" fill="#fbfcfc"/>`;
  // zones
  const zones=[[100,110,'#fde8e8'],[90,100,'#fff0e5'],[80,90,'#fff5db'],[70,80,'#eef5dc'],[40,70,'#e8f5ef']];
  zones.forEach(([a,b,c])=>s+=`<rect x="${L}" y="${sy(b)}" width="${pw}" height="${sy(a)-sy(b)}" fill="${c}"/>`);
  // grid + labels
  [40,50,60,70,80,90,100,110].forEach(y=>{
    s+=`<line x1="${L}" y1="${sy(y)}" x2="${W-R}" y2="${sy(y)}" stroke="#d9e2e6" stroke-width="1"/>`;
    s+=`<text x="${L-10}" y="${sy(y)+4}" text-anchor="end" font-size="11" fill="#6d7c84">${y}%</text>`;
  });
  const ticks=6;
  for(let i=0;i<=ticks;i++){
    const x=xMin+(xMax-xMin)*i/ticks;
    s+=`<line x1="${sx(x)}" y1="${T}" x2="${sx(x)}" y2="${H-BM}" stroke="#e4eaed" stroke-width="1"/>`;
    s+=`<text x="${sx(x)}" y="${H-24}" text-anchor="middle" font-size="11" fill="#6d7c84">${f(x)}°</text>`;
  }
  s+=`<line x1="${L}" y1="${T}" x2="${L}" y2="${H-BM}" stroke="#87969d"/><line x1="${L}" y1="${H-BM}" x2="${W-R}" y2="${H-BM}" stroke="#87969d"/>`;

  let pts=[];
  for(let i=0;i<=180;i++){
    const x=xMin+(xMax-xMin)*i/180;
    const y=clamp(surfaceRH(pv,x),yMin,yMax);
    pts.push(`${sx(x).toFixed(1)},${sy(y).toFixed(1)}`);
  }
  s+=`<polyline fill="none" stroke="#176d91" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${pts.join(' ')}"/>`;
  const lines=[[dpi,100,'#c84b4b','Rocío'],[t90,90,'#df7b42','90%'],[t80,80,'#c39224','80%'],[t70,70,'#4c9562','70%']];
  lines.forEach(([x,y,c,label])=>{
    if(x>=xMin&&x<=xMax){
      s+=`<line x1="${sx(x)}" y1="${sy(y)}" x2="${sx(x)}" y2="${H-BM}" stroke="${c}" stroke-width="2" stroke-dasharray="6 5"/>`;
      s+=`<circle cx="${sx(x)}" cy="${sy(y)}" r="6" fill="${c}" stroke="white" stroke-width="2"/>`;
      s+=`<text x="${sx(x)+7}" y="${Math.max(18,sy(y)-8)}" font-size="11" font-weight="700" fill="${c}">${label}: ${f(x)}°C</text>`;
    }
  });
  s+=`<text x="${W/2}" y="${H-4}" text-anchor="middle" font-size="12" font-weight="700" fill="#52636c">Temperatura superficial hipotética (°C)</text>`;
  s+=`<text x="15" y="${H/2}" transform="rotate(-90 15 ${H/2})" text-anchor="middle" font-size="12" font-weight="700" fill="#52636c">HR superficial estimada</text>`;
  svg.innerHTML=s;
}

syncInputs();
render();
