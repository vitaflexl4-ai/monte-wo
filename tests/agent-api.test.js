// Agent API: operator-issued keys for automation. SYNTHETIC keys, principals and signups only.
// Must be inert while AGENT_API_ENABLED is unset, fail closed when enabled, and keep every product rule
// (no manual rank awards, reviewer/admin roles, append-only audit) exactly as for human users.
import {test,before,after} from 'node:test';import assert from 'node:assert/strict';import {readFileSync,mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFileSync} from 'node:child_process';import {createHash,randomBytes} from 'node:crypto';
import {handleAgent,OPERATIONS,SCOPES,toolManifest,openapi,matchOperation,KEY_PATTERN} from '../server/agent.js';
import {onRequest} from '../functions/api/[[route]].js';
let env,db,dir;
function sqlite(data){const out=JSON.parse(execFileSync('python3',['tests/fixtures/d1_sqlite.py'],{input:JSON.stringify({path:join(dir,'test.sqlite'),...data}),encoding:'utf8'}));if(out.error)throw Error(out.error);return out.data}
class Statement{constructor(sql,values=[]){this.sql=sql;this.values=values}bind(...values){return new Statement(this.sql,values)}async first(){return sqlite({statements:[this]})[0].results[0]||null}async all(){return sqlite({statements:[this]})[0]}async run(){return sqlite({statements:[this]})[0]}}
const ORIGIN='https://monte.test';
async function makeKey({name='k',scopes=['*'],principalId=null,status='active',expires=null,ips=null}={}){const id=randomBytes(8).toString('hex'),secret=randomBytes(32).toString('base64url');
 await db.prepare('INSERT INTO mw_agent_keys(id,name,secret_hash,scopes,principal_id,status,expires_at,allowed_ips) VALUES(?,?,?,?,?,?,?,?)').bind(id,name,createHash('sha256').update(secret).digest('hex'),JSON.stringify(scopes),principalId,status,expires,ips?JSON.stringify(ips):null).run();return {id,secret,key:`mwa_${id}_${secret}`}}
function request(route,{method='GET',key,headers={},data,raw,ip}={}){const h={...headers};if(key)h.Authorization='Bearer '+key;if(ip)h['CF-Connecting-IP']=ip;const init={method,headers:h};if(data!==undefined){init.body=JSON.stringify(data);h['Content-Type']='application/json'}if(raw!==undefined)init.body=raw;return new Request(ORIGIN+'/api/agent'+route,init)}
const agent=(route,opts={})=>handleAgent({request:request(route,opts),env:opts.env||env});
const agentAudit=async()=>(await db.prepare('SELECT * FROM mw_agent_audit ORDER BY seq').all()).results;
before(async()=>{dir=mkdtempSync(join(tmpdir(),'monte-agent-test-'));sqlite({script:['0001_waitlist','0002_strength_index','0003_native_auth_codes','0004_agent_api'].map(m=>readFileSync(`migrations/${m}.sql`,'utf8')).join('\n')});db={prepare:s=>new Statement(s),batch:async statements=>sqlite({statements})};
 for(const [id,role] of [['agent-athlete','athlete'],['agent-reviewer','reviewer'],['agent-admin','admin'],['human-athlete','athlete']])await db.prepare('INSERT INTO mw_principals(id,subject,role) VALUES(?,?,?)').bind(id,'subject:'+id,role).run();
 env={DB:db,AGENT_API_ENABLED:'true',RANKING_ENABLED:'true',RANKING_ACCESS_ISSUER:'https://test-team.cloudflareaccess.com',RANKING_ACCESS_AUD:'test-audience'};});
after(()=>rmSync(dir,{recursive:true,force:true}));

