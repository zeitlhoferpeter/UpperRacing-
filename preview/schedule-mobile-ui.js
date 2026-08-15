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
      .preview-schedule-title{font-size:1rem;font-weight:900;margin-bottom:3px}.preview-schedule-sub{font-size:.7rem;color:#aaa;margin-bottom:9px}
      .preview-schedule-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .preview-schedule-field{background:#101010;border:1px solid #3b3b3b;border-radius:8px;padding:7px 8px;min-width:0}
      .preview-schedule-label{display:block;color:#929292;font-size:.52rem;font-weight:900;letter-spacing:.6px;margin-bottom:4px}
      .preview-schedule-field select,.preview-schedule-field input{width:100%;box-sizing:border-box;background:transparent;color:#fff;border:0;outline:0;font-size:.78rem;font-weight:800;padding:0;min-height:25px}
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
      .preview-manual-import{background:#101010;border:1px solid #333;border-radius:9px;padding:10px}.preview-manual-import h4{color:#ffd400!important}.preview-manual-import input[type=file]{width:100%;color:#ddd}
      @media(max-width:390px){.preview-schedule-grid{grid-template-columns:1fr}.preview-schedule-top{padding:9px}.preview-schedule-auto{padding:11px 8px}.preview-import-modal{padding:8px}.preview-import-sheet{border-radius:13px 13px 8px 8px}}
    `;
    d.head.appendChild(style);

    function isoToday(){const n=new Date();return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0')}
    function rerunFinder(){
      if(typeof w.__runStardesignFinder==='function'){
        setTimeout(()=>w.__runStardesignFinder(),40);
        setTimeout(()=>w.__runStardesignFinder(),260);
      }
    }
    function removeOldShell(){
      const oldModal=d.getElementById('previewImportModal');
      if(oldModal)oldModal.remove();
    }
    function moveSettingsIntoModal(sheet){
      const alarm10=d.getElementById('alert10mToggle');
      const alarm5=d.getElementById('alert5mToggle');
      const awake=d.getElementById('keepAwakeToggle');
      const labels=[alarm10,alarm5,awake].filter(Boolean).map(el=>el.closest('label')).filter(Boolean);
      if(labels.length){
        const group=d.createElement('div');group.className='preview-option-group';
        group.innerHTML='<div class="preview-option-title">ALARM & DISPLAY</div>';
        labels.forEach(label=>group.appendChild(label));
        sheet.appendChild(group);
      }
    }

    function setup(){
      const page=d.getElementById('pageSchedule'),pdf=d.getElementById('pdfImportSection'),track=d.getElementById('trackSelect');
      if(!page||!pdf||!track)return;
      if(d.getElementById('previewScheduleTop'))return;

      removeOldShell();

      const top=d.createElement('div');top.id='previewScheduleTop';top.className='preview-schedule-top';
      top.innerHTML='<div class="preview-schedule-title">Zeitplan</div><div class="preview-schedule-sub">Strecke und Datum wählen – Zeitplan automatisch über Stardesign laden.</div><div class="preview-schedule-grid"><label class="preview-schedule-field"><span class="preview-schedule-label">STRECKE</span><select id="previewScheduleTrack"></select></label><label class="preview-schedule-field"><span class="preview-schedule-label">DATUM</span><input id="previewScheduleDate" type="date"></label></div><button id="previewScheduleAuto" class="preview-schedule-auto">Zeitplan automatisch laden<small>Stardesign-Website prüfen und passende PDF importieren</small></button><button id="previewScheduleMore" class="preview-schedule-more">⋯ Weitere Optionen</button>';
      page.insertBefore(top,page.firstChild);

      const sel=top.querySelector('#previewScheduleTrack');
      [...track.options].forEach(o=>{const n=d.createElement('option');n.value=o.value;n.textContent=o.textContent;sel.appendChild(n)});
      sel.value=track.value;
      sel.addEventListener('change',function(){
        track.value=sel.value;
        track.dispatchEvent(new Event('change',{bubbles:true}));
        rerunFinder();
      });
      track.addEventListener('change',function(){sel.value=track.value;rerunFinder()});

      const date=top.querySelector('#previewScheduleDate');
      date.value=w.localStorage.getItem('upper_preview_schedule_date')||isoToday();
      date.addEventListener('change',function(){w.localStorage.setItem('upper_preview_schedule_date',date.value);rerunFinder()});

      const modal=d.createElement('div');modal.className='preview-import-modal';modal.id='previewImportModal';
      const sheet=d.createElement('div');sheet.className='preview-import-sheet';
      sheet.innerHTML='<div class="preview-import-head"><strong>Weitere Optionen</strong><button class="preview-import-close">Schließen</button></div>';
      modal.appendChild(sheet);d.body.appendChild(modal);

      moveSettingsIntoModal(sheet);
      pdf.classList.add('preview-manual-import');
      pdf.style.display='block';
      sheet.appendChild(pdf);

      function close(){modal.classList.remove('open')}
      sheet.querySelector('.preview-import-close').onclick=close;
      modal.addEventListener('click',e=>{if(e.target===modal)close()});
      top.querySelector('#previewScheduleMore').onclick=function(){modal.classList.add('open')};

      top.querySelector('#previewScheduleAuto').onclick=function(){
        const btn=this;btn.disabled=true;
        const original='Zeitplan automatisch laden';
        if(btn.firstChild)btn.firstChild.textContent='Suche Zeitplan …';
        rerunFinder();
        let tries=0;
        const timer=setInterval(function(){
          tries++;
          const live=d.querySelector('#stardesignLiveSchedule .stardesign-live-btn');
          const status=d.querySelector('#stardesignLiveSchedule .stardesign-live-status');
          if(live){
            clearInterval(timer);live.click();btn.disabled=false;if(btn.firstChild)btn.firstChild.textContent=original;return;
          }
          if(tries===10)rerunFinder();
          if(tries>32){
            clearInterval(timer);btn.disabled=false;if(btn.firstChild)btn.firstChild.textContent=original;
            w.alert(status&&status.textContent?status.textContent:'Automatischer Zeitplan konnte nicht gefunden werden. Bitte unter „Weitere Optionen“ die PDF manuell laden.');
          }
        },160);
      };

      rerunFinder();
    }

    function wrapClearSchedule(){
      if(typeof w.clearSchedule!=='function'||w.clearSchedule.__mobileUiWrapped)return;
      const original=w.clearSchedule;
      const wrapped=function(){
        const result=original.apply(this,arguments);
        setTimeout(function(){removeOldShell();setup();rerunFinder()},80);
        setTimeout(function(){setup();rerunFinder()},350);
        return result;
      };
      wrapped.__mobileUiWrapped=true;
      w.clearSchedule=wrapped;
    }

    new MutationObserver(function(){setup();wrapClearSchedule()}).observe(d.body,{childList:true,subtree:true});
    setInterval(function(){setup();wrapClearSchedule()},500);
    setTimeout(function(){setup();wrapClearSchedule();rerunFinder()},250);
  });
})();