// Static build for Netlify: copies the game into dist/ with Phaser bundled alongside it.
const fs = require('fs'), path = require('path');
const root = __dirname, out = path.join(root, 'dist');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'vendor'), { recursive: true });

fs.cpSync(path.join(root, 'src'), path.join(out, 'src'), { recursive: true });
fs.copyFileSync(path.join(root, 'node_modules/phaser/dist/phaser.min.js'), path.join(out, 'vendor/phaser.min.js'));

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  .replace('node_modules/phaser/dist/phaser.min.js', 'vendor/phaser.min.js');
fs.writeFileSync(path.join(out, 'index.html'), html);

console.log('built dist/');
