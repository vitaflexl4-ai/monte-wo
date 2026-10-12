import {websiteUI} from './website-copy.js';
// Shared public navigation only: no accounts, athlete state, ranking or analytics.
const toggle=document.querySelector('.menu-button'),nav=document.querySelector('#main-nav');
if(toggle&&nav){
 const labels=()=>websiteUI[document.documentElement.lang]||websiteUI.en;
 const setOpen=(open,restore=false)=>{nav.classList.toggle('open',open);toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?labels().close:labels().open);toggle.textContent=open?'×':'☰';if(restore)toggle.focus()};
 setOpen(false);toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';setOpen(open);if(open)nav.querySelector('a')?.focus()});
 nav.addEventListener('click',e=>{if(e.target.closest('a'))setOpen(false)});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&toggle.getAttribute('aria-expanded')==='true'){setOpen(false,true);e.preventDefault()}});
 document.addEventListener('click',e=>{if(!e.target.closest('.site-header'))setOpen(false)});
 document.addEventListener('focusin',e=>{if(!e.target.closest('.site-header'))setOpen(false)});
 const wide=matchMedia('(min-width:901px)');wide.addEventListener('change',()=>setOpen(false));
 new MutationObserver(()=>toggle.setAttribute('aria-label',toggle.getAttribute('aria-expanded')==='true'?labels().close:labels().open)).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
}
