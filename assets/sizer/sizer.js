/* Site model: sizing calculator and live 3D model. Built from the partner brief. */

(function(){
  "use strict";
  const $ = id => document.getElementById(id);
  const fmt = (n, d=0) => n.toLocaleString("en-US",{maximumFractionDigits:d,minimumFractionDigits:d});
  const money = n => n >= 1e6 ? "$" + fmt(n/1e6, n >= 1e7 ? 1 : 2) + "M" : "$" + fmt(Math.round(n/1000)) + "k";

  // Source modes. Slider 0-100 maps onto a log scale between lo and hi.
  const MODES = {
    lfg:   {label:"Landfill gas collected", unit:"scfm", lo:100, hi:12000, def:2000, ch4:true, hr:11000, gen:1.6, sizes:[1.6,3.3,4.5], price:2,
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
  // Gas price band for the payment range: up to $0.75 per MMBtu (under 1 cent per kWh); the real price is set in the gas agreement.
  const BANDS = {lfg:[0,0.75], gas:[0,0.75], plant:[0,0.75]}, LEASE = [1000,2000];
  const range = (lo, hi) => { const u = hi >= 1e6 ? 1e6 : 1e3, d = u === 1e6 && hi < 1e7 ? 1 : 0, s = u === 1e6 ? "M" : "k";
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
    if (tenant) tenantApply(R);
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

  /* ---------- Tenant mode: "I have servers" ----------
     Same math as /fit: IT load = servers x kW each, plus growth; site power = plan x 1.2;
     compute modules of about 1 MW. The gas flow the engines would need is then sized from site power. */
  const KW = {"8a":10.2, "8b":14.3, rack:130, inf:3.5};
  const T = {type:"8a", n:64, kw:10, dens:40, grow:1};
  let tenant = false, saved = null;
  const kwFmt = kw => kw >= 1000 ? fmt(kw/1000, kw >= 10000 ? 0 : 1) + "<small>MW</small>" : fmt(Math.round(kw)) + "<small>kW</small>";
  const nRange = () => T.type === "rack" ? [1, 48] : [4, 800];
  const nToS = n => { const r = nRange(); return 100*Math.log(Math.max(r[0], Math.min(r[1], n))/r[0])/Math.log(r[1]/r[0]); };
  const sToN = s => { const r = nRange(), v = r[0]*Math.pow(r[1]/r[0], s/100); return v < 40 ? Math.round(v) : Math.round(v/4)*4; };

  function tenantPlan(){
    const rack = T.type === "rack", per = T.type === "own" ? T.kw : KW[T.type];
    let dens = rack ? 130 : T.dens; if (!rack && per > dens) dens = per;
    const it = T.n * per, plan = it * T.grow, site = plan * 1.2;
    const perRack = rack ? 1 : Math.max(1, Math.floor(dens / per));
    return {rack, per, dens, it, plan, site, perRack, racks: rack ? T.n : Math.ceil(T.n / perRack), mods: Math.max(1, Math.ceil(plan / 1000))};
  }
  // Gas the engines would burn for this site power, in MMcf/d at 9,000 Btu/kWh and 1,037 Btu/scf.
  const flowFor = siteKW => siteKW * 9000 * 24 / (1e6 * 1037);

  function tenantApply(R){
    const p = tenantPlan();
    R.racks = p.racks; R.halls = p.mods; R.it = p.plan / 1000; R.gpus = 0;
    $("srv-out").textContent = $("hsrv-out").textContent = fmt(T.n);
    $("srv-label").textContent = $("hsrv-label").textContent = p.rack ? "How many racks" : "How many servers";
    $("kw-out").textContent = fmt(T.kw, 1).replace(/\.0$/, "") + " kW";
    $("f-dens").hidden = p.rack; $("f-kw").hidden = T.type !== "own";
    tween("t-it", p.it, v => kwFmt(v));
    $("t-it-d").textContent = T.grow > 1 ? "planned at " + kwFmt(p.plan).replace(/<\/?small>/g, " ").trim() + " with room to grow" : "the servers you bring";
    $("t-fit").textContent = p.site > 6000 ? "About " + Math.ceil(p.site / 6000) + " sites" : p.plan < 300 ? "Under one module" : "One site";
    $("t-cool").textContent = p.dens >= 80 ? "Liquid" : p.dens > 40 ? "Rear-door or liquid" : "Air";
    const rkw = p.rack ? p.per : Math.round(Math.min(p.dens, p.perRack * p.per)), rpm = Math.ceil(p.racks / p.mods);
    const cool = p.dens >= 80 ? "direct-to-chip liquid" : p.dens > 40 ? "rear-door or liquid" : "air";
    $("r-racks-d").textContent = T.grow > 1 ? "for this deployment, with space to add more" : "for this deployment";
    $("t-spr").textContent = p.rack ? "1" : fmt(p.perRack);
    $("t-spr-d").textContent = p.rack ? "one rack-scale system each" : "at " + fmt(p.per, 1).replace(/\.0$/, "") + " kW a server";
    tween("t-rkw", rkw, v => fmt(Math.round(v)) + "<small>kW</small>");
    tween("hs-rkw", rkw, v => fmt(Math.round(v)));
    $("t-cool-d").textContent = p.dens >= 80 ? "cold plates on every chip, sealed loop" : p.dens > 40 ? "heat removed at the rack" : "with hot and cold aisles";
    $("t-rpm").textContent = fmt(rpm);
    $("t-rpm-d").textContent = p.mods > 1 ? "across " + p.mods + " modules, with room to grow" : "in one module, with room to grow";
    const yb = "<strong>Your build</strong> " + fmt(p.racks) + (p.racks === 1 ? " rack" : " racks") + " at about " + rkw + " kW" +
      (p.rack ? "" : ", " + p.perRack + (p.perRack === 1 ? " server" : " servers") + " each") + ", " + cool + " cooling, in " + p.mods + (p.mods === 1 ? " module." : " modules.");
    document.querySelectorAll(".yb").forEach(el => el.innerHTML = yb);
    // the module's parts list follows the tenant's build: their racks and the cooling their density needs
    const lg = {racks: [fmt(rpm) + (rpm === 1 ? " rack" : " racks") + " for your servers",
      "About " + rkw + " kW each" + (p.rack ? ", one rack-scale system a rack" : ", " + p.perRack + (p.perRack === 1 ? " server" : " servers") + " a rack"),
      "Your servers go in these racks at the density you choose. The model draws a typical layout; the real module is laid out around your rack count, power per rack and cooling." + (p.mods > 1 ? " Your build fills " + p.mods + " modules." : "")]};
    if (p.dens < 80 && p.dens > 40) lg.manifolds = ["Rear-door heat exchangers", "A coolant coil in the back door of each rack",
      "At this density each rack gets a rear door with a coolant coil, or cold plates if your hardware has them. The door takes the heat out of the exhaust air and sends it to the coolant loop and out to the roof."];
    if (p.dens <= 40) { lg.manifolds = ["Hot and cold aisles", "Cool air in at the front, hot air contained at the back",
      "At this density the racks are air-cooled. Cool air reaches the front of each rack and the hot exhaust is contained and returned to the cooling units, so no liquid runs to your servers."];
      lg.cdu = ["Cooling units", "Cool the room air and send the heat to the roof",
      "Cooling units by the racks take the heat out of the exhaust air and hand it to a sealed loop that runs up to the dry coolers on the roof."]; }
    lg.key = JSON.stringify(lg);
    scene.tenant = {racks: p.racks, mods: p.mods, lg};
    tween("hs-mods", p.mods, v => fmt(Math.round(v)));
    ["srv","hsrv","kw"].forEach(id => { const el = $(id); el.style.setProperty("--p", ((el.value-el.min)/(el.max-el.min)*100) + "%"); });
  }
  function tenantRun(){ st.flow = flowFor(tenantPlan().site); update(); }

  function swapText(on){
    document.querySelectorAll("[data-t]").forEach(el => {
      if (el.dataset.e === undefined) el.dataset.e = el.innerHTML;
      el.innerHTML = on ? el.dataset.t : el.dataset.e;
    });
    document.querySelectorAll("[data-t-href]").forEach(el => {
      if (el.dataset.eHref === undefined) el.dataset.eHref = el.getAttribute("href");
      el.setAttribute("href", on ? el.dataset.tHref : el.dataset.eHref);
    });
  }
  function setAud(on){
    if (on === tenant) return;
    if (on) saved = {mode, flow: st.flow};
    tenant = on; if (!on) scene.tenant = null;
    scene.wantOpen = on ? 1 : -1; // servers mode opens straight into the module; energy mode closes it
    document.documentElement.classList.toggle("tenant-mode", on);
    $("aud-e").setAttribute("aria-pressed", String(!on)); $("aud-t").setAttribute("aria-pressed", String(on));
    swapText(on);
    if (on) { mode = "gas"; scene.src = MODES.gas.src; tenantRun(); }
    else if (saved) { st.flow = saved.flow; setMode(saved.mode, true); }
  }
  $("aud-e").addEventListener("click", () => setAud(false));
  $("aud-t").addEventListener("click", () => setAud(true));

  const press = (wrap, b) => wrap.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
  $("t-type").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; press($("t-type"), b);
    const wasRack = T.type === "rack"; T.type = b.dataset.v;
    if ((T.type === "rack") !== wasRack) T.n = T.type === "rack" ? 4 : 64;
    $("srv").value = $("hsrv").value = nToS(T.n); tenantRun(); });
  [["t-dens","dens"],["t-grow","grow"]].forEach(([id, key]) => $(id).addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return; press($(id), b); T[key] = +b.dataset.v; tenantRun(); }));
  ["srv","hsrv"].forEach(id => $(id).addEventListener("input", e => { $("srv").value = $("hsrv").value = e.target.value; T.n = sToN(+e.target.value); tenantRun(); }));
  $("kw").addEventListener("input", e => { T.kw = +e.target.value; tenantRun(); });
  $("srv").value = $("hsrv").value = nToS(T.n);

  // A link can open the model at a given site: ?src=lfg&flow=2214&ch4=50, or for tenants ?mode=tenant
  (function(){
    const q = new URLSearchParams(location.search), k = MODES[q.get("src")] ? q.get("src") : "gas", m = MODES[k];
    const f = parseFloat(q.get("flow")), c = parseFloat(q.get("ch4"));
    if (m.ch4 && c >= 25 && c <= 60) { st.ch4 = Math.round(c); $("ch4").value = st.ch4; }
    if (f >= m.lo && f <= m.hi) { st.flow = f; setMode(k, true); } else setMode(k);
    if (q.get("mode") === "tenant") setAud(true);
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
// A compute tray seen from above: four GPUs and two CPUs under cold plates, memory, and coolant lines to the back
const trayTopT = tex(576, 320, (g, w, h) => { g.scale(2, 2); w /= 2; h /= 2; g.fillStyle = "#1a1a1a"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "#2c2c2c"; g.lineWidth = 1; for (let x = 8; x < w; x += 9) { g.beginPath(); g.moveTo(x, 4); g.lineTo(x, h - 4); g.stroke(); }
  g.fillStyle = "#0c0c0c"; g.fillRect(0, 0, 14, h);                                         // front bezel edge
  const plate = (x, y, s) => { const gr = g.createLinearGradient(x, y, x + s, y + s); gr.addColorStop(0, "#e9e9e9"); gr.addColorStop(1, "#8f8f8f");
    g.fillStyle = gr; g.fillRect(x, y, s, s); g.strokeStyle = "#5a5a5a"; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, s - 2, s - 2);
    g.fillStyle = "#6a6a6a"; g.fillRect(x + s * .3, y + s * .42, s * .4, s * .16); };
  for (const [x, y] of [[34, 18], [34, 92], [100, 18], [100, 92]]) plate(x, y, 50);          // GPUs
  for (const [x, y] of [[178, 26], [178, 98]]) plate(x, y, 36);                              // CPUs
  g.fillStyle = "#bdbdbd"; for (let i = 0; i < 6; i++) { g.fillRect(222, 14 + i * 7, 24, 3); g.fillRect(222, 88 + i * 7, 24, 3); } // memory
  g.lineWidth = 4; g.lineCap = "round";
  for (const [y, c] of [[44, "#f2f2f2"], [52, "#7a7a7a"], [118, "#f2f2f2"], [126, "#7a7a7a"]]) { g.strokeStyle = c; g.beginPath(); g.moveTo(84, y); g.lineTo(100, y); g.moveTo(150, y); g.lineTo(178, y); g.moveTo(214, y); g.lineTo(272, y); g.stroke(); }
  g.fillStyle = "#cfcfcf"; for (const y of [40, 56, 114, 130]) g.fillRect(272, y - 4, 12, 8);   // quick disconnects at the back
});
const trayFrontT = tex(128, 16, (g, w, h) => { g.fillStyle = "#151515"; g.fillRect(0, 0, w, h); g.fillStyle = "#050505"; for (let x = 6; x < w - 26; x += 5) g.fillRect(x, 3, 3, h - 6);
  g.fillStyle = "#4a4a4a"; g.fillRect(w - 22, 3, 6, h - 6); g.fillStyle = "#fff"; g.fillRect(w - 12, 6, 3, 3); g.fillRect(w - 7, 6, 3, 3); });
const switchFrontT = tex(128, 16, (g, w, h) => { g.fillStyle = "#262626"; g.fillRect(0, 0, w, h); g.fillStyle = "#050505";
  for (let x = 8; x < w - 20; x += 6) { g.fillRect(x, 3, 4, 4); g.fillRect(x, 9, 4, 4); } g.fillStyle = "#fff"; for (let x = 9; x < w - 20; x += 12) g.fillRect(x, 1, 2, 1); g.fillRect(w - 10, 6, 3, 3); });
const psuFrontT = tex(128, 16, (g, w, h) => { g.fillStyle = "#1c1c1c"; g.fillRect(0, 0, w, h); g.fillStyle = "#080808"; for (let x = 6; x < w - 30; x += 4) g.fillRect(x, 3, 2, h - 6);
  g.fillStyle = "#6a6a6a"; g.fillRect(w - 26, 4, 12, h - 8); g.fillStyle = "#fff"; g.fillRect(w - 9, 6, 3, 3); });
// coolant moving through the tray lines, redrawn each frame while a rack is open (supply one way, return the other)
const flowC = document.createElement("canvas"); flowC.width = 576; flowC.height = 320; const flowG = flowC.getContext("2d");
const flowT = new THREE.CanvasTexture(flowC); flowT.encoding = THREE.sRGBEncoding;
function drawFlow(t) { const g = flowG; g.clearRect(0, 0, 576, 320); g.save(); g.scale(2, 2); g.lineWidth = 2.2; g.lineCap = "round";
  for (const [y, dir] of [[44, 1], [52, -1], [118, 1], [126, -1]]) { g.strokeStyle = dir > 0 ? "rgba(255,255,255,.95)" : "rgba(200,200,200,.75)"; g.setLineDash([5, 9]); g.lineDashOffset = -dir * t * 26;
    g.beginPath(); g.moveTo(84, y); g.lineTo(100, y); g.moveTo(150, y); g.lineTo(178, y); g.moveTo(214, y); g.lineTo(272, y); g.stroke(); }
  g.restore(); flowT.needsUpdate = true; }
Object.assign(M, {
  rack: std({ color: 0xffffff, map: rackT, emissiveMap: rackE, emissive: 0xffffff, emissiveIntensity: 1.4, metalness: .5, roughness: .45 }),
  rackBody: std({ color: 0x141414, metalness: .5, roughness: .5 }),
  floor: std({ color: 0xbdbdbd, roughness: .7, metalness: .1, map: rep(tileT, 3, 12) }),
  lining: std({ color: 0xc4c4c4, roughness: .85, metalness: .05 }),
  panel: std({ color: 0xffffff, map: panelT, roughness: .5, metalness: .2 }),
  hot: std({ color: 0x8a8a8a, metalness: .85, roughness: .3 }),
  cold: std({ color: 0xe6e6e6, metalness: .6, roughness: .3 }),
  screen: std({ color: 0x111111, emissive: 0xffffff, emissiveIntensity: .9 }),
  trayBody: std({ color: 0x2a2a2a, metalness: .6, roughness: .4 }),
  trayTop: std({ color: 0xffffff, map: trayTopT, metalness: .35, roughness: .45, emissive: 0xffffff, emissiveIntensity: .08, emissiveMap: trayTopT }),
  switchFront: std({ color: 0xffffff, map: switchFrontT, emissiveMap: switchFrontT, emissive: 0xffffff, emissiveIntensity: .7, metalness: .4, roughness: .5 }),
  psuFront: std({ color: 0xffffff, map: psuFrontT, emissiveMap: psuFrontT, emissive: 0xffffff, emissiveIntensity: .5, metalness: .4, roughness: .5 }),
  flow: new THREE.MeshBasicMaterial({ map: flowT, transparent: true, depthWrite: false, toneMapped: false }),
  trayFront: std({ color: 0xffffff, map: trayFrontT, emissiveMap: trayFrontT, emissive: 0xffffff, emissiveIntensity: .6, metalness: .4, roughness: .5 }),
});
function makeCutaway() {
  const g = new THREE.Group(); const L = 12.2, W = 3.0, H = 3.2, y0 = .35, tw = .08;
  const inner = new THREE.Group(), near = new THREE.Group(), roof = new THREE.Group(); g.add(inner, near, roof);
  const anchors = [];
  const tag = (p, x, y, z, id) => { const o = new THREE.Object3D(); o.position.set(x, y, z); p.add(o); anchors.push({ o, id }); };
  // mark every mesh a block of code adds to p as one part, for hover and highlight
  const part = (p, id, fn, extra) => { const n = p.children.length; fn(); for (let i = n; i < p.children.length; i++) Object.assign(p.children[i].userData, { part: id }, extra); };
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
  part(roof, "coolers", () => {
    B(W, .12, L, M.mod, 0, y0 + H - .06, 0, roof);
    B(W - .2, .5, L - .4, M.galv, 0, y0 + H + .25, 0, roof);
    for (let i = 0; i < 4; i++) { const z = -L / 2 + 1.5 + i * 3.05; B(W - .3, .9, 2.7, M.steel, 0, y0 + H + .95, z, roof); fan(.95, 0, y0 + H + 1.42, z, roof); }
    const rp = C(.12, .12, L - 1, M.steel, W / 2 - .3, y0 + H + .62, 0, roof, 10); rp.rotation.x = Math.PI / 2;
    for (const [x, m] of [[1.05, M.cold], [1.25, M.hot]]) C(.09, .09, .9, m, x, y0 + H - .3, -2.5, roof, 12);
  });
  tag(roof, 0, y0 + H + 1.5, 1.6, "coolers");
  // floor
  B(W - 2 * tw, .04, L - 2 * tw, M.floor, 0, y0 + .02, 0, inner, false);
  // electrical room (-z end) with partition and doorway on the aisle side
  part(inner, "power", () => { for (let i = 0; i < 3; i++) { const z = -5.55 + i * .82; B(.8, 2.2, .8, M.panel, .95, y0 + 1.1, z, inner); B(.02, .35, .5, M.screen, .54, y0 + 1.6, z, inner, false); } });
  B(W - 1.25, H - .1, .06, M.lining, .62, y0 + (H - .1) / 2, -3.3, inner);
  B(1.17, H - 2.2, .06, M.lining, -.95, y0 + 2.2 + (H - 2.2) / 2 - .05, -3.3, inner);
  tag(inner, .55, y0 + 2.2, -4.7, "power");
  // busway over the rack row, with a tap-off box per rack
  part(inner, "power", () => { B(.16, .14, 7.6, M.galv, .3, y0 + 2.78, -.9, inner);
    for (let i = 0; i < 8; i++) { B(.22, .26, .22, M.galv, .3, y0 + 2.58, -1.6 + i * .6, inner); C(.025, .025, .25, M.black, .3, y0 + 2.38, -1.6 + i * .6, inner, 6); } });
  // coolant distribution unit
  part(inner, "cdu", () => { B(1.2, 2.2, 1.0, M.white, .3, y0 + 1.1, -2.5, inner); B(.02, .3, .45, M.screen, -.31, y0 + 1.65, -2.5, inner, false);
    B(.02, .7, .8, M.louvre, -.31, y0 + .6, -2.5, inner, false);
    for (const [x, m] of [[1.05, M.cold], [1.25, M.hot]]) C(.09, .09, H - 2.5, m, x, y0 + 2.2 + (H - 2.5) / 2, -2.5, inner, 12); });
  tag(inner, -.3, y0 + 1.9, -2.5, "cdu");
  // eight AI racks, fronts facing the aisle (-x)
  const faces = [];
  for (let i = 0; i < 8; i++) { const z = -1.6 + i * .6;
    part(inner, "racks", () => { B(1.2, 2.3, .58, M.rackBody, .3, y0 + 1.15, z, inner);
      const f = mesh(new THREE.PlaneGeometry(.56, 2.28), M.rack, -.305, y0 + 1.15, z, inner, false); f.rotation.y = -Math.PI / 2; faces.push(f); }, { rack: i });
    // rear manifolds: supply and return to the cold plates
    part(inner, "manifolds", () => { C(.035, .035, 2.1, M.cold, 1.0, y0 + 1.15, z - .12, inner, 8); C(.035, .035, 2.1, M.hot, 1.0, y0 + 1.15, z + .12, inner, 8); });
  }
  tag(inner, -.31, y0 + 2.45, .2, "racks");
  // headers from the CDU along the backs of the racks
  part(inner, "manifolds", () => { for (const [x, y, m] of [[1.12, y0 + .22, M.cold], [1.26, y0 + .22, M.hot], [1.12, y0 + 2.3, M.cold], [1.26, y0 + 2.3, M.hot]]) {
    const p = C(.06, .06, 5.4, m, x, y, -.4, inner, 10); p.rotation.x = Math.PI / 2; } });
  tag(inner, 1.15, y0 + 1.2, 2.55, "manifolds");
  // network cabinet and fiber tray
  part(inner, "network", () => { B(1.0, 2.1, .6, M.black, .4, y0 + 1.05, 3.6, inner); B(.02, 1.4, .4, M.screen, -.11, y0 + 1.2, 3.6, inner, false);
    B(.32, .05, 8.8, M.galv, -.95, y0 + 2.95, -.2, inner); B(.2, .06, 8.6, M.white, -.95, y0 + 2.99, -.2, inner, false); });
  tag(inner, -.1, y0 + 2.1, 3.6, "network");
  // fire suppression cylinders
  part(inner, "fire", () => { for (const z of [5.2, 5.6]) { C(.17, .17, 1.4, M.white, 1.15, y0 + .7, z, inner, 16); C(.08, .08, .18, M.dark, 1.15, y0 + 1.49, z, inner, 10); }
    C(.03, .03, 9.5, M.galv, -.3, y0 + 3.0, .6, inner, 6).rotation.x = Math.PI / 2; });
  tag(inner, 1.0, y0 + 1.4, 5.4, "fire");
  // one rack that opens on hover: its front door swings out and compute trays slide toward the aisle
  const rk = new THREE.Group(); rk.visible = false; inner.add(rk);
  const door = new THREE.Group(); door.position.set(-.305, y0 + 1.15, -.28); rk.add(door);
  { const f = mesh(new THREE.PlaneGeometry(.56, 2.28), M.rack, 0, 0, .28, door, false); f.rotation.y = -Math.PI / 2; }
  const trays = [], rh = (2.28 - 2 * 2.28 * 18 / 512) / RACK_ROWS.length, top = y0 + 1.15 + 1.14 - 2.28 * 18 / 512, kAnch = {};
  const ka = (p, x, y, z, id) => { const o = new THREE.Object3D(); o.position.set(x, y, z); p.add(o); kAnch[id] = o; };
  let nc = 0;
  RACK_ROWS.forEach((k, r) => {
    const y = top - (r + .5) * rh, front = k === "c" ? M.trayFront : k === "s" ? M.switchFront : M.psuFront;
    const t = new THREE.Mesh(new THREE.BoxGeometry(.9, rh * .86, .5), [M.trayBody, front, k === "c" ? M.trayTop : M.trayBody, M.trayBody, M.trayBody, M.trayBody]);
    t.castShadow = false; t.receiveShadow = true; t.position.set(.16, y, 0); t.userData.sub = k === "c" ? "compute" : k === "s" ? "switch" : "power"; rk.add(t);
    if (r === 17) ka(rk, -.3, y, 0, "switch");
    if (r === 31) ka(rk, -.3, y, -.1, "power");
    if (k !== "c") return;
    const hero = r === 3 || r === 22, mid = r === 12 || r === 26;
    if (hero || mid) { const f = mesh(new THREE.PlaneGeometry(.9, .5), M.flow, 0, rh * .43 + .003, 0, t, false); f.rotation.x = -Math.PI / 2; f.renderOrder = 3; f.userData.sub = "cooling"; }
    if (r === 22) ka(t, -.18, rh * .45, -.08, "compute");
    if (r === 3) ka(t, .38, rh * .45, .06, "cooling");
    trays.push({ t, out: hero ? .78 : mid ? .42 : .07, deep: hero ? .84 : mid ? .6 : .1, lag: nc++ * .025 }); });
  rk.traverse(o => { if (o.isMesh) Object.assign(o.userData, { part: "racks" }); });
  const rackKit = { g: rk, door, trays, faces, idx: -1, want: -1, amt: 0, full: false, anchors: kAnch };
  // ceiling lights over the aisle
  B(.06, .03, 10.5, M.led, -.95, y0 + H - .25, 0, inner, false);
  const glow = new THREE.PointLight(0xffffff, 0, 12, 2); glow.position.set(-.5, y0 + 2.6, 0); g.add(glow);
  g.traverse(o => { if (o.isMesh && o.parent === roof) o.castShadow = false; });
  return { g, inner, near, roof, anchors, glow, rackKit };
}

/* ---------- gas sources (outside the fence, at negative x) ---------- */
/* ---------- landfill: three terraces with benches, a crowned grass cap, a switchback haul road,
   gas wells on a grid with laterals and headers to the blower and flare, perimeter road, ditch,
   stormwater pond, fence, and the active working face with a dozer, compactor and dump truck.
   Built at local (0,0), placed at world x = CX. One mesh for the ground, merged meshes for the kit. ---------- */
function landfill(g, CX, M, mesh) {
  var BASE = .9, AX = 44, AZ = 40, RS = 40, TIERS = 3, RUN = 6.5, BENCH = 2.2, RISE = 4.4, P = RUN + BENCH, TOP = TIERS * P - BENCH;
  var FX = 56, FXW = 64, FZ = 52, FZS = 60, GATE = [55.6, -20]; // fence: wider on the west and south for the pond
  var POND = { x: -49, z: 41, hx: 6.5, hz: 4.6 }, WF = { x: -17, z: 7, r: 8.5 };
  if (!M.lfCap) {
    var gr = M.ground.map.clone(); gr.needsUpdate = true; gr.repeat.set(1, 1);
    M.lfCap = new THREE.MeshStandardMaterial({ color: 0xc4c4c4, roughness: 1, map: M.mound.map, bumpMap: M.mound.bumpMap, bumpScale: 1.2, vertexColors: true });
    M.lfRoad = new THREE.MeshStandardMaterial({ color: 0xbdbdbd, roughness: 1, map: gr, bumpMap: gr, bumpScale: .4, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    M.lfWater = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: .18, metalness: .2 });
    M.lfSoil = new THREE.MeshStandardMaterial({ color: 0x3c3c3c, roughness: 1, flatShading: true });
    M.lfPipe = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: .55, metalness: .1 }); // black HDPE
    [M.lfCap, M.lfRoad, M.lfWater, M.lfSoil, M.lfPipe].forEach(function (m) { m.envMapIntensity = M.mound.envMapIntensity; });
  }
  function q4(v) { v *= v; return v * v; }
  function sn(x, z, ax, az) { return Math.pow(q4(Math.abs(x) / ax) + q4(Math.abs(z) / az), .25); }
  function inward(x, z) { return (1 - sn(x, z, AX, AZ)) * RS; }
  function ss(t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); }
  function nz(x, z) { return Math.sin(x * .31 + z * .17) * Math.sin(z * .23 - x * .11) * .6 + Math.sin(x * 1.3 + z * .9) * Math.sin(z * 1.1 - x * .7) * .4; }
  function prof(s) {
    if (s >= -2.6) return BASE + (s < 0 ? 0 : s >= TOP ? TIERS * RISE + Math.min(1.6, (s - TOP) * .11) : tier(s)); // toe road, slopes and benches, crowned cap
    if (s > -8) { var u = (s + 8) / 5.4; return u < .3 ? .45 * (1 - ss(u / .3)) : u < .5 ? .02 : BASE * ss((u - .5) / .5); } // perimeter ditch
    return s > -10.5 ? .45 * Math.sin((s + 10.5) / 2.5 * Math.PI / 2) : 0;                                  // its outer berm
  }
  function tier(s) {
    var k = Math.floor(s / P), r = s - k * P, t = Math.min(1, r / RUN);
    return k * RISE + RISE * (.4 * t + .6 * ss(t));                                                   // slope, then flat bench
  }
  function pondSdf(x, z) { var dx = Math.abs(x - POND.x) - POND.hx + 2, dz = Math.abs(z - POND.z) - POND.hz + 2;
    return Math.hypot(Math.max(dx, 0), Math.max(dz, 0)) + Math.min(Math.max(dx, dz), 0) - 2; }
  function baseH(x, z) {
    var h = prof(inward(x, z)), pd = pondSdf(x, z);
    if (pd < 2.5) { var rim = pd < -1 ? .02 : pd < .8 ? .02 + 1.08 * ss((pd + 1) / 1.8) : 1.1 * (1 - ss((pd - .8) / 1.7)); h = pd < .8 ? rim : Math.max(h, rim); } // stormwater pond and its berm
    var wd = Math.hypot(x - WF.x, z - WF.z); if (wd < WF.r) h += (1 - ss((wd - WF.r * .55) / (WF.r * .4))) * (1.1 + .3 * nz(x * 2.3, z * 2.3)); // today's lift of fresh fill
    return h;
  }
  // haul road: three switchback legs up the south face, then across the cap to the working face
  function faceZ(x, s) { var n = 1 - s / RS, v = q4(n) - q4(Math.abs(x) / AX); return AZ * Math.pow(Math.max(v, 1e-6), .25); }
  var road = [], legX = [[12, -6], [-6, 12], [12, -6]];
  legX.forEach(function (L, k) {
    var s0 = k * P - 1.2, s1 = k * P + RUN + 1.2, y0 = prof(s0), y1 = prof(s1);
    for (var i = k ? 1 : 0; i <= 18; i++) { var t = i / 18, x = L[0] + (L[1] - L[0]) * t, s = s0 + (s1 - s0) * t; road.push([x, faceZ(x, s), y0 + (y1 - y0) * t]); }
  });
  var e = road[road.length - 1];
  for (var i = 1; i <= 10; i++) { var t = i / 10, x = e[0] + (WF.x + 4 - e[0]) * t, z = e[1] + (WF.z + 3 - e[1]) * t; road.push([x, z, baseH(x, z)]); }
  var gateRd = [[GATE[0] + 1, GATE[1], 0], [AX - 1, GATE[1], BASE]];
  function nearSeg(pts, x, z) { // distance to a polyline in plan, and the polyline height there
    var best = 1e9, by = 0;
    for (var i = 0; i < pts.length - 1; i++) { var a = pts[i], b = pts[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1;
      var t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)), px = a[0] + dx * t, pz = a[1] + dz * t, d = Math.hypot(x - px, z - pz);
      if (d < best) { best = d; by = a[2] + (b[2] - a[2]) * t; } }
    return [best, by];
  }
  function H(x, z) {
    var h = baseH(x, z);
    if (x > -24 && x < 16 && z > 4) { var r = nearSeg(road, x, z); if (r[0] < 3.4) h += (r[1] - h) * (1 - ss((r[0] - 1.5) / 1.9)); }
    if (x > AX - 4 && Math.abs(z - GATE[1]) < 4) { var r2 = nearSeg(gateRd, x, z); if (r2[0] < 3.4) h += (r2[1] - h) * (1 - ss((r2[0] - 1.5) / 1.9)); }
    return h;
  }
  // the ground: one heightfield, its edge pulled in to a rounded line just outside the fence
  var geo = new THREE.PlaneGeometry(FX + FXW + 6, FZ + FZS + 6, 160, 150); geo.rotateX(-Math.PI / 2); geo.translate((FX - FXW) / 2, 0, (FZS - FZ) / 2);
  var pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  for (var vi = 0; vi < pos.count; vi++) {
    var x = pos.getX(vi), z = pos.getZ(vi), fn = sn(x, z, x < 0 ? FXW : FX, z > 0 ? FZS : FZ);
    if (fn > 1.015) { x *= 1.015 / fn; z *= 1.015 / fn; pos.setX(vi, x); pos.setZ(vi, z); }
    var s = inward(x, z), h = H(x, z), c;
    if (s >= TOP) c = 1.06 + .06 * (Math.sin(x * 1.05 + z * .12) > 0 ? 1 : -1);           // mowed cap, striped
    else if (s >= 0) c = .94 + .56 * ss(((s - Math.floor(s / P) * P) - RUN) / .7);       // grass slopes, gravel benches
    else c = .95 + (.5 - .95) * ss((s + 8.6) / 1.2) + (1.15 - .5) * ss((s + 3.2) / 1.2);  // grass, ditch, toe road
    c += .07 * nz(x, z);
    if (s > -3 && s < TOP && (Math.abs(Math.abs(x) - 26) < .8 && Math.abs(z) > 14 || Math.abs(Math.abs(z) - 22) < .8 && Math.abs(x) > 16) && !(z > 0 && x > -8 && x < 14)) c = 1.3 + .15 * nz(x * 5, z * 5); // riprap downchutes
    var wd = Math.hypot(x - WF.x, z - WF.z); if (wd < WF.r * 1.15) { var w = 1 - ss((wd - WF.r * .6) / (WF.r * .4)); c += (.26 + .1 * nz(x * 3, z * 3) - c) * w; }
    var pd = pondSdf(x, z); if (pd < 1.4) c = pd < -1 ? .35 : 1.3 + .15 * nz(x * 4, z * 4);
    pos.setY(vi, h + .06); col[vi * 3] = col[vi * 3 + 1] = col[vi * 3 + 2] = c;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  mesh(geo, M.lfCap, CX, 0, 0, g);
  // water in the pond
  var wp = mesh(new THREE.PlaneGeometry(POND.hx * 2 - 1, POND.hz * 2 - 1), M.lfWater, CX + POND.x, .42, POND.z, g, false); wp.rotation.x = -Math.PI / 2;
  // roads as gravel ribbons laid on the ground
  function ribbon(pts, w, closed) {
    var n = pts.length, v = [], uv = [], idx = [], along = 0;
    for (var i = 0; i < n; i++) {
      var a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      var tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1, nx = -tz / l * w / 2, nzz = tx / l * w / 2;
      if (i) along += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      [[1, 0], [-1, 1]].forEach(function (sd) { var px = pts[i][0] + nx * sd[0], pz = pts[i][1] + nzz * sd[0]; v.push(px, H(px, pz) + .16, pz); uv.push(sd[1] * w / 6, along / 6); });
    }
    for (var j = 0; j < (closed ? n : n - 1); j++) { var a0 = j * 2, b0 = ((j + 1) % n) * 2; idx.push(a0, b0, a0 + 1, a0 + 1, b0, b0 + 1); }
    var rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); rg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    rg.setIndex(idx); rg.computeVertexNormals(); return mesh(rg, M.lfRoad, CX, 0, 0, g, false);
  }
  function contour(nrm, ax, az, step, axw, azs) { // points round a rounded square, about `step` apart (axw, azs: west and south half-widths)
    axw = axw || ax; azs = azs || az;
    var out = [], N = Math.round(2 * Math.PI * Math.max(ax, az) * nrm * 1.08 / step);
    for (var i = 0; i < N; i++) { var t = i / N * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
      out.push([(c < 0 ? axw : ax) * nrm * Math.sign(c) * Math.sqrt(Math.abs(c)), (s > 0 ? azs : az) * nrm * Math.sign(s) * Math.sqrt(Math.abs(s))]); }
    return out;
  }
  ribbon(road, 2.6, false);
  ribbon(contour(1 + 1.3 / RS, AX, AZ, 1.6), 2.4, true);
  ribbon(gateRd, 2.8, false);
  // gas wells: a grid on the cap, and rows along the two benches
  var wells = [], near = function (x, z, d) { return nearSeg(road, x, z)[0] < d; };
  for (var gx = -16; gx <= 18; gx += 6.5) for (var gz = -16; gz <= 16; gz += 6.5) {
    if (inward(gx, gz) > TOP + 2 && Math.hypot(gx - WF.x, gz - WF.z) > WF.r + 1.5 && !near(gx, gz, 2.5)) wells.push([gx, gz]);
  }
  var benchRings = [];
  [1, 2].forEach(function (k) {
    var nb = 1 - (k * P - BENCH / 2) / RS, ring = contour(nb, AX, AZ, 1.8);
    benchRings.push(contour(1 - (k * P - BENCH + .5) / RS, AX, AZ, 1.8));
    ring.forEach(function (p, i) { if (i % 6 === 0 && !near(p[0], p[1], 3.5) && Math.hypot(p[0] - WF.x, p[1] - WF.z) > WF.r + 2) wells.push(p); });
  });
  var gP = [], gD = [];
  wells.forEach(function (w) { var y = H(w[0], w[1]);
    var a = new THREE.CylinderGeometry(.17, .17, 1.15, 8); a.translate(w[0], y + .57, w[1]); gP.push(a);
    var b = new THREE.CylinderGeometry(.26, .26, .26, 8); b.translate(w[0], y + 1.2, w[1]); gD.push(b);
    var c = new THREE.BoxGeometry(.5, .14, .14); c.translate(w[0] + .2, y + .85, w[1]); gD.push(c); });
  var MG = THREE.BufferGeometryUtils.mergeBufferGeometries;
  mesh(MG(gP), M.white, CX, 0, 0, g); mesh(MG(gD), M.dark, CX, 0, 0, g);
  // pipes: laterals along each row of cap wells into a header, bench header rings, and the main header to the blower
  function onGround(pts, lift) { return pts.map(function (p) { return new THREE.Vector3(p[0], H(p[0], p[1]) + lift, p[1]); }); }
  function dense(a, b, step) { var n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)), o = []; for (var i = 0; i <= n; i++) o.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]); return o; }
  var tubes = [], HX = -1e9, rows = {};
  wells.forEach(function (w) { if (inward(w[0], w[1]) > TOP) { HX = Math.max(HX, w[0]); (rows[w[1]] = rows[w[1]] || []).push(w[0]); } });
  HX += 2; var zs = Object.keys(rows).map(Number).sort(function (a, b) { return a - b; });
  zs.forEach(function (z) { var x0 = Math.min.apply(null, rows[z]); tubes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(onGround(dense([x0, z], [HX, z], 1.5), .32)), 24, .13, 6)); });
  if (zs.length) tubes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(onGround(dense([HX, zs[0]], [HX, zs[zs.length - 1]], 1.5), .36)), 30, .22, 6));
  benchRings.forEach(function (r) { tubes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(onGround(r, .32), true), r.length * 2, .17, 6, true)); });
  var main = onGround(dense([HX, 0], [AX + 2, 0], 1), .4);
  main.push(new THREE.Vector3(AX + 5, 1.2, 0), new THREE.Vector3(50, 1.2, 0));
  tubes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(main), 60, .3, 8));
  mesh(MG(tubes), M.lfPipe, CX, 0, 0, g);
  // fence round the property, with a gate on the road in
  var fpts = contour(1, FX, FZ, 2.4, FXW, FZS), fv = [], fuv = [], fidx = [], posts = [], run = 0;
  for (var fi = 0; fi < fpts.length; fi++) {
    var p0 = fpts[fi], p1 = fpts[(fi + 1) % fpts.length], mx = (p0[0] + p1[0]) / 2, mz = (p0[1] + p1[1]) / 2, l = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    var pc = new THREE.CylinderGeometry(.07, .07, 2.3, 5); pc.translate(p0[0], 1.15 + H(p0[0], p0[1]), p0[1]); posts.push(pc);
    if (Math.hypot(mx - GATE[0], mz - GATE[1]) < 3.2) { run += l; continue; }
    var b0 = fv.length / 3, y0 = H(p0[0], p0[1]), y1 = H(p1[0], p1[1]);
    fv.push(p0[0], y0 + .05, p0[1], p1[0], y1 + .05, p1[1], p0[0], y0 + 2.2, p0[1], p1[0], y1 + 2.2, p1[1]);
    fuv.push(run / 1.2, 0, (run + l) / 1.2, 0, run / 1.2, 1.8, (run + l) / 1.2, 1.8); run += l;
    fidx.push(b0, b0 + 1, b0 + 2, b0 + 2, b0 + 1, b0 + 3);
  }
  var fg = new THREE.BufferGeometry(); fg.setAttribute("position", new THREE.Float32BufferAttribute(fv, 3)); fg.setAttribute("uv", new THREE.Float32BufferAttribute(fuv, 2));
  fg.setIndex(fidx); fg.computeVertexNormals(); mesh(fg, M.fence, CX, 0, 0, g, false);
  mesh(MG(posts), M.galv, CX, 0, 0, g);
  // the working face: dumped loads, a dozer pushing, a compactor, a truck tipping
  function machine(x, z, ry, parts) { var m = new THREE.Group(); m.position.set(CX + x, H(x, z), z); m.rotation.y = ry; g.add(m);
    parts.forEach(function (q) { var o = mesh(q[0], q[1], q[2], q[3], q[4], m); if (q[5]) o.rotation.set(q[5], 0, q[6] || 0); }); return m; }
  var BX = function (w, h, d) { return new THREE.BoxGeometry(w, h, d); };
  machine(WF.x - 2, WF.z + 1.5, .6, [[BX(.5, .75, 3.1), M.dark, -1.05, .37, 0], [BX(.5, .75, 3.1), M.dark, 1.05, .37, 0], [BX(1.7, 1.1, 2.6), M.white, 0, 1.2, -.1],
    [BX(1.2, 1.0, 1.1), M.white, 0, 2.2, -.6], [BX(1.25, .45, 1.15), M.black, 0, 2.3, -.6], [BX(2.8, 1.0, .22), M.steel, 0, .6, 1.75]]);
  var wh = function () { var c = new THREE.CylinderGeometry(.72, .72, .62, 12); c.rotateZ(Math.PI / 2); return c; };
  machine(WF.x + 2.5, WF.z - 2.5, -.9, [[wh(), M.steel, -1.05, .72, 1.1], [wh(), M.steel, 1.05, .72, 1.1], [wh(), M.steel, -1.05, .72, -1.2], [wh(), M.steel, 1.05, .72, -1.2],
    [BX(1.5, 1.1, 2.9), M.white, 0, 1.35, 0], [BX(1.1, 1.0, 1.0), M.white, 0, 2.4, -.3], [BX(1.15, .45, 1.05), M.black, 0, 2.5, -.3], [BX(2.6, .8, .2), M.steel, 0, .55, 2.0]]);
  machine(WF.x + 3.5, WF.z + 4.5, 2.3, [[BX(2.1, 1.7, 1.7), M.white, 0, 1.25, 2.1], [BX(2.12, .5, 1.72), M.black, 0, 1.6, 2.1], [BX(2.0, .4, 5.6), M.dark, 0, .55, .3],
    [BX(2.3, 1.3, 3.6), M.galv, 0, 1.75, -.6, -.32], [wh(), M.dark, -1.05, .5, 2.1], [wh(), M.dark, 1.05, .5, 2.1], [wh(), M.dark, -1.05, .5, -1.5], [wh(), M.dark, 1.05, .5, -1.5]]);
  [[-1, -1, .9], [1.5, 2.5, .8], [-3.5, -.5, .7], [0, 3.8, .65], [-4, 3, .85], [-5.5, 1.2, .6], [-2, 5.2, .7], [3.2, .6, .6], [-6, -2.6, .75], [1, -4.2, .6]].forEach(function (l) {
    var x = WF.x + l[0], z = WF.z + l[1], s = mesh(new THREE.SphereGeometry(1, 7, 5), M.lfSoil, CX + x, H(x, z), z, g); s.scale.set(l[2] * 1.3, l[2] * .55, l[2] * 1.1); s.rotation.y = l[0]; });
}
/* ---------- kit bag: small parts placed in world space and merged per material (few draw calls, smooth on phones) ---------- */
function kitBag(M, mesh) {
  var groups = [], byMat = {};
  if (!M.kbRoad) {
    var gt = M.ground.map.clone(); gt.needsUpdate = true; gt.repeat.set(1, 1);
    M.kbRoad = new THREE.MeshStandardMaterial({ color: 0xbdbdbd, roughness: 1, map: gt, bumpMap: gt, bumpScale: .4, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    var pt = M.ground.map.clone(); pt.needsUpdate = true; pt.repeat.set(5, 5);
    M.kbGravel = new THREE.MeshStandardMaterial({ color: 0xc8c8c8, roughness: 1, map: pt, bumpMap: pt, bumpScale: .5 });
    var at = M.road.map.clone(); at.needsUpdate = true; at.repeat.set(1, 1);
    M.kbAsph = new THREE.MeshStandardMaterial({ color: 0x6e6e6e, roughness: .95, map: at, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    M.kbRoof = new THREE.MeshStandardMaterial({ color: 0x8e8e8e, roughness: .9, metalness: .1 });
    M.kbGlass = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: .12, metalness: .85 });
    M.kbPaint = new THREE.MeshStandardMaterial({ color: 0xe6e6e6, roughness: .6 });
    [M.kbRoad, M.kbGravel, M.kbAsph, M.kbRoof, M.kbGlass, M.kbPaint].forEach(function (m) { m.envMapIntensity = M.mound.envMapIntensity; });
  }
  function put(geo, mat) { var k = mat.uuid; if (!byMat[k]) { byMat[k] = { m: mat, gs: [] }; groups.push(byMat[k]); } byMat[k].gs.push(geo); }
  var E = new THREE.Euler(), R = new THREE.Matrix4(), Y = new THREE.Vector3(0, 1, 0);
  function frame(fx, fz, fry) { // a local frame: x, z offset and a turn about y
    function fin(geo, mat, x, y, z, rx, ry, rz) {
      if (rx || ry || rz) geo.applyMatrix4(R.makeRotationFromEuler(E.set(rx || 0, ry || 0, rz || 0)));
      geo.translate(x, y, z); if (fry) geo.rotateY(fry); geo.translate(fx, 0, fz); put(geo, mat); return geo;
    }
    return {
      box: function (w, h, d, mat, x, y, z, rx, ry, rz) { return fin(new THREE.BoxGeometry(w, h, d), mat, x, y, z, rx, ry, rz); },
      cyl: function (r1, r2, h, mat, x, y, z, seg, rx, ry, rz) { return fin(new THREE.CylinderGeometry(r1, r2, h, seg || 12), mat, x, y, z, rx, ry, rz); },
      cap: function (r, len, mat, x, y, z, rx, ry, rz) { return fin(new THREE.CapsuleGeometry(r, len, 4, 14), mat, x, y, z, rx, ry, rz); },
      wheel: function (r, mat, x, y, z, rx, ry, rz) { return fin(new THREE.TorusGeometry(r, r * .12, 5, 14), mat, x, y, z, rx, ry, rz); },
      fan: function (r, x, y, z) { fin(new THREE.CircleGeometry(r, 20), M.fan, x, y, z, -Math.PI / 2); return fin(new THREE.TorusGeometry(r, r * .08, 5, 20), M.dark, x, y, z, Math.PI / 2); },
      pipe: function (pts, r, mat, seg) { // straight runs between [x, y, z] points
        for (var i = 0; i < pts.length - 1; i++) {
          var a = new THREE.Vector3().fromArray(pts[i]), b = new THREE.Vector3().fromArray(pts[i + 1]), d = b.clone().sub(a), l = d.length(); if (l < .01) continue;
          var g = new THREE.CylinderGeometry(r, r, l + r * .6, seg || 8); g.applyMatrix4(R.makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(Y, d.normalize())));
          fin(g, mat, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
        }
      },
      rail: function (x0, z0, x1, z1, y, h, mat) { // handrail: posts plus top and mid rails
        var l = Math.hypot(x1 - x0, z1 - z0), ry = -Math.atan2(z1 - z0, x1 - x0), n = Math.max(1, Math.round(l / 1.6));
        for (var i = 0; i <= n; i++) this.box(.05, h, .05, mat, x0 + (x1 - x0) * i / n, y + h / 2, z0 + (z1 - z0) * i / n);
        this.box(l, .05, .05, mat, (x0 + x1) / 2, y + h, (z0 + z1) / 2, 0, ry); this.box(l, .04, .04, mat, (x0 + x1) / 2, y + h / 2, (z0 + z1) / 2, 0, ry);
      },
    };
  }
  var W = frame(0, 0, 0);
  W.frame = frame;
  W.road = function (g, pts, w, mat, y) { // flat strip on the ground with world-scaled texture
    var v = [], uv = [], idx = [], along = 0, n = pts.length;
    for (var i = 0; i < n; i++) {
      var a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1;
      var nx = -tz / l * w / 2, nz = tx / l * w / 2; if (i) along += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      v.push(pts[i][0] + nx, y || .05, pts[i][1] + nz, pts[i][0] - nx, y || .05, pts[i][1] - nz); uv.push(0, along / 6, w / 6, along / 6);
      if (i < n - 1) idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
    }
    var rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.Float32BufferAttribute(v, 3)); rg.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    rg.setIndex(idx); rg.computeVertexNormals(); return mesh(rg, mat || M.kbRoad, 0, 0, 0, g, false);
  };
  W.fence = function (g, pts, gaps) { // chain-link round a closed polygon, with gaps [x, z, half-width]
    var fv = [], fuv = [], fi = [], run = 0;
    for (var i = 0; i < pts.length; i++) {
      var p0 = pts[i], p1 = pts[(i + 1) % pts.length], l = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), n = Math.max(1, Math.round(l / 3));
      for (var k = 0; k < n; k++) {
        var a = [p0[0] + (p1[0] - p0[0]) * k / n, p0[1] + (p1[1] - p0[1]) * k / n], b = [p0[0] + (p1[0] - p0[0]) * (k + 1) / n, p0[1] + (p1[1] - p0[1]) * (k + 1) / n], s = l / n;
        W.cyl(.06, .06, 2.4, M.galv, a[0], 1.2, a[1], 5);
        var mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, gap = (gaps || []).some(function (q) { return Math.hypot(mx - q[0], mz - q[1]) < q[2]; });
        if (!gap) { var b0 = fv.length / 3; fv.push(a[0], .05, a[1], b[0], .05, b[1], a[0], 2.2, a[1], b[0], 2.2, b[1]);
          fuv.push(run / 1.2, 0, (run + s) / 1.2, 0, run / 1.2, 1.8, (run + s) / 1.2, 1.8); fi.push(b0, b0 + 1, b0 + 2, b0 + 2, b0 + 1, b0 + 3); }
        run += s;
      }
    }
    var fg = new THREE.BufferGeometry(); fg.setAttribute("position", new THREE.Float32BufferAttribute(fv, 3)); fg.setAttribute("uv", new THREE.Float32BufferAttribute(fuv, 2));
    fg.setIndex(fi); fg.computeVertexNormals(); mesh(fg, M.fence, 0, 0, 0, g, false);
  };
  W.light = function (x, z, ry) { var F = frame(x, z, ry || 0); F.cyl(.1, .14, 8, M.galv, 0, 4, 0, 6); F.box(1.6, .08, .08, M.galv, .7, 7.9, 0); F.box(.6, .14, .3, M.lamp, 1.4, 7.8, 0); };
  W.done = function (g) {
    var MG = THREE.BufferGeometryUtils.mergeBufferGeometries;
    groups.forEach(function (b) { var m = mesh(MG(b.gs), b.m, 0, 0, 0, g); if (b.m === M.fan) m.castShadow = false; b.gs.forEach(function (x) { x.dispose(); }); });
  };
  return W;
}

