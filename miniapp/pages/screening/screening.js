const app = getApp();
const QUESTIONS = require('../../utils/data.js').SCREENING_QUESTIONS || [];

// Fallback if module system doesn't work - define inline
const SCREENING_QUESTIONS = QUESTIONS.length > 0 ? QUESTIONS : [];

Page({
    data: {
        started: false,
        childList: [],
        selectedChildId: '',
        selectedChildLabel: '',
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
        totalScore: 0
    },

    onShow() {
        // Build child list for picker
        const children = app.globalData.children || [];
        const childList = children.map(c => ({
            label: (c.avatar || '👶') + ' ' + c.name + ' (' + this._getAge(c.birthDate) + ')',
            value: c.id
        }));

        // Auto-select the child if one was pre-selected (from child-manage page)
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
                app.globalData.screening.childId = null; // Clear after use
            }
        }

        this.setData({ childList, pickerValue: selectedIdx, selectedChildId: selectedId, selectedChildLabel: selectedLabel });
    },

    onSelectChild(e) {
        const idx = e.detail.value;
        const child = (app.globalData.children || [])[idx];
        if (child) {
            this.setData({
                selectedChildId: child.id,
                selectedChildLabel: this.data.childList[idx].label
            });
        }
    },

    startScreening() {
        if (!this.data.selectedChildId) {
            wx.showToast({ title: '请先选择筛查宝宝', icon: 'none' });
            return;
        }
        // Reset
        app.globalData.screening = {
            childId: this.data.selectedChildId,
            currentQuestionIndex: 0,
            answers: {},
            totalScore: 0,
            riskLevel: '',
            startTime: new Date().toISOString()
        };
        this.setData({
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
    },

    _loadQuestion(idx) {
        const questions = this._getQuestions();
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
        const { value, score } = e.currentTarget.dataset;
        const questions = this._getQuestions();
        const q = questions[this.data.currentIdx];
        const prev = this.data.answers[q.id];
        const prevScore = prev ? prev.score : 0;

        const answers = { ...this.data.answers, [q.id]: { value, score } };
        const totalScore = this.data.totalScore + score - prevScore;
        const answeredCount = Object.keys(answers).length;
        const progressPercent = Math.round((answeredCount / 20) * 100);
        const allAnswered = answeredCount >= questions.length;

        this.setData({
            answers,
            totalScore,
            selectedAnswer: value,
            answeredCount,
            progressPercent,
            allAnswered
        });

        app.globalData.screening.answers = answers;
        app.globalData.screening.totalScore = totalScore;
    },

    prevQuestion() {
        if (this.data.currentIdx > 0) {
            this._loadQuestion(this.data.currentIdx - 1);
        }
    },

    nextQuestion() {
        const questions = this._getQuestions();
        const q = questions[this.data.currentIdx];
        if (!this.data.answers[q.id]) {
            wx.showToast({ title: '请先回答当前题目', icon: 'none' });
            return;
        }
        if (this.data.currentIdx < questions.length - 1) {
            this._loadQuestion(this.data.currentIdx + 1);
        }
    },

    submitScreening() {
        const questions = this._getQuestions();
        if (Object.keys(this.data.answers).length < questions.length) {
            wx.showToast({ title: '请回答所有题目', icon: 'none' });
            return;
        }

        const totalScore = this.data.totalScore;
        let riskLevel, riskText;
        if (totalScore <= 15) { riskLevel = 'low'; riskText = '低风险'; }
        else if (totalScore <= 35) { riskLevel = 'medium'; riskText = '中风险'; }
        else { riskLevel = 'high'; riskText = '高风险'; }

        const children = app.globalData.children || [];
        const child = children.find(c => c.id === this.data.selectedChildId);

        const record = {
            id: 'S' + Date.now(),
            childId: this.data.selectedChildId,
            childName: child ? child.name : '未知',
            childAvatar: child ? child.avatar : '👶',
            totalScore,
            riskLevel,
            riskText,
            answers: { ...this.data.answers },
            answerCount: questions.length,
            createTime: new Date().toISOString()
        };

        if (!app.globalData.screeningHistory) app.globalData.screeningHistory = [];
        app.globalData.screeningHistory.unshift(record);
        app.saveToStorage();

        // Reset and go to result
        this.setData({ started: false });
        wx.navigateTo({ url: '/pages/result/result?recordId=' + record.id });
    },

    _getQuestions() {
        return SCREENING_QUESTIONS;
    },

    _getAge(birthDate) {
        if (!birthDate) return '';
        const birth = new Date(birthDate);
        const now = new Date();
        const m = (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
        if (m < 12) return m + '个月';
        const y = Math.floor(m / 12);
        const rm = m % 12;
        return rm > 0 ? y + '岁' + rm + '个月' : y + '岁';
    },

    onVideoError() {
        this.setData({ videoError: true });
    }
});
