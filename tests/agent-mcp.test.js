// Agent handover client (scripts/agent-mcp.mjs): MCP server over stdio + CLI, exercised END TO END against the
// real Agent API handler (server/agent.js) served over HTTP from SQLite-backed D1 shims. Synthetic keys only.
// What must hold: the tool list is the server's own manifest filtered to the key's scopes/role, every tool call is
// one audited HTTP request with the bearer key, HTTP failures come back as tool results (never crashes), stdout
// carries nothing but JSON-RPC, and the CLI exit codes are usable by cron jobs / shell agents.
import {test,before,after} from 'node:test';import assert from 'node:assert/strict';import {readFileSync,mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFileSync,spawn} from 'node:child_process';import {createHash,randomBytes} from 'node:crypto';import {createServer} from 'node:http';
import {handleAgent} from '../server/agent.js';
let dir,db,app,waitlist,env,server,origin,opsKey,athleteKey;
function sqlite(data,file){const out=JSON.parse(execFileSync('python3',['tests/fixtures/d1_sqlite.py'],{input:JSON.stringify({path:join(dir,file),...data}),encoding:'utf8'}));if(out.error)throw Error(out.error);return out.data}
class Statement{constructor(file,sql,values=[]){this.file=file;this.sql=sql;this.values=values}bind(...values){return new Statement(this.file,this.sql,values)}async first(){return sqlite({statements:[this]},this.file)[0].results[0]||null}async all(){return sqlite({statements:[this]},this.file)[0]}async run(){return sqlite({statements:[this]},this.file)[0]}}
const mkdb=file=>({file,prepare:s=>new Statement(file,s),batch:async statements=>sqlite({statements},file)});
async function makeKey({name,scopes,principalId=null}){const id=randomBytes(8).toString('hex'),secret=randomBytes(32).toString('base64url');
 await db.prepare('INSERT INTO mw_agent_keys(id,name,secret_hash,scopes,principal_id,status) VALUES(?,?,?,?,?,?)').bind(id,name,createHash('sha256').update(secret).digest('hex'),JSON.stringify(scopes),principalId,'active').run();return {id,secret,key:`mwa_${id}_${secret}`}}
let currentEnv;
before(async()=>{dir=mkdtempSync(join(tmpdir(),'monte-agent-mcp-'));
 sqlite({script:readFileSync('migrations/0001_waitlist.sql','utf8')},'waitlist.sqlite');sqlite({script:['0002_strength_index','0007_native_auth_codes'].map(m=>readFileSync(`migrations/${m}.sql`,'utf8')).join('\n')},'app.sqlite');sqlite({script:readFileSync('migrations/0008_agent_api.sql','utf8')},'agent.sqlite');
 db=mkdb('agent.sqlite');app=mkdb('app.sqlite');waitlist=mkdb('waitlist.sqlite');
 await app.prepare('INSERT INTO mw_principals(id,subject,role) VALUES(?,?,?)').bind('agent-athlete','subject:agent-athlete','athlete').run();
 env={DB:waitlist,APP_DB:app,AGENT_DB:db,AGENT_API_ENABLED:'true',RANKING_ENABLED:'true',RANKING_ACCESS_ISSUER:'https://test-team.cloudflareaccess.com',RANKING_ACCESS_AUD:'test-audience',AGENT_RATE_LIMIT:'500'};currentEnv=env;
 opsKey=await makeKey({name:'ULTRON (test)',scopes:['status:read','catalog:read','audit:read','waitlist:stats','kv:read','kv:write']});
 athleteKey=await makeKey({name:'athlete bot (test)',scopes:['strength:read','strength:write'],principalId:'agent-athlete'});
 // HTTP bridge: a real socket in front of the real handler, exactly what the client will see in production.
 server=createServer(async(req,res)=>{try{const chunks=[];for await(const c of req)chunks.push(c);const headers=new Headers();for(const [k,v] of Object.entries(req.headers))if(typeof v==='string')headers.set(k,v);
  const request=new Request('http://agent.test'+req.url,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});
  const response=await handleAgent({request,env:currentEnv});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()))}catch(e){res.writeHead(500);res.end(String(e))}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;});
