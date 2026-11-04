/* Site model: sizing calculator and live 3D model. Built from the partner brief. */

(function(){
  "use strict";
  const $ = id => document.getElementById(id);
  const fmt = (n, d=0) => n.toLocaleString("en-US",{maximumFractionDigits:d,minimumFractionDigits:d});
  const money = n => n >= 1e6 ? "$" + fmt(n/1e6, n >= 1e7 ? 1 : 2) + "M" : "$" + fmt(Math.round(n/1000)) + "k";

  // Source modes. Slider 0-100 maps onto a log scale between lo and hi.
  const MODES = {
    lfg:   {label:"Landfill gas collected", unit:"scfm", lo:500, hi:12000, def:2000, ch4:true, hr:11000, gen:1.6, sizes:[1.6,3.3,4.5], price:2,
            hint:"Standard cubic feet per minute, as reported to your regulator.",
            chips:[["Small landfill",1200,50],["Mid landfill",2500,48],["Large landfill",7000,46]], src:"flare"},
    gas:   {label:"Gas available", unit:"MMcf/d", lo:0.5, hi:40, def:4, ch4:false, hr:9000, gen:2.5, sizes:[2.5,4.5,10,18], price:2.5,
            hint:"Million cubic feet per day at a tap on your plant or gathering line.",
            chips:[["Plant tap",2],["Curtailed gas",5],["Large field",20]], src:"well"},
    plant: {label:"Gas from the existing line", unit:"MMcf/d", lo:2, hi:60, def:5, ch4:false, hr:9000, gen:2.5, sizes:[2.5,4.5,10,18], price:3,
            hint:"Gas taken from the plant's existing supply, for a site beside a working or retired plant.",
            chips:[["First phase",5],["Second phase",12],["Campus",40]], src:"stack"}
  };
  let mode = "gas";
  const st = {flow:2000, ch4:50};
  // Typical price bands used for the payment range; the real price is set in the gas agreement.
  const BANDS = {lfg:[1.5,2.5], gas:[2,3], plant:[2.5,3.5]}, LEASE = [1000,2000];
  const range = (lo, hi) => { const u = hi >= 1e6 ? 1e6 : 1e3, d = u === 1e6 ? 1 : 0, s = u === 1e6 ? "M" : "k";
    return "$" + fmt(lo/u, d) + "&ndash;" + fmt(hi/u, d) + s; };

  const toSlider = (v,m) => 100*Math.log(v/m.lo)/Math.log(m.hi/m.lo);
  const fromSlider = (s,m) => m.lo*Math.pow(m.hi/m.lo, s/100);
  const roundFlow = (v,m) => m.unit==="scfm" ? Math.round(v/50)*50 : (v<10 ? Math.round(v*4)/4 : Math.round(v));

  function calc(){
    const m = MODES[mode];
    let btuh; // Btu per hour of fuel
    if (m.unit === "scfm") btuh = st.flow * (st.ch4/100) * 1012 * 60;
    else btuh = st.flow * 1e6 * 1037 / 24; // MMcf/d -> scf/h * Btu/scf
    const mw = btuh / m.hr / 1000;         // kW -> MW
    // Bigger sites use bigger engines, not more of them: the smallest unit that keeps eight or fewer running.
    const genMW = m.sizes.find(u => mw / u <= 8) || m.sizes[m.sizes.length - 1];
    const run = Math.max(1, Math.ceil(mw / genMW));
    const gens = run + 1;
    const it = mw / 1.2;
    const racks = Math.floor(it * 1000 / 120);
    const halls = Math.max(1, Math.ceil(it / 0.96));
    const acres = 5 + 1.2 * mw;
    const mmbtu = btuh * 8760 * 0.95 / 1e6;
    const b = BANDS[mode];
    const payLo = mmbtu * b[0] + acres * LEASE[0], payHi = mmbtu * b[1] + acres * LEASE[1];
    return {mw, gens, run, genMW, it, racks, gpus:racks*72, halls, acres, mmbtu, payLo, payHi, pay:(payLo+payHi)/2};
  }

  // Smoothly animated numbers
  const shown = {};
  function tween(id, target, render){
    const el = $(id); if(!el) return;
    const from = shown[id] ?? 0; shown[id] = target;
    const t0 = performance.now(), dur = 520;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    function step(t){
      const k = reduce ? 1 : Math.min(1,(t-t0)/dur), e = 1-Math.pow(1-k,3);
      el.innerHTML = render(from + (target-from)*e);
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  let R = calc();
  function update(){
    const m = MODES[mode];
    R = calc();
    $("flow-out").textContent = $("hflow-out").textContent = (m.unit==="scfm" ? fmt(st.flow) : fmt(st.flow, st.flow<10?2:0)) + " " + m.unit;
    $("hflow").value = $("flow").value;
    $("ch4-out").textContent = st.ch4 + "%";
    const mwd = R.mw < 10 ? 1 : 0;
    tween("hs-mw", R.mw, v => fmt(v, mwd));
    tween("hs-racks", R.racks, v => fmt(Math.round(v)));
    const k = R.payHi / R.payLo;
    tween("hs-pay", R.payLo, v => range(v, v*k));
    tween("r-pay", R.payLo, v => range(v, v*k));
    tween("r-ten", R.payLo*10, v => range(v, v*k));
    tween("r-mw", R.mw, v => fmt(v,1) + "<small>MW</small>");
    tween("r-gens", R.gens, v => fmt(Math.round(v)));
    $("r-gens-d").textContent = R.run + " running at " + R.genMW + " MW, plus one spare";
    tween("r-it", R.it, v => fmt(v,1) + "<small>MW</small>");
    tween("r-racks", R.racks, v => fmt(Math.round(v)));
    tween("r-gpus", R.gpus, v => fmt(Math.round(v)));
    tween("r-halls", R.halls, v => fmt(Math.round(v)));
    tween("r-acres", R.acres, v => fmt(Math.round(v)) + "<small>acres</small>");
    tween("r-mmbtu", R.mmbtu/1000, v => fmt(Math.round(v)) + "<small>k MMBtu/yr</small>");
    const p = (el) => el.style.setProperty("--p", ((el.value-el.min)/(el.max-el.min)*100) + "%");
    ["flow","hflow","ch4"].forEach(id => p($(id)));
    scene.target = R;
  }

  function setMode(k, keepFlow){
    mode = k; const m = MODES[k];
    ["lfg","gas","plant"].forEach(x => $("src-"+x).setAttribute("aria-pressed", String(x===k)));
    $("flow-label").textContent = $("hflow-label").textContent = m.label;
    $("flow-hint").textContent = m.hint;
    $("f-ch4").hidden = !m.ch4;
    if(!keepFlow){ st.flow = m.def; }
    $("flow").value = toSlider(st.flow, m);
    const chips = $("chips"); chips.innerHTML = "";
    m.chips.forEach(c => {
      const b = document.createElement("button"); b.type="button"; b.className="chip";
      b.textContent = c[0] + " · " + (m.unit==="scfm" ? fmt(c[1]) : c[1]) + " " + m.unit;
      b.addEventListener("click", () => { st.flow = c[1]; if(c[2]) { st.ch4 = c[2]; $("ch4").value = c[2]; } $("flow").value = toSlider(st.flow,m); update(); });
      chips.appendChild(b);
    });
    scene.src = m.src;
    update();
  }

  ["flow","hflow"].forEach(id => $(id).addEventListener("input", e => { const m = MODES[mode]; $("flow").value = e.target.value; st.flow = roundFlow(fromSlider(+e.target.value, m), m); update(); }));
  $("ch4").addEventListener("input", e => { st.ch4 = +e.target.value; update(); });
  ["lfg","gas","plant"].forEach(k => $("src-"+k).addEventListener("click", () => setMode(k)));

  /* ---------- Isometric site model ---------- */
  const cv = $("iso"), ctx = cv.getContext("2d");
  const scene = {src:"flare", target:null, shown:{gens:0, halls:0, fence:0}, t:0};
  window.__accScene = scene;
  let W=0, H=0, DPR=1;
  function resize(){
    const r = cv.getBoundingClientRect(); DPR = Math.min(2, window.devicePixelRatio||1);
    W = r.width; H = r.height; cv.width = Math.round(W*DPR); cv.height = Math.round(H*DPR);
  }
  new ResizeObserver(resize).observe(cv); resize();
  const css = n => getComputedStyle(document.getElementById("sizer")).getPropertyValue(n).trim();

  const C30 = Math.cos(Math.PI/6), S30 = 0.5;
  let S = 10, OX = 0, OY = 0;
  const P = (x,y,z=0) => [OX + (x - y)*C30*S, OY + (x + y)*S30*S - z*S];

  function poly(pts, fill, stroke, lw=1){
    ctx.beginPath(); pts.forEach((p,i)=> i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])); ctx.closePath();
    if(fill){ ctx.fillStyle = fill; ctx.fill(); }
    if(stroke){ ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  }
  // Box with base at (x,y), size (w,d), height h. Faces shaded with alpha of the ink color.
  function box(x,y,w,d,h,c,glow){
    const top=[P(x,y,h),P(x+w,y,h),P(x+w,y+d,h),P(x,y+d,h)];
    const left=[P(x,y+d,0),P(x+w,y+d,0),P(x+w,y+d,h),P(x,y+d,h)];
    const right=[P(x+w,y,0),P(x+w,y+d,0),P(x+w,y+d,h),P(x+w,y,h)];
    const bg = css("--bg") || "#000";
    poly(left, bg, null, 1); poly(right, bg, null, 1); poly(top, bg, null, 1);
    poly(left, c.f1, c.ln, 1); poly(right, c.f2, c.ln, 1); poly(top, c.f3, c.ln, 1);
    if(glow){ ctx.save(); ctx.shadowColor = c.glow; ctx.shadowBlur = 10*DPR; poly(top, null, c.ln, 1); ctx.restore(); }
  }
  function line(a,b,stroke,lw=1,dash){ ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]); ctx.strokeStyle=stroke; ctx.lineWidth=lw; ctx.setLineDash(dash||[]); ctx.stroke(); ctx.setLineDash([]); }

  function layout(nG, nH, gs){
    // World units: 1 = about 10 m. Source and gas yard on the left, generator block, battery, then hall block.
    const gPer = Math.max(3, Math.min(10, Math.ceil(Math.sqrt(nG*1.5))));
    const hPer = Math.max(2, Math.min(8, Math.ceil(Math.sqrt(nH*1.2))));
    const gCols = Math.ceil(nG/gPer), hCols = Math.ceil(nH/hPer);
    const gw = 1.3*gs, gd = 2.2*gs, gGap = 0.5*gs, hw = 2.6, hd = 4.2, hGap = 0.8;
    const gBlockD = Math.min(nG,gPer)*(gd+gGap) - gGap, hBlockD = Math.min(nH,hPer)*(hd+hGap) - hGap;
    const depth = Math.max(gBlockD, hBlockD, 8) + 2;
    const gx0 = 7.5, gy0 = (depth - gBlockD)/2;
    const bx = gx0 + gCols*(gw+gGap) + 1.4;
    const hx0 = bx + 4.2, hy0 = (depth - hBlockD)/2;
    return {gPer,hPer,gCols,hCols,gw,gd,gGap,hw,hd,hGap,gx0,gy0,bx,hx0,hy0,gBlockD,hBlockD,depth, width: hx0 + hCols*(hw+hGap) + 0.5};
  }

  function draw(){
    scene.t += 1/60;
    if(scene.mode3d){ const R3 = scene.target; if(R3) $("badge").textContent = "Live model · " + fmt(R3.mw, R3.mw<10?1:0) + " MW · " + fmt(Math.round(R3.acres)) + " acres"; requestAnimationFrame(draw); return; }
    const R = scene.target; if(!R || !W){ requestAnimationFrame(draw); return; }
    const sh = scene.shown, ease = 0.12;
    sh.gens += (R.gens - sh.gens)*ease; sh.halls += (R.halls - sh.halls)*ease;
    const nG = Math.max(2, Math.round(Math.min(sh.gens, 80))), nH = Math.max(1, Math.round(Math.min(sh.halls, 64)));
    const L = layout(nG, nH, Math.max(1, Math.cbrt(R.genMW / 2.5)));
    const wx = L.width + 1, wy = L.depth + 1;
    const sx = W / ((wx + wy) * C30 * 0.98), sy = H / ((wx + wy) * S30 * 1.02 + 6.5);
    S += ((Math.min(sx, sy)*DPR) - S) * 0.15;
    OX = (cv.width - (wx - wy)*C30*S)/2;
    OY = (cv.height - (wx + wy)*S30*S)/2 + 2.6*S;
    ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,cv.width,cv.height);

    const ink = css("--fg-strong") || "#f3f4f6", g = css("--glow") || "243,244,246";
    const c = {ln:`rgba(${g},.85)`, f1:`rgba(${g},.10)`, f2:`rgba(${g},.05)`, f3:`rgba(${g},.16)`, glow:`rgba(${g},.9)`};
    const cDim = {ln:`rgba(${g},.5)`, f1:`rgba(${g},.06)`, f2:`rgba(${g},.03)`, f3:`rgba(${g},.08)`, glow:`rgba(${g},.6)`};

    const gx = Math.ceil(wx)+3, gy = Math.ceil(wy)+3;
    for(let i=-2;i<=gx;i++) line(P(i,-2),P(i,gy), `rgba(${g},.06)`, 1);
    for(let j=-2;j<=gy;j++) line(P(-2,j),P(gx,j), `rgba(${g},.06)`, 1);
    poly([P(-0.5,-0.5),P(L.width,-0.5),P(L.width,L.depth),P(-0.5,L.depth)], null, `rgba(${g},.4)`, 1);

    const midY = L.depth/2;
    if(scene.src === "flare"){
      box(1.2,midY-0.7,1.4,1.4,0.5,cDim);
      const b = P(1.9,midY,0.5), tp = P(1.9,midY,5.2);
      line(b,tp,ink,1.4*DPR);
      const fl = 0.6 + 0.25*Math.sin(scene.t*9) + 0.15*Math.sin(scene.t*23);
      ctx.save(); ctx.shadowColor=`rgba(${g},1)`; ctx.shadowBlur=16*DPR;
      ctx.beginPath(); ctx.ellipse(tp[0], tp[1]-fl*S*0.6, S*0.22, S*0.6*fl, 0, 0, Math.PI*2); ctx.fillStyle=`rgba(${g},.85)`; ctx.fill(); ctx.restore();
      for(let i=0;i<9;i++){ const wp = P(0.3 + (i%3)*0.9, 0.8 + Math.floor(i/3)*((L.depth-1.6)/2), 0); ctx.beginPath(); ctx.arc(wp[0],wp[1],1.6*DPR,0,7); ctx.fillStyle=`rgba(${g},.7)`; ctx.fill(); }
    } else if(scene.src === "well"){
      for(let i=0;i<3;i++){ const y = midY-3+i*2.4; box(0.4,y,0.6,0.6,1.6,cDim); line(P(0.7,y+0.3,1.6),P(0.7,y+0.3,2.8),ink,1.2*DPR); }
      box(2,midY-1.8,2,3.6,1.6,c);
    } else {
      box(0.1,midY-3,3.8,6,2.6,cDim);
      line(P(1.1,midY-1.2,2.6),P(1.1,midY-1.2,11),ink,1.6*DPR); line(P(2.7,midY+1.2,2.6),P(2.7,midY+1.2,10),ink,1.6*DPR);
    }
    box(4.6,midY-0.9,1.6,1.8,1.1,c); // gas treatment

    const gens = [], halls = [];
    for(let i=0;i<nG;i++){ const col = Math.floor(i/L.gPer), row = i%L.gPer; gens.push([L.gx0 + col*(L.gw+L.gGap), L.gy0 + row*(L.gd+L.gGap)]); }
    for(let i=0;i<nH;i++){ const col = Math.floor(i/L.hPer), row = i%L.hPer; halls.push([L.hx0 + col*(L.hw+L.hGap), L.hy0 + row*(L.hd+L.hGap)]); }
    const bat = [L.bx, midY-1.5];
    // pipes and cables (animated dashes), drawn under the boxes
    ctx.lineDashOffset = -scene.t*18;
    const pipe = (a,b) => { ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]); ctx.strokeStyle=`rgba(${g},.9)`; ctx.lineWidth=1.3*DPR; ctx.setLineDash([3*DPR,7*DPR]); ctx.stroke(); };
    pipe(P(2.6,midY,0.2), P(4.6,midY,0.2));
    const hdr = L.gx0 - 0.6, bus = L.hx0 - 0.9;
    pipe(P(6.2,midY,0.2), P(hdr,midY,0.2));
    pipe(P(hdr,L.gy0,0.2), P(hdr, L.gy0 + L.gBlockD, 0.2));
    pipe(P(L.gx0 + L.gCols*(L.gw+L.gGap) - L.gGap, midY, 0.2), P(L.bx, midY, 0.2));
    pipe(P(L.bx+2.4, midY, 0.2), P(bus, midY, 0.2));
    pipe(P(bus, L.hy0, 0.2), P(bus, L.hy0 + L.hBlockD, 0.2));
    ctx.setLineDash([]); ctx.lineDashOffset = 0;

    // draw boxes back to front by (x+y)
    const items = [];
    gens.forEach((p,i)=> items.push({x:p[0],y:p[1],w:L.gw,d:L.gd,h:1.1*L.gw/1.3,c: i===nG-1 ? cDim : c, k:"g"}));
    items.push({x:bat[0],y:bat[1],w:2.4,d:3,h:1.6,c,k:"b"});
    halls.forEach(p=> items.push({x:p[0],y:p[1],w:L.hw,d:L.hd,h:1.5,c,k:"h"}));
    items.sort((a,b)=>(a.x+a.y)-(b.x+b.y));
    items.forEach(it => {
      box(it.x,it.y,it.w,it.d,it.h,it.c, it.k==="h");
      if(it.k==="h"){ // dry coolers on the roof
        for(let f=0; f<3; f++){ const cp = P(it.x+it.w/2, it.y+0.8+f*1.3, it.h+0.02); ctx.beginPath(); ctx.ellipse(cp[0],cp[1],S*0.4,S*0.23,0,0,7); ctx.strokeStyle=`rgba(${g},.55)`; ctx.lineWidth=1; ctx.stroke();
          const a = scene.t*6 + f; ctx.beginPath(); ctx.moveTo(cp[0]-Math.cos(a)*S*0.36, cp[1]-Math.sin(a)*S*0.2); ctx.lineTo(cp[0]+Math.cos(a)*S*0.36, cp[1]+Math.sin(a)*S*0.2); ctx.stroke(); }
      }
      if(it.k==="g"){ const ex = P(it.x+0.4, it.y+0.3, it.h); line(ex, P(it.x+0.4,it.y+0.3,it.h+0.7), `rgba(${g},.7)`, 1.2*DPR); }
    });

    // labels
    ctx.font = `${10.5*DPR}px "JetBrains Mono", ui-monospace, monospace`; ctx.fillStyle = `rgba(${g},.75)`; ctx.textAlign="center";
    const lab = (t,x,y,z) => { const p = P(x,y,z); ctx.fillText(t, p[0], p[1]); };
    const fy = L.depth + 1.6;
    lab("GAS", 2.4, fy, 0);
    lab(R.gens + " GENSETS", L.gx0 + L.gCols*(L.gw+L.gGap)/2, fy, 0);
    lab(R.halls + (R.halls===1?" MODULE":" MODULES"), L.hx0 + L.hCols*(L.hw+L.hGap)/2, fy, 0);
    $("badge").textContent = "Live model · " + fmt(R.mw, R.mw<10?1:0) + " MW · " + fmt(Math.round(R.acres)) + " acres";
    requestAnimationFrame(draw);
  }

  // A link can open the model at a given site: ?src=lfg&flow=2214&ch4=50
  (function(){
    const q = new URLSearchParams(location.search), k = MODES[q.get("src")] ? q.get("src") : "gas", m = MODES[k];
    const f = parseFloat(q.get("flow")), c = parseFloat(q.get("ch4"));
    if (m.ch4 && c >= 35 && c <= 60) { st.ch4 = Math.round(c); $("ch4").value = st.ch4; }
    if (f >= m.lo && f <= m.hi) { st.flow = f; setMode(k, true); } else setMode(k);
  })();
  requestAnimationFrame(draw);
})();


