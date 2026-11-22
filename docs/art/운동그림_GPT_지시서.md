# 운동 그림 GPT 지시서

마이로그 종목 그림을 GPT로 만들 때 쓰는 문서예요. 그림체는 2026-11-22 테스트 4장(랫풀다운·레그프레스·바벨 스쿼트·필라테스 리포머)으로 정했어요.

## 쓰는 법

1. **GPT 새 대화를 열고 아래 '① 브리핑'을 먼저 보내요.** GPT가 규칙을 요약해 답할 때까지 그림은 시키지 않아요.
2. **한 메시지에 한 장씩 보내요.** 각 종목의 회색 상자를 그대로 복사해 붙이면 돼요. 상자 맨 위 줄이 번호와 파일 이름이에요.
3. **받은 그림은 상자에 적힌 파일 이름으로 저장해요.** 예: `barbell-back-squat.png`. 이 이름대로 저장해야 앱에 바로 넣을 수 있어요. 저장 위치는 `Mylogue/app/exercise-art/`예요. 폴더가 없으면 만들어 주세요.
4. **대화가 길어지면 그림체가 흐트러질 수 있어요.** 대략 30장마다 새 대화를 열고, ① 브리핑과 함께 기준 그림 2장(예: 스쿼트·랫풀다운)을 다시 올려 주세요.
5. **문제가 보이면 아래 '② 고쳐 달라는 말'에서 골라 보내요.**

종목 목록과 파일 이름은 `exercise-art-list.csv`에도 같이 정리돼 있어요. 진행 상황 체크용으로 써 주세요.

## ① 브리핑 (새 대화 첫 메시지)

```
안녕. 운동 기록 앱 "마이로그(Mylogue)"에 들어갈 운동 그림을 200장 넘게 같은 그림체로 만들 거야. 그림을 그리기 전에 상황과 규칙부터 설명할게.

[앱과 그림의 역할]
마이로그는 체중·식단·운동을 기록하는 앱이고, 화면 전체가 짙은 남색(#101625) 어두운 테마야. 운동을 기록할 때 목록에서 종목을 고르는데, 이름만 보고는 초보자가 어떤 운동인지 몰라서 종목마다 작은 그림을 붙이려고 해. 목록에서는 48px 정도로 아주 작게 보이니까, 작게 줄여도 "아, 이 운동" 하고 알아볼 수 있는 단순한 실루엣이 제일 중요해.
- 머신 운동이면 사람 없이 그 머신만 그려. 특정 브랜드가 아니라 어느 헬스장에나 있는 보편적인 모양으로.
- 프리웨이트, 맨몸, 케이블, 필라테스, 요가, 유산소 운동은 사람 모형이 그 동작의 대표 자세를 잡은 모습으로 그려.
- 러닝머신, 실내 자전거, 로잉 머신 같은 유산소 기구는 사람 없이 기구만 그려.

[그림체 — 모든 그림에 똑같이]
- 굵고 둥근 외곽선이 있는 평면 아이콘 스타일. 3D·사진 같은 표현·그라데이션은 쓰지 마.
- 면은 진한 남색(#1F2B47) 단색. 모든 덩어리를 연한 아이스 화이트(#DDE7F0) 외곽선이 감싸서, 남색 배경 위에서도 또렷하게 보여야 해.
- 강조색은 민트(#8CE4E0) 하나만 써. 머신이면 사용자가 움직이는 부분(손잡이, 패드, 발판)을, 사람이면 주로 쓰는 근육 부위를 칠해.
- 움직이는 방향은 작은 연보라(#B8AAF2) 화살표 하나로 표시해.
- 사람 모형은 얼굴·옷·머리카락·피부색이 없는, 성별 구분 없는 둥근 실루엣 마네킹이야. 관절 각도는 실제 운동 자세처럼 정확하게 그려.
- 기구는 작은 부품을 빼고 큰 덩어리만 그려. 사람과 기구가 겹치는 곳은 살짝 띄워서 실루엣이 한 덩어리로 뭉치지 않게 해.
- 배경은 반드시 투명 PNG. 흰 배경은 절대 안 돼. 바닥 그림자는 아주 옅은 타원 하나만 허용해.
- 캔버스는 정사각형 1024x1024. 대상은 가운데에 두고 화면의 약 80%를 채워.
- 글자, 숫자, 로고, 브랜드, 워터마크, 배경 풍경은 절대 넣지 마.

[진행 방식]
지금은 그리지 말고, 이해했으면 규칙을 네 말로 4~5줄로 요약해 줘. 그다음부터 내가 "N번 그림. 파일 이름: ○○.png / SUBJECT: …" 형식으로 한 장씩 보낼게. 매번 위 규칙을 그대로 지켜서 투명 배경 PNG 한 장만 만들어 줘.
```

## ② 고쳐 달라는 말 (필요할 때 골라서)

```
배경이 흰색이야. 같은 그림을 투명 배경으로 다시.
```
```
글자(또는 로고)가 들어갔어. 글자를 모두 빼고 다시.
```
```
기구가 너무 복잡해. 큰 덩어리만 남기고 더 단순하게 다시.
```
```
사람과 기구가 겹쳐서 덩어리처럼 보여. 겹치는 곳을 조금 띄워서 다시.
```
```
앞에 그린 그림들과 선 굵기·색이 달라. 첫 그림(기준)과 똑같은 스타일로 다시.
```
```
자세가 틀렸어: (무엇이 틀렸는지). 실제 운동 자세대로 다시.
```

## ③ 종목별 지시 (229개)

부위 순서는 가슴, 등, 하체, 어깨, 팔, 복근, 전신, 유산소, 필라테스, 요가, 기타예요. 그림 종류는 '머신'(사람 없음), '유산소 기구'(사람 없음), '사람+도구', '사람(유산소·요가 등)', '필라테스 기구+사람'으로 나눴어요.

## 가슴 (27개)

### 1. 벤치프레스 → `barbell-flat-bench-press.png` · 사람+도구
```
1번 그림. 파일 이름: barbell-flat-bench-press.png
SUBJECT: The mannequin performing barbell flat bench press, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (barbell with one plate each side) simply. Highlight in mint: the chest and triceps. Lavender arrow: the main direction of movement.
```

### 2. 인클라인 벤치프레스 → `barbell-incline-bench-press.png` · 사람+도구
```
2번 그림. 파일 이름: barbell-incline-bench-press.png
SUBJECT: The mannequin performing barbell incline bench press, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (barbell with one plate each side) simply. Highlight in mint: the chest and triceps. Lavender arrow: the main direction of movement.
```

### 3. 덤벨 벤치프레스 → `dumbbell-flat-bench-press.png` · 사람+도구
```
3번 그림. 파일 이름: dumbbell-flat-bench-press.png
SUBJECT: The mannequin performing dumbbell flat bench press, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the chest and triceps. Lavender arrow: the main direction of movement.
```

### 4. 클로즈그립 벤치프레스 → `close-grip-barbell-bench-press.png` · 사람+도구
```
4번 그림. 파일 이름: close-grip-barbell-bench-press.png
SUBJECT: The mannequin performing close-grip barbell bench press, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (barbell with one plate each side) simply. Highlight in mint: the triceps and chest. Lavender arrow: the main direction of movement.
```

### 5. 원암 덤벨 체스트프레스 → `single-arm-dumbbell-chest-press-on-a-flat-bench.png` · 사람+도구
```
5번 그림. 파일 이름: single-arm-dumbbell-chest-press-on-a-flat-bench.png
SUBJECT: The mannequin performing single-arm dumbbell chest press on a flat bench, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the chest and triceps. Lavender arrow: the main direction of movement.
```

