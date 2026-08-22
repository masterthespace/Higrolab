
(function(){
  'use strict';
  const root=document.documentElement;
  document.body.classList.add('ui-ready');

  const ICONS={
    sun:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></svg>`,
    moon:`<svg viewBox="0 0 24 24"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.7 8.7 0 1 0 20.5 14.2Z"/></svg>`,
    drop:`<svg viewBox="0 0 24 24"><path d="M12 2.5S6 9 6 14a6 6 0 0 0 12 0c0-5-6-11.5-6-11.5Z"/><path d="M9.2 15.2a3 3 0 0 0 3 2.8"/></svg>`,
    thermo:`<svg viewBox="0 0 24 24"><path d="M10 14.5V5a2 2 0 1 1 4 0v9.5a4 4 0 1 1-4 0Z"/><path d="M12 8v8"/></svg>`,
    wall:`<svg viewBox="0 0 24 24"><path d="M3 5h18v14H3zM3 10h18M3 15h18M8 5v5M16 10v5M8 15v4"/></svg>`,
    wind:`<svg viewBox="0 0 24 24"><path d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"/></svg>`,
    comfort:`<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M8.5 10h.01M15.5 10h.01M8.5 14.5c2 1.8 5 1.8 7 0"/></svg>`,
    energy:`<svg viewBox="0 0 24 24"><path d="m13 2-7 12h6l-1 8 7-12h-6z"/></svg>`,
    window:`<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M12 3v18M4 12h16"/></svg>`,
    bridge:`<svg viewBox="0 0 24 24"><path d="M3 18V9M21 18V9M3 14h18M7 14V9M17 14V9M7 9c1-5 9-5 10 0"/></svg>`,
    water:`<svg viewBox="0 0 24 24"><path d="M4 18c2-2 4-2 6 0s4 2 6 0 4-2 4-2M5 13h14M8 13V6h8v7"/></svg>`,
    search:`<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>`,
    grid:`<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`
  };

  function getTheme(){
    const saved=localStorage.getItem('hidrolab-theme');
    if(saved==='light'||saved==='dark')return saved;
    return matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
  }
  function applyTheme(theme){
    root.dataset.theme=theme;
    localStorage.setItem('hidrolab-theme',theme);
    document.querySelectorAll('.theme-toggle').forEach(btn=>{
      const next=theme==='dark'?'light':'dark';
      btn.innerHTML=(theme==='dark'?ICONS.sun:ICONS.moon)+`<span class="theme-label">${theme==='dark'?'Claro':'Oscuro'}</span>`;
      btn.setAttribute('aria-label',`Cambiar a modo ${next==='dark'?'oscuro':'claro'}`);
    });
  }
  applyTheme(getTheme());

  function installThemeToggle(){
    document.querySelectorAll('.navlinks').forEach(nav=>{
      if(nav.querySelector('.theme-toggle'))return;
      const btn=document.createElement('button');
      btn.type='button';btn.className='theme-toggle';
      btn.addEventListener('click',()=>applyTheme(root.dataset.theme==='dark'?'light':'dark'));
      nav.append(btn);
    });
    applyTheme(root.dataset.theme);
  }

  function categoryAccent(){
    const f=(location.pathname.split('/').pop()||'index.html').toLowerCase();
    let accent='#21a8c6';
    if(/solar/.test(f))accent='#efb52b';
    else if(/muro|perdidas|potencia|puente|comparador|zona-termica/.test(f))accent='#e89436';
    else if(/confort|scop/.test(f))accent='#8fbd2c';
    else if(/ventilacion|infiltracion/.test(f))accent='#57b4a6';
    document.documentElement.style.setProperty('--category-accent',accent);
  }

  function iconForCard(card){
    const text=(card.textContent||'').toLowerCase();
    if(/solar|asol/.test(text))return ICONS.sun;
    if(/rocío|humedad|condens|moho/.test(text))return ICONS.drop;
    if(/ventil|infiltra|aire/.test(text))return ICONS.wind;
    if(/muro|transmitancia|pérdida|envolvente|térmica|zona térmica/.test(text))return ICONS.wall;
    if(/confort|pmv|ppd/.test(text))return ICONS.comfort;
    if(/costo|potencia|scop|energ/.test(text))return ICONS.energy;
    if(/ventana|puerta/.test(text))return ICONS.window;
    if(/puente/.test(text))return ICONS.bridge;
    if(/acs|agua caliente/.test(text))return ICONS.water;
    return ICONS.grid;
  }
  function replaceLegacyIcons(){
    document.querySelectorAll('.tool-card .tool-icon').forEach(icon=>{
      icon.innerHTML=iconForCard(icon.closest('.tool-card'));
    });
  }

  function updateRanges(){
    document.querySelectorAll('input[type="range"]').forEach(r=>{
      const min=Number(r.min||0),max=Number(r.max||100),v=Number(r.value||0);
      const pct=max>min?((v-min)/(max-min))*100:50;
      r.style.setProperty('--range-pct',`${Math.max(0,Math.min(100,pct))}%`);
    });
  }

  function installRipple(){
    document.addEventListener('pointerdown',e=>{
      const el=e.target.closest('.btn,button');
      if(!el || el.disabled)return;
      const rect=el.getBoundingClientRect(),size=Math.max(rect.width,rect.height);
      const s=document.createElement('span');
      s.className='ripple';s.style.width=s.style.height=size+'px';
      s.style.left=(e.clientX-rect.left-size/2)+'px';s.style.top=(e.clientY-rect.top-size/2)+'px';
      el.append(s);setTimeout(()=>s.remove(),600);
    });
  }

  function reveal(){
    const items=[...document.querySelectorAll('.tool-card,.bento-card,.metric,.feature,.category')].slice(0,80);
    items.forEach(x=>x.classList.add('ui-reveal'));
    if(!('IntersectionObserver'in window)){items.forEach(x=>x.classList.add('is-visible'));return}
    const io=new IntersectionObserver(entries=>entries.forEach(en=>{
      if(en.isIntersecting){en.target.classList.add('is-visible');io.unobserve(en.target)}
    }),{threshold:.06});
    items.forEach(x=>io.observe(x));
  }

  function catalogSearch(){
    const input=document.querySelector('#tool-search');
    if(!input)return;
    input.addEventListener('input',()=>{
      const q=input.value.trim().toLowerCase();
      document.querySelectorAll('.tool-card').forEach(card=>{
        card.classList.toggle('is-hidden',q && !(card.textContent||'').toLowerCase().includes(q));
      });
    });
  }

  function solarPreview(){
    const c=document.querySelector('#home-solar-preview');
    if(!c)return;
    let ctx;try{ctx=c.getContext('2d')}catch(_){c.closest('.solar-preview')?.classList.add('preview-fallback');return}if(!ctx){c.closest('.solar-preview')?.classList.add('preview-fallback');return}
    let angle=-.55,drag=false,lastX=0,t=0;
    const resize=()=>{const r=c.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);c.width=r.width*d;c.height=r.height*d;ctx.setTransform(d,0,0,d,0,0)};
    resize();try{if('ResizeObserver' in window)new ResizeObserver(resize).observe(c);else window.addEventListener('resize',resize,{passive:true})}catch(_){window.addEventListener('resize',resize,{passive:true})}
    c.addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX;c.setPointerCapture?.(e.pointerId)});
    c.addEventListener('pointermove',e=>{if(drag){angle+=(e.clientX-lastX)*.009;lastX=e.clientX}});
    c.addEventListener('pointerup',()=>drag=false);c.addEventListener('pointercancel',()=>drag=false);

    const project=(x,y,z,w,h)=>{
      const ca=Math.cos(angle),sa=Math.sin(angle);
      const X=x*ca-z*sa,Z=x*sa+z*ca;
      return [w*.5+X*19, h*.66-y*19+Z*7.5];
    };
    function poly(points,fill,stroke){
      ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();
    }
    function draw(){
      const w=c.clientWidth,h=c.clientHeight;ctx.clearRect(0,0,w,h);t+=.006;if(!drag)angle+=.0013;
      const dark=root.dataset.theme==='dark';
      // horizon/grid
      ctx.strokeStyle=dark?'rgba(195,225,234,.10)':'rgba(255,255,255,.12)';ctx.lineWidth=1;
      for(let i=-9;i<=9;i++){
        let a=project(i,0,-8,w,h),b=project(i,0,8,w,h);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();
        a=project(-8,0,i,w,h);b=project(8,0,i,w,h);ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();
      }
      // moving sun
      const sunA=t%(Math.PI*2),sx=w*.5+Math.cos(sunA)*w*.31,sy=h*.20-Math.sin(sunA)*h*.10;
      const grd=ctx.createRadialGradient(sx,sy,2,sx,sy,35);grd.addColorStop(0,'rgba(255,218,99,.95)');grd.addColorStop(.35,'rgba(239,181,43,.45)');grd.addColorStop(1,'rgba(239,181,43,0)');
      ctx.fillStyle=grd;ctx.beginPath();ctx.arc(sx,sy,35,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f3bd32';ctx.beginPath();ctx.arc(sx,sy,7,0,Math.PI*2);ctx.fill();
      // house box
      const p=(x,y,z)=>project(x,y,z,w,h);
      const A=p(-3,0,-2),B=p(3,0,-2),C=p(3,0,2),D=p(-3,0,2);
      const At=p(-3,2.7,-2),Bt=p(3,2.7,-2),Ct=p(3,2.7,2),Dt=p(-3,2.7,2);
      poly([A,B,Bt,At],'rgba(17,65,80,.90)','rgba(190,228,237,.42)');
      poly([B,C,Ct,Bt],'rgba(12,49,62,.92)','rgba(190,228,237,.38)');
      poly([At,Bt,Ct,Dt],'rgba(224,188,97,.82)','rgba(255,236,180,.50)');
      // roof ridge / subtle shadow
      const shadow=p(-4.7,0,3.8);ctx.fillStyle='rgba(0,0,0,.16)';ctx.beginPath();ctx.ellipse(shadow[0],shadow[1],44,13,.2,0,Math.PI*2);ctx.fill();
      // north arrow
      ctx.strokeStyle='rgba(149,211,224,.8)';ctx.fillStyle='rgba(149,211,224,.9)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(30,h-38);ctx.lineTo(30,h-78);ctx.stroke();ctx.beginPath();ctx.moveTo(30,h-84);ctx.lineTo(24,h-72);ctx.lineTo(36,h-72);ctx.closePath();ctx.fill();ctx.font='700 11px system-ui';ctx.fillText('N',25,h-20);
      requestAnimationFrame(draw);
    }
    draw();
  }

  categoryAccent();
  installThemeToggle();
  replaceLegacyIcons();
  updateRanges();
  document.addEventListener('input',e=>{if(e.target.matches('input[type="range"]'))updateRanges()});
  installRipple();
  catalogSearch();
  solarPreview();
  requestAnimationFrame(()=>{document.body.classList.add('ui-ready');reveal()});
})();
