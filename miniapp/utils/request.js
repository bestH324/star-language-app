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

/**
 * 下载文件到临时路径，带 token 鉴权
 * @param {string} url   API 相对路径（如 /api/admin/export-excel）
 * @returns {Promise<string>}  返回临时文件路径
 */
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token') || '';
    wx.downloadFile({
      url: BASE_URL + url,
      header: { 'X-Token': token },
      success(res) {
        if (res.statusCode === 200) {
          resolve(res.tempFilePath);
        } else if (res.statusCode === 401) {
          wx.removeStorageSync('token');
          wx.showToast({ title: '登录已过期', icon: 'none' });
          reject(new Error('unauthorized'));
        } else {
          wx.showToast({ title: '下载失败(' + res.statusCode + ')', icon: 'none' });
          reject(new Error('download failed'));
        }
      },
      fail(err) {
        wx.showToast({ title: '网络异常，请检查连接', icon: 'none' });
        reject(err);
      }
    });
  });
}

module.exports = { get, post, put, del, downloadFile, BASE_URL };
