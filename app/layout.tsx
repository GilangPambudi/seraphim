import type { Metadata } from "next"
import { IBM_Plex_Mono } from "next/font/google"
import "./globals.css"
import { AppShell } from "@/components/route-transition"
import { ThemeProvider } from "@/components/theme-provider"

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "SERAPHIM - Search About Phone Informations & Models",
  description: "Search About Phone Informations & Models",
}

export default function RootLayout() {
  return (
    <html lang="en" className={ibmPlexMono.variable} suppressHydrationWarning>
      <body className={ibmPlexMono.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AppShell />
        </ThemeProvider>
      </body>
    </html>
  )
}
