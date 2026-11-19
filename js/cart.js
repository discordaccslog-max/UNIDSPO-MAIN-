/* ---------------------------------------------------------------
   UNI — shared cart module + cart drawer
   Stores cart in localStorage. Shape:
     [{ slug, title, price, variant, qty, image }]
   Public API (on window.UNI_CART):
     get()                        → current items array
     add(item, opts)              → push or merge by (slug+variant); opens the
                                    cart drawer unless opts.silent is true
     setQty(slug, variant, qty)   → update quantity (removes if 0)
     remove(slug, variant)        → remove line
     clear()                      → empty cart
     count()                      → total number of items (sum of qty)
     subtotal()                   → total price in dollars
     onChange(fn)                 → subscribe; fn() called on any mutation
     open() / close()             → show / hide the cart drawer

   Also on every page that loads this script:
     - a badge with the item count on the header cart icon (a[aria-label="Cart"])
     - the cart icon opens the drawer instead of going to cart.html
     - window.UNI_DELIVERY: delivery-date estimate shared by the product page
       timeline and the drawer, so they always agree
     - window.UNI_UI.paymentsHtml(): the accepted-payment logo row
   Checkout is a demo: the Secure Checkout button fires a cancelable
   "uni:checkout" event (detail = { items, subtotal }) for a real checkout
   to handle later; if nothing handles it, it shows the demo message.
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
    add: function (item, opts) {
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
      if (!(opts && opts.silent)) UNI_CART.open();
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
    onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); },
    open: function () { drawer.open(); },
    close: function () { drawer.close(); }
  };

  /* ---------- Delivery estimate (shared) ----------
     Packed the next business day (one day later if ordered after the
     cutoff on a business day; weekend/holiday orders are packed the next
     business day), then 2-4 business days in transit. Pacific time.
     Weekends and USPS holidays are skipped. */
  var UNI_DELIVERY = {
    settings: {
      timeZone: 'America/Los_Angeles',
      cutoffHour: 14,          /* 2 PM Pacific */
      packDays: 1,             /* business days from order to "Order Ready" */
      transitDays: [2, 4],     /* business days from "Order Ready" to delivery */
      holidays: ['2026-11-26', '2026-12-25', '2027-01-01', '2027-01-18', '2027-02-15', '2027-05-31',
                 '2027-06-18', '2027-07-05', '2027-09-06', '2027-10-11', '2027-11-11', '2027-11-25', '2027-12-24', '2027-12-31']
    },
    isBusinessDay: function (dt) {
      var wd = dt.getUTCDay();
      return wd !== 0 && wd !== 6 && UNI_DELIVERY.settings.holidays.indexOf(dt.toISOString().slice(0, 10)) === -1;
    },
    addBusinessDays: function (dt, n) {
      var r = new Date(dt.getTime());
      while (n > 0) { r.setUTCDate(r.getUTCDate() + 1); if (UNI_DELIVERY.isBusinessDay(r)) n--; }
      return r;
    },
    estimate: function (now) {
      var S = UNI_DELIVERY.settings;
      var f = new Intl.DateTimeFormat('en-US', { timeZone: S.timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' });
      var o = {}; f.formatToParts(now || new Date()).forEach(function (x) { o[x.type] = x.value; });
      var order = new Date(Date.UTC(+o.year, +o.month - 1, +o.day));
      var afterCutoff = UNI_DELIVERY.isBusinessDay(order) && +o.hour >= S.cutoffHour;
      var ready = UNI_DELIVERY.addBusinessDays(order, S.packDays + (afterCutoff ? 1 : 0));
      return {
        order: order,
        ready: ready,
        earliest: UNI_DELIVERY.addBusinessDays(ready, S.transitDays[0]),
        latest: UNI_DELIVERY.addBusinessDays(ready, S.transitDays[1])
      };
    },
    format: function (dt) {
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    },
    cutoffNote: function () {
      var h = UNI_DELIVERY.settings.cutoffHour;
      return 'Orders placed before ' + (h > 12 ? (h - 12) + ' PM' : h + ' AM') + ' Pacific are packed the next business day.';
    }
  };

  /* ---------- Shared UI pieces ---------- */
  var ICON = {"visa": "M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z", "amex": "M16.015 14.378c0-.32-.135-.496-.344-.622-.21-.12-.464-.135-.81-.135h-1.543v2.82h.675v-1.027h.72c.24 0 .39.024.478.125.12.13.104.38.104.55v.35h.66v-.555c-.002-.25-.017-.376-.108-.516-.06-.08-.18-.18-.33-.234l.02-.008c.18-.072.48-.297.48-.747zm-.87.407l-.028-.002c-.09.053-.195.058-.33.058h-.81v-.63h.824c.12 0 .24 0 .33.05.098.048.156.147.15.255 0 .12-.045.215-.134.27zM20.297 15.837H19v.6h1.304c.676 0 1.05-.278 1.05-.884 0-.28-.066-.448-.187-.582-.153-.133-.392-.193-.73-.207l-.376-.015c-.104 0-.18 0-.255-.03-.09-.03-.15-.105-.15-.21 0-.09.017-.166.09-.21.083-.046.177-.066.272-.06h1.23v-.602h-1.35c-.704 0-.958.437-.958.84 0 .9.776.855 1.407.87.104 0 .18.015.225.06.046.03.082.106.082.18 0 .077-.035.15-.08.18-.06.053-.15.07-.277.07zM0 0v10.096L.81 8.22h1.75l.225.464V8.22h2.043l.45 1.02.437-1.013h6.502c.295 0 .56.057.756.236v-.23h1.787v.23c.307-.17.686-.23 1.12-.23h2.606l.24.466v-.466h1.918l.254.465v-.466h1.858v3.948H20.87l-.36-.6v.585h-2.353l-.256-.63h-.583l-.27.614h-1.213c-.48 0-.84-.104-1.08-.24v.24h-2.89v-.884c0-.12-.03-.12-.105-.135h-.105v1.036H6.067v-.48l-.21.48H4.69l-.202-.48v.465H2.235l-.256-.624H1.4l-.256.624H0V24h23.786v-7.108c-.27.135-.613.18-.973.18H21.09v-.255c-.21.165-.57.255-.914.255H14.71v-.9c0-.12-.018-.12-.12-.12h-.075v1.022h-1.8v-1.066c-.298.136-.643.15-.928.136h-.214v.915h-2.18l-.54-.617-.57.6H4.742v-3.93h3.61l.518.602.554-.6h2.412c.28 0 .74.03.942.225v-.24h2.177c.202 0 .644.045.903.225v-.24h3.265v.24c.163-.164.508-.24.803-.24h1.89v.24c.194-.15.464-.24.84-.24h1.176V0H0zM21.156 14.955c.004.005.006.012.01.016.01.01.024.01.032.02l-.042-.035zM23.828 13.082h.065v.555h-.065zM23.865 15.03v-.005c-.03-.025-.046-.048-.075-.07-.15-.153-.39-.215-.764-.225l-.36-.012c-.12 0-.194-.007-.27-.03-.09-.03-.15-.105-.15-.21 0-.09.03-.16.09-.204.076-.045.15-.05.27-.05h1.223v-.588h-1.283c-.69 0-.96.437-.96.84 0 .9.78.855 1.41.87.104 0 .18.015.224.06.046.03.076.106.076.18 0 .07-.034.138-.09.18-.045.056-.136.07-.27.07h-1.288v.605h1.287c.42 0 .734-.118.9-.36h.03c.09-.134.135-.3.135-.523 0-.24-.045-.39-.135-.526zM18.597 14.208v-.583h-2.235V16.458h2.235v-.585h-1.57v-.57h1.533v-.584h-1.532v-.51M13.51 8.787h.685V11.6h-.684zM13.126 9.543l-.007.006c0-.314-.13-.5-.34-.624-.217-.125-.47-.135-.81-.135H10.43v2.82h.674v-1.034h.72c.24 0 .39.03.487.12.122.136.107.378.107.548v.354h.677v-.553c0-.25-.016-.375-.11-.516-.09-.107-.202-.19-.33-.237.172-.07.472-.3.472-.75zm-.855.396h-.015c-.09.054-.195.056-.33.056H11.1v-.623h.825c.12 0 .24.004.33.05.09.04.15.128.15.25s-.047.22-.134.266zM15.92 9.373h.632v-.6h-.644c-.464 0-.804.105-1.02.33-.286.3-.362.69-.362 1.11 0 .512.123.833.36 1.074.232.238.645.31.97.31h.78l.255-.627h1.39l.262.627h1.36v-2.11l1.272 2.11h.95l.002.002V8.786h-.684v1.963l-1.18-1.96h-1.02V11.4L18.11 8.744h-1.004l-.943 2.22h-.3c-.177 0-.362-.03-.468-.134-.125-.15-.186-.36-.186-.662 0-.285.08-.51.194-.63.133-.135.272-.165.516-.165zm1.668-.108l.464 1.118v.002h-.93l.466-1.12zM2.38 10.97l.254.628H4V9.393l.972 2.205h.584l.973-2.202.015 2.202h.69v-2.81H6.118l-.807 1.904-.876-1.905H3.343v2.663L2.205 8.787h-.997L.01 11.597h.72l.26-.626h1.39zm-.688-1.705l.46 1.118-.003.002h-.915l.457-1.12zM11.856 13.62H9.714l-.85.923-.825-.922H5.346v2.82H8l.855-.932.824.93h1.302v-.94h.838c.6 0 1.17-.164 1.17-.945l-.006-.003c0-.78-.598-.93-1.128-.93zM7.67 15.853l-.014-.002H6.02v-.557h1.47v-.574H6.02v-.51H7.7l.733.82-.764.824zm2.642.33l-1.03-1.147 1.03-1.108v2.253zm1.553-1.258h-.885v-.717h.885c.24 0 .42.098.42.344 0 .243-.15.372-.42.372zM9.967 9.373v-.586H7.73V11.6h2.237v-.58H8.4v-.564h1.527V9.88H8.4v-.507", "applepay": "M2.15 4.318a42.16 42.16 0 0 0-.454.003c-.15.005-.303.013-.452.04a1.44 1.44 0 0 0-1.06.772c-.07.138-.114.278-.14.43-.028.148-.037.3-.04.45A10.2 10.2 0 0 0 0 6.222v11.557c0 .07.002.138.003.207.004.15.013.303.04.452.027.15.072.291.142.429a1.436 1.436 0 0 0 .63.63c.138.07.278.115.43.142.148.027.3.036.45.04l.208.003h20.194l.207-.003c.15-.004.303-.013.452-.04.15-.027.291-.071.428-.141a1.432 1.432 0 0 0 .631-.631c.07-.138.115-.278.141-.43.027-.148.036-.3.04-.45.002-.07.003-.138.003-.208l.001-.246V6.221c0-.07-.002-.138-.004-.207a2.995 2.995 0 0 0-.04-.452 1.446 1.446 0 0 0-1.2-1.201 3.022 3.022 0 0 0-.452-.04 10.448 10.448 0 0 0-.453-.003zm0 .512h19.942c.066 0 .131.002.197.003.115.004.25.01.375.032.109.02.2.05.287.094a.927.927 0 0 1 .407.407.997.997 0 0 1 .094.288c.022.123.028.258.031.374.002.065.003.13.003.197v11.552c0 .065 0 .13-.003.196-.003.115-.009.25-.032.375a.927.927 0 0 1-.5.693 1.002 1.002 0 0 1-.286.094 2.598 2.598 0 0 1-.373.032l-.2.003H1.906c-.066 0-.133-.002-.196-.003a2.61 2.61 0 0 1-.375-.032c-.109-.02-.2-.05-.288-.094a.918.918 0 0 1-.406-.407 1.006 1.006 0 0 1-.094-.288 2.531 2.531 0 0 1-.032-.373 9.588 9.588 0 0 1-.002-.197V6.224c0-.065 0-.131.002-.197.004-.114.01-.248.032-.375.02-.108.05-.199.094-.287a.925.925 0 0 1 .407-.406 1.03 1.03 0 0 1 .287-.094c.125-.022.26-.029.375-.032.065-.002.131-.002.196-.003zm4.71 3.7c-.3.016-.668.199-.88.456-.191.22-.36.58-.316.918.338.03.675-.169.888-.418.205-.258.345-.603.308-.955zm2.207.42v5.493h.852v-1.877h1.18c1.078 0 1.835-.739 1.835-1.812 0-1.07-.742-1.805-1.808-1.805zm.852.719h.982c.739 0 1.161.396 1.161 1.089 0 .692-.422 1.092-1.164 1.092h-.979zm-3.154.3c-.45.01-.83.28-1.05.28-.235 0-.593-.264-.981-.257a1.446 1.446 0 0 0-1.23.747c-.527.908-.139 2.255.374 2.995.249.366.549.769.944.754.373-.014.52-.242.973-.242.454 0 .586.242.98.235.41-.007.667-.366.915-.733.286-.417.403-.82.41-.841-.007-.008-.79-.308-.797-1.209-.008-.754.615-1.113.644-1.135-.352-.52-.9-.578-1.09-.593a1.123 1.123 0 0 0-.092-.002zm8.204.397c-.99 0-1.606.533-1.652 1.256h.777c.072-.358.369-.586.845-.586.502 0 .803.266.803.711v.309l-1.097.064c-.951.054-1.488.484-1.488 1.184 0 .72.548 1.207 1.332 1.207.526 0 1.032-.281 1.264-.727h.019v.659h.788v-2.76c0-.803-.62-1.317-1.591-1.317zm1.94.072l1.446 4.009c0 .003-.073.24-.073.247-.125.41-.33.571-.711.571-.069 0-.206 0-.267-.015v.666c.06.011.267.019.335.019.83 0 1.226-.312 1.568-1.283l1.5-4.214h-.868l-1.012 3.259h-.015l-1.013-3.26zm-1.167 2.189v.316c0 .521-.45.917-1.024.917-.442 0-.731-.228-.731-.579 0-.342.278-.56.769-.593z", "googlepay": "M3.963 7.235A3.963 3.963 0 00.422 9.419a3.963 3.963 0 000 3.559 3.963 3.963 0 003.541 2.184c1.07 0 1.97-.352 2.627-.957.748-.69 1.18-1.71 1.18-2.916a4.722 4.722 0 00-.07-.806H3.964v1.526h2.14a1.835 1.835 0 01-.79 1.205c-.356.241-.814.379-1.35.379-1.034 0-1.911-.697-2.225-1.636a2.375 2.375 0 010-1.517c.314-.94 1.191-1.636 2.225-1.636a2.152 2.152 0 011.52.594l1.132-1.13a3.808 3.808 0 00-2.652-1.033zm6.501.55v6.9h.886V11.89h1.465c.603 0 1.11-.196 1.522-.588a1.911 1.911 0 00.635-1.464 1.92 1.92 0 00-.635-1.456 2.125 2.125 0 00-1.522-.598zm2.427.85a1.156 1.156 0 01.823.365 1.176 1.176 0 010 1.686 1.171 1.171 0 01-.877.357H11.35V8.635h1.487a1.156 1.156 0 01.054 0zm4.124 1.175c-.842 0-1.477.308-1.907.925l.781.491c.288-.417.68-.626 1.175-.626a1.255 1.255 0 01.856.323 1.009 1.009 0 01.366.785v.202c-.34-.193-.774-.289-1.3-.289-.617 0-1.11.145-1.479.434-.37.288-.554.677-.554 1.165a1.476 1.476 0 00.525 1.156c.35.308.785.463 1.305.463.61 0 1.098-.27 1.465-.81h.038v.655h.848v-2.909c0-.61-.19-1.09-.568-1.44-.38-.35-.896-.525-1.551-.525zm2.263.154l1.946 4.422-1.098 2.38h.915L24 9.963h-.965l-1.368 3.391h-.02l-1.406-3.39zm-2.146 2.368c.494 0 .88.11 1.156.33 0 .372-.147.696-.44.973a1.413 1.413 0 01-.997.414 1.081 1.081 0 01-.69-.232.708.708 0 01-.293-.578c0-.257.12-.47.363-.647.24-.173.54-.26.9-.26Z", "discover": "M14.58 12a2.023 2.023 0 1 1-2.025-2.023h.002c1.118 0 2.023.906 2.023 2.023zm-5.2-2.001c-1.124 0-2.025.884-2.025 1.99 0 1.118.878 1.984 2.007 1.984.319 0 .593-.063.93-.221v-.873c-.296.297-.559.416-.895.416-.747 0-1.277-.542-1.277-1.312 0-.73.547-1.306 1.243-1.306.354 0 .622.126.93.428v-.873a1.898 1.898 0 0 0-.913-.233zm-3.352 1.545c-.445-.165-.576-.273-.576-.479 0-.239.233-.422.553-.422.222 0 .405.091.598.308l.388-.508a1.665 1.665 0 0 0-1.117-.422c-.673 0-1.186.467-1.186 1.089 0 .524.239.792.936 1.043.291.103.438.171.513.217a.456.456 0 0 1 .222.394c0 .308-.245.536-.576.536-.354 0-.639-.177-.809-.507l-.479.461c.342.502.752.724 1.317.724.771 0 1.311-.513 1.311-1.249-.002-.603-.252-.876-1.095-1.185zM24 10.3a.29.29 0 0 1-.288.291.29.29 0 0 1-.291-.291v-.003A.29.29 0 1 1 24 10.3zm-.059.001a.235.235 0 0 0-.231-.239.234.234 0 0 0-.232.239c0 .132.104.239.232.239a.235.235 0 0 0 .231-.239zM3.472 13.887h.742v-3.803h-.742v3.803zm12.702-1.248l-1.014-2.554h-.81l1.614 3.9h.399l1.643-3.9h-.804l-1.028 2.554zm2.166 1.248h2.104v-.644h-1.362v-1.027h1.312v-.644h-1.312v-.844h1.362v-.644H18.34v3.803zm5.409-3.557l.11.138h-.097l-.094-.13v.13h-.08v-.334h.107c.081 0 .126.036.126.103.001.046-.025.08-.072.093zm-.006-.092c0-.029-.021-.043-.06-.043h-.014v.087h.014c.039 0 .06-.014.06-.044zm-1.228 2.047l1.197 1.602H22.8l-1.027-1.528h-.097v1.528h-.741v-3.803h1.1c.855 0 1.346.411 1.346 1.123 0 .583-.308.965-.866 1.078zm.103-1.038c0-.37-.251-.563-.713-.563h-.228v1.152h.217c.473-.001.724-.207.724-.589zm-19.487.742a1.91 1.91 0 0 1-.69 1.46c-.365.303-.781.439-1.357.439H.001v-3.803H1.09c1.202 0 2.041.781 2.041 1.904zm-.764-.006c0-.364-.154-.718-.411-.947-.245-.222-.536-.308-1.015-.308H.742v2.515h.199c.479 0 .782-.092 1.015-.302.256-.228.411-.593.411-.958z", "trustpilot": "M17.227 16.67l2.19 6.742-7.413-5.388 5.223-1.354zM24 9.31h-9.165L12.005.589l-2.84 8.723L0 9.3l7.422 5.397-2.84 8.714 7.422-5.388 4.583-3.326L24 9.311z"};
  var UNI_UI = {
    trustpilotLogo: function () {
      return '<span class="uni-tp"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#00B67A" d="' + ICON.trustpilot + '"/></svg>Trustpilot</span>';
    },
    paymentsHtml: function () {
      return '<ul class="uni-pay" aria-label="Accepted payment methods">' +
        '<li title="Mastercard"><svg width="26" height="16" viewBox="0 0 32 20" role="img" aria-label="Mastercard"><circle cx="12" cy="10" r="8" fill="#EB001B"/><circle cx="20" cy="10" r="8" fill="#F79E1B"/><path fill="#FF5F00" d="M16 3.07a8 8 0 0 1 0 13.86 8 8 0 0 1 0-13.86z"/></svg></li>' +
        '<li class="uni-pay--amex" title="American Express"><svg width="23" height="23" viewBox="0 0 24 24" role="img" aria-label="American Express"><path fill="#ffffff" d="' + ICON.amex + '"/></svg></li>' +
        '<li title="Apple Pay"><svg width="30" height="30" viewBox="0 0 24 24" role="img" aria-label="Apple Pay"><path fill="#000000" d="' + ICON.applepay + '"/></svg></li>' +
        '<li title="Google Pay"><svg width="30" height="30" viewBox="0 0 24 24" role="img" aria-label="Google Pay"><path fill="#5F6368" d="' + ICON.googlepay + '"/></svg></li>' +
        '<li class="uni-pay--shop" title="Shop Pay" role="img" aria-label="Shop Pay"><span>shop</span>Pay</li>' +
        '<li title="Discover"><svg width="34" height="34" viewBox="0 0 24 24" role="img" aria-label="Discover"><path fill="#231F20" d="' + ICON.discover + '"/></svg></li>' +
        '<li title="Visa"><svg width="30" height="30" viewBox="0 0 24 24" role="img" aria-label="Visa"><path fill="#1A1F71" d="' + ICON.visa + '"/></svg></li>' +
      '</ul>';
    }
  };

  /* Demo values for the drawer banner (same score as the product pages). */
  var UNI_BANNER = {
    logo: 'images/uni-logo.webp',
    rating: 4.7,
    outOf: 5,
    customers: 'Over 35,000 satisfied customers'
  };

  var CSS = '' +
    /* payment logos (product page + drawer) */
    '.uni-pay{display:flex;justify-content:center;flex-wrap:wrap;gap:6px;margin:0;padding:0;list-style:none}' +
    '.uni-pay li{width:40px;height:26px;display:inline-flex;align-items:center;justify-content:center;background:#fff;border:1px solid rgba(255,255,255,.18);border-radius:5px;overflow:hidden}' +
    '.uni-pay li svg{display:block}' +
    '.uni-pay .uni-pay--amex{background:#2E77BC;border-color:#2E77BC}' +
    '.uni-pay .uni-pay--shop{background:#5A31F4;border-color:#5A31F4;color:#fff;font-family:"Helvetica Neue",Arial,sans-serif;font-size:9.5px;font-weight:700;letter-spacing:-.1px;white-space:nowrap}' +
    '.uni-pay .uni-pay--shop span{font-weight:800;margin-right:2px}' +
    '.uni-tp{display:inline-flex;align-items:center;gap:5px;color:#fff;font-family:"Helvetica Neue",Arial,sans-serif;font-weight:600;letter-spacing:-.2px;white-space:nowrap}' +
    '.uni-tp svg{width:1.15em;height:1.15em;display:block}' +
    /* drawer */
    '.uc-overlay{position:fixed;inset:0;z-index:100400;background:rgba(0,0,0,.6);opacity:0;transition:opacity .3s ease}' +
    '.uc-overlay.is-open{opacity:1}' +
    '.uc{position:fixed;top:0;right:0;bottom:0;z-index:100500;width:100%;max-width:460px;display:flex;flex-direction:column;background:#0e0e10;color:#fff;border-left:1px solid rgba(212,175,55,.22);box-shadow:-24px 0 60px rgba(0,0,0,.5);transform:translateX(100%);transition:transform .38s cubic-bezier(.22,1,.36,1);font-size:15px;line-height:1.4}' +
    '.uc.is-open{transform:none}' +
    '.uc[hidden],.uc-overlay[hidden]{display:none}' +
    '.uc *{box-sizing:border-box}' +
    '.uc-head{display:flex;align-items:center;gap:12px;padding:20px 20px 18px;border-bottom:1px solid rgba(255,255,255,.08)}' +
    '.uc-head h2{margin:0;font-family:"Oswald",sans-serif;font-weight:500;font-size:28px;line-height:1;letter-spacing:.5px;color:#fff;text-transform:none}' +
    '.uc-badge{min-width:30px;height:30px;padding:0 8px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:linear-gradient(180deg,#E8C766,#BA9930);color:#111;font-weight:700;font-size:14px}' +
    '.uc-close{margin-left:auto;width:44px;height:44px;display:inline-flex;align-items:center;justify-content:center;background:none;border:0;color:#fff;cursor:pointer;border-radius:50%;padding:0}' +
    '.uc-close:hover{background:rgba(255,255,255,.06)}' +
    '.uc-close svg{width:24px;height:24px}' +
    '.uc-body{flex:1 1 auto;overflow-y:auto;overscroll-behavior:contain;padding:20px}' +
    /* banner */
    '.uc-banner{position:relative;overflow:hidden;display:flex;align-items:center;gap:16px;padding:16px 18px;background:radial-gradient(120% 140% at 0% 50%,rgba(212,175,55,.16),rgba(212,175,55,0) 55%),linear-gradient(90deg,#17140d,#0f0f10 70%);border:1px solid rgba(212,175,55,.28);border-radius:4px}' +
    '.uc-banner::after{content:"UNI";position:absolute;right:-10px;top:50%;transform:translateY(-50%);font-family:"Oswald",sans-serif;font-weight:700;font-size:118px;line-height:1;letter-spacing:2px;color:rgba(212,175,55,.06);pointer-events:none}' +
    '.uc-banner__logo{position:relative;z-index:1;flex:0 0 64px;width:64px;height:64px;display:block}' +
    '.uc-banner__divider{position:relative;z-index:1;flex:0 0 1px;align-self:stretch;background:rgba(212,175,55,.35)}' +
    '.uc-banner__copy{position:relative;z-index:1;min-width:0}' +
    '.uc-banner__row{display:flex;align-items:center;flex-wrap:wrap;gap:8px 10px;font-size:16px}' +
    '.uc-boxes{display:inline-flex;gap:2px}' +
    '.uc-boxes i{width:19px;height:19px;display:inline-flex;align-items:center;justify-content:center}' +
    '.uc-boxes svg{width:13px;height:13px;display:block}' +
    '.uc-banner__score{font-family:"Oswald",sans-serif;font-weight:500;font-size:19px;letter-spacing:.3px;color:#fff;line-height:1}' +
    '.uc-banner__sub{margin:7px 0 0;color:#D9CFB4;font-size:11.5px;font-weight:600;letter-spacing:2px;text-transform:uppercase}' +
    /* items */
    '.uc-items{list-style:none;margin:20px 0 0;padding:0}' +
    '.uc-item{display:grid;grid-template-columns:88px 1fr auto;gap:14px;padding:16px 0;border-bottom:1px solid rgba(255,255,255,.07)}' +
    '.uc-item:first-child{padding-top:4px}' +
    '.uc-item__img{width:88px;height:88px;border-radius:4px;background:#141416;border:1px solid rgba(255,255,255,.05);object-fit:contain;display:block}' +
    '.uc-item__title{margin:0;font-family:"Oswald",sans-serif;font-weight:500;font-size:17px;line-height:1.2;letter-spacing:.5px;color:#fff}' +
    '.uc-item__title a{color:inherit;text-decoration:none}' +
    '.uc-item__title a:hover{text-decoration:underline;text-underline-offset:3px}' +
    '.uc-item__variant{margin:4px 0 10px;color:#9EA0A6;font-size:14px}' +
    '.uc-item__price{font-family:"Oswald",sans-serif;font-size:16px;letter-spacing:.3px;color:#fff;white-space:nowrap;text-align:right}' +
    '.uc-item__controls{display:flex;align-items:center;gap:14px}' +
    '.uc-qty{display:inline-flex;align-items:stretch;height:40px;border:1px solid rgba(255,255,255,.2);border-radius:6px;overflow:hidden}' +
    '.uc-qty button{width:40px;background:none;border:0;color:#fff;font-size:18px;cursor:pointer;padding:0;font-family:inherit}' +
    '.uc-qty button:hover{background:rgba(255,255,255,.06)}' +
    '.uc-qty button:disabled{color:rgba(255,255,255,.3);cursor:default;background:none}' +
    '.uc-qty output{min-width:40px;display:inline-flex;align-items:center;justify-content:center;border-left:1px solid rgba(255,255,255,.14);border-right:1px solid rgba(255,255,255,.14);font-weight:600}' +
    '.uc-remove{width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;background:none;border:0;color:#9EA0A6;cursor:pointer;border-radius:50%;padding:0}' +
    '.uc-remove:hover{color:#fff;background:rgba(255,255,255,.06)}' +
    '.uc-remove svg{width:19px;height:19px}' +
    '.uc-empty{text-align:center;padding:48px 10px 20px}' +
    '.uc-empty p{margin:0 0 20px;color:#B9BBC0;font-size:16px}' +
    '.uc-empty a{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 28px;border-radius:999px;background:linear-gradient(180deg,#E8C766,#BA9930);color:#111;font-family:"Oswald",sans-serif;font-weight:500;font-size:16px;letter-spacing:1px;text-transform:uppercase;text-decoration:none}' +
    /* footer */
    '.uc-foot{flex:0 0 auto;padding:16px 20px calc(18px + env(safe-area-inset-bottom,0px));border-top:1px solid rgba(255,255,255,.08);background:#0e0e10}' +
    '.uc-foot[hidden]{display:none}' +
    '.uc-eta{display:flex;align-items:center;gap:10px;margin:0 0 14px;color:#D4D5D8;font-size:15px}' +
    '.uc-eta svg{width:22px;height:22px;flex:0 0 22px;color:#D4AF37}' +
    '.uc-eta strong{color:#fff;font-weight:700;white-space:nowrap}' +
    '.uc-total{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:0 0 14px;font-family:"Oswald",sans-serif;font-weight:500;color:#fff}' +
    '.uc-total span:first-child{font-size:22px;letter-spacing:.4px}' +
    '.uc-total span:last-child{font-size:22px;letter-spacing:.3px;white-space:nowrap}' +
    '.uc-checkout{width:100%;min-height:58px;display:flex;align-items:center;justify-content:center;gap:12px;border:1px solid #FFD700;border-radius:999px;background:linear-gradient(180deg,#E8C766,#BA9930);color:#111;font-family:"Oswald",sans-serif;font-weight:500;font-size:20px;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;box-shadow:0 12px 28px rgba(186,153,48,.28);transition:background .15s ease,box-shadow .15s ease,transform .1s ease}' +
    '.uc-checkout:hover{background:linear-gradient(180deg,#FFD976,#C8A732);box-shadow:0 14px 32px rgba(212,175,55,.38)}' +
    '.uc-checkout:active{transform:translateY(1px)}' +
    '.uc-checkout svg{width:21px;height:21px}' +
    '.uc-guarantee{margin:14px 0 2px;text-align:center;color:#fff;font-size:15px}' +
    '.uc-note{margin:0 0 14px;text-align:center;color:#9EA0A6;font-size:13.5px}' +
    '.uc :focus-visible{outline:2px solid #E8C766;outline-offset:2px}' +
    '@media (max-width:480px){.uc-banner{gap:12px;padding:14px}.uc-banner::after{font-size:96px}.uc-banner__logo{flex-basis:52px;width:52px;height:52px}.uc-banner__row{flex-wrap:nowrap;gap:7px;font-size:14px}.uc-boxes i{width:16px;height:16px}.uc-boxes svg{width:11px;height:11px}.uc-banner__score{font-size:16px}.uc-banner__sub{margin-top:6px;letter-spacing:1.3px;font-size:10px}}' +
    '@media (max-width:380px){.uc-banner{gap:10px;padding:12px}.uc-banner__logo{flex-basis:46px;width:46px;height:46px}.uc-banner__row{gap:5px;font-size:13px}.uc-boxes i{width:14px;height:14px}.uc-banner__score{font-size:15px}.uc-banner__sub{letter-spacing:.9px;font-size:9.5px}.uc-item{grid-template-columns:72px 1fr auto;gap:12px}.uc-item__img{width:72px;height:72px}}' +
    '@media (prefers-reduced-motion:reduce){.uc,.uc-overlay{transition:none}}';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  function money(n) { return fmt.format(Number(n) || 0) + ' USD'; }

  function boxesHtml(score) {
    var h = '';
    for (var i = 0; i < 5; i++) {
      var fill = Math.max(0, Math.min(1, score - i)) * 100;
      h += '<i style="background:linear-gradient(90deg,#E8C766 ' + fill + '%,rgba(255,255,255,.2) ' + fill + '%)">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#111" d="M12 2.2l2.95 6.3 6.85.78-5.08 4.66 1.38 6.76L12 17.3l-6.1 3.4 1.38-6.76L2.2 9.28l6.85-.78z"/></svg></i>';
    }
    return h;
  }

  /* ---------- Drawer ---------- */
  var drawer = (function () {
    var built = false, overlay, panel, body, list, empty, foot, badge, lastFocus = null, isOpen = false, closeTimer = null;

    function build() {
      if (built) return;
      built = true;
      var style = document.createElement('style');
      style.id = 'uni-cart-styles';
      style.textContent = CSS;
      document.head.appendChild(style);

      overlay = document.createElement('div');
      overlay.className = 'uc-overlay';
      overlay.hidden = true;

      panel = document.createElement('aside');
      panel.className = 'uc';
      panel.hidden = true;
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('aria-labelledby', 'uc-title');
      panel.innerHTML =
        '<div class="uc-head">' +
          '<h2 id="uc-title">Your Cart</h2>' +
          '<span class="uc-badge" aria-live="polite"></span>' +
          '<button type="button" class="uc-close" aria-label="Close cart"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg></button>' +
        '</div>' +
        '<div class="uc-body">' +
          '<div class="uc-banner">' +
            '<img class="uc-banner__logo" src="' + esc(UNI_BANNER.logo) + '" alt="UNI Dispo" width="64" height="64">' +
            '<span class="uc-banner__divider" aria-hidden="true"></span>' +
            '<div class="uc-banner__copy">' +
              '<div class="uc-banner__row" role="img" aria-label="Rated ' + UNI_BANNER.rating + ' out of ' + UNI_BANNER.outOf + ' on Trustpilot">' +
                UNI_UI.trustpilotLogo() +
                '<span class="uc-boxes">' + boxesHtml(UNI_BANNER.rating) + '</span>' +
                '<span class="uc-banner__score">' + UNI_BANNER.rating + '/' + UNI_BANNER.outOf + '</span>' +
              '</div>' +
              '<p class="uc-banner__sub">' + esc(UNI_BANNER.customers) + '</p>' +
            '</div>' +
          '</div>' +
          '<ul class="uc-items"></ul>' +
          '<div class="uc-empty" hidden><p>Your cart is empty.</p><a href="catalog.html">Continue shopping</a></div>' +
        '</div>' +
        '<div class="uc-foot">' +
          '<p class="uc-eta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 6h12v10h-12z"/><path d="M13.5 9.5h4.5l3.5 3.5v3h-8"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="17.5" cy="17.5" r="1.8"/></svg><span>Estimated delivery: <strong class="uc-eta__dates"></strong></span></p>' +
          '<div class="uc-total"><span class="uc-total__label"></span><span class="uc-total__amount"></span></div>' +
          '<button type="button" class="uc-checkout"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="11" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>Secure Checkout</button>' +
          '<p class="uc-guarantee">100% Satisfaction Guarantee</p>' +
          '<p class="uc-note">Shipping and taxes calculated at checkout.</p>' +
          UNI_UI.paymentsHtml() +
        '</div>';

      document.body.appendChild(overlay);
      document.body.appendChild(panel);
      body = panel.querySelector('.uc-body');
      list = panel.querySelector('.uc-items');
      empty = panel.querySelector('.uc-empty');
      foot = panel.querySelector('.uc-foot');
      badge = panel.querySelector('.uc-badge');

      overlay.addEventListener('click', close);
      panel.querySelector('.uc-close').addEventListener('click', close);
      panel.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.preventDefault(); close(); return; }
        if (e.key !== 'Tab') return;
        var items = panel.querySelectorAll('a[href], button:not([disabled])');
        if (!items.length) return;
        var first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      });
      list.addEventListener('click', function (e) {
        var btn = e.target.closest('button[data-act]');
        if (!btn) return;
        var li = btn.closest('.uc-item');
        var slug = li.getAttribute('data-slug'), variant = li.getAttribute('data-variant');
        var line = read().filter(function (it) { return matchLine(it, { slug: slug, variant: variant }); })[0];
        if (!line) return;
        var act = btn.getAttribute('data-act');
        if (act === 'inc') UNI_CART.setQty(slug, variant, (line.qty || 1) + 1);
        if (act === 'dec') UNI_CART.setQty(slug, variant, Math.max(1, (line.qty || 1) - 1));
        if (act === 'remove') UNI_CART.remove(slug, variant);
        /* keep keyboard focus on the same control after re-render */
        var sel = '.uc-item[data-slug="' + CSS_ESC(slug) + '"][data-variant="' + CSS_ESC(variant) + '"] button[data-act="' + act + '"]';
        var again = list.querySelector(sel);
        if (again && !again.disabled) again.focus();
        else panel.querySelector('.uc-close').focus();
      });
      panel.querySelector('.uc-checkout').addEventListener('click', function () {
        var ev;
        try { ev = new CustomEvent('uni:checkout', { cancelable: true, detail: { items: read(), subtotal: UNI_CART.subtotal() } }); }
        catch (err) { ev = null; }
        var handled = ev ? !document.dispatchEvent(ev) : false;
        if (!handled) alert('Demo checkout — your order of ' + money(UNI_CART.subtotal()) + ' would be placed.');
      });
      UNI_CART.onChange(render);
      render();
    }

    function CSS_ESC(s) { return (window.CSS && window.CSS.escape) ? window.CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&'); }

    function render() {
      if (!built) return;
      var items = read();
      var n = UNI_CART.count();
      badge.textContent = String(n);
      badge.setAttribute('aria-label', n + (n === 1 ? ' item' : ' items') + ' in cart');
      empty.hidden = items.length > 0;
      foot.hidden = items.length === 0;
      list.innerHTML = items.map(function (it) {
        var url = 'product.html?id=' + encodeURIComponent(it.slug);
        var q = it.qty || 1;
        return '<li class="uc-item" data-slug="' + esc(it.slug) + '" data-variant="' + esc(it.variant || '') + '">' +
          '<a href="' + url + '" tabindex="-1" aria-hidden="true"><img class="uc-item__img" src="' + esc(it.image) + '" alt="" width="88" height="88" loading="lazy"></a>' +
          '<div>' +
            '<h3 class="uc-item__title"><a href="' + url + '">' + esc(it.title) + '</a></h3>' +
            (it.variant ? '<p class="uc-item__variant">' + esc(it.variant) + '</p>' : '<p class="uc-item__variant"></p>') +
            '<div class="uc-item__controls">' +
              '<div class="uc-qty" role="group" aria-label="Quantity for ' + esc(it.title) + '">' +
                '<button type="button" data-act="dec" aria-label="Decrease quantity"' + (q <= 1 ? ' disabled' : '') + '>−</button>' +
                '<output aria-live="polite">' + q + '</output>' +
                '<button type="button" data-act="inc" aria-label="Increase quantity">+</button>' +
              '</div>' +
              '<button type="button" class="uc-remove" data-act="remove" aria-label="Remove ' + esc(it.title) + (it.variant ? ' (' + esc(it.variant) + ')' : '') + '"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2zm-3 6h12l-1 12H7L6 9zm4 2v8h1.6v-8H10zm2.4 0v8H14v-8h-1.6z"/></svg></button>' +
            '</div>' +
          '</div>' +
          '<div class="uc-item__price">' + fmt.format((Number(it.price) || 0) * q) + '</div>' +
        '</li>';
      }).join('');
      var est = UNI_DELIVERY.estimate();
      panel.querySelector('.uc-eta__dates').textContent = UNI_DELIVERY.format(est.earliest) + ' – ' + UNI_DELIVERY.format(est.latest);
      panel.querySelector('.uc-total__label').textContent = 'Total: ' + n + (n === 1 ? ' Item' : ' Items');
      panel.querySelector('.uc-total__amount').textContent = money(UNI_CART.subtotal());
    }

    function open() {
      build();
      render();
      if (isOpen) return;
      isOpen = true;
      clearTimeout(closeTimer);
      lastFocus = document.activeElement;
      overlay.hidden = false;
      panel.hidden = false;
      void panel.offsetWidth;
      overlay.classList.add('is-open');
      panel.classList.add('is-open');
      document.documentElement.style.overflow = 'hidden';
      setTimeout(function () { var c = panel.querySelector('.uc-close'); if (c) c.focus({ preventScroll: true }); }, 50);
    }
    function close() {
      if (!isOpen) return;
      isOpen = false;
      overlay.classList.remove('is-open');
      panel.classList.remove('is-open');
      document.documentElement.style.overflow = '';
      closeTimer = setTimeout(function () { overlay.hidden = true; panel.hidden = true; }, 400);
      if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }
    return { open: open, close: close, build: build };
  })();

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

  function init() {
    paintBadge();
    drawer.build();
    /* The header cart icon opens the drawer (it still links to cart.html without JavaScript). */
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[aria-label="Cart"]');
      if (!a) return;
      e.preventDefault();
      UNI_CART.open();
    });
    /* Keep the badge and drawer in sync if the cart changes in another tab. */
    window.addEventListener('storage', function (e) {
      if (e.key === KEY) { listeners.forEach(function (fn) { try { fn(); } catch (err) {} }); paintBadge(); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.UNI_CART = UNI_CART;
  window.UNI_DELIVERY = UNI_DELIVERY;
  window.UNI_UI = UNI_UI;
})();
