const app = getApp();
const request = require('../../utils/request');
const ageUtils = require('../../utils/age');

Page({
    data: {
        started: false,
        childList: [],
        selectedChildId: '',
        selectedChildLabel: '',
        questionnaireInfo: null,
        questionnaireId: null,
        questions: [],
        currentIdx: 0,
        currentOptions: [],
        questionText: '',
        videoUrl: '',
        videoError: false,
        selectedAnswer: null,
        progressPercent: 0,
        answeredCount: 0,
        allAnswered: false,
        answers: {},
        totalScore: 0,
        totalQuestions: 20,
        loading: true
    },

    onShow() {
        if (!this.data.started) {
            // 隐私页回调通过 globalData 同步传参（绕过 setData 异步问题）
            const pending = app.globalData.screening;
            if (pending && pending.consentedChildId) {
                const cid = pending.consentedChildId;
                pending.consentedChildId = null;
                // 直接启动筛查，不重载儿童列表
                this.setData({ selectedChildId: cid });
                this._doStartScreening(cid);
                return;
            }
            this._loadChildren();
        }
    },

    _loadChildren() {
        request.get('/api/child/list').then(children => {
            const childList = children.map(c => ({
                label: (c.avatar || '👶') + ' ' + c.name + ' (' + this._getAge(c.birth_date) + ')',
                value: c.id
            }));

            let selectedIdx = -1;
            let selectedId = '';
            let selectedLabel = '';
            const preSelectedId = app.globalData.screening.childId;
            if (preSelectedId && children.length > 0) {
                const idx = children.findIndex(c => c.id === preSelectedId);
                if (idx >= 0) {
                    selectedIdx = idx;
                    selectedId = children[idx].id;
                    selectedLabel = childList[idx].label;
                }
            }
            app.globalData.screening.childId = null;

            this.setData({
                childList,
                pickerValue: selectedIdx,
                selectedChildId: selectedId,
                selectedChildLabel: selectedLabel,
                loading: false
            });
            if (selectedId) this._loadQuestionnaireInfo(selectedId);
        }).catch(() => {
            this.setData({ loading: false });
        });
    },

    onSelectChild(e) {
        const idx = e.detail.value;
        const item = this.data.childList[idx];
        if (item) {
            this.setData({
                selectedChildId: item.value,
                selectedChildLabel: item.label
            });
            this._loadQuestionnaireInfo(item.value);
        }
    },

    _loadQuestionnaireInfo(childId) {
        request.get('/api/questionnaire/match?childId=' + childId).then(info => {
            this.setData({ questionnaireInfo: info });
        }).catch(() => {});
    },

    startScreening(childId) {
        // 兼容两种调用：WXML按钮(bindtap传事件对象) / 隐私页回调(传数字childId)
        const cid = (typeof childId === 'number' || typeof childId === 'string') ? childId : this.data.selectedChildId;
        if (!cid || typeof cid !== 'number' && isNaN(Number(cid))) {
            wx.showToast({ title: '请先选择筛查宝宝', icon: 'none' });
            return;
        }
        // 确保 selectedChildId 已设置（从隐私页回调时可能未设）
        if (childId && (typeof childId === 'number' || typeof childId === 'string')) {
            this.setData({ selectedChildId: Number(cid) });
        }
        // 检查是否已签署知情同意书
        request.get('/api/user/profile').then(profile => {
            if (profile.agreed_privacy === 1) {
                this._doStartScreening(cid);
            } else {
                wx.navigateTo({ url: '/pages/privacy-agreement/privacy-agreement?childId=' + cid });
            }
        }).catch(() => {
            wx.showToast({ title: '网络异常，请重试', icon: 'none' });
        });
    },

    _doStartScreening(childId) {
        const cid = Number(childId || this.data.selectedChildId);
        wx.showLoading({ title: '加载题目...' });
        request.get('/api/questionnaire/match?childId=' + cid).then(questionnaire => {
            wx.hideLoading();
            const questions = (questionnaire.questions || []).map(q => ({
                id: q.id,
                videoUrl: this._resolveVideoUrl(q.video_url),
                content: q.content,
                options: q.options,
                isReverse: q.is_reverse
            }));
            const totalQuestions = questions.length;

            // 记录最近筛查的儿童ID，供转诊页城市匹配使用
            app.globalData.screening = app.globalData.screening || {};
            app.globalData.screening.lastChildId = cid;

            this.setData({
                questionnaireInfo: questionnaire,
                questionnaireId: questionnaire.id,
                questions,
                totalQuestions,
                started: true,
                currentIdx: 0,
                answers: {},
                totalScore: 0,
                selectedAnswer: null,
                progressPercent: 0,
                answeredCount: 0,
                allAnswered: false
            });
            this._loadQuestion(0);
        }).catch(() => {
            wx.hideLoading();
        });
    },

    _loadQuestion(idx) {
        const questions = this.data.questions;
        if (idx >= questions.length) return;
        const q = questions[idx];
        const saved = this.data.answers[q.id];
        this.setData({
            currentIdx: idx,
            questionText: q.content,
            currentOptions: q.options,
            videoUrl: q.videoUrl || '',
            videoError: false,
            selectedAnswer: saved ? saved.value : null
        });
    },

    selectAnswer(e) {
        const value = e.currentTarget.dataset.value;
        const questions = this.data.questions;
        const q = questions[this.data.currentIdx];
        const prev = this.data.answers[q.id];
        const prevScore = prev ? prev.score : 0;
        const score = q.isReverse ? (value === 1 ? 0 : 1) : value;

        const answers = { ...this.data.answers, [q.id]: { value, score } };
        const totalScore = this.data.totalScore + score - prevScore;
        const answeredCount = Object.keys(answers).length;
        const progressPercent = Math.round((answeredCount / questions.length) * 100);
        const allAnswered = answeredCount >= questions.length;

        this.setData({
            answers,
            totalScore,
            selectedAnswer: value,
            answeredCount,
            progressPercent,
            allAnswered
        });
    },

    prevQuestion() {
        if (this.data.currentIdx > 0) {
            this._loadQuestion(this.data.currentIdx - 1);
        }
    },

    nextQuestion() {
        const questions = this.data.questions;
        const q = questions[this.data.currentIdx];
        if (this.data.answers[q.id] === undefined) {
            wx.showToast({ title: '请先回答当前题目', icon: 'none' });
            return;
        }
        if (this.data.currentIdx < questions.length - 1) {
            this._loadQuestion(this.data.currentIdx + 1);
        }
    },

    submitScreening() {
        const questions = this.data.questions;
        if (Object.keys(this.data.answers).length < questions.length) {
            wx.showToast({ title: '请回答所有题目', icon: 'none' });
            return;
        }

        wx.showLoading({ title: '提交中...' });
        const apiAnswers = Object.entries(this.data.answers).map(([qid, ans]) => ({
            questionId: parseInt(qid),
            value: ans.value
        }));

        request.post('/api/answer/submit', {
            childId: this.data.selectedChildId,
            qid: this.data.questionnaireId,
            answers: apiAnswers
        }).then(data => {
            wx.hideLoading();
            this.setData({ started: false });
            // 提交成功后请求订阅消息授权（后续筛查提醒、复测提醒等）
            app.requestSubscribeMessage();
            wx.navigateTo({ url: '/pages/result/result?recordId=' + data.id });
        }).catch(() => {
            wx.hideLoading();
        });
    },

    _getAge(birthDate) {
        if (!birthDate) return '';
        const m = ageUtils.getActualAgeMonths(birthDate);
        if (m < 12) return m + '个月';
        const y = Math.floor(m / 12);
        const rm = m % 12;
        return rm > 0 ? y + '岁' + rm + '个月' : y + '岁';
    },

    onVideoError() {
        this.setData({ videoError: true });
    },

    // 把数据库里的相对路径（如 /api/video/12m/q1.mp4）解析为完整可播放 URL
    _resolveVideoUrl(url) {
        if (!url) return '';
        if (url.indexOf('http') === 0) return url;
        return request.BASE_URL + url;
    }
});
