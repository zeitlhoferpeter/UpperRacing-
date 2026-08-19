(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const d=frame.contentDocument;
    if(!d||d.getElementById('upperPagesUnifiedDesign'))return;

    const s=d.createElement('style');
    s.id='upperPagesUnifiedDesign';
    s.textContent=`
      :root{--ur-page:#0b0b0b;--ur-panel:#151515;--ur-panel2:#111;--ur-line:#373737;--ur-line2:#2d2d2d;--ur-yellow:#ffd400;--ur-muted:#8f8f8f}

      main{background:linear-gradient(180deg,#0b0b0b 0%,#101010 100%)!important}
      .page-content{padding:13px 12px 92px!important;background:linear-gradient(180deg,#0b0b0b 0%,#101010 100%)!important;min-height:48vh!important}

      .page-content>.setup-box,
      #pageSetup>.setup-box,
      #pageCurves .setup-box,
      #pageLaps>.setup-box,
      #pageCup>.setup-box,
      #pageBackup>.setup-box,
      #pagePack>.setup-box,
      #pagePack #packContainer>.setup-box{
        background:linear-gradient(145deg,#181818,#111)!important;
        border:1px solid #393939!important;
        border-radius:14px!important;
        padding:13px!important;
        margin-bottom:11px!important;
        box-shadow:0 5px 16px rgba(0,0,0,.18)!important;
      }

      .page-content h2{font-size:.88rem!important;color:#f0f0f0!important;letter-spacing:.7px!important;margin-top:2px!important}
      .page-content .setup-box h3,
      #pagePack #packContainer>.setup-box h3{
        color:#e9e9e9!important;
        font-size:.76rem!important;
        font-weight:900!important;
        letter-spacing:.65px!important;
        text-transform:uppercase!important;
        margin:0 0 11px!important;
        padding-bottom:8px!important;
        border-bottom:1px solid #303030!important;
      }
      #pagePack #packContainer>.setup-box h3{color:#ffd400!important}

      .page-content label{color:#8e8e8e!important;font-size:.62rem!important;font-weight:800!important;letter-spacing:.25px!important}
      .page-content input[type="text"],.page-content input[type="number"],.page-content input[type="email"],.page-content input[type="password"],.page-content input[type="date"],.page-content textarea,.page-content select{
        background:#0d0d0d!important;
        color:#fff!important;
        border:1px solid #3a3a3a!important;
        border-radius:9px!important;
        padding:9px 10px!important;
        min-height:38px!important;
        box-sizing:border-box!important;
      }
      .page-content input:focus,.page-content textarea:focus,.page-content select:focus{
        outline:none!important;
        border-color:#ffd400!important;
        box-shadow:0 0 0 1px rgba(255,212,0,.18)!important;
      }

      .page-content button:not(.ur3-nav):not(.ur3-more-btn):not(.btn-status):not(.preview-race-row button){
        border-radius:9px!important;
        font-weight:850!important;
      }

      #pageSetup .grid-2{gap:9px!important}
      #pageSetup .setup-box>div[style*="margin-top:8px"]{margin-top:10px!important}

      #pageCurves .curve-card{
        border-color:#363636!important;
        background:linear-gradient(145deg,#181818,#111)!important;
        border-radius:13px!important;
        box-shadow:0 4px 14px rgba(0,0,0,.15)!important;
      }

      #pageLaps .setup-box>div[style*="background:#222"]{
        background:#101010!important;
        border:1px solid #303030!important;
        border-radius:11px!important;
        padding:11px!important;
      }
      #lapsContainer>div{border-radius:10px!important}

      #pageSchedule{background:linear-gradient(180deg,#0b0b0b,#101010)!important}
      #pageSchedule .preview-schedule-top{
        background:linear-gradient(145deg,#181818,#111)!important;
        border:1px solid #3b3b3b!important;
        border-radius:14px!important;
        box-shadow:0 5px 16px rgba(0,0,0,.18)!important;
      }
      #pageSchedule .preview-schedule-field{background:#0e0e0e!important;border-color:#363636!important;border-radius:10px!important}
      #pageSchedule .schedule-row{background:linear-gradient(90deg,#171717,#111)!important;border-color:#333!important;border-radius:10px!important}
      #pageSchedule .schedule-row.row-my-group{border-left:4px solid #ffd400!important;background:linear-gradient(90deg,#211d08,#121212)!important}

      #pagePack>div:first-child{margin-bottom:13px!important}
      #pagePack #packContainer>.setup-box{position:relative!important}
      #pagePack #packContainer>.setup-box>div[style*="flex-direction:column"]{gap:7px!important}
      #pagePack #packContainer>.setup-box>div[style*="flex-direction:column"]>div{
        background:#101010!important;
        border:1px solid #292929!important;
        border-radius:9px!important;
        padding:7px 8px!important;
      }
      #pagePack input[type="checkbox"]{accent-color:#ffd400!important}

      #pageCup .setup-box,#pageBackup .setup-box{border-color:#3a3a3a!important}
      #pageBackup #upperCloudV2{border-radius:14px!important;border-color:#4a430f!important;box-shadow:inset 3px 0 0 #ffd400,0 5px 16px rgba(0,0,0,.18)!important}

      .preview-import-sheet,.uc-dialog{
        background:linear-gradient(145deg,#181818,#111)!important;
        border-color:#3d3d3d!important;
        border-radius:16px!important;
      }

      @media(max-width:370px){
        .page-content{padding-left:10px!important;padding-right:10px!important}
        .page-content>.setup-box,#pagePack #packContainer>.setup-box{padding:11px!important}
      }
    `;
    d.head.appendChild(s);
  });
})();
