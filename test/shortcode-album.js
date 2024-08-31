const ava = require("ava");
const { immichAlbumShortcode } = require("../immich.js");

ava("Test album shortcode output", async t => {
  let html = await immichAlbumShortcode(process.env.IMMICH_TEST_ALBUM_UUID);
  let reTitle = new RegExp(`<div class="immich-album"><h2>${process.env.IMMICH_TEST_ALBUM_TITLE}</h2>`);
  let reDescription = new RegExp(`<p>${process.env.IMMICH_TEST_ALBUM_DESCRIPTION}</p>`);
  t.regex(html, reTitle);
  t.regex(html, reDescription);
});