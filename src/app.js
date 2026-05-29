var locationData = null;
var featureData = null;
var archetypeData = null;
var ancestrySelections = null;

function reportDataErrors(file, errors) {
  if (errors.length === 0) return;
  console.error(`Invalid ${file}:`, errors);
  const el = document.getElementById("debug-output");
  if (el) {
    el.setAttribute("data-has-errors", "");
    el.innerHTML =
      `<h3>Data error in ${file}</h3><ul>` +
      errors.map((e) => `<li>${e}</li>`).join("") +
      `</ul>`;
  }
}

var locationPathObserver = null;

// Tab diamond center in strip-local coordinates
function tabCenterX(tab, containerRect) {
  const r = tab.getBoundingClientRect();
  return r.left - containerRect.left + r.width / 2;
}

// Sample the wave with mandatory knots so every segment shares exact junction points
function buildWavePoints(xMin, xMax, step, waveY, knotXs) {
  const xs = new Set();
  for (let x = xMin; x <= xMax; x += step) xs.add(x);
  for (const x of knotXs) {
    if (x >= xMin && x <= xMax) xs.add(x);
  }
  return Array.from(xs)
    .sort((a, b) => a - b)
    .map((x) => [x, waveY(x)]);
}

function indexAtX(pts, x) {
  for (let i = 0; i < pts.length; i++) {
    if (Math.abs(pts[i][0] - x) < 0.05) return i;
  }
  return -1;
}

// Catmull-Rom slice of the global point list — smooth at shared knots between segments
function pathDFromPoints(pts, iStart, iEnd) {
  let d = `M ${pts[iStart][0].toFixed(1)} ${pts[iStart][1].toFixed(1)}`;
  for (let j = iStart + 1; j <= iEnd; j++) {
    const p0 = pts[Math.max(j - 2, 0)];
    const p1 = pts[j - 1];
    const p2 = pts[j];
    const p3 = pts[Math.min(j + 1, pts.length - 1)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

function appendSegmentGradient(defs, gradId, x1, x2, ruleColor, NS) {
  const grad = document.createElementNS(NS, 'linearGradient');
  grad.setAttribute('id', gradId);
  grad.setAttribute('gradientUnits', 'userSpaceOnUse');
  grad.setAttribute('x1', String(x1));
  grad.setAttribute('y1', '0');
  grad.setAttribute('x2', String(x2));
  grad.setAttribute('y2', '0');
  [
    [0, 0],
    [0.08, 1],
    [0.92, 1],
    [1, 0],
  ].forEach(([offset, opacity]) => {
    const stop = document.createElementNS(NS, 'stop');
    stop.setAttribute('offset', `${offset * 100}%`);
    stop.setAttribute('stop-color', ruleColor);
    stop.setAttribute('stop-opacity', String(opacity));
    grad.appendChild(stop);
  });
  defs.appendChild(grad);
}

function drawLocationPath(container) {
  const existing = container.querySelector('.location-path-svg');
  if (existing) existing.remove();

  const tabs = Array.from(container.querySelectorAll('.location-tab'));
  if (tabs.length < 2) return;

  const containerRect = container.getBoundingClientRect();
  const width = container.scrollWidth;
  const height = container.clientHeight || 56;
  const NS = 'http://www.w3.org/2000/svg';

  // centerY matches the diamond ::before center: padding-top(16) + half-diamond(3.5) ≈ 20
  const centerY = 20;
  const amplitude = 4;
  const step = 44;

  const waveY = (x) =>
    centerY
    + Math.sin(x * 0.031) * amplitude
    + Math.sin(x * 0.073) * amplitude * 0.45
    + Math.sin(x * 0.018) * amplitude * 0.65;

  const tabXs = tabs.map((tab) => tabCenterX(tab, containerRect));
  // Breakpoints: strip edges plus each location diamond center
  const knotXs = [0, ...tabXs, width];
  const globalPts = buildWavePoints(0, width, step, waveY, knotXs);

  const ruleColor = getComputedStyle(document.documentElement).getPropertyValue('--rule').trim();

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'location-path-svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  const defs = document.createElementNS(NS, 'defs');

  for (let i = 0; i < knotXs.length - 1; i++) {
    const x1 = knotXs[i];
    const x2 = knotXs[i + 1];
    if (x2 - x1 <= 0) continue;

    const iStart = indexAtX(globalPts, x1);
    const iEnd = indexAtX(globalPts, x2);
    if (iStart < 0 || iEnd < 0 || iEnd <= iStart) continue;

    const gradId = `seg-grad-${i}`;
    appendSegmentGradient(defs, gradId, x1, x2, ruleColor, NS);

    const pathEl = document.createElementNS(NS, 'path');
    pathEl.setAttribute('d', pathDFromPoints(globalPts, iStart, iEnd));
    pathEl.setAttribute('stroke', `url(#${gradId})`);
    pathEl.setAttribute('stroke-width', '1');
    pathEl.setAttribute('stroke-dasharray', '3 8');
    pathEl.setAttribute('stroke-linecap', 'round');
    pathEl.setAttribute('fill', 'none');
    svg.appendChild(pathEl);
  }

  svg.insertBefore(defs, svg.firstChild);
  container.appendChild(svg);
}

function observeLocationPath(container) {
  if (locationPathObserver) locationPathObserver.disconnect();
  locationPathObserver = new ResizeObserver(() => drawLocationPath(container));
  locationPathObserver.observe(container);
}

function displayLocationButtons() {
  const container = document.getElementById("location-buttons");
  container.replaceChildren();
  let index = 0;
  for (const location in locationData) {
    const tab = document.createElement("a");
    tab.className = "location-tab";
    tab.href = "#";
    tab.textContent = location;
    tab.dataset.location = location;
    tab.style.animationDelay = `${index * 70}ms`;
    tab.addEventListener("click", (evt) => {
      evt.preventDefault();
      generateAncestry(location);
    });
    container.appendChild(tab);
    index++;
  }
  requestAnimationFrame(() => {
    drawLocationPath(container);
    observeLocationPath(container);
  });
}

function setActiveTab(location) {
  document.querySelectorAll(".location-tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.location === location);
  });
  const strip = document.getElementById("location-buttons");
  if (strip) requestAnimationFrame(() => drawLocationPath(strip));
}

function setTraitRoster({ ancestryName, archetypeName, source, height, build, skin, features }) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || "None";
  };
  set("trait-ancestry", ancestryName);
  set("trait-archetype", archetypeName);
  set("trait-source", source || "Any");
  set("trait-height", height);
  set("trait-build", build);
  set("trait-skin", skin);
  set("trait-features", features);
}

