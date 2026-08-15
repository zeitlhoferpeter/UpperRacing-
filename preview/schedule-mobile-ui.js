(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d)return;

    const style=d.createElement('style');
    style.id='previewScheduleMobileStyles';
    style.textContent=`
      #pageSchedule{padding:10px!important}
      .preview-schedule-top{background:#151515;border:1px solid #3a3a3a;border-radius:10px;padding:10px;margin:0 0 10px;color:#fff}
      .preview-schedule-top.collapsed{padding:0!important;overflow:hidden}
      .preview-schedule-loaded{display:none;width:100%;box-sizing:border-box;background:#151515;color:#fff;border:0;padding:11px 12px;align-items:center;gap:9px;text-align:left;cursor:pointer}
      .preview-schedule-top.collapsed .preview-schedule-loaded{display:flex}
      .preview-schedule-top.collapsed .preview-schedule-body{display:none}
      .preview-loaded-check{color:#ffd400;font-size:1rem;font-weight:900}.preview-loaded-body{min-width:0;flex:1}.preview-loaded-title{font-size:.78rem;font-weight:900}.preview-loaded-sub{font-size:.62rem;color:#aaa;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.preview-loaded-chevron{color:#ffd400;font-weight:900}
      .preview-schedule-body-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:3px}
      .preview-schedule-title{font-size:1rem;font-weight:900}
      .preview-schedule-collapse{display:none;background:#202020;color:#fff;border:1px solid #444;border-radius:7px;padding:6px 8px;font-size:.66rem;font-weight:800;cursor:pointer}
      .preview-schedule-top.has-schedule:not(.collapsed) .preview-schedule-collapse{display:block}
      .preview-schedule-sub{font-size:.7rem;color:#aaa;margin-bottom:9px}
      .preview-schedule-grid{display:grid;grid-template-columns:1fr;gap:8px}
      .preview-schedule-field{background:#101010;border:1px solid #3b3b3b;border-radius:8px;padding:7px 8px;min-width:0}
      .preview-schedule-label{display:block;color:#929292;font-size:.52rem;font-weight:900;letter-spacing:.6px;margin-bottom:4px}
      .preview-schedule-field select{width:100%;box-sizing:border-box;background:transparent;color:#fff;border:0;outline:0;font-size:.8rem;font-weight:800;padding:0;min-height:27px}
      .preview-schedule-auto{width:100%;margin-top:8px;background:#ffd400;color:#090909;border:0;border-radius:8px;padding:11px 9px;font-weight:900;font-size:.8rem;cursor:pointer}
      .preview-schedule-auto:disabled{opacity:.55}.preview-schedule-auto small{display:block;font-weight:700;font-size:.58rem;margin-top:2px;opacity:.72}
      .preview-schedule-more{width:100%;margin-top:8px;background:#171717;color:#fff;border:1px solid #3a3a3a;border-radius:8px;padding:10px;font-weight:800;font-size:.73rem;text-align:left;cursor:pointer}
      #stardesignLiveSchedule,#stardesignAutoSchedule{display:none!important}
      button[onclick*="togglePdfImportSection"]{display:none!important}
      #pdfImportSection{display:none!important}
      .preview-import-modal{display:none;position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.74);align-items:flex-end;justify-content:center;padding:12px;box-sizing:border-box}
      .preview-import-modal.open{display:flex}.preview-import-sheet{width:100%;max-width:460px;background:#151515;border:1px solid #444;border-radius:14px 14px 10px 10px;padding:12px;max-height:82vh;overflow:auto;box-sizing:border-box}
      .preview-import-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.preview-import-head strong{font-size:.9rem}.preview-import-close{background:#222;color:#fff;border:1px solid #444;border-radius:8px;padding:7px 10px;cursor:pointer}
      .preview-option-group{background:#101010;border:1px solid #333;border-radius:9px;padding:10px;margin:0 0 10px}.preview-option-title{font-size:.72rem;font-weight:900;color:#ffd400;margin-bottom:8px;letter-spacing:.35px}
      .preview-option-group label{display:flex;align-items:flex-start;gap:9px;font-size:.75rem;line-height:1.35;margin:0 0 9px;color:#eee}.preview-option-group label:last-child{margin-bottom:0}.preview-option-group input[type="checkbox"]{width:18px;height:18px;flex:0 0 18px;margin-top:1px}
      .preview-date-option{display:block!important}.preview-date-option input{display:block!important;margin-top:6px!important;width:100%!important;box-sizing:border-box!important;background:#181818!important;color:#fff!important;border:1px solid #3d3d3d!important;border-radius:7px!important;padding:10px!important;font-size:.85rem!important;min-height:42px!important}
      .preview-date-hint{font-size:.65rem;color:#929292;line-height:1.35;margin-top:6px}
      .preview-manual-btn{width:100%;background:#202020;color:#fff;border:1px solid #444;border-radius:8px;padding:10px;font-size:.78rem;font-weight:900;cursor:pointer}
      @media(max-width:390px){.preview-schedule-top{padding:9px}.preview-schedule-auto{padding:11px 8px}.preview-import-modal{padding:8px}.preview-import-sheet{border-radius:13px 13px 8px 8px}}
    `;
    d.head.appendChild(style);

    let userExpanded=false;
    let lastScheduleSignature='';

    function isoToday(){const n=new Date();return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0')}
    function selectedDate(){const raw=w.localStorage.getItem('upper_preview_schedule_date')||isoToday();const m=raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?new Date(+m[1],+m[2]-1,+m[3]):new Date()}
    function getDays(){try{return JSON.parse(w.localStorage.getItem('upper_schedule_days')||'{}')||{}}catch(_){return{}}}
    function hasSchedule(){return Object.values(getDays()).some(v=>Array.isArray(v)&&v.length>0)}
    function dayCount(){return Object.values(getDays()).filter(v=>Array.isArray(v)&&v.length>0).length}
    function scheduleSignature(){const days=getDays();return Object.keys(days).map(k=>k+':'+(Array.isArray(days[k])?days[k].length:0)).join('|')}
    function currentWeekday(){return ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'][selectedDate().getDay()]}
    function autoSelectCurrentDayOnce(){const sig=scheduleSignature();if(!sig||sig===lastScheduleSignature)return;lastScheduleSignature=sig;if(!hasSchedule())return;const days=getDays(),wanted=currentWeekday();if(days[wanted]&&w.localStorage.getItem('upper_schedule_activeday')!==wanted&&typeof w.switchScheduleDay==='function'){setTimeout(()=>w.switchScheduleDay(wanted),60)}}
    function rerunFinder(){if(typeof w.__runStardesignFinder==='function'){setTimeout(()=>w.__runStardesignFinder(),80)}}

    function updateCollapsedState(){
      const top=d.getElementById('previewScheduleTop');if(!top)return;
      const loaded=hasSchedule();
      if(!loaded)userExpanded=false;
      top.classList.toggle('has-schedule',loaded);
      top.classList.toggle('collapsed',loaded&&!userExpanded);
      const sub=top.querySelector('.preview-loaded-sub'),track=d.getElementById('trackSelect');
      if(sub){const trackName=track&&track.selectedOptions&&track.selectedOptions[0]?track.selectedOptions[0].textContent:'Strecke';const count=dayCount();sub.textContent=trackName+(count?' · '+count+(count===1?' Tag':' Tage'):'')+' · Antippen zum Ändern'}
    }

    function mirrorCheckbox(id,labelText,sheet){
      const original=d.getElementById(id);if(!original)return;
      const label=d.createElement('label');
      const clone=d.createElement('input');clone.type='checkbox';clone.checked=original.checked;
      const span=d.createElement('span');span.innerHTML=labelText;
      clone.onchange=function(){const live=d.getElementById(id);if(!live)return;live.checked=clone.checked;live.dispatchEvent(new Event('change',{bubbles:true}))};
      label.appendChild(clone);label.appendChild(span);sheet.appendChild(label);
    }

    function buildModal(){
      const old=d.getElementById('previewImportModal');if(old)old.remove();
      const modal=d.createElement('div');modal.className='preview-import-modal';modal.id='previewImportModal';
      const sheet=d.createElement('div');sheet.className='preview-import-sheet';
      sheet.innerHTML='<div class="preview-import-head"><strong>Weitere Optionen</strong><button class="preview-import-close">Schließen</button></div>';
      modal.appendChild(sheet);d.body.appendChild(modal);

      const dateGroup=d.createElement('div');dateGroup.className='preview-option-group';
      dateGroup.innerHTML='<div class="preview-option-title">DATUM FÜR AUTOMATISCHE SUCHE</div><label class="preview-date-option">Datum auswählen<input id="previewScheduleDate" type="date"><div class="preview-date-hint">Standard ist heute. Hier kannst du z. B. schon den Zeitplan für morgen oder ein späteres Event suchen.</div></label>';
      sheet.appendChild(dateGroup);
      const date=dateGroup.querySelector('#previewScheduleDate');
      date.value=w.localStorage.getItem('upper_preview_schedule_date')||isoToday();
      date.onchange=function(){w.localStorage.setItem('upper_preview_schedule_date',date.value||isoToday());lastScheduleSignature='';rerunFinder()};

      const alarmGroup=d.createElement('div');alarmGroup.className='preview-option-group';alarmGroup.innerHTML='<div class="preview-option-title">ALARM & DISPLAY</div>';
      sheet.appendChild(alarmGroup);
      mirrorCheckbox('alert10mToggle','✨ <strong>10 Min. vorher:</strong> Header leuchten lassen',alarmGroup);
      mirrorCheckbox('alert5mToggle','🚨 <strong>5 Min. vorher:</strong> rot/pulsierend warnen',alarmGroup);
      mirrorCheckbox('keepAwakeToggle','📱 <strong>Display während Rennbetrieb wach halten</strong>',alarmGroup);

      const manual=d.createElement('div');manual.className='preview-option-group';manual.innerHTML='<div class="preview-option-title">MANUELLER PDF-IMPORT</div><button type="button" class="preview-manual-btn">PDF auswählen</button><div class="preview-date-hint">Nur verwenden, wenn der automatische Import nicht funktioniert.</div>';
      sheet.appendChild(manual);
      manual.querySelector('.preview-manual-btn').onclick=function(){const input=d.getElementById('schedulePdfFile');if(input)input.click();else w.alert('PDF-Import ist gerade nicht verfügbar. Bitte die Zeitplan-Seite einmal neu öffnen.')};

      function close(){modal.classList.remove('open')}
      sheet.querySelector('.preview-import-close').onclick=close;modal.onclick=e=>{if(e.target===modal)close()};
      return modal;
    }

    function setup(){
      const page=d.getElementById('pageSchedule'),track=d.getElementById('trackSelect');
      if(!page||!track)return;
      if(d.getElementById('previewScheduleTop')){updateCollapsedState();autoSelectCurrentDayOnce();return}

      const top=d.createElement('div');top.id='previewScheduleTop';top.className='preview-schedule-top';
      top.innerHTML='<button type="button" class="preview-schedule-loaded"><span class="preview-loaded-check">✓</span><span class="preview-loaded-body"><div class="preview-loaded-title">Zeitplan geladen</div><div class="preview-loaded-sub">Antippen zum Ändern</div></span><span class="preview-loaded-chevron">⌄</span></button><div class="preview-schedule-body"><div class="preview-schedule-body-head"><div class="preview-schedule-title">Zeitplan</div><button type="button" class="preview-schedule-collapse">▲ Einklappen</button></div><div class="preview-schedule-sub">Strecke wählen und passenden Stardesign-Zeitplan automatisch laden.</div><div class="preview-schedule-grid"><label class="preview-schedule-field"><span class="preview-schedule-label">STRECKE</span><select id="previewScheduleTrack"></select></label></div><button id="previewScheduleAuto" class="preview-schedule-auto">Zeitplan automatisch laden<small>heutiges bzw. gewähltes Datum · Stardesign prüfen</small></button><button id="previewScheduleMore" class="preview-schedule-more">⋯ Weitere Optionen</button></div>';
      page.insertBefore(top,page.firstChild);

      top.querySelector('.preview-schedule-loaded').onclick=function(){userExpanded=true;updateCollapsedState()};
      top.querySelector('.preview-schedule-collapse').onclick=function(){if(hasSchedule()){userExpanded=false;updateCollapsedState()}};

      const sel=top.querySelector('#previewScheduleTrack');[...track.options].forEach(o=>{const n=d.createElement('option');n.value=o.value;n.textContent=o.textContent;sel.appendChild(n)});sel.value=track.value;
      sel.onchange=function(){track.value=sel.value;track.dispatchEvent(new Event('change',{bubbles:true}));rerunFinder()};

      top.querySelector('#previewScheduleMore').onclick=function(){const modal=buildModal();modal.classList.add('open')};

      top.querySelector('#previewScheduleAuto').onclick=function(){
        const btn=this,original='Zeitplan automatisch laden';btn.disabled=true;if(btn.firstChild)btn.firstChild.textContent='Suche Zeitplan …';
        if(!w.localStorage.getItem('upper_preview_schedule_date'))w.localStorage.setItem('upper_preview_schedule_date',isoToday());
        rerunFinder();let tries=0;
        const timer=setInterval(function(){
          tries++;
          const live=d.querySelector('#stardesignLiveSchedule .stardesign-live-btn');
          const status=d.querySelector('#stardesignLiveSchedule .stardesign-live-status');
          if(live){clearInterval(timer);lastScheduleSignature='';userExpanded=false;live.click();btn.disabled=false;if(btn.firstChild)btn.firstChild.textContent=original;return}
          if(tries===12)rerunFinder();
          if(tries>36){clearInterval(timer);btn.disabled=false;if(btn.firstChild)btn.firstChild.textContent=original;w.alert(status&&status.textContent?status.textContent:'Automatischer Zeitplan konnte nicht gefunden werden. Bitte unter „Weitere Optionen“ die PDF manuell laden.')}
        },160);
      };

      updateCollapsedState();autoSelectCurrentDayOnce();rerunFinder();
    }

    setInterval(function(){setup();updateCollapsedState();autoSelectCurrentDayOnce()},500);
    setTimeout(function(){setup();updateCollapsedState();autoSelectCurrentDayOnce()},350);
  });
})();