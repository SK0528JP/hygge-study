/**
 * Hygge Study - Ultimate Logic (Debugged Version)
 * GitHub Gist Database Full Integration
 */

// --- 1. グローバル設定と状態管理 ---
const CONFIG = {
    FILE_NAME: "hygge_data.json", // Gist内の保存ファイル名
    GOAL_SECONDS: 3600 * 5,        // 1日の目標時間（デフォルト5時間）
};

// アプリケーションの状態
let state = {
    token: localStorage.getItem('github_token') || "",
    gistId: localStorage.getItem('gist_id') || "",
    isTimerRunning: false,
    timerInterval: null,
    chartInstance: null,
    // 保存データ構造（初期値）
    data: {
        school: "My Goal",
        date: "",
        tasks: [],
        total_seconds: 0
    }
};

// --- 2. DOM要素の取得（キャッシュ） ---
const UI = {
    loginBtn: document.getElementById('login-btn'),
    timerContainer: document.getElementById('timer-container'),
    studyTime: document.getElementById('study-time'),
    progressFill: document.getElementById('progress-fill'),
    chartCanvas: document.getElementById('studyChart'),
    taskList: document.getElementById('task-list'),
    addTaskBtn: document.getElementById('add-task-btn'),
    // 設定関連
    settingsBtn: document.getElementById('settings-btn'),
    modal: document.getElementById('modal-overlay'),
    closeModal: document.getElementById('close-modal'),
    saveSettings: document.getElementById('save-settings'),
    inputSchool: document.getElementById('input-school'),
    inputDate: document.getElementById('input-date'),
    targetSchool: document.getElementById('target-school'),
    countdown: document.getElementById('countdown-timer')
};

// --- 3. 初期化プロセス ---
window.addEventListener('DOMContentLoaded', async () => {
    console.log("System Initializing...");
    
    // グラフの初期描画（空データ）
    renderChart();
    
    // ログイン状態の確認
    if (state.token) {
        UI.loginBtn.innerText = "CONNECTED";
        UI.loginBtn.classList.add('opacity-50', 'cursor-not-allowed');
        
        // GistIDがあればデータをロード、なければ作成
        if (state.gistId) {
            await loadDataFromGist();
        } else {
            console.log("Token exists but no Gist ID. Please re-connect.");
        }
    } else {
        renderTasks(); // 未ログイン時は空のタスクリストを表示
    }
});

// --- 4. 認証とデータベース(Gist)接続 ---
UI.loginBtn.addEventListener('click', async () => {
    if (state.token) {
        if (confirm("ログアウトしますか？（ローカルの認証情報は削除されます）")) {
            localStorage.clear();
            location.reload();
        }
        return;
    }

    const tokenInput = prompt("GitHub Personal Access Tokenを入力してください\n(権限スコープ 'gist' が必要です)");
    if (!tokenInput) return;

    state.token = tokenInput;
    localStorage.setItem('github_token', tokenInput);

    // Gistのセットアップ開始
    UI.loginBtn.innerText = "CONNECTING...";
    await setupGist();
});

