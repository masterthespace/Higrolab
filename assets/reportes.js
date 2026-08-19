(()=>{
  'use strict';

  const REPORT_PAGES = new Set([
    'calculadora-rocio.html','calculadora-sin-muro.html','simulador-muro.html',
    'perdidas-termicas.html','ventilacion-humedad.html','confort-termico.html',
    'riesgo-moho.html','costo-calefaccion.html','comparador-u.html'
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
      @page{size:A4;margin:18mm 14mm 20mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#15242c;background:#fff;font-size:10.5pt;line-height:1.42}header{border-bottom:3px solid #0f536b;padding-bottom:10px;margin-bottom:16px;display:flex;justify-content:space-between;gap:16px}.brand{font-size:22pt;font-weight:900;letter-spacing:.03em;color:#0a3445}.brand .lab{color:#6fa83b}.subtitle{font-size:8.5pt;color:#61747d;margin-top:2px}.meta{text-align:right;font-size:8.5pt;color:#596b73}.report-title{font-size:18pt;margin:0 0 5px;color:#123c4e}.intro{color:#53656e;margin:0 0 14px}.watermark{position:fixed;left:50%;top:48%;transform:translate(-50%,-50%) rotate(-28deg);font-size:70pt;font-weight:900;letter-spacing:.08em;color:rgba(12,70,90,.055);z-index:-1;white-space:nowrap}.watermark .lab{color:rgba(111,168,59,.065)}.project-box{border:1px solid #d6e0e4;background:#f7fafb;border-radius:9px;padding:10px 12px;margin:12px 0 18px;display:grid;grid-template-columns:1fr 1fr;gap:5px 18px}.project-box div{font-size:9pt}.project-box b{color:#294b59}.report-section{break-inside:avoid;margin:0 0 17px}.report-section h2{font-size:12pt;color:#0d4e65;border-bottom:1px solid #cfdde2;padding-bottom:5px;margin:0 0 8px}.kv{width:100%;border-collapse:collapse}.kv td{padding:5px 7px;border-bottom:1px solid #e4eaed;vertical-align:top}.kv td:first-child{width:58%;color:#52656e}.kv td:last-child{font-weight:700;text-align:right}.results-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.result{border:1px solid #dce5e8;border-radius:7px;padding:7px 9px;break-inside:avoid}.result .rlabel{color:#5c6d75;font-size:8.5pt}.result .rvalue{font-weight:800;font-size:11pt;margin-top:2px}.chart{border:1px solid #dce5e8;border-radius:8px;padding:8px;margin:8px 0;break-inside:avoid}.data-table{width:100%;border-collapse:collapse;font-size:8.5pt;margin-top:6px}.data-table th,.data-table td{border:1px solid #dbe3e7;padding:4px 5px;text-align:left}.data-table th{background:#edf4f6;color:#294b59}.obs{white-space:pre-wrap;border-left:3px solid #6fa83b;background:#f6f9f3;padding:9px 11px}.disclaimer{margin-top:18px;padding:9px 11px;background:#f6f7f8;border:1px solid #dfe5e8;font-size:8.3pt;color:#5f6d74}.page-footer{position:fixed;left:14mm;right:14mm;bottom:7mm;border-top:1px solid #ccd9de;padding-top:4px;display:flex;justify-content:space-between;color:#53656e;font-size:8pt}.sign{font-weight:800;color:#244b5c}.print-note{margin:0 0 12px;padding:8px;background:#fff4d8;border:1px solid #ead69c;font-size:9pt}@media print{.print-note{display:none}.report-section{break-inside:avoid}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
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
    body.append(el(d,'h1','report-title',pageTitle));
    body.append(el(d,'p','intro','Informe generado a partir de la simulación activa en HIDROLAB. Los resultados reflejan los datos ingresados al momento de la exportación.'));

    const project=($('#hl-project')?.value||'').trim(), client=($('#hl-client')?.value||'').trim(), loc=($('#hl-location')?.value||'').trim(), obs=($('#hl-observations')?.value||'').trim();
    if(project||client||loc){
      const pb=el(d,'div','project-box');
      if(project) pb.append(el(d,'div','',`Proyecto / vivienda: ${project}`));
      if(client) pb.append(el(d,'div','',`Cliente / referencia: ${client}`));
      if(loc) pb.append(el(d,'div','',`Comuna / ubicación: ${loc}`));
      body.append(pb);
    }

    const inputs=collectInputs();
    if(inputs.length){ const sec=addSection(d,body,'Datos de entrada'); const t=el(d,'table','kv'),tb=el(d,'tbody'); inputs.forEach(r=>addRow(d,tb,r[0],r[1])); t.append(tb); sec.append(t); }

    const results=collectResults();
    if(results.length){ const sec=addSection(d,body,'Resultados de la simulación'); const g=el(d,'div','results-grid'); results.forEach(([a,b])=>{const c=el(d,'div','result'); c.append(el(d,'div','rlabel',a),el(d,'div','rvalue',b||a)); g.append(c)}); sec.append(g); }

    const svgs=$$('main svg').filter(s=>s.getBoundingClientRect().width>50 && s.getBoundingClientRect().height>40).slice(0,3);
    if(svgs.length){ const sec=addSection(d,body,'Gráficos y visualizaciones'); svgs.forEach(s=>{const box=el(d,'div','chart'); box.append(safeSvgClone(s,d)); sec.append(box)}); }

    const tables=collectTables();
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
