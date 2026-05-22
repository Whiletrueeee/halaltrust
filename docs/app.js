const state = {
  view: "search",
  meta: null,
  restaurants: [],
  sources: [],
  slaughterhouses: [],
  selected: null,
  userLocation: null,
  userLocationLabel: "",
  locationStatus: "正在尝试当前定位",
  map: null,
  mapMarkers: [],
  amap: null,
  amapMarkers: [],
  amapReady: false,
  editingId: "",
  activeAdminType: "restaurants",
  currentPage: 1,
  pageSize: 10
};

const ADMIN_PASSWORD = "sophia";

const mapConfig = window.HALAL_MAP_CONFIG || {};
const staticDraftKey = "halalStaticDraft";

const cityCenters = {
  北京: { lat: 39.9042, lng: 116.4074 },
  上海: { lat: 31.2304, lng: 121.4737 },
  天津: { lat: 39.3434, lng: 117.3616 },
  重庆: { lat: 29.563, lng: 106.5516 },
  广州: { lat: 23.1291, lng: 113.2644 },
  深圳: { lat: 22.5431, lng: 114.0579 },
  杭州: { lat: 30.2741, lng: 120.1551 },
  南京: { lat: 32.0603, lng: 118.7969 },
  成都: { lat: 30.5728, lng: 104.0668 },
  西安: { lat: 34.3416, lng: 108.9398 },
  兰州: { lat: 36.0611, lng: 103.8343 },
  银川: { lat: 38.4872, lng: 106.2309 },
  乌鲁木齐: { lat: 43.8256, lng: 87.6168 },
  昆明: { lat: 25.0389, lng: 102.7183 }
};

const els = {
  apiStatus: document.querySelector("#apiStatus"),
  provinceSelect: document.querySelector("#provinceSelect"),
  citySelect: document.querySelector("#citySelect"),
  districtSelect: document.querySelector("#districtSelect"),
  certSelect: document.querySelector("#certSelect"),
  sourceTypeSelect: document.querySelector("#sourceTypeSelect"),
  cuisineSelect: document.querySelector("#cuisineSelect"),
  searchBand: document.querySelector(".search-band"),
  statsStrip: document.querySelector(".stats-strip"),
  searchInput: document.querySelector("#searchInput"),
  restaurantCount: document.querySelector("#restaurantCount"),
  sourceCount: document.querySelector("#sourceCount"),
  slaughterhouseCount: document.querySelector("#slaughterhouseCount"),
  viewKicker: document.querySelector("#viewKicker"),
  viewTitle: document.querySelector("#viewTitle"),
  resultTotal: document.querySelector("#resultTotal"),
  resultsList: document.querySelector("#resultsList"),
  mapCanvas: document.querySelector("#mapCanvas"),
  detailPanel: document.querySelector("#detailPanel"),
  mapProvider: document.querySelector("#mapProvider"),
  locateButton: document.querySelector("#locateButton"),
  locationInput: document.querySelector("#locationInput"),
  locationSearchButton: document.querySelector("#locationSearchButton"),
  locationStatus: document.querySelector("#locationStatus"),
  contentGrid: document.querySelector(".content-grid"),
  adminArea: document.querySelector("#adminArea"),
  restaurantForm: document.querySelector("#restaurantForm"),
  sourceForm: document.querySelector("#sourceForm"),
  slaughterhouseForm: document.querySelector("#slaughterhouseForm"),
  adminFormTitle: document.querySelector("#adminFormTitle"),
  resetFormButton: document.querySelector("#resetFormButton"),
  adminMessage: document.querySelector("#adminMessage"),
  adminCertSelect: document.querySelector("#adminCertSelect"),
  adminSourceTypeSelect: document.querySelector("#adminSourceTypeSelect"),
  adminSourceSelect: document.querySelector("#adminSourceSelect"),
  sourceFormTypeSelect: document.querySelector("#sourceFormTypeSelect")
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

const thumbImages = [
  "linear-gradient(135deg, #0b4d37, #d7a84d 58%, #fff3d2)",
  "linear-gradient(135deg, #164734, #6aa772 54%, #f4dfaa)",
  "linear-gradient(135deg, #0d5a40, #cfc679 52%, #f7f3df)",
  "linear-gradient(135deg, #335f49, #c69036 56%, #fff8e6)"
];

const defaultCovers = {
  restaurants: encodeSvgCover("清真餐饮", "#0b4d37", "#c99434"),
  sources: encodeSvgCover("肉源核验", "#224d40", "#7b8f50"),
  slaughterhouses: encodeSvgCover("屠宰场档案", "#1c4337", "#bf8d35")
};

function encodeSvgCover(label, start, end) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="${start}"/>
          <stop offset="1" stop-color="${end}"/>
        </linearGradient>
      </defs>
      <rect width="640" height="420" fill="url(#g)"/>
      <circle cx="520" cy="90" r="76" fill="rgba(255,255,255,.14)"/>
      <circle cx="92" cy="344" r="118" fill="rgba(255,255,255,.1)"/>
      <text x="48" y="78" fill="#fff8e6" font-size="34" font-family="Arial, sans-serif" font-weight="700">Halal Trust</text>
      <text x="48" y="352" fill="#ffffff" font-size="46" font-family="Arial, sans-serif" font-weight="800">${label}</text>
    </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function coverFor(item, type) {
  return item.coverImage || defaultCovers[type];
}

function coverMarkup(item, type, alt) {
  return `<img src="${escapeHtml(coverFor(item, type))}" alt="${escapeHtml(alt)}封面" loading="lazy" />`;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function setCoverPreview(type, image) {
  const preview = document.querySelector(`[data-cover-preview="${type}"]`);
  if (!preview) return;
  preview.innerHTML = image ? `<img src="${escapeHtml(image)}" alt="封面预览" />` : "";
}

function bindCoverInput(form, type) {
  form.elements.coverFile.addEventListener("change", async () => {
    const file = form.elements.coverFile.files[0];
    if (!file) return;
    const image = await fileToDataUrl(file);
    form.elements.coverImage.value = image;
    setCoverPreview(type, image);
  });
}

function parseStoredArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(value).split(/[\n,，]/).map((item) => item.trim()).filter(Boolean);
  }
}

function setGalleryValue(form, field, values) {
  form.elements[field].value = JSON.stringify(values || []);
}

function galleryValue(form, field) {
  return parseStoredArray(form.elements[field].value);
}

function setGalleryPreview(key, images) {
  const preview = document.querySelector(`[data-gallery-preview="${key}"]`);
  if (!preview) return;
  preview.innerHTML = (images || []).map((image) => `
    <img src="${escapeHtml(image)}" alt="相册预览" loading="lazy" />
  `).join("");
}

function bindGalleryInput(form, type, inputName, fieldName, previewKey) {
  form.elements[inputName].addEventListener("change", async () => {
    const maxFiles = Number(form.elements[inputName].dataset.maxFiles || 20);
    const files = [...form.elements[inputName].files].slice(0, maxFiles);
    if (form.elements[inputName].files.length > maxFiles) {
      els.adminMessage.textContent = `最多上传 ${maxFiles} 张图片，已保留前 ${maxFiles} 张`;
    }
    const images = await Promise.all(files.map((file) => fileToDataUrl(file)));
    setGalleryValue(form, fieldName, images);
    setGalleryPreview(`${type}-${previewKey}`, images);
  });
}

function menuArrayToRows(menu) {
  if (!Array.isArray(menu)) return [];
  return menu.map((item) => {
    if (typeof item === "object" && item) {
      return { name: String(item.name || ""), price: String(item.price || "") };
    }
    const text = String(item || "");
    const match = text.match(/^(.*?)(?:\s+)?([0-9]+(?:\.[0-9]+)?\s*元?)$/);
    return { name: (match?.[1] || text).trim(), price: (match?.[2] || "").trim() };
  }).filter((item) => item.name || item.price);
}

function renderMenuEditor(type, rows = []) {
  const editor = document.querySelector(`[data-menu-editor="${type}"]`);
  if (!editor) return;
  const safeRows = rows.length ? rows : [{ name: "", price: "" }];
  editor.innerHTML = safeRows.map((row, index) => `
    <div class="menu-editor-row">
      <input data-menu-name value="${escapeHtml(row.name)}" placeholder="菜品名称" />
      <input data-menu-price value="${escapeHtml(row.price)}" placeholder="价格，例如 28 元" />
      <button class="danger-action" data-menu-remove="${index}" type="button">删除</button>
    </div>
  `).join("");
}

function readMenuEditor(type) {
  const editor = document.querySelector(`[data-menu-editor="${type}"]`);
  if (!editor) return [];
  return [...editor.querySelectorAll(".menu-editor-row")].map((row) => ({
    name: row.querySelector("[data-menu-name]").value.trim(),
    price: row.querySelector("[data-menu-price]").value.trim()
  })).filter((item) => item.name || item.price);
}

function syncRestaurantMenuField() {
  els.restaurantForm.elements.menu.value = JSON.stringify(readMenuEditor("restaurants"));
}

