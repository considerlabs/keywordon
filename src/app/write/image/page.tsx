import { CreatorSubnav } from "@/components/creator-subnav";
import { FeaturePlaceholder } from "@/components/feature-placeholder";

export default function WriteImagePage() {
  return (
    <>
      <CreatorSubnav />
      <FeaturePlaceholder
        eyebrow="크리에이터"
        title="이미지 글쓰기"
        description="이미지와 키워드를 바탕으로 콘텐츠 초안을 만드는 도구를 준비하고 있습니다."
      />
    </>
  );
}