async function setupGist() {
    try {
        // 既存のGistを探す処理は複雑になるため、今回は「新規作成」で統一します
        // （運用上は、Gist IDをメモしておくか、検索ロジックを追加するとより親切です）
        const response = await fetch('https://api.github.com/gists', {
            method: 'POST',
            headers: { 
                'Authorization': `token ${state.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                description: "Hygge Study Data Storage",
                public: false, // 自分だけが見れる設定
                files: {
                    [CONFIG.FILE_NAME]: { 
                        content: JSON.stringify(state.data) 
                    }
                }
            })
        });

        if (!response.ok) throw new Error("Gist creation failed");

        const resData = await response.json();
        state.gistId = resData.id;
        localStorage.setItem('gist_id', state.gistId);
        
        alert("接続成功！GitHub上に専用データベースを作成しました。");
        location.reload();

    } catch (e) {
        console.error(e);
        alert("接続に失敗しました。トークンの権限(gist)を確認してください。");
        UI.loginBtn.innerText = "CONNECT GITHUB";
        localStorage.removeItem('github_token');
        state.token = "";
    }
}

// --- 5. データ同期（Load / Save） ---
async function loadDataFromGist() {
    if (!state.gistId || !state.token) return;

    try {
        const response = await fetch(`https://api.github.com/gists/${state.gistId}`, {
            headers: { 'Authorization': `token ${state.token}` }
        });

        if (!response.ok) {
            if (response.status === 404) {
                alert("データベースが見つかりません。再接続してください。");
                localStorage.removeItem('gist_id');
            }
            return;
        }

        const resData = await response.json();
        const fileContent = resData.files[CONFIG.FILE_NAME]?.content;

        if (fileContent) {
            state.data = JSON.parse(fileContent);
            // データの整合性チェック（古いデータ形式への対応）
            if (!state.data.tasks) state.data.tasks = [];
            if (!state.data.total_seconds) state.data.total_seconds = 0;
            
            // UIへの反映
            updateTimerDisplay();
            renderChart();
            renderTasks();
            updateGoalUI();
            console.log("Data loaded successfully.");
        }
    } catch (e) {
        console.error("Load Error:", e);
    }
}

async function saveDataToGist() {
    if (!state.gistId || !state.token) {
        console.log("No connection, data not saved to cloud.");
        return;
    }

    try {
        await fetch(`https://api.github.com/gists/${state.gistId}`, {
            method: 'PATCH',
            headers: { 
                'Authorization': `token ${state.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: {
                    [CONFIG.FILE_NAME]: { content: JSON.stringify(state.data) }
                }
            })
        });
        console.log("Data synced to GitHub.");
    } catch (e) {
        console.error("Save Error:", e);
    }
}

// --- 6. タイマー機能 ---
UI.timerContainer.addEventListener('click', toggleTimer);

function toggleTimer() {
    if (state.isTimerRunning) {
        // 停止処理
        state.isTimerRunning = false;
        clearInterval(state.timerInterval);
        UI.timerContainer.classList.remove('animate-pulse-soft');
        
        // データを保存
        saveDataToGist();
        renderChart(); // グラフ更新
        
    } else {
        // 開始処理
        state.isTimerRunning = true;
        UI.timerContainer.classList.add('animate-pulse-soft');
        
        state.timerInterval = setInterval(() => {
            state.data.total_seconds++;
            updateTimerDisplay();
        }, 1000);
    }
}

function updateTimerDisplay() {
    const sec = state.data.total_seconds;
    const hrs = Math.floor(sec / 3600).toString().padStart(2, '0');
    const mins = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    
    UI.studyTime.innerText = `${hrs}:${mins}:${s}`;
    
    // プログレスバー更新 (目標時間に対する割合)
    const progress = Math.min((sec / CONFIG.GOAL_SECONDS) * 100, 100);
    UI.progressFill.style.width = `${progress}%`;
}

// --- 7. チャート機能 (Chart.js) ---
function renderChart() {
    const ctx = UI.chartCanvas.getContext('2d');
    
    // 既存のチャートがあれば破棄（二重描画防止の重要修正）
    if (state.chartInstance) {
        state.chartInstance.destroy();
    }

    const done = state.data.total_seconds;
    const remaining = Math.max(0, CONFIG.GOAL_SECONDS - done);

    state.chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Done', 'Remaining'],
            datasets: [{
                data: [done, remaining],
                backgroundColor: ['#a3be8c', '#eceff4'], // 北欧カラー
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '85%', // ドーナツの太さ
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
}

// --- 8. タスク管理機能 ---
UI.addTaskBtn.addEventListener('click', () => {
    const title = prompt("追加する学習タスクを入力してください:");
    if (title && title.trim() !== "") {
        state.data.tasks.push({
            id: Date.now(),
            title: title,
            done: false
        });
        renderTasks();
        saveDataToGist();
    }
});

function renderTasks() {
    UI.taskList.innerHTML = ''; // リストクリア
    
    if (state.data.tasks.length === 0) {
        UI.taskList.innerHTML = `<div class="text-center opacity-30 py-10 text-xs font-bold tracking-widest">NO TASKS YET</div>`;
        return;
    }

    // 未完了を上に表示するようソート
    const sortedTasks = [...state.data.tasks].sort((a, b) => a.done - b.done);

    sortedTasks.forEach(task => {
        const div = document.createElement('div');
        div.className = `flex items-center p-4 bg-white/50 rounded-xl border border-white/60 shadow-sm transition-all hover:bg-white/80 ${task.done ? 'opacity-50' : ''}`;
        
        div.innerHTML = `
            <input type="checkbox" ${task.done ? 'checked' : ''} class="mr-4 cursor-pointer">
            <span class="flex-1 text-sm font-medium ${task.done ? 'line-through' : ''}">${task.title}</span>
            <button class="btn-delete text-xs opacity-20 hover:opacity-100 transition-opacity ml-2">✕</button>
        `;

        // イベントリスナー: チェックボックス
        const checkbox = div.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', () => {
            task.done = checkbox.checked;
            renderTasks(); // 再描画（ソート反映のため）
            saveDataToGist();
        });

        // イベントリスナー: 削除ボタン
        const deleteBtn = div.querySelector('.btn-delete');
        deleteBtn.addEventListener('click', () => {
            if(confirm("このタスクを削除しますか？")) {
                state.data.tasks = state.data.tasks.filter(t => t.id !== task.id);
                renderTasks();
                saveDataToGist();
            }
        });

        UI.taskList.appendChild(div);
    });
}

// --- 9. 設定モーダル・目標設定 ---
UI.settingsBtn.addEventListener('click', () => {
    UI.inputSchool.value = state.data.school || "";
    UI.inputDate.value = state.data.date || "";
    UI.modal.classList.remove('hidden');
});

UI.closeModal.addEventListener('click', () => UI.modal.classList.add('hidden'));

UI.saveSettings.addEventListener('click', () => {
    state.data.school = UI.inputSchool.value || "My Goal";
    state.data.date = UI.inputDate.value || "";
    
    updateGoalUI();
    saveDataToGist();
    
    UI.modal.classList.add('hidden');
    alert("設定を保存しました！");
});

function updateGoalUI() {
    UI.targetSchool.innerText = state.data.school;
    
    if (state.data.date) {
        const today = new Date();
        const target = new Date(state.data.date);
        const diffTime = target - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays > 0) {
            UI.countdown.innerText = `${diffDays} DAYS TO VICTORY`;
            UI.countdown.className = "text-xs md:text-sm font-bold tracking-[0.3em] uppercase text-[#d08770]";
        } else if (diffDays === 0) {
            UI.countdown.innerText = "TODAY IS THE DAY!";
            UI.countdown.className = "text-xs md:text-sm font-bold tracking-[0.3em] uppercase text-[#bf616a] animate-pulse";
        } else {
            UI.countdown.innerText = "GOAL REACHED";
            UI.countdown.className = "text-xs md:text-sm font-bold tracking-[0.3em] uppercase text-[#a3be8c]";
        }
    } else {
        UI.countdown.innerText = "Set your exam date in settings";
    }
}
