export type NavLink = {
  href: string;
  label: string;
  description?: string;
  badge?: "new";
};

export type NavGroup = {
  id: string;
  label: string;
  href?: string;
  badge?: "new";
  children?: NavLink[];
};

/** Desktop: GitBook-style top nav (hover mega panels). */
export const TOP_NAV: NavGroup[] = [
  {
    id: "product",
    label: "제품",
    children: [
      {
        href: "/analyze",
        label: "키워드 분석",
        description: "검색량·경쟁도·기회지수를 한 화면에서",
      },
      {
        href: "/write",
        label: "글쓰기 AI",
        description: "글타입·키워드로 초안을 바로 생성",
      },
      {
        href: "/blog",
        label: "블로그 분석",
        description: "블로그 성과와 노출 포인트를 점검",
      },
      {
        href: "/ranking",
        label: "블로그 순위",
        description: "키워드별 노출 순위 변화를 추적",
      },
      {
        href: "/audit",
        label: "게시글 진단",
        description: "SEO·가독성 개선 포인트를 진단",
      },
      {
        href: "/persona",
        label: "페르소나",
        description: "문체를 학습해 초안에 반영",
      },
    ],
  },
  {
    id: "automation",
    label: "AI 자동화",
    href: "/automation",
  },
  {
    id: "shortform",
    label: "숏폼",
    href: "/shortform",
    badge: "new",
  },
  {
    id: "resources",
    label: "리소스",
    children: [
      {
        href: "/bulk",
        label: "대량 조회",
        description: "여러 키워드를 한 번에 비교",
      },
      {
        href: "/discover",
        label: "키워드 발굴",
        description: "연관·기회 키워드를 확장",
      },
      {
        href: "/trends",
        label: "급상승 트렌드",
        description: "지금 뜨는 검색어와 추이",
      },
      {
        href: "/calculator",
        label: "수익 계산기",
        description: "애드포스트 수익을 빠르게 추정",
      },
      {
        href: "/site",
        label: "사이트 진단",
        description: "도메인 단위 SEO 점검을 실행",
      },
      {
        href: "/account/usage",
        label: "사용량",
        description: "AI·검색 쿼터를 한눈에 확인",
      },
    ],
  },
  {
    id: "pricing",
    label: "플랜",
    href: "/shop",
  },
];

export const CREATOR_SUBNAV: NavLink[] = [
  { href: "/analyze", label: "키워드 분석" },
  { href: "/write", label: "글쓰기 AI" },
  { href: "/blog", label: "블로그 분석" },
  { href: "/ranking", label: "블로그 순위" },
  { href: "/audit", label: "게시글 진단" },
  { href: "/persona", label: "페르소나" },
];

export function isNavActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
