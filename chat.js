// ==========================================
// Chat 模块专属逻辑 (chat.js)
// ==========================================

// --- 面板开关逻辑 ---
const chatPanel = document.getElementById('chatPanel');
const personaPanel = document.getElementById('personaPanel');
const wechatPanel = document.getElementById('wechatPanel');

// 点击桌面 Chat 图标时触发
function openChatPanel() {
    const currentLoginId = ChatDB.getItem('current_login_account');
    if (currentLoginId) {
        // 如果已经登录，直接打开微信界面
        wechatPanel.style.display = 'flex';
        renderMePage();
        renderChatList(); // 新增：渲染聊天列表
        renderContactList(); // 新增：渲染通讯录
    } else {
        // 如果未登录，打开注册/登录界面
        chatPanel.style.display = 'flex';
    }
}


function closeChatPanel() {
    chatPanel.style.display = 'none';
    document.getElementById('chatPresetPopup').classList.remove('show');
}

// 微信界面的 Back 按钮：直接隐藏面板回到桌面，不退出登录！
function closeWechatPanel() {
    wechatPanel.style.display = 'none';
}

// ==========================================
// 人设面具 编辑与保存逻辑
// ==========================================
let currentEditingPersonaId = null; // 全局变量：记录当前正在编辑的面具ID

// 1. 新建面具 (从注册弹窗进入)
function openPersonaPanel() {
    document.getElementById('chatPresetPopup').classList.remove('show');
    currentEditingPersonaId = null; // 标记为新建模式
    
    // 清空表单
    document.getElementById('pIdInput').value = '';
    document.getElementById('pSexInput').value = '';
    document.getElementById('pPersonaInput').value = '';
    document.getElementById('pAvatarUpload').style.backgroundImage = '';
    document.getElementById('pAvatarUpload').innerText = '上传头像';

    personaPanel.style.display = 'flex';
}

function closePersonaPanel() {
    personaPanel.style.display = 'none';
}

// 2. 编辑当前面具 (从微信主页 Edit 进入)
function editCurrentPersona() {
    const currentLoginId = ChatDB.getItem('current_login_account');
    if (!currentLoginId) return;
    
    let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
    const account = accounts.find(a => a.id === currentLoginId);
    if (!account) return;

    let personas = JSON.parse(ChatDB.getItem('chat_personas') || '[]');
    const persona = personas.find(p => p.id === account.personaId);
    if (!persona) return alert('未找到绑定的面具信息！');

    // 标记为编辑模式，记录当前面具ID
    currentEditingPersonaId = persona.id;

    // 将面具数据回显到表单中
    document.getElementById('pIdInput').value = persona.realName || '';
    document.getElementById('pSexInput').value = persona.sex || '';
    document.getElementById('pPersonaInput').value = persona.persona || '';
    
    const avatarUpload = document.getElementById('pAvatarUpload');
    if (persona.avatarUrl) {
        avatarUpload.style.backgroundImage = `url(${persona.avatarUrl})`;
        avatarUpload.innerText = '';
    } else {
        avatarUpload.style.backgroundImage = '';
        avatarUpload.innerText = '上传头像';
    }

    personaPanel.style.display = 'flex';
}

// 3. 保存面具 (支持新建和更新)
function savePersona() {
    const realName = document.getElementById('pIdInput').value.trim() || '未命名';
    const sex = document.getElementById('pSexInput').value.trim();
    const personaText = document.getElementById('pPersonaInput').value.trim();
    const avatarBg = document.getElementById('pAvatarUpload').style.backgroundImage;
    
    let avatarUrl = '';
    if (avatarBg && avatarBg !== 'none') {
        avatarUrl = avatarBg.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
    }

    let personas = JSON.parse(ChatDB.getItem('chat_personas') || '[]');

    if (currentEditingPersonaId) {
        // 编辑模式：找到并更新现有面具
        const index = personas.findIndex(p => p.id === currentEditingPersonaId);
        if (index !== -1) {
            personas[index].realName = realName;
            personas[index].sex = sex;
            personas[index].persona = personaText;
            personas[index].avatarUrl = avatarUrl;
        }
    } else {
        // 新建模式：创建新面具
        const newPersona = {
            id: Date.now().toString(),
            realName: realName,
            sex: sex,
            persona: personaText,
            avatarUrl: avatarUrl
        };
        personas.push(newPersona);
    }

    ChatDB.setItem('chat_personas', JSON.stringify(personas));
    closePersonaPanel();

    // 如果当前停留在微信主页，保存后立即刷新页面数据
    if (document.getElementById('wechatPanel').style.display === 'flex') {
        renderMePage();
    }
}

// --- 注册/登录页面切换逻辑 ---
const chatRegisterContainer = document.getElementById('chatRegisterContainer');
const chatLoginContainer = document.getElementById('chatLoginContainer');
const chatHeaderTitle = document.getElementById('chatHeaderTitle');

function switchChatMode(mode) {
    if (mode === 'login') {
        chatRegisterContainer.style.display = 'none';
        chatLoginContainer.style.display = 'flex';
        chatHeaderTitle.innerHTML = 'Login';
    } else {
        chatLoginContainer.style.display = 'none';
        chatRegisterContainer.style.display = 'flex';
        chatHeaderTitle.innerHTML = 'Sign Up';
    }
}

// ==========================================
// 气泡弹窗与列表渲染逻辑
// ==========================================
const chatPresetPopup = document.getElementById('chatPresetPopup');
let isChatPresetEditing = false;
let currentPopupMode = 'register'; // 'register' 或 'login'
let currentSelectedPersonaId = null; // 注册时选中的面具ID

// 修改：点击注册区的面具绑定，或者登录区的头像，都会触发此函数
function toggleChatPresetPopup(mode = 'register') {
    currentPopupMode = mode;
    chatPresetPopup.classList.toggle('show');
    
    if (chatPresetPopup.classList.contains('show')) {
        isChatPresetEditing = false;
        chatPresetPopup.classList.remove('is-editing');
        document.getElementById('chatPresetEditBtn').innerText = 'Edit';
        
        // 根据模式修改弹窗标题
        const headerTitle = document.querySelector('#chatPresetPopup .preset-header span:first-child');
        if (mode === 'login') {
            headerTitle.innerText = '已绑定账号';
            document.querySelector('#chatPresetPopup .preset-footer').style.display = 'none'; // 登录时不显示创建面具
        } else {
            headerTitle.innerText = '用户面具';
            document.querySelector('#chatPresetPopup .preset-footer').style.display = 'flex';
        }
        
        renderChatPersonas(); // 刷新列表
    }
}

function toggleChatPresetEditMode(e) {
    e.stopPropagation();
    isChatPresetEditing = !isChatPresetEditing;
    const editBtn = document.getElementById('chatPresetEditBtn');
    if (isChatPresetEditing) {
        chatPresetPopup.classList.add('is-editing');
        editBtn.innerText = 'Done';
    } else {
        chatPresetPopup.classList.remove('is-editing');
        editBtn.innerText = 'Edit';
    }
}

// 渲染列表 (区分注册和登录)
function renderChatPersonas() {
    const listEl = document.getElementById('chatPresetList');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (currentPopupMode === 'register') {
        // 注册模式：显示所有面具
        let personas = JSON.parse(ChatDB.getItem('chat_personas') || '[]');
        if (personas.length === 0) {
            listEl.innerHTML = '<div style="padding: 15px; text-align: center; color: #aaa; font-size: 12px;">暂无面具，请先创建</div>';
            return;
        }
        personas.forEach(p => {
            const item = document.createElement('div');
            item.className = 'preset-item';
            item.onclick = () => selectMaskForRegister(p);
            item.innerHTML = `
                <span class="preset-item-name">真名: ${p.realName}</span>
                <div class="preset-delete-btn" onclick="deletePersona('${p.id}', event)">-</div>
            `;
            listEl.appendChild(item);
        });
    } else {
        // 登录模式：显示已绑定的账号
        let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
        if (accounts.length === 0) {
            listEl.innerHTML = '<div style="padding: 15px; text-align: center; color: #aaa; font-size: 12px;">暂无已绑定的账号</div>';
            return;
        }
        accounts.forEach(acc => {
            const item = document.createElement('div');
            item.className = 'preset-item';
            item.onclick = () => selectAccountForLogin(acc);
            item.innerHTML = `
                <span class="preset-item-name">网名: ${acc.netName}</span>
                <div class="preset-delete-btn" onclick="deleteAccount('${acc.id}', event)">-</div>
            `;
            listEl.appendChild(item);
        });
    }
}

// 注册时选择面具
function selectMaskForRegister(persona) {
    if (isChatPresetEditing) return;
    currentSelectedPersonaId = persona.id;
    
    const avatarEl = document.getElementById('regSelectedAvatar');
    if (persona.avatarUrl) {
        avatarEl.style.backgroundImage = `url(${persona.avatarUrl})`;
        avatarEl.innerHTML = ''; 
    } else {
        avatarEl.style.backgroundImage = 'none';
        avatarEl.style.backgroundColor = '#333'; 
        avatarEl.innerHTML = '';
    }
    document.getElementById('regSelectedName').innerText = '已绑定: ' + persona.realName;
    chatPresetPopup.classList.remove('show');
}

// 登录时选择账号
function selectAccountForLogin(account) {
    if (isChatPresetEditing) return;
    
    // 填充头像和网名
    const avatarEl = document.getElementById('loginSelectedAvatar');
    if (account.avatarUrl) {
        avatarEl.style.backgroundImage = `url(${account.avatarUrl})`;
        avatarEl.innerHTML = ''; 
    } else {
        avatarEl.style.backgroundImage = 'none';
        avatarEl.style.backgroundColor = '#333'; 
        avatarEl.innerHTML = '';
    }
    document.getElementById('loginSelectedName').innerText = account.netName;
    
    // 填充账号密码
    document.getElementById('loginAccount').value = account.account;
    document.getElementById('loginPassword').value = account.password;
    
    chatPresetPopup.classList.remove('show');
}

// 删除面具
function deletePersona(id, e) {
    e.stopPropagation();
    if (confirm('确定要删除这个面具吗？')) {
        let personas = JSON.parse(ChatDB.getItem('chat_personas') || '[]');
        personas = personas.filter(p => p.id !== id);
        ChatDB.setItem('chat_personas', JSON.stringify(personas));
        renderChatPersonas();
    }
}

// 删除账号
function deleteAccount(id, e) {
    e.stopPropagation();
    if (confirm('确定要删除这个账号记录吗？')) {
        let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
        accounts = accounts.filter(a => a.id !== id);
        ChatDB.setItem('chat_accounts', JSON.stringify(accounts));
        renderChatPersonas();
    }
}

// 点击空白处关闭弹窗
document.addEventListener('click', (e) => {
    const bindContainers = document.querySelectorAll('.mask-bind-container');
    let clickedOnBind = false;
    bindContainers.forEach(el => { if (el.contains(e.target)) clickedOnBind = true; });
    
    if (chatPresetPopup && chatPresetPopup.classList.contains('show') && 
        !chatPresetPopup.contains(e.target) && 
        chatHeaderTitle && !chatHeaderTitle.contains(e.target) && 
        !clickedOnBind) {
        chatPresetPopup.classList.remove('show');
    }
});

// ==========================================
// 注册/登录 提交与持久化逻辑
// ==========================================

function enterWechat(accountId) {
    if (accountId) {
        ChatDB.setItem('current_login_account', accountId); // 保存登录状态
    }
    chatPanel.style.display = 'none';
    wechatPanel.style.display = 'flex';
    renderMePage(); // 渲染个人主页数据
}

// 渲染个人主页 (Me)
function renderMePage() {
    const currentLoginId = ChatDB.getItem('current_login_account');
    if (!currentLoginId) return;
    
    let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
    const account = accounts.find(a => a.id === currentLoginId);
    if (!account) return;

    // 填充网名
    document.getElementById('meName').innerText = account.netName || '未命名';
    const meNameTop = document.getElementById('meNameTop');
    if(meNameTop) meNameTop.innerText = account.netName || '未命名';
    
    // 填充账号 (作为编号)
    const accountNoEl = document.getElementById('meAccountNo');
    if(accountNoEl) accountNoEl.innerText = account.account || '0000000';
    
    // 填充个性签名
    const signEl = document.getElementById('meSign');
    if(signEl) signEl.innerText = account.signature || '这个人很懒，什么都没写~';
    
    // 填充头像
    const avatarEl = document.getElementById('meAvatar');
    if (account.avatarUrl) {
        avatarEl.style.backgroundImage = `url(${account.avatarUrl})`;
    } else {
        avatarEl.style.backgroundImage = 'none';
    }
}

// 编辑网名
function editMeName() {
    const currentLoginId = ChatDB.getItem('current_login_account');
    if (!currentLoginId) return;

    let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
    const accountIndex = accounts.findIndex(a => a.id === currentLoginId);
    if (accountIndex === -1) return;

    const currentName = accounts[accountIndex].netName || '';
    const newName = prompt('请输入新的网名：', currentName);
    
    if (newName !== null && newName.trim() !== '') {
        accounts[accountIndex].netName = newName.trim();
        ChatDB.setItem('chat_accounts', JSON.stringify(accounts));
        
        // 更新 UI
        document.getElementById('meName').innerText = newName.trim();
        const meNameTop = document.getElementById('meNameTop');
        if(meNameTop) meNameTop.innerText = newName.trim();
    }
}

// 编辑个性签名
function editMeSign() {
    const currentLoginId = ChatDB.getItem('current_login_account');
    if (!currentLoginId) return;

    let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
    const accountIndex = accounts.findIndex(a => a.id === currentLoginId);
    if (accountIndex === -1) return;

    const currentSign = accounts[accountIndex].signature || '';
    const newSign = prompt('请输入新的个性签名：', currentSign);
    
    if (newSign !== null) {
        accounts[accountIndex].signature = newSign.trim();
        ChatDB.setItem('chat_accounts', JSON.stringify(accounts));
        const signEl = document.getElementById('meSign');
        if(signEl) signEl.innerText = newSign.trim() || '这个人很懒，什么都没写~';
    }
}


// 每秒更新一次时间
setInterval(() => {
    if (document.getElementById('tab-me').style.display === 'flex') {
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        const timeEl = document.getElementById('meCurrentTime');
        if(timeEl) timeEl.innerText = timeStr;
    }
}, 1000);

// 注册逻辑
const doRegisterBtn = document.getElementById('doRegisterBtn');
if (doRegisterBtn) {
    doRegisterBtn.addEventListener('click', () => {
        if (!currentSelectedPersonaId) return alert('请先点击上方选择要绑定的面具！');
        
        const netName = document.getElementById('regNetName').value.trim();
        const account = document.getElementById('regAccount').value.trim();
        const password = document.getElementById('regPassword').value.trim();
        const isAgreed = document.getElementById('regAgreement').checked;
        
        if (!netName || !account || !password) return alert('请填写完整的注册信息！');
        if (!isAgreed) return alert('请先阅读并勾选同意服务协议！');
        
        const personas = JSON.parse(ChatDB.getItem('chat_personas') || '[]');
        const persona = personas.find(p => p.id === currentSelectedPersonaId);
        
        const newAccount = {
            id: Date.now().toString(),
            personaId: currentSelectedPersonaId,
            netName: netName,
            account: account,
            password: password,
            avatarUrl: persona ? persona.avatarUrl : ''
        };
        
        let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
        accounts.push(newAccount);
        ChatDB.setItem('chat_accounts', JSON.stringify(accounts));
        
        alert('注册成功！已为您绑定面具并自动登录。');
        enterWechat(newAccount.id); // 注册完直接登录
    });
}

// 登录逻辑
const doLoginBtn = document.getElementById('doLoginBtn');
if (doLoginBtn) {
    doLoginBtn.addEventListener('click', () => {
        const account = document.getElementById('loginAccount').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        
        if (!account || !password) return alert('请输入账号和密码！');
        
        let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
        const validAccount = accounts.find(a => a.account === account && a.password === password);
        
        if (validAccount) {
            enterWechat(validAccount.id);
        } else {
            alert('账号或密码错误！');
        }
    });
}

// ==========================================
// 设置与切换账号面板 (学生证样式)
// ==========================================
const switchAccountPanel = document.getElementById('switchAccountPanel');

function openSwitchAccountPanel() {
    switchAccountPanel.style.display = 'flex';
    renderAccountCards();
}

function closeSwitchAccountPanel() {
    switchAccountPanel.style.display = 'none';
}

