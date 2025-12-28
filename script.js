/**
 * Hygge Study - Main Script
 * GitHub Gistをデータベースとして活用するロジック
 */

// --- 設定エリア ---
// 本来はOAuthですが、完全サーバーレスで最も確実に動く「Personal Access Token」方式を採用します
let GITHUB_TOKEN = localStorage.getItem('github_token') || "";
let GIST_ID = localStorage.getItem('gist_id') || ""; // データの保存先Gist ID

// --- DOM要素 ---
const loginBtn = document.getElementById('login-btn');
const taskList = document.getElementById('task-list');
const studyTimeEl = document.getElementById('study-time');
const progressFill = document.getElementById('progress-fill');

// --- 状態管理 ---
let isTimerRunning = false;
let secondsElapsed = 0;
let timerInterval = null;

// --- 1. 初期化処理 ---
window.addEventListener('DOMContentLoaded', () => {
    if (GITHUB_TOKEN) {
        handleLoginSuccess();
        loadStudyData(); // 保存されたデータを取得
    }
    renderTasks(dummyTasks);
});

// --- 2. 認証・トークン管理 ---

loginBtn.addEventListener('click', () => {
    if (GITHUB_TOKEN) {
        if (confirm("ログアウトしますか？")) {
            localStorage.clear();
            window.location.reload();
        }
    } else {
        const token = prompt("GitHub Personal Access Tokenを入力してください\n(設定 > Developer settings > Tokens から発行)");
        if (token) {
            GITHUB_TOKEN = token;
            localStorage.setItem('github_token', token);
            handleLoginSuccess();
            setupDatabaseGist(); // 初回ログイン時に保存用Gistを作成
        }
    }
});

function handleLoginSuccess() {
    loginBtn.innerText = "CONNECTED TO GITHUB";
    loginBtn.classList.replace('btn-primary', 'opacity-70');
}

// --- 3. データベース操作 (GitHub Gist API) ---

// 保存用のGistを作成または確認する
async function setupDatabaseGist() {
    if (GIST_ID) return;

    const response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            description: "Hygge Study Data",
            public: false,
            files: {
                "study_logs.json": { content: JSON.stringify({ total_seconds: 0, history: [] }) }
            }
        })
    });

    const data = await response.json();
    GIST_ID = data.id;
    localStorage.setItem('gist_id', GIST_ID);
    alert("学習用データベースをGitHub上に作成しました！");
}

// データの保存
async function saveStudyData(seconds) {
    if (!GIST_ID || !GITHUB_TOKEN) return;

    // 現在のデータを取得
    const currentDataRes = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
    });
    const currentData = await currentDataRes.json();
    const content = JSON.parse(currentData.files["study_logs.json"].content);

    // 更新
    content.total_seconds += seconds;
    content.history.push({ date: new Date().toISOString(), duration: seconds });

    // GitHubへ書き戻し
    await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            files: {
                "study_logs.json": { content: JSON.stringify(content) }
            }
        })
    });
    console.log("Data synced to GitHub Gist.");
}

// データの読み込み（起動時）
async function loadStudyData() {
    if (!GIST_ID || !GITHUB_TOKEN) return;

    try {
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
            headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
        });
        const data = await response.json();
        const content = JSON.parse(data.files["study_logs.json"].content);
        
        // 累計時間を表示に反映（秒を時間に変換）
        secondsElapsed = content.total_seconds;
        updateTimerDisplay();
    } catch (e) {
        console.error("データの読み込みに失敗しました", e);
    }
}

// --- 4. 学習タイマー機能 ---

studyTimeEl.parentElement.addEventListener('click', () => {
    if (!isTimerRunning) {
        startTimer();
    } else {
        stopTimer();
    }
});

function startTimer() {
    isTimerRunning = true;
    studyTimeEl.classList.add('text-[#88c0d0]', 'animate-pulse');
    const startTime = 0; // セッションごとの計測用
    timerInterval = setInterval(() => {
        secondsElapsed++;
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    isTimerRunning = false;
    studyTimeEl.classList.remove('text-[#88c0d0]', 'animate-pulse');
    clearInterval(timerInterval);
    saveStudyData(secondsElapsed); // 停止時に自動保存
}

function updateTimerDisplay() {
    const hrs = Math.floor(secondsElapsed / 3600).toString().padStart(2, '0');
    const mins = Math.floor((secondsElapsed % 3600) / 60).toString().padStart(2, '0');
    const secs = (secondsElapsed % 60).toString().padStart(2, '0');
    studyTimeEl.innerText = `${hrs}:${mins}:${secs}`;
    
    const progress = Math.min((secondsElapsed / 3600) * 100, 100);
    progressFill.style.width = `${progress}%`;
}

// --- 5. タスク表示 ---
const dummyTasks = [
    { title: "数学：青チャート 演習10問", priority: "High", color: "#a3be8c" },
    { title: "英語：ターゲット1900 セクション1", priority: "Mid", color: "#d08770" }
];

function renderTasks(tasks) {
    taskList.innerHTML = '';
    tasks.forEach(task => {
        const taskHtml = `
            <div class="flex items-center p-4 bg-white/50 rounded-2xl border border-gray-100 shadow-sm">
                <div class="w-3 h-3 rounded-full mr-4" style="background-color: ${task.color}"></div>
                <span class="flex-1 text-sm font-medium">${task.title}</span>
                <span class="text-[10px] opacity-40 uppercase font-bold tracking-tighter">${task.priority}</span>
            </div>
        `;
        taskList.insertAdjacentHTML('beforeend', taskHtml);
    });
}
