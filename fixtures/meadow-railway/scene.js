import * as THREE from './vendor/three.module.js';
import { attachQuality } from './adaptive-quality.js';
import {sample,segment} from './game-core.js';
const COLORS=['#d4ac78','#df7c70','#64afb7','#e2c46d'];
export function createScene(container) {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  container.append(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#c5e2e8');scene.fog=new THREE.Fog('#c5e2e8',75,160);
  const camera=new THREE.PerspectiveCamera(42,1,.1,220);
  scene.add(new THREE.HemisphereLight('#eefbff','#819977',2.1));
  const sun=new THREE.DirectionalLight('#fff1db',2.5);sun.position.set(-25,65,25);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-60,right:60,top:60,bottom:-60,near:.5,far:130});sun.shadow.bias=-.0003;sun.shadow.normalBias=.035;scene.add(sun);
  const quality=attachQuality(renderer,sun,1.5);
  const materials=new Map(),box=new THREE.BoxGeometry(1,1,1),sphere=new THREE.SphereGeometry(1,16,12),cylinder=new THREE.CylinderGeometry(1,1,1,16),cone=new THREE.ConeGeometry(1,1,12);
  const mat=(color,type='wood')=>{const key=color+type;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:type==='metal'?.35:type==='paint'?.4:.78,metalness:type==='metal'?.45:0}));return materials.get(key);};
  function mesh(g,color,pos,scale,parent=scene,type='wood'){const m=new THREE.Mesh(g,mat(color,type));m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function cube(color,pos,size,parent,type){return mesh(box,color,pos,size,parent,type);}
  function ball(color,pos,size,parent,type){return mesh(sphere,color,pos,size,parent,type);}
  const roundedGeometry=new THREE.BoxGeometry(1,1,1,4,4,4);{const p=roundedGeometry.attributes.position,n=roundedGeometry.attributes.normal;for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i),c=v.clone().clampScalar(-.37,.37),normal=v.clone().sub(c).normalize();v.copy(c).addScaledVector(normal,.13);p.setXYZ(i,v.x,v.y,v.z);n.setXYZ(i,normal.x,normal.y,normal.z);}}
  const rounded=(color,pos,size,parent,type='paint')=>mesh(roundedGeometry,color,pos,size,parent,type);
  const land=new THREE.Group();scene.add(land);
  const ground=mesh(cylinder,'#91b57f',[0,-1.5,0],[64,3,64],land);ground.receiveShadow=true;
  mesh(cylinder,'#95b473',[0,-3,0],[64.5,1.5,64.5],land);
  const ocean=mesh(cylinder,'#82c8d1',[0,-4.05,0],[105,.4,105],land);ocean.castShadow=false;
  function tree(x,z,s=1){const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(s);land.add(g);cube('#a78761',[0,1.05,0],[.38,2.1,.38],g);ball('#658f67',[0,2.4,0],[1.45,1.8,1.25],g);ball('#7da977',[-.65,2.9,.05],[.85,1.15,.9],g);}
  for(const [cx,cz,count]of[[-28,-22,10],[23,-29,12],[33,20,8],[-32,26,7]])for(let i=0;i<count;i++){const a=i*2.399,r=Math.sqrt(i)*2.1;tree(cx+Math.cos(a)*r,cz+Math.sin(a)*r,.8+(i%4)*.18);}
  for(let i=0;i<22;i++){const a=i*2.399,r=46+i%7;ball(i%2?'#b9c7a0':'#d3d6b6',[Math.cos(a)*r,.45,Math.sin(a)*r],[1.6,.8,1.3],land);}
  for(const [x,z,s] of [[-35,-32,11],[22,-39,12],[40,-24,8]]){ball('#8fb37d',[x,0,z],[s,s*.6,s*.8],land);ball('#abc98d',[x-1,3,z],[s*.72,s*.38,s*.62],land);}
  // A station with a real platform, eaves, windows and a clock, kept clear of the construction lane.
  cube('#c7ac80',[-10,.15,9.4],[10,.3,4],land);cube('#efe6c3',[-10,1.65,10.2],[6,3,2.6],land);
  for(const side of[-1,1]){const roof=rounded('#357a78',[-10,3.52,10.2+side*.88],[7.1,.22,2.1],land);roof.rotation.x=side*.42;}
  rounded('#e1c088',[-10,3.86,10.2],[7.1,.13,.13],land);
  const gableGeometry=new THREE.BufferGeometry();gableGeometry.setAttribute('position',new THREE.Float32BufferAttribute([-13,3.04,8.85,-13,3.89,10.2,-13,3.04,11.55,-7,3.04,11.55,-7,3.89,10.2,-7,3.04,8.85],3));gableGeometry.computeVertexNormals();mesh(gableGeometry,'#ebdab2',[0,0,0],[1,1,1],land);
  for(let i=0;i<9;i++)for(const side of[-1,1]){const seam=cube('#4d9290',[-13.1+i*.78,3.58,10.2+side*.88],[.055,.05,2],land);seam.rotation.x=side*.42;}
  for(let i=0;i<15;i++)cube(i%2?'#d8bc87':'#dfc691',[-14.55+i*.64,.33,9.45],[.6,.06,3.95],land);
  for(const z of[8.8,11.65]){rounded('#b78352',[-10,1.25,z],[1.1,2.45,.12],land);for(const x of[-10.7,-9.3])cube('#f4e7c1',[x,1.4,z],[.13,2.8,.2],land);rounded('#416f67',[-10,2.83,z],[2.6,.48,.16],land);}
  for(const x of [-12.2,-7.8])for(const z of[8.86,11.54]){cube('#529494',[x,1.8,z],[1.1,1.25,.1],land,'paint');cube('#f9f0ce',[x,1.8,z+(z>10?.08:-.08)],[.07,1.3,.08],land);}
  cube('#b98456',[-10,1.15,8.85],[1.05,2.2,.14],land);cube('#648f86',[-10,2.85,8.76],[1.4,.35,.15],land);
  for(const x of [-13.1,-6.9])cube('#e3d7b3',[x,1.55,8.3],[.17,3.1,.17],land);
  cube('#d7995b',[-3.7,.55,9.1],[1.8,.14,.6],land);for(const x of[-4.4,-3])cube('#7c8069',[x,.3,9.1],[.1,.6,.45],land);
  const clock=mesh(cylinder,'#f9f0d4',[-10,2.55,8.79],[.32,.07,.32],land);clock.rotation.x=Math.PI/2;
  cube('#436b66',[-10,2.64,8.73],[.035,.17,.04],land);cube('#436b66',[-9.92,2.55,8.72],[.17,.035,.04],land);
  for(const x of[-15.4,-3.6]){cube('#45645e',[x,1.45,8.4],[.1,2.9,.1],land);rounded('#f4d899',[x,2.9,8.4],[.4,.48,.4],land);rounded('#3c706e',[x,3.2,8.4],[.65,.12,.65],land);}
  for(let i=0;i<10;i++){const x=-16+i*1.45;cube('#e6dfb8',[x,.8,13.2],[.15,1.5,.15],land);if(i<9)for(const y of[.45,1.05])cube('#e6dfb8',[x+.7,y,13.2],[1.5,.12,.12],land);}
  function batch(root){root.updateMatrixWorld(true);const groups=new Map(),items=[];
    root.traverse(m=>{if(!m.isMesh)return;items.push(m);const key=m.material.uuid+':'+Math.floor(m.getWorldPosition(new THREE.Vector3()).x/24)+':'+Math.floor(m.getWorldPosition(new THREE.Vector3()).z/24);if(!groups.has(key))groups.set(key,{material:m.material,list:[]});groups.get(key).list.push(m);});
    for(const {material,list} of groups.values()){const positions=[],normals=[];for(const m of list){const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrixWorld);positions.push(...g.attributes.position.array);normals.push(...g.attributes.normal.array);g.dispose();}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.computeBoundingSphere();const m=new THREE.Mesh(g,material);m.castShadow=true;m.receiveShadow=true;root.add(m);}
    for(const m of items)m.removeFromParent();
  }
  batch(land);
  let trackRoot=new THREE.Group();scene.add(trackRoot);let route=null;
  let garden=new THREE.Group();scene.add(garden);
  function buildGarden(next){garden.traverse(m=>{if(m.isMesh)m.geometry.dispose();});scene.remove(garden);garden=new THREE.Group();scene.add(garden);
    const safe=(x,z,r)=>next.points.every(p=>Math.hypot(p.x-x,p.z-z)>r+1.4);
    // Small composed landscape islands occupy empty land only; construction always takes priority.
    if(safe(-8,-3,3.2)){mesh(cylinder,'#e0d2a1',[-8,.02,-3],[3.4,.08,2.55],garden);mesh(cylinder,'#61b4bd',[-8,.08,-3],[3.04,.08,2.2],garden);mesh(cylinder,'#86cdd0',[-8,.13,-3],[2.3,.02,1.5],garden);
      for(let i=0;i<7;i++){const a=i*.9;ball('#c0c8a1',[-8+Math.cos(a)*3.2,.23,-3+Math.sin(a)*2.55],[.45,.32,.4],garden);}
      for(const [x,z]of[[-9,-2.6],[-7.8,-3.1]]){ball('#f4e5bf',[x,.35,z],[.3,.2,.2],garden);ball('#f4e5bf',[x+.2,.5,z],[.13,.14,.13],garden);cube('#e2b160',[x+.32,.46,z],[.14,.06,.08],garden);}}
    for(const [x,z]of[[-19,11],[-2,13],[5,-7],[8,-14],[-22,-11]])if(safe(x,z,1.7)){mesh(cylinder,'#a7c78a',[x,.02,z],[2,.05,1.4],garden);for(let i=0;i<5;i++){const dx=Math.cos(i*2.4)*1.1,dz=Math.sin(i*2.4)*.9;ball(i%2?'#739f70':'#83af7a',[x+dx,.5,z+dz],[.7,.65,.7],garden);ball(i%2?'#e8c870':'#e6a18a',[x+dx,.99,z+dz],[.16,.13,.16],garden);}}
    batch(garden);
  }
  const previewRoot=new THREE.Group();scene.add(previewRoot);const previewMaterial=new THREE.MeshBasicMaterial({color:'#fcf0b8',transparent:true,opacity:.5,depthWrite:false});let previewGeometry=null;
  function preview(type,valid){previewRoot.clear();if(previewGeometry)previewGeometry.dispose();previewGeometry=null;if(!route||route.closed)return;const s=segment(route.end,type),vertices=[];for(let i=0;i<s.points.length-1;i++){const a=s.points[i],b=s.points[i+1];for(const [p,side]of[[a,1],[b,1],[a,-1],[b,1],[b,-1],[a,-1]])vertices.push(p.x-Math.sin(p.a)*side*1.05,(valid?p.y:Math.max(0,p.y))+.36,p.z+Math.cos(p.a)*side*1.05);}
    previewGeometry=new THREE.BufferGeometry();previewGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));previewMaterial.color.set(valid?'#fff0a7':'#e97e6f');previewRoot.add(new THREE.Mesh(previewGeometry,previewMaterial));}
  const tempGeometries=[];
  function strip(points,width,height,color,parent){const verts=[],norms=[];
    for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz),nx=-dz/l*width/2,nz=dx/l*width/2;
      const p=[[a.x+nx,a.y+height,a.z+nz],[a.x-nx,a.y+height,a.z-nz],[b.x+nx,b.y+height,b.z+nz],[b.x-nx,b.y+height,b.z-nz]];
      for(const n of [0,2,1,2,3,1]){verts.push(...p[n]);norms.push(0,1,0);}
      for(const side of [1,-1]){const q=[[a.x+nx*side,a.y+height,a.z+nz*side],[a.x+nx*side,a.y+.03,a.z+nz*side],[b.x+nx*side,b.y+height,b.z+nz*side],[b.x+nx*side,b.y+.03,b.z+nz*side]];for(const n of[0,2,1,2,3,1]){verts.push(...q[n]);norms.push(nx*side/width*2,0,nz*side/width*2);}}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(norms,3));tempGeometries.push(g);mesh(g,color,[0,0,0],[1,1,1],parent);
  }
  function buildTrack(next){route=next;trackRoot.traverse(m=>{if(m.isMesh)m.geometry.dispose();});scene.remove(trackRoot);trackRoot=new THREE.Group();scene.add(trackRoot);
    for(const s of route.segments){strip(s.points,2.12,.3,COLORS[s.color],trackRoot);
      for(let i=1;i<24;i+=3){const p=s.points[i];const tie=cube('#c09a6c',[p.x,p.y+.31,p.z],[.075,.018,2],trackRoot);tie.rotation.y=-p.a;}
      for(const offset of[-.68,.68]){const pts=s.points.map(p=>new THREE.Vector3(p.x-Math.sin(p.a)*offset,p.y+.34,p.z+Math.cos(p.a)*offset));const curve=new THREE.CatmullRomCurve3(pts);const g=new THREE.TubeGeometry(curve,24,.055,5,false);tempGeometries.push(g);mesh(g,'#8a7963',[0,0,0],[1,1,1],trackRoot);}
      for(let i=3;i<s.points.length;i+=6){const p=s.points[i];if(p.y>.8){cube('#c6a076',[p.x,p.y/2,p.z],[.34,p.y,.34],trackRoot);const cross=cube('#aa8e66',[p.x,p.y-.35,p.z],[.18,.2,1.65],trackRoot);cross.rotation.y=-p.a;}}
      if(s.type==='bridge'){for(let i=1;i<24;i+=3){const p=s.points[i];for(const side of[-1,1])cube('#a77952',[p.x-Math.sin(p.a)*side,p.y+.7,p.z+Math.cos(p.a)*side],[.11,1.15,.11],trackRoot);}for(const side of[-1,1]){const a=s.points[0],b=s.end;const rail=cube('#c59664',[(a.x+b.x)/2-Math.sin(a.a)*side,a.y+1.15,(a.z+b.z)/2+Math.cos(a.a)*side],[6,.13,.14],trackRoot);rail.rotation.y=-a.a;}}
      if(s.type==='tunnel'){for(const i of[4,12,20]){const p=s.points[i];const g=new THREE.TorusGeometry(1.35,.38,7,16,Math.PI);tempGeometries.push(g);const arch=mesh(g,'#789684',[p.x,p.y+.15,p.z],[1,1,1],trackRoot);arch.rotation.y=Math.PI/2-p.a;}const p=s.points[12];for(const side of[-1,1]){const wall=cube('#8aa289',[p.x-Math.sin(p.a)*side*1.32,p.y+.4,p.z+Math.cos(p.a)*side*1.32],[4.8,.8,.55],trackRoot);wall.rotation.y=-p.a;}}
    }
    batch(trackRoot);for(const g of tempGeometries)g.dispose();tempGeometries.length=0;buildGarden(route);renderer.shadowMap.needsUpdate=true;
  }
  const train=new THREE.Group();scene.add(train);const cars=[],wheels=[],rods=[];
  for(let i=0;i<3;i++){const car=new THREE.Group(),body=new THREE.Group();train.add(car);car.add(body);cars.push(car);
    rounded('#3f5751',[0,.6,0],[1.75,.23,1.05],body);rounded(i?'#d6a05e':'#bc6654',[0,.82,0],[1.8,.28,1.15],body);
    for(const x of[-1,1]){mesh(cylinder,'#7a7661',[x,.68,0],[.09,.32,.09],body).rotation.z=Math.PI/2;ball('#d3be88',[x*1.08,.68,0],[.13,.1,.13],body);}
    if(!i){const boiler=mesh(cylinder,'#368f8b',[.27,1.26,0],[.48,1.02,.48],body,'paint');boiler.rotation.z=Math.PI/2;
      for(const x of[-.12,.56]){const band=mesh(cylinder,'#ddc28a',[x,1.26,0],[.49,.055,.49],body,'metal');band.rotation.z=Math.PI/2;}
      const front=mesh(cylinder,'#385954',[.81,1.26,0],[.4,.09,.4],body);front.rotation.z=Math.PI/2;
      rounded('#f0d08a',[-.55,1.32,0],[.6,1.04,1.1],body);rounded('#2e716f',[-.58,1.93,0],[.95,.16,1.4],body);
      for(const side of[-1,1]){rounded('#346968',[-.57,1.53,side*.557],[.38,.4,.025],body);cube('#f7e7bb',[-.57,1.53,side*.58],[.035,.43,.025],body);rounded('#e9d19f',[-.48,.93,side*.64],[.55,.1,.18],body);}
      mesh(cylinder,'#63594c',[.47,1.91,0],[.16,.59,.16],body);mesh(cylinder,'#d8b477',[.47,2.19,0],[.23,.12,.23],body,'metal');ball('#e6c978',[.07,1.83,0],[.16,.19,.16],body,'metal');
      ball('#e8cc83',[.9,1.47,0],[.09,.17,.17],body,'metal');ball('#fff0b6',[.98,1.47,0],[.035,.11,.11],body);
      for(const side of[-1,1]){const rod=rounded('#d4bd87',[0,.58,side*.74],[1.27,.085,.07],car,'metal');rods.push(rod);}
    }else{rounded(i===1?'#7faf9c':'#ce7e67',[0,1.16,0],[1.65,.62,1.04],body);
      for(const side of[-1,1]){rounded('#eed9a6',[0,1.5,side*.54],[1.72,.13,.11],body);for(const x of[-.5,0,.5])cube('#dda76c',[x,1.16,side*.535],[.055,.6,.025],body);}
      if(i===1){for(const x of[-.5,0,.5]){const log=mesh(cylinder,'#d9b478',[x,1.63,0],[.19,.83,.19],body);log.rotation.x=Math.PI/2;ball('#ecce92',[x,1.63,.43],[.15,.15,.025],body);}}else{ball('#e8c96d',[-.35,1.66,0],[.28,.27,.3],body);ball('#99b27e',[.3,1.69,0],[.35,.32,.35],body);}}
    batch(body);
    for(const x of(i===0?[-.62,0,.62]:[-.55,.55]))for(const side of[-1,1]){const wheel=new THREE.Group();car.add(wheel);const tire=mesh(cylinder,'#37544e',[0,0,0],[.31,.12,.31],wheel);tire.rotation.x=Math.PI/2;const hub=mesh(cylinder,'#e2c789',[0,0,side*.08],[.21,.035,.21],wheel,'metal');hub.rotation.x=Math.PI/2;
      for(const angle of[0,Math.PI/2]){const spoke=cube('#b87955',[0,0,side*.105],[.4,.055,.035],wheel);spoke.rotation.z=angle;}ball('#efe0b0',[0,0,side*.13],[.06,.06,.03],wheel);batch(wheel);wheel.position.set(x,.62,side*.64);wheels.push(wheel);}
    const contact=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.3),new THREE.MeshBasicMaterial({color:'#344d41',transparent:true,opacity:.18,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.position.y=.335;car.add(contact);
    car.traverse(m=>{if(m.isMesh)m.castShadow=false;});
  }
  const smoke=new THREE.InstancedMesh(sphere,mat('#f2f4e6'),18);smoke.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(smoke);smoke.frustumCulled=false;
  const smokeBits=Array.from({length:18},()=>({age:99,x:0,y:0,z:0})),dummy=new THREE.Object3D();let smokeClock=0;
  const marker=new THREE.Group();scene.add(marker);mesh(cylinder,'#e7bb58',[0,.36,0],[.9,.08,.9],marker);const flag=cube('#e7bb58',[0,1.55,0],[.1,2.4,.1],marker);rounded('#f8edd3',[.48,2.4,0],[.96,.6,.08],marker);const arrow=cube('#267b75',[.46,2.4,-.06],[.45,.09,.025],marker);const arrowHead=cube('#267b75',[.65,2.4,-.06],[.2,.2,.025],marker);arrowHead.rotation.z=Math.PI/4;
  let yaw=-.62,targetYaw=-.62,zoom=34,targetZoom=34,focus=new THREE.Vector3(-7,0,-2),target=new THREE.Vector3(-7,0,-2),follow=false,elapsed=0,drag=null;
  renderer.domElement.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);});
  renderer.domElement.addEventListener('pointermove',e=>{if(!drag)return;targetYaw-=(e.clientX-drag.x)*.008;targetZoom=Math.max(13,Math.min(115,targetZoom+(e.clientY-drag.y)*.06));drag={x:e.clientX,y:e.clientY};});
  const release=()=>drag=null;renderer.domElement.addEventListener('pointerup',release);renderer.domElement.addEventListener('pointercancel',release);
  renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();targetZoom=Math.max(13,Math.min(115,targetZoom+e.deltaY*.045));},{passive:false});
  function fit(){if(!route)return;const bounds=new THREE.Box3().setFromPoints(route.points.map(p=>new THREE.Vector3(p.x,p.y,p.z)));bounds.getCenter(target);const size=bounds.getSize(new THREE.Vector3());targetZoom=Math.max(29,Math.max(size.x,size.z)*(innerWidth<600?2.9:1.35));targetZoom=Math.min(115,targetZoom);follow=false;}
  function update(state,dt,alpha){if(!quality.frame())return;smoke.count=Math.round(18*quality.state().particles);elapsed+=dt;const d=state.previous+(state.distance-state.previous)*alpha;
    cars.forEach((car,i)=>{let at=d-i*1.85;if(state.route.closed)at=(at%state.route.length+state.route.length)%state.route.length;const p=sample(state.route,Math.max(0,at));car.position.set(p.x,p.y+.02,p.z);car.rotation.set(0,-p.a,p.pitch);});
    const spin=-d/.31;wheels.forEach(w=>{w.rotation.z=spin;});rods.forEach(r=>{r.position.x=Math.cos(spin)*.16;r.position.y=.62+Math.sin(spin)*.16;});
    marker.visible=!state.route.closed;marker.position.set(route.end.x,route.end.y,route.end.z);marker.rotation.y=-route.end.a;flag.scale.y=reduced?1:1+Math.sin(elapsed*2)*.03;
    if(follow)target.copy(cars[0].position);focus.lerp(target,1-Math.exp(-dt*(follow?12:3)));yaw+=(targetYaw-yaw)*(1-Math.exp(-dt*7));zoom+=(targetZoom-zoom)*(1-Math.exp(-dt*6));
    const narrow=innerWidth<600?1.24:1;camera.position.set(focus.x+Math.cos(yaw)*zoom*narrow,focus.y+zoom*(follow?.48:.62),focus.z+Math.sin(yaw)*zoom*narrow);camera.lookAt(focus.x,focus.y+(follow?.8:-zoom*.115),focus.z);
    scene.fog.near=Math.max(75,zoom*1.5);scene.fog.far=scene.fog.near+100;
    smokeClock+=dt;if(state.running&&state.wait<=0&&smokeClock>(reduced?.5:.16)){smokeClock=0;const bit=smokeBits.find(p=>p.age>2);if(bit){const head=cars[0];bit.x=head.position.x+Math.cos(head.rotation.y)*.47;bit.y=head.position.y+2.2;bit.z=head.position.z-Math.sin(head.rotation.y)*.47;bit.age=0;}}
    smokeBits.forEach((p,i)=>{p.age+=dt;const live=p.age<2;dummy.position.set(p.x-p.age*.4,p.y+p.age*.85,p.z+p.age*.2);dummy.scale.setScalar(live?(.12+p.age*.14)*(1-p.age/2):0);dummy.updateMatrix();smoke.setMatrixAt(i,dummy.matrix);});smoke.instanceMatrix.needsUpdate=true;
    renderer.render(scene,camera);
  }
  function resize(){quality.resize();camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}resize();addEventListener('resize',resize);
  return {renderer,quality:quality.state,buildTrack,update,fit,preview,details:()=>({wheels:wheels.length,rods:rods.length,spin:wheels[0].rotation.z,preview:previewRoot.children.length}),rotate:()=>targetYaw+=Math.PI/4,zoom:amount=>targetZoom=Math.max(13,Math.min(115,targetZoom+amount)),follow:()=>{follow=!follow;if(follow)targetZoom=innerWidth<600?17:12;else fit();return follow;},release};
}
