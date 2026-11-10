let _config = null;

async function loadConfig() {
  if (_config) return _config;
  let api = {}, file = {};
  try { const r = await fetch('/api/config'); if (r.ok) api = await r.json(); } catch(e) {}
  try { const r = await fetch('config/git_config.json'); if (r.ok) file = await r.json(); } catch(e) {}
  const apiTok = String(api.github_token || '').trim();
  const fileTok = String(file.github_token || '').trim();
  _config = {
    github_token: (apiTok && apiTok !== 'YOUR_GITHUB_TOKEN') ? apiTok : fileTok,
    github_owner: file.github_owner || '',
    github_repo: file.github_repo || '',
    data_file_path: file.data_file_path || 'data/posts.json',
    admin_password: api.admin_password || file.admin_password || 'admin1234'
  };
  return _config;
}

function isAdmin() {
  return sessionStorage.getItem('isAdmin') === 'true';
}

function requireAdmin() {
  if (!isAdmin()) {
    window.location.href = 'admin.html';
  }
}

function handleAgentLogin(event) {
  if (event) event.preventDefault();
  window.location.href = 'admin.html';
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeUrl(url) {
  const clean = String(url || '').trim();
  if (/^(https?:\/\/|mailto:)/i.test(clean)) {
    return clean;
  }
  return '#';
}

function renderMarkdown(src) {
  if (!src) return '';
  const text = String(src).replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const codeBlocks = [];
  let blockReplaced = text.replace(/```([\w-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(`<pre class="bg-surface-container-high p-4 rounded-xl overflow-x-auto my-4 text-sm font-mono text-on-surface"><code>${escapeHtml(code)}</code></pre>`);
    return `@@CODEBLOCK_${idx}@@`;
  });

  const lines = blockReplaced.split('\n');
  const processedLines = [];
  let inList = false;
  let listType = null;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (/^@@CODEBLOCK_\d+@@$/.test(line.trim())) {
      if (inList) {
        processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
        inList = false;
      }
      processedLines.push(line);
      continue;
    }

    if (/^---{3,}$/.test(line.trim())) {
      if (inList) {
        processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
        inList = false;
      }
      processedLines.push('<hr class="my-6 border-outline-variant/30">');
      continue;
    }

    const h3Match = line.match(/^###\s+(.*)$/);
    if (h3Match) {
      if (inList) { processedLines.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      processedLines.push(`<h3 class="text-xl font-bold text-on-surface mt-6 mb-3">${renderInline(h3Match[1])}</h3>`);
      continue;
    }

    const h2Match = line.match(/^##\s+(.*)$/);
    if (h2Match) {
      if (inList) { processedLines.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      processedLines.push(`<h2 class="text-2xl font-bold text-on-surface mt-8 mb-4">${renderInline(h2Match[1])}</h2>`);
      continue;
    }

    const h1Match = line.match(/^#\s+(.*)$/);
    if (h1Match) {
      if (inList) { processedLines.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      processedLines.push(`<h1 class="text-3xl font-extrabold text-on-surface mt-8 mb-4">${renderInline(h1Match[1])}</h1>`);
      continue;
    }

    const quoteMatch = line.match(/^>\s*(.*)$/);
    if (quoteMatch) {
      if (inList) { processedLines.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false; }
      processedLines.push(`<blockquote class="border-l-4 border-primary pl-4 py-2 my-4 bg-primary/5 rounded-r-xl text-on-surface-variant italic">${renderInline(quoteMatch[1])}</blockquote>`);
      continue;
    }

    const ulMatch = line.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
        processedLines.push('<ul class="list-disc list-inside space-y-1.5 my-3 text-on-surface-variant">');
        inList = true;
        listType = 'ul';
      }
      processedLines.push(`<li>${renderInline(ulMatch[1])}</li>`);
      continue;
    }

    const olMatch = line.match(/^\d+\.\s+(.*)$/);
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
        processedLines.push('<ol class="list-decimal list-inside space-y-1.5 my-3 text-on-surface-variant">');
        inList = true;
        listType = 'ol';
      }
      processedLines.push(`<li>${renderInline(olMatch[1])}</li>`);
      continue;
    }

    if (inList) {
      processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
      inList = false;
    }

    if (line.trim() === '') {
      processedLines.push('<div class="h-3"></div>');
    } else {
      processedLines.push(`<p class="leading-relaxed text-on-surface-variant my-2">${renderInline(line)}</p>`);
    }
  }

  if (inList) {
    processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
  }

  let html = processedLines.join('\n');
  html = html.replace(/@@CODEBLOCK_(\d+)@@/g, (m, id) => codeBlocks[Number(id)] || '');
  return html;
}

function renderInline(str) {
  const parts = String(str).split('`');
  let result = '';
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) {
      result += `<code class="bg-surface-container-high px-1.5 py-0.5 rounded text-sm font-mono text-primary">${escapeHtml(parts[i])}</code>`;
    } else {
      let t = escapeHtml(parts[i]);
      t = t.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-on-surface">$1</strong>');
      t = t.replace(/\*(.+?)\*/g, '<em class="italic">$1</em>');
      t = t.replace(/~~(.+?)~~/g, '<del class="line-through">$1</del>');
      t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, txt, url) => {
        const safeUrl = sanitizeUrl(url);
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-primary underline hover:text-primary-container transition-colors">${txt}</a>`;
      });
      result += t;
    }
  }
  return result;
}

