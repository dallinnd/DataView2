/**
 * DATA VIEW PRO - MASTER ENGINE v60.0
 * Features: Cross-Tab Sync, Row-Specific Edits, Dynamic Modal, & Focused Sidebar
 */

let views = [];
let currentView = null;
let currentRowIndex = 0;
let selectedBoxIdx = null;
let varSearchTerm = ""; 

let draggingElement = null;
let dragIdx = -1;
let dragStartX, dragStartY;
let offset = { x: 0, y: 0 };

const bgPresets = ['#ffffff','#f8fafc','#f1f5f9','#e2e8f0','#cbd5e1','#94a3b8','#1e293b','#0f172a','#fee2e2','#ffedd5','#fef9c3','#dcfce7','#d1fae5','#dbeafe','#e0e7ff','#f5f3ff','linear-gradient(135deg, #667eea 0%, #764ba2 100%)','linear-gradient(135deg, #00b09b 0%, #96c93d 100%)','linear-gradient(135deg, #f093fb 0%, #f5576c 100%)','linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'];
const textPresets = ['#000000','#ffffff','#ef4444','#3b82f6','#10b981','#f97316','#8b5cf6','#ec4899'];

// --- STORAGE & SYNC ENGINE ---
function loadFromStorage() {
    const saved = localStorage.getItem('dataView_master_v52');
    if (saved) views = JSON.parse(saved);
}

function triggerSave() {
    localStorage.setItem('dataView_master_v52', JSON.stringify(views));
    const badge = document.getElementById('save-badge');
    if (badge) { badge.style.opacity = "1"; setTimeout(() => badge.style.opacity = "0", 1000); }
}

// Syncs data if edited in another tab (Presentation tab)

