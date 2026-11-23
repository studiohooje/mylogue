import test from 'node:test';
import assert from 'node:assert/strict';
import {poseOf,pilatesArtFile,pilatesArtHTML} from '../pilates-art.js';
import {PILATES_DICT} from '../pilates-moves-data.js';

test('필라테스 동작 대부분이 자세 그림 하나에 묶인다',()=>{
 const none=PILATES_DICT.filter(r=>!poseOf(r[0],r[1]));
 assert.ok(none.length<=15,`자세 못 정한 동작 ${none.length}개`);
});
test('대표 동작은 맞는 자세로 간다',()=>{
 assert.equal(poseOf('헌드레드','매트'),'supinecurl');
 assert.equal(poseOf('풋워크','리포머'),'footwork');
 assert.equal(poseOf('스완','체어'),'prone');
 assert.equal(poseOf('풀업','체어'),'plank');// 체어 풀업은 매달리기가 아님
 assert.equal(poseOf('풀업','캐딜락'),'hang');
 assert.equal(poseOf('머메이드','리포머'),'sidebend');
});
test('모르는 동작은 기구 그림, 그것도 없으면 매트 그림',()=>{
 assert.equal(pilatesArtFile({name:'내맘대로 동작',apparatus:'아크 배럴'}),'pilates-arc-barrel');
 assert.equal(pilatesArtFile({name:'',apparatus:'기타'}),'pilates-mat-exercise-the-hundred');
 assert.match(pilatesArtHTML({name:'티저',apparatus:'매트'}),/pilates-pose-teaser\.webp/);
});
