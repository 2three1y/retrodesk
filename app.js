(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // ---------- sound (all synthesized, no files) ----------
  const SOUND_KEY = "retrodesk.sound";
  let soundOn = localStorage.getItem(SOUND_KEY) !== "off";
  let ctx = null;
  let unlocked = false;
  const soundBtn = $("#sound-toggle");
  const paintSound = () => { soundBtn.textContent = soundOn ? "Sound: on" : "Sound: off"; };
  paintSound();
  soundBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    localStorage.setItem(SOUND_KEY, soundOn ? "on" : "off");
    paintSound();
    if (soundOn) { unlock(); blip(880, 0.08); }
  });

  // A tiny silent WAV, so iPhones with the ring switch on silent still let Web Audio play.
  function silentWav() {
    const n = 800, buf = new ArrayBuffer(44 + n), v = new DataView(buf);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, "RIFF"); v.setUint32(4, 36 + n, true); w(8, "WAVE"); w(12, "fmt ");
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
    w(36, "data"); v.setUint32(40, n, true);
    for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
    let bin = ""; const b = new Uint8Array(buf);
    for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
    return "data:audio/wav;base64," + btoa(bin);
  }
  function unlock() {
    try {
      if (navigator.audioSession) navigator.audioSession.type = "playback";
    } catch (e) { /* not supported */ }
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    if (!unlocked) {
      unlocked = true;
      try {
        const a = new Audio(silentWav());
        a.setAttribute("playsinline", "");
        const p = a.play();
        if (p && p.catch) p.catch(() => {});
      } catch (e) { /* fine */ }
    }
    return ctx;
  }
  ["pointerup", "touchend", "click"].forEach(t =>
    document.addEventListener(t, () => { if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {}); }, { passive: true }));

  function note(freq, start, dur, type, peak, out) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.25, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g).connect(out);
    o.start(start); o.stop(start + dur + 0.05);
  }
  function bus() {
    // gentle echo so the chime feels roomy
    const master = ctx.createGain(); master.gain.value = 0.9;
    const delay = ctx.createDelay(1); delay.delayTime.value = 0.23;
    const fb = ctx.createGain(); fb.gain.value = 0.32;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2600;
    master.connect(ctx.destination);
    master.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay); lp.connect(ctx.destination);
    return master;
  }
  // Original startup chime: a slow rising arpeggio that settles on a warm chord.
  function bootChime() {
    if (!soundOn || !unlock()) return;
    const t = ctx.currentTime + 0.05, out = bus();
    const arp = [261.63, 329.63, 392.0, 493.88, 587.33];
    arp.forEach((f, i) => {
      note(f, t + i * 0.18, 1.6, "triangle", 0.16, out);
      note(f * 2, t + i * 0.18, 0.9, "sine", 0.05, out);
    });
    [130.81, 196.0, 329.63, 392.0, 493.88].forEach(f => note(f, t + 0.95, 2.6, "sine", 0.09, out));
    note(783.99, t + 1.05, 1.8, "sine", 0.06, out);
  }
  function shutdownChime() {
    if (!soundOn || !unlock()) return;
    const t = ctx.currentTime + 0.05, out = bus();
    [587.33, 440.0, 349.23, 261.63].forEach((f, i) => note(f, t + i * 0.2, 1.1, "triangle", 0.14, out));
  }
  function blip(freq = 660, dur = 0.06) {
    if (!soundOn || !ctx) return;
    note(freq, ctx.currentTime + 0.01, dur + 0.05, "square", 0.04, ctx.destination);
  }

  // ---------- power ----------
  const boot = $("#boot"), desktop = $("#desktop"), taskbar = $("#taskbar");
  const powerOn = $("#power-on"), bootTitle = $("#boot-title"), bootText = $("#boot-text");
  powerOn.addEventListener("click", () => {
    unlock();
    bootChime();
    boot.hidden = true;
    desktop.hidden = false;
    taskbar.hidden = false;
    // The button you pressed is gone, so put focus at the top of the desktop.
    $("#desktop-title").focus();
  });
  $("#power-off").addEventListener("click", () => {
    closeMenu(false);
    shutdownChime();
    desktop.hidden = true;
    taskbar.hidden = true;
    bootTitle.textContent = "It's now safe to close this tab";
    bootText.textContent = "Or turn it back on. I won't tell anyone.";
    boot.hidden = false;
    powerOn.focus();
  });

  // ---------- windows (native <dialog>) ----------
  let returnTo = null;
  function openWin(name, opener) {
    const d = document.getElementById("win-" + name);
    if (!d) return;
    const current = $("dialog[open]");
    if (current && current !== d) {
      current.dataset.switching = "1";
      current.close();
    } else if (!current) {
      returnTo = opener || null;
    }
    if (!d.open) {
      blip(740);
      d.showModal();
    }
  }
  $$("dialog.window").forEach(d => {
    d.addEventListener("close", () => {
      if (d.dataset.switching) { delete d.dataset.switching; return; }
      const t = returnTo; returnTo = null;
      if (t && document.contains(t) && !t.closest("[hidden]")) t.focus();
      else $("#start").focus();
    });
    $("[data-close]", d).addEventListener("click", () => d.close());
  });
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-open]");
    if (!b) return;
    if (b.classList.contains("menu-item")) {
      closeMenu(false);
      openWin(b.dataset.open, $("#start"));
    } else {
      openWin(b.dataset.open, b.closest("dialog") ? null : b);
    }
  });

  // ---------- Start menu (disclosure of real buttons) ----------
  const start = $("#start"), menu = $("#start-menu");
  const items = () => $$(".menu-item", menu);
  function openMenu() {
    menu.hidden = false;
    start.setAttribute("aria-expanded", "true");
    blip(520, 0.04);
    items()[0].focus();
  }
  function closeMenu(refocus) {
    if (menu.hidden) return;
    menu.hidden = true;
    start.setAttribute("aria-expanded", "false");
    if (refocus) start.focus();
  }
  start.addEventListener("click", () => { unlock(); menu.hidden ? openMenu() : closeMenu(true); });
  menu.addEventListener("keydown", e => {
    const list = items(), i = list.indexOf(document.activeElement);
    if (e.key === "Escape") { e.preventDefault(); closeMenu(true); }
    else if (e.key === "ArrowDown") { e.preventDefault(); list[(i + 1) % list.length].focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
    else if (e.key === "Home") { e.preventDefault(); list[0].focus(); }
    else if (e.key === "End") { e.preventDefault(); list[list.length - 1].focus(); }
  });
  start.addEventListener("keydown", e => { if (e.key === "Escape") closeMenu(true); });
  document.addEventListener("pointerdown", e => {
    if (!menu.hidden && !menu.contains(e.target) && !start.contains(e.target)) closeMenu(false);
  });
  taskbar.addEventListener("focusout", e => {
    if (!menu.hidden && e.relatedTarget && !taskbar.contains(e.relatedTarget)) closeMenu(false);
  });

  // ---------- Notepad ----------
  const NOTE_KEY = "retrodesk.notepad";
  const pad = $("#notepad-text");
  try { pad.value = localStorage.getItem(NOTE_KEY) || ""; } catch (e) {}
  let saveTimer = 0;
  pad.addEventListener("input", () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { try { localStorage.setItem(NOTE_KEY, pad.value); } catch (e) {} }, 300);
  });
  pad.addEventListener("blur", () => { try { localStorage.setItem(NOTE_KEY, pad.value); } catch (e) {} });

  // ---------- Recycle Bin ----------
  const binJokes = [
    "Still empty. Great job.",
    "Emptied nothing again. Very tidy.",
    "Zero items deleted. A new record.",
    "Empty Recycle Bin"
  ];
  let binN = 0;
  $("#empty-bin").addEventListener("click", e => {
    e.currentTarget.textContent = binJokes[binN % binJokes.length];
    binN++;
    blip(330, 0.1);
  });

  // ---------- clock (plain text, once a minute) ----------
  const clock = $("#clock");
  function tick() {
    const d = new Date();
    clock.textContent = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    clock.setAttribute("datetime", d.toISOString());
  }
  tick();
  setTimeout(() => { tick(); setInterval(tick, 60000); }, (60 - new Date().getSeconds()) * 1000 + 50);
})();
