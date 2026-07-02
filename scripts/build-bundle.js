#!/usr/bin/env node
// Inlines css/style.css, js/data.js and js/app.js into index.html so the
// whole app can be shared/previewed as a single self-contained HTML file.
// Usage: node scripts/build-bundle.js [outfile]

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "css/style.css"), "utf8");
const dataJs = fs.readFileSync(path.join(root, "js/data.js"), "utf8");
const appJs = fs.readFileSync(path.join(root, "js/app.js"), "utf8");

let out = html
  .replace('<link rel="stylesheet" href="css/style.css" />', `<style>\n${css}\n</style>`)
  .replace('<script src="js/data.js"></script>\n<script src="js/app.js"></script>',
    `<script>\n${dataJs}\n</script>\n<script>\n${appJs}\n</script>`);

const outfile = process.argv[2] || path.join(root, "dist/wienerisch.bundle.html");
fs.mkdirSync(path.dirname(outfile), { recursive: true });
fs.writeFileSync(outfile, out);
console.log("Bundled ->", outfile);