function bindMenuEditor(type) {
  const editor = document.querySelector(`[data-menu-editor="${type}"]`);
  const addButton = document.querySelector(`[data-menu-add="${type}"]`);
  if (!editor || !addButton) return;
  addButton.addEventListener("click", () => {
    const rows = readMenuEditor(type);
    rows.push({ name: "", price: "" });
    renderMenuEditor(type, rows);
  });
  editor.addEventListener("input", () => {
    if (type === "restaurants") syncRestaurantMenuField();
  });
  editor.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-menu-remove]");
    if (!remove) return;
    const rows = readMenuEditor(type);
    rows.splice(Number(remove.dataset.menuRemove), 1);
    renderMenuEditor(type, rows);
    if (type === "restaurants") syncRestaurantMenuField();
  });
}

function textLines(value) {
  if (Array.isArray(value)) return value;
  return String(value || "").split(/[\n,，]/).map((item) => item.trim()).filter(Boolean);
}

function menuTextLines(value) {
  return menuArrayToRows(value).map((item) => [item.name, item.price].filter(Boolean).join(" · "));
}

function detailGallery(title, images) {
  const safeImages = images || [];
  return `
    <div class="detail-block">
      <h4>${escapeHtml(title)}</h4>
      ${safeImages.length ? `
        <div class="detail-gallery">
          ${safeImages.map((image) => `<img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" loading="lazy" />`).join("")}
        </div>
      ` : `<p>暂无图片</p>`}
    </div>
  `;
}

function renderEntityDetail(item, type, extra = {}) {
  if (!item) {
    els.detailPanel.innerHTML = `<p>选择列表或地图标记后，这里会展示电话、地址、简介、菜单和相册。</p>`;
    return;
  }
  const intro = item.summary || item.traceability || extra.intro || "暂无简介";
  const menu = item.menu?.length ? menuTextLines(item.menu) : textLines(extra.menu);
  els.detailPanel.innerHTML = `
    <div class="detail-cover">${coverMarkup(item, type, item.name)}</div>
    <h3>${escapeHtml(item.name)}</h3>
    <p><strong>电话：</strong>${escapeHtml(item.phone || "待补充")}</p>
    <p><strong>地址：</strong>${escapeHtml(item.address || `${item.city || ""} ${item.district || ""}`.trim() || "待补充")}</p>
    ${type === "restaurants" ? `
      <p><strong>合规级别：</strong>${escapeHtml(certLabel[item.certificationLevel] || item.certificationLevel || "待补充")}</p>
      <p><strong>来源类型：</strong>${escapeHtml(sourceTypeLabel[item.sourceType] || item.sourceType || "待补充")}</p>
    ` : ""}
    <p>${escapeHtml(intro)}</p>
    <div class="detail-block">
      <h4>${type === "restaurants" ? "菜单" : "服务 / 菜单项"}</h4>
      ${menu.length ? `<ul>${menu.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>` : `<p>暂无内容</p>`}
    </div>
    ${extra.source ? `
      <div class="detail-block">
        <h4>合规肉源</h4>
        <p>${escapeHtml(extra.source.name)} · ${escapeHtml(extra.source.certificateNo || "证照待补充")}</p>
      </div>
    ` : ""}
    ${detailGallery("环境相册", item.environmentPhotos || [])}
    ${detailGallery("营业证书", item.certificatePhotos || [])}
    ${type !== "sources" ? `<button class="primary-action" data-nav="${item.id}" type="button">打开导航</button>` : ""}
  `;
}

function openDetailPage(type, id) {
  window.location.href = `detail.html?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`;
}

function averageCenter(items) {
  const valid = items.filter((item) => Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng)));
  if (!valid.length) return null;
  return {
    lat: valid.reduce((sum, item) => sum + Number(item.lat), 0) / valid.length,
    lng: valid.reduce((sum, item) => sum + Number(item.lng), 0) / valid.length
  };
}

function mapCenterFor(items) {
  if (els.citySelect.value && cityCenters[els.citySelect.value]) return cityCenters[els.citySelect.value];
  const fromItems = averageCenter(items);
  if (fromItems) return fromItems;
  if (state.userLocation) return state.userLocation;
  return { lat: 35.8617, lng: 104.1954 };
}

function osmEmbedUrl(center, radiusKm = 10) {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.max(0.2, Math.cos(center.lat * Math.PI / 180)));
  const left = center.lng - lngDelta;
  const right = center.lng + lngDelta;
  const bottom = center.lat - latDelta;
  const top = center.lat + latDelta;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${center.lat}%2C${center.lng}`;
}

function setLocationCenter(center, label) {
  state.userLocation = center;
  state.userLocationLabel = label;
  state.locationStatus = `已定位到：${label}`;
  updateLocationStatus();
}

function updateLocationStatus() {
  if (!els.locationStatus) return;
  els.locationStatus.textContent = `当前定位：${state.userLocationLabel || "待定位"}`;
}

function distanceKm(from, item) {
  const lat = Number(item.lat);
  const lng = Number(item.lng);
  if (!from || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const toRad = (value) => value * Math.PI / 180;
  const earthRadius = 6371;
  const dLat = toRad(lat - from.lat);
  const dLng = toRad(lng - from.lng);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(from.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(item) {
  const km = distanceKm(state.userLocation, item);
  if (km == null) return "距离待定位";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

function sortByDistance(items) {
  return [...items].sort((a, b) => {
    const aDistance = distanceKm(state.userLocation, a);
    const bDistance = distanceKm(state.userLocation, b);
    if (aDistance == null && bDistance == null) return 0;
    if (aDistance == null) return 1;
    if (bDistance == null) return -1;
    return aDistance - bDistance;
  });
}

function paginate(items) {
  const totalPages = Math.max(1, Math.ceil(items.length / state.pageSize));
  state.currentPage = Math.min(Math.max(1, state.currentPage), totalPages);
  const start = (state.currentPage - 1) * state.pageSize;
  return {
    totalPages,
    pageItems: items.slice(start, start + state.pageSize)
  };
}

function renderPagination(totalItems, totalPages) {
  if (totalItems <= state.pageSize) return "";
  return `
    <div class="pagination">
      <button class="ghost-action" data-page-action="prev" type="button" ${state.currentPage <= 1 ? "disabled" : ""}>上一页</button>
      <span>第 ${state.currentPage} / ${totalPages} 页 · 共 ${totalItems} 条</span>
      <button class="ghost-action" data-page-action="next" type="button" ${state.currentPage >= totalPages ? "disabled" : ""}>下一页</button>
    </div>
  `;
}

function resetPage() {
  state.currentPage = 1;
}

function updateFilterLocationCenter() {
  const city = els.citySelect.value;
  const district = els.districtSelect.value;
  const matching = [
    ...state.restaurants,
    ...state.slaughterhouses
  ].filter((item) => {
    if (city && item.city !== city) return false;
    if (district && item.district !== district) return false;
    return Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lng));
  });
  const center = averageCenter(matching) || (city ? cityCenters[city] : null);
  if (!center) return;
  setLocationCenter(center, [city, district].filter(Boolean).join(" · ") || city);
}

function loadAmapIfConfigured() {
  return new Promise((resolve) => {
    if (!mapConfig.amapKey) {
      resolve(false);
      return;
    }
    if (window.AMap) {
      state.amapReady = true;
      resolve(true);
      return;
    }
    if (mapConfig.amapSecurityCode) {
      window._AMapSecurityConfig = { securityJsCode: mapConfig.amapSecurityCode };
    }
    const script = document.createElement("script");
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(mapConfig.amapKey)}&plugin=AMap.PlaceSearch,AMap.Geocoder,AMap.Scale,AMap.ToolBar`;
    script.onload = () => {
      state.amapReady = Boolean(window.AMap);
      resolve(state.amapReady);
    };
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

function clearAmapMarkers() {
  if (!state.amap) return;
  state.amap.remove(state.amapMarkers);
  state.amapMarkers = [];
}

function amapMarkerContent(index, kind = "merchant") {
  const label = kind === "user" ? "" : index;
  return `<div class="${kind === "user" ? "amap-user-marker" : "amap-halal-marker"}"><span>${label}</span></div>`;
}

