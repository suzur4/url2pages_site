"use strict";

const CONFIG = {
  // ① ベースURL（「?」より前の部分）
  formUrl: "https://docs.google.com/forms/d/e/1FAIpQLSc8NojGyP9cMU88juhaU47SrYmnBnA_RQhsFnEZH3oKQjez5w/viewform",

  // ② 各項目のID（entry.〇〇〇）
  entries: {
    name: "entry.1155986656", // 氏名・出席番号のID
    prog: "entry.1729230614", // 学習の進捗状況のID
    dns: "entry.2111413716", // DNSクイズ正答数のID
    pkt: "entry.1115474536", // パケットクイズ正答数のID
    rt: "entry.2038888849", // ルーティングクイズ正答数のID
    cap: "entry.1943083979"  // 総合クイズ正答数のID
  }
};

/* ---------- 共通のフォーム送信関数 ---------- */
window.openGoogleForm = function () {
  if (!CONFIG.formUrl || CONFIG.formUrl === "https://docs.google.com/forms/d/e/ここにフォームのIDが入ります/viewform") {
    alert("【先生用エラー】script.js の先頭に GoogleフォームのURLとIDが設定されていません。");
    return;
  }

  // データを集める
  const savedName = Store.get('studentName', '');
  const progText = `DNS:${partPct('dns')}% / PKT:${partPct('pkt')}% / RT:${partPct('rt')}% / 統合:${Store.get("done.integ.explore") ? '済' : '未'} / 総合:${Store.get("done.cap.quiz") ? '済' : '未'}`;
  const scoreDns = Store.get('score.dns', '未受験');
  const scorePkt = Store.get('score.pkt', '未受験');
  const scoreRt = Store.get('score.rt', '未受験');
  const scoreCap = Store.get('score.cap', '未受験');

  // URLにデータをくっつける
  const params = new URLSearchParams();
  if (CONFIG.entries.name) params.append(CONFIG.entries.name, savedName);
  if (CONFIG.entries.prog) params.append(CONFIG.entries.prog, progText);
  if (CONFIG.entries.dns) params.append(CONFIG.entries.dns, scoreDns);
  if (CONFIG.entries.pkt) params.append(CONFIG.entries.pkt, scorePkt);
  if (CONFIG.entries.rt) params.append(CONFIG.entries.rt, scoreRt);
  if (CONFIG.entries.cap) params.append(CONFIG.entries.cap, scoreCap);

  // フォームを開く
  window.open(CONFIG.formUrl + "?" + params.toString(), "_blank", "noopener");
};


/* ---------- テーマ・文字サイズ切替 ---------- */
(function () {
  const $ = id => document.getElementById(id);
  const themeBtn = $("themeBtn"), themeIcon = $("themeIcon"), themeLab = $("themeLab");
  const fontBtn = $("fontBtn"), fontLab = $("fontLab");
  function readTheme() { return document.documentElement.getAttribute("data-theme") || "light"; }
  function updThemeUI() {
    const dark = readTheme() === "dark";
    themeIcon.textContent = dark ? "🌙" : "☀";
    themeLab.textContent = dark ? "ダーク" : "ライト";
    themeBtn.setAttribute("aria-pressed", String(dark));
  }
  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("u2p_theme", t); } catch (e) { }
    updThemeUI();
  }
  themeBtn.onclick = () => setTheme(readTheme() === "dark" ? "light" : "dark");
  function isLg() { return document.documentElement.classList.contains("fs-lg"); }
  function updFontUI() { fontLab.textContent = isLg() ? "大" : "標準"; fontBtn.setAttribute("aria-pressed", String(isLg())); }
  function setFont(lg) {
    document.documentElement.classList.toggle("fs-lg", lg);
    try { localStorage.setItem("u2p_fs", lg ? "lg" : "std"); } catch (e) { }
    updFontUI();
  }
  fontBtn.onclick = () => setFont(!isLg());
  updThemeUI(); updFontUI();
})();

