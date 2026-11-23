$project = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $project
$wingetLinks = Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Links"
$env:PATH = "$wingetLinks;$env:PATH"
Start-Process -FilePath "node" -ArgumentList "src/server.js" -WorkingDirectory $project -WindowStyle Hidden -PassThru |
  ForEach-Object { Start-Sleep -Milliseconds 900; $chromePaths = @(
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
  )
  $browser = $chromePaths | Where-Object { Test-Path $_ } | Select-Object -First 1
  if ($browser) {
    Start-Process -FilePath $browser -ArgumentList @("--app=http://127.0.0.1:4181", "--window-size=1100,720")
  } else {
    Start-Process "http://127.0.0.1:4181"
  }
}
