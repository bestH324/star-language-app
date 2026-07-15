const app = getApp();
const request = require('../../utils/request');

Page({
    data: {
        started: false,
        childList: [],
        selectedChildId: '',
        selectedChildLabel: '',
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
        loading: true
    },

    onShow() {
        this._loadChildren();
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
                    app.globalData.screening.childId = null;
                }
            }

            this.setData({
                childList,
                pickerValue: selectedIdx,
                selectedChildId: selectedId,
                selectedChildLabel: selectedLabel,
                loading: false
            });
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
        }
    },

    startScreening() {
        if (!this.data.selectedChildId) {
            wx.showToast({ title: '请先选择筛查宝宝', icon: 'none' });
            return;
        }
        wx.showLoading({ title: '加载题目...' });
        request.get('/api/questionnaire/default').then(questionnaire => {
            wx.hideLoading();
            // normalize field names
            const questions = (questionnaire.questions || []).map(q => ({
                id: q.id,
                videoUrl: q.video_url || '',
                content: q.content,
                options: q.options
            }));

            this.setData({
                questionnaireId: questionnaire.id,
                questions,
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
        const { value, score } = e.currentTarget.dataset;
        const questions = this.data.questions;
        const q = questions[this.data.currentIdx];
        const prev = this.data.answers[q.id];
        const prevScore = prev ? prev.score : 0;

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
            wx.navigateTo({ url: '/pages/result/result?recordId=' + data.id });
        }).catch(() => {
            wx.hideLoading();
        });
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
