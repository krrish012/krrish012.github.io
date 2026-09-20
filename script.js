/* =========================================================
   Krrish Ajay Katira — Portfolio
   Vanilla JS: nav, typewriter, text-scramble, matrix rain,
   live terminal, system-status widgets,
   GSAP / ScrollTrigger scroll animations.
   ========================================================= */
(function () {
  "use strict";

  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------
     Footer year
  --------------------------------------------------------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------------------------------------------------
     Nav: background on scroll + mobile toggle
  --------------------------------------------------------- */
  var navEl = document.getElementById("nav");
  var navToggle = document.getElementById("navToggle");
  var navLinks = document.getElementById("navLinks");

  function onScrollNav() {
    if (!navEl) return;
    navEl.classList.toggle("is-scrolled", window.scrollY > 40);
  }
  window.addEventListener("scroll", onScrollNav, { passive: true });
  onScrollNav();

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
      var isOpen = navLinks.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    navLinks.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        navLinks.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------------------------------------------------------
     Text scramble / decode-in effect for headers
  --------------------------------------------------------- */
  var SCRAMBLE_CHARS = "!<>-_\\/[]{}=+*^?#01";

  function scramble(el, text, duration) {
    duration = duration || 900;
    if (reducedMotion) {
      el.textContent = text;
      return;
    }
    var start = null;
    var len = text.length;

    function frame(ts) {
      if (!start) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var revealCount = Math.floor(progress * len);
      var out = "";
      for (var i = 0; i < len; i++) {
        if (i < revealCount || text[i] === " ") {
          out += text[i];
        } else {
          out += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        }
      }
      el.textContent = out;
      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        el.textContent = text;
      }
    }
    requestAnimationFrame(frame);
  }

  var scrambleEls = document.querySelectorAll(".scramble");
  if ("IntersectionObserver" in window && scrambleEls.length) {
    var scrambleObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var el = entry.target;
            scramble(el, el.dataset.text || el.textContent);
            scrambleObserver.unobserve(el);
          }
        });
      },
      { threshold: 0.4 }
    );
    scrambleEls.forEach(function (el) {
      scrambleObserver.observe(el);
    });
  } else {
    scrambleEls.forEach(function (el) {
      el.textContent = el.dataset.text || el.textContent;
    });
  }

  /* ---------------------------------------------------------
     Terminal: boot typewriter sequence, then a live JS shell
  --------------------------------------------------------- */
  var termBody = document.getElementById("termBody");
  var termForm = document.getElementById("termForm");
  var termInput = document.getElementById("termInput");
  var terminalEl = document.getElementById("heroTerminal");

  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function typeText(el, text, speed) {
    return new Promise(function (resolve) {
      var i = 0;
      (function step() {
        el.textContent = text.slice(0, i);
        i++;
        if (i <= text.length) {
          setTimeout(step, speed);
        } else {
          resolve();
        }
      })();
    });
  }

  function revealOut(el) {
    return new Promise(function (resolve) {
      if (!el) {
        resolve();
        return;
      }
      el.textContent = el.dataset.out || "";
      requestAnimationFrame(function () {
        el.style.opacity = 1;
        setTimeout(resolve, 260);
      });
    });
  }

  function scrollTermToBottom() {
    if (termBody) termBody.scrollTop = termBody.scrollHeight;
  }

  async function runBootSequence() {
    var cmdEls = document.querySelectorAll(".term-cmd");
    var outEls = document.querySelectorAll(".term-out");

    if (reducedMotion) {
      cmdEls.forEach(function (el) {
        el.textContent = el.dataset.type || "";
      });
      outEls.forEach(function (el) {
        el.textContent = el.dataset.out || "";
        el.style.opacity = 1;
      });
      return;
    }

    for (var i = 0; i < cmdEls.length; i++) {
      await typeText(cmdEls[i], cmdEls[i].dataset.type || "", 34);
      await wait(180);
      await revealOut(outEls[i]);
      await wait(260);
      scrollTermToBottom();
    }
    // Reveal the trailing hint line (no matching command), if present
    if (outEls.length > cmdEls.length) {
      await revealOut(outEls[cmdEls.length]);
      scrollTermToBottom();
    }
  }

  /* ---- Live command shell -------------------------------- */
  function appendTermLine(text, opts) {
    opts = opts || {};
    var p = document.createElement("p");
    p.className = "term-line" + (opts.className ? " " + opts.className : "");
    if (opts.prompt) {
      var promptSpan = document.createElement("span");
      promptSpan.className = "term-prompt";
      promptSpan.textContent = ">";
      p.appendChild(promptSpan);
      p.appendChild(document.createTextNode(" "));
    }
    var textSpan = document.createElement("span");
    textSpan.textContent = text;
    p.appendChild(textSpan);
    termBody.appendChild(p);
    scrollTermToBottom();
    return p;
  }

  var TERM_COMMANDS = {
    whoami: function () {
      return ["Krrish Ajay Katira — B.Tech Cybersecurity Student"];
    },
    skills: function () {
      return [
        "Languages       : Python, Java, JavaScript, MATLAB",
        "Security / OSINT: Wireshark, Metasploit, BeEF, Sherlock",
        "Systems         : Kali Linux, ParrotOS (AMD64), Windows 11, Ventoy"
      ];
    },
    help: function () {
      return [
        "available commands:",
        "  whoami   — who this terminal belongs to",
        "  skills   — core toolset, grouped",
        "  clear    — clear the terminal output",
        "  help     — show this list"
      ];
    },
    clear: function () {
      if (termBody) termBody.innerHTML = "";
      return null;
    }
  };

  function runTermCommand(raw) {
    var cmd = (raw || "").trim();
    appendTermLine(cmd, { prompt: true });
    if (!cmd) return;

    var key = cmd.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(TERM_COMMANDS, key)) {
      var lines = TERM_COMMANDS[key]();
      if (lines) {
        lines.forEach(function (line) {
          appendTermLine(line, { className: "term-out term-out-live" });
        });
      }
    } else {
      appendTermLine(
        "command not found: " + cmd + " — type 'help' for a list of commands",
        { className: "term-out term-out-live term-out-error" }
      );
    }
    scrollTermToBottom();
    
    // Force GSAP to recalculate if a live command pushes the container height down
    if (typeof ScrollTrigger !== "undefined") {
      ScrollTrigger.refresh();
    }
  }

  if (termForm && termInput && termBody) {
    termForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var value = termInput.value;
      termInput.value = "";
      runTermCommand(value);
    });

    if (terminalEl) {
      terminalEl.addEventListener("click", function () {
        termInput.focus();
      });
    }
  }

  runBootSequence().then(function () {
    // Force GSAP to recalculate now that the boot sequence has changed the DOM height
    if (typeof ScrollTrigger !== "undefined") {
      ScrollTrigger.refresh();
    }
    
    if (termInput && !reducedMotion && window.matchMedia("(min-width: 861px)").matches) {
      termInput.focus({ preventScroll: true });
    }
  });

  /* ---------------------------------------------------------
     System Status: mock contribution grid, live clock, uptime
  --------------------------------------------------------- */
  var contribGrid = document.getElementById("contribGrid");
  if (contribGrid) {
    var totalCells = 26 * 7; // ~26 weeks x 7 days, matches CSS grid columns
    var frag = document.createDocumentFragment();
    for (var c = 0; c < totalCells; c++) {
      var cell = document.createElement("span");
      // weighted toward lower activity, occasional bursts — purely decorative
      var roll = Math.random();
      var level = roll > 0.93 ? 4 : roll > 0.8 ? 3 : roll > 0.6 ? 2 : roll > 0.35 ? 1 : 0;
      cell.className = "lvl-" + level;
      frag.appendChild(cell);
    }
    contribGrid.appendChild(frag);
  }

  var widgetClock = document.getElementById("widgetClock");
  var widgetDate = document.getElementById("widgetDate");
  function pad(n) {
    return String(n).padStart(2, "0");
  }
  function tickClock() {
    var now = new Date();
    if (widgetClock) {
      widgetClock.textContent =
        pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
    }
    if (widgetDate) {
      widgetDate.textContent = now.toLocaleDateString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    }
  }
  if (widgetClock) {
    tickClock();
    setInterval(tickClock, 1000);
  }

  var widgetUptime = document.getElementById("widgetUptime");
  if (widgetUptime) {
    var sessionStart = Date.now();
    function tickUptime() {
      var elapsed = Math.floor((Date.now() - sessionStart) / 1000);
      var h = Math.floor(elapsed / 3600);
      var m = Math.floor((elapsed % 3600) / 60);
      var s = elapsed % 60;
      widgetUptime.textContent = pad(h) + ":" + pad(m) + ":" + pad(s);
    }
    tickUptime();
    setInterval(tickUptime, 1000);
  }

