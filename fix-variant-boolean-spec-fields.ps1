
$ErrorActionPreference = "Stop"

$path = ".\apps\api\src\modules\catalogue\catalogue.service.ts"

if (-not (Test-Path -LiteralPath $path)) {
  throw "Catalogue service not found: $path"
}

$backup = "$path.bak-bool-fix-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item -LiteralPath $path -Destination $backup -Force
Write-Host "Backup: $backup"

$content = [System.IO.File]::ReadAllText(
  [System.IO.Path]::GetFullPath($path)
)

$old = @'
              keyboardBacklight:
                specification.keyboardBacklight ?? null,
              fingerprintSensor:
                specification.fingerprintSensor ?? null,
'@

$new = @'
              keyboardBacklight:
                typeof specification.keyboardBacklight === "boolean"
                  ? specification.keyboardBacklight
                  : specification.keyboardBacklight === null ||
                    specification.keyboardBacklight === undefined ||
                    specification.keyboardBacklight === ""
                    ? null
                    : String(
                        specification.keyboardBacklight,
                      ).toLowerCase() === "true",
              fingerprintSensor:
                typeof specification.fingerprintSensor === "boolean"
                  ? specification.fingerprintSensor
                  : specification.fingerprintSensor === null ||
                    specification.fingerprintSensor === undefined ||
                    specification.fingerprintSensor === ""
                    ? null
                    : String(
                        specification.fingerprintSensor,
                      ).toLowerCase() === "true",
'@

if (-not $content.Contains($old)) {
  throw "Expected keyboardBacklight/fingerprintSensor block was not found. No changes made."
}

$content = $content.Replace($old, $new)

[System.IO.File]::WriteAllText(
  [System.IO.Path]::GetFullPath($path),
  $content,
  (New-Object System.Text.UTF8Encoding($false))
)

Write-Host "Fixed boolean specification fields in catalogue service."
Write-Host ""
Write-Host "Next:"
Write-Host "  cd apps\api"
Write-Host "  pnpm exec nest build"
