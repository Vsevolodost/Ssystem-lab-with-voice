const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const Learning=require('./study-learning.js');
const simulations=require('./study-simulations.js');
function memory(){const map=new Map();return {getItem:key=>map.has(key)?map.get(key):null,setItem:(key,value)=>map.set(key,value),removeItem:key=>map.delete(key),map};}
const lessons=[{id:'rest',source:'5-1'},{id:'kafka'}];
const task={id:Learning.taskId('rest','Как повторять?'),lessonId:'rest',prompt:'Как повторять?',correct:1,options:[['a','why'],['b','why'],['c','why']],legacyIndex:0};
test('incorrect answer stays due; correct retries schedule a new date without changing mastery',()=>{
 let now=1700000000000;const storage=memory(),store=Learning.create(storage,lessons,[task],()=>now);
 assert.equal(store.record(task),null);store.answer(task,0);assert(store.mistakes(task));assert(store.due(task));
 const result=store.answer(task,1);assert.equal(result.wrong,1);assert.equal(result.attempts,2);assert(!store.mistakes(task));assert(!store.due(task));assert.equal(result.dueAt,now+Learning.DAY);assert.equal(storage.getItem('system-lab-skill-v1-rest'),null);
 now+=Learning.DAY;assert(store.due(task));const next=store.answer(task,1);assert.equal(next.dueAt,now+3*Learning.DAY);
});
test('legacy quiz results migrate without inventing review dates',()=>{
 const storage=memory();storage.setItem('system-lab-quiz-v2-rest-0','1');const store=Learning.create(storage,lessons,[task]);assert.equal(store.record(task).lastCorrect,true);assert.equal(store.due(task),false);assert.equal(store.record(task).dueAt,null);
});
test('rechecking a correct answer on the same day does not postpone spaced practice',()=>{let now=1700000000000;const store=Learning.create(memory(),lessons,[task],()=>now);const first=store.answer(task,1);now+=1000;const again=store.answer(task,1);assert.equal(again.dueAt,first.dueAt);assert.equal(again.streak,first.streak);});
test('backup round-trip merges new progress and keeps existing skill choices',()=>{
 const a=Learning.create(memory(),lessons,[task],()=>1700000000000);a.write('system-lab-skill-v1-rest','understood');a.answer(task,1);const exported=a.backup();
 const b=Learning.create(memory(),lessons,[task]);b.write('system-lab-skill-v1-rest','review');b.restore(b.validateBackup(exported));assert.equal(b.read('system-lab-skill-v1-rest'),'review');assert.equal(b.record(task).selected,1);
});
test('backup validates the entire file before restoring',()=>{
 const store=Learning.create(memory(),lessons,[task]);const exported=store.backup();exported.entries['system-lab-skill-v1-rest']='understood';exported.entries['unrelated-secret']='x';assert.throws(()=>store.validateBackup(exported));assert.equal(store.read('system-lab-skill-v1-rest'),null);
 assert.throws(()=>store.validateBackup(JSON.parse('{"app":"system-lab","version":1,"entries":{"__proto__":{"x":1}}}')));
});
test('imported correctness cannot disagree with the selected option',()=>{
 const store=Learning.create(memory(),lessons,[task],()=>1700000000000);store.answer(task,1);const exported=store.backup();Object.values(exported.entries).find(value=>value&&typeof value==='object').selected=0;assert.throws(()=>store.validateBackup(exported));
});
test('failed import rolls back writes rather than leaving a partial restore',()=>{
 const storage=memory(),original=storage.setItem;let calls=0;storage.setItem=(key,value)=>{calls++;if(calls===2)throw new Error('quota');return original(key,value);};
 const store=Learning.create(storage,lessons,[task]);const valid=store.validateBackup({app:'system-lab',version:1,entries:{'system-lab-skill-v1-rest':'read','system-lab-skill-v1-kafka':'understood'}});assert.throws(()=>store.restore(valid));assert.equal(storage.map.size,0);
});
test('invalid answers never become review records',()=>{const store=Learning.create(memory(),lessons,[task]);assert.throws(()=>store.answer(task,9));assert.equal(store.record(task),null);});
test('every module has mixed checks, all skills have decision guidance, task ids are unique',()=>{
 const context={window:{}};vm.createContext(context);
 for(const file of ['study-data.js','study-quizzes.js','study-enrichment.js','study-tools-data.js','study-module-checks.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
 const {SystemLabData:data,SystemLabStudyTools:tools,SystemLabModuleChecks:checks,SystemLabQuizzes:quizzes,SystemLabExtras:extras}=context.window;
 const ids=[];let total=0;
 for(const module of data.modules){assert.equal(checks[module.id].length,3);for(const q of checks[module.id]){assert(module.lessons.some(lesson=>lesson.id===q.skill));assert(q.options[q.correct]);assert(q.options.every(pair=>pair[0]&&pair[1]));ids.push(Learning.taskId('module-'+module.id,q.prompt));total++;}for(const lesson of module.lessons){assert.equal(tools.decisions[lesson.id].length,2);for(const [prompt,,options]of [...quizzes[lesson.id],...(extras.scenarios[lesson.id]?[extras.scenarios[lesson.id]]:[])]){ids.push(Learning.taskId(lesson.id,prompt));assert(options.length>=3);total++;}}}
 assert.equal(total,217);assert.equal(new Set(ids).size,total);
});
test('simulations clamp navigation and distinguish failure from success',()=>{
 for(const kind of ['request','queue','kafka','outbox','agents','mcp','rag']){const start=simulations.describe(kind,-1),end=simulations.describe(kind,100);assert.equal(start.step,0);assert.equal(end.step,end.total-1);assert.notEqual(simulations.describe(kind,0,true).text,start.text);}
});
