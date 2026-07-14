/* ============================================================
   星语 · 孤独症早期支持平台 — 应用逻辑层
   包含：导航、用户管理、筛查流程、报告生成、历史记录、管理员后台
   ============================================================ */

// ==================== 全局状态管理 ====================
const AppState = {
    currentPage: 'splash',
    isLoggedIn: false,
    isAdminLoggedIn: false,
    currentUser: null,
    children: [],           // 当前用户的儿童列表
    currentChild: null,     // 当前选中编辑的儿童
    editingChildId: null,   // 正在编辑的儿童ID
    selectedGender: '',
    selectedAvatar: '👶',

    // 筛查状态
    screening: {
        childId: null,
        currentQuestionIndex: 0,
        answers: {},        // { questionId: { value, score } }
        totalScore: 0,
        riskLevel: '',
        startTime: null
    },

    // 管理员状态
    adminTab: 'users',

    // 模拟数据存储 (实际项目中这些在服务器端)
    users: [],
    screeningHistory: [],
    adminAccounts: [
        { username: 'admin', password: 'admin123' }
    ]
};

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // 从localStorage恢复数据
    loadFromStorage();

    // 显示启动页
    navigateTo('splash');

    // 初始化首页轮播
    initBannerSwiper();

    // 设置日期选择器的最大日期（今天）
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('childBirth').setAttribute('max', today);
}

// ==================== 本地存储 ====================
function loadFromStorage() {
    try {
        const users = localStorage.getItem('as_users');
        const history = localStorage.getItem('as_history');
        const children = localStorage.getItem('as_children');
        const currentUser = localStorage.getItem('as_currentUser');

        if (users) AppState.users = JSON.parse(users);
        if (history) AppState.screeningHistory = JSON.parse(history);
        if (children) AppState.children = JSON.parse(children);
        if (currentUser) {
            AppState.currentUser = JSON.parse(currentUser);
            AppState.isLoggedIn = true;
        }
    } catch (e) {
        console.warn('数据加载失败，使用默认数据', e);
    }
}

function saveToStorage() {
    try {
        localStorage.setItem('as_users', JSON.stringify(AppState.users));
        localStorage.setItem('as_history', JSON.stringify(AppState.screeningHistory));
        localStorage.setItem('as_children', JSON.stringify(AppState.children));
        if (AppState.currentUser) {
            localStorage.setItem('as_currentUser', JSON.stringify(AppState.currentUser));
        } else {
            localStorage.removeItem('as_currentUser');
        }
    } catch (e) {
        showToast('本地存储空间不足，请清理数据');
    }
}

// ==================== 页面导航 ====================
function navigateTo(pageName, params) {
    const prevPage = document.getElementById(`page-${AppState.currentPage}`);
    const nextPage = document.getElementById(`page-${pageName}`);

    if (!nextPage) {
        console.warn(`页面 ${pageName} 不存在`);
        return;
    }

    // 隐藏上一页
    if (prevPage && prevPage !== nextPage) {
        prevPage.classList.remove('active');
    }

    // 显示新页面
    nextPage.classList.add('active');
    AppState.currentPage = pageName;

    // 控制底部导航显示
    const bottomNav = document.getElementById('bottomNav');
    const pagesWithNav = ['home', 'science', 'referral', 'profile'];
    const pagesWithNavCheck = ['screening']; // 筛查页也显示导航

    if (pagesWithNav.includes(pageName)) {
        bottomNav.classList.add('visible');
    } else {
        bottomNav.classList.remove('visible');
    }

    // 更新导航激活状态
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === pageName) {
            item.classList.add('active');
        }
    });

    // 页面特定初始化
    switch (pageName) {
        case 'home':
            initHomePage();
            break;
        case 'child-manage':
            renderChildrenList();
            break;
        case 'screening':
            initScreeningPage();
            break;
        case 'history':
            renderHistoryList();
            break;
        case 'profile':
            updateProfilePage();
            break;
        case 'science':
            renderScienceArticles('all');
            break;
        case 'referral':
            renderReferralList();
            break;
        case 'empowerment':
            renderEmpowermentGrid();
            break;
        case 'admin-dashboard':
            initAdminDashboard();
            break;
        case 'result':
            if (params && params.screeningResult) {
                renderScreeningResult(params.screeningResult);
            }
            break;
    }

    // 滚动到顶部
    const content = nextPage.querySelector('.page-content');
    if (content) content.scrollTop = 0;
}

// ==================== 首页初始化 ====================
function initHomePage() {
    // 检查登录状态
    if (!AppState.isLoggedIn) {
        // 游客模式，限制筛查功能
    }

    // 更新儿童数量显示
    if (AppState.children.length === 0 && AppState.isLoggedIn) {
        // 提示添加儿童
    }
}

