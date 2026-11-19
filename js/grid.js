/* United Dispo — product grid renderer (homepage + catalog).
   Needs js/store.js (UNI_SETTINGS, UNI_PRODUCTS, UNI_GRIDS) loaded first. */
(function () {
    /* Scroll-in animation: same logic as the Shopify theme's animations.js. */
    function initReveal() {
      var els = Array.prototype.slice.call(document.querySelectorAll('.uni-pg .uni-reveal'));
      if (!els.length || !('IntersectionObserver' in window)) return;
      var observer = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry, index) {
          var el = entry.target;
          if (entry.isIntersecting) {
            if (el.classList.contains('uni-reveal--offscreen')) {
              el.classList.remove('uni-reveal--offscreen');
              if (el.hasAttribute('data-cascade')) el.style.setProperty('--animation-order', index);
            }
            obs.unobserve(el);
          } else {
            el.classList.add('uni-reveal--offscreen');
          }
        });
      }, { rootMargin: '0px 0px -50px 0px' });
      els.forEach(function (el) { observer.observe(el); });
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initReveal);
    } else {
      initReveal();
    }

  })();

/* Builds the product sections from UNI_PRODUCTS / UNI_GRIDS (same markup as the WordPress version). */
(function () {
  var SIZES = '(min-width: 1600px) 367px, (min-width: 990px) calc((100vw - 130px) / 4), (min-width: 750px) calc((100vw - 120px) / 3), calc((100vw - 35px) / 2)';
  var fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(n) {
    return fmt.format(Number(n) || 0) + (UNI_SETTINGS.currencyCode ? ' ' + UNI_SETTINGS.currencyCode : '');
  }
  function sized(src, w) {
    if (!/^https:\/\/cdn\.shopify\.com\//.test(src)) return src;
    return src + (src.indexOf('?') > -1 ? '&' : '?') + 'width=' + w;
  }
  function img(image, cls, alt) {
    var widths = [165, 360, 533, 720, 940, 1066].filter(function (w) { return !image.width || image.width >= w; });
    var srcset = widths.map(function (w) { return sized(image.src, w) + ' ' + w + 'w'; });
    if (image.width) srcset.push(image.src + ' ' + image.width + 'w');
    return '<img class="' + cls + '" src="' + esc(sized(image.src, 533)) + '"' +
      (/^https:\/\/cdn\.shopify\.com\//.test(image.src) ? ' srcset="' + esc(srcset.join(', ')) + '" sizes="' + SIZES + '"' : '') +
      ' alt="' + esc(alt) + '" loading="lazy"' +
      (image.width ? ' width="' + image.width + '" height="' + image.height + '"' : '') + '>';
  }
  function card(p, g, gid, i) {
    var pid = gid + '-' + (i + 1);
    var onSale = p.available !== false && p.compareAt && Number(p.compareAt) > Number(p.price);
    var badge = p.available === false ? UNI_SETTINGS.soldOutLabel : (onSale ? 'Sale' : '');
    var ratio = 125;
    if (g.imageRatio === 'square') ratio = 100;
    if (g.imageRatio === 'adapt') ratio = (p.image && p.image.width) ? p.image.height / p.image.width * 100 : 100;
    var priceText = money(p.price);
    if (p.priceMax && Number(p.priceMax) > Number(p.price)) priceText = 'From ' + priceText;

    var h = '<li class="uni-pg__item uni-reveal" data-cascade style="--animation-order: ' + (i + 1) + ';"><div class="uni-pg__card">';
    var hasHover = !!(g.secondaryImage && p.image2);
    h += '<div class="uni-pg__media' + (hasHover ? ' uni-pg__media--has-hover' : '') + '" style="--uni-ratio: ' + Math.round(ratio * 10000) / 10000 + '%;">';
    if (p.image) h += img(p.image, 'uni-pg__img', p.title);
    if (hasHover) h += img(p.image2, 'uni-pg__img uni-pg__img--hover', '');
    if (badge) h += '<span id="' + pid + '-badge" class="uni-pg__badge">' + esc(badge) + '</span>';
    h += '</div><div class="uni-pg__content"><div class="uni-pg__info">';
    h += '<h3 class="uni-pg__name" id="' + pid + '-title"><a class="uni-pg__link" href="' + esc(p.url || '#') + '"' +
      (badge ? ' aria-describedby="' + pid + '-badge"' : '') + '>' + esc(p.title) + '</a></h3>';
    if (g.showRating) {
      var rid = String(p.url || '').split('id=')[1] || '';
      var rt = window.UNI_CARD_RATINGS && UNI_CARD_RATINGS[decodeURIComponent(rid)];
      if (rt) {
        var full = Math.round(rt[0]), st = '';
        for (var si = 1; si <= 5; si++) st += '<svg viewBox="0 0 24 24" fill="currentColor"' + (si > full ? ' class="is-off"' : '') + ' aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>';
        h += '<div class="uni-pg__rating"><span class="hm-stars" role="img" aria-label="Rated ' + rt[0] + ' out of 5">' + st + '</span><span>' + rt[0] + ' (' + rt[1] + ')</span></div>';
      }
    }
    h += '<div class="uni-pg__price">';
    if (onSale) {
      h += '<span class="uni-pg__sr">Regular price</span><s class="uni-pg__price-item uni-pg__price-item--compare">' + esc(money(p.compareAt)) + '</s>';
      h += '<span class="uni-pg__sr">Sale price</span><span class="uni-pg__price-item">' + esc(priceText) + '</span>';
    } else {
      h += '<span class="uni-pg__sr">Regular price</span><span class="uni-pg__price-item">' + esc(priceText) + '</span>';
    }
    if (p.available === false && p.soldOutNote) {
      h += '<p class="uni-pg__note">' + esc(p.soldOutNote) + '</p>';
    }
    if (g.perUnit && p.available !== false) {
      var pack = /^(\d+)\s*PC/i.exec(p.title || '');
      if (pack && +pack[1] > 1) h += '<span class="uni-pg__unit">' + esc(fmt.format(Number(p.price) / +pack[1])) + ' / unit</span>';
    }
    h += '</div></div>';
    if (g.quickAdd) {
      h += '<div class="uni-pg__quick">';
      if (p.available === false) {
        h += '<span class="uni-pg__btn uni-pg__btn--disabled" aria-disabled="true"><span class="uni-pg__btn-text">' + esc(UNI_SETTINGS.soldOutLabel) + '</span></span>';
      } else if ((p.variants || 1) > 1) {
        h += '<a class="uni-pg__btn" href="' + esc(p.url || '#') + '" aria-label="' + esc(UNI_SETTINGS.chooseOptionsLabel + ' for ' + p.title) + '"><span class="uni-pg__btn-text">' + esc(UNI_SETTINGS.chooseOptionsLabel) + '</span></a>';
      } else if (p.available === false) {
        h += '<span class="uni-pg__btn uni-pg__btn--disabled" aria-disabled="true"><span class="uni-pg__btn-text">' + esc(UNI_SETTINGS.soldOutLabel) + '</span></span>';
      } else {
        var href = p.buyUrl || p.url || '#';
        h += '<a class="uni-pg__btn" href="' + esc(href) + '"' + (p.buyUrl ? ' target="_blank" rel="noopener"' : '') +
          ' aria-label="' + esc(UNI_SETTINGS.addToCartLabel + ': ' + p.title) + '"><span class="uni-pg__btn-text">' + esc(UNI_SETTINGS.addToCartLabel) + '</span></a>';
      }
      h += '</div>';
    }
    return h + '</div></div></li>';
  }
  function grid(el) {
    var g = UNI_GRIDS[el.getAttribute('data-uni-grid')];
    if (!g) return;
    var all = UNI_PRODUCTS[g.products] || [];
    var items = all.slice(0, g.limit);
    if (g.soldOutLast) items = items.filter(function (p) { return p.available !== false; }).concat(items.filter(function (p) { return p.available === false; }));
    var gid = el.id;
    var pt = g.paddingTop || 0, pb = g.paddingBottom || 0;
    el.setAttribute('style', '--uni-pg-pt:' + pt + 'px;--uni-pg-pb:' + pb + 'px;--uni-pg-pt-m:' + Math.round(pt * 0.75) + 'px;--uni-pg-pb-m:' + Math.round(pb * 0.75) +
      'px;--uni-pg-cols:' + g.columnsDesktop + ';--uni-pg-cols-m:' + g.columnsMobile + ';');
    var h = '';
    if (g.promoBar) h += '<div class="uni-pg__promo">' + esc(g.promoBar) + '</div>';
    if (g.headerHtml) {
      el.setAttribute('aria-labelledby', gid + '-title');
      h += '<div class="uni-pg__page">' + g.headerHtml + '</div>';
    } else if (g.heading) {
      el.setAttribute('aria-labelledby', gid + '-title');
      h += '<div class="uni-pg__page uni-pg__head' + (g.hasDescription ? '' : ' uni-pg__head--plain') + '">' +
        '<h2 id="' + gid + '-title" class="uni-pg__title uni-pg__title--' + (g.headingSize || 'h1') + ' uni-reveal">' + g.heading + '</h2></div>';
    }
    h += '<div class="uni-pg__page uni-reveal"><ul class="uni-pg__grid" role="list">';
    items.forEach(function (p, i) { h += card(p, g, gid, i); });
    h += '</ul></div>';
    if (g.viewAll && all.length > g.limit && g.viewAllUrl) {
      h += '<div class="uni-pg__viewall uni-reveal"><a class="uni-pg__va uni-pg__va--solid" href="' + esc(g.viewAllUrl) + '">View all</a></div>';
    }
    el.innerHTML = h;
  }
  window.UNI_RENDER_GRID = grid;
  Array.prototype.forEach.call(document.querySelectorAll('[data-uni-grid]'), grid);
})();

/* Single-variant "Add to cart" buttons add straight to the cart (and open
   the cart drawer). Delegated, so it also works for grids rendered later.
   Multi-variant products say "Choose options" and link to the product page. */
(function () {
  function byUrl(url) {
    var m = String(url || '').match(/[?&]id=([^&]+)/);
    if (!m) return null;
    var slug = decodeURIComponent(m[1]);
    var all = (window.UNI_PRODUCTS && (UNI_PRODUCTS.singles || []).concat(UNI_PRODUCTS.bulk || [])) || [];
    for (var i = 0; i < all.length; i++) if (String(all[i].url || '').indexOf('id=' + slug) !== -1) return { p: all[i], slug: slug };
    return null;
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.uni-pg__btn');
    if (!btn || btn.classList.contains('uni-pg__btn--disabled') || btn.target === '_blank') return;
    var label = ((btn.querySelector('.uni-pg__btn-text') || {}).textContent || '').trim();
    if (label !== ((window.UNI_SETTINGS && UNI_SETTINGS.addToCartLabel) || 'Add to cart')) return;
    var hit = byUrl(btn.getAttribute('href'));
    if (!hit || !window.UNI_CART) return;
    e.preventDefault();
    UNI_CART.add({ slug: hit.slug, title: hit.p.title, price: hit.p.price, variant: '', qty: 1, image: (hit.p.image && hit.p.image.src) || '' });
  });
})();
