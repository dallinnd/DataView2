/**
 * DATA VIEW PRO - MASTER ENGINE v64.0
 * Features: Hard Commit System + Extended Box Sizes + Font Resizer
 */

let views = [];
let currentView = null;
let currentRowIndex = 0;
let selectedBoxIdx = null;
let draggingElement = null;
let dragIdx = -1;
let offset = { x: 0, y: 0 };

const bgPresets = ['#ffffff','#f8fafc','#f1f5f9','#e2e8f0','#cbd5e1','#94a3b8','#1e293b','#0f172a','#fee2e2','#ffedd5','#fef9c3','#dcfce7','#d1fae5','#dbeafe','#e0e7ff','#f5f3ff','linear-gradient(135deg, #667eea 0%, #764ba2 100%)','linear-gradient(135deg, #00b09b 0%, #96c93d 100%)','linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'];
const textPresets = ['#000000','#ffffff','#ef4444','#3b82f6','#10b981','#f97316','#8b5cf6'];

const iconHome = `<svg viewBox="0 0 24 24" width="20" height="20"><path fill="black" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`;
const iconLeft = `<svg viewBox="0 0 24 24" width="20" height="20"><path fill="black" d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>`;
const iconRight = `<svg viewBox="0 0 24 24" width="20" height="20"><path fill="black" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>`;

// --- 1. INITIALIZATION & DATA LOADING ---
document.addEventListener('DOMContentLoaded', () => {
    refreshGlobalData();
    const params = new URLSearchParams(window.location.search);
    const viewId = params.get('view');
    if (viewId) {
        currentView = views.find(v => v.createdAt == viewId);
        if (currentView) startPresentation(); else renderHome();
    } else { renderHome(); }
});

function refreshGlobalData() {
    const saved = localStorage.getItem('dataView_master_v52');
    views = saved ? JSON.parse(saved) : [];
}

function triggerSave() {
    if (currentView) {
        const idx = views.findIndex(v => v.createdAt === currentView.createdAt);
        if (idx !== -1) views[idx] = currentView; else views.push(currentView);
    }
    localStorage.setItem('dataView_master_v52', JSON.stringify(views));
    
    const badge = document.getElementById('save-badge');
    if (badge) { badge.style.opacity = "1"; setTimeout(() => badge.style.opacity = "0", 800); }
}

// --- 2. NAVIGATION ---
function renderHome() {
    currentView = null;
    refreshGlobalData();
    document.getElementById('app').innerHTML = `
        <div class="home-container">
            <h1 class="main-heading">Data View Pro</h1>
            <button class="primary-btn" onclick="createNewView()">+ Create New View</button>
            <div id="view-list" style="margin-top:40px;"></div>
        </div>`;
    views.forEach(v => {
        const d = document.createElement('div'); d.className = 'view-card';
        d.innerHTML = `<strong>${v.name}</strong><button class="blue-btn" onclick="openMenu('${v.createdAt}')">Open View</button>`;
        document.getElementById('view-list').appendChild(d);
    });
}

