var locationData = null;
var featureData = null;
var archetypeData = null;

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

function drawLocationPath(container) {
  const existing = container.querySelector('.location-path-svg');
  if (existing) existing.remove();

  const width = container.scrollWidth;
  const height = container.clientHeight || 56;
  const centerY = 20;
  const amplitude = 4;
  const NS = 'http://www.w3.org/2000/svg';

  // Wavy path: layered sines sampled at fixed intervals, smoothed via Catmull-Rom
  const step = 44;
  const pts = [];
  const waveY = (x) =>
    centerY
    + Math.sin(x * 0.031) * amplitude
    + Math.sin(x * 0.073) * amplitude * 0.45
    + Math.sin(x * 0.018) * amplitude * 0.65;

  for (let x = 0; x <= width; x += step) pts.push([x, waveY(x)]);
  if (pts[pts.length - 1][0] < width) pts.push([width, waveY(width)]);

  // Catmull-Rom → cubic bezier
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[Math.max(i - 2, 0)];
    const p1 = pts[i - 1];
    const p2 = pts[i];
    const p3 = pts[Math.min(i + 1, pts.length - 1)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)} ${cp2x.toFixed(1)} ${cp2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }

  const ruleColor = getComputedStyle(document.documentElement).getPropertyValue('--rule').trim();

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'location-path-svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  const defs = document.createElementNS(NS, 'defs');
  const grad = document.createElementNS(NS, 'linearGradient');
  grad.setAttribute('id', 'path-fade-grad');
  grad.setAttribute('gradientUnits', 'userSpaceOnUse');
  grad.setAttribute('x1', '0');
  grad.setAttribute('y1', '0');
  grad.setAttribute('x2', String(width));
  grad.setAttribute('y2', '0');
  [
    [0,    0  ],
    [0.10, 0.5],
    [0.18, 1  ],
    [0.82, 1  ],
    [0.90, 0.5],
    [1,    0  ],
  ].forEach(([offset, opacity]) => {
    const stop = document.createElementNS(NS, 'stop');
    stop.setAttribute('offset', `${offset * 100}%`);
    stop.setAttribute('stop-color', ruleColor);
    stop.setAttribute('stop-opacity', String(opacity));
    grad.appendChild(stop);
  });
  defs.appendChild(grad);
  svg.appendChild(defs);

  const pathEl = document.createElementNS(NS, 'path');
  pathEl.setAttribute('d', d);
  pathEl.setAttribute('stroke', 'url(#path-fade-grad)');
  pathEl.setAttribute('stroke-width', '1');
  pathEl.setAttribute('stroke-dasharray', '3 8');
  pathEl.setAttribute('stroke-linecap', 'round');
  pathEl.setAttribute('fill', 'none');
  svg.appendChild(pathEl);

  container.appendChild(svg);
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
  requestAnimationFrame(() => drawLocationPath(container));
}

function setActiveTab(location) {
  document.querySelectorAll(".location-tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.location === location);
  });
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

function showAncestryList() {
  archetypeData.ancestries.sort((a, b) => {
    const nameCompare = a.name.localeCompare(b.name);
    if (nameCompare !== 0) return nameCompare;
    return (a.source || "").localeCompare(b.source || "");
  });

  archetypeData.ancestries.forEach((ancestry) => {
    if (ancestry.archetypes) ancestry.archetypes.sort();
  });

  document.getElementById("ancestry-json").textContent = JSON.stringify(archetypeData, null, 2);

  const locationTemplate = {
    Random: archetypeData.ancestries.map((ancestry) => ({
      name: ancestry.name,
      source: ancestry.source,
      roll: 1,
      weight: 1,
    })),
  };

  document.getElementById("location-json").textContent = JSON.stringify(locationTemplate, null, 2);
  document.getElementById("ancestry-list").style.display = "block";
}

function hideAncestryList() {
  document.getElementById("ancestry-list").style.display = "none";
}

async function copyToClipboard(elementId, evt) {
  const element = document.getElementById(elementId);
  try {
    await navigator.clipboard.writeText(element.textContent);
    const link = evt.currentTarget;
    const originalText = link.textContent;
    link.textContent = "(copied!)";
    setTimeout(() => {
      link.textContent = originalText;
    }, 1000);
  } catch (err) {
    console.error("Failed to copy text: ", err);
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
  document.querySelectorAll("[data-copy-target]").forEach((link) => {
    link.addEventListener("click", (evt) => {
      evt.preventDefault();
      copyToClipboard(link.dataset.copyTarget, evt);
    });
  });
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

  var firstLocation = Object.keys(locationData)[0];
  if (firstLocation) generateAncestry(firstLocation);
});
