# ZKAS.io Cloudflare Site Views setup

The website is already prepared to display:

    Site views  12,345

at the bottom of the footer.

The page calls `/api/views` once when it loads. Each successful page load increments
the total, so the same person can count multiple times. This is a page-view counter,
not a unique-visitor counter.

## One-time Cloudflare setup

### 1. Create a KV namespace
Cloudflare Dashboard -> Storage & Databases / Workers KV -> Create instance

Name:
    zkas-site-views

### 2. Create a Worker
Cloudflare Dashboard -> Workers & Pages -> Create -> Worker

Suggested Worker name:
    zkas-view-counter

Replace the default Worker code with the contents of:
    cloudflare-view-counter-worker.js

Deploy it.

### 3. Bind the KV namespace
Open the new `zkas-view-counter` Worker.

Settings -> Bindings -> Add -> KV namespace

Variable name:
    SITE_VIEWS

KV namespace:
    zkas-site-views

Save / Deploy.

### 4. Add two specific routes
In the zkas.io Cloudflare zone, add these Worker routes:

    zkas.io/api/views*
    www.zkas.io/api/views*

Worker:
    zkas-view-counter

These routes are more specific than your existing broad routes:
    zkas.io/*
    www.zkas.io/*

so Cloudflare will send only `/api/views` to the counter Worker and everything else
will continue to the existing ZKAS.io static-site Worker.

### 5. Optional: seed the counter
If you want to start at a number other than zero, open the KV namespace and add:

Key:
    total

Value:
    1000

Otherwise the first successful page view starts the counter at 1.

## Notes

- The counter does not use IP addresses, cookies, or fingerprinting.
- Refreshing or revisiting the page can increase the count again.
- Workers KV is eventually consistent. For a community site this is normally fine,
  but simultaneous visits can occasionally cause a small undercount.
