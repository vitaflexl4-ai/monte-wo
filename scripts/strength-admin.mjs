// Operator-only principal provisioning. No remote operation without an explicit --remote.
import {execFileSync} from 'node:child_process';
const args=process.argv.slice(2),remote=args.includes('--remote');const get=k=>args[args.indexOf(k)+1];
if(!args.includes('--id')||!args.includes('--subject')||!args.includes('--role')||!args.includes('--reason'))throw Error('Usage: node scripts/strength-admin.mjs --id UUID --subject ACCESS_SUB --role athlete|reviewer|admin --reason "operator enrollment" [--database NAME --remote]');
const id=get('--id'),subject=get('--subject'),role=get('--role'),reason=get('--reason');
if(!/^[a-zA-Z0-9-]{1,80}$/.test(id)||!subject||subject.length>200||!['athlete','reviewer','admin'].includes(role)||!reason||reason.length>1000)throw Error('Invalid principal values');
const q=s=>"'"+s.replaceAll("'","''")+"'";
const sql=`INSERT INTO mw_principals(id,subject,role) VALUES(${q(id)},${q(subject)},${q(role)}); INSERT INTO mw_audit(id,actor_id,action,target,outcome,detail) VALUES(${q(crypto.randomUUID())},'system-draft-seed','operator-provision',${q(id)},'created',${q(reason)});`;
const command=['wrangler','d1','execute',remote?get('--database'):'montewo-local-tests',...(remote?['--remote']:['--local','--config','wrangler.local.toml']),'--command',sql];
if(remote&&(!args.includes('--database')||!get('--database')))throw Error('Explicit production database name required');
execFileSync('npx',command,{stdio:'inherit'});
