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
      .preview-import-modal{display:none;position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.74);align-items:flex-end;justify-content:center;padding:12px;box-sizing:border-box}
      .preview-import-modal.open{display:flex}.preview-import-sheet{width:100%;max-width:460px;background:#151515;border:1px solid #444;border-radius:14px 14px 10px 10px;padding:12px;max-height:80vh;overflow:auto;box-sizing:border-box}
      .preview-import-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}.preview-import-head strong{font-size:.9rem}.preview-import-close{background:#222;color:#fff;border:1px solid #444;border-radius:8px;padding:7px 10px;cursor:pointer}
      .preview-import-sheet #pdfImportSection{display:block!important;margin:0!important}
      @media(max-width:390px){.preview-schedule-grid{grid-template-columns:1fr}.preview-schedule-top{padding:9px}.preview-schedule-auto{padding:11px 8px}}
    `;
    d.head.appendChild(style);

    function isoToday(){const n=new Date();return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0')}
    function setup(){
      const page=d.getElementById('pageSchedule'),pdf=d.getElementById('pdfImportSection'),track=d.getElementById('trackSelect');
      if(!page||!pdf||!track||d.getElementById('previewScheduleTop'))return;

      const top=d.createElement('div');top.id='previewScheduleTop';top.className='preview-schedule-top';
      top.innerHTML='<div class="preview-schedule-title">Zeitplan</div><div class="preview-schedule-sub">Strecke und Datum wählen – Zeitplan automatisch über Stardesign laden.</div><div class="preview-schedule-grid"><label class="preview-schedule-field"><span class="preview-schedule-label">STRECKE</span><select id="previewScheduleTrack"></select></label><label class="preview-schedule-field"><span class="preview-schedule-label">DATUM</span><input id="previewScheduleDate" type="date"></label></div><button id="previewScheduleAuto" class="preview-schedule-auto">Zeitplan automatisch laden<small>Stardesign-Website prüfen und passende PDF importieren</small></button><button id="previewScheduleMore" class="preview-schedule-more">⋯ Weitere Optionen / PDF manuell laden</button>';
      page.insertBefore(top,page.firstChild);

      const sel=top.querySelector('#previewScheduleTrack');
      [...track.options].forEach(o=>{const n=d.createElement('option');n.value=o.value;n.textContent=o.textContent;sel.appendChild(n)});sel.value=track.value;
      sel.addEventListener('change',function(){track.value=sel.value;track.dispatchEvent(new Event('change',{bubbles:true}))});
      track.addEventListener('change',function(){sel.value=track.value});

      const date=top.querySelector('#previewScheduleDate');date.value=w.localStorage.getItem('upper_preview_schedule_date')||isoToday();
      date.addEventListener('change',function(){w.localStorage.setItem('upper_preview_schedule_date',date.value);if(typeof w.__runStardesignFinder==='function')w.__runStardesignFinder()});

      const modal=d.createElement('div');modal.className='preview-import-modal';modal.id='previewImportModal';
      const sheet=d.createElement('div');sheet.className='preview-import-sheet';sheet.innerHTML='<div class="preview-import-head"><strong>Weitere Zeitplan-Optionen</strong><button class="preview-import-close">Schließen</button></div>';
      modal.appendChild(sheet);d.body.appendChild(modal);sheet.appendChild(pdf);
      function close(){modal.classList.remove('open')}sheet.querySelector('.preview-import-close').onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close()});
      top.querySelector('#previewScheduleMore').onclick=function(){modal.classList.add('open')};

      top.querySelector('#previewScheduleAuto').onclick=async function(){
        const btn=this;btn.disabled=true;btn.firstChild.textContent='Suche Zeitplan …';
        if(typeof w.__runStardesignFinder==='function')w.__runStardesignFinder();
        let tries=0;
        const timer=setInterval(function(){
          tries++;
          const live=d.querySelector('#stardesignLiveSchedule .stardesign-live-btn');
          const status=d.querySelector('#stardesignLiveSchedule .stardesign-live-status');
          if(live){clearInterval(timer);live.click();btn.disabled=false;btn.firstChild.textContent='Zeitplan automatisch laden';return}
          if(tries>24){clearInterval(timer);btn.disabled=false;btn.firstChild.textContent='Zeitplan automatisch laden';if(status&&status.textContent)w.alert(status.textContent)}
        },150);
      };
    }

    new MutationObserver(setup).observe(d.body,{childList:true,subtree:true});
    setInterval(setup,600);setTimeout(setup,300);
  });
})();