function renderAmapMap(items, center, regionName) {
  if (!state.amapReady || !window.AMap) return false;
  els.mapCanvas.innerHTML = `
    <div id="amapMap" class="leaflet-map"></div>
    <div class="region-map-title">
      <span>${state.userLocation ? "当前定位 / 当前区域" : "当前区域"}</span>
      <strong>${escapeHtml(regionName)}</strong>
      <p>${items.length} 个标记 · 高德地图</p>
    </div>
  `;

  state.amap = new AMap.Map("amapMap", {
    zoom: state.userLocation ? 13 : els.citySelect.value ? 12 : 4,
    center: [center.lng, center.lat],
    viewMode: "2D"
  });
  state.amap.addControl(new AMap.Scale());
  state.amap.addControl(new AMap.ToolBar({ position: { right: "10px", top: "70px" } }));
  clearAmapMarkers();

  const points = [];
  const type = state.view === "sources" ? "sources" : state.view === "slaughterhouses" ? "slaughterhouses" : "restaurants";
  items.forEach((item, index) => {
    const lat = Number(item.lat);
    const lng = Number(item.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const marker = new AMap.Marker({
      position: [lng, lat],
      content: amapMarkerContent(index + 1),
      anchor: "bottom-center",
      extData: { id: item.id, type }
    });
    marker.on("click", () => openDetailPage(type, item.id));
    state.amap.add(marker);
    state.amapMarkers.push(marker);
    points.push([lng, lat]);
  });

  if (state.userLocation) {
    const marker = new AMap.Marker({
      position: [state.userLocation.lng, state.userLocation.lat],
      content: amapMarkerContent("", "user"),
      anchor: "bottom-center",
      zIndex: 200
    });
    marker.setTitle(state.userLocationLabel || "定位中心");
    state.amap.add(marker);
    state.amapMarkers.push(marker);
    points.push([state.userLocation.lng, state.userLocation.lat]);
  }

  if (state.userLocation) {
    state.amap.setZoomAndCenter(13, [state.userLocation.lng, state.userLocation.lat]);
  } else if (points.length > 1) {
    state.amap.setFitView(state.amapMarkers, false, [50, 40, 40, 40], 13);
  }
  return true;
}

function clearLeafletMarkers() {
  if (!state.map) return;
  state.mapMarkers.forEach((marker) => marker.remove());
  state.mapMarkers = [];
}

function leafletIcon(index) {
  return L.divIcon({
    className: "halal-map-marker",
    html: `<span>${index}</span>`,
    iconSize: [34, 42],
    iconAnchor: [17, 42],
    popupAnchor: [0, -38]
  });
}

function userLocationIcon() {
  return L.divIcon({
    className: "user-location-marker",
    html: `<span></span>`,
    iconSize: [34, 42],
    iconAnchor: [17, 42],
    popupAnchor: [0, -38]
  });
}

function renderLeafletMap(items, center, regionName) {
  if (!window.L) return false;

  els.mapCanvas.innerHTML = `
    <div id="leafletMap" class="leaflet-map"></div>
    <div class="region-map-title">
      <span>${state.userLocation ? "当前定位 / 当前区域" : "当前区域"}</span>
      <strong>${escapeHtml(regionName)}</strong>
      <p>${items.length} 个标记 · 地图标记随比例尺缩放</p>
    </div>
  `;

  state.map = L.map("leafletMap", {
    zoomControl: true,
    attributionControl: true
  }).setView([center.lat, center.lng], els.citySelect.value || state.userLocation ? 12 : 4);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(state.map);

  clearLeafletMarkers();
  const bounds = [];
  items.forEach((item, index) => {
    const lat = Number(item.lat);
    const lng = Number(item.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const type = state.view === "sources" ? "sources" : state.view === "slaughterhouses" ? "slaughterhouses" : "restaurants";
    const marker = L.marker([lat, lng], { icon: leafletIcon(index + 1) })
      .addTo(state.map)
      .bindPopup(`<strong>${escapeHtml(item.name)}</strong><br>${escapeHtml([item.city, item.district].filter(Boolean).join(" · "))}<br><button class="popup-detail" data-popup-type="${type}" data-popup-id="${item.id}" type="button">查看详情</button>`);
    state.mapMarkers.push(marker);
    bounds.push([lat, lng]);
  });

  if (state.userLocation) {
    const label = state.userLocationLabel || "当前定位点";
    const marker = L.marker([state.userLocation.lat, state.userLocation.lng], { icon: userLocationIcon(), zIndexOffset: 1000 })
      .addTo(state.map)
      .bindPopup(`<strong>${escapeHtml(label)}</strong><br>定位中心`);
    state.mapMarkers.push(marker);
    bounds.push([state.userLocation.lat, state.userLocation.lng]);
  }

  if (bounds.length > 1) {
    state.map.fitBounds(bounds, { padding: [26, 26], maxZoom: 13 });
  }

  setTimeout(() => state.map.invalidateSize(), 0);
  return true;
}

function api(path) {
  if (state.staticMode && path.startsWith("/api/")) return staticApi(path);
  return fetch(path).then((response) => {
    if (!response.ok) throw new Error(`API ${response.status}`);
    return response.json();
  }).catch((error) => {
    if (path.startsWith("/api/")) return staticApi(path);
    throw error;
  });
}

function apiJson(path, method, body) {
  if (state.staticMode && path.startsWith("/api/")) return staticApiJson(path, method, body);
  return fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }).then(async (response) => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || `API ${response.status}`);
    return data;
  }).catch((error) => {
    if (path.startsWith("/api/")) return staticApiJson(path, method, body);
    throw error;
  });
}

async function loadStaticDb() {
  if (state.staticDb) return state.staticDb;
  state.staticMode = true;
  const response = await fetch("db/halal-directory.json", { cache: "no-store" });
  if (!response.ok) throw new Error("静态数据文件未找到");
  const base = await response.json();
  const draft = JSON.parse(localStorage.getItem(staticDraftKey) || "{}");
  state.staticDb = {
    ...base,
    restaurants: draft.restaurants || base.restaurants || [],
    sources: draft.sources || base.sources || [],
    slaughterhouses: draft.slaughterhouses || base.slaughterhouses || []
  };
  return state.staticDb;
}

function saveStaticDb(db) {
  state.staticDb = db;
  localStorage.setItem(staticDraftKey, JSON.stringify({
    restaurants: db.restaurants,
    sources: db.sources,
    slaughterhouses: db.slaughterhouses
  }));
}

function listStaticMeta(db) {
  const catalog = db.cityCatalog || [];
  const provinces = [...new Set(catalog.map((item) => item.province).filter(Boolean))];
  const dataCities = [
    ...db.restaurants.map((item) => item.city),
    ...db.sources.map((item) => item.city),
    ...db.slaughterhouses.map((item) => item.city)
  ].filter(Boolean);
  const cities = [...new Set([...catalog.map((item) => item.city), ...dataCities])];
  const districts = [
    ...catalog.flatMap((item) => (item.districts || []).map((district) => ({ city: item.city, district }))),
    ...[...new Set([
      ...db.restaurants.map((item) => `${item.city}:${item.district}`),
      ...db.slaughterhouses.map((item) => `${item.city}:${item.district}`)
    ].filter((value) => value && !value.endsWith(":")))]
      .map((value) => {
        const [city, district] = value.split(":");
        return { city, district };
      })
  ];
  const cuisines = [...new Set([
    ...(db.cuisineCategories || []),
    ...db.restaurants.flatMap((item) => String(item.cuisine || "").split(/[\/,，、]/).map((part) => part.trim()).filter(Boolean))
  ])];
  return {
    provinces,
    cityCatalog: catalog,
    cities,
    districts: [...new Map(districts.map((item) => [`${item.city}:${item.district}`, item])).values()],
    cuisines,
    certificationLevels: db.certificationLevels || [],
    sourceTypes: db.sourceTypes || [],
    stats: {
      restaurants: db.restaurants.length,
      slaughterhouses: db.slaughterhouses.length,
      verifiedSources: db.sources.length
    }
  };
}

function textIncludes(value, query) {
  return String(value || "").toLowerCase().includes(String(query || "").toLowerCase());
}

function staticCuisineMatches(value, cuisine) {
  if (!cuisine) return true;
  return String(value || "").split(/[\/,，、]/).some((part) => part.trim() === cuisine) || textIncludes(value, cuisine);
}

function staticRestaurantMatches(item, params) {
  const province = params.get("province");
  const city = params.get("city");
  const district = params.get("district");
  const q = params.get("q");
  const certification = params.get("certification");
  const sourceType = params.get("sourceType");
  const cuisine = params.get("cuisine");
  if (province && item.province !== province) return false;
  if (city && item.city !== city) return false;
  if (district && item.district !== district) return false;
  if (certification && item.certificationLevel !== certification) return false;
  if (sourceType && item.sourceType !== sourceType) return false;
  if (!staticCuisineMatches(item.cuisine, cuisine)) return false;
  if (!q) return true;
  return [item.name, item.city, item.district, item.address, item.cuisine, item.summary, ...(item.tags || [])]
    .some((text) => textIncludes(text, q));
}

function normalizeStaticItem(type, body, existing = {}) {
  const item = { ...existing, ...body };
  if (type === "restaurants") {
    item.province = body.province || existing.province || "";
    item.avgPrice = Number(body.avgPrice || existing.avgPrice || 50);
    item.rating = Number(body.rating || existing.rating || 4.5);
    item.openNow = Boolean(body.openNow ?? existing.openNow ?? true);
    item.tags = Array.isArray(body.tags)
      ? body.tags
      : String(body.tags || existing.tags?.join(",") || "").split(/[,，]/).map((tag) => tag.trim()).filter(Boolean);
  }
  if (type === "sources") {
    item.menu = Array.isArray(body.menu) ? body.menu : String(body.menu || "").split(/[\n,，]/).map((line) => line.trim()).filter(Boolean);
  }
  if (type === "slaughterhouses") {
    item.requirements = Array.isArray(body.requirements)
      ? body.requirements
      : String(body.requirements || "").split(/[,，]/).map((line) => line.trim()).filter(Boolean);
    item.menu = Array.isArray(body.menu) ? body.menu : String(body.menu || "").split(/[\n,，]/).map((line) => line.trim()).filter(Boolean);
  }
  return item;
}

