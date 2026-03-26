// 环境配置
// 修改这里可以快速切换测试/生产环境
const ENV = 'test'; // 'test' 或 'prod'

// 环境配置
const CONFIG = {
  test: {
    tableName: 'purchases_test',
    encryptionKey: 'clawspace-test-key-32bytes!@#$12', // 32字节
    encryptionIV: 'clawspace-test12' // 16字节
  },
  prod: {
    tableName: 'purchases_prod',
    encryptionKey: 'clawspace-prod-key-32bytes!@#$12', // 32字节 - 生产环境请修改为更安全的密钥
    encryptionIV: 'clawspace-prod12' // 16字节 - 生产环境请修改
  }
};

// 当前环境配置
const CURRENT_CONFIG = CONFIG[ENV];

module.exports = {
  ENV,
  TABLE_NAME: CURRENT_CONFIG.tableName,
  ENCRYPTION_KEY: Buffer.from(CURRENT_CONFIG.encryptionKey),
  ENCRYPTION_IV: Buffer.from(CURRENT_CONFIG.encryptionIV)
};
