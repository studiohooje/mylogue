// 2026-11-27 대표님: 인바디 결과지 사진은 AI가 정해진 9곳만 읽고(검사일시·체중·체지방량·골격근량·BMI·체지방률·인바디점수·내장지방레벨·기초대사량),
// 읽은 숫자는 인바디 직접 입력 칸에 채워서 사람이 결과지와 비교한 뒤 저장한다. AI를 못 쓰는 상태면 예전 폰 글자 인식 화면으로.
import {$s,$f} from './app-state.js';
import {isPlus} from './plan.js';
import {photoQuota,usePhoto} from './input-sources.js';
import {openSnapCamera} from './snap-camera.js';
import {aiRequest,aiUsable} from './ai-client.js';

export function inbodyPrefill(r = {}, today = ''){
  const keys = ['weight', 'bodyFatMass', 'skeletalMuscle', 'bmi', 'bodyFatPct', 'score', 'visceralFatLevel', 'bmr'];
  const out = {source: 'inbody'};
  for (const k of keys) if (Number.isFinite(Number(r[k])) && r[k] !== null && r[k] !== '') out[k] = Number(r[k]);
  if (/^20\d\d-\d\d-\d\d$/.test(String(r.date || '')) && (!today || r.date <= today)) out.date = r.date;
  return out;
}
export function inbodyAiClick(t){
  if (t.dataset?.inbodyAi === undefined) return false;
  if (!aiUsable()) { $s.modal = 'inbody'; $f.render(); return true; }
  const q = photoQuota(isPlus());
  if (q.left <= 0) { $f.toast(`오늘 AI 사진 ${q.limit}번을 다 썼어요. 직접 입력해 주세요.`); return true; }
  openSnapCamera(async file => {
    try {
      $f.toast('결과지 숫자를 읽고 있어요…');
      const data = await $f.aiPhotoData(file);
      const r = await aiRequest('inbody', {images: [{media_type: 'image/jpeg', data}]});
      if (!r?.refunded) usePhoto();
      const p = inbodyPrefill(r?.inbody || {}, $f.today());
      $s.inbodyPrefill = p; $s.bodyKind = 'inbody'; $s.bodyDate = p.date || null; $s.bodyEditId = null; $s.modal = 'body'; $f.render();
      $f.toast('읽은 숫자를 결과지와 한 번 비교하고 저장해 주세요.');
    } catch (e) { $f.toast(e?.message || '결과지 숫자를 읽지 못했어요. 직접 입력해 주세요.'); }
  }, {title: '인바디 결과지 · 전체가 보이게'});
  return true;
}
