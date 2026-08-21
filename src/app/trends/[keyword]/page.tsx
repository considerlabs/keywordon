import { TrendDetailPanel } from "@/components/trends/trend-detail-panel";

type TrendsKeywordPageProps = {
  params: Promise<{ keyword: string }>;
};

export default async function TrendsKeywordPage({ params }: TrendsKeywordPageProps) {
  const { keyword } = await params;
  return <TrendDetailPanel keyword={decodeURIComponent(keyword)} />;
}
