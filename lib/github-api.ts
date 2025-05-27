const GITHUB_API_BASE = "https://api.github.com/repos/KHwang9883/MobileModels"
const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/KHwang9883/MobileModels/main"

export interface GitHubFile {
  name: string
  path: string
  download_url: string
}

export async function fetchBrandFiles(): Promise<GitHubFile[]> {
  try {
    console.log("Fetching brand files from:", `${GITHUB_API_BASE}/contents/brands`)
    const response = await fetch(`${GITHUB_API_BASE}/contents/brands`)
    if (!response.ok) {
      throw new Error(`Failed to fetch brand files: ${response.status} ${response.statusText}`)
    }
    const files: GitHubFile[] = await response.json()
    const mdFiles = files.filter((file) => file.name.endsWith(".md"))
    console.log(
      "Found markdown files:",
      mdFiles.map((f) => f.name),
    )
    return mdFiles
  } catch (error) {
    console.error("Error fetching brand files:", error)
    return []
  }
}

export async function fetchBrandMarkdown(filename: string): Promise<string> {
  try {
    const url = `${GITHUB_RAW_BASE}/brands/${filename}`
    console.log("Fetching markdown from:", url)

    const response = await fetch(url)
    console.log("Response status:", response.status, response.statusText)

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`File not found: ${filename}`)
      }
      throw new Error(`Failed to fetch ${filename}: ${response.status} ${response.statusText}`)
    }

    const content = await response.text()
    console.log(`Successfully fetched ${filename}, content length:`, content.length)
    return content
  } catch (error) {
    console.error(`Error fetching ${filename}:`, error)
    throw error // Re-throw to handle in component
  }
}

// New function to check if a brand file exists
export async function checkBrandFileExists(filename: string): Promise<boolean> {
  try {
    const files = await fetchBrandFiles()
    return files.some((file) => file.name === filename)
  } catch (error) {
    console.error("Error checking file existence:", error)
    return false
  }
}
