const express = require('express')
const router = express.Router()
const { Octokit } = require('@octokit/rest')
const db = require('../models/db')

// 添加简单的内存缓存
const cache = {
    files: new Map(),
    timeout: 5 * 60 * 1000  // 5分钟缓存
};

// 获取用户配置
const getUserConfigs = async (userId) => {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT key, value FROM configs WHERE user_id = ?`,
      [userId],
      (err, rows) => {
        if (err) reject(err);
        else {
          const configs = rows.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
          }, {});
          resolve(configs);
        }
      }
    );
  });
};

router.post('/upload', async (req, res) => {
    try {
        const configs = await getUserConfigs(req.user.username);
        const { file: content, filename } = req.body;
        
        if (!configs.GITHUB_TOKEN) {
            return res.status(400).json({ error: '请先配置 GitHub Token' });
        }

        // 给文件名添加时间戳
        const timestamp = Date.now();
        const ext = filename.includes('.') ? filename.split('.').pop() : '';
        const baseName = filename.includes('.') ? filename.slice(0, filename.lastIndexOf('.')) : filename;
        const newFilename = `${baseName}_${timestamp}${ext ? '.' + ext : ''}`;

        const octokit = new Octokit({
            auth: configs.GITHUB_TOKEN
        });

        // 获取仓库信息
        const repos = await octokit.rest.repos.listForAuthenticatedUser({
            sort: 'updated',
            per_page: 1
        });

        if (repos.data.length === 0) {
            return res.status(400).json({ error: '请先创建一个仓库' });
        }

        // 使用第一个仓库或默认仓库
        const owner = repos.data[0].owner.login;
        const repo = configs.GITHUB_DEFAULT_REPO || repos.data[0].name;

        const d = new Date();
        const path = `${d.getFullYear()}${d.getMonth() + 1}/${newFilename}`;  // 使用新文件名

        await octokit.rest.repos.createOrUpdateFileContents({
            owner,
            repo,
            path,
            message: 'upload via API',
            content
        });

        const url = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;
        const proxy_url = url.replace(
            "https://raw.githubusercontent.com",
            "https://proxy.xjai.cc/github_static"
        );

        // 添加到历史记录
        const fileSize = Buffer.from(content, 'base64').length;
        await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO upload_history (filename, path, url, raw_url, size, user_id) VALUES (?, ?, ?, ?, ?, ?)`,
                [newFilename, path, proxy_url, url, fileSize, req.user.username],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        res.json({
            success: true,
            files: [{
                name: newFilename,  // 返回新文件名
                originalName: filename,  // 保存原始文件名
                url: proxy_url,
                raw_url: url,
                path,
                size: fileSize,
                created_at: new Date().toISOString(),
                type: 'file'
            }]
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 获取用户的仓库列表
router.get('/repositories', async (req, res) => {
    try {
        const configs = await getUserConfigs(req.user.username);
        
        if (!configs.GITHUB_TOKEN) {
            return res.json([]);
        }

        const octokit = new Octokit({
            auth: configs.GITHUB_TOKEN
        });

        const response = await octokit.rest.repos.listForAuthenticatedUser({
            sort: 'updated',
            per_page: 100
        });

        res.json(response.data);
    } catch (error) {
        res.json([]);
    }
});

// 创建新仓库
router.post('/repository', async (req, res) => {
    try {
        const octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN
        });
        
        const { name, description = '', isPrivate = false } = req.body;
        const response = await octokit.rest.repos.createForAuthenticatedUser({
            name,
            description,
            private: isPrivate,
            auto_init: true
        });
        
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ 
            error: error.response?.data?.message || error.message,
            documentation_url: error.response?.data?.documentation_url
        });
    }
});

// 获取仓库文件列表
router.get('/files', async (req, res) => {
    const { owner, repo, path = '' } = req.query;
    const cacheKey = `${owner}/${repo}/${path}`;
    
    // 检查缓存
    const cachedData = cache.files.get(cacheKey);
    if (cachedData && (Date.now() - cachedData.timestamp) < cache.timeout) {
        return res.json(cachedData.data);
    }

    try {
        const octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN
        });

        // 获取仓库内容
        const response = await octokit.rest.repos.getContent({
            owner,
            repo,
            path
        }).catch(error => {
            // 如果路径不存在，返回空数组
            if (error.status === 404) {
                return { data: [] };
            }
            throw error;
        });

        // 处理文件列表，包括文件和文件夹
        const items = Array.isArray(response.data) ? response.data : [response.data];
        const processedItems = items.map(item => {
            const isFile = item.type === 'file';
            const url = isFile ? 
                `https://raw.githubusercontent.com/${owner}/${repo}/main/${item.path}` : 
                null;
            const proxy_url = isFile ? 
                url.replace("https://raw.githubusercontent.com", "https://proxy.xjai.cc/github_static") : 
                null;

            return {
                name: item.name,
                path: item.path,
                url: proxy_url,
                raw_url: url,
                created_at: new Date().toISOString(),
                size: item.size,
                type: item.type,  // 'file' 或 'dir'
                sha: item.sha
            };
        });

        // 更新缓存
        cache.files.set(cacheKey, {
            data: processedItems,
            timestamp: Date.now()
        });

        res.json(processedItems);
    } catch (error) {
        // 返回空数组而不是错误
        res.json([]);
    }
});

// 删除文件
router.delete('/files', async (req, res) => {
    const { owner, repo, path, sha } = req.body;  // 添加 sha 参数
    try {
        const octokit = new Octokit({
            auth: process.env.GITHUB_TOKEN
        });

        // 如果没有提供 sha，先获取文件信息
        let fileSha = sha;
        if (!fileSha) {
            const fileData = await octokit.rest.repos.getContent({
                owner,
                repo,
                path
            });
            fileSha = fileData.data.sha;
        }
        
        // 删除文件
        await octokit.rest.repos.deleteFile({
            owner,
            repo,
            path,
            message: 'Delete file via API',
            sha: fileSha
        });
        
        // 删除缓存
        const cacheKey = `${owner}/${repo}`;
        cache.files.delete(cacheKey);
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ 
            error: error.response?.data?.message || error.message,
            documentation_url: error.response?.data?.documentation_url
        });
    }
});

// 添加获取用户信息的路由
router.get('/user', async (req, res) => {
    try {
        const octokit = new Octokit({
            auth: req.session.accessToken
        });
        const { data } = await octokit.rest.users.getAuthenticated();
        res.json(data);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// 获取上传历史
router.get('/history', async (req, res) => {
    try {
        const history = await new Promise((resolve, reject) => {
            db.all(
                `SELECT * FROM upload_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 100`,
                [req.user.username],
                (err, rows) => {
                    if (err) reject(err)
                    else resolve(rows)
                }
            )
        })
        res.json(history)
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

module.exports = router
