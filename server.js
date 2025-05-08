const express = require('express');
const app = express();
const path = require('path');

// 静态文件服务
app.use(express.static('public'));

// 添加默认路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 添加错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// 处理 404
app.use((req, res) => {
  res.status(404).send('Sorry cant find that!');
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});