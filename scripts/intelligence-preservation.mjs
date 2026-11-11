import assert from 'node:assert/strict';
export const announcementPath='public/ventures/vitaflex-intelligence-corp/index.html';
export function assertIntelligenceAnnouncement(html){
 for(const text of ['The most consequential changes often begin with something others failed to notice.','VitaFlex Intelligence explores the intersection of intelligence, strategic thinking, and deeper understanding—uncovering what others overlook, challenging accepted narratives, and revealing possibilities that can change the course of events.','CLOSER THAN YOU THINK.','THE MOMENT OF REVELATION IS NEVER','AS DISTANT AS IT APPEARS.','IN DEVELOPMENT'])assert.ok(html.includes(text),text);
 assert.doesNotMatch(html,/equation-permanent|equation-echo|symbolic-reveal|infinity-symbol|KNOWLEDGE|PATTERN|PERSPECTIVE|POSSIBILITY/);for(const href of ['/sony/','/#ventures','/sony/three-daily-wins/'])assert.ok(html.includes(`href="${href}"`));assert.doesNotMatch(html,/<time\b|<input\b|<form\b|data-launch|datePublished/);return true;
}
