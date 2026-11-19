/* ---------------------------------------------------------------
   UNI — shared cart module
   Stores cart in localStorage. Shape:
     [{ slug, title, price, variant, qty, image }]
   Public API (on window.UNI_CART):
     get()                        → current items array
     add(item)                    → push or merge by (slug+variant)
     setQty(slug, variant, qty)   → update quantity (removes if 0)
     remove(slug, variant)        → remove line
     clear()                      → empty cart
     count()                      → total number of items (sum of qty)
     subtotal()                   → total price in dollars
     onChange(fn)                 → subscribe; fn() called on any mutation

   Also paints a badge on the cart icon (`a[aria-label="Cart"]`) with
   the current item count, on every page that loads this script.
--------------------------------------------------------------- */
(function () {
  var KEY = 'uni_cart_v1';

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch (e) { return []; }
  }
  function write(items) {
    try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
    listeners.forEach(function (fn) { try { fn(); } catch (e) {} });
    paintBadge();
  }
  function matchLine(a, b) {
    return a.slug === b.slug && (a.variant || '') === (b.variant || '');
  }

  var listeners = [];
  var UNI_CART = {
    get: read,
    add: function (item) {
      var items = read();
      var found = false;
      for (var i = 0; i < items.length; i++) {
        if (matchLine(items[i], item)) {
          items[i].qty = (items[i].qty || 1) + (item.qty || 1);
          found = true;
          break;
        }
      }
      if (!found) {
        items.push({
          slug: item.slug,
          title: item.title,
          price: Number(item.price) || 0,
          variant: item.variant || '',
          qty: Number(item.qty) || 1,
          image: item.image || ''
        });
      }
      write(items);
    },
    setQty: function (slug, variant, qty) {
      var items = read();
      qty = Math.max(0, Math.floor(Number(qty) || 0));
      var out = [];
      for (var i = 0; i < items.length; i++) {
        if (matchLine(items[i], { slug: slug, variant: variant })) {
          if (qty > 0) { items[i].qty = qty; out.push(items[i]); }
        } else out.push(items[i]);
      }
      write(out);
    },
    remove: function (slug, variant) { UNI_CART.setQty(slug, variant, 0); },
    clear: function () { write([]); },
    count: function () {
      return read().reduce(function (n, it) { return n + (it.qty || 1); }, 0);
    },
    subtotal: function () {
      return read().reduce(function (s, it) {
        return s + (Number(it.price) || 0) * (it.qty || 1);
      }, 0);
    },
    onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); }
  };

  /* Cart icon badge — appears on any cart icon anchor in the header */
  function paintBadge() {
    var links = document.querySelectorAll('a[aria-label="Cart"]');
    var n = UNI_CART.count();
    links.forEach(function (a) {
      a.style.position = a.style.position || 'relative';
      var dot = a.querySelector('.uni-cart-badge');
      if (!n) { if (dot) dot.remove(); return; }
      if (!dot) {
        dot = document.createElement('span');
        dot.className = 'uni-cart-badge';
        dot.style.cssText = 'position:absolute;top:-6px;right:-10px;min-width:18px;height:18px;padding:0 5px;background:#E8C766;color:#111;border-radius:999px;font-family:"Avenir Next","Helvetica Neue",Arial,sans-serif;font-size:11px;font-weight:700;line-height:18px;text-align:center;';
        a.appendChild(dot);
      }
      dot.textContent = String(n);
    });
  }
  function init() { paintBadge(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.UNI_CART = UNI_CART;
})();
