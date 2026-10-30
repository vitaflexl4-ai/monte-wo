import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {workoutPosters} from '../public/workout-posters.js';
const read=p=>readFileSync(p,'utf8');
test('Posters: exact approved mappings, no Romanian-deadlift substitution',()=>{
 assert.deepEqual(Object.keys(workoutPosters),['bench','squat','deadlift']);
 assert.equal(workoutPosters.bench.exerciseId,'bench-press');
 assert.equal(workoutPosters.squat.exerciseId,'back-squat');
 assert.equal(workoutPosters.deadlift.exerciseId,null);
 assert.equal(workoutPosters.deadlift.guide,'/exercises/standards/#deadlift');
 const catalog=JSON.parse(read('content/exercises.json'));
 assert.equal(catalog.exercises.length,14);assert.equal(catalog.groups.length,7);
 assert.ok(catalog.exercises.every(e=>e.media===null));
 assert.ok(!read('public/exercises/romanian-deadlift/index.html').includes('/assets/posters/deadlift.svg'));
});
test('Posters: originals preserved; served copies only normalize namespace',()=>{
 for(const p of Object.values(workoutPosters)){
  const source=read('assets/posters/'+p.id+'.svg'),served=read('public'+p.src);
  assert.equal(served,source.replace('xmlns="http://w3.org"','xmlns="http://www.w3.org/2000/svg"'));
  assert.ok(served.includes('viewBox="0 0 400 500"'));
  assert.ok(!/<script|foreignObject|\son[a-z]+=|(?:href|src)=/i.test(served));
 }
});
test('Posters: homepage images available before JavaScript, with correct labels',()=>{
 const home=read('public/monte-wo/index.html');
 for(const p of Object.values(workoutPosters))assert.ok(home.includes('src="'+p.src+'"'));
 assert.equal((home.match(/class="exercise-image has-workout-poster"/g)||[]).length,3);
 assert.equal((home.match(/data-i18n="workoutPoster"/g)||[]).length,3);
 assert.ok(read('public/app.js').includes("t('posterNotice')"));
});
test('Posters: library posters never masquerade as technique demonstrations',()=>{
 for(const id of ['bench-press','back-squat']){
  const detail=read('public/exercises/'+id+'/index.html');
  assert.ok(detail.includes('/assets/workout-library/'));
  assert.match(detail,/<video[^>]*loop/);
  assert.ok(detail.includes('not exercise-technique approval'));
 }
 const library=read('public/exercises/index.html');
 assert.ok(library.includes('Source preview'));
 assert.ok(library.includes('Source animations are previews, not form approval'));
 assert.ok(library.includes('Written guide'));
});
test('Posters: contained artwork and offline assets remain explicit',()=>{
 assert.ok(read('public/website.css').includes('object-fit:contain'));
 const sw=read('public/sw.js');assert.ok(sw.includes('montewo-core-v24-transparent-logo'));
 assert.ok(sw.includes('/workout-posters.js'));
 for(const p of Object.values(workoutPosters))assert.ok(sw.includes(p.src));
});