test('flag OFF (default): every /api/agent route is 404 and nothing is written, even with a valid key',async()=>{
 const off={...env,AGENT_API_ENABLED:undefined};const k=await makeKey();
 for(const route of ['/','/openapi.json','/tools','/status','/strength/me','/kv/x']){const r=await agent(route,{key:k.key,env:off});assert.equal(r.status,404);assert.equal((await r.json()).error,'agent-api-disabled')}
 const viaRouter=await onRequest({request:request('/whoami',{key:k.key}),env:off});assert.equal(viaRouter.status,404);
 const noDb=await agent('/status',{key:k.key,env:{AGENT_API_ENABLED:'true'}});assert.equal(noDb.status,404);
 assert.equal((await agentAudit()).length,0,'no audit rows while disabled');
});

test('discovery without a key: index, OpenAPI 3.1 and the tool manifest agree with the operation table',async()=>{
 const index=await (await agent('/')).json();assert.equal(index.openapi,'/api/agent/openapi.json');assert.deepEqual(index.scopes,SCOPES);
 const spec=await (await agent('/openapi.json')).json();assert.equal(spec.openapi,'3.1.0');assert.equal(spec.servers[0].url,ORIGIN);assert.equal(spec.components.securitySchemes.agentKey.scheme,'bearer');
 const {tools}=await (await agent('/tools')).json();assert.equal(tools.length,OPERATIONS.length);assert.equal(new Set(tools.map(t=>t.name)).size,tools.length,'tool names unique');
 for(const op of OPERATIONS){const entry=spec.paths['/api/agent'+op.path]?.[op.method.toLowerCase()];assert.ok(entry,op.id+' in OpenAPI');assert.equal(entry.operationId,op.id);assert.equal(entry['x-scope'],op.scope);assert.ok(op.scope===null||op.scope in SCOPES,op.id+' uses a declared scope');
  const tool=tools.find(t=>t.http.method===op.method&&t.http.path==='/api/agent'+op.path);assert.ok(tool,op.id+' in tools');for(const p of Object.keys(op.params||{}))assert.ok(tool.parameters.required.includes(p),op.id+' path param '+p+' required')}
 assert.equal(JSON.stringify(spec).includes('mwa_'+'0'.repeat(16)),false);assert.deepEqual(toolManifest().map(t=>t.name).slice(0,3),['whoami','get_status','get_metrics']);
 assert.equal(matchOperation('/waitlist/abc','DELETE').op.id,'deleteWaitlistSignup');assert.equal(matchOperation('/waitlist/abc','PATCH').status,405);assert.equal(matchOperation('/nope','GET').status,404);assert.equal(matchOperation('/kv/a%3Ab','GET').params.key,'a:b');
 assert.ok(KEY_PATTERN.test('mwa_'+'a'.repeat(16)+'_'+'B'.repeat(43))&&!KEY_PATTERN.test('mwa_short'));
});

test('authentication: unknown id and wrong secret are indistinguishable; revoked, expired and IP-restricted keys fail closed; nothing secret is echoed or stored',async()=>{
 let r=await agent('/whoami');assert.equal(r.status,401);assert.equal((await r.json()).error,'authentication-required');
 r=await agent('/whoami',{headers:{Authorization:'Bearer not-a-key'}});assert.equal(r.status,401);assert.equal((await r.json()).error,'authentication-required');
 const good=await makeKey({name:'good',scopes:['status:read']});
 r=await agent('/whoami',{key:'mwa_'+'0'.repeat(16)+'_'+good.secret});assert.equal(r.status,401);assert.equal((await r.json()).error,'authentication-failed');
 r=await agent('/whoami',{key:'mwa_'+good.id+'_'+'x'.repeat(43)});assert.equal(r.status,401);assert.equal((await r.json()).error,'authentication-failed');
 const before=(await agentAudit()).length;assert.equal(before,0,'anonymous failures are not written to storage');
 const revoked=await makeKey({status:'revoked'});r=await agent('/whoami',{key:revoked.key});assert.equal(r.status,401);assert.equal((await r.json()).error,'key-revoked');
 const expired=await makeKey({expires:new Date(Date.now()-1000).toISOString()});r=await agent('/whoami',{key:expired.key});assert.equal(r.status,401);assert.equal((await r.json()).error,'key-expired');
 const pinned=await makeKey({ips:['203.0.113.4']});r=await agent('/whoami',{key:pinned.key,ip:'198.51.100.9'});assert.equal(r.status,403);assert.equal((await r.json()).error,'ip-not-allowed');
 r=await agent('/whoami',{key:pinned.key,ip:'203.0.113.4'});assert.equal(r.status,200);
 const audit=await agentAudit();assert.deepEqual(audit.map(a=>a.detail).filter(d=>d),['key-revoked','key-expired','ip-not-allowed'],'known-key denials are audited');
 const dump=JSON.stringify(await db.prepare('SELECT * FROM mw_agent_keys').all())+JSON.stringify(audit);for(const k of [good,revoked,expired,pinned])assert.ok(!dump.includes(k.secret),'secret never stored');
 const me=await (await agent('/whoami',{key:good.key})).json();assert.deepEqual(me.key,{id:good.id,name:'good',scopes:['status:read']});assert.equal(me.principal,null);assert.equal(me.rateLimit.limit,1200);
});

