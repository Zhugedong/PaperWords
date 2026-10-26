$ErrorActionPreference='Stop'
$env:ELECTRON_BUILDER_CACHE=Join-Path $PSScriptRoot '..\.builder-cache'
Push-Location (Join-Path $PSScriptRoot '..')
try {
  New-Item -ItemType Directory -Path work -Force | Out-Null
  & .\node_modules\.bin\electron-builder.cmd --win --dir
  if($LASTEXITCODE -ne 0){throw '程序构建失败'}
  & C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /nologo /target:winexe /reference:System.Windows.Forms.dll /out:work\PaperWords-launcher.exe scripts\Launcher.cs
  if($LASTEXITCODE -ne 0){throw '启动器构建失败'}
  Copy-Item -LiteralPath work\PaperWords-launcher.exe -Destination release\PaperWords.exe -Force
} finally {Pop-Location}

