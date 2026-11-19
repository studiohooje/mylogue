# AI → 마이로그 기록 파일 (JSON 가져오기 형식)

> 이전 앱(마웨로그)의 `myweightlog.meal`·`myweightlog.workout`·`myweightlog.body`·`myweightlog.backup` 파일도 그대로 가져올 수 있다(3.0.0부터 호환).

외부 AI API 없이 Codex가 기록 파일을 만들어 주는 방식이다. Codex가 만든 JSON을 마이로그에서 열고, **미리보기를 원본과 비교한 뒤 사용자가 저장**한다. 파일을 만든 것만으로 앱 데이터가 자동 갱신되지는 않는다.

## 식단 파일

```json
{
  "type": "mylogue.meal",
  "version": 1,
  "meal": {
    "date": "2026-11-01",
    "slot": "점심",
    "name": "예시 식사",
    "calories": 500,
    "carbs": 55,
    "protein": 35,
    "fat": 15,
    "note": "예시 수치. 실제 음식표를 확인하세요."
  }
}
```

## 운동 파일

```json
{
  "type": "mylogue.workout",
  "version": 1,
  "workout": {
    "date": "2026-11-01",
    "title": "예시 상체 운동",
    "duration": 50,
    "exercises": [
      {
        "name": "벤치프레스",
        "part": "가슴",
        "sets": [
          {"weight": 40, "reps": 8, "type": "워밍업", "rpe": 5},
          {"weight": 60, "reps": 8, "type": "본세트", "rpe": 8}
        ]
      }
    ],
    "note": "예시 기록"
  }
}
```

`date`는 `YYYY-MM-DD`, 중량은 kg, 시간은 분, 영양값은 g·kcal이다. 실제 측정·영양 정보를 모르면 임의의 숫자를 채우지 말고 빈 값으로 두거나 사용자에게 확인한다. 파일에는 건강 정보가 들어갈 수 있으므로 공개 저장소에 올리지 않는다. 인바디에는 기존 `mylogue.body` 형식을 사용한다.
