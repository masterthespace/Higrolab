import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const $=id=>document.getElementById(id), qsa=s=>[...document.querySelectorAll(s)];
const BLOCK_COLORS=['#00cbe8','#ff2f8a','#80e900','#ffd51f','#7657ff','#ff7200','#27c6a3','#ef5da8'];
const S={tool:'select',img:null,imgURL:null,imgW:0,imgH:0,mapRef:false,mapRefURL:null,zoom:1,panX:0,panY:0,blocks:[{id:'A',name:'Bloque A',pts:[],closed:false,height:2.4,az:0}],activeBlock:0,scale:null,calPts:[],northAngle:0,northPts:[],drag:null,hover:null};
function blockCode(i){let n=i+1,r='';while(n>0){n--;r=String.fromCharCode(65+n%26)+r;n=Math.floor(n/26)}return r}
function activeBlock(){return S.blocks[S.activeBlock]||S.blocks[0]}
Object.defineProperties(S,{pts:{get(){return activeBlock().pts},set(v){activeBlock().pts=v}},closed:{get(){return activeBlock().closed},set(v){activeBlock().closed=!!v}}});

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

let autoFit3D=true;const canvas=$('cad'),ctx=canvas.getContext('2d'); let scene,camera,renderer,controls,buildingGroup,solarScene,solarCamera,solarRenderer,solarControls,solarBuilding,sunLight,playTimer,sunOrb,sunPathLine; const SEL={type:null,index:null,blockIndex:0};
function resizeCanvas(){const r=canvas.parentElement.getBoundingClientRect();canvas.width=Math.round(r.width*devicePixelRatio);canvas.height=Math.round(r.height*devicePixelRatio);canvas.style.width=r.width+'px';canvas.style.height=r.height+'px';drawCAD();resize3D()}
function screenToWorld(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left-S.panX)/S.zoom,y:(e.clientY-r.top-S.panY)/S.zoom}}
function worldToScreen(p){return{x:p.x*S.zoom+S.panX,y:p.y*S.zoom+S.panY}}
function snapPoint(p){
  const b=activeBlock();if(!b.pts.length||!$('snap90').checked)return p;
  const a=b.pts[b.pts.length-1],dx=p.x-a.x,dy=p.y-a.y;
  if(Math.abs(dx)>Math.abs(dy)*3)return{x:p.x,y:a.y};if(Math.abs(dy)>Math.abs(dx)*3)return{x:a.x,y:p.y};return p
}
function fitImage(){const r=canvas.getBoundingClientRect();if(S.img||S.mapRef){S.zoom=Math.min((r.width-50)/S.imgW,(r.height-50)/S.imgH);S.panX=(r.width-S.imgW*S.zoom)/2;S.panY=(r.height-S.imgH*S.zoom)/2}else{S.zoom=1;S.panX=r.width/2;S.panY=r.height/2}drawCAD()}
function drawCAD(){
  const d=devicePixelRatio,r=canvas.getBoundingClientRect();ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,r.width,r.height);
  if(!S.mapRef){ctx.fillStyle='#e9eef0';ctx.fillRect(0,0,r.width,r.height)}syncPlanMapReference();
  ctx.save();ctx.translate(S.panX,S.panY);ctx.scale(S.zoom,S.zoom);if(S.img)ctx.drawImage(S.img,0,0,S.imgW,S.imgH);else if(!S.mapRef)drawGrid();
  if(S.scale&&S.calPts.length===2)drawLine(S.calPts[0],S.calPts[1],'#f0a500',3/S.zoom);if(S.northPts.length===2)drawLine(S.northPts[0],S.northPts[1],'#d93232',3/S.zoom);
  S.blocks.forEach((b,bi)=>{
    if(!b.pts.length)return;const active=bi===S.activeBlock,color=BLOCK_COLORS[bi%BLOCK_COLORS.length];ctx.beginPath();ctx.moveTo(b.pts[0].x,b.pts[0].y);for(let i=1;i<b.pts.length;i++)ctx.lineTo(b.pts[i].x,b.pts[i].y);if(b.closed)ctx.closePath();
    if(b.closed){ctx.fillStyle=active?'rgba(0,203,232,.17)':'rgba(64,96,105,.09)';ctx.fill()}ctx.strokeStyle=active?color:'#60777e';ctx.lineWidth=(active?3:2)/S.zoom;ctx.stroke();
    if(b.closed){ctx.font=`900 ${11/S.zoom}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';for(let i=0;i<b.pts.length;i++){const a=b.pts[i],q=b.pts[(i+1)%b.pts.length],x=(a.x+q.x)/2,y=(a.y+q.y)/2,lab=`${blockCode(bi)}-F${i+1}`,w=ctx.measureText(lab).width+10/S.zoom;ctx.fillStyle='rgba(16,38,45,.90)';ctx.fillRect(x-w/2,y-10/S.zoom,w,20/S.zoom);ctx.fillStyle='#fff';ctx.fillText(lab,x,y)}const cx=b.pts.reduce((a,p)=>a+p.x,0)/b.pts.length,cy=b.pts.reduce((a,p)=>a+p.y,0)/b.pts.length,lab=`${blockCode(bi)} · ${Number(b.height||2.4).toFixed(1).replace('.',',')} m`,w=ctx.measureText(lab).width+14/S.zoom;ctx.fillStyle=color;ctx.fillRect(cx-w/2,cy-12/S.zoom,w,24/S.zoom);ctx.fillStyle='#102126';ctx.fillText(lab,cx,cy)}
    b.pts.forEach((pt,i)=>{ctx.beginPath();ctx.arc(pt.x,pt.y,(active?6:4.5)/S.zoom,0,Math.PI*2);const hov=S.hover&&S.hover.blockIndex===bi&&S.hover.index===i;ctx.fillStyle=hov?'#ffd51f':active?'#fff':'#e8eeee';ctx.fill();ctx.strokeStyle=active?color:'#60777e';ctx.lineWidth=2/S.zoom;ctx.stroke()});if(active)drawDimensions(b)
  });ctx.restore();drawNorth()
}
function drawGrid(){const step=50;ctx.strokeStyle='#d2dde0';ctx.lineWidth=1;for(let x=-2000;x<2000;x+=step){ctx.beginPath();ctx.moveTo(x,-2000);ctx.lineTo(x,2000);ctx.stroke()}for(let y=-2000;y<2000;y+=step){ctx.beginPath();ctx.moveTo(-2000,y);ctx.lineTo(2000,y);ctx.stroke()}}
function drawLine(a,b,c,w){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.strokeStyle=c;ctx.lineWidth=w;ctx.stroke()}
function drawDimensions(block=activeBlock()){
  if(!S.scale||!block?.pts?.length)return;ctx.font=`${12/S.zoom}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';
  for(let i=0;i<block.pts.length-(block.closed?0:1);i++){const a=block.pts[i],b=block.pts[(i+1)%block.pts.length],m={x:(a.x+b.x)/2,y:(a.y+b.y)/2},len=Math.hypot(b.x-a.x,b.y-a.y)*S.scale;ctx.fillStyle='#10262d';ctx.fillRect(m.x-31/S.zoom,m.y-10/S.zoom,62/S.zoom,20/S.zoom);ctx.fillStyle='#fff';ctx.fillText(len.toFixed(2)+' m',m.x,m.y)}
}
function updateNorthHUD(){
  const angle=((Number(S.northAngle)||0)%360+360)%360;
  qsa('[data-north-needle]').forEach(el=>el.style.transform=`rotate(${angle}deg)`);
  qsa('[data-north-angle]').forEach(el=>el.textContent=`${angle.toFixed(0)}°`);
}
function drawNorth(){
  // El Norte se representa como HUD flotante y no se dibuja dentro del plano.
  updateNorthHUD()
}
function nearestVertex(p,allBlocks=false){
  let hit=null,dist=14/S.zoom;const list=allBlocks?S.blocks.map((b,i)=>[b,i]):[[activeBlock(),S.activeBlock]];list.forEach(([b,bi])=>b.pts.forEach((v,i)=>{const d=Math.hypot(v.x-p.x,v.y-p.y);if(d<dist){dist=d;hit={blockIndex:bi,index:i}}}));return hit
}
canvas.addEventListener('pointerdown',e=>{
  if(e.button===1||e.button===2){S.drag={pan:true,x:e.clientX,y:e.clientY,px:S.panX,py:S.panY};canvas.setPointerCapture(e.pointerId);return}
  let p=screenToWorld(e);
  if(S.tool==='wall'){
    const b=activeBlock(),near=nearestVertex(p,false);if(near){S.drag={vertex:near.index,blockIndex:near.blockIndex};canvas.setPointerCapture(e.pointerId);selectVertex(near.index,near.blockIndex);return}
    if(b.closed){$('cad-hint').textContent=`${b.name} ya está cerrado. Arrastra sus vértices o pulsa “Nuevo bloque”.`;return}
    p=snapPoint(p);if(b.pts.length>2&&Math.hypot(p.x-b.pts[0].x,p.y-b.pts[0].y)<14/S.zoom){b.closed=true;S.drag=null}else{b.pts.push(p);S.drag={vertex:b.pts.length-1,blockIndex:S.activeBlock,created:true};canvas.setPointerCapture(e.pointerId)}autoFit3D=true;updateMetrics();drawCAD();rebuild3D();return
  }
  if(S.tool==='measure'){S.calPts.push(p);if(S.calPts.length>2)S.calPts=[p];if(S.calPts.length===2)applyCalibration();drawCAD();return}
  if(S.tool==='north'){S.northPts.push(p);if(S.northPts.length>2)S.northPts=[p];if(S.northPts.length===2){const a=S.northPts[0],b=S.northPts[1];S.northAngle=(Math.atan2(b.x-a.x,-(b.y-a.y))*180/Math.PI+360)%360;updateNorthHUD();rebuild3D()}drawCAD();return}
  const hit=nearestVertex(p,true);if(hit){setActiveBlock(hit.blockIndex,false);S.drag={vertex:hit.index,blockIndex:hit.blockIndex};canvas.setPointerCapture(e.pointerId);selectVertex(hit.index,hit.blockIndex)}
});
canvas.addEventListener('dblclick',()=>{const b=activeBlock();if(S.tool==='wall'&&b.pts.length>=3&&!b.closed){b.closed=true;S.drag=null;autoFit3D=true;updateMetrics();drawCAD();rebuild3D()}});
canvas.addEventListener('pointermove',e=>{if(S.drag?.pan){S.panX=S.drag.px+e.clientX-S.drag.x;S.panY=S.drag.py+e.clientY-S.drag.y;drawCAD();return}const p=screenToWorld(e);if(S.drag?.vertex!=null){const b=S.blocks[S.drag.blockIndex];if(b?.pts?.[S.drag.vertex]){b.pts[S.drag.vertex]=p;autoFit3D=true;updateMetrics();drawCAD();rebuild3D()}return}S.hover=nearestVertex(p,true);drawCAD()});
const endCadDrag=e=>{S.drag=null;try{canvas.releasePointerCapture?.(e.pointerId)}catch(_){}};canvas.addEventListener('pointerup',endCadDrag);canvas.addEventListener('pointercancel',endCadDrag);canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('wheel',e=>{e.preventDefault();const r=canvas.getBoundingClientRect(),mx=e.clientX-r.left,my=e.clientY-r.top,before={x:(mx-S.panX)/S.zoom,y:(my-S.panY)/S.zoom},z=Math.exp(-e.deltaY*.001);S.zoom=Math.max(.08,Math.min(12,S.zoom*z));S.panX=mx-before.x*S.zoom;S.panY=my-before.y*S.zoom;drawCAD()},{passive:false});
function applyCalibration(){if(S.calPts.length!==2)return;const px=Math.hypot(S.calPts[1].x-S.calPts[0].x,S.calPts[1].y-S.calPts[0].y),m=+$('cal-distance').value;if(px>0&&m>0){S.scale=m/px;autoFit3D=true;$('scale-info').textContent=`1 px = ${S.scale.toFixed(5)} m · referencia ${m.toFixed(2)} m`;updateMetrics();rebuild3D()}}
function modelReference(){const pts=S.blocks.flatMap(b=>b.pts||[]);if(!pts.length)return{cx:0,cy:0,scale:S.scale||1};const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;let sc=S.scale;if(!(Number.isFinite(sc)&&sc>0)){const pxMax=Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys),1);sc=8/pxMax}return{cx,cy,scale:sc}}
function polygonData(block=activeBlock()){if(!block?.closed||block.pts.length<3)return null;const r=modelReference();return block.pts.map(p=>({x:(p.x-r.cx)*r.scale,z:(p.y-r.cy)*r.scale}))}
function areaPerim(block=activeBlock()){const p=polygonData(block);if(!p)return{a:0,l:0};let a=0,l=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];a+=p[i].x*q.z-q.x*p[i].z;l+=Math.hypot(q.x-p[i].x,q.z-p[i].z)}return{a:Math.abs(a)/2,l}}
function renderBlockList(){const root=$('block-list');if(!root)return;root.innerHTML=S.blocks.map((b,i)=>{const m=areaPerim(b),code=blockCode(i),color=BLOCK_COLORS[i%BLOCK_COLORS.length];return `<button class="solar-block-item ${i===S.activeBlock?'active':''} ${b.closed?'closed':''}" data-block-index="${i}" type="button" style="--block-color:${color}"><span class="solar-block-code">${code}</span><span><b>${b.name||`Bloque ${code}`}</b><small>${Number(b.height||2.4).toFixed(1).replace('.',',')} m · ${m.a?m.a.toFixed(1).replace('.',',')+' m²':'sin cerrar'}</small></span><span class="block-state">${b.closed?'CERRADO':`${b.pts.length} PTOS`}</span></button>`}).join('');root.querySelectorAll('[data-block-index]').forEach(btn=>btn.addEventListener('click',()=>setActiveBlock(+btn.dataset.blockIndex)))}
function syncBlockEditor(){const b=activeBlock(),code=blockCode(S.activeBlock);if($('active-block-code')){$('active-block-code').textContent=code;$('active-block-code').style.background=BLOCK_COLORS[S.activeBlock%BLOCK_COLORS.length]}if($('block-name'))$('block-name').value=b.name||`Bloque ${code}`;if($('wall-height'))$('wall-height').value=Number(b.height||2.4);if($('building-az'))$('building-az').value=Number(b.az||0);if($('delete-block'))$('delete-block').disabled=S.blocks.length<=1}
function setActiveBlock(index,rebuild=true,preserveSelection=false){
  if(index<0||index>=S.blocks.length)return;
  S.activeBlock=index;
  if(!preserveSelection){
    SEL.type=null;SEL.index=null;SEL.blockIndex=index
  }
  syncBlockEditor();renderBlockList();updateMetrics();drawCAD();
  if(rebuild)rebuild3D()
}
function addBlock(){const i=S.blocks.length,code=blockCode(i),h=Number(activeBlock()?.height||2.4);S.blocks.push({id:code,name:`Bloque ${code}`,pts:[],closed:false,height:h,az:0});setActiveBlock(i,false);setTool('wall');updateMetrics();drawCAD();rebuild3D();$('cad-hint').textContent=`Dibuja ${S.blocks[i].name}. Puede estar unido o separado del resto.`}
function deleteActiveBlock(){if(S.blocks.length<=1){const b=activeBlock();b.pts=[];b.closed=false;updateMetrics();drawCAD();rebuild3D();return}S.blocks.splice(S.activeBlock,1);S.activeBlock=Math.max(0,Math.min(S.activeBlock,S.blocks.length-1));S.blocks.forEach((b,i)=>b.id=blockCode(i));setActiveBlock(S.activeBlock,false);rebuild3D()}
function updateMetrics(){const closed=S.blocks.filter(b=>b.closed&&b.pts.length>=3),t=closed.reduce((a,b)=>{const m=areaPerim(b);a.a+=m.a;a.l+=m.l;a.f+=b.pts.length;return a},{a:0,l:0,f:0});$('area-out').textContent=t.a?t.a.toFixed(1)+' m²':'—';$('perim-out').textContent=t.l?t.l.toFixed(1)+' m':'—';$('faces-out').textContent=t.f?String(t.f):'—';const b=activeBlock();$('status-pill').textContent=closed.length?`${closed.length} bloque${closed.length===1?'':'s'} · ${t.f} fachadas`:`${S.blocks.length} bloque${S.blocks.length===1?'':'s'} · ${b.pts.length} vértices en ${b.name}`;renderBlockList()}
function selectVertex(i,bi=S.activeBlock){setActiveBlock(bi,false);const b=S.blocks[bi],p=b?.pts?.[i];if(!p)return;SEL.type='vertex';SEL.index=i;SEL.blockIndex=bi;$('selection-panel').innerHTML=`<h3>${blockCode(bi)} · VÉRTICE V${i+1}</h3><div class="vertex-editor"><label>X [px]<input id="vx" type="number" step=".1" value="${p.x.toFixed(1)}"></label><label>Y [px]<input id="vy" type="number" step=".1" value="${p.y.toFixed(1)}"></label><button id="delv">Eliminar vértice</button></div>`;$('vx').oninput=()=>{b.pts[i].x=+$('vx').value;drawCAD();rebuild3D()};$('vy').oninput=()=>{b.pts[i].y=+$('vy').value;drawCAD();rebuild3D()};$('delv').onclick=()=>{b.pts.splice(i,1);b.closed=b.closed&&b.pts.length>=3;$('selection-panel').innerHTML='<h3>SELECCIÓN</h3><div class="empty">Selecciona un vértice o una fachada.</div>';updateMetrics();drawCAD();rebuild3D()}}
function hasMetricCalibration(){return Number.isFinite(S.scale)&&S.scale>0}
function currentPlanExtent(){const p=S.blocks.filter(b=>b.closed).flatMap(b=>polygonData(b)||[]);if(!p.length)return null;const xs=p.map(v=>v.x),zs=p.map(v=>v.z);return{width:Math.max(...xs)-Math.min(...xs),depth:Math.max(...zs)-Math.min(...zs)}}
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

