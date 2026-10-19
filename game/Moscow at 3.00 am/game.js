
(() => {
'use strict';
const $=id=>document.getElementById(id);
const CONFIG={apiKey:"AIzaSyA6GGJxAiao77U7_9mBUEjftmS_FnSWbIw",authDomain:"glob-data.firebaseapp.com",projectId:"glob-data",storageBucket:"glob-data.firebasestorage.app",messagingSenderId:"122757049174",appId:"1:122757049174:web:ebb425edd0e1a8ea9a44f7"};
let auth=null,db=null,user=null,globalId=null;
try{if(!firebase.apps.length)firebase.initializeApp(CONFIG);auth=firebase.auth();db=firebase.firestore();auth.onAuthStateChanged(async u=>{user=u||null;if(!u)return;try{const q=await db.collection('global_ids').where('uid','==',u.uid).limit(1).get();if(!q.empty)globalId=q.docs[0].id;}catch(e){console.warn('Global ID lookup:',e.code);}});}catch(e){console.warn('Firebase unavailable',e);}
const state={running:false,paused:false,level:1,playMs:0,playStartedAt:performance.now(),waveManifest:null,bossSpawned:false,coins:Number(localStorage.getItem('moscow3_coins')||0),hp:100,rate:1,power:1,ammo:1,skin:0,shotAt:0,targets:[],effects:[],score:0,spawned:0,total:8,bosses:[],multiplayer:false,partner:null,inviteDoc:null,noise:0};
const costs={rate:1500,power:2000,ammo:2500};
let soundOn=true,audio=null,scene,camera,renderer,clock,ground,city=[],radar=[],pointer={x:0,y:0},raycaster=new THREE.Raycaster(),aimPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-3),aimPoint=new THREE.Vector3(0,3,-35),mouseDown=false,lastSpawn=0,shake=0,frame=0;
const mat=(c,rough=.9,em=0)=>new THREE.MeshStandardMaterial({color:c,roughness:rough,emissive:c,emissiveIntensity:em});
function sound(type='shot'){if(!soundOn)return;try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime;const set={shot:[145,52,.09,'sawtooth'],hit:[500,120,.13,'triangle'],coin:[880,1320,.16,'sine'],alarm:[220,330,.35,'square'],boom:[90,35,.32,'sawtooth'],boss:[70,42,.7,'sawtooth'] }[type]||[200,90,.1,'sine'];o.type=set[3];o.frequency.setValueAtTime(set[0],t);o.frequency.exponentialRampToValueAtTime(Math.max(20,set[1]),t+set[2]);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.14,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+set[2]);o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+set[2]+.02);}catch(e){}}
function toast(s){$('toast').textContent=s;$('toast').style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>$('toast').style.display='none',2300)}
function persist(){
 localStorage.setItem('moscow3_coins',String(state.coins));
 localStorage.setItem('moscow3_upgrades',JSON.stringify({rate:state.rate,power:state.power,ammo:state.ammo,skin:state.skin,level:state.level}));
 if(db&&user){const payload={uid:user.uid,globalId:globalId||null,coins:state.coins,level:state.level,playSeconds:Math.floor((state.playMs||0)/1000),updatedAt:firebase.firestore.FieldValue.serverTimestamp()};db.collection('moscow_arcade_profiles').doc(user.uid).set(payload,{merge:true}).catch(e=>console.warn('Cloud save denied:',e.code));db.collection('moscow_arcade_leaderboard').doc(user.uid).set({...payload,displayName:user.displayName||('Игрок '+(globalId||user.uid.slice(0,5))),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}).catch(e=>console.warn('Leaderboard write denied:',e.code));}
}
function loadSave(){try{const s=JSON.parse(localStorage.getItem('moscow3_upgrades')||'{}');Object.assign(state,{rate:s.rate||1,power:s.power||1,ammo:s.ammo||1,skin:s.skin||0,level:s.level||1});}catch(e){}}
function ui(){$('level').textContent=state.level;$('coins').textContent=state.coins.toLocaleString('ru-RU');$('targets').textContent=state.targets.filter(t=>!t.dead).length+state.total-state.spawned;$('hp').textContent=Math.max(0,Math.round(state.hp))+'%';$('rateLv').textContent='УР. '+state.rate;$('powerLv').textContent='УР. '+state.power;$('ammoLv').textContent='УР. '+state.ammo;$('buyRate').textContent='УЛУЧШИТЬ · '+costs.rate.toLocaleString('ru-RU')+' ₽';$('buyPower').textContent='УЛУЧШИТЬ · '+costs.power.toLocaleString('ru-RU')+' ₽';$('buyAmmo').textContent='УЛУЧШИТЬ · '+costs.ammo.toLocaleString('ru-RU')+' ₽';document.querySelectorAll('.skin').forEach(b=>b.classList.toggle('selected',+b.dataset.skin===state.skin));}
function setup3D(){scene=new THREE.Scene();scene.background=new THREE.Color(0x020a07);scene.fog=new THREE.FogExp2(0x06130c,.012);camera=new THREE.PerspectiveCamera(66,innerWidth/innerHeight,.1,1000);camera.position.set(0,5.2,12);camera.lookAt(0,3,-35);renderer=new THREE.WebGLRenderer({canvas:$('scene'),antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputEncoding=THREE.sRGBEncoding;scene.add(new THREE.HemisphereLight(0x8aff9a,0x071008,1.25));const moon=new THREE.DirectionalLight(0xb7ffc0,1.5);moon.position.set(-25,50,20);moon.castShadow=true;scene.add(moon);const glow=new THREE.PointLight(0x3aff77,4,100);glow.position.set(0,8,8);scene.add(glow);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(400,400),mat(0x101a13));floor.rotation.x=-Math.PI/2;floor.position.y=-.1;floor.receiveShadow=true;scene.add(floor);const road=new THREE.Mesh(new THREE.PlaneGeometry(15,180),mat(0x101713));road.rotation.x=-Math.PI/2;road.position.set(0,.015,-50);scene.add(road);
for(let z=5;z>-150;z-=7){for(let side of [-1,1]){let h=4+Math.random()*20,w=3+Math.random()*5,d=4+Math.random()*5;let b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat([0x17241a,0x1b2820,0x101a15][Math.floor(Math.random()*3)]));b.position.set(side*(12+Math.random()*22),h/2-0.05,z-Math.random()*4);b.castShadow=true;b.receiveShadow=true;scene.add(b);city.push(b);for(let y=1;y<h-1;y+=2.4)for(let x=-w/2+.7;x<w/2-.3;x+=1.2){if(Math.random()>.42){let win=new THREE.Mesh(new THREE.PlaneGeometry(.28,.45),new THREE.MeshBasicMaterial({color:Math.random()>.6?0x79ff86:0x253b2a}));win.position.set(b.position.x+x,y,b.position.z+d/2+.015);scene.add(win);}}}}
buildKremlin();if(window.GloBitCity)window.GloBitCity.build(scene,THREE,mat,localStorage.getItem('moscow3_location')||'moscow');buildSearchlights();createReticle();clock=new THREE.Clock();window.addEventListener('resize',resize);renderer.setAnimationLoop(animate);}
function buildKremlin(){const wallMat=mat(0x4a5b3b),roofMat=mat(0x9a3023),stone=mat(0x6b765b);const wall=new THREE.Mesh(new THREE.BoxGeometry(44,5,2),wallMat);wall.position.set(0,2.5,-70);scene.add(wall);for(let x=-21;x<=21;x+=2){let cren=new THREE.Mesh(new THREE.BoxGeometry(1,1,2.2),stone);cren.position.set(x,5.4,-70);scene.add(cren)}for(const x of [-20,-10,0,10,20]){const tower=new THREE.Group();const base=new THREE.Mesh(new THREE.CylinderGeometry(2,2.5,9,8),stone);base.position.y=4.5;tower.add(base);const roof=new THREE.Mesh(new THREE.ConeGeometry(2.7,5,8),roofMat);roof.position.y=11.5;tower.add(roof);tower.position.set(x,0,-70);scene.add(tower);if(x===0){const star=new THREE.Mesh(new THREE.OctahedronGeometry(.9),mat(0xff392e,0.3,1.3));star.position.set(0,14,-70);scene.add(star)}}const hall=new THREE.Mesh(new THREE.BoxGeometry(18,11,10),mat(0x3c4c35));hall.position.set(0,5.5,-80);scene.add(hall);for(let i=-2;i<=2;i++){const col=new THREE.Mesh(new THREE.CylinderGeometry(.5,.6,7,10),mat(0x7a866b));col.position.set(i*2.8,3.5,-74.7);scene.add(col)}}
function buildSearchlights(){for(let x of [-14,14]){const light=new THREE.SpotLight(0x8aff8e,3,100,.32,.5,1.2);light.position.set(x,10,4);light.target.position.set(x*-.6,3,-55);scene.add(light,light.target);const cone=new THREE.Mesh(new THREE.ConeGeometry(9,55,24,1,true),new THREE.MeshBasicMaterial({color:0x6bff7b,transparent:true,opacity:.035,side:THREE.DoubleSide,depthWrite:false}));cone.position.set(x*.3,6,-23);cone.rotation.x=Math.PI/2.4;scene.add(cone)}}
function createReticle(){for(let i=0;i<4;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.025,.35,.025),mat(0x9dff85,0,1));m.position.set((i%2?1:-1)*.3,3,(i<2?-.3:.3));scene.add(m);}}
function resize(){if(!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)}
function createTarget(type,bossName){const boss=type==='boss';let group=new THREE.Group();const glowmat=new THREE.MeshBasicMaterial({color:boss?(bossName==='Потужнолит' ? 0xff7c64:0x8ebaff):0x9aff85});if(boss){group=createBossModel(THREE,mat,bossName);group.userData.bossName=bossName;}else{const body=new THREE.Mesh(new THREE.SphereGeometry(type==='rocket'?.32:.5,12,9),mat(type==='drone'?0x758c6c:type==='shahed'?0x918b60:0x9eae9d));body.scale.set(type==='rocket'?.65:1,type==='rocket'?1.8:.45,type==='rocket'? .65:1.4);group.add(body);for(let s of [-1,1]){const wing=new THREE.Mesh(new THREE.BoxGeometry(type==='drone'?1.4:1.8,.08,.35),mat(0x485d45));wing.position.x=s*.65;group.add(wing)}const lamp=new THREE.Mesh(new THREE.SphereGeometry(.13,8,8),glowmat);lamp.position.z=.45;group.add(lamp);}
group.position.set((Math.random()-.5)*24,4+Math.random()*9,-48-Math.random()*38);group.traverse(o=>{if(o.isMesh){o.castShadow=true;o.userData.targetGroup=group}});scene.add(group);const max=(boss?100+state.level*5:type==='rocket'?3: type==='shahed'?2:1)*state.power;const t={group,type,boss,bossName,health:max,maxHealth:max,dead:false,speed:(boss?.5:.7+state.level*.035)*(state.multiplayer?1.2:1),value:boss?50000:type==='drone'?500:type==='shahed'?1000:5000,fireAt:performance.now()+2500+Math.random()*4000,noise:0};state.targets.push(t);if(boss){state.bosses.push(t);$('bossbar').style.display='block';$('bossname').textContent='БОСС: '+bossName.toUpperCase();sound('boss')}ui();return t;}
function spawnWave(){
 state.bossSpawned=false;state.spawned=0;state.targets.forEach(t=>{if(!t.dead)scene.remove(t.group)});state.targets=[];state.bosses=[];
 const level=state.level;
 const drones=level>=50?15:Math.min(5+Math.floor((level-1)*0.22),14);
 const shaheds=level>=50?10:Math.min(2+Math.floor((level-1)*0.16),9);
 const rockets=level>=50?5:Math.min(1+Math.floor((level-1)*0.1),4);
 const manifest=[...Array(drones).fill('drone'),...Array(shaheds).fill('shahed'),...Array(rockets).fill('rocket')];
 for(let i=manifest.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[manifest[i],manifest[j]]=[manifest[j],manifest[i]];}
 if(level>=50)manifest.push('boss');state.total=manifest.length;state.waveManifest={drones,shaheds,rockets,boss:level>=50?'Потужнолит':null,types:manifest.slice()};
 if(state.multiplayer){state.level=Math.min(65,Math.max(50,state.level));state.total=manifest.length;}
 const objective=$('objectiveText');if(objective)objective.textContent='Сбить: '+drones+' дронов · '+shaheds+' Shahed · '+rockets+' ракет'+(level>=50?' · БОСС: ПОТУЖНОЛИТ':'');
 manifest.forEach((type,i)=>setTimeout(()=>{if(!state.running)return;createTarget(type);state.spawned++;ui();},i*Math.max(150,600-state.level*7)));
 lastSpawn=performance.now();toast('ВОЛНА '+state.level+' · ЦЕЛЕЙ: '+state.total+(level>=50?' · ПОТУЖНОЛИТ':' '));ui();
}
function maybeBoss(){const alive=state.targets.filter(t=>!t.dead&&!t.boss).length;const pending=state.total-state.spawned;if(state.level>=50&&alive+pending<=5&&state.bosses.filter(b=>!b.dead).length===0&&!state.bossSpawned){state.bossSpawned=true;createTarget('boss',state.level===50?'Потужнолит':(Math.random()>.5?'Движухалит':'Потужнолит'));}}
function kill(t){if(t.dead)return;t.dead=true;scene.remove(t.group);state.coins+=t.value;state.score+=t.value;sound('coin');for(let i=0;i<12;i++){const p=new THREE.Mesh(new THREE.SphereGeometry(.06,5,5),new THREE.MeshBasicMaterial({color:0x9dff85}));p.position.copy(t.group.position);scene.add(p);state.effects.push({mesh:p,life:1,velocity:new THREE.Vector3((Math.random()-.5)*.18,Math.random()*.15,(Math.random()-.5)*.18)});}toast('+'+t.value.toLocaleString('ru-RU')+' ₽ · ЦЕЛЬ ПЕРЕХВАЧЕНА');if(t.boss){state.bosses=state.bosses.filter(b=>b!==t);if(!state.bosses.length)$('bossbar').style.display='none';}persist();ui();checkWave();}
function shoot(){if(!state.running||state.paused)return;const now=performance.now(),delay=Math.max(85,340-state.rate*35);if(now-state.shotAt<delay)return;state.shotAt=now;sound('shot');shake=.12;const alive=state.targets.filter(t=>!t.dead);if(!alive.length){toast('СЕКТОР ЧИСТ · ОЖИДАНИЕ ЦЕЛЕЙ');return;}let best=null,bestDist=1e9;for(const t of alive){const v=t.group.position.clone().project(camera);const d=Math.hypot(v.x-pointer.x,v.y+pointer.y);const dist=Math.hypot(t.group.position.x,t.group.position.y-3,t.group.position.z);const metric=d*20+dist*.006;if(metric<bestDist){bestDist=metric;best=t;}}if(best&&bestDist<2.8){best.health-=Math.max(1,state.power*1.4);sound('hit');best.group.scale.setScalar(1.06);setTimeout(()=>{if(best.group)best.group.scale.setScalar(1)},65);if(best.health<=0)kill(best);else if(best.boss){$('bosshp').style.width=(100*best.health/best.maxHealth)+'%';} }else{const flash=new THREE.PointLight(0xa8ff8c,2,5);flash.position.copy(aimPoint);scene.add(flash);setTimeout(()=>scene.remove(flash),70)}}
function checkWave(){const alive=state.targets.some(t=>!t.dead);if(state.spawned>=state.total&&!alive&&!state.bosses.some(t=>!t.dead)){state.running=false;state.level++;if(state.multiplayer&&state.level>65){state.multiplayer=false;toast('МУЛЬТИПЛЕЕР ЗАВЕРШЁН · УРОВЕНЬ 65');}else toast('ВОЛНА ПРОЙДЕНА · УРОВЕНЬ '+state.level);persist();ui();$('menu').classList.remove('hide');$('menuNotice').textContent='Волна пройдена! Нажми «Начать смену», чтобы продолжить.';}}
function animate(){if(!renderer)return;const dt=Math.min(clock.getDelta(),.04);frame++;if(typeof flight!=="undefined")updateFlight(dt);if(state.running&&!state.paused){state.playMs=(state.playMs||0)+dt*1000;if(state.playMs%5000<dt*1000)persist();if(performance.now()-lastSpawn>1800&&state.spawned<state.total&&state.targets.length===0)spawnWave();maybeBoss();for(const t of state.targets){if(t.dead)continue;t.group.position.z+=t.speed*dt;t.group.position.y+=Math.sin(performance.now()*.001+t.group.position.x)*dt*.25;t.group.rotation.y=Math.sin(performance.now()*.0007+t.group.position.z)*.15;if(t.boss&&performance.now()>t.fireAt){state.hp=Math.max(0,state.hp-(state.level-48)*.15);t.fireAt=performance.now()+Math.max(800,3500-state.level*35);state.noise=Math.min(1,state.noise+.3);sound('alarm');if(state.hp<=0){state.running=false;$('menu').classList.remove('hide');$('menuNotice').textContent='Система повреждена. Перезапусти смену и улучши батарею.';}}if(t.group.position.z>10){t.dead=true;scene.remove(t.group);state.hp=Math.max(0,state.hp-(t.boss?20:5));if(state.hp<=0){state.running=false;$('menu').classList.remove('hide');$('menuNotice').textContent='Оборона прорвана. Улучши систему и попробуй снова.';}}}for(const e of state.effects){e.life-=dt;e.mesh.position.addScaledVector(e.velocity,dt);e.mesh.material.opacity=e.life;e.mesh.material.transparent=true;if(e.life<=0)scene.remove(e.mesh)}state.effects=state.effects.filter(e=>e.life>0);if(mouseDown)shoot();ui();}if(shake>0){camera.position.x=(Math.random()-.5)*shake;shake*=.88;}if(typeof flight==='undefined'||!flight.missile)camera.position.x+=(0-camera.position.x)*.1;if(typeof flight==='undefined'||!flight.missile)camera.lookAt(aimPoint.x*.15,3,-35);$('scanbar').style.width=(35+Math.sin(frame*.04)*18+state.noise*30)+'%';state.noise=Math.max(0,state.noise-dt*.025);$('sector').textContent=String(45+Math.round(pointer.x*30)).padStart(3,'0')+'°';renderer.render(scene,camera);}
function start(){if(!scene)setup3D();$('menu').classList.add('hide');state.running=true;state.paused=false;state.hp=100;state.spawned=0;state.targets=[];state.bosses=[];state.total=0;lastSpawn=performance.now();spawnWave();ui();sound('alarm');if(window.GloBitBossAudio)window.GloBitBossAudio.start();}
function pause(){state.paused=!state.paused;$('pauseBtn').textContent=state.paused?'▶ ПРОДОЛЖИТЬ':'Ⅱ ПАУЗА';toast(state.paused?'ПАУЗА':'СМЕНА ПРОДОЛЖЕНА');}
function buy(k){const c=costs[k];if(state.coins<c){toast('НЕ ХВАТАЕТ МОНЕТ');return;}state.coins-=c;state[k]++;costs[k]=Math.round(c*1.7);persist();ui();toast('УЛУЧШЕНИЕ УСТАНОВЛЕНО');}
function toggleMenu(){$('menu').classList.toggle('hide');if(!$('menu').classList.contains('hide'))state.paused=true;}
$('startBtn').onclick=start;$('resumeBtn').onclick=()=>{$('menu').classList.add('hide');if(scene&&state.running)state.paused=false;};$('pauseBtn').onclick=pause;$('menuBtn').onclick=toggleMenu;$('upgradeBtn').onclick=()=>{$('menu').classList.remove('hide');state.paused=true};$('buyRate').onclick=()=>buy('rate');$('buyPower').onclick=()=>buy('power');$('buyAmmo').onclick=()=>buy('ammo');$('soundBtn').onclick=()=>{soundOn=!soundOn;$('soundBtn').textContent=soundOn?'🔊 ЗВУК: ВКЛ':'🔇 ЗВУК: ВЫКЛ';if(soundOn)sound('coin')};$('leaderBtn').onclick=async()=>{try{if(!db)throw Error('Firebase не подключён');const s=await db.collection('arcade_leaderboards').doc('moscow3am').collection('entries').orderBy('score','desc').limit(10).get();$('menuNotice').textContent=s.empty?'Рекордов пока нет':s.docs.map((d,i)=>(i+1)+'. '+(d.data().displayName||d.data().globalId||'Оператор')+' — '+Number(d.data().score||0).toLocaleString('ru-RU')+' ₽').join('  |  ');}catch(e){$('menuNotice').textContent='Таблица рекордов недоступна: проверь правила Firestore.'}};
document.querySelectorAll('.skin').forEach(b=>b.onclick=()=>{const k=+b.dataset.skin;const price=[0,3000,7500][k];if(k&&state.skin!==k&&state.coins<price){toast('Скин стоит '+price+' ₽');return;}if(k&&state.skin!==k){state.coins-=price;toast('СКИН ОТКРЫТ')}state.skin=k;$('skinInfo').textContent=['Стандартный комплект ночного наблюдения.','Лис: редкий разведывательный образ.','Робот: тактический цифровой камуфляж.'][k];persist();ui()});
$('findFriend').onclick=async()=>{const id=$('friendId').value.trim();$('friendResult').textContent='Ищем Global ID…';$('inviteFriend').disabled=true;if(!/^[0-9a-zA-Z]{22}$/.test(id)){$('friendResult').textContent='Global ID должен содержать 22 латинских буквы/цифры.';return;}try{if(!db)throw Error('Firebase недоступен');const doc=await db.collection('global_ids').doc(id).get();if(!doc.exists){$('friendResult').textContent='Игрок не найден.';return;}state.partner={id,...doc.data()};$('friendResult').textContent='Найден игрок · '+(doc.data().displayName||'Оператор');$('inviteFriend').disabled=false;}catch(e){$('friendResult').textContent='Не удалось найти: '+(e.code||e.message)+' — проверь чтение global_ids в правилах.'}};
$('inviteFriend').onclick=async()=>{if(!user||!globalId){$('inviteStatus').textContent='Сначала войди в GloBIT Arcade и привяжи Global ID.';return;}if(!state.partner||!db)return;try{const ref=await db.collection('arcade_groups').add({hostUid:user.uid,hostGlobalId:globalId,guestGlobalId:state.partner.id,guestUid:state.partner.uid||null,status:'invited',createdAt:firebase.firestore.FieldValue.serverTimestamp(),mode:'moscow3am',levels:[50,65]});state.inviteDoc=ref.id;$('inviteStatus').textContent='Приглашение отправлено! Ждём принятия группы…';listenInvite(ref.id);}catch(e){$('inviteStatus').textContent='Firebase запретил создание группы ('+(e.code||e.message)+'). Нужны правила arcade_groups.'}};
function listenInvite(id){db.collection('arcade_groups').doc(id).onSnapshot(doc=>{if(!doc.exists)return;const d=doc.data();if(d.status==='accepted'){ $('inviteStatus').textContent='Принято! Старт через 5 секунд…';setTimeout(()=>{state.multiplayer=true;state.level=50;start();},5000);}});}
window.addEventListener('pointermove',e=>{pointer.x=e.clientX/innerWidth*2-1;pointer.y=-(e.clientY/innerHeight)*2+1;if(scene&&camera){raycaster.setFromCamera(new THREE.Vector2(pointer.x,pointer.y),camera);raycaster.ray.intersectPlane(aimPlane,aimPoint)}});window.addEventListener('pointerdown',e=>{if(e.target.closest('button,.menu-card'))return;mouseDown=true;shoot()});window.addEventListener('pointerup',()=>mouseDown=false);$('mobileFire').addEventListener('pointerdown',e=>{e.preventDefault();mouseDown=true;shoot()});$('mobileFire').addEventListener('pointerup',()=>mouseDown=false);window.addEventListener('keydown',e=>{if(e.key==='Escape')pause();if(e.code==='Space'){e.preventDefault();shoot()}});
/* === FLIGHT-CONTROL COCKPIT V2 === */
const flight={steerX:0,steerY:0,roll:0,throttle:.65,heading:0,pitch:0,speed:24,fuel:100,missile:null,missileTrail:[],launchCooldown:0,lock:0};
function buildPlayerMissile(){
 const g=new THREE.Group();
 const shell=new THREE.Mesh(new THREE.CylinderGeometry(.24,.34,3.2,12),new THREE.MeshStandardMaterial({color:0x65766b,metalness:.75,roughness:.28}));
 shell.rotation.x=Math.PI/2;g.add(shell);
 const nose=new THREE.Mesh(new THREE.ConeGeometry(.24,.9,12),new THREE.MeshStandardMaterial({color:0xcbd6c8,metalness:.7,roughness:.22}));
 nose.rotation.x=-Math.PI/2;nose.position.z=-2.02;g.add(nose);
 const nozzle=new THREE.Mesh(new THREE.CylinderGeometry(.25,.38,.45,12),new THREE.MeshStandardMaterial({color:0x222a25,metalness:.8,roughness:.3}));
 nozzle.rotation.x=Math.PI/2;nozzle.position.z=1.75;g.add(nozzle);
 for(let i=0;i<4;i++){const fin=new THREE.Mesh(new THREE.BoxGeometry(.72,.08,.58),new THREE.MeshStandardMaterial({color:0x3a5141,metalness:.35,roughness:.45}));fin.position.z=1.15;fin.rotation.z=i*Math.PI/2;g.add(fin)}
 const flame=new THREE.Mesh(new THREE.ConeGeometry(.27,1.35,10),new THREE.MeshBasicMaterial({color:0x83ffb1,transparent:true,opacity:.9}));
 flame.rotation.x=Math.PI/2;flame.position.z=2.45;g.add(flame);g.userData.flame=flame;g.userData.playerMissile=true;
 g.position.set(0,4,8);scene.add(g);flight.missile=g;return g;
}
function makeNoiseTexture(colorA,colorB){const cv=document.createElement('canvas');cv.width=64;cv.height=64;const cx=cv.getContext('2d');cx.fillStyle=colorA;cx.fillRect(0,0,64,64);for(let i=0;i<180;i++){cx.fillStyle=Math.random()>.5?colorB:colorA;cx.globalAlpha=Math.random()*.65;cx.fillRect(Math.random()*64,Math.random()*64,2+Math.random()*9,1+Math.random()*3)}return new THREE.CanvasTexture(cv)}
function detailedTarget(type,bossName){
 const boss=type==='boss',root=new THREE.Group(),olive=new THREE.MeshStandardMaterial({color:0x535d49,metalness:.48,roughness:.43}),dark=new THREE.MeshStandardMaterial({color:0x202a23,metalness:.65,roughness:.3}),wingMat=new THREE.MeshStandardMaterial({color:0x4b5848,metalness:.42,roughness:.5}),hot=new THREE.MeshBasicMaterial({color:boss?0xff704d:0xffb86b});
 if(boss){
  // Satirical stylised human-like boss avatar; intentionally a game character, not a photorealistic replica.
  const jacket=new THREE.Mesh(new THREE.BoxGeometry(1.35,1.75,.75),new THREE.MeshStandardMaterial({color:bossName==='Потужнолит'?0x283d35:0x182743,roughness:.8}));jacket.position.y=1.45;root.add(jacket);
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(.18,.2,.35,10),mat(0xb98d72));neck.position.y=2.45;root.add(neck);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.52,20,16),new THREE.MeshStandardMaterial({color:0xc69a7c,roughness:.92}));head.position.y=2.9;root.add(head);
  const hair=new THREE.Mesh(new THREE.SphereGeometry(.53,16,10,0,Math.PI*2,0,Math.PI*.47),mat(bossName==='Потужнолит'?0x27221d:0xaaa18e));hair.position.y=3.08;root.add(hair);
  const eyeMat=new THREE.MeshBasicMaterial({color:0xffe2ac});for(let x of [-.18,.18]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.055,8,8),eyeMat);eye.position.set(x,2.98,.46);root.add(eye)}
  const tie=new THREE.Mesh(new THREE.ConeGeometry(.13,.72,4),mat(0x9e2e2a));tie.position.set(0,1.55,.4);root.add(tie);
  for(let x of [-.83,.83]){const arm=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.8,8),jacket.material);arm.position.set(x,1.55,.02);arm.rotation.z=x<0?-.3:.3;root.add(arm)}
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.05,.035,8,32),new THREE.MeshBasicMaterial({color:bossName==='Потужнолит'?0xff795f:0x78aaff}));ring.position.y=3.4;root.add(ring);root.userData.bossName=bossName;
 } else if(type==='drone'){
  // Four-rotor reconnaissance quadcopter, with visible arms, motors, camera and rotor discs.
  const core=new THREE.Mesh(new THREE.BoxGeometry(.72,.28,.9),dark);root.add(core);
  for(const x of [-1,1])for(const z of [-1,1]){const arm=new THREE.Mesh(new THREE.CylinderGeometry(.055,.075,1.25,8),olive);arm.position.set(x*.52,.02,z*.48);arm.rotation.z=Math.PI/2;arm.rotation.y=x*z*.35;root.add(arm);const motor=new THREE.Mesh(new THREE.CylinderGeometry(.17,.19,.13,12),dark);motor.position.set(x*1.05,.1,z*.86);root.add(motor);const rotor=new THREE.Mesh(new THREE.BoxGeometry(.85,.025,.08),new THREE.MeshBasicMaterial({color:0x8bffab,transparent:true,opacity:.65}));rotor.position.set(x*1.05,.19,z*.86);rotor.userData.rotor=true;root.add(rotor)}
  const cam=new THREE.Mesh(new THREE.SphereGeometry(.14,10,8),hot);cam.position.set(0,-.18,-.45);root.add(cam);
 }else if(type==='shahed'){
  // Long delta-wing loitering-munition silhouette with rear propeller and tail.
  const fus=new THREE.Mesh(new THREE.CylinderGeometry(.18,.28,2.5,12),olive);fus.rotation.x=Math.PI/2;root.add(fus);
  const wing=new THREE.Mesh(new THREE.BufferGeometry(),wingMat);const verts=new Float32Array([-2,0,.35,2,0,.35,.42,0,-.7,-2,0,.35,.42,0,-.7,-.55,0,-1.15]);wing.geometry.setAttribute('position',new THREE.BufferAttribute(verts,3));wing.geometry.computeVertexNormals();root.add(wing);
  const tail=new THREE.Mesh(new THREE.BoxGeometry(.85,.07,.4),dark);tail.position.z=1.05;root.add(tail);
  const prop=new THREE.Group();for(let i=0;i<2;i++){const blade=new THREE.Mesh(new THREE.BoxGeometry(.09,.85,.04),dark);blade.rotation.z=i*Math.PI/2;prop.add(blade)}prop.position.z=1.42;root.add(prop);root.userData.prop=prop;
  const nose=new THREE.Mesh(new THREE.ConeGeometry(.18,.55,10),dark);nose.rotation.x=-Math.PI/2;nose.position.z=-1.45;root.add(nose);
 }else{
  // A slender rocket body with four stabilising fins and bright exhaust.
  const fus=new THREE.Mesh(new THREE.CylinderGeometry(.16,.23,2.6,12),new THREE.MeshStandardMaterial({color:0x9ca89a,metalness:.72,roughness:.28}));fus.rotation.x=Math.PI/2;root.add(fus);
  const tip=new THREE.Mesh(new THREE.ConeGeometry(.16,.58,12),dark);tip.rotation.x=-Math.PI/2;tip.position.z=-1.58;root.add(tip);
  for(let i=0;i<4;i++){const fin=new THREE.Mesh(new THREE.BoxGeometry(.48,.06,.5),olive);fin.position.z=.9;fin.rotation.z=i*Math.PI/2;root.add(fin)}
  const exhaust=new THREE.Mesh(new THREE.ConeGeometry(.16,.75,10),hot);exhaust.rotation.x=Math.PI/2;exhaust.position.z=1.65;root.add(exhaust);root.userData.exhaust=exhaust;
 }
 root.position.set((Math.random()-.5)*28,3+Math.random()*13,-45-Math.random()*50);root.traverse(o=>{if(o.isMesh)o.castShadow=true});scene.add(root);
 const max=(boss?100+state.level*5:type==='rocket'?3:type==='shahed'?2:1)*state.power;
 const t={group:root,type,boss,bossName,health:max,maxHealth:max,dead:false,speed:(boss?.5:type==='rocket'?1.35:type==='shahed'?.8:1.05+state.level*.012)*(state.multiplayer?1.2:1),value:boss?50000:type==='drone'?500:type==='shahed'?1000:5000,fireAt:performance.now()+2400+Math.random()*3500,noise:0};state.targets.push(t);
 if(boss){state.bosses.push(t);$('bossbar').style.display='block';$('bossname').textContent='БОСС: '+bossName.toUpperCase();sound('boss')}ui();return t;
}
createTarget=detailedTarget;
let flightJoysticksReady=false;function setupFlightJoysticks(){if(flightJoysticksReady)return;flightJoysticksReady=true;
 const attach=(id,fn)=>{const el=$(id),knob=el.querySelector('.stick');let pid=null;const move=e=>{if(pid!==e.pointerId)return;const r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,lim=r.width*.31,len=Math.hypot(dx,dy)||1,x=dx/len*Math.min(lim,len),y=dy/len*Math.min(lim,len);knob.style.transform='translate('+x+'px,'+y+'px)';fn(x/lim,y/lim)};el.addEventListener('pointerdown',e=>{pid=e.pointerId;el.setPointerCapture(pid);move(e);e.preventDefault()});el.addEventListener('pointermove',move);const end=e=>{if(pid!==e.pointerId)return;pid=null;knob.style.transform='translate(0,0)';fn(0,0)};el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end)};
 attach('joySteer',(x,y)=>{flight.steerX=x;flight.steerY=y});
 attach('joyThrottle',(x,y)=>{flight.roll=x;flight.throttle=Math.max(.15,Math.min(1,.65-y*.35))});
 $('flightFire').addEventListener('pointerdown',e=>{e.preventDefault();launchIntercept()});
}
function launchIntercept(){
 if(!state.running||state.paused)return;
 const now=performance.now();if(now-flight.launchCooldown<650)return;flight.launchCooldown=now;sound('shot');flight.fuel=Math.max(0,flight.fuel-1.5);
 const alive=state.targets.filter(t=>!t.dead);if(!alive.length){toast('ПОИСК ЦЕЛИ · СЕКТОР ПУСТ');return}
 let nearest=null,score=1e9;for(const t of alive){const d=flight.missile.position.distanceTo(t.group.position);const aim=t.group.position.clone().sub(flight.missile.position).normalize(),forward=new THREE.Vector3(0,0,-1).applyQuaternion(flight.missile.quaternion);const angle=forward.angleTo(aim);const v=d+angle*18;if(v<score){score=v;nearest=t}}
 if(nearest){const dir=nearest.group.position.clone().sub(flight.missile.position).normalize();flight.missile.userData.lockTarget=nearest;flight.missile.userData.lockUntil=now+2400;toast('ЗАХВАТ: '+(nearest.boss?nearest.bossName:nearest.type.toUpperCase()));flight.lock=1;setTimeout(()=>{if(!nearest.dead&&flight.missile){const distance=flight.missile.position.distanceTo(nearest.group.position);if(distance<28||flight.missile.userData.lockTarget===nearest){nearest.health-=Math.max(1,state.power*2.4);sound('hit');if(nearest.health<=0)kill(nearest);else if(nearest.boss)$('bosshp').style.width=(100*nearest.health/nearest.maxHealth)+'%';}flight.lock=0}},850)}
}
function updateFlight(dt){
 if(!flight.missile||!state.running||state.paused)return;
 const m=flight.missile;const sensitivity=Number(WORLD.sensitivity||1);const steerY=Number.isFinite(flight.pitchInput)?flight.pitchInput:flight.steerY;const throttleInput=Number.isFinite(flight.throttleInput)?flight.throttleInput:0;flight.throttle=Math.max(.15,Math.min(1,flight.throttle+throttleInput*dt*.65));flight.heading+=flight.steerX*dt*.95*sensitivity;flight.pitch=Math.max(-.7,Math.min(.7,flight.pitch-steerY*dt*.7*sensitivity));flight.speed=15+flight.throttle*28;flight.roll=Math.max(-1,Math.min(1,flight.roll));if(window.__globitVibration&&navigator.vibrate&&performance.now()-(flight.lastVibe||0)>320){navigator.vibrate(9);flight.lastVibe=performance.now();}
 const target=m.userData.lockTarget;if(target&&!target.dead&&performance.now()<m.userData.lockUntil){const wanted=target.group.position.clone().sub(m.position).normalize();const forward=new THREE.Vector3(0,0,-1).applyQuaternion(m.quaternion);forward.lerp(wanted,Math.min(1,dt*1.8)).normalize();m.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),forward);m.position.addScaledVector(forward,flight.speed*dt);if(m.position.distanceTo(target.group.position)<2.8){target.health-=Math.max(1,state.power*2);if(target.health<=0)kill(target);m.userData.lockTarget=null;}}
 else{m.rotation.order='YXZ';m.rotation.y=flight.heading;m.rotation.x=flight.pitch;m.rotation.z=-flight.roll*.35;m.translateZ(-flight.speed*dt);}
 // Soft arena bounds and a forward-following chase camera: the player is the missile.
 m.position.x=Math.max(-42,Math.min(42,m.position.x));m.position.y=Math.max(1,Math.min(24,m.position.y));m.position.z=Math.max(-125,Math.min(18,m.position.z));
 const forward=new THREE.Vector3(0,0,-1).applyQuaternion(m.quaternion);const desired=m.position.clone().addScaledVector(forward,-8);desired.y+=2.3;camera.position.lerp(desired,Math.min(1,dt*2.8));camera.quaternion.slerp(m.quaternion,Math.min(1,dt*1.6));camera.lookAt(m.position.clone().addScaledVector(forward,28));
 m.userData.flame.scale.y=.7+Math.random()*.65;m.userData.flame.material.opacity=.65+Math.random()*.35;
 $('flightLevel').textContent=state.level;$('flightCoins').textContent=state.coins.toLocaleString('ru-RU')+' ₽';$('speedRead').textContent=Math.round(flight.speed*12)+' км/ч';$('altitudeRead').textContent=Math.round(m.position.y*90)+' м';$('fuelRead').textContent=Math.round(flight.fuel)+'%';
 $('flightStatus').innerHTML='<b>'+(flight.lock?'ЗАХВАТ ЦЕЛИ':'РУЧНОЕ УПРАВЛЕНИЕ')+'</b><br>ЛЕВЫЙ ДЖОЙСТИК — КУРС / ТАНГАЖ<br>ПРАВЫЙ ДЖОЙСТИК — КРЕН / ТЯГА<br>'+(flight.lock?'РАКЕТА СЛЕДУЕТ К ЦЕЛИ':'НАЖМИ «ЗАХВАТ / ПУСК» ДЛЯ ПЕРЕХВАТА');
}
const originalStart=start;
start=function(){originalStart();if(!flight.missile)buildPlayerMissile();flight.missile.position.set(0,4,8);flight.heading=0;flight.pitch=0;flight.fuel=100;camera.position.set(0,6,17);setupFlightJoysticks();};
const originalAnimate=animate;
animate=function(){if(renderer&&flight.missile&&state.running&&!state.paused){const dt=Math.min(clock.getDelta(),.04);updateFlight(dt);originalAnimate();return;}originalAnimate();};
window.addEventListener('deviceorientation',()=>{const portrait=innerHeight>innerWidth&&innerWidth<900;$('orientWarning').style.display=portrait?'grid':'none';});


