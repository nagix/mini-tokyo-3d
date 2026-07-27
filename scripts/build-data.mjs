import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

fs.rmSync('build/data', {recursive: true, force: true});
fs.mkdirSync('build/data', {recursive: true});

execFileSync(process.execPath, ['dist/loader'], {stdio: 'inherit'});
