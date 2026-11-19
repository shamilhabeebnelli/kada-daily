/* Nadan POS — offline shop sales & expense tracker. Data stays in localStorage. */
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
    lines.push("Nadan POS Report — " + prettyDate(key));
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
    a.download = "nadan-pos-" + todayKey() + ".csv";
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


  /* ---------- Quotation (device-local draft, GST-inclusive pricing) ---------- */
  var QKEY = "nadanPosQuoteV1";
  var QNUMKEY = "nadanPosQuoteNumV1";
  var QCATS = ["TV", "Washing Machine", "AC", "Fridge", "Mobile", "Service", "Other"];
  var quote = loadQuote();

  function loadQuote() {
    try {
      var raw = localStorage.getItem(QKEY);
      if (raw) {
        var q = JSON.parse(raw);
        if (q && Array.isArray(q.items) && q.items.length) return q;
      }
    } catch (e) {}
    return { staff: "", staffphone: "", cust: "", custphone: "", gstin: "", addr: "",
             items: [{ cat: "TV", model: "", amt: "" }] };
  }
  function saveQuote() {
    try { localStorage.setItem(QKEY, JSON.stringify(quote)); } catch (e) {}
  }
  function nextQuoteNo() {
    var d = new Date();
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    var day = "" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
    var rec = { day: day, n: 0 };
    try {
      var raw = localStorage.getItem(QNUMKEY);
      if (raw) { var r = JSON.parse(raw); if (r && r.day === day) rec = r; }
    } catch (e) {}
    rec.n += 1;
    try { localStorage.setItem(QNUMKEY, JSON.stringify(rec)); } catch (e) {}
    return "Q-" + day + "-" + rec.n;
  }

  function renderQuoteForm() {
    $("kd-q-staff").value = quote.staff;
    $("kd-q-staffphone").value = quote.staffphone;
    $("kd-q-cust").value = quote.cust;
    $("kd-q-custphone").value = quote.custphone;
    $("kd-q-gstin").value = quote.gstin;
    $("kd-q-addr").value = quote.addr;
    renderQuoteItems();
  }

  function renderQuoteItems() {
    var wrap = $("kd-q-items");
    wrap.innerHTML = "";
    quote.items.forEach(function (it, idx) {
      var row = document.createElement("div");
      row.className = "kd-q-row";

      var head = document.createElement("div");
      head.className = "kd-q-rowhead";
      var lbl = document.createElement("span");
      lbl.textContent = "Item " + (idx + 1);
      head.appendChild(lbl);
      if (quote.items.length > 1) {
        var del = document.createElement("button");
        del.className = "kd-q-del";
        del.type = "button";
        del.textContent = "remove";
        del.addEventListener("click", function () {
          quote.items.splice(idx, 1); saveQuote(); renderQuoteItems();
        });
        head.appendChild(del);
      }
      row.appendChild(head);

      var sel = document.createElement("select");
      QCATS.forEach(function (c) {
        var o = document.createElement("option");
        o.value = c; o.textContent = c;
        sel.appendChild(o);
      });
      sel.value = it.cat;
      sel.addEventListener("change", function () { it.cat = sel.value; saveQuote(); });
      row.appendChild(sel);

      var model = document.createElement("input");
      model.type = "text"; model.maxLength = 60; model.placeholder = "Model";
      model.value = it.model;
      model.addEventListener("input", function () { it.model = model.value; saveQuote(); });
      row.appendChild(model);

      var amt = document.createElement("input");
      amt.type = "number"; amt.min = "0"; amt.step = "0.01"; amt.inputMode = "decimal";
      amt.placeholder = "Amount ₹ (incl. 18% GST)";
      amt.value = it.amt;
      amt.addEventListener("input", function () { it.amt = amt.value; saveQuote(); renderQuoteTotal(); });
      row.appendChild(amt);

      wrap.appendChild(row);
    });
    renderQuoteTotal();
  }

  function pdfFmt(n) { return "Rs " + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 }); }
  function quoteTotals() {
    var total = 0;
    quote.items.forEach(function (it) {
      var a = parseFloat(it.amt);
      if (a > 0) total += a;
    });
    var taxable = total / 1.18;
    return { total: total, gst: total - taxable };
  }

  function renderQuoteTotal() {
    var t = quoteTotals();
    $("kd-q-total").textContent = fmt(t.total);
    $("kd-q-gstpart").textContent = t.total > 0
      ? "Includes 18% GST of " + fmt(t.gst) + " (taxable value " + fmt(t.total - t.gst) + "). No extra GST added on top."
      : "Amounts entered are treated as GST-inclusive; no extra 18% is added.";
  }

  function readQuoteHeader() {
    quote.staff = $("kd-q-staff").value.trim();
    quote.staffphone = $("kd-q-staffphone").value.trim();
    quote.cust = $("kd-q-cust").value.trim();
    quote.custphone = $("kd-q-custphone").value.trim();
    quote.gstin = $("kd-q-gstin").value.trim();
    quote.addr = $("kd-q-addr").value.trim();
    saveQuote();
  }

  function downloadQuotePdf() {
    readQuoteHeader();
    var btn = $("kd-q-pdf");
    var validItems = quote.items.filter(function (it) { return parseFloat(it.amt) > 0; });
    if (!quote.staff) { btn.textContent = "Enter staff name first"; setTimeout(function () { btn.textContent = "Download quotation PDF"; }, 1600); return; }
    if (!validItems.length) { btn.textContent = "Add an item amount first"; setTimeout(function () { btn.textContent = "Download quotation PDF"; }, 1600); return; }
    if (!window.pdfMake || !window.pdfMake.createPdf) {
      btn.textContent = "PDF needs internet once — reload online";
      setTimeout(function () { btn.textContent = "Download quotation PDF"; }, 1800);
      return;
    }
    var t = quoteTotals();
    var qno = nextQuoteNo();
    var today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

    var body = [[
      { text: "#", style: "th" }, { text: "Product", style: "th" },
      { text: "Model", style: "th" }, { text: "Amount (incl. GST)", style: "th", alignment: "right" }
    ]];
    validItems.forEach(function (it, i) {
      body.push([
        String(i + 1), it.cat, it.model || "—",
        { text: fmt(parseFloat(it.amt)), alignment: "right" }
      ]);
    });
    body.push([
      { text: "", border: [false, false, false, false] },
      { text: "", border: [false, false, false, false] },
      { text: "Total (incl. 18% GST)", style: "totallbl" },
      { text: fmt(t.total), style: "totalval", alignment: "right" }
    ]);

    var toBlock = [{ text: "Quotation for", style: "blkhead" }];
    toBlock.push({ text: quote.cust || "Customer", bold: true });
    if (quote.custphone) toBlock.push("Phone: " + quote.custphone);
    if (quote.addr) toBlock.push(quote.addr);
    if (quote.gstin) toBlock.push("GSTIN: " + quote.gstin);

    var fromBlock = [{ text: "Prepared by", style: "blkhead" }];
    fromBlock.push({ text: quote.staff, bold: true });
    if (quote.staffphone) fromBlock.push("Phone: " + quote.staffphone);

    var dd = {
      pageSize: "A4",
      pageMargins: [40, 48, 40, 56],
      content: [
        { columns: [
            { text: "QUOTATION", style: "title" },
            { stack: [
                { text: "No: " + qno, alignment: "right" },
                { text: "Date: " + today, alignment: "right" }
              ], width: "auto" }
          ], margin: [0, 0, 0, 18] },
        { columns: [
            { stack: fromBlock, width: "50%" },
            { stack: toBlock, width: "50%" }
          ], margin: [0, 0, 0, 16] },
        { table: {
            headerRows: 1,
            widths: [22, "*", "*", 110],
            body: body
          }, layout: {
            fillColor: function (row) { return row === 0 ? "#eef2f7" : null; },
            hLineColor: "#cfd8e3", vLineColor: "#cfd8e3"
          }, margin: [0, 0, 0, 12] },
        { text: "All amounts are inclusive of 18% GST. GST component in total: " + fmt(t.gst) + ".", fontSize: 9.5, color: "#444", margin: [0, 0, 0, 4] },
        { text: "This document is a quotation only and not a tax invoice.", fontSize: 9.5, italics: true, color: "#444" }
      ],
      styles: {
        title: { fontSize: 22, bold: true, color: "#0e7490" },
        th: { bold: true, fontSize: 10.5 },
        blkhead: { fontSize: 9, color: "#64748b", margin: [0, 0, 0, 3] },
        totallbl: { bold: true, alignment: "right", margin: [0, 4, 0, 0] },
        totalval: { bold: true, fontSize: 13, margin: [0, 4, 0, 0] }
      },
      defaultStyle: { fontSize: 10.5 }
    };
    window.pdfMake.createPdf(dd).download("quotation-" + qno + ".pdf");
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

  $("kd-q-addrow").addEventListener("click", function () {
    readQuoteHeader();
    quote.items.push({ cat: "TV", model: "", amt: "" });
    saveQuote(); renderQuoteItems();
  });
  ["kd-q-staff", "kd-q-staffphone", "kd-q-cust", "kd-q-custphone", "kd-q-gstin", "kd-q-addr"].forEach(function (id) {
    $(id).addEventListener("input", readQuoteHeader);
  });
  $("kd-q-pdf").addEventListener("click", downloadQuotePdf);
  renderQuoteForm();

  renderChips();
  renderAll();

  /* Tabs: Home / Quotation */
  function kdShowTab(which) {
    $("kd-tabhome").hidden = which !== "home";
    $("kd-tabquote").hidden = which !== "quote";
    $("kd-tabbtn-home").classList.toggle("kd-tabactive", which === "home");
    $("kd-tabbtn-quote").classList.toggle("kd-tabactive", which === "quote");
    try { localStorage.setItem("nadanPosTabV1", which); } catch (e) {}
    window.scrollTo(0, 0);
  }
  if ($("kd-tabbtn-home") && $("kd-tabbtn-quote")) {
    $("kd-tabbtn-home").addEventListener("click", function () { kdShowTab("home"); });
    $("kd-tabbtn-quote").addEventListener("click", function () { kdShowTab("quote"); });
    var kdSavedTab = null;
    try { kdSavedTab = localStorage.getItem("nadanPosTabV1"); } catch (e) {}
    kdShowTab(kdSavedTab === "quote" ? "quote" : "home");
  }

  if ("serviceWorker" in navigator) {
    var kdSwReloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (kdSwReloading) return;
      kdSwReloading = true;
      location.reload();
    });
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }
})();
