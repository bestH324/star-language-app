let count = 0;
Page({
    onLogoClick() {
        count++;
        if (count >= 7) { count = 0; wx.navigateTo({ url: '/pages/admin-login/admin-login' }); }
    }
});
