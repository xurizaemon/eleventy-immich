/**
 * A plugin to provide Immich shortcodes for Eleventy.
 *
 * WIP. See https://github.com/xurizaemon/eleventy-immich for updates.
 */

const EleventyFetch = require("@11ty/eleventy-fetch");
const Image = require("@11ty/eleventy-img");

/**
 * Fetches album data by Immich album UUID.
 *
 * @param {string} uuid - The UUID of the album.
 * @return {Promise<Object>} - A promise that resolves to the album data.
 */
async function immichGetAlbumData(uuid) {
  let config = immichConfig();
  let albumUrl = `${config.url}/api/albums/${uuid}`;

  return await EleventyFetch(albumUrl, {
    duration: "10m",
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
 * @returns {Promise<Object>} - An object containing the image data and file.
 */
async function immichGetImageData(uuid) {
  let config = immichConfig();
  let assetDataUrl = `${config.url}/api/assets/${uuid}`;
  let assetFileUrl = `${config.url}/api/assets/${uuid}/original`;
  let fetchOptions = config.defaultFetchOptions;

  fetchOptions.headers.accept = 'application/json';
  let assetData = await EleventyFetch(assetDataUrl, {
    duration: "10m",
    type: "json",
    fetchOptions: fetchOptions
  });

  fetchOptions.headers.accept = 'application/octet-stream';
  let assetFile = await EleventyFetch(assetFileUrl, {
    duration: "1w",
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
 *
 * @return {Promise<string>} The HTML string representing the rendered album.
 */
async function immichRenderAlbum(album) {
  let html = `<div class="immich-album"><h2>${album.albumName}</h2>`;
  if (album.description) {
    html += `<p>${album.description}</p>`;
  }
  if (album.assets.length) {
    html += '<div class="immich-album-assets">';
    for (let asset of album.assets) {
      html += await immichImageShortcode(asset.id);
    }
    html += '</div>';
  }
  html += '</div>';
  return html;
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
 * Fetches an album and renders each asset.
 *
 * @param uuid
 * @returns {Promise<string>}
 */
async function immichAlbumShortcode(uuid) {
  let album = await immichGetAlbumData(uuid);
  return immichRenderAlbum(album);
}

/**
 * Fetches image data and file from a given UUID, generates HTML for image element.
 *
 * @param {string} uuid - The UUID of the image asset.
 * @returns {Promise<string>} - A promise that resolves to the generated HTML for the image element.
 */
async function immichImageShortcode(uuid) {
  let image = await immichGetImageData(uuid);
  return immichRenderImage(image);
}

/**
 * Retrieves the Immich configuration settings required for the plugin.
 *
 * Verifies that required environment variables are set and throws error if any are missing.
 *
 * Returns an object containing Immich base URL, API key, and default fetch options.
 *
 * @throws {Error} If any of the required environment variables are missing, an error is thrown.
 *
 * @returns {Object} An object containing the following properties:
 * - url {string} - The Immich base URL.
 * - apikey {string} - The Immich API key.
 * - defaultFetchOptions {Object} - The default fetch options for making requests to Immich API.
 *   - headers {Object} - The headers for requests, including the 'x-api-key' header with the API key.
 */
function immichConfig() {
  let required_vars = ['IMMICH_BASE_URL', 'IMMICH_API_KEY'];
  for (let name of required_vars) {
    if (!process.env[name]) {
      throw new Error(`Immich plugin requires setting the following env vars: ${required_vars.join(', ')}`);
    }
  }

  return {
    url: process.env.IMMICH_BASE_URL,
    apikey: process.env.IMMICH_API_KEY,
    defaultFetchOptions: {
      headers: {
        'x-api-key': process.env.IMMICH_API_KEY,
      }
    }
  };
}

/**
 * Adds Immich-related configurations to Eleventy.
 *
 * Validates Immich connectivity.
 *
 * @param {Object} eleventyConfig - The Eleventy config object.
 */
function EleventyImmich(eleventyConfig) {
  let config = immichConfig();

  // Verify connectivity.
  EleventyFetch(`${config.url}/api/users/me`, {
    type: 'json',
    fetchOptions: {
      ...config.defaultFetchOptions,
      ...{accept: 'application/json'}
    }
  }).then((res) => {
    console.log(`Connected to Immich as ${res.name}.`);
  });

  // eleventyConfig.addCollection("immich_albums", immichAlbumsCollection);
  eleventyConfig.addShortcode("immich_album", immichAlbumShortcode);
  eleventyConfig.addShortcode("immich_image", immichImageShortcode);
};

module.exports = {
  EleventyImmich,
  immichAlbumShortcode,
  immichImageShortcode
};
