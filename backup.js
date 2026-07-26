// backup.js - UpperRacing Backup & Restore

function initBackup() {
    checkDailyBackupReminder();
    renderInternalBackups();
}

// 1. Backup erstellen (Datei-Download + Speicherung in interner Liste)
function exportBackup() {
    try {
        let data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            data[key] = localStorage.getItem(key);
        }

        // A) Datei-Download für den Notfall
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const downloadAnchor = document.createElement('a');
        const dateStr = new Date().toISOString().split('T')[0];
        const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
        
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `UpperRacing_Backup_${dateStr}_${timeStr}.json`);
        
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();

        // B) Intern in der App abspeichern (Maximal 5 Stück)
        saveInternalBackup(data);

        // Status aktualisieren
        localStorage.setItem('upper_last_backup_date', dateStr);
        localStorage.removeItem('upper_has_new_changes');
        
        const banner = document.getElementById('backupReminderBanner');
        if (banner) banner.style.display = 'none';

        showNotice('saveNoticeBackup', 'Backup erstellt & intern gespeichert!');
        renderInternalBackups();
    } catch (e) {
        console.error("Backup-Fehler:", e);
        alert("Fehler beim Erstellen des Backups.");
    }
}

// Interne Historie aktualisieren (behält die letzten 5)
function saveInternalBackup(data) {
    let history = [];
    try {
        const saved = localStorage.getItem('upper_internal_backups');
        if (saved) history = JSON.parse(saved);
    } catch(e) {}

    const now = new Date();
    const timestamp = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    history.unshift({
        timestamp: timestamp,
        data: data
    });

    if (history.length > 5) {
        history = history.slice(0, 5);
    }

    localStorage.setItem('upper_internal_backups', JSON.stringify(history));
}

// Interne Backups als Liste auf der Backup-Seite anzeigen
function renderInternalBackups() {
    const container = document.getElementById('internalBackupsContainer');
    if (!container) return;

    let history = [];
    try {
        const saved = localStorage.getItem('upper_internal_backups');
        if (saved) history = JSON.parse(saved);
    } catch(e) {}

    if (history.length === 0) {
        container.innerHTML = '<p style="font-size:0.8rem; color:#aaa; margin:0;">Noch keine internen Backups vorhanden.</p>';
        return;
    }

    let html = '<div style="display:flex; flex-direction:column; gap:6px;">';
    history.forEach((item, index) => {
        html += `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#181818; padding:6px 8px; border-radius:4px; border:1px solid #333;">
                <span style="font-size:0.8rem; color:#fff;">🕒 ${item.timestamp}</span>
                <button type="button" onclick="restoreInternalBackup(${index})" style="background:#2196F3; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:0.75rem;">Wiederherstellen</button>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// Ein internes Backup per Klick wiederherstellen
function restoreInternalBackup(index) {
    let history = [];
    try {
        const saved = localStorage.getItem('upper_internal_backups');
        if (saved) history = JSON.parse(saved);
    } catch(e) {}

    if (!history[index]) return;

    if (confirm(`Möchtest du das Backup vom "${history[index].timestamp}" wirklich wiederherstellen? Aktuelle Daten werden überschrieben!`)) {
        const data = history[index].data;
        localStorage.clear();
        for (const key in data) {
            localStorage.setItem(key, data[key]);
        }
        alert("Backup erfolgreich wiederhergestellt! Die App wird jetzt neu geladen.");
        location.reload();
    }
}

// 2. Klassischer Datei-Import (für Wechsel auf ein anderes Gerät)
function importBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (confirm("Möchtest du dieses Backup wirklich einspielen? Alle aktuellen lokalen Daten werden dabei überschrieben!")) {
                localStorage.clear();
                for (const key in data) {
                    localStorage.setItem(key, data[key]);
                }
                alert("Backup erfolgreich wiederhergestellt! Die App wird jetzt neu geladen.");
                location.reload();
            }
        } catch (err) {
            console.error("Import-Fehler:", err);
            alert("Fehler beim Lesen der Datei. Ungültiges Backup-Format.");
        }
    };
    reader.readAsText(file);
}

// 3. Nur dann erinnern, wenn heute neue Einträge gemacht wurden
function checkDailyBackupReminder() {
    const lastBackupDate = localStorage.getItem('upper_last_backup_date');
    const today = new Date().toISOString().split('T')[0];
    const hasNewChanges = localStorage.getItem('upper_has_new_changes');

    const banner = document.getElementById('backupReminderBanner');
    if (!banner) return;

    if (hasNewChanges === 'true' && lastBackupDate !== today) {
        banner.style.display = 'block';
    } else {
        banner.style.display = 'none';
    }
}

function markDataAsChanged() {
    localStorage.setItem('upper_has_new_changes', 'true');
}
