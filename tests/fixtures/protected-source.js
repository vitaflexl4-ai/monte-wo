import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const changes=JSON.parse(readFileSync(new URL('../../docs/mobile/authorized-protected-changes.json',import.meta.url)));
assert.deepEqual(Object.keys(changes).sort(),['functions/api/[[route]].js','server/strength/api.js','wrangler.toml']);
export function assertProtectedSource(file,historical,actual){// The delivered source snapshot trims one trailing space from the unchanged
// Inter license. Accept ONLY these two pinned byte versions, not arbitrary edits.
if(file==='public/assets/INTER-LICENSE.txt' && actual==='5dd548d31a85f756e01d63e00d7faf1e324103ed3e9102fcbbabf2cc2db6dd39'){
 assert.equal(historical,'5b9321a4298cfeb6b34354164a1c3afc3db114569984c502b9b35d988fd58c57');return;
}
const change=changes[file];if(change){assert.equal(change.before,historical,'Historical baseline remains intact: '+file);assert.ok(change.reason.length>30);assert.equal(actual,change.after,'Pinned authorized change: '+file)}else assert.equal(actual,historical,file)}