(function(){
function glNote(msg){ var n=document.getElementById("glnote"); if(n){ n.textContent=msg; n.hidden=false; } console.warn(msg); }
if (!window.THREE) { glNote("3D view unavailable: 3D library did not load. Showing the flat model."); return; }
if (!THREE.OrbitControls || !THREE.RoomEnvironment || !THREE.BufferGeometryUtils || !window.__accScene) { glNote("3D view unavailable: helpers missing. Showing the flat model."); return; }
if (false || !THREE.OrbitControls || !THREE.RoomEnvironment || !THREE.BufferGeometryUtils || !window.__accScene) return;
if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false;
try {

// Realistic 3D site model. Units are meters. Reads window.__accScene.target (sizes) and .src (gas source).
const SC = window.__accScene, stage = document.getElementById("stage");
const MAX_G = 48, MAX_M = 60;

let renderer;
try { renderer = new THREE.WebGLRenderer({ antialias: true }); }
catch (e1) { try { renderer = new THREE.WebGLRenderer({ antialias: false }); } catch (e2) { glNote("3D view unavailable: this browser or viewer blocked WebGL. Showing the flat model."); return; } }
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputEncoding = THREE.sRGBEncoding; renderer.physicallyCorrectLights = true;
renderer.domElement.className = "gl";
stage.insertBefore(renderer.domElement, stage.firstChild);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(26, 1.45, 1, 6000);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
const hemi = new THREE.HemisphereLight(0xffffff, 0x303030, 0.6); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.5);
sun.shadow.radius = 3;
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.35;
scene.add(sun, sun.target);

/* ---------- procedural textures (all greyscale) ---------- */
function tex(w, h, draw, srgb = true) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  if (srgb) t.encoding = THREE.sRGBEncoding; return t;
}
const rnd = (a, b) => a + Math.random() * (b - a);
const gravel = tex(512, 512, (g, w, h) => { g.fillStyle = "#7a7a7a"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 26000; i++) { const v = rnd(70, 170) | 0; g.fillStyle = `rgb(${v},${v},${v})`; const s = rnd(1, 3); g.fillRect(rnd(0, w), rnd(0, h), s, s); } });
const concrete = tex(512, 512, (g, w, h) => { g.fillStyle = "#a6a6a6"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 14000; i++) { const v = rnd(140, 190) | 0; g.fillStyle = `rgba(${v},${v},${v},.5)`; g.fillRect(rnd(0, w), rnd(0, h), 1.5, 1.5); }
  g.strokeStyle = "rgba(60,60,60,.55)"; g.lineWidth = 2; g.strokeRect(0, 0, w, h); g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke(); });