/* ---------- 安全なローカル保存（ブロックされても落ちない） ---------- */
const Store = (() => {
  const KEY = "url2page_v1";
  let mem = {};
  function load() { try { mem = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { mem = {}; } return mem; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { } }
  function get(path, def) { return path.split(".").reduce((o, k) => (o && o[k] != null) ? o[k] : undefined, mem) ?? def; }
  function set(path, val) {
    const ks = path.split("."); let o = mem;
    for (let i = 0; i < ks.length - 1; i++) { o[ks[i]] = o[ks[i]] || {}; o = o[ks[i]]; }
    o[ks[ks.length - 1]] = val; save();
  }
  load(); return { get, set, clear: () => { mem = {}; save(); } };
})();

const PARTS = ["dns", "pkt", "rt"];

/* ---------- ルーティング（ハッシュ） ---------- */
const VIEW = { home: "view-home", dns: "view-dns", pkt: "view-pkt", rt: "view-rt", integ: "view-integ", live: "view-live", ref: "view-ref" };
function go(name) { location.hash = name; }
function showView(name) {
  if (!VIEW[name]) name = "home";
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(VIEW[name]).classList.add("active");
  window.scrollTo(0, 0);
  refreshProgress();
}
window.addEventListener("hashchange", () => showView(location.hash.replace("#", "")));

function jump(part, sub) {
  const el = document.getElementById(part + "-" + sub);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  document.querySelectorAll('.steptabs[data-for="' + part + '"] .steptab').forEach((t, i) => {
    t.classList.toggle("cur", ["exp", "quiz", "prep"][i] === sub);
  });
}

/* ---------- 進捗 ---------- */
function markDone(part, kind) { Store.set("done." + part + "." + kind, true); refreshProgress(); }
function partPct(part) {
  const d = Store.get("done." + part, {}) || {};
  return Math.round(["explore", "quiz", "prep"].filter(k => d[k]).length / 3 * 100);
}
function refreshProgress() {
  PARTS.forEach(p => {
    const pct = partPct(p);
    const bar = document.getElementById("bar-" + p); if (bar) bar.style.width = pct + "%";
    const dot = document.querySelector('.dot[data-k="' + p + '"]');
    if (dot) { dot.classList.toggle("done", pct === 100); dot.classList.toggle("on", pct > 0 && pct < 100); }
  });
}

/* ---------- クイズ部品 ---------- */
function renderQuiz(boxId, part, data) {
  const box = document.getElementById(boxId); if (!box) return;
  box.innerHTML = "";
  let answered = 0, correct = 0;
  data.forEach((q, qi) => {
    const wrap = document.createElement("div"); wrap.className = "q";
    const t = document.createElement("div"); t.className = "q-t"; t.textContent = (qi + 1) + ". " + q.q; wrap.appendChild(t);
    const opts = document.createElement("div"); opts.className = "opts";
    q.choices.forEach((c, ci) => {
      const b = document.createElement("button"); b.className = "opt"; b.type = "button";
      b.innerHTML = '<span class="mk">' + String.fromCharCode(65 + ci) + '</span><span>' + c + '</span>';
      b.onclick = () => {
        if (wrap.dataset.done) return;
        wrap.dataset.done = "1"; answered++;
        const isRight = ci === q.answer; if (isRight) correct++;
        opts.querySelectorAll(".opt").forEach((o, oi) => {
          o.classList.add("locked");
          const mk = o.querySelector(".mk");
          if (oi === q.answer) { o.classList.add("correct"); mk.textContent = "✓"; }
          if (oi === ci && !isRight) { o.classList.add("wrong"); mk.textContent = "✕"; }
        });
        exp.classList.add("show");
        if (answered === data.length) {
          score.textContent = "結果： " + correct + " / " + data.length + " 正解"; markDone(part, "quiz");
          Store.set("score." + part, correct + "/" + data.length);
        }
      };
      opts.appendChild(b);
    });
    wrap.appendChild(opts);
    const exp = document.createElement("div"); exp.className = "exp"; exp.textContent = "💡 " + q.exp; wrap.appendChild(exp);
    box.appendChild(wrap);
  });
  const score = document.createElement("div"); score.className = "score"; box.appendChild(score);
}

/* ---------- 説明準備部品 ---------- */
function renderPrep(boxId, part, fields) {
  const box = document.getElementById(boxId); if (!box) return;
  box.innerHTML = "";
  const saved = document.createElement("div"); saved.className = "saved"; saved.textContent = "✓ この端末に保存しました";
  function checkDone() {
    if (fields.every((f, i) => (Store.get("prep." + part + "." + i, "") || "").trim().length > 0)) markDone(part, "prep");
  }
  fields.forEach((f, i) => {
    const w = document.createElement("div"); w.className = "field";
    const id = part + "-prep-" + i;
    const lab = document.createElement("label"); lab.setAttribute("for", id);
    lab.innerHTML = f.label + (f.ex ? (' <span class="ex">' + f.ex + '</span>') : "");
    const ta = document.createElement("textarea"); ta.id = id; ta.rows = f.rows || 2; ta.placeholder = f.ph || "";
    ta.value = Store.get("prep." + part + "." + i, "") || "";
    let t = null;
    ta.addEventListener("input", () => {
      Store.set("prep." + part + "." + i, ta.value);
      saved.classList.add("on"); clearTimeout(t); t = setTimeout(() => saved.classList.remove("on"), 1200);
      checkDone();
    });
    w.appendChild(lab); w.appendChild(ta); box.appendChild(w);
  });
  box.appendChild(saved);

  const row = document.createElement("div"); row.className = "btnrow";
  const copy = document.createElement("button"); copy.className = "btn line sm"; copy.type = "button"; copy.textContent = "入力をコピー";
  copy.onclick = async () => {
    const txt = fields.map((f, i) => "■" + f.label.replace(/<[^>]+>/g, "") + "\n" + (Store.get("prep." + part + "." + i, "") || "")).join("\n\n");
    try { await navigator.clipboard.writeText(txt); copy.textContent = "コピーしました ✓"; }
    catch (e) { copy.textContent = "長押しでコピーしてください"; }
    setTimeout(() => copy.textContent = "入力をコピー", 1500);
  };

  const submit = document.createElement("button");
  submit.className = "btn"; submit.type = "button";
  submit.textContent = "学習状況を先生に送信（Googleフォーム）";
  submit.onclick = window.openGoogleForm;

  row.appendChild(submit); row.appendChild(copy); box.appendChild(row);
  const tip = document.createElement("div"); tip.className = "formnote";
  tip.innerHTML = "「入力をコピー」してからフォームを開き、<b>「7. 担当パートの説明メモや感想」</b>の欄に貼り付けて提出してください。<br><span style='color:var(--alert-ink); font-weight:bold;'>※教科書の記述を軸にして、体験や自分で調べた具体例を加え、クラスメイトが納得できる「自分の言葉」に翻訳して書いてね！</span>";
  box.appendChild(tip);
}

/* ====================== DNS 体験 ====================== */
(function () {
  const steps = [
    { node: "dns-root", say: "say-root", a: "「.com」担当のサーバーへどうぞ" },
    { node: "dns-tld", say: "say-tld", a: "「example.com」担当のサーバーへどうぞ" },
    { node: "dns-auth", say: "say-auth", a: "93.184.216.34 です！" }
  ];
  let i = -1;
  const $ = id => document.getElementById(id);
  const token = () => $("dns-token"), flash = $("dns-flash"), nextBtn = $("dns-next"), goBtn = $("dns-go");
  function placeTokenAt(el) {
    const stage = el.closest(".stage").getBoundingClientRect(), r = el.getBoundingClientRect(), tk = token();
    tk.style.display = "grid"; tk.textContent = "?";
    tk.style.left = (r.left - stage.left + r.width / 2 - 15) + "px";
    tk.style.top = (r.top - stage.top + r.height / 2 - 15) + "px";
  }
  function reset() {
    i = -1;
    ["dns-root", "dns-tld", "dns-auth"].forEach(id => $(id).classList.remove("active"));
    ["say-root", "say-tld", "say-auth"].forEach(id => $(id).innerHTML = "");
    $("dns-result").innerHTML = ""; token().style.display = "none";
    flash.className = "flash info show"; flash.textContent = "まず「アクセス開始」を押してみよう。";
    goBtn.disabled = false; nextBtn.disabled = true; nextBtn.textContent = "次へ ▶";
  }
  function start() {
    reset(); flash.textContent = "PCは、example.com の住所（IP）を知りません。順番に聞きにいきます。";
    placeTokenAt($("dns-pc")); goBtn.disabled = true; nextBtn.disabled = false;
  }
  function next() {
    i++; if (i >= steps.length) { finish(); return; }
    const s = steps[i];
    ["dns-root", "dns-tld", "dns-auth"].forEach(id => $(id).classList.remove("active"));
    $(s.node).classList.add("active");
    placeTokenAt($(s.node));
    $(s.say).innerHTML = '<span class="bubble">' + s.a + '</span>';
    flash.className = "flash info show";
    flash.textContent = (i === 0 ? "① まずルートサーバーに質問。" : (i === 1 ? "② 次に .com を担当するサーバーへ。" : "③ 最後に example.com を担当するサーバーが答えを返す！"));
    if (i === steps.length - 1) nextBtn.textContent = "完了 ✓";
  }
  function finish() {
    token().style.display = "none"; nextBtn.disabled = true; nextBtn.textContent = "次へ ▶";
    $("dns-result").innerHTML =
      '<div class="ip-final">93.184.216.34</div>' +
      '<div class="browser"><div class="bar"><span style="color:var(--ok)">●</span><span class="u">https://example.com</span></div>' +
      '<div class="pg"><div class="skl"></div><div class="skl"></div><div class="skl s"></div></div></div>';
    flash.className = "flash ok show";
    flash.textContent = "名前→番号の変換ができた！ この住所を使って、いよいよデータを取りにいきます。";
    markDone("dns", "explore");
  }
  $("dns-go").onclick = start; $("dns-next").onclick = next; $("dns-reset2").onclick = reset; reset();
})();

/* ====================== パケット 体験 ====================== */
(function () {
  const ARRIVE = [3, 1, 4, 2, 5];
  const $ = id => document.getElementById(id);
  const area = $("pkt-area"), flash = $("pkt-flash"), stagelabel = $("pkt-stagelabel");
  const bSplit = $("pkt-split"), bSend = $("pkt-send"), bLost = $("pkt-lost");
  let order = [], sel = -1, lostDone = false;

  function drawPackets(arr, opts) {
    opts = opts || {}; const row = $("pktrow"); row.innerHTML = "";
    arr.forEach((num, idx) => {
      const d = document.createElement("div"); d.className = "pkt"; d.dataset.idx = idx;
      d.innerHTML = '<small>No.</small>' + num;
      if (opts.lostNum === num) d.classList.add("lost");
      if (sel === idx) d.classList.add("sel");
      d.onclick = () => onTap(idx);
      row.appendChild(d);
    });
  }
  function reset() {
    order = []; sel = -1; lostDone = false;
    area.innerHTML = '<div class="pkt-flow"><div></div><div class="bigdata" id="bigdata">大きなデータ</div><div></div></div>';
    $("pkt-struct").style.display = "none";
    flash.className = "flash info"; flash.classList.remove("show");
    stagelabel.textContent = "大きなデータを送ります";
    bSplit.disabled = false; bSend.disabled = true; bSend.textContent = "② 送信する";
    bLost.disabled = true; bLost.textContent = "1個ロスを試す"; bLost.onclick = lost;
  }
  function split() {
    $("bigdata").style.transform = "scale(.6)";
    setTimeout(() => {
      area.innerHTML = '<div class="pktrow" id="pktrow"></div>';
      drawPackets([1, 2, 3, 4, 5]);
      stagelabel.textContent = "5つのパケットに分割";
      flash.className = "flash info show"; flash.textContent = "大きなデータを5つのパケットに分けました。それぞれに「番号」が付いています。";
      bSplit.disabled = true; bSend.disabled = false;
    }, 220);
  }
  function send() {
    order = ARRIVE.slice(); drawPackets(order);
    stagelabel.textContent = "受信先に到着（順番がバラバラ！）";
    flash.className = "flash bad show";
    flash.textContent = "別々の道を通るので、到着順はバラバラ（" + ARRIVE.join(", ") + "）。カードをタップして 1→5 の順に並べ替えよう。";
    bSend.disabled = true; bLost.disabled = false;
  }
  function onTap(idx) {
    if (order.length === 0) return;
    if (sel === -1) { sel = idx; drawPackets(order, { lostNum: lostDone ? 3 : undefined }); return; }
    if (sel === idx) { sel = -1; drawPackets(order, { lostNum: lostDone ? 3 : undefined }); return; }
    const tmp = order[sel]; order[sel] = order[idx]; order[idx] = tmp; sel = -1;
    drawPackets(order, { lostNum: lostDone ? 3 : undefined }); checkSorted();
  }
  function checkSorted() {
    if (order.every((n, i) => n === i + 1)) {
      document.querySelectorAll("#pktrow .pkt").forEach(p => p.classList.add("good"));
      stagelabel.textContent = "番号順に整列 → 元のデータに復元！";
      flash.className = "flash ok show"; flash.textContent = "番号順に並べ替え完了！ これで元のデータに組み立て直せました。";
      markDone("pkt", "explore");
    }
  }
  function lost() {
    if (order.length === 0) { flash.className = "flash info show"; flash.textContent = "先に「分割」→「送信」をしてね。"; return; }
    lostDone = true; drawPackets(order, { lostNum: 3 });
    stagelabel.textContent = "3番が届かない！";
    flash.className = "flash bad show"; flash.textContent = "パケット3が途中で失われました。困らない理由は…？ もう一度押すと「再送」します。";
    bLost.textContent = "3番を再送する"; bLost.onclick = resend;
  }
  function resend() {
    lostDone = false; drawPackets(order);
    stagelabel.textContent = "3番だけ再送 → そろった！";
    flash.className = "flash ok show"; flash.textContent = "足りない番号だけ、もう一度送ってもらえばOK。全部が失敗にはなりません（これが再送）。";
    bLost.textContent = "1個ロスを試す"; bLost.onclick = lost; bLost.disabled = true;
    markDone("pkt", "explore");
  }
  $("pkt-split").onclick = split; $("pkt-send").onclick = send; $("pkt-lost").onclick = lost; $("pkt-reset2").onclick = reset;
  $("pkt-struct-btn").onclick = () => {
    const s = $("pkt-struct"); const show = s.style.display === "none";
    s.style.display = show ? "grid" : "none";
    $("pkt-struct-btn").textContent = show ? "中身を隠す" : "パケットの中身を見る";
  };
  reset();
})();

/* ====================== ルーティング 体験 ====================== */
(function () {
  const N = {
    S: { x: 48, y: 180, t: "S", k: "start" }, A: { x: 170, y: 78, t: "A", k: "router" }, B: { x: 170, y: 282, t: "B", k: "router" },
    C: { x: 320, y: 120, t: "C", k: "router" }, D: { x: 320, y: 250, t: "D", k: "router" },
    E: { x: 480, y: 78, t: "E", k: "router" }, F: { x: 480, y: 282, t: "F", k: "router" }, G: { x: 600, y: 180, t: "G", k: "goal" }
  };
  const ED = [["S", "A"], ["S", "B"], ["A", "C"], ["B", "C"], ["B", "D"], ["C", "D"], ["C", "E"], ["D", "F"], ["E", "G"], ["F", "G"], ["E", "F"]];
  const adj = {}; Object.keys(N).forEach(k => adj[k] = []);
  ED.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
  const svg = document.getElementById("mesh"), flash = document.getElementById("rt-flash"), SVGNS = "http://www.w3.org/2000/svg";
  let path = ["S"], broken = null;
  function el(tag, attrs) { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function build() {
    svg.innerHTML = "";
    ED.forEach(([a, b]) => { const ln = el("line", { x1: N[a].x, y1: N[a].y, x2: N[b].x, y2: N[b].y, class: "edge" }); ln.dataset.a = a; ln.dataset.b = b; svg.appendChild(ln); });
    Object.keys(N).forEach(k => {
      const n = N[k]; const g = el("g", { class: "nd " + n.k, tabindex: "0", role: "button", "aria-label": n.t }); g.dataset.k = k;
      let body = (n.k !== "router") ? el("circle", { cx: n.x, cy: n.y, r: 22, class: "body" }) : el("rect", { x: n.x - 22, y: n.y - 16, width: 44, height: 32, rx: 9, class: "body" });
      g.appendChild(body);
      const lab = el("text", { x: n.x, y: n.y + 5, class: "lab" }); lab.textContent = n.t; g.appendChild(lab);
      g.addEventListener("click", () => onNode(k));
      g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onNode(k); } });
      svg.appendChild(g);
    });
    redraw();
  }
  const nodeEl = k => svg.querySelector('.nd[data-k="' + k + '"]');
  function redraw() {
    svg.querySelectorAll(".nd").forEach(g => g.classList.remove("on", "reachable", "broken"));
    svg.querySelectorAll(".edge").forEach(e => e.classList.remove("used", "dim"));
    if (broken) nodeEl(broken).classList.add("broken");
    path.forEach(k => nodeEl(k).classList.add("on"));
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      const e = [...svg.querySelectorAll(".edge")].find(x => (x.dataset.a === a && x.dataset.b === b) || (x.dataset.a === b && x.dataset.b === a));
      if (e) e.classList.add("used");
    }
    const last = path[path.length - 1];
    if (last !== "G") { adj[last].forEach(nb => { if (!path.includes(nb) && nb !== broken) nodeEl(nb).classList.add("reachable"); }); }
    if (broken) { svg.querySelectorAll(".edge").forEach(e => { if (e.dataset.a === broken || e.dataset.b === broken) e.classList.add("dim"); }); }
  }
  function onNode(k) {
    const last = path[path.length - 1];
    if (last === "G") { flash.className = "flash ok show"; flash.textContent = "もう到着しています。「やり直す」で別の道も試せます。"; return; }
    if (k === broken) { flash.className = "flash bad show"; flash.textContent = k + " は故障中です。別の道を探しましょう。"; return; }
    if (!adj[last].includes(k)) { flash.className = "flash info show"; flash.textContent = "点線で光っている「隣のルーター」だけを選べます。"; return; }
    if (path.includes(k)) { flash.className = "flash info show"; flash.textContent = "そこはもう通りました。"; return; }
    path.push(k); redraw();
    if (k === "G") { flash.className = "flash ok show"; flash.textContent = "到着！ 経路： " + path.join(" → ") + "（ホップ数 " + (path.length - 1) + "）。 各ルーターが「次の中継先」を選んでリレーした結果です。"; markDone("rt", "explore"); }
    else { flash.className = "flash info show"; flash.textContent = "現在地： " + path.join(" → ") + "。次の中継先（点線）を選ぼう。"; }
  }
  function undo() { if (path.length > 1) { path.pop(); redraw(); flash.className = "flash info show"; flash.textContent = "1つ戻しました： " + path.join(" → "); } }
  function clearPath() { path = ["S"]; redraw(); flash.className = "flash info show"; flash.textContent = "やり直し。S から道をつなげよう。"; }
  function breakOne() {
    broken = "C";
    if (path.includes("C")) { path = path.slice(0, path.indexOf("C")); if (path.length === 0) path = ["S"]; }
    redraw();
    flash.className = "flash bad show";
    flash.textContent = "ルーター C が故障しました！ でも道は1本ではありません。C を通らない道（例：B → D → F → G）で G まで届けてみよう。";
    document.getElementById("rt-break").textContent = "🔧 故障を直す";
    document.getElementById("rt-break").onclick = fixOne;
  }
  function fixOne() {
    broken = null; redraw();
    flash.className = "flash info show"; flash.textContent = "C を復旧しました。";
    document.getElementById("rt-break").textContent = "🔧 ルーターを1台こわす";
    document.getElementById("rt-break").onclick = breakOne;
  }
  document.getElementById("rt-undo").onclick = undo;
  document.getElementById("rt-clear").onclick = clearPath;
  document.getElementById("rt-break").onclick = breakOne;
  build();
})();

