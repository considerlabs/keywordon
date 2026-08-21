(() => {
  const query = new URLSearchParams(location.search).get("query");
  if (!query) return;

  const banner = document.createElement("div");
  banner.id = "keywordon-banner";

  const title = document.createElement("strong");
  title.textContent = "KeywordOn";

  const label = document.createElement("span");
  label.textContent = `"${query}" 바로 분석`;

  const link = document.createElement("a");
  link.href = `https://keywordon.vercel.app/analyze?q=${encodeURIComponent(query)}&engine=naver`;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = "열기";

  banner.append(title, label, link);
  document.documentElement.appendChild(banner);
})();
