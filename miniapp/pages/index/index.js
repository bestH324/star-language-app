const request = require('../../utils/request');

Page({
    data: {
        isLoggedIn: false
    },

    onShow() {
        const token = wx.getStorageSync('token');
        if (!token) {
            this.setData({ isLoggedIn: false });
            return;
        }
        request.get('/api/user/profile').then(() => {
            this.setData({ isLoggedIn: true });
        }).catch(() => {
            wx.removeStorageSync('token');
            this.setData({ isLoggedIn: false });
        });
    },

    goScreening() {
        wx.switchTab({ url: '/pages/screening/screening' });
    },
    goScience() {
        wx.switchTab({ url: '/pages/science/science' });
    },
    goReferral() {
        wx.switchTab({ url: '/pages/referral/referral' });
    },
    goEmpowerment() {
        wx.navigateTo({ url: '/pages/empowerment/empowerment' });
    },
    goChildManage() {
        if (!this.data.isLoggedIn) {
            wx.navigateTo({ url: '/pages/login/login' });
            return;
        }
        wx.navigateTo({ url: '/pages/child-manage/child-manage' });
    },
    goHistory() {
        if (!this.data.isLoggedIn) {
            wx.navigateTo({ url: '/pages/login/login' });
            return;
        }
        wx.navigateTo({ url: '/pages/history/history' });
    },
    goProfile() {
        wx.switchTab({ url: '/pages/profile/profile' });
    }
});