/* ====================== 統合 ====================== */
(function () {
  const steps = [
    { c: "c-user", n: "①", h: "URLを入力", p: "ブラウザに「example.com」と打って Enter。まだ住所（IP）は分かっていません。" },
    { c: "c-dns", n: "②", h: "DNSで 名前→住所 に変換", p: "ルート→TLD（.com）→権威 の順に問い合わせ、93.184.216.34 を入手。" },
    { c: "c-pkt", n: "③", h: "データを梱包（パケット化）", p: "やりとりするデータを小さなパケットに分割。各パケットに宛先IPと番号を付ける。" },
    { c: "c-rt", n: "④", h: "経路選択でリレー", p: "各ルーターが次の中継先を選び、バケツリレーで相手まで運ぶ。1台こわれても回り道。" },
    { c: "c-ok", n: "⑤", h: "応答 → ページ表示", p: "サーバーがページのデータを返し、ブラウザが組み立てて表示。完成！" }
  ];
  const box = document.getElementById("flowsteps"), flash = document.getElementById("integ-flash");
  let shown = 0;
  function render() {
    box.innerHTML = "";
    steps.forEach((s, i) => {
      const d = document.createElement("div"); d.className = "fstep " + s.c + (i < shown ? " on" : "");
      d.innerHTML = '<div class="n">' + s.n + '</div><div><h3>' + s.h + '</h3><p>' + s.p + '</p></div>';
      box.appendChild(d);
    });
  }
  function next() {
    if (shown < steps.length) { shown++; render(); }
    if (shown >= steps.length) {
      flash.className = "flash ok show";
      flash.textContent = "これが「URLを入力してからページが表示されるまで」の全体像。①②③が連携しています。";
      document.getElementById("integ-next").disabled = true; Store.set("done.integ.explore", true);
    }
  }
  document.getElementById("integ-next").onclick = next;
  document.getElementById("integ-reset").onclick = () => { shown = 0; render(); flash.classList.remove("show"); document.getElementById("integ-next").disabled = false; };
  render();
})();

