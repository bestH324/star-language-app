const app = getApp();
const request = require('../../utils/request');

Page({
    data: {
        agreedPrivacy: false,
        agreedResearch: false,
        canConfirm: false,
        childId: '',
        readonly: false,
        // 滚动到底部停留倒计时
        scrollAtBottom: false,
        bottomCountdown: 3,
        bottomTimerDone: false
    },

    onLoad(options) {
        if (options.childId) {
            this.setData({ childId: options.childId });
        }
        if (options.readonly === '1') {
            this.setData({ readonly: true });
        }
    },

    _bottomTimer: null,

    /** 滚动事件：检测是否到达底部 */
    onScroll(e) {
        const { scrollTop, scrollHeight, clientHeight } = e.detail;
        // 允许 5px 误差
        const atBottom = (scrollTop + clientHeight >= scrollHeight - 5);

        if (atBottom && !this.data.scrollAtBottom) {
            // 刚到达底部，开始 3 秒倒计时
            this.setData({ scrollAtBottom: true, bottomCountdown: 3 });
            this._startCountdown();
        } else if (!atBottom && this.data.scrollAtBottom) {
            // 离开底部，重置
            this._resetCountdown();
        }
    },

    /** 开始 3 秒倒计时 */
    _startCountdown() {
        this._clearCountdown();
        this._bottomTimer = setInterval(() => {
            const next = this.data.bottomCountdown - 1;
            if (next <= 0) {
                this._clearCountdown();
                this.setData({ bottomCountdown: 0, bottomTimerDone: true });
            } else {
                this.setData({ bottomCountdown: next });
            }
        }, 1000);
    },

    /** 重置倒计时（用户离开底部） */
    _resetCountdown() {
        this._clearCountdown();
        this.setData({ scrollAtBottom: false, bottomCountdown: 3, bottomTimerDone: false });
    },

    _clearCountdown() {
        if (this._bottomTimer) {
            clearInterval(this._bottomTimer);
            this._bottomTimer = null;
        }
    },

    onUnload() {
        this._clearCountdown();
    },

    onCheckPrivacy(e) {
        // 未完成底部停留，不允许勾选
        if (!this.data.bottomTimerDone) {
            wx.showToast({ title: '请先滑动到页面底部阅读全部内容', icon: 'none' });
            return;
        }
        const checked = e.detail.value.includes('privacy');
        const agreedResearch = e.detail.value.includes('research');
        this.setData({
            agreedPrivacy: checked,
            agreedResearch: agreedResearch,
            canConfirm: checked
        });
    },

    goBack() {
        wx.navigateBack({ delta: 1 });
    },

    onReject() {
        wx.switchTab({ url: '/pages/index/index' });
    },

    onConfirm() {
        if (!this.data.bottomTimerDone) {
            wx.showToast({ title: '请先滑动到页面底部并等待倒计时结束', icon: 'none' });
            return;
        }
        if (!this.data.agreedPrivacy) {
            wx.showToast({ title: '请先阅读并同意全部条款', icon: 'none' });
            return;
        }
        wx.showLoading({ title: '提交中...' });
        request.post('/api/user/agree-privacy', {
            agreedResearch: this.data.agreedResearch
        }).then(() => {
            wx.hideLoading();
            app.globalData.screening = app.globalData.screening || {};
            app.globalData.screening.consentedChildId = this.data.childId;
            wx.navigateBack({ delta: 1 });
        }).catch(() => {
            wx.hideLoading();
            wx.showToast({ title: '提交失败，请重试', icon: 'none' });
        });
    }
});
