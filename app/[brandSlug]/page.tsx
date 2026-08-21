import type { Metadata } from "next"
import { BrandDetailView } from "@/components/brand-detail-page"

type BrandDetailPageProps = {
  params: Promise<{
    brandSlug: string
  }>
}

export const metadata: Metadata = {
  title: "SERAPHIM - Search About Phone Informations & Models",
}

export default async function BrandDetailPage({ params }: BrandDetailPageProps) {
  const { brandSlug } = await params
  return <BrandDetailView brandSlug={brandSlug} />
}
