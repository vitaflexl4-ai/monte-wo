// Self-reported, browser-local assessment. No account lookups, network requests, persistence or analytics.
export function calculatePresence(answers){
 const known=answers.filter(a=>[0,1,2].includes(a.value));
 return {score:known.length?Math.round(known.reduce((sum,a)=>sum+a.value,0)/(known.length*2)*100):null,known:known.length,total:answers.length,answers};
}
const form=typeof document!=='undefined'?document.querySelector('#presence-form'):null;
if(form)form.addEventListener('submit',event=>{
 event.preventDefault();if(!form.reportValidity())return;
 const answers=[...form.querySelectorAll('select')].map(s=>({id:s.id,label:document.querySelector('label[for="'+s.id+'"]').textContent,value:s.value==='unknown'?null:Number(s.value)}));
 const result=calculatePresence(answers),panel=document.querySelector('#presence-results');
 document.querySelector('#score-value').textContent=result.score===null?'Not enough information to calculate a score.':result.score+'/100 · self-reported';
 document.querySelector('#score-coverage').textContent=`Evidence coverage: ${result.known}/${result.total} questions answered with a finding. ${result.total-result.known} unknown. This is not independently verified evidence.`;
 const evidence=document.querySelector('#score-evidence');evidence.replaceChildren();
 for(const a of answers){const box=document.createElement('article');box.className='score-finding';const h=document.createElement('strong');h.textContent=a.label;const p=document.createElement('p');p.textContent=a.value===null?'Unavailable: you have not checked this. Next step: verify the relevant page or account before drawing a conclusion.':a.value===2?'Your report: checked and present. Scoring: 2 of 2. Recheck periodically.':a.value===1?'Your report: partly present. Scoring: 1 of 2. Opportunity: review this customer-facing step and define a specific improvement.':'Your report: needs work. Scoring: 0 of 2. Opportunity: address this gap, then test it yourself.';box.append(h,p);evidence.append(box)}
 panel.hidden=false;panel.focus();
});
const enquiry=typeof document!=='undefined'?document.querySelector('#business-enquiry'):null;
if(enquiry){const interest=new URLSearchParams(location.search).get('package');if(interest&&[...enquiry.elements.interest.options].some(o=>o.value===interest))enquiry.elements.interest.value=interest;
 enquiry.addEventListener('submit',event=>{event.preventDefault();if(!enquiry.reportValidity())return;const data=new FormData(enquiry);const subject='VitaFlex enquiry — '+data.get('interest');const body='Business: '+data.get('business')+'\nReply email: '+data.get('email')+'\nInterest: '+data.get('interest')+'\n\n'+data.get('message');document.querySelector('#business-enquiry-status').textContent='Opening your email app. Nothing has been sent: please review and send the draft yourself. If no app opens, email vitaflexl4@gmail.com directly.';location.href='mailto:vitaflexl4@gmail.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);});}
