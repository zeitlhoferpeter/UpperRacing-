(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;
  frame.addEventListener('load',function(){
    const d=frame.contentDocument;
    if(!d||d.getElementById('upperHeaderFrameCleanOverride'))return;
    const style=d.createElement('style');
    style.id='upperHeaderFrameCleanOverride';
    style.textContent=`
      .app-container{padding-top:7px!important}
      .app-header{
        position:relative!important;
        box-sizing:border-box!important;
        margin:0 8px 22px!important;
        border:2px solid transparent!important;
        border-radius:16px!important;
        background:
          linear-gradient(180deg,#121212 0%,#0b0b0b 100%) padding-box,
          linear-gradient(115deg,#f3cf18 0%,#f3cf18 13%,#eea51a 34%,#e65a2d 62%,#e53935 82%,#ff3545 100%) border-box!important;
        box-shadow:0 10px 26px rgba(0,0,0,.42),0 0 10px rgba(229,57,53,.055)!important;
        overflow:hidden!important;
      }
      .app-header:before,
      .app-header:after{
        display:none!important;
        content:none!important;
      }
      .header-brand-row{padding-top:3px!important}
      main{
        border-top:1px solid #202020!important;
        padding-top:14px!important;
      }
      main:before{display:none!important;content:none!important}
      @media(max-width:360px){
        .app-header{margin-left:6px!important;margin-right:6px!important;border-radius:14px!important}
      }
    `;
    d.head.appendChild(style);
  });
})();
