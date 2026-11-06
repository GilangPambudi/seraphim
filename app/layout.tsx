import type { Metadata, Viewport } from "next"
import { Figtree } from "next/font/google"
import "./globals.css"
import { AppShell } from "@/components/route-transition"
import { ThemeProvider } from "@/components/theme-provider"

const figtree = Figtree({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-figtree",
  weight: ["400", "500", "600", "700"],
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://seraphim.pambudi.dev"
const SITE_TITLE = "SERAPHIM - Search About Phone Informations & Models"
const SITE_DESCRIPTION = "Search phone brands, models, codenames, and model numbers in one place."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: "SERAPHIM",
  openGraph: {
    type: "website",
    siteName: "SERAPHIM",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6f8" },
    { media: "(prefers-color-scheme: dark)", color: "#111316" },
  ],
}

export default function RootLayout() {
  return (
    <html lang="en" className={figtree.variable} suppressHydrationWarning>
      <body className={figtree.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AppShell />
        </ThemeProvider>
      </body>
    </html>
  )
}
