// schedule.js - UpperRacing Zeitplan, PDF-Import & Live-Turn-Anzeige
// Kompatibel mit der bestehenden UpperRacing-App.
(function () {
    'use strict';

    const DAY_NAMES = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const DAY_ORDER = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    const STORAGE = {
        days: 'upper_schedule_days',
        group: 'upper_schedule_mygroup',
        alert10: 'upper_schedule_alert10m',
        alert5: 'upper_schedule_alert5m',
        activeDay: 'upper_schedule_activeday'
    };

    let initialDays = {};
    try {
        const saved = localStorage.getItem(STORAGE.days);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object') initialDays = normalizeDays(parsed);
        }
    } catch (e) {
        console.warn('[Schedule] LocalStorage konnte nicht gelesen werden:', e);
    }

    let scheduleState = {
        myGroup: localStorage.getItem(STORAGE.group) || 'A',
        alert10m: localStorage.getItem(STORAGE.alert10) !== 'false',
        alert5m: localStorage.getItem(STORAGE.alert5) !== 'false',
        activeDay: localStorage.getItem(STORAGE.activeDay) || getTodayName(),
        days: initialDays
    };

    let timerInterval = null;
    let pdfLoading = false;

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function getTodayName() {
        return DAY_NAMES[new Date().getDay()];
    }

    function normalizeDayName(name, fallbackIndex) {
        const t = String(name || '').trim().toUpperCase();
        if (t.includes('MONTAG') || t === 'MONDAY') return 'Montag';
        if (t.includes('DIENSTAG') || t === 'TUESDAY') return 'Dienstag';
        if (t.includes('MITTWOCH') || t === 'WEDNESDAY') return 'Mittwoch';
        if (t.includes('DONNERSTAG') || t === 'THURSDAY') return 'Donnerstag';
        if (t.includes('FREITAG') || t === 'FRIDAY') return 'Freitag';
        if (t.includes('SAMSTAG') || t === 'SATURDAY') return 'Samstag';
        if (t.includes('SONNTAG') || t === 'SUNDAY') return 'Sonntag';
        const num = t.match(/(?:TAG|DAY)\s*(\d+)/i);
        return num ? 'Tag ' + num[1] : (fallbackIndex ? 'Tag ' + fallbackIndex : null);
    }

    function normalizeTime(value) {
        if (value == null) return '';
        const m = String(value).trim().replace('.', ':').match(/^(\d{1,2}):(\d{2})$/);
        if (!m) return '';
        const h = Number(m[1]), min = Number(m[2]);
        if (h > 23 || min > 59) return '';
        return String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0');
    }

    function timeToMinutes(timeStr) {
        const t = normalizeTime(timeStr);
        if (!t) return NaN;
        const p = t.split(':');
        return Number(p[0]) * 60 + Number(p[1]);
    }

    function minutesToTime(total) {
        let mins = Number(total);
        if (!Number.isFinite(mins)) mins = 0;
        mins = ((Math.round(mins) % 1440) + 1440) % 1440;
        return String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
    }

    function normalizeItem(item) {
        if (!item || typeof item !== 'object') return null;
        const start = normalizeTime(item.start);
        if (!start) return null;
        let end = normalizeTime(item.end);
        const startM = timeToMinutes(start);
        let endM = timeToMinutes(end);
        if (!end || !Number.isFinite(endM) || endM <= startM) end = minutesToTime(startM + 20);
        return {
            start,
            end,
            title: String(item.title || 'Zeitplan').trim(),
            group: String(item.group || 'Orga').trim()
        };
    }

    function normalizeDays(days) {
        const result = {};
        Object.keys(days || {}).forEach(function (key) {
            const day = normalizeDayName(key) || key;
            const items = Array.isArray(days[key]) ? days[key].map(normalizeItem).filter(Boolean) : [];
            if (items.length) result[day] = items;
        });
        return result;
    }

    function saveScheduleState() {
        try {
            localStorage.setItem(STORAGE.group, scheduleState.myGroup);
            localStorage.setItem(STORAGE.alert10, String(scheduleState.alert10m));
            localStorage.setItem(STORAGE.alert5, String(scheduleState.alert5m));
            localStorage.setItem(STORAGE.activeDay, scheduleState.activeDay || '');
            localStorage.setItem(STORAGE.days, JSON.stringify(scheduleState.days || {}));
        } catch (e) {
            console.error('[Schedule] Speichern fehlgeschlagen:', e);
        }
    }

    function getOrderedDayKeys() {
        return Object.keys(scheduleState.days || {}).sort(function (a, b) {
            const ia = DAY_ORDER.indexOf(a), ib = DAY_ORDER.indexOf(b);
            if (ia === -1 && ib === -1) return a.localeCompare(b, 'de');
            if (ia === -1) return 1;
            if (ib === -1) return -1;
            return ia - ib;
        });
    }

    function selectBestActiveDay() {
        const keys = getOrderedDayKeys();
        if (!keys.length) {
            scheduleState.activeDay = getTodayName();
            return;
        }
        const today = getTodayName();
        if (keys.includes(today)) {
            scheduleState.activeDay = today;
            return;
        }
        if (!keys.includes(scheduleState.activeDay)) scheduleState.activeDay = keys[0];
    }

    function getCurrentItems() {
        if (!scheduleState.days || typeof scheduleState.days !== 'object') scheduleState.days = {};
        if (!scheduleState.days[scheduleState.activeDay]) selectBestActiveDay();
        return scheduleState.days[scheduleState.activeDay] || [];
    }

    function groupMatches(item, group) {
        if (group === 'ALL') return ['A', 'B', 'C', 'D'].includes(item.group) || item.group === 'Rennen';
        return item.group === group || item.group === 'Alle';
    }

    function processLineTitle(rawTitle) {
        if (!rawTitle) return null;
        let title = String(rawTitle).replace(/\s+/g, ' ').trim();
        if (!title) return null;

        // Häufige PDF-Trennzeichen/Spaltenreste entfernen.
        title = title.replace(/^[-–—|:]+\s*/, '').replace(/\s*[-–—|]+\s*$/, '').trim();
        const t = title.toUpperCase();

        if (/QUALIFYING|LETZTES QUALIFYING|ANMELDUNG ZU DEN RENNEN|REGISTRATION FOR ALL|ZEITNAHME ENDE/.test(t)) return null;
        if (/MITTAG|PAUSE|LUNCH|ESSEN/.test(t)) return { title: 'Mittagspause', group: 'Pause' };
        if (/FAHRERBESPRECHUNG|BRIEFING/.test(t)) return { title: 'Fahrerbesprechung', group: 'Orga' };
        if (/ANFÄNGERKURS.*THEORIE|THEORIE/.test(t) && !/PRAXIS/.test(t)) return { title: 'Anfängerkurs Theorie', group: 'Anfänger' };
        if (/ANFÄNGERKURS.*PRAXIS|PRAXIS/.test(t)) return { title: 'Anfängerkurs Praxis', group: 'Anfänger' };
        if (/SIEGEREHRUNG|PRICEGIVING/.test(t)) return { title: 'Siegerehrung', group: 'Orga' };

        // Gruppen dürfen auch mitten im Text stehen (z.B. "Freies Fahren - Gruppe A").
        if (/ALLE GRUPPEN|A\s*\+\s*B\s*\+\s*C\s*\+\s*D/.test(t)) return { title: 'Freies Fahren (Alle Gruppen)', group: 'Alle' };
        const groupMatch = t.match(/(?:GRUPPE|GR\.?|GROUP)\s*([ABCD])\b/);
        if (groupMatch) return { title: 'Freies Fahren Gruppe ' + groupMatch[1], group: groupMatch[1] };
        if (/SLOWER GROUP A/.test(t)) return { title: 'Freies Fahren Gruppe A', group: 'A' };
        if (/FASTER GROUP B/.test(t)) return { title: 'Freies Fahren Gruppe B', group: 'B' };
        if (/FAST GROUP C/.test(t)) return { title: 'Freies Fahren Gruppe C', group: 'C' };
        if (/VERY FAST GROUP D/.test(t)) return { title: 'Freies Fahren Gruppe D', group: 'D' };

        if (/CLASSIC/.test(t)) return { title: 'Classic Race', group: 'Rennen' };
        if (/ROOKIE/.test(t)) return { title: 'Sternchen Rookie Race', group: 'Rennen' };
        if (/\bSBK\b/.test(t)) return { title: 'SBK Race', group: 'Rennen' };
        if (/\bSSP\b/.test(t)) return { title: 'SSP Race', group: 'Rennen' };
        if (/B[- ]RACE/.test(t)) return { title: 'B-Race', group: 'Rennen' };
        if (/\bRENNEN\b|\bRACE\b/.test(t)) return { title: title.split(';')[0].trim(), group: 'Rennen' };

        return null;
    }

    function getTimeParts(line) {
        const range = line.match(/\b(\d{1,2}[:.]\d{2})\s*(?:-|–|—|bis|to)\s*(\d{1,2}[:.]\d{2})\b/i);
        if (range) return { start: normalizeTime(range[1]), end: normalizeTime(range[2]), text: line.replace(range[0], ' ').trim() };
        const single = line.match(/\b(\d{1,2}[:.]\d{2})\b/);
        if (single) return { start: normalizeTime(single[1]), end: '', text: line.replace(single[0], ' ').trim() };
        return null;
    }

    function updateHeaderWidget(activeTurn, nextMyTurn, nextDiffSeconds) {
        const widget = document.getElementById('headerScheduleWidget');
        if (!widget) return;

        widget.classList.remove('schedule-header-active', 'schedule-header-next', 'schedule-header-other');
        let html = '';
        let glow10 = false, blink5 = false;

        if (activeTurn) {
            const mine = groupMatches(activeTurn, scheduleState.myGroup);
            const remaining = Math.max(0, activeTurn.endAbsSeconds - activeTurn.nowAbsSeconds);
            const mm = Math.floor(remaining / 60);
            const ss = remaining % 60;
            const groupText = activeTurn.group === 'Alle' ? 'ALLE' : activeTurn.group;
            html = '<span class="schedule-status-dot">●</span>' +
                   '<span class="turn-group-badge ' + (mine ? 'my-group' : '') + '">Gr. ' + escapeHtml(groupText) + '</span>' +
                   '<span class="turn-title-short">' + escapeHtml(activeTurn.title) + '</span>' +
                   '<span class="turn-time-rem">' + String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0') + '</span>';
            widget.classList.add(mine ? 'schedule-header-active' : 'schedule-header-other');
        } else if (nextMyTurn) {
            const mins = Math.floor(nextDiffSeconds / 60);
            const secs = nextDiffSeconds % 60;
            html = '<span class="schedule-status-dot">●</span>' +
                   '<span class="turn-next-badge">Gr. ' + escapeHtml(nextMyTurn.group === 'Alle' ? 'ALLE' : nextMyTurn.group) + ' in ' + mins + ':' + String(secs).padStart(2, '0') + '</span>';
            widget.classList.add('schedule-header-next');
            if (nextDiffSeconds <= 600 && nextDiffSeconds > 300 && scheduleState.alert10m) glow10 = true;
            if (nextDiffSeconds <= 300 && nextDiffSeconds > 0) {
                if (scheduleState.alert10m) glow10 = true;
                if (scheduleState.alert5m) blink5 = true;
            }
        } else {
            html = '<span style="opacity:.8">⏱️ Kein weiterer Turn</span>';
        }

        widget.innerHTML = html;
        widget.classList.toggle('schedule-glow-10m', glow10);
        document.body.classList.toggle('screen-alert-red', blink5);
    }

    function updateScheduleViewHighlight(currentMinutes) {
        const container = document.getElementById('scheduleItemsContainer');
        if (!container) return;
        container.querySelectorAll('.schedule-row').forEach(function (row) {
            const start = Number(row.dataset.startm), end = Number(row.dataset.endm);
            row.classList.remove('row-active');
            if (scheduleState.myGroup === 'ALL' || row.dataset.group === scheduleState.myGroup || row.dataset.group === 'Alle') row.classList.add('row-my-group');
            else row.classList.remove('row-my-group');
            if (currentMinutes >= start && currentMinutes < end) row.classList.add('row-active');
        });
    }

    function updateScheduleTimer() {
        const now = new Date();
        const today = getTodayName();
        // Wenn ein Zeitplan für heute vorhanden ist, automatisch auf heute umschalten.
        if (scheduleState.days[today] && scheduleState.activeDay !== today) {
            scheduleState.activeDay = today;
            saveScheduleState();
            renderSchedulePage();
        }

        const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        const currentMinutes = Math.floor(currentSeconds / 60);
        const items = getCurrentItems().slice().sort(function (a, b) { return timeToMinutes(a.start) - timeToMinutes(b.start); });

        let activeTurn = null;
        let nextMyTurn = null;
        let nextDiffSeconds = Infinity;

        items.forEach(function (item, index) {
            const startM = timeToMinutes(item.start);
            let endM = timeToMinutes(item.end);
            if (!Number.isFinite(endM) || endM <= startM) endM = index < items.length - 1 ? timeToMinutes(items[index + 1].start) : startM + 20;
            if (currentSeconds >= startM * 60 && currentSeconds < endM * 60) {
                activeTurn = Object.assign({}, item, {
                    endAbsSeconds: endM * 60,
                    nowAbsSeconds: currentSeconds
                });
            }
            const isMine = groupMatches(item, scheduleState.myGroup) || (item.group === 'Rennen' && scheduleState.myGroup !== 'Pause');
            const diff = startM * 60 - currentSeconds;
            if (isMine && diff > 0 && diff < nextDiffSeconds) {
                nextDiffSeconds = diff;
                nextMyTurn = item;
            }
        });

        updateHeaderWidget(activeTurn, nextMyTurn, nextDiffSeconds);
        updateScheduleViewHighlight(currentMinutes);
    }

    function renderScheduleRows() {
        const container = document.getElementById('scheduleItemsContainer');
        const countEl = document.getElementById('scheduleCount');
        if (!container) return;
        const currentItems = getCurrentItems().slice().sort(function (a, b) { return timeToMinutes(a.start) - timeToMinutes(b.start); });
        if (countEl) countEl.textContent = String(currentItems.length);
        if (!currentItems.length) {
            container.innerHTML = '<p style="font-size:.8rem;color:#888;text-align:center;padding:15px">Kein Zeitplan für ' + escapeHtml(scheduleState.activeDay) + ' geladen. Bitte PDF importieren.</p>';
            return;
        }
        let html = '';
        currentItems.forEach(function (item, index) {
            const startM = timeToMinutes(item.start);
            const endM = timeToMinutes(item.end);
            const mine = groupMatches(item, scheduleState.myGroup);
            let groupClass = item.group === 'A' ? 'group-a' : item.group === 'B' ? 'group-b' : item.group === 'C' ? 'group-c' : item.group === 'D' ? 'group-d' : 'group-other';
            html += '<div class="schedule-row ' + (mine ? 'row-my-group ' : '') + '" data-startm="' + startM + '" data-endm="' + endM + '" data-group="' + escapeHtml(item.group) + '">' +
                '<div class="schedule-time">' + escapeHtml(item.start) + ' - ' + escapeHtml(item.end) + '</div>' +
                '<div class="schedule-title">' + escapeHtml(item.title) + '</div>' +
                '<span class="schedule-group ' + groupClass + '">' + escapeHtml(item.group) + '</span>' +
                '<button type="button" onclick="window.deleteTurn(' + index + ')" class="schedule-delete" title="Turn löschen">🗑️</button>' +
                '</div>';
        });
        container.innerHTML = html;
        updateScheduleViewHighlight(new Date().getHours() * 60 + new Date().getMinutes());
    }

    function bindScheduleEvents() {
        const groupSel = document.getElementById('scheduleMyGroupSelect');
        if (groupSel) groupSel.onchange = function (e) { scheduleState.myGroup = e.target.value; saveScheduleState(); renderScheduleRows(); updateScheduleTimer(); };
        const a10 = document.getElementById('alert10mToggle');
        if (a10) a10.onchange = function (e) { scheduleState.alert10m = e.target.checked; saveScheduleState(); updateScheduleTimer(); };
        const a5 = document.getElementById('alert5mToggle');
        if (a5) a5.onchange = function (e) { scheduleState.alert5m = e.target.checked; saveScheduleState(); updateScheduleTimer(); };
        const file = document.getElementById('schedulePdfFile');
        if (file) file.onchange = handlePdfFileUpload;
    }

    function renderSchedulePage() {
        const page = document.getElementById('pageSchedule');
        if (!page) return;
        const keys = getOrderedDayKeys();
        let buttons = '';
        keys.forEach(function (day) {
            const active = day === scheduleState.activeDay;
            buttons += '<button type="button" class="schedule-day-btn ' + (active ? 'active' : '') + '" onclick="window.switchScheduleDay(\'' + day.replace(/'/g, "\\'") + '\')">📅 ' + escapeHtml(day) + '</button>';
        });

        page.innerHTML = '<div class="setup-box">' +
            '<div class="schedule-headline"><h3>⏱️ Live-Zeitplan & Alarm</h3><span class="schedule-current-day">Heute: ' + escapeHtml(getTodayName()) + '</span></div>' +
            '<div class="schedule-settings">' +
                '<div class="schedule-setting-line"><label>Meine Gruppe:</label><select id="scheduleMyGroupSelect">' +
                    '<option value="A" ' + (scheduleState.myGroup === 'A' ? 'selected' : '') + '>Gruppe A</option>' +
                    '<option value="B" ' + (scheduleState.myGroup === 'B' ? 'selected' : '') + '>Gruppe B</option>' +
                    '<option value="C" ' + (scheduleState.myGroup === 'C' ? 'selected' : '') + '>Gruppe C</option>' +
                    '<option value="D" ' + (scheduleState.myGroup === 'D' ? 'selected' : '') + '>Gruppe D</option>' +
                    '<option value="ALL" ' + (scheduleState.myGroup === 'ALL' ? 'selected' : '') + '>Alle Turn-Erinnerungen</option>' +
                '</select></div>' +
                '<label class="schedule-check"><input type="checkbox" id="alert10mToggle" ' + (scheduleState.alert10m ? 'checked' : '') + '> ✨ 10 Min. vor eigenem Turn</label>' +
                '<label class="schedule-check"><input type="checkbox" id="alert5mToggle" ' + (scheduleState.alert5m ? 'checked' : '') + '> 🚨 5 Min. vor eigenem Turn</label>' +
            '</div>' +
            '<div class="schedule-days">' + buttons + '<button type="button" onclick="window.togglePdfImportSection()" class="schedule-import-btn">📄 PDF importieren</button></div>' +
            '<div id="pdfImportSection" class="schedule-import-section" style="display:none">' +
                '<h4>Stardesign-Zeitplan importieren</h4>' +
                '<p>PDF auswählen oder den kopierten Zeitplan-Text einfügen.</p>' +
                '<input type="file" id="schedulePdfFile" accept=".pdf,.txt">' +
                '<textarea id="scheduleRawText" rows="6" placeholder="Zeitplan-Text hier einfügen..."></textarea>' +
                '<button type="button" onclick="window.parseScheduleText()" class="schedule-analyse-btn">⚡ Text analysieren & übernehmen</button>' +
            '</div>' +
            '<div class="schedule-add-row">' +
                '<input type="text" id="newTurnStart" placeholder="09:00"> <span>bis</span> <input type="text" id="newTurnEnd" placeholder="09:20">' +
                '<input type="text" id="newTurnTitle" placeholder="Bezeichnung">' +
                '<select id="newTurnGroup"><option>A</option><option>B</option><option>C</option><option>D</option><option>Anfänger</option><option>Rennen</option><option>Pause</option><option>Orga</option></select>' +
                '<button type="button" onclick="window.addCustomTurn()">+ Turn</button>' +
            '</div>' +
            '<div class="schedule-list-head"><h4>Tagesplan (' + escapeHtml(scheduleState.activeDay) + '): <span id="scheduleCount">0</span> Einträge</h4><button type="button" onclick="window.clearSchedule()">Alle Tage leeren</button></div>' +
            '<div id="scheduleItemsContainer"></div>' +
        '</div>';
        bindScheduleEvents();
        renderScheduleRows();
        updateScheduleTimer();
    }

    function loadPdfJsLib() {
        return new Promise(function (resolve, reject) {
            if (window.pdfjsLib) return resolve(window.pdfjsLib);
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = function () {
                if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                resolve(window.pdfjsLib);
            };
            script.onerror = function () { reject(new Error('PDF.js konnte nicht geladen werden.')); };
            document.head.appendChild(script);
        });
    }

    async function extractPdfText(file) {
        const pdfjsLib = await loadPdfJsLib();
        const buffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
        const pages = [];
        for (let p = 1; p <= pdf.numPages; p++) {
            const page = await pdf.getPage(p);
            const content = await page.getTextContent();
            const lines = [];
            content.items.forEach(function (item) {
                const text = item.str ? item.str.trim() : '';
                if (!text) return;
                const x = item.transform ? item.transform[4] : 0;
                const y = item.transform ? item.transform[5] : 0;
                let line = lines.find(function (l) { return Math.abs(l.y - y) <= 5; });
                if (!line) { line = { y: y, items: [] }; lines.push(line); }
                line.items.push({ x: x, text: text });
            });
            lines.sort(function (a, b) { return b.y - a.y; });
            pages.push(lines.map(function (line) {
                line.items.sort(function (a, b) { return a.x - b.x; });
                return line.items.map(function (it) { return it.text; }).join(' ').replace(/\s+/g, ' ').trim();
            }).filter(Boolean).join('\n'));
        }
        return pages.map(function (p, i) { return '--- PAGE ' + (i + 1) + ' ---\n' + p; }).join('\n');
    }

    async function handlePdfFileUpload(e) {
        const file = e.target && e.target.files ? e.target.files[0] : null;
        if (!file || pdfLoading) return;
        const textEl = document.getElementById('scheduleRawText');
        pdfLoading = true;
        try {
            if (file.name.toLowerCase().endsWith('.pdf')) {
                if (textEl) textEl.value = await extractPdfText(file);
            } else {
                if (textEl) textEl.value = await file.text();
            }
            if (textEl && textEl.value.trim()) window.parseScheduleText();
        } catch (err) {
            console.error('[Schedule] PDF-Import:', err);
            alert('Die PDF konnte nicht gelesen werden. Du kannst den Text auch direkt in das Feld kopieren.');
        } finally {
            pdfLoading = false;
        }
    }

    function detectDayFromLine(line) {
        if (/\bMONTAG\b|\bMONDAY\b/i.test(line)) return 'Montag';
        if (/\bDIENSTAG\b|\bTUESDAY\b/i.test(line)) return 'Dienstag';
        if (/\bMITTWOCH\b|\bWEDNESDAY\b/i.test(line)) return 'Mittwoch';
        if (/\bDONNERSTAG\b|\bTHURSDAY\b/i.test(line)) return 'Donnerstag';
        if (/\bFREITAG\b|\bFRIDAY\b/i.test(line)) return 'Freitag';
        if (/\bSAMSTAG\b|\bSATURDAY\b/i.test(line)) return 'Samstag';
        if (/\bSONNTAG\b|\bSUNDAY\b/i.test(line)) return 'Sonntag';
        const m = line.match(/\b(?:TAG|DAY)\s*(\d+)\b/i);
        return m ? 'Tag ' + m[1] : null;
    }

    window.switchScheduleDay = function (dayName) {
        if (!scheduleState.days[dayName]) return;
        scheduleState.activeDay = dayName;
        saveScheduleState();
        renderSchedulePage();
    };

    window.togglePdfImportSection = function () {
        const sec = document.getElementById('pdfImportSection');
        if (sec) sec.style.display = sec.style.display === 'none' ? 'block' : 'none';
    };

    window.addCustomTurn = function () {
        const start = normalizeTime(document.getElementById('newTurnStart')?.value);
        const end = normalizeTime(document.getElementById('newTurnEnd')?.value);
        const title = document.getElementById('newTurnTitle')?.value.trim();
        const group = document.getElementById('newTurnGroup')?.value || 'A';
        if (!start || !title) return alert('Bitte Startzeit und Bezeichnung eingeben!');
        if (!scheduleState.days[scheduleState.activeDay]) scheduleState.days[scheduleState.activeDay] = [];
        scheduleState.days[scheduleState.activeDay].push(normalizeItem({ start, end: end || minutesToTime(timeToMinutes(start) + 20), title, group }));
        saveScheduleState(); renderSchedulePage();
        ['newTurnStart', 'newTurnEnd', 'newTurnTitle'].forEach(function (id) { const el = document.getElementById(id); if (el) el.value = ''; });
    };

    window.deleteTurn = function (index) {
        const items = getCurrentItems().slice().sort(function (a, b) { return timeToMinutes(a.start) - timeToMinutes(b.start); });
        if (items[index]) {
            const target = items[index];
            scheduleState.days[scheduleState.activeDay] = scheduleState.days[scheduleState.activeDay].filter(function (x) { return !(x.start === target.start && x.end === target.end && x.title === target.title && x.group === target.group); });
            saveScheduleState(); renderSchedulePage();
        }
    };

    window.clearSchedule = function () {
        if (!confirm('Möchtest du den Zeitplan für ALLE Tage komplett leeren?')) return;
        scheduleState.days = {};
        scheduleState.activeDay = getTodayName();
        saveScheduleState(); renderSchedulePage(); updateScheduleTimer();
    };

    window.parseScheduleText = function () {
        const textEl = document.getElementById('scheduleRawText');
        const raw = textEl ? textEl.value : '';
        if (!raw.trim()) return alert('Bitte Zeitplan-Text einfügen oder eine PDF auswählen!');

        const parsedDays = {};
        let currentDay = null;
        let fallbackDay = 1;
        let lastEnd = 540;
        const seen = new Set();

        raw.split(/\r?\n/).forEach(function (originalLine) {
            const line = originalLine.replace(/\s+/g, ' ').trim();
            if (!line || /^---\s*PAGE/i.test(line)) return;

            const day = detectDayFromLine(line);
            if (day && !/freies fahren|gruppe [abcd]/i.test(line)) {
                currentDay = day;
                if (!parsedDays[currentDay]) parsedDays[currentDay] = [];
                lastEnd = 540;
                return;
            }

            // Falls die PDF keine Wochentage enthält, werden die gefundenen Blöcke als Tag 1, Tag 2 ... angelegt.
            if (!currentDay) {
                currentDay = 'Tag ' + fallbackDay;
                parsedDays[currentDay] = [];
            }

            const timeData = getTimeParts(line);
            if (!timeData || !timeData.start) return;
            const itemData = processLineTitle(timeData.text);
            if (!itemData) return;

            const startM = timeToMinutes(timeData.start);
            let end = timeData.end;
            let endM = timeToMinutes(end);
            if (!end || !Number.isFinite(endM) || endM <= startM) end = minutesToTime(startM + 20);
            endM = timeToMinutes(end);

            const key = currentDay + '|' + timeData.start + '|' + end + '|' + itemData.group + '|' + itemData.title;
            if (seen.has(key)) return;
            seen.add(key);
            parsedDays[currentDay].push({ start: timeData.start, end, title: itemData.title, group: itemData.group });
            lastEnd = endM;
        });

        Object.keys(parsedDays).forEach(function (day) {
            parsedDays[day].sort(function (a, b) { return timeToMinutes(a.start) - timeToMinutes(b.start); });
        });
        const valid = getOrderedKeys(parsedDays).filter(function (d) { return parsedDays[d].length; });
        if (!valid.length) return alert('Keine passenden Zeitplan-Einträge gefunden. Prüfe, ob Gruppen, Rennen oder Pausen im PDF enthalten sind.');

        scheduleState.days = parsedDays;
        const today = getTodayName();
        scheduleState.activeDay = valid.includes(today) ? today : valid[0];
        saveScheduleState();
        renderSchedulePage();
        updateScheduleTimer();
        window.togglePdfImportSection();
        alert('Zeitplan importiert. Erkannt: ' + valid.join(', '));
    };

    function getOrderedKeys(obj) {
        return Object.keys(obj).sort(function (a, b) {
            const ia = DAY_ORDER.indexOf(a), ib = DAY_ORDER.indexOf(b);
            if (ia < 0 && ib < 0) return a.localeCompare(b, 'de', { numeric: true });
            if (ia < 0) return 1;
            if (ib < 0) return -1;
            return ia - ib;
        });
    }

    window.initScheduleModule = function () {
        scheduleState.days = normalizeDays(scheduleState.days);
        selectBestActiveDay();
        saveScheduleState();
        renderSchedulePage();
        if (!timerInterval) timerInterval = setInterval(updateScheduleTimer, 1000);
        updateScheduleTimer();
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(window.initScheduleModule, 100);
    else document.addEventListener('DOMContentLoaded', function () { window.initScheduleModule(); });
})();