const asphalt = tex(256, 256, (g, w, h) => { g.fillStyle = "#3a3a3a"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) { const v = rnd(40, 90) | 0; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(rnd(0, w), rnd(0, h), 1.2, 1.2); } });
const grass = tex(512, 512, (g, w, h) => { g.fillStyle = "#6a6a6a"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 40000; i++) { const v = rnd(60, 130) | 0; g.strokeStyle = `rgba(${v},${v},${v},.7)`; const x = rnd(0, w), y = rnd(0, h); g.beginPath(); g.moveTo(x, y); g.lineTo(x + rnd(-1, 1), y - rnd(2, 5)); g.stroke(); } });
const corr = tex(64, 8, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0);
  gr.addColorStop(0, "#9a9a9a"); gr.addColorStop(.25, "#ffffff"); gr.addColorStop(.5, "#cfcfcf"); gr.addColorStop(.75, "#8a8a8a"); gr.addColorStop(1, "#9a9a9a"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const louvre = tex(8, 64, (g, w, h) => { for (let y = 0; y < h; y += 8) { const gr = g.createLinearGradient(0, y, 0, y + 8); gr.addColorStop(0, "#202020"); gr.addColorStop(.6, "#8c8c8c"); gr.addColorStop(1, "#303030"); g.fillStyle = gr; g.fillRect(0, y, w, 8); } });
const fanT = tex(256, 256, (g, w, h) => { const c = w / 2; g.clearRect(0, 0, w, h);
  g.fillStyle = "#1c1c1c"; g.beginPath(); g.arc(c, c, c - 2, 0, 7); g.fill();
  g.fillStyle = "#a9a9a9"; for (let i = 0; i < 7; i++) { g.save(); g.translate(c, c); g.rotate(i / 7 * Math.PI * 2); g.beginPath(); g.ellipse(0, -c * .48, c * .14, c * .44, .35, 0, 7); g.fill(); g.restore(); }
  g.fillStyle = "#d8d8d8"; g.beginPath(); g.arc(c, c, c * .13, 0, 7); g.fill();
  g.strokeStyle = "rgba(150,150,150,.55)"; g.lineWidth = 1.2; for (let r = c * .2; r < c - 4; r += c * .09) { g.beginPath(); g.arc(c, c, r, 0, 7); g.stroke(); } });
const glowT = tex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.25, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const chain = tex(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = "#cfcfcf"; g.lineWidth = 3;
  g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke(); });

function rep(t, u, v) { const c = t.clone(); c.needsUpdate = true; c.repeat.set(u, v); return c; }
const std = (o) => new THREE.MeshStandardMaterial(o);
const M = {
  ground: std({ color: 0x4a4a4a, roughness: 1, map: rep(gravel, 260, 260), bumpMap: rep(gravel, 260, 260), bumpScale: 0.8 }),
  pad: std({ color: 0x8c8c8c, roughness: .92, map: concrete, bumpMap: concrete, bumpScale: .3 }),
  road: std({ color: 0x777777, roughness: .95, map: rep(asphalt, 40, 2) }),
  mound: std({ color: 0x9a9a9a, roughness: 1, map: rep(grass, 18, 18), bumpMap: rep(grass, 18, 18), bumpScale: 1.2 }),
  gen: std({ color: 0xdedede, metalness: .45, roughness: .42, map: rep(corr, 40, 1), bumpMap: rep(corr, 40, 1), bumpScale: 1.4 }),
  genSpare: std({ color: 0x9c9c9c, metalness: .45, roughness: .5, map: rep(corr, 40, 1), bumpMap: rep(corr, 40, 1), bumpScale: 1.4 }),
  mod: std({ color: 0x2b2b2b, metalness: .55, roughness: .38, map: rep(corr, 44, 1), bumpMap: rep(corr, 44, 1), bumpScale: 1.4 }),
  bat: std({ color: 0xd6d6d6, metalness: .25, roughness: .5, map: rep(corr, 22, 1), bumpMap: rep(corr, 22, 1), bumpScale: 1.2 }),
  steel: std({ color: 0xc8c8c8, metalness: .85, roughness: .32 }),
  galv: std({ color: 0xa8a8a8, metalness: .7, roughness: .45 }),
  dark: std({ color: 0x1e1e1e, metalness: .4, roughness: .6 }),
  black: std({ color: 0x0c0c0c, metalness: .2, roughness: .7 }),
  white: std({ color: 0xd2d2d2, metalness: .1, roughness: .55 }),
  louvre: std({ color: 0xb0b0b0, metalness: .5, roughness: .5, map: rep(louvre, 1, 6) }),
  fan: std({ map: fanT, alphaTest: .5, metalness: .5, roughness: .45, side: THREE.DoubleSide }),
  led: std({ color: 0x111111, emissive: 0xffffff, emissiveIntensity: 2 }),
  lamp: std({ color: 0x222222, emissive: 0xffffff, emissiveIntensity: 3 }),
  // compute module lighting: base band, three pulsing groups of rack-activity slits, and a ground halo
  band: std({ color: 0x111111, emissive: 0xffffff, emissiveIntensity: 1.6 }),
  act0: std({ color: 0x111111, emissive: 0xffffff, emissiveIntensity: 1 }),
  act1: std({ color: 0x111111, emissive: 0xffffff, emissiveIntensity: 1 }),
  act2: std({ color: 0x111111, emissive: 0xffffff, emissiveIntensity: 1 }),
  fence: std({ color: 0xb8b8b8, metalness: .6, roughness: .5, map: chain, alphaTest: .35, side: THREE.DoubleSide, transparent: false }),
  pool: new THREE.MeshBasicMaterial({ map: glowT, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false }),
  halo: new THREE.MeshBasicMaterial({ map: glowT, transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
};

/* ---------- builders ---------- */
function mesh(geo, mat, x, y, z, p, cast = true) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; if (p) p.add(m); return m; }
const B = (w, h, d, mat, x, y, z, p, cast) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, p, cast);
const C = (r1, r2, h, mat, x, y, z, p, seg = 24) => mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mat, x, y, z, p);
function fan(r, x, y, z, p) { const f = mesh(new THREE.CircleGeometry(r, 40), M.fan, x, y, z, p, false); f.rotation.x = -Math.PI / 2; f.name = "fan"; f.userData.w = rnd(5, 8);
  const ring = mesh(new THREE.TorusGeometry(r, r * .07, 8, 40), M.dark, x, y, z, p); ring.rotation.x = -Math.PI / 2; return f; }
// thin vertical seams on the two long faces of a box (merged into one mesh)
function seams(w, h, d, y0, step, mat, p) { const gs = [];
  for (let z = -d / 2 + step; z < d / 2 - .1; z += step) for (const s of [-1, 1]) { const g = new THREE.BoxGeometry(.05, h, .05); g.translate(s * (w / 2 + .02), y0 + h / 2, z); gs.push(g); }
  if (gs.length) mesh(THREE.BufferGeometryUtils.mergeBufferGeometries(gs), mat, 0, 0, 0, p, false); }

