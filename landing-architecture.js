(() => {
  'use strict';

  const menuBtn=document.getElementById('menuBtn');
  const mobileNav=document.getElementById('mobileNav');

  menuBtn?.addEventListener('click',()=>{
    const open=menuBtn.getAttribute('aria-expanded')==='true';
    menuBtn.setAttribute('aria-expanded',String(!open));
    mobileNav?.classList.toggle('hidden');
  });

  mobileNav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
    mobileNav.classList.add('hidden');
    menuBtn?.setAttribute('aria-expanded','false');
  }));

  const c=document.getElementById('home-solar-preview');
  if(!c) return;
  const ctx=c.getContext('2d');
  let angle=-0.62,drag=false,lastX=0,time=0;

  const resize=()=>{
    const r=c.getBoundingClientRect();
    const d=Math.min(window.devicePixelRatio||1,2);
    c.width=Math.max(1,Math.round(r.width*d));
    c.height=Math.max(1,Math.round(r.height*d));
    ctx.setTransform(d,0,0,d,0,0);
  };
  resize();
  if('ResizeObserver' in window) new ResizeObserver(resize).observe(c);
  else window.addEventListener('resize',resize);

  c.addEventListener('pointerdown',e=>{
    drag=true;lastX=e.clientX;c.setPointerCapture?.(e.pointerId);
  });
  c.addEventListener('pointermove',e=>{
    if(!drag)return;
    angle+=(e.clientX-lastX)*0.009;
    lastX=e.clientX;
  });
  c.addEventListener('pointerup',()=>drag=false);
  c.addEventListener('pointercancel',()=>drag=false);

  const project=(x,y,z,w,h)=>{
    const ca=Math.cos(angle),sa=Math.sin(angle);
    const X=x*ca-z*sa;
    const Z=x*sa+z*ca;
    return [w*0.52+X*24,h*0.67-y*24+Z*9];
  };

  const poly=(pts,fill,stroke='rgba(255,255,255,.28)',width=1)=>{
    ctx.beginPath();
    pts.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));
    ctx.closePath();
    ctx.fillStyle=fill;ctx.fill();
    ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();
  };

  function drawHouse(w,h){
    const p=(x,y,z)=>project(x,y,z,w,h);

    // ground plane
    ctx.strokeStyle='rgba(255,255,255,.08)';
    ctx.lineWidth=1;
    for(let i=-10;i<=10;i++){
      let a=p(i,0,-10),b=p(i,0,10);
      ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();
      a=p(-10,0,i);b=p(10,0,i);
      ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.stroke();
    }

    // floor corners
    const A=p(-3.7,0,-2.7),B=p(3.7,0,-2.7),C=p(3.7,0,2.7),D=p(-3.7,0,2.7);
    const At=p(-3.7,2.8,-2.7),Bt=p(3.7,2.8,-2.7),Ct=p(3.7,2.8,2.7),Dt=p(-3.7,2.8,2.7);
    const R1=p(0,4.2,-2.7),R2=p(0,4.2,2.7);

    // shadow
    const sh=p(-4.6,0,4.1);
    ctx.fillStyle='rgba(0,0,0,.28)';
    ctx.beginPath();ctx.ellipse(sh[0],sh[1],70,20,.15,0,Math.PI*2);ctx.fill();

    // walls
    poly([A,B,Bt,At],'rgba(226,232,240,.94)','rgba(255,255,255,.35)');
    poly([B,C,Ct,Bt],'rgba(148,163,184,.92)','rgba(255,255,255,.28)');
    poly([C,D,Dt,Ct],'rgba(203,213,225,.88)','rgba(255,255,255,.22)');

    // gable triangles
    poly([At,Bt,R1],'rgba(226,232,240,.96)','rgba(255,255,255,.32)');
    poly([Dt,Ct,R2],'rgba(203,213,225,.90)','rgba(255,255,255,.22)');

    // pitched roof
    poly([At,R1,R2,Dt],'rgba(71,85,105,.98)','rgba(255,255,255,.28)');
    poly([R1,Bt,Ct,R2],'rgba(51,65,85,.98)','rgba(255,255,255,.24)');

    // windows on front as small projected rectangles approximated
    const fw1=p(-2.25,1.55,-2.72), fw2=p(-0.9,1.55,-2.72);
    const fw3=p(-2.25,.65,-2.72), fw4=p(-0.9,.65,-2.72);
    poly([fw1,fw2,fw4,fw3],'rgba(37,99,235,.55)','rgba(255,255,255,.7)',1.2);

    // door
    const d1=p(1.2,1.9,-2.72),d2=p(2.25,1.9,-2.72),d3=p(2.25,0,-2.72),d4=p(1.2,0,-2.72);
    poly([d1,d2,d3,d4],'rgba(120,83,60,.88)','rgba(255,255,255,.55)');

    // side window
    const sw1=p(3.72,1.7,-.8),sw2=p(3.72,1.7,.6),sw3=p(3.72,.75,.6),sw4=p(3.72,.75,-.8);
    poly([sw1,sw2,sw3,sw4],'rgba(37,99,235,.48)','rgba(255,255,255,.6)',1.1);

    // active facade line
    ctx.strokeStyle='#f97316';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(...A);ctx.lineTo(...B);ctx.stroke();
  }

  function drawSun(w,h){
    const a=(time%(Math.PI*2));
    const sx=w*.58+Math.cos(a)*w*.28;
    const sy=h*.20-Math.sin(a)*h*.09;

    const grd=ctx.createRadialGradient(sx,sy,2,sx,sy,52);
    grd.addColorStop(0,'rgba(251,146,60,.98)');
    grd.addColorStop(.28,'rgba(249,115,22,.48)');
    grd.addColorStop(1,'rgba(249,115,22,0)');
    ctx.fillStyle=grd;
    ctx.beginPath();ctx.arc(sx,sy,52,0,Math.PI*2);ctx.fill();

    ctx.fillStyle='#fb923c';
    ctx.beginPath();ctx.arc(sx,sy,8,0,Math.PI*2);ctx.fill();

    // trajectory
    ctx.strokeStyle='rgba(251,146,60,.45)';
    ctx.setLineDash([7,7]);ctx.lineWidth=1.2;
    ctx.beginPath();
    for(let i=0;i<=40;i++){
      const t=Math.PI*(i/40);
      const x=w*.58+Math.cos(t)*w*.28;
      const y=h*.20-Math.sin(t)*h*.09;
      i?ctx.lineTo(x,y):ctx.moveTo(x,y);
    }
    ctx.stroke();ctx.setLineDash([]);
  }

  function drawNorth(w,h){
    ctx.strokeStyle='rgba(255,255,255,.82)';
    ctx.fillStyle='rgba(255,255,255,.9)';
    ctx.lineWidth=1.8;
    ctx.beginPath();ctx.moveTo(34,h-42);ctx.lineTo(34,h-92);ctx.stroke();
    ctx.beginPath();ctx.moveTo(34,h-100);ctx.lineTo(28,h-86);ctx.lineTo(40,h-86);ctx.closePath();ctx.fill();
    ctx.font='700 12px Inter,system-ui';ctx.fillText('N',29,h-20);
  }

  function frame(){
    const w=c.clientWidth,h=c.clientHeight;
    ctx.clearRect(0,0,w,h);
    time+=0.006;
    if(!drag) angle+=0.0012;

    const g=ctx.createLinearGradient(0,0,0,h);
    g.addColorStop(0,'#18181b');
    g.addColorStop(1,'#27272a');
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);

    drawSun(w,h);
    drawHouse(w,h);
    drawNorth(w,h);

    requestAnimationFrame(frame);
  }
  frame();
})();