/* ---------- field gas: three well pads, a compressor station, the flare, gathering lines and lease roads ---------- */
function fieldGas(g, M, mesh, flare) {
  var K = kitBag(M, mesh);
  function tree(F, x, z) { // wellhead "christmas tree" in a cellar, with a pipe guard round it
    F.box(2.6, .1, 2.6, M.dark, x, .05, z); F.box(2.6, .04, .3, M.galv, x, .11, z - 1.15); F.box(2.6, .04, .3, M.galv, x, .11, z + 1.15);
    F.cyl(.55, .55, .3, M.dark, x, .25, z, 14); F.cyl(.34, .34, .6, M.galv, x, .7, z, 12);
    F.box(.55, .5, .55, M.kbPaint, x, 1.25, z); F.wheel(.3, M.dark, x + .5, 1.25, z, 0, Math.PI / 2);
    F.box(.55, .5, .55, M.kbPaint, x, 1.85, z); F.wheel(.3, M.dark, x + .5, 1.85, z, 0, Math.PI / 2);
    F.box(1.5, .45, .45, M.kbPaint, x, 2.45, z);
    [-1, 1].forEach(function (s) { F.box(.4, .5, .5, M.kbPaint, x + s * .95, 2.45, z); F.wheel(.26, M.dark, x + s * .95, 2.82, z, Math.PI / 2); });
    F.box(.5, .5, .5, M.kbPaint, x, 3.0, z); F.cyl(.2, .27, .4, M.galv, x, 3.45, z, 10); F.cyl(.13, .13, .07, M.white, x + .3, 3.15, z, 12, 0, 0, Math.PI / 2);
    F.pipe([[x + 1.15, 2.45, z], [x + 1.7, 2.45, z], [x + 1.7, .3, z]], .1, M.steel);
    [[-1.5, -1.5], [1.5, -1.5], [1.5, 1.5], [-1.5, 1.5]].forEach(function (c) { F.cyl(.09, .09, 1.1, M.kbPaint, x + c[0], .55, z + c[1], 6); });
    F.box(3, .1, .1, M.kbPaint, x, 1.05, z - 1.5); F.box(3, .1, .1, M.kbPaint, x, 1.05, z + 1.5); F.box(.1, .1, 3, M.kbPaint, x - 1.5, 1.05, z);
  }
  function pumpjack(F, x, z) {
    F.box(1.4, .3, 8, M.dark, x, .15, z); F.box(.3, .3, 8, M.galv, x - .55, .4, z); F.box(.3, .3, 8, M.galv, x + .55, .4, z);
    [-1, 1].forEach(function (s) { F.box(.22, 4.5, .22, M.galv, x + s * .55, 2.4, z + .4, -.18 * s * 0, 0, -s * .1); F.box(.2, 4.3, .2, M.galv, x + s * .5, 2.3, z - .5, .2, 0, -s * .1); });
    F.box(.4, .6, 8, M.kbPaint, x, 4.75, z + .6, -.1);                              // walking beam
    F.box(.55, 2.4, 1.1, M.kbPaint, x, 4.1, z + 4.6, -.1);                          // horsehead
    F.cyl(.03, .03, 3.4, M.steel, x, 2.4, z + 5.1, 6); tree(F, x, z + 5.1);           // bridle down to the well
    F.box(1.4, 1.5, 1.5, M.galv, x, 1.4, z - 2.8);                                  // gear reducer
    [-1, 1].forEach(function (s) { F.box(.18, 2.4, .5, M.dark, x + s * .85, 1.6, z - 2.8, 0, 0, .5); F.box(.35, 1.3, 1.6, M.dark, x + s * 1.05, 1.0, z - 3.3, .5);
      F.box(.12, 3.1, .12, M.galv, x + s * .55, 3.0, z - 2.4, .1); });
    F.box(1.1, 1, 1.4, M.dark, x, .8, z - 4.4);                                      // motor
  }
  function vsep(F, x, z, r, h) { F.box(r * 3.2, .25, r * 3.2, M.dark, x, .12, z); F.cap(r, h, M.kbPaint, x, h / 2 + r + .3, z);
    F.box(.04, h + r * 2, .04, M.galv, x + r + .25, (h + r * 2) / 2 + .3, z - .2); F.box(.04, h + r * 2, .04, M.galv, x + r + .25, (h + r * 2) / 2 + .3, z + .2);
    F.cyl(.1, .1, .6, M.steel, x, h + r * 2 + .5, z, 6); }
  function battery(F, x, z, n) { // tanks inside a steel containment ring, catwalk on top, stairs at the end
    var L = n * 4 + 2, x0 = x - L / 2;
    F.box(L, .1, 7, M.pad, x, .05, z); F.box(L, 1, .2, M.galv, x, .5, z - 3.5); F.box(L, 1, .2, M.galv, x, .5, z + 3.5); F.box(.2, 1, 7, M.galv, x0, .5, z); F.box(.2, 1, 7, M.galv, x0 + L, .5, z);
    for (var i = 0; i < n; i++) { var tx = x0 + 3 + i * 4;
      F.cyl(1.6, 1.6, 6, M.kbPaint, tx, 3.1, z, 20); F.cyl(.25, 1.62, .4, M.kbPaint, tx, 6.3, z, 20); F.cyl(.22, .22, .3, M.dark, tx + .5, 6.5, z + .5, 8);
      F.pipe([[tx, .9, z + 1.6], [tx, .9, z + 2.6]], .09, M.steel); }
    F.box(L - 2, .1, 1, M.galv, x, 6.7, z - 1.9); F.rail(x0 + 1, z - 2.4, x0 + L - 1, z - 2.4, 6.7, 1, M.galv); F.rail(x0 + 1, z - 1.4, x0 + L - 1, z - 1.4, 6.7, 1, M.galv);
    F.box(9.2, .12, 1, M.galv, x0 + L + 2.6, 3.4, z - 1.9, 0, 0, -.82);
    F.pipe([[x0 + 2, .9, z + 2.6], [x0 + L + 1, .9, z + 2.6], [x0 + L + 1, .9, z + 4.5]], .1, M.steel); F.box(.4, 1.3, .4, M.dark, x0 + L + 1, .65, z + 4.5);
  }
  function wellPad(cx, cz, wells, pj, tanks, w, d) {
    K.box(w, .12, d, M.kbGravel, cx, .06, cz);
    var F = K.frame(cx, cz, 0), wz = -d / 2 + 4, pz = 1.5, flow = [];
    wells.forEach(function (wx) { tree(F, wx, wz); flow.push(wx); });
    if (pj != null) pumpjack(F, pj, wz - 1.4);
    vsep(F, -w / 2 + 4, pz, .7, 2.6); vsep(F, -w / 2 + 7, pz, .7, 2.6);
    F.box(2.6, .3, 2.6, M.dark, -w / 2 + 10.5, .15, pz); F.cap(1.05, 4.2, M.kbPaint, -w / 2 + 10.5, 3.6, pz); F.cyl(.18, .18, 2.8, M.dark, -w / 2 + 10.9, 7.6, pz + .4, 8); // heater-treater
    F.box(.4, .6, 1.4, M.dark, -w / 2 + 13.4, .3, pz); F.box(.4, .6, 1.4, M.dark, -w / 2 + 16.6, .3, pz); F.cap(.8, 3.8, M.kbPaint, -w / 2 + 15, 1.5, pz, 0, 0, Math.PI / 2); // 3-phase separator
    flow.forEach(function (wx) { F.pipe([[wx + 1.7, .3, wz], [wx + 1.7, .3, pz - 2.2], [-w / 2 + 4, .3, pz - 2.2], [-w / 2 + 4, .6, pz - .8]], .09, M.steel); });
    battery(F, w / 2 - (tanks * 4 + 2) / 2 - 3.5, d / 2 - 5, tanks);
    F.box(2.4, 2.5, 2.6, M.kbPaint, w / 2 - 3, 1.25, pz - 1); F.box(2.8, .2, 3, M.kbRoof, w / 2 - 3, 2.6, pz - 1); // meter house
    F.cyl(.9, .9, 6.5, M.kbPaint, w / 2 - 3, 3.4, -d / 2 + 3, 16); F.cyl(1.0, 1.0, .5, M.dark, w / 2 - 3, 6.9, -d / 2 + 3, 16); F.box(2, .3, 2, M.dark, w / 2 - 3, .15, -d / 2 + 3); // combustor
  }
  wellPad(-70, -26, [-11, -6], 4, 4, 32, 24);
  wellPad(-60, 18, [-12, -7, -2, 3], null, 4, 32, 24);
  wellPad(-36, -34, [-9, -4, 1], null, 3, 28, 22);
  // compressor station
  K.box(26, .12, 18, M.kbGravel, -28, .06, 5);
  var S = K.frame(-30, 4, 0);
  S.box(14, 6, 8, M.gen, 0, 3, 0); S.box(14.6, .4, 8.6, M.kbRoof, 0, 6.2, 0); S.box(3.2, 3.6, .1, M.dark, -3, 1.8, 4.05); S.box(3.2, 3.6, .1, M.dark, 3, 1.8, 4.05);
  [-4, 0, 4].forEach(function (x) { S.cyl(.4, .4, 3.4, M.steel, x, 8, -1.5, 10); S.cyl(.55, .55, .3, M.dark, x, 9.8, -1.5, 10); S.cap(.6, 2.6, M.steel, x, 7.2, 1.6, 0, 0, Math.PI / 2); });
  [[10.5, -1], [10.5, 3.6]].forEach(function (c) { // fin-fan coolers
    [[-1.8, -4], [1.8, -4], [-1.8, 4], [1.8, 4]].forEach(function (p) { S.box(.25, 3, .25, M.galv, c[0] + p[0], 1.5, c[1] + p[1] * .5); });
    S.box(4, 1.2, 4.6, M.galv, c[0], 3.6, c[1]); S.fan(1.6, c[0], 4.22, c[1]); });
  S.cap(1.1, 4, M.kbPaint, -11, 3.6, -3); S.cap(1.1, 4, M.kbPaint, -11, 3.6, 1); S.box(3, .3, 7, M.dark, -11, .15, -1);
  S.box(4, 3, 3, M.kbPaint, -10, 1.5, 6); S.box(4.4, .2, 3.4, M.kbRoof, -10, 3.1, 6);
  S.cap(.7, 4, M.steel, 6, 1.5, 7, 0, 0, Math.PI / 2); // pig receiver
  // flare pad with knockout drum
  K.box(10, .12, 10, M.kbGravel, -20, .06, -16); K.cap(1, 3.5, M.steel, -23.5, 1.6, -14, 0, 0, Math.PI / 2);
  flare(g, -20, -16, 14);
  // lease roads
  K.road(g, [[-4, 19], [-30, 19], [-44, 19]], 4.5);
  K.road(g, [[-42, 19], [-43, 4], [-46, -8], [-54, -17]], 4.2);
  K.road(g, [[-46, -8], [-40, -16], [-38, -23]], 4.2);
  // gathering lines on low supports, with pipeline markers
  function line(pts) { K.pipe(pts.map(function (p) { return [p[0], .45, p[1]]; }), .2, M.steel);
    for (var i = 0; i < pts.length - 1; i++) { var a = pts[i], b = pts[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (var t = 3; t < l; t += 6) { var x = a[0] + (b[0] - a[0]) * t / l, z = a[1] + (b[1] - a[1]) * t / l; K.box(.3, .3, .9, M.dark, x, .15, z); if (t % 18 < 6) { K.cyl(.06, .06, 1.4, M.kbPaint, x + 1.2, .7, z, 6); K.box(.2, .3, .05, M.dark, x + 1.2, 1.3, z); } } } }
  line([[-48, 10], [-42, 8], [-38, 6]]);
  line([[-56, -22], [-48, -10], [-41, 0]]);
  line([[-38, -25], [-36, -6], [-36, -1]]);
  line([[-22, -3], [-21, -10]]);
  K.pipe([[-16, 1.2, 4], [-10, 1.2, 4], [-10, 1.2, -10]], .3, M.steel);
  K.light(-17, 15, Math.PI); K.light(-41, 15, 0); K.light(-58, -12, 0);
  K.done(g);
}

/* ---------- gas plant: process building, boiler house and stacks, cooling tower, tanks, pipe rack, meter station, substation ---------- */
function gasPlant(g, M, mesh) {
  var K = kitBag(M, mesh);
  K.box(108, .1, 70, M.kbGravel, -77, .05, -3);
  // process building with a high bay, docks, windows and rooftop units
  var P = K.frame(-76, 0, 0);
  P.box(36, 11, 24, M.gen, 0, 5.5, 0); P.box(36.8, .5, 24.8, M.kbRoof, 0, 11.25, 0);
  P.box(16, 19, 16, M.gen, 9, 9.5, -2); P.box(16.8, .5, 16.8, M.kbRoof, 9, 19.25, -2);
  [-14, -9, -4].forEach(function (x) { P.box(3.6, 4.2, .12, M.dark, x, 2.1, 12.02); for (var y = .4; y < 4.2; y += .35) P.box(3.6, .04, .14, M.galv, x, y, 12.04);
    P.box(4.2, .6, .5, M.dark, x, 4.5, 12.2); P.box(3.2, 1.1, 2.4, M.pad, x, .55, 13.2); });
  P.box(20, .3, 5, M.kbRoof, -9, 5.6, 14.5); [-18, -9, 0].forEach(function (x) { P.box(.2, 5.5, .2, M.galv, x, 2.75, 16.8); });
  P.box(1.1, 2.3, .1, M.dark, 6, 1.15, 12.02); P.box(1.1, 2.3, .1, M.dark, 13, 1.15, 12.02);
  P.box(34, 1.1, .1, M.kbGlass, 0, 8.4, 12.03); P.box(15.6, 1.1, .1, M.kbGlass, 9, 15.5, 6.03); P.box(.1, 1.1, 22, M.kbGlass, -18.03, 8.4, 0); P.box(.1, 1.1, 14, M.kbGlass, 17.03, 15.5, -2);
  [-17.8, -6, 5.8].forEach(function (x) { P.cyl(.12, .12, 11, M.galv, x, 5.5, 12.2, 6); });
  [[-12, -6], [-6, -6], [-12, 4], [-4, 4]].forEach(function (c) { P.box(3, 1.4, 2.2, M.galv, c[0], 12.2, c[1]); P.fan(.6, c[0] + .6, 12.92, c[1]); });
  [[4, -6], [10, -8], [14, 2]].forEach(function (c) { P.cyl(.35, .35, 2, M.steel, c[0], 20.3, c[1], 10); P.cyl(.6, .6, .3, M.dark, c[0], 21.4, c[1], 10); });
  // boiler house, breeching ducts and two stacks with platforms and ladders
  var Bh = K.frame(-104, -4, 0);
  Bh.box(12, 15, 13, M.kbPaint, 0, 7.5, 0); Bh.box(12.6, .5, 13.6, M.kbRoof, 0, 15.25, 0); Bh.box(2.5, 3, .1, M.dark, 0, 1.5, 6.52);
  for (var y = 2.5; y < 14; y += 3.2) Bh.box(.1, .8, 9, M.kbGlass, -6.02, y + 1, 0);
  [-6, 6].forEach(function (z, i) { Bh.box(8, 2.6, 2.6, M.galv, -9, 12, z * .8);
    Bh.cyl(2.2, 2.8, 48, M.kbPaint, -13, 24, z, 24); Bh.cyl(2.28, 2.28, 3, M.dark, -13, 46.5, z, 24);
    [16, 34].forEach(function (h) { Bh.wheel(3.2, M.galv, -13, h, z, Math.PI / 2); Bh.cyl(3.3, 3.3, .15, M.galv, -13, h - .1, z, 24); });
    Bh.box(.05, 46, .05, M.galv, -10.4, 23, z - .3); Bh.box(.05, 46, .05, M.galv, -10.4, 23, z + .3); });
  // cooling tower: two cells with louvres and fan stacks
  var Ct = K.frame(-66, -22, 0);
  Ct.box(18, 7, 8, M.louvre, 0, 3.5, 0); Ct.box(18.4, .3, 8.4, M.galv, 0, 7.15, 0); Ct.box(18, .8, 8, M.dark, 0, .4, 0);
  [-4.5, 4.5].forEach(function (x) { Ct.cyl(2.8, 3.1, 2.2, M.kbPaint, x, 8.4, 0, 20); Ct.fan(2.6, x, 9.52, 0); });
  Ct.rail(-9, -4, 9, -4, 7.3, 1, M.galv); Ct.pipe([[-9.2, 1.2, 2], [-14, 1.2, 2], [-14, 1.2, 14]], .4, M.steel);
  // tank farm in a dike, and pressure bullets on saddles
  var Tf = K.frame(-110, 26, 0);
  Tf.box(24, .1, 12, M.pad, 0, .05, 0); Tf.box(24, .9, .3, M.pad, 0, .45, -6); Tf.box(24, .9, .3, M.pad, 0, .45, 6); Tf.box(.3, .9, 12, M.pad, -12, .45, 0); Tf.box(.3, .9, 12, M.pad, 12, .45, 0);
  [-5.5, 5.5].forEach(function (x) { Tf.cyl(4, 4, 8, M.kbPaint, x, 4.1, 0, 28); Tf.cyl(.4, 4.05, .8, M.kbPaint, x, 8.5, 0, 28); Tf.rail(x - 3, -2, x + 3, -2, 8.3, 1, M.galv);
    Tf.box(.9, .12, 10, M.galv, x + 4.4, 4.2, -1, -.9); });
  var Bu = K.frame(-90, 27, 0);
  [-3.2, 0, 3.2].forEach(function (z) { Bu.cap(1.3, 8, M.kbPaint, 0, 2.2, z, 0, 0, Math.PI / 2); Bu.box(.6, 1.2, 2.2, M.pad, -3, .6, z); Bu.box(.6, 1.2, 2.2, M.pad, 3, .6, z); });
  // pipe rack from the building to the meter station, cable tray underneath
  function rack(a, b) { var l = Math.hypot(b[0] - a[0], b[1] - a[1]), ry = -Math.atan2(b[1] - a[1], b[0] - a[0]), n = Math.round(l / 6);
    for (var i = 0; i <= n; i++) { var t = i / n, F = K.frame(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, ry);
      F.box(.3, 5.6, .3, M.galv, 0, 2.8, -1.6); F.box(.3, 5.6, .3, M.galv, 0, 2.8, 1.6); F.box(.3, .3, 3.6, M.galv, 0, 5.5, 0); F.box(.3, .3, 3.6, M.galv, 0, 3.4, 0); }
    var F2 = K.frame(a[0], a[1], ry);
    F2.pipe([[0, 5.95, -1.1], [l, 5.95, -1.1]], .3, M.steel); F2.pipe([[0, 5.85, 0], [l, 5.85, 0]], .2, M.kbPaint); F2.pipe([[0, 5.8, .9], [l, 5.8, .9]], .15, M.steel);
    F2.box(l, .12, .8, M.galv, l / 2, 3.65, 0); }
  rack([-58, 8], [-30, 8]); rack([-30, 8], [-30, 16]);
  // meter station: fenced yard with meter runs, regulators, a control hut and the incoming line
  var Ms = K.frame(-30, 22, 0);
  Ms.box(14, .1, 10, M.kbGravel, 0, .06, 0);
  [-1.6, 1.6].forEach(function (z) { Ms.pipe([[-5, 1.1, z], [5, 1.1, z]], .3, M.steel); [-3, 0, 3].forEach(function (x) { Ms.cyl(.45, .45, .2, M.dark, x, 1.1, z, 12, 0, 0, Math.PI / 2); });
    Ms.box(.8, .9, .8, M.kbPaint, 1.5, 1.6, z); Ms.box(.4, 1.1, .4, M.dark, -4, .55, z); Ms.box(.4, 1.1, .4, M.dark, 4, .55, z); });
  Ms.box(3.4, 3, 3, M.kbPaint, 3.5, 1.5, -3.4); Ms.box(3.8, .2, 3.4, M.kbRoof, 3.5, 3.1, -3.4);
  Ms.pipe([[-5, 1.1, 1.6], [-5, 1.1, -1.6], [-5, 1.1, 0], [-5, -.2, 0]], .3, M.steel); Ms.pipe([[0, 1.1, 5], [0, 1.1, 1.6]], .3, M.steel);
  K.fence(g, [[-37, 17], [-23, 17], [-23, 27], [-37, 27]], [[-30, 27, 2]]);
  K.pipe([[-30, -.2, 60], [-30, -.2, 27.5]], .3, M.steel); K.cyl(.06, .06, 1.4, M.kbPaint, -28.6, .7, 40, 6); K.cyl(.06, .06, 1.4, M.kbPaint, -28.6, .7, 52, 6);
  K.pipe([[-23, 1.2, 22], [-10, 1.2, 22], [-10, 1.2, -6]], .35, M.steel);
  for (var pz = 20; pz > -6; pz -= 6) K.box(.25, 1.2, .9, M.dark, -10, .6, pz);
  // substation: transformers with radiators and bushings, an H-frame, its own fence
  var Ss = K.frame(-40, -24, 0);
  Ss.box(18, .1, 12, M.kbGravel, 0, .06, 0);
  [-5, 0, 5].forEach(function (x) { Ss.box(4, .4, 3.6, M.pad, x, .2, 1.4); Ss.box(2.6, 2.6, 2, M.dark, x, 1.7, 1.4);
    for (var i = 0; i < 7; i++) Ss.box(.07, 2.1, .7, M.galv, x - 1.2 + i * .4, 1.6, 2.75);
    [-.7, 0, .7].forEach(function (b) { Ss.cyl(.1, .16, 1, M.white, x + b, 3.5, 1.1, 8); }); });
  [-7, 7].forEach(function (x) { Ss.box(.4, 9, .4, M.galv, x, 4.5, -3.5); }); Ss.box(14.4, .4, .4, M.galv, 0, 8.8, -3.5);
  [-4, 0, 4].forEach(function (x) { Ss.cyl(.12, .12, 1.2, M.white, x, 8, -3.5, 8); });
  K.fence(g, [[-49, -30], [-31, -30], [-31, -18], [-49, -18]], [[-40, -18, 2]]);
  // roads, parking with cars, lights, and the property fence
  K.road(g, [[-2, 36], [-122, 36]], 6.5, M.kbAsph);
  K.road(g, [[-80, 36], [-80, 15]], 6, M.kbAsph, .055); K.road(g, [[-44, 36], [-44, -17]], 5, M.kbAsph, .055);
  K.road(g, [[-122, 36], [-122, -28], [-104, -28]], 5.5, M.kbAsph, .056);
  K.box(20, .06, 13, M.kbAsph, -112, .04, -29);
  for (var i = 0; i < 7; i++) { K.box(.12, .02, 4.6, M.kbPaint, -120.5 + i * 2.8, .08, -32.6); }
  [[-119, M.kbPaint], [-116.2, M.galv], [-110.6, M.dark], [-107.8, M.kbPaint], [-105, M.galv]].forEach(function (c) { K.box(1.8, .75, 4.2, c[1], c[0], .6, -32.4); K.box(1.6, .6, 2.2, M.kbGlass, c[0], 1.25, -32.6); });
  [[-20, 33], [-60, 33], [-100, 33], [-124, 10], [-124, -20]].forEach(function (p) { K.light(p[0], p[1], Math.PI / 2); });
  K.fence(g, [[-130, -40], [-22, -40], [-22, 31], [-130, 31]], [[-80, 31, 3.5], [-44, 31, 3], [-122, 31, 3]]);
  K.done(g);
}

function buildSource(kind) {
  const g = new THREE.Group(); flames.length = 0;
  if (kind === "flare") {
    landfill(g, -80, M, mesh);
    flare(g, -18, -10, 16);
    B(5, 2.6, 3, M.gen, -18, 1.3, 2, g); // blower skid
    pipeRun(g, [[-30, 0], [-18, 0], [-18, -8]], .35);
    pipeRun(g, [[-18, 2], [2, 2], [2, -6], [6, -6]], .3);
  } else if (kind === "well") {
    fieldGas(g, M, mesh, flare);
  } else {
    gasPlant(g, M, mesh);
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
  ["power", "Switchboard and busway", "Power from the gas engines, run overhead to every rack",
    "Power from the gas engines enters a switchboard in the electrical room at one end. A busway runs above the racks, and a tap-off box drops a feed into each rack, so a rack can be added or swapped without new wiring."],
  ["racks", "8 AI racks", "Liquid-cooled, about 120 kW and 72 GPUs each",
    "Each rack holds compute trays, each with four GPUs and two CPUs under cold plates, plus switch trays in the middle that link all 72 GPUs as one system. Power shelves sit at the top and bottom. Hover a rack to open it, or click one to look inside."],
  ["manifolds", "Cold plates and manifolds", "Coolant flows to a plate on every chip and back",
    "Coolant runs from the distribution unit through headers behind the racks, up a manifold in each rack, and into a metal cold plate on every GPU and CPU. It picks up heat at the chip and returns warm, so the room needs little air cooling."],
  ["cdu", "Coolant distribution unit", "Pumps and a heat exchanger for the rack loop",
    "Pumps move coolant through the racks, and a heat exchanger hands the heat to a second loop that goes up to the roof. The two loops stay separate, so the coolant at the chips stays clean and at a steady temperature."],
  ["coolers", "Dry coolers", "Sealed loop on the roof; no evaporative water use",
    "Fans blow outside air across finned coils to cool the outer loop. It is a sealed loop, like a car radiator: no water is sprayed or evaporated, so the site does not need a water supply for cooling."],
  ["network", "Network and fiber", "Links the racks to each other and to the outside",
    "A network cabinet at the far end connects the racks to each other and, over fiber in the overhead tray, to the outside. Training and inference jobs run across many GPUs at once, so these links carry heavy traffic."],
  ["fire", "Fire suppression", "Clean-agent system, safe for electronics",
    "Cylinders hold a clean agent that is released through a pipe along the ceiling if smoke is detected. It puts out a fire without water or residue, so the equipment is not damaged."],
];
const legendEl = document.getElementById("legend"), legendList = document.getElementById("legend-list");
const focusEl = document.createElement("div"); focusEl.className = "focus"; focusEl.setAttribute("aria-live", "polite"); focusEl.innerHTML = "<strong></strong><p></p>";
legendList.after(focusEl);
let hlPart = null, hlLock = null;
const pins = LEGEND.map(([id, title, detail, more], i) => {
  const a = cut.anchors.find(x => x.id === id);
  const pin = document.createElement("div"); pin.className = "pin"; pin.textContent = i + 1; pin.setAttribute("aria-hidden", "true"); labelsEl.appendChild(pin);
  const li = document.createElement("li"); li.innerHTML = "<b></b><div><strong></strong><span></span></div>"; li.dataset.part = id; li.tabIndex = 0;
  li.querySelector("b").textContent = i + 1; li.querySelector("strong").textContent = title; li.querySelector("span").textContent = detail; legendList.appendChild(li);
  li.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") setPart(id); }); li.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") setPart(hlLock); });
  li.addEventListener("click", () => { hlLock = hlLock === id ? null : id; setPart(hlLock); });
  li.addEventListener("focus", () => setPart(id)); li.addEventListener("blur", () => setPart(hlLock));
  return { id, a, pin, li, title, more, orig: [title, detail, more] };
});
// highlight: the hovered part's meshes swap to a brighter copy of their own material
const hiMats = new Map();
function hiMat(m) { if (Array.isArray(m)) return m.map(hiMat); if (!m.emissive) return m; // basic materials (coolant flow) have no glow slot: lighting them crashed the 3D view
  let h = hiMats.get(m);
  if (!h) { h = m.clone(); h.emissive = new THREE.Color(0xffffff); h.emissiveIntensity = (m.emissiveIntensity || 0) * (m.emissiveMap ? 1.5 : 0) + .32;
    if (!m.emissiveMap) h.emissiveMap = null; hiMats.set(m, h); hiMats.set(h, h); } return h; }
