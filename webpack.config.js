const path = require('path');
const fs = require('fs');

module.exports = {
  // ... 其他配置 ...
  devServer: {
    host: '0.0.0.0',
    port: 3000,
    hot: true,
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  },
  // ... 其他配置 ...
}; 