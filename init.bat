@echo off
setlocal enabledelayedexpansion

if exist package-lock.json del /f /q package-lock.json
if exist node_modules rmdir /S /Q node_modules


REM 1. Install dependencies
echo Installing dependencies...
call npm install

REM 2. Build project
echo Building project...
call npm run build

REM 3. Define XAMPP path (állítsd a saját gépednek megfelelően)
set XAMPP_PATH=C:\xampp\htdocs

REM 4. Copy dist contents to build folder (assets nélkül)
echo Copying dist contents (except assets) to %XAMPP_PATH%\build ...
if not exist "%XAMPP_PATH%\build" mkdir "%XAMPP_PATH%\build"
robocopy dist "%XAMPP_PATH%\build" /E /XD dist\assets


REM 4.1 Copy assets separately to %XAMPP_PATH%\assets
echo Copying dist\assets to %XAMPP_PATH%\assets ...
REM töröljük a célmappa tartalmát, ha létezik
if exist "%XAMPP_PATH%\assets" rmdir /S /Q "%XAMPP_PATH%\assets"
REM hozzuk létre újra az üres mappát
mkdir "%XAMPP_PATH%\assets"
xcopy /E /Y /I dist\assets\* "%XAMPP_PATH%\assets\"

REM 5. Copy get_data.php from local api folder to XAMPP api folder
echo Copying api\get_data.php to %XAMPP_PATH%\api ...
if not exist "%XAMPP_PATH%\api" mkdir "%XAMPP_PATH%\api"
copy /Y api\get_data.php "%XAMPP_PATH%\api\"

echo.
echo ✅ Deployment completed!
echo Open your browser at: http://localhost/build/index.html
