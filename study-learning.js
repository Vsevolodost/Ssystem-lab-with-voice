(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SystemLabLearning=api;
})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';
  const DAY=86400000;
  function hash(text){let value=2166136261;for(const char of text){value^=char.codePointAt(0);value=Math.imul(value,16777619);}return (value>>>0).toString(36);}
  function taskId(lessonId,prompt){return lessonId+'-'+hash(prompt);}
  function nextReview(previous,success,selected,now){
    const advance=!previous?.lastCorrect||previous?.dueAt===null||previous?.dueAt<=now;
    const streak=success?Math.max(1,(previous?.streak||0)+(advance?1:0)):0;
    return {attempts:(previous?.attempts||0)+1,wrong:(previous?.wrong||0)+(success?0:1),streak,lastCorrect:success,selected,lastAt:now,dueAt:success?(advance?now+DAY*[1,3,7,14,30][Math.min(streak-1,4)]:previous.dueAt):now};
  }
  function create(storage,lessons,tasks,now=()=>Date.now()){
    const lessonIds=new Set(lessons.map(x=>x.id));
    const taskMap=new Map(tasks.map(x=>[x.id,x]));
    const key=id=>'system-lab-review-v1-'+id;
    let unavailable=false;
    function read(name){try{return JSON.parse(storage.getItem(name));}catch{return null;}}
    function write(name,value){try{storage.setItem(name,JSON.stringify(value));return true;}catch{unavailable=true;return false;}}
    function record(task){
      const saved=read(key(task.id));
      if(validRecord(saved,task.options.length))return saved;
      if(task.legacyIndex!==undefined){
        const selected=read(`system-lab-quiz-v2-${task.lessonId}-${task.legacyIndex}`);
        if(Number.isInteger(selected)&&task.options[selected])return {attempts:1,wrong:selected===task.correct?0:1,streak:0,lastCorrect:selected===task.correct,selected,lastAt:0,dueAt:selected===task.correct?null:0};
      }
      return null;
    }
    function answer(task,selected){
      if(!taskMap.has(task.id)||!Number.isInteger(selected)||!task.options[selected])throw new Error('Некорректный вариант ответа.');
      const result=nextReview(record(task),selected===task.correct,selected,now());
      write(key(task.id),result);
      return result;
    }
    function due(task){const result=record(task);return !!result&&(!result.lastCorrect||(result.dueAt!==null&&result.dueAt<=now()));}
    function mistakes(task){const result=record(task);return !!result&&!result.lastCorrect;}
    function backup(){
      const entries={};
      for(const lesson of lessons){
        const name='system-lab-skill-v1-'+lesson.id;
        const value=read(name);
        if(['new','read','understood','review'].includes(value))entries[name]=value;
        else if(lesson.source&&read('sa_v6')?.[lesson.source])entries[name]='read';
      }
      for(const task of tasks){const value=record(task);if(value)entries[key(task.id)]=value;}
      const last=read('system-lab-study-last-v1');if(lessonIds.has(last))entries['system-lab-study-last-v1']=last;
      const theme=read('system-lab-theme-v1');if(['light','dark'].includes(theme))entries['system-lab-theme-v1']=theme;
      return {app:'system-lab',version:1,createdAt:new Date(now()).toISOString(),entries};
    }
    function validateBackup(data){
      if(!data||data.app!=='system-lab'||data.version!==1||!data.entries||typeof data.entries!=='object'||Array.isArray(data.entries))throw new Error('Это не файл прогресса System Lab.');
      const entries={};let skills=0,answers=0;
      for(const [name,value]of Object.entries(data.entries)){
        if(name.startsWith('system-lab-skill-v1-')){
          if(!lessonIds.has(name.slice(20))||!['new','read','understood','review'].includes(value))throw new Error('В файле есть неизвестная тема или отметка.');
          skills++;
        }else if(name.startsWith('system-lab-review-v1-')){
          const task=taskMap.get(name.slice(21));
          if(!task||!validRecord(value,task.options.length))throw new Error('В файле есть неизвестный вопрос или некорректный результат.');
          // Recompute correctness instead of trusting an imported success flag.
          if(value.lastCorrect!==(value.selected===task.correct))throw new Error('Результат ответа не соответствует вопросу.');
          answers++;
        }else if(name==='system-lab-study-last-v1'){
          if(!lessonIds.has(value))throw new Error('Неизвестное место остановки.');
        }else if(name==='system-lab-theme-v1'){
          if(!['light','dark'].includes(value))throw new Error('Некорректная тема оформления.');
        }else throw new Error('В файле есть посторонние настройки. Ничего не восстановлено.');
        entries[name]=value;
      }
      return {entries,skills,answers};
    }
    function restore(validated){
      // Validate again so callers cannot bypass the import boundary.
      const checked=validateBackup({app:'system-lab',version:1,entries:validated.entries});
      const changes=[];
      for(const [name,value]of Object.entries(checked.entries)){
        const existing=read(name);
        if(name.startsWith('system-lab-review-v1-')?(!existing||value.lastAt>existing.lastAt):existing===null||existing==='new')changes.push([name,value]);
      }
      const before=changes.map(([name])=>[name,storage.getItem(name)]);
      try{for(const [name,value]of changes)storage.setItem(name,JSON.stringify(value));}
      catch(error){for(const [name,value]of before.reverse()){try{value===null?storage.removeItem(name):storage.setItem(name,value);}catch{}}throw new Error('Не удалось сохранить прогресс. Освободи место в браузере и попробуй ещё раз.');}
      return changes.length;
    }
    return {read,write,record,answer,due,mistakes,backup,validateBackup,restore,get unavailable(){return unavailable;}};
  }
  function validRecord(value,length){const validTime=time=>Number.isSafeInteger(time)&&time>=0&&time<=8640000000000000;return !!value&&typeof value==='object'&&Number.isInteger(value.attempts)&&value.attempts>0&&value.attempts<=1000000&&Number.isInteger(value.wrong)&&value.wrong>=0&&value.wrong<=value.attempts&&Number.isInteger(value.streak)&&value.streak>=0&&value.streak<=value.attempts&&typeof value.lastCorrect==='boolean'&&Number.isInteger(value.selected)&&value.selected>=0&&value.selected<length&&validTime(value.lastAt)&&(value.dueAt===null||validTime(value.dueAt));}
  return {DAY,taskId,nextReview,create};
});
