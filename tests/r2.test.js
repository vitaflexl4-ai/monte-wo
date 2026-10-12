import {test} from 'node:test';
import assert from 'node:assert/strict';
import {onRequest} from '../functions/api/[[route]].js';
const ctx=(path,env={},options={})=>({request:new Request('https://montewo.example'+path,options),env});
test('missing R2 is reported honestly',async()=>assert.equal((await onRequest(ctx('/api/gifs/v1/bench.gif'))).status,503));
test('R2 receives correct key and serves media type',async()=>{let key;const env={WORKOUT_GIFS_BUCKET:{async get(k){key=k;return{body:'GIF89a',httpEtag:'"abc"',writeHttpMetadata(h){h.set('Content-Type','image/gif')}}}}};const res=await onRequest(ctx('/api/gifs/v1/bench.gif',env));assert.equal(key,'gifs/v1/bench.gif');assert.equal(res.headers.get('Content-Type'),'image/gif');assert.equal(await res.text(),'GIF89a');const cached=await onRequest(ctx('/api/gifs/v1/bench.gif',env,{headers:{'If-None-Match':'"abc"'}}));assert.equal(cached.status,304)});
test('missing objects and unsafe extensions rejected',async()=>{const env={WORKOUT_GIFS_BUCKET:{async get(){return null}}};assert.equal((await onRequest(ctx('/api/gifs/v1/bench.gif',env))).status,404);assert.equal((await onRequest(ctx('/api/gifs/file.html',env))).status,400);assert.equal((await onRequest(ctx('/api/gifs/x.gif',env,{method:'POST'}))).status,405)});
