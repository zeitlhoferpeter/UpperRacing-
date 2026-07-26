/**
 * weather.js - Modulares Wetter- und Regenradar-System für die Trackday-App
 * Unterstützt exakt nur die Strecken aus dem App-Dropdown-Menü.
 */

(function() {
    // Exakte Koordinaten nur für die 5 Strecken im App-Dropdown
    const TRACK_COORDINATES = {
        "pannoniaring": { lat: 47.1625, lon: 16.7139, zoom: 9 },
        "brünn": { lat: 49.2019, lon: 16.5444, zoom: 9 },
        "slovakia ring": { lat: 48.0519, lon: 17.5508, zoom: 9 },
        "red bull ring": { lat: 47.2197, lon: 14.7647, zoom: 10 },
        "most": { lat: 50.5031, lon: 13.6331, zoom: 9 }
    };

    // Standard-Fallback (Pannoniaring)
    const DEFAULT_LOCATION = { lat: 47.1625, lon: 16.7139, zoom: 9 };

    let weatherState = {
        soundEnabled: localStorage.getItem('trackday_weather_sound') === 'true',
        lastAlertLevel: 'none'
    };

    // CSS per JS injizieren
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
        #weather-header-widget {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: rgba(255, 255, 255, 0.1);
            padding: 4px 10px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
            border: 1px solid rgba(255, 255, 255, 0.2);
            margin: 0 10px;
        }
        #weather-header-widget:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        #weather-header-widget.alert-yellow {
            background-color: rgba(255, 193, 7, 0.3);
            border-color: #ffc107;
            box-shadow: 0 0 10px rgba(255, 193, 7, 0.5);
        }
        #weather-header-widget.alert-red {
            background-color: rgba(220, 53, 69, 0.4);
            border-color: #dc3545;
            animation: pulse-red 1s infinite alternate;
        }
        @keyframes pulse-red {
            0% { box-shadow: 0 0 5px rgba(220, 53, 69, 0.5); }
            100% { box-shadow: 0 0 20px rgba(220, 53, 69, 0.9); }
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
            min-width: 80px;
            flex-shrink: 0;
            border: 1px solid #444;
        }
        .radar-container {
            width: 100%;
            height: 350px;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #444;
            background: #000;
        }
        .weather-settings-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #2c2c2c;
            padding: 10px 15px;
            border-radius: 8px;
            margin-bottom: 15px;
        }
    `;
    document.head.appendChild(styleTag);

    function playAudioAlert(level) {
        if (!weatherState.soundEnabled) return;
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            if (level === 'yellow') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
                gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.4);
            } else if (level === 'red') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(880, audioCtx.currentTime);
                osc.frequency.setValueAtTime(440, audioCtx.currentTime + 0.15);
                gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.35);
            }
        } catch (e) {
            console.log("Audio Error:", e);
        }
    }

    function getCurrentTrackName() {
        const trackSelect = document.getElementById('trackSelect');
        if (trackSelect && trackSelect.value) {
            return trackSelect.value;
        }
        return "Pannoniaring";
    }

    function getTrackCoordinates(trackName) {
        const cleanName = trackName.toLowerCase().trim();
        return TRACK_COORDINATES[cleanName] || DEFAULT_LOCATION;
    }

    function initWeatherWidget() {
        const headerContainer = document.querySelector('header') || document.querySelector('.header') || document.body;
        
        let widget = document.getElementById('weather-header-widget');
        if (!widget) {
            widget = document.createElement('div');
            widget.id = 'weather-header-widget';
            widget.title = 'Klicken für Wettervorhersage & Regenradar';
            widget.innerHTML = `<span id="weather-icon">⏳</span> <span id="weather-temp">--°C</span>`;
            widget.onclick = openWeatherModal;

            const trackSelect = document.getElementById('trackSelect');
            if (trackSelect && trackSelect.parentNode) {
                trackSelect.parentNode.insertBefore(widget, trackSelect.nextSibling);
            } else {
                headerContainer.appendChild(widget);
            }
        }

        if (!document.getElementById('weather-modal')) {
            const modal = document.createElement('div');
            modal.id = 'weather-modal';
            modal.innerHTML = `
                <div class="weather-modal-content">
                    <div class="weather-modal-header">
                        <h2 id="weather-modal-title" style="margin:0; font-size:18px;">Wetter & Regenradar</h2>
                        <button class="weather-close-btn" onclick="closeWeatherModal()">Schließen</button>
                    </div>
                    <div class="weather-modal-body">
                        <div class="weather-settings-bar">
                            <span>🔊 Akustische Regenwarnung beim App-Start:</span>
                            <label style="cursor:pointer; display:flex; align-items:center; gap:6px;">
                                <input type="checkbox" id="weather-sound-toggle" ${weatherState.soundEnabled ? 'checked' : ''} onchange="toggleWeatherSound(this)"> Aktiviert
                            </label>
                        </div>
                        <div class="weather-section">
                            <h3>Stündliche Vorhersage (nächste Stunden)</h3>
                            <div class="hourly-scroll" id="weather-hourly-container">
                                Lädt Wetterdaten...
                            </div>
                        </div>
                        <div class="weather-section">
                            <h3>Live Regenradar</h3>
                            <div class="radar-container" id="weather-radar-container"></div>
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

    function openWeatherModal() {
        const modal = document.getElementById('weather-modal');
        modal.classList.add('active');
        const trackName = getCurrentTrackName();
        document.getElementById('weather-modal-title').innerText = `Wetter & Radar für ${trackName}`;
        updateRadarView(trackName);
    }

    async function updateWeatherData() {
        const trackName = getCurrentTrackName();
        const coords = getTrackCoordinates(trackName);

        try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true&hourly=temperature_2m,precipitation_probability,weathercode&timezone=auto`;
            const response = await fetch(url);
            const data = await response.json();

            if (data && data.current_weather) {
                const temp = Math.round(data.current_weather.temperature);
                const code = data.current_weather.weathercode;
                
                let icon = "☀️";
                if (code >= 1 && code <= 3) icon = "⛅";
                else if (code >= 51 && code <= 67) icon = "🌧️";
                else if (code >= 71 && code <= 77) icon = "❄️";
                else if (code >= 95) icon = "⚡";

                document.getElementById('weather-icon').innerText = icon;
                document.getElementById('weather-temp').innerText = `${temp}°C`;

                const nowHourIndex = new Date().getHours();
                const rainProb1 = data.hourly.precipitation_probability[nowHourIndex] || 0;
                const rainProb2 = data.hourly.precipitation_probability[nowHourIndex + 1] || 0;
                const maxRainProb = Math.max(rainProb1, rainProb2);

                const widget = document.getElementById('weather-header-widget');
                widget.classList.remove('alert-yellow', 'alert-red');

                let currentLevel = 'none';
                if (maxRainProb >= 80) {
                    widget.classList.add('alert-red');
                    currentLevel = 'red';
                } else if (maxRainProb >= 50) {
                    widget.classList.add('alert-yellow');
                    currentLevel = 'yellow';
                }

                if (currentLevel !== 'none' && currentLevel !== weatherState.lastAlertLevel) {
                    playAudioAlert(currentLevel);
                }
                weatherState.lastAlertLevel = currentLevel;

                renderHourlyForecast(data.hourly, nowHourIndex);
            }
        } catch (e) {
            console.error("Wetter-Fehler:", e);
            document.getElementById('weather-temp').innerText = "Fehler";
        }
    }

    function renderHourlyForecast(hourly, startIndex) {
        const container = document.getElementById('weather-hourly-container');
        let html = '';
        for (let i = startIndex; i < startIndex + 12; i++) {
            if (!hourly.time[i]) break;
            const timeStr = new Date(hourly.time[i]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const temp = Math.round(hourly.temperature_2m[i]);
            const rain = hourly.precipitation_probability[i];
            
            let rainColor = '#4da6ff';
            if (rain >= 80) rainColor = '#dc3545';
            else if (rain >= 50) rainColor = '#ffc107';

            html += `
                <div class="hourly-card">
                    <div style="font-size:12px; color:#aaa;">${timeStr}</div>
                    <div style="font-size:16px; font-weight:bold; margin:5px 0;">${temp}°C</div>
                    <div style="font-size:12px; color:${rainColor}; font-weight:bold;">☔ ${rain}%</div>
                </div>
            `;
        }
        container.innerHTML = html;
    }

    function updateRadarView(trackName) {
        const coords = getTrackCoordinates(trackName);
        const radarContainer = document.getElementById('weather-radar-container');
        radarContainer.innerHTML = `
            <iframe src="https://www.rainviewer.com/map.html?loc=${coords.lat},${coords.lon},${coords.zoom}&oqa=true&layer=radar&smooth=1&sn=1" 
                    width="100%" 
                    height="100%" 
                    frameborder="0" 
                    style="border:0;" 
                    allowfullscreen>
            </iframe>
        `;
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
