## Get set up
Place this project into a new `/generate` folder within the root directory of The Tool That Shall Not Be Named™. It will:
1. Check your `/homebrew` folder for any files that contain species and subspecies (requires an index.json file).
2. Check the core `/data/races.json` file for all core species.
3. Exclude anything in the blocklist, named as `content-blocklist.json`
4. When you then click the Available Ancestries button it will generate the basis of two files:
  - locations.json: A list of all locations you want to roll random species from.
  - archetypes.json: A list of all available subspecies available in your files.

## How it works
Your Locations file is the main data to populate. Each top-level key is a location, and the value is an array of ancestries. Each ancestry object has a `name` and `weight`. The `weight` is a number that determines the likelihood of the ancestry being selected.

The Archetypes file is generated automatically based on the ancestries you have selected. It will include all available archetypes for each ancestry, and will be used to generate the ancestry display.

The Features file is all the physical characteristics the generator will use. It is a list of objects, each with a `name` and `weight`. The `weight` is a number that determines the likelihood of the feature being selected.
