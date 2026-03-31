'use strict';

const crypto = require('crypto');
const TABLE_NAME = 'purchases';
const ENCRYPTION_KEY = Buffer.from('clawspace-test-key-32bytes!@#$12'); // 32字节
const ENCRYPTION_IV = Buffer.from('clawspace-test12'); // 16字节
const IS_SANDBOX = true;

// Apple 验证 API
const PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

console.log(`[restore-purchase] 表名: ${TABLE_NAME}`);

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
 * 调用 Apple API 验证收据（带重试）
 */
async function verifyWithApple(receipt, isSandbox = false, retryCount = 3) {
  const url = isSandbox ? SANDBOX_URL : PRODUCTION_URL;

  // 对于非订阅商品，不需要传 password
  const requestData = {
    'receipt-data': receipt,
    'exclude-old-transactions': true
  };

  for (let i = 0; i < retryCount; i++) {
    try {
      console.log(`尝试验证收据 (第 ${i + 1}/${retryCount} 次)`);

      const response = await uniCloud.httpclient.request(url, {
        method: 'POST',
        data: requestData,
        contentType: 'json',
        dataType: 'json',
        timeout: 10000 // 30 秒超时
      });

      return response.data;
    } catch (error) {
      console.error(`第 ${i + 1} 次尝试失败:`, error.message);

      // 如果是最后一次尝试，抛出错误
      if (i === retryCount - 1) {
        throw error;
      }

      // 等待 2 秒后重试
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

exports.main = async (event, context) => {
  const { receipt } = event;

  // 参数验证
  if (!receipt) {
    return {
      success: false,
      message: '收据不能为空'
    };
  }

  try {
    const db = uniCloud.database();
    const collection = db.collection(TABLE_NAME);

    // 1. 根据配置选择验证环境
    let verifyResult = await verifyWithApple(receipt, IS_SANDBOX);

    // 3. 验证失败
    if (verifyResult.status !== 0) {
      console.error('Apple 验证失败', verifyResult);

      // 验证失败时，尝试从数据库查询
      // 提取收据中的 transaction_id（如果可能）
      try {
        const inAppPurchases = verifyResult.receipt?.in_app || [];
        if (inAppPurchases.length > 0) {
          const originalTransactionId = inAppPurchases[0].original_transaction_id;

          const result = await collection
            .where({ originalTransactionId })
            .get();

          if (result.data.length > 0 && result.data[0].status === 'active') {
            return {
              success: true,
              isPremium: true,
              originalTransactionId,
              fromCache: true
            };
          }
        }
      } catch (e) {
        console.error('从数据库查询失败', e);
      }

      return {
        success: false,
        message: `Apple 验证失败: ${verifyResult.status}`
      };
    }

    // 4. 查找 clawspace.fulltime.access 产品
    const inAppPurchases = verifyResult.receipt?.in_app || [];
    const targetPurchase = inAppPurchases.find(
      item => item.product_id === 'clawspace.fulltime.access'
    );

    if (!targetPurchase) {
      return {
        success: false,
        message: '未找到购买记录'
      };
    }

    const originalTransactionId = targetPurchase.original_transaction_id;
    const productId = targetPurchase.product_id;
    const purchaseDate = parseInt(targetPurchase.purchase_date_ms);

    // 5. 查询或更新数据库
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
    console.error('恢复购买失败', error);

    // 网络错误时，尝试查询数据库中所有 active 记录
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      const db = uniCloud.database();
      const collection = db.collection(TABLE_NAME);

      const result = await collection
        .where({
          productId: 'clawspace.fulltime.access',
          status: 'active'
        })
        .orderBy('purchaseDate', 'desc')
        .limit(1)
        .get();

      if (result.data.length > 0) {
        return {
          success: true,
          isPremium: true,
          originalTransactionId: result.data[0].originalTransactionId,
          fromCache: true
        };
      }
    }

    return {
      success: false,
      message: error.message || '恢复购买失败'
    };
  }
};
