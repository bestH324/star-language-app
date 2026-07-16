const app = getApp();
Page({
    data: { list: [] },
    onShow() {
        const list = (app.globalData.screeningHistory||[]).map(r => ({...r, time: (r.createTime||'').slice(0,16).replace('T',' ') }));
        this.setData({ list });
    },
    viewDetail(e) {
        wx.navigateTo({ url: '/pages/result/result?recordId=' + e.currentTarget.dataset.id });
    },
    goScreening() { wx.switchTab({ url: '/pages/screening/screening' }); }
});
