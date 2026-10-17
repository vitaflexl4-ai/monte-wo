"""Read pinned Git blobs, parse SQL as text, verify media, generate app metadata.
Never runs supplied scripts or SQL. Never writes a database or uploads objects.
"""
import argparse, collections, hashlib, io, json, re, subprocess
from pathlib import Path, PurePosixPath
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
DEFAULT_REF='c9f7151e47d58afce20bc9251bc301ac405ed2ab'
PREFIX='assets/workout-library/'
FIELDS=['id','name_en','name_ht','category','equipment','primary_muscles','secondary_muscles','demo_key','loop_key','poster_key','demo_duration_s','loop_duration_s']
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT)
def sql_values(raw):
    values=[];i=0
    while i<len(raw):
        while i<len(raw) and raw[i].isspace():i+=1
        if raw[i]=="'":
            i+=1;value=''
            while True:
                if i>=len(raw):raise ValueError('Unclosed SQL string')
                if raw[i]=="'":
                    if i+1<len(raw) and raw[i+1]=="'":value+="'";i+=2;continue
                    i+=1;break
                value+=raw[i];i+=1
        else:
            match=re.match(r'NULL|-?\d+(?:\.\d+)?',raw[i:]);assert match,'Unexpected SQL literal'
            token=match[0];i+=len(token);value=None if token=='NULL' else float(token)
        values.append(value)
        while i<len(raw) and raw[i].isspace():i+=1
        if i==len(raw):break
        assert raw[i]==',','Unexpected SQL syntax';i+=1
    return values

def parse_sql(raw):
    # DDL is recognized and discarded, NOT sent to sqlite/D1 or any interpreter.
    raw=re.sub(r'\ACREATE TABLE IF NOT EXISTS exercises\s*\([^;]+\);\s*','',raw)
    result={}
    for line in raw.splitlines():
        if not line.strip():continue
        m=re.fullmatch(r'INSERT OR REPLACE INTO exercises \(([^)]+)\) VALUES \((.*)\);',line.strip());assert m,'Unrecognized SQL statement (not executed)'
        fields=m[1].split(',');assert fields==FIELDS
        values=sql_values(m[2]);assert len(values)==len(fields)
        row=dict(zip(fields,values));assert row['id'] not in result
        for field in ('primary_muscles','secondary_muscles'):row[field]=json.loads(row[field])
        result[row['id']]=row
    return result

