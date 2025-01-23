// Global state for storing loaded data
let locationData = null;  // Stores location-specific ancestry lists and weights
let ancestryData = null;  // Stores complete list of ancestries and their archetypes
let featureData = null;   // Stores physical features and their weights
let archetypeData = null; // Stores the direct mapping of ancestries to archetypes

/**
 * Loads the features.json file containing weighted lists of physical characteristics
 * including height, build, skin tone, and distinctive features.
 */
async function loadFeatures() {
  try {
    const response = await fetch('features.json');
    featureData = await response.json();
  } catch (error) {
    console.error('Error loading features:', error);
  }
}

/**
 * Loads the locations.json file containing location-specific ancestry lists.
 * After loading, displays the location buttons and generates an initial ancestry
 * from the first available location.
 */
async function loadLocations() {
  try {
    const response = await fetch('locations.json');
    locationData = await response.json();
    displayLocationButtons();
    
    // Get first location and generate an initial ancestry
    const firstLocation = Object.keys(locationData)[0];
    if (firstLocation) {
      generateAncestry(firstLocation);
    }
  } catch (error) {
    console.error('Error loading locations:', error);
  }
}

/**
 * Loads the archetypes.json file containing the mapping of ancestries to their archetypes.
 */
async function loadArchetypes() {
  try {
    const response = await fetch('archetypes.json');
    archetypeData = await response.json();
  } catch (error) {
    console.error('Error loading archetypes:', error);
  }
}

/**
 * Loads and processes all ancestry data from homebrew sources and races.json.
 * This includes:
 * 1. Loading the blocklist to filter out unwanted content
 * 2. Processing homebrew files from the index
 * 3. Processing the core races.json file
 * 4. Combining all data into a single ancestry list with archetypes
 */
async function loadAllHomebrewAncestries() {
  try {
    const ancestries = new Map(); // Store all ancestries
    const archetypes = new Map(); // Store all archetypes with their parent ancestry reference

    console.log('Starting ancestry loading process...');

    // Load and parse the blocklist
    const blocklistResponse = await fetch('../homebrew/content-blocklist.json');
    const blocklistData = await blocklistResponse.json();
    const blocklist = blocklistData.blocklist;
    console.log('Loaded blocklist:', blocklist);

    // Load and parse the homebrew index
    const indexResponse = await fetch('../homebrew/index.json');
    const indexData = await indexResponse.json();
    const homebrewFiles = indexData.toImport;
    console.log('Loaded homebrew files list:', homebrewFiles);

    // Process each homebrew file
    for (const file of homebrewFiles) {
      try {
        console.log(`Processing homebrew file ${file}...`);
        const fileResponse = await fetch(`../homebrew/${file}`);
        const data = await fileResponse.json();
        await processHomebrewFile(data, ancestries, archetypes, blocklist);
      } catch (error) {
        console.error(`Error processing homebrew file ${file}:`, error);
      }
    }

    // Load and process the additional races file
    console.log('Attempting to load races.json...');
    const racesResponse = await fetch('../data/races.json');
    if (!racesResponse.ok) {
      throw new Error(`HTTP error! status: ${racesResponse.status}`);
    }
    const racesData = await racesResponse.json();
    console.log('Successfully loaded races.json, processing data...');
    await processHomebrewFile(racesData, ancestries, archetypes, blocklist);
    console.log('Finished processing races.json');

    // Convert to final format
    ancestryData = {
      ancestries: Array.from(ancestries.values())
    };

    console.log('Final processed ancestries:', ancestryData);
  } catch (error) {
    console.error('Error in loadAllHomebrewAncestries:', error);
  }
}

/**
 * Processes a single homebrew file or races.json file to extract ancestry and archetype information.
 * Handles both metadata-based sources (homebrew) and direct sources (races.json).
 * Applies blocklist filtering and maintains archetype relationships.
 * 
 * @param {Object} data - The parsed JSON data from the file
 * @param {Map} ancestries - Map to store processed ancestries
 * @param {Map} archetypes - Map to store processed archetypes
 * @param {Array} blocklist - List of blocked content to filter out
 */
