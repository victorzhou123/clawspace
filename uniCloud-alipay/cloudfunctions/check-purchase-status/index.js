'use strict';

const createConfig = require('uni-config-center');

const config = createConfig({ pluginId: 'clawspace' }).config({
  TABLE_NAME: 'purchases'
});
const { TABLE_NAME } = config;

console.log(`[check-purchase-status] 表名: ${TABLE_NAME}`);

exports.main = async (event, context) => {
  const { transactionId } = event;

  // 参数验证
  if (!transactionId) {
    return {
      success: false,
      isPremium: false,
      message: '交易ID不能为空'
    };
  }

  try {
    const db = uniCloud.database();
    const collection = db.collection(TABLE_NAME);

    // 查询数据库
    const result = await collection
      .where({
        originalTransactionId: transactionId,
        status: 'active'
      })
      .get();

    if (result.data.length > 0) {
      return {
        success: true,
        isPremium: true,
        transactionId: result.data[0].originalTransactionId,
        purchaseDate: result.data[0].purchaseDate
      };
    } else {
      return {
        success: true,
        isPremium: false,
        message: '未找到购买记录'
      };
    }

  } catch (error) {
    console.error('查询购买状态失败', error);

    return {
      success: false,
      isPremium: false,
      message: error.message || '查询失败'
    };
  }
};