async function staticApi(path) {
  const db = await loadStaticDb();
  const url = new URL(path, window.location.origin);
  const params = url.searchParams;
  if (url.pathname === "/api/meta") return listStaticMeta(db);
  if (url.pathname === "/api/restaurants") {
    const items = db.restaurants
      .filter((item) => staticRestaurantMatches(item, params))
      .map((item) => ({ ...item, source: db.sources.find((source) => source.id === item.sourceId) || null }));
    return { items, total: items.length };
  }
  if (url.pathname === "/api/sources") {
    const items = db.sources.filter((item) => {
      if (params.get("province") && item.province !== params.get("province")) return false;
      if (params.get("city") && item.city !== params.get("city")) return false;
      const q = params.get("q");
      return !q || [item.name, item.city, item.sourceType, item.certifier, item.certificateNo, item.traceability].some((text) => textIncludes(text, q));
    });
    return { items, total: items.length };
  }
  if (url.pathname === "/api/slaughterhouses") {
    const items = db.slaughterhouses.filter((item) => {
      if (params.get("province") && item.province !== params.get("province")) return false;
      if (params.get("city") && item.city !== params.get("city")) return false;
      if (params.get("district") && item.district !== params.get("district")) return false;
      const q = params.get("q");
      return !q || [item.name, item.city, item.district, item.address, item.auditor].some((text) => textIncludes(text, q));
    });
    return { items, total: items.length };
  }
  if (url.pathname.startsWith("/api/restaurants/")) {
    const id = decodeURIComponent(url.pathname.split("/").pop());
    const item = db.restaurants.find((restaurant) => restaurant.id === id);
    if (!item) throw new Error("Restaurant not found");
    return {
      item,
      source: db.sources.find((source) => source.id === item.sourceId) || null,
      nearbySlaughterhouses: db.slaughterhouses.filter((slaughterhouse) => slaughterhouse.city === item.city)
    };
  }
  if (url.pathname.startsWith("/api/detail/")) {
    const [, , , type, id] = url.pathname.split("/");
    const collection = db[type];
    if (!collection) throw new Error("Detail type not found");
    const item = collection.find((entry) => entry.id === decodeURIComponent(id));
    if (!item) throw new Error("Detail item not found");
    return {
      type,
      item,
      source: type === "restaurants" ? db.sources.find((source) => source.id === item.sourceId) || null : null,
      relatedRestaurants: type === "sources" ? db.restaurants.filter((restaurant) => restaurant.sourceId === item.id) : []
    };
  }
  if (url.pathname === "/api/navigation") {
    const destinationId = params.get("destinationId");
    const destination = db.restaurants.find((item) => item.id === destinationId)
      || db.slaughterhouses.find((item) => item.id === destinationId);
    if (!destination) throw new Error("Destination not found");
    const provider = params.get("provider") || "amap";
    const encodedName = encodeURIComponent(destination.name);
    const links = {
      amap: `https://uri.amap.com/marker?position=${destination.lng},${destination.lat}&name=${encodedName}`,
      baidu: `https://api.map.baidu.com/marker?location=${destination.lat},${destination.lng}&title=${encodedName}&output=html`,
      google: `https://www.google.com/maps/search/?api=1&query=${destination.lat},${destination.lng}`
    };
    return { provider, destination, url: links[provider] || links.amap };
  }
  throw new Error("静态页面不支持该接口");
}

async function staticApiJson(path, method, body) {
  const db = await loadStaticDb();
  const url = new URL(path, window.location.origin);
  const type = url.pathname.includes("/restaurants") ? "restaurants"
    : url.pathname.includes("/sources") ? "sources"
      : url.pathname.includes("/slaughterhouses") ? "slaughterhouses" : "";
  if (!type) throw new Error("静态页面不支持该接口");
  const collection = db[type];
  const id = decodeURIComponent(url.pathname.split("/").pop());
  if (method === "POST") {
    const prefix = type === "restaurants" ? "rst" : type === "sources" ? "src" : "sl";
    const item = normalizeStaticItem(type, body, { id: `${prefix}-local-${Date.now().toString(36)}` });
    collection.unshift(item);
    saveStaticDb(db);
    return { item };
  }
  const index = collection.findIndex((item) => item.id === id);
  if (index === -1) throw new Error("条目不存在");
  if (method === "PUT") {
    collection[index] = normalizeStaticItem(type, body, collection[index]);
    saveStaticDb(db);
    return { item: collection[index] };
  }
  if (method === "DELETE") {
    const [item] = collection.splice(index, 1);
    saveStaticDb(db);
    return { item };
  }
  throw new Error("静态页面不支持该操作");
}

function setOptions(select, options, placeholder, mapper = (item) => [item, item]) {
  if (!select) return;
  const html = [`<option value="">${placeholder}</option>`]
    .concat(options.map((item) => {
      const [value, label] = mapper(item);
      return `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
    }))
    .join("");
  select.innerHTML = html;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[char]);
}

function paramsFromSearchFilters() {
  const params = new URLSearchParams();
  if (els.provinceSelect.value) params.set("province", els.provinceSelect.value);
  if (els.citySelect.value) params.set("city", els.citySelect.value);
  if (els.districtSelect.value) params.set("district", els.districtSelect.value);
  if (els.cuisineSelect.value) params.set("cuisine", els.cuisineSelect.value);
  if (els.searchInput.value.trim()) params.set("q", els.searchInput.value.trim());
  return params;
}

function paramsFromDirectoryFilters(includeCuisine = false) {
  const params = new URLSearchParams();
  if (els.provinceSelect.value) params.set("province", els.provinceSelect.value);
  if (els.citySelect.value) params.set("city", els.citySelect.value);
  if (els.districtSelect.value) params.set("district", els.districtSelect.value);
  if (includeCuisine && els.cuisineSelect.value) params.set("cuisine", els.cuisineSelect.value);
  if (els.searchInput.value.trim()) params.set("q", els.searchInput.value.trim());
  return params;
}

async function loadMeta() {
  state.meta = await api("/api/meta");
  setOptions(els.provinceSelect, state.meta.provinces || [], "全部省份");
  updateCities();
  setOptions(els.certSelect, state.meta.certificationLevels, "全部级别", (item) => [item.id, item.label]);
  setOptions(els.sourceTypeSelect, state.meta.sourceTypes, "全部来源", (item) => [item.id, item.label]);
  setOptions(els.cuisineSelect, state.meta.cuisines || [], "全部菜系");
  setOptions(els.adminCertSelect, state.meta.certificationLevels, "选择合规级别", (item) => [item.id, item.label]);
  setOptions(els.adminSourceTypeSelect, state.meta.sourceTypes, "选择来源类型", (item) => [item.id, item.label]);
  setOptions(els.sourceFormTypeSelect, state.meta.sourceTypes, "选择来源类型", (item) => [item.id, item.label]);
  await loadAdminSources();
  initAdminLocationSelects();
  updateDistricts();
  if (els.restaurantCount) els.restaurantCount.textContent = state.meta.stats.restaurants;
  if (els.sourceCount) els.sourceCount.textContent = state.meta.stats.verifiedSources;
  if (els.slaughterhouseCount) els.slaughterhouseCount.textContent = state.meta.stats.slaughterhouses;
  els.apiStatus.textContent = state.staticMode ? "静态数据" : "已连接";
}

function updateDistricts() {
  const city = els.citySelect.value;
  if (!city) {
    els.districtSelect.innerHTML = `<option value="">请先选择城市</option>`;
    els.districtSelect.disabled = true;
    return;
  }
  els.districtSelect.disabled = false;
  const districts = state.meta.districts
    .filter((item) => item.city === city)
    .map((item) => item.district);
  setOptions(els.districtSelect, [...new Set(districts)], "全部行政区");
}

function updateCities() {
  const province = els.provinceSelect.value;
  const catalog = state.meta.cityCatalog || [];
  const cities = catalog
    .filter((item) => !province || item.province === province)
    .map((item) => item.city);
  setOptions(els.citySelect, [...new Set(cities.length ? cities : state.meta.cities)], "全部城市");
  updateDistricts();
}

function setAdminSelectOptions(select, options, placeholder) {
  select.innerHTML = [`<option value="">${placeholder}</option>`]
    .concat(options.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`))
    .join("");
}

function updateAdminCities(type) {
  const form = {
    restaurants: els.restaurantForm,
    sources: els.sourceForm,
    slaughterhouses: els.slaughterhouseForm
  }[type];
  if (!form || !state.meta) return;
  const province = form.elements.province.value;
  const cities = (state.meta.cityCatalog || [])
    .filter((item) => !province || item.province === province)
    .map((item) => item.city);
  setAdminSelectOptions(form.elements.city, [...new Set(cities)], "选择城市");
  updateAdminDistricts(type);
}

function updateAdminDistricts(type) {
  const form = {
    restaurants: els.restaurantForm,
    sources: els.sourceForm,
    slaughterhouses: els.slaughterhouseForm
  }[type];
  if (!form || !state.meta) return;
  const city = form.elements.city.value;
  if (!city) {
    form.elements.district.innerHTML = `<option value="">请先选择城市</option>`;
    form.elements.district.disabled = true;
    return;
  }
  form.elements.district.disabled = false;
  const districts = (state.meta.cityCatalog || []).find((item) => item.city === city)?.districts || [];
  setAdminSelectOptions(form.elements.district, districts, "选择区域");
}

function initAdminLocationSelects() {
  ["restaurants", "sources", "slaughterhouses"].forEach((type) => {
    const form = {
      restaurants: els.restaurantForm,
      sources: els.sourceForm,
      slaughterhouses: els.slaughterhouseForm
    }[type];
    if (!form?.elements.province) return;
    setAdminSelectOptions(form.elements.province, state.meta.provinces || [], "选择省份");
    updateAdminCities(type);
  });
}

function requestCurrentLocation() {
  if (!navigator.geolocation) {
    state.locationStatus = "浏览器不支持定位";
    updateLocationStatus();
    renderMap(state.restaurants);
    return;
  }
  state.locationStatus = "正在获取当前位置";
  updateLocationStatus();
  navigator.geolocation.getCurrentPosition((position) => {
    state.userLocation = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };
    state.userLocationLabel = "当前位置";
    state.locationStatus = "已使用当前定位";
    updateLocationStatus();
    els.provinceSelect.value = "";
    updateCities();
    els.citySelect.value = "";
    updateDistricts();
    refresh();
  }, () => {
    state.locationStatus = "定位未授权，显示筛选区域地图";
    updateLocationStatus();
    renderMap(state.restaurants);
  }, {
    enableHighAccuracy: true,
    timeout: 8000,
    maximumAge: 300000
  });
}

