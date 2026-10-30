// Native video controls load the exact pinned source file on explicit play only.
for(const video of document.querySelectorAll('.repository-video video')){
 const status=video.closest('.repository-video').querySelector('.repository-video-status');
 video.addEventListener('playing',()=>status.textContent='Loop playing · source preview');
 video.addEventListener('error',()=>status.textContent='Video could not load. Check your connection, reload this page, or open the original repository video below.');
 video.querySelector('source')?.addEventListener('error',()=>status.textContent='Repository video unavailable. Check your connection or use the source link below.');
 window.addEventListener('pagehide',()=>video.pause());
 document.addEventListener('visibilitychange',()=>{if(document.hidden)video.pause()});
}
