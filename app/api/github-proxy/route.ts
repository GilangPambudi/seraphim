import { type NextRequest, NextResponse } from "next/server"

const GITHUB_API_BASE = "https://api.github.com/repos/KHwang9883/MobileModels"
const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/KHwang9883/MobileModels/master"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const path = searchParams.get("path")
  const type = searchParams.get("type") || "content"

  console.log("API Route called with:", { path, type })

  // Get GitHub token from environment variables
  const githubToken = process.env.GITHUB_TOKEN

  if (!githubToken) {
    console.error("GITHUB_TOKEN environment variable is not set")
    return NextResponse.json(
      {
        error: "GitHub token not configured",
        details: "Please set GITHUB_TOKEN in your .env.local file",
      },
      { status: 500 },
    )
  }

  try {
    let url: string
    const headers: HeadersInit = {
      "User-Agent": "SERAPHIM-Phone-Search",
      Accept: "application/vnd.github.v3+json",
    }

    if (type === "directory") {
      // Fetch directory listing from GitHub API
      url = `${GITHUB_API_BASE}/contents/brands`
      headers.Authorization = `Bearer ${githubToken}`
    } else if (type === "content" && path) {
      // Fetch raw file content (public repos don't need auth for raw content)
      url = `${GITHUB_RAW_BASE}/${path}`
      // Remove auth headers for raw content to avoid potential issues
      delete headers.Authorization
    } else {
      return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 })
    }

    console.log(`Fetching from: ${url}`)

    const response = await fetch(url, {
      headers,
      cache: "no-store",
    })

    console.log(`Response: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("GitHub API error:", errorText)

      // Handle specific GitHub API errors
      if (response.status === 403) {
        return NextResponse.json(
          {
            error: "GitHub API rate limit exceeded or invalid token",
            details: "Please check your GitHub token permissions",
          },
          { status: 403 },
        )
      }

      if (response.status === 404) {
        return NextResponse.json(
          {
            error: "Repository or file not found",
            details: "Please verify the repository exists and is accessible",
          },
          { status: 404 },
        )
      }

      return NextResponse.json(
        {
          error: `GitHub API error: ${response.status}`,
          details: errorText,
        },
        { status: response.status },
      )
    }

    if (type === "directory") {
      const data = await response.json()
      console.log("Directory listing received, files:", data.length)
      return NextResponse.json(data)
    } else {
      const content = await response.text()
      console.log("File content received, length:", content.length)
      return NextResponse.json({ content })
    }
  } catch (error) {
    console.error("Fetch error:", error)
    return NextResponse.json(
      {
        error: "Network error",
        details: error instanceof Error ? error.message : "Unknown network error",
      },
      { status: 500 },
    )
  }
}