function markdownToText(src) {
  if (!src) return '';
  return String(src)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s*/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/---+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function getPosts() {
  const cached = localStorage.getItem('dh_posts');
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {}
  }

  try {
    const config = await loadConfig();
    const token = String(config.github_token || '').replace(/\s+/g, '');
    if (token && token !== 'YOUR_GITHUB_TOKEN' && config.github_owner && config.github_repo) {
      const url = `https://api.github.com/repos/${config.github_owner}/${config.github_repo}/contents/${config.data_file_path}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (res.ok) {
        const data = await res.json();
        const contentStr = decodeURIComponent(escape(atob(data.content.replace(/\s/g, ''))));
        const posts = JSON.parse(contentStr);
        if (Array.isArray(posts)) {
          localStorage.setItem('dh_posts', JSON.stringify(posts));
          return posts;
        }
      }
    }
  } catch (e) {}

  try {
    const r = await fetch('data/posts.json');
    if (r.ok) {
      const posts = await r.json();
      if (Array.isArray(posts)) {
        localStorage.setItem('dh_posts', JSON.stringify(posts));
        return posts;
      }
    }
  } catch (e) {}

  return [];
}

async function getPost(id) {
  const posts = await getPosts();
  return posts.find(p => String(p.id) === String(id)) || null;
}

async function savePost(postData) {
  const posts = await getPosts();
  const id = postData.id ? String(postData.id) : String(Date.now());
  const now = new Date().toISOString().slice(0, 10);

  const newPost = {
    id,
    title: postData.title || '제목 없음',
    category: postData.category || '공인중개사 소식',
    date: postData.date || now,
    views: postData.views ? Number(postData.views) : 0,
    image: postData.image || '',
    content: postData.content || ''
  };

  const existingIdx = posts.findIndex(p => String(p.id) === id);
  if (existingIdx >= 0) {
    posts[existingIdx] = { ...posts[existingIdx], ...newPost };
  } else {
    posts.unshift(newPost);
  }

  localStorage.setItem('dh_posts', JSON.stringify(posts));

  try {
    const config = await loadConfig();
    const token = String(config.github_token || '').replace(/\s+/g, '');
    if (token && token !== 'YOUR_GITHUB_TOKEN' && config.github_owner && config.github_repo) {
      const apiUrl = `https://api.github.com/repos/${config.github_owner}/${config.github_repo}/contents/${config.data_file_path}`;
      let sha = null;

      try {
        const getRes = await fetch(apiUrl, {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        if (getRes.ok) {
          const fileData = await getRes.json();
          sha = fileData.sha;
        }
      } catch (err) {}

      const jsonString = JSON.stringify(posts, null, 2);
      const encoded = btoa(unescape(encodeURIComponent(jsonString)));

      const bodyData = {
        message: `feat(board): update post '${newPost.title}'`,
        content: encoded
      };
      if (sha) bodyData.sha = sha;

      const putRes = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
      });

      if (!putRes.ok) {
        const errJson = await putRes.json().catch(() => ({}));
        console.warn('GitHub Sync Warning:', errJson);
      }
    }
  } catch (err) {
    console.warn('GitHub Save Error:', err);
  }

  return newPost;
}

async function deletePost(id) {
  let posts = await getPosts();
  posts = posts.filter(p => String(p.id) !== String(id));
  localStorage.setItem('dh_posts', JSON.stringify(posts));

  try {
    const config = await loadConfig();
    const token = String(config.github_token || '').replace(/\s+/g, '');
    if (token && token !== 'YOUR_GITHUB_TOKEN' && config.github_owner && config.github_repo) {
      const apiUrl = `https://api.github.com/repos/${config.github_owner}/${config.github_repo}/contents/${config.data_file_path}`;
      let sha = null;
      const getRes = await fetch(apiUrl, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (getRes.ok) {
        const fileData = await getRes.json();
        sha = fileData.sha;
      }

      const jsonString = JSON.stringify(posts, null, 2);
      const encoded = btoa(unescape(encodeURIComponent(jsonString)));

      const bodyData = {
        message: `feat(board): delete post id ${id}`,
        content: encoded
      };
      if (sha) bodyData.sha = sha;

      await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
      });
    }
  } catch (err) {
    console.warn('GitHub Delete Error:', err);
  }

  return true;
}

window.loadConfig = loadConfig;
window.isAdmin = isAdmin;
window.requireAdmin = requireAdmin;
window.handleAgentLogin = handleAgentLogin;
window.renderMarkdown = renderMarkdown;
window.markdownToText = markdownToText;
window.escapeHtml = escapeHtml;
window.getPosts = getPosts;
window.getPost = getPost;
window.savePost = savePost;
window.deletePost = deletePost;
