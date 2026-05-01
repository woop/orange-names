(function () {
  const LIST_PATHS = new Set([
    "/", "/news", "/newest", "/best", "/active", "/show", "/ask", "/front", "/noobstories", "/classic"
  ]);

  async function fetchStoryNotables(storyId) {
    try {
      const out = await browser.runtime.sendMessage({ type: "fetchStory", storyId });
      if (out && Array.isArray(out.n)) return out;
      return { n: [], cached: false };
    } catch {
      return { n: [], cached: false };
    }
  }

  // ---------- Popover ----------

  let openPopover = null;

  function closePopover() {
    if (openPopover) {
      openPopover.remove();
      openPopover = null;
      document.removeEventListener("click", outsideClick, true);
      document.removeEventListener("keydown", escClose, true);
    }
  }
  function outsideClick(e) {
    if (openPopover && !openPopover.contains(e.target)) closePopover();
  }
  function escClose(e) {
    if (e.key === "Escape") closePopover();
  }

  function buildPopover(handle, anchorEl, opts) {
    const meta = NOTABLES[handle];
    if (!meta) return null;

    const card = document.createElement("div");
    card.className = "hn-notable-popover";

    const head = document.createElement("div");
    head.className = "hn-np-head";
    const nm = document.createElement("div");
    nm.className = "hn-np-name";
    nm.textContent = meta.name || handle;
    const sub = document.createElement("div");
    sub.className = "hn-np-handle";
    sub.textContent = "@" + handle + (meta.role ? " · " + meta.role : "");
    head.appendChild(nm);
    head.appendChild(sub);
    card.appendChild(head);

    if (meta.bio) {
      const bio = document.createElement("div");
      bio.className = "hn-np-bio";
      bio.textContent = meta.bio;
      card.appendChild(bio);
    }

    const links = document.createElement("div");
    links.className = "hn-np-links";

    const addLink = (label, href) => {
      if (!href) return;
      const a = document.createElement("a");
      a.href = href;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = label;
      a.className = "hn-np-link";
      links.appendChild(a);
    };

    addLink("HN profile", `https://news.ycombinator.com/user?id=${encodeURIComponent(handle)}`);
    if (opts && opts.commentId) {
      addLink("Comment in this thread", `https://news.ycombinator.com/item?id=${opts.commentId}`);
    }
    if (meta.twitter) addLink("Twitter / X", `https://x.com/${meta.twitter}`);
    if (meta.github) addLink("GitHub", `https://github.com/${meta.github}`);
    if (meta.homepage) addLink("Homepage", meta.homepage);
    if (meta.linkedin) addLink("LinkedIn", `https://www.linkedin.com/in/${meta.linkedin}`);
    if (meta.wikipedia) addLink("Wikipedia", meta.wikipedia);

    card.appendChild(links);
    return card;
  }

  function showPopover(handle, anchorEl, opts) {
    closePopover();
    const card = buildPopover(handle, anchorEl, opts || {});
    if (!card) return;
    document.body.appendChild(card);
    const rect = anchorEl.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    let top = window.scrollY + rect.bottom + 6;
    let left = window.scrollX + rect.left;
    // keep on-screen
    const margin = 8;
    if (left + cardRect.width > window.scrollX + document.documentElement.clientWidth - margin) {
      left = window.scrollX + document.documentElement.clientWidth - cardRect.width - margin;
    }
    if (left < window.scrollX + margin) left = window.scrollX + margin;
    card.style.top = top + "px";
    card.style.left = left + "px";
    openPopover = card;
    setTimeout(() => {
      document.addEventListener("click", outsideClick, true);
      document.addEventListener("keydown", escClose, true);
    }, 0);
  }

  // ---------- Decoration ----------

  function decorateAnchor(a, handle, opts) {
    if (a.dataset.hnNotableBound) return;
    a.dataset.hnNotableBound = "1";
    a.classList.add("hn-notable-user");
    a.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      showPopover(handle, a, opts || {});
    });
  }

  function decorateAllHnUsers() {
    const links = document.querySelectorAll("a.hnuser");
    links.forEach((a) => {
      const txt = (a.textContent || "").trim();
      if (!txt) return;
      if (NOTABLES[txt]) decorateAnchor(a, txt, {});
    });
  }

  function renderInlineNotables(subline, notables) {
    if (!notables.length) return;
    const wrap = document.createElement("span");
    wrap.className = "hn-notables-list";
    wrap.append(" | ");
    notables.forEach((n, i) => {
      if (i > 0) wrap.append(", ");
      const a = document.createElement("a");
      a.href = `https://news.ycombinator.com/item?id=${n.commentId}`;
      a.textContent = n.handle;
      a.className = "hn-notable hn-notable-user";
      decorateAnchor(a, n.handle, { commentId: n.commentId });
      wrap.append(a);
    });
    subline.appendChild(wrap);
  }

  function processListPage() {
    if (!LIST_PATHS.has(location.pathname)) return;
    const rows = document.querySelectorAll("tr.athing");
    let visibleIdx = 0;
    rows.forEach((row) => {
      const storyId = row.id;
      if (!storyId) return;
      const next = row.nextElementSibling;
      if (!next) return;
      const subline = next.querySelector(".subline");
      if (!subline) return;
      if (subline.dataset.hnNotablesProcessed) return;
      subline.dataset.hnNotablesProcessed = "1";
      const idx = visibleIdx++;
      fetchStoryNotables(storyId)
        .then(({ n, cached }) => {
          const delay = cached ? idx * 20 : 0;
          if (delay > 0) {
            setTimeout(() => renderInlineNotables(subline, n), delay);
          } else {
            renderInlineNotables(subline, n);
          }
        })
        .catch(() => {});
    });
  }

  // Run on every HN page
  decorateAllHnUsers();
  // And re-run after fetch on list pages (the inline notables also need decoration)
  processListPage();

  // Lightweight observer for HN pages that lazy-render (rare, but cheap insurance)
  const mo = new MutationObserver(() => {
    decorateAllHnUsers();
  });
  mo.observe(document.body, { childList: true, subtree: true });
})();