### 6. 체스트 프레스 → `seated-chest-press.png` · 머신
```
6번 그림. 파일 이름: seated-chest-press.png
SUBJECT: A generic seated chest press (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 7. 케이블 플라이 → `standing-cable-fly.png` · 사람+도구
```
7번 그림. 파일 이름: standing-cable-fly.png
SUBJECT: The mannequin performing standing cable fly, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (cable station: simple upright column with a pulley and cable) simply. Highlight in mint: the chest. Lavender arrow: the main direction of movement.
```

### 8. 푸시업 → `push-up.png` · 사람+도구
```
8번 그림. 파일 이름: push-up.png
SUBJECT: The mannequin performing push-up, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the chest. Lavender arrow: the main direction of movement.
```

### 9. 딥스 → `parallel-bar-dips.png` · 사람+도구
```
9번 그림. 파일 이름: parallel-bar-dips.png
SUBJECT: The mannequin performing parallel bar dips, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the chest. Lavender arrow: the main direction of movement.
```

### 10. 인클라인 덤벨 프레스 → `incline-dumbbell-press.png` · 사람+도구
```
10번 그림. 파일 이름: incline-dumbbell-press.png
SUBJECT: The mannequin performing incline dumbbell press, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the chest and shoulders (deltoids). Lavender arrow: the main direction of movement.
```

### 11. 디클라인 벤치프레스 → `decline-barbell-bench-press.png` · 사람+도구
```
11번 그림. 파일 이름: decline-barbell-bench-press.png
SUBJECT: The mannequin performing decline barbell bench press, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (barbell with one plate each side) simply. Highlight in mint: the chest and triceps. Lavender arrow: the main direction of movement.
```

### 12. 디클라인 덤벨 프레스 → `decline-dumbbell-press.png` · 사람+도구
```
12번 그림. 파일 이름: decline-dumbbell-press.png
SUBJECT: The mannequin performing decline dumbbell press, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the chest and triceps. Lavender arrow: the main direction of movement.
```

### 13. 덤벨 플라이 → `flat-bench-dumbbell-fly.png` · 사람+도구
```
13번 그림. 파일 이름: flat-bench-dumbbell-fly.png
SUBJECT: The mannequin performing flat bench dumbbell fly, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the chest. Lavender arrow: the main direction of movement.
```

### 14. 인클라인 덤벨 플라이 → `incline-bench-dumbbell-fly.png` · 사람+도구
```
14번 그림. 파일 이름: incline-bench-dumbbell-fly.png
SUBJECT: The mannequin performing incline bench dumbbell fly, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the chest and shoulders (deltoids). Lavender arrow: the main direction of movement.
```

### 15. 펙덱 플라이 → `pec-deck-machine.png` · 머신
```
15번 그림. 파일 이름: pec-deck-machine.png
SUBJECT: A generic pec deck (butterfly) machine (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 16. 인클라인 체스트 프레스 머신 → `incline-chest-press-machine.png` · 머신
```
16번 그림. 파일 이름: incline-chest-press-machine.png
SUBJECT: A generic incline chest press machine (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 17. 디클라인 체스트 프레스 머신 → `decline-chest-press-machine.png` · 머신
```
17번 그림. 파일 이름: decline-chest-press-machine.png
SUBJECT: A generic decline chest press machine (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 18. 아이소래터럴 체스트 프레스 → `plate-loaded-iso-lateral-chest-press-machine.png` · 머신
```
18번 그림. 파일 이름: plate-loaded-iso-lateral-chest-press-machine.png
SUBJECT: A generic plate-loaded iso-lateral chest press machine (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 19. 케이블 크로스오버 → `cable-crossover.png` · 사람+도구
```
19번 그림. 파일 이름: cable-crossover.png
SUBJECT: The mannequin performing cable crossover (high pulleys, hands meet in front of hips), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (cable station: simple upright column with a pulley and cable) simply. Highlight in mint: the chest. Lavender arrow: the main direction of movement.
```

### 20. 로우 투 하이 케이블 플라이 → `low-to-high-cable-fly.png` · 사람+도구
```
20번 그림. 파일 이름: low-to-high-cable-fly.png
SUBJECT: The mannequin performing low-to-high cable fly, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (cable station: simple upright column with a pulley and cable) simply. Highlight in mint: the chest and shoulders (deltoids). Lavender arrow: the main direction of movement.
```

### 21. 스미스 벤치프레스 → `smith-machine-bench-press.png` · 사람+도구
```
21번 그림. 파일 이름: smith-machine-bench-press.png
SUBJECT: The mannequin performing Smith machine bench press, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (Smith machine: two vertical rails with a guided bar) simply. Highlight in mint: the chest and triceps. Lavender arrow: the main direction of movement.
```

### 22. 스미스 인클라인 프레스 → `smith-machine-incline-press.png` · 사람+도구
```
22번 그림. 파일 이름: smith-machine-incline-press.png
SUBJECT: The mannequin performing Smith machine incline press, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (Smith machine: two vertical rails with a guided bar) simply. Highlight in mint: the chest and shoulders (deltoids). Lavender arrow: the main direction of movement.
```

### 23. 인클라인 푸시업 → `incline-push-up-with-hands-on-a-bench.png` · 사람+도구
```
23번 그림. 파일 이름: incline-push-up-with-hands-on-a-bench.png
SUBJECT: The mannequin performing incline push-up with hands on a bench, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the chest and triceps. Lavender arrow: the main direction of movement.
```

### 24. 디클라인 푸시업 → `decline-push-up-with-feet-on-a-bench.png` · 사람+도구
```
24번 그림. 파일 이름: decline-push-up-with-feet-on-a-bench.png
SUBJECT: The mannequin performing decline push-up with feet on a bench, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the chest and shoulders (deltoids). Lavender arrow: the main direction of movement.
```

### 25. 니 푸시업 → `knee-push-up.png` · 사람+도구
```
25번 그림. 파일 이름: knee-push-up.png
SUBJECT: The mannequin performing knee push-up, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the chest and triceps. Lavender arrow: the main direction of movement.
```

### 26. 덤벨 풀오버 → `dumbbell-pullover-lying-across-a-bench.png` · 사람+도구
```
26번 그림. 파일 이름: dumbbell-pullover-lying-across-a-bench.png
SUBJECT: The mannequin performing dumbbell pullover lying across a bench, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the chest and back. Lavender arrow: the main direction of movement.
```

### 27. 케이블 체스트 프레스 → `standing-cable-chest-press.png` · 사람+도구
```
27번 그림. 파일 이름: standing-cable-chest-press.png
SUBJECT: The mannequin performing standing cable chest press, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (cable station: simple upright column with a pulley and cable) simply. Highlight in mint: the chest and triceps. Lavender arrow: the main direction of movement.
```

## 등 (30개)

### 28. 데드리프트 → `conventional-barbell-deadlift.png` · 사람+도구
```
28번 그림. 파일 이름: conventional-barbell-deadlift.png
SUBJECT: The mannequin performing conventional barbell deadlift, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (barbell with one plate each side) simply. Highlight in mint: the glutes and quadriceps (front thighs) and hamstrings (back thighs). Lavender arrow: the main direction of movement.
```

### 29. 랫풀다운 → `lat-pulldown.png` · 머신
```
29번 그림. 파일 이름: lat-pulldown.png
SUBJECT: A generic lat pulldown (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 30. 풀업 → `pull-up-on-a-bar.png` · 사람+도구
```
30번 그림. 파일 이름: pull-up-on-a-bar.png
SUBJECT: The mannequin performing pull-up on a bar (overhand grip), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the back. Lavender arrow: the main direction of movement.
```

### 31. 바벨 로우 → `bent-over-barbell-row.png` · 사람+도구
```
31번 그림. 파일 이름: bent-over-barbell-row.png
SUBJECT: The mannequin performing bent-over barbell row, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (barbell with one plate each side) simply. Highlight in mint: the back. Lavender arrow: the main direction of movement.
```

### 32. 시티드 케이블 로우 → `seated-cable-row-with-v-handle.png` · 사람+도구
```
32번 그림. 파일 이름: seated-cable-row-with-v-handle.png
SUBJECT: The mannequin performing seated cable row with V-handle, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (cable station: simple upright column with a pulley and cable) simply. Highlight in mint: the back. Lavender arrow: the main direction of movement.
```

### 33. 원암 덤벨 로우 → `single-arm-dumbbell-row-with-one-knee-on-a-bench.png` · 사람+도구
```
33번 그림. 파일 이름: single-arm-dumbbell-row-with-one-knee-on-a-bench.png
SUBJECT: The mannequin performing single-arm dumbbell row with one knee on a bench, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the back. Lavender arrow: the main direction of movement.
```

### 34. 페이스 풀 → `cable-face-pull-with-rope.png` · 사람+도구
```
34번 그림. 파일 이름: cable-face-pull-with-rope.png
SUBJECT: The mannequin performing cable face pull with rope, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (cable station: simple upright column with a pulley and cable) simply. Highlight in mint: the shoulders (deltoids) and back. Lavender arrow: the main direction of movement.
```

### 35. 펜들레이 로우 → `pendlay-row.png` · 사람+도구
```
35번 그림. 파일 이름: pendlay-row.png
SUBJECT: The mannequin performing Pendlay row (barbell from the floor, torso parallel), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (barbell with one plate each side) simply. Highlight in mint: the back. Lavender arrow: the main direction of movement.
```

### 36. 덤벨 로우 → `bent-over-two-dumbbell-row.png` · 사람+도구
```
36번 그림. 파일 이름: bent-over-two-dumbbell-row.png
SUBJECT: The mannequin performing bent-over two-dumbbell row, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the back. Lavender arrow: the main direction of movement.
```

### 37. T바 로우 → `t-bar-row.png` · 사람+도구
```
37번 그림. 파일 이름: t-bar-row.png
SUBJECT: The mannequin performing T-bar row (landmine bar with V-handle, plates on the end), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (weight plates as named) simply. Highlight in mint: the back. Lavender arrow: the main direction of movement.
```

### 38. 체스트 서포티드 T바 로우 → `chest-supported-t-bar-row-machine.png` · 머신
```
38번 그림. 파일 이름: chest-supported-t-bar-row-machine.png
SUBJECT: A generic chest-supported T-bar row machine (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 39. 시티드 로우 머신 → `seated-row-machine-with-chest-pad.png` · 머신
```
39번 그림. 파일 이름: seated-row-machine-with-chest-pad.png
SUBJECT: A generic seated row machine with chest pad (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 40. 아이소래터럴 로우 → `plate-loaded-iso-lateral-row-machine.png` · 머신
```
40번 그림. 파일 이름: plate-loaded-iso-lateral-row-machine.png
SUBJECT: A generic plate-loaded iso-lateral row machine (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 41. 하이 로우 머신 → `iso-lateral-high-row-machine.png` · 머신
```
41번 그림. 파일 이름: iso-lateral-high-row-machine.png
SUBJECT: A generic iso-lateral high row machine (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 42. 체스트 서포티드 덤벨 로우 → `chest-supported-dumbbell-row-lying-face-down-on-.png` · 사람+도구
```
42번 그림. 파일 이름: chest-supported-dumbbell-row-lying-face-down-on-.png
SUBJECT: The mannequin performing chest-supported dumbbell row lying face down on an incline bench, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the back. Lavender arrow: the main direction of movement.
```

### 43. 원암 케이블 로우 → `single-arm-seated-cable-row.png` · 사람+도구
```
43번 그림. 파일 이름: single-arm-seated-cable-row.png
SUBJECT: The mannequin performing single-arm seated cable row, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (cable station: simple upright column with a pulley and cable) simply. Highlight in mint: the back. Lavender arrow: the main direction of movement.
```

### 44. 클로즈그립 랫풀다운 → `close-grip-lat-pulldown-with-v-handle.png` · 사람+도구
```
44번 그림. 파일 이름: close-grip-lat-pulldown-with-v-handle.png
SUBJECT: The mannequin performing close-grip lat pulldown with V-handle, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (cable station: simple upright column with a pulley and cable) simply. Highlight in mint: the back. Lavender arrow: the main direction of movement.
```

### 45. 언더그립 랫풀다운 → `underhand-grip-lat-pulldown.png` · 사람+도구
```
45번 그림. 파일 이름: underhand-grip-lat-pulldown.png
SUBJECT: The mannequin performing underhand-grip lat pulldown, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (cable station: simple upright column with a pulley and cable) simply. Highlight in mint: the back and biceps. Lavender arrow: the main direction of movement.
```

### 46. 원암 케이블 랫풀다운 → `single-arm-cable-lat-pulldown.png` · 사람+도구
```
46번 그림. 파일 이름: single-arm-cable-lat-pulldown.png
SUBJECT: The mannequin performing single-arm cable lat pulldown, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (cable station: simple upright column with a pulley and cable) simply. Highlight in mint: the back. Lavender arrow: the main direction of movement.
```

### 47. 머신 랫풀다운 → `plate-loaded-lat-pulldown-machine-with-separate-.png` · 머신
```
47번 그림. 파일 이름: plate-loaded-lat-pulldown-machine-with-separate-.png
SUBJECT: A generic plate-loaded lat pulldown machine with separate handles (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 48. 스트레이트 암 풀다운 → `standing-straight-arm-cable-pulldown.png` · 사람+도구
```
48번 그림. 파일 이름: standing-straight-arm-cable-pulldown.png
SUBJECT: The mannequin performing standing straight-arm cable pulldown, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (cable station: simple upright column with a pulley and cable) simply. Highlight in mint: the back. Lavender arrow: the main direction of movement.
```

### 49. 친업 → `chin-up.png` · 사람+도구
```
49번 그림. 파일 이름: chin-up.png
SUBJECT: The mannequin performing chin-up (underhand grip), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the back and biceps. Lavender arrow: the main direction of movement.
```

### 50. 어시스트 풀업 → `assisted-pull-up-machine-with-knee-pad.png` · 머신
```
50번 그림. 파일 이름: assisted-pull-up-machine-with-knee-pad.png
SUBJECT: A generic assisted pull-up machine with knee pad (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 51. 인버티드 로우 → `inverted-row-under-a-bar.png` · 사람+도구
```
51번 그림. 파일 이름: inverted-row-under-a-bar.png
SUBJECT: The mannequin performing inverted row under a bar, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the back. Lavender arrow: the main direction of movement.
```

### 52. 랙 풀 → `barbell-rack-pull-from-pins-at-knee-height.png` · 사람+도구
```
52번 그림. 파일 이름: barbell-rack-pull-from-pins-at-knee-height.png
SUBJECT: The mannequin performing barbell rack pull from pins at knee height, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (barbell with one plate each side) simply. Highlight in mint: the lower back (spinal erectors) and glutes and back. Lavender arrow: the main direction of movement.
```

### 53. 백 익스텐션 → `45-degree-back-extension-on-a-hyperextension-ben.png` · 사람+도구
```
53번 그림. 파일 이름: 45-degree-back-extension-on-a-hyperextension-ben.png
SUBJECT: The mannequin performing 45-degree back extension on a hyperextension bench, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the lower back (spinal erectors) and glutes. Lavender arrow: the main direction of movement.
```

### 54. 바벨 슈러그 → `barbell-shrug.png` · 사람+도구
```
54번 그림. 파일 이름: barbell-shrug.png
SUBJECT: The mannequin performing barbell shrug, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (barbell with one plate each side) simply. Highlight in mint: the trapezius. Lavender arrow: the main direction of movement.
```

### 55. 덤벨 슈러그 → `dumbbell-shrug.png` · 사람+도구
```
55번 그림. 파일 이름: dumbbell-shrug.png
SUBJECT: The mannequin performing dumbbell shrug, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the trapezius. Lavender arrow: the main direction of movement.
```

### 56. 메도우스 로우 → `meadows-row.png` · 사람+도구
```
56번 그림. 파일 이름: meadows-row.png
SUBJECT: The mannequin performing Meadows row (single-arm landmine row, staggered stance), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (weight plates as named) simply. Highlight in mint: the back. Lavender arrow: the main direction of movement.
```

### 57. 시티드 백 익스텐션 머신 → `seated-back-extension-machine.png` · 머신
```
57번 그림. 파일 이름: seated-back-extension-machine.png
SUBJECT: A generic seated back extension machine (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

## 하체 (59개)

### 58. 스쿼트 → `barbell-back-squat.png` · 사람+도구
```
58번 그림. 파일 이름: barbell-back-squat.png
SUBJECT: The mannequin performing barbell back squat, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (barbell with one plate each side) simply. Highlight in mint: the quadriceps (front thighs) and glutes. Lavender arrow: the main direction of movement.
```

### 59. 프론트 스쿼트 → `barbell-front-squat.png` · 사람+도구
```
59번 그림. 파일 이름: barbell-front-squat.png
SUBJECT: The mannequin performing barbell front squat, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (barbell with one plate each side) simply. Highlight in mint: the quadriceps (front thighs) and glutes. Lavender arrow: the main direction of movement.
```

### 60. 고블릿 스쿼트 → `goblet-squat-holding-one-dumbbell-at-the-chest.png` · 사람+도구
```
60번 그림. 파일 이름: goblet-squat-holding-one-dumbbell-at-the-chest.png
SUBJECT: The mannequin performing goblet squat holding one dumbbell at the chest, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (one dumbbell) simply. Highlight in mint: the quadriceps (front thighs) and glutes. Lavender arrow: the main direction of movement.
```

### 61. 덤벨 프론트 스쿼트 → `dumbbell-front-squat-with-dumbbells-on-the-shoul.png` · 사람+도구
```
61번 그림. 파일 이름: dumbbell-front-squat-with-dumbbells-on-the-shoul.png
SUBJECT: The mannequin performing dumbbell front squat with dumbbells on the shoulders, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the quadriceps (front thighs) and glutes. Lavender arrow: the main direction of movement.
```

### 62. 불가리안 스플릿 스쿼트 → `bulgarian-split-squat-with-rear-foot-on-a-bench-.png` · 사람+도구
```
62번 그림. 파일 이름: bulgarian-split-squat-with-rear-foot-on-a-bench-.png
SUBJECT: The mannequin performing Bulgarian split squat with rear foot on a bench, dumbbells in hands, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the quadriceps (front thighs) and glutes. Lavender arrow: the main direction of movement.
```

### 63. 덤벨 스텝업 → `dumbbell-step-up-onto-a-box.png` · 사람+도구
```
63번 그림. 파일 이름: dumbbell-step-up-onto-a-box.png
SUBJECT: The mannequin performing dumbbell step-up onto a box, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the quadriceps (front thighs) and glutes. Lavender arrow: the main direction of movement.
```

### 64. 레그 프레스 → `45-degree-leg-press.png` · 머신
```
64번 그림. 파일 이름: 45-degree-leg-press.png
SUBJECT: A generic 45-degree leg press (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 65. 런지 → `forward-lunge.png` · 사람+도구
```
65번 그림. 파일 이름: forward-lunge.png
SUBJECT: The mannequin performing forward lunge, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (the free weight named in the exercise) simply. Highlight in mint: the quadriceps (front thighs) and glutes. Lavender arrow: the main direction of movement.
```

### 66. 루마니안 데드리프트 → `barbell-romanian-deadlift.png` · 사람+도구
```
66번 그림. 파일 이름: barbell-romanian-deadlift.png
SUBJECT: The mannequin performing barbell Romanian deadlift, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (barbell with one plate each side) simply. Highlight in mint: the hamstrings (back thighs) and glutes. Lavender arrow: the main direction of movement.
```

### 67. 덤벨 루마니안 데드리프트 → `dumbbell-romanian-deadlift.png` · 사람+도구
```
67번 그림. 파일 이름: dumbbell-romanian-deadlift.png
SUBJECT: The mannequin performing dumbbell Romanian deadlift, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the hamstrings (back thighs) and glutes. Lavender arrow: the main direction of movement.
```

### 68. 굿모닝 → `barbell-good-morning.png` · 사람+도구
```
68번 그림. 파일 이름: barbell-good-morning.png
SUBJECT: The mannequin performing barbell good morning, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (barbell with one plate each side) simply. Highlight in mint: the hamstrings (back thighs) and glutes. Lavender arrow: the main direction of movement.
```

### 69. 레그 익스텐션 → `seated-leg-extension.png` · 머신
```
69번 그림. 파일 이름: seated-leg-extension.png
SUBJECT: A generic seated leg extension (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 70. 레그 컬 → `leg-curl.png` · 머신
```
70번 그림. 파일 이름: leg-curl.png
SUBJECT: A generic leg curl (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 71. 카프 레이즈 → `standing-calf-raise-on-a-step.png` · 사람+도구
```
71번 그림. 파일 이름: standing-calf-raise-on-a-step.png
SUBJECT: The mannequin performing standing calf raise on a step, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (the free weight named in the exercise) simply. Highlight in mint: the calves. Lavender arrow: the main direction of movement.
```

### 72. 핵 스쿼트 → `hack-squat-machine.png` · 머신
```
72번 그림. 파일 이름: hack-squat-machine.png
SUBJECT: A generic hack squat machine (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 73. 브이 스쿼트 → `v-squat-machine.png` · 머신
```
73번 그림. 파일 이름: v-squat-machine.png
SUBJECT: A generic V-squat machine (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 74. 벨트 스쿼트 → `belt-squat-machine.png` · 머신
```
74번 그림. 파일 이름: belt-squat-machine.png
SUBJECT: A generic belt squat machine (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 75. 스미스 스쿼트 → `smith-machine-squat.png` · 사람+도구
```
75번 그림. 파일 이름: smith-machine-squat.png
SUBJECT: The mannequin performing Smith machine squat, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (Smith machine: two vertical rails with a guided bar) simply. Highlight in mint: the quadriceps (front thighs) and glutes. Lavender arrow: the main direction of movement.
```

### 76. 박스 스쿼트 → `barbell-box-squat.png` · 사람+도구
```
76번 그림. 파일 이름: barbell-box-squat.png
SUBJECT: The mannequin performing barbell box squat (sitting back to a box), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (barbell with one plate each side) simply. Highlight in mint: the quadriceps (front thighs) and glutes. Lavender arrow: the main direction of movement.
```

### 77. 스모 스쿼트 → `sumo-squat-holding-one-dumbbell-between-the-legs.png` · 사람+도구
```
77번 그림. 파일 이름: sumo-squat-holding-one-dumbbell-between-the-legs.png
SUBJECT: The mannequin performing sumo squat holding one dumbbell between the legs, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the quadriceps (front thighs) and glutes and inner thighs. Lavender arrow: the main direction of movement.
```

### 78. 스모 데드리프트 → `sumo-barbell-deadlift.png` · 사람+도구
```
78번 그림. 파일 이름: sumo-barbell-deadlift.png
SUBJECT: The mannequin performing sumo barbell deadlift (wide stance), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (barbell with one plate each side) simply. Highlight in mint: the glutes and quadriceps (front thighs) and inner thighs. Lavender arrow: the main direction of movement.
```

### 79. 트랩바 데드리프트 → `trap-bar-deadlift.png` · 사람+도구
```
79번 그림. 파일 이름: trap-bar-deadlift.png
SUBJECT: The mannequin performing trap bar (hex bar) deadlift, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (barbell with one plate each side) simply. Highlight in mint: the quadriceps (front thighs) and glutes. Lavender arrow: the main direction of movement.
```

### 80. 스티프 레그 데드리프트 → `stiff-leg-barbell-deadlift.png` · 사람+도구
```
80번 그림. 파일 이름: stiff-leg-barbell-deadlift.png
SUBJECT: The mannequin performing stiff-leg barbell deadlift, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (barbell with one plate each side) simply. Highlight in mint: the hamstrings (back thighs) and glutes. Lavender arrow: the main direction of movement.
```

### 81. 싱글 레그 루마니안 데드리프트 → `single-leg-dumbbell-romanian-deadlift.png` · 사람+도구
```
81번 그림. 파일 이름: single-leg-dumbbell-romanian-deadlift.png
SUBJECT: The mannequin performing single-leg dumbbell Romanian deadlift, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the hamstrings (back thighs) and glutes. Lavender arrow: the main direction of movement.
```

### 82. 힙 쓰러스트 → `barbell-hip-thrust-with-upper-back-on-a-bench.png` · 사람+도구
```
82번 그림. 파일 이름: barbell-hip-thrust-with-upper-back-on-a-bench.png
SUBJECT: The mannequin performing barbell hip thrust with upper back on a bench, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (barbell with one plate each side) simply. Highlight in mint: the glutes. Lavender arrow: the main direction of movement.
```

### 83. 힙 쓰러스트 머신 → `hip-thrust-machine.png` · 머신
```
83번 그림. 파일 이름: hip-thrust-machine.png
SUBJECT: A generic hip thrust machine (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 84. 글루트 브릿지 → `floor-glute-bridge.png` · 사람+도구
```
84번 그림. 파일 이름: floor-glute-bridge.png
SUBJECT: The mannequin performing floor glute bridge, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the glutes. Lavender arrow: the main direction of movement.
```

### 85. 케이블 킥백 → `standing-cable-glute-kickback-with-ankle-strap.png` · 사람+도구
```
85번 그림. 파일 이름: standing-cable-glute-kickback-with-ankle-strap.png
SUBJECT: The mannequin performing standing cable glute kickback with ankle strap, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (cable station: simple upright column with a pulley and cable) simply. Highlight in mint: the glutes. Lavender arrow: the main direction of movement.
```

### 86. 글루트 킥백 머신 → `glute-kickback-machine.png` · 머신
```
86번 그림. 파일 이름: glute-kickback-machine.png
SUBJECT: A generic glute kickback machine (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 87. 힙 어브덕션 → `seated-hip-abduction-machine.png` · 머신
```
87번 그림. 파일 이름: seated-hip-abduction-machine.png
SUBJECT: A generic seated hip abduction machine (knees pushing outward) (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 88. 힙 어덕션 → `seated-hip-adduction-machine.png` · 머신
```
88번 그림. 파일 이름: seated-hip-adduction-machine.png
SUBJECT: A generic seated hip adduction machine (knees squeezing inward) (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 89. 케이블 힙 어브덕션 → `standing-cable-hip-abduction.png` · 사람+도구
```
89번 그림. 파일 이름: standing-cable-hip-abduction.png
SUBJECT: The mannequin performing standing cable hip abduction, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (cable station: simple upright column with a pulley and cable) simply. Highlight in mint: the glutes. Lavender arrow: the main direction of movement.
```

### 90. 시티드 레그 컬 → `seated-leg-curl-machine.png` · 머신
```
90번 그림. 파일 이름: seated-leg-curl-machine.png
SUBJECT: A generic seated leg curl machine (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 91. 라잉 레그 컬 → `lying-leg-curl-machine.png` · 머신
```
91번 그림. 파일 이름: lying-leg-curl-machine.png
SUBJECT: A generic lying leg curl machine (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 92. 스탠딩 레그 컬 → `standing-single-leg-curl-machine.png` · 머신
```
92번 그림. 파일 이름: standing-single-leg-curl-machine.png
SUBJECT: A generic standing single-leg curl machine (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 93. 노르딕 햄스트링 컬 → `nordic-hamstring-curl.png` · 사람+도구
```
93번 그림. 파일 이름: nordic-hamstring-curl.png
SUBJECT: The mannequin performing Nordic hamstring curl (kneeling, ankles held), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the hamstrings (back thighs). Lavender arrow: the main direction of movement.
```

### 94. 워킹 런지 → `dumbbell-walking-lunge.png` · 사람+도구
```
94번 그림. 파일 이름: dumbbell-walking-lunge.png
SUBJECT: The mannequin performing dumbbell walking lunge, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the quadriceps (front thighs) and glutes. Lavender arrow: the main direction of movement.
```

### 95. 리버스 런지 → `dumbbell-reverse-lunge.png` · 사람+도구
```
95번 그림. 파일 이름: dumbbell-reverse-lunge.png
SUBJECT: The mannequin performing dumbbell reverse lunge, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the quadriceps (front thighs) and glutes. Lavender arrow: the main direction of movement.
```

### 96. 바벨 런지 → `barbell-lunge.png` · 사람+도구
```
96번 그림. 파일 이름: barbell-lunge.png
SUBJECT: The mannequin performing barbell lunge, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (barbell with one plate each side) simply. Highlight in mint: the quadriceps (front thighs) and glutes. Lavender arrow: the main direction of movement.
```

### 97. 스미스 런지 → `smith-machine-split-lunge.png` · 사람+도구
```
97번 그림. 파일 이름: smith-machine-split-lunge.png
SUBJECT: The mannequin performing Smith machine split lunge, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (Smith machine: two vertical rails with a guided bar) simply. Highlight in mint: the quadriceps (front thighs) and glutes. Lavender arrow: the main direction of movement.
```

### 98. 스플릿 스쿼트 → `dumbbell-split-squat.png` · 사람+도구
```
98번 그림. 파일 이름: dumbbell-split-squat.png
SUBJECT: The mannequin performing dumbbell split squat, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the quadriceps (front thighs) and glutes. Lavender arrow: the main direction of movement.
```

### 99. 사이드 런지 → `dumbbell-side-lunge.png` · 사람+도구
```
99번 그림. 파일 이름: dumbbell-side-lunge.png
SUBJECT: The mannequin performing dumbbell side (lateral) lunge, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the inner thighs and quadriceps (front thighs) and glutes. Lavender arrow: the main direction of movement.
```

### 100. 피스톨 스쿼트 → `pistol-squat.png` · 사람+도구
```
100번 그림. 파일 이름: pistol-squat.png
SUBJECT: The mannequin performing pistol squat (single-leg, other leg straight forward), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the quadriceps (front thighs) and glutes. Lavender arrow: the main direction of movement.
```

### 101. 점프 스쿼트 → `jump-squat.png` · 사람+도구
```
101번 그림. 파일 이름: jump-squat.png
SUBJECT: The mannequin performing jump squat (mid-air), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the quadriceps (front thighs) and glutes. Lavender arrow: the main direction of movement.
```

### 102. 수평 레그 프레스 → `horizontal-seated-leg-press-machine.png` · 머신
```
102번 그림. 파일 이름: horizontal-seated-leg-press-machine.png
SUBJECT: A generic horizontal seated leg press machine (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 103. 싱글 레그 프레스 → `single-leg-45-degree-leg-press.png` · 머신
```
103번 그림. 파일 이름: single-leg-45-degree-leg-press.png
SUBJECT: A generic single-leg 45-degree leg press (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 104. 시티드 카프 레이즈 → `seated-calf-raise-machine.png` · 머신
```
104번 그림. 파일 이름: seated-calf-raise-machine.png
SUBJECT: A generic seated calf raise machine (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 105. 스탠딩 카프 레이즈 머신 → `standing-calf-raise-machine-with-shoulder-pads.png` · 머신
```
105번 그림. 파일 이름: standing-calf-raise-machine-with-shoulder-pads.png
SUBJECT: A generic standing calf raise machine with shoulder pads (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 106. 레그 프레스 카프 레이즈 → `calf-press-on-the-leg-press-machine.png` · 머신
```
106번 그림. 파일 이름: calf-press-on-the-leg-press-machine.png
SUBJECT: A generic calf press on the leg press machine (only toes on the platform) (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 107. 동키 카프 레이즈 → `donkey-calf-raise-machine.png` · 머신
```
107번 그림. 파일 이름: donkey-calf-raise-machine.png
SUBJECT: A generic donkey calf raise machine (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 108. 싱글 레그 레그 익스텐션 → `single-leg-seated-leg-extension.png` · 머신
```
108번 그림. 파일 이름: single-leg-seated-leg-extension.png
SUBJECT: A generic single-leg seated leg extension (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 109. 고블릿 리버스 런지 → `goblet-reverse-lunge-holding-a-dumbbell-at-the-c.png` · 사람+도구
```
109번 그림. 파일 이름: goblet-reverse-lunge-holding-a-dumbbell-at-the-c.png
SUBJECT: The mannequin performing goblet reverse lunge holding a dumbbell at the chest, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the quadriceps (front thighs) and glutes. Lavender arrow: the main direction of movement.
```

### 110. 버티컬 레그 프레스 → `vertical-leg-press-machine.png` · 머신
```
110번 그림. 파일 이름: vertical-leg-press-machine.png
SUBJECT: A generic vertical leg press machine (lying on back, platform overhead) (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 111. 파워 스쿼트 → `plate-loaded-power-squat-machine-with-shoulder-p.png` · 머신
```
111번 그림. 파일 이름: plate-loaded-power-squat-machine-with-shoulder-p.png
SUBJECT: A generic plate-loaded power squat machine with shoulder pads (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 112. 멀티 힙 → `multi-hip-machine.png` · 머신
```
112번 그림. 파일 이름: multi-hip-machine.png
SUBJECT: A generic multi-hip machine (standing, leg against a rotating pad) (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 113. 리버스 하이퍼 → `reverse-hyperextension-machine.png` · 머신
```
113번 그림. 파일 이름: reverse-hyperextension-machine.png
SUBJECT: A generic reverse hyperextension machine (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 114. 글루트 햄 레이즈 → `glute-ham-raise-on-a-ghd-bench.png` · 머신
```
114번 그림. 파일 이름: glute-ham-raise-on-a-ghd-bench.png
SUBJECT: A generic glute-ham raise on a GHD bench (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 115. 케틀벨 고블릿 스쿼트 → `kettlebell-goblet-squat.png` · 사람+도구
```
115번 그림. 파일 이름: kettlebell-goblet-squat.png
SUBJECT: The mannequin performing kettlebell goblet squat, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (kettlebell) simply. Highlight in mint: the quadriceps (front thighs) and glutes. Lavender arrow: the main direction of movement.
```

### 116. 케틀벨 데드리프트 → `kettlebell-deadlift.png` · 사람+도구
```
116번 그림. 파일 이름: kettlebell-deadlift.png
SUBJECT: The mannequin performing kettlebell deadlift, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (kettlebell) simply. Highlight in mint: the glutes and hamstrings (back thighs). Lavender arrow: the main direction of movement.
```

## 어깨 (22개)

### 117. 오버헤드 프레스 → `standing-barbell-overhead-press.png` · 사람+도구
```
117번 그림. 파일 이름: standing-barbell-overhead-press.png
SUBJECT: The mannequin performing standing barbell overhead press, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (the free weight named in the exercise) simply. Highlight in mint: the shoulders (deltoids). Lavender arrow: the main direction of movement.
```

### 118. 덤벨 숄더 프레스 → `standing-dumbbell-shoulder-press.png` · 사람+도구
```
118번 그림. 파일 이름: standing-dumbbell-shoulder-press.png
SUBJECT: The mannequin performing standing dumbbell shoulder press, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the shoulders (deltoids). Lavender arrow: the main direction of movement.
```

### 119. 사이드 레터럴 레이즈 → `dumbbell-lateral-raise.png` · 사람+도구
```
119번 그림. 파일 이름: dumbbell-lateral-raise.png
SUBJECT: The mannequin performing dumbbell lateral raise, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (the free weight named in the exercise) simply. Highlight in mint: the shoulders (deltoids). Lavender arrow: the main direction of movement.
```

### 120. 리어 델트 플라이 → `bent-over-dumbbell-rear-delt-fly.png` · 사람+도구
```
120번 그림. 파일 이름: bent-over-dumbbell-rear-delt-fly.png
SUBJECT: The mannequin performing bent-over dumbbell rear delt fly, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (the free weight named in the exercise) simply. Highlight in mint: the shoulders (deltoids). Lavender arrow: the main direction of movement.
```

### 121. 프론트 레이즈 → `dumbbell-front-raise.png` · 사람+도구
```
121번 그림. 파일 이름: dumbbell-front-raise.png
SUBJECT: The mannequin performing dumbbell front raise, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (the free weight named in the exercise) simply. Highlight in mint: the shoulders (deltoids). Lavender arrow: the main direction of movement.
```

### 122. 랜드마인 프레스 → `standing-single-arm-landmine-press.png` · 사람+도구
```
122번 그림. 파일 이름: standing-single-arm-landmine-press.png
SUBJECT: The mannequin performing standing single-arm landmine press, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (barbell with one plate each side) simply. Highlight in mint: the shoulders (deltoids) and chest. Lavender arrow: the main direction of movement.
```

### 123. 아놀드 프레스 → `seated-arnold-press.png` · 사람+도구
```
123번 그림. 파일 이름: seated-arnold-press.png
SUBJECT: The mannequin performing seated Arnold press, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the shoulders (deltoids). Lavender arrow: the main direction of movement.
```

### 124. 숄더 프레스 머신 → `seated-shoulder-press-machine.png` · 머신
```
124번 그림. 파일 이름: seated-shoulder-press-machine.png
SUBJECT: A generic seated shoulder press machine (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 125. 스미스 숄더 프레스 → `seated-smith-machine-shoulder-press.png` · 사람+도구
```
125번 그림. 파일 이름: seated-smith-machine-shoulder-press.png
SUBJECT: The mannequin performing seated Smith machine shoulder press, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (Smith machine: two vertical rails with a guided bar) simply. Highlight in mint: the shoulders (deltoids). Lavender arrow: the main direction of movement.
```

### 126. 비하인드 넥 프레스 → `seated-behind-the-neck-barbell-press.png` · 사람+도구
```
126번 그림. 파일 이름: seated-behind-the-neck-barbell-press.png
SUBJECT: The mannequin performing seated behind-the-neck barbell press, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (barbell with one plate each side) simply. Highlight in mint: the shoulders (deltoids). Lavender arrow: the main direction of movement.
```

### 127. 시티드 덤벨 숄더 프레스 → `seated-dumbbell-shoulder-press.png` · 사람+도구
```
127번 그림. 파일 이름: seated-dumbbell-shoulder-press.png
SUBJECT: The mannequin performing seated dumbbell shoulder press, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the shoulders (deltoids). Lavender arrow: the main direction of movement.
```

### 128. 케이블 레터럴 레이즈 → `single-arm-cable-lateral-raise.png` · 사람+도구
```
128번 그림. 파일 이름: single-arm-cable-lateral-raise.png
SUBJECT: The mannequin performing single-arm cable lateral raise, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (cable station: simple upright column with a pulley and cable) simply. Highlight in mint: the shoulders (deltoids). Lavender arrow: the main direction of movement.
```

### 129. 머신 레터럴 레이즈 → `seated-lateral-raise-machine.png` · 머신
```
129번 그림. 파일 이름: seated-lateral-raise-machine.png
SUBJECT: A generic seated lateral raise machine (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 130. 리버스 펙덱 → `reverse-pec-deck.png` · 머신
```
130번 그림. 파일 이름: reverse-pec-deck.png
SUBJECT: A generic reverse pec deck (rear delt fly machine) (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 131. 벤트오버 레터럴 레이즈 → `bent-over-dumbbell-lateral-raise.png` · 사람+도구
```
131번 그림. 파일 이름: bent-over-dumbbell-lateral-raise.png
SUBJECT: The mannequin performing bent-over dumbbell lateral raise, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the shoulders (deltoids). Lavender arrow: the main direction of movement.
```

### 132. 케이블 리어 델트 플라이 → `standing-cable-rear-delt-fly.png` · 사람+도구
```
132번 그림. 파일 이름: standing-cable-rear-delt-fly.png
SUBJECT: The mannequin performing standing cable rear delt fly (crossed cables), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (cable station: simple upright column with a pulley and cable) simply. Highlight in mint: the shoulders (deltoids). Lavender arrow: the main direction of movement.
```

### 133. 업라이트 로우 → `barbell-upright-row.png` · 사람+도구
```
133번 그림. 파일 이름: barbell-upright-row.png
SUBJECT: The mannequin performing barbell upright row, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (barbell with one plate each side) simply. Highlight in mint: the shoulders (deltoids) and trapezius. Lavender arrow: the main direction of movement.
```

### 134. 케이블 프론트 레이즈 → `cable-front-raise.png` · 사람+도구
```
134번 그림. 파일 이름: cable-front-raise.png
SUBJECT: The mannequin performing cable front raise, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (cable station: simple upright column with a pulley and cable) simply. Highlight in mint: the shoulders (deltoids). Lavender arrow: the main direction of movement.
```

### 135. 푸시 프레스 → `barbell-push-press.png` · 사람+도구
```
135번 그림. 파일 이름: barbell-push-press.png
SUBJECT: The mannequin performing barbell push press (legs driving), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (barbell with one plate each side) simply. Highlight in mint: the shoulders (deltoids) and triceps. Lavender arrow: the main direction of movement.
```

### 136. 파이크 푸시업 → `pike-push-up.png` · 사람+도구
```
136번 그림. 파일 이름: pike-push-up.png
SUBJECT: The mannequin performing pike push-up, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the shoulders (deltoids) and triceps. Lavender arrow: the main direction of movement.
```

### 137. Y 레이즈 → `incline-bench-prone-y-raise-with-light-dumbbells.png` · 사람+도구
```
137번 그림. 파일 이름: incline-bench-prone-y-raise-with-light-dumbbells.png
SUBJECT: The mannequin performing incline bench prone Y-raise with light dumbbells, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the shoulders (deltoids) and trapezius. Lavender arrow: the main direction of movement.
```

### 138. 머신 슈러그 → `shrug-machine.png` · 머신
```
138번 그림. 파일 이름: shrug-machine.png
SUBJECT: A generic shrug machine (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

## 팔 (28개)

### 139. 바벨 컬 → `standing-barbell-curl.png` · 사람+도구
```
139번 그림. 파일 이름: standing-barbell-curl.png
SUBJECT: The mannequin performing standing barbell curl, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (barbell with one plate each side) simply. Highlight in mint: the biceps. Lavender arrow: the main direction of movement.
```

### 140. 덤벨 컬 → `standing-dumbbell-biceps-curl.png` · 사람+도구
```
140번 그림. 파일 이름: standing-dumbbell-biceps-curl.png
SUBJECT: The mannequin performing standing dumbbell biceps curl, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the biceps. Lavender arrow: the main direction of movement.
```

### 141. 해머 컬 → `dumbbell-hammer-curl.png` · 사람+도구
```
141번 그림. 파일 이름: dumbbell-hammer-curl.png
SUBJECT: The mannequin performing dumbbell hammer curl, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (the free weight named in the exercise) simply. Highlight in mint: the biceps. Lavender arrow: the main direction of movement.
```

### 142. 덤벨 트라이셉스 익스텐션 → `lying-dumbbell-triceps-extension.png` · 사람+도구
```
142번 그림. 파일 이름: lying-dumbbell-triceps-extension.png
SUBJECT: The mannequin performing lying dumbbell triceps extension, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the triceps. Lavender arrow: the main direction of movement.
```

### 143. 덤벨 킥백 → `bent-over-dumbbell-triceps-kickback.png` · 사람+도구
```
143번 그림. 파일 이름: bent-over-dumbbell-triceps-kickback.png
SUBJECT: The mannequin performing bent-over dumbbell triceps kickback, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the triceps. Lavender arrow: the main direction of movement.
```

### 144. 케이블 푸시다운 → `cable-triceps-pushdown-with-straight-bar.png` · 사람+도구
```
144번 그림. 파일 이름: cable-triceps-pushdown-with-straight-bar.png
SUBJECT: The mannequin performing cable triceps pushdown with straight bar, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (cable station: simple upright column with a pulley and cable) simply. Highlight in mint: the triceps. Lavender arrow: the main direction of movement.
```

### 145. 스컬 크러셔 → `lying-barbell-skull-crusher.png` · 사람+도구
```
145번 그림. 파일 이름: lying-barbell-skull-crusher.png
SUBJECT: The mannequin performing lying barbell skull crusher, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (the free weight named in the exercise) simply. Highlight in mint: the triceps. Lavender arrow: the main direction of movement.
```

### 146. 오버헤드 트라이셉스 익스텐션 → `overhead-dumbbell-triceps-extension.png` · 사람+도구
```
146번 그림. 파일 이름: overhead-dumbbell-triceps-extension.png
SUBJECT: The mannequin performing overhead dumbbell triceps extension (two hands, one dumbbell), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (the free weight named in the exercise) simply. Highlight in mint: the triceps. Lavender arrow: the main direction of movement.
```

### 147. EZ바 컬 → `ez-bar-curl.png` · 사람+도구
```
147번 그림. 파일 이름: ez-bar-curl.png
SUBJECT: The mannequin performing EZ-bar curl, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (EZ curl bar with plates) simply. Highlight in mint: the biceps. Lavender arrow: the main direction of movement.
```

### 148. 프리처 컬 → `ez-bar-preacher-curl-on-a-preacher-bench.png` · 사람+도구
```
148번 그림. 파일 이름: ez-bar-preacher-curl-on-a-preacher-bench.png
SUBJECT: The mannequin performing EZ-bar preacher curl on a preacher bench, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (EZ curl bar with plates) simply. Highlight in mint: the biceps. Lavender arrow: the main direction of movement.
```

### 149. 머신 프리처 컬 → `preacher-curl-machine.png` · 머신
```
149번 그림. 파일 이름: preacher-curl-machine.png
SUBJECT: A generic preacher curl machine (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 150. 인클라인 덤벨 컬 → `incline-bench-dumbbell-curl.png` · 사람+도구
```
150번 그림. 파일 이름: incline-bench-dumbbell-curl.png
SUBJECT: The mannequin performing incline bench dumbbell curl, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the biceps. Lavender arrow: the main direction of movement.
```

### 151. 컨센트레이션 컬 → `seated-concentration-curl.png` · 사람+도구
```
151번 그림. 파일 이름: seated-concentration-curl.png
SUBJECT: The mannequin performing seated concentration curl, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the biceps. Lavender arrow: the main direction of movement.
```

### 152. 케이블 컬 → `standing-cable-curl.png` · 사람+도구
```
152번 그림. 파일 이름: standing-cable-curl.png
SUBJECT: The mannequin performing standing cable curl, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (cable station: simple upright column with a pulley and cable) simply. Highlight in mint: the biceps. Lavender arrow: the main direction of movement.
```

### 153. 스파이더 컬 → `spider-curl-lying-chest-down-on-an-incline-bench.png` · 사람+도구
```
153번 그림. 파일 이름: spider-curl-lying-chest-down-on-an-incline-bench.png
SUBJECT: The mannequin performing spider curl lying chest-down on an incline bench, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the biceps. Lavender arrow: the main direction of movement.
```

### 154. 리버스 컬 → `reverse-grip-barbell-curl.png` · 사람+도구
```
154번 그림. 파일 이름: reverse-grip-barbell-curl.png
SUBJECT: The mannequin performing reverse-grip barbell curl, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (barbell with one plate each side) simply. Highlight in mint: the forearms and biceps. Lavender arrow: the main direction of movement.
```

### 155. 리스트 컬 → `seated-dumbbell-wrist-curl.png` · 사람+도구
```
155번 그림. 파일 이름: seated-dumbbell-wrist-curl.png
SUBJECT: The mannequin performing seated dumbbell wrist curl (forearms on thighs), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the forearms. Lavender arrow: the main direction of movement.
```

### 156. 리버스 리스트 컬 → `seated-reverse-dumbbell-wrist-curl.png` · 사람+도구
```
156번 그림. 파일 이름: seated-reverse-dumbbell-wrist-curl.png
SUBJECT: The mannequin performing seated reverse dumbbell wrist curl, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the forearms. Lavender arrow: the main direction of movement.
```

### 157. 로프 푸시다운 → `cable-rope-triceps-pushdown.png` · 사람+도구
```
157번 그림. 파일 이름: cable-rope-triceps-pushdown.png
SUBJECT: The mannequin performing cable rope triceps pushdown, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (cable station: simple upright column with a pulley and cable) simply. Highlight in mint: the triceps. Lavender arrow: the main direction of movement.
```

### 158. 원암 케이블 푸시다운 → `single-arm-cable-triceps-pushdown.png` · 사람+도구
```
158번 그림. 파일 이름: single-arm-cable-triceps-pushdown.png
SUBJECT: The mannequin performing single-arm cable triceps pushdown, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (cable station: simple upright column with a pulley and cable) simply. Highlight in mint: the triceps. Lavender arrow: the main direction of movement.
```

### 159. 케이블 오버헤드 익스텐션 → `cable-overhead-triceps-extension-with-rope.png` · 사람+도구
```
159번 그림. 파일 이름: cable-overhead-triceps-extension-with-rope.png
SUBJECT: The mannequin performing cable overhead triceps extension with rope, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (cable station: simple upright column with a pulley and cable) simply. Highlight in mint: the triceps. Lavender arrow: the main direction of movement.
```

### 160. 트라이셉스 딥 머신 → `seated-triceps-dip-machine.png` · 머신
```
160번 그림. 파일 이름: seated-triceps-dip-machine.png
SUBJECT: A generic seated triceps dip machine (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 161. 어시스트 딥스 → `assisted-dip-machine-with-knee-pad.png` · 머신
```
161번 그림. 파일 이름: assisted-dip-machine-with-knee-pad.png
SUBJECT: A generic assisted dip machine with knee pad (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 162. 트라이셉스 익스텐션 머신 → `seated-triceps-extension-machine.png` · 머신
```
162번 그림. 파일 이름: seated-triceps-extension-machine.png
SUBJECT: A generic seated triceps extension machine (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 163. 벤치 딥스 → `bench-dips.png` · 사람+도구
```
163번 그림. 파일 이름: bench-dips.png
SUBJECT: The mannequin performing bench dips (hands on a bench behind), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the triceps. Lavender arrow: the main direction of movement.
```

### 164. 다이아몬드 푸시업 → `diamond-push-up.png` · 사람+도구
```
164번 그림. 파일 이름: diamond-push-up.png
SUBJECT: The mannequin performing diamond push-up, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the triceps and chest. Lavender arrow: the main direction of movement.
```

### 165. JM 프레스 → `barbell-jm-press-on-a-flat-bench.png` · 사람+도구
```
165번 그림. 파일 이름: barbell-jm-press-on-a-flat-bench.png
SUBJECT: The mannequin performing barbell JM press on a flat bench, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (barbell with one plate each side) simply. Highlight in mint: the triceps. Lavender arrow: the main direction of movement.
```

### 166. EZ바 스컬 크러셔 → `ez-bar-skull-crusher-on-a-flat-bench.png` · 사람+도구
```
166번 그림. 파일 이름: ez-bar-skull-crusher-on-a-flat-bench.png
SUBJECT: The mannequin performing EZ-bar skull crusher on a flat bench, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (EZ curl bar with plates) simply. Highlight in mint: the triceps. Lavender arrow: the main direction of movement.
```

## 복근 (19개)

### 167. 크런치 → `floor-crunch.png` · 사람+도구
```
167번 그림. 파일 이름: floor-crunch.png
SUBJECT: The mannequin performing floor crunch, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the abdominals. Lavender arrow: the main direction of movement.
```

### 168. 레그 레이즈 → `lying-leg-raise-on-the-floor.png` · 사람+도구
```
168번 그림. 파일 이름: lying-leg-raise-on-the-floor.png
SUBJECT: The mannequin performing lying leg raise on the floor, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (the free weight named in the exercise) simply. Highlight in mint: the abdominals. Lavender arrow: the main direction of movement.
```

### 169. 플랭크 → `forearm-plank.png` · 사람+도구
```
169번 그림. 파일 이름: forearm-plank.png
SUBJECT: The mannequin performing forearm plank, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the abdominals. Lavender arrow: the main direction of movement.
```

### 170. 케이블 크런치 → `kneeling-cable-crunch-with-rope.png` · 사람+도구
```
170번 그림. 파일 이름: kneeling-cable-crunch-with-rope.png
SUBJECT: The mannequin performing kneeling cable crunch with rope, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (cable station: simple upright column with a pulley and cable) simply. Highlight in mint: the abdominals. Lavender arrow: the main direction of movement.
```

### 171. 행잉 레그 레이즈 → `hanging-leg-raise-from-a-pull-up-bar.png` · 사람+도구
```
171번 그림. 파일 이름: hanging-leg-raise-from-a-pull-up-bar.png
SUBJECT: The mannequin performing hanging leg raise from a pull-up bar, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the abdominals. Lavender arrow: the main direction of movement.
```

### 172. 캡틴스 체어 니 레이즈 → `captain-s-chair-knee-raise.png` · 사람+도구
```
172번 그림. 파일 이름: captain-s-chair-knee-raise.png
SUBJECT: The mannequin performing captain's chair knee raise, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the abdominals. Lavender arrow: the main direction of movement.
```

### 173. 앱 롤아웃 → `ab-wheel-rollout.png` · 사람+도구
```
173번 그림. 파일 이름: ab-wheel-rollout.png
SUBJECT: The mannequin performing ab wheel rollout, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the abdominals. Lavender arrow: the main direction of movement.
```

### 174. 러시안 트위스트 → `seated-russian-twist.png` · 사람+도구
```
174번 그림. 파일 이름: seated-russian-twist.png
SUBJECT: The mannequin performing seated Russian twist, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the obliques and abdominals. Lavender arrow: the main direction of movement.
```

### 175. 사이드 플랭크 → `side-plank.png` · 사람+도구
```
175번 그림. 파일 이름: side-plank.png
SUBJECT: The mannequin performing side plank, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the obliques. Lavender arrow: the main direction of movement.
```

### 176. 바이시클 크런치 → `bicycle-crunch.png` · 사람+도구
```
176번 그림. 파일 이름: bicycle-crunch.png
SUBJECT: The mannequin performing bicycle crunch, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the abdominals and obliques. Lavender arrow: the main direction of movement.
```

### 177. 싯업 → `full-sit-up.png` · 사람+도구
```
177번 그림. 파일 이름: full-sit-up.png
SUBJECT: The mannequin performing full sit-up, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the abdominals. Lavender arrow: the main direction of movement.
```

### 178. 디클라인 싯업 → `decline-bench-sit-up.png` · 사람+도구
```
178번 그림. 파일 이름: decline-bench-sit-up.png
SUBJECT: The mannequin performing decline bench sit-up, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the abdominals. Lavender arrow: the main direction of movement.
```

### 179. 앱도미널 크런치 머신 → `seated-abdominal-crunch-machine.png` · 머신
```
179번 그림. 파일 이름: seated-abdominal-crunch-machine.png
SUBJECT: A generic seated abdominal crunch machine (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 180. 케이블 우드찹 → `cable-woodchop.png` · 사람+도구
```
180번 그림. 파일 이름: cable-woodchop.png
SUBJECT: The mannequin performing cable woodchop (high to low), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (cable station: simple upright column with a pulley and cable) simply. Highlight in mint: the obliques. Lavender arrow: the main direction of movement.
```

### 181. 데드버그 → `dead-bug.png` · 사람+도구
```
181번 그림. 파일 이름: dead-bug.png
SUBJECT: The mannequin performing dead bug (on back, opposite arm and leg extended), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the abdominals. Lavender arrow: the main direction of movement.
```

### 182. 마운틴 클라이머 → `mountain-climber.png` · 사람+도구
```
182번 그림. 파일 이름: mountain-climber.png
SUBJECT: The mannequin performing mountain climber, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the abdominals. Lavender arrow: the main direction of movement.
```

### 183. 팔로프 프레스 → `standing-cable-pallof-press.png` · 사람+도구
```
183번 그림. 파일 이름: standing-cable-pallof-press.png
SUBJECT: The mannequin performing standing cable Pallof press, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (cable station: simple upright column with a pulley and cable) simply. Highlight in mint: the obliques and abdominals. Lavender arrow: the main direction of movement.
```

### 184. 토르소 로테이션 머신 → `seated-torso-rotation-machine.png` · 머신
```
184번 그림. 파일 이름: seated-torso-rotation-machine.png
SUBJECT: A generic seated torso rotation machine (no brand, NO person). Draw the typical shape of this machine so a beginner instantly recognizes it: frame, seat or pads, handles or platform. Highlight in mint: the part the user moves (handles, lever arms, pad or platform). Lavender arrow: the direction that part moves.
```

### 185. 할로우 바디 홀드 → `hollow-body-hold.png` · 사람+도구
```
185번 그림. 파일 이름: hollow-body-hold.png
SUBJECT: The mannequin performing hollow body hold, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the abdominals. Lavender arrow: the main direction of movement.
```

## 전신 (13개)

### 186. 버피 → `burpee.png` · 사람+도구
```
186번 그림. 파일 이름: burpee.png
SUBJECT: The mannequin performing burpee (jumping up phase), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the back and quadriceps (front thighs). Lavender arrow: the main direction of movement.
```

### 187. 케틀벨 스윙 → `two-hand-kettlebell-swing.png` · 사람+도구
```
187번 그림. 파일 이름: two-hand-kettlebell-swing.png
SUBJECT: The mannequin performing two-hand kettlebell swing, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (the free weight named in the exercise) simply. Highlight in mint: the glutes and hamstrings (back thighs). Lavender arrow: the main direction of movement.
```

### 188. 클린 앤 프레스 → `dumbbell-clean-and-press.png` · 사람+도구
```
188번 그림. 파일 이름: dumbbell-clean-and-press.png
SUBJECT: The mannequin performing dumbbell clean and press, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (the free weight named in the exercise) simply. Highlight in mint: the shoulders (deltoids) and quadriceps (front thighs). Lavender arrow: the main direction of movement.
```

### 189. 덤벨 슈트케이스 캐리 → `single-arm-suitcase-carry-walking-with-one-dumbb.png` · 사람+도구
```
189번 그림. 파일 이름: single-arm-suitcase-carry-walking-with-one-dumbb.png
SUBJECT: The mannequin performing single-arm suitcase carry walking with one dumbbell, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the forearms and abdominals. Lavender arrow: the main direction of movement.
```

### 190. 파워 클린 → `barbell-power-clean.png` · 사람+도구
```
190번 그림. 파일 이름: barbell-power-clean.png
SUBJECT: The mannequin performing barbell power clean (catch position at the shoulders), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (barbell with one plate each side) simply. Highlight in mint: the glutes and quadriceps (front thighs) and trapezius. Lavender arrow: the main direction of movement.
```

### 191. 스내치 → `barbell-snatch.png` · 사람+도구
```
191번 그림. 파일 이름: barbell-snatch.png
SUBJECT: The mannequin performing barbell snatch (overhead catch in a squat), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (barbell with one plate each side) simply. Highlight in mint: the glutes and quadriceps (front thighs) and shoulders (deltoids). Lavender arrow: the main direction of movement.
```

### 192. 쓰러스터 → `barbell-thruster.png` · 사람+도구
```
192번 그림. 파일 이름: barbell-thruster.png
SUBJECT: The mannequin performing barbell thruster (front squat into overhead press), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (barbell with one plate each side) simply. Highlight in mint: the quadriceps (front thighs) and shoulders (deltoids). Lavender arrow: the main direction of movement.
```

### 193. 파머스 워크 → `farmer-s-walk-with-two-heavy-dumbbells.png` · 사람+도구
```
193번 그림. 파일 이름: farmer-s-walk-with-two-heavy-dumbbells.png
SUBJECT: The mannequin performing farmer's walk with two heavy dumbbells, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (dumbbell(s)) simply. Highlight in mint: the forearms and trapezius. Lavender arrow: the main direction of movement.
```

### 194. 터키시 겟업 → `kettlebell-turkish-get-up.png` · 사람+도구
```
194번 그림. 파일 이름: kettlebell-turkish-get-up.png
SUBJECT: The mannequin performing kettlebell Turkish get-up (half-kneeling, kettlebell overhead), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (kettlebell) simply. Highlight in mint: the shoulders (deltoids) and abdominals. Lavender arrow: the main direction of movement.
```

### 195. 월볼 → `wall-ball.png` · 사람+도구
```
195번 그림. 파일 이름: wall-ball.png
SUBJECT: The mannequin performing wall ball (squat and throw a medicine ball at a wall target), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the quadriceps (front thighs) and shoulders (deltoids). Lavender arrow: the main direction of movement.
```

### 196. 슬레드 푸시 → `sled-push.png` · 사람+도구
```
196번 그림. 파일 이름: sled-push.png
SUBJECT: The mannequin performing sled push (leaning forward, pushing a weighted sled), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Draw the equipment (weight plates as named) simply. Highlight in mint: the quadriceps (front thighs) and glutes. Lavender arrow: the main direction of movement.
```

### 197. 배틀 로프 → `battle-ropes.png` · 사람+도구
```
197번 그림. 파일 이름: battle-ropes.png
SUBJECT: The mannequin performing battle ropes (alternating waves), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the shoulders (deltoids). Lavender arrow: the main direction of movement.
```

### 198. 박스 점프 → `box-jump.png` · 사람+도구
```
198번 그림. 파일 이름: box-jump.png
SUBJECT: The mannequin performing box jump (landing on a box), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the quadriceps (front thighs) and glutes. Lavender arrow: the main direction of movement.
```

## 유산소 (18개)

### 199. 걷기 → `brisk-walking.png` · 사람(유산소·요가 등)
```
199번 그림. 파일 이름: brisk-walking.png
SUBJECT: The mannequin performing brisk walking, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the main working body area or the equipment the body interacts with. Lavender arrow: the main direction of movement.
```

### 200. 달리기 → `running.png` · 사람(유산소·요가 등)
```
200번 그림. 파일 이름: running.png
SUBJECT: The mannequin performing running, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the main working body area or the equipment the body interacts with. Lavender arrow: the main direction of movement.
```

### 201. 실내 자전거 → `stationary-upright-exercise-bike.png` · 유산소 기구
```
201번 그림. 파일 이름: stationary-upright-exercise-bike.png
SUBJECT: A generic stationary upright exercise bike (no brand, NO person). Draw its typical recognizable shape. Highlight in mint: the part the user moves (belt, pedals, handles or seat). Lavender arrow: the direction of movement.
```

### 202. 야외 자전거 → `road-cycling-on-a-bicycle.png` · 사람(유산소·요가 등)
```
202번 그림. 파일 이름: road-cycling-on-a-bicycle.png
SUBJECT: The mannequin performing road cycling on a bicycle, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the main working body area or the equipment the body interacts with. Lavender arrow: the main direction of movement.
```

### 203. 로잉 머신 → `indoor-rowing-machine.png` · 유산소 기구
```
203번 그림. 파일 이름: indoor-rowing-machine.png
SUBJECT: A generic indoor rowing machine (ergometer) (no brand, NO person). Draw its typical recognizable shape. Highlight in mint: the part the user moves (belt, pedals, handles or seat). Lavender arrow: the direction of movement.
```

### 204. 스텝밀 → `stepmill.png` · 유산소 기구
```
204번 그림. 파일 이름: stepmill.png
SUBJECT: A generic stepmill (revolving staircase machine) (no brand, NO person). Draw its typical recognizable shape. Highlight in mint: the part the user moves (belt, pedals, handles or seat). Lavender arrow: the direction of movement.
```

### 205. 줄넘기 → `jumping-rope.png` · 사람(유산소·요가 등)
```
205번 그림. 파일 이름: jumping-rope.png
SUBJECT: The mannequin performing jumping rope, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the main working body area or the equipment the body interacts with. Lavender arrow: the main direction of movement.
```

### 206. 수영 → `freestyle-swimming.png` · 사람(유산소·요가 등)
```
206번 그림. 파일 이름: freestyle-swimming.png
SUBJECT: The mannequin performing freestyle swimming, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the main working body area or the equipment the body interacts with. Lavender arrow: the main direction of movement.
```

### 207. 등산 → `hiking-uphill-with-a-backpack-and-trekking-poles.png` · 사람(유산소·요가 등)
```
207번 그림. 파일 이름: hiking-uphill-with-a-backpack-and-trekking-poles.png
SUBJECT: The mannequin performing hiking uphill with a backpack and trekking poles, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the main working body area or the equipment the body interacts with. Lavender arrow: the main direction of movement.
```

### 208. 러닝머신 → `treadmill.png` · 유산소 기구
```
208번 그림. 파일 이름: treadmill.png
SUBJECT: A generic treadmill (no brand, NO person). Draw its typical recognizable shape. Highlight in mint: the part the user moves (belt, pedals, handles or seat). Lavender arrow: the direction of movement.
```

### 209. 일립티컬 → `elliptical-cross-trainer.png` · 유산소 기구
```
209번 그림. 파일 이름: elliptical-cross-trainer.png
SUBJECT: A generic elliptical cross trainer (no brand, NO person). Draw its typical recognizable shape. Highlight in mint: the part the user moves (belt, pedals, handles or seat). Lavender arrow: the direction of movement.
```

### 210. 스피닝 → `indoor-spinning-bike.png` · 유산소 기구
```
210번 그림. 파일 이름: indoor-spinning-bike.png
SUBJECT: A generic indoor spinning bike (no brand, NO person). Draw its typical recognizable shape. Highlight in mint: the part the user moves (belt, pedals, handles or seat). Lavender arrow: the direction of movement.
```

### 211. 에어바이크 → `air-bike.png` · 유산소 기구
```
211번 그림. 파일 이름: air-bike.png
SUBJECT: A generic air bike (fan bike with moving handles) (no brand, NO person). Draw its typical recognizable shape. Highlight in mint: the part the user moves (belt, pedals, handles or seat). Lavender arrow: the direction of movement.
```

### 212. 스키에르그 → `skierg-machine.png` · 유산소 기구
```
212번 그림. 파일 이름: skierg-machine.png
SUBJECT: A generic SkiErg machine (no brand, NO person). Draw its typical recognizable shape. Highlight in mint: the part the user moves (belt, pedals, handles or seat). Lavender arrow: the direction of movement.
```

### 213. 계단 오르기 → `stair-climbing-on-real-stairs.png` · 사람(유산소·요가 등)
```
213번 그림. 파일 이름: stair-climbing-on-real-stairs.png
SUBJECT: The mannequin performing stair climbing on real stairs, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the main working body area or the equipment the body interacts with. Lavender arrow: the main direction of movement.
```

### 214. 인터벌 러닝 → `sprint-running.png` · 사람(유산소·요가 등)
```
214번 그림. 파일 이름: sprint-running.png
SUBJECT: The mannequin performing sprint running (fast stride, interval training), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the main working body area or the equipment the body interacts with. Lavender arrow: the main direction of movement.
```

### 215. 야외 러닝 → `outdoor-running.png` · 사람(유산소·요가 등)
```
215번 그림. 파일 이름: outdoor-running.png
SUBJECT: The mannequin performing outdoor running, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the main working body area or the equipment the body interacts with. Lavender arrow: the main direction of movement.
```

### 216. 실내 사이클 → `indoor-cycling-bike.png` · 유산소 기구
```
216번 그림. 파일 이름: indoor-cycling-bike.png
SUBJECT: A generic indoor cycling bike (no brand, NO person). Draw its typical recognizable shape. Highlight in mint: the part the user moves (belt, pedals, handles or seat). Lavender arrow: the direction of movement.
```

## 필라테스 (5개)

### 217. 필라테스 매트 → `pilates-mat-exercise-the-hundred.png` · 사람(유산소·요가 등)
```
217번 그림. 파일 이름: pilates-mat-exercise-the-hundred.png
SUBJECT: The mannequin performing Pilates mat exercise "the hundred" (on back, head and legs lifted, arms pumping), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the main working body area or the equipment the body interacts with. Lavender arrow: the main direction of movement.
```

### 218. 필라테스 리포머 → `pilates-reformer-footwork.png` · 필라테스 기구+사람
```
218번 그림. 파일 이름: pilates-reformer-footwork.png
SUBJECT: The mannequin doing Pilates reformer footwork. Draw the apparatus simply and clearly so it is recognizable. Keep the mannequin and the apparatus slightly separated where they would overlap. Highlight in mint: the moving part of the apparatus (carriage, springs, bar or pedal). Lavender arrow: direction of movement.
```

### 219. 필라테스 캐딜락 → `pilates-cadillac-with-roll-down-bar.png` · 필라테스 기구+사람
```
219번 그림. 파일 이름: pilates-cadillac-with-roll-down-bar.png
SUBJECT: The mannequin doing Pilates Cadillac (trapeze table) with roll-down bar. Draw the apparatus simply and clearly so it is recognizable. Keep the mannequin and the apparatus slightly separated where they would overlap. Highlight in mint: the moving part of the apparatus (carriage, springs, bar or pedal). Lavender arrow: direction of movement.
```

### 220. 필라테스 체어 → `pilates-wunda-chair-pedal-press.png` · 필라테스 기구+사람
```
220번 그림. 파일 이름: pilates-wunda-chair-pedal-press.png
SUBJECT: The mannequin doing Pilates Wunda chair pedal press. Draw the apparatus simply and clearly so it is recognizable. Keep the mannequin and the apparatus slightly separated where they would overlap. Highlight in mint: the moving part of the apparatus (carriage, springs, bar or pedal). Lavender arrow: direction of movement.
```

### 221. 필라테스 바렐 → `pilates-ladder-barrel-stretch.png` · 필라테스 기구+사람
```
221번 그림. 파일 이름: pilates-ladder-barrel-stretch.png
SUBJECT: The mannequin doing Pilates ladder barrel stretch. Draw the apparatus simply and clearly so it is recognizable. Keep the mannequin and the apparatus slightly separated where they would overlap. Highlight in mint: the moving part of the apparatus (carriage, springs, bar or pedal). Lavender arrow: direction of movement.
```

## 요가 (4개)

### 222. 요가 → `yoga-tree-pose.png` · 사람(유산소·요가 등)
```
222번 그림. 파일 이름: yoga-tree-pose.png
SUBJECT: The mannequin performing yoga tree pose, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the main working body area or the equipment the body interacts with. Lavender arrow: the main direction of movement.
```

### 223. 빈야사 요가 → `vinyasa-yoga-downward-facing-dog.png` · 사람(유산소·요가 등)
```
223번 그림. 파일 이름: vinyasa-yoga-downward-facing-dog.png
SUBJECT: The mannequin performing vinyasa yoga downward-facing dog, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the main working body area or the equipment the body interacts with. Lavender arrow: the main direction of movement.
```

### 224. 하타 요가 → `hatha-yoga-warrior-ii-pose.png` · 사람(유산소·요가 등)
```
224번 그림. 파일 이름: hatha-yoga-warrior-ii-pose.png
SUBJECT: The mannequin performing hatha yoga warrior II pose, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the main working body area or the equipment the body interacts with. Lavender arrow: the main direction of movement.
```

### 225. 핫 요가 → `hot-yoga-triangle-pose-on-a-mat-with-a-small-tow.png` · 사람(유산소·요가 등)
```
225번 그림. 파일 이름: hot-yoga-triangle-pose-on-a-mat-with-a-small-tow.png
SUBJECT: The mannequin performing hot yoga triangle pose on a mat with a small towel, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the main working body area or the equipment the body interacts with. Lavender arrow: the main direction of movement.
```

## 기타 (4개)

### 226. 스트레칭 → `standing-hamstring-stretch.png` · 사람(유산소·요가 등)
```
226번 그림. 파일 이름: standing-hamstring-stretch.png
SUBJECT: The mannequin performing standing hamstring stretch, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the main working body area or the equipment the body interacts with. Lavender arrow: the main direction of movement.
```

### 227. 폼롤러 → `foam-rolling-the-thigh.png` · 사람(유산소·요가 등)
```
227번 그림. 파일 이름: foam-rolling-the-thigh.png
SUBJECT: The mannequin performing foam rolling the thigh (lying on a foam roller), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the main working body area or the equipment the body interacts with. Lavender arrow: the main direction of movement.
```

### 228. 클라이밍 → `indoor-bouldering-on-a-climbing-wall-with-holds.png` · 사람(유산소·요가 등)
```
228번 그림. 파일 이름: indoor-bouldering-on-a-climbing-wall-with-holds.png
SUBJECT: The mannequin performing indoor bouldering on a climbing wall with holds, shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the main working body area or the equipment the body interacts with. Lavender arrow: the main direction of movement.
```

### 229. 구기 운동 → `ball-sports.png` · 사람(유산소·요가 등)
```
229번 그림. 파일 이름: ball-sports.png
SUBJECT: The mannequin performing ball sports (person kicking or throwing a ball), shown at the single most recognizable moment of the movement, side 3/4 view so joint angles are clear. Highlight in mint: the main working body area or the equipment the body interacts with. Lavender arrow: the main direction of movement.
```
