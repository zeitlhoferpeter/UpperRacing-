(function(){
  'use strict';

  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d||d.__upperSetupBaselinesMain)return;
    d.__upperSetupBaselinesMain=true;

    const STANDARD_FIELDS=[
      'tireFront','tireRear','gearing',
      'forkRebound','forkCompression','forkPreload','forkSag','forkRemaining',
      'shockRebound','shockCompression','shockPreload','shockSag','shockRemaining'
    ];
    const EXTRA_FIELDS={
      tireFrontBrand:'urTireFrontBrand',
      tireFrontModel:'urTireFrontModel',
      tireFrontType:'urTireFrontType',
      tireRearBrand:'urTireRearBrand',
      tireRearModel:'urTireRearModel',
      tireRearType:'urTireRearType'
    };

    let loadedFromTrack='';

    function safeMoto(){
      const moto=d.getElementById('motorcycleSelect')?.value||'Yamaha R6';
      return String(moto).replace(/[^a-zA-Z0-9_-]/g,'_');
    }
    function currentTrack(){return d.getElementById('trackSelect')?.value||'pannoniaring'}
    function trackName(key){
      const sel=d.getElementById('trackSelect');
      if(sel){
        const opt=[...sel.options].find(o=>o.value===key);
        if(opt)return String(opt.textContent||key).trim();
      }
      return key;
    }
    function baselineKey(track){return 'baseline_'+track+'_'+safeMoto()}
    function readJSON(key){try{return JSON.parse(w.localStorage.getItem(key)||'null')}catch(_){return null}}

    function collectBaselineData(){
      const out={};
      STANDARD_FIELDS.forEach(function(id){out[id]=d.getElementById(id)?.value||''});
      Object.entries(EXTRA_FIELDS).forEach(function(entry){
        const field=entry[0],id=entry[1];
        out[field]=d.getElementById(id)?.value||'';
      });
      return out;
    }

    function applyBaselineData(data){
      if(!data)return;
      STANDARD_FIELDS.forEach(function(id){
        const el=d.getElementById(id);
        if(el)el.value=data[id]||'';
      });
      Object.entries(EXTRA_FIELDS).forEach(function(entry){
        const field=entry[0],id=entry[1],el=d.getElementById(id);
        if(el)el.value=data[field]||'';
      });
    }

    function showNotice(text){
      if(typeof w.showNotice==='function')w.showNotice('saveNotice',text);
    }

    function markChanged(){
      if(typeof w.markDataAsChanged==='function')w.markDataAsChanged();
    }

    function ensureStyles(){
      if(d.getElementById('upperSetupBaselineMainStyles'))return;
      const s=d.createElement('style');
      s.id='upperSetupBaselineMainStyles';
      s.textContent=`
        #upperSetupBaselineStatus{font-size:.62rem;color:#989898;margin:-7px 0 12px;line-height:1.35}
        #upperSetupBaselineStatus strong{color:#ffd400}
        .usb-modal{position:fixed;inset:0;z-index:100050;background:rgba(0,0,0,.76);display:flex;align-items:flex-end;justify-content:center;padding:14px;box-sizing:border-box}
        .usb-panel{width:min(520px,100%);background:#171717;border:1px solid #3e3e3e;border-radius:16px;padding:15px;box-shadow:0 14px 44px rgba(0,0,0,.55);color:#fff}
        .usb-title{font-size:.88rem;font-weight:950;margin:0 0 5px;color:#fff}
        .usb-sub{font-size:.64rem;color:#929292;line-height:1.4;margin-bottom:12px}
        .usb-actions{display:flex;flex-direction:column;gap:8px}
        .usb-btn{width:100%;border:1px solid #444;border-radius:10px;padding:12px 11px;background:#242424;color:#fff;text-align:left;font-size:.76rem;font-weight:850;cursor:pointer}
        .usb-btn strong{display:block;color:#ffd400;font-size:.78rem;margin-bottom:2px}
        .usb-btn span{display:block;color:#9a9a9a;font-size:.61rem;font-weight:650;line-height:1.35}
        .usb-btn.usb-primary{background:#ffd400;color:#111;border-color:#ffd400;text-align:center}
        .usb-btn.usb-primary strong,.usb-btn.usb-primary span{color:#111}
        .usb-btn.usb-cancel{background:transparent;color:#999;text-align:center;border-color:#333}
        .usb-empty{padding:12px;border:1px dashed #444;border-radius:10px;color:#888;font-size:.68rem;line-height:1.4}
      `;
      d.head.appendChild(s);
    }

    function closeModal(){const el=d.getElementById('upperSetupBaselineModal');if(el)el.remove()}

    function modal(title,sub){
      closeModal();
      const overlay=d.createElement('div');
      overlay.id='upperSetupBaselineModal';
      overlay.className='usb-modal';
      overlay.innerHTML='<div class="usb-panel"><div class="usb-title"></div><div class="usb-sub"></div><div class="usb-actions"></div></div>';
      overlay.querySelector('.usb-title').textContent=title;
      overlay.querySelector('.usb-sub').textContent=sub||'';
      overlay.addEventListener('click',function(e){if(e.target===overlay)closeModal()});
      d.body.appendChild(overlay);
      return overlay.querySelector('.usb-actions');
    }

    function addButton(actions,title,desc,onClick,cls){
      const b=d.createElement('button');
      b.type='button';b.className='usb-btn'+(cls?' '+cls:'');
      b.innerHTML='<strong></strong>'+(desc?'<span></span>':'');
      b.querySelector('strong').textContent=title;
      if(desc)b.querySelector('span').textContent=desc;
      b.addEventListener('click',onClick);
      actions.appendChild(b);
      return b;
    }

    function updateStatus(){
      const status=d.getElementById('upperSetupBaselineStatus');
      if(!status)return;
      const track=currentTrack();
      const own=readJSON(baselineKey(track));
      if(loadedFromTrack){
        status.innerHTML='Geladen: <strong>Basis Setup '+trackName(loadedFromTrack)+'</strong> · Änderungen können für '+trackName(track)+' gespeichert werden.';
      }else if(own){
        status.innerHTML='Vorhanden: <strong>Basis Setup '+trackName(track)+'</strong> für dieses Motorrad.';
      }else{
        status.textContent='Für '+trackName(track)+' ist noch kein Basis-Setup für dieses Motorrad gespeichert.';
      }
    }

    function saveSessionOnly(){
      closeModal();
      if(typeof w.saveData==='function')w.saveData();
      updateStatus();
    }

    function saveCurrentAsBasis(){
      const track=currentTrack();
      const name=trackName(track);
      const exists=!!readJSON(baselineKey(track));
      if(exists&&!w.confirm('Basis Setup '+name+' existiert bereits. Möchtest du genau dieses Basis-Setup aktualisieren?'))return;

      if(typeof w.saveData==='function')w.saveData();
      const data=collectBaselineData();
      try{
        w.localStorage.setItem(baselineKey(track),JSON.stringify(data));
        loadedFromTrack=track;
        markChanged();
        if(w.upperTireSetupTest&&typeof w.upperTireSetupTest.normalizeAndSaveExtras==='function'){
          w.upperTireSetupTest.normalizeAndSaveExtras();
          if(typeof w.upperTireSetupTest.syncUI==='function')w.upperTireSetupTest.syncUI();
        }
        closeModal();
        showNotice('Basis Setup '+name+' gespeichert!');
        updateStatus();
      }catch(e){
        w.alert('Basis-Setup konnte nicht gespeichert werden.');
      }
    }

    function openSaveChoice(){
      const track=currentTrack(),name=trackName(track);
      const exists=!!readJSON(baselineKey(track));
      const actions=modal('Setup speichern',trackName(track)+' · '+(d.getElementById('motorcycleSelect')?.value||''));
      addButton(actions,'Nur für diese Session speichern','Speichert die aktuellen Werte nur in der gewählten Session.',saveSessionOnly,'usb-primary');
      addButton(actions,exists?'Basis Setup '+name+' aktualisieren':'Als Basis Setup '+name+' speichern',exists?'Nur möglich, weil '+name+' aktuell als Strecke ausgewählt ist.':'Legt für '+name+' ein neues Basis-Setup für dieses Motorrad an.',saveCurrentAsBasis,'');
      addButton(actions,'Abbrechen','',closeModal,'usb-cancel');
    }

    function availableBaselines(){
      const sel=d.getElementById('trackSelect');
      if(!sel)return[];
      const result=[];
      [...sel.options].forEach(function(opt){
        const key=String(opt.value||'');if(!key)return;
        const data=readJSON(baselineKey(key));
        if(data)result.push({track:key,name:String(opt.textContent||key).trim(),data:data});
      });
      return result;
    }

    function loadBasis(item){
      applyBaselineData(item.data);
      loadedFromTrack=item.track;
      closeModal();
      showNotice('Basis Setup '+item.name+' geladen – noch nicht gespeichert.');
      updateStatus();
    }

    function openLoadBasis(){
      const list=availableBaselines();
      const current=currentTrack();
      const actions=modal('Basis-Setup laden','Es werden nur Basis-Setups des aktuell ausgewählten Motorrads angezeigt. Das geladene Setup dient als Vorlage und verändert die ursprüngliche Basis nicht.');
      if(!list.length){
        const empty=d.createElement('div');empty.className='usb-empty';empty.textContent='Für dieses Motorrad gibt es noch keine Basis-Setups.';actions.appendChild(empty);
      }else{
        list.forEach(function(item){
          addButton(actions,'Basis Setup '+item.name,item.track===current?'Basis der aktuell ausgewählten Strecke':'Als Vorlage für '+trackName(current)+' laden',function(){loadBasis(item)},'');
        });
      }
      addButton(actions,'Abbrechen','',closeModal,'usb-cancel');
    }

    function mount(){
      ensureStyles();
      const page=d.getElementById('pageSetup');if(!page)return;
      const saveBtn=page.querySelector('button[onclick="saveData()"]');
      const oldBasisBtn=page.querySelector('button[onclick="saveAsBaseline()"]');
      const loadBtn=page.querySelector('button[onclick="loadBaseline()"]');
      if(!saveBtn||!loadBtn)return;

      if(!saveBtn.__usbMounted){
        saveBtn.__usbMounted=true;
        saveBtn.removeAttribute('onclick');
        saveBtn.addEventListener('click',openSaveChoice);
        saveBtn.style.flex='2';
        saveBtn.textContent='💾 Speichern';
      }
      if(oldBasisBtn)oldBasisBtn.style.display='none';
      if(!loadBtn.__usbMounted){
        loadBtn.__usbMounted=true;
        loadBtn.removeAttribute('onclick');
        loadBtn.addEventListener('click',openLoadBasis);
        loadBtn.style.flex='1';
        loadBtn.textContent='Basis laden';
      }

      if(!d.getElementById('upperSetupBaselineStatus')){
        const status=d.createElement('div');status.id='upperSetupBaselineStatus';
        const notice=d.getElementById('saveNotice');
        if(notice&&notice.parentNode)notice.parentNode.insertBefore(status,notice);
        else page.appendChild(status);
      }
      updateStatus();
    }

    const track=d.getElementById('trackSelect');
    const moto=d.getElementById('motorcycleSelect');
    if(track)track.addEventListener('change',function(){loadedFromTrack='';setTimeout(updateStatus,160)});
    if(moto)moto.addEventListener('change',function(){loadedFromTrack='';setTimeout(updateStatus,160)});

    setTimeout(mount,500);
    setTimeout(mount,1200);
    w.upperSetupBaselinesMain={openSaveChoice:openSaveChoice,openLoadBasis:openLoadBasis,updateStatus:updateStatus};
  });
})();
