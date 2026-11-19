import {createWorker} from 'tesseract.js';import path from 'node:path';import {fileURLToPath} from 'node:url';import {extractInbody} from './inbody.js';
const image=process.argv[2];if(!image)throw Error('검사표 이미지 경로가 필요합니다.');const root=path.dirname(fileURLToPath(import.meta.url)),langPath=path.join(root,'dist','vendor','lang');const worker=await createWorker('kor',1,{langPath});try{const result=await worker.recognize(image);const fields=extractInbody(result.data.text);console.log(JSON.stringify({confidence:result.data.confidence,fields,lines:result.data.text.split(/\r?\n/).filter(x=>/체중|골격|체지방|BMI|인바디|기초대사|84\\.7|38\\.4|19\\.8/.test(x)).slice(0,25)},null,2))}finally{await worker.terminate()}




