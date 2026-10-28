// MONTE WO Agent API — operator-issued keys for automation (AI agents, monitors, back-office tools).
//
// Enabled only when AGENT_API_ENABLED="true" AND a D1 binding exists; otherwise every /api/agent/* route is 404 (inert).
// Security model:
//   * bearer keys `mwa_<id>_<secret>` stored as SHA-256 hashes (plaintext shown once by scripts/agent-key.mjs, never stored);
//   * per-key scopes (default deny), optional IP allow-list, expiry, revocation, per-key rate limit;
//   * append-only audit of every call (mw_agent_audit), including rejected ones (never the key, never personal data).
// Product rules are NOT bypassable here: Strength Index operations run through the same governed handler as humans
// (ownership, reviewer ≠ athlete, publisher ≠ author, digest allow-list, RANKING_PUBLISH_ENABLED, no manual rank awards),
// acting as the key's linked principal. Website/app code changes are a Git + CI concern (see AGENTS.md), not a runtime API.
import {handleStrength,digest} from './strength/api.js';
import {settings as waitlistSettings} from './waitlist.js';
import {StrengthError,requireThat,exactKeys,text,DISCIPLINES,RANK_IDS} from './strength/engine.js';

export const AGENT_API_VERSION='2026-10-14-v1';
export const SCOPES={
 'status:read':'Readiness, configuration state and operational metrics (no personal data)',
 'catalog:read':'Disciplines, the nine ranks per discipline, methodology versions',
 'audit:read':'Append-only audit tails (Strength Index + Agent API)',
 'waitlist:read':'Waitlist signups and statistics (signups contain personal data: email)',
 'waitlist:write':'Delete waitlist signups (deletion requests)',
 'kv:read':'Shared agent memory — read',
 'kv:write':'Shared agent memory — write',
 'strength':'Strength Index operations as the linked principal, under the same governance rules as humans',
 '*':'All scopes',
};
export const KEY_PATTERN=/^mwa_([a-f0-9]{16})_([A-Za-z0-9_-]{43})$/;
export const KV_KEY_PATTERN=/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;   // use ':' or '.' as separators (no '/')
export const KV_MAX_BYTES=65536,KV_MAX_KEYS=1000,RATE_WINDOW_MS=600000,DEFAULT_RATE_LIMIT=1200;
export const agentEnabled=env=>env.AGENT_API_ENABLED==='true'&&!!env.DB;

const uid=()=>crypto.randomUUID();
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...extra}});
function same(a,b){if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let r=0;for(let i=0;i<a.length;i++)r|=a.charCodeAt(i)^b.charCodeAt(i);return r===0}
export function parseKey(header){const m=/^Bearer\s+(\S+)\s*$/i.exec(header||'');const k=m&&KEY_PATTERN.exec(m[1]);return k?{id:k[1],secret:k[2]}:null}
export const hashSecret=secret=>digest(secret);
async function readJson(request,limit=KV_MAX_BYTES){
 requireThat((request.headers.get('Content-Type')||'').split(';')[0].trim()==='application/json','json-required',415);
 requireThat(Number(request.headers.get('Content-Length')||0)<=limit,'body-too-large',413);
 const reader=request.body?.getReader();requireThat(reader,'empty-body');const chunks=[];let n=0;
 while(true){const {done,value}=await reader.read();if(done)break;n+=value.length;if(n>limit){await reader.cancel();throw new StrengthError('body-too-large',413)}chunks.push(value)}
 const bytes=new Uint8Array(n);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length}
 try{return {value:JSON.parse(new TextDecoder().decode(bytes)),bytes:n}}catch{throw new StrengthError('invalid-json')}
}

