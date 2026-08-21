import type { GitHubFile } from "@/types/phone-models"
import type { PhoneModel } from "@/types/phone-models"
import { cacheManager } from "@/lib/cache-manager"
import { parseMarkdownContent } from "@/lib/data-parser"

const brandModelRequests = new Map<string, Promise<PhoneModel[]>>()

export async function fetchBrandFiles(): Promise<GitHubFile[]> {
  try {
    console.log("Fetching brand files...")
    const response = await fetch("/api/github-proxy?type=directory", {
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`)
    }

    const files: GitHubFile[] = await response.json()
    const mdFiles = files.filter((file) => file.name.endsWith(".md"))
    console.log("Found markdown files:", mdFiles.length)
    return mdFiles
  } catch (error) {
    console.error("Error fetching brand files:", error)
    throw error
  }
}

export async function fetchBrandMarkdown(filename: string): Promise<string> {
  try {
    const path = `brands/${filename}`
    console.log("Fetching markdown:", filename)

    const response = await fetch(`/api/github-proxy?type=content&path=${encodeURIComponent(path)}`, {
      cache: "no-store",
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.details || errorData.error || `HTTP ${response.status}`)
    }

    const data = await response.json()
    return data.content || ""
  } catch (error) {
    console.error(`Error fetching ${filename}:`, error)
    throw error
  }
}

export function loadBrandModels(filename: string, slug: string): Promise<PhoneModel[]> {
  const cachedModels = cacheManager.get<PhoneModel[]>(`brand_${slug}`)
  if (cachedModels) return Promise.resolve(cachedModels)

  const existingRequest = brandModelRequests.get(slug)
  if (existingRequest) return existingRequest

  const request = fetchBrandMarkdown(filename)
    .then((content) => {
      if (!content) throw new Error("Failed to load brand data - empty content")
      const models = parseMarkdownContent(content)
      cacheManager.set(`brand_${slug}`, models)
      return models
    })
    .finally(() => brandModelRequests.delete(slug))

  brandModelRequests.set(slug, request)
  return request
}
