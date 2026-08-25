"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"

import { BrandDetailView } from "@/components/brand-detail-page"
import { HomePage } from "@/components/home-page"
import { loadBrandModels } from "@/lib/api-client"
import { updateRouteStack, writeRouteStack } from "@/lib/route-history"
import type { Brand, PhoneModel } from "@/types/phone-models"

type PreparedBrand = Pick<Brand, "name" | "slug" | "filename"> & {
  models: PhoneModel[]
}

type PageEntry = {
  id: string
  pathname: string
  brand?: PreparedBrand
}

const SITE_TITLE = "SERAPHIM - Search About Phone Informations & Models"

function createEntry(pathname: string): PageEntry {
  return { id: pathname === "/" ? "home" : `route:${pathname}`, pathname }
}

function createBrandEntry(brand: PreparedBrand): PageEntry {
  return { id: `brand:${brand.slug}`, pathname: `/${brand.slug}`, brand }
}

export function AppShell() {
  const pathname = usePathname()
  const initialEntries = pathname === "/" ? [createEntry("/")] : [createEntry("/"), createEntry(pathname)]
  const initialIndex = initialEntries.findIndex((entry) => entry.pathname === pathname)
  const [entries, setEntries] = useState<PageEntry[]>(initialEntries)
  const [activeIndex, setActiveIndex] = useState(initialIndex)
  const [preloadedEntry, setPreloadedEntry] = useState<PageEntry | null>(null)
  const [navigatingBrandSlug, setNavigatingBrandSlug] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const previousPathnameRef = useRef(pathname)
  const entriesRef = useRef(entries)
  const activeIndexRef = useRef(activeIndex)
  const preloadedEntryRef = useRef<PageEntry | null>(null)
  const warmRequestRef = useRef(0)
  const navigationRequestRef = useRef(0)
  const initializedRef = useRef(false)

  useEffect(() => {
    setIsReady(true)
    document.title = SITE_TITLE
  }, [])

  useEffect(() => {
    const previousPathname = previousPathnameRef.current

    if (!initializedRef.current) {
      initializedRef.current = true
      writeRouteStack([pathname])
      return
    }

    if (previousPathname === pathname) return

    const currentEntries = entriesRef.current
    const currentIndex = activeIndexRef.current
    const preparedEntry = preloadedEntryRef.current?.pathname === pathname ? preloadedEntryRef.current : null
    let nextEntries = currentEntries
    let nextIndex = currentIndex

    if (currentEntries[currentIndex - 1]?.pathname === pathname) {
      nextIndex = currentIndex - 1
    } else if (currentEntries[currentIndex + 1]?.pathname === pathname) {
      nextIndex = currentIndex + 1
    } else {
      nextEntries = [...currentEntries.slice(0, currentIndex + 1), preparedEntry ?? createEntry(pathname)]
      nextIndex = nextEntries.length - 1
    }

    entriesRef.current = nextEntries
    activeIndexRef.current = nextIndex
    setEntries(nextEntries)
    setActiveIndex(nextIndex)

    preloadedEntryRef.current = null
    setPreloadedEntry(null)
    setNavigatingBrandSlug(null)
    updateRouteStack(previousPathname, pathname)
    previousPathnameRef.current = pathname
  }, [pathname])

  const prepareBrand = useCallback(
    (brand: Brand) => {
      const brandPath = `/${brand.slug}`
      if (brandPath === pathname || entriesRef.current.some((entry) => entry.pathname === brandPath)) {
        return Promise.resolve<PageEntry | null>(null)
      }

      const requestId = ++warmRequestRef.current
      return loadBrandModels(brand.filename, brand.slug)
        .then((models) => {
          if (requestId !== warmRequestRef.current) return null

          const entry = createBrandEntry({
            name: brand.name,
            slug: brand.slug,
            filename: brand.filename,
            models,
          })
          preloadedEntryRef.current = entry
          setPreloadedEntry(entry)
          return entry
        })
        .catch(() => null)
    },
    [pathname],
  )

  const handleNavigateBrand = useCallback(
    (brand: Brand) => {
      const brandPath = `/${brand.slug}`
      if (brandPath === pathname) return

      const navigationId = ++navigationRequestRef.current
      setNavigatingBrandSlug(brand.slug)
      void prepareBrand(brand).then(() => {
        if (navigationId !== navigationRequestRef.current) return
        window.history.pushState(null, "", brandPath)
      })
    },
    [pathname, prepareBrand],
  )

  const visibleEntries =
    preloadedEntry && !entries.some((entry) => entry.pathname === preloadedEntry.pathname)
      ? [...entries, preloadedEntry]
      : entries
  const routeIndex = visibleEntries.findIndex((entry) => entry.pathname === pathname)
  const visibleIndex = routeIndex >= 0 ? routeIndex : Math.min(activeIndex, visibleEntries.length - 1)

  return (
    <div className="h-dvh w-full overflow-hidden">
      <div
        className={`flex h-full ${isReady ? "transition-transform duration-300 ease-out motion-reduce:transition-none" : "transition-none"}`}
        style={{
          width: `${visibleEntries.length * 100}%`,
          transform: `translate3d(-${(visibleIndex * 100) / visibleEntries.length}%, 0, 0)`,
        }}
      >
        {visibleEntries.map((entry, index) => {
          const isActive = index === visibleIndex
          const content = entry.pathname === "/" ? (
            <HomePage
              onWarmBrand={(brand) => {
                void prepareBrand(brand)
              }}
              onNavigateBrand={handleNavigateBrand}
              progressBrandSlug={navigatingBrandSlug}
            />
          ) : (
            <BrandDetailView
              brandSlug={entry.pathname.slice(1)}
              initialModels={entry.brand?.models}
              initialBrandName={entry.brand?.name}
            />
          )

          return (
            <div
              key={entry.id}
              aria-hidden={!isActive}
              className={`h-dvh shrink-0 overflow-y-auto ${isActive ? "" : "pointer-events-none"}`}
              style={{ width: `${100 / visibleEntries.length}%` }}
            >
              {content}
            </div>
          )
        })}
      </div>
    </div>
  )
}