const partMeshes = []; cut.g.traverse(o => { if (o.isMesh && o.userData.part) { o.userData.mat0 = o.material; partMeshes.push(o); } });
function setPart(id) {
  if (id === hlPart) return; hlPart = id;
  partMeshes.forEach(o => { o.material = o.userData.part === id ? hiMat(o.userData.mat0) : o.userData.mat0; });
  legendEl.classList.toggle("focused", !!id);
  pins.forEach(p => { p.pin.classList.toggle("hl", p.id === id); p.li.classList.toggle("active", p.id === id); });
  const p = pins.find(q => q.id === id);
  if (p) { focusEl.querySelector("strong").textContent = p.title; focusEl.querySelector("p").textContent = p.more; }
  if (id !== "racks") cut.rackKit.want = -1;
}
// the rack that opens: move the door and trays to the hovered rack, close first when switching
function rackStep(dt) { const k = cut.rackKit;
  const goal = k.want >= 0 && k.want === k.idx ? 1 : 0;
  k.amt += (goal - k.amt) * Math.min(1, dt * 3.2);
  if (k.amt < .01 && k.want !== k.idx) { if (k.idx >= 0) k.faces[k.idx].visible = true;
    k.idx = k.want; if (k.idx >= 0) { k.g.position.z = -1.6 + k.idx * .6; k.faces[k.idx].visible = false; } }
  k.g.visible = k.idx >= 0;
  const e = k.amt * k.amt * (3 - 2 * k.amt);
  k.door.rotation.y = -1.75 * e;
  k.trays.forEach(({ t, out, deep, lag }) => { const a = THREE.MathUtils.clamp((k.amt - lag) / (1 - lag), 0, 1); t.userData.go = (t.userData.go == null ? out : t.userData.go) + ((k.full ? deep : out) - (t.userData.go == null ? out : t.userData.go)) * Math.min(1, dt * 3); t.position.x = .16 - t.userData.go * a * a * (3 - 2 * a); });
}
let legendKey = "", camInit = false, key = "", eCounts = "", eMini = "", center = new THREE.Vector3(), fans = [], gpos = [], mpos = [], bpos = [];
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
    isHall = hall; if (openBtn && !modOpen) openBtn.textContent = hall ? "Look inside a hall" : "Look inside a module";
    { const h = document.getElementById("hint"); if (h) { h.dataset.base = h.dataset.base || h.textContent;
        h.textContent = hall ? h.dataset.base.replace(/(Click|Tap) a module to open it/, "$1 a hall to look inside") + " · Each hall holds up to 12 modules" : h.dataset.base; } }
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
    eCounts = R.gens + " gensets · " + nB + (nB === 1 ? " battery unit · " : " battery units · ") + R.halls + (R.halls === 1 ? " compute module" : " compute modules") + inH + cap;
    eMini = "Live model · " + R.gens + " gensets · " + R.halls + (R.halls === 1 ? " module" : " modules") + inH;
  }
  if (counts) { const tt = SC.tenant ? SC.tenant.racks + (SC.tenant.racks === 1 ? " rack · " : " racks · ") + R.halls + (R.halls === 1 ? " compute module" : " compute modules") + " · powered by " + R.gens + " gensets" : eCounts;
    if (counts.textContent !== tt) counts.textContent = tt; }
  { const mc = document.getElementById("mini-cap"), mt = SC.tenant ? "Live model · " + SC.tenant.racks + (SC.tenant.racks === 1 ? " rack · " : " racks · ") + R.halls + (R.halls === 1 ? " module" : " modules") : eMini;
    if (mc && mc.textContent !== mt) mc.textContent = mt; }
  if (openBtn && !modOpen) { const ol = isHall ? (SC.tenant ? "Look inside your hall" : "Look inside a hall") : (SC.tenant ? "Look inside your module" : "Look inside a module"); if (openBtn.textContent !== ol) openBtn.textContent = ol; }
  if (SC.wantOpen > 0 && SC.tenant && mpos.length) { SC.wantOpen = 0; if (!modOpen) openModule(pickModule()); }
  else if (SC.wantOpen < 0) { SC.wantOpen = 0; if (modOpen) closeModule(false); }
  { const lg = SC.tenant ? SC.tenant.lg : null, lk = lg ? lg.key : "";
    if (lk !== legendKey) { legendKey = lk; pins.forEach(p => { const o = (lg && lg[p.id]) || p.orig;
      p.title = o[0]; p.more = o[2]; p.li.querySelector("strong").textContent = o[0]; p.li.querySelector("span").textContent = o[1]; }); } }

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
    if (!m || (!modOpen && openAmt < .004)) { if (m) m.visible = true; cut.g.visible = false; openIdx = -1; if (hallOpen) { site.remove(hallOpen); hallOpen = null; } }
    else { const a = openAmt, e3 = a * a * (3 - 2 * a);
      m.visible = false; cut.g.visible = true;
      if (hallOpen) { hallOpen.position.copy(m.position); cut.g.position.copy(m.position).add(openSlot); cut.g.scale.set(1, 1, 1); }
      else { cut.g.position.copy(m.position); cut.g.scale.copy(m.scale); }
      cut.roof.position.y = 4.6 * e3; cut.roof.position.x = 2.6 * e3; cut.near.scale.y = 1 - .86 * e3; cut.glow.intensity = 9 * e3; rackStep(rdt);
      if (cut.rackKit.g.visible) { drawFlow(t); M.trayFront.emissiveIntensity = .45 + .35 * Math.abs(Math.sin(t * 7.3) * Math.sin(t * 3.1));
        M.switchFront.emissiveIntensity = .5 + .4 * Math.abs(Math.sin(t * 11.7)); M.trayTop.emissiveIntensity = .07 + .05 * Math.sin(t * 2.2); } } }
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
  { const v = new THREE.Vector3(), on = openIdx >= 0 && cut.g.visible && openAmt > .8 && modOpen;
    const put = (o, pin, show) => { if (show) { v.setFromMatrixPosition(o.matrixWorld).project(camera); show = v.z < 1 && Math.abs(v.x) < 1.02 && Math.abs(v.y) < 1.02; }
      pin.classList.toggle("on", show); if (show) pin.style.transform = "translate(" + ((v.x * .5 + .5) * VW).toFixed(1) + "px," + ((-v.y * .5 + .5) * VH).toFixed(1) + "px)"; };
    pins.forEach(({ a, pin }) => put(a.o, pin, on && !rackView));
    rpins.forEach(({ o, pin }) => put(o, pin, on && rackView && cut.rackKit.amt > .85)); }
  if (!SC.mode3d) { SC.mode3d = true; const iso = document.getElementById("iso"); if (iso) iso.style.display = "none"; window.__gl3d = true;
    const c = document.getElementById("ctrls"), h = document.getElementById("hint"); if (c) c.hidden = false; if (h) { if (matchMedia("(pointer:coarse)").matches) h.textContent = "Two fingers to move or zoom · Tap a module to open it"; h.hidden = false; } ready = true; updateDock(); }
}
// Embedded on a sizing page: tell the page a module is open, so it can fade its own title text
function tellHost(on) { if (parent !== window) try { parent.postMessage({ acc: "mod", open: on }, location.origin); } catch (e) {} }
function pickModule() { let best = -1, bx = Infinity, bz = -Infinity;
  mpos.forEach((p, i) => { if (p[0] < bx - .1 || (Math.abs(p[0] - bx) < .1 && p[1] > bz)) { best = i; bx = p[0]; bz = p[1]; } }); return best; }
