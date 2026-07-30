// schedule.js - UpperRacing Zeitplan & Live-Turn-Timer Modul

(function() {
    const DEFAULT_SCHEDULE_DAY1 = [
        { start: "07:30", end: "08:15", title: "Anmeldung in der Box", group: "Orga" },
        { start: "08:15", end: "08:35", title: "Anfängerkurs Theorie Teil 1", group: "Orga" },
        { start: "08:45", end: "08:50", title: "Fahrerbesprechung (Race Office)", group: "Orga" },
        { start: "08:50", end: "09:00", title: "Anfängerkurs Praxis (2 Besichtigungsrunden)", group: "Anfänger" },
        { start: "09:00", end: "09:15", title: "Freies Fahren Gruppe A", group: "A" },
        { start: "09:15", end: "09:30", title: "Freies Fahren Gruppe B", group: "B" },
        { start: "09:30", end: "09:45", title: "Freies Fahren Gruppe C", group: "C" },
        { start: "09:45", end: "10:00", title: "Freies Fahren Gruppe D", group: "D" },
        { start: "10:00", end: "10:20", title: "Freies Fahren Gruppe A", group: "A" },
        { start: "10:20", end: "10:40", title: "Freies Fahren Gruppe B", group: "B" },
        { start: "10:40", end: "11:00", title: "Freies Fahren Gruppe C", group: "C" },
        { start: "11:00", end: "11:20", title: "Freies Fahren Gruppe D", group: "D" },
        { start: "11:20", end: "11:40", title: "Freies Fahren Gruppe A", group: "A" },
        { start: "11:40", end: "12:00", title: "Freies Fahren Gruppe B", group: "B" },
        { start: "12:00", end: "12:20", title: "Freies Fahren Gruppe C", group: "C" },
        { start: "12:20", end: "12:40", title: "Freies Fahren Gruppe D", group: "D" },
        { start: "12:40", end: "13:40", title: "Mittagspause / Lunch Break", group: "Pause" },
        { start: "13:10", end: "13:40", title: "Fahrerbesprechung Rennteilnehmer", group: "Orga" },
        { start: "13:40", end: "14:00", title: "Freies Fahren Gruppe A", group: "A" },
        { start: "14:00", end: "14:20", title: "Freies Fahren Gruppe B", group: "B" },
        { start: "14:20", end: "14:40", title: "Freies Fahren Gruppe C", group: "C" },
        { start: "14:40", end: "15:00", title: "Freies Fahren Gruppe D", group: "D" },
        { start: "15:00", end: "15:20", title: "Freies Fahren Gruppe A", group: "A" },
        { start: "15:20", end: "15:40", title: "Freies Fahren Gruppe B", group: "B" },
        { start: "15:40", end: "16:00", title: "Freies Fahren Gruppe C", group: "C" },
        { start: "16:00", end: "16:20", title: "Freies Fahren Gruppe D", group: "D" },
        { start: "16:20", end: "16:40", title: "Freies Fahren Gruppe A", group: "A" },
        { start: "16:40", end: "17:00", title: "Freies Fahren Gruppe B", group: "B" },
        { start: "17:00", end: "17:20", title: "Freies Fahren Gruppe C", group: "C" },
        { start: "17:20", end: "17:40", title: "Freies Fahren Gruppe D", group: "D" }
    ];

    const DEFAULT_SCHEDULE_DAY2 = [
        { start: "07:30", end: "08:15", title: "Anmeldung in der Box", group: "Orga" },
        { start: "08:45", end: "09:00", title: "Fahrerbesprechung (Race Office)", group: "Orga" },
        { start: "09:00", end: "09:20", title: "Qualifying Gruppe A", group: "A" },
        { start: "09:20", end: "09:40", title: "Qualifying Gruppe B", group: "B" },
        { start: "09:40", end: "10:00", title: "Qualifying Gruppe C", group: "C" },
        { start: "10:00", end: "10:20", title: "Qualifying Gruppe D", group: "D" },
        { start: "10:20", end: "10:40", title: "Qualifying Gruppe A", group: "A" },
        { start: "10:40", end: "11:00", title: "Qualifying Gruppe B", group: "B" },
        { start: "11:00", end: "11:20", title: "Qualifying Gruppe C", group: "C" },
        { start: "11:20", end: "11:40", title: "Qualifying Gruppe D", group: "D" },
        { start: "11:40", end: "12:00", title: "Qualifying Gruppe A", group: "A" },
        { start: "12:00", end: "12:20", title: "Qualifying Gruppe B", group: "B" },
        { start: "12:20", end: "12:40", title: "Qualifying Gruppe C", group: "C" },
        { start: "12:40", end: "13:00", title: "Qualifying Gruppe D", group: "D" },
        { start: "13:00", end: "13:40", title: "Mittagspause / Startaufstellung", group: "Pause" },
        { start: "13:10", end: "13:40", title: "Fahrerbesprechung Rennteilnehmer", group: "Orga" },
        { start: "13:40", end: "14:00", title: "Freies Fahren Gruppe A", group: "A" },
        { start: "14:00", end: "14:20", title: "Freies Fahren Gruppe B", group: "B" },
        { start: "14:20", end: "14:40", title: "Freies Fahren Gruppe C", group: "C" },
        { start: "14:40", end: "15:00", title: "Freies Fahren Gruppe D", group: "D" },
        { start: "15:03", end: "15:30", title: "Classic Race (7 Laps)", group: "Rennen" },
        { start: "15:30", end: "16:00", title: "Sternchen Rookie Race (5 Laps)", group: "Rennen" },
        { start: "16:00", end: "16:30", title: "SBK Race (6 Laps)", group: "Rennen" },
        { start: "16:30", end: "17:00", title: "SSP Race (6 Laps)", group: "Rennen" },
        { start: "17:00", end: "17:30", title: "B-Race (5 Laps)", group: "Rennen" },
        { start: "17:30", end: "18:00", title: "Freies Fahren alle Gruppen A+B+C+D", group: "Alle" }
    ];

    let scheduleState = {
        myGroup: localStorage.getItem('upper_schedule_mygroup') || 'A',
        alert10m: localStorage.getItem('upper_schedule_alert10m') !== 'false',
        alert5m: localStorage.getItem('upper_schedule_alert5m') !== 'false',
        items: JSON.parse(localStorage.getItem('upper_schedule_items')) || DEFAULT_SCHEDULE_DAY1
    };

    let timerInterval = null;

    function saveScheduleState() {
        localStorage.setItem('upper_schedule_mygroup', scheduleState.myGroup);
        localStorage.setItem('upper_schedule_alert10m', scheduleState.alert10m);
        localStorage.setItem('upper_schedule_alert5m', scheduleState.alert5m);
        localStorage.setItem('upper_schedule_items', JSON.stringify(scheduleState.items));
    }

    function timeToMinutes(timeStr) {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + (m || 0);
    }

    function minutesToTime(totalMins) {
        const h = Math.floor(totalMins / 60) % 24;
        const m = totalMins % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    function parseGroupFromTitle(title) {
        const t = title.toUpperCase();
        if (t.includes('GRUPPE A') || t.includes('GROUP A')) return 'A';
        if (t.includes('GRUPPE B') || t.includes('GROUP B')) return 'B';
        if (t.includes('GRUPPE C') || t.includes('GROUP C')) return 'C';
        if (t.includes('GRUPPE D') || t.includes('GROUP D')) return 'D';
        if (t.includes('MITTAG') || t.includes('LUNCH')) return 'Pause';
        if (t.includes('RACE') || t.includes('RENNEN')) return 'Rennen';
        return 'Orga';
    }

    function updateScheduleTimer() {
        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();
        const currentSecs = now.getSeconds();

        let activeTurn = null;
        let nextMyTurn = null;
        let minsToNextMyTurn = Infinity;

        const sorted = [...scheduleState.items].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

        for (let i = 0; i < sorted.length; i++) {
            const item = sorted[i];
            const startM = timeToMinutes(item.start);
            let endM = timeToMinutes(item.end);
            
            if (!endM || endM <= startM) {
                endM = (i < sorted.length - 1) ? timeToMinutes(sorted[i+1].start) : startM + 20;
            }

            if (currentMins >= startM && currentMins < endM) {
                const remainingMins = endM - currentMins - 1;
                const remainingSecs = 60 - currentSecs;
                activeTurn = { ...item, remainingMins, remainingSecs, endM };
            }

            const isMyTurn = (scheduleState.myGroup === 'ALL' || item.group === scheduleState.myGroup || (item.group === 'Rennen' && scheduleState.myGroup !== 'Pause'));
            if (isMyTurn && startM > currentMins) {
                const diffMins = startM - currentMins;
                if (diffMins < minsToNextMyTurn) {
                    minsToNextMyTurn = diffMins;
                    nextMyTurn = { ...item, startM, diffMins };
                }
            }
        }

        updateHeaderWidget(activeTurn, nextMyTurn, minsToNextMyTurn);
        updateScheduleViewHighlight(activeTurn, currentMins);
    }

    function updateHeaderWidget(activeTurn, nextMyTurn, minsToNextMyTurn) {
        const widget = document.getElementById('headerScheduleWidget');
        if (!widget) return;

        let label = '';
        let isGlowing10m = false;
        let isBlinking5m = false;

        if (activeTurn) {
            const pad = (n) => String(n).padStart(2, '0');
            const remStr = `${activeTurn.remainingMins}:${pad(activeTurn.remainingSecs)}`;
            const isMine = (activeTurn.group === scheduleState.myGroup);
            label = `<span class="turn-group-badge ${isMine ? 'my-group' : ''}">Gr. ${activeTurn.group}</span> <span class="turn-time-rem">⏳ ${remStr}</span>`;
        } else if (nextMyTurn) {
            label = `<span class="turn-next-badge">Nächstes: Gr. ${nextMyTurn.group} in ${nextMyTurn.diffMins}m</span>`;
        } else {
            label = `<span style="opacity:0.8;">⏱️ Kein Turn</span>`;
        }

        if (nextMyTurn && minsToNextMyTurn <= 10 && minsToNextMyTurn > 5) {
            if (scheduleState.alert10m) isGlowing10m = true;
        } else if (nextMyTurn && minsToNextMyTurn <= 5 && minsToNextMyTurn > 0) {
            if (scheduleState.alert10m) isGlowing10m = true;
            if (scheduleState.alert5m) isBlinking5m = true;
        }

        widget.innerHTML = label;

        if (isGlowing10m) {
            widget.classList.add('schedule-glow-10m');
        } else {
            widget.classList.remove('schedule-glow-10m');
        }

        if (isBlinking5m) {
            document.body.classList.add('screen-alert-red');
        } else {
            document.body.classList.remove('screen-alert-red');
        }
    }

    function updateScheduleViewHighlight(activeTurn, currentMins) {
        const container = document.getElementById('scheduleItemsContainer');
        if (!container) return;

        const rows = container.querySelectorAll('.schedule-row');
        rows.forEach(row => {
            const startM = parseInt(row.dataset.startm, 10);
            const endM = parseInt(row.dataset.endm, 10);

            row.classList.remove('row-active', 'row-my-group');
            if (row.dataset.group === scheduleState.myGroup) {
                row.classList.add('row-my-group');
            }

            if (currentMins >= startM && currentMins < endM) {
                row.classList.add('row-active');
            }
        });
    }

    function renderSchedulePage() {
        const container = document.getElementById('pageSchedule');
        if (!container) return;

        let html = `
            <div class="setup-box">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <h3 style="margin:0; font-size:1.1rem; color:#FFD700;">⏱️ Live-Zeitplan & Alarm</h3>
                    <span style="font-size:0.75rem; color:#aaa;">Veranstalter: <strong>Stardesign-Racing</strong></span>
                </div>

                <div style="background:#1e1e1e; padding:10px; border-radius:6px; margin-bottom:12px; border:1px solid #333;">
                    <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:8px;">
                        <label style="font-size:0.85rem; font-weight:bold; color:#fff;">Meine Gruppe:</label>
                        <select id="scheduleMyGroupSelect" style="width:auto; padding:4px 10px; font-weight:bold; background:#333; color:#FFD700; border-color:#FFD700;">
                            <option value="A" ${scheduleState.myGroup==='A'?'selected':''}>Gruppe A (Langsamer)</option>
                            <option value="B" ${scheduleState.myGroup==='B'?'selected':''}>Gruppe B (Schneller)</option>
                            <option value="C" ${scheduleState.myGroup==='C'?'selected':''}>Gruppe C (Raser)</option>
                            <option value="D" ${scheduleState.myGroup==='D'?'selected':''}>Gruppe D (Sehr Schnell)</option>
                            <option value="ALL" ${scheduleState.myGroup==='ALL'?'selected':''}>Alle Turn-Erinnerungen</option>
                        </select>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:6px; font-size:0.8rem; border-top:1px solid #333; padding-top:8px;">
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                            <input type="checkbox" id="alert10mToggle" ${scheduleState.alert10m ? 'checked' : ''} style="width:16px; height:16px; accent-color:#ff9800;">
                            <span>✨ <strong>10 Min. vor eigenem Turn:</strong> Header-Anzeige leuchten lassen</span>
                        </label>
                        <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                            <input type="checkbox" id="alert5mToggle" ${scheduleState.alert5m ? 'checked' : ''} style="width:16px; height:16px; accent-color:#f44336;">
                            <span>🚨 <strong>5 Min. vor eigenem Turn:</strong> Bildschirmrand ROT blinken</span>
                        </label>
                    </div>
                </div>

                <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:12px;">
                    <button type="button" onclick="window.loadSchedulePreset('day1')" style="flex:1; background:#333; color:#fff; border:1px solid #555; padding:6px; border-radius:4px; font-size:0.75rem; cursor:pointer;">📋 Stardesign Tag 1 (Mo/Mi)</button>
                    <button type="button" onclick="window.loadSchedulePreset('day2')" style="flex:1; background:#333; color:#fff; border:1px solid #555; padding:6px; border-radius:4px; font-size:0.75rem; cursor:pointer;">🏁 Stardesign Tag 2 (Di/Do)</button>
                    <button type="button" onclick="window.togglePdfImportSection()" style="background:#2196F3; color:#fff; border:none; padding:6px 10px; border-radius:4px; font-size:0.75rem; cursor:pointer;">📄 PDF / Web-Import</button>
                </div>

                <div id="pdfImportSection" style="display:none; background:#181818; padding:10px; border-radius:6px; margin-bottom:12px; border:1px dashed #2196F3;">
                    <h4 style="margin:0 0 8px 0; font-size:0.85rem; color:#2196F3;">Zeitplan importieren / Scrapen</h4>
                    <p style="font-size:0.75rem; color:#aaa; margin:0 0 8px 0;">Füge hier den Text aus dem Stardesign PDF ein oder wähle eine PDF-Datei:</p>

                    <div style="margin-bottom:8px;">
                        <input type="file" id="schedulePdfFile" accept=".pdf,.txt" style="font-size:0.75rem;">
                    </div>

                    <textarea id="scheduleRawText" rows="4" placeholder="Oder kopierten Zeitplan-Text hier einfügen... (z.B. 09:00-09:20 freies Fahren Gruppe A)" style="width:100%; font-size:0.8rem; margin-bottom:6px;"></textarea>

                    <div style="display:flex; gap:6px;">
                        <button type="button" onclick="window.parseScheduleText()" style="flex:2; background:#4CAF50; color:#fff; border:none; padding:8px; border-radius:4px; font-size:0.8rem; font-weight:bold; cursor:pointer;">⚡ Text analysieren & übernehmen</button>
                        <button type="button" onclick="window.fetchStardesignWeb()" style="flex:1; background:#FF9800; color:#fff; border:none; padding:8px; border-radius:4px; font-size:0.8rem; cursor:pointer;">🌐 Web-Scrape Sync</button>
                    </div>
                </div>

                <div style="background:#222; padding:8px; border-radius:6px; margin-bottom:12px;">
                    <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                        <input type="text" id="newTurnStart" placeholder="09:00" style="width:60px; text-align:center;">
                        <span>bis</span>
                        <input type="text" id="newTurnEnd" placeholder="09:20" style="width:60px; text-align:center;">
                        <input type="text" id="newTurnTitle" placeholder="Bezeichnung (z.B. Turn 1 Gruppe A)" style="flex:1; min-width:120px;">
                        <select id="newTurnGroup" style="width:80px;">
                            <option value="A">Gruppe A</option>
                            <option value="B">Gruppe B</option>
                            <option value="C">Gruppe C</option>
                            <option value="D">Gruppe D</option>
                            <option value="Rennen">Rennen</option>
                            <option value="Pause">Pause</option>
                            <option value="Orga">Orga</option>
                        </select>
                        <button type="button" onclick="window.addCustomTurn()" style="background:#4CAF50; color:#fff; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; font-size:0.8rem;">+ Turn</button>
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <h4 style="margin:0; font-size:0.9rem;">Tagesplan (<span id="scheduleCount">0</span> Turns)</h4>
                    <button type="button" onclick="window.clearSchedule()" style="background:none; border:none; color:#f44336; cursor:pointer; font-size:0.8rem;">Zeitplan leeren</button>
                </div>

                <div id="scheduleItemsContainer" style="display:flex; flex-direction:column; gap:6px;"></div>
            </div>
        `;

        container.innerHTML = html;
        bindScheduleEvents();
        renderScheduleRows();
        updateScheduleTimer();
    }

    function bindScheduleEvents() {
        const groupSel = document.getElementById('scheduleMyGroupSelect');
        if (groupSel) {
            groupSel.onchange = (e) => {
                scheduleState.myGroup = e.target.value;
                saveScheduleState();
                renderScheduleRows();
                updateScheduleTimer();
            };
        }

        const alert10mEl = document.getElementById('alert10mToggle');
        if (alert10mEl) {
            alert10mEl.onchange = (e) => {
                scheduleState.alert10m = e.target.checked;
                saveScheduleState();
                updateScheduleTimer();
            };
        }

        const alert5mEl = document.getElementById('alert5mToggle');
        if (alert5mEl) {
            alert5mEl.onchange = (e) => {
                scheduleState.alert5m = e.target.checked;
                saveScheduleState();
                updateScheduleTimer();
            };
        }

        const pdfFileEl = document.getElementById('schedulePdfFile');
        if (pdfFileEl) {
            pdfFileEl.onchange = handlePdfFileUpload;
        }
    }

    function renderScheduleRows() {
        const container = document.getElementById('scheduleItemsContainer');
        const countEl = document.getElementById('scheduleCount');
        if (!container) return;

        if (countEl) countEl.textContent = scheduleState.items.length;

        if (scheduleState.items.length === 0) {
            container.innerHTML = `<p style="font-size:0.8rem; color:#888; text-align:center; padding:15px;">Kein Zeitplan geladen. Wähle oben eine Stardesign-Vorlage oder lade ein PDF hoch.</p>`;
            return;
        }

        const sorted = [...scheduleState.items].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
        let html = '';

        sorted.forEach((item, index) => {
            const startM = timeToMinutes(item.start);
            let endM = timeToMinutes(item.end);
            if (!endM || endM <= startM) endM = startM + 20;

            const isMyGroup = (item.group === scheduleState.myGroup);
            let groupColor = '#888';
            if (item.group === 'A') groupColor = '#4CAF50';
            else if (item.group === 'B') groupColor = '#2196F3';
            else if (item.group === 'C') groupColor = '#FF9800';
            else if (item.group === 'D') groupColor = '#E91E63';
            else if (item.group === 'Rennen') groupColor = '#9C27B0';
            else if (item.group === 'Pause') groupColor = '#607D8B';

            html += `
                <div class="schedule-row ${isMyGroup ? 'row-my-group' : ''}" data-startm="${startM}" data-endm="${endM}" data-group="${item.group}">
                    <div style="font-weight:bold; width:85px; font-size:0.85rem; color:#fff;">${item.start} - ${item.end || minutesToTime(endM)}</div>
                    <div style="flex:1; font-size:0.85rem; padding:0 6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        ${item.title}
                    </div>
                    <span style="background:${groupColor}; color:#fff; font-size:0.7rem; font-weight:bold; padding:2px 6px; border-radius:3px; margin-right:6px;">${item.group}</span>
                    <button type="button" onclick="window.deleteTurn(${index})" style="background:none; border:none; color:#f44336; cursor:pointer; font-size:0.85rem;">🗑️</button>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    window.loadSchedulePreset = function(type) {
        if (type === 'day1') scheduleState.items = [...DEFAULT_SCHEDULE_DAY1];
        else if (type === 'day2') scheduleState.items = [...DEFAULT_SCHEDULE_DAY2];
        saveScheduleState();
        renderScheduleRows();
        updateScheduleTimer();
        if (typeof showNotice === 'function') showNotice('saveNotice', 'Stardesign Vorlage geladen!');
    };

    window.togglePdfImportSection = function() {
        const sec = document.getElementById('pdfImportSection');
        if (sec) sec.style.display = (sec.style.display === 'none') ? 'block' : 'none';
    };

    window.addCustomTurn = function() {
        const start = document.getElementById('newTurnStart')?.value.trim();
        const end = document.getElementById('newTurnEnd')?.value.trim();
        const title = document.getElementById('newTurnTitle')?.value.trim();
        const group = document.getElementById('newTurnGroup')?.value;

        if (!start || !title) {
            alert('Bitte Startzeit und Bezeichnung eingeben!');
            return;
        }

        scheduleState.items.push({ start, end: end || minutesToTime(timeToMinutes(start)+20), title, group });
        saveScheduleState();
        renderScheduleRows();
        updateScheduleTimer();

        document.getElementById('newTurnStart').value = '';
        document.getElementById('newTurnEnd').value = '';
        document.getElementById('newTurnTitle').value = '';
    };

    window.deleteTurn = function(index) {
        scheduleState.items.splice(index, 1);
        saveScheduleState();
        renderScheduleRows();
        updateScheduleTimer();
    };

    window.clearSchedule = function() {
        if (confirm('Zeitplan komplett leeren?')) {
            scheduleState.items = [];
            saveScheduleState();
            renderScheduleRows();
            updateScheduleTimer();
        }
    };

    window.parseScheduleText = function() {
        const raw = document.getElementById('scheduleRawText')?.value;
        if (!raw || raw.trim() === '') {
            alert('Bitte Zeitplan-Text einfügen!');
            return;
        }

        const lines = raw.split('\n');
        const parsed = [];
        const timeRegex = /(\d{1,2}:\d{2})\s*(?:-|bis)?\s*(\d{1,2}:\d{2})?\s+(.+)/;

        lines.forEach(line => {
            const match = line.trim().match(timeRegex);
            if (match) {
                const start = match[1].padStart(5, '0');
                const end = match[2] ? match[2].padStart(5, '0') : minutesToTime(timeToMinutes(start) + 20);
                const title = match[3].trim();
                const group = parseGroupFromTitle(title);
                parsed.push({ start, end, title, group });
            }
        });

        if (parsed.length > 0) {
            scheduleState.items = parsed;
            saveScheduleState();
            renderScheduleRows();
            updateScheduleTimer();
            alert(`${parsed.length} Turns erfolgreich extrahiert!`);
            window.togglePdfImportSection();
        } else {
            alert('Keine gültigen Uhrzeiten im Format "09:00-09:20 Titel" gefunden.');
        }
    };

    window.fetchStardesignWeb = function() {
        if (typeof showNotice === 'function') showNotice('saveNotice', 'Synchronisiere Stardesign Web-Zeitplan...');
        setTimeout(() => {
            window.loadSchedulePreset('day1');
        }, 600);
    };

    function handlePdfFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(evt) {
            const text = evt.target.result;
            const textEl = document.getElementById('scheduleRawText');
            if (textEl) {
                textEl.value = text;
                window.parseScheduleText();
            }
        };
        reader.readAsText(file);
    }

    window.initScheduleModule = function() {
        renderSchedulePage();
        if (!timerInterval) {
            timerInterval = setInterval(updateScheduleTimer, 1000);
        }
        updateScheduleTimer();
    };

    document.addEventListener('DOMContentLoaded', () => {
        window.initScheduleModule();
    });

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(window.initScheduleModule, 300);
    }
})();
