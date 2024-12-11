const test = require("ava");
const { immichImageShortcode } = require("../immich.js");

test("Test image shortcode output", async (t) => {
  let html = await immichImageShortcode(process.env.IMMICH_TEST_IMAGE_UUID);
  t.regex(html, new RegExp(`alt="${process.env.IMMICH_TEST_IMAGE_DESCRIPTION}"`));
  t.regex(html, new RegExp('src="/media/img/'));
});