// Inside a hall: the building opens to a floor of modules, and the one nearest the viewer is cut open
let hallOpen = null; const openSlot = new THREE.Vector3();
function hallSlots(n) { const cols = Math.ceil(n / 2), W = cols * 4.2 + 2.4, out = [];
  for (let j = 0; j < n; j++) out.push(new THREE.Vector3(-W / 2 + 1.2 + Math.floor(j / 2) * 4.2 + 2.1, 0, (j % 2 ? 1 : -1) * 7)); return { W, out }; }
function makeHallOpen(n, skip) { const g = new THREE.Group(), { W, out } = hallSlots(n), D = 30;
  B(W + 2, .34, D + 2, M.pad, 0, .17, 0, g);
  for (const sz of [-1, 1]) B(W, 1.1, .25, M.mod, 0, .34 + .55, sz * (D / 2 - .125), g);
  for (const sx of [-1, 1]) B(.25, 1.1, D, M.mod, sx * (W / 2 - .125), .34 + .55, 0, g);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) B(.5, 7.5, .5, M.galv, sx * (W / 2 - .25), .34 + 3.75, sz * (D / 2 - .25), g);
  out.forEach((p, j) => { if (j === skip) return; const m = protoMod.clone(); m.position.copy(p); g.add(m); });
  return g; }
