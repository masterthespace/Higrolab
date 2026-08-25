import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const $=id=>document.getElementById(id), qsa=s=>[...document.querySelectorAll(s)];
const S={tool:'select',img:null,imgURL:null,imgW:0,imgH:0,zoom:1,panX:0,panY:0,pts:[],closed:false,scale:null,calPts:[],northAngle:0,northPts:[],drag:null,hover:null};

function createOrbitControls(cam, dom){
  const ctl={target:new THREE.Vector3(0,1,0),enabled:true};
  let drag=null;
  const look=()=>cam.lookAt(ctl.target);
  dom.style.touchAction='none';
  dom.addEventListener('contextmenu',e=>e.preventDefault());
  dom.addEventListener('pointerdown',e=>{
    if(!ctl.enabled)return;
    drag={x:e.clientX,y:e.clientY,button:e.button};
    dom.setPointerCapture?.(e.pointerId);
  });
  dom.addEventListener('pointermove',e=>{
    if(!drag||!ctl.enabled)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    drag.x=e.clientX;drag.y=e.clientY;
    if(drag.button===0){
      const off=cam.position.clone().sub(ctl.target);
      const sph=new THREE.Spherical().setFromVector3(off);
      sph.theta-=dx*.008;
      sph.phi=Math.max(.08,Math.min(Math.PI-.08,sph.phi+dy*.008));
      off.setFromSpherical(sph);
      cam.position.copy(ctl.target).add(off);
      look();
    }else{
      const dist=cam.position.distanceTo(ctl.target);
      const k=Math.max(.002,dist*.0015);
      const forward=new THREE.Vector3();cam.getWorldDirection(forward);
      const right=new THREE.Vector3().crossVectors(forward,cam.up).normalize();
      const up=cam.up.clone().normalize();
      const delta=right.multiplyScalar(-dx*k).add(up.multiplyScalar(dy*k));
      cam.position.add(delta);ctl.target.add(delta);look();
    }
  });
  const end=e=>{drag=null;try{dom.releasePointerCapture?.(e.pointerId)}catch(_){}};
  dom.addEventListener('pointerup',end);
  dom.addEventListener('pointercancel',end);
  dom.addEventListener('wheel',e=>{
    if(!ctl.enabled)return;
    e.preventDefault();
    const off=cam.position.clone().sub(ctl.target);
    off.multiplyScalar(Math.exp(e.deltaY*.001));
    off.setLength(Math.max(1.5,Math.min(250,off.length())));
    cam.position.copy(ctl.target).add(off);look();
  },{passive:false});
  ctl.update=look;look();return ctl;
}