function makeGroundNorthMarker(gridSize){
  const g=new THREE.Group();
  const radius=Math.max(1.05,Math.min(2.8,gridSize*.075));
  const red=0xcf3434,dark=0x7b2a2a;

  // Ring on the grid.
  const ringPts=[];
  for(let i=0;i<=64;i++){
    const a=i/64*Math.PI*2;
    ringPts.push(new THREE.Vector3(Math.cos(a)*radius,.018,Math.sin(a)*radius))
  }
  const ring=new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(ringPts),
    new THREE.LineBasicMaterial({color:dark,transparent:true,opacity:.65})
  );
  g.add(ring);

  // Large arrow permanently pointing to geographic North (-Z).
  const arrow=new THREE.ArrowHelper(
    new THREE.Vector3(0,0,-1),
    new THREE.Vector3(0,.025,radius*.55),
    radius*1.65,
    red,
    radius*.43,
    radius*.22
  );
  g.add(arrow);

  // Crosshair makes the symbol easy to locate on a large grid.
  const cross=new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-radius*.72,.019,0),new THREE.Vector3(radius*.72,.019,0),
      new THREE.Vector3(0,.019,-radius*.72),new THREE.Vector3(0,.019,radius*.72)
    ]),
    new THREE.LineBasicMaterial({color:0x8b9ba0,transparent:true,opacity:.52})
  );
  g.add(cross);

  // Small 3D "N" plaque made from two bars + diagonal so it remains visible
  // without external fonts or textures.
  const nMat=new THREE.MeshBasicMaterial({color:red,side:THREE.DoubleSide});
  const barGeo=new THREE.BoxGeometry(radius*.09,.035,radius*.50);
  const left=new THREE.Mesh(barGeo,nMat),right=new THREE.Mesh(barGeo,nMat);
  left.position.set(-radius*.22,.04,-radius*1.06);
  right.position.set(radius*.22,.04,-radius*1.06);
  g.add(left,right);
  const diag=new THREE.Mesh(new THREE.BoxGeometry(radius*.09,.035,radius*.62),nMat);
  diag.position.set(0,.041,-radius*1.06);
  diag.rotation.y=-Math.atan2(radius*.44,radius*.50);
  g.add(diag);

  return g
}

