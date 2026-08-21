import { CreatorSubnav } from "@/components/creator-subnav";
import { FeaturePlaceholder } from "@/components/feature-placeholder";

export default function WritePage() {
  return (
    <>
      <CreatorSubnav />
      <FeaturePlaceholder
        eyebrow="크리에이터"
        title="글쓰기 AI"
        description="키워드와 검색 의도를 바탕으로 블로그 글을 작성하는 글쓰기 AI 2.1을 준비하고 있습니다."
      />
    </>
  );
}
