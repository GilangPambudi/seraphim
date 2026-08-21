"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { AlertCircle, ArrowLeft, RefreshCw, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import Footer from "@/components/footer"
import { ThemeToggle } from "@/components/theme-toggle"
import { hasInternalRouteHistory, writeRouteStack } from "@/lib/route-history"
import { fetchBrandFiles, loadBrandModels } from "@/lib/api-client"
import { cacheManager } from "@/lib/cache-manager"
import { parseBrandName, searchModels } from "@/lib/data-parser"
import type { Brand, PhoneModel } from "@/types/phone-models"

type BrandDetailViewProps = {
  brandSlug: string
  initialModels?: PhoneModel[]
  initialBrandName?: string
}

export function BrandDetailView({ brandSlug, initialModels, initialBrandName }: BrandDetailViewProps) {
  const [brandName, setBrandName] = useState(initialBrandName ?? "")
  const [allModels, setAllModels] = useState<PhoneModel[]>(initialModels ?? [])
  const [filteredModels, setFilteredModels] = useState<PhoneModel[]>(initialModels ?? [])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [loading, setLoading] = useState(initialModels === undefined)
  const [loadingMessage, setLoadingMessage] = useState("")
  const [error, setError] = useState("")
  const [cacheInfo, setCacheInfo] = useState<{ age?: number; expiresIn?: number } | null>(
    initialModels === undefined ? null : cacheManager.getCacheInfo(`brand_${brandSlug}`),
  )
  const [isFromCache, setIsFromCache] = useState(initialModels !== undefined)

  useEffect(() => {
    if (initialModels !== undefined) return

    async function loadBrandData() {
      setLoading(true)
      setError("")
      setLoadingMessage("Loading brand data...")

      try {
        const brandModelsCacheKey = `brand_${brandSlug}`
        const cachedModels = cacheManager.get<PhoneModel[]>(brandModelsCacheKey)

        if (cachedModels) {
          console.log(`Loading models for ${brandSlug} from cache.`)
          setLoadingMessage("Loading from cache...")
          setAllModels(cachedModels)
          setFilteredModels(cachedModels)
          setIsFromCache(true)

          const cachedBrands =
            cacheManager.get<Brand[]>("all_brands_metadata") ??
            cacheManager.get<Brand[]>("all_models_global_data")
          const cachedBrand = cachedBrands?.find((brand) => brand.slug === brandSlug)
          setBrandName(cachedBrand?.name ?? parseBrandName(`${brandSlug}.md`).name)

          const info = cacheManager.getCacheInfo(brandModelsCacheKey)
          setCacheInfo(info)
          setLoading(false)
        } else {
          console.log(`Cache miss for ${brandSlug}, fetching fresh data.`)
          setLoadingMessage(`Fetching ${brandSlug} models...`)

          const files = await fetchBrandFiles()
          const matchingFile = files.find((file) => parseBrandName(file.name).slug === brandSlug)

          if (!matchingFile) {
            setError(`Brand "${brandSlug}" not found`)
            return
          }

          const { name } = parseBrandName(matchingFile.name)
          setBrandName(name)

          const models = await loadBrandModels(matchingFile.name, brandSlug)
          console.log(`Fetched and cached ${models.length} models for ${brandSlug}.`)

          setAllModels(models)
          setFilteredModels(models)
          setIsFromCache(false)

          const info = cacheManager.getCacheInfo(brandModelsCacheKey)
          setCacheInfo(info)
          setLoading(false)
        }
      } catch (err) {
        console.error("Error loading brand data:", err)
        setError(err instanceof Error ? err.message : "Failed to load brand data")
        setLoading(false)
      }
    }

    loadBrandData()
  }, [brandSlug, initialModels])

  useEffect(() => {
    setFilteredModels(searchQuery.trim() ? searchModels(allModels, searchQuery) : allModels)
  }, [allModels, searchQuery])

  const handleSearch = () => {
    setSearchQuery(searchInput.trim())
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") handleSearch()
  }

  const handleRefreshData = () => {
    cacheManager.delete(`brand_${brandSlug}`)
    window.location.reload()
  }

  const handleBack = () => {
    if (hasInternalRouteHistory()) {
      window.history.back()
    } else {
      writeRouteStack(["/"])
      window.history.replaceState(null, "", "/")
    }
  }

  const groupedModels = filteredModels.reduce(
    (groups, model) => {
      const series = model.series || "Other Models"
      if (!groups[series]) groups[series] = []
      groups[series].push(model)
      return groups
    },
    {} as Record<string, PhoneModel[]>,
  )

  const cacheAgeMinutes = Math.max(0, Math.round((cacheInfo?.age ?? 0) / 60_000))
  const cacheStatus = isFromCache
    ? cacheAgeMinutes === 0
      ? "cached just now"
      : `cached ${cacheAgeMinutes}m ago`
    : "fresh data loaded"

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-6">
        <section className="w-full max-w-lg border border-destructive/50 bg-card p-5">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-destructive">
            <AlertCircle className="size-4" aria-hidden="true" />
            <h1>Unable to load brand data</h1>
          </div>
          <p className="mt-4 text-sm text-destructive">{error}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handleBack}>
              <ArrowLeft aria-hidden="true" />
              Back to brands
            </Button>
            <Button type="button" variant="ghost" onClick={() => window.location.reload()}>
              Try again
            </Button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex w-full max-w-screen-xl items-center gap-3 px-4 py-3 md:gap-4 md:px-6 lg:px-8">
          <Button type="button" variant="ghost" size="sm" onClick={handleBack} className="shrink-0">
            <ArrowLeft aria-hidden="true" />
            <span className="hidden sm:inline">Brands</span>
          </Button>
          <div className="min-w-0 flex-1 border-l border-border pl-3 md:pl-4">
            <p className="truncate text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Brand index / {brandSlug}</p>
            <h1 className="truncate text-base font-semibold text-foreground">{brandName || brandSlug}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <p className="hidden text-xs text-muted-foreground sm:block">
              {allModels.length} model{allModels.length === 1 ? "" : "s"}
            </p>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-screen-xl px-4 py-6 md:px-6 md:py-8">
        <section className="border border-border bg-card">
          <div className="border-b border-border px-4 py-4 md:px-5">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Brand search</p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">Find a model in {brandName || brandSlug}</h2>
          </div>
          <div className="p-4 md:p-5">
            <label htmlFor="brand-search" className="mb-2 block text-xs font-medium text-foreground">
              Model name, codename, variant, or model number
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="brand-search"
                  placeholder={`Search ${brandName || brandSlug} models`}
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  className="h-10 pl-10"
                />
              </div>
              <Button type="button" onClick={handleSearch} disabled={loading} className="h-10 w-full sm:w-auto">Search</Button>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 text-xs text-muted-foreground">
          <p>
            Showing {filteredModels.length} of {allModels.length} model{allModels.length === 1 ? "" : "s"}
            {searchQuery && ` Â· matching "${searchQuery}"`}
            {cacheInfo && <span className="hidden sm:inline"> Â· {cacheStatus}</span>}
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={handleRefreshData}>
            <RefreshCw aria-hidden="true" />
            Refresh
          </Button>
        </div>
        {cacheInfo && <p className="py-2 text-xs text-muted-foreground sm:hidden">{cacheStatus}</p>}
        {loading && (
          <div className="flex items-center gap-2 border-b border-border py-2 text-xs text-muted-foreground">
            <span className="size-1.5 animate-pulse bg-primary" aria-hidden="true" />
            {loadingMessage || "Loading brand data..."}
          </div>
        )}

        <section className="mt-7">
          {loading ? (
            <div className="border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              Waiting for model data...
            </div>
          ) : Object.keys(groupedModels).length > 0 ? (
            <Accordion type="multiple" className="border border-border bg-card">
              {Object.entries(groupedModels).map(([series, models]) => (
                <AccordionItem key={series} value={series}>
                  <AccordionTrigger className="px-4 py-3">
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-4 text-left">
                      <span className="truncate text-sm font-semibold text-foreground">{series}</span>
                      <span className="shrink-0 text-xs font-normal text-muted-foreground">
                        {models.length} model{models.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="border-t border-border bg-muted/20 px-4 py-4">
                    <div className="divide-y divide-border border border-border bg-background">
                      {models.map((model, modelIndex) => (
                        <div key={`${model.mainModelName}-${modelIndex}`} className="p-4">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                            <h3 className="text-sm font-semibold text-foreground">{model.mainModelName}</h3>
                            {model.codename && (
                              <p className="text-xs text-muted-foreground">
                                codename <code className="text-foreground">{model.codename}</code>
                              </p>
                            )}
                          </div>
                          <div className="mt-3 divide-y divide-border border border-border">
                            {model.variants.map((variant, variantIndex) => (
                              <div key={`${variant.modelNumber}-${variantIndex}`} className="flex flex-col gap-1 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                <span className="min-w-0 break-words text-xs text-muted-foreground">{variant.variantName}</span>
                                <code className="shrink-0 text-xs font-medium text-foreground">{variant.modelNumber}</code>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="border border-dashed border-border px-4 py-10 text-center">
              <Search className="mx-auto size-5 text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-foreground">{searchQuery ? "No models found" : "No models available"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {searchQuery ? `Try another search for "${searchQuery}".` : "This brand has no parsed model entries."}
              </p>
              {searchQuery && (
                <Button type="button" variant="outline" size="sm" onClick={() => { setSearchQuery(""); setSearchInput("") }} className="mt-4">
                  Show all models
                </Button>
              )}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  )
}