function generateAncestry(location) {
  const content = document.querySelector('.parchment-content');
  const hasContent = content.classList.contains('content-loaded');

  function applyUpdate() {
    const ancestries = locationData[location];
    if (!ancestries) return;

    const selectedAncestry = getRandom(ancestries);

    let displayName = selectedAncestry.name;
    let archetypeName = null;

    if (archetypeData) {
      const matchingAncestries = !selectedAncestry?.source
        ? archetypeData.ancestries.filter(
            (a) => a.name === selectedAncestry.name || a.name === selectedAncestry
          )
        : [
            archetypeData.ancestries.find(
              (a) =>
                (a.name === selectedAncestry.name || a.name === selectedAncestry) &&
                a.source === selectedAncestry.source
            ),
          ].filter(Boolean);

      if (matchingAncestries.length > 0) {
        const combinedArchetypes = matchingAncestries.reduce((acc, ancestry) => {
          if (ancestry.archetypes?.length > 0) {
            acc.push(...ancestry.archetypes);
          }
          return acc;
        }, []);

        if (combinedArchetypes.length > 0) {
          const locationArchetypes = !selectedAncestry?.source
            ? combinedArchetypes
            : selectedAncestry.archetypes || [];

          const archetypeList =
            locationArchetypes.length > 0
              ? locationArchetypes
              : combinedArchetypes.map((a) =>
                  typeof a === "string" ? { name: a, weight: 1 } : a
                );

          const randomArchetype = getRandom(archetypeList);

          if (randomArchetype) {
            archetypeName =
              typeof randomArchetype === "string" ? randomArchetype : randomArchetype.name;
            displayName = `${selectedAncestry.name} (${archetypeName})`;
          }
        }
      }
    }

    const vowels = "aeiouAEIOU";
    const prefix = vowels.includes(displayName[0]) ? "an " : "a ";
    document.getElementById("ancestry").innerHTML =
      prefix + "<strong>" + displayName + "</strong>";

    const heightResult = getRandom(featureData.height).name;
    const buildResult = getRandom(featureData.weight).name;
    const skintoneResult = getRandom(featureData.skintone).name;
    const distinctFeatures = getDistinctFeatures(featureData.features);

    document.getElementById("height").textContent = heightResult;
    document.getElementById("build").textContent = buildResult;
    document.getElementById("skintone").textContent = skintoneResult;
    document.getElementById("feature1").textContent = distinctFeatures[0];
    document.getElementById("feature2").textContent = distinctFeatures[1];

    setActiveTab(location);
    setTraitRoster({
      ancestryName: selectedAncestry.name,
      archetypeName,
      source: selectedAncestry.source,
      height: heightResult,
      build: buildResult,
      skin: skintoneResult + " colored",
      features: distinctFeatures[0] + " and " + distinctFeatures[1],
    });

    content.classList.add('content-loaded');
    content.classList.remove('content-exit', 'content-enter');
    void content.offsetWidth;
    content.classList.add('content-enter');
  }

  if (hasContent) {
    content.classList.remove('content-enter');
    void content.offsetWidth;
    content.classList.add('content-exit');
    setTimeout(applyUpdate, 110);
  } else {
    applyUpdate();
  }
}

