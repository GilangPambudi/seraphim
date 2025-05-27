"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Smartphone, AlertCircle, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { fetchBrandFiles } from "@/lib/api-client"
import { parseBrandName } from "@/lib/data-parser"
import type { Brand } from "@/types/phone-models"

export default function HomePage() {
  const router = useRouter()
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    async function loadBrands() {
      setLoading(true)
      setError("")

      try {
        console.log("Loading brands...")
        const files = await fetchBrandFiles()

        if (files.length === 0) {
          setError("No brand files found in the repository")
          return
        }

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

        console.log("Loaded brands:", brandList.length)
        setBrands(brandList)
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

  const handleBrandClick = (brandSlug: string) => {
    router.push(`/${brandSlug}`)
  }

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Smartphone className="h-16 w-16 text-primary mx-auto mb-6 animate-pulse" />
          <h1 className="text-4xl font-bold text-foreground mb-2">SERAPHIM</h1>
          <p className="text-lg text-muted-foreground mb-4">Search About Phone Informations & Models</p>
          <p className="text-muted-foreground">Loading brands...</p>
          {retryCount > 0 && <p className="text-sm text-muted-foreground mt-2">Retry attempt {retryCount}</p>}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Configuration Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>

            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Setup Instructions:</strong>
              </p>
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  Create a <code className="bg-muted px-1 rounded">`.env.local`</code> file in your project root
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
              <Button onClick={handleRetry} variant="outline" className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button
                onClick={() => window.open("https://github.com/settings/tokens", "_blank")}
                variant="outline"
                className="flex-1"
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
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground">
                Search About Phone Information & Model
              </p>
            </div>
          </div>
        </div>

        {/* Brand List */}
        <div className="w-full">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-6 md:mb-8 text-center">
            Browse by Brand
          </h2>

          {brands.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {brands.map((brand) => (
                <Card
                  key={brand.slug}
                  className="hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105"
                  onClick={() => handleBrandClick(brand.slug)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg text-center">{brand.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full text-sm sm:text-base">View Models</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8 md:py-12">
                <Smartphone className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-base sm:text-lg text-muted-foreground">No brands available</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
