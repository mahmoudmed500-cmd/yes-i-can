Start-Process -NoNewWindow -FilePath "C:\Users\pp\Desktop\yes-i-can\backend\venv\Scripts\python.exe" -ArgumentList "-m","uvicorn","main:app","--reload","--port","8000" -WorkingDirectory "C:\Users\pp\Desktop\yes-i-can\backend"

Start-Process -NoNewWindow -FilePath "C:\Users\pp\Desktop\yes-i-can\frontend\node_modules\.bin\vite.cmd" -ArgumentList "--port","5173" -WorkingDirectory "C:\Users\pp\Desktop\yes-i-can\frontend"

Start-Sleep -Seconds 4

Write-Output ""
Write-Output "============================================="
Write-Output "  Yes I Can is running!"
Write-Output ""
Write-Output "  Frontend: http://localhost:5173"
Write-Output "  Backend:  http://localhost:8000"
Write-Output "  API Docs: http://localhost:8000/docs"
Write-Output ""
Write-Output "  Login: admin / admin123"
Write-Output "============================================="
Write-Output ""
Write-Output "Press Enter to stop both servers..."

Read-Host

Get-Process python -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*uvicorn*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*vite*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Output "Servers stopped."
