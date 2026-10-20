/** Build client.js from the wrapper plus the embedded component source. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const wrapperPath = resolve(root, 'src/wrapper.js');
const componentPath = resolve(root, 'src/reasoning-effort.js');
const outPath = resolve(root, 'client.js');

const wrapper = readFileSync(wrapperPath, 'utf8');
const component = readFileSync(componentPath, 'utf8').trim();
if (!wrapper.includes('//__COMPONENT__')) throw new Error('marker //__COMPONENT__ missing in wrapper');
if (component.includes('//__COMPONENT__')) throw new Error('component must not contain the marker');

writeFileSync(outPath, wrapper.replace('//__COMPONENT__', component));
console.log(`built ${outPath} (${component.length} component chars)`);
