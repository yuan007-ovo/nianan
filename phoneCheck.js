// ==========================================
// 查手机功能专属逻辑 (phoneCheck.js)
// ==========================================

// 初始化：保存默认的 SVG 图标，方便后续恢复
document.addEventListener('DOMContentLoaded', () => {
    const apps = document.querySelectorAll('.desktop-app .app-icon, .phone-dock .app-icon');
    apps.forEach(iconEl => {
        iconEl.setAttribute('data-default-svg', iconEl.innerHTML);
    });
});

// 打开查手机全屏遮罩
function openPhoneCheck() {
    // 关闭可能存在的更多面板
    const morePanel = document.getElementById('crMorePanel');
    if (morePanel) morePanel.classList.remove('show');
    
    // 动态加载当前聊天室 Char 的头像、名字以及保存的自定义装扮
    if (typeof currentChatRoomCharId !== 'undefined' && currentChatRoomCharId) {
        let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
        const char = chars.find(c => c.id === currentChatRoomCharId);
        
        if (char) {
            const avatarUrl = char.avatarUrl || '';
            const charName = char.netName || char.name || '未知角色';
            
            // 1. 恢复头像和名字
            const stampInner = document.querySelector('.char-stamp-inner');
            if (stampInner) stampInner.style.backgroundImage = `url('${avatarUrl}')`;
            
            const profileAvatar = document.querySelector('.profile-avatar');
            if (profileAvatar) profileAvatar.style.backgroundImage = `url('${avatarUrl}')`;
            
            const sidebarAvatar = document.querySelector('.sidebar-avatar');
            if (sidebarAvatar) sidebarAvatar.style.backgroundImage = `url('${avatarUrl}')`;
            
            const profileName = document.querySelector('.profile-name');
            if (profileName) profileName.innerText = charName;
        }

        // 2. 恢复壁纸
        const savedWallpaper = ChatDB.getItem(`phone_check_wallpaper_${currentChatRoomCharId}`);
        const wallpaperEl = document.getElementById('phoneWallpaper');
        if (wallpaperEl) {
            if (savedWallpaper) {
                wallpaperEl.style.backgroundImage = `url(${savedWallpaper})`;
            } else {
                wallpaperEl.style.backgroundImage = ''; // 恢复默认浅灰
            }
        }

        // 3. 恢复小组件背景
        const savedWidgetBg = ChatDB.getItem(`phone_check_widget_bg_${currentChatRoomCharId}`);
        const widgetBgEl = document.getElementById('widgetBg');
        if (widgetBgEl) {
            if (savedWidgetBg) {
                widgetBgEl.style.backgroundImage = `url(${savedWidgetBg})`;
            } else {
                widgetBgEl.style.backgroundImage = ''; // 恢复默认白色
            }
        }

        // 4. 恢复自定义图标
        const savedIcons = JSON.parse(ChatDB.getItem(`phone_check_icons_${currentChatRoomCharId}`) || '{}');
        const apps = document.querySelectorAll('.desktop-app .app-icon, .phone-dock .app-icon');
        apps.forEach(iconEl => {
            const appId = iconEl.id;
            if (savedIcons[appId]) {
                iconEl.innerHTML = '';
                iconEl.style.backgroundImage = `url(${savedIcons[appId]})`;
                iconEl.style.backgroundSize = 'cover';
                iconEl.style.backgroundPosition = 'center';
            } else {
                // 如果没有自定义图标，恢复默认 SVG
                iconEl.style.backgroundImage = '';
                if (iconEl.hasAttribute('data-default-svg')) {
                    iconEl.innerHTML = iconEl.getAttribute('data-default-svg');
                }
            }
        });
    }

    document.getElementById('phoneCheckOverlay').classList.add('show');
}

// 关闭查手机全屏遮罩
function closePhoneCheck() {
    document.getElementById('phoneCheckOverlay').classList.remove('show');
    document.getElementById('charSidebar').classList.remove('open');
}

// 切换侧边栏
function toggleSidebar() {
    document.getElementById('charSidebar').classList.toggle('open');
}

// ==========================================
// 壁纸与背景上传逻辑 (带持久化)
// ==========================================
function triggerWallpaperUpload() {
    document.getElementById('wallpaperUploadInput').click();
}

function handleWallpaperUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const result = e.target.result;
            document.getElementById('phoneWallpaper').style.backgroundImage = `url(${result})`;
            
            // 保存到数据库
            if (typeof currentChatRoomCharId !== 'undefined' && currentChatRoomCharId) {
                ChatDB.setItem(`phone_check_wallpaper_${currentChatRoomCharId}`, result);
            }
        }
        reader.readAsDataURL(file);
    }
    event.target.value = '';
}

function triggerWidgetBgUpload() {
    document.getElementById('widgetBgUploadInput').click();
}

function handleWidgetBgUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const result = e.target.result;
            document.getElementById('widgetBg').style.backgroundImage = `url(${result})`;
            
            // 保存到数据库
            if (typeof currentChatRoomCharId !== 'undefined' && currentChatRoomCharId) {
                ChatDB.setItem(`phone_check_widget_bg_${currentChatRoomCharId}`, result);
            }
        }
        reader.readAsDataURL(file);
    }
    event.target.value = '';
}

