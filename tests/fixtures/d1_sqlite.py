import sqlite3,json,sys
request=json.load(sys.stdin);db=sqlite3.connect(request['path']);db.row_factory=sqlite3.Row;db.execute('PRAGMA foreign_keys=ON')
try:
 if 'script' in request:db.executescript(request['script']);result=[]
 else:
  db.execute('BEGIN');result=[]
  for s in request['statements']:
   cur=db.execute(s['sql'],s.get('values',[]));rows=[dict(r) for r in cur.fetchall()] if cur.description else [];result.append({'results':rows,'meta':{'changes':max(0,cur.rowcount)}})
  db.commit()
 print(json.dumps({'data':result}))
except Exception as e:
 db.rollback();print(json.dumps({'error':str(e)}))
finally:db.close()
