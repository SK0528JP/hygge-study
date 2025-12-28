/**
 * Hygge Study - Ultimate Logic (Final Version)
 * Features: Multi-Subject Logging, Activity Calendar, Dark Mode, Gist Sync
 */

// --- 1. 状態管理 ---
let state = {
    token: localStorage.getItem('github_token') || "",
    gistId: localStorage.getItem('gist_id') || "",
    isTimerRunning: false,
    startTime: null,
    timerInterval: null,
    chartInstance: null,
    data: {
        school: "My Goal",
        date: "",
        daily_goal: 5, // デフォルト5時間
        tasks: [],
        logs: [] // {date: '2025-12-28', subject: 'Math', seconds: 3600}
    }
};

// --- 2. DOM要素 ---
const UI = {
    // Buttons & Toggles
    loginBtn: document.getElementById('login-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    settingsBtn: document.getElementById('settings-btn'),
    saveSettings: document.getElementById('save-settings'),
    closeModal: document.getElementById('close-modal'),
    modal: document.getElementById('modal-overlay'),
    addTaskBtn: document.getElementById('add-task-btn'),
    
    // Displays
    studyTime: document.getElementById('study-time'),
    progressFill: document.getElementById('progress-fill'),
    targetSchool: document.getElementById('target-school'),
    countdown: document.getElementById('countdown-timer'),
    taskList: document.getElementById('task-list'),
    calendarGrid: document.getElementById('calendar-grid'),
    monthLabel: document.getElementById('calendar-month'),
    
    // Inputs
    subjectSelect: document.getElementById('subject-select'),
    inputSchool: document.getElementById('input-school'),
    inputDate: document.getElementById('input-date'),
    inputGoal: document.getElementById('input-goal')
};

// --- 3. 初期化プロセス ---
window.addEventListener('DOMContentLoaded', async () => {
    // テーマの復元
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        UI.themeToggle.innerText = "☀️ Day Mode";
    }

    // データのロード
    if (state.token && state.gistId) {
        UI.loginBtn.innerText = "CONNECTED";
        UI.loginBtn.style.opacity = "0.5";
        await loadData();
    } else {
        renderCalendar();
        renderChart();
        renderTasks();
    }
});

// --- 4. ダークモード切替 ---
UI.themeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    UI.themeToggle.innerText = isDark ? "☀️ Day Mode" : "🌙 Night Mode";
});

// --- 5. タイマー制御 ---
document.getElementById('timer-container').addEventListener('click', toggleTimer);

function toggleTimer() {
    if (state.isTimerRunning) {
        // 停止
        state.isTimerRunning = false;
        clearInterval(state.timerInterval);
        document.getElementById('timer-container').classList.remove('animate-pulse-soft');
        
        const elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
        if (elapsedSeconds > 0) saveLog(elapsedSeconds);
        
        UI.studyTime.innerText = "00:00:00";
    } else {
        // 開始
        state.isTimerRunning = true;
        state.startTime = Date.now();
        document.getElementById('timer-container').classList.add('animate-pulse-soft');
        state.timerInterval = setInterval(updateTimerDisplay, 1000);
    }
}

function updateTimerDisplay() {
    const diff = Math.floor((Date.now() - state.startTime) / 1000);
    const h = Math.floor(diff / 3600).toString().padStart(2, '0');
    const m = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
    const s = (diff % 60).toString().padStart(2, '0');
    UI.studyTime.innerText = `${h}:${m}:${s}`;
}

function saveLog(seconds) {
    const today = new Date().toISOString().split('T')[0];
    state.data.logs.push({
        date: today,
        subject: UI.subjectSelect.value,
        seconds: seconds
    });
    
    renderChart();
    renderCalendar();
    syncToGist();
}

// --- 6. カレンダー & グラフ描画 ---
function renderCalendar() {
    UI.calendarGrid.innerHTML = '';
    const now = new Date();
    UI.monthLabel.innerText = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    // 空白埋め
    for (let i = 0; i < firstDay; i++) {
        UI.calendarGrid.appendChild(document.createElement('div'));
    }

    // 日付集計
    const dayMap = state.data.logs.reduce((acc, log) => {
        acc[log.date] = (acc[log.date] || 0) + log.seconds;
        return acc;
    }, {});

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
        const cell = document.createElement('div');
        cell.className = 'cal-cell';
        cell.innerText = d;

        const totalSec = dayMap[dateStr] || 0;
        if (totalSec > 0) {
            cell.classList.add('cal-filled');
            const intensity = Math.min(0.2 + (totalSec / (state.data.daily_goal * 3600)), 1);
            cell.style.opacity = intensity;
        }
        UI.calendarGrid.appendChild(cell);
    }
}

