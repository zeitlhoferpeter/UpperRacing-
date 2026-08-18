(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const d=frame.contentDocument;
    if(!d)return;

    function sync(){
      const headerTrack=d.getElementById('trackSelect');
      const scheduleTrack=d.getElementById('previewScheduleTrack');
      if(!headerTrack||!scheduleTrack)return;

      // Die Auswahl im Zeitplan bleibt technisch vorhanden, damit bestehende
      // Import-Logik nicht berührt wird. Sichtbar ist aber nur noch die
      // zentrale Streckenauswahl im Header.
      scheduleTrack.value=headerTrack.value;

      const field=scheduleTrack.closest('.preview-schedule-field');
      if(field)field.style.display='none';

      const grid=scheduleTrack.closest('.preview-schedule-grid');
      if(grid&&!d.getElementById('previewScheduleTrackDisplay')){
        const display=d.createElement('div');
        display.id='previewScheduleTrackDisplay';
        display.className='preview-schedule-field';
        display.innerHTML='<span class="preview-schedule-label">STRECKE</span><div id="previewScheduleTrackName" style="font-size:.8rem;font-weight:900;color:#fff;min-height:27px;display:flex;align-items:center"></div>';
        grid.appendChild(display);
      }

      const name=d.getElementById('previewScheduleTrackName');
      if(name){
        const opt=headerTrack.selectedOptions&&headerTrack.selectedOptions[0];
        name.textContent=opt?opt.textContent:headerTrack.value;
      }
    }

    const headerTrack=d.getElementById('trackSelect');
    if(headerTrack)headerTrack.addEventListener('change',function(){setTimeout(sync,0)});

    sync();
    setTimeout(sync,300);
    setInterval(sync,800);
  });
})();
