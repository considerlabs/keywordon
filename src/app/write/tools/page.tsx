import { CreatorSubnav } from "@/components/creator-subnav";
import { FeaturePlaceholder } from "@/components/feature-placeholder";

export default function WriteToolsPage() {
  return (
    <>
      <CreatorSubnav />
      <FeaturePlaceholder
        eyebrow="크리에이터"
        title="글쓰기 도구"
        description="콘텐츠 작성 흐름을 더 빠르게 만드는 다양한 글쓰기 도구를 준비하고 있습니다."
      />
    </>
  );
}
