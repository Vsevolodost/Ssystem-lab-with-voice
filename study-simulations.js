(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SystemLabSimulations=api;})(typeof window==='undefined'?globalThis:window,function(){
  const kinds={
    integration:'choice',rest:'request',http:'request',contracts:'request',sequence:'request',tls:'request',
    kafka:'kafka',rabbit:'queue',delivery:'queue',outbox:'outbox',
    entities:'data',keys:'data',normalization:'data',joins:'data',
    supervisor:'agents','agent-networks':'agents',mcp:'mcp',tools:'mcp',
    'rag-architecture':'rag',indexing:'rag','rag-lifecycle':'rag','rag-or-tuning':'rag'
  };
  const definitions={
    request:{title:'Запрос, сохранение, ответ',nodes:['Сайт','API-сервер','База данных'],steps:[
      ['Ничего не отправлено. Нажми «Следующий шаг», чтобы пройти создание заявки.',0],
      ['Сайт отправляет данные. Пользователь пока ждёт — заявка ещё не подтверждена.',1],
      ['Сервер проверил запрос и записывает заявку в базу.',2],
      ['База подтвердила запись. Только теперь сервер может вернуть успех.',2],
      ['Сайт получил номер заявки. Пользователь видит подтверждённый результат.',0]
    ],failure:[['API недоступен. База ещё не получала этот запрос.',1],['Сайт прекращает ожидание по тайм-ауту и показывает ошибку. Если сбой случился после записи, результат проверяют по идентификатору операции.',0]]},
    queue:{title:'Задание в очереди и подтверждение',nodes:['Отправитель','Очередь задач','Обработчик'],steps:[
      ['Задача ещё не отправлена. Ack означает подтверждение обработки, а не просто наличие соединения.',0],
      ['Задание M42 принято в очередь. Отправитель не ждёт завершения рассылки.',1],
      ['Обработчик получил M42. До ack сообщение считается неподтверждённым.',2],
      ['Работа завершена, обработчик отправил ack. Теперь задачу можно убрать из очереди.',1],
      ['Задание подтверждено. Для нового задания начинается отдельный цикл.',0]
    ],failure:[['Обработчик упал до ack. Неизвестно, успел ли он выполнить внешнее действие.',2],['Сообщение может вернуться в очередь. Повтор получит тот же идентификатор M42.',1],['Новый обработчик проверяет идентификатор и не повторяет уже выполненный бизнес-эффект.',2]]},
    kafka:{title:'Один журнал, две независимые группы',nodes:['Producer','Журнал: offset 1042','Уведомления','Аналитика'],steps:[
      ['Продюсер ещё не записал событие. У каждой группы будет своя позиция чтения.',0],
      ['Событие заказа записано в партицию на offset 1042.',1],
      ['Группа уведомлений читает событие 1042 и выполняет работу.',2],
      ['Уведомления подтвердили следующую позицию 1043. Событие остаётся в журнале по политике хранения.',1],
      ['Аналитика читает ту же запись со своей позиции. Чтение другой группы её не удалило.',3]
    ],failure:[['Уведомления упали до фиксации позиции. Аналитика продолжает читать независимо.',2],['После восстановления уведомления могут прочитать 1042 ещё раз. Нужна защита от повторного эффекта.',2],['Событие остаётся доступным, пока позволяет политика хранения. Группы не делят один общий offset.',1]]},
    outbox:{title:'Изменение и событие без опасного промежутка',nodes:['Заказ + outbox','Публикация','Брокер','Получатель'],steps:[
      ['Сначала подготовим одно изменение заказа и запись о будущем событии.',0],
      ['Одна транзакция сохранила и заказ, и событие в outbox.',0],
      ['Отдельный процесс читает outbox и отправляет событие брокеру.',1],
      ['Брокер принял событие. Получатель выполняет действие с проверкой его id.',3],
      ['Публикация отмечена выполненной. Сам outbox не отменяет риск повторов.',0]
    ],failure:[['Брокер недоступен. Заказ сохранён, запись outbox остаётся для следующей попытки.',2],['Публикация повторяется позже. Если подтверждение потерялось, событие может прийти дважды.',1],['Получатель распознаёт id и защищает бизнес-действие от дубля.',3]]},
    agents:{title:'Специалисты и проверка общего результата',nodes:['Координатор','Проверка API','Проверка данных','Общий вывод'],steps:[
      ['Нужно проверить согласованность сервиса. Координатор ограничивает области работы.',0],
      ['Специалист API проверяет контракт, специалист данных — модель хранения.',1],
      ['API описывает id как строку UUID, модель данных — как число. Это конфликт между отчётами.',2],
      ['Координатор сопоставляет основания, фиксирует расхождение и вопрос к команде.',0],
      ['В общий вывод попали проверяемые замечания со ссылками. Простого склеивания отчётов было бы недостаточно.',3]
    ],failure:[['Один специалист не нашёл источник. Координатор не должен представлять догадку как проверенный факт.',2],['Непроверенная часть явно отмечена. Задача завершается в пределах лимита с открытым вопросом.',3]]},
    mcp:{title:'Предложение модели проходит проверку прав',nodes:['AI-приложение','MCP-клиент','MCP-сервер','Система задач'],steps:[
      ['Пользователь просит открыть карточку своей задачи.',0],
      ['Модель предлагает инструмент чтения. MCP-клиент передаёт вызов серверу.',1],
      ['Сервер проверяет пользователя, аргументы и доступ к карточке.',2],
      ['Система задач возвращает только разрешённые данные.',3],
      ['Приложение объясняет результат пользователю. Подключение не даёт права на все операции.',0]
    ],failure:[['Модель предложила чужую карточку. Формат номера верный, но доступа нет.',2],['Сервер отклоняет чтение до выдачи данных. Полномочия проверяются вне модели.',2]]},
    rag:{title:'Поиск и ответ — два разных этапа',nodes:['Вопрос','Поиск + права','Фрагменты','Ответ + источник'],steps:[
      ['Пользователь спрашивает, как оформить отпуск. Документы уже подготовлены для поиска.',0],
      ['Поиск находит актуальный регламент и проверяет доступ пользователя.',1],
      ['Только подходящие разрешённые фрагменты переданы модели.',2],
      ['Модель формирует понятный ответ со ссылкой на найденный раздел.',3],
      ['Проверяем, соответствует ли ответ источнику и не потеряны ли исключения.',3]
    ],failure:[['Подходящий разрешённый источник не найден. Модели нечем подтвердить правило.',1],['Помощник сообщает о нехватке данных и предлагает уточнить запрос. Уверенная выдумка не заменяет источник.',3]]}
  };
  function describe(kind,step=0,failed=false){const data=definitions[kind];if(!data)return null;const frames=failed?data.failure:data.steps;const bounded=Math.max(0,Math.min(step,frames.length-1));return {text:frames[bounded][0],active:frames[bounded][1],step:bounded,total:frames.length};}
  function render(lessonId,escape){
    const kind=kinds[lessonId];if(!kind)return '';
    if(kind==='data')return `<figure class="learning-sim data-sim" data-sim="data"><figcaption>Один клиент — несколько заявок</figcaption><div class="er-layout"><div><h3>Клиенты</h3><table><thead><tr><th>id · PK</th><th>Имя</th></tr></thead><tbody><tr data-client="7"><td>7</td><td>Анна</td></tr><tr data-client="8"><td>8</td><td>Олег</td></tr></tbody></table></div><div class="er-connector" aria-label="Связь один ко многим">1 → N<small>client_id → id</small></div><div><h3>Заявки</h3><table><thead><tr><th>id · PK</th><th>client_id · FK</th></tr></thead><tbody><tr data-request-client="7"><td>42</td><td>7</td></tr><tr data-request-client="7"><td>43</td><td>7</td></tr><tr data-request-client="8"><td>44</td><td>8</td></tr></tbody></table></div></div><div class="sim-controls"><button type="button" data-client-pick="7">Показать заявки Анны</button><button type="button" data-client-pick="8">Показать заявки Олега</button></div><p class="sim-status" role="status">Выбери клиента: связь покажет, какие заявки ему принадлежат.</p><p class="quiet">PK отличает запись в своей таблице. FK ссылается на существующего клиента. Имя и телефон не заменяют устойчивый идентификатор.</p></figure>`;
    if(kind==='choice')return `<figure class="learning-sim" data-sim="choice"><figcaption>Выбери потребность — увидишь способ обмена</figcaption><div class="sim-controls choice-controls"><button type="button" data-choice="now" aria-pressed="true">Статус нужен сейчас</button><button type="button" data-choice="later" aria-pressed="false">Письмо можно позже</button><button type="button" data-choice="batch" aria-pressed="false">Отчёт раз в сутки</button></div><div class="sim-track choice-track"><span class="sim-node">Покупатель</span><span class="sim-arrow">→ запрос →</span><span class="sim-node">Сервис доставки</span><span class="sim-arrow">← ответ ←</span></div><p class="sim-status" role="status">Прямой запрос к API: покупатель ждёт текущий статус. Нужны ограничение ожидания и поведение при ошибке.</p></figure>`;
    const data=definitions[kind];
    const node=index=>`<div class="sim-node" data-node="${index}"><span class="sim-number">${index+1}</span><strong>${escape(data.nodes[index])}</strong></div>`;
    const graph=kind==='kafka'
      ? `<div class="sim-fanout" aria-label="Продюсер пишет в журнал; две группы читают его независимо"><div class="fanout-top">${node(0)}<span class="fanout-note">↓ пишет в журнал</span>${node(1)}</div><div class="fanout-children"><div><small>Своя позиция чтения</small>${node(2)}</div><div><small>Своя позиция чтения</small>${node(3)}</div></div></div>`
      : kind==='agents'
        ? `<div class="sim-fanout" aria-label="Координатор передаёт задачи двум независимым специалистам и проверяет их результаты"><div class="fanout-top">${node(0)}</div><div class="fanout-children"><div><small>Отдельная задача</small>${node(1)}</div><div><small>Отдельная задача</small>${node(2)}</div></div><p class="fanout-note">Результаты → координатору → общая проверка</p><div class="fanout-top">${node(3)}</div></div>`
        : `<div class="sim-track">${data.nodes.map((_,index)=>node(index)+(index<data.nodes.length-1?'<span class="sim-arrow" aria-hidden="true">→</span>':'')).join('')}</div>`;
    return `<figure class="learning-sim" data-sim="${kind}"><figcaption>${escape(data.title)}</figcaption>${graph}<p class="sim-status" role="status">${escape(data.steps[0][0])}</p><div class="sim-controls"><button type="button" data-sim-back disabled>Назад</button><button type="button" data-sim-next>Следующий шаг</button><button type="button" data-sim-fail aria-pressed="false">${kind==='queue'||kind==='kafka'?'Сбой обработчика':kind==='rag'?'Источник не найден':kind==='mcp'?'Нет доступа':kind==='agents'?'Не хватает данных':'Сервис недоступен'}</button><button type="button" data-sim-reset>Сначала</button></div><p class="sim-counter quiet">Шаг 1 из ${data.steps.length}</p></figure>`;
  }
  function bind(scope){for(const figure of scope.querySelectorAll('[data-sim]')){
    const kind=figure.dataset.sim;
    if(kind==='data'){
      figure.querySelectorAll('[data-client-pick]').forEach(button=>button.addEventListener('click',()=>{
        const id=button.dataset.clientPick;
        figure.querySelectorAll('[data-client],[data-request-client]').forEach(row=>row.classList.toggle('related-row',(row.dataset.client||row.dataset.requestClient)===id));
        figure.querySelectorAll('[data-client-pick]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
        figure.querySelector('.sim-status').textContent=id==='7'?'У Анны id 7. Ей принадлежат заявки 42 и 43: в обеих client_id = 7. Одна строка клиента связана с двумя заявками.':'У Олега id 8. Ему принадлежит заявка 44 с client_id = 8. Заявки Анны не входят в эту связь.';
      }));continue;
    }
    if(kind==='choice'){
      const views={now:[['Покупатель','→ запрос →','Сервис доставки','← ответ ←'],'Прямой запрос к API: покупатель ждёт текущий статус. Нужны ограничение ожидания и поведение при ошибке.'],later:[['Заказ принят','→ задание →','Очередь','→ обработчик'],'Очередь: письмо выполнится позже. Заказ уже сохранён. Нужны подтверждение обработки, повторы и защита от повторной отправки.'],batch:[['Данные за день','→ выгрузка →','Файл отчёта','→ партнёр'],'Пакетный обмен: согласуем время выгрузки, формат, проверку получения и повтор без дублирования. Данные не обновляются мгновенно.']};
      figure.querySelectorAll('[data-choice]').forEach(button=>button.addEventListener('click',()=>{
        const [labels,text]=views[button.dataset.choice];
        Array.from(figure.querySelector('.choice-track').children).forEach((node,index)=>node.textContent=labels[index]);
        figure.querySelector('.sim-status').textContent=text;
        figure.querySelectorAll('[data-choice]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
      }));continue;
    }
    let step=0,failed=false;
    const back=figure.querySelector('[data-sim-back]'),next=figure.querySelector('[data-sim-next]'),failure=figure.querySelector('[data-sim-fail]');
    function update(){const frame=describe(kind,step,failed);step=frame.step;figure.querySelector('.sim-status').textContent=frame.text;figure.querySelector('.sim-counter').textContent=`Шаг ${step+1} из ${frame.total}${failed?' · сценарий сбоя':''}`;figure.querySelectorAll('[data-node]').forEach(node=>{node.classList.toggle('sim-active',Number(node.dataset.node)===frame.active);});figure.classList.toggle('sim-failed',failed);back.disabled=step===0;next.disabled=step===frame.total-1;failure.setAttribute('aria-pressed',String(failed));}
    next.addEventListener('click',()=>{step++;update();});back.addEventListener('click',()=>{step--;update();});failure.addEventListener('click',()=>{failed=!failed;step=0;update();});figure.querySelector('[data-sim-reset]').addEventListener('click',()=>{failed=false;step=0;update();});update();
  }}
  return {render,bind,describe,kinds};
});
