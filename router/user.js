const express = require('express');
const router = express.Router();
const db = require('../models/db');

// 获取用户列表
router.get('/users', async (req, res) => {
  try {
    const users = await new Promise((resolve, reject) => {
      db.all("SELECT id, username, created_at FROM users", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 创建新用户
router.post('/users', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    await new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO users (username, password) VALUES (?, ?)",
        [username, password],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 修改密码
router.post('/users/change-password', async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const username = req.user.username;

  try {
    const user = await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM users WHERE username = ? AND password = ?",
        [username, oldPassword],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return res.status(400).json({ error: '原密码错误' });
    }

    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE users SET password = ? WHERE username = ?",
        [newPassword, username],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 