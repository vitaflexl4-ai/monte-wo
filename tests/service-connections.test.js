import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mobileConfigSupported,serviceReadiness,servicePaths} from '../shared/service-readiness.js';
const config={apiVersion:1,available:true,workoutSync:true,authentication:'Cloudflare Access pilot + PKCE',registration:'operator-enrolled pilot only'};
const ok=data=>({ok:true,status:200,data});
test('connection contract requires a supported mobile version and explicit booleans',()=>{
 assert.equal(mobileConfigSupported(config),true);
 for(const value of [null,{},[],{...config,apiVersion:2},{...config,available:'true'},{...config,workoutSync:undefined},{...config,registration:undefined}])assert.equal(mobileConfigSupported(value),false);
});
test('ready config never implies a signed-in account or proven synchronization',()=>{
 const result=serviceReadiness('mobile',ok(config));assert.equal(result.state,'ready');assert.match(result.label,/sign-in required/);assert.match(result.detail,/not a connected account or verified cross-device sync/);
});
test('missing routes, unsupported deployment and unavailable sync are distinguished',()=>{
 assert.equal(serviceReadiness('mobile',{status:404,ok:false}).state,'missing');
 assert.equal(serviceReadiness('mobile',ok({error:'Not implemented in this build'})).state,'missing');
 assert.equal(serviceReadiness('mobile',ok({...config,apiVersion:2})).state,'incompatible');
 assert.equal(serviceReadiness('mobile',ok({...config,workoutSync:false})).state,'disabled');
 assert.equal(serviceReadiness('mobile',ok({...config,available:false})).state,'disabled');
 assert.equal(serviceReadiness('mobile',ok(null)).state,'incompatible');
});
test('network, authorization and malformed availability fail closed',()=>{
 assert.equal(serviceReadiness('mobile',{unreachable:true}).state,'unknown');
 assert.equal(serviceReadiness('strength',{status:403,ok:false,data:{available:true}}).state,'blocked');
 assert.equal(serviceReadiness('strength',ok({available:'yes'})).state,'incompatible');
 assert.equal(serviceReadiness('strength',ok({available:false})).state,'disabled');
});
test('waitlist readiness is separate from athlete enrollment and local test storage',()=>{
 assert.equal(serviceReadiness('waitlist',ok({available:true,localTest:true})).state,'local');
 assert.equal(serviceReadiness('waitlist',ok({available:true,siteKey:null})).state,'incompatible');
 const result=serviceReadiness('waitlist',ok({available:true,siteKey:'public-test-sitekey',localTest:false}));assert.equal(result.state,'ready');assert.match(result.detail,/does not create an athlete account/);
});
test('website and native app use the exact same readiness contract',()=>{
 assert.equal(readFileSync('public/service-readiness.js','utf8'),readFileSync('shared/service-readiness.js','utf8'));
 const native=readFileSync('apps/mobile/src/api.ts','utf8');assert.match(native,/shared\/service-readiness.js/);assert.match(native,/mobileConfigSupported\(data\)/);assert.match(native,/mobile-api-incompatible/);
 assert.deepEqual(Object.values(servicePaths),['/api/mobile/config','/api/strength/config','/api/waitlist/config']);
});
test('readiness UI performs only credential-free public GET checks, not fake sign-in',()=>{
 const src=readFileSync('public/site-connections.js','utf8');assert.match(src,/method:'GET'/);assert.match(src,/credentials:'omit'/);assert.match(src,/redirect:'error'/);assert.doesNotMatch(src,/localStorage|Bearer|MOBILE_SESSION_KEY|APP_DB|method:'POST'/);
});
test('native unavailable-service paths clear stale account views but leave device archive separate',()=>{
 const src=readFileSync('apps/mobile/App.tsx','utf8');assert.match(src,/if \(!config.available \|\| !config.workoutSync\) \{\s*setMe\(null\); setWorkouts\(\[\]\); setNext\(null\)/);assert.match(src,/legal\("\/app\/#app-connections"\)/);
});
test('preview launch supports app route and keeps home available in website mode',()=>{
 const src=readFileSync('scripts/preview_mobile_app.mjs','utf8');assert.match(src,/\["\/app\/", "\/exercises\/", "\/mobile\/"\]/);assert.match(src,/process.env.PREVIEW_ENTRY !== "\/"/);
});
