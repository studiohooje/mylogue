import {writeFile} from 'node:fs/promises';
import {anatomySvg} from '../../app/exercise-ui.js';

// Reuse MyWeightLog's own technical atlas illustration in a classic-script mockup.
const targets={
 leg:{primary:['quads'],secondary:['glutes','hamstrings']},
 vsquat:{primary:['quads','glutes'],secondary:['hamstrings','calves']},
 bench:{primary:['chest'],secondary:['shoulders','triceps']},
 lat:{primary:['back'],secondary:['biceps','shoulders']}
};
const result={};
for(const [key,{primary,secondary}] of Object.entries(targets))result[key]=['front','back'].map(side=>anatomySvg(primary,secondary,{side,key:`final-${key}`}));
await writeFile(new URL('./atlas-presets.js',import.meta.url),`window.MWL_ATLAS=${JSON.stringify(result)};\n`);