/* MANUAL MISSILE FLIGHT + CITY DETAILS + RANDOM AIR TRAFFIC */
flight.mode='idle';flight.missileSpeed=0;
$('flightFire').innerHTML='🚀 ЗАПУСТИТЬ<br>РАКЕТУ';
$('flightStatus').innerHTML='<b>ГОТОВ К ПУСКУ</b><br>Нажми «ЗАПУСТИТЬ РАКЕТУ», затем управляй ракетой обоими джойстиками. Для перехвата нужно физически попасть в цель.';
function decorateCityV3(){
 const originals=city.slice();
 for(const b of originals){
  if(!b.geometry||b.geometry.type!=='BoxGeometry'||!b.geometry.parameters||b.position.y<2)continue;
  const p=b.geometry.parameters,w=p.width||4,h=p.height||8,d=p.depth||4,g=new THREE.Group();g.position.set(b.position.x,0,b.position.z);
  const frame=mat(0x303b32),glass=new THREE.MeshStandardMaterial({color:0x293c38,emissive:0x213b31,emissiveIntensity:.55,roughness:.25}),lit=new THREE.MeshStandardMaterial({color:0xffdca0,emissive:0x8a5a27,emissiveIntensity:.6});
  const floors=Math.max(2,Math.floor(h/2.1)),cols=Math.max(2,Math.floor(w/1.25));
  for(const side of [-1,1])for(let fl=0;fl<floors;fl++)for(let col=0;col<cols;col++){
   const xx=-w/2+(col+.5)*w/cols,yy=1.1+fl*2.05;if(yy>h-.3)continue;
   const pane=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(.65,w/cols*.7),.72),Math.random()<.22?lit:glass);pane.position.set(xx,yy,side*(d/2+.035));if(side<0)pane.rotation.y=Math.PI;g.add(pane);
   const sill=new THREE.Mesh(new THREE.BoxGeometry(Math.min(.8,w/cols*.8),.07,.13),frame);sill.position.set(xx,yy-.4,side*(d/2+.06));g.add(sill);
  }
  const door=new THREE.Mesh(new THREE.BoxGeometry(.9,1.6,.08),mat(0x45372a));door.position.set(0,.8,d/2+.06);g.add(door);
  const canopy=new THREE.Mesh(new THREE.BoxGeometry(1.35,.1,.32),frame);canopy.position.set(0,1.65,d/2+.12);g.add(canopy);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(w+.2,.18,d+.2),mat(0x51584b));roof.position.y=h+.05;g.add(roof);
  g.userData={building:true,hp:100,base:b,destroyed:false};scene.add(g);city.push(g);b.userData.detail=g;
 }
}
const setup3DBaseV3=setup3D;setup3D=function(){setup3DBaseV3();decorateCityV3()};
function airTrafficV3(){for(const t of state.targets){if(t.dead)continue;if(!t.flightPath)t.flightPath={phase:Math.random()*6.28,amp:1+Math.random()*3,turn:Math.random()};const f=t.flightPath,s=performance.now()*.001;t.group.position.x+=Math.sin(s*.75+f.phase)*f.amp*.035;t.group.position.y+=Math.cos(s*.9+f.phase)*.018;t.group.rotation.y=Math.sin(s*.65+f.phase)*.3;if(t.group.userData.prop)t.group.userData.prop.rotation.z+=.55;t.group.traverse(o=>{if(o.userData.rotor)o.rotation.y+=.8})}}
function explodeV3(pos,big=false){const g=new THREE.Group(),cols=[0xffe7a1,0xff8b32,0xd94b20,0x62665f];for(let i=0;i<(big?32:16);i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.12+Math.random()*.35,7,6),new THREE.MeshBasicMaterial({color:cols[i%4],transparent:true}));m.userData.v=new THREE.Vector3((Math.random()-.5)*8,Math.random()*6,(Math.random()-.5)*8);g.add(m)}g.position.copy(pos);scene.add(g);state.effects.push({mesh:g,life:big?2.6:1.5,explosion:true})}
function damageBuildingV3(b,pos,source='enemy'){if(!b||b.userData.destroyed)return;b.userData.hp-=55;explodeV3(pos,b.userData.hp<=0);if(source!=='player'){state.coins=Math.max(0,state.coins-1000);persist();ui();toast('ЗДАНИЕ ПОРАЖЕНО · −1 000 ₽');}if(b.userData.hp<=0){b.userData.destroyed=true;explodeV3(b.position.clone().add(new THREE.Vector3(0,3,0)),true);b.children.forEach(o=>{if(o.isMesh){o.userData.rubble=true;o.userData.v=new THREE.Vector3((Math.random()-.5)*5,2+Math.random()*5,(Math.random()-.5)*5);o.userData.spin=new THREE.Vector3(Math.random()*4,Math.random()*4,Math.random()*4);}});b.userData.rubbleLife=3.2;toast('ЗДАНИЕ РАЗРУШЕНО · −1 000 ₽');}}
function launchIntercept(){
 if(!state.running||state.paused)return;
 if(flight.mode!=='manual'){
  if(!flight.missile)buildPlayerMissile();
  const m=flight.missile;m.position.copy(camera.position).add(new THREE.Vector3(0,-.4,-2).applyQuaternion(camera.quaternion));m.quaternion.copy(camera.quaternion);
  flight.mode='manual';flight.heading=0;flight.pitch=0;flight.fuel=100;flight.lock=0;
  $('flightFire').innerHTML='↩ ВЕРНУТЬСЯ';$('flightTitle').textContent='КАМЕРА РАКЕТЫ · РУЧНОЙ ПОЛЁТ';sound('shot');
  $('flightStatus').innerHTML='<b>РАКЕТА ЗАПУЩЕНА</b><br>ЛЕВЫЙ ДЖОЙСТИК — КУРС / ТАНГАЖ<br>ПРАВЫЙ — КРЕН / ТЯГА<br>ПОПАДИ В ЦЕЛЬ САМОСТОЯТЕЛЬНО';return;
 }
 flight.mode='idle';$('flightFire').innerHTML='🚀 ЗАПУСТИТЬ<br>РАКЕТУ';$('flightTitle').textContent='ПЕРЕХВАТЧИК · NIGHTHAWK-03';camera.position.set(0,6,17);camera.lookAt(0,3,-35);toast('ВОЗВРАТ К ПУСКОВОЙ ПОЗИЦИИ');
}
function updateFlight(dt){
 if(!flight.missile||!state.running||state.paused||flight.mode!=='manual')return;
 const m=flight.missile;flight.heading-=flight.steerX*dt*1.5;flight.pitch=Math.max(-1,Math.min(1,flight.pitch-flight.steerY*dt*1.2));flight.speed=18+flight.throttle*42;flight.fuel-=dt*(.6+flight.throttle*.8);
 m.rotation.order='YXZ';m.rotation.y=flight.heading;m.rotation.x=flight.pitch;m.rotation.z=-flight.roll*.5;m.translateZ(-flight.speed*dt);
 const fwd=new THREE.Vector3(0,0,-1).applyQuaternion(m.quaternion),cam=m.position.clone().addScaledVector(fwd,-5.5);cam.y+=1.1;camera.position.lerp(cam,Math.min(1,dt*8));camera.quaternion.slerp(m.quaternion,Math.min(1,dt*7));
 for(const t of state.targets){if(t.dead)continue;const r=t.boss?2.1:1.15;if(m.position.distanceTo(t.group.position)<r+.5){const p=t.group.position.clone();kill(t);explodeV3(p,t.boss);flight.mode='idle';$('flightFire').innerHTML='🚀 ЗАПУСТИТЬ<br>РАКЕТУ';camera.position.set(0,6,17);camera.lookAt(0,3,-35);toast('ПРЯМОЕ ПОПАДАНИЕ · +'+t.value+' ₽');return}}
 for(const b of city){if(!b.userData||!b.userData.building||b.userData.destroyed)continue;const base=b.userData.base,par=base.geometry.parameters;if(Math.abs(m.position.x-b.position.x)<(par.width||4)*.55&&Math.abs(m.position.z-b.position.z)<(par.depth||4)*.55&&m.position.y<(par.height||8)+1){damageBuildingV3(b,m.position.clone(),'player');flight.mode='idle';$('flightFire').innerHTML='🚀 ЗАПУСТИТЬ<br>РАКЕТУ';camera.position.set(0,6,17);camera.lookAt(0,3,-35);return}}
 if(flight.fuel<=0||m.position.length()>220){flight.mode='idle';$('flightFire').innerHTML='🚀 ЗАПУСТИТЬ<br>РАКЕТУ';camera.position.set(0,6,17);camera.lookAt(0,3,-35);toast('РАКЕТА ПОТЕРЯНА');return}
 $('speedRead').textContent=Math.round(flight.speed*12)+' км/ч';$('altitudeRead').textContent=Math.round(m.position.y*90)+' м';$('fuelRead').textContent=Math.max(0,Math.round(flight.fuel))+'%';
}
const animateBaseV3=animate;animate=function(){if(state.running&&!state.paused){randomPathTargets();airTrafficV3();for(const t of state.targets){if(!t.dead&&t.group.position.z>8){const pos=t.group.position.clone();t.dead=true;scene.remove(t.group);const buildings=city.filter(b=>b.userData&&b.userData.building&&!b.userData.destroyed).sort((a,b)=>a.position.distanceTo(pos)-b.position.distanceTo(pos));if(buildings.length&&buildings[0].position.distanceTo(pos)<34){damageBuildingV3(buildings[0],buildings[0].position.clone());state.hp=Math.max(0,state.hp-3)}else state.hp=Math.max(0,state.hp-5)}}}animateBaseV3();for(const e of state.effects){if(e.explosion&&e.mesh.isGroup){e.life-=.016;e.mesh.scale.multiplyScalar(1.012);e.mesh.children.forEach(p=>{p.position.addScaledVector(p.userData.v||new THREE.Vector3(),.012);p.material.opacity=Math.max(0,e.life/2.6)});if(e.life<=0)scene.remove(e.mesh)}}state.effects=state.effects.filter(e=>!e.explosion||e.life>0)};


