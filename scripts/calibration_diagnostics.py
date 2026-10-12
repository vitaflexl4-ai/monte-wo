"""Offline diagnostics, not rank calibration or approval.
Input de-identified CSV: athlete_id,discipline,sex,age,bodyweight_kg,load_kg,variation,equipment,valid.
Does NOT output rank thresholds. Requires an explicit provenance manifest and matching protocol.
"""
import argparse,csv,json,math,hashlib,statistics
from pathlib import Path

def corr(a,b):
 if len(a)<3:return None
 ma,mb=statistics.mean(a),statistics.mean(b);sa=sum((v-ma)**2 for v in a);sb=sum((v-mb)**2 for v in b)
 return sum((x-ma)*(y-mb) for x,y in zip(a,b))/math.sqrt(sa*sb) if sa and sb else None

def diagnose(rows,manifest):
 keep={};excluded=0
 for r in rows:
  try:
   bw,load,age=float(r['bodyweight_kg']),float(r['load_kg']),float(r['age']);key=(r['athlete_id'],r['discipline'])
   expected=manifest['protocols'][r['discipline']]
   if not all(math.isfinite(v) for v in [bw,load,age]) or not(30<=bw<=350 and 0<load<=1000 and 18<=age<=100) or r['valid']!='true' or r['variation']!=expected['variation'] or r['equipment']!=expected['equipment']:raise ValueError()
   item={**r,'bw':bw,'load':load,'age':age}
   # One best valid observation per source-resolved athlete/discipline; selection must be disclosed.
   if key not in keep or load>keep[key]['load']:keep[key]=item
  except (KeyError,ValueError):excluded+=1
 groups={}
 for r in keep.values():groups.setdefault((r['discipline'],r['sex']),[]).append(r)
 output=[]
 for (discipline,sex),cohort in sorted(groups.items()):
  held=lambda r:int(hashlib.sha256(r['athlete_id'].encode()).hexdigest()[:8],16)%5==0
  train=[r for r in cohort if not held(r)];test=[r for r in cohort if held(r)]
  record={'discipline':discipline,'reference_category':sex,'unique_athletes':len(cohort),'train':len(train),'holdout':len(test),'age_range':[min(r['age'] for r in cohort),max(r['age'] for r in cohort)],'bodyweight_range':[min(r['bw'] for r in cohort),max(r['bw'] for r in cohort)]}
  if len(train)<3 or len(test)<3 or len(set(r['bw'] for r in train))<2:record['diagnostic']='Insufficient or degenerate sample for even exploratory regression; no conclusion.'
  else:
   x=[math.log(r['bw']) for r in train];y=[math.log(r['load']) for r in train];mx,my=statistics.mean(x),statistics.mean(y);slope=sum((a-mx)*(b-my) for a,b in zip(x,y))/sum((a-mx)**2 for a in x);intercept=my-slope*mx
   absolute=statistics.mean(r['load'] for r in train);ratio=statistics.mean(r['load']/r['bw'] for r in train)
   candidates={'absolute':lambda r:absolute,'simple_ratio':lambda r:ratio*r['bw'],'fitted_allometry':lambda r:math.exp(intercept+slope*math.log(r['bw']))}
   diagnostics={}
   for name,predict in candidates.items():
    residuals=[r['load']-predict(r) for r in test];diagnostics[name]={'holdout_MAE_kg':statistics.mean(abs(e) for e in residuals),'holdout_mean_error_kg':statistics.mean(residuals),'residual_bodyweight_correlation':corr([r['bw'] for r in test],residuals),'residual_age_correlation':corr([r['age'] for r in test],residuals)}
   record.update(exploratory_fitted_exponent=slope,candidates=diagnostics,warning='No model selected. No statistical power, tail sufficiency, fairness or external-validity certification.')
  output.append(record)
 return {'status':'DRAFT — NOT OFFICIAL','purpose':'Exploratory normalization diagnostics only; no rank thresholds produced.','manifest':manifest,'excluded_rows':excluded,'deduplicated_observations':len(keep),'cohorts':output}
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('csv');parser.add_argument('manifest');parser.add_argument('output');args=parser.parse_args();manifest=json.loads(Path(args.manifest).read_text())
 for key in ['source','license','snapshot_sha256','target_population','selection_limitations','protocols']:
  if not manifest.get(key):raise SystemExit('Missing manifest field: '+key)
 if hashlib.sha256(Path(args.csv).read_bytes()).hexdigest()!=manifest['snapshot_sha256']:raise SystemExit('Dataset digest does not match manifest')
 with open(args.csv,newline='') as f:report=diagnose(list(csv.DictReader(f)),manifest)
 Path(args.output).write_text(json.dumps(report,indent=2,allow_nan=False)+'\n')