// ==================== 轮播图 ====================
function initBannerSwiper() {
    let currentBannerIndex = 0;
    const slides = document.querySelectorAll('#homeBanner .banner-slide');
    const dots = document.querySelectorAll('#homeBanner .dot');

    if (slides.length === 0) return;

    function switchBanner(index) {
        slides.forEach(s => s.classList.remove('active'));
        dots.forEach(d => d.classList.remove('active'));
        slides[index].classList.add('active');
        dots[index].classList.add('active');
        currentBannerIndex = index;
    }

    // 点击dot切换
    dots.forEach(dot => {
        dot.addEventListener('click', () => {
            const index = parseInt(dot.dataset.index);
            switchBanner(index);
        });
    });

    // 自动轮播
    setInterval(() => {
        currentBannerIndex = (currentBannerIndex + 1) % slides.length;
        switchBanner(currentBannerIndex);
    }, 4000);
}

// ==================== 登录/注册逻辑 ====================
function sendVerifyCode() {
    const phone = document.getElementById('loginPhone').value.trim();
    if (!phone || phone.length !== 11 || !/^1\d{10}$/.test(phone)) {
        showToast('请输入正确的手机号');
        return;
    }

    const btn = document.getElementById('btnSendCode');
    let countdown = 60;
    btn.disabled = true;
    btn.textContent = `${countdown}s后重发`;

    const timer = setInterval(() => {
        countdown--;
        if (countdown <= 0) {
            clearInterval(timer);
            btn.disabled = false;
            btn.textContent = '获取验证码';
        } else {
            btn.textContent = `${countdown}s后重发`;
        }
    }, 1000);

    showToast('验证码已发送（演示模式：123456）');
}

function sendRegCode() {
    const phone = document.getElementById('regPhone').value.trim();
    if (!phone || phone.length !== 11 || !/^1\d{10}$/.test(phone)) {
        showToast('请输入正确的手机号');
        return;
    }
    showToast('验证码已发送（演示模式：123456）');
}

function doLogin() {
    const phone = document.getElementById('loginPhone').value.trim();
    const code = document.getElementById('loginCode').value.trim();

    if (!phone) { showToast('请输入手机号'); return; }
    if (!code) { showToast('请输入验证码'); return; }

    // 演示验证码
    if (code !== '123456') {
        showToast('验证码错误（演示验证码：123456）');
        return;
    }

    // 查找或创建用户
    let user = AppState.users.find(u => u.phone === phone);
    if (!user) {
        user = {
            id: 'U' + Date.now(),
            phone: phone,
            createTime: new Date().toISOString()
        };
        AppState.users.push(user);
    }

    AppState.currentUser = user;
    AppState.isLoggedIn = true;
    saveToStorage();

    showToast('登录成功！');
    setTimeout(() => navigateTo('home'), 500);
}

function doWechatLogin() {
    // 模拟微信登录
    const mockUser = {
        id: 'WX' + Date.now(),
        phone: '138****8888',
        nickname: '微信用户',
        createTime: new Date().toISOString()
    };

    AppState.currentUser = mockUser;
    AppState.isLoggedIn = true;
    saveToStorage();

    showToast('微信登录成功！');
    setTimeout(() => navigateTo('home'), 500);
}

function doRegister() {
    const phone = document.getElementById('regPhone').value.trim();
    const code = document.getElementById('regCode').value.trim();
    const password = document.getElementById('regPassword').value;
    const passwordConfirm = document.getElementById('regPasswordConfirm').value;
    const agreeTerms = document.getElementById('agreeTerms').checked;

    if (!phone) { showToast('请输入手机号'); return; }
    if (!code || code !== '123456') { showToast('验证码错误（演示验证码：123456）'); return; }
    if (!password || password.length < 6) { showToast('密码至少6位'); return; }
    if (password !== passwordConfirm) { showToast('两次密码不一致'); return; }
    if (!agreeTerms) { showToast('请先同意服务协议和隐私政策'); return; }

    // 检查是否已注册
    if (AppState.users.find(u => u.phone === phone)) {
        showToast('该手机号已注册，请直接登录');
        return;
    }

    const user = {
        id: 'U' + Date.now(),
        phone: phone,
        password: password,
        createTime: new Date().toISOString()
    };

    AppState.users.push(user);
    AppState.currentUser = user;
    AppState.isLoggedIn = true;
    saveToStorage();

    showToast('注册成功！');
    setTimeout(() => navigateTo('home'), 500);
}

function doLogout() {
    if (confirm('确定要退出登录吗？')) {
        AppState.isLoggedIn = false;
        AppState.currentUser = null;
        AppState.children = [];
        saveToStorage();
        showToast('已退出登录');
        navigateTo('splash');
    }
}