/* STABILITY PATCH: explicit launch button, auth persistence and real city-impact events */
try{if(auth)auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(()=>{});}catch(e){}
const launchControl=$('flightFire');
if(launchControl){
 launchControl.style.display='block';launchControl.style.visibility='visible';launchControl.style.pointerEvents='auto';
 launchControl.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(!state.running){toast('СНАЧАЛА НАЖМИ «НАЧАТЬ СМЕНУ»');return;}launchIntercept();});
 launchControl.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();},{passive:false});
}
function applyTargetImpact(t){
 if(!t||t.dead)return;
 const pos=t.group.position.clone();
 t.dead=true;scene.remove(t.group);
 const buildings=city.filter(b=>b.userData&&b.userData.building&&!b.userData.destroyed);
 let closest=null,dist=Infinity;
 for(const b of buildings){const d=b.position.distanceTo(pos);if(d<dist){dist=d;closest=b;}}
 if(closest&&dist<48){damageBuildingV3(closest,pos);state.hp=Math.max(0,state.hp-(t.boss?18:4));toast('УДАР ПО ГОРОДУ · ЗДАНИЕ ПОВРЕЖДЕНО');}
 else{explodeV3(pos,t.boss);state.hp=Math.max(0,state.hp-(t.boss?18:4));}
 if(state.hp<=0){state.running=false;$('menu').classList.remove('hide');$('menuNotice').textContent='Оборона прорвана. Улучши систему и попробуй снова.';}
 ui();
}
function randomPathTargets(){
 for(const t of state.targets){
  if(t.dead)continue;
  if(!t.flightPath)t.flightPath={phase:Math.random()*6.28,amp:1.4+Math.random()*3.6,goal:new THREE.Vector3((Math.random()-.5)*70,4+Math.random()*22,-20-Math.random()*100),change:performance.now()+1800+Math.random()*2600};
  const p=performance.now(),f=t.flightPath;
  if(p>f.change||t.group.position.distanceTo(f.goal)<5){f.goal.set((Math.random()-.5)*70,3+Math.random()*24,-15-Math.random()*115);f.change=p+1700+Math.random()*3000;}
  const dir=f.goal.clone().sub(t.group.position).normalize();
  t.group.position.addScaledVector(dir,t.speed*2.8*(1/60));
  t.group.rotation.y=Math.atan2(dir.x,dir.z);
  t.group.position.y+=Math.sin(p*.002+f.phase)*.009;
  if(t.group.userData.prop)t.group.userData.prop.rotation.z+=.45;
  t.group.traverse(o=>{if(o.userData.rotor)o.rotation.y+=.6});
 }
}


/* MOSCOW LANDMARKS */
function landmarkLabel(text,x,y,z){
 const cv=document.createElement('canvas');cv.width=512;cv.height=96;const cx=cv.getContext('2d');cx.font='bold 34px system-ui';cx.textAlign='center';cx.fillStyle='#07120b';cx.fillRect(0,0,512,96);cx.strokeStyle='#9dff85';cx.lineWidth=3;cx.strokeRect(3,3,506,90);cx.fillStyle='#eaffdf';cx.fillText(text,256,60);
 const tex=new THREE.CanvasTexture(cv);const m=new THREE.Mesh(new THREE.PlaneGeometry(12,2.25),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));m.position.set(x,y,z);scene.add(m);
}
function addMoscowLandmarks(){
 const stone=mat(0x8b8a76),red=mat(0x9a3028),roof=mat(0x244d36),gold=mat(0xd9b34e,.35,.6),glass=new THREE.MeshStandardMaterial({color:0x315a62,metalness:.65,roughness:.2,emissive:0x102a30});
 const basil=new THREE.Group();basil.position.set(-28,0,-58);const base=new THREE.Mesh(new THREE.BoxGeometry(15,5,10),red);base.position.y=2.5;basil.add(base);
 for(let i=0;i<5;i++){const x=(i%3-1)*4.5,z=(i<3?-2.6:2.6),tower=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.6,5,10),stone);tower.position.set(x,7,z);basil.add(tower);const dome=new THREE.Mesh(new THREE.SphereGeometry(1.45,12,8),i%2?roof:gold);dome.scale.y=1.3;dome.position.set(x,10,z);basil.add(dome);const sp=new THREE.Mesh(new THREE.ConeGeometry(.65,2.4,10),i%2?gold:red);sp.position.set(x,12,z);basil.add(sp)}scene.add(basil);landmarkLabel('СОБОР ВАСИЛИЯ БЛАЖЕННОГО',-28,15,-58);
 const skyline=new THREE.Group();skyline.position.set(29,0,-93);for(let i=0;i<7;i++){const h=12+Math.random()*22,w=3+Math.random()*3,b=new THREE.Mesh(new THREE.BoxGeometry(w,h,4),glass);b.position.set((i-3)*4,h/2,Math.random()*5);skyline.add(b);for(let y=2;y<h;y+=2.5){const line=new THREE.Mesh(new THREE.BoxGeometry(w+.04,.07,4.05),gold);line.position.set(b.position.x,y,b.position.z);skyline.add(line)}}scene.add(skyline);landmarkLabel('МОСКВА-СИТИ',29,32,-93);
 const ost=new THREE.Group();ost.position.set(-31,0,-120);const mast=new THREE.Mesh(new THREE.CylinderGeometry(.25,1.3,31,10),stone);mast.position.y=15.5;ost.add(mast);for(let y of [9,16,23]){const ring=new THREE.Mesh(new THREE.CylinderGeometry(2.4,2.4,.55,12),stone);ring.position.y=y;ost.add(ring)}const antenna=new THREE.Mesh(new THREE.CylinderGeometry(.06,.2,10,8),gold);antenna.position.y=36;ost.add(antenna);scene.add(ost);landmarkLabel('ОСТАНКИНСКАЯ БАШНЯ',-31,39,-120);
 const theatre=new THREE.Group();theatre.position.set(0,0,-111);const hall=new THREE.Mesh(new THREE.BoxGeometry(17,7,8),stone);hall.position.y=3.5;theatre.add(hall);for(let x=-6;x<=6;x+=3){const col=new THREE.Mesh(new THREE.CylinderGeometry(.28,.32,4.5,10),gold);col.position.set(x,4.8,4.1);theatre.add(col)}const ped=new THREE.Mesh(new THREE.ConeGeometry(7,2.6,4),red);ped.rotation.y=Math.PI/4;ped.position.set(0,8.1,-1);theatre.add(ped);scene.add(theatre);landmarkLabel('БОЛЬШОЙ ТЕАТР',0,11,-111);
 const stadium=new THREE.Group();stadium.position.set(30,0,-35);const bowl=new THREE.Mesh(new THREE.CylinderGeometry(10,12,3,32,1,true),stone);bowl.position.y=1.5;stadium.add(bowl);const field=new THREE.Mesh(new THREE.CircleGeometry(8,32),mat(0x275c35));field.rotation.x=-Math.PI/2;field.position.y=3.05;stadium.add(field);const rim=new THREE.Mesh(new THREE.TorusGeometry(11,.65,8,32),gold);rim.rotation.x=Math.PI/2;rim.position.y=3;stadium.add(rim);scene.add(stadium);landmarkLabel('ЛУЖНИКИ',30,7,-35);
}
const setupMoscowBase=setup3D;setup3D=function(){setupMoscowBase();addMoscowLandmarks();};


/* === MOSCOW 3D SIMULATOR OVERHAUL =========================================
   Keeps the existing GloBIT/Firebase/shop/save layer while replacing the
   small arena with a large instanced city and fully manual missile flight.
   World unit: 5 metres. UI-map zoom is independent of world coordinates.
============================================================================ */

const WORLD = {
  half: 600,
  metresPerUnit: 5,
  roadStep: 92,
  buildingStep: 30,
  mapZoom: 1,
  quality: 'high',
  sensitivity: 1,
  wavePending: false,
  waveAt: 0,
  collisionClock: 0,
  trailClock: 0,
  traffic: [],
  launchPad: null,
  buildingMeshes: [],
  roofMesh: null,
  windowMeshes: [],
  debris: [],
  landmarks: []
};

const MOSCOW_LOCATIONS = {
  kremlin: {name:'Кремль / Красная площадь', x:-38, z:-26},
  tverskaya: {name:'Тверская улица', x:8, z:-5},
  city: {name:'Москва-Сити', x:145, z:-112},
  luzhniki: {name:'Лужники', x:-165, z:112},
  ostankino: {name:'Останкинская башня', x:18, z:-267},
  industry: {name:'Промышленная зона', x:290, z:218},
  airport: {name:'Аэропорт', x:405, z:355},
  park: {name:'Парк и лесной массив', x:-275, z:-215},
  outskirts: {name:'Окраины / шоссе', x:505, z:490}
};

