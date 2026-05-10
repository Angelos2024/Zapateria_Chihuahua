@echo off
setlocal

set "PROJECT_DIR=%~dp0"
set "SERVER_SCRIPT=%PROJECT_DIR%local-admin-server.ps1"

if not exist "%SERVER_SCRIPT%" (
  echo No se encontro local-admin-server.ps1 en:
  echo %PROJECT_DIR%
  pause
  exit /b 1
)

echo Iniciando Zapateria Chihuahua en servidor local...
echo.
echo URL:
echo http://127.0.0.1:45126/Zapateria_Chihuahua/botas-seguridad.html?admin=1
echo.
echo Deja esta ventana abierta mientras subes/guardas imagenes.
echo Para detener el servidor, cierra esta ventana o presiona Ctrl+C.
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SERVER_SCRIPT%"

echo.
echo Servidor detenido.
pause
