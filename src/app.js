var locationData = null;
var featureData = null;
var archetypeData = null;

function reportDataErrors(file, errors) {
  if (errors.length === 0) return;
  console.error(`Invalid ${file}:`, errors);
  const el = document.getElementById("debug-output");
  if (el) {
    el.innerHTML =
      `<h3>Data error in ${file}</h3><ul>` +
      errors.map((e) => `<li>${e}</li>`).join("") +
      `</ul>`;
  }
}

function displayLocationButtons() {
  const container = document.getElementById("location-buttons");
  container.replaceChildren();
  for (const location in locationData) {
    const button = document.createElement("a");
    button.className = "button";
    button.href = "#";
    button.textContent = location;
    button.addEventListener("click", (evt) => {
      evt.preventDefault();
      generateAncestry(location);
    });
    container.appendChild(button);
  }
}

function generateAncestry(location) {
  const ancestries = locationData[location];
  if (!ancestries) return;

  const selectedAncestry = getRandom(ancestries);

  let displayName = selectedAncestry.name;
  let debugInfo = {
    rolledAncestry: selectedAncestry,
    availableArchetypes: null,
  };

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

        const archetypeList = locationArchetypes.length > 0
          ? locationArchetypes
          : combinedArchetypes.map((a) =>
              typeof a === "string" ? { name: a, weight: 1 } : a
            );

        const randomArchetype = getRandom(archetypeList);

        if (randomArchetype) {
          const archetypeName =
            typeof randomArchetype === "string" ? randomArchetype : randomArchetype.name;
          displayName = `${selectedAncestry.name} (${archetypeName})`;
          debugInfo.availableArchetypes = archetypeList.map((a) =>
            typeof a === "string" ? a : a.name
          );
          debugInfo.selectedArchetype = archetypeName;
          debugInfo.archetypeWeights = archetypeList
            .map((a) => (typeof a === "string" ? `${a}: 1` : `${a.name}: ${a.weight}`))
            .join(", ");
          debugInfo.sources = matchingAncestries.map((a) => a.source).join(", ");
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

  document.getElementById("build").textContent = buildResult;
  document.getElementById("height").textContent = heightResult;
  document.getElementById("skintone").textContent = skintoneResult;
  document.getElementById("feature1").textContent = distinctFeatures[0];
  document.getElementById("feature2").textContent = distinctFeatures[1];

  document.getElementById("debug-output").innerHTML =
    `<h3>Rolled Details</h3>` +
    `<h4>Ancestry Info</h4>` +
    `<ul>` +
    `<li><span class="label">Name:</span> ${selectedAncestry.name}</li>` +
    `<li><span class="label">Weight:</span> ${selectedAncestry.weight || 1}</li>` +
    `<li><span class="label">Source:</span> ${selectedAncestry.source || "Any"}</li>` +
    `</ul>` +
    (debugInfo.availableArchetypes
      ? `<ul>` +
        `<li><span class="label">Available Archetypes:</span> ${debugInfo.availableArchetypes.join(", ")}</li>` +
        `<li><span class="label">Archetype Weights:</span> ${debugInfo.archetypeWeights}</li>` +
        `<li><span class="label">Selected Archetype:</span> ${debugInfo.selectedArchetype}</li>` +
        `<li><span class="label">Available Sources:</span> ${debugInfo.sources}</li>` +
        `</ul>`
      : `<p>No archetypes available for this ancestry</p>`) +
    `<h4>Randomized Traits</h4>` +
    `<ul>` +
    `<li><span class="label">Height:</span> ${heightResult}</li>` +
    `<li><span class="label">Build:</span> ${buildResult}</li>` +
    `<li><span class="label">Skin tone:</span> ${skintoneResult}</li>` +
    `<li><span class="label">Features:</span>` +
    `<ul>` +
    `<li>${distinctFeatures[0]}</li>` +
    `<li>${distinctFeatures[1]}</li>` +
    `</ul>` +
    `</li>` +
    `</ul>` +
    `<p>Location: ${location}</p>`;
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
    setTimeout(() => { link.textContent = originalText; }, 1000);
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
