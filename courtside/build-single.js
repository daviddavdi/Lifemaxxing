// Builds one self-contained HTML file (no external files): node build-single.js
const fs = require('fs'), path = require('path');
const dir = __dirname, rd = f => fs.readFileSync(path.join(dir, f), 'utf8');
let html = rd('index.html');
const icon = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(dir, 'icon.svg')).toString('base64');
const touch = 'data:image/png;base64,' + fs.readFileSync(path.join(dir, 'icon-192.png')).toString('base64');
html = html.replace(/<link rel="manifest"[^>]*>\n?/, '')
  .replace('href="icon.svg"', 'href="' + icon + '"')
  .replace('href="icon-192.png"', 'href="' + touch + '"')
  .replace('<link rel="stylesheet" href="css/style.css">', () => '<style>\n' + rd('css/style.css') + '\n</style>')
  .replace(/<script src="(js\/[^"]+)"><\/script>/g, (_, f) => {
    let js = rd(f).replace(/<\/script/gi, '<\\/script');
    if (f === 'js/ui.js') js = js.replace(/.*navigator\.serviceWorker\.register.*\n/, '');
    return '<script>\n' + js + '\n</script>';
  });
fs.mkdirSync(path.join(dir, 'dist'), { recursive: true });
fs.writeFileSync(path.join(dir, 'dist/courtside.html'), html);
console.log('dist/courtside.html', (html.length / 1024).toFixed(0) + ' KB');
