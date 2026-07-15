const ARTICLES = require('../../utils/data.js').SCIENCE_ARTICLES || [];

Page({
    data: {
        activeTab: 'all',
        articles: []
    },
    onLoad() {
        this.renderArticles('all');
    },
    switchTab(e) {
        const tab = e.currentTarget.dataset.tab;
        this.setData({ activeTab: tab });
        this.renderArticles(tab);
    },
    renderArticles(category) {
        const articles = category === 'all'
            ? ARTICLES
            : ARTICLES.filter(a => a.category === category);
        this.setData({ articles });
    },
    showDetail(e) {
        const id = e.currentTarget.dataset.id;
        const article = ARTICLES.find(a => a.id === id);
        if (!article) return;
        wx.showModal({
            title: article.title,
            content: article.content,
            showCancel: false,
            confirmText: '关闭',
            confirmColor: '#6B1D5E'
        });
    }
});
