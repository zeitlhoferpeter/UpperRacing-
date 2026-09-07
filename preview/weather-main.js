/**
 * weather.js - UpperRacing Wetter
 * Präzise Streckenpunkte, saubere Heute-/Jetzt-Zuordnung und automatische Aktualisierung.
 */

(function() {
    // Punkte bewusst innerhalb des Rennstreckenareals / nahe Fahrerlager gewählt.
    const TRACK_COORDINATES = {
        "pannoniaring": { lat: 47.30393, lon: 17.04803, zoom: 12 },
        "slovakia": { lat: 48.05511, lon: 17.56695, zoom: 12 },
        "brünn": { lat: 49.2030433, lon: 16.4454486, zoom: 12 },
        "most": { lat: 50.51867, lon: 13.60451, zoom: 12 },
        "grobnik": { lat: 45.38273, lon: 14.50847, zoom: 12 }
    };

    const WEATHER_REFRESH_MS = 5 * 60 * 1000;

    let activeLocation = {
        lat: TRACK_COORDINATES.pannoniaring.lat,
        lon: TRACK_COORDINATES.pannoniaring.lon,
        zoom: TRACK_COORDINATES.pannoniaring.zoom,
        name: "Pannoniaring"
    };

    let weatherState = {
        soundEnabled: localStorage.getItem('trackday_weather_sound') === 'true',
        gpsEnabled: localStorage.getItem('trackday_weather_gps') === 'true',
        lastAlertLevel: 'none'
    };

    let latestWeatherData = null;
    let refreshInterval = null;
    let weatherInitialized = false;
    let lastWeatherUpdateAt = 0;

    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
        #weather-header-widget {
            cursor: pointer;
            transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
        }
        #weather-header-widget:hover {
            border-color: #ffd400;
            background: linear-gradient(145deg, #202020, #131313);
        }
        #weather-header-widget.alert-yellow {
            background: linear-gradient(145deg, rgba(255, 212, 0, 0.20), #171500);
            border-color: #ffd400;
        }
        #weather-header-widget.alert-orange {
            background: linear-gradient(145deg, rgba(255, 140, 0, 0.24), #1b1000);
            border-color: #ff8c00;
        }
        #weather-header-widget.alert-red {
            background: linear-gradient(145deg, rgba(227, 32, 32, 0.25), #1d0808);
            border-color: #e32020;
        }
        .weather-pulse {
            animation: pulse-widget 0.8s infinite alternate;
        }
        @keyframes pulse-widget {
            0% { transform: scale(1); box-shadow: 0 0 4px rgba(255,255,255,0.2); }
            100% { transform: scale(1.03); box-shadow: 0 0 18px currentColor; }
        }
        #weather-modal {
            display: none;
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.85);
            z-index: 9999;
            justify-content: center;
            align-items: center;
            padding: 20px;
            box-sizing: border-box;
        }
        #weather-modal.active { display: flex; }
        .weather-modal-content {
            background: #1e1e1e;
            color: #fff;
            width: 100%;
            max-width: 800px;
            height: 90vh;
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .weather-modal-header {
            padding: 15px 20px;
            background: #2c2c2c;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #444;
        }
        .weather-modal-body {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
        }
        .weather-close-btn {
            background: #dc3545;
            color: white;
            border: none;
            padding: 8px 14px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: bold;
        }
        .weather-section { margin-bottom: 25px; }
        .weather-section h3 {
            margin-bottom: 10px;
            color: #4da6ff;
            border-bottom: 1px solid #444;
            padding-bottom: 5px;
        }
        .hourly-scroll {
            display: flex;
            gap: 12px;
            overflow-x: auto;
            padding-bottom: 10px;
        }
        .hourly-card {
            background: #2c2c2c;
            padding: 10px 15px;
            border-radius: 8px;
            text-align: center;
            min-width: 85px;
            flex-shrink: 0;
            border: 1px solid #444;
        }
        .weather-settings-bar {
            display: flex;
            flex-direction: column;
            background: #2c2c2c;
            padding: 12px 15px;
            border-radius: 8px;
            margin-bottom: 15px;
            gap: 10px;
        }
        .weather-setting-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
        }
        .weather-small-note {
            font-size: 11px;
            color: #999;
            margin-top: 6px;
            line-height: 1.35;
        }
    `;
    document.head.appendChild(styleTag);

    const style=document.createElement('style');
    style.id='weatherTrackdayMainStyles';
    style.textContent=`
      .ur-trackday-weather{margin-top:10px;background:#151515;border:1px solid #3a3a3a;border-radius:10px;padding:10px;color:#fff}
      .ur-trackday-weather .urw-title{font-size:.62rem;font-weight:950;letter-spacing:.7px;color:#9e9e9e;margin-bottom:7px}
      .ur-trackday-weather .urw-line{font-size:.78rem;font-weight:850;line-height:1.35;margin:3px 0}
      .ur-trackday-weather .urw-line strong{color:#fff}
      .ur-trackday-weather .urw-small{font-size:.6rem;color:#8e8e8e;margin-top:6px;line-height:1.3}
      .ur-trackday-weather .urw-radar{display:block;margin-top:9px;width:100%;box-sizing:border-box;text-align:center;text-decoration:none;background:#262626;color:#ffd400;border:1px solid #5b5200;border-radius:7px;padding:9px 8px;font-size:.72rem;font-weight:950}
      .ur-trackday-weather.urw-yellow{border-color:#8c7700;background:linear-gradient(145deg,#211f08,#15150f)}
      .ur-trackday-weather.urw-orange{border-color:#b86700;background:linear-gradient(145deg,#2b1908,#17120e)}
      .ur-trackday-weather.urw-red{border-color:#b52f21;background:linear-gradient(145deg,#2e0e0b,#17100f);box-shadow:0 0 14px rgba(255,55,35,.16)}
    `;
    document.head.appendChild(style);

    function ensureWeatherModal() {
        if (document.getElementById('weather-modal')) return;
        const modal = document.createElement('div');
        modal.id = 'weather-modal';
        modal.innerHTML = `
            <div class="weather-modal-content">
                <div class="weather-modal-header">
                    <h2 id="weather-modal-title" style="margin:0; font-size:18px;">Wetter & Prognose</h2>
                    <button class="weather-close-btn" onclick="closeWeatherModal()">Schließen</button>
                </div>
                <div class="weather-modal-body">
                    <div class="weather-settings-bar">
                        <div class="weather-setting-row">
                            <span>🔊 Akustischer Alarm (nur bei hoher Regengefahr in &lt; 1 Std):</span>
                            <label style="cursor:pointer; display:flex; align-items:center; gap:6px;">
                                <input type="checkbox" id="weather-sound-toggle" onchange="toggleWeatherSound(this)"> Aktiviert
                            </label>
                        </div>
                        <div class="weather-setting-row">
                            <span>📍 Live-GPS statt ausgewählter Rennstrecke:</span>
                            <label style="cursor:pointer; display:flex; align-items:center; gap:6px;">
                                <input type="checkbox" id="weather-gps-toggle" onchange="toggleWeatherGPS(this)"> Aktiviert
                            </label>
                        </div>
                        <div class="weather-small-note">Die Prozentwerte zeigen die Niederschlagswahrscheinlichkeit. Ohne Live-GPS wird immer der Punkt direkt im Areal der ausgewählten Rennstrecke verwendet.</div>
                    </div>
                    <div class="weather-section">
                        <h3>⏱️ Kurzfrist-Prognose (15-Minuten-Takt)</h3>
                        <div class="hourly-scroll" id="weather-minutely-container">Lädt Kurzfristdaten...</div>
                    </div>
                    <div class="weather-section">
                        <h3>Stündliche Vorhersage</h3>
                        <div class="hourly-scroll" id="weather-hourly-container">Lädt stündliche Daten...</div>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(modal);
    }

    const HOUR = 60 * 60 * 1000;
    const QUARTER = 15 * 60 * 1000;
    let requestId = 0, controller = null, pending = null, pendingKey = '';
    let dataKey = '', audioContext = null, audioUnlocked = false;

    function num(value) {
        if (value === null || value === undefined || value === '') return null;
        const n = Number(value);
        return Number.isFinite(n) ? n : null;
    }
    function probability(value) {
        const n = num(value);
        return n !== null && n >= 0 && n <= 100 ? n : null;
    }
    function parseTime(value) {
        const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
        return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : NaN;
    }
    // Compare the API's local clock with the same clock, never the device timezone.
    function localNow(data) { return Date.now() + (num(data.utc_offset_seconds) || 0) * 1000; }
    function contextKey() {
        return (document.getElementById('trackSelect')?.value || 'pannoniaring') + ':' + weatherState.gpsEnabled;
    }
    function fallbackLocation() {
        const select = document.getElementById('trackSelect');
        const key = select?.value || 'pannoniaring';
        return { ...(TRACK_COORDINATES[key] || TRACK_COORDINATES.pannoniaring), name: select?.selectedOptions[0]?.textContent || key };
    }
    function resolveLocation() {
        const fallback = fallbackLocation();
        if (!weatherState.gpsEnabled || !navigator.geolocation) return Promise.resolve(fallback);
        return new Promise(resolve => {
            let settled = false;
            const finish = loc => { if (settled) return; settled = true; clearTimeout(timer); resolve(loc); };
            const timer = setTimeout(() => finish(fallback), 5500);
            try {
                navigator.geolocation.getCurrentPosition(
                    pos => finish({lat: pos.coords.latitude, lon: pos.coords.longitude, zoom: 12, name: 'Dein Live-Standort (GPS)'}),
                    () => finish(fallback), {timeout: 5000, maximumAge: 60000, enableHighAccuracy: true});
            } catch (_) { finish(fallback); }
        });
    }
    function level(value) { return value > 90 ? 'red' : value >= 80 ? 'orange' : value >= 50 ? 'yellow' : 'none'; }
    function text(id, value) {
        const el = document.getElementById(id);
        if (el && el.textContent !== value) el.textContent = value;
    }
    function setClass(el, name, enabled) {
        if (el && el.classList.contains(name) !== !!enabled) el.classList.toggle(name, !!enabled);
    }
    function setHeaderLevel(value, pulse) {
        const el = document.getElementById('weather-header-widget');
        const color = level(value);
        ['yellow', 'orange', 'red'].forEach(c => setClass(el, 'alert-' + c, color === c));
        setClass(el, 'weather-pulse', pulse);
        // The visible header is a clone created by the existing layout module.
        setClass(document.querySelector('.preview-weather-card'), 'weather-pulse', pulse);
    }
    function currentProbability(data) {
        const target = parseTime(data.current.time), series = [data.minutely_15, data.hourly];
        for (const s of series) {
            let best = null, distance = Infinity;
            (s?.time || []).forEach((t, i) => {
                const value = probability(s.precipitation_probability?.[i]), diff = Math.abs(parseTime(t) - target);
                if (value !== null && diff < distance && diff <= HOUR) { best = value; distance = diff; }
            });
            if (best !== null) return best;
        }
        return null;
    }
    function futureProbability(data, now) {
        const date = new Date(now).toISOString().slice(0, 10);
        const dayStart = parseTime(date + 'T05:00'), dayEnd = parseTime(date + 'T18:00');
        if (now >= dayEnd) return 0;
        let max = null;
        (data.hourly?.time || []).forEach((t, i) => {
            const end = parseTime(t), p = probability(data.hourly.precipitation_probability?.[i]);
            // Open-Meteo probability describes the PRECEDING hour. Exclude completed
            // intervals; 11:00 still covers the remainder of 10:15–11:00.
            if (p !== null && end > Math.max(now, dayStart) && end <= dayEnd) max = Math.max(max ?? 0, p);
        });
        return max;
    }
    function upcoming(data, now) {
        const s = data.minutely_15 || {}, result = [];
        (s.time || []).forEach((t, i) => {
            const end = parseTime(t), start = end - QUARTER;
            if (end <= now || start >= now + HOUR) return;
            const p = probability(s.precipitation_probability?.[i]), mm = num(s.precipitation?.[i]), code = num(s.weather_code?.[i]);
            const fraction = Math.max(0, Math.min(end, now + HOUR) - Math.max(start, now)) / QUARTER;
            result.push({start, end, p, mm: mm === null ? null : mm * fraction, code});
        });
        return result.sort((a, b) => a.end - b.end);
    }
    function nextHourProbability(data, now) {
        const values = upcoming(data, now).map(r => r.p).filter(p => p !== null);
        if (values.length) return Math.max(...values);
        // Keep a real hourly fallback when the fine-grained probability is absent.
        (data.hourly?.time || []).forEach((t, i) => {
            const end = parseTime(t), p = probability(data.hourly.precipitation_probability?.[i]);
            if (p !== null && end > now && end - HOUR < now + HOUR) values.push(p);
        });
        return values.length ? Math.max(...values) : null;
    }
    function summarizeDay(data, now) {
        const date = new Date(now).toISOString().slice(0, 10), h = data.hourly || {};
        const start = parseTime(date + 'T07:00'), end = parseTime(date + 'T18:00');
        let tmin = Infinity, tmax = -Infinity, maxProb = null, windows = [], current = null;
        (h.time || []).forEach((t, i) => {
            const ts = parseTime(t), temp = num(h.temperature_2m?.[i]);
            if (ts >= start && ts <= end && temp !== null) { tmin = Math.min(tmin, temp); tmax = Math.max(tmax, temp); }
            if (ts <= start || ts > end) return;
            const p = probability(h.precipitation_probability?.[i]), mm = num(h.precipitation?.[i]);
            if (p !== null) maxProb = Math.max(maxProb ?? 0, p);
            if ((p !== null && p >= 40) || (mm !== null && mm > 0.1)) {
                if (!current || current.end !== ts - HOUR) { current = {start: ts - HOUR, end: ts, score: 0}; windows.push(current); }
                current.end = ts; current.score = Math.max(current.score, (p || 0) + (mm || 0) * 25);
            } else current = null;
        });
        const best = windows.sort((a, b) => b.score - a.score || a.start - b.start)[0];
        const hour = ts => new Date(ts).toISOString().slice(11, 13);
        return {tmin: Number.isFinite(tmin) ? Math.round(tmin) : null, tmax: Number.isFinite(tmax) ? Math.round(tmax) : null,
            maxProb, critical: best ? hour(best.start) + '–' + hour(best.end) + ' Uhr' : maxProb === null ? 'keine ausreichenden Daten' : 'kein auffälliges Regenfenster'};
    }
    function summarize60(data, now) {
        const rows = upcoming(data, now), maxProb = nextHourProbability(data, now);
        const currentMm = num(data.current.precipitation), currentCode = num(data.current.weather_code);
        const wetCode = c => c !== null && ((c >= 51 && c <= 86) || c >= 95);
        const rainingNow = currentMm > 0.05 || wetCode(currentCode);
        const thunder = currentCode >= 95 || rows.some(r => r.code >= 95);
        const wet = rows.find(r => r.mm >= 0.1 || r.p >= 55 || wetCode(r.code));
        const knownAmounts = rows.filter(r => r.mm !== null), total = knownAmounts.reduce((sum, r) => sum + r.mm, 0);
        const fullCoverage = rows.length > 0 && rows[0].start <= now && rows[rows.length - 1].end >= now + HOUR &&
            rows.every((r, i) => r.mm !== null && (i === 0 || r.start === rows[i - 1].end));
        let color = 'ok', icon = '✅', message = fullCoverage ? 'Nächste 60 Min: trocken' : 'Nächste 60 Min: Daten unvollständig';
        if (!fullCoverage) icon = '⚠️';
        if (thunder) { color = 'red'; icon = '🔴'; message = rainingNow ? 'Gewitter/Regen aktuell' : 'Gewitter in den nächsten 60 Min möglich'; }
        else if (rainingNow) { color = 'red'; icon = '🔴'; message = 'Regen aktuell'; }
        else if (wet) {
            const away = Math.max(0, Math.round((wet.start - now) / 60000));
            // Preserve warning severity; precipitation volume must not invent an earlier arrival.
            color = away <= 15 || total >= 1.5 ? 'red' : away <= 30 || total >= 0.7 ? 'orange' : 'yellow';
            icon = color === 'red' ? '🔴' : color === 'orange' ? '🟠' : '🟡';
            message = away <= 15 ? 'Regen in <15 Min wahrscheinlich' : away <= 30 ? 'Regen in ca. 15–30 Min wahrscheinlich' : 'Regen in ca. 30–60 Min möglich';
        } else if (maxProb >= 45) { color = 'yellow'; icon = '🟡'; message = 'Schauer in der nächsten Stunde möglich'; }
        return {color, icon, message, maxProb, total: knownAmounts.length ? Math.round(total * 10) / 10 : null, fullCoverage};
    }
    function percent(value) { return value === null ? '–' : String(Math.round(value)); }
    function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

    function getWeatherIcon(code, isDay) {
        const c = num(code);
        if (c === null) return '–';
        if (c === 0) return isDay === 0 ? '🌙' : '☀️';
        if (c === 1) return isDay === 0 ? '🌙' : '🌤️';
        if (c === 2) return '⛅';
        if (c === 45 || c === 48) return '🌫️';
        if (c >= 51 && c <= 57) return '🌦️';
        if (c >= 61 && c <= 67) return '🌧️';
        if (c >= 71 && c <= 77) return '❄️';
        if (c >= 80 && c <= 82) return '🌦️';
        if (c === 85 || c === 86) return '🌨️';
        return c >= 95 ? '⚡' : '☁️';
    }
    async function unlockAudio() {
        if (!weatherState.soundEnabled) return;
        try {
            if (!audioContext || audioContext.state === 'closed') audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (audioContext.state === 'suspended') await audioContext.resume();
            audioUnlocked = audioContext.state === 'running';
        } catch (_) { audioUnlocked = false; }
    }
    function playAudioAlert(color) {
        if (!weatherState.soundEnabled || !audioUnlocked || audioContext?.state !== 'running') return false;
        const beep = (offset, freq, loudness, duration, type) => {
            const osc = audioContext.createOscillator(), gain = audioContext.createGain(), start = audioContext.currentTime + offset;
            osc.connect(gain); gain.connect(audioContext.destination); osc.type = type;
            osc.frequency.setValueAtTime(freq, start); gain.gain.setValueAtTime(loudness, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
            osc.onended = () => { osc.disconnect(); gain.disconnect(); };
            osc.start(start); osc.stop(start + duration);
        };
        try {
            if (color === 'orange') beep(0, 523.25, 0.06, 0.35, 'sine');
            else { beep(0, 880, 0.12, 0.2, 'square'); beep(0.25, 987.77, 0.12, 0.2, 'square'); beep(0.5, 880, 0.12, 0.2, 'square'); }
            return true;
        } catch (_) { return false; }
    }

    function ensureTrackdayBox() {
        if (document.getElementById('urTrackdayWeather')) return;
        const body = document.querySelector('#weather-modal .weather-modal-body');
        if (!body) return;
        const box = document.createElement('div'); box.id = 'urTrackdayWeather'; box.className = 'ur-trackday-weather';
        body.insertBefore(box, body.firstChild);
    }
    function renderTrackday(data, now) {
        ensureTrackdayBox();
        const box = document.getElementById('urTrackdayWeather'); if (!box) return;
        const day = summarizeDay(data, now), soon = summarize60(data, now);
        ['yellow', 'orange', 'red'].forEach(c => setClass(box, 'urw-' + c, soon.color === c));
        const temp = day.tmin === null ? '–' : day.tmin + '–' + day.tmax + ' °C';
        const radar = 'https://www.rainviewer.com/map.html?loc=' + encodeURIComponent(activeLocation.lat + ',' + activeLocation.lon + ',9');
        box.innerHTML = '<div class="urw-title">TRACKDAY-WETTER · 07–18 UHR</div>' +
            '<div class="urw-line">🌡️ <strong>' + temp + '</strong> · 🌧️ Tagesrisiko <strong>' + percent(day.maxProb) + ' %</strong></div>' +
            '<div class="urw-line">🕒 Kritisches Fenster: <strong>' + day.critical + '</strong></div>' +
            '<div class="urw-line">' + soon.icon + ' <strong>' + soon.message + '</strong></div>' +
            '<div class="urw-small">60-Min-Auswertung: max. ' + percent(soon.maxProb) + ' % · prognostiziert ca. ' + (soon.total ?? '–') + ' mm' +
            (soon.fullCoverage ? '' : ' · Kurzfristdaten unvollständig') + ' · Standort: ' + escapeHtml(activeLocation.name) + '</div>' +
            '<a class="urw-radar" href="' + radar + '" target="_blank" rel="noopener">📡 Regenradar öffnen ↗</a>';
    }
    function renderForecast(series, now, quarter) {
        const container = document.getElementById(quarter ? 'weather-minutely-container' : 'weather-hourly-container');
        if (!container) return;
        const rows = (series?.time || []).map((t, i) => ({t, i, ts: parseTime(t)})).filter(r => r.ts > now).slice(0, 12);
        container.innerHTML = rows.map(({t, i}) => {
            const p = probability(series.precipitation_probability?.[i]), temp = num(series.temperature_2m?.[i]), amount = num(series.precipitation?.[i]);
            const color = {red: '#dc3545', orange: '#ff8c00', yellow: '#ffc107', none: '#4da6ff'}[level(p)];
            const label = escapeHtml(t.slice(11, 16));
            return '<div class="hourly-card"><div style="font-size:11px;color:#aaa">' + label + '</div>' +
                (quarter ? '' : '<div style="font-size:18px;margin-top:4px">' + getWeatherIcon(series.weather_code?.[i], 1) + '</div><div style="font-size:15px;font-weight:bold">' + (temp === null ? '–' : Math.round(temp) + '°C') + '</div>') +
                '<div style="font-size:14px;font-weight:bold;margin:6px 0;color:' + color + '">☔ ' + percent(p) + '%</div>' +
                (quarter ? '<div style="font-size:10px;color:#888">' + (amount === null ? '–' : amount.toFixed(1)) + ' mm</div>' : '') + '</div>';
        }).join('') || '<p style="font-size:12px;color:#888">Keine kommenden ' + (quarter ? 'Kurzfristdaten' : 'Stundendaten') + ' verfügbar.</p>';
    }
    function renderWeather(allowSound) {
        if (!latestWeatherData || dataKey !== contextKey()) return;
        const data = latestWeatherData, now = localNow(data);
        const current = currentProbability(data), future = futureProbability(data, now), imminent = nextHourProbability(data, now);
        const temp = num(data.current.temperature_2m);
        text('weather-icon', getWeatherIcon(data.current.weather_code, data.current.is_day));
        text('weather-temp', temp === null ? '--°C' : Math.round(temp) + '°C');
        text('weather-info-text', 'Jetzt: ☔ ' + percent(current) + '% | Ab jetzt: ' + percent(future) + '%');
        setHeaderLevel(future, imminent !== null && imminent >= 50);
        text('weather-modal-title', 'Wetter & Prognose für ' + activeLocation.name);
        renderTrackday(data, now);
        renderForecast(data.minutely_15, now, true); renderForecast(data.hourly, now, false);
        const target = imminent > 90 ? 'red' : imminent >= 80 ? 'orange' : 'none';
        if (target === 'none') weatherState.lastAlertLevel = 'none';
        else if (allowSound && target !== weatherState.lastAlertLevel && playAudioAlert(target)) weatherState.lastAlertLevel = target;
    }
    function showUnavailable(loading) {
        latestWeatherData = null; lastWeatherUpdateAt = 0; dataKey = '';
        const message = loading ? 'Wetterdaten werden geladen …' : 'Wetterdaten nicht verfügbar';
        text('weather-icon', loading ? '⏳' : '⚠️'); text('weather-temp', '--°C'); text('weather-info-text', message);
        text('weather-modal-title', 'Wetter & Prognose'); setHeaderLevel(null, false);
        text('weather-minutely-container', message); text('weather-hourly-container', message);
        ensureTrackdayBox();
        const box = document.getElementById('urTrackdayWeather');
        ['yellow', 'orange', 'red'].forEach(c => setClass(box, 'urw-' + c, false));
        text('urTrackdayWeather', message);
    }
    function updateWeatherData(force) {
        const key = contextKey();
        if (pending && pendingKey === key) return pending;
        if (!force && dataKey === key && latestWeatherData && Date.now() - lastWeatherUpdateAt < 2 * 60 * 1000) {
            renderWeather(false); return Promise.resolve();
        }
        const id = ++requestId;
        if (controller) controller.abort();
        if (key !== dataKey) { weatherState.lastAlertLevel = 'none'; showUnavailable(true); }
        pendingKey = key;
        pending = (async () => {
            let timeout;
            try {
                const loc = await resolveLocation();
                if (id !== requestId) return;
                const abort = new AbortController(); controller = abort;
                timeout = setTimeout(() => abort.abort(), 10000);
                const params = new URLSearchParams({latitude: String(loc.lat), longitude: String(loc.lon), timezone: 'auto', forecast_days: '2',
                    current: 'temperature_2m,weather_code,precipitation,is_day',
                    hourly: 'temperature_2m,precipitation_probability,precipitation,weather_code',
                    minutely_15: 'precipitation,precipitation_probability,weather_code'});
                const response = await fetch('https://api.open-meteo.com/v1/forecast?' + params, {cache: 'no-store', signal: abort.signal});
                if (!response.ok) throw new Error('HTTP ' + response.status);
                const data = await response.json();
                if (id !== requestId || key !== contextKey()) return;
                if (!data?.current || !Number.isFinite(parseTime(data.current.time)) || num(data.utc_offset_seconds) === null) throw new Error('Ungültige Wetterdaten');
                if (Math.abs(localNow(data) - parseTime(data.current.time)) > 30 * 60 * 1000) throw new Error('Veraltete Wetterdaten');
                activeLocation = loc; latestWeatherData = data; dataKey = key; lastWeatherUpdateAt = Date.now();
                renderWeather(true);
            } catch (error) {
                if (id === requestId) { console.warn('[UpperRacing Wetter]', error); showUnavailable(false); }
            } finally {
                clearTimeout(timeout);
                if (id === requestId) { pending = null; pendingKey = ''; controller = null; }
            }
        })();
        return pending;
    }
    window.closeWeatherModal = () => setClass(document.getElementById('weather-modal'), 'active', false);
    window.openWeatherModal = function() {
        ensureWeatherModal(); ensureTrackdayBox();
        setClass(document.getElementById('weather-modal'), 'active', true);
        document.getElementById('weather-sound-toggle').checked = weatherState.soundEnabled;
        document.getElementById('weather-gps-toggle').checked = weatherState.gpsEnabled;
        unlockAudio().then(() => renderWeather(true)); updateWeatherData(false);
    };
    window.toggleWeatherSound = function(checkbox) {
        weatherState.soundEnabled = checkbox.checked; localStorage.setItem('trackday_weather_sound', checkbox.checked);
        weatherState.lastAlertLevel = 'none';
        if (checkbox.checked) unlockAudio().then(() => renderWeather(true));
    };
    window.toggleWeatherGPS = function(checkbox) {
        weatherState.gpsEnabled = checkbox.checked; localStorage.setItem('trackday_weather_gps', checkbox.checked);
        updateWeatherData(false);
    };
    function initWeatherWidget() {
        if (weatherInitialized) return;
        weatherInitialized = true; ensureWeatherModal(); ensureTrackdayBox();
        const widget = document.getElementById('weather-header-widget'); if (widget) widget.onclick = window.openWeatherModal;
        document.getElementById('trackSelect')?.addEventListener('change', () => updateWeatherData(false));
        refreshInterval = setInterval(() => updateWeatherData(true), WEATHER_REFRESH_MS);
        setInterval(() => {
            if (!latestWeatherData) return;
            if (Date.now() - lastWeatherUpdateAt > WEATHER_REFRESH_MS + 15000) showUnavailable(false);
            else renderWeather(false);
        }, 60000);
        updateWeatherData(true);
    }
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') updateWeatherData(false); });
    window.addEventListener('online', () => updateWeatherData(true));
    document.addEventListener('pointerdown', () => { if (!audioUnlocked) unlockAudio(); }, {passive: true});
    window.addEventListener('pagehide', () => { ++requestId; if (controller) controller.abort(); pending = null; });
    window.addEventListener('pageshow', e => { if (e.persisted) updateWeatherData(true); });
    // Outer-frame load handlers restore the selected track before this task runs.
    if (document.readyState === 'complete') setTimeout(initWeatherWidget, 0);
    else window.addEventListener('load', () => setTimeout(initWeatherWidget, 0), {once: true});
    window.upperWeatherMain = {refresh: () => updateWeatherData(true),
        logic: {num, probability, parseTime, localNow, level, futureProbability, nextHourProbability, summarizeDay, summarize60}};
})();