function modCam() { const c = cut.g.position.clone().add(new THREE.Vector3(.2, 1.7, .4)), narrow = VW < 700;
  const dir = narrow ? new THREE.Vector3(-.5, .74, .45).normalize() : new THREE.Vector3(-.8, .5, .33).normalize();
  if (narrow) { c.y += 2.5; c.z -= 1.5; } else { c.y += 1.2; c.z += 1.1; }
  tweenTo(c, c.clone().add(dir.multiplyScalar(narrow ? 30 : 20)), 1.5); }
const eyebrowEl = legendEl.querySelector(".eyebrow");
function openModule(i) {
  if (i < 0 || !mpos[i]) return;
  if (rackView) exitRack(false);
  if (openIdx >= 0 && openIdx !== i) { const old = modsG.children[openIdx]; if (old) old.visible = true; openAmt = 0; if (hallOpen) { site.remove(hallOpen); hallOpen = null; } }
  const m = modsG.children[i];
  if (isHall && m) { const n = m.userData.n || PER_HALL, { out } = hallSlots(n); let j = 0, bd = Infinity;
    out.forEach((p, k) => { const d = p.clone().add(m.position).distanceTo(camera.position); if (d < bd) { bd = d; j = k; } });
    openSlot.copy(out[j]); if (hallOpen) site.remove(hallOpen); hallOpen = makeHallOpen(n, j); hallOpen.position.copy(m.position); site.add(hallOpen);
    cut.g.position.copy(m.position).add(openSlot); eyebrowEl.textContent = "Inside a hall: one of its " + n + " modules"; }
  else { cut.g.position.set(mpos[i][0], 0, mpos[i][1]); eyebrowEl.textContent = "Inside a compute module"; }
  openIdx = i; modOpen = true; userCam = true; controls.autoRotate = false; controls.minDistance = 2;
  hero.classList.add("open"); openBtn.textContent = isHall ? "Close hall" : "Close module"; rackBtn.hidden = false;
  tellHost(true);
  modCam();
}
function closeModule(instant) {
  if (rackView) exitRack(false);
  hlLock = null; setPart(null); cut.rackKit.want = -1; rackBtn.hidden = true; controls.minDistance = 5;
  modOpen = false; hero.classList.remove("open"); openBtn.textContent = isHall ? "Look inside a hall" : "Look inside a module";
  tellHost(false);
  userCam = false; if (instant) openAmt = 0;
  else tweenTo(center, center.clone().add(new THREE.Vector3(-.55, .28, .67).normalize().multiplyScalar(fitR)), 1.6);
}

