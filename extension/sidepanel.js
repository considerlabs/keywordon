const keywordInput = document.getElementById("keyword");
const loadBtn = document.getElementById("load");
const frame = document.getElementById("frame");
const base = "http://localhost:3000";

function load() {
  const keyword = keywordInput.value.trim() || "마케팅";
  frame.src = `${base}/analyze?q=${encodeURIComponent(keyword)}&engine=naver`;
}

loadBtn.addEventListener("click", load);
chrome.storage.sync.get(["lastKeyword"], (result) => {
  if (result.lastKeyword) keywordInput.value = result.lastKeyword;
  load();
});
