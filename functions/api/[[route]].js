import {handleStrength} from '../../server/strength/api.js';
import {handleWaitlist} from '../../server/waitlist.js';
import {preflight,withCors} from '../../server/native.js';
import {handleAgent} from '../../server/agent.js';
// Cloudflare Pages Function: optional R2 delivery, same-origin for offline caching.
// Restricted Strength Index pilot is gated separately; no native workout-sync endpoint.
export async function onRequest(context) {
 // Native (Capacitor) clients: CORS preflight + response headers only for allow-listed native
 // origins and only when NATIVE_CLIENTS_ENABLED="true" (server/native.js); otherwise unchanged.
 const {request,env}=context;
 if(request.method==='OPTIONS')return preflight(request,env);
 return withCors(await route(context),request,env);
}
async function route({request,env}) {
 const url=new URL(request.url);
 if(url.pathname==='/api/strength'||url.pathname.startsWith('/api/strength/'))return handleStrength({request,env});
 if(url.pathname.startsWith('/api/waitlist'))return handleWaitlist({request,env});
 if(url.pathname==='/api/agent'||url.pathname.startsWith('/api/agent/'))return handleAgent({request,env});   // operator-issued keys; 404 unless AGENT_API_ENABLED
 const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 if(url.pathname==='/api/status') return json({app:'Monte Wo by Vitaflex',stage:'strength-index-draft',r2Configured:!!env.WORKOUT_GIFS_BUCKET,syncAvailable:false});
 if(!url.pathname.startsWith('/api/gifs/')) return json({error:'Not implemented in this build'},404);
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
 if(!env.WORKOUT_GIFS_BUCKET)return json({error:'Workout media storage has not been configured yet'},503);
 let filename;try{filename=decodeURIComponent(url.pathname.slice('/api/gifs/'.length))}catch{return json({error:'Invalid media path'},400)}
 if(!/^[a-zA-Z0-9/_-]+\.(gif|webp|png|mp4)$/.test(filename)||filename.includes('..'))return json({error:'Invalid media path'},400);
 const key='gifs/'+filename;
 try{
  const object=await env.WORKOUT_GIFS_BUCKET.get(key);
  if(!object)return json({error:'Animation not uploaded yet'},404);
  const headers=new Headers();object.writeHttpMetadata(headers);
  const types={gif:'image/gif',webp:'image/webp',png:'image/png',mp4:'video/mp4'};
  headers.set('Content-Type',types[filename.split('.').pop()]);
  headers.set('ETag',object.httpEtag);headers.set('Cache-Control','public, max-age=86400');headers.set('X-Content-Type-Options','nosniff');
  if(request.headers.get('If-None-Match')===object.httpEtag)return new Response(null,{status:304,headers});
  return new Response(request.method==='HEAD'?null:object.body,{headers});
 }catch{return json({error:'Media storage temporarily unavailable'},503)}
}
