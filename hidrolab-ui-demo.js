(()=>{const root=document.documentElement,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const tools=[
 {s:'Td',name:'Punto de rocío con T° de muro',desc:'Condensación con temperatura superficial medida',url:'calculadora-rocio.html',keys:'condensacion humedad rocio muro temperatura'},
 {s:'Tc',name:'Riesgo sin T° de muro',desc:'Umbrales críticos de superficie',url:'calculadora-sin-muro.html',keys:'condensacion humedad riesgo umbral'},
 {s:'φsi',name:'Riesgo de humedad superficial',desc:'HR superficial, moho, persistencia y vapor',url:'riesgo-moho.html',keys:'humedad moho vapor condensacion'},
 {s:'ACH',name:'Ventilación y humedad',desc:'Caudal, vapor y humedad de equilibrio',url:'ventilacion-humedad.html',keys:'ventilar ventilacion aire humedad vapor ach'},
 {s:'U',name:'Simulador de muro + U',desc:'Capas, transmitancia y perfil térmico',url:'simulador-muro.html',keys:'muro aislacion aislante u transmitancia capas'},
 {s:'Q̇',name:'Pérdidas térmicas',desc:'Descubre por dónde pierdes calor',url:'perdidas-termicas.html',keys:'pierdo calor perdida perdidas techo ventanas piso calefaccion'},
 {s:'ΔU',name:'Comparador de U',desc:'Compara U con un objetivo',url:'comparador-u.html',keys:'u transmitancia comparar cumplimiento'},
 {s:'PMV',name:'Confort térmico PMV/PPD',desc:'Sensación térmica interior',url:'confort-termico.html',keys:'confort frio calor pmv ppd'},
 {s:'E',name:'Costo de calefacción',desc:'Consumo, COP, horas y tarifa',url:'costo-calefaccion.html',keys:'energia costo calefaccion consumo dinero'},
 {s:'☀',name:'Solar Studio 3D',desc:'Sombras, norte, fachadas y asoleamiento',url:'simulador-solar.html',keys:'sol solar sombra fachada norte asoleamiento 3d'}
];
function dewPoint(t,rh){const a=17.62,b=243.12,g=Math.log(rh/100)+(a*t)/(b+t);return b*g/(a-g)}
function updateLab(){if(!$('#ti'))return;const ti=+$('#ti').value,rh=+$('#rh').value,te=+$('#te').value,td=dewPoint(ti,rh);const tsi=ti-(ti-te)*.22,margin=tsi-td;
 $('#tiOut').textContent=ti.toFixed(1).replace('.',',')+' °C';$('#rhOut').textContent=rh.toFixed(0)+' %';$('#teOut').textContent=te.toFixed(1).replace('.',',')+' °C';
 $('#svgTi').textContent=ti.toFixed(1).replace('.',',')+' °C';$('#svgRh').textContent='HR '+rh.toFixed(0)+' %';$('#svgTe').textContent=te.toFixed(1).replace('.',',')+' °C';
 $('#mTd').textContent=td.toFixed(1).replace('.',',');$('#mRh').textContent=rh.toFixed(0);
 const pill=$('#riskPill');pill.className='risk-pill '+(margin<0?'bad':margin<2?'warn':'safe');pill.querySelector('b').textContent=margin<0?'RIESGO DE CONDENSACIÓN':margin<2?'MARGEN REDUCIDO':'CONDICIÓN FAVORABLE';$('#riskText').textContent='Margen al rocío: '+margin.toFixed(1).replace('.',',')+' °C';
 const y=v=>350-(v-te)/(Math.max(1,ti-te))*70;$('#profile').setAttribute('d',`M190 ${y(ti)} C260 ${y(ti)-2},360 ${y(tsi)+5},450 ${y(te)}`);$('#profileDot').setAttribute('cy',y(ti));
}
$$('#ti,#rh,#te').forEach(x=>x.addEventListener('input',updateLab));updateLab();
const pal=$('#palette'),inp=$('#paletteInput'),res=$('#paletteResults');
function render(q=''){if(!res)return;const z=q.trim().toLowerCase();const list=tools.filter(t=>!z||(t.name+' '+t.desc+' '+t.keys).toLowerCase().includes(z));res.innerHTML=(list.length?list:tools.slice(0,5)).map(t=>`<a class="palette-item" href="${t.url}"><span class="ps">${t.s}</span><div><b>${t.name}</b><small>${t.desc}</small></div><em>ABRIR →</em></a>`).join('')}
function openPal(){if(!pal)return;pal.classList.remove('hidden');render(inp.value);setTimeout(()=>inp.focus(),0)}function closePal(){pal?.classList.add('hidden')}
$('#cmdBtn')?.addEventListener('click',openPal);$('#catalogSearchBtn')?.addEventListener('click',openPal);inp?.addEventListener('input',()=>render(inp.value));pal?.addEventListener('click',e=>{if(e.target===pal)closePal()});
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openPal()}if(e.key==='Escape')closePal()});
$('#themeBtn')?.addEventListener('click',()=>root.classList.toggle('light'));
render();
})();