async function processHomebrewFile(data, ancestries, archetypes, blocklist) {
  // Get the source abbreviation from either metadata or assume it's a direct source file
  let sourceAbbr, shareAbbr;
  
  if (data._meta?.sources?.[0]) {
    sourceAbbr = data._meta.sources[0].json;
    shareAbbr = data._meta.sources[0].abbreviation;
  }
  
  console.log('Processing file with source:', sourceAbbr, 'abbreviation:', shareAbbr);

  // Process ancestries from race data
  if (data.race) {
    data.race.forEach(ancestry => {
      // For races.json format, use the ancestry's direct source
      const ancestrySource = ancestry.source || sourceAbbr;
      if (!ancestrySource) return;

      // Check if this source is blocked
      const isSourceBlocked = blocklist.some(entry => 
        entry.source === ancestrySource && 
        (entry.category === '*' || entry.category === 'race')
      );
      if (isSourceBlocked) {
        console.log(`Skipping blocked source: ${ancestrySource}`);
        return;
      }

      // Check if this specific ancestry is blocked
      const isAncestryBlocked = blocklist.some(entry =>
        entry.source === ancestrySource &&
        entry.category === 'race' &&
        (entry.displayName === ancestry.name || entry.displayName === '*')
      );

      if (!isAncestryBlocked && !ancestries.has(ancestry.name)) {
        ancestries.set(ancestry.name, {
          name: ancestry.name,
          source: ancestry.source || shareAbbr,
          archetypes: []
        });
      }
    });
  }

  // Process archetypes from subrace data
  if (data.subrace) {
    data.subrace.forEach(archetype => {
      // For races.json format, use the archetype's direct source
      const archetypeSource = archetype.source || sourceAbbr;
      if (!archetypeSource) return;

      // Check if this archetype's parent ancestry exists
      const parentAncestry = ancestries.get(archetype.raceName);
      if (parentAncestry && !archetypes.has(archetype.name)) {
        // Check if this specific archetype is blocked
        const isArchetypeBlocked = blocklist.some(entry =>
          entry.source === archetypeSource &&
          entry.category === 'race' &&
          (entry.displayName === archetype.name || entry.displayName === '*')
        );

        if (!isArchetypeBlocked) {
          archetypes.set(archetype.name, archetype.raceName);
          if (!parentAncestry.archetypes.includes(archetype.name)) {
            parentAncestry.archetypes.push(archetype.name);
          }
        }
      }
    });
  }
}

/**
 * Creates and displays buttons for each location in the locationData.
 * Each button triggers generateAncestry() for its location when clicked.
 */
function displayLocationButtons() {
  const container = document.getElementById('location-buttons');
  for (const location in locationData) {
    const button = document.createElement('a');
    button.className = 'button';
    button.href = '#';
    button.textContent = location;
    button.onclick = () => generateAncestry(location);
    container.appendChild(button);
  }
}

/**
 * Selects a random item from a weighted list.
 * 
 * @param {Array} data - Array of objects with 'name' and 'weight' properties
 * @returns {string} The selected item's name
 */
function getRandom(data) {
  // Calculate total weight
  let total = 0;
  for (const item of data) {
    total += item.weight;
  }

  // Pick a random value within the total weight
  const threshold = Math.random() * total;

  // Find the item that corresponds to this weight
  total = 0;
  for (const item of data) {
    total += item.weight;
    if (total >= threshold) {
      return item.name;
    }
  }

  // If we get here, return the last item
  return data[data.length - 1].name;
}

/**
 * Generates two distinct random features from the features list.
 * Handles grammar by removing duplicate prefixes (e.g., "have", "are")
 * from the second feature.
 * 
 * @returns {Array} Two distinct feature strings
 */
function getDistinctFeatures() {
  const distinctions = [];
  
  while (distinctions.length < 2) {
    const feature = getRandom(featureData.features);
    if (distinctions.length === 0 || distinctions[0] !== feature) {
      distinctions.push(feature);
    }
  }

  // Clean up grammar for the second feature
  if (distinctions[0].includes("have")){
    distinctions[1] = distinctions[1].replace("have ", "");
  }
  if (distinctions[0].includes("are")) {
    distinctions[1] = distinctions[1].replace("are ", "");
  }
  
  return distinctions;
}

/**
 * Generates a random ancestry and its characteristics for a given location.
 * This includes:
 * 1. Selecting a weighted random ancestry from the location's list
 * 2. Adding a random archetype if available
 * 3. Generating random physical characteristics
 * 4. Updating the display with all generated information
 * 
 * @param {string} location - The location to generate an ancestry for
 */
