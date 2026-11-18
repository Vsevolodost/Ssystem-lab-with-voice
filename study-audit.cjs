const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const crypto=require('node:crypto');
const context = {window:{}};
vm.createContext(context);
for(const file of ['study-data.js','study-enrichment.js','study-explanations.js','study-quizzes.js','roadmap-index.js']) vm.runInContext(fs.readFileSync(file,'utf8'),context);
const {SystemLabData:data,SystemLabExtras:extras,SystemLabRoadmap:roadmap}=context.window;
const lessons=data.modules.flatMap(module=>module.lessons);
const narration=JSON.parse(fs.readFileSync('study-narration.json','utf8'));
const voiceManifest=JSON.parse(fs.readFileSync('study-voice-manifest.json','utf8'));
let quizCount=0;
assert.equal(new Set(lessons.map(x=>x.id)).size,lessons.length,'Duplicate skills');
const topics=new Set(roadmap.map(x=>x.id));
const used=new Set(['10-1','10-2','12-1']);
for(const lesson of lessons){
  const explanation=context.window.SystemLabExplanations[lesson.id];
  assert(explanation?.length===3 && explanation.every(p=>p.length>100),lesson.id+' missing expanded explanation');
  const tasks=context.window.SystemLabQuizzes[lesson.id];
  assert(tasks?.length>=2,lesson.id+' needs multiple questions');
  for(const [question,correct,options]of tasks){
    assert(question&&Number.isInteger(correct)&&options[correct]&&options.length===3,lesson.id+' invalid question');
    assert(options.every(([label,why])=>label&&why),lesson.id+' missing option rationale');
    quizCount++;
  }
  assert(lesson.title&&lesson.gist&&lesson.question&&lesson.answer&&lesson.example,lesson.id+' missing content');
  assert(lesson.flow.length>=2,lesson.id+' missing diagram');
  const ids=[lesson.source,...(extras.related[lesson.id]||[])].filter(id=>topics.has(id));
  ids.forEach(id=>used.add(id));
  assert(ids.length||extras.deeper[lesson.id]?.length,lesson.id+' missing deep material');
  const audio='lesson-audio/skill-expanded-'+lesson.id+'.wav';
  assert(fs.existsSync(audio),audio+' missing');
  const bytes=fs.readFileSync(audio);assert.equal(bytes.toString('ascii',0,4),'RIFF');assert(bytes.length>44,audio+' empty');
  const narrated=narrationText(lesson.id);
  assert.equal(voiceManifest[lesson.id],crypto.createHash('sha256').update(narrated).digest('hex'),lesson.id+' narration out of date');
}
function narrationText(id){return narration.find(item=>item.id===id).text;}
for(const topic of roadmap)assert(used.has(topic.id),'Original topic missing: '+topic.id);
for(const [id,[question,correct,options]] of Object.entries(extras.scenarios)){
  assert(lessons.some(x=>x.id===id),id+' unknown quiz');
  assert(question&&options[correct]&&options.length>=3,id+' invalid quiz');
  assert(options.every(([title,why])=>title&&why),id+' explanation missing');
}
const original=fs.readFileSync('Roadmap-SA.html','utf8');
const script=[...original.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).find(x=>x.includes('const DATA ='));
vm.runInNewContext(script.split('// ═══════════ ЛОГИКА')[0]+';window.auditData=DATA;',context);
for(const block of context.window.auditData){for(const topic of block.topics||[]){assert(!topic.theory?.includes('undefined'),topic.id+' undefined diagram');}}
assert(!fs.readFileSync('study-app.js','utf8').includes('own-answer'),'Free answer UI was not removed');
console.log(JSON.stringify({modules:data.modules.length,skills:lessons.length,scenarios:quizCount+Object.keys(extras.scenarios).length,originalTopics:roadmap.length,audio:lessons.length}));
