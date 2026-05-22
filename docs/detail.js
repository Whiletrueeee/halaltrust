const params = new URLSearchParams(window.location.search);
const type = params.get("type") || "restaurants";
const id = params.get("id") || "";

const typeLabel = {
  restaurants: "餐厅详情",
  sources: "肉源核验详情",
  slaughterhouses: "屠宰场详情"
};

const certLabel = {
  strict: "严选认证",
  verified: "已核验",
  community: "社区推荐"
};

const sourceTypeLabel = {
  slaughterhouse: "合规屠宰场",
  supplier: "清真供应商",
  "restaurant-direct": "餐厅直采"
};

const defaultCover = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 420">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#073f2e"/><stop offset="1" stop-color="#c99434"/></linearGradient></defs>
    <rect width="960" height="420" fill="url(#g)"/>
    <text x="56" y="88" fill="#fff8e6" font-size="42" font-family="Arial" font-weight="700">Halal Trust</text>
    <text x="56" y="340" fill="#fff" font-size="58" font-family="Arial" font-weight="800">清真合规档案</text>
  </svg>
`)}`;

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[char]);
}

function lines(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value || "").split(/[\n,，]/).map((item) => item.trim()).filter(Boolean);
}

function menuRows(value) {
  const source = Array.isArray(value) ? value : lines(value);
  return source.map((item) => {
    if (typeof item === "object" && item) {
      return { name: String(item.name || ""), price: String(item.price || "") };
    }
    const text = String(item || "");
    const match = text.match(/^(.*?)(?:\s+)?([0-9]+(?:\.[0-9]+)?\s*元?)$/);
    return { name: (match?.[1] || text).trim(), price: (match?.[2] || "").trim() };
  }).filter((item) => item.name || item.price);
}

function renderMenu(value) {
  const rows = menuRows(value);
  if (!rows.length) return `<p class="muted-text">暂无内容</p>`;
  return `
    <div class="detail-menu-table">
      ${rows.map((row) => `
        <div>
          <span>${escapeHtml(row.name)}</span>
          <strong>${escapeHtml(row.price || "价格待补充")}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

async function api(path) {
  try {
    const response = await fetch(path);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `API ${response.status}`);
    return data;
  } catch (error) {
    if (path.startsWith("/api/")) return staticDetailApi();
    throw error;
  }
}

async function staticDetailApi() {
  const response = await fetch("db/halal-directory.json", { cache: "no-store" });
  if (!response.ok) throw new Error("静态数据文件未找到");
  const base = await response.json();
  const draft = JSON.parse(localStorage.getItem("halalStaticDraft") || "{}");
  const db = {
    ...base,
    restaurants: draft.restaurants || base.restaurants || [],
    sources: draft.sources || base.sources || [],
    slaughterhouses: draft.slaughterhouses || base.slaughterhouses || []
  };
  const collections = {
    restaurants: db.restaurants,
    sources: db.sources,
    slaughterhouses: db.slaughterhouses
  };
  const collection = collections[type];
  if (!collection) throw new Error("Detail type not found");
  const item = collection.find((entry) => entry.id === id);
  if (!item) throw new Error("Detail item not found");
  return {
    type,
    item,
    source: type === "restaurants" ? db.sources.find((source) => source.id === item.sourceId) || null : null,
    relatedRestaurants: type === "sources" ? db.restaurants.filter((restaurant) => restaurant.sourceId === item.id) : []
  };
}

function gallery(title, images) {
  const list = images || [];
  return `
    <section class="detail-section">
      <h2>${escapeHtml(title)}</h2>
      ${list.length ? `
        <div class="detail-page-gallery">
          ${list.map((image) => `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" loading="lazy" />`).join("")}
        </div>
      ` : `<p class="muted-text">暂无图片</p>`}
    </section>
  `;
}

function infoItem(label, value) {
  return `
    <div>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value || "待补充")}</strong>
    </div>
  `;
}

function render(data) {
  const item = data.item;
  document.querySelector("#detailType").textContent = typeLabel[data.type] || "详情";
  document.querySelector("#detailName").textContent = item.name;

  const intro = item.summary || item.traceability || `${item.name}的合规档案。`;
  const menu = item.menu?.length ? item.menu : item.requirements;
  const cover = item.coverImage || defaultCover;
  const source = data.source;
  const related = data.relatedRestaurants || [];
  const infoGrid = data.type === "restaurants" ? `
    ${infoItem("电话", item.phone)}
    ${infoItem("地址", item.address || `${item.city || ""} ${item.district || ""}`.trim())}
    ${infoItem("合规级别", certLabel[item.certificationLevel] || item.certificationLevel)}
    ${infoItem("来源类型", sourceTypeLabel[item.sourceType] || item.sourceType)}
  ` : `
    ${infoItem("电话", item.phone)}
    ${infoItem("地址", item.address || `${item.city || ""} ${item.district || ""}`.trim())}
    ${infoItem("认证 / 审核", item.certifier || item.auditor || item.certificationLevel)}
    ${infoItem("证书 / 日期", item.certificateNo || item.lastAudit || item.validUntil)}
  `;

  document.querySelector("#detailRoot").innerHTML = `
    <section class="detail-hero">
      <img src="${escapeHtml(cover)}" alt="${escapeHtml(item.name)}封面" />
      <div class="detail-hero-copy">
        <p>${escapeHtml(typeLabel[data.type] || "详情")}</p>
        <h2>${escapeHtml(item.name)}</h2>
        <span>${escapeHtml(item.city || "")}${item.district ? ` · ${escapeHtml(item.district)}` : ""}</span>
      </div>
    </section>

    <section class="detail-section">
      <h2>基础信息</h2>
      <div class="detail-info-grid">
        ${infoGrid}
      </div>
      <p class="detail-intro">${escapeHtml(intro)}</p>
    </section>

    <section class="detail-section">
      <h2>${data.type === "restaurants" ? "菜单" : "服务项目"}</h2>
      ${renderMenu(menu)}
    </section>

    ${source ? `
      <section class="detail-section">
        <h2>合规肉源</h2>
        <p class="detail-intro">${escapeHtml(source.name)} · ${escapeHtml(source.certificateNo || "证照待补充")} · ${escapeHtml(source.validUntil || "有效期待补充")}</p>
      </section>
    ` : ""}

    ${related.length ? `
      <section class="detail-section">
        <h2>关联餐厅</h2>
        <div class="menu-list">${related.map((restaurant) => `<span>${escapeHtml(restaurant.name)}</span>`).join("")}</div>
      </section>
    ` : ""}

    ${gallery("环境相册", item.environmentPhotos || [])}
    ${gallery("营业证书", item.certificatePhotos || [])}
  `;
}

async function init() {
  try {
    if (!id) throw new Error("缺少详情 ID");
    const data = await api(`/api/detail/${encodeURIComponent(type)}/${encodeURIComponent(id)}`);
    render(data);
  } catch (error) {
    document.querySelector("#detailRoot").innerHTML = `<div class="empty-state">详情加载失败：${escapeHtml(error.message)}</div>`;
  }
}

init();
