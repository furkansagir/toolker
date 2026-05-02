# Insert consistent favicon <link> tags into all HTML files (idempotent).
$ErrorActionPreference = "Stop"
$root = Split-Path $PSScriptRoot -Parent

function Get-DepthFromRoot([string]$dirPath) {
  if ($dirPath -eq $root) { return 0 }
  $rel = $dirPath.Substring($root.Length).TrimStart('\', '/')
  if (-not $rel) { return 0 }
  return ($rel -split '[\\/]').Count
}

function Get-RelPrefix([int]$depth) {
  if ($depth -le 0) { return "" }
  return ("../" * $depth)
}

$marker = "<!-- Toolker favicons -->"
$files = Get-ChildItem -Path $root -Filter "*.html" -Recurse -File

foreach ($f in $files) {
  $raw = Get-Content -LiteralPath $f.FullName -Raw -Encoding UTF8
  if ($raw -notmatch [regex]::Escape($marker)) {
    $depth = Get-DepthFromRoot $f.DirectoryName
    $p = Get-RelPrefix $depth
    $block = @"
$marker
  <link rel="icon" href="${p}assets/branding/favicon.ico" sizes="any">
  <link rel="icon" href="${p}assets/branding/favicon-32x32.png" type="image/png" sizes="32x32">
  <link rel="icon" href="${p}assets/branding/favicon-16x16.png" type="image/png" sizes="16x16">
  <link rel="apple-touch-icon" href="${p}assets/branding/apple-touch-icon.png" sizes="180x180">
"@
    $vp = '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
    if ($raw -notlike "*$vp*") {
      Write-Warning "Skip (no viewport): $($f.FullName)"
      continue
    }
    $raw = $raw.Replace($vp, "$vp`n$block")
  }

  # Remove legacy single favicon.png link if present
  $raw = $raw -replace '\s*<link rel="icon" href="[^"]*favicon\.png"[^>]*>\s*', "`n"

  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($f.FullName, $raw, $utf8NoBom)
}

Write-Host "Patched $($files.Count) HTML file(s)."
