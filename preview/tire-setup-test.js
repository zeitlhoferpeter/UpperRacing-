(function(){
  const frame=document.getElementById('previewFrame');
  if(!frame)return;

  frame.addEventListener('load',function(){
    const w=frame.contentWindow,d=frame.contentDocument;
    if(!w||!d)return;

    const style=d.createElement('style');
    style.textContent=`
      .ur-tire-config{margin-top:10px;padding-top:10px;border-top:1px solid #333}
      .ur-tire-config-title{font-size:.72rem;font-weight:900;color:#ffd400;margin:0 0 8px}
      .ur-tire-axles{display:grid;grid-template-columns:1fr 1fr;gap:8px}
      .ur-tire-axle{background:#181818;border:1px solid #3b3b3b;border-radius:9px;padding:9px}
      .ur-tire-axle h4{margin:0 0 7px;font-size:.7rem;color:#fff}
      .ur-tire-axle label{display:block;font-size:.58rem;color:#999;margin:6px 0 3px}
      .ur-tire-axle select,.ur-tire-axle input{width:100%;box-sizing:border-box;background:#101010;color:#fff;border:1px solid #4b4b4b;border-radius:6px;padding:7px 6px;font-size:.72rem}
      .ur-tire-hint{font-size:.58rem;color:#777;margin-top:7px;line-height:1.35}
      @media(max-width:370px){.ur-tire-axles{grid-template-columns:1fr}}
    `;
    d.head.appendChild(style);

    function suffix(){
      if(typeof w.getStorageSuffix==='function')return w.getStorageSuffix();
      const track=d.getElementById('trackSelect')?.value||'pannoniaring';
      const moto=d.getElementById('motorcycleSelect')?.value||'Yamaha R6';
      return track+'_'+moto.replace(/[^a-zA-Z0-9_-]/g,'_');
    }
    function sessionsKey(){return 'upper_sessions_'+suffix()}
    function baselineKey(){return 'baseline_'+suffix()}
    function currentSessionKey(){return d.getElementById('sessionSelect')?.value||''}
    function readJSON(key,fallback){try{return JSON.parse(w.localStorage.getItem(key)||'')||fallback}catch(_){return fallback}}
    function baseline(){return readJSON(baselineKey(),{})}
    function session(){const all=readJSON(sessionsKey(),{});return all[currentSessionKey()]||{}}
    function effective(field){const s=session(),b=baseline();const sv=s[field];return sv!==undefined&&sv!==null&&String(sv).trim()!==''?sv:(b[field]||'')}
    function tireDesc(axle){
      const pre=axle==='front'?'tireFront':'tireRear';
      const parts=[effective(pre+'Brand'),effective(pre+'Model'),effective(pre+'Type')].filter(v=>String(v||'').trim());
      return parts.length?parts.join(' · '):'Kein Reifen ausgewählt';
    }

    const firstBox=d.querySelector('#pageSetup .setup-box');
    if(firstBox&&!d.getElementById('urTireConfig')){
      const grids=firstBox.querySelectorAll('.grid-2');
      const anchor=grids[0];
      const wrap=d.createElement('div');
      wrap.id='urTireConfig';wrap.className='ur-tire-config';
      wrap.innerHTML=`
        <div class="ur-tire-config-title">REIFEN</div>
        <div class="ur-tire-axles">
          <div class="ur-tire-axle"><h4>Vorne</h4>
            <label>Hersteller</label><select id="urTireFrontBrand"><option value="">—</option><option>Pirelli</option><option>Dunlop</option><option>Bridgestone</option><option>Metzeler</option><option>Michelin</option><option>Continental</option><option>Andere</option></select>
            <label>Modell</label><input id="urTireFrontModel" type="text" placeholder="z.B. Diablo Superbike">
            <label>Typ</label><select id="urTireFrontType"><option value="">—</option><option value="Slick">Slick</option><option value="Regenreifen">Regenreifen</option></select>
          </div>
          <div class="ur-tire-axle"><h4>Hinten</h4>
            <label>Hersteller</label><select id="urTireRearBrand"><option value="">—</option><option>Pirelli</option><option>Dunlop</option><option>Bridgestone</option><option>Metzeler</option><option>Michelin</option><option>Continental</option><option>Andere</option></select>
            <label>Modell</label><input id="urTireRearModel" type="text" placeholder="z.B. KR / V02">
            <label>Typ</label><select id="urTireRearType"><option value="">—</option><option value="Slick">Slick</option><option value="Regenreifen">Regenreifen</option></select>
          </div>
        </div>
        <div class="ur-tire-hint">Standard ist das Basis-Setup. In der aktuellen Session werden nur abweichende Reifenwerte verwendet.</div>`;
      if(anchor&&anchor.nextSibling)firstBox.insertBefore(wrap,anchor.nextSibling);else firstBox.appendChild(wrap);
    }

    const fieldMap={
      tireFrontBrand:'urTireFrontBrand',tireFrontModel:'urTireFrontModel',tireFrontType:'urTireFrontType',
      tireRearBrand:'urTireRearBrand',tireRearModel:'urTireRearModel',tireRearType:'urTireRearType'
    };
    function syncUI(){
      Object.entries(fieldMap).forEach(([field,id])=>{const el=d.getElementById(id);if(el&&d.activeElement!==el)el.value=effective(field)||''});
      const f=d.getElementById('tireFront'),r=d.getElementById('tireRear');
      if(f&&d.activeElement!==f&&!String(session().tireFront||'').trim()&&baseline().tireFront)f.value=baseline().tireFront;
      if(r&&d.activeElement!==r&&!String(session().tireRear||'').trim()&&baseline().tireRear)r.value=baseline().tireRear;
    }
    function normalizeAndSaveExtras(){
      const key=currentSessionKey();if(!key)return;
      const all=readJSON(sessionsKey(),{}),s=all[key]||{},b=baseline();
      Object.entries(fieldMap).forEach(([field,id])=>{const val=d.getElementById(id)?.value||'';s[field]=(String(val)===String(b[field]||''))?'':val});
      ['tireFront','tireRear'].forEach(field=>{if(String(s[field]||'')===String(b[field]||''))s[field]=''});
      all[key]=s;w.localStorage.setItem(sessionsKey(),JSON.stringify(all));
    }

    const origSave=w.saveData;
    if(typeof origSave==='function'&&!origSave.__urTireWrapped){
      const wrapped=function(){const r=origSave.apply(this,arguments);normalizeAndSaveExtras();syncUI();return r};wrapped.__urTireWrapped=true;w.saveData=wrapped;
    }
    const origExec=w.executeSaveBaseline;
    if(typeof origExec==='function'&&!origExec.__urTireWrapped){
      const wrapped=function(){const before=w.localStorage.getItem(baselineKey());const r=origExec.apply(this,arguments);setTimeout(function(){const after=w.localStorage.getItem(baselineKey());if(after!==before&&after){const b=readJSON(baselineKey(),{});Object.entries(fieldMap).forEach(([field,id])=>b[field]=d.getElementById(id)?.value||'');w.localStorage.setItem(baselineKey(),JSON.stringify(b));normalizeAndSaveExtras();syncUI()}},0);return r};wrapped.__urTireWrapped=true;w.executeSaveBaseline=wrapped;
    }
    const origLoadBase=w.loadBaseline;
    if(typeof origLoadBase==='function'&&!origLoadBase.__urTireWrapped){
      const wrapped=function(){const r=origLoadBase.apply(this,arguments);const b=baseline();Object.entries(fieldMap).forEach(([field,id])=>{const el=d.getElementById(id);if(el)el.value=b[field]||''});return r};wrapped.__urTireWrapped=true;w.loadBaseline=wrapped;
    }

    Object.values(fieldMap).forEach(id=>{const el=d.getElementById(id);if(el)el.addEventListener('change',function(){normalizeAndSaveExtras();syncUI()})});
    const sess=d.getElementById('sessionSelect'),moto=d.getElementById('motorcycleSelect'),track=d.getElementById('trackSelect');
    if(sess)sess.addEventListener('change',()=>setTimeout(syncUI,80));
    if(moto)moto.addEventListener('change',()=>setTimeout(syncUI,120));
    if(track)track.addEventListener('change',()=>setTimeout(syncUI,120));

    w.upperTireSetupTest={effective,tireDesc,syncUI,normalizeAndSaveExtras};
    setTimeout(syncUI,350);
  });
})();