test('scopes are default-deny per operation; unknown routes 404, wrong methods 405; every call is audited',async()=>{
 const k=await makeKey({scopes:['status:read']});
 assert.equal((await agent('/status',{key:k.key})).status,200);assert.equal((await agent('/metrics',{key:k.key})).status,200);
 for(const route of ['/catalog','/audit','/waitlist','/waitlist/stats','/kv','/kv/x','/strength/me','/strength/config']){const r=await agent(route,{key:k.key});assert.equal(r.status,403,route);assert.equal((await r.json()).error,'insufficient-scope')}
 let r=await agent('/kv/x',{key:k.key,method:'PUT',data:1});assert.equal(r.status,403);
 r=await agent('/nope',{key:k.key});assert.equal(r.status,404);assert.equal((await r.json()).error,'not-found');
 r=await agent('/status',{key:k.key,method:'POST',data:{}});assert.equal(r.status,405);assert.equal(r.headers.get('Allow'),'GET');
 const star=await makeKey({scopes:['*']});assert.equal((await agent('/catalog',{key:star.key})).status,200);
 const mine=(await agentAudit()).filter(a=>a.key_id===k.id);assert.ok(mine.length>=12);assert.ok(mine.every(a=>a.route&&a.method&&Number.isInteger(a.status)));assert.equal(mine.filter(a=>a.outcome==='denied').length,mine.filter(a=>a.status>=400).length);
 const viaRouter=await onRequest({request:request('/whoami',{key:k.key}),env});assert.equal(viaRouter.status,200);assert.equal(viaRouter.headers.get('X-RateLimit-Limit'),'1200');assert.equal(viaRouter.headers.get('Access-Control-Allow-Origin'),null);
});

test('status, metrics and catalog: honest readiness and the product rules (4 disciplines × 9 ranks, no combined rank, no manual awards)',async()=>{
 const k=await makeKey({scopes:['status:read','catalog:read']});
 const s=await (await agent('/status',{key:k.key})).json();assert.equal(s.storage.database,'ok');assert.equal(s.features.ranking.enabled,true);assert.equal(s.features.waitlist.available,false,'waitlist unconfigured in tests');assert.equal(s.features.agentApi.enabled,true);assert.equal(s.features.nativeClients.enabled,false);
 assert.deepEqual(s.productRules.disciplines,['squat','bench','deadlift','curl']);assert.equal(s.productRules.ranksPerDiscipline.length,9);assert.equal(s.productRules.combinedRank,false);assert.equal(s.productRules.manualRankAwards,false);assert.equal(s.productRules.verifiedRequiresAuthorizedReview,true);
 const m=await (await agent('/metrics',{key:k.key})).json();assert.equal(typeof m.waitlist.total,'number');assert.ok(m.principalsByRole.find(r=>r.role==='athlete').n>=2);assert.equal(m.performances,0);assert.ok(m.agentKeys.active>=1);
 const c=await (await agent('/catalog',{key:k.key})).json();assert.deepEqual(c.ranks.map(r=>r.name),['Debitan','Bati','Solid','Fò','Avanse','Mèt','Chanpyon','Titan','Lejand']);assert.equal(c.disciplines.length,4);assert.equal(c.combinedRank,false);assert.equal(c.methodology.available,true);assert.equal(c.methodology.disciplines.length,4);assert.ok(c.methodology.disciplines.every(d=>d.modelApproved===false&&d.ruleApproved===false),'bundled standards are DRAFT');
 const broken=await agent('/status',{key:k.key,env:{...env,DB:{prepare:()=>({bind:()=>({first:async()=>{throw Error('down')}}),first:async()=>{throw Error('down')}})}}});assert.equal(broken.status,500,'a broken database cannot authenticate anything (fails closed)');assert.equal((await broken.json()).error,'internal-error');
});

