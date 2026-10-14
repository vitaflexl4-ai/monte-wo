// Native (Capacitor) client support on the shared API: trusted origins, CORS, token sources and the
// sign-in handoff (code + PKCE). SYNTHETIC keys/identities only. Everything must be inert while
// NATIVE_CLIENTS_ENABLED is unset (web-only behaviour unchanged) and fail closed when enabled.
import {test,before,after} from 'node:test';import assert from 'node:assert/strict';import {readFileSync,mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFileSync} from 'node:child_process';
import {handleStrength} from '../server/strength/api.js';import {handleWaitlist} from '../server/waitlist.js';import {onRequest} from '../functions/api/[[route]].js';
import {NATIVE_ORIGINS,NATIVE_APP_ID,sha256url,validVerifier} from '../server/native.js';
let env,db,keys,jwk,dir;
function sqlite(data){const out=JSON.parse(execFileSync('python3',['tests/fixtures/d1_sqlite.py'],{input:JSON.stringify({path:join(dir,'test.sqlite'),...data}),encoding:'utf8'}));if(out.error)throw Error(out.error);return out.data}
class Statement{constructor(sql,values=[]){this.sql=sql;this.values=values}bind(...values){return new Statement(this.sql,values)}async first(){return sqlite({statements:[this]})[0].results[0]||null}async all(){return sqlite({statements:[this]})[0]}async run(){return sqlite({statements:[this]})[0]}}
const b64=bytes=>Buffer.from(bytes).toString('base64url');
async function token(sub='athlete',changes={}){const head=b64(JSON.stringify({alg:'RS256',kid:'test-key'})),body=b64(JSON.stringify({iss:env.RANKING_ACCESS_ISSUER,aud:[env.RANKING_ACCESS_AUD],sub,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+600,...changes}));return head+'.'+body+'.'+b64(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(head+'.'+body)))}
const fetcher=async()=>new Response(JSON.stringify({keys:[jwk]}),{headers:{'Content-Type':'application/json'}});
const WEB='https://monte.test',ANDROID='https://localhost',IOS='capacitor://localhost';
function request(route,{method='GET',origin=WEB,headers={},data=null}={}){const init={method,headers:{Origin:origin,...headers}};if(data!==null){init.body=JSON.stringify(data);init.headers['Content-Type']='application/json'}return new Request(WEB+'/api/strength'+route,init)}
const strength=(route,opts)=>handleStrength({request:request(route,opts),env:opts?.env||env},{fetcher});
const withNative=extra=>({...env,NATIVE_CLIENTS_ENABLED:'true',...extra});
const verifier='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-._~';
before(async()=>{dir=mkdtempSync(join(tmpdir(),'monte-native-test-'));sqlite({script:readFileSync('migrations/0001_waitlist.sql','utf8')+readFileSync('migrations/0002_strength_index.sql','utf8')+readFileSync('migrations/0003_native_auth_codes.sql','utf8')});db={prepare:s=>new Statement(s),batch:async statements=>sqlite({statements})};
 for(const [id,role]of [['athlete','athlete'],['reviewer','reviewer']])await db.prepare('INSERT INTO mw_principals(id,subject,role) VALUES(?,?,?)').bind(id,id,role).run();
 keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);jwk={...await crypto.subtle.exportKey('jwk',keys.publicKey),kid:'test-key',alg:'RS256'};
 env={DB:db,RANKING_ENABLED:'true',RANKING_ACCESS_ISSUER:'https://test-team.cloudflareaccess.com',RANKING_ACCESS_AUD:'test-audience'};});
after(()=>rmSync(dir,{recursive:true,force:true}));

test('flag OFF (default): native origins, bearer tokens, handoff routes and CORS are all inert',async()=>{
 for(const origin of NATIVE_ORIGINS){const r=await strength('/profiles',{method:'POST',origin,headers:{'Cf-Access-Jwt-Assertion':await token()},data:{profile:{},reason:'x'}});assert.equal(r.status,403);assert.equal((await r.json()).error,'origin-rejected')}
 let r=await strength('/me',{headers:{Authorization:'Bearer '+await token()}});assert.equal(r.status,401);assert.equal((await r.json()).error,'authentication-required');
 r=await strength('/me',{headers:{'cf-access-token':await token()}});assert.equal(r.status,401);
 r=await strength('/native-token',{method:'POST',origin:ANDROID,data:{code:'x'.repeat(43),verifier}});assert.equal(r.status,404);assert.equal((await r.json()).error,'native-clients-disabled');
 r=await strength('/native-login?state=abcdefgh&challenge='+await sha256url(verifier),{headers:{'Cf-Access-Jwt-Assertion':await token()}});assert.equal(r.status,404);
 const pre=await onRequest({request:new Request(WEB+'/api/status',{method:'OPTIONS',headers:{Origin:ANDROID}}),env});assert.equal(pre.status,403);
 const web=await onRequest({request:new Request(WEB+'/api/status',{headers:{Origin:ANDROID}}),env});assert.equal(web.status,200);assert.equal(web.headers.get('Access-Control-Allow-Origin'),null,'no CORS while disabled');
 const wl=await handleWaitlist({request:new Request(WEB+'/api/waitlist',{method:'POST',headers:{Origin:IOS,'Content-Type':'application/json'},body:'{}'}),env:{...env,TURNSTILE_SITE_KEY:'k',TURNSTILE_SECRET:'s',RATE_LIMIT_SALT:'salt'}});assert.equal(wl.status,403);
});

