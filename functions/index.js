// functions/index.js
const { onCall } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

exports.setTeacherRole = onCall({ 
  region: "asia-east1"
}, async (request) => {
  if (!request.auth) {
    throw new Error("請先登入");
  }

  if (!request.auth.token.admin) {
    throw new Error("需要管理員權限");
  }

  const { uid, isTeacher } = request.data;
  if (!uid || typeof isTeacher !== "boolean") {
    throw new Error("缺少必要參數");
  }

  try {
    console.log(`🔄 設定用戶 ${uid} 老師權限為 ${isTeacher}`);
    
    // 設定自定義聲明
    await admin.auth().setCustomUserClaims(uid, { teacher: isTeacher });
    
    // 🔧 修改這裡：使用 role 欄位
    const roleValue = isTeacher ? "teacher" : "user";
    await admin.firestore().collection("users").doc(uid).update({
      role: roleValue,  // ← 改為 role
      updatedAt: new Date().toISOString()
    });
    
    console.log(`✅ 成功設定用戶 ${uid} 角色為 ${roleValue}`);
    
    return { 
      success: true, 
      message: `已將用戶設為 ${isTeacher ? '老師' : '一般會員'}` 
    };

  } catch (error) {
    console.error("❌ 設定老師權限失敗:", error);
    throw new Error(error.message);
  }
});