/* ---------- third level: one rack, up close, with what a tenant would want to know ---------- */
const RACK_INFO = [
  ["compute", "18 compute trays", "Each holds four GPUs and two CPUs with high-bandwidth memory. Two trays are pulled out here so you can see the boards."],
  ["switch", "9 switch trays", "Link all 72 GPUs into one system, so a large model can run across the whole rack as if it were one very large GPU."],
  ["power", "Power shelves", "Take power from the busway overhead, about 120 kW for the rack, and feed every tray. On-site engines supply it, with a battery to absorb fast swings in load."],
  ["cooling", "Direct-to-chip cooling", "Coolant runs to a cold plate on every GPU and CPU and back, through quick disconnects, so a tray can be pulled for service without draining the rack."],
];
const rackPanel = document.createElement("div"); rackPanel.className = "legend rackp"; rackPanel.setAttribute("aria-live", "polite");
rackPanel.innerHTML = '<div class="eyebrow">Inside a rack</div><h3>One liquid-cooled AI rack: 72 GPUs, about 120 kW</h3><ol></ol><div class="focus"><strong></strong><p></p></div>' +
  '<div class="tenant"><div class="eyebrow">For AI tenants</div><ul>' +
  '<li>Hardware sourced to your platform: the GPU generation, memory and network you choose</li>' +
  '<li>Power made on site and sized to the racks, with no wait for a grid connection</li>' +
  '<li>Liquid cooling built for dense racks, in a sealed loop with no evaporative water use</li>' +
  '<li>Room to grow about 1 MW at a time, one module after another</li></ul></div>' +
  '<p class="note">Typical rack, for illustration. Final hardware is chosen with each tenant.</p>';
