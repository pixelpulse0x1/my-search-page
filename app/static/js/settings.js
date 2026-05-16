/* === Settings Panel Logic === */
(function () {
  "use strict";

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => (ctx || document).querySelectorAll(sel);

  // ─── Tab Switching ───────────────────────────────────────
  function retranslate(el) {
    if (window.translateDOM) window.translateDOM(el || document);
  }

  function initTabs() {
    const tabs = $$(".settings-tab");
    const sections = $$(".settings-section");

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        sections.forEach((s) => s.classList.remove("active"));
        tab.classList.add("active");
        const target = document.getElementById(tab.dataset.tab);
        if (target) { target.classList.add("active"); retranslate(target); }

        if (tab.dataset.tab === "tab-engines") loadEngineSettings();
        if (tab.dataset.tab === "tab-bookmarks") loadBookmarkSettings();
        if (tab.dataset.tab === "tab-wallpapers") loadWallpaperSettings();
        if (tab.dataset.tab === "tab-appearance") loadAppearanceSettings();
        if (tab.dataset.tab === "tab-system") loadSystemSettings();
      });
    });

    loadEngineSettings();
    // Initial translate on first tab
    retranslate(document.getElementById("tab-engines"));
  }

  // ─── Toast ────────────────────────────────────────────────
  function toast(key) {
    const t = document.getElementById("toast");
    if (t) {
      t.textContent = window.t ? window.t(key) : key;
      t.classList.add("show");
      setTimeout(() => t.classList.remove("show"), 2000);
    }
  }

  // ─── Search Engine Settings ──────────────────────────────
  async function loadEngineSettings() {
    try {
      const resp = await fetch("/api/search-engines");
      const engines = await resp.json();
      const list = $("#settingsEngineList");
      list.innerHTML = "";

      engines.forEach((eng) => {
        const li = document.createElement("li");
        li.className = "config-item";
        li.innerHTML = `
          <span class="drag-handle">&#9776;</span>
          <span class="item-name">${escHtml(eng.name)}</span>
          <span class="item-url">${escHtml(eng.url_template)}</span>
          <label><input type="checkbox" class="eng-default" data-id="${eng.id}" ${eng.is_default ? "checked" : ""} /> <span data-i18n="Default">默认</span></label>
          <button class="btn btn-sm btn-danger eng-delete" data-id="${eng.id}" data-i18n="Delete">删除</button>
        `;
        list.appendChild(li);
      });

      $$(".eng-delete", list).forEach((btn) => {
        btn.addEventListener("click", async () => {
          await fetch(`/api/search-engines/${btn.dataset.id}`, { method: "DELETE" });
          toast("Engine deleted");
          loadEngineSettings();
          if (window.refreshMainEngines) window.refreshMainEngines();
        });
      });

      retranslate(list);

      $$(".eng-default", list).forEach((cb) => {
        cb.addEventListener("change", async () => {
          await fetch(`/api/search-engines/${cb.dataset.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_default: cb.checked ? 1 : 0 }),
          });
          if (window.refreshMainEngines) window.refreshMainEngines();
        });
      });
    } catch (e) {
      console.error("Load engines error:", e);
    }
  }

  async function addEngine() {
    const nameInput = $("#newEngineName");
    const urlInput = $("#newEngineUrl");
    const name = nameInput.value.trim();
    const url = urlInput.value.trim();
    if (!name || !url) { toast("Name and URL required"); return; }
    if (!url.includes("{query}")) { toast("URL template must contain {query}"); return; }

    await fetch("/api/search-engines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, url_template: url }),
    });
    nameInput.value = "";
    urlInput.value = "";
    toast("Engine added");
    loadEngineSettings();
    if (window.refreshMainEngines) window.refreshMainEngines();
  }

  // ─── Bookmark Settings ───────────────────────────────────
  async function loadBookmarkSettings() {
    try {
      const resp = await fetch("/api/bookmarks");
      const bookmarks = await resp.json();
      const list = $("#settingsBookmarkList");
      list.innerHTML = "";

      bookmarks.forEach((bm) => {
        const li = document.createElement("li");
        li.className = "config-item";
        li.dataset.bmId = bm.id;
        li.innerHTML = `
          <span class="item-name">${escHtml(bm.title)}</span>
          <span class="item-url">${escHtml(bm.url)}</span>
          <button class="btn btn-sm btn-secondary bm-edit" data-id="${bm.id}" data-i18n="Edit">编辑</button>
          <button class="btn btn-sm btn-danger bm-delete" data-id="${bm.id}" data-i18n="Delete">删除</button>
        `;
        list.appendChild(li);
      });

      retranslate(list);

      // Delete handlers
      $$(".bm-delete", list).forEach((btn) => {
        btn.addEventListener("click", async () => {
          await fetch(`/api/bookmarks/${btn.dataset.id}`, { method: "DELETE" });
          toast("Link deleted");
          loadBookmarkSettings();
          if (window.refreshMainBookmarks) window.refreshMainBookmarks();
        });
      });

      // Edit handlers
      $$(".bm-edit", list).forEach((btn) => {
        btn.addEventListener("click", () => {
          const bm = bookmarks.find(b => b.id == btn.dataset.id);
          if (bm) startEditBookmark(bm);
        });
      });
    } catch (e) {
      console.error("Load bookmarks error:", e);
    }
  }

  function startEditBookmark(bm) {
    const li = document.querySelector(`.config-item[data-bm-id="${bm.id}"]`);
    if (!li) return;
    li.className = "config-item config-item-editing";
    li.innerHTML = `
      <input type="text" class="bm-edit-title" value="${escHtmlAttr(bm.title)}" data-i18n-placeholder="Title" placeholder="标题" style="flex:1;min-width:80px;" />
      <input type="text" class="bm-edit-url" value="${escHtmlAttr(bm.url)}" data-i18n-placeholder="URL" placeholder="网址" style="flex:2;min-width:120px;" />
      <input type="text" class="bm-edit-desc" value="${escHtmlAttr(bm.description || '')}" data-i18n-placeholder="Description (optional)" placeholder="描述(可选)" style="flex:1;min-width:80px;" />
      <button class="btn btn-sm btn-primary bm-save" data-id="${bm.id}" data-i18n="Save">保存</button>
      <button class="btn btn-sm btn-secondary bm-cancel" data-id="${bm.id}" data-i18n="Cancel">取消</button>
    `;
    // Focus title input
    retranslate(li);
    li.querySelector(".bm-edit-title").focus();

    li.querySelector(".bm-save").addEventListener("click", async () => {
      const title = li.querySelector(".bm-edit-title").value.trim();
      const url = li.querySelector(".bm-edit-url").value.trim();
      const desc = li.querySelector(".bm-edit-desc").value.trim();
      if (!title || !url) { toast("Title and URL required"); return; }
      await fetch(`/api/bookmarks/${bm.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, url, description: desc }),
      });
      toast("Link updated");
      loadBookmarkSettings();
      if (window.refreshMainBookmarks) window.refreshMainBookmarks();
    });

    li.querySelector(".bm-cancel").addEventListener("click", () => {
      loadBookmarkSettings();
    });
  }

  function escHtmlAttr(str) {
    return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  async function addBookmark() {
    const title = $("#newBmTitle").value.trim();
    const url = $("#newBmUrl").value.trim();
    const desc = $("#newBmDesc").value.trim();
    if (!title || !url) { toast("Title and URL required"); return; }

    await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, url, description: desc }),
    });
    $("#newBmTitle").value = "";
    $("#newBmUrl").value = "";
    $("#newBmDesc").value = "";
    toast("Link added");
    loadBookmarkSettings();
    if (window.refreshMainBookmarks) window.refreshMainBookmarks();
  }

  // ─── Wallpaper Settings ──────────────────────────────────
  async function loadWallpaperSettings() {
    try {
      const [wpResp, settingsResp] = await Promise.all([
        fetch("/api/wallpapers"),
        fetch("/api/settings"),
      ]);
      const wps = await wpResp.json();
      const settings = await settingsResp.json();

      // Gallery
      const gallery = $("#wallpaperGallery");
      gallery.innerHTML = "";
      (wps.wallpapers || []).forEach((wp) => {
        const wrapper = document.createElement("div");
        wrapper.className = "wallpaper-thumb-wrapper";

        const img = document.createElement("img");
        img.className = "wallpaper-thumb" + (settings.wallpaper_mode === "fixed" && settings.wallpaper_fixed === wp.filename ? " active" : "");
        img.src = wp.url;
        img.title = wp.filename;
        img.addEventListener("click", async () => {
          await fetch("/api/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ wallpaper_mode: "fixed", wallpaper_fixed: wp.filename }),
          });
          toast("Wallpaper locked");
          loadWallpaperSettings();
          if (window.applyWallpaper) window.applyWallpaper(wp.url);
        });
        wrapper.appendChild(img);

        // Delete button
        const delBtn = document.createElement("button");
        delBtn.className = "wallpaper-thumb-delete";
        delBtn.innerHTML = "&#10005;";
        delBtn.title = "删除壁纸";
        delBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (!confirm(`确定删除壁纸 "${wp.filename}" 吗？`)) return;
          try {
            const resp = await fetch(`/api/wallpapers/${encodeURIComponent(wp.filename)}`, { method: "DELETE" });
            if (resp.ok) {
              toast("Wallpaper deleted");
              loadWallpaperSettings();
            } else {
              toast("Delete failed");
            }
          } catch (err) { toast("Delete failed"); }
        });
        wrapper.appendChild(delBtn);

        gallery.appendChild(wrapper);
      });
      retranslate(gallery);

      // Mode radios
      const modeRadios = $$("input[name='wallpaperMode']");
      modeRadios.forEach((r) => {
        r.checked = r.value === (settings.wallpaper_mode || "random");
        r.addEventListener("change", async () => {
          if (r.checked) {
            await fetch("/api/settings", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ wallpaper_mode: r.value }),
            });
            if (window.getAppState) window.getAppState().settings.wallpaper_mode = r.value;
            toast(r.value === "random" ? "已切换为随机模式" : "请点击壁纸缩略图固定");
          }
        });
      });

      // Wallpaper interval
      const intervalInput = $("#wallpaperIntervalInput");
      intervalInput.value = settings.wallpaper_interval || 1;
      intervalInput.addEventListener("change", async () => {
        const val = parseFloat(intervalInput.value) || 0;
        await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallpaper_interval: val }),
        });
        if (window.getAppState) window.getAppState().settings.wallpaper_interval = val;
        toast("Wallpaper interval saved");
      });

      // Opacity/Blur sliders
      const opacitySlider = $("#bgOpacitySlider");
      const blurSlider = $("#bgBlurSlider");
      opacitySlider.value = Math.round((settings.bg_opacity || 0.05) * 100);
      blurSlider.value = settings.bg_blur || 2;
      updateSliderDisplay();

      opacitySlider.oninput = () => {
        const val = opacitySlider.value / 100;
        $("#bgOpacityVal").textContent = val.toFixed(2);
        $(".main-content").style.background = `rgba(255, 255, 255, ${val})`;
      };
      opacitySlider.onchange = async () => {
        const val = opacitySlider.value / 100;
        await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bg_opacity: val }),
        });
        toast("Opacity saved");
      };

      blurSlider.oninput = () => {
        const val = blurSlider.value;
        $("#bgBlurVal").textContent = val;
        $(".main-content").style.backdropFilter = `blur(${val}px)`;
        $(".main-content").style.webkitBackdropFilter = `blur(${val}px)`;
      };
      blurSlider.onchange = async () => {
        await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bg_blur: parseInt(blurSlider.value) }),
        });
        toast("Blur saved");
      };
    } catch (e) {
      console.error("Load wallpaper settings error:", e);
    }
  }

  function updateSliderDisplay() {
    const opacityEl = $("#bgOpacityVal");
    const blurEl = $("#bgBlurVal");
    if (opacityEl) opacityEl.textContent = (parseInt($("#bgOpacitySlider").value) / 100).toFixed(2);
    if (blurEl) blurEl.textContent = $("#bgBlurSlider").value;
  }

  async function uploadWallpaper() {
    const fileInput = $("#wallpaperUploadInput");
    const file = fileInput.files[0];
    if (!file) { toast("Select an image file"); return; }
    const formData = new FormData();
    formData.append("file", file);
    try {
      const resp = await fetch("/api/wallpapers/upload", { method: "POST", body: formData });
      if (resp.ok) {
        toast("Wallpaper uploaded");
        fileInput.value = "";
        loadWallpaperSettings();
      } else {
        toast("Upload failed");
      }
    } catch (e) { toast("Upload failed"); }
  }

  // ─── Appearance Settings ─────────────────────────────────
  async function loadAppearanceSettings() {
    try {
      const resp = await fetch("/api/settings");
      const s = await resp.json();

      $("#darkModeSelect").value = s.dark_mode || "auto";
      $("#timeFormatSelect").value = s.time_format || "24h";
      $("#languageSelect").value = s.language || "zh";
      $("#quoteIntervalInput").value = s.quote_interval || 10;
      $("#toggleQuotes").checked = s.show_quotes !== false;
      $("#toggleMusic").checked = s.show_music_player !== false;
      $("#toggleWeather").checked = s.show_weather !== false;
      $("#toggleMemo").checked = s.show_memo !== false;
      $("#toggleBookmarks").checked = s.show_bookmarks !== false;
    } catch (e) {
      console.error("Load appearance error:", e);
    }
  }

  function bindAppearanceEvents() {
    $("#darkModeSelect").addEventListener("change", async () => {
      const val = $("#darkModeSelect").value;
      await saveSetting("dark_mode", val);
      applyDarkModeNow(val);
      toast("Theme updated");
    });

    $("#languageSelect").addEventListener("change", async () => {
      const val = $("#languageSelect").value;
      await saveSetting("language", val);
      if (window.loadLang) {
        await window.loadLang(val);
        if (window.getAppState) window.getAppState().settings.language = val;
        toast("Language updated");
      }
    });

    $("#timeFormatSelect").addEventListener("change", async () => {
      await saveSetting("time_format", $("#timeFormatSelect").value);
      toast("Time format updated");
    });

    $("#quoteIntervalInput").addEventListener("change", async () => {
      const val = parseInt($("#quoteIntervalInput").value) || 10;
      await saveSetting("quote_interval", val);
      if (window.getAppState) window.getAppState().settings.quote_interval = val;
      toast("Quote interval saved");
    });

    ["Quotes","Music","Weather","Memo","Bookmarks"].forEach((name) => {
      $(`#toggle${name}`).addEventListener("change", async () => {
        const key = "show_" + name.toLowerCase()
          .replace("quotes", "quotes")
          .replace("music", "music_player")
          .replace("weather", "weather")
          .replace("memo", "memo")
          .replace("bookmarks", "bookmarks");
        await saveSetting(key, $(`#toggle${name}`).checked);
        toast(`${name} ${$(`#toggle${name}`).checked ? "已开启" : "已关闭"}，刷新后生效`);
      });
    });
  }

  function applyDarkModeNow(mode) {
    if (mode === "auto") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
    } else {
      document.documentElement.setAttribute("data-theme", mode);
    }
  }

  async function saveSetting(key, value) {
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
    } catch (e) { /* ignore */ }
  }

  // ─── System Settings ─────────────────────────────────────
  async function loadSystemSettings() {
    try {
      const [settingsResp, quotesResp] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/quotes"),
      ]);
      const s = await settingsResp.json();
      const q = await quotesResp.json();

      $("#quotesTextarea").value = (q.quotes || []).join("\n\n");
      $("#weatherCityInput").value = s.weather_city || "";

      // Music settings
      $("#musicIdInput").value = s.music_id || "6895409634";
      $("#musicServerSelect").value = s.music_server || "netease";
      $("#musicTypeSelect").value = s.music_type || "playlist";
      $("#musicOrderSelect").value = s.music_order || "random";
      $("#musicVolumeSlider").value = s.music_volume ?? 0.7;
      $("#musicVolumeVal").textContent = s.music_volume ?? 0.7;
      $("#musicThemeInput").value = s.music_theme || "#2EA7E0";
      $("#musicPreloadSelect").value = s.music_preload || "auto";
      $("#musicAutoplayCheck").checked = s.music_autoplay === true;
      $("#musicFixedCheck").checked = s.music_fixed !== false;
      $("#musicListFoldedCheck").checked = s.music_list_folded !== false;

      // Music volume slider live update
      $("#musicVolumeSlider").oninput = () => {
        $("#musicVolumeVal").textContent = $("#musicVolumeSlider").value;
      };
    } catch (e) {
      console.error("Load system settings error:", e);
    }
  }

  function bindSystemEvents() {
    $("#btnSaveQuotes").addEventListener("click", async () => {
      const texts = $("#quotesTextarea").value;
      await fetch("/api/quotes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts }),
      });
      toast("Quotes saved");
    });

    $("#btnLockCity").addEventListener("click", async () => {
      const city = $("#weatherCityInput").value.trim();
      if (!city) { toast("Please enter city name"); return; }
      await fetch("/api/weather-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, locked: true }),
      });
      toast(`天气城市已锁定为: ${city}`);
    });

    $("#btnUnlockCity").addEventListener("click", async () => {
      await fetch("/api/weather-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: "", locked: false }),
      });
      $("#weatherCityInput").value = "";
      toast("City lock released");
    });

    // Save music settings
    $("#btnSaveMusic").addEventListener("click", async () => {
      const musicSettings = {
        music_id: $("#musicIdInput").value.trim(),
        music_server: $("#musicServerSelect").value,
        music_type: $("#musicTypeSelect").value,
        music_order: $("#musicOrderSelect").value,
        music_volume: parseFloat($("#musicVolumeSlider").value),
        music_theme: $("#musicThemeInput").value,
        music_preload: $("#musicPreloadSelect").value,
        music_autoplay: $("#musicAutoplayCheck").checked,
        music_fixed: $("#musicFixedCheck").checked,
        music_list_folded: $("#musicListFoldedCheck").checked,
      };

      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(musicSettings),
      });

      if (window.getAppState) {
        Object.assign(window.getAppState().settings, musicSettings);
      }
      toast("Music settings saved");
    });

    // Restore music defaults
    $("#btnRestoreMusicDefaults").addEventListener("click", async () => {
      const defaults = window.MUSIC_DEFAULTS || {
        music_id: "6895409634",
        music_server: "netease",
        music_type: "playlist",
        music_fixed: true,
        music_autoplay: false,
        music_order: "random",
        music_volume: 0.7,
        music_theme: "#2EA7E0",
        music_preload: "auto",
        music_list_folded: true,
      };

      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(defaults),
      });

      if (window.getAppState) {
        Object.assign(window.getAppState().settings, defaults);
      }

      // Update UI
      $("#musicIdInput").value = defaults.music_id;
      $("#musicServerSelect").value = defaults.music_server;
      $("#musicTypeSelect").value = defaults.music_type;
      $("#musicOrderSelect").value = defaults.music_order;
      $("#musicVolumeSlider").value = defaults.music_volume;
      $("#musicVolumeVal").textContent = defaults.music_volume;
      $("#musicThemeInput").value = defaults.music_theme;
      $("#musicPreloadSelect").value = defaults.music_preload;
      $("#musicAutoplayCheck").checked = defaults.music_autoplay;
      $("#musicFixedCheck").checked = defaults.music_fixed;
      $("#musicListFoldedCheck").checked = defaults.music_list_folded;

      toast("Music defaults restored");
    });

    $("#btnExportBackup").addEventListener("click", async () => {
      window.location.href = "/api/backup";
      toast("Preparing backup");
    });
  }

  // ─── Init ────────────────────────────────────────────────
  function init() {
    initTabs();
    bindAppearanceEvents();
    bindSystemEvents();

    $("#btnAddEngine").addEventListener("click", addEngine);
    $("#btnAddBookmark").addEventListener("click", addBookmark);
    $("#btnUploadWallpaper").addEventListener("click", uploadWallpaper);
  }

  // ─── Helpers ─────────────────────────────────────────────
  function escHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  document.addEventListener("DOMContentLoaded", init);
})();
