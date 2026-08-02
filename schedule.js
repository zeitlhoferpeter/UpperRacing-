// schedule.js - UpperRacing Zeitplan & Smart Live-Turn-Timer Modul

(function() {
    // 1. LocalStorage Initialisierung
    let initialDays = { 'Montag': [] };
    try {
        const savedDays = localStorage.getItem('upper_schedule_days');
        if (savedDays) {
            const parsed = JSON.parse(savedDays);
            if (parsed && typeof parsed === 'object') {
                initialDays = parsed;
            }
        }
    } catch (e) {
        console.warn('[Schedule] Fehler beim Lesen von upper_schedule_days:', e);
    }

    let scheduleState = {
        myGroup: localStorage.getItem('upper_schedule_mygroup') || 'A',
        alert10m: localStorage.getItem('upper_schedule_alert10m') !== 'false',
        alert5m: localStorage.getItem('upper_schedule_alert5m') !== 'false',
        activeDay: localStorage.getItem('upper_schedule_activeday') || 'Montag',
        days: initialDays
    };

    let timerInterval = null;

    // 2. Hilfsfunktionen
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

    function getCurrentItems() {
        if (!scheduleState.days || typeof scheduleState.days !== 'object') {
            scheduleState.days = { 'Montag': [] };
        }
        if (!scheduleState.days[scheduleState.activeDay]) {
            const firstDay = Object.keys(scheduleState.days)[0];
            if (firstDay) {
                scheduleState.activeDay = firstDay;
            } else {
                return [];
            }
        }
        return scheduleState.days[scheduleState.activeDay] || [];
    }

    function timeToMinutes(timeStr) {
        if (!timeStr) return 0;
        const normalized = String(timeStr).replace('.', ':');
        const parts = normalized.split(':');
        const h = Number(parts[0]) || 0;
        const m = Number(parts[1]) || 0;
        return h * 60 + m;
    }

    function minutesToTime(totalMins) {
        const validMins = Math.max(0, Number(totalMins) || 0);
        const h = Math.floor(validMins / 60) % 24;
        const m = validMins % 60;
        return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    }

    function processLineTitle(rawTitle) {
        if (!rawTitle) return null;
        let title = String(rawTitle).trim();
        if (!title) return null;
        
        if (title.indexOf('/') !== -1) {
            const parts = title.split('/');
            const dePart = parts.find(function(p) {
                return /anmeldung|fahrerbesprechung|anfängerkurs|theorie|praxis|gruppe|freies fahren|rennen|mittag|pause|lunch|siegerehrung/i.test(p);
            });
            title = dePart ? dePart.trim() : parts[0].trim();
        }

        const t = title.toUpperCase();

        if (t.startsWith('QUALIFYING:') || t.startsWith('LETZTES QUALIFYING:') || t.indexOf('ANMELDUNG ZU DEN RENNEN') !== -1 || t.indexOf('REGISTRATION FOR ALL') !== -1 || t.indexOf('ZEITNAHME ENDE') !== -1) {
            return null;
        }

        if (t.indexOf('MITTAG') !== -1 || t.indexOf('PAUSE') !== -1 || t.indexOf('LUNCH') !== -1 || t.indexOf('ESSEN') !== -1) {
            return { title: 'Mittagspause', group: 'Pause' };
        }
        if (t.indexOf('FAHRERBESPRECHUNG') !== -1) {
            return { title: 'Fahrerbesprechung', group: 'Orga' };
        }
        if (t.indexOf('ANFÄNGERKURS THEORIE') !== -1 || (t.indexOf('THEORIE') !== -1 && t.indexOf('PRAXIS') === -1)) {
            return { title: 'Anfängerkurs Theorie', group: 'Anfänger' };
        }
        if (t.indexOf('ANFÄNGERKURS PRAXIS') !== -1 || t.indexOf('PRAXIS') !== -1) {
            return { title: 'Anfängerkurs Praxis', group: 'Anfänger' };
        }
        if (t.indexOf('SIEGEREHRUNG') !== -1 || t.indexOf('PRICEGIVING') !== -1) {
            return { title: 'Siegerehrung', group: 'Orga' };
        }
        if (t.indexOf('ALLE GRUPPEN') !== -1 || t.indexOf('A+B+C+D') !== -1) {
            return { title: 'Freies Fahren (Alle)', group: 'A' };
        }
        if (t.indexOf('GRUPPE A') !== -1 || t.indexOf('GR. A') !== -1 || t.indexOf('SLOWER GROUP A') !== -1) {
            return { title: 'Freies Fahren Gruppe A', group: 'A' };
        }
        if (t.indexOf('GRUPPE B') !== -1 || t.indexOf('GR. B') !== -1 || t.indexOf('FASTER GROUP B') !== -1) {
            return { title: 'Freies Fahren Gruppe B', group: 'B' };
        }
        if (t.indexOf('GRUPPE C') !== -1 || t.indexOf('GR. C') !== -1 || t.indexOf('FAST GROUP C') !== -1) {
            return { title: 'Freies Fahren Gruppe C', group: 'C' };
        }
        if (t.indexOf('GRUPPE D') !== -1 || t.indexOf('GR. D') !== -1 || t.indexOf('VERY FAST GROUP D') !== -1) {
            return { title: 'Freies Fahren Gruppe D', group: 'D' };
        }
        if (t.indexOf('CLASSIC') !== -1) return { title: 'Classic Race', group: 'Rennen' };
        if (t.indexOf('ROOKIE') !== -1) return { title: 'Rookie Race', group: 'Rennen' };
        if (t.indexOf('SBK') !== -1) return { title: 'SBK Race', group: 'Rennen' };
        if (t.indexOf('SSP') !== -1) return { title: 'SSP Race', group: 'Rennen' };
        if (t.indexOf('B-RACE') !== -1) return { title: 'B-Race', group: 'Rennen' };
        if (t.indexOf('RENNEN') !== -1 || t.indexOf('RACE') !== -1) {
            let clean = title.split(';')[0].split(',')[0].trim();
            return { title: clean, group: 'Rennen' };
        }

        return null;
    }

    // 3. Smart Header Alerting & Live-Countdown Update
    function updateHeaderWidget(activeTurn, nextTurn, minsToNextMyTurn) {
        const badgeEl = document.getElementById('headerScheduleBadge');
        const groupLabelEl = document.getElementById('currentGroupLabel');
        const countdownEl = document.getElementById('currentTurnCountdown');

        if (!badgeEl || !groupLabelEl || !countdownEl) return;

        const pad = function(n) { return String(n).padStart(2, '0'); };

        if (activeTurn) {
            groupLabelEl.textContent = `TURN ${activeTurn.group}`;
            countdownEl.textContent = `${pad(activeTurn.remainingMins)}:${pad(activeTurn.remainingSecs)}`;
        } else if (nextTurn) {
            groupLabelEl.textContent = `NÄCHSTER: ${nextTurn.group}`;
            const remainingMins = Math.floor(nextTurn.diffMins);
            const remainingSecs = 60 - (new Date().getSeconds());
            countdownEl.textContent = `${pad(remainingMins)}:${pad(remainingSecs % 60)}`;
        } else {
            groupLabelEl.textContent = 'TURN --';
            countdownEl.textContent = '--:--';
        }

        // Smart Alerting Zustände (Orange Glow / Rotes Blinken)
        badgeEl.classList.remove('alert-warning', 'alert-danger');
        document.body.classList.remove('screen-alert-red');

        if (minsToNextMyTurn <= 5 && minsToNextMyTurn > 0) {
            if (scheduleState.alert10m) badgeEl.classList.add('alert-danger');
            if (scheduleState.alert5m) document.body.classList.add('screen-alert-red');
        } else if (minsToNextMyTurn <= 10 && minsToNextMyTurn > 5) {
            if (scheduleState.alert10m) badgeEl.classList.add('alert-warning');
        }
    }

    function updateScheduleViewHighlight(activeTurn, currentMins) {
        const container = document.getElementById('scheduleItemsContainer');
        if (!container) return;

        const rows = container.querySelectorAll('.schedule-row');
        rows.forEach(function(row) {
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

    function updateScheduleTimer() {
        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();
        const currentSecs = now.getSeconds();

        let activeTurn = null;
        let nextTurn = null;
        let minsToNextMyTurn = Infinity;

        const items = getCurrentItems();
        const sorted = items.slice().sort(function(a, b) {
            return timeToMinutes(a.start) - timeToMinutes(b.start);
        });

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
                activeTurn = Object.assign({}, item, { remainingMins: remainingMins, remainingSecs: remainingSecs, endM: endM });
            }

            if (startM > currentMins && !nextTurn) {
                const diffMins = startM - currentMins;
                nextTurn = Object.assign({}, item, { startM: startM, diffMins: diffMins });
            }

            const isMyTurn = (scheduleState.myGroup === 'ALL' || item.group === scheduleState.myGroup || (item.group === 'Rennen' && scheduleState.myGroup !== 'Pause'));
            if (isMyTurn && startM > currentMins) {
                const diffM = startM - currentMins;
                if (diffM < minsToNextMyTurn) {
                    minsToNextMyTurn = diffM;
                }
            }
        }

        updateHeaderWidget(activeTurn, nextTurn, minsToNextMyTurn);
        updateScheduleViewHighlight(activeTurn, currentMins);
    }

    // 4. Rendering & Event Binding
    function renderScheduleRows() {
        const container = document.getElementById('scheduleItemsContainer');
        const countEl = document.getElementById('scheduleCount');
        if (!container) return;

        const currentItems = getCurrentItems();
        if (countEl) countEl.textContent = String(currentItems.length);

        if (currentItems.length === 0) {
            container.innerHTML = '<p style="font-size:0.8rem; color:#888; text-align:center; padding:15px;">Kein Zeitplan geladen. Bitte PDF oder Text importieren.</p>';
            return;
        }

        const sorted = currentItems.slice().sort(function(a, b) {
            return timeToMinutes(a.start) - timeToMinutes(b.start);
        });
        let html = '';

        sorted.forEach(function(item, index) {
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

            html += '<div class="schedule-row ' + (isMyGroup ? 'row-my-group' : '') + '" data-startm="' + startM + '" data-endm="' + endM + '" data-group="' + item.group + '">' +
                '<div style="font-weight:bold; width:85px; font-size:0.85rem; color:#fff;">' + item.start + ' - ' + (item.end || minutesToTime(endM)) + '</div>' +
                '<div style="flex:1; font-size:0.85rem; padding:0 6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + item.title + '</div>' +
                '<span style="background:' + groupColor + '; color:#fff; font-size:0.7rem; font-weight:bold; padding:2px 6px; border-radius:3px; margin-right:6px;">' + item.group + '</span>' +
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
        if (pdfFileEl) {
            pdfFileEl.onchange = handlePdfFileUpload;
        }
    }

    function renderSchedulePage() {
        const container = document.getElementById('pageSchedule');
        if (!container) return;

        const dayKeys = Object.keys(scheduleState.days);
        let dayButtonsHtml = '';

        dayKeys.forEach(function(dayName) {
            const isActive = dayName === scheduleState.activeDay;
            dayButtonsHtml += '<button type="button" onclick="window.switchScheduleDay(\'' + dayName + '\')" ' +
                'style="padding:6px 14px; border-radius:4px; font-weight:bold; font-size:0.8rem; cursor:pointer; ' +
                'border:' + (isActive ? '2px solid #FFD700' : '1px solid #444') + '; ' +
                'background:' + (isActive ? '#FFD700' : '#222') + '; ' +
                'color:' + (isActive ? '#000' : '#fff') + ';">' +
                '📅 ' + dayName +
                '</button> ';
        });

        let html = '<div class="setup-box">' +
            '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">' +
                '<h3 style="margin:0; font-size:1.1rem; color:#FFD700;">⏱️ Live-Zeitplan & Alarm</h3>' +
            '</div>' +

            '<div style="background:#1e1e1e; padding:10px; border-radius:6px; margin-bottom:12px; border:1px solid #333;">' +
                '<div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:8px;">' +
                    '<label style="font-size:0.85rem; font-weight:bold; color:#fff;">Meine Gruppe:</label>' +
                    '<select id="scheduleMyGroupSelect" style="width:auto; padding:4px 10px; font-weight:bold; background:#333; color:#FFD700; border-color:#FFD700;">' +
                        '<option value="A" ' + (scheduleState.myGroup==='A'?'selected':'') + '>Gruppe A (Langsamer)</option>' +
                        '<option value="B" ' + (scheduleState.myGroup==='B'?'selected':'') + '>Gruppe B (Schneller)</option>' +
                        '<option value="C" ' + (scheduleState.myGroup==='C'?'selected':'') + '>Gruppe C (Raser)</option>' +
                        '<option value="D" ' + (scheduleState.myGroup==='D'?'selected':'') + '>Gruppe D (Sehr Schnell)</option>' +
                        '<option value="ALL" ' + (scheduleState.myGroup==='ALL'?'selected':'') + '>Alle Turn-Erinnerungen</option>' +
                    '</select>' +
                '</div>' +

                '<div style="display:flex; flex-direction:column; gap:6px; font-size:0.8rem; border-top:1px solid #333; padding-top:8px;">' +
                    '<label style="display:flex; align-items:center; gap:8px; cursor:pointer;">' +
                        '<input type="checkbox" id="alert10mToggle" ' + (scheduleState.alert10m ? 'checked' : '') + ' style="width:16px; height:16px; accent-color:#ff9800;">' +
                        '<span>✨ <strong>10 Min. vor eigenem Turn:</strong> Badge im Header orangener Glow</span>' +
                    '</label>' +
                    '<label style="display:flex; align-items:center; gap:8px; cursor:pointer;">' +
                        '<input type="checkbox" id="alert5mToggle" ' + (scheduleState.alert5m ? 'checked' : '') + ' style="width:16px; height:16px; accent-color:#f44336;">' +
                        '<span>🚨 <strong>5 Min. vor eigenem Turn:</strong> Badge & Bildschirmrand ROT blinken</span>' +
                    '</label>' +
                '</div>' +
            '</div>' +

            '<div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap; align-items:center;">' +
                dayButtonsHtml +
                '<button type="button" onclick="window.togglePdfImportSection()" style="margin-left:auto; background:#2196F3; color:#fff; border:none; padding:6px 12px; border-radius:4px; font-size:0.75rem; cursor:pointer;">📄 PDF Importieren</button>' +
            '</div>' +

            '<div id="pdfImportSection" style="display:none; background:#181818; padding:10px; border-radius:6px; margin-bottom:12px; border:1px dashed #2196F3;">' +
                '<h4 style="margin:0 0 8px 0; font-size:0.85rem; color:#2196F3;">Zeitplan importieren</h4>' +
                '<div style="margin-bottom:8px;">' +
                    '<input type="file" id="schedulePdfFile" accept=".pdf,.txt" style="font-size:0.75rem;">' +
                '</div>' +
                '<textarea id="scheduleRawText" rows="4" placeholder="Oder kopierten Zeitplan-Text hier einfügen..." style="width:100%; font-size:0.8rem; margin-bottom:6px;"></textarea>' +
                '<div style="display:flex; gap:6px;">' +
                    '<button type="button" onclick="window.parseScheduleText()" style="flex:1; background:#4CAF50; color:#fff; border:none; padding:8px; border-radius:4px; font-size:0.8rem; font-weight:bold; cursor:pointer;">⚡ Text analysieren & übernehmen</button>' +
                '</div>' +
            '</div>' +

            '<div style="background:#222; padding:8px; border-radius:6px; margin-bottom:12px;">' +
                '<div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">' +
                    '<input type="text" id="newTurnStart" placeholder="09:00" style="width:60px; text-align:center;">' +
                    '<span>bis</span>' +
                    '<input type="text" id="newTurnEnd" placeholder="09:20" style="width:60px; text-align:center;">' +
                    '<input type="text" id="newTurnTitle" placeholder="Bezeichnung (z.B. Turn 1 Gruppe A)" style="flex:1; min-width:120px;">' +
                    '<select id="newTurnGroup" style="width:90px;">' +
                        '<option value="A">Gruppe A</option>' +
                        '<option value="B">Gruppe B</option>' +
                        '<option value="C">Gruppe C</option>' +
                        '<option value="D">Gruppe D</option>' +
                        '<option value="Anfänger">Anfänger</option>' +
                        '<option value="Rennen">Rennen</option>' +
                        '<option value="Pause">Pause</option>' +
                        '<option value="Orga">Orga</option>' +
                    '</select>' +
                    '<button type="button" onclick="window.addCustomTurn()" style="background:#4CAF50; color:#fff; border:none; padding:8px 12px; border-radius:4px; cursor:pointer; font-size:0.8rem;">+ Turn</button>' +
                '</div>' +
            '</div>' +

            '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">' +
                '<h4 style="margin:0; font-size:0.9rem;">Tagesplan (' + scheduleState.activeDay + '): <span id="scheduleCount">0</span> Turns</h4>' +
                '<button type="button" onclick="window.clearSchedule()" style="background:none; border:none; color:#f44336; cursor:pointer; font-size:0.8rem;">Alle Tage leeren</button>' +
            '</div>' +

            '<div id="scheduleItemsContainer" style="display:flex; flex-direction:column; gap:6px;"></div>' +
        '</div>';

        container.innerHTML = html;
        bindScheduleEvents();
        renderScheduleRows();
        updateScheduleTimer();
    }

    // 5. PDF-Parsing
    function loadPdfJsLib() {
        return new Promise(function(resolve, reject) {
            if (window.pdfjsLib) return resolve(window.pdfjsLib);
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.onload = function() {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                resolve(window.pdfjsLib);
            };
            script.onerror = function() { reject(new Error('PDF.js Ladefehler')); };
            document.head.appendChild(script);
        });
    }

    function handlePdfFileUpload(e) {
        const file = e.target && e.target.files ? e.target.files[0] : null;
        if (!file) return;

        const textEl = document.getElementById('scheduleRawText');

        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            if (typeof showNotice === 'function') showNotice('saveNotice', 'PDF wird verarbeitet...');

            loadPdfJsLib().then(function(pdfjsLib) {
                return file.arrayBuffer().then(function(arrayBuffer) {
                    return pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                });
            }).then(function(pdf) {
                let pagePromises = [];
                for (let i = 1; i <= pdf.numPages; i++) {
                    pagePromises.push(pdf.getPage(i).then(function(page) {
                        return page.getTextContent().then(function(textContent) {
                            const linesMap = [];
                            textContent.items.forEach(function(item) {
                                const text = item.str ? item.str.trim() : '';
                                if (!text) return;
                                const x = item.transform[4];
                                const y = item.transform[5];

                                let line = linesMap.find(function(l) { return Math.abs(l.y - y) <= 8; });
                                if (!line) {
                                    line = { y: y, items: [] };
                                    linesMap.push(line);
                                }
                                line.items.push({ x: x, text: text });
                            });

                            linesMap.sort(function(a, b) { return b.y - a.y; });
                            let pageText = '\n--- PAGE ' + i + ' ---\n';
                            linesMap.forEach(function(line) {
                                line.items.sort(function(a, b) { return a.x - b.x; });
                                const lineStr = line.items.map(function(it) { return it.text; }).join(' ').trim();
                                if (lineStr) pageText += lineStr + '\n';
                            });
                            return pageText;
                        });
                    }));
                }
                return Promise.all(pagePromises);
            }).then(function(pagesTextArray) {
                const fullText = pagesTextArray.join('\n');
                if (textEl) {
                    textEl.value = fullText.trim();
                    window.parseScheduleText();
                }
            }).catch(function(err) {
                console.error('[Schedule] PDF Parse Fehler:', err);
                alert('Fehler beim Lesen der PDF-Datei.');
            });
        } else {
            const reader = new FileReader();
            reader.onload = function(evt) {
                if (textEl && evt.target) {
                    textEl.value = evt.target.result;
                    window.parseScheduleText();
                }
            };
            reader.readAsText(file);
        }
    }

    // 6. Globale Handlungen
    window.switchScheduleDay = function(dayName) {
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

        const start = startEl ? startEl.value.trim() : '';
        const end = endEl ? endEl.value.trim() : '';
        const title = titleEl ? titleEl.value.trim() : '';
        const group = groupEl ? groupEl.value : 'A';

        if (!start || !title) {
            alert('Bitte Startzeit und Bezeichnung eingeben!');
            return;
        }

        if (!scheduleState.days[scheduleState.activeDay]) {
            scheduleState.days[scheduleState.activeDay] = [];
        }

        scheduleState.days[scheduleState.activeDay].push({
            start: start,
            end: end || minutesToTime(timeToMinutes(start) + 20),
            title: title,
            group: group
        });
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
        if (confirm("Möchtest du den Zeitplan für ALLE Tage leeren?")) {
            scheduleState.days = { 'Montag': [] };
            scheduleState.activeDay = 'Montag';
            saveScheduleState();
            renderSchedulePage();
            updateScheduleTimer();
        }
    };

    window.parseScheduleText = function() {
        const textEl = document.getElementById('scheduleRawText');
        const raw = textEl ? textEl.value : '';
        if (!raw || raw.trim() === '') {
            alert('Bitte Zeitplan-Text einfügen!');
            return;
        }

        const lines = raw.split('\n');
        const parsedDays = {};
        
        let dayCounter = 1;
        let currentDayKey = "Montag";
        parsedDays[currentDayKey] = [];

        const dayRegex = /(?:Program:\s*)?(MONTAG|DIENSTAG|MITTWOCH|DONNERSTAG|FREITAG|SAMSTAG|SONNTAG|TAG\s*\d+|DAY\s*\d+)/i;
        const rangeTimeRegex = /^(\d{1,2}[:.]\d{2})\s*(?:-|bis)\s*(\d{1,2}[:.]\d{2})\s+(.+)/i;
        const singleTimeRegex = /^(\d{1,2}[:.]\d{2})\s+(.+)/i;
        const nextTimeRegex = /^(next\s*Race|next\s*-\s*(\d{1,2}[:.]\d{2})|next)\s+(.+)/i;

        let lastEndMins = 540;
        let seenInDay = new Set(); 

        lines.forEach(function(line) {
            const cleanLine = line.trim();
            if (!cleanLine) return;

            const dayMatch = cleanLine.match(dayRegex);
            if (dayMatch && !cleanLine.includes('freies Fahren') && !cleanLine.includes('Anmeldung')) {
                let detectedStr = dayMatch[1].toUpperCase();
                let dayName = detectedStr;
                if (detectedStr.includes('MONTAG')) dayName = 'Montag';
                else if (detectedStr.includes('DIENSTAG')) dayName = 'Dienstag';
                else if (detectedStr.includes('MITTWOCH')) dayName = 'Mittwoch';
                else if (detectedStr.includes('DONNERSTAG')) dayName = 'Donnerstag';
                else if (detectedStr.includes('FREITAG')) dayName = 'Freitag';
                else if (detectedStr.includes('SAMSTAG')) dayName = 'Samstag';
                else if (detectedStr.includes('SONNTAG')) dayName = 'Sonntag';
                else dayName = 'Tag ' + (dayCounter++);

                currentDayKey = dayName;
                if (!parsedDays[currentDayKey]) parsedDays[currentDayKey] = [];
                lastEndMins = 540;
                seenInDay.clear();
                return;
            }

            let start = '', end = '', rawTitle = '';
            const rangeMatch = cleanLine.match(rangeTimeRegex);
            const singleMatch = cleanLine.match(singleTimeRegex);
            const nextMatch = cleanLine.match(nextTimeRegex);

            if (rangeMatch) {
                start = rangeMatch[1].replace('.', ':').padStart(5, '0');
                end = rangeMatch[2].replace('.', ':').padStart(5, '0');
                rawTitle = rangeMatch[3].trim();
            } else if (singleMatch) {
                start = singleMatch[1].replace('.', ':').padStart(5, '0');
                rawTitle = singleMatch[2].trim();
            } else if (nextMatch) {
                start = minutesToTime(lastEndMins);
                if (nextMatch[2]) end = nextMatch[2].replace('.', ':').padStart(5, '0');
                rawTitle = nextMatch[3].trim();
            } else {
                return;
            }

            const itemData = processLineTitle(rawTitle);
            if (!itemData) return;

            const startMins = timeToMinutes(start);
            let endMins = end ? timeToMinutes(end) : (startMins + 20);
            if (endMins <= startMins) endMins = startMins + 20;

            const uniqKey = start + '_' + itemData.group + '_' + itemData.title;
            if (seenInDay.has(uniqKey)) return;
            seenInDay.add(uniqKey);

            parsedDays[currentDayKey].push({
                start: start,
                end: end || minutesToTime(endMins),
                title: itemData.title,
                group: itemData.group
            });

            lastEndMins = endMins;
        });

        const validDayKeys = Object.keys(parsedDays).filter(function(k) {
            return parsedDays[k].length > 0;
        });

        if (validDayKeys.length > 0) {
            const cleanDaysObj = {};
            validDayKeys.forEach(function(k) { cleanDaysObj[k] = parsedDays[k]; });

            scheduleState.days = cleanDaysObj;
            scheduleState.activeDay = validDayKeys[0];
            saveScheduleState();
            renderSchedulePage();
            updateScheduleTimer();
            alert('Zeitplan erfolgreich importiert!');
            window.togglePdfImportSection();
        } else {
            alert('Keine passenden Turns gefunden.');
        }
    };

    window.initScheduleModule = function() {
        renderSchedulePage();
        if (!timerInterval) {
            timerInterval = setInterval(updateScheduleTimer, 1000);
        }
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
