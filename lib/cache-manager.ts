
interface CacheItem<T> {
  data: T
  timestamp: number
  expiry: number
}

class CacheManager {
  private static instance: CacheManager
  private cache: Map<string, CacheItem<unknown>> = new Map()
  private readonly DEFAULT_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

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
      this.logStorageUsage(); // Log storage usage after each set operation
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

  // New method: Force update cache (always overwrites existing data) - Kept for flexibility if needed
  forceSet<T>(key: string, data: T, customExpiry?: number): void {
    console.log(`Force updating cache for: ${key}`)
    this.set(key, data, customExpiry) // Reuse set logic
  }

  delete(key: string): void {
    this.cache.delete(key)
    try {
      localStorage.removeItem(`seraphim_cache_${key}`)
      this.logStorageUsage(); // Log storage usage after each delete operation
    } catch (error) {
      console.warn("Failed to remove from localStorage:", error)
    }
  }

  clear(): void {
    this.cache.clear()
    try {
      const keys = Object.keys(localStorage)
      keys.forEach((key) => {
        if (key.startsWith("seraphim_cache_")) {
          localStorage.removeItem(key)
        }
      })
      this.logStorageUsage(); // Log storage usage after clear operation
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

    for (const key of this.cache.keys()) {
      if (key.startsWith("brand_")) {
        brands.push(key.replace("brand_", ""))
      }
    }

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

  // New method to log current localStorage usage
  private logStorageUsage(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      console.log("localStorage is not available in this environment.");
      return;
    }

    let totalBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("seraphim_cache_")) {
        const value = localStorage.getItem(key);
        if (value) {
          totalBytes += (key.length + value.length) * 2;
        }
      }
    }

    const totalKiloBytes = (totalBytes / 1024).toFixed(2);
    const totalMegaBytes = (totalBytes / (1024 * 1024)).toFixed(2);

    console.log(`[CacheManager] Current localStorage usage for 'seraphim_cache_': ${totalKiloBytes} KB (${totalMegaBytes} MB)`);
  }
}

export const cacheManager = CacheManager.getInstance()