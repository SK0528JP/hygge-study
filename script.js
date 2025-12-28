/**
 * Hygge Study - Ultimate Logic
 * GitHub Gist Database Full Integration
 */

// --- 状態管理 ---
let GITHUB_TOKEN = localStorage.getItem('github_token') || "";
let GIST_ID = localStorage.getItem('gist_id') || "";

let isTimerRunning = false;
let totalSeconds = 0;   // 累計学習時間
let timerInterval = null;
let studyChart = null;

// アプリケーションデータ（Gistと同期する内容）
let appData = {
    school: "My Target Goal",
    date: "",
    tasks: [],
    total_seconds: 0
};

// --- DOM要素 ---
const loginBtn = document.getElementById('login-btn');
const studyTimeEl = document.getElementById('study-time');
const progressFill = document.getElementById('progress-fill');
const taskList = document.getElementById('task-list');
const modal = document.getElementById('modal-overlay');
const timerContainer = document.getElementById('timer-container');

// --- 1. 初期化処理 ---
window.addEventListener('DOMContentLoaded', async () => {
    initChart(); // グラフの初期化
    
    if (GITHUB_TOKEN && GIST_ID) {
        handleLoginUI(true);
        await loadAllData();
        renderTasks();
        updateGoalDisplay();
    }
});

// --- 2. 認証 & Gist データベース設定 ---
loginBtn.addEventListener('click', async () => {
    if (GITHUB_TOKEN) {
        if(confirm("Logout?")) {
            localStorage.clear();
            location.reload();
        }
    } else {
        const token = prompt("GitHub Personal Access Tokenを入力してください\n(gist権限が必要です)");
        if (token) {
            GITHUB_TOKEN = token;
            localStorage.setItem('github_token', token);
            await setupGist();
            location.reload();
        }
    }
});

function handleLoginUI(isLoggedIn) {
    if (isLoggedIn) {
        loginBtn.innerText = "CONNECTED";
        loginBtn.classList.add('opacity-40');
    }
}

async function setupGist() {
    try {
        const response = await fetch('https://api.github.com/gists', {
            method: 'POST',
            headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                description: "Hygge Study Data Storage",
                public: false,
                files: {
                    "hygge_data.json": { 
                        content: JSON.stringify({ school: "My Goal", date: "", tasks: [], total_seconds: 0 }) 
                    }
                }
            })
        });
        const data = await response.json();
        GIST_ID = data.id;
        localStorage.setItem('gist_id', GIST_ID);
        alert("GitHub上に専用データベースを作成しました！");
    } catch (e) {
        alert("Gistの作成に失敗しました。トークンの権限を確認してください。");
    }
}

// --- 3. データ同期ロジック ---
async function loadAllData() {
    try {
        const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
        });
        const data = await res.json();
        appData = JSON.parse(data.files["hygge_data.json"].content);
        
        totalSeconds = appData.total_seconds || 0;
        updateTimerDisplay(totalSeconds);
        updateChart();
    } catch (e) {
        console.error("データの読み込み失敗:", e);
    }
}

async function syncToGitHub() {
    if (!GIST_ID || !GITHUB_TOKEN) return;
    
    appData.total_seconds = totalSeconds;
    
    try {
        await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            method: 'PATCH',
            headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                files: {
                    "hygge_data.json": { content: JSON.stringify(appData) }
                }
            })
        });
        console.log("GitHub Synced.");
    } catch (e) {
        console.error("同期失敗:", e);
    }
}

// --- 4. タイマー & グラフ制御 ---
timerContainer.addEventListener('click', () => {
    if (!isTimerRunning) {
        // 開始
        isTimerRunning = true;
        timerContainer.classList.add('animate-pulse-soft');
        timerInterval = setInterval(() => {
            totalSeconds++;
            updateTimerDisplay(totalSeconds);
        }, 1000);
    } else {
        // 停止
        isTimerRunning = false;
        timerContainer.classList.remove('animate-pulse-soft');
        clearInterval(timerInterval);
        updateChart();
        syncToGitHub(); // 停止時に自動保存
    }
});

function initChart() {
    const ctx = document.getElementById('studyChart').getContext('2d');
    studyChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Done', 'Left'],
            datasets: [{
                data: [0, 100],
                backgroundColor: ['#a3be8c', '#eceff4'],
                borderWidth: 0,
                cutout: '80%'
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            animation: { duration: 1500 }
        }
    });
}

function updateChart() {
    const goalSeconds = 3600 * 5; // 目標: 5時間
    studyChart.data.datasets[0].data = [totalSeconds, Math.max(0, goalSeconds - totalSeconds)];
    studyChart.update();
}

function updateTimerDisplay(sec) {
    const hrs = Math.floor(sec / 3600).toString().padStart(2, '0');
    const mins = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    studyTimeEl.innerText = `${hrs}:${mins}:${s}`;
    
    // プログレスバー（5時間で100%）
    const progress = Math.min((sec / (3600 * 5)) * 100, 100);
    progressFill.style.width = `${progress}%`;
}

// --- 5. タスク管理機能 ---
document.getElementById('add-task-btn').addEventListener('click', () => {
    const title = prompt("新しい学習タスクを入力してください:");
    if (title) {
        const newTask = { id: Date.now(), title: title, done: false };
        appData.tasks.push(newTask);
        renderTasks();
        syncToGitHub();
    }
});

function renderTasks() {
    taskList.innerHTML = '';
    appData.tasks.forEach(task => {
        const taskItem = document.createElement('div');
        taskItem.className = "flex items-center p-5 bg-white/50 rounded-[1.5rem] border border-white shadow-sm transition-all hover:bg-white/80";
        taskItem.innerHTML = `
            <input type="checkbox" ${task.done ? 'checked' : ''} onchange="toggleTask(${task.id})" class="mr-4">
            <span class="flex-1 text-sm font-medium ${task.done ? 'line-through opacity-30' : ''}">${task.title}</span>
            <button onclick="deleteTask(${task.id})" class="text-xs opacity-20 hover:opacity-100 transition-opacity">✕</button>
        `;
        taskList.appendChild(taskItem);
    });
}

window.toggleTask = (id) => {
    const task = appData.tasks.find(t => t.id === id);
    if (task) {
        task.done = !task.done;
        renderTasks();
        syncToGitHub();
    }
};

window.deleteTask = (id) => {
    appData.tasks = appData.tasks.filter(t => t.id !== id);
    renderTasks();
    syncToGitHub();
};

// --- 6. 設定（志望校・カウントダウン） ---
document.getElementById('settings-btn').addEventListener('click', () => {
    document.getElementById('input-school').value = appData.school || "";
    document.getElementById('input-date').value = appData.date || "";
    modal.classList.remove('hidden');
});

document.getElementById('close-modal').addEventListener('click', () => modal.classList.add('hidden'));

document.getElementById('save-settings').addEventListener('click', () => {
    appData.school = document.getElementById('input-school').value || "My Goal";
    appData.date = document.getElementById('input-date').value || "";
    
    updateGoalDisplay();
    syncToGitHub();
    modal.classList.add('hidden');
});

function updateGoalDisplay() {
    document.getElementById('target-school').innerText = appData.school;
    
    if (appData.date) {
        const targetDate = new Date(appData.date);
        const today = new Date();
        const diffTime = targetDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const countdownEl = document.getElementById('countdown-timer');
        if (diffDays > 0) {
            countdownEl.innerText = `${diffDays} Days until victory`;
        } else if (diffDays === 0) {
            countdownEl.innerText = "Today is the Day!";
        } else {
            countdownEl.innerText = "Goal reached";
        }
    }
}