test('flag ON: exact CORS for the two native origins only, no credentials, preflight answered, strangers rejected',async()=>{
 const on=withNative();
 for(const origin of NATIVE_ORIGINS){
  const pre=await onRequest({request:new Request(WEB+'/api/strength/me',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'cf-access-token'}}),env:on});
  assert.equal(pre.status,204);assert.equal(pre.headers.get('Access-Control-Allow-Origin'),origin);assert.equal(pre.headers.get('Access-Control-Allow-Headers'),'Content-Type, Authorization, cf-access-token');assert.equal(pre.headers.get('Access-Control-Allow-Credentials'),null,'cookies never cross origins');assert.match(pre.headers.get('Vary'),/Origin/);
  const res=await onRequest({request:new Request(WEB+'/api/strength/config',{headers:{Origin:origin}}),env:on});assert.equal(res.status,200);assert.equal(res.headers.get('Access-Control-Allow-Origin'),origin);assert.equal((await res.json()).available,true);
 }
 for(const origin of ['https://evil.example','http://localhost','https://localhost:8080','capacitor://evil',WEB]){
  const pre=await onRequest({request:new Request(WEB+'/api/strength/me',{method:'OPTIONS',headers:{Origin:origin}}),env:on});assert.equal(pre.status,403,origin);
  const res=await onRequest({request:new Request(WEB+'/api/status',{headers:{Origin:origin}}),env:on});assert.equal(res.headers.get('Access-Control-Allow-Origin'),null,origin);
 }
 assert.equal((await onRequest({request:new Request(WEB+'/api/status',{method:'OPTIONS'}),env:on})).status,403,'no Origin → no preflight');
});

test('flag ON: the same verified JWT is accepted from cf-access-token / Bearer; forged, expired or wrong-audience tokens still fail; nothing is echoed',async()=>{
 const on=withNative();
 for(const headers of [{'cf-access-token':await token()},{Authorization:'Bearer '+await token()},{'Cf-Access-Jwt-Assertion':await token()}]){
  const r=await strength('/me',{origin:ANDROID,headers,env:on});assert.equal(r.status,200,JSON.stringify(Object.keys(headers)));const b=await r.json();assert.deepEqual(b.actor,{id:'athlete',role:'athlete'},'no subject/token in responses');assert.equal(JSON.stringify(b).includes('eyJ'),false)}
 const forged=(await token()).replace(/\.[^.]+$/,'.'+b64(Buffer.alloc(256)));assert.equal((await strength('/me',{headers:{'cf-access-token':forged},env:on})).status,401);
 assert.equal((await strength('/me',{headers:{Authorization:'Bearer '+await token('athlete',{exp:Math.floor(Date.now()/1000)-5})},env:on})).status,401);
 assert.equal((await strength('/me',{headers:{Authorization:'Bearer '+await token('athlete',{aud:['someone-else']})},env:on})).status,401);
 assert.equal((await strength('/me',{headers:{Authorization:'Bearer '+await token('unknown')},env:on})).status,403,'unprovisioned identity');
 assert.equal((await strength('/me',{headers:{Authorization:'Basic abc'},env:on})).status,401);
 const post=await strength('/profiles',{method:'POST',origin:IOS,headers:{'cf-access-token':await token()},data:{profile:{bodyweight:'80',unit:'kg',sexCategory:'male',ageYears:30},reason:'native client profile'},env:on});assert.equal(post.status,201,await post.text());
 assert.equal((await strength('/profiles',{method:'POST',origin:'https://evil.example',headers:{'cf-access-token':await token()},data:{profile:{},reason:'x'},env:on})).status,403,'unknown origins still rejected');
});

