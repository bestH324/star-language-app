const BASE_URL = 'http://localhost:8081';

function request(method, url, data) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token') || '';
    wx.request({
      url: BASE_URL + url,
      method,
      header: {
        'Content-Type': 'application/json',
        'X-Token': token
      },
      data,
      success(res) {
        if (res.statusCode === 200) {
          const body = res.data;
          if (body.code === 0) {
            resolve(body.data);
          } else {
            wx.showToast({ title: body.message || '请求失败', icon: 'none' });
            reject(body);
          }
        } else if (res.statusCode === 401) {
          wx.removeStorageSync('token');
          wx.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
          reject(res);
        } else {
          wx.showToast({ title: '服务器错误(' + res.statusCode + ')', icon: 'none' });
          reject(res);
        }
      },
      fail(err) {
        wx.showToast({ title: '网络异常，请检查连接', icon: 'none' });
        reject(err);
      }
    });
  });
}

function get(url) { return request('GET', url); }
function post(url, data) { return request('POST', url, data || {}); }
function put(url, data) { return request('PUT', url, data || {}); }
function del(url) { return request('DELETE', url); }

module.exports = { get, post, put, del, BASE_URL };
