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
        const allModelsGlobalCacheKey = "all_models_global_data"
        const allBrandsMetadataKey = "all_brands_metadata"
        const cachedGlobalModels = cacheManager.get<Brand[]>(allModelsGlobalCacheKey)

        if (cachedGlobalModels) {
          setLoadingMessage("Loading all data from cache...")
          setAllBrands(cachedGlobalModels)
          setFilteredBrands(cachedGlobalModels)
          setIsFromCache(true)
          setCacheInfo(cacheManager.getCacheInfo(allModelsGlobalCacheKey))
        } else {
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
                setAllBrands((prev) => prev.map((item) => (item.slug === brand.slug ? { ...item, models } : item)))
              } catch {
                resultsMap.set(brand.slug, { ...brand, models: [] })
              } finally {
                setModelsLoadedCount((count) => count + 1)
              }
            }),
          )

          const completedBrands = brandMetadata.map((brand) => resultsMap.get(brand.slug) ?? brand)
          cacheManager.set(allModelsGlobalCacheKey, completedBrands)
          setCacheInfo(cacheManager.getCacheInfo(allModelsGlobalCacheKey))
          setIsModelsLoading(false)
        }
      } catch (error) {
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

  const handleRetry = () => setRetryCount((prev) => prev + 1)
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
      <div className="flex min-h-dvh items-center justify-center bg-[#292b2d] px-4 py-6 text-[#e8e7df]">
        <section className="w-full max-w-xl border border-[#ff8147] p-6 md:p-8">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-[#ff8147]">
            <AlertCircle className="size-4" aria-hidden="true" />
            <h1>Unable to load phone data</h1>
          </div>
          <p className="mt-6 text-lg">{error}</p>
          <div className="mt-8 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handleRetry}><RefreshCw aria-hidden="true" />Retry</Button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-background text-foreground">
      <section className="bg-[#292b2d] text-[#e8e7df]">
        <header className="editorial-shell flex items-center justify-between border-b border-white/10 py-5">
          <div>
            <p className="text-sm font-semibold tracking-[0.14em]">SERAPHIM</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/45">Phone model index</p>
          </div>
          <div className="flex items-center gap-4">
            <p className="hidden text-xs uppercase tracking-[0.14em] text-white/45 sm:block">
              {allBrands.length} brands · {totalModels} models
            </p>
            <ThemeToggle />
          </div>
        </header>

        <div className="editorial-shell grid min-h-[72vh] items-end gap-12 py-14 md:grid-cols-[1.15fr_.85fr] md:py-20">
          <div>
            <p className="editorial-kicker editorial-orange">Independent phone directory</p>
            <h1 className="editorial-display mt-7">Find.<br />Any.<br /><span className="editorial-olive">Phone.</span></h1>
          </div>

          <div className="pb-2 md:pb-4">
            <div className="mb-12 max-w-md text-sm leading-6 text-white/55">
              Search brands, models, codenames and model numbers from one clean technical index.
            </div>
            <label htmlFor="global-search" className="editorial-kicker mb-3 block text-white/45">Search the index</label>
            <div className="flex border-b border-white/35">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-0 top-1/2 size-4 -translate-y-1/2 text-[#ff8147]" aria-hidden="true" />
                <Input
                  id="global-search"
                  placeholder="Galaxy, Pixel, SM-S918B..."
                  value={searchInput}
                  onChange={(event) => {
                    setSearchInput(event.target.value)
                    if (!event.target.value.trim()) setSearchQuery("")
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  className="h-12 rounded-none border-0 bg-transparent pl-7 text-base text-white shadow-none placeholder:text-white/25 focus-visible:ring-0"
                />
              </div>
              <Button type="button" onClick={handleSearch} disabled={loading} className="h-12 rounded-none bg-[#ff8147] px-6 text-[#292b2d] hover:bg-[#ff9466]">
                Search <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#e8e7df] text-[#292b2d]">
        <div className="editorial-shell py-14 md:py-20">
          <div className="grid gap-10 border-b border-black/15 pb-12 md:grid-cols-[.55fr_1.45fr] md:items-end">
            <div className="editorial-kicker text-black/45">Directory / {searchQuery.trim() ? "filtered" : "all brands"}</div>
            <h2 className="editorial-section-title"><span className="text-[#8f987b]">Browse</span><br />the index.</h2>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/15 py-4 text-xs uppercase tracking-[0.1em] text-black/45">
            <div className="flex min-w-0 items-center gap-2">
              <span className="size-1.5 shrink-0 bg-[#ff8147]" aria-hidden="true" />
              <span>{allBrands.length} brands · {totalModels} models</span>
              {cacheInfo && <span className="hidden sm:inline">· {cacheStatus}</span>}
            </div>
            <button type="button" onClick={handleRefreshData} className="flex items-center gap-2 hover:text-black">
              <RefreshCw className="size-3.5" aria-hidden="true" /> Refresh
            </button>
          </div>

          {(loading || isModelsLoading) && (
            <div className="border-b border-black/15 py-3 text-xs uppercase tracking-[0.08em] text-black/45">
              {loading ? (loadingMessage || "Loading phone data...") : `Loading models ${modelsLoadedCount}/${allBrands.length}`}
            </div>
          )}

          {searchQuery.trim() && (
            <div className="flex items-center justify-between gap-4 border-b border-black/15 py-4 text-sm">
              <p>
                {searchMode === "models"
                  ? `${searchResults.length} model${searchResults.length === 1 ? "" : "s"} matching “${searchQuery}”`
                  : `${filteredBrands.length} brand${filteredBrands.length === 1 ? "" : "s"} matching “${searchQuery}”`}
              </p>
              <button type="button" onClick={clearSearch} className="text-xs uppercase tracking-[0.1em] underline underline-offset-4">Clear</button>
            </div>
          )}

          {searchMode === "models" && searchResults.length > 0 && (
            <div className="border-b border-black/15">
              {searchResults.map((result, index) => (
                <div key={`${result.brandSlug}-${result.modelNumber}-${index}`} className="grid gap-3 border-b border-black/10 py-5 last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div>
                    <p className="text-xl font-medium tracking-[-0.025em]">{result.mainModelName}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.09em] text-black/45">{result.brand}{result.codename && ` · ${result.codename}`}</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-sm text-black/45">{result.variantName}</p>
                    <code className="text-sm">{result.modelNumber}</code>
                  </div>
                </div>
              ))}
            </div>
          )}

          {searchMode === "brands" && filteredBrands.length > 0 && (
            <div>
              {filteredBrands.map((brand, index) => (
                <Link
                  key={brand.slug}
                  href={`/${brand.slug}`}
                  prefetch={false}
                  onMouseEnter={() => onWarmBrand?.(brand)}
                  onFocus={() => onWarmBrand?.(brand)}
                  onTouchStart={() => onWarmBrand?.(brand)}
                  onClick={(event) => {
                    if (!onNavigateBrand || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                    event.preventDefault()
                    onNavigateBrand(brand)
                  }}
                  className="group relative grid min-h-24 grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden border-b border-black/15 py-4 transition-colors hover:bg-black/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8147] focus-visible:ring-inset sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:gap-6"
                >
                  {progressBrandSlug === brand.slug && (
                    <span className="brand-row-progress pointer-events-none absolute inset-y-0 left-0 z-0 w-full origin-left bg-[#ff8147]/15" aria-hidden="true" />
                  )}
                  <span className="relative z-10 text-xs tabular-nums text-black/35">{String(index + 1).padStart(2, "0")}</span>
                  <span className="relative z-10 min-w-0">
                    <span className="block truncate text-2xl font-medium tracking-[-0.04em] sm:text-3xl">{brand.name}</span>
                    <span className="mt-1 block truncate text-[10px] uppercase tracking-[0.13em] text-black/40">{brand.slug}</span>
                  </span>
                  <span className="relative z-10 flex shrink-0 items-center gap-3 text-xs uppercase tracking-[0.08em] text-black/45">
                    <span className="hidden sm:inline">{brand.models.length} models</span>
                    <ArrowRight className="size-4 text-[#ff8147] transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </Link>
              ))}
            </div>
          )}

          {searchQuery.trim() && filteredBrands.length === 0 && searchResults.length === 0 && (
            <div className="py-20 text-center">
              <p className="editorial-kicker text-black/35">No match</p>
              <p className="mt-4 text-3xl tracking-[-0.04em]">Nothing found for “{searchQuery}”.</p>
              <button type="button" onClick={clearSearch} className="mt-6 text-xs uppercase tracking-[0.1em] underline underline-offset-4">Show all brands</button>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default function Page() {
  return null
}