after(async()=>{server?.closeAllConnections?.();await new Promise(r=>server.close(r));rmSync(dir,{recursive:true,force:true})});

function mcp(extraEnv){const child=spawn(process.execPath,['scripts/agent-mcp.mjs'],{env:{...process.env,MONTE_WO_AGENT_URL:origin,...extraEnv},stdio:['pipe','pipe','pipe']});
 let buf='',stderr='';const pending=new Map(),stdoutLines=[];
 child.stdout.on('data',d=>{buf+=d;let i;while((i=buf.indexOf('\n'))!==-1){const line=buf.slice(0,i);buf=buf.slice(i+1);if(!line.trim())continue;stdoutLines.push(line);let m;try{m=JSON.parse(line)}catch{for(const p of pending.values())p.reject(new Error('non-JSON on stdout: '+line));return}
  for(const r of Array.isArray(m)?m:[m]){const p=pending.get(r.id);if(p){pending.delete(r.id);p.resolve(Array.isArray(m)?m:r)}}}});
 child.stderr.on('data',d=>{stderr+=d});let id=0;
 const request=(method,params)=>new Promise((resolve,reject)=>{const myId=++id;pending.set(myId,{resolve,reject});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:myId,method,params})+'\n');setTimeout(()=>{if(pending.has(myId)){pending.delete(myId);reject(new Error('timeout waiting for '+method+'\nstderr: '+stderr))}},20000).unref()});
 const raw=(line,expectId)=>new Promise((resolve,reject)=>{pending.set(expectId,{resolve,reject});child.stdin.write(line+'\n');setTimeout(()=>{if(pending.has(expectId)){pending.delete(expectId);reject(new Error('timeout for raw line'))}},20000).unref()});
 const notify=(method,params)=>child.stdin.write(JSON.stringify({jsonrpc:'2.0',method,params})+'\n');
 const close=()=>new Promise(r=>{child.once('exit',r);child.stdin.end()});
 return {child,request,raw,notify,stdoutLines,stderr:()=>stderr,close}}
