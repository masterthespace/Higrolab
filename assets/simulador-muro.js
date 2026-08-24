'use strict';
const A=17.62,B=243.12,RSE=.04,RSI=.13;
const materialLibrary={
  "Estuco cementicio":{lambda:.87,source:"Orientativo HIDROLAB · verificar mortero/producto",class:"estimate"},
  "Hormigón armado":{lambda:1.63,source:"NCh853:2021 · hormigón armado normal · ρ≈2400 kg/m³",class:"normative"},
  "Ladrillo cerámico":{lambda:.72,source:"Orientativo HIDROLAB · depende de pieza y configuración",class:"estimate"},
  "Bloque AAC":{lambda:.16,source:"Orientativo HIDROLAB · usar ficha del fabricante",class:"estimate"},
  "Yeso-cartón":{lambda:.25,source:"Orientativo HIDROLAB · verificar densidad/producto",class:"estimate"},
  "OSB":{lambda:.13,source:"Orientativo HIDROLAB · verificar densidad/producto",class:"estimate"},
  "Madera":{lambda:.13,source:"Orientativo HIDROLAB · depende de especie y humedad",class:"estimate"},
  "Lana mineral":{lambda:.040,source:"Orientativo HIDROLAB · usar λ declarada del producto",class:"estimate"},
  "Lana de vidrio":{lambda:.040,source:"Orientativo HIDROLAB · usar λ declarada del producto",class:"estimate"},
  "EPS":{lambda:.038,source:"Orientativo HIDROLAB · usar λ declarada según densidad/producto",class:"estimate"},
  "XPS":{lambda:.032,source:"Orientativo HIDROLAB · usar λ declarada del producto",class:"estimate"},
  "Poliuretano":{lambda:.025,source:"Orientativo HIDROLAB · usar λ declarada del producto",class:"estimate"},
  "Fibra de madera":{lambda:.045,source:"Orientativo HIDROLAB · usar λ declarada del producto",class:"estimate"}
};
const materials=Object.fromEntries(Object.entries(materialLibrary).map(([k,v])=>[k,v.lambda]));
let layers=[
  {m:'Estuco cementicio',e:20,l:.87,source:materialLibrary['Estuco cementicio'].source,sourceClass:'estimate'},
  {m:'Ladrillo cerámico',e:140,l:.72,source:materialLibrary['Ladrillo cerámico'].source,sourceClass:'estimate'},
  {m:'Yeso-cartón',e:15,l:.25,source:materialLibrary['Yeso-cartón'].source,sourceClass:'estimate'}
];
let wallMethod='homogeneous';
const $=id=>document.getElementById(id);const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));const fmt=(n,d=2)=>Number.isFinite(n)?n.toFixed(d).replace('.',','):'—';
function satPressure(T){return 6.112*Math.exp((A*T)/(B+T))}
function dewPoint(T,RH){const g=Math.log(clamp(RH,1,100)/100)+(A*T)/(B+T);return B*g/(A-g)}
function surfaceRH(Tair,RHair,Tsurface){const pv=(clamp(RHair,1,100)/100)*satPressure(Tair);return 100*pv/satPressure(Tsurface)}
function effectiveLayerR(layer,index){
  const base=(layer.e/1000)/Math.max(.001,layer.l);
  if(wallMethod!=='frame')return base;
  const selected=+$('frameLayer')?.value;
  if(index!==selected)return base;
  const f=clamp((+$('studFraction')?.value||15)/100,.01,.5);
  const ls=Math.max(.001,+$('studLambda')?.value||.13);
  const lf=Math.max(.001,layer.l);
  const lambdaEq=(1-f)*lf+f*ls;
  return (layer.e/1000)/lambdaEq;
}
function calc(extraR=0){
  const Ti=+$('ti').value,Te=+$('te').value,area=Math.max(0,+$('area').value||0);
  const layerR=layers.map((x,i)=>effectiveLayerR(x,i));
  const Rt=RSE+RSI+layerR.reduce((a,b)=>a+b,0)+extraR;
  const U=1/Rt,q=(Ti-Te)/Rt,Tsi=Ti-q*RSI,loss=U*area*Math.abs(Ti-Te);
  return {Ti,Te,area,layerR,Rt,U,q,Tsi,loss}
}
function materialOptions(selected){return Object.keys(materials).map(m=>`<option ${m===selected?'selected':''}>${m}</option>`).join('')+`<option ${selected==='Personalizado'?'selected':''}>Personalizado</option>`}
function renderRows(){normalizeLayerSources();const tb=$('layers');tb.innerHTML='';layers.forEach((x,i)=>{const tr=document.createElement('tr');tr.innerHTML=`<td><select class="mat" data-i="${i}">${materialOptions(x.m)}</select></td><td><input class="thick" data-i="${i}" type="number" min="1" step="1" value="${x.e}"></td><td><input class="lambda" data-i="${i}" type="number" min="0.001" step="0.001" value="${x.l}"></td><td class="rval">${fmt(effectiveLayerR(x,i),3)}</td><td><span class="material-source ${x.sourceClass||'estimate'}">${x.source||'Valor personalizado por usuario'}</span></td><td><div class="row-actions"><button class="up" data-i="${i}" title="Subir">↑</button><button class="down" data-i="${i}" title="Bajar">↓</button><button class="del" data-i="${i}" title="Eliminar">×</button></div></td>`;tb.appendChild(tr)});bindRows()}
function bindRows(){document.querySelectorAll('.mat').forEach(el=>el.addEventListener('change',()=>{const i=+el.dataset.i;layers[i].m=el.value;if(materials[el.value]){layers[i].l=materials[el.value];layers[i].source=materialLibrary[el.value]?.source||'Biblioteca HIDROLAB';layers[i].sourceClass=materialLibrary[el.value]?.class||'estimate'}renderRows();renderFrameLayerOptions();render()}));document.querySelectorAll('.thick').forEach(el=>el.addEventListener('input',()=>{layers[+el.dataset.i].e=Math.max(1,+el.value||1);render()}));document.querySelectorAll('.lambda').forEach(el=>el.addEventListener('input',()=>{layers[+el.dataset.i].l=Math.max(.001,+el.value||.001);layers[+el.dataset.i].m='Personalizado';layers[+el.dataset.i].source='Valor personalizado por usuario';layers[+el.dataset.i].sourceClass='custom';render()}));document.querySelectorAll('.del').forEach(el=>el.addEventListener('click',()=>{if(layers.length>1){layers.splice(+el.dataset.i,1);renderRows();render()}}));document.querySelectorAll('.up').forEach(el=>el.addEventListener('click',()=>{const i=+el.dataset.i;if(i>0){[layers[i-1],layers[i]]=[layers[i],layers[i-1]];renderRows();render()}}));document.querySelectorAll('.down').forEach(el=>el.addEventListener('click',()=>{const i=+el.dataset.i;if(i<layers.length-1){[layers[i+1],layers[i]]=[layers[i],layers[i+1]];renderRows();render()}}))}

