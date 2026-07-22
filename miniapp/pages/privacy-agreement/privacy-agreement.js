const app = getApp();
const request = require('../../utils/request');

Page({
    data: {
        agreedPrivacy: false,
        agreedResearch: false,
        canConfirm: false,
        childId: '',
        readonly: false
    },

    onLoad(options) {
        if (options.childId) {
            this.setData({ childId: options.childId });
        }
        if (options.readonly === '1') {
            this.setData({ readonly: true });
        }
    },

    onCheckPrivacy(e) {
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
        if (!this.data.agreedPrivacy) {
            wx.showToast({ title: '请先阅读并同意全部条款', icon: 'none' });
            return;
        }
        wx.showLoading({ title: '提交中...' });
        request.post('/api/user/agree-privacy', {
            agreedResearch: this.data.agreedResearch
        }).then(() => {
            wx.hideLoading();
            // 通过 globalData 同步传参，绕过 setData 异步问题
            app.globalData.screening = app.globalData.screening || {};
            app.globalData.screening.consentedChildId = this.data.childId;
            wx.navigateBack({ delta: 1 });
        }).catch(() => {
            wx.hideLoading();
            wx.showToast({ title: '提交失败，请重试', icon: 'none' });
        });
    }
});