// ── Ancestry selection register ────────────────────────

function ancestryKey(ancestry) {
  return ancestry.name + "\x00" + (ancestry.source || "");
}

function initSelections() {
  ancestrySelections = new Map();
  archetypeData.ancestries.forEach(function (ancestry) {
    ancestrySelections.set(ancestryKey(ancestry), {
      selected: true,
      archetypes: new Set(ancestry.archetypes),
    });
  });
}

function getSelectedData() {
  var result = archetypeData.ancestries
    .filter(function (a) {
      return ancestrySelections.get(ancestryKey(a)).selected;
    })
    .map(function (a) {
      var sel = ancestrySelections.get(ancestryKey(a));
      return {
        name: a.name,
        source: a.source,
        archetypes: a.archetypes.filter(function (arch) {
          return sel.archetypes.has(arch);
        }),
      };
    });
  result.sort(function (a, b) {
    var n = a.name.localeCompare(b.name);
    return n !== 0 ? n : (a.source || "").localeCompare(b.source || "");
  });
  return { ancestries: result };
}

function updateRegisterCount() {
  var total = archetypeData.ancestries.length;
  var selected = 0;
  ancestrySelections.forEach(function (sel) {
    if (sel.selected) selected++;
  });
  var el = document.getElementById("register-count");
  if (el) el.textContent = selected + " of " + total + " selected";
}

function updateJsonPreview() {
  var el = document.getElementById("ancestry-json");
  if (!el) return;
  el.textContent = JSON.stringify(getSelectedData(), null, 2);
}

function buildRegisterEntry(ancestry) {
  var key = ancestryKey(ancestry);
  var sel = ancestrySelections.get(key);

  var entry = document.createElement("div");
  entry.className = "register-entry";
  entry.dataset.ancestryKey = key;
  entry.dataset.selected = sel.selected ? "true" : "false";
  entry.setAttribute("role", "listitem");

  var row = document.createElement("div");
  row.className = "register-row";

  var diamond = document.createElement("button");
  diamond.type = "button";
  diamond.className = "register-diamond-btn";
  diamond.setAttribute("aria-label", (sel.selected ? "Deselect " : "Select ") + ancestry.name);
  diamond.setAttribute("aria-pressed", sel.selected ? "true" : "false");
  diamond.addEventListener("click", function () {
    var s = ancestrySelections.get(key);
    s.selected = !s.selected;
    entry.dataset.selected = s.selected ? "true" : "false";
    diamond.setAttribute("aria-pressed", s.selected ? "true" : "false");
    diamond.setAttribute("aria-label", (s.selected ? "Deselect " : "Select ") + ancestry.name);
    updateRegisterCount();
    updateJsonPreview();
  });

  var name = document.createElement("span");
  name.className = "register-name";
  name.textContent = ancestry.name;

  var source = document.createElement("span");
  source.className = "register-source";
  source.textContent = ancestry.source || "";

  row.appendChild(diamond);
  row.appendChild(name);
  row.appendChild(source);
  entry.appendChild(row);

  if (ancestry.archetypes && ancestry.archetypes.length > 0) {
    var sortedArchetypes = ancestry.archetypes.slice().sort();
    var group = document.createElement("div");
    group.className = "register-archetypes";

    sortedArchetypes.forEach(function (archetype) {
      var isSelected = sel.archetypes.has(archetype);

      var aRow = document.createElement("div");
      aRow.className = "register-archetype";
      aRow.dataset.selected = isSelected ? "true" : "false";

      var aDiamond = document.createElement("button");
      aDiamond.type = "button";
      aDiamond.className = "register-diamond-btn register-diamond-btn--sub";
      aDiamond.setAttribute("aria-label", (isSelected ? "Deselect " : "Select ") + archetype);
      aDiamond.setAttribute("aria-pressed", isSelected ? "true" : "false");
      aDiamond.addEventListener("click", function () {
        var s = ancestrySelections.get(key);
        if (s.archetypes.has(archetype)) {
          s.archetypes.delete(archetype);
        } else {
          s.archetypes.add(archetype);
        }
        var nowSelected = s.archetypes.has(archetype);
        aRow.dataset.selected = nowSelected ? "true" : "false";
        aDiamond.setAttribute("aria-pressed", nowSelected ? "true" : "false");
        aDiamond.setAttribute("aria-label", (nowSelected ? "Deselect " : "Select ") + archetype);
        updateJsonPreview();
      });

      var aName = document.createElement("span");
      aName.className = "register-name register-name--sub";
      aName.textContent = archetype;

      aRow.appendChild(aDiamond);
      aRow.appendChild(aName);
      group.appendChild(aRow);
    });

    entry.appendChild(group);
  }

  return entry;
}