const call=async(c,name,args)=>{const r=await c.request('tools/call',{name,arguments:args});if(r.error)return {rpcError:r.error};const text=r.result.content[0].text;return {isError:r.result.isError,...JSON.parse(text)}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

test('MCP handshake: supported protocol versions are echoed, unknown ones fall back; instructions carry the key identity, policy and product rules',async()=>{
 const c=mcp({MONTE_WO_AGENT_KEY:opsKey.key});
 try{const init=await c.request('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'test',version:'0'}});
  assert.equal(init.result.protocolVersion,'2025-03-26');assert.equal(init.result.serverInfo.name,'monte-wo-agent');assert.deepEqual(Object.keys(init.result.capabilities),['tools']);
  const ins=init.result.instructions;assert.match(ins,/key "ULTRON \(test\)"/);assert.match(ins,/scopes: status:read, catalog:read, audit:read, waitlist:stats, kv:read, kv:write/);assert.match(ins,/no linked Strength principal/);
  assert.match(ins,/nine ranks each and no combined rank/);assert.match(ins,/never awarded manually/);assert.match(ins,/Provisional at most, Verified only after an authorized evidence review/);assert.match(ins,/e-mail access disabled/);assert.match(ins,/500 calls per 10 minutes/);
  c.notify('notifications/initialized');
  const again=await c.request('initialize',{protocolVersion:'1999-01-01',capabilities:{}});assert.equal(again.result.protocolVersion,'2025-06-18','unknown version → newest supported');
  assert.deepEqual((await c.request('ping',{})).result,{});
  const unknown=await c.request('nope/method',{});assert.equal(unknown.error.code,-32601);
  assert.deepEqual((await c.request('resources/list',{})).result,{resources:[]});
  await sleep(50);assert.ok(c.stdoutLines.every(l=>{try{JSON.parse(l);return true}catch{return false}}),'stdout is JSON-RPC only');
  assert.equal(c.stdoutLines.length,5,'exactly one response per request, none for the notification');
 }finally{await c.close()}});

test('tools/list: the server manifest filtered to the key — scopes, linked role, binary operations hidden; schemas and annotations intact',async()=>{
 const ops=mcp({MONTE_WO_AGENT_KEY:opsKey.key});
 try{const tools=(await ops.request('tools/list',{})).result.tools;const names=tools.map(t=>t.name);
  assert.deepEqual(names,['whoami','get_status','get_metrics','get_catalog','get_audit','waitlist_stats','list_memory','get_memory','put_memory','delete_memory'],'exactly the operations this key may call, in manifest order');
  for(const t of tools){assert.equal(t.inputSchema.type,'object');assert.equal(t.inputSchema.additionalProperties,false);assert.equal(typeof t.description,'string');assert.equal(typeof t.annotations.readOnlyHint,'boolean')}
  const put=tools.find(t=>t.name==='put_memory');assert.deepEqual(put.inputSchema.required,['key']);assert.ok(put.inputSchema.properties.header_If_Match);assert.equal(put.annotations.readOnlyHint,false);assert.equal(put.annotations.idempotentHint,true);
  assert.equal(tools.find(t=>t.name==='get_status').annotations.readOnlyHint,true);assert.equal(tools.find(t=>t.name==='delete_memory').annotations.destructiveHint,true);
 }finally{await ops.close()}
 const ath=mcp({MONTE_WO_AGENT_KEY:athleteKey.key});
 try{const names=(await ath.request('tools/list',{})).result.tools.map(t=>t.name);
  assert.ok(names.includes('strength_me')&&names.includes('strength_submit_performance')&&names.includes('strength_catalog'),'athlete operations listed');
  assert.ok(!names.includes('strength_review_queue')&&!names.includes('strength_review')&&!names.includes('strength_standards'),'reviewer/admin operations hidden for an athlete principal');
  assert.ok(!names.includes('get_status')&&!names.includes('put_memory'),'scopes not granted are hidden');
  assert.ok(!names.includes('strength_upload_evidence')&&!names.includes('strength_get_evidence'),'binary operations are never exposed through MCP');
  const ins=(await ath.request('initialize',{protocolVersion:'2025-06-18',capabilities:{}})).result.instructions;assert.match(ins,/linked Strength principal agent-athlete with role athlete/);
 }finally{await ath.close()}
 const all=mcp({MONTE_WO_AGENT_KEY:opsKey.key,MONTE_WO_AGENT_ALL_TOOLS:'1'});
 try{const names=(await all.request('tools/list',{})).result.tools.map(t=>t.name);assert.equal(names.length,26,'28 operations minus the 2 binary ones');assert.ok(names.includes('list_waitlist')&&names.includes('strength_publish'))}finally{await all.close()}
 const anon=mcp({});
 try{const names=(await anon.request('tools/list',{})).result.tools.map(t=>t.name);assert.equal(names.length,26,'without a key: discovery lists everything (calls will be 401)');assert.match(anon.stderr(),/MONTE_WO_AGENT_KEY is not set/)}finally{await anon.close()}});

test('tools/call: path parameters, headers, JSON body and query reach the real API; HTTP failures are tool errors, protocol misuse is a JSON-RPC error',async()=>{
 const c=mcp({MONTE_WO_AGENT_KEY:opsKey.key});
 try{const who=await call(c,'whoami',{});assert.equal(who.status,200);assert.equal(who.isError,false);assert.equal(who.body.key.name,'ULTRON (test)');assert.equal(typeof who.rateLimitRemaining,'number');
  const status=await call(c,'get_status');assert.equal(status.status,200);assert.equal(status.body.storage.agentDatabase,'ok');assert.equal(status.body.features.agentApi.pii,false);
  const catalog=await call(c,'get_catalog',{});assert.equal(catalog.status,200);assert.equal(catalog.body.disciplines.length,4);assert.equal(catalog.body.ranks.length,9);assert.equal(catalog.body.combinedRank,false);
  const created=await call(c,'put_memory',{key:'lock:deploy',body:{owner:'ULTRON',since:'2026-10-31'},header_If_Match:0});assert.equal(created.status,201);assert.equal(created.etag,'"1"');assert.equal(created.isError,false);
  const conflict=await call(c,'put_memory',{key:'lock:deploy',body:{owner:'ARGON'},header_If_Match:0});assert.equal(conflict.status,409);assert.equal(conflict.body.error,'version-conflict');assert.equal(conflict.isError,true,'HTTP failure is a tool result with isError, not an exception');
  const read=await call(c,'get_memory',{key:'lock:deploy'});assert.equal(read.status,200);assert.deepEqual(read.body.value,{owner:'ULTRON',since:'2026-10-31'});assert.equal(read.body.version,1);
  const bumped=await call(c,'put_memory',{key:'lock:deploy',body:null,header_If_Match:1});assert.equal(bumped.status,200);assert.equal(bumped.body.version,2,'null is a valid JSON body');
  const listed=await call(c,'list_memory',{prefix:'lock:'});assert.equal(listed.status,200);assert.ok(listed.body.keys.some(k=>k.key==='lock:deploy'),'query parameter reached the server');
  const audit=await call(c,'get_audit',{limit:3,source:'agent'});assert.equal(audit.status,200);assert.equal(audit.body.entries.length,3,'limit query applied');assert.ok(audit.body.entries.every(e=>!JSON.stringify(e).includes(opsKey.secret)),'audit never carries the secret');
  const gone=await call(c,'delete_memory',{key:'lock:deploy'});assert.equal(gone.status,200);assert.equal(gone.body.deleted,true);
  const missing=await call(c,'get_memory',{key:'lock:deploy'});assert.equal(missing.status,404);assert.equal(missing.isError,true);
  const badName=await call(c,'get_memory',{key:'no/slash'});assert.equal(badName.status,400,'the server validates key names (client only URL-encodes)');
  const hidden=await call(c,'list_waitlist',{});assert.equal(hidden.rpcError.code,-32602,'tools outside the key scopes are unknown to the client');
  const unknown=await call(c,'make_me_admin',{});assert.equal(unknown.rpcError.code,-32602);
  const noParam=await call(c,'get_memory',{});assert.equal(noParam.rpcError.code,-32602);assert.match(noParam.rpcError.message,/Missing required parameter: key/);
  const badArgs=await c.request('tools/call',{name:'whoami',arguments:[1,2]});assert.equal(badArgs.error.code,-32602);
  const batch=await c.raw(JSON.stringify([{jsonrpc:'2.0',id:901,method:'ping'},{jsonrpc:'2.0',id:902,method:'ping'}]),901);assert.ok(Array.isArray(batch)&&batch.length===2,'batch answered as a batch');
  const parse=await c.raw('this is not json',null);assert.equal(parse.error.code,-32700);
 }finally{await c.close()}
 const rows=(await db.prepare("SELECT route,status,outcome FROM mw_agent_audit WHERE key_id=? ORDER BY seq").bind(opsKey.id).all()).results;
 assert.ok(rows.filter(r=>r.route==='/kv/lock:deploy').length>=6,'every memory call made through the client is audited');assert.ok(rows.some(r=>r.status===409));});

test('product rules hold through the client: an athlete key cannot award ranks, cannot see others, and gets honest 403/503 answers',async()=>{
 const c=mcp({MONTE_WO_AGENT_KEY:athleteKey.key,MONTE_WO_AGENT_ALL_TOOLS:'1'});
 try{const me=await call(c,'strength_me',{});assert.equal(me.status,200);assert.equal(me.body.actor.role,'athlete');assert.equal(me.body.disciplines.length,4,'four independent discipline cards');assert.ok(me.body.disciplines.every(d=>d.verified===null||typeof d.verified==='object'),'cards expose Provisional/Verified separately');
  const award=await c.request('tools/call',{name:'whoami',arguments:{}});assert.equal(award.result.isError,false);
  const review=await call(c,'strength_review_queue',{});assert.equal(review.status,403,'reviewer-only operation refused by the server even when listed with ALL_TOOLS');assert.equal(review.isError,true);
  const statusDenied=await call(c,'get_status',{});assert.equal(statusDenied.status,403);assert.equal(statusDenied.body.error,'insufficient-scope');
  const pii=await call(c,'list_waitlist',{});assert.equal(pii.status,403,'no waitlist scope and PII flag off');
 }finally{await c.close()}});

test('CLI: check / tools / call with exit codes a cron job can trust; wrong key and disabled API fail loudly',async()=>{
 // async spawn, NOT spawnSync: the HTTP bridge serving the API lives in this test process and must keep its event loop.
 const run=(args,extraEnv={})=>new Promise(resolve=>{const child=spawn(process.execPath,['scripts/agent-mcp.mjs',...args],{env:{...process.env,MONTE_WO_AGENT_URL:origin,MONTE_WO_AGENT_KEY:opsKey.key,...extraEnv},stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',d=>{stdout+=d});child.stderr.on('data',d=>{stderr+=d});child.on('close',status=>resolve({status,stdout,stderr}))});
 let r=await run(['check']);assert.equal(r.status,0,r.stderr);const check=JSON.parse(r.stdout);assert.equal(check.key.name,'ULTRON (test)');assert.deepEqual(check.usableTools.slice(0,2),['whoami','get_status']);assert.equal(check.status.storage.agentDatabase,'ok');assert.match(r.stderr,/OK: key "ULTRON \(test\)" can use 10 tools/);
 r=await run(['tools']);assert.equal(r.status,0);const tools=JSON.parse(r.stdout);assert.equal(tools.length,10);assert.equal(tools[1].name,'get_status');assert.equal(tools[1].scope,'status:read');
 r=await run(['whoami']);assert.equal(r.status,0);assert.equal(JSON.parse(r.stdout).body.key.id,opsKey.id);
 r=await run(['call','get_audit','{"limit":1}']);assert.equal(r.status,0);assert.equal(JSON.parse(r.stdout).body.entries.length,1);
 r=await run(['call','put_memory','{"key":"checkpoint:ultron"}']);assert.equal(r.status,1,'HTTP failure (no body → server rejects) exits 1');assert.ok(JSON.parse(r.stdout).status>=400);
 r=await run(['call','put_memory','{"key":"checkpoint:ultron","body":{"at":1}}']);assert.equal(r.status,0);
 r=await run(['call','not_a_tool']);assert.equal(r.status,2);assert.match(r.stderr,/Unknown tool/);
 r=await run(['call','get_memory','{not json']);assert.equal(r.status,2);
 r=await run(['bogus']);assert.equal(r.status,2);assert.match(r.stderr,/usage/);
 r=await run(['check'],{MONTE_WO_AGENT_KEY:'mwa_'+'0'.repeat(16)+'_'+'A'.repeat(43)});assert.equal(r.status,1,'wrong key');assert.match(r.stderr,/whoami failed \(HTTP 401/);
 currentEnv={...env,AGENT_API_ENABLED:undefined};
 try{r=await run(['tools']);assert.equal(r.status,1);assert.match(r.stderr,/Agent API is not enabled at .* the owner must deploy with --with-agent-api first/)}finally{currentEnv=env}
 r=await run(['check'],{MONTE_WO_AGENT_URL:''});assert.equal(r.status,1);assert.match(r.stderr,/MONTE_WO_AGENT_URL is not set/);});

test('the client file is self-contained: no repo imports, no dependencies, no secrets, no stdout logging in server mode',()=>{
 const src=readFileSync('scripts/agent-mcp.mjs','utf8');
 const imports=[...src.matchAll(/^import .* from '([^']+)'/gm)].map(m=>m[1]);assert.ok(imports.every(i=>i.startsWith('node:')),'only node: built-ins: '+imports.join(', '));
 assert.ok(!/console\.log/.test(src),'no console.log (stdout is the MCP channel)');assert.ok(!/mwa_[0-9a-f]{16}_/.test(src),'no key material');
 assert.match(src,/MONTE_WO_AGENT_KEY/);assert.match(src,/never chat, never Git/);
 const pkg=JSON.parse(readFileSync('package.json','utf8'));assert.match(pkg.scripts['agent:mcp']||'',/agent-mcp\.mjs/,'npm script wired');assert.match(pkg.scripts['test:agent-mcp']||'',/agent-mcp\.test\.js/);});
