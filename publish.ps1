# 마이로그 배포 스크립트: 변경 사항을 커밋하고 GitHub에 올린다 (Actions가 자동 배포)
# 사용: .\publish.ps1 "커밋 메시지"
param([Parameter(Mandatory=$true)][string]$Message)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
git config i18n.commitEncoding utf-8
[System.IO.File]::WriteAllText("$PSScriptRoot\publish-msg.txt", $Message, (New-Object System.Text.UTF8Encoding($false)))
git add -A
git commit -F publish-msg.txt
Remove-Item publish-msg.txt -ErrorAction SilentlyContinue
git push
Write-Host '업로드 완료. GitHub Actions 배포가 끝나면 https://studiohooje.github.io/mylogue/ 에 반영됩니다.'
