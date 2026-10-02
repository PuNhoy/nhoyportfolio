(function(){
  var stage = document.getElementById('stage');
  var cv = document.getElementById('cv');
  var ctx = cv.getContext('2d');
  var hi = document.getElementById('human');
  var ri = document.getElementById('robot');
  var calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var S = 3, W = 0, H = 0, mw = 0, mh = 0, dpr = 1;
  var mc = document.createElement('canvas');
  var mx = mc.getContext('2d', { willReadFrequently: true });
  var A = document.createElement('canvas');
  var ax = A.getContext('2d');
  var B = document.createElement('canvas');
  var bx = B.getContext('2d');
  var blobs = [], px = 0, py = 0, inside = false, lastX = null, lastY = null, running = false;

  function fit(c, img) {
    var s = Math.min(W / img.naturalWidth, H / img.naturalHeight);
    var w = img.naturalWidth * s;
    var h = img.naturalHeight * s;
    c.drawImage(img, (W - w) / 2, H - h, w, h);
  }

  function resize() {
    var b = stage.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = Math.round(b.width * dpr);
    H = Math.round(b.height * dpr);
    cv.width = A.width = B.width = W;
    cv.height = A.height = B.height = H;
    mw = Math.ceil(b.width / S);
    mh = Math.ceil(b.height / S);
    mc.width = mw;
    mc.height = mh;
    draw(0);
  }

  function add(x, y, r, vy) {
    blobs.push({
      x: x,
      y: y,
      r: r,
      life: 1,
      vx: (Math.random() - 0.5) * 0.25,
      vy: vy,
      seed: Math.random() * 9,
      decay: calm ? 0.05 : 0.011 + Math.random() * 0.006
    });
  }

  function pos(e) {
    var b = stage.getBoundingClientRect();
    px = e.clientX - b.left;
    py = e.clientY - b.top;
  }

  function trail() {
    if (lastX === null) { lastX = px; lastY = py; }
    var dx = px - lastX;
    var dy = py - lastY;
    var d = Math.hypot(dx, dy);
    var n = Math.max(1, Math.floor(d / 9));
    for (var i = 1; i <= n; i++) {
      add(lastX + dx * i / n, lastY + dy * i / n, 26 + Math.random() * 22 + Math.min(d, 40) * 0.5, -0.35 - Math.random() * 0.4);
    }
    lastX = px;
    lastY = py;
  }

  function draw(time) {
    if (!W || !hi.naturalWidth || !ri.naturalWidth) return;
    mx.globalCompositeOperation = 'source-over';
    mx.fillStyle = '#000';
    mx.fillRect(0, 0, mw, mh);
    mx.globalCompositeOperation = 'lighter';
    if (inside) {
      var wob = calm ? 0 : Math.sin(time / 260) * 5;
      add(px + wob, py, 56, -0.25);
      blobs[blobs.length - 1].decay = 0.09;
    }
    for (var i = blobs.length - 1; i >= 0; i--) {
      var o = blobs[i];
      o.life -= o.decay;
      if (o.life <= 0) { blobs.splice(i, 1); continue; }
      if (!calm) {
        o.x += o.vx + Math.sin(time / 300 + o.seed) * 0.5;
        o.y += o.vy;
      }
      var g = 1 + (1 - o.life) * 0.9;
      var rr = o.r * g / S;
      var cx = o.x / S;
      var cy = o.y / S;
      var gr = mx.createRadialGradient(cx, cy, 0, cx, cy, rr);
      var a = Math.min(1, o.life * 1.4);
      gr.addColorStop(0, 'rgba(255,255,255,' + a + ')');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      mx.fillStyle = gr;
      mx.fillRect(cx-rr, cy-rr, rr*2, rr*2);
    }
    var im = mx.getImageData(0, 0, mw, mh);
    var d = im.data;
    for (var p = 0; p < d.length; p += 4) {
      var v = (d[p] - 70) / 90;
      v = v < 0 ? 0 : v > 1 ? 1 : v;
      v = v * v * (3 - 2 * v);
      d[p] = d[p + 1] = d[p + 2] = 255;
      d[p + 3] = v * 255;
    }
    mx.globalCompositeOperation = 'source-over';
    mx.putImageData(im, 0, 0);

    ax.globalCompositeOperation = 'source-over';
    ax.clearRect(0, 0, W, H);
    fit(ax, ri);
    ax.globalCompositeOperation = 'destination-out';
    ax.drawImage(mc, 0, 0, W, H);

    bx.globalCompositeOperation = 'source-over';
    bx.clearRect(0, 0, W, H);
    fit(bx, hi);
    bx.globalCompositeOperation = 'destination-in';
    bx.drawImage(mc, 0, 0, W, H);

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(A, 0, 0);
    ctx.drawImage(B, 0, 0);
  }

  function loop(time) {
    draw(time);
    if (inside || blobs.length) {
      requestAnimationFrame(loop);
    } else {
      running = false;
    }
  }

  function kick() {
    if (!running) {
      running = true;
      requestAnimationFrame(loop);
    }
  }

  stage.addEventListener('pointerenter', function(e) {
    pos(e);
    lastX = null;
    inside = true;
    kick();
  });
  stage.addEventListener('pointermove', function(e) {
    pos(e);
    trail();
    inside = true;
    kick();
  });
  function out() {
    inside = false;
    lastX = null;
    kick();
  }
  stage.addEventListener('pointerleave', out);
  stage.addEventListener('pointercancel', out);
  stage.addEventListener('pointerup', function(e) {
    if (e.pointerType === 'touch') out();
  });

  function ready() {
    if (hi.naturalWidth && ri.naturalWidth) resize();
  }
  hi.onload = ri.onload = ready;
  if (hi.complete && ri.complete) ready();
  ready();

  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  else addEventListener('resize', resize);
})();


