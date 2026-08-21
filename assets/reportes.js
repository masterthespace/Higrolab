(()=>{
  'use strict';

  const REPORT_PAGES = new Set([
    'calculadora-rocio.html','calculadora-sin-muro.html','simulador-muro.html',
    'perdidas-termicas.html','ventilacion-humedad.html','confort-termico.html',
    'riesgo-moho.html','costo-calefaccion.html','comparador-u.html',
    'puentes-termicos-cev.html','ventanas-cev.html','fav-cev.html','infiltraciones-cev.html',
    'ventilacion-minima-cev.html','zona-termica-cev.html','puertas-ventanas-cev.html',
    'potencia-calefaccion-cev.html','acs-cev.html','scop-cev.html','far-cev.html','simulador-solar.html'
  ]);

  // Vercel usa cleanUrls=true, por lo que /calculadora-rocio.html
  // puede publicarse como /calculadora-rocio. Normalizamos ambas rutas.
  const cleanPath = location.pathname.replace(/\/+$/, '');
  const lastSegment = cleanPath.split('/').pop() || 'index';
  const current = lastSegment.endsWith('.html') ? lastSegment : `${lastSegment}.html`;
  if (!REPORT_PAGES.has(current)) return;

  const $ = (s,r=document)=>r.querySelector(s);
  const $$ = (s,r=document)=>Array.from(r.querySelectorAll(s));
  const txt = el => (el?.textContent || '').replace(/\s+/g,' ').trim();

  function el(doc, tag, cls, text){
    const n=doc.createElement(tag);
    if(cls) n.className=cls;
    if(text!==undefined && text!==null) n.textContent=String(text);
    return n;
  }

  function addPanel(){
    if($('#hl-report-panel')) return;
    const main=$('main');
    if(!main) return;

    const style=document.createElement('style');
    style.textContent=`
      .hl-report-panel{margin-top:18px;background:#fff;border:1px solid #dbe4e8;border-radius:20px;padding:22px;box-shadow:0 18px 48px rgba(8,43,59,.06)}
      .hl-report-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:15px}.hl-report-head h2{margin:3px 0 0}.hl-report-kicker{font-size:.72rem;text-transform:uppercase;letter-spacing:.12em;color:#5e838a;font-weight:850;margin:0}
      .hl-report-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.hl-report-field label{display:block;font-size:.78rem;font-weight:760;color:#4e626c;margin-bottom:5px}.hl-report-field input,.hl-report-field textarea{width:100%;border:1px solid #ced9de;border-radius:10px;padding:10px 11px;background:#fbfcfc;color:#13222b;font:inherit}.hl-report-field textarea{min-height:78px;resize:vertical}.hl-report-field.full{grid-column:1/-1}.hl-report-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:14px}.hl-report-button{border:0;border-radius:11px;background:#0e566e;color:white;font:inherit;font-weight:800;padding:11px 16px;cursor:pointer}.hl-report-button:hover{background:#0a465b}.hl-report-help{font-size:.76rem;color:#6b7b83;max-width:650px}
      @media(max-width:650px){.hl-report-grid{grid-template-columns:1fr}.hl-report-field.full{grid-column:auto}.hl-report-head{display:block}}
    `;
    document.head.appendChild(style);

    const panel=el(document,'section','hl-report-panel'); panel.id='hl-report-panel';
    const head=el(document,'div','hl-report-head');
    const hwrap=el(document,'div');
    hwrap.append(el(document,'p','hl-report-kicker','Informe PDF'),el(document,'h2','', 'Exportar simulación HIDROLAB'));
    head.append(hwrap);
    const grid=el(document,'div','hl-report-grid');
    const fields=[
      ['hl-project','Proyecto / vivienda','Ej.: Vivienda Peñaflor','input'],
      ['hl-client','Cliente / referencia','Opcional','input'],
      ['hl-location','Comuna / ubicación','Opcional','input'],
      ['hl-observations','Observaciones','Comentarios que quieras incorporar al informe','textarea']
    ];
    fields.forEach(([id,label,ph,type],i)=>{
      const w=el(document,'div','hl-report-field'+(i===3?' full':''));
      const l=el(document,'label','',label); l.htmlFor=id;
      const c=document.createElement(type); c.id=id; c.placeholder=ph; c.autocomplete='off';
      w.append(l,c); grid.append(w);
    });
    const actions=el(document,'div','hl-report-actions');
    const btn=el(document,'button','hl-report-button','Generar informe PDF'); btn.type='button'; btn.id='hl-generate-report';
    actions.append(btn,el(document,'span','hl-report-help','Se abrirá el diálogo de impresión del navegador. Selecciona “Guardar como PDF”. Los datos permanecen en tu dispositivo.'));
    panel.append(head,grid,actions);
    main.append(panel);
    btn.addEventListener('click',buildReport);
  }

  function fieldLabel(input){
    if(input.id){
      const direct=document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
      if(direct) return txt(direct);
    }
    const holder=input.closest('.field,.input-block,.control,.form-field');
    if(holder){
      const lab=holder.querySelector('label');
      if(lab) return txt(lab);
    }
    const prev=input.previousElementSibling;
    if(prev && prev.tagName==='LABEL') return txt(prev);
    return input.name || input.id || 'Dato';
  }

  function fieldUnit(input){
    const holder=input.closest('.field,.input-block,.number-wrap,.control,.form-field');
    if(!holder) return '';
    const spans=$$('span',holder).map(txt).filter(Boolean);
    const unit=spans.find(v=>/^(°C|%|mm|m|m²|m³|W|kW|W\/m²K|h|días|CLP|\$|ACH|m³\/h|m\/s|met|clo)$/i.test(v));
    return unit || '';
  }

  function collectInputs(){
    const seen=new Set(), data=[];
    $$('main input, main select, main textarea').forEach(input=>{
      if(input.closest('#hl-report-panel')) return;
      if(input.type==='range' && input.id && document.getElementById(input.id+'N')) return;
      if(input.type==='button' || input.type==='submit' || input.type==='hidden') return;
      const label=fieldLabel(input);
      if(!label || seen.has(label)) return;
      let value='';
      if(input.tagName==='SELECT') value=input.options[input.selectedIndex]?.textContent || input.value;
      else if(input.type==='checkbox') value=input.checked?'Sí':'No';
      else value=input.value;
      if(value==='') return;
      const unit=fieldUnit(input);
      seen.add(label); data.push([label,String(value)+(unit && !String(value).includes(unit)?' '+unit:'')]);
    });
    return data.slice(0,40);
  }

  function collectResults(){
    const selectors=['.metric','.stat','.metric-big','.threshold','.diagnosis','.callout','.compare-card','.risk-badge','.tool-tag'];
    const out=[], seen=new Set();
    selectors.forEach(sel=>{
      $$(sel).forEach(node=>{
        if(node.closest('#hl-report-panel')) return;
        const all=txt(node); if(!all || seen.has(all) || all.length>260) return;
        let label='',value='';
        const l=node.querySelector('span,small,.label,.k');
        const v=node.querySelector('strong,b,.value');
        if(l && v && txt(l)!==txt(v)){label=txt(l);value=txt(v)}
        else {label=all;value=''}
        seen.add(all); out.push([label,value]);
      });
    });
    return out.slice(0,30);
  }

  function collectTables(){
    return $$('main table').slice(0,4).map(table=>{
      const rows=[];
      $$('tr',table).slice(0,24).forEach(tr=>{
        const cells=$$('th,td',tr).map(c=>txt(c)).slice(0,8);
        if(cells.length) rows.push(cells);
      });
      return rows;
    }).filter(r=>r.length);
  }

  function safeSvgClone(source,doc){
    const clone=doc.importNode(source,true);
    $$('script,foreignObject,iframe,object,embed',clone).forEach(n=>n.remove());
    [clone,...$$('*',clone)].forEach(n=>{
      Array.from(n.attributes||[]).forEach(a=>{
        const name=a.name.toLowerCase(), val=String(a.value||'').trim().toLowerCase();
        if(name.startsWith('on') || ((name==='href'||name==='xlink:href') && val.startsWith('javascript:'))) n.removeAttribute(a.name);
      });
    });
    clone.removeAttribute('width'); clone.removeAttribute('height');
    clone.style.width='100%'; clone.style.height='auto'; clone.style.maxHeight='330px';
    return clone;
  }


  function fmtClock(mins){
    if(mins===null || mins===undefined || !Number.isFinite(+mins)) return '—';
    const m=Math.round(+mins), h=Math.floor(m/60)%24;
    return `${String(h).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
  }
  function fmtHours(mins){
    if(!Number.isFinite(+mins)) return '—';
    return `${(+mins/60).toFixed(1).replace('.',',')} h`;
  }
  function fmtNum(v,n=1){
    return Number.isFinite(+v) ? (+v).toFixed(n).replace('.',',') : '—';
  }
  function addImageFigure(doc,root,title,dataUrl){
    if(!dataUrl) return;
    const fig=el(doc,'figure','report-figure');
    fig.append(el(doc,'figcaption','',title));
    const img=doc.createElement('img'); img.src=dataUrl; img.alt=title;
    fig.append(img); root.append(fig);
  }
  function addSolarTimeline(doc,root,segments){
    const wrap=el(doc,'div','solar-pdf-track');
    (segments||[]).forEach(seg=>{
      const a=seg[0],b=seg[1],bar=el(doc,'span','solar-pdf-seg');
      bar.style.left=`${a/1440*100}%`; bar.style.width=`${(b-a)/1440*100}%`;
      wrap.append(bar);
    });
    root.append(wrap);
  }
  function addSolarDetailedReport(doc,root){
    if(current!=='simulador-solar.html' || typeof window.HIDROLAB_SOLAR_REPORT!=='function') return false;
    let data;
    try{ data=window.HIDROLAB_SOLAR_REPORT(); }catch(e){ console.error(e); return false; }
    if(!data) return false;

    const overview=addSection(doc,root,'Resumen del análisis solar');
    const t=el(doc,'table','kv'),tb=el(doc,'tbody');
    [
      ['Fecha analizada',data.analyzedDateLabel||data.analyzedDate],
      ['Emplazamiento',data.location||'Coordenadas manuales'],
      ['Coordenadas',`${fmtNum(data.latitude,6)}, ${fmtNum(data.longitude,6)}`],
      ['Huso horario',`UTC ${data.timezone>=0?'+':''}${data.timezone}`],
      ['Duración solar del día',fmtHours(data.daylightMinutes)],
      ['Hora visualizada',data.selectedTime],
      ['Azimut solar a la hora visualizada',`${fmtNum(data.solarAzimuth,1)}°`],
      ['Elevación solar a la hora visualizada',`${fmtNum(data.solarElevation,1)}°`],
      ['Altura de muros',`${fmtNum(data.wallHeight,2)} m`],
      ['Área de planta',data.areaText||'—'],
      ['Perímetro de planta',data.perimeterText||'—'],
      ['Número de fachadas',String(data.facadeCount||0)],
      ['Norte definido en proyecto',`${fmtNum(data.northAngle,1)}°`],
      ['Azimut adicional del edificio',`${fmtNum(data.additionalAzimuth,1)}°`],
      ['Escala de referencia',data.calibrated && data.scale ? `${fmtNum(data.scale,5)} m/píxel` : 'Sin calibración métrica']
    ].forEach(r=>addRow(doc,tb,r[0],r[1]));
    t.append(tb); overview.append(t);

    if(data.facades?.length){
      const sec=addSection(doc,root,`Asoleamiento por fachada · ${data.analyzedDateLabel||data.analyzedDate}`);
      sec.append(el(doc,'p','section-note','Las horas corresponden a exposición geométrica de sol directo en el punto medio de cada fachada para la fecha seleccionada.'));
      const table=el(doc,'table','data-table solar-detail-table');
      const head=el(doc,'tr');
      ['Fachada','Orientación','Azimut','Longitud','Sol directo','Primer sol','Último sol','% del día solar'].forEach(x=>head.append(el(doc,'th','',x)));
      table.append(head);
      data.facades.forEach(f=>{
        const tr=el(doc,'tr');
        const pct=data.daylightMinutes>0 ? (f.sunMinutes/data.daylightMinutes*100) : 0;
        [f.id,f.orientation,`${fmtNum(f.azimuth,1)}°`,`${fmtNum(f.length,2)} m`,fmtHours(f.sunMinutes),fmtClock(f.first),fmtClock(f.last),`${fmtNum(pct,0)} %`]
          .forEach(x=>tr.append(el(doc,'td','',x)));
        table.append(tr);
      });
      sec.append(table);
      sec.append(el(doc,'p','section-note','La identificación F1, F2, F3… corresponde al esquema incluido más adelante. Cada etiqueta está ubicada sobre el tramo de muro al que pertenece.'));

      const timeline=el(doc,'div','solar-pdf-timelines');
      data.facades.forEach(f=>{
        const row=el(doc,'div','solar-pdf-row');
        const lab=el(doc,'div','solar-pdf-label',`${f.id} · ${f.orientation} · ${fmtHours(f.sunMinutes)}`);
        const track=el(doc,'div','solar-pdf-track');
        (f.segments||[]).forEach(seg=>{
          const bar=el(doc,'span','solar-pdf-seg');
          bar.style.left=`${seg[0]/1440*100}%`;bar.style.width=`${(seg[1]-seg[0])/1440*100}%`;
          track.append(bar);
        });
        row.append(lab,track); timeline.append(row);
      });
      const scale=el(doc,'div','solar-pdf-scale');
      ['00','03','06','09','12','15','18','21','24'].forEach(x=>scale.append(el(doc,'span','',x)));
      timeline.append(scale); sec.append(timeline);
    }

    const snaps=data.snapshots||{};
    if(snaps.plan||snaps.model||snaps.solar){
      const sec=addSection(doc,root,'Visualizaciones e identificación de fachadas');
      const figs=el(doc,'div','report-figures');
      addImageFigure(doc,figs,'Esquema de identificación de fachadas F1, F2, F3…',snaps.facadeMap);
      addImageFigure(doc,figs,'Planta y orientación',snaps.plan);
      addImageFigure(doc,figs,'Modelo 3D de la vivienda',snaps.model);
      addImageFigure(doc,figs,`Análisis solar · ${data.selectedTime}`,snaps.solar);
      sec.append(figs);
    }

    const meth=addSection(doc,root,'Metodología y alcance');
    const ul=el(doc,'ul','method-list');
    [
      `Intervalo temporal del cálculo diario: ${data.methodology?.stepMinutes||5} minutos.`,
      `Punto de evaluación: ${data.methodology?.point||'punto medio de cada fachada'}.`,
      'Se considera orientación geográfica, trayectoria solar para la fecha y coordenadas ingresadas y autosombra de la propia geometría de la vivienda.',
      'Las horas informadas representan exposición geométrica a sol directo; no corresponden a irradiancia o energía solar en W/m² o kWh/m².',
      'Esta versión no incorpora todavía sombras de edificios vecinos, árboles, topografía u otros obstáculos externos.'
    ].forEach(x=>{const li=el(doc,'li','',x);ul.append(li)});
    meth.append(ul);
    return true;
  }

  function reportId(){
    const d=new Date(), p=n=>String(n).padStart(2,'0');
    return `HL-${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  }

  function addRow(doc,tbody,a,b){
    const tr=el(doc,'tr'); tr.append(el(doc,'td','',a),el(doc,'td','',b)); tbody.append(tr);
  }

  function addSection(doc,root,title){
    const sec=el(doc,'section','report-section'); sec.append(el(doc,'h2','',title)); root.append(sec); return sec;
  }

  function buildReport(){
    const w=window.open('','_blank');
    if(!w){ alert('El navegador bloqueó la ventana del informe. Habilita ventanas emergentes para HIDROLAB y vuelve a intentarlo.'); return; }
    const d=w.document;
    d.title='Informe HIDROLAB'; d.documentElement.lang='es';
    const meta=d.createElement('meta'); meta.name='viewport'; meta.content='width=device-width,initial-scale=1'; d.head.append(meta);
    const style=d.createElement('style');
    style.textContent=`
      @page{size:A4;margin:18mm 14mm 20mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#15242c;background:#fff;font-size:10.5pt;line-height:1.42}header{border-bottom:3px solid #0f536b;padding-bottom:10px;margin-bottom:16px;display:flex;justify-content:space-between;gap:16px}.brand{font-size:22pt;font-weight:900;letter-spacing:.03em;color:#0a3445}.brand .lab{color:#6fa83b}.subtitle{font-size:8.5pt;color:#61747d;margin-top:2px}.meta{text-align:right;font-size:8.5pt;color:#596b73}.report-title{font-size:18pt;margin:0 0 5px;color:#123c4e}.intro{color:#53656e;margin:0 0 14px}.watermark{position:fixed;left:50%;top:48%;transform:translate(-50%,-50%) rotate(-28deg);font-size:70pt;font-weight:900;letter-spacing:.08em;color:rgba(12,70,90,.055);z-index:-1;white-space:nowrap}.watermark .lab{color:rgba(111,168,59,.065)}.project-box{border:1px solid #d6e0e4;background:#f7fafb;border-radius:9px;padding:10px 12px;margin:12px 0 18px;display:grid;grid-template-columns:1fr 1fr;gap:5px 18px}.project-box div{font-size:9pt}.project-box b{color:#294b59}.report-section{break-inside:avoid;margin:0 0 17px}.report-section h2{font-size:12pt;color:#0d4e65;border-bottom:1px solid #cfdde2;padding-bottom:5px;margin:0 0 8px}.kv{width:100%;border-collapse:collapse}.kv td{padding:5px 7px;border-bottom:1px solid #e4eaed;vertical-align:top}.kv td:first-child{width:58%;color:#52656e}.kv td:last-child{font-weight:700;text-align:right}.results-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.result{border:1px solid #dce5e8;border-radius:7px;padding:7px 9px;break-inside:avoid}.result .rlabel{color:#5c6d75;font-size:8.5pt}.result .rvalue{font-weight:800;font-size:11pt;margin-top:2px}.chart{border:1px solid #dce5e8;border-radius:8px;padding:8px;margin:8px 0;break-inside:avoid}.data-table{width:100%;border-collapse:collapse;font-size:8.5pt;margin-top:6px}.data-table th,.data-table td{border:1px solid #dbe3e7;padding:4px 5px;text-align:left}.data-table th{background:#edf4f6;color:#294b59}.obs{white-space:pre-wrap;border-left:3px solid #6fa83b;background:#f6f9f3;padding:9px 11px}.disclaimer{margin-top:18px;padding:9px 11px;background:#f6f7f8;border:1px solid #dfe5e8;font-size:8.3pt;color:#5f6d74}.page-footer{position:fixed;left:14mm;right:14mm;bottom:7mm;border-top:1px solid #ccd9de;padding-top:4px;display:flex;justify-content:space-between;color:#53656e;font-size:8pt}.sign{font-weight:800;color:#244b5c}.print-note{margin:0 0 12px;padding:8px;background:#fff4d8;border:1px solid #ead69c;font-size:9pt}.section-note{font-size:8.7pt;color:#66777f;margin:0 0 8px}.report-figures{display:grid;grid-template-columns:1fr;gap:10px}.report-figure{margin:0;border:1px solid #dce5e8;border-radius:8px;padding:7px;break-inside:avoid}.report-figure figcaption{font-size:8.5pt;font-weight:800;color:#34525f;margin-bottom:5px}.report-figure img{display:block;width:100%;max-height:430px;object-fit:contain;background:#f2f5f6}.solar-detail-table{font-size:7.8pt}.solar-pdf-timelines{margin-top:12px;border:1px solid #dfe6e9;border-radius:8px;padding:9px}.solar-pdf-row{display:grid;grid-template-columns:120px 1fr;gap:7px;align-items:center;margin:5px 0}.solar-pdf-label{font-size:7.6pt;color:#425963}.solar-pdf-track{height:9px;background:#e7edef;border-radius:99px;position:relative;overflow:hidden}.solar-pdf-seg{position:absolute;top:0;bottom:0;background:#efb326;border-radius:99px}.solar-pdf-scale{margin-left:127px;display:flex;justify-content:space-between;font-size:6.8pt;color:#87949a}.method-list{margin:4px 0 0 18px;padding:0;color:#566871;font-size:8.8pt}.method-list li{margin:4px 0}@media print{.print-note{display:none}.report-section{break-inside:avoid}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    `;
    d.head.append(style);

    const body=d.body;
    const watermark=el(d,'div','watermark'); watermark.append(d.createTextNode('HIDRO'),el(d,'span','lab','LAB')); body.append(watermark);
    const footer=el(d,'div','page-footer'); footer.append(el(d,'span','sign','Calificador CEV Gonzalo C.'),el(d,'span','','HIDROLAB · Informe de simulación')); body.append(footer);
    body.append(el(d,'div','print-note','Para obtener el archivo: en el diálogo de impresión selecciona “Guardar como PDF”.'));

    const header=el(d,'header');
    const brandWrap=el(d,'div'); const brand=el(d,'div','brand'); brand.append(d.createTextNode('HIDRO'),el(d,'span','lab','LAB'));
    brandWrap.append(brand,el(d,'div','subtitle','Higrotécnica · confort · salud'));
    const metaWrap=el(d,'div','meta'); metaWrap.append(el(d,'div','',`Informe ${reportId()}`),el(d,'div','',new Date().toLocaleString('es-CL')));
    header.append(brandWrap,metaWrap); body.append(header);

    const pageTitle=txt(document.querySelector('.hero h1')) || document.title.replace(/^HIDROLAB\s*[·-]\s*/,'');
    body.append(el(d,'h1','report-title',current==='simulador-solar.html'?'Informe de asoleamiento solar de vivienda':pageTitle));
    body.append(el(d,'p','intro',current==='simulador-solar.html'
      ?'Informe detallado del análisis de orientación y exposición solar directa de la vivienda para la fecha, emplazamiento y geometría definidos en HIDROLAB.'
      :'Informe generado a partir de la simulación activa en HIDROLAB. Los resultados reflejan los datos ingresados al momento de la exportación.'));

    const project=($('#hl-project')?.value||'').trim(), client=($('#hl-client')?.value||'').trim(), loc=($('#hl-location')?.value||'').trim(), obs=($('#hl-observations')?.value||'').trim();
    if(project||client||loc){
      const pb=el(d,'div','project-box');
      if(project) pb.append(el(d,'div','',`Proyecto / vivienda: ${project}`));
      if(client) pb.append(el(d,'div','',`Cliente / referencia: ${client}`));
      if(loc) pb.append(el(d,'div','',`Comuna / ubicación: ${loc}`));
      body.append(pb);
    }

    const isSolar=current==='simulador-solar.html';
    const inputs=collectInputs();
    if(inputs.length && !isSolar){ const sec=addSection(d,body,'Datos de entrada'); const t=el(d,'table','kv'),tb=el(d,'tbody'); inputs.forEach(r=>addRow(d,tb,r[0],r[1])); t.append(tb); sec.append(t); }

    const solarAdded=addSolarDetailedReport(d,body);

    const results=isSolar?[]:collectResults();
    if(results.length){ const sec=addSection(d,body,'Resultados de la simulación'); const g=el(d,'div','results-grid'); results.forEach(([a,b])=>{const c=el(d,'div','result'); c.append(el(d,'div','rlabel',a),el(d,'div','rvalue',b||a)); g.append(c)}); sec.append(g); }

    const svgs=isSolar?[]:$$('main svg').filter(s=>s.getBoundingClientRect().width>50 && s.getBoundingClientRect().height>40).slice(0,3);
    if(svgs.length){ const sec=addSection(d,body,'Gráficos y visualizaciones'); svgs.forEach(s=>{const box=el(d,'div','chart'); box.append(safeSvgClone(s,d)); sec.append(box)}); }

    const tables=isSolar?[]:collectTables();
    tables.forEach((rows,idx)=>{
      const sec=addSection(d,body,tables.length>1?`Tabla de resultados ${idx+1}`:'Tabla de resultados');
      const t=el(d,'table','data-table');
      rows.forEach((row,ri)=>{const tr=el(d,'tr');row.forEach(cell=>tr.append(el(d,ri===0?'th':'td','',cell)));t.append(tr)});sec.append(t);
    });

    if(obs){ const sec=addSection(d,body,'Observaciones'); sec.append(el(d,'div','obs',obs)); }
    const disclaimer=el(d,'div','disclaimer','Este documento corresponde a un informe de simulación generado por HIDROLAB. No constituye por sí mismo una Calificación Energética de Vivienda (CEV), certificación oficial, diagnóstico de patología constructiva ni reemplaza una inspección profesional en terreno. La validez de los resultados depende de la calidad y representatividad de los datos ingresados.'); body.append(disclaimer);

    d.close();
    setTimeout(()=>{ try{w.focus();w.print();}catch(e){ /* el usuario puede imprimir manualmente */ } },350);
  }

  addPanel();
})();
