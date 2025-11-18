(() => {
  "use strict";

  // Respeta la preferencia del usuario de reducir movimiento
  const prefersReducedMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;

  // Carga de componentes
  async function loadComponent(targetId, path) {
    const el = document.getElementById(targetId);
    if (!el) return null;
    try {
      const res = await fetch(path, { credentials: "same-origin" });
      if (!res.ok) throw new Error(`HTTP ${res.status} al cargar ${path}`);
      el.innerHTML = await res.text();
      return el;
    } catch (err) {
      console.warn(`No se pudo cargar ${path}:`, err);
      return null;
    }
  }

  // Menú
  function setupNav() {
    const btn = document.querySelector(".nav-toggle");
    const menu = document.querySelector(".nav-links");
    if (!btn || !menu) return;

    if (!menu.id) menu.id = "primary-menu";
    btn.setAttribute("aria-controls", menu.id);
    btn.setAttribute("aria-expanded", "false");
    if (!btn.getAttribute("aria-label"))
      btn.setAttribute("aria-label", "Abrir menú");

    const firstLink = () =>
      menu.querySelector("a,button,[tabindex]:not([tabindex='-1'])");

    btn.addEventListener("click", () => {
      const isOpen = menu.classList.toggle("open");
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
      document.body.classList.toggle("nav-open", isOpen);
      if (isOpen) firstLink()?.focus();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && menu.classList.contains("open")) {
        e.preventDefault();
        menu.classList.remove("open");
        document.body.classList.remove("nav-open");
        btn.setAttribute("aria-expanded", "false");
        btn.focus();
      }
    });

    document.addEventListener("click", (e) => {
      const clickInside = btn.contains(e.target) || menu.contains(e.target);
      if (!clickInside && menu.classList.contains("open")) {
        menu.classList.remove("open");
        document.body.classList.remove("nav-open");
        btn.setAttribute("aria-expanded", "false");
      }
    });

    menu.addEventListener("click", (e) => {
      const t = e.target.closest("a[href], button[role='menuitem']");
      if (t) {
        menu.classList.remove("open");
        document.body.classList.remove("nav-open");
        btn.setAttribute("aria-expanded", "false");
      }
    });
  }

  // Reveal
  function setupReveal() {
    const els = document.querySelectorAll("[data-reveal]");
    if (!els.length) return;

    const supportsIO = "IntersectionObserver" in window;

    if (prefersReducedMotion || !supportsIO) {
      els.forEach((el) => el.classList.add("revealed"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            io.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );

    els.forEach((el) => io.observe(el));
  }

  // Filtros de talleres
  function setupWorkshopFilters() {
    const filterGroup = document.querySelector(".filters");
    const buttons = document.querySelectorAll(".filters .chip");
    const cards = document.querySelectorAll(".workshop-card");
    if (!filterGroup || !buttons.length || !cards.length) return;

    const applyFilter = (f) => {
      cards.forEach((card) => {
        if (f === "all") {
          card.hidden = false;
          return;
        }
        const tags = (card.dataset.tags || "").split(/\s+/);
        card.hidden = !tags.includes(f);
      });
    };

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        applyFilter(btn.dataset.filter);
      });
      btn.setAttribute("tabindex", "0");
      btn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          btn.click();
        }
      });
    });
  }

  // Testimonios (sin degradado)
  function setupTestimonials() {
    document
      .querySelectorAll(".testimonial-slider")
      .forEach((slider, sliderIdx) => {
        const slidesUl = slider.querySelector(".ts-slides");
        const slides = Array.from(slider.querySelectorAll(".ts-slide"));
        const prevBtn = slider.querySelector(".ts-prev");
        const nextBtn = slider.querySelector(".ts-next");
        const dotsWrap = slider.querySelector(".ts-dots");

        // ===== Accesibilidad del contenedor (por si no lo agregaste en HTML) =====
        if (!slider.hasAttribute("role")) {
          slider.setAttribute("role", "region");
          slider.setAttribute("aria-roledescription", "carrusel");
          if (!slider.getAttribute("aria-label")) {
            slider.setAttribute("aria-label", "Testimonios de alumnos");
          }
          if (!slider.hasAttribute("tabindex"))
            slider.setAttribute("tabindex", "0");
        }

        // Asegurar un id único para el <ul> de slides
        if (slidesUl && !slidesUl.id) {
          slidesUl.id = `ts-slides-${sliderIdx}-${Math.random()
            .toString(36)
            .slice(2, 7)}`;
        }

        // Dots
        let dots = [];
        if (dotsWrap && !dotsWrap.children.length) {
          dots = slides.map((_, i) => {
            const b = document.createElement("button");
            b.className = "ts-dot";
            b.type = "button";
            b.setAttribute("aria-label", `Ir al testimonio ${i + 1}`);
            // Conectar cada dot con el <ul> que controla
            if (slidesUl?.id) b.setAttribute("aria-controls", slidesUl.id);
            dotsWrap.appendChild(b);
            return b;
          });
        } else if (dotsWrap) {
          dots = Array.from(dotsWrap.querySelectorAll(".ts-dot"));
          // Si los dots ya existen, asegúrate de aria-controls
          dots.forEach((b) => {
            if (slidesUl?.id && !b.hasAttribute("aria-controls")) {
              b.setAttribute("aria-controls", slidesUl.id);
            }
          });
        }

        // Índice inicial
        let idx = Math.max(
          0,
          slides.findIndex((s) => s.classList.contains("is-active"))
        );
        if (idx === -1) idx = 0;

        // Mostrar/ocultar "Ver más" según altura colapsada
        const COLLAPSED_LINES_EM = 7.5;
        const needsMore = (slide) => {
          const quote = slide.querySelector(".ts-quote");
          const btn = slide.querySelector(".ts-more");
          if (!quote || !btn) return false;
          const wasExpanded = slide.classList.contains("is-expanded");
          slide.classList.remove("is-expanded");
          const fs = parseFloat(getComputedStyle(quote).fontSize) || 16;
          const maxPx = fs * COLLAPSED_LINES_EM;
          const needed = quote.scrollHeight > Math.ceil(maxPx) + 1;
          if (wasExpanded) slide.classList.add("is-expanded");
          return needed;
        };

        const refreshMoreButtons = () => {
          slides.forEach((slide) => {
            const btn = slide.querySelector(".ts-more");
            if (!btn) return;
            const show = needsMore(slide);
            btn.style.display = show ? "inline-block" : "none";
            if (!show) {
              slide.classList.remove("is-expanded");
              btn.textContent = "Ver más";
              btn.setAttribute("aria-expanded", "false");
            }
          });
        };

        const collapseAll = () => {
          slides.forEach((li) => {
            li.classList.remove("is-expanded");
            const btn = li.querySelector(".ts-more");
            if (btn) {
              btn.textContent = "Ver más";
              btn.setAttribute("aria-expanded", "false");
            }
          });
        };

        const measureActiveHeight = () => {
          const activeCard = slider.querySelector(
            ".ts-slide.is-active .ts-card"
          );
          return activeCard ? activeCard.offsetHeight + 10 : 0;
        };

        const setHeight = () => {
          if (!slidesUl) return;
          const h = measureActiveHeight();
          if (h > 0) slidesUl.style.height = h + "px";
        };

        const paintA11y = (activeIndex) => {
          // 1) Dots: aria-current para el activo
          dots.forEach((d, k) => {
            const isActive = k === activeIndex;
            d.classList.toggle("is-active", isActive);
            d.setAttribute("aria-current", isActive ? "true" : "false");
          });
          // 2) Slides: aria-hidden y una etiqueta clara con la posición
          const total = slides.length;
          slides.forEach((s, k) => {
            const active = k === activeIndex;
            s.setAttribute("aria-hidden", active ? "false" : "true");
            s.setAttribute("role", "group");
            s.setAttribute("aria-label", `Testimonio ${k + 1} de ${total}`);
          });
          // 3) Botones prev/next controlan el <ul>
          if (slidesUl?.id) {
            prevBtn?.setAttribute("aria-controls", slidesUl.id);
            nextBtn?.setAttribute("aria-controls", slidesUl.id);
          }
          // (Opcional) títulos breves
          if (prevBtn && !prevBtn.title) prevBtn.title = "Anterior";
          if (nextBtn && !nextBtn.title) nextBtn.title = "Siguiente";
        };

        const goTo = (i) => {
          collapseAll();
          slides.forEach((s, k) => {
            const active = k === i;
            s.classList.toggle("is-active", active);
          });
          idx = i;
          refreshMoreButtons();
          paintA11y(idx);
          requestAnimationFrame(setHeight);
        };

        const next = () => goTo((idx + 1) % slides.length);
        const prev = () => goTo((idx - 1 + slides.length) % slides.length);

        // Controles
        nextBtn?.addEventListener("click", next);
        prevBtn?.addEventListener("click", prev);
        dots.forEach((d, i) => d.addEventListener("click", () => goTo(i)));

        // Teclado
        slider.addEventListener("keydown", (e) => {
          if (e.key === "ArrowRight") next();
          if (e.key === "ArrowLeft") prev();
        });

        // Ver más / menos
        slider.addEventListener("click", (e) => {
          const btn = e.target.closest(".ts-more");
          if (!btn || getComputedStyle(btn).display === "none") return;
          const slide = btn.closest(".ts-slide");
          const expanded = slide.classList.toggle("is-expanded");
          btn.textContent = expanded ? "Ver menos" : "Ver más";
          btn.setAttribute("aria-expanded", expanded ? "true" : "false");
          setHeight();
        });

        // Autoplay (respetando prefers-reduced-motion)
        const autoplay = slider.dataset.autoplay === "true";
        const intervalMs = parseInt(slider.dataset.interval || "6000", 10);
        let timer = null;

        const stop = () => {
          if (timer) clearInterval(timer);
          timer = null;
        };

        const start = () => {
          if (!autoplay || prefersReducedMotion) return;
          stop();
          timer = setInterval(next, intervalMs);
        };

        slider.addEventListener("mouseenter", stop);
        slider.addEventListener("mouseleave", start);
        slider.addEventListener("focusin", stop);
        slider.addEventListener("focusout", start);

        // Init
        goTo(idx);
        start();

        const recalc = () => {
          refreshMoreButtons();
          setHeight();
        };
        window.addEventListener("load", recalc);
        window.addEventListener("resize", recalc);
        slider
          .querySelectorAll("img")
          .forEach((img) => img.addEventListener("load", recalc));
      });
  }

  // === Inicio Setup Rating ===
  function setupRatingSummary() {
    document.querySelectorAll(".rating-summary").forEach((box) => {
      const rating = parseFloat(box.dataset.rating || "0");
      const total = parseInt(box.dataset.count || "0", 10);
      const pct = Math.max(0, Math.min(100, (rating / 5) * 100));

      const fill = box.querySelector(".stars-fill");
      if (fill) fill.style.width = pct + "%";

      const val = box.querySelector(".rating-value");
      if (val) val.textContent = rating.toFixed(1);

      // contar cuántos testimonios se están mostrando en el slider principal
      const showing =
        document.querySelectorAll(".testimonial-slider .ts-slide").length || 0;

      const cnt = box.querySelector(".rating-count");
      if (cnt) {
        const showingPart =
          showing && total && showing < total ? `; mostramos ${showing}` : "";
        cnt.textContent = `(basado en ${total} reseña${
          total === 1 ? "" : "s"
        }${showingPart})`;
      }

      const aria = `Calificación ${rating.toFixed(
        1
      )} de 5 basada en ${total} reseña${total === 1 ? "" : "s"}.`;
      box.setAttribute("aria-label", aria);
      box.setAttribute("role", "img");
    });
  }

  // === Fin Setup Rating ===

  // === Inicio Agregar Rating para Consistencia ===
  function syncAggregateRatingFromDom() {
    // 1) Leer del bloque visual
    const box = document.querySelector(".rating-summary");
    if (!box) return;

    const rating = parseFloat(box.dataset.rating || "0");
    const count = parseInt(box.dataset.count || "0", 10);

    // 2) Localizar el JSON-LD principal (aceptando @type string o array)
    const ld = Array.from(
      document.querySelectorAll('script[type="application/ld+json"]')
    ).find((s) => {
      try {
        const j = JSON.parse(s.textContent.trim());
        const t = j && j["@type"];
        if (!t) return false;

        const hasType = (type) =>
          (Array.isArray(t) && t.includes(type)) || t === type;

        return hasType("SportsActivityLocation") || hasType("LocalBusiness");
      } catch {
        return false;
      }
    });

    if (!ld) return;

    // 3) Parsear, actualizar y reescribir
    try {
      const data = JSON.parse(ld.textContent.trim());

      // Asegurar aggregateRating
      if (!data.aggregateRating) {
        data.aggregateRating = { "@type": "AggregateRating" };
      }
      data.aggregateRating["@type"] = "AggregateRating";
      data.aggregateRating.ratingValue = Number.isFinite(rating)
        ? String(rating.toFixed(1))
        : "0";
      data.aggregateRating.reviewCount = Number.isFinite(count)
        ? String(count)
        : "0";

      if (!data.aggregateRating.bestRating)
        data.aggregateRating.bestRating = "5";
      if (!data.aggregateRating.worstRating)
        data.aggregateRating.worstRating = "1";

      ld.textContent = JSON.stringify(data);
    } catch (e) {
      console.warn("No se pudo sincronizar aggregateRating:", e);
    }
  }
  // === Fin Agregar Rating para Consistencia ===

  // === Galerías con fundido genéricas (Nosotros / Profesores) ===
  function setupFadeGallery(rootSelector) {
    document.querySelectorAll(rootSelector).forEach((gal) => {
      const slides = Array.from(gal.querySelectorAll(".gallery-slide"));
      if (slides.length < 2) return;

      const dotsWrap = gal.querySelector(".gallery-dots");
      const dots = dotsWrap
        ? slides.map((_, i) => {
            const b = document.createElement("button");
            b.type = "button";
            b.setAttribute("aria-label", `Ir a la foto ${i + 1}`);
            dotsWrap.appendChild(b);
            return b;
          })
        : [];

      let i = slides.findIndex((s) => s.classList.contains("is-active"));
      if (i < 0) i = 0;

      const paint = (idx) => {
        slides.forEach((s, k) => s.classList.toggle("is-active", k === idx));
        dots.forEach((d, k) => {
          const active = k === idx;
          d.classList.toggle("is-active", active);
          d.setAttribute("aria-current", active ? "true" : "false");
        });
      };

      const next = () => {
        i = (i + 1) % slides.length;
        paint(i);
      };

      // Autoplay con respeto a prefers-reduced-motion
      let timer = null;

      const stop = () => {
        if (timer) clearInterval(timer);
        timer = null;
      };

      const start = () => {
        if (prefersReducedMotion) return;
        stop();
        timer = setInterval(next, 5000);
      };

      if (!prefersReducedMotion) {
        gal.addEventListener("mouseenter", stop);
        gal.addEventListener("focusin", stop);
        const resume = () => start();
        gal.addEventListener("mouseleave", resume);
        gal.addEventListener("focusout", resume);
      }

      // Dots clicables
      dots.forEach((d, idx) =>
        d.addEventListener("click", () => {
          i = idx;
          paint(i);
        })
      );

      // Primera pintura
      paint(i);
      start();
    });
  }

  // Mini-galerías dentro de las cards (independientes por instancia)
  function setupMiniGalleries() {
    const galleries = document.querySelectorAll(".mini-gallery");
    if (!galleries.length) return;

    galleries.forEach((gal) => {
      const slides = Array.from(gal.querySelectorAll(".mg-slide"));
      if (slides.length < 2) return;

      // Dots
      const dotsWrap = gal.querySelector(".mg-dots");
      let dots = [];
      if (dotsWrap) {
        dots = slides.map((_, i) => {
          const b = document.createElement("button");
          b.type = "button";
          b.setAttribute("aria-label", `Ir a la foto ${i + 1}`);
          dotsWrap.appendChild(b);
          return b;
        });
      }

      let i = Math.max(
        0,
        slides.findIndex((s) => s.classList.contains("is-active"))
      );
      if (i === -1) i = 0;

      const paint = (idx) => {
        slides.forEach((s, k) => s.classList.toggle("is-active", k === idx));
        dots.forEach((d, k) => d.classList.toggle("is-active", k === idx));
      };

      const next = () => {
        i = (i + 1) % slides.length;
        paint(i);
      };

      // Autoplay configurable + prefers-reduced-motion
      const autoplay = gal.dataset.autoplay === "true";
      const intervalMs = parseInt(gal.dataset.interval || "4800", 10);
      let timer = null;

      const stop = () => {
        if (timer) clearInterval(timer);
        timer = null;
      };

      const start = () => {
        if (!autoplay || prefersReducedMotion) return;
        stop();
        timer = setInterval(next, intervalMs);
      };

      // Dots click
      dots.forEach((d, idx) => {
        d.addEventListener("click", () => {
          i = idx;
          paint(i);
          start(); // reinicia ritmo si autoplay está activo y permitido
        });
      });

      // Hover/focus pause solo si hay autoplay y no reduce motion
      if (!prefersReducedMotion && autoplay) {
        gal.addEventListener("mouseenter", stop);
        gal.addEventListener("mouseleave", start);
        gal.addEventListener("focusin", stop);
        gal.addEventListener("focusout", start);
      }

      // Init
      paint(i);
      start();
    });
  }

  // Inicio
  document.addEventListener("DOMContentLoaded", async () => {
    await Promise.allSettled([
      loadComponent("site-header", "/components/header.html"),
      loadComponent("site-footer", "/components/footer.html"),
    ]);

    setupNav();
    setupReveal();
    setupWorkshopFilters();
    setupTestimonials();

    setupMiniGalleries();

    setupFadeGallery(
      ".hero-gallery.gallery-fade, .nosotros-gallery.gallery-fade, .profesores-gallery.gallery-fade"
    );

    setupRatingSummary();
    syncAggregateRatingFromDom();
  });
})();
