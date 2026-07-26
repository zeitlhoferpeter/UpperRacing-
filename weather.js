/**
 * weather.js - Wetter mit statischem Tages-Max und blinkendem Alarm bei akutem Regen in < 60 Min
 */

(function() {
    const TRACK_COORDINATES = {
        "pannoniaring": { lat: 47.2845, lon: 16.9928, zoom: 10 },
        "slovakia": { lat: 48.0551, lon: 17.5514, zoom: 10 },
        "brünn": { lat: 49.2081, lon: 16.5417, zoom: 10 },
        "most": { lat: 50.5103, lon: 13.6192, zoom: 10 },
        "grobnik": { lat: 45.3812, lon: 14.5115, zoom: 10 }
    };

    let activeLocation = { lat: 47.2845, lon: 16.9928, zoom: 10, name: "Pannoniaring" };
    let weatherState = {
        soundEnabled: localStorage.getItem('trackday_weather_sound') === 'true',
        gpsEnabled: localStorage.getItem('trackday_weather_gps') === 'true',
        lastAlertLevel: 'none'
    };

    let latestWeatherData = null;

    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
        #weather-header-widget {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(255, 255, 255, 0.1);
            padding: 5px 12px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.2);
            white-space: nowrap;
        }
        #weather-header-widget:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        /* Statische Farben für das Tages-Maximum */
        #weather-header-widget.alert-yellow {
            background-color: rgba(255, 193, 7, 0.3);
            border-color: #ffc107;
        }
        #weather-header-widget.alert-orange {
            background-color: rgba(255, 140, 0, 0.35);
            border-color: #ff8c00;
        }
        #weather-header-widget.alert-red {
            background-color: rgba(220, 53, 69, 0.4);
            border-color: #dc3545;
        }
        /* Blink-Animation für akuten Regen in den nächsten 60 Minuten */
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
        #weather-modal.active {
            display: flex;
        }
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
        .weather-section {
            margin-bottom: 25px;
        }
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
        }
    `;
    document.head.appendChild(styleTag);

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
            console.log("Audio Error:", e);
        }
    }

    function updateActiveLocationByTrack() {
        const trackSelect = document.getElementById('trackSelect');
        const trackKey = trackSelect ? trackSelect.value : "pannoniaring";
        if (TRACK_COORDINATES[trackKey]) {
            activeLocation = {
                lat: TRACK_COORDINATES[trackKey].lat,
                lon: TRACK_COORDINATES[trackKey].lon,
                zoom: TRACK_COORDINATES[trackKey].zoom,
                name: trackSelect.options[trackSelect.selectedIndex] ? trackSelect.options[trackSelect.selectedIndex].text : trackKey
            };
        }
    }

    function updateActiveLocation(callback) {
        if (weatherState.gpsEnabled && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    activeLocation = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                        zoom: 10,
                        name: "Dein Live-Standort (GPS)"
                    };
                    if (callback) callback();
                },
                (error) => {
                    updateActiveLocationByTrack();
                    if (callback) callback();
                },
                { timeout: 5000, maximumAge: 60000 }
            );
        } else {
            updateActiveLocationByTrack();
            if (callback) callback();
        }
    }

    function initWeatherWidget() {
        const widget = document.getElementById('weather-header-widget');
        if (widget) {
            widget.onclick = openWeatherModal;
            if (!document.getElementById('weather-info-text')) {
                widget.innerHTML = `<span id="weather-icon">⏳</span> <span id="weather-temp">--°C</span> <span id="weather-info-text" style="font-size:11px; opacity:0.85;">Akt: --% | Tag: --%</span>`;
            }
        }

        if (!document.getElementById('weather-modal')) {
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
                                <span>🔊 Akustischer Alarm (nur bei akuter Gefahr in < 1 Std):</span>
                                <label style="cursor:pointer; display:flex; align-items:center; gap:6px;">
                                    <input type="checkbox" id="weather-sound-toggle" onchange="toggleWeatherSound(this)"> Aktiviert
                                </label>
                            </div>
                            <div class="weather-setting-row">
                                <span>📍 Live-GPS-Standort:</span>
                                <label style="cursor:pointer; display:flex; align-items:center; gap:6px;">
                                    <input type="checkbox" id="weather-gps-toggle" onchange="toggleWeatherGPS(this)"> Aktiviert
                                </label>
                            </div>
                        </div>
                        <div class="weather-section">
                            <h3>⏱️ Minutengenaue Kurzfrist-Prognose (15-Minuten-Takt)</h3>
                            <div class="hourly-scroll" id="weather-minutely-container">
                                Lädt Minutendaten...
                            </div>
                        </div>
                        <div class="weather-section">
                            <h3>Stündliche Vorhersage</h3>
                            <div class="hourly-scroll" id="weather-hourly-container">
                                Lädt stündliche Daten...
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        updateWeatherData();
    }

    window.closeWeatherModal = function() {
        document.getElementById('weather-modal').classList.remove('active');
    };

    window.toggleWeatherSound = function(checkbox) {
        weatherState.soundEnabled = checkbox.checked;
        localStorage.setItem('trackday_weather_sound', weatherState.soundEnabled);
    };

    window.toggleWeatherGPS = function(checkbox) {
        weatherState.gpsEnabled = checkbox.checked;
        localStorage.setItem('trackday_weather_gps', weatherState.gpsEnabled);
        updateWeatherData();
        if (document.getElementById('weather-modal').classList.contains('active')) {
            updateActiveLocation(() => {
                renderModalContent();
            });
        }
    };

    function openWeatherModal() {
        const modal = document.getElementById('weather-modal');
        modal.classList.add('active');

        const soundToggle = document.getElementById('weather-sound-toggle');
        if (soundToggle) soundToggle.checked = weatherState.soundEnabled;

        const gpsToggle = document.getElementById('weather-gps-toggle');
        if (gpsToggle) gpsToggle.checked = weatherState.gpsEnabled;

        updateActiveLocation(() => {
            renderModalContent();
        });
    }

    function renderModalContent() {
        document.getElementById('weather-modal-title').innerText = `Wetter & Prognose für ${activeLocation.name}`;
        if (latestWeatherData) {
            renderMinutelyForecast(latestWeatherData.minutely_15);
            renderHourlyForecast(latestWeatherData.hourly);
        }
    }

    async function updateWeatherData() {
        updateActiveLocation(async () => {
            try {
                const url = `https://api.open-meteo.com/v1/forecast?latitude=${activeLocation.lat}&longitude=${activeLocation.lon}&current_weather=true&hourly=temperature_2m,precipitation_probability,weathercode&minutely_15=precipitation,precipitation_probability&timezone=auto`;
                const response = await fetch(url);
                const data = await response.json();
                latestWeatherData = data;

                if (data && data.current_weather) {
                    const temp = Math.round(data.current_weather.temperature);
                    const code = data.current_weather.weathercode;
                    
                    let icon = "☀️";
                    if (code >= 1 && code <= 3) icon = "⛅";
                    else if (code >= 51 && code <= 67) icon = "🌧️";
                    else if (code >= 71 && code <= 77) icon = "❄️";
                    else if (code >= 95) icon = "⚡";

                    // 1. Aktueller Wert
                    let currentRain = 0;
                    if (data.minutely_15 && data.minutely_15.precipitation_probability && data.minutely_15.precipitation_probability.length > 0) {
                        currentRain = data.minutely_15.precipitation_probability.find(v => v !== null) || 0;
                    } else if (data.hourly && data.hourly.precipitation_probability) {
                        currentRain = data.hourly.precipitation_probability[new Date().getHours()] || 0;
                    }

                    // 2. Tages-Maximum (Zwischen 05:00 und 18:00 Uhr)
                    let dayMaxRain = 0;
                    if (data.hourly && data.hourly.time && data.hourly.precipitation_probability) {
                        for (let i = 0; i < data.hourly.time.length; i++) {
                            const dateObj = new Date(data.hourly.time[i]);
                            const hour = dateObj.getHours();
                            if (hour >= 5 && hour <= 18) {
                                const prob = data.hourly.precipitation_probability[i];
                                if (prob !== null && prob > dayMaxRain) {
                                    dayMaxRain = prob;
                                }
                            }
                        }
                    }
                    if (dayMaxRain === 0) dayMaxRain = currentRain;

                    // UI im Header aktualisieren
                    const iconEl = document.getElementById('weather-icon');
                    const tempEl = document.getElementById('weather-temp');
                    const infoEl = document.getElementById('weather-info-text');

                    if (iconEl) iconEl.innerText = icon;
                    if (tempEl) tempEl.innerText = `${temp}°C`;
                    if (infoEl) infoEl.innerText = `Akt: 💧 ${currentRain}% | Tag: ☔ ${dayMaxRain}%`;

                    // 3. VISUELLE WARNUNG: Grundfarbe basiert auf dem TAGES-MAXIMUM (leuchtet statisch)
                    const widget = document.getElementById('weather-header-widget');
                    if (widget) {
                        widget.classList.remove('alert-yellow', 'alert-orange', 'alert-red', 'weather-pulse');

                        if (dayMaxRain > 90) {
                            widget.classList.add('alert-red');
                        } else if (dayMaxRain >= 80 && dayMaxRain <= 90) {
                            widget.classList.add('alert-orange');
                        } else if (dayMaxRain >= 50 && dayMaxRain < 80) {
                            widget.classList.add('alert-yellow');
                        }
                    }

                    // 4. AKUTER REGEN IN DEN NÄCHSTEN 60 MINUTEN (Prüfung für Blinken & Ton)
                    let imminentRainMax = 0;
                    if (data.minutely_15 && data.minutely_15.precipitation_probability) {
                        const nextHourSlice = data.minutely_15.precipitation_probability.slice(0, 4); // Nächste 60 Min (4 x 15 Min)
                        imminentRainMax = Math.max(...nextHourSlice.filter(val => val !== null), 0);
                    } else {
                        imminentRainMax = currentRain;
                    }

                    // Wenn es akut (in < 60 Min) zu regnen droht (ab 50%), fängt das Widget an zu BLINKEN!
                    if (imminentRainMax >= 50 && widget) {
                        widget.classList.add('weather-pulse');
                    }

                    // Akustischer Alarm (nur bei Orange oder Rot in den nächsten 60 Min)
                    let soundTargetLevel = 'none';
                    if (imminentRainMax > 90) soundTargetLevel = 'red';
                    else if (imminentRainMax >= 80) soundTargetLevel = 'orange';

                    if (soundTargetLevel !== 'none' && soundTargetLevel !== weatherState.lastAlertLevel) {
                        playAudioAlert(soundTargetLevel);
                    }
                    weatherState.lastAlertLevel = soundTargetLevel;

                    if (document.getElementById('weather-modal').classList.contains('active')) {
                        renderModalContent();
                    }
                }
            } catch (e) {
                console.error("Wetter-Fehler:", e);
                const tempEl = document.getElementById('weather-temp');
                if (tempEl) tempEl.innerText = "Fehler";
            }
        });
    }

    function renderMinutelyForecast(minutely) {
        const container = document.getElementById('weather-minutely-container');
        if (!container) return;
        if (!minutely || !minutely.time || minutely.time.length === 0) {
            container.innerHTML = `<p style="font-size:12px; color:#888;">Keine Minutendaten verfügbar.</p>`;
            return;
        }

        let html = '';
        const limit = Math.min(minutely.time.length, 12);
        for (let i = 0; i < limit; i++) {
            const timeStr = new Date(minutely.time[i]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const rain = minutely.precipitation_probability[i] !== null ? minutely.precipitation_probability[i] : 0;
            
            let rainColor = '#4da6ff';
            if (rain > 90) rainColor = '#dc3545';
            else if (rain >= 80) rainColor = '#ff8c00';
            else if (rain >= 50) rainColor = '#ffc107';

            html += `
                <div class="hourly-card">
                    <div style="font-size:11px; color:#aaa;">${timeStr}</div>
                    <div style="font-size:14px; font-weight:bold; margin:6px 0; color:${rainColor};">☔ ${rain}%</div>
                    <div style="font-size:10px; color:#888;">15-Min</div>
                </div>
            `;
        }
        container.innerHTML = html;
    }

    function renderHourlyForecast(hourly) {
        const container = document.getElementById('weather-hourly-container');
        if (!container || !hourly) return;
        const startIndex = new Date().getHours();
        let html = '';
        for (let i = startIndex; i < startIndex + 12; i++) {
            if (!hourly.time[i]) break;
            const timeStr = new Date(hourly.time[i]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const temp = Math.round(hourly.temperature_2m[i]);
            const rain = hourly.precipitation_probability[i];
            
            let rainColor = '#4da6ff';
            if (rain > 90) rainColor = '#dc3545';
            else if (rain >= 80) rainColor = '#ff8c00';
            else if (rain >= 50) rainColor = '#ffc107';

            html += `
                <div class="hourly-card">
                    <div style="font-size:12px; color:#aaa;">${timeStr}</div>
                    <div style="font-size:15px; font-weight:bold; margin:4px 0;">${temp}°C</div>
                    <div style="font-size:11px; color:${rainColor}; font-weight:bold;">☔ ${rain}%</div>
                </div>
            `;
        }
        container.innerHTML = html;
    }

    document.addEventListener('DOMContentLoaded', () => {
        initWeatherWidget();
        const trackSelect = document.getElementById('trackSelect');
        if (trackSelect) {
            trackSelect.addEventListener('change', () => {
                updateWeatherData();
            });
        }
    });

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(initWeatherWidget, 500);
    }
})();
