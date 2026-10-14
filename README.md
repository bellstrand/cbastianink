# cbastianink.com

Website for **CBASTIANINK**, Sebastian's tattoo studio in Gothenburg. A single static page (`index.html`) in English and Swedish, published with GitHub Pages.

## Run it locally

```sh
bun install
bun run dev
```

Opens on port 3000 and reloads on save. Phones on the same Wi-Fi can use `http://<your-mac-ip>:3000`.

## Things you might want to change

| What | Where |
| --- | --- |
| Booking calendar (Cal.com user and event) | `var CAL = {username: …, event: …}` near the bottom of `index.html` |
| Texts, both languages | the `I18N` block (`en:` and `sv:`) in `index.html` |
| Gallery pieces and their categories | the `var W = [...]` list in `index.html`; images in `assets/work/` |
| Placement diagrams and session estimates | `assets/js/placements.js` |
| Link preview image | `assets/og-image.jpg` |

Gallery images come in three sizes per piece: `NN-480.webp`, `NN-960.webp` and `NN-1600.webp`.

## Booking

Free times and bookings go straight to Cal.com's public API from the browser. No API key is used or needed; never put one in this repository.