/* ---------- クイズ／説明準備の内容 ---------- */
renderQuiz("dns-quizbox", "dns", [
  { q: "DNS の役割として正しいものは？", choices: ["ドメイン名（名前）を IPアドレス（番号）に変換する", "ページの画像を表示する", "データを小さく分ける", "最短の道を選ぶ"], answer: 0, exp: "DNS は『名前→住所(番号)』の変換係。電話帳で名前から電話番号を調べるのと同じです。" },
  { q: "example.com を調べるとき、PCが最初に問い合わせる相手は？", choices: ["権威サーバー", "TLD（.com）サーバー", "ルートサーバー", "となりの友達のPC"], answer: 2, exp: "まずルートサーバーへ。そこから .com 担当(TLD)→ example.com 担当(権威) と順にたどります。" },
  { q: "もし DNS が止まってしまったら？", choices: ["ページが速く開く", "名前を番号に変換できず、つながらない", "関係ないので問題ない", "画像だけ表示される"], answer: 1, exp: "名前を住所に変換できないと、相手の場所が分からずアクセスできません。" }
]);
renderPrep("dns-prepbox", "dns", [
  { label: "① DNS の役割を3行で", ex: "（名前→住所の変換 を自分の言葉で）", rows: 3, ph: "例）DNSは…" },
  { label: "② キーワードを3つ", ex: "（例：ドメイン名／IPアドレス／問い合わせ）", rows: 2 },
  { label: "③ 想定される質問への答え", ex: "（例：「DNSが止まったら？」）", rows: 2 }
]);

