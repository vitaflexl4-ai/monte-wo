import {requireThat} from '../strength/engine.js';
export const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const unb64=s=>Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
export const random=()=>b64(crypto.getRandomValues(new Uint8Array(32)));
export const hash=async text=>b64(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));
export function redirects(env){return (env.MOBILE_REDIRECT_URIS||'montewo://auth').split(',').map(s=>s.trim()).filter(Boolean)}
export function checkRedirect(value,env){requireThat(redirects(env).includes(value),'redirect-not-allowed',400);const u=new URL(value);requireThat(!u.username&&!u.password&&!u.hash&&!u.search&&(u.protocol==='montewo:'||u.protocol==='https:'),'redirect-not-allowed',400);return value}
export async function key(env){requireThat(/^[a-f0-9]{64}$/i.test(env.MOBILE_SESSION_KEY||''),'mobile-secret-not-configured',503);return crypto.subtle.importKey('raw',Uint8Array.from(env.MOBILE_SESSION_KEY.match(/../g),h=>parseInt(h,16)),{name:'AES-GCM'},false,['encrypt','decrypt'])}
export async function seal(text,env){const iv=crypto.getRandomValues(new Uint8Array(12));return b64(iv)+'.'+b64(await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(env),new TextEncoder().encode(text)))}
export async function open(value,env){const [iv,body]=value.split('.');return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(iv)},await key(env),unb64(body)))}
export async function readJson(request,limit=65536){
 requireThat(request.headers.get('Content-Type')?.split(';')[0]==='application/json','json-required',415);
 const reader=request.body?.getReader();requireThat(reader,'empty-body');let total=0;const chunks=[];
 while(true){const {value,done}=await reader.read();if(done)break;total+=value.length;if(total>limit){await reader.cancel();requireThat(false,'body-too-large',413)}chunks.push(value)}
 const raw=new Uint8Array(total);let offset=0;for(const c of chunks){raw.set(c,offset);offset+=c.length}
 try{return JSON.parse(new TextDecoder().decode(raw))}catch{requireThat(false,'invalid-json')}
}
export function bearer(request){const m=/^Bearer (mw1_[A-Za-z0-9_-]{43})$/.exec(request.headers.get('Authorization')||'');requireThat(m,'authentication-required',401);return m[1]}
