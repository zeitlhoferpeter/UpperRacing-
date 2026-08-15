(function(){
  const frame = document.getElementById('previewFrame');
  if (!frame) return;

  frame.addEventListener('load', function(){
    const w = frame.contentWindow;
    const d = frame.contentDocument;
    if (!w || !d) return;

    let testTimer = null;
    let style = d.getElementById('preview-weather-warning-style');
    if (!style) {
      style = d.createElement('style');
      style.id = 'preview-weather-warning-style';
      style.textContent = `
        .preview-weather-test-yellow{background:#ffd400!important;color:#111!important;border-color:#ffe45c!important;box-shadow:0 0 0 2px rgba(255,212,0,.35),0 0 18px rgba(255,212,0,.55)!important}
        .preview-weather-test-orange{background:#ff8c00!important;color:#111!important;border-color:#ffb347!important;box-shadow:0 0 0 2px rgba(255,140,0,.35),0 0 20px rgba(255,140,0,.65)!important}
        .preview-weather-test-red{background:#d71920!important;color:#fff!important;border-color:#ff555a!important;box-shadow:0 0 0 3px rgba(215,25,32,.4),0 0 24px rgba(215,25,32,.8)!important}
      `;
      d.head.appendChild(style);
    }

    function sourceWidget(){ return d.getElementById('weather-header-widget'); }
    function visibleWidget(){ return d.querySelector('.preview-weather-card'); }
    function infoText(){ return d.getElementById('weather-info-text'); }
    const testClasses = ['preview-weather-test-yellow','preview-weather-test-orange','preview-weather-test-red'];

    function syncPulseAnd90Fix(){
      const source = sourceWidget();
      const visible = visibleWidget();
      const info = infoText();
      if (!source) return;
      const text = info ? String(info.textContent || '') : '';
      const match = text.match(/Heute:\s*(\d+)\s*%/i);
      const today = match ? Number(match[1]) : NaN;
      if (Number.isFinite(today) && today >= 90 && source.classList.contains('alert-orange')) {
        source.classList.remove('alert-orange'); source.classList.add('alert-red');
      }
      if (visible && !testClasses.some(c => visible.classList.contains(c))) {
        visible.classList.toggle('alert-yellow', source.classList.contains('alert-yellow'));
        visible.classList.toggle('alert-orange', source.classList.contains('alert-orange'));
        visible.classList.toggle('alert-red', source.classList.contains('alert-red'));
        visible.classList.toggle('weather-pulse', source.classList.contains('weather-pulse'));
      }
    }

    function rememberState(el){
      if (!el) return [];
      return ['alert-yellow','alert-orange','alert-red','weather-pulse'].filter(c => el.classList.contains(c));
    }
    function restoreState(el, classes){
      if (!el) return;
      el.classList.remove('alert-yellow','alert-orange','alert-red','weather-pulse',...testClasses);
      classes.forEach(c => el.classList.add(c));
    }

    function testVisual(level, pulse){
      const source = sourceWidget();
      const visible = visibleWidget();
      if (!source && !visible) return;
      if (testTimer) clearTimeout(testTimer);
      const oldSource = rememberState(source), oldVisible = rememberState(visible);
      [source, visible].forEach(el => {
        if (!el) return;
        el.classList.remove('alert-yellow','alert-orange','alert-red','weather-pulse',...testClasses);
        if (level) {
          el.classList.add('alert-' + level);
          el.classList.add('preview-weather-test-' + level);
        }
        if (pulse) el.classList.add('weather-pulse');
      });
      const modal = d.getElementById('weather-modal');
      if (modal) modal.classList.remove('active');
      testTimer = setTimeout(function(){
        restoreState(source, oldSource); restoreState(visible, oldVisible); syncPulseAnd90Fix();
      }, 7000);
    }

    function vibrate(kind){
      try {
        if (!w.navigator || typeof w.navigator.vibrate !== 'function') return;
        if (kind === 'orange') w.navigator.vibrate([350,180,350]);
        else w.navigator.vibrate([650,180,650,180,900,250,900]);
      } catch(e) { console.warn('[Preview Wettertest] Vibration:', e); }
    }

    function beep(kind){
      try {
        const AudioCtx = w.AudioContext || w.webkitAudioContext;
        if (!AudioCtx) { vibrate(kind); return; }
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
        const one = function(delay, freq, type, volume, duration){
          const osc=ctx.createOscillator(), gain=ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination); osc.type=type;
          osc.frequency.setValueAtTime(freq,ctx.currentTime+delay);
          gain.gain.setValueAtTime(volume,ctx.currentTime+delay);
          gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+delay+duration);
          osc.start(ctx.currentTime+delay); osc.stop(ctx.currentTime+delay+duration);
        };
        if (kind === 'orange') {
          one(0,700,'square',0.16,0.45); one(0.58,700,'square',0.16,0.45);
        } else {
          // Deutlich laengerer, wechselnder Alarm fuer laute Rennstrecken.
          [0,0.55,1.1,1.65,2.2,2.75,3.3,3.85].forEach(function(delay,i){
            one(delay, i%2 ? 1050 : 820, 'square', 0.22, 0.42);
          });
        }
        vibrate(kind);
        setTimeout(function(){ try{ctx.close();}catch(e){} }, kind==='red'?4800:1800);
      } catch(e) { console.warn('[Preview Wettertest] Audio:',e); vibrate(kind); }
    }

    function installControls(){
      const modalBody=d.querySelector('#weather-modal .weather-modal-body');
      if(!modalBody||d.getElementById('previewWeatherWarningTest'))return false;
      const box=d.createElement('div'); box.id='previewWeatherWarningTest';
      box.style.cssText='background:#171717;border:1px dashed #666;border-radius:8px;padding:10px 12px;margin:0 0 15px;color:#fff;';
      box.innerHTML=`<div style="font-weight:900;color:#ffd400;margin-bottom:5px;">🧪 Warnung testen – nur Testversion</div><div style="font-size:11px;color:#aaa;line-height:1.35;margin-bottom:9px;">Farben/Blinken werden 7 Sekunden simuliert. Ton-Tests vibrieren auf unterstützten Handys zusätzlich.</div><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;"><button type="button" data-weather-test="yellow" style="padding:8px;border:0;border-radius:5px;background:#ffd400;color:#111;font-weight:800;">Gelb · 50 %</button><button type="button" data-weather-test="orange" style="padding:8px;border:0;border-radius:5px;background:#ff8c00;color:#111;font-weight:800;">Orange · 80 %</button><button type="button" data-weather-test="red" style="padding:8px;border:0;border-radius:5px;background:#e32020;color:#fff;font-weight:800;">Rot · 90 %</button><button type="button" data-weather-test="pulse" style="padding:8px;border:1px solid #777;border-radius:5px;background:#292929;color:#fff;font-weight:800;">Blinken · &lt; 60 Min</button><button type="button" data-weather-sound="orange" style="padding:8px;border:1px solid #777;border-radius:5px;background:#292929;color:#fff;font-weight:800;">🔊 Orange + Vibration</button><button type="button" data-weather-sound="red" style="padding:8px;border:1px solid #777;border-radius:5px;background:#292929;color:#fff;font-weight:800;">🚨 Rot + Vibration</button></div>`;
      modalBody.insertBefore(box,modalBody.firstChild);
      box.querySelectorAll('[data-weather-test]').forEach(btn=>btn.addEventListener('click',function(){const kind=btn.getAttribute('data-weather-test');if(kind==='pulse')testVisual('yellow',true);else testVisual(kind,false);}));
      box.querySelectorAll('[data-weather-sound]').forEach(btn=>btn.addEventListener('click',function(){beep(btn.getAttribute('data-weather-sound'));}));
      return true;
    }

    const observer=new MutationObserver(syncPulseAnd90Fix), source=sourceWidget(), info=infoText();
    if(source)observer.observe(source,{attributes:true,childList:true,subtree:true,characterData:true});
    if(info)observer.observe(info,{childList:true,subtree:true,characterData:true});
    let tries=0; const installer=setInterval(function(){tries++;syncPulseAnd90Fix();if(installControls()||tries>30)clearInterval(installer);},250);
    syncPulseAnd90Fix();
  });
})();
