# Eleventy 🤝 Immich

Shortcodes and integration to embed Immich media in Eleventy blogs.

## Status

Initial WIP. Contribution is welcome!

See https://chris.bur.gs/eleventy-immich/ for an introduction.

Support T&C: [no commitment, only commits](https://unmaintained.tech/)

## Immich & Node version support

Immich itself is in rapid development and there are occasional [breaking changes](https://github.com/immich-app/immich/discussions?discussions_q=label%3Abreaking-change+sort%3Adate_created). For now, the support target of this project is integration with an endpoint running `ghcr.io/immich-app/immich-server:release`.

## Testing

E2E test against an Immich instance requires setting these variables, then running `npm test`.

| Variable | Value                            |
|--|----------------------------------|
| IMMICH_BASE_URL | Base URL of your Immich instance |
| IMMICH_API_KEY | An Immich API key                |
| IMMICH_TEST_ALBUM_UUID | UUID of a test album             |
| IMMICH_TEST_ALBUM_TITLE | Title of the test album          |
| IMMICH_TEST_ALBUM_DESCRIPTION | Description of the test album    |
| IMMICH_TEST_IMAGE_UUID | UUID of a test image             |
| IMMICH_TEST_IMAGE_DESCRIPTION | Description of the test image    |

## License

This software is [AGPL-3.0](LICENSE).