function logoutWechat() {
    if (confirm('确定要退出当前登录吗？')) {
        // 清除登录状态
        ChatDB.removeItem('current_login_account');
        
        // 关闭面板，回到登录页
        switchAccountPanel.style.display = 'none';
        document.getElementById('wechatPanel').style.display = 'none';
        document.getElementById('chatPanel').style.display = 'flex';
        switchChatMode('login');
    }
}

function renderAccountCards() {
    const listEl = document.getElementById('accountCardList');
    listEl.innerHTML = '';
    
    let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
    let personas = JSON.parse(ChatDB.getItem('chat_personas') || '[]');
    const currentLoginId = ChatDB.getItem('current_login_account');

    if (accounts.length === 0) {
        listEl.innerHTML = '<div style="text-align: center; color: #aaa; font-size: 13px; margin-top: 20px;">暂无绑定的账号</div>';
        return;
    }

    accounts.forEach(acc => {
        const isCurrent = acc.id === currentLoginId;
        
        // 将账号的 id (时间戳) 转换为可读的日期格式
        const createDate = new Date(parseInt(acc.id));
        const dateString = createDate.getFullYear() + '-' + 
                           String(createDate.getMonth() + 1).padStart(2, '0') + '-' + 
                           String(createDate.getDate()).padStart(2, '0') + ' ' + 
                           String(createDate.getHours()).padStart(2, '0') + ':' + 
                           String(createDate.getMinutes()).padStart(2, '0');

        const card = document.createElement('div');
        card.className = `student-card-wrapper ${isCurrent ? 'is-current' : ''}`;
        
        // 点击卡片切换账号
        card.onclick = () => {
            if (!isCurrent) {
                ChatDB.setItem('current_login_account', acc.id);
                renderMePage(); // 刷新个人主页数据
                closeSwitchAccountPanel();
                alert(`已切换至账号: ${acc.netName}`);
            }
        };

        card.innerHTML = `
            <div class="student-card-inner">
                <div class="sc-avatar" style="background-image: url('${acc.avatarUrl || ''}');"></div>
                <div class="sc-info">
                    <div class="sc-row">
                        <!-- 用户图标 -->
                        <svg class="sc-icon" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                        <span class="sc-text">@${acc.netName}</span>
                    </div>
                    <div class="sc-row">
                        <!-- 时钟图标 -->
                        <svg class="sc-icon" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                        <span class="sc-text italic">${dateString}</span>
                    </div>
                    <div class="sc-row">
                        <!-- 账号/ID卡图标 -->
                        <svg class="sc-icon" viewBox="0 0 24 24"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zm-9-2h8v-2h-8v2zm0-4h8v-2h-8v2zm0-4h8V7h-8v2zM5 15h4v-2H5v2zm0-4h4V9H5v2zm0-4h4V5H5v2z"/></svg>
                        <span class="sc-text">Account: ${acc.account}</span>
                    </div>
                </div>
            </div>
        `;
        listEl.appendChild(card);
    });
}

// ==========================================
// 人设编辑页 头像与ID同步逻辑
// ==========================================
function triggerPersonaAvatarUpload() { document.getElementById('pAvatarInput').click(); }

function handlePersonaAvatarChange(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imgUrl = `url(${e.target.result})`;
            const squareAvatar = document.getElementById('pAvatarUpload');
            squareAvatar.style.backgroundImage = imgUrl;
            squareAvatar.innerText = ''; 
            squareAvatar.style.border = 'none';
            document.getElementById('pAvatarFloat').style.backgroundImage = imgUrl;
        }
        reader.readAsDataURL(file);
    }
}

function syncPersonaId() {
    const inputVal = document.getElementById('pIdInput').value;
    document.getElementById('pIdFloat').innerText = 'Real Name: ' + (inputVal || '未命名');
}
// ==========================================
// Wechat 界面交互逻辑
// ==========================================
// 切换底部 Tab
function switchWechatTab(tabName) {
    // 1. 隐藏所有 tab 内容
    document.querySelectorAll('.wechat-tab-content').forEach(el => {
        el.style.display = 'none';
    });
    
    // 2. 移除所有 nav item 的 active 状态
    document.querySelectorAll('.wechat-nav-item').forEach(el => {
        el.classList.remove('active');
    });

    // 3. 显示目标 tab 内容
    document.getElementById('tab-' + tabName).style.display = 'flex';
    
    // 4. 激活对应的 nav item 并修改顶部标题
    const navItems = document.querySelectorAll('.wechat-nav-item');
    let title = 'Chat';
    
    if (tabName === 'chat') { 
        navItems[0].classList.add('active'); 
        title = 'Chat'; 
        if (typeof renderChatList === 'function') renderChatList(); // 每次切回聊天列表强制刷新
    } else if (tabName === 'contacts') { 
        navItems[1].classList.add('active'); 
        title = 'Contacts'; 
        if (typeof renderContactList === 'function') renderContactList(); // 每次切回通讯录强制刷新
    } else if (tabName === 'moment') { 
        navItems[2].classList.add('active'); 
        title = 'Moment'; 
    } else if (tabName === 'me') { 
        navItems[3].classList.add('active'); 
        title = 'Me'; 
    }
    // 更新顶部悬浮胶囊标题
    document.getElementById('wechatHeaderTitle').innerText = title;
    
    // 根据 Tab 切换右上角按钮
    const rightBtn = document.getElementById('wechatHeaderRightBtn');
    const searchBtn = document.getElementById('wechatSearchBtn'); // 获取搜索按钮
    
    if (tabName === 'chat') {
        rightBtn.innerText = '';
        rightBtn.onclick = null;
        rightBtn.style.visibility = 'hidden';
        if (searchBtn) searchBtn.style.display = 'flex'; // Chat 页面显示搜索按钮
    } else if (tabName === 'me') {
        rightBtn.innerText = 'Edit';
        rightBtn.onclick = editCurrentPersona;
        rightBtn.style.visibility = 'visible';
        if (searchBtn) searchBtn.style.display = 'none'; // 其他页面隐藏搜索按钮
    } else {
        rightBtn.innerText = '';
        rightBtn.onclick = null;
        rightBtn.style.visibility = 'hidden';
        if (searchBtn) searchBtn.style.display = 'none'; // 其他页面隐藏搜索按钮
    }
}

// ==========================================
// 角色库 (Char Library) 逻辑
// ==========================================
function openCharLibraryPanel() {
    document.getElementById('charLibraryPanel').style.display = 'flex';
    renderCharLibrary(); // 每次打开都重新读取并渲染
}

function closeCharLibraryPanel() {
    document.getElementById('charLibraryPanel').style.display = 'none';
}

function renderCharLibrary() {
    const listEl = document.getElementById('charLibraryList');
    if (!listEl) return;
    listEl.innerHTML = '';
    
    // 将容器改为单列布局
    listEl.style.display = 'flex';
    listEl.style.flexDirection = 'column';
    listEl.style.gap = '20px';
    
    let allChars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
    // 默认分组显示全部，其他分组进行过滤
    let chars = currentCharGroupFilter === '默认分组' ? allChars : allChars.filter(c => c.group === currentCharGroupFilter);
    
    if (chars.length === 0) {
        listEl.innerHTML = '<div style="text-align: center; color: #aaa; font-size: 13px; margin-top: 40px;">暂无角色，点击右上角 Create 创建</div>';
        return;
    }

    chars.forEach(char => {
        // 格式化创建时间
        const createDate = new Date(parseInt(char.id));
        const dateStr = `${createDate.getFullYear()}.${String(createDate.getMonth()+1).padStart(2,'0')}.${String(createDate.getDate()).padStart(2,'0')}`;

        const card = document.createElement('div');
        card.className = 'char-id-card';
        card.innerHTML = `
            <div class="id-card-bg">PERSONAL INFORMATION</div>
            <div class="id-card-content">
                <div class="id-card-left">
                    <div class="id-section">
                        <div class="id-title"><span>01</span> 创建DATE #</div>
                        <div class="id-text">${dateStr}</div>
                    </div>
                    <div class="id-section">
                        <div class="id-title"><span>04</span> 分组GROUP #</div>
                        <div class="id-text">${char.group || '默认分组'}</div>
                    </div>
                </div>
                
                <div class="id-card-center">
                    <div class="id-avatar-wrap">
                        <div class="id-avatar" style="background-image: url('${char.avatarUrl || ''}');"></div>
                    </div>
                    <div class="id-name-wrap">
                        <svg class="quote-icon" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/></svg>
                        <span class="id-name-text">${char.name}</span>
                        <svg class="quote-icon" viewBox="0 0 24 24"><path d="M9.983 3v7.391c0 5.704-3.731 9.57-8.983 10.609l-.995-2.151c2.432-.917 3.995-3.638 3.995-5.849h-4v-10h9.983zm14.017 0v7.391c0 5.704-3.748 9.57-9 10.609l-.996-2.151c2.433-.917 3.996-3.638 3.996-5.849h-3.983v-10h9.983z"/></svg>
                    </div>
                </div>
                
                <div class="id-card-right">
                    <div class="id-section" style="align-items: flex-end;">
                        <div class="id-title"><span>02</span> 性别SEX #</div>
                        <div class="id-text" style="text-align: right;">${char.sex || '未知'}</div>
                    </div>
                    <div class="id-section" style="align-items: flex-end;">
                        <div class="id-title"><span>03</span> 场景SCENE #</div>
                        <div class="id-text line-clamp-2" style="text-align: right;">${char.scenario || '暂无场景'}</div>
                    </div>
                </div>
            </div>
            <div class="id-card-bottom" style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; font-style: normal; padding-left: 15px; padding-right: 15px;">
                <div onclick="event.stopPropagation(); openSecretModal('${char.id}')" class="p-capsule black" style="cursor: pointer; font-size: 12px; padding: 6px 18px; display: inline-block; letter-spacing: 1px; background-color: #111;">查看（Check）</div>
                <div onclick="event.stopPropagation(); deleteChar('${char.id}')" class="p-capsule black" style="cursor: pointer; font-size: 12px; padding: 6px 18px; display: inline-block; letter-spacing: 1px; background-color: #888;">删除（Delete）</div>
            </div>
        `;

        // 点击整个卡片直接进入全屏编辑页面
        card.onclick = () => {
            openCharEditPanel(char.id);
        };
        listEl.appendChild(card);
    });
}

// --- 角色编辑面板逻辑 ---
let currentEditingCharId = null; // 全局变量：记录当前正在编辑的角色ID
let currentSelectedWbEntries = []; // 记录当前选中的世界书条目 ID

function openCharEditPanel(charId = null) {
    currentEditingCharId = charId; 
    currentSelectedWbEntries = [];
    
    document.getElementById('charNameInput').value = '';
    document.getElementById('charSexInput').value = '';
    document.getElementById('charDescInput').value = '';
    document.getElementById('charFirstMsgInput').value = '';
    document.getElementById('charScenarioInput').value = '';
    document.getElementById('charWbSelectText').innerText = '未绑定...';
    
    const avatarUpload = document.getElementById('charAvatarUpload');
    avatarUpload.style.backgroundImage = '';
    avatarUpload.innerText = '上传头像';
    
    if (typeof renderCharGroups === 'function') renderCharGroups();
    document.getElementById('char-edit-header-group').innerText = typeof currentCharGroupFilter !== 'undefined' ? currentCharGroupFilter : '默认分组';

    if (charId) {
        let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
        const char = chars.find(c => c.id === charId);
        if (char) {
            document.getElementById('charNameInput').value = char.name || '';
            document.getElementById('charSexInput').value = char.sex || '';
            document.getElementById('charDescInput').value = char.description || '';
            document.getElementById('charFirstMsgInput').value = char.firstMessage || '';
            document.getElementById('charScenarioInput').value = char.scenario || '';
            document.getElementById('char-edit-header-group').innerText = char.group || '默认分组';
            
            if (char.wbEntries && Array.isArray(char.wbEntries)) {
                // 修改点：读取当前真实存在的世界书数据，过滤掉已经被删除的废弃 ID
                let wbData = JSON.parse(ChatDB.getItem('worldbook_data')) || { entries: [] };
                let validWbIds = wbData.entries.map(e => e.id);
                
                currentSelectedWbEntries = char.wbEntries.filter(id => validWbIds.includes(id));
                
                if (currentSelectedWbEntries.length > 0) {
                    document.getElementById('charWbSelectText').innerText = `已选择 ${currentSelectedWbEntries.length} 个条目`;
                    document.getElementById('charWbSelectText').style.color = '#333';
                    document.getElementById('charWbSelectText').style.fontWeight = 'bold';
                } else {
                    document.getElementById('charWbSelectText').innerText = '未绑定...';
                    document.getElementById('charWbSelectText').style.color = '#888';
                    document.getElementById('charWbSelectText').style.fontWeight = 'normal';
                }
            }
            
            if (char.avatarUrl) {
                avatarUpload.style.backgroundImage = `url(${char.avatarUrl})`;
                avatarUpload.innerText = '';
            }
        }
    }
    
    document.getElementById('charEditPanel').style.display = 'flex';
}

function closeCharEditPanel() {
    document.getElementById('charEditPanel').style.display = 'none';
}

function saveChar() {
    const name = document.getElementById('charNameInput').value.trim();
    const sex = document.getElementById('charSexInput').value.trim();
    const desc = document.getElementById('charDescInput').value.trim();
    const firstMsg = document.getElementById('charFirstMsgInput').value.trim();
    const scenario = document.getElementById('charScenarioInput').value.trim();
    const group = document.getElementById('char-edit-header-group').innerText || '默认分组';
    
    if (!name) {
        alert('请输入角色名称！');
        return;
    }

    const avatarBg = document.getElementById('charAvatarUpload').style.backgroundImage;
    let avatarUrl = '';
    if (avatarBg && avatarBg !== 'none') {
        avatarUrl = avatarBg.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
    }

    let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');

    if (currentEditingCharId) {
        const index = chars.findIndex(c => c.id === currentEditingCharId);
        if (index !== -1) {
            chars[index] = { 
                ...chars[index], 
                name, sex, description: desc, firstMessage: firstMsg, scenario, avatarUrl, group, wbEntries: currentSelectedWbEntries 
            };
        }
    } else {
        const newChar = {
            id: Date.now().toString(),
            name: name,
            sex: sex,
            description: desc,
            firstMessage: firstMsg,
            scenario: scenario,
            avatarUrl: avatarUrl,
            group: group,
            wbEntries: currentSelectedWbEntries,
            netName: '', account: '', password: '' // 初始为空，由 Secret 弹窗手动生成
        };
        chars.push(newChar);
    }

    ChatDB.setItem('chat_chars', JSON.stringify(chars));
    alert('角色保存成功！');
    closeCharEditPanel();
    if (typeof renderCharLibrary === 'function') renderCharLibrary();
}

function handleCharAvatarChange(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imgUrl = `url(${e.target.result})`;
            const squareAvatar = document.getElementById('charAvatarUpload');
            squareAvatar.style.backgroundImage = imgUrl;
            squareAvatar.innerText = ''; 
            squareAvatar.style.border = 'none';
        }
        reader.readAsDataURL(file);
    }
}
// ==========================================
// 角色编辑页标签切换逻辑
// ==========================================
function switchCharTab(tabName) {
    // 隐藏所有内容
    document.querySelectorAll('.char-tab-content').forEach(el => el.style.display = 'none');
    // 重置所有按钮颜色为灰色
    document.querySelectorAll('.char-tab-btn').forEach(el => {
        el.classList.remove('black');
        el.classList.add('gray');
    });
    
    // 显示对应内容
    document.getElementById('charTab-' + tabName).style.display = 'flex';
    // 将点击的按钮设为黑色
    document.getElementById('btn-char-' + tabName).classList.remove('gray');
    document.getElementById('btn-char-' + tabName).classList.add('black');
}

// ==========================================
// 渲染会话列表与通讯录
// ==========================================
function renderChatList() {
    const listEl = document.getElementById('chatSessionList');
    if (!listEl) return;
    listEl.innerHTML = '';

    const currentLoginId = ChatDB.getItem('current_login_account');
    if (!currentLoginId) {
        listEl.innerHTML = '<div style="text-align: center; color: #aaa; font-size: 13px; margin-top: 40px;">请先登录</div>';
        return;
    }

    let sessions = JSON.parse(ChatDB.getItem(`chat_sessions_${currentLoginId}`) || '[]');
    let allChars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');

    if (sessions.length === 0) {
        listEl.innerHTML = '<div style="text-align: center; color: #aaa; font-size: 13px; margin-top: 40px;">暂无聊天记录</div>';
        return;
    }

    // 获取备注列表
    let remarks = JSON.parse(ChatDB.getItem(`char_remarks_${currentLoginId}`) || '{}');

    sessions.forEach(charId => {
        const char = allChars.find(c => c.id === charId);
        if (!char) return;

        // 优先级：备注 > 网名 > 角色名
        const displayName = remarks[charId] || char.netName || char.name;

        const card = document.createElement('div');
        card.className = 'wechat-list-item';
        card.style.cursor = 'pointer';
        card.onclick = () => openChatRoom(char.id);
        card.innerHTML = `
            <div class="wechat-avatar" style="background-image: url('${char.avatarUrl || ''}');"></div>
            <div class="wechat-info">
                <div class="wechat-name-time">
                    <span class="wechat-name">${displayName}</span>
                    <span class="wechat-time">刚刚</span>
                </div>
                <div class="wechat-msg">点击进入聊天...</div>
            </div>
        `;
        listEl.appendChild(card);
    });
}


