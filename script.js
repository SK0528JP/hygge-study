/**
 * Hygge Study - Main Script
 * GitHub APIを活用した学習管理ロジック
 */

// --- 設定エリア ---
const CLIENT_ID = "YOUR_CLIENT_ID_HERE"; // GitHub OAuth AppのClient IDをここに貼り付けてください
const REDIRECT_URI = window.location.origin + window.location.pathname;

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
    // URLから認可コード(code)があるか確認（GitHubからのリダイレクト後）
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        // 本来はここでサーバーを介してトークン交換が必要
        // GitHub Pagesのみで行う場合、この後「Device Flow」への切り替えも検討
        console.log("GitHub Authorization Code obtained:", code);
        handleLoginSuccess();
        // URLを綺麗にする（codeを消す）
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    // ローカルストレージにトークンがあればログイン済みとして扱う
    const token = localStorage.getItem('github_token');
    if (token) {
        handleLoginSuccess();
    }

    renderTasks(dummyTasks);
});

// --- 2. 認証ロジック ---

loginBtn.addEventListener('click', () => {
    const token = localStorage.getItem('github_token');
    if (token) {
        // すでにログインしていればログアウト処理
        if (confirm("Logout?")) {
            localStorage.removeItem('github_token');
            window.location.reload();
        }
    } else {
        // GitHubの認証画面へリダイレクト
        const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=repo,workflow&redirect_uri=${REDIRECT_URI}`;
        window.location.href = authUrl;
    }
});

function handleLoginSuccess() {
    loginBtn.innerText = "LOGGED IN (LOGOUT)";
    loginBtn.classList.add('opacity-70');
    // ここでGitHub APIを叩いてユーザー情報を取得する処理を今後追加します
}

// --- 3. 学習タイマー機能 (新設) ---

// プログレスバーや学習時間をクリックするとタイマー開始/停止（テスト用）
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
    timerInterval = setInterval(() => {
        secondsElapsed++;
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    isTimerRunning = false;
    studyTimeEl.classList.remove('text-[#88c0d0]', 'animate-pulse');
    clearInterval(timerInterval);
    // ここでGitHubにデータを保存する関数を呼び出す予定
    console.log(`Saved: ${secondsElapsed} seconds of study.`);
}

function updateTimerDisplay() {
    const hrs = Math.floor(secondsElapsed / 3600).toString().padStart(2, '0');
    const mins = Math.floor((secondsElapsed % 3600) / 60).toString().padStart(2, '0');
    const secs = (secondsElapsed % 60).toString().padStart(2, '0');
    studyTimeEl.innerText = `${hrs}:${mins}:${secs}`;
    
    // プログレスバーを動かす（例：1時間で100%になる設定）
    const progress = Math.min((secondsElapsed / 3600) * 100, 100);
    progressFill.style.width = `${progress}%`;
}

// --- 4. タスク管理ロジック ---

const dummyTasks = [
    { title: "数学：青チャート 演習10問", priority: "High", color: "#a3be8c" },
    { title: "英語：ターゲット1900 セクション1", priority: "Mid", color: "#d08770" },
    { title: "物理：セミナー物理 力学", priority: "Low", color: "#88c0d0" }
];

function renderTasks(tasks) {
    taskList.innerHTML = '';
    tasks.forEach(task => {
        const taskHtml = `
            <div class="flex items-center p-4 bg-white/50 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <div class="w-3 h-3 rounded-full mr-4" style="background-color: ${task.color}"></div>
                <span class="flex-1 text-sm font-medium">${task.title}</span>
                <span class="text-[10px] opacity-40 uppercase font-bold tracking-tighter">${task.priority}</span>
            </div>
        `;
        taskList.insertAdjacentHTML('beforeend', taskHtml);
    });
}