async function searchLocationPoint() {
  const query = els.locationInput.value.trim();
  if (!query) return;
  els.locationSearchButton.textContent = "查询中";
  try {
    if (state.amapReady && window.AMap) {
      const point = await searchAmapLocation(query);
      if (point) {
        state.userLocation = point;
        state.userLocationLabel = query;
        state.locationStatus = `已定位到：${query}`;
        updateLocationStatus();
        els.provinceSelect.value = "";
        updateCities();
        els.citySelect.value = "";
        updateDistricts();
        await refresh();
        els.locationSearchButton.textContent = "定位查询";
        return;
      }
    }
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`, {
      headers: { "Accept": "application/json" }
    });
    const data = await response.json();
    if (!data.length) {
      els.locationSearchButton.textContent = "未找到";
      setTimeout(() => { els.locationSearchButton.textContent = "定位查询"; }, 1400);
      return;
    }
    state.userLocation = {
      lat: Number(data[0].lat),
      lng: Number(data[0].lon)
    };
    state.userLocationLabel = query;
    state.locationStatus = `已定位到：${query}`;
    updateLocationStatus();
    els.provinceSelect.value = "";
    updateCities();
    els.citySelect.value = "";
    updateDistricts();
    await refresh();
    els.locationSearchButton.textContent = "定位查询";
  } catch (error) {
    els.locationSearchButton.textContent = "失败";
    setTimeout(() => { els.locationSearchButton.textContent = "定位查询"; }, 1400);
  }
}

function searchAmapLocation(query) {
  return new Promise((resolve) => {
    const city = els.citySelect.value || "全国";
    const placeSearch = new AMap.PlaceSearch({
      city,
      pageSize: 1,
      extensions: "base"
    });
    placeSearch.search(query, (status, result) => {
      const poi = result?.poiList?.pois?.[0];
      if (status === "complete" && poi?.location) {
        resolve({ lat: poi.location.lat, lng: poi.location.lng });
        return;
      }
      const geocoder = new AMap.Geocoder({ city });
      geocoder.getLocation(query, (geoStatus, geoResult) => {
        const location = geoResult?.geocodes?.[0]?.location;
        if (geoStatus === "complete" && location) {
          resolve({ lat: location.lat, lng: location.lng });
          return;
        }
        resolve(null);
      });
    });
  });
}

async function loadRestaurants() {
  const params = state.view === "search" ? paramsFromSearchFilters() : paramsFromDirectoryFilters(true);
  const data = await api(`/api/restaurants?${params.toString()}`);
  state.restaurants = data.items;
  state.selected = data.items[0] || null;
  renderRestaurants(data.items);
  renderMap(data.items);
}

async function loadAdminSources() {
  const data = await api("/api/sources");
  state.sources = data.items;
  setOptions(els.adminSourceSelect, data.items, "选择肉源记录", (item) => [item.id, `${item.city} · ${item.name}`]);
}

async function loadSources() {
  const params = state.view === "search" ? paramsFromSearchFilters() : paramsFromDirectoryFilters();
  const data = await api(`/api/sources?${params.toString()}`);
  state.sources = data.items;
  renderSources(data.items);
  renderMap(data.items);
}

async function loadSlaughterhouses() {
  const params = state.view === "search" ? paramsFromSearchFilters() : paramsFromDirectoryFilters();
  const data = await api(`/api/slaughterhouses?${params.toString()}`);
  state.slaughterhouses = data.items;
  renderSlaughterhouses(data.items);
  renderMap(data.items);
}

async function setView(view) {
  if (view === "admin" && !requestAdminAccess()) return;
  resetPage();
  state.view = view;
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  const labels = {
    search: ["定位搜索", "附近清真餐厅"],
    restaurants: ["餐厅目录", "附近清真餐厅"],
    sources: ["肉源核验", "合规来源记录"],
    slaughterhouses: ["屠宰场", "合规屠宰场档案"],
    admin: ["管理员", "主页展示内容管理"]
  };
  els.viewKicker.textContent = labels[view][0];
  els.viewTitle.textContent = labels[view][1];
  els.adminArea.hidden = view !== "admin";
  els.contentGrid.classList.toggle("admin-mode", view === "admin");
  els.contentGrid.classList.toggle("search-mode", view === "search");
  if (els.searchBand) els.searchBand.hidden = view !== "search";
  if (els.statsStrip) els.statsStrip.hidden = true;
  await refresh();
}

function requestAdminAccess() {
  if (sessionStorage.getItem("halalAdminUnlocked") === "true") return true;
  const password = window.prompt("请输入管理员密码");
  if (password === null) return false;
  if (password.trim() === ADMIN_PASSWORD) {
    sessionStorage.setItem("halalAdminUnlocked", "true");
    return true;
  }
  window.alert("管理员密码不正确");
  return false;
}

async function refresh() {
  if (state.view === "search") await loadRestaurants();
  if (state.view === "restaurants") await loadRestaurants();
  if (state.view === "sources") await loadSources();
  if (state.view === "slaughterhouses") await loadSlaughterhouses();
  if (state.view === "admin") await loadAdmin();
}

function renderRestaurants(items) {
  const sortedItems = sortByDistance(items);
  const { pageItems, totalPages } = paginate(sortedItems);
  els.resultTotal.textContent = `${items.length} 家`;
  if (!sortedItems.length) {
    els.resultsList.innerHTML = `<div class="empty-state">没有找到匹配的清真餐厅，可以调整城市、行政区、菜系或关键词。</div>`;
    return;
  }
  els.resultsList.innerHTML = pageItems.map((item, index) => `
    <article class="result-card">
      <div class="thumb" style="--thumb-image: ${thumbImages[index % thumbImages.length]}">
        ${coverMarkup(item, "restaurants", item.name)}
      </div>
      <div class="result-body">
        <div class="card-title-line">
          <h3>${escapeHtml(item.name)}</h3>
          <span class="badge ${item.certificationLevel === "strict" ? "gold" : ""}">${certLabel[item.certificationLevel]}</span>
        </div>
        <div class="card-meta">
          <strong>${item.rating.toFixed(1)} 分</strong>
          <span>${escapeHtml(item.cuisine)}</span>
          <span>人均 ¥${item.avgPrice}</span>
          <span>${escapeHtml(formatDistance(item))}</span>
          <span>${item.openNow ? "营业中" : "休息中"}</span>
        </div>
        <p class="summary">${escapeHtml(item.summary)}</p>
        <div class="tag-row">${item.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
        <div class="card-actions">
          <button class="ghost-action" data-detail="${item.id}" type="button">查看详情</button>
          <button class="text-action" data-nav="${item.id}" type="button">导航</button>
          ${state.view === "admin" ? `
            <button class="text-action" data-edit="${item.id}" type="button">编辑</button>
            <button class="danger-action" data-delete="${item.id}" type="button">删除</button>
          ` : ""}
        </div>
      </div>
    </article>
  `).join("") + renderPagination(sortedItems.length, totalPages);
}

async function loadAdmin() {
  if (state.activeAdminType === "restaurants") {
    const data = await api("/api/restaurants");
    state.restaurants = data.items;
    renderRestaurants(data.items);
    els.resultTotal.textContent = `${data.items.length} 条`;
  }
  if (state.activeAdminType === "sources") {
    const data = await api("/api/sources");
    state.sources = data.items;
    renderSources(data.items);
    els.resultTotal.textContent = `${data.items.length} 条`;
  }
  if (state.activeAdminType === "slaughterhouses") {
    const data = await api("/api/slaughterhouses");
    state.slaughterhouses = data.items;
    renderSlaughterhouses(data.items);
    els.resultTotal.textContent = `${data.items.length} 处`;
  }
}

function renderSources(items) {
  const sortedItems = sortByDistance(items);
  const { pageItems, totalPages } = paginate(sortedItems);
  els.resultTotal.textContent = `${items.length} 条`;
  els.resultsList.innerHTML = sortedItems.length ? `
    <div class="source-table">
      ${pageItems.map((item) => `
        <article class="source-row">
          <div class="source-thumb">
            ${coverMarkup(item, "sources", item.name)}
          </div>
          <div>
            <h3>${escapeHtml(item.name)}</h3>
            <p>${escapeHtml(item.traceability)}</p>
            <p>${escapeHtml(item.certifier)} · ${escapeHtml(item.certificateNo)}</p>
            <div class="card-actions">
              <button class="ghost-action" data-detail-source="${item.id}" type="button">查看详情</button>
            </div>
            ${state.view === "admin" ? `
              <div class="card-actions">
                <button class="text-action" data-edit-source="${item.id}" type="button">编辑</button>
                <button class="danger-action" data-delete-source="${item.id}" type="button">删除</button>
              </div>
            ` : ""}
          </div>
          <span class="badge">${escapeHtml(item.validUntil)} 到期</span>
        </article>
      `).join("")}
    </div>
    ${renderPagination(sortedItems.length, totalPages)}
  ` : `<div class="empty-state">当前城市暂无肉源核验记录。</div>`;
}

function renderSlaughterhouses(items) {
  const sortedItems = sortByDistance(items);
  const { pageItems, totalPages } = paginate(sortedItems);
  els.resultTotal.textContent = `${items.length} 处`;
  els.resultsList.innerHTML = sortedItems.length ? `
    <div class="source-table">
      ${pageItems.map((item) => `
        <article class="source-row">
          <div class="source-thumb">
            ${coverMarkup(item, "slaughterhouses", item.name)}
          </div>
          <div>
            <h3>${escapeHtml(item.name)}</h3>
            <p>${escapeHtml(item.city)} · ${escapeHtml(item.district)} · ${escapeHtml(item.address)}</p>
            <p>最近审核：${escapeHtml(item.lastAudit)} · ${escapeHtml(item.auditor)}</p>
            <div class="card-actions">
              <button class="ghost-action" data-detail-slaughterhouse="${item.id}" type="button">查看详情</button>
            </div>
            ${state.view === "admin" ? `
              <div class="card-actions">
                <button class="text-action" data-edit-slaughterhouse="${item.id}" type="button">编辑</button>
                <button class="danger-action" data-delete-slaughterhouse="${item.id}" type="button">删除</button>
              </div>
            ` : ""}
          </div>
          <span class="badge ${item.status === "合规" ? "" : "muted"}">${escapeHtml(item.status)}</span>
        </article>
      `).join("")}
    </div>
    ${renderPagination(sortedItems.length, totalPages)}
  ` : `<div class="empty-state">当前城市暂无屠宰场档案。</div>`;
}

function renderMap(items) {
  const regionItems = items || [];
  const province = els.provinceSelect.value;
  const city = els.citySelect.value;
  const district = els.districtSelect.value;
  const usingCurrentLocation = !province && !city && !district && state.userLocation;
  const regionName = usingCurrentLocation ? "当前位置 10 公里范围" : ([province, city, district].filter(Boolean).join(" · ") || "全国");
  const countLabel = state.view === "slaughterhouses" ? "处档案" : state.view === "sources" ? "条记录" : "家商户";
  const visibleItems = regionItems.slice(0, 20);
  const center = usingCurrentLocation ? state.userLocation : mapCenterFor(regionItems);
  if (renderAmapMap(visibleItems, center, regionName)) {
    els.detailPanel.innerHTML = `
      <div class="reserved-panel">
        <h3>预留功能区</h3>
        <p>后续可用于区域公告、地图工具、推荐内容或筛选说明。</p>
      </div>
    `;
    return;
  }
  if (renderLeafletMap(visibleItems, center, regionName)) {
    els.detailPanel.innerHTML = `
      <div class="reserved-panel">
        <h3>预留功能区</h3>
        <p>后续可用于区域公告、地图工具、推荐内容或筛选说明。</p>
      </div>
    `;
    return;
  }
  const latValues = visibleItems.map((item) => Number(item.lat)).filter(Number.isFinite);
  const lngValues = visibleItems.map((item) => Number(item.lng)).filter(Number.isFinite);
  const minLat = Math.min(...latValues, center.lat - 0.01);
  const maxLat = Math.max(...latValues, center.lat + 0.01);
  const minLng = Math.min(...lngValues, center.lng - 0.01);
  const maxLng = Math.max(...lngValues, center.lng + 0.01);
  const latRange = maxLat - minLat || 1;
  const lngRange = maxLng - minLng || 1;

  els.mapCanvas.innerHTML = `
    <iframe class="real-map-frame" title="${escapeHtml(regionName)}地图" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${osmEmbedUrl(center)}"></iframe>
    <div class="region-map-title">
      <span>${usingCurrentLocation ? "当前定位" : "当前区域"}</span>
      <strong>${escapeHtml(regionName)}</strong>
      <p>${regionItems.length} ${countLabel} · 约 10 公里比例尺</p>
    </div>
    ${visibleItems.map((item, index) => {
      const lat = Number(item.lat);
      const lng = Number(item.lng);
      const x = Number.isFinite(lng) ? 8 + ((lng - minLng) / lngRange) * 84 : 12 + ((index * 29) % 76);
      const y = Number.isFinite(lat) ? 88 - ((lat - minLat) / latRange) * 76 : 22 + ((index * 41) % 58);
      return `<button class="map-pin" style="left:${x}%;top:${y}%;" data-pin="${item.id}" title="${escapeHtml(item.name)}" type="button"><span>${index + 1}</span></button>`;
    }).join("")}
  `;

  els.detailPanel.innerHTML = `
    <div class="reserved-panel">
      <h3>预留功能区</h3>
      <p>后续可用于区域公告、地图工具、推荐内容或筛选说明。</p>
    </div>
  `;
}

async function renderDetail(item) {
  if (!item) {
    renderEntityDetail(null);
    return;
  }

  const data = await api(`/api/restaurants/${item.id}`);
  const source = data.source;
  renderEntityDetail(data.item, "restaurants", {
    source,
    menu: data.item.menu?.length ? data.item.menu : [data.item.cuisine, `人均 ¥${data.item.avgPrice}`].filter(Boolean)
  });
}

async function openNavigation(id) {
  const provider = els.mapProvider.value;
  const data = await api(`/api/navigation?destinationId=${encodeURIComponent(id)}&provider=${provider}`);
  window.open(data.url, "_blank", "noopener,noreferrer");
}

function fillRestaurantForm(item) {
  const form = els.restaurantForm;
  state.editingId = item.id;
  els.adminFormTitle.textContent = "编辑主页餐厅条目";
  form.elements.id.value = item.id;
  form.elements.coverImage.value = item.coverImage || "";
  setGalleryValue(form, "environmentPhotos", item.environmentPhotos || []);
  setGalleryValue(form, "certificatePhotos", item.certificatePhotos || []);
  form.elements.name.value = item.name || "";
  form.elements.province.value = item.province || "";
  updateAdminCities("restaurants");
  form.elements.city.value = item.city || "";
  updateAdminDistricts("restaurants");
  form.elements.district.value = item.district || "";
  form.elements.address.value = item.address || "";
  form.elements.phone.value = item.phone || "";
  form.elements.cuisine.value = item.cuisine || "";
  form.elements.avgPrice.value = item.avgPrice ?? "";
  form.elements.rating.value = item.rating ?? "";
  form.elements.openNow.value = String(Boolean(item.openNow));
  form.elements.certificationLevel.value = item.certificationLevel || "verified";
  form.elements.sourceType.value = item.sourceType || "supplier";
  form.elements.sourceId.value = item.sourceId || "";
  form.elements.summary.value = item.summary || "";
  renderMenuEditor("restaurants", menuArrayToRows(item.menu || []));
  syncRestaurantMenuField();
  form.elements.tags.value = (item.tags || []).join(", ");
  setCoverPreview("restaurants", item.coverImage || "");
  setGalleryPreview("restaurants-environment", item.environmentPhotos || []);
  setGalleryPreview("restaurants-certificate", item.certificatePhotos || []);
  els.adminMessage.textContent = "正在编辑现有条目";
}

function resetRestaurantForm() {
  state.editingId = "";
  els.restaurantForm.reset();
  els.restaurantForm.elements.id.value = "";
  els.restaurantForm.elements.coverImage.value = "";
  setGalleryValue(els.restaurantForm, "environmentPhotos", []);
  setGalleryValue(els.restaurantForm, "certificatePhotos", []);
  els.restaurantForm.elements.openNow.value = "true";
  els.restaurantForm.elements.certificationLevel.value = "verified";
  els.restaurantForm.elements.sourceType.value = "supplier";
  initAdminLocationSelects();
  renderMenuEditor("restaurants", []);
  syncRestaurantMenuField();
  if (state.activeAdminType === "restaurants") {
    els.adminFormTitle.textContent = "新增主页餐厅条目";
  }
  setCoverPreview("restaurants", "");
  setGalleryPreview("restaurants-environment", []);
  setGalleryPreview("restaurants-certificate", []);
  els.adminMessage.textContent = "";
}

function fillSourceForm(item) {
  const form = els.sourceForm;
  state.editingId = item.id;
  els.adminFormTitle.textContent = "编辑肉源核验条目";
  form.elements.id.value = item.id;
  form.elements.coverImage.value = item.coverImage || "";
  setGalleryValue(form, "environmentPhotos", item.environmentPhotos || []);
  setGalleryValue(form, "certificatePhotos", item.certificatePhotos || []);
  form.elements.name.value = item.name || "";
  form.elements.province.value = item.province || "";
  updateAdminCities("sources");
  form.elements.city.value = item.city || "";
  updateAdminDistricts("sources");
  form.elements.district.value = item.district || "";
  form.elements.address.value = item.address || "";
  form.elements.phone.value = item.phone || "";
  form.elements.sourceType.value = item.sourceType || "supplier";
  form.elements.certifier.value = item.certifier || "";
  form.elements.certificateNo.value = item.certificateNo || "";
  form.elements.validUntil.value = item.validUntil || "";
  form.elements.traceability.value = item.traceability || "";
  form.elements.menu.value = (item.menu || []).join("\n");
  setCoverPreview("sources", item.coverImage || "");
  setGalleryPreview("sources-environment", item.environmentPhotos || []);
  setGalleryPreview("sources-certificate", item.certificatePhotos || []);
  els.adminMessage.textContent = "正在编辑肉源记录";
}

function resetSourceForm() {
  els.sourceForm.reset();
  els.sourceForm.elements.id.value = "";
  els.sourceForm.elements.coverImage.value = "";
  setGalleryValue(els.sourceForm, "environmentPhotos", []);
  setGalleryValue(els.sourceForm, "certificatePhotos", []);
  els.sourceForm.elements.sourceType.value = "supplier";
  initAdminLocationSelects();
  setCoverPreview("sources", "");
  setGalleryPreview("sources-environment", []);
  setGalleryPreview("sources-certificate", []);
  els.adminMessage.textContent = "";
}

function sourceFromForm() {
  const form = els.sourceForm;
  return {
    name: form.elements.name.value,
    coverImage: form.elements.coverImage.value,
    environmentPhotos: galleryValue(form, "environmentPhotos"),
    certificatePhotos: galleryValue(form, "certificatePhotos"),
    province: form.elements.province.value,
    city: form.elements.city.value,
    district: form.elements.district.value,
    address: form.elements.address.value,
    phone: form.elements.phone.value,
    sourceType: form.elements.sourceType.value,
    certifier: form.elements.certifier.value,
    certificateNo: form.elements.certificateNo.value,
    validUntil: form.elements.validUntil.value,
    traceability: form.elements.traceability.value,
    menu: form.elements.menu.value
  };
}

function fillSlaughterhouseForm(item) {
  const form = els.slaughterhouseForm;
  state.editingId = item.id;
  els.adminFormTitle.textContent = "编辑屠宰场条目";
  form.elements.id.value = item.id;
  form.elements.coverImage.value = item.coverImage || "";
  setGalleryValue(form, "environmentPhotos", item.environmentPhotos || []);
  setGalleryValue(form, "certificatePhotos", item.certificatePhotos || []);
  form.elements.name.value = item.name || "";
  form.elements.province.value = item.province || "";
  updateAdminCities("slaughterhouses");
  form.elements.city.value = item.city || "";
  updateAdminDistricts("slaughterhouses");
  form.elements.district.value = item.district || "";
  form.elements.status.value = item.status || "合规";
  form.elements.address.value = item.address || "";
  form.elements.phone.value = item.phone || "";
  form.elements.auditor.value = item.auditor || "";
  form.elements.lastAudit.value = item.lastAudit || "";
  form.elements.requirements.value = (item.requirements || []).join(", ");
  form.elements.summary.value = item.summary || "";
  form.elements.menu.value = (item.menu || []).join("\n");
  setCoverPreview("slaughterhouses", item.coverImage || "");
  setGalleryPreview("slaughterhouses-environment", item.environmentPhotos || []);
  setGalleryPreview("slaughterhouses-certificate", item.certificatePhotos || []);
  els.adminMessage.textContent = "正在编辑屠宰场记录";
}

function resetSlaughterhouseForm() {
  els.slaughterhouseForm.reset();
  els.slaughterhouseForm.elements.id.value = "";
  els.slaughterhouseForm.elements.coverImage.value = "";
  setGalleryValue(els.slaughterhouseForm, "environmentPhotos", []);
  setGalleryValue(els.slaughterhouseForm, "certificatePhotos", []);
  els.slaughterhouseForm.elements.status.value = "合规";
  initAdminLocationSelects();
  setCoverPreview("slaughterhouses", "");
  setGalleryPreview("slaughterhouses-environment", []);
  setGalleryPreview("slaughterhouses-certificate", []);
  els.adminMessage.textContent = "";
}

function slaughterhouseFromForm() {
  const form = els.slaughterhouseForm;
  return {
    name: form.elements.name.value,
    coverImage: form.elements.coverImage.value,
    environmentPhotos: galleryValue(form, "environmentPhotos"),
    certificatePhotos: galleryValue(form, "certificatePhotos"),
    province: form.elements.province.value,
    city: form.elements.city.value,
    district: form.elements.district.value,
    status: form.elements.status.value,
    address: form.elements.address.value,
    phone: form.elements.phone.value,
    auditor: form.elements.auditor.value,
    lastAudit: form.elements.lastAudit.value,
    summary: form.elements.summary.value,
    menu: form.elements.menu.value,
    requirements: form.elements.requirements.value
  };
}

function setAdminType(type) {
  state.activeAdminType = type;
  state.editingId = "";
  document.querySelectorAll(".admin-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.adminType === type);
  });
  document.querySelectorAll("[data-admin-form]").forEach((form) => {
    form.hidden = form.dataset.adminForm !== type;
  });
  const titles = {
    restaurants: "新增主页餐厅条目",
    sources: "新增肉源核验条目",
    slaughterhouses: "新增屠宰场条目"
  };
  resetRestaurantForm();
  resetSourceForm();
  resetSlaughterhouseForm();
  els.adminFormTitle.textContent = titles[type];
  loadAdmin();
}

function resetActiveForm() {
  state.editingId = "";
  if (state.activeAdminType === "restaurants") resetRestaurantForm();
  if (state.activeAdminType === "sources") {
    resetSourceForm();
    els.adminFormTitle.textContent = "新增肉源核验条目";
  }
  if (state.activeAdminType === "slaughterhouses") {
    resetSlaughterhouseForm();
    els.adminFormTitle.textContent = "新增屠宰场条目";
  }
}

function restaurantFromForm() {
  const form = els.restaurantForm;
  return {
    name: form.elements.name.value,
    coverImage: form.elements.coverImage.value,
    environmentPhotos: galleryValue(form, "environmentPhotos"),
    certificatePhotos: galleryValue(form, "certificatePhotos"),
    province: form.elements.province.value,
    city: form.elements.city.value,
    district: form.elements.district.value,
    address: form.elements.address.value,
    phone: form.elements.phone.value,
    cuisine: form.elements.cuisine.value,
    avgPrice: form.elements.avgPrice.value,
    rating: form.elements.rating.value,
    openNow: form.elements.openNow.value === "true",
    certificationLevel: form.elements.certificationLevel.value,
    sourceType: form.elements.sourceType.value,
    sourceId: form.elements.sourceId.value,
    summary: form.elements.summary.value,
    menu: readMenuEditor("restaurants"),
    tags: form.elements.tags.value
  };
}

async function saveRestaurant(event) {
  event.preventDefault();
  els.adminMessage.textContent = "保存中";
  try {
    const body = restaurantFromForm();
    if (state.editingId) {
      await apiJson(`/api/admin/restaurants/${encodeURIComponent(state.editingId)}`, "PUT", body);
      els.adminMessage.textContent = "已更新";
    } else {
      await apiJson("/api/admin/restaurants", "POST", body);
      els.adminMessage.textContent = "已新增";
    }
    resetRestaurantForm();
    await loadMeta();
    await loadAdmin();
  } catch (error) {
    els.adminMessage.textContent = `保存失败：${error.message}`;
  }
}

async function saveSource(event) {
  event.preventDefault();
  els.adminMessage.textContent = "保存中";
  try {
    const body = sourceFromForm();
    if (state.editingId) {
      await apiJson(`/api/admin/sources/${encodeURIComponent(state.editingId)}`, "PUT", body);
      els.adminMessage.textContent = "已更新";
    } else {
      await apiJson("/api/admin/sources", "POST", body);
      els.adminMessage.textContent = "已新增";
    }
    resetActiveForm();
    await loadMeta();
    await loadAdminSources();
    await loadAdmin();
  } catch (error) {
    els.adminMessage.textContent = `保存失败：${error.message}`;
  }
}

async function saveSlaughterhouse(event) {
  event.preventDefault();
  els.adminMessage.textContent = "保存中";
  try {
    const body = slaughterhouseFromForm();
    if (state.editingId) {
      await apiJson(`/api/admin/slaughterhouses/${encodeURIComponent(state.editingId)}`, "PUT", body);
      els.adminMessage.textContent = "已更新";
    } else {
      await apiJson("/api/admin/slaughterhouses", "POST", body);
      els.adminMessage.textContent = "已新增";
    }
    resetActiveForm();
    await loadMeta();
    await loadAdmin();
  } catch (error) {
    els.adminMessage.textContent = `保存失败：${error.message}`;
  }
}

async function deleteRestaurant(id) {
  const item = state.restaurants.find((restaurant) => restaurant.id === id);
  if (!item) return;
  if (!window.confirm(`确定删除“${item.name}”？`)) return;
  els.adminMessage.textContent = "删除中";
  try {
    await apiJson(`/api/admin/restaurants/${encodeURIComponent(id)}`, "DELETE", {});
    if (state.editingId === id) resetRestaurantForm();
    await loadMeta();
    await loadAdmin();
    els.adminMessage.textContent = "已删除";
  } catch (error) {
    els.adminMessage.textContent = `删除失败：${error.message}`;
  }
}

async function deleteSource(id) {
  const item = state.sources.find((source) => source.id === id);
  if (!item) return;
  if (!window.confirm(`确定删除“${item.name}”？`)) return;
  els.adminMessage.textContent = "删除中";
  try {
    await apiJson(`/api/admin/sources/${encodeURIComponent(id)}`, "DELETE", {});
    if (state.editingId === id) resetActiveForm();
    await loadMeta();
    await loadAdminSources();
    await loadAdmin();
    els.adminMessage.textContent = "已删除";
  } catch (error) {
    els.adminMessage.textContent = `删除失败：${error.message}`;
  }
}

async function deleteSlaughterhouse(id) {
  const item = state.slaughterhouses.find((slaughterhouse) => slaughterhouse.id === id);
  if (!item) return;
  if (!window.confirm(`确定删除“${item.name}”？`)) return;
  els.adminMessage.textContent = "删除中";
  try {
    await apiJson(`/api/admin/slaughterhouses/${encodeURIComponent(id)}`, "DELETE", {});
    if (state.editingId === id) resetActiveForm();
    await loadMeta();
    await loadAdmin();
    els.adminMessage.textContent = "已删除";
  } catch (error) {
    els.adminMessage.textContent = `删除失败：${error.message}`;
  }
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  [els.cuisineSelect].filter(Boolean).forEach((select) => {
    select.addEventListener("change", refresh);
  });

  els.provinceSelect.addEventListener("change", () => {
    resetPage();
    updateCities();
    refresh();
  });

  els.citySelect.addEventListener("change", () => {
    resetPage();
    updateDistricts();
    updateFilterLocationCenter();
    refresh();
  });

  els.districtSelect.addEventListener("change", () => {
    resetPage();
    updateFilterLocationCenter();
    refresh();
  });

  els.searchInput.addEventListener("input", () => {
    clearTimeout(window.__searchTimer);
    window.__searchTimer = setTimeout(() => {
      resetPage();
      refresh();
    }, 180);
  });

  els.resultsList.addEventListener("click", (event) => {
    const pageButton = event.target.closest("[data-page-action]");
    if (pageButton) {
      state.currentPage += pageButton.dataset.pageAction === "next" ? 1 : -1;
      refresh();
      return;
    }
    const detailButton = event.target.closest("[data-detail]");
    const navButton = event.target.closest("[data-nav]");
    const editButton = event.target.closest("[data-edit]");
    const deleteButton = event.target.closest("[data-delete]");
    const sourceDetailButton = event.target.closest("[data-detail-source]");
    const editSourceButton = event.target.closest("[data-edit-source]");
    const deleteSourceButton = event.target.closest("[data-delete-source]");
    const slaughterhouseDetailButton = event.target.closest("[data-detail-slaughterhouse]");
    const editSlaughterhouseButton = event.target.closest("[data-edit-slaughterhouse]");
    const deleteSlaughterhouseButton = event.target.closest("[data-delete-slaughterhouse]");
    if (detailButton) {
      openDetailPage("restaurants", detailButton.dataset.detail);
    }
    if (navButton) openNavigation(navButton.dataset.nav);
    if (editButton) {
      const item = state.restaurants.find((restaurant) => restaurant.id === editButton.dataset.edit);
      if (item) fillRestaurantForm(item);
    }
    if (deleteButton) deleteRestaurant(deleteButton.dataset.delete);
    if (sourceDetailButton) {
      openDetailPage("sources", sourceDetailButton.dataset.detailSource);
    }
    if (editSourceButton) {
      const item = state.sources.find((source) => source.id === editSourceButton.dataset.editSource);
      if (item) fillSourceForm(item);
    }
    if (deleteSourceButton) deleteSource(deleteSourceButton.dataset.deleteSource);
    if (slaughterhouseDetailButton) {
      openDetailPage("slaughterhouses", slaughterhouseDetailButton.dataset.detailSlaughterhouse);
    }
    if (editSlaughterhouseButton) {
      const item = state.slaughterhouses.find((slaughterhouse) => slaughterhouse.id === editSlaughterhouseButton.dataset.editSlaughterhouse);
      if (item) fillSlaughterhouseForm(item);
    }
    if (deleteSlaughterhouseButton) deleteSlaughterhouse(deleteSlaughterhouseButton.dataset.deleteSlaughterhouse);
  });

  els.detailPanel.addEventListener("click", (event) => {
    const navButton = event.target.closest("[data-nav]");
    if (navButton) openNavigation(navButton.dataset.nav);
    const regionButton = event.target.closest("[data-region-detail]");
    if (regionButton) openDetailPage(regionButton.dataset.regionType, regionButton.dataset.regionDetail);
  });

  els.mapCanvas.addEventListener("click", (event) => {
    const popupButton = event.target.closest("[data-popup-id]");
    if (popupButton) {
      openDetailPage(popupButton.dataset.popupType, popupButton.dataset.popupId);
      return;
    }
    const pin = event.target.closest("[data-pin]");
    if (!pin) return;
    const type = state.view === "sources" ? "sources" : state.view === "slaughterhouses" ? "slaughterhouses" : "restaurants";
    openDetailPage(type, pin.dataset.pin);
  });

  els.locateButton.addEventListener("click", () => {
    requestCurrentLocation();
  });
  els.locationSearchButton.addEventListener("click", searchLocationPoint);
  els.locationInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      searchLocationPoint();
    }
  });

  els.restaurantForm.addEventListener("submit", saveRestaurant);
  els.sourceForm.addEventListener("submit", saveSource);
  els.slaughterhouseForm.addEventListener("submit", saveSlaughterhouse);
  bindCoverInput(els.restaurantForm, "restaurants");
  bindCoverInput(els.sourceForm, "sources");
  bindCoverInput(els.slaughterhouseForm, "slaughterhouses");
  bindGalleryInput(els.restaurantForm, "restaurants", "environmentFiles", "environmentPhotos", "environment");
  bindGalleryInput(els.restaurantForm, "restaurants", "certificateFiles", "certificatePhotos", "certificate");
  bindGalleryInput(els.sourceForm, "sources", "environmentFiles", "environmentPhotos", "environment");
  bindGalleryInput(els.sourceForm, "sources", "certificateFiles", "certificatePhotos", "certificate");
  bindGalleryInput(els.slaughterhouseForm, "slaughterhouses", "environmentFiles", "environmentPhotos", "environment");
  bindGalleryInput(els.slaughterhouseForm, "slaughterhouses", "certificateFiles", "certificatePhotos", "certificate");
  bindMenuEditor("restaurants");
  renderMenuEditor("restaurants", []);
  ["restaurants", "sources", "slaughterhouses"].forEach((type) => {
    const form = {
      restaurants: els.restaurantForm,
      sources: els.sourceForm,
      slaughterhouses: els.slaughterhouseForm
    }[type];
    form.elements.province.addEventListener("change", () => updateAdminCities(type));
    form.elements.city.addEventListener("change", () => updateAdminDistricts(type));
  });
  els.resetFormButton.addEventListener("click", resetActiveForm);
  document.querySelectorAll(".admin-tab").forEach((button) => {
    button.addEventListener("click", () => setAdminType(button.dataset.adminType));
  });
}

async function init() {
  bindEvents();
  try {
    await loadAmapIfConfigured();
    await loadMeta();
    await setView("search");
    requestCurrentLocation();
  } catch (error) {
    els.apiStatus.textContent = "连接失败";
    els.resultsList.innerHTML = `<div class="empty-state">应用启动时遇到问题：${escapeHtml(error.message)}</div>`;
  }
}

init();
