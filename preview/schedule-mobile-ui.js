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
      .preview-schedule-title{font-size:1rem;font-weight:900;margin-bottom:3px}.preview-schedule-sub{font-size:.7rem;color:#aaa;margin-bottom:9px}
      .preview-schedule-grid{display:grid;grid-template-columns:1fr;gap:8px}
      .preview-schedule-field{background:#101010;border:1px solid #3b3b3b;border-radius:8px;padding:7px 8px;min-width:0}
      .preview-schedule-label{display:block;color:#929292;font-size:.52rem;font-weight:900;letter-spacing:.6px;margin-bottom:4px}
      .preview-schedule-field select{width:100%;box-sizing:border-box;background:transparent;color:#fff;border:0;outline:0;font-size:.8rem;font-weight:800;padding:0;min-height:27px}
      .preview-schedule-auto{width:100%;margin-top:8px;background:#ffd400;color:#090909;border:0;border-radius:8px;padding:11px 9px;font-weight:900;font-size:.8rem;cursor:pointer}
      .preview-schedule-auto:disabled{opacity:.55}.preview-schedule-auto small{display:block;font-weight:700;font-size:.58rem;margin-top:2px;opacity:.72}
      .preview-schedule-more{width:100%;margin-top:8px;background:#171717;color:#fff;border:1px solid #3a3a3a;border-radius:8px;padding:10px;font-weight:800;font-size:.73rem;text-align:left;cursor:pointer}
      #stardesignLiveSchedule,#stardesignAutoSchedule{display:none!important}
      button[onclick*="togglePdfImportSection"]{display:none!important}
      .preview-import-modal{display:none;position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.74);align-items:flex-end;justify-content:center;padding:12px;box-sizing:border-box}
      .preview-import-modal.open{display:flex}.preview-import-sheet{width:100%;max-width:460px;background:#151515;border:1px solid #444;border-radius:14px 14px 10px 10px;padding:12px;max-height:82vh;overflow:auto;box-sizing:border-box}
      .preview-import-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.preview-import-head strong{font-size:.9rem}.preview-import-close{background:#222;color:#fff;border:1px solid #444;border-radius:8px;padding:7px 10px;cursor:pointer}
      .preview-option-group{background:#101010;border:1px solid #333;border-radius:9px;padding:10px;margin:0 0 10px}.preview-option-title{font-size:.72rem;font-weight:900;color:#ffd400;margin-bottom:8px;letter-spacing:.35px}
      .preview-option-group label{display:flex!important;align-items:flex-start!important;gap:9px!important;font-size:.75rem!important;line-height:1.35!important;margin:0 0 9px!important;color:#eee!important}.preview-option-group label:last-child{margin-bottom:0!important}.preview-option-group input[type="checkbox"]{width:18px!important;height:18px!important;flex:0 0 18px!important;margin-top:1px!important}
      .preview-date-option{display:block!important}.preview-date-option input{margin-top:5px;width:100%;box-sizing:border-box;background:#181818;color:#fff;border:1px solid #3d3d3d;border-radius:7px;padding:9px;font-size:.8rem}
      .preview-date-hint{font-size:.65rem;color:#929292;line-height:1.35;margin-top:6px}
      .preview-manual-import{background:#101010;border:1px solid #333;border-radius:9px;padding:10px}.preview-manual-import h4{color:#ffd400!important}.preview-manual-import input[type=file]{width:100%;color:#ddd}
      @media(max-width:390px){.preview-schedule-top{padding:9px}.preview-schedule-auto{padding:11px 8px}.preview-import-modal{padding:8px}.preview-import-sheet{border-radius:13px 13px 8px 8px}}
    `;
    d.head.appendChild(style);

    let userExpanded=false;
    let lastScheduleSignature='';

    function isoToday(){const n=new Date();return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0')}
    function selectedDate(){
      const raw=w.localStorage.getItem('upper_preview_schedule_date')||isoToday();
      const m=raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if(!m)return new Date();
      return new Date(+m[1],+m[2]-1,+m[3]);
    }
    function getDays(){try{return JSON.parse(w.localStorage.getItem('upper_schedule_days')||'{}')||{}}catch(_){return{}}}
    function hasSchedule(){const days=getDays();return Object.values(days).some(v=>Array.isArray(v)&&v.length>0)}
    function scheduleSignature(){
      const days=getDays();
      return Object.keys(days).map(k=>k+':'+(Array.isArray(days[k])?days[k].length:0)).join('|');
    }
    function dayCount(){const days=getDays();return Object.values(days).filter(v=>Array.isArray(v)&&v.length>0).length}
    function currentWeekday(){return ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'][selectedDate().getDay()]}
    function autoSelectCurrentDayOnce(){
      const sig=scheduleSignature();
      if(!sig||sig===lastScheduleSignature)return;
      lastScheduleSignature=sig;
      if(!hasSchedule())return;
      const days=getDays();
      const wanted=currentWeekday();
      if(days[wanted]&&w.localStorage.getItem('upper_schedule_activeday')!==wanted&&typeof w.switchScheduleDay==='function'){
        setTimeout(function(){w.switchScheduleDay(wanted)},40);
      }
    }
    function rerunFinder(){if(typeof w.__runStardesignFinder==='function'){setTimeout(()=>w.__runStardesignFinder(),60);setTimeout(()=>w.__runStardesignFinder(),320)}}
    function removeOldModal(){const old=d.getElementById('previewImportModal');if(old)old.remove()}

    function updateCollapsedState(){
      const top=d.getElementById('previewScheduleTop');if(!top)return;
      const loaded=hasSchedule();
      if(!loaded)userExpanded=false;
      top.classList.toggle('collapsed',loaded&&!userExpanded);
      const sub=top.querySelector('.preview-loaded-sub'),track=d.getElementById('trackSelect');
      if(sub){const trackName=track&&track.selectedOptions&&track.selectedOptions[0]?track.selectedOptions[0].textContent:'Strecke';const count=dayCount();sub.textContent=trackName+(count?' · '+count+(count===1?' Tag':' Tage'):'')+' · Antippen zum Ändern'}
    }

    function moveSettingsIntoModal(sheet){
      const ids=['alert10mToggle','alert5mToggle','keepAwakeToggle'];
      const labels=ids.map(id=>d.getElementById(id)).filter(Boolean).map(el=>el.closest('label')).filter(Boolean);
      if(!labels.length)return;
      const group=d.createElement('div');group.className='preview-option-group';group.innerHTML='<div class="preview-option-title">ALARM & DISPLAY</div>';
      labels.forEach(label=>group.appendChild(label));sheet.appendChild(group);
    }

    function setup(){
      const page=d.getElementById('pageSchedule'),pdf=d.getElementById('pdfImportSection'),track=d.getElementById('trackSelect');
      if(!page||!pdf||!track)return;
      if(d.getElementById('previewScheduleTop')){updateCollapsedState();autoSelectCurrentDayOnce();return}

      removeOldModal();

      const top=d.createElement('div');top.id='previewScheduleTop';top.className='preview-schedule-top';
      top.innerHTML='<button type="button" class="preview-schedule-loaded"><span class="preview-loaded-check">✓</span><span class="preview-loaded-body"><div class="preview-loaded-title">Zeitplan geladen</div><div class="preview-loaded-sub">Antippen zum Ändern</div></span><span class="preview-loaded-chevron">⌄</span></button><div class="preview-schedule-body"><div class="preview-schedule-title">Zeitplan</div><div class="preview-schedule-sub">Strecke wählen und passenden Stardesign-Zeitplan automatisch laden.</div><div class="preview-schedule-grid"><label class="preview-schedule-field"><span class="preview-schedule-label">STRECKE</span><select id="previewScheduleTrack"></select></label></div><button id="previewScheduleAuto" class="preview-schedule-auto">Zeitplan automatisch laden<small>heutiges Datum · Stardesign-Website prüfen</small></button><button id="previewScheduleMore" class="preview-schedule-more">⋯ Weitere Optionen</button></div>';
      page.insertBefore(top,page.firstChild);

      top.querySelector('.preview-schedule-loaded').onclick=function(){userExpanded=true;updateCollapsedState()};

      const sel=top.querySelector('#previewScheduleTrack');
      [...track.options].forEach(o=>{const n=d.createElement('option');n.value=o.value;n.textContent=o.textContent;sel.appendChild(n)});sel.value=track.value;
      sel.onchange=function(){track.value=sel.value;track.dispatchEvent(new Event('change',{bubbles:true}));rerunFinder()};

      const modal=d.createElement('div');modal.className='preview-import-modal';modal.id='previewImportModal';
      const sheet=d.createElement('div');sheet.className='preview-import-sheet';sheet.innerHTML='<div class="preview-import-head"><strong>Weitere Optionen</strong><button class="preview-import-close">Schließen</button></div>';
      modal.appendChild(sheet);d.body.appendChild(modal);

      const dateGroup=d.createElement('div');dateGroup.className='preview-option-group';
      dateGroup.innerHTML='<div class="preview-option-title">ANDERES DATUM</div><label class="preview-date-option">Datum für automatische Suche<input id="previewScheduleDate" type="date"><div class="preview-date-hint">Standardmäßig wird heute verwendet. Nur ändern, wenn du einen anderen Event-Zeitplan laden möchtest.</div></label>';
      sheet.appendChild(dateGroup);
      const date=dateGroup.querySelector('#previewScheduleDate');date.value=w.localStorage.getItem('upper_preview_schedule_date')||isoToday();
      date.onchange=function(){w.localStorage.setItem('upper_preview_schedule_date',date.value||isoToday());lastScheduleSignature='';rerunFinder()};

      moveSettingsIntoModal(sheet);
      pdf.classList.add('preview-manual-import');pdf.style.display='block';sheet.appendChild(pdf);

      function close(){modal.classList.remove('open')}
      sheet.querySelector('.preview-import-close').onclick=close;
      modal.onclick=function(e){if(e.target===modal)close()};
      top.querySelector('#previewScheduleMore').onclick=function(){modal.classList.add('open')};

      top.querySelector('#previewScheduleAuto').onclick=function(){
        const btn=this,original='Zeitplan automatisch laden';btn.disabled=true;if(btn.firstChild)btn.firstChild.textContent='Suche Zeitplan …';
        if(!w.localStorage.getItem('upper_preview_schedule_date'))w.localStorage.setItem('upper_preview_schedule_date',isoToday());
        rerunFinder();let tries=0;
        const timer=setInterval(function(){
          tries++;
          const live=d.querySelector('#stardesignLiveSchedule .stardesign-live-btn');
          const status=d.querySelector('#stardesignLiveSchedule .stardesign-live-status');
          if(live){clearInterval(timer);lastScheduleSignature='';live.click();btn.disabled=false;if(btn.firstChild)btn.firstChild.textContent=original;return}
          if(tries===10)rerunFinder();
          if(tries>32){clearInterval(timer);btn.disabled=false;if(btn.firstChild)btn.firstChild.textContent=original;w.alert(status&&status.textContent?status.textContent:'Automatischer Zeitplan konnte nicht gefunden werden. Bitte unter „Weitere Optionen“ die PDF manuell laden.')}
        },160);
      };

      updateCollapsedState();autoSelectCurrentDayOnce();rerunFinder();
    }

    // Bewusst kein MutationObserver: nur ein leichter Zustandscheck.
    setInterval(function(){setup();updateCollapsedState();autoSelectCurrentDayOnce()},350);
    setTimeout(function(){setup();updateCollapsedState();autoSelectCurrentDayOnce()},300);
  });
})();