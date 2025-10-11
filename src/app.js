/**
 * BPMN Explorer - A BPMN diagram editor based on bpmn-js
 * Forked from demo.bpmn.io functionality
 */

class BPMNExplorer {
    constructor() {
        this.viewer = null;
        this.modeler = null;
        this.currentDiagram = null;
        this.isModeler = true;
        this.autoSaveEnabled = true;
        this.autoSaveTimeout = null;
        this.autoSaveDelay = 2000; // 2 seconds delay
        this.storageKey = 'bpmn-explorer-autosave';
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeBPMN();
        this.setupKeyboardShortcuts();
        this.initializeAutoSave();
        this.loadAutoSavedDiagram();
    }

    setupEventListeners() {
        // File operations
        document.getElementById('open-file').addEventListener('click', () => this.openFile());
        document.getElementById('open-file-welcome').addEventListener('click', () => this.openFile());
        document.getElementById('save-file').addEventListener('click', () => this.saveFile());
        document.getElementById('file-input').addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Create new diagram
        document.getElementById('create-new').addEventListener('click', () => this.createNewDiagram());
        
        // Toolbar buttons
        document.getElementById('undo').addEventListener('click', () => this.undo());
        document.getElementById('redo').addEventListener('click', () => this.redo());
        document.getElementById('hand-tool').addEventListener('click', () => this.setTool('hand'));
        document.getElementById('lasso-tool').addEventListener('click', () => this.setTool('lasso'));
        document.getElementById('space-tool').addEventListener('click', () => this.setTool('space'));
        document.getElementById('append-tool').addEventListener('click', () => this.setTool('append'));
        document.getElementById('create-tool').addEventListener('click', () => this.setTool('create'));
        
        // Properties panel removed
    }

    initializeBPMN() {
        const canvas = document.getElementById('canvas');
        
        // Initialize BPMN modeler
        this.modeler = new BpmnJS({
            container: canvas,
            keyboard: {
                bindTo: document
            },
            additionalModules: [
                // Add any additional modules here
            ]
        });

        // Set up event listeners for the modeler
        this.setupBPMNEventListeners();
        
        // Create a simple BPMN diagram by default
        this.createDefaultDiagram();
    }

    setupBPMNEventListeners() {
        // Selection changes are no longer handled (properties panel removed)

        // Listen for element changes
        this.modeler.on('element.changed', (event) => {
            this.handleElementChange(event);
            this.triggerAutoSave();
        });

        // Listen for command stack changes (undo/redo)
        this.modeler.on('commandStack.changed', (event) => {
            this.updateUndoRedoButtons();
            this.triggerAutoSave();
        });

        // Listen for import errors
        this.modeler.on('import.done', (event) => {
            if (event.error) {
                this.showError('Import Error', event.error.message);
            } else {
                this.hideWelcomeMessage();
                this.triggerAutoSave();
            }
        });

        // Listen for shape changes
        this.modeler.on('shape.added', () => this.triggerAutoSave());
        this.modeler.on('shape.removed', () => this.triggerAutoSave());
        this.modeler.on('shape.changed', () => this.triggerAutoSave());
        
        // Listen for connection changes
        this.modeler.on('connection.added', () => this.triggerAutoSave());
        this.modeler.on('connection.removed', () => this.triggerAutoSave());
        this.modeler.on('connection.changed', () => this.triggerAutoSave());
    }

    createDefaultDiagram() {
        const defaultBPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn" exporter="bpmn-js (https://demo.bpmn.io)" exporterVersion="9.4.0">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Task_1" name="What if you are hungry?">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="EndEvent_1">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="179" y="99" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_1_di" bpmnElement="Task_1">
        <dc:Bounds x="270" y="77" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Event_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="432" y="99" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="215" y="117" />
        <di:waypoint x="270" y="117" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="370" y="117" />
        <di:waypoint x="432" y="117" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

        this.importDiagram(defaultBPMN);
    }

    async importDiagram(bpmnXML) {
        try {
            await this.modeler.importXML(bpmnXML);
            this.currentDiagram = bpmnXML;
            this.hideWelcomeMessage();
        } catch (error) {
            console.error('Error importing diagram:', error);
            this.showError('Import Error', error.message);
        }
    }

    async createNewDiagram() {
        try {
            await this.modeler.createDiagram();
            this.hideWelcomeMessage();
            this.clearAutoSave(); // Clear auto-save when creating new diagram
        } catch (error) {
            console.error('Error creating new diagram:', error);
            this.showError('Error', 'Failed to create new diagram');
        }
    }

    openFile() {
        document.getElementById('file-input').click();
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            this.importDiagram(content);
            this.clearAutoSave(); // Clear auto-save when opening new file
        };
        reader.readAsText(file);
    }

