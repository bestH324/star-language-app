// 首页
const app = getApp();

Page({
    data: {
        isLoggedIn: false
    },

    onShow() {
        this.setData({ isLoggedIn: app.globalData.isLoggedIn });
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
        if (!app.globalData.isLoggedIn) {
            wx.navigateTo({ url: '/pages/login/login' });
            return;
        }
        wx.navigateTo({ url: '/pages/child-manage/child-manage' });
    },
    goHistory() {
        if (!app.globalData.isLoggedIn) {
            wx.navigateTo({ url: '/pages/login/login' });
            return;
        }
        wx.navigateTo({ url: '/pages/history/history' });
    },
    goProfile() {
        wx.switchTab({ url: '/pages/profile/profile' });
    }
});
