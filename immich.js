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
 * @param {Object} config - Eleventy Immich plugin configuration.
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
 * Fetches a combo of image meta and data for a given Immich asset UUID.
 *
 * @param {string} uuid - The UUID of the image asset.
 * @param {Object} config - Eleventy Immich plugin configuration.
 * @returns {Promise<Object>} - An object containing the image data and file.
 */
async function immichGetImageData(uuid, config) {
  let assetDataUrl = `${config.api_url}/api/assets/${uuid}`;
  let assetFileUrl = `${config.api_url}/api/assets/${uuid}/original`;

  let jsonFetchOptions = {
    ...config.defaultFetchOptions,
    ...{ accept: 'application/json' }
  };
  let binaryFetchOptions = {
    ...config.defaultFetchOptions,
    ...{ accept: 'application/octet-stream' }
  };

  const [assetData, assetFile] = await Promise.all([
    EleventyFetch(assetDataUrl, {
      duration: config.cacheDuration,
      type: "json",
      fetchOptions: jsonFetchOptions
    }),
    EleventyFetch(assetFileUrl, {
      duration: config.cacheDuration,
      type: "buffer",
      fetchOptions: binaryFetchOptions
    })
  ]);

  return {
    assetData: assetData,
    assetFile: assetFile,
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
 * @param {Object} config - Immich plugin configuration.
 *
 * @return {Promise<string>} The HTML string representing the rendered album.
 */
async function immichRenderAlbum(album, config) {
  let html = `<div class="immich-album"><h2>${album.albumName}</h2>`;
  if (album.description) {
    html += `<p>${album.description}</p>`;
  }

  if (album.assets.length) {
    // Fetch all image data in parallel
    const imageDataPromises = album.assets.map(asset =>
      immichGetImageData(asset.id, config)
    );
    const imageDataList = await Promise.all(imageDataPromises);

    // Queue image processing in parallel
    const imagePromises = imageDataList.map(image =>
      immichRenderImage(image, config)
    );

    // Wait for image processing to complete
    const images = await Promise.all(imagePromises);

    html += '<div class="immich-album-assets">';
    html += images.join('');
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

  // Queue the image processing
  let metadataPromise = Image(image.assetFile, {
    widths: [300, 600],
    formats: ["jpeg"],
    outputDir: 'public/media/img/',
    urlPath: '/media/img/'
  });

  // Wait for processing to complete
  let metadata = await metadataPromise;

  let attributes = {
    alt: alt,
    sizes: [],
    loading: "lazy",
    decoding: "async",
  };

  return Image.generateHTML(metadata, attributes);
}

/**
 * Adds Immich-related configurations to Eleventy.
 *
 * Validates Immich connectivity.
 *
 * @param {Object} eleventyConfig - The Eleventy config object.
 */
function EleventyImmich(eleventyConfig, options = {}) {
  const config = {
    api_url: options.api_url || process.env['IMMICH_BASE_URL'],
    api_key: options.api_key || process.env['IMMICH_API_KEY'],
    cacheDuration: options.cacheDuration || "1d",
    defaultFetchOptions: {
      headers: {
        'x-api-key': options.api_key || process.env['IMMICH_API_KEY'],
      }
    }
  };

  if (!config.api_url || !config.api_key) {
    throw new Error("EleventyImmich: api_url and api_key are required");
  }

  // Verify connectivity.
  EleventyFetch(`${config.api_url}/api/users/me`, {
    type: 'json',
    fetchOptions: {
      ...config.defaultFetchOptions,
      ...{accept: 'application/json'}
    }
  }).then((res) => {
    console.log(`Connected to Immich as ${res.name}.`);
  });

  eleventyConfig.addAsyncShortcode("immich_album", async function(uuid) {
    let album = await immichGetAlbumData(uuid, config);
    return immichRenderAlbum(album, config);
  });

  eleventyConfig.addAsyncShortcode("immich_image", async function(uuid) {
    let image = await immichGetImageData(uuid, config);
    return immichRenderImage(image);
  });
};

module.exports = {
  EleventyImmich
};
