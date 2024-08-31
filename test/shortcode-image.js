const ava = require("ava");
const { immichAlbumShortcode, immichImageShortcode } = require("../immich.js");

ava("Test image shortcode output", async t => {
  let html = await immichImageShortcode(process.env.IMMICH_TEST_IMAGE_UUID);
  let reAlt = new RegExp(`<img alt="${process.env.IMMICH_TEST_IMAGE_DESCRIPTION}"`);
  let reSrc = new RegExp('src="/media/img/');
  t.regex(html, reAlt);
  t.regex(html, reSrc);
});