// --- 通讯录子 Tab 切换逻辑 ---
function switchContactSubTab(tabName) {
    const btns = document.querySelectorAll('.contact-nav-btn');
    const wrapper = document.getElementById('contactSliderWrapper');
    
    btns.forEach(btn => btn.classList.remove('active'));
    
    if (tabName === 'categories') {
        btns[0].classList.add('active');
        wrapper.style.transform = 'translateX(0%)';
        renderContactCategories(); // 渲染分组
    } else if (tabName === 'friends') {
        btns[1].classList.add('active');
        wrapper.style.transform = 'translateX(-33.333%)';
        renderContactFriends(); // 渲染所有好友
    } else if (tabName === 'groups') {
        btns[2].classList.add('active');
        wrapper.style.transform = 'translateX(-66.666%)';
    }
}

// 1. 渲染通讯录中的 Categories (分组列表)
function renderContactCategories() {
    const listEl = document.getElementById('contactCategoriesList');
    if (!listEl) return;
    listEl.innerHTML = '';

    const currentLoginId = ChatDB.getItem('current_login_account');
    if (!currentLoginId) return;

    let userGroups = JSON.parse(ChatDB.getItem(`contact_groups_${currentLoginId}`) || '["默认分组"]');
    let contacts = JSON.parse(ChatDB.getItem(`contacts_${currentLoginId}`) || '[]');
    let allChars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');

    userGroups.forEach(groupName => {
        const groupFriends = contacts.map(id => allChars.find(c => c.id === id)).filter(c => c && (c.contactGroup || '默认分组') === groupName);

        const groupItem = document.createElement('div');
        groupItem.className = 'contact-group-item';
        groupItem.style.background = '#fff';
        groupItem.style.borderRadius = '16px';
        groupItem.style.overflow = 'hidden';
        groupItem.style.marginBottom = '10px';

        let pressTimer;
        let touchEvent;
        const startPress = (e) => {
            touchEvent = e;
            pressTimer = setTimeout(() => {
                handleGroupLongPress(groupName, currentLoginId, touchEvent);
            }, 600);
        };
        const cancelPress = () => clearTimeout(pressTimer);

        groupItem.innerHTML = `
            <div class="contact-group-header" style="padding: 15px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
                <div class="contact-group-title" style="font-weight: bold; color: #333; font-size: 15px;">
                    ${groupName}
                </div>
                <div class="contact-group-count" style="color: #aaa; font-size: 12px;">${groupFriends.length}</div>
            </div>
            <div class="contact-group-content" style="display: none; padding: 0 15px 15px 15px; flex-direction: column; gap: 10px;">
                ${groupFriends.length === 0 ? '<div style="text-align:center; color:#ccc; font-size:12px;">暂无好友</div>' : ''}
            </div>
        `;

        const header = groupItem.querySelector('.contact-group-header');
        const content = groupItem.querySelector('.contact-group-content');

        // 修复：加入 { passive: true } 防止浏览器报错
        header.addEventListener('touchstart', startPress, { passive: true });
        header.addEventListener('touchend', cancelPress, { passive: true });
        header.addEventListener('touchmove', cancelPress, { passive: true });
        header.addEventListener('mousedown', startPress);
        header.addEventListener('mouseup', cancelPress);
        header.addEventListener('mouseleave', cancelPress);

        header.addEventListener('click', () => {
            const isHidden = content.style.display === 'none';
            content.style.display = isHidden ? 'flex' : 'none';
        });

        groupFriends.forEach(friend => {
            const friendEl = document.createElement('div');
            friendEl.style.display = 'flex';
            friendEl.style.alignItems = 'center';
            friendEl.style.gap = '10px';
            friendEl.style.cursor = 'pointer'; // 添加鼠标指针样式
            friendEl.onclick = () => openCharProfilePanel(friend.id); // 点击打开详情页
            friendEl.innerHTML = `
                <div style="width: 40px; height: 40px; border-radius: 10px; background-image: url('${friend.avatarUrl || ''}'); background-size: cover; background-color: #eee;"></div>
                <div style="flex: 1; font-size: 14px; font-weight: bold; color: #333;">${friend.netName || friend.name}</div>
            `;
            content.appendChild(friendEl);
        });

        listEl.appendChild(groupItem);
    });
}

// 2. 渲染通讯录中的 Friends (所有好友平铺)
function renderContactFriends() {
    const listEl = document.getElementById('contactFriendsList');
    if (!listEl) return;
    listEl.innerHTML = '';

    const currentLoginId = ChatDB.getItem('current_login_account');
    if (!currentLoginId) return;

    let contacts = JSON.parse(ChatDB.getItem(`contacts_${currentLoginId}`) || '[]');
    let allChars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
    
    // 获取所有已添加的好友
    const allFriends = contacts.map(id => allChars.find(c => c.id === id)).filter(c => c);

    if (allFriends.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; color:#ccc; font-size:13px; margin-top: 40px;">暂无好友</div>';
        return;
    }

    allFriends.forEach(friend => {
        const friendEl = document.createElement('div');
        friendEl.style.display = 'flex';
        friendEl.style.alignItems = 'center';
        friendEl.style.gap = '15px';
        friendEl.style.padding = '15px';
        friendEl.style.background = '#fff';
        friendEl.style.borderRadius = '16px';
        friendEl.style.marginBottom = '10px';
        friendEl.style.cursor = 'pointer'; // 添加鼠标指针样式
        friendEl.onclick = () => openCharProfilePanel(friend.id); // 点击打开详情页
        friendEl.innerHTML = `
            <div style="width: 48px; height: 48px; border-radius: 12px; background-image: url('${friend.avatarUrl || ''}'); background-size: cover; background-color: #eee;"></div>
            <div style="flex: 1; font-size: 16px; font-weight: bold; color: #333;">${friend.netName || friend.name}</div>
        `;
        listEl.appendChild(friendEl);
    });
}

// 处理分组长按逻辑 (弹出自定义菜单)
function handleGroupLongPress(groupName, currentLoginId, e) {
    // 获取点击坐标
    let clientX = 0;
    let clientY = 0;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }

    const overlay = document.getElementById('contextMenuOverlay');
    const menu = document.getElementById('contextMenu');
    
    // 构建菜单内容 (带 SVG 图标)
    let menuHtml = `
        <div class="context-menu-item" onclick="actionRenameGroup('${groupName}', '${currentLoginId}')">
            <div class="context-menu-icon">
                <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </div>
            修改名称
        </div>
        <div class="context-menu-item" onclick="actionCreateGroup('${currentLoginId}')">
            <div class="context-menu-icon">
                <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
            </div>
            新建分组
        </div>
    `;

    // 默认分组不显示删除按钮
    if (groupName !== '默认分组') {
        menuHtml += `
            <div class="context-menu-item danger" onclick="actionDeleteGroup('${groupName}', '${currentLoginId}')">
                <div class="context-menu-icon">
                    <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </div>
                删除分组
            </div>
        `;
    }

    menu.innerHTML = menuHtml;

    // 显示遮罩层以便获取菜单实际宽高
    overlay.classList.add('show');
    
    // 动态计算位置，防止菜单超出屏幕边缘
    const menuRect = menu.getBoundingClientRect();
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    let left = clientX;
    let top = clientY;

    // 如果右侧空间不够，向左偏移
    if (left + menuRect.width > screenWidth - 20) {
        left = screenWidth - menuRect.width - 20;
    }
    // 如果下方空间不够，向上偏移
    if (top + menuRect.height > screenHeight - 20) {
        top = screenHeight - menuRect.height - 20;
    }

    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
}

function closeContextMenu() {
    document.getElementById('contextMenuOverlay').classList.remove('show');
}

// 菜单具体操作函数：修改名称
function actionRenameGroup(groupName, currentLoginId) {
    closeContextMenu();
    if (groupName === '默认分组') return alert('默认分组不可修改名称！');
    const newName = prompt('请输入新的分组名称：', groupName);
    if (newName && newName.trim() !== '' && newName !== groupName) {
        let userGroups = JSON.parse(ChatDB.getItem(`contact_groups_${currentLoginId}`) || '["默认分组"]');
        if (userGroups.includes(newName)) return alert('分组名已存在！');
        const index = userGroups.indexOf(groupName);
        if (index !== -1) {
            userGroups[index] = newName.trim();
            ChatDB.setItem(`contact_groups_${currentLoginId}`, JSON.stringify(userGroups));
            
            // 同步修改该分组下好友的 contactGroup 字段
            let allChars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
            let modified = false;
            allChars.forEach(c => {
                if (c.contactGroup === groupName) {
                    c.contactGroup = newName.trim();
                    modified = true;
                }
            });
            if (modified) ChatDB.setItem('chat_chars', JSON.stringify(allChars));
            
            renderContactFriends();
        }
    }
}

// 菜单具体操作函数：新建分组
function actionCreateGroup(currentLoginId) {
    closeContextMenu();
    const newName = prompt('请输入新建分组名称：');
    if (newName && newName.trim() !== '') {
        let userGroups = JSON.parse(ChatDB.getItem(`contact_groups_${currentLoginId}`) || '["默认分组"]');
        if (userGroups.includes(newName.trim())) return alert('分组名已存在！');
        userGroups.push(newName.trim());
        ChatDB.setItem(`contact_groups_${currentLoginId}`, JSON.stringify(userGroups));
        renderContactFriends();
    }
}

// 菜单具体操作函数：删除分组
function actionDeleteGroup(groupName, currentLoginId) {
    closeContextMenu();
    if (confirm(`确定要删除分组 [${groupName}] 吗？该分组下的好友将被移至默认分组。`)) {
        let userGroups = JSON.parse(ChatDB.getItem(`contact_groups_${currentLoginId}`) || '["默认分组"]');
        userGroups = userGroups.filter(g => g !== groupName);
        ChatDB.setItem(`contact_groups_${currentLoginId}`, JSON.stringify(userGroups));
        
        // 将该分组下的好友移入默认分组
        let allChars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
        let modified = false;
        allChars.forEach(c => {
            if (c.contactGroup === groupName) {
                c.contactGroup = '默认分组';
                modified = true;
            }
        });
        if (modified) ChatDB.setItem('chat_chars', JSON.stringify(allChars));
        
        renderContactFriends();
    }
}


// 覆盖原有的 renderContactList，使其初始化时渲染 Categories (分组)
function renderContactList() {
    switchContactSubTab('categories'); // 默认打开 Categories
}

// 确保在进入微信面板时渲染列表
const originalEnterWechat = enterWechat;
enterWechat = function(accountId) {
    originalEnterWechat(accountId);
    renderChatList();
    renderContactList();
};
// ==========================================
// 角色库分组与 Create 弹窗逻辑
// ==========================================

// 1. 分组弹窗逻辑
const charGroupPopup = document.getElementById('charGroupPopup');
let isCharGroupEditing = false;

function toggleCharGroupPopup() {
    charGroupPopup.classList.toggle('show');
    document.getElementById('charCreatePopup').classList.remove('show'); // 互斥隐藏
}

function toggleCharGroupEditMode() {
    isCharGroupEditing = !isCharGroupEditing;
    const editBtn = document.getElementById('charGroupEditBtn');
    if (isCharGroupEditing) {
        charGroupPopup.classList.add('is-editing');
        editBtn.innerText = 'Done';
    } else {
        charGroupPopup.classList.remove('is-editing');
        editBtn.innerText = 'Edit';
    }
}

// ==========================================
// 角色库分组完整逻辑 (持久化 + 渲染)
// ==========================================
let charGroups = JSON.parse(ChatDB.getItem('chat_char_groups') || '["默认分组"]');
let currentCharGroupFilter = '默认分组';

function saveCharGroups() {
    ChatDB.setItem('chat_char_groups', JSON.stringify(charGroups));
}

function renderCharGroups() {
    // 1. 渲染角色库主页的分组列表
    const listEl = document.getElementById('charGroupList');
    if (listEl) {
        listEl.innerHTML = '';
        charGroups.forEach(g => {
            const item = document.createElement('div');
            item.className = 'preset-item';
            item.innerHTML = `
                <span class="preset-item-name">${g}</span>
                <div class="preset-delete-btn" onclick="deleteCharGroup('${g}', event)">-</div>
            `;
            item.onclick = () => {
                if (!isCharGroupEditing) {
                    currentCharGroupFilter = g;
                    document.querySelector('#charLibraryPanel .header-title').innerText = g;
                    document.getElementById('charGroupPopup').classList.remove('show');
                    renderCharLibrary(); // 重新渲染列表
                }
            };
            listEl.appendChild(item);
        });
    }

    // 2. 渲染编辑页顶部的分组选择列表
    const editListEl = document.getElementById('charEditGroupList');
    if (editListEl) {
        editListEl.innerHTML = '';
        charGroups.forEach(g => {
            const item = document.createElement('div');
            item.className = 'preset-item';
            item.innerHTML = `<span class="preset-item-name">${g}</span>`;
            item.onclick = () => {
                document.getElementById('char-edit-header-group').innerText = g;
                document.getElementById('charEditGroupPopup').classList.remove('show');
            };
            editListEl.appendChild(item);
        });
    }
}

function promptAddCharGroup() {
    const name = prompt("请输入新分组名称：");
    if (name && name.trim() !== "") {
        if (charGroups.includes(name.trim())) return alert('分组已存在！');
        charGroups.push(name.trim());
        saveCharGroups();
        renderCharGroups();
    }
}

function deleteCharGroup(groupName, e) {
    e.stopPropagation();
    if (groupName === '默认分组') return alert('默认分组不可删除！');
    if (confirm(`确定删除分组 [${groupName}] 吗？该分组下的角色将被移至默认分组。`)) {
        charGroups = charGroups.filter(g => g !== groupName);
        saveCharGroups();
        
        // 将该分组下的角色移入默认分组
        let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
        chars.forEach(c => { if (c.group === groupName) c.group = '默认分组'; });
        ChatDB.setItem('chat_chars', JSON.stringify(chars));
        
        if (currentCharGroupFilter === groupName) {
            currentCharGroupFilter = '默认分组';
            document.querySelector('#charLibraryPanel .header-title').innerText = '默认分组';
        }
        renderCharGroups();
        renderCharLibrary();
    }
}

// 编辑页顶部分组弹窗开关
function toggleCharEditGroupPopup() {
    document.getElementById('charEditGroupPopup').classList.toggle('show');
}

// 点击空白处关闭编辑页分组弹窗
document.addEventListener('click', (e) => {
    const editPopup = document.getElementById('charEditGroupPopup');
    const editTitle = document.querySelector('#charEditPanel .header-title');
    if (editPopup && editPopup.classList.contains('show') && !editPopup.contains(e.target) && !editTitle.contains(e.target)) {
        editPopup.classList.remove('show');
    }
});

// 页面加载时初始化分组
document.addEventListener('DOMContentLoaded', () => {
    renderCharGroups();
});


// 2. Create 弹窗逻辑
const charCreatePopup = document.getElementById('charCreatePopup');

function toggleCharCreatePopup() {
    charCreatePopup.classList.toggle('show');
    document.getElementById('charGroupPopup').classList.remove('show'); // 互斥隐藏
}

// 3. 终极角色卡导入逻辑 (深度解析酒馆 V2 协议)
function importCharCard() {
    document.getElementById('charImportInput').click();
}

async function handleCharImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    let charData = null;

    try {
        if (fileName.endsWith('.json')) {
            const text = await file.text();
            charData = parseTavernData(JSON.parse(text));
        } else if (fileName.endsWith('.png')) {
            charData = await parseTavernPng(file);
        } else if (fileName.endsWith('.txt')) {
            const text = await file.text();
            charData = { char: { name: file.name.replace('.txt',''), description: text }, worldbook: [] };
        }

        if (charData && charData.char) {
            saveImportedChar(charData, file);
        } else {
            alert('无法解析该文件，请确保是标准的酒馆角色卡！');
        }
    } catch (e) {
        console.error("解析失败:", e);
        alert('导入出错: ' + e.message);
    }
    event.target.value = ''; 
}

