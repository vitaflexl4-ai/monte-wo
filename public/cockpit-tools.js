import {makeSet,sessionVolume} from './cockpit-session.js';
const $=s=>document.querySelector(s);
const number=new Intl.NumberFormat(undefined,{maximumFractionDigits:2});
export function bindSessionLogger(catalog){
 const entries=new Map(catalog.exercises.map(e=>[e.id,e])),sets=[];
 let locked=false; const listeners=new Set();
 const select=$('#set-exercise');
 for(const e of [...entries.values()].sort((a,b)=>a.name.localeCompare(b.name))){const option=document.createElement('option');option.value=e.id;option.textContent=e.name;select.append(option)}
 for(const e of document.querySelectorAll('#set-form [disabled]'))e.disabled=false;
 function paint(){
  $('#set-history').replaceChildren();
  for(const item of sets){const tr=document.createElement('tr');for(const value of [item.name,number.format(item.weight),item.reps,number.format(item.volume)]){const td=document.createElement('td');td.textContent=String(value);tr.append(td)}const time=document.createElement('small');time.textContent=new Date(item.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});tr.firstChild.append(time);$('#set-history').append(tr)}
  $('#set-count').textContent=sets.length;$('#total-volume').textContent=number.format(sessionVolume(sets));$('#history-empty').hidden=!!sets.length;$('#clear-session').disabled=locked||!sets.length;
  for(const listener of listeners)listener();
 }
 $('#set-form').addEventListener('submit',event=>{event.preventDefault();if(locked)return;if(!event.currentTarget.reportValidity())return;try{if(sets.length>=500)throw Error('This session has reached 500 sets. Start a new session before logging more.');const item=makeSet(entries.get(select.value),$('#set-weight').value,$('#set-reps').value);sets.push(item);paint();$('#logger-status').textContent=`Logged ${item.name}: ${item.weight} lbs × ${item.reps} reps = ${number.format(item.volume)} lb·reps.`;const scroll=$('.history-scroll');scroll.scrollTop=scroll.scrollHeight;}catch(error){$('#logger-status').textContent=error.message}});
 $('#clear-session').addEventListener('click',()=>{$('#clear-confirm').hidden=false;$('#confirm-clear-session').focus()});
 $('#cancel-clear-session').addEventListener('click',()=>{$('#clear-confirm').hidden=true;$('#clear-session').focus()});
 $('#confirm-clear-session').addEventListener('click',()=>{if(locked)return;sets.length=0;paint();$('#clear-confirm').hidden=true;$('#logger-status').textContent='Session cleared. Nothing was uploaded or synced.';select.focus()});
 return {
  snapshot:()=>sets.map(row=>({...row})),
  subscribe:listener=>listeners.add(listener),
  lock(value){locked=value;for(const element of document.querySelectorAll('#set-form input, #set-form select, #set-form button'))element.disabled=value;$('#clear-confirm').hidden=true;$('#clear-session').disabled=value||!sets.length;},
  clear(message){sets.length=0;paint();$('#clear-confirm').hidden=true;$('#logger-status').textContent=message;}
 };
}
let stream=null,generation=0,requesting=false;
function cameraState(message,active=false){
 $('#camera-status').textContent=message;$('#camera-badge').textContent=active?'LIVE · PREVIEW ONLY':'CAMERA OFF';$('#scan-overlay').hidden=!active;$('#camera-placeholder').hidden=active;$('#camera-frame').classList.toggle('is-live',active);
}
export function stopFoodCamera(message='Camera stopped. No media was recorded or uploaded.'){
 generation++;requesting=false;
 if(stream){for(const track of stream.getTracks())track.stop();stream=null}
 const video=$('#food-camera');video.pause();video.srcObject=null;
 $('#activate-camera').disabled=false;$('#stop-camera').disabled=true;cameraState(message);
}
export async function initializeFoodCamera(){
 if(stream||requesting)return;
 const attempt=++generation;requesting=true;$('#activate-camera').disabled=true;$('#stop-camera').disabled=false;
 cameraState('Requesting camera access. Audio is not requested.');
 try{
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw Object.assign(Error('Use HTTPS or localhost, and open this page in a supported browser.'),{name:'SecureContextError'});
  const policy=document.permissionsPolicy||document.featurePolicy;
  if(policy?.allowsFeature&&!policy.allowsFeature('camera'))throw Object.assign(Error('This embedded page does not have camera permission. Open the scanner in a new tab.'),{name:'PolicyError'});
  const incoming=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
  if(attempt!==generation){incoming.getTracks().forEach(t=>t.stop());return}
  stream=incoming;const video=$('#food-camera');video.srcObject=incoming;
  for(const track of incoming.getVideoTracks())track.addEventListener('ended',()=>{if(stream===incoming)stopFoodCamera('Camera connection ended. Activate it again to reconnect.');},{once:true});
  await video.play();
  if(attempt!==generation)return;
  cameraState('Live camera preview. The reticle is a visual guide only; no ingredients are being identified.',true);
 }catch(error){
  if(attempt!==generation)return;
  const messages={NotAllowedError:'Camera permission was denied or blocked by the embedded preview. Allow camera access, or open this page in a new tab.',NotFoundError:'No camera was found on this device.',NotReadableError:'The camera is busy or unavailable. Close other camera apps and try again.',SecurityError:'Browser security blocked camera access. Open this page directly over HTTPS.'};
  stopFoodCamera(messages[error.name]||error.message||'Unable to start the camera. Try opening the page directly.');
 }finally{if(attempt===generation){requesting=false;$('#activate-camera').disabled=!!stream;$('#stop-camera').disabled=!stream}}
}
// Explicit click is the only start path. Never start on page load or tab return.
window.initializeFoodCamera=initializeFoodCamera;
$('#activate-camera').addEventListener('click',()=>initializeFoodCamera());
$('#stop-camera').addEventListener('click',()=>stopFoodCamera());
window.addEventListener('pagehide',()=>stopFoodCamera());
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(stream||requesting))stopFoodCamera('Camera stopped when this page became inactive. Activate it again when ready.')});

