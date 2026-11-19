# 마이로그 첫 업로드 스크립트 (한 번만 실행)
# 사용: 이 폴더에서 PowerShell로 .\publish-first.ps1
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
if (Test-Path .git) { throw '이미 git 저장소입니다. 첫 업로드는 끝난 상태일 수 있습니다.' }
git init -b main
git config user.name studiohooje
git config user.email studiohooje@users.noreply.github.com
git add -A
git commit -m "Mylogue 3.0.0: 마웨로그에서 이름 변경 및 새 저장소 이관"
git remote add origin https://github.com/studiohooje/mylogue.git
git push -u origin main
Write-Host '업로드 완료. GitHub Actions 배포가 끝나면 https://studiohooje.github.io/mylogue/ 에서 열립니다.'