function openMenu(id) {
    refreshGlobalData();
    currentView = views.find(v => v.createdAt == id);
    if(!currentView) return renderHome();

    document.getElementById('app').innerHTML = `
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

// --- 3. THE CRITICAL LIVE EDIT FUNCTION ---
function editLiveValue(idx) {
    const box = currentView.boxes[idx];
    const colKey = box.textVal;
    
    const oldVal = currentView.data[currentRowIndex][colKey] || '---';
    const newVal = prompt(`Edit Row ${currentRowIndex + 1} - ${colKey}:`, oldVal);
    
    if (newVal !== null && newVal !== String(oldVal)) {
        if (!currentView.history) currentView.history = [];
        currentView.history.unshift({
            timestamp: new Date().toLocaleTimeString(),
            rowNumber: currentRowIndex + 1,
            column: colKey,
            oldValue: String(oldVal),
            newValue: String(newVal)
        });

        currentView.data[currentRowIndex][colKey] = newVal;
        triggerSave(); 
        closePop(); 
        renderSlideContent();
    }
}

// --- 4. HISTORY VIEW ---
function renderHistoryView() {
    refreshGlobalData();
    currentView = views.find(v => v.createdAt == currentView.createdAt);

    const history = currentView.history || [];
    const rows = history.length > 0 ? history.map(h => `
        <tr>
            <td>${h.timestamp}</td>
            <td><strong>Row ${h.rowNumber}</strong></td>
            <td>${h.column}</td>
            <td style="color:var(--danger-grad); text-decoration:line-through;">${h.oldValue}</td>
            <td style="color:#10b981; font-weight:800;">${h.newValue}</td>
        </tr>`).join('') : '<tr><td colspan="5" style="text-align:center; padding:50px; color:var(--slate);">No edits recorded yet.</td></tr>';

    document.getElementById('app').innerHTML = `
        <div class="home-container" style="width:95%; max-width:1100px;">
            <button class="blue-btn" style="background:var(--slate); margin-bottom:20px;" onclick="openMenu('${currentView.createdAt}')">← Back</button>
            <h1 class="main-heading" style="text-align:left;">History Audit</h1>
            <div style="background:white; border-radius:24px; padding:10px; box-shadow:0 10px 30px rgba(0,0,0,0.05);">
                <table class="history-table">
                    <thead><tr><th>Time</th><th>Row</th><th>Field</th><th>Original</th><th>Updated</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            <button class="danger-btn" style="margin-top:20px;" onclick="if(confirm('Clear Log?')){currentView.history=[]; triggerSave(); renderHistoryView();}">Clear Log</button>
        </div>`;
}

// --- 5. EXPORT PACK ---
function exportFinalFiles() {
    refreshGlobalData();
    currentView = views.find(v => v.createdAt == currentView.createdAt);

    if (!currentView.data || !currentView.data.length) return alert("No data to export.");
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(currentView.data);
    XLSX.utils.book_append_sheet(wb, ws, "Master_Data");
    XLSX.writeFile(wb, `${currentView.name}_Updated.xlsx`);

    const log = (currentView.history || []).map(h => `[${h.timestamp}] Row ${h.rowNumber} | ${h.column}: ${h.oldValue} -> ${h.newValue}`).join('\n');
    if (log) {
        const blob = new Blob([`HISTORY LOG FOR: ${currentView.name}\n\n` + log], { type: 'text/plain' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${currentView.name}_Log.txt`; a.click();
    }
}

// --- 6. EDITOR & CANVAS ---
function renderEditCanvas() {
    selectedBoxIdx = null;
    document.getElementById('app').innerHTML = `
        <div class="main-content">
            <aside class="editor-sidebar" id="sidebar">${renderSidebarContent()}</aside>
            <main class="canvas-area">
                <div class="canvas-16-9" id="canvas-container" style="background:${currentView.canvasBg || '#ffffff'}">
                    <div id="boxes-layer"></div>
                </div>
                <button class="blue-btn" style="margin-top:20px; width:250px;" onclick="openMenu('${currentView.createdAt}')">Save & Exit</button>
            </main>
        </div>`;
    drawBoxes();
}

function renderSidebarContent() {
    const isGlobal = selectedBoxIdx === null;
    return `
        <div class="sidebar-header">
            <h3>${isGlobal ? 'Global Settings' : 'Edit Box'}</h3>
            <div id="save-badge" style="color:#10b981; font-weight:800; opacity:0; font-size:0.7rem;">SAVED</div>
            ${!isGlobal ? `<button onclick="deselectBox()" style="background:none; color:var(--dark); font-size:1.2rem; cursor:pointer;">✕</button>` : ''}
        </div>
        ${isGlobal ? renderGlobalControls() : renderBoxControls()}`;
}

function renderGlobalControls() {
    const btnText = (currentView.data && currentView.data.length > 0) ? 'Change Excel Data' : 'Upload Excel Sheet';
    // Updated Grid with requested sizes
    return `
        <div class="property-group"><h4>View Name</h4><input type="text" value="${currentView.name}" oninput="currentView.name=this.value; triggerSave();"></div>
        <div class="property-group">
            <h4>Layout Tools</h4>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <button class="size-btn" onclick="addNewBoxDirectly(1,1)">+ 1x1 Box</button>
                <button class="size-btn" onclick="addNewBoxDirectly(2,1)">+ 2x1 Box</button>
                <button class="size-btn" onclick="addNewBoxDirectly(3,1)">+ 3x1 Box</button>
                <button class="size-btn" onclick="addNewBoxDirectly(4,1)">+ 4x1 Box</button>
                <button class="size-btn" onclick="addNewBoxDirectly(6,1)">+ 6x1 Box</button>
                <button class="size-btn" onclick="addNewBoxDirectly(2,2)">+ 2x2 Box</button>
                <button class="size-btn" onclick="addNewBoxDirectly(3,2)">+ 3x2 Box</button>
                <button class="size-btn" onclick="addNewBoxDirectly(4,2)">+ 4x2 Box</button>
                <button class="size-btn" onclick="addNewBoxDirectly(3,3)">+ 3x3 Box</button>
                <button class="size-btn" onclick="addNewBoxDirectly(4,4)">+ 4x4 Box</button>
            </div>
        </div>
        <div class="property-group"><h4>Canvas Theme</h4><div class="color-grid">${bgPresets.map(c => `<div class="circle" style="background:${c}" onclick="updateCanvasBg('${c}')"></div>`).join('')}</div></div>
        <button class="orange-btn" style="width:100%;" onclick="uploadExcel()">${btnText}</button>`;
}

