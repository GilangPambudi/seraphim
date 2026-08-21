import type { Metadata } from "next"
import { HomePage } from "@/components/home-page"

export const metadata: Metadata = {
  title: "SERAPHIM - Search About Phone Informations & Models",
}

export default function Page() {
  return <HomePage />
}
