"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, RefreshCw, Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LoadingAnimation } from "@/components/loading-animation"
import { fetchBrandFiles, fetchBrandMarkdown } from "@/lib/api-client"
import { parseBrandName, parseMarkdownContent, searchModels } from "@/lib/data-parser"
import { cacheManager } from "@/lib/cache-manager"
import type { Brand, SearchResult } from "@/types/phone-models"

export default function HomePage() {
  const router = useRouter()
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

  useEffect(() => {
    async function loadAllData() {
      setLoading(true)
      setError("")
      setLoadingMessage("Initializing...")

      try {
        console.log("Loading all brands and models...")

        const cacheKey = "all_brands_with_models"

        // Check cache first
        const cachedData = cacheManager.get<Brand[]>(cacheKey)

        if (cachedData) {
          console.log("Loading all data from cache")
          setLoadingMessage("Loading from cache...")
          setAllBrands(cachedData)
          setFilteredBrands(cachedData)
          setIsFromCache(true)

          const info = cacheManager.getCacheInfo(cacheKey)
          setCacheInfo(info)

          // Simulate brief loading for better UX
          await new Promise((resolve) => setTimeout(resolve, 500))
        } else {
          console.log("Fetching fresh data for all brands")
          setLoadingMessage("Fetching brands from repository...")
          setIsFromCache(false)

          const files = await fetchBrandFiles()

          if (files.length === 0) {
            setError("No brand files found in the repository")
            return
          }

          setLoadingMessage("Processing brand information...")
          await new Promise((resolve) => setTimeout(resolve, 300))

          const brandsWithModels: Brand[] = []

          // Process each brand and fetch its models
          for (let i = 0; i < files.length; i++) {
            const file = files[i]
            const { name, slug } = parseBrandName(file.name)

            setLoadingMessage(`Loading ${name} models... (${i + 1}/${files.length})`)

            try {
              const content = await fetchBrandMarkdown(file.name)
              const models = parseMarkdownContent(content)

              brandsWithModels.push({
                name,
                slug,
                filename: file.name,
                models,
              })

              console.log(`Loaded ${models.length} models for ${name}`)
            } catch (error) {
              console.error(`Failed to load models for ${name}:`, error)
              // Add brand without models if fetch fails
              brandsWithModels.push({
                name,
                slug,
                filename: file.name,
                models: [],
              })
            }

            // Brief pause between requests to avoid overwhelming the API
            await new Promise((resolve) => setTimeout(resolve, 100))
          }

          brandsWithModels.sort((a, b) => a.name.localeCompare(b.name))

          console.log("All brands and models loaded:", brandsWithModels.length)

          // Cache all the data
          cacheManager.forceSet(cacheKey, brandsWithModels)
          console.log("All data cached")

          setAllBrands(brandsWithModels)
          setFilteredBrands(brandsWithModels)

          const info = cacheManager.getCacheInfo(cacheKey)
          setCacheInfo(info)
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

  // Handle search
  const handleSearch = () => {
    const trimmedQuery = searchInput.trim()
    setSearchQuery(trimmedQuery)

    if (!trimmedQuery) {
      setSearchMode("brands")
      setFilteredBrands(allBrands)
      setSearchResults([])
      return
    }

    // Search in models first
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

    // Search in brands
    const brandResults = allBrands.filter(
      (brand) =>
        brand.name.toLowerCase().includes(trimmedQuery.toLowerCase()) ||
        brand.slug.toLowerCase().includes(trimmedQuery.toLowerCase()),
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

  // Filter on input change
  useEffect(() => {
    const trimmedQuery = searchQuery.trim()
    if (!trimmedQuery) {
      setSearchMode("brands")
      setFilteredBrands(allBrands)
      setSearchResults([])
    }
  }, [allBrands, searchQuery])

  const handleBrandClick = (brandSlug: string) => {
    router.push(`/${brandSlug}`)
  }

  const handleModelClick = (result: SearchResult) => {
    router.push(`/${result.brandSlug}`)
  }

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
  }

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  // Clear cache and reload
  const handleRefreshData = () => {
    cacheManager.delete("all_brands_with_models")
    setRetryCount((prev) => prev + 1)
  }

  // Calculate total models
  const totalModels = allBrands.reduce((total, brand) => total + brand.models.length, 0)

  if (loading) {
    return <LoadingAnimation message={loadingMessage} brandName="all data" />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center text-lg">
              <AlertCircle className="h-6 w-6 mr-2" />
              Configuration Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-5 w-5" />
              <AlertDescription className="text-lg">{error}</AlertDescription>
            </Alert>

            <div className="text-base text-muted-foreground space-y-2">
              <p>
                <strong>Setup Instructions:</strong>
              </p>
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  Create a <code className="bg-muted px-1 rounded">.env.local</code> file in your project root
                </li>
                <li>
                  Get a GitHub Personal Access Token from{" "}
                  <a
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    GitHub Settings
                  </a>
                </li>
                <li>
                  Add to .env.local: <code className="bg-muted px-1 rounded">GITHUB_TOKEN=your_token_here</code>
                </li>
                <li>Restart your development server</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleRetry} variant="outline" className="flex-1 text-lg">
                <RefreshCw className="h-5 w-5 mr-2" />
                Try Again
              </Button>
              <Button
                onClick={() => window.open("https://github.com/settings/tokens", "_blank")}
                variant="outline"
                className="flex-1 text-lg"
              >
                Get GitHub Token
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="w-[90%] mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-4 md:mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-center mb-4 md:mb-6 sm:mb-4">
            <div>
              <h1 className="text-6xl sm:text-6xl md:text-7xl font-bold text-foreground mb-2">SERAPHIM</h1>
              <p className="text-2xl sm:text-xl md:text-2xl text-muted-foreground">
                Search About Phone Information & Model
              </p>
            </div>
          </div>
        </div>

        {/* Cache Status */}
        {cacheInfo && (
          <div className="mb-6">
            <Alert className={isFromCache ? "border-blue-200 bg-blue-50" : "border-green-200 bg-green-50"}>
              <AlertDescription className="flex items-center justify-between">
                {/* Mobile: Only show "Updated ... ago" */}
                <span className="text-base block sm:hidden">
                  {(() => {
                    const ageMinutes = Math.floor((cacheInfo.age || 0) / 1000 / 60)
                    if ((cacheInfo.age || 0) < 60 * 1000) {
                      return "Updated just now"
                    }
                    return `${ageMinutes} minute${ageMinutes !== 1 ? "s" : ""} ago`
                  })()}
                </span>
                {/* Desktop: Original message */}
                <span className="text-base hidden sm:block">
                  {isFromCache ? (
                    <>
                      Brands loaded from cache{" "}
                      {Math.round((cacheInfo.age || 0) / 1000 / 60)} minute
                      {Math.round((cacheInfo.age || 0) / 1000 / 60) !== 1 ? "s" : ""} ago
                    </>
                  ) : (
                    "Fresh brands data cached for faster access"
                  )}
                </span>
                <Button variant="ghost" size="sm" onClick={handleRefreshData} className="h-7 px-3 text-sm">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Global Search */}
        <div className="mb-8">
          <label htmlFor="global-search" className="block text-xl font-medium text-foreground mb-3 text-center">
            <span className="block sm:hidden text-lg">
              {totalModels} models from {allBrands.length} brands found
            </span>
            <span className="hidden sm:block">
              Search Brands & Models ({allBrands.length} brands, {totalModels} models available)
            </span>
          </label>
          <div className="flex flex-col sm:flex-row gap-3 mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-6 w-6" />
              <Input
              id="global-search"
              placeholder="Search brands, models, codenames, or model numbers..."
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value)
                // If input is cleared, immediately show all brands
                if (e.target.value.trim() === "") {
                setSearchQuery("")
                }
              }}
              onKeyPress={handleKeyPress}
              className="pl-10 h-14 text-xl sm:text-sm placeholder:text-lg"
              />
            </div>
            <Button onClick={handleSearch} className="h-14 px-6 font-medium text-lg">
              Search
            </Button>
          </div>
        </div>

        {/* Results Summary */}
        {searchQuery.trim() && (
          <div className="mb-6 text-center">
            <p className="text-muted-foreground text-lg">
              {searchMode === "models" ? (
                <>
                  Found {searchResults.length} model{searchResults.length !== 1 ? "s" : ""} matching &quot;{searchQuery}&quot;
                </>
              ) : (
                <>
                  Showing {filteredBrands.length} brand{filteredBrands.length !== 1 ? "s" : ""} matching &quot;{searchQuery}&quot;
                </>
              )}
              {isFromCache && " • Instant search from cache"}
            </p>
          </div>
        )}

        {/* Content */}
        <div className="w-full">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-6 md:mb-8 text-center">
            {searchQuery.trim()
              ? searchMode === "models"
                ? "Model Search Results"
                : "Brand Search Results"
              : "Browse by Brand"}
          </h2>

          {/* Model Results */}
          {searchMode === "models" && searchResults.length > 0 && (
            <div className="grid gap-4 md:gap-6">
              {searchResults.map((result, index) => (
                <Card
                  key={index}
                  className="hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-[1.02]"
                  onClick={() => handleModelClick(result)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl sm:text-2xl flex items-center justify-between">
                      <span>{result.mainModelName}</span>
                      <span className="text-base font-normal text-muted-foreground">{result.brand}</span>
                    </CardTitle>
                    {result.codename && (
                      <p className="text-base text-muted-foreground">
                        Codename: <span className="font-mono font-medium">{result.codename}</span>
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <div className="font-medium text-lg">{result.variantName}</div>
                        <div className="text-base text-muted-foreground">
                          Model: <span className="font-mono">{result.modelNumber}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="text-lg">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Brand Results */}
          {searchMode === "brands" && filteredBrands.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {filteredBrands.map((brand) => (
                <Card
                  key={brand.slug}
                  className="hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105"
                  onClick={() => handleBrandClick(brand.slug)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg sm:text-xl text-center">{brand.name}</CardTitle>
                    <p className="text-base text-muted-foreground text-center">
                      {brand.models.length} model{brand.models.length !== 1 ? "s" : ""}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full text-base sm:text-lg">View Models</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* No Results */}
          {searchQuery.trim() && filteredBrands.length === 0 && searchResults.length === 0 && (
            <Card>
              <CardContent className="text-center py-12 md:py-16">
                <Search className="h-16 w-16 sm:h-20 sm:w-20 text-muted-foreground mx-auto mb-4 md:mb-6" />
                <h3 className="text-2xl sm:text-3xl font-semibold text-foreground mb-2">No Results Found</h3>
                <p className="text-lg sm:text-xl text-muted-foreground mb-4 md:mb-6">
                  No brands or models found matching &quot;{searchQuery}&quot;
                </p>
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
              </CardContent>
            </Card>
          )}

          {/* No Data */}
          {!searchQuery.trim() && filteredBrands.length === 0 && (
            <Card>
              <CardContent className="text-center py-8 md:py-12">
                <p className="text-lg sm:text-xl text-muted-foreground">No brands available</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Clear Search Button */}
        {searchQuery.trim() && (
          <div className="text-center mt-8">
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("")
                setSearchInput("")
              }}
              className="w-full sm:w-auto text-lg"
            >
              Show All Brands
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
