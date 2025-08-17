class InfiniteCodeCanvas {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.canvasContainer = document.getElementById('canvasContainer');
        this.connectionsLayer = document.getElementById('connectionsLayer');
        this.codeBlocks = [];
        this.connections = [];
        this.scale = 1;
        this.translateX = 0;
        this.translateY = 0;
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.showConnections = false;
        this.currentEditingBlock = null;
        
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.centerCanvas();
        this.render();
    }

    setupEventListeners() {
        // Menu toggle
        document.getElementById('menuToggle').addEventListener('click', () => {
            document.getElementById('controlsContainer').classList.toggle('active');
        });

        // Add prompt button
        document.getElementById('addPromptBtn').addEventListener('click', () => {
            this.openModal();
        });

        // Toggle connections
        document.getElementById('toggleConnectionsBtn').addEventListener('click', () => {
            this.showConnections = !this.showConnections;
            document.getElementById('toggleConnectionsBtn').textContent = 
                this.showConnections ? 'Hide Connections' : 'Show Connections';
            this.renderConnections();
        });

        // Reset view
        document.getElementById('resetViewBtn').addEventListener('click', () => {
            this.resetView();
        });

        // Zoom slider
        const zoomSlider = document.getElementById('zoomSlider');
        zoomSlider.addEventListener('input', (e) => {
            this.setZoom(e.target.value / 100);
        });

        // Touch/Mouse controls for canvas
        this.setupCanvasControls();

        // Modal controls
        this.setupModalControls();

        // File upload
        document.getElementById('fileUpload').addEventListener('change', (e) => {
            this.importData(e.target.files[0]);
        });

        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        // Touch zoom buttons
        document.getElementById('zoomInBtn').addEventListener('click', () => {
            this.setZoom(Math.min(this.scale * 1.2, 2));
        });

        document.getElementById('zoomOutBtn').addEventListener('click', () => {
            this.setZoom(Math.max(this.scale * 0.8, 0.1));
        });
    }

    setupCanvasControls() {
        let lastTouchDistance = 0;
        let touchStartX = 0;
        let touchStartY = 0;

        // Touch events
        this.canvasContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isDragging = true;
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                this.startX = touchStartX - this.translateX;
                this.startY = touchStartY - this.translateY;
                this.canvas.classList.add('grabbing');
            } else if (e.touches.length === 2) {
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                lastTouchDistance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
            }
            e.preventDefault();
        });

        this.canvasContainer.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && this.isDragging) {
                this.translateX = e.touches[0].clientX - this.startX;
                this.translateY = e.touches[0].clientY - this.startY;
                this.updateCanvasTransform();
            } else if (e.touches.length === 2) {
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];
                const distance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );
                
                if (lastTouchDistance > 0) {
                    const scaleDelta = distance / lastTouchDistance;
                    this.setZoom(this.scale * scaleDelta);
                }
                lastTouchDistance = distance;
            }
            e.preventDefault();
        });

        this.canvasContainer.addEventListener('touchend', () => {
            this.isDragging = false;
            this.canvas.classList.remove('grabbing');
            lastTouchDistance = 0;
        });

        // Mouse events (for testing on desktop)
        this.canvasContainer.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.startX = e.clientX - this.translateX;
            this.startY = e.clientY - this.translateY;
            this.canvas.classList.add('grabbing');
        });

        this.canvasContainer.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                this.translateX = e.clientX - this.startX;
                this.translateY = e.clientY - this.startY;
                this.updateCanvasTransform();
            }
        });

        this.canvasContainer.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.canvas.classList.remove('grabbing');
        });

        this.canvasContainer.addEventListener('mouseleave', () => {
            this.isDragging = false;
            this.canvas.classList.remove('grabbing');
        });

        // Wheel zoom
        this.canvasContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.setZoom(this.scale * delta);
        });
    }

    setupModalControls() {
        const modal = document.getElementById('promptModal');
        const closeModal = document.getElementById('closeModal');
        const saveBtn = document.getElementById('savePromptBtn');
        const cancelBtn = document.getElementById('cancelBtn');

        closeModal.addEventListener('click', () => {
            this.closeModal();
        });

        cancelBtn.addEventListener('click', () => {
            this.closeModal();
        });

        saveBtn.addEventListener('click', () => {
            this.savePrompt();
        });

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }

    openModal(blockId = null) {
        const modal = document.getElementById('promptModal');
        modal.classList.add('active');
        
        // Populate link dropdown
        const linkSelect = document.getElementById('linkToBlock');
        linkSelect.innerHTML = '<option value="">None</option>';
        this.codeBlocks.forEach(block => {
            if (block.id !== blockId) {
                const option = document.createElement('option');
                option.value = block.id;
                option.textContent = block.title;
                linkSelect.appendChild(option);
            }
        });

        if (blockId) {
            this.currentEditingBlock = blockId;
            const block = this.codeBlocks.find(b => b.id === blockId);
            if (block) {
                document.getElementById('promptInput').value = block.prompt;
                document.getElementById('htmlInput').value = block.html || '';
                document.getElementById('htmlVersion').value = block.htmlVersion || '';
                document.getElementById('jsInput').value = block.javascript || '';
                document.getElementById('jsVersion').value = block.jsVersion || '';
                document.getElementById('cssInput').value = block.css || '';
                document.getElementById('cssVersion').value = block.cssVersion || '';
                
                if (block.linkedTo) {
                    linkSelect.value = block.linkedTo;
                }
            }
        } else {
            this.currentEditingBlock = null;
            // Clear form
            document.getElementById('promptInput').value = '';
            document.getElementById('htmlInput').value = '';
            document.getElementById('htmlVersion').value = '';
            document.getElementById('jsInput').value = '';
            document.getElementById('jsVersion').value = '';
            document.getElementById('cssInput').value = '';
            document.getElementById('cssVersion').value = '';
        }
    }

    closeModal() {
        const modal = document.getElementById('promptModal');
        modal.classList.remove('active');
        this.currentEditingBlock = null;
    }

    savePrompt() {
        const prompt = document.getElementById('promptInput').value;
        const html = document.getElementById('htmlInput').value;
        const htmlVersion = document.getElementById('htmlVersion').value;
        const js = document.getElementById('jsInput').value;
        const jsVersion = document.getElementById('jsVersion').value;
        const css = document.getElementById('cssInput').value;
        const cssVersion = document.getElementById('cssVersion').value;
        const linkedTo = document.getElementById('linkToBlock').value;

        if (!prompt) {
            alert('Please enter a prompt');
            return;
        }

        // Generate title from prompt (first sentence)
        const title = prompt.split('.')[0].substring(0, 50);
        
        const blockData = {
            id: this.currentEditingBlock || `block_${Date.now()}`,
            title: title,
            prompt: prompt,
            html: html,
            htmlVersion: htmlVersion || 'V1',
            javascript: js,
            jsVersion: jsVersion || 'V1',
            css: css,
            cssVersion: cssVersion || 'V1',
            date: new Date().toLocaleDateString(),
            linkedTo: linkedTo,
            x: this.currentEditingBlock ? undefined : Math.random() * 800 + 100,
            y: this.currentEditingBlock ? undefined : Math.random() * 600 + 100
        };

        if (this.currentEditingBlock) {
            // Update existing block
            const index = this.codeBlocks.findIndex(b => b.id === this.currentEditingBlock);
            if (index !== -1) {
                this.codeBlocks[index] = { ...this.codeBlocks[index], ...blockData };
            }
        } else {
            // Add new block
            this.codeBlocks.push(blockData);
        }

        // Update connections
        if (linkedTo) {
            this.connections = this.connections.filter(c => c.from !== blockData.id);
            this.connections.push({ from: blockData.id, to: linkedTo });
        }

        this.saveData();
        this.render();
        this.closeModal();
    }

    deleteBlock(blockId) {
        if (confirm('Are you sure you want to delete this block?')) {
            this.codeBlocks = this.codeBlocks.filter(b => b.id !== blockId);
            this.connections = this.connections.filter(c => c.from !== blockId && c.to !== blockId);
            this.saveData();
            this.render();
        }
    }

    render() {
        this.canvas.innerHTML = '';
        
        this.codeBlocks.forEach(block => {
            const blockElement = this.createBlockElement(block);
            this.canvas.appendChild(blockElement);
        });

        this.renderConnections();
    }

    createBlockElement(block) {
        const div = document.createElement('div');
        div.className = 'code-block';
        div.id = block.id;
        div.style.left = `${block.x}px`;
        div.style.top = `${block.y}px`;
        
        div.innerHTML = `
            <div class="code-block-header">
                <div>
                    <div class="code-block-title">${block.title}</div>
                    <div class="code-block-date">${block.date}</div>
                </div>
                <div class="code-block-actions">
                    <button class="action-btn" onclick="app.openModal('${block.id}')">Edit</button>
                    <button class="action-btn" onclick="app.deleteBlock('${block.id}')">×</button>
                </div>
            </div>
            <div class="prompt-text">${block.prompt}</div>
            <div class="code-columns">
                ${block.html ? `
                    <div class="code-column">
                        <div class="code-column-header">
                            <span class="code-type html">HTML</span>
                            <span class="code-version">${block.htmlVersion}</span>
                        </div>
                        <div class="code-content">
                            <pre><code class="language-html">${this.escapeHtml(block.html)}</code></pre>
                        </div>
                    </div>
                ` : ''}
                ${block.javascript ? `
                    <div class="code-column">
                        <div class="code-column-header">
                            <span class="code-type js">JavaScript</span>
                            <span class="code-version">${block.jsVersion}</span>
                        </div>
                        <div class="code-content">
                            <pre><code class="language-javascript">${this.escapeHtml(block.javascript)}</code></pre>
                        </div>
                    </div>
                ` : ''}
                ${block.css ? `
                    <div class="code-column">
                        <div class="code-column-header">
                            <span class="code-type css">CSS</span>
                            <span class="code-version">${block.cssVersion}</span>
                        </div>
                        <div class="code-content">
                            <pre><code class="language-css">${this.escapeHtml(block.css)}</code></pre>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        // Make draggable
        this.makeDraggable(div, block);
        
        return div;
    }

    makeDraggable(element, block) {
        let isDragging = false;
        let startX, startY, initialX, initialY;

        const handleStart = (clientX, clientY) => {
            isDragging = true;
            startX = clientX;
            startY = clientY;
            initialX = block.x;
            initialY = block.y;
            element.style.zIndex = 1000;
        };

        const handleMove = (clientX, clientY) => {
            if (!isDragging) return;
            
            const dx = (clientX - startX) / this.scale;
            const dy = (clientY - startY) / this.scale;
            
            block.x = initialX + dx;
            block.y = initialY + dy;
            
            element.style.left = `${block.x}px`;
            element.style.top = `${block.y}px`;
            
            this.renderConnections();
        };

        const handleEnd = () => {
            if (isDragging) {
                isDragging = false;
                element.style.zIndex = '';
                this.saveData();
            }
        };

        // Touch events
        element.addEventListener('touchstart', (e) => {
            if (e.target.classList.contains('action-btn')) return;
            handleStart(e.touches[0].clientX, e.touches[0].clientY);
            e.stopPropagation();
        });

        element.addEventListener('touchmove', (e) => {
            handleMove(e.touches[0].clientX, e.touches[0].clientY);
            e.preventDefault();
            e.stopPropagation();
        });

        element.addEventListener('touchend', handleEnd);

        // Mouse events
        element.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('action-btn')) return;
            handleStart(e.clientX, e.clientY);
            e.stopPropagation();
        });

        document.addEventListener('mousemove', (e) => {
            handleMove(e.clientX, e.clientY);
        });

        document.addEventListener('mouseup', handleEnd);
    }

    renderConnections() {
        this.connectionsLayer.innerHTML = '';
        
        if (!this.showConnections) return;

        this.connections.forEach(conn => {
            const fromBlock = this.codeBlocks.find(b => b.id === conn.from);
            const toBlock = this.codeBlocks.find(b => b.id === conn.to);
            
            if (fromBlock && toBlock) {
                const line = this.createConnectionLine(fromBlock, toBlock);
                this.connectionsLayer.appendChild(line);
            }
        });
    }

    createConnectionLine(fromBlock, toBlock) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        const fromX = (fromBlock.x + 140) * this.scale + this.translateX;
        const fromY = (fromBlock.y + 100) * this.scale + this.translateY;
        const toX = (toBlock.x + 140) * this.scale + this.translateX;
        const toY = (toBlock.y + 100) * this.scale + this.translateY;
        
        const midX = (fromX + toX) / 2;
        const midY = (fromY + toY) / 2;
        const controlX1 = midX;
        const controlY1 = fromY;
        const controlX2 = midX;
        const controlY2 = toY;
        
        const d = `M ${fromX} ${fromY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${toX} ${toY}`;
        
        path.setAttribute('d', d);
        path.setAttribute('class', 'connection-line');
        
        return path;
    }

    setZoom(newScale) {
        this.scale = Math.max(0.1, Math.min(2, newScale));
        document.getElementById('zoomLevel').textContent = `${Math.round(this.scale * 100)}%`;
        document.getElementById('zoomSlider').value = this.scale * 100;
        this.updateCanvasTransform();
        this.renderConnections();
    }

    updateCanvasTransform() {
        this.canvas.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`;
    }

    resetView() {
        this.scale = 1;
        this.translateX = 0;
        this.translateY = 0;
        this.updateCanvasTransform();
        document.getElementById('zoomLevel').textContent = '100%';
        document.getElementById('zoomSlider').value = 100;
        this.centerCanvas();
        this.renderConnections();
    }

    centerCanvas() {
        const containerRect = this.canvasContainer.getBoundingClientRect();
        this.translateX = (containerRect.width - 10000 * this.scale) / 2;
        this.translateY = (containerRect.height - 10000 * this.scale) / 2 + 50;
        this.updateCanvasTransform();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    saveData() {
        const data = {
            codeBlocks: this.codeBlocks,
            connections: this.connections
        };
        localStorage.setItem('codeCanvasData', JSON.stringify(data));
    }

    loadData() {
        const savedData = localStorage.getItem('codeCanvasData');
        if (savedData) {
            const data = JSON.parse(savedData);
            this.codeBlocks = data.codeBlocks || [];
            this.connections = data.connections || [];
        } else {
            // Add sample data for first-time users
            this.codeBlocks = [
                {
                    id: 'sample_1',
                    title: 'Welcome to Code Canvas',
                    prompt: 'Welcome to Code Canvas. This is a sample prompt showing how your code blocks will appear.',
                    html: '<div class="welcome">\n  <h1>Hello World</h1>\n</div>',
                    htmlVersion: 'V1',
                    javascript: 'console.log("Welcome!");',
                    jsVersion: 'V1',
                    css: '.welcome {\n  text-align: center;\n}',
                    cssVersion: 'V1',
                    date: new Date().toLocaleDateString(),
                    x: 300,
                    y: 200
                }
            ];
        }
    }

    exportData() {
        const data = {
            codeBlocks: this.codeBlocks,
            connections: this.connections,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `code-canvas-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importData(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.codeBlocks = data.codeBlocks || [];
                this.connections = data.connections || [];
                this.saveData();
                this.render();
                alert('Data imported successfully!');
            } catch (error) {
                alert('Error importing data: Invalid file format');
            }
        };
        reader.readAsText(file);
    }
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new InfiniteCodeCanvas();
});
