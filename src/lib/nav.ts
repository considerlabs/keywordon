export type NavLink = {
  href: string;
  label: string;
  badge?: "new";
};

export type NavGroup = {
  id: string;
  label: string;
  href?: string;
  badge?: "new";
  children?: NavLink[];
};

export const TOP_NAV: NavGroup[] = [
  {
    id: "creator",
    label: "크리에이터",
    children: [
      { href: "/analyze", label: "키워드 분석" },
      { href: "/write", label: "글쓰기 AI" },
      { href: "/blog", label: "블로그 분석" },
      { href: "/ranking", label: "블로그 순위" },
      { href: "/audit", label: "게시글 진단" },
      { href: "/persona", label: "페르소나" },
    ],
  },
  { id: "automation", label: "AI 자동화", href: "/automation" },
  { id: "shortform", label: "숏폼", href: "/shortform", badge: "new" },
  {
    id: "more",
    label: "더보기",
    children: [
      { href: "/bulk", label: "대량 조회" },
      { href: "/discover", label: "키워드 발굴" },
      { href: "/trends", label: "급상승 트렌드" },
      { href: "/calculator", label: "수익 계산기" },
      { href: "/site", label: "사이트 진단" },
      { href: "/account/usage", label: "사용량" },
      { href: "/shop", label: "플랜" },
    ],
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