/* ---------------------------------------------------------
     Client Profiling: OS, RAM & Incognito Detection
  --------------------------------------------------------- */
  // 1. Basic OS Detection via User-Agent
  var osName = "Unknown OS";
  var ua = navigator.userAgent;
  if (ua.indexOf("Win") !== -1) osName = "Windows";
  else if (ua.indexOf("Mac") !== -1) osName = "macOS";
  else if (ua.indexOf("Linux") !== -1) osName = "Linux";
  else if (ua.indexOf("Android") !== -1) osName = "Android";
  else if (ua.indexOf("like Mac") !== -1) osName = "iOS";

  var osSpan = document.getElementById("clientOs");
  if (osSpan) osSpan.textContent = osName;

  // 2. Dynamic RAM Detection
  var ramSpan = document.getElementById("clientRam");
  if (ramSpan) {
    if (navigator.deviceMemory) {
      // Browsers cap this at 8GB to prevent fingerprinting, but it reads accurately for lower tiers
      ramSpan.textContent = navigator.deviceMemory + "GB";
    } else {
      // Fallback if the browser outright blocks the API
      ramSpan.textContent = "16GB"; 
    }
  }

  // 3. Storage-Quirk Incognito Detection (Bulletproof Fallback)
  var modeSpan = document.getElementById("clientMode");

  // Always set a 2-second fallback timer regardless of the script loading
  var detectionTimeout = setTimeout(function() {
    if (modeSpan && modeSpan.textContent === "Detecting...") {
      modeSpan.textContent = "Standard Session (Shields Up)";
      modeSpan.classList.add("widget-status-ok");
    }
  }, 2000);

  // Check if the CDN loaded successfully
  if (typeof detectIncognito !== "undefined") {
    detectIncognito().then(function (result) {
      clearTimeout(detectionTimeout);
      if (modeSpan) {
        if (result.isPrivate) {
          modeSpan.textContent = "Private / Incognito";
          modeSpan.style.color = "var(--danger)"; 
          modeSpan.classList.remove("widget-status-ok");
        } else {
          modeSpan.textContent = "Standard Session";
          modeSpan.classList.add("widget-status-ok");
        }
      }
    }).catch(function() {
      clearTimeout(detectionTimeout);
      if (modeSpan) {
        modeSpan.textContent = "Standard Session (Shields Up)";
        modeSpan.classList.add("widget-status-ok");
      }
    });
  } else {
    // The CDN was blocked entirely
    clearTimeout(detectionTimeout);
    if (modeSpan) {
      modeSpan.textContent = "Standard Session (Shields Up)";
      modeSpan.classList.add("widget-status-ok");
    }
  }

  /* ---------------------------------------------------------
     Matrix rain — subtle canvas background behind hero
  --------------------------------------------------------- */
  var canvas = document.getElementById("matrixCanvas");
  if (canvas && !reducedMotion) {
    var ctx = canvas.getContext("2d");
    var w, h, columns, drops;
    var fontSize = 15;
    var chars = "01{}<>/#$KAK".split("");
    var intervalId = null;

    function resize() {
      w = canvas.width = canvas.offsetWidth;
      h = canvas.height = canvas.offsetHeight;
      columns = Math.max(1, Math.floor(w / fontSize));
      drops = new Array(columns).fill(0).map(function () {
        return Math.floor(Math.random() * -40);
      });
    }

    function draw() {
      ctx.fillStyle = "rgba(5,8,11,0.16)";
      ctx.fillRect(0, 0, w, h);
      ctx.font = fontSize + "px 'JetBrains Mono', monospace";
      for (var i = 0; i < drops.length; i++) {
        var text = chars[Math.floor(Math.random() * chars.length)];
        var isLead = Math.random() > 0.93;
        ctx.fillStyle = isLead ? "rgba(232,238,243,0.6)" : "rgba(57,255,138,0.32)";
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > h && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    }

    function start() {
      if (intervalId) return;
      intervalId = setInterval(draw, 55);
    }
    function stop() {
      if (!intervalId) return;
      clearInterval(intervalId);
      intervalId = null;
    }

    resize();
    window.addEventListener("resize", resize);

    if ("IntersectionObserver" in window) {
      var canvasObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) start();
            else stop();
          });
        },
        { threshold: 0 }
      );
      canvasObserver.observe(canvas);
    } else {
      start();
    }
  }

  /* ---------------------------------------------------------
     GSAP / ScrollTrigger animations
  --------------------------------------------------------- */
  function revealFallback() {
    document.querySelectorAll(".reveal-up").forEach(function (el) {
      el.style.opacity = 1;
      el.style.transform = "none";
    });
  }

  if (reducedMotion || typeof window.gsap === "undefined" || typeof window.ScrollTrigger === "undefined") {
    revealFallback();
  } else {
    gsap.registerPlugin(ScrollTrigger);
    var mm = gsap.matchMedia();

    /* Pinned hero: content fades/lifts, canvas scales, while pinned in place */
    mm.add("(min-width: 861px)", function () {
      var heroTl = gsap.timeline({
        scrollTrigger: {
          trigger: "#hero",
          start: "top top",
          end: "+=85%",
          scrub: true,
          pin: true,
        },
      });
      heroTl
        // Using fromTo locks the starting opacity to 1, preventing the "stuck dim" bug
        .fromTo("#heroContent", { opacity: 1, y: 0 }, { opacity: 0, y: -70, ease: "none" }, 0)
        .fromTo("#matrixCanvas", { scale: 1, opacity: 0.5 }, { scale: 1.2, opacity: 0, ease: "none" }, 0);
    });

    mm.add("(max-width: 860px)", function () {
      gsap.fromTo("#heroContent", 
        { opacity: 1, y: 0 },
        {
          opacity: 0,
          y: -20,
          ease: "none",
          scrollTrigger: {
            trigger: "#hero",
            start: "bottom bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    });

    /* Section kickers + headings: simple fade/slide as they arrive */
    gsap.utils.toArray(".section-kicker").forEach(function (el) {
      gsap.from(el, {
        opacity: 0,
        y: 16,
        duration: 0.6,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 90%" },
      });
    });

    /* Staggered skill card reveal */
    gsap.utils.toArray(".skills-grid .skill-card").forEach(function (card, i) {
      gsap.to(card, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power3.out",
        delay: i * 0.08,
        scrollTrigger: { trigger: card, start: "top 88%" },
      });
    });

    /* Staggered widget reveal */
    gsap.utils.toArray(".status-grid .widget").forEach(function (card, i) {
      gsap.to(card, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power3.out",
        delay: i * 0.08,
        scrollTrigger: { trigger: card, start: "top 88%" },
      });
    });

    /* Staggered project card reveal */
    gsap.utils.toArray(".projects-grid .project-card").forEach(function (card, i) {
      gsap.to(card, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power3.out",
        delay: (i % 2) * 0.1,
        scrollTrigger: { trigger: card, start: "top 88%" },
      });
    });

    /* Contact section reveal */
    gsap.utils.toArray(".contact-links, .contact-right").forEach(function (el, i) {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        ease: "power3.out",
        delay: i * 0.15, /* Staggers the animation so the radar appears right after the links */
        scrollTrigger: { trigger: ".contact-grid", start: "top 90%" },
      });
    });
  }
})();
