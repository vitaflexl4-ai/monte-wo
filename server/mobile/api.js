import {validateWorkout as validateSharedWorkout, WorkoutInputError} from '../../shared/workouts.js';
import catalog from '../../content/exercises.json' with {type:'json'};
import {authenticate} from '../strength/auth.js';
import {handleStrength} from '../strength/api.js';
import {StrengthError,requireThat,exactKeys} from '../strength/engine.js';
import {random,hash,seal,open,readJson,bearer,checkRedirect} from './security.js';
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Vary':'Authorization'}});
const audit=(db,actor,action,target,detail)=>db.prepare('INSERT INTO mw_audit(id,actor_id,action,target,outcome,detail) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),actor,action,target,'saved',detail);
export function configured(env){return env.MOBILE_ENABLED==='true'&&env.RANKING_ENABLED==='true'&&!!env.APP_DB&&env.APP_DB!==env.DB&&/^[a-f0-9]{64}$/i.test(env.MOBILE_SESSION_KEY||'')&&/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.RANKING_ACCESS_ISSUER||'')&&!!env.RANKING_ACCESS_AUD}
async function applicationSchemaReady(db){
 try{const names=(await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('waitlist','mw_mobile_sessions')").all()).results.map(r=>r.name);return names.includes('mw_mobile_sessions')&&!names.includes('waitlist')}catch{return false}
}
export function validateWorkout(b,today=new Date().toISOString().slice(0,10)){
 try { return validateSharedWorkout(b,new Set(catalog.exercises.map(e=>e.id)),today); }
 catch(e) { if(e instanceof WorkoutInputError)throw new StrengthError(e.code,400);throw e; }
}
export async function handleMobile({request,env},deps={}){
 const url=new URL(request.url),route=url.pathname.slice('/api/mobile'.length),now=Math.floor(Date.now()/1000),db=env.APP_DB;
 if(route==='/config'&&request.method==='GET'){const ready=configured(env)&&await applicationSchemaReady(db);return json({available:ready,apiVersion:1,authentication:'Cloudflare Access pilot + PKCE',registration:'operator-enrolled pilot only',workoutSync:ready,standards:'DRAFT — NOT OFFICIAL',maxEvidenceBytes:20971520})}
 if(route==='/exercises'&&request.method==='GET')return json(catalog);
 try{
  requireThat(['GET','POST','DELETE'].includes(request.method),'method-not-allowed',405);
  requireThat(configured(env),'mobile-backend-unavailable',503);
  requireThat(await applicationSchemaReady(db),'application-database-not-isolated-or-migrated',503);
  // Browser mutations are same-origin; native clients omit Origin and authenticate explicitly.
  const origin=request.headers.get('Origin');if(origin)requireThat(origin===url.origin,'origin-rejected',403);
  const appEnv={...env,DB:db};
  if(route==='/auth/authorize'&&request.method==='GET'){
   const challenge=url.searchParams.get('code_challenge'),state=url.searchParams.get('state'),redirect=checkRedirect(url.searchParams.get('redirect_uri'),env);
   requireThat(/^[A-Za-z0-9_-]{43}$/.test(challenge||'')&&url.searchParams.get('code_challenge_method')==='S256'&&/^[A-Za-z0-9_-]{16,128}$/.test(state||''),'invalid-pkce');
   // This exact route must be protected by Cloudflare Access. No credential input in app.
   const actor=await authenticate(request,appEnv,deps.fetcher||fetch);
   const access=request.headers.get('Cf-Access-Jwt-Assertion');const payload=JSON.parse(atob(access.split('.')[1].replaceAll('-','+').replaceAll('_','/')));
   const code=random(),ciphertext=await seal(access,env),expiry=Math.min(payload.exp,now+28800);
   await db.batch([db.prepare('DELETE FROM mw_mobile_grants WHERE expires_at<=?').bind(now),db.prepare('INSERT INTO mw_mobile_grants(code_hash,actor_id,challenge,redirect_uri,ciphertext,expires_at,token_expires_at) VALUES(?,?,?,?,?,?,?)').bind(await hash(code),actor.id,challenge,redirect,ciphertext,now+120,expiry),audit(db,actor.id,'mobile-signin-authorized',actor.id,'One-time PKCE grant; no tokens in redirects.')]);
   const target=new URL(redirect);target.searchParams.set('code',code);target.searchParams.set('state',state);
   return new Response(null,{status:302,headers:{Location:target.href,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
  }
  if(route==='/auth/token'&&request.method==='POST'){
   const b=await readJson(request,4096);exactKeys(b,['code','codeVerifier','redirectUri']);requireThat(/^[A-Za-z0-9_-]{43}$/.test(b.code||'')&&/^[A-Za-z0-9_-]{43,128}$/.test(b.codeVerifier||''),'invalid-pkce');checkRedirect(b.redirectUri,env);
   const ch=await hash(b.code),grant=await db.prepare('SELECT * FROM mw_mobile_grants WHERE code_hash=?').bind(ch).first();
   requireThat(grant&&grant.expires_at>now&&grant.token_expires_at>now&&grant.redirect_uri===b.redirectUri&&grant.challenge===await hash(b.codeVerifier),'invalid-or-expired-code',401);
   const actor=await db.prepare('SELECT id FROM mw_principals WHERE id=? AND active=1').bind(grant.actor_id).first();requireThat(actor,'account-not-provisioned',403);
   const count=await db.prepare('SELECT COUNT(*) AS n FROM mw_mobile_sessions WHERE actor_id=? AND expires_at>?').bind(actor.id,now).first();requireThat(count.n<20,'session-limit',429);
   const consumed=await db.prepare('DELETE FROM mw_mobile_grants WHERE code_hash=? AND expires_at>? RETURNING code_hash').bind(ch,now).first();requireThat(consumed,'code-already-used',401);
   const token='mw1_'+random();await db.batch([db.prepare('DELETE FROM mw_mobile_sessions WHERE expires_at<=?').bind(now),db.prepare('INSERT INTO mw_mobile_sessions(token_hash,actor_id,ciphertext,expires_at) VALUES(?,?,?,?)').bind(await hash(token),actor.id,grant.ciphertext,grant.token_expires_at),audit(db,actor.id,'mobile-session-created',actor.id,'Opaque session; secure device storage required.')]);
   return json({token,expiresAt:grant.token_expires_at*1000});
  }
  const token=bearer(request),session=await db.prepare('SELECT s.* FROM mw_mobile_sessions s JOIN mw_principals p ON p.id=s.actor_id WHERE s.token_hash=? AND s.expires_at>? AND p.active=1').bind(await hash(token),now).first();requireThat(session,'session-expired',401);
  const access=await open(session.ciphertext,env),headers=new Headers(request.headers);headers.delete('Authorization');headers.set('Cf-Access-Jwt-Assertion',access);headers.set('Origin',url.origin);
  // The existing verifier, owner checks, reviewer rules and rank engine remain authoritative.
  const authenticated=new Request(request.url,{method:request.method,headers});
  const actor=await authenticate(authenticated,appEnv,deps.fetcher||fetch);
  requireThat(actor.id===session.actor_id,'session-owner-mismatch',401);
  if(route==='/auth/logout'&&request.method==='POST'){
   await db.batch([db.prepare('DELETE FROM mw_mobile_sessions WHERE token_hash=?').bind(await hash(token)),audit(db,actor.id,'mobile-session-revoked',actor.id,'Device signed out.')]);return json({signedOut:true});
  }
  if(route.startsWith('/strength/')){
   const target=new URL(request.url);target.pathname='/api/strength'+route.slice('/strength'.length);
   const init={method:request.method,headers};if(!['GET','HEAD'].includes(request.method)){init.body=request.body;init.duplex='half'}
   return handleStrength({request:new Request(target,init),env:{...env,APP_DB:db}},deps);
  }
  const window=Math.floor(now/3600);const limit=await db.prepare('INSERT INTO mw_rate_limits(actor_id,window,attempts) VALUES(?,?,1) ON CONFLICT(actor_id) DO UPDATE SET window=excluded.window,attempts=CASE WHEN mw_rate_limits.window=excluded.window THEN mw_rate_limits.attempts+1 ELSE 1 END RETURNING attempts').bind(actor.id,window).first();requireThat(limit.attempts<=500,'rate-limit',429);
  if(route==='/workouts'&&request.method==='GET'){
   const before=url.searchParams.get('before')||'9999-12-31~';const rows=(await db.prepare("SELECT * FROM mw_workouts WHERE athlete_id=? AND performed_on||'~'||id<? ORDER BY performed_on DESC,id DESC LIMIT 51").bind(actor.id,before).all()).results;
   return json({workouts:rows.slice(0,50).map(r=>({...JSON.parse(r.data),createdAt:r.created_at})),nextCursor:rows.length>50?rows[49].performed_on+'~'+rows[49].id:null});
  }
  if(route==='/workouts'&&request.method==='POST'){
   const b=validateWorkout(await readJson(request));const prior=await db.prepare('SELECT athlete_id,data FROM mw_workouts WHERE id=?').bind(b.id).first();
   if(prior){requireThat(prior.athlete_id===actor.id&&prior.data===JSON.stringify(b),'workout-id-conflict',409);return json({id:b.id,alreadySaved:true})}
   await db.batch([db.prepare('INSERT INTO mw_workouts(id,athlete_id,performed_on,data) VALUES(?,?,?,?)').bind(b.id,actor.id,b.performedOn,JSON.stringify(b)),audit(db,actor.id,'workout-saved',b.id,'Training only; does not award ranks.')]);return json({id:b.id},201);
  }
  const deletion=route.match(/^\/workouts\/([a-f0-9-]{36})$/i);
  if(deletion&&request.method==='DELETE'){
   const row=await db.prepare('SELECT id FROM mw_workouts WHERE id=? AND athlete_id=?').bind(deletion[1],actor.id).first();requireThat(row,'not-found',404);
   await db.batch([db.prepare('DELETE FROM mw_workouts WHERE id=? AND athlete_id=?').bind(row.id,actor.id),audit(db,actor.id,'workout-deleted',row.id,'Training record removed; submitted performance history remains separate.')]);return json({deleted:true});
  }
  if(route==='/account/deletion-request'&&request.method==='POST'){
   const b=await readJson(request,1024);exactKeys(b,['confirm']);requireThat(b.confirm==='DELETE MY ACCOUNT','confirmation-required');
   let row=await db.prepare("SELECT id FROM mw_account_requests WHERE athlete_id=? AND state='pending'").bind(actor.id).first();const id=row?.id||crypto.randomUUID();
   if(!row)await db.batch([db.prepare("INSERT INTO mw_account_requests(id,athlete_id,kind) VALUES(?,?,'deletion')").bind(id,actor.id),audit(db,actor.id,'account-deletion-requested',id,'Operator action required; no false deletion confirmation.')]);
   return json({id,state:'pending',message:'Deletion requested. The account has not yet been deleted.'},202);
  }
  return json({error:'not-found'},404);
 }catch(e){return json({error:e instanceof StrengthError?e.code:'mobile-service-unavailable'},e instanceof StrengthError?e.status:503)}
}