// ---- authentication, scopes, rate limit, audit --------------------------------------------------------------------
async function authenticateKey(request,env){
 const parsed=parseKey(request.headers.get('Authorization'));requireThat(parsed,'authentication-required',401);
 const row=await env.DB.prepare('SELECT * FROM mw_agent_keys WHERE id=?').bind(parsed.id).first();
 const hash=await hashSecret(parsed.secret);
 requireThat(row&&same(row.secret_hash,hash),'authentication-failed',401);                 // unknown id and wrong secret are indistinguishable
 requireThat(row.status==='active','key-revoked',401);
 requireThat(!row.expires_at||Date.parse(row.expires_at)>Date.now(),'key-expired',401);
 if(row.allowed_ips){let list=[];try{list=JSON.parse(row.allowed_ips)}catch{}requireThat(Array.isArray(list)&&list.includes(request.headers.get('CF-Connecting-IP')),'ip-not-allowed',403)}
 let scopes=[];try{scopes=JSON.parse(row.scopes)}catch{}if(!Array.isArray(scopes))scopes=[];
 return {id:row.id,name:row.name,scopes,principalId:row.principal_id||null};
}
export const hasScope=(key,scope)=>!scope||key.scopes.includes('*')||key.scopes.includes(scope);
async function rateLimit(db,key,env){
 const limit=Math.max(1,Number(env.AGENT_RATE_LIMIT)||DEFAULT_RATE_LIMIT),win=Math.floor(Date.now()/RATE_WINDOW_MS);
 const r=await db.prepare('INSERT INTO mw_agent_rate(key_id,window,attempts) VALUES(?,?,1) ON CONFLICT(key_id) DO UPDATE SET window=excluded.window,attempts=CASE WHEN mw_agent_rate.window=excluded.window THEN mw_agent_rate.attempts+1 ELSE 1 END RETURNING attempts').bind(key.id,win).first();
 return {limit,remaining:Math.max(0,limit-r.attempts),resetAt:new Date((win+1)*RATE_WINDOW_MS).toISOString(),exceeded:r.attempts>limit};
}
const record=(db,keyId,method,route,status,outcome,detail='')=>db.prepare('INSERT INTO mw_agent_audit(id,key_id,method,route,status,outcome,detail) VALUES(?,?,?,?,?,?,?)').bind(uid(),keyId,method,route.slice(0,200),status,outcome,String(detail).slice(0,500)).run();
async function principalOf(key,env){if(!key.principalId)return null;return await env.DB.prepare('SELECT id,role,subject FROM mw_principals WHERE id=? AND active=1').bind(key.principalId).first()||null}