renderQuiz("pkt-quizbox", "pkt", [
  { q: "「パケット」とは？", choices: ["大きなデータを小さく分けた一つ一つ", "通信速度のこと", "サーバーの名前", "画面の明るさ"], answer: 0, exp: "大きなデータは小さなパケットに分けて運び、最後に番号順へ組み立て直します。" },
  { q: "パケットのヘッダに入っていないものは？", choices: ["宛先IPアドレス", "送信元IPアドレス", "パケット番号", "ページの感想"], answer: 3, exp: "ヘッダは宛名や付帯情報（宛先IP・送信元IP・番号など）。感想は入りません。" },
  { q: "1つのパケットが届かなかったら？", choices: ["全部やり直し", "その番号だけ再送してもらう", "あきらめる", "順番が入れ替わる"], answer: 1, exp: "足りない番号だけ送り直せばOK。全体が失敗にはなりません（再送）。" }
]);
renderPrep("pkt-prepbox", "pkt", [
  { label: "① パケットの仕組みを3行で", ex: "（分割→バラバラ運搬→番号順に再結合）", rows: 3 },
  { label: "② キーワードを3つ", ex: "（例：パケット／ヘッダ(宛先IP・番号)／再送）", rows: 2 },
  { label: "③ 想定される質問への答え", ex: "（例：「1つ失われたら？」）", rows: 2 }
]);

renderQuiz("rt-quizbox", "rt", [
  { q: "ルーターの役割は？", choices: ["中継地点で『次の行き先』を選ぶ", "名前を番号に変換する", "データを表示する", "電源を供給する"], answer: 0, exp: "郵便の中継地点のように、次にどこへ渡すかを選んでリレーします。" },
  { q: "ルーティングテーブルとは？", choices: ["料金表", "宛先ごとに『次に渡す相手』を記した表", "住所録の写真", "時刻表"], answer: 1, exp: "宛先 → 次の中継先 を記した『道案内の表』。これを見て転送先を決めます。" },
  { q: "途中のルーターが1台こわれたら？", choices: ["二度とつながらない", "別のルーターを経由してう回できる", "速度が2倍になる", "名前が変わる"], answer: 1, exp: "道は何通りもあるので、別の経路に切り替えて届けられます。" }
]);
renderPrep("rt-prepbox", "rt", [
  { label: "① ルーティングの仕組みを3行で", ex: "（各ルーターが表を見て次を選ぶ→リレー）", rows: 3 },
  { label: "② キーワードを3つ", ex: "（例：ルーター／ルーティングテーブル／う回路）", rows: 2 },
  { label: "③ 想定される質問への答え", ex: "（例：「1台故障したら？」）", rows: 2 }
]);

renderPrep("integ-prepbox", "integ", [
  { label: "①②③が1つにつながる流れを説明", ex: "（URL入力→DNS→パケット→経路→表示）", rows: 4, ph: "例）まず…、次に…、最後に…" }
]);

/* ---------- リセット ---------- */
function resetAll() {
  if (confirm("この端末に保存した入力・進捗・テーマ設定をすべて消去します。よろしいですか？")) {
    Store.clear();
    try { localStorage.removeItem("u2p_theme"); localStorage.removeItem("u2p_fs"); } catch (e) { }
    location.reload();
  }
}

/* ---------- 起動 ---------- */
showView(location.hash.replace("#", "") || "home");
refreshProgress();

/* ===================== 実データ・資料集機能 ===================== */

/* --- 実データ：このページの読み込み実測（Performance API・外部通信なし） --- */
(function () {
  const out = document.getElementById('perf-out'); if (!out) return;
  function measure() {
    const nav = (performance.getEntriesByType && performance.getEntriesByType('navigation')[0]) || null;
    if (!nav) { out.innerHTML = '<span class="gempty">この環境では計測できませんでした。</span>'; return; }
    const seg = [
      ['DNS解決（名前→住所）', nav.domainLookupEnd - nav.domainLookupStart, 'var(--dns)'],
      ['接続（TCP）', (nav.secureConnectionStart > 0 ? nav.secureConnectionStart : nav.connectEnd) - nav.connectStart, 'var(--user)'],
      ['暗号化（TLS）', nav.secureConnectionStart > 0 ? nav.connectEnd - nav.secureConnectionStart : 0, 'var(--server)'],
      ['応答待ち（最初の1バイト）', nav.responseStart - nav.requestStart, 'var(--pkt)'],
      ['受信（ダウンロード）', nav.responseEnd - nav.responseStart, 'var(--rt)']
    ];
    const total = Math.max(1, nav.responseEnd - nav.startTime);
    let html = '';
    seg.forEach(function (s) {
      const ms = Math.max(0, Math.round(s[1]));
      const pct = Math.min(100, Math.round(ms / total * 100));
      html += '<div class="metric"><span class="k">' + s[0] + '</span><span class="track"><i style="width:' + pct + '%;background:' + s[2] + '"></i></span><span class="v">' + ms + ' ms</span></div>';
    });
    html += '<div class="metric" style="margin-top:.5rem"><span class="k">合計（表示まで）</span><span class="track"><i style="width:100%;background:var(--ok)"></i></span><span class="v">' + Math.round(total) + ' ms</span></div>';
    out.innerHTML = html;
  }
  const btn = document.getElementById('perf-btn'); if (btn) btn.onclick = measure;
  measure();
})();

/* --- 実データ：本物のDNSを引く（DNS over HTTPS） --- */
(function () {
  const inp = document.getElementById('dns-input'), out = document.getElementById('dns-out'), btn = document.getElementById('dns-lookup'); if (!btn) return;
  async function lookup() {
    let name = (inp.value || '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!name) { out.textContent = 'ドメインを入力してください（例：example.com）'; return; }
    out.textContent = '問い合わせ中… ' + name;
    try {
      let lines = ['ドメイン: ' + name];
      const types = [['A', 1], ['AAAA', 28]];
      for (const t of types) {
        const r = await fetch('https://dns.google/resolve?name=' + encodeURIComponent(name) + '&type=' + t[0], { headers: { 'accept': 'application/dns-json' } });
        const j = await r.json();
        const ans = (j.Answer || []).filter(function (a) { return a.type === t[1]; });
        if (ans.length) { lines.push(''); lines.push('[' + t[0] + ' レコード]'); ans.forEach(function (a) { lines.push('  ' + a.data + '   (TTL ' + a.TTL + '秒)'); }); }
        else if (t[0] === 'A') { lines.push(''); lines.push('[A レコード] 見つかりませんでした'); }
      }
      lines.push(''); lines.push('※ これは今この瞬間の本物のDNS応答です。');
      out.textContent = lines.join('\n');
    } catch (e) { out.textContent = '取得できませんでした（オフライン、または通信がブロックされている可能性）。'; }
  }
  btn.onclick = lookup;
  inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') lookup(); });
  document.querySelectorAll('[data-dns-ex]').forEach(function (b) { b.onclick = function () { inp.value = b.getAttribute('data-dns-ex'); lookup(); }; });
})();

/* --- 実データ：あなたのIP --- */
(function () {
  const out = document.getElementById('ip-out'), btn = document.getElementById('ip-btn'); if (!btn) return;
  async function getip() {
    out.textContent = '取得中…';
    try {
      const r = await fetch('https://api.ipify.org?format=json'); const j = await r.json();
      out.textContent = 'あなたの（この端末の）グローバルIPアドレス:\n  ' + j.ip + '\n\n※ 表示するだけで、どこにも保存していません。';
    } catch (e) { out.textContent = '取得できませんでした（オフラインの可能性）。'; }
  }
  btn.onclick = getip;
})();

/* --- 実データ：URLを分解する --- */
(function () {
  const inp = document.getElementById('url-input'), out = document.getElementById('url-out'), btn = document.getElementById('url-btn'); if (!btn) return;
  function dissect() {
    let v = (inp.value || '').trim();
    if (!v) { out.innerHTML = '<span class="gempty">URLを入力してください（例：https://example.com:443/news/index.html?id=7#top）</span>'; return; }
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(v)) v = 'https://' + v;
    let u; try { u = new URL(v); } catch (e) { out.innerHTML = '<span class="gempty">URLとして読み取れませんでした。</span>'; return; }
    const parts = [
      ['scheme（やり取りの方法）', u.protocol.replace(':', ''), 'scheme'],
      ['host（相手＝ドメイン名）', u.hostname, 'host'],
      ['port（窓口番号）', u.port || (u.protocol === 'https:' ? '443（既定）' : (u.protocol === 'http:' ? '80（既定）' : '-')), 'port'],
      ['path（場所）', u.pathname || '/', 'path']
    ];
    if (u.search) parts.push(['query（付加情報）', u.search, 'query']);
    if (u.hash) parts.push(['fragment（ページ内の位置）', u.hash, 'hash']);
    out.innerHTML = '<div class="urlparts">' + parts.map(function (p) { return '<span class="uchip ' + p[2] + '"><span class="lab">' + p[0] + '</span>' + (p[1] || '') + '</span>'; }).join('') +
      '</div><div class="warnnote">DNSは <b>host</b> を住所(IP)に変換し、<b>port</b> の窓口へ、<b>path</b> のデータを取りにいきます。</div>';
  }
  btn.onclick = dissect;
  inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') dissect(); });
})();