function rebuildMetricGrid(sc,group){
  const b=modelBounds(group);if(!b)return;
  const gridSize=niceGridSize(b.maxPlan);

  if(sc.userData.metricGrid)sc.remove(sc.userData.metricGrid);
  if(sc.userData.ground)sc.remove(sc.userData.ground);
  if(sc.userData.northArrow){sc.remove(sc.userData.northArrow);sc.userData.northArrow=null}

  // 1 división = 1 metro.
  const divisions=Math.max(10,Math.round(gridSize));
  const grid=new THREE.GridHelper(gridSize,divisions,0x83979e,0xcbd6d9);
  grid.position.y=.002;
  grid.material.transparent=true;
  grid.material.opacity=.72;
  sc.add(grid);
  sc.userData.metricGrid=grid;

  const groundSize=gridSize*1.35;
  const ground=new THREE.Mesh(
    new THREE.PlaneGeometry(groundSize,groundSize),
    new THREE.MeshStandardMaterial({color:0xdde4e5,roughness:1})
  );
  ground.rotation.x=-Math.PI/2;
  ground.position.y=-.006;
  ground.receiveShadow=true;
  sc.add(ground);
  sc.userData.ground=ground;

  // Segundo Norte: grande, físico y unido a la cuadrícula.
  // Se coloca fuera de la envolvente del conjunto para reducir la posibilidad
  // de que un bloque lo tape, pero sigue desplazándose/rotando con la vista 3D.
  const marker=makeGroundNorthMarker(gridSize);
  const corner=gridSize*.39;
  marker.position.set(-corner,.01,corner);
  sc.add(marker);
  sc.userData.northArrow=marker;

  sc.userData.gridSize=gridSize;
  updateNorthHUD()
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
function updateScaleHUD(){const b=buildingGroup?modelBounds(buildingGroup):null;if(!b)return;const ext=currentPlanExtent(),closed=S.blocks.filter(x=>x.closed),heights=closed.map(x=>Number(x.height||2.4).toFixed(1).replace('.',',')).join(' / '),state=hasMetricCalibration()?'ESCALA CALIBRADA':'ESCALA APROXIMADA';const text=`Cuadrícula: 1 m · bloques: ${closed.length} · alturas: ${heights||'—'} m · conjunto: ${ext?ext.width.toFixed(1).replace('.',',')+' × '+ext.depth.toFixed(1).replace('.',',')+' m':'—'} · ${state}`;if($('scale-3d-hud'))$('scale-3d-hud').textContent=text;if($('scale-solar-hud'))$('scale-solar-hud').textContent=text;updateCalibrationWarning()}
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
function initScenes(){let a=init3D('three-stage');scene=a.sc;camera=a.cam;renderer=a.ren;controls=a.ctl;let b=init3D('three-solar',true);solarScene=b.sc;solarCamera=b.cam;solarRenderer=b.ren;solarControls=b.ctl;sunLight=new THREE.DirectionalLight(0xfff1c1,3.8);sunLight.castShadow=true;sunLight.shadow.mapSize.set(2048,2048);sunLight.shadow.camera.left=-35;sunLight.shadow.camera.right=35;sunLight.shadow.camera.top=35;sunLight.shadow.camera.bottom=-35;sunLight.shadow.bias=-.0004;solarScene.add(sunLight);solarScene.add(sunLight.target);sunOrb=new THREE.Mesh(new THREE.SphereGeometry(.55,24,16),new THREE.MeshBasicMaterial({color:0xf4b51b}));solarScene.add(sunOrb);bindPicking(renderer,camera,()=>buildingGroup);bindPicking(solarRenderer,solarCamera,()=>solarBuilding);animate()}
function polygonSignedArea(p){let a=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];a+=p[i].x*q.z-q.x*p[i].z}return a/2}
function orientationName(az){const names=['N','NE','E','SE','S','SO','O','NO'];return names[Math.round(((az%360)+360)%360/45)%8]}
function totalRotationRad(block=activeBlock()){return rad((S.northAngle+Number(block?.az||0))%360)}
function rotateXZ(v,angle,cx=0,cz=0){const c=Math.cos(angle),sn=Math.sin(angle),x=v.x-cx,z=v.z-cz;return{x:cx+c*x+sn*z,z:cz-sn*x+c*z}}
function worldPolygon(block){const base=polygonData(block);if(!base)return null;const cx=base.reduce((a,p)=>a+p.x,0)/base.length,cz=base.reduce((a,p)=>a+p.z,0)/base.length,extra=rad(Number(block.az||0)),north=rad(S.northAngle||0);return base.map(p=>rotateXZ(rotateXZ(p,extra,cx,cz),north,0,0))}
function facadeDescriptors(block=activeBlock(),bi=S.activeBlock){const p=worldPolygon(block);if(!p)return[];const sign=polygonSignedArea(p)>=0?1:-1,h=Number(block.height||2.4);return p.map((a,i)=>{const b=p[(i+1)%p.length],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1,nWorld=sign>0?new THREE.Vector3(dz/len,0,-dx/len):new THREE.Vector3(-dz/len,0,dx/len),center=new THREE.Vector3((a.x+b.x)/2,h*.52,(a.z+b.z)/2),az=(deg(Math.atan2(nWorld.x,-nWorld.z))+360)%360;return{index:i,blockIndex:bi,blockCode:blockCode(bi),blockName:block.name,a,b,len,nLocal:nWorld.clone(),nWorld,center,az,orientation:orientationName(az),height:h,id:`${blockCode(bi)}-F${i+1}`}})}
function allFacadeDescriptors(){return S.blocks.flatMap((b,i)=>b.closed?facadeDescriptors(b,i):[])}
function planeFacadeGeometry(a,b,h,n){
  const off=.012,ax=a.x+n.x*off,az=a.z+n.z*off,bx=b.x+n.x*off,bz=b.z+n.z*off;
  const v=new Float32Array([ax,0,az,bx,0,bz,bx,h,bz, ax,0,az,bx,h,bz,ax,h,az]);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(v,3));g.computeVertexNormals();return g
}
function makeBuildingBlock(block,bi){const pts=worldPolygon(block);if(!pts)return null;const h=Number(block.height||2.4),shape=new THREE.Shape();shape.moveTo(pts[0].x,-pts[0].z);for(let i=1;i<pts.length;i++)shape.lineTo(pts[i].x,-pts[i].z);shape.closePath();const geo=new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false});geo.rotateX(-Math.PI/2);const palette=[0xe7ecec,0xf7edf2,0xf0f7e8,0xf7f2df,0xeeeafd,0xf7eee6],mat=new THREE.MeshStandardMaterial({color:palette[bi%palette.length],roughness:.78,metalness:0,side:THREE.DoubleSide}),body=new THREE.Mesh(geo,mat);body.castShadow=true;body.receiveShadow=true;body.userData={role:'body',blockIndex:bi};const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:0x344b55})),g=new THREE.Group();g.add(body,edges);g.userData={body,pickables:[],facades:[],vertices:[],covers:[],blockIndex:bi};const rg=roofGeometry(block,bi);if(rg){const roof=new THREE.Mesh(rg,new THREE.MeshBasicMaterial({color:0xf0b523,transparent:true,opacity:.04,side:THREE.DoubleSide,depthWrite:false}));roof.userData={type:'cover',index:0,blockIndex:bi};g.add(roof);g.userData.covers.push(roof);g.userData.pickables.push(roof)}facadeDescriptors(block,bi).forEach(f=>{const wall=new THREE.Mesh(planeFacadeGeometry(f.a,f.b,h,f.nWorld),new THREE.MeshBasicMaterial({color:0x86b817,transparent:true,opacity:.025,side:THREE.DoubleSide,depthWrite:false}));wall.userData={type:'facade',index:f.index,blockIndex:bi};g.add(wall);g.userData.facades.push(wall);g.userData.pickables.push(wall)});const bb=new THREE.Box3().setFromObject(body),size=new THREE.Vector3();bb.getSize(size);const vr=Math.max(.07,Math.min(.18,Math.max(size.x,size.z)/55));pts.forEach((pt,i)=>{const vm=new THREE.Mesh(new THREE.SphereGeometry(vr,14,10),new THREE.MeshBasicMaterial({color:0x334d58,transparent:true,opacity:.55}));vm.position.set(pt.x,.10,pt.z);vm.userData={type:'vertex',index:i,blockIndex:bi};g.add(vm);g.userData.vertices.push(vm);g.userData.pickables.push(vm)});return g}
function makeBuilding(){const root=new THREE.Group();root.userData={blocks:[],pickables:[],facades:[],vertices:[],covers:[],bodies:[]};S.blocks.forEach((b,bi)=>{if(!b.closed||b.pts.length<3)return;const g=makeBuildingBlock(b,bi);if(!g)return;root.add(g);root.userData.blocks.push(g);root.userData.pickables.push(...g.userData.pickables);root.userData.facades.push(...g.userData.facades);root.userData.vertices.push(...g.userData.vertices);root.userData.covers.push(...g.userData.covers);root.userData.bodies.push(g.userData.body)});return root.userData.blocks.length?root:null}
function rebuild3D(){[[scene,'buildingGroup'],[solarScene,'solarBuilding']].forEach(([sc,key])=>{const old=key==='buildingGroup'?buildingGroup:solarBuilding;if(old)sc.remove(old);const n=makeBuilding();if(n)sc.add(n);if(key==='buildingGroup')buildingGroup=n;else solarBuilding=n;if(n){rebuildMetricGrid(sc,n);addHumanScaleReference(sc)}});if(buildingGroup&&autoFit3D){fitCameraToModel(camera,controls,buildingGroup,'iso');fitCameraToModel(solarCamera,solarControls,solarBuilding,'iso');autoFit3D=false}updateScaleHUD();refresh3DSelection();updateMetrics();updateSolar();updateSunPath();updateDailySunDashboard();updateAllFacadeLabels()}
function ensureFacadeLabel(layerId,key,f){
  const layer=$(layerId);if(!layer)return null;
  let el=layer.querySelector(`[data-facelabel="${key}"]`);
  if(!el){
    el=document.createElement('div');
    el.className='facade-label-3d';
    el.dataset.facelabel=key;
    layer.appendChild(el)
  }
  el.dataset.blockIndex=String(f.blockIndex);
  el.dataset.faceIndex=String(f.index);
  el.innerHTML=`${f.id}<small>${f.orientation} · ${f.az.toFixed(0)}°</small>`;
  el.classList.toggle('active',SEL.type==='facade'&&SEL.index===f.index&&SEL.blockIndex===f.blockIndex);
  el.onclick=e=>{
    e.preventDefault();e.stopPropagation();
    select3DObject('facade',f.index,f.blockIndex)
  };
  return el
}
function updateFacadeLabelsFor(renderer,camera,group,layerId){const layer=$(layerId);if(!layer)return;const fs=allFacadeDescriptors();if(!group||!fs.length){layer.innerHTML='';return}const rect=renderer.domElement.getBoundingClientRect();camera.updateMatrixWorld(true);const keys=new Set();fs.forEach(f=>{const key=`${f.blockIndex}-${f.index}`;keys.add(key);const el=ensureFacadeLabel(layerId,key,f),pr=f.center.clone().add(f.nWorld.clone().multiplyScalar(.06)).project(camera),x=(pr.x*.5+.5)*rect.width,y=(-pr.y*.5+.5)*rect.height;el.style.left=`${x}px`;el.style.top=`${y}px`;el.classList.toggle('hidden',pr.z<-1||pr.z>1||x<-20||y<-20||x>rect.width+20||y>rect.height+20);el.classList.toggle('active',SEL.type==='facade'&&SEL.index===f.index&&SEL.blockIndex===f.blockIndex)});[...layer.querySelectorAll('[data-facelabel]')].forEach(el=>{if(!keys.has(el.dataset.facelabel))el.remove()})}
function updateCoverLabelFor(renderer,camera,group,layerId){
  const layer=$(layerId);if(!layer)return;
  const roofs=roofDescriptors(),rect=renderer.domElement.getBoundingClientRect(),keys=new Set();
  roofs.forEach(r=>{
    const key=String(r.blockIndex);keys.add(key);
    let el=layer.querySelector(`[data-coverlabel="${key}"]`);
    if(!el){
      el=document.createElement('div');
      el.className='facade-label-3d';
      el.dataset.coverlabel=key;
      layer.appendChild(el)
    }
    el.innerHTML=`${r.id}<small>Cubierta</small>`;
    el.classList.toggle('active',SEL.type==='cover'&&SEL.blockIndex===r.blockIndex);
    el.onclick=e=>{
      e.preventDefault();e.stopPropagation();
      select3DObject('cover',0,r.blockIndex)
    };
    const pr=r.center.clone().project(camera),
      x=(pr.x*.5+.5)*rect.width,y=(-pr.y*.5+.5)*rect.height;
    el.style.left=`${x}px`;el.style.top=`${y}px`;
    el.classList.toggle('hidden',pr.z<-1||pr.z>1||x<-20||y<-20||x>rect.width+20||y>rect.height+20)
  });
  [...layer.querySelectorAll('[data-coverlabel]')].forEach(el=>{
    if(!keys.has(el.dataset.coverlabel))el.remove()
  })
}
function updateAllFacadeLabels(){
  if(renderer&&camera){updateFacadeLabelsFor(renderer,camera,buildingGroup,'labels-3d');updateCoverLabelFor(renderer,camera,buildingGroup,'labels-3d')};
  if(solarRenderer&&solarCamera){updateFacadeLabelsFor(solarRenderer,solarCamera,solarBuilding,'labels-solar');updateCoverLabelFor(solarRenderer,solarCamera,solarBuilding,'labels-solar')};
}


