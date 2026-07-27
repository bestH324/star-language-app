const app = getApp();
const request = require('../../utils/request');

Page({
    data: {
        agreedPrivacy: false,
        agreedResearch: false,
        canConfirm: false,
        childId: '',
        readonly: false,
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

    onReady() {
        this._queryClientHeight();
    },

    _clientHeight: 0,

    /** 获取 scroll-view 的实际可滚动高度 */
    _queryClientHeight() {
        const query = wx.createSelectorQuery();
        query.select('.agreement-scroll').boundingClientRect();
        query.exec((res) => {
            if (res[0] && res[0].height) {
                this._clientHeight = res[0].height;
            }
        });
    },

    /** 滚动事件：第一次触底即开始计时，之后不重置 */
    onScroll(e) {
        if (this.data.scrollAtBottom) return; // 已经开始计时，不再处理
        if (!this._clientHeight) this._queryClientHeight();

        const { scrollTop, scrollHeight } = e.detail;
        const clientHeight = this._clientHeight || 300;
        if (scrollTop + clientHeight >= scrollHeight - 5) {
            this.setData({ scrollAtBottom: true, bottomCountdown: 3 });
            this._startCountdown();
        }
    },

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
        if (!this.data.bottomTimerDone) {
            wx.showToast({ title: '请先滑动到页面底部并等待倒计时结束', icon: 'none' });
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
