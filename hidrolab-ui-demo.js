(()=> {
 const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
 const tools=[
  {s:'Td',name:'Punto de rocío con T° de muro',desc:'Condensación con temperatura superficial medida',url:'calculadora-rocio.html',keys:'condensacion humedad rocio muro temperatura'},
  {s:'Tc',name:'Riesgo sin T° de muro',desc:'Umbrales críticos de superficie',url:'calculadora-sin-muro.html',keys:'condensacion humedad riesgo umbral'},
  {s:'φsi',name:'Riesgo de humedad superficial',desc:'HR superficial, moho y punto de rocío',url:'riesgo-moho.html',keys:'humedad moho vapor condensacion'},
  {s:'ACH',name:'Ventilación y humedad',desc:'Caudal, vapor y humedad de equilibrio',url:'ventilacion-humedad.html',keys:'ventilar ventilacion aire humedad vapor ach'},
  {s:'U',name:'Simulador de muro + U',desc:'Capas, transmitancia y perfil térmico',url:'simulador-muro.html',keys:'muro aislacion aislante u transmitancia capas'},
  {s:'☀',name:'Solar Studio 3D',desc:'Sombras, norte, fachadas y asoleamiento',url:'simulador-solar.html',keys:'sol solar sombra fachada norte asoleamiento 3d'}
 ];
 const pal=$('#palette'), inp=$('#paletteInput'), res=$('#paletteResults');
 function render(q=''){
   if(!res)return;
   const z=q.trim().toLowerCase();
   const list=tools.filter(t=>!z||(t.name+' '+t.desc+' '+t.keys).toLowerCase().includes(z));
   res.innerHTML=(list.length?list:tools).map(t=>`<a class="palette-item" href="${t.url}"><span class="ps">${t.s}</span><div><b>${t.name}</b><small>${t.desc}</small></div><em>ABRIR →</em></a>`).join('');
 }
 function openPal(){if(!pal)return;pal.classList.remove('hidden');render(inp?.value||'');setTimeout(()=>inp?.focus(),0)}
 function closePal(){pal?.classList.add('hidden')}
 $('#cmdBtn')?.addEventListener('click',openPal);
 $('#catalogSearchBtn')?.addEventListener('click',openPal);
 inp?.addEventListener('input',()=>render(inp.value));
 pal?.addEventListener('click',e=>{if(e.target===pal)closePal()});
 document.addEventListener('keydown',e=>{
   if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openPal()}
   if(e.key==='Escape')closePal()
 });

 // House preview
 const house=$('#house3d'), hour=$('#previewHour'), pause=$('#previewPause');
 let angle=-28, running=true, raf=0, last=0;
 function draw(){
   if(!house)return;
   const h=+(hour?.value||14.5);
   const solarYaw=(h-13)*1.8;
   house.style.transform=`translate(-50%,-50%) rotateX(-13deg) rotateY(${angle+solarYaw}deg)`;
   const sun=$('.sun-preview');
   if(sun)sun.style.transform=`translateX(${(h-13)*4}px)`;
 }
 function tick(ts){
   if(running && ts-last>40){angle=(angle+.18)%360;last=ts;draw()}
   raf=requestAnimationFrame(tick)
 }
 hour?.addEventListener('input',draw);
 pause?.addEventListener('click',()=>{
   running=!running;
   pause.textContent=running?'Pausar giro':'Reanudar giro';
 });
 if(house && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) raf=requestAnimationFrame(tick);
 draw(); render();
})();