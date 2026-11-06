// Wrangler's Pages config download can emit an empty [placement] table after a
// deployment. Its next deploy rejects that table because mode is required.
// Omit only empty tables: preserve every explicitly configured placement mode.
export function normalizeDownloadedPagesConfig(text) {
 const lines=text.split(/\r?\n/);
 return lines.filter((line,index)=>{
  if(!/^\[(?:env\.(?:preview|production)\.)?placement\]$/.test(line.trim()))return true;
  let next=index+1;
  while(next<lines.length&&(!lines[next].trim()||lines[next].trim().startsWith('#')))next++;
  return next<lines.length&&!lines[next].trim().startsWith('[');
 }).join('\n');
}
