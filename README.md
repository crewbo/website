# crewbo.dev

The website of [Crewbo](https://github.com/crewbo/crewbo): one landing page that says what Crewbo is, shows the crew panel and the dashboard, and how to install the CLI, the editor extension and the Crewbo IDE.

**Status: planned.** It is built for Crewbo's first public release (about 22 November 2026), as issue [M6-12](https://github.com/crewbo/crewbo/issues/186).

## How it is served

- Plain HTML and CSS, no build step and no framework, published by GitHub Pages from this repository's `main` branch.
- Until the `crewbo.dev` domain is bought it lives at `https://crewbo.github.io/website/`; then the custom domain is set on this same repository and it moves to `https://crewbo.dev`.
- No trackers, analytics, cookies or third-party scripts, and fonts are self-hosted: Crewbo sends no telemetry, and its site does not either.

## Brand

Colours, type, the logo and Bo come from Crewbo's brand system in [`docs/brand`](https://github.com/crewbo/crewbo/tree/main/docs/brand), copied here unchanged by a sync script (added with the site), never by hand.

## Contributing and licence

See [CONTRIBUTING.md](CONTRIBUTING.md). This repository is licensed under the [Apache License 2.0](LICENSE).