// Gas genset in a 40-ft acoustic enclosure (long axis along z)
function makeGen(spare) {
  const g = new THREE.Group(); const L = 12.2, W = 2.5, H = 2.9;
  B(W + .3, .25, L + .4, M.dark, 0, .125, 0, g);
  B(W, H, L, spare ? M.genSpare : M.gen, 0, .25 + H / 2, 0, g);
  seams(W, H - .2, L, .35, 2.4, M.dark, g);
  B(W - .3, 1.6, .06, M.louvre, 0, 1.6, L / 2 + .03, g, false);
  B(W - .3, 1.6, .06, M.louvre, 0, 1.6, -L / 2 - .03, g, false);
  for (const z of [-2.4, 0, 2.4]) B(.04, 2.1, 1.0, M.dark, W / 2 + .02, 1.35, z, g, false);
  B(W - .1, 1.0, 4.4, M.galv, 0, H + .25 + .5, -3.6, g);
  for (const z of [-4.7, -2.5]) fan(.9, 0, H + .25 + 1.02, z, g);
  const sil = C(.48, .48, 3.6, M.steel, 0, H + .25 + .55, 2.6, g); sil.rotation.x = Math.PI / 2;
  C(.24, .24, 3.2, M.steel, 0, H + .25 + 1.9, 4.2, g);
  C(.34, .24, .25, M.dark, 0, H + .25 + 3.55, 4.2, g);
  B(.12, .12, .3, M.lamp, W / 2 + .07, 2.75, 0, g, false);
  g.userData.stack = new THREE.Vector3(0, H + .25 + 3.7, 4.2); g.userData.spare = spare;
  return g;
}
// AI compute module: container-sized, dark cladding, dry coolers on the roof (long axis along z)
function makeMod() {
  const g = new THREE.Group(); const L = 12.2, W = 3.0, H = 3.2;
  B(W + .6, .35, L + .8, M.pad, 0, .175, 0, g);
  B(W, H, L, M.mod, 0, .35 + H / 2, 0, g);
  seams(W, H - .3, L, .5, 3.0, M.black, g);
  B(.05, .08, L - .8, M.led, W / 2 + .03, .35 + H - .35, 0, g, false);
  B(.05, .08, L - .8, M.led, -W / 2 - .03, .35 + H - .35, 0, g, false);
  B(1.0, 2.2, .06, M.steel, -.6, 1.5, L / 2 + .03, g, false);
  B(.18, .1, .06, M.lamp, -.6, 2.8, L / 2 + .06, g, false);
  B(W - .2, .5, L - .4, M.galv, 0, .35 + H + .25, 0, g);           // roof frame
  for (let i = 0; i < 4; i++) { const z = -L / 2 + 1.5 + i * 3.05;
    B(W - .3, .9, 2.7, M.steel, 0, .35 + H + .95, z, g);
    fan(.95, 0, .35 + H + 1.42, z, g); }
  const pipe = C(.12, .12, L - 1, M.steel, W / 2 - .3, .35 + H + .62, 0, g, 10); pipe.rotation.x = Math.PI / 2;
  // lights: a glowing band along the base, vertical activity slits on both long sides, a soft pool of light on the ground
  for (const sx of [-1, 1]) {
    B(.06, .22, L - .6, M.band, sx * (W / 2 + .04), .62, 0, g, false);
    B(.06, .1, L - .5, M.band, sx * (W / 2 + .04), .35 + H + .02, 0, g, false);      // roof-edge line
    for (let i = 0; i < 14; i++) B(.06, 2.1, .16, [M.act0, M.act1, M.act2][(i * 7 + (sx > 0 ? 1 : 0)) % 3], sx * (W / 2 + .04), .35 + H / 2 + .1, -L / 2 + 1.5 + i * ((L - 3) / 13), g, false);
  }
  for (const sz of [-1, 1]) B(W - .5, .1, .06, M.band, 0, .35 + H + .02, sz * (L / 2 + .04), g, false);
  const halo = mesh(new THREE.PlaneGeometry(W * 4.6, L * 1.75), M.halo, 0, .37, 0, g, false); halo.rotation.x = -Math.PI / 2; halo.renderOrder = 2;
  return g;
}
// merge a group's static meshes into one mesh per material (fans and see-through parts stay separate), so big sites stay quick
function bake(g) {
  const by = new Map(), keep = [];
  g.updateMatrixWorld(true);
  g.children.slice().forEach(o => {
    if (!o.isMesh || o.name === "fan" || o.material.transparent) { keep.push(o); return; }
    const geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); geo.applyMatrix4(o.matrix);
    for (const a of Object.keys(geo.attributes)) if (!["position", "normal", "uv"].includes(a)) geo.deleteAttribute(a);
    const k = o.material.uuid; if (!by.has(k)) by.set(k, { m: o.material, gs: [], cast: o.castShadow }); by.get(k).gs.push(geo); g.remove(o); });
  by.forEach(({ m, gs, cast }) => mesh(THREE.BufferGeometryUtils.mergeBufferGeometries(gs), m, 0, 0, 0, g, cast));
  return g;
}
// Compute hall: a building that houses up to 12 of the same 1 MW modules, two rows of six,
// each with its own dry cooler on the roof. Large sites use halls instead of open-air modules.
const PER_HALL = 12, HALL_AT = 40;
function makeHall(n) {
  const g = new THREE.Group(), cols = Math.ceil(n / 2), W = cols * 4.2 + 2.4, D = 30, H = 7.5;
  B(W + 2, .35, D + 2, M.pad, 0, .175, 0, g);
  B(W, H, D, M.mod, 0, .35 + H / 2, 0, g);
  seams(W, H - .5, D, .6, 3, M.black, g);
  B(W + .3, .55, D + .3, M.galv, 0, .35 + H + .27, 0, g);                       // parapet
  B(W - .6, .1, D - .6, M.dark, 0, .35 + H + .5, 0, g, false);                   // roof deck
  for (let i = 0; i < n; i++) { const c = Math.floor(i / 2), x = -W / 2 + 1.2 + c * 4.2 + 2.1, z = (i % 2 ? 1 : -1) * 7;
    B(3.2, 1.1, 6.5, M.steel, x, .35 + H + 1.05, z, g);
    fan(1.05, x, .35 + H + 1.62, z - 1.6, g); fan(1.05, x, .35 + H + 1.62, z + 1.6, g); }
  B(4.5, 4.6, .08, M.louvre, W / 2 - 3.5, 2.65, D / 2 + .04, g, false);         // roll-up door
  B(1.1, 2.3, .08, M.steel, -W / 2 + 2, 1.5, D / 2 + .04, g, false);            // personnel door
  B(.2, .12, .1, M.lamp, -W / 2 + 2, 2.9, D / 2 + .1, g, false);
  // lights: base band and roof line all round, rack-activity slits on every wall, a pool of light on the ground
  for (const sz of [-1, 1]) {
    B(W - .4, .26, .07, M.band, 0, .7, sz * (D / 2 + .05), g, false);
    B(W - .4, .12, .07, M.band, 0, .35 + H - .2, sz * (D / 2 + .05), g, false);
    const nS = Math.max(4, cols * 3); for (let i = 0; i < nS; i++) { const x = -W / 2 + 1.5 + i * ((W - 3) / (nS - 1)); if (sz > 0 && x > W / 2 - 6.2) continue;
      B(.18, 3.4, .07, [M.act0, M.act1, M.act2][(i * 5 + (sz > 0 ? 1 : 0)) % 3], x, .35 + H / 2 + .3, sz * (D / 2 + .05), g, false); } }
  for (const sx of [-1, 1]) {
    B(.07, .26, D - .4, M.band, sx * (W / 2 + .05), .7, 0, g, false);
    B(.07, .12, D - .4, M.band, sx * (W / 2 + .05), .35 + H - .2, 0, g, false);
    for (let i = 0; i < 9; i++) B(.07, 3.4, .18, [M.act0, M.act1, M.act2][(i * 7 + (sx > 0 ? 2 : 0)) % 3], sx * (W / 2 + .05), .35 + H / 2 + .3, -D / 2 + 2 + i * ((D - 4) / 8), g, false); }
  const halo = mesh(new THREE.PlaneGeometry(W * 2.6, D * 2.2), M.halo, 0, .37, 0, g, false); halo.rotation.x = -Math.PI / 2; halo.renderOrder = 2;
  g.userData.n = n; g.userData.hall = true;
  return bake(g);
}
const hallProto = {}; const hallOf = n => (hallProto[n] = hallProto[n] || makeHall(n)).clone();
// Battery container with end-wall HVAC
function makeBat() {
  const g = new THREE.Group(); const L = 6.1, W = 2.5, H = 2.9;
  B(W + .3, .2, L + .3, M.dark, 0, .1, 0, g);
  B(W, H, L, M.bat, 0, .2 + H / 2, 0, g);
  seams(W, H - .2, L, .3, 1.5, M.galv, g);
  B(1.6, 1.3, .7, M.galv, 0, 1.6, L / 2 + .35, g);
  fan(.42, 0, 2.27, L / 2 + .35, g);
  return g;
}
function makeTransformer(p, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); p.add(g);
  B(6, .4, 5, M.pad, 0, .2, 0, g);
  B(3.2, 3, 2.4, M.dark, 0, 1.9, 0, g);
  for (let i = 0; i < 9; i++) B(.08, 2.4, .9, M.galv, -1.5 + i * .38, 1.8, 1.7, g);
  for (const xx of [-.9, 0, .9]) { C(.12, .18, 1.2, M.white, xx, 3.9, -.4, g, 12); }
  B(2.2, 2.6, 1.2, M.galv, 0, 1.7, -2.3, g);
}
function vessel(p, x, z, r, h, horiz) {
  const m = mesh(new THREE.CapsuleGeometry(r, h, 8, 24), M.steel, x, horiz ? r + .6 : h / 2 + r + .3, z, p);
  if (horiz) { m.rotation.z = Math.PI / 2; for (const s of [-1, 1]) B(.4, .6, r * 1.6, M.dark, x + s * h * .35, .3, z, p); }
  else C(r * 1.05, r * 1.1, .6, M.dark, x, .3, z, p);
  return m;
}
function pipeRun(p, pts, r = .3, h = 1.2) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = new THREE.Vector3(pts[i][0], h, pts[i][1]), b = new THREE.Vector3(pts[i + 1][0], h, pts[i + 1][1]);
    const len = a.distanceTo(b); if (len < .01) continue;
    const m = C(r, r, len, M.steel, (a.x + b.x) / 2, h, (a.z + b.z) / 2, p, 14);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    for (let t = 3; t < len; t += 7) { const q = a.clone().lerp(b, t / len); B(.25, h, .9, M.dark, q.x, h / 2, q.z, p); }
  }
}

/* ---------- flare: flame sprites plus a flickering light ---------- */
const flames = [];
function flare(p, x, z, h) {
  C(.55, .8, h, M.steel, x, h / 2, z, p);
  C(.9, .9, 1.2, M.dark, x, h + .6, z, p);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; const g = C(.06, .06, h * .9, M.galv, x + Math.cos(a) * 2.6, h * .45, z + Math.sin(a) * 2.6, p, 6); g.rotation.z = Math.cos(a) * .15; g.rotation.x = -Math.sin(a) * .15; }
  const tip = new THREE.Vector3(x, h + 1.3, z);
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: 0xffffff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false }));
    s.position.copy(tip); s.userData = { i, tip }; p.add(s); flames.push(s);
  }
  const L = new THREE.PointLight(0xffffff, 0, 90, 1.6); L.position.copy(tip).add(new THREE.Vector3(0, 3, 0)); p.add(L); flames.push(L);
}

/* ---------- inside a compute module (cutaway, for illustration) ---------- */
// Rack front: power shelves, compute trays, switch trays, compute trays, power shelves. Second canvas holds the status LEDs.
const RACK_ROWS = (() => { const r = []; const add = (n, k) => { for (let i = 0; i < n; i++) r.push(k); };
  add(3, "p"); add(10, "c"); add(9, "s"); add(8, "c"); add(3, "p"); return r; })();
function rackFace(g, w, h, leds) {
  g.fillStyle = leds ? "#000" : "#0d0d0d"; g.fillRect(0, 0, w, h);
  const top = 18, bot = 18, rh = (h - top - bot) / RACK_ROWS.length;
  RACK_ROWS.forEach((k, i) => { const y = top + i * rh;
    if (!leds) { g.fillStyle = k === "s" ? "#2a2a2a" : k === "p" ? "#1a1a1a" : "#202020"; g.fillRect(8, y + 1, w - 16, rh - 2);
      g.fillStyle = "#0a0a0a"; for (let x = 14; x < w - 30; x += 6) g.fillRect(x, y + 3, 3, rh - 6);
      g.fillStyle = "#3a3a3a"; g.fillRect(w - 26, y + 3, 14, rh - 6); }
    else { g.fillStyle = "#fff"; const n = k === "s" ? 4 : k === "c" ? 2 : 1;
      for (let j = 0; j < n; j++) g.fillRect(w - 24 + j * 4, y + rh / 2 - 1, 2, 2);
      if (k === "s") { g.fillStyle = "#9a9a9a"; for (let x = 16; x < w - 34; x += 7) g.fillRect(x, y + rh / 2 - 1, 3, 2); } } });
}
const rackT = tex(128, 512, (g, w, h) => rackFace(g, w, h, false)), rackE = tex(128, 512, (g, w, h) => rackFace(g, w, h, true));
const tileT = tex(256, 256, (g, w, h) => { g.fillStyle = "#8a8a8a"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 1400; i++) { const v = 120 + Math.random() * 40 | 0; g.fillStyle = "rgba(" + v + "," + v + "," + v + ",.25)"; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  g.strokeStyle = "#5a5a5a"; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 4); g.lineTo(w, i * h / 4); g.stroke(); } });
const panelT = tex(128, 256, (g, w, h) => { g.fillStyle = "#cfcfcf"; g.fillRect(0, 0, w, h); g.fillStyle = "#9c9c9c";
  g.fillRect(4, 4, w - 8, 2); g.fillRect(w / 2 - 1, 8, 2, h - 16); g.fillStyle = "#222"; g.fillRect(w * .62, h * .4, 6, 22); g.fillRect(w * .32, h * .4, 6, 22);
  g.fillStyle = "#555"; for (let i = 0; i < 6; i++) g.fillRect(14, 30 + i * 12, w / 2 - 28, 4); });
