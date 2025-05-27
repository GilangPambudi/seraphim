export interface PhoneModel {
  mainModelName: string
  codename?: string
  variants: PhoneVariant[]
  series?: string
}

export interface PhoneVariant {
  modelNumber: string
  variantName: string
}

export interface Brand {
  name: string
  slug: string
  filename: string
  models: PhoneModel[]
}

export interface SearchResult {
  brand: string
  brandSlug: string
  mainModelName: string
  modelNumber: string
  variantName: string
  codename?: string
}

export interface GitHubFile {
  name: string
  path: string
  download_url: string
}
