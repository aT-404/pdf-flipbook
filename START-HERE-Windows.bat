@echo off
setlocal
cd /d "%~dp0"
title PDF Flipbook
echo.
echo  ============================================================
echo    PDF Flipbook
echo  ============================================================
echo.

if not exist package.json goto notextracted

where node >nul 2>nul
if errorlevel 1 goto nonode

if exist node_modules goto run
echo  First-time setup: downloading what the app needs.
echo  This can take 2 to 5 minutes. Please wait and do not close this window.
echo.
call npm install
if errorlevel 1 goto failed

:run
call npm start
echo.
echo  The app has stopped. You can close this window.
pause
exit /b 0

:notextracted
echo  This file must stay inside the "pdf-flipbook" folder.
echo.
echo  It looks like the ZIP file was not unzipped yet.
echo  Please right-click the ZIP file, choose "Extract All...",
echo  then open the new folder and double-click this file again.
echo.
pause
exit /b 1

:nonode
echo  Node.js is not installed on this computer yet.
echo.
echo  1. A website will open now. Click the big green button that says LTS.
echo  2. Open the file that downloads and click Next until it finishes.
echo  3. Then double-click this START-HERE file again.
echo.
start "" https://nodejs.org
pause
exit /b 1

:failed
echo.
echo  Something went wrong during the first-time setup.
echo  Check that you are connected to the internet and try again.
echo  If it still fails, take a screenshot of this window and send it
echo  to the person who shared this with you.
echo.
pause
exit /b 1
