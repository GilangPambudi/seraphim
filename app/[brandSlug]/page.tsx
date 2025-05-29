// app/[brandSlug]/page.tsx
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
import { fetchBrandFiles, fetchBrandMarkdown } from "@/lib/api-client" // Keep for filename parsing
import { parseBrandName, parseMarkdownContent, searchModels } from "@/lib/data-parser" // Keep for parsing
import { cacheManager } from "@/lib/cache-manager"
import type { PhoneModel } from "@/types/phone-models"
import Footer from "@/components/footer"

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
  const [isFromCache, setIsFromCache] = useState(false)

  useEffect(() => {
    async function loadBrandData() {
      setLoading(true)
      setError("")
      setLoadingMessage("Loading brand data...")

      try {
        const brandModelsCacheKey = `brand_${brandSlug}`

        // Try to get models from cache
        const cachedModels = cacheManager.get<PhoneModel[]>(brandModelsCacheKey);

        if (cachedModels) {
          console.log(`Loading models for ${brandSlug} from cache.`);
          setLoadingMessage("Loading from cache...");
          setAllModels(cachedModels);
          setFilteredModels(cachedModels);
          setIsFromCache(true);

          // Retrieve brand name (might still need to fetch brand files to get the display name)
          const files = await fetchBrandFiles();
          const matchingFile = files.find((file) => {
            const { slug } = parseBrandName(file.name);
            return slug === brandSlug;
          });
          if (matchingFile) {
            setBrandName(parseBrandName(matchingFile.name).name);
          }

          const info = cacheManager.getCacheInfo(brandModelsCacheKey);
          setCacheInfo(info);
          setLoading(false);
        } else {
          // Fallback: If for some reason the specific brand's models are not in cache,
          // fetch them now. This might happen if the user navigates directly to a brand page.
          console.log(`Cache miss for ${brandSlug}, fetching fresh data.`);
          setLoadingMessage(`Fetching ${brandSlug} models...`);

          const files = await fetchBrandFiles();
          const matchingFile = files.find((file) => {
            const { slug } = parseBrandName(file.name);
            return slug === brandSlug;
          });

          if (!matchingFile) {
            setError(`Brand "${brandSlug}" not found`);
            return;
          }

          const { name } = parseBrandName(matchingFile.name);
          setBrandName(name);

          const content = await fetchBrandMarkdown(matchingFile.name);
          if (!content) {
            setError("Failed to load brand data - empty content");
            return;
          }

          const models = parseMarkdownContent(content);
          cacheManager.set(brandModelsCacheKey, models); // Cache it for future direct access
          console.log(`Fetched and cached ${models.length} models for ${brandSlug}.`);

          setAllModels(models);
          setFilteredModels(models);
          setIsFromCache(false);

          const info = cacheManager.getCacheInfo(brandModelsCacheKey);
          setCacheInfo(info);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error loading brand data:", err);
        setError(err instanceof Error ? err.message : "Failed to load brand data");
        setLoading(false);
      }
    }

    loadBrandData();
  }, [brandSlug]);

  // Filter models based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = searchModels(allModels, searchQuery);
      setFilteredModels(filtered);
    } else {
      setFilteredModels(allModels);
    }
  }, [allModels, searchQuery]);

  const handleSearch = () => {
    setSearchQuery(searchInput);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleRefreshData = () => {
    // Clear only this brand's cache to force a refresh for it
    cacheManager.delete(`brand_${brandSlug}`);
    window.location.reload();
  };

  const groupedModels = filteredModels.reduce(
    (groups, model) => {
      const series = model.series || "Other Models";
      if (!groups[series]) {
        groups[series] = [];
      }
      groups[series].push(model);
      return groups;
    },
    {} as Record<string, PhoneModel[]>,
  );

  if (loading) {
    return <LoadingAnimation message={loadingMessage} brandName={brandName || "a brand"} />;
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
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="w-[90%] mx-auto px-4 py-6 md:py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center mb-6 md:mb-8 gap-4">
          <Button variant="outline" onClick={() => router.push("/")} className="w-full sm:w-auto text-base">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Brands
          </Button>
          <div className="flex items-center w-full sm:w-auto text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">{brandName} Models</h1>
          </div>
        </div>

        {/* Data Status */}
        {cacheInfo && (
          <div className="mb-4">
            <Alert className={isFromCache ? "border-blue-200 bg-blue-50" : "border-green-200 bg-green-50"}>
              <AlertDescription className="flex items-center justify-between text-base w-full">
                <span className="flex-1">
                  <span className="hidden sm:inline">
                    {isFromCache ? "Data loaded from cache" : "Fresh data loaded"} -{" "}
                  </span>
                  {(() => {
                    const age = cacheInfo.age || 0;
                    if (age < 60_000) return "Updated just now";
                    const seconds = Math.round(age / 1000);
                    const minutes = Math.floor(seconds / 60);
                    if (minutes < 60) return `Updated ${minutes} minute${minutes > 1 ? "s" : ""} ago`;
                    const hours = Math.floor(minutes / 60);
                    if (hours < 24) return `Updated ${hours} hour${hours > 1 ? "s" : ""} ago`;
                    const days = Math.floor(hours / 24);
                    return `Updated ${days} day${days > 1 ? "s" : ""} ago`;
                  })()}
                </span>
                <Button variant="ghost" size="sm" onClick={handleRefreshData} className="h-8 px-3 text-sm">
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
            <label htmlFor="brand-search" className="block text-lg sm:text-xl text-foreground mb-4 text-center">
              {allModels.length} models found
            </label>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5 sm:h-6 sm:w-6" />
                <Input
                  id="brand-search"
                  placeholder={`Search ${brandName} models instantly, press "Enter" to search`}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-12 h-12 sm:h-14 text-base sm:text-lg md:text-xl w-full"
                />
              </div>
              <Button onClick={handleSearch} className="h-12 sm:h-14 px-4 sm:px-6 font-semibold text-base sm:text-lg w-full sm:w-auto">
                Search
              </Button>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mb-4 md:mb-6">
            <p className="text-muted-foreground text-base sm:text-lg md:text-xl text-center">
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
                        <h3 className="text-xl sm:text-2xl font-bold text-foreground text-left">{series}</h3>
                        <Badge variant="secondary" className="self-start sm:self-center text-base">
                          {models.length} model{models.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 sm:px-6 py-5">
                      <div className="grid gap-4 md:gap-5">
                        {models.map((model, index) => (
                          <Card key={index} className="border">
                            <CardHeader className="pb-4">
                              <CardTitle className="text-xl sm:text-2xl">{model.mainModelName}</CardTitle>
                              {model.codename && (
                                <CardDescription className="text-base sm:text-lg">
                                  Codename: <span className="font-mono font-medium">{model.codename}</span>
                                </CardDescription>
                              )}
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3 md:space-y-4">
                                {model.variants.map((variant, variantIndex) => (
                                  <div
                                    key={variantIndex}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-muted/50 rounded-lg border gap-3 sm:gap-4"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="font-semibold text-base sm:text-lg md:text-xl break-words">
                                        {variant.variantName}
                                      </div>
                                      <div className="text-muted-foreground text-sm sm:text-base mt-1">
                                        Model:{" "}
                                        <span className="font-mono font-medium break-all">{variant.modelNumber}</span>
                                      </div>
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className="font-mono text-sm sm:text-base self-start sm:self-center flex-shrink-0"
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
                <h3 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3">
                  {searchQuery ? "No Results Found" : "No Models Available"}
                </h3>
                <p className="text-lg sm:text-xl text-muted-foreground mb-4 md:mb-6">
                  {searchQuery ? `No models found matching "${searchQuery}"` : "No models found for this brand"}
                </p>
                {searchQuery && (
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
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}