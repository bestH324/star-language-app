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
    // 导出数据按钮事件：根据 data-format 决定导出 Excel 或 CSV
    exportData(e) {
        const format = e.currentTarget.dataset.format; // 'excel' | 'csv'
        const tabType = this.data.tab;                 // 'users' | 'children' | 'records'
        const apiPath = format === 'excel'
            ? '/api/admin/export-excel?type=' + tabType
            : '/api/admin/export-csv?type=' + tabType;
        this._doExport(apiPath, format, tabType, 0);
    },

    // 递归下载，retryCount 由参数传递避免 setData 异步问题
    _doExport(apiPath, format, tabType, retryCount) {
        const MAX_RETRY = 3;
        wx.showLoading({ title: '下载中...', mask: true });

        getApp().downloadFile(apiPath).then(tempFilePath => {
            wx.hideLoading();
            this._openDocument(tempFilePath, format, apiPath, tabType, 0);
        }).catch(err => {
            wx.hideLoading();
            const msg = (err && err.errMsg) ? err.errMsg : '';
            const isTimeout = msg.includes('timeout') || msg.includes('fail') || msg.includes('network') || msg.includes('offline');

            if (isTimeout && retryCount < MAX_RETRY) {
                wx.showModal({
                    title: '网络超时',
                    content: '网络超时，请检查网络后重试（剩余' + (MAX_RETRY - retryCount) + '次）',
                    confirmText: '重试',
                    cancelText: '取消',
                    success: (res) => {
                        if (res.confirm) this._doExport(apiPath, format, tabType, retryCount + 1);
                    }
                });
            } else if (retryCount >= MAX_RETRY) {
                wx.showModal({
                    title: '导出失败',
                    content: '已重试' + MAX_RETRY + '次仍失败，请检查网络连接后稍后再试',
                    showCancel: false,
                    confirmText: '知道了'
                });
            } else {
                wx.showToast({ title: '导出失败，请重试', icon: 'none' });
            }
        });
    },

    // 打开下载完成的文件，处理权限/格式错误
    _openDocument(tempFilePath, format, apiPath, tabType, retryCount) {
        const MAX_RETRY = 3;

        wx.openDocument({
            filePath: tempFilePath,
            fileType: format === 'excel' ? 'xlsx' : undefined,
            showMenu: true,
            success: () => {
                // 文件打开成功，用户可通过右上角菜单分享/收藏
            },
            fail: (err) => {
                const msg = (err && err.errMsg) ? err.errMsg : '';
                const isPermission = msg.includes('auth deny') || msg.includes('permission') || msg.includes('deny');

                if (isPermission && retryCount < MAX_RETRY) {
                    wx.showModal({
                        title: '需要文件权限',
                        content: '需要文件存储权限来打开导出文件，请在系统弹窗中授权后重试（剩余' + (MAX_RETRY - retryCount) + '次）',
                        confirmText: '重试',
                        cancelText: '取消',
                        success: (res) => {
                            if (res.confirm) this._openDocument(tempFilePath, format, apiPath, tabType, retryCount + 1);
                        }
                    });
                } else if (retryCount >= MAX_RETRY) {
                    wx.showModal({
                        title: '无法打开文件',
                        content: '文件下载成功但多次打开失败。请检查系统文件权限设置。',
                        showCancel: false,
                        confirmText: '知道了'
                    });
                } else {
                    // 其他错误：回退尝试不指定 fileType
                    wx.openDocument({
                        filePath: tempFilePath,
                        showMenu: true,
                        fail: () => {
                            wx.showModal({
                                title: '打开失败',
                                content: '文件已下载但无法打开，请确认已安装支持该格式的应用',
                                showCancel: false,
                                confirmText: '知道了'
                            });
                        }
                    });
                }
            }
        });
    }
});