const ROCKETS = {
  falcon: {name:'Сокол · универсальный', maxSpeed:46, acceleration:20, fuel:100, color:0xb9d1c1, note:'Сбалансированные скорость и управляемость'},
  swift: {name:'Стриж · манёвренный', maxSpeed:39, acceleration:25, fuel:115, color:0x77c9ee, note:'Быстро реагирует на поворот и расходует меньше энергии'},
  thunder: {name:'Гром · скоростной', maxSpeed:64, acceleration:17, fuel:82, color:0xffbd80, note:'Высокая скорость, но больший радиус поворота'}
};

let selectedRocket = 'falcon';
let selectedLocation = 'tverskaya';
let flightUIReady = false;
let mapCanvas = null;
let launchMapCanvas = null;
let rebindAction = null;
const heldKeys = new Set();
const keyBindings = {left:'a',right:'d',forward:'w',back:'s',pitchUp:'arrowup',pitchDown:'arrowdown',rollLeft:'q',rollRight:'e',camera:'c'};
let lastMapDraw = 0;
let waveTransitionMessage = '';
let playerEnded = false;
let playerTrailPoints = [];
let playerTrail = null;
let explosionLight = null;
let lastTrafficSpawn = 0;

function clampValue(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distanceXZ(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function addUiStyle() {
  const style = document.createElement('style');
  style.textContent = [
    '#flightUI{position:fixed;inset:0;z-index:7;pointer-events:none;color:#e2ffe9;font-family:Inter,system-ui,sans-serif;text-shadow:0 0 8px #65ff8b}',
    '#flightUI *{box-sizing:border-box} #flightUI button,#flightUI input,#flightUI select{pointer-events:auto}',
    '.sim-top{position:absolute;top:12px;left:12px;right:12px;display:flex;align-items:flex-start;justify-content:space-between;gap:10px}',
    '.sim-brand,.sim-card{background:rgba(3,17,13,.84);border:1px solid #8affaa63;border-radius:10px;backdrop-filter:blur(10px);box-shadow:0 0 22px #55ff7714;padding:10px 12px}',
    '.sim-brand{font-size:10px;letter-spacing:.16em;font-weight:900;line-height:1.55}.sim-brand span{font-weight:500;color:#a5cbb0;letter-spacing:.05em}',
    '.sim-stats{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.sim-stat{min-width:76px;text-align:center}.sim-label{font-size:8px;letter-spacing:.16em;color:#a5d9b2}.sim-value{font-size:clamp(13px,2vw,20px);font-weight:900;margin-top:4px}',
    '.sim-actions{position:absolute;right:12px;top:92px;display:flex;gap:6px;flex-direction:column;align-items:flex-end;pointer-events:auto}',
    '.sim-btn{border:1px solid #8affaa7c;background:linear-gradient(145deg,#143321,#05120a);color:#eaffee;border-radius:8px;padding:9px 11px;font-weight:850;font-size:10px;letter-spacing:.05em;min-width:92px}',
    '.sim-btn.active{background:#c4ffc4;color:#06130a}.sim-map{position:absolute;left:12px;top:94px;width:184px;padding:7px;border-radius:11px;background:rgba(3,15,13,.84);border:1px solid #8affaa65;pointer-events:auto}',
    '.sim-map-head{display:flex;align-items:center;justify-content:space-between;font-size:9px;letter-spacing:.13em;margin:0 0 5px}.sim-map-head button{padding:2px 7px;min-width:25px;border-radius:5px;background:#11251a;border:1px solid #80d99b;color:#eaffee}',
    '#tacticalMap{display:block;width:100%;aspect-ratio:1;touch-action:manipulation;border-radius:6px;background:#071511}',
    '.sim-map-foot{font-size:8px;color:#9bc4a7;margin-top:4px;line-height:1.4}.sim-status{position:absolute;left:12px;bottom:174px;padding:8px 10px;max-width:210px;font-size:9px;line-height:1.55}',
    '.sim-bottom{position:absolute;left:12px;right:12px;bottom:12px;display:flex;justify-content:space-between;align-items:flex-end;gap:12px}',
    '.sim-joy-wrap{display:flex;flex-direction:column;align-items:center;gap:5px;color:#cbffda;font-size:8px;letter-spacing:.14em;pointer-events:auto;user-select:none}',
    '.sim-joystick{position:relative;width:clamp(92px,12vw,132px);height:clamp(92px,12vw,132px);border-radius:50%;touch-action:none;background:radial-gradient(circle,#173c27 0,#07170f 60%,#030905 71%);border:1px solid #8affaa8f;box-shadow:inset 0 0 22px #55ff7730,0 0 18px #46ff6717}',
    '.sim-joystick:before{content:"";position:absolute;inset:20%;border:1px dashed #7eff9970;border-radius:50%}',
    '.sim-knob{position:absolute;left:31%;top:31%;width:38%;height:38%;border-radius:50%;background:radial-gradient(circle at 35% 30%,#f1fff0,#52d97a 43%,#174a2c);border:2px solid #d4ffe0;box-shadow:0 0 16px #68ff8a75;transform:translate(0,0)}',
    '.sim-bottom-hint{font-size:8px;color:#a5cdb0;text-align:center;line-height:1.5;max-width:130px}.sim-overlay{position:absolute;inset:0;z-index:9;display:none;place-items:center;padding:18px;background:#010805c9;pointer-events:auto}',
    '.sim-overlay-card{width:min(420px,94vw);padding:24px;background:linear-gradient(145deg,#0d2317,#040b07);border:1px solid #9dff8a78;border-radius:16px;box-shadow:0 0 50px #69ff8519;text-align:center}',
    '.sim-overlay-card h2{font-size:clamp(24px,5vw,36px);letter-spacing:-.04em;margin:0 0 10px}.sim-overlay-card p{font-size:12px;color:#b4d1bb;line-height:1.6}.sim-overlay-row{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:14px}',
    '.sim-select{width:100%;padding:9px;background:#06100b;color:#e7ffeb;border:1px solid #6c9f75;border-radius:7px;margin:4px 0 9px;font:inherit}',
    '.sim-range{width:100%;accent-color:#9dff9c}.sim-settings{display:none;position:absolute;right:112px;top:92px;width:min(260px,60vw);padding:12px;background:#06140eeF;border:1px solid #8affaa7c;border-radius:10px;pointer-events:auto;font-size:10px;line-height:1.6}',
    '.sim-settings label{display:block;margin:5px 0;color:#c8e6ce}.sim-result-number{color:#bfffac;font-size:22px;font-weight:900}',
    '#launchMapPreview{width:100%;height:185px;display:block;border-radius:7px;background:#061410;border:1px solid #355b41}',
    '@media(max-width:760px){.sim-map{width:136px;left:7px;top:100px}.sim-status{left:7px;bottom:135px;max-width:145px;font-size:8px}.sim-actions{right:7px;top:96px}.sim-btn{min-width:78px;padding:8px 7px;font-size:9px}.sim-brand{font-size:8px;padding:7px}.sim-stats{gap:4px}.sim-stat{min-width:53px;padding:6px}.sim-label{font-size:7px}.sim-value{font-size:13px}.sim-bottom{left:7px;right:7px;bottom:7px}.sim-joystick{width:clamp(76px,21vw,105px);height:clamp(76px,21vw,105px)}.sim-bottom-hint{display:none}}',
    '@media(max-height:490px){.sim-joystick{width:78px;height:78px}.sim-bottom{bottom:5px}.sim-status{bottom:104px}.sim-map{width:116px;top:75px}.sim-actions{top:75px}.sim-card,.sim-brand{padding:6px 8px}.sim-btn{padding:6px 7px}.sim-bottom-hint{font-size:7px}}',
    '@media(orientation:portrait) and (max-width:800px){#menu{display:grid!important}#flightUI{visibility:visible!important}#orientWarning{display:none!important}}',
    '@media(orientation:portrait) and (max-width:760px){.sim-map{top:108px;width:122px}.sim-status{left:7px;bottom:150px}.sim-bottom{align-items:flex-end}.sim-actions{top:100px}}',
    '@media(prefers-reduced-motion:reduce){.sim-joystick,.sim-btn{transition:none}}',
    '#menu .sim-launch-card{grid-column:1/-1}.sim-launch-layout{display:grid;grid-template-columns:1fr minmax(190px,.8fr);gap:12px;align-items:start}.sim-launch-card .small{margin:3px 0 8px}',
    '@media(max-width:650px){.sim-launch-layout{grid-template-columns:1fr}#launchMapPreview{height:145px}}'
  ].join('\n');
  document.head.appendChild(style);
}

function mountFlightUI() {
  if (flightUIReady) return;
  flightUIReady = true;
  addUiStyle();

  const launchSection = document.createElement('section');
  launchSection.className = 'box sim-launch-card';
  launchSection.innerHTML = [
    '<h3>ПОДГОТОВКА К ПОЛЁТУ</h3>',
    '<div class="sim-launch-layout"><div>',
    '<label class="small" for="rocketSelect">ПЕРЕХВАТЧИК</label>',
    '<select id="rocketSelect" class="sim-select"><option value="falcon">Сокол · универсальный</option><option value="swift">Стриж · манёвренный</option><option value="thunder">Гром · скоростной</option></select>',
    '<label class="small" for="launchLocation">ТОЧКА СТАРТА</label>',
    '<select id="launchLocation" class="sim-select"></select>',
    '<div id="rocketInfo" class="small">Сбалансированные скорость и управляемость</div>',
    '<div class="shopline"><span>Игровой масштаб</span><b>1 ед. = 5 м</b></div>',
    '<div class="small">Карта интерфейса масштабируется отдельно от геометрии и физики. Мир — большой свободный район Москвы с дорогами, рекой, парками и аэропортом.</div>',
    '</div><div><canvas id="launchMapPreview" width="420" height="250"></canvas><div class="small">Щёлкни по карте, чтобы отметить ориентир. Маркер не управляет ракетой автоматически.</div></div></div>'
  ].join('');
  const grid = document.querySelector('#menu .menu-grid');
  if (grid) grid.appendChild(launchSection);

  const oldStart = $('startBtn');
  if (oldStart) oldStart.innerHTML = '▶ НАЧАТЬ СМЕНУ <span>→</span>';

  const uiRoot = document.createElement('div');
  uiRoot.id = 'flightUI';
  uiRoot.innerHTML = [
    '<div class="sim-top">',
      '<div class="sim-brand">GLOBIT // MOSCOW 3D<br><span id="flightTitle">NIGHTHAWK · РУЧНОЙ ПОЛЁТ</span></div>',
      '<div class="sim-stats">',
        '<div class="sim-card sim-stat"><div class="sim-label">СКОРОСТЬ</div><div class="sim-value" id="speedRead">0 км/ч</div></div>',
        '<div class="sim-card sim-stat"><div class="sim-label">ВЫСОТА</div><div class="sim-value" id="altitudeRead">0 м</div></div>',
        '<div class="sim-card sim-stat"><div class="sim-label">ТОПЛИВО</div><div class="sim-value" id="fuelRead">100%</div></div>',
        '<div class="sim-card sim-stat"><div class="sim-label">ЗАЩИТА ГОРОДА</div><div class="sim-value" id="flightCityHp">100%</div></div>',
        '<div class="sim-card sim-stat"><div class="sim-label">БАЛАНС</div><div class="sim-value" id="flightCoins">0 ₽</div></div>',
      '</div>',
    '</div>',
    '<div class="sim-map" id="mapPanel"><div class="sim-map-head"><span>КАРТА · 3D СЕКТОР</span><span><button id="mapZoomOut" aria-label="Отдалить карту">−</button> <button id="mapZoomIn" aria-label="Приблизить карту">+</button></span></div><canvas id="tacticalMap" width="256" height="256"></canvas><div class="sim-map-foot" id="mapCoordinates">КООРДИНАТЫ: —</div></div>',
    '<div class="sim-actions">',
      '<button class="sim-btn" id="cameraToggle">◉ ВНЕШНЯЯ КАМЕРА</button>',
      '<button class="sim-btn" id="mapToggle">▦ КАРТА: ВКЛ</button>',
      '<button class="sim-btn" id="settingsToggle">⚙ НАСТРОЙКИ</button>',
      '<button class="sim-btn" id="simPause">Ⅱ ПАУЗА</button>',
      '<button class="sim-btn" id="returnMenu">↩ В АНГАР</button>',
    '</div>',
    '<div class="sim-settings" id="simSettings">',
      '<b>УПРАВЛЕНИЕ И ГРАФИКА</b>',
      '<label for="sensitivityRange">Чувствительность: <span id="sensitivityValue">100%</span></label><input class="sim-range" id="sensitivityRange" type="range" min="40" max="180" value="100">',
      '<label for="graphicsSelect">Качество графики</label><select class="sim-select" id="graphicsSelect"><option value="high">Высокое</option><option value="medium">Среднее</option><option value="low">Производительное</option></select>',
      '<label for="rebindActionSelect">Действие для переназначения</label><select class="sim-select" id="rebindActionSelect"><option value="left">Поворот влево</option><option value="right">Поворот вправо</option><option value="forward">Увеличить тягу</option><option value="back">Снизить тягу</option><option value="pitchUp">Набор высоты</option><option value="pitchDown">Снижение</option><option value="rollLeft">Крен влево</option><option value="rollRight">Крен вправо</option><option value="camera">Смена камеры</option></select>',
      '<button class="sim-btn" id="rebindKey">⌨ НАЗНАЧИТЬ КЛАВИШУ</button>',
      '<div id="keyHelp">W/S — тяга · A/D — курс · ↑/↓ — тангаж · Q/E — крен · C — камера</div>',
    '</div>',
    '<div class="sim-card sim-status" id="flightStatus"><b>ГОТОВ К ПУСКУ</b><br>Управление полностью ручное.</div>',
    '<div class="sim-bottom">',
      '<div class="sim-joy-wrap"><span>ЛЕВЫЙ · КУРС / ТЯГА</span><div class="sim-joystick" id="joySteer"><div class="sim-knob"></div></div><div class="sim-bottom-hint">Влево / вправо — курс<br>Вверх / вниз — тяга</div></div>',
      '<div class="sim-bottom-hint">КАМЕРА НА НОСУ РАКЕТЫ<br>КУРС И ИМПУЛЬС ИМЕЮТ ИНЕРЦИЮ</div>',
      '<div class="sim-joy-wrap"><span>ПРАВЫЙ · ТАНГАЖ / КРЕН</span><div class="sim-joystick" id="joyThrottle"><div class="sim-knob"></div></div><div class="sim-bottom-hint">Вверх / вниз — высота<br>Влево / вправо — крен</div></div>',
    '</div>',
    '<div class="sim-overlay" id="pauseOverlay"><div class="sim-overlay-card"><h2>ПАУЗА</h2><p>Полёт и игровые события приостановлены.</p><div class="sim-overlay-row"><button class="sim-btn active" id="continueFlight">▶ ПРОДОЛЖИТЬ</button><button class="sim-btn" id="pauseHangar">В АНГАР</button></div></div></div>',
    '<div class="sim-overlay" id="resultOverlay"><div class="sim-overlay-card"><div class="sim-label">ПОЛЁТ ЗАВЕРШЁН</div><h2 id="resultTitle">МИССИЯ ОКОНЧЕНА</h2><p id="resultText"></p><div class="sim-result-number" id="resultBalance">0 ₽</div><div class="sim-overlay-row"><button class="sim-btn active" id="retryFlight">🚀 ПОВТОРИТЬ ПОЛЁТ</button><button class="sim-btn" id="resultHangar">В АНГАР</button></div></div></div>'
  ].join('');
  document.body.appendChild(uiRoot);

  const rocketSelect = $('rocketSelect');
  Object.keys(ROCKETS).forEach(key => {
    const option = rocketSelect && rocketSelect.querySelector('option[value="' + key + '"]');
    if (option) option.textContent = ROCKETS[key].name;
  });
  const locationSelect = $('launchLocation');
  if (locationSelect) {
    Object.keys(MOSCOW_LOCATIONS).forEach(key => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = MOSCOW_LOCATIONS[key].name;
      locationSelect.appendChild(option);
    });
    locationSelect.value = selectedLocation;
  }

  mapCanvas = $('tacticalMap');
  launchMapCanvas = $('launchMapPreview');

  if (rocketSelect) rocketSelect.addEventListener('change', () => {
    selectedRocket = rocketSelect.value;
    if ($('rocketInfo')) $('rocketInfo').textContent = ROCKETS[selectedRocket].note;
    if (flight.missile && flight.mode === 'manual') toast('Новая модель будет выбрана при следующем запуске.');
    else if (flight.missile && scene) { buildPlayerMissile(); updateLaunchPreview(); }
  });
  if (locationSelect) locationSelect.addEventListener('change', () => {
    selectedLocation = locationSelect.value;
    updateLaunchPreview();
    drawLaunchMap();
  });

  $('startBtn').onclick = start;
  $('resumeBtn').onclick = () => {
    $('menu').classList.add('hide');
    if (state.running) state.paused = false;
  };
  $('simPause').onclick = pause;
  $('continueFlight').onclick = () => { state.paused = false; updatePauseOverlay(); };
  $('pauseHangar').onclick = returnToHangar;
  $('returnMenu').onclick = returnToHangar;
  $('resultHangar').onclick = returnToHangar;
  $('retryFlight').onclick = () => { $('resultOverlay').style.display = 'none'; start(); };
  $('cameraToggle').onclick = toggleFlightCamera;
  $('mapToggle').onclick = () => {
    const panel = $('mapPanel');
    const hidden = panel.style.display === 'none';
    panel.style.display = hidden ? 'block' : 'none';
    $('mapToggle').textContent = hidden ? '▦ КАРТА: ВКЛ' : '▦ КАРТА: ВЫКЛ';
  };
  $('mapZoomIn').onclick = () => { WORLD.mapZoom = clampValue(WORLD.mapZoom * 1.35, .55, 4); drawTacticalMap(); };
  $('mapZoomOut').onclick = () => { WORLD.mapZoom = clampValue(WORLD.mapZoom / 1.35, .55, 4); drawTacticalMap(); };
  $('settingsToggle').onclick = () => {
    const box = $('simSettings');
    box.style.display = box.style.display === 'block' ? 'none' : 'block';
  };
  $('sensitivityRange').oninput = e => {
    WORLD.sensitivity = Number(e.target.value) / 100;
    $('sensitivityValue').textContent = e.target.value + '%';
  };
  $('graphicsSelect').onchange = e => applyGraphicsQuality(e.target.value);
  $('rebindKey').onclick = () => {
    rebindAction = $('rebindActionSelect').value;
    $('rebindKey').textContent = 'НАЖМИ НОВУЮ КЛАВИШУ…';
    $('keyHelp').textContent = 'Нажми клавишу для выбранного действия. Esc отменяет.';
  };
  launchMapCanvas.addEventListener('click', e => {
    const rect = launchMapCanvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const wx = (x * 2 - 1) * WORLD.half;
    const wz = (y * 2 - 1) * WORLD.half;
    $('menuNotice').textContent = 'Ориентир отмечен: X ' + Math.round(wx) + ' / Z ' + Math.round(wz) + '. Выбери старт в списке; ракета летит только вручную.';
  });

  setupFlightJoysticks();
  if (!$('orientWarning')) {
    const orientationNotice = document.createElement('div');
    orientationNotice.id = 'orientWarning';
    orientationNotice.style.display = 'none';
    orientationNotice.textContent = 'Управление доступно в портретной и альбомной ориентации.';
    document.body.appendChild(orientationNotice);
  }
  drawLaunchMap();
  updatePauseOverlay();
}

function applyGraphicsQuality(value) {
  WORLD.quality = value;
  if (!renderer) return;
  const ratio = value === 'low' ? 1 : value === 'medium' ? 1.25 : Math.min(window.devicePixelRatio || 1, 1.6);
  renderer.setPixelRatio(ratio);
  renderer.shadowMap.enabled = value === 'high';
  renderer.setSize(innerWidth, innerHeight);
  toast('Графика: ' + (value === 'high' ? 'высокая' : value === 'medium' ? 'средняя' : 'производительная'));
}

function drawMapOnCanvas(canvas, includePlayer) {
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#07140f';
  ctx.fillRect(0, 0, w, h);
  const zoom = includePlayer ? WORLD.mapZoom : .72;
  const playerX = flight.missile ? flight.missile.position.x : MOSCOW_LOCATIONS[selectedLocation].x;
  const playerZ = flight.missile ? flight.missile.position.z : MOSCOW_LOCATIONS[selectedLocation].z;
  const span = WORLD.half / zoom;
  const mapX = x => w / 2 + (x - playerX) / (span * 2) * w;
  const mapY = z => h / 2 + (z - playerZ) / (span * 2) * h;

  ctx.strokeStyle = '#183c2a';
  ctx.lineWidth = 1;
  for (let x = -WORLD.half; x <= WORLD.half; x += WORLD.roadStep) {
    const px = mapX(x);
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke();
  }
  for (let z = -WORLD.half; z <= WORLD.half; z += WORLD.roadStep) {
    const py = mapY(z);
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w, py); ctx.stroke();
  }
  ctx.strokeStyle = '#267c83';
  ctx.lineWidth = Math.max(2, w / 90);
  ctx.beginPath();
  for (let i = 0; i <= 20; i++) {
    const x = -WORLD.half + i * WORLD.half * 2 / 20;
    const z = x * .22 + 30;
    if (i === 0) ctx.moveTo(mapX(x), mapY(z)); else ctx.lineTo(mapX(x), mapY(z));
  }
  ctx.stroke();

  Object.keys(MOSCOW_LOCATIONS).forEach(key => {
    const loc = MOSCOW_LOCATIONS[key];
    const x = mapX(loc.x), y = mapY(loc.z);
    if (x < -12 || x > w + 12 || y < -12 || y > h + 12) return;
    ctx.fillStyle = key === 'kremlin' ? '#f9d27c' : '#67a9d5';
    ctx.beginPath(); ctx.arc(x, y, Math.max(2.5, w / 65), 0, Math.PI * 2); ctx.fill();
    if (w > 180) {
      ctx.font = '9px system-ui';
      ctx.fillStyle = '#cbe8d2';
      ctx.fillText(loc.name.split(' / ')[0].split(' ')[0], x + 4, y - 4);
    }
  });

  if (state.targets) {
    state.targets.forEach(t => {
      if (t.dead || !t.group) return;
      const x = mapX(t.group.position.x), y = mapY(t.group.position.z);
      if (x < 0 || x > w || y < 0 || y > h) return;
      ctx.fillStyle = t.boss ? '#ff5757' : '#ff9c66';
      ctx.beginPath(); ctx.arc(x, y, t.boss ? 4 : 2.7, 0, Math.PI * 2); ctx.fill();
    });
  }

  if (flight.missile && includePlayer) {
    const x = mapX(flight.missile.position.x), y = mapY(flight.missile.position.z);
    ctx.save(); ctx.translate(x, y); ctx.rotate(-flight.heading);
    ctx.fillStyle = '#aaff9a'; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(5, 5); ctx.lineTo(0, 3); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill(); ctx.restore();
  } else if (!includePlayer) {
    const loc = MOSCOW_LOCATIONS[selectedLocation];
    ctx.fillStyle = '#aaff9a'; ctx.beginPath(); ctx.arc(mapX(loc.x), mapY(loc.z), 5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.strokeStyle = '#75c98c66'; ctx.lineWidth = 1; ctx.strokeRect(.5, .5, w - 1, h - 1);
}

function drawTacticalMap() {
  drawMapOnCanvas(mapCanvas, true);
  if ($('mapCoordinates') && flight.missile) {
    $('mapCoordinates').textContent =
      'X ' + Math.round(flight.missile.position.x) + ' · Z ' + Math.round(flight.missile.position.z) +
      ' · МАСШТАБ ' + WORLD.mapZoom.toFixed(1) + '×';
  }
}

function drawLaunchMap() {
  drawMapOnCanvas(launchMapCanvas, false);
}

function setupFlightJoysticks() {
  if (flightJoysticksReady) return;
  flightJoysticksReady = true;
  const attach = (id, callback) => {
    const element = $(id);
    if (!element) return;
    const knob = element.querySelector('.sim-knob');
    let pointerId = null;
    const move = event => {
      if (pointerId !== event.pointerId) return;
      const rect = element.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const limit = rect.width * .31;
      const length = Math.hypot(dx, dy) || 1;
      const x = dx / length * Math.min(limit, length);
      const y = dy / length * Math.min(limit, length);
      if (knob) knob.style.transform = 'translate(' + x + 'px,' + y + 'px)';
      callback(x / limit, y / limit);
    };
    element.addEventListener('pointerdown', event => {
      pointerId = event.pointerId;
      element.setPointerCapture(pointerId);
      move(event);
      event.preventDefault();
    }, {passive:false});
    element.addEventListener('pointermove', move);
    const end = event => {
      if (pointerId !== event.pointerId) return;
      pointerId = null;
      if (knob) knob.style.transform = 'translate(0,0)';
      callback(0, 0);
    };
    element.addEventListener('pointerup', end);
    element.addEventListener('pointercancel', end);
    element.addEventListener('lostpointercapture', end);
  };
  attach('joySteer', (x, y) => {
    flight.steerX = x;
    flight.steerY = y;
    flight.throttleInput = -y;
  });
  attach('joyThrottle', (x, y) => {
    flight.roll = x;
    flight.pitchInput = -y;
  });
}

function makeFlatBox(width, height, depth, color, x, y, z, parent) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat(color, .8));
  mesh.position.set(x, y, z);
  if (parent) parent.add(mesh); else scene.add(mesh);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

function isParkZone(x, z) {
  const parkA = Math.hypot(x + 275, z + 215) < 108;
  const parkB = Math.hypot(x + 320, z - 270) < 85;
  const riverDistance = Math.abs(z - (x * .22 + 30)) / Math.sqrt(1 + .22 * .22);
  return parkA || parkB || riverDistance < 15;
}

function isLandmarkZone(x, z) {
  return (Math.abs(x + 38) < 58 && Math.abs(z + 26) < 54) ||
    (Math.abs(x - 145) < 50 && Math.abs(z + 112) < 55) ||
    (Math.abs(x - 8) < 28 && Math.abs(z + 5) < 24) ||
    Math.hypot(x - 18, z + 267) < 19 ||
    Math.hypot(x + 165, z - 112) < 34 ||
    (Math.abs(x - 405) < 82 && Math.abs(z - 355) < 72) ||
    (Math.abs(x - 290) < 35 && Math.abs(z - 218) < 28);
}

function districtFor(x, z) {
  if (Math.abs(x - 145) < 110 && z < -42 && z > -205) return 'city';
  if (Math.hypot(x + 38, z + 26) < 125) return 'center';
  if (x > 225 && z > 90 && z < 335) return 'industry';
  if (Math.hypot(x + 275, z + 215) < 125 || Math.hypot(x + 320, z - 270) < 100) return 'park';
  if (Math.abs(x) < 210 && Math.abs(z) < 200) return 'residential';
  return 'outskirts';
}

function makeInstancedBox(geometry, material, transforms, colors) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, transforms.length));
  const dummy = new THREE.Object3D();
  transforms.forEach((entry, i) => {
    dummy.position.copy(entry.position);
    dummy.rotation.set(entry.rotation.x || 0, entry.rotation.y || 0, entry.rotation.z || 0);
    dummy.scale.copy(entry.scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    if (colors && colors[i]) mesh.setColorAt(i, new THREE.Color(colors[i]));
    if (entry.owner) entry.owner.windowRefs.push({mesh, index:i});
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  scene.add(mesh);
  return mesh;
}

function hideInstance(mesh, index) {
  if (!mesh) return;
  const dummy = new THREE.Object3D();
  dummy.position.set(0, -5000, 0);
  dummy.scale.set(.001, .001, .001);
  dummy.updateMatrix();
  mesh.setMatrixAt(index, dummy.matrix);
  mesh.instanceMatrix.needsUpdate = true;
}

function makeCityDistrict() {
  const bodyRecords = [];
  const windowEntries = [[], []];
  const roofEntries = [];
  const roofColors = [];
  const buildingMaterial = new THREE.MeshStandardMaterial({
    color:0x68736b, roughness:.86, metalness:.13, vertexColors:false
  });
  const warmWindowMaterial = new THREE.MeshStandardMaterial({
    color:0xffdba0, emissive:0x8b5926, emissiveIntensity:.62, roughness:.45
  });
  const coolWindowMaterial = new THREE.MeshStandardMaterial({
    color:0x9bc7d0, emissive:0x244f5b, emissiveIntensity:.4, roughness:.4
  });

  for (let x = -WORLD.half + 22; x < WORLD.half - 18; x += WORLD.buildingStep) {
    for (let z = -WORLD.half + 22; z < WORLD.half - 18; z += WORLD.buildingStep) {
      const modX = (x + WORLD.half) % WORLD.roadStep;
      const modZ = (z + WORLD.half) % WORLD.roadStep;
      const roadX = Math.min(modX, WORLD.roadStep - modX);
      const roadZ = Math.min(modZ, WORLD.roadStep - modZ);
      if (roadX < 14 || roadZ < 14) continue;
      if (isParkZone(x, z) || isLandmarkZone(x, z)) continue;
      if (x > 320 && x < 500 && z > 265 && z < 450) continue;

      const district = districtFor(x, z);
      const random = Math.random;
      const w = district === 'industry' ? 18 + random() * 10 : 10 + random() * 10;
      const d = district === 'industry' ? 17 + random() * 9 : 10 + random() * 10;
      let h;
      if (district === 'city') h = 36 + random() * 48;
      else if (district === 'center') h = 18 + random() * 28;
      else if (district === 'industry') h = 9 + random() * 17;
      else if (district === 'outskirts') h = 7 + random() * 15;
      else h = 11 + random() * 22;

      const style = district === 'industry' ? 4 : district === 'city' ? 0 : district === 'center' ? 1 : Math.floor(random() * 4);
      const jitterX = (random() - .5) * 5;
      const jitterZ = (random() - .5) * 5;
      const bx = x + jitterX, bz = z + jitterZ;
      const record = {
        x:bx, z:bz, w, d, h, hp:100, district, style, destroyed:false,
        penaltyCharged:false, damageLevel:0, windowRefs:[], instanceIndex:bodyRecords.length,
        bodyMesh:null, roofIndex:roofEntries.length, baseColor:[0x293b31,0x344238,0x3c4542,0x263b3b,0x4a4b43][style]
      };
      city.push(record);
      bodyRecords.push(record);
      const roofHeight = style === 4 ? .12 : style === 0 ? .55 : .35;
      roofEntries.push({position:new THREE.Vector3(bx,h + roofHeight / 2,bz),scale:new THREE.Vector3(w + .4,roofHeight,d + .4),rotation:new THREE.Vector3()});
      roofColors.push(style === 0 ? 0x53676c : style === 4 ? 0x393f3d : 0x555f53);

      const colsFront = Math.max(2, Math.floor(w / 3.2));
      const floors = Math.min(18, Math.max(2, Math.floor(h / 3.3)));
      for (let level = 0; level < floors; level++) {
        const wy = 2 + level * Math.max(2.5, h / (floors + 1));
        for (let col = 0; col < colsFront; col++) {
          if (wy > h - .6) continue;
          const wx = bx - w / 2 + (col + .5) * w / colsFront;
          if (random() < (district === 'city' ? .72 : .57)) {
            const lightType = random() < .55 ? 0 : 1;
            const transform = {position:new THREE.Vector3(wx,wy,bz + d / 2 + .08),scale:new THREE.Vector3(.68,.78,.08),rotation:new THREE.Vector3(),owner:record};
            windowEntries[lightType].push(transform);
          }
          if (col < 2 && random() < .5) {
            const sz = bz - d / 2 - .08;
            windowEntries[random() < .65 ? 0 : 1].push({
              position:new THREE.Vector3(wx,wy,sz),
              scale:new THREE.Vector3(.68,.78,.08),
              rotation:new THREE.Vector3(0,Math.PI,0),
              owner:record
            });
          }
        }
      }
      const sideRows = Math.min(10, Math.max(2, Math.floor(h / 4)));
      for (let level = 0; level < sideRows; level++) {
        if (random() < .3) continue;
        const wy = 2.3 + level * Math.max(3, h / (sideRows + 1));
        windowEntries[random() < .5 ? 0 : 1].push({
          position:new THREE.Vector3(bx + w / 2 + .08,wy,bz),
          scale:new THREE.Vector3(.68,.78,.08),
          rotation:new THREE.Vector3(0,Math.PI / 2,0),
          owner:record
        });
      }
    }
  }

  const bodyGeometry = new THREE.BoxGeometry(1,1,1);
  const bucketCount = 5;
  for (let style = 0; style < bucketCount; style++) {
    const records = bodyRecords.filter(b => b.style === style);
    if (!records.length) continue;
    const mesh = new THREE.InstancedMesh(bodyGeometry, buildingMaterial, records.length);
    const dummy = new THREE.Object3D();
    records.forEach((b, i) => {
      dummy.position.set(b.x,b.h / 2,b.z);
      dummy.rotation.set(0,0,0);
      dummy.scale.set(b.w,b.h,b.d);
      dummy.updateMatrix();
      mesh.setMatrixAt(i,dummy.matrix);
      mesh.setColorAt(i,new THREE.Color(b.baseColor).offsetHSL((Math.random()-.5)*.03,0,(Math.random()-.5)*.06));
      b.bodyMesh = mesh;
      b.instanceIndex = i;
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = WORLD.quality === 'high';
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    scene.add(mesh);
    WORLD.buildingMeshes.push(mesh);
  }

  WORLD.roofMesh = makeInstancedBox(
    new THREE.BoxGeometry(1,1,1),
    new THREE.MeshStandardMaterial({color:0x555f53,roughness:.9}),
    roofEntries, roofColors
  );

  const windowGeometry = new THREE.BoxGeometry(1,1,1);
  WORLD.windowMeshes = [
    makeInstancedBox(windowGeometry,warmWindowMaterial,windowEntries[0]),
    makeInstancedBox(windowGeometry,coolWindowMaterial,windowEntries[1])
  ];
}

function addStreetAndTerrain() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.half * 2.5, WORLD.half * 2.5),
    new THREE.MeshStandardMaterial({color:0x0a1711,roughness:1})
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -.35;
  ground.receiveShadow = true;
  scene.add(ground);

  for (let x = -WORLD.half; x <= WORLD.half; x += WORLD.roadStep) {
    const width = x % (WORLD.roadStep * 3) === 0 ? 14 : 10;
    makeFlatBox(width,.11,WORLD.half * 2.2,0x17201c,x,.01,0);
  }
  for (let z = -WORLD.half; z <= WORLD.half; z += WORLD.roadStep) {
    const width = z % (WORLD.roadStep * 3) === 0 ? 14 : 10;
    makeFlatBox(WORLD.half * 2.2,.11,width,0x17201c,0,.012,z);
  }

  const dashTransforms = [];
  for (let x = -WORLD.half; x <= WORLD.half; x += WORLD.roadStep * 3) {
    for (let z = -WORLD.half; z <= WORLD.half; z += 24) {
      dashTransforms.push({
        position:new THREE.Vector3(x,.075,z),
        scale:new THREE.Vector3(.25,.025,8),
        rotation:new THREE.Vector3()
      });
    }
  }
  for (let z = -WORLD.half; z <= WORLD.half; z += WORLD.roadStep * 3) {
    for (let x = -WORLD.half; x <= WORLD.half; x += 24) {
      dashTransforms.push({
        position:new THREE.Vector3(x,.078,z),
        scale:new THREE.Vector3(8,.025,.25),
        rotation:new THREE.Vector3()
      });
    }
  }
  makeInstancedBox(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color:0xb8c6a2}),dashTransforms);

  const river = makeFlatBox(1500,.22,30,0x14505a,0,.04,30);
  river.rotation.y = -.22;
  river.material.color.setHex(0x0d444e);
  river.material.metalness = .25;
  river.material.roughness = .3;

  const bridgeMat = new THREE.MeshStandardMaterial({color:0x48564e,metalness:.35,roughness:.55});
  for (const x of [-245,35,285]) {
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(42,1.2,39),bridgeMat);
    bridge.position.set(x,1.1,x * .22 + 30);
    bridge.rotation.y = -.22;
    scene.add(bridge);
    for (const side of [-1,1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(42,.7,.35),mat(0x6b8177));
      rail.position.set(x,2,x * .22 + 30 + side * 15);
      rail.rotation.y = -.22;
      scene.add(rail);
    }
  }

  const parkPatches = [
    {x:-275,z:-215,r:108},{x:-320,z:270,r:85},{x:-165,z:112,r:27}
  ];
  parkPatches.forEach(p => {
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(p.r,32),
      new THREE.MeshStandardMaterial({color:0x0d2b1b,roughness:1})
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(p.x,.02,p.z);
    scene.add(disc);
  });

  const trunkTransforms = [], crownTransforms = [];
  for (let i = 0; i < 460; i++) {
    let x = (Math.random() - .5) * WORLD.half * 1.85;
    let z = (Math.random() - .5) * WORLD.half * 1.85;
    if (!isParkZone(x,z) || Math.abs(z - (x * .22 + 30)) < 25) continue;
    const size = 1.5 + Math.random() * 3;
    trunkTransforms.push({
      position:new THREE.Vector3(x,size,z),
      scale:new THREE.Vector3(.32,size * 1.5,.32),
      rotation:new THREE.Vector3()
    });
    crownTransforms.push({
      position:new THREE.Vector3(x,size * 2.1,z),
      scale:new THREE.Vector3(size * 1.4,size * 1.7,size * 1.4),
      rotation:new THREE.Vector3()
    });
  }
  makeInstancedBox(
    new THREE.CylinderGeometry(.5,.7,1,6),
    new THREE.MeshStandardMaterial({color:0x554638,roughness:1}),
    trunkTransforms
  );
  makeInstancedBox(
    new THREE.ConeGeometry(.7,1,7),
    new THREE.MeshStandardMaterial({color:0x17452b,roughness:1}),
    crownTransforms
  );
}

