/* ============================================================
   BRUTAL_MOTION — interactions
   Hero scrub · kinetic type · glass reveals · 3D tilt · cart
   ============================================================ */
(() => {
  "use strict";
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGSAP = typeof window.gsap !== "undefined";
  document.documentElement.classList.add(hasGSAP ? "reveal-ready" : "no-gsap");

  /* ---------- top bar solidify ---------- */
  const bar = $("#bar");
  const onBar = () => bar.classList.toggle("is-solid", scrollY > 40);
  addEventListener("scroll", onBar, { passive: true });
  onBar();

  /* ---------- video availability detection ----------
     Each <video> starts on a CSS fallback. When a real frame is
     decodable we flip the container to .has-video so the clip takes
     over; on error the CSS keeps running. Offscreen clips lazy-load. */
  function wireVideo(video, container, { eager = false } = {}) {
    if (!video || !container) return null;
    let ready = false;
    const mark = () => {
      if (ready) return;
      ready = true;
      container.classList.add("has-video");
      container.removeAttribute("data-fallback");
    };
    video.addEventListener("loadeddata", mark);
    video.addEventListener("canplay", mark);
    video.addEventListener("loadedmetadata", () => { if (video.readyState >= 2) mark(); });
    video.addEventListener("error", () => {});

    const begin = () => { video.preload = "auto"; try { video.load(); } catch (_) {} };
    if (eager || !("IntersectionObserver" in window)) {
      begin();
    } else {
      const io = new IntersectionObserver((es) => {
        if (es.some((e) => e.isIntersecting)) { begin(); io.disconnect(); }
      }, { rootMargin: "320px" });
      io.observe(container);
    }
    const poll = setInterval(() => {
      if (ready || video.readyState >= 2) { mark(); clearInterval(poll); }
    }, 250);
    return { get ready() { return ready; } };
  }

  /* ---------- HERO — 4-step scroll cinema ----------
     The clip PLAYS as a smooth loop instead of being frame-seeked: the
     source mp4 is not all-intra, so scrubbing currentTime forces a decode
     from a distant keyframe every frame and visibly stutters. Playing it
     forward decodes sequentially = butter. Scroll drives everything else:
       0) title holds   1) Built heavy   2) Cut clean   3) Moves with you →
     A rendered progress `rp` chases real scroll `p`, so beats, parallax and
     the kinetic type glide rather than snap.                              */
  const hero      = $(".hero");
  const heroStage = $("#heroStage");
  const heroVideo = $("#heroVideo");
  const heroState = wireVideo(heroVideo, heroStage, { eager: true });
  const heroLock  = $("#heroLock");
  const heroCue   = $("#heroCue");
  const kins      = $$(".hero .kin");
  const panels    = $$(".gpanel");
  const ticks     = $$("#heroRail i");
  const STEPS     = 4;

  // keep the walk looping smoothly the moment it's decodable
  const playHero = () => { if (!reduce && heroState && heroState.ready) heroVideo.play().catch(() => {}); };
  ["loadeddata", "canplay", "playing", "stalled"].forEach((ev) => heroVideo.addEventListener(ev, playHero));
  // browsers pause offscreen/background video; nudge it back when visible
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) playHero(); else heroVideo.pause();
    }), { threshold: 0.05 }).observe(heroStage);
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) playHero(); });

  const clamp01 = (n) => n < 0 ? 0 : n > 1 ? 1 : n;
  // smootherstep — zero 1st & 2nd derivative at the ends = silky beats
  const ease = (t) => { t = clamp01(t); return t * t * t * (t * (t * 6 - 15) + 10); };
  // Remap continuous beat-position so it LINGERS on each integer beat and
  // crosses between them quickly — long holds, crisp crossfades (no two
  // panels sitting at half-opacity for long, which matters most on mobile).
  const holdPos = (pos) => { const b = Math.floor(pos); return b + ease(pos - b); };
  // Visibility around a panel's home beat, reaching zero at GAP (<0.5) so
  // adjacent panels are BOTH invisible at the exact crossover — a brief clean
  // gap instead of overlapping text (critical where panels share a box on
  // mobile). With holdPos the beats read as: hold · snap · hold.
  const GAP = 0.42;
  const visAt = (pos, home) => ease(clamp01(1 - Math.abs(pos - home) / GAP));

  let targetP = 0, rp = 0, raf = 0, running = false;

  function readScroll() {
    const total = hero.offsetHeight - innerHeight;
    const top = hero.getBoundingClientRect().top;
    targetP = total > 0 ? clamp01(-top / total) : 0;
    if (!running) { running = true; raf = requestAnimationFrame(render); }
  }

  function render() {
    // critically-damped chase toward the real scroll position
    const d = targetP - rp;
    rp += d * 0.12;
    if (Math.abs(d) < 0.0004) rp = targetP;

    // beats play out over the first 80% of the track; 80→94% is the
    // slide-away handoff into the bento below (a sticky hero tops out
    // near ~0.96, so everything must resolve before then).
    const pp = clamp01(rp / 0.80);
    const pos = holdPos(pp * (STEPS - 1));           // held beat-position 0..3
    const ho = ease(clamp01((rp - 0.80) / 0.14));    // 0→1 handoff

    if (!reduce) {
      // parallax: the walk eases in toward you as you scroll — depth without
      // a single seek. Pure transform on a promoted layer = compositor-only.
      const push = ease(pp);
      heroStage.style.transform =
        `scale(${(1 + push * 0.14).toFixed(4)}) translate3d(0,${(push * -3).toFixed(2)}vh,0)`;
      heroStage.style.filter = `brightness(${(1 - push * 0.18).toFixed(3)})`;

      // motion-echo intensity from chase velocity
      const vel = Math.min(1, Math.abs(d) * 90);
      const mo = (0.5 + vel * 3).toFixed(3);
      kins.forEach((k) => k.style.setProperty("--mo", mo));

      // BEAT 0→1: title lifts up and clears as the first panel arrives
      const out = 1 - visAt(pos, 0);        // 0 at rest, →1 as we leave beat 0
      heroLock.style.transform =
        `translate3d(0,calc(-50% - ${(out * 15).toFixed(1)}vh),0) scale(${(1 - out * 0.07).toFixed(3)})`;
      heroLock.style.opacity = (1 - out).toFixed(3);
      if (heroCue) heroCue.style.opacity = ((1 - out) * (1 - ho)).toFixed(3);

      // BEATS 1–3: each glass panel glides in from the left and melts out.
      // translateX + a blur ramp reads as liquid glass sliding through.
      panels.forEach((pn, idx) => {
        const home = idx + 1;                 // panel 1 lives at beat 1, etc.
        let vis = visAt(pos, home);
        if (home === STEPS - 1) vis *= (1 - ho);   // last panel exits on handoff
        const off = 1 - vis;                       // 0 when centered, 1 when gone
        const dir = pos < home ? 1 : -1;           // arriving vs leaving
        const x = off * -54 + (home === STEPS - 1 ? ho * -30 : 0);
        const y = off * 20 * dir - (home === STEPS - 1 ? ho * 44 : 0);
        pn.style.opacity = vis.toFixed(3);
        pn.style.transform =
          `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${(0.94 + vis * 0.06).toFixed(3)})`;
        pn.style.filter = `blur(${(off * 7).toFixed(1)}px)`;
        // hide fully-gone panels so their backdrop-filter stops costing us
        pn.style.visibility = vis > 0.02 ? "visible" : "hidden";
        pn.style.pointerEvents = vis > 0.5 ? "auto" : "none";
      });
    }

    // rail: light every tick we've reached
    const active = Math.round(pos);
    ticks.forEach((t, i) => t.classList.toggle("is-on", i <= active));

    if (rp !== targetP) { raf = requestAnimationFrame(render); }
    else { running = false; }
  }

  addEventListener("scroll", readScroll, { passive: true });
  addEventListener("resize", readScroll);
  readScroll();

  /* ---------- COUNTDOWN ---------- */
  const drop = new Date(document.body.dataset.drop).getTime();
  const clock = $("#clock");
  const pad = (n) => String(n).padStart(2, "0");
  const dd = $("#cDD"), hh = $("#cHH"), mm = $("#cMM"), ss = $("#cSS");
  function tick() {
    const diff = drop - Date.now();
    if (diff <= 0) {
      clock.classList.add("is-dropped");
      $(".clock__label").textContent = "Live now";
      dd.textContent = hh.textContent = mm.textContent = ss.textContent = "00";
      clearInterval(timer);
      return;
    }
    const s = Math.floor(diff / 1000);
    dd.textContent = pad(Math.floor(s / 86400));
    hh.textContent = pad(Math.floor((s % 86400) / 3600));
    mm.textContent = pad(Math.floor((s % 3600) / 60));
    ss.textContent = pad(s % 60);
  }
  tick();
  const timer = setInterval(tick, 1000);

  /* ---------- GSAP reveals ---------- */
  if (hasGSAP && !reduce && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    $$("[data-reveal]").forEach((el) => {
      gsap.fromTo(el, { y: 28, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.7, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 86%" },
      });
    });
  } else {
    $$("[data-reveal]").forEach((el) => { el.style.opacity = 1; el.style.transform = "none"; });
  }

  /* ---------- 3D tilt on pointer ---------- */
  if (!reduce && matchMedia("(pointer:fine)").matches) {
    $$("[data-tilt]").forEach((el) => {
      let raf = 0;
      const move = (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          el.style.transform = `perspective(800px) rotateY(${x * 7}deg) rotateX(${y * -7}deg)`;
        });
      };
      const reset = () => { cancelAnimationFrame(raf); el.style.transform = ""; };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", reset);
    });
  }

  /* ---------- product / tile hover-to-play video ---------- */
  $$(".prod--feat").forEach((card) => {
    const media = $(".prod__media", card);
    const video = $(".prod__video", card);
    wireVideo(video, media);
    const play = () => { media.classList.add("is-playing"); if (video && media.classList.contains("has-video")) video.play().catch(() => {}); };
    const stop = () => { media.classList.remove("is-playing"); if (video && media.classList.contains("has-video")) { video.pause(); video.currentTime = 0; } };
    media.addEventListener("pointerenter", play);
    media.addEventListener("pointerleave", stop);
    card.addEventListener("focusin", play);
    card.addEventListener("focusout", (e) => { if (!card.contains(e.relatedTarget)) stop(); });
  });

  // bento rotation tile — autoplay in view
  const vtile = $(".tile--vid .tile__media");
  const vtileVid = $(".tile--vid .tile__video");
  if (vtile && vtileVid) {
    wireVideo(vtileVid, vtile);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting && vtile.classList.contains("has-video")) vtileVid.play().catch(() => {});
        else vtileVid.pause();
      }), { threshold: 0.3 }).observe(vtile);
    }
  }

  // lookbook ambient video
  const lookMedia = $(".look__media");
  const lookVid = $(".look__video");
  if (lookMedia && lookVid) {
    wireVideo(lookVid, lookMedia);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting && lookMedia.classList.contains("has-video")) lookVid.play().catch(() => {});
        else lookVid.pause();
      }), { threshold: 0.25 }).observe(lookMedia);
    }
  }

  /* ---------- CART ---------- */
  const cart = [];
  const drawer  = $("#drawer");
  const itemsEl = $("#drawerItems");
  const emptyEl = $("#drawerEmpty");
  const totalEl = $("#drawerTotal");
  const countEl = $("#cartCount");
  const fmt = (n) => "$" + n.toLocaleString("en-US");

  function renderCart() {
    itemsEl.innerHTML = "";
    let total = 0;
    cart.forEach((it, i) => {
      total += it.price;
      const li = document.createElement("li");
      li.className = "drawer__item";
      li.innerHTML =
        `<span class="drawer__thumb" aria-hidden="true"></span>
         <span class="drawer__info">
           <span class="drawer__iname">${it.name}</span><br>
           <span class="drawer__isize">Size ${it.size}</span>
         </span>
         <span class="drawer__iprice">${fmt(it.price)}</span>
         <button class="drawer__rm" data-rm="${i}" aria-label="Remove ${it.name}">Remove</button>`;
      itemsEl.appendChild(li);
    });
    emptyEl.style.display = cart.length ? "none" : "block";
    totalEl.textContent = fmt(total);
    countEl.textContent = String(cart.length);
    countEl.dataset.empty = cart.length ? "false" : "true";
  }
  itemsEl.addEventListener("click", (e) => {
    const b = e.target.closest("[data-rm]");
    if (!b) return;
    cart.splice(+b.dataset.rm, 1);
    renderCart();
  });

  let lastFocus = null;
  function openDrawer() {
    lastFocus = document.activeElement;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    $(".drawer__x", drawer).focus();
  }
  function closeDrawer() {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    if (lastFocus) lastFocus.focus();
  }
  $("#cartBtn").addEventListener("click", openDrawer);
  $$("[data-close]", drawer).forEach((el) => el.addEventListener("click", closeDrawer));
  addEventListener("keydown", (e) => { if (e.key === "Escape" && drawer.classList.contains("is-open")) closeDrawer(); });
  $("#checkout").addEventListener("click", () => {
    if (!cart.length) { toast("Cart is empty"); return; }
    toast("Demo only — no card charged");
  });

  /* ---------- ADD TO CART ---------- */
  $$(".prod").forEach((card) => {
    const btn = $("[data-add]", card);
    btn.addEventListener("click", () => {
      const size = $(`input[name="s-${card.dataset.id}"]:checked`, card);
      if (!size) { toast("Pick a size first"); return; }
      cart.push({ name: card.dataset.name, price: +card.dataset.price, size: size.value });
      renderCart();
      btn.classList.add("is-added");
      btn.textContent = "Added ✓";
      setTimeout(() => { btn.classList.remove("is-added"); btn.textContent = "Add to cart"; }, 1300);
      openDrawer();
    });
  });

  /* ---------- SIGNUP ---------- */
  const form = $("#signupForm");
  const msg  = $("#signupMsg");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = $("#signupEmail").value.trim();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!ok) { msg.dataset.err = "true"; msg.textContent = "That email doesn't look right — check the address."; return; }
    msg.dataset.err = "false";
    msg.textContent = "You're in. First access lands in your inbox.";
    form.reset();
  });

  /* ---------- TOAST ---------- */
  let toastT;
  const toastEl = $("#toast");
  function toast(text) {
    toastEl.textContent = text;
    toastEl.classList.add("is-up");
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove("is-up"), 2200);
  }

  renderCart();
})();
