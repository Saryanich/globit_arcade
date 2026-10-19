
(function(){
'use strict';
window.createBossModel = function(THREE, mat, bossName) {
  const isPotuzhnolit = bossName === 'Потужнолит';
  const g = new THREE.Group();
  const barrelColor = isPotuzhnolit ? 0x174f8a : 0xc9c4b5;
  const stripeColor = isPotuzhnolit ? 0xe2bd38 : 0x1457bd;
  const redColor = isPotuzhnolit ? 0x7e8c20 : 0xb52e28;
  const metal = mat(0x6f6a5c), rust = mat(0x70442d), wood = mat(0x34291f);
  const barrelMat = mat(barrelColor), stripeMat = mat(stripeColor), redMat = mat(redColor);
  const dark = mat(0x211f1b), skin = mat(isPotuzhnolit ? 0xb58a70 : 0xd0a184);
  const clothes = mat(isPotuzhnolit ? 0x28372d : 0x101d37);
  const shirt = mat(isPotuzhnolit ? 0x303a31 : 0xe0d9cb);
  const add = (geo, material, x,y,z, rx=0,ry=0,rz=0) => {
    const m = new THREE.Mesh(geo,material); m.position.set(x,y,z); m.rotation.set(rx,ry,rz);
    m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
  };
  // Horizontal weathered steel drum, with broad painted bands.
  add(new THREE.CylinderGeometry(1.05,1.05,2.65,32,1,true),barrelMat,0,0.92,0,0,0,Math.PI/2);
  add(new THREE.CircleGeometry(1.04,32),metal,-1.34,0.92,0,0,0,0);
  add(new THREE.CircleGeometry(1.04,32),barrelMat,1.34,0.92,0,0,0,0);
  // Paint bands run around the drum; cylinders are rotated onto their side.
  add(new THREE.CylinderGeometry(1.055,1.055,0.43,32,1,true),stripeMat,0,0.92,0,0,0,Math.PI/2);
  add(new THREE.CylinderGeometry(1.057,1.057,0.42,32,1,true),redMat,0,0.92,0,0,0,Math.PI/2);
  // Metal hoops, end bolts, seams, dents and rust patches.
  for(let x of [-1.05,-0.58,0.58,1.05]) add(new THREE.TorusGeometry(1.055,0.035,6,32),metal,x,0.92,0,0,Math.PI/2,0);
  for(let i=0;i<14;i++){
    const a=i*Math.PI*2/14;
    add(new THREE.SphereGeometry(0.045,6,5),i%3===0?rust:metal,-1.365,0.92+Math.sin(a)*0.83,Math.cos(a)*0.83,0,0,0);
  }
  for(let i=0;i<24;i++){
    const x=-1.1+(i%8)*0.31, y=0.25+Math.floor(i/8)*0.48;
    add(new THREE.SphereGeometry(0.025+(i%3)*0.012,5,4),i%2?rust:dark,x,y,0.99);
  }
  // Open top rim and seated pilot torso/head.
  add(new THREE.BoxGeometry(1.55,0.13,1.55),metal,0,1.86,0);
  add(new THREE.BoxGeometry(0.92,0.94,0.72),clothes,0,2.18,0.04);
  add(new THREE.BoxGeometry(0.16,0.75,0.07),shirt,0,2.16,0.42);
  if(!isPotuzhnolit) add(new THREE.BoxGeometry(0.13,0.55,0.08),mat(0x8e2430),0,2.12,0.47);
  else {
    add(new THREE.BoxGeometry(1.02,0.62,0.22),mat(0x4c5849),0,2.2,0.4);
    for(let i=0;i<4;i++) add(new THREE.BoxGeometry(0.19,0.19,0.05),mat(0x656b55),-0.32+i*0.21,2.24,0.54);
  }
  add(new THREE.SphereGeometry(0.36,16,12),skin,0,2.87,0.06);
  // Ears, nose, eyes, brows and mouth make the head read as a character at game distance.
  for(const x of [-0.36,0.36]) add(new THREE.SphereGeometry(0.085,8,6),skin,x,2.88,0.04);
  add(new THREE.SphereGeometry(0.09,8,6),skin,0,2.83,0.39);
  for(const x of [-0.13,0.13]){
    add(new THREE.SphereGeometry(0.045,8,6),mat(0xf2eadc),x,2.96,0.365);
    add(new THREE.SphereGeometry(0.021,6,5),dark,x,2.96,0.402);
    add(new THREE.BoxGeometry(0.12,0.035,0.035),dark,x,3.035,0.36);
  }
  add(new THREE.SphereGeometry(0.085,8,6),dark,0,2.69,0.35);
  // Hair / short beard differ between the two boss silhouettes.
  add(new THREE.SphereGeometry(0.37,12,8,0,Math.PI*2,0,Math.PI/2),mat(isPotuzhnolit?0x2c2923:0xaaa49a),0,3.04,0.02);
  if(isPotuzhnolit) add(new THREE.SphereGeometry(0.29,10,8,0,Math.PI*2,0,Math.PI/2),dark,0,2.72,0.1);
  // Two arms rest on the drum rim.
  for(const side of [-1,1]){
    add(new THREE.CapsuleGeometry(0.13,0.48,4,8),clothes,side*0.53,2.14,0.29,0,0,side*-0.25);
    add(new THREE.SphereGeometry(0.12,8,6),skin,side*0.58,1.97,0.61);
  }
  // Tailplane and vertical fin at the rear.
  add(new THREE.BoxGeometry(0.72,0.09,1.35),metal,1.68,0.93,0);
  add(new THREE.BoxGeometry(0.12,0.72,0.64),stripeMat,1.78,1.25,0);
  add(new THREE.BoxGeometry(0.12,0.24,0.64),redMat,1.79,0.88,0);
  // Large rough wooden propeller at the front, plus hub and bolts.
  add(new THREE.CylinderGeometry(0.13,0.13,0.18,12),metal,-1.48,0.92,0,0,0,Math.PI/2);
  add(new THREE.BoxGeometry(0.20,2.35,0.19),wood,-1.57,0.92,0,0,0,0.13);
  add(new THREE.BoxGeometry(1.85,0.20,0.19),wood,-1.58,0.92,0,0,0,-0.13);
  add(new THREE.CylinderGeometry(0.12,0.12,0.22,12),rust,-1.70,0.92,0,0,0,Math.PI/2);
  for(let i=0;i<6;i++) add(new THREE.SphereGeometry(0.035,6,5),metal,-1.72,0.92+Math.sin(i*Math.PI/3)*0.17,Math.cos(i*Math.PI/3)*0.17);
  // Crude welded steel cradle and runners.
  for(const z of [-0.77,0.77]){
    add(new THREE.BoxGeometry(3.7,0.12,0.13),wood,0.05,0.04,z);
    add(new THREE.BoxGeometry(0.12,0.95,0.12),metal,-0.8,0.48,z);
    add(new THREE.BoxGeometry(0.12,0.95,0.12),metal,0.85,0.48,z);
    add(new THREE.BoxGeometry(2.0,0.10,0.12),metal,0.05,0.45,z);
  }
  for(let i=0;i<10;i++){
    const x=-1.1+(i%5)*0.52, z=i<5?-0.78:0.78;
    add(new THREE.BoxGeometry(0.22,0.045,0.045),rust,x,0.13,z);
  }
  g.userData.bossName=bossName;
  g.userData.bossStyle=isPotuzhnolit?'blue-yellow military barrel':'white-blue-red suit barrel';
  return g;
};
})();
