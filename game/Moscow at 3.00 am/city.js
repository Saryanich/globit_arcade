/* Enhanced low-poly night city: Kremlin, residential blocks, village edge and grass. */
(function(){
'use strict';
window.GloBitCity = {
 build(scene, THREE, mat, location) {
   if(this.currentRoot) scene.remove(this.currentRoot);
   const root = new THREE.Group(); root.name='enhanced-city';
   const box=(w,h,d,c,x,y,z,rough=.92)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(c,rough));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;};
   const cone=(r,h,c,x,y,z,n=8)=>{const m=new THREE.Mesh(new THREE.ConeGeometry(r,h,n),mat(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;};
   const cylinder=(rt,rb,h,c,x,y,z,n=10)=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,n),mat(c));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;};
   // Kremlin towers and crenellated walls with lit windows.
   const wall=box(46,4.5,1.5,0x754637,0,2.25,-70);
   for(let x=-22;x<=22;x+=2)box(1.1,.75,1.7,0x8a5940,x,4.8,-70);
   for(const x of [-21,-11,0,11,21]){
     cylinder(2.0,2.5,8.8,0x9a6546,x,4.4,-70,10);
     cone(2.8,4.5,0x8b2825,x,10.8,-70,8);
     cone(.18,.8,0xd5b65b,x,13.4,-70,4);
     if(x===0){const star=new THREE.Mesh(new THREE.OctahedronGeometry(.72),mat(0xff3c32,.35,1.2));star.position.set(x,14.2,-70);root.add(star);}
     for(let y=3;y<6;y+=1.5)box(.3,.55,.05,0xffc46b,x,y,-68.99,.2);
   }
   // Palace facade with columns, roof line and warm windows.
   box(20,8,10,0x81705a,0,4,-81);
   box(22,.7,11,0x473c31,0,8.2,-81);
   for(let x=-8;x<=8;x+=4){cylinder(.38,.48,6.6,0xb4a082,x,3.5,-75.65,12);box(1.6,.12,.45,0x4e4637,x,6.9,-75.65);}
   for(let x=-8;x<=8;x+=2.5)box(.75,1.35,.08,0xffcb79,x,4.6,-75.92,.35);
   // More varied residential facades, roofs, windows and balconies.
   for(let z=-12;z>-145;z-=13)for(const side of [-1,1]){
     const x=side*(17+Math.random()*13), w=5+Math.random()*4, d=5+Math.random()*4, h=7+Math.random()*17;
     const palette=[0x303b37,0x46463e,0x353c45,0x574b40,0x3d4a43];
     box(w,h,d,palette[Math.floor(Math.random()*palette.length)],x,h/2,z);
     box(w+.3,.25,d+.3,0x252c28,x,h+.1,z);
     for(let y=1.5;y<h-1;y+=2.1)for(let xx=-w/2+.7;xx<w/2-.4;xx+=1.1){
       if(Math.random()>.2)box(.48,.7,.06,Math.random()>.65?0xffbf66:0x718d7a,x+xx,y,z+d/2+.035,.3);
       if(Math.random()>.72)box(.58,.08,.32,0x4b5149,x+xx,y-.45,z+d/2+.16);
     }
     // Fire escape / facade seams
     box(.07,h*.72,.08,0x6d6a5c,x-w*.34,h*.38,z+d/2+.12);
   }
   // Outskirts: grassy fields, narrow road, village houses and fences.
   const grassColor=location==='river'?0x233b34:location==='industrial'?0x2e3427:location==='village'?0x314a25:0x263e25;
   const grass=new THREE.Mesh(new THREE.PlaneGeometry(140,70),mat(grassColor));grass.rotation.x=-Math.PI/2;grass.position.set(0,.01,-135);grass.receiveShadow=true;root.add(grass);
   const roadColor=location==='industrial'?0x272b2a:location==='river'?0x2c3434:0x33362f;
   const countryRoad=new THREE.Mesh(new THREE.PlaneGeometry(location==='industrial'?12:8,75),mat(roadColor));countryRoad.rotation.x=-Math.PI/2;countryRoad.position.set(0,.04,-135);root.add(countryRoad);
   for(let i=0;i<22;i++){
     const side=i%2?1:-1, z=-104-Math.random()*58, x=side*(8+Math.random()*17);
     const w=3.3+Math.random()*2.2,h=2.3+Math.random()*1.2;
     box(w,h,3.5,Math.random()>.5?0x74604a:0x5e6950,x,h/2,z);
     const roof=cone(w*.82,1.8,0x4d3027,x,h+.8,z,4);roof.rotation.y=Math.PI/4;
     for(const xx of [-.7,.7])box(.4,.6,.08,0xffc56f,x+xx,h*.58,z+1.78,.3);
     box(.75,1.3,.09,0x3e2b20,x,h*.35,z+1.82);
     // fence posts and two rails
     for(let f=-2;f<=2;f++)box(.09,.75,.09,0x6c5940,x+f*.7,.38,z+2.5);
     box(3.1,.09,.09,0x765d40,x,.55,z+2.5);
     box(3.1,.09,.09,0x765d40,x,.25,z+2.5);
   }
   // Road markings and scattered roadside trees.
   for(let z=-104;z>-170;z-=5)box(.13,.025,2,0xd1cda8,0,.07,z);
   for(let i=0;i<35;i++){
     const x=(Math.random()-.5)*85,z=-95-Math.random()*75;
     if(Math.abs(x)<7)continue;
     cylinder(.15,.24,1.5,0x443a2b,x,.75,z,7);
     cone(1.25,3.2,0x203d2a,x,2.8,z,7);
     cone(.9,2.5,0x2d5134,x,4.1,z,7);
   }
   root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
   if(location==='river'){
     const river=new THREE.Mesh(new THREE.PlaneGeometry(48,72),mat(0x122e42,.35));river.rotation.x=-Math.PI/2;river.position.set(35,.025,-125);root.add(river);
     for(let z=-95;z>-160;z-=7)box(2,.12,.2,0x77796a,10,.14,z);
   } else if(location==='industrial'){
     for(const x of [-19,19]){box(7,9,8,0x343c3b,x,4.5,-119);cylinder(1.2,1.4,14,0x4a504e,x,7,-120,12);cylinder(1.22,1.22,.3,0xe0a34b,x,14,-120,12);}
   } else if(location==='village'){
     for(let z=-115;z>-165;z-=12){box(1.4,4,1.4,0x55483b,-5,2,z);box(1.4,4,1.4,0x55483b,5,2,z);}
   }
   scene.add(root);this.currentRoot=root;
   return root;
 }
};
})();