legendEl.after(rackPanel);
{ const yb = document.createElement("div"); yb.className = "yb t-only"; const src = document.getElementById("yb-mod"); if (src) yb.innerHTML = src.innerHTML; rackPanel.querySelector("h3").after(yb); }
const rFocus = rackPanel.querySelector(".focus"); let subHl = null, subLock = null;
const rpins = RACK_INFO.map(([id, title, more], i) => {
  const pin = document.createElement("div"); pin.className = "pin"; pin.textContent = i + 1; pin.setAttribute("aria-hidden", "true"); labelsEl.appendChild(pin);
  const li = document.createElement("li"); li.innerHTML = "<b></b><div><strong></strong></div>"; li.tabIndex = 0; li.querySelector("b").textContent = i + 1; li.querySelector("strong").textContent = title;
  rackPanel.querySelector("ol").appendChild(li);
  li.addEventListener("pointerenter", e => { if (e.pointerType === "mouse") setSub(id); }); li.addEventListener("pointerleave", e => { if (e.pointerType === "mouse") setSub(subLock); });
  li.addEventListener("click", () => { subLock = subLock === id ? null : id; setSub(subLock); });
  li.addEventListener("focus", () => setSub(id)); li.addEventListener("blur", () => setSub(subLock));
  return { id, o: cut.rackKit.anchors[id], pin, li, title, more };
});
const kitMeshes = []; cut.rackKit.g.traverse(o => { if (o.isMesh && o.userData.sub) kitMeshes.push(o); });
function setSub(id) {
  if (id === subHl) return; subHl = id;
  kitMeshes.forEach(o => { o.material = o.userData.sub === id && id !== "cooling" ? hiMat(o.userData.mat0) : o.userData.mat0; });
  M.flow.opacity = id === "cooling" || !id ? 1 : .35;
  rackPanel.classList.toggle("focused", !!id);
  rpins.forEach(p => { p.pin.classList.toggle("hl", p.id === id); p.li.classList.toggle("active", p.id === id); });
  const p = rpins.find(q => q.id === id); if (p) { rFocus.querySelector("strong").textContent = p.title; rFocus.querySelector("p").textContent = p.more; }
}
let rackView = false;
const rackBtn = document.createElement("button"); rackBtn.type = "button"; rackBtn.className = "open-btn"; rackBtn.id = "openrack"; rackBtn.hidden = true; rackBtn.textContent = "Look inside a rack";
openBtn.after(rackBtn);
function enterRack(i) {
  if (!modOpen) return; if (i == null || i < 0) i = cut.rackKit.idx >= 0 ? cut.rackKit.idx : 3;
  rackView = true; hlLock = null; setPart(null); subLock = null; setSub(null);
  const k = cut.rackKit; k.want = i; k.full = true; controls.minDistance = .6;
  hero.classList.add("rack"); rackBtn.textContent = "Back to module";
  rackCam(i, 1.4);
}
// frame the whole rack, pulled trays included, clear of the panel (left on wide screens, top on phones)
function rackCam(i, dur) {
  const narrow = VW < 700, inr = cut.inner; inr.updateWorldMatrix(true, false);
  const sc = inr.getWorldScale(new THREE.Vector3()).x, dist = (narrow ? 10.5 : 5.6) * sc;
  const c = inr.localToWorld(new THREE.Vector3(-.55, .35 + 1.15, -1.6 + i * .6));
  const off = (narrow ? new THREE.Vector3(-1, .42, .5) : new THREE.Vector3(-1, .3, .36)).applyQuaternion(inr.getWorldQuaternion(new THREE.Quaternion())).normalize().multiplyScalar(dist);
  const right = new THREE.Vector3().crossVectors(off.clone().negate(), new THREE.Vector3(0, 1, 0)).normalize();
  const at = narrow ? c.clone().add(new THREE.Vector3(0, .3 * sc, 0)) : c.clone().sub(right.multiplyScalar(.15 * sc));
  tweenTo(at, at.clone().add(off), dur);
}
function exitRack(back) {
  rackView = false; cut.rackKit.full = false; cut.rackKit.want = -1; subLock = null; setSub(null); controls.minDistance = 2;
  hero.classList.remove("rack"); rackBtn.textContent = "Look inside a rack";
  if (back) modCam();
}
rackBtn.addEventListener("click", () => { if (rackView) exitRack(true); else enterRack(-1); });
openBtn.addEventListener("click", () => { if (modOpen) closeModule(false); else openModule(pickModule()); });
document.getElementById("zin").addEventListener("click", () => zoomBy(.7));
document.getElementById("zout").addEventListener("click", () => zoomBy(1.43));
document.getElementById("zreset").addEventListener("click", () => { if (rackView) exitRack(true); else if (modOpen) closeModule(false); else { userCam = false; tweenTo(center, center.clone().add(new THREE.Vector3(-.55, .28, .67).normalize().multiplyScalar(fitR)), 1.2); } });
addEventListener("keydown", e => { if (e.key !== "Escape") return; if (rackView) exitRack(true); else if (modOpen) closeModule(false); });