test('waitlist operations: cursor pagination, locale filter, stats, deletion by email (audited as a hash) and by id',async()=>{
 const k=await makeKey({scopes:['waitlist:read','waitlist:write']});
 const rows=[['w1','one@example.test','en','2026-10-01T10:00:00.000Z'],['w2','two@example.test','ht','2026-10-01T10:00:00.000Z'],['w3','three@example.test','fr','2026-10-02T09:00:00.000Z']];
 for(const [id,email,locale,at] of rows)await db.prepare('INSERT INTO waitlist(id,email,locale,consent_version,source,created_at) VALUES(?,?,?,?,?,?)').bind(id,email,locale,'2026-10-11-v1','website',at).run();
 let page=await (await agent('/waitlist?limit=2',{key:k.key})).json();assert.deepEqual(page.signups.map(s=>s.id),['w1','w2']);assert.equal(page.personalData,true);assert.ok(page.nextAfter);
 page=await (await agent('/waitlist?limit=2&after='+encodeURIComponent(page.nextAfter),{key:k.key})).json();assert.deepEqual(page.signups.map(s=>s.id),['w3']);assert.equal(page.nextAfter,null);
 assert.deepEqual((await (await agent('/waitlist?locale=ht',{key:k.key})).json()).signups.map(s=>s.email),['two@example.test']);
 assert.equal((await agent('/waitlist?locale=de',{key:k.key})).status,400);assert.equal((await agent('/waitlist?after=garbage',{key:k.key})).status,400);
 const stats=await (await agent('/waitlist/stats',{key:k.key})).json();assert.equal(stats.total,3);assert.deepEqual(stats.byLocale.map(x=>x.locale+':'+x.n),['en:1','fr:1','ht:1']);assert.ok(!JSON.stringify(stats).includes('@'),'stats carry no personal data');
 let r=await agent('/waitlist/forget',{key:k.key,method:'POST',data:{email:'TWO@example.test',reason:'deletion request #1'}});assert.equal(r.status,200);assert.equal((await r.json()).deleted,true);
 r=await agent('/waitlist/forget',{key:k.key,method:'POST',data:{email:'two@example.test',reason:'again'}});assert.equal((await r.json()).deleted,false);
 r=await agent('/waitlist/forget',{key:k.key,method:'POST',data:{email:'nope',reason:'x'}});assert.equal(r.status,400);assert.equal((await r.json()).error,'invalid-email');
 r=await agent('/waitlist/forget',{key:k.key,method:'POST',data:{email:'a@b.co',reason:'x',extra:1}});assert.equal(r.status,400);assert.equal((await r.json()).error,'unexpected-field');
 const trail=(await agentAudit()).filter(a=>a.route==='/waitlist/forget'&&a.detail.startsWith('email-sha256:'));assert.equal(trail.length,2);assert.ok(trail.every(a=>!a.detail.includes('@')),'no address in the audit trail');assert.equal(trail[0].outcome,'deleted');assert.equal(trail[1].outcome,'not-found');
 r=await agent('/waitlist/w3',{key:k.key,method:'DELETE'});assert.equal((await r.json()).deleted,true);assert.equal((await (await agent('/waitlist/stats',{key:k.key})).json()).total,1);
 const readOnly=await makeKey({scopes:['waitlist:read']});assert.equal((await agent('/waitlist/w1',{key:readOnly.key,method:'DELETE'})).status,403);
});