function addNightSky() {
  const starPositions = [];
  for (let i = 0; i < 1000; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 350 + Math.random() * 850;
    starPositions.push(Math.cos(angle) * radius, 140 + Math.random() * 340, Math.sin(angle) * radius);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));
  const stars = new THREE.Points(geometry,new THREE.PointsMaterial({color:0xc9e8ff,size:1.05,sizeAttenuation:false,transparent:true,opacity:.8}));
  scene.add(stars);

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(19,24,16),
    new THREE.MeshBasicMaterial({color:0xe0e9d8})
  );
  moon.position.set(-330,255,-520);
  scene.add(moon);

  const moonGlow = new THREE.PointLight(0x9abaff,1.2,520);
  moonGlow.position.copy(moon.position);
  scene.add(moonGlow);
  scene.add(new THREE.HemisphereLight(0x7297a2,0x101b13,.9));
  const moonLight = new THREE.DirectionalLight(0x98c0c7,1.1);
  moonLight.position.set(-200,260,120);
  moonLight.castShadow = false;
  scene.add(moonLight);
  const cityGlow = new THREE.PointLight(0x3fbb78,2.0,190);
  cityGlow.position.set(0,65,0);
  scene.add(cityGlow);
}

function addLandmarkName(name, x, y, z) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#06150d'; ctx.fillRect(0,0,512,96);
  ctx.strokeStyle = '#8effa0'; ctx.lineWidth = 3; ctx.strokeRect(3,3,506,90);
  ctx.font = 'bold 30px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#e7ffe8';
  ctx.fillText(name,256,58);
  const texture = new THREE.CanvasTexture(canvas);
  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(26,4.9),
    new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide})
  );
  label.position.set(x,y,z);
  label.userData.billboard = true;
  scene.add(label);
}