// ---- operations (single source of truth for routing, OpenAPI and the tool manifest) ---------------------------------
const q=(schema,description)=>({...schema,description});
const limitParam=q({type:'integer',minimum:1,maximum:500,default:100},'Maximum number of rows');
const profileSchema={type:'object',additionalProperties:false,required:['bodyweight','unit','sexCategory','ageYears'],properties:{bodyweight:q({type:'string',pattern:'^\\d{1,4}(\\.\\d{1,3})?$'},'Decimal string, e.g. "82.5"'),unit:{type:'string',enum:['kg','lb']},sexCategory:{type:'string',enum:['female','male','unclassified']},ageYears:{type:'integer',minimum:18,maximum:100}}};
const performanceSchema={type:'object',additionalProperties:false,required:['discipline','load','unit','reps','resultType','performedOn','bodyweight','sexCategory','ageYears','variation','equipment','checks'],properties:{discipline:{type:'string',enum:DISCIPLINES},load:q({type:'string',pattern:'^\\d{1,4}(\\.\\d{1,3})?$'},'Decimal string'),unit:{type:'string',enum:['kg','lb']},reps:{type:'integer',minimum:1,maximum:10},resultType:q({type:'string',enum:['tested','estimated']},'tested ⇒ reps=1; estimated ⇒ reps 2–10'),performedOn:q({type:'string',format:'date'},'YYYY-MM-DD, not in the future'),bodyweight:{type:'string'},bodyweightUnit:{type:'string',enum:['kg','lb']},sexCategory:{type:'string',enum:['female','male','unclassified']},ageYears:{type:'integer',minimum:18,maximum:100},variation:q({type:'string'},'Must equal the active rulebook variation'),equipment:q({type:'string'},'One of the active rulebook equipment options'),checks:q({type:'object'},'Every MONTE Standard check id of the active rulebook set to true (attestation)'),correctionOf:q({type:'string',maxLength:80},'Optional id of the performance this one corrects')}};
export const OPERATIONS=[
 {id:'whoami',method:'GET',path:'/whoami',scope:null,summary:'Identify the calling key: name, scopes, linked principal (id/role) and rate-limit state.'},
 {id:'getStatus',method:'GET',path:'/status',scope:'status:read',summary:'Service readiness for 24/7 monitoring: feature flags, storage reachability, configuration state, product rules. No personal data.'},
 {id:'getMetrics',method:'GET',path:'/metrics',scope:'status:read',summary:'Operational counts: waitlist (total / 24 h / 7 d), active principals by role, performances, results, reviews by state, publications, audit volume, agent keys and memory keys.'},
 {id:'getCatalog',method:'GET',path:'/catalog',scope:'catalog:read',summary:'The four independent disciplines, the nine ranks per discipline (no combined rank) and the current methodology versions with their draft/approved state.'},
 {id:'getAudit',method:'GET',path:'/audit',scope:'audit:read',summary:'Tail of an append-only audit log, newest first. Use `before` (seq cursor) to page backwards.',query:{source:q({type:'string',enum:['agent','strength'],default:'agent'},'Which log'),limit:limitParam,before:q({type:'integer',minimum:1},'Only entries with seq lower than this')}},
 {id:'listWaitlist',method:'GET',path:'/waitlist',scope:'waitlist:read',summary:'Waitlist signups, oldest first, cursor-paginated. Contains personal data (email) — handle under the privacy policy.',query:{limit:limitParam,after:q({type:'string'},'Opaque cursor returned as nextAfter'),locale:q({type:'string',enum:['en','ht','fr']},'Filter by locale')}},
 {id:'waitlistStats',method:'GET',path:'/waitlist/stats',scope:'waitlist:read',summary:'Waitlist counts by locale and per day for the last 30 days. No personal data.'},
 {id:'forgetWaitlistEmail',method:'POST',path:'/waitlist/forget',scope:'waitlist:write',summary:'Delete a waitlist signup by email address (deletion request). The audit trail stores a hash of the address, never the address.',body:{type:'object',additionalProperties:false,required:['email','reason'],properties:{email:{type:'string',format:'email',maxLength:254},reason:{type:'string',minLength:1,maxLength:500}}}},
 {id:'deleteWaitlistSignup',method:'DELETE',path:'/waitlist/{id}',scope:'waitlist:write',summary:'Delete a waitlist signup by id.',params:{id:q({type:'string',maxLength:80},'Signup id from listWaitlist')}},
 {id:'listMemory',method:'GET',path:'/kv',scope:'kv:read',summary:'List shared agent-memory keys (key, version, size, updated_by, updated_at). Use it to coordinate several agents (locks, checkpoints, incident notes).',query:{prefix:q({type:'string',maxLength:128},'Only keys starting with this prefix')}},
 {id:'getMemory',method:'GET',path:'/kv/{key}',scope:'kv:read',summary:'Read a shared agent-memory value (any JSON). Response carries ETag = version.',params:{key:q({type:'string',pattern:KV_KEY_PATTERN.source},'Key name')}},
 {id:'putMemory',method:'PUT',path:'/kv/{key}',scope:'kv:write',summary:'Write a shared agent-memory value (any JSON ≤ 64 KB, at most 1000 keys). Optional If-Match: <version> for optimistic concurrency (0 = create only if absent); 409 version-conflict otherwise.',params:{key:q({type:'string',pattern:KV_KEY_PATTERN.source},'Key name')},body:q({},'Any JSON value'),headers:{'If-Match':q({type:'integer',minimum:0},'Expected current version')}},
 {id:'deleteMemory',method:'DELETE',path:'/kv/{key}',scope:'kv:write',summary:'Delete a shared agent-memory key.',params:{key:q({type:'string',pattern:KV_KEY_PATTERN.source},'Key name')}},
 // Strength Index — proxied to the governed handler as the linked principal. Same rules as for humans; `/rank`, `/award`, `/override` are always denied and audited.
 {id:'strengthConfig',method:'GET',path:'/strength/config',scope:'strength',summary:'Strength Index readiness and policy statement.'},
 {id:'strengthCatalog',method:'GET',path:'/strength/catalog',scope:'strength',summary:'Active model + rulebook per discipline with approval flags (DRAFT standards cannot award official ranks).'},
 {id:'strengthMe',method:'GET',path:'/strength/me',scope:'strength',roles:['athlete','reviewer','admin'],summary:'The linked principal’s own workspace: profile revisions, performances, results, reviews, per-discipline cards (Provisional vs Verified).'},
 {id:'strengthCreateProfile',method:'POST',path:'/strength/profiles',scope:'strength',roles:['athlete','reviewer','admin'],summary:'Append a profile revision for the linked principal (historical achievements unchanged).',body:{type:'object',additionalProperties:false,required:['profile','reason'],properties:{profile:profileSchema,reason:{type:'string',minLength:1,maxLength:1000}}}},
 {id:'strengthSubmitPerformance',method:'POST',path:'/strength/performances',scope:'strength',roles:['athlete','reviewer','admin'],summary:'Submit a performance for the linked principal. Self-reported ⇒ Provisional at most; Verified only after an authorized evidence review.',body:performanceSchema},
 {id:'strengthRecalculate',method:'POST',path:'/strength/recalculate',scope:'strength',roles:['athlete','reviewer','admin'],summary:'Re-evaluate one of the linked principal’s performances under the current methodology (appends a result; history kept).',body:{type:'object',additionalProperties:false,required:['performanceId','reason'],properties:{performanceId:{type:'string'},reason:{type:'string',maxLength:1000}}}},
 {id:'strengthUploadEvidence',method:'POST',path:'/strength/performances/{id}/evidence',scope:'strength',roles:['athlete','reviewer','admin'],summary:'Upload private evidence (raw body, Content-Type video/mp4, ≤ 20 MB) for one of the linked principal’s performances. Requires the private evidence bucket.',params:{id:q({type:'string'},'Performance id')}},
 {id:'strengthGetEvidence',method:'GET',path:'/strength/evidence/{id}',scope:'strength',roles:['athlete','reviewer','admin'],summary:'Stream an evidence object (owner, or reviewer/admin for review). Private.',params:{id:q({type:'string'},'Evidence id')}},
 {id:'strengthReviewQueue',method:'GET',path:'/strength/admin/queue',scope:'strength',roles:['reviewer','admin'],summary:'Pending evidence reviews (reviewer/admin).'},
 {id:'strengthReview',method:'POST',path:'/strength/reviews',scope:'strength',roles:['reviewer','admin'],summary:'Record an evidence review decision (approved / rejected / flagged). Reviewer must differ from the athlete; expectedRevision guards against stale decisions.',body:{type:'object',additionalProperties:false,required:['performanceId','evidenceId','expectedRevision','state','checks','reason'],properties:{performanceId:{type:'string'},evidenceId:{type:'string'},expectedRevision:{type:'integer',minimum:1},state:{type:'string',enum:['approved','rejected','flagged']},checks:q({type:'object'},'Rulebook check id → boolean'),reason:{type:'string',maxLength:1000}}}},
 {id:'strengthStandards',method:'GET',path:'/strength/admin/standards',scope:'strength',roles:['admin'],summary:'All methodology versions (models, rulebooks, publications).'},
 {id:'strengthAuditLog',method:'GET',path:'/strength/admin/audit',scope:'strength',roles:['admin'],summary:'Strength Index audit log (admin).'},
 {id:'strengthDraftModel',method:'POST',path:'/strength/admin/models',scope:'strength',roles:['admin'],summary:'Store a DRAFT model version (cannot award official ranks until published).',body:{type:'object',additionalProperties:false,required:['document','reason'],properties:{document:q({type:'object'},'Model document (id, discipline, rulebookId, …)'),reason:{type:'string',maxLength:1000}}}},
 {id:'strengthDraftRulebook',method:'POST',path:'/strength/admin/rulebooks',scope:'strength',roles:['admin'],summary:'Store a DRAFT rulebook version.',body:{type:'object',additionalProperties:false,required:['document','reason'],properties:{document:q({type:'object'},'Rulebook document'),reason:{type:'string',maxLength:1000}}}},
 {id:'strengthPublish',method:'POST',path:'/strength/admin/{kind}/{id}/publish',scope:'strength',roles:['admin'],summary:'Publish a version (publisher ≠ author, digest must match and be on the approved allow-list, RANKING_PUBLISH_ENABLED must be true).',params:{kind:{type:'string',enum:['models','rulebooks']},id:{type:'string'}},body:{type:'object',additionalProperties:false,required:['reason','digest'],properties:{reason:{type:'string',maxLength:1000},digest:{type:'string',pattern:'^[a-f0-9]{64}$'}}}},
];
const compiled=OPERATIONS.map(op=>({...op,re:new RegExp('^'+op.path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\\\{([a-zA-Z]+)\\\}/g,'(?<$1>[^/]+)')+'$')}));
export function matchOperation(route,method){
 const byPath=compiled.filter(op=>op.re.test(route));if(!byPath.length)return {op:null,status:404};
 const op=byPath.find(o=>o.method===method);if(!op)return {op:null,status:405,allow:byPath.map(o=>o.method)};
 const params={};for(const [k,v] of Object.entries(op.re.exec(route).groups||{})){try{params[k]=decodeURIComponent(v)}catch{params[k]=v}}return {op,params};
}
const snake=s=>s.replace(/([A-Z])/g,'_$1').toLowerCase();
export function toolManifest(){
 return OPERATIONS.map(op=>{const properties={},required=[];
  for(const [k,v] of Object.entries(op.params||{})){properties[k]=v;required.push(k)}
  for(const [k,v] of Object.entries(op.query||{}))properties[k]=v;
  if(op.body){properties.body=op.body.type?op.body:{description:op.body.description||'JSON body'};if(op.body.type)required.push('body')}
  for(const [k,v] of Object.entries(op.headers||{}))properties['header_'+k.replace(/-/g,'_')]=v;
  return {name:snake(op.id),description:op.summary+(op.roles?` Requires the key's linked principal to have role ${op.roles.join(' or ')}.`:'')+(op.scope?` Scope: ${op.scope}.`:' Any valid key.'),parameters:{type:'object',properties,required,additionalProperties:false},http:{method:op.method,path:'/api/agent'+op.path},scope:op.scope||null,roles:op.roles||null}});
}
export function openapi(origin){
 const paths={};
 for(const op of OPERATIONS){const parameters=[...Object.entries(op.params||{}).map(([name,schema])=>({name,in:'path',required:true,schema,description:schema.description})),...Object.entries(op.query||{}).map(([name,schema])=>({name,in:'query',required:false,schema,description:schema.description})),...Object.entries(op.headers||{}).map(([name,schema])=>({name,in:'header',required:false,schema,description:schema.description}))];
  const entry={operationId:op.id,summary:op.summary,security:[{agentKey:[]}],'x-scope':op.scope,...(op.roles?{'x-principal-roles':op.roles}:{}),parameters,responses:{'200':{description:'OK (JSON)'},'401':{description:'Missing, unknown, revoked or expired key'},'403':{description:'Scope, IP, role or product-rule denial (audited)'},'404':{description:'Not found / Agent API disabled'},'429':{description:'Rate limit (per key, 10-minute window)'}}};
  if(op.body)entry.requestBody={required:true,content:{'application/json':{schema:op.body}}};
  if(op.id==='strengthUploadEvidence')entry.requestBody={required:true,content:{'video/mp4':{schema:{type:'string',format:'binary'}}}};
  (paths['/api/agent'+op.path]||={})[op.method.toLowerCase()]=entry}
 return {openapi:'3.1.0',info:{title:'MONTE WO Agent API',version:AGENT_API_VERSION,description:'Operator-issued keys for automation. Scopes are granted per key by the operator; Strength Index operations act as the key’s linked principal under the same governance rules as human users: four independent disciplines, nine ranks each, no combined rank, Provisional for self-reported performances, Verified only after an authorized evidence review, no manual rank awards, append-only history and audit records.'},servers:[{url:origin}],components:{securitySchemes:{agentKey:{type:'http',scheme:'bearer',bearerFormat:'mwa_<id>_<secret>'}}},'x-scopes':SCOPES,'x-tools':'/api/agent/tools',paths};
}

