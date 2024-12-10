const test = require("ava");
const Eleventy = require("@11ty/eleventy");
const { EleventyImmich } = require('../immich');
const path = require("path");

function getContentFor(results, filename) {
  const entry = results.find((entry) => entry.outputPath.endsWith(filename));
  if (!entry) {
    throw new Error(`File ${filename} not found in build output`);
  }
  return entry.content.trim();
}

test("Load plugin into Eleventy, check output", async (t) => {
  let EleventyConfig = {
    dir: {
      input: path.join(__dirname, "fixtures", "stub", "input"),
      output: "dist"
    }
  };

  let elev = new Eleventy(EleventyConfig.dir.input, EleventyConfig.dir.output, {
    configPath: path.join(__dirname, "fixtures", "stub", "eleventy.config.js"),
    config: function (eleventyConfig) {
      eleventyConfig.setUseTemplateCache(false);
      eleventyConfig.addPlugin(EleventyImmich, {
        api_url: process.env['IMMICH_BASE_URL'],
        api_key: process.env['IMMICH_API_KEY'],
      });
    }
  });

  let results = await elev.toJSON();

  t.truthy(results);
  t.true(Array.isArray(results));

  // Debug results.
  // console.log("Build results:", results.map(r => ({ inputPath: r.inputPath, outputPath: r.outputPath })));

  let indexContent = getContentFor(results, "dist/index.html");
  t.true(indexContent.includes("<h1>Hello, World!</h1>"));
});
