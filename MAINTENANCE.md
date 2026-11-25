# Maintenance mode

The site is **live** when there is no `vercel.json` in the repo root.

## Turn maintenance ON

```bash
cp vercel.maintenance.json vercel.json
git add vercel.json && git commit -m "Maintenance mode on" && git push
```

Every route then redirects to `maintenance.html`, except the maintenance page
itself, `bypass.html`, `/images/*`, favicons and `robots.txt`.

## Turn maintenance OFF

```bash
git rm vercel.json && git commit -m "Maintenance mode off" && git push
```

## Admin bypass

The redirect only fires for visitors **without** the `ud_bypass` cookie, so the
whole site — including `/api/*` — stays usable for anyone holding the key.

| URL | Does |
| --- | --- |
| `/bypass?key=<KEY>` | Stores the key for 7 days, then opens the live site |
| `/bypass` | Prompts for the key instead of putting it in the URL |
| `/bypass?exit=1` | Clears the key, so this browser sees maintenance again |

The key lives only in `vercel.maintenance.json`. `bypass.html` stores whatever
is typed without knowing what is valid, so nothing is exposed in client JS.

Cookies are per browser, so each device needs unlocking once.

## Before turning it on again

- **Update the countdown.** `maintenance.html` has a single `ENDS_AT` constant
  (UTC, ISO 8601). The "estimated downtime" wording and the "expected back
  around" time both read from it.
- **Consider rotating the key** if the repo is public, since the value sits in
  `vercel.maintenance.json`.
- **Long outages:** the maintenance page returns HTTP 200, not 503. Fine for a
  few hours; for anything longer, serve it from a function with a 503 and a
  `Retry-After` header so search engines do not index the notice.
