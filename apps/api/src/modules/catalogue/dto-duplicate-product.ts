export interface DuplicateProductInput {
  /** New product title. Defaults to "<original> (Copy)". */
  name?: string;
  /** New slug. Defaults to "<original-slug>-copy", auto-suffixed on conflict. */
  slug?: string;
  /** Product status on the duplicate. Defaults to DRAFT. */
  status?: "DRAFT" | "PUBLISHED";
  /** Copy options + option values + variant-option links. Default: true. */
  copyOptions?: boolean;
  /** Copy variants (SKU auto-suffixed). Default: true. */
  copyVariants?: boolean;
  /** Copy media references. Default: false — usually you want to re-upload. */
  copyMedia?: boolean;
  /** Copy ports / features. Default: true. */
  copyPorts?: boolean;
  copyFeatures?: boolean;
  /** Copy tags. Default: true. */
  copyTags?: boolean;
  /** Copy ProductSpecification rows. Default: true. */
  copySpecifications?: boolean;
}

export interface ArchiveProductInput {
  reason?: string;
}

export interface DeleteVariantInput {
  /** Optional confirm message for audit trail. */
  reason?: string;
}