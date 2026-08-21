import { CreatorSubnav } from "@/components/creator-subnav";
import { FeaturePlaceholder } from "@/components/feature-placeholder";

export default function AuditPage() {
  return (
    <>
      <CreatorSubnav />
      <FeaturePlaceholder
        eyebrow="크리에이터"
        title="게시글 진단"
        description="게시글의 검색 노출 요소와 개선 우선순위를 진단하는 기능을 준비하고 있습니다."
      />
    </>
  );
}
