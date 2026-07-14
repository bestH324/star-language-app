const app = getApp();
Page({
    data: { list: [], showForm: false, editingId: null, today: '', avatars: ['👶','👦','👧','🧒','🐻','🐰'], form: { name: '', gender: '', birth: '', avatar: '👶' } },
    onShow() {
        const t = new Date(); const ts = t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');
        this.setData({ today: ts }); this._render();
    },
    _render() {
        const list = (app.globalData.children||[]).map(c => ({...c, ageText: this._age(c.birthDate), birthFmt: this._fmt(c.birthDate)}));
        this.setData({ list });
    },
    showForm() { this.setData({ showForm: true, editingId: null, form: { name: '', gender: '', birth: '', avatar: '👶' } }); },
    cancelForm() { this.setData({ showForm: false }); },
    onFName(e) { this.setData({ 'form.name': e.detail.value }); },
    onGender(e) { this.setData({ 'form.gender': e.currentTarget.dataset.g }); },
    onDate(e) { this.setData({ 'form.birth': e.detail.value }); },
    onAvatar(e) { this.setData({ 'form.avatar': e.currentTarget.dataset.a }); },
    editChild(e) {
        const id = e.currentTarget.dataset.id; const c = (app.globalData.children||[]).find(x => x.id === id);
        if (!c) return;
        this.setData({ showForm: true, editingId: id, form: { name: c.name, gender: c.gender, birth: c.birthDate, avatar: c.avatar||'👶' } });
    },
    deleteChild(e) {
        const id = e.currentTarget.dataset.id;
        wx.showModal({ title: '确认删除', content: '确定要删除该宝宝的信息吗？', success: (r) => {
            if (!r.confirm) return;
            app.globalData.children = (app.globalData.children||[]).filter(x => x.id !== id);
            app.globalData.screeningHistory = (app.globalData.screeningHistory||[]).filter(x => x.childId !== id);
            app.saveToStorage(); this._render(); wx.showToast({ title: '已删除', icon: 'success' });
        }});
    },
    saveChild() {
        const { name, gender, birth, avatar } = this.data.form;
        if (!name) { wx.showToast({ title: '请输入宝宝昵称', icon: 'none' }); return; }
        if (!gender) { wx.showToast({ title: '请选择性别', icon: 'none' }); return; }
        if (!birth) { wx.showToast({ title: '请选择出生日期', icon: 'none' }); return; }
        const m = (new Date()-new Date(birth))/(1000*60*60*24*30.44);
        if (m < 12 || m > 60) { wx.showToast({ title: '本筛查适用于1-5岁（12-60个月）的儿童', icon: 'none', duration: 2500 }); return; }
        if (this.data.editingId) {
            const c = (app.globalData.children||[]).find(x => x.id === this.data.editingId);
            if (c) { c.name = name; c.gender = gender; c.birthDate = birth; c.avatar = avatar; }
        } else {
            if (!app.globalData.children) app.globalData.children = [];
            app.globalData.children.push({ id: 'C'+Date.now(), userId: app.globalData.currentUser?app.globalData.currentUser.id:'guest', name, gender, birthDate: birth, avatar, createTime: new Date().toISOString() });
        }
        app.saveToStorage(); this.setData({ showForm: false }); this._render();
        if (this.data.editingId) {
            wx.showToast({ title: '已更新', icon: 'success' });
        } else {
            // 新增宝宝后，询问是否立即筛查
            const that = this;
            wx.showModal({
                title: '添加成功',
                content: '宝宝信息已添加，是否立即开始筛查？',
                confirmText: '去筛查',
                cancelText: '稍后',
                confirmColor: '#6B1D5E',
                success(res) {
                    if (res.confirm) {
                        wx.switchTab({ url: '/pages/screening/screening' });
                    }
                }
            });
        }
    },
    goScreening(e) {
        const childId = e.currentTarget.dataset.id;
        app.globalData.screening.childId = childId;
        wx.switchTab({ url: '/pages/screening/screening' });
    },
    _age(b) { if (!b) return ''; const m = Math.floor((new Date()-new Date(b))/(1000*60*60*24*30.44)); if (m<12) return m+'个月'; const y = Math.floor(m/12); const rm = m%12; return rm>0?y+'岁'+rm+'个月':y+'岁'; },
    _fmt(d) { if (!d) return ''; const dt = new Date(d); return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0'); }
});
