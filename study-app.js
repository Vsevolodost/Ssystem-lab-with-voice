(() => {
  'use strict';
  const modules = window.SystemLabData.modules;
  const extras = window.SystemLabExtras;
  const explanations = window.SystemLabExplanations;
  const quizzes = window.SystemLabQuizzes;
  const roadmap = window.SystemLabRoadmap;
  const lessons = modules.flatMap(module => module.lessons.map(lesson => ({...lesson, module})));
  const byId = new Map(lessons.map(lesson => [lesson.id, lesson]));
  const topicById = new Map(roadmap.map(topic => [topic.id, topic]));
  const app = document.querySelector('#study-app');
  const notice = document.querySelector('#storage-notice');
  const escape = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const url = id => 'course.html?skill=' + encodeURIComponent(id);
  const progressKey = id => 'system-lab-skill-v1-' + id;
  const lastKey = 'system-lab-study-last-v1';
  let audio;

  function read(key) {
    try { return JSON.parse(localStorage.getItem(key)); }
    catch { return null; }
  }

  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { notice.hidden = false; }
  }

  function state(id) {
    const saved = read(progressKey(id));
    if (['new', 'read', 'understood', 'review'].includes(saved)) return saved;
    const lesson = byId.get(id);
    const old = read('sa_v6');
    // Imported checkmarks record prior reading, not verified mastery.
    return lesson?.source && old?.[lesson.source] ? 'read' : 'new';
  }

  const stateNames = {new:'Не изучал', read:'Открывал', understood:'Разобрался', review:'Повторить'};

  function count(items) {
    return items.filter(lesson => state(lesson.id) === 'understood').length;
  }

  function sidebar(current) {
    return `<details class="side-menu" open><summary>Все разделы</summary><nav aria-label="Разделы обучения">${modules.map((module, index) => `<a href="index.html?module=${module.id}" ${current === module.id ? 'aria-current="page"' : ''}><span class="nav-number">${String(index + 1).padStart(2,'0')}</span><span>${module.title}</span><small>${count(module.lessons)}/${module.lessons.length}</small></a>`).join('')}</nav></details>`;
  }

  function prepareMenu() {
    const narrow = matchMedia('(max-width: 800px)');
    const menu = document.querySelector('.side-menu');
    menu.open = !narrow.matches;
    narrow.addEventListener('change', event => { menu.open = !event.matches; });
  }

  function catalog() {
    document.title = 'Навыки системного аналитика · System Lab';
    const requested = new URLSearchParams(location.search).get('module');
    const last = read(lastKey);
    const lastLesson = byId.get(last);
    const next = (lastLesson && state(last) !== 'understood' ? lastLesson : null) || lessons.find(lesson => state(lesson.id) !== 'understood') || lastLesson || lessons[0];
    const understood = count(lessons);
    app.innerHTML = `<div class="workspace"><aside>${sidebar(requested)}</aside><main id="main" tabindex="-1"><div class="page-heading"><p class="overline">Системный аналитик → AI Solution Architect</p><h1>Что изучить дальше?</h1><p>Открой раздел, выбери навык и разбери его на примере.</p></div><section class="continue-card" aria-label="Продолжение обучения"><div><span>${last ? 'Твоё место в учебнике' : 'Начни с основ'}</span><strong>${escape(next.title)}</strong><small>${understood} из ${lessons.length} навыков отмечено понятными</small></div><a class="button" href="${url(next.id)}">${last ? 'Продолжить' : 'Открыть первый урок'} <span aria-hidden="true">→</span></a></section><div class="catalog-tools"><label for="skill-search">Найти навык</label><input type="search" id="skill-search" placeholder="Например, Kafka, требования или MCP" autocomplete="off"><p class="quiet" id="search-result" role="status"></p></div><div class="module-list">${modules.map((module,index) => `<details class="module" data-module="${module.id}" ${requested === module.id || (!requested && index === 0) ? 'open' : ''}><summary><span class="module-number">${String(index+1).padStart(2,'0')}</span><span><strong>${module.title}</strong><small>${module.description}</small></span><span class="module-count">${count(module.lessons)}/${module.lessons.length}</span></summary><ul>${module.lessons.map(lesson => `<li data-skill="${lesson.id}"><a href="${url(lesson.id)}"><span class="state-dot ${state(lesson.id)}" aria-hidden="true"></span><span>${lesson.title}</span><small>${stateNames[state(lesson.id)]}</small><span aria-hidden="true">→</span></a></li>`).join('')}</ul></details>`).join('')}</div><details class="supplement"><summary>Дополнительные темы и исходный справочник</summary><p>Финтех, блокчейн, полный SQL-тренажёр и исходные разборы доступны отдельно.</p><div class="source-links"><a href="Roadmap-SA.html#b10">Финтех и блокчейн</a><a href="Roadmap-SA.html#sql">SQL-тренажёр</a><a href="Roadmap-SA.html#b12">Истории для интервью</a><a href="Roadmap-SA.html">Весь исходный Roadmap</a></div></details></main></div>`;
    prepareMenu();
    const search = document.querySelector('#skill-search');
    const expandedBeforeSearch = new Map();
    search.addEventListener('input', () => {
      const query = search.value.trim().toLocaleLowerCase('ru');
      let found = 0;
      for (const box of document.querySelectorAll('.module')) {
        const module = modules.find(item => item.id === box.dataset.module);
        if (!expandedBeforeSearch.has(module.id)) expandedBeforeSearch.set(module.id, box.open);
        let matches = 0;
        for (const row of box.querySelectorAll('[data-skill]')) {
          const lesson = byId.get(row.dataset.skill);
          const text = [module.title, lesson.title, lesson.gist, lesson.answer].join(' ').toLocaleLowerCase('ru');
          row.hidden = !text.includes(query);
          if (!row.hidden) matches++;
        }
        found += matches;
        box.hidden = matches === 0;
        box.open = query ? matches > 0 : expandedBeforeSearch.get(module.id);
      }
      if (!query) expandedBeforeSearch.clear();
      document.querySelector('#search-result').textContent = query ? `Найдено навыков: ${found}` : '';
    });
    if (requested && modules.some(module => module.id === requested)) {
      document.querySelector(`[data-module="${requested}"]`).scrollIntoView({block:'start'});
    }
  }

  function picture(lesson) {
    if (lesson.id === 'supervisor') {
      return `<figure class="concept-picture"><figcaption>Один координатор, разные зоны ответственности</figcaption><div class="agent-tree"><div class="tree-node tree-main">Оркестратор<small>Делит задачу и собирает результат</small></div><div class="tree-branches"><div class="tree-node">Аналитик<small>Находит требования</small></div><div class="tree-node">Исследователь<small>Проверяет источники</small></div><div class="tree-node">Рецензент<small>Ищет противоречия</small></div></div><p class="quiet">Специалисты возвращают результат координатору. Он проверяет полноту и решает, когда остановиться.</p></div><button type="button" class="animation-toggle" aria-pressed="false">Приостановить схему</button></figure>`;
    }
    if (lesson.id === 'rag-architecture') {
      return `<figure class="concept-picture"><figcaption>Ответ опирается на найденные документы</figcaption><div class="rag-lane"><span>Документы</span><span aria-hidden="true">→</span><span>Фрагменты и индекс</span></div><ol>${['Вопрос','Поиск с проверкой прав','Контекст + модель','Ответ со ссылками'].map((node,index) => `<li style="--step:${index}"><span class="concept-number" aria-hidden="true">${index+1}</span><strong>${node}</strong></li>`).join('')}</ol><p class="quiet">Индекс готовят заранее. Для каждого вопроса выбирают разрешённые и актуальные фрагменты. Нет подходящего источника — система сообщает об этом.</p><button type="button" class="animation-toggle" aria-pressed="false">Приостановить схему</button></figure>`;
    }
    return `<figure class="concept-picture"><figcaption>${escape(lesson.title)}</figcaption><ol>${lesson.flow.map((node,index) => `<li style="--step:${index}"><span class="concept-number" aria-hidden="true">${index+1}</span><strong>${escape(node)}</strong></li>`).join('')}</ol><button type="button" class="animation-toggle" aria-pressed="false">Приостановить схему</button></figure>`;
  }

  function portrait() {
    return `<button type="button" class="voice-button" aria-label="Послушать объяснение" aria-pressed="false"><svg viewBox="0 0 80 80" aria-hidden="true"><circle cx="40" cy="40" r="38" fill="#e5e1f8"/><path d="M12 72Q17 52 40 52Q63 52 68 72" fill="#5546ad"/><circle cx="40" cy="34" r="19" fill="#ebbc9c"/><path d="M21 34Q17 9 42 12Q62 12 60 31Q46 29 39 22Q30 33 21 34" fill="#312e43"/><circle cx="33" cy="35" r="1.5"/><circle cx="47" cy="35" r="1.5"/><ellipse class="voice-mouth" cx="40" cy="44" rx="4" ry="1.4" fill="#813f3d"/></svg><span class="voice-symbol" aria-hidden="true">▶</span></button>`;
  }

  function interview(lesson) {
    const answer = lesson.id === 'integration'
      ? ['Я выбираю способ интеграции, чтобы две системы обменивались данными в нужный момент и предсказуемо вели себя при сбое. Сначала выясняю, для чего нужен обмен: человек ждёт ответ на экране или работу можно выполнить позже.', 'Например, покупатель открыл заказ и хочет узнать, где посылка. Здесь подойдёт прямой запрос к API доставки с ограничением времени ожидания. А письмо после оформления заказа можно поставить в очередь и отправить позже. Для суточного отчёта может хватить файла по расписанию. Затем уточню объём, повторы, допустимую задержку, права доступа и только после этого выберу технологию.']
      : [lesson.answer, 'Поясню на примере. ' + explanations[lesson.id][2]];
    return `<section class="interview" id="interview" aria-labelledby="interview-title"><p class="overline">Как это объяснить собеседнику</p><h2 id="interview-title">Образец ответа на собеседовании</h2><p class="interview-question">${escape(lesson.question)}</p><blockquote class="spoken-answer">${answer.map(paragraph=>`<p>${escape(paragraph)}</p>`).join('')}</blockquote></section>`;
  }

  function lessonTasks(lesson) {
    return [...quizzes[lesson.id], ...(extras.scenarios[lesson.id] ? [extras.scenarios[lesson.id]] : [])];
  }

  function scenario(lesson) {
    const tasks = lessonTasks(lesson);
    return `<section class="scenario" aria-labelledby="scenario-title"><p class="overline">Проверка понимания · ${tasks.length} вопроса</p><h2 id="scenario-title">Проверь на ситуациях</h2><p class="quiet">Выбери вариант. После проверки появится объяснение каждого ответа.</p>${tasks.map(([question,,options],taskIndex)=>`<form class="quiz-question" data-quiz="${taskIndex}"><fieldset><legend><span class="quiz-number">Вопрос ${taskIndex+1} из ${tasks.length}</span>${escape(question)}</legend>${options.map(([label],index) => `<label class="option"><input type="radio" name="scenario" value="${index}"><span>${escape(label)}</span></label>`).join('')}</fieldset><button class="button" type="submit">Проверить ответ</button><p class="choice-status" role="status"></p><div class="choice-explanation"></div></form>`).join('')}</section>`;
  }

  function explanation(lesson) {
    const [why,how,example] = explanations[lesson.id];
    return `<section class="lesson-explanation"><p class="lead">${escape(why)}</p><p>${escape(how)}</p>${picture(lesson)}<div class="voice"><audio id="lesson-audio" preload="none" src="lesson-audio/skill-expanded-${lesson.id}.wav"></audio>${portrait()}<div><strong>Послушать объяснение</strong><p id="voice-status" role="status">Теория простыми словами и подробный пример</p></div></div><div class="example"><span class="overline">Разберём на примере</span><p>${escape(example)}</p></div></section>`;
  }

  function deepMaterials(lesson) {
    const ids = [lesson.source,...(extras.related[lesson.id] || [])].filter(id => topicById.has(id));
    const uniqueIds = [...new Set(ids)];
    const deeper = extras.deeper[lesson.id];
    const main = deeper ? `<details class="deep-material"><summary>Подробнее: ${escape(lesson.title)}</summary>${deeper.map(paragraph => `<p>${escape(paragraph)}</p>`).join('')}</details>` : '';
    const original = uniqueIds.map(id => {
      const topic = topicById.get(id);
      return `<details class="deep-material roadmap-material" data-topic="${escape(id)}" data-block="${escape(topic.block)}"><summary>Roadmap · ${escape(topic.title)}</summary><p class="quiet">Исходный разбор, схемы и вопросы по этой теме.</p><div class="roadmap-frame"></div></details>`;
    }).join('');
    const sources = extras.sources[lesson.module.id] || [];
    return `<section class="depth-section"><h2>Разобраться глубже</h2>${main}${original}${sources.length ? `<details class="deep-material"><summary>Источники на русском</summary><ul>${sources.map(([name,href]) => `<li><a href="${href}" target="_blank" rel="noopener noreferrer">${name}</a></li>`).join('')}</ul></details>` : ''}</section>`;
  }

  function lessonPage(lesson) {
    const position = lessons.findIndex(item => item.id === lesson.id);
    const currentModule = lesson.module;
    document.title = `${lesson.title} · System Lab`;
    write(lastKey, lesson.id);
    if (state(lesson.id) === 'new') write(progressKey(lesson.id), 'read');
    app.innerHTML = `<div class="workspace"><aside>${sidebar(currentModule.id)}</aside><main id="main" tabindex="-1"><nav class="breadcrumbs" aria-label="Путь"><a href="index.html">Все навыки</a><span aria-hidden="true">/</span><a href="index.html?module=${currentModule.id}">${currentModule.title}</a></nav><div class="lesson-heading"><p class="overline">Навык ${currentModule.lessons.findIndex(item => item.id === lesson.id)+1} из ${currentModule.lessons.length} в разделе</p><h1>${lesson.title}</h1></div><div class="lesson-position" aria-label="Навыки текущего раздела">${currentModule.lessons.map((item,index) => `<a href="${url(item.id)}" ${item.id === lesson.id ? 'aria-current="step"' : ''} class="${state(item.id)}" title="${escape(item.title)}" aria-label="${index+1}. ${escape(item.title)} — ${stateNames[state(item.id)]}">${index+1}</a>`).join('')}</div>${explanation(lesson)}${interview(lesson)}${scenario(lesson)}${deepMaterials(lesson)}<section class="self-assessment" aria-label="Твоя оценка понимания"><h2>Как с этой темой?</h2><p class="quiet">Это твоя оценка, а не автоматический балл.</p><div class="assessment-actions"><button type="button" class="button" data-state="understood">Разобрался</button><button type="button" class="button secondary" data-state="review">Хочу повторить</button><button type="button" class="text-button" data-state="read">Снять отметку</button></div><p id="understanding-status" role="status"></p></section><nav class="lesson-navigation" aria-label="Переход между навыками">${position > 0 ? `<a href="${url(lessons[position-1].id)}">← ${escape(lessons[position-1].title)}</a>` : '<a href="index.html">← Все навыки</a>'}${position < lessons.length-1 ? `<a class="next-lesson" href="${url(lessons[position+1].id)}">Дальше: ${escape(lessons[position+1].title)} →</a>` : '<a href="index.html">Вернуться к навыкам →</a>'}</nav></main></div>`;
    prepareMenu();
    bindLesson(lesson);
  }

  function bindLesson(lesson) {
    const understanding = document.querySelector('#understanding-status');
    const assessmentButtons = [...document.querySelectorAll('[data-state]')];
    function refreshAssessment() {
      const value = state(lesson.id);
      understanding.textContent = 'Твоя отметка: ' + stateNames[value];
      assessmentButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.state === value)));
      for (const module of modules) {
        const badge = document.querySelector(`.side-menu a[href="index.html?module=${module.id}"] small`);
        if (badge) badge.textContent = `${count(module.lessons)}/${module.lessons.length}`;
      }
      for (const link of document.querySelectorAll('.lesson-position a')) {
        const id = new URL(link.href).searchParams.get('skill');
        const item = byId.get(id);
        if (item) {
          link.className = state(id);
          link.setAttribute('aria-label', `${lesson.module.lessons.findIndex(entry => entry.id === id)+1}. ${item.title} — ${stateNames[state(id)]}`);
        }
      }
    }
    refreshAssessment();
    assessmentButtons.forEach(button => button.addEventListener('click', () => {
      write(progressKey(lesson.id), button.dataset.state);
      refreshAssessment();
    }));
    addEventListener('storage', event => { if (event.key === progressKey(lesson.id)) refreshAssessment(); });

    audio = document.querySelector('#lesson-audio');
    const voiceButton = document.querySelector('.voice-button');
    const voiceStatus = document.querySelector('#voice-status');
    function updateVoice(playing, message) {
      voiceButton.setAttribute('aria-pressed', String(playing));
      voiceButton.setAttribute('aria-label', playing ? 'Приостановить объяснение' : 'Послушать объяснение');
      voiceButton.querySelector('.voice-symbol').textContent = playing ? 'Ⅱ' : '▶';
      voiceStatus.textContent = message;
    }
    voiceButton.addEventListener('click', async () => {
      if (!audio.paused) { audio.pause(); return; }
      updateVoice(false, 'Загружаю объяснение…');
      try { await audio.play(); } catch { updateVoice(false, 'Не удалось загрузить аудио. Текст объяснения есть выше.'); }
    });
    audio.addEventListener('playing', () => updateVoice(true, 'Диктор говорит · нажми, чтобы приостановить'));
    audio.addEventListener('pause', () => updateVoice(false, 'На паузе · нажми, чтобы продолжить'));
    audio.addEventListener('ended', () => updateVoice(false, 'Послушать ещё раз'));
    audio.addEventListener('error', () => updateVoice(false, 'Аудио недоступно. Объяснение можно прочитать выше.'));
    addEventListener('pagehide', () => audio.pause(), {once:true});

    const pictureBox = document.querySelector('.concept-picture');
    const toggle = pictureBox.querySelector('button');
    toggle.addEventListener('click', () => {
      const paused = pictureBox.classList.toggle('paused');
      toggle.setAttribute('aria-pressed', String(paused));
      toggle.textContent = paused ? 'Продолжить схему' : 'Приостановить схему';
    });

    const tasks = lessonTasks(lesson);
    for (const form of document.querySelectorAll('[data-quiz]')) {
      const taskIndex = Number(form.dataset.quiz);
      const [,correct,options] = tasks[taskIndex];
      const status = form.querySelector('.choice-status');
      const key = `system-lab-quiz-v2-${lesson.id}-${taskIndex}`;
      function feedback(selected) {
        const success = selected === correct;
        status.className = success ? 'choice-status feedback good' : 'choice-status feedback rethink';
        status.textContent = success ? '✓ Верно. Вот почему этот вариант подходит.' : '↻ Здесь есть важное условие. Посмотри разбор и попробуй ещё раз.';
        form.querySelector('.choice-explanation').innerHTML = `<ul class="option-explanations">${options.map(([title,why],index)=>`<li ${index===correct?'class="recommended"':''}><strong>${index===correct?'✓ ':''}${escape(title)}</strong><p>${escape(why)}</p></li>`).join('')}</ul>`;
      }
      const saved = read(key);
      if (Number.isInteger(saved) && options[saved]) {
        form.querySelector(`input[value="${saved}"]`).checked = true;
        feedback(saved);
      }
      form.addEventListener('submit', event => {
        event.preventDefault();
        const value = new FormData(form).get('scenario');
        if (value === null) { status.textContent = 'Сначала выбери вариант.'; return; }
        const selected = Number(value);
        feedback(selected);
        write(key,selected);
      });
      form.addEventListener('change', () => {
        status.className = 'choice-status';
        status.textContent = 'Вариант изменён. Нажми «Проверить ответ».';
        form.querySelector('.choice-explanation').innerHTML = '';
      });
    }

    const frames = new Map();
    for (const details of document.querySelectorAll('.roadmap-material')) {
      details.addEventListener('toggle', () => {
        if (!details.open || details.querySelector('iframe')) return;
        const frame = document.createElement('iframe');
        frame.title = 'Подробный разбор: ' + topicById.get(details.dataset.topic).title;
        frame.src = `Roadmap-SA.html?embed=1&topic=${encodeURIComponent(details.dataset.topic)}#${details.dataset.block}`;
        details.querySelector('.roadmap-frame').append(frame);
        frames.set(frame.contentWindow, frame);
      });
    }
    addEventListener('message', event => {
      if (event.origin !== location.origin && location.protocol !== 'file:') return;
      const frame = frames.get(event.source);
      if (!frame || event.data?.type !== 'system-lab-depth-size' || !Number.isFinite(event.data.height)) return;
      frame.style.height = Math.min(30000, Math.max(300,event.data.height+10)) + 'px';
    });
  }

  const params = new URLSearchParams(location.search);
  const aliases = {
    scope:'role', requirements:'types', process:'stories', data:'entities', api:'integration', events:'kafka', design:'c4',
    baseline:'llm', schema:'structured', rag:'rag-architecture', tools:'tools', security:'identity', evals:'evals', ops:'ai-ops', capstone:'ai-solution'
  };
  const moduleAliases = {analysis:'profession', design:'modeling', integrations:'api', development:'delivery-lifecycle', ai:'ai-foundation', quality:'ai-quality', debug:'delivery-lifecycle', release:'delivery-lifecycle', operations:'delivery-lifecycle'};
  if (params.has('lesson') || params.has('topic') || params.has('theory') || params.has('mode')) {
    const skill = aliases[params.get('lesson')];
    const topic = params.get('topic');
    const firstMatch = lessons.find(lesson => lesson.source && topicById.get(lesson.source)?.block === topic);
    if (skill || firstMatch) {
      location.replace(url(skill || firstMatch.id));
    } else {
      const moduleId = moduleAliases[params.get('theory')];
      location.replace('index.html' + (moduleId ? '?module='+moduleId : ''));
    }
    return;
  }
  const requested = params.get('skill');
  if (requested && byId.has(requested)) lessonPage(byId.get(requested));
  else if (requested) {
    app.innerHTML = '<main id="main" class="not-found"><h1>Этот навык не найден</h1><p>Открой список и выбери нужную тему.</p><a class="button" href="index.html">Все навыки</a></main>';
  } else catalog();
})();