function renderChart() {
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = state.data.logs.filter(l => l.date === today);
    const subjectTotals = todayLogs.reduce((acc, log) => {
        acc[log.subject] = (acc[log.subject] || 0) + log.seconds;
        return acc;
    }, {});

    const ctx = document.getElementById('studyChart').getContext('2d');
    if (state.chartInstance) state.chartInstance.destroy();

    const labels = Object.keys(subjectTotals);
    const data = Object.values(subjectTotals);

    state.chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data.length > 0 ? data : [1],
                backgroundColor: ['#88c0d0', '#a3be8c', '#d08770', '#ebcb8b', '#b48ead', '#4c566a'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '80%',
            plugins: { legend: { display: false } }
        }
    });

    // プログレスバー
    const totalToday = data.reduce((a, b) => a + b, 0);
    const progress = (totalToday / (state.data.daily_goal * 3600)) * 100;
    UI.progressFill.style.width = `${Math.min(progress, 100)}%`;
}

// --- 7. タスク管理 ---
UI.addTaskBtn.addEventListener('click', () => {
    const title = prompt("New Task:");
    if (title) {
        state.data.tasks.push({ id: Date.now(), title, done: false });
        renderTasks();
        syncToGist();
    }
});

function renderTasks() {
    UI.taskList.innerHTML = '';
    state.data.tasks.forEach(task => {
        const div = document.createElement('div');
        div.className = "flex items-center p-3 glass-card rounded-xl text-xs";
        div.innerHTML = `
            <input type="checkbox" ${task.done ? 'checked' : ''} class="mr-3">
            <span class="flex-1 ${task.done ? 'line-through opacity-40' : ''}">${task.title}</span>
            <button class="opacity-20 hover:opacity-100">✕</button>
        `;
        
        div.querySelector('input').onchange = (e) => {
            task.done = e.target.checked;
            renderTasks();
            syncToGist();
        };
        div.querySelector('button').onclick = () => {
            state.data.tasks = state.data.tasks.filter(t => t.id !== task.id);
            renderTasks();
            syncToGist();
        };
        UI.taskList.appendChild(div);
    });
}

// --- 8. Gist 同期 ---
async function syncToGist() {
    if (!state.token || !state.gistId) return;
    try {
        await fetch(`https://api.github.com/gists/${state.gistId}`, {
            method: 'PATCH',
            headers: { 'Authorization': `token ${state.token}` },
            body: JSON.stringify({
                files: { "hygge_data.json": { content: JSON.stringify(state.data) } }
            })
        });
    } catch (e) { console.error("Sync error:", e); }
}

async function loadData() {
    try {
        const res = await fetch(`https://api.github.com/gists/${state.gistId}`, {
            headers: { 'Authorization': `token ${state.token}` }
        });
        const gist = await res.json();
        const content = JSON.parse(gist.files["hygge_data.json"].content);
        state.data = { ...state.data, ...content };
        
        // UI更新
        updateGoalUI();
        renderTasks();
        renderCalendar();
        renderChart();
    } catch (e) { console.error("Load error:", e); }
}

// --- 9. 設定 ---
UI.settingsBtn.onclick = () => {
    UI.inputSchool.value = state.data.school;
    UI.inputDate.value = state.data.date;
    UI.inputGoal.value = state.data.daily_goal;
    UI.modal.classList.remove('hidden');
};

UI.closeModal.onclick = () => UI.modal.classList.add('hidden');

UI.saveSettings.onclick = async () => {
    state.data.school = UI.inputSchool.value;
    state.data.date = UI.inputDate.value;
    state.data.daily_goal = parseFloat(UI.inputGoal.value) || 5;
    
    updateGoalUI();
    renderChart(); // 目標時間が変わるので再描画
    await syncToGist();
    UI.modal.classList.add('hidden');
};

function updateGoalUI() {
    UI.targetSchool.innerText = state.data.school;
    if (state.data.date) {
        const diff = new Date(state.data.date) - new Date();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        UI.countdown.innerText = days >= 0 ? `${days} Days to Victory` : "Goal Reached";
    }
}

// GitHub ログイン (Gist作成) は前回のロジックと同様
UI.loginBtn.onclick = async () => {
    if (state.token) return;
    const t = prompt("GitHub Token (gist scope):");
    if (t) {
        state.token = t;
        localStorage.setItem('github_token', t);
        // 新規Gist作成
        const res = await fetch('https://api.github.com/gists', {
            method: 'POST',
            headers: { 'Authorization': `token ${t}` },
            body: JSON.stringify({
                public: false,
                files: { "hygge_data.json": { content: JSON.stringify(state.data) } }
            })
        });
        const gist = await res.json();
        state.gistId = gist.id;
        localStorage.setItem('gist_id', gist.id);
        location.reload();
    }
};