// ---- handlers ---------------------------------------------------------------------------------------------------------
const handlers={
 async whoami({key,rate,env}){const p=await principalOf(key,env);return json({key:{id:key.id,name:key.name,scopes:key.scopes},principal:p?{id:p.id,role:p.role}:null,rateLimit:{limit:rate.limit,remaining:rate.remaining,resetAt:rate.resetAt},version:AGENT_API_VERSION})},
 async getStatus({env,url}){let database='ok';try{await env.DB.prepare('SELECT 1 AS ok').first()}catch{database='error'}const wl=waitlistSettings(env,url);
  return json({service:'monte-wo',version:AGENT_API_VERSION,time:new Date().toISOString(),storage:{database,evidenceBucket:!!env.RANKING_EVIDENCE,mediaBucket:!!env.WORKOUT_GIFS_BUCKET},
   features:{waitlist:{available:wl.available,localTest:wl.localTest,consentVersion:wl.consentVersion},ranking:{enabled:env.RANKING_ENABLED==='true',identityConfigured:!!(env.RANKING_ACCESS_ISSUER&&env.RANKING_ACCESS_AUD),publishEnabled:env.RANKING_PUBLISH_ENABLED==='true',approvedDigests:(env.RANKING_APPROVED_DIGESTS||'').split(',').filter(Boolean).length},nativeClients:{enabled:env.NATIVE_CLIENTS_ENABLED==='true'},agentApi:{enabled:true}},
   productRules:{disciplines:DISCIPLINES,ranksPerDiscipline:RANK_IDS,combinedRank:false,manualRankAwards:false,provisionalForSelfReported:true,verifiedRequiresAuthorizedReview:true,unapprovedStandardsAwardOfficialRanks:false}})},
 async getMetrics({env}){const db=env.DB,n=async(sql,...v)=>{try{return (await db.prepare(sql).bind(...v).first())?.n??null}catch{return null}},rows=async(sql)=>{try{return (await db.prepare(sql).all()).results}catch{return null}};
  const iso=ms=>new Date(Date.now()-ms).toISOString();
  return json({time:new Date().toISOString(),waitlist:{total:await n('SELECT COUNT(*) AS n FROM waitlist'),last24h:await n('SELECT COUNT(*) AS n FROM waitlist WHERE created_at>=?',iso(86400000)),last7d:await n('SELECT COUNT(*) AS n FROM waitlist WHERE created_at>=?',iso(7*86400000))},
   principalsByRole:await rows('SELECT role,COUNT(*) AS n FROM mw_principals WHERE active=1 GROUP BY role ORDER BY role'),performances:await n('SELECT COUNT(*) AS n FROM mw_performances'),results:await n('SELECT COUNT(*) AS n FROM mw_results'),reviewsByState:await rows('SELECT state,COUNT(*) AS n FROM mw_reviews GROUP BY state ORDER BY state'),publications:await n('SELECT COUNT(*) AS n FROM mw_publications'),
   audit:{strength:await n('SELECT COUNT(*) AS n FROM mw_audit'),agent:await n('SELECT COUNT(*) AS n FROM mw_agent_audit')},agentKeys:{active:await n("SELECT COUNT(*) AS n FROM mw_agent_keys WHERE status='active'")},memoryKeys:await n('SELECT COUNT(*) AS n FROM mw_agent_kv')})},
 async getCatalog({env,url}){const db=env.DB;const disciplines=(await db.prepare('SELECT id,name FROM mw_disciplines ORDER BY id').all()).results,ranks=(await db.prepare('SELECT id,ordinal,name,icon FROM mw_rank_definitions ORDER BY ordinal').all()).results;
  let methodology={available:false,disciplines:[]};try{methodology=await (await handleStrength({request:new Request(url.origin+'/api/strength/catalog'),env})).json()}catch{}
  return json({disciplines,ranks,ranksPerDiscipline:ranks.length,combinedRank:false,rule:'Ranks are earned per discipline and never transferred or combined. Unapproved (DRAFT) standards cannot award official ranks.',methodology})},
 async getAudit({env,url}){const source=url.searchParams.get('source')||'agent',limit=Math.min(500,Math.max(1,Number(url.searchParams.get('limit'))||100)),before=url.searchParams.get('before');requireThat(['agent','strength'].includes(source),'invalid-source');requireThat(before===null||/^\d{1,12}$/.test(before),'invalid-cursor');
  const table=source==='agent'?'mw_agent_audit':'mw_audit',where=before?' WHERE seq<?':'',stmt=env.DB.prepare(`SELECT * FROM ${table}${where} ORDER BY seq DESC LIMIT ?`);const entries=(await (before?stmt.bind(Number(before),limit):stmt.bind(limit)).all()).results;
  return json({source,entries,nextBefore:entries.length===limit?entries[entries.length-1].seq:null})},
 async listWaitlist({env,url}){const limit=Math.min(500,Math.max(1,Number(url.searchParams.get('limit'))||100)),locale=url.searchParams.get('locale'),after=url.searchParams.get('after')||'';requireThat(!locale||['en','ht','fr'].includes(locale),'invalid-locale');
  const [ts,id]=after?after.split('|'):['',''];requireThat(after===''||(ts&&id!==undefined),'invalid-cursor');
  const sql=`SELECT id,email,locale,consent_version,source,created_at FROM waitlist WHERE (created_at>? OR (created_at=? AND id>?))${locale?' AND locale=?':''} ORDER BY created_at ASC,id ASC LIMIT ?`,args=[ts,ts,id||'',...(locale?[locale]:[]),limit];
  const signups=(await env.DB.prepare(sql).bind(...args).all()).results,last=signups[signups.length-1];return json({signups,nextAfter:signups.length===limit&&last?last.created_at+'|'+last.id:null,personalData:true})},
 async waitlistStats({env}){const db=env.DB;const since=new Date(Date.now()-30*86400000).toISOString().slice(0,10);
  return json({total:(await db.prepare('SELECT COUNT(*) AS n FROM waitlist').first()).n,byLocale:(await db.prepare('SELECT locale,COUNT(*) AS n FROM waitlist GROUP BY locale ORDER BY locale').all()).results,byDay:(await db.prepare('SELECT substr(created_at,1,10) AS day,COUNT(*) AS n FROM waitlist WHERE created_at>=? GROUP BY day ORDER BY day').bind(since).all()).results,since})},
 async forgetWaitlistEmail({request,env,key}){const {value:b}=await readJson(request,4096);exactKeys(b,['email','reason']);const email=text(b.email,254).toLowerCase(),reason=text(b.reason,500);requireThat(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),'invalid-email');
  const r=await env.DB.prepare('DELETE FROM waitlist WHERE email=? COLLATE NOCASE').bind(email).run();const deleted=(r.meta?.changes||0)>0;
  await record(env.DB,key.id,'POST','/waitlist/forget',200,deleted?'deleted':'not-found','email-sha256:'+(await digest(email)).slice(0,24)+'; '+reason);return json({deleted,reason})},
 async deleteWaitlistSignup({env,params}){requireThat(/^[a-zA-Z0-9-]{1,80}$/.test(params.id),'invalid-id');const r=await env.DB.prepare('DELETE FROM waitlist WHERE id=?').bind(params.id).run();return json({deleted:(r.meta?.changes||0)>0})},
 async listMemory({env,url}){const prefix=url.searchParams.get('prefix')||'';requireThat(prefix.length<=128,'invalid-prefix');const like=prefix.replace(/[\\%_]/g,c=>'\\'+c)+'%';
  return json({keys:(await env.DB.prepare("SELECT key,version,length(value) AS bytes,updated_by,updated_at FROM mw_agent_kv WHERE key LIKE ? ESCAPE '\\' ORDER BY key LIMIT ?").bind(like,KV_MAX_KEYS).all()).results})},
 async getMemory({env,params}){requireThat(KV_KEY_PATTERN.test(params.key),'invalid-key-name');const row=await env.DB.prepare('SELECT * FROM mw_agent_kv WHERE key=?').bind(params.key).first();requireThat(row,'not-found',404);
  return json({key:row.key,value:JSON.parse(row.value),version:row.version,updatedBy:row.updated_by,updatedAt:row.updated_at},200,{ETag:'"'+row.version+'"'})},
 async putMemory({request,env,params,key}){requireThat(KV_KEY_PATTERN.test(params.key),'invalid-key-name');const {value}=await readJson(request,KV_MAX_BYTES);requireThat(value!==undefined,'invalid-json');const stored=JSON.stringify(value);requireThat(stored.length<=KV_MAX_BYTES,'body-too-large',413);
  const ifMatch=request.headers.get('If-Match');requireThat(ifMatch===null||/^"?\d{1,9}"?$/.test(ifMatch),'invalid-if-match');const expected=ifMatch===null?null:Number(ifMatch.replace(/"/g,''));const db=env.DB,by=key.id;
  const existing=await db.prepare('SELECT version FROM mw_agent_kv WHERE key=?').bind(params.key).first();
  if(!existing){const total=(await db.prepare('SELECT COUNT(*) AS n FROM mw_agent_kv').first()).n;requireThat(total<KV_MAX_KEYS,'memory-full',507)}
  let row;
  if(expected===null)row=await db.prepare('INSERT INTO mw_agent_kv(key,value,version,updated_by) VALUES(?,?,1,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,version=mw_agent_kv.version+1,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP RETURNING version').bind(params.key,stored,by).first();
  else if(expected===0)row=await db.prepare('INSERT INTO mw_agent_kv(key,value,version,updated_by) VALUES(?,?,1,?) ON CONFLICT(key) DO NOTHING RETURNING version').bind(params.key,stored,by).first();
  else row=await db.prepare('UPDATE mw_agent_kv SET value=?,version=version+1,updated_by=?,updated_at=CURRENT_TIMESTAMP WHERE key=? AND version=? RETURNING version').bind(stored,by,params.key,expected).first();
  if(!row){const current=await db.prepare('SELECT version FROM mw_agent_kv WHERE key=?').bind(params.key).first();return json({error:'version-conflict',currentVersion:current?.version??0},409)}
  return json({key:params.key,version:row.version},existing?200:201,{ETag:'"'+row.version+'"'})},
 async deleteMemory({env,params}){requireThat(KV_KEY_PATTERN.test(params.key),'invalid-key-name');const r=await env.DB.prepare('DELETE FROM mw_agent_kv WHERE key=?').bind(params.key).run();return json({deleted:(r.meta?.changes||0)>0})},
};
async function strengthProxy({request,env,url,route,key,deps}){
 requireThat(env.RANKING_ENABLED==='true','ranking-unavailable',503);
 const sub=route.slice('/strength'.length)||'/';requireThat(!/^\/native-/.test(sub),'not-found',404);   // browser hand-off routes make no sense for keys
 const principal=await principalOf(key,env);requireThat(principal,'no-linked-principal',403);
 const headers=new Headers();for(const [k,v] of request.headers)if(!['authorization','cookie','cf-access-jwt-assertion','cf-access-token','origin','host'].includes(k.toLowerCase()))headers.set(k,v);headers.set('Origin',url.origin);
 const init={method:request.method,headers};if(!['GET','HEAD'].includes(request.method)){init.body=request.body;init.duplex='half'}
 const inner=new Request(url.origin+'/api/strength'+sub+url.search,init);
 return handleStrength({request:inner,env},{...deps,authenticate:async()=>({...principal,token:null})});
}

export async function handleAgent({request,env},deps={}){
 const url=new URL(request.url),route=url.pathname.slice('/api/agent'.length)||'/',method=request.method;
 if(!agentEnabled(env))return json({error:'agent-api-disabled'},404);
 if(route==='/'&&method==='GET')return json({service:'MONTE WO Agent API',version:AGENT_API_VERSION,openapi:'/api/agent/openapi.json',tools:'/api/agent/tools',authentication:'Authorization: Bearer mwa_<id>_<secret> (issued by the operator with scripts/agent-key.mjs)',scopes:SCOPES});
 if(route==='/openapi.json'&&method==='GET')return json(openapi(url.origin),200,{'Cache-Control':'public, max-age=300'});
 if(route==='/tools'&&method==='GET')return json({version:AGENT_API_VERSION,tools:toolManifest()},200,{'Cache-Control':'public, max-age=300'});
 const db=env.DB;let key=null,rate=null;
 try{
  key=await authenticateKey(request,env);rate=await rateLimit(db,key,env);
  const rateHeaders={'X-RateLimit-Limit':String(rate.limit),'X-RateLimit-Remaining':String(rate.remaining),'X-RateLimit-Reset':rate.resetAt};
  if(rate.exceeded){await record(db,key.id,method,route,429,'denied','rate-limit');return json({error:'rate-limit',retryAt:rate.resetAt},429,{...rateHeaders,'Retry-After':String(Math.ceil((Date.parse(rate.resetAt)-Date.now())/1000))})}
  requireThat(route!=='/strength'&&!route.startsWith('/strength/')||hasScope(key,'strength'),'insufficient-scope',403);
  let res;
  if(route==='/strength'||route.startsWith('/strength/'))res=await strengthProxy({request,env,url,route,key,deps});
  else{const m=matchOperation(route,method);if(m.status===405)return new Response(null,{status:405,headers:{Allow:m.allow.join(', '),...rateHeaders}});requireThat(m.op,'not-found',404);requireThat(hasScope(key,m.op.scope),'insufficient-scope',403);
   res=await handlers[m.op.id]({request,env,url,route,key,rate,params:m.params,deps})}
  await record(db,key.id,method,route,res.status,res.status<400?'ok':'denied',res.status<400?'':'see response');
  const out=new Response(res.body,res);for(const [k,v] of Object.entries(rateHeaders))out.headers.set(k,v);return out;
 }catch(e){
  const err=e instanceof StrengthError?e:new StrengthError('internal-error',500);
  // Audit denials for authenticated keys and for known-but-unusable keys; anonymous garbage is not written to storage (no fill-up vector).
  const known=key?.id||(['key-revoked','key-expired','ip-not-allowed'].includes(err.code)?parseKey(request.headers.get('Authorization'))?.id:null);
  if(known){try{await record(db,known,method,route,err.status,'denied',err.code)}catch{}}
  return json({error:err.code},err.status);
 }
}
