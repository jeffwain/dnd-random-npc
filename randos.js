var weight = [
  ["of average build", 30],
  ["chubby", 4],
  ["heavyset", 4],
  ["fat", 2],
  ["thin", 4],
  ["delicately framed", 2],
  ["slight", 2],
  ["athletic", 10],
  ["muscular", 3],
  ["jacked", 3],
  ["wide-shouldered", 3]
];
var height = [
  ["tall", 40],
  ["of average height", 160],
  ["short", 40],
  ["tiny", 1],
  ["huge", 1]
]
var skintone = [
  ["very light", 20],
  ["light", 40],
  ["medium", 160],
  ["dark", 40],
  ["very dark", 20],
  ["uniquely", 5]
]
var features = [
  ["are very attractive", 20],
  ["are very ugly", 20],
  ["have poor hygiene", 20],
  ["wear rags", 8],
  ["are overdressed", 20],
  ["wear a hat", 20],
  ["wear baggy clothes", 20],
  ["wear tight-fitting clothes", 20],
  ["wear ill-fitting clothes", 20],
  ["wear made-to-measure clothes", 20],
  ["wear revealing clothes", 20],
  ["wear colorful clothes", 20],
  ["wear ill-fitting clothes", 20],
  ["are bald (or are wearing a scarf)", 20],
  ["have short hair", 20],
  ["have curly hair", 20],
  ["have long hair", 20],
  ["have grey hair", 20],
  ["have messy hair", 20],
  ["have an oblong head", 20],
  ["have a round head", 20],
  ["have a long head", 20],
  ["have a square head", 20],
  ["have a distinctive face", 20],
  ["have have kind eyes", 20],
  ["have shifty eyes", 20],
  ["have weary eyes", 20],
  ["have piercing eyes", 20],
  ["have wide eyes", 20],
  ["have wide nose", 20],
  ["have a permanent smirk on their face", 20],
  ["have a permanent smile on their face", 20],
  ["have a permanent scowl on their face", 20],
  ["have distinctive dimples", 20],
  ["have deep frown lines", 20],
  ["have a hooked nose", 20],
  ["have a small nose", 20],
  ["have a snub nose", 20],
  ["have a long nose", 20],
  ["have big ears", 20],
  ["have freckles", 20],
  ["have a mole or mark", 20],
  ["have wrinkles", 20],
  ["have piercings", 20],
  ["have tattoos", 20],
  ["are scarred", 3],
  ["are badly scarred", 1],
  ["have a unibrow", 20],
  ["have crooked teeth", 5],
  ["have a missing tooth", 5],
  ["have a peg leg", 2],
  ["walk with a limp", 2],
  ["are in a wheelchair", 1],
  ["are missing an arm", 3],
  ["have a prosthetic hand", 3],
  ["have poor posture", 10],
  ["have undead properties", 1],
  ["have elemental features", 1],
  ["are corrupted from The Shattering", 1],
  ["have ghostly properties", 1],
  ["have ethereal properties", 1]
];

function getRandom(data) {
  // First, we loop the main dataset to count up the total weight.
  // We're starting the counter at one because the upper boundary
  // of Math.random() is exclusive.
  let total = 0;
  for (let i = 0; i < data.length; ++i) {
    total += data[i][1];
  }

  // Total in hand, we can now pick a random value akin to our
  // random index from before.
  const threshold = Math.random() * total;

  // Now we just need to loop through the main data one more time
  // until we discover which value would live within this
  // particular threshold. We need to keep a running count of
  // weights as we go, so let's just reuse the "total" variable
  // since it was already declared.
  total = 0;
  for (let i = 0; i < data.length - 1; ++i) {
    // Add the weight to our running total.
    total += data[i][1];

    // If this value falls within the threshold, we're done!
    if (total >= threshold) {
      return data[i][0];
    }
  }

  // Wouldn't you know it, we needed the very last entry!
  return data[data.length - 1][0];
}

function getRandomRace(data) {
  // First, we loop the main dataset to count up the total weight.
  // We're starting the counter at one because the upper boundary
  // of Math.random() is exclusive.
  let total = 0;
  for (let i = 0; i < data.length; ++i) {
    total += data[i][1];
  }

  // Total in hand, we can now pick a random value akin to our
  // random index from before.
  const threshold = Math.random() * total;

  // Now we just need to loop through the main data one more time
  // until we discover which value would live within this
  // particular threshold. We need to keep a running count of
  // weights as we go, so let's just reuse the "total" variable
  // since it was already declared.
  total = 0;
  for (let i = 0; i < data.length - 1; ++i) {
    // Add the weight to our running total.
    total += data[i][1];

    // If this value falls within the threshold, we're done!
    if (total >= threshold) {
      return data[i];
    }
  }

  // Wouldn't you know it, we needed the very last entry!
  return data[data.length - 1];
}



function getDistinctFeatures() {
  var distinctions = [];
  
  while (distinctions.length < 2) {
    var feature = getRandom(features);
    if (distinctions.length == 0 || (distinctions.length > 0 && distinctions[0] != feature)) {
      distinctions.push(feature);
    }
  }

  if (distinctions[0].includes("have")){
    distinctions[1] = distinctions[1].replace("have ", "");
  }
  if (distinctions[0].includes("are")) {
    distinctions[1] = distinctions[1].replace("are ", "");
  }
  console.log(distinctions);
  return distinctions;
}

function getRace(location) {
  var type = races[location];
  var race = getRandomRace(type);
  var halfRace = getRandomRace(type);
  var toReturn = race[0];

  console.log(race);
  var d = Math.random();

  // If this is a descriptor race
  if (race.length > 2 && race[2] == "type") {
    console.log(race[0]);

    // 30% chance to be a mixed race of that type
    var t = Math.random();
    if (t <= 0.40) {
      // Make sure the 2nd race isn't a descriptor race
      while (halfRace[0] == race[0] || (halfRace.length > 2 && halfRace[2] !== "type")) {
        halfRace = getRandomRace(type);
      }
      toReturn = race[0] + " " + halfRace[0];
    }
  }

  else if (d < 0.10) {
    while (halfRace[0] == race[0] || halfRace.length > 2) {
      halfRace = getRandomRace(type);
    }
    toReturn = "half " + halfRace[0] + " / " + race[0];
  }

  console.log(toReturn);

  var vowels = "aeiouAEIOU";
  var prefix = "a ";
  if (vowels.includes(race[0]))
  {
    prefix =  "an ";
  }
  
  return prefix + "<strong>" + toReturn + "</strong>";
}

function getRando(location) {
  document.getElementById("race").innerHTML = getRace(location);
  document.getElementById("build").innerHTML = getRandom(weight);
  document.getElementById("height").innerHTML = getRandom(height);
  document.getElementById("skintone").innerHTML = getRandom(skintone);
  var distinctFeatures = getDistinctFeatures();
  document.getElementById("feature1").innerHTML = distinctFeatures[0];
  document.getElementById("feature2").innerHTML = distinctFeatures[1];
}

function main() {
  getRando("Quaymire");
}
window.onload = main;