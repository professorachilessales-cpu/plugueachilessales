@echo off
title INICIAR SERVIDOR - SCHOOL OS (PLUGUE)
chcp 65001 > nul

echo ======================================================
echo           INICIANDO SERVIDOR SCHOOL OS
echo ======================================================
echo.

:: Navega para a pasta do projeto
cd /d "%~dp0"

:: Abre o navegador no endereco local apos 3 segundos
start "" cmd /c "timeout /t 3 /nobreak > nul && start http://localhost:3000"

:: Executa o servidor de desenvolvimento
npm run dev

pause