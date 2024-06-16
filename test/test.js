const test = require("ava");
const { immichAlbumShortcode, immichImageShortcode } = require("../immich.js");

test("Test album shortcode output", async t => {
  let html = await immichAlbumShortcode('ef43ecca-f88d-4f5a-b590-533d0611e045');
  let reTitle = new RegExp(`<div class="immich-album"><h2>${process.env.IMMICH_TEST_ALBUM_TITLE}</h2>`);
  let reDescription = new RegExp(`<p>${process.env.IMMICH_TEST_ALBUM_DESCRIPTION}</p>`);
  t.regex(html, reTitle);
  t.regex(html, reDescription);
});

test("Test image shortcode output", async t => {
  let html = await immichImageShortcode('f2738c5a-2583-4ac7-b034-73c200fdc620');
  let reAlt = new RegExp(`<img alt="${process.env.IMMICH_TEST_IMAGE_DESCRIPTION}"`);
  let reSrc = new RegExp('src="/media/img/');
  t.regex(html, reAlt);
  t.regex(html, reSrc);
});
