const test = require("ava");
const { immichAlbumShortcode } = require("../immich.js");

test("Test album shortcode output", async t => {
  let html = await immichAlbumShortcode(process.env.IMMICH_TEST_ALBUM_UUID);
  t.regex(html, new RegExp(`<div class="immich-album"><h2>${process.env.IMMICH_TEST_ALBUM_TITLE}</h2>`));
  t.regex(html, new RegExp(`<p>${process.env.IMMICH_TEST_ALBUM_DESCRIPTION}</p>`));
});