Object.assign(M, {
  rack: std({ color: 0xffffff, map: rackT, emissiveMap: rackE, emissive: 0xffffff, emissiveIntensity: 1.4, metalness: .5, roughness: .45 }),
  rackBody: std({ color: 0x141414, metalness: .5, roughness: .5 }),
  floor: std({ color: 0xbdbdbd, roughness: .7, metalness: .1, map: rep(tileT, 3, 12) }),
  lining: std({ color: 0xc4c4c4, roughness: .85, metalness: .05 }),
  panel: std({ color: 0xffffff, map: panelT, roughness: .5, metalness: .2 }),
  hot: std({ color: 0x8a8a8a, metalness: .85, roughness: .3 }),
  cold: std({ color: 0xe6e6e6, metalness: .6, roughness: .3 }),
  screen: std({ color: 0x111111, emissive: 0xffffff, emissiveIntensity: .9 }),
});
function makeCutaway() {
  const g = new THREE.Group(); const L = 12.2, W = 3.0, H = 3.2, y0 = .35, tw = .08;
  const inner = new THREE.Group(), near = new THREE.Group(), roof = new THREE.Group(); g.add(inner, near, roof);
  const anchors = [];
  const tag = (p, x, y, z, id) => { const o = new THREE.Object3D(); o.position.set(x, y, z); p.add(o); anchors.push({ o, id }); };
  // plinth and shell (matches the closed module)
  B(W + .6, .35, L + .8, M.pad, 0, .175, 0, g);
  B(tw, H, L, M.mod, W / 2 - tw / 2, y0 + H / 2, 0, g);                         // far wall
  B(.02, H - .1, L - .2, M.lining, W / 2 - tw - .01, y0 + H / 2, 0, inner, false);
  for (const s of [-1, 1]) { B(W, H, tw, M.mod, 0, y0 + H / 2, s * (L / 2 - tw / 2), g); B(W - .2, H - .1, .02, M.lining, 0, y0 + H / 2, s * (L / 2 - tw - .01), inner, false); }
  B(.05, .08, L - .8, M.led, W / 2 + .03, y0 + H - .35, 0, g, false);
  B(1.0, 2.2, .06, M.steel, -.6, 1.5, L / 2 + .03, g, false); B(.18, .1, .06, M.lamp, -.6, 2.8, L / 2 + .06, g, false);
  // near wall: drops to a low sill when opened (pivot at its base)
  near.position.set(-W / 2 + tw / 2, y0, 0);
  B(tw, H, L, M.mod, 0, H / 2, 0, near); B(.05, .08, L - .8, M.led, -.05, H - .35, 0, near, false);
  B(.02, H - .1, L - .2, M.lining, tw / 2 + .01, H / 2, 0, near, false);
  // roof with dry coolers: lifts off when opened
  B(W, .12, L, M.mod, 0, y0 + H - .06, 0, roof);
  B(W - .2, .5, L - .4, M.galv, 0, y0 + H + .25, 0, roof);
  for (let i = 0; i < 4; i++) { const z = -L / 2 + 1.5 + i * 3.05; B(W - .3, .9, 2.7, M.steel, 0, y0 + H + .95, z, roof); fan(.95, 0, y0 + H + 1.42, z, roof); }
  const rp = C(.12, .12, L - 1, M.steel, W / 2 - .3, y0 + H + .62, 0, roof, 10); rp.rotation.x = Math.PI / 2;
  for (const [x, m] of [[1.05, M.cold], [1.25, M.hot]]) C(.09, .09, .9, m, x, y0 + H - .3, -2.5, roof, 12);
  tag(roof, 0, y0 + H + 1.5, 1.6, "coolers");
  // floor
  B(W - 2 * tw, .04, L - 2 * tw, M.floor, 0, y0 + .02, 0, inner, false);
  // electrical room (-z end) with partition and doorway on the aisle side
  for (let i = 0; i < 3; i++) { const z = -5.55 + i * .82; B(.8, 2.2, .8, M.panel, .95, y0 + 1.1, z, inner); B(.02, .35, .5, M.screen, .54, y0 + 1.6, z, inner, false); }
  B(W - 1.25, H - .1, .06, M.lining, .62, y0 + (H - .1) / 2, -3.3, inner);
  B(1.17, H - 2.2, .06, M.lining, -.95, y0 + 2.2 + (H - 2.2) / 2 - .05, -3.3, inner);
  tag(inner, .55, y0 + 2.2, -4.7, "power");
  // busway over the rack row, with a tap-off box per rack
  B(.16, .14, 7.6, M.galv, .3, y0 + 2.78, -.9, inner);
  for (let i = 0; i < 8; i++) { B(.22, .26, .22, M.galv, .3, y0 + 2.58, -1.6 + i * .6, inner); C(.025, .025, .25, M.black, .3, y0 + 2.38, -1.6 + i * .6, inner, 6); }
  // coolant distribution unit
  B(1.2, 2.2, 1.0, M.white, .3, y0 + 1.1, -2.5, inner); B(.02, .3, .45, M.screen, -.31, y0 + 1.65, -2.5, inner, false);
  B(.02, .7, .8, M.louvre, -.31, y0 + .6, -2.5, inner, false);
  for (const [x, m] of [[1.05, M.cold], [1.25, M.hot]]) C(.09, .09, H - 2.5, m, x, y0 + 2.2 + (H - 2.5) / 2, -2.5, inner, 12);
  tag(inner, -.3, y0 + 1.9, -2.5, "cdu");
  // eight AI racks, fronts facing the aisle (-x)
  for (let i = 0; i < 8; i++) { const z = -1.6 + i * .6;
    B(1.2, 2.3, .58, M.rackBody, .3, y0 + 1.15, z, inner);
    const f = mesh(new THREE.PlaneGeometry(.56, 2.28), M.rack, -.305, y0 + 1.15, z, inner, false); f.rotation.y = -Math.PI / 2;
    // rear manifolds: supply and return to the cold plates
    C(.035, .035, 2.1, M.cold, 1.0, y0 + 1.15, z - .12, inner, 8); C(.035, .035, 2.1, M.hot, 1.0, y0 + 1.15, z + .12, inner, 8);
  }
  tag(inner, -.31, y0 + 2.45, .2, "racks");
  // headers from the CDU along the backs of the racks
  for (const [x, y, m] of [[1.12, y0 + .22, M.cold], [1.26, y0 + .22, M.hot], [1.12, y0 + 2.3, M.cold], [1.26, y0 + 2.3, M.hot]]) {
    const p = C(.06, .06, 5.4, m, x, y, -.4, inner, 10); p.rotation.x = Math.PI / 2; }
  tag(inner, 1.15, y0 + 1.2, 2.55, "manifolds");
  // network cabinet and fiber tray
  B(1.0, 2.1, .6, M.black, .4, y0 + 1.05, 3.6, inner); B(.02, 1.4, .4, M.screen, -.11, y0 + 1.2, 3.6, inner, false);
  B(.32, .05, 8.8, M.galv, -.95, y0 + 2.95, -.2, inner); B(.2, .06, 8.6, M.white, -.95, y0 + 2.99, -.2, inner, false);
  tag(inner, -.1, y0 + 2.1, 3.6, "network");
  // fire suppression cylinders
  for (const z of [5.2, 5.6]) { C(.17, .17, 1.4, M.white, 1.15, y0 + .7, z, inner, 16); C(.08, .08, .18, M.dark, 1.15, y0 + 1.49, z, inner, 10); }
  C(.03, .03, 9.5, M.galv, -.3, y0 + 3.0, .6, inner, 6).rotation.x = Math.PI / 2;
  tag(inner, 1.0, y0 + 1.4, 5.4, "fire");
  // ceiling lights over the aisle
  B(.06, .03, 10.5, M.led, -.95, y0 + H - .25, 0, inner, false);
  const glow = new THREE.PointLight(0xffffff, 0, 12, 2); glow.position.set(-.5, y0 + 2.6, 0); g.add(glow);
  g.traverse(o => { if (o.isMesh && o.parent === roof) o.castShadow = false; });
  return { g, inner, near, roof, anchors, glow };
}

/* ---------- gas sources (outside the fence, at negative x) ---------- */
function moundH(x, z) { const r = Math.hypot(x, z) / 44; return r >= 1 ? 0 : 11 * Math.pow(1 - r * r, 1.4); }
function buildSource(kind) {
  const g = new THREE.Group(); flames.length = 0;
  if (kind === "flare") {
    const geo = new THREE.PlaneGeometry(100, 100, 80, 80); geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) pos.setY(i, moundH(pos.getX(i), pos.getZ(i)) - .05);
    geo.computeVertexNormals(); const m = mesh(geo, M.mound, -72, 0, 0, g); m.castShadow = true;
    for (let i = 0; i < 12; i++) { const a = i * 2.4, r = 8 + (i % 5) * 6.5; const x = Math.cos(a) * r, z = Math.sin(a) * r; const y = moundH(x, z);
      C(.18, .18, 1.6, M.galv, -72 + x, y + .8, z, g, 8); B(.5, .3, .5, M.dark, -72 + x, y + 1.6, z, g); }
    flare(g, -18, -10, 16);
    B(5, 2.6, 3, M.gen, -18, 1.3, 2, g); // blower skid
    pipeRun(g, [[-30, 0], [-18, 0], [-18, -8]], .35);
    pipeRun(g, [[-18, 2], [2, 2], [2, -6], [6, -6]], .3);
  } else if (kind === "well") {
    for (const [x, z] of [[-70, -26], [-60, 18], [-36, -34]]) {
      B(26, .2, 22, M.pad, x, .1, z, g, false);
      for (let k = 0; k < 3; k++) { const wx = x - 6 + k * 6, wz = z - 4;
        C(.35, .35, 1.2, M.steel, wx, .8, wz, g, 12); C(.25, .25, 1.6, M.galv, wx, 2.2, wz, g, 12);
        const wh = mesh(new THREE.TorusGeometry(.4, .06, 8, 20), M.dark, wx + .45, 1.7, wz, g); wh.rotation.y = Math.PI / 2; }
      vessel(g, x + 2, z + 5, .9, 4, true);
      for (const tx of [x + 7, x + 10.5]) { C(1.6, 1.6, 6, M.white, tx, 3, z + 5, g); }
    }
    flare(g, -20, -16, 12);
    pipeRun(g, [[-60, 10], [-36, -10], [-10, -10]], .3);
  } else {
    B(48, 26, 30, M.white, -70, 13, 0, g); B(48.4, 1, 30.4, M.galv, -70, 26.5, 0, g);
    for (let i = 0; i < 7; i++) B(.1, 14, 3, M.dark, -45.9, 12, -10 + i * 3.3, g, false);
    B(20, 40, 18, M.gen, -100, 20, -2, g);
    for (const z of [-14, 10]) C(2.6, 3.6, 72, M.white, -112, 36, z, g, 32);
    for (let i = 0; i < 3; i++) makeTransformer(g, -60 + i * 10, -26);
    pipeRun(g, [[-46, 18], [-10, 18], [-10, -6]], .4);
  }
  return g;
}

