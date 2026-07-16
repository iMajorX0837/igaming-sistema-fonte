@echo off
chcp 65001 >nul
setlocal

set "ROOT=%~dp0"
set "API_DIR=%ROOT%PlayFiverAPI"
set "FRONT_DIR=%ROOT%VenuzBET - Front"
set "ADMIN_DIR=%ROOT%AdminPainel"

echo.
echo  VenuzBET - ambiente local
echo  ========================
echo.

if not exist "%API_DIR%\package.json" (
  echo [ERRO] PlayFiverAPI nao encontrada em:
  echo   %API_DIR%
  pause
  exit /b 1
)

if not exist "%FRONT_DIR%\package.json" (
  echo [ERRO] Front nao encontrado em:
  echo   %FRONT_DIR%
  pause
  exit /b 1
)

if not exist "%ADMIN_DIR%\package.json" (
  echo [ERRO] AdminPainel nao encontrado em:
  echo   %ADMIN_DIR%
  pause
  exit /b 1
)

echo [1/3] Abrindo PlayFiverAPI  ^(http://localhost:3000^)...
start "PlayFiverAPI" cmd /k "cd /d "%API_DIR%" && npm run dev"

timeout /t 2 /nobreak >nul

echo [2/3] Abrindo VenuzBET Front ^(http://localhost:5173^)...
start "VenuzBET Front" cmd /k "cd /d "%FRONT_DIR%" && npm run dev"

timeout /t 2 /nobreak >nul

echo [3/3] Abrindo Admin Painel ^(http://localhost:3002^)...
start "Admin Painel" cmd /k "cd /d "%ADMIN_DIR%" && npm run dev"

echo.
echo  Pronto! Tres janelas foram abertas:
echo    API:   http://localhost:3000
echo    Site:  http://localhost:5173
echo    Admin: http://localhost:3002
echo.
echo  Feche as janelas do terminal para parar os servidores.
echo.
pause
