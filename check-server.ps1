# Скрипт для проверки и запуска backend сервера
$port = 3000
$projectPath = "c:\Users\user\Desktop\studycenter"

# Проверяем, слушает ли что-то порт 3000
$listening = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue

if ($listening) {
    Write-Host "✅ Backend сервер уже запущен на порту $port" -ForegroundColor Green
    exit 0
}

Write-Host "⚠️  Backend сервер не запущен. Запускаю..." -ForegroundColor Yellow

# Переходим в директорию проекта
Set-Location $projectPath

# Запускаем сервер в новом окне PowerShell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath'; Write-Host 'Запуск backend сервера...' -ForegroundColor Cyan; npm run dev"

Write-Host "✅ Backend сервер запускается в новом окне PowerShell" -ForegroundColor Green
Write-Host "Подождите несколько секунд, пока сервер запустится..." -ForegroundColor Yellow








