(function () {
  'use strict';

  /* Refresh / โหลดใหม่ → ตัวเลื่อนอยู่ตำแหน่งบนสุดเสมอ */
  if (typeof history !== 'undefined' && history.scrollRestoration) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);

  const hero = document.getElementById('hero');
  const heroBgWrap = document.getElementById('hero-bg-wrap');
  const heroName = document.getElementById('hero-name');
  const heroSubtitle = document.getElementById('hero-subtitle');
  const heroDesc = document.getElementById('hero-desc');
  const variantIndexEl = document.getElementById('variant-index');
  const variantDotsEl = document.getElementById('variant-dots');
  const productListEl = document.getElementById('product-list');
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingBar = document.getElementById('loading-bar');
  const loadingText = document.getElementById('loading-text');

  const SEGMENT_HEIGHT = 4000;
  let currentVariantIndex = -1; // Change to -1 to trigger first variant update on tick
  let maxScrollForHero = SEGMENT_HEIGHT * 2;
  /** ค่าเวลาแบบ smooth (lerp) ต่อ variant – ลดการกระตุกจาก seek บ่อย */
  let smoothTimeByVariant = [];
  /** seek เฉพาะเมื่อค่า smooth ห่างจากตำแหน่งวิดีโอจริงเกินนี้ (วินาที) */
  const SEEK_THRESHOLD = 0.18;
  /** ความเร็วเลื่อนค่า smooth เข้าหาเป้า (ยิ่งน้อยยิ่งนุ่ม แต่ติด scroll น้อยลง) */
  const LERP_SPEED = 0.12;

  /* Showcase Mode (Auto Scroll) */
  let isShowcaseMode = false;
  let showcaseDirection = 1;
  const SHOWCASE_SPEED = 50// ความเร็วในการเลื่อน (px ต่อเฟรม)
  const SHOWCASE_MAX_INDEX = 4; // สินค้าตัวที่ 05

  /** สร้าง element วิดีโอจาก CONFIG.variants – เพิ่มสินค้าแค่แก้ config + ใส่ไฟล์ใน video/ */
  let heroVideos = [];
  function setupVideos() {
    const variants = CONFIG.variants || [];
    heroVideos = [];
    smoothTimeByVariant = variants.map(() => 0);
    if (!heroBgWrap) return;
    variants.forEach((variant, i) => {
      const v = document.createElement('video');
      v.className = 'hero-video hidden'; // Start hidden
      v.setAttribute('muted', '');
      v.setAttribute('playsinline', '');
      v.setAttribute('preload', i === 0 ? 'auto' : 'none'); // Only preload first video
      v.setAttribute('loop', '');
      // Only set src for the first video initially, others will lazy load
      if (i === 0 && variant.videoSrc) {
        v.src = variant.videoSrc;
      }
      heroBgWrap.appendChild(v);
      heroVideos.push(v);
    });
  }
  setupVideos();

  /** สร้างจุด Navigator ตามจำนวน variant */
  function setupDots() {
    if (!variantDotsEl) return;
    variantDotsEl.innerHTML = '';
    CONFIG.variants.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'variant-dot';
      dot.setAttribute('aria-label', `Go to product ${i + 1}`);
      dot.addEventListener('click', () => {
        const targetScroll = i * SEGMENT_HEIGHT;
        window.scrollTo({ top: targetScroll, behavior: 'smooth' });
      });
      variantDotsEl.appendChild(dot);
    });
  }
  setupDots();

  /** Render Product List sections */
  function renderProductList() {
    if (!productListEl) return;
    const variants = CONFIG.variants || [];
    productListEl.innerHTML = '';
    variants.forEach((variant) => {
      const block = document.createElement('div');
      block.className = 'product-cta-block';
      block.innerHTML = `
        <div class="cta-product-img-wrap cta-product-img-9-16">
          <img src="assets/cta-product.webp" alt="Oraya ${variant.name} Serum - ${variant.subtitle}" class="cta-product-img" />
        </div>
        <div class="product-cta-text">
          <h3>${variant.name} ${variant.subtitle}</h3>
          <p>${variant.description}</p>
          <a href="#contact" class="btn btn-solid">Add to Routine</a>
        </div>
      `;
      productListEl.appendChild(block);
    });
  }
  renderProductList();

  /** จาก scrollY ได้ variant (0/1) และ t (0..1) ใน segment นั้น */
  function getVariantAndProgress(scrollY) {
    const variantIndex = Math.min(
      CONFIG.variants.length - 1,
      Math.max(0, Math.floor(scrollY / SEGMENT_HEIGHT))
    );
    const segmentStart = variantIndex * SEGMENT_HEIGHT;
    const segmentScroll = Math.min(SEGMENT_HEIGHT, Math.max(0, scrollY - segmentStart));
    const t = segmentScroll / SEGMENT_HEIGHT;
    return { variantIndex, t };
  }

  function tick() {
    const scrollY = window.scrollY;
    const { variantIndex, t } = getVariantAndProgress(scrollY);
    const prevVariant = currentVariantIndex;

    if (variantIndex !== currentVariantIndex) {
      currentVariantIndex = variantIndex;
      const variant = CONFIG.variants[variantIndex];
      if (variant) {
        setVariantContent(variant);
        document.documentElement.style.setProperty('--theme-color', variant.themeColor || CONFIG.themeColor);

        // Update dots active class
        if (variantDotsEl) {
          const dots = variantDotsEl.querySelectorAll('.variant-dot');
          dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === variantIndex);
          });
        }
      }
    }

    const justSwitched = prevVariant !== currentVariantIndex;

    heroVideos.forEach((video, i) => {
      if (i === currentVariantIndex) {
        // Efficient lazy loading: Load source only when needed
        if (!video.src && CONFIG.variants[i].videoSrc) {
          video.src = CONFIG.variants[i].videoSrc;
          video.load();
        }

        video.classList.add('active');
        video.classList.remove('hidden');
        const dur = video.duration;
        if (Number.isFinite(dur) && dur > 0) {
          const targetTime = t * dur;
          if (justSwitched) {
            smoothTimeByVariant[i] = targetTime;
            video.currentTime = targetTime;
          } else {
            smoothTimeByVariant[i] += (targetTime - smoothTimeByVariant[i]) * LERP_SPEED;
            const drift = Math.abs(smoothTimeByVariant[i] - video.currentTime);
            if (drift > SEEK_THRESHOLD) {
              video.currentTime = smoothTimeByVariant[i];
            }
          }
        }
      } else {
        video.classList.remove('active');
        video.classList.add('hidden');
      }
    });

    requestAnimationFrame(tick);
  }

  function setVariantContent(variant) {
    if (!variant) return;
    heroName.textContent = variant.name.toUpperCase();
    heroSubtitle.textContent = variant.subtitle;
    heroDesc.textContent = variant.description;
    if (variantIndexEl) variantIndexEl.textContent = String(variant.index).padStart(2, '0');

    // Toggle aspect ratio class
    if (heroBgWrap) {
      if (variant.aspectRatio === '16/9') {
        heroBgWrap.classList.add('aspect-16-9');
      } else {
        heroBgWrap.classList.remove('aspect-16-9');
      }
    }
  }

  function initNav() {
    const nav = document.querySelector('.nav');
    const links = nav.querySelectorAll('.nav-links a');
    const sections = ['product', 'ingredients', 'nutrition', 'reviews', 'faq', 'contact'];

    function updateActive() {
      const py = window.scrollY + 120;
      let active = 0;
      sections.forEach((id, i) => {
        const el = document.getElementById(id);
        if (el && el.offsetTop <= py) active = i;
      });
      links.forEach((a, i) => {
        a.classList.toggle('active', i === active);
      });
    }

    window.addEventListener('scroll', updateActive, { passive: true });
    updateActive();

    links.forEach((a) => {
      a.addEventListener('click', (e) => {
        const href = a.getAttribute('href');
        if (href.startsWith('#')) {
          e.preventDefault();
          const target = document.querySelector(href);
          if (target) target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  function initAccordion() {
    document.querySelectorAll('.accordion-trigger').forEach((btn) => {
      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') === 'true';
        document.querySelectorAll('.accordion-trigger').forEach((b) => {
          b.setAttribute('aria-expanded', 'false');
          b.parentElement.classList.remove('open');
        });
        if (!open) {
          btn.setAttribute('aria-expanded', 'true');
          btn.parentElement.classList.add('open');
        }
      });
    });
  }

  function initThemeToggle() {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;
    toggle.addEventListener('click', () => {
      document.body.classList.toggle('theme-dark', true);
      document.body.classList.toggle('theme-light', false);
    });
  }

  function initShowcaseToggle() {
    const btn = document.getElementById('showcase-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      isShowcaseMode = !isShowcaseMode;
      btn.textContent = isShowcaseMode ? '⏸' : '▶';
      btn.classList.toggle('showcase-active', isShowcaseMode);
      if (isShowcaseMode) showcaseTick();
    });
  }

  function showcaseTick() {
    if (!isShowcaseMode) return;

    const maxScroll = SHOWCASE_MAX_INDEX * SEGMENT_HEIGHT;
    let currentScroll = window.scrollY;

    // Reverse direction if limits reached
    if (currentScroll >= maxScroll) {
      showcaseDirection = -1;
    } else if (currentScroll <= 0) {
      showcaseDirection = 1;
    }

    let nextScroll = currentScroll + (SHOWCASE_SPEED * showcaseDirection);

    // Clamp nextScroll
    if (nextScroll > maxScroll) nextScroll = maxScroll;
    if (nextScroll < 0) nextScroll = 0;

    window.scrollTo({
      top: nextScroll,
      behavior: 'auto' // 'auto' or 'instant' is better for high-speed JS-driven scrolling
    });
    requestAnimationFrame(showcaseTick);
  }

  function initNavMenu() {
    const nav = document.getElementById('main-nav');
    const menuBtn = document.getElementById('nav-menu-btn');
    const navLinks = document.getElementById('nav-links');
    if (!nav || !menuBtn || !navLinks) return;

    function closeMenu() {
      nav.classList.remove('nav-open');
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.setAttribute('aria-label', 'Open menu');
    }

    function openMenu() {
      nav.classList.add('nav-open');
      menuBtn.setAttribute('aria-expanded', 'true');
      menuBtn.setAttribute('aria-label', 'Close menu');
    }

    menuBtn.addEventListener('click', () => {
      const open = nav.classList.contains('nav-open');
      if (open) closeMenu();
      else openMenu();
    });

    navLinks.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => { closeMenu(); });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('nav-open')) closeMenu();
    });
  }

  function recalcHeroScroll() {
    maxScrollForHero = SEGMENT_HEIGHT * CONFIG.variants.length;
    document.documentElement.style.setProperty('--hero-scroll-range', maxScrollForHero + 'px');
  }

  /** โหลดวิดีโอตัวแรกก่อน แล้วซ่อน loading (ตัวอื่นจะ lazy load ตาม scroll) */
  function loadVideos() {
    const variants = CONFIG.variants;
    if (!variants.length || !variants[0].videoSrc) {
      loadingOverlay.classList.add('loaded');
      loadingOverlay.classList.add('hidden');
      recalcHeroScroll();
      return;
    }

    loadingBar.style.width = '30%';
    loadingText.textContent = 'Preparing Radiance...';

    // We only wait for the FIRST video to be ready for better UX/Bandwidth
    const firstVideo = heroVideos[0];
    const firstVariant = variants[0];

    // Ensure first video has src
    if (!firstVideo.src) firstVideo.src = firstVariant.videoSrc;
    firstVideo.load();

    const checkReady = new Promise((resolve) => {
      // If already ready
      if (firstVideo.readyState >= 3) resolve();

      firstVideo.oncanplay = () => resolve();
      firstVideo.onerror = () => resolve(); // Prevent hang on error

      // Fallback timeout
      setTimeout(resolve, 3000);
    });

    checkReady.then(() => {
      loadingBar.style.width = '100%';
      loadingText.textContent = 'Ready';

      setVariantContent(firstVariant);
      document.documentElement.style.setProperty('--theme-color', firstVariant.themeColor || CONFIG.themeColor);

      firstVideo.classList.add('active');
      firstVideo.classList.remove('hidden');

      setTimeout(() => {
        loadingOverlay.classList.add('loaded');
        setTimeout(() => {
          loadingOverlay.classList.add('hidden');
          recalcHeroScroll();
        }, 400);
      }, 200);
    });
  }

  loadVideos();

  window.addEventListener('load', () => { window.scrollTo(0, 0); });

  window.addEventListener('scroll', () => {
    document.querySelector('.nav').classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });
  window.addEventListener('resize', recalcHeroScroll);

  initNav();
  initNavMenu();
  initAccordion();
  initThemeToggle();
  initShowcaseToggle();

  requestAnimationFrame(tick);
})();
