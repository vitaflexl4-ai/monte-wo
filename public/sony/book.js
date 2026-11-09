// One passive, finite presentation. No controls, storage, cookies, requests or input handlers.
export const TIMING = Object.freeze({open:3000, opening:2800, turns:[11200,19200,27200], turn:2800, end:30000});
const clamp = n => Math.max(0, Math.min(1, n));
const ease = t => t*t*t*(t*(t*6-15)+10);
export function poseAt(milliseconds) {
  const opening = ease(clamp((milliseconds-TIMING.open)/TIMING.opening));
  return {opening, pages:TIMING.turns.map((start,i)=>{
    const p=ease(clamp((milliseconds-start)/TIMING.turn));
    return {turn:p,curl:Math.sin(p*Math.PI),z:6-i*2+p*(6+i*6)};
  }),done:milliseconds>=TIMING.end};
}
if(typeof document!=='undefined') {
  const book=document.querySelector('.book');
  if(book){
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const sheets=[...document.querySelectorAll('.turning-sheet')].sort((a,b)=>a.className.localeCompare(b.className));
    let elapsed=0,last=null,frame=null,inView=true;
    function draw(){const pose=poseAt(elapsed);book.style.setProperty('--opening',pose.opening.toFixed(5));sheets.forEach((sheet,i)=>{const p=pose.pages[i];sheet.dataset.phase=p.turn===0?'rest':p.turn===1?'turned':'turning';sheet.style.setProperty('--turn',p.turn.toFixed(5));sheet.style.setProperty('--curl',p.curl.toFixed(5));sheet.style.setProperty('--z',p.z.toFixed(3)+'px')});if(pose.done)book.dataset.settled='true';}
    function tick(now){frame=null;if(media.matches||document.hidden||!inView){last=null;return}if(last!==null)elapsed+=now-last;last=now;draw();if(elapsed<TIMING.end)frame=requestAnimationFrame(tick);else last=null;}
    function sync(){if(frame!==null)cancelAnimationFrame(frame);frame=null;last=null;if(!media.matches&&!document.hidden&&inView&&elapsed<TIMING.end)frame=requestAnimationFrame(tick);}
    document.addEventListener('visibilitychange',sync);
    media.addEventListener('change',sync);
    if(typeof IntersectionObserver!=='undefined')new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync()},{threshold:.1}).observe(document.querySelector('.book-stage'));
    draw();sync();
  }
}
