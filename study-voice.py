"""Render the authored narration with the already installed local Silero model."""
import argparse
import array
import json
import hashlib
import os
from pathlib import Path
import re
import wave

import torch

parser = argparse.ArgumentParser()
parser.add_argument('--model', required=True)
args = parser.parse_args()
torch.set_num_threads(4)
with open(args.model, 'rb') as model_file:
    model = torch.package.PackageImporter(model_file).load_pickle('tts_models', 'model')
root = Path(__file__).resolve().parent
pronunciation = {
    'RabbitMQ': 'рэббит эм кью', 'GraphQL': 'граф кью эл', 'gRPC': 'джи ар пи си',
    'Kafka': 'Кафка', 'PostgreSQL': 'постгрес', 'OpenAPI': 'оупен эй пи ай',
    'OpenID Connect': 'оупен ай ди коннект', 'OAuth': 'оу аут', 'HTTP': 'эйч ти ти пи',
    'HTTPS': 'эйч ти ти пи эс', 'TLS': 'ти эл эс', 'TCP': 'ти си пи', 'UDP': 'ю ди пи',
    'WebSocket': 'веб сокет', 'Codex': 'Кодекс', 'Claude Code': 'Клод Код',
    'MCP': 'эм си пи', 'API': 'эй пи ай', 'AI': 'эй ай', 'RAG': 'рэг', 'LLM': 'эл эл эм',
    'SQL': 'эс кью эл', 'JSON': 'джейсон', 'JWT': 'джей дабл ю ти', 'BPMN': 'би пи эм эн',
    'CQRS': 'си кью ар эс', 'SSE': 'эс эс и', 'BFF': 'би эф эф', 'ML': 'эм эл',
    'DNS': 'ди эн эс', 'DLQ': 'ди эл кью', 'ADR': 'эй ди ар', 'ACID': 'эсид',
    'ROW_NUMBER': 'роу намбер', 'DENSE_RANK': 'дэнс рэнк', 'RANK': 'рэнк',
    'LEFT JOIN': 'лефт джойн', 'INNER JOIN': 'иннер джойн', 'GROUP BY': 'груп бай',
    'ORDER BY': 'ордер бай', 'PARTITION BY': 'партишн бай', 'SELECT': 'селект',
    'WHERE': 'вэр', 'HAVING': 'хэвинг', 'COUNT': 'каунт', 'SUM': 'сам',
    'LAG': 'лэг', 'NULL': 'налл', 'IS NULL': 'из налл', 'COMMIT': 'коммит',
    'RANGE': 'рэйндж', 'ROWS': 'роуз', 'XML': 'икс эм эл',
    'GET': 'гет', 'POST': 'пост', 'PUT': 'пут', 'DELETE': 'делит',
    'getOrder': 'получить заказ', 'OrderCreated': 'заказ создан', 'createdAt': 'время создания',
    'client_id': 'идентификатор клиента', 'id': 'ай ди', 'status': 'статус', 'state': 'стэйт',
    'fragment': 'фрагмент', 'problem': 'проблема', 'phone': 'телефон',
}
items = json.loads((root / 'study-narration.json').read_text(encoding='utf-8'))
manifest_path = root / 'study-voice-manifest.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {}
for item in items:
    output = root / 'lesson-audio' / ('skill-expanded-' + item['id'] + '.wav')
    digest = hashlib.sha256(item['text'].encode('utf-8')).hexdigest()
    if output.exists() and manifest.get(item['id']) == digest:
        continue
    text = item['text']
    for token, spoken in sorted(pronunciation.items(), key=lambda pair: -len(pair[0])):
        text = re.sub(r'(?<![\w])' + re.escape(token) + r'(?![\w])', spoken, text)
    text = text.replace('→', ', затем ').replace('/', ' ').replace('*', ' все строки ')
    # Paragraphs are separate synthesis calls to stay within model text limits.
    chunks = [part.strip() for part in text.split('\n\n') if part.strip()]
    temporary = output.with_suffix('.tmp')
    try:
        with wave.open(str(temporary), 'wb') as target:
            target.setnchannels(1)
            target.setsampwidth(2)
            target.setframerate(24000)
            for index, chunk in enumerate(chunks):
                samples = model.apply_tts(text=chunk, speaker='xenia', sample_rate=24000, put_accent=True, put_yo=True)
                pcm = array.array('h', (samples.clamp(-1, 1) * 32767).to(torch.int16).tolist())
                target.writeframes(pcm.tobytes())
                if index < len(chunks)-1:
                    target.writeframes(b'\x00\x00' * 10800)
        os.replace(temporary, output)
        manifest[item['id']] = digest
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
        print(item['id'], flush=True)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise
