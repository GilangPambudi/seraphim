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
          setLoadingMessage("Loading from cache...")
          setAllModels(cachedModels)
          setFilteredModels(cachedModels)
          setIsFromCache(true)

          const cachedBrands =
            cacheManager.get<Brand[]>("all_brands_metadata") ??
            cacheManager.get<Brand[]>("all_models_global_data")
          const cachedBrand = cachedBrands?.find((brand) => brand.slug === brandSlug)
          setBrandName(cachedBrand?.name ?? parseBrandName(`${brandSlug}.md`).name)
          setCacheInfo(cacheManager.getCacheInfo(brandModelsCacheKey))
          setLoading(false)
        } else {
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
          setAllModels(models)
          setFilteredModels(models)
          setIsFromCache(false)
          setCacheInfo(cacheManager.getCacheInfo(brandModelsCacheKey))
          setLoading(false)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load brand data")
        setLoading(false)
      }
    }

    loadBrandData()
  }, [brandSlug, initialModels])

  useEffect(() => {
    setFilteredModels(searchQuery.trim() ? searchModels(allModels, searchQuery) : allModels)
  }, [allModels, searchQuery])

  const handleSearch = () => setSearchQuery(searchInput.trim())
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
      <div className="flex min-h-dvh items-center justify-center bg-[#292b2d] px-4 py-6 text-[#e8e7df]">
        <section className="w-full max-w-xl border border-[#ff8147] p-6 md:p-8">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-[#ff8147]">
            <AlertCircle className="size-4" aria-hidden="true" />
            <h1>Unable to load brand data</h1>
          </div>
          <p className="mt-6 text-lg">{error}</p>
          <div className="mt-8 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handleBack}><ArrowLeft aria-hidden="true" />Back to brands</Button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-background text-foreground">
      <section className="bg-[#292b2d] text-[#e8e7df]">
        <header className="editorial-shell flex items-center justify-between border-b border-white/10 py-5">
          <button type="button" onClick={handleBack} className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-white/55 hover:text-[#ff8147]">
            <ArrowLeft className="size-4" aria-hidden="true" /> Brands
          </button>
          <ThemeToggle />
        </header>

        <div className="editorial-shell grid min-h-[52vh] items-end gap-10 py-14 md:grid-cols-[1fr_auto] md:py-20">
          <div>
            <p className="editorial-kicker editorial-orange">Brand index / {brandSlug}</p>
            <h1 className="editorial-display mt-7 break-words">{brandName || brandSlug}</h1>
          </div>
          <div className="pb-2 text-left md:text-right">
            <p className="text-6xl font-medium tracking-[-0.06em] text-[#8f987b] md:text-8xl">{allModels.length}</p>
            <p className="editorial-kicker mt-2 text-white/40">Models indexed</p>
          </div>
        </div>
      </section>

      <section className="bg-[#e8e7df] text-[#292b2d]">
        <div className="editorial-shell py-14 md:py-20">
          <div className="grid gap-10 border-b border-black/15 pb-12 md:grid-cols-[.55fr_1.45fr] md:items-end">
            <div className="editorial-kicker text-black/45">Search / {brandName || brandSlug}</div>
            <div>
              <h2 className="editorial-section-title"><span className="text-[#8f987b]">Find</span><br />a model.</h2>
              <div className="mt-8 flex border-b border-black/35">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-0 top-1/2 size-4 -translate-y-1/2 text-[#ff8147]" aria-hidden="true" />
                  <Input
                    id="brand-search"
                    placeholder={`Search ${brandName || brandSlug} models`}
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    className="h-12 rounded-none border-0 bg-transparent pl-7 text-base shadow-none placeholder:text-black/25 focus-visible:ring-0"
                  />
                </div>
                <Button type="button" onClick={handleSearch} disabled={loading} className="h-12 rounded-none bg-[#ff8147] px-6 text-[#292b2d] hover:bg-[#ff9466]">Search</Button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-black/15 py-4 text-xs uppercase tracking-[0.09em] text-black/45">
            <p>
              Showing {filteredModels.length} of {allModels.length} models
              {searchQuery && ` · matching “${searchQuery}”`}
              {cacheInfo && <span className="hidden sm:inline"> · {cacheStatus}</span>}
            </p>
            <button type="button" onClick={handleRefreshData} className="flex items-center gap-2 hover:text-black"><RefreshCw className="size-3.5" aria-hidden="true" />Refresh</button>
          </div>

          {loading && (
            <div className="border-b border-black/15 py-3 text-xs uppercase tracking-[0.08em] text-black/45">
              {loadingMessage || "Loading brand data..."}
            </div>
          )}

          <section className="mt-10">
            {loading ? (
              <div className="border border-dashed border-black/20 px-6 py-16 text-center text-sm text-black/45">Waiting for model data...</div>
            ) : Object.keys(groupedModels).length > 0 ? (
              <Accordion type="multiple" className="border-t border-black/15">
                {Object.entries(groupedModels).map(([series, models], seriesIndex) => (
                  <AccordionItem key={series} value={series} className="border-b border-black/15">
                    <AccordionTrigger className="py-5 hover:no-underline">
                      <div className="grid min-w-0 flex-1 grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 text-left sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:gap-6">
                        <span className="text-xs tabular-nums text-black/30">{String(seriesIndex + 1).padStart(2, "0")}</span>
                        <span className="truncate text-2xl font-medium tracking-[-0.04em] sm:text-3xl">{series}</span>
                        <span className="shrink-0 text-xs uppercase tracking-[0.08em] text-black/40">{models.length} models</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="border-t border-black/10 bg-black/[0.025] py-0">
                      {models.map((model, modelIndex) => (
                        <div key={`${model.mainModelName}-${modelIndex}`} className="border-b border-black/10 px-4 py-6 last:border-b-0 sm:px-6">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                            <h3 className="text-xl font-medium tracking-[-0.03em]">{model.mainModelName}</h3>
                            {model.codename && <p className="text-xs uppercase tracking-[0.08em] text-black/45">codename <code className="normal-case tracking-normal text-black">{model.codename}</code></p>}
                          </div>
                          <div className="mt-5 border-t border-black/15">
                            {model.variants.map((variant, variantIndex) => (
                              <div key={`${variant.modelNumber}-${variantIndex}`} className="grid gap-1 border-b border-black/10 py-3 last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4">
                                <span className="min-w-0 break-words text-sm text-black/55">{variant.variantName}</span>
                                <code className="shrink-0 text-sm font-medium">{variant.modelNumber}</code>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <div className="py-20 text-center">
                <p className="editorial-kicker text-black/35">No match</p>
                <p className="mt-4 text-3xl tracking-[-0.04em]">{searchQuery ? `Nothing found for “${searchQuery}”.` : "No models available."}</p>
                {searchQuery && <button type="button" onClick={() => { setSearchQuery(""); setSearchInput("") }} className="mt-6 text-xs uppercase tracking-[0.1em] underline underline-offset-4">Show all models</button>}
              </div>
            )}
          </section>
        </div>
      </section>

      <Footer />
    </div>
  )
}