import type { GitHubFile } from "@/types/phone-models"

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
