"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Smartphone, AlertCircle, RefreshCw, Search } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LoadingAnimation } from "@/components/loading-animation"
import { fetchBrandFiles } from "@/lib/api-client"
import { parseBrandName } from "@/lib/data-parser"
import { cacheManager } from "@/lib/cache-manager"
import type { Brand } from "@/types/phone-models"

export default function HomePage() {
  const router = useRouter()
  const [allBrands, setAllBrands] = useState<Brand[]>([])
  const [filteredBrands, setFilteredBrands] = useState<Brand[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [loadingMessage, setLoadingMessage] = useState("")
  const [error, setError] = useState("")
  const [retryCount, setRetryCount] = useState(0)
  const [isFromCache, setIsFromCache] = useState(false)
  const [cacheInfo, setCacheInfo] = useState<{ age?: number; expiresIn?: number } | null>(null)

  useEffect(() => {
    async function loadBrands() {
      setLoading(true)
      setError("")
      setLoadingMessage("Initializing...")

      try {
        console.log("Loading brands...")

        const cacheKey = "brands_list"

        // Check cache first
        const cachedBrands = cacheManager.get<Brand[]>(cacheKey)

        if (cachedBrands) {
          console.log("Loading brands from cache")
          setLoadingMessage("Loading from cache...")
          setAllBrands(cachedBrands)
          setFilteredBrands(cachedBrands)
          setIsFromCache(true)

          const info = cacheManager.getCacheInfo(cacheKey)
          setCacheInfo(info)

          // Simulate brief loading for better UX
          await new Promise((resolve) => setTimeout(resolve, 500))
        } else {
          console.log("Fetching fresh brands data")
          setLoadingMessage("Fetching brands from repository...")
          setIsFromCache(false)

          const files = await fetchBrandFiles()

          if (files.length === 0) {
            setError("No brand files found in the repository")
            return
          }

          setLoadingMessage("Processing brand information...")
          await new Promise((resolve) => setTimeout(resolve, 300)) // Brief pause for UX

          const brandList: Brand[] = files
            .map((file) => {
              const { name, slug } = parseBrandName(file.name)
              return {
                name,
                slug,
                filename: file.name,
                models: [],
              }
            })
            .sort((a, b) => a.name.localeCompare(b.name))

          console.log("Processed brands:", brandList.length)

          // Cache the brands data
          cacheManager.set(cacheKey, brandList)
          console.log("Brands data cached")

          setAllBrands(brandList)
          setFilteredBrands(brandList)

          const info = cacheManager.getCacheInfo(cacheKey)
          setCacheInfo(info)
        }
      } catch (error) {
        console.error("Error loading brands:", error)
        const errorMessage = error instanceof Error ? error.message : "Unknown error"

        if (errorMessage.includes("GitHub token not configured")) {
          setError("GitHub token not configured. Please add GITHUB_TOKEN to your .env.local file.")
        } else if (errorMessage.includes("rate limit")) {
          setError("GitHub API rate limit exceeded. Please try again later or check your token.")
        } else if (errorMessage.includes("404")) {
          setError("Repository not found. Please verify the repository URL is correct.")
        } else {
          setError(`Failed to load brands: ${errorMessage}`)
        }
      } finally {
        setLoading(false)
      }
    }

    loadBrands()
  }, [retryCount])

  // Handle search
  const handleSearch = () => {
    setSearchQuery(searchInput.trim())
  }

  // Filter brands based on search query
  useEffect(() => {
    const trimmedQuery = searchQuery.trim()
    if (trimmedQuery) {
      console.log("Searching brands:", trimmedQuery)
      const filtered = allBrands.filter(
        (brand) =>
          brand.name.toLowerCase().includes(trimmedQuery.toLowerCase()) ||
          brand.slug.toLowerCase().includes(trimmedQuery.toLowerCase()),
      )
      setFilteredBrands(filtered)
    } else {
      // If search is empty, show all brands
      setFilteredBrands(allBrands)
    }
  }, [allBrands, searchQuery])

  const handleBrandClick = (brandSlug: string) => {
    router.push(`/${brandSlug}`)
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
    cacheManager.delete("brands_list")
    setRetryCount((prev) => prev + 1)
  }

  if (loading) {
    return <LoadingAnimation message={loadingMessage} brandName="brands" />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center text-xl">
              <AlertCircle className="h-5 w-5 mr-2" />
              Configuration Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-base">{error}</AlertDescription>
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
              <Button onClick={handleRetry} variant="outline" className="flex-1 text-base">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button
                onClick={() => window.open("https://github.com/settings/tokens", "_blank")}
                variant="outline"
                className="flex-1 text-base"
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
        <div className="text-center mb-8 md:mb-12">
          <div className="flex flex-col sm:flex-row items-center justify-center mb-6">
            <Smartphone className="h-12 w-12 sm:h-16 sm:w-16 text-primary mb-4 sm:mb-0 sm:mr-4" />
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2">SERAPHIM</h1>
              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground">
                Search About Phone Informations & Models
              </p>
            </div>
          </div>
        </div>

        {/* Cache Status */}
        {cacheInfo && (
          <div className="mb-6">
            <Alert className={isFromCache ? "border-blue-200 bg-blue-50" : "border-green-200 bg-green-50"}>
              <AlertDescription className="flex items-center justify-between">
          <span className="text-base">
            {typeof window !== "undefined" && window.innerWidth < 640 ? (
              // Mobile: concise message
              <>{Math.round((cacheInfo.age || 0) / 1000 / 60)} minutes ago</>
            ) : isFromCache ? (
              <>
                Brands loaded from cache {Math.round((cacheInfo.age || 0) / 1000 / 60)} minutes ago
              </>
            ) : (
              <>Fresh brands data cached for faster access</>
            )}
          </span>
          <Button variant="ghost" size="sm" onClick={handleRefreshData} className="h-6 px-2 text-sm">
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Brand Search */}
        <div className="mb-8">
          <label htmlFor="brand-search" className="block text-xl sm:text-2xl font-medium text-foreground mb-3 text-center">
            Search Brands ({allBrands.length} brands available)
          </label>
          <div className="flex flex-col sm:flex-row gap-3 mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                id="brand-search"
                placeholder="Search phone brands instantly, press Enter to search"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value)
                  // If input is cleared, immediately show all brands
                  if (e.target.value.trim() === "") {
                    setSearchQuery("")
                  }
                }}
                onKeyPress={handleKeyPress}
                className="pl-10 h-12 text-xl sm:text-lg"
              />
            </div>
            <Button onClick={handleSearch} className="h-12 px-6 font-medium text-lg">
              Search
            </Button>
          </div>
        </div>

        {/* Results Summary */}
        {searchQuery.trim() && (
          <div className="mb-6 text-center">
            <p className="text-muted-foreground text-lg">
              Showing {filteredBrands.length} of {allBrands.length} brands matching &quot;{searchQuery}&quot;
              {isFromCache && " • Instant search from cache"}
            </p>
          </div>
        )}

        {/* Brand List */}
        <div className="w-full">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-6 md:mb-8 text-center">
            {searchQuery.trim() ? "Search Results" : "Browse by Brand"}
          </h2>

          {filteredBrands.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {filteredBrands.map((brand) => (
                <Card
                  key={brand.slug}
                  className="hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105"
                  onClick={() => handleBrandClick(brand.slug)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg sm:text-xl text-center">{brand.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full text-base sm:text-lg rounded-lg">View Models</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : searchQuery.trim() ? (
            <Card>
              <CardContent className="text-center py-12 md:py-16">
                <Search className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-4 md:mb-6" />
                <h3 className="text-2xl sm:text-3xl font-semibold text-foreground mb-2">No Brands Found</h3>
                <p className="text-lg sm:text-xl text-muted-foreground mb-4 md:mb-6">
                  No brands found matching &quot;{searchQuery}&quot;
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("")
                    setSearchInput("")
                  }}
                  className="w-full sm:w-auto text-base"
                >
                  Clear Search
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8 md:py-12">
                <Smartphone className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
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
              className="w-full sm:w-auto text-base"
            >
              Show All Brands
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}