#!/usr/bin/env node

import fs from "fs";
import path from "path";
import axios from "axios";
import { select } from "@inquirer/prompts";
import vm from "vm";
import { fileURLToPath, pathToFileURL } from "url";
import os from "os";

// Function to fetch and run script from URL
async function fetchAndRunScript(url: string, moduleType: string) {
  try {
    const response = await axios.get(url);
    const scriptContent = response.data;

    if (moduleType === "ES Modules") {
      // Write the script to a temporary file
      const tempFilePath = path.join(os.tmpdir(), "temp-script.mjs");
      fs.writeFileSync(tempFilePath, scriptContent);

      // Use dynamic import to load the script
      const fileUrl = pathToFileURL(tempFilePath);
      await import(fileUrl.href);

      // Clean up the temporary file
      fs.unlinkSync(tempFilePath);
    } else {
      // Create a new context with CommonJS-like globals
      const context = vm.createContext({
        require,
        console,
        process,
        exports: {},
        module: { exports: {} },
      });

      // Execute the script in the context
      const script = new vm.Script(scriptContent);
      script.runInContext(context);

      // Check and call the exported function if exists
      if (typeof context.module.exports.generateSchemas === "function") {
        context.module.exports.generateSchemas();
      } else {
        console.error(
          "No function named 'generateSchemas' found in the script."
        );
      }
    }
  } catch (error: any) {
    console.error("Error fetching or running the script:", error.message);
  }
}

// Function to set up the package
async function setup() {
  try {
    const moduleType = await select({
      message: "Is your project using CommonJS or ES Modules?",
      choices: [
        { name: "CommonJS", value: "CommonJS" },
        { name: "ES Modules", value: "ES Modules" },
      ],
    });

    const scriptUrl =
      moduleType === "CommonJS"
        ? "https://raw.githubusercontent.com/tfmurad/test/main/dist/scripts/generate-tina-schema.cjs"
        : "https://raw.githubusercontent.com/tfmurad/test/main/dist/scripts/generate-tina-schema.mjs";

    await fetchAndRunScript(scriptUrl, moduleType);
  } catch (error: any) {
    console.error("Error during setup:", error.message);
  }
}

// Path to check the 'tina' folder in the project root
const projectRoot = process.cwd();
const tinaFolderPath = path.join(projectRoot, "tina");

// Check if the 'tina' folder exists
fs.access(tinaFolderPath, fs.constants.F_OK, (err) => {
  if (!err) {
    setup().catch((error) =>
      console.error("Error in setup function:", error.message)
    );
  } else {
    console.log(
      'The "tina" folder does not exist. Please visit the following link to install the Tina package first:'
    );
    console.log("https://docs.astro.build/en/guides/cms/tina-cms");
  }
});
