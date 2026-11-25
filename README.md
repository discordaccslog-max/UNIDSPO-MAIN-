# United Dispo — Websitee

Static site for **United Dispo**, live at **https://uniteddispo.com** (hosted on Vercel,
deployed automatically from the `main` branch). Plain HTML, CSS and JavaScript —
nothing to install, no build step, no server code.

`sitemap.xml` and `robots.txt` point search engines at uniteddispo.com, and every
page has canonical + link-preview tags using `images/og-image.jpg`.

## Pages

| File | Page |
|---|---|
| `index.html` | Homepage |
| `catalog.html` | All products |
| `contact.html` | Contact |

## Put it online

**GitHub Pages**

1. Upload these files to a repository.
2. Settings → Pages → *Source* → **Deploy from a branch** → `main` / `(root)` → Save.
3. Live at `https://<username>.github.io/<repo>/` in about a minute.

Works the same on Netlify, Vercel or Cloudflare Pages — drag the folder in.

## Editing

Open any `.html` file in a text editor. Styles live in `css/style.css`.
Each section carries its own `<style>` block inline, so a section's look can be
changed without touching the shared stylesheet.

## Products

Products on the homepage and the catalog page come from one file, `js/store.js` (names, prices, stock, order, ratings). Edit it once and both pages update. The grid itself is drawn by `js/grid.js` and styled by `css/grid.css`. Product detail pages read `js/products.js`.
Images are served from the original Shopify CDN.

Add-to-cart doesn't post anywhere — it fires a browser event for a checkout to
pick up:

```js
document.addEventListener('uni:add-to-cart', (e) => {
  // e.detail = { sku, title, price, variant, qty }
});
```

## Notes

- A 21+ age gate covers the page until accepted, then remembers the answer for
  30 days. The "Proudly American" popup waits for the gate before appearing.
- The age gate is click-through only, not real age verification.