test('shared agent memory: JSON values, versions/ETags, optimistic concurrency, prefixes, limits',async()=>{
 const a=await makeKey({name:'agent-a',scopes:['kv:read','kv:write']}),b=await makeKey({name:'agent-b',scopes:['kv:read','kv:write']});
 let r=await agent('/kv/ops:lock',{key:a.key,method:'PUT',headers:{'If-Match':'0'},data:{owner:'agent-a',until:'2026-10-14T00:10:00Z'}});assert.equal(r.status,201);assert.equal(r.headers.get('ETag'),'"1"');
 r=await agent('/kv/ops:lock',{key:b.key,method:'PUT',headers:{'If-Match':'0'},data:{owner:'agent-b'}});assert.equal(r.status,409);assert.deepEqual(await r.json(),{error:'version-conflict',currentVersion:1});
 r=await agent('/kv/ops:lock',{key:b.key});const got=await r.json();assert.equal(got.value.owner,'agent-a');assert.equal(got.version,1);assert.equal(got.updatedBy,a.id);
 r=await agent('/kv/ops:lock',{key:a.key,method:'PUT',headers:{'If-Match':'1'},data:{owner:'agent-a',released:true}});assert.equal(r.status,200);assert.equal((await r.json()).version,2);
 r=await agent('/kv/ops:lock',{key:b.key,method:'PUT',headers:{'If-Match':'1'},data:{}});assert.equal(r.status,409);assert.equal((await r.json()).currentVersion,2);
 r=await agent('/kv/ops:lock',{key:b.key,method:'PUT',data:'unconditional'});assert.equal(r.status,200);assert.equal((await r.json()).version,3);
 r=await agent('/kv/ops:missing',{key:b.key,method:'PUT',headers:{'If-Match':'4'},data:1});assert.equal(r.status,409);assert.equal((await r.json()).currentVersion,0);
 await agent('/kv/notes:incident-1',{key:a.key,method:'PUT',data:{severity:'low'}});
 const list=await (await agent('/kv?prefix=ops%3A',{key:b.key})).json();assert.deepEqual(list.keys.map(x=>x.key),['ops:lock']);assert.equal(list.keys[0].version,3);assert.equal((await (await agent('/kv',{key:b.key})).json()).keys.length,2);
 assert.equal((await agent('/kv/bad%20name',{key:a.key,method:'PUT',data:1})).status,400);assert.equal((await agent('/kv/x',{key:a.key,method:'PUT',raw:'{',headers:{'Content-Type':'application/json'}})).status,400);
 assert.equal((await agent('/kv/x',{key:a.key,method:'PUT',raw:'1',headers:{'Content-Type':'text/plain'}})).status,415);
 assert.equal((await agent('/kv/x',{key:a.key,method:'PUT',raw:JSON.stringify('x'.repeat(70000)),headers:{'Content-Type':'application/json'}})).status,413);
 r=await agent('/kv/ops:lock',{key:a.key,method:'DELETE'});assert.equal((await r.json()).deleted,true);assert.equal((await agent('/kv/ops:lock',{key:a.key})).status,404);
 const readOnly=await makeKey({scopes:['kv:read']});assert.equal((await agent('/kv/notes:incident-1',{key:readOnly.key})).status,200);assert.equal((await agent('/kv/notes:incident-1',{key:readOnly.key,method:'DELETE'})).status,403);assert.equal((await agent('/kv/a%2Fb',{key:a.key,method:'PUT',data:1})).status,400,'no slashes in key names');
});

