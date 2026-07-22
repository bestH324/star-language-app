const app = getApp();
const request = require('../../utils/request');

Page({
    data: {
        list: [], showForm: false, editingId: null, today: '',
        avatars: ['👶', '👦', '👧', '🧒', '🐻', '🐰'],
        form: { name: '', gender: '', birth: '', avatar: '👶', isPremature: false, prematureWeeks: '', city: '' }
    },

    onShow() {
        const t = new Date();
        const ts = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
        this.setData({ today: ts });
        this._render();
    },

    _render() {
        request.get('/api/child/list').then(children => {
            const list = (children || []).map(c => ({
                id: c.id,
                name: c.name,
                gender: c.gender,
                birthDate: c.birth_date,
                avatar: c.avatar || '👶',
                isPremature: c.is_premature === 1,
                prematureWeeks: c.premature_weeks || 0,
                city: c.city || '',
                ageText: this._age(c.birth_date),
                birthFmt: this._fmt(c.birth_date)
            }));
            this.setData({ list });
        }).catch(() => {});
    },

    showForm() {
        this.setData({ showForm: true, editingId: null, form: { name: '', gender: '', birth: '', avatar: '👶', isPremature: false, prematureWeeks: '', city: '' } });
    },

    cancelForm() { this.setData({ showForm: false }); },

    onFName(e) { this.setData({ 'form.name': e.detail.value }); },
    onGender(e) { this.setData({ 'form.gender': e.currentTarget.dataset.g }); },
    onDate(e) { this.setData({ 'form.birth': e.detail.value }); },
    onPremature(e) { this.setData({ 'form.isPremature': e.currentTarget.dataset.v }); },
    onPrematureWeeks(e) { this.setData({ 'form.prematureWeeks': e.detail.value }); },
    onCity(e) { this.setData({ 'form.city': e.detail.value }); },
    onAvatar(e) { this.setData({ 'form.avatar': e.currentTarget.dataset.a }); },

    editChild(e) {
        const id = e.currentTarget.dataset.id;
        const c = this.data.list.find(x => x.id === id);
        if (!c) return;
        this.setData({
            showForm: true, editingId: id,
            form: { name: c.name, gender: c.gender, birth: c.birthDate, avatar: c.avatar || '👶', isPremature: c.isPremature || false, prematureWeeks: c.prematureWeeks || '', city: c.city || '' }
        });
    },

    deleteChild(e) {
        const id = e.currentTarget.dataset.id;
        wx.showModal({
            title: '确认删除',
            content: '确定要删除该宝宝的信息吗？相关筛查记录也会一并删除。',
            success: (r) => {
                if (!r.confirm) return;
                request.del('/api/child/' + id).then(() => {
                    this._render();
                    wx.showToast({ title: '已删除', icon: 'success' });
                }).catch(() => {});
            }
        });
    },

    saveChild() {
        const { name, gender, birth, avatar, isPremature, prematureWeeks, city } = this.data.form;
        if (!name) { wx.showToast({ title: '请输入宝宝昵称', icon: 'none' }); return; }
        if (!gender) { wx.showToast({ title: '请选择性别', icon: 'none' }); return; }
        if (!birth) { wx.showToast({ title: '请选择出生日期', icon: 'none' }); return; }
        if (isPremature && !prematureWeeks) { wx.showToast({ title: '请填写早产周数', icon: 'none' }); return; }
        const m = (new Date() - new Date(birth)) / (1000 * 60 * 60 * 24 * 30.44);
        if (m < 12 || m > 60) {
            wx.showToast({ title: '本筛查适用于1-5岁（12-60个月）的儿童', icon: 'none', duration: 2500 });
            return;
        }

        wx.showLoading({ title: '保存中...' });
        const payload = { name, gender, birthDate: birth, avatar, isPremature, prematureWeeks: isPremature ? Number(prematureWeeks) : 0, city: city || '' };

        if (this.data.editingId) {
            request.put('/api/child/update/' + this.data.editingId, payload).then(() => {
                wx.hideLoading();
                this.setData({ showForm: false });
                this._render();
                wx.showToast({ title: '已更新', icon: 'success' });
            }).catch(() => { wx.hideLoading(); });
        } else {
            request.post('/api/child/add', payload).then(() => {
                wx.hideLoading();
                this.setData({ showForm: false });
                this._render();
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
            }).catch(() => { wx.hideLoading(); });
        }
    },

    goScreening(e) {
        const childId = e.currentTarget.dataset.id;
        app.globalData.screening = app.globalData.screening || {};
        app.globalData.screening.childId = childId;
        wx.switchTab({ url: '/pages/screening/screening' });
    },

    _age(b) {
        if (!b) return '';
        const m = Math.floor((new Date() - new Date(b)) / (1000 * 60 * 60 * 24 * 30.44));
        if (m < 12) return m + '个月';
        const y = Math.floor(m / 12);
        const rm = m % 12;
        return rm > 0 ? y + '岁' + rm + '个月' : y + '岁';
    },

    _fmt(d) {
        if (!d) return '';
        const dt = new Date(d);
        return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
    }
});