let autoFit3D=true;const canvas=$('cad'),ctx=canvas.getContext('2d'); let scene,camera,renderer,controls,buildingGroup,solarScene,solarCamera,solarRenderer,solarControls,solarBuilding,sunLight,playTimer,sunOrb,sunPathLine; const SEL={type:null,index:null};
function resizeCanvas(){const r=canvas.parentElement.getBoundingClientRect();canvas.width=Math.round(r.width*devicePixelRatio);canvas.height=Math.round(r.height*devicePixelRatio);canvas.style.width=r.width+'px';canvas.style.height=r.height+'px';drawCAD();resize3D()}
function screenToWorld(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left-S.panX)/S.zoom,y:(e.clientY-r.top-S.panY)/S.zoom}}
function worldToScreen(p){return{x:p.x*S.zoom+S.panX,y:p.y*S.zoom+S.panY}}
function snapPoint(p){if(!S.pts.length||!$('snap90').checked)return p;const a=S.pts[S.pts.length-1],dx=p.x-a.x,dy=p.y-a.y;if(Math.abs(dx)>Math.abs(dy)*3)return{x:p.x,y:a.y};if(Math.abs(dy)>Math.abs(dx)*3)return{x:a.x,y:p.y};return p}
function fitImage(){const r=canvas.getBoundingClientRect();if(S.img){S.zoom=Math.min((r.width-50)/S.imgW,(r.height-50)/S.imgH);S.panX=(r.width-S.imgW*S.zoom)/2;S.panY=(r.height-S.imgH*S.zoom)/2}else{S.zoom=1;S.panX=r.width/2;S.panY=r.height/2}drawCAD()}
function drawCAD(){const d=devicePixelRatio,r=canvas.getBoundingClientRect();ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,r.width,r.height);ctx.fillStyle='#e9eef0';ctx.fillRect(0,0,r.width,r.height);ctx.save();ctx.translate(S.panX,S.panY);ctx.scale(S.zoom,S.zoom);if(S.img)ctx.drawImage(S.img,0,0,S.imgW,S.imgH);else drawGrid();if(S.scale&&S.calPts.length===2)drawLine(S.calPts[0],S.calPts[1],'#f0a500',3/S.zoom);if(S.northPts.length===2)drawLine(S.northPts[0],S.northPts[1],'#d93232',3/S.zoom);if(S.pts.length){ctx.beginPath();ctx.moveTo(S.pts[0].x,S.pts[0].y);for(let i=1;i<S.pts.length;i++)ctx.lineTo(S.pts[i].x,S.pts[i].y);if(S.closed)ctx.closePath();ctx.fillStyle='rgba(10,95,125,.16)';if(S.closed)ctx.fill();ctx.strokeStyle='#0b5f7d';ctx.lineWidth=3/S.zoom;ctx.stroke();S.pts.forEach((p,i)=>{ctx.beginPath();ctx.arc(p.x,p.y,6/S.zoom,0,Math.PI*2);ctx.fillStyle=i===S.hover?'#86b817':'#fff';ctx.fill();ctx.strokeStyle='#0b5f7d';ctx.lineWidth=2/S.zoom;ctx.stroke()});drawDimensions()}ctx.restore();drawNorth();}
function drawGrid(){const step=50;ctx.strokeStyle='#d2dde0';ctx.lineWidth=1;for(let x=-2000;x<2000;x+=step){ctx.beginPath();ctx.moveTo(x,-2000);ctx.lineTo(x,2000);ctx.stroke()}for(let y=-2000;y<2000;y+=step){ctx.beginPath();ctx.moveTo(-2000,y);ctx.lineTo(2000,y);ctx.stroke()}}
function drawLine(a,b,c,w){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=c;ctx.lineWidth=w;ctx.stroke()}
function drawDimensions(){if(!S.scale)return;ctx.font=`${12/S.zoom}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';for(let i=0;i<S.pts.length-(S.closed?0:1);i++){const a=S.pts[i],b=S.pts[(i+1)%S.pts.length],m={x:(a.x+b.x)/2,y:(a.y+b.y)/2},len=Math.hypot(b.x-a.x,b.y-a.y)*S.scale;ctx.fillStyle='#10262d';ctx.fillRect(m.x-28/S.zoom,m.y-10/S.zoom,56/S.zoom,20/S.zoom);ctx.fillStyle='#fff';ctx.fillText(len.toFixed(2)+' m',m.x,m.y)}}
function drawNorth(){const r=canvas.getBoundingClientRect(),x=55,y=70,ang=(S.northAngle-90)*Math.PI/180;ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.strokeStyle='#d93232';ctx.fillStyle='#d93232';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-24,0);ctx.lineTo(24,0);ctx.stroke();ctx.beginPath();ctx.moveTo(24,0);ctx.lineTo(13,-7);ctx.lineTo(13,7);ctx.closePath();ctx.fill();ctx.restore();ctx.fillStyle='#d93232';ctx.font='bold 13px system-ui';ctx.fillText('N',48,104)}
function nearestVertex(p){let best=-1,dist=14/S.zoom;S.pts.forEach((v,i)=>{const d=Math.hypot(v.x-p.x,v.y-p.y);if(d<dist){dist=d;best=i}});return best}
canvas.addEventListener('pointerdown',e=>{if(e.button===1||e.button===2){S.drag={pan:true,x:e.clientX,y:e.clientY,px:S.panX,py:S.panY};canvas.setPointerCapture(e.pointerId);return}let p=screenToWorld(e);if(S.tool==='wall'){if(S.closed){S.pts=[];S.closed=false}p=snapPoint(p);if(S.pts.length>2&&Math.hypot(p.x-S.pts[0].x,p.y-S.pts[0].y)<14/S.zoom){S.closed=true}else S.pts.push(p);autoFit3D=true;updateMetrics();drawCAD();rebuild3D();return}if(S.tool==='measure'){S.calPts.push(p);if(S.calPts.length>2)S.calPts=[p];if(S.calPts.length===2)applyCalibration();drawCAD();return}if(S.tool==='north'){S.northPts.push(p);if(S.northPts.length>2)S.northPts=[p];if(S.northPts.length===2){const a=S.northPts[0],b=S.northPts[1];S.northAngle=(Math.atan2(b.x-a.x,-(b.y-a.y))*180/Math.PI+360)%360;rebuild3D()}drawCAD();return}const i=nearestVertex(p);if(i>=0){S.drag={vertex:i};canvas.setPointerCapture(e.pointerId);selectVertex(i)}});
canvas.addEventListener('dblclick',e=>{if(S.tool==='wall'&&S.pts.length>=3){S.closed=true;autoFit3D=true;updateMetrics();drawCAD();rebuild3D()}});canvas.addEventListener('pointermove',e=>{if(S.drag?.pan){S.panX=S.drag.px+e.clientX-S.drag.x;S.panY=S.drag.py+e.clientY-S.drag.y;drawCAD();return}const p=screenToWorld(e);if(S.drag?.vertex!=null){S.pts[S.drag.vertex]=p;autoFit3D=true;updateMetrics();drawCAD();rebuild3D();return}S.hover=nearestVertex(p);drawCAD()});canvas.addEventListener('pointerup',()=>S.drag=null);canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('wheel',e=>{e.preventDefault();const r=canvas.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top,before={x:(mx-S.panX)/S.zoom,y:(my-S.panY)/S.zoom},z=Math.exp(-e.deltaY*.001);S.zoom=Math.max(.08,Math.min(12,S.zoom*z));S.panX=mx-before.x*S.zoom;S.panY=my-before.y*S.zoom;drawCAD()},{passive:false});
function applyCalibration(){if(S.calPts.length!==2)return;const px=Math.hypot(S.calPts[1].x-S.calPts[0].x,S.calPts[1].y-S.calPts[0].y),m=+$('cal-distance').value;if(px>0&&m>0){S.scale=m/px;autoFit3D=true;$('scale-info').textContent=`1 px = ${S.scale.toFixed(5)} m · referencia ${m.toFixed(2)} m`;updateMetrics();rebuild3D()}}
function polygonData(){
  if(!S.closed||S.pts.length<3)return null;
  const cx=S.pts.reduce((a,p)=>a+p.x,0)/S.pts.length;
  const cy=S.pts.reduce((a,p)=>a+p.y,0)/S.pts.length;
  let sc=S.scale;
  if(!(Number.isFinite(sc)&&sc>0)){
    const xs=S.pts.map(p=>p.x),ys=S.pts.map(p=>p.y);
    const pxMax=Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys),1);
    sc=8/pxMax;
  }
  return S.pts.map(p=>({x:(p.x-cx)*sc,z:(p.y-cy)*sc}));
}
function areaPerim(){const p=polygonData();if(!p)return{a:0,l:0};let a=0,l=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];a+=p[i].x*q.z-q.x*p[i].z;l+=Math.hypot(q.x-p[i].x,q.z-p[i].z)}return{a:Math.abs(a)/2,l}}
function updateMetrics(){const m=areaPerim();$('area-out').textContent=m.a?m.a.toFixed(1)+' m²':'—';$('perim-out').textContent=m.l?m.l.toFixed(1)+' m':'—';$('faces-out').textContent=S.closed?S.pts.length:'—';$('status-pill').textContent=S.closed?`Planta cerrada · ${S.pts.length} fachadas`:`${S.pts.length} vértices`}
function selectVertex(i){const p=S.pts[i];$('selection-panel').innerHTML=`<h3>VÉRTICE V${i+1}</h3><div class="vertex-editor"><label>X [px]<input id="vx" type="number" step=".1" value="${p.x.toFixed(1)}"></label><label>Y [px]<input id="vy" type="number" step=".1" value="${p.y.toFixed(1)}"></label><button id="delv">Eliminar vértice</button></div>`;$('vx').oninput=()=>{S.pts[i].x=+$('vx').value;drawCAD();rebuild3D()};$('vy').oninput=()=>{S.pts[i].y=+$('vy').value;drawCAD();rebuild3D()};$('delv').onclick=()=>{S.pts.splice(i,1);S.closed=S.closed&&S.pts.length>=3;$('selection-panel').innerHTML='<h3>SELECCIÓN</h3><div class="empty">Selecciona un vértice o una fachada.</div>';updateMetrics();drawCAD();rebuild3D()}}


function hasMetricCalibration(){return Number.isFinite(S.scale)&&S.scale>0}
function currentPlanExtent(){
  const p=polygonData(); if(!p?.length)return null;
  const xs=p.map(v=>v.x),zs=p.map(v=>v.z);
  return{width:Math.max(...xs)-Math.min(...xs),depth:Math.max(...zs)-Math.min(...zs)}
}
function updateCalibrationWarning(){
  const calibrated=hasMetricCalibration();
  ['scale-warning-3d','scale-warning-solar'].forEach(id=>{const e=$(id);if(e)e.classList.toggle('hidden',calibrated)});
}
function makePersonSilhouette(height=1.70){
  const g=new THREE.Group();
  const dark=new THREE.MeshStandardMaterial({color:0x455a64,roughness:.9,metalness:0});
  const skin=new THREE.MeshStandardMaterial({color:0x7b8d95,roughness:.9,metalness:0});

  const headR=height*.075;
  const head=new THREE.Mesh(new THREE.SphereGeometry(headR,18,12),skin);
  head.position.y=height-headR;

  const torsoH=height*.42, torso=new THREE.Mesh(
    new THREE.CapsuleGeometry(height*.075,torsoH-height*.15,6,12),dark
  );
  torso.position.y=height*.61;

  const legH=height*.42;
  [-1,1].forEach(s=>{
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(height*.027,height*.032,legH,10),dark);
    leg.position.set(s*height*.045,legH*.5,0);g.add(leg)
  });

  const armH=height*.36;
  [-1,1].forEach(s=>{
    const arm=new THREE.Mesh(new THREE.CylinderGeometry(height*.022,height*.025,armH,10),dark);
    arm.position.set(s*height*.115,height*.60,0);
    arm.rotation.z=s*.08;
    g.add(arm)
  });

  g.add(head,torso);
  g.userData.realHeight=height;
  return g
}
function addVerticalRuler(sc,group){
  if(sc.userData.heightRuler)sc.remove(sc.userData.heightRuler);
  const b=modelBounds(group);if(!b)return;
  const h=Math.max(+$('wall-height').value||2.4,2);
  const ruler=new THREE.Group();
  const mat=new THREE.LineBasicMaterial({color:0x37515d});
  const tickMat=new THREE.LineBasicMaterial({color:0x607d86});
  const x=b.center.x-b.size.x*.62-Math.max(.7,b.maxPlan*.08),z=b.center.z;
  const pts=[new THREE.Vector3(x,0,z),new THREE.Vector3(x,h,z)];
  ruler.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),mat));
  const maxTick=Math.ceil(h);
  for(let i=0;i<=maxTick;i++){
    const len=(i%1===0)?.34:.18;
    const tg=new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x-len,Math.min(i,h),z),
      new THREE.Vector3(x+len,Math.min(i,h),z)
    ]);
    ruler.add(new THREE.Line(tg,tickMat));
  }
  sc.add(ruler);sc.userData.heightRuler=ruler;
}

function modelBounds(group){
  if(!group)return null;
  group.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(group.userData?.body||group);
  const size=new THREE.Vector3(),center=new THREE.Vector3();
  box.getSize(size);box.getCenter(center);
  return{box,size,center,maxPlan:Math.max(size.x,size.z),height:size.y}
}
function niceGridSize(maxPlan){
  const need=Math.max(12,maxPlan*1.8);
  return Math.ceil(need/10)*10;
}
function rebuildMetricGrid(sc,group){
  const b=modelBounds(group); if(!b)return;
  const gridSize=niceGridSize(b.maxPlan);
  if(sc.userData.metricGrid)sc.remove(sc.userData.metricGrid);
  if(sc.userData.ground)sc.remove(sc.userData.ground);
  if(sc.userData.northArrow)sc.remove(sc.userData.northArrow);

  // 1 division = 1 metre
  const divisions=Math.max(10,Math.round(gridSize));
  const grid=new THREE.GridHelper(gridSize,divisions,0x83979e,0xcbd6d9);
  grid.position.y=.002;grid.material.transparent=true;grid.material.opacity=.72;
  sc.add(grid);sc.userData.metricGrid=grid;

  const groundSize=gridSize*1.35;
  const ground=new THREE.Mesh(
    new THREE.PlaneGeometry(groundSize,groundSize),
    new THREE.MeshStandardMaterial({color:0xdde4e5,roughness:1})
  );
  ground.rotation.x=-Math.PI/2;ground.position.y=-.006;ground.receiveShadow=true;
  sc.add(ground);sc.userData.ground=ground;

  const arrowLen=Math.max(3,Math.min(8,gridSize*.16));
  const arrow=new THREE.ArrowHelper(
    new THREE.Vector3(0,0,-1),new THREE.Vector3(0,.02,0),
    arrowLen,0xc52d2d,Math.max(.5,arrowLen*.18),Math.max(.25,arrowLen*.09)
  );
  sc.add(arrow);sc.userData.northArrow=arrow;
  sc.userData.gridSize=gridSize;
}
function fitCameraToModel(cam,ctl,group,view='iso'){
  const b=modelBounds(group); if(!b)return;
  const target=new THREE.Vector3(b.center.x,Math.max(.35,b.height*.46),b.center.z);
  ctl.target.copy(target);

  // Perspective distance from real bounding sphere and camera FOV.
  const radius=Math.max(1,new THREE.Vector3(b.size.x,b.size.y*1.15,b.size.z).length()*.52);
  const fov=THREE.MathUtils.degToRad(cam.fov);
  const distance=Math.max(5,(radius/Math.sin(fov/2))*1.12);

  const dirs={
    iso:new THREE.Vector3(1,.72,1.22),
    top:new THREE.Vector3(0,1.65,.001),
    north:new THREE.Vector3(0,.35,1),
    east:new THREE.Vector3(1,.35,0),
    west:new THREE.Vector3(-1,.35,0)
  };
  const dir=(dirs[view]||dirs.iso).normalize();
  cam.position.copy(target).add(dir.multiplyScalar(distance));
  cam.near=Math.max(.02,distance/400);cam.far=Math.max(500,distance*25);cam.updateProjectionMatrix();
  ctl.update();
}
function updateScaleHUD(){
  const p=polygonData(),b=buildingGroup?modelBounds(buildingGroup):null;
  if(!p||!b)return;
  const h=+$('wall-height').value||0,ext=currentPlanExtent();
  const state=hasMetricCalibration()?'ESCALA CALIBRADA':'ESCALA APROXIMADA';
  const text=`Cuadrícula: 1 m · altura: ${h.toFixed(2).replace('.',',')} m · planta: ${ext?ext.width.toFixed(1).replace('.',',')+' × '+ext.depth.toFixed(1).replace('.',',')+' m':'—'} · ${state}`;
  if($('scale-3d-hud'))$('scale-3d-hud').textContent=text;
  if($('scale-solar-hud'))$('scale-solar-hud').textContent=text;
  updateCalibrationWarning();
}
function addHumanScaleReference(sc){
  if(sc.userData.humanRef)sc.remove(sc.userData.humanRef);
  const group=sc===scene?buildingGroup:solarBuilding;
  const bb=modelBounds(group);if(!bb)return;
  const person=makePersonSilhouette(1.70);
  const gap=Math.max(.8,bb.maxPlan*.08);
  person.position.set(bb.center.x-bb.size.x*.55-gap,0,bb.center.z+bb.size.z*.28);
  person.rotation.y=0.15;
  sc.add(person);sc.userData.humanRef=person;
  addVerticalRuler(sc,group);
}

function init3D(containerId,solar=false){
  const c=$(containerId),sc=new THREE.Scene();sc.background=new THREE.Color(0xe9eef0);
  const cam=new THREE.PerspectiveCamera(42,1,.02,1000);cam.position.set(13,10,16);
  const ren=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
  ren.setPixelRatio(Math.min(devicePixelRatio,2));ren.shadowMap.enabled=true;ren.shadowMap.type=THREE.PCFSoftShadowMap;ren.outputColorSpace=THREE.SRGBColorSpace;
  c.appendChild(ren.domElement);
  const ctl=createOrbitControls(cam,ren.domElement);ctl.target.set(0,1,0);ctl.update();
  sc.add(new THREE.HemisphereLight(0xffffff,0x6d7b80,1.7));
  return{sc,cam,ren,ctl}
}
function initScenes(){
  let a=init3D('three-stage');scene=a.sc;camera=a.cam;renderer=a.ren;controls=a.ctl;
  let b=init3D('three-solar',true);solarScene=b.sc;solarCamera=b.cam;solarRenderer=b.ren;solarControls=b.ctl;
  sunLight=new THREE.DirectionalLight(0xfff1c1,3.8);sunLight.castShadow=true;sunLight.shadow.mapSize.set(2048,2048);
  sunLight.shadow.camera.left=-35;sunLight.shadow.camera.right=35;sunLight.shadow.camera.top=35;sunLight.shadow.camera.bottom=-35;sunLight.shadow.bias=-.0004;
  solarScene.add(sunLight);solarScene.add(sunLight.target);
  sunOrb=new THREE.Mesh(new THREE.SphereGeometry(.55,24,16),new THREE.MeshBasicMaterial({color:0xf4b51b}));
  solarScene.add(sunOrb);
  bindPicking(renderer,camera,()=>buildingGroup);
  bindPicking(solarRenderer,solarCamera,()=>solarBuilding);
  animate()

  if(S.closed && S.pts.length>=3){
    ctx.save();
    ctx.font='900 11px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
    for(let i=0;i<S.pts.length;i++){
      const a=S.pts[i],b=S.pts[(i+1)%S.pts.length];
      const x=(a.x+b.x)/2,y=(a.y+b.y)/2,label=`F${i+1}`;
      const w=ctx.measureText(label).width+10;
      ctx.fillStyle='rgba(11,63,82,.92)';ctx.fillRect(x-w/2,y-10,w,20);
      ctx.fillStyle='#fff';ctx.fillText(label,x,y);
    }
    ctx.restore();
  }


  if(S.closed && S.pts.length>=3){
    const cx=S.pts.reduce((a,p)=>a+p.x,0)/S.pts.length,cy=S.pts.reduce((a,p)=>a+p.y,0)/S.pts.length;
    ctx.save();ctx.font='900 12px Arial';ctx.textAlign='center';ctx.textBaseline='middle';
    const lab='C1';const w=ctx.measureText(lab).width+12;ctx.fillStyle='rgba(240,181,35,.95)';ctx.fillRect(cx-w/2,cy-10,w,20);ctx.fillStyle='#173039';ctx.fillText(lab,cx,cy);ctx.restore();
  }

}
function polygonSignedArea(p){let a=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];a+=p[i].x*q.z-q.x*p[i].z}return a/2}
function orientationName(az){const names=['N','NE','E','SE','S','SO','O','NO'];return names[Math.round(((az%360)+360)%360/45)%8]}
function totalRotationRad(){return rad((S.northAngle+(+$('building-az').value||0))%360)}
function facadeDescriptors(){
  const p=polygonData();if(!p)return[];
  const sign=polygonSignedArea(p)>=0?1:-1,theta=totalRotationRad(),c=Math.cos(theta),s=Math.sin(theta);
  return p.map((a,i)=>{
    const b=p[(i+1)%p.length],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1;
    const nLocal=sign>0?new THREE.Vector3(dz/len,0,-dx/len):new THREE.Vector3(-dz/len,0,dx/len);
    const nWorld=new THREE.Vector3(c*nLocal.x+s*nLocal.z,0,-s*nLocal.x+c*nLocal.z).normalize();
    const center=new THREE.Vector3((a.x+b.x)/2,(+$('wall-height').value||2.4)*.52,(a.z+b.z)/2);
    const az=(deg(Math.atan2(nWorld.x,-nWorld.z))+360)%360;
    return{index:i,a,b,len,nLocal,nWorld,center,az,orientation:orientationName(az)}
  })
}
function planeFacadeGeometry(a,b,h,n){
  const off=.012,ax=a.x+n.x*off,az=a.z+n.z*off,bx=b.x+n.x*off,bz=b.z+n.z*off;
  const v=new Float32Array([ax,0,az,bx,0,bz,bx,h,bz, ax,0,az,bx,h,bz,ax,h,az]);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(v,3));g.computeVertexNormals();return g
}
function makeBuilding(){
  const pts=polygonData();if(!pts)return null;
  const h=+$('wall-height').value,shape=new THREE.Shape();shape.moveTo(pts[0].x,-pts[0].z);
  for(let i=1;i<pts.length;i++)shape.lineTo(pts[i].x,-pts[i].z);shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false});geo.rotateX(-Math.PI/2);
  const mat=new THREE.MeshStandardMaterial({color:0xe7ecec,roughness:.78,metalness:0});
  const body=new THREE.Mesh(geo,mat);body.castShadow=true;body.receiveShadow=true;body.userData.role='body';
  const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:0x344b55}));
  const g=new THREE.Group();g.rotation.y=totalRotationRad();g.add(body,edges);
  g.userData.body=body;g.userData.pickables=[];g.userData.facades=[];g.userData.vertices=[];
  g.userData.cover=null;
  const rg=roofGeometry();
  if(rg){
    const rm=new THREE.MeshBasicMaterial({color:0x86b817,transparent:true,opacity:.035,side:THREE.DoubleSide,depthWrite:false});
    const roof=new THREE.Mesh(rg,rm);roof.userData={type:'cover',index:0};
    g.add(roof);g.userData.cover=roof;g.userData.pickables.push(roof);
  }

  const fd=facadeDescriptors();
  fd.forEach(f=>{
    const fm=new THREE.MeshBasicMaterial({color:0x86b817,transparent:true,opacity:.025,side:THREE.DoubleSide,depthWrite:false});
    const wall=new THREE.Mesh(planeFacadeGeometry(f.a,f.b,h,f.nLocal),fm);wall.userData={type:'facade',index:f.index};
    g.add(wall);g.userData.facades.push(wall);g.userData.pickables.push(wall);
  });
  const bb=new THREE.Box3().setFromObject(body),size=new THREE.Vector3();bb.getSize(size);const vr=Math.max(.07,Math.min(.18,Math.max(size.x,size.z)/55));
  pts.forEach((p,i)=>{
    const vm=new THREE.Mesh(new THREE.SphereGeometry(vr,14,10),new THREE.MeshBasicMaterial({color:0x334d58,transparent:true,opacity:.55}));
    vm.position.set(p.x,.10,p.z);vm.userData={type:'vertex',index:i};g.add(vm);g.userData.vertices.push(vm);g.userData.pickables.push(vm)
  });
  return g
}
function rebuild3D(){
  [[scene,'buildingGroup'],[solarScene,'solarBuilding']].forEach(([sc,key])=>{
    const old=key==='buildingGroup'?buildingGroup:solarBuilding;if(old)sc.remove(old);
    const n=makeBuilding();if(n)sc.add(n);if(key==='buildingGroup')buildingGroup=n;else solarBuilding=n;
    if(n){rebuildMetricGrid(sc,n);addHumanScaleReference(sc)}
  });
  if(buildingGroup && autoFit3D){
    fitCameraToModel(camera,controls,buildingGroup,'iso');
    fitCameraToModel(solarCamera,solarControls,solarBuilding,'iso');
    autoFit3D=false;
  }
  updateScaleHUD();
  refresh3DSelection();updateMetrics();updateSolar();updateSunPath();updateDailySunDashboard();updateAllFacadeLabels()
}


function ensureFacadeLabel(layerId,index,f){
  const layer=$(layerId); if(!layer)return null;
  let el=layer.querySelector(`[data-facelabel="${index}"]`);
  if(!el){
    el=document.createElement('div');
    el.className='facade-label-3d';
    el.dataset.facelabel=index;
    layer.appendChild(el);
  }
  el.innerHTML=`F${index+1}<small>${f.orientation} · ${f.az.toFixed(0)}°</small>`;
  el.classList.toggle('active',SEL.type==='facade'&&SEL.index===index);
  return el;
}
function updateFacadeLabelsFor(renderer,camera,group,layerId){
  const layer=$(layerId); if(!layer)return;
  if(!group || !S.closed){layer.innerHTML='';return}
  const fs=facadeDescriptors(), rect=renderer.domElement.getBoundingClientRect();
  group.updateMatrixWorld(true); camera.updateMatrixWorld(true);
  fs.forEach(f=>{
    const el=ensureFacadeLabel(layerId,f.index,f);
    const p=f.center.clone().add(f.nLocal.clone().multiplyScalar(.06)).applyMatrix4(group.matrixWorld);
    const projected=p.clone().project(camera);
    const visible=projected.z>-1 && projected.z<1;
    const x=(projected.x*.5+.5)*rect.width, y=(-projected.y*.5+.5)*rect.height;
    el.style.left=`${x}px`; el.style.top=`${y}px`;
    el.classList.toggle('hidden',!visible||x<-20||y<-20||x>rect.width+20||y>rect.height+20);
    el.classList.toggle('active',SEL.type==='facade'&&SEL.index===f.index);
  });
  [...layer.querySelectorAll('[data-facelabel]')].forEach(el=>{
    if(+el.dataset.facelabel>=fs.length)el.remove()
  })
}

function updateCoverLabelFor(renderer,camera,group,layerId){
  const layer=$(layerId);if(!layer||!group?.userData?.cover||!S.closed)return;
  let el=layer.querySelector('[data-coverlabel]');
  if(!el){el=document.createElement('div');el.className='facade-label-3d';el.dataset.coverlabel='1';layer.appendChild(el)}
  el.innerHTML='C1<small>Cubierta</small>';el.classList.toggle('active',SEL.type==='cover');
  const r=roofDescriptor(),p=r.center.clone().applyMatrix4(group.matrixWorld),pr=p.clone().project(camera),rect=renderer.domElement.getBoundingClientRect();
  const x=(pr.x*.5+.5)*rect.width,y=(-pr.y*.5+.5)*rect.height;el.style.left=`${x}px`;el.style.top=`${y}px`;
  el.classList.toggle('hidden',pr.z<-1||pr.z>1||x<-20||y<-20||x>rect.width+20||y>rect.height+20)
}

function updateAllFacadeLabels(){
  if(renderer&&camera){updateFacadeLabelsFor(renderer,camera,buildingGroup,'labels-3d');updateCoverLabelFor(renderer,camera,buildingGroup,'labels-3d')};
  if(solarRenderer&&solarCamera){updateFacadeLabelsFor(solarRenderer,solarCamera,solarBuilding,'labels-solar');updateCoverLabelFor(solarRenderer,solarCamera,solarBuilding,'labels-solar')};
}

function bindPicking(ren,cam,getGroup){
  const rc=new THREE.Raycaster(),mouse=new THREE.Vector2();let down=null;
  ren.domElement.addEventListener('pointerdown',e=>{if(e.button===0)down={x:e.clientX,y:e.clientY}});
  ren.domElement.addEventListener('pointerup',e=>{
    if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5){down=null;return}down=null;
    const r=ren.domElement.getBoundingClientRect();mouse.x=((e.clientX-r.left)/r.width)*2-1;mouse.y=-((e.clientY-r.top)/r.height)*2+1;
    rc.setFromCamera(mouse,cam);const g=getGroup();if(!g?.userData?.pickables)return;
    const hits=rc.intersectObjects(g.userData.pickables,false);if(!hits.length)return;
    const vh=hits.find(h=>h.object.userData.type==='vertex'),hit=vh||hits[0];
    select3DObject(hit.object.userData.type,hit.object.userData.index)
  })
}
function select3DObject(type,index){SEL.type=type;SEL.index=index;refresh3DSelection();renderSelectionInspector();updateSelectedSunPanel();updateAllFacadeLabels()}
function refresh3DSelection(){
  [buildingGroup,solarBuilding].forEach(g=>{
    if(!g?.userData)return;
    (g.userData.facades||[]).forEach((m,i)=>{const on=SEL.type==='facade'&&SEL.index===i;m.material.opacity=on?.34:.025;m.material.color.set(on?0x86b817:0x86b817)});
    (g.userData.vertices||[]).forEach((m,i)=>{const on=SEL.type==='vertex'&&SEL.index===i;m.material.opacity=on?1:.55;m.material.color.set(on?0xf0a500:0x334d58);m.scale.setScalar(on?1.45:1)});
    if(g.userData.cover){const on=SEL.type==='cover';g.userData.cover.material.opacity=on?.32:.035;g.userData.cover.material.color.set(on?0xf0b523:0x86b817)}
  })
}
function renderSelectionInspector(){
  if(SEL.type==='cover'){
    const r=lastRoofResult||computeRoofDaily(),mins=+$('time').value,sun=solarPosition(currentDateAtMinutes(mins),+$('lat').value,+$('lon').value,+$('tz').value);
    $('selection-panel').innerHTML=`<h3>CUBIERTA C1</h3><div class="facade-inspector"><div class="facade-title">Superficie horizontal superior</div><div class="facade-grid"><div><span>Sol diario</span><strong>${formatHours(r.minutes)}</strong></div><div><span>Día solar</span><strong>${daylightMinutes()?Math.round(r.minutes/daylightMinutes()*100):0}%</strong></div><div><span>Captación geométrica</span><strong>${r.geomEquivalentHours.toFixed(1).replace('.',',')} h-eq</strong></div><div><span>Estado actual</span><strong>${sun.alt>0?'SOL DIRECTO':'SIN SOL'}</strong></div></div><div class="coverage-note">h-eq geométricas = integración de sin(elevación solar) durante el día. No representa kWh/m².</div></div>`;return
  }
  if(SEL.type==='vertex'){
    const p=polygonData()?.[SEL.index];if(!p)return;
    $('selection-panel').innerHTML=`<h3>VÉRTICE V${SEL.index+1}</h3><div class="vertex3d-info"><strong>Coordenadas locales</strong><br>X: ${p.x.toFixed(2)} m<br>Y: ${p.z.toFixed(2)} m<br><br>Para mover este vértice con precisión, vuelve a <b>PLANTA</b> y arrástralo sobre la referencia.</div>`;return
  }
  if(SEL.type==='facade'){
    const f=facadeDescriptors()[SEL.index];if(!f)return;const rec=lastSunResults?.[SEL.index];
    const cur=currentFacadeSunState(f);
    $('selection-panel').innerHTML=`<h3>FACHADA F${f.index+1}</h3><div class="facade-inspector"><div class="facade-title">${f.orientation} · ${f.az.toFixed(1)}°</div><div class="facade-grid"><div><span>Longitud</span><strong>${f.len.toFixed(2)} m</strong></div><div><span>Azimut</span><strong>${f.az.toFixed(1)}°</strong></div><div><span>Sol diario</span><strong>${rec?formatHours(rec.minutes):'—'}</strong></div><div><span>Orientación</span><strong>${f.orientation}</strong></div></div><div class="facade-state ${cur?'on':'off'}">${cur?'SOL DIRECTO AHORA':'SIN SOL DIRECTO AHORA'}</div></div>`
  }
}

function resize3D(){[['three-stage',camera,renderer],['three-solar',solarCamera,solarRenderer]].forEach(([id,cam,ren])=>{if(!ren)return;const r=$(id).getBoundingClientRect();if(r.width&&r.height){ren.setSize(r.width,r.height,false);cam.aspect=r.width/r.height;cam.updateProjectionMatrix()}})}
function animate(){updateAllFacadeLabels();requestAnimationFrame(animate);controls?.update();solarControls?.update();renderer?.render(scene,camera);solarRenderer?.render(solarScene,solarCamera)}
function rad(x){return x*Math.PI/180}function deg(x){return x*180/Math.PI}function clamp(x,a,b){return Math.max(a,Math.min(b,x))}
function solarPosition(date,lat,lon,tz){const start=new Date(date.getFullYear(),0,0),doy=Math.floor((date-start)/86400000),mins=date.getHours()*60+date.getMinutes(),g=2*Math.PI/365*(doy-1+(mins/60-12)/24),eq=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g)),dec=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g),tst=(mins+eq+4*lon-60*tz)%1440,ha=rad(tst/4-180),phi=rad(lat),cosz=Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(ha),zen=Math.acos(clamp(cosz,-1,1)),alt=90-deg(zen),az=(deg(Math.atan2(Math.sin(ha),Math.cos(ha)*Math.sin(phi)-Math.tan(dec)*Math.cos(phi)))+180+360)%360;return{alt,az}}
function parseCoords(s){if(!s)return null;let m=s.match(/(\d+)°\s*(\d+)'\s*([\d.]+)"?\s*([NS]).*?(\d+)°\s*(\d+)'\s*([\d.]+)"?\s*([EWO])/i);if(m){let la=+m[1]+ +m[2]/60+ +m[3]/3600,lo=+m[5]+ +m[6]/60+ +m[7]/3600;if(m[4].toUpperCase()==='S')la=-la;if(/[WO]/i.test(m[8]))lo=-lo;return[la,lo]}m=s.match(/(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/);return m?[+m[1],+m[2]]:null}
let lastSunResults=null,lastRoofResult=null;

function roofDescriptor(){
  const p=polygonData(); if(!p||p.length<3)return null;
  const h=+$('wall-height').value||2.4;
  let cx=0,cz=0; p.forEach(v=>{cx+=v.x;cz+=v.z});cx/=p.length;cz/=p.length;
  return{
    id:'C1', type:'cover', index:0, orientation:'Horizontal', az:0,
    center:new THREE.Vector3(cx,h+.03,cz),
    normal:new THREE.Vector3(0,1,0)
  }
}
function roofGeometry(){
  const p=polygonData(); if(!p||p.length<3)return null;
  const shape=new THREE.Shape();shape.moveTo(p[0].x,-p[0].z);
  for(let i=1;i<p.length;i++)shape.lineTo(p[i].x,-p[i].z);shape.closePath();
  const g=new THREE.ShapeGeometry(shape);g.rotateX(-Math.PI/2);g.translate(0,(+$('wall-height').value||2.4)+.018,0);return g
}
function roofSunStateAt(sun){
  return sun.alt>0;
}
function computeRoofDaily(){
  const step=5,base=$('date').value,lat=+$('lat').value,lon=+$('lon').value,tz=+$('tz').value;
  let minutes=0,first=null,last=null,flags=[],geom=0;
  for(let m=0;m<1440;m+=step){
    const d=new Date(base+'T00:00:00');d.setHours(Math.floor(m/60),m%60);
    const sun=solarPosition(d,lat,lon,tz),on=sun.alt>0;flags.push(on);
    if(on){
      minutes+=step;if(first==null)first=m;last=m+step;
      geom += Math.max(0,Math.sin(rad(sun.alt))) * step/60;
    }
  }
  return{id:'C1',type:'cover',index:0,orientation:'Horizontal',azimuth:null,length:null,sunMinutes:minutes,minutes,first,last,segments:contiguousSegments(flags,step),geomEquivalentHours:geom}
}

function sunVector(sun){const alt=rad(sun.alt),az=rad(sun.az);return new THREE.Vector3(Math.cos(alt)*Math.sin(az),Math.sin(alt),-Math.cos(alt)*Math.cos(az)).normalize()}
function currentDateAtMinutes(mins){const date=new Date($('date').value+'T00:00:00');date.setHours(Math.floor(mins/60),mins%60);return date}
function currentFacadeSunState(f){
  const mins=+$('time').value,sun=solarPosition(currentDateAtMinutes(mins),+$('lat').value,+$('lon').value,+$('tz').value);
  return isFacadeSunlit(f,sun,true)
}
function isFacadeSunlit(f,sun,occlusion=true){
  if(sun.alt<=0)return false;const dir=sunVector(sun);if(f.nWorld.dot(dir)<=.002)return false;
  if(!occlusion||!solarBuilding?.userData?.body)return true;
  solarBuilding.updateMatrixWorld(true);
  const origin=f.center.clone().applyMatrix4(solarBuilding.matrixWorld).add(f.nWorld.clone().multiplyScalar(.06));
  const ray=new THREE.Raycaster(origin,dir,.02,250),hits=ray.intersectObject(solarBuilding.userData.body,false);
  return hits.length===0
}
function formatClock(mins){if(mins==null)return'—';const h=Math.floor(mins/60)%24,m=mins%60;return`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`}
function formatHours(mins){return`${(mins/60).toFixed(1).replace('.',',')} h`}
function contiguousSegments(flags,step){
  const seg=[];let start=null;
  for(let i=0;i<flags.length;i++){if(flags[i]&&start==null)start=i*step;if((!flags[i]||i===flags.length-1)&&start!=null){const end=(flags[i]&&i===flags.length-1)?(i+1)*step:i*step;seg.push([start,end]);start=null}}
  return seg
}
function computeDailySunHours(){
  const fs=facadeDescriptors();if(!fs.length)return[];
  const step=5,lat=+$('lat').value,lon=+$('lon').value,tz=+$('tz').value,base=$('date').value;
  return fs.map(f=>{let minutes=0,first=null,last=null,flags=[];for(let m=0;m<1440;m+=step){const d=new Date(base+'T00:00:00');d.setHours(Math.floor(m/60),m%60);const sun=solarPosition(d,lat,lon,tz),on=isFacadeSunlit(f,sun,true);flags.push(on);if(on){minutes+=step;if(first==null)first=m;last=m+step}}return{index:f.index,minutes,first,last,segments:contiguousSegments(flags,step),az:f.az,orientation:f.orientation,len:f.len}})
}
function daylightMinutes(){
  let n=0,step=5;for(let m=0;m<1440;m+=step){const s=solarPosition(currentDateAtMinutes(m),+$('lat').value,+$('lon').value,+$('tz').value);if(s.alt>0)n+=step}return n
}
function trackHTML(segments){
  return segments.map(([a,b])=>`<span class="sun-segment selfshade" style="left:${(a/1440*100).toFixed(3)}%;width:${((b-a)/1440*100).toFixed(3)}%"></span>`).join('')
}
function updateDailySunDashboard(){
  const grid=$('sun-hours-grid');if(!grid)return;
  if(!S.closed||S.pts.length<3){lastSunResults=null;grid.innerHTML='<div class="sun-empty">Dibuja y cierra una planta para obtener el análisis diario de cada fachada.</div>';$('daylight-out').textContent='—';updateSelectedSunPanel();return}
  lastSunResults=computeDailySunHours();lastRoofResult=computeRoofDaily();$('daylight-out').textContent=formatHours(daylightMinutes());
  grid.innerHTML=lastSunResults.map(r=>`<article class="facade-sun-card ${SEL.type==='facade'&&SEL.index===r.index?'active':''}" data-facecard="${r.index}"><div class="facade-sun-head"><div><strong>F${r.index+1} · ${r.orientation}</strong><span>${r.az.toFixed(1)}° · ${r.len.toFixed(2)} m</span></div><span class="sun-hours">${formatHours(r.minutes)}</span></div><div class="sun-track">${trackHTML(r.segments)}</div><div class="sun-range"><span>${formatClock(r.first)}</span><span>${formatClock(r.last)}</span></div></article>`).join('')+`<article class="facade-sun-card ${SEL.type==='cover'?'active':''}" data-covercard="1"><div class="facade-sun-head"><div><strong>C1 · Cubierta</strong><span>Horizontal <span class="coverage-badge">SUPERIOR</span></span></div><span class="sun-hours">${formatHours(lastRoofResult.minutes)}</span></div><div class="sun-track">${trackHTML(lastRoofResult.segments)}</div><div class="sun-range"><span>${formatClock(lastRoofResult.first)}</span><span>${formatClock(lastRoofResult.last)}</span></div><div class="coverage-note">Captación geométrica relativa: ${lastRoofResult.geomEquivalentHours.toFixed(1).replace('.',',')} h-eq</div></article>`;
  qsa('[data-facecard]').forEach(el=>el.onclick=()=>select3DObject('facade',+el.dataset.facecard));const cc=document.querySelector('[data-covercard]');if(cc)cc.onclick=()=>select3DObject('cover',0);
  renderSelectionInspector();updateSelectedSunPanel()
}
function updateSelectedSunPanel(){
  if(SEL.type==='cover'&&lastRoofResult){
    const r=lastRoofResult;$('selected-facade-name').textContent='C1 · Cubierta';
    $('selected-facade-detail').textContent='Superficie horizontal superior del modelo. La captación geométrica relativa no equivale a energía solar real.';
    $('selected-az').textContent='Horizontal';$('selected-hours').textContent=formatHours(r.minutes);$('selected-first').textContent=formatClock(r.first);$('selected-last').textContent=formatClock(r.last);$('selected-track').innerHTML=trackHTML(r.segments);
    qsa('.facade-sun-card').forEach(c=>c.classList.remove('active'));document.querySelector('[data-covercard]')?.classList.add('active');return
  }
  if(SEL.type!=='facade'||!lastSunResults?.[SEL.index]){
    $('selected-facade-name').textContent='Ninguna';$('selected-facade-detail').textContent='Haz clic sobre una fachada del modelo 3D o del análisis solar.';
    ['selected-az','selected-hours','selected-first','selected-last'].forEach(id=>$(id).textContent='—');$('selected-track').innerHTML='';return
  }
  const r=lastSunResults[SEL.index];$('selected-facade-name').textContent=`F${r.index+1} · ${r.orientation}`;
  $('selected-facade-detail').textContent=`Longitud ${r.len.toFixed(2)} m · análisis del punto medio de fachada con autosombra del propio edificio.`;
  $('selected-az').textContent=`${r.az.toFixed(1)}°`;$('selected-hours').textContent=formatHours(r.minutes);$('selected-first').textContent=formatClock(r.first);$('selected-last').textContent=formatClock(r.last);$('selected-track').innerHTML=trackHTML(r.segments);
  qsa('.facade-sun-card').forEach((c,i)=>c.classList.toggle('active',i===r.index))
}
function updateSunPath(){
  if(!solarScene||!sunOrb)return;if(sunPathLine)solarScene.remove(sunPathLine);
  const pts=[],base=$('date').value,lat=+$('lat').value,lon=+$('lon').value,tz=+$('tz').value,r=20;
  for(let m=0;m<1440;m+=20){const d=new Date(base+'T00:00:00');d.setHours(Math.floor(m/60),m%60);const s=solarPosition(d,lat,lon,tz);if(s.alt>0){const v=sunVector(s);pts.push(v.multiplyScalar(r))}}
  if(pts.length>1){const g=new THREE.BufferGeometry().setFromPoints(pts),mat=new THREE.LineBasicMaterial({color:0xcf5a52,transparent:true,opacity:.78});sunPathLine=new THREE.Line(g,mat);solarScene.add(sunPathLine)}
}
function updateSolar(){
  if(!sunLight)return;const mins=+$('time').value,date=currentDateAtMinutes(mins),sun=solarPosition(date,+$('lat').value,+$('lon').value,+$('tz').value);
  $('time-out').textContent=formatClock(mins);$('sun-data').textContent=sun.alt>0?`Azimut ${sun.az.toFixed(1)}° · Elevación ${sun.alt.toFixed(1)}°`:'Sol bajo el horizonte';
  const dir=sunVector({alt:Math.max(sun.alt,1),az:sun.az}),lp=dir.clone().multiplyScalar(40);sunLight.position.copy(lp);sunLight.target.position.set(0,0,0);sunLight.visible=sun.alt>0;
  sunOrb.position.copy(dir.clone().multiplyScalar(20));sunOrb.visible=sun.alt>0;if(solarScene)solarScene.background=new THREE.Color(sun.alt>0?0xdfeaf0:0x25343b);
  if(SEL.type==='facade')renderSelectionInspector()
}
function setTool(t){S.tool=t;qsa('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===t));$('cad-hint').textContent={select:'Selecciona y arrastra vértices para corregir la planta.',wall:'Haz clic en las esquinas. Clic cerca del primer punto para cerrar.',measure:'Marca dos puntos cuya distancia real conozcas.',north:'Marca dos puntos formando una flecha hacia el Norte.'}[t]||''}
function initCommunes(){const data=window.HIDROLAB_COMMUNES||window.HIDROLAB_COMUNAS||window.COMUNAS_CHILE||[];const reg=$('region-select'),com=$('commune-select');if(Array.isArray(data)&&data.length){const regs=[...new Set(data.map(x=>x.region||x.region_name).filter(Boolean))];reg.innerHTML=regs.map(x=>`<option>${x}</option>`).join('');const fill=()=>{const items=data.filter(x=>(x.region||x.region_name)===reg.value);com.innerHTML=items.map((x,i)=>`<option value="${i}">${x.comuna||x.name}</option>`).join('');com.onchange=()=>{const x=items[+com.value];if(x){$('lat').value=x.lat||x.latitude||$('lat').value;$('lon').value=x.lon||x.lng||x.longitude||$('lon').value;updateSolar();updateSunPath();updateDailySunDashboard();updateGoogleMapReference()}};com.onchange()};reg.onchange=fill;fill()}else{reg.innerHTML='<option>Región Metropolitana</option>';com.innerHTML='<option>Coordenadas manuales</option>'}}


function applyLocationFromQuery(){
  const qs=new URLSearchParams(location.search);
  const qLat=Number(qs.get('lat')),qLon=Number(qs.get('lon'));
  const qRegion=(qs.get('region')||'').trim();
  const qCommune=(qs.get('comuna')||'').trim();
  const reg=$('region-select'),com=$('commune-select');

  if(qRegion&&reg){
    const ro=[...reg.options].find(o=>o.textContent.trim()===qRegion);
    if(ro){
      reg.value=ro.value;
      if(typeof reg.onchange==='function')reg.onchange();
    }
  }
  if(qCommune&&com){
    const co=[...com.options].find(o=>o.textContent.trim()===qCommune);
    if(co){
      com.value=co.value;
      if(typeof com.onchange==='function')com.onchange();
    }
  }
  if(Number.isFinite(qLat)&&qLat>=-90&&qLat<=90)$('lat').value=qLat.toFixed(6);
  if(Number.isFinite(qLon)&&qLon>=-180&&qLon<=180)$('lon').value=qLon.toFixed(6);
  if(Number.isFinite(qLat)&&Number.isFinite(qLon)){
    $('coords').value=`${qLat.toFixed(6)}, ${qLon.toFixed(6)}`;
  }
  updateGoogleMapReference();
}


function setReferenceMode(mode){
  const imageMode=mode!=='map';
  qsa('[data-reference-mode]').forEach(btn=>{
    const active=btn.dataset.referenceMode===mode;
    btn.classList.toggle('active',active);
    btn.setAttribute('aria-selected',active?'true':'false');
  });
  qsa('[data-reference-pane]').forEach(pane=>{
    pane.classList.toggle('active',pane.dataset.referencePane===mode);
  });
}

function updateGoogleMapReference(){
  const la=Number($('lat').value),lo=Number($('lon').value);
  if(!Number.isFinite(la)||!Number.isFinite(lo)||la<-90||la>90||lo<-180||lo>180)return;
  const latText=la.toFixed(6),lonText=lo.toFixed(6);
  const frame=$('solar-google-map-frame');
  const out=$('solar-map-coords');
  const link=$('open-google-map');
  if(frame)frame.src=`https://maps.google.com/maps?q=${encodeURIComponent(latText+','+lonText)}&z=17&output=embed`;
  if(out)out.textContent=`${latText}, ${lonText}`;
  if(link)link.href=`https://www.google.com/maps?q=${encodeURIComponent(latText+','+lonText)}`;
}

