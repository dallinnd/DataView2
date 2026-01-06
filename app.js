/**
 * DATA VIEW PRO - MASTER ENGINE v58.0
 * Pure JSON Export Edition - Reliable Data Capture
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

// --- INITIALIZATION ---
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

// --- HOME & MENU ---
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
                <button class="orange-btn" style="height:140px; font-size:1.2rem;" onclick="exportFinalFiles()">Export JSON Data</button>
                <button class="danger-btn" style="height:140px; font-size:1.2rem;" onclick="deleteView('${id}')">Delete View</button>
            </div>
            <div style="margin-top: 20px; color: var(--slate); font-size: 0.9rem;">
                Rows: ${currentView.data ? currentView.data.length : 0} | Edits: ${currentView.history ? currentView.history.length : 0}
            </div>
        </div>`;
}

function openPresentationTab(id) { window.open(window.location.origin + window.location.pathname + '?view=' + id, '_blank'); }

// --- EDITOR ENGINE (FOCUS FIX) ---
function renderEditCanvas() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="main-content">
            <aside class="editor-sidebar" id="sidebar">${renderSidebarContent()}</aside>
            <main class="canvas-area">
                <div class="canvas-16-9" id="canvas-container" style="background:${currentView.canvasBg || '#ffffff'}">
                    <div id="boxes-layer"></div>
                </div>
                <button class="blue-btn" style="margin-top:30px; width:100%; max-width:300px;" onclick="openMenu('${currentView.createdAt}')">Save & Exit</button>
            </main>
        </div>`;
    drawBoxes();
}

function renderSidebarContent() {
    const isGlobal = selectedBoxIdx === null;
    const excelBtnText = (currentView.data && currentView.data.length > 0) ? 'Change Excel' : 'Upload Excel Sheet';
    return `
        <div class="sidebar-header">
            <h3>${isGlobal ? 'Global' : 'Edit Box'}</h3>
            <div id="save-badge">Saved</div>
            ${!isGlobal ? `<button onclick="deselectBox()" style="background:none; color:var(--dark); font-size:1.2rem; cursor:pointer;">✕</button>` : ''}
        </div>
        ${isGlobal ? renderGlobalControls(excelBtnText) : renderBoxControls()}`;
}

function renderGlobalControls(btnText) {
    return `
        <div class="property-group">
            <h4>View Name</h4>
            <input type="text" value="${currentView.name}" oninput="updateViewName(this.value)">
        </div>
        <div class="property-group">
            <h4>Add New Box</h4>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                ${['1x1','2x1','3x1','2x2','4x1','6x1','3x3','4x4'].map(s => `<button class="size-btn" onclick="addNewBoxDirectly(${s.split('x')[0]}, ${s.split('x')[1]})">${s}</button>`).join('')}
            </div>
        </div>
        <button class="orange-btn" style="width:100%;" onclick="uploadExcel()">${btnText}</button>`;
}

function renderBoxControls() {
    const box = currentView.boxes[selectedBoxIdx];
    const hasData = currentView.headers && currentView.headers.length > 0;
    return `
        <div class="property-group">
            <h4>Label</h4>
            <input type="text" value="${box.title}" oninput="syncBoxAttr(${selectedBoxIdx}, 'title', this.value, false)">
        </div>
        <div class="property-group">
            <h4>Mode</h4>
            <select onchange="setBoxMode(${selectedBoxIdx}, this.value === 'var')">
                <option value="const" ${!box.isVar ? 'selected' : ''}>Static</option>
                <option value="var" ${box.isVar ? 'selected' : ''}>Variable</option>
            </select>
        </div>
        <div class="property-group">
            <h4>Content</h4>
            ${!box.isVar ? `<input type="text" value="${box.textVal}" oninput="syncBoxAttr(${selectedBoxIdx}, 'textVal', this.value, false)">` : 
            (hasData ? `
                <div class="pills-container">
                    ${currentView.headers.map(h => `<div class="var-pill ${box.textVal === h ? 'selected' : ''}" onclick="syncBoxAttr(${selectedBoxIdx}, 'textVal', '${h}', true)">${h}</div>`).join('')}
                </div>` : `<button class="orange-btn" style="width:100%;" onclick="uploadExcel()">Upload Excel Data First</button>`)}
        </div>
        <div class="property-group">
            <h4>Colors</h4>
            <div class="color-grid">${bgPresets.map(c => `<div class="circle" style="background:${c}" onclick="syncBoxAttr(${selectedBoxIdx}, 'bgColor', '${c}', true)"></div>`).join('')}</div>
        </div>
        <button class="danger-btn" style="width:100%;" onclick="deleteBox(${selectedBoxIdx})">Delete Box</button>`;
}

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
    const overlay = document.createElement('div'); 
    overlay.className = 'popup-overlay'; 
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

// --- RELIABLE JSON EXPORT ---
function exportFinalFiles() {
    if (!currentView || !currentView.data || currentView.data.length === 0) return alert("No data found.");

    try {
        // 1. Export JSON Data
        const jsonData = JSON.stringify(currentView.data, null, 2);
        const jsonBlob = new Blob([jsonData], { type: 'application/json' });
        const jLink = document.createElement('a');
        jLink.href = URL.createObjectURL(jsonBlob);
        jLink.download = `${currentView.name.replace(/\s+/g, '_')}_DATA.json`;
        document.body.appendChild(jLink); jLink.click(); document.body.removeChild(jLink);

        // 2. Export History Log
        const log = (currentView.history || []).map(h => `[${h.time}] Row ${h.row} | ${h.col}: ${h.old} -> ${h.new}`).join('\n');
        if (log) {
            const hBlob = new Blob([log], { type: 'text/plain' });
            const hLink = document.createElement('a');
            hLink.href = URL.createObjectURL(hBlob);
            hLink.download = `${currentView.name}_history.txt`;
            document.body.appendChild(hLink); hLink.click(); document.body.removeChild(hLink);
        }
    } catch (e) { alert("JSON export failed."); console.error(e); }
}

// --- CORE UTILS ---
function syncBoxAttr(idx, key, val, shouldRefreshSidebar) {
    currentView.boxes[idx][key] = val;
    triggerSave(); drawBoxes();
    if (shouldRefreshSidebar) refreshSidebar();
}

function drawBoxes() {
    const layer = document.getElementById('boxes-layer'); if(!layer) return; layer.innerHTML = '';
    currentView.boxes.forEach((box, i) => {
        const div = document.createElement('div');
        div.className = `box-instance ${selectedBoxIdx === i ? 'selected-box' : ''}`;
        div.style.cssText = `left:${(box.x/6)*100}%; top:${(box.y/4)*100}%; --w-pct:${(box.w/6)*100}%; --h-pct:${(box.h/4)*100}%; background:${box.bgColor}; color:${box.textColor};`;
        div.innerHTML = `<div class="box-title">${box.title}</div><div class="box-content" style="font-size:${box.fontSize}px;">${box.isVar ? "Variable" : box.textVal}</div>`;
        div.onmousedown = (e) => { if(e.target.tagName !== 'INPUT') selectBox(i); };
        layer.appendChild(div);
    });
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

function refreshSidebar() { const sb = document.getElementById('sidebar'); if(sb) sb.innerHTML = renderSidebarContent(); }
function selectBox(idx) { selectedBoxIdx = idx; refreshSidebar(); drawBoxes(); }
function deselectBox() { selectedBoxIdx = null; refreshSidebar(); drawBoxes(); }
function updateViewName(val) { currentView.name = val; triggerSave(); }
function closePop() { const p = document.querySelector('.popup-overlay'); if(p) p.remove(); }
function nextSlide() { if(currentRowIndex < currentView.data.length - 1) { currentRowIndex++; renderSlideContent(); updateCounter(); } }
function prevSlide() { if(currentRowIndex > 0) { currentRowIndex--; renderSlideContent(); updateCounter(); } }
function updateCounter() { const c = document.getElementById('slide-counter'); if(c) c.innerText = `${currentRowIndex+1} / ${currentView.data.length}`; }
function setBoxMode(idx, mode) { currentView.boxes[idx].isVar = mode; triggerSave(); refreshSidebar(); drawBoxes(); }
function deleteBox(i) { currentView.boxes.splice(i,1); triggerSave(); deselectBox(); }
function deleteView(id) { if(confirm("Delete View?")) { views = views.filter(v => v.createdAt != id); triggerSave(); renderHome(); } }
function addNewBoxDirectly(w, h) {
    currentView.boxes.push({ x: 0, y: 0, w: parseInt(w), h: parseInt(h), title: 'Label', textVal: 'Value', isVar: false, bgColor: '#e2e8f0', textColor: '#000', fontSize: 24 });
    triggerSave(); drawBoxes();
}
function createNewView() { const name = prompt("Name:"); if(name) { currentView = { name, createdAt: Date.now(), boxes: [], data: [], headers: [], history: [] }; views.push(currentView); triggerSave(); renderEditCanvas(); } }
