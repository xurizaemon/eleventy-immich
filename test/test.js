const test = require("ava");
const { immichAlbumShortcode, immichImageShortcode } = require("../immich.js");

test("Test album shortcode output", async t => {
  let html = await immichAlbumShortcode('ef43ecca-f88d-4f5a-b590-533d0611e045');
  t.regex(html, /<div class="immich-album"><h2>Lomo Baby<\/h2>/);
  t.regex(html, /src="\/media\/img\/AitV6V6-2X-300.jpeg"/);
  t.regex(html, /<p>A few selected photos on the Baby Lomo.<\/p>/);
});

test("Test image shortcode output", async t => {
  let html = await immichImageShortcode('f2738c5a-2583-4ac7-b034-73c200fdc620');
  t.regex(html, /<img alt="Mum and me in her garden"/);
  t.regex(html, /src="\/media\/img\/AitV6V6-2X-300.jpeg"/);
});
