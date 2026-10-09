@echo off
setlocal EnableExtensions DisableDelayedExpansion

rem Run the existing safety checks without depending on PowerShell in PATH.
set "PUSH_SCRIPT=%~dp0push-github.ps1"
set "POWERSHELL_EXE="

if not exist "%PUSH_SCRIPT%" (
    echo ERROR: push-github.ps1 is missing next to this CMD file.
    exit /b 1
)

if exist "%SystemRoot%\Sysnative\WindowsPowerShell\v1.0\powershell.exe" set "POWERSHELL_EXE=%SystemRoot%\Sysnative\WindowsPowerShell\v1.0\powershell.exe"
if not defined POWERSHELL_EXE if exist "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" set "POWERSHELL_EXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
if not defined POWERSHELL_EXE if exist "%ProgramFiles%\PowerShell\7\pwsh.exe" set "POWERSHELL_EXE=%ProgramFiles%\PowerShell\7\pwsh.exe"
if not defined POWERSHELL_EXE if exist "%ProgramW6432%\PowerShell\7\pwsh.exe" set "POWERSHELL_EXE=%ProgramW6432%\PowerShell\7\pwsh.exe"

if not defined POWERSHELL_EXE (
    echo ERROR: Windows PowerShell or PowerShell 7 was not found.
    echo This CMD launcher needs PowerShell to run the existing publication checks.
    exit /b 1
)

echo Repository: https://github.com/bucala/Kinematicke_modely
echo Git, Node.js, tests and the existing Git identity will be checked.
echo Cloudflare is not configured by this script.
echo.

"%POWERSHELL_EXE%" -NoLogo -NoProfile -ExecutionPolicy RemoteSigned -File "%PUSH_SCRIPT%" %*
set "PUSH_EXIT_CODE=%ERRORLEVEL%"
if not "%PUSH_EXIT_CODE%"=="0" echo Publication did not finish successfully. Review the error above.
exit /b %PUSH_EXIT_CODE%
