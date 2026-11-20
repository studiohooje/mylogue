# 제조사 머신 라인업 조사 노트 (2026-11-21, 3.15.0)

앱에 기본으로 넣은 제조사 모델(`app/machine-brands.js`, 11개 라인 139개 모델)의 근거다.
모델 하나하나는 `machines.md`의 머신 종류(일반 머신)에 연결된다. 부하 방식, 좌우, 근육 부하는 그 종류에서 물려받는다.

## 넣은 라인과 확인 출처

| 제조사 | 라인 | 단위(대체로) | 확인 출처 |
|---|---|---|---|
| Hammer Strength | Plate-Loaded | lb | [plate loaded 카탈로그](https://www.lifefitness.com/en-us/catalog/strength-training/plate-loaded), [Hammer Strength 브랜드](https://www.lifefitness.com/en-us/brands/hammer-strength), [Iso-Lateral Bench Press](https://shop.lifefitness.com/products/hammer-strength-plate-loaded-iso-lateral-bench-press) |
| Hammer Strength | Select | lb | [Life Fitness 셀렉터라이즈드](https://www.lifefitness.com/en-us/catalog/strength-training/selectorized) |
| Life Fitness | Insignia | lb | [Insignia 시리즈](https://www.lifefitness.com/en-us/insignia-series), [지원 문서](https://support.lifefitness.com/hc/en-us/articles/360043013553-Life-Fitness-Insignia-Series) |
| Cybex | Prestige Strength VRS | lb | [VRS Chest Press](https://www.lifefitness.com/en-hk/catalog/cybex/cybex-products/cybex-prestige-strength-vrs-chest-press), [VRS Row](https://www.lifefitness.com/en-us/catalog/cybex/cybex-products/cybex-prestige-strength-vrs-row) — 일부는 단종 표시 |
| Cybex | Eagle NX | lb | Life Fitness Cybex 카탈로그 [추론: 세부 모델명은 대표 구성] |
| Technogym | Selection 900 | kg | [Selection 900](https://www.technogym.com/en-HK/category/selection-900/), [Selection 라인](https://www.technogym.com/en-HK/category/selection/) |
| Technogym | Pure Strength | kg | Technogym 원판식 라인 [추론: 대표 6종만] |
| Matrix | Ultra | lb | [Matrix Strength Brochure 2025](https://pdf.archiexpo.com/pdf/matrix/strength-brochure-2025/141371-449341.html), [Ultra Prone Leg Curl](https://www.johnsonfitness.com/Matrix-Ultra-Prone-Leg-Curl-P36314.aspx), [Ultra Hip Abductor](https://www.johnsonfitness.com/Matrix-Ultra-Hip-Abductor-P36316.aspx) |
| Matrix | Magnum | lb | 같은 브로슈어 [추론: 대표 5종만] |
| Panatta | Fit Evo | kg | [MedicalExpo Panatta 제품 목록](https://www.medicalexpo.com/prod/panatta-113146.html), [Keystone Fit Evo](https://keystonefitness.ca/product-category/panatta-strength-equipment/fit-evo) |
| gym80 | Pure Kraft | kg | [Beyond the Basics 대리점 목록](https://beyondthebasicsfitness.com/product-subgroups/Plate+Loaded+Machines/9?page=7), [ArchiExpo gym80](https://www.archiexpo.com/prod/gym80-international-gmbh-4635313.html) |

## 넣지 않은 것과 이유

- **국산(DRAX, 뉴텍, IMP, 레드엔진 등)**: 공식 사이트에서 모델 목록을 확인하지 못했다(인증서 만료, 목록 페이지 없음). 지어내지 않고 기존 '제조사 머신 등록 요청 → 관리자 승인'으로 받는다.
- **Precor, Nautilus, Prime, Arsenal**: 국내 보급이 상대적으로 적고 이번 조사에서 목록을 충분히 확인하지 못했다. 다음 조사 대상이다.
- **모델 번호(SKU)**: 지역마다 다르고 자주 바뀌어 넣지 않았다. 이름만 쓴다.

## 근육 부하를 정하는 규칙

1. 머신 종류마다 주동근·보조근을 정했다(`machines-catalog.js`의 `T`). 근거는 `machines.md` 1절이고, ExRx·제조사 설명을 마이로그 15구역으로 줄였다.
2. 머신을 고르면 기록의 근육은 앱이 넣는다. 사용자는 고르지 않는다.
3. 같은 머신으로 다른 동작을 하면 종목 값을 쓴다. 예를 들어 레그 프레스 머신으로 카프 레이즈를 하면 종아리가 된다. 판단 기준은 머신 주동근과 종목 주동근이 겹치는지다.
4. 케이블 크로스오버, 케이블 스테이션, 스미스 머신은 동작마다 근육이 달라서 종목 값을 쓴다.

## 한계

- 카탈로그 이름은 지역·연식에 따라 다르다. 헬스장에 있는 기계의 이름이 다르면 사용자가 '내 머신'으로 등록하고, 머신 종류만 고르면 근육은 자동으로 맞춰진다.
- 같은 종류라도 제조사마다 궤적이 달라 근육 비중이 조금씩 다르다. 지금은 종류 단위로만 구분한다.
