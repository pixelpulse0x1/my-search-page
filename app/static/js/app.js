/* === my-search-page v0.2.2.0 — Main Application === */
(function () {
  "use strict";

  // ─── State ───────────────────────────────────────────────
  const state = {
    engines: [],
    bookmarks: [],
    settings: {},
    lang: {},
    memoContent: "",
    wallpaperUrl: "",
    memoDebounce: null,
    quoteIntervalId: null,
    wallpaperTimerId: null,
    aplayerInstance: null,
  };

  // ─── i18n ────────────────────────────────────────────────
  function t(key, params) {
    let text = state.lang[key] || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, v);
      }
    }
    return text;
  }

  function translateDOM(root) {
    (root || document).querySelectorAll("[data-i18n]").forEach(el => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    (root || document).querySelectorAll("[data-i18n-placeholder]").forEach(el => {
      el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
    });
  }

  async function loadLang(langCode) {
    try {
      const resp = await fetch(`/api/lang/${langCode}`);
      const data = await resp.json();
      state.lang = data || {};
    } catch (e) { state.lang = {}; }
    translateDOM();
  }

  // ─── DOM Cache ───────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    bgContainer: $(".background-container"),
    mainContent: $(".main-content"),
    welcomeMessage: $("#welcomeMessage"),
    nixieClock: $("#nixieClock"),
    dateDisplay: $("#dateDisplay"),
    weatherWidget: $("#weatherWidget"),
    weatherIcon: $("#weatherIcon"),
    weatherTemp: $("#weatherTemp"),
    weatherDesc: $("#weatherDesc"),
    weatherCity: $("#weatherCity"),
    weatherDetail: $("#weatherDetail"),
    searchForm: $("#searchForm"),
    searchInput: $("#searchInput"),
    engineList: $("#engineList"),
    bookmarksList: $("#bookmarksList"),
    bookmarksSection: $("#bookmarksSection"),
    memoSection: $("#memoSection"),
    memoTextarea: $("#memoTextarea"),
    memoStatus: $("#memoStatus"),
    musicPlayer: $("#my-aplayer"),
    settingsBtn: $("#settingsBtn"),
    settingsOverlay: $("#settingsOverlay"),
    settingsClose: $("#settingsClose"),
    toast: $("#toast"),
  };

  // ─── Toast ───────────────────────────────────────────────
  let toastTimer;
  function showToast(msg) {
    dom.toast.textContent = t(msg) || msg;
    dom.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => dom.toast.classList.remove("show"), 2000);
  }

  // ─── Dark Mode ───────────────────────────────────────────
  function applyDarkMode(mode) {
    if (mode === "auto") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } else {
      document.documentElement.setAttribute("data-theme", mode);
    }
  }

  function watchSystemTheme() {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (state.settings.dark_mode === "auto") {
        applyDarkMode("auto");
      }
    });
  }

  // ─── CSS Variables ───────────────────────────────────────
  function applyThemeSettings() {
    const s = state.settings;
    dom.mainContent.style.background = `rgba(255, 255, 255, ${s.bg_opacity ?? 0.05})`;
    dom.mainContent.style.backdropFilter = `blur(${s.bg_blur ?? 2}px)`;
    dom.mainContent.style.webkitBackdropFilter = `blur(${s.bg_blur ?? 2}px)`;
    applyDarkMode(s.dark_mode || "auto");
  }

  // ─── Snowflakes ──────────────────────────────────────────
  function createSnowflakes() {
    const flake = document.createElement("div");
    flake.innerHTML = "&#10052;";
    flake.style.cssText =
      "position:absolute;color:var(--snow-color);z-index:9998;top:-25px;pointer-events:none;";
    const docH = window.innerHeight;
    const docW = window.innerWidth;
    setInterval(() => {
      const startLeft = Math.random() * docW;
      const endLeft = Math.random() * docW;
      const flakeSize = 3 + 20 * Math.random();
      const durationTime = 6000 + 10000 * Math.random();
      const startOpacity = 0.7 + 0.3 * Math.random();
      const endOpacity = 0.2 + 0.2 * Math.random();
      const cloneFlake = flake.cloneNode(true);
      cloneFlake.style.cssText += `left:${startLeft}px;opacity:${startOpacity};font-size:${flakeSize}px;transition:all ${durationTime}ms linear;`;
      document.body.appendChild(cloneFlake);
      setTimeout(() => {
        cloneFlake.style.cssText += `left:${endLeft}px;top:${docH}px;opacity:${endOpacity};`;
        setTimeout(() => cloneFlake.remove(), durationTime);
      }, 0);
    }, 100);
  }

  // ─── Title Interaction ───────────────────────────────────
  function initTitleInteraction() {
    const originalTitle = document.title;
    let titleTime;
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        document.title = t("Hey, where did you go?");
        clearTimeout(titleTime);
      } else {
        document.title = t("Oh, you're back!");
        titleTime = setTimeout(() => { document.title = originalTitle; }, 2000);
      }
    });
  }

  // ─── Click Effect ────────────────────────────────────────
  function initClickEffect() {
    const textValues = [
      "富强","民主","文明","和谐","自由","平等",
      "公正","法治","爱国","敬业","诚信","友善",
    ];
    let index = 0;
    document.body.addEventListener("click", (e) => {
      if (e.target.closest("button, a, .engine-item, .aplayer, .settings-overlay, .bookmark-link")) return;
      const x = e.pageX, y = e.pageY;
      const span = document.createElement("span");
      span.textContent = textValues[index];
      index = (index + 1) % textValues.length;
      span.style.cssText = `position:absolute;z-index:99999;top:${y-20}px;left:${x}px;color:#${("00000"+((Math.random()*0x1000000)<<0).toString(16)).slice(-6)};font-size:16px;font-weight:bold;user-select:none;pointer-events:none;animation:text-fade-out 1s forwards;`;
      document.body.appendChild(span);
      setTimeout(() => span.remove(), 1000);
    });
  }

  // ─── Nixie Clock ─────────────────────────────────────────
  function createNixieClock() {
    dom.nixieClock.innerHTML =
      '<span class="nixie-char">0</span><span class="nixie-char">0</span>' +
      '<span class="nixie-char nixie-separator">:</span>' +
      '<span class="nixie-char">0</span><span class="nixie-char">0</span>' +
      '<span class="nixie-char nixie-separator">:</span>' +
      '<span class="nixie-char">0</span><span class="nixie-char">0</span>' +
      '<span class="nixie-ampm" id="nixieAmpm"></span>';
  }

  function updateTime(timeData) {
    let h = timeData.hours, m = timeData.minutes, s = timeData.seconds;
    const use12h = state.settings.time_format === "12h";
    const ampmEl = document.getElementById("nixieAmpm");
    let ampm = "";
    if (use12h) {
      ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
    }
    if (ampmEl) ampmEl.textContent = ampm;
    const digits = dom.nixieClock.querySelectorAll(".nixie-char:not(.nixie-separator)");
    const timeStr = String(h).padStart(2, "0") + String(m).padStart(2, "0") + String(s).padStart(2, "0");
    digits.forEach((d, i) => { if (d.textContent !== timeStr[i]) d.textContent = timeStr[i]; });
    const weekdays = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const wd = t(weekdays[timeData.weekday] || "");
    dom.dateDisplay.textContent =
      `${timeData.year}年${String(timeData.month).padStart(2,"0")}月${String(timeData.day).padStart(2,"0")}日 ${wd}`;
  }

  // ─── Weather Widget (Browser-side wttr.in fetch) ─────────
  const WEATHER_TR = {
    "Sunny":"晴天","Clear":"晴朗","Partly cloudy":"多云","Cloudy":"阴天","Overcast":"阴天",
    "Mist":"薄雾","Fog":"雾","Freezing fog":"冻雾","Patchy rain possible":"可能有零星小雨",
    "Patchy snow possible":"可能有零星小雪","Patchy sleet possible":"可能有雨夹雪",
    "Patchy freezing drizzle possible":"可能有冻毛毛雨","Thundery outbreaks possible":"可能打雷",
    "Blowing snow":"风雪","Blizzard":"暴雪","Patchy light drizzle":"零星小雨",
    "Light drizzle":"小雨","Freezing drizzle":"冻毛毛雨","Heavy freezing drizzle":"大冻雨",
    "Patchy light rain":"零星小雨","Light rain":"小雨","Moderate rain at times":"有时有中雨",
    "Moderate rain":"中雨","Heavy rain at times":"有时有大雨","Heavy rain":"大雨",
    "Light freezing rain":"小冻雨","Moderate or heavy freezing rain":"中到大冻雨",
    "Light sleet":"雨夹雪","Moderate or heavy sleet":"中到大雨夹雪",
    "Patchy light snow":"零星小雪","Light snow":"小雪","Patchy moderate snow":"中雪",
    "Moderate snow":"中雪","Patchy heavy snow":"大雪","Heavy snow":"大雪","Ice pellets":"冰粒",
    "Light rain shower":"小阵雨","Moderate or heavy rain shower":"中到大阵雨",
    "Torrential rain shower":"倾盆大雨","Light sleet showers":"雨夹雪阵雨",
    "Moderate or heavy sleet showers":"中到大雨夹雪阵雨","Light snow showers":"小雪阵雨",
    "Moderate or heavy snow showers":"中到大雪阵雨","Light showers of ice pellets":"冰粒阵雨",
    "Moderate or heavy showers of ice pellets":"中到大冰粒阵雨",
    "Patchy light rain with thunder":"雷阵雨","Moderate or heavy rain with thunder":"雷阵雨",
    "Patchy light snow with thunder":"雷阵雪","Moderate or heavy snow with thunder":"中到大雷阵雪",
  };
  const WIND_TR = {
    "N":"北","NNE":"北东北","NE":"东北","ENE":"东东北","E":"东","ESE":"东东南",
    "SE":"东南","SSE":"南东南","S":"南","SSW":"南西南","SW":"西南","WSW":"西西南",
    "W":"西","WNW":"西西北","NW":"西北","NNW":"北西北",
  };
  const MOON_TR = {
    "New Moon":"新月","Waxing Crescent":"蛾眉月","First Quarter":"上弦月",
    "Waxing Gibbous":"盈凸月","Full Moon":"满月","Waning Gibbous":"亏凸月",
    "Last Quarter":"下弦月","Waning Crescent":"残月",
  };

  async function fetchWeather() {
    if (!state.settings.show_weather) {
      if (dom.weatherWidget) dom.weatherWidget.style.display = "none";
      return;
    }
    try {
      // Get city lock config from backend
      let wttrUrl = "https://wttr.in/?format=j1";
      try {
        const cfgResp = await fetch("/api/weather-config");
        const cfg = await cfgResp.json();
        if (cfg.locked && cfg.city) {
          wttrUrl = `https://wttr.in/${encodeURIComponent(cfg.city)}?format=j1`;
        }
      } catch (_) { /* use auto-detect URL */ }

      const resp = await fetch(wttrUrl);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      const current = (data.current_condition || [])[0];
      if (!current) throw new Error("No current condition");

      const area = (data.nearest_area || [{}])[0];
      const cityName = (area.areaName || [{}])[0].value || "";
      const country = (area.country || [{}])[0].value || "";
      const weatherToday = (data.weather || [{}])[0] || {};
      const astro = (weatherToday.astronomy || [{}])[0] || {};

      const descEn = (current.weatherDesc || [{}])[0].value || "";
      const descCn = WEATHER_TR[descEn.trim()] || descEn.trim();
      const iconUrl = (current.weatherIconUrl || [{}])[0].value || "";
      const windDir = current.winddir16Point || "";
      const windDirCn = WIND_TR[windDir] || windDir;

      const moonEn = astro.moon_phase || "";
      const moonCn = MOON_TR[moonEn] || moonEn;

      // Build forecast (today + 2 days)
      const forecast = (data.weather || []).slice(0, 3).map(day => {
        const da = (day.astronomy || [{}])[0] || {};
        return {
          date: day.date || "",
          avgtemp_c: day.avgtempC || "",
          mintemp_c: day.mintempC || "",
          maxtemp_c: day.maxtempC || "",
          sunrise: da.sunrise || "",
          sunset: da.sunset || "",
          moon_phase: MOON_TR[da.moon_phase || ""] || da.moon_phase || "",
        };
      });

      renderWeatherWidget({
        city: cityName,
        country: country,
        current: {
          temp_c: current.temp_C || "",
          feels_like_c: current.FeelsLikeC || "",
          humidity: current.humidity || "",
          visibility_km: current.visibility || "",
          pressure_hpa: current.pressure || "",
          uv_index: current.uvIndex || "",
          cloudcover: current.cloudcover || "",
          weather_code: current.weatherCode || "",
          desc_en: descEn.trim(),
          desc_cn: descCn,
          icon_url: iconUrl,
          wind_dir: windDir,
          wind_dir_cn: windDirCn,
          wind_speed_kmph: current.windspeedKmph || "",
          precip_mm: current.precipMM || "",
        },
        astronomy: {
          sunrise: astro.sunrise || "",
          sunset: astro.sunset || "",
          moon_phase: moonCn,
          moon_phase_en: moonEn,
          moon_illumination: astro.moon_illumination || "",
        },
        forecast: forecast,
      });
    } catch (e) {
      renderWeatherError("天气加载失败");
      console.error("Weather fetch:", e);
    }
  }

  function renderWeatherWidget(data) {
    if (!dom.weatherWidget) return;
    dom.weatherWidget.style.display = "";
    const c = data.current || {};
    const a = data.astronomy || {};
    if (dom.weatherIcon) {
      dom.weatherIcon.src = c.icon_url || "";
      dom.weatherIcon.style.display = c.icon_url ? "" : "none";
    }
    if (dom.weatherTemp) dom.weatherTemp.textContent = c.temp_c ? `${c.temp_c}°C` : "--";
    if (dom.weatherDesc) dom.weatherDesc.textContent = c.desc_cn || c.desc_en || "--";
    if (dom.weatherCity) dom.weatherCity.textContent = data.city || "";
    // Full location in detail panel
    const locationStr = data.country ? `${data.city || ""}, ${data.country}` : (data.city || "");
    const locEl = document.getElementById("weatherLocation");
    if (locEl) locEl.textContent = locationStr || "--";

    const setDetail = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value || "--";
    };
    setDetail("weatherFeelsLike", c.feels_like_c ? `${c.feels_like_c}°C` : "--");
    setDetail("weatherHumidity", c.humidity ? `${c.humidity}%` : "--");
    setDetail("weatherWind", c.wind_dir_cn ? `${c.wind_dir_cn} ${c.wind_speed_kmph}km/h` : "--");
    setDetail("weatherVisibility", c.visibility_km ? `${c.visibility_km}km` : "--");
    setDetail("weatherPressure", c.pressure_hpa ? `${c.pressure_hpa}hPa` : "--");
    setDetail("weatherUV", c.uv_index || "--");
    setDetail("weatherSunrise", a.sunrise || "--");
    setDetail("weatherSunset", a.sunset || "--");
    setDetail("weatherMoon", a.moon_phase || "--");
  }

  function renderWeatherError(msg) {
    if (!dom.weatherWidget) return;
    dom.weatherWidget.style.display = "";
    if (dom.weatherTemp) dom.weatherTemp.textContent = "--°";
    if (dom.weatherDesc) dom.weatherDesc.textContent = t(msg) || msg;
    if (dom.weatherCity) dom.weatherCity.textContent = "";
    if (dom.weatherIcon) dom.weatherIcon.style.display = "none";
  }

  function initWeatherWidget() {
    if (!dom.weatherWidget) return;
    dom.weatherWidget.querySelector(".weather-widget-main").addEventListener("click", () => {
      dom.weatherWidget.classList.toggle("expanded");
    });
  }

  // ─── Search Engines ──────────────────────────────────────
  function renderEngineList() {
    dom.engineList.innerHTML = "";
    state.engines.forEach((engine, idx) => {
      const item = document.createElement("div");
      item.className = engine.is_default ? "engine-item selected" : "engine-item";
      item.dataset.index = idx;
      item.innerHTML = `<span class="checkmark">&#10004;</span> ${engine.name}`;
      dom.engineList.appendChild(item);
    });
  }

  function performSearch(e) {
    e.preventDefault();
    const query = dom.searchInput.value.trim();
    if (!query) {
      dom.searchInput.placeholder = "请输入有效内容后再搜索！";
      dom.searchInput.focus();
      return;
    }
    const selectedItems = dom.engineList.querySelectorAll(".engine-item.selected");
    if (selectedItems.length === 0) {
      dom.searchInput.classList.add("shake");
      dom.searchInput.placeholder = "请至少选择一个搜索引擎！";
      setTimeout(() => {
        dom.searchInput.classList.remove("shake");
        dom.searchInput.placeholder = "输入内容，一键多站搜索...";
      }, 500);
      return;
    }
    const encodedQuery = encodeURIComponent(query);
    selectedItems.forEach((item) => {
      const engine = state.engines[item.dataset.index];
      if (engine) {
        window.open(engine.url_template.replace("{query}", encodedQuery), "_blank");
      }
    });
  }

  // ─── Bookmarks (Table Format) ────────────────────────────
  function renderBookmarks() {
    dom.bookmarksList.innerHTML = "";
    if (!state.settings.show_bookmarks || state.bookmarks.length === 0) {
      dom.bookmarksSection.style.display = "none";
      return;
    }
    dom.bookmarksSection.style.display = "";
    state.bookmarks.forEach((bm) => {
      const tr = document.createElement("tr");
      const desc = bm.description || "";
      tr.innerHTML = `<td><a class="bookmark-link" href="${escHtml(bm.url)}" target="_blank" title="${escHtml(bm.description || bm.title)}"><span class="bookmark-link-icon">&#128279;</span><span>${escHtml(bm.title)}</span>${desc ? `<span class="bookmark-desc">${escHtml(desc)}</span>` : ""}</a></td>`;
      dom.bookmarksList.appendChild(tr);
    });
  }

  function escHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── Music Player ────────────────────────────────────────
  function applyMusicSettings() {
    const s = state.settings;
    const el = dom.musicPlayer;
    if (!el) return;
    el.style.display = s.show_music_player ? "" : "none";
    if (!s.show_music_player) return;
    el.setAttribute("data-id", s.music_id || "6895409634");
    el.setAttribute("data-server", s.music_server || "netease");
    el.setAttribute("data-type", s.music_type || "playlist");
    el.setAttribute("data-fixed", s.music_fixed !== false ? "true" : "false");
    el.setAttribute("data-autoplay", s.music_autoplay ? "true" : "false");
    el.setAttribute("data-order", s.music_order || "random");
    el.setAttribute("data-volume", String(s.music_volume ?? 0.7));
    el.setAttribute("data-theme", s.music_theme || "#2EA7E0");
    el.setAttribute("data-preload", s.music_preload || "auto");
    el.setAttribute("data-listFolded", s.music_list_folded !== false ? "true" : "false");
  }

  const MUSIC_DEFAULTS = {
    music_id: "6895409634", music_server: "netease", music_type: "playlist",
    music_fixed: true, music_autoplay: false, music_order: "random",
    music_volume: 0.7, music_theme: "#2EA7E0", music_preload: "auto",
    music_list_folded: true,
  };

  // ─── Memo ────────────────────────────────────────────────
  function initMemo() {
    if (!state.settings.show_memo) { dom.memoSection.style.display = "none"; return; }
    dom.memoSection.style.display = "";
    dom.memoTextarea.value = state.memoContent;
    dom.memoTextarea.addEventListener("input", () => {
      dom.memoStatus.textContent = t("Not saved...");
      clearTimeout(state.memoDebounce);
      state.memoDebounce = setTimeout(() => { saveMemo(dom.memoTextarea.value); }, 1000);
    });
  }

  async function saveMemo(content) {
    try {
      const resp = await fetch("/api/memo", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      dom.memoStatus.textContent = resp.ok ? t("Saved") : t("Save failed");
    } catch (e) { dom.memoStatus.textContent = t("Save failed"); }
  }

  // ─── Wallpaper Rotation ──────────────────────────────────
  const BG_STORAGE_KEY = "mysearchpage_bg";
  const BG_TIME_KEY = "mysearchpage_bg_time";

  function startWallpaperRotation() {
    stopWallpaperRotation();
    const intervalHours = parseFloat(state.settings.wallpaper_interval);
    if (intervalHours > 0) {
      state.wallpaperTimerId = setInterval(checkWallpaper, intervalHours * 3600 * 1000);
    }
  }
  function stopWallpaperRotation() {
    if (state.wallpaperTimerId) { clearInterval(state.wallpaperTimerId); state.wallpaperTimerId = null; }
  }
  async function checkWallpaper() {
    if (state.settings.wallpaper_mode === "fixed") return;
    const now = Date.now();
    const lastChange = parseInt(localStorage.getItem(BG_TIME_KEY) || "0");
    const intervalMs = parseFloat(state.settings.wallpaper_interval || 1) * 3600 * 1000;
    if (!lastChange || (now - lastChange) >= intervalMs) await rotateWallpaper();
  }
  async function rotateWallpaper() {
    try {
      const resp = await fetch("/api/wallpapers");
      const data = await resp.json();
      const wallpapers = data.wallpapers || [];
      if (wallpapers.length > 0) {
        const chosen = wallpapers[Math.floor(Math.random() * wallpapers.length)];
        localStorage.setItem(BG_STORAGE_KEY, chosen.url);
        localStorage.setItem(BG_TIME_KEY, Date.now().toString());
        state.wallpaperUrl = chosen.url;
        dom.bgContainer.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url('${chosen.url}')`;
      }
    } catch (e) {}
  }

  // ─── Quote Rotation ──────────────────────────────────────
  let allQuotes = [];
  async function fetchAllQuotes() {
    try { const resp = await fetch("/api/quotes"); const data = await resp.json(); allQuotes = data.quotes || []; } catch (e) { allQuotes = []; }
  }
  function startQuoteRotation() {
    stopQuoteRotation();
    displayRandomQuote();
    const intervalSec = parseInt(state.settings.quote_interval) || 10;
    if (intervalSec > 0 && allQuotes.length > 0) {
      state.quoteIntervalId = setInterval(displayRandomQuote, intervalSec * 1000);
    }
  }
  function stopQuoteRotation() {
    if (state.quoteIntervalId) { clearInterval(state.quoteIntervalId); state.quoteIntervalId = null; }
  }
  function displayRandomQuote() {
    if (!state.settings.show_quotes) return;
    if (allQuotes.length === 0) { dom.welcomeMessage.style.display = "none"; return; }
    dom.welcomeMessage.style.display = "";
    const q = allQuotes[Math.floor(Math.random() * allQuotes.length)];
    dom.welcomeMessage.style.opacity = "0";
    setTimeout(() => { dom.welcomeMessage.textContent = q; dom.welcomeMessage.style.opacity = "1"; }, 400);
  }

  // ─── Settings Panel ──────────────────────────────────────
  function openSettings() { dom.settingsOverlay.classList.add("active"); }
  function closeSettings() { dom.settingsOverlay.classList.remove("active"); }

  // ─── Public API for settings.js ──────────────────────────
  window.refreshMainBookmarks = async function () {
    try { const resp = await fetch("/api/bookmarks"); state.bookmarks = await resp.json(); renderBookmarks(); } catch (e) {}
  };
  window.refreshMainEngines = async function () {
    try { const resp = await fetch("/api/search-engines"); state.engines = await resp.json(); renderEngineList(); } catch (e) {}
  };
  window.applyWallpaper = function (url) {
    if (url) {
      localStorage.setItem(BG_STORAGE_KEY, url);
      localStorage.setItem(BG_TIME_KEY, Date.now().toString());
      state.wallpaperUrl = url;
      dom.bgContainer.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url('${url}')`;
    }
  };
  window.getAppState = function () { return state; };
  window.saveAppSetting = async function (key, value) {
    state.settings[key] = value;
    try { await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: value }) }); } catch (e) {}
  };
  window.MUSIC_DEFAULTS = MUSIC_DEFAULTS;
  window.t = t;
  window.translateDOM = translateDOM;
  window.loadLang = loadLang;

  // ─── Init ────────────────────────────────────────────────
  async function loadInitialData() {
    try {
      const [headerResp, enginesResp, bookmarksResp, memoResp] = await Promise.all([
        fetch("/api/header-info"), fetch("/api/search-engines"),
        fetch("/api/bookmarks"), fetch("/api/memo"),
      ]);
      if (headerResp.ok) {
        const data = await headerResp.json();
        state.settings = data.settings || {};
        await loadLang(state.settings.language || "zh");
        applyThemeSettings();
        watchSystemTheme();
        updateTime(data.time);
        if (data.quote) { dom.welcomeMessage.textContent = data.quote; dom.welcomeMessage.style.display = state.settings.show_quotes ? "" : "none"; }
        if (data.wallpaper_url) { state.wallpaperUrl = data.wallpaper_url; dom.bgContainer.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url('${data.wallpaper_url}')`; }
        applyMusicSettings();
        const ampmEl = document.getElementById("nixieAmpm");
        if (ampmEl) ampmEl.style.display = (state.settings.time_format || "24h") === "12h" ? "" : "none";
      }
      if (enginesResp.ok) { state.engines = await enginesResp.json(); renderEngineList(); }
      if (bookmarksResp.ok) { state.bookmarks = await bookmarksResp.json(); renderBookmarks(); }
      if (memoResp.ok) { const memoData = await memoResp.json(); state.memoContent = memoData.content || ""; initMemo(); }
      await fetchAllQuotes();
      startWallpaperRotation();
      startQuoteRotation();
      startClockInterval();
    } catch (e) { console.error("Init error:", e); }
  }

  let clockInterval;
  function startClockInterval() {
    clockInterval = setInterval(() => {
      const now = new Date();
      updateTime({ hours: now.getHours(), minutes: now.getMinutes(), seconds: now.getSeconds(), year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate(), weekday: now.getDay() });
    }, 1000);
  }

  // ─── Event Binding ───────────────────────────────────────
  function bindEvents() {
    dom.searchForm.addEventListener("submit", performSearch);
    dom.engineList.addEventListener("click", (e) => { const item = e.target.closest(".engine-item"); if (item) item.classList.toggle("selected"); });
    dom.settingsBtn.addEventListener("click", openSettings);
    dom.settingsClose.addEventListener("click", closeSettings);
    dom.settingsOverlay.addEventListener("click", (e) => { if (e.target === dom.settingsOverlay) closeSettings(); });
    dom.searchInput.addEventListener("focus", () => { dom.searchInput.dataset.prevPlaceholder = dom.searchInput.placeholder; });
    dom.searchInput.addEventListener("blur", () => { if (!dom.searchInput.value.trim()) { dom.searchInput.placeholder = dom.searchInput.dataset.prevPlaceholder || "输入内容，一键多站搜索..."; } });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && dom.settingsOverlay.classList.contains("active")) closeSettings(); });
  }

  // ─── Bootstrap ───────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", async () => {
    createNixieClock();
    createSnowflakes();
    initTitleInteraction();
    initClickEffect();
    initWeatherWidget();
    bindEvents();
    await loadInitialData();
    fetchWeather();
    setInterval(fetchWeather, 30 * 60 * 1000);
  });
})();
