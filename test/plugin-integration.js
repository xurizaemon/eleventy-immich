const path = require("path");
const fs = require("fs");
const test = require("ava");

const eleventyModule = require("@11ty/eleventy");
const { EleventyImmich} = require('../immich');

const Eleventy = eleventyModule.Eleventy || eleventyModule;

function getContentFor(results, filename) {
  const entry = results.find((entry) => entry.outputPath.endsWith(filename));
  if (!entry) {
    throw new Error(`File ${filename} not found in build output`);
  }
  return entry.content.trim();
}

/**
 * This is kinda horrific, we're going to configure and run Eleventy once,
 * then the tests will validate the output.
 */
test.before(async (t) => {
  // Create markdown files; tests will check the output of these.
  const testImagePath = path.join(__dirname, 'fixtures', 'stub', 'input', 'test-image.njk');
  const testAlbumPath = path.join(__dirname, 'fixtures', 'stub', 'input', 'test-album.njk');

  const imageMarkdown = `---
permalink: /test-image/
---
{% immich_image "${process.env.IMMICH_TEST_IMAGE_UUID || 'test-image-uuid'}" %}`;

  const albumMarkdown = `---
permalink: /test-album/
---
{% immich_album "${process.env.IMMICH_TEST_ALBUM_UUID || 'test-image-uuid'}" %}`;

  fs.writeFileSync(testImagePath, imageMarkdown);
  fs.writeFileSync(testAlbumPath, albumMarkdown);
  t.context.testImagePath = testImagePath;
  t.context.testAlbumPath = testAlbumPath;

  let EleventyConfig = {
    dir: {
      input: path.join(__dirname, "fixtures", "stub", "input"),
      output: "dist"
    }
  };

  let elev = new Eleventy(EleventyConfig.dir.input, EleventyConfig.dir.output, {
    config: function (eleventyConfig) {
      eleventyConfig.setUseTemplateCache(false);
      eleventyConfig.addPlugin(EleventyImmich, {
        api_url: process.env['IMMICH_BASE_URL'] || 'http://localhost:2283',
        api_key: process.env['IMMICH_API_KEY'] || 'test-api-key',
      });

      t.context.eleventyConfig = eleventyConfig;
    }
  });

  let results = await elev.toJSON();

  t.truthy(results);
  t.true(Array.isArray(results));

  t.context.results = results;
});

test("Test image shortcode output", async (t) => {
  const imageContent = getContentFor(t.context.results, 'dist/test-image/index.html');

  const expectedDescription = process.env.IMMICH_TEST_IMAGE_DESCRIPTION || 'Test image description';
  t.regex(imageContent, new RegExp(`alt="${expectedDescription}"`), 'Should contain alt text with description');
  t.regex(imageContent, /src="\/media\/img\//, 'Should contain image src path');
  t.regex(imageContent, /loading="lazy"/, 'Should have lazy loading');
  t.regex(imageContent, /decoding="async"/, 'Should have async decoding');
});

test("Test album shortcode output", async (t) => {
  const albumContent = getContentFor(t.context.results, 'dist/test-album/index.html');

  const expectedTitle = process.env.IMMICH_TEST_ALBUM_TITLE || 'Test album';
  const expectedDescription = process.env.IMMICH_TEST_ALBUM_DESCRIPTION || 'Test album description';
  const expectedImageAlt = process.env.IMMICH_TEST_IMAGE_DESCRIPTION || 'Test image description';

  t.regex(albumContent, new RegExp(`<h2>${expectedTitle}</h2>`), 'Should contain heading with album title');
  t.regex(albumContent, new RegExp(`<p>${expectedDescription}</p>`), 'Should contain heading with album description');
  t.regex(albumContent, new RegExp(`<img.*alt="${expectedImageAlt}"`), 'Should contain img with alt text');
  t.regex(albumContent, new RegExp(`<img.*src="/media/img`), 'Should contain img src path');
});