// click (not drag) on a module or hall opens it; the pointer turns to a hand over anything that responds
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let downAt = null, hoverQ = false;
const shown = o => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
function aim(e) { const r = renderer.domElement.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); }
function modAt(e) { aim(e); const hit = ray.intersectObjects(modsG.children, true).find(h => shown(h.object)); if (!hit) return -1;
  let o = hit.object; while (o && o.parent !== modsG) o = o.parent; return o ? modsG.children.indexOf(o) : -1; }
renderer.domElement.addEventListener("pointerdown", e => { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; });
// inside an open module: which part is under the pointer, and which rack; at the rack level, which kind of tray
function partAt(e) { if (!modOpen || openAmt < .8 || !cut.g.visible) return null;
  aim(e);
  if (rackView) { const hit = ray.intersectObject(cut.rackKit.g, true).find(h => shown(h.object)); return hit && hit.object.userData.sub ? { sub: hit.object.userData.sub } : null; }
  const hit = ray.intersectObject(cut.g, true).find(h => shown(h.object)); if (!hit) return null;
  const u = hit.object.userData; if (!u.part) return null;
  let o = hit.object, inKit = false; while (o) { if (o === cut.rackKit.g) inKit = true; o = o.parent; }
  return { id: u.part, rack: u.part === "racks" ? (inKit ? cut.rackKit.idx : u.rack) : -1 }; }
function hoverPart(h) {
  if (rackView) { setSub(h ? h.sub : subLock); return; }
  setPart(h ? h.id : hlLock); cut.rackKit.want = h && h.id === "racks" ? h.rack : hlLock === "racks" ? cut.rackKit.want : -1; }
renderer.domElement.addEventListener("pointerup", e => { if (!downAt) return; const d = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y), q = performance.now() - downAt.t; downAt = null;
  if (d >= 6 || q >= 400) return;
  const h = partAt(e);
  if (rackView) { subLock = h ? h.sub : null; setSub(subLock); return; }
  if (h && h.id === "racks" && h.rack >= 0) { enterRack(h.rack); return; }
  if (h) { hlLock = h.id; setPart(h.id); cut.rackKit.want = -1; return; }
  if (modOpen && e.pointerType !== "mouse") { hlLock = null; setPart(null); }
  const i = modAt(e); if (i >= 0 && i !== openIdx) openModule(i); });
renderer.domElement.addEventListener("pointerleave", () => { if (modOpen) hoverPart(null); });
renderer.domElement.addEventListener("pointermove", e => { if (e.buttons || hoverQ || e.pointerType !== "mouse") return; hoverQ = true;
  requestAnimationFrame(() => { hoverQ = false; const h = partAt(e); if (modOpen) hoverPart(h);
    const mi = rackView ? -1 : modAt(e); renderer.domElement.classList.toggle("pick", !!h || (mi >= 0 && mi !== openIdx)); }); });

frame();

} catch (e) { glNote("3D view unavailable: " + (e && e.message ? e.message : e) + ". Showing the flat model."); }
})();
