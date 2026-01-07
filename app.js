/**
 * DATA VIEW PRO - MASTER ENGINE v58.0
 * Features: Faint Shadows, History Tracking, History Review UI
 */

let views = [];
let currentView = null;
let currentRowIndex = 0;
let selectedBoxIdx = null;
let varSearchTerm = ""; 

let draggingElement = null;
let dragIdx = -1;
let offset = { x: 0, y: 0 };

const bgPresets = ['#ffffff','#f8fafc','#f1f5f9','#e2e8f0','#cbd5e1','#94a3b8','#1e293b','#0f172a','#fee2e2','#ffedd5','#fef9c3','#dcfce7','#d1fae5','#dbeafe','#e0e7ff','#f5f3ff','linear-gradient(135deg, #667eea 0%, #764ba2 100%)','linear-gradient(135deg, #00b09b 0%, #96c93d 100%)','linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'];
const textPresets = ['#000000','#ffffff','#ef4444','#3b82f6','#10b981','#f97316','#8b5cf6'];

const iconHome = `<svg viewBox="0 0 24 24" width="24"><path fill="white" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`;
const iconLeft = `<svg viewBox="0 0 24 24" width="24"><path fill="white" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>`;
const iconRight = `<svg viewBox="0 0 24 24" width="24"><path fill="white" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>`;

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('dataView_master_v52');
    if (saved) views = JSON.parse(saved);
    const params = new URLSearchParams(window.location.search);
    const viewId = params.get('view');
    if (viewId) {
        currentView = views.find(v => v.createdAt == viewId);
        if (currentView) startPresentation(); else renderHome();
    } else { renderHome(); }
});

function triggerSave() {
    localStorage.setItem('dataView_master_v52', JSON.stringify(views));
    const badge = document.getElementById('save-badge');
    if (badge) { badge.style.opacity = "1"; setTimeout(() => badge.style.opacity = "0", 1000); }
}

// --- NAVIGATION ---
function renderHome() {
    const app = document.getElementById('app');
    app.innerHTML = `<div class="home-container"><h1 class="main-heading">Data View Pro</h1><button class="primary-btn" onclick="createNewView()">+ Create New View</button><div id="view-list" style="margin-top:40px;"></div></div>`;
    views.forEach(v => {
        const d = document.createElement('div'); d.className = 'view-card';
        d.innerHTML = `<strong>${v.name}</strong><button class="blue-btn" onclick="openMenu('${v.createdAt}')">Open View</button>`;
        document.getElementById('view-list').appendChild(d);
    });
}

function openMenu(id) {
    currentView = views.find(v => v.createdAt == id);
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="home-container">
            <button class="blue-btn" style="background:var(--slate); margin-bottom:20px; align-self:flex-start;" onclick="renderHome()">← Back</button>
            <h1 class="main-heading" style="margin-top:0;">${currentView.name}</h1>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
                <button class="blue-btn" style="height:120px;" onclick="renderEditCanvas()">Edit Layout</button>
                <button class="blue-btn" style="height:120px;" onclick="openPresentationTab('${id}')">Present Mode</button>
                <button class="orange-btn" style="height:120px; background:var(--slate);" onclick="renderHistoryView()">View History Log</button>
                <button class="orange-btn" style="height:120px;" onclick="exportFinalFiles()">Export Pack</button>
                <button class="danger-btn" style="height:120px; grid-column: span 2;" onclick="deleteView('${id}')">Delete View</button>
            </div>
        </div>`;
}

// --- HISTORY VIEW ---
function renderHistoryView() {
    const app = document.getElementById('app');
    const history = currentView.history || [];
    const rows = history.length > 0 ? history.map(h => `
        <tr>
            <td>${h.timestamp}</td>
            <td><strong>Row ${h.rowNumber}</strong></td>
            <td><span style="color:var(--slate)">${h.column}</span></td>
            <td style="color:var(--danger-grad); text-decoration:line-through;">${h.oldValue}</td>
            <td style="color:#10b981; font-weight:800;">${h.newValue}</td>
        </tr>`).join('') : '<tr><td colspan="5" style="text-align:center; padding:40px;">No history recorded.</td></tr>';

    app.innerHTML = `
        <div class="home-container" style="width:90%; max-width:1000px;">
            <button class="blue-btn" style="background:var(--slate); margin-bottom:20px; align-self:flex-start;" onclick="openMenu('${currentView.createdAt}')">← Back</button>
            <h1 class="main-heading" style="text-align:left;">Edit History</h1>
            <table class="history-table">
                <thead><tr><th>Time</th><th>Row</th><th>Field</th><th>Old</th><th>New</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
            <div style="margin-top:20px; display:flex; gap:10px;">
                <button class="danger-btn" onclick="currentView.history=[]; triggerSave(); renderHistoryView();">Clear Log</button>
            </div>
        </div>`;
}

// --- PRESENTATION & EDITING ---
function editLiveValue(idx) {
    const box = currentView.boxes[idx];
    const colKey = box.textVal;
    const oldVal = currentView.data[currentRowIndex][colKey] || '---';
    const newVal = prompt(`Edit Row ${currentRowIndex + 1} - ${colKey}:`, oldVal);
    
    if (newVal !== null && newVal !== oldVal) {
        if (!currentView.history) currentView.history = [];
        currentView.history.push({
            timestamp: new Date().toLocaleTimeString(),
            rowNumber: currentRowIndex + 1,
            column: colKey,
            oldValue: oldVal,
            newValue: newVal
        });
        currentView.data[currentRowIndex][colKey] = newVal;
        triggerSave(); closePop(); renderSlideContent();
    }
}

// --- EXPORT ---
function exportFinalFiles() {
    if (!currentView.data.length) return alert("No data");
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(currentView.data);
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${currentView.name}_Updated.xlsx`);

    const log = (currentView.history || []).map(h => `[${h.timestamp}] Row ${h.rowNumber} | ${h.column}: ${h.oldValue} -> ${h.newValue}`).join('\n');
    if (log) {
        const blob = new Blob([log], { type: 'text/plain' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${currentView.name}_Log.txt`; a.click();
    }
}

// (Keep all other utility functions: renderEditCanvas, drawBoxes, startPresentation, etc. from your previous app.js)

function openPresentationTab(id) { window.open(window.location.origin + window.location.pathname + '?view=' + id, '_blank'); }
function closePop() { const p = document.querySelector('.popup-overlay'); if(p) p.remove(); }
function createNewView() { const name = prompt("Name:"); if(name) { currentView = { name, createdAt: Date.now(), boxes: [], data: [], headers: [], history: [] }; views.push(currentView); triggerSave(); renderHome(); } }
