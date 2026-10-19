(() => {
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const KL = {LLA:'LLA', posible_aliado:'Posible aliado', disidente:'Disidente'};
const KB = {LLA:'b-lla', posible_aliado:'b-ali', disidente:'b-dis'};
const ESTADO = {oficial_actualizada:['Fuente oficial','b-ok'], oficial_parcial:['Oficial parcial','b-src'], oficial_desactualizada:['Oficial desactualizada','b-src'], solo_prensa:['Prensa','b-src'], sin_web:['Sin datos','b-src']};
const SEC = ['Primera','Segunda','Tercera','Cuarta','Quinta','Sexta','Séptima','Octava'];
const ARG = [[-55.1,-73.6],[-21.8,-53.6]];
const I = {
  mail:'<svg class="ic s" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  tel:'<svg class="ic s" viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
  link:'<svg class="ic s" viewBox="0 0 24 24"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>',
  ig:'<svg class="ic s" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/></svg>',
  x:'<svg class="ic s" viewBox="0 0 24 24"><path d="M4 4l16 16M20 4 4 20"/></svg>',
  fb:'<svg class="ic s" viewBox="0 0 24 24"><path d="M15 3h-2a4 4 0 0 0-4 4v3H7v4h2v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h2Z"/></svg>',
  q:'<svg class="ic s" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/></svg>',
  info:'<svg class="ic s" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  chev:'<svg class="ic s chev" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>',
  down:'<svg class="ic" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg>',
  back:'<svg class="ic s" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>',
  home:'<svg viewBox="0 0 24 24"><path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4"/><circle cx="12" cy="12" r="3"/></svg>',
  LLA:'<svg class="ic s" viewBox="0 0 24 24"><path d="M12 2 3 7v6c0 5 3.8 8.6 9 9 5.2-.4 9-4 9-9V7l-9-5Z"/><path d="m8.5 12 2.5 2.5 5-5"/></svg>',
  posible_aliado:'<svg class="ic s" viewBox="0 0 24 24"><path d="M11 17 8 20l-5-5 7-7 3 3"/><path d="m13 7 3-3 5 5-7 7-3-3"/><path d="m10 10 4 4"/></svg>',
  disidente:'<svg class="ic s" viewBox="0 0 24 24"><circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="6" r="2"/><path d="M6 8v8M18 8c0 4-6 4-6 8"/></svg>',
};

const S = { core:null, munis:null, prov:null, deptos:null, filt:{LLA:true,posible_aliado:false,disidente:false,q:false}, st:{}, snap:'peek' };
let P, map, bgLayer, provLayer, deptoLayer, markerLayer, lastFit=null;
const DD = {};
const isMobile = () => window.matchMedia('(max-width: 640px)').matches;
const hoverable = window.matchMedia('(hover: hover)').matches;

// ---------- data
Promise.all(['data/core.json','data/munis.json','data/prov.geojson','data/deptos.geojson'].map(u=>fetch(u,{cache:'no-cache'}).then(r=>r.json())))
.then(([core,munis,prov,deptos])=>{ Object.assign(S,{core,munis,prov,deptos}); P=core.prov; init(); });

// ---------- cargos (one filter for every kind of office)
const CT = [
  {k:'int', t:'Intendentes', one:'intendente', many:'intendentes', lv:'m'},
  {k:'conc', t:'Concejales', one:'concejal', many:'concejales', lv:'m'},
  {k:'com', t:'Comunas', one:'en comunas', many:'en comunas', lv:'m'},
  {k:'ce', t:'Consejeros escolares', one:'consejero escolar', many:'consejeros escolares', lv:'m'},
  {k:'leg', t:'Legisladores', one:'legislador provincial', many:'legisladores provinciales', lv:'p'},
  {k:'dip', t:'Diputados nac.', one:'diputado nacional', many:'diputados nacionales', lv:'n'},
  {k:'sen', t:'Senadores nac.', one:'senador nacional', many:'senadores nacionales', lv:'n'},
];
const CK = CT.map(c=>c.k), CMAP = Object.fromEntries(CT.map(c=>[c.k,c])), MK = ['int','conc','com','ce'];
S.cargo = new Set(CK);
try { const sv=JSON.parse(localStorage.getItem('cargos')||'null'); if(Array.isArray(sv)) S.cargo=new Set(sv.filter(k=>CK.includes(k))); } catch(e){}
const on = k => S.cargo.has(k);
const saveCargo = () => { try{ localStorage.setItem('cargos',JSON.stringify([...S.cargo])); }catch(e){} };

// ---------- counts (respect both filters: cargo + pertenencia)
const vis = (x,k) => S.filt[k] && (!S.filt.q || x.q);
const cnt = bl => (bl||[]).reduce((a,b)=>a+b.m.filter(x=>vis(x,b.k)).length,0);
const Z = () => ({int:0,conc:0,com:0,ce:0,leg:0,dip:0,sen:0});
const addC = (a,b) => { for(const k in b) a[k]+=b[k]; return a; };
const intVis = m => !!(m.int && vis(m.int,m.int.k));
function muniC(id){ const m=S.munis[id]; return {int:intVis(m)&&!m.int.ya?1:0, conc:m.tc?0:cnt(m.bl), com:m.tc?cnt(m.bl):0, ce:cnt(m.ce)}; }
const nacList = (pk,ch) => P[pk][ch].filter(x=>vis(x,x.k));
const nacCount = (pk,ch) => ch ? nacList(pk,ch).length : nacList(pk,'dip').length+nacList(pk,'sen').length;
function provC(pk,sec){ const p=P[pk], c=Z();
  p.munis.forEach(id=>{ if(sec && S.munis[id].sec!==sec) return; addC(c,muniC(id)); });
  if(!sec){ if(p.leg) c.leg=p.leg.cam.reduce((a,x)=>a+cnt(x.bl),0); c.dip=nacList(pk,'dip').length; c.sen=nacList(pk,'sen').length; }
  return c; }
const countryC = () => allProv().reduce((a,k)=>addC(a,provC(k)),Z());
const tot = c => CK.reduce((a,k)=>a+(on(k)?(c[k]||0):0),0);
const muniTot = id => tot(muniC(id));
const provTotal = pk => tot(provC(pk));
const intList = pk => (P[pk].int||[]).filter(x=>vis(x,x.k));
function breakdown(c,keys,sep=' · '){ return (keys||CK).filter(k=>on(k)&&c[k]).map(k=>`${c[k]} ${c[k]===1?CMAP[k].one:CMAP[k].many}`).join(sep); }
// which cargo chips make sense for a place (structurally present)
function cargoKeys(){ const st=S.st; if(!st.pk) return CK; const p=P[st.pk];
  if(st.mid){ const m=S.munis[st.mid]; return MK.filter(k=>k==='int'?!!m.int:k==='ce'?!!m.ce:k==='com'?!!m.tc:!m.tc&&!m.vi); }
  const ks=[]; if(p.int&&p.int.length) ks.push('int'); if(p.munis.some(id=>!S.munis[id].tc&&!S.munis[id].vi)||p.rev) ks.push('conc'); if(p.munis.some(id=>S.munis[id].tc)||p.revc) ks.push('com');
  if(p.munis.some(id=>S.munis[id].ce)) ks.push('ce'); if(!st.sec){ if(p.leg) ks.push('leg'); ks.push('dip','sen'); } return ks; }
const allProv = () => Object.keys(P);
const sum = (arr,f) => arr.reduce((a,x)=>a+f(x),0);
const camShort = n => /senad/i.test(n)?'Senado':/representantes/i.test(n)?'Representantes':/unicameral|^legislatura/i.test(n)?'Unicameral':'Diputados';
const camClean = n => n.replace(/\s*\(.*?\)\s*/g,'').trim();

// ---------- routing (place lives in the hash; cargo filter is a viewer preference)
function parse(){
  const p = location.hash.replace(/^#\/?/,'').split('/').map(s=>{ try{return decodeURIComponent(s);}catch(e){return s;} });
  const st = {pk:'',view:'res',sec:'',mid:'',ch:'dip',focus:''};
  if(p[0]==='nac'){ st.view='nac'; st.ch=p[1]==='sen'?'sen':'dip'; }
  else if(p[0]==='metodo'){ st.view='metodo'; }
  else if(p[0]==='dudas'){ st.view='dudas'; st.pk=P[p[1]]?p[1]:''; }
  else if(p[0]==='m' && S.munis[p[1]+'/'+p[2]]){ st.pk=p[1]; st.view='prov'; st.mid=p[1]+'/'+p[2]; st.sec=S.munis[st.mid].sec||''; }
  else if(p[0]==='p' && P[p[1]] && p[2]==='dudas'){ st.view='dudas'; st.pk=p[1]; }
  else if(p[0]==='p' && P[p[1]]){
    st.pk=p[1]; st.view='prov'; let r=p.slice(2);
    if(['conc','leg','nac'].includes(r[0])){ if(r[0]!=='conc') st.focus=r[0]; r=r.slice(1); }   // old links keep working
    if(r[0]==='sec') st.sec=SEC.includes(r[1])?r[1]:'';
    if(r[0]==='m' && S.munis[p[1]+'/'+r[1]]){ st.mid=p[1]+'/'+r[1]; st.sec=S.munis[st.mid].sec||''; }
  }
  return st;
}
function hashOf(st){
  if(st.view==='metodo') return '#/metodo';
  if(st.view==='dudas') return '#/dudas/'+(st.pk||'todas');
  if(!st.pk) return st.view==='nac' ? '#/nac/'+st.ch : '#/';
  let h='#/p/'+st.pk;
  if(st.mid) h+='/m/'+st.mid.split('/')[1]; else if(st.sec) h+='/sec/'+encodeURIComponent(st.sec);
  return h;
}
function go(h){ if(location.hash===h) render(); else location.hash=h; }
function set(patch){ go(hashOf({...S.st,...patch})); }
function pickProvince(pk){
  if(S.st.view==='dudas'){ set({pk}); return; }
  if(!pk){ go('#/'); return; }
  set({pk,view:'prov',sec:'',mid:''});
}

// ---------- init
function init(){
  $('#cutoff').textContent = 'Corte ' + S.core.gen + ' · ' + Object.values(S.munis).filter(m=>!m.vi).length + ' concejos y comunas relevados';
  map = L.map('map',{zoomControl:false, minZoom:3, maxZoom:13, zoomSnap:.25, zoomDelta:.5, wheelPxPerZoomLevel:90, attributionControl:true, worldCopyJump:false, inertia:true});
  map.fitBounds(ARG);
  map.attributionControl.setPrefix(false); map.attributionControl.addAttribution('Cartografía: IGN · Leaflet');
  L.control.zoom({position:'topright', zoomInTitle:'Acercar', zoomOutTitle:'Alejar'}).addTo(map);
  const Home = L.Control.extend({options:{position:'topright'}, onAdd(){ const d=L.DomUtil.create('div','leaflet-bar'); d.innerHTML=`<a href="#" class="home-ctl" role="button" title="Centrar la vista" aria-label="Centrar la vista">${I.home}</a>`; L.DomEvent.disableClickPropagation(d); d.firstChild.addEventListener('click',e=>{e.preventDefault(); refit(true);}); return d; }});
  new Home().addTo(map);
  bgLayer = L.geoJSON(S.prov,{style:{fillColor:'#fff',fillOpacity:1,color:'#D9D3EA',weight:1},
    onEachFeature:(f,l)=>{ const k=pkByCode(f.properties.in1); l.on({click:()=>{ if(S.st.pk && k!==S.st.pk) pickProvince(k); },
      mouseover:e=>{ if(S.st.pk && k!==S.st.pk){ l.setStyle({fillColor:'#F5F3FF'}); tip(e,`<b>${esc(P[k].name)}</b>Tocá para ir a esta provincia`);} }, mousemove:e=>{ if(S.st.pk && k!==S.st.pk) tip(e,`<b>${esc(P[k].name)}</b>Tocá para ir a esta provincia`); }, mouseout:()=>{ bgLayer.resetStyle(l); tip(null);} }); }}).addTo(map);
  updateMinZoom();
  bindUI();
  window.addEventListener('hashchange', render);
  window.addEventListener('resize', debounce(()=>{ updateMinZoom(); layoutSheet(); refit(); },150));
  layoutSheet();
  render();
}
function updateMinZoom(){ map.invalidateSize(); const z=map.getBoundsZoom(ARG,false,padPoint()); map.setMinZoom(Math.max(2,z-1)); }
function padPoint(){ const o=fitOpts(); return L.point(o.paddingTopLeft[0]+o.paddingBottomRight[0], o.paddingTopLeft[1]+o.paddingBottomRight[1]); }
function fitOpts(){
  if(isMobile()) return {paddingTopLeft:[14,14],paddingBottomRight:[14,sheetH(S.snap)+14]};
  const off=$('#panel').classList.contains('off'); const pw=$('#panel').offsetWidth;
  return {paddingTopLeft:[off?24:pw+40,24],paddingBottomRight:[60,24]};
}
function fit(bounds,maxZoom){ lastFit=[bounds,maxZoom]; map.fitBounds(bounds,{...fitOpts(),maxZoom:maxZoom||9,animate:true,duration:.45}); }
function refit(){ if(lastFit) map.fitBounds(lastFit[0],{...fitOpts(),maxZoom:lastFit[1]||9,animate:true,duration:.45}); }
function debounce(f,ms){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>f(...a),ms); }; }
function pkByCode(code){ return allProv().find(k=>P[k].code===code); }

// ---------- map drawing
const ramp = ['#F3F0FA','#DDD3F7','#BBA6EE','#8F6BDD','#6D28D9','#4C1D95'];
function colorFor(v,max){ if(!v) return ramp[0]; const t=Math.log(1+v)/Math.log(1+Math.max(1,max)); return ramp[1+Math.min(4,Math.floor(t*4.999))]; }
function binsLabel(max){ const L2=Math.log(1+Math.max(1,max)); const e=[0,1,2,3,4,5].map(i=>Math.round(Math.exp(L2*i/5)-1)); return [1,2,3,4,5].map(i=>[Math.max(1,e[i-1]+(i>1?1:0)), i===5?max:e[i]]); }
function tip(e,html){ const t=$('#tip'); if(!html||!hoverable){ t.hidden=true; return; } t.innerHTML=html; t.hidden=false; const x=e.originalEvent.clientX,y=e.originalEvent.clientY; const w=t.offsetWidth; t.style.left=Math.min(x+14,innerWidth-w-8)+'px'; t.style.top=(y+14)+'px'; }
function clearLayers(){ [provLayer,deptoLayer,markerLayer].forEach(l=>l&&map.removeLayer(l)); provLayer=deptoLayer=markerLayer=null; tip(null); }

function drawMap(){
  clearLayers(); const st=S.st;
  if(st.view==='dudas'){ drawDudas(); return; }
  if(!st.pk){ drawCountry(); return; }
  const p=P[st.pk]; const pf=S.prov.features.find(f=>f.properties.in1===p.code);
  const pb=L.geoJSON(pf).getBounds();
  if(MK.some(on) && p.munis.length) drawMunis(st.pk, st.mid, pb);
  else {
    const n=provTotal(st.pk);
    provLayer=L.geoJSON(pf,{style:{fillColor:n?'#BBA6EE':'#F3F0FA',fillOpacity:.75,color:'#4C1D95',weight:2},interactive:false}).addTo(map);
    legendSimple(p.name, n);
    fit(pb, 10);
  }
}
const cargoNote = () => { const sel=CT.filter(c=>on(c.k)); return sel.length===CT.length ? 'Todos los cargos.' : sel.length ? 'Cargos: '+sel.map(c=>c.t.toLowerCase()).join(', ')+'.' : 'Ningún cargo elegido.'; };
function drawCountry(){
  const st=S.st; const vals={}; let max=0;
  allProv().forEach(k=>{ vals[k] = st.view==='nac' ? nacCount(k,st.ch) : provTotal(k); max=Math.max(max,vals[k]); });
  provLayer = L.geoJSON(S.prov,{
    style:f=>({fillColor:colorFor(vals[pkByCode(f.properties.in1)],max),fillOpacity:.9,color:'#fff',weight:1.2}),
    onEachFeature:(f,l)=>{ const k=pkByCode(f.properties.in1);
      const h=()=>`<b>${esc(P[k].name)}</b>${st.view==='nac'?`${vals[k]} ${st.ch==='dip'?'diputados':'senadores'} nacionales`:(breakdown(provC(k),null,'<br>')||'Nadie con estos filtros')}`;
      l.on({mouseover:e=>{l.setStyle({weight:3,color:'#4C1D95'}); tip(e,h());}, mousemove:e=>tip(e,h()), mouseout:()=>{provLayer.resetStyle(l); tip(null);}, click:()=>pickProvince(k)}); }
  }).addTo(map);
  legend(st.view==='nac'?`${st.ch==='dip'?'Diputados':'Senadores'} nacionales por provincia`:'Personas por provincia', max, st.view==='nac'?'LLA y aliados, según filtros.':cargoNote());
  fit(ARG, 6);
}
const STAR='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8Z"/></svg>';
function muniTip(id){ const m=S.munis[id]; const iv=on('int')&&intVis(m); const b=breakdown(muniC(id),['conc','com','ce'],'<br>');
  const lines=[]; if(iv) lines.push(`${esc(m.int.c)}: ${esc(m.int.n)}`); if(b) lines.push(b);
  if(!lines.length) lines.push(m.vi?'Sin datos del concejo':'Sin LLA ni aliados con estos filtros');
  if(m.st.q && on(m.tc?'com':'conc')) lines.push(`${m.st.q} a confirmar`);
  return `<b>${esc(m.n)}</b>${lines.join('<br>')}`; }
function intIcon(sel){ return L.divIcon({className:'',html:`<div class="mk-int ${sel?'sel':''}" title="Intendente LLA">${STAR}</div>`,iconSize:[26,26],iconAnchor:[13,13]}); }
function drawMunis(pk, sel, pb){
  const p=P[pk];
  provLayer=L.geoJSON(S.prov.features.find(f=>f.properties.in1===p.code),{style:{fill:false,color:'#4C1D95',weight:2},interactive:false}).addTo(map);
  markerLayer=L.layerGroup().addTo(map);
  const showInt=on('int');
  if(pk==='buenos-aires'){
    const byG={}; p.munis.forEach(id=>{ const m=S.munis[id]; if(m.g) byG[m.g]=id; });
    let max=0; Object.values(byG).forEach(id=>max=Math.max(max,muniTot(id)));
    const feats=S.deptos.features.filter(f=>String(f.properties.in1).startsWith('06'));
    const sec=S.st.sec;
    deptoLayer=L.geoJSON({type:'FeatureCollection',features:feats},{
      style:f=>{ const id=byG[f.properties.in1]; const m=S.munis[id]; const v=id?muniTot(id):0; const inSec=!sec||(m&&m.sec===sec);
        const nodata=m && !m.bl.length && !m.ce && m.es!=='oficial_parcial';
        return {fillColor:nodata&&!v?'#E9E6F0':colorFor(v,max), fillOpacity:inSec?.85:.18, color:id===sel?'#2E1065':'#fff', weight:id===sel?3:.8, opacity:inSec?1:.4, dashArray:nodata&&!v?'3':null}; },
      onEachFeature:(f,l)=>{ const id=byG[f.properties.in1]; const m=S.munis[id]; if(!m) return;
        l.on({mouseover:e=>{ l.setStyle({weight:2.5,color:'#4C1D95'}); tip(e,muniTip(id)); }, mousemove:e=>tip(e,muniTip(id)), mouseout:()=>{ deptoLayer.resetStyle(l); tip(null); }, click:()=>set({mid:id,sec:m.sec})});
        if(showInt && intVis(m) && (!sec||m.sec===sec)){ const mk=L.marker(l.getBounds().getCenter(),{icon:intIcon(id===sel),keyboard:true,title:m.n+' · intendente LLA',zIndexOffset:2000}).addTo(markerLayer);
          mk.on({mouseover:e=>tip(e,muniTip(id)), mouseout:()=>tip(null), click:()=>set({mid:id,sec:m.sec})}); } }
    }).addTo(map);
    legend('LLA y aliados por municipio', max, cargoNote()+' Gris punteado = sin datos.', true, false, showInt&&p.int);
    if(sel && S.munis[sel].g){ const lay=deptoLayer.getLayers().find(l=>l.feature.properties.in1===S.munis[sel].g); if(lay){ fit(lay.getBounds(),10); return; } }
    if(sec){ const ls=deptoLayer.getLayers().filter(l=>{ const id=byG[l.feature.properties.in1]; return id&&S.munis[id].sec===sec; }); if(ls.length){ fit(L.featureGroup(ls).getBounds(),10); return; } }
    fit(pb,9);
  } else {
    const feats=S.deptos.features.filter(f=>String(f.properties.in1).startsWith(p.code));
    deptoLayer=L.geoJSON({type:'FeatureCollection',features:feats},{style:{fillColor:'#F3F0FA',fillOpacity:.8,color:'#fff',weight:.8},interactive:false}).addTo(map);
    p.munis.forEach(id=>{ const m=S.munis[id]; if(!m.ll) return; const c=muniC(id); const iv=showInt&&intVis(m);
      const v=tot({...c,int:0}); const relevant=MK.some(k=>on(k)&&(k==='int'?!!m.int:k==='com'?m.tc:k==='ce'?!!m.ce:!m.tc&&!m.vi));
      if(!relevant && !iv) return;
      if(iv && !v){ const mk=L.marker(m.ll,{icon:intIcon(id===sel),keyboard:true,title:m.n+' · intendente LLA',zIndexOffset:2000}).addTo(markerLayer);
        mk.on({mouseover:e=>tip(e,muniTip(id)), mouseout:()=>tip(null), click:()=>set({mid:id})}); return; }
      const sz=v?Math.min(40,24+v*1.4):18;
      const icon=L.divIcon({className:'',html:`<div class="mk ${v?'':'zero'} ${id===sel?'sel':''} ${m.tc?'com':''}" style="width:${sz}px;height:${sz}px">${v||''}${iv?`<span class="mk-star">${STAR}</span>`:''}</div>`,iconSize:[sz,sz],iconAnchor:[sz/2,sz/2]});
      const mk=L.marker(m.ll,{icon,keyboard:true,title:m.n,zIndexOffset:id===sel?3000:(iv?1500:v)}).addTo(markerLayer);
      mk.on({mouseover:e=>tip(e,muniTip(id)), mouseout:()=>tip(null), click:()=>set({mid:id})}); });
    legend('LLA y aliados por localidad',0,cargoNote()+' El número son las personas visibles con los filtros.',false,true,showInt&&p.int);
    if(sel && S.munis[sel].ll){ fit(L.latLng(S.munis[sel].ll).toBounds(18000),11); return; }
    fit(pb,8);
  }
}
function legend(title,max,note,nodata,markers,ints){
  let h=`<h4>${esc(title)}</h4>`;
  if(markers) h+=`<div class="sw"><span class="mk" style="width:22px;height:22px;display:inline-grid">5</span>Con representantes</div><div class="sw"><span class="mk zero" style="width:18px;height:18px;display:inline-grid"></span>Relevada, sin LLA ni aliados</div>`;
  else { h+=`<div class="sw"><i style="background:${ramp[0]}"></i><span class="num">0</span></div>`;
    binsLabel(max||1).forEach(([a,b],i)=>{ if(a<=b) h+=`<div class="sw"><i style="background:${ramp[i+1]}"></i><span class="num">${a===b?a:a+'–'+b}</span></div>`; });
    if(nodata) h+=`<div class="sw"><i class="hatch"></i>Sin datos</div>`; }
  if(ints) h+=`<div class="sw"><span class="mk-int" style="width:22px;height:22px">${STAR}</span>Intendente LLA</div>`;
  h+=`<div class="sub">${esc(note)}</div>`; setLegend(h);
}
function legendSimple(title,n){ setLegend(`<h4>${esc(title)}</h4><div class="sw"><i style="background:#BBA6EE"></i><span><b class="num">${n}</b> LLA y aliados</span></div><div class="sub">El detalle está en el panel.</div>`); }
function setLegend(h){ const el=$('#legend'); if(S.legOpen==null) S.legOpen=innerWidth>=1100; el.innerHTML=`<button type="button" class="leg-t" aria-expanded="${S.legOpen}">Referencias${I.down}</button><div class="leg-b" ${S.legOpen?'':'hidden'}>${h}</div>`; el.classList.toggle('open',S.legOpen); }

// ---------- custom dropdown (combobox)
function dd(id,label,opts,val,o={}){
  DD[id]={opts,pick:o.pick};
  const cur=opts.find(x=>x.v===val);
  return `<div class="dd" data-dd="${id}"><span class="lbl" id="l-${id}">${esc(label)}</span>
    <button type="button" class="dd-b" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="l-${id} v-${id}"><span class="dd-v ${cur?'':'phd'}" id="v-${id}">${esc(cur?cur.t:(o.ph||'Elegir'))}</span>${I.down}</button>
    <div class="dd-pop" hidden>${o.search?`<input class="dd-s" type="search" placeholder="${esc(o.sph||'Buscar…')}" aria-label="Filtrar ${esc(label)}" autocomplete="off">`:''}<ul role="listbox" aria-labelledby="l-${id}">${ddItems(id,val,'')}</ul></div></div>`;
}
function ddItems(id,val,q){
  const qq=norm(q); const items=DD[id].opts.filter(x=>!qq||norm(x.t+' '+(x.m||'')).includes(qq));
  if(!items.length) return '<li class="none" aria-disabled="true">Sin resultados</li>';
  return items.map(x=>`<li role="option" data-v="${esc(x.v)}" aria-selected="${x.v===val}"><span>${esc(x.t)}${x.m?` <span class="m">${esc(x.m)}</span>`:''}</span>${x.n!=null?`<span class="n ${x.n?'':'z'}">${x.n}</span>`:''}</li>`).join('');
}
function closeDD(except){ document.querySelectorAll('.dd').forEach(d=>{ if(d===except) return; d.querySelector('.dd-pop').hidden=true; d.querySelector('.dd-b').setAttribute('aria-expanded','false'); }); }
function openDD(d){ closeDD(d); if(isMobile() && S.snap!=='full') snap('full',true); const pop=d.querySelector('.dd-pop'); pop.hidden=false; d.querySelector('.dd-b').setAttribute('aria-expanded','true');
  const s=d.querySelector('.dd-s'); const sel=pop.querySelector('li[aria-selected=true]'); if(sel) sel.scrollIntoView({block:'nearest'});
  if(s && hoverable) s.focus(); else (sel||pop.querySelector('li[data-v]'))?.classList.add('act'); }
function moveAct(d,dir){ const lis=[...d.querySelectorAll('li[data-v]')]; if(!lis.length) return; let i=lis.findIndex(l=>l.classList.contains('act')); lis.forEach(l=>l.classList.remove('act')); i=(i+dir+lis.length)%lis.length; lis[i].classList.add('act'); lis[i].scrollIntoView({block:'nearest'}); }
function chooseDD(d,v){ const id=d.dataset.dd; closeDD(); DD[id].pick(v); }

function seg(key,items,val,label){ return `<div>${label?`<span class="lbl">${esc(label)}</span>`:''}<div class="seg" role="tablist" aria-label="${esc(label||key)}">${items.map(([v,t,n])=>`<button type="button" role="tab" data-seg="${key}" data-v="${esc(v)}" aria-selected="${v===val}"><span class="t">${esc(t)}</span>${n!=null?`<span class="n">${n}${items.length>3?'':' '+((key==='dt'||v==='dudas')?(n===1?'pendiente':'pendientes'):(n===1?'persona':'personas'))}</span>`:''}</button>`).join('')}</div></div>`; }

// ---------- nav (always-visible controls)
function scopeC(){ const st=S.st; if(st.mid) return {...Z(),...muniC(st.mid)}; if(st.pk) return provC(st.pk,st.sec); return countryC(); }
function cargoChips(){
  const c=scopeC(), ks=cargoKeys(); const all=ks.every(on);
  const chips=CT.filter(x=>ks.includes(x.k)).map(x=>`<button type="button" class="chip cc ${on(x.k)?'on':''} ${c[x.k]?'':'zero'}" data-c="${x.k}" aria-pressed="${on(x.k)}">${esc(x.t)}<span class="n">${c[x.k]||0}</span></button>`).join('');
  return `<div class="cargos"><span class="lbl">Cargos</span><div class="cg" role="group" aria-label="Cargos">${chips}<button type="button" class="chip cc-all" data-call="${all?'none':'all'}">${all?'Ninguno':'Todos'}</button></div></div>`;
}
function renderNav(){
  const st=S.st; let h='';
  const popts=[{v:'',t:'Toda Argentina',n:st.view==='nac'?sum(allProv(),k=>nacCount(k,st.ch)):tot(countryC())}]
    .concat(allProv().sort((a,b)=>P[a].name.localeCompare(P[b].name)).map(k=>({v:k,t:P[k].name,n:st.view==='nac'?nacCount(k,st.ch):provTotal(k)})));
  if(st.pk || st.view==='nac' || st.view==='dudas') h+=`<button type="button" class="to-arg" data-arg="1">${I.back}Volver a toda Argentina</button>`;
  if(st.view==='metodo'){ $('#nav').innerHTML=h; return; }
  if(st.view==='dudas'){
    h+=dd('prov','Provincia',popts,st.pk,{search:true,sph:'Buscar provincia…',pick:pickProvince});
    $('#nav').innerHTML=h; return; }
  if(st.view==='nac'){
    h+=seg('ch',[['dip','Diputados',sum(allProv(),k=>nacCount(k,'dip'))],['sen','Senadores',sum(allProv(),k=>nacCount(k,'sen'))]],st.ch,'Congreso de la Nación');
    $('#nav').innerHTML=h; return; }
  const provDD=dd('prov','Provincia',popts,st.pk,{search:true,sph:'Buscar provincia…',pick:pickProvince});
  if(st.pk && P[st.pk].munis.length){
    const p=P[st.pk]; let ms=p.munis.map(id=>S.munis[id]); if(st.sec) ms=ms.filter(m=>m.sec===st.sec);
    const mopts=ms.sort((a,b)=>a.n.localeCompare(b.n,'es',{numeric:true})).map(m=>({v:m.id,t:m.n,m:st.pk==='buenos-aires'&&!st.sec?m.sec:(m.tc?'comuna':''),n:muniTot(m.id)}));
    const muniDD=dd('muni','Lugar',[{v:'',t:'Toda la provincia'}].concat(mopts),st.mid,{search:true,sph:'Buscar municipio o comuna…',ph:'Toda la provincia',pick:v=>set({mid:v,sec:v?(S.munis[v].sec||''):st.sec})});
    h+=`<div class="nav-row">${provDD}${muniDD}</div>`;
    if(st.pk==='buenos-aires' && !st.mid){ const sopts=[{v:'',t:'Todas',n:provTotal(st.pk)}].concat(SEC.map(s=>({v:s,t:s+' sección',n:tot(provC(st.pk,s))})));
      h+=dd('sec','Sección electoral',sopts,st.sec,{pick:v=>set({sec:v,mid:''})}); }
  } else h+=provDD;
  h+=cargoChips();
  $('#nav').innerHTML=h;
}

// ---------- body
function render(){
  S.st=parse();
  if(S.st.focus==='leg') S.cargo.add('leg'); if(S.st.focus==='nac'){ S.cargo.add('dip'); S.cargo.add('sen'); }
  renderNav();
  const st=S.st;
  if(st.view==='metodo') renderMethod();
  else if(st.view==='dudas') renderDudas();
  else if(!st.pk) st.view==='nac' ? renderNacAll() : renderCountry();
  else st.mid ? renderMuni(st.mid) : renderProv(st.pk);
  $('#body').scrollTop=0;
  if(isMobile()){ const pn=$('#panel'); layoutSheet();
    const deep = st.mid || st.view==='nac' || st.view==='metodo' || st.view==='dudas' || st.focus;
    if(deep && S.snap==='peek') snap('mid',true);
    pn.scrollTop = deep && S.lastHash!==undefined ? Math.max(0,$('#body').offsetTop-26) : 0; }
  if(st.focus){ const el=document.getElementById('sec-'+st.focus); if(el) setTimeout(()=>el.scrollIntoView({block:'start'}),30); }
  S.lastHash=location.hash;
  drawMap();
}
const kpi=(v,l,c='',attr='')=>attr?`<button type="button" class="kpi ${c}" ${attr}><b>${v}</b><span>${esc(l)}</span></button>`:`<div class="kpi ${c}"><b>${v}</b><span>${esc(l)}</span></div>`;
const noneHTML = () => `<div class="empty">No hay ningún cargo elegido. Activá alguno en <b>Cargos</b>, arriba.</div>`;
function dudasCard(pk){ const n=dudas(pk).length; return n?`<section class="zone"><a class="method-card q" href="#/dudas/${pk||'todas'}">${I.q}<span><b>${n} ${n===1?'persona':'personas'} a confirmar</b><br>Electos por LLA de los que no sabemos si siguen en el espacio.</span>${I.chev}</a></section>`:''; }
function renderCountry(){
  const c=countryC(); let q=0,dis=0;
  allProv().forEach(k=>{ const p=P[k]; [...p.dip,...p.sen].forEach(x=>{ if(x.k==='disidente') dis++; q+=x.q||0; });
    if(p.leg) p.leg.cam.forEach(cm=>cm.bl.forEach(b=>{ if(b.k==='disidente') dis+=b.m.length; b.m.forEach(x=>q+=x.q||0); }));
    p.munis.forEach(id=>{ const m=S.munis[id]; [...m.bl,...(m.ce||[])].forEach(b=>{ if(b.k==='disidente') dis+=b.m.length; b.m.forEach(x=>q+=x.q||0); }); }); });
  const rows=allProv().map(k=>[k,P[k],provTotal(k)]).sort((a,b)=>b[2]-a[2]); const max=rows[0][2]||1;
  const ks=CT.filter(x=>on(x.k));
  $('#body').innerHTML=`
  <section class="zone"><h2>Argentina</h2><p class="sub">Elegí una provincia en el mapa o en el menú. Con <b>Cargos</b> elegís qué tipo de representantes ver; abajo, con <b>Mostrar</b>, si son de LLA, aliados o disidentes.</p></section>
  <section class="zone"><h3>${tot(c)} personas con estos filtros</h3>${ks.length?`<div class="kpis">${ks.map(x=>kpi(c[x.k],x.t,'',x.k==='dip'||x.k==='sen'?`data-go="#/nac/${x.k}"`:`data-solo="${x.k}" title="Ver solo ${esc(x.t.toLowerCase())}"`)).join('')}${kpi(dis,'Disidentes (ex LLA)')}</div><p class="sub" style="margin-top:8px">Tocá un número para ver solo ese cargo.</p>`:noneHTML()}</section>
  ${dudasCard('')}
  <section class="zone"><a class="method-card" href="#/metodo">${I.info}<span><b>¿Cómo se armó este mapa?</b><br>Qué cuenta como LLA, aliado o disidente, de dónde salen los datos y qué significa cada duda.</span>${I.chev}</a></section>
  ${ks.length?`<section class="zone"><h3>Provincias</h3><ul class="rows">${rows.map(([k,p,v])=>`<li class="row" tabindex="0" data-pk="${k}"><div class="lft"><div class="nm">${esc(p.name)}</div><div class="meta">${esc(breakdown(provC(k))||'Sin LLA ni aliados con estos filtros')}</div></div><div class="bar"><i style="width:${Math.round(v/max*100)}%"></i></div><span class="val">${v}</span>${I.chev}</li>`).join('')}</ul></section>`:''}`;
}
function provHead(pk,sec){
  const p=P[pk], c=provC(pk,sec), b=breakdown(c);
  return `<section class="zone"><h2>${esc(p.name)}${sec?` · ${esc(sec)} sección`:''}</h2><p class="sub">${b?esc(b):'Nadie con estos filtros.'}</p></section>`;
}
function zoneH(id,title,n,inner,hint){ return `<section class="zone" id="sec-${id}"><h3>${title}${n!=null?` · ${n}`:''}</h3>${hint?`<div class="hint" style="margin:0 0 10px">${I.info}<span>${hint}</span></div>`:''}${inner}</section>`; }
function renderProv(pk){
  const p=P[pk], st=S.st; const ks=cargoKeys().filter(on);
  let h=provHead(pk,st.sec);
  if(!S.cargo.size){ $('#body').innerHTML=h+noneHTML(); return; }
  // intendentes
  if(ks.includes('int')){ const l=intList(pk).filter(x=>!st.sec||S.munis[x.mid].sec===st.sec); if(l.length) h+=intHTML(l); }
  // municipios: concejales + consejeros escolares (+ intendente as context)
  const mk=['conc','ce'].filter(k=>ks.includes(k));
  if(mk.length){
    let ms=p.munis.map(id=>S.munis[id]).filter(m=>!m.tc && (!st.sec||m.sec===st.sec) && (!m.vi || (ks.includes('int')&&intVis(m))));
    const val=m=>tot({...Z(),...muniC(m.id),int:0});
    ms.sort((a,b)=>val(b)-val(a)||a.n.localeCompare(b.n)); const max=Math.max(1,...ms.map(val));
    const qN=ms.reduce((a,m)=>a+(m.st.q||0),0);
    const title=pk==='buenos-aires'?'Municipios':mk.length===1&&mk[0]==='conc'?'Concejos deliberantes':'Municipios';
    const note=pk==='buenos-aires'?`Los 135 municipios: concejo deliberante${ks.includes('ce')?' y consejo escolar':''}.${st.sec?'':' Podés filtrar por sección electoral.'}`:`${ms.filter(m=>!m.vi).length} concejos con datos${p.rev&&ks.includes('conc')?` y ${p.rev.m.length} municipios revisados sin bloque LLA (al final)`:''}.`;
    h+=zoneH('conc',title,ms.length,ms.length?`<ul class="rows">${ms.map(m=>{ const v=val(m); const es=ESTADO[m.es]||['','b-src']; const bd=breakdown({...Z(),...muniC(m.id),int:0},mk);
      return `<li class="row" tabindex="0" data-mid="${m.id}"><div class="lft"><div class="nm">${esc(m.n)}${ks.includes('int')&&intVis(m)?` <span class="star-s" title="Intendente LLA">${STAR}</span>`:''}</div><div class="meta">${m.sec&&!st.sec?esc(m.sec)+' · ':''}${bd?esc(bd)+' · ':''}${m.vi?'Sin datos del concejo':esc(es[0])}${m.st.q&&ks.includes('conc')?` · <b style="color:var(--q)">${m.st.q} a confirmar</b>`:''}</div></div><div class="bar"><i style="width:${Math.round(v/max*100)}%"></i></div><span class="val">${v}</span>${I.chev}</li>`; }).join('')}</ul>`:'<div class="empty">Sin municipios relevados.</div>',esc(note)+(qN&&ks.includes('conc')?` Hay <b>${qN}</b> casos a confirmar.`:''));
    if(ks.includes('conc')) h+=revHTML(p);
  }
  if(ks.includes('com') && !st.sec) h+=comHTML(p,p.munis.map(id=>S.munis[id]).filter(m=>m.tc));
  if(ks.includes('leg') && p.leg){
    const inner=p.leg.cam.map(c=>`${p.leg.cam.length>1?`<h4 class="cam">${esc(camClean(c.n))} · ${cnt(c.bl)}</h4>`:''}${cnt(c.bl)?blocsHTML(c.bl):'<div class="empty">Sin legisladores LLA ni aliados con los filtros actuales.</div>'}${othersHTML(c.ot)}`).join('');
    const ln=p.leg.cam.reduce((a,c)=>a+cnt(c.bl),0);
    h+=zoneH('leg',p.leg.cam.length>1?'Legislatura':/^legislatura/i.test(camClean(p.leg.cam[0].n))?'Legislatura (unicameral)':'Legislatura · '+esc(camClean(p.leg.cam[0].n)),ln,inner+(p.leg.dudas&&p.leg.dudas.length?dudasHTML(p.leg.dudas):'')+(p.leg.cx&&p.leg.cx.length?ctxHTML(p.leg.cx):''));
  }
  const nk=['dip','sen'].filter(k=>ks.includes(k));
  if(nk.length){
    const inner=nk.map(ch=>{ const l=nacList(pk,ch); return `<h4 class="cam">${ch==='dip'?'Diputados nacionales':'Senadores nacionales'} · ${l.length}</h4>${l.length?blocsHTML(groupNac(l),false):'<div class="empty">Ninguno LLA o aliado con los filtros actuales.</div>'}`; }).join('');
    h+=zoneH('nac','Congreso de la Nación',nk.reduce((a,ch)=>a+nacList(pk,ch).length,0),inner);
  }
  h+=dudasCard(pk);
  $('#body').innerHTML=h;
}
function intHTML(l){
  return zoneH('int','Intendentes',l.length,`<ul class="rows">${l.map(x=>`<li class="row int" tabindex="0" data-mid="${x.mid}">${x.f?`<img class="av int-av" src="${esc(x.f)}" alt="Foto de ${esc(x.n)}" loading="lazy">`:`<span class="star-l" aria-hidden="true">${STAR}</span>`}<div class="lft"><div class="nm">${esc(x.n)} <span class="badge ${KB[x.k]}">${esc(KL[x.k])}</span></div><div class="meta">${esc(x.c)} de ${esc(x.mu)}${x.m?` · ${esc(x.m)}`:''}</div>${x.no?`<div class="meta">${esc(x.no)}</div>`:''}${x.s?`<div class="meta">Fuente: ${srcLink(x.s)}</div>`:''}</div>${I.chev}</li>`).join('')}</ul>`,'Intendentes de municipios gobernados por LLA. Los presidentes comunales están en <b>Comunas</b>.');
}
function comHTML(p,cs){ if(!cs.length&&!p.revc) return ''; cs.sort((a,b)=>muniTot(b.id)-muniTot(a.id)||a.n.localeCompare(b.n,'es',{numeric:true})); const max=Math.max(1,...cs.map(m=>muniTot(m.id)));
  return zoneH('com','Comunas y comisiones',cs.length,`${cs.length?`<ul class="rows">${cs.map(m=>{ const v=muniTot(m.id); return `<li class="row" tabindex="0" data-mid="${m.id}"><div class="lft"><div class="nm">${esc(m.n)}</div><div class="meta">${esc(m.cu||'Comuna')}</div></div><div class="bar"><i style="width:${Math.round(v/max*100)}%"></i></div><span class="val">${v}</span>${I.chev}</li>`; }).join('')}</ul>`:''}${p.revc?`<details class="ctx rev"><summary>Comunas revisadas sin LLA · ${p.revc.m.length}</summary><p class="sub" style="margin:8px 0">${linkify(p.revc.nota)}</p><p class="revl">${p.revc.m.map(esc).join(' · ')}</p></details>`:''}`,
    p.name.startsWith('Ciudad')?'Juntas comunales de la Ciudad (7 miembros cada una, elegidas en 2023).':'Gobiernos de localidades chicas: comisiones comunales, de fomento o juntas de gobierno. No son concejos deliberantes.'); }
function revHTML(p){ if(!p.rev||S.st.sec) return ''; return `<section class="zone"><details class="ctx rev"><summary>Revisados sin bloque LLA · ${p.rev.m.length}</summary><p class="sub" style="margin:8px 0">${linkify(p.rev.nota.charAt(0).toUpperCase()+p.rev.nota.slice(1))}</p><p class="revl">${p.rev.m.map(esc).join(' · ')}</p></details></section>`; }
function groupNac(list){ const by={}; list.forEach(x=>{ (by[x.bl]=by[x.bl]||{b:x.bl,k:x.k,m:[]}).m.push(x); }); return Object.values(by); }
function renderNacAll(){
  const st=S.st, ch=st.ch; const list=[]; allProv().forEach(k=>nacList(k,ch).forEach(x=>list.push(x)));
  const ot=S.core.nac[ch==='dip'?'diputados':'senado'].otros;
  $('#body').innerHTML=`<section class="zone"><h2>${ch==='dip'?'Diputados':'Senadores'} nacionales</h2><p class="sub">${list.length} LLA y aliados en todo el país, por bloque.</p></section>
   <section class="zone">${list.length?blocsHTML(groupNac(list),true):'<div class="empty">Nadie con los filtros actuales.</div>'}${othersHTML(ot)}</section>`;
}
function renderMuni(id){
  const m=S.munis[id], st=S.st, es=ESTADO[m.es]||['','b-src']; const ks=cargoKeys().filter(on);
  const qList=[]; m.bl.forEach(b=>b.m.forEach(x=>{ if(x.q) qList.push(x); }));
  let h=`<section class="zone"><button type="button" class="back" data-back="1">${I.back}${m.pv==='buenos-aires'?(st.sec?st.sec+' sección':'Toda la provincia'):'Toda '+esc(P[m.pv].name)}</button>
    <h2>${esc(m.n)}</h2><p class="sub">${esc(m.vi?'Municipio':(m.cu||'Concejo Deliberante'))}${m.tot?` · ${m.tot} bancas`:''}${m.sec?` · ${esc(m.sec)} sección`:''}${m.vi?'':` · <span class="badge ${es[1]}">${esc(es[0])}</span>`}</p>
    <dl class="info">${m.tel?`<dt>Teléfono</dt><dd><a href="tel:${esc(m.tel)}">${esc(m.tel)}</a></dd>`:''}${m.em?`<dt>Correo</dt><dd><a href="mailto:${esc(m.em)}">${esc(m.em)}</a></dd>`:''}${m.dir?`<dt>Dirección</dt><dd>${esc(m.dir)}</dd>`:''}${m.web?`<dt>Web</dt><dd>${srcLink(m.web)}</dd>`:''}${m.src&&m.src!==m.web?`<dt>Fuente</dt><dd>${srcLink(m.src)}</dd>`:''}</dl>${ctxHTML(m.cx)}</section>`;
  if(!S.cargo.size){ $('#body').innerHTML=h+noneHTML(); return; }
  if(ks.includes('int') && m.int){ const x=m.int;
    h+=zoneH('int',esc(x.c),null,blocsHTML([{b:'La Libertad Avanza',k:x.k,m:[{n:x.n,f:x.f,c:x.c+' de '+x.mu,m:x.m,s:x.s,no:x.no}]}])); }
  const ck=m.tc?'com':'conc';
  if(ks.includes(ck) && !m.vi){ h+=zoneH(ck,esc(m.cu||'Concejo Deliberante'),cnt(m.bl),(cnt(m.bl)?blocsHTML(m.bl):`<div class="empty">${m.bl.length?'Nadie con los filtros actuales.':'Sin representantes LLA ni aliados relevados.'}</div>`)+othersHTML(m.ot)); }
  if(ks.includes('conc') && m.vi) h+=zoneH('conc','Concejo Deliberante',null,'<div class="empty">Revisado sin bloque LLA en el concejo.</div>');
  if(ks.includes('ce') && m.ce){ const n=cnt(m.ce); h+=zoneH('ce','Consejo escolar',n,(n?blocsHTML(m.ce):'<div class="empty">Sin consejeros con los filtros actuales.</div>')+`<p class="sub" style="margin-top:8px">Electos por lista (Junta Electoral PBA). En 2025 la Alianza LLA sumó a LLA, el PRO y vecinales: salvo confirmación, no sabemos de qué partido es cada consejero.</p>`); }
  if(qList.length && ks.includes(ck)) h+=zoneH('du','A confirmar',qList.length,`<ul class="dlist">${qList.map(x=>`<li>${I.q}<div><b>${esc(x.n)}</b> — ${esc(x.qd||'No sabemos si sigue en el bloque LLA.')}</div></li>`).join('')}</ul>`);
  $('#body').innerHTML=h;
}
function othersHTML(ot){ if(!ot||!ot.length) return ''; return `<h3 style="margin-top:14px">Otros bloques (no relevados)</h3><div class="others">${ot.map(o=>`<span>${esc(o.bloque)}${o.bancas?` · ${o.bancas}`:''}</span>`).join('')}</div>`; }
function ctxHTML(c){ if(!c||!c.length) return ''; return `<details class="ctx"><summary>Contexto y fuentes (${c.length})</summary><ul class="dlist">${c.map(x=>`<li>${I.info}<div>${linkify(x)}</div></li>`).join('')}</ul></details>`; }
function dudasHTML(d){ return `<h3>Dudas</h3><ul class="dlist">${d.map(x=>`<li>${I.q}<div>${linkify(x)}</div></li>`).join('')}</ul>`; }
function blocsHTML(bl,nac){
  const order={LLA:0,posible_aliado:1,disidente:2};
  return bl.slice().sort((a,b)=>order[a.k]-order[b.k]||b.m.length-a.m.length).map(b=>{ const ms=b.m.filter(x=>vis(x,b.k)); if(!ms.length) return '';
    return `<div class="bloc"><div class="bloc-h k-${b.k}"><span class="badge ${KB[b.k]}">${I[b.k]}${KL[b.k]}</span><strong>${esc(b.b)}</strong><span class="cnt">${ms.length}</span></div>${ms.map(x=>personHTML(x,nac)).join('')}</div>`; }).join('');
}
function initials(n){ const p=n.replace(/["“”]/g,'').split(/[ ,]+/).filter(Boolean); return ((p[1]||'')[0]||'')+((p[0]||'')[0]||''); }
function personHTML(x,nac){
  const img = x.f ? `<img class="av" src="${esc(x.f)}" alt="Foto de ${esc(x.n)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.outerHTML='<div class=&quot;av ini&quot;>${esc(initials(x.n))}</div>'">` : `<div class="av ini" aria-hidden="true">${esc(initials(x.n))}</div>`;
  const tags=[]; if(x.r) tags.push(`<span class="badge b-src">${esc(x.r)}</span>`); if(x.m) tags.push(`<span class="badge b-src num">${esc(x.m)}</span>`); if(nac&&x.pv) tags.push(`<span class="badge b-src">${esc(x.pv)}</span>`); if(x.q) tags.push(`<span class="badge b-q">${I.q}A confirmar</span>`);
  const c=[]; if(x.e) c.push(`<a href="mailto:${esc(x.e)}">${I.mail}${esc(x.e)}</a>`); if(x.t) c.push(`<span>${I.tel}${esc(x.t)}</span>`);
  const rs=x.rs||{}; if(rs.instagram) c.push(`<a href="https://instagram.com/${esc(rs.instagram)}" target="_blank" rel="noopener">${I.ig}@${esc(rs.instagram)}</a>`); if(rs.x) c.push(`<a href="https://x.com/${esc(rs.x)}" target="_blank" rel="noopener">${I.x}@${esc(rs.x)}</a>`); if(rs.facebook) c.push(`<a href="${esc(rs.facebook)}" target="_blank" rel="noopener">${I.fb}Facebook</a>`);
  if(x.w) c.push(`<a href="${esc(x.w)}" target="_blank" rel="noopener">${I.link}Ficha oficial</a>`);
  const more = (x.no||x.s) ? `<details class="more"><summary>Ver fuente y notas</summary>${x.no?`<div class="note">${linkify(x.no)}</div>`:''}${x.s?`<div class="note">Fuente: ${srcLink(x.s)}${x.cf?` · confianza ${esc(x.cf)}`:''}</div>`:''}</details>` : '';
  return `<article class="person">${img}<div><div class="pn">${esc(x.n)}</div><div class="pr">${esc(x.c||'')}</div><div class="tags">${tags.join('')}</div>${c.length?`<div class="contact">${c.join('')}</div>`:''}${x.q&&x.qd?`<div class="qbox">${I.q}<span>${esc(x.qd)}</span></div>`:''}${more}</div></article>`;
}
function srcLink(u){ const s=String(u); const m=s.match(/https?:\/\/[^\s)]+/); if(!m) return esc(s); let host=''; try{host=new URL(m[0]).hostname.replace(/^www\./,'');}catch(e){host=m[0];} return `<a href="${esc(m[0])}" target="_blank" rel="noopener">${esc(host)}</a>`; }
function linkify(s){ return esc(s).replace(/(https?:\/\/[^\s)]+)/g,u=>{ let h=u; try{h=new URL(u.replace(/&amp;/g,'&')).hostname.replace(/^www\./,'');}catch(e){} return `<a href="${u}" target="_blank" rel="noopener">${h}</a>`; }); }
// ---------- dudas (all doubts grouped)
let DCACHE=null;
function dudasAll(){
  if(DCACHE) return DCACHE; const out=[];
  const sur=n=>norm(String(n).split(',')[0].replace(/["“”]/g,'')).split(/\s+/).filter(w=>w.length>=4);
  // one entry per person; notes that mention someone are attached to that person; the rest stay as notes of the place
  const place=(pk,pl,href,members)=>{ members.forEach(([x,b])=>{ if(x.q) out.push({pk,place:pl,href,n:x.n,b,txt:[x.qd||'No sabemos si sigue en el bloque LLA.'],src:x.s||''}); }); };
  const mem=bl=>{ const r=[]; (bl||[]).forEach(b=>b.m.forEach(x=>r.push([x,b.b]))); return r; };
  allProv().forEach(pk=>{ const p=P[pk];
    p.munis.forEach(id=>{ const m=S.munis[id];
      place(pk,(pk==='buenos-aires'&&m.sec?`${m.n} (${m.sec} sección)`:m.n),`#/p/${pk}/conc/m/${id.split('/')[1]}`,mem(m.bl).concat(mem(m.ce))); });
    if(p.leg){ p.leg.cam.forEach((c,i)=>place(pk,'Legislatura · '+camShort(c.n),`#/p/${pk}/leg/${i}`,mem(c.bl))); }
    ['dip','sen'].forEach(ch=>place(pk,ch==='dip'?'Diputados nacionales':'Senadores nacionales',`#/p/${pk}/nac/${ch}`,p[ch].map(x=>[x,x.bl])));
  });
  DCACHE=out; return out;
}
function dudas(pk){ return dudasAll().filter(x=>!pk||x.pk===pk); }
function renderDudas(){
  const st=S.st; const D=dudas(st.pk);
  const byP={}; D.forEach(x=>{ ((byP[x.pk]=byP[x.pk]||{})[x.place]=byP[x.pk][x.place]||{href:x.href,it:[]}).it.push(x); });
  const provs=Object.keys(byP).sort((a,b)=>dudas(b).length-dudas(a).length||P[a].name.localeCompare(P[b].name));
  const nPer=D.filter(x=>x.n).length, nGen=D.length-nPer;
  let h=`<section class="zone"><h2>Dudas${st.pk?' · '+esc(P[st.pk].name):''}</h2>
   <p class="sub">${D.length} ${D.length===1?'persona':'personas'}${st.pk?'':' en todo el país'} de las que no sabemos si siguen en LLA.</p>
   <div class="hint">${I.info}<span>Son electos por listas de LLA (2023 y 2025) cuyo bloque actual no pudimos confirmar en ninguna fuente. Tocá un lugar para ir a su ficha.</span></div>
   <div class="search" style="margin-top:10px"><svg class="ic" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="dq" type="search" placeholder="Filtrar por nombre, lugar o motivo" aria-label="Filtrar dudas" autocomplete="off"></div></section>`;
  if(!D.length) h+='<div class="empty">Sin dudas abiertas.</div>';
  provs.forEach(pk=>{ const places=byP[pk]; const tot=Object.values(places).reduce((a,p)=>a+p.it.length,0);
    h+=`<section class="zone dprov"><details ${st.pk||provs.length<=3?'open':''}><summary class="dsum"><span>${esc(P[pk].name)}</span><span class="cnt-q">${tot}</span></summary>`;
    Object.entries(places).sort((a,b)=>b[1].it.length-a[1].it.length||a[0].localeCompare(b[0])).forEach(([pl,o])=>{
      const its=o.it.slice().sort((a,b)=>(b.n?1:0)-(a.n?1:0));
      h+=`<div class="dplace"><a class="dpl" href="${o.href}">${esc(pl)}<span class="cnt">${its.length}</span>${I.chev}</a><ul class="dlist">`+
        its.map(x=>`<li data-t="${esc(norm((x.n||'')+' '+pl+' '+x.txt.join(' ')+' '+P[pk].name))}">${x.n?I.q:I.info}<div>${x.n?`<b>${esc(x.n)}</b> <span class="sub">· ${esc(x.b||'')}</span>`:'<b class="sub">Sobre el lugar</b>'}${x.txt.map(t=>`<div class="dtx">${linkify(t)}</div>`).join('')}${x.src&&x.n?`<div class="sub">Fuente: ${srcLink(x.src)}</div>`:''}</div></li>`).join('')+`</ul></div>`; });
    h+='</details></section>'; });
  $('#body').innerHTML=h;
  const q=$('#dq'); q.addEventListener('input',()=>{ const v=norm(q.value.trim()); document.querySelectorAll('#body .dlist li').forEach(li=>li.hidden=v&&!li.dataset.t.includes(v));
    document.querySelectorAll('#body .dplace').forEach(d=>d.hidden=![...d.querySelectorAll('li')].some(li=>!li.hidden));
    document.querySelectorAll('#body .dprov').forEach(d=>{ const vis=[...d.querySelectorAll('.dplace')].some(x=>!x.hidden); d.hidden=!vis; if(v&&vis) d.querySelector('details').open=true; }); });
}
function drawDudas(){
  const st=S.st;
  if(st.pk){ const p=P[st.pk]; const pf=S.prov.features.find(f=>f.properties.in1===p.code);
    provLayer=L.geoJSON(pf,{style:{fillColor:'#FDE68A',fillOpacity:.7,color:'#92400E',weight:2},interactive:false}).addTo(map);
    setLegend(`<h4>Dudas en ${esc(p.name)}</h4><div class="sw"><i style="background:#FDE68A"></i><span><b class="num">${dudas(st.pk).length}</b> pendientes</span></div><div class="sub">El detalle está en el panel.</div>`);
    fit(L.geoJSON(pf).getBounds(),10); return; }
  const vals={}; let max=0; allProv().forEach(k=>{ vals[k]=dudas(k).length; max=Math.max(max,vals[k]); });
  const qr=['#FFFBEB','#FEF3C7','#FDE68A','#FBBF24','#F59E0B','#B45309'];
  const col=v=>{ if(!v) return qr[0]; const t=Math.log(1+v)/Math.log(1+Math.max(1,max)); return qr[1+Math.min(4,Math.floor(t*4.999))]; };
  provLayer=L.geoJSON(S.prov,{style:f=>({fillColor:col(vals[pkByCode(f.properties.in1)]),fillOpacity:.9,color:'#fff',weight:1.2}),
    onEachFeature:(f,l)=>{ const k=pkByCode(f.properties.in1); const h=()=>`<b>${esc(P[k].name)}</b>${vals[k]} dudas pendientes`;
      l.on({mouseover:e=>{l.setStyle({weight:3,color:'#92400E'}); tip(e,h());},mousemove:e=>tip(e,h()),mouseout:()=>{provLayer.resetStyle(l); tip(null);},click:()=>set({pk:k})}); }}).addTo(map);
  let lg=`<h4>Dudas por provincia</h4><div class="sw"><i style="background:${qr[0]}"></i><span class="num">0</span></div>`;
  binsLabel(max||1).forEach(([a,b],i)=>{ if(a<=b) lg+=`<div class="sw"><i style="background:${qr[i+1]}"></i><span class="num">${a===b?a:a+'–'+b}</span></div>`; });
  setLegend(lg+'<div class="sub">Personas a confirmar + notas.</div>'); fit(ARG,6);
}
function renderMethod(){
  $('#body').innerHTML=`<section class="zone"><button type="button" class="back" data-go="#/">${I.back}Volver al mapa</button><h2>Cómo se armó</h2>
  <p class="sub" style="margin-bottom:10px">Corte: ${esc(S.core.gen)}.</p>
  <ul class="dlist">
   <li>${I.LLA}<div><b>LLA</b>: integra hoy un bloque con nombre La Libertad Avanza según la web oficial del cuerpo, boletín oficial o crónica de la sesión.</div></li>
   <li>${I.posible_aliado}<div><b>Posible aliado</b>: PRO, Juntos por el Cambio, vecinales, liberales o libertarios no-LLA, socios de las alianzas electorales con LLA y listas conjuntas. Se excluyen UCR y bloques de gobernadores dialoguistas.</div></li>
   <li>${I.disidente}<div><b>Disidente</b>: electo por una lista de LLA que hoy integra otro bloque.</div></li>
   <li>${I.q}<div><b>A confirmar</b>: electos por listas LLA (2023 y 2025) cuyo bloque actual no figura en ninguna fuente accesible. Cada ficha explica la duda.</div></li>
   <li>${I.link}<div><b>Fuentes</b>: Cámara de Diputados y Senado de la Nación, legislaturas, legislaturasconectadas.gob.ar, webs de los concejos, Junta Electoral PBA, tribunales electorales provinciales, SIBOM y prensa local 2025-2026.</div></li>
   <li>${I.tel}<div>Solo se publica contacto institucional (teléfono del cuerpo, correo oficial, redes declaradas).</div></li>
  </ul></section>`;
}

// ---------- mobile bottom sheet
function sheetH(s){ const ph=$('.ph').offsetHeight+22; const vh=innerHeight;
  return s==='peek' ? Math.min(ph+8, vh*.62) : s==='mid' ? Math.max(Math.min(ph+8,vh*.62)+60, vh*.58) : vh-48; }
function layoutSheet(){ const pn=$('#panel'); pn.dataset.snap=S.snap; if(!isMobile()){ pn.style.height=''; return; } pn.style.height=sheetH(S.snap)+'px'; }
function snap(s,noRefit){ S.snap=s; layoutSheet(); if(!noRefit) setTimeout(refit,280); }
function bindSheet(){
  const g=$('#grip'), pn=$('#panel'); let y0=null,h0=0,moved=false;
  g.addEventListener('pointerdown',e=>{ if(!isMobile()) return; y0=e.clientY; h0=pn.offsetHeight; moved=false; pn.classList.add('drag'); g.setPointerCapture(e.pointerId); });
  g.addEventListener('pointermove',e=>{ if(y0==null) return; const dy=y0-e.clientY; if(Math.abs(dy)>4) moved=true; pn.style.height=Math.max(120,Math.min(innerHeight-40,h0+dy))+'px'; });
  const end=()=>{ if(y0==null) return; pn.classList.remove('drag'); const h=pn.offsetHeight; y0=null;
    if(!moved){ snap(S.snap==='peek'?'mid':S.snap==='mid'?'full':'peek'); return; }
    const opts=['peek','mid','full'].map(s=>[s,Math.abs(sheetH(s)-h)]).sort((a,b)=>a[1]-b[1]); snap(opts[0][0]); };
  g.addEventListener('pointerup',end); g.addEventListener('pointercancel',end);
  g.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); snap(S.snap==='peek'?'mid':S.snap==='mid'?'full':'peek'); } });
}

// ---------- UI events
function bindUI(){
  document.addEventListener('click',e=>{
    const ddb=e.target.closest('.dd-b'); if(ddb){ const d=ddb.closest('.dd'); if(ddb.getAttribute('aria-expanded')==='true') closeDD(); else openDD(d); return; }
    const li=e.target.closest('.dd-pop li[data-v]'); if(li){ chooseDD(li.closest('.dd'),li.dataset.v); return; }
    if(!e.target.closest('.dd')) closeDD();
    if(e.target.closest('a[href^="http"]')) return;
    const sg=e.target.closest('[data-seg]'); if(sg){ const k=sg.dataset.seg, v=sg.dataset.v;
      if(k==='ch') set({ch:v}); return; }
    const cc=e.target.closest('[data-c]'); if(cc){ const k=cc.dataset.c; if(S.cargo.has(k)) S.cargo.delete(k); else S.cargo.add(k); saveCargo(); render(); return; }
    const ca=e.target.closest('[data-call]'); if(ca){ const ks=cargoKeys(); if(ca.dataset.call==='all') CK.forEach(k=>S.cargo.add(k)); else ks.forEach(k=>S.cargo.delete(k)); saveCargo(); render(); return; }
    const so=e.target.closest('[data-solo]'); if(so){ S.cargo=new Set([so.dataset.solo]); saveCargo(); render(); return; }
    const ta=e.target.closest('[data-arg]'); if(ta){ go(S.st.view==='dudas'&&S.st.pk?'#/dudas/todas':'#/'); return; }
    const bk=e.target.closest('[data-back]'); if(bk){ set({mid:''}); return; }
    const pk=e.target.closest('[data-pk]'); if(pk){ pickProvince(pk.dataset.pk); return; }
    const md=e.target.closest('[data-mid]'); if(md){ const m=S.munis[md.dataset.mid]; set({mid:m.id,sec:m.sec||''}); return; }
    const g=e.target.closest('[data-go]'); if(g){ go(g.dataset.go); return; }
    const lt=e.target.closest('.leg-t'); if(lt){ S.legOpen=!S.legOpen; const b=$('#legend .leg-b'); b.hidden=!S.legOpen; lt.setAttribute('aria-expanded',S.legOpen); $('#legend').classList.toggle('open',S.legOpen); return; }
    const c=e.target.closest('.chip'); if(c){ const k=c.dataset.k; S.filt[k]=!S.filt[k]; c.classList.toggle('on',S.filt[k]); c.setAttribute('aria-pressed',S.filt[k]); render(); return; }
  });
  document.addEventListener('input',e=>{ if(e.target.classList.contains('dd-s')){ const d=e.target.closest('.dd'); d.querySelector('ul').innerHTML=ddItems(d.dataset.dd,S.st[{prov:'pk',sec:'sec',muni:'mid'}[d.dataset.dd]]||'',e.target.value); const f=d.querySelector('li[data-v]'); if(f) f.classList.add('act'); } });
  document.addEventListener('keydown',e=>{
    const d=e.target.closest&&e.target.closest('.dd');
    if(d){ const open=!d.querySelector('.dd-pop').hidden;
      if(e.key==='Escape'){ closeDD(); d.querySelector('.dd-b').focus(); return; }
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); if(!open) openDD(d); moveAct(d,e.key==='ArrowDown'?1:-1); return; }
      if(e.key==='Enter' && open){ const a=d.querySelector('li.act[data-v]')||d.querySelector('li[data-v]'); if(a){ e.preventDefault(); chooseDD(d,a.dataset.v); } return; }
    }
    if(e.key==='Enter'){ const r=e.target.closest&&e.target.closest('[data-pk],[data-mid],[data-go]'); if(r) r.click(); }
  });
  $('#collapse').addEventListener('click',()=>{ $('#panel').classList.add('off'); $('#reopen').hidden=false; setTimeout(()=>{ updateMinZoom(); refit(); },300); });
  $('#reopen').addEventListener('click',()=>{ $('#panel').classList.remove('off'); $('#reopen').hidden=true; setTimeout(()=>{ updateMinZoom(); refit(); },300); });
  bindSheet();
  buildSearch();
}
function buildSearch(){
  const idx=[];
  allProv().forEach(k=>{ const p=P[k]; idx.push({t:p.name,s:'Provincia',h:'#/p/'+k,kind:'Provincia'});
    (p.int||[]).forEach(x=>idx.push({t:x.n,s:`${x.c} de ${x.mu} · ${p.name}`,h:'#/p/'+x.mid.replace('/','/m/'),kind:KL[x.k]}));
    if(p.leg) p.leg.cam.forEach((c,i)=>c.bl.forEach(b=>b.m.forEach(x=>idx.push({t:x.n,s:`${b.b} · Legislatura (${camShort(c.n)}) · ${p.name}`,h:`#/p/${k}/leg/${i}`,kind:KL[b.k]}))));
    p.dip.forEach(x=>idx.push({t:x.n,s:`${x.bl} · Diputado nacional · ${p.name}`,h:`#/p/${k}/nac/dip`,kind:KL[x.k]}));
    p.sen.forEach(x=>idx.push({t:x.n,s:`${x.bl} · Senador nacional · ${p.name}`,h:`#/p/${k}/nac/sen`,kind:KL[x.k]})); });
  Object.values(S.munis).forEach(m=>{ const pn=P[m.pv].name, base=`#/p/${m.pv}/conc/m/${m.id.split('/')[1]}`; idx.push({t:m.n,s:`Concejo · ${pn}`,h:base,kind:'Municipio'});
    m.bl.forEach(b=>b.m.forEach(x=>idx.push({t:x.n,s:`${b.b} · Concejo de ${m.n} (${pn})`,h:base,kind:KL[b.k]})));
    (m.ce||[]).forEach(b=>b.m.forEach(x=>idx.push({t:x.n,s:`Consejo escolar · ${m.n}`,h:base+'/ce',kind:'Consejero'}))); });
  idx.forEach(i=>i.k=norm(i.t+' '+i.s));
  const q=$('#q'), list=$('#searchList'), box=q.closest('.search'); let cur=-1, res=[];
  const close=()=>{ list.hidden=true; box.setAttribute('aria-expanded','false'); cur=-1; };
  const pick=i=>{ const r=res[i]; if(!r) return; q.value=''; close(); q.blur(); go(r.h); };
  q.addEventListener('input',()=>{ const v=norm(q.value.trim()); if(v.length<2){ close(); return; }
    const terms=v.split(/\s+/); res=idx.filter(i=>terms.every(t=>i.k.includes(t))).slice(0,30);
    list.innerHTML=res.length?res.map((r,i)=>`<li role="option" id="opt${i}" aria-selected="false" data-i="${i}"><div><div class="t">${esc(r.t)}</div><div class="s">${esc(r.s)}</div></div><span class="kind">${esc(r.kind||'')}</span></li>`).join(''):'<li aria-disabled="true"><div class="s">Sin resultados</div></li>';
    list.hidden=false; box.setAttribute('aria-expanded','true'); cur=-1;
    if(isMobile() && S.snap==='peek') snap('mid',true); });
  q.addEventListener('keydown',e=>{ if(list.hidden) return; const n=res.length;
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); if(!n) return; cur=(cur+(e.key==='ArrowDown'?1:-1)+n)%n; [...list.children].forEach((li,i)=>li.setAttribute('aria-selected',i===cur)); list.children[cur]?.scrollIntoView({block:'nearest'}); q.setAttribute('aria-activedescendant','opt'+cur); }
    else if(e.key==='Enter'){ e.preventDefault(); pick(cur<0?0:cur); } else if(e.key==='Escape') close(); });
  list.addEventListener('mousedown',e=>{ const li=e.target.closest('li[data-i]'); if(li){ e.preventDefault(); pick(+li.dataset.i); } });
  q.addEventListener('blur',()=>setTimeout(close,150));
}
})();