function pointSegmentDistanceXZ(p,a,b){
  const vx=b.x-a.x,vz=b.z-a.z,wx=p.x-a.x,wz=p.z-a.z;
  const vv=vx*vx+vz*vz;
  const t=vv>0?Math.max(0,Math.min(1,(wx*vx+wz*vz)/vv)):0;
  const x=a.x+t*vx,z=a.z+t*vz;
  return Math.hypot(p.x-x,p.z-z)
}
function resolveBodySurfaceHit(hit){
  const bi=Number(hit?.object?.userData?.blockIndex);
  const block=S.blocks[bi];
  if(!block||!hit?.point)return null;
  const h=Number(block.height||2.4);

  // La cara superior se interpreta como cubierta.
  if(hit.point.y>=h-Math.max(.04,h*.025)){
    return{type:'cover',index:0,blockIndex:bi}
  }

  // En muros, buscamos el segmento de fachada más cercano al punto real del raycast.
  const faces=facadeDescriptors(block,bi);
  if(!faces.length)return null;
  let best=faces[0],bestD=Infinity;
  faces.forEach(f=>{
    const d=pointSegmentDistanceXZ(hit.point,f.a,f.b);
    if(d<bestD){bestD=d;best=f}
  });
  return{type:'facade',index:best.index,blockIndex:bi}
}

