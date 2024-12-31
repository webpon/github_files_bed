const express = require('express');
const router = express.Router();
const db = require('../models/db');

// 获取配置
router.get('/configs', async (req, res) => {
  try {
    const configs = await new Promise((resolve, reject) => {
      db.all(
        `SELECT key, value FROM configs WHERE user_id = ?`,
        [req.user.username],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    const configObj = configs.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    res.json(configObj);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新配置
router.post('/configs', async (req, res) => {
  const { githubToken, defaultRepo } = req.body;
  
  try {
    await Promise.all([
      new Promise((resolve, reject) => {
        db.run(
          `INSERT OR REPLACE INTO configs (key, value, user_id) VALUES (?, ?, ?)`,
          ['GITHUB_TOKEN', githubToken, req.user.username],
          (err) => err ? reject(err) : resolve()
        );
      }),
      new Promise((resolve, reject) => {
        db.run(
          `INSERT OR REPLACE INTO configs (key, value, user_id) VALUES (?, ?, ?)`,
          ['GITHUB_DEFAULT_REPO', defaultRepo, req.user.username],
          (err) => err ? reject(err) : resolve()
        );
      })
    ]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 