"""Owner-run verification. Never uploads, publishes, generates keys or weakens Android security."""
import argparse,hashlib,json,re,shutil,subprocess,sys
from pathlib import Path
from datetime import datetime,timezone
p=argparse.ArgumentParser();p.add_argument('--apk',type=Path,required=True);p.add_argument('--expected-cert-sha256',required=True);p.add_argument('--install-test',action='store_true');p.add_argument('--report',type=Path,default=Path('apk-verification.json'));a=p.parse_args()
def run(*args):return subprocess.check_output(args,stderr=subprocess.STDOUT,text=True).strip()
try:
 for tool in ['apksigner','aapt']+(['adb'] if a.install_test else []):
  if not shutil.which(tool):raise ValueError('Required Android SDK tool missing: '+tool)
 if not a.apk.is_file() or a.apk.suffix.lower()!='.apk':raise ValueError('Supply a real built APK.')
 expected=a.expected_cert_sha256.replace(':','').lower()
 if not re.fullmatch('[a-f0-9]{64}',expected):raise ValueError('Expected certificate SHA-256 must come from the operator’s trusted signing-key record.')
 signature=run('apksigner','verify','--verbose','--print-certs',str(a.apk))
 certs=re.findall(r'Signer #\d+ certificate SHA-256 digest: ([a-fA-F0-9]+)',signature)
 if len(certs)!=1 or certs[0].lower()!=expected:raise ValueError('Signing identity differs from the trusted record; do not publish or rotate keys casually.')
 if 'CN=Android Debug' in signature:raise ValueError('Android Debug certificates are not release identities.')
 badging=run('aapt','dump','badging',str(a.apk))
 if 'application-debuggable' in badging:raise ValueError('Debuggable APK is not a release artifact.')
 match=re.search(r"package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'",badging)
 if not match or match[1]!='com.vitaflexbusinessgroup.montewo':raise ValueError('Unexpected application identity.')
 minimum=re.search(r"sdkVersion:'(\d+)'",badging);activity=re.search(r"launchable-activity: name='([^']+)'",badging)
 if not minimum or not activity:raise ValueError('APK metadata is incomplete.')
 report={'package':match[1],'versionCode':int(match[2]),'versionName':match[3],'minSdk':int(minimum[1]),'bytes':a.apk.stat().st_size,'sha256':hashlib.file_digest(a.apk.open('rb'),'sha256').hexdigest(),'certificateSha256':expected,'checkedAt':datetime.now(timezone.utc).isoformat(),'installAndLaunchTest':False,'publicReleaseAuthorized':False,'remainingGates':['Real-device functional/security/accessibility tests','Resolved dependency advisories','Operational account deletion and privacy/store review','Hosted HTTPS artifact integrity check','Operator release approval']}
 if a.install_test:
  if run('adb','get-state')!='device':raise ValueError('Connect exactly one authorized Android test device.')
  installed=run('adb','install','-r',str(a.apk))
  if 'Success' not in installed:raise ValueError('Installation did not report Success.')
  started=run('adb','shell','am','start','-W','-n',match[1]+'/'+activity[1])
  if 'Status: ok' not in started or not run('adb','shell','pidof',match[1]):raise ValueError('Launch/process verification failed.')
  report['installAndLaunchTest']=True;report['testedAndroidSdk']=int(run('adb','shell','getprop','ro.build.version.sdk'))
 a.report.parent.mkdir(parents=True,exist_ok=True);a.report.write_text(json.dumps(report,indent=2)+'\n');print('Verification written to',a.report,'— no publication performed. Full functional QA remains required.')
except (ValueError,subprocess.CalledProcessError,OSError) as e:print('NOT VERIFIED:',e,file=sys.stderr);sys.exit(1)
