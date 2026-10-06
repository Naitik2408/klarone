
$ErrorActionPreference = "Stop"

$path = ".\apps\web\src\app\staff\catalogue\products\[id]\page.tsx"

if (-not (Test-Path -LiteralPath $path)) {
  throw "Product editor not found: $path"
}

$backup = "$path.bak-cache-fix-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item -LiteralPath $path -Destination $backup -Force
Write-Host "Product editor backup: $backup"

$content = [System.IO.File]::ReadAllText(
  [System.IO.Path]::GetFullPath($path)
)

$old = @'
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
'@

$new = @'
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
'@

if (-not $content.Contains($old)) {
  throw "Expected staffFetch block not found. No changes made."
}

$content = $content.Replace($old, $new)

[System.IO.File]::WriteAllText(
  [System.IO.Path]::GetFullPath($path),
  $content,
  (New-Object System.Text.UTF8Encoding($false))
)

Write-Host "Added cache: no-store to staff catalogue API requests."
Write-Host ""
Write-Host "Next:"
Write-Host "  cd apps\web"
Write-Host "  pnpm exec next build"
Write-Host ""
Write-Host "Then restart the Next dev server and hard-refresh the editor."