async function downloadSelectedArchetypes(btn, evt) {
  evt.preventDefault();
  var filtered = getSelectedData();
  var contents = "var archetypesData = " + JSON.stringify(filtered, null, 2) + ";\n";
  try {
    var saved = await saveFileWithPicker("archetypes.js", contents, "text/javascript");
    if (saved === false) saved = downloadViaAnchor("archetypes.js", contents, "text/javascript");
    if (saved) flashButtonLabel(btn, "Saved");
  } catch (err) {
    console.error("Failed to save file: ", err);
    flashButtonLabel(btn, "Failed");
  }
}

function showAncestryList() {
  var sorted = archetypeData.ancestries.slice().sort(function (a, b) {
    var n = a.name.localeCompare(b.name);
    return n !== 0 ? n : (a.source || "").localeCompare(b.source || "");
  });

  var list = document.getElementById("register-list");
  list.replaceChildren();
  sorted.forEach(function (ancestry) {
    list.appendChild(buildRegisterEntry(ancestry));
  });

  updateRegisterCount();
  updateJsonPreview();

  var locationTemplate = {
    Random: archetypeData.ancestries.map(function (ancestry) {
      return { name: ancestry.name, source: ancestry.source, roll: 1, weight: 1 };
    }),
  };
  document.getElementById("location-json").textContent = JSON.stringify(locationTemplate, null, 2);

  document.querySelectorAll("[data-download-kind]").forEach(function (btn) {
    var label = dataFileUsesJsModule(btn.dataset.downloadKind) ? "Download JS" : "Download JSON";
    btn.textContent = label;
    btn.dataset.originalLabel = label;
  });

  document.getElementById("ancestry-list").style.display = "block";
}

function hideAncestryList() {
  document.getElementById("ancestry-list").style.display = "none";
}

// Mirrors script tags in index.html — used for save filename and module wrapper.
var DATA_FILE_CONFIG = {
  archetypes: { scriptMatch: "archetypes", varName: "archetypesData", defaultSrc: "data/archetypes.js" },
  locations: { scriptMatch: "locations", varName: "locationsData", defaultSrc: "data/locations.js" },
};

function dataFileUsesJsModule(kind) {
  const cfg = DATA_FILE_CONFIG[kind];
  const script = document.querySelector('script[src*="' + cfg.scriptMatch + '"]');
  const src = script ? script.getAttribute("src") : cfg.defaultSrc;
  return src.endsWith(".js");
}

function getDownloadSpec(kind) {
  const cfg = DATA_FILE_CONFIG[kind];
  const usesJs = dataFileUsesJsModule(kind);
  const basename = cfg.scriptMatch === "archetypes" ? "archetypes" : "locations";
  return {
    filename: usesJs ? basename + ".js" : basename + ".json",
    mime: usesJs ? "text/javascript" : "application/json",
    varName: cfg.varName,
    usesJs: usesJs,
  };
}

