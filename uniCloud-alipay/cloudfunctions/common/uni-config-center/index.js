'use strict';

const fs = require('fs');
const path = require('path');

function loadConfig(pluginId) {
  const basePath = path.join(__dirname, pluginId);
  const jsPath = path.join(basePath, 'config.js');
  const jsonPath = path.join(basePath, 'config.json');

  if (fs.existsSync(jsPath)) {
    return require(jsPath);
  }

  if (fs.existsSync(jsonPath)) {
    const raw = fs.readFileSync(jsonPath, 'utf8');
    return JSON.parse(raw);
  }

  return {};
}

function createConfig(options = {}) {
  const { pluginId } = options;

  if (!pluginId) {
    throw new TypeError('pluginId is required');
  }

  return {
    config(defaults = {}) {
      return {
        ...defaults,
        ...loadConfig(pluginId)
      };
    }
  };
}

module.exports = createConfig;
