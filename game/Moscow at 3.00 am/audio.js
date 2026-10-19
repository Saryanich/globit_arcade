
(function(){
'use strict';
let ctx, osc, gain, noise, noiseGain, realEngine, sirenOsc, sirenGain, sirenTimer, sirenClip; const droneVoices=new Map();
function start(){
  try {
    if(!realEngine){realEngine=new Audio('https://sfxmint.com/dl/propeller-plane-01.mp3');realEngine.loop=true;realEngine.preload='auto';realEngine.volume=.18;}
    const playback=realEngine.play();if(playback&&playback.catch)playback.catch(()=>{});
  } catch(e) {}
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC) return;
  if(!ctx) ctx=new AC();
  if(ctx.state==='suspended') ctx.resume();
  if(osc) return;
  osc=ctx.createOscillator(); gain=ctx.createGain();
  osc.type='sawtooth'; osc.frequency.value=78; gain.gain.value=0.0001;
  osc.connect(gain); gain.connect(ctx.destination); osc.start();
  const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate), data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*0.25;
  noise=ctx.createBufferSource(); noise.buffer=buffer; noise.loop=true;
  const filter=ctx.createBiquadFilter(); filter.type='lowpass'; filter.frequency.value=380;
  noiseGain=ctx.createGain(); noiseGain.gain.value=0.0001;
  noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(ctx.destination); noise.start();
}
function ensureContext(){const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;if(!ctx)ctx=new AC();if(ctx.state==='suspended')ctx.resume();return ctx;}
function startSiren(){const c=ensureContext();if(!c)return;stopSiren();try{sirenClip=new Audio('https://sfxmint.com/dl/mechanical-siren-01.mp3');sirenClip.loop=true;sirenClip.volume=.3;const p=sirenClip.play();if(p&&p.catch)p.catch(()=>{});}catch(e){}try{sirenOsc=c.createOscillator();sirenGain=c.createGain();sirenOsc.type='sawtooth';sirenOsc.frequency.value=620;sirenGain.gain.value=.045;sirenOsc.connect(sirenGain);sirenGain.connect(c.destination);sirenOsc.start();let high=true;sirenTimer=setInterval(()=>{if(!sirenOsc)return;high=!high;sirenOsc.frequency.setTargetAtTime(high?880:560,c.currentTime,.22);},720);}catch(e){}}
function stopSiren(){if(sirenTimer)clearInterval(sirenTimer);sirenTimer=null;if(sirenClip){sirenClip.pause();sirenClip.currentTime=0;sirenClip=null;}if(sirenOsc){try{sirenOsc.stop();}catch(e){}sirenOsc=null;sirenGain=null;}}
function announce(text){try{if(!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='ru-RU';u.rate=.88;u.pitch=.72;u.volume=.92;u.voice=window.speechSynthesis.getVoices().find(v=>/^ru(-|_)/i.test(v.lang))||null;window.speechSynthesis.speak(u);}catch(e){}}
function droneSound(kind='drone',volume=1){const c=ensureContext();if(!c)return;let d=droneVoices.get(kind);if(!d){const o=c.createOscillator(),o2=c.createOscillator(),g=c.createGain(),f=c.createBiquadFilter();o.type=kind==='babaYaga'?'sawtooth':kind==='scout'?'triangle':'square';o2.type='sawtooth';o.frequency.value=kind==='babaYaga'?43:kind==='scout'?190:105;o2.frequency.value=kind==='babaYaga'?49:kind==='scout'?203:112;f.type='lowpass';f.frequency.value=kind==='babaYaga'?250:kind==='scout'?950:580;g.gain.value=.0001;o.connect(f);o2.connect(f);f.connect(g);g.connect(c.destination);o.start();o2.start();d={o,o2,g};droneVoices.set(kind,d);}const t=c.currentTime;d.g.gain.setTargetAtTime(Math.max(.0001,Math.min(.07,.025*volume)),t,.25);d.o.frequency.setTargetAtTime((kind==='babaYaga'?43:kind==='scout'?190:105)+Math.random()*20,t,.3);d.o2.frequency.setTargetAtTime((kind==='babaYaga'?49:kind==='scout'?203:112)+Math.random()*18,t,.3);}
function stopDroneSounds(){if(ctx)for(const d of droneVoices.values())d.g.gain.setTargetAtTime(.0001,ctx.currentTime,.2);}
window.GloBitBossAudio={
 start, startSiren, stopSiren, announce, droneSound, stopDroneSounds,
 setFlightSpeed(v){ if(!ctx||!gain||!noiseGain)return; const t=ctx.currentTime; const n=Math.max(0,Math.min(1,v)); if(realEngine)realEngine.volume=.12+n*.42; gain.gain.setTargetAtTime(0.018+n*0.035,t,0.15); noiseGain.gain.setTargetAtTime(0.008+n*0.025,t,0.2); osc.frequency.setTargetAtTime(65+n*90,t,0.15); },
 stop(){ if(realEngine){realEngine.pause();realEngine.currentTime=0;} if(!ctx)return; const t=ctx.currentTime; if(gain)gain.gain.setTargetAtTime(0.0001,t,0.25); if(noiseGain)noiseGain.gain.setTargetAtTime(0.0001,t,0.25); }
};
})();
