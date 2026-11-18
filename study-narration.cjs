const fs=require('node:fs');
const vm=require('node:vm');
const context={window:{}};
vm.createContext(context);
for(const file of ['study-data.js','study-explanations.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
const items=context.window.SystemLabData.modules.flatMap(module=>module.lessons.map(lesson=>({
 id:lesson.id,
 text:[...context.window.SystemLabExplanations[lesson.id].slice(0,2),'Разберём на примере. '+context.window.SystemLabExplanations[lesson.id][2]].join('\n\n')
})));
fs.writeFileSync('study-narration.json',JSON.stringify(items,null,2));
console.log('Prepared '+items.length+' narrated explanations');