function addMoscowLandmarks3D() {
  const stone = mat(0x9a9a82,.9), red = mat(0x933c32,.8), green = mat(0x1f4d37,.75);
  const gold = mat(0xe2c16f,.4,.35);
  const glass = new THREE.MeshStandardMaterial({color:0x315761,metalness:.6,roughness:.25,emissive:0x102a31,emissiveIntensity:.35});

  const kremlin = new THREE.Group();
  kremlin.position.set(-38,0,-26);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(78,8,5),red);
  wall.position.set(0,4,-20); kremlin.add(wall);
  for (let x = -37; x <= 37; x += 9) {
    const merlon = new THREE.Mesh(new THREE.BoxGeometry(2.4,1.5,5.5),stone);
    merlon.position.set(x,8.6,-20); kremlin.add(merlon);
  }
  for (const x of [-34,-19,0,19,34]) {
    const tower = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(3.4,4.3,15,10),stone);
    body.position.y = 7.5; tower.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.1,8,10),red);
    roof.position.y = 19; tower.add(roof);
    const top = new THREE.Mesh(new THREE.OctahedronGeometry(1.4),gold);
    top.position.y = 23; tower.add(top);
    tower.position.set(x,0,-18); kremlin.add(tower);
  }
  const square = new THREE.Mesh(new THREE.BoxGeometry(60,.15,42),mat(0x3b3b35));
  square.position.set(0,.1,11); kremlin.add(square);
  for (let i = 0; i < 5; i++) {
    const x = -12 + (i % 3) * 12;
    const z = 7 + Math.floor(i / 3) * 9;
    const nave = new THREE.Mesh(new THREE.CylinderGeometry(3.2,4.5,8,10),red);
    nave.position.set(x,4,z); kremlin.add(nave);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(3.4,12,9),i % 2 ? green : gold);
    dome.scale.y = 1.12; dome.position.set(x,9,z); kremlin.add(dome);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(.75,3.4,8),gold);
    spire.position.set(x,13,z); kremlin.add(spire);
  }
  scene.add(kremlin);
  addLandmarkName('КРЕМЛЬ / КРАСНАЯ ПЛОЩАДЬ',-38,42,-46);
  WORLD.landmarks.push({key:'kremlin',x:-38,z:-26});

  const cityGroup = new THREE.Group();
  cityGroup.position.set(145,0,-112);
  for (let i = 0; i < 9; i++) {
    const height = 48 + Math.random() * 42;
    const width = 8 + Math.random() * 8;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(width,height,10 + Math.random() * 6),glass);
    tower.position.set((i - 4) * 15,height / 2,Math.sin(i * .8) * 17);
    cityGroup.add(tower);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(width * .72,5,8),gold);
    roof.position.set(tower.position.x,height + 2,tower.position.z);
    cityGroup.add(roof);
    for (let y = 9; y < height - 3; y += 7) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(width + .12,.25,10.2),mat(0x688992,.4,.16));
      strip.position.set(tower.position.x,y,tower.position.z);
      cityGroup.add(strip);
    }
  }
  scene.add(cityGroup);
  addLandmarkName('МОСКВА-СИТИ',145,112,-112);
  WORLD.landmarks.push({key:'city',x:145,z:-112});

  const ost = new THREE.Group();
  ost.position.set(18,0,-267);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(1.4,5.4,76,12),stone);
  mast.position.y = 38; ost.add(mast);
  for (const y of [22,34,48,60]) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(y > 45 ? 6 : 4.5,y > 45 ? 6 : 4.5,2.5,16),glass);
    ring.position.y = y; ost.add(ring);
  }
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(.3,.8,30,8),gold);
  antenna.position.y = 90; ost.add(antenna);
  scene.add(ost);
  addLandmarkName('ОСТАНКИНСКАЯ БАШНЯ',18,104,-267);
  WORLD.landmarks.push({key:'ostankino',x:18,z:-267});

  const stadium = new THREE.Group();
  stadium.position.set(-165,0,112);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(31,35,10,48,1,true),stone);
  bowl.position.y = 5; stadium.add(bowl);
  const turf = new THREE.Mesh(new THREE.CircleGeometry(25,48),mat(0x27623a));
  turf.rotation.x = -Math.PI / 2; turf.position.y = 10.2; stadium.add(turf);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(33,2.1,10,48),gold);
  rim.rotation.x = Math.PI / 2; rim.position.y = 10; stadium.add(rim);
  scene.add(stadium);
  addLandmarkName('ЛУЖНИКИ',-165,26,112);
  WORLD.landmarks.push({key:'luzhniki',x:-165,z:112});

  const industrial = new THREE.Group();
  industrial.position.set(290,0,218);
  for (let i = 0; i < 5; i++) {
    const warehouse = new THREE.Mesh(new THREE.BoxGeometry(24,9,19),mat(0x424d48));
    warehouse.position.set((i - 2) * 28,4.5,Math.sin(i) * 24);
    industrial.add(warehouse);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(25,1,20),mat(0x727a70));
    roof.position.set(warehouse.position.x,9.5,warehouse.position.z);
    industrial.add(roof);
  }
  for (const x of [-30,20]) {
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(3,4,40,12),red);
    chimney.position.set(x,20,-15); industrial.add(chimney);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(3.15,3.15,2,12),stone);
    band.position.set(x,31,-15); industrial.add(band);
  }
  scene.add(industrial);
  addLandmarkName('ПРОМЗОНА',290,57,218);
  WORLD.landmarks.push({key:'industry',x:290,z:218});

  const airport = new THREE.Group();
  airport.position.set(405,0,355);
  const runway = new THREE.Mesh(new THREE.BoxGeometry(22,.2,190),mat(0x242d2c));
  runway.position.set(0,.15,0); airport.add(runway);
  for (let z = -85; z <= 85; z += 12) {
    const mark = new THREE.Mesh(new THREE.BoxGeometry(.6,.04,6),new THREE.MeshBasicMaterial({color:0xcbd7c4}));
    mark.position.set(0,.27,z); airport.add(mark);
  }
  const terminal = new THREE.Mesh(new THREE.BoxGeometry(75,13,22),glass);
  terminal.position.set(41,6.5,18); airport.add(terminal);
  const terminalRoof = new THREE.Mesh(new THREE.BoxGeometry(78,2,25),gold);
  terminalRoof.position.set(41,14,18); airport.add(terminalRoof);
  for (let x = 15; x < 70; x += 8) {
    const mast = new THREE.Mesh(new THREE.BoxGeometry(.3,4,.3),mat(0xe4e2bb,.6,.25));
    mast.position.set(x,16,18); airport.add(mast);
  }
  scene.add(airport);
  addLandmarkName('АЭРОПОРТ',405,40,355);
  WORLD.landmarks.push({key:'airport',x:405,z:355});

  const parkGroup = new THREE.Group();
  parkGroup.position.set(-275,0,-215);
  const pond = new THREE.Mesh(new THREE.CircleGeometry(24,32),mat(0x12515a,.25));
  pond.rotation.x = -Math.PI / 2; pond.position.y = .14; parkGroup.add(pond);
  for (let i = 0; i < 14; i++) {
    const path = new THREE.Mesh(new THREE.BoxGeometry(2,.06,28),mat(0x334539));
    path.position.set((i - 7) * 9,.12,Math.sin(i) * 25);
    path.rotation.y = (i % 2 ? .5 : -.5); parkGroup.add(path);
  }
  scene.add(parkGroup);
  addLandmarkName('ПАРКИ / ЛЕС',-275,18,-215);
  WORLD.landmarks.push({key:'park',x:-275,z:-215});

  const tverskaya = new THREE.Group();
  tverskaya.position.set(8,0,-5);
  const block = new THREE.Mesh(new THREE.BoxGeometry(22,28,15),mat(0x666c60));
  block.position.y = 14; tverskaya.add(block);
  const top = new THREE.Mesh(new THREE.BoxGeometry(13,7,11),mat(0x827e68));
  top.position.y = 31.5; tverskaya.add(top);
  for (let i = -3; i <= 3; i++) {
    const col = new THREE.Mesh(new THREE.BoxGeometry(1.25,7,.8),gold);
    col.position.set(i * 2.5,4,7.7); tverskaya.add(col);
  }
  scene.add(tverskaya);
  addLandmarkName('ТВЕРСКАЯ',8,40,-5);
  WORLD.landmarks.push({key:'tverskaya',x:8,z:-5});

  const highway = new THREE.Mesh(new THREE.BoxGeometry(18,.12,1350),mat(0x222a27));
  highway.position.set(520,.02,0);
  scene.add(highway);
  const hLine = new THREE.Mesh(new THREE.BoxGeometry(.35,.04,1350),new THREE.MeshBasicMaterial({color:0xe0d5a4}));
  hLine.position.set(520,.1,0); scene.add(hLine);
  WORLD.landmarks.push({key:'outskirts',x:505,z:490});
}

function addStreetLightsAndTraffic() {
  const poles = [], lamps = [];
  for (let road = -WORLD.half + 25; road <= WORLD.half - 25; road += WORLD.roadStep * 2) {
    for (let along = -WORLD.half + 35; along <= WORLD.half - 35; along += 66) {
      for (const side of [-1,1]) {
        const x = road + side * 9, z = along;
        poles.push({position:new THREE.Vector3(x,3,z),scale:new THREE.Vector3(.16,6,.16),rotation:new THREE.Vector3()});
        lamps.push({position:new THREE.Vector3(x,6.2,z),scale:new THREE.Vector3(.55,.35,.55),rotation:new THREE.Vector3()});
      }
    }
  }
  makeInstancedBox(new THREE.CylinderGeometry(.5,.8,1,5),new THREE.MeshStandardMaterial({color:0x58675c,metalness:.45,roughness:.65}),poles);
  makeInstancedBox(new THREE.SphereGeometry(.5,6,5),new THREE.MeshBasicMaterial({color:0xffd99a}),lamps);

  const carGeometry = new THREE.BoxGeometry(2.4,.9,4.2);
  const carMaterials = [
    new THREE.MeshStandardMaterial({color:0x4c6f78,metalness:.55,roughness:.38,emissive:0x0d2022}),
    new THREE.MeshStandardMaterial({color:0x75654f,metalness:.35,roughness:.5,emissive:0x1a1008}),
    new THREE.MeshStandardMaterial({color:0x78887b,metalness:.45,roughness:.36,emissive:0x15251b})
  ];
  for (let i = 0; i < 28; i++) {
    const roadX = Math.round((Math.random() * 8 - 4)) * WORLD.roadStep * 2;
    const roadZ = (Math.random() - .5) * WORLD.half * 1.8;
    const onVertical = Math.random() > .5;
    const car = new THREE.Mesh(carGeometry,carMaterials[i % carMaterials.length]);
    car.position.set(onVertical ? roadX + 5 : roadZ, .8, onVertical ? roadZ : roadX + 5);
    car.rotation.y = onVertical ? 0 : Math.PI / 2;
    car.userData.traffic = {vertical:onVertical, direction:Math.random() > .5 ? 1 : -1, speed:8 + Math.random() * 15};
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(.5,.18,.1),new THREE.MeshBasicMaterial({color:0xffe3a1}));
    headlight.position.set(0,.08,-2.1); car.add(headlight);
    const taillight = new THREE.Mesh(new THREE.BoxGeometry(.5,.18,.1),new THREE.MeshBasicMaterial({color:0xff4747}));
    taillight.position.set(0,.08,2.1); car.add(taillight);
    scene.add(car);
    WORLD.traffic.push(car);
  }
}

setup3D = function setup3DOverhaul() {
  if (scene && renderer) return;
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030b12);
  scene.fog = new THREE.FogExp2(0x071711,.00125);
  camera = new THREE.PerspectiveCamera(76,innerWidth / innerHeight,.12,1900);
  camera.position.set(0,16,32);

  renderer = new THREE.WebGLRenderer({canvas:$('scene'),antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,1.5));
  renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
  else if ('outputEncoding' in renderer && THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setAnimationLoop(animate);

  WORLD.quality = $('graphicsSelect') ? $('graphicsSelect').value : 'high';
  WORLD.buildingMeshes = [];
  WORLD.windowMeshes = [];
  WORLD.traffic = [];
  WORLD.debris = [];
  WORLD.landmarks = [];
  city = [];
  state.targets = [];
  state.effects = [];

  addNightSky();
  addStreetAndTerrain();
  makeCityDistrict();
  addMoscowLandmarks3D();
  addStreetLightsAndTraffic();
  WORLD.launchPad = new THREE.Group();
  scene.add(WORLD.launchPad);
  makeFlatBox(22,.32,28,0x26382c,0,.14,0,WORLD.launchPad);
  makeFlatBox(1.1,.08,18,0xc5d8b7,-8,.35,0,WORLD.launchPad);
  makeFlatBox(1.1,.08,18,0xc5d8b7,8,.35,0,WORLD.launchPad);
  for (const side of [-1,1]) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(.45,8,6),new THREE.MeshBasicMaterial({color:side < 0 ? 0x7aff9f : 0xffa36f}));
    lamp.position.set(side * 10,.7,-11);
    WORLD.launchPad.add(lamp);
  }
  buildPlayerMissile();
  updateLaunchPreview();

  if (clock) clock.stop();
  clock = new THREE.Clock();
  resize();
  window.addEventListener('resize',resize,{passive:true});
  toast('ГОРОД ГОТОВ · РАЙОНЫ МОСКВЫ ЗАГРУЖЕНЫ');
};

function resize() {
  if (!renderer || !camera) return;
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
}

function buildPlayerMissile() {
  if (flight.missile && scene) scene.remove(flight.missile);
  const spec = ROCKETS[selectedRocket] || ROCKETS.falcon;
  const group = new THREE.Group();
  const shellMaterial = new THREE.MeshStandardMaterial({color:spec.color,metalness:.72,roughness:.28});
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(.24,.33,3.4,14),shellMaterial);
  shell.rotation.x = Math.PI / 2; group.add(shell);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.22,14),mat(0x344a3b,.42));
  band.rotation.x = Math.PI / 2; band.position.z = -.75; group.add(band);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(.24,.92,14),new THREE.MeshStandardMaterial({color:0xe2e8df,metalness:.62,roughness:.25}));
  nose.rotation.x = -Math.PI / 2; nose.position.z = -2.05; group.add(nose);
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(.24,.36,.5,12),mat(0x232b27,.38));
  nozzle.rotation.x = Math.PI / 2; nozzle.position.z = 1.8; group.add(nozzle);
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(.8,.09,.58),mat(0x395341,.42));
    fin.position.z = 1.12; fin.rotation.z = i * Math.PI / 2; group.add(fin);
  }
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(.3,1.65,12),
    new THREE.MeshBasicMaterial({color:0x8affb0,transparent:true,opacity:.85})
  );
  flame.rotation.x = Math.PI / 2; flame.position.z = 2.45; group.add(flame);
  group.userData.flame = flame;
  group.userData.playerMissile = true;
  group.userData.rocketType = selectedRocket;
  group.position.set(0,25,0);
  group.visible = false;
  scene.add(group);
  flight.missile = group;
  flight.velocity = new THREE.Vector3();
  return group;
}

function updateLaunchPreview() {
  const loc = MOSCOW_LOCATIONS[selectedLocation] || MOSCOW_LOCATIONS.tverskaya;
  if (WORLD.launchPad) WORLD.launchPad.position.set(loc.x,0,loc.z);
  if (flight.missile && flight.mode !== 'manual') {
    flight.missile.visible = true;
    flight.missile.position.set(loc.x,6,loc.z + 3);
    flight.missile.rotation.set(0,0,0);
  }
  if (camera) {
    camera.position.set(loc.x + 19,31,loc.z + 66);
    camera.lookAt(loc.x,7,loc.z);
    camera.fov = 64;
    camera.updateProjectionMatrix();
  }
}

function resetPlayerAtLaunch() {
  const startLoc = MOSCOW_LOCATIONS[selectedLocation] || MOSCOW_LOCATIONS.tverskaya;
  if (!flight.missile || flight.missile.userData.rocketType !== selectedRocket) buildPlayerMissile();
  const missile = flight.missile;
  const nearby = closestBuilding(startLoc.x,startLoc.z).building;
  const launchAltitude = Math.min(132,Math.max(30,(nearby ? nearby.h : 18) + 12));
  missile.position.set(startLoc.x,launchAltitude,startLoc.z);
  missile.rotation.set(0,0,0);
  missile.visible = true;
  flight.heading = 0;
  flight.pitch = 0;
  flight.roll = 0;
  flight.steerX = 0;
  flight.steerY = 0;
  flight.pitchInput = 0;
  flight.throttleInput = 0;
  flight.throttle = .72;
  flight.fuel = (ROCKETS[selectedRocket] || ROCKETS.falcon).fuel;
  flight.speed = 0;
  flight.velocity.set(0,0,0);
  flight.cameraMode = 'nose';
  flight.mode = 'manual';
  flight.lock = 0;
  flight.launchCooldown = 0;
  flight.launchTime = performance.now();
  flight.trailLine = null;
  playerTrailPoints = [];
  playerEnded = false;
  if (playerTrail) { scene.remove(playerTrail); playerTrail = null; }
  const loc = MOSCOW_LOCATIONS[selectedLocation];
  camera.position.set(loc.x,launchAltitude + 9,loc.z + 46);
  camera.lookAt(loc.x,launchAltitude,loc.z - 70);
  camera.fov = 76;
  camera.updateProjectionMatrix();
}

function createTrailLine() {
  if (!scene || playerTrail) return;
  const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]);
  const material = new THREE.LineBasicMaterial({color:0x90ffb0,transparent:true,opacity:.55});
  playerTrail = new THREE.Line(geometry,material);
  playerTrail.frustumCulled = false;
  scene.add(playerTrail);
}

function updatePlayerTrail(dt) {
  if (!flight.missile || flight.mode !== 'manual') return;
  WORLD.trailClock += dt;
  if (WORLD.trailClock < .045) return;
  WORLD.trailClock = 0;
  playerTrailPoints.push(flight.missile.position.clone());
  if (playerTrailPoints.length > 125) playerTrailPoints.shift();
  createTrailLine();
  if (playerTrail && playerTrailPoints.length > 1) {
    playerTrail.geometry.dispose();
    playerTrail.geometry = new THREE.BufferGeometry().setFromPoints(playerTrailPoints);
  }
}

function toggleFlightCamera() {
  if (flight.mode !== 'manual') return;
  flight.cameraMode = flight.cameraMode === 'nose' ? 'external' : 'nose';
  $('cameraToggle').textContent = flight.cameraMode === 'nose' ? '◉ ВНЕШНЯЯ КАМЕРА' : '◉ КАМЕРА РАКЕТЫ';
  $('cameraToggle').classList.toggle('active',flight.cameraMode === 'external');
  toast(flight.cameraMode === 'nose' ? 'КАМЕРА НА НОСУ РАКЕТЫ' : 'ВНЕШНЯЯ КАМЕРА');
}