// <!-- SCRIPT 2: SCROLL REVEAL & PROGRESS BAR -->

document.documentElement.classList.add('js');
(function() {
  var els = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(es) {
      es.forEach(function(e) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(function(el) { io.observe(el); });
  } else {
    els.forEach(function(el) { el.classList.add('in'); });
  }

  var bar = document.getElementById('bar');
  var tick = false;
  function upd() {
    var h = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = 'scaleX(' + (h > 0 ? scrollY / h : 0) + ')';
    tick = false;
  }
  addEventListener('scroll', function() {
    if (!tick) {
      tick = true;
      requestAnimationFrame(upd);
    }
  }, { passive: true });
  upd();
})();


// <!-- SCRIPT 3: THEME TOGGLE, MOBILE MENU & PROJECT FILTERING -->

// THEME TOGGLE (DARK / LIGHT MODE)
(function() {
  var themeBtn = document.getElementById('theme-btn');
  var root = document.documentElement;

  function getSavedTheme() {
    var saved = localStorage.getItem('portfolio-theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    localStorage.setItem('portfolio-theme', t);
  }

  // Initialize theme
  applyTheme(getSavedTheme());

  themeBtn.addEventListener('click', function() {
    var cur = root.getAttribute('data-theme') || 'light';
    var next = cur === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });

  // Listen to system theme updates
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
    if (!localStorage.getItem('portfolio-theme')) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
})();

// MOBILE MENU TOGGLE
(function() {
  var mobileBtn = document.getElementById('mobile-btn');
  var navMenu = document.getElementById('nav-menu');

  mobileBtn.addEventListener('click', function() {
    var isOpen = navMenu.classList.toggle('open');
    mobileBtn.classList.toggle('open');
    mobileBtn.setAttribute('aria-expanded', isOpen);
  });

  // Close menu on link click
  navMenu.querySelectorAll('a').forEach(function(link) {
    link.addEventListener('click', function() {
      navMenu.classList.remove('open');
      mobileBtn.classList.remove('open');
      mobileBtn.setAttribute('aria-expanded', 'false');
    });
  });
})();

// PROJECT CARD FILTERING (ALL / DESIGN / DEVELOP)
function filterProjects(category) {
  var cards = document.querySelectorAll('.project-card');
  var btns = document.querySelectorAll('.filter-btn');

  btns.forEach(function(b) {
    if (b.getAttribute('data-filter') === category) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });

  cards.forEach(function(card) {
    var cardCat = card.getAttribute('data-category') || '';
    if (category === 'all' || cardCat.includes(category)) {
      card.style.display = 'flex';
      card.style.opacity = '0';
      card.style.transform = 'translateY(16px)';
      setTimeout(function() {
        card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, 20);
    } else {
      card.style.display = 'none';
    }
  });

  // Scroll smoothly to work section if clicked from external button
  var workSec = document.getElementById('work');
  if (workSec && window.scrollY > workSec.offsetTop + 100 || window.scrollY < workSec.offsetTop - 500) {
    workSec.scrollIntoView({ behavior: 'smooth' });
  }
}