def main(ref,source_branch):
    commit=git('rev-parse',ref).decode().strip();assert re.fullmatch('[0-9a-f]{40}',commit)
    tree={}
    for line in git('ls-tree','-rl',commit,PREFIX).decode().splitlines():
        meta,path=line.split('\t');mode,kind,oid,size=meta.split();assert mode=='100644' and kind=='blob'
        tree[path]={'oid':oid,'bytes':int(size)}
    assert tree,'No workout library found'
    cache=ROOT/'.cache/workout-media';cache.mkdir(parents=True,exist_ok=True)
    def blob(path):return git('cat-file','blob',tree[path]['oid'])
    def inspect(path):
        data=blob(path);assert not data.startswith(b'version https://git-lfs.github.com/spec/'),'Unresolved LFS pointer'
        info={**tree[path],'path':path,'sha256':hashlib.sha256(data).hexdigest()}
        if path.endswith('.jpg'):
            im=Image.open(io.BytesIO(data));im.verify();im=Image.open(io.BytesIO(data));info.update(width=im.width,height=im.height,format=im.format)
        else:
            local=cache/(info['oid']+'.mp4')
            if not local.exists():local.write_bytes(data)
            probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(local)]))
            video=[s for s in probe['streams'] if s['codec_type']=='video'];assert len(video)==1
            stream=video[0];n,d=map(int,stream['avg_frame_rate'].split('/'))
            info.update(width=stream['width'],height=stream['height'],codec=stream['codec_name'],duration=float(probe['format']['duration']),fps=n/d)
            assert info['codec']=='h264'
        return path,info
    media_paths=[p for p in tree if p.endswith(('.mp4','.jpg'))]
    with ThreadPoolExecutor(max_workers=6) as pool:media=dict(pool.map(inspect,media_paths))
    unique={};packs=[];duplicates=[]
    for path in sorted(p for p in tree if p.endswith('/manifest.json')):
        folder=path.rsplit('/',1)[0];pack=folder.split('/')[-1];rows=json.loads(blob(path));sql=parse_sql(blob(folder+'/exercises.sql').decode())
        assert isinstance(rows,list) and len(rows)==len(sql)
        pack_ids=set()
        for row in rows:
            id=row['id'];assert re.fullmatch('[a-z0-9-]+',id) and id not in pack_ids;pack_ids.add(id)
            assert {k:row[k] for k in FIELDS}==sql[id],f'Manifest/SQL mismatch: {pack}/{id}'
            assert row['category'] in ['Arms','Back','Cardio','Chest','Core','Legs','Mobility','Shoulders']
            files={}
            for kind,filename in [('demo','demo.mp4'),('loop','loop.mp4'),('poster','poster.jpg')]:
                key=row[kind+'_key'];assert key==f'exercises/{id}/{filename}'
                file=media[folder+'/r2/'+key];assert (file['width'],file['height'])==(row['width'],row['height'])
                if kind!='poster':
                    assert file['bytes']==row[kind+'_bytes'];assert abs(file['duration']-row[kind+'_duration_s'])<.1;assert file['fps']==row['fps']
                files[kind]=file
            if id in unique:
                prior=unique[id];assert prior['manifest']==row,f'Conflicting duplicate metadata: {id}'
                assert all(prior['files'][k]['sha256']==files[k]['sha256'] for k in files),f'Conflicting media: {id}'
                prior['packages'].append(pack);duplicates.append({'id':id,'package':pack,'same_metadata_and_bytes':True})
            else:unique[id]={'manifest':row,'packages':[pack],'files':files,'reviewStatus':'form-and-rights-review-pending'}
        packs.append({'folder':pack,'manifestEntries':len(rows),'sqlRows':len(sql),'manifestMatchesSql':True})
    expected={f['path'] for record in unique.values() for f in record['files'].values()}
    generated={'version':1,'source':{'repository':'vitaflexl4-ai/monte-wo','branch':source_branch,'commit':commit},'records':list(unique.values())}
    dest=ROOT/'apps/mobile/src/generated/workout-library.json';dest.write_text(json.dumps(generated,indent=2)+'\n')
    poster_dir=ROOT/'apps/mobile/assets/workout-posters';poster_dir.mkdir(exist_ok=True)
    requires=[]
    for id,record in unique.items():
        (poster_dir/(id+'.jpg')).write_bytes(blob(record['files']['poster']['path']))
        requires.append(f'  "{id}": require("../assets/workout-posters/{id}.jpg"),')
    (ROOT/'apps/mobile/src/workout-posters.ts').write_text('// Generated by import_workout_library.py; exact source poster bytes.\nexport const workoutPosters: Record<string, number> = {\n'+'\n'.join(requires)+'\n};\n')
    totals=collections.Counter(r['manifest']['category'] for r in unique.values());canonical=json.loads((ROOT/'content/exercises.json').read_text());overlap=sorted(set(unique)&{e['id'] for e in canonical['exercises']})
    report={'source':generated['source'],'packages':packs,'manifestEntries':sum(p['manifestEntries'] for p in packs),'uniqueExercises':len(unique),'duplicateEntries':duplicates,'categories':dict(sorted(totals.items())),'physicalMediaFiles':len(media),'uniqueMediaFiles':len(expected),'allMediaProbed':True,'allManifestSqlRowsMatch':True,'canonicalGuideOverlap':overlap,'canonicalGuidesRetained':len(canonical['exercises']),'mergedBrowseRecords':len(unique)+len(canonical['exercises'])-len(overlap),'scriptsExecuted':False,'sqlExecuted':False,'r2Uploaded':False,'reviewStatus':'Technical file checks only. Exercise form, translation and rights approval not inferred.'}
    report_dir=ROOT/'docs/mobile/workout-library';report_dir.mkdir(exist_ok=True);(report_dir/'inventory.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k!='duplicateEntries'},indent=2))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--ref',default=DEFAULT_REF);p.add_argument('--source-branch',default='main');args=p.parse_args();main(args.ref,args.source_branch)
