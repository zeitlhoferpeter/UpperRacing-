(function(){
  const frame = document.getElementById('previewFrame');
  if (!frame) return;

  frame.addEventListener('load', function(){
    const w = frame.contentWindow;
    const d = frame.contentDocument;
    if (!w || !d) return;

    let testTimer = null;

    function sourceWidget(){ return d.getElementById('weather-header-widget'); }
    function visibleWidget(){ return d.querySelector('.preview-weather-card'); }
    function infoText(){ return d.getElementById('weather-info-text'); }

    function syncPulseAnd90Fix(){
      const source = sourceWidget();
      const visible = visibleWidget();
      const info = infoText();
      if (!source) return;

      const text = info ? String(info.textContent || '') : '';
      const match = text.match(/Heute:\s*(\d+)\s*%/i);
      const today = match ? Number(match[1]) : NaN;

      // In der Preview gilt Rot bereits ab exakt 90 %.
      if (Number.isFinite(today) && today >= 90 && source.classList.contains('alert-orange')) {
        source.classList.remove('alert-orange');
        source.classList.add('alert-red');
      }

      if (visible) {
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
      el.classList.remove('alert-yellow','alert-orange','alert-red','weather-pulse');
      classes.forEach(c => el.classList.add(c));
    }

    function testVisual(level, pulse){
      const source = sourceWidget();
      const visible = visibleWidget();
      if (!source) return;

      if (testTimer) clearTimeout(testTimer);
      const oldSource = rememberState(source);
      const oldVisible = rememberState(visible);

      [source, visible].forEach(el => {
        if (!el) return;
        el.classList.remove('alert-yellow','alert-orange','alert-red','weather-pulse');
        if (level) el.classList.add('alert-' + level);
        if (pulse) el.classList.add('weather-pulse');
      });

      const modal = d.getElementById('weather-modal');
      if (modal) modal.classList.remove('active');

      testTimer = setTimeout(function(){
        restoreState(source, oldSource);
        restoreState(visible, oldVisible);
        syncPulseAnd90Fix();
      }, 7000);
    }

    function beep(kind){
      try {
        const AudioCtx = w.AudioContext || w.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const one = function(delay, freq, type, volume, duration){
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = type;
          osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
          gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + duration);
        };
        if (kind === 'orange') {
          one(0, 523.25, 'sine', 0.07, 0.35);
        } else {
          one(0, 880, 'square', 0.12, 0.2);
          one(0.25, 987.77, 'square', 0.12, 0.2);
          one(0.5, 880, 'square', 0.12, 0.2);
        }
      } catch(e) {
        console.warn('[Preview Wettertest] Audio:', e);
      }
    }

    function installControls(){
      const modalBody = d.querySelector('#weather-modal .weather-modal-body');
      if (!modalBody || d.getElementById('previewWeatherWarningTest')) return false;

      const box = d.createElement('div');
      box.id = 'previewWeatherWarningTest';
      box.style.cssText = 'background:#171717;border:1px dashed #666;border-radius:8px;padding:10px 12px;margin:0 0 15px;color:#fff;';
      box.innerHTML = `
        <div style="font-weight:900;color:#ffd400;margin-bottom:5px;">🧪 Warnung testen – nur Testversion</div>
        <div style="font-size:11px;color:#aaa;line-height:1.35;margin-bottom:9px;">Die Farbstufen und das Blinken werden 7 Sekunden simuliert. Die echten Wetterdaten werden dabei nicht verändert.</div>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;">
          <button type="button" data-weather-test="yellow" style="padding:8px;border:0;border-radius:5px;background:#ffd400;color:#111;font-weight:800;">Gelb · 50 %</button>
          <button type="button" data-weather-test="orange" style="padding:8px;border:0;border-radius:5px;background:#ff8c00;color:#111;font-weight:800;">Orange · 80 %</button>
          <button type="button" data-weather-test="red" style="padding:8px;border:0;border-radius:5px;background:#e32020;color:#fff;font-weight:800;">Rot · 90 %</button>
          <button type="button" data-weather-test="pulse" style="padding:8px;border:1px solid #777;border-radius:5px;background:#292929;color:#fff;font-weight:800;">Blinken · &lt; 60 Min</button>
          <button type="button" data-weather-sound="orange" style="padding:8px;border:1px solid #777;border-radius:5px;background:#292929;color:#fff;font-weight:800;">🔊 Orange-Ton</button>
          <button type="button" data-weather-sound="red" style="padding:8px;border:1px solid #777;border-radius:5px;background:#292929;color:#fff;font-weight:800;">🚨 Rot-Ton</button>
        </div>`;

      modalBody.insertBefore(box, modalBody.firstChild);

      box.querySelectorAll('[data-weather-test]').forEach(btn => {
        btn.addEventListener('click', function(){
          const kind = btn.getAttribute('data-weather-test');
          if (kind === 'pulse') testVisual('yellow', true);
          else testVisual(kind, false);
        });
      });
      box.querySelectorAll('[data-weather-sound]').forEach(btn => {
        btn.addEventListener('click', function(){ beep(btn.getAttribute('data-weather-sound')); });
      });
      return true;
    }

    const observer = new MutationObserver(syncPulseAnd90Fix);
    const source = sourceWidget();
    if (source) observer.observe(source, {attributes:true, childList:true, subtree:true, characterData:true});
    const info = infoText();
    if (info) observer.observe(info, {childList:true, subtree:true, characterData:true});

    let tries = 0;
    const installer = setInterval(function(){
      tries++;
      syncPulseAnd90Fix();
      if (installControls() || tries > 30) clearInterval(installer);
    }, 250);

    syncPulseAnd90Fix();
  });
})();
