import { trimWriteField } from "./prompt";

export type CommercePromptInput = {
  productUrl: string;
  productName: string;
  tone: string;
};

export function assertCommerceUrl(value: string): URL {
  const productUrl = value.trim();
  if (!productUrl) {
    throw new Error("상품 링크를 입력해 주세요.");
  }

  let url: URL;
  try {
    url = new URL(productUrl);
  } catch {
    throw new Error("유효한 HTTPS 상품 링크를 입력해 주세요.");
  }

  if (url.protocol !== "https:") {
    throw new Error("HTTPS 상품 링크만 사용할 수 있습니다.");
  }

  return url;
}

export function buildCommercePrompt({
  productUrl,
  productName,
  tone,
}: CommercePromptInput): { system: string; user: string } {
  const name = trimWriteField(productName, 120) || "이 상품";
  const writingTone = trimWriteField(tone, 80) || "친근하고 신뢰감 있는";

  return {
    system:
      "당신은 한국어 커머스 콘텐츠 작가입니다. 제공된 상품 링크와 이름만으로 글을 작성하며, 링크의 내용을 조회하거나 추정하지 않습니다. 확인되지 않은 성능, 가격, 재고, 후기, 인증을 사실처럼 말하지 마세요. 의학적 효능 또는 치료·예방을 주장하지 마세요.",
    user: [
      `상품명: ${name}`,
      `상품 링크: ${productUrl}`,
      `톤: ${writingTone}`,
      "",
      "위 정보를 바탕으로 상품을 소개하는 한국어 블로그 홍보글 초안을 작성하세요.",
      "제목, 소제목, 본문으로 구성하고 제품의 구체적인 사양이나 효능은 단정하지 마세요.",
      "마지막에는 링크를 확인해 보도록 자연스럽고 부담 없는 CTA를 한 문장으로 넣어 주세요.",
    ].join("\n"),
  };
}
