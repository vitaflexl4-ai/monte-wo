// Operator-only Agent API key management. The plaintext key is printed ONCE to the terminal and never written anywhere;
// only its SHA-256 hash reaches the database. No remote operation without an explicit --remote --database NAME.
//
//   node scripts/agent-key.mjs create --name "Ops agent A" --scopes "*" [--role admin|reviewer|athlete] [--principal ID]
//                                     [--expires 2027-01-01T00:00:00Z] [--ips 203.0.113.4,203.0.113.5] [--note "…"]
//                                     [--remote --database NAME] [--sql-only]
//   node scripts/agent-key.mjs revoke --id KEYID [--remote --database NAME] [--sql-only]
//   node scripts/agent-key.mjs list [--remote --database NAME]
//
// --role creates a dedicated principal `agent:<keyid>` with that role (needed for the `strength` scope); --principal links an
// existing provisioned principal instead. Scopes: see SCOPES in server/agent.js ("*" = all — the operator's "full access").
import {execFileSync} from 'node:child_process';
import {createHash,randomBytes} from 'node:crypto';
import {SCOPES} from '../server/agent.js';

const args=process.argv.slice(2),cmd=args[0];const has=k=>args.includes(k);const get=k=>{const i=args.indexOf(k);return i>=0?args[i+1]:undefined};
const q=s=>"'"+String(s).replaceAll("'","''")+"'";
const remote=has('--remote');if(remote&&!get('--database'))throw Error('Explicit production database name required: --remote --database NAME');
function run(sql){
 if(has('--sql-only')){console.log(sql);return}
 const command=['wrangler','d1','execute',remote?get('--database'):'montewo-local-tests',...(remote?['--remote']:['--local','--config','wrangler.local.toml']),'--command',sql];
 execFileSync('npx',command,{stdio:'inherit'});
}
if(cmd==='create'){
 const name=get('--name'),scopesArg=get('--scopes'),role=get('--role'),principalArg=get('--principal'),expires=get('--expires'),ips=get('--ips'),note=get('--note')||'';
 if(!name||name.length>80)throw Error('--name (≤ 80 chars) is required');
 const scopes=(scopesArg||'').split(',').map(s=>s.trim()).filter(Boolean);
 if(!scopes.length||scopes.some(s=>!(s in SCOPES)))throw Error('--scopes must list known scopes: '+Object.keys(SCOPES).join(', '));
 if(role&&!['athlete','reviewer','admin'].includes(role))throw Error('--role must be athlete, reviewer or admin');
 if(role&&principalArg)throw Error('Use either --role (new dedicated principal) or --principal (existing one)');
 if(expires&&isNaN(Date.parse(expires)))throw Error('--expires must be an ISO date-time');
 const ipList=ips?ips.split(',').map(s=>s.trim()).filter(Boolean):null;if(ipList&&ipList.some(ip=>!/^[0-9a-fA-F.:]{3,45}$/.test(ip)))throw Error('--ips must be a comma-separated list of IP addresses');
 if((scopes.includes('strength')||scopes.includes('*'))&&!role&&!principalArg)console.error('note: the strength scope only works with a linked principal (--role or --principal).');
 const id=randomBytes(8).toString('hex'),secret=randomBytes(32).toString('base64url'),key=`mwa_${id}_${secret}`,hash=createHash('sha256').update(secret).digest('hex');
 const principalId=role?`agent-${id}`:principalArg||null;
 const statements=[];
 if(role)statements.push(`INSERT INTO mw_principals(id,subject,role) VALUES(${q(principalId)},${q('agent:'+id)},${q(role)});`,`INSERT INTO mw_audit(id,actor_id,action,target,outcome,detail) VALUES(${q(crypto.randomUUID())},'system-draft-seed','operator-provision',${q(principalId)},'created',${q('agent principal for key '+id+' ('+name+')')});`);
 statements.push(`INSERT INTO mw_agent_keys(id,name,secret_hash,scopes,principal_id,allowed_ips,note,expires_at) VALUES(${q(id)},${q(name)},${q(hash)},${q(JSON.stringify(scopes))},${principalId?q(principalId):'NULL'},${ipList?q(JSON.stringify(ipList)):'NULL'},${q(note)},${expires?q(new Date(expires).toISOString()):'NULL'});`);
 statements.push(`INSERT INTO mw_agent_audit(id,key_id,method,route,status,outcome,detail) VALUES(${q(crypto.randomUUID())},${q(id)},'CLI','key-created',200,'ok',${q('scopes '+scopes.join(' ')+(principalId?' principal '+principalId:''))});`);
 run(statements.join(' '));
 console.log('\nAgent key for "'+name+'" (shown once — store it in the agent\'s secret manager, never in Git, chat logs or client code):\n\n  '+key+'\n\n  key id: '+id+'   scopes: '+scopes.join(', ')+(principalId?'   principal: '+principalId+(role?' ('+role+')':''):'')+(expires?'   expires: '+new Date(expires).toISOString():'')+'\n  usage:  curl -H "Authorization: Bearer '+key.slice(0,21)+'…" https://<origin>/api/agent/whoami\n');
}else if(cmd==='revoke'){
 const id=get('--id');if(!/^[a-f0-9]{16}$/.test(id||''))throw Error('--id KEYID (16 hex chars) is required');
 run(`UPDATE mw_agent_keys SET status='revoked',revoked_at=CURRENT_TIMESTAMP WHERE id=${q(id)}; INSERT INTO mw_agent_audit(id,key_id,method,route,status,outcome,detail) VALUES(${q(crypto.randomUUID())},${q(id)},'CLI','key-revoked',200,'ok','revoked by operator');`);
}else if(cmd==='list'){
 run("SELECT id,name,scopes,principal_id,status,created_at,expires_at,revoked_at FROM mw_agent_keys ORDER BY created_at");
}else{
 console.error('Usage: node scripts/agent-key.mjs create|revoke|list … (see header of this file)');process.exit(2);
}
