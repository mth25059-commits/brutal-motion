# BRUTAL_MOTION

A streetwear-collective landing page — near-black + acid-lime, neo-brutalist product cards, glassmorphism photo bento, and a signature kinetic motion-echo hero.

**Live:** https://brutal-motion.vercel.app

## The build

- **Hero** — a full-bleed looping walk clip with a 4-step, scroll-driven narrative. Liquid-glass panels slide in on each beat while the headline throws acid-lime motion echoes. A critically-damped scroll chase keeps every move gliding.
- **Bento** — glassmorphism captions floating over the lookbook photos, with 3D pointer tilt.
- **Latest drop** — thick-bordered brutalist product cards, hover-to-spin video, size chips, and a slide-in cart drawer.
- **Editorial lookbook** — full-bleed garage clip with bold overlaid type.
- **Brand story + footer** — brutalist quote blocks and a marquee-ticker footer.

Built responsive down to 360px, keyboard-focusable, and `prefers-reduced-motion` aware.

## Stack

Plain HTML + CSS + JS. GSAP/ScrollTrigger (vendored) for section reveals. No build step.

## Run locally

```bash
python serve.py 5611 .
# → http://127.0.0.1:5611
```

`serve.py` adds HTTP Range support so the hero video seeks/streams smoothly — the stdlib server doesn't send 206 responses.

## Deploy

Static site — deploys to Vercel as-is. `vercel.json` enables clean URLs and long-cache headers for `/assets`.

---

Fonts: Archivo + Space Mono. All imagery is generated for this demo.
