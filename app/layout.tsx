import type { Metadata } from "next"
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

export const metadata: Metadata = {
  title: "SERAPHIM - Search About Phone Informations & Models",
  description: "Search About Phone Informations & Models",
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
