$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $MyInvocation.MyCommand.Path
$app = Join-Path $project 'app'
$jdk = Join-Path $project 'jdk21\jdk-21.0.13.0.2+1'
$sdk = Join-Path $env:USERPROFILE 'AppData\Local\Android\Sdk'

if (-not (Test-Path (Join-Path $jdk 'bin\java.exe'))) {
    throw "JDK 21을 찾을 수 없습니다: $jdk"
}
if (-not (Test-Path (Join-Path $sdk 'platform-tools\adb.exe'))) {
    throw "Android SDK를 찾을 수 없습니다: $sdk"
}

$env:JAVA_HOME = $jdk
$env:ANDROID_HOME = $sdk
$env:GRADLE_USER_HOME = Join-Path $project '.gradle-cache'

# 네이티브 명령(npm·gradle)의 stderr 경고를 PowerShell 5.1이 오류로 보고 중단하지 않도록,
# 여기부터는 각 단계의 $LASTEXITCODE로만 성공 여부를 판단한다.
$ErrorActionPreference = 'Continue'

Push-Location $app
try {
    npm test
    if ($LASTEXITCODE -ne 0) { throw '자동 테스트 실패' }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw '웹 빌드 실패' }
    node verify-build.mjs
    if ($LASTEXITCODE -ne 0) { throw '웹 빌드 검증 실패' }
    npx cap sync android
    if ($LASTEXITCODE -ne 0) { throw 'Android 동기화 실패' }
    Push-Location 'android'
    try {
        .\gradlew.bat assembleDebug --no-daemon
        if ($LASTEXITCODE -ne 0) { throw 'APK 빌드 실패' }
    } finally { Pop-Location }
} finally { Pop-Location }

$apk = Join-Path $app 'android\app\build\outputs\apk\debug\app-debug.apk'
Get-Item $apk | Select-Object FullName, Length, LastWriteTime
Get-FileHash $apk -Algorithm SHA256 | Select-Object Hash
