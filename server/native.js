// Native (Capacitor) client support for the shared API. EVERYTHING here is inert unless the
// Pages variable NATIVE_CLIENTS_ENABLED is exactly "true" (default: unset → web-only behaviour,
// byte-for-byte the previous same-origin policy).
//
// Why this exists: the Android/iOS shells load the bundled web app from a local origin
// (https://localhost on Android, capacitor://localhost on iOS). The API's POST handlers require a
// trusted Origin and the Strength Index relies on Cloudflare Access; neither works from a WebView
// origin without the explicit allow-list below. No cookies are ever used cross-origin: the native
// client authenticates with the Access JWT in a header (see auth.js) and CORS responses never set
// Access-Control-Allow-Credentials.
//
// Sign-in handoff (RFC 8252 style, code + PKCE, see api.js):
//   1. app opens  GET {apiOrigin}/api/strength/native-login?state=S&challenge=C  in the SYSTEM browser
//      (route is protected by Cloudflare Access → user signs in; the Function receives the verified JWT)
//   2. the Function stores a single-use 120 s code bound to C and returns the app-scheme URL
//      com.vitaflex.montewo://auth?code=…&state=S (never the token)
//   3. the app POSTs {code, verifier}  to  /api/strength/native-token  (Access public exception,
//      native Origin required) and receives the Access JWT it then sends as `cf-access-token`.
import {StrengthError,requireThat} from './strength/engine.js';

export const NATIVE_ORIGINS=Object.freeze(['https://localhost','capacitor://localhost']);
export const NATIVE_APP_ID='com.vitaflex.montewo';
export const NATIVE_CODE_TTL_SECONDS=120;
export const nativeEnabled=env=>env?.NATIVE_CLIENTS_ENABLED==='true';
export const isNativeOrigin=(env,origin)=>nativeEnabled(env)&&typeof origin==='string'&&NATIVE_ORIGINS.includes(origin);
export function trustedOrigin(request,env,url){const origin=request.headers.get('Origin');return origin===url.origin||isNativeOrigin(env,origin)}

export function corsHeaders(request,env){
 const origin=request.headers.get('Origin');if(!isNativeOrigin(env,origin))return {};
 return {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization, cf-access-token','Access-Control-Max-Age':'600','Vary':'Origin'};
}
export function preflight(request,env){const h=corsHeaders(request,env);return new Response(null,Object.keys(h).length?{status:204,headers:h}:{status:403})}
export function withCors(response,request,env){
 const h=corsHeaders(request,env);if(!Object.keys(h).length)return response;
 const out=new Response(response.body,response);
 for(const [k,v] of Object.entries(h)){if(k==='Vary'){const prev=out.headers.get('Vary');out.headers.set('Vary',prev&&!/\bOrigin\b/.test(prev)?prev+', Origin':prev||'Origin')}else out.headers.set(k,v)}
 return out;
}

// Token extraction: Cloudflare Access injects Cf-Access-Jwt-Assertion after validating the cookie
// or the `cf-access-token` header at the edge. When native clients are enabled the same JWT is also
// accepted directly from `cf-access-token` / `Authorization: Bearer` (local development without the
// Access edge, and defence in depth); verification in auth.js is identical for every source.
export function bearerToken(request,env){
 const injected=request.headers.get('Cf-Access-Jwt-Assertion');if(injected)return injected;
 if(!nativeEnabled(env))return null;
 const direct=request.headers.get('cf-access-token');if(direct)return direct;
 const auth=request.headers.get('Authorization')||'';const m=/^Bearer\s+([A-Za-z0-9_.-]+)$/.exec(auth);return m?m[1]:null;
}

const b64url=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export const sha256url=async text=>b64url(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));
export const randomCode=()=>b64url(crypto.getRandomValues(new Uint8Array(32)));
export const validState=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{8,128}$/.test(s);
export const validChallenge=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{43}$/.test(s);
export const validCode=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{43}$/.test(s);
export const validVerifier=s=>typeof s==='string'&&/^[A-Za-z0-9_.~-]{43,128}$/.test(s);
export const appReturnUrl=(code,state)=>`${NATIVE_APP_ID}://auth?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;

// Issue a handoff code for an already-authenticated principal (called behind authenticate()).
export async function issueNativeCode(db,actor,token,state,challenge){
 requireThat(validState(state)&&validChallenge(challenge),'invalid-native-login-request');
 const code=randomCode(),expires=Math.floor(Date.now()/1000)+NATIVE_CODE_TTL_SECONDS;
 await db.prepare('DELETE FROM mw_native_auth_codes WHERE expires_at<?').bind(Math.floor(Date.now()/1000)).run();
 await db.prepare('INSERT INTO mw_native_auth_codes(code_hash,subject,challenge,token,expires_at) VALUES(?,?,?,?,?)').bind(await sha256url(code),actor.subject,challenge,token,expires).run();
 return {code,expiresAt:expires,returnUrl:appReturnUrl(code,state)};
}

// Exchange a code + PKCE verifier for the stored token. Single use, time-boxed, generic errors.
export async function exchangeNativeCode(db,code,verifier){
 requireThat(validCode(code)&&validVerifier(verifier),'invalid-code',400);
 const hash=await sha256url(code);const row=await db.prepare('SELECT subject,challenge,token,expires_at FROM mw_native_auth_codes WHERE code_hash=?').bind(hash).first();
 await db.prepare('DELETE FROM mw_native_auth_codes WHERE code_hash=?').bind(hash).run();  // consumed on first attempt, valid or not
 const now=Math.floor(Date.now()/1000);
 if(!row||row.expires_at<=now||row.challenge!==await sha256url(verifier))throw new StrengthError('invalid-code',400);
 return {subject:row.subject,token:row.token};
}