// ==========================================
// 图标更换逻辑 (带持久化)
// ==========================================
let currentEditingIconId = null;

function openIconModal() {
    const grid = document.getElementById('iconModalGrid');
    grid.innerHTML = '';
    
    // 获取桌面和Dock的图标
    const apps = document.querySelectorAll('.desktop-app .app-icon, .phone-dock .app-icon');
    
    apps.forEach((iconEl, index) => {
        const parentApp = iconEl.closest('.desktop-app');
        const nameEl = parentApp ? parentApp.querySelector('.app-name') : null;
        const name = nameEl ? nameEl.innerText : `Dock App ${index - 3}`;
        const appId = iconEl.id;

        const item = document.createElement('div');
        item.className = 'icon-modal-item';
        item.innerHTML = `
            <div class="icon-modal-preview">${iconEl.innerHTML}</div>
            <div class="icon-modal-name">${name}</div>
        `;
        
        // 复制背景图
        if (iconEl.style.backgroundImage) {
            item.querySelector('.icon-modal-preview').style.backgroundImage = iconEl.style.backgroundImage;
            item.querySelector('.icon-modal-preview').innerHTML = '';
        }

        item.onclick = () => {
            currentEditingIconId = appId;
            document.getElementById('iconUploadInput').click();
        };
        grid.appendChild(item);
    });

    document.getElementById('iconModalOverlay').classList.add('show');
    document.getElementById('charSidebar').classList.remove('open'); // 收起侧边栏
}

function closeIconModal() {
    document.getElementById('iconModalOverlay').classList.remove('show');
}

function handleIconUpload(event) {
    const file = event.target.files[0];
    if (file && currentEditingIconId) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const result = e.target.result;
            const targetIcon = document.getElementById(currentEditingIconId);
            
            if (targetIcon) {
                targetIcon.innerHTML = ''; // 清空 SVG
                targetIcon.style.backgroundImage = `url(${result})`;
                targetIcon.style.backgroundSize = 'cover';
                targetIcon.style.backgroundPosition = 'center';
                
                // 保存到数据库
                if (typeof currentChatRoomCharId !== 'undefined' && currentChatRoomCharId) {
                    let savedIcons = JSON.parse(ChatDB.getItem(`phone_check_icons_${currentChatRoomCharId}`) || '{}');
                    savedIcons[currentEditingIconId] = result;
                    ChatDB.setItem(`phone_check_icons_${currentChatRoomCharId}`, JSON.stringify(savedIcons));
                }
            }
            closeIconModal();
        }
        reader.readAsDataURL(file);
    }
    event.target.value = '';
}
// ==========================================
// 微信登录与主界面逻辑
// ==========================================

function openPhoneWechatLogin() {
    if (!currentChatRoomCharId) return alert('请先进入聊天室！');

    // 检查是否已经登录过
    const isLogged = ChatDB.getItem(`phone_wechat_logged_${currentChatRoomCharId}`);
    if (isLogged === 'true') {
        openPhoneWechatApp();
        return;
    }

    // 未登录，加载头像并显示登录页
    let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
    const char = chars.find(c => c.id === currentChatRoomCharId);
    if (char) {
        const avatarEl = document.getElementById('pwlAvatar');
        if (avatarEl) avatarEl.style.backgroundImage = `url('${char.avatarUrl || ''}')`;
    }
    
    document.getElementById('pwlAccount').value = '';
    document.getElementById('pwlPassword').value = '';
    document.getElementById('phoneWechatLogin').classList.add('show');
}

function closePhoneWechatLogin() {
    document.getElementById('phoneWechatLogin').classList.remove('show');
}

function doPhoneWechatLogin() {
    const acc = document.getElementById('pwlAccount').value.trim();
    const pwd = document.getElementById('pwlPassword').value.trim();

    if (!acc || !pwd) return alert('请输入账号和密码！');

    let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
    const char = chars.find(c => c.id === currentChatRoomCharId);
    
    if (char) {
        if (acc === char.account && pwd === char.password) {
            // 记录登录状态
            ChatDB.setItem(`phone_wechat_logged_${currentChatRoomCharId}`, 'true');
            closePhoneWechatLogin();
            openPhoneWechatApp();
        } else {
            alert('账号或密码错误！');
        }
    }
}

// ==========================================
// 微信主界面交互逻辑
// ==========================================
let currentPwaTab = 'chat';

function openPhoneWechatApp() {
    // 填充个人主页信息
    let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
    const char = chars.find(c => c.id === currentChatRoomCharId);
    if (char) {
        const avatarUrl = `url('${char.avatarUrl || ''}')`;
        document.getElementById('pwaNavAvatar').style.backgroundImage = avatarUrl;
        document.getElementById('pwaProfileAvatar').style.backgroundImage = avatarUrl;
        document.getElementById('pwaProfileName').innerText = char.netName || char.name;
        document.getElementById('pwaProfileSign').innerText = char.signature || char.description || '这个人很懒，什么都没写~';
        document.getElementById('pwaSubtitle').innerText = char.account || 'WECHAT';
    }

    document.getElementById('phoneWechatApp').classList.add('show');
    switchPwaTab('chat');
    renderPwaChatList();
    renderPwaContactList();
}

function closePhoneWechatApp() {
    document.getElementById('phoneWechatApp').classList.remove('show');
}

