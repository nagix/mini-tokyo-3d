import fs from 'node:fs';
import path from 'node:path';

const source = 'assets';
const dest = process.argv[2] || 'dist/assets';
const files = fs.readdirSync(source).filter(file =>
    file === 'style.json' || /^dictionary-.*\.json$/.test(file)
);

fs.mkdirSync(dest, {recursive: true});
for (const file of files) {
    fs.copyFileSync(path.join(source, file), path.join(dest, file));
}

console.log(`Copied ${files.length} asset(s) from ${source} to ${dest}`);
