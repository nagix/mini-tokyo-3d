import fs from 'node:fs';
import path from 'node:path';

const dest = 'build';

const copyEntry = src => {
    fs.cpSync(src, path.join(dest, path.basename(src)), {recursive: true});
};

fs.mkdirSync(dest, {recursive: true});

copyEntry('.npmignore');

for (const entry of fs.readdirSync('public')) {
    if (entry !== 'index.html') {
        copyEntry(path.join('public', entry));
    }
}

for (const entry of fs.readdirSync('dist')) {
    if (entry.startsWith('mini-tokyo-3d.min.')) {
        copyEntry(path.join('dist', entry));
    }
}

copyEntry('dist/assets');

console.log(`Assembled pages in ${dest}/`);