test('flag ON: sign-in handoff — code bound to PKCE challenge, single use, 120 s, audited, never the token in the URL',async()=>{
 const on=withNative();const challenge=await sha256url(verifier);assert.ok(validVerifier(verifier));
 const login=await strength('/native-login?state=state-12345&challenge='+challenge,{headers:{'Cf-Access-Jwt-Assertion':await token()},env:on});
 assert.equal(login.status,200);assert.match(login.headers.get('Content-Type'),/text\/html/);assert.equal(login.headers.get('Cache-Control'),'private, no-store');
 const html=await login.text();const m=html.match(new RegExp(NATIVE_APP_ID.replace(/\./g,'\\.')+'://auth\\?code=([A-Za-z0-9_-]{43})&amp;state=state-12345'));assert.ok(m,'app return link present');const code=m[1];
 assert.equal(html.includes('eyJ'),false,'the JWT never travels through the browser/URL');
 // bad verifier consumes the code
 let r=await strength('/native-token',{method:'POST',origin:ANDROID,data:{code,verifier:verifier.slice(0,-1)+'X'},env:on});assert.equal(r.status,400);assert.equal((await r.json()).error,'invalid-code');
 r=await strength('/native-token',{method:'POST',origin:ANDROID,data:{code,verifier},env:on});assert.equal(r.status,400,'code was consumed by the failed attempt');
 // fresh code, happy path
 const login2=await strength('/native-login?state=state-12345&challenge='+challenge,{headers:{'Cf-Access-Jwt-Assertion':await token()},env:on});const code2=(await login2.text()).match(/code=([A-Za-z0-9_-]{43})/)[1];
 assert.equal((await strength('/native-token',{method:'POST',origin:WEB,data:{code:code2,verifier},env:on})).status,403,'exchange only from a native origin');
 assert.equal((await strength('/native-token',{method:'POST',origin:ANDROID,data:{code:code2,verifier,extra:1},env:on})).status,400,'exact keys');
 r=await strength('/native-token',{method:'POST',origin:ANDROID,data:{code:code2,verifier},env:on});assert.equal(r.status,200);const out=await r.json();assert.equal(out.header,'cf-access-token');assert.ok(out.expiresAt>Math.floor(Date.now()/1000));
 const me=await strength('/me',{origin:ANDROID,headers:{'cf-access-token':out.token},env:on});assert.equal(me.status,200,'exchanged token authenticates the native client');
 r=await strength('/native-token',{method:'POST',origin:ANDROID,data:{code:code2,verifier},env:on});assert.equal(r.status,400,'replay rejected');
 // validation + expiry
 assert.equal((await strength('/native-login?state=short&challenge='+challenge,{headers:{'Cf-Access-Jwt-Assertion':await token()},env:on})).status,400);
 assert.equal((await strength('/native-login?state=state-12345&challenge=nothash',{headers:{'Cf-Access-Jwt-Assertion':await token()},env:on})).status,400);
 assert.equal((await strength('/native-login?state=state-12345&challenge='+challenge,{env:on})).status,401,'login route itself requires the Access-verified identity');
 const login3=await strength('/native-login?state=state-12345&challenge='+challenge,{headers:{'Cf-Access-Jwt-Assertion':await token()},env:on});const code3=(await login3.text()).match(/code=([A-Za-z0-9_-]{43})/)[1];
 await db.prepare('UPDATE mw_native_auth_codes SET expires_at=? WHERE code_hash=?').bind(Math.floor(Date.now()/1000)-1,await sha256url(code3)).run();
 assert.equal((await strength('/native-token',{method:'POST',origin:ANDROID,data:{code:code3,verifier},env:on})).status,400,'expired code');
 assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM mw_native_auth_codes').first()).n,0,'no code survives redemption/expiry');
 const audit=(await db.prepare("SELECT action,outcome FROM mw_audit WHERE action LIKE 'native-%' ORDER BY seq").all()).results.map(a=>a.action+':'+a.outcome);
 assert.deepEqual(audit,['native-login-code-issued:ok','native-login-code-issued:ok','native-token-exchanged:ok','native-login-code-issued:ok']);
});

test('flag ON: waitlist accepts a native Origin but every other guard (configuration, Turnstile) still applies',async()=>{
 const on=withNative({TURNSTILE_SITE_KEY:'k',TURNSTILE_SECRET:'s',RATE_LIMIT_SALT:'salt'});
 const r=await handleWaitlist({request:new Request(WEB+'/api/waitlist',{method:'POST',headers:{Origin:IOS,'Content-Type':'text/plain'},body:'x'}),env:on});assert.equal(r.status,415,'origin accepted, next guard (content type) answers');
 assert.equal((await handleWaitlist({request:new Request(WEB+'/api/waitlist',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{}'}),env:on})).status,403);
});

test('migration 0003 is additive and operational only: no achievement table, no trigger changes, applies after 0002',()=>{
 const sql=readFileSync('migrations/0003_native_auth_codes.sql','utf8');
 assert.match(sql,/CREATE TABLE mw_native_auth_codes\(/);assert.equal((sql.match(/CREATE TABLE/g)||[]).length,1);assert.doesNotMatch(sql,/DROP|ALTER|TRIGGER|mw_results|mw_rank_history|mw_audit|UPDATE /);
 assert.match(sql,/REFERENCES mw_principals\(subject\)/);
});