test('Strength Index through the Agent API: acts as the linked principal under the same rules — ownership, roles, no manual rank awards, audited',async()=>{
 const athlete=await makeKey({name:'athlete-bot',scopes:['strength'],principalId:'agent-athlete'}),reviewer=await makeKey({name:'review-bot',scopes:['*'],principalId:'agent-reviewer'}),admin=await makeKey({name:'admin-bot',scopes:['*'],principalId:'agent-admin'}),unlinked=await makeKey({name:'unlinked',scopes:['*']});
 let r=await agent('/strength/me',{key:unlinked.key});assert.equal(r.status,403);assert.equal((await r.json()).error,'no-linked-principal');
 r=await agent('/strength/config',{key:athlete.key});assert.equal(r.status,200);assert.equal((await r.json()).available,true);
 r=await agent('/strength/me',{key:athlete.key});assert.equal(r.status,200);const me=await r.json();assert.deepEqual(me.actor,{id:'agent-athlete',role:'athlete'});assert.equal(me.disciplines.length,4);assert.ok(!JSON.stringify(me).includes('subject:'),'subject never echoed');
 r=await agent('/strength/profiles',{key:athlete.key,method:'POST',data:{profile:{bodyweight:'82.5',unit:'kg',sexCategory:'male',ageYears:31},reason:'initial profile via agent'}});assert.equal(r.status,201,await r.text());
 assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM mw_profiles WHERE athlete_id='agent-athlete'").first()).n,1);
 for(const route of ['/strength/rank','/strength/award','/strength/override/x']){r=await agent(route,{key:admin.key,method:'POST',data:{}});assert.equal(r.status,403,route);assert.equal((await r.json()).error,'manual-rank-awards-forbidden')}
 assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM mw_audit WHERE actor_id='agent-admin' AND action='manual-rank-denied'").first()).n,3,'denials audited against the agent principal');
 r=await agent('/strength/admin/queue',{key:athlete.key});assert.equal(r.status,403);assert.equal((await r.json()).error,'forbidden');
 r=await agent('/strength/admin/queue',{key:reviewer.key});assert.equal(r.status,200);
 r=await agent('/strength/admin/standards',{key:reviewer.key});assert.equal(r.status,403,'reviewer is not admin');
 r=await agent('/strength/admin/standards',{key:admin.key});assert.equal(r.status,200);
 r=await agent('/strength/admin/models/squat-model-draft-1/publish',{key:admin.key,method:'POST',data:{reason:'try',digest:'0'.repeat(64)}});const pub=await r.json();assert.ok([403,409].includes(r.status),JSON.stringify(pub));assert.ok(['publishing-disabled','independent-publisher-required','version-digest-mismatch','digest-not-approved'].includes(pub.error),'publication guards unchanged for agents: '+pub.error);
 for(const route of ['/strength/native-login?state=x&challenge=y','/strength/native-token']){r=await agent(route,{key:admin.key,method:route.includes('token')?'POST':'GET',data:route.includes('token')?{code:'x',verifier:'y'}:undefined});assert.equal(r.status,404,route)}
 r=await agent('/strength/me',{key:athlete.key,env:{...env,RANKING_ENABLED:'false'}});assert.equal(r.status,503);assert.equal((await r.json()).error,'ranking-unavailable');
 const inactive=await makeKey({scopes:['*'],principalId:'human-athlete'});await db.prepare("UPDATE mw_principals SET active=0 WHERE id='human-athlete'").run();r=await agent('/strength/me',{key:inactive.key});assert.equal(r.status,403);assert.equal((await r.json()).error,'no-linked-principal');
 const who=await (await agent('/whoami',{key:reviewer.key})).json();assert.deepEqual(who.principal,{id:'agent-reviewer',role:'reviewer'});
 const trail=(await agentAudit()).filter(a=>a.key_id===admin.id&&a.route.startsWith('/strength/'));assert.ok(trail.length>=6);assert.ok(trail.some(a=>a.route==='/strength/rank'&&a.status===403));
 const strengthAudit=(await db.prepare('SELECT * FROM mw_audit WHERE actor_id LIKE ? ORDER BY seq').bind('agent-%').all()).results;assert.ok(strengthAudit.length>=4);assert.ok(!JSON.stringify(strengthAudit).includes('mwa_'),'keys never reach the Strength audit');
});