    async saveFile() {
        try {
            const result = await this.modeler.saveXML({ format: true });
            this.downloadFile(result.xml, 'diagram.bpmn', 'application/xml');
        } catch (error) {
            console.error('Error saving diagram:', error);
            this.showError('Save Error', 'Failed to save diagram');
        }
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    undo() {
        const commandStack = this.modeler.get('commandStack');
        if (commandStack.canUndo()) {
            commandStack.undo();
        }
    }

    redo() {
        const commandStack = this.modeler.get('commandStack');
        if (commandStack.canRedo()) {
            commandStack.redo();
        }
    }

    setTool(tool) {
        // Update active tool button
        document.querySelectorAll('.btn-tool').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        // Set the appropriate tool
        const toolManager = this.modeler.get('toolManager');
        switch (tool) {
            case 'hand':
                toolManager.setDefaultTool('hand');
                break;
            case 'lasso':
                toolManager.setDefaultTool('lasso');
                break;
            case 'space':
                toolManager.setDefaultTool('space');
                break;
            case 'append':
                toolManager.setDefaultTool('append');
                break;
            case 'create':
                toolManager.setDefaultTool('create');
                break;
        }
    }


    handleElementChange(event) {
        // Handle element changes if needed
        console.log('Element changed:', event.element);
    }

    updateUndoRedoButtons() {
        const commandStack = this.modeler.get('commandStack');
        const undoBtn = document.getElementById('undo');
        const redoBtn = document.getElementById('redo');
        
        undoBtn.disabled = !commandStack.canUndo();
        redoBtn.disabled = !commandStack.canRedo();
    }


    hideWelcomeMessage() {
        const overlay = document.querySelector('.canvas-overlay');
        overlay.classList.add('hidden');
    }

    showWelcomeMessage() {
        const overlay = document.querySelector('.canvas-overlay');
        overlay.classList.remove('hidden');
    }

    showError(title, message) {
        // Simple error display - could be enhanced with a proper modal
        alert(`${title}: ${message}`);
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Check if we're in an input field
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }

            const isCtrl = event.ctrlKey || event.metaKey;
            
            switch (event.key.toLowerCase()) {
                case 'o':
                    if (isCtrl) {
                        event.preventDefault();
                        this.openFile();
                    }
                    break;
                case 's':
                    if (isCtrl) {
                        event.preventDefault();
                        this.saveFile();
                    }
                    break;
                case 'z':
                    if (isCtrl) {
                        event.preventDefault();
                        if (event.shiftKey) {
                            this.redo();
                        } else {
                            this.undo();
                        }
                    }
                    break;
                case 'a':
                    if (isCtrl) {
                        event.preventDefault();
                        // Select all elements
                        const selection = this.modeler.get('selection');
                        const elementRegistry = this.modeler.get('elementRegistry');
                        const allElements = elementRegistry.filter(element => 
                            element.type !== 'bpmn:Process' && 
                            element.type !== 'bpmn:Collaboration'
                        );
                        selection.select(allElements);
                    }
                    break;
                case 'h':
                    event.preventDefault();
                    this.setTool('hand');
                    break;
                case 'l':
                    event.preventDefault();
                    this.setTool('lasso');
                    break;
                case 's':
                    if (!isCtrl) {
                        event.preventDefault();
                        this.setTool('space');
                    }
                    break;
                case 'a':
                    if (!isCtrl) {
                        event.preventDefault();
                        this.setTool('append');
                    }
                    break;
                case 'n':
                    event.preventDefault();
                    this.setTool('create');
                    break;
                case 'e':
                    event.preventDefault();
                    // Direct editing - handled by bpmn-js
                    break;
                case 'delete':
                case 'backspace':
                    if (isCtrl && event.shiftKey) {
                        event.preventDefault();
                        this.clearAutoSave();
                    }
                    break;
            }
        });
    }

    // Auto-save functionality
    initializeAutoSave() {
        // Check if localStorage is available
        if (typeof Storage === "undefined") {
            console.warn('localStorage is not available. Auto-save disabled.');
            this.autoSaveEnabled = false;
            return;
        }
        
        // Show auto-save status in UI
        this.updateAutoSaveStatus('Auto-save enabled');
    }

    triggerAutoSave() {
        if (!this.autoSaveEnabled || !this.modeler) {
            return;
        }

        // Clear existing timeout
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }

        // Set new timeout
        this.autoSaveTimeout = setTimeout(() => {
            this.performAutoSave();
        }, this.autoSaveDelay);
    }

    async performAutoSave() {
        try {
            const result = await this.modeler.saveXML({ format: true });
            const autoSaveData = {
                xml: result.xml,
                timestamp: new Date().toISOString(),
                version: '1.0'
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(autoSaveData));
            this.updateAutoSaveStatus('Auto-saved');
            console.log('Diagram auto-saved to localStorage');
        } catch (error) {
            console.error('Auto-save failed:', error);
            this.updateAutoSaveStatus('Auto-save failed');
        }
    }

    loadAutoSavedDiagram() {
        if (!this.autoSaveEnabled) {
            return;
        }

        try {
            const savedData = localStorage.getItem(this.storageKey);
            if (savedData) {
                const autoSaveData = JSON.parse(savedData);
                const savedTime = new Date(autoSaveData.timestamp);
                const now = new Date();
                const timeDiff = now - savedTime;
                
                // Only load if saved within last 24 hours
                if (timeDiff < 24 * 60 * 60 * 1000) {
                    this.showAutoSaveDialog(autoSaveData);
                } else {
                    // Clear old auto-save data
                    localStorage.removeItem(this.storageKey);
                }
            }
        } catch (error) {
            console.error('Error loading auto-saved diagram:', error);
            localStorage.removeItem(this.storageKey);
        }
    }

    showAutoSaveDialog(autoSaveData) {
        const savedTime = new Date(autoSaveData.timestamp).toLocaleString();
        
        // Automatically restore the saved diagram without showing dialog
        this.importDiagram(autoSaveData.xml);
        this.updateAutoSaveStatus(`自动恢复图表 (保存时间: ${savedTime})`);
        
        // Clear auto-save data after successful restoration
        localStorage.removeItem(this.storageKey);
    }

    updateAutoSaveStatus(message) {
        // Create or update auto-save status indicator
        let statusElement = document.getElementById('auto-save-status');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'auto-save-status';
            statusElement.className = 'auto-save-status';
            document.querySelector('.header-content').appendChild(statusElement);
        }
        
        statusElement.textContent = message;
        statusElement.className = 'auto-save-status ' + (message.includes('failed') ? 'error' : 'success');
        
        // Auto-hide success messages after 3 seconds
        if (message.includes('saved') || message.includes('enabled') || message.includes('Restored')) {
            setTimeout(() => {
                if (statusElement && !statusElement.textContent.includes('failed')) {
                    statusElement.textContent = '';
                }
            }, 3000);
        }
    }

    clearAutoSave() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        localStorage.removeItem(this.storageKey);
        this.updateAutoSaveStatus('Auto-save cleared');
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BPMNExplorer();
});

// Add some additional CSS for properties panel
const additionalStyles = `
.property-group {
    margin-bottom: 16px;
}

.property-group label {
    display: block;
    font-weight: 500;
    margin-bottom: 4px;
    color: #374151;
}

.property-group input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
}

.property-group input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.property-group input[readonly] {
    background-color: #f9fafb;
    color: #6b7280;
}
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);