function switchPwaTab(tab) {
    currentPwaTab = tab;
    
    // 切换内容
    document.querySelectorAll('.pwa-tab-page').forEach(el => el.classList.remove('active'));
    document.getElementById(`pwaTab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');
    
    // 切换底部导航高亮
    document.getElementById('pwaNavBtnChat').classList.remove('active');
    document.getElementById('pwaNavBtnProfile').classList.remove('active');
    document.getElementById('pwaNavBtnContacts').classList.remove('active');
    
    if (tab === 'chat') document.getElementById('pwaNavBtnChat').classList.add('active');
    if (tab === 'profile') document.getElementById('pwaNavBtnProfile').classList.add('active');
    if (tab === 'contacts') document.getElementById('pwaNavBtnContacts').classList.add('active');

    // 控制右上角按钮显示
    const actionBtn = document.getElementById('pwaActionBtn');
    if (tab === 'chat' || tab === 'contacts') {
        actionBtn.style.visibility = 'visible';
    } else {
        actionBtn.style.visibility = 'hidden';
    }
}

// ==========================================
// API 生成逻辑
// ==========================================
function handlePwaAction() {
    if (currentPwaTab === 'chat') {
        generatePwaChatListAPI();
    } else if (currentPwaTab === 'contacts') {
        document.getElementById('pwaContactGenModal').classList.add('show');
    }
}

// 1. 生成会话列表与聊天记录 (严格基于通讯录)
async function generatePwaChatListAPI() {
    const apiConfig = JSON.parse(ChatDB.getItem('current_api_config') || '{}');
    if (!apiConfig.url || !apiConfig.key || !apiConfig.model) return alert('请先配置 API！');

    let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
    const char = chars.find(c => c.id === currentChatRoomCharId);
    if (!char) return;

    // 【新增】：获取当前已生成的通讯录
    let contacts = JSON.parse(ChatDB.getItem(`pwa_contact_list_${currentChatRoomCharId}`) || '[]');
    if (contacts.length === 0) {
        return alert('请先切换到 Contacts (通讯录) 页面生成通讯录！聊天列表必须基于通讯录生成。');
    }
    // 将通讯录格式化为字符串，供 AI 参考
    let contactListStr = contacts.map(c => `- ${c.name} (${c.type === 'group' ? '群聊' : '单人好友'}): ${c.desc}`).join('\n');

    // 获取当前登录用户的面具 (Persona)
    const currentLoginId = ChatDB.getItem('current_login_account');
    let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
    const account = accounts.find(a => a.id === currentLoginId);
    let personas = JSON.parse(ChatDB.getItem('chat_personas') || '[]');
    const persona = personas.find(p => p.id === (account ? account.personaId : null));
    const userDesc = persona ? persona.persona : '普通用户';

    // 获取世界书
    let activeWbs = [];
    let wbData = JSON.parse(ChatDB.getItem('worldbook_data')) || { entries: [] };
    let entries = wbData.entries.filter(e => (char.wbEntries && char.wbEntries.includes(e.id)) || e.constant);
    entries.forEach(entry => {
        activeWbs.push(entry.content);
    });

    // 获取最近真实的聊天记录
    let history = JSON.parse(ChatDB.getItem(`chat_history_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
    let recentHistory = history.slice(-20).map(m => `${m.role === 'user' ? 'User' : 'Char'}: ${m.content}`).join('\n');

    const userName = account ? (account.netName || 'User') : 'User';

    // 采用逐步拼接的方式构建 Prompt
    let prompt = `你现在正在扮演角色：${char.name}。\n`;
    prompt += `【你的设定】：${char.description || '无'}\n`;
    prompt += `【重要：用户身份】\n用户(User)的名字是：${userName}。\n用户在你的生活中的角色/人设是：${userDesc}。\n`;
    
    if (activeWbs.length > 0) {
        prompt += `【世界书背景】：\n${activeWbs.join('\n')}\n`;
    }
    
    if (recentHistory) {
        prompt += `【最近的真实聊天记录参考】：\n${recentHistory}\n`;
    }

    prompt += `\n【你的通讯录列表】：\n${contactListStr}\n`;
    prompt += `\n请基于你的人设、当前生活状态，以及我们最近的聊天上下文，以你的视角，生成你的微信聊天列表（包含 5-8 个会话）。\n`;
    prompt += `⚠️【极其重要的要求（极具活人感与独立社交）】：\n`;
    prompt += `1. 必须包含一个与用户(${userName})的会话，isUser 设为 true。\n`;
    prompt += `2. 其他会话你**只能**从上述【你的通讯录列表】中挑选联系人或群聊来生成，**绝对不能凭空捏造通讯录里没有的名字**！\n`;
    prompt += `3. 【最重要：独立社交指令】：你和 NPC 的聊天内容必须是真实的社交日常！例如：吐槽奇葩老板、聊游戏开黑、拼单点外卖、借钱、分享搞笑视频等。**绝对不要在每个群里都聊 ${userName}！你的世界不是只有 ${userName}！**同时要确保 ${userName} 可以隐秘体现在你的社交圈和你的生活里面！\n`;
    prompt += `4. 每个会话的聊天记录**必须不少于 20 条消息**！请充分展开对话细节，展现人物性格和关系，不要敷衍。\n`;
    prompt += `5. 如果是群聊，"other" 角色的消息内容中可以适当带上群成员的名字，例如 "张三: 吃饭了吗？"。\n`;
    
    prompt += `\n必须返回合法的 JSON 格式，结构如下：\n`;
    prompt += `[\n`;
    prompt += `  {\n`;
    prompt += `    "name": "${userName}的备注名", "isUser": true, "type": "friend", "lastMsg": "最近的一条消息",\n`;
    prompt += `    "history": [\n`;
    prompt += `      {"role": "other", "content": "在干嘛？"},\n`;
    prompt += `      {"role": "me", "content": "刚吃完饭"}\n`;
    prompt += `    ]\n`;
    prompt += `  },\n`;
    prompt += `  {\n`;
    prompt += `    "name": "工作群", "isUser": false, "type": "group", "lastMsg": "收到",\n`;
    prompt += `    "history": [\n`;
    prompt += `      {"role": "other", "content": "老板: 这份文件看一下"},\n`;
    prompt += `      {"role": "me", "content": "收到"}\n`;
    prompt += `    ]\n`;
    prompt += `  }\n`;
    prompt += `]`;

    showToast('正在生成聊天列表(数据量较大，请耐心等待)...', 'loading');

    try {
        const response = await fetch(`${apiConfig.url.replace(/\/$/, '')}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({ model: apiConfig.model, messages: [{ role: 'user', content: prompt }], temperature: 0.8 })
        });

        if (response.ok) {
            const data = await response.json();
            let replyRaw = data.choices[0].message.content.trim();
            replyRaw = replyRaw.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
            
            const parsed = JSON.parse(replyRaw);
            ChatDB.setItem(`pwa_chat_list_${currentChatRoomCharId}`, JSON.stringify(parsed));
            renderPwaChatList();
            hideToast();
        } else {
            throw new Error('API 请求失败');
        }
    } catch (e) {
        hideToast();
        alert('生成失败，请检查 API 配置或重试。\n注意：要求生成大量数据可能导致模型超时或输出被截断。');
    }
}

function renderPwaChatList() {
    const listEl = document.getElementById('pwaChatList');
    const data = JSON.parse(ChatDB.getItem(`pwa_chat_list_${currentChatRoomCharId}`) || 'null');
    
    if (!data) return;
    
    // 获取通讯录，以便查找是否是真实角色
    const contacts = JSON.parse(ChatDB.getItem(`pwa_contact_list_${currentChatRoomCharId}`) || '[]');
    let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');

    listEl.innerHTML = '';
    data.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'pwa-list-item';
        
        let avatarHtml = '';
        // 尝试在通讯录中找到对应的人，如果是真实角色则显示真实头像
        const contactInfo = contacts.find(c => c.name === item.name);
        if (contactInfo && contactInfo.isRealChar && contactInfo.charId) {
            const realChar = chars.find(c => c.id === contactInfo.charId);
            if (realChar && realChar.avatarUrl) {
                avatarHtml = `<div class="wechat-avatar" style="width: 44px; height: 44px; border-radius: 50%; background-image: url('${realChar.avatarUrl}'); background-size: cover; background-position: center;"></div>`;
            }
        }

        if (!avatarHtml) {
            const initial = item.name ? item.name.charAt(0).toUpperCase() : '?';
            const avatarClass = item.type === 'group' ? 'group' : 'friend';
            avatarHtml = `<div class="ios-msg-avatar ${avatarClass}" style="width: 44px; height: 44px; font-size: 20px;">${initial}</div>`;
        }

        el.innerHTML = `
            ${avatarHtml}
            <div class="pwa-list-info">
                <div class="pwa-list-name">${item.name}</div>
                <div class="pwa-list-desc">${item.lastMsg}</div>
            </div>
        `;
        el.onclick = () => openPwaChatRoom(index);
        listEl.appendChild(el);
    });
}

// 2. 生成通讯录 (支持群聊，并自动包含同分组的真实角色)
async function confirmGenerateContacts() {
    document.getElementById('pwaContactGenModal').classList.remove('show');
    const min = parseInt(document.getElementById('pwaContactMin').value) || 5;
    const max = parseInt(document.getElementById('pwaContactMax').value) || 15;
    const count = Math.floor(Math.random() * (max - min + 1)) + min;

    const apiConfig = JSON.parse(ChatDB.getItem('current_api_config') || '{}');
    if (!apiConfig.url || !apiConfig.key || !apiConfig.model) return alert('请先配置 API！');

    let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
    const char = chars.find(c => c.id === currentChatRoomCharId);
    if (!char) return;

    // 【新增核心逻辑】：查找同分组且已生成账号密码的真实角色
    const sameGroupChars = chars.filter(c => 
        c.id !== currentChatRoomCharId && 
        c.group === char.group && 
        c.account && c.password
    );

    const currentLoginId = ChatDB.getItem('current_login_account');
    let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
    const account = accounts.find(a => a.id === currentLoginId);
    let personas = JSON.parse(ChatDB.getItem('chat_personas') || '[]');
    const persona = personas.find(p => p.id === (account ? account.personaId : null));
    const userDesc = persona ? persona.persona : '普通用户';

    let activeWbs = [];
    let wbData = JSON.parse(ChatDB.getItem('worldbook_data')) || { entries: [] };
    let entries = wbData.entries.filter(e => (char.wbEntries && char.wbEntries.includes(e.id)) || e.constant);
    entries.forEach(entry => activeWbs.push(entry.content));

    let history = JSON.parse(ChatDB.getItem(`chat_history_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
    let recentHistory = history.slice(-20).map(m => `${m.role === 'user' ? 'User' : 'Char'}: ${m.content}`).join('\n');

    const userName = account ? (account.netName || 'User') : 'User';

    let prompt = `你现在正在扮演角色：${char.name}。\n`;
    prompt += `【你的设定】：${char.description || '无'}\n`;
    prompt += `【重要：用户身份】\n用户(User)的名字是：${userName}。\n用户在你的生活中的角色/人设是：${userDesc}。\n`;
    if (activeWbs.length > 0) prompt += `【世界书背景】：\n${activeWbs.join('\n')}\n`;
    if (recentHistory) prompt += `【最近的真实聊天记录参考】：\n${recentHistory}\n`;

    prompt += `\n请基于你的人设、当前生活状态，以及我们最近的聊天上下文，以你的视角，生成你的微信通讯录列表，共生成 ${count} 个联系人。\n`;
    prompt += `【要求】：\n`;
    prompt += `1. 通讯录中不仅要有单人好友，还可以包含几个【群聊】（例如：工作群、家庭群、兴趣爱好群等）。\n`;
    prompt += `2. 每个人物必须包含 'desc' (一句话概括来历/关系)。\n`;
    prompt += `3. 【绝对禁止】：不要在 'contacts' 中生成用户(${userName})的条目！用户是固定的，我会自动添加。\n`;
    prompt += `4. 请单独返回一个字段 "userRemark"，表示你给用户(${userName})设置的备注名（例如：亲爱的、老板、傻瓜等）。\n`;
    prompt += `必须返回合法的 JSON 对象，结构如下：\n`;
    prompt += `{\n`;
    prompt += `  "userRemark": "给用户的备注",\n`;
    prompt += `  "contacts": [\n`;
    prompt += `    {"type": "friend", "name": "联系人名字", "desc": "简短的个性签名或身份介绍"},\n`;
    prompt += `    {"type": "group", "name": "群聊名字", "desc": "群聊简介"}\n`;
    prompt += `  ]\n`;
    prompt += `}`;

    showToast('正在生成通讯录...', 'loading');

    try {
        const response = await fetch(`${apiConfig.url.replace(/\/$/, '')}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({ model: apiConfig.model, messages: [{ role: 'user', content: prompt }], temperature: 0.8 })
        });

        if (response.ok) {
            const data = await response.json();
            let replyRaw = data.choices[0].message.content.trim();
            replyRaw = replyRaw.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
            
            let parsed = JSON.parse(replyRaw);
            let aiContacts = parsed.contacts || [];
            
            // 1. JS 强行构造 User 节点，保证绝对不出错
            const userContact = {
                type: 'friend',
                name: parsed.userRemark || userName,
                desc: '我自己 (User)',
                isUser: true
            };
            
            // 2. 将同分组的真实角色追加进去
            sameGroupChars.forEach(c => {
                const charName = c.netName || c.name;
                const exists = aiContacts.some(p => p.name === charName);
                if (!exists) {
                    aiContacts.push({
                        type: 'friend',
                        name: charName,
                        desc: c.signature || c.description || '暂无简介',
                        isRealChar: true,
                        charId: c.id
                    });
                }
            });

            // 打乱 AI 生成的联系人和真实角色的顺序
            aiContacts.sort(() => Math.random() - 0.5);
            
            // 3. 组合最终通讯录：User 永远在第一位
            let finalContacts = [userContact, ...aiContacts];

            ChatDB.setItem(`pwa_contact_list_${currentChatRoomCharId}`, JSON.stringify(finalContacts));
            renderPwaContactList();
            hideToast();
        } else {
            throw new Error('API 请求失败');
        }
    } catch (e) {
        hideToast();
        alert('生成失败，请检查 API 配置或重试。');
    }
}

function renderPwaContactList() {
    const listEl = document.getElementById('pwaContactList');
    const data = JSON.parse(ChatDB.getItem(`pwa_contact_list_${currentChatRoomCharId}`) || 'null');
    
    if (!data) return;
    
    let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');

    listEl.innerHTML = '';
    data.forEach((item, index) => {
        const el = document.createElement('div');
        el.className = 'pwa-list-item';
        
        let avatarHtml = '';
        // 如果是真实角色，显示真实头像
        if (item.isRealChar && item.charId) {
            const realChar = chars.find(c => c.id === item.charId);
            if (realChar && realChar.avatarUrl) {
                avatarHtml = `<div class="wechat-avatar" style="width: 44px; height: 44px; border-radius: 50%; background-image: url('${realChar.avatarUrl}'); background-size: cover; background-position: center;"></div>`;
            }
        }
        
        // 如果没有真实头像，降级显示 iOS 风格首字母
        if (!avatarHtml) {
            const initial = item.name ? item.name.charAt(0).toUpperCase() : '?';
            const avatarClass = item.type === 'group' ? 'group' : 'friend';
            avatarHtml = `<div class="ios-msg-avatar ${avatarClass}" style="width: 44px; height: 44px; font-size: 20px;">${initial}</div>`;
        }
        
        el.innerHTML = `
            ${avatarHtml}
            <div class="pwa-list-info">
                <div class="pwa-list-name">${item.name}</div>
                <div class="pwa-list-desc">${item.desc}</div>
            </div>
        `;
        
        el.onclick = () => openContactActionModal(index);
        listEl.appendChild(el);
    });
}

// ==========================================
// 通讯录点击弹窗与操作逻辑
// ==========================================
let currentActionContactIndex = null;

function openContactActionModal(index) {
    currentActionContactIndex = index;
    const data = JSON.parse(ChatDB.getItem(`pwa_contact_list_${currentChatRoomCharId}`) || '[]');
    const contact = data[index];
    if (!contact) return;

    const avatarEl = document.getElementById('pcaAvatar');
    
    // 弹窗内也支持显示真实头像
    if (contact.isRealChar && contact.charId) {
        let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
        const realChar = chars.find(c => c.id === contact.charId);
        if (realChar && realChar.avatarUrl) {
            avatarEl.className = ''; // 清除 ios-msg-avatar 类
            avatarEl.style.cssText = `width: 64px; height: 64px; border-radius: 50%; background-image: url('${realChar.avatarUrl}'); background-size: cover; background-position: center; margin-bottom: 12px;`;
            avatarEl.innerText = '';
        }
    } else {
        const initial = contact.name ? contact.name.charAt(0).toUpperCase() : '?';
        const avatarClass = contact.type === 'group' ? 'group' : 'friend';
        avatarEl.className = `ios-msg-avatar ${avatarClass}`;
        avatarEl.style.cssText = `width: 64px; height: 64px; font-size: 28px; margin-bottom: 12px;`;
        avatarEl.innerText = initial;
    }
    
    document.getElementById('pcaName').innerText = contact.name;
    document.getElementById('pcaDesc').innerText = contact.desc || '暂无简介';

    document.getElementById('pwaContactActionModal').classList.add('show');
}

function closeContactActionModal() {
    document.getElementById('pwaContactActionModal').classList.remove('show');
}

function deleteContact() {
    if (confirm('确定要删除该联系人吗？')) {
        let data = JSON.parse(ChatDB.getItem(`pwa_contact_list_${currentChatRoomCharId}`) || '[]');
        const contactName = data[currentActionContactIndex].name; 
        
        data.splice(currentActionContactIndex, 1);
        ChatDB.setItem(`pwa_contact_list_${currentChatRoomCharId}`, JSON.stringify(data));
        
        // 👇 修改：同步感知逻辑 (明确 User 和 Char 的名字) 👇
        const currentLoginId = ChatDB.getItem('current_login_account');
        if (currentLoginId && currentChatRoomCharId) {
            let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
            const account = accounts.find(a => a.id === currentLoginId);
            const userName = account ? (account.netName || 'User') : 'User';

            let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
            const char = chars.find(c => c.id === currentChatRoomCharId);
            const charName = char ? char.name : 'Ta';

            let mainHistory = JSON.parse(ChatDB.getItem(`chat_history_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
            mainHistory.push({
                role: 'system',
                type: 'system',
                content: `[系统内部信息(仅AI可见)：${userName}(User) 偷偷拿到了 ${charName} 的手机，并把 ${charName} 列表里的联系人 "${contactName}" 给删除了！]`,
                timestamp: Date.now(),
                hidden: true
            });
            ChatDB.setItem(`chat_history_${currentLoginId}_${currentChatRoomCharId}`, JSON.stringify(mainHistory));
            if (typeof renderChatHistory === 'function') renderChatHistory(currentChatRoomCharId);
        }
        // 👆 修改结束 👆

        renderPwaContactList();
        closeContactActionModal();
    }
}

function shareContact() {
    alert('名片已复制到剪贴板！(模拟分享)');
    closeContactActionModal();
}

function editContactDesc() {
    let data = JSON.parse(ChatDB.getItem(`pwa_contact_list_${currentChatRoomCharId}`) || '[]');
    const contact = data[currentActionContactIndex];
    if (!contact) return;

    const newDesc = prompt(`请输入 [${contact.name}] 的新简介：`, contact.desc);
    if (newDesc !== null) {
        contact.desc = newDesc.trim();
        ChatDB.setItem(`pwa_contact_list_${currentChatRoomCharId}`, JSON.stringify(data));
        renderPwaContactList();
        closeContactActionModal();
    }
}

function chatWithContact() {
    let contactData = JSON.parse(ChatDB.getItem(`pwa_contact_list_${currentChatRoomCharId}`) || '[]');
    const contact = contactData[currentActionContactIndex];
    if (!contact) return;

    let chatData = JSON.parse(ChatDB.getItem(`pwa_chat_list_${currentChatRoomCharId}`) || '[]');
    
    // 查找是否已有该联系人的聊天记录
    let chatIndex = chatData.findIndex(c => c.name === contact.name);
    
    if (chatIndex === -1) {
        // 如果没有，新建一个空的会话
        chatData.unshift({
            name: contact.name,
            type: contact.type,
            lastMsg: "点击开始聊天...",
            history: []
        });
        ChatDB.setItem(`pwa_chat_list_${currentChatRoomCharId}`, JSON.stringify(chatData));
        chatIndex = 0; // 新建的在最前面
        renderPwaChatList(); // 刷新聊天列表
    }

    closeContactActionModal();
    switchPwaTab('chat'); // 切换到聊天 Tab
    openPwaChatRoom(chatIndex); // 打开聊天室
}

// ==========================================
// 聊天详情页逻辑 (带交互)
// ==========================================
let currentPwaChatIndex = null;

function openPwaChatRoom(index) {
    currentPwaChatIndex = index;
    const data = JSON.parse(ChatDB.getItem(`pwa_chat_list_${currentChatRoomCharId}`) || '[]');
    const chatData = data[index];
    if (!chatData) return;

    document.getElementById('pwaChatRoomTitle').innerText = chatData.name;
    renderPwaChatRoomHistory();

    document.getElementById('pwaChatRoom').classList.add('show');
}

function closePwaChatRoom() {
    document.getElementById('pwaChatRoom').classList.remove('show');
    document.getElementById('pwaMorePanel').classList.remove('show');
    pwaExitMultiSelectMode();
}

function renderPwaChatRoomHistory() {
    const data = JSON.parse(ChatDB.getItem(`pwa_chat_list_${currentChatRoomCharId}`) || '[]');
    const chatData = data[currentPwaChatIndex];
    if (!chatData) return;

    const historyEl = document.getElementById('pwaChatRoomHistory');
    historyEl.innerHTML = '';

    chatData.history.forEach((msg, idx) => {
        const wrap = document.createElement('div');
        wrap.className = 'pwa-chat-bubble-wrap';
        wrap.onclick = () => {
            if (isPwaMultiSelecting) togglePwaMsgSelection(idx, wrap);
        };

        const checkboxHtml = `<input type="checkbox" class="pwa-msg-checkbox" value="${idx}">`;
        
        const bubble = document.createElement('div');
        bubble.className = `pwa-chat-bubble ${msg.role === 'me' ? 'pwa-chat-right' : 'pwa-chat-left'}`;
        bubble.innerText = msg.content;
        
        if (msg.role === 'me') {
            wrap.style.justifyContent = 'flex-end';
            wrap.innerHTML = checkboxHtml + bubble.outerHTML;
        } else {
            wrap.style.justifyContent = 'flex-start';
            wrap.innerHTML = checkboxHtml + bubble.outerHTML;
        }

        historyEl.appendChild(wrap);
    });

    setTimeout(() => { historyEl.scrollTop = historyEl.scrollHeight; }, 100);
}

// 发送消息
function sendPwaChatMessage() {
    const inputEl = document.getElementById('pwaChatRoomInput');
    const content = inputEl.value.trim();
    if (!content || currentPwaChatIndex === null) return;

    let data = JSON.parse(ChatDB.getItem(`pwa_chat_list_${currentChatRoomCharId}`) || '[]');
    let chatData = data[currentPwaChatIndex];
    
    chatData.history.push({ role: 'me', content: content });
    chatData.lastMsg = content;
    
    // 移到最前面
    data.splice(currentPwaChatIndex, 1);
    data.unshift(chatData);
    currentPwaChatIndex = 0;

    ChatDB.setItem(`pwa_chat_list_${currentChatRoomCharId}`, JSON.stringify(data));
    
    // 👇 修改：同步感知逻辑 (明确 User 和 Char 的名字) 👇
    const currentLoginId = ChatDB.getItem('current_login_account');
    if (currentLoginId && currentChatRoomCharId) {
        let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
        const account = accounts.find(a => a.id === currentLoginId);
        const userName = account ? (account.netName || 'User') : 'User';

        let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
        const char = chars.find(c => c.id === currentChatRoomCharId);
        const charName = char ? char.name : 'Ta';

        let mainHistory = JSON.parse(ChatDB.getItem(`chat_history_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
        mainHistory.push({
            role: 'system',
            type: 'system',
            content: `[系统内部信息(仅AI可见)：${userName}(User) 偷偷拿到了 ${charName} 的手机，并以 ${charName} 的名义，给联系人 "${chatData.name}" 发送了消息：“${content}”]`,
            timestamp: Date.now(),
            hidden: true // 设为隐藏，只有 AI 能看到，保持沉浸感
        });
        ChatDB.setItem(`chat_history_${currentLoginId}_${currentChatRoomCharId}`, JSON.stringify(mainHistory));
        if (typeof renderChatHistory === 'function') renderChatHistory(currentChatRoomCharId);
    }
    // 👆 修改结束 👆

    inputEl.value = '';
    document.getElementById('pwaMorePanel').classList.remove('show');
    renderPwaChatRoomHistory();
    renderPwaChatList();
}

// API 回复
async function generatePwaApiReply() {
    if (currentPwaChatIndex === null) return;
    
    const apiConfig = JSON.parse(ChatDB.getItem('current_api_config') || '{}');
    if (!apiConfig.url || !apiConfig.key || !apiConfig.model) return alert('请先配置 API！');

    let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
    const char = chars.find(c => c.id === currentChatRoomCharId);
    if (!char) return;

    let data = JSON.parse(ChatDB.getItem(`pwa_chat_list_${currentChatRoomCharId}`) || '[]');
    let chatData = data[currentPwaChatIndex];
    
    // 构建 Prompt
    let prompt = `你现在正在扮演角色：${char.name}。\n`;
    prompt += `你正在使用你的手机微信，和你的联系人 "${chatData.name}" 聊天。\n`;
    prompt += `以下是你们最近的聊天记录：\n`;
    
    const recentHistory = chatData.history.slice(-20).map(m => `${m.role === 'me' ? char.name : chatData.name}: ${m.content}`).join('\n');
    prompt += recentHistory + '\n\n';
    
    prompt += `请以 ${char.name} 的身份，回复 ${chatData.name}。只输出回复的文本内容，不要包含任何其他格式或角色名字前缀。`;

    showToast('正在生成回复...', 'loading');

    try {
        const response = await fetch(`${apiConfig.url.replace(/\/$/, '')}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({ model: apiConfig.model, messages: [{ role: 'user', content: prompt }], temperature: 0.8 })
        });

        if (response.ok) {
            const resData = await response.json();
            let replyRaw = resData.choices[0].message.content.trim();
            
            chatData.history.push({ role: 'me', content: replyRaw });
            chatData.lastMsg = replyRaw;
            
            data.splice(currentPwaChatIndex, 1);
            data.unshift(chatData);
            currentPwaChatIndex = 0;

            ChatDB.setItem(`pwa_chat_list_${currentChatRoomCharId}`, JSON.stringify(data));
            renderPwaChatRoomHistory();
            renderPwaChatList();
            hideToast();
        } else {
            throw new Error('API 请求失败');
        }
    } catch (e) {
        hideToast();
        alert('生成失败，请检查 API 配置或重试。');
    }
}

// 更多面板
function togglePwaMorePanel() {
    document.getElementById('pwaMorePanel').classList.toggle('show');
}

// 重回
function pwaActionRoll() {
    document.getElementById('pwaMorePanel').classList.remove('show');
    if (currentPwaChatIndex === null) return;
    
    let data = JSON.parse(ChatDB.getItem(`pwa_chat_list_${currentChatRoomCharId}`) || '[]');
    let chatData = data[currentPwaChatIndex];
    
    // 找到最后一条 other 的消息
    let lastOtherIndex = -1;
    for (let i = chatData.history.length - 1; i >= 0; i--) {
        if (chatData.history[i].role === 'other') {
            lastOtherIndex = i;
            break;
        }
    }
    
    if (lastOtherIndex !== -1) {
        chatData.history = chatData.history.slice(0, lastOtherIndex + 1);
        ChatDB.setItem(`pwa_chat_list_${currentChatRoomCharId}`, JSON.stringify(data));
        renderPwaChatRoomHistory();
        generatePwaApiReply();
    } else {
        alert('没有找到对方的消息，无法重回！');
    }
}

// 多选
let isPwaMultiSelecting = false;
let pwaSelectedMsgIndices = [];

function pwaActionMultiSelect() {
    document.getElementById('pwaMorePanel').classList.remove('show');
    isPwaMultiSelecting = true;
    pwaSelectedMsgIndices = [];
    
    document.getElementById('pwaChatRoomHistory').classList.add('is-pwa-multi-selecting');
    document.getElementById('pwaChatRoomBottomBar').style.display = 'none';
    document.getElementById('pwaMultiActionBar').classList.add('show');
}

function pwaExitMultiSelectMode() {
    isPwaMultiSelecting = false;
    pwaSelectedMsgIndices = [];
    
    document.getElementById('pwaChatRoomHistory').classList.remove('is-pwa-multi-selecting');
    document.getElementById('pwaChatRoomBottomBar').style.display = 'flex';
    document.getElementById('pwaMultiActionBar').classList.remove('show');
    
    document.querySelectorAll('.pwa-msg-checkbox').forEach(cb => cb.checked = false);
}

function togglePwaMsgSelection(index, wrapEl) {
    const cb = wrapEl.querySelector('.pwa-msg-checkbox');
    if (pwaSelectedMsgIndices.includes(index)) {
        pwaSelectedMsgIndices = pwaSelectedMsgIndices.filter(i => i !== index);
        cb.checked = false;
    } else {
        pwaSelectedMsgIndices.push(index);
        cb.checked = true;
    }
}

function pwaBatchDeleteMessages() {
    if (pwaSelectedMsgIndices.length === 0) return alert('请先选择消息！');
    if (confirm(`确定删除选中的 ${pwaSelectedMsgIndices.length} 条消息吗？`)) {
        let data = JSON.parse(ChatDB.getItem(`pwa_chat_list_${currentChatRoomCharId}`) || '[]');
        let chatData = data[currentPwaChatIndex];
        
        pwaSelectedMsgIndices.sort((a, b) => b - a).forEach(idx => {
            chatData.history.splice(idx, 1);
        });
        
        if (chatData.history.length > 0) {
            chatData.lastMsg = chatData.history[chatData.history.length - 1].content;
        } else {
            chatData.lastMsg = '点击开始聊天...';
        }
        
        ChatDB.setItem(`pwa_chat_list_${currentChatRoomCharId}`, JSON.stringify(data));
        pwaExitMultiSelectMode();
        renderPwaChatRoomHistory();
        renderPwaChatList();
    }
}