function initReferenceModes(){
  qsa('[data-reference-mode]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      setReferenceMode(btn.dataset.referenceMode);
      if(btn.dataset.referenceMode==='map')updateGoogleMapReference();
    });
  });
  const mapBtn=$('update-google-map');
  if(mapBtn)mapBtn.addEventListener('click',updateGoogleMapReference);
  setReferenceMode('image');
  updateGoogleMapReference();
}

function updateImageControls(){
  const btn=$('clear-image');
  if(btn)btn.disabled=!S.img;
}
function clearReferenceImage(){
  if(S.imgURL){
    try{URL.revokeObjectURL(S.imgURL)}catch(_){}
  }
  S.img=null;S.imgURL=null;S.imgW=0;S.imgH=0;
  const input=$('image-file');if(input)input.value='';
  updateImageControls();
  drawCAD();
  $('cad-hint').textContent=S.closed
    ?'Imagen eliminada. La geometría, calibración y orientación se conservaron.'
    :'Imagen eliminada. Puedes cargar otra referencia cuando quieras.';
}

function init(){$('status-pill').textContent='Módulo activo';initCommunes();applyLocationFromQuery();initReferenceModes();const now=new Date();$('date').value=now.toISOString().slice(0,10);qsa('.tab').forEach(b=>b.onclick=()=>{qsa('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');qsa('.viewport').forEach(x=>x.classList.remove('active'));$(b.dataset.view+'-view').classList.add('active');setTimeout(()=>{resizeCanvas();resize3D()},20)});qsa('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));$('fit').onclick=fitImage;$('undo').onclick=()=>{S.pts.pop();S.closed=false;updateMetrics();drawCAD();rebuild3D()};$('image-file').onchange=e=>{
  const f=e.target.files[0];if(!f)return;
  if(S.imgURL){try{URL.revokeObjectURL(S.imgURL)}catch(_){}}
  const url=URL.createObjectURL(f),img=new Image();
  img.onload=()=>{
    S.img=img;S.imgURL=url;S.imgW=img.naturalWidth;S.imgH=img.naturalHeight;
    S.pts=[];S.closed=false;S.scale=null;S.calPts=[];autoFit3D=true;
    updateImageControls();fitImage()
  };
  img.onerror=()=>{try{URL.revokeObjectURL(url)}catch(_){};S.imgURL=null;updateImageControls()};
  img.src=url
};$('clear-image').onclick=clearReferenceImage;updateImageControls();$('cal-distance').onchange=applyCalibration;$('coords').onchange=()=>{const p=parseCoords($('coords').value);if(p){$('lat').value=p[0].toFixed(6);$('lon').value=p[1].toFixed(6);updateSolar();updateSunPath();updateDailySunDashboard();updateGoogleMapReference()}};['lat','lon','date','tz'].forEach(id=>$(id).addEventListener('input',()=>{updateSolar();updateSunPath();updateDailySunDashboard()}));['lat','lon'].forEach(id=>$(id).addEventListener('change',updateGoogleMapReference));$('time').addEventListener('input',updateSolar);['wall-height'].forEach(id=>$(id).addEventListener('input',()=>{autoFit3D=true;rebuild3D()}));$('building-az').addEventListener('input',rebuild3D);$('reset-project').onclick=()=>{autoFit3D=true;S.pts=[];S.closed=false;S.scale=null;S.calPts=[];S.northPts=[];drawCAD();rebuild3D()};$('play').onclick=()=>{if(playTimer){clearInterval(playTimer);playTimer=null;$('play').textContent='▶'}else{playTimer=setInterval(()=>{let v=+$('time').value+10;if(v>1260)v=300;$('time').value=v;updateSolar()},120);$('play').textContent='❚❚'}};qsa('[data-cam]').forEach(b=>b.onclick=()=>{
      const v=b.dataset.cam||'iso';
      if(buildingGroup)fitCameraToModel(camera,controls,buildingGroup,v);
    });initScenes();resizeCanvas();fitImage();rebuild3D();updateSolar();updateSunPath();updateDailySunDashboard();window.addEventListener('resize',()=>{resizeCanvas();resize3D()})}

