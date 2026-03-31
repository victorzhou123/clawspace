'use strict';

const crypto = require('crypto');
const TABLE_NAME = 'purchases';
const ENCRYPTION_KEY = Buffer.from('clawspace-test-key-32bytes!@#$12'); // 32字节
const ENCRYPTION_IV = Buffer.from('clawspace-test12'); // 16字节
const IS_SANDBOX = false;

// Apple 验证 API
const PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

console.log(`[verify-receipt] 表名: ${TABLE_NAME}`);

/**
 * 加密收据
 */
function encryptReceipt(receipt) {
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, ENCRYPTION_IV);
  let encrypted = cipher.update(receipt, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

/**
 * 调用 Apple API 验证收据
 */
async function verifyWithApple(receipt, isSandbox = false) {
  const url = isSandbox ? SANDBOX_URL : PRODUCTION_URL;

  // 对于非订阅商品，不需要传 password
  const requestData = {
    'receipt-data': receipt,
    'exclude-old-transactions': true
  };

  const response = await uniCloud.httpclient.request(url, {
    method: 'POST',
    data: requestData,
    contentType: 'json',
    dataType: 'json',
    timeout: 30000 // 增加超时时间到 30 秒
  });

  return response.data;
}

exports.main = async (event, context) => {
  const { receipt, transactionId, productId } = event;

  // 参数验证
  if (!receipt || !transactionId || !productId) {
    return {
      success: false,
      message: '参数不完整'
    };
  }

  try {
    // 1. 根据配置选择验证环境
    let verifyResult = await verifyWithApple(receipt, IS_SANDBOX);

    // 3. 验证失败
    if (verifyResult.status !== 0) {
      console.error('Apple 验证失败', verifyResult);
      return {
        success: false,
        message: `Apple 验证失败: ${verifyResult.status}`
      };
    }

    // 4. 提取购买信息
    const inAppPurchases = verifyResult.receipt?.in_app || [];
    const targetPurchase = inAppPurchases.find(
      item => item.product_id === productId
    );

    if (!targetPurchase) {
      return {
        success: false,
        message: '未找到对应的购买记录'
      };
    }

    const originalTransactionId = targetPurchase.original_transaction_id;
    const purchaseDate = parseInt(targetPurchase.purchase_date_ms);

    // 5. 存储到数据库
    const db = uniCloud.database();
    const collection = db.collection(TABLE_NAME);

    // 检查是否已存在
    const existingRecord = await collection
      .where({ originalTransactionId })
      .get();

    const now = Date.now();
    const encryptedReceipt = encryptReceipt(receipt);

    if (existingRecord.data.length > 0) {
      // 更新现有记录
      await collection
        .where({ originalTransactionId })
        .update({
          lastVerified: now,
          updateTime: now,
          receipt: encryptedReceipt
        });
    } else {
      // 插入新记录
      await collection.add({
        originalTransactionId,
        productId,
        purchaseDate,
        receipt: encryptedReceipt,
        status: 'active',
        lastVerified: now,
        createTime: now,
        updateTime: now
      });
    }

    // 6. 返回成功
    return {
      success: true,
      isPremium: true,
      originalTransactionId
    };

  } catch (error) {
    console.error('验证收据失败', error);

    // 如果是网络错误，尝试查询数据库
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      const db = uniCloud.database();
      const collection = db.collection(TABLE_NAME);

      // 根据 transactionId 查询
      const result = await collection
        .where({ originalTransactionId: transactionId })
        .get();

      if (result.data.length > 0 && result.data[0].status === 'active') {
        return {
          success: true,
          isPremium: true,
          originalTransactionId: transactionId,
          fromCache: true
        };
      }
    }

    return {
      success: false,
      message: error.message || '验证失败'
    };
  }
};