function normalizeLayerSources(){
  layers.forEach(l=>{
    if(!l.source){
      const meta=materialLibrary[l.m];
      l.source=meta?.source||'Valor personalizado por usuario';
      l.sourceClass=meta?.class||'custom';
    }
  })
}
function renderFrameLayerOptions(){
  const sel=$('frameLayer');if(!sel)return;
  const prev=sel.value;
  sel.innerHTML=layers.map((l,i)=>`<option value="${i}">${i+1}. ${l.m} · ${l.e} mm</option>`).join('');
  if([...sel.options].some(o=>o.value===prev))sel.value=prev;
}
function setWallMethod(mode){
  wallMethod=mode==='frame'?'frame':'homogeneous';
  $('methodHomogeneous')?.classList.toggle('active',wallMethod==='homogeneous');
  $('methodFrame')?.classList.toggle('active',wallMethod==='frame');
  $('frameControls')?.classList.toggle('hidden',wallMethod!=='frame');
  render();
}
const WALL_LIMITS_RESIDENTIAL={
 A:{u:2.10,rt:.48},B:{u:.80,rt:1.25},C:{u:.80,rt:1.25},D:{u:.60,rt:1.67},
 E:{u:.60,rt:1.67},F:{u:.45,rt:2.22},G:{u:.40,rt:2.50},H:{u:.30,rt:3.33},I:{u:.35,rt:2.86}
};
function renderNormative(c){
  const enabled=!!$('normEnabled')?.checked;
  $('normControls')?.classList.toggle('hidden',!enabled);
  const box=$('normResult');if(!box)return;
  if(!enabled){
    box.className='norm-result disabled';
    box.innerHTML='<small>COMPARACIÓN DESACTIVADA</small><strong>Selecciona una zona para comparar</strong><span>El cálculo U del muro sigue funcionando sin esta opción.</span>';
    return;
  }
  const z=$('thermalZone').value,lim=WALL_LIMITS_RESIDENTIAL[z],okU=c.U<=lim.u+1e-9,okRt=c.Rt>=lim.rt-1e-9,ok=okU||okRt;
  const marginU=lim.u-c.U,marginRt=c.Rt-lim.rt;
  box.className='norm-result '+(ok?'pass':'fail');
  box.innerHTML=`<small>ZONA ${z} · MURO PERIMETRAL RESIDENCIAL</small>
    <strong>${ok?'Bajo el límite térmico seleccionado':'Sobre el límite térmico seleccionado'}</strong>
    <div class="norm-values"><span>Tu muro <b>U ${fmt(c.U,2)}</b></span><span>Límite <b>U ≤ ${fmt(lim.u,2)}</b></span><span>Rt <b>${fmt(c.Rt,2)}</b></span><span>Mínimo <b>Rt ≥ ${fmt(lim.rt,2)}</b></span></div>
    <em>${ok?`Margen U: ${fmt(Math.abs(marginU),2)} W/m²K · margen Rt: ${fmt(Math.max(0,marginRt),2)} m²K/W`:`Falta reducir U aproximadamente ${fmt(Math.abs(marginU),2)} W/m²K.`}</em>
    <p>Comparación del parámetro U/Rt solamente. No equivale a una declaración de cumplimiento integral del proyecto.</p>`;
}
function renderResistanceContribution(c){
  const host=$('resistanceContribution');if(!host)return;
  const layerTotal=Math.max(.0001,c.layerR.reduce((a,b)=>a+b,0));
  host.innerHTML=layers.map((l,i)=>{
    const r=c.layerR[i],pct=r/layerTotal*100;
    const note=wallMethod==='frame'&&i===+$('frameLayer')?.value?' · entramado corregido':'';
    return `<div class="r-contrib-row"><div><b>${l.m}</b><span>${fmt(r,3)} m²K/W${note}</span></div><div class="r-contrib-bar"><i style="width:${Math.max(2,pct)}%"></i></div><strong>${fmt(pct,0)}%</strong></div>`
  }).join('')+`<div class="r-contrib-note">Porcentaje calculado sobre la suma de resistencias de las capas, sin incluir Rsi/Rse.</div>`;
}
function stackHtml(addInsulation=false){const insE=addInsulation?+$('insThickness').value:0;const insName=$('insulation').options[$('insulation').selectedIndex]?.textContent.split('·')[0].trim()||'Aislación';const all=addInsulation&&insE>0?[{m:insName,e:insE,l:+$('insulation').value,ins:true},...layers]:layers.map(x=>({...x}));const total=Math.max(1,all.reduce((a,x)=>a+x.e,0));return all.map((x,i)=>{const hue=[195,35,25,210,45,100,65,160][i%8];const w=Math.max(7,x.e/total*100);return `<div class="layer-block${x.ins?' insulation-highlight':''}" title="${x.m} · ${x.e} mm" style="width:${w}%;background:hsl(${hue} 38% 78%)"><span>${x.m} · ${x.e}mm</span></div>`}).join('')}
function renderStack(){if($('stack'))$('stack').innerHTML=stackHtml(false);if($('stackCurrent'))$('stackCurrent').innerHTML=stackHtml(false);if($('stackImproved'))$('stackImproved').innerHTML=stackHtml(true)}
function riskFor(ts,dew,rhs){const m=ts-dew;if(m<=0)return ['Condensación superficial posible','danger'];if(m<2)return ['Margen crítico respecto del rocío','warn'];if(rhs>=80)return ['HR superficial elevada','warn'];return ['Margen favorable','safe']}
function profileSvg(c,dew){
  const W=900,H=430,L=70,R=34,T=34,BT=92;
  const totalThickness=Math.max(1,layers.reduce((a,x)=>a+x.e,0));
  const pad=Math.max(10,totalThickness*.055);
  const xMax=totalThickness+2*pad;
  const minT=Math.min(c.Te,c.Ti,dew)-3,maxT=Math.max(c.Te,c.Ti,dew)+3;
  const sx=x=>L+x/xMax*(W-L-R);
  const sy=y=>T+(maxT-y)/(maxT-minT)*(H-T-BT);
  let s=`<rect width="${W}" height="${H}" fill="#fbfcfc"/>`;
  for(let i=0;i<=5;i++){
    const y=minT+(maxT-minT)*i/5;
    s+=`<line x1="${L}" y1="${sy(y)}" x2="${W-R}" y2="${sy(y)}" stroke="#dfe7ea"/>`;
    s+=`<text x="${L-10}" y="${sy(y)+4}" text-anchor="end" font-size="11" fill="#687983">${fmt(y,1)}°</text>`;
  }
  s+=`<line x1="${L}" y1="${T}" x2="${L}" y2="${H-BT}" stroke="#7e9098"/><line x1="${L}" y1="${H-BT}" x2="${W-R}" y2="${H-BT}" stroke="#7e9098"/>`;

  const points=[];
  points.push({x:0,temp:c.Te,label:'Aire exterior',kind:'air'});
  const tSe=c.Te+c.q*RSE;
  points.push({x:pad,temp:tSe,label:'Superficie ext.',kind:'surface'});
  let cum=0,current=tSe;
  layers.forEach((layer,i)=>{
    cum+=layer.e;
    current+=c.q*c.layerR[i];
    const isLast=i===layers.length-1;
    points.push({x:pad+cum,temp:current,label:isLast?'Superficie int.':`Tras ${layer.m}`,kind:isLast?'surface':'interface'});
  });
  points.push({x:xMax,temp:c.Ti,label:'Aire interior',kind:'air'});

  const pts=points.map(p=>`${sx(p.x)},${sy(p.temp)}`).join(' ');
  s+=`<polyline fill="none" stroke="#176d91" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" points="${pts}"/>`;

  points.forEach((p,i)=>{
    const x=sx(p.x),y=sy(p.temp);
    const color=p.kind==='air'?'#315864':p.kind==='surface'?'#588b2d':'#176d91';
    s+=`<circle cx="${x}" cy="${y}" r="6" fill="${color}" stroke="white" stroke-width="2"/>`;
    const dy=(i%2===0?-14:-30);
    const labelY=Math.max(T+10,y+dy);
    s+=`<text x="${x}" y="${labelY}" text-anchor="middle" font-size="12" font-weight="850" fill="${color}" stroke="#fbfcfc" stroke-width="4" paint-order="stroke">${fmt(p.temp,1)} °C</text>`;
    const axisY=H-BT+22+(i%2)*19;
    const short=p.label.length>18?p.label.replace('Superficie','Sup.').replace('Aire exterior','Aire ext.').replace('Aire interior','Aire int.'):p.label;
    s+=`<line x1="${x}" y1="${H-BT}" x2="${x}" y2="${H-BT+6}" stroke="#9aa8ae"/>`;
    s+=`<text x="${x}" y="${axisY}" text-anchor="middle" font-size="9.5" fill="#61747d">${short}</text>`;
  });

  s+=`<line x1="${L}" y1="${sy(dew)}" x2="${W-R}" y2="${sy(dew)}" stroke="#c84b4b" stroke-dasharray="7 5" stroke-width="2"/>`;
  s+=`<text x="${W-R-4}" y="${Math.max(T+12,sy(dew)-8)}" text-anchor="end" fill="#b94444" font-size="11" font-weight="800" stroke="#fbfcfc" stroke-width="4" paint-order="stroke">Punto de rocío ${fmt(dew,1)} °C</text>`;
  s+=`<text x="${W/2}" y="${H-8}" text-anchor="middle" font-size="11" font-weight="700" fill="#687983">Recorrido térmico: aire exterior → capas del elemento → aire interior</text>`;
  $('profile').innerHTML=s;
}
function describeMargin(m){if(m<0)return `${fmt(Math.abs(m),1)} °C por debajo del punto de rocío`;if(m<2)return `${fmt(m,1)} °C sobre el rocío · margen crítico`;return `+${fmt(m,1)} °C sobre el punto de rocío`}
function renderDewGauge(c,n,dew,rhOld,rhNew){const lo=Math.min(dew-4,c.Tsi-2,n.Tsi-2);const hi=Math.max(c.Ti+1,dew+5,c.Tsi+2,n.Tsi+2);const pos=t=>clamp((t-lo)/(hi-lo)*100,0,100);const dewPos=pos(dew),warnPos=pos(dew+2);$('dewDangerZone').style.width=dewPos+'%';$('dewWarningZone').style.left=dewPos+'%';$('dewWarningZone').style.width=Math.max(0,warnPos-dewPos)+'%';[['dewMarker',dew],['oldMarker',c.Tsi],['newMarker',n.Tsi]].forEach(([id,t])=>$(id).style.left=pos(t)+'%');$('dewMarkerValue').textContent=fmt(dew,1)+' °C';$('oldMarkerValue').textContent=fmt(c.Tsi,1)+' °C';$('newMarkerValue').textContent=fmt(n.Tsi,1)+' °C';$('gaugeMin').textContent=fmt(lo,1)+' °C';$('gaugeMax').textContent=fmt(hi,1)+' °C';const marginOld=c.Tsi-dew,marginNew=n.Tsi-dew;$('marginOld').textContent=(marginOld>=0?'+':'')+fmt(marginOld,1)+' °C';$('marginNew').textContent=(marginNew>=0?'+':'')+fmt(marginNew,1)+' °C';$('surfaceRhOld').textContent='HR superficial estimada: '+fmt(Math.min(rhOld,199),0)+' %';$('surfaceRhNew').textContent='HR superficial estimada: '+fmt(Math.min(rhNew,199),0)+' %';$('dewCompare').textContent=fmt(dew,1)+' °C';$('dewContext').textContent='Con HR interior de '+fmt(+$('rh').value,0)+' %';$('wallCurrentLabel').textContent=fmt(c.Tsi,1)+' °C · '+fmt(rhOld,0)+' % HR sup.';$('wallImprovedLabel').textContent=fmt(n.Tsi,1)+' °C · '+fmt(rhNew,0)+' % HR sup.';const [msg,cls]=riskFor(n.Tsi,dew,rhNew);$('condensationStatus').className='condensation-status '+(cls==='safe'?'':cls);$('condensationStatus').textContent=`${msg}. Con ${$('insThickness').value} mm: ${describeMargin(marginNew)}. La superficie aumenta ${fmt(n.Tsi-c.Tsi,1)} °C respecto del muro actual.`}
function minimumThickness(lambda,targetMargin){const c=calc(),dew=dewPoint(c.Ti,+$('rh').value),target=dew+targetMargin;if(target>=c.Ti-.05)return {ok:false,reason:'El margen solicitado alcanza o supera prácticamente la temperatura interior y no es alcanzable con este modelo.'};if(c.Tsi>=target)return {ok:true,mm:0,target,dew};const denominator=c.Ti-target;if(denominator<=0)return {ok:false,reason:'Objetivo térmico no alcanzable.'};const requiredRt=Math.abs(c.Ti-c.Te)*RSI/denominator;const extraR=Math.max(0,requiredRt-c.Rt);const mm=extraR*lambda*1000;return Number.isFinite(mm)?{ok:true,mm,target,dew}:{ok:false,reason:'No fue posible determinar el espesor.'}}
let animationToken=0;
function animateThickness(target){animationToken++;const token=animationToken;const range=$('insThickness');const start=+range.value,end=clamp(target,+range.min,+range.max);const duration=700,startTime=performance.now();function step(now){if(token!==animationToken)return;const p=clamp((now-startTime)/duration,0,1),ease=1-Math.pow(1-p,3);range.value=Math.round((start+(end-start)*ease)/5)*5;render();if(p<1)requestAnimationFrame(step)}requestAnimationFrame(step)}
function findMinimum(){const lambda=+$('insulation').value,targetMargin=+$('targetMargin').value,res=minimumThickness(lambda,targetMargin),box=$('minimumResult');if(!res.ok){box.className='minimum-result warning';box.querySelector('strong').textContent='Objetivo no alcanzable';box.querySelector('span').textContent=res.reason;return}const rounded=Math.ceil(res.mm/5)*5;if(rounded>+$('insThickness').max){box.className='minimum-result warning';box.querySelector('strong').textContent='> '+$('insThickness').max+' mm';box.querySelector('span').textContent=`Se estiman ${fmt(res.mm,0)} mm para lograr +${fmt(targetMargin,1)} °C. Amplía el rango o revisa la solución constructiva.`;return}box.className='minimum-result success';box.querySelector('strong').textContent=rounded+' mm';box.querySelector('span').textContent=`Espesor estimado para mantener la superficie al menos +${fmt(targetMargin,1)} °C sobre el punto de rocío. Se moverá el simulador a ese valor.`;animateThickness(rounded)}
function render(){document.querySelectorAll('.rval').forEach((el,i)=>{if(layers[i])el.textContent=fmt(effectiveLayerR(layers[i],i),3)});const c=calc(),RH=+$('rh').value,dew=dewPoint(c.Ti,RH),rhOld=surfaceRH(c.Ti,RH,c.Tsi);renderFrameLayerOptions();renderNormative(c);renderResistanceContribution(c);$('rt').textContent=fmt(c.Rt,3);$('u').textContent=fmt(c.U,2);if($('uExplain'))$('uExplain').textContent=`Por cada 1 m² de muro y cada 1 °C de diferencia, atraviesan aproximadamente ${fmt(c.U,2)} W en régimen estacionario.`;$('tsi').textContent=fmt(c.Tsi,1);$('loss').textContent=c.area>0?fmt(c.loss,0):'—';$('uOld').textContent=fmt(c.U,2);$('tsiOld').textContent=fmt(c.Tsi,1)+' °C';$('lossOld').textContent=c.area>0?fmt(c.loss,0)+' W':'—';$('dew').textContent=fmt(dew,1)+' °C';$('dewMargin').textContent=(c.Tsi-dew>=0?'+':'')+fmt(c.Tsi-dew,1)+' °C';$('q').textContent=fmt(c.q,1)+' W/m²';$('totalThickness').textContent=layers.reduce((a,x)=>a+x.e,0)+' mm';const [msg,cls]=riskFor(c.Tsi,dew,rhOld);$('dewCallout').className='callout '+cls;$('dewCallout').innerHTML=`<b>${msg}.</b> Superficie interior estimada: ${fmt(c.Tsi,1)} °C · punto de rocío: ${fmt(dew,1)} °C · margen: ${fmt(c.Tsi-dew,1)} °C · HR superficial estimada: ${fmt(Math.min(rhOld,199),0)} %.`;
const insE=+$('insThickness').value;$('insLabel').textContent=insE+' mm';const insR=(insE/1000)/(+$('insulation').value);const n=calc(insR),rhNew=surfaceRH(c.Ti,RH,n.Tsi);$('uNew').textContent=fmt(n.U,2);$('tsiNew').textContent=fmt(n.Tsi,1)+' °C';$('lossNew').textContent=c.area>0?fmt(n.loss,0)+' W':'—';const imp=clamp((1-n.U/c.U)*100,0,100);$('improvement').textContent=fmt(imp,0)+' %';$('improvementBar').style.width=imp+'%';const [nmsg,ncls]=riskFor(n.Tsi,dew,rhNew);$('riskChange').className='status-pill '+ncls;$('riskChange').textContent=nmsg;renderStack();renderDewGauge(c,n,dew,rhOld,rhNew);profileSvg(c,dew)}
$('addLayer').addEventListener('click',()=>{layers.push({m:'Lana mineral',e:50,l:.04});renderRows();render()});$('presetBrick').addEventListener('click',()=>{layers=[{m:'Estuco cementicio',e:20,l:.87},{m:'Ladrillo cerámico',e:140,l:.72},{m:'Yeso-cartón',e:15,l:.25}];renderRows();render()});$('presetTimber').addEventListener('click',()=>{layers=[{m:'Yeso-cartón',e:15,l:.25},{m:'Lana mineral',e:90,l:.04},{m:'OSB',e:11,l:.13},{m:'Madera',e:20,l:.13}];renderRows();render()});['ti','te','rh','area','insulation','insThickness'].forEach(id=>$(id).addEventListener('input',render));
function syncTargetMargin(source){
  const range=$('targetMargin'),num=$('targetMarginN');
  let v=source==='number'?+num.value:+range.value;
  v=clamp(Number.isFinite(v)?v:2,+range.min,+range.max);
  v=Math.round(v*2)/2;
  range.value=v;num.value=v;$('targetMarginLabel').textContent='+'+fmt(v,1)+' °C';
}
$('targetMargin').addEventListener('input',()=>syncTargetMargin('range'));
$('targetMarginN').addEventListener('input',()=>syncTargetMargin('number'));
$('findMinimum').addEventListener('click',findMinimum);syncTargetMargin('range');

