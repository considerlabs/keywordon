import { CreatorSubnav } from "@/components/creator-subnav";
import { FeaturePlaceholder } from "@/components/feature-placeholder";

export default function RankingPage() {
  return (
    <>
      <CreatorSubnav />
      <FeaturePlaceholder
        eyebrow="크리에이터"
        title="블로그 순위"
        description="키워드별 블로그 노출 순위와 변화를 확인하는 기능을 준비하고 있습니다."
      />
    </>
  );
}