/* ---------- site groups and layout ---------- */
const site = new THREE.Group(); scene.add(site);
const ground = mesh(new THREE.PlaneGeometry(4000, 4000), M.ground, 0, 0, 0, scene, false); ground.rotation.x = -Math.PI / 2;
const gensG = new THREE.Group(), modsG = new THREE.Group(), batsG = new THREE.Group(), fixed = new THREE.Group();
site.add(gensG, modsG, batsG, fixed);
let srcG = null, curSrc = "", padG = null;
const protoGen = makeGen(false), protoMod = makeMod(), protoBat = makeBat();

// fixed kit on the pad: gas conditioning skid and main transformer
(function () {
  B(16, .3, 14, M.pad, 14, .15, -6, fixed, false);
  vessel(fixed, 9, -10, 1.1, 5, false); vessel(fixed, 12.5, -10, 1.1, 5, false);
  vessel(fixed, 15, -2, 1.0, 6, true);
  B(4, 3, 6, M.white, 19.5, 1.5, -9, fixed);
  B(2.5, 2.9, 6.1, M.gen, 9, 1.45, 0, fixed);
  for (const x of [7, 21]) for (const z of [-12.5, .5]) C(.12, .12, 6, M.galv, x, 3, z, fixed, 8);
  B(14.4, .2, .2, M.galv, 14, 6, -12.5, fixed); B(14.4, .2, .2, M.galv, 14, 6, .5, fixed);
})();

const L = {};
function layout(nG, nM, nB, gs, hall) {
  const gRow = Math.max(4, Math.min(12, Math.ceil(Math.sqrt(nG * 2.2))));
  const gRows = Math.ceil(nG / gRow), gx0 = 32, gpx = 4.4 * gs, gpz = 16 * gs;
  const gW = Math.min(nG, gRow) * gpx;
  const tx = gx0 + gW + 6;
  const bx0 = tx + 10, bRow = Math.min(nB, 4), bW = Math.max(1, bRow) * 3.4;
  const mx0 = bx0 + bW + 10;
  const mRows = hall ? Math.max(1, Math.min(4, Math.ceil(Math.sqrt(nM / 1.3)))) : Math.max(1, Math.min(5, Math.ceil(Math.sqrt(nM / 2.4))));
  const mCols = Math.ceil(nM / mRows), mpx = hall ? 32 : 5.2, mpz = hall ? 37 : 17;
  const depth = Math.max(gRows * gpz, mRows * mpz, 30);
  Object.assign(L, { gRow, gRows, gx0, gpx, gpz, tx, bx0, mx0, mRows, mCols, mpx, mpz, depth, padW: mx0 + mCols * mpx + 8 });
  const gp = [], mp = [], bp = [];
  for (let i = 0; i < nG; i++) gp.push([gx0 + (i % gRow) * gpx + gpx / 2, -depth / 2 + gpz / 2 + Math.floor(i / gRow) * gpz + (depth - gRows * gpz) / 2]);
  for (let i = 0; i < nM; i++) mp.push([mx0 + Math.floor(i / mRows) * mpx + mpx / 2, -depth / 2 + mpz / 2 + (i % mRows) * mpz + (depth - mRows * mpz) / 2]);
  for (let i = 0; i < nB; i++) bp.push([bx0 + (i % 4) * 3.4 + 1.7, -6 + Math.floor(i / 4) * 8]);
  return { gp, mp, bp };
}

function sync(group, n, make) {
  while (group.children.length < n) { const o = make(group.children.length); o.scale.y = .001; group.add(o); }
  while (group.children.length > n) group.remove(group.children[group.children.length - 1]);
}
function rebuildPad() {
  if (padG) { site.remove(padG); padG.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
  padG = new THREE.Group(); site.add(padG);
  const w = L.padW + 4, d = L.depth + 24, cx = w / 2 - 2;
  const rm = M.road.clone(); rm.map = rep(asphalt, (w + 200) / 8, 1);
  const road = mesh(new THREE.PlaneGeometry(w + 200, 8), rm, cx - 60, .03, d / 2 + 7, padG, false); road.rotation.x = -Math.PI / 2;
  const fh = 2.4, sides = [[cx, -d / 2, w, 0], [cx, d / 2, w, 0], [-2, 0, d, Math.PI / 2], [w - 2, 0, d, Math.PI / 2]];
  for (const [x, z, len, ry] of sides) { const fm = M.fence.clone(); fm.map = rep(chain, len / .6, fh / .6);
    const f = mesh(new THREE.PlaneGeometry(len, fh), fm, x, fh / 2, z, padG, false); f.rotation.y = ry; }
  const posts = []; const add = (x, z) => { const g = new THREE.CylinderGeometry(.05, .05, fh + .3, 6); g.translate(x, (fh + .3) / 2, z); posts.push(g); };
  for (let x = -2; x <= w - 2; x += 3) { add(x, -d / 2); add(x, d / 2); }
  for (let z = -d / 2; z <= d / 2; z += 3) { add(-2, z); add(w - 2, z); }
  mesh(THREE.BufferGeometryUtils.mergeBufferGeometries(posts), M.galv, 0, 0, 0, padG);
  const nP = Math.max(2, Math.round(w / 45));
  for (let i = 0; i <= nP; i++) for (const s of [-1, 1]) {
    const x = -2 + i * w / nP, z = s * (d / 2 + 2);
    C(.12, .16, 10, M.galv, x, 5, z, padG, 8); B(1.4, .2, .5, M.dark, x, 10, z - s * .5, padG);
    B(1.2, .06, .4, M.lamp, x, 9.88, z - s * .5, padG, false);
    const pl = mesh(new THREE.PlaneGeometry(26, 26), M.pool, x, .06, z - s * 6, padG, false); pl.rotation.x = -Math.PI / 2; pl.userData.pool = true;
  }
  makeTransformer(padG, L.tx + 3, 8);
  const hdr = L.gx0 - 2;
  pipeRun(padG, [[22, -6], [hdr, -6], [hdr, -L.depth / 2 + 4], [hdr, L.depth / 2 - 4]], .3, 1.1);
}

/* ---------- smoke from running gensets ---------- */
const puffs = []; const puffMat = new THREE.SpriteMaterial({ map: glowT, transparent: true, depthWrite: false, opacity: 0, color: 0xcfcfcf });
for (let i = 0; i < 80; i++) { const s = new THREE.Sprite(puffMat.clone()); s.userData.life = -Math.random() * 4; site.add(s); puffs.push(s); }

/* ---------- theme ---------- */
const cssv = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
let dark = true, bloom;
function applyTheme() {
  const bg = new THREE.Color("#050506");
  dark = (bg.r + bg.g + bg.b) < 1.2;
  scene.background = bg; scene.fog = new THREE.Fog(bg, 300, 1400);
  renderer.toneMappingExposure = dark ? .95 : 1.0;
  sun.intensity = dark ? 2.4 : 3.2; hemi.intensity = dark ? .1 : .7;
  hemi.groundColor.set(dark ? 0x101010 : 0x5a5a5a);
  M.led.emissiveIntensity = dark ? 1.1 : .25; M.lamp.emissiveIntensity = dark ? 4 : .6;
  M.pool.opacity = dark ? .07 : 0; M.halo.opacity = dark ? .45 : .08;
  Object.values(M).forEach(m => { if (m.isMeshStandardMaterial) m.envMapIntensity = dark ? .22 : .55; });
  if (padG) padG.traverse(o => { if (o.material && o.material.isMeshStandardMaterial) o.material.envMapIntensity = dark ? .22 : .55; });
  if (bloom) { bloom.strength = dark ? .55 : .1; bloom.threshold = dark ? .93 : .97; }
  puffs.forEach(p => p.material.color.set(dark ? 0x8a8a8a : 0x9a9a9a));
}
applyTheme();


/* ---------- render pipeline ---------- */
applyTheme();

// Wheel: zoom only with Ctrl/Cmd (or a trackpad pinch); otherwise the page scrolls, even after clicking the model.
const hero = document.getElementById("hero"), heroCopy = document.getElementById("herocopy");
const toastEl = document.getElementById("toast"); let toastT = 0;
function toast(msg) { if (!toastEl) return; toastEl.textContent = msg; toastEl.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => toastEl.hidden = true, 1400); }
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || "");
let toldZoom = 0;
renderer.domElement.addEventListener("wheel", e => {
  if (e.ctrlKey || e.metaKey) return;
  e.stopImmediatePropagation(); if (Date.now() - toldZoom > 6000) { toldZoom = Date.now(); toast((isMac ? "⌘" : "Ctrl") + " + scroll to zoom"); }
}, { passive: true });

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableZoom = true; controls.enablePan = true; controls.screenSpacePanning = false;
controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.touches = { ONE: -1, TWO: THREE.TOUCH.DOLLY_PAN };
renderer.domElement.style.touchAction = "pan-y"; // the controls set "none", which would stop the page scrolling
controls.zoomSpeed = 1.1; controls.panSpeed = .9; controls.rotateSpeed = .8;
controls.enableDamping = true; controls.dampingFactor = .07;
controls.minPolarAngle = .12; controls.maxPolarAngle = 1.38; controls.minDistance = 5; controls.maxDistance = 900;
controls.autoRotate = true; controls.autoRotateSpeed = .15;
let idleT = 0, userCam = false, tw = null;
controls.addEventListener("start", () => { controls.autoRotate = false; idleT = 0; userCam = true; tw = null; });
camera.position.set(-180, 160, 260);
function tweenTo(target, pos, dur) { tw = { t0: controls.target.clone(), p0: camera.position.clone(), t1: target.clone(), p1: pos.clone(), t: 0, dur }; controls.autoRotate = false; }
function zoomBy(f) { const off = camera.position.clone().sub(controls.target); const len = THREE.MathUtils.clamp(off.length() * f, controls.minDistance, controls.maxDistance);
  userCam = true; tweenTo(controls.target, controls.target.clone().add(off.setLength(len)), .35); }

// Shift the picture right so the site sits clear of the copy on wide screens.
let shiftGoal = 0, shiftCur = 0, panelPx = 0;
function overlayPx() { const de = document.documentElement; if ((de.classList.contains("embed") && !de.classList.contains("withcopy")) || host !== stage || !heroCopy || !matchMedia("(min-width: 901px)").matches) return 0;
  const s = stage.getBoundingClientRect(), c = heroCopy.getBoundingClientRect(); return Math.max(0, c.right - s.left + 24); }
