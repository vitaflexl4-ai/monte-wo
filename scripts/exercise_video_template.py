"""Exact-ID source video binding. Read metadata only; no cooking or downloading."""
from pathlib import Path
import json,html,re
ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/'apps/mobile/src/generated/workout-library.json').read_text())
PACKS={p['manifest']['id']:p for p in DATA['records']}
def loop_block(exercise_id):
    pack=PACKS.get(exercise_id)
    if not pack:
        return '<div class="guide-media pending-media"><span>NO MATCHING REPOSITORY VIDEO</span><p>This exercise has a written guide, but no exact-ID video in the supplied packs.</p><small>No different exercise has been substituted.</small></div>'
    file=pack['files']['loop'];path=file['path'];assert path.startswith('assets/workout-library/') and '..' not in path and path.endswith('/loop.mp4')
    source=DATA['source'];assert re.fullmatch('[0-9a-f]{40}',source['commit'])
    url='https://raw.githubusercontent.com/'+source['repository']+'/'+source['commit']+'/'+path
    name=html.escape(pack['manifest']['name_en'],quote=True)
    return '<div class="guide-media repository-video"><video controls playsinline muted loop preload="none" width="720" height="936" poster="/assets/workout-preview/'+exercise_id+'.jpg" aria-label="'+name+' source loop"><source src="'+html.escape(url,quote=True)+'" type="video/mp4"></video><div class="repository-video-caption"><b>SOURCE LOOP · '+str(file['duration'])+' s</b><p>Press play to loop. Source animation—not exercise-technique approval.</p><p class="repository-video-status" role="status"></p><a href="'+html.escape(url,quote=True)+'" target="_blank" rel="noopener">Open original repository video ↗</a></div></div>'