function generateAncestry(location) {
  const ancestries = locationData[location];
  if (!ancestries) return;

  // Use the getRandom function for consistent weighted selection
  const selectedAncestry = getRandom(ancestries);

  // Find archetypes for this ancestry if they exist
  let displayName = selectedAncestry;
  let debugInfo = {
    rolledAncestry: ancestries.find(a => a.name === selectedAncestry),
    availableArchetypes: null
  };

  if (archetypeData) {
    // Look for ancestry matching both name and source
    const ancestryInfo = archetypeData.ancestries.find(a => 
      a.name === selectedAncestry && 
      (!debugInfo.rolledAncestry.source || a.source === debugInfo.rolledAncestry.source)
    );
    if (ancestryInfo?.archetypes?.length > 0) {
      const randomArchetype = ancestryInfo.archetypes[Math.floor(Math.random() * ancestryInfo.archetypes.length)];
      if (randomArchetype) { // Skip null archetypes
        displayName = `${selectedAncestry} (${randomArchetype})`;
        debugInfo.availableArchetypes = ancestryInfo.archetypes.filter(a => a !== null);
        debugInfo.selectedArchetype = randomArchetype;
        debugInfo.source = ancestryInfo.source;
      }
    }
  }

  // Add a/an prefix based on whether the name starts with a vowel
  const vowels = "aeiouAEIOU";
  const prefix = vowels.includes(selectedAncestry[0]) ? "an " : "a ";
  document.getElementById('race').innerHTML = prefix + "<strong>" + displayName + "</strong>";
  
  // Generate all random details
  const heightResult = getRandom(featureData.height);
  const buildResult = getRandom(featureData.weight);
  const skintoneResult = getRandom(featureData.skintone);
  const distinctFeatures = getDistinctFeatures();

  // Update display elements
  document.getElementById('build').textContent = buildResult;
  document.getElementById('height').textContent = heightResult;
  document.getElementById('skintone').textContent = skintoneResult;
  document.getElementById('feature1').textContent = distinctFeatures[0];
  document.getElementById('feature2').textContent = distinctFeatures[1];

  // Update debug output with all details
  document.getElementById('debug-output').textContent = 
    `Rolled Details:\n` +
    `------------------\n` +
    `Location: ${location}\n\n` +
    `Ancestry Data:\n` +
    `  Name: ${selectedAncestry}\n` +
    `  Roll: ${selectedAncestry.roll}\n` +
    `  Weight: ${selectedAncestry.weight}\n` +
    `  Source: ${selectedAncestry.source || 'Unknown'}\n` +
    (debugInfo.availableArchetypes ? 
      `  Available Archetypes: ${debugInfo.availableArchetypes.join(', ')}\n` +
      `  Selected Archetype: ${debugInfo.selectedArchetype}\n` : 
      `  No archetypes available for this ancestry\n`) +
    `\nRandomized Traits:\n` +
    `  Height: ${heightResult}\n` +
    `  Build: ${buildResult}\n` +
    `  Skin tone: ${skintoneResult}\n` +
    `  Features: \n    - ${distinctFeatures[0]}\n    - ${distinctFeatures[1]}`;
}

/**
 * Shows the available ancestries list and location template.
 * Loads ancestry data if not already loaded.
 * Sorts ancestries alphabetically and formats them as JSON.
 */
async function showAncestryList() {
  if (!ancestryData) {
    await loadAllHomebrewAncestries();
  }
  if (!ancestryData) return;

  // Sort ancestries alphabetically by name and source
  ancestryData.ancestries.sort((a, b) => {
    const nameCompare = a.name.localeCompare(b.name);
    if (nameCompare !== 0) return nameCompare;
    return (a.source || '').localeCompare(b.source || '');
  });

  // Sort archetypes within each ancestry
  ancestryData.ancestries.forEach(ancestry => {
    if (ancestry.archetypes) {
      ancestry.archetypes.sort();
    }
  });

  // Output standard JSON
  document.getElementById('ancestry-json').textContent = JSON.stringify(ancestryData, null, 2);

  // Create location template with sorted ancestries, including source
  const locationTemplate = {
    "Random": ancestryData.ancestries.map(ancestry => ({
      name: ancestry.name,
      source: ancestry.source,
      roll: 1,
      weight: 1
    }))
  };

  // Output standard JSON
  document.getElementById('location-json').textContent = JSON.stringify(locationTemplate, null, 2);
  document.getElementById('ancestry-list').style.display = 'block';
}

/**
 * Hides the ancestry list display
 */
function hideAncestryList() {
  document.getElementById('ancestry-list').style.display = 'none';
}

/**
 * Copies the content of the specified element to the clipboard
 * and provides visual feedback.
 * 
 * @param {string} elementId - ID of the element containing text to copy
 */
async function copyToClipboard(elementId) {
  const element = document.getElementById(elementId);
  try {
    await navigator.clipboard.writeText(element.textContent);
    const link = event.target;
    const originalText = link.textContent;
    link.textContent = '(copied!)';
    setTimeout(() => {
      link.textContent = originalText;
    }, 1000);
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
}

// Initialize the application by loading required data
window.onload = async function() {
  await loadFeatures();
  await loadLocations();
  await loadArchetypes();
}; 