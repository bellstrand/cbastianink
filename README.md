# cbastianink.com

Website for **CBASTIANINK**, Sebastian's tattoo studio in Gothenburg. A single static page in English and Swedish, built by a GitHub Action and published with GitHub Pages.

## Editing content

Texts, gallery photos and site settings are edited in [Pages CMS](https://app.pagescms.org). A save commits to `main`, which rebuilds and publishes the site. If a check fails, the current site stays up and the build log says what to fix.

## Run it locally

```sh
bun install
bun run dev
```

Builds into `_site/`, opens on port 3000 and reloads on save. Phones on the same Wi-Fi can use `http://<your-ip>:3000`. Run `bun run build` to build once without serving.

## Things you might want to change

| What | Where |
| --- | --- |
| Editable texts, both languages | `content/texts.json`, or Pages CMS |
| Gallery photos and their order | `content/gallery.json` and `assets/gallery/`, or Pages CMS |
| Page title, link previews, announcement, footer, tracking and extra code | `content/settings.json`, or Pages CMS |
| What Pages CMS shows | `.pages.yml` |
| Page layout and locked texts (the `I18N` block) | `index.html`, which is a template and needs the build |
| Booking calendar (Cal.com user and event) | `var CAL = {username: …, event: …}` near the bottom of `index.html` |
| Placement diagrams and session estimates | `assets/js/placements.js` |
| Build steps and content checks | `scripts/build.js` |

## Images

Only the source photos are in the repository. The build creates `NN-480.webp`, `NN-960.webp` and `NN-1600.webp` for each gallery piece and removes metadata such as location from them. Results are cached in `.image-cache/`, so only new or changed photos are processed. Source photos stay in this public repository with whatever metadata they had when uploaded.

The "All" gallery takes one photo from each gallery in turn, in the order set by `ALL_ORDER` in `scripts/build.js`.

## Booking

Free times and bookings go straight to Cal.com's public API from the browser. No API key is used or needed; never put one in this repository.
