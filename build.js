// src/ui.html에 엔진·컴퓨터를 넣어 한 파일로 만듦 → dist/yut.html
const fs = require('fs');
const ui = fs.readFileSync(__dirname + '/src/ui.html', 'utf8');
const eng = fs.readFileSync(__dirname + '/src/engine.js', 'utf8');
const ai = fs.readFileSync(__dirname + '/src/ai.js', 'utf8');
const out = ui.replace('/*ENGINE*/', () => eng).replace('/*AI*/', () => ai);
fs.mkdirSync(__dirname + '/dist', { recursive: true });
fs.writeFileSync(__dirname + '/dist/yut.html', out);
// GitHub Pages용 완성 문서
const m = out.match(/<title>[^<]*<\/title>\n?/);
const title = m ? m[0].trim() : '<title>한판 윷놀이</title>';
const body = out.replace(/<title>[^<]*<\/title>\n?/, '').replace(/<meta name="claude:viewport-fit-sides"[^>]*>\n?/, '');
const page = `<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n${title}\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="description" content="가족끼리 한 기기로, 또는 컴퓨터와 함께 하는 윷놀이">\n<meta property="og:title" content="한판 윷놀이">\n<meta property="og:url" content="https://2juwon.github.io/yutnori/">\n<meta property="og:type" content="website">\n<meta name="theme-color" content="#c8372d">\n<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Crect x=%277%27 y=%273%27 width=%275%27 height=%2726%27 rx=%272.5%27 fill=%27%23b07a3c%27/%3E%3Crect x=%2714%27 y=%273%27 width=%275%27 height=%2726%27 rx=%272.5%27 fill=%27%23f0dcb0%27 stroke=%27%238a5a28%27/%3E%3Crect x=%2721%27 y=%273%27 width=%275%27 height=%2726%27 rx=%272.5%27 fill=%27%23b07a3c%27/%3E%3C/svg%3E">\n<meta property="og:description" content="도·개·걸·윷·모! 가족끼리 한 기기로, 또는 컴퓨터와 함께 하는 윷놀이">\n<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}[hidden]{display:none!important}</style>\n</head>\n<body>\n${body}\n</body>\n</html>\n`;
fs.writeFileSync(__dirname + '/index.html', page);
console.log('built', out.length, 'bytes');