function formatDownloadContent(elementId, kind) {
  const text = document.getElementById(elementId).textContent;
  const spec = getDownloadSpec(kind);
  if (spec.usesJs) {
    return "var " + spec.varName + " = " + text + ";\n";
  }
  return text;
}

function flashButtonLabel(btn, label, ms = 1000) {
  if (!btn.dataset.originalLabel) btn.dataset.originalLabel = btn.textContent;
  btn.textContent = label;
  setTimeout(() => {
    btn.textContent = btn.dataset.originalLabel;
  }, ms);
}

async function copyToClipboard(elementId, evt) {
  const element = document.getElementById(elementId);
  const btn = evt.currentTarget;
  try {
    await navigator.clipboard.writeText(element.textContent);
    flashButtonLabel(btn, "Copied");
  } catch (err) {
    console.error("Failed to copy text: ", err);
    flashButtonLabel(btn, "Failed");
  }
}

async function saveFileWithPicker(filename, contents, mimeType) {
  if (!window.showSaveFilePicker) return false;
  const ext = filename.slice(filename.lastIndexOf("."));
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: filename,
      types: [{ description: "Data file", accept: { [mimeType]: [ext] } }],
    });
    const writable = await handle.createWritable();
    await writable.write(contents);
    await writable.close();
    return true;
  } catch (err) {
    if (err.name === "AbortError") return null;
    throw err;
  }
}

function downloadViaAnchor(filename, contents, mimeType) {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return true;
}

async function downloadDataFile(btn, evt) {
  evt.preventDefault();
  const elementId = btn.dataset.download;
  const kind = btn.dataset.downloadKind;
  const spec = getDownloadSpec(kind);
  const contents = formatDownloadContent(elementId, kind);
  try {
    let saved = await saveFileWithPicker(spec.filename, contents, spec.mime);
    if (saved === false) saved = downloadViaAnchor(spec.filename, contents, spec.mime);
    if (saved) flashButtonLabel(btn, "Saved");
  } catch (err) {
    console.error("Failed to save file: ", err);
    flashButtonLabel(btn, "Failed");
  }
}

function bindUiHandlers() {
  document.querySelector('[data-action="show-ancestry-list"]').addEventListener("click", (evt) => {
    evt.preventDefault();
    showAncestryList();
  });
  document.querySelector('[data-action="hide-ancestry-list"]').addEventListener("click", (evt) => {
    evt.preventDefault();
    hideAncestryList();
  });
  document.querySelectorAll("[data-copy-target]").forEach((btn) => {
    btn.addEventListener("click", (evt) => {
      evt.preventDefault();
      copyToClipboard(btn.dataset.copyTarget, evt);
    });
  });
  document.querySelectorAll("[data-download]").forEach((btn) => {
    btn.addEventListener("click", (evt) => downloadDataFile(btn, evt));
  });

  var showToggle = document.getElementById("show-deselected-toggle");
  if (showToggle) {
    showToggle.addEventListener("click", function () {
      var isShowing = this.getAttribute("aria-pressed") === "true";
      this.setAttribute("aria-pressed", isShowing ? "false" : "true");
      this.textContent = isShowing ? "Show deselected" : "Hide deselected";
      document.getElementById("register-list").classList.toggle("register-list--show-all", !isShowing);
    });
  }

  var downloadBtn = document.getElementById("download-selected-btn");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", function (evt) {
      downloadSelectedArchetypes(this, evt);
    });
  }
}

window.addEventListener("DOMContentLoaded", function () {
  bindUiHandlers();

  var featErrors = validateFeatures(featuresData);
  if (featErrors.length) { reportDataErrors("features.js", featErrors); return; }
  featureData = featuresData;

  var locErrors = validateLocations(locationsData);
  if (locErrors.length) { reportDataErrors("locations.js", locErrors); return; }
  locationData = locationsData;
  displayLocationButtons();

  var archErrors = validateArchetypes(archetypesData);
  if (archErrors.length) { reportDataErrors("archetypes.js", archErrors); return; }
  archetypeData = archetypesData;
  initSelections();

  var firstLocation = Object.keys(locationData)[0];
  if (firstLocation) generateAncestry(firstLocation);
});