let VW = 1, VH = 1, span = 200, fitR = 300;
const mini = document.getElementById("mini"); let host = stage;
function size() { const r = host.getBoundingClientRect(); const w = Math.max(1, r.width), h = Math.max(1, r.height);
  VW = w; VH = h; renderer.setSize(w, h, false); camera.aspect = w / h; panelPx = overlayPx(); applyShift(); computeFit(); }
function applyShift() { if (Math.abs(shiftCur) < .5) camera.clearViewOffset(); else camera.setViewOffset(VW, VH, -shiftCur, 0, VW, VH); camera.updateProjectionMatrix(); }
let isHall = false; // true once the site is big enough that modules sit in halls
function computeFit() {
  const vf = THREE.MathUtils.degToRad(camera.fov), effA = Math.max(.6, (VW - panelPx) / VH), hf = 2 * Math.atan(Math.tan(vf / 2) * effA);
  fitR = Math.max((span * .5) / Math.tan(hf / 2), (span * .34) / Math.tan(vf / 2)) * (isHall ? .9 : .7);  // halls are deep as well as wide, so pull back a little
  controls.maxDistance = fitR * 2.4;
}
const ro = new ResizeObserver(() => size()); ro.observe(stage); ro.observe(mini); size();
// Picture-in-picture: once the hero model is fully off screen (and the sizing section is in view), the canvas moves to the dock.
let ready = false, heroOn = true, below = false, dismissed = false, visible = true;
function moveTo(h) { if (h === host) return; host = h;
  if (h === mini) mini.insertBefore(renderer.domElement, mini.firstChild); else stage.insertBefore(renderer.domElement, stage.firstChild);
  if (h === mini && !userCam) controls.autoRotate = true;
  stage.classList.toggle("docked", h === mini);
  shiftCur = 0; size(); }
function updateDock() {
  if (heroOn) dismissed = false;
  const on = ready && !heroOn && below && !dismissed;
  mini.classList.toggle("on", on);
  if (on) moveTo(mini); else if (heroOn || !ready) moveTo(stage);
  visible = heroOn || on;
}
// The dock appears once about half of the model has scrolled up under the top bar.
let dockRaf = 0;
function dockCheck() { dockRaf = 0; const r = stage.getBoundingClientRect();
  const top = Math.max(0, (document.querySelector(".bar") || { getBoundingClientRect: () => ({ bottom: 0 }) }).getBoundingClientRect().bottom);
  heroOn = r.top > top - r.height * 0.5; below = !heroOn; updateDock(); }
addEventListener("scroll", () => { if (!dockRaf) dockRaf = requestAnimationFrame(dockCheck); }, { passive: true });
addEventListener("resize", () => { if (!dockRaf) dockRaf = requestAnimationFrame(dockCheck); });
dockCheck();
// Drag the dock anywhere by its label bar; the position is remembered for this viewer.
(() => { const cap = document.getElementById("mini-cap"); let drag = null, pos = null;
  try { pos = JSON.parse(localStorage.getItem("acc-site-dock-pos") || "null"); } catch (e) {}
  function place(x, y) { const w = mini.offsetWidth, h = mini.offsetHeight;
    const barB = Math.max(0, (document.querySelector(".bar") || { getBoundingClientRect: () => ({ bottom: 0 }) }).getBoundingClientRect().bottom);
    x = Math.max(0, Math.min(innerWidth - w, x)); y = Math.max(barB, Math.min(innerHeight - h, y));
    mini.style.left = x + "px"; mini.style.top = y + "px"; mini.style.right = "auto"; mini.style.bottom = "auto";
    pos = { x, y }; }
  if (pos) requestAnimationFrame(() => place(pos.x, pos.y));
  cap.title = "Drag to move";
  cap.addEventListener("pointerdown", e => { e.preventDefault(); e.stopPropagation(); const r = mini.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top }; cap.setPointerCapture(e.pointerId); mini.classList.add("dragging"); });
  cap.addEventListener("pointermove", e => { if (drag) place(e.clientX - drag.dx, e.clientY - drag.dy); });
  const end = () => { if (!drag) return; drag = null; mini.classList.remove("dragging"); try { localStorage.setItem("acc-site-dock-pos", JSON.stringify(pos)); } catch (e) {} };
  cap.addEventListener("pointerup", end); cap.addEventListener("pointercancel", end);
  addEventListener("resize", () => { if (pos) place(pos.x, pos.y); });
})();
document.getElementById("mini-x").addEventListener("click", () => { dismissed = true; updateDock(); });
// a sizing page that embeds this model docks it in a corner window when its hero scrolls away
addEventListener("message", e => { if (e.origin !== location.origin || !e.data || e.data.acc !== "dock") return;
  const de = document.documentElement; if (!de.dataset.wc) de.dataset.wc = de.classList.contains("withcopy") ? "1" : "0";
  de.classList.toggle("docked", !!e.data.on); de.classList.toggle("withcopy", !e.data.on && de.dataset.wc === "1");
  if (e.data.on && !userCam) controls.autoRotate = true; size(); });
document.getElementById("mini-up").addEventListener("click", () => document.getElementById("hero").scrollIntoView({ behavior: "smooth", block: "start" }));

