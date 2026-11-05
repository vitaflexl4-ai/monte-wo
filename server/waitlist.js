import {trustedOrigin} from './native.js';
const VERSION='2026-10-11-v1';
const MAX_BODY=4096;
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function localMode(env,url){return env.LOCAL_DEVELOPMENT==='true'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)}
export function settings(env,url){const local=localMode(env,url);return {available:!!env.DB&&(local||!!(env.TURNSTILE_SITE_KEY&&env.TURNSTILE_SECRET&&env.RATE_LIMIT_SALT)),siteKey:local?null:env.TURNSTILE_SITE_KEY||null,localTest:local,consentVersion:VERSION}}
export function validateSignup(body){
 if(!body||typeof body!=='object')return 'invalid';
 if(typeof body.email!=='string'||body.email.length>254)return 'email';
 const email=body.email.trim().toLowerCase();
 if(!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(email)||email.split('@')[0].length>64||email.includes('..'))return 'email';
 if(body.consent!==true||body.consentVersion!==VERSION)return 'consent';
 if(body.website)return 'blocked';
 return {email,locale:['en','ht','fr'].includes(body.locale)?body.locale:'en'};
}
async function readBody(request){
 if(Number(request.headers.get('Content-Length'))>MAX_BODY)throw new Error('too large');
 const reader=request.body?.getReader();if(!reader)throw new Error('empty');let size=0;const parts=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_BODY){await reader.cancel();throw new Error('too large')}parts.push(value)}
 const bytes=new Uint8Array(size);let at=0;for(const p of parts){bytes.set(p,at);at+=p.length}return JSON.parse(new TextDecoder().decode(bytes));
}
async function ipKey(ip,salt){const enc=new TextEncoder();const key=await crypto.subtle.importKey('raw',enc.encode(salt),{name:'HMAC',hash:'SHA-256'},false,['sign']);return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(ip)))].map(b=>b.toString(16).padStart(2,'0')).join('')}
export async function handleWaitlist({request,env}){
 const url=new URL(request.url);const config=settings(env,url);
 if(url.pathname==='/api/waitlist/config'&&request.method==='GET')return response(config);
 if(url.pathname!=='/api/waitlist')return response({error:'Not found'},404);
 if(request.method!=='POST')return new Response(null,{status:405,headers:{Allow:'POST'}});
 if(!config.available)return response({error:'unavailable'},503);
 if(!trustedOrigin(request,env,url))return response({error:'origin'},403);
 if(!(request.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json'))return response({error:'content-type'},415);
 let payload;try{payload=await readBody(request)}catch{return response({error:'invalid'},400)}
 const input=validateSignup(payload);if(typeof input==='string')return response({error:input},400);
 if(!config.localTest){
  if(typeof payload.token!=='string'||!payload.token||payload.token.length>2048)return response({error:'verification'},400);
  try{
   const verify=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:payload.token}),signal:AbortSignal.timeout(8000)});
   const result=await verify.json();
   if(!result.success||result.hostname!==url.hostname||result.action!=='waitlist')return response({error:'verification'},400);
  }catch{return response({error:'verification-unavailable'},503)}
 }
 try{
  const now=Math.floor(Date.now()/1000),windowStart=Math.floor(now/3600)*3600;
  const key=await ipKey(request.headers.get('CF-Connecting-IP')||'local',env.RATE_LIMIT_SALT||'local-tests-only');
  // Atomic per-hour increment. No raw IP addresses are stored in D1.
  const limit=await env.DB.prepare('INSERT INTO waitlist_rate_limits (key, window_start, attempts) VALUES (?, ?, 1) ON CONFLICT(key) DO UPDATE SET window_start=excluded.window_start, attempts=CASE WHEN waitlist_rate_limits.window_start=excluded.window_start THEN waitlist_rate_limits.attempts+1 ELSE 1 END RETURNING attempts').bind(key,windowStart).first();
  await env.DB.prepare('DELETE FROM waitlist_rate_limits WHERE window_start < ?').bind(windowStart).run();
  if(limit.attempts>10)return response({error:'rate-limit'},429);
  // Duplicate requests do not create another signup or reveal membership.
  await env.DB.prepare('INSERT INTO waitlist (id, email, locale, consent_version, source) VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO NOTHING').bind(crypto.randomUUID(),input.email,input.locale,VERSION,'website').run();
  return response({ok:true,message:'signup-saved'});
 }catch{return response({error:'storage-unavailable'},503)}
}