function bindPicking(ren,cam,getGroup){
  const rc=new THREE.Raycaster(),mouse=new THREE.Vector2();let down=null;
  ren.domElement.addEventListener('pointerdown',e=>{
    if(e.button===0)down={x:e.clientX,y:e.clientY}
  });
  ren.domElement.addEventListener('pointerup',e=>{
    if(!down)return;
    const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y);down=null;
    // Un pequeño movimiento involuntario sigue siendo un clic; un giro real de cámara no.
    if(moved>9)return;

    const r=ren.domElement.getBoundingClientRect();
    mouse.x=((e.clientX-r.left)/r.width)*2-1;
    mouse.y=-((e.clientY-r.top)/r.height)*2+1;
    rc.setFromCamera(mouse,cam);

    const g=getGroup();
    if(!g?.userData)return;
    const targets=[
      ...(g.userData.pickables||[]),
      ...(g.userData.bodies||[])
    ];
    if(!targets.length)return;

    const hits=rc.intersectObjects(targets,false);
    if(!hits.length)return;

    // Prioridad 1: vértice explícito.
    const vh=hits.find(h=>h.object.userData.type==='vertex');
    if(vh){
      const u=vh.object.userData;
      select3DObject('vertex',u.index,u.blockIndex);return
    }

    // Prioridad 2: planos explícitos de fachada/cubierta.
    const explicit=hits.find(h=>h.object.userData.type==='facade'||h.object.userData.type==='cover');
    if(explicit){
      const u=explicit.object.userData;
      select3DObject(u.type,u.index,u.blockIndex);return
    }

    // Prioridad 3: cuerpo sólido. Esto hace seleccionable toda la cara visible,
    // aunque el plano transparente de picking no haya sido interceptado.
    const bodyHit=hits.find(h=>h.object.userData.role==='body');
    const resolved=resolveBodySurfaceHit(bodyHit);
    if(resolved)select3DObject(resolved.type,resolved.index,resolved.blockIndex)
  })
}
function select3DObject(type,index,blockIndex=0){
  // Primero activamos el bloque SIN borrar la selección que estamos creando.
  setActiveBlock(blockIndex,false,true);
  SEL.type=type;
  SEL.index=index;
  SEL.blockIndex=blockIndex;

  refresh3DSelection();
  renderSelectionInspector();
  updateSelectedSunPanel();
  updateAllFacadeLabels();

  // Mantiene la tarjeta inferior sincronizada incluso si el análisis diario
  // todavía no se había renderizado después de modificar la geometría.
  if((type==='facade'||type==='cover') && !lastSunResults){
    updateDailySunDashboard()
  }
}
function refresh3DSelection(){
  [buildingGroup,solarBuilding].forEach(g=>{
    if(!g?.userData)return;

    (g.userData.facades||[]).forEach(m=>{
      const u=m.userData;
      const on=SEL.type==='facade'&&SEL.index===u.index&&SEL.blockIndex===u.blockIndex;
      m.material.opacity=on?.58:.025;
      m.material.color.set(on?0xff2f8a:0x86b817);
      m.material.depthTest=!on;
      m.renderOrder=on?30:2
    });

    (g.userData.vertices||[]).forEach(m=>{
      const u=m.userData;
      const on=SEL.type==='vertex'&&SEL.index===u.index&&SEL.blockIndex===u.blockIndex;
      m.material.opacity=on?1:.55;
      m.material.color.set(on?0xf0a500:0x334d58);
      m.scale.setScalar(on?1.45:1);
      m.renderOrder=on?31:3
    });

    (g.userData.covers||[]).forEach(m=>{
      const u=m.userData;
      const on=SEL.type==='cover'&&SEL.blockIndex===u.blockIndex;
      m.material.opacity=on?.48:.04;
      m.material.color.set(on?0xffd51f:0xf0b523);
      m.material.depthTest=!on;
      m.renderOrder=on?29:1
    })
  })
}
function renderSelectionInspector(){const bi=SEL.blockIndex??S.activeBlock,b=S.blocks[bi];if(!b)return;if(SEL.type==='cover'){const r=(lastRoofResults||[]).find(x=>x.blockIndex===bi)||computeRoofDaily(b,bi),mins=+$('time').value,sun=solarPosition(currentDateAtMinutes(mins),+$('lat').value,+$('lon').value,+$('tz').value);$('selection-panel').innerHTML=`<h3>${r.id} · ${b.name}</h3><div class="facade-inspector"><div class="facade-title">Cubierta horizontal · altura ${Number(b.height).toFixed(2)} m</div><div class="facade-grid"><div><span>Sol diario</span><strong>${formatHours(r.minutes)}</strong></div><div><span>Día solar</span><strong>${daylightMinutes()?Math.round(r.minutes/daylightMinutes()*100):0}%</strong></div><div><span>Captación geométrica</span><strong>${r.geomEquivalentHours.toFixed(1).replace('.',',')} h-eq</strong></div><div><span>Estado actual</span><strong>${isRoofSunlit(roofDescriptor(b,bi),sun)?'SOL DIRECTO':'SIN SOL'}</strong></div></div></div>`;return}if(SEL.type==='vertex'){const pt=worldPolygon(b)?.[SEL.index];if(!pt)return;$('selection-panel').innerHTML=`<h3>${blockCode(bi)} · VÉRTICE V${SEL.index+1}</h3><div class="vertex3d-info"><strong>${b.name}</strong><br>X: ${pt.x.toFixed(2)} m<br>Y: ${pt.z.toFixed(2)} m<br><br>En PLANTA mantén presionado el punto y arrástralo.</div>`;return}if(SEL.type==='facade'){const f=facadeDescriptors(b,bi)[SEL.index];if(!f)return;const rec=(lastSunResults||[]).find(x=>x.blockIndex===bi&&x.index===SEL.index),cur=currentFacadeSunState(f);$('selection-panel').innerHTML=`<h3>${f.id} · ${b.name}</h3><div class="facade-inspector"><div class="facade-title">${f.orientation} · ${f.az.toFixed(1)}° · altura ${f.height.toFixed(2)} m</div><div class="facade-grid"><div><span>Longitud</span><strong>${f.len.toFixed(2)} m</strong></div><div><span>Azimut</span><strong>${f.az.toFixed(1)}°</strong></div><div><span>Sol diario</span><strong>${rec?formatHours(rec.minutes):'—'}</strong></div><div><span>Bloque</span><strong>${blockCode(bi)}</strong></div></div><div class="facade-state ${cur?'on':'off'}">${cur?'SOL DIRECTO AHORA':'SIN SOL DIRECTO AHORA'}</div></div>`}}
function resize3D(){[['three-stage',camera,renderer],['three-solar',solarCamera,solarRenderer]].forEach(([id,cam,ren])=>{if(!ren)return;const r=$(id).getBoundingClientRect();if(r.width&&r.height){ren.setSize(r.width,r.height,false);cam.aspect=r.width/r.height;cam.updateProjectionMatrix()}})}
function animate(){updateAllFacadeLabels();requestAnimationFrame(animate);controls?.update();solarControls?.update();renderer?.render(scene,camera);solarRenderer?.render(solarScene,solarCamera)}
function rad(x){return x*Math.PI/180}function deg(x){return x*180/Math.PI}function clamp(x,a,b){return Math.max(a,Math.min(b,x))}
function solarPosition(date,lat,lon,tz){const start=new Date(date.getFullYear(),0,0),doy=Math.floor((date-start)/86400000),mins=date.getHours()*60+date.getMinutes(),g=2*Math.PI/365*(doy-1+(mins/60-12)/24),eq=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g)),dec=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g),tst=(mins+eq+4*lon-60*tz)%1440,ha=rad(tst/4-180),phi=rad(lat),cosz=Math.sin(phi)*Math.sin(dec)+Math.cos(phi)*Math.cos(dec)*Math.cos(ha),zen=Math.acos(clamp(cosz,-1,1)),alt=90-deg(zen),az=(deg(Math.atan2(Math.sin(ha),Math.cos(ha)*Math.sin(phi)-Math.tan(dec)*Math.cos(phi)))+180+360)%360;return{alt,az}}
function parseCoords(s){if(!s)return null;let m=s.match(/(\d+)°\s*(\d+)'\s*([\d.]+)"?\s*([NS]).*?(\d+)°\s*(\d+)'\s*([\d.]+)"?\s*([EWO])/i);if(m){let la=+m[1]+ +m[2]/60+ +m[3]/3600,lo=+m[5]+ +m[6]/60+ +m[7]/3600;if(m[4].toUpperCase()==='S')la=-la;if(/[WO]/i.test(m[8]))lo=-lo;return[la,lo]}m=s.match(/(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/);return m?[+m[1],+m[2]]:null}
let lastSunResults=null,lastRoofResult=null,lastRoofResults=[];

function roofDescriptor(block=activeBlock(),bi=S.activeBlock){const p=worldPolygon(block);if(!p||p.length<3)return null;const h=Number(block.height||2.4);let cx=0,cz=0;p.forEach(v=>{cx+=v.x;cz+=v.z});cx/=p.length;cz/=p.length;return{id:`${blockCode(bi)}-C1`,type:'cover',index:0,blockIndex:bi,blockName:block.name,orientation:'Horizontal',az:0,center:new THREE.Vector3(cx,h+.03,cz),normal:new THREE.Vector3(0,1,0),height:h}}
function roofDescriptors(){return S.blocks.flatMap((b,i)=>b.closed?[roofDescriptor(b,i)].filter(Boolean):[])}
function roofGeometry(block=activeBlock(),bi=S.activeBlock){const p=worldPolygon(block);if(!p||p.length<3)return null;const shape=new THREE.Shape();shape.moveTo(p[0].x,-p[0].z);for(let i=1;i<p.length;i++)shape.lineTo(p[i].x,-p[i].z);shape.closePath();const g=new THREE.ShapeGeometry(shape);g.rotateX(-Math.PI/2);g.translate(0,Number(block.height||2.4)+.018,0);return g}
function isRoofSunlit(desc,sun){if(!desc||sun.alt<=0)return false;if(!solarBuilding?.userData?.bodies?.length)return true;const dir=sunVector(sun),origin=desc.center.clone().add(new THREE.Vector3(0,.05,0)),ray=new THREE.Raycaster(origin,dir,.02,250),hits=ray.intersectObjects(solarBuilding.userData.bodies,false).filter(h=>h.object.userData.blockIndex!==desc.blockIndex);return hits.length===0}
function roofSunStateAt(sun){return sun.alt>0}
function computeRoofDaily(block=activeBlock(),bi=S.activeBlock){const desc=roofDescriptor(block,bi);if(!desc)return null;const step=5,base=$('date').value,lat=+$('lat').value,lon=+$('lon').value,tz=+$('tz').value;let minutes=0,first=null,last=null,flags=[],geom=0;for(let m=0;m<1440;m+=step){const d=new Date(base+'T00:00:00');d.setHours(Math.floor(m/60),m%60);const sun=solarPosition(d,lat,lon,tz),on=isRoofSunlit(desc,sun);flags.push(on);if(on){minutes+=step;if(first==null)first=m;last=m+step;geom+=Math.max(0,Math.sin(rad(sun.alt)))*step/60}}return{...desc,sunMinutes:minutes,minutes,first,last,segments:contiguousSegments(flags,step),geomEquivalentHours:geom}}
function computeAllRoofDaily(){return S.blocks.flatMap((b,i)=>b.closed?[computeRoofDaily(b,i)].filter(Boolean):[])}
function sunVector(sun){const alt=rad(sun.alt),az=rad(sun.az);return new THREE.Vector3(Math.cos(alt)*Math.sin(az),Math.sin(alt),-Math.cos(alt)*Math.cos(az)).normalize()}
function currentDateAtMinutes(mins){const date=new Date($('date').value+'T00:00:00');date.setHours(Math.floor(mins/60),mins%60);return date}
function currentFacadeSunState(f){
  const mins=+$('time').value,sun=solarPosition(currentDateAtMinutes(mins),+$('lat').value,+$('lon').value,+$('tz').value);
  return isFacadeSunlit(f,sun,true)
}
function isFacadeSunlit(f,sun,occlusion=true){if(sun.alt<=0)return false;const dir=sunVector(sun);if(f.nWorld.dot(dir)<=.002)return false;if(!occlusion||!solarBuilding?.userData?.bodies?.length)return true;const origin=f.center.clone().add(f.nWorld.clone().multiplyScalar(.06)),ray=new THREE.Raycaster(origin,dir,.02,250),hits=ray.intersectObjects(solarBuilding.userData.bodies,false);return hits.length===0}
function formatClock(mins){if(mins==null)return'—';const h=Math.floor(mins/60)%24,m=mins%60;return`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`}
function formatHours(mins){return`${(mins/60).toFixed(1).replace('.',',')} h`}
function contiguousSegments(flags,step){
  const seg=[];let start=null;
  for(let i=0;i<flags.length;i++){if(flags[i]&&start==null)start=i*step;if((!flags[i]||i===flags.length-1)&&start!=null){const end=(flags[i]&&i===flags.length-1)?(i+1)*step:i*step;seg.push([start,end]);start=null}}
  return seg
}
function computeDailySunHours(){const fs=allFacadeDescriptors();if(!fs.length)return[];const step=5,lat=+$('lat').value,lon=+$('lon').value,tz=+$('tz').value,base=$('date').value;return fs.map(f=>{let minutes=0,first=null,last=null,flags=[];for(let m=0;m<1440;m+=step){const d=new Date(base+'T00:00:00');d.setHours(Math.floor(m/60),m%60);const sun=solarPosition(d,lat,lon,tz),on=isFacadeSunlit(f,sun,true);flags.push(on);if(on){minutes+=step;if(first==null)first=m;last=m+step}}return{index:f.index,blockIndex:f.blockIndex,blockCode:f.blockCode,blockName:f.blockName,id:f.id,minutes,first,last,segments:contiguousSegments(flags,step),az:f.az,orientation:f.orientation,len:f.len,height:f.height}})}
function daylightMinutes(){
  let n=0,step=5;for(let m=0;m<1440;m+=step){const s=solarPosition(currentDateAtMinutes(m),+$('lat').value,+$('lon').value,+$('tz').value);if(s.alt>0)n+=step}return n
}
function trackHTML(segments){
  return segments.map(([a,b])=>`<span class="sun-segment selfshade" style="left:${(a/1440*100).toFixed(3)}%;width:${((b-a)/1440*100).toFixed(3)}%"></span>`).join('')
}
function updateDailySunDashboard(){const grid=$('sun-hours-grid');if(!grid)return;const closed=S.blocks.filter(b=>b.closed&&b.pts.length>=3);if(!closed.length){lastSunResults=null;lastRoofResults=[];lastRoofResult=null;grid.innerHTML='<div class="sun-empty">Dibuja y cierra al menos un bloque para obtener el análisis diario del conjunto.</div>';$('daylight-out').textContent='—';updateSelectedSunPanel();return}lastSunResults=computeDailySunHours();lastRoofResults=computeAllRoofDaily();lastRoofResult=lastRoofResults[0]||null;$('daylight-out').textContent=formatHours(daylightMinutes());let out='';S.blocks.forEach((b,bi)=>{if(!b.closed)return;const code=blockCode(bi),color=BLOCK_COLORS[bi%BLOCK_COLORS.length],faces=lastSunResults.filter(r=>r.blockIndex===bi),roof=lastRoofResults.find(r=>r.blockIndex===bi);out+=`<div class="sun-block-heading" style="--block-color:${color}"><b>${code} · ${b.name}</b><span>altura ${Number(b.height||2.4).toFixed(1).replace('.',',')} m · ${faces.length} fachadas</span></div>`;out+=faces.map(r=>`<article class="facade-sun-card ${SEL.type==='facade'&&SEL.blockIndex===bi&&SEL.index===r.index?'active':''}" data-face-block="${bi}" data-face-index="${r.index}"><div class="facade-sun-head"><div><strong>${r.id} · ${r.orientation}</strong><span>${r.az.toFixed(1)}° · ${r.len.toFixed(2)} m <span class="block-badge">${code}</span></span></div><span class="sun-hours">${formatHours(r.minutes)}</span></div><div class="sun-track">${trackHTML(r.segments)}</div><div class="sun-range"><span>${formatClock(r.first)}</span><span>${formatClock(r.last)}</span></div></article>`).join('');if(roof)out+=`<article class="facade-sun-card ${SEL.type==='cover'&&SEL.blockIndex===bi?'active':''}" data-cover-block="${bi}"><div class="facade-sun-head"><div><strong>${roof.id} · Cubierta</strong><span>Horizontal</span></div><span class="sun-hours">${formatHours(roof.minutes)}</span></div><div class="sun-track">${trackHTML(roof.segments)}</div><div class="sun-range"><span>${formatClock(roof.first)}</span><span>${formatClock(roof.last)}</span></div><div class="coverage-note">Sombras entre bloques incluidas</div></article>`});grid.innerHTML=out;qsa('[data-face-block]').forEach(el=>el.onclick=()=>select3DObject('facade',+el.dataset.faceIndex,+el.dataset.faceBlock));qsa('[data-cover-block]').forEach(el=>el.onclick=()=>select3DObject('cover',0,+el.dataset.coverBlock));renderSelectionInspector();updateSelectedSunPanel()}
function updateSelectedSunPanel(){
  if(SEL.type==='cover'){
    const b=S.blocks[SEL.blockIndex];
    let r=(lastRoofResults||[]).find(x=>x.blockIndex===SEL.blockIndex);
    if(!r&&b?.closed)r=computeRoofDaily(b,SEL.blockIndex);
    if(r){
      $('selected-facade-name').textContent=`${r.id} · Cubierta`;
      $('selected-facade-detail').textContent=`${r.blockName||b?.name||''} · superficie horizontal superior · sombras producidas por los demás bloques incluidas.`;
      $('selected-az').textContent='Horizontal';
      $('selected-hours').textContent=formatHours(r.minutes);
      $('selected-first').textContent=formatClock(r.first);
      $('selected-last').textContent=formatClock(r.last);
      $('selected-track').innerHTML=trackHTML(r.segments);
      qsa('.facade-sun-card').forEach(c=>c.classList.remove('active'));
      document.querySelector(`[data-cover-block="${r.blockIndex}"]`)?.classList.add('active');
      return
    }
  }

  if(SEL.type!=='facade'){
    $('selected-facade-name').textContent='Ninguna';
    $('selected-facade-detail').textContent='Haz clic sobre una fachada del modelo 3D o del análisis solar.';
    ['selected-az','selected-hours','selected-first','selected-last'].forEach(id=>$(id).textContent='—');
    $('selected-track').innerHTML='';
    return
  }

  const b=S.blocks[SEL.blockIndex];
  const f=b?.closed?facadeDescriptors(b,SEL.blockIndex)[SEL.index]:null;
  let r=(lastSunResults||[]).find(x=>x.blockIndex===SEL.blockIndex&&x.index===SEL.index);

  // Si la geometría cambió, calcula sólo la fachada seleccionada para no dejar
  // el panel inferior vacío.
  if(!r&&f){
    const step=5,lat=+$('lat').value,lon=+$('lon').value,tz=+$('tz').value,base=$('date').value;
    let minutes=0,first=null,last=null,flags=[];
    for(let m=0;m<1440;m+=step){
      const d=new Date(base+'T00:00:00');d.setHours(Math.floor(m/60),m%60);
      const sun=solarPosition(d,lat,lon,tz),on=isFacadeSunlit(f,sun,true);
      flags.push(on);
      if(on){minutes+=step;if(first==null)first=m;last=m+step}
    }
    r={...f,minutes,first,last,segments:contiguousSegments(flags,step)}
  }
  if(!r)return;

  $('selected-facade-name').textContent=`${r.id} · ${r.orientation}`;
  $('selected-facade-detail').textContent=`${r.blockName||b?.name||''} · longitud ${r.len.toFixed(2)} m · altura ${r.height.toFixed(2)} m · análisis con autosombra y sombras del conjunto.`;
  $('selected-az').textContent=`${r.az.toFixed(1)}°`;
  $('selected-hours').textContent=formatHours(r.minutes);
  $('selected-first').textContent=formatClock(r.first);
  $('selected-last').textContent=formatClock(r.last);
  $('selected-track').innerHTML=trackHTML(r.segments);

  qsa('.facade-sun-card').forEach(c=>c.classList.remove('active'));
  document.querySelector(`[data-face-block="${r.blockIndex}"][data-face-index="${r.index}"]`)?.classList.add('active')
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
function setTool(t){S.tool=t;qsa('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===t));$('cad-hint').textContent={select:'Selecciona cualquier bloque. Mantén presionado un vértice y arrástralo para corregirlo.',wall:activeBlock().closed?`${activeBlock().name} está cerrado. Arrastra vértices o crea un Nuevo bloque.`:`Dibuja ${activeBlock().name}: clic crea punto; clic + arrastre lo crea y acomoda; clic cerca del primero cierra.`,measure:'Marca dos puntos cuya distancia real conozcas.',north:'Marca dos puntos formando una flecha hacia el Norte.'}[t]||''}
function initCommunes(){const data=window.HIGROLAB_COMMUNES||window.HIGROLAB_COMUNAS||window.COMUNAS_CHILE||[];const reg=$('region-select'),com=$('commune-select');if(Array.isArray(data)&&data.length){const regs=[...new Set(data.map(x=>x.region||x.region_name).filter(Boolean))];reg.innerHTML=regs.map(x=>`<option>${x}</option>`).join('');const fill=()=>{const items=data.filter(x=>(x.region||x.region_name)===reg.value);com.innerHTML=items.map((x,i)=>`<option value="${i}">${x.comuna||x.name}</option>`).join('');com.onchange=()=>{const x=items[+com.value];if(x){$('lat').value=x.lat||x.latitude||$('lat').value;$('lon').value=x.lon||x.lng||x.longitude||$('lon').value;updateSolar();updateSunPath();updateDailySunDashboard();updateGoogleMapReference()}};com.onchange()};reg.onchange=fill;fill()}else{reg.innerHTML='<option>Región Metropolitana</option>';com.innerHTML='<option>Coordenadas manuales</option>'}}


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



function syncPlanMapReference(){
  const img=$('google-plan-reference');
  if(!img)return;
  if(!S.mapRef){
    img.classList.remove('active');
    return;
  }
  img.classList.add('active');
  img.style.left=`${S.panX}px`;
  img.style.top=`${S.panY}px`;
  img.style.width=`${S.imgW*S.zoom}px`;
  img.style.height=`${S.imgH*S.zoom}px`;
}

function clearStaticMapPlanReference(showMessage=true){
  const img=$('google-plan-reference');
  S.mapRef=false;
  S.mapRefURL=null;
  if(img){
    img.removeAttribute('src');
    img.classList.remove('active');
    img.style.cssText='';
  }
  const clear=$('clear-static-map-plan');
  if(clear)clear.disabled=true;
  if(!S.img){
    S.imgW=0;S.imgH=0;
    fitImage();
  }else drawCAD();
  if(showMessage){
    const status=$('static-map-status');
    if(status)status.textContent='Referencia de Google retirada de la planta. La geometría, calibración y orientación se conservaron.';
  }
}

function loadStaticMapPlanReference(){
  const key=($('static-map-key')?.value||'').trim();
  const status=$('static-map-status');
  if(!key){
    if(status)status.textContent='Ingresa una Google Maps API key con Maps Static API habilitada.';
    $('static-map-key')?.focus();
    return;
  }

  const la=Number($('lat').value),lo=Number($('lon').value);
  if(!Number.isFinite(la)||!Number.isFinite(lo)||la<-90||la>90||lo<-180||lo>180){
    if(status)status.textContent='Las coordenadas del emplazamiento no son válidas.';
    return;
  }

  const zoom=Math.max(1,Math.min(21,Number($('static-map-zoom')?.value||18)));
  const type=$('static-map-type')?.value||'hybrid';
  const url='https://maps.googleapis.com/maps/api/staticmap?'+new URLSearchParams({
    center:`${la.toFixed(6)},${lo.toFixed(6)}`,
    zoom:String(zoom),
    size:'640x640',
    scale:'2',
    maptype:type,
    key:key
  }).toString();

  if($('remember-static-key')?.checked){
    try{localStorage.setItem('higrolab-google-static-key',key)}catch(_){}
  }else{
    try{localStorage.removeItem('higrolab-google-static-key')}catch(_){}
  }

  const img=$('google-plan-reference');
  if(!img)return;

  if(status)status.textContent='Cargando referencia satelital…';
  img.onload=()=>{
    // Static image remains outside the canvas to avoid contaminating PDF/canvas export.
    if(S.imgURL){try{URL.revokeObjectURL(S.imgURL)}catch(_){}}
    S.img=null;S.imgURL=null;
    S.mapRef=true;
    S.mapRefURL=url;
    S.imgW=640;S.imgH=640;
    updateImageControls();
    const clear=$('clear-static-map-plan');if(clear)clear.disabled=false;
    if(status)status.textContent='Referencia cargada en PLANTA. Ya puedes calibrar una distancia y trazar el perímetro encima.';
    fitImage();
  };
  img.onerror=()=>{
    S.mapRef=false;S.mapRefURL=null;
    img.classList.remove('active');
    if(status)status.textContent='Google no pudo entregar la imagen. Revisa la API key, la habilitación de Maps Static API y las restricciones del dominio.';
  };
  img.src=url;
}

function initStaticMapPlanReference(){
  try{
    const saved=localStorage.getItem('higrolab-google-static-key');
    if(saved&&$('static-map-key')){
      $('static-map-key').value=saved;
      if($('remember-static-key'))$('remember-static-key').checked=true;
    }
  }catch(_){}
  $('load-static-map-plan')?.addEventListener('click',loadStaticMapPlanReference);
  $('clear-static-map-plan')?.addEventListener('click',()=>clearStaticMapPlanReference(true));
}


function setMapCaptureStatus(message,type='info'){
  const el=$('map-capture-status');
  if(!el)return;
  el.textContent=message;
  el.dataset.state=type;
}

function clearCapturedMapReference(showMessage=true){
  const img=$('google-plan-reference');
  if(img){
    img.removeAttribute('src');
    img.classList.remove('active');
    img.style.cssText='';
  }
  S.mapRef=false;
  S.mapRefURL=null;
  if(!S.img){
    S.imgW=0;
    S.imgH=0;
    fitImage();
  }else{
    drawCAD();
  }
  const clear=$('clear-captured-map');
  if(clear)clear.disabled=true;
  if(showMessage){
    setMapCaptureStatus('Captura retirada de PLANTA. El perímetro, calibración y orientación se conservaron.','ok');
  }
}

function installCapturedMapDataURL(dataURL,width,height){
  const img=$('google-plan-reference');
  if(!img)return;

  if(S.imgURL){
    try{URL.revokeObjectURL(S.imgURL)}catch(_){}
  }

  S.img=null;
  S.imgURL=null;
  S.mapRef=true;
  S.mapRefURL=dataURL;
  S.imgW=width;
  S.imgH=height;

  img.onload=()=>{
    const clear=$('clear-captured-map');
    if(clear)clear.disabled=false;
    updateImageControls();
    fitImage();
    setReferenceMode('image');
    setMapCaptureStatus('Mapa capturado e insertado en PLANTA. Ya puedes calibrar una distancia y trazar encima.','ok');
  };
  img.onerror=()=>{
    S.mapRef=false;
    S.mapRefURL=null;
    setMapCaptureStatus('No fue posible insertar la captura en PLANTA. Intenta nuevamente.','error');
  };
  img.src=dataURL;
}

async function captureGoogleMapToPlan(){
  const frame=$('solar-google-map-frame');
  if(!frame){
    setMapCaptureStatus('No se encontró el recuadro de Google Maps.','error');
    return;
  }

  if(!navigator.mediaDevices||!navigator.mediaDevices.getDisplayMedia){
    setMapCaptureStatus('Este navegador no admite captura de pestaña. Prueba Chrome o Edge actualizados.','error');
    return;
  }

  const rect=frame.getBoundingClientRect();
  if(rect.width<40||rect.height<40){
    setMapCaptureStatus('El mapa debe estar visible en pantalla antes de capturarlo.','error');
    return;
  }

  // Keep capture source visible and on screen.
  frame.scrollIntoView({block:'center',behavior:'instant'});
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const captureRect=frame.getBoundingClientRect();

  setMapCaptureStatus('Selecciona “Esta pestaña” en el diálogo del navegador y pulsa Compartir…','working');

  let stream=null;
  try{
    stream=await navigator.mediaDevices.getDisplayMedia({
      video:{
        displaySurface:'browser',
        frameRate:{ideal:5,max:15}
      },
      audio:false,
      preferCurrentTab:true,
      selfBrowserSurface:'include',
      surfaceSwitching:'exclude',
      monitorTypeSurfaces:'exclude'
    });

    const track=stream.getVideoTracks()[0];
    const settings=track.getSettings?track.getSettings():{};
    if(settings.displaySurface && settings.displaySurface!=='browser'){
      throw new Error('Selecciona una pestaña del navegador, idealmente “Esta pestaña”.');
    }

    const video=document.createElement('video');
    video.muted=true;
    video.playsInline=true;
    video.srcObject=stream;

    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('La captura tardó demasiado en iniciar.')),5000);
      video.onloadedmetadata=()=>{
        clearTimeout(timer);
        video.play().then(resolve).catch(resolve);
      };
    });

    // Give the capture stream a moment to contain a stable frame.
    await new Promise(resolve=>setTimeout(resolve,260));

    const vw=video.videoWidth;
    const vh=video.videoHeight;
    if(!vw||!vh)throw new Error('No se recibió una imagen válida de la pestaña.');

    // When a browser tab is captured, its video is the page viewport.
    // Scale CSS viewport coordinates to capture pixels.
    const scaleX=vw/window.innerWidth;
    const scaleY=vh/window.innerHeight;

    let sx=Math.round(captureRect.left*scaleX);
    let sy=Math.round(captureRect.top*scaleY);
    let sw=Math.round(captureRect.width*scaleX);
    let sh=Math.round(captureRect.height*scaleY);

    sx=Math.max(0,Math.min(vw-1,sx));
    sy=Math.max(0,Math.min(vh-1,sy));
    sw=Math.max(1,Math.min(vw-sx,sw));
    sh=Math.max(1,Math.min(vh-sy,sh));

    if(sw<120||sh<120){
      throw new Error('El área capturada resultó demasiado pequeña. Mantén visible el mapa e intenta nuevamente.');
    }

    const crop=document.createElement('canvas');
    crop.width=sw;
    crop.height=sh;
    const cctx=crop.getContext('2d',{alpha:false});
    cctx.drawImage(video,sx,sy,sw,sh,0,0,sw,sh);

    const dataURL=crop.toDataURL('image/jpeg',0.92);
    installCapturedMapDataURL(dataURL,sw,sh);

  }catch(err){
    const msg=err&&err.name==='NotAllowedError'
      ? 'Captura cancelada. Pulsa nuevamente y selecciona “Esta pestaña”.'
      : (err?.message||'No se pudo capturar el mapa.');
    setMapCaptureStatus(msg,'error');
  }finally{
    if(stream){
      stream.getTracks().forEach(t=>t.stop());
    }
  }
}

function initMapCapture(){
  const capture=$('capture-google-map');
  const clear=$('clear-captured-map');

  if(capture){
    capture.addEventListener('click',captureGoogleMapToPlan);
  }
  if(clear){
    clear.addEventListener('click',()=>clearCapturedMapReference(true));
  }

  if(!navigator.mediaDevices||!navigator.mediaDevices.getDisplayMedia){
    if(capture){
      capture.disabled=true;
      capture.title='La captura de pestaña no está disponible en este navegador.';
    }
    setMapCaptureStatus('La captura directa requiere un navegador compatible con Screen Capture API (por ejemplo Chrome/Edge en HTTPS).','error');
  }
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
  $('cad-hint').textContent=S.blocks.some(b=>b.closed)?'Imagen eliminada. Los bloques, la calibración y la orientación se conservaron.':'Imagen eliminada. Puedes cargar otra referencia cuando quieras.';
}

function init(){$('status-pill').textContent='Módulo activo';initCommunes();applyLocationFromQuery();initReferenceModes();initStaticMapPlanReference();initMapCapture();const now=new Date();$('date').value=now.toISOString().slice(0,10);qsa('.tab').forEach(b=>b.onclick=()=>{qsa('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');qsa('.viewport').forEach(x=>x.classList.remove('active'));$(b.dataset.view+'-view').classList.add('active');setTimeout(()=>{resizeCanvas();resize3D()},20)});qsa('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));$('fit').onclick=fitImage;$('undo').onclick=()=>{const b=activeBlock();b.pts.pop();b.closed=false;updateMetrics();drawCAD();rebuild3D()};$('add-block').addEventListener('click',addBlock);$('delete-block').addEventListener('click',deleteActiveBlock);$('block-name').addEventListener('input',()=>{activeBlock().name=$('block-name').value.trim()||`Bloque ${blockCode(S.activeBlock)}`;renderBlockList();updateDailySunDashboard()});$('wall-height').addEventListener('input',()=>{activeBlock().height=Math.max(.2,+$('wall-height').value||2.4);autoFit3D=true;renderBlockList();rebuild3D()});$('building-az').addEventListener('input',()=>{activeBlock().az=+$('building-az').value||0;autoFit3D=true;renderBlockList();rebuild3D()});$('image-file').onchange=e=>{clearStaticMapPlanReference(false);clearCapturedMapReference(false);const f=e.target.files[0];if(!f)return;if(S.imgURL){try{URL.revokeObjectURL(S.imgURL)}catch(_){}}const url=URL.createObjectURL(f),img=new Image();img.onload=()=>{S.img=img;S.imgURL=url;S.imgW=img.naturalWidth;S.imgH=img.naturalHeight;S.blocks=[{id:'A',name:'Bloque A',pts:[],closed:false,height:2.4,az:0}];S.activeBlock=0;S.scale=null;S.calPts=[];autoFit3D=true;syncBlockEditor();updateImageControls();fitImage();updateMetrics()};img.onerror=()=>{try{URL.revokeObjectURL(url)}catch(_){};S.imgURL=null;updateImageControls()};img.src=url};$('clear-image').onclick=clearReferenceImage;updateImageControls();$('cal-distance').onchange=applyCalibration;$('coords').onchange=()=>{const p=parseCoords($('coords').value);if(p){$('lat').value=p[0].toFixed(6);$('lon').value=p[1].toFixed(6);updateSolar();updateSunPath();updateDailySunDashboard();updateGoogleMapReference()}};['lat','lon','date','tz'].forEach(id=>$(id).addEventListener('input',()=>{updateSolar();updateSunPath();updateDailySunDashboard()}));['lat','lon'].forEach(id=>$(id).addEventListener('change',updateGoogleMapReference));$('time').addEventListener('input',updateSolar);$('reset-project').onclick=()=>{autoFit3D=true;S.blocks=[{id:'A',name:'Bloque A',pts:[],closed:false,height:2.4,az:0}];S.activeBlock=0;S.scale=null;S.calPts=[];S.northPts=[];SEL.type=null;SEL.index=null;SEL.blockIndex=0;syncBlockEditor();updateMetrics();drawCAD();rebuild3D()};$('play').onclick=()=>{if(playTimer){clearInterval(playTimer);playTimer=null;$('play').textContent='▶'}else{playTimer=setInterval(()=>{let v=+$('time').value+10;if(v>1260)v=300;$('time').value=v;updateSolar()},120);$('play').textContent='❚❚'}};qsa('[data-cam]').forEach(b=>b.onclick=()=>{const v=b.dataset.cam||'iso';if(buildingGroup)fitCameraToModel(camera,controls,buildingGroup,v)});syncBlockEditor();renderBlockList();initScenes();resizeCanvas();fitImage();rebuild3D();updateSolar();updateSunPath();updateDailySunDashboard();updateNorthHUD();window.addEventListener('resize',()=>{resizeCanvas();resize3D()})}
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
  const polys=S.blocks.map((block,bi)=>({block,bi,p:worldPolygon(block)})).filter(x=>x.p?.length);if(!polys.length)return'';
  const all=polys.flatMap(x=>x.p),minX=Math.min(...all.map(v=>v.x)),maxX=Math.max(...all.map(v=>v.x)),minZ=Math.min(...all.map(v=>v.z)),maxZ=Math.max(...all.map(v=>v.z));
  const W=760,H=480,pad=70,spanX=Math.max(.1,maxX-minX),spanZ=Math.max(.1,maxZ-minZ),sc=Math.min((W-2*pad)/spanX,(H-2*pad)/spanZ),cx=(minX+maxX)/2,cz=(minZ+maxZ)/2,xy=v=>({x:W/2+(v.x-cx)*sc,y:H/2+(v.z-cz)*sc});
  let shapes='',labels='',covers='';polys.forEach(({block,bi,p})=>{const color=BLOCK_COLORS[bi%BLOCK_COLORS.length],path=p.map((v,i)=>`${i?'L':'M'} ${xy(v).x.toFixed(1)} ${xy(v).y.toFixed(1)}`).join(' ')+' Z';shapes+=`<path d="${path}" fill="#e8eeee" stroke="${color}" stroke-width="3"/>`;facadeDescriptors(block,bi).forEach(f=>{const q=xy({x:(f.a.x+f.b.x)/2,z:(f.a.z+f.b.z)/2});labels+=`<g><circle cx="${q.x}" cy="${q.y}" r="18" fill="#0b3f52"/><text x="${q.x}" y="${q.y+4}" text-anchor="middle" font-family="Arial" font-size="10" font-weight="700" fill="white">${f.id}</text></g>`});const roof=roofDescriptor(block,bi);if(roof){const q=xy({x:roof.center.x,z:roof.center.z});covers+=`<g><rect x="${q.x-27}" y="${q.y-13}" width="54" height="26" rx="6" fill="#f0b523"/><text x="${q.x}" y="${q.y+5}" text-anchor="middle" font-family="Arial" font-size="11" font-weight="700" fill="#173039">${roof.id}</text></g>`}});
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#f5f8f8"/>${shapes}${labels}${covers}<g transform="translate(${W-72},82)"><line x1="0" y1="35" x2="0" y2="-25" stroke="#cf4b43" stroke-width="4"/><polygon points="0,-40 -9,-21 9,-21" fill="#cf4b43"/><text x="0" y="57" text-anchor="middle" font-family="Arial" font-size="14" font-weight="700" fill="#cf4b43">N</text></g><text x="${pad}" y="${H-18}" font-family="Arial" font-size="9" fill="#60747d">Conjunto multibloque derivado directamente del Modelo 3D.</text></svg>`;return'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)
}

function solarReportPayload(){updateSolar();updateDailySunDashboard();renderer?.render(scene,camera);solarRenderer?.render(solarScene,solarCamera);drawCAD();const recs=lastSunResults||computeDailySunHours(),roofs=lastRoofResults?.length?lastRoofResults:computeAllRoofDaily(),mins=+$('time').value,solarNow=solarPosition(currentDateAtMinutes(mins),+$('lat').value,+$('lon').value,+$('tz').value),location=communeLabel(),blocks=S.blocks.map((b,bi)=>{const m=areaPerim(b),faces=recs.filter(r=>r.blockIndex===bi),cover=roofs.find(r=>r.blockIndex===bi);return{id:blockCode(bi),name:b.name,height:Number(b.height||2.4),additionalAzimuth:Number(b.az||0),closed:b.closed,area:m.a,perimeter:m.l,vertices:(worldPolygon(b)||[]).map((v,i)=>({id:`${blockCode(bi)}-V${i+1}`,x:v.x,z:v.z})),facades:faces.map(r=>({id:r.id,orientation:r.orientation,azimuth:r.az,length:r.len,height:r.height,sunMinutes:r.minutes,sunHours:r.minutes/60,first:r.first,last:r.last,segments:r.segments})),cover:cover?{id:cover.id,orientation:'Horizontal',sunMinutes:cover.minutes,sunHours:cover.minutes/60,first:cover.first,last:cover.last,segments:cover.segments,geomEquivalentHours:cover.geomEquivalentHours}:null}}).filter(b=>b.closed);return{version:'V8.10.0',analyzedDate:$('date').value,analyzedDateLabel:(()=>{try{return new Date($('date').value+'T12:00:00').toLocaleDateString('es-CL',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}catch(_){return $('date').value}})(),location,latitude:+$('lat').value,longitude:+$('lon').value,timezone:+$('tz').value,selectedTime:formatClock(mins),solarAzimuth:solarNow.az,solarElevation:solarNow.alt,daylightMinutes:daylightMinutes(),wallHeight:blocks.length===1?blocks[0].height:null,additionalAzimuth:blocks.length===1?blocks[0].additionalAzimuth:null,northAngle:S.northAngle||0,calibrated:hasMetricCalibration(),scale:S.scale||null,areaText:$('area-out')?.textContent||'—',perimeterText:$('perim-out')?.textContent||'—',facadeCount:recs.length,blockCount:blocks.length,blocks,vertices:blocks.flatMap(b=>b.vertices),covers:blocks.map(b=>b.cover).filter(Boolean),cover:blocks.length===1?blocks[0].cover:null,facades:blocks.flatMap(b=>b.facades),snapshots:{facadeMap:facadeIdentificationFrom3D(),plan:safeCanvasDataURL(canvas),model:safeCanvasDataURL(renderer?.domElement),solar:safeCanvasDataURL(solarRenderer?.domElement)},methodology:{stepMinutes:5,point:'Punto medio de cada fachada',selfShadow:true,interBlockShadow:true,externalObstacles:false}}}
window.HIGROLAB_SOLAR_REPORT=solarReportPayload;

try{init()}catch(err){console.error('HIGROLAB Solar Studio init error',err);const pill=document.getElementById('status-pill');if(pill)pill.textContent='Error de inicio';const panel=document.getElementById('selection-panel');if(panel)panel.innerHTML='<h3>ERROR DE INICIO</h3><div class="empty">El módulo no pudo iniciar. Recarga la página; si persiste, revisa la consola del navegador.</div>'}
