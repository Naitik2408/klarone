
$ErrorActionPreference = "Stop"

$path = ".\apps\web\src\app\staff\catalogue\products\[id]\page.tsx"

if (-not (Test-Path -LiteralPath $path)) {
  throw "Product editor not found: $path"
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backup = "$path.bak-variant-ui-$timestamp"
Copy-Item -LiteralPath $path -Destination $backup -Force
Write-Host "Product editor backup: $backup"

$content = [System.IO.File]::ReadAllText(
  [System.IO.Path]::GetFullPath($path)
)

# 1. Add create-variant state.
$stateAnchor = @'
  const [inventoryDeltas, setInventoryDeltas] = useState<
    Record<string, string>
  >({});
'@

$stateInsert = @'
  const [inventoryDeltas, setInventoryDeltas] = useState<
    Record<string, string>
  >({});

  const [createVariantOpen, setCreateVariantOpen] =
    useState(false);
  const [createVariantSaving, setCreateVariantSaving] =
    useState(false);
  const [createVariantError, setCreateVariantError] =
    useState("");

  const [newSku, setNewSku] = useState("");
  const [newVariantName, setNewVariantName] = useState("");
  const [newColor, setNewColor] = useState("");
  const [newRamGb, setNewRamGb] = useState("");
  const [newStorageGb, setNewStorageGb] = useState("");
  const [newOperatingSystem, setNewOperatingSystem] =
    useState("");
  const [newBasePrice, setNewBasePrice] = useState("");
  const [newSellingPrice, setNewSellingPrice] = useState("");
  const [newCompareAtPrice, setNewCompareAtPrice] =
    useState("");
  const [newWarrantyMonths, setNewWarrantyMonths] =
    useState("");
'@

if (-not $content.Contains($stateAnchor)) {
  throw "Could not find inventory state anchor."
}

$content = $content.Replace($stateAnchor, $stateInsert)

# 2. Add create/deactivate functions before handleLogout.
$functionAnchor = @'
  function handleLogout() {
'@

$functionInsert = @'
  async function createVariant() {
    if (!token) {
      return;
    }

    const sku = newSku.trim();
    const basePrice = Number(newBasePrice);
    const sellingPrice = Number(newSellingPrice);

    if (!sku) {
      setCreateVariantError("SKU is required.");
      return;
    }

    if (
      !Number.isFinite(basePrice) ||
      basePrice < 0 ||
      !Number.isFinite(sellingPrice) ||
      sellingPrice < 0
    ) {
      setCreateVariantError(
        "Enter valid non-negative base and selling prices.",
      );
      return;
    }

    setCreateVariantSaving(true);
    setCreateVariantError("");
    setError("");
    setSuccess("");

    try {
      await staffFetch(
        `/staff/catalogue/products/${productId}/variants`,
        token,
        {
          method: "POST",
          body: JSON.stringify({
            sku,
            variantName:
              newVariantName.trim() || null,
            color: newColor.trim() || null,
            ramGb:
              newRamGb.trim()
                ? Number(newRamGb)
                : null,
            storageGb:
              newStorageGb.trim()
                ? Number(newStorageGb)
                : null,
            operatingSystem:
              newOperatingSystem.trim() || null,
            basePrice,
            sellingPrice,
            compareAtPrice:
              newCompareAtPrice.trim()
                ? Number(newCompareAtPrice)
                : null,
            currency: "INR",
            warrantyMonths:
              newWarrantyMonths.trim()
                ? Number(newWarrantyMonths)
                : null,
          }),
        },
      );

      setCreateVariantOpen(false);
      setNewSku("");
      setNewVariantName("");
      setNewColor("");
      setNewRamGb("");
      setNewStorageGb("");
      setNewOperatingSystem("");
      setNewBasePrice("");
      setNewSellingPrice("");
      setNewCompareAtPrice("");
      setNewWarrantyMonths("");

      await loadAll(token);
      setSuccess(
        `Variant ${sku} created successfully.`,
      );
    } catch (caught) {
      if (
        caught instanceof Error &&
        "status" in caught &&
        (caught as StaffApiError).status === 401
      ) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }

      setCreateVariantError(
        caught instanceof Error
          ? caught.message
          : "Unable to create variant.",
      );
    } finally {
      setCreateVariantSaving(false);
    }
  }

  async function deactivateVariant(
    variantId: string,
    sku: string,
  ) {
    if (!token) {
      return;
    }

    const confirmed = window.confirm(
      `Deactivate variant ${sku}? It will no longer be active or sellable.`,
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await staffFetch(
        `/staff/catalogue/products/${productId}/variants/${variantId}/deactivate`,
        token,
        {
          method: "POST",
        },
      );

      await loadAll(token);
      setSuccess(
        `Variant ${sku} deactivated successfully.`,
      );
    } catch (caught) {
      if (
        caught instanceof Error &&
        "status" in caught &&
        (caught as StaffApiError).status === 401
      ) {
        clearStaffAccessToken();
        router.replace("/staff/login");
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to deactivate variant.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
'@

if (-not $content.Contains($functionAnchor)) {
  throw "Could not find handleLogout anchor."
}

$content = $content.Replace($functionAnchor, $functionInsert)

# 3. Add "Add variant" UI after the variants section intro.
$variantIntroAnchor = @'
          <div className="mb-6">
            <h2 className="text-lg font-semibold">
              Variants
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Edit every active variant on this product. Changes are saved
              together when you press Save changes.
            </p>
          </div>

          <div className="space-y-4">
'@

$variantIntroReplacement = @'
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">
                Variants
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Edit every active variant on this product. Changes are saved
                together when you press Save changes.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setCreateVariantError("");
                setCreateVariantOpen((current) => !current);
              }}
              className="rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white"
            >
              {createVariantOpen
                ? "Close"
                : "Add variant"}
            </button>
          </div>

          {createVariantOpen ? (
            <div className="mb-6 rounded-2xl border border-black/10 bg-neutral-50 p-5">
              <div className="mb-4">
                <h3 className="font-semibold">
                  Create variant
                </h3>
                <p className="mt-1 text-sm text-neutral-500">
                  Create the commercial variant first. You can add detailed
                  specifications after it is created.
                </p>
              </div>

              {createVariantError ? (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {createVariantError}
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <label className="text-sm font-medium">
                  SKU
                  <input
                    value={newSku}
                    onChange={(event) =>
                      setNewSku(event.target.value)
                    }
                    placeholder="HP-16-1TB"
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 font-normal outline-none focus:border-black"
                  />
                </label>

                <label className="text-sm font-medium">
                  Variant name
                  <input
                    value={newVariantName}
                    onChange={(event) =>
                      setNewVariantName(event.target.value)
                    }
                    placeholder="16GB / 1TB"
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 font-normal outline-none focus:border-black"
                  />
                </label>

                <label className="text-sm font-medium">
                  Color
                  <input
                    value={newColor}
                    onChange={(event) =>
                      setNewColor(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 font-normal outline-none focus:border-black"
                  />
                </label>

                <label className="text-sm font-medium">
                  RAM (GB)
                  <input
                    type="number"
                    value={newRamGb}
                    onChange={(event) =>
                      setNewRamGb(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 font-normal outline-none focus:border-black"
                  />
                </label>

                <label className="text-sm font-medium">
                  Storage (GB)
                  <input
                    type="number"
                    value={newStorageGb}
                    onChange={(event) =>
                      setNewStorageGb(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 font-normal outline-none focus:border-black"
                  />
                </label>

                <label className="text-sm font-medium">
                  Operating system
                  <input
                    value={newOperatingSystem}
                    onChange={(event) =>
                      setNewOperatingSystem(
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 font-normal outline-none focus:border-black"
                  />
                </label>

                <label className="text-sm font-medium">
                  Base price
                  <input
                    type="number"
                    value={newBasePrice}
                    onChange={(event) =>
                      setNewBasePrice(event.target.value)
                    }
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 font-normal outline-none focus:border-black"
                  />
                </label>

                <label className="text-sm font-medium">
                  Selling price
                  <input
                    type="number"
                    value={newSellingPrice}
                    onChange={(event) =>
                      setNewSellingPrice(
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 font-normal outline-none focus:border-black"
                  />
                </label>

                <label className="text-sm font-medium">
                  Compare-at price
                  <input
                    type="number"
                    value={newCompareAtPrice}
                    onChange={(event) =>
                      setNewCompareAtPrice(
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 font-normal outline-none focus:border-black"
                  />
                </label>

                <label className="text-sm font-medium">
                  Warranty (months)
                  <input
                    type="number"
                    value={newWarrantyMonths}
                    onChange={(event) =>
                      setNewWarrantyMonths(
                        event.target.value,
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 font-normal outline-none focus:border-black"
                  />
                </label>
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setCreateVariantOpen(false)
                  }
                  className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-medium"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => void createVariant()}
                  disabled={createVariantSaving}
                  className="rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {createVariantSaving
                    ? "Creating..."
                    : "Create variant"}
                </button>
              </div>
            </div>
          ) : null}

          <div className="space-y-4">
'@

if (-not $content.Contains($variantIntroAnchor)) {
  throw "Could not find variants intro anchor."
}

$content = $content.Replace(
  $variantIntroAnchor,
  $variantIntroReplacement
)

# 4. Add deactivate button inside each expanded variant panel.
$specHeadingAnchor = @'
                      <div>
                        <div className="mb-3 font-semibold">
                          Technical specifications
                        </div>
'@

$specHeadingReplacement = @'
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold">
                            Variant lifecycle
                          </div>
                          <div className="mt-1 text-sm text-neutral-500">
                            Deactivation keeps the variant history but removes it
                            from active catalogue and selling flows.
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            void deactivateVariant(
                              variant.id,
                              variant.sku,
                            )
                          }
                          disabled={saving}
                          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 disabled:opacity-50"
                        >
                          Deactivate variant
                        </button>
                      </div>

                      <div>
                        <div className="mb-3 font-semibold">
                          Technical specifications
                        </div>
'@

if (-not $content.Contains($specHeadingAnchor)) {
  throw "Could not find technical specifications anchor."
}

$content = $content.Replace(
  $specHeadingAnchor,
  $specHeadingReplacement
)

[System.IO.File]::WriteAllText(
  [System.IO.Path]::GetFullPath($path),
  $content,
  (New-Object System.Text.UTF8Encoding($false))
)

Write-Host ""
Write-Host "Variant lifecycle UI installed."
Write-Host "Backup: $backup"
Write-Host ""
Write-Host "Next:"
Write-Host "  cd apps\web"
Write-Host "  pnpm exec next build"
