(() => {
  const query = new URLSearchParams(location.search).get("query");
  if (!query) return;

  const banner = document.createElement("div");
  banner.id = "keywordon-banner";
  banner.innerHTML = `
    <strong>KeywordOn</strong>
    <span>"${query}" 바로 분석</span>
    <a href="http://localhost:3000/analyze?q=${encodeURIComponent(query)}&engine=naver" target="_blank" rel="noreferrer">열기</a>
  `;
  document.documentElement.appendChild(banner);
})();
