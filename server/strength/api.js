import {authenticate,role} from './auth.js';
import {nativeEnabled,isNativeOrigin,trustedOrigin,issueNativeCode,exchangeNativeCode} from '../native.js';
import {StrengthError,requireThat,text,exactKeys,validateProfile,validatePerformance,validateModel,evaluate,DISCIPLINES,bestDiscipline} from './engine.js';
const uid=()=>crypto.randomUUID(),json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Vary':'Cf-Access-Jwt-Assertion'}});
const stable=x=>Array.isArray(x)?'['+x.map(stable).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}':JSON.stringify(x);
export const digest=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',typeof bytes==='string'?new TextEncoder().encode(bytes):bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
async function bytes(request,limit){requireThat(Number(request.headers.get('Content-Length')||0)<=limit,'body-too-large',413);const reader=request.body?.getReader();requireThat(reader,'empty-body');const chunks=[];let n=0;while(true){const {done,value}=await reader.read();if(done)break;n+=value.length;if(n>limit){await reader.cancel();throw new StrengthError('body-too-large',413)}chunks.push(value)}const out=new Uint8Array(n);let offset=0;for(const c of chunks){out.set(c,offset);offset+=c.length}return out}
async function body(request){requireThat((request.headers.get('Content-Type')||'').split(';')[0]==='application/json','json-required',415);try{return JSON.parse(new TextDecoder().decode(await bytes(request,65536)))}catch(e){if(e instanceof StrengthError)throw e;throw new StrengthError('invalid-json')}}
function audit(db,actor,action,target,outcome,detail){return db.prepare('INSERT INTO mw_audit(id,actor_id,action,target,outcome,detail) VALUES(?,?,?,?,?,?)').bind(uid(),actor?.id||null,action,target,outcome,detail)}
const decodeRow=row=>row?{...row,data:JSON.parse(row.data)}:null;
async function profile(db,id){return decodeRow(await db.prepare('SELECT * FROM mw_profiles WHERE athlete_id=? ORDER BY seq DESC LIMIT 1').bind(id).first())}
async function config(db,discipline){
 const m=await db.prepare("SELECT m.* FROM mw_models m JOIN mw_publications p ON p.version_id=m.id AND p.kind='model' WHERE m.discipline=? ORDER BY p.seq DESC LIMIT 1").bind(discipline).first();
 const model=decodeRow(m||await db.prepare('SELECT * FROM mw_models WHERE id=?').bind(discipline+'-model-draft-1').first());requireThat(model,'model-unavailable',503);
 const rule=decodeRow(await db.prepare('SELECT * FROM mw_rulebooks WHERE id=?').bind(model.rulebook_id).first());requireThat(rule,'rulebook-unavailable',503);
 const approved=!!await db.prepare("SELECT seq FROM mw_publications WHERE kind='rulebook' AND version_id=?").bind(rule.id).first();return {model:model.data,rule:rule.data,modelApproved:!!m,ruleApproved:approved};
}
async function reviewHead(db,pid){return await db.prepare('SELECT * FROM mw_reviews WHERE performance_id=? ORDER BY revision DESC LIMIT 1').bind(pid).first()}
const proof=r=>r?{state:r.state==='pending'&&r.checks&&JSON.parse(r.checks).held?'flagged':r.state,rulebookId:r.rulebook_id,evidenceId:r.evidence_id,reviewerId:r.reviewer_id}:null;
function resultStatements(db,actor,p,profileId,c,kind,reason,review){let r=evaluate(p.data,{...c,athleteId:p.athlete_id,rulebookId:p.rulebook_id,review:proof(review)});r.reviewRevision=review?.revision||0;if(kind==='profile-scenario')r={...r,rankId:null,status:'scenario',progress:null,explanation:'Hypothetical eligibility with revised profile only. No rank awarded; historical performance unchanged.'};const id=uid();return {result:r,statements:[db.prepare('INSERT INTO mw_results(id,performance_id,athlete_id,profile_id,model_id,rulebook_id,kind,data,actor_id,reason) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id,p.id,p.athlete_id,profileId,c.model.id,c.rule.id,kind,JSON.stringify(r),actor.id,reason),db.prepare('INSERT INTO mw_rank_history(result_id,athlete_id,discipline,event) VALUES(?,?,?,?)').bind(id,p.athlete_id,p.discipline,kind)]}}
export async function handleStrength({request,env},deps={}){
 // Application data must not silently fall back into the waitlist DB.
 env={...env,DB:(env.APP_DB&&env.APP_DB!==env.DB?env.APP_DB:undefined)||(env.RANKING_LEGACY_DB_ENABLED==='true'?env.DB:undefined)};
 const url=new URL(request.url),route=url.pathname.slice('/api/strength'.length)||'/';const db=env.DB;let actor;
 if(route==='/catalog'&&request.method==='GET'){if(env.RANKING_ENABLED!=='true'||!db)return json({available:false,disciplines:[]});try{return json({available:true,disciplines:await Promise.all(DISCIPLINES.map(d=>config(db,d)))})}catch{return json({available:false,disciplines:[]},503)}}
 if(route==='/config'&&request.method==='GET')return json({available:env.RANKING_ENABLED==='true'&&!!db&&!!env.RANKING_ACCESS_ISSUER&&!!env.RANKING_ACCESS_AUD,authentication:'Cloudflare Access with server-provisioned roles',officialStandards:'Consult methodology versions. Bundled launch standards are DRAFT — NOT OFFICIAL.'});
 if(route==='/native-token'){
  if(!nativeEnabled(env)||!db)return json({error:'native-clients-disabled'},404);
  if(request.method!=='POST')return new Response(null,{status:405,headers:{Allow:'POST'}});
  if(!isNativeOrigin(env,request.headers.get('Origin')))return json({error:'origin-rejected'},403);
  try{const b=await body(request);exactKeys(b,['code','verifier']);const {subject,token}=await exchangeNativeCode(db,b.code,b.verifier);
   const who=await db.prepare('SELECT id FROM mw_principals WHERE subject=?').bind(subject).first();await audit(db,who,'native-token-exchanged','/native-token','ok','single-use code redeemed').run();
   const exp=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)))).exp;
   return json({token,expiresAt:exp,header:'cf-access-token'});
  }catch(e){return json({error:e instanceof StrengthError?e.code:'invalid-code'},e instanceof StrengthError?e.status:400)}
 }
 try{
  const principal=await (deps.authenticate||authenticate)(request,env,deps.fetcher||fetch);actor={id:principal.id,role:principal.role};  // subject/token never echoed in responses; deps.authenticate = Agent API acting as a linked principal (server/agent.js)
  if(route==='/native-login'&&request.method==='GET'){
   // Reached through the system browser behind Cloudflare Access: hand a single-use code (never the token) back to the app.
   if(!nativeEnabled(env))return json({error:'native-clients-disabled'},404);
   const issued=await issueNativeCode(db,principal,principal.token,url.searchParams.get('state'),url.searchParams.get('challenge'));
   await audit(db,actor,'native-login-code-issued','/native-login','ok','expires '+issued.expiresAt).run();
   const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
   const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Return to MONTE WO</title><style>body{font:16px/1.5 system-ui,sans-serif;background:#090c13;color:#f4f6fb;margin:0;display:grid;place-items:center;min-height:100vh;padding:24px;box-sizing:border-box}a.button{display:inline-block;padding:14px 22px;border-radius:12px;background:#f0b429;color:#090c13;font-weight:700;text-decoration:none}main{max-width:420px;text-align:center}small{opacity:.7}</style></head><body><main><h1>Signed in</h1><p>Return to the MONTE WO app to finish signing in. This link works once and expires in 2 minutes.</p><p><a class="button" href="${esc(issued.returnUrl)}">Open MONTE WO</a></p><small>If nothing happens, open the app manually and tap Sign in again.</small></main><script>location.replace(${JSON.stringify(issued.returnUrl)})</script></body></html>`;
   return new Response(html,{status:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
  }
  requireThat(['GET','POST'].includes(request.method),'method-not-allowed',405);
  if(request.method==='POST')requireThat(trustedOrigin(request,env,url),'origin-rejected',403);
  const window=Math.floor(Date.now()/3600000);const limit=await db.prepare('INSERT INTO mw_rate_limits(actor_id,window,attempts) VALUES(?,?,1) ON CONFLICT(actor_id) DO UPDATE SET window=excluded.window,attempts=CASE WHEN mw_rate_limits.window=excluded.window THEN mw_rate_limits.attempts+1 ELSE 1 END RETURNING attempts').bind(actor.id,window).first();requireThat(limit.attempts<=500,'rate-limit',429);
  if(/\/(rank|override|award)(\/|$)/.test(route)){await audit(db,actor,'manual-rank-denied',route,'denied','Ranks can only result from qualifying performance.').run();return json({error:'manual-rank-awards-forbidden'},403)}
  if(route==='/me'&&request.method==='GET'){
   const prof=await profile(db,actor.id),ps=(await db.prepare('SELECT * FROM mw_performances WHERE athlete_id=? ORDER BY seq DESC LIMIT 200').bind(actor.id).all()).results.map(decodeRow),rs=(await db.prepare('SELECT * FROM mw_results WHERE athlete_id=? ORDER BY seq DESC LIMIT 2000').bind(actor.id).all()).results.map(decodeRow);
   const reviews=(await db.prepare('SELECT r.* FROM mw_reviews r JOIN mw_performances p ON p.id=r.performance_id WHERE p.athlete_id=? ORDER BY r.seq DESC LIMIT 1000').bind(actor.id).all()).results;
   const cards=[];for(const d of DISCIPLINES){const c=await config(db,d),current=[];
    const latest=(await db.prepare(`SELECT r.* FROM mw_results r WHERE r.athlete_id=? AND r.model_id=? AND r.profile_id=? AND r.kind<>'profile-scenario' AND r.seq=(SELECT MAX(r2.seq) FROM mw_results r2 WHERE r2.performance_id=r.performance_id AND r2.model_id=r.model_id AND r2.profile_id=r.profile_id AND r2.kind<>'profile-scenario') AND COALESCE(json_extract(r.data,'$.reviewRevision'),0)=COALESCE((SELECT MAX(rv.revision) FROM mw_reviews rv WHERE rv.performance_id=r.performance_id),0) AND NOT EXISTS(SELECT 1 FROM mw_performances cp WHERE cp.correction_of=r.performance_id)`).bind(actor.id,c.model.id,prof?.id||'no-profile').all()).results.map(decodeRow);
    for(const r of latest)current.push({...r.data,performanceId:r.performance_id});cards.push({discipline:d,model:c.model,rulebook:c.rule,modelApproved:c.modelApproved,ruleApproved:c.ruleApproved,provisional:bestDiscipline(current,d,'provisional'),verified:bestDiscipline(current,d,'verified'),latestAssessment:current.find(r=>r.discipline===d)||null,pending:current.find(r=>r.discipline===d&&r.verificationRequired)||null})}
   return json({actor,profile:prof,disciplines:cards,performances:ps,results:rs,reviews:reviews.map(r=>({id:r.id,performanceId:r.performance_id,evidenceId:r.evidence_id,revision:r.revision,state:r.state,reason:r.reason,createdAt:r.created_at,rulebookId:r.rulebook_id})),policy:'Current cards use your current profile revision and active methodology. Historical achievements remain unchanged; profile scenarios never grant ranks.'});
  }
  if(route==='/profiles'&&request.method==='POST'){
   const b=await body(request);exactKeys(b,['profile','reason']);const data=validateProfile(b.profile),reason=text(b.reason,1000),id=uid(),statements=[db.prepare('INSERT INTO mw_profiles(id,athlete_id,data,reason) VALUES(?,?,?,?)').bind(id,actor.id,JSON.stringify(data),reason)];
   const ps=(await db.prepare('SELECT p.* FROM mw_performances p WHERE p.athlete_id=? AND p.seq=(SELECT MAX(p2.seq) FROM mw_performances p2 WHERE p2.athlete_id=p.athlete_id AND p2.discipline=p.discipline) ORDER BY p.seq DESC LIMIT 4').bind(actor.id).all()).results.map(decodeRow);
   for(const p of ps){const c=await config(db,p.discipline);const scenario={...p,data:{...p.data,bodyweight:data.bodyweight,bodyweightUnit:data.unit,sexCategory:data.sexCategory,ageYears:data.ageYears}};
    // Load and bodyweight units must stay consistent when constructing a profile scenario.
    // Explicit bodyweightUnit preserves exact conversion, even when the load uses different units.
    statements.push(...resultStatements(db,actor,scenario,id,c,'profile-scenario','Hypothetical eligibility with revised profile; not a new performance or awarded rank.',null).statements);
   }
   statements.push(audit(db,actor,'profile-revision',id,'saved',reason));await db.batch(statements);return json({id,scenarioOnly:true,message:'Profile revision saved. The latest performance per discipline was reassessed as a non-awarding scenario; historical performances are unchanged. New current-profile achievements require a qualifying submission.'},201);
  }
  if(route==='/performances'&&request.method==='POST'){
   const b=await body(request);requireThat(DISCIPLINES.includes(b.discipline),'invalid-discipline');const prof=await profile(db,actor.id);requireThat(prof,'profile-required',409);const c=await config(db,b.discipline);validatePerformance(b,c.rule,new Date().toISOString().slice(0,10));
   requireThat(b.bodyweight===prof.data.bodyweight&&(b.bodyweightUnit||b.unit)===prof.data.unit&&b.sexCategory===prof.data.sexCategory&&b.ageYears===prof.data.ageYears,'performance-profile-snapshot-mismatch');
   const count=await db.prepare('SELECT COUNT(*) AS n FROM mw_performances WHERE athlete_id=?').bind(actor.id).first();requireThat(count.n<200,'pilot-submission-cap',409);
   if(b.correctionOf){const old=await db.prepare('SELECT id FROM mw_performances WHERE id=? AND athlete_id=? AND discipline=?').bind(b.correctionOf,actor.id,b.discipline).first();requireThat(old,'invalid-correction',403)}
   const id=uid(),p={id,athlete_id:actor.id,profile_id:prof.id,rulebook_id:c.rule.id,discipline:b.discipline,data:b};const calc=resultStatements(db,actor,p,prof.id,c,'submission',b.correctionOf?'Replacement of '+b.correctionOf:'New self-reported performance',null);
   await db.batch([db.prepare('INSERT INTO mw_performances(id,athlete_id,profile_id,discipline,rulebook_id,data,correction_of) VALUES(?,?,?,?,?,?,?)').bind(id,actor.id,prof.id,b.discipline,c.rule.id,JSON.stringify(b),b.correctionOf||null),...calc.statements,audit(db,actor,'performance-submitted',id,'saved',calc.result.status)]);return json({id,result:calc.result},201);
  }
  if(route==='/recalculate'&&request.method==='POST'){
   const b=await body(request);exactKeys(b,['performanceId','reason']);const p=decodeRow(await db.prepare('SELECT * FROM mw_performances WHERE id=? AND athlete_id=?').bind(text(b.performanceId,80),actor.id).first());requireThat(p,'not-found',404);const reason=text(b.reason,1000),c=await config(db,p.discipline),r=await reviewHead(db,p.id),calc=resultStatements(db,actor,p,p.profile_id,c,'reassessment',reason,r);await db.batch([...calc.statements,audit(db,actor,'explicit-reassessment',p.id,'saved',reason)]);return json(calc.result);
  }
  const upload=route.match(/^\/performances\/([a-zA-Z0-9_-]+)\/evidence$/);
  if(upload&&request.method==='POST'){
   requireThat(env.RANKING_EVIDENCE,'private-evidence-storage-unavailable',503);const p=decodeRow(await db.prepare('SELECT * FROM mw_performances WHERE id=? AND athlete_id=?').bind(upload[1],actor.id).first());requireThat(p,'not-found',404);requireThat(request.headers.get('Content-Type')==='video/mp4','mp4-required',415);
   const raw=await bytes(request,20971520);requireThat(raw.length>=16&&new TextDecoder().decode(raw.slice(4,8))==='ftyp','invalid-mp4-header');
   const id=uid(),key='private/'+actor.id+'/'+id+'.mp4',head=await reviewHead(db,p.id);await env.RANKING_EVIDENCE.put(key,raw,{httpMetadata:{contentType:'video/mp4'}});
   const hold=!!head&&['rejected','flagged'].includes(proof(head).state);const pendingChecks=JSON.stringify({held:hold});const r={state:'pending',revision:(head?.revision||0)+1,checks:pendingChecks,rulebook_id:p.rulebook_id,evidence_id:id,reviewer_id:actor.id};const c=await config(db,p.discipline),calc=resultStatements(db,actor,p,p.profile_id,c,'review','New evidence awaits review; no verification inherited.',r);
   try{await db.batch([db.prepare('INSERT INTO mw_evidence(id,performance_id,athlete_id,object_key,sha256,bytes,mime) VALUES(?,?,?,?,?,?,?)').bind(id,p.id,actor.id,key,await digest(raw),raw.length,'video/mp4'),db.prepare('INSERT INTO mw_reviews(id,performance_id,evidence_id,reviewer_id,rulebook_id,state,expected_revision,revision,checks,reason) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(uid(),p.id,id,actor.id,p.rulebook_id,'pending',head?.revision||0,(head?.revision||0)+1,pendingChecks,'Athlete supplied new evidence; any rejection hold requires a reviewer to resolve.'),...calc.statements,audit(db,actor,'evidence-uploaded',id,'pending','Private MP4; awaiting review.')])}catch(e){await env.RANKING_EVIDENCE.delete(key);throw e}return json({id,state:'pending'},201);
  }
  const evidence=route.match(/^\/evidence\/([a-zA-Z0-9_-]+)$/);
  if(evidence&&request.method==='GET'){
   const e=await db.prepare('SELECT * FROM mw_evidence WHERE id=?').bind(evidence[1]).first();requireThat(e&&(e.athlete_id===actor.id||['reviewer','admin'].includes(actor.role)),'not-found',404);requireThat(env.RANKING_EVIDENCE,'private-evidence-storage-unavailable',503);const obj=await env.RANKING_EVIDENCE.get(e.object_key);requireThat(obj,'evidence-unavailable',404);await audit(db,actor,'evidence-access',e.id,'allowed','Private evidence viewed.').run();return new Response(obj.body,{headers:{'Content-Type':'video/mp4','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline; filename="performance-evidence.mp4"','Cross-Origin-Resource-Policy':'same-origin'}});
  }
  if(route==='/reviews'&&request.method==='POST'){
   role(actor,['reviewer','admin']);const b=await body(request);exactKeys(b,['performanceId','evidenceId','expectedRevision','state','checks','reason']);requireThat(['approved','rejected','flagged'].includes(b.state),'invalid-review-state');requireThat(Number.isInteger(b.expectedRevision)&&b.expectedRevision>=1,'review-revision-required');
   const p=decodeRow(await db.prepare('SELECT * FROM mw_performances WHERE id=?').bind(text(b.performanceId,80)).first());requireThat(p,'not-found',404);requireThat(b.state!=='approved'||actor.id!==p.athlete_id,'self-approval-forbidden',403);const head=await reviewHead(db,p.id);requireThat(head&&head.revision===b.expectedRevision&&head.evidence_id===b.evidenceId,'stale-review-or-evidence',409);
   const rule=decodeRow(await db.prepare('SELECT * FROM mw_rulebooks WHERE id=?').bind(p.rulebook_id).first());const checkKeys=[...rule.data.checks.map(c=>c.id),'identity','date','load','bodyweight','continuousVideo'];exactKeys(b.checks,checkKeys);if(b.state==='approved'){requireThat(checkKeys.every(k=>b.checks[k]===true),'review-checks-incomplete');requireThat(!!await db.prepare("SELECT seq FROM mw_publications WHERE kind='rulebook' AND version_id=?").bind(p.rulebook_id).first(),'draft-rulebook',409)}
   const reason=text(b.reason,1000);const c=await config(db,p.discipline),r={state:b.state,revision:b.expectedRevision+1,rulebook_id:p.rulebook_id,evidence_id:b.evidenceId,reviewer_id:actor.id},calc=resultStatements(db,actor,p,p.profile_id,c,'review',reason,r);
   await db.batch([db.prepare('INSERT INTO mw_reviews(id,performance_id,evidence_id,reviewer_id,rulebook_id,state,expected_revision,revision,checks,reason) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(uid(),p.id,b.evidenceId,actor.id,p.rulebook_id,b.state,b.expectedRevision,b.expectedRevision+1,JSON.stringify(b.checks),reason),...calc.statements,audit(db,actor,'evidence-'+b.state,p.id,b.state,reason)]);return json({revision:b.expectedRevision+1,result:calc.result});
  }
  if(route==='/admin/queue'&&request.method==='GET'){
   role(actor,['reviewer','admin']);const rows=(await db.prepare('SELECT r.*,p.athlete_id,p.discipline,p.data AS performance, rb.data AS rulebook FROM mw_reviews r JOIN mw_performances p ON p.id=r.performance_id JOIN mw_rulebooks rb ON rb.id=p.rulebook_id WHERE r.revision=(SELECT MAX(r2.revision) FROM mw_reviews r2 WHERE r2.performance_id=r.performance_id) ORDER BY r.seq DESC LIMIT 200').all()).results;return json(rows);
  }
  if(route==='/admin/standards'&&request.method==='GET'){
   role(actor,['admin']);return json({models:(await db.prepare('SELECT * FROM mw_models').all()).results.map(decodeRow),rulebooks:(await db.prepare('SELECT * FROM mw_rulebooks').all()).results.map(decodeRow),publications:(await db.prepare('SELECT * FROM mw_publications ORDER BY seq').all()).results});
  }
  if(route==='/admin/audit'&&request.method==='GET'){role(actor,['admin']);return json((await db.prepare('SELECT * FROM mw_audit ORDER BY seq DESC LIMIT 500').all()).results)}
  if(['/admin/models','/admin/rulebooks'].includes(route)&&request.method==='POST'){
   role(actor,['admin']);const b=await body(request);exactKeys(b,['document','reason']);const m=b.document;requireThat(m&&/^[a-z0-9][a-z0-9-]{2,79}$/.test(m.id)&&DISCIPLINES.includes(m.discipline),'invalid-version');const reason=text(b.reason,1000);const raw=stable(m),hash=await digest(raw);let statement;
   if(route.endsWith('models')){validateModel(m);requireThat(m.status==='draft','new-version-must-be-draft');const r=await db.prepare('SELECT discipline FROM mw_rulebooks WHERE id=?').bind(text(m.rulebookId,80)).first();requireThat(r?.discipline===m.discipline,'rulebook-mismatch');statement=db.prepare('INSERT INTO mw_models(id,discipline,rulebook_id,data,digest,author_id) VALUES(?,?,?,?,?,?)').bind(m.id,m.discipline,m.rulebookId,raw,hash,actor.id)}
   else{requireThat(m.status==='draft'&&Array.isArray(m.checks)&&m.checks.length>=3&&m.checks.length<=20&&new Set(m.checks.map(c=>c.id)).size===m.checks.length,'invalid-rulebook');for(const c of m.checks){requireThat(/^[a-z][a-zA-Z0-9]{1,39}$/.test(c.id),'invalid-check-id');text(c.text,4000)}text(m.variation,100);text(m.safety,4000);text(m.evidence,4000);requireThat(Array.isArray(m.equipment)&&m.equipment.length>0&&m.equipment.length<=10,'invalid-equipment');m.equipment.forEach(e=>text(e,100));statement=db.prepare('INSERT INTO mw_rulebooks(id,discipline,data,digest,author_id) VALUES(?,?,?,?,?)').bind(m.id,m.discipline,raw,hash,actor.id)}
   await db.batch([statement,audit(db,actor,'draft-version-created',m.id,'draft',reason)]);return json({id:m.id,digest:hash,status:'draft'},201);
  }
  const publish=route.match(/^\/admin\/(models|rulebooks)\/([a-z0-9-]+)\/publish$/);
  if(publish&&request.method==='POST'){
   role(actor,['admin']);const b=await body(request);exactKeys(b,['reason','digest']);const reason=text(b.reason,1000),kind=publish[1]==='models'?'model':'rulebook',table=kind==='model'?'mw_models':'mw_rulebooks';
   const row=decodeRow(await db.prepare('SELECT * FROM '+table+' WHERE id=?').bind(publish[2]).first());requireThat(row,'not-found',404);requireThat(row.author_id!==actor.id,'independent-publisher-required',403);requireThat(b.digest===row.digest,'version-digest-mismatch',409);
   requireThat(env.RANKING_PUBLISH_ENABLED==='true'&&(env.RANKING_APPROVED_DIGESTS||'').split(',').map(s=>s.trim()).includes(row.digest),'independent-release-approval-required',409);
   if(kind==='model'){validateModel(row.data,{complete:true});requireThat(!!await db.prepare("SELECT seq FROM mw_publications WHERE kind='rulebook' AND version_id=?").bind(row.rulebook_id).first(),'rulebook-approval-required',409)}
   await db.batch([db.prepare('INSERT INTO mw_publications(kind,version_id,actor_id,reason) VALUES(?,?,?,?)').bind(kind,row.id,actor.id,reason),audit(db,actor,'methodology-published',row.id,'approved',reason+' Historical records retained; explicit reassessment required.')]);return json({id:row.id,status:'approved',historyPolicy:'No historical results rewritten. Explicit reassessment creates a new result.'});
  }
  throw new StrengthError('not-found',404);
 }catch(e){
  let status=e instanceof StrengthError?e.status:503,code=e instanceof StrengthError?e.code:'storage-or-service-unavailable';if(String(e.message).includes('stale-review')){status=409;code='stale-review'}
  if(String(e.message).includes('UNIQUE constraint')){status=409;code='record-already-exists'}
  if(actor&&db){try{await audit(db,actor,'request-rejected',route,'denied',code).run()}catch{return json({error:'audit-storage-unavailable'},503)}}
  return json({error:code},status);
 }
}
