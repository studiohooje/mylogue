# 야외 러닝 기록: 기록 항목 + PWA / Capacitor 8 Android에서 GPS 경로 기록의 실제 한계 (2026-11 기준)

## Q1. 주요 러닝 앱이 기록하는 항목과, 폰 GPS만으로 되는 것 vs 센서가 필요한 것

### Takeaway
거리·경과/이동 시간·페이스·스플릿·경로는 폰 GPS만으로 계산할 수 있습니다. 고도는 폰 GPS 고도만 쓰면 품질이 낮아 Strava도 지형 DB(basemap)로 보정합니다. 심박은 워치나 HR 스트랩이 반드시 필요하고, 케이던스는 폰 가속도계로 추정할 수 있지만 웹에서 직접 구현하기는 비현실적입니다. RPE·신발·메모는 사용자가 직접 입력하는 항목입니다.

### Cited Findings
- Nike Run Club은 페이스, 위치, 거리, 고도, 심박, 마일 스플릿을 추적한다고 소개합니다. 야외 러닝은 기기의 GPS와 가속도계(accelerometer)를 사용합니다. — [Nike: running goals](https://www.nike.com/a/running-goals), [Nike NRC settings help](https://www.nike.com/help/a/nrc-settings)
- NRC는 2020년 업데이트에서 러닝 후 요약에 cadence, fastest mile 등을 추가했습니다(2020년 정보). — [9to5mac 2020](https://9to5mac.com/2020/03/30/nike-run-club-update/), [iMore](https://www.imore.com/nike-run-club-gets-new-metrics-update)
- NRC 심박은 Apple Watch, Wear OS, 외부 심박계를 연결해야 기록됩니다. 폰 단독으로는 측정할 수 없습니다. — [Nike NRC settings help](https://www.nike.com/help/a/nrc-settings)
- Strava는 시간을 두 가지로 표시합니다. Elapsed time은 시작부터 종료까지 정지와 수동 일시정지를 모두 포함하고, Moving time은 정지 구간과 수동·자동 일시정지를 제외합니다. 예를 들어 60분 러닝에 20분을 쉬면 moving 50분, elapsed 80분이 됩니다. — [Suunto FAQ (Strava 데이터 차이)](https://www.suunto.com/Support/faq-articles/strava/the-training-data-in-my-suunto-watch-and-strava-shows-different-values-why/)
- Strava의 moving time, 평균 속도, 페이스는 GPS 데이터에 기반합니다. GPS 기록 간격이 길면 그 공백을 정지로 간주해 moving time이 부정확해질 수 있습니다. — [Suunto FAQ](https://www.suunto.com/Support/faq-articles/strava/the-training-data-in-my-suunto-watch-and-strava-shows-different-values-why/)
- 활동 파일에 pause 이벤트가 있으면 Strava 서버는 휴식 시간을 추가로 빼지 않습니다. pause 이벤트가 없으면 GPS 데이터로 moving time을 계산합니다(Suunto 커뮤니티 매니저가 Strava 지원 문서를 인용한 내용). — [Suunto forum](https://forum.suunto.com/topic/2585/strava-export-not-correctly-recording-pauses/34)
- Strava 서버 측 계산은 속도 임계값 미만인 상태가 15초 넘게 이어진 구간을 휴식으로 제거합니다. 러너용 실시간 자동 일시정지는 10초가 지나야 일시정지되고, 폰 버전은 걷기가 아니라 달리기를 시작해야 재개됩니다. 2014년 엔지니어링 글이라 현재 수치는 다를 수 있습니다(직접 열람 실패, 검색 요약 기준). — [Strava Engineering: Improving Auto-Pause](https://medium.com/strava-engineering/improving-auto-pause-for-everyone-13f253c66f9e)
- 고도:
  - 바리오(기압계) 기기는 기기가 잰 고도를 그대로 쓰고, 2m를 넘게 지속된 상승만 누적 상승에 반영합니다.
  - 폰처럼 GPS만 있는 기기는 "corrected elevation"을 씁니다. GPS 좌표를 Strava 고도 DB와 대조해 추정하고, 10m를 넘게 지속된 상승만 반영합니다.
  - basemap 품질이 나쁜 지역에서는 상승고가 부풀려질 수 있습니다.
  — [Strava Elevation FAQ](https://support.strava.com/hc/en-us/articles/115001294564-Elevation-on-Strava-FAQs)

### Inferences
- 항목별 데이터 출처 정리(인용 근거와 일반 지식을 합친 분류):
  - 폰 GPS만으로 가능: 경로(위경도 배열), 거리, elapsed/moving time, 평균·구간 페이스, 1km 스플릿, 최고 페이스
  - 가능하지만 품질 낮음: 고도와 누적 상승. 웹 `coords.altitude`는 null이거나 오차가 큽니다. 서버가 없으니 Strava식 DEM 보정도 어렵습니다.
  - 추정치: 칼로리(체중×거리 같은 공식). Mylogue에는 체중 데이터가 이미 있어 유리합니다.
  - 센서 필요: 심박(워치·스트랩), 정확한 케이던스(워치·풋팟, 또는 네이티브 가속도계/step counter)
  - 수동 입력: RPE(체감 강도), 신발, 날씨, 메모
- Mylogue MVP 범위는 "GPS 기반 핵심 지표 + 수동 입력(RPE·신발·메모) + 체중 기반 칼로리 추정"이 현실적입니다. 심박과 케이던스는 제외하거나 수동 입력 칸으로 두는 것이 맞습니다.
- moving time 계산은 Strava처럼 "속도가 임계값 미만인 상태가 N초 이상 이어진 구간 제외"라는 단순 규칙으로 구현할 수 있습니다.

### Gaps
- Strava 공식 "Moving Time Calculations" 문서(support.strava.com 115001188684)는 직접 열람하지 못해, 현재 속도 임계값은 확인하지 못했습니다.
- Garmin Connect의 공식 필드 목록은 조사하지 못했습니다.
- 칼로리 공식(MET 등)의 출처는 조사하지 않았습니다.

## Q2. 웹/PWA: 화면 꺼짐·백그라운드에서 watchPosition 동작, Wake Lock, 백그라운드 위치

### Takeaway
2026년 현재 PWA에는 백그라운드 위치 기능이 없습니다. Android Chrome과 iOS Safari·홈 화면 PWA 모두 화면이 꺼지거나 다른 앱으로 전환하면 위치 업데이트가 멈춘다고 보는 것이 안전합니다. Screen Wake Lock은 화면이 꺼지는 것만 막아 줄 뿐이고, 탭이 가려지거나 화면을 잠그면 자동 해제됩니다. 그래서 웹 러닝 기록은 "화면을 켜 두고 앱을 앞에 띄운 채 달리는" 방식만 가능하고, 배터리 소모가 큽니다.

### Cited Findings
- 2025-11-07 W3C geolocation-sensor issue #22("background 지원") 코멘트는 현재 웹의 위치 접근 상태를 이렇게 정리합니다(구현사 공식 답변이 아닌 커뮤니티 정리).
  - 위치는 앱이 열려 있고 화면이 잠금 해제된 Foreground 상태에서만 접근할 수 있습니다.
  - 다른 앱이 앞에 있거나 화면이 꺼진 상태(foreground extension)와 앱이 닫힌 상태(background)에서는 접근할 수 없습니다.
  - 작성자는 "foreground extension"을 허용하면 경로 추적에는 충분할 것이라며, PWA 설치를 조건으로 거는 방안을 제안했습니다. 공식 스펙 제안은 없습니다.
  — [W3C public-device-apis-log 2025-11](https://lists.w3.org/Archives/Public/public-device-apis-log/2025Nov/0012.html)
- Mozilla 버그 트래커에 따르면 Chrome Android는 앱이 백그라운드로 가면 watch를 유지하지 않습니다(오래된 버그 스레드). — [Bugzilla 1482733](https://bugzilla.mozilla.org/show_bug.cgi?id=1482733), [Bugzilla 1653549](https://bugzilla.mozilla.org/show_bug.cgi?id=1653549)
- PWA 기능 가이드는 기기 화면이 꺼지면 이 기능이 PWA에 위치 보고를 멈출 수 있다고 경고합니다. — [Progressier: Geolocation](https://progressier.com/pwa-capabilities/geolocation)
- Service Worker에서는 `navigator.geolocation`에 접근할 수 없습니다. 그래서 SW로 백그라운드 추적을 우회할 수 없습니다(검색 요약 기준). — [Progressier: Geolocation](https://progressier.com/pwa-capabilities/geolocation)
- WebKit 버그 스레드에 따르면 iOS WebKit은 화면이 꺼진 상태에서 웹사이트를 백그라운드로 계속 실행하는 것을 지원하지 않습니다(기능 요청 스레드). — [WebKit bug 193946](https://bugs.webkit.org/show_bug.cgi?id=193946)
- Ionic 포럼에도 PWA에서 watchPosition이 일시 중지된다는 사례 보고가 있습니다. — [Ionic forum](https://forum.ionicframework.com/t/pwa-geolocation-watchposition-pauses/231595)
- Screen Wake Lock API(MDN):
  - Baseline 2025 ("Newly available", 2025년 3월부터 주요 브라우저 지원)이고, HTTPS(secure context)에서만 동작합니다.
  - 배터리가 부족하거나 문서가 비활성·비가시 상태가 되면(탭·앱 전환) 시스템이 자동으로 해제합니다. 절전 모드에서는 요청 자체가 거부될 수 있습니다.
  - 해제된 sentinel은 재사용할 수 없으므로, `visibilitychange`에서 다시 요청해야 합니다.
  — [MDN Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API)
- caniuse 기준 Wake Lock은 iOS Safari 16.4 이상(26.x, 27.x 포함)과 Chrome Android에서 지원됩니다. iOS 홈 화면 PWA 관련 이슈로는 WebKit bug 205104가 링크되어 있습니다(내용은 미확인). — [caniuse wake-lock](https://caniuse.com/wake-lock), [WebKit bug 205104](https://bugs.webkit.org/show_bug.cgi?id=205104)
  - 참고: 일부 자료는 iOS 홈 화면 PWA에서 Wake Lock이 18.4 무렵에야 제대로 동작했다고 하지만 확인하지 못했습니다.
- iOS 17.4에서 EU 지역 홈 화면 웹앱이 비활성화된다는 발표가 있었습니다. 이후 철회되었다는 것은 일반 지식이며, 이 출처는 2024년 기사입니다. — [MacRumors 2024](https://www.macrumors.com/2024/02/15/ios-17-4-web-apps-removed-apple/)

### Inferences
- iPhone 사용자(PWA 전용)는 Wake Lock으로 화면을 켜 두고 앱을 앞에 띄운 채 달리는 경우에만 연속 기록이 됩니다. 화면이 잠기거나 다른 앱(음악 등)으로 전환하면 기록에 공백이 생깁니다. 따라서 다음 구현이 필요합니다.
  1. 복귀 시 마지막 점과 현재 점을 직선으로 이을지 공백으로 둘지 결정하는 정책
  2. elapsed time은 `Date.now()` 차이로 계산(타이머 콜백 누락에 강함)
  3. 공백 구간을 사용자에게 표시
- 대안으로 iPhone은 "실시간 기록 대신 수동 입력(거리·시간)"이나 "GPX 파일 가져오기"를 제공하는 편이 실용적일 수 있습니다.
- 화면을 계속 켜 두고 GPS를 high accuracy로 쓰면 배터리 소모가 매우 큽니다. 다크 UI와 최소 렌더링(지도 타일 미표시 등)이 권장됩니다. 구체적인 수치 출처는 찾지 못했습니다.

### Gaps
- iOS 26/27 Safari의 홈 화면 PWA에서 watchPosition이 화면 잠금 후 몇 초 만에 멈추는지 확인할 공식 WebKit 문서나 릴리스 노트는 찾지 못했습니다. 근거는 대부분 커뮤니티 보고입니다.
- Chrome Android에서 화면 꺼짐 후 정확한 중단 시점(즉시인지 수 분 뒤인지)에 대한 공식 문서는 없습니다.
- 웹 배터리 소모에 대한 정량 자료는 찾지 못했습니다.

## Q3. Capacitor 8 Android: @capacitor/geolocation vs @capacitor-community/background-geolocation vs Transistorsoft

### Takeaway
공식 `@capacitor/geolocation`(v8)은 백그라운드 추적을 지원하지 않습니다. `@capacitor-community/background-geolocation`(MIT, 무료)은 v1.2.27에서 Capacitor 8 지원을 추가했고, `foregroundServiceType="location"` foreground service와 상시 알림으로 화면이 꺼져도 추적합니다. Mylogue에 가장 맞는 선택입니다. Transistorsoft는 유료(앱당 $399부터 영구 라이선스)입니다.

### Cited Findings
- `@capacitor/geolocation`(Capacitor 8 문서):
  - Android 매니페스트에 `ACCESS_COARSE_LOCATION`과 `ACCESS_FINE_LOCATION`이 필요합니다.
  - 백그라운드 geolocation은 직접 지원하지 않습니다.
  - watch 옵션은 `enableHighAccuracy`(Android 12 이상에서 fine 권한이 없으면 무시), `timeout`(기본 10000), `maximumAge`, `minimumUpdateInterval`(기본 5000, Android 전용), `interval`(v8.0.0부터, Android 전용), `enableLocationFallback`(Play Services 실패 시 LocationManager로 대체, v8.0.0부터)입니다.
  - 지속 watch는 배터리 소모가 크다고 경고합니다.
  — [Capacitor Geolocation API docs](https://capacitorjs.com/docs/apis/geolocation)
- `@capacitor-community/background-geolocation`:
  - MIT 라이선스이고, changelog v1.2.27에 "Add support for Capacitor v8"이 있습니다. README의 호환표는 v7까지만 적혀 있어 갱신되지 않은 상태입니다.
  - 백그라운드에서 계속 업데이트를 받으려면 알림이 반드시 표시되어야 합니다. v1.2.18부터 백그라운드 watcher가 있으면 항상 알림을 표시합니다.
  - 백그라운드 5분 후 업데이트가 멈추는 것을 막으려면 Capacitor 설정에 `android.useLegacyBridge: true`가 필요합니다.
  - Android는 백그라운드 5분 이후 WebView HTTP를 throttle하므로, 서버 전송이 필요하면 CapacitorHttp 같은 네이티브 HTTP를 써야 합니다.
  - Android 13 이상에서는 `POST_NOTIFICATIONS` 런타임 권한이 필요합니다.
  - iOS에는 Info.plist에 `UIBackgroundModes: location`과 Always/WhenInUse 설명이 필요합니다.
  — [GitHub: capacitor-community/background-geolocation](https://github.com/capacitor-community/background-geolocation)
- addWatcher 옵션: `backgroundMessage`(백그라운드 업데이트에 필수인 알림 본문), `backgroundTitle`(기본 "Using your location"), `requestPermissions`(기본 true), `stale`(기본 false), `distanceFilter`(m, 기본 0). 설치는 `npm install @capacitor-community/background-geolocation` 후 `npx cap update`입니다. — [README](https://raw.githubusercontent.com/capacitor-community/background-geolocation/master/README.md)
- 플러그인 AndroidManifest가 병합하는 권한은 `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS`입니다. 서비스는 `BackgroundGeolocationService`이고 `android:foregroundServiceType="location"`입니다. `ACCESS_BACKGROUND_LOCATION`은 선언하지 않습니다. — [plugin AndroidManifest.xml](https://raw.githubusercontent.com/capacitor-community/background-geolocation/master/android/src/main/AndroidManifest.xml)
- Transistorsoft 라이선스는 앱 식별자 단위의 영구 라이선스이고 1년 업데이트가 포함됩니다. Starter $399(1앱), Venture $599(5앱), Pro $749(25앱), Studio $999(100앱)입니다. — [Transistorsoft shop](https://shop.transistorsoft.com/)
  - 디버그 빌드 무료 여부와 Capacitor 8 지원 여부는 쇼핑 페이지에 명시되어 있지 않습니다. 일반적으로 "Android 디버그 빌드는 무료, release는 라이선스 키 필요"로 알려져 있지만 이번에 확인하지는 못했습니다.

### Inferences
- `ACCESS_BACKGROUND_LOCATION` 없이 foreground service 방식만 쓰므로, 사용자가 앱 안에서 "러닝 시작"을 누를 때(앱이 화면에 보일 때) watcher를 시작하는 흐름이면 "앱 사용 중에만 허용" 권한으로 충분합니다(Q4 참고).
- GPS 점은 WebView JS 콜백으로 전달됩니다. 따라서 Firebase 업로드는 러닝 종료 후 포그라운드에서 한 번에 하고, 러닝 중에는 localStorage나 IndexedDB에 쌓아 두는 방식이 throttle 문제를 피합니다.
- 삼성 등 일부 제조사의 공격적인 배터리 최적화는 foreground service도 종료시킬 수 있다는 커뮤니티 보고가 널리 있습니다. 이번 조사에서 출처를 확보하지는 못했으므로 실기기 테스트가 필요합니다.

### Gaps
- capacitor-community 플러그인의 최신 버전 번호(1.2.27 이후)와 Android 16에서의 실측 안정성은 확인하지 못했습니다.
- Transistorsoft Capacitor 8 지원 문서(docs.transistorsoft.com/capacitor/)는 열람하지 못했습니다.
- Ionic의 `@capacitor/geolocation` v8이 내부적으로 쓰는 ion-android-geolocation의 백그라운드 동작은 문서화되어 있지 않습니다.

## Q4. Android 14/15/16 규칙과 Google Play 정책 (현재는 debug APK 사이드로드)

### Takeaway
Android 공식 문서는 foreground service로 접근하는 위치를 "foreground location"으로 분류합니다. 따라서 사용자가 시작한 러닝 추적은 `ACCESS_BACKGROUND_LOCATION` 없이 FGS type `location`, `FOREGROUND_SERVICE_LOCATION`, fine/coarse 권한으로 처리할 수 있습니다. 사이드로드 APK는 Play 심사 대상이 아닙니다. Play에 올리게 되면 Play Console에서 FGS 타입 선언이 필요하고, 백그라운드 위치를 선언하지 않으면 무거운 위치 권한 심사(영상, 신고서)는 대체로 피할 수 있습니다.

### Cited Findings
- 시스템이 foreground location으로 간주하는 경우는 두 가지입니다. (1) 앱의 activity가 화면에 보일 때, (2) 앱이 foreground service를 실행 중일 때. FGS 실행 중에는 상시 알림이 표시되고, 사용자가 Home을 누르거나 화면을 꺼도 접근이 유지됩니다. Android 10(API 29) 이상에서는 `foregroundServiceType="location"` 선언이 필수입니다. — [Android: Location permissions](https://developer.android.com/develop/sensors-and-location/location/permissions)
- background location은 위 두 상황 이외의 접근을 뜻합니다. Android 10 이상에서는 `ACCESS_BACKGROUND_LOCATION`을 선언해야 합니다. 대표 예시는 지속적인 위치 공유와 Geofencing입니다. — [같은 문서](https://developer.android.com/develop/sensors-and-location/location/permissions)
- 정밀도: approximate는 약 3㎢ 수준이고, precise는 보통 50m 이내이며 몇 m 이하일 때도 있습니다. 사용자가 approximate만 허용하면 선언한 권한과 상관없이 대략적인 위치만 받습니다. 러닝에는 precise가 필수이므로, 정밀 위치로 업그레이드를 요청하는 흐름이 필요합니다. — [같은 문서](https://developer.android.com/develop/sensors-and-location/location/permissions)
- 배터리 세이버: Android 12 이상에서 `getLocationPowerSaveMode()`가 `LOCATION_MODE_FOREGROUND_ONLY`를 반환하면, 포그라운드나 FGS 실행 중에는 화면이 꺼져도 위치 업데이트가 계속됩니다. — [같은 문서](https://developer.android.com/develop/sensors-and-location/location/permissions)
- 신규 규칙: Android 17(API 37) 이상을 타깃으로 하면서 세션 단위 위치 기능만 있는 앱은 Play 정책상 "location button"을 써야 합니다. Mylogue는 target 36이라 현재는 해당 없지만, 향후 target을 올릴 때 확인해야 합니다. — [같은 문서](https://developer.android.com/develop/sensors-and-location/location/permissions), [Play location button policy](https://support.google.com/googleplay/android-developer/answer/16909972)
- Android 14(API 34)부터는 모든 FGS에 타입 선언과 타입별 권한(`FOREGROUND_SERVICE_LOCATION`)이 필요하고, `FOREGROUND_SERVICE`도 함께 필요합니다. `location` 타입을 시작하려면 위치 서비스가 켜져 있고 COARSE 또는 FINE 런타임 권한이 허용되어 있어야 합니다. — [Android FGS types](https://developer.android.com/develop/background-work/services/fgs/service-types)
- 위치 권한은 while-in-use 제한을 받습니다. 그래서 `ACCESS_BACKGROUND_LOCATION`이 없으면 앱이 백그라운드에 있는 동안 location FGS를 새로 시작할 수 없습니다. 반드시 앱이 보이는 상태에서 시작해야 합니다. — [Android FGS types](https://developer.android.com/develop/background-work/services/fgs/service-types)
- 대안 타입으로 `health` FGS(운동 트래커용)가 있지만, 사전 조건이 `ACTIVITY_RECOGNITION`이나 `HIGH_SAMPLING_RATE_SENSORS` 등이라 위치 추적에는 `location` 타입이 정석입니다. — [Android FGS types](https://developer.android.com/develop/background-work/services/fgs/service-types)
- Play 정책: 앱이 Android 14 이상을 타깃으로 하면 Play Console의 Policy > App content에서 FGS 타입을 선언해야 합니다. — [Android FGS types](https://developer.android.com/develop/background-work/services/fgs/service-types), [Play FGS 요구사항](https://support.google.com/googleplay/android-developer/answer/13392821)
- Play 위치 정책:
  - 백그라운드 위치는 핵심 기능에 필요할 때만 허용됩니다.
  - FGS 위치 사용은 사용자가 앱 안에서 시작한 동작의 연장이어야 하고, 작업이 끝나면 즉시 중지해야 합니다.
  - FGS 위치 사용이 `ACCESS_BACKGROUND_LOCATION`과 동등하면 백그라운드 요구사항이 적용됩니다.
  — [Play Console: Location permissions](https://support.google.com/googleplay/android-developer/answer/9799150)
- 백그라운드 위치 신고 요건:
  - targetSdk 29 이상이면서 `ACCESS_BACKGROUND_LOCATION`을 포함할 때 신고서가 필요합니다. 위치는 Sensitive app permissions > Location permissions입니다.
  - 약 30초 분량의 영상(기능 활성화, prominent disclosure, 권한 프롬프트 시연)이 필요합니다.
  - 권한 요청 전에 "location"이라는 단어와 "앱이 닫혀 있을 때" 같은 문구를 담은 prominent disclosure 대화상자를 보여 줘야 합니다.
  - 위치 데이터를 다루는 개인정보처리방침 URL이 필요합니다.
  — [Play Console: Location permissions](https://support.google.com/googleplay/android-developer/answer/9799150)
- Android 11 이상에서 백그라운드 위치("항상 허용")는 시스템 대화상자로 허용할 수 없고, 사용자가 설정 화면에서 직접 켜야 합니다. — [Android: background location](https://developer.android.com/develop/sensors-and-location/location/permissions/background)

### Inferences
- 사이드로드 debug APK는 Play 정책이 적용되지 않습니다. 그래도 OS 규칙은 그대로 적용됩니다: target 36에서 FGS 타입 선언, `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS` 런타임 요청, 앱이 보이는 상태에서 시작.
- Play에 출시할 때 할 일:
  1. Play Console에서 FGS(location) 사용을 선언합니다. 사용 사례와 영상을 요구받을 수 있습니다.
  2. 개인정보처리방침에 위치 데이터 항목을 넣습니다.
  3. Data safety 섹션에 정밀 위치 수집 여부를 기재합니다(일반 지식, 출처 미확보).
  4. `ACCESS_BACKGROUND_LOCATION`을 넣지 않으면 백그라운드 위치 신고서는 피할 수 있습니다. 서드파티 플러그인이 그 권한을 병합하지 않는지 병합된 매니페스트로 확인해야 합니다. capacitor-community 플러그인은 넣지 않습니다.
- target을 37 이상으로 올리게 되면 location button 정책이 "세션 단위 위치만 있는 앱"에 적용됩니다. 지속 추적 FGS가 있는 앱도 적용 대상인지는 정책 원문 확인이 필요합니다.

### Gaps
- Play FGS 선언 페이지(answer/13392821)는 직접 열람하지 않았습니다. location 타입에 영상 제출이 필요한지는 미확인입니다.
- Android 16에서 location FGS에 추가된 제한이 있는지는 조사 범위 안에서 찾지 못했습니다.
- location button 정책(answer/16909972)의 세부 내용은 미열람입니다.

## Q5. GPS 트랙 품질(지터 필터링, 자동 일시정지, 거리 스무딩)과 경로 저장 시 개인정보

### Takeaway
단순 앱에서 흔히 쓰는 방법은 다섯 가지입니다. (1) accuracy가 큰 점 버리기, (2) 최소 이동거리 필터, (3) 비현실적 속도 점 제거, (4) 저속이 N초 이어지면 자동 일시정지, (5) 고도는 큰 임계값으로 누적. 개인정보 쪽에서는 시작·종료점이 집 위치를 드러내므로 공유나 표시 단계에서 앞뒤 일부를 가리는 것이 업계 관행입니다. 다만 이 항목은 대부분 1차 출처를 확보하지 못했습니다.

### Cited Findings
- Strava는 폰 GPS 고도에 대해 10m 넘게 지속된 상승만 누적합니다. 기압계 기기는 2m 기준입니다. 이는 GPS 고도 노이즈를 걸러내는 히스테리시스 방식으로 볼 수 있습니다. — [Strava Elevation FAQ](https://support.strava.com/hc/en-us/articles/115001294564-Elevation-on-Strava-FAQs)
- 자동 일시정지와 moving time: 속도 임계값 미만이 15초 넘게 이어지면 휴식으로 처리합니다(서버). 실시간 자동 일시정지는 10초 후에 걸리고, 폰은 달리기를 시작해야 재개합니다(2014 자료). — [Strava Engineering](https://medium.com/strava-engineering/improving-auto-pause-for-everyone-13f253c66f9e)
- GPS 샘플링 간격이 길면 공백이 정지로 오인되어 moving time이 왜곡됩니다. — [Suunto FAQ](https://www.suunto.com/Support/faq-articles/strava/the-training-data-in-my-suunto-watch-and-strava-shows-different-values-why/)
- Android precise 위치는 보통 50m 이내이고 때로 몇 m 이하입니다. 즉 점마다 오차 편차가 큽니다. — [Android Location permissions](https://developer.android.com/develop/sensors-and-location/location/permissions)
- background-geolocation 플러그인은 `distanceFilter`(m)와 `stale`(GPS fix 전에 오래된 위치를 받을지 여부) 옵션을 제공해 1차 필터 역할을 합니다. — [README](https://raw.githubusercontent.com/capacitor-community/background-geolocation/master/README.md)

### Inferences
(아래는 일반적인 엔지니어링 관행이며, 이번에 1차 출처를 확보하지 못한 권장안입니다.)
- 점 필터:
  - `coords.accuracy`가 20~30m를 넘는 점은 버립니다.
  - 시작 직후 첫 몇 점(GPS가 안정되기 전)은 버립니다.
  - 직전 점과의 거리를 시간으로 나눈 속도가 러닝으로 불가능한 수준(예: 시속 30km 초과, 8m/s 초과)이면 버립니다.
- 거리 누적: 하버사인 거리를 쓰고, 직전 "채택점"에서 accuracy 이상(또는 3~5m 이상) 떨어졌을 때만 누적합니다. 서 있을 때 생기는 지터 누적을 막기 위해서입니다. 더 정교하게 하려면 1D 칼만 필터나 이동평균으로 좌표를 스무딩합니다.
- 자동 일시정지: 최근 N초(예: 10초) 동안 이동 속도가 임계값(예: 1m/s) 미만이면 pause하고, 임계값을 넘으면 resume합니다. 수동 pause 이벤트를 따로 기록해 두면 elapsed와 moving을 둘 다 계산할 수 있습니다.
- 스플릿: 누적 거리가 1km 경계를 넘는 시점을 선형 보간해 구간 시간을 구합니다.
- 저장량: 1초 간격 점을 [lat, lng, t, acc] 배열로 저장하면 1시간에 약 3,600점입니다. Firestore 문서 1MB 한도를 고려해 Douglas-Peucker로 단순화하거나 encoded polyline으로 압축하는 방식을 검토할 만합니다(한도 수치는 일반 지식).
- 개인정보:
  - 경로의 시작·종료점은 집이나 직장을 노출합니다. 일반 지식으로 Strava에는 "Map Visibility / 시작·끝 지점 숨기기" 기능이 있습니다(이번에 1차 출처 미확인).
  - Mylogue는 개인 앱이고 Firebase에 본인 데이터만 저장하므로 공개 노출 위험은 낮습니다. 그래도 앞으로 공유나 이미지 내보내기 기능을 만든다면 앞뒤 200~500m를 자르거나 가리는 옵션을 권장합니다.
  - Firestore 보안 규칙으로 본인 uid만 읽을 수 있게 해야 합니다.
  - 위치 데이터를 수집한다는 사실을 개인정보처리방침에 명시해야 합니다. Play 출시 시 필수입니다([Play 위치 정책](https://support.google.com/googleplay/android-developer/answer/9799150)).

### Gaps
- Strava, Garmin의 GPS 스무딩 알고리즘에 대한 공식 자료는 찾지 못했습니다.
- Strava Privacy Zones / Map Visibility 공식 문서는 열람하지 못했습니다.
- 칼만 필터 등 필터링 기법의 레퍼런스 구현 출처는 조사하지 않았습니다.
