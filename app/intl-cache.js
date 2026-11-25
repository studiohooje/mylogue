// 5.0.6 속도: 숫자에 옵션을 붙여 toLocaleString('ko-KR', {...})을 부르면 브라우저가 매번 형식기를 새로 만든다(5,000번에 약 90ms, 폰은 몇 배).
// 화면을 그릴 때마다 수백 번 부르므로, 같은 옵션의 형식기를 한 번 만들어 재사용한다(결과는 완전히 같다). 이 파일은 app.js가 가장 먼저 불러온다.
const orig = Number.prototype.toLocaleString;
const cache = new Map();
if (typeof Intl !== 'undefined' && !Number.prototype.toLocaleString.__mylogueCached) {
  const fast = function (locales, options) {
    if (locales === 'ko-KR' && options && typeof options === 'object') {
      let key; try { key = JSON.stringify(options); } catch { return orig.call(this, locales, options); }
      let f = cache.get(key);
      if (!f) { if (cache.size > 64) cache.clear(); f = new Intl.NumberFormat('ko-KR', options); cache.set(key, f); }
      return f.format(this);
    }
    return orig.call(this, locales, options);
  };
  fast.__mylogueCached = true;
  Number.prototype.toLocaleString = fast;
}
export {};
