# Generate favicon PNGs from assets/branding/toolker-logo.png
# Requires Windows PowerShell + System.Drawing

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

# Repo root = parent of /scripts
$root = Split-Path $PSScriptRoot -Parent
$srcPath = Join-Path $root "assets\branding\toolker-logo.png"
$outDir = Join-Path $root "assets\branding"

if (-not (Test-Path $srcPath)) {
  throw "Source logo not found: $srcPath"
}

function New-Graphics {
  param([System.Drawing.Bitmap]$Bitmap)
  $g = [System.Drawing.Graphics]::FromImage($Bitmap)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  return $g
}

function Save-Png {
  param([System.Drawing.Image]$Img, [string]$Path)
  $Img.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
}

$src = [System.Drawing.Image]::FromFile($srcPath)

try {
  $fmtArgb = [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
  # --- 32x32: full logo, letterboxed transparent ---
  $w32 = 32; $h32 = 32
  $bmp32 = New-Object System.Drawing.Bitmap($w32, $h32, $fmtArgb)
  $g32 = New-Graphics $bmp32
  $g32.Clear([System.Drawing.Color]::Transparent)
  $ratio = [Math]::Min($w32 / $src.Width, $h32 / $src.Height)
  $dw = [int][Math]::Round($src.Width * $ratio)
  $dh = [int][Math]::Round($src.Height * $ratio)
  $dx = [int](($w32 - $dw) / 2)
  $dy = [int](($h32 - $dh) / 2)
  $g32.DrawImage($src, $dx, $dy, $dw, $dh)
  $g32.Dispose()
  Save-Png $bmp32 (Join-Path $outDir "favicon-32x32.png")
  $bmp32.Dispose()

  # --- 16x16: tight center crop so the mark stays readable ---
  $cropFactor = 0.68
  $cw = [int][Math]::Round([Math]::Min($src.Width, $src.Height) * $cropFactor)
  $ch = $cw
  $cx = [int](($src.Width - $cw) / 2)
  $cy = [int](($src.Height - $ch) / 2)
  $cropRect = New-Object System.Drawing.Rectangle $cx, $cy, $cw, $ch
  $cropped = $src.Clone($cropRect, $src.PixelFormat)
  $w16 = 16; $h16 = 16
  $bmp16 = New-Object System.Drawing.Bitmap($w16, $h16, $fmtArgb)
  $g16 = New-Graphics $bmp16
  $g16.Clear([System.Drawing.Color]::Transparent)
  $g16.DrawImage($cropped, 0, 0, $w16, $h16)
  $g16.Dispose()
  $cropped.Dispose()
  Save-Png $bmp16 (Join-Path $outDir "favicon-16x16.png")
  $bmp16.Dispose()

  # --- 180x180: Apple touch icon on solid panel background (no transparency issues on iOS) ---
  $side = 180
  $inner = 132
  $bmp180 = New-Object System.Drawing.Bitmap($side, $side, $fmtArgb)
  $g180 = New-Graphics $bmp180
  $g180.Clear([System.Drawing.Color]::FromArgb(255, 18, 26, 45))
  $ratio2 = [Math]::Min($inner / $src.Width, $inner / $src.Height)
  $dw2 = [int][Math]::Round($src.Width * $ratio2)
  $dh2 = [int][Math]::Round($src.Height * $ratio2)
  $dx2 = [int](($side - $dw2) / 2)
  $dy2 = [int](($side - $dh2) / 2)
  $g180.DrawImage($src, $dx2, $dy2, $dw2, $dh2)
  $g180.Dispose()
  Save-Png $bmp180 (Join-Path $outDir "apple-touch-icon.png")
  $bmp180.Dispose()

  # --- favicon.ico (32×32) for older browsers / default crawl ---
  Add-Type @"
    using System;
    using System.Runtime.InteropServices;
    public static class NativeMethods {
      [DllImport("user32.dll", SetLastError = true)]
      public static extern bool DestroyIcon(IntPtr hIcon);
    }
"@
  $icoPath = Join-Path $outDir "favicon.ico"
  $bmpIco = [System.Drawing.Bitmap]::FromFile((Join-Path $outDir "favicon-32x32.png"))
  try {
    $h = $bmpIco.GetHicon()
    $icon = [System.Drawing.Icon]::FromHandle($h)
    $fs = [System.IO.File]::Create($icoPath)
    $icon.Save($fs)
    $fs.Dispose()
    $icon.Dispose()
    [void][NativeMethods]::DestroyIcon($h)
  } finally {
    $bmpIco.Dispose()
  }

  Write-Host "Wrote favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png, favicon.ico -> $outDir"
}
finally {
  $src.Dispose()
}
