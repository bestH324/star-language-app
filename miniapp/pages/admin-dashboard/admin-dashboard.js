const app = getApp();

function fmt(d) { if (!d) return ''; const dt = new Date(d); return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0')+' '+String(dt.getHours()).padStart(2,'0')+':'+String(dt.getMinutes()).padStart(2,'0'); }
function age(b) { if (!b) return ''; const m = Math.floor((new Date()-new Date(b))/(1000*60*60*24*30.44)); if (m<12) return m+'个月'; const y=Math.floor(m/12); const rm=m%12; return rm>0?y+'岁'+rm+'个月':y+'岁'; }

Page({
    data: { tab: 'users', stats: {}, pct: {}, users: [], children: [], records: [] },
    onShow() {
        if (!app.globalData.isAdminLoggedIn) { wx.redirectTo({ url: '/pages/admin-login/admin-login' }); return; }
        this._refresh();
    },
    _refresh() {
        const g = app.globalData;
        const users = g.users || [];
        const children = g.children || [];
        const history = g.screeningHistory || [];
        const highRisk = history.filter(r => r.riskLevel === 'high').length;
        const medium = history.filter(r => r.riskLevel === 'medium').length;
        const low = history.filter(r => r.riskLevel === 'low').length;
        const max = Math.max(highRisk, medium, low, 1);

        const usersList = users.map(u => ({...u, time: fmt(u.createTime)}));
        const childrenList = children.map(c => ({...c, ageText: age(c.birthDate), screeningCount: history.filter(r => r.childId === c.id).length}));
        const recordsList = history.map(r => ({...r, time: fmt(r.createTime)}));

        this.setData({
            stats: { users: users.length, children: children.length, screenings: history.length, highRisk, medium, low },
            pct: { high: Math.round(highRisk/max*100), medium: Math.round(medium/max*100), low: Math.round(low/max*100) },
            users: usersList, children: childrenList, records: recordsList
        });
    },
    switchTab(e) { this.setData({ tab: e.currentTarget.dataset.t }); },
    viewRecord(e) { wx.navigateTo({ url: '/pages/result/result?recordId=' + e.currentTarget.dataset.id }); },
    doLogout() { app.globalData.isAdminLoggedIn = false; app.saveToStorage(); wx.redirectTo({ url: '/pages/index/index' }); },
    exportData() {
        const g = app.globalData;
        let csv = '﻿';
        const t = this.data.tab;
        if (t === 'users') { csv += '手机号,注册时间\n'; (g.users||[]).forEach(u => { csv += u.phone+','+fmt(u.createTime)+'\n'; }); }
        else if (t === 'children') { csv += '昵称,性别,出生日期,年龄,筛查次数\n'; (g.children||[]).forEach(c => { csv += c.name+','+(c.gender==='male'?'男':'女')+','+c.birthDate+','+age(c.birthDate)+','+(g.screeningHistory||[]).filter(r=>r.childId===c.id).length+'\n'; }); }
        else { csv += '儿童,风险等级,得分,筛查时间\n'; (g.screeningHistory||[]).forEach(r => { csv += r.childName+','+r.riskText+','+r.totalScore+','+fmt(r.createTime)+'\n'; }); }
        wx.setClipboardData({ data: csv, success: () => { wx.showToast({ title: 'CSV已复制到剪贴板', icon: 'success' }); } });
    }
});