window.addEventListener('storage', (e) => {
    if (e.key === 'dataView_master_v52') {
        loadFromStorage();
        if (currentView) {
            currentView = views.find(v => v.createdAt == currentView.createdAt);
            const status = document.getElementById('status-info');
            if (status) status.innerText = `Rows: ${currentView.data.length} | Edits Saved: ${currentView.history ? currentView.history.length : 0}`;
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    loadFromStorage();
    const params = new URLSearchParams(window.location.search);
    const viewId = params.get('view');
    if (viewId) {
        currentView = views.find(v => v.createdAt == viewId);
        if (currentView) startPresentation(); else renderHome();
    } else { renderHome(); }
});

// --- MENU NAVIGATION ---
function renderHome() {
    selectedBoxIdx = null;
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
                <button class="blue-btn" style="height:140px; font-size:1.2rem;" onclick="renderEditCanvas()">Edit Layout</button>
                <button class="blue-btn" style="height:140px; font-size:1.2rem;" onclick="openPresentationTab('${id}')">Present Mode</button>
                <button class="orange-btn" style="height:140px; font-size:1.2rem;" onclick="exportFinalFiles()">Export Data Pack</button>
                <button class="danger-btn" style="height:140px; font-size:1.2rem;" onclick="deleteView('${id}')">Delete View</button>
            </div>
            <div id="status-info" style="margin-top: 20px; color: var(--slate); font-size: 0.9rem;">
                Rows: ${currentView.data ? currentView.data.length : 0} | Edits Saved: ${currentView.history ? currentView.history.length : 0}
            </div>
        </div>`;
}

function openPresentationTab(id) { window.open(window.location.origin + window.location.pathname + '?view=' + id, '_blank'); }

// --- PRESENTATION ENGINE ---
function startPresentation() {
    document.getElementById('app').innerHTML = `
        <div class="presentation-fullscreen">
            <div class="slide-fit" id="slide-canvas" style="background:${currentView.canvasBg || '#ffffff'}"></div>
            <div class="presentation-nav">
                <button onclick="window.close()">Home</button>
                <span id="slide-counter">${currentRowIndex+1} / ${currentView.data.length}</span>
                <button onclick="prevSlide()">Prev</button>
                <button onclick="nextSlide()">Next</button>
            </div>
        </div>`;
    renderSlideContent();
    window.onkeydown = (e) => { if (e.key === 'ArrowRight' || e.key === ' ') nextSlide(); if (e.key === 'ArrowLeft') prevSlide(); };
}

function renderSlideContent() {
    const canvas = document.getElementById('slide-canvas'); if (!canvas) return; canvas.innerHTML = '';
    const row = currentView.data[currentRowIndex] || {};
    currentView.boxes.forEach((box, i) => {
        const div = document.createElement('div'); div.className = 'box-instance';
        div.style.cssText = `left:${(box.x/6)*100}%; top:${(box.y/4)*100}%; --w-pct:${(box.w/6)*100}%; --h-pct:${(box.h/4)*100}%; background:${box.bgColor}; color:${box.textColor}; cursor:pointer;`;
        const val = box.isVar ? (row[box.textVal] || '---') : box.textVal;
        div.innerHTML = `<div class="box-title" style="color:${box.textColor};">${box.title}</div><div class="box-content" style="font-size:${box.fontSize}px;">${val}</div>`;
        div.onclick = (e) => { e.stopPropagation(); openLargePopup(i, val); };
        canvas.appendChild(div);
    });
}

function openLargePopup(idx, val) { 
    const box = currentView.boxes[idx]; 
    const overlay = document.createElement('div'); overlay.className = 'popup-overlay'; 
    overlay.innerHTML = `
        <div class="detail-modal" style="background: ${box.bgColor};">
            <div style="font-size:1.4rem; color:${box.textColor}; margin-bottom:10px; text-transform:uppercase; opacity:0.7;">${box.title}</div>
            <div class="detail-value" style="color:${box.textColor}">${val}</div>
            <div style="display:flex; gap:20px;">
                ${box.isVar ? `<button class="orange-btn" onclick="editLiveValue(${idx})">Edit Value</button>` : ''}
                <button class="blue-btn" style="background:var(--slate)" onclick="closePop()">Close</button>
            </div>
        </div>`; 
    document.body.appendChild(overlay); 
}

function editLiveValue(idx) {
    const box = currentView.boxes[idx];
    const colKey = box.textVal;
    const oldVal = currentView.data[currentRowIndex][colKey] || '---';
    const newVal = prompt(`Edit ${colKey} (Row ${currentRowIndex + 1}):`, oldVal);
    
    if (newVal !== null && newVal !== oldVal) {
        if (!currentView.history) currentView.history = [];
        currentView.history.push({ time: new Date().toLocaleTimeString(), row: currentRowIndex + 1, col: colKey, old: oldVal, new: newVal });
        currentView.data[currentRowIndex][colKey] = newVal;
        triggerSave(); closePop(); renderSlideContent();
    }
}

// --- MASTER EXPORT ENGINE ---

function exportFinalFiles() {
    loadFromStorage();
    currentView = views.find(v => v.createdAt == currentView.createdAt);

    if (!currentView || !currentView.data || currentView.data.length === 0) return alert("No data to export.");

    try {
        const viewName = currentView.name.replace(/\s+/g, '_');
        
        // 1. Export Excel
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(currentView.data);
        XLSX.utils.book_append_sheet(wb, ws, "Data");
        XLSX.writeFile(wb, `${viewName}_Updated.xlsx`);

        // 2. Export Raw JSON Backup
        const jsonData = JSON.stringify(currentView.data, null, 2);
        downloadBlob(jsonData, `${viewName}_DATA.json`, 'application/json');

        // 3. Export History
        const log = (currentView.history || []).map(h => `[${h.time}] Row ${h.row} | ${h.col}: ${h.old} -> ${h.new}`).join('\n');
        if (log) downloadBlob(log, `${viewName}_history.txt`, 'text/plain');

    } catch (e) { alert("Export failed. Ensure XLSX library is loaded."); }
}

function downloadBlob(content, fileName, type) {
    const blob = new Blob([content], { type: type });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fileName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// --- EDITOR & SIDEBAR ---
function renderEditCanvas() {
    const app = document.getElementById('app');
    app.innerHTML = `<div class="main-content"><aside class="editor-sidebar" id="sidebar">${renderSidebarContent()}</aside><main class="canvas-area"><div class="canvas-16-9" id="canvas-container" style="background:${currentView.canvasBg || '#ffffff'}"><div id="boxes-layer"></div></div><button class="blue-btn" style="margin-top:30px;" onclick="openMenu('${currentView.createdAt}')">Save & Exit</button></main></div>`;
    drawBoxes();
}

function syncBoxAttr(idx, key, val, shouldRefreshSidebar) {
    currentView.boxes[idx][key] = val;
    triggerSave(); drawBoxes();
    if (shouldRefreshSidebar) refreshSidebar();
}

function uploadExcel() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.xlsx';
    inp.onchange = (e) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
            const wb = XLSX.read(evt.target.result, {type:'binary'});
            const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            currentView.data = data; currentView.headers = Object.keys(data[0] || {});
            triggerSave(); renderEditCanvas();
        };
        reader.readAsBinaryString(e.target.files[0]);
    };
    inp.click();
}

// Helper utilities
function refreshSidebar() { const sb = document.getElementById('sidebar'); if(sb) sb.innerHTML = renderSidebarContent(); }
function closePop() { const p = document.querySelector('.popup-overlay'); if(p) p.remove(); }
function nextSlide() { if(currentRowIndex < currentView.data.length - 1) { currentRowIndex++; renderSlideContent(); updateCounter(); } }
function prevSlide() { if(currentRowIndex > 0) { currentRowIndex--; renderSlideContent(); updateCounter(); } }
function updateCounter() { const c = document.getElementById('slide-counter'); if(c) c.innerText = `${currentRowIndex+1} / ${currentView.data.length}`; }
function deleteView(id) { if(confirm("Delete?")) { views = views.filter(v => v.createdAt != id); triggerSave(); renderHome(); } }
function drawBoxes() { /* Logic to iterate and render boxes onto #boxes-layer */ }
function renderSidebarContent() { /* Logic to generate HTML for Sidebar */ return ""; }
function createNewView() { const name = prompt("Name:"); if(name) { currentView = { name, createdAt: Date.now(), boxes: [], data: [], headers: [], history: [] }; views.push(currentView); triggerSave(); renderEditCanvas(); } }