/* --- 資料集：用語集（検索） --- */
(function () {
  const data = [
    ['DNS', 'ディーエヌエス', 'ドメイン名（名前）をIPアドレス（番号）に変換するしくみ。電話帳のような役割。', 'dns'],
    ['IPアドレス', '', 'ネットワーク上の住所を表す番号。例：93.184.216.34（IPv4）。', 'pkt'],
    ['ドメイン名', '', '人にやさしい名前。例：example.com。', 'dns'],
    ['ルートサーバー', '', 'DNSで最初に問い合わせる最上位のサーバー。', 'dns'],
    ['TLDサーバー', '', '.com や .jp など、トップレベルドメインを担当するDNSサーバー。', 'dns'],
    ['権威サーバー', '', 'そのドメイン（例：example.com）の正式な情報を持つDNSサーバー。', 'dns'],
    ['パケット', '', '大きなデータを小さく分けた一つ一つ。番号と宛名が付く。', 'pkt'],
    ['ヘッダ', '', 'パケットの宛名・付帯情報（宛先IP・送信元IP・番号など）。', 'pkt'],
    ['TTL', 'ティーティーエル', '情報の有効期限。DNS応答やパケットに付き、時間や回数で期限切れになる。', 'dns'],
    ['ルーター', '', '中継地点で「次にどこへ渡すか」を選ぶ機器。', 'rt'],
    ['ルーティングテーブル', '', '宛先ごとに次の中継先を記した「道案内の表」。', 'rt'],
    ['ホップ', '', 'パケットがルーターを1つ越えること。経由数をホップ数という。', 'rt'],
    ['TCP', 'ティーシーピー', 'データを確実に届けるための約束事。順序や再送を管理する。', ''],
    ['UDP', 'ユーディーピー', '速さ優先で、確認をあまりしない通信の約束事。', ''],
    ['ポート番号', '', '同じ住所(IP)の中で、どのサービスかを区別する窓口番号。例：HTTPS=443。', ''],
    ['HTTP', 'エイチティーティーピー', 'Webページをやり取りするための約束事。', ''],
    ['HTTPS / TLS', '', 'HTTPを暗号化して安全にしたもの。鍵マークの正体。', ''],
    ['IPv4 / IPv6', '', 'IPアドレスの方式。数が足りなくなり、より広いIPv6が普及中。', 'pkt'],
    ['DHCP', 'ディーエイチシーピー', '端末に自動でIPアドレスを割り当てるしくみ。', ''],
    ['NAT', 'ナット', '家庭内の私的なIPと、外向きのグローバルIPを変換するしくみ。', ''],
    ['CDN', 'シーディーエヌ', '世界各地にコピーを置き、近い場所から速く配信するしくみ。', 'rt'],
    ['再送', 'さいそう', '届かなかったパケットだけ、もう一度送ってもらうこと。', 'pkt'],
    ['名前解決', 'なまえかいけつ', 'ドメイン名からIPアドレスを求めること（DNSの仕事）。', 'dns'],
    ['回線交換', 'かいせんこうかん', '電話のように、通信が終了するまで回線を占有する方式。', ''],
    ['パケット交換', 'パケットこうかん', 'データをパケットに分け、同じ回線に混在させて流す方式。インターネットの土台。', 'pkt'],
    ['LAN', 'ラン', '学校や会社など、限られた範囲のネットワーク（Local Area Network）。', ''],
    ['WAN', 'ワン', 'LANどうしを広い範囲で結んだネットワーク（Wide Area Network）。', ''],
    ['クライアント', '', 'サーバに対して、データの提供などのサービスを要求するコンピュータ。', ''],
    ['サーバ', '', 'クライアントからの要求に応じて、サービスを提供するコンピュータ。', ''],
    ['SMTP', 'エスエムティーピー', '電子メールを送信・転送するためのプロトコル。', ''],
    ['IMAP', 'アイマップ', 'サーバ上で電子メールを管理・閲覧するためのプロトコル。', ''],
    ['POP', 'ポップ', 'サーバからメールをダウンロードして受信するためのプロトコル。', ''],
    ['ハブ (集線装置)', '', 'LANにつないだ機器どうしを接続する装置。送られてきたデータを全機器に送信する。', ''],
    ['スイッチ (集線装置)', '', 'LANにつないだ機器どうしを接続する装置。宛先を検出し、特定の機器だけにデータを送信する。', ''],
    ['プライベートIPアドレス', '', 'LAN内だけで使われるIPアドレス。アドレス枯渇対策の1つ。', ''],
    ['グローバルIPアドレス', '', 'インターネット上で使われる、世界で重複しないIPアドレス。', ''],
    ['メトリック', '', 'ルーティングで最適な経路を選ぶための判断材料。経由するルータの数（ホップ数）など。', 'rt'],
    ['MACアドレス', 'マックアドレス', '各ネットワーク機器に割り当てられた固有の物理アドレス。', ''],
    ['bps', 'ビーピーエス', '通信速度の単位（bits per second）。1秒間に送れるビット数。', ''],
    ['共通鍵暗号方式', 'きょうつうかぎあんごうほうしき', '暗号化と復号で「同じ鍵」を使う方式。処理は速いが鍵の受け渡しに工夫が必要。', ''],
    ['公開鍵暗号方式', 'こうかいかぎあんごうほうしき', '暗号化には公開した鍵を、復号には自分だけの秘密鍵を使う安全な方式。', ''],
    ['ファイアウォール', '', 'ネットワークの境界で不正なパケットを遮断する防護壁。', ''],
    ['機密性', 'きみつせい', '許可された人だけが情報にアクセスできること（情報漏洩を防ぐ）。', ''],
    ['完全性', 'かんぜんせい', '情報が正確であり、改ざんや破壊されていないこと。', ''],
    ['可用性', 'かようせい', '必要な時にいつでも情報を利用できること（障害や攻撃で止まらない）。', '']
  ];
  const list = document.getElementById('glist'), search = document.getElementById('gsearch'); if (!list) return;
  function render(q) {
    q = (q || '').trim().toLowerCase();
    const items = data.filter(function (d) { return !q || d[0].toLowerCase().indexOf(q) >= 0 || d[1].toLowerCase().indexOf(q) >= 0 || d[2].toLowerCase().indexOf(q) >= 0; });
    if (!items.length) { list.innerHTML = '<div class="gempty">「' + q + '」に一致する用語はありません。</div>'; return; }
    list.innerHTML = items.map(function (d) {
      const see = d[3] ? '<a data-go="' + d[3] + '">→ 体験で見る</a>' : '';
      return '<div class="gitem"><b>' + d[0] + '</b>' + (d[1] ? '<span class="rd">' + d[1] + '</span>' : '') + '<p>' + d[2] + ' ' + see + '</p></div>';
    }).join('');
    list.querySelectorAll('[data-go]').forEach(function (a) { a.onclick = function () { go(a.getAttribute('data-go')); }; });
  }
  render('');
  if (search) search.addEventListener('input', function () { render(search.value); });
})();

