## Get set up
Place this project into a new `/generate` folder within the root directory of The Tool That Shall Not Be Named™. It will:
1. Check your `/homebrew` folder for any files that contain ancestries (races) and archetypes (subraces) This requires an `index.json` file.
2. Check the core `/data/races.json` file for all core ancestries.
3. Exclude anything in the blocklist, named as `content-blocklist.json`.
4. When you then click the **Available Ancestries** button it will generate a skeleton of two files:
  - locations.json: A list of all locations you want to roll random ancestries from.
  - archetypes.json: A list of all available ancestries available in your files.

## How it works
Your Locations file is the main data to populate. Each top-level key is a location that can be used to roll random ancestries in the tool, and the value is an array of ancestries. Each ancestry object has a `name` and `weight`. The `weight` is a number that determines the likelihood of the ancestry being selected.

You'll want to populate the locations file with the different sets of data you want to roll random ancestries from. I recommend setting this up in Google Sheets and using formulas to generate the JSON for you. For example, use `="{""name"": """&A2&""",""source"":"""&B2&""",""roll"":"&c2&",""weight"": "&D2&"},"` to generate the JSON for each row, with the name in column A, the source in column B, the roll in column C, and the weight in column D.

The Archetypes file is generated automatically based on the ancestries you have selected. It will include all available archetypes for each ancestry, and will be used to generate the ancestry display.

The Features file is all the physical characteristics the generator will use. It is a list of objects, each with a `name` and `weight`. The `weight` is a number that determines the likelihood of the feature being selected.