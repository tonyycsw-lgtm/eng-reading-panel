// auth-check.js
// 會員權限檢查工具

import { 
  auth, 
  onAuthStateChanged 
} from './firebase-config.js';

// 檢查會員狀態，未登入時跳轉
export function requireAuth(redirectUrl = '/eng-reading-f1-new_treasure_plus/login.html') {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        // 已登入，回傳用戶資訊
        user.getIdToken().then(token => {
          // 儲存 token 到 localStorage 供後續使用
          localStorage.setItem('authToken', token);
          localStorage.setItem('userUID', user.uid);
          localStorage.setItem('userEmail', user.email || '');
          localStorage.setItem('userName', user.displayName || user.email || '會員');
          
          resolve({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            token: token
          });
        });
      } else {
        // 未登入，記錄當前頁面並跳轉
        const currentPath = window.location.pathname;
        if (!currentPath.includes('login.html')) {
          sessionStorage.setItem('redirectAfterLogin', currentPath);
        }
        window.location.href = redirectUrl;
        reject(new Error('需要登入'));
      }
    }, reject);
  });
}

// 檢查是否已登入（不跳轉）
export function checkLoggedIn() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      resolve(!!user);
    });
  });
}

// 取得目前用戶的 ID Token（用於 API 請求）
export async function getAuthToken() {
  const user = auth.currentUser;
  if (!user) return null;
  
  try {
    const token = await user.getIdToken();
    localStorage.setItem('authToken', token);
    return token;
  } catch (error) {
    console.error('取得 token 失敗:', error);
    return null;
  }
}

// 登出功能
export async function logoutUser() {
  try {
    const { signOut } = await import('./firebase-config.js');
    await signOut(auth);
    
    // 清除 localStorage 中的會員資料
    localStorage.removeItem('authToken');
    localStorage.removeItem('userUID');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    
    return true;
  } catch (error) {
    console.error('登出失敗:', error);
    return false;
  }
}

// 監聽登入狀態變化
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      user.getIdToken().then(token => {
        localStorage.setItem('authToken', token);
        callback({
          isLoggedIn: true,
          user: {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
          }
        });
      });
    } else {
      localStorage.removeItem('authToken');
      callback({ isLoggedIn: false, user: null });
    }
  });
}