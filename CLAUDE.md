# CLAUDE.md

This file guides Claude Code (and humans) working in `crewbo/website`, Crewbo's landing page (crewbo.dev). See `README.md` for what it is.

## Sources of truth (read before working)

Everything shared lives in the main repository, [crewbo/crewbo](https://github.com/crewbo/crewbo); this repository copies only the brand files the page uses. If this file and those documents disagree, they win.

| What | Where |
| --- | --- |
| What the site must contain | [M6-12 in the plan](https://github.com/crewbo/crewbo/blob/main/docs/engineering/implementation-plan.md), [issue #186](https://github.com/crewbo/crewbo/issues/186) |
| Product: what Crewbo is and is not | [PRD](https://github.com/crewbo/crewbo/blob/main/docs/product/PRD.md), [README](https://github.com/crewbo/crewbo/blob/main/README.md) |
| What Crewbo shares and stores (any privacy claim on the site) | [privacy page](https://github.com/crewbo/crewbo/blob/main/docs/user/privacy.md) |
| Install steps the site shows | [getting started](https://github.com/crewbo/crewbo/blob/main/docs/user/getting-started.md) |
| Brand: logo, colours, type, Bo, voice, checklist | [docs/brand](https://github.com/crewbo/crewbo/tree/main/docs/brand): start with `README.md` and `01-principles.md`, then `09-checklist.md` |
| Decisions | [decision log](https://github.com/crewbo/crewbo/blob/main/docs/engineering/decision-log.md) |
| Main repository rules | [crewbo/crewbo CLAUDE.md](https://github.com/crewbo/crewbo/blob/main/CLAUDE.md) |

Source precedence: Ronel's explicit instructions > PRD > accepted ADRs > research > own judgement.

## Current state

Planned; `brand/` holds the brand files, copied by `scripts/sync-brand.sh`; no page yet. Licence: Apache-2.0 (Ronel, 2026-10-20). Served by GitHub Pages from `main` once Ronel turns Pages on; at `https://crewbo.github.io/website/` until `crewbo.dev` is bought, then on the custom domain.

## Commands

| Purpose | Command |
| --- | --- |
| Copy the brand files into `brand/` | `scripts/sync-brand.sh` (from crewbo at the commit in `CREWBO_REF`) |
| Check `brand/` is unchanged | `scripts/sync-brand.sh --check` |
| Take a newer brand | put a newer crewbo commit in `CREWBO_REF`, run the script, review the diff |

## Non-negotiable rules

1. Never invent a claim about Crewbo. Every feature, number, command and privacy statement on the page must match crewbo's docs and what has run; say "preview" where Crewbo is preview, and never show a feature as shipped before it is.
2. Never invent brand values. Colours, sizes, radii and durations come from crewbo's `docs/brand/tokens` (`--cb-*` variables); Bo comes from `bo.js` and `bo.css`, never redrawn; a missing value goes to the brand README's open questions and Ronel is asked. The landing page is not designed yet: the brand README says to build it from the brand rules and not to use the old `Landing` canvas board.
3. Brand files are copied from crewbo unchanged, by a sync script (added with the site), never edited here.
4. No trackers, analytics, cookies, third-party scripts or fonts loaded from Google or any CDN: everything is served from this repository.
5. Accessibility first: text contrast at least 4.5:1, every meaningful image has alt text, Bo's animation stops for `prefers-reduced-motion`, works with a keyboard, at phone width (16 px side gutter, no horizontal scroll) and desktop width. The site is light only, whatever the visitor's system setting (Ronel, 2026-10-20).
6. No AI or tool attribution in commits, pull requests or comments: no `Co-Authored-By`, no "Generated with", no session links (`Claude-Session:` or claude.ai URLs), no emoji.
7. Copy follows Crewbo's voice (`docs/brand/08-voice.md`): sentence case, no exclamation marks, no em dashes, no marketing adjectives, name the file, person and agent.
8. Stop and ask Ronel before: changing repository or Pages settings, the custom domain or DNS, adding any dependency or build step, or publishing anything new.

## Git workflow

- Trunk-based; branch per change: `<type>/<short-kebab-description>`; Ronel reviews and merges. Never push to `main` or force-push a shared branch.
- Conventional Commits 1.0.0: `<type>(<scope>): <imperative lower-case summary>`, body explains why, footer `Refs: crewbo/crewbo#N`.
- Types: feat, fix, docs, chore, style. Scopes: page, brand, assets, docs.
- Every pull request: the template's checklist, with screenshots at phone and desktop widths.

## Known facts

- GitHub Pages publishes from a branch, from the repository root or a `/docs` folder ([publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)). Branch publishing goes through Jekyll unless told otherwise; the docs only mention `.nojekyll` for CI deploys, so whether the site needs it is UNVERIFIED until the first publish (fallback: add an empty `.nojekyll`). A custom domain is set in the Pages settings plus a DNS record at the domain's provider (Ronel's step).
- `.dev` domains only work over HTTPS (browsers enforce it for the whole `.dev` ending); GitHub Pages provides the certificate.
- Crewbo's brand includes the fonts (`assets/fonts`, OFL), the lockup SVGs for light and dark, a social preview image and favicons (`assets/png`); see the brand README's "Where each asset goes".
