function isWeightedList(value, label, errors) {
  if (!Array.isArray(value)) {
    errors.push(`${label}: expected an array`);
    return;
  }
  value.forEach((item, i) => {
    if (typeof item !== "object" || item === null) {
      errors.push(`${label}[${i}]: expected an object`);
      return;
    }
    if (typeof item.name !== "string" || !item.name) {
      errors.push(`${label}[${i}].name: expected a non-empty string`);
    }
    if (typeof item.weight !== "number" || !Number.isFinite(item.weight) || item.weight < 0) {
      errors.push(`${label}[${i}].weight: expected a non-negative number`);
    }
  });
}

function validateFeatures(data) {
  const errors = [];
  if (typeof data !== "object" || data === null) {
    return ["features.js: expected an object at the top level"];
  }
  for (const key of ["weight", "height", "skintone", "features"]) {
    if (!(key in data)) {
      errors.push(`features.js: missing required key "${key}"`);
      continue;
    }
    isWeightedList(data[key], `features.js.${key}`, errors);
  }
  return errors;
}

function validateLocations(data) {
  const errors = [];
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return ["locations.js: expected an object keyed by location name"];
  }
  const keys = Object.keys(data);
  if (keys.length === 0) {
    errors.push("locations.js: no locations defined");
  }
  for (const location of keys) {
    isWeightedList(data[location], `locations.js["${location}"]`, errors);
  }
  return errors;
}

function validateArchetypes(data) {
  const errors = [];
  if (typeof data !== "object" || data === null || !Array.isArray(data.ancestries)) {
    return [`archetypes.js: expected { ancestries: [...] }`];
  }
  data.ancestries.forEach((ancestry, i) => {
    const label = `archetypes.js.ancestries[${i}]`;
    if (typeof ancestry !== "object" || ancestry === null) {
      errors.push(`${label}: expected an object`);
      return;
    }
    if (typeof ancestry.name !== "string" || !ancestry.name) {
      errors.push(`${label}.name: expected a non-empty string`);
    }
    if (ancestry.archetypes !== undefined && !Array.isArray(ancestry.archetypes)) {
      errors.push(`${label}.archetypes: expected an array when present`);
    }
  });
  return errors;
}