// AI Muscle Definition Camera & 9:16 Story Exporter (Shadow Reconstruction visual guide)
if($('#gains-camera-panel')){
 let gainsStream=null,gainsPreset='shadow_sculpt',capturedReady=false;
 const presetFilters={
  shadow_sculpt:'contrast(1.54) brightness(0.9) saturate(1.16)',
  anabolic_noir:'grayscale(0.82) contrast(1.74) brightness(0.88)',
  gold_rim:'contrast(1.48) brightness(0.93) sepia(0.24) saturate(1.36)',
  raw:'contrast(1.05) brightness(1.0)'
 };
 const setGainsStatus=msg=>{const el=$('#gains-status');if(el)el.textContent=msg;};
 function stopGainsCamera(msg='Muscle lens stopped. Captured frame remains local.'){
  if(gainsStream){for(const track of gainsStream.getTracks())track.stop();gainsStream=null}
  const v=$('#gains-camera-video');if(v){v.pause();v.srcObject=null}
  $('#gains-viewfinder').classList.remove('is-live');
  $('#activate-gains-camera').disabled=false;$('#stop-gains-camera').disabled=true;
  if(!capturedReady)$('#gains-camera-placeholder').hidden=false;
  setGainsStatus(msg);
 }
 async function startGainsCamera(){
  if(gainsStream)return;
  $('#activate-gains-camera').disabled=true;$('#stop-gains-camera').disabled=false;
  setGainsStatus('Requesting HD webcam stream for Shadow Reconstruction…');
  try{
   if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw Error('Camera requires HTTPS or localhost.');
   const incoming=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'user'},width:{ideal:1920},height:{ideal:1080}},audio:false});
   gainsStream=incoming;
   const v=$('#gains-camera-video');v.srcObject=incoming;await v.play();
   $('#gains-preview-canvas').hidden=true;$('#gains-camera-placeholder').hidden=true;
   $('#gains-viewfinder').classList.add('is-live');
   setGainsStatus('Live HD feed active · Shadow Reconstruction contour shader applied.');
  }catch{
   stopGainsCamera('Live camera unavailable in this frame — tap the electric-blue shutter to capture an HD simulated Shadow Reconstruction frame.');
  }
 }
 function drawSimulatedSculpt(ctx,w,h){
  const g=ctx.createRadialGradient(w/2,h*0.38,40,w/2,h*0.5,h*0.65);
  g.addColorStop(0,gainsPreset==='gold_rim'?'#2b1e08':'#0b2340');g.addColorStop(0.6,'#050b17');g.addColorStop(1,'#010308');
  ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  ctx.save();ctx.translate(w/2,h*0.12);
  const rim=gainsPreset==='gold_rim'?'#fde047':'#00d2ff';
  ctx.fillStyle='#0f1828';ctx.strokeStyle=rim;ctx.lineWidth=5;ctx.shadowColor=rim;ctx.shadowBlur=26;
  ctx.beginPath();ctx.ellipse(0,95,54,66,0,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(-80,175);ctx.quadraticCurveTo(0,148,80,175);
  ctx.bezierCurveTo(225,188,262,278,228,395);ctx.bezierCurveTo(185,485,138,570,104,695);
  ctx.lineTo(-104,695);ctx.bezierCurveTo(-138,570,-185,485,-228,395);ctx.bezierCurveTo(-262,278,-225,188,-80,175);
  ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
 }
 function captureGainsFrame(){
  const preview=$('#gains-preview-canvas'),story=$('#gains-story-canvas'),v=$('#gains-camera-video');
  preview.width=1080;preview.height=1440;
  const pctx=preview.getContext('2d');
  if(gainsStream&&v.videoWidth>0){
   pctx.save();pctx.filter=presetFilters[gainsPreset]||presetFilters.shadow_sculpt;
   pctx.translate(1080,0);pctx.scale(-1,1);
   const s=Math.max(1080/v.videoWidth,1440/v.videoHeight),dw=v.videoWidth*s,dh=v.videoHeight*s;
   pctx.drawImage(v,(1080-dw)/2,(1440-dh)/2,dw,dh);pctx.restore();
  }else{drawSimulatedSculpt(pctx,1080,1440)}
  preview.hidden=false;$('#gains-camera-placeholder').hidden=true;capturedReady=true;
  // Render vertical 9:16 (1080x1920) MONTE WO · LEVEL UP Story Canvas
  const sctx=story.getContext('2d');
  sctx.fillStyle='#020611';sctx.fillRect(0,0,1080,1920);
  sctx.drawImage(preview,56,240,968,1300);
  sctx.strokeStyle='#00d2ff';sctx.lineWidth=4;sctx.strokeRect(56,240,968,1300);
  sctx.fillStyle='#00209f';sctx.fillRect(56,64,484,12);
  sctx.fillStyle='#d21034';sctx.fillRect(540,64,484,12);
  sctx.fillStyle='#ffffff';sctx.font='900 60px system-ui,sans-serif';sctx.fillText('MONTE WO · LEVEL UP',56,152);
  sctx.fillStyle='#00d2ff';sctx.font='800 26px system-ui,sans-serif';sctx.fillText('AI GAINS DETECTOR · SHADOW RECONSTRUCTION',56,198);
  sctx.fillStyle='#071124';sctx.fillRect(56,1585,968,245);
  sctx.strokeStyle='#fbbf24';sctx.lineWidth=4;sctx.strokeRect(56,1585,968,245);
  sctx.fillStyle='#fde047';sctx.font='900 26px system-ui,sans-serif';sctx.fillText('RAN FÒ AK KOURAY · HAITIAN RANK BADGE',92,1655);
  sctx.fillStyle='#ffffff';sctx.font='900 68px system-ui,sans-serif';sctx.fillText('CHANPYON',92,1738);
  sctx.fillStyle='#94a3b8';sctx.font='700 25px system-ui,sans-serif';sctx.fillText('KOUWÒN CHANPYON AYITI · #MonteWo #LevelUp',92,1792);
  $('#gains-viewfinder').classList.add('has-flash');setTimeout(()=>$('#gains-viewfinder').classList.remove('has-flash'),160);
  setGainsStatus('Captured 9:16 Shadow-Reconstructed photo! Ready to Save to Gallery or Share to Story.');
 }
 for(const b of document.querySelectorAll('[data-gains-preset]'))b.addEventListener('click',()=>{
  gainsPreset=b.dataset.gainsPreset;$('#gains-viewfinder').dataset.preset=gainsPreset;
  for(const x of document.querySelectorAll('[data-gains-preset]'))x.setAttribute('aria-pressed',String(x===b));
  if(capturedReady)captureGainsFrame();
 });
 $('#activate-gains-camera').addEventListener('click',()=>startGainsCamera());
 $('#stop-gains-camera').addEventListener('click',()=>stopGainsCamera());
 $('#gains-shutter-button').addEventListener('click',()=>captureGainsFrame());
 $('#gains-save-gallery').addEventListener('click',()=>{
  if(!capturedReady)captureGainsFrame();
  const a=document.createElement('a');a.href=$('#gains-preview-canvas').toDataURL('image/png');
  a.download='monte-wo-gains-capture.png';a.click();
  setGainsStatus('Saved high-fidelity Shadow Reconstruction capture to your device gallery!');
 });
 $('#gains-share-story').addEventListener('click',()=>{
  if(!capturedReady)captureGainsFrame();
  $('#gains-story-dialog').showModal();
 });
 $('#close-gains-story').addEventListener('click',()=>$('#gains-story-dialog').close());
 $('#gains-native-share').addEventListener('click',()=>{
  const story=$('#gains-story-canvas');
  story.toBlob(blob=>{
   if(!blob)return;
   const file=new File([blob],'monte-wo-story-chanpyon.png',{type:'image/png'});
   if(navigator.canShare&&navigator.canShare({files:[file]})){
    navigator.share({title:'MONTE WO · LEVEL UP',text:'MONTE WO · LEVEL UP — CHANPYON',files:[file]}).catch(()=>{});
   }else{
    const a=document.createElement('a');a.href=story.toDataURL('image/png');a.download='monte-wo-9x16-story.png';a.click();
    setGainsStatus('Exported 9:16 Story PNG — ready to post directly to Instagram & TikTok Stories!');
   }
  },'image/png');
 });
 window.addEventListener('pagehide',()=>stopGainsCamera());
}
