/* Procedural audio fallback for the boss propeller; no external assets or tracking. */
(function(){
'use strict';
let ctx, osc, gain, noise, noiseGain, realEngine;
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
window.GloBitBossAudio={
 start,
 setFlightSpeed(v){ if(!ctx||!gain||!noiseGain)return; const t=ctx.currentTime; const n=Math.max(0,Math.min(1,v)); if(realEngine)realEngine.volume=.12+n*.42; gain.gain.setTargetAtTime(0.018+n*0.035,t,0.15); noiseGain.gain.setTargetAtTime(0.008+n*0.025,t,0.2); osc.frequency.setTargetAtTime(65+n*90,t,0.15); },
 stop(){ if(realEngine){realEngine.pause();realEngine.currentTime=0;} if(!ctx)return; const t=ctx.currentTime; if(gain)gain.gain.setTargetAtTime(0.0001,t,0.25); if(noiseGain)noiseGain.gain.setTargetAtTime(0.0001,t,0.25); }
};
})();