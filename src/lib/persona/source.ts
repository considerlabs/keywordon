import { parseRssItems, resolveBlogFeed } from "@/lib/analysis-tools";
import { assertAllowedUrl, fetchAllowedRaw, fetchAllowedUrl, SsrfError } from "@/lib/ssrf";

const MIN_SOURCE_CHARS = 200;
const MAX_SOURCE_CHARS = 50_000;
const MAX_POSTS = 3;

function isSinglePostUrl(url: URL): boolean {
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host.endsWith(".tistory.com")) {
    return /\/\d+\/?$/.test(url.pathname);
  }
  if (host === "blog.naver.com" || host === "m.blog.naver.com") {
    if (/PostView\.naver/i.test(url.pathname)) return true;
    return /^\/[A-Za-z0-9_-]+\/\d+\/?$/.test(url.pathname);
  }
  return false;
}

function cleanPostLink(link: string): string {
  try {
    const url = new URL(link);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return link.split("?")[0] ?? link;
  }
}

async function collectFromRssHome(blogUrl: string): Promise<{ text: string; displayUrl: string }> {
  const feed = resolveBlogFeed(blogUrl);
  assertAllowedUrl(feed.feedUrl);

  const rss = await fetchAllowedRaw(feed.feedUrl);
  const items = parseRssItems(rss.text).slice(0, 5);
  if (items.length === 0) {
    throw new Error("RSS에서 글을 찾지 못했습니다. 블로그 ID·공개 설정을 확인해 주세요.");
  }

  const parts: string[] = [];

  for (const item of items.slice(0, MAX_POSTS)) {
    const link = item.link ? cleanPostLink(item.link) : "";
    if (link) {
      try {
        assertAllowedUrl(link);
        const post = await fetchAllowedUrl(link);
        if (post.text.length >= 100) {
          parts.push(`# ${item.title}\n${post.text.slice(0, 12_000)}`);
          continue;
        }
      } catch {
        /* fall through to description */
      }
    }
    if (item.description.length >= 40) {
      parts.push(`# ${item.title}\n${item.description}`);
    }
  }

  const text = parts.join("\n\n---\n\n").slice(0, MAX_SOURCE_CHARS);
  if (text.length < MIN_SOURCE_CHARS) {
    throw new Error(
      "블로그에서 분석할 본문을 충분히 가져오지 못했습니다. 대표 글 본문을 붙여넣어 주세요.",
    );
  }

  return { text, displayUrl: feed.displayUrl };
}

/** Collect enough article text for persona learning from a blog URL. */
export async function collectPersonaSource(
  blogUrl: string,
): Promise<{ text: string; displayUrl: string }> {
  const trimmed = blogUrl.trim();
  if (!trimmed) {
    throw new Error("블로그 URL을 입력해 주세요.");
  }

  let url: URL;
  try {
    url = assertAllowedUrl(trimmed);
  } catch (error) {
    if (error instanceof SsrfError) throw error;
    throw new Error("URL 형식이 올바르지 않습니다.");
  }

  if (isSinglePostUrl(url)) {
    const fetched = await fetchAllowedUrl(trimmed);
    if (fetched.text.length < MIN_SOURCE_CHARS) {
      throw new Error(
        "게시글 본문이 너무 짧습니다. 다른 글 URL이거나 본문 붙여넣기를 사용해 주세요.",
      );
    }
    return { text: fetched.text.slice(0, MAX_SOURCE_CHARS), displayUrl: fetched.url.toString() };
  }

  return collectFromRssHome(trimmed);
}
