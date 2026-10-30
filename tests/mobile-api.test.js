import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFileSync} from 'node:child_process';
import {handleMobile,configured,validateWorkout} from '../server/mobile/api.js';
import {handleStrength} from '../server/strength/api.js';
import {hash,random,seal,open,checkRedirect,readJson} from '../server/mobile/security.js';
import {performance} from './fixtures/strength-fixtures.js';
let env,dir,keys,jwk,db;
function sqlite(data){const result=JSON.parse(execFileSync('python3',['tests/fixtures/d1_sqlite.py'],{input:JSON.stringify({path:join(dir,'app.sqlite'),...data}),encoding:'utf8'}));if(result.error)throw Error(result.error);return result.data}
class Statement{constructor(sql,values=[]){Object.assign(this,{sql,values})}bind(...values){return new Statement(this.sql,values)}async first(){return sqlite({statements:[this]})[0].results[0]||null}async all(){return sqlite({statements:[this]})[0]}async run(){return sqlite({statements:[this]})[0]}}
const b64=s=>Buffer.from(s).toString('base64url');
async function jwt(sub='athlete',changes={}){const header=b64(JSON.stringify({alg:'RS256',kid:'mobile-test'}));const body=b64(JSON.stringify({iss:env.RANKING_ACCESS_ISSUER,aud:[env.RANKING_ACCESS_AUD],sub,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+1800,...changes}));return header+'.'+body+'.'+b64(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(header+'.'+body)))}
const fetcher=async()=>new Response(JSON.stringify({keys:[jwk]}));
async function call(path,method='GET',body=null,token=null,headers={}){const h={...headers};if(token)h.Authorization='Bearer '+token;if(body!==null)h['Content-Type']='application/json';return handleMobile({request:new Request('https://monte.test/api/mobile'+path,{method,headers:h,...(body!==null?{body:JSON.stringify(body)}:{})}),env},{fetcher})}
async function grant(sub='athlete'){const verifier=random(),state=random();const r=await call('/auth/authorize?'+new URLSearchParams({code_challenge:await hash(verifier),code_challenge_method:'S256',state,redirect_uri:'montewo://auth'}),'GET',null,null,{'Cf-Access-Jwt-Assertion':await jwt(sub)});assert.equal(r.status,302);const url=new URL(r.headers.get('Location'));assert.equal(url.searchParams.get('state'),state);assert.equal(url.searchParams.has('token'),false);return {code:url.searchParams.get('code'),codeVerifier:verifier,redirectUri:'montewo://auth'}}
async function login(sub='athlete'){const r=await call('/auth/token','POST',await grant(sub));assert.equal(r.status,200);return (await r.json()).token}
const workout=(updates={})=>({id:crypto.randomUUID(),title:'Actual test workout',performedOn:'2026-10-11',exercises:[{exerciseId:'bench-press',sets:[{reps:5,load:'40',unit:'kg'}]}],...updates});
before(async()=>{dir=mkdtempSync(join(tmpdir(),'monte-mobile-'));sqlite({script:readFileSync('migrations/0002_strength_index.sql','utf8')+readFileSync('migrations/mobile/0003_mobile_sessions_workouts.sql','utf8')});db={prepare:s=>new Statement(s),batch:async statements=>sqlite({statements})};for(const [id,role]of [['athlete','athlete'],['other','athlete'],['reviewer','reviewer']])await db.prepare('INSERT INTO mw_principals(id,subject,role) VALUES(?,?,?)').bind(id,id,role).run();keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);jwk={...await crypto.subtle.exportKey('jwk',keys.publicKey),kid:'mobile-test',alg:'RS256'};env={APP_DB:db,DB:{prepare(){throw Error('Waitlist DB must never be touched')}},MOBILE_ENABLED:'true',RANKING_ENABLED:'true',MOBILE_SESSION_KEY:'42'.repeat(32),RANKING_ACCESS_ISSUER:'https://mobile-test.cloudflareaccess.com',RANKING_ACCESS_AUD:'mobile-audience'};});
after(()=>rmSync(dir,{recursive:true,force:true}));
test('mobile: isolated application schema has no waitlist and no approved standards',async()=>{assert.equal(await db.prepare("SELECT name FROM sqlite_master WHERE name='waitlist'").first(),null);assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM mw_publications').first()).n,0);assert.equal(configured({...env,APP_DB:env.DB}),false);assert.equal(configured({...env,MOBILE_SESSION_KEY:''}),false);const c=await handleStrength({request:new Request('https://monte.test/api/strength/config'),env:{...env,APP_DB:undefined}});assert.equal((await c.json()).available,false)});
test('mobile: disabled services are explicit; real catalog remains available',async()=>{const e={...env,MOBILE_ENABLED:'false'};for(const path of ['/config','/workouts']){const r=await handleMobile({request:new Request('https://monte.test/api/mobile'+path),env:e});assert.equal(r.status,path==='/config'?200:503);if(path==='/config')assert.equal((await r.json()).available,false)}const c=await (await call('/exercises')).json();assert.equal(c.exercises.length,14);assert.equal(c.groups.length,7)});
test('mobile: AES-GCM hides provider token, authenticates ciphertext and detects key changes',async()=>{const raw=await jwt(),cipher=await seal(raw,env);assert.notEqual(cipher,raw);assert.equal(await open(cipher,env),raw);await assert.rejects(open(cipher.slice(0,-4)+'AAAA',env));await assert.rejects(open(cipher,{...env,MOBILE_SESSION_KEY:'43'.repeat(32)}));assert.throws(()=>checkRedirect('montewo://auth?redirect=https://evil.test',env));assert.throws(()=>checkRedirect('https://evil.test',env))});
test('mobile: S256 is required; access authorization cannot be forged',async()=>{const query=new URLSearchParams({code_challenge:await hash(random()),code_challenge_method:'plain',state:random(),redirect_uri:'montewo://auth'});assert.equal((await call('/auth/authorize?'+query)).status,400);query.set('code_challenge_method','S256');assert.equal((await call('/auth/authorize?'+query,'GET',null,null,{'Cf-Access-Jwt-Assertion':'forged'})).status,401);assert.equal((await call('/auth/authorize?'+query,'GET',null,null,{'Cf-Access-Jwt-Assertion':await jwt('unregistered')})).status,403)});
test('mobile: PKCE mismatch does not consume grant; successful exchange is single-use and tokens hashed',async()=>{const g=await grant();assert.equal((await call('/auth/token','POST',{...g,codeVerifier:random()})).status,401);const r=await call('/auth/token','POST',g);assert.equal(r.status,200);const {token,expiresAt}=await r.json();assert.match(token,/^mw1_[\w-]{43}$/);assert.ok(expiresAt>Date.now());const row=await db.prepare('SELECT * FROM mw_mobile_sessions WHERE token_hash=?').bind(await hash(token)).first();assert.equal(JSON.stringify(row).includes(token),false);assert.equal((await call('/auth/token','POST',g)).status,401);assert.equal((await call('/auth/logout','POST',{},token)).status,200);assert.equal((await call('/workouts','GET',null,token)).status,401)});
test('mobile: expired grants and expired sessions are rejected',async()=>{const g=await grant();await db.prepare('UPDATE mw_mobile_grants SET expires_at=1 WHERE code_hash=?').bind(await hash(g.code)).run();assert.equal((await call('/auth/token','POST',g)).status,401);const token=await login();await db.prepare('UPDATE mw_mobile_sessions SET expires_at=1 WHERE token_hash=?').bind(await hash(token)).run();assert.equal((await call('/workouts','GET',null,token)).status,401)});
test('mobile: missing bearer, bad origins, unknown methods and disabled principals fail closed',async()=>{assert.equal((await call('/workouts')).status,401);const token=await login('other');assert.equal((await call('/workouts','GET',null,token,{Origin:'https://evil.test'})).status,403);assert.equal((await call('/workouts','PATCH',null,token)).status,405);await db.prepare("UPDATE mw_principals SET active=0 WHERE id='other'").run();assert.equal((await call('/workouts','GET',null,token)).status,401);await db.prepare("UPDATE mw_principals SET active=1 WHERE id='other'").run()});
test('mobile: strict workout validation rejects invalid calendar dates, forged ranks and unknown media/exercises',()=>{for(const patch of [{id:'x'},{performedOn:'2026-02-31'},{performedOn:'2099-01-01'},{title:''},{rank:'titan'},{exercises:[]},{exercises:[{exerciseId:'invented',sets:[]}]}])assert.throws(()=>validateWorkout(workout(patch)));for(const patch of [{reps:0},{reps:1.2},{load:'-1'},{load:20},{unit:'stone'},{load:'9999'}]){const w=workout();Object.assign(w.exercises[0].sets[0],patch);assert.throws(()=>validateWorkout(w))}assert.equal(validateWorkout(workout()).exercises[0].exerciseId,'bench-press')});
test('mobile: actual workout save, retry deduplication, privacy, ownership and deletion',async()=>{const token=await login(),other=await login('other'),w=workout();assert.equal((await call('/workouts','POST',w,token)).status,201);assert.equal((await (await call('/workouts','POST',w,token)).json()).alreadySaved,true);assert.equal((await call('/workouts','POST',{...w,title:'changed'},token)).status,409);assert.equal((await (await call('/workouts','GET',null,other)).json()).workouts.length,0);assert.equal((await call('/workouts/'+w.id,'DELETE',null,other)).status,404);assert.equal((await (await call('/workouts','GET',null,token)).json()).workouts.length,1);assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM mw_results').first()).n,0);assert.equal((await call('/workouts/'+w.id,'DELETE',null,token)).status,200)});
test('mobile: workout cursor pagination has no duplicate or missing equal-date rows',async()=>{const token=await login();for(let i=0;i<52;i++){const w=workout();await db.prepare('INSERT INTO mw_workouts(id,athlete_id,performed_on,data) VALUES(?,?,?,?)').bind(w.id,'athlete',w.performedOn,JSON.stringify(w)).run()}const first=await (await call('/workouts','GET',null,token)).json(),second=await (await call('/workouts?before='+encodeURIComponent(first.nextCursor),'GET',null,token)).json();assert.equal(first.workouts.length,50);assert.equal(second.workouts.length,2);assert.equal(new Set([...first.workouts,...second.workouts].map(w=>w.id)).size,52);assert.equal(second.nextCursor,null)});
test('mobile: native bridge uses same profile, performance engine and role authorization',async()=>{const token=await login();assert.equal((await call('/strength/profiles','POST',{profile:{bodyweight:'75',unit:'kg',sexCategory:'male',ageYears:30},reason:'Mobile integration test'},token)).status,201);const response=await call('/strength/performances','POST',performance(),token);assert.equal(response.status,201);assert.equal((await response.json()).result.status,'draft');const mobile=await (await call('/strength/me','GET',null,token)).json();const web=await (await handleStrength({request:new Request('https://monte.test/api/strength/me',{headers:{'Cf-Access-Jwt-Assertion':await jwt()}}),env},{fetcher})).json();assert.deepEqual(mobile,web);assert.equal(mobile.disciplines.length,4);assert.equal(mobile.performances.length,1);assert.equal((await call('/strength/reviews','POST',{},token)).status,403);assert.equal((await call('/strength/rank','POST',{},token)).status,403);assert.equal((await call('/strength/admin/queue','GET',null,token)).status,403)});
test('mobile: account deletion is an idempotent pending request, not a false erasure claim',async()=>{const token=await login();assert.equal((await call('/account/deletion-request','POST',{confirm:'yes'},token)).status,400);const first=await call('/account/deletion-request','POST',{confirm:'DELETE MY ACCOUNT'},token);assert.equal(first.status,202);const a=await first.json(),b=await (await call('/account/deletion-request','POST',{confirm:'DELETE MY ACCOUNT'},token)).json();assert.equal(a.id,b.id);assert.equal(a.state,'pending');assert.match(a.message,/not yet been deleted/);assert.ok(await db.prepare("SELECT id FROM mw_principals WHERE id='athlete'").first())});
test('mobile: JSON bodies are size bounded and error responses do not expose secrets',async()=>{await assert.rejects(readJson(new Request('https://monte.test',{method:'POST',headers:{'Content-Type':'application/json'},body:'x'.repeat(100)}),10),/body-too-large/);const r=await call('/workouts','POST',{unexpected:env.MOBILE_SESSION_KEY},await login());assert.equal((await r.text()).includes(env.MOBILE_SESSION_KEY),false)});

test('mobile: misbound aliases containing a waitlist table are unavailable even when binding objects differ',async()=>{await db.prepare('CREATE TABLE waitlist(email TEXT)').run();try{assert.equal((await (await call('/config')).json()).available,false);assert.equal((await call('/workouts')).status,503)}finally{await db.prepare('DROP TABLE waitlist').run()}});
test('mobile: private evidence forwarding preserves bytes, owner authorization and reviewer self-approval denial',async()=>{
 const bucket=new Map();env.RANKING_EVIDENCE={put:async(k,v)=>bucket.set(k,v),get:async k=>bucket.has(k)?{body:bucket.get(k)}:null,delete:async k=>bucket.delete(k)};
 const token=await login('reviewer'),other=await login('other');
 await call('/strength/profiles','POST',{profile:{bodyweight:'75',unit:'kg',sexCategory:'male',ageYears:30},reason:'Synthetic reviewer ownership test'},token);
 const p=await (await call('/strength/performances','POST',performance(),token)).json();
 // Header fixture only: not a playable or licensed video and not native playback QA.
 const bytes=new Uint8Array([0,0,0,24,102,116,121,112,105,115,111,109,0,0,0,0,0,0,0,0]);
 const upload=await handleMobile({request:new Request('https://monte.test/api/mobile/strength/performances/'+p.id+'/evidence',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'video/mp4'},body:bytes}),env},{fetcher});
 assert.equal(upload.status,201);const evidence=await upload.json();assert.equal(evidence.state,'pending');
 const own=await call('/strength/evidence/'+evidence.id,'GET',null,token);assert.equal(own.status,200);assert.equal(own.headers.get('Cache-Control'),'private, no-store');assert.deepEqual(new Uint8Array(await own.arrayBuffer()),bytes);
 assert.equal((await call('/strength/evidence/'+evidence.id,'GET',null,other)).status,404);
 const checks={...performance().checks,identity:true,date:true,load:true,bodyweight:true,continuousVideo:true};const review=await call('/strength/reviews','POST',{performanceId:p.id,evidenceId:evidence.id,expectedRevision:1,state:'approved',checks,reason:'Must not permit self approval'},token);
 assert.equal(review.status,403);assert.equal((await review.json()).error,'self-approval-forbidden');
});

test('mobile: website PKCE and native sessions share account workouts, not other accounts or rank awards',async()=>{
 const {createAccountClient}=await import('../public/account-client.js');
 const {sessionToWorkout,saveWorkoutCopy}=await import('../shared/workout-transfer.js');
 for(const id of ['web-native-account','web-other-account'])await db.prepare('INSERT INTO mw_principals(id,subject,role) VALUES(?,?,?)').bind(id,id,'athlete').run();
 const originalRedirects=env.MOBILE_REDIRECT_URIS;
 env.MOBILE_REDIRECT_URIS='montewo://auth,https://monte.test/account/callback/';
 try{
  const web=createAccountClient({origin:'https://monte.test',fetcher:async(url,init)=>{
   const headers=new Headers(init.headers);if(init.method==='POST')headers.set('Origin','https://monte.test');
   return handleMobile({request:new Request(url,{...init,headers}),env},{fetcher});
  }});
  const authorize=new URL(await web.authorize());
  const redirect=await call(authorize.pathname.slice('/api/mobile'.length)+authorize.search,'GET',null,null,{'Cf-Access-Jwt-Assertion':await jwt('web-native-account')});
  assert.equal(redirect.status,302);
  const callback=new URL(redirect.headers.get('Location'));
  assert.equal(callback.pathname,'/account/callback/');assert.equal(callback.searchParams.has('token'),false);
  await web.completeAuthorization({code:callback.searchParams.get('code'),state:callback.searchParams.get('state')});
  assert.equal((await web.identity()).id,'web-native-account');
  const ids=new Set((await web.catalog()).map(e=>e.id));
  const payload=sessionToWorkout([{exerciseId:'bench-press',name:'Bench press',weight:185,reps:5}],{id:crypto.randomUUID(),title:'Web to native fixture',performedOn:'2026-10-11'},ids);
  assert.equal((await web.save(payload,ids)).id,payload.id);
  assert.equal((await web.save(payload,ids)).alreadySaved,true);
  const native=await login('web-native-account');
  const fromWeb=(await (await call('/workouts','GET',null,native)).json()).workouts;
  assert.equal(fromWeb.length,1);assert.equal(fromWeb[0].id,payload.id);assert.deepEqual(fromWeb[0].exercises,payload.exercises);
  const fromNative=workout({title:'Native to web fixture'});
  const deviceSnapshot=structuredClone(fromNative);
  const sendNative=async body=>{const response=await call('/workouts','POST',body,native);assert.ok([200,201].includes(response.status));return response.json()};
  assert.equal((await saveWorkoutCopy(fromNative,ids,sendNative,()=>true)).id,fromNative.id);
  assert.equal((await saveWorkoutCopy(fromNative,ids,sendNative,()=>true)).alreadySaved,true);
  assert.deepEqual(fromNative,deviceSnapshot);
  assert.ok((await web.history(ids)).workouts.some(w=>w.id===fromNative.id));
  const stranger=await login('web-other-account');
  assert.equal((await (await call('/workouts','GET',null,stranger)).json()).workouts.length,0);
  assert.equal((await call('/workouts','POST',payload,stranger)).status,409);
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM mw_results WHERE athlete_id=?').bind('web-native-account').first()).n,0);
  await web.signOut();assert.equal(web.signedIn(),false);
  assert.equal((await call('/workouts','GET',null,native)).status,200);
 }finally{if(originalRedirects===undefined)delete env.MOBILE_REDIRECT_URIS;else env.MOBILE_REDIRECT_URIS=originalRedirects;}
});
