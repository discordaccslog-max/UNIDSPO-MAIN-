/* ---------------------------------------------------------------
   United Dispo — Muadata payment bridge.

   checkout.html dispatches a cancelable `uni:place-order` event
   with detail = { item, customer, shipping, shippingProtection,
   protectionPrice, payment, subtotal, total } when the Pay-now
   button is clicked. We:

     1. preventDefault() the event (so the demo confirmation flow
        does not fire).
     2. POST the order to /api/payment/create.
     3. Redirect the browser to the hosted-payment URL the API
        returns, so the customer completes payment on Stripe/Square
        (via Muadata's gateway).
     4. On provider error, restore the Pay-now button and render
        the error under it so the customer sees what went wrong.

   This file is additive: if it is missing, the page falls back to
   the demo confirmation flow baked into checkout.html. If it runs,
   the live payment flow takes over.
--------------------------------------------------------------- */

(function () {
  'use strict';

  document.addEventListener('uni:place-order', function (ev) {
    // Only take over when we're actually on the checkout page with a form
    var button = document.getElementById('co-pay');
    if (!button) return;

    // Cancel the demo confirmation path so our redirect is the only outcome
    ev.preventDefault();

    var order = ev.detail || {};
    var item = order.item || {};
    var customer = order.customer || {};

    // Visual busy state — matches checkout.html's own spinner markup
    button.disabled = true;
    var LOCK = button.querySelector('svg');
    button.innerHTML = '<span class="co-pay__spin" aria-hidden="true"></span><span>Processing…</span>';

    function fail(message) {
      button.disabled = false;
      button.innerHTML = '';
      if (LOCK) button.appendChild(LOCK);
      var label = document.createElement('span');
      label.className = 'co-pay__label';
      label.textContent = 'Pay now';
      button.appendChild(label);

      // Render error below the button; reuse existing .opts-err styling
      var slot = document.getElementById('pay-err');
      if (slot) {
        slot.classList.add('is-on');
        slot.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M12 7.5v5.5M12 16.5v.5"/></svg>' + String(message || 'Payment could not be set up. Please try again.');
      } else {
        alert(message || 'Payment could not be set up. Please try again.');
      }
    }

    var payload = {
      customer: {
        first:   customer.first   || '',
        last:    customer.last    || '',
        email:   customer.email   || '',
        phone:   customer.phone   || '',
        address: customer.address || '',
        apt:     customer.apt     || '',
        city:    customer.city    || '',
        state:   customer.state   || '',
        zip:     customer.zip     || '',
      },
      item: {
        slug:    item.slug    || '',
        variant: item.variant || '',
        qty:     Number(item.qty) || 1,
      },
      shippingMethod:     (order.shipping && order.shipping.method) || 'standard',
      shippingProtection: !!order.shippingProtection,
    };

    fetch('/api/payment/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    })
      .then(function (r) {
        return r.json().then(function (data) { return { ok: r.ok, data: data }; });
      })
      .then(function (result) {
        if (!result.ok || !result.data || !result.data.url) {
          throw new Error((result.data && result.data.error) || 'Payment could not be set up. Please try again.');
        }

        // Stash the full order data for the confirmation-email trigger that
        // fires when the customer lands back on /order-success.html.
        //
        // Stored under a single key 'uni_pending_order' because Site B's
        // order-success redirect doesn't append ?order_no= to the back URL
        // — the customer lands on a bare /order-success.html with no
        // params, so we can't look up by order_id. One pending order per
        // device at a time is fine: the customer only has one in-flight
        // payment, and a new checkout overwrites the previous entry.
        try {
          localStorage.setItem('uni_pending_order', JSON.stringify({
            order: order,
            orderNumber: result.data.order_id || '',
            createdAt: Date.now(),
          }));
        } catch (e) { /* localStorage quota or disabled — email just won't fire */ }

        // Navigate. The promise never resolves after this.
        window.location.href = result.data.url;
      })
      .catch(function (err) {
        fail(err && err.message);
      });
  });
})();
