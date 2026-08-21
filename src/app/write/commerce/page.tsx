import { CreatorSubnav } from "@/components/creator-subnav";
import { FeaturePlaceholder } from "@/components/feature-placeholder";

export default function WriteCommercePage() {
  return (
    <>
      <CreatorSubnav />
      <FeaturePlaceholder
        eyebrow="크리에이터"
        title="커머스 글쓰기"
        description="상품 정보와 핵심 키워드에 맞춘 커머스 콘텐츠 작성을 준비하고 있습니다."
      />
    </>
  );
}
