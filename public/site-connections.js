const labels={en:{mobile:'Launch Live 5-Tab App ↗',preview:'Actual app preview ↓',train:'Open training tools ↗',status:'Connection status ↓'},ht:{mobile:'Lanse Aplikasyon 5-Onglè a ↗',preview:'Gade aplikasyon an ↓',train:'Louvri zouti antrènman yo ↗',status:'Estati koneksyon ↓'},fr:{mobile:'Lancer l’application 5 onglets ↗',preview:'Voir l’application ↓',train:'Ouvrir les outils d’entraînement ↗',status:'État des connexions ↓'}};
function translateNavigation(){const copy=labels[document.documentElement.lang]||labels.en;document.querySelectorAll('[data-app-nav]').forEach(el=>{if(copy[el.dataset.appNav])el.textContent=copy[el.dataset.appNav]})}
translateNavigation();new MutationObserver(translateNavigation).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
import {servicePaths,serviceReadiness} from './service-readiness.js';
const panel=document.querySelector('[data-app-connections]');
if(panel){
 const button=panel.querySelector('[data-check-connections]'),summary=panel.querySelector('[data-connection-summary]');
 panel.querySelector('[data-api-origin]').textContent=location.origin;
 let busy=false;
 async function check(){
  if(busy)return;busy=true;button.disabled=true;summary.textContent='Checking this website’s public service endpoints…';
  await Promise.all(Object.entries(servicePaths).map(async([service,path])=>{
   let result;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
   try{const response=await fetch(path+'?check='+Date.now(),{method:'GET',credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal});
    let data=null;if((response.headers.get('Content-Type')||'').includes('application/json')){try{data=await response.json()}catch{/* A malformed response is incompatible, not a connection. */}}
    result=serviceReadiness(service,{ok:response.ok,status:response.status,data});
   }catch{result=serviceReadiness(service,{unreachable:true})}finally{clearTimeout(timer)}
   const card=panel.querySelector('[data-service="'+service+'"]');card.dataset.state=result.state;card.querySelector('[data-service-label]').textContent=result.label;card.querySelector('[data-service-detail]').textContent=result.detail;
  }));
  summary.textContent='Check finished on this website. No account was signed in and no workout or waitlist record was sent.';busy=false;button.disabled=false;
 }
 button.addEventListener('click',check);
 check();
}