function renderBoxControls() {
    const box = currentView.boxes[selectedBoxIdx];
    const hasData = currentView.headers && currentView.headers.length > 0;
    // Added Font Size Controls
    return `
        <div class="property-group"><h4>Label</h4><input type="text" value="${box.title}" oninput="syncBoxAttr(${selectedBoxIdx}, 'title', this.value, false)"></div>
        <div class="property-group">
            <h4>Mode</h4>
            <select onchange="setBoxMode(${selectedBoxIdx}, this.value === 'var')">
                <option value="const" ${!box.isVar ? 'selected' : ''}>Static Text</option>
                <option value="var" ${box.isVar ? 'selected' : ''}>Excel Variable</option>
            </select>
        </div>
        <div class="property-group">
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <h4>Font Size</h4>
                <span style="font-weight:bold; color:var(--slate);">${box.fontSize || 32}px</span>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
                <button class="blue-btn" style="padding:5px 30px;" onclick="updateFontSize(${selectedBoxIdx}, -2)">-</button>
                <button class="blue-btn" style="padding:5px 30px;" onclick="updateFontSize(${selectedBoxIdx}, 2)">+</button>
            </div>
        </div>
        <div class="property-group">
            <h4>Content</h4>
            ${!box.isVar ? `<input type="text" value="${box.textVal}" oninput="syncBoxAttr(${selectedBoxIdx}, 'textVal', this.value, false)">` : 
            (hasData ? `<div class="pills-container">${currentView.headers.map(h => `<div class="var-pill ${box.textVal === h ? 'selected' : ''}" onclick="syncBoxAttr(${selectedBoxIdx}, 'textVal', '${h}', true)">${h}</div>`).join('')}</div>` 
            : `<button class="orange-btn" style="width:100%;" onclick="uploadExcel()">Upload Excel First</button>`)}
        </div>
        <div class="property-group">
            <h4>Appearance</h4>
            <div class="color-grid">${bgPresets.map(c => `<div class="circle" style="background:${c}" onclick="syncBoxAttr(${selectedBoxIdx}, 'bgColor', '${c}', true)"></div>`).join('')}</div>
            <p style="margin-top:10px; font-size:0.7rem;">Text Color</p>
            <div class="color-grid">${textPresets.map(c => `<div class="circle" style="background:${c}" onclick="syncBoxAttr(${selectedBoxIdx}, 'textColor', '${c}', true)"></div>`).join('')}</div>
        </div>
        <button class="danger-btn" style="width:100%;" onclick="deleteBox(${selectedBoxIdx})">Delete Box</button>`;
}

// --- 7. PRESENTATION ENGINE ---
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
    window.onkeydown = (e) => { if (e.key === 'ArrowRight' || e.key === ' ') nextSlide(); if (e.key === 'ArrowLeft') prevSlide(); if (e.key === 'Escape') closePop(); };
}

