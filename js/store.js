/* United Dispo — store data shared by the homepage and the catalog page.
   Edit products, ratings and grid settings here; both pages update. */
/* =====================================================================
   EDIT YOUR STORE HERE
   ---------------------------------------------------------------------
   Products were copied from your Shopify store on Nov 18, 2026, in the
   same order as your Shopify collections "single" and "blk".

   Each product:
     title      Name on the card.
     url        Where the card and "Choose options" go.
     price      Price in dollars, e.g. 35.99
     compareAt  Old price to show crossed out (adds a "Sale" badge), or null.
     priceMax   Highest variant price. If higher than price, shows "From $..".
     variants   Number of variants. More than 1 shows "Choose options".
     available  false shows "Sold out".
     soldOutNote Optional line under the price on a sold-out card,
                e.g. "Temporarily unavailable due to low stock".
     image      Main photo: src, width, height (width/height set the shape).
     image2     Optional second photo, shown on hover (desktop).
     buyUrl     Optional link for "Add to cart" (opens in a new tab), like the
                external buy link on your Shopify product pages. If empty,
                "Add to cart" goes to url.

   Photos load from Shopify's image servers. If you close the Shopify store,
   upload the photos to this repository and change each src to the file name.
   ===================================================================== */
var UNI_SETTINGS = {
  addToCartLabel: "Add to cart",
  chooseOptionsLabel: "Choose options",
  soldOutLabel: "Sold out",
  currencyCode: "USD",        // shown after prices; "" to hide
  showBulkNotice: false       // the "Geek Bar Pulse X bulk options coming soon" notice (off on Shopify)
};

var UNI_PRODUCTS = {
  singles: [
    {"title": "ACE ULTRA PREMIUM", "url": "product.html?id=ace-ultra-premium-2g", "price": 35.99, "compareAt": null, "priceMax": 35.99, "variants": 3, "available": true, "image": {"src": "images/ace-ultra.webp", "width": 640, "height": 640}, "buyUrl": ""},
    {"title": "Boutiq Switch V5", "url": "product.html?id=boutiq-switch-v5", "price": 35.99, "compareAt": null, "priceMax": 35.99, "variants": 2, "available": true, "image": {"src": "images/boutiq-v5.webp", "width": 1201, "height": 1201}, "buyUrl": ""},
    {"title": "MUHA MEDS (SUMMER EDITION)", "url": "product.html?id=muha-meds-sumer-edition", "price": 35.99, "compareAt": null, "priceMax": 35.99, "variants": 1, "available": false, "image": {"src": "images/muha-summer.webp", "width": 600, "height": 600}, "buyUrl": ""},
    {"title": "RAW GARDEN LIVE RESIN (1G)", "url": "product.html?id=raw-garden-live-resin-1g", "price": 42.99, "compareAt": null, "priceMax": 42.99, "variants": 3, "available": true, "image": {"src": "images/raw-garden.webp", "width": 1024, "height": 1024}, "buyUrl": ""},
    {"title": "MUHA MEDS X COOKIES (LIMITED EDITION)", "url": "product.html?id=muha-meds-x-cookies-limited-edition", "price": 38.99, "compareAt": null, "priceMax": 38.99, "variants": 3, "available": true, "image": {"src": "images/muha-cookies.webp", "width": 1200, "height": 1501}, "buyUrl": ""},
    {"title": "GEEK BAR PULSE", "url": "product.html?id=geek-bar-pulse-x", "price": 28.99, "compareAt": null, "priceMax": 28.99, "variants": 1, "available": false, "image": {"src": "images/geek-pulse.webp", "width": 1024, "height": 1336}, "buyUrl": ""},
    {"title": "GEEK BAR PULSE X", "url": "product.html?id=geek-bar-pulse", "price": 31.99, "compareAt": null, "priceMax": 31.99, "variants": 24, "available": true, "image": {"src": "images/geek-pulse-x.webp", "width": 1024, "height": 1391}, "buyUrl": ""},
    {"title": "WHOLEMELTS V7", "url": "product.html?id=wholemelts-v7-copy", "price": 32.99, "compareAt": null, "priceMax": 32.99, "variants": 1, "available": false, "image": {"src": "images/wholemelts.webp", "width": 1024, "height": 1024}, "buyUrl": ""},
    {"title": "MUHA MEDS 3RD GEN (NEW)", "url": "product.html?id=muha-meds-limited-edition", "price": 35.99, "compareAt": null, "priceMax": 35.99, "variants": 3, "available": true, "image": {"src": "images/muha-3rd-gen-logo.webp", "width": 1024, "height": 1024}, "image2": {"src": "images/muha-3rd-gen-box.webp", "width": 571, "height": 724}, "buyUrl": ""},
    {"title": "BIG CHIEF CARTRIDGE (2G)", "url": "product.html?id=big-chief", "price": 36.99, "compareAt": null, "priceMax": 36.99, "variants": 1, "available": false, "image": {"src": "images/big-chief.webp", "width": 1024, "height": 1536}, "buyUrl": ""}
  ],
  bulk: [
    {"title": "10PC ACE ULTRA PREMIUM", "url": "product.html?id=10pc-ace-ultra-premium", "price": 125.99, "compareAt": null, "priceMax": 125.99, "variants": 4, "available": true, "image": {"src": "images/10pc-ace-ultra.webp", "width": 640, "height": 640}, "buyUrl": ""},
    {"title": "20PC ACE ULTRA PREMIUM", "url": "product.html?id=20pc-ace-ultra-premium", "price": 205.99, "compareAt": null, "priceMax": 205.99, "variants": 4, "available": false, "soldOutNote": "Temporarily unavailable due to low stock", "image": {"src": "images/20pc-ace-ultra.webp", "width": 640, "height": 640}, "buyUrl": ""},
    {"title": "10PC BOUTIQ SWITCH V5", "url": "product.html?id=10pc-boutiq-switch-v5", "price": 135.99, "compareAt": null, "priceMax": 135.99, "variants": 3, "available": true, "image": {"src": "images/10pc-boutiq-v5.webp", "width": 1201, "height": 1201}, "buyUrl": ""},
    {"title": "10PC RAW GARDEN LIVE RESIN (1G)", "url": "product.html?id=10pc-raw-garden-live-resin-1g", "price": 195.99, "compareAt": null, "priceMax": 195.99, "variants": 4, "available": false, "soldOutNote": "Temporarily unavailable due to low stock", "image": {"src": "images/10pc-raw-garden.webp", "width": 1024, "height": 1024}, "buyUrl": ""},
    {"title": "10PC WHOLEMELTS V7", "url": "product.html?id=10pc-wholemelts-v7", "price": 120.99, "compareAt": null, "priceMax": 120.99, "variants": 1, "available": false, "image": {"src": "images/wholemelts.webp", "width": 1024, "height": 1024}, "buyUrl": ""},
    {"title": "10PC MUHA MEDS X COOKIES (LIMITED EDITION)", "url": "product.html?id=10pc-muha-meds-x-cookies-limited-edition", "price": 145.99, "compareAt": null, "priceMax": 145.99, "variants": 4, "available": true, "image": {"src": "images/10pc-muha-cookies.webp", "width": 796, "height": 796}, "buyUrl": ""}
  ]
};