/* --- 資料集：ありがちな誤解（タップで答え） --- */
(function () {
  const data = [
    ['DNSがデータ（ページの中身）を運んでいる', 'DNSは「名前→住所」を教えるだけ。実際の中身はパケットがルーターを経由して運びます。'],
    ['IPアドレスとドメイン名は別々の住所だ', '同じ場所を指します。ドメイン名は人間用の名前、IPは機械用の番号で、DNSが対応づけます。'],
    ['パケットは順番どおりに届く', '別々の道を通るため到着順はバラバラ。番号で並べ替えて元に戻します。'],
    ['ルーターが1台壊れたら全部つながらない', '道は何通りもあるので、別のルーターを経由して迂回できます。'],
    ['HTTPS（鍵マーク）なら詐欺サイトではない', 'HTTPSは「通信が暗号化されている」だけ。ドメイン名が本物かは別に確認が必要です。'],
    ['パスワードを複雑にすれば絶対に安全だ', 'パスワード自体が漏れたら防げません。スマホのSMSなどを組み合わせる「多要素認証」が重要です。']
  ];
  const box = document.getElementById('miscards'); if (!box) return;
  box.innerHTML = data.map(function (d) { return '<div class="miscard"><div class="bad">❌ ' + d[0] + '</div><div class="good">✅ ' + d[1] + '</div><div class="tap">タップで答え</div></div>'; }).join('');
  box.querySelectorAll('.miscard').forEach(function (c) { c.onclick = function () { c.classList.toggle('open'); }; });
})();

/* --- 資料集：階層図の関連リンク配線（本体は<details>） --- */
(function () {
  const map = document.getElementById('layermap'); if (!map) return;
  map.querySelectorAll('[data-go]').forEach(function (a) { a.onclick = function (e) { e.preventDefault(); go(a.getAttribute('data-go')); }; });
})();

/* --- 総合クイズ（ランダム出題） --- */
(function () {
  if (!document.getElementById('cap-quizbox')) return;
  const all = [
    { q: 'ドメイン名をIPアドレスに変換するのは？', choices: ['DNS', 'ルーター', 'パケット', 'HTTPS'], answer: 0, exp: 'DNSの仕事です。' },
    { q: 'パケットが「次にどこへ渡すか」を選ぶ機器は？', choices: ['DNSサーバー', 'ルーター', 'モデム', 'ポート'], answer: 1, exp: '各ルーターが中継先を選びます。' },
    { q: '到着順がバラバラなパケットを元に戻す手がかりは？', choices: ['色', 'パケット番号', '重さ', '音'], answer: 1, exp: '番号順に並べ替えます。' },
    { q: 'example.com を調べるとき最初に聞く相手は？', choices: ['権威サーバー', 'TLDサーバー', 'ルートサーバー', '友達のPC'], answer: 2, exp: 'ルート→TLD→権威の順。' },
    { q: '1つのパケットが届かなかったら？', choices: ['全部やり直し', 'その番号だけ再送', 'あきらめる', '順番が変わる'], answer: 1, exp: '足りない番号だけ再送します。' },
    { q: 'HTTPSの鍵マークが示すのは？', choices: ['通信が暗号化されている', 'サイトが安全だと保証', '表示が速い', '広告がない'], answer: 0, exp: '暗号化されている、という意味。本物かは別途確認。' },
    { q: '同じIPの中でサービスを区別する番号は？', choices: ['TTL', 'ポート番号', 'ホップ', 'TLD'], answer: 1, exp: 'ポート番号（例：HTTPS=443）。' },
    { q: '途中のルーターが故障しても届くのはなぜ？', choices: ['道が1本だけ', '別の経路に迂回できる', 'DNSが運ぶ', '速度が上がる'], answer: 1, exp: '経路は複数あるため迂回できます。' },
    { q: '送信が終わるまで回線を占有する通信方式を何という？', choices: ['回線交換方式', 'パケット交換方式', 'ルーティング', 'DHCP'], answer: 0, exp: '電話などが回線交換方式です。インターネットはパケット交換方式です。' },
    { q: '電子メールを「送信」する時によく使われるプロトコルは？', choices: ['HTTP', 'SMTP', 'IMAP', 'POP'], answer: 1, exp: '送信・転送にはSMTPを使います。受信にはIMAPやPOPを使います。' },
    { q: 'LAN内で、宛先を判断して特定の機器「だけ」にデータを送る装置は？', choices: ['ハブ', 'スイッチ', 'モデム', 'クライアント'], answer: 1, exp: 'スイッチは宛先を検出して送るため、全機器に送るハブよりネットワークの負担が減ります。' },
    { q: '1秒間に送れるデータ量を表す単位はどれ？', choices: ['Hz', 'bps', 'Byte', 'MAC'], answer: 1, exp: 'bps（ビット毎秒）が通信速度の単位です。1Byte = 8bit に注意。' },
    { q: '暗号化と復号で「異なる鍵」を使い、安全に通信を始める方式は？', choices: ['共通鍵暗号方式', '公開鍵暗号方式', 'シーザー暗号', '無線LAN'], answer: 1, exp: '誰でも使える公開鍵で暗号化し、自分だけの秘密鍵で復号します。' },
    { q: 'パケットの送信元IPやポート番号を見て、不正な通信を遮断する仕組みは？', choices: ['ファイアウォール', 'スイッチ', 'ハブ', 'DHCP'], answer: 0, exp: 'ネットワークの関所として、ルールに基づきパケットを検査・遮断します。' },
    { q: '情報セキュリティの3要素に含まれないものは？', choices: ['機密性', '完全性', '可用性', '匿名性'], answer: 3, exp: 'セキュリティの基本は CIA（機密性・完全性・可用性）の3つです。' }
  ];
  const arr = all.slice();
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
  renderQuiz('cap-quizbox', 'cap', arr);
})();