function updatePauseOverlay() {
  const overlay = $('pauseOverlay');
  if (overlay) overlay.style.display = state.paused && state.running ? 'grid' : 'none';
  const button = $('simPause');
  if (button) button.textContent = state.paused ? '▶ ПРОДОЛЖИТЬ' : 'Ⅱ ПАУЗА';
}

function pause() {
  if (!state.running) return;
  state.paused = !state.paused;
  heldKeys.clear();
  updatePauseOverlay();
  toast(state.paused ? 'ПАУЗА' : 'ПОЛЁТ ПРОДОЛЖЕН');
}

start = function startOverhaul() {
  mountFlightUI();
  try {
    if (!scene || !renderer) setup3D();
  } catch (error) {
    console.error('3D scene startup failed:',error);
    $('menuNotice').textContent = 'Не удалось создать 3D-сцену: ' + (error && error.message ? error.message : error);
    return;
  }
  $('menu').classList.add('hide');
  $('resultOverlay').style.display = 'none';
  $('pauseOverlay').style.display = 'none';
  $('simSettings').style.display = 'none';
  $('flightUI').style.display = 'block';
  state.running = true;
  state.paused = false;
  state.hp = 100;
  state.spawned = 0;
  state.targets.forEach(t => { if (t.group) scene.remove(t.group); });
  state.targets = [];
  state.bosses = [];
  state.effects = [];
  state.total = 0;
  state.score = 0;
  WORLD.wavePending = false;
  WORLD.collisionClock = 0;
  lastSpawn = performance.now();
  resetPlayerAtLaunch();
  setupFlightJoysticks();
  spawnWave();
  ui();
  updatePauseOverlay();
  sound('alarm');
  if(window.GloBitBossAudio)window.GloBitBossAudio.start();
  $('flightTitle').textContent = ROCKETS[selectedRocket].name.toUpperCase() + ' · РУЧНОЙ ПОЛЁТ';
  $('flightStatus').innerHTML = '<b>РАКЕТА ЗАПУЩЕНА</b><br>ЛЕВЫЙ: курс и тяга · ПРАВЫЙ: тангаж и крен.<br>Автонаведение выключено.';
  $('cameraToggle').textContent = '◉ ВНЕШНЯЯ КАМЕРА';
  $('cameraToggle').classList.remove('active');
  drawTacticalMap();
};

function returnToHangar() {
  state.running = false;
  state.paused = false;
  flight.mode = 'idle';
  heldKeys.clear();
  if (flight.missile) flight.missile.visible = true;
  if (playerTrail) { scene.remove(playerTrail); playerTrail = null; }
  updateLaunchPreview();
  $('flightUI').style.display = 'none';
  $('resultOverlay').style.display = 'none';
  $('pauseOverlay').style.display = 'none';
  $('menu').classList.remove('hide');
  $('menuNotice').textContent = 'Готов к новому вылету. Выбери ракету и точку старта.';
  drawLaunchMap();
  persist();
}

function finishFlight(title, text) {
  if (playerEnded) return;
  playerEnded = true;
  flight.mode = 'idle';
  flight.steerX = flight.steerY = flight.roll = flight.pitchInput = flight.throttleInput = 0;
  state.running = false;
  state.paused = false;
  heldKeys.clear();
  $('resultTitle').textContent = title;
  $('resultText').textContent = text || 'Полёт завершён. Можно повторить вылет или вернуться в ангар.';
  $('resultBalance').textContent = state.coins.toLocaleString('ru-RU') + ' ₽';
  $('resultOverlay').style.display = 'grid';
  $('pauseOverlay').style.display = 'none';
  persist();
  ui();
}

function spawnExplosion(position, big) {
  if (!scene) return;
  const group = new THREE.Group();
  const palette = big ? [0xffe7a4,0xff813e,0xd9432a,0x66716a] : [0xffeab1,0xffa34a,0x76ffac];
  const count = big ? 24 : 14;
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(.15 + Math.random() * .34,0),
      new THREE.MeshBasicMaterial({color:palette[i % palette.length],transparent:true,opacity:1})
    );
    mesh.position.set(0,0,0);
    mesh.userData.velocity = new THREE.Vector3((Math.random() - .5) * 13,Math.random() * 10 - 1,(Math.random() - .5) * 13);
    group.add(mesh);
  }
  group.position.copy(position);
  scene.add(group);
  state.effects.push({mesh:group,life:big ? 2.4 : 1.25,initialLife:big ? 2.4 : 1.25,explosion:true});
  const flash = new THREE.PointLight(big ? 0xff9a4a : 0x8affa5,big ? 8 : 4,big ? 90 : 42,2);
  flash.position.copy(position);
  scene.add(flash);
  state.effects.push({mesh:flash,life:.28,initialLife:.28,light:true});
}

function damageBuildingV3(building, position, source, amount) {
  if (!building || building.destroyed) return false;
  source = source || 'enemy';
  amount = amount || (source === 'player' ? 110 : 62);
  building.hp = Math.max(0,building.hp - amount);
  building.damageLevel++;
  const impact = position ? position.clone() : new THREE.Vector3(building.x,building.h,building.z);
  spawnExplosion(impact,building.hp <= 0);
  if (building.hp > 0) {
    toast('ЗДАНИЕ ПОВРЕЖДЕНО');
    return false;
  }

  building.destroyed = true;
  if (building.bodyMesh) hideInstance(building.bodyMesh,building.instanceIndex);
  hideInstance(WORLD.roofMesh,building.roofIndex);
  building.windowRefs.forEach(ref => hideInstance(ref.mesh,ref.index));

  for (let i = 0; i < 9; i++) {
    const debris = new THREE.Mesh(
      new THREE.BoxGeometry(.5 + Math.random() * 1.4,.4 + Math.random() * 1.4,.5 + Math.random() * 1.4),
      mat([0x514d43,0x393e37,0x77786a][i % 3])
    );
    debris.position.set(building.x + (Math.random() - .5) * building.w,building.h * .55,building.z + (Math.random() - .5) * building.d);
    debris.rotation.set(Math.random(),Math.random(),Math.random());
    debris.userData.velocity = new THREE.Vector3((Math.random() - .5) * 11,2 + Math.random() * 8,(Math.random() - .5) * 11);
    debris.userData.spin = new THREE.Vector3(Math.random() * 4,Math.random() * 4,Math.random() * 4);
    scene.add(debris);
    WORLD.debris.push({mesh:debris,life:3.8});
  }

  if (source !== 'player' && !building.penaltyCharged) {
    building.penaltyCharged = true;
    state.coins = Math.max(0,state.coins - 1000);
    persist();
    toast('−1 000 ₽: здание разрушено');
  } else {
    toast('ЗДАНИЕ РАЗРУШЕНО');
  }
  ui();
  return true;
}

function closestBuilding(x, z) {
  let best = null, distance = Infinity;
  for (const building of city) {
    if (building.destroyed) continue;
    const dx = Math.max(0,Math.abs(x - building.x) - building.w / 2);
    const dz = Math.max(0,Math.abs(z - building.z) - building.d / 2);
    const d = Math.hypot(dx,dz);
    if (d < distance) { distance = d; best = building; }
  }
  return {building:best,distance};
}

const createTargetBeforeOverhaul = createTarget;
createTarget = function(type, bossName) {
  const target = createTargetBeforeOverhaul(type,bossName);
  if (!target || !target.group) return target;
  const edge = WORLD.half - 38;
  const side = Math.floor(Math.random() * 4);
  const spawn = side === 0 ? new THREE.Vector3(-edge,28 + Math.random() * 55,(Math.random() - .5) * edge * 1.5) :
    side === 1 ? new THREE.Vector3(edge,32 + Math.random() * 45,(Math.random() - .5) * edge * 1.5) :
    side === 2 ? new THREE.Vector3((Math.random() - .5) * edge * 1.5,26 + Math.random() * 55,-edge) :
    new THREE.Vector3((Math.random() - .5) * edge * 1.5,30 + Math.random() * 50,edge);
  const destination = city.length ? city[Math.floor(Math.random() * city.length)] : {x:0,z:0,h:16};
  const targetPoint = new THREE.Vector3(destination.x,Math.max(4,destination.h * .62),destination.z);
  const cross = new THREE.Vector3(
    clampValue(targetPoint.x * .38 + (Math.random() - .5) * 170,-edge,edge),
    15 + Math.random() * 65,
    clampValue(targetPoint.z * .38 + (Math.random() - .5) * 170,-edge,edge)
  );
  target.maxHealth = type === 'boss' ? 100 + state.level * 5 : type === 'rocket' ? 3 : type === 'shahed' ? 2 : 1;
  target.health = target.maxHealth;
  target.group.position.copy(spawn);
  target.group.rotation.order = 'YXZ';
  target.ai = {
    state:'approach',
    waypoints:[cross,targetPoint],
    goalIndex:0,
    destinationBuilding:destination,
    phase:Math.random() * Math.PI * 2,
    evasiveUntil:0,
    decisionAt:performance.now() + 2200 + Math.random() * 2400,
    hurt:false,
    baseSpeed:(type === 'rocket' ? 31 : type === 'shahed' ? 20 : type === 'drone' ? 23 : 15) * (state.multiplayer ? 1.12 : 1)
  };
  target.speed = target.ai.baseSpeed;
  return target;
};

spawnWave = function spawnWaveOverhaul() {
  state.targets.forEach(target => { if (target.group) scene.remove(target.group); });
  state.targets = [];
  state.bosses = [];
  state.spawned = 0;
  state.bossSpawned = false;
  const level = state.level;
  const drones = level >= 50 ? 15 : Math.min(5 + Math.floor((level - 1) * .22),14);
  const shaheds = level >= 50 ? 10 : Math.min(2 + Math.floor((level - 1) * .16),9);
  const rockets = level >= 50 ? 5 : Math.min(1 + Math.floor((level - 1) * .1),4);
  const types = [...Array(drones).fill('drone'), ...Array(shaheds).fill('shahed'), ...Array(rockets).fill('rocket')];
  for (let i=types.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [types[i],types[j]]=[types[j],types[i]]; }
  if(level>=50) types.push('boss');
  state.waveManifest={drones,shaheds,rockets,types,boss:level>=50?'Потужнолит':null};
  state.total = types.length;
  if(state.multiplayer) state.level=Math.min(65,Math.max(50,state.level));
  WORLD.spawnInterval = Math.max(220,780 - state.level * 8);
  WORLD.nextSpawnAt = performance.now() + 300;
  lastSpawn = performance.now();
  const objective=$('objectiveText');
  if(objective) objective.textContent='Сбить: '+drones+' дронов · '+shaheds+' Shahed · '+rockets+' ракет'+(level>=50?' · БОСС: ПОТУЖНОЛИТ':'');
  const missionLevel=$('missionLevel');if(missionLevel)missionLevel.textContent='УРОВЕНЬ '+level;
  toast('ВОЛНА ' + state.level + ' · ЦЕЛЕЙ: ' + state.total);
  ui();
};

function updateTargetAI(target, dt, now) {
  if (!target || target.dead || !target.ai) return;
  const ai = target.ai;
  const position = target.group.position;
  const distanceToPlayer = flight.missile && flight.mode === 'manual' ? position.distanceTo(flight.missile.position) : Infinity;
  if (target.health < target.maxHealth && !ai.hurt) {
    ai.hurt = true;
    ai.state = 'damaged';
    ai.baseSpeed *= .73;
    ai.decisionAt = now + 800;
  }
  if (distanceToPlayer < 85 && now > ai.evasiveUntil && target.type !== 'rocket') {
    ai.state = 'evasive';
    ai.evasiveUntil = now + 1600;
    const offset = new THREE.Vector3((Math.random() - .5) * 110,12 + Math.random() * 28,(Math.random() - .5) * 110);
    const currentGoal = ai.waypoints[ai.goalIndex] || position;
    ai.waypoints[ai.goalIndex] = currentGoal.clone().add(offset);
  }
  if (now > ai.decisionAt && ai.state === 'evasive') {
    ai.state = ai.hurt ? 'damaged' : 'approach';
    ai.decisionAt = now + 1600 + Math.random() * 1800;
  }

  let goal = ai.waypoints[ai.goalIndex];
  if (!goal) goal = ai.destinationBuilding ? new THREE.Vector3(ai.destinationBuilding.x,ai.destinationBuilding.h * .55,ai.destinationBuilding.z) : new THREE.Vector3(0,10,0);
  let direction = goal.clone().sub(position);
  const distance = direction.length();
  if (distance < 13 && ai.goalIndex < ai.waypoints.length - 1) {
    ai.goalIndex++;
    goal = ai.waypoints[ai.goalIndex];
    direction = goal.clone().sub(position);
  } else if (distance < 12 && ai.goalIndex >= ai.waypoints.length - 1) {
    const building = ai.destinationBuilding;
    if (building && !building.destroyed) damageBuildingV3(building,new THREE.Vector3(building.x,building.h * .65,building.z),'enemy',68);
    state.hp = Math.max(0,state.hp - (target.boss ? 18 : 4));
    spawnExplosion(position.clone(),target.boss);
    target.dead = true;
    scene.remove(target.group);
    ui();
    if (state.hp <= 0) finishFlight('ОБОРОНА ПРОРВАНА','Противники достигли городской цели. Подготовь новую ракету или улучши систему.');
    return;
  }

  if (direction.lengthSq() < .0001) return;
  direction.normalize();
  const speed = ai.baseSpeed * (ai.state === 'evasive' ? 2.35 : 2.0) * (target.type === 'rocket' ? 1.45 : 1);
  const desiredVelocity = direction.multiplyScalar(speed);
  if (!target.ai.velocity) target.ai.velocity = desiredVelocity.clone();
  target.ai.velocity.lerp(desiredVelocity,clampValue(dt * .75,.01,.2));
  position.addScaledVector(target.ai.velocity,dt);
  const v = target.ai.velocity.clone().normalize();
  target.group.rotation.order = 'YXZ';
  target.group.rotation.y = Math.atan2(-v.x,-v.z);
  target.group.rotation.x = Math.atan2(v.y,Math.max(.001,Math.hypot(v.x,v.z)));
  target.group.rotation.z = ai.state === 'evasive' ? Math.sin(now * .004 + ai.phase) * .2 : Math.sin(now * .001 + ai.phase) * .045;
  target.group.position.y += Math.sin(now * .0013 + ai.phase) * dt * (ai.state === 'evasive' ? 4 : 1.3);
  target.group.traverse(object => { if (object.userData.rotor) object.rotation.y += dt * 18; });
  if (target.group.userData.prop) target.group.userData.prop.rotation.z += dt * 14;
}

function kill(target) {
  if (!target || target.dead) return;
  target.dead = true;
  const position = target.group.position.clone();
  scene.remove(target.group);
  spawnExplosion(position,target.boss);
  state.coins += target.value;
  state.score += target.value;
  sound('coin');
  toast('ЦЕЛЬ ПЕРЕХВАЧЕНА · +' + target.value.toLocaleString('ru-RU') + ' ₽');
  if (target.boss) {
    state.bosses = state.bosses.filter(b => b !== target);
    if (!state.bosses.some(b => !b.dead)) $('bossbar').style.display = 'none';
  }
  persist();
  ui();
  checkWave();
}

function checkWave() {
  const living = state.targets.some(target => !target.dead);
  if (state.spawned >= state.total && !living && !state.bosses.some(b => !b.dead) && !WORLD.wavePending) {
    state.level++;
    WORLD.wavePending = true;
    WORLD.waveAt = performance.now() + 2600;
    waveTransitionMessage = 'ВОЛНА ПРОЙДЕНА · УРОВЕНЬ ' + state.level;
    persist();
    ui();
    toast(waveTransitionMessage);
  }
}

function updateFlight(dt) {
  if (!flight.missile || !state.running || state.paused || flight.mode !== 'manual') return;
  const missile = flight.missile;
  const now = performance.now();
  const sens = WORLD.sensitivity;

  let yawInput = flight.steerX;
  if (heldKeys.has(keyBindings.left)) yawInput -= 1;
  if (heldKeys.has(keyBindings.right)) yawInput += 1;
  let pitchInput = flight.pitchInput || 0;
  if (heldKeys.has(keyBindings.pitchUp)) pitchInput += 1;
  if (heldKeys.has(keyBindings.pitchDown)) pitchInput -= 1;
  let rollInput = flight.roll || 0;
  if (heldKeys.has(keyBindings.rollLeft)) rollInput -= 1;
  if (heldKeys.has(keyBindings.rollRight)) rollInput += 1;
  let throttleInput = flight.throttleInput || 0;
  if (heldKeys.has(keyBindings.forward)) throttleInput += 1;
  if (heldKeys.has(keyBindings.back)) throttleInput -= 1;

  yawInput = clampValue(yawInput,-1,1);
  pitchInput = clampValue(pitchInput,-1,1);
  rollInput = clampValue(rollInput,-1,1);
  throttleInput = clampValue(throttleInput,-1,1);

  flight.heading -= yawInput * dt * 1.22 * sens;
  flight.pitch = clampValue(flight.pitch + pitchInput * dt * .78 * sens,-.9,.9);
  flight.roll = clampValue(rollInput,-1,1);

  const spec = ROCKETS[selectedRocket] || ROCKETS.falcon;
  const turnLoss = Math.abs(yawInput) * .16 + Math.abs(pitchInput) * .1;
  flight.throttle = clampValue(flight.throttle + throttleInput * dt * .52,0,1);
  const desiredSpeed = spec.maxSpeed * flight.throttle;
  flight.speed += (desiredSpeed - flight.speed) * clampValue(dt * (spec.acceleration / 10),0,1);
  flight.speed = Math.max(0,flight.speed - turnLoss * dt * spec.maxSpeed * .08);
  missile.rotation.order = 'YXZ';
  missile.rotation.y = flight.heading;
  missile.rotation.x = flight.pitch;
  missile.rotation.z = flight.roll * .48;

  const forward = new THREE.Vector3(0,0,-1).applyQuaternion(missile.quaternion).normalize();
  const desiredVelocity = forward.multiplyScalar(flight.speed);
  if (!flight.velocity) flight.velocity = desiredVelocity.clone();
  flight.velocity.lerp(desiredVelocity,clampValue(dt * (selectedRocket === 'swift' ? 2.6 : 1.55),.01,.18));
  missile.position.addScaledVector(flight.velocity,dt);

  if (missile.userData.flame) {
    missile.userData.flame.scale.y = .72 + Math.sin(now * .035) * .23 + flight.throttle * .55;
    missile.userData.flame.material.opacity = .56 + Math.random() * .36;
  }

  if (flight.fuel <= 0) {
    finishFlight('ТОПЛИВО ИСЧЕРПАНО','Ракета перешла в режим завершения полёта. Выбери стартовую локацию и повтори вылет.');
    return;
  }
  flight.fuel = Math.max(0,flight.fuel - dt * (.085 + flight.throttle * .19));

  if (Math.abs(missile.position.x) > WORLD.half + 40 || Math.abs(missile.position.z) > WORLD.half + 40 || missile.position.y < 2 || missile.position.y > 190) {
    finishFlight('ГРАНИЦА РАЙОНА','Ты покинул тестовый воздушный сектор или вышел за допустимую высоту.');
    return;
  }

  const speed = flight.velocity.length();
  for (const target of state.targets) {
    if (target.dead) continue;
    if (missile.position.distanceTo(target.group.position) < (target.boss ? 4.5 : 3.1)) {
      const targetPos = target.group.position.clone();
      kill(target);
      finishFlight('ЦЕЛЬ ПЕРЕХВАЧЕНА','Прямое попадание. Возвращайся в ангар или запусти следующий перехват.');
      return;
    }
  }

  WORLD.collisionClock += dt;
  if (WORLD.collisionClock > .035) {
    WORLD.collisionClock = 0;
    for (const building of city) {
      if (building.destroyed) continue;
      if (Math.abs(missile.position.x - building.x) > building.w / 2 + .9) continue;
      if (Math.abs(missile.position.z - building.z) > building.d / 2 + .9) continue;
      if (missile.position.y < building.h + 1.4) {
        damageBuildingV3(building,missile.position.clone(),'player',110);
        spawnExplosion(missile.position.clone(),true);
        finishFlight('СТОЛКНОВЕНИЕ','Ракета столкнулась со зданием. Штраф за собственное попадание не начисляется.');
        return;
      }
    }
  }

  if (flight.cameraMode === 'nose') {
    camera.position.copy(missile.position).addScaledVector(new THREE.Vector3(0,0,-1).applyQuaternion(missile.quaternion),3.2);
    camera.quaternion.copy(missile.quaternion);
    camera.fov = 78 + flight.throttle * 4;
  } else {
    const back = new THREE.Vector3(0,0,1).applyQuaternion(missile.quaternion).multiplyScalar(12);
    const desiredCamera = missile.position.clone().add(back);
    desiredCamera.y += 4.5;
    camera.position.lerp(desiredCamera,clampValue(dt * 4.3,0,1));
    const look = missile.position.clone().addScaledVector(new THREE.Vector3(0,0,-1).applyQuaternion(missile.quaternion),12);
    camera.lookAt(look);
    camera.fov = 68;
  }
  camera.updateProjectionMatrix();

  $('speedRead').textContent = Math.round(speed * WORLD.metresPerUnit * 3.6) + ' км/ч';
  $('flightCityHp').textContent = Math.round(state.hp) + '%';
  $('altitudeRead').textContent = Math.round(missile.position.y * WORLD.metresPerUnit) + ' м';
  $('fuelRead').textContent = Math.round(flight.fuel / spec.fuel * 100) + '%';
  $('flightCoins').textContent = state.coins.toLocaleString('ru-RU') + ' ₽';
  $('flightStatus').innerHTML = '<b>' + (flight.cameraMode === 'nose' ? 'КАМЕРА НА РАКЕТЕ' : 'ВНЕШНЯЯ КАМЕРА') + '</b><br>' +
    'ТЯГА ' + Math.round(flight.throttle * 100) + '% · КРЕН ' + Math.round(flight.roll * 100) + '%<br>' +
    'СОСТОЯНИЕ: ' + (flight.speed > spec.maxSpeed * .88 ? 'ВЫСОКАЯ СКОРОСТЬ' : 'РУЧНОЙ ПОЛЁТ');
  updatePlayerTrail(dt);
}

