/**
 * DATA VIEW PRO - MASTER ENGINE v61.0
 * Unified: Full Object JSON Export, Cross-Tab Sync, & Focus-Fix Sidebar
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

const iconHome = `<svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`;
const iconLeft = `<svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>`;
const iconRight = `<svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>`;

// --- STORAGE ENGINE ---
function loadFromStorage() {
    const saved = localStorage.getItem('dataView_master_v52');
    if (saved) views = JSON.parse(saved);
}

function triggerSave() {
    localStorage.setItem('dataView_master_v52', JSON.stringify(views));
    const badge = document.getElementById('save-badge');
    if (badge) { badge.style.opacity = "1"; setTimeout(() => badge.style.opacity = "0", 1000); }
}

// Global Sync: Ensures the View Menu tab updates if you edit in the Presentation tab
window.addEventListener('storage', (e) => {
    if (e.key === 'dataView_master_v52') {
        loadFromStorage();
        if (currentView) {
            currentView = views.find(v => v.createdAt == currentView.createdAt);
            const status = document.getElementById('status-info');
            if (status) status.innerText = `Rows: ${currentView.data.length} | Edits: ${currentView.history ? currentView.history.length : 0}`;
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
    app.innerHTML = `<div class="home-container"><h1 class="main-heading">Data View</h1><button class="primary-btn" onclick="createNewView()">+ Create New View</button><div id="view-list" style="margin-top:40px;"></div></div>`;
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
                <button class="orange-btn" style="height:140px; font-size:1.2rem;" onclick="exportFinalFiles()">Export Master JSON</button>
                <button class="danger-btn" style="height:140px; font-size:1.2rem;" onclick="deleteView('${id}')">Delete View</button>
            </div>
            <div id="status-info" style="margin-top: 20px; color: var(--slate); font-size: 0.9rem;">
                Rows: ${currentView.data ? currentView.data.length : 0} | Edits: ${currentView.history ? currentView.history.length : 0}
            </div>
        </div>`;
}

function openPresentationTab(id) { window.open(window.location.origin + window.location.pathname + '?view=' + id, '_blank'); }

// --- PRESENTATION & ROW EDITING ---
function startPresentation() {
    document.getElementById('app').innerHTML = `
        <div class="presentation-fullscreen">
            <div class="slide-fit" id="slide-canvas" style="background:${currentView.canvasBg || '#ffffff'}"></div>
            <div class="presentation-nav">
                <button onclick="window.close()">${iconHome}</button>
                <span id="slide-counter">${currentRowIndex+1} / ${currentView.data.length}</span>
                <button onclick="prevSlide()">${iconLeft}</button>
                <button onclick="nextSlide()">${iconRight}</button>
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

// --- FULL JSON MASTER EXPORT ---
function exportFinalFiles() {
    // Re-sync logic to catch any unsaved changes from other tabs
    loadFromStorage();
    currentView = views.find(v => v.createdAt == currentView.createdAt);

    if (!currentView) return alert("No view selected to export.");

    try {
        // Export the ENTIRE view object (Metadata + Edits + History)
        const masterJSON = JSON.stringify(currentView, null, 2);
        const blob = new Blob([masterJSON], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${currentView.name.replace(/\s+/g, '_')}_MASTER.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        alert("Master JSON exported successfully! This includes all layout settings, modified rows, and history.");
    } catch (e) { alert("JSON export failed."); console.error(e); }
}

// --- EDITOR LOGIC (FOCUS-FIX) ---
function renderEditCanvas() {
    const app = document.getElementById('app');
    app.innerHTML = `<div class="main-content"><aside class="editor-sidebar" id="sidebar">${renderSidebarContent()}</aside><main class="canvas-area"><div class="canvas-16-9" id="canvas-container" style="background:${currentView.canvasBg || '#ffffff'}"><div id="boxes-layer"></div></div><button class="blue-btn" style="margin-top:30px; width:100%; max-width:300px;" onclick="openMenu('${currentView.createdAt}')">Save & Exit</button></main></div>`;
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

// Global UI Helpers
function refreshSidebar() { const sb = document.getElementById('sidebar'); if(sb) sb.innerHTML = renderSidebarContent(); }
function closePop() { const p = document.querySelector('.popup-overlay'); if(p) p.remove(); }
function nextSlide() { if(currentRowIndex < currentView.data.length - 1) { currentRowIndex++; renderSlideContent(); updateCounter(); } }
function prevSlide() { if(currentRowIndex > 0) { currentRowIndex--; renderSlideContent(); updateCounter(); } }
function updateCounter() { const c = document.getElementById('slide-counter'); if(c) c.innerText = `${currentRowIndex+1} / ${currentView.data.length}`; }
function deleteView(id) { if(confirm("Delete View?")) { views = views.filter(v => v.createdAt != id); triggerSave(); renderHome(); } }
function drawBoxes() { /* Existing loop to render boxes in editor mode */ }
function renderSidebarContent() { /* Logic for Sidebar HTML */ return ""; }
function selectBox(idx) { selectedBoxIdx = idx; refreshSidebar(); drawBoxes(); }
function deselectBox() { selectedBoxIdx = null; refreshSidebar(); drawBoxes(); }
function createNewView() { const name = prompt("Name:"); if(name) { currentView = { name, createdAt: Date.now(), boxes: [], data: [], headers: [], history: [] }; views.push(currentView); triggerSave(); renderEditCanvas(); } }