// ==================== 儿童管理 ====================
function renderChildrenList() {
    const container = document.getElementById('childrenList');
    if (!container) return;

    if (AppState.children.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">👶</div>
                <p>还没有添加宝宝信息</p>
                <p style="font-size:13px;color:var(--text-hint)">点击下方按钮添加宝宝，开始筛查</p>
            </div>
        `;
    } else {
        container.innerHTML = AppState.children.map((child, index) => `
            <div class="child-card" onclick="selectChildForScreeningDirect('${child.id}')">
                <div class="child-card-avatar">${child.avatar || '👶'}</div>
                <div class="child-card-info">
                    <div class="child-card-name">${child.name}</div>
                    <div class="child-card-detail">${child.gender === 'male' ? '👦' : '👧'} ${getChildAge(child.birthDate)} · ${formatDate(child.birthDate)}</div>
                </div>
                <div class="child-card-actions" onclick="event.stopPropagation()">
                    <button onclick="editChild('${child.id}')" title="编辑">✏️</button>
                    <button onclick="deleteChild('${child.id}')" title="删除">🗑️</button>
                </div>
            </div>
        `).join('');
    }

    hideChildForm();
}

function showAddChildForm() {
    const card = document.getElementById('childFormCard');
    card.classList.remove('hidden');
    document.getElementById('childFormTitle').textContent = '添加宝宝信息';
    AppState.editingChildId = null;
    AppState.selectedGender = '';
    AppState.selectedAvatar = '👶';

    // 重置表单
    document.getElementById('childName').value = '';
    document.getElementById('childBirth').value = '';
    document.getElementById('childGender').value = '';
    document.getElementById('childAvatar').value = '👶';
    document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('selected'));
    document.querySelectorAll('.avatar-option').forEach(a => a.classList.remove('selected'));
    document.querySelector('.avatar-option[data-avatar="👶"]')?.classList.add('selected');

    // 滚动到表单
    card.scrollIntoView({ behavior: 'smooth' });
}

function hideChildForm() {
    document.getElementById('childFormCard').classList.add('hidden');
}

function selectGender(gender, el) {
    document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('selected'));
    el.classList.add('selected');
    AppState.selectedGender = gender;
}

function selectAvatar(avatar, el) {
    document.querySelectorAll('.avatar-option').forEach(a => a.classList.remove('selected'));
    el.classList.add('selected');
    AppState.selectedAvatar = avatar;
}

function saveChild() {
    const name = document.getElementById('childName').value.trim();
    const birth = document.getElementById('childBirth').value;
    const gender = AppState.selectedGender;
    const avatar = AppState.selectedAvatar;

    if (!name) { showToast('请输入宝宝昵称'); return; }
    if (!gender) { showToast('请选择性别'); return; }
    if (!birth) { showToast('请选择出生日期'); return; }

    // 验证年龄在1-5岁
    const age = getAgeInMonths(birth);
    if (age < 12 || age > 60) {
        showToast('本筛查适用于1-5岁（12-60个月）的儿童');
        return;
    }

    if (AppState.editingChildId) {
        // 编辑模式
        const child = AppState.children.find(c => c.id === AppState.editingChildId);
        if (child) {
            child.name = name;
            child.gender = gender;
            child.birthDate = birth;
            child.avatar = avatar;
        }
    } else {
        // 新增模式
        const child = {
            id: 'C' + Date.now(),
            userId: AppState.currentUser ? AppState.currentUser.id : 'guest',
            name: name,
            gender: gender,
            birthDate: birth,
            avatar: avatar,
            createTime: new Date().toISOString()
        };
        AppState.children.push(child);
    }

    saveToStorage();
    renderChildrenList();
    showToast(AppState.editingChildId ? '宝宝信息已更新' : '宝宝信息已添加');
    AppState.editingChildId = null;
}

function editChild(childId) {
    const child = AppState.children.find(c => c.id === childId);
    if (!child) return;

    AppState.editingChildId = childId;
    AppState.selectedGender = child.gender;
    AppState.selectedAvatar = child.avatar || '👶';

    const card = document.getElementById('childFormCard');
    card.classList.remove('hidden');
    document.getElementById('childFormTitle').textContent = '编辑宝宝信息';
    document.getElementById('childName').value = child.name;
    document.getElementById('childBirth').value = child.birthDate;

    // 设置性别
    document.querySelectorAll('.gender-btn').forEach(b => {
        b.classList.remove('selected');
        if (b.dataset.gender === child.gender) b.classList.add('selected');
    });

    // 设置头像
    document.querySelectorAll('.avatar-option').forEach(a => {
        a.classList.remove('selected');
        if (a.dataset.avatar === child.avatar) a.classList.add('selected');
    });

    card.scrollIntoView({ behavior: 'smooth' });
}

function deleteChild(childId) {
    if (!confirm('确定要删除该宝宝的信息吗？相关的筛查记录也会被删除。')) return;

    AppState.children = AppState.children.filter(c => c.id !== childId);
    AppState.screeningHistory = AppState.screeningHistory.filter(h => h.childId !== childId);
    saveToStorage();
    renderChildrenList();
    showToast('宝宝信息已删除');
}

function selectChildForScreeningDirect(childId) {
    AppState.screening.childId = childId;
    navigateTo('screening');
}

function getChildAge(birthDate) {
    const birth = new Date(birthDate);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
    if (months < 12) return `${months}个月`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    return remainingMonths > 0 ? `${years}岁${remainingMonths}个月` : `${years}岁`;
}

function getAgeInMonths(birthDate) {
    const birth = new Date(birthDate);
    const now = new Date();
    return (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ==================== 筛查流程 ====================
function initScreeningPage() {
    const preStart = document.getElementById('screeningPreStart');
    const inProgress = document.getElementById('screeningInProgress');

    // 如果有进行中的筛查则恢复，否则显示开始页
    if (AppState.screening.currentQuestionIndex > 0 && AppState.screening.childId) {
        preStart.classList.add('hidden');
        inProgress.classList.remove('hidden');
        loadQuestion(AppState.screening.currentQuestionIndex);
        updateProgress();
    } else {
        preStart.classList.remove('hidden');
        inProgress.classList.add('hidden');
        // 填充儿童选择列表
        const select = document.getElementById('selectChildForScreening');
        select.innerHTML = '<option value="">-- 请选择宝宝 --</option>' +
            AppState.children.map(c =>
                `<option value="${c.id}">${c.avatar || '👶'} ${c.name} (${getChildAge(c.birthDate)})</option>`
            ).join('');

        if (AppState.children.length === 0) {
            select.innerHTML = '<option value="">-- 请先添加宝宝信息 --</option>';
        }
    }
}

function startScreening() {
    const select = document.getElementById('selectChildForScreening');
    const childId = select.value;

    if (!childId) {
        showToast('请先选择筛查宝宝');
        return;
    }

    // 重置筛查状态
    AppState.screening = {
        childId: childId,
        currentQuestionIndex: 0,
        answers: {},
        totalScore: 0,
        riskLevel: '',
        startTime: new Date().toISOString()
    };

    document.getElementById('screeningPreStart').classList.add('hidden');
    document.getElementById('screeningInProgress').classList.remove('hidden');
    loadQuestion(0);
    updateProgress();
}

function loadQuestion(index) {
    const question = SCREENING_QUESTIONS[index];
    if (!question) return;

    AppState.screening.currentQuestionIndex = index;

    // 更新题号
    document.getElementById('currentQuestionNum').textContent = index + 1;
    document.getElementById('screeningStep').textContent = `${index + 1}/${SCREENING_QUESTIONS.length}`;

    // 更新题目
    document.getElementById('questionText').textContent = question.content;

    // 加载视频
    const video = document.getElementById('screeningVideo');
    const placeholder = document.getElementById('videoPlaceholder');
    video.src = question.videoUrl;
    video.style.display = 'block';

    // 视频加载失败时显示占位
    video.onerror = () => {
        video.style.display = 'none';
        placeholder.style.display = 'flex';
    };
    video.onloadeddata = () => {
        video.style.display = 'block';
        placeholder.style.display = 'none';
    };

    // 渲染选项
    const optionsContainer = document.getElementById('questionOptions');
    const savedAnswer = AppState.screening.answers[question.id];

    optionsContainer.innerHTML = question.options.map(opt => `
        <div class="question-option ${savedAnswer && savedAnswer.value === opt.value ? 'selected' : ''}"
             onclick="selectAnswer(${question.id}, ${opt.value}, ${opt.score})">
            <div class="option-dot">${savedAnswer && savedAnswer.value === opt.value ? '✓' : ''}</div>
            ${opt.label}
        </div>
    `).join('');

    // 更新导航按钮
    updateNavButtons();
}

function selectAnswer(questionId, value, score) {
    // 记录答案
    const prevScore = AppState.screening.answers[questionId]?.score || 0;
    AppState.screening.answers[questionId] = { value, score };
    AppState.screening.totalScore += (score - prevScore);

    // 更新选项UI
    const options = document.querySelectorAll('#questionOptions .question-option');
    options.forEach(opt => opt.classList.remove('selected'));
    event.currentTarget.classList.add('selected');

    // 更新选项圆点
    options.forEach(opt => {
        const dot = opt.querySelector('.option-dot');
        dot.textContent = '';
    });
    event.currentTarget.querySelector('.option-dot').textContent = '✓';

    updateNavButtons();
}

function updateNavButtons() {
    const idx = AppState.screening.currentQuestionIndex;
    const total = SCREENING_QUESTIONS.length;
    const currentQ = SCREENING_QUESTIONS[idx];
    const hasAnswer = !!AppState.screening.answers[currentQ.id];

    document.getElementById('btnPrev').disabled = idx === 0;
    document.getElementById('btnNext').classList.toggle('hidden', idx >= total - 1);
    document.getElementById('btnSubmit').classList.toggle('hidden', idx < total - 1);

    if (idx >= total - 1) {
        // 最后一题，检查是否全部答完
        const allAnswered = SCREENING_QUESTIONS.every(q => AppState.screening.answers[q.id]);
        document.getElementById('btnSubmit').disabled = !allAnswered;
        if (!allAnswered) {
            document.getElementById('btnSubmit').textContent = '请回答所有题目后再提交';
        } else {
            document.getElementById('btnSubmit').textContent = '提交筛查';
        }
    }
}

function prevQuestion() {
    if (AppState.screening.currentQuestionIndex > 0) {
        loadQuestion(AppState.screening.currentQuestionIndex - 1);
        updateProgress();
    }
}

function nextQuestion() {
    const currentQ = SCREENING_QUESTIONS[AppState.screening.currentQuestionIndex];
    if (!AppState.screening.answers[currentQ.id]) {
        showToast('请先回答当前题目');
        return;
    }

    if (AppState.screening.currentQuestionIndex < SCREENING_QUESTIONS.length - 1) {
        loadQuestion(AppState.screening.currentQuestionIndex + 1);
        updateProgress();
    }
}

function updateProgress() {
    const idx = AppState.screening.currentQuestionIndex;
    const total = SCREENING_QUESTIONS.length;
    const answeredCount = Object.keys(AppState.screening.answers).length;
    const percentage = Math.round((answeredCount / total) * 100);

    document.getElementById('progressFill').style.width = percentage + '%';
    document.getElementById('progressText').textContent = `${answeredCount}/${total}`;
}

function confirmExitScreening() {
    if (Object.keys(AppState.screening.answers).length > 0) {
        if (!confirm('确定要退出筛查吗？当前答题进度将不会保存。')) return;
    }
    AppState.screening = {
        childId: null,
        currentQuestionIndex: 0,
        answers: {},
        totalScore: 0,
        riskLevel: '',
        startTime: null
    };
    navigateTo('home');
}

function submitScreening() {
    const allAnswered = SCREENING_QUESTIONS.every(q => AppState.screening.answers[q.id]);
    if (!allAnswered) {
        showToast('请回答所有题目后再提交');
        return;
    }

    const totalScore = AppState.screening.totalScore;
    let riskLevel, riskText, riskIcon, riskColorClass;

    // 风险等级判定 (0-60分)
    if (totalScore <= 15) {
        riskLevel = 'low';
        riskText = '低风险';
        riskIcon = '✅';
        riskColorClass = 'risk-low';
    } else if (totalScore <= 35) {
        riskLevel = 'medium';
        riskText = '中风险';
        riskIcon = '⚠️';
        riskColorClass = 'risk-medium';
    } else {
        riskLevel = 'high';
        riskText = '高风险';
        riskIcon = '🔴';
        riskColorClass = 'risk-high';
    }

    AppState.screening.riskLevel = riskLevel;

    // 保存筛查记录
    const child = AppState.children.find(c => c.id === AppState.screening.childId);
    const record = {
        id: 'S' + Date.now(),
        childId: AppState.screening.childId,
        childName: child ? child.name : '未知',
        childAvatar: child ? child.avatar : '👶',
        totalScore: totalScore,
        riskLevel: riskLevel,
        riskText: riskText,
        answers: { ...AppState.screening.answers },
        answerCount: SCREENING_QUESTIONS.length,
        createTime: new Date().toISOString()
    };

    AppState.screeningHistory.unshift(record);
    saveToStorage();

    // 跳转到结果页
    navigateTo('result', { screeningResult: record });
}

// ==================== 筛查结果 ====================
function renderScreeningResult(record) {
    const container = document.getElementById('resultContent');
    if (!container) return;

    const child = AppState.children.find(c => c.id === record.childId);
    const recommendations = getRecommendations(record.riskLevel, record.totalScore);

    container.innerHTML = `
        <div class="result-header ${record.riskLevel === 'low' ? 'risk-low' : record.riskLevel === 'medium' ? 'risk-medium' : 'risk-high'}">
            <div class="result-risk-icon">${record.riskLevel === 'low' ? '✅' : record.riskLevel === 'medium' ? '⚠️' : '🔴'}</div>
            <div class="result-risk-level">${record.riskText}</div>
            <div class="result-score">筛查得分：${record.totalScore} / ${SCREENING_QUESTIONS.length * 3} 分</div>
        </div>

        <div class="result-detail-card">
            <h4>📋 基本信息</h4>
            <p>筛查对象：${child ? child.avatar + ' ' + child.name : record.childName}</p>
            <p>月龄：${child ? getChildAge(child.birthDate) : '未知'}</p>
            <p>筛查时间：${formatDateTime(record.createTime)}</p>
            <p>答题数量：${record.answerCount} 题</p>
        </div>

        <div class="result-detail-card">
            <h4>💡 专业建议</h4>
            ${recommendations.map(r => `<p>• ${r}</p>`).join('')}
        </div>

        <div class="result-detail-card" style="background:var(--primary-lighter)">
            <h4>⚠️ 重要提醒</h4>
            <p style="font-size:13px;color:var(--primary-dark)">
                本筛查结果仅为早期参考，不能替代专业医疗诊断。如对孩子的发育有任何疑虑，请务必咨询专业医生或前往正规医疗机构就诊。
            </p>
        </div>

        <div class="result-actions">
            <button class="btn btn-primary btn-block" onclick="navigateTo('history')">查看历史记录</button>
            <button class="btn btn-outline btn-block" onclick="shareResult()">分享报告</button>
            <button class="btn btn-outline btn-block" onclick="sendResultEmail()">发送到邮箱</button>
            <button class="btn btn-outline btn-block" onclick="navigateTo('referral')">查看转诊机构</button>
        </div>
    `;
}

function getRecommendations(riskLevel, score) {
    if (riskLevel === 'low') {
        return [
            '孩子目前各项指标表现良好，请继续保持关注。',
            '建议每3-6个月进行一次发育监测。',
            '多与孩子互动交流，创造丰富的语言和社交环境。',
            '如有任何担忧，随时可以进行再次筛查。'
        ];
    } else if (riskLevel === 'medium') {
        return [
            '部分指标需要引起关注，建议进一步观察。',
            '推荐在1-2个月内前往专业机构进行发育评估。',
            '增加亲子互动时间，特别关注社交沟通方面的引导。',
            '记录孩子日常行为表现，便于医生评估时参考。'
        ];
    } else {
        return [
            '筛查结果提示需要高度重视，建议尽快进行专业评估。',
            '请携带本筛查报告，前往儿童发育行为专科就诊。',
            '不要过度焦虑，早期发现意味着早期干预的机会。',
            '等待就诊期间，增加与孩子的互动和交流。',
            '建议同时向当地残联或妇幼保健机构咨询相关政策支持。'
        ];
    }
}

function shareResult() {
    if (navigator.share) {
        navigator.share({
            title: '星语 · 孤独症筛查报告',
            text: '我在星语平台完成了儿童发育筛查，查看我的筛查结果。',
        }).catch(() => {});
    } else {
        showToast('已复制分享链接');
    }
}

function sendResultEmail() {
    const email = prompt('请输入接收报告的邮箱地址：');
    if (email) {
        showToast(`报告已发送至 ${email}（演示模式）`);
    }
}

// ==================== 历史记录 ====================
function renderHistoryList() {
    const container = document.getElementById('historyList');
    const empty = document.getElementById('historyEmpty');

    if (!container) return;

    if (AppState.screeningHistory.length === 0) {
        container.innerHTML = '';
        empty.classList.remove('hidden');
    } else {
        empty.classList.add('hidden');
        container.innerHTML = AppState.screeningHistory.map(record => `
            <div class="history-item" onclick="viewHistoryDetail('${record.id}')">
                <div class="history-item-header">
                    <span class="history-child">${record.childAvatar || '👶'} ${record.childName}</span>
                    <span class="history-date">${formatDateTime(record.createTime)}</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center">
                    <span class="history-badge ${record.riskLevel}">${record.riskText}</span>
                    <span style="font-size:13px;color:var(--text-secondary)">得分：${record.totalScore}</span>
                </div>
            </div>
        `).join('');
    }
}

function viewHistoryDetail(recordId) {
    const record = AppState.screeningHistory.find(r => r.id === recordId);
    if (record) {
        navigateTo('result', { screeningResult: record });
    }
}

// ==================== 科普知识 ====================
function renderScienceArticles(category) {
    const container = document.getElementById('scienceArticleList');
    if (!container) return;

    const articles = category === 'all'
        ? SCIENCE_ARTICLES
        : SCIENCE_ARTICLES.filter(a => a.category === category);

    container.innerHTML = articles.map(article => `
        <div class="article-card" onclick="showArticleDetail(${article.id})">
            <h4>${article.title}</h4>
            <p>${article.summary}</p>
            <div class="article-meta">${article.date} · ${article.author}</div>
        </div>
    `).join('');
}

function switchScienceTab(category, el) {
    document.querySelectorAll('.science-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    renderScienceArticles(category);
}

function showArticleDetail(articleId) {
    const article = SCIENCE_ARTICLES.find(a => a.id === articleId);
    if (!article) return;

    const modal = document.getElementById('modal');
    const content = document.getElementById('modalContent');
    content.innerHTML = `
        <h3>${article.title}</h3>
        <div class="article-meta" style="margin-bottom:16px">${article.date} · ${article.author}</div>
        <p>${article.content.replace(/\n/g, '<br>')}</p>
        <button class="btn btn-primary btn-block" onclick="closeModal()">关闭</button>
    `;
    modal.classList.remove('hidden');
}

// ==================== 转诊服务 ====================
function renderReferralList() {
    const container = document.getElementById('referralList');
    if (!container) return;

    // 按地区分组
    const grouped = {};
    REFERRAL_INSTITUTIONS.forEach(inst => {
        if (!grouped[inst.region]) grouped[inst.region] = [];
        grouped[inst.region].push(inst);
    });

    container.innerHTML = Object.entries(grouped).map(([region, institutions]) => `
        <div style="margin-bottom:16px">
            <h4 style="color:var(--primary);margin-bottom:8px">📍 ${region}</h4>
            ${institutions.map(inst => `
                <div class="referral-card" style="margin-bottom:10px">
                    <h4>${inst.name}</h4>
                    <span class="region-tag">${inst.department}</span>
                    <p>📍 ${inst.address}</p>
                    <p>📞 ${inst.phone}</p>
                    <p style="margin-top:6px">${inst.description}</p>
                </div>
            `).join('')}
        </div>
    `).join('');
}

// ==================== 赋能支持 ====================
function renderEmpowermentGrid() {
    const container = document.getElementById('empowermentGrid');
    if (!container) return;

    container.innerHTML = EMPOWERMENT_RESOURCES.map(res => `
        <div class="empower-card" onclick="showToast('${res.title}——即将上线，敬请期待！')">
            <div class="empower-card-icon">${res.icon}</div>
            <div class="empower-card-content">
                <h4>${res.title}</h4>
                <p>${res.desc}</p>
            </div>
        </div>
    `).join('');
}

// ==================== 个人中心 ====================
function updateProfilePage() {
    if (AppState.isLoggedIn && AppState.currentUser) {
        document.getElementById('profileName').textContent = AppState.currentUser.nickname || '用户' + AppState.currentUser.phone.slice(-4);
        document.getElementById('profilePhone').textContent = AppState.currentUser.phone;
        document.getElementById('profileAvatar').textContent = '👤';
        document.getElementById('btnLogout').style.display = 'block';
    } else {
        document.getElementById('profileName').textContent = '未登录';
        document.getElementById('profilePhone').textContent = '点击登录';
        document.getElementById('profileAvatar').textContent = '👤';
        document.getElementById('btnLogout').style.display = 'none';
    }

    // 点击头像区域跳转登录
    document.getElementById('profileHeaderCard').onclick = () => {
        if (!AppState.isLoggedIn) navigateTo('login');
    };
}

// ==================== 管理员 ====================
function doAdminLogin() {
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;

    const admin = AppState.adminAccounts.find(a => a.username === username && a.password === password);
    if (admin) {
        AppState.isAdminLoggedIn = true;
        showToast('管理员登录成功');
        setTimeout(() => navigateTo('admin-dashboard'), 500);
    } else {
        showToast('账号或密码错误（演示账号：admin/admin123）');
    }
}

function doAdminLogout() {
    AppState.isAdminLoggedIn = false;
    showToast('已退出管理员后台');
    navigateTo('home');
}

function initAdminDashboard() {
    // 计算统计数据
    const totalUsers = AppState.users.length;
    const totalChildren = AppState.children.length;
    const totalScreenings = AppState.screeningHistory.length;
    const highRiskCount = AppState.screeningHistory.filter(r => r.riskLevel === 'high').length;
    const mediumRiskCount = AppState.screeningHistory.filter(r => r.riskLevel === 'medium').length;
    const lowRiskCount = AppState.screeningHistory.filter(r => r.riskLevel === 'low').length;

    document.getElementById('statUsers').textContent = totalUsers;
    document.getElementById('statChildren').textContent = totalChildren;
    document.getElementById('statScreenings').textContent = totalScreenings;
    document.getElementById('statHighRisk').textContent = highRiskCount;

    // 更新风险分布图
    const maxCount = Math.max(highRiskCount, mediumRiskCount, lowRiskCount, 1);
    document.getElementById('barHigh').style.width = (highRiskCount / maxCount * 100) + '%';
    document.getElementById('barMedium').style.width = (mediumRiskCount / maxCount * 100) + '%';
    document.getElementById('barLow').style.width = (lowRiskCount / maxCount * 100) + '%';
    document.getElementById('valHigh').textContent = highRiskCount;
    document.getElementById('valMedium').textContent = mediumRiskCount;
    document.getElementById('valLow').textContent = lowRiskCount;

    // 默认显示用户列表
    switchAdminTabContent('users');
}

function switchAdminTab(tabName, el) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    AppState.adminTab = tabName;
    switchAdminTabContent(tabName);
}

function switchAdminTabContent(tabName) {
    const container = document.getElementById('adminDataTable');
    if (!container) return;

    switch (tabName) {
        case 'users':
            container.innerHTML = `
                <div class="data-table-row data-table-header">
                    <span style="flex:1">电话</span>
                    <span style="flex:1">注册时间</span>
                    <span style="flex:0.5">记录</span>
                </div>
                ${AppState.users.length === 0 ? '<div class="data-table-row"><span>暂无用户数据</span></div>' : ''}
                ${AppState.users.map(u => `
                    <div class="data-table-row">
                        <span style="flex:1">${u.phone}</span>
                        <span style="flex:1">${formatDateTime(u.createTime)}</span>
                        <span style="flex:0.5">${AppState.screeningHistory.filter(r => AppState.children.find(c => c.userId === u.id && c.id === r.childId)).length}条</span>
                    </div>
                `).join('')}
            `;
            break;
        case 'children':
            container.innerHTML = `
                <div class="data-table-row data-table-header">
                    <span style="flex:1.5">昵称</span>
                    <span style="flex:0.8">性别</span>
                    <span style="flex:1.2">年龄</span>
                    <span style="flex:1">筛查次数</span>
                </div>
                ${AppState.children.length === 0 ? '<div class="data-table-row"><span>暂无儿童数据</span></div>' : ''}
                ${AppState.children.map(c => `
                    <div class="data-table-row">
                        <span style="flex:1.5">${c.avatar || '👶'} ${c.name}</span>
                        <span style="flex:0.8">${c.gender === 'male' ? '男' : '女'}</span>
                        <span style="flex:1.2">${getChildAge(c.birthDate)}</span>
                        <span style="flex:1">${AppState.screeningHistory.filter(r => r.childId === c.id).length}次</span>
                    </div>
                `).join('')}
            `;
            break;
        case 'records':
            container.innerHTML = `
                <div class="data-table-row data-table-header">
                    <span style="flex:1.2">儿童</span>
                    <span style="flex:0.8">风险等级</span>
                    <span style="flex:0.6">得分</span>
                    <span style="flex:1.2">筛查时间</span>
                </div>
                ${AppState.screeningHistory.length === 0 ? '<div class="data-table-row"><span>暂无筛查记录</span></div>' : ''}
                ${AppState.screeningHistory.map(r => `
                    <div class="data-table-row" style="cursor:pointer" onclick="viewHistoryDetail('${r.id}')">
                        <span style="flex:1.2">${r.childAvatar || '👶'} ${r.childName}</span>
                        <span style="flex:0.8"><span class="history-badge ${r.riskLevel}">${r.riskText}</span></span>
                        <span style="flex:0.6">${r.totalScore}</span>
                        <span style="flex:1.2">${formatDateTime(r.createTime)}</span>
                    </div>
                `).join('')}
            `;
            break;
    }
}

function exportData() {
    let csvContent = '﻿'; // BOM for Chinese

    switch (AppState.adminTab) {
        case 'users':
            csvContent += '手机号,注册时间\n';
            AppState.users.forEach(u => {
                csvContent += `${u.phone},${formatDateTime(u.createTime)}\n`;
            });
            break;
        case 'children':
            csvContent += '昵称,性别,出生日期,年龄,筛查次数\n';
            AppState.children.forEach(c => {
                const count = AppState.screeningHistory.filter(r => r.childId === c.id).length;
                csvContent += `${c.name},${c.gender === 'male' ? '男' : '女'},${c.birthDate},${getChildAge(c.birthDate)},${count}\n`;
            });
            break;
        case 'records':
            csvContent += '儿童,风险等级,得分,筛查时间\n';
            AppState.screeningHistory.forEach(r => {
                csvContent += `${r.childName},${r.riskText},${r.totalScore},${formatDateTime(r.createTime)}\n`;
            });
            break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `星语数据导出_${formatDate(new Date().toISOString())}.csv`;
    link.click();
    showToast('数据导出成功');
}

// ==================== 弹窗/Toast/Modal ====================
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.style.opacity = '1';

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 2000);
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

// 点击遮罩关闭
document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

// ==================== 隐私/条款弹窗 ====================
function showTerms() {
    const modal = document.getElementById('modal');
    const content = document.getElementById('modalContent');
    content.innerHTML = `
        <h3>用户服务协议</h3>
        <p>欢迎使用星语·孤独症早期支持平台（以下简称"本平台"）。</p>
        <p>1. 本平台提供的筛查服务仅供早期参考，不能替代专业医疗诊断。</p>
        <p>2. 用户应确保提供的儿童信息真实、准确。</p>
        <p>3. 本平台将严格保护用户隐私信息，不会向第三方泄露。</p>
        <p>4. 用户不得利用本平台从事任何违法违规行为。</p>
        <p>5. 本平台保留对服务内容进行修改和调整的权利。</p>
        <button class="btn btn-primary btn-block" onclick="closeModal()">我知道了</button>
    `;
    modal.classList.remove('hidden');
}

function showPrivacy() {
    const modal = document.getElementById('modal');
    const content = document.getElementById('modalContent');
    content.innerHTML = `
        <h3>隐私政策</h3>
        <p>本平台重视您的隐私保护：</p>
        <p>1. <strong>信息收集：</strong>我们仅收集为提供筛查服务所必需的信息，包括手机号、儿童基本信息、筛查答案。</p>
        <p>2. <strong>信息使用：</strong>收集的信息仅用于提供筛查评估和生成报告。</p>
        <p>3. <strong>信息存储：</strong>您的数据存储在安全的服务器上，采取加密措施保护。</p>
        <p>4. <strong>信息共享：</strong>未经您的明确同意，我们不会将您的信息分享给第三方。</p>
        <p>5. <strong>您的权利：</strong>您可以随时查看、修改或删除您的个人信息。</p>
        <button class="btn btn-primary btn-block" onclick="closeModal()">我知道了</button>
    `;
    modal.classList.remove('hidden');
}

// ==================== 工具函数 ====================
function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ==================== 键盘导航（开发调试用） ====================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
    // 管理员页面快捷键 Ctrl+Shift+A
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        navigateTo('admin-login');
    }
});

// ==================== 管理员入口（点击关于页logo 7次） ====================
let logoClickCount = 0;
document.addEventListener('click', (e) => {
    if (e.target.closest('.about-logo')) {
        logoClickCount++;
        if (logoClickCount >= 7) {
            logoClickCount = 0;
            navigateTo('admin-login');
        }
    }
});
