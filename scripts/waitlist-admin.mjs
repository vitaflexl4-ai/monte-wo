// Operator-only helper. This is not served as a website endpoint.
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createInterface} from 'node:readline/promises';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const input=process.argv[2];
if(!input||input==='--help'){console.log('Usage: npm run waitlist:remove -- verified-address@example.com\nRequires authenticated Wrangler, a configured production D1 DB, and independently verified deletion authorization.');process.exit(0)}
const email=input.trim().toLowerCase();
if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){console.error('A valid exact-match email address is required.');process.exit(1)}
const config=readFileSync(join(root,'wrangler.toml'),'utf8');
if(!/^\s*\[\[d1_databases\]\]/m.test(config)){console.error('Configure the production D1 binding in wrangler.toml first. The local test database will not be used.');process.exit(1)}
const rl=createInterface({input:process.stdin,output:process.stdout});
console.log(`Production deletion request for: ${email}\nVerify control of this address and the scope of the request before continuing. This will delete its active signup record, not provider backups or support emails.`);
const answer=await rl.question('Type DELETE VERIFIED SIGNUP to authorize the remote deletion: ');rl.close();
if(answer!=='DELETE VERIFIED SIGNUP'){console.log('Cancelled. No data changed.');process.exit(0)}
const dir=mkdtempSync(join(tmpdir(),'montewo-delete-'));
try{
 const file=join(dir,'request.sql');
 writeFileSync(file,`DELETE FROM waitlist WHERE email = '${email.replaceAll("'","''")}' RETURNING id;\n`,{mode:0o600});
 const result=spawnSync(process.platform==='win32'?'npx.cmd':'npx',['wrangler','d1','execute','monte-wo-waitlist','--remote','--file',file],{cwd:root,stdio:'inherit',shell:false});
 if(result.error)throw result.error;
 if(result.status!==0)process.exitCode=result.status||1;
 else console.log('D1 command completed. Review the returned row IDs; an empty result means no matching signup existed. Confirm completion to the verified requester after checking the result and any retention exceptions.');
}finally{rmSync(dir,{recursive:true,force:true})}
