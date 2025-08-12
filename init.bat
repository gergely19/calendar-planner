@echo off
setlocal enabledelayedexpansion

REM 1. Install dependencies
echo Installing dependencies...
call npm install

REM 2. Build project
echo Building project...
call npm run build

REM 3. Define XAMPP path (állítsd a saját gépednek megfelelően)
set XAMPP_PATH=C:\xampp\htdocs

REM 4. Copy dist contents to build folder
echo Copying dist contents to %XAMPP_PATH%\build ...
if not exist "%XAMPP_PATH%\build" mkdir "%XAMPP_PATH%\build"
xcopy /E /Y /I dist\* "%XAMPP_PATH%\build\"

REM 5. Copy get_data.php from local api folder to XAMPP api folder
echo Copying api\get_data.php to %XAMPP_PATH%\api ...
if not exist "%XAMPP_PATH%\api" mkdir "%XAMPP_PATH%\api"
copy /Y api\get_data.php "%XAMPP_PATH%\api\"

echo.
echo ✅ Deployment completed!
echo Open your browser at: http://localhost/build/index.html

pause
