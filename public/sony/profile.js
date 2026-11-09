// Progressive enhancement only. Biography, photos, links and chapters work without JavaScript.
const header=document.querySelector('.personal-header');
const button=document.querySelector('.menu-toggle');
const navigation=document.querySelector('#personal-navigation');
const mobile=matchMedia('(max-width: 800px)');
if(header&&button&&navigation){
  document.documentElement.classList.add('js');
  let open=false;
  function render(){
    button.hidden=!mobile.matches;
    button.setAttribute('aria-expanded',String(open&&mobile.matches));
    button.querySelector('span').textContent=open&&mobile.matches?'Close':'Menu';
    navigation.hidden=mobile.matches&&!open;
  }
  button.addEventListener('click',()=>{open=!open;render()});
  navigation.addEventListener('click',event=>{
    const link=event.target.closest('a');if(!link)return;
    if(mobile.matches){open=false;render();const hash=new URL(link.href).hash;if(hash){const target=document.getElementById(hash.slice(1));requestAnimationFrame(()=>target?.focus({preventScroll:true}))}}
  });
  document.addEventListener('click',event=>{if(open&&!header.contains(event.target)){open=false;render()}});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&open){open=false;render();button.focus()}});
  mobile.addEventListener('change',()=>{const needsFocus=mobile.matches&&navigation.contains(document.activeElement);open=false;render();if(needsFocus)button.focus()});
  render();
  if('IntersectionObserver'in window)new IntersectionObserver(entries=>header.classList.toggle('is-scrolled',!entries[0].isIntersecting),{rootMargin:'-110px 0px 0px 0px',threshold:.9}).observe(document.querySelector('.personal-hero'));
}
