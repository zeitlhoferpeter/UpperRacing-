// schedule.js - UpperRacing Zeitplan & Live-Turn-Timer Modul

(function() {
    // Der Zeitplan wird als Tage gespeichert. Beim PDF-Import entspricht
    // normalerweise jede PDF-Seite einem Tag, sofern im Text keine echten
    // Tagesüberschriften vorhanden sind.
    let initialDays = {};
    try {
        const savedDays = localStorage.getItem('upper_schedule_days');
        if (savedDays) {
            const parsed = JSON.parse(savedDays);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                initialDays = parsed;
            }
        }
    } catch (e) {
        console.warn('[Schedule] Fehler beim Lesen von upper_schedule_days:', e);
    }

    // Alte Standardstruktur nicht mehr erzwingen. Falls noch kein Plan vorhanden ist,
    // wird erst beim Öffnen der Zeitplanseite ein leerer Tag angelegt.
    if (!Object.keys(initialDays).length) {
        initialDays = { 'Tag 1': [] };
    }

    let savedActiveDay = localStorage.getItem('upper_schedule_activeday');
    if (!savedActiveDay || !initialDays[savedActiveDay]) {
        savedActiveDay = Object.keys(initialDays)[0] || 'Tag 1';
    }

    let scheduleState = {
        myGroup: localStorage.getItem('upper_schedule_mygroup') || 'A',
        alert10m: localStorage.getItem('upper_schedule_alert10m') !== 'false',
        alert5m: localStorage.getItem('upper_schedule_alert5m') !== 'false',
        activeDay: savedActiveDay,
        days: initialDays
    };

    let timerInterval = null;

    function saveScheduleState() {
        try {
            localStorage.setItem('upper_schedule_mygroup', scheduleState.myGroup);
            localStorage.setItem('upper_schedule_alert10m', scheduleState.alert10m);
            localStorage.setItem('upper_schedule_alert5m', scheduleState.alert5m);
            localStorage.setItem('upper_schedule_activeday', scheduleState.activeDay);
            localStorage.setItem('upper_schedule_days', JSON.stringify(scheduleState.days));
        } catch (e) {
            console.error('[Schedule] Speichern fehlgeschlagen:', e);
        }
    }

    function getDayKeys() {
        return Object.keys(scheduleState.days || {});
    }

    function getCurrentItems() {
        if (!scheduleState.days || typeof scheduleState.days !== 'object') {
            scheduleState.days = { 'Tag 1': [] };
        }
        if (!scheduleState.days[scheduleState.activeDay]) {
            const firstDay = getDayKeys()[0];
            scheduleState.activeDay = firstDay || 'Tag 1';
            if (!scheduleState.days[scheduleState.activeDay]) {
                scheduleState.days[scheduleState.activeDay] = [];
            }
        }
        return scheduleState.days[scheduleState.activeDay] || [];
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function timeToMinutes(timeStr) {
        if (!timeStr) return 0;
        const normalized = String(timeStr).trim().replace('.', ':');
        const parts = normalized.split(':');
        const h = Number(parts[0]);
        const m = Number(parts[1]);
        if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
        return h * 60 + m;
    }

    function normalizeTime(timeStr) {
        if (!timeStr) return '';
        const parts = String(timeStr).trim().replace('.', ':').split(':');
        if (parts.length < 2) return '';
        const h = Number(parts[0]);
        const m = Number(parts[1]);
        if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || h > 23 || m < 0 || m > 59) return '';
        return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    }

    function minutesToTime(totalMins) {
        const validMins = Math.max(0, Number(totalMins) || 0);
        const h = Math.floor(validMins / 60) % 24;
        const m = validMins % 60;
        return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    }

    function normalizeTitle(title) {
        let t = String(title || '').trim();
        // PDF.js kann deutsche und englische Textstücke auf dieselbe Zeile setzen.
        // Für die Erkennung zählt nur der relevante deutsche/technische Teil.
        t = t.replace(/\s+/g, ' ');
        return t;
    }

    // Erkennt neben den bestehenden Turns A-D auch wichtige Orga-Punkte.
    // WICHTIG: Die A-D-Erkennung bleibt bewusst unverändert und wird weiterhin
    // vor allen zusätzlichen Kategorien geprüft.
    function processLineTitle(rawTitle) {
        if (!rawTitle) return null;

        let title = normalizeTitle(rawTitle);
        if (!title) return null;

        const upper = title.toUpperCase();

        // Gemeinsames Fahren für alle vier Gruppen.
        if (/A\s*\+\s*B\s*\+\s*C\s*\+\s*D/i.test(title) || /ALLE GRUPPEN/i.test(title)) {
            return { title: 'Freies Fahren – alle Gruppen', group: 'A+B+C+D', type: 'turn' };
        }

        // Gruppen A-D – DIESE ERKENNUNG NICHT ÄNDERN.
        if (/\bGRUPPE\s*A\b|\bGR\.\s*A\b|GROUP\s*A\b/i.test(title)) {
            return { title: 'Freies Fahren Gruppe A', group: 'A', type: 'turn' };
        }
        if (/\bGRUPPE\s*B\b|\bGR\.\s*B\b|GROUP\s*B\b/i.test(title)) {
            return { title: 'Freies Fahren Gruppe B', group: 'B', type: 'turn' };
        }
        if (/\bGRUPPE\s*C\b|\bGR\.\s*C\b|GROUP\s*C\b/i.test(title)) {
            return { title: 'Freies Fahren Gruppe C', group: 'C', type: 'turn' };
        }
        if (/\bGRUPPE\s*D\b|\bGR\.\s*D\b|GROUP\s*D\b/i.test(title)) {
            return { title: 'Freies Fahren Gruppe D', group: 'D', type: 'turn' };
        }

        // Zusätzliche wichtige Zeitplanpunkte.
        if (upper.indexOf('REGROUPING') !== -1 || upper.indexOf('NEUE AUSFAHRTSGENEHMIGUNG') !== -1 || upper.indexOf('NEW TICKET') !== -1) {
            return { title: 'REGROUPING – neue Ausfahrtsgenehmigung holen', group: 'REGROUPING', type: 'orga' };
        }
        if (/MITTAGSPAUSE|LUNCH BREAK/i.test(title)) {
            return { title: 'Mittagspause', group: 'Pause', type: 'orga' };
        }
        if (upper.indexOf('FAHRERBESPRECHUNG') !== -1) {
            const raceBriefing = /RENNTEILNEHMER|RACE/i.test(title);
            return { title: raceBriefing ? 'Fahrerbesprechung – Rennteilnehmer' : 'Fahrerbesprechung', group: 'Briefing', type: 'orga' };
        }
        // Englische Briefing-Zeilen sind nur die Übersetzung der deutschen
        // Fahrerbesprechung direkt davor und werden nicht zusätzlich importiert.
        if (/BRIEFING/i.test(title)) return null;
        if (upper.indexOf('ANMELDUNG') !== -1) {
            return { title: 'Anmeldung', group: 'Anmeldung', type: 'orga' };
        }
        // Englische Registration-Zeilen sind meist nur die Übersetzung direkt unter der deutschen Zeile.
        // Sie werden ignoriert, um Doppelungen zu vermeiden.
        if (upper.indexOf('REGISTRATION') !== -1) return null;
        if (upper.indexOf('SIEGEREHRUNG') !== -1 || upper.indexOf('PRICEGIVING') !== -1) {
            return { title: 'Siegerehrung', group: 'Siegerehrung', type: 'orga' };
        }

        // Rennen.
        if (/\bCLASSIC\s+RACE\b/i.test(title)) {
            const laps = title.match(/(\d+)\s*LAPS?/i);
            return { title: 'Classic Race' + (laps ? ' – ' + laps[1] + ' Laps' : ''), group: 'Rennen', type: 'race' };
        }
        if (/\bROOKIE\s+RACE\b/i.test(title)) {
            const laps = title.match(/(\d+)\s*LAPS?/i);
            return { title: 'Rookie Race' + (laps ? ' – ' + laps[1] + ' Laps' : ''), group: 'Rennen', type: 'race' };
        }
        if (/\bSBK\b/i.test(title) && /RACE|RENNEN/i.test(title)) {
            const laps = title.match(/(\d+)\s*LAPS?/i);
            return { title: 'SBK Race' + (laps ? ' – ' + laps[1] + ' Laps' : ''), group: 'Rennen', type: 'race' };
        }
        if (/\bSSP\b/i.test(title) && /RACE|RENNEN/i.test(title)) {
            const laps = title.match(/(\d+)\s*LAPS?/i);
            return { title: 'SSP Race' + (laps ? ' – ' + laps[1] + ' Laps' : ''), group: 'Rennen', type: 'race' };
        }
        if (/\bB[- ]?RACE\b/i.test(title)) {
            const laps = title.match(/(\d+)\s*LAPS?/i);
            return { title: 'B-Race' + (laps ? ' – ' + laps[1] + ' Laps' : ''), group: 'Rennen', type: 'race' };
        }
        if (/\bRACE\b|\bRENNEN\b/i.test(title)) {
            return { title: title.split(';')[0].trim(), group: 'Rennen', type: 'race' };
        }

        // Weniger wichtige Infozeilen weiterhin ignorieren.
        if (/^(QUALIFYING|LETZTES QUALIFYING)\b/i.test(title)) return null;
        if (upper.indexOf('ANFÄNGERKURS') !== -1 || upper.indexOf('INSTRUCTIONS FOR BEGINNERS') !== -1) return null;
        if (upper.indexOf('ZEITNAHME ENDE') !== -1 || upper.indexOf('END OF TIMEKEEPING') !== -1) return null;
        if (upper.indexOf('BOXENAUSFAHRT') !== -1 || upper.indexOf('PIT LANE') !== -1) return null;
        if (upper.indexOf('LIVE TIMING') !== -1) return null;
        if (upper.indexOf('ALLE RENNEN') !== -1 || upper.indexOf('ALL RACE') !== -1) return null;
        if (upper.indexOf('LIZENZ') !== -1 || upper.indexOf('LICENSE') !== -1) return null;

        return null;
    }

    function isRelevantItem(item) {
        if (!item || !item.start || !item.title || !item.group) return false;
        if (item.end && !normalizeTime(item.end)) return false;
        return true;
    }

    function dedupeAndSort(items) {
        const unique = new Map();
        (items || []).forEach(function(item) {
            if (!isRelevantItem(item)) return;
            const start = normalizeTime(item.start);
            const end = item.end ? normalizeTime(item.end) : '';
            if (!start) return;
            const key = start + '|' + end + '|' + item.group + '|' + String(item.title).toLowerCase() + '|' + (item.sequence || '');
            if (!unique.has(key)) {
                unique.set(key, {
                    start: start,
                    end: end,
                    title: item.title,
                    group: item.group,
                    type: item.type || 'orga',
                    sequence: item.sequence || ''
                });
            }
        });
        return Array.from(unique.values()).sort(function(a, b) {
            return timeToMinutes(a.start) - timeToMinutes(b.start) ||
                ((a.sequence || 0) - (b.sequence || 0)) ||
                timeToMinutes(a.end || a.start) - timeToMinutes(b.end || b.start);
        });
    }

    function updateHeaderWidget(activeTurn, nextMyTurn, minsToNextMyTurn) {
        const widget = document.getElementById('headerScheduleWidget');
        if (!widget) return;

        let label = '';
        let isGlowing10m = false;
        let isBlinking5m = false;

        if (activeTurn) {
            const pad = function(n) { return String(n).padStart(2, '0'); };
            const remStr = activeTurn.remainingMins + ':' + pad(activeTurn.remainingSecs);
            const isMine = activeTurn.group === scheduleState.myGroup || activeTurn.group === 'A+B+C+D' || activeTurn.group === 'Rennen';
            label = '<span class="turn-group-badge ' + (isMine ? 'my-group' : '') + '">Gr. ' + escapeHtml(activeTurn.group) + '</span> <span class="turn-time-rem">⏳ ' + remStr + '</span>';
        } else if (nextMyTurn) {
            label = '<span class="turn-next-badge">Nächstes: Gr. ' + escapeHtml(nextMyTurn.group) + ' in ' + nextMyTurn.diffMins + 'm</span>';
        } else {
            label = '<span style="opacity:0.8;">⏱️ Kein Turn</span>';
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
        rows.forEach(function(row) {
            const startM = parseInt(row.dataset.startm, 10);
            const endM = parseInt(row.dataset.endm, 10);
            row.classList.remove('row-active', 'row-my-group');
            if (row.dataset.group === scheduleState.myGroup || row.dataset.group === 'A+B+C+D') {
                row.classList.add('row-my-group');
            }
            if (item.end && currentMins >= startM && currentMins < endM) {
                row.classList.add('row-active');
            }
        });
    }

    function updateScheduleTimer() {
        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();
        const currentSecs = now.getSeconds();

        let activeTurn = null;
        let nextMyTurn = null;
        let minsToNextMyTurn = Infinity;
        const items = getCurrentItems();

        const sorted = items.slice().sort(function(a, b) {
            return timeToMinutes(a.start) - timeToMinutes(b.start);
        });

        function belongsToMyGroup(item) {
            if (scheduleState.myGroup === 'ALL') return true;
            if (item.group === scheduleState.myGroup) return true;
            if (item.group === 'A+B+C+D') return true;
            if (item.group === 'Rennen' && item.end) return true;
            return false;
        }

        sorted.forEach(function(item) {
            const startM = timeToMinutes(item.start);
            const endM = item.end ? timeToMinutes(item.end) : startM;

            if (item.end && currentMins >= startM && currentMins < endM) {
                const totalRemainingSeconds = Math.max(0, (endM * 60) - (currentMins * 60 + currentSecs));
                activeTurn = Object.assign({}, item, {
                    remainingMins: Math.floor(totalRemainingSeconds / 60),
                    remainingSecs: totalRemainingSeconds % 60,
                    endM: endM
                });
            }

            if (belongsToMyGroup(item) && item.type === 'turn' && startM > currentMins) {
                const diffMins = startM - currentMins;
                if (diffMins < minsToNextMyTurn) {
                    minsToNextMyTurn = diffMins;
                    nextMyTurn = Object.assign({}, item, { startM: startM, diffMins: diffMins });
                }
            }
        });

        updateHeaderWidget(activeTurn, nextMyTurn, minsToNextMyTurn);
        updateScheduleViewHighlight(activeTurn, currentMins);
    }

    function renderScheduleRows() {
        const container = document.getElementById('scheduleItemsContainer');
        const countEl = document.getElementById('scheduleCount');
        if (!container) return;

        const currentItems = dedupeAndSort(getCurrentItems());
        scheduleState.days[scheduleState.activeDay] = currentItems;
        if (countEl) countEl.textContent = String(currentItems.length);

        if (currentItems.length === 0) {
            container.innerHTML = '<p style="font-size:0.8rem; color:#888; text-align:center; padding:15px;">Kein relevanter Zeitplan für ' + escapeHtml(scheduleState.activeDay) + ' geladen. Bitte PDF importieren.</p>';
            return;
        }

        let html = '';
        currentItems.forEach(function(item, index) {
            const startM = timeToMinutes(item.start);
            const endM = item.end ? timeToMinutes(item.end) : startM;
            const isMyGroup = item.group === scheduleState.myGroup || item.group === 'A+B+C+D';
            let groupColor = '#888';
            if (item.group === 'A') groupColor = '#4CAF50';
            else if (item.group === 'B') groupColor = '#2196F3';
            else if (item.group === 'C') groupColor = '#FF9800';
            else if (item.group === 'D') groupColor = '#E91E63';
            else if (item.group === 'A+B+C+D') groupColor = '#FFD700';
            else if (item.group === 'Rennen') groupColor = '#9C27B0';
            else if (item.group === 'REGROUPING') groupColor = '#F44336';
            else if (item.group === 'Pause') groupColor = '#607D8B';
            else if (item.group === 'Briefing') groupColor = '#FF5722';
            else if (item.group === 'Anmeldung') groupColor = '#00BCD4';
            else if (item.group === 'Siegerehrung') groupColor = '#FFC107';

            html += '<div class="schedule-row ' + (isMyGroup ? 'row-my-group' : '') + '" data-startm="' + startM + '" data-endm="' + endM + '" data-group="' + escapeHtml(item.group) + '">' +
                '<div style="font-weight:bold; width:85px; font-size:0.85rem; color:#fff;">' + (item.sequence ? 'Danach' : (escapeHtml(item.start) + (item.end ? ' - ' + escapeHtml(item.end) : ''))) + '</div>' +
                '<div style="flex:1; font-size:0.85rem; padding:0 6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + escapeHtml(item.title) + '</div>' +
                '<span style="background:' + groupColor + '; color:#fff; font-size:0.7rem; font-weight:bold; padding:2px 6px; border-radius:3px; margin-right:6px;">' + escapeHtml(item.group) + '</span>' +
                '<button type="button" onclick="window.deleteTurn(' + index + ')" style="background:none; border:none; color:#f44336; cursor:pointer; font-size:0.85rem;">🗑️</button>' +
                '</div>';
        });

        container.innerHTML = html;
    }

    function bindScheduleEvents() {
        const groupSel = document.getElementById('scheduleMyGroupSelect');
        if (groupSel) {
            groupSel.onchange = function(e) {
                scheduleState.myGroup = e.target.value;
                saveScheduleState();
                renderScheduleRows();
                updateScheduleTimer();
            };
        }

        const alert10mEl = document.getElementById('alert10mToggle');
        if (alert10mEl) {
            alert10mEl.onchange = function(e) {
                scheduleState.alert10m = e.target.checked;
                saveScheduleState();
                updateScheduleTimer();
            };
        }

        const alert5mEl = document.getElementById('alert5mToggle');
        if (alert5mEl) {
            alert5mEl.onchange = function(e) {
                scheduleState.alert5m = e.target.checked;
                saveScheduleState();
                updateScheduleTimer();
            };
        }

        const pdfFileEl = document.getElementById('schedulePdfFile');
        if (pdfFileEl) pdfFileEl.onchange = handlePdfFileUpload;
    }

    function renderSchedulePage() {
        const container = document.getElementById('pageSchedule');
        if (!container) return;

        const dayKeys = getDayKeys();
        let dayButtonsHtml = '';

        dayKeys.forEach(function(dayName) {
            const isActive = dayName === scheduleState.activeDay;
            dayButtonsHtml += '<button type="button" onclick="window.switchScheduleDay(\'' + String(dayName).replace(/'/g, "\\'") + '\')" ' +
                'style="padding:6px 14px; border-radius:4px; font-weight:bold; font-size:0.8rem; cursor:pointer; ' +
                'border:' + (isActive ? '2px solid #FFD700' : '1px solid #444') + '; ' +
                'background:' + (isActive ? '#FFD700' : '#222') + '; ' +
                'color:' + (isActive ? '#000' : '#fff') + ';">📅 ' + escapeHtml(dayName) + '</button> ';
        });

        let html = '<div class="setup-box">' +
            '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">' +
                '<h3 style="margin:0; font-size:1.1rem; color:#FFD700;">⏱️ Live-Zeitplan & Alarm</h3>' +
            '</div>' +
            '<div style="background:#1e1e1e; padding:10px; border-radius:6px; margin-bottom:12px; border:1px solid #333;">' +
                '<div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:8px;">' +
                    '<label style="font-size:0.85rem; font-weight:bold; color:#fff;">Meine Gruppe:</label>' +
                    '<select id="scheduleMyGroupSelect" style="width:auto; padding:4px 10px; font-weight:bold; background:#333; color:#FFD700; border-color:#FFD700;">' +
                        '<option value="A" ' + (scheduleState.myGroup==='A'?'selected':'') + '>Gruppe A</option>' +
                        '<option value="B" ' + (scheduleState.myGroup==='B'?'selected':'') + '>Gruppe B</option>' +
                        '<option value="C" ' + (scheduleState.myGroup==='C'?'selected':'') + '>Gruppe C</option>' +
                        '<option value="D" ' + (scheduleState.myGroup==='D'?'selected':'') + '>Gruppe D</option>' +
                        '<option value="ALL" ' + (scheduleState.myGroup==='ALL'?'selected':'') + '>Alle Turn-Erinnerungen</option>' +
                    '</select>' +
                '</div>' +
                '<div style="display:flex; flex-direction:column; gap:6px; font-size:0.8rem; border-top:1px solid #333; padding-top:8px;">' +
                    '<label style="display:flex; align-items:center; gap:8px; cursor:pointer;"><input type="checkbox" id="alert10mToggle" ' + (scheduleState.alert10m ? 'checked' : '') + ' style="width:16px; height:16px; accent-color:#ff9800;"><span>✨ <strong>10 Min. vor eigenem Turn:</strong> Header-Anzeige leuchten lassen</span></label>' +
                    '<label style="display:flex; align-items:center; gap:8px; cursor:pointer;"><input type="checkbox" id="alert5mToggle" ' + (scheduleState.alert5m ? 'checked' : '') + ' style="width:16px; height:16px; accent-color:#f44336;"><span>🚨 <strong>5 Min. vor eigenem Turn:</strong> Bildschirmrand ROT blinken</span></label>' +
                '</div>' +
            '</div>' +
            '<div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap; align-items:center;">' +
                dayButtonsHtml +
                '<button type="button" onclick="window.togglePdfImportSection()" style="margin-left:auto; background:#2196F3; color:#fff; border:none; padding:6px 12px; border-radius:4px; font-size:0.75rem; cursor:pointer;">📄 PDF Importieren</button>' +
            '</div>' +
            '<div id="pdfImportSection" style="display:none; background:#181818; padding:10px; border-radius:6px; margin-bottom:12px; border:1px dashed #2196F3;">' +
                '<h4 style="margin:0 0 8px 0; font-size:0.85rem; color:#2196F3;">Zeitplan importieren</h4>' +
                '<p style="font-size:0.75rem; color:#aaa; margin:0 0 8px 0;">Die PDF-Seiten werden als einzelne Renntage erkannt. Turns A-D bleiben unverändert. Zusätzlich werden Anmeldung, Fahrerbesprechung, Mittagspause, REGROUPING, Siegerehrung und Rennen übernommen.</p>' +
                '<div style="margin-bottom:8px;"><input type="file" id="schedulePdfFile" accept=".pdf,.txt" style="font-size:0.75rem;"></div>' +
                '<textarea id="scheduleRawText" rows="4" placeholder="Oder kopierten Zeitplan-Text hier einfügen..." style="width:100%; font-size:0.8rem; margin-bottom:6px;"></textarea>' +
                '<div style="display:flex; gap:6px;"><button type="button" onclick="window.parseScheduleText()" style="flex:1; background:#4CAF50; color:#fff; border:none; padding:8px; border-radius:4px; font-size:0.8rem; font-weight:bold; cursor:pointer;">⚡ Text analysieren & übernehmen</button></div>' +
            '</div>' +
            '<div style="background:#222; padding:8px; border-radius:6px; margin-bottom:12px;">' +
                '<div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">' +
                    '<input type="text" id="newTurnStart" placeholder="09:00" style="width:60px; text-align:center;">' +
                    '<span>bis</span><input type="text" id="newTurnEnd" placeholder="09:20" style="width:60px; text-align:center;">' +
                    '<input type="text" id="newTurnTitle" placeholder="Bezeichnung" style="flex:1; min-width:120px;">' +
                    '<select id="newTurnGroup" style="width:90px;"><option value="A">Gruppe A</option><option value="B">Gruppe B</option><option value="C">Gruppe C</option><option value="D">Gruppe D</option><option value="Rennen">Rennen</option><option value="REGROUPING">REGROUPING</option><option value="Pause">Mittagspause</option><option value="Briefing">Fahrerbesprechung</option><option value="Anmeldung">Anmeldung</option></select>' +
                    '<button type="button" onclick="window.addCustomTurn()" style="background:#4CAF50; color:#fff; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; font-size:0.8rem;">+ Turn</button>' +
                '</div>' +
            '</div>' +
            '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">' +
                '<h4 style="margin:0; font-size:0.9rem;">Tagesplan (' + escapeHtml(scheduleState.activeDay) + '): <span id="scheduleCount">0</span> Einträge</h4>' +
                '<button type="button" onclick="window.clearSchedule()" style="background:none; border:none; color:#f44336; cursor:pointer; font-size:0.8rem;">Alle Tage leeren</button>' +
            '</div>' +
            '<div id="scheduleItemsContainer"></div>' +
        '</div>';

        container.innerHTML = html;
        bindScheduleEvents();
        renderScheduleRows();
        updateScheduleTimer();
    }

    function loadPdfJsLib() {
        return new Promise(function(resolve, reject) {
            if (window.pdfjsLib) return resolve(window.pdfjsLib);
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = function() {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                resolve(window.pdfjsLib);
            };
            script.onerror = function() { reject(new Error('PDF.js Bibliothek konnte nicht geladen werden.')); };
            document.head.appendChild(script);
        });
    }

    // Baut aus einer PDF-Seite wieder lesbare Zeilen. Die Seite bleibt dabei getrennt,
    // damit die Tagesanzahl nicht verloren geht.
    function extractPdfPageText(page, pageNumber) {
        return page.getTextContent().then(function(textContent) {
            const linesMap = [];
            textContent.items.forEach(function(item) {
                const text = item.str ? item.str.trim() : '';
                if (!text) return;
                const x = item.transform[4];
                const y = item.transform[5];
                let line = linesMap.find(function(l) { return Math.abs(l.y - y) <= 6; });
                if (!line) {
                    line = { y: y, items: [] };
                    linesMap.push(line);
                }
                line.items.push({ x: x, text: text });
            });
            linesMap.sort(function(a, b) { return b.y - a.y; });
            const lines = linesMap.map(function(line) {
                line.items.sort(function(a, b) { return a.x - b.x; });
                return line.items.map(function(it) { return it.text; }).join(' ').replace(/\s+/g, ' ').trim();
            }).filter(Boolean);
            return { pageNumber: pageNumber, lines: lines };
        });
    }

    function handlePdfFileUpload(e) {
        const file = e.target && e.target.files ? e.target.files[0] : null;
        if (!file) return;

        const textEl = document.getElementById('scheduleRawText');
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            if (typeof showNotice === 'function') showNotice('saveNotice', 'Lese PDF-Datei aus...');

            loadPdfJsLib()
                .then(function(pdfjsLib) {
                    return file.arrayBuffer().then(function(buffer) {
                        return pdfjsLib.getDocument({ data: buffer }).promise;
                    });
                })
                .then(function(pdf) {
                    const promises = [];
                    for (let i = 1; i <= pdf.numPages; i++) {
                        promises.push(pdf.getPage(i).then(function(page) {
                            return extractPdfPageText(page, i);
                        }));
                    }
                    return Promise.all(promises);
                })
                .then(function(pages) {
                    const rawText = pages.map(function(page) {
                        return '--- PAGE ' + page.pageNumber + ' ---\n' + page.lines.join('\n');
                    }).join('\n');
                    if (textEl) textEl.value = rawText;
                    parseScheduleText(rawText, pages);
                })
                .catch(function(err) {
                    console.error('[Schedule] PDF Parse Fehler:', err);
                    alert('Fehler beim Lesen der PDF-Datei: ' + (err.message || err));
                });
        } else {
            const reader = new FileReader();
            reader.onload = function(evt) {
                const raw = evt.target && evt.target.result ? String(evt.target.result) : '';
                if (textEl) textEl.value = raw;
                parseScheduleText(raw);
            };
            reader.readAsText(file);
        }
    }

    // Extrahiert die relevanten Zeilen einer einzelnen Seite.
    // Turns A-D werden wie bisher verarbeitet. Zusätzlich werden Orga-Punkte und
    // Rennfolgen ohne fixe Uhrzeit übernommen.
    function parseDayLines(lines) {
        const items = [];
        let raceSequence = 0;

        const rangeTimeRegex = /^(?:(?:ab|ca\.?|circa)\s+)?(\d{1,2}[:.]\d{2})\s*(?:-|–|—|bis)\s*(\d{1,2}[:.]\d{2})\s*(.*)$/i;
        const singleTimeRegex = /^(?:(?:ab|ca\.?|circa)\s+)?(\d{1,2}[:.]\d{2})\s+(.+)$/i;
        const nextRaceRegex = /^next\s*(?:race)?\s*(.*)$/i;
        const nextTimedRegex = /^next\s*-\s*(\d{1,2}[:.]\d{2})\s+(.+)$/i;

        const rows = [];
        (lines || []).forEach(function(line) {
            const cleanLine = String(line || '').trim();
            if (!cleanLine || /^---\s*PAGE/i.test(cleanLine)) return;

            let m = cleanLine.match(rangeTimeRegex);
            if (m) {
                rows.push({ kind:'timed', start:normalizeTime(m[1]), end:normalizeTime(m[2]), rawTitle:m[3].trim() });
                return;
            }

            m = cleanLine.match(nextTimedRegex);
            if (m) {
                rows.push({ kind:'timed', start:normalizeTime(m[1]), end:'', rawTitle:m[2].trim() });
                return;
            }

            m = cleanLine.match(singleTimeRegex);
            if (m) {
                rows.push({ kind:'timed', start:normalizeTime(m[1]), end:'', rawTitle:m[2].trim() });
                return;
            }

            m = cleanLine.match(nextRaceRegex);
            if (m) {
                rows.push({ kind:'nextRace', rawTitle:m[1].trim() });
                return;
            }

            if (/REGROUPING|NEUE AUSFAHRTSGENEHMIGUNG|NEW TICKET/i.test(cleanLine)) {
                rows.push({ kind:'untimedOrga', rawTitle:cleanLine });
            }
        });

        function nextTimedStart(index) {
            for (let j = index + 1; j < rows.length; j++) {
                if (rows[j].kind === 'timed' && rows[j].start) return rows[j].start;
            }
            return '';
        }

        let lastTimedStart = '';
        let lastRaceStart = '';

        rows.forEach(function(row, index) {
            if (row.kind === 'untimedOrga') {
                if (!lastTimedStart) return;
                const itemData = processLineTitle(row.rawTitle);
                if (!itemData) return;
                items.push({ start:lastTimedStart, end:'', title:itemData.title, group:itemData.group, type:itemData.type });
                return;
            }

            if (row.kind === 'nextRace') {
                if (!lastRaceStart) return;
                const itemData = processLineTitle(row.rawTitle);
                if (!itemData || itemData.type !== 'race') return;
                raceSequence += 1;
                items.push({
                    start:lastRaceStart, end:'', title:'Danach: ' + itemData.title,
                    group:itemData.group, type:'race', sequence:raceSequence
                });
                return;
            }

            if (row.kind !== 'timed' || !row.start) return;
            lastTimedStart = row.start;

            const itemData = processLineTitle(row.rawTitle);
            if (!itemData) return;

            let end = row.end || '';

            // A-D-Erkennung bleibt unverändert. Fehlt im PDF nur die Endzeit,
            // wird für den Turn die nächste gedruckte Uhrzeit als Ende verwendet.
            if (itemData.type === 'turn' && !end) {
                const inferredEnd = nextTimedStart(index);
                if (inferredEnd && timeToMinutes(inferredEnd) > timeToMinutes(row.start)) end = inferredEnd;
            }

            if (itemData.type === 'turn') {
                if (!end || timeToMinutes(end) <= timeToMinutes(row.start)) return;
                items.push({ start:row.start, end:end, title:itemData.title, group:itemData.group, type:'turn' });
                return;
            }

            if (itemData.type === 'orga') {
                items.push({ start:row.start, end:end, title:itemData.title, group:itemData.group, type:'orga' });
                return;
            }

            if (itemData.type === 'race') {
                lastRaceStart = row.start;
                raceSequence = 0;
                items.push({
                    start:row.start, end:end, title:itemData.title,
                    group:itemData.group, type:'race', sequence:0
                });
            }
        });

        return dedupeAndSort(items);
    }

    function detectExplicitDayName(lines, fallbackIndex) {
        const text = (lines || []).join(' ');
        const match = text.match(/\b(?:RENNTAG|TAG|DAY)\s*[:.]?\s*(\d+)\b/i);
        if (match) return 'Tag ' + match[1];

        const weekdays = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];
        for (let i = 0; i < weekdays.length; i++) {
            if (new RegExp('\\b' + weekdays[i] + '\\b', 'i').test(text)) return weekdays[i];
        }
        return 'Tag ' + fallbackIndex;
    }

    function parseScheduleText(rawText, pdfPages) {
        const raw = String(rawText || '');
        if (!raw.trim()) {
            alert('Bitte Zeitplan-Text einfügen!');
            return;
        }

        let pageBlocks = [];
        if (Array.isArray(pdfPages) && pdfPages.length) {
            pageBlocks = pdfPages.map(function(p) { return p.lines || []; });
        } else {
            const normalized = raw.replace(/\r/g, '');
            const pageMatches = normalized.split(/^---\s*PAGE\s+\d+\s*---\s*$/gim);
            if (pageMatches.length > 1) {
                pageBlocks = pageMatches.map(function(block) {
                    return block.split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
                }).filter(function(lines) { return lines.length; });
            } else {
                // Beim manuellen Einfügen ohne Seitenmarker versuchen wir zunächst echte
                // Tagesüberschriften zu finden. Falls keine vorhanden sind, bleibt es Tag 1.
                pageBlocks = [normalized.split('\n').map(function(s) { return s.trim(); }).filter(Boolean)];
            }
        }

        const parsedDays = {};
        let detectedDayCounter = 1;

        pageBlocks.forEach(function(lines, index) {
            const items = parseDayLines(lines);
            if (!items.length) return;

            let dayName = detectExplicitDayName(lines, index + 1);
            // Falls mehrere Seiten denselben expliziten Tag nennen, nicht überschreiben.
            if (parsedDays[dayName]) {
                let suffix = 2;
                const base = dayName;
                while (parsedDays[base + ' (' + suffix + ')']) suffix++;
                dayName = base + ' (' + suffix + ')';
            }

            parsedDays[dayName] = items;
            detectedDayCounter++;
        });

        const validDayKeys = Object.keys(parsedDays);
        if (!validDayKeys.length) {
            alert('Keine relevanten Zeitplan-Einträge gefunden.');
            return;
        }

        // Ein neuer PDF-Import ersetzt den alten importierten Zeitplan vollständig.
        // Dadurch bleiben keine alten/doppelten Einträge aus einem vorherigen Upload übrig.
        scheduleState.days = parsedDays;
        scheduleState.activeDay = validDayKeys[0];
        saveScheduleState();
        renderSchedulePage();
        updateScheduleTimer();

        alert('Zeitplan erfolgreich importiert! Erkannt: ' + validDayKeys.length + ' Tag' + (validDayKeys.length === 1 ? '' : 'e') + '.');
        window.togglePdfImportSection();
    }

    window.switchScheduleDay = function(dayName) {
        if (!scheduleState.days[dayName]) return;
        scheduleState.activeDay = dayName;
        saveScheduleState();
        renderSchedulePage();
    };

    window.togglePdfImportSection = function() {
        const sec = document.getElementById('pdfImportSection');
        if (sec) sec.style.display = (sec.style.display === 'none' || !sec.style.display) ? 'block' : 'none';
    };

    window.addCustomTurn = function() {
        const startEl = document.getElementById('newTurnStart');
        const endEl = document.getElementById('newTurnEnd');
        const titleEl = document.getElementById('newTurnTitle');
        const groupEl = document.getElementById('newTurnGroup');

        const start = normalizeTime(startEl ? startEl.value.trim() : '');
        const end = normalizeTime(endEl ? endEl.value.trim() : '');
        const title = titleEl ? titleEl.value.trim() : '';
        const group = groupEl ? groupEl.value : 'A';

        if (!start || !title) {
            alert('Bitte Startzeit und Bezeichnung eingeben!');
            return;
        }
        if (!end || timeToMinutes(end) <= timeToMinutes(start)) {
            alert('Bitte eine gültige Endzeit eingeben!');
            return;
        }

        if (!scheduleState.days[scheduleState.activeDay]) scheduleState.days[scheduleState.activeDay] = [];
        scheduleState.days[scheduleState.activeDay].push({ start: start, end: end, title: title, group: group });
        scheduleState.days[scheduleState.activeDay] = dedupeAndSort(scheduleState.days[scheduleState.activeDay]);
        saveScheduleState();
        renderScheduleRows();
        updateScheduleTimer();

        if (startEl) startEl.value = '';
        if (endEl) endEl.value = '';
        if (titleEl) titleEl.value = '';
    };

    window.deleteTurn = function(index) {
        if (scheduleState.days[scheduleState.activeDay]) {
            scheduleState.days[scheduleState.activeDay].splice(index, 1);
            saveScheduleState();
            renderScheduleRows();
            updateScheduleTimer();
        }
    };

    window.clearSchedule = function() {
        if (confirm('Möchtest du den Zeitplan für ALLE Tage komplett leeren?')) {
            scheduleState.days = { 'Tag 1': [] };
            scheduleState.activeDay = 'Tag 1';
            saveScheduleState();
            renderSchedulePage();
            updateScheduleTimer();
        }
    };

    window.parseScheduleText = function() {
        const textEl = document.getElementById('scheduleRawText');
        const raw = textEl ? textEl.value : '';
        parseScheduleText(raw);
    };

    window.initScheduleModule = function() {
        renderSchedulePage();
        if (!timerInterval) timerInterval = setInterval(updateScheduleTimer, 1000);
        updateScheduleTimer();
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(window.initScheduleModule, 100);
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            window.initScheduleModule();
        });
    }
})();
