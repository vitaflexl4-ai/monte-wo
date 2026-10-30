// Operator-only Agent API key management. The plaintext key is printed ONCE to the terminal and never written anywhere;
// only its SHA-256 hash reaches the database. No remote operation without explicit database names.
//
//   node scripts/agent-key.mjs create --name "ULTRON" --scopes "status:read,kv:read,kv:write" [--role athlete|reviewer|admin] [--principal ID]
//                                     [--expires 2027-01-01T00:00:00Z] [--ips 203.0.113.4,203.0.113.5] [--note "…"]
//                                     [--remote --database AGENT_DB_NAME [--app-database APP_DB_NAME]] [--sql-only]
//   node scripts/agent-key.mjs revoke --id KEYID [--remote --database AGENT_DB_NAME] [--sql-only]
//   node scripts/agent-key.mjs list [--remote --database AGENT_DB_NAME]
//
// Two databases are involved (see server/agent.js):
//   * AGENT_DB  (--database)     — mw_agent_keys / mw_agent_audit            (migrations/0008_agent_api.sql)
//   * APP_DB    (--app-database) — mw_principals / mw_audit, only when --role creates a dedicated principal `agent:<keyid>`
//     for the strength:* scopes; --principal links an existing provisioned principal instead (nothing written to APP_DB).
// Scopes: see SCOPES in server/agent.js. "*" (all scopes) is deliberately NOT a default — it requires --confirm-wildcard.
// Without --remote the statements run against the local test database (wrangler.local.toml); --sql-only prints them.
import {execFileSync} from 'node:child_process';
import {createHash,randomBytes} from 'node:crypto';
import {SCOPES} from '../server/agent.js';

const args=process.argv.slice(2),cmd=args[0];const has=k=>args.includes(k);const get=k=>{const i=args.indexOf(k);return i>=0?args[i+1]:undefined};
const q=s=>"'"+String(s).replaceAll("'","''")+"'";
const remote=has('--remote');if(remote&&!get('--database'))throw Error('Explicit production database name required: --remote --database AGENT_DB_NAME');
const LOCAL='montewo-local-tests';
function run(target,sql){   // target: 'AGENT_DB' | 'APP_DB'
 if(has('--sql-only')){console.log('-- target: '+target+(remote?' ('+(target==='APP_DB'?get('--app-database'):get('--database'))+')':' (local '+LOCAL+')'));console.log(sql);return}
 const name=remote?(target==='APP_DB'?get('--app-database'):get('--database')):LOCAL;
 const command=['wrangler','d1','execute',name,...(remote?['--remote']:['--local','--config','wrangler.local.toml']),'--command',sql];
 execFileSync('npx',command,{stdio:'inherit'});
}
if(cmd==='create'){
 const name=get('--name'),scopesArg=get('--scopes'),role=get('--role'),principalArg=get('--principal'),expires=get('--expires'),ips=get('--ips'),note=get('--note')||'';
 if(!name||name.length>80)throw Error('--name (≤ 80 chars) is required');
 const scopes=(scopesArg||'').split(',').map(s=>s.trim()).filter(Boolean);
 if(!scopes.length||scopes.some(s=>!(s in SCOPES)))throw Error('--scopes must list known scopes: '+Object.keys(SCOPES).join(', '));
 if(scopes.includes('*')&&!has('--confirm-wildcard'))throw Error('Wildcard scope "*" is not issued by default (least privilege). List the scopes the agent needs, or add --confirm-wildcard deliberately.');
 if(role&&!['athlete','reviewer','admin'].includes(role))throw Error('--role must be athlete, reviewer or admin');
 if(role&&principalArg)throw Error('Use either --role (new dedicated principal) or --principal (existing one)');
 if(role&&remote&&!get('--app-database'))throw Error('--role writes a principal into the Strength database: add --app-database APP_DB_NAME (or use --principal for an existing one)');
 if(expires&&isNaN(Date.parse(expires)))throw Error('--expires must be an ISO date-time');
 const ipList=ips?ips.split(',').map(s=>s.trim()).filter(Boolean):null;if(ipList&&ipList.some(ip=>!/^[0-9a-fA-F.:]{3,45}$/.test(ip)))throw Error('--ips must be a comma-separated list of IP addresses');
 const strength=scopes.some(s=>s==='*'||s.startsWith('strength'));
 if(strength&&!role&&!principalArg)console.error('note: the strength scopes only work with a linked principal (--role or --principal).');
 if(role&&role!=='athlete')console.error('note: a '+role+' principal only acts through the Agent API when AGENT_STRENGTH_PRIVILEGED_ENABLED=true is set server-side.');
 const id=randomBytes(8).toString('hex'),secret=randomBytes(32).toString('base64url'),key=`mwa_${id}_${secret}`,hash=createHash('sha256').update(secret).digest('hex');
 const principalId=role?`agent-${id}`:principalArg||null;
 if(role)run('APP_DB',[`INSERT INTO mw_principals(id,subject,role) VALUES(${q(principalId)},${q('agent:'+id)},${q(role)});`,`INSERT INTO mw_audit(id,actor_id,action,target,outcome,detail) VALUES(${q(crypto.randomUUID())},'system-draft-seed','operator-provision',${q(principalId)},'created',${q('agent principal for key '+id+' ('+name+')')});`].join(' '));
 run('AGENT_DB',[`INSERT INTO mw_agent_keys(id,name,secret_hash,scopes,principal_id,allowed_ips,note,expires_at) VALUES(${q(id)},${q(name)},${q(hash)},${q(JSON.stringify(scopes))},${principalId?q(principalId):'NULL'},${ipList?q(JSON.stringify(ipList)):'NULL'},${q(note)},${expires?q(new Date(expires).toISOString()):'NULL'});`,
  `INSERT INTO mw_agent_audit(id,key_id,method,route,status,outcome,detail) VALUES(${q(crypto.randomUUID())},${q(id)},'CLI','key-created',200,'ok',${q('scopes '+scopes.join(' ')+(principalId?' principal '+principalId:'')+(ipList?' ips '+ipList.length:'')+(expires?' expires '+new Date(expires).toISOString():' no-expiry'))});`].join(' '));
 console.log('\nAgent key for "'+name+'" (shown once — store it in the agent\'s secret manager, never in Git, chat logs or client code):\n\n  '+key+'\n\n  key id: '+id+'   scopes: '+scopes.join(', ')+(principalId?'   principal: '+principalId+(role?' ('+role+')':''):'')+(expires?'   expires: '+new Date(expires).toISOString():'   expires: never (consider --expires)')+'\n  usage:  curl -H "Authorization: Bearer '+key.slice(0,21)+'…" https://<origin>/api/agent/whoami\n');
}else if(cmd==='revoke'){
 const id=get('--id');if(!/^[a-f0-9]{16}$/.test(id||''))throw Error('--id KEYID (16 hex chars) is required');
 run('AGENT_DB',`UPDATE mw_agent_keys SET status='revoked',revoked_at=CURRENT_TIMESTAMP WHERE id=${q(id)}; INSERT INTO mw_agent_audit(id,key_id,method,route,status,outcome,detail) VALUES(${q(crypto.randomUUID())},${q(id)},'CLI','key-revoked',200,'ok','revoked by operator');`);
}else if(cmd==='list'){
 run('AGENT_DB',"SELECT id,name,scopes,principal_id,status,created_at,expires_at,revoked_at FROM mw_agent_keys ORDER BY created_at");
}else{
 console.error('Usage: node scripts/agent-key.mjs create|revoke|list … (see header of this file)');process.exit(2);
}
