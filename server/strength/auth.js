import {StrengthError,requireThat} from './engine.js';
import {bearerToken} from '../native.js';
const decode=s=>{requireThat(typeof s==='string'&&/^[A-Za-z0-9_-]+$/.test(s),'invalid-token',401);return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))};
export async function authenticate(request,env,fetcher=fetch){
 requireThat(env.RANKING_ENABLED==='true'&&env.DB,'ranking-unavailable',503);
 requireThat(/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.RANKING_ACCESS_ISSUER||'')&&typeof env.RANKING_ACCESS_AUD==='string'&&env.RANKING_ACCESS_AUD.length>0,'identity-not-configured',503);
 const token=bearerToken(request,env);requireThat(token&&token.length<12000,'authentication-required',401);
 try{
  const parts=token.split('.');requireThat(parts.length===3,'invalid-token',401);const header=JSON.parse(new TextDecoder().decode(decode(parts[0]))),claim=JSON.parse(new TextDecoder().decode(decode(parts[1])));
  requireThat(header.alg==='RS256'&&typeof header.kid==='string'&&!header.jku&&!header.jwk,'invalid-token',401);
  const now=Math.floor(Date.now()/1000);requireThat(claim.iss===env.RANKING_ACCESS_ISSUER&&(Array.isArray(claim.aud)?claim.aud:[claim.aud]).includes(env.RANKING_ACCESS_AUD)&&Number.isInteger(claim.exp)&&claim.exp>now&&Number.isInteger(claim.iat)&&claim.iat<=now+30&&(!claim.nbf||claim.nbf<=now)&&typeof claim.sub==='string'&&claim.sub.length<=200,'invalid-token',401);
  const res=await fetcher(env.RANKING_ACCESS_ISSUER+'/cdn-cgi/access/certs',{signal:AbortSignal.timeout(5000),redirect:'error'});requireThat(res.ok,'identity-provider-unavailable',503);const keys=await res.json();const jwk=keys.keys?.find(k=>k.kid===header.kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256'));requireThat(jwk,'invalid-token',401);
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);requireThat(await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])),'invalid-token',401);
  const actor=await env.DB.prepare('SELECT id,role,subject FROM mw_principals WHERE subject=? AND active=1').bind(claim.sub).first();requireThat(actor,'account-not-provisioned',403);return {...actor,token};
 }catch(e){if(e instanceof StrengthError)throw e;throw new StrengthError('authentication-failed',401)}
}
export function role(actor,roles){requireThat(roles.includes(actor.role),'forbidden',403)}
