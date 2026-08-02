// schedule.js - UpperRacing Zeitplan & Live-Turn-Timer Modul

(function() {
    let scheduleState = {
        myGroup: localStorage.getItem('upper_schedule_mygroup') || 'A',
        alert10m: localStorage.getItem('upper_schedule_alert10m') !== 'false',
        alert5m: localStorage.getItem('upper_schedule_alert5m') !== 'false',
        activeDay: localStorage.getItem('upper_schedule_activeday') || 'Tag 1',
        days: JSON.parse(localStorage.getItem('upper_schedule_days')) || {
            'Tag 1': []
        }
    };

    let timerInterval = null;

    function saveScheduleState() {
        localStorage.setItem('upper_schedule_mygroup', scheduleState.myGroup);
        localStorage.setItem('upper_schedule_alert10m', scheduleState.alert10m);
        localStorage.setItem('upper_schedule_alert5m', scheduleState.alert5m);
        localStorage.setItem('upper_schedule_activeday', scheduleState.activeDay);
        localStorage.setItem('upper_schedule_days', JSON.stringify(scheduleState.days));
    }

    function getCurrentItems() {
        if (!scheduleState.days[scheduleState.activeDay]) {
            const firstDay = Object.keys(scheduleState.days)[0];
            if (firstDay) scheduleState.activeDay = firstDay;
            else return [];
        }
        return scheduleState.days[scheduleState.activeDay] || [];
    }

    function timeToMinutes(timeStr) {
        if (!timeStr) return 0;
        const normalized = timeStr.replace('.', ':');
        const [h, m] = normalized.split(':').map(Number);
        return h * 60 + (m || 0);
    }

    function minutesToTime(totalMins) {
        const h = Math.floor(totalMins / 60) % 24;
        const m = totalMins % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    function processLineTitle(rawTitle) {
        let title = rawTitle.trim();
        
        if (title.includes('/')) {
            const parts = title.split('/');
            const dePart = parts.find(p => /anmeldung|fahrerbesprechung|anfängerkurs|theorie|praxis|gruppe|freies fahren|rennen|mittag|pause|lunch/i.test(p));
            title = dePart ? dePart.trim() : parts[0].trim();
        }

        const t = title.toUpperCase();

        if (t.includes('MITTAG') || t.includes('PAUSE') || t.includes('LUNCH') || t.includes('ESSEN')) {
            return { title: 'Mittagspause', group: 'Pause' };
        }

        if (t.includes('FREE PRACTICE') || t.includes('QUALIFYING') || (t.includes('BRIEFING') && !t.includes('FAHRERBESPRECHUNG')) || t.includes('RACE OFFICE')) {
            return null;
        }

        if (t.includes('ANMELDUNG')) return { title: 'Anmeldung in der Box', group: 'Orga' };
        if (t.includes('FAHRERBESPRECHUNG')) return { title: title, group: 'Orga' };

        if (t.includes('ANFÄNGERKURS THEORIE') || (t.includes('THEORIE') && !t.includes('PRAXIS'))) {
            return { title: 'Anfängerkurs Theorie', group: 'Anfänger' };
        }
        if (t.includes('ANFÄNGERKURS PRAXIS') || t.includes('PRAXIS')) {
            return { title: 'Anfängerkurs Praxis', group: 'Anfänger' };
        }

        if (t.includes('RENNEN') || t.includes('CLASSIC') || t.includes('ROOKIE') || t.includes('SBK') || t.includes('SSP') || t.includes('B-RACE')) {
            return { title: title, group: 'Rennen' };
        }

        if (t.includes('GRUPPE A') || t.includes('GR. A')) return { title: 'Freies Fahren Gruppe A', group: 'A' };
        if (t.includes('GRUPPE B') || t.includes('GR. B')) return { title: 'Freies Fahren Gruppe B', group: 'B' };
        if (t.includes('GRUPPE C') || t.includes('GR. C')) return { title: 'Freies Fahren Gruppe C', group: 'C' };
        if (t.includes('GRUPPE D') || t.includes('GR. D')) return { title: 'Freies Fahren Gruppe D', group: 'D' };

        return null;
    }

    function updateScheduleTimer() {
        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();
        const currentSecs = now.getSeconds();

        let activeTurn = null;
        let nextMyTurn = null;
        let minsToNextMyTurn = Infinity;

        const items = getCurrentItems();
        const sorted = [...items].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

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

        if (isGlowing10m) widget.classList.add('schedule-glow-10m');
        else widget.classList.remove('schedule-glow-10m');

        if (isBlinking5m) document.body.classList.add('screen-alert-red');
        else document.body.classList.remove('screen-alert-red');
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

        const dayKeys = Object.keys(scheduleState.days);
        let dayButtonsHtml = '';

        dayKeys.forEach(dayName => {
            const isActive = dayName === scheduleState.activeDay;
            dayButtonsHtml += `
                <button type="button" onclick="window.switchScheduleDay('${dayName}')" 
                    style="padding:6px 14px; border-radius:4px; font-weight:bold; font-size:0.8rem; cursor:pointer; 
                    border:${isActive ? '2px solid #FFD700' : '1px solid #444'}; 
                    background:${isActive ? '#FFD700' : '#222'}; 
                    color:${isActive ? '#000' : '#fff'};">
                    📅 ${dayName}
                </button>
            `;
        });

        let html = `
            <div class="setup-box">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <h3 style="margin:0; font-size:1.1rem; color:#FFD700;">⏱️ Live-Zeitplan & Alarm</h3>
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

                <!-- TAGES-UMSCHALTER -->
                <div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap; align-items:center;">
                    ${dayButtonsHtml}
                    <button type="button" onclick="window.togglePdfImportSection()" style="margin-left:auto; background:#2196F3; color:#fff; border:none; padding:6px 12px; border-radius:4px; font-size:0.75rem; cursor:pointer;">📄 PDF Importieren</button>
                </div>

                <div id="pdfImportSection" style="display:none; background:#181818; padding:10px; border-radius:6px; margin-bottom:12px; border:1px dashed #2196F3;">
                    <h4 style="margin:0 0 8px 0; font-size:0.85rem; color:#2196F3;">Zeitplan importieren</h4>
                    <p style="font-size:0.75rem; color:#aaa; margin:0 0 8px 0;">Wähle die Stardesign PDF-Datei aus:</p>

                    <div style="margin-bottom:8px;">
                        <input type="file" id="schedulePdfFile" accept=".pdf,.txt" style="font-size:0.75rem;">
                    </div>

                    <textarea id="scheduleRawText" rows="4" placeholder="Oder kopierten Zeitplan-Text hier einfügen..." style="width:100%; font-size:0.8rem; margin-bottom:6px;"></textarea>

                    <div style="display:flex; gap:6px;">
                        <button type="button" onclick="window.parseScheduleText()" style="flex:1; background:#4CAF50; color:#fff; border:none; padding:8px; border-radius:4px; font-size:0.8rem; font-weight:bold; cursor:pointer;">⚡ Text analysieren & übernehmen</button>
                    </div>
                </div>

                <div style="background:#222; padding:8px; border-radius:6px; margin-bottom:12px;">
                    <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                        <input type="text" id="newTurnStart" placeholder="09:00" style="width:60px; text-align:center;">
                        <span>bis</span>
                        <input type="text" id="newTurnEnd" placeholder="09:20" style="width:60px; text-align:center;">
                        <input type="text" id="newTurnTitle" placeholder="Bezeichnung (z.B. Turn 1 Gruppe A)" style="flex:1; min-width:120px;">
                        <select id="newTurnGroup" style="width:90px;">
                            <option value="A">Gruppe A</option>
                            <option value="B">Gruppe B</option>
                            <option value="C">Gruppe C</option>
                            <option value="D">Gruppe D</option>
                            <option value="Anfänger">Anfänger</option>
                            <option value="Rennen">Rennen</option>
                            <option value="Pause">Pause</option>
                            <option value="Orga">Orga</option>
                        </select>
                        <button type="button" onclick="window.addCustomTurn()" style="background:#4CAF50; color:#fff; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; font-size:0.8rem;">+ Turn</button>
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <h4 style="margin:0; font-size:0.9rem;">Tagesplan (${scheduleState.activeDay}): <span id="scheduleCount">0</span> Turns</h4>
                    <button type="button" onclick="window.clearSchedule()" style="background:none; border:none; color:#f44336; cursor:pointer; font-size:0.8rem;">Alle Tage leeren</button>
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

    window.switchScheduleDay = function(dayName) {
        scheduleState.activeDay = dayName;
        saveScheduleState();
        renderSchedulePage();
    };

    function renderScheduleRows() {
        const container = document.getElementById('scheduleItemsContainer');
        const countEl = document.getElementById('scheduleCount');
        if (!container) return;

        const currentItems = getCurrentItems();
        if (countEl) countEl.textContent = currentItems.length;

        if (currentItems.length === 0) {
            container.innerHTML = `<p style="font-size:0.8rem; color:#888; text-align:center; padding:15px;">Kein Zeitplan für ${scheduleState.activeDay} geladen. Bitte PDF importieren.</p>`;
            return;
        }

        const sorted = [...currentItems].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
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
            else if (item.group === 'Anfänger') groupColor = '#00BCD4';
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

        if (!scheduleState.days[scheduleState.activeDay]) {
            scheduleState.days[scheduleState.activeDay] = [];
        }

        scheduleState.days[scheduleState.activeDay].push({ start, end: end || minutesToTime(timeToMinutes(start)+20), title, group });
        saveScheduleState();
        renderScheduleRows();
        updateScheduleTimer();

        document.getElementById('newTurnStart').value = '';
        document.getElementById('newTurnEnd').value = '';
        document.getElementById('newTurnTitle').value = '';
    };

    window.deleteTurn = function(index) {
        if (scheduleState.days[scheduleState.activeDay]) {
            scheduleState.days[scheduleState.activeDay].splice(index, 1);
            saveScheduleState();
            renderScheduleRows();
            updateScheduleTimer();
        }
    };

    // Geändert: Löscht nun den Zeitplan über alle Tage hinweg
    window.clearSchedule = function() {
        if (confirm("Möchtest du den Zeitplan für ALLE Tage komplett leeren?")) {
            scheduleState.days = { 'Tag 1': [] };
            scheduleState.activeDay = 'Tag 1';
            saveScheduleState();
            renderSchedulePage();
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
        const parsedDays = {};
        
        let dayCounter = 1;
        let currentDayKey = "Tag 1";
        parsedDays[currentDayKey] = [];

        const dayRegex = /(?:^|\s)(TAG\s*\d+|DAY\s*\d+|MONTAG|DIENSTAG|MITTWOCH|DONNERSTAG|FREITAG|SAMSTAG|SONNTAG|--- PAGE \d+ ---)(?:\s|$)/i;
        const timeRegex = /(\d{1,2}[:.]\d{2})\s*(?:-|bis)?\s*(\d{1,2}[:.]\d{2})?\s+(.+)/;
        
        let lastStartMins = -1;
        let seenInDay = new Set(); 

        lines.forEach(line => {
            const cleanLine = line.trim();
            if (!cleanLine) return;

            const dayMatch = cleanLine.match(dayRegex);
            if (dayMatch) {
                let detectedStr = dayMatch[1].toUpperCase();
                if (detectedStr.includes('PAGE') || detectedStr.includes('TAG') || detectedStr.includes('DAY')) {
                    dayCounter = Object.keys(parsedDays).length + (parsedDays[currentDayKey].length > 0 ? 1 : 0);
                    currentDayKey = `Tag ${dayCounter}`;
                } else {
                    currentDayKey = detectedStr;
                }
                
                if (!parsedDays[currentDayKey]) {
                    parsedDays[currentDayKey] = [];
                }
                lastStartMins = -1;
                seenInDay.clear();
                return;
            }

            const match = cleanLine.match(timeRegex);
            if (match) {
                const start = match[1].replace('.', ':').padStart(5, '0');
                const end = match[2] ? match[2].replace('.', ':').padStart(5, '0') : minutesToTime(timeToMinutes(start) + 20);
                const rawTitle = match[3].trim();
                const startMins = timeToMinutes(start);

                if (lastStartMins > 0 && (lastStartMins - startMins) > 180) {
                    dayCounter++;
                    currentDayKey = `Tag ${dayCounter}`;
                    if (!parsedDays[currentDayKey]) parsedDays[currentDayKey] = [];
                    lastStartMins = -1;
                    seenInDay.clear();
                }

                const itemData = processLineTitle(rawTitle);
                if (itemData) {
                    const uniqKey = `${start}_${itemData.group}_${itemData.title}`;
                    if (seenInDay.has(uniqKey)) {
                        return;
                    }
                    seenInDay.add(uniqKey);

                    parsedDays[currentDayKey].push({
                        start,
                        end,
                        title: itemData.title,
                        group: itemData.group
                    });

                    lastStartMins = startMins;
                }
            }
        });

        const validDayKeys = Object.keys(parsedDays).filter(k => parsedDays[k].length > 0);

        if (validDayKeys.length > 0) {
            const cleanDaysObj = {};
            validDayKeys.forEach(k => cleanDaysObj[k] = parsedDays[k]);

            scheduleState.days = cleanDaysObj;
            scheduleState.activeDay = validDayKeys[0];
            saveScheduleState();
            renderSchedulePage();
            updateScheduleTimer();
            alert(`Zeitplan erfolgreich importiert! Erfasste Tage: ${validDayKeys.join(', ')}`);
            window.togglePdfImportSection();
        } else {
            alert('Keine passenden Turns oder Pausen gefunden. Bitte Datei prüfen.');
        }
    };

    function loadPdfJsLib() {
        return new Promise((resolve, reject) => {
            if (window.pdfjsLib) return resolve(window.pdfjsLib);

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = () => {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                resolve(window.pdfjsLib);
            };
            script.onerror = () => reject(new Error('PDF.js Bibliothek konnte nicht geladen werden.'));
            document.head.appendChild(script);
        });
    }

    async function handlePdfFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const textEl = document.getElementById('scheduleRawText');

        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            try {
                if (typeof showNotice === 'function') showNotice('saveNotice', 'Lese PDF-Datei aus...');
                
                const pdfjsLib = await loadPdfJsLib();
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                
                let fullText = '';
                
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    
                    // Korrekte Sortierung nach Y (von oben nach unten) und X (von links nach rechts)
                    const items = textContent.items.sort((a, b) => {
                        const yA = a.transform[5];
                        const yB = b.transform[5];
                        if (Math.abs(yA - yB) > 4) {
                            return yB - yA;
                        }
                        return a.transform[4] - b.transform[4];
                    });

                    let lastY = null;
                    let pageText = `\n--- PAGE ${i} ---\n`;
                    
                    items.forEach(item => {
                        const y = item.transform[5];
                        if (lastY !== null && Math.abs(y - lastY) > 4) {
                            pageText += '\n';
                        } else if (pageText.length > 0 && !pageText.endsWith('\n')) {
                            pageText += ' ';
                        }
                        pageText += item.str;
                        lastY = y;
                    });
                    
                    fullText += pageText + '\n';
                }

                if (textEl) {
                    textEl.value = fullText.trim();
                    window.parseScheduleText();
                }
            } catch (err) {
                console.error('PDF Parse Fehler:', err);
                alert('Fehler beim Lesen der PDF-Datei.');
            }
        } else {
            const reader = new FileReader();
            reader.onload = function(evt) {
                if (textEl) {
                    textEl.value = evt.target.result;
                    window.parseScheduleText();
                }
            };
            reader.readAsText(file);
        }
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
