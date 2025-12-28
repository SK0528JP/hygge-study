/**
 * Hygge Study - Main Script
 * GitHub Gist DB + Chart.js Visualization
 */

// --- 設定 ---
let GITHUB_TOKEN = localStorage.getItem('github_token') || "";
let GIST_ID = localStorage.getItem('gist_id') || "";

// --- DOM要素 ---
const loginBtn = document.getElementById('login-btn');
const taskList = document.getElementById('task-list');
const studyTimeEl = document.getElementById('study-time');
const progressFill = document.getElementById('progress-fill');
const timerContainer = document.getElementById('timer-container');

// --- 状態管理 ---
let isTimerRunning = false;
let sessionSeconds = 0; // 今回の勉強時間
let totalSeconds = 0;   // 累計
let timerInterval = null;
let studyChart = null;

// --- 1. 初期化 ---
window.addEventListener('DOMContentLoaded', () => {
    initChart();
    if (GITHUB_TOKEN) {
        handleLoginSuccess();
        loadStudyData();
    }
    renderTasks(dummyTasks);
});

// --- 2. 認証 ---
loginBtn.addEventListener('click', () => {
    if (GITHUB_TOKEN) {
        if (confirm("ログアウトしますか？")) {
            localStorage.clear();
            window.location.reload();
        }
    } else {
        const token = prompt("GitHub Personal Access Tokenを入力してください");
        if (token) {
            GITHUB_TOKEN = token;
            localStorage.setItem('github_token', token);
            handleLoginSuccess();
            setupDatabaseGist();
        }
    }
});

function handleLoginSuccess() {
    loginBtn.innerText = "CONNECTED";
    loginBtn.classList.add('opacity-50');
}

// --- 3. グラフ機能 (Chart.js) ---
function initChart() {
    const ctx = document.getElementById('studyChart').getContext('2d');
    studyChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Done', 'Remaining'],
            datasets: [{
                data: [0, 100],
                backgroundColor: ['#a3be8c', '#e5e9f0'],
                borderWidth: 0,
                cutout: '85%'
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            animation: { duration: 2000 }
        }
    });
}

function updateChart(doneSeconds) {
    const goalSeconds = 3600 * 5; // 仮の目標: 1日5時間
    const done = Math.floor(doneSeconds);
    const remaining = Math.max(0, goalSeconds - done);
    
    studyChart.data.datasets[0].data = [done, remaining];
    studyChart.update();
}

// --- 4. Gist DB操作 ---
async function setupDatabaseGist() {
    if (GIST_ID) return;
    const response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            description: "Hygge Study Data",
            public: false,
            files: { "study_logs.json": { content: JSON.stringify({ total_seconds: 0, history: [] }) } }
        })
    });
    const data = await response.json();
    GIST_ID = data.id;
    localStorage.setItem('gist_id', GIST_ID);
}

async function loadStudyData() {
    if (!GIST_ID || !GITHUB_TOKEN) return;
    try {
        const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
        });
        const data = await res.json();
        const content = JSON.parse(data.files["study_logs.json"].content);
        totalSeconds = content.total_seconds;
        updateTimerDisplay(totalSeconds);
        updateChart(totalSeconds);
    } catch (e) { console.error(e); }
}

async function saveStudyData(seconds) {
    if (!GIST_ID || !GITHUB_TOKEN) return;
    const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
    });
    const data = await res.json();
    const content = JSON.parse(data.files["study_logs.json"].content);

    content.total_seconds += seconds;
    content.history.push({ date: new Date().toISOString(), duration: seconds });

    await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        method: 'PATCH',
        headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: { "study_logs.json": { content: JSON.stringify(content) } } })
    });
    updateChart(content.total_seconds);
}

// --- 5. タイマー機能 ---
timerContainer.addEventListener('click', () => {
    if (!isTimerRunning) {
        isTimerRunning = true;
        sessionSeconds = 0;
        timerContainer.classList.add('animate-pulse-soft');
        timerInterval = setInterval(() => {
            sessionSeconds++;
            totalSeconds++;
            updateTimerDisplay(totalSeconds);
        }, 1000);
    } else {
        isTimerRunning = false;
        timerContainer.classList.remove('animate-pulse-soft');
        clearInterval(timerInterval);
        saveStudyData(sessionSeconds);
    }
});

function updateTimerDisplay(sec) {
    const hrs = Math.floor(sec / 3600).toString().padStart(2, '0');
    const mins = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    studyTimeEl.innerText = `${hrs}:${mins}:${s}`;
    progressFill.style.width = `${Math.min((sec / (3600 * 5)) * 100, 100)}%`;
}

// --- 6. タスク管理 ---
const dummyTasks = [
    { title: "数学：青チャート 演習10問", priority: "High", color: "#a3be8c" },
    { title: "英語：ターゲット1900 セクション1", priority: "Mid", color: "#d08770" }
];

function renderTasks(tasks) {
    taskList.innerHTML = '';
    tasks.forEach(task => {
        const taskHtml = `
            <div class="flex items-center p-5 bg-white/40 rounded-3xl border border-white/50 shadow-sm hover:bg-white/60 transition-all">
                <div class="w-2 h-10 rounded-full mr-6" style="background-color: ${task.color}"></div>
                <div class="flex-1">
                    <p class="text-xs opacity-40 font-bold uppercase tracking-widest mb-1">${task.priority}</p>
                    <p class="text-sm font-medium">${task.title}</p>
                </div>
                <button class="opacity-20 hover:opacity-100 transition-opacity">✕</button>
            </div>
        `;
        taskList.insertAdjacentHTML('beforeend', taskHtml);
    });
}
