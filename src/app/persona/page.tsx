import { CreatorSubnav } from "@/components/creator-subnav";
import { FeaturePlaceholder } from "@/components/feature-placeholder";

export default function PersonaPage() {
  return (
    <>
      <CreatorSubnav />
      <FeaturePlaceholder
        eyebrow="크리에이터"
        title="페르소나"
        description="내 콘텐츠에 맞는 독자 페르소나를 설계하고 관리하는 기능을 준비하고 있습니다."
      />
    </>
  );
}
