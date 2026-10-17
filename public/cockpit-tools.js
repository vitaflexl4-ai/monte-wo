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
