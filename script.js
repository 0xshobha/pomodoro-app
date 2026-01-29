class PomodoroTimer {
    constructor() {
        // State
        this.timeLeft = 25 * 60;
        this.timerId = null;
        this.isRunning = false;
        this.currentMode = 'pomodoro'; // 'pomodoro', 'shortBreak', 'longBreak'
        this.modes = {
            pomodoro: 25 * 60,
            shortBreak: 5 * 60,
            longBreak: 15 * 60
        };
        this.sessionCount = 0;
        this.tasks = [];
        this.audioEnabled = {
            alarm: true,
            ticking: false
        };

        // DOM Elements
        this.elements = {
            timeDisplay: document.getElementById('time-display'),
            modeDisplay: document.getElementById('mode-display'),
            startBtn: document.getElementById('btn-start'),
            pauseBtn: document.getElementById('btn-pause'),
            resetBtn: document.getElementById('btn-reset'),
            progressRing: document.querySelector('.progress-ring__bar'),
            modeButtons: document.querySelectorAll('.mode-btn'),
            sessionCount: document.getElementById('session-count'),
            taskList: document.getElementById('task-list'),
            taskInput: document.getElementById('task-input'),
            addTaskBtn: document.getElementById('add-task-btn'),
            settingsToggle: document.getElementById('settings-toggle'),
            settingsModal: document.getElementById('settings-modal'),
            closeSettings: document.getElementById('close-settings'),
            inputs: {
                pomodoro: document.getElementById('pomodoro-time'),
                shortBreak: document.getElementById('short-break-time'),
                longBreak: document.getElementById('long-break-time')
            },
            toggles: {
                alarm: document.getElementById('alarm-toggle'),
                ticking: document.getElementById('ticking-toggle')
            }
        };

        // Audio initialization (Simple beep/tick)
        this.initAudio();

        // Progress Ring Setup
        this.circumference = 2 * Math.PI * 140;
        this.elements.progressRing.style.strokeDasharray = `${this.circumference} ${this.circumference}`;
        this.elements.progressRing.style.strokeDashoffset = this.circumference;

        this.init();
    }

    init() {
        this.loadSettings();
        this.loadTasks();
        this.addEventListeners();
        this.updateDisplay();
        this.updateProgress();
    }

    initAudio() {
        // Using a simple beep sound and ticking sound URL or synthesis
        // For simplicity and "clean code", we'll use AudioContext for synthesized sounds if possible,
        // but simple Audio objects with data URIs or external links are more robust for a static file.
        // I'll use a silent approach for now to avoid broken links, but implement the logic.
        // Actually, let's use a very short base64 for a "tick" and "beep".

        // Short "tick" sound (base64) - placeholder
        // Short "alarm" sound (base64) - placeholder
        // For production value, we often fetch these. I'll mock them with console logs for now 
        // or try to generate a beep with AudioContext.

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    playTick() {
        if (!this.audioEnabled.ticking || !this.isRunning) return;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1000, this.audioContext.currentTime);
        gain.gain.setValueAtTime(0.01, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.00001, this.audioContext.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.05);
    }

    playAlarm() {
        if (!this.audioEnabled.alarm) return;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, this.audioContext.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(440, this.audioContext.currentTime + 0.5);
        gain.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        osc.start();
        osc.stop(this.audioContext.currentTime + 0.5);
    }

    addEventListeners() {
        // Timer Controls
        this.elements.startBtn.addEventListener('click', () => this.start());
        this.elements.pauseBtn.addEventListener('click', () => this.pause());
        this.elements.resetBtn.addEventListener('click', () => this.reset());

        // Mode Switching
        this.elements.modeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode;
                this.switchMode(mode);
            });
        });

        // Tasks
        this.elements.addTaskBtn.addEventListener('click', () => this.addTask());
        this.elements.taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });

        // Settings
        this.elements.settingsToggle.addEventListener('click', () => {
            this.elements.settingsModal.classList.remove('hidden');
        });
        this.elements.closeSettings.addEventListener('click', () => {
            this.elements.settingsModal.classList.add('hidden');
            this.saveSettings();
        });

        // Input validation for settings
        Object.values(this.elements.inputs).forEach(input => {
            input.addEventListener('change', () => this.saveSettings());
        });

        this.elements.toggles.alarm.addEventListener('change', (e) => {
            this.audioEnabled.alarm = e.target.checked;
        });

        this.elements.toggles.ticking.addEventListener('change', (e) => {
            this.audioEnabled.ticking = e.target.checked;
        });
    }

    start() {
        if (this.isRunning) return;

        // Resume AudioContext if suspended (browser requirement)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        this.isRunning = true;
        this.updateControlsUI();

        this.timerId = setInterval(() => {
            this.timeLeft--;
            this.updateDisplay();
            this.updateProgress();
            this.playTick();

            if (this.timeLeft <= 0) {
                this.completeSession();
            }
        }, 1000);
    }

    pause() {
        if (!this.isRunning) return;
        this.isRunning = false;
        clearInterval(this.timerId);
        this.updateControlsUI();
    }

    reset() {
        this.pause();
        this.timeLeft = this.modes[this.currentMode];
        this.updateDisplay();
        this.updateProgress();
    }

    switchMode(mode) {
        this.pause();
        this.currentMode = mode;
        this.timeLeft = this.modes[mode];

        // Update UI active state
        this.elements.modeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // Update Text
        const modeTexts = {
            pomodoro: 'Focus Time',
            shortBreak: 'Short Break',
            longBreak: 'Long Break'
        };
        this.elements.modeDisplay.textContent = modeTexts[mode];

        this.updateDisplay();
        this.updateProgress();
    }

    completeSession() {
        this.playAlarm();
        this.pause();

        if (this.currentMode === 'pomodoro') {
            this.sessionCount++;
            this.elements.sessionCount.textContent = this.sessionCount;
            // Auto switch to break? For now, just stop.
        }

        this.reset(); // Or just stay at 00:00? Usually reset to next mode.
        // Simple behavior: reset to current mode start time for now
    }

    updateDisplay() {
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        this.elements.timeDisplay.textContent = timeString;
        document.title = `${timeString} - Focus`;
    }

    updateProgress() {
        const totalTime = this.modes[this.currentMode];
        // Calculate offset: offset = circumference - (value / total) * circumference
        const offset = this.circumference - (1 - this.timeLeft / totalTime) * this.circumference;
        this.elements.progressRing.style.strokeDashoffset = offset;
    }

    updateControlsUI() {
        if (this.isRunning) {
            this.elements.startBtn.classList.add('hidden');
            this.elements.pauseBtn.classList.remove('hidden');
        } else {
            this.elements.startBtn.classList.remove('hidden');
            this.elements.pauseBtn.classList.add('hidden');
        }
    }

    // Task Management
    addTask() {
        const text = this.elements.taskInput.value.trim();
        if (!text) return;

        const task = {
            id: Date.now(),
            text: text,
            completed: false
        };

        this.tasks.push(task);
        this.renderTasks();
        this.elements.taskInput.value = '';
        this.saveTasks();
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.renderTasks();
        this.saveTasks();
    }

    toggleTask(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.renderTasks();
            this.saveTasks();
        }
    }

    renderTasks() {
        this.elements.taskList.innerHTML = '';
        this.tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'task-completed' : ''}`;
            li.innerHTML = `
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <span class="task-text">${task.text}</span>
                <button class="delete-task-btn">&times;</button>
            `;

            // Event Listeners for dynamic elements
            const checkbox = li.querySelector('.task-checkbox');
            checkbox.addEventListener('change', () => this.toggleTask(task.id));

            const deleteBtn = li.querySelector('.delete-task-btn');
            deleteBtn.addEventListener('click', () => this.deleteTask(task.id));

            this.elements.taskList.appendChild(li);
        });
    }

    saveTasks() {
        localStorage.setItem('pomodoroTasks', JSON.stringify(this.tasks));
    }

    loadTasks() {
        const stored = localStorage.getItem('pomodoroTasks');
        if (stored) {
            this.tasks = JSON.parse(stored);
            this.renderTasks();
        }
    }

    saveSettings() {
        // Get values from inputs
        const pTime = parseInt(this.elements.inputs.pomodoro.value) * 60;
        const sTime = parseInt(this.elements.inputs.shortBreak.value) * 60;
        const lTime = parseInt(this.elements.inputs.longBreak.value) * 60;

        // Update modes
        this.modes.pomodoro = pTime;
        this.modes.shortBreak = sTime;
        this.modes.longBreak = lTime;

        // Reset current time if not running to reflect new settings
        if (!this.isRunning) {
            this.timeLeft = this.modes[this.currentMode];
            this.updateDisplay();
            this.updateProgress();
        }

        // Save to LS
        const settings = {
            modes: {
                pomodoro: this.elements.inputs.pomodoro.value,
                shortBreak: this.elements.inputs.shortBreak.value,
                longBreak: this.elements.inputs.longBreak.value
            },
            audio: this.audioEnabled
        };
        localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
    }

    loadSettings() {
        const stored = localStorage.getItem('pomodoroSettings');
        if (stored) {
            const settings = JSON.parse(stored);

            // Apply inputs
            this.elements.inputs.pomodoro.value = settings.modes.pomodoro;
            this.elements.inputs.shortBreak.value = settings.modes.shortBreak;
            this.elements.inputs.longBreak.value = settings.modes.longBreak;

            // Apply Audio
            this.audioEnabled = settings.audio;
            this.elements.toggles.alarm.checked = settings.audio.alarm;
            this.elements.toggles.ticking.checked = settings.audio.ticking;

            // Update internal state
            this.modes.pomodoro = parseInt(settings.modes.pomodoro) * 60;
            this.modes.shortBreak = parseInt(settings.modes.shortBreak) * 60;
            this.modes.longBreak = parseInt(settings.modes.longBreak) * 60;

            // Update Timer if default
            this.timeLeft = this.modes[this.currentMode];
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const app = new PomodoroTimer();
});
