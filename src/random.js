function getRandom(data) {
  let total = 0;
  for (const item of data) {
    total += item.weight;
  }

  const threshold = Math.random() * total;

  total = 0;
  for (const item of data) {
    total += item.weight;
    if (total >= threshold) {
      return item;
    }
  }

  return data[data.length - 1];
}

function getDistinctFeatures(features) {
  const distinctions = [];

  while (distinctions.length < 2) {
    const feature = getRandom(features);
    if (distinctions.length === 0 || distinctions[0] !== feature.name) {
      distinctions.push(feature.name);
    }
  }

  if (distinctions[0].startsWith("have ")) {
    distinctions[1] = distinctions[1].replace(/^have /, "");
  }
  if (distinctions[0].startsWith("are ")) {
    distinctions[1] = distinctions[1].replace(/^are /, "");
  }

  return distinctions;
}