function renderSlideContent() {
    const canvas = document.getElementById('slide-canvas'); if (!canvas) return; canvas.innerHTML = '';
    const row = currentView.data[currentRowIndex] || {};
    currentView.boxes.forEach((box, i) => {
        const div = document.createElement('div'); div.className = 'box-instance';
        div.style.cssText = `left:${(box.x/6)*100}%; top:${(box.y/4)*100}%; --w-pct:${(box.w/6)*100}%; --h-pct:${(box.h/4)*100}%; background:${box.bgColor}; color:${box.textColor}; cursor:pointer;`;
        const val = box.isVar ? (row[box.textVal] || '---') : box.textVal;
        // Applied font size here
        div.innerHTML = `<div class="box-title" style="color:${box.textColor};">${box.title}</div><div class="box-content" style="font-size:${box.fontSize || 32}px;">${val}</div>`;
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

// --- UTILS ---
function drawBoxes() {
    const layer = document.getElementById('boxes-layer'); if(!layer) return; layer.innerHTML = '';
    currentView.boxes.forEach((box, i) => {
        const div = document.createElement('div');
        div.className = `box-instance ${selectedBoxIdx === i ? 'selected-box' : ''}`;
        div.style.cssText = `left:${(box.x/6)*100}%; top:${(box.y/4)*100}%; --w-pct:${(box.w/6)*100}%; --h-pct:${(box.h/4)*100}%; background:${box.bgColor}; color:${box.textColor};`;
        // UPDATED: Now showing font size in edit canvas
        div.innerHTML = `<div class="box-title">${box.title}</div><div class="box-content" style="font-size:${box.fontSize || 32}px;">${box.isVar ? "VARIABLE" : box.textVal}</div>`;
        div.onmousedown = (e) => { startDragExisting(e, i); };
        layer.appendChild(div);
    });
}

function startDragExisting(e, idx) {
    e.preventDefault(); dragIdx = idx;
    const original = e.currentTarget; const rect = original.getBoundingClientRect();
    draggingElement = original.cloneNode(true); draggingElement.classList.add('dragging');
    offset.x = e.clientX - rect.left; offset.y = e.clientY - rect.top;
    document.getElementById('canvas-container').appendChild(draggingElement);
}

window.addEventListener('mousemove', (e) => { 
    if (!draggingElement) return; 
    const rect = document.getElementById('canvas-container').getBoundingClientRect(); 
    draggingElement.style.left = `${e.clientX - rect.left - offset.x}px`; 
    draggingElement.style.top = `${e.clientY - rect.top - offset.y}px`; 
});
window.addEventListener('mouseup', (e) => {
    if (!draggingElement) return;
    const rect = document.getElementById('canvas-container').getBoundingClientRect();
    const gridX = Math.round(((e.clientX - rect.left - offset.x) / rect.width) * 6);
    const gridY = Math.round(((e.clientY - rect.top - offset.y) / rect.height) * 4);
    if (gridX >= 0 && gridY >= 0 && gridX + currentView.boxes[dragIdx].w <= 6 && gridY + currentView.boxes[dragIdx].h <= 4) {
        currentView.boxes[dragIdx].x = gridX; currentView.boxes[dragIdx].y = gridY; triggerSave();
    }
    draggingElement.remove(); draggingElement = null; selectedBoxIdx = dragIdx; refreshSidebar(); drawBoxes();
});

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

function addNewBoxDirectly(w, h) {
    currentView.boxes.push({ x: 0, y: 0, w: parseInt(w), h: parseInt(h), title: 'Label', textVal: 'Value', isVar: false, bgColor: '#ffffff', textColor: '#000000', fontSize: 32 });
    triggerSave(); drawBoxes();
}

function updateFontSize(idx, delta) {
    let s = (currentView.boxes[idx].fontSize || 32) + delta;
    if(s < 12) s = 12; if(s > 150) s = 150;
    currentView.boxes[idx].fontSize = s;
    triggerSave(); refreshSidebar(); drawBoxes();
}

function syncBoxAttr(idx, key, val, reload) { currentView.boxes[idx][key] = val; triggerSave(); drawBoxes(); if(reload) refreshSidebar(); }
function setBoxMode(idx, mode) { currentView.boxes[idx].isVar = mode; triggerSave(); refreshSidebar(); drawBoxes(); }
function refreshSidebar() { const sb = document.getElementById('sidebar'); if(sb) sb.innerHTML = renderSidebarContent(); }
function closePop() { const p = document.querySelector('.popup-overlay'); if(p) p.remove(); }
function nextSlide() { if(currentRowIndex < currentView.data.length - 1) { currentRowIndex++; renderSlideContent(); updateCounter(); } }
function prevSlide() { if(currentRowIndex > 0) { currentRowIndex--; renderSlideContent(); updateCounter(); } }
function updateCounter() { const c = document.getElementById('slide-counter'); if(c) c.innerText = `${currentRowIndex+1} / ${currentView.data.length}`; }
function updateCanvasBg(c) { currentView.canvasBg = c; document.getElementById('canvas-container').style.background = c; triggerSave(); }
function deselectBox() { selectedBoxIdx = null; refreshSidebar(); drawBoxes(); }
function deleteBox(i) { currentView.boxes.splice(i,1); triggerSave(); deselectBox(); }
function deleteView(id) { if(confirm("Delete View?")) { views = views.filter(v => v.createdAt != id); triggerSave(); renderHome(); } }
function openPresentationTab(id) { window.open(window.location.origin + window.location.pathname + '?view=' + id, '_blank'); }
function createNewView() { const n = prompt("View Name:"); if(n) { currentView = { name: n, createdAt: Date.now(), boxes: [], data: [], headers: [], history: [] }; views.push(currentView); triggerSave(); renderEditCanvas(); } }
