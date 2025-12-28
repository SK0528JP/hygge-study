// DOM要素の取得
const loginBtn = document.getElementById('login-btn');
const taskList = document.getElementById('task-list');

// 仮のタスクデータ（後にGitHub APIから取得する）
const dummyTasks = [
    { title: "数学：青チャート 演習10問", priority: "High", color: "#a3be8c" },
    { title: "英語：ターゲット1900 セクション1", priority: "Mid", color: "#d08770" }
];

// タスクを画面に表示する関数
function renderTasks(tasks) {
    taskList.innerHTML = '';
    tasks.forEach(task => {
        const taskHtml = `
            <div class="flex items-center p-4 bg-white/50 rounded-2xl border border-gray-100 shadow-sm">
                <div class="w-3 h-3 rounded-full mr-4" style="background-color: ${task.color}"></div>
                <span class="flex-1 text-sm">${task.title}</span>
                <span class="text-xs opacity-50 italic">Priority: ${task.priority}</span>
            </div>
        `;
        taskList.insertAdjacentHTML('beforeend', taskHtml);
    });
}

// 初期化処理
window.addEventListener('DOMContentLoaded', () => {
    renderTasks(dummyTasks);
});

// ログインボタンのクリックイベント
loginBtn.addEventListener('click', () => {
    alert("GitHub OAuth連携を準備中...");
});
