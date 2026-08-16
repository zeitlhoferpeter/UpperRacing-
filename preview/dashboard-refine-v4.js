(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d)return;

    const style=d.createElement('style');
    style.textContent=`
      .ur3-quick{grid-template-columns:1fr!important}
      .ur4-tire-desc{font-size:.57rem;color:#a9a9a9;line-height:1.25;margin:-1px 0 7px;min-height:1.3em}
    `;
    d.head.appendChild(style);

    function apply(){
      const best=d.getElementById('ur3Best');
      if(best){const tile=best.closest('.ur3-mini');if(tile)tile.remove()}

      const boxes=d.querySelectorAll('.ur3-pressure-box');
      if(boxes[0]&&!d.getElementById('ur4FrontDesc')){
        const desc=d.createElement('div');desc.id='ur4FrontDesc';desc.className='ur4-tire-desc';
        const label=boxes[0].querySelector('.ur3-pressure-label');if(label)label.insertAdjacentElement('afterend',desc);
      }
      if(boxes[1]&&!d.getElementById('ur4RearDesc')){
        const desc=d.createElement('div');desc.id='ur4RearDesc';desc.className='ur4-tire-desc';
        const label=boxes[1].querySelector('.ur3-pressure-label');if(label)label.insertAdjacentElement('afterend',desc);
      }
      updateDescriptions();
    }

    function updateDescriptions(){
      const api=w.upperTireSetupTest;
      const front=d.getElementById('ur4FrontDesc'),rear=d.getElementById('ur4RearDesc');
      if(front)front.textContent=api&&typeof api.tireDesc==='function'?api.tireDesc('front'):'Kein Reifen ausgewählt';
      if(rear)rear.textContent=api&&typeof api.tireDesc==='function'?api.tireDesc('rear'):'Kein Reifen ausgewählt';
    }

    setTimeout(apply,1050);
    setInterval(function(){if(d.getElementById('upperDashboardV3')?.classList.contains('show'))updateDescriptions()},900);
  });
})();