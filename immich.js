/**
 * A plugin to provide Immich shortcodes for Eleventy.
 *
 * WIP. See https://github.com/xurizaemon/eleventy-immich for updates.
 */

const EleventyFetch = require("@11ty/eleventy-fetch");
const Image = require("@11ty/eleventy-img");

module.exports = function immich(eleventyConfig) {
  let required_vars = ['IMMICH_BASE_URL', 'IMMICH_API_KEY'];
  for (name of required_vars) {
    if (!process.env[name]) {
      throw new Error(`Immich plugin requires setting the following env vars: ${required_vars.join(', ')}`);
    }
  }

  let immichUrl = `${process.env.IMMICH_BASE_URL}`;
  let apiKey = `${process.env.IMMICH_API_KEY}`;
  let defaultFetchOptions = {
    headers: {
      'x-api-key': apiKey,
    }
  };

  // Verify connectivity.
  EleventyFetch(`${immichUrl}/api/users/me`, {
    type: 'json',
    fetchOptions: {
      ...defaultFetchOptions,
      ...{accept: 'application/json'}
    }
  }).then((res, rej) => {
    console.log(`Connected to Immich as ${res.name}.`);
  });

  /**
     * Fetches an album and renders each asset.
     *
     * @param uuid
     * @returns {Promise<string>}
     */
  async function immichAlbumShortcode(uuid) {
    let albumUrl = `${immichUrl}/api/album/${uuid}`;

    let albumData = await EleventyFetch(albumUrl, {
      duration: "10m",
      type: "json",
      fetchOptions: {
        ...defaultFetchOptions,
        ...{ accept: 'application/json' }
      }
    });

    let html = `<div class="immich-album"><h2>${albumData.albumName}</h2>`;
    if (albumData.description) {
      html += `<p>${albumData.description}</p>`;
    }
    if (albumData.assets.length) {
      html += '<div class="immich-album-assets">';
      for (asset of albumData.assets) {
        html += await immichImageShortcode(asset.id);
      }
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  /**
     * Fetches image data and file from a given UUID and generates HTML for the image element with specified attributes.
     *
     * @param {string} uuid - The UUID of the image asset.
     * @returns {Promise<string>} - A promise that resolves to the generated HTML for the image element.
     */
  async function immichImageShortcode(uuid) {
    let assetDataUrl = `${immichUrl}/api/asset/${uuid}`;
    let assetFileUrl = `${immichUrl}/api/asset/file/${uuid}`;
    let fetchOptions = defaultFetchOptions;

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

    let alt = assetData.exifInfo.description ?? 'No image description available';

    let metadata = await Image(assetFile, {
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
     * Retrieves a collection of Immich albums.
     *
     * @returns {Promise<Array>} A promise that resolves to an array of albums.
     *                            Each album is represented as an object in the array.
     *                            If an error occurs, an empty array is returned.
     */
  async function immichAlbumsCollection() {
    try {
      let albums = await EleventyFetch(`${immichUrl}/api/album`, {
        duration: "1d",
        type: "json",
        fetchOptions: {
          ...defaultFetchOptions,
          ...{ accept: 'application/json' }
        }
      });

      for (album of albums) {
        collection.push(album);
      }
      return collection;
    }
    catch(e) {
      console.log( "Failed getting Immich albums" );
      console.log(e, 'exception');
    }
  }

  // eleventyConfig.addCollection("immich_albums", immichAlbumsCollection);
  eleventyConfig.addShortcode("immich_album", immichAlbumShortcode);
  eleventyConfig.addShortcode("immich_image", immichImageShortcode);
};
