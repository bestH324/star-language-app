const app = getApp();

function fmt(d) { if (!d) return ''; const dt = new Date(d); return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0')+' '+String(dt.getHours()).padStart(2,'0')+':'+String(dt.getMinutes()).padStart(2,'0'); }
function age(b) { if (!b) return ''; const m = Math.floor((new Date()-new Date(b))/(1000*60*60*24*30.44)); if (m<12) return m+'个月'; const y=Math.floor(m/12); const rm=m%12; return rm>0?y+'岁'+rm+'个月':y+'岁'; }
function riskText(level) {
    if (level === 'high') return '高风险';
    if (level === 'medium') return '中风险';
    return '低风险';
}

Page({
    data: { tab: 'users', stats: {}, pct: {}, users: [], children: [], records: [] },
    onShow() {
        if (!app.globalData.isAdminLoggedIn) { wx.redirectTo({ url: '/pages/admin-login/admin-login' }); return; }
        this._refresh();
    },
    async _refresh() {
        wx.showLoading({ title: '加载中' });
        try {
            const [statsRes, usersRes, childrenRes, recordsRes] = await Promise.all([
                app.request({ url: '/api/admin/stats' }),
                app.request({ url: '/api/admin/users' }),
                app.request({ url: '/api/admin/children' }),
                app.request({ url: '/api/admin/records' })
            ]);

            const statsData = statsRes.data.data || {};
            const usersData = (usersRes.data.data || []).map(u => ({
                ...u, createTime: u.create_time, childCount: u.child_count, screeningCount: u.screening_count
            }));
            const childrenData = (childrenRes.data.data || []).map(c => ({
                ...c, birthDate: c.birth_date, createTime: c.create_time, userPhone: c.user_phone, screeningCount: c.screening_count
            }));
            const recordsData = (recordsRes.data.data || []).map(r => ({
                ...r, riskLevel: r.risk_level, totalScore: r.total_score, createTime: r.create_time,
                childId: r.child_id, childName: r.child_name, childAvatar: r.child_avatar,
                userPhone: r.user_phone, riskText: riskText(r.risk_level)
            }));

            const high = statsData.riskDistribution ? (statsData.riskDistribution.high || 0) : recordsData.filter(r => r.riskLevel === 'high').length;
            const medium = statsData.riskDistribution ? (statsData.riskDistribution.medium || 0) : recordsData.filter(r => r.riskLevel === 'medium').length;
            const low = statsData.riskDistribution ? (statsData.riskDistribution.low || 0) : recordsData.filter(r => r.riskLevel === 'low').length;
            const max = Math.max(high, medium, low, 1);

            const usersList = usersData.map(u => ({...u, time: fmt(u.createTime)}));
            const childrenList = childrenData.map(c => ({...c, ageText: age(c.birthDate)}));
            const recordsList = recordsData.map(r => ({...r, time: fmt(r.createTime)}));

            this.setData({
                stats: {
                    users: statsData.totalUsers || usersData.length,
                    children: statsData.totalChildren || childrenData.length,
                    screenings: statsData.totalScreenings || recordsData.length,
                    highRisk: high, medium, low
                },
                pct: { high: Math.round(high/max*100), medium: Math.round(medium/max*100), low: Math.round(low/max*100) },
                users: usersList, children: childrenList, records: recordsList
            });
            wx.hideLoading();
        } catch (e) {
            wx.hideLoading();
            wx.showToast({ title: '加载失败，请检查网络', icon: 'none' });
        }
    },
    switchTab(e) { this.setData({ tab: e.currentTarget.dataset.t }); },
    viewRecord(e) { wx.navigateTo({ url: '/pages/result/result?recordId=' + e.currentTarget.dataset.id }); },
    doLogout() {
        wx.removeStorageSync('token');
        app.globalData.isAdminLoggedIn = false;
        app.saveToStorage();
        wx.redirectTo({ url: '/pages/index/index' });
    },
    async exportData() {
        const t = this.data.tab;
        wx.showLoading({ title: '正在生成表格...' });
        try {
            const filePath = await app.downloadFile('/api/admin/export-excel?type=' + t);
            wx.hideLoading();
            // 用微信内置文档预览打开 xlsx，用户可点击右上角分享/保存
            wx.openDocument({
                filePath,
                fileType: 'xlsx',
                showMenu: true,
                success() {
                    wx.showToast({ title: '导出成功，可分享或保存', icon: 'success' });
                },
                fail(err) {
                    console.error('openDocument 失败:', err);
                    // 降级：提示用户文件已下载到临时目录
                    wx.showModal({
                        title: '文件已生成',
                        content: '表格文件已生成。请在聊天中转发给"文件传输助手"即可保存到电脑。',
                        showCancel: false
                    });
                }
            });
        } catch (e) {
            wx.hideLoading();
            console.error('导出失败:', e);
            wx.showToast({ title: '导出失败，请检查网络', icon: 'none' });
        }
    }
});
