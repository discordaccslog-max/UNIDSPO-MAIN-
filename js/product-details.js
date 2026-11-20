/* =====================================================================
   United Dispo — product page details (description, features, specs)
   ---------------------------------------------------------------------
   One entry per product slug (same slugs as js/products.js).
     summary   Short intro paragraph shown under "About this product".
     features  3–4 short selling points (shown with gold check marks).
     specs     [label, value] rows. "Options" is filled in automatically
               from the product's variants when left out.
     packOf    Bulk packs only: number of units (adds per-unit pricing).
     badge     Optional small label above the intro (e.g. "Limited edition").
   ===================================================================== */
window.UNI_DETAILS = {
  "ace-ultra-premium-2g": {
    summary: "A 2-gram ACE Ultra Premium cartridge, bought directly from a licensed dispensary and checked by hand before it ships. Full-spectrum live resin with strain-specific terpenes in Hybrid, Sativa or Indica.",
    features: [
      "Full-spectrum live resin with strain-specific terpene profiles",
      "Ultra-refined premium distillate for a smooth, consistent draw",
      "Lab-tested, batch-verified and tamper-sealed",
      "Our best seller, rated 4.8 by 412 customers"
    ],
    specs: [["Type", "Cartridge"], ["Size", "2G"], ["Sourced from", "Licensed California dispensary"]]
  },
  "muha-meds-sumer-edition": {
    badge: "Seasonal release",
    summary: "The limited Summer Edition from Muha Meds, with rotating seasonal flavors. Sourced sealed from a licensed dispensary and verified before it ships, just like every order.",
    features: [
      "Limited seasonal drop with rotating summer flavors",
      "Strain-specific terpene profiles",
      "Ultra-refined premium distillate",
      "Lab-tested, batch-verified and tamper-sealed"
    ],
    specs: [["Brand", "Muha Meds"], ["Edition", "Summer (limited)"], ["Sourced from", "Licensed California dispensary"]]
  },
  "raw-garden-live-resin-1g": {
    summary: "Raw Garden single-source live resin, one full gram, sourced directly from a licensed California dispensary. Pick your strain type and we’ll verify the seal and batch before it leaves our hands.",
    features: [
      "Single-source live resin with no fillers or additives",
      "Lab-tested for potency and safety",
      "Dispensary-sourced and batch-verified",
      "Available in Hybrid, Sativa and Indica"
    ],
    specs: [["Brand", "Raw Garden"], ["Type", "Live resin cartridge"], ["Size", "1G"], ["Sourced from", "Licensed California dispensary"]]
  },
  "geek-bar-pulse-x": {
    summary: "The Geek Bar Pulse disposable with a smart display and two output modes: Regular for longer life, Pulse for a stronger hit. Verified authentic in its original sealed packaging.",
    features: [
      "Up to 15,000 puffs in Regular mode",
      "Up to 7,500 puffs in Pulse mode",
      "Full-screen smart display",
      "Authentic, sealed packaging checked before shipping"
    ],
    specs: [["Brand", "Geek Bar"], ["Type", "Disposable"], ["Puffs", "15,000 Regular · 7,500 Pulse"]]
  },
  "geek-bar-pulse": {
    summary: "The refreshed Geek Bar Pulse X: up to 25,000 puffs, adjustable airflow and 24 flavors to choose from. Sourced from an authorized distributor and verified authentic before it ships.",
    features: [
      "Up to 25,000 puffs in Regular mode",
      "Up to 15,000 puffs in Pulse mode",
      "Adjustable airflow and refreshed design",
      "24 flavors, from Strawberry Watermelon to Cool Mint"
    ],
    specs: [["Brand", "Geek Bar"], ["Type", "Disposable"], ["Puffs", "25,000 Regular · 15,000 Pulse"]]
  },
  "boutiq-switch-v5": {
    summary: "The Boutiq Switch V5: two chambers in one device, so you can switch between Indica and Sativa whenever you like. Variable voltage, batch-verified and sealed from a licensed dispensary.",
    features: [
      "Dual-chamber design: Indica and Sativa in one device (Switch)",
      "Variable voltage for a draw that suits you",
      "Ultra-refined premium distillate",
      "Lab-tested, batch-verified and tamper-sealed"
    ],
    specs: [["Brand", "Boutiq"], ["Model", "Switch V5"], ["Sourced from", "Licensed California dispensary"]]
  },
  "big-chief": {
    summary: "A 2-gram Big Chief full-spectrum cartridge, taken sealed from licensed dispensary stock and verified by hand before it ships.",
    features: [
      "Full-spectrum extract, 2 full grams",
      "Strain-specific terpene profiles",
      "Lab-tested, batch-verified and tamper-sealed",
      "Sealed from licensed dispensary stock"
    ],
    specs: [["Brand", "Big Chief"], ["Type", "Cartridge"], ["Size", "2G"], ["Sourced from", "Licensed California dispensary"]]
  },
  "wholemelts-v7-copy": {
    summary: "The Wholemelts V7 live resin disposable: terpene-forward flavor in tamper-evident packaging, sourced from a licensed dispensary and checked before it ships.",
    features: [
      "Terpene-forward live resin",
      "No fillers, no additives",
      "Lab-tested for potency and safety",
      "Tamper-evident packaging, batch-verified"
    ],
    specs: [["Brand", "Wholemelts"], ["Type", "Live resin disposable"], ["Model", "V7"]]
  },
  "muha-meds-x-cookies-limited-edition": {
    badge: "Limited edition · Low stock",
    summary: "The Muha Meds × Cookies limited-edition collaboration, newly released in co-branded sealed packaging. Every unit is authenticated before it ships, and stock is limited.",
    features: [
      "Newly released Muha Meds × Cookies collaboration",
      "Strain-specific terpene profiles",
      "Ultra-refined premium distillate",
      "Lab-tested, batch-verified and tamper-sealed before shipping"
    ],
    specs: [["Brand", "Muha Meds × Cookies"], ["Edition", "Limited"], ["Sourced from", "Licensed California dispensary"]]
  },
  "muha-meds-limited-edition": {
    badge: "New release",
    summary: "The 3rd-generation Muha Meds release with updated hardware and improved airflow, from the same licensed dispensary sources we verify every order against.",
    features: [
      "3rd-generation hardware with improved airflow",
      "Strain-specific terpene profiles",
      "Ultra-refined premium distillate",
      "Lab-tested, batch-verified and tamper-sealed before shipping"
    ],
    specs: [["Brand", "Muha Meds"], ["Generation", "3rd Gen"], ["Sourced from", "Licensed California dispensary"]]
  },

  /* ---------- Bulk packs ---------- */
  "20pc-ace-ultra-premium": {
    packOf: 20,
    summary: "Twenty ACE Ultra Premium 2G cartridges in one strain of your choice, at our best per-unit price. Every unit in the pack is sealed and batch-checked before it ships.",
    features: [
      "20 cartridges, one strain for the whole pack",
      "Lowest per-unit price we offer",
      "Every unit sealed and batch-verified",
      "Ships in one discreet, tracked package"
    ],
    specs: [["Contents", "20 × ACE Ultra Premium 2G"], ["Sourced from", "Licensed California dispensary"]]
  },
  "10pc-raw-garden-live-resin-1g": {
    packOf: 10,
    summary: "Ten Raw Garden 1G live resin cartridges in one strain of your choice, with bulk pricing and the same dispensary-verified sourcing on every unit.",
    features: [
      "10 cartridges, one strain for the whole pack",
      "Single-source live resin, no fillers or additives",
      "Every unit sealed and batch-verified",
      "Ships in one discreet, tracked package"
    ],
    specs: [["Contents", "10 × Raw Garden Live Resin 1G"], ["Sourced from", "Licensed California dispensary"]]
  },
  "10pc-ace-ultra-premium": {
    packOf: 10,
    summary: "Ten ACE Ultra Premium 2G cartridges in one strain of your choice. Tamper-evident bulk packaging with batch documentation included.",
    features: [
      "10 cartridges, one strain for the whole pack",
      "Batch documentation included",
      "Every unit sealed and batch-verified",
      "Ships in one discreet, tracked package"
    ],
    specs: [["Contents", "10 × ACE Ultra Premium 2G"], ["Sourced from", "Licensed California dispensary"]]
  },
  "10pc-muha-meds-x-cookies-limited-edition": {
    packOf: 10,
    badge: "Limited edition · Low stock",
    summary: "Ten Muha Meds × Cookies limited-edition units in one strain of your choice. A limited run, sealed from the dispensary and verified unit by unit.",
    features: [
      "10 units, one strain for the whole pack",
      "Limited-run Muha Meds × Cookies collaboration",
      "Every unit sealed and batch-verified",
      "Ships in one discreet, tracked package"
    ],
    specs: [["Contents", "10 × Muha Meds × Cookies"], ["Sourced from", "Licensed California dispensary"]]
  },
  "10pc-boutiq-switch-v5": {
    packOf: 10,
    summary: "Ten Boutiq Switch V5 devices in one blend of your choice, with bulk pricing and the same verification on every unit.",
    features: [
      "10 devices, one blend for the whole pack",
      "Dual-chamber Switch design",
      "Every unit sealed and batch-verified",
      "Ships in one discreet, tracked package"
    ],
    specs: [["Contents", "10 × Boutiq Switch V5"], ["Sourced from", "Licensed California dispensary"]]
  },
  "10pc-wholemelts-v7": {
    packOf: 10,
    summary: "Ten Wholemelts V7 live resin disposables at bulk pricing, each one sealed from a licensed dispensary and verified before it ships.",
    features: [
      "10 disposables per pack",
      "Terpene-forward live resin",
      "Every unit sealed and batch-verified",
      "Ships in one discreet, tracked package"
    ],
    specs: [["Contents", "10 × Wholemelts V7"], ["Sourced from", "Licensed California dispensary"]]
  }
};
