import type { PhoneModel, PhoneVariant } from "@/types/phone-models"

export function parseBrandName(filename: string): { name: string; slug: string } {
  // Remove .md extension
  const cleanName = filename.replace(".md", "")

  // Handle regional suffixes
  if (cleanName.endsWith("_cn")) {
    const baseName = cleanName.replace("_cn", "")
    return {
      name: `${capitalizeWords(baseName)} (China)`,
      slug: cleanName,
    }
  } else if (cleanName.endsWith("_global_en")) {
    const baseName = cleanName.replace("_global_en", "")
    return {
      name: `${capitalizeWords(baseName)} (Global)`,
      slug: cleanName,
    }
  } else if (cleanName.endsWith("_en")) {
    const baseName = cleanName.replace("_en", "")
    return {
      name: `${capitalizeWords(baseName)} (English)`,
      slug: cleanName,
    }
  } else if (cleanName.endsWith("_all")) {
    const baseName = cleanName.replace("_all", "")
    return {
      name: capitalizeWords(baseName),
      slug: cleanName,
    }
  }

  return {
    name: capitalizeWords(cleanName),
    slug: cleanName,
  }
}

function capitalizeWords(str: string): string {
  return str
    .split(/[-_\s]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

export function parseMarkdownContent(content: string): PhoneModel[] {
  const lines = content.split("\n")
  const models: PhoneModel[] = []
  let currentSeries: string | undefined

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Check for series heading (## Series Name)
    if (line.startsWith("## ")) {
      currentSeries = line.replace("## ", "").trim()
      continue
    }

    // Check for model entry (**[CODENAME] MODEL NAME:**)
    if (line.startsWith("**") && line.endsWith(":**")) {
      const modelLine = line.slice(2, -3) // Remove ** and :**

      // Extract codename and main model name
      let codename: string | undefined
      let mainModelName = modelLine

      // Check for codename in brackets or parentheses at the start
      const codenameBracketMatch = modelLine.match(/^\[([^\]]+)\]\s*(.*)/)
      const codenameParenMatch = modelLine.match(/^$$([^)]+)$$\s*(.*)/)

      if (codenameBracketMatch) {
        codename = codenameBracketMatch[1]
        mainModelName = codenameBracketMatch[2].trim()
      } else if (codenameParenMatch) {
        codename = codenameParenMatch[1]
        mainModelName = codenameParenMatch[2].trim()
      }

      // Remove any remaining parentheses or brackets from main model name
      mainModelName = mainModelName.replace(/\s*[[$$][^\]$$]*[\])]\s*/g, "").trim()

      // Parse variants from following lines
      const variants: PhoneVariant[] = []
      let j = i + 1

      while (j < lines.length) {
        const variantLine = lines[j].trim()

        // Stop if we hit another model entry or series
        if (variantLine.startsWith("**") || variantLine.startsWith("##") || variantLine.startsWith("#")) {
          break
        }

        // Parse variant line (`MODEL_NUMBER`: VARIANT_NAME)
        const variantMatch = variantLine.match(/^`([^`]+)`:\s*(.*)/)
        if (variantMatch) {
          variants.push({
            modelNumber: variantMatch[1],
            variantName: variantMatch[2].trim(),
          })
        }

        j++
      }

      if (variants.length > 0) {
        models.push({
          mainModelName,
          codename,
          variants,
          series: currentSeries,
        })
      }

      i = j - 1 // Continue from where we left off
    }
  }

  return models
}

export function searchModels(models: PhoneModel[], query: string): PhoneModel[] {
  if (!query.trim()) return models

  const searchTerm = query.toLowerCase()

  return models.filter((model) => {
    // Search in main model name
    if (model.mainModelName.toLowerCase().includes(searchTerm)) return true

    // Search in codename
    if (model.codename?.toLowerCase().includes(searchTerm)) return true

    // Search in variants
    return model.variants.some(
      (variant) =>
        variant.modelNumber.toLowerCase().includes(searchTerm) ||
        variant.variantName.toLowerCase().includes(searchTerm),
    )
  })
}