test('per-key rate limit: 429 with Retry-After once the 10-minute budget is spent; headers on every response',async()=>{
 const k=await makeKey({scopes:['status:read']});const tight={...env,AGENT_RATE_LIMIT:'3'};
 for(let i=1;i<=3;i++){const r=await agent('/whoami',{key:k.key,env:tight});assert.equal(r.status,200);assert.equal(r.headers.get('X-RateLimit-Remaining'),String(3-i))}
 const r=await agent('/whoami',{key:k.key,env:tight});assert.equal(r.status,429);assert.equal((await r.json()).error,'rate-limit');assert.ok(Number(r.headers.get('Retry-After'))>=0);
 const other=await makeKey({scopes:['status:read']});assert.equal((await agent('/whoami',{key:other.key,env:tight})).status,200,'limits are per key');
});

test('scripts/agent-key.mjs provisions a working key: SQL contains only the hash, the printed key authenticates with the chosen role',async()=>{
 const out=execFileSync('node',['scripts/agent-key.mjs','create','--name','Ops agent A','--scopes','*','--role','admin','--expires','2030-01-01T00:00:00Z','--sql-only'],{encoding:'utf8'});
 const m=out.match(/(mwa_([a-f0-9]{16})_([A-Za-z0-9_-]{43}))/),key=m[1],keyId=m[2],secret=m[3],sql=out.split('\n').find(l=>l.startsWith('INSERT INTO'));
 assert.ok(sql.includes(createHash('sha256').update(secret).digest('hex'))&&!sql.includes(secret),'only the hash is in the SQL');assert.ok(sql.includes("'agent:"+keyId+"'")&&sql.includes("'admin'"));
 sqlite({script:sql});
 const who=await (await agent('/whoami',{key})).json();assert.equal(who.key.name,'Ops agent A');assert.deepEqual(who.key.scopes,['*']);assert.equal(who.principal.role,'admin');
 assert.equal((await agent('/strength/admin/standards',{key})).status,200);
 const revoke=execFileSync('node',['scripts/agent-key.mjs','revoke','--id',keyId,'--sql-only'],{encoding:'utf8'});sqlite({script:revoke.trim()});
 const r=await agent('/whoami',{key});assert.equal(r.status,401);assert.equal((await r.json()).error,'key-revoked');
 assert.throws(()=>execFileSync('node',['scripts/agent-key.mjs','create','--name','x','--scopes','everything','--sql-only'],{stdio:'pipe'}),/known scopes/);
 assert.throws(()=>execFileSync('node',['scripts/agent-key.mjs','create','--name','x','--scopes','*','--remote','--sql-only'],{stdio:'pipe'}),/Explicit production database/);
});

test('migration 0004 is additive and operational only',()=>{
 const sql=readFileSync('migrations/0004_agent_api.sql','utf8');
 assert.ok(!/\b(ALTER|DROP)\b/i.test(sql));for(const t of ['mw_results','mw_rank_history','mw_reviews','mw_publications','mw_audit ','mw_performances','mw_profiles'])assert.ok(!sql.includes('ON '+t)&&!sql.includes('INTO '+t),t+' untouched');
 assert.ok(sql.includes('CREATE TABLE mw_agent_keys')&&sql.includes('CREATE TABLE mw_agent_audit')&&sql.includes('CREATE TABLE mw_agent_kv')&&sql.includes('mw_agent_audit_no_delete'));
 const example=readFileSync('.env.example','utf8');assert.ok(example.includes('AGENT_API_ENABLED=false'),'.env.example documents the flag');
});
