import test from 'node:test';
import assert from 'node:assert/strict';
import {isFitness, cleanPlace, placeFromKakao, cleanGymPlaces, addGymPlace, removeGym, centerFor, gymSettingsHTML, gymMapHTML, mapResultsHTML, DEFAULT_CENTER} from '../places.js';
import {emptyDB, normalizeDB} from '../domain.js';

const kakaoDoc = {id:'123', place_name:'스포애니 역삼역점', road_address_name:'서울 강남구 테헤란로 146', address_name:'서울 강남구 역삼동 1', x:'127.035437758429', y:'37.4999899680186', category_name:'스포츠,레저 > 스포츠시설 > 헬스클럽 > 스포애니'};

test('장소: 카카오 결과를 지도 회사와 무관한 형식으로 바꾼다', () => {
 const p = placeFromKakao(kakaoDoc);
 assert.deepEqual(p, {name:'스포애니 역삼역점', address:'서울 강남구 테헤란로 146', lat:37.49999, lng:127.035438, provider:'kakao', providerId:'123', category:'스포애니'});
});

test('장소: 이름 없거나 좌표가 이상하면 정리한다', () => {
 assert.equal(cleanPlace({name:'  '}), null);
 const p = cleanPlace({name:'집', lat:'abc', lng:127, provider:'naver'});
 assert.equal(p.lat, null); assert.equal(p.lng, null); assert.equal(p.provider, 'manual');
 assert.equal(cleanPlace({name:'x', lat:95, lng:10}).lat, null);
});

test('장소: 추가하면 이름 목록과 위치 정보가 함께 저장되고, 삭제하면 둘 다 지운다', () => {
 let db = {settings:{gyms:['집']}};
 db = addGymPlace(db, placeFromKakao(kakaoDoc));
 assert.deepEqual(db.settings.gyms, ['집', '스포애니 역삼역점']);
 assert.equal(db.settings.gymPlaces['스포애니 역삼역점'].address, '서울 강남구 테헤란로 146');
 db = addGymPlace(db, {name:'회사 헬스장', provider:'manual'});
 assert.equal(db.settings.gymPlaces['회사 헬스장'], undefined, '위치 없는 직접 입력은 이름만');
 db = addGymPlace(db, placeFromKakao(kakaoDoc));
 assert.equal(db.settings.gyms.filter(x=>x==='스포애니 역삼역점').length, 1, '중복 없음');
 db = removeGym(db, '스포애니 역삼역점');
 assert.deepEqual(db.settings.gyms, ['집', '회사 헬스장']);
 assert.equal(db.settings.gymPlaces['스포애니 역삼역점'], undefined);
 assert.throws(() => addGymPlace(db, {name:''}));
});

test('장소: 가져오기 때 목록에 없는 이름의 위치 정보는 버린다', () => {
 const out = cleanGymPlaces({gyms:['A'], gymPlaces:{A:{address:'서울', lat:37.5, lng:127}, B:{address:'부산'}}});
 assert.deepEqual(Object.keys(out), ['A']);
 assert.equal(out.A.name, 'A');
 assert.deepEqual(cleanGymPlaces({gyms:['A'], gymPlaces:[]}), {});
 const raw = emptyDB(); raw.settings.gyms = ['A']; raw.settings.gymPlaces = {A:{address:'서울', lat:37.5, lng:127, provider:'kakao'}, Z:{address:'x'}};
 const db = normalizeDB(JSON.parse(JSON.stringify(raw)));
 assert.deepEqual(Object.keys(db.settings.gymPlaces), ['A']);
});

test('장소: 지도 시작 위치는 저장한 헬스장, 없으면 서울시청', () => {
 assert.equal(centerFor({settings:{}}).lat, DEFAULT_CENTER.lat);
 const db = addGymPlace({settings:{gyms:[]}}, placeFromKakao(kakaoDoc));
 assert.equal(centerFor(db).lat, 37.49999);
 assert.equal(centerFor(db).level, 4);
});

test('장소: 화면 — 검색 결과·주소·직접 입력·지도 버튼, 글자는 이스케이프', () => {
 const db = addGymPlace({settings:{gyms:['<집>']}}, placeFromKakao(kakaoDoc));
 const html = gymSettingsHTML(db, {q:'스포애니', status:'done', results:[placeFromKakao(kakaoDoc)]});
 assert.match(html, /id="gym-search-form"/);
 assert.match(html, /data-gym-pick="0"/);
 assert.match(html, /id="gym-map-open"/);
 assert.match(html, /id="gym-form"/);
 assert.match(html, /서울 강남구 테헤란로 146/);
 assert.match(html, /&lt;집&gt;/);
 assert.match(html, /위치 정보 없음/);
 assert.match(gymSettingsHTML(db, {status:'error', message:'지도를 불러오지 못했어요.'}), /이름만 직접 입력/);
 assert.match(gymSettingsHTML(db, {status:'done', results:[]}), /찾은 곳이 없어요/);
});

test('장소: 지도 화면 — 확대 안내, 근처 결과, 실패 안내', () => {
 assert.match(gymMapHTML({}), /id="gym-map"/);
 assert.match(gymMapHTML({}), /저장하지 않아요/);
 assert.match(mapResultsHTML({status:'zoom'}), /확대/);
 assert.match(mapResultsHTML({status:'done', results:[placeFromKakao(kakaoDoc)]}), /data-gym-mappick="0"/);
 assert.match(gymMapHTML({status:'error', message:'지도를 불러오지 못했어요.'}), /gym-map-error/);
});

test('장소: 지도 근처 목록은 운동시설 분류만 남긴다', () => {
 assert.equal(isFitness(kakaoDoc), true);
 assert.equal(isFitness({category_name:'과학,기술 > 연구소'}), false);
 assert.equal(isFitness({category_name:'스포츠,레저 > 요가,필라테스'}), true);
});
