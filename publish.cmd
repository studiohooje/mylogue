@echo off
chcp 65001 >nul
cd /d "%~dp0"
git config i18n.commitEncoding utf-8
git add -A
git commit -F publish-msg.txt
git push
echo.
echo === DONE (exit %errorlevel%) ===
pause