function updateDecorativeTraffic(dt) {
  WORLD.traffic.forEach(car => {
    const data = car.userData.traffic;
    if (!data) return;
    if (data.vertical) {
      car.position.z += data.direction * data.speed * dt;
      if (car.position.z > WORLD.half || car.position.z < -WORLD.half) data.direction *= -1;
    } else {
      car.position.x += data.direction * data.speed * dt;
      if (car.position.x > WORLD.half || car.position.x < -WORLD.half) data.direction *= -1;
    }
  });
}

function updateEffects(dt) {
  for (const effect of state.effects) {
    effect.life -= dt;
    if (effect.explosion && effect.mesh && effect.mesh.isGroup) {
      effect.mesh.children.forEach(piece => {
        if (piece.userData.velocity) {
          piece.position.addScaledVector(piece.userData.velocity,dt);
          piece.userData.velocity.y -= 3.5 * dt;
          piece.scale.multiplyScalar(Math.max(.8,1 - dt * .15));
          piece.material.opacity = clampValue(effect.life / effect.initialLife,0,1);
        }
      });
    } else if (effect.light && effect.mesh && effect.mesh.isLight) {
      effect.mesh.intensity = Math.max(0,(effect.life / effect.initialLife) * 7);
    } else if (effect.mesh && effect.mesh.material) {
      effect.mesh.position.addScaledVector(effect.velocity || new THREE.Vector3(),dt);
      effect.mesh.material.opacity = clampValue(effect.life,0,1);
    }
    if (effect.life <= 0 && effect.mesh) {
      scene.remove(effect.mesh);
      if (effect.mesh.isGroup) effect.mesh.traverse(piece => {
        if (piece.geometry) piece.geometry.dispose();
        if (piece.material) {
          if (Array.isArray(piece.material)) piece.material.forEach(material => material.dispose());
          else piece.material.dispose();
        }
      });
      else {
        if (effect.mesh.geometry) effect.mesh.geometry.dispose();
        if (effect.mesh.material && !Array.isArray(effect.mesh.material)) effect.mesh.material.dispose();
      }
    }
  }
  state.effects = state.effects.filter(effect => effect.life > 0);

  for (const piece of WORLD.debris) {
    piece.life -= dt;
    piece.mesh.position.addScaledVector(piece.mesh.userData.velocity,dt);
    piece.mesh.userData.velocity.y -= 9.5 * dt;
    piece.mesh.rotation.x += piece.mesh.userData.spin.x * dt;
    piece.mesh.rotation.y += piece.mesh.userData.spin.y * dt;
    if (piece.life <= 0) {
      scene.remove(piece.mesh);
      piece.mesh.geometry.dispose();
      piece.mesh.material.dispose();
    }
  }
  WORLD.debris = WORLD.debris.filter(piece => piece.life > 0);
}

animate = function animateOverhaul() {
  if (!renderer || !scene || !camera) return;
  const dt = Math.min(clock ? clock.getDelta() : .016,.035);
  const now = performance.now();
  if (window.GloBitBossAudio && flight) window.GloBitBossAudio.setFlightSpeed(state.running && !state.paused && flight.missile ? Math.min(1,(flight.speed||24)/120) : 0);

  if (state.running && !state.paused) {
    if (flight.mode === 'manual') updateFlight(dt);
    if (state.running && state.spawned < state.total && now >= WORLD.nextSpawnAt) {
      const index = state.spawned;
      let type;
      if (state.waveManifest && state.waveManifest.types && state.waveManifest.types[index]) type = state.waveManifest.types[index];
      else { const roll=Math.random(); type=roll<.48?'drone':roll<.82?'shahed':'rocket'; }
      const bossName = type==='boss' ? (state.level===50?'Потужнолит':(Math.random()>.5?'Движухалит':'Потужнолит')) : undefined;
      createTarget(type,bossName);
      state.spawned++;
      WORLD.nextSpawnAt = now + WORLD.spawnInterval;
      ui();
    }
    if (state.running) {
      for (const target of state.targets) {
        if (!state.running) break;
        updateTargetAI(target,dt,now);
      }
    }
    updateDecorativeTraffic(dt);
    updateEffects(dt);
    if (WORLD.wavePending && now >= WORLD.waveAt && state.running) {
      WORLD.wavePending = false;
      spawnWave();
    }
    if (state.running && state.spawned >= state.total && !state.targets.some(t => !t.dead) && !WORLD.wavePending) {
      checkWave();
    }
  } else {
    updateEffects(dt);
  }

  if (flightUIReady && now - lastMapDraw > 150) {
    drawTacticalMap();
    if ($('menu') && !$('menu').classList.contains('hide')) drawLaunchMap();
    lastMapDraw = now;
  }
  for (const child of scene.children) {
    if (child.userData && child.userData.billboard && camera) child.quaternion.copy(camera.quaternion);
  }
  renderer.render(scene,camera);
};


function openLeaderboard(){const modal=$('leaderboardModal');if(!modal)return;modal.classList.remove('hidden');const rows=$('leaderboardRows');rows.textContent='Загружаю таблицу…';if(!db){rows.textContent='Firebase недоступен. Локально: '+state.coins.toLocaleString('ru-RU')+' ₽ · уровень '+state.level;return;}db.collection('moscow_arcade_leaderboard').orderBy('coins','desc').limit(50).get().then(snapshot=>{if(snapshot.empty){rows.textContent='Пока нет рекордов. Сыграй первую смену!';return;}rows.innerHTML='';let rank=0;snapshot.forEach(doc=>{const d=doc.data()||{};rank++;const row=document.createElement('div');row.className='leaderboard-row';const name=document.createElement('div');name.innerHTML='<span class="rank">#'+rank+'</span>';const detail=document.createElement('div');const title=document.createElement('b');title.textContent=d.displayName||'Защитник';const sub=document.createElement('small');sub.textContent='Уровень '+(d.level||1)+' · В игре '+Math.floor((d.playSeconds||0)/60)+' мин';detail.append(title,sub);const score=document.createElement('div');score.className='score';score.textContent=Number(d.coins||0).toLocaleString('ru-RU')+' ₽';row.append(name,detail,score);rows.append(row);});}).catch(e=>{rows.textContent='Таблица недоступна: '+(e.code||'нет доступа к Firestore')+'. Проверь правила коллекции moscow_arcade_leaderboard.';});}
function installMissionUI(){const select=$('locationSelect');if(select){select.value=localStorage.getItem('moscow3_location')||'moscow';const names={moscow:'Оборона Москвы',village:'Оборона Подмосковья',river:'Оборона набережной',industrial:'Оборона промзоны'};select.addEventListener('change',()=>{localStorage.setItem('moscow3_location',select.value);if(scene&&window.GloBitCity)window.GloBitCity.build(scene,THREE,mat,select.value);const title=$('missionTitle');if(title)title.textContent=names[select.value]||names.moscow;toast('Локация выбрана: '+(names[select.value]||names.moscow));});const title=$('missionTitle');if(title)title.textContent=names[select.value]||names.moscow;}
const leader=$('leaderBtn');if(leader)leader.addEventListener('click',openLeaderboard);const close=$('closeLeaderboard');if(close)close.addEventListener('click',()=> $('leaderboardModal').classList.add('hidden'));const modal=$('leaderboardModal');if(modal)modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.add('hidden');});}

function installKeyboardControls() {
  window.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    if (rebindAction) {
      if (key === 'escape') {
        rebindAction = null;
        $('rebindKey').textContent = '⌨ ПЕРЕНАЗНАЧИТЬ ПОВОРОТ ВЛЕВО';
        $('keyHelp').textContent = 'W/S — тяга · A/D — курс · ↑/↓ — тангаж · Q/E — крен · C — камера';
        event.preventDefault();
        return;
      }
      const actionName = rebindAction;
      keyBindings[actionName] = key;
      rebindAction = null;
      $('rebindKey').textContent = '⌨ НАЗНАЧЕНО: ' + event.key.toUpperCase();
      $('keyHelp').textContent = 'A/D — курс · W/S — тяга · ↑/↓ — тангаж · Q/E — крен · C — камера. Используй список выше для переназначения.';
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (key === 'escape') {
      if (state.running) pause();
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (key === keyBindings.camera && state.running && !state.paused) {
      toggleFlightCamera();
      event.preventDefault();
      return;
    }
    if ([' ', 'spacebar'].includes(key)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    heldKeys.add(key);
  },true);
  window.addEventListener('keyup', event => heldKeys.delete(event.key.toLowerCase()),true);
  window.addEventListener('blur', () => heldKeys.clear());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.running && !state.paused) pause();
  });
}
installKeyboardControls();

window.addEventListener('error', event => {
  if (event && event.message && /WebGL|THREE|context/i.test(event.message)) {
    const notice = $('menuNotice');
    if (notice) notice.textContent = 'Ошибка графики: ' + event.message + '. Попробуй снизить качество графики или перезапустить страницу.';
  }
});

try {
  if (auth) auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
} catch (error) {
  console.warn('Auth persistence could not be set:',error);
}


mountFlightUI();
installMissionUI();
(function installDashboardControls(){
 const byId=id=>document.getElementById(id),show=id=>byId(id)?.classList.remove('hidden'),hide=id=>byId(id)?.classList.add('hidden');
 byId('inviteOpen')?.addEventListener('click',()=>show('inviteModal'));byId('inviteClose')?.addEventListener('click',()=>hide('inviteModal'));byId('ratingOpen')?.addEventListener('click',openLeaderboard);byId('settingsOpen')?.addEventListener('click',()=>show('settingsModal'));byId('settingsClose')?.addEventListener('click',()=>hide('settingsModal'));
 byId('settingsDone')?.addEventListener('click',()=>{hide('settingsModal');try{localStorage.setItem('moscow3_settings',JSON.stringify({sensitivity:WORLD.sensitivity,gyro:!!byId('gyroToggle').checked,joystick:!!byId('joystickToggle').checked,vibration:!!byId('vibrationToggle').checked,graphics:byId('settingGraphics').value}));}catch(e){}toast('НАСТРОЙКИ СОХРАНЕНЫ');});
 byId('settingSensitivity')?.addEventListener('input',e=>{WORLD.sensitivity=Number(e.target.value)/100;byId('sensitivityLabel').textContent=e.target.value+'%';if(byId('sensitivityRange')){byId('sensitivityRange').value=e.target.value;byId('sensitivityValue').textContent=e.target.value+'%';}});
 byId('settingGraphics')?.addEventListener('change',e=>applyGraphicsQuality(e.target.value));
 byId('joystickToggle')?.addEventListener('change',e=>document.querySelectorAll('#flightUI .sim-joy-wrap').forEach(el=>el.style.display=e.target.checked?'flex':'none'));
 byId('vibrationToggle')?.addEventListener('change',e=>{window.__globitVibration=e.target.checked;if(!e.target.checked&&navigator.vibrate)navigator.vibrate(0);});
 byId('gyroToggle')?.addEventListener('change',async e=>{if(!e.target.checked){window.__globitGyro=false;if(window.__globitGyroHandler)window.removeEventListener('deviceorientation',window.__globitGyroHandler);return;}try{if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'){const permission=await DeviceOrientationEvent.requestPermission();if(permission!=='granted')throw Error('Доступ к гироскопу запрещён');}window.__globitGyro=true;window.__globitGyroHandler=event=>{if(!window.__globitGyro||!state.running||state.paused||!flight.missile)return;if(event.gamma!==null)flight.steerX=Math.max(-1,Math.min(1,event.gamma/28));if(event.beta!==null)flight.pitchInput=Math.max(-1,Math.min(1,(event.beta-45)/35));};window.addEventListener('deviceorientation',window.__globitGyroHandler);toast('ГИРОСКОП ВКЛЮЧЁН');}catch(err){e.target.checked=false;toast('ГИРОСКОП НЕДОСТУПЕН: '+(err.message||'нет разрешения'));}});
 try{const saved=JSON.parse(localStorage.getItem('moscow3_settings')||'null');if(saved){if(Number.isFinite(saved.sensitivity)){WORLD.sensitivity=saved.sensitivity;byId('settingSensitivity').value=Math.round(saved.sensitivity*100);byId('sensitivityLabel').textContent=Math.round(saved.sensitivity*100)+'%';}byId('gyroToggle').checked=!!saved.gyro;byId('joystickToggle').checked=saved.joystick!==false;byId('vibrationToggle').checked=saved.vibration!==false;window.__globitVibration=saved.vibration!==false;byId('settingGraphics').value=saved.graphics||'high';if(saved.graphics)applyGraphicsQuality(saved.graphics);if(saved.joystick===false)document.querySelectorAll('#flightUI .sim-joy-wrap').forEach(el=>el.style.display='none');}}catch(e){}
 byId('inviteModal')?.addEventListener('click',e=>{if(e.target===byId('inviteModal'))hide('inviteModal');});byId('settingsModal')?.addEventListener('click',e=>{if(e.target===byId('settingsModal'))hide('settingsModal');});
 const oldDrawLaunchMap=drawLaunchMap;drawLaunchMap=function(){oldDrawLaunchMap();drawDashboardThreats();};
 function drawDashboardThreats(){const canvas=byId('launchMapPreview');if(!canvas||!canvas.getContext)return;const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,playerX=flight.missile?flight.missile.position.x:MOSCOW_LOCATIONS[selectedLocation].x,playerZ=flight.missile?flight.missile.position.z:MOSCOW_LOCATIONS[selectedLocation].z,span=WORLD.half*2,px=x=>(x+WORLD.half)/span*w,py=z=>(z+WORLD.half)/span*h;
  ctx.save();ctx.strokeStyle='#224b31';ctx.lineWidth=2;for(let x=-WORLD.half;x<=WORLD.half;x+=WORLD.roadStep){ctx.beginPath();ctx.moveTo(px(x),0);ctx.lineTo(px(x),h);ctx.stroke();}for(let z=-WORLD.half;z<=WORLD.half;z+=WORLD.roadStep){ctx.beginPath();ctx.moveTo(0,py(z));ctx.lineTo(w,py(z));ctx.stroke();}
  ctx.strokeStyle='#237e8a';ctx.lineWidth=5;ctx.beginPath();for(let i=0;i<=30;i++){const x=-WORLD.half+i*WORLD.half*2/30,z=x*.22+30;i?ctx.lineTo(px(x),py(z)):ctx.moveTo(px(x),py(z));}ctx.stroke();
  Object.entries(MOSCOW_LOCATIONS).forEach(([key,loc])=>{ctx.fillStyle=key==='kremlin'?'#f4d27a':'#679ac0';ctx.beginPath();ctx.arc(px(loc.x),py(loc.z),key==='kremlin'?8:5,0,Math.PI*2);ctx.fill();});
  if(state.running){state.targets.filter(t=>!t.dead).forEach(t=>{const x=px(t.group.position.x),y=py(t.group.position.z);ctx.fillStyle=t.boss?'#ff9d45':'#ff6464';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=10;ctx.beginPath();ctx.moveTo(x,y-8);ctx.lineTo(x+6,y+5);ctx.lineTo(x-6,y+5);ctx.closePath();ctx.fill();});}else{for(let i=0;i<8;i++){const x=px(-WORLD.half*.72+((i*173)%(WORLD.half*1.44))),y=py(-WORLD.half*.75+((i*251)%(WORLD.half*1.5)));ctx.fillStyle='#ff6464';ctx.globalAlpha=.8;ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}}
  ctx.shadowBlur=0;const x=px(playerX),y=py(playerZ);ctx.fillStyle='#a8ff8c';ctx.shadowColor='#a8ff8c';ctx.shadowBlur=14;ctx.beginPath();ctx.arc(x,y,8,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#eaffdf';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,13,0,Math.PI*2);ctx.stroke();ctx.restore();}
 setInterval(()=>{if(byId('menu')&&!byId('menu').classList.contains('hide'))drawDashboardThreats();if(byId('dashLevel'))byId('dashLevel').textContent=state.level;if(byId('dashCoins'))byId('dashCoins').textContent=state.coins.toLocaleString('ru-RU');if(byId('dashHp'))byId('dashHp').textContent=Math.round(state.hp)+'%';if(byId('missionLevel'))byId('missionLevel').textContent='УРОВЕНЬ '+state.level;},400);
})();

shoot = function noAutoAimDuringFlight() {
  if (flight.mode === 'manual') return;
  return undefined;
};

loadSave();
ui();
try {
  setup3D();
  updateLaunchPreview();
} catch (error) {
  console.error('3D preview unavailable:',error);
  $('menuNotice').textContent = '3D-графика недоступна: ' + (error && error.message ? error.message : error);
}
drawLaunchMap();

})();
