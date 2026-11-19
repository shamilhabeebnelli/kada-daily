/* Kada Daily — offline shop sales & expense tracker. Data stays in localStorage. */
(function () {
  "use strict";

  var KEY = "kadaDailyV1";
  var CATS = ["TV", "Fridge", "AC", "Mobile", "Audio", "Service", "Other"];

  var state = load();
  var segType = "sale";
  var selCat = CATS[0];

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && Array.isArray(s.entries)) return { entries: s.entries, target: s.target || 0 };
      }
    } catch (e) {}
    return { entries: [], target: 0 };
  }
  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }
  function dayKey(d) {
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
  }
  function todayKey() { return dayKey(new Date()); }
  function fmt(n) {
    return "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }
  function prettyDate(key) {
    var d = new Date(key + "T00:00:00");
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }
  function $(id) { return document.getElementById(id); }

  function totalsFor(key) {
    var s = 0, e = 0, c = 0;
    state.entries.forEach(function (en) {
      if (en.d !== key) return;
      if (en.type === "sale") { s += en.amount; } else { e += en.amount; }
      c++;
    });
    return { sales: s, exp: e, count: c };
  }

  function renderSummary() {
    var t = totalsFor(todayKey());
    $("kd-sales").textContent = fmt(t.sales);
    $("kd-exp").textContent = fmt(t.exp);
    $("kd-net").textContent = fmt(t.sales - t.exp);
    $("kd-count").textContent = t.count;
  }

  function renderTarget() {
    var bar = $("kd-bar"), txt = $("kd-bartext");
    $("kd-targetin").value = state.target || "";
    if (!state.target) {
      bar.style.width = "0";
      txt.textContent = "No target set";
      return;
    }
    var t = totalsFor(todayKey());
    var pct = Math.min(100, Math.round((t.sales / state.target) * 100));
    bar.style.width = pct + "%";
    txt.textContent = fmt(t.sales) + " of " + fmt(state.target) + " — " + pct + "% reached" +
      (t.sales >= state.target ? " · target hit!" : "");
  }

  function renderChips() {
    var wrap = $("kd-chips");
    wrap.innerHTML = "";
    CATS.forEach(function (c) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "kd-chip" + (c === selCat ? " kd-active" : "");
      b.textContent = c;
      b.addEventListener("click", function () { selCat = c; renderChips(); });
      wrap.appendChild(b);
    });
  }

  function drawChart() {
    var cv = $("kd-chart");
    var dpr = window.devicePixelRatio || 1;
    var w = cv.clientWidth || cv.parentElement.clientWidth - 36;
    var h = 170;
    cv.width = w * dpr; cv.height = h * dpr;
    cv.style.height = h + "px";
    var ctx = cv.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    var days = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date(); d.setDate(d.getDate() - i);
      days.push({ key: dayKey(d), label: d.toLocaleDateString("en-IN", { weekday: "short" }) });
    }
    var max = 1;
    var data = days.map(function (dy) {
      var t = totalsFor(dy.key);
      max = Math.max(max, t.sales, t.exp);
      return t;
    });

    var padB = 22, padT = 10;
    var plotH = h - padB - padT;
    var slot = w / 7;
    var bw = Math.min(16, slot / 4);

    ctx.font = "11px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    days.forEach(function (dy, i) {
      var cx = slot * i + slot / 2;
      var t = data[i];
      var sh = (t.sales / max) * plotH;
      var eh = (t.exp / max) * plotH;
      ctx.fillStyle = "#22c55e";
      ctx.fillRect(cx - bw - 2, padT + plotH - sh, bw, sh);
      ctx.fillStyle = "#f43f5e";
      ctx.fillRect(cx + 2, padT + plotH - eh, bw, eh);
      ctx.fillStyle = "#93a1b8";
      ctx.fillText(dy.label, cx, h - 6);
      if (t.sales > 0) {
        ctx.fillStyle = "#e8edf6";
        ctx.fillText(shortNum(t.sales), cx, padT + plotH - sh - 5 < 12 ? 12 : padT + plotH - sh - 5);
      }
    });
  }
  function shortNum(n) {
    if (n >= 100000) return (n / 100000).toFixed(1) + "L";
    if (n >= 1000) return (n / 1000).toFixed(1) + "k";
    return String(Math.round(n));
  }

  function renderHistory() {
    var wrap = $("kd-history");
    wrap.innerHTML = "";
    if (!state.entries.length) {
      wrap.innerHTML = '<p class="kd-empty">No entries yet — add your first sale above.</p>';
      return;
    }
    var byDay = {};
    state.entries.forEach(function (en) {
      (byDay[en.d] = byDay[en.d] || []).push(en);
    });
    Object.keys(byDay).sort().reverse().forEach(function (key) {
      var g = document.createElement("div");
      g.className = "kd-daygroup";
      var t = totalsFor(key);
      var h = document.createElement("h3");
      h.textContent = prettyDate(key) + " — " + fmt(t.sales) + " sales · " + fmt(t.exp) + " expenses";
      g.appendChild(h);
      byDay[key].slice().reverse().forEach(function (en) {
        var row = document.createElement("div");
        row.className = "kd-entry";
        var cat = document.createElement("span");
        cat.className = "kd-ecat"; cat.textContent = en.cat;
        var note = document.createElement("span");
        note.className = "kd-enote"; note.textContent = en.note || en.type;
        var amt = document.createElement("span");
        amt.className = "kd-eamt";
        amt.style.color = en.type === "sale" ? "#22c55e" : "#f43f5e";
        amt.textContent = (en.type === "sale" ? "+" : "−") + fmt(en.amount);
        var del = document.createElement("button");
        del.className = "kd-edel"; del.textContent = "×"; del.title = "delete";
        del.addEventListener("click", function () {
          state.entries = state.entries.filter(function (x) { return x.id !== en.id; });
          save(); renderAll();
        });
        row.appendChild(cat); row.appendChild(note); row.appendChild(amt); row.appendChild(del);
        g.appendChild(row);
      });
      wrap.appendChild(g);
    });
  }

  function buildReport() {
    var key = todayKey();
    var t = totalsFor(key);
    var lines = [];
    lines.push("Kada Daily Report — " + prettyDate(key));
    lines.push("Sales: " + fmt(t.sales) + " (" + t.count + " entries)");
    lines.push("Expenses: " + fmt(t.exp));
    lines.push("Net: " + fmt(t.sales - t.exp));
    if (state.target) {
      var pct = Math.round((t.sales / state.target) * 100);
      lines.push("Target: " + fmt(state.target) + " — " + pct + "% reached");
    }
    var byCat = {};
    state.entries.forEach(function (en) {
      if (en.d === key && en.type === "sale") byCat[en.cat] = (byCat[en.cat] || 0) + en.amount;
    });
    var parts = Object.keys(byCat).map(function (c) { return c + " " + fmt(byCat[c]); });
    if (parts.length) lines.push("Split: " + parts.join(" · "));
    return lines.join("\n");
  }

  function renderReport() { $("kd-report").textContent = buildReport(); }

  function renderAll() {
    renderSummary(); renderTarget(); renderHistory(); renderReport(); drawChart();
  }

  function addEntry() {
    var amt = parseFloat($("kd-amt").value);
    if (!amt || amt <= 0) { $("kd-amt").focus(); return; }
    state.entries.push({
      id: Date.now() + "" + Math.floor(Math.random() * 1000),
      d: todayKey(),
      ts: Date.now(),
      type: segType,
      amount: Math.round(amt * 100) / 100,
      cat: selCat,
      note: $("kd-note").value.trim(),
    });
    save();
    $("kd-amt").value = ""; $("kd-note").value = "";
    renderAll();
  }

  function downloadCSV() {
    var rows = ["date,type,category,note,amount"];
    state.entries.slice().sort(function (a, b) { return a.ts - b.ts; }).forEach(function (en) {
      var note = (en.note || "").replace(/"/g, '""');
      rows.push(en.d + "," + en.type + "," + en.cat + ',"' + note + '",' + en.amount);
    });
    var blob = new Blob([rows.join("\n")], { type: "text/csv" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "kada-daily-" + todayKey() + ".csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  function copyReport() {
    var txt = buildReport();
    var btn = $("kd-copy");
    function done() {
      btn.textContent = "Copied";
      setTimeout(function () { btn.textContent = "Copy report"; }, 1400);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(done, done);
    } else {
      var ta = document.createElement("textarea");
      ta.value = txt; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta); done();
    }
  }

  // wire up
  $("kd-date").textContent = new Date().toLocaleDateString("en-IN",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  document.querySelectorAll("#kd-seg .kd-segbtn").forEach(function (b) {
    b.addEventListener("click", function () {
      segType = b.getAttribute("data-kdtype");
      document.querySelectorAll("#kd-seg .kd-segbtn").forEach(function (x) {
        x.classList.toggle("kd-active", x === b);
      });
    });
  });
  $("kd-add").addEventListener("click", addEntry);
  $("kd-note").addEventListener("keydown", function (e) { if (e.key === "Enter") addEntry(); });
  $("kd-amt").addEventListener("keydown", function (e) { if (e.key === "Enter") addEntry(); });
  $("kd-targetsave").addEventListener("click", function () {
    state.target = parseFloat($("kd-targetin").value) || 0;
    save(); renderTarget(); renderReport();
  });
  $("kd-copy").addEventListener("click", copyReport);
  $("kd-csv").addEventListener("click", downloadCSV);
  window.addEventListener("resize", drawChart);

  renderChips();
  renderAll();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }
})();