window.HIDROLAB_WALL_REPORT=()=>{
  const c=calc(),RH=+$('rh').value,dew=dewPoint(c.Ti,RH),zone=$('thermalZone')?.value||'F',lim=WALL_LIMITS_RESIDENTIAL[zone];
  const insE=+$('insThickness').value||0,insL=+$('insulation').value||.038,n=calc(insE>0?(insE/1000)/insL:0);
  return{
    method:wallMethod,Ti:c.Ti,Te:c.Te,RH,area:c.area,Rt:c.Rt,U:c.U,Tsi:c.Tsi,q:c.q,loss:c.loss,dew,margin:c.Tsi-dew,
    rsi:RSI,rse:RSE,layers:layers.map((l,i)=>({order:i+1,name:l.m,thickness:l.e,lambda:l.l,R:c.layerR[i],source:l.source||'',sourceClass:l.sourceClass||''})),
    frame:wallMethod==='frame'?{layer:+$('frameLayer').value+1,studFraction:+$('studFraction').value,studLambda:+$('studLambda').value}:null,
    improvement:{material:$('insulation').options[$('insulation').selectedIndex]?.textContent||'',thickness:insE,U:n.U,Rt:n.Rt,Tsi:n.Tsi,loss:n.loss},
    normative:{enabled:!!$('normEnabled')?.checked,zone,limitU:lim.u,limitRt:lim.rt,pass:c.U<=lim.u||c.Rt>=lim.rt}
  }
};
$('methodHomogeneous')?.addEventListener('click',()=>setWallMethod('homogeneous'));
$('methodFrame')?.addEventListener('click',()=>setWallMethod('frame'));
['frameLayer','studFraction','studLambda','thermalZone'].forEach(id=>$(id)?.addEventListener('input',render));
$('normEnabled')?.addEventListener('change',render);
$('thermalZone')?.addEventListener('change',render);
renderRows();render();
