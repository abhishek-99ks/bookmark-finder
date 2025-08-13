const $ = (id) => document.getElementById(id);

const DEBUG = false; // Set to true to enable debug mode

// debounce utility
function debounce(fn, wait) {
  let t;
  return () => {
    clearTimeout(t);
    t = setTimeout(() => fn(), wait);
  };
}

// flatten a bookmark tree into array of {id,title,url,path}
function flattenBookmarks(nodes, parentPath = []) {
  const list = [];
  for (const node of nodes) {
    console.log("Node: ", node);
    const currentPath = node.title ? [...parentPath, node.title] : parentPath;
    if (node.url) {
      list.push({
        id: node.id,
        title: node.title || node.url,
        url: node.url,
        path: currentPath.join(" > "),
      });
    }
    if (node.children && node.children.length)
      list.push(...flattenBookmarks(node.children, currentPath));
  }
  return list;
}

// search function: finds matches in title, url, or path
function searchBookmarks(list, query) {
  const trimmedQuery = (query || "").trim().toLowerCase();
  if (!trimmedQuery) return list.slice(0, 50);
  const tokens = trimmedQuery.split(/\s+/).filter((word) => word.length > 0);
  return list
    .filter((item) => {
      const hay = (item.title + " " + item.url + " " + item.path).toLowerCase();
      return tokens.every((token) => hay.includes(token));
    })
    .slice(0, 100);
}

function highlight(text, query) {
  if (!query) return escapeHtml(text);
  const qesc = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp("(" + qesc.split(/\\s+/).join("|") + ")", "ig");
  return escapeHtml(text).replace(re, '<span class="highlight">$1</span>');
}

function escapeHtml(text) {
  return String(text).replace(
    /[&<>\"]/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
      }[char])
  );
}

function renderResults(container, results, q) {
  container.innerHTML = "";
  if (!results.length) {
    container.innerHTML =
      '<div style="color:#6a737d;padding:8px">No bookmarks found</div>';
    return;
  }
  for (const result of results) {
    const div = document.createElement("div");
    div.className = "result-item";
    div.tabIndex = 0;
    div.innerHTML = `
      <div class="title-row">
        <div class="result-title">${highlight(result.title, q)}</div>
      </div>
      <div class="result-url">${highlight(result.url, q)}</div>
      <div class="result-path">${highlight(result.path, q)}</div>
    `;
    div.addEventListener("click", () => openUrl(result.url));
    div.addEventListener("keydown", (e) => {
      if (e.key === "Enter") openUrl(result.url);
    });
    container.appendChild(div);
  }
}

function openUrl(url) {
  if (!url) return;
  chrome.tabs.create({ url });
}

// main runtime
(function main() {
  const queryInput = $("query");
  const resultsEl = $("results");
  let allBookmarks = [];

  // load bookmarks
  if (chrome && chrome.bookmarks && chrome.bookmarks.getTree) {
    chrome.bookmarks.getTree((tree) => {
      allBookmarks = flattenBookmarks(tree);
      // initial render
      renderResults(resultsEl, searchBookmarks(allBookmarks, ""), "");
    });
  } else {
    // If chrome.bookmarks is not available, attach empty list.
    allBookmarks = [];
    renderResults(resultsEl, [], "");
  }

  const onInput = debounce(() => {
    const queryValue = queryInput.value;
    const results = searchBookmarks(allBookmarks, queryValue);
    renderResults(resultsEl, results, queryValue);
  }, 150);

  queryInput.addEventListener("input", onInput);

  // Expose for debugging
  if (DEBUG) {
    window.__BM = { flattenBookmarks, searchBookmarks, highlight };
  }
})();

// Export for tests
if (typeof module !== "undefined") {
  module.exports = {
    flattenBookmarks,
    searchBookmarks,
    highlight,
    escapeHtml,
    debounce,
  };
}
