/**
 * A plugin to provide Immich shortcodes for Eleventy.
 *
 * WIP. See https://github.com/xurizaemon/eleventy-immich for updates.
 */

const EleventyFetch = require("@11ty/eleventy-fetch");
const Image = require("@11ty/eleventy-img");
// const { EleventyRenderPlugin } = require("@11ty/eleventy");

/**
 * Fetches album data by Immich album UUID.
 *
 * @param {string} uuid - The UUID of the album.
 * @param {Object} config - The configuration object containing API URL and cache duration.
 * @return {Promise<Object>} - A promise that resolves to the album data.
 */
async function immichGetAlbumData(uuid, config) {
  let albumUrl = `${config.api_url}/api/albums/${uuid}`;

  return await EleventyFetch(albumUrl, {
    duration: config.cacheDuration,
    type: "json",
    fetchOptions: {
      ...config.defaultFetchOptions,
      ...{ accept: 'application/json' }
    }
  });
}

/**
 * Fetches image data for a given Immich asset UUID.
 *
 * @param {string} uuid - The UUID of the image asset.
 * @param {Object} eleventyConfig - The Eleventy configuration object.
 * @returns {Promise<Object>} - An object containing the image data and file.
 */
async function immichGetImageData(uuid, eleventyConfig) {
  let assetDataUrl = `${eleventyConfig.immichConfig.api_url}/api/assets/${uuid}`;
  let assetFileUrl = `${eleventyConfig.immichConfig.api_url}/api/assets/${uuid}/original`;

  let fetchOptions = eleventyConfig.immichConfig.defaultFetchOptions;
  fetchOptions.headers.accept = 'application/json';

  let assetData = await EleventyFetch(assetDataUrl, {
    duration: eleventyConfig.immichConfig.cacheDuration,
    type: "json",
    fetchOptions: fetchOptions
  });

  fetchOptions.headers.accept = 'application/octet-stream';
  let assetFile = await EleventyFetch(assetFileUrl, {
    duration: eleventyConfig.immichConfig.cacheDuration,
    type: "buffer",
    fetchOptions: fetchOptions
  });

  return {
    assetData: assetData,
    assetFile: assetFile
  };
}

/**
 * Render an album with images for each asset.
 *
 * @param {Object} album - The album to render.
 * @param {string} album.albumName - The name of the album.
 * @param {string} [album.description] - The description of the album.
 * @param {Array} album.assets - The assets in the album.
 * @param {string} album.assets[].id - The ID of the asset.
 * @param {Object} eleventyConfig - The Eleventy configuration object.
 * @return {Promise<string>} The HTML string representing the rendered album.
 */
async function immichRenderAlbum(album, eleventyConfig) {
  const templateData = {
    albumName: album.albumName,
    description: album.description,
    assets: await Promise.all(
      album.assets.map(async (asset) => ({
        html: await immichImageShortcode(asset.id, eleventyConfig),
      }))
    ),
  };

  console.log(eleventyConfig.nunjucks, 'config');

  const albumTemplate = `
    <div class="immich-album">
      <h2>{{ albumName }}</h2>
      {% if description %}
        <p>{{ description }}</p>
      {% endif %}
      {% if assets.length %}
        <div class="immich-album-assets">
          {% for asset in assets %}
            {{ asset.html }}
          {% endfor %}
        </div>
      {% endif %}
    </div>`;

  // Assumptions ...
  return eleventyConfig.nunjucks.renderString(albumTemplate, templateData);
}

/**
 * Renders an image with optional description and returns the generated HTML.
 *
 * @param {object} image - The image object to render.
 * @returns {Promise<string>} - A promise that resolves with the generated HTML.
 */
async function immichRenderImage(image) {
  let alt = image.assetData.exifInfo.description ?? 'No image description available';

  let metadata = await Image(image.assetFile, {
    widths: [300, 600],
    formats: ["jpeg"],
    outputDir: 'public/media/img/',
    urlPath: '/media/img/'
  });

  let attributes = {
    alt: alt,
    sizes: [],
    loading: "lazy",
    decoding: "async",
  };

  return Promise.resolve(Image.generateHTML(metadata, attributes));
}

/**
 * Renders an album based on a UUID and the configuration object.
 *
 * @param {string} uuid - The UUID of the album.
 * @param {object} eleventyConfig - Eleventy's configuration object.
 * @returns {Promise<string>} - A promise that resolves to the generated HTML for the album.
 */
async function immichAlbumShortcode(uuid, eleventyConfig) {
  console.log(eleventyConfig, 'immichAlbumShortcode');

  // Fetch the album data using the provided UUID and config.
  let album = await immichGetAlbumData(uuid, eleventyConfig.immichConfig);

  // Render the album to HTML
  return immichRenderAlbum(album, eleventyConfig);
}

/**
 * Fetches image data and file from a given UUID, generates HTML for image element.
 *
 * @param {string} uuid - The UUID of the image asset.
 * @param {object} eleventyConfig - Eleventy's configuration object.
 * @returns {Promise<string>} - A promise that resolves to the generated HTML for the image element.
 */
async function immichImageShortcode(uuid, eleventyConfig) {
  let image = await immichGetImageData(uuid, eleventyConfig);
  return immichRenderImage(image);
}

/**
 * Adds Immich-related configurations to Eleventy.
 *
 * Validates Immich connectivity.
 *
 * @param {Object} eleventyConfig - The Eleventy config object.
 * @param {Function} config - A function that returns the Immich configuration object.
 */
function EleventyImmich(eleventyConfig, config) {
  ['api_url', 'api_key'].forEach(required => {
    if (!config[required]) {
      throw new Error(`EleventyImmich requires config ${required}`);
    }
  });

  config = {
    url: config.api_url,
    apikey: config.api_key,
    cacheDuration: config.cacheDuration || "1w",
    defaultFetchOptions: {
      headers: {
        'x-api-key': config.api_key,
      }
    }
  };

  // Verify connectivity.
  EleventyFetch(`${config.api_url}/api/users/me`, {
    type: 'json',
    fetchOptions: {
      ...config.defaultFetchOptions,
      ...{accept: 'application/json'}
    }
  }).then((res) => {
    console.debug(`Connected to Immich as ${res.name}.`);
  });

  // Provide configuration to shortcodes via eleventy config ... Is this weird?
  eleventyConfig.immichConfig = config;
  // eleventyConfig.addCollection("immich_albums", immichAlbumsCollection);
  eleventyConfig.addShortcode("immich_album", (uuid) => immichAlbumShortcode(uuid, eleventyConfig));
  eleventyConfig.addShortcode("immich_image", (uuid) => immichImageShortcode(uuid, eleventyConfig));
};

module.exports = {
  EleventyImmich,
  immichAlbumShortcode,
  immichImageShortcode,
  immichRenderAlbum
};
