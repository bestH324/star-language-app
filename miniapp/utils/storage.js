// 星语 · 存储工具 — 封装微信存储 API
const app = getApp();

function load(key) {
    try {
        return wx.getStorageSync(key);
    } catch (e) {
        console.warn('读取存储失败:', key, e);
        return null;
    }
}

function save(key, value) {
    try {
        wx.setStorageSync(key, value);
    } catch (e) {
        console.warn('写入存储失败:', key, e);
        wx.showToast({ title: '存储空间不足', icon: 'none' });
    }
}

function remove(key) {
    try {
        wx.removeStorageSync(key);
    } catch (e) {
        console.warn('删除存储失败:', key, e);
    }
}

// 持久化全局数据到本地
function persist() {
    const g = app.globalData;
    save('as_users', g.users || []);
    save('as_history', g.screeningHistory);
    save('as_children', g.children);
    save('as_adminLoggedIn', g.isAdminLoggedIn);
    if (g.currentUser) {
        save('as_currentUser', g.currentUser);
    } else {
        remove('as_currentUser');
    }
}

// 工具函数
function getAgeInMonths(birthDate) {
    if (!birthDate) return 0;
    const birth = new Date(birthDate);
    const now = new Date();
    return (now.getFullYear() - birth.getFullYear()) * 12 + now.getMonth() - birth.getMonth();
}

function getChildAge(birthDate) {
    if (!birthDate) return '未知';
    const months = getAgeInMonths(birthDate);
    if (months < 12) return months + '个月';
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? years + '岁' + rem + '个月' : years + '岁';
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');
}

function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return formatDate(dateStr) + ' ' +
        String(d.getHours()).padStart(2, '0') + ':' +
        String(d.getMinutes()).padStart(2, '0');
}

module.exports = {
    load, save, remove, persist,
    getAgeInMonths, getChildAge, formatDate, formatDateTime
};