// 核心：解析酒馆 V1/V2 数据结构
function parseTavernData(json) {
    const data = json.data || json; // 兼容 V2 的 data 包裹层
    
    // 1. 提取角色基础信息
    const charInfo = {
        name: data.name || '未命名',
        description: data.description || data.persona || '',
        firstMessage: data.first_mes || data.mes_example || '',
        scenario: data.scenario || '',
        sex: data.creator_notes || '未知'
    };

    // 2. 提取嵌套的世界书 (Lorebook)
    let worldbookEntries = [];
    const book = data.character_book || json.character_book;
    if (book && book.entries && Array.isArray(book.entries)) {
        worldbookEntries = book.entries.map(e => ({
            id: 'wb_' + Date.now() + Math.random().toString(36).substr(2, 5),
            title: e.comment || e.keys?.[0] || '未命名词条',
            keywords: Array.isArray(e.keys) ? e.keys.join(', ') : (e.key || ''),
            content: e.content || '',
            constant: e.constant || false,
            exact: e.selective || true,
            position: e.insertion_order === 0 ? 'top' : (e.insertion_order === 1 ? 'before' : 'after')
        }));
    }

    return { char: charInfo, worldbook: worldbookEntries };
}

// 核心：读取 PNG 隐写数据
async function parseTavernPng(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const buffer = e.target.result;
                const view = new DataView(buffer);
                let offset = 8; 

                while (offset < view.byteLength) {
                    const length = view.getUint32(offset);
                    const type = String.fromCharCode(
                        view.getUint8(offset + 4), view.getUint8(offset + 5),
                        view.getUint8(offset + 6), view.getUint8(offset + 7)
                    );

                    if (type === 'tEXt' || type === 'iTXt') {
                        const dataChunk = new Uint8Array(buffer, offset + 8, length);
                        const text = new TextDecoder().decode(dataChunk);
                        
                        if (text.startsWith('chara')) {
                            const base64Data = text.substring(text.indexOf('\0') + 1);
                            const decoded = decodeURIComponent(escape(atob(base64Data))); // 处理 UTF-8
                            resolve(parseTavernData(JSON.parse(decoded)));
                            return;
                        }
                    }
                    offset += length + 12;
                }
                resolve(null);
            } catch (err) { reject(err); }
        };
        reader.readAsArrayBuffer(file);
    });
}

// 保存逻辑：同步迁移世界书并绑定
function saveImportedChar(data, file) {
    let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
    let wbData = JSON.parse(ChatDB.getItem('worldbook_data')) || { groups: [], entries: [] };
    
    const newCharId = Date.now().toString();
    const importedWbIds = [];

    // 1. 如果有世界书，创建新分组并存入
    if (data.worldbook && data.worldbook.length > 0) {
        const groupName = "导入: " + data.char.name;
        if (!wbData.groups.includes(groupName)) wbData.groups.push(groupName);
        
        data.worldbook.forEach(entry => {
            entry.group = groupName;
            wbData.entries.push(entry);
            importedWbIds.push(entry.id);
        });
        ChatDB.setItem('worldbook_data', JSON.stringify(wbData));
    }

    // 2. 创建角色对象
    const newChar = {
        id: newCharId,
        name: data.char.name,
        sex: data.char.sex,
        description: data.char.description,
        firstMessage: data.char.firstMessage,
        scenario: data.char.scenario,
        group: currentCharGroupFilter || '默认分组',
        wbEntries: importedWbIds, // 自动绑定刚才导入的所有词条
        avatarUrl: ''
    };

    // 3. 处理头像并保存
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            newChar.avatarUrl = e.target.result;
            chars.push(newChar);
            ChatDB.setItem('chat_chars', JSON.stringify(chars));
            renderCharLibrary();
            if (typeof window.reloadWorldbookData === 'function') window.reloadWorldbookData();
            alert(`角色 [${data.char.name}] 导入成功！\n检测到并迁移了 ${data.worldbook.length} 条世界书词条。`);
        };
        reader.readAsDataURL(file);
    } else {
        chars.push(newChar);
        ChatDB.setItem('chat_chars', JSON.stringify(chars));
        renderCharLibrary();
        // 导入后立即刷新世界书分组和列表，确保页面显示最新数据
        if (typeof window.reloadWorldbookData === 'function') window.reloadWorldbookData();
        alert(`角色 [${data.char.name}] 导入成功！`);
    }
}