/* ---------- loop ---------- */
const cut = makeCutaway(); cut.g.visible = false; site.add(cut.g);
let modOpen = false, openAmt = 0, openIdx = -1;
const labelsEl = document.getElementById("labels"), openBtn = document.getElementById("openmod");
const LEGEND = [
  ["power", "Switchboard and busway", "Power from the gas engines, run overhead to every rack"],
  ["racks", "8 AI racks", "Liquid-cooled, about 120 kW and 72 GPUs each"],
  ["manifolds", "Cold plates and manifolds", "Coolant flows to a plate on every chip and back"],
  ["cdu", "Coolant distribution unit", "Pumps and a heat exchanger for the rack loop"],
  ["coolers", "Dry coolers", "Sealed loop on the roof; no evaporative water use"],
  ["network", "Network and fiber", "Links the racks to each other and to the outside"],
  ["fire", "Fire suppression", "Clean-agent system, safe for electronics"],
];
const legendList = document.getElementById("legend-list");
const pins = LEGEND.map(([id, title, detail], i) => {
  const a = cut.anchors.find(x => x.id === id);
  const pin = document.createElement("div"); pin.className = "pin"; pin.textContent = i + 1; pin.setAttribute("aria-hidden", "true"); labelsEl.appendChild(pin);
  const li = document.createElement("li"); li.innerHTML = "<b></b><div><strong></strong><span></span></div>";
  li.querySelector("b").textContent = i + 1; li.querySelector("strong").textContent = title; li.querySelector("span").textContent = detail; legendList.appendChild(li);
  li.addEventListener("pointerenter", () => pin.classList.add("hl")); li.addEventListener("pointerleave", () => pin.classList.remove("hl"));
  return { a, pin };
});
let camInit = false, key = "", center = new THREE.Vector3(), fans = [], gpos = [], mpos = [], bpos = [];
const counts = document.getElementById("counts");
const clock = new THREE.Clock();
let dead = false;
function fallback2D(msg){ dead = true; SC.mode3d = false; window.__gl3d = false; const iso = document.getElementById("iso"); if (iso) iso.style.display = ""; renderer.domElement.style.display = "none"; glNote(msg); }
renderer.domElement.addEventListener("webglcontextlost", e => { e.preventDefault(); fallback2D("3D view stopped: the graphics context was lost. Showing the flat model."); });
function frame() {
  if (dead) return;
  requestAnimationFrame(frame);
  try { frameInner(); } catch (e) { fallback2D("3D view unavailable: " + (e && e.message ? e.message : e) + ". Showing the flat model."); }
}
function frameInner() {
  const rawDt = clock.getDelta(), dt = Math.min(.05, rawDt), rdt = Math.min(.25, rawDt), t = clock.elapsedTime;
  const R = SC.target; if (!R) return;
  if (SC.src !== curSrc) { if (srcG) scene.remove(srcG); srcG = buildSource(SC.src); scene.add(srcG); curSrc = SC.src; }
  // up to 40 modules stand in the open; past that they are housed in halls of 12 (the last hall holds the rest)
  const hall = R.halls > HALL_AT, nHall = Math.ceil(R.halls / PER_HALL), lastN = R.halls - (nHall - 1) * PER_HALL;
  const nG = Math.min(R.gens, MAX_G), nM = hall ? nHall : Math.min(R.halls, MAX_M), nB = Math.max(1, Math.min(12, Math.ceil(R.mw / 4)));
  const gs = Math.max(1, Math.cbrt(R.genMW / 2.5)); // a larger engine is drawn larger
  const k = nG + "|" + nM + "|" + nB + "|" + gs + "|" + (hall ? "h" + lastN : "m");
  if (k !== key) {
    key = k; const P = layout(nG, nM, nB, gs, hall); gpos = P.gp; mpos = P.mp; bpos = P.bp;
    if (modsG.userData.hall !== hall) { if (modOpen) closeModule(true); while (modsG.children.length) modsG.remove(modsG.children[0]); modsG.userData.hall = hall; }
    isHall = hall; if (openBtn) openBtn.hidden = hall;
    { const h = document.getElementById("hint"); if (h) { h.dataset.base = h.dataset.base || h.textContent;
        h.textContent = hall ? h.dataset.base.replace(/ · (Click|Tap) a module to open it/, "") + " · Each hall holds up to 12 modules" : h.dataset.base; } }
    { const d = document.querySelector("#r-halls + .d"); if (d) { d.dataset.base = d.dataset.base || d.textContent; d.textContent = hall ? "about 1 MW each, in " + nHall + " halls" : d.dataset.base; } }
    sync(gensG, nG, () => protoGen.clone());
    gensG.children.forEach((o, i) => { const sp = i === nG - 1; o.userData.spare = sp; o.userData.s = gs; o.scale.x = o.scale.z = gs; o.children[1].material = sp ? M.genSpare : M.gen; });
    sync(modsG, nM, i => hall ? hallOf(i === nM - 1 ? lastN : PER_HALL) : protoMod.clone()); sync(batsG, nB, () => protoBat.clone());
    if (hall) modsG.children.forEach((o, i) => { const want = i === nM - 1 ? lastN : PER_HALL; if (o.userData.n !== want) {
      const h = hallOf(want); h.position.copy(o.position); h.scale.copy(o.scale); modsG.remove(o); modsG.add(h); } });
    gensG.children.forEach((o, i) => { if (o.scale.y < .01) o.position.set(gpos[i][0], 0, gpos[i][1]); });
    modsG.children.forEach((o, i) => { if (o.scale.y < .01) o.position.set(mpos[i][0], 0, mpos[i][1]); });
    batsG.children.forEach((o, i) => { if (o.scale.y < .01) o.position.set(bpos[i][0], 0, bpos[i][1]); });
    rebuildPad();
    fans = []; site.traverse(o => { if (o.name === "fan") fans.push(o); });
    const minX = -58, maxX = L.padW + 4; span = Math.max(maxX - minX, L.depth + 40);
    center.set((minX + maxX) / 2, 0, -4);
    computeFit();
    if (modOpen && openIdx >= nM) closeModule(true);
    if (!modOpen) userCam = false;
    if (!camInit) { camInit = true; controls.target.copy(center); camera.position.copy(center).add(new THREE.Vector3(-.55, .28, .67).normalize().multiplyScalar(fitR)); }
    scene.fog.near = fitR * 1.2; scene.fog.far = fitR * 4;
    const cap = (R.gens > MAX_G || (!hall && R.halls > MAX_M)) ? " · model shows the first phase" : "", inH = hall ? " in " + nHall + " halls" : "";
    if (counts) counts.textContent = R.gens + " gensets · " + nB + " battery units · " + R.halls + " compute modules" + inH + cap;
    const mc = document.getElementById("mini-cap"); if (mc) mc.textContent = "Live model · " + R.gens + " gensets · " + R.halls + " modules" + inH;
  }
  if (!visible) return;
  const ease = 1 - Math.pow(.002, dt);
  const place = (grp, pos) => grp.children.forEach((o, i) => { const p = pos[i]; if (!p) return; o.position.x += (p[0] - o.position.x) * ease; o.position.z += (p[1] - o.position.z) * ease; const s = o.userData.s || 1; o.scale.y += (s - o.scale.y) * ease * .8; });
  place(gensG, gpos); place(modsG, mpos); place(batsG, bpos);
  fans.forEach(f => f.rotation.z += f.userData.w * dt);
  // module lights breathe slowly, each group out of step, like racks at work
  { const k = dark ? 1 : .3; M.act0.emissiveIntensity = k * (2.2 + 1.6 * Math.sin(t * 1.7));
    M.act1.emissiveIntensity = k * (2.2 + 1.6 * Math.sin(t * 2.3 + 2.1)); M.act2.emissiveIntensity = k * (2.2 + 1.6 * Math.sin(t * 1.3 + 4.2));
    M.band.emissiveIntensity = k * (3 + .5 * Math.sin(t * .8)); }

  // camera: scripted moves, else follow the site size until the viewer takes over
  if (tw) { tw.t = Math.min(1, tw.t + rdt / tw.dur); const k = 1 - Math.pow(1 - tw.t, 3);
    controls.target.lerpVectors(tw.t0, tw.t1, k); camera.position.lerpVectors(tw.p0, tw.p1, k); if (tw.t >= 1) tw = null; }
  else if (!userCam && !modOpen) {
    controls.target.lerp(center, ease * .5);
    const off = camera.position.clone().sub(controls.target); const len = off.length();
    off.setLength(len + (fitR - len) * ease * .5); camera.position.copy(controls.target).add(off);
    if (!controls.autoRotate && (idleT += dt) > 6) controls.autoRotate = true;
  }
  if (userCam && !tw) { const tg = controls.target; tg.x = THREE.MathUtils.clamp(tg.x, -110, L.padW + 40); tg.z = THREE.MathUtils.clamp(tg.z, -L.depth / 2 - 80, L.depth / 2 + 80); tg.y = THREE.MathUtils.clamp(tg.y, 0, 25); }
  controls.update();
  shiftGoal = panelPx / 2; if (Math.abs(shiftGoal - shiftCur) > .3) { shiftCur += (shiftGoal - shiftCur) * Math.min(1, rdt * 4); applyShift(); }
  const dist = camera.position.distanceTo(controls.target), nr = THREE.MathUtils.clamp(dist * .012, .15, 2);
  if (Math.abs(nr - camera.near) / camera.near > .08) { camera.near = nr; applyShift(); }

  // module cutaway: lift the roof, drop the near wall, light the inside
  openAmt += ((modOpen ? 1 : 0) - openAmt) * Math.min(1, rdt * 2.6);
  if (openIdx >= 0) { const m = modsG.children[openIdx];
    if (!m || (!modOpen && openAmt < .004)) { if (m) m.visible = true; cut.g.visible = false; openIdx = -1; }
    else { const a = openAmt, e3 = a * a * (3 - 2 * a);
      m.visible = false; cut.g.visible = true; cut.g.position.copy(m.position); cut.g.scale.copy(m.scale);
      cut.roof.position.y = 4.6 * e3; cut.roof.position.x = 2.6 * e3; cut.near.scale.y = 1 - .86 * e3; cut.glow.intensity = 9 * e3; } }
  const sunOff = new THREE.Vector3(300, 230, -170).lerp(new THREE.Vector3(-150, 330, 120), openAmt * openAmt * (3 - 2 * openAmt));
  sun.position.copy(controls.target).add(sunOff); sun.target.position.copy(controls.target);
  { const sh = sun.shadow.camera; const e = span * .62 + (16 - span * .62) * openAmt;
    if (Math.abs(sh.right - e) > .05) { sh.left = -e; sh.right = e; sh.top = e; sh.bottom = -e; sh.near = 10; sh.far = 1600; sh.updateProjectionMatrix(); } }

  // flare flicker
  flames.forEach(f => { if (f.isSprite) { const i = f.userData.i, fl = .75 + .2 * Math.sin(t * 11 + i * 2) + .12 * Math.sin(t * 27 + i);
      f.scale.set((2.6 - i * .6) * fl, (6 - i * 1.2) * fl, 1); f.position.set(f.userData.tip.x + Math.sin(t * 3 + i) * .25, f.userData.tip.y + (2.6 - i * .5) * fl, f.userData.tip.z); f.material.opacity = i ? .55 : .95; }
    else f.intensity = (dark ? 500 : 150) * (.85 + .15 * Math.sin(t * 17)); });

  // exhaust shimmer from running gensets
  const run = gensG.children.filter(o => !o.userData.spare && o.scale.y > .9);
  puffs.forEach(p => { p.userData.life += dt;
    if (p.userData.life > 4 || !p.userData.src) { if (!run.length) { p.material.opacity = 0; return; } p.userData.life = 0; const g = run[(Math.random() * run.length) | 0];
      const k = g.userData.s || 1, q = g.userData.stack; p.userData.src = g.position.clone().add(new THREE.Vector3(q.x * k, q.y * k, q.z * k)); }
    const a = p.userData.life / 4; if (a < 0) return;
    p.position.copy(p.userData.src).add(new THREE.Vector3(a * 6, a * 9, -a * 2));
    const s = 2 + a * 9; p.scale.set(s, s, 1); p.material.opacity = (dark ? .012 : .03) * Math.sin(Math.PI * a); });

  renderer.render(scene, camera);
  if (openIdx >= 0 && cut.g.visible) { const v = new THREE.Vector3(), show = openAmt > .8 && modOpen;
    pins.forEach(({ a, pin }) => { v.setFromMatrixPosition(a.o.matrixWorld).project(camera);
      const ok = show && v.z < 1 && Math.abs(v.x) < 1.02 && Math.abs(v.y) < 1.02; pin.classList.toggle("on", ok); if (!ok) return;
      pin.style.transform = "translate(" + ((v.x * .5 + .5) * VW).toFixed(1) + "px," + ((-v.y * .5 + .5) * VH).toFixed(1) + "px)"; });
  } else pins.forEach(({ pin }) => pin.classList.remove("on"));
  if (!SC.mode3d) { SC.mode3d = true; const iso = document.getElementById("iso"); if (iso) iso.style.display = "none"; window.__gl3d = true;
    const c = document.getElementById("ctrls"), h = document.getElementById("hint"); if (c) c.hidden = false; if (h) { if (matchMedia("(pointer:coarse)").matches) h.textContent = "Two fingers to move or zoom · Tap a module to open it"; h.hidden = false; } ready = true; updateDock(); }
}
function pickModule() { let best = -1, bx = Infinity, bz = -Infinity;
  mpos.forEach((p, i) => { if (p[0] < bx - .1 || (Math.abs(p[0] - bx) < .1 && p[1] > bz)) { best = i; bx = p[0]; bz = p[1]; } }); return best; }
function openModule(i) {
  if (i < 0 || !mpos[i]) return;
  if (openIdx >= 0 && openIdx !== i) { const old = modsG.children[openIdx]; if (old) old.visible = true; openAmt = 0; }
  openIdx = i; modOpen = true; userCam = true; controls.autoRotate = false;
  hero.classList.add("open"); openBtn.textContent = "Close module";
  const c = new THREE.Vector3(mpos[i][0] + .2, 1.7, mpos[i][1] + .4), narrow = VW < 700;
  const dir = narrow ? new THREE.Vector3(-.5, .74, .45).normalize() : new THREE.Vector3(-.8, .5, .33).normalize();
  if (narrow) { c.y += 2.5; c.z -= 1.5; } else { c.y += 1.2; c.z += 1.1; }
  tweenTo(c, c.clone().add(dir.multiplyScalar(narrow ? 30 : 20)), 1.5);
}
function closeModule(instant) {
  modOpen = false; hero.classList.remove("open"); openBtn.textContent = "Look inside a module";
  userCam = false; if (instant) openAmt = 0;
  else tweenTo(center, center.clone().add(new THREE.Vector3(-.55, .28, .67).normalize().multiplyScalar(fitR)), 1.6);
}
openBtn.addEventListener("click", () => { if (modOpen) closeModule(false); else openModule(pickModule()); });
document.getElementById("zin").addEventListener("click", () => zoomBy(.7));
document.getElementById("zout").addEventListener("click", () => zoomBy(1.43));
document.getElementById("zreset").addEventListener("click", () => { if (modOpen) closeModule(false); else { userCam = false; tweenTo(center, center.clone().add(new THREE.Vector3(-.55, .28, .67).normalize().multiplyScalar(fitR)), 1.2); } });
addEventListener("keydown", e => { if (e.key === "Escape" && modOpen) closeModule(false); });

// click (not drag) on a module opens it; the pointer turns to a hand over modules
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let downAt = null, hoverQ = false;
function modAt(e) { const r = renderer.domElement.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera); const hit = ray.intersectObjects(modsG.children, true)[0]; if (!hit) return -1;
  let o = hit.object; while (o && o.parent !== modsG) o = o.parent; return o ? modsG.children.indexOf(o) : -1; }
renderer.domElement.addEventListener("pointerdown", e => { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; });
renderer.domElement.addEventListener("pointerup", e => { if (!downAt) return; const d = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y), q = performance.now() - downAt.t; downAt = null;
  if (d < 6 && q < 400 && !isHall) { const i = modAt(e); if (i >= 0 && i !== openIdx) openModule(i); } });
renderer.domElement.addEventListener("pointermove", e => { if (e.buttons || hoverQ || e.pointerType !== "mouse") return; hoverQ = true;
  requestAnimationFrame(() => { hoverQ = false; renderer.domElement.classList.toggle("pick", !isHall && modAt(e) >= 0); }); });

frame();

} catch (e) { glNote("3D view unavailable: " + (e && e.message ? e.message : e) + ". Showing the flat model."); }
})();
