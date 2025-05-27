eslint-disable @typescript-eslint/no-explicit-any

interface CacheItem<T> {
  data: T
  timestamp: number
  expiry: number
}

class CacheManager {
  private static instance: CacheManager
  private cache: Map<string, CacheItem<unknown>> = new Map()
  private readonly DEFAULT_EXPIRY = 30 * 60 * 1000 // 30 minutes

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager()
    }
    return CacheManager.instance
  }

  set<T>(key: string, data: T, customExpiry?: number): void {
    const expiry = customExpiry || this.DEFAULT_EXPIRY
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + expiry,
    }

    this.cache.set(key, item as CacheItem<unknown>)

    // Also store in localStorage for persistence
    try {
      localStorage.setItem(`seraphim_cache_${key}`, JSON.stringify(item))
    } catch (error) {
      console.warn("Failed to store in localStorage:", error)
    }
  }

  get<T>(key: string): T | null {
    // First check memory cache
    let item = this.cache.get(key) as CacheItem<T> | undefined

    // If not in memory, try localStorage
    if (!item) {
      try {
        const stored = localStorage.getItem(`seraphim_cache_${key}`)
        if (stored) {
          item = JSON.parse(stored) as CacheItem<T>
          // Restore to memory cache
          if (item) {
            this.cache.set(key, item as CacheItem<unknown>)
          }
        }
      } catch (error) {
        console.warn("Failed to read from localStorage:", error)
      }
    }

    if (!item) return null

    // Check if expired
    if (Date.now() > item.expiry) {
      this.delete(key)
      return null
    }

    return item.data
  }

  // New method: Get data for search (doesn't check expiry, used for instant search)
  getForSearch<T>(key: string): T | null {
    // First check memory cache
    let item = this.cache.get(key) as CacheItem<T> | undefined

    // If not in memory, try localStorage
    if (!item) {
      try {
        const stored = localStorage.getItem(`seraphim_cache_${key}`)
        if (stored) {
          item = JSON.parse(stored) as CacheItem<T>
          // Restore to memory cache
          if (item) {
            this.cache.set(key, item as CacheItem<unknown>)
          }
        }
      } catch (error) {
        console.warn("Failed to read from localStorage:", error)
      }
    }

    return item ? item.data : null
  }

  // New method: Force update cache (always overwrites existing data)
  forceSet<T>(key: string, data: T, customExpiry?: number): void {
    console.log(`Force updating cache for: ${key}`)
    this.set(key, data, customExpiry)
  }

  delete(key: string): void {
    this.cache.delete(key)
    try {
      localStorage.removeItem(`seraphim_cache_${key}`)
    } catch (error) {
      console.warn("Failed to remove from localStorage:", error)
    }
  }

  clear(): void {
    this.cache.clear()
    try {
      // Clear all seraphim cache items from localStorage
      const keys = Object.keys(localStorage)
      keys.forEach((key) => {
        if (key.startsWith("seraphim_cache_")) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.warn("Failed to clear localStorage:", error)
    }
  }

  getCacheInfo(key: string): { exists: boolean; age?: number; expiresIn?: number } {
    const item = this.cache.get(key)
    if (!item) {
      return { exists: false }
    }

    const now = Date.now()
    return {
      exists: true,
      age: now - item.timestamp,
      expiresIn: item.expiry - now,
    }
  }

  // New method: Check if data exists in cache (for search)
  hasDataForSearch(key: string): boolean {
    return this.getForSearch(key) !== null
  }

  // New method: Get all cached brand keys
  getCachedBrands(): string[] {
    const brands: string[] = []

    // Check memory cache
    for (const key of this.cache.keys()) {
      if (key.startsWith("brand_")) {
        brands.push(key.replace("brand_", ""))
      }
    }

    // Also check localStorage
    try {
      const keys = Object.keys(localStorage)
      keys.forEach((key) => {
        if (key.startsWith("seraphim_cache_brand_")) {
          const brandKey = key.replace("seraphim_cache_brand_", "")
          if (!brands.includes(brandKey)) {
            brands.push(brandKey)
          }
        }
      })
    } catch (error) {
      console.warn("Failed to read localStorage keys:", error)
    }

    return brands
  }
}

export const cacheManager = CacheManager.getInstance()
