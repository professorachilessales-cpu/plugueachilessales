# Script PowerShell para Iniciar o Servidor School OS
$Host.UI.RawUI.WindowTitle = "Servidor School OS (PLUGUE)"

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "          INICIANDO SERVIDOR SCHOOL OS                " -ForegroundColor Yellow
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location -Path $PSScriptRoot

# Abre o navegador automaticamente após 3 segundos
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:3000"
} | Out-Null

npm run dev
