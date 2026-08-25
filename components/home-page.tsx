"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { AlertCircle, ArrowRight, RefreshCw, Search } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Footer from "@/components/footer"
import { ThemeToggle } from "@/components/theme-toggle"
import { fetchBrandFiles, loadBrandModels } from "@/lib/api-client"
import { cacheManager } from "@/lib/cache-manager"
import { parseBrandName, searchModels } from "@/lib/data-parser"
import type { Brand, SearchResult } from "@/types/phone-models"

type HomePageProps = {
  onWarmBrand?: (brand: Brand) => void
  onNavigateBrand?: (brand: Brand) => void
  progressBrandSlug?: string | null
}

export function HomePage({ onWarmBrand, onNavigateBrand, progressBrandSlug }: HomePageProps = {}) {
  const [allBrands, setAllBrands] = useState<Brand[]>([])
  const [filteredBrands, setFilteredBrands] = useState<Brand[]>([])
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [searchMode, setSearchMode] = useState<"brands" | "models">("brands")
  const [loading, setLoading] = useState(true)
  const [loadingMessage, setLoadingMessage] = useState("")
  const [error, setError] = useState("")
  const [retryCount, setRetryCount] = useState(0)
  const [isFromCache, setIsFromCache] = useState(false)
  const [cacheInfo, setCacheInfo] = useState<{ age?: number; expiresIn?: number } | null>(null)
  const [isModelsLoading, setIsModelsLoading] = useState(false)
  const [modelsLoadedCount, setModelsLoadedCount] = useState(0)

  useEffect(() => {
    async function loadAllData() {
      setLoading(true)
      setError("")
      setLoadingMessage("Initializing...")

      try {
        console.log("Loading all brands and models...")

        const allModelsGlobalCacheKey = "all_models_global_data"
        const allBrandsMetadataKey = "all_brands_metadata"
        const cachedGlobalModels = cacheManager.get<Brand[]>(allModelsGlobalCacheKey)

        if (cachedGlobalModels) {
          console.log("Loading all data (brands and models) from global cache")
          setLoadingMessage("Loading all data from cache...")
          setAllBrands(cachedGlobalModels)
          setFilteredBrands(cachedGlobalModels)
          setIsFromCache(true)

          const info = cacheManager.getCacheInfo(allModelsGlobalCacheKey)
          setCacheInfo(info)
        } else {
          console.log("Fetching fresh data for all brands, then models in background")
          setLoadingMessage("Fetching brands list from repository...")
          setIsFromCache(false)

          const files = await fetchBrandFiles()

          if (files.length === 0) {
            setError("No brand files found in the repository")
            return
          }

          const brandMetadata: Brand[] = files
            .map((file) => {
              const { name, slug } = parseBrandName(file.name)
              return { name, slug, filename: file.name, models: [] } as Brand
            })
            .sort((a, b) => a.name.localeCompare(b.name))

          cacheManager.set(allBrandsMetadataKey, brandMetadata)
          setAllBrands(brandMetadata)
          setFilteredBrands(brandMetadata)
          setLoading(false)

          setIsModelsLoading(true)
          setModelsLoadedCount(0)

          const resultsMap = new Map<string, Brand>()

          await Promise.allSettled(
            brandMetadata.map(async (brand) => {
              try {
                const models = await loadBrandModels(brand.filename, brand.slug)
                resultsMap.set(brand.slug, { ...brand, models })
                setAllBrands((prev) =>
                  prev.map((item) => (item.slug === brand.slug ? { ...item, models } : item)),
                )
              } catch (error) {
                console.error(`Failed to load models for ${brand.name}:`, error)
                resultsMap.set(brand.slug, { ...brand, models: [] })
              } finally {
                setModelsLoadedCount((count) => count + 1)
              }
            }),
          )

          const completedBrands = brandMetadata.map((brand) => resultsMap.get(brand.slug) ?? brand)
          cacheManager.set(allModelsGlobalCacheKey, completedBrands)
          console.log("All global data cached.")

          const info = cacheManager.getCacheInfo(allModelsGlobalCacheKey)
          setCacheInfo(info)
          setIsModelsLoading(false)
        }
      } catch (error) {
        console.error("Error loading data:", error)
        const errorMessage = error instanceof Error ? error.message : "Unknown error"

        if (errorMessage.includes("GitHub token not configured")) {
          setError("GitHub token not configured. Please add GITHUB_TOKEN to your .env.local file.")
        } else if (errorMessage.includes("rate limit")) {
          setError("GitHub API rate limit exceeded. Please try again later or check your token.")
        } else if (errorMessage.includes("404")) {
          setError("Repository not found. Please verify the repository URL is correct.")
        } else {
          setError(`Failed to load data: ${errorMessage}`)
        }
      } finally {
        setLoading(false)
      }
    }

    loadAllData()
  }, [retryCount])

  const handleSearch = () => {
    const trimmedQuery = searchInput.trim()
    setSearchQuery(trimmedQuery)

    if (!trimmedQuery) {
      setSearchMode("brands")
      setFilteredBrands(allBrands)
      setSearchResults([])
      return
    }

    const modelResults: SearchResult[] = []
    allBrands.forEach((brand) => {
      const matchingModels = searchModels(brand.models, trimmedQuery)
      matchingModels.forEach((model) => {
        model.variants.forEach((variant) => {
          modelResults.push({
            brand: brand.name,
            brandSlug: brand.slug,
            mainModelName: model.mainModelName,
            modelNumber: variant.modelNumber,
            variantName: variant.variantName,
            codename: model.codename,
          })
        })
      })
    })

    const query = trimmedQuery.toLowerCase()
    const brandResults = allBrands.filter(
      (brand) => brand.name.toLowerCase().includes(query) || brand.slug.toLowerCase().includes(query),
    )

    if (modelResults.length > 0) {
      setSearchMode("models")
      setSearchResults(modelResults)
      setFilteredBrands([])
    } else if (brandResults.length > 0) {
      setSearchMode("brands")
      setFilteredBrands(brandResults)
      setSearchResults([])
    } else {
      setSearchMode("brands")
      setFilteredBrands([])
      setSearchResults([])
    }
  }

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchMode("brands")
      setFilteredBrands(allBrands)
      setSearchResults([])
    }
  }, [allBrands, searchQuery])

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") handleSearch()
  }

  const handleRefreshData = () => {
    cacheManager.delete("all_brands_metadata")
    cacheManager.delete("all_models_global_data")
    allBrands.forEach((brand) => cacheManager.delete(`brand_${brand.slug}`))
    setRetryCount((prev) => prev + 1)
  }

  const clearSearch = () => {
    setSearchQuery("")
    setSearchInput("")
  }

  const totalModels = allBrands.reduce((total, brand) => total + brand.models.length, 0)
  const cacheAgeMinutes = Math.max(0, Math.round((cacheInfo?.age ?? 0) / 60_000))
  const cacheStatus = isFromCache
    ? cacheAgeMinutes === 0
      ? "cached just now"
      : `cached ${cacheAgeMinutes}m ago`
    : "fresh data cached"

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-6">
        <section className="w-full max-w-lg rounded-2xl border border-destructive/50 bg-card p-5">
          <div className="flex items-center gap-2 text-base font-semibold uppercase tracking-[0.08em] text-destructive">
            <AlertCircle className="size-4" aria-hidden="true" />
            <h1>Unable to load phone data</h1>
          </div>
          <p className="mt-4 text-base text-destructive">{error}</p>
          {error.includes("token") && (
            <p className="mt-2 text-sm text-muted-foreground">
              Set <code className="text-foreground">GITHUB_TOKEN</code> in <code className="text-foreground">.env.local</code> and restart the server.
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handleRetry}>
              <RefreshCw aria-hidden="true" />
              Retry
            </Button>
            {error.includes("token") && (
              <Button type="button" variant="ghost" onClick={() => window.open("https://github.com/settings/tokens", "_blank")}>
                Get GitHub token
              </Button>
            )}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex w-full max-w-screen-xl items-center justify-between gap-6 px-4 py-4 md:px-6 lg:px-8">
          <div className="min-w-0">
            <p className="text-base font-semibold tracking-[0.12em] text-foreground">SERAPHIM</p>
            <p className="mt-0.5 truncate text-sm uppercase tracking-[0.14em] text-muted-foreground">Phone model index</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <p className="hidden text-sm text-muted-foreground sm:block">
              {allBrands.length} brands · {totalModels} models
            </p>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-screen-xl px-4 py-8 md:px-6 md:py-12">
        <section className="rounded-2xl overflow-hidden border border-border bg-card">
          <div className="border-b border-border px-5 py-5 md:px-6">
            <p className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">Search index</p>
            <h1 className="mt-1 text-xl font-semibold text-foreground">Find a phone model</h1>
          </div>
          <div className="p-5 md:p-6">
            <label htmlFor="global-search" className="mb-2 block text-sm font-medium text-foreground">
              Brands, models, codenames, or model numbers
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="global-search"
                  placeholder="e.g. Galaxy, Pixel, SM-S918B"
                  value={searchInput}
                  onChange={(event) => {
                    setSearchInput(event.target.value)
                    if (!event.target.value.trim()) setSearchQuery("")
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  className="h-10 pl-10"
                />
              </div>
              <Button type="button" onClick={handleSearch} disabled={loading} className="h-10 w-full sm:w-auto">
                Search
              </Button>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border py-4 text-sm text-muted-foreground">
          <div className="flex min-w-0 items-center gap-2">
            <span className="size-1.5 shrink-0 bg-primary" aria-hidden="true" />
            <span>{allBrands.length} brands · {totalModels} models</span>
            {cacheInfo && <span className="hidden sm:inline">· {cacheStatus}</span>}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={handleRefreshData}>
            <RefreshCw aria-hidden="true" />
            Refresh
          </Button>
        </div>

        {loading && (
          <div className="flex items-center gap-2 border-b border-border py-2 text-sm text-muted-foreground">
            <span className="size-1.5 animate-pulse bg-primary" aria-hidden="true" />
            {loadingMessage || "Loading phone data..."}
          </div>
        )}

        {cacheInfo && <p className="py-2 text-sm text-muted-foreground sm:hidden">{cacheStatus}</p>}

        {isModelsLoading && (
          <div className="flex items-center gap-2 border-b border-border py-2 text-sm text-muted-foreground">
            <span className="size-1.5 animate-pulse bg-primary" aria-hidden="true" />
            Loading models {modelsLoadedCount}/{allBrands.length} · you can browse brands now
          </div>
        )}

        {searchQuery.trim() && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4">
            <p className="text-sm text-muted-foreground">
              {searchMode === "models"
                ? `${searchResults.length} model${searchResults.length === 1 ? "" : "s"} matching "${searchQuery}"`
                : `${filteredBrands.length} brand${filteredBrands.length === 1 ? "" : "s"} matching "${searchQuery}"`}
            </p>
            <Button type="button" variant="ghost" size="sm" onClick={clearSearch}>Clear search</Button>
          </div>
        )}

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 className="text-lg font-semibold text-foreground">
              {searchQuery.trim() ? (searchMode === "models" ? "Model results" : "Brand results") : "Browse by brand"}
            </h2>
            <span className="text-sm uppercase tracking-[0.1em] text-muted-foreground">
              {searchQuery.trim() ? "Filtered" : "Directory"}
            </span>
          </div>

          {searchMode === "models" && searchResults.length > 0 && (
            <div className="rounded-2xl overflow-hidden divide-y divide-border border border-border bg-card">
              {searchResults.map((result, index) => (
                <div key={`${result.brandSlug}-${result.modelNumber}-${index}`} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(180px,auto)] sm:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-base font-medium text-foreground">{result.mainModelName}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {result.brand}{result.codename && ` · ${result.codename}`}
                    </p>
                  </div>
                  <div className="min-w-0 sm:text-right">
                    <p className="truncate text-sm text-muted-foreground">{result.variantName}</p>
                    <code className="text-sm text-foreground">{result.modelNumber}</code>
                  </div>
                </div>
              ))}
            </div>
          )}

          {searchMode === "brands" && filteredBrands.length > 0 && (
            <div className="rounded-2xl overflow-hidden divide-y divide-border border border-border bg-card">
              {filteredBrands.map((brand) => (
                <Link
                  key={brand.slug}
                  href={`/${brand.slug}`}
                  prefetch={false}
                  onMouseEnter={() => onWarmBrand?.(brand)}
                  onFocus={() => onWarmBrand?.(brand)}
                  onTouchStart={() => onWarmBrand?.(brand)}
                  onClick={(event) => {
                    if (
                      !onNavigateBrand ||
                      event.button !== 0 ||
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    ) return

                    event.preventDefault()
                    onNavigateBrand(brand)
                  }}
                  className="group relative isolate flex min-h-14 w-full items-center justify-between gap-4 overflow-hidden px-5 py-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  {progressBrandSlug === brand.slug && (
                    <span className="brand-row-progress pointer-events-none absolute inset-y-0 left-0 z-0 w-full origin-left bg-primary/15" aria-hidden="true" />
                  )}
                  <span className="relative z-10 min-w-0">
                    <span className="block truncate text-base font-medium text-foreground">{brand.name}</span>
                    <span className="mt-1 block truncate text-sm uppercase tracking-[0.08em] text-muted-foreground">{brand.slug}</span>
                  </span>
                  <span className="relative z-10 flex shrink-0 items-center gap-3 text-sm text-muted-foreground">
                    {brand.models.length} model{brand.models.length === 1 ? "" : "s"}
                    <ArrowRight className="size-4 text-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          )}

          {searchQuery.trim() && filteredBrands.length === 0 && searchResults.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
              <Search className="mx-auto size-5 text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 text-base font-medium text-foreground">No results found</p>
              <p className="mt-1 text-sm text-muted-foreground">Try another search for “{searchQuery}”.</p>
              <Button type="button" variant="outline" size="sm" onClick={clearSearch} className="mt-4">Show all brands</Button>
            </div>
          )}

          {!searchQuery.trim() && filteredBrands.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-base text-muted-foreground">
              {loading ? "Waiting for brand data..." : "No brands available."}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default function Page() {
  return null
}
