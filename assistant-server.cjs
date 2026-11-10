const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const pages = new Map([
  ['/', 'index.html'], ['/index.html', 'index.html'],
  ['/welcome-ru.wav', 'welcome-ru.wav'], ['/course.html', 'course.html'], ['/Roadmap-SA.html', 'Roadmap-SA.html']
]);

const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const theoryAudio = /^\/lesson-audio\/theory-(?:analysis|design|integrations|development|ai|quality|debug|release|operations)-[0-4]\.wav$/.test(pathname);
  const topicAudio = /^\/lesson-audio\/topic-(?:b1|b2|treq|tsmart|b3|b4|bdb|bwin|sql|bnet|bnlab|b5|brest|bapi|bsec|b6|b7|b7b|b8|barch|b9|b10|b11|b12)\.wav$/.test(pathname);
  const lessonAudio = /^\/lesson-audio\/(?:scope|requirements|process|data|api|events|design|baseline|schema|rag|tools|security|evals|ops|capstone)\.wav$/.test(pathname);
  if (request.method === 'GET' && (pages.has(pathname) || lessonAudio || topicAudio || theoryAudio)) {
    try {
      const page = await fs.readFile(path.join(__dirname, pages.get(pathname) || pathname.slice(1)));
      response.writeHead(200, {'Content-Type': pathname.endsWith('.wav') ? 'audio/wav' : 'text/html; charset=utf-8'});
      response.end(page);
    } catch {
      response.writeHead(500).end();
    }
    return;
  }
  response.writeHead(404).end();
});

const port = Number(process.env.SYSTEM_LAB_PORT || 8000);
server.listen(port, '127.0.0.1', () => console.log('System Lab: http://127.0.0.1:' + port + '/'));
