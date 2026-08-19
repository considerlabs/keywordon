const keywordInput = document.getElementById("keyword");
const analyzeBtn = document.getElementById("analyze");
const sidepanelBtn = document.getElementById("sidepanel");

chrome.storage.sync.get(["lastKeyword"], (result) => {
  if (result.lastKeyword) keywordInput.value = result.lastKeyword;
});

analyzeBtn.addEventListener("click", () => {
  const keyword = keywordInput.value.trim();
  if (!keyword) return;
  chrome.storage.sync.set({ lastKeyword: keyword });
  const base = "http://localhost:3000";
  chrome.tabs.create({
    url: `${base}/analyze?q=${encodeURIComponent(keyword)}&engine=naver`,
  });
});

sidepanelBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    await chrome.sidePanel.open({ tabId: tab.id });
  }
});
