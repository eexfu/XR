const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');

// 设置MIME类型
express.static.mime.define({
  'text/css': ['css'],
  'application/javascript': ['js'],
  'font/woff': ['woff'],
  'font/woff2': ['woff2']
});

// 特殊路由处理normalize.css
app.get('/stylesheets/normalize.css', (req, res) => {
  res.setHeader('Content-Type', 'text/css');
  const normalizePath = path.join(__dirname, 'node_modules', 'normalize.css', 'normalize.css');
  fs.readFile(normalizePath, (err, data) => {
    if (err) {
      console.error('Error reading normalize.css:', err);
      return res.status(404).type('text/css').send('/* normalize.css not found */');
    }
    res.send(data);
  });
});

// 静态文件服务
app.use(express.static('public', {
  setHeaders: (res, path) => {
    // 确保JS文件使用正确的Content-Type
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
    // 确保CSS文件使用正确的Content-Type
    else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
    // 确保字体文件使用正确的Content-Type
    else if (path.endsWith('.woff')) {
      res.setHeader('Content-Type', 'font/woff');
    }
    else if (path.endsWith('.woff2')) {
      res.setHeader('Content-Type', 'font/woff2');
    }
  }
}));

// 提供node_modules中的文件
app.use('/node_modules', express.static('node_modules', {
  setHeaders: (res, path) => {
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
  }
}));

// 添加默认路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 添加错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// 处理 404 - 确保以正确的MIME类型响应
app.use((req, res) => {
  const url = req.url;
  
  // 根据请求的文件类型设置正确的Content-Type
  if (url.endsWith('.js')) {
    res.status(404).type('application/javascript').send('// 文件不存在');
  } 
  else if (url.endsWith('.css')) {
    res.status(404).type('text/css').send('/* 文件不存在 */');
  }
  else if (url.endsWith('.woff') || url.endsWith('.woff2')) {
    // 对于字体文件，返回一个空响应但设置正确的MIME类型
    res.status(404).type(url.endsWith('.woff') ? 'font/woff' : 'font/woff2').send('');
  }
  else {
    res.status(404).send('Sorry cant find that!');
  }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});