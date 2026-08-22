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
      if(data.cover){
        const csec=addSection(doc,root,'Cubierta superior C1');
        const ct=el(doc,'table','kv'),ctb=el(doc,'tbody');
        [
          ['Identificación','C1 · Cubierta'],
          ['Tipo de superficie','Horizontal superior'],
          ['Sol directo durante el día',fmtHours(data.cover.sunMinutes)],
          ['Primer sol',fmtClock(data.cover.first)],
          ['Último sol',fmtClock(data.cover.last)],
          ['Porcentaje del día solar',data.daylightMinutes>0?`${fmtNum(data.cover.sunMinutes/data.daylightMinutes*100,0)} %`:'—'],
          ['Captación geométrica relativa',`${fmtNum(data.cover.geomEquivalentHours,1)} h-eq`]
        ].forEach(r=>addRow(doc,ctb,r[0],r[1]));
        ct.append(ctb);csec.append(ct);
        csec.append(el(doc,'p','section-note','La captación geométrica relativa integra el factor sin(elevación solar) durante las horas con sol. Sirve para comparar geometría y fecha, pero no representa irradiancia ni energía solar real en kWh/m².'));
        const trk=el(doc,'div','solar-pdf-timelines'),row=el(doc,'div','solar-pdf-row'),lab=el(doc,'div','solar-pdf-label',`C1 · Cubierta · ${fmtHours(data.cover.sunMinutes)}`),track=el(doc,'div','solar-pdf-track');
        (data.cover.segments||[]).forEach(seg=>{const bar=el(doc,'span','solar-pdf-seg');bar.style.left=`${seg[0]/1440*100}%`;bar.style.width=`${(seg[1]-seg[0])/1440*100}%`;track.append(bar)});
        row.append(lab,track);trk.append(row);csec.append(trk);
      }
      sec.append(el(doc,'p','section-note','La identificación F1, F2, F3… corresponde al esquema incluido más adelante. La cubierta superior se identifica como C1.'));

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
      'Las horas informadas representan exposición geométrica a sol directo. Para la cubierta C1 se añade una captación geométrica relativa basada en la altura solar; ninguno de estos indicadores corresponde por sí solo a irradiancia o energía solar en W/m² o kWh/m².',
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



  function addVentilationDetailedReport(doc,root){
    if(current!=='ventilacion-humedad.html' || typeof window.HIDROLAB_VENT_REPORT!=='function') return false;
    let x; try{x=window.HIDROLAB_VENT_REPORT()}catch(e){console.error(e);return false}
    if(!x)return false;

    const sec1=addSection(doc,root,'1. Vivienda y condiciones ambientales');
    const t1=el(doc,'table','kv'),b1=el(doc,'tbody');
    [
      ['Definición del volumen',x.volumeMode==='dims'?'Por dimensiones':'Volumen directo'],
      ['Volumen interior',`${fmtNum(x.volume,1)} m³`],
      ['Dimensiones L × A × H',x.volumeMode==='dims'?`${fmtNum(x.dimensions.L,2)} × ${fmtNum(x.dimensions.W,2)} × ${fmtNum(x.dimensions.H,2)} m`:'—'],
      ['Temperatura interior',`${fmtNum(x.Ti,1)} °C`],['Temperatura exterior',`${fmtNum(x.Te,1)} °C`],
      ['HR exterior',`${fmtNum(x.RHe,0)} %`],['HR interior objetivo',`${fmtNum(x.target,0)} %`]
    ].forEach(r=>addRow(doc,b1,r[0],r[1]));t1.append(b1);sec1.append(t1);

    const sec2=addSection(doc,root,'2. Fuentes de humedad');
    const t2=el(doc,'table','kv'),b2=el(doc,'tbody'),m=x.moisture||{};
    if(m.mode==='sources'){
      [
        ['Personas',m.people],['Presencia por persona',`${fmtNum(m.personHours,1)} h/día`],['Generación por persona',`${fmtNum(m.personRate,0)} g/h`],
        ['Aporte de personas',`${fmtNum(m.peopleL,2)} L eq./día`],['Duchas',m.showers],['Aporte por ducha',`${fmtNum(m.showerL,2)} L`],
        ['Aporte total duchas',`${fmtNum(m.showersL,2)} L/día`],['Cocina',`${fmtNum(m.cookingL,2)} L/día`],
        ['Cargas de ropa secada al interior',m.laundry],['Aporte por carga',`${fmtNum(m.laundryL,2)} L`],['Aporte secado de ropa',`${fmtNum(m.clothesL,2)} L/día`],
        ['Lavado de loza',`${fmtNum(m.dishL,2)} L/día`],['Plantas interiores',m.plants],['Aporte plantas',`${fmtNum(m.plantL,2)} L/día`],
        ['Mascotas / animales',m.pets],['Aporte mascotas',`${fmtNum(m.petL,2)} L/día`],['Limpieza húmeda',`${fmtNum(m.moppingL,2)} L/día`],
        ['Estufa sin evacuación',m.heaterType==='none'?'No':m.heaterType==='gas'?'Gas licuado':'Parafina / kerosene'],
        ['Horas de estufa',m.heaterType==='none'?'—':`${fmtNum(m.heaterHours,1)} h/día`],
        ['Modo de consumo',m.heaterType==='none'?'—':m.heaterMode==='unknown'?`No conocido · preset ${m.heaterPreset}`:m.heaterMode],
        ['Consumo convertido',m.heaterType==='none'?'—':`${fmtNum(m.fuelRate,3)} kg/h`],
        ['Combustible consumido al día',m.heaterType==='none'?'—':`${fmtNum(m.heaterDailyFuel,2)} kg/día`],
        ['Factor de agua usado',m.heaterType==='none'?'—':`${fmtNum(m.waterFactor,2)} kg agua/kg combustible`],
        ['Aporte estufa',`${fmtNum(m.heaterL,2)} L eq./día`]
      ].forEach(r=>addRow(doc,b2,r[0],r[1]))
    }
    addRow(doc,b2,'Generación total estimada',`${fmtNum(m.total,2)} L eq./día`);t2.append(b2);sec2.append(t2);

    const sec3=addSection(doc,root,'3. Estrategia seleccionada');
    const t3=el(doc,'table','kv'),b3=el(doc,'tbody');
    [
      ['Modo',x.ventMode==='technical'?'Técnico · caudal conocido':'Práctico'],
      ['Estrategia',x.strategyLabel],['Duración',x.durationLabel],['Condición de viento',x.wind||'No aplica']
    ].forEach(r=>addRow(doc,b3,r[0],r[1]));
    if(x.strategy==='single'){
      addRow(doc,b3,'Área efectiva ventana',`${fmtNum(x.opening.a1,3)} m²`)
    }else if(['cross','window_door','cross_extractor'].includes(x.strategy)){
      addRow(doc,b3,'Área efectiva abertura 1',`${fmtNum(x.opening.a1,3)} m²`);
      addRow(doc,b3,'Área efectiva abertura 2',`${fmtNum(x.opening.a2,3)} m²`);
      addRow(doc,b3,'Área equivalente',`${fmtNum(x.opening.aeq,3)} m²`)
    }
    if(x.strategy==='cross_extractor')addRow(doc,b3,'Extractor combinado',`${fmtNum(x.comboExtractorFlow,0)} m³/h`);
    if(x.strategy==='mechanical')addRow(doc,b3,'Caudal extractor / ventilador',`${fmtNum(x.mechanicalFlow,0)} m³/h`);
    if(x.strategy==='dehumidifier'){
      addRow(doc,b3,'Capacidad nominal',`${fmtNum(x.dehumidifier.capacity,0)} L/24 h`);
      addRow(doc,b3,'Factor real de trabajo',`${fmtNum(x.dehumidifier.factor,0)} %`);
      addRow(doc,b3,'Capacidad estanque',`${fmtNum(x.dehumidifier.tank,1)} L`);
      addRow(doc,b3,'Extracción efectiva usada',`${fmtNum(x.dehumidifier.effectiveLph,2)} L/h`)
    }else{
      addRow(doc,b3,'Caudal usado en la simulación',`${fmtNum(x.result.flow,0)} m³/h`);
      addRow(doc,b3,'ACH durante apertura',`${fmtNum(x.result.ach,2)} 1/h`);
      if(x.practicalFlow?.estimated)addRow(doc,b3,'Rango orientativo de caudal',`${fmtNum(x.practicalFlow.low,0)}–${fmtNum(x.practicalFlow.high,0)} m³/h`)
    }
    t3.append(b3);sec3.append(t3);
    sec3.append(el(doc,'p','section-note','ACH = renovaciones de aire por hora. 1 ACH significa mover en una hora un volumen de aire equivalente al volumen completo del recinto.'));const secN=addSection(doc,root,'3B. Referencia normativa / CEV 2025');const tn=el(doc,'table','kv'),bn=el(doc,'tbody'),n=x.cev||{};[
['Superficie de piso AV',`${fmtNum(n.AV,1)} m²`],['Dormitorios',n.bedrooms],['Personas CEV NP',n.NP],['Volumen VV',`${fmtNum(n.VV,1)} m³`],['Fmin · Ecuación 16 Anexo D',`${fmtNum(n.Fmin,2)} ren/h`],['Caudal equivalente mínimo',`${fmtNum(n.Qmin,0)} m³/h`],['Caudal del escenario',`${fmtNum(n.Qscenario,0)} m³/h`],['Comparación',n.dehum?'Deshumidificador: no aporta ventilación':n.ratio>=1?'Escenario ≥ Fmin':'Escenario < Fmin']].forEach(r=>addRow(doc,bn,r[0],r[1]));tn.append(bn);secN.append(tn);secN.append(el(doc,'p','section-note','Fuente: Manual CEV 2025, Anexo D, Ecuación 16. La comparación no sustituye la acreditación completa exigida por OGUC/NCh3308/NCh3309. El caudal de aberturas es una estimación HIDROLAB.'));

    const sec4=addSection(doc,root,'4. Efecto estimado de la estrategia');
    const t4=el(doc,'table','kv'),b4=el(doc,'tbody');
    [
      ['HR antes',`${fmtNum(x.result.rhBefore,0)} %`],['HR después',`${fmtNum(x.result.rhAfter,0)} %`],
      ['Reducción del exceso de vapor',`${fmtNum(x.result.reduction,0)} %`],
      ['Renovaciones durante el período',x.strategy==='dehumidifier'?'0,00':fmtNum(x.result.airChanges,2)],
      ['Agua retirada',`${fmtNum(x.result.gramsRemoved,0)} g`],['Litros equivalentes retirados',`${fmtNum(x.result.litersRemoved,3)} L`],
      ['Humedad absoluta inicial',`${fmtNum(x.result.ahBefore,2)} g/m³`],['Humedad absoluta final',`${fmtNum(x.result.ahAfter,2)} g/m³`],
      ['Humedad absoluta exterior',`${fmtNum(x.result.ahExterior,2)} g/m³`],
      ['Caudal continuo para HR objetivo',Number.isFinite(x.requiredFlow)?`${fmtNum(x.requiredFlow,0)} m³/h`:'No viable'],
      ['ACH continuo requerido',Number.isFinite(x.requiredAch)?fmtNum(x.requiredAch,2):'—']
    ].forEach(r=>addRow(doc,b4,r[0],r[1]));t4.append(b4);sec4.append(t4);
    sec4.append(el(doc,'p','obs',`${x.advice.label}: ${x.advice.text}`));

    const house=$('#houseViz svg');if(house){const fig=el(doc,'div','chart');fig.append(el(doc,'div','chart-title','Visualización del escenario'));fig.append(safeSvgClone(house,doc));sec4.append(fig)}
    const timeline=$('#ventTimelineChart');if(timeline){const fig=el(doc,'div','chart');fig.append(el(doc,'div','chart-title','Evolución estimada de HR'));fig.append(safeSvgClone(timeline,doc));sec4.append(fig)}

    const sec5=addSection(doc,root,'5. Capacidad de secado del aire exterior');
    const t5=el(doc,'table','kv'),b5=el(doc,'tbody');
    [
      ['Evaluación',x.strategy==='dehumidifier'?'No aplica a la operación del deshumidificador':x.drying.label],
      ['Humedad absoluta exterior',`${fmtNum(x.drying.outside,2)} g/m³`],
      ['Humedad absoluta interior inicial',`${fmtNum(x.drying.inside,2)} g/m³`],
      ['Diferencia',`${fmtNum(x.drying.delta,2)} g/m³`],
      ['Agua potencialmente transportable por 100 m³',`${fmtNum(x.drying.per100,3)} L eq.`]
    ].forEach(r=>addRow(doc,b5,r[0],r[1]));t5.append(b5);sec5.append(t5);sec5.append(el(doc,'p','section-note','La clasificación usa la diferencia de humedad absoluta entre interior y exterior: >5 g/m³ = muy favorable; >2 = favorable; >0,5 = poco efectivo; ≤0,5 = no conviene. Estos umbrales son una guía HIDROLAB, no límites normativos.'));

    const sec6=addSection(doc,root,'6. Punto de rocío y riesgo superficial');
    const t6=el(doc,'table','kv'),b6=el(doc,'tbody'),d=x.dew;
    [
      ['Temperatura superficial de referencia',`${fmtNum(d.ts,1)} °C`],
      ['Punto de rocío antes',`${fmtNum(d.db,1)} °C`],['Punto de rocío después',`${fmtNum(d.da,1)} °C`],
      ['Margen superficial antes',`${fmtNum(d.mb,1)} °C`],['Margen superficial después',`${fmtNum(d.ma,1)} °C`],
      ['Evaluación final',d.label]
    ].forEach(r=>addRow(doc,b6,r[0],r[1]));t6.append(b6);sec6.append(t6);
    sec6.append(el(doc,'p','obs',d.text));

    return true
  }

  function addRiskMoistureDetailedReport(doc,root){
    if(current!=='riesgo-moho.html' || typeof window.HIDROLAB_RISK_REPORT!=='function') return false;
    let x; try{x=window.HIDROLAB_RISK_REPORT()}catch(e){console.error(e);return false}
    if(!x)return false;
    const summary=addSection(doc,root,'Resumen higrotérmico');
    const t=el(doc,'table','kv'),tb=el(doc,'tbody');
    [
      ['Modo de evaluación',x.modeLabel],['Temperatura interior',`${fmtNum(x.ta,1)} °C`],
      ['Humedad relativa interior',`${fmtNum(x.rh,0)} %`],['Temperatura exterior',`${fmtNum(x.te,1)} °C`],
      ['Temperatura superficial interior del muro',`${fmtNum(x.ts,1)} °C`],['Punto de rocío interior',`${fmtNum(x.dew,1)} °C`],
      ['HR superficial estimada',`${fmtNum(x.rhs,0)} %`],['Margen al punto de rocío',`${fmtNum(x.margin,1)} °C`],
      ['T° superficial crítica para 80 % HR',`${fmtNum(x.t80,1)} °C`],
      ['Índice preventivo HIDROLAB',`${fmtNum(x.score,0)} / 100 · ${x.scoreLevel}`],
      ['Persistencia considerada',x.persistence.label],['Aporte de persistencia al índice',`+${fmtNum(x.persistence.penalty,1)} puntos`]
    ].forEach(r=>addRow(doc,tb,r[0],r[1]));t.append(tb);summary.append(t);

    if(x.inputMode==='estimated'){
      const wall=addSection(doc,root,'Muro utilizado para estimar la temperatura superficial');
      const wt=el(doc,'table','data-table'),wh=el(doc,'tr');
      ['#','Posición','Material / producto','Espesor','Propiedad térmica','R capa'].forEach(h=>wh.append(el(doc,'th','',h)));wt.append(wh);
      (x.layers||[]).forEach(l=>{
        const tr=el(doc,'tr'),prop=l.kind==='air'||l.kind==='composite'?`R declarado ${fmtNum(l.Rdeclared,3)} m²K/W`:`λ ${fmtNum(l.lambda,3)} W/mK`;
        [String(l.order),l.position,l.name,`${fmtNum(l.thickness,1)} mm`,prop,`${fmtNum(l.Rlayer,3)} m²K/W`].forEach(v=>tr.append(el(doc,'td','',v)));wt.append(tr)
      });wall.append(wt);
      const rt=el(doc,'table','kv'),rtb=el(doc,'tbody');
      [['Rsi interior',`${fmtNum(x.thermal.rsi,2)} m²K/W`],['R capas',`${fmtNum(x.thermal.rLayers,3)} m²K/W`],
       ['Rse exterior',`${fmtNum(x.thermal.rse,2)} m²K/W`],['R total',`${fmtNum(x.thermal.rTotal,3)} m²K/W`],
       ['Transmitancia U',`${fmtNum(x.thermal.U,2)} W/m²K`],['T° superficial estimada',`${fmtNum(x.ts,1)} °C`]]
       .forEach(r=>addRow(doc,rtb,r[0],r[1]));rt.append(rtb);wall.append(rt);
    }

    const pers=addSection(doc,root,'Persistencia y generación de vapor');
    if(x.vapor.active){
      const vt=el(doc,'table','kv'),vtb=el(doc,'tbody');
      [['Horas persistentes ingresadas',`${fmtNum(x.vapor.hours,1)} h/día`],['Personas consideradas',String(x.vapor.people)],
       ['Generación por persona',`${fmtNum(x.vapor.perPerson,0)} g/h`],['Generación por personas',`${fmtNum(x.vapor.humanRate,0)} g/h`],
       ['Otras fuentes',`${fmtNum(x.vapor.extra,0)} g/h`],['Generación total durante el período',`${fmtNum(x.vapor.grams,0)} g`],
       ['Masa equivalente de agua',`${fmtNum(x.vapor.kg,2)} kg`],['Vapor liberado acumulado',`${fmtNum(x.vapor.liters,2)} L eq. de agua`]]
       .forEach(r=>addRow(doc,vtb,r[0],r[1]));vt.append(vtb);pers.append(vt);
      pers.append(el(doc,'div','vapor-pdf-highlight',`${fmtNum(x.vapor.liters,2)} L eq. de agua liberada durante ${fmtNum(x.vapor.hours,1)} horas`));
      pers.append(el(doc,'p','section-note','El valor representa vapor liberado acumulado convertido a litros equivalentes de agua líquida. No significa que esa cantidad permanezca simultáneamente en el aire ni que toda ella condense sobre el muro.'));
    }else pers.append(el(doc,'p','section-note',`Persistencia seleccionada: ${x.persistence.label}. No se calculó vapor acumulado porque el escenario no utiliza ingreso manual de horas.`));

    const interp=addSection(doc,root,'Interpretación del resultado');
    let text='La condición superficial estimada se mantiene en un rango relativamente controlado para este indicador.';
    if(x.rhs>=100)text='La superficie alcanza una condición compatible con saturación o condensación superficial posible.';
    else if(x.rhs>=90)text='La humedad relativa superficial estimada es muy alta; si esta condición persiste, requiere atención.';
    else if(x.rhs>=80)text='La humedad relativa superficial es elevada y la persistencia incrementa el riesgo preventivo.';
    else if(x.rhs>=70)text='La superficie se encuentra en zona de atención por acumulación de humedad relativa respecto del aire del recinto.';
    interp.append(el(doc,'p','obs',`${text} HR superficial: ${fmtNum(x.rhs,0)} %. Margen al rocío: ${fmtNum(x.margin,1)} °C. Índice preventivo HIDROLAB: ${fmtNum(x.score,0)}/100 (${x.scoreLevel}).`));
    return true
  }

  function buildReport(){
    const w=window.open('','_blank');
    if(!w){ alert('El navegador bloqueó la ventana del informe. Habilita ventanas emergentes para HIDROLAB y vuelve a intentarlo.'); return; }
    const d=w.document;
    d.title='Informe HIDROLAB'; d.documentElement.lang='es';
    const meta=d.createElement('meta'); meta.name='viewport'; meta.content='width=device-width,initial-scale=1'; d.head.append(meta);
    const style=d.createElement('style');
    style.textContent=`
      @page{size:A4;margin:18mm 14mm 20mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#15242c;background:#fff;font-size:10.5pt;line-height:1.42}header{border-bottom:3px solid #0f536b;padding-bottom:10px;margin-bottom:16px;display:flex;justify-content:space-between;gap:16px}.brand{font-size:22pt;font-weight:900;letter-spacing:.03em;color:#0a3445}.brand .lab{color:#6fa83b}.subtitle{font-size:8.5pt;color:#61747d;margin-top:2px}.meta{text-align:right;font-size:8.5pt;color:#596b73}.report-title{font-size:18pt;margin:0 0 5px;color:#123c4e}.intro{color:#53656e;margin:0 0 14px}.watermark{position:fixed;left:50%;top:48%;transform:translate(-50%,-50%) rotate(-28deg);font-size:70pt;font-weight:900;letter-spacing:.08em;color:rgba(12,70,90,.055);z-index:-1;white-space:nowrap}.watermark .lab{color:rgba(111,168,59,.065)}.project-box{border:1px solid #d6e0e4;background:#f7fafb;border-radius:9px;padding:10px 12px;margin:12px 0 18px;display:grid;grid-template-columns:1fr 1fr;gap:5px 18px}.project-box div{font-size:9pt}.project-box b{color:#294b59}.report-section{break-inside:avoid;margin:0 0 17px}.report-section h2{font-size:12pt;color:#0d4e65;border-bottom:1px solid #cfdde2;padding-bottom:5px;margin:0 0 8px}.kv{width:100%;border-collapse:collapse}.kv td{padding:5px 7px;border-bottom:1px solid #e4eaed;vertical-align:top}.kv td:first-child{width:58%;color:#52656e}.kv td:last-child{font-weight:700;text-align:right}.results-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.result{border:1px solid #dce5e8;border-radius:7px;padding:7px 9px;break-inside:avoid}.result .rlabel{color:#5c6d75;font-size:8.5pt}.result .rvalue{font-weight:800;font-size:11pt;margin-top:2px}.chart{border:1px solid #dce5e8;border-radius:8px;padding:8px;margin:8px 0;break-inside:avoid}.chart-title{font-weight:800;color:#294b59;font-size:9pt;margin-bottom:5px}.data-table{width:100%;border-collapse:collapse;font-size:8.5pt;margin-top:6px}.data-table th,.data-table td{border:1px solid #dbe3e7;padding:4px 5px;text-align:left}.data-table th{background:#edf4f6;color:#294b59}.obs{white-space:pre-wrap;border-left:3px solid #6fa83b;background:#f6f9f3;padding:9px 11px}.disclaimer{margin-top:18px;padding:9px 11px;background:#f6f7f8;border:1px solid #dfe5e8;font-size:8.3pt;color:#5f6d74}.page-footer{position:fixed;left:14mm;right:14mm;bottom:7mm;border-top:1px solid #ccd9de;padding-top:4px;display:flex;justify-content:space-between;color:#53656e;font-size:8pt}.sign{font-weight:800;color:#244b5c}.print-note{margin:0 0 12px;padding:8px;background:#fff4d8;border:1px solid #ead69c;font-size:9pt}.section-note{font-size:8.7pt;color:#66777f;margin:0 0 8px}.report-figures{display:grid;grid-template-columns:1fr;gap:10px}.report-figure{margin:0;border:1px solid #dce5e8;border-radius:8px;padding:7px;break-inside:avoid}.report-figure figcaption{font-size:8.5pt;font-weight:800;color:#34525f;margin-bottom:5px}.report-figure img{display:block;width:100%;max-height:430px;object-fit:contain;background:#f2f5f6}.solar-detail-table{font-size:7.8pt}.solar-pdf-timelines{margin-top:12px;border:1px solid #dfe6e9;border-radius:8px;padding:9px}.solar-pdf-row{display:grid;grid-template-columns:120px 1fr;gap:7px;align-items:center;margin:5px 0}.solar-pdf-label{font-size:7.6pt;color:#425963}.solar-pdf-track{height:9px;background:#e7edef;border-radius:99px;position:relative;overflow:hidden}.solar-pdf-seg{position:absolute;top:0;bottom:0;background:#efb326;border-radius:99px}.solar-pdf-scale{margin-left:127px;display:flex;justify-content:space-between;font-size:6.8pt;color:#87949a}.method-list{margin:4px 0 0 18px;padding:0;color:#566871;font-size:8.8pt}.method-list li{margin:4px 0}.vapor-pdf-highlight{margin:9px 0;padding:11px;border-radius:8px;background:#eaf7fa;border:1px solid #b9dfe7;color:#0c6078;font-size:14pt;font-weight:900;text-align:center}@media print{.print-note{display:none}.report-section{break-inside:avoid}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
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
    const isRisk=current==='riesgo-moho.html';
    const isVent=current==='ventilacion-humedad.html';
    const inputs=collectInputs();
    if(inputs.length && !isSolar && !isRisk && !isVent){ const sec=addSection(d,body,'Datos de entrada'); const t=el(d,'table','kv'),tb=el(d,'tbody'); inputs.forEach(r=>addRow(d,tb,r[0],r[1])); t.append(tb); sec.append(t); }

    const solarAdded=addSolarDetailedReport(d,body);
    const riskAdded=addRiskMoistureDetailedReport(d,body);
    const ventAdded=addVentilationDetailedReport(d,body);

    const results=(isSolar||isRisk||isVent)?[]:collectResults();
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