/* The two product sections. headerHtml is the section heading shown above the grid. */
var UNI_GRIDS = {
  singles: {
    products: "singles",
    limit: 10,
    headerHtml: '<div class="hm-head hm-sec"><div class="hm-head__copy"><span class="hm-kicker">Shop</span><h2 class="hm-h2" id="uni-pg-1-title">Best <em>Sellers.</em></h2><p class="hm-lead">Lab-tested carts and disposables, sourced from licensed dispensaries and verified before they ship.</p></div><a class="hm-link" href="catalog.html">View full catalog<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></div>',
    soldOutLast: false,        // false = keep the order of UNI_PRODUCTS.singles above
    showRating: true,          // star rating line on each card
    columnsDesktop: 5,
    columnsMobile: 2,
    imageRatio: "portrait",
    secondaryImage: true,
    quickAdd: true,
    viewAll: false,
    viewAllUrl: "",
    paddingTop: 0,
    paddingBottom: 0,
    promoBar: ""
  },
  bulk: {
    products: "bulk",
    limit: 6,
    headerHtml: '<div class="hm-head hm-sec"><div class="hm-head__copy"><span class="hm-kicker">Bulk &amp; Save</span><h2 class="hm-h2" id="uni-pg-2-title">Buy in bulk. <em>Pay less per unit.</em></h2><p class="hm-lead">10 and 20-packs with every unit sealed and verified. Need a larger order? Contact us for a quote.</p></div><a class="hm-link" href="contact.html">Request a bulk quote<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></div>',
    soldOutLast: false,        // false = keep the order of UNI_PRODUCTS.bulk above
    perUnit: true,             // "$12.60 / unit" pill from the "10PC" / "20PC" in the title
    columnsDesktop: 6,
    columnsMobile: 2,
    imageRatio: "square",
    secondaryImage: false,
    quickAdd: true,
    viewAll: true,             // only shows when there are more products than the limit
    viewAllUrl: "",            // set this to a page listing all bulk products
    paddingTop: 0,
    paddingBottom: 0,
    promoBar: ""
  }
};

/* Sample star ratings shown on the product cards (demo content). */
var UNI_CARD_RATINGS = {
  "ace-ultra-premium-2g": [4.8, 412], "muha-meds-sumer-edition": [4.7, 198], "raw-garden-live-resin-1g": [4.8, 356],
  "geek-bar-pulse-x": [4.6, 241], "geek-bar-pulse": [4.7, 287], "boutiq-switch-v5": [4.6, 173], "big-chief": [4.5, 129],
  "wholemelts-v7-copy": [4.6, 98], "muha-meds-x-cookies-limited-edition": [4.9, 264], "muha-meds-limited-edition": [4.7, 219]
};