// 4. 点击空白处关闭弹窗
document.addEventListener('click', (e) => {
    const charTitle = document.querySelector('#charLibraryPanel .header-title');
    const createBtn = document.querySelector('#charLibraryPanel .header-close[onclick="toggleCharCreatePopup()"]');
    
    if (charGroupPopup && charGroupPopup.classList.contains('show') && !charGroupPopup.contains(e.target) && e.target !== charTitle) {
        charGroupPopup.classList.remove('show');
    }
    if (charCreatePopup && charCreatePopup.classList.contains('show') && !charCreatePopup.contains(e.target) && e.target !== createBtn) {
        charCreatePopup.classList.remove('show');
    }
});
// ==========================================
// 删除角色逻辑
// ==========================================
function deleteChar(id) {
    if (confirm('确定要删除这个角色卡吗？此操作不可恢复。')) {
        let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
        chars = chars.filter(c => c.id !== id);
        ChatDB.setItem('chat_chars', JSON.stringify(chars));
        
        // 重新渲染列表
        if (typeof renderCharLibrary === 'function') {
            renderCharLibrary();
        }
    }
}
// ==========================================
// 世界书选择弹窗逻辑
// ==========================================
function openCharWbSelectModal() {
    const listEl = document.getElementById('charWbSelectList');
    listEl.innerHTML = '';
    
    let wbData = JSON.parse(ChatDB.getItem('worldbook_data')) || { groups: [], entries: [] };
    
    if (wbData.groups.length === 0 || wbData.entries.length === 0) {
        listEl.innerHTML = '<div style="padding: 20px; text-align: center; color: #aaa; font-size: 12px;">暂无世界书数据</div>';
    } else {
        wbData.groups.forEach(group => {
            const groupEntries = wbData.entries.filter(e => e.group === group);
            if (groupEntries.length === 0) return;
            
            const groupContainer = document.createElement('div');
            groupContainer.style.borderBottom = '1px solid #f5f5f5';
            
            const groupHeader = document.createElement('div');
            groupHeader.style.display = 'flex';
            groupHeader.style.alignItems = 'center';
            groupHeader.style.justifyContent = 'space-between';
            groupHeader.style.padding = '15px 5px';
            groupHeader.style.cursor = 'pointer';
            
            const leftDiv = document.createElement('div');
            leftDiv.style.display = 'flex';
            leftDiv.style.alignItems = 'center';
            leftDiv.style.gap = '12px';
            
            const groupCb = document.createElement('input');
            groupCb.type = 'checkbox';
            // 使用 data 属性代替 class 存储组名，避开选择器特殊字符报错
            groupCb.setAttribute('data-group-target', group);
            groupCb.style.width = '18px';
            groupCb.style.height = '18px';
            groupCb.style.cursor = 'pointer';
            groupCb.style.accentColor = '#333';
            
            const allSelected = groupEntries.every(e => currentSelectedWbEntries.includes(e.id));
            groupCb.checked = allSelected;
            
            groupCb.onclick = (e) => e.stopPropagation();
            
            groupCb.onchange = (e) => {
                const isChecked = e.target.checked;
                // 使用属性选择器，安全处理包含冒号或空格的组名
                document.querySelectorAll(`.wb-entry-checkbox[data-group-name="${group}"]`).forEach(cb => {
                    cb.checked = isChecked;
                    if (isChecked && !currentSelectedWbEntries.includes(cb.value)) {
                        currentSelectedWbEntries.push(cb.value);
                    } else if (!isChecked) {
                        currentSelectedWbEntries = currentSelectedWbEntries.filter(id => id !== cb.value);
                    }
                });
            };
            
            const titleSpan = document.createElement('span');
            titleSpan.innerText = group;
            titleSpan.style.fontSize = '15px';
            titleSpan.style.color = '#333';
            titleSpan.style.fontWeight = '500';
            
            leftDiv.appendChild(groupCb);
            leftDiv.appendChild(titleSpan);
            
            const arrowSvg = document.createElement('div');
            arrowSvg.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="#aaa" style="transition: transform 0.2s;"><path d="M7 10l5 5 5-5z"/></svg>`;
            const arrowIcon = arrowSvg.firstChild;
            
            groupHeader.appendChild(leftDiv);
            groupHeader.appendChild(arrowSvg);
            
            const entriesContainer = document.createElement('div');
            entriesContainer.style.display = 'none';
            entriesContainer.style.paddingBottom = '10px';
            
            groupHeader.onclick = () => {
                const isHidden = entriesContainer.style.display === 'none';
                entriesContainer.style.display = isHidden ? 'block' : 'none';
                arrowIcon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
            };
            
            groupEntries.forEach(entry => {
                const entryDiv = document.createElement('div');
                entryDiv.style.display = 'flex';
                entryDiv.style.alignItems = 'center';
                entryDiv.style.gap = '12px';
                entryDiv.style.padding = '12px 5px 12px 35px';
                
                const entryCb = document.createElement('input');
                entryCb.type = 'checkbox';
                // 统一 class，使用 data-group-name 标识所属组
                entryCb.className = `wb-entry-checkbox`;
                entryCb.setAttribute('data-group-name', group);
                entryCb.value = entry.id;
                entryCb.checked = currentSelectedWbEntries.includes(entry.id);
                entryCb.style.width = '16px';
                entryCb.style.height = '16px';
                entryCb.style.cursor = 'pointer';
                entryCb.style.accentColor = '#666';
                
                entryCb.onchange = (e) => {
                    if (e.target.checked) {
                        if (!currentSelectedWbEntries.includes(entry.id)) currentSelectedWbEntries.push(entry.id);
                    } else {
                        currentSelectedWbEntries = currentSelectedWbEntries.filter(id => id !== entry.id);
                    }
                    const allCbs = Array.from(document.querySelectorAll(`.wb-entry-checkbox[data-group-name="${group}"]`));
                    const allChecked = allCbs.every(cb => cb.checked);
                    document.querySelector(`input[data-group-target="${group}"]`).checked = allChecked;
                };
                
                const entryTitle = document.createElement('span');
                entryTitle.innerText = entry.title || '未命名';
                entryTitle.style.fontSize = '14px';
                entryTitle.style.color = '#666';
                
                entryDiv.appendChild(entryCb);
                entryDiv.appendChild(entryTitle);
                entriesContainer.appendChild(entryDiv);
            });
            
            groupContainer.appendChild(groupHeader);
            groupContainer.appendChild(entriesContainer);
            listEl.appendChild(groupContainer);
        });
    }
    
    document.getElementById('charWbSelectModalOverlay').classList.add('show');
}

function confirmCharWbSelect() {
    const textEl = document.getElementById('charWbSelectText');
    if (currentSelectedWbEntries.length > 0) {
        textEl.innerText = `已选择 ${currentSelectedWbEntries.length} 个条目`;
        textEl.style.color = '#333';
        textEl.style.fontWeight = 'bold';
    } else {
        textEl.innerText = '正在绑定...';
        textEl.style.color = '#888';
        textEl.style.fontWeight = 'normal';
    }
    
    document.getElementById('charWbSelectModalOverlay').classList.remove('show');
}

// ==========================================
// Secret 弹窗与 API 手动生成逻辑
// ==========================================
let currentSecretCharId = null;

function openSecretModal(charId) {
    currentSecretCharId = charId;
    let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
    const char = chars.find(c => c.id === charId);
    if (char) {
        const avatarEl = document.getElementById('secretAvatar');
        if (char.avatarUrl) {
            avatarEl.style.backgroundImage = `url(${char.avatarUrl})`;
        } else {
            avatarEl.style.backgroundImage = '';
        }
        
        document.getElementById('secretNetName').innerText = char.netName || '未生成';
        document.getElementById('secretAccount').innerText = char.account || '未生成';
        document.getElementById('secretPassword').innerText = char.password || '未生成';
        
        // 绑定生成按钮事件
        document.getElementById('btnGenerateSecret').onclick = () => generateAccountInfoAPI(charId);
        
        document.getElementById('secretModalOverlay').classList.add('show');
    }
}

async function generateAccountInfoAPI(charId) {
    let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
    const charIndex = chars.findIndex(c => c.id === charId);
    if (charIndex === -1) return;
    const char = chars[charIndex];

    const apiConfig = JSON.parse(ChatDB.getItem('current_api_config') || '{}');
    if (!apiConfig.url || !apiConfig.key || !apiConfig.model) {
        alert('请先在设置中配置 API 信息！');
        return;
    }

    const btn = document.getElementById('btnGenerateSecret');
    const originalText = btn.innerText;
    btn.innerText = '生成中...';
    btn.style.pointerEvents = 'none';

    try {
        // 优化 Prompt，强调随机性
        const prompt = `你是一个角色设定助手。请根据以下角色设定，生成该角色的网名(netName)、11位完全随机的数字手机号作为账号(account，必须以1开头)、一段简短感性的个性签名(signature)、以及8-12位密码(password)。必须且只能返回JSON：{"netName":"xxx","account":"1xxxxxxxxxx","signature":"xxx","password":"xxx"}\n\n角色名称：${char.name}\n设定：${char.description}`;
        
        const temp = parseFloat(apiConfig.temperature);
        const finalTemp = isNaN(temp) ? 0.7 : temp;

        const response = await fetch(`${apiConfig.url.replace(/\/$/, '')}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiConfig.key}`
            },
            body: JSON.stringify({
                model: apiConfig.model,
                messages: [{ role: 'user', content: prompt }],
                temperature: finalTemp
            })
        });

        if (response.ok) {
            const data = await response.json();
            let content = data.choices[0].message.content.trim();
            content = content.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();
            const parsed = JSON.parse(content);
            
            let allChars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
            let finalAccount = parsed.account;

            // 辅助函数：生成 1 开头的 11 位随机数字
            const generateRandomPhone = () => {
                let phone = '1';
                for (let i = 0; i < 10; i++) {
                    phone += Math.floor(Math.random() * 10).toString();
                }
                return phone;
            };

            // 1. 验证 AI 生成的账号是否合法 (1开头，11位纯数字)
            if (!finalAccount || !/^1\d{10}$/.test(finalAccount)) {
                finalAccount = generateRandomPhone();
            }

            // 2. 绝对查重逻辑：如果和现有角色重复，重新生成全新的随机号码，直到不重复为止
            while(allChars.some(c => c.account === finalAccount && c.id !== charId)) {
                finalAccount = generateRandomPhone();
            }

            if (parsed.netName) char.netName = parsed.netName;
            char.account = finalAccount;
            if (parsed.password) char.password = parsed.password;
            if (parsed.signature) char.signature = parsed.signature;
            
            chars[charIndex] = char;
            ChatDB.setItem('chat_chars', JSON.stringify(chars));
            
            document.getElementById('secretNetName').innerText = char.netName;
            document.getElementById('secretAccount').innerText = char.account;
            document.getElementById('secretPassword').innerText = char.password;
            
            alert('账号信息生成成功！');
        } else {
            alert('API 调用失败，请检查配置。');
        }
    } catch (e) {
        console.error('API 请求出错:', e);
        alert('API请求出错: ' + e.message);
    } finally {
        btn.innerText = originalText;
        btn.style.pointerEvents = 'auto';
    }
}
// 点击空白处关闭 Secret 弹窗
document.addEventListener('click', (e) => {
    const secretOverlay = document.getElementById('secretModalOverlay');
    const secretContent = document.getElementById('secretModalContent');
    
    // 如果弹窗显示着，且点击的目标不是弹窗内容本身，也不是弹窗内部的元素
    if (secretOverlay && secretOverlay.classList.contains('show')) {
        if (secretContent && !secretContent.contains(e.target)) {
            secretOverlay.classList.remove('show');
        }
    }
});

// ==========================================
// 搜索与添加角色至通讯录逻辑
// ==========================================
const searchAddPanel = document.getElementById('searchAddPanel');

function openSearchAddPanel() {
    document.getElementById('searchCharInput').value = '';
    document.getElementById('searchCharResult').innerHTML = '<div style="text-align: center; color: #aaa; font-size: 13px; margin-top: 40px;">输入账号查找角色</div>';
    searchAddPanel.style.display = 'flex';
}

function closeSearchAddPanel() {
    searchAddPanel.style.display = 'none';
}

function handleCharSearch() {
    const keyword = document.getElementById('searchCharInput').value.trim();
    const resultContainer = document.getElementById('searchCharResult');
    
    if (!keyword) {
        resultContainer.innerHTML = '<div style="text-align: center; color: #aaa; font-size: 13px; margin-top: 40px;">输入账号查找角色</div>';
        return;
    }

    let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
    // 根据账号精确搜索或模糊搜索
    const matchedChars = chars.filter(c => c.account && c.account.includes(keyword));

    if (matchedChars.length === 0) {
        resultContainer.innerHTML = '<div style="text-align: center; color: #aaa; font-size: 13px; margin-top: 40px;">未找到该账号对应的角色</div>';
        return;
    }

    resultContainer.innerHTML = '';
    matchedChars.forEach(char => {
        const card = document.createElement('div');
        card.className = 'wechat-list-item';
        card.style.cursor = 'default';
        card.innerHTML = `
            <div class="wechat-avatar" style="background-image: url('${char.avatarUrl || ''}');"></div>
            <div class="wechat-info">
                <div class="wechat-name-time">
                    <span class="wechat-name">${char.netName || char.name}</span>
                </div>
                <div class="wechat-msg">账号: ${char.account}</div>
            </div>
            <div onclick="addCharToContacts('${char.id}')" style="background: #111; color: #fff; padding: 6px 14px; border-radius: 12px; font-size: 12px; font-weight: bold; cursor: pointer;">添加</div>
        `;
        resultContainer.appendChild(card);
    });
}

function addCharToContacts(charId) {
    const currentLoginId = ChatDB.getItem('current_login_account');
    if (!currentLoginId) return alert('请先登录！');

    let contacts = JSON.parse(ChatDB.getItem(`contacts_${currentLoginId}`) || '[]');
    
    if (contacts.includes(charId)) {
        alert('该角色已在您的通讯录中！');
        return;
    }

    contacts.push(charId);
    ChatDB.setItem(`contacts_${currentLoginId}`, JSON.stringify(contacts));
    
    alert('添加成功！');
    closeSearchAddPanel();
    
    // 如果当前在通讯录 Tab，刷新通讯录
    if (document.getElementById('tab-contacts').style.display === 'flex') {
        if (typeof renderContactList === 'function') renderContactList();
    }
}

// ==========================================
// 全屏聊天页面逻辑 (Chat Room)
// ==========================================
let currentChatRoomCharId = null;

// 格式化时间戳 (如 3:39 PM)
function formatChatTime(timestamp) {
    const date = new Date(timestamp);
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    return `${hours}:${minutes} ${ampm}`;
}

// 渲染真实聊天记录
function renderChatHistory(charId) {
    const historyEl = document.getElementById('chatRoomHistory');
    const currentLoginId = ChatDB.getItem('current_login_account');
    if (!currentLoginId) return;

    let history = JSON.parse(ChatDB.getItem(`chat_history_${currentLoginId}_${charId}`) || '[]');
    let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
    const char = chars.find(c => c.id === charId);
    
    let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
    const me = accounts.find(a => a.id === currentLoginId);

    historyEl.innerHTML = '';

    if (history.length === 0) {
        // 如果没有记录，自动插入角色的开场白
        if (char && char.firstMessage) {
            history.push({ role: 'char', content: char.firstMessage, timestamp: Date.now() });
            ChatDB.setItem(`chat_history_${currentLoginId}_${charId}`, JSON.stringify(history));
        } else {
            historyEl.innerHTML = '<div style="text-align: center; color: #ccc; font-size: 12px; margin-top: 20px;">暂无聊天记录</div>';
            return;
        }
    }

    history.forEach((msg, index) => {
        const prevMsg = history[index - 1];
        const nextMsg = history[index + 1];

        // 判断是否显示时间戳 (间隔超过5分钟显示一次)
        let showTime = false;
        if (!prevMsg || msg.timestamp - prevMsg.timestamp > 5 * 60 * 1000) {
            showTime = true;
        }

        // 判断是否是连续消息的中间部分 (隐藏尾巴和头像)
        let isContinuous = false;
        if (nextMsg && nextMsg.role === msg.role && (nextMsg.timestamp - msg.timestamp < 5 * 60 * 1000)) {
            isContinuous = true;
        }
        
        // 判断是否紧接上一条同角色消息 (用于拉近间距)
        let isFollowUp = false;
        if (prevMsg && prevMsg.role === msg.role && (msg.timestamp - prevMsg.timestamp < 5 * 60 * 1000)) {
            isFollowUp = true;
        }

        if (showTime) {
            const timeEl = document.createElement('div');
            timeEl.className = 'chat-time';
            timeEl.innerText = formatChatTime(msg.timestamp);
            historyEl.appendChild(timeEl);
        }

        const rowEl = document.createElement('div');
        rowEl.className = `cr-msg-row ${msg.role === 'user' ? 'me' : 'other'} ${isFollowUp ? 'continuous' : ''}`;
        
        // 多选模式点击事件
        rowEl.onclick = () => {
            if (isChatMultiSelecting) toggleMsgSelection(index, rowEl);
        };

        const avatarUrl = msg.role === 'user' ? (me ? me.avatarUrl : '') : (char ? char.avatarUrl : '');
        const avatarHtml = `
            <div class="cr-avatar ${isContinuous ? 'hidden' : ''}" style="background-image: url('${avatarUrl || ''}');">
                ${!avatarUrl ? '<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>' : ''}
            </div>
        `;

        // 判断消息类型 (兼容真实图片和文字描述图片)
        const isImageMsg = msg.content.includes('chat-img-120') || msg.content.includes('chat-desc-img-120') || (msg.content.trim().startsWith('<img') && msg.content.trim().endsWith('>'));
        const isForwardRecord = msg.type === 'forward_record';

        // 引用内容渲染
        let quoteHtml = '';
        if (msg.quote) {
            quoteHtml = `<div class="cr-quote-block">${msg.quote}</div>`;
        }

        // 多选框
        const checkboxHtml = `<input type="checkbox" class="cr-msg-checkbox" value="${index}">`;

        // 气泡内容处理
        let bubbleInnerHtml = msg.content;
        if (isForwardRecord) {
            bubbleInnerHtml = `
                <div class="cr-forward-card" onclick="event.stopPropagation(); openForwardDetail(${index})">
                    <div class="cr-forward-title">${msg.forwardTitle}</div>
                    <div class="cr-forward-preview">
                        ${msg.forwardPreview.map(line => `<div class="cr-forward-preview-line">${line}</div>`).join('')}
                    </div>
                    <div class="cr-forward-footer">聊天记录</div>
                </div>
            `;
        }

        // 气泡长按事件绑定
        const bubbleHtml = `
            <div class="cr-msg-content-wrapper">
                ${quoteHtml}
                <div class="cr-bubble ${msg.role === 'user' ? 'cr-bubble-right' : 'cr-bubble-left'} ${isContinuous ? 'no-tail' : ''} ${isImageMsg ? 'cr-bubble-image' : ''} ${isForwardRecord ? 'cr-bubble-forward' : ''}" 
                     oncontextmenu="return false;" 
                     ontouchstart="handleBubbleTouchStart(event, ${index})" 
                     ontouchend="handleBubbleTouchEnd()" 
                     ontouchmove="handleBubbleTouchEnd()"
                     onmousedown="handleBubbleTouchStart(event, ${index})"
                     onmouseup="handleBubbleTouchEnd()"
                     onmouseleave="handleBubbleTouchEnd()">
                    ${bubbleInnerHtml}
                </div>
            </div>
        `;

        if (msg.role === 'user') {
            rowEl.innerHTML = checkboxHtml + bubbleHtml + avatarHtml;
        } else {
            rowEl.innerHTML = checkboxHtml + avatarHtml + bubbleHtml;
        }

        historyEl.appendChild(rowEl);
    });

    // 自动滚动到底部
    setTimeout(() => {
        historyEl.scrollTop = historyEl.scrollHeight;
    }, 50);
}

// 发送消息逻辑
function sendChatMessage() {
    const inputEl = document.getElementById('chatRoomInput');
    const content = inputEl.value.trim();
    if (!content || !currentChatRoomCharId) return;

    const currentLoginId = ChatDB.getItem('current_login_account');
    if (!currentLoginId) return;

    let history = JSON.parse(ChatDB.getItem(`chat_history_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
    
    // 附带引用内容
    let newMsg = { role: 'user', content: content, timestamp: Date.now() };
    if (currentQuoteText) {
        newMsg.quote = currentQuoteText;
        cancelQuote(); // 发送后清空引用
    }
    
    history.push(newMsg);
    ChatDB.setItem(`chat_history_${currentLoginId}_${currentChatRoomCharId}`, JSON.stringify(history));
    
    let sessions = JSON.parse(ChatDB.getItem(`chat_sessions_${currentLoginId}`) || '[]');
    sessions = sessions.filter(id => id !== currentChatRoomCharId);
    sessions.unshift(currentChatRoomCharId);
    ChatDB.setItem(`chat_sessions_${currentLoginId}`, JSON.stringify(sessions));
    if (typeof renderChatList === 'function') renderChatList();

    inputEl.value = '';
    renderChatHistory(currentChatRoomCharId);
}

// 监听回车键发送
function handleChatInputKeydown(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendChatMessage();
    }
}

function openChatRoom(charId) {
    currentChatRoomCharId = charId;
    let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
    const char = chars.find(c => c.id === charId);
    
    const currentLoginId = ChatDB.getItem('current_login_account');
    let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
    const me = accounts.find(a => a.id === currentLoginId);
    
    if (char) {
        // 获取当前登录账号对该角色的备注
        let remarks = JSON.parse(ChatDB.getItem(`char_remarks_${currentLoginId}`) || '{}');
        // 优先级：备注 > 网名 > 角色名
        const displayName = remarks[charId] || char.netName || char.name || '未命名';
        
        document.getElementById('chatRoomTitle').innerText = displayName;
        
        // 渲染顶栏双头像
        document.getElementById('crHeaderAvatarMe').style.backgroundImage = `url('${me ? me.avatarUrl : ''}')`;
        document.getElementById('crHeaderAvatarChar').style.backgroundImage = `url('${char.avatarUrl || ''}')`;
        
        document.getElementById('chatRoomInput').value = '';
        closeChatPanels(); // 打开时确保面板关闭
        
        renderChatHistory(charId);
        
        document.getElementById('chatRoomPanel').style.display = 'flex';
    }
}

function closeChatRoom() {
    document.getElementById('chatRoomPanel').style.display = 'none';
    currentChatRoomCharId = null;
}
// ==========================================
// 角色详情主页逻辑 (仿微信他人主页)
// ==========================================
let currentProfileCharId = null;

function openCharProfilePanel(charId) {
    currentProfileCharId = charId;
    let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
    const char = chars.find(c => c.id === charId);
    
    if (char) {
        const avatarEl = document.getElementById('cpAvatar');
        avatarEl.style.backgroundImage = char.avatarUrl ? `url(${char.avatarUrl})` : '';
        
        // 获取当前登录账号对该角色的备注
        const currentLoginId = ChatDB.getItem('current_login_account');
        let remarks = JSON.parse(ChatDB.getItem(`char_remarks_${currentLoginId}`) || '{}');
        const remark = remarks[charId] || '';

        // 如果有备注，名字显示为：备注(原始名)，否则显示原始名
        const baseName = char.netName || char.name || '未命名';
        document.getElementById('cpName').innerText = remark ? `${remark} (${baseName})` : baseName;
        document.getElementById('cpRemarkValue').innerText = remark || '未设置';
        
        document.getElementById('cpAccount').innerText = '账号: ' + (char.account || '未设置');
        
        // 修改点：这里显示真实的 signature 字段，而不是 description(人设)
        document.getElementById('cpSign').innerText = char.signature || '该用户很懒，还没有写下签名。';
        
        document.getElementById('charProfilePanel').style.display = 'flex';
    }
}

// 新增函数：编辑备注
function editCharRemark() {
    if (!currentProfileCharId) return;
    const currentLoginId = ChatDB.getItem('current_login_account');
    let remarks = JSON.parse(ChatDB.getItem(`char_remarks_${currentLoginId}`) || '{}');
    
    const oldRemark = remarks[currentProfileCharId] || '';
    const newRemark = prompt('请输入备注名称（留空则删除备注）：', oldRemark);
    
    if (newRemark !== null) {
        if (newRemark.trim() === '') {
            delete remarks[currentProfileCharId];
        } else {
            remarks[currentProfileCharId] = newRemark.trim();
        }
        ChatDB.setItem(`char_remarks_${currentLoginId}`, JSON.stringify(remarks));
        openCharProfilePanel(currentProfileCharId); // 刷新详情页
        if (typeof renderChatList === 'function') renderChatList(); // 刷新聊天列表
        if (typeof renderContactList === 'function') renderContactList(); // 刷新通讯录
    }
}

function closeCharProfilePanel() {
    document.getElementById('charProfilePanel').style.display = 'none';
}

function startChatWithChar() {
    if (!currentProfileCharId) return;
    
    const currentLoginId = ChatDB.getItem('current_login_account');
    if (!currentLoginId) return alert('请先登录！');

    // 1. 确保角色在通讯录中
    let contacts = JSON.parse(ChatDB.getItem(`contacts_${currentLoginId}`) || '[]');
    if (!contacts.includes(currentProfileCharId)) {
        contacts.push(currentProfileCharId);
        ChatDB.setItem(`contacts_${currentLoginId}`, JSON.stringify(contacts));
    }

    // 2. 确保角色在会话列表中
    let sessions = JSON.parse(ChatDB.getItem(`chat_sessions_${currentLoginId}`) || '[]');
    if (!sessions.includes(currentProfileCharId)) {
        sessions.unshift(currentProfileCharId); // 添加到列表顶部
        ChatDB.setItem(`chat_sessions_${currentLoginId}`, JSON.stringify(sessions));
    }

    // 3. 关闭详情面板，切换到聊天列表 Tab，并刷新列表
    closeCharProfilePanel();
    switchWechatTab('chat');
    
    // 4. 直接打开全屏聊天页面
    openChatRoom(currentProfileCharId); 
}

// 清空聊天记录逻辑
function clearChatHistory() {
    if (!currentProfileCharId) return;
    const currentLoginId = ChatDB.getItem('current_login_account');
    if (!currentLoginId) return alert('请先登录！');

    if (confirm('确定要清空与该角色的所有聊天记录吗？此操作不可恢复。')) {
        ChatDB.setItem(`chat_history_${currentLoginId}_${currentProfileCharId}`, JSON.stringify([]));
        alert('聊天记录已清空！');
        if (typeof renderChatList === 'function') renderChatList(); // 刷新外层聊天列表
    }
}

// 删除好友逻辑
function deleteContactChar() {
    if (!currentProfileCharId) return;
    const currentLoginId = ChatDB.getItem('current_login_account');
    if (!currentLoginId) return alert('请先登录！');

    if (confirm('确定要将该角色从通讯录中删除吗？（删除后可通过搜索账号重新添加）')) {
        let contacts = JSON.parse(ChatDB.getItem(`contacts_${currentLoginId}`) || '[]');
        contacts = contacts.filter(id => id !== currentProfileCharId);
        ChatDB.setItem(`contacts_${currentLoginId}`, JSON.stringify(contacts));
        
        alert('已删除好友！');
        closeCharProfilePanel();
        
        // 刷新通讯录列表
        if (typeof renderContactList === 'function') renderContactList();
    }
}

// ==========================================
// 表情包管理逻辑
// ==========================================
let emojiGroups = JSON.parse(ChatDB.getItem('chat_emoji_groups') || '["默认分组"]');
let currentEmojiGroup = '默认分组';
let isEmojiGroupEditing = false;
let isEmojiEditing = false;

function openEmojiManagerPanel() {
    document.getElementById('emojiManagerPanel').style.display = 'flex';
    document.getElementById('emojiImportInput').value = '';
    isEmojiEditing = false;
    document.getElementById('emojiEditBtn').innerText = 'Edit';
    renderEmojiGroups();
    renderEmojis();
}

function closeEmojiManagerPanel() {
    document.getElementById('emojiManagerPanel').style.display = 'none';
    document.getElementById('emojiGroupPopup').classList.remove('show');
}

// --- 分组逻辑 ---
function toggleEmojiGroupPopup() {
    document.getElementById('emojiGroupPopup').classList.toggle('show');
}

function toggleEmojiGroupEditMode() {
    isEmojiGroupEditing = !isEmojiGroupEditing;
    const btn = document.getElementById('emojiGroupEditBtn');
    const popup = document.getElementById('emojiGroupPopup');
    if (isEmojiGroupEditing) {
        popup.classList.add('is-editing');
        btn.innerText = 'Done';
    } else {
        popup.classList.remove('is-editing');
        btn.innerText = 'Edit';
    }
}

function renderEmojiGroups() {
    const listEl = document.getElementById('emojiGroupList');
    listEl.innerHTML = '';
    emojiGroups.forEach(g => {
        const item = document.createElement('div');
        item.className = 'preset-item';
        item.innerHTML = `
            <span class="preset-item-name">${g}</span>
            <div class="preset-delete-btn" onclick="deleteEmojiGroup('${g}', event)">-</div>
        `;
        item.onclick = () => {
            if (!isEmojiGroupEditing) {
                currentEmojiGroup = g;
                document.getElementById('emojiCurrentGroupText').innerText = g;
                document.getElementById('emojiGroupPopup').classList.remove('show');
                renderEmojis();
            }
        };
        listEl.appendChild(item);
    });
}

function promptAddEmojiGroup() {
    const name = prompt("请输入新分组名称：");
    if (name && name.trim() !== "") {
        if (emojiGroups.includes(name.trim())) return alert('分组已存在！');
        emojiGroups.push(name.trim());
        ChatDB.setItem('chat_emoji_groups', JSON.stringify(emojiGroups));
        renderEmojiGroups();
    }
}

function deleteEmojiGroup(groupName, e) {
    e.stopPropagation();
    if (groupName === '默认分组') return alert('默认分组不可删除！');
    if (confirm(`确定删除分组 [${groupName}] 吗？该分组下的表情包将被移至默认分组。`)) {
        emojiGroups = emojiGroups.filter(g => g !== groupName);
        ChatDB.setItem('chat_emoji_groups', JSON.stringify(emojiGroups));
        
        let emojis = JSON.parse(ChatDB.getItem('chat_emojis') || '[]');
        emojis.forEach(em => { if (em.group === groupName) em.group = '默认分组'; });
        ChatDB.setItem('chat_emojis', JSON.stringify(emojis));
        
        if (currentEmojiGroup === groupName) {
            currentEmojiGroup = '默认分组';
            document.getElementById('emojiCurrentGroupText').innerText = '默认分组';
        }
        renderEmojiGroups();
        renderEmojis();
    }
}

// --- 导入与渲染逻辑 ---
function importEmojis() {
    const input = document.getElementById('emojiImportInput').value.trim();
    if (!input) return alert('请输入表情包信息！');

    let emojis = JSON.parse(ChatDB.getItem('chat_emojis') || '[]');
    const lines = input.split('\n');
    let addedCount = 0;

    lines.forEach(line => {
        // 支持中英文冒号分割
        const parts = line.split(/[:：]/);
        if (parts.length >= 2) {
            const desc = parts[0].trim();
            // URL可能包含冒号(https:)，所以要把后面的部分重新拼起来
            const url = parts.slice(1).join(':').trim();
            if (desc && url) {
                emojis.push({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    desc: desc,
                    url: url,
                    group: currentEmojiGroup
                });
                addedCount++;
            }
        }
    });

    if (addedCount > 0) {
        ChatDB.setItem('chat_emojis', JSON.stringify(emojis));
        document.getElementById('emojiImportInput').value = '';
        alert(`成功导入 ${addedCount} 个表情包！`);
        renderEmojis();
    } else {
        alert('未识别到有效的表情包格式，请检查输入！');
    }
}

let selectedEmojiIds = []; // 记录选中的表情包ID

function toggleEmojiEditMode() {
    isEmojiEditing = !isEmojiEditing;
    const btn = document.getElementById('emojiEditBtn');
    const grid = document.getElementById('emojiGrid');
    const actionBar = document.getElementById('emojiBatchActionBar');
    
    if (isEmojiEditing) {
        btn.innerText = 'Done';
        grid.classList.add('is-editing');
        actionBar.style.display = 'flex';
        selectedEmojiIds = []; // 进入编辑模式时清空选中
    } else {
        btn.innerText = 'Edit';
        grid.classList.remove('is-editing');
        actionBar.style.display = 'none';
        selectedEmojiIds = []; // 退出时清空选中
    }
    renderEmojis(); // 重新渲染以更新点击事件和UI
}

function renderEmojis() {
    const grid = document.getElementById('emojiGrid');
    grid.innerHTML = '';
    
    let emojis = JSON.parse(ChatDB.getItem('chat_emojis') || '[]');
    let currentEmojis = emojis.filter(e => e.group === currentEmojiGroup);

    if (currentEmojis.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #aaa; font-size: 12px; padding: 20px 0;">当前分组暂无表情包</div>';
        return;
    }

    currentEmojis.forEach(em => {
        const item = document.createElement('div');
        item.className = 'emoji-manager-item';
        
        const isSelected = selectedEmojiIds.includes(em.id);
        if (isEmojiEditing && isSelected) {
            item.classList.add('selected');
        }

        item.innerHTML = `
            <div class="emoji-manager-img" style="background-image: url('${em.url}');"></div>
            <div class="emoji-manager-desc">${em.desc}</div>
            ${isEmojiEditing ? `<div class="emoji-select-badge">${isSelected ? '✓' : ''}</div>` : ''}
        `;

        if (isEmojiEditing) {
            item.onclick = () => toggleEmojiSelection(em.id);
        }

        grid.appendChild(item);
    });
}

function toggleEmojiSelection(id) {
    if (selectedEmojiIds.includes(id)) {
        selectedEmojiIds = selectedEmojiIds.filter(i => i !== id);
    } else {
        selectedEmojiIds.push(id);
    }
    renderEmojis();
}

function batchDeleteEmojis() {
    if (selectedEmojiIds.length === 0) return alert('请先选择要删除的表情包！');
    if (confirm(`确定要删除选中的 ${selectedEmojiIds.length} 个表情包吗？`)) {
        let emojis = JSON.parse(ChatDB.getItem('chat_emojis') || '[]');
        emojis = emojis.filter(e => !selectedEmojiIds.includes(e.id));
        ChatDB.setItem('chat_emojis', JSON.stringify(emojis));
        selectedEmojiIds = [];
        renderEmojis();
    }
}

function openEmojiMoveModal() {
    if (selectedEmojiIds.length === 0) return alert('请先选择要移动的表情包！');
    
    const listEl = document.getElementById('emojiMoveGroupList');
    listEl.innerHTML = '';
    
    emojiGroups.forEach(g => {
        if (g === currentEmojiGroup) return; // 不显示当前分组
        const item = document.createElement('div');
        item.className = 'preset-item';
        item.innerHTML = `<span class="preset-item-name">${g}</span>`;
        item.onclick = () => confirmMoveEmojis(g);
        listEl.appendChild(item);
    });

    if (listEl.innerHTML === '') {
        listEl.innerHTML = '<div style="padding: 15px; text-align: center; color: #aaa; font-size: 12px;">暂无其他分组可移动</div>';
    }

    document.getElementById('emojiMoveModalOverlay').classList.add('show');
}

function closeEmojiMoveModal() {
    document.getElementById('emojiMoveModalOverlay').classList.remove('show');
}

function confirmMoveEmojis(targetGroup) {
    let emojis = JSON.parse(ChatDB.getItem('chat_emojis') || '[]');
    emojis.forEach(e => {
        if (selectedEmojiIds.includes(e.id)) {
            e.group = targetGroup;
        }
    });
    ChatDB.setItem('chat_emojis', JSON.stringify(emojis));
    
    alert(`成功将 ${selectedEmojiIds.length} 个表情包移动至 [${targetGroup}]`);
    selectedEmojiIds = [];
    closeEmojiMoveModal();
    toggleEmojiEditMode(); // 移动完成后自动退出编辑模式
}

// 点击空白处关闭分组弹窗
document.addEventListener('click', (e) => {
    const popup = document.getElementById('emojiGroupPopup');
    const title = document.querySelector('#emojiManagerPanel .header-title');
    if (popup && popup.classList.contains('show') && !popup.contains(e.target) && !title.contains(e.target)) {
        popup.classList.remove('show');
    }
});

// ==========================================
// 聊天室底部面板切换逻辑
// ==========================================

let chatRoomCurrentEmojiGroup = '默认分组'; // 新增：记录聊天室当前表情包分组

function toggleChatPanel(type) {
    const morePanel = document.getElementById('crMorePanel');
    const emojiPanel = document.getElementById('crEmojiPanel');
    
    if (type === 'more') {
        if (morePanel.classList.contains('show')) {
            morePanel.classList.remove('show');
        } else {
            morePanel.classList.add('show');
            emojiPanel.classList.remove('show');
        }
    } else if (type === 'emoji') {
        if (emojiPanel.classList.contains('show')) {
            emojiPanel.classList.remove('show');
        } else {
            renderChatRoomEmojis(); 
            emojiPanel.classList.add('show');
            morePanel.classList.remove('show');
        }
    }
}

// 处理更多面板功能点击
function handleMoreAction(action) {
    closeChatPanels();
    if (action === 'roll') {
        executeRollRedo();
    } else if (action === 'image') {
        document.getElementById('sendImageModalOverlay').classList.add('show');
    } else if (action === 'camera') {
        // 直接触发隐藏的拍照 input，唤起摄像头
        document.getElementById('chatCameraInput').click();
    } else {
        alert(`功能 [${action}] 正在开发中...`);
    }
}

// 优化：先判断是否存在 show 类再移除，减少不必要的 DOM 重绘导致卡顿
function closeChatPanels() {
    const morePanel = document.getElementById('crMorePanel');
    const emojiPanel = document.getElementById('crEmojiPanel');
    if (morePanel.classList.contains('show')) morePanel.classList.remove('show');
    if (emojiPanel.classList.contains('show')) emojiPanel.classList.remove('show');
    document.getElementById('chatRoomHistory').style.transform = 'translateY(0)';
}

// 新增：监听输入框获取焦点事件，延迟滚动到底部，避开键盘弹出的动画期，解决卡顿
document.getElementById('chatRoomInput').addEventListener('focus', () => {
    closeChatPanels();
    setTimeout(() => {
        const historyEl = document.getElementById('chatRoomHistory');
        historyEl.scrollTop = historyEl.scrollHeight;
    }, 300); // 延迟 300ms 等待键盘完全弹出
});
// Roll重回逻辑：以用户最新消息为标准重新生成
function executeRollRedo() {
    const currentLoginId = ChatDB.getItem('current_login_account');
    if (!currentLoginId || !currentChatRoomCharId) return;

    let history = JSON.parse(ChatDB.getItem(`chat_history_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
    
    // 从后往前找，找到最后一条 user 发送的消息
    let lastUserIndex = -1;
    for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].role === 'user') {
            lastUserIndex = i;
            break;
        }
    }

    if (lastUserIndex !== -1) {
        // 截断历史记录，保留到最后一条 user 消息
        history = history.slice(0, lastUserIndex + 1);
        ChatDB.setItem(`chat_history_${currentLoginId}_${currentChatRoomCharId}`, JSON.stringify(history));
        renderChatHistory(currentChatRoomCharId);
        
        // 触发重新生成
        generateApiReply();
    } else {
        alert('没有找到您发送的最新消息，无法重回！');
    }
}

// --- 发送图片相关逻辑 ---
function closeSendImageModal() {
    document.getElementById('sendImageModalOverlay').classList.remove('show');
}

function triggerLocalImageUpload() {
    closeSendImageModal();
    document.getElementById('chatLocalImageInput').click();
}

function handleSendLocalImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const imgUrl = e.target.result;
        const content = `<img src="${imgUrl}" class="chat-img-120">`;
        saveAndRenderUserMessage(content);
    }
    reader.readAsDataURL(file);
    event.target.value = ''; // 清空 input
}

// 专门处理直接拍照的逻辑
function handleCameraCapture(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const imgUrl = e.target.result;
        const content = `<img src="${imgUrl}" class="chat-img-120">`;
        saveAndRenderUserMessage(content);
    }
    reader.readAsDataURL(file);
    event.target.value = ''; // 清空 input
}

function triggerDescImageUpload() {
    closeSendImageModal();
    const desc = prompt('请输入图片画面的文字描述：');
    if (desc && desc.trim() !== '') {
        const content = `<div class="chat-desc-img-120"><div class="img-icon">🖼️</div><div class="img-text">${desc.trim()}</div></div>`;
        saveAndRenderUserMessage(content);
    }
}

function saveAndRenderUserMessage(content) {
    const currentLoginId = ChatDB.getItem('current_login_account');
    if (!currentLoginId || !currentChatRoomCharId) return;
    let history = JSON.parse(ChatDB.getItem(`chat_history_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
    history.push({ role: 'user', content: content, timestamp: Date.now() });
    ChatDB.setItem(`chat_history_${currentLoginId}_${currentChatRoomCharId}`, JSON.stringify(history));
    renderChatHistory(currentChatRoomCharId);
}

// 监听输入框获取焦点事件，延迟滚动到底部，避开键盘弹出的动画期，解决卡顿
document.getElementById('chatRoomInput').addEventListener('focus', () => {
    closeChatPanels();
    setTimeout(() => {
        const historyEl = document.getElementById('chatRoomHistory');
        historyEl.scrollTop = historyEl.scrollHeight;
    }, 300);
});

// 渲染聊天室内的表情包面板 (带分组)
function renderChatRoomEmojis() {
    const grid = document.getElementById('chatRoomEmojiGrid');
    const groupContainer = document.getElementById('chatRoomEmojiGroups');
    grid.innerHTML = '';
    groupContainer.innerHTML = '';
    
    let emojis = JSON.parse(ChatDB.getItem('chat_emojis') || '[]');
    let groups = JSON.parse(ChatDB.getItem('chat_emoji_groups') || '["默认分组"]');
    
    // 1. 渲染底部群组切换
    groups.forEach(g => {
        const gBtn = document.createElement('div');
        gBtn.className = `cr-emoji-group-item ${g === chatRoomCurrentEmojiGroup ? 'active' : ''}`;
        gBtn.innerText = g;
        gBtn.onclick = (e) => {
            e.stopPropagation(); // 防止触发关闭面板
            chatRoomCurrentEmojiGroup = g;
            renderChatRoomEmojis();
        };
        groupContainer.appendChild(gBtn);
    });

    // 2. 渲染当前群组的表情包
    let currentEmojis = emojis.filter(e => e.group === chatRoomCurrentEmojiGroup);
    
    if (currentEmojis.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: #888; font-size: 12px; padding: 40px 0;">该分组暂无表情包</div>';
        return;
    }

    currentEmojis.forEach(em => {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.flexDirection = 'column';
        item.style.alignItems = 'center';
        item.style.gap = '4px';
        item.style.cursor = 'pointer';
        item.style.width = '50px';
        item.onclick = (e) => {
            e.stopPropagation(); // 防止触发关闭面板
            sendEmojiMessage(em.url);
        };

        item.innerHTML = `
            <div style="width: 50px; height: 50px; background-image: url('${em.url}'); background-size: contain; background-position: center; background-repeat: no-repeat; border-radius: 8px; background-color: transparent;"></div>
            <div style="font-size: 10px; color: #555; width: 100%; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${em.desc}</div>
        `;
        grid.appendChild(item);
    });
}

// 发送表情包消息
function sendEmojiMessage(url) {
    if (!currentChatRoomCharId) return;
    const currentLoginId = ChatDB.getItem('current_login_account');
    if (!currentLoginId) return;

    let history = JSON.parse(ChatDB.getItem(`chat_history_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
    const content = `<img src="${url}" style="width: 100px; height: 100px; object-fit: contain; border-radius: 8px; display: block;">`;
    
    history.push({ role: 'user', content: content, timestamp: Date.now() });
    ChatDB.setItem(`chat_history_${currentLoginId}_${currentChatRoomCharId}`, JSON.stringify(history));
    
    let sessions = JSON.parse(ChatDB.getItem(`chat_sessions_${currentLoginId}`) || '[]');
    sessions = sessions.filter(id => id !== currentChatRoomCharId);
    sessions.unshift(currentChatRoomCharId);
    ChatDB.setItem(`chat_sessions_${currentLoginId}`, JSON.stringify(sessions));
    if (typeof renderChatList === 'function') renderChatList();

    renderChatHistory(currentChatRoomCharId);
    closeChatPanels();
}
// ==========================================
// 聊天室设置与美化逻辑 (背景 & CSS)
// ==========================================
let tempSelectedEmojiGroups = []; // 临时记录弹窗选中的分组

function openChatSettingsPanel() {
    document.getElementById('chatSettingsPanel').style.display = 'flex';
    renderChatBgLibrary();
    renderChatCssPresets();
    
    const currentCss = ChatDB.getItem('chat_current_css') || '';
    document.getElementById('chatCustomCssInput').value = currentCss;

    const currentLoginId = ChatDB.getItem('current_login_account');
    let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
    const me = accounts.find(a => a.id === currentLoginId);
    let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
    const char = chars.find(c => c.id === currentChatRoomCharId);

    document.getElementById('csUserAvatar').style.backgroundImage = "url('" + (me ? me.avatarUrl : '') + "')";
    document.getElementById('csCharAvatar').style.backgroundImage = "url('" + (char ? char.avatarUrl : '') + "')";

    // 新增：填充名称显示
    document.getElementById('csCharNameLabel').innerText = char ? (char.netName || char.name) : '未知角色';
    document.getElementById('csUserNameLabel').innerText = me ? me.netName : '我';

    document.getElementById('csContextLimit').value = ChatDB.getItem(`chat_context_limit_${currentChatRoomCharId}`) || '';
    document.getElementById('csMinReply').value = ChatDB.getItem(`chat_min_reply_${currentChatRoomCharId}`) || '';
    document.getElementById('csMaxReply').value = ChatDB.getItem(`chat_max_reply_${currentChatRoomCharId}`) || '';
    document.getElementById('csTimeAwareToggle').checked = ChatDB.getItem(`chat_time_aware_${currentChatRoomCharId}`) === 'true';

    // 更新表情包按钮文字
    tempSelectedEmojiGroups = JSON.parse(ChatDB.getItem(`chat_char_emoji_groups_${currentChatRoomCharId}`) || '[]');
    updateEmojiSelectBtnText();
}

function openEmojiSelectModal() {
    const listEl = document.getElementById('emojiSelectModalList');
    listEl.innerHTML = '';
    let emojiGroups = JSON.parse(ChatDB.getItem('chat_emoji_groups') || '["默认分组"]');
    
    emojiGroups.forEach(g => {
        const item = document.createElement('label');
        item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f9f9f9; border-radius: 10px; cursor: pointer;';
        const isChecked = tempSelectedEmojiGroups.includes(g);
        item.innerHTML = `
            <span style="font-size: 14px; color: #333;">${g}</span>
            <input type="checkbox" value="${g}" ${isChecked ? 'checked' : ''} class="modal-emoji-cb" style="width: 18px; height: 18px;">
        `;
        listEl.appendChild(item);
    });
    document.getElementById('emojiSelectModalOverlay').classList.add('show');
}

function confirmEmojiSelect() {
    const cbs = document.querySelectorAll('.modal-emoji-cb:checked');
    tempSelectedEmojiGroups = Array.from(cbs).map(cb => cb.value);
    updateEmojiSelectBtnText();
    document.getElementById('emojiSelectModalOverlay').classList.remove('show');
}

function updateEmojiSelectBtnText() {
    const btn = document.getElementById('csEmojiSelectBtn');
    if (tempSelectedEmojiGroups.length > 0) {
        btn.innerText = `已选 ${tempSelectedEmojiGroups.length} 个分组`;
        btn.style.color = '#111';
    } else {
        btn.innerText = '点击选择...';
        btn.style.color = '#888';
    }
}

function saveChatSettings() {
    const contextLimit = document.getElementById('csContextLimit').value;
    const minReply = document.getElementById('csMinReply').value;
    const maxReply = document.getElementById('csMaxReply').value;
    const timeAware = document.getElementById('csTimeAwareToggle').checked;

    ChatDB.setItem(`chat_context_limit_${currentChatRoomCharId}`, contextLimit);
    ChatDB.setItem(`chat_min_reply_${currentChatRoomCharId}`, minReply);
    ChatDB.setItem(`chat_max_reply_${currentChatRoomCharId}`, maxReply);
    ChatDB.setItem(`chat_time_aware_${currentChatRoomCharId}`, timeAware);
    ChatDB.setItem(`chat_char_emoji_groups_${currentChatRoomCharId}`, JSON.stringify(tempSelectedEmojiGroups));

    alert('设置已保存！');
    closeChatSettingsPanel();
}

function closeChatSettingsPanel() {
    document.getElementById('chatSettingsPanel').style.display = 'none';
}

// --- 聊天背景逻辑 ---
function handleChatBgUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imgUrl = e.target.result;
            let bgs = JSON.parse(ChatDB.getItem('chat_backgrounds') || '[]');
            bgs.push(imgUrl);
            ChatDB.setItem('chat_backgrounds', JSON.stringify(bgs));
            renderChatBgLibrary();
        }
        reader.readAsDataURL(file);
    }
}

function renderChatBgLibrary() {
    const grid = document.getElementById('chatBgLibraryGrid');
    grid.innerHTML = '';
    let bgs = JSON.parse(ChatDB.getItem('chat_backgrounds') || '[]');
    const currentBg = ChatDB.getItem('chat_current_bg') || '';

    // 默认无背景选项
    const defaultItem = document.createElement('div');
    defaultItem.style.cssText = `aspect-ratio: 9/16; background: #f4f4f4; border-radius: 8px; border: ${currentBg === '' ? '2px solid #111' : '1px solid #eee'}; display: flex; justify-content: center; align-items: center; font-size: 12px; color: #888; cursor: pointer;`;
    defaultItem.innerText = '默认';
    defaultItem.onclick = () => applyChatBg('');
    grid.appendChild(defaultItem);

    bgs.forEach((bg, index) => {
        const item = document.createElement('div');
        item.style.cssText = `aspect-ratio: 9/16; background-image: url('${bg}'); background-size: cover; background-position: center; border-radius: 8px; border: ${currentBg === bg ? '2px solid #111' : '1px solid #eee'}; cursor: pointer; position: relative;`;
        item.onclick = () => applyChatBg(bg);
        
        const delBtn = document.createElement('div');
        delBtn.innerHTML = '×';
        delBtn.style.cssText = 'position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; background: #ff3b30; color: #fff; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 14px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.2);';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            deleteChatBg(index);
        };
        item.appendChild(delBtn);
        grid.appendChild(item);
    });
}

function applyChatBg(bgUrl) {
    ChatDB.setItem('chat_current_bg', bgUrl);
    renderChatBgLibrary();
    updateChatRoomAppearance();
}

function deleteChatBg(index) {
    if (confirm('确定删除此背景吗？')) {
        let bgs = JSON.parse(ChatDB.getItem('chat_backgrounds') || '[]');
        const deletingBg = bgs[index];
        bgs.splice(index, 1);
        ChatDB.setItem('chat_backgrounds', JSON.stringify(bgs));
        
        if (ChatDB.getItem('chat_current_bg') === deletingBg) {
            applyChatBg(''); // 如果删除的是当前背景，恢复默认
        } else {
            renderChatBgLibrary();
        }
    }
}

// --- 自定义 CSS 逻辑 ---
function applyChatCustomCss() {
    const css = document.getElementById('chatCustomCssInput').value;
    ChatDB.setItem('chat_current_css', css);
    updateChatRoomAppearance();
    alert('CSS 已应用！');
}

function saveChatCssPreset() {
    const css = document.getElementById('chatCustomCssInput').value.trim();
    if (!css) return alert('CSS 内容为空！');
    const name = prompt('请输入预设名称：');
    if (name && name.trim()) {
        let presets = JSON.parse(ChatDB.getItem('chat_css_presets') || '[]');
        presets.push({ id: Date.now().toString(), name: name.trim(), css: css });
        ChatDB.setItem('chat_css_presets', JSON.stringify(presets));
        renderChatCssPresets();
    }
}

function renderChatCssPresets() {
    const list = document.getElementById('chatCssPresetList');
    list.innerHTML = '';
    let presets = JSON.parse(ChatDB.getItem('chat_css_presets') || '[]');
    
    if (presets.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: #aaa; font-size: 12px; padding: 10px 0;">暂无预设</div>';
        return;
    }

    presets.forEach(p => {
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: #f9f9f9; padding: 10px 15px; border-radius: 12px; border: 1px solid #eee;';
        item.innerHTML = `
            <span style="font-size: 14px; color: #333; font-weight: bold; cursor: pointer; flex: 1;" onclick="loadChatCssPreset('${p.id}')">${p.name}</span>
            <span style="color: #ff3b30; font-size: 18px; font-weight: bold; cursor: pointer; padding: 0 5px;" onclick="deleteChatCssPreset('${p.id}')">×</span>
        `;
        list.appendChild(item);
    });
}

function loadChatCssPreset(id) {
    let presets = JSON.parse(ChatDB.getItem('chat_css_presets') || '[]');
    const preset = presets.find(p => p.id === id);
    if (preset) {
        document.getElementById('chatCustomCssInput').value = preset.css;
        applyChatCustomCss();
    }
}

function deleteChatCssPreset(id) {
    if (confirm('确定删除此 CSS 预设吗？')) {
        let presets = JSON.parse(ChatDB.getItem('chat_css_presets') || '[]');
        presets = presets.filter(p => p.id !== id);
        ChatDB.setItem('chat_css_presets', JSON.stringify(presets));
        renderChatCssPresets();
    }
}

// --- 统一更新聊天室外观 ---
function updateChatRoomAppearance() {
    // 1. 更新背景
    const bgUrl = ChatDB.getItem('chat_current_bg') || '';
    const historyEl = document.getElementById('chatRoomHistory');
    if (historyEl) {
        if (bgUrl) {
            historyEl.style.backgroundImage = "url('" + bgUrl + "')";
            historyEl.style.backgroundSize = 'cover';
            historyEl.style.backgroundPosition = 'center';
            historyEl.style.backgroundAttachment = 'fixed';
        } else {
            historyEl.style.backgroundImage = 'none';
            historyEl.style.backgroundColor = 'transparent';
        }
    }

    // 2. 更新 CSS
    const css = ChatDB.getItem('chat_current_css') || '';
    let styleTag = document.getElementById('customChatCssTag');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'customChatCssTag';
        document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = css;
}

// 页面加载时初始化外观
document.addEventListener('DOMContentLoaded', () => {
    updateChatRoomAppearance();
});
// ==========================================
// 终极整合版 API 联机回复逻辑 (JSON协议 + 正则过滤 + 深度设定)
// ==========================================
async function generateApiReply() {
    const currentLoginId = ChatDB.getItem('current_login_account');
    if (!currentLoginId || !currentChatRoomCharId) return;

    const apiConfig = JSON.parse(ChatDB.getItem('current_api_config') || '{}');
    if (!apiConfig.url || !apiConfig.key || !apiConfig.model) {
        alert('请先在设置中配置 API 信息！');
        return;
    }

    // 1. 获取基础设定与限制
    const contextLimit = parseInt(ChatDB.getItem(`chat_context_limit_${currentChatRoomCharId}`)) || 0;
    const minReply = parseInt(ChatDB.getItem(`chat_min_reply_${currentChatRoomCharId}`)) || 0;
    const maxReply = parseInt(ChatDB.getItem(`chat_max_reply_${currentChatRoomCharId}`)) || 0;
    const timeAware = ChatDB.getItem(`chat_time_aware_${currentChatRoomCharId}`) === 'true';
    const boundEmojiGroups = JSON.parse(ChatDB.getItem(`chat_char_emoji_groups_${currentChatRoomCharId}`) || '[]');

    let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
    const char = chars.find(c => c.id === currentChatRoomCharId);
    if (!char) return;

    let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
    const account = accounts.find(a => a.id === currentLoginId);
    let personas = JSON.parse(ChatDB.getItem('chat_personas') || '[]');
    const persona = personas.find(p => p.id === (account ? account.personaId : null));

    const charName = char.name || 'Char';
    const userName = account ? (account.netName || 'User') : 'User';

    // 2. 获取历史记录并进行世界书扫描
    let fullHistory = JSON.parse(ChatDB.getItem(`chat_history_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
    let recentHistory = contextLimit > 0 ? fullHistory.slice(-contextLimit) : fullHistory.slice(-40);
    const recentTextForWb = recentHistory.slice(-5).map(m => m.content).join('\n');

    let activeWbs = { top: [], before: [], after: [], bottom: [] };
    if (char.wbEntries && char.wbEntries.length > 0) {
        let wbData = JSON.parse(ChatDB.getItem('worldbook_data')) || { entries: [] };
        let entries = wbData.entries.filter(e => char.wbEntries.includes(e.id));
        entries.forEach(entry => {
            let isActivated = entry.constant || false;
            if (!isActivated && entry.keywords) {
                let keys = entry.keywords.split(',').map(k => k.trim()).filter(k => k);
                for (let key of keys) {
                    let regex = new RegExp(key, 'i');
                    if (regex.test(recentTextForWb)) { isActivated = true; break; }
                }
            }
            if (isActivated) {
                let pos = entry.position || 'before';
                if (activeWbs[pos]) activeWbs[pos].push(entry.content);
            }
        });
    }

    // 3. 构建表情包映射
    let charEmojiMap = {}; 
    let charEmojis = [];
    if (boundEmojiGroups.length > 0) {
        let allEmojis = JSON.parse(ChatDB.getItem('chat_emojis') || '[]');
        charEmojis = allEmojis.filter(e => boundEmojiGroups.includes(e.group));
        charEmojis.forEach(e => { charEmojiMap[e.desc] = e.url; });
    }

    // 4. 构建 System Prompt (融合线上模式 + 严格 JSON 格式)
    const pad = (n) => n.toString().padStart(2, '0');
    const now = new Date();
    const currentTimeStr = `${now.getFullYear()}年${pad(now.getMonth() + 1)}月${pad(now.getDate())}日 ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    let systemPrompt = `你正在一个名为“微信”的线上聊天软件中扮演一个角色。请严格遵守以下规则：\n`;
    systemPrompt += `【核心规则】\n`;
    if (timeAware) {
        systemPrompt += `A. 当前时间：现在是 ${currentTimeStr}。你应知晓时间流逝，但除非对话相关，否则不要主动提及。\n`;
    } else {
        systemPrompt += `A. 时间感知：你没有时间观念，不知道现在几点。\n`;
    }
    systemPrompt += `B. 纯线上互动：这是一个完全虚拟的线上聊天。严禁提出线下见面或索要现实联系方式。你必须始终保持在线身份。\n\n`;

    if (activeWbs.top.length > 0) systemPrompt += `[背景设定]\n${activeWbs.top.join('\n')}\n\n`;
    
    systemPrompt += `【角色与对话规则】\n`;
    if (activeWbs.before.length > 0) systemPrompt += `${activeWbs.before.join('\n')}\n`;
    
    systemPrompt += `<char_settings>\n`;
    systemPrompt += `1. 你的名字：${charName}。我的称呼：${userName}。\n`;
    systemPrompt += `2. 你的设定：${char.description || "一个真实的聊天伙伴。"}\n`;
    if (char.scenario) systemPrompt += `3. 当前场景：${char.scenario}\n`;
    if (activeWbs.after.length > 0) systemPrompt += `${activeWbs.after.join('\n')}\n`;
    systemPrompt += `</char_settings>\n\n`;

    systemPrompt += `<user_settings>\n关于我的人设：${(persona && persona.persona) ? persona.persona : "普通用户"}\n</user_settings>\n`;
    
    if (activeWbs.bottom.length > 0) systemPrompt += `\n[补充信息]\n${activeWbs.bottom.join('\n')}\n`;

    // 强制 JSON 输出格式
    systemPrompt += `\n【输出格式严格要求】\n`;
    systemPrompt += `你必须且只能输出一个合法的 JSON 数组，数组中的每个对象代表一个独立的聊天气泡。\n`;
    systemPrompt += `文本消息格式: {"type":"text", "quote":"引用的对方的话(可选，仅在需要针对性回复时使用)", "content":"完整的一句话。"}\n`;
    systemPrompt += `图片消息格式: {"type":"image", "content":"图片画面的详细文字描述"}\n`; // 新增 AI 发送图片指令
    if (charEmojis.length > 0) {
        systemPrompt += `表情包格式: {"type":"sticker", "content":"表情包描述名称"}\n`;
        systemPrompt += `可用的表情包描述有：${charEmojis.map(e => e.desc).join(', ')}。请自然地穿插在对话中，不要滥用。\n`;
    }
    systemPrompt += `- 必须使用双引号 " 包裹键名和字符串值。\n`;
    systemPrompt += `- 严禁输出损坏的 JSON，严禁在 JSON 外部输出任何多余的字符（如 markdown 标记 \`\`\`json 等）。\n`;
    systemPrompt += `- 模拟真人打字聊天习惯/线上聊天的碎片化习惯，保持对话口语化、碎片化，保持回复气泡的随机性和多样性！\n`;

    if (minReply > 0 || maxReply > 0) {
        systemPrompt += `- 你的回复必须拆分为 ${minReply || 1} 到 ${maxReply || 10} 个独立的气泡（即 JSON 数组中的对象数量）。保持数量随机。\n`;
    }

    // 5. 构建消息数组
    let messages = [{ role: 'system', content: systemPrompt }];
    recentHistory.forEach(msg => {
        let content = msg.content;
        if (msg.type === 'forward_record') {
            // 将转发的聊天记录转换成文字喂给 AI
            const recordText = msg.forwardData.map(d => `${d.name}: ${d.content}`).join('\n');
            content = `*${userName} 转发了一段聊天记录*:\n${recordText}`;
        } else if (content.includes('<img')) {
            content = `*${userName} 发送了一个表情包*`;
        }
        messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: content });
    });

    // 6. 发送请求
    const apiBtn = document.querySelector('.cr-api-btn');
    const originalBtnHtml = apiBtn.innerHTML;
    apiBtn.innerHTML = '<div class="api-loading-spinner" style="width: 14px; height: 14px; border-color: rgba(255,255,255,0.3); border-top-color: #fff;"></div>';
    apiBtn.style.pointerEvents = 'none';

    const titleEl = document.getElementById('chatRoomTitle');
    const originalTitle = titleEl.innerText;
    titleEl.innerHTML = `<div class="api-loading-spinner" style="display:inline-block; width:12px; height:12px; margin-right:6px; border-color:rgba(0,0,0,0.1); border-top-color:#888; vertical-align:middle;"></div> Entering...`;

    try {
        const temp = parseFloat(apiConfig.temperature);
        const finalTemp = isNaN(temp) ? 0.8 : temp;

        const response = await fetch(`${apiConfig.url.replace(/\/$/, '')}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiConfig.key}` },
            body: JSON.stringify({ model: apiConfig.model, messages: messages, temperature: finalTemp })
        });

        if (response.ok) {
            const data = await response.json();
            let replyRaw = data.choices[0].message.content.trim();
            
            // 清理可能存在的 Markdown 标记
            replyRaw = replyRaw.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();

            let messagesArray = [];
            try {
                // 优化点：先尝试用正则把 [ ] 里的内容抠出来，防止 AI 输出废话导致解析崩溃
                const jsonMatch = replyRaw.match(/\[\s*\{.*\}\s*\]/s);
                const jsonStr = jsonMatch ? jsonMatch[0] : replyRaw;
                
                messagesArray = JSON.parse(jsonStr);
                if (!Array.isArray(messagesArray)) {
                    messagesArray = [messagesArray]; 
                }
            } catch (e) {
                // 优化点：如果真的解析失败了，尝试把 AI 的原始回复按换行符切分，
                // 这样即使 JSON 崩了，也不会显示源码，而是显示正常的文字。
                console.warn("JSON解析失败，启动换行符兜底方案");
                messagesArray = replyRaw.split('\n')
                                        .filter(line => line.trim() !== "")
                                        .map(line => ({ type: 'text', content: line.trim() }));
            }

            // 7. 模拟真人打字，一条一条渲染并延迟
            for (let i = 0; i < messagesArray.length; i++) {
                let msgObj = messagesArray[i];
                let finalContent = "";

                if (msgObj.type === 'sticker') {
                    const url = charEmojiMap[msgObj.content];
                    if (url) {
                        finalContent = `<img src="${url}" style="width: 100px; height: 100px; object-fit: contain; border-radius: 8px; display: block; margin: 5px 0;">`;
                    } else {
                        continue; // 如果表情包描述匹配不上，跳过这条消息
                    }
                } else if (msgObj.type === 'image') {
                    // 新增：处理 AI 发送的文字描述图片 (120x120px)
                    finalContent = `<div class="chat-desc-img-120"><div class="img-icon">🖼️</div><div class="img-text">${msgObj.content}</div></div>`;
                } else {
                    finalContent = msgObj.content;
                    if (!finalContent) continue; // 跳过空消息
                }

                let finalQuote = msgObj.quote || '';

                // 存入历史记录
                let updatedHistory = JSON.parse(ChatDB.getItem(`chat_history_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
                updatedHistory.push({ role: 'char', content: finalContent, quote: finalQuote, timestamp: Date.now() });
                ChatDB.setItem(`chat_history_${currentLoginId}_${currentChatRoomCharId}`, JSON.stringify(updatedHistory));
                
                // 渲染到界面
                renderChatHistory(currentChatRoomCharId);

                // 如果不是最后一条消息，等待 1 秒钟再发下一条
                if (i < messagesArray.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

        } else {
            const err = await response.json();
            alert('API 错误: ' + (err.error?.message || '未知错误'));
        }
    } catch (e) {
        alert('请求出错: ' + e.message);
    } finally {
        // 恢复按钮和顶部标题
        apiBtn.innerHTML = originalBtnHtml;
        apiBtn.style.pointerEvents = 'auto';
        titleEl.innerText = originalTitle;
    }
}
// ==========================================
// 聊天气泡长按菜单与多选逻辑
// ==========================================
let bubblePressTimer;
let currentActionMsgIndex = null;
let isChatMultiSelecting = false;
let selectedMsgIndices = [];
let currentQuoteText = '';

// 1. 长按触发逻辑
function handleBubbleTouchStart(e, index) {
    if (isChatMultiSelecting) return; // 多选模式下禁用长按
    
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    let clientY = e.touches ? e.touches[0].clientY : e.clientY;

    bubblePressTimer = setTimeout(() => {
        currentActionMsgIndex = index;
        showChatBubbleMenu(clientX, clientY);
    }, 500); // 500ms 长按
}

function handleBubbleTouchEnd() {
    clearTimeout(bubblePressTimer);
}

// 2. 显示/隐藏菜单
function showChatBubbleMenu(x, y) {
    const overlay = document.getElementById('chatBubbleMenuOverlay');
    const menu = document.getElementById('chatBubbleMenu');
    overlay.classList.add('show');
    
    // 动态计算位置防止溢出
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    
    setTimeout(() => {
        const rect = menu.getBoundingClientRect();
        let finalX = x;
        let finalY = y;
        if (x + rect.width > window.innerWidth - 20) finalX = window.innerWidth - rect.width - 20;
        if (y + rect.height > window.innerHeight - 20) finalY = window.innerHeight - rect.height - 20;
        menu.style.left = finalX + 'px';
        menu.style.top = finalY + 'px';
        menu.classList.add('show');
    }, 10);
}

function closeChatBubbleMenu() {
    document.getElementById('chatBubbleMenu').classList.remove('show');
    setTimeout(() => {
        document.getElementById('chatBubbleMenuOverlay').classList.remove('show');
    }, 150);
}

// 3. 菜单具体操作
function actionQuoteMessage() {
    closeChatBubbleMenu();
    const currentLoginId = ChatDB.getItem('current_login_account');
    let history = JSON.parse(ChatDB.getItem(`chat_history_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
    const msg = history[currentActionMsgIndex];
    
    if (msg) {
        // 核心修复：如果 content 不存在，给一个空字符串，防止 replace 报错
        let content = msg.content || "";
        let text = content.replace(/<img[^>]*>/g, '[图片]');
        currentQuoteText = text;
        
        document.getElementById('crInputQuoteText').innerText = text;
        document.getElementById('crInputQuotePreview').classList.add('show');
        document.getElementById('chatRoomInput').focus();
    }
}

function cancelQuote() {
    currentQuoteText = '';
    document.getElementById('crInputQuotePreview').classList.remove('show');
}

function actionEditMessage() {
    closeChatBubbleMenu();
    const currentLoginId = ChatDB.getItem('current_login_account');
    let history = JSON.parse(ChatDB.getItem(`chat_history_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
    const msg = history[currentActionMsgIndex];
    
    // 允许编辑文本，排除图片和特殊卡片
    if (msg && !msg.content.includes('chat-img-120') && !msg.content.includes('chat-desc-img-120') && !msg.content.includes('<img')) {
        document.getElementById('editMsgTextarea').value = msg.content;
        document.getElementById('editMsgModalOverlay').classList.add('show');
    } else {
        alert('图片或特殊消息无法编辑！');
    }
}

function closeEditMsgModal() {
    document.getElementById('editMsgModalOverlay').classList.remove('show');
}

function saveEditedMessage() {
    const newText = document.getElementById('editMsgTextarea').value.trim();
    if (newText !== '') {
        const currentLoginId = ChatDB.getItem('current_login_account');
        let history = JSON.parse(ChatDB.getItem(`chat_history_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
        history[currentActionMsgIndex].content = newText;
        ChatDB.setItem(`chat_history_${currentLoginId}_${currentChatRoomCharId}`, JSON.stringify(history));
        renderChatHistory(currentChatRoomCharId);
        closeEditMsgModal();
    } else {
        alert('消息内容不能为空！');
    }
}

function actionDeleteMessage() {
    closeChatBubbleMenu();
    if (confirm('确定删除这条消息吗？')) {
        const currentLoginId = ChatDB.getItem('current_login_account');
        let history = JSON.parse(ChatDB.getItem(`chat_history_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
        history.splice(currentActionMsgIndex, 1);
        ChatDB.setItem(`chat_history_${currentLoginId}_${currentChatRoomCharId}`, JSON.stringify(history));
        renderChatHistory(currentChatRoomCharId);
    }
}

// 4. 多选模式逻辑
function actionMultiSelect() {
    closeChatBubbleMenu();
    isChatMultiSelecting = true;
    selectedMsgIndices = [];
    
    document.getElementById('chatRoomHistory').classList.add('is-multi-selecting');
    document.getElementById('chatRoomBottomBar').style.display = 'none';
    document.getElementById('chatMultiActionBar').classList.add('show');
    
    // 默认选中当前长按的这条
    toggleMsgSelection(currentActionMsgIndex, document.querySelectorAll('.cr-msg-row')[currentActionMsgIndex]);
}

function exitMultiSelectMode() {
    isChatMultiSelecting = false;
    selectedMsgIndices = [];
    
    document.getElementById('chatRoomHistory').classList.remove('is-multi-selecting');
    document.getElementById('chatRoomBottomBar').style.display = 'flex';
    document.getElementById('chatMultiActionBar').classList.remove('show');
    
    // 取消所有勾选
    document.querySelectorAll('.cr-msg-checkbox').forEach(cb => cb.checked = false);
}

function toggleMsgSelection(index, rowEl) {
    const cb = rowEl.querySelector('.cr-msg-checkbox');
    if (selectedMsgIndices.includes(index)) {
        selectedMsgIndices = selectedMsgIndices.filter(i => i !== index);
        cb.checked = false;
    } else {
        selectedMsgIndices.push(index);
        cb.checked = true;
    }
}

function batchDeleteMessages() {
    if (selectedMsgIndices.length === 0) return alert('请先选择消息！');
    if (confirm(`确定删除选中的 ${selectedMsgIndices.length} 条消息吗？`)) {
        const currentLoginId = ChatDB.getItem('current_login_account');
        let history = JSON.parse(ChatDB.getItem(`chat_history_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
        
        // 从大到小排序删除，防止索引错乱
        selectedMsgIndices.sort((a, b) => b - a).forEach(idx => {
            history.splice(idx, 1);
        });
        
        ChatDB.setItem(`chat_history_${currentLoginId}_${currentChatRoomCharId}`, JSON.stringify(history));
        exitMultiSelectMode();
        renderChatHistory(currentChatRoomCharId);
    }
}

// 5. 转发逻辑
function batchForwardMessages() {
    if (selectedMsgIndices.length === 0) return alert('请先选择消息！');
    
    const currentLoginId = ChatDB.getItem('current_login_account');
    let contacts = JSON.parse(ChatDB.getItem(`contacts_${currentLoginId}`) || '[]');
    let allChars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
    let remarks = JSON.parse(ChatDB.getItem(`char_remarks_${currentLoginId}`) || '{}');
    
    const listEl = document.getElementById('forwardContactList');
    listEl.innerHTML = '';
    
    const friends = contacts.map(id => allChars.find(c => c.id === id)).filter(c => c && c.id !== currentChatRoomCharId);
    
    if (friends.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; color:#aaa; font-size:12px;">暂无其他好友可转发</div>';
    } else {
        friends.forEach(f => {
            const displayName = remarks[f.id] || f.netName || f.name;
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; align-items: center; gap: 10px; padding: 10px; background: #f9f9f9; border-radius: 10px; cursor: pointer;';
            item.innerHTML = `
                <div style="width: 36px; height: 36px; border-radius: 8px; background-image: url('${f.avatarUrl || ''}'); background-size: cover; background-color: #eee;"></div>
                <div style="font-size: 14px; font-weight: bold; color: #333;">${displayName}</div>
            `;
            item.onclick = () => confirmForward(f.id);
            listEl.appendChild(item);
        });
    }
    
    document.getElementById('forwardModalOverlay').classList.add('show');
}

function closeForwardModal() {
    document.getElementById('forwardModalOverlay').classList.remove('show');
}

function confirmForward(targetCharId) {
    const currentLoginId = ChatDB.getItem('current_login_account');
    let sourceHistory = JSON.parse(ChatDB.getItem(`chat_history_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
    let targetHistory = JSON.parse(ChatDB.getItem(`chat_history_${currentLoginId}_${targetCharId}`) || '[]');
    
    let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
    const sourceChar = chars.find(c => c.id === currentChatRoomCharId);
    let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
    const me = accounts.find(a => a.id === currentLoginId);
    
    const myName = me ? me.netName : '我';
    const charName = sourceChar ? (sourceChar.netName || sourceChar.name) : '对方';

    // 提取选中的消息
    let selectedMsgs = selectedMsgIndices.sort((a, b) => a - b).map(idx => sourceHistory[idx]);
    
    // 生成预览行 (前3条)
    let previewLines = selectedMsgs.slice(0, 3).map(msg => {
        const name = msg.role === 'user' ? myName : charName;
        // 核心修复：确保 msg.content 存在再调用 includes
        let content = msg.content || "";
        let text = content.includes('<img') ? '[动画表情]' : content;
        return `${name}: ${text}`;
    });

    // 构建转发对象
    const forwardMsg = {
        role: 'user',
        type: 'forward_record',
        forwardTitle: `${myName}和${charName}的聊天记录`,
        forwardPreview: previewLines,
        sourceUserAvatar: me ? me.avatarUrl : '',
        sourceCharAvatar: sourceChar ? sourceChar.avatarUrl : '',
        forwardData: selectedMsgs.map(m => ({
            role: m.role,
            name: m.role === 'user' ? myName : charName,
            content: m.content
        })),
        timestamp: Date.now()
    };
    
    targetHistory.push(forwardMsg);
    ChatDB.setItem(`chat_history_${currentLoginId}_${targetCharId}`, JSON.stringify(targetHistory));
    
    alert('转发成功！');
    closeForwardModal();
    exitMultiSelectMode();
}
// 打开转发详情
function openForwardDetail(indexOrData) {
    const contentEl = document.getElementById('forwardDetailContent');
    contentEl.innerHTML = '';
    
    let dataToRender = [];

    // 判断传入的是索引号还是老版本的数据数组
    if (typeof indexOrData === 'number' || typeof indexOrData === 'string') {
        const currentLoginId = ChatDB.getItem('current_login_account');
        let history = JSON.parse(ChatDB.getItem(`chat_history_${currentLoginId}_${currentChatRoomCharId}`) || '[]');
        const msg = history[parseInt(indexOrData)];
        if (msg && msg.type === 'forward_record') {
            dataToRender = msg.forwardData;
        }
    } else if (Array.isArray(indexOrData)) {
        dataToRender = indexOrData; // 兼容老版本数据
    }

    dataToRender.forEach(item => {
        const div = document.createElement('div');
        // 移除了 flex 布局，改为垂直排列，并删除了头像 div
        div.style.cssText = 'margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #f5f5f5;';
        div.innerHTML = `
            <div style="font-size: 12px; color: #888; margin-bottom: 6px; font-weight: bold;">${item.name}</div>
            <div style="font-size: 15px; color: #333; line-height: 1.5; word-break: break-all;">${item.content || ""}</div>
        `;
        contentEl.appendChild(div);
    });
    
    document.getElementById('forwardDetailOverlay').classList.add('show');
}

function closeForwardDetail() {
    document.getElementById('forwardDetailOverlay').classList.remove('show');
}
