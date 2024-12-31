const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const path = require('path');
const db = require('./models/db');

const app = express();

// JWT 密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';

// CORS 配置
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.static('vite-template/dist'));

// JWT 验证中间件
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// 登录路由
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', { username, password });

  try {
    const user = await new Promise((resolve, reject) => {
      console.log('Querying database...');
      db.get(
        "SELECT * FROM users WHERE username = ? AND password = ?",
        [username, password],
        (err, row) => {
          if (err) {
            console.error('Database error:', err);
            reject(err);
          } else {
            console.log('Query result:', row);
            resolve(row);
          }
        }
      );
    });

    if (user) {
      const token = jwt.sign(
        { username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({ 
        success: true,
        token,
        user: { 
          username: user.username,
          role: user.role
        }
      });
    } else {
      console.log('User not found');
      res.status(401).json({ error: '用户名或密码错误' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// 添加注册路由
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  console.log('Register attempt:', { username });

  try {
    // 检查用户名是否已存在
    const existingUser = await new Promise((resolve, reject) => {
      db.get(
        "SELECT username FROM users WHERE username = ?",
        [username],
        (err, row) => {
          if (err) {
            console.error('Database error:', err);
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });

    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    // 创建新用户
    await new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
        [username, password, 'user'],
        (err) => {
          if (err) {
            console.error('Database error:', err);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });

    // 注册成功后自动登录
    const token = jwt.sign(
      { username, role: 'user' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        username,
        role: 'user'
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: '注册失败' });
  }
});

// 验证 token 的路由
app.get('/api/auth/verify', verifyToken, (req, res) => {
  res.json({
    isAuthenticated: true,
    user: req.user
  });
});

// JWT 验证中间件应该在登录和注册路由之后
app.use('/api', verifyToken);

const uploadRouter = require('./router/upload');
const configRouter = require('./router/config');


app.use('/api', uploadRouter);
app.use('/api', configRouter);

// 所有其他路由返回 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'vite-template/dist/index.html'));
});

app.listen(process.env.PORT, () => {
  console.log(`App listening on port ${process.env.PORT}`);
});