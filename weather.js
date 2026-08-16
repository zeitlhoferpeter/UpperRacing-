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

    function parseApiLocalTime(value) {
        if (!value) return NaN;
        const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
        if (!m) return NaN;
        return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
    }

    function getDatePart(value) {
        return value ? String(value).slice(0, 10) : '';
    }

    function getHourPart(value) {
        const h = Number(String(value || '').slice(11, 13));
        return Number.isFinite(h) ? h : -1;
    }

    function findClosestIndex(times, targetTime) {
        if (!Array.isArray(times) || !times.length || !targetTime) return -1;
        const target = parseApiLocalTime(targetTime);
        if (!Number.isFinite(target)) return 0;
        let bestIndex = 0;
        let bestDiff = Infinity;
        for (let i = 0; i < times.length; i++) {
            const t = parseApiLocalTime(times[i]);
            if (!Number.isFinite(t)) continue;
            const diff = Math.abs(t - target);
            if (diff < bestDiff) {
                bestDiff = diff;
                bestIndex = i;
            }
        }
        return bestIndex;
    }

    function findFirstAtOrAfter(times, targetTime) {
        if (!Array.isArray(times) || !times.length || !targetTime) return -1;
        const target = parseApiLocalTime(targetTime);
        if (!Number.isFinite(target)) return 0;
        for (let i = 0; i < times.length; i++) {
            const t = parseApiLocalTime(times[i]);
            if (Number.isFinite(t) && t >= target) return i;
        }
        return times.length - 1;
    }

    function getWeatherIcon(code, isDay) {
        const c = Number(code);
        if (c === 0) return isDay === 0 ? '🌙' : '☀️';
        if (c === 1) return isDay === 0 ? '🌙' : '🌤️';
        if (c === 2) return '⛅';
        if (c === 3) return '☁️';
        if (c === 45 || c === 48) return '🌫️';
        if (c >= 51 && c <= 57) return '🌦️';
        if (c >= 61 && c <= 67) return '🌧️';
        if (c >= 71 && c <= 77) return '❄️';
        if (c >= 80 && c <= 82) return '🌦️';
        if (c === 85 || c === 86) return '🌨️';
        if (c >= 95 && c <= 99) return '⚡';
        return '☁️';
    }

    function playAudioAlert(level) {
        if (!weatherState.soundEnabled) return;
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (level === 'orange') {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
                gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.35);
            } else if (level === 'red') {
                const playBeep = (timeOffset, freq) => {
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(freq, audioCtx.currentTime + timeOffset);
                    gain.gain.setValueAtTime(0.12, audioCtx.currentTime + timeOffset);
                    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + timeOffset + 0.2);
                    osc.start(audioCtx.currentTime + timeOffset);
                    osc.stop(audioCtx.currentTime + timeOffset + 0.2);
                };
                playBeep(0, 880);
                playBeep(0.25, 987.77);
                playBeep(0.5, 880);
            }
        } catch (e) {
            console.log('Audio Error:', e);
        }
    }

    function updateActiveLocationByTrack() {
        const trackSelect = document.getElementById('trackSelect');
        const trackKey = trackSelect ? trackSelect.value : 'pannoniaring';
        const coords = TRACK_COORDINATES[trackKey] || TRACK_COORDINATES.pannoniaring;
        activeLocation = {
            lat: coords.lat,
            lon: coords.lon,
            zoom: coords.zoom,
            name: trackSelect && trackSelect.options[trackSelect.selectedIndex]
                ? trackSelect.options[trackSelect.selectedIndex].text
                : trackKey
        };
    }

    function updateActiveLocation(callback) {
        if (weatherState.gpsEnabled && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    activeLocation = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                        zoom: 12,
                        name: 'Dein Live-Standort (GPS)'
                    };
                    if (callback) callback();
                },
                () => {
                    updateActiveLocationByTrack();
                    if (callback) callback();
                },
                { timeout: 5000, maximumAge: 60000, enableHighAccuracy: true }
            );
        } else {
            updateActiveLocationByTrack();
            if (callback) callback();
        }
    }

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

    function initWeatherWidget() {
        const widget = document.getElementById('weather-header-widget');
        if (widget) widget.onclick = openWeatherModal;
        ensureWeatherModal();

        if (!weatherInitialized) {
            weatherInitialized = true;
            if (refreshInterval) clearInterval(refreshInterval);
            refreshInterval = setInterval(updateWeatherData, WEATHER_REFRESH_MS);
        }
        updateWeatherData();
    }

    window.closeWeatherModal = function() {
        const modal = document.getElementById('weather-modal');
        if (modal) modal.classList.remove('active');
    };

    window.toggleWeatherSound = function(checkbox) {
        weatherState.soundEnabled = checkbox.checked;
        localStorage.setItem('trackday_weather_sound', weatherState.soundEnabled);
    };

    window.toggleWeatherGPS = function(checkbox) {
        weatherState.gpsEnabled = checkbox.checked;
        localStorage.setItem('trackday_weather_gps', weatherState.gpsEnabled);
        weatherState.lastAlertLevel = 'none';
        updateWeatherData();
    };

    function openWeatherModal() {
        ensureWeatherModal();
        const modal = document.getElementById('weather-modal');
        if (!modal) return;
        modal.classList.add('active');

        const soundToggle = document.getElementById('weather-sound-toggle');
        if (soundToggle) soundToggle.checked = weatherState.soundEnabled;
        const gpsToggle = document.getElementById('weather-gps-toggle');
        if (gpsToggle) gpsToggle.checked = weatherState.gpsEnabled;

        // Beim Öffnen immer frisch laden, wenn der letzte Abruf älter als 2 Minuten ist.
        if (!lastWeatherUpdateAt || Date.now() - lastWeatherUpdateAt > 2 * 60 * 1000) {
            updateWeatherData();
        } else {
            renderModalContent();
        }
    }

    function renderModalContent() {
        const title = document.getElementById('weather-modal-title');
        if (title) title.innerText = `Wetter & Prognose für ${activeLocation.name}`;
        if (latestWeatherData) {
            renderMinutelyForecast(latestWeatherData.minutely_15, latestWeatherData.current?.time);
            renderHourlyForecast(latestWeatherData.hourly, latestWeatherData.current?.time);
        }
    }

    function getCurrentRainProbability(data) {
        const currentTime = data?.current?.time;
        const minutely = data?.minutely_15;
        if (minutely?.time?.length && minutely?.precipitation_probability?.length) {
            const idx = findClosestIndex(minutely.time, currentTime);
            const value = idx >= 0 ? minutely.precipitation_probability[idx] : null;
            if (value !== null && value !== undefined) return Number(value) || 0;
        }
        const hourly = data?.hourly;
        if (hourly?.time?.length && hourly?.precipitation_probability?.length) {
            const idx = findClosestIndex(hourly.time, currentTime);
            const value = idx >= 0 ? hourly.precipitation_probability[idx] : null;
            if (value !== null && value !== undefined) return Number(value) || 0;
        }
        return 0;
    }

    function getTodayRaceDayMax(data, currentRain) {
        const hourly = data?.hourly;
        const currentDate = getDatePart(data?.current?.time);
        if (!hourly?.time?.length || !hourly?.precipitation_probability?.length || !currentDate) return currentRain;

        let max = 0;
        let found = false;
        for (let i = 0; i < hourly.time.length; i++) {
            const time = hourly.time[i];
            if (getDatePart(time) !== currentDate) continue;
            const hour = getHourPart(time);
            if (hour < 5 || hour > 18) continue;
            const prob = hourly.precipitation_probability[i];
            if (prob === null || prob === undefined) continue;
            found = true;
            max = Math.max(max, Number(prob) || 0);
        }
        return found ? max : currentRain;
    }

    function getNextHourMax(data, fallback) {
        const minutely = data?.minutely_15;
        const currentTime = data?.current?.time;
        if (!minutely?.time?.length || !minutely?.precipitation_probability?.length || !currentTime) return fallback;

        const start = findFirstAtOrAfter(minutely.time, currentTime);
        if (start < 0) return fallback;
        const currentMs = parseApiLocalTime(currentTime);
        const endMs = currentMs + 60 * 60 * 1000;
        let max = 0;
        let found = false;
        for (let i = start; i < minutely.time.length; i++) {
            const t = parseApiLocalTime(minutely.time[i]);
            if (!Number.isFinite(t) || t > endMs) break;
            const prob = minutely.precipitation_probability[i];
            if (prob === null || prob === undefined) continue;
            found = true;
            max = Math.max(max, Number(prob) || 0);
        }
        return found ? max : fallback;
    }

    async function updateWeatherData() {
        updateActiveLocation(async () => {
            try {
                const params = new URLSearchParams({
                    latitude: String(activeLocation.lat),
                    longitude: String(activeLocation.lon),
                    current: 'temperature_2m,weather_code,precipitation,is_day',
                    hourly: 'temperature_2m,precipitation_probability,weather_code',
                    minutely_15: 'precipitation,precipitation_probability,weather_code',
                    timezone: 'auto',
                    forecast_days: '2'
                });
                const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const data = await response.json();
                if (!data || !data.current) throw new Error('Keine aktuellen Wetterdaten erhalten');

                latestWeatherData = data;
                lastWeatherUpdateAt = Date.now();

                const temp = Math.round(Number(data.current.temperature_2m));
                const icon = getWeatherIcon(data.current.weather_code, data.current.is_day);
                const currentRain = getCurrentRainProbability(data);
                const dayMaxRain = getTodayRaceDayMax(data, currentRain);
                const imminentRainMax = getNextHourMax(data, currentRain);

                const iconEl = document.getElementById('weather-icon');
                const tempEl = document.getElementById('weather-temp');
                const infoEl = document.getElementById('weather-info-text');
                if (iconEl) iconEl.innerText = icon;
                if (tempEl) tempEl.innerText = Number.isFinite(temp) ? `${temp}°C` : '--°C';
                if (infoEl) infoEl.innerText = `Jetzt: ☔ ${currentRain}% | Heute: ${dayMaxRain}%`;

                const widget = document.getElementById('weather-header-widget');
                if (widget) {
                    widget.classList.remove('alert-yellow', 'alert-orange', 'alert-red', 'weather-pulse');
                    if (dayMaxRain > 90) widget.classList.add('alert-red');
                    else if (dayMaxRain >= 80) widget.classList.add('alert-orange');
                    else if (dayMaxRain >= 50) widget.classList.add('alert-yellow');
                    if (imminentRainMax >= 50) widget.classList.add('weather-pulse');
                }

                let soundTargetLevel = 'none';
                if (imminentRainMax > 90) soundTargetLevel = 'red';
                else if (imminentRainMax >= 80) soundTargetLevel = 'orange';
                if (soundTargetLevel !== 'none' && soundTargetLevel !== weatherState.lastAlertLevel) {
                    playAudioAlert(soundTargetLevel);
                }
                weatherState.lastAlertLevel = soundTargetLevel;

                const modal = document.getElementById('weather-modal');
                if (modal && modal.classList.contains('active')) renderModalContent();
            } catch (e) {
                console.error('Wetter-Fehler:', e);
                const tempEl = document.getElementById('weather-temp');
                const infoEl = document.getElementById('weather-info-text');
                if (tempEl) tempEl.innerText = 'Fehler';
                if (infoEl) infoEl.innerText = 'Wetterdaten nicht verfügbar';
            }
        });
    }

    function renderMinutelyForecast(minutely, currentTime) {
        const container = document.getElementById('weather-minutely-container');
        if (!container) return;
        if (!minutely?.time?.length) {
            container.innerHTML = '<p style="font-size:12px; color:#888;">Keine 15-Minuten-Daten verfügbar.</p>';
            return;
        }

        const start = Math.max(0, findFirstAtOrAfter(minutely.time, currentTime));
        const end = Math.min(minutely.time.length, start + 12);
        let html = '';
        for (let i = start; i < end; i++) {
            const localTime = String(minutely.time[i]).slice(11, 16);
            const rain = minutely.precipitation_probability?.[i] ?? 0;
            const amount = Number(minutely.precipitation?.[i] ?? 0);
            let rainColor = '#4da6ff';
            if (rain > 90) rainColor = '#dc3545';
            else if (rain >= 80) rainColor = '#ff8c00';
            else if (rain >= 50) rainColor = '#ffc107';
            html += `
                <div class="hourly-card">
                    <div style="font-size:11px; color:#aaa;">${localTime}</div>
                    <div style="font-size:14px; font-weight:bold; margin:6px 0; color:${rainColor};">☔ ${rain}%</div>
                    <div style="font-size:10px; color:#888;">${amount.toFixed(1)} mm</div>
                </div>`;
        }
        container.innerHTML = html || '<p style="font-size:12px; color:#888;">Keine kommenden Kurzfristdaten verfügbar.</p>';
    }

    function renderHourlyForecast(hourly, currentTime) {
        const container = document.getElementById('weather-hourly-container');
        if (!container) return;
        if (!hourly?.time?.length) {
            container.innerHTML = '<p style="font-size:12px; color:#888;">Keine stündlichen Daten verfügbar.</p>';
            return;
        }

        const start = Math.max(0, findFirstAtOrAfter(hourly.time, currentTime));
        const end = Math.min(hourly.time.length, start + 12);
        let html = '';
        for (let i = start; i < end; i++) {
            const localTime = String(hourly.time[i]).slice(11, 16);
            const temp = Math.round(Number(hourly.temperature_2m?.[i]));
            const rain = hourly.precipitation_probability?.[i] ?? 0;
            const icon = getWeatherIcon(hourly.weather_code?.[i], 1);
            let rainColor = '#4da6ff';
            if (rain > 90) rainColor = '#dc3545';
            else if (rain >= 80) rainColor = '#ff8c00';
            else if (rain >= 50) rainColor = '#ffc107';
            html += `
                <div class="hourly-card">
                    <div style="font-size:12px; color:#aaa;">${localTime}</div>
                    <div style="font-size:18px; margin-top:4px;">${icon}</div>
                    <div style="font-size:15px; font-weight:bold; margin:2px 0 4px;">${Number.isFinite(temp) ? temp + '°C' : '--°C'}</div>
                    <div style="font-size:11px; color:${rainColor}; font-weight:bold;">☔ ${rain}%</div>
                </div>`;
        }
        container.innerHTML = html || '<p style="font-size:12px; color:#888;">Keine kommenden Stundendaten verfügbar.</p>';
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && (!lastWeatherUpdateAt || Date.now() - lastWeatherUpdateAt > 2 * 60 * 1000)) {
            updateWeatherData();
        }
    });

    document.addEventListener('DOMContentLoaded', () => {
        initWeatherWidget();
        const trackSelect = document.getElementById('trackSelect');
        if (trackSelect) {
            trackSelect.addEventListener('change', () => {
                weatherState.lastAlertLevel = 'none';
                updateWeatherData();
            });
        }
    });

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(initWeatherWidget, 500);
    }
})();
