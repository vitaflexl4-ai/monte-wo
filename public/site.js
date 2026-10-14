import {applyRankVisuals} from './ranks.js';
// Shared behavior for the Phase 1 company, legal, ranks, and waitlist pages.
const $=s=>document.querySelector(s);
let installPrompt;
function connectivity(){if($('#connection-text'))$('#connection-text').textContent=navigator.onLine?'ONLINE':'OFFLINE';$('.connection-status')?.classList.toggle('offline',!navigator.onLine)}
connectivity();window.addEventListener('online',connectivity);window.addEventListener('offline',connectivity);
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e});
$('#install-button')?.addEventListener('click',async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null}else alert('Use your browser’s Install app or Add to Home Screen option. On iPhone/iPad, open Safari → Share → Add to Home Screen. A supported browser and HTTPS are required. This installs the website, not a native app.')});
$('#privacy-button')?.addEventListener('click',()=>location.href='/delete-account/#clear-device');
function openClear(){const dialog=$('#confirm-clear');dialog.showModal();$('#confirm-clear-no').focus()}
$('#clear-device')?.addEventListener('click',openClear);
$('#confirm-clear-no')?.addEventListener('click',()=>$('#confirm-clear').close());
$('#confirm-clear-yes')?.addEventListener('click',async()=>{
 const button=$('#confirm-clear-yes');button.disabled=true;let blocked=false;
 try{for(const key of ['mw-calculator','mw-language'])localStorage.removeItem(key)}catch{blocked=true}
 try{if('caches' in window){const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('montewo-')||k.startsWith('vitaflex-monte-wo')||k.startsWith('vitaflex-r2-')).map(k=>caches.delete(k)))}}catch{blocked=true}
 try{if('serviceWorker' in navigator){const registrations=await navigator.serviceWorker.getRegistrations();await Promise.all(registrations.filter(r=>[r.active,r.waiting,r.installing].some(w=>w?.scriptURL===location.origin+'/sw.js')).map(r=>r.unregister()))}}catch{blocked=true}
 $('#confirm-clear').close();button.disabled=false;
 $('#device-status').textContent=blocked?'Some browser storage controls were unavailable. Use your browser’s site-data settings to finish clearing this site. No server data was deleted.':'Local Monte Wo preferences and offline caches cleared. Your server data and waitlist signup were not deleted. Other open tabs may need to be closed. Future visits may cache the site again.';
});
$('#deletion-form')?.addEventListener('submit',e=>{
 e.preventDefault();if(!e.currentTarget.reportValidity())return;
 const type=$('#request-type').value,email=$('#request-email').value.trim();
 const subject=type==='waitlist'?'MONTE WO — Waitlist deletion request':'MONTE WO — Account / personal data deletion request';
 const body=`Hello Monte Wo,\n\nPlease ${type==='waitlist'?'remove my waitlist signup and withdraw my consent to launch updates':'help me delete my account or other personal data'}.\n\nAssociated email: ${email}\n\nI will send this request from the associated email address. Please let me know if further verification is needed.\n\nThank you.`;
 const href='mailto:Montewo@vitaflexbusinessgroup.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
 const status=$('#deletion-status');status.textContent='Email draft prepared—not sent. Send it from your email app to complete your request. If no app opened, email Montewo@vitaflexbusinessgroup.com directly.';
 const a=document.createElement('a');a.href=href;a.click();
});
const signup=$('#waitlist-form');
if(signup){
 let config=null,token='',widget=null,busy=false;
 const status=$('#waitlist-status'),submit=$('#waitlist-submit');
 function message(text,type=''){status.textContent=text;status.className='signup-status '+type}
 function ready(){submit.disabled=busy||!config?.available||!navigator.onLine||(!config.localTest&&!token)}
 function resetChallenge(){token='';if(widget!==null&&window.turnstile)window.turnstile.reset(widget);ready()}
 function unavailable(text){message(text+' You can contact Montewo@vitaflexbusinessgroup.com for help.','error');submit.disabled=true}
 const errors={email:'Enter a valid email address.',consent:'Please read the Privacy Policy and check the consent box.',verification:'Please complete the security check again.','verification-unavailable':'The security check is temporarily unavailable. Please try later.','rate-limit':'Too many requests. Please try again after the current hour.','storage-unavailable':'Your signup could not be saved. Please try later.',unavailable:'Signup is not configured yet. Please try later.',origin:'This form must be submitted from the Monte Wo website.',blocked:'This signup could not be accepted.',invalid:'Check your information and try again.'};
 async function loadConfig(){
  if(window.__MW_NATIVE){unavailable('Waitlist signup is not available inside the app yet — please use the website. Nothing has been submitted.');return}
  if(!navigator.onLine){unavailable('You’re offline. A waitlist signup requires internet. Nothing has been submitted.');return}
  try{
   const res=await fetch('/api/waitlist/config',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!res.ok)throw new Error('config');config=await res.json();
   if(!config.available){unavailable('Waitlist signup is not active yet. Nothing will be collected until the service is configured.');return}
   if(config.localTest){message('Local development only: signups are saved to a local test database, not the production waitlist.');ready();return}
   if(!config.siteKey)throw new Error('sitekey');
   message('Complete the security check, then join the waitlist.');
   if(window.turnstile){renderChallenge();return}
   const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.defer=true;
   script.onload=renderChallenge;script.onerror=()=>unavailable('The security check could not load. Please check your connection or privacy settings.');document.head.append(script);
  }catch{unavailable('Signup availability could not be checked. Nothing has been submitted.')}
 }
 function renderChallenge(){
  if(widget!==null)return;
  try{widget=window.turnstile.render('#turnstile-container',{sitekey:config.siteKey,action:'waitlist',theme:'dark',size:'flexible',callback:value=>{token=value;ready()},'expired-callback':()=>{token='';ready();message('The security check expired. Complete it again.')},'error-callback':()=>{token='';ready();message('The security check failed. Please try again.','error')}})}catch{unavailable('The security check could not start.')}
 }
 try{const preferred=localStorage.getItem('mw-language');if(['en','ht','fr'].includes(preferred))$('#waitlist-language').value=preferred}catch{}
 signup.addEventListener('submit',async e=>{
  e.preventDefault();if(!signup.reportValidity()||busy)return;
  if(!navigator.onLine){unavailable('You’re offline. Nothing has been submitted.');return}
  if(!config?.available||(!config.localTest&&!token)){message('Complete the security check before submitting.','error');return}
  busy=true;ready();message('Saving your signup…');
  try{
   const res=await fetch('/api/waitlist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:$('#waitlist-email').value.trim(),locale:$('#waitlist-language').value,consent:$('#waitlist-consent').checked,consentVersion:config.consentVersion,website:$('#company-website').value,token}),signal:AbortSignal.timeout(15000)});
   let result;try{result=await res.json()}catch{throw new Error('response')}
   if(!res.ok||!result.ok){message(errors[result.error]||'Your signup could not be saved. Please try again.','error');return}
   signup.reset();message(config.localTest?'Saved to the local test database only. No confirmation email was sent.':'Your waitlist signup is saved. If this address was already listed, no duplicate was created. No confirmation email is sent by this website.','success');
  }catch{message('We couldn’t confirm your signup. Check your connection and try again; duplicate requests won’t add another record.','error')}
  finally{busy=false;resetChallenge()}
 });
 window.addEventListener('offline',()=>{ready();message('You’re offline. Signups are not queued or saved on this device.','error')});
 window.addEventListener('online',()=>{if(!config?.available)loadConfig();else{ready();message('You’re back online. Complete the form to join.')}});
 loadConfig();
}
if('serviceWorker' in navigator&&!window.__MW_NATIVE)window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{})});

applyRankVisuals();