function communeLabel(){
  const reg=$('region-select'),com=$('commune-select');
  const r=reg?.options?.[reg.selectedIndex]?.textContent?.trim()||'';
  const c=com?.options?.[com.selectedIndex]?.textContent?.trim()||'';
  return [c,r].filter(Boolean).join(', ')
}
function safeCanvasDataURL(canvas){
  try{return canvas?.toDataURL?.('image/png')||''}catch(_){return''}
}

function facadeIdentificationFrom3D(){
  if(!buildingGroup||!S.closed)return'';
  buildingGroup.updateMatrixWorld(true);

  const p=polygonData(); if(!p?.length)return'';
  const fs=facadeDescriptors(); if(!fs.length)return'';

  // IMPORTANT: transform local footprint vertices with the exact same
  // world matrix used by the 3D model. Then create a top view from X/Z.
  const wp=p.map(v=>{
    const q=new THREE.Vector3(v.x,0,v.z).applyMatrix4(buildingGroup.matrixWorld);
    return{x:q.x,z:q.z}
  });

  const minX=Math.min(...wp.map(v=>v.x)),maxX=Math.max(...wp.map(v=>v.x));
  const minZ=Math.min(...wp.map(v=>v.z)),maxZ=Math.max(...wp.map(v=>v.z));

  const W=760,H=480,pad=70;
  const spanX=Math.max(.1,maxX-minX),spanZ=Math.max(.1,maxZ-minZ);
  const sc=Math.min((W-2*pad)/spanX,(H-2*pad)/spanZ);
  const cx=(minX+maxX)/2,cz=(minZ+maxZ)/2;

  // In screen coordinates, geographic North is up: world -Z -> smaller Y.
  // So y = H/2 + (z-cz)*scale.
  const xy=v=>({
    x:W/2+(v.x-cx)*sc,
    y:H/2+(v.z-cz)*sc
  });

  const path=wp.map((v,i)=>`${i?'L':'M'} ${xy(v).x.toFixed(1)} ${xy(v).y.toFixed(1)}`).join(' ')+' Z';

  // Labels are placed using the midpoint transformed by the SAME 3D matrix.
  const labs=fs.map(f=>{
    const localMid=new THREE.Vector3((f.a.x+f.b.x)/2,0,(f.a.z+f.b.z)/2);
    const worldMid=localMid.applyMatrix4(buildingGroup.matrixWorld);
    const q=xy({x:worldMid.x,z:worldMid.z});
    return `<g>
      <circle cx="${q.x}" cy="${q.y}" r="18" fill="#0b3f52"/>
      <text x="${q.x}" y="${q.y+4}" text-anchor="middle" font-family="Arial" font-size="12" font-weight="700" fill="white">F${f.index+1}</text>
      <text x="${q.x}" y="${q.y+34}" text-anchor="middle" font-family="Arial" font-size="10" fill="#3c5964">${f.orientation} · ${f.az.toFixed(0)}°</text>
    </g>`
  }).join('');

  // Covered surface marker at the actual 3D roof centroid projected to top view.
  const roof=roofDescriptor?.();
  let cover='';
  if(roof){
    const rw=roof.center.clone().applyMatrix4(buildingGroup.matrixWorld);
    const rc=xy({x:rw.x,z:rw.z});
    cover=`<g>
      <rect x="${rc.x-23}" y="${rc.y-13}" width="46" height="26" rx="6" fill="#f0b523"/>
      <text x="${rc.x}" y="${rc.y+5}" text-anchor="middle" font-family="Arial" font-size="13" font-weight="700" fill="#173039">C1</text>
    </g>`
  }

  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="100%" height="100%" fill="#f5f8f8"/>
    <path d="${path}" fill="#dde7e8" stroke="#173039" stroke-width="3"/>
    ${labs}
    ${cover}

    <g transform="translate(${W-72},82)">
      <line x1="0" y1="35" x2="0" y2="-25" stroke="#cf4b43" stroke-width="4"/>
      <polygon points="0,-40 -9,-21 9,-21" fill="#cf4b43"/>
      <text x="0" y="57" text-anchor="middle" font-family="Arial" font-size="14" font-weight="700" fill="#cf4b43">N</text>
      <text x="0" y="73" text-anchor="middle" font-family="Arial" font-size="8" fill="#7f4a47">NORTE GEOGRÁFICO</text>
    </g>

    <text x="${pad}" y="${H-18}" font-family="Arial" font-size="9" fill="#60747d">
      Esquema en planta derivado directamente de la orientación del Modelo 3D.
    </text>
  </svg>`;

  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)
}

function solarReportPayload(){
  updateSolar();updateDailySunDashboard();
  renderer?.render(scene,camera);solarRenderer?.render(solarScene,solarCamera);drawCAD();

  const p=polygonData()||[], faces=facadeDescriptors(), recs=lastSunResults||computeDailySunHours();
  const mins=+$('time').value, solarNow=solarPosition(
    currentDateAtMinutes(mins), +$('lat').value, +$('lon').value, +$('tz').value
  );
  const areaText=$('area-out')?.textContent||'—', perimText=$('perim-out')?.textContent||'—';
  const location=communeLabel();

  return {
    version:'V6.3.4',
    analyzedDate:$('date').value,
    analyzedDateLabel:(()=>{try{return new Date($('date').value+'T12:00:00').toLocaleDateString('es-CL',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}catch(_){return $('date').value}})(),
    location,
    latitude:+$('lat').value,
    longitude:+$('lon').value,
    timezone:+$('tz').value,
    selectedTime:formatClock(mins),
    solarAzimuth:solarNow.az,
    solarElevation:solarNow.alt,
    daylightMinutes:daylightMinutes(),
    wallHeight:+$('wall-height').value,
    additionalAzimuth:+$('building-az').value,
    reportPlanRotationDeg:(deg(totalRotationRad())%360+360)%360,
    northAngle:S.northAngle||0,
    calibrated:hasMetricCalibration(),
    scale:S.scale||null,
    areaText,
    perimeterText:perimText,
    facadeCount:faces.length,
    vertices:p.map((v,i)=>({id:`V${i+1}`,x:v.x,z:v.z})),
    cover:(()=>{const rr=lastRoofResult||computeRoofDaily();return{id:'C1',orientation:'Horizontal',sunMinutes:rr.minutes,sunHours:rr.minutes/60,first:rr.first,last:rr.last,segments:rr.segments,geomEquivalentHours:rr.geomEquivalentHours}})(),
    facades:recs.map(r=>({
      id:`F${r.index+1}`,
      orientation:r.orientation,
      azimuth:r.az,
      length:r.len,
      sunMinutes:r.minutes,
      sunHours:r.minutes/60,
      first:r.first,
      last:r.last,
      segments:r.segments
    })),
    snapshots:{
      facadeMap:facadeIdentificationFrom3D(),
      plan:safeCanvasDataURL(canvas),
      model:safeCanvasDataURL(renderer?.domElement),
      solar:safeCanvasDataURL(solarRenderer?.domElement)
    },
    methodology:{
      stepMinutes:5,
      point:'Punto medio de cada fachada',
      selfShadow:true,
      externalObstacles:false
    }
  }
}
window.HIDROLAB_SOLAR_REPORT=solarReportPayload;

try{init()}catch(err){console.error('HIDROLAB Solar Studio init error',err);const pill=document.getElementById('status-pill');if(pill)pill.textContent='Error de inicio';const panel=document.getElementById('selection-panel');if(panel)panel.innerHTML='<h3>ERROR DE INICIO</h3><div class="empty">El módulo no pudo iniciar. Recarga la página; si persiste, revisa la consola del navegador.</div>'}
