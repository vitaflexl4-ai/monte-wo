/** Read-only HTTP audit of the canonical public sitemap; never requests private APIs. */
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
const preferred='https://vitaflexbusinessgroup.com';
const decode=s=>s.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#x27;',"'");
export function tags(html,name){
 return [...html.matchAll(new RegExp('<'+name+'\\b[^>]*>','gi'))].map(match=>Object.fromEntries([...match[0].matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)].map(a=>[a[1].toLowerCase(),decode(a[3])])));
}
export function inspectPublicHTML(html,url){
 const problems=[];
 const canonical=tags(html,'link').filter(t=>(t.rel||'').split(/\s+/).includes('canonical'));
 const meta=tags(html,'meta');
 const values=key=>meta.filter(m=>(m.name||m.property||'').toLowerCase()===key).map(m=>m.content||'');
 const titles=[...html.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/gi)].map(m=>decode(m[1]));
 const descriptions=values('description');
 if(canonical.length!==1||canonical[0]?.href!==url)problems.push('Canonical missing, duplicated or not preferred URL');
 if(titles.length!==1||!titles[0].trim())problems.push('Title missing/duplicated');
 if(descriptions.length!==1||!descriptions[0].trim())problems.push('Description missing/duplicated');
 for(const key of ['robots','googlebot','bingbot'])if(values(key).some(v=>/\b(?:noindex|none)\b/i.test(v)))problems.push(key+' blocks indexing');
 const h1s=[...html.matchAll(/<h1\b/gi)].length;if(h1s!==1)problems.push('Expected one H1');
 for(const key of ['og:title','og:description','og:url','twitter:card','twitter:title','twitter:description'])if(values(key).length!==1)problems.push(key+' missing/duplicated');
 if(values('og:url')[0]!==url)problems.push('Open Graph URL differs from canonical');
 return {canonical:canonical[0]?.href,title:titles[0],description:descriptions[0],robots:values('robots'),problems};
}
export async function audit({origin=preferred,probeOrigin=origin,output='/tmp/vitaflex-public-seo-audit.json'}={}){
 const revision=process.env.GITHUB_SHA||Date.now().toString();
 const get=(base,path,headers={})=>fetch(base+path+(path.includes('?')?'&':'?')+'audit='+encodeURIComponent(revision),{redirect:'manual',headers,signal:AbortSignal.timeout(20000)});
 const report={origin,preferred,rows:[],crawlerProbes:[],problems:[],notes:['Alternate-origin path checks do not establish preferred-domain or verified Googlebot accessibility. User-Agent probes do not authenticate real search/AI crawlers.']};
 try{
  const robotsResponse=await get(origin,'/robots.txt');const robots=await robotsResponse.text();
  const sitemapResponse=await get(origin,'/sitemap.xml');const sitemap=await sitemapResponse.text();
  report.robots={status:robotsResponse.status,text:robots};report.sitemapStatus=sitemapResponse.status;
  if(robotsResponse.status!==200||!robots.includes('Sitemap: '+preferred+'/sitemap.xml'))report.problems.push('robots.txt unavailable or missing preferred sitemap');
  if(sitemapResponse.status!==200||!sitemap.includes('http://www.sitemaps.org/schemas/sitemap/0.9'))report.problems.push('Sitemap unavailable or invalid namespace');
  let urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>decode(m[1]));
  report.sitemapSource='remote';
  // If the edge blocks the sitemap, still record HTTP responses for all 58
  // already-validated canonical paths. This is NOT a remote sitemap success.
  if(!urls.length){urls=[...readFileSync('public/sitemap.xml','utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>decode(m[1]));report.sitemapSource='local fallback after remote failure';}
  report.sitemapUrls=urls.length;
  if(urls.length!==58||new Set(urls).size!==urls.length)report.problems.push('Expected 58 distinct canonical public URLs');
  const disallowed=[...robots.matchAll(/^Disallow:\s*(\S+)\s*$/gm)].map(m=>m[1]);
  let index=0;
  await Promise.all(Array.from({length:4},async()=>{
   while(index<urls.length){
    const url=urls[index++];const row={url};report.rows.push(row);
    try{
     const parsed=new URL(url);
     if(parsed.origin!==preferred||parsed.search||parsed.hash||!parsed.pathname.endsWith('/')||/^\/(?:api|intelligence|strength\/admin|account\/callback|founder)(?:\/|$)/.test(parsed.pathname))throw new Error('Noncanonical or private sitemap URL');
     if(disallowed.some(path=>parsed.pathname.startsWith(path)))throw new Error('Public URL blocked by robots');
     const response=await get(origin,parsed.pathname);row.status=response.status;row.redirect=response.headers.get('location');row.xRobotsTag=response.headers.get('x-robots-tag');
     if(response.status!==200)throw new Error('Expected direct HTTP 200');
     if(!response.headers.get('content-type')?.includes('text/html'))throw new Error('Expected HTML content type');
     const html=await response.text();Object.assign(row,inspectPublicHTML(html,url));
     // Pages preview/alias headers may intentionally differ from the preferred domain.
     if(origin===preferred&&/\b(?:noindex|none)\b/i.test(row.xRobotsTag||''))row.problems.push('Public response header blocks indexing');
     for(const issue of row.problems)report.problems.push(url+': '+issue);
    }catch(error){row.error=error.message;report.problems.push(url+': '+error.message);}
   }
  }));
  report.rows.sort((a,b)=>a.url.localeCompare(b.url));
  for(const field of ['title','description']){
   const seen=new Set();for(const row of report.rows){if(!row[field])continue;if(seen.has(row[field]))report.problems.push('Duplicate '+field+': '+row.url);seen.add(row[field]);}
  }
  report.redirectProbes=[];
  if(new URL(origin).protocol==='https:'){
   const targets=[origin+'/founder/'];
   if(origin===preferred)targets.push('http://vitaflexbusinessgroup.com/','https://www.vitaflexbusinessgroup.com/');
   for(const target of targets){
    const probe={url:target};report.redirectProbes.push(probe);
    try{const response=await fetch(target,{redirect:'manual',signal:AbortSignal.timeout(20000)});probe.status=response.status;probe.location=response.headers.get('location');probe.challenge=response.headers.get('cf-mitigated');await response.body?.cancel();}catch(error){probe.error=error.message;}
   }
  }
  for(const agent of ['Googlebot','Bingbot','OAI-SearchBot','PerplexityBot'])for(const path of ['/','/sony/','/robots.txt']){
   const probe={origin:probeOrigin,agent,path};report.crawlerProbes.push(probe);
   try{const response=await get(probeOrigin,path,{'User-Agent':agent});probe.status=response.status;probe.xRobotsTag=response.headers.get('x-robots-tag');probe.challenge=response.headers.get('cf-mitigated')||null;await response.body?.cancel();}catch(error){probe.error=error.message;}
  }
 }catch(error){report.problems.push(error.message);}
 report.passed=report.problems.length===0;
 mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 const statuses=report.rows.reduce((counts,row)=>{const key=String(row.status||'error');counts[key]=(counts[key]||0)+1;return counts;},{});
 console.log('::notice title=Public sitemap HTTP audit::'+JSON.stringify({origin,urls:report.sitemapUrls,checked:report.rows.length,statuses,robotsStatus:report.robots?.status,sitemapStatus:report.sitemapStatus,metadataValidated:report.rows.filter(r=>!r.error&&r.problems?.length===0).length,passed:report.passed,problems:report.problems,output}));
 console.log('::notice title=Redirect response probes::'+JSON.stringify(report.redirectProbes));
 console.log('::notice title=Crawler response probes (not verified-bot authentication)::'+JSON.stringify(report.crawlerProbes));
 return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const result=await audit({origin:process.env.VERIFY_ORIGIN||preferred,probeOrigin:process.env.CRAWLER_PROBE_ORIGIN||process.env.VERIFY_ORIGIN||preferred,output:process.env.SEO_AUDIT_OUTPUT||'/tmp/vitaflex-public-seo-audit.json'});
 if(!result.passed)process.exitCode=1;
}