/* ===================== 追加機能：名前保存と修了証・フォーム提出 ===================== */
(function () {
  const nameInput = document.getElementById('student-name');
  if (nameInput) {
    nameInput.value = Store.get('studentName', '');
    nameInput.addEventListener('input', () => Store.set('studentName', nameInput.value));
  }

  const originalRefresh = window.refreshProgress || function () { };
  window.refreshProgress = function () {
    originalRefresh();

    const isDnsDone = partPct('dns') === 100;
    const isPktDone = partPct('pkt') === 100;
    const isRtDone = partPct('rt') === 100;
    const isIntegDone = Store.get("done.integ.explore") === true;
    const isCapDone = Store.get("done.cap.quiz") === true;

    const cert = document.getElementById('complete-cert');
    if (cert && isDnsDone && isPktDone && isRtDone && isIntegDone && isCapDone) {
      cert.style.display = 'block';
      const savedName = Store.get('studentName', '');
      document.getElementById('cert-name-display').textContent = savedName ? savedName : "（氏名未入力）";

      // 提出ボタンの生成（すでに無ければ）
      if (!document.getElementById('submit-form-btn')) {
        const btn = document.createElement('button');
        btn.id = 'submit-form-btn';
        btn.className = 'btn primary';
        btn.style.marginTop = '1rem';
        btn.textContent = '最終結果を先生に送信する（Googleフォーム）';

        // ★ 共通のフォーム送信関数を呼び出す
        btn.onclick = window.openGoogleForm;

        cert.querySelector('.cert-inner').appendChild(btn);

        // フォームでの提出案内（AI不使用の念押し）に変更する
        const insText = cert.querySelector('.cert-ins');
        if (insText) {
          insText.style.display = 'block';
          insText.style.color = 'var(--text)';
          insText.style.fontSize = '0.95rem';
          insText.innerHTML = "ボタンを押してフォームを開き、<b>「7. 担当パートの説明メモや感想」</b>の欄に、<br>教科書を軸にして、この教材やネット検索で得た理解を<br><span style='color:var(--alert-ink); font-weight:bold;'>「クラスメイトに教えるつもり」で自分の言葉で</span>まとめて提出してください！";
        }
      }
    }
  };
  setTimeout(window.refreshProgress, 500);
})();

/* ===================== 追加：句読点での強制改行処理 ===================== */
(function () {
  // 指定した要素の中にある「。」の後に改行タグを自動挿入する
  const targets = document.querySelectorAll('p, .desc, .exp, .body, .hint, .gitem p');
  targets.forEach(el => {
    el.innerHTML = el.innerHTML.replace(/。/g, '。<br>');
  });
})();
/* ===================== 追加(2): 公式教材ベースのトピック ===================== */

/* --- 実データ：通信時間の計算（転送時間 = データ量 ÷ 通信速度） --- */
(function(){
  const sz=document.getElementById('tt-size'), szu=document.getElementById('tt-sizeunit'),
        sp=document.getElementById('tt-speed'), spu=document.getElementById('tt-speedunit'),
        out=document.getElementById('tt-out'), btn=document.getElementById('tt-btn');
  if(!btn) return;
  function fmt(sec){
    if(sec<1) return (sec*1000).toFixed(0)+' ミリ秒';
    if(sec<60) return sec.toFixed(sec<10?2:1)+' 秒';
    if(sec<3600) return Math.floor(sec/60)+' 分 '+Math.round(sec%60)+' 秒';
    return (sec/3600).toFixed(2)+' 時間';
  }
  function calc(){
    const sizeMB=parseFloat(sz.value)*parseFloat(szu.value);
    const speedMbps=parseFloat(sp.value)*parseFloat(spu.value);
    if(!(sizeMB>0)||!(speedMbps>0)){ out.textContent='データ量と通信速度に正の数を入れてください。'; return; }
    const bits=sizeMB*1e6*8;     // MB→ビット（1MB=10^6B, 1B=8bit）
    const bps=speedMbps*1e6;     // Mbps→bps
    const sec=bits/bps;
    const sizeLabel = sizeMB>=1000 ? (sizeMB/1000)+' GB' : sizeMB+' MB';
    const speedLabel = speedMbps>=1000 ? (speedMbps/1000)+' Gbps' : speedMbps+' Mbps';
    out.innerHTML='データ量 '+sizeLabel+'（= '+Math.round(bits).toLocaleString()+' ビット）\n'+
      '通信速度 '+speedLabel+'\n\n→ 転送時間の目安： <b style="color:var(--accent-ink)">'+fmt(sec)+'</b>';
  }
  btn.onclick=calc;
  [sz,sp].forEach(function(e){ e.addEventListener('keydown',function(ev){ if(ev.key==='Enter') calc(); }); });
})();

/* --- 資料集：IPアドレスの仕組み（ネットワーク部 / ホスト部・サブネットマスク） --- */
(function(){
  const inp=document.getElementById('ipx'), out=document.getElementById('ipx-out');
  if(!out) return;
  const body=inp.closest('.body');
  function show(prefix){
    const m=(inp.value||'').trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if(!m || m.slice(1).some(function(o){return (+o)>255;})){
      out.innerHTML='<span class="gempty">IPv4アドレスを正しく入れてください（例：192.168.1.10）。</span>'; return;
    }
    const oct=m.slice(1).map(Number);
    const netOctets=prefix/8;                  // 8→1, 16→2, 24→3
    const netAddr=oct.map(function(o,i){ return i<netOctets ? o : 0; }).join('.');
    const hosts=Math.pow(2,32-prefix)-2;
    let chips='<div class="octets">';
    oct.forEach(function(o,i){ chips+='<span class="oct '+(i<netOctets?'net':'host')+'">'+o+'</span>'+(i<3?'<span class="octdot">.</span>':''); });
    chips+='</div>';
    out.innerHTML=chips+
      '<div style="font-size:.82rem"><span style="color:var(--user-ink);font-weight:800">■ ネットワーク部</span> ／ <span style="color:var(--pkt-ink);font-weight:800">■ ホスト部</span></div>'+
      '<div class="out" style="margin-top:.4rem">サブネットマスク: /'+prefix+'\nネットワークアドレス: '+netAddr+'\n使えるホスト数: 約 '+hosts.toLocaleString()+' 台</div>';
  }
  body.querySelectorAll('[data-prefix]').forEach(function(b){
    b.onclick=function(){
      body.querySelectorAll('[data-prefix]').forEach(function(x){ x.className='btn line sm'; });
      b.className='btn primary'; show(+b.getAttribute('data-prefix'));
    };
  });
  inp.addEventListener('keydown',function(e){ if(e.key==='Enter') show(24); });
  show(24);
})();


/* --- 統合：フィッシング発展問いカード（タップで答え） --- */
(function(){ var pc=document.getElementById('phish-card'); if(pc){ pc.addEventListener('click',function(){ pc.classList.toggle('open'); }); } })();
