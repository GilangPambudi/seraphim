"use client"

import type React from "react"
import { use } from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Search, AlertCircle, RefreshCw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LoadingAnimation } from "@/components/loading-animation"
import { fetchBrandFiles, fetchBrandMarkdown } from "@/lib/api-client"
import { parseBrandName, parseMarkdownContent, searchModels } from "@/lib/data-parser"
import { cacheManager } from "@/lib/cache-manager"
import type { PhoneModel } from "@/types/phone-models"

type BrandDetailPageProps = {
  params: Promise<{
    brandSlug: string
  }>
}

export default function BrandDetailPage({ params }: BrandDetailPageProps) {
  const { brandSlug } = use(params)
  const router = useRouter()
  const [brandName, setBrandName] = useState("")
  const [allModels, setAllModels] = useState<PhoneModel[]>([])
  const [filteredModels, setFilteredModels] = useState<PhoneModel[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [loadingMessage, setLoadingMessage] = useState("")
  const [error, setError] = useState("")
  const [cacheInfo, setCacheInfo] = useState<{ age?: number; expiresIn?: number } | null>(null)
  const [hasOldCache, setHasOldCache] = useState(false)

  useEffect(() => {
    async function loadBrandData() {
      setLoading(true)
      setError("")
      setLoadingMessage("Initializing...")

      try {
        console.log("Loading brand data for:", brandSlug)

        // First, get brand name from files list
        setLoadingMessage("Fetching brand information...")
        const files = await fetchBrandFiles()
        const matchingFile = files.find((file) => {
          const { slug } = parseBrandName(file.name)
          return slug === brandSlug
        })

        if (!matchingFile) {
          setError(`Brand "${brandSlug}" not found`)
          return
        }

        const { name } = parseBrandName(matchingFile.name)
        setBrandName(name)

        const cacheKey = `brand_${brandSlug}`

        // Check if we have old cached data for instant search while loading fresh data
        const oldCachedData = cacheManager.getForSearch<PhoneModel[]>(cacheKey)
        if (oldCachedData) {
          console.log("Found old cache data, using for instant search while fetching fresh data")
          setHasOldCache(true)
          // Set old data temporarily for search functionality
          setAllModels(oldCachedData)
          setFilteredModels(oldCachedData)
        }

        // ALWAYS fetch fresh data when opening View Models page
        console.log("Fetching fresh data for:", brandSlug)
        setLoadingMessage(`Fetching latest ${name} models...`)

        const content = await fetchBrandMarkdown(matchingFile.name)
        if (!content) {
          setError("Failed to load brand data - empty content")
          return
        }

        setLoadingMessage("Parsing phone models...")
        await new Promise((resolve) => setTimeout(resolve, 300)) // Brief pause for UX

        const models = parseMarkdownContent(content)
        console.log("Parsed fresh models:", models.length)

        // Force update cache with fresh data (overwrites any existing cache)
        cacheManager.forceSet(cacheKey, models)
        console.log("Fresh data cached for:", brandSlug)

        // Update state with fresh data
        setAllModels(models)
        setFilteredModels(models)
        setHasOldCache(false)

        const info = cacheManager.getCacheInfo(cacheKey)
        setCacheInfo(info)
      } catch (err) {
        console.error("Error loading brand data:", err)
        setError(err instanceof Error ? err.message : "Failed to load brand data")
      } finally {
        setLoading(false)
      }
    }

    loadBrandData()
  }, [brandSlug])

  // Filter models based on search query (works with cached data for instant search)
  useEffect(() => {
    if (searchQuery.trim()) {
      console.log("Searching in data:", searchQuery)
      const filtered = searchModels(allModels, searchQuery)
      setFilteredModels(filtered)
    } else {
      setFilteredModels(allModels)
    }
  }, [allModels, searchQuery])

  // Handle search
  const handleSearch = () => {
    setSearchQuery(searchInput)
  }

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  // Manual refresh (force fetch fresh data)
  const handleRefreshData = () => {
    window.location.reload()
  }

  // Group models by series
  const groupedModels = filteredModels.reduce(
    (groups, model) => {
      const series = model.series || "Other Models"
      if (!groups[series]) {
        groups[series] = []
      }
      groups[series].push(model)
      return groups
    },
    {} as Record<string, PhoneModel[]>,
  )

  if (loading) {
    return <LoadingAnimation message={loadingMessage} brandName={brandName} />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center text-xl">
              <AlertCircle className="h-6 w-6 mr-2" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-5 w-5" />
              <AlertDescription className="text-lg">{error}</AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Button onClick={() => router.push("/")} variant="outline" className="w-full text-lg">
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Brands
              </Button>
              <Button onClick={() => window.location.reload()} variant="outline" className="w-full text-lg">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="w-[90%] mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center mb-6 md:mb-8 gap-4">
          <Button variant="outline" onClick={() => router.push("/")} className="w-full sm:w-auto text-lg">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Brands
          </Button>
          <div className="flex items-center w-full sm:w-auto text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-foreground">{brandName} Models</h1>
          </div>
        </div>

        {/* Data Status */}
        {cacheInfo && (
          <div className="mb-4">
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="flex items-center justify-between text-lg w-full">
          <span className="flex-1">
            <span className="hidden sm:inline">
              Fresh data loaded - {" "}
            </span>
            {(() => {
              const age = cacheInfo.age || 0
              if (age < 60_000) return "Updated just now"
              const seconds = Math.round(age / 1000)
              const minutes = Math.floor(seconds / 60)
              if (minutes < 60) return `Updated ${minutes} minute${minutes > 1 ? "s" : ""} ago`
              const hours = Math.floor(minutes / 60)
              if (hours < 24) return `Updated ${hours} hour${hours > 1 ? "s" : ""} ago`
              const days = Math.floor(hours / 24)
              return `Updated ${days} day${days > 1 ? "s" : ""} ago`
            })()}
            {hasOldCache && <span className="hidden sm:inline"> • Search available during loading</span>}
          </span>
          <Button variant="ghost" size="sm" onClick={handleRefreshData} className="h-8 px-3 text-base">
            <RefreshCw className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Content Container */}
        <div className="w-full">
          {/* Brand-specific Search */}
          <div className="mb-6 md:mb-8">
            <label htmlFor="brand-search" className="block text-xl sm:text-2xl text-foreground mb-4 text-center">
              {allModels.length} models found
            </label>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-6 w-6 sm:h-7 sm:w-7" />
                <Input
                  id="brand-search"
                  placeholder={`Search ${brandName} models instantly, press "Enter" to search`}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-12 h-14 sm:h-16 text-lg sm:text-xl md:text-2xl w-full"
                />
              </div>
              <Button onClick={handleSearch} className="h-14 sm:h-16 px-6 sm:px-8 font-semibold text-lg sm:text-xl w-full sm:w-auto">
                Search
              </Button>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mb-4 md:mb-6">
            <p className="text-muted-foreground text-lg sm:text-xl md:text-2xl text-center">
              Showing {filteredModels.length} of {allModels.length} model{filteredModels.length !== 1 ? "s" : ""}
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
          </div>

          {/* Model List */}
          {Object.keys(groupedModels).length > 0 ? (
            <div className="space-y-4 md:space-y-5">
              <Accordion type="multiple" className="space-y-4 md:space-y-5">
                {Object.entries(groupedModels).map(([series, models]) => (
                  <AccordionItem key={series} value={series} className="border rounded-lg">
                    <AccordionTrigger className="px-4 sm:px-6 py-4 sm:py-5 hover:bg-muted/50 rounded-t-lg shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full mr-4 gap-2">
                        <h3 className="text-2xl sm:text-3xl font-bold text-foreground text-left">{series}</h3>
                        <Badge variant="secondary" className="self-start sm:self-center text-lg">
                          {models.length} model{models.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 sm:px-6 py-5">
                      <div className="grid gap-4 md:gap-5">
                        {models.map((model, index) => (
                          <Card key={index} className="border">
                            <CardHeader className="pb-4">
                              <CardTitle className="text-2xl sm:text-3xl">{model.mainModelName}</CardTitle>
                              {model.codename && (
                                <CardDescription className="text-lg sm:text-xl">
                                  Codename: <span className="font-mono font-medium">{model.codename}</span>
                                </CardDescription>
                              )}
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3 md:space-y-4">
                                {model.variants.map((variant, variantIndex) => (
                                  <div
                                    key={variantIndex}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 bg-muted/50 rounded-lg border gap-3 sm:gap-4"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-lg sm:text-xl md:text-2xl break-words">
                                        {variant.variantName}
                                      </div>
                                      <div className="text-muted-foreground text-base sm:text-lg mt-1">
                                        Model:{" "}
                                        <span className="font-mono font-medium break-all">{variant.modelNumber}</span>
                                      </div>
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className="font-mono text-base sm:text-lg self-start sm:self-center flex-shrink-0"
                                    >
                                      {variant.modelNumber}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12 md:py-16">
                <h3 className="text-3xl sm:text-4xl font-semibold text-foreground mb-3">
                  {searchQuery ? "No Results Found" : "No Models Available"}
                </h3>
                <p className="text-xl sm:text-2xl text-muted-foreground mb-4 md:mb-6">
                  {searchQuery ? `No models found matching "${searchQuery}"` : "No models found for this brand"}
                </p>
                {searchQuery && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("")
                      setSearchInput("")
                    }}
                    className="w-full sm:w-auto text-lg"
                  >
                    Clear Search
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}