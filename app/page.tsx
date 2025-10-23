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
import Footer from "@/components/footer"

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
  const [isModelsLoading, setIsModelsLoading] = useState(false)
  const [modelsLoadedCount, setModelsLoadedCount] = useState(0)
  const [totalBrands, setTotalBrands] = useState(0)

  useEffect(() => {
    async function loadAllData() {
      setLoading(true)
      setError("")
      setLoadingMessage("Initializing...")

      try {
        console.log("Loading all brands and models...")

        const allModelsGlobalCacheKey = "all_models_global_data" // Cache key for all models combined
        const allBrandsMetadataKey = "all_brands_metadata" // Cache key for brands list only

        // First, check if global models data is already in cache
        const cachedGlobalModels = cacheManager.get<Brand[]>(allModelsGlobalCacheKey);

        if (cachedGlobalModels) {
          console.log("Loading all data (brands and models) from global cache");
          setLoadingMessage("Loading all data from cache...");
          setAllBrands(cachedGlobalModels);
          setFilteredBrands(cachedGlobalModels);
          setIsFromCache(true);

          const info = cacheManager.getCacheInfo(allModelsGlobalCacheKey);
          setCacheInfo(info);

          await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate brief loading for better UX
        } else {
          console.log("Fetching fresh data for all brands, then models in background");
          setLoadingMessage("Fetching brands list from repository...");
          setIsFromCache(false);

          const files = await fetchBrandFiles();

          if (files.length === 0) {
            setError("No brand files found in the repository");
            return;
          }

          // Phase 1: build and show brand list first
          const brandMetadata: Brand[] = files
            .map((file) => {
              const { name, slug } = parseBrandName(file.name);
              return { name, slug, filename: file.name, models: [] } as Brand;
            })
            .sort((a, b) => a.name.localeCompare(b.name));

          // Cache metadata for quick subsequent loads if needed
          cacheManager.set(allBrandsMetadataKey, brandMetadata);

          setAllBrands(brandMetadata);
          setFilteredBrands(brandMetadata);
          setTotalBrands(brandMetadata.length);

          // Render immediately with brands only
          setLoading(false);

          // Phase 2: fetch models in background with progress
          setIsModelsLoading(true);
          setModelsLoadedCount(0);

          const resultsMap = new Map<string, Brand>();

          await Promise.allSettled(
            brandMetadata.map(async (brand, index) => {
              const brandModelsCacheKey = `brand_${brand.slug}`;
              try {
                const content = await fetchBrandMarkdown(brand.filename);
                const models = parseMarkdownContent(content);

                // Update per-brand cache and state
                cacheManager.set(brandModelsCacheKey, models);
                resultsMap.set(brand.slug, { ...brand, models });

                setAllBrands((prev) =>
                  prev.map((b) => (b.slug === brand.slug ? { ...b, models } : b)),
                );
              } catch (error) {
                console.error(`Failed to load models for ${brand.name}:`, error);
                resultsMap.set(brand.slug, { ...brand, models: [] });
              } finally {
                setModelsLoadedCount((c) => c + 1);
              }
            }),
          );

          // After background load completes, cache global dataset
          const completedBrands = brandMetadata.map((b) => resultsMap.get(b.slug) ?? b);
          cacheManager.set(allModelsGlobalCacheKey, completedBrands);
          console.log("All global data cached.");

          const info = cacheManager.getCacheInfo(allModelsGlobalCacheKey);
          setCacheInfo(info);
          setIsModelsLoading(false);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        if (errorMessage.includes("GitHub token not configured")) {
          setError("GitHub token not configured. Please add GITHUB_TOKEN to your .env.local file.");
        } else if (errorMessage.includes("rate limit")) {
          setError("GitHub API rate limit exceeded. Please try again later or check your token.");
        } else if (errorMessage.includes("404")) {
          setError("Repository not found. Please verify the repository URL is correct.");
        } else {
          setError(`Failed to load data: ${errorMessage}`);
        }
      } finally {
        setLoading(false);
      }
    }

    loadAllData();
  }, [retryCount]);

  // Rest of the component logic remains largely the same
  // Handle search logic using `allBrands` or `cachedGlobalModels`
  const handleSearch = () => {
    const trimmedQuery = searchInput.trim();
    setSearchQuery(trimmedQuery);

    if (!trimmedQuery) {
      setSearchMode("brands");
      setFilteredBrands(allBrands);
      setSearchResults([]);
      return;
    }

    const modelResults: SearchResult[] = [];
    allBrands.forEach((brand) => {
      const matchingModels = searchModels(brand.models, trimmedQuery);
      matchingModels.forEach((model) => {
        model.variants.forEach((variant) => {
          modelResults.push({
            brand: brand.name,
            brandSlug: brand.slug,
            mainModelName: model.mainModelName,
            modelNumber: variant.modelNumber,
            variantName: variant.variantName,
            codename: model.codename,
          });
        });
      });
    });

    const brandResults = allBrands.filter(
      (brand) =>
        brand.name.toLowerCase().includes(trimmedQuery.toLowerCase()) ||
        brand.slug.toLowerCase().includes(trimmedQuery.toLowerCase()),
    );

    if (modelResults.length > 0) {
      setSearchMode("models");
      setSearchResults(modelResults);
      setFilteredBrands([]);
    } else if (brandResults.length > 0) {
      setSearchMode("brands");
      setFilteredBrands(brandResults);
      setSearchResults([]);
    } else {
      setSearchMode("brands");
      setFilteredBrands([]);
      setSearchResults([]);
    }
  };

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      setSearchMode("brands");
      setFilteredBrands(allBrands);
      setSearchResults([]);
    }
  }, [allBrands, searchQuery]);

  const handleBrandClick = (brandSlug: string) => {
    router.push(`/${brandSlug}`);
  };

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleRefreshData = () => {
    // Clear all related caches to force a full refresh
    cacheManager.delete("all_brands_metadata");
    cacheManager.delete("all_models_global_data");
    // Also clear individual brand caches if they exist
    allBrands.forEach(brand => cacheManager.delete(`brand_${brand.slug}`));
    setRetryCount((prev) => prev + 1);
  };

  const totalModels = allBrands.reduce((total, brand) => total + brand.models.length, 0);

  if (loading) {
    return <LoadingAnimation message={loadingMessage} brandName="all data" />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center text-xl">
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
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="w-[90%] mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-4 md:mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-center mb-4 md:mb-6 sm:mb-4">
            <div>
              <h1 className="text-6xl sm:text-6xl md:text-6xl font-bold text-foreground mb-2">SERAPHIM</h1>
              <p className="text-xl sm:text-lg md:text-xl text-muted-foreground">
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
                    const ageMinutes = Math.floor((cacheInfo.age || 0) / 1000 / 60);
                    if ((cacheInfo.age || 0) < 60 * 1000) {
                      return "Updated just now";
                    }
                    return `${ageMinutes} minute${ageMinutes !== 1 ? "s" : ""} ago`;
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

        {/* Background Models Loading Status */}
        {isModelsLoading && (
          <div className="mb-4">
            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription className="text-base">
                Loading models in background: {modelsLoadedCount}/{totalBrands}. You can already browse brands.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Global Search */}
        <div className="mb-8">
          <label htmlFor="global-search" className="block text-lg sm:text-xl text-foreground mb-4 text-center">
            <span className="block sm:hidden text-base">
              {totalModels} models from {allBrands.length} brands found
            </span>
            <span className="hidden sm:block">
              Search Brands & Models ({allBrands.length} brands, {totalModels} models available)
            </span>
          </label>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5 sm:h-6 sm:w-6" />
              <Input
                id="global-search"
                placeholder="Search brands, models, codenames, or model numbers..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  if (e.target.value.trim() === "") {
                    setSearchQuery("");
                  }
                }}
                onKeyPress={handleKeyPress}
                className="pl-12 h-12 sm:h-14 text-base sm:text-sm md:text-base w-full"
              />
            </div>
            <Button onClick={handleSearch} className="h-12 sm:h-14 px-4 sm:px-6 font-semibold text-base sm:text-lg w-full sm:w-auto">
              Search
            </Button>
          </div>
        </div>

        {/* Results Summary */}
        {searchQuery.trim() && (
          <div className="mb-4 md:mb-6">
            <p className="text-muted-foreground text-base sm:text-lg md:text-xl text-center">
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
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-6 md:mb-8 text-center">
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
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xl sm:text-2xl flex items-center justify-between">
                      <span>{result.mainModelName}</span>
                      <span className="text-base sm:text-lg font-normal text-muted-foreground">{result.brand}</span>
                    </CardTitle>
                    {result.codename && (
                      <p className="text-base sm:text-lg text-muted-foreground">
                        Codename: <span className="font-mono font-medium">{result.codename}</span>
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-3 sm:p-4 bg-muted/50 rounded-lg">
                      <div>
                        <div className="font-semibold text-base sm:text-lg md:text-xl">{result.variantName}</div>
                        <div className="text-sm sm:text-base text-muted-foreground">
                          Model: <span className="font-mono font-medium">{result.modelNumber}</span>
                        </div>
                      </div>
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
                    <CardTitle className="text-2xl font-bold text-center">{brand.name}</CardTitle>
                    <p className="text-base text-muted-foreground text-center">
                      {brand.models.length} model{brand.models.length !== 1 ? "s" : ""}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full text-base">View Models</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* No Results */}
          {searchQuery.trim() && filteredBrands.length === 0 && searchResults.length === 0 && (
            <Card>
              <CardContent className="text-center py-12 md:py-16">
                <Search className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-4 md:mb-6" />
                <h3 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3">No Results Found</h3>
                <p className="text-lg sm:text-xl text-muted-foreground mb-4 md:mb-6">
                  No brands or models found matching &quot;{searchQuery}&quot;
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchInput("");
                  }}
                  className="w-full sm:w-auto text-base"
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
                <p className="text-base sm:text-lg text-muted-foreground">No brands available</p>
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
                setSearchQuery("");
                setSearchInput("");
              }}
              className="w-full sm:w-auto text-base"
            >
              Show All Brands
            </Button>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
