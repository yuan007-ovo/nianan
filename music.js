// ==========================================
// Music 模块专属逻辑 (music.js)
// ==========================================

const musicPanel = document.getElementById('musicPanel');
const musicLoginPanel = document.getElementById('musicLoginPanel');

// 音乐播放器核心实例
const audioPlayer = new Audio();
let currentPlayingSong = null;

// 音乐 API 配置 (完全还原 script.js 逻辑)
let currentMusicSearchApi = localStorage.getItem('music_search_api') || 'primary';
let currentMusicPlayApi = localStorage.getItem('music_play_api') || 'miemie';

function getMusicSearchApiUrl() {
    if (currentMusicSearchApi === 'secondary') return 'https://ncmapi.btwoa.com';
    if (currentMusicSearchApi === 'tertiary') return 'https://ncm.zhenxin.me'; 
    if (currentMusicSearchApi === 'api4') return 'https://api-music.kingcola-icg.cn'; 
    if (currentMusicSearchApi === 'api5') return 'https://neteaseapi.gksm.store'; 
    return 'https://zm.wwoyun.cn'; // primary
}

function getMusicPlayApiUrl() {
    if (currentMusicPlayApi === 'zhizhi') return 'https://api.msls1441.com';
    return 'https://api.qijieya.cn/meting'; // miemie
}

// ==========================================
// 1. 登录与基础面板逻辑
// ==========================================
function openMusicApp() {
    const musicLoginId = ChatDB.getItem('music_current_login_account');
    if (musicLoginId) {
        let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
        if (accounts.some(a => a.id === musicLoginId)) {
            enterMusicMain();
            return;
        } else {
            ChatDB.removeItem('music_current_login_account');
        }
    }
    renderMusicAccountList();
    musicLoginPanel.style.display = 'flex';
}

// 处理个人主页背景上传
function handleMusicMeBgUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imgUrl = e.target.result;
            
            // 1. 先直接应用到页面上，保证立刻有反应
            const bgEl = document.getElementById('musicMeBg');
            if (bgEl) {
                bgEl.style.backgroundImage = `url('${imgUrl}')`;
            }
            
            // 2. 再尝试保存到本地数据库 (加 try-catch 防止图片太大爆内存报错)
            const musicLoginId = ChatDB.getItem('music_current_login_account');
            if (musicLoginId) {
                try {
                    ChatDB.setItem(`music_me_bg_${musicLoginId}`, imgUrl);
                } catch (err) {
                    console.warn("图片过大，无法持久化保存", err);
                    alert("图片体积过大，本次已应用，但可能无法永久保存。建议使用压缩后的图片。");
                }
            }
        }
        reader.readAsDataURL(file);
    }
    event.target.value = '';
}

function renderMusicAccountList() {
    const listEl = document.getElementById('musicAccountSelectList');
    listEl.innerHTML = '';
    let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
    if (accounts.length === 0) {
        listEl.innerHTML = '<div style="text-align: center; color: #aaa; font-size: 13px; margin-top: 20px;">暂无可用账号，请先在 Chat 中注册</div>';
        return;
    }
    accounts.forEach(acc => {
        const card = document.createElement('div');
        card.className = 'music-account-card';
        card.onclick = () => {
            ChatDB.setItem('music_current_login_account', acc.id);
            musicLoginPanel.style.display = 'none';
            enterMusicMain();
        };
        card.innerHTML = `
            <div class="music-account-avatar" style="background-image: url('${acc.avatarUrl || ''}')"></div>
            <div class="music-account-info">
                <div class="music-account-name">${acc.netName || '未命名'}</div>
                <div class="music-account-id">Account: ${acc.account}</div>
            </div>
        `;
        listEl.appendChild(card);
    });
}

function closeMusicLoginPanel() { musicLoginPanel.style.display = 'none'; }

function enterMusicMain() {
    renderMusicMePage();
    renderMusicFriends();
    musicPanel.style.display = 'flex';
}

function closeMusicPanel() { musicPanel.style.display = 'none'; }

function switchMusicTab(tabName) {
    document.querySelectorAll('.music-tab-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.music-nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('music-page-' + tabName).classList.add('active');
    
    const btns = document.querySelectorAll('.music-nav-btn');
    const addFriendIcon = document.getElementById('music-header-add-friend');
    const settingsIcon = document.getElementById('music-header-settings');
    
    if (addFriendIcon) addFriendIcon.style.display = 'none';
    if (settingsIcon) settingsIcon.style.display = 'none';

    if(tabName === 'home') {
        btns[0].classList.add('active');
        // 【新增】：每次进入主页时拉取推荐歌单
        fetchMusicRecommendPlaylists();
    }
    if(tabName === 'friends') { 
        btns[1].classList.add('active'); 
        if (addFriendIcon) {
            addFriendIcon.style.display = 'block'; 
            addFriendIcon.style.stroke = '#ccc';
            addFriendIcon.style.strokeWidth = '3';
        }
        renderMusicFriends(); 
    }
    if(tabName === 'me') { 
        btns[2].classList.add('active'); 
        if (settingsIcon) settingsIcon.style.display = 'block'; 
        renderMusicMePage(); 
    }
}

// ==========================================
// 2. 个人主页与设置面板
// ==========================================
// 修改后 (music.js 约 130 行)
function renderMusicMePage() {
    const musicLoginId = ChatDB.getItem('music_current_login_account');
    if (!musicLoginId) return;
    let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
    const account = accounts.find(a => a.id === musicLoginId);
    if (!account) return;

    document.getElementById('musicMeName').innerText = account.netName || '未命名';
    document.getElementById('musicMeAvatar').style.backgroundImage = account.avatarUrl ? `url(${account.avatarUrl})` : 'none';
    
    // 【修复】：读取并设置背景，防止刷新丢失
    const savedBg = ChatDB.getItem(`music_me_bg_${musicLoginId}`);
    const bgEl = document.getElementById('musicMeBg');
    if (bgEl) {
        if (savedBg) {
            bgEl.style.backgroundImage = `url('${savedBg}')`;
        } else {
            bgEl.style.backgroundImage = 'none';
            bgEl.style.backgroundColor = '#ccc';
        }
    }

    // 【新增】：动态计算关注、粉丝、时长
    let friends = JSON.parse(ChatDB.getItem(`music_friends_${musicLoginId}`) || '[]');
    let friendCount = friends.length;
    
    // 假设听歌时长保存在本地，每次播放累加（这里简单读取，如果没有则给个随机初始值）
    let listenTime = parseInt(ChatDB.getItem(`music_listen_time_${musicLoginId}`) || '0');
    if (listenTime === 0) {
        listenTime = Math.floor(Math.random() * 100) + 10; // 随机给点初始时长
        ChatDB.setItem(`music_listen_time_${musicLoginId}`, listenTime);
    }
    
    // 计算等级 (简单公式：时长 / 20)
    let level = Math.floor(listenTime / 20) + 1;
    if (level > 10) level = 10;

    // 更新 DOM
    const statsContainer = document.querySelector('#musicMeBg > div > div:nth-child(4)');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div><span>${friendCount}</span> 关注</div>
            <div><span>${friendCount}</span> 粉丝</div>
            <div>Lv.${level}</div>
            <div><span>${listenTime}</span> 小时</div>
        `;
    }
    
    renderMyPlaylists();
}

function updateMusicApiUI() {
    ['primary', 'secondary', 'tertiary', 'api4', 'api5'].forEach(api => {
        const el = document.getElementById(`api-search-${api}`);
        if (el) {
            el.style.color = currentMusicSearchApi === api ? '#007AFF' : '#111';
            el.innerHTML = currentMusicSearchApi === api ? `${el.innerText.replace(' ✓', '')} ✓` : el.innerText.replace(' ✓', '');
        }
    });
    ['miemie', 'zhizhi'].forEach(api => {
        const el = document.getElementById(`api-play-${api}`);
        if (el) {
            el.style.color = currentMusicPlayApi === api ? '#007AFF' : '#111';
            el.innerHTML = currentMusicPlayApi === api ? `${el.innerText.replace(' ✓', '')} ✓` : el.innerText.replace(' ✓', '');
        }
    });
}

function openMusicSettingsPanel() {
    updateMusicApiUI();
    document.getElementById('musicSettingsPanel').style.display = 'flex';
}

function closeMusicSettingsPanel() {
    document.getElementById('musicSettingsPanel').style.display = 'none';
}

function logoutMusicApp() {
    if (confirm('确定要退出当前音乐账号吗？')) {
        ChatDB.removeItem('music_current_login_account');
        closeMusicSettingsPanel();
        musicPanel.style.display = 'none';
        openMusicApp(); 
    }
}

function musicSetSearchApi(api) {
    currentMusicSearchApi = api;
    localStorage.setItem('music_search_api', api);
    updateMusicApiUI(); 
}

function musicSetPlayApi(api) {
    currentMusicPlayApi = api;
    localStorage.setItem('music_play_api', api);
    updateMusicApiUI(); 
}

// ==========================================
// 3. 在线搜索与播放逻辑 (纯净原生 Fetch)
// ==========================================
function musicHandleSearchEnter(e) {
    if (e.key === 'Enter') {
        musicPerformSearch();
    }
}

async function musicPerformSearch() {
    const kw = document.getElementById('music-search-input').value.trim();
    const resultsContainer = document.getElementById('music-search-results');
    const banner = document.getElementById('music-home-banner');
    
    // 隐藏其他区域，实现全屏搜索
    const navIcons = document.querySelector('.music-nav-icons');
    const playlistGrid = document.querySelector('.music-playlist-grid');
    const sectionTitle = document.querySelector('.music-section-title');
    
    if (navIcons) navIcons.style.display = kw ? 'none' : 'flex';
    if (playlistGrid) playlistGrid.style.display = kw ? 'none' : 'grid';
    if (sectionTitle) sectionTitle.style.display = kw ? 'none' : 'flex';
    
    if (!kw) {
        resultsContainer.innerHTML = '';
        banner.style.display = 'flex';
        return;
    }

    banner.style.display = 'none';
    resultsContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#888; font-size:13px;">正在搜索...</div>';

    try {
        const baseUrl = getMusicSearchApiUrl();
        const res = await fetch(`${baseUrl}/cloudsearch?keywords=${encodeURIComponent(kw)}&timestamp=${Date.now()}`);
        const data = await res.json();
        
        console.log("搜索结果:", data); 
        
        if (data.code === 200 && data.result && data.result.songs && data.result.songs.length > 0) {
            resultsContainer.innerHTML = '';
            data.result.songs.forEach(song => {
                const title = song.name;
                const artist = song.ar ? song.ar.map(a => a.name).join(', ') : '未知歌手';
                const cover = (song.al && song.al.picUrl) ? song.al.picUrl + '?param=100y100' : 'https://p2.music.126.net/6y-7YvS_G8V8.jpg?param=100y100';
                
                const item = document.createElement('div');
                item.className = 'music-song-item';
                item.onclick = () => musicPlaySong(song.id, title, artist, cover);
                // 【修改】：增加一个加号按钮用于添加到歌单
                item.innerHTML = `
                    <img src="${cover}" class="music-song-cover">
                    <div class="music-song-info">
                        <div class="music-song-title">${title}</div>
                        <div class="music-song-artist">${artist}</div>
                    </div>
                    <div class="music-song-action" onclick="event.stopPropagation(); openAddToPlaylistModal('${song.id}', '${title.replace(/'/g, "\\'")}', '${artist.replace(/'/g, "\\'")}', '${cover}')" style="background: #f0f0f0; color: #333; margin-right: 5px; padding: 6px 10px;">+</div>
                    <div class="music-song-action">播放</div>
                `;
                resultsContainer.appendChild(item);
            });
        } else {
            resultsContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#888; font-size:13px;">未找到相关歌曲</div>';
        }
    } catch (e) {
        console.error("Search Error:", e);
        resultsContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#ff3b30; font-size:13px;">搜索失败，请尝试切换音源</div>';
    }
}

async function musicPlaySong(id, title, artist, cover) {
    try {
        // 更新底部悬浮播放器 UI
        document.querySelector('.music-player-title').innerText = title;
        document.querySelector('.music-player-sub').innerText = artist;
        document.querySelector('.music-player-disc-inner').style.backgroundImage = `url(${cover})`;
        document.querySelector('.music-player-disc-inner').style.backgroundSize = 'cover';
        
        // 更新全屏播放器 UI (如果有的话)
        const mpSongName = document.getElementById('mpSongName');
        if (mpSongName) mpSongName.innerText = title;
        const mpArtistName = document.getElementById('mpArtistName');
        if (mpArtistName) mpArtistName.innerText = artist;
        const mpDiscCover = document.getElementById('mpDiscCover');
        if (mpDiscCover) mpDiscCover.style.backgroundImage = `url(${cover})`;
        
        // 【新增】：同步更新歌词区域的标题和歌手
        const mpLyricTitle = document.getElementById('mpLyricTitle');
        if (mpLyricTitle) mpLyricTitle.innerText = title;
        const mpLyricArtist = document.getElementById('mpLyricArtist');
        if (mpLyricArtist) mpLyricArtist.innerText = artist;
        
        currentPlayingSong = { id, title, artist, cover };

        const playBaseUrl = getMusicPlayApiUrl();
        const res = await fetch(`${playBaseUrl}/?server=netease&type=song&id=${id}`);
        const data = await res.json();
        
        console.log("播放链接数据:", data); 
        
        let songUrl = '';
        if (data && data.length > 0) {
            if (data[0].url) songUrl = data[0].url.replace('http://', 'https://');
            if (data[0].title) title = data[0].title;
            if (data[0].author) artist = data[0].author;
            if (data[0].pic) cover = data[0].pic;
        }
        
        if (songUrl) {
            audioPlayer.src = songUrl;
            const playPromise = audioPlayer.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    const disc = document.querySelector('.mp-disc-outer');
                    if (disc) disc.style.animationPlayState = 'running';
                    
                    // 更新背景 (加上引号防止 URL 包含特殊字符失效)
                    const playerPanel = document.getElementById('musicPlayerPanel');
                    if (playerPanel) {
                        // 【修复】：如果用户设置了自定义背景，则不使用歌曲封面覆盖
                        const musicLoginId = ChatDB.getItem('music_current_login_account');
                        const savedBg = musicLoginId ? ChatDB.getItem(`music_player_bg_${musicLoginId}`) : null;
                        if (!savedBg) {
                            playerPanel.style.backgroundImage = `url('${cover}')`;
                        }
                    }
                }).catch(e => {
                    // 捕获并忽略快速切换导致的 AbortError
                    if (e.name === 'AbortError') {
                        console.log('播放请求被中断 (正常现象)');
                    } else {
                        alert(`《${title}》可能是 VIP 专属或无版权，无法自动播放。`);
                        const disc = document.querySelector('.mp-disc-outer');
                        if (disc) disc.style.animationPlayState = 'paused';
                    }
                });
            }
        } else {
            alert(`《${title}》无版权或需要 VIP，无法获取播放链接。`);
        }
    } catch (e) {
        console.error("Play Error:", e);
        alert("获取歌曲信息失败，请尝试切换播放源。");
    }
}

// ==========================================
// 4. 歌单管理 (新建、本地封面、URL导入、UID导入)
// ==========================================
let tempLocalCoverBase64 = null;

function renderMyPlaylists() {
    const musicLoginId = ChatDB.getItem('music_current_login_account');
    const container = document.getElementById('music-my-playlist-container');
    if (!container || !musicLoginId) return;
    
    let savedPlaylists = JSON.parse(ChatDB.getItem(`music_playlists_${musicLoginId}`) || '[]');
    container.innerHTML = '';
    
    // 1. 渲染已有的歌单
    savedPlaylists.forEach(pl => {
        const div = document.createElement('div');
        div.className = 'music-pl-item';
        // 【修改】：点击整个歌单进入详情页
        div.onclick = () => openPlaylistDetail(pl.id);
        div.innerHTML = `
            <div class="music-pl-cover" style="background-image: url('${pl.cover}?param=100y100');"></div>
            <div class="music-pl-info">
                <div class="music-pl-title">${pl.name}</div>
                <div class="music-pl-sub">歌单 · ${pl.trackCount || 0}首</div>
            </div>
            <!-- 【修改】：点击右侧图标打开编辑弹窗，并阻止冒泡 -->
            <div class="music-pl-action" onclick="event.stopPropagation(); openEditPlaylistModal('${pl.id}')">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="#ccc"><circle cx="12" cy="5" r="2"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="12" cy="19" r="2"></circle></svg>
            </div>
        `;
        container.appendChild(div);
    });

    // 2. 渲染“新建歌单”按钮
    const createDiv = document.createElement('div');
    createDiv.className = 'music-pl-item';
    createDiv.onclick = () => {
        document.getElementById('music-create-pl-name').value = '';
        document.getElementById('music-create-pl-cover').value = '';
        tempLocalCoverBase64 = null;
        document.getElementById('musicCreatePlaylistModal').classList.add('show');
    };
    createDiv.innerHTML = `
        <div class="music-pl-cover">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="#aaa" stroke-width="2" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </div>
        <div class="music-pl-info">
            <div class="music-pl-title">新建歌单</div>
        </div>
    `;
    container.appendChild(createDiv);

    // 3. 渲染“导入外部歌单”按钮
    const importDiv = document.createElement('div');
    importDiv.className = 'music-pl-item';
    importDiv.onclick = () => {
        // 【修改】：改为弹出选择弹窗
        document.getElementById('musicImportSelectModal').classList.add('show');
    };
    importDiv.innerHTML = `
        <div class="music-pl-cover">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="#aaa" stroke-width="2" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
        </div>
        <div class="music-pl-info">
            <div class="music-pl-title">导入外部歌单</div>
            <div class="music-pl-sub">轻松导入其他APP里的歌单</div>
        </div>
    `;
    container.appendChild(importDiv);
}

// 处理本地封面上传
function musicHandleLocalCoverUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            tempLocalCoverBase64 = e.target.result;
            document.getElementById('music-create-pl-cover').value = '已选择本地图片';
        };
        reader.readAsDataURL(file);
    }
    event.target.value = '';
}

function musicCreatePlaylist() {
    const name = document.getElementById('music-create-pl-name').value.trim();
    const coverUrl = document.getElementById('music-create-pl-cover').value.trim();
    
    if (!name) return alert("请输入歌单标题！");

    let finalCover = 'https://p2.music.126.net/6y-7YvS_G8V8.jpg'; // 默认封面
    if (tempLocalCoverBase64) {
        finalCover = tempLocalCoverBase64;
    } else if (coverUrl && coverUrl !== '已选择本地图片') {
        finalCover = coverUrl;
    }

    const musicLoginId = ChatDB.getItem('music_current_login_account');
    let savedPlaylists = JSON.parse(ChatDB.getItem(`music_playlists_${musicLoginId}`) || '[]');
    
    savedPlaylists.push({
        id: Date.now().toString(),
        name: name,
        cover: finalCover,
        trackCount: 0,
        tracks: []
    });
    
    ChatDB.setItem(`music_playlists_${musicLoginId}`, JSON.stringify(savedPlaylists));
    document.getElementById('musicCreatePlaylistModal').classList.remove('show');
    renderMyPlaylists();
}

// 方式一：URL 链接导入单歌单
async function musicImportByUrl() {
    const inputVal = document.getElementById('music-import-url-input').value.trim();
    if (!inputVal) return alert("请输入网易云歌单链接或 ID！");

    let plId = "";
    const idMatch = inputVal.match(/id=(\d+)/);
    if (idMatch) {
        plId = idMatch[1];
    } else if (/^\d+$/.test(inputVal)) {
        plId = inputVal;
    } else {
        return alert("无法识别歌单 ID，请检查链接格式。");
    }

    const btn = document.getElementById('music-btn-import-url');
    const originalText = btn.innerText;
    btn.innerText = "解析中...";
    btn.style.opacity = "0.5";
    btn.style.pointerEvents = "none";

    try {
        const baseUrl = getMusicSearchApiUrl();
        const timestamp = Date.now();
        
        const resDetail = await fetch(`${baseUrl}/playlist/detail?id=${plId}&timestamp=${timestamp}`);
        const dataDetail = await resDetail.json();
        
        console.log("URL导入歌单详情:", dataDetail);
        
        if (dataDetail.code === 200 && dataDetail.playlist) {
            const resTracks = await fetch(`${baseUrl}/playlist/track/all?id=${plId}&limit=1000&timestamp=${timestamp}`);
            const dataTracks = await resTracks.json();
            
            let tracks = [];
            if (dataTracks.code === 200 && dataTracks.songs) {
                tracks = dataTracks.songs.map(song => ({
                    id: song.id,
                    title: song.name,
                    artist: song.ar ? song.ar.map(a => a.name).join(', ') : '未知歌手',
                    cover: (song.al && song.al.picUrl) ? song.al.picUrl + '?param=100y100' : 'https://p2.music.126.net/6y-7YvS_G8V8.jpg?param=100y100'
                }));
            }
            
            const musicLoginId = ChatDB.getItem('music_current_login_account');
            let savedPlaylists = JSON.parse(ChatDB.getItem(`music_playlists_${musicLoginId}`) || '[]');

            const exists = savedPlaylists.find(p => p.id === dataDetail.playlist.id);
            if (!exists) {
                savedPlaylists.push({
                    id: dataDetail.playlist.id,
                    name: dataDetail.playlist.name,
                    cover: dataDetail.playlist.coverImgUrl || 'https://p2.music.126.net/6y-7YvS_G8V8.jpg',
                    trackCount: tracks.length,
                    tracks: tracks
                });
                ChatDB.setItem(`music_playlists_${musicLoginId}`, JSON.stringify(savedPlaylists));
                renderMyPlaylists();
                alert("导入成功！");
                document.getElementById('musicImportModal').classList.remove('show');
            } else {
                alert("该歌单已存在，请勿重复导入！");
            }
        } else {
            alert("获取歌单详情失败，请确保歌单已在网易云设置为公开！");
        }
    } catch (e) {
        console.error("URL Import Error:", e);
        alert("导入失败，网络异常或接口不可用。");
    } finally {
        btn.innerText = originalText;
        btn.style.opacity = "1";
        btn.style.pointerEvents = "auto";
    }
}

// ==========================================
// 【新增】：本地导入歌曲逻辑
// ==========================================
let localImportMode = 'url'; // 'url' 或 'file'

function openLocalImportModal() {
    const musicLoginId = ChatDB.getItem('music_current_login_account');
    if (!musicLoginId) return alert("请先登录音乐账号");
    
    // 渲染歌单下拉框
    const select = document.getElementById('localImportPlaylistSelect');
    select.innerHTML = '<option value="">请选择要添加到的歌单</option>';
    let savedPlaylists = JSON.parse(ChatDB.getItem(`music_playlists_${musicLoginId}`) || '[]');
    savedPlaylists.forEach(pl => {
        const opt = document.createElement('option');
        opt.value = pl.id;
        opt.innerText = pl.name;
        select.appendChild(opt);
    });

    // 重置表单
    document.getElementById('localImportUrlInput').value = '';
    document.getElementById('localImportFileInput').value = '';
    document.getElementById('localImportFileName').innerText = '未选择';
    document.getElementById('localImportName').value = '';
    document.getElementById('localImportArtist').value = '';
    document.getElementById('localImportLrcInput').value = '';
    document.getElementById('localImportLrcName').innerText = '未选择';
    
    switchLocalImportTab('url');
    document.getElementById('musicLocalImportModal').classList.add('show');
}

function switchLocalImportTab(mode) {
    localImportMode = mode;
    const tabUrl = document.getElementById('localImportTabUrl');
    const tabFile = document.getElementById('localImportTabFile');
    const inputUrl = document.getElementById('localImportUrlInput');
    const inputFile = document.getElementById('localImportFileArea');
    
    if (mode === 'url') {
        tabUrl.style.background = '#111'; tabUrl.style.color = '#fff';
        tabFile.style.background = '#f0f0f0'; tabFile.style.color = '#333';
        inputUrl.style.display = 'block';
        inputFile.style.display = 'none';
    } else {
        tabFile.style.background = '#111'; tabFile.style.color = '#fff';
        tabUrl.style.background = '#f0f0f0'; tabUrl.style.color = '#333';
        inputUrl.style.display = 'none';
        inputFile.style.display = 'flex';
    }
}

function confirmLocalImport() {
    const name = document.getElementById('localImportName').value.trim();
    const artist = document.getElementById('localImportArtist').value.trim() || '未知歌手';
    const playlistId = document.getElementById('localImportPlaylistSelect').value;
    
    if (!name) return alert("请输入歌名！");
    if (!playlistId) return alert("请选择要添加到的歌单！");

    let songUrl = '';
    if (localImportMode === 'url') {
        songUrl = document.getElementById('localImportUrlInput').value.trim();
        if (!songUrl) return alert("请输入歌曲 URL！");
        saveLocalSongToPlaylist(playlistId, name, artist, songUrl);
    } else {
        const fileInput = document.getElementById('localImportFileInput');
        if (!fileInput.files || fileInput.files.length === 0) return alert("请选择音频文件！");
        
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            songUrl = e.target.result; // Base64
            saveLocalSongToPlaylist(playlistId, name, artist, songUrl);
        };
        reader.readAsDataURL(file);
    }
}

function saveLocalSongToPlaylist(playlistId, name, artist, songUrl) {
    const musicLoginId = ChatDB.getItem('music_current_login_account');
    let savedPlaylists = JSON.parse(ChatDB.getItem(`music_playlists_${musicLoginId}`) || '[]');
    
    const plIndex = savedPlaylists.findIndex(p => p.id === playlistId);
    if (plIndex !== -1) {
        const newSong = {
            id: 'local_' + Date.now(),
            title: name,
            artist: artist,
            url: songUrl,
            cover: 'https://p2.music.126.net/6y-7YvS_G8V8.jpg?param=100y100' // 默认封面
        };
        
        // 处理歌词 (如果有)
        const lrcInput = document.getElementById('localImportLrcInput');
        if (lrcInput.files && lrcInput.files.length > 0) {
            const lrcReader = new FileReader();
            lrcReader.onload = function(e) {
                newSong.lrc = e.target.result;
                savedPlaylists[plIndex].tracks.push(newSong);
                savedPlaylists[plIndex].trackCount = savedPlaylists[plIndex].tracks.length;
                ChatDB.setItem(`music_playlists_${musicLoginId}`, JSON.stringify(savedPlaylists));
                alert("导入成功！");
                document.getElementById('musicLocalImportModal').classList.remove('show');
                renderMyPlaylists();
            };
            lrcReader.readAsText(lrcInput.files[0]);
        } else {
            savedPlaylists[plIndex].tracks.push(newSong);
            savedPlaylists[plIndex].trackCount = savedPlaylists[plIndex].tracks.length;
            ChatDB.setItem(`music_playlists_${musicLoginId}`, JSON.stringify(savedPlaylists));
            alert("导入成功！");
            document.getElementById('musicLocalImportModal').classList.remove('show');
            renderMyPlaylists();
        }
    }
}

// 方式二：UID 批量导入
async function musicDoWyyLogin() {
    // 【修改】：从新的仿网易云弹窗中获取 UID
    let uid = document.getElementById('wyy-uid-input-modal').value.trim();
    if (!uid) return alert("请输入网易云 UID！");
    
    const btn = document.getElementById('wyy-login-btn');
    const originalText = btn.innerText;
    btn.innerText = "获取中...";
    btn.style.opacity = "0.5";
    btn.style.pointerEvents = "none";
    
    try {
        const baseUrl = getMusicSearchApiUrl();
        const timestamp = Date.now(); 
        
        const plRes = await fetch(`${baseUrl}/user/playlist?uid=${uid}&timestamp=${timestamp}`);
        const plJson = await plRes.json();
        
        console.log("UID导入歌单列表:", plJson);
        
        if (plJson.code === 200 && plJson.playlist) {
            const musicLoginId = ChatDB.getItem('music_current_login_account');
            let savedPlaylists = JSON.parse(ChatDB.getItem(`music_playlists_${musicLoginId}`) || '[]');
            
            const maxImport = Math.min(plJson.playlist.length, 10);
            let successCount = 0;
            
            for (let i = 0; i < maxImport; i++) {
                const pl = plJson.playlist[i];
                if (!savedPlaylists.some(p => p.id === pl.id)) {
                    // UID 导入时，顺便把歌曲也拉下来，防止点进去没歌
                    try {
                        const resTracks = await fetch(`${baseUrl}/playlist/track/all?id=${pl.id}&limit=1000&timestamp=${timestamp}`);
                        const dataTracks = await resTracks.json();
                        let tracks = [];
                        if (dataTracks.code === 200 && dataTracks.songs) {
                            tracks = dataTracks.songs.map(song => ({
                                id: song.id,
                                title: song.name,
                                artist: song.ar ? song.ar.map(a => a.name).join(', ') : '未知歌手',
                                cover: (song.al && song.al.picUrl) ? song.al.picUrl + '?param=100y100' : 'https://p2.music.126.net/6y-7YvS_G8V8.jpg?param=100y100'
                            }));
                        }
                        
                        savedPlaylists.push({
                            id: pl.id,
                            name: pl.name,
                            cover: pl.coverImgUrl || 'https://p2.music.126.net/6y-7YvS_G8V8.jpg',
                            trackCount: tracks.length,
                            tracks: tracks
                        });
                        successCount++;
                    } catch (err) {
                        console.warn(`歌单 ${pl.name} 歌曲拉取失败`, err);
                    }
                }
            }
            
            ChatDB.setItem(`music_playlists_${musicLoginId}`, JSON.stringify(savedPlaylists));
            renderMyPlaylists();
            document.getElementById('musicImportModal').classList.remove('show');
            alert(`成功获取并保存了 ${successCount} 个歌单！`);
        } else {
            alert("获取歌单失败，请检查 UID 是否正确或切换音源。");
        }
    } catch (e) {
        console.error("UID Import Error:", e);
        alert("网络请求失败，请切换搜索接口。");
    } finally {
        btn.innerText = originalText;
        btn.style.opacity = "1";
        btn.style.pointerEvents = "auto";
    }
}

// ==========================================
// 5. 音乐好友与一起听歌逻辑
// ==========================================
function renderMusicFriends() {
    const musicLoginId = ChatDB.getItem('music_current_login_account');
    if (!musicLoginId) return;

    const listContainer = document.getElementById('musicFriendListContainer');
    listContainer.innerHTML = '';

    let friends = JSON.parse(ChatDB.getItem(`music_friends_${musicLoginId}`) || '[]');
    let allChars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');

    if (friends.length === 0) {
        listContainer.innerHTML = '<div style="text-align: center; padding: 40px 20px; color: #aaa; font-size: 13px;">暂无好友，快去添加吧</div>';
        return;
    }

// 修改后 (music.js 约 415 行)
    friends.forEach(charId => {
        const char = allChars.find(c => c.id === charId);
        if (!char) return;

        const item = document.createElement('div');
        // 改用类似搜索结果的独立卡片样式
        item.style.cssText = 'display: flex; align-items: center; gap: 12px; padding: 12px 15px; background: #fff; border-radius: 16px; border: 1px solid #eee; box-shadow: 0 2px 10px rgba(0,0,0,0.02);';
        item.innerHTML = `
            <div style="width: 44px; height: 44px; border-radius: 12px; background-image: url('${char.avatarUrl || ''}'); background-size: cover; background-position: center; background-color: #f4f4f4; border: 1px solid #eee;"></div>
            <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                <div style="font-size: 15px; font-weight: bold; color: #111;">${char.netName || char.name}</div>
                <div style="font-size: 12px; color: #888;">在线</div>
            </div>
            <div onclick="inviteListenTogether('${char.id}', '${char.netName || char.name}')" style="font-size: 11px; font-weight: bold; color: #111; background: #f4f4f4; padding: 6px 12px; border-radius: 10px; cursor: pointer;">一起听</div>
        `;
        listContainer.appendChild(item);
    });
}

function openMusicAddFriendModal() {
    document.getElementById('musicSearchFriendInput').value = '';
    document.getElementById('musicSearchResult').innerHTML = '';
    document.getElementById('musicAddFriendModalOverlay').classList.add('show');
}

function closeMusicAddFriendModal() {
    document.getElementById('musicAddFriendModalOverlay').classList.remove('show');
}

function searchMusicFriend() {
    const keyword = document.getElementById('musicSearchFriendInput').value.trim();
    const resultContainer = document.getElementById('musicSearchResult');
    
    if (!keyword) { resultContainer.innerHTML = ''; return; }

    let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
    const matchedChars = chars.filter(c => c.account && c.account.includes(keyword));

    if (matchedChars.length === 0) {
        resultContainer.innerHTML = '<div style="text-align: center; color: #aaa; font-size: 12px; padding: 20px;">未找到该账号</div>';
        return;
    }

    resultContainer.innerHTML = '';
    matchedChars.forEach(char => {
        const card = document.createElement('div');
        card.style.cssText = 'display: flex; align-items: center; gap: 10px; padding: 10px; background: #f9f9f9; border-radius: 12px; border: 1px solid #eee;';
        card.innerHTML = `
            <div style="width: 40px; height: 40px; border-radius: 10px; background-image: url('${char.avatarUrl || ''}'); background-size: cover; background-position: center; background-color: #eee;"></div>
            <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                <div style="font-size: 14px; font-weight: bold; color: #111;">${char.netName || char.name}</div>
                <div style="font-size: 11px; color: #888;">账号: ${char.account}</div>
            </div>
            <div onclick="addMusicFriend('${char.id}')" style="background: #111; color: #fff; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: bold; cursor: pointer;">添加</div>
        `;
        resultContainer.appendChild(card);
    });
}

function addMusicFriend(charId) {
    const musicLoginId = ChatDB.getItem('music_current_login_account');
    if (!musicLoginId) return;

    let friends = JSON.parse(ChatDB.getItem(`music_friends_${musicLoginId}`) || '[]');
    if (friends.includes(charId)) { alert('该角色已经是您的音乐好友了！'); return; }

    friends.push(charId);
    ChatDB.setItem(`music_friends_${musicLoginId}`, JSON.stringify(friends));
    
    alert('添加成功！');
    closeMusicAddFriendModal();
    renderMusicFriends();
}

let listenTogetherTimer = null;
let listenTogetherStartTime = 0; 
window.currentListenTogetherCharId = null; // 全局记录当前一起听歌的对象

function inviteListenTogether(charId, charName) {
    const musicLoginId = ChatDB.getItem('music_current_login_account');
    const chatLoginId = ChatDB.getItem('current_login_account');

    if (musicLoginId !== chatLoginId) {
        alert('【账号不匹配】\n您当前在 Music 登录的账号，与 Chat APP 中登录的账号不一致。\n请切换到对应的账号后，再邀请该角色一起听歌！');
        return;
    }

    if (confirm(`确定要邀请 ${charName} 一起听歌吗？`)) {
        // 1. 向聊天室发送邀请卡片
        let history = JSON.parse(ChatDB.getItem(`chat_history_${chatLoginId}_${charId}`) || '[]');
        history.push({
            role: 'user',
            type: 'music_invite',
            status: 'pending',
            content: '[一起听歌邀请]',
            timestamp: Date.now()
        });
        ChatDB.setItem(`chat_history_${chatLoginId}_${charId}`, JSON.stringify(history));
        
        // 2. 更新会话列表顺序
        let sessions = JSON.parse(ChatDB.getItem(`chat_sessions_${chatLoginId}`) || '[]');
        sessions = sessions.filter(id => id !== charId);
        sessions.unshift(charId);
        ChatDB.setItem(`chat_sessions_${chatLoginId}`, JSON.stringify(sessions));

        alert('邀请已发送，等待对方回复...');
        // 已移除自动触发 AI 回复的逻辑
    }
}

// 核心：正式开始一起听歌的 UI 逻辑
window.startListenTogether = function(charId) {
    const musicLoginId = ChatDB.getItem('music_current_login_account');
    let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
    const me = accounts.find(a => a.id === musicLoginId);
    let chars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
    const char = chars.find(c => c.id === charId);
    
    if (!char) return;
    
    window.currentListenTogetherCharId = charId;
    const charName = char.netName || char.name;

    const statusEl = document.getElementById('mpListenTogetherStatus');
    if (statusEl) {
        statusEl.style.display = 'flex';
        const textEl = document.getElementById('mpListenTogetherText');
        if (textEl) textEl.innerText = `正在与 ${charName} 一起听歌`;
        
        if (me && me.avatarUrl) {
            document.getElementById('mpListenTogetherAvatar1').style.backgroundImage = `url(${me.avatarUrl})`;
            const miniAv1 = document.getElementById('miniAvatar1');
            if (miniAv1) miniAv1.style.backgroundImage = `url(${me.avatarUrl})`;
        }
        if (char && char.avatarUrl) {
            document.getElementById('mpListenTogetherAvatar2').style.backgroundImage = `url(${char.avatarUrl})`;
            const miniAv2 = document.getElementById('miniAvatar2');
            if (miniAv2) miniAv2.style.backgroundImage = `url(${char.avatarUrl})`;
        }
        
        const miniDisc = document.getElementById('miniPlayerDisc');
        const miniAvatars = document.getElementById('miniPlayerTogetherAvatars');
        if (miniDisc && miniAvatars) {
            miniDisc.style.display = 'none';
            miniAvatars.style.display = 'flex';
        }
        
        listenTogetherStartTime = Date.now();
        document.getElementById('mpListenTime').innerText = '0';
        clearInterval(listenTogetherTimer);
        
        listenTogetherTimer = setInterval(() => {
            const passedMinutes = Math.floor((Date.now() - listenTogetherStartTime) / 60000);
            document.getElementById('mpListenTime').innerText = passedMinutes;
        }, 1000);
    }
    
    // 如果当前不在音乐界面，给个提示
    if (typeof showToast === 'function') {
        showToast(`已和 ${charName} 开始一起听歌`, 'success', 2000);
    }
};

// 处理 Char 主动邀请的弹窗响应
window.handleMusicInviteResponse = function(isAccept) {
    document.getElementById('musicInviteModalOverlay').classList.remove('show');
    const currentLoginId = ChatDB.getItem('current_login_account');
    const charId = window.currentListenTogetherCharId; 
    if (!currentLoginId || !charId) return;

    // 移除固定回复，仅执行功能逻辑
    if (isAccept) {
        window.startListenTogether(charId);
    }
    
    // 如果需要刷新 UI
    if (typeof renderChatHistory === 'function' && typeof currentChatRoomCharId !== 'undefined' && currentChatRoomCharId === charId) {
        renderChatHistory(charId);
    }
};

// ==========================================
// 全屏播放器交互逻辑 (已移除旧菜单)
// ==========================================

function endListenTogether(e) {
    if(e) e.stopPropagation();
    if(confirm('确定要结束一起听歌吗？')) {
        document.getElementById('mpListenTogetherStatus').style.display = 'none';
        clearInterval(listenTogetherTimer);
        listenTogetherTimer = null; // 清空状态
        
        // 【新增】：恢复底部胶囊显示为黑胶唱片
        const miniDisc = document.getElementById('miniPlayerDisc');
        const miniAvatars = document.getElementById('miniPlayerTogetherAvatars');
        if (miniDisc && miniAvatars) {
            miniDisc.style.display = 'flex';
            miniAvatars.style.display = 'none';
        }
        
        alert('已结束一起听歌');
    }
}

function triggerMpBgUpload(e) {
    if(e) e.stopPropagation();
    // 直接触发上传
    document.getElementById('mpBgUploadInput').click();
}

// 切换黑胶唱片与歌词显示
function toggleMpLyric() {
    const discArea = document.getElementById('mpDiscArea');
    const lyricArea = document.getElementById('mpLyricArea');
    if (discArea && lyricArea) {
        if (discArea.style.display === 'none') {
            discArea.style.display = 'flex';
            lyricArea.style.display = 'none';
        } else {
            discArea.style.display = 'none';
            lyricArea.style.display = 'flex';
        }
    }
}

// 播放模式切换逻辑
let currentPlayMode = 'loop'; // 'loop' 列表循环, 'single' 单曲循环, 'random' 随机播放

function togglePlayMode() {
    const btn = document.getElementById('mpPlayModeBtn');
    if (!btn) return;
    
    if (currentPlayMode === 'loop') {
        currentPlayMode = 'single';
        // 单曲循环图标 (带个1)
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path><text x="12" y="16" font-size="8" fill="currentColor" stroke="none" text-anchor="middle">1</text></svg>`;
        alert('已切换为：单曲循环');
    } else if (currentPlayMode === 'single') {
        currentPlayMode = 'random';
        // 随机播放图标 (交叉箭头)
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>`;
        alert('已切换为：随机播放');
    } else {
        currentPlayMode = 'loop';
        // 列表循环图标
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="1.5" fill="none"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>`;
        alert('已切换为：列表循环');
    }
}

// 播放列表弹窗逻辑
function openMpPlaylist() {
    const modal = document.getElementById('mpPlaylistModal');
    if (modal) {
        modal.style.transform = 'translateY(0)';
    }
}

function closeMpPlaylist() {
    const modal = document.getElementById('mpPlaylistModal');
    if (modal) {
        modal.style.transform = 'translateY(100%)';
    }
}

function handleMpBgUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imgUrl = e.target.result;
            const playerPanel = document.getElementById('musicPlayerPanel');
            if (playerPanel) {
                playerPanel.style.backgroundImage = `url('${imgUrl}')`;
                // 【修复】：保存到本地存储，防止刷新丢失
                const musicLoginId = ChatDB.getItem('music_current_login_account');
                if (musicLoginId) {
                    try {
                        ChatDB.setItem(`music_player_bg_${musicLoginId}`, imgUrl);
                    } catch (err) {
                        console.warn("图片过大，无法持久化保存", err);
                    }
                }
            }
        }
        reader.readAsDataURL(file);
    }
    event.target.value = '';
}

// 音乐进度条与播放控制逻辑
audioPlayer.addEventListener('timeupdate', () => {
    const currentTime = audioPlayer.currentTime;
    const duration = audioPlayer.duration;
    if (!isNaN(duration)) {
        const progressPercent = (currentTime / duration) * 100;
        document.getElementById('mpProgressFill').style.width = `${progressPercent}%`;
        document.getElementById('mpProgressDot').style.left = `${progressPercent}%`;
        document.getElementById('mpCurrentTime').innerText = formatTime(currentTime);
        document.getElementById('mpDuration').innerText = formatTime(duration);
    }
});

audioPlayer.addEventListener('play', () => {
    document.getElementById('mpPlayBtn').style.display = 'none';
    document.getElementById('mpPauseBtn').style.display = 'block';
    const disc = document.querySelector('.mp-disc-outer');
    if (disc) disc.style.animationPlayState = 'running';
});

audioPlayer.addEventListener('pause', () => {
    document.getElementById('mpPlayBtn').style.display = 'block';
    document.getElementById('mpPauseBtn').style.display = 'none';
    const disc = document.querySelector('.mp-disc-outer');
    if (disc) disc.style.animationPlayState = 'paused';
});

function toggleMusicPlay() {
    if (audioPlayer.paused) {
        audioPlayer.play();
    } else {
        audioPlayer.pause();
    }
}

function seekMusic(event) {
    const progressBar = document.getElementById('mpProgressBar');
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const width = rect.width;
    const percentage = clickX / width;
    if (!isNaN(audioPlayer.duration)) {
        audioPlayer.currentTime = percentage * audioPlayer.duration;
    }
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

// ==========================================
// 6. 全屏播放器逻辑
// ==========================================
function openMusicPlayer() {
    const player = document.getElementById('musicPlayerPanel');
    if (player) {
        player.style.display = 'flex';
        // 【修复】：打开时读取保存的背景
        const musicLoginId = ChatDB.getItem('music_current_login_account');
        if (musicLoginId) {
            const savedBg = ChatDB.getItem(`music_player_bg_${musicLoginId}`);
            if (savedBg) {
                player.style.backgroundImage = `url('${savedBg}')`;
            }
        }
    }
}

// 修改后 (music.js 末尾)
function closeMusicPlayer() {
    const player = document.getElementById('musicPlayerPanel');
    if (player) player.style.display = 'none';
    const statusEl = document.getElementById('mpListenTogetherStatus');
    if (statusEl) statusEl.style.display = 'none';
}

// 【新增】：获取网易云推荐歌单
async function fetchMusicRecommendPlaylists() {
    const grid = document.querySelector('.music-playlist-grid');
    if (!grid) return;
    
    try {
        const baseUrl = getMusicSearchApiUrl();
        const res = await fetch(`${baseUrl}/top/playlist?limit=6&order=hot`);
        const data = await res.json();
        
        if (data.code === 200 && data.playlists) {
            grid.innerHTML = '';
            data.playlists.forEach(pl => {
                const card = document.createElement('div');
                card.className = 'music-playlist-card';
                // 点击歌单可以直接调用 URL 导入逻辑将其保存到自己的歌单中
                card.onclick = () => {
                    if(confirm(`要将《${pl.name}》保存到我的歌单吗？`)) {
                        document.getElementById('music-import-url-input').value = pl.id;
                        musicImportByUrl();
                    }
                };
                card.innerHTML = `
                    <div class="music-playlist-cover" style="background-image: url('${pl.coverImgUrl}?param=200y200'); background-size: cover;"></div>
                    <div class="music-playlist-name">${pl.name}</div>
                `;
                grid.appendChild(card);
            });
        }
    } catch (e) {
        console.error("获取推荐歌单失败", e);
    }
}
// ==========================================
// 【新增】：添加到歌单、编辑歌单、歌单详情逻辑
// ==========================================

let tempAddSong = null;

function openAddToPlaylistModal(id, title, artist, cover) {
    tempAddSong = { id, title, artist, cover };
    const musicLoginId = ChatDB.getItem('music_current_login_account');
    if (!musicLoginId) return alert("请先登录音乐账号");
    
    const select = document.getElementById('addToPlaylistSelect');
    select.innerHTML = '<option value="">请选择歌单</option>';
    let savedPlaylists = JSON.parse(ChatDB.getItem(`music_playlists_${musicLoginId}`) || '[]');
    savedPlaylists.forEach(pl => {
        const opt = document.createElement('option');
        opt.value = pl.id;
        opt.innerText = pl.name;
        select.appendChild(opt);
    });
    document.getElementById('musicAddToPlaylistModal').classList.add('show');
}

function confirmAddToPlaylist() {
    const playlistId = document.getElementById('addToPlaylistSelect').value;
    if (!playlistId) return alert("请选择歌单！");
    
    const musicLoginId = ChatDB.getItem('music_current_login_account');
    let savedPlaylists = JSON.parse(ChatDB.getItem(`music_playlists_${musicLoginId}`) || '[]');
    const plIndex = savedPlaylists.findIndex(p => p.id === playlistId);
    
    if (plIndex !== -1 && tempAddSong) {
        if (!savedPlaylists[plIndex].tracks) savedPlaylists[plIndex].tracks = [];
        // 查重
        if (savedPlaylists[plIndex].tracks.some(t => t.id == tempAddSong.id)) {
            alert("该歌曲已在歌单中！");
            return;
        }
        savedPlaylists[plIndex].tracks.push(tempAddSong);
        savedPlaylists[plIndex].trackCount = savedPlaylists[plIndex].tracks.length;
        ChatDB.setItem(`music_playlists_${musicLoginId}`, JSON.stringify(savedPlaylists));
        alert("添加成功！");
        document.getElementById('musicAddToPlaylistModal').classList.remove('show');
        renderMyPlaylists();
    }
}

let tempEditPlaylistCoverBase64 = null;

function openEditPlaylistModal(id) {
    const musicLoginId = ChatDB.getItem('music_current_login_account');
    let savedPlaylists = JSON.parse(ChatDB.getItem(`music_playlists_${musicLoginId}`) || '[]');
    const pl = savedPlaylists.find(p => p.id === id);
    if (!pl) return;
    
    document.getElementById('editPlaylistId').value = pl.id;
    document.getElementById('editPlaylistName').value = pl.name;
    document.getElementById('editPlaylistCover').value = pl.cover;
    tempEditPlaylistCoverBase64 = null;
    document.getElementById('musicEditPlaylistModal').classList.add('show');
}

function handleEditPlaylistCover(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            tempEditPlaylistCoverBase64 = e.target.result;
            document.getElementById('editPlaylistCover').value = '已选择本地图片';
        };
        reader.readAsDataURL(file);
    }
    event.target.value = '';
}

function confirmEditPlaylist() {
    const id = document.getElementById('editPlaylistId').value;
    const name = document.getElementById('editPlaylistName').value.trim();
    const coverUrl = document.getElementById('editPlaylistCover').value.trim();
    if (!name) return alert("请输入歌单名称！");

    const musicLoginId = ChatDB.getItem('music_current_login_account');
    let savedPlaylists = JSON.parse(ChatDB.getItem(`music_playlists_${musicLoginId}`) || '[]');
    const plIndex = savedPlaylists.findIndex(p => p.id === id);
    if (plIndex !== -1) {
        savedPlaylists[plIndex].name = name;
        if (tempEditPlaylistCoverBase64) {
            savedPlaylists[plIndex].cover = tempEditPlaylistCoverBase64;
        } else if (coverUrl && coverUrl !== '已选择本地图片') {
            savedPlaylists[plIndex].cover = coverUrl;
        }
        ChatDB.setItem(`music_playlists_${musicLoginId}`, JSON.stringify(savedPlaylists));
        document.getElementById('musicEditPlaylistModal').classList.remove('show');
        renderMyPlaylists();
    }
}

function deletePlaylist() {
    if (!confirm("确定要删除该歌单吗？")) return;
    const id = document.getElementById('editPlaylistId').value;
    const musicLoginId = ChatDB.getItem('music_current_login_account');
    let savedPlaylists = JSON.parse(ChatDB.getItem(`music_playlists_${musicLoginId}`) || '[]');
    savedPlaylists = savedPlaylists.filter(p => p.id !== id);
    ChatDB.setItem(`music_playlists_${musicLoginId}`, JSON.stringify(savedPlaylists));
    document.getElementById('musicEditPlaylistModal').classList.remove('show');
    renderMyPlaylists();
}

function openPlaylistDetail(id) {
    const musicLoginId = ChatDB.getItem('music_current_login_account');
    let savedPlaylists = JSON.parse(ChatDB.getItem(`music_playlists_${musicLoginId}`) || '[]');
    const pl = savedPlaylists.find(p => p.id === id);
    if (!pl) return;

    document.getElementById('playlistDetailName').innerText = pl.name;
    document.getElementById('playlistDetailCount').innerText = `共 ${pl.tracks ? pl.tracks.length : 0} 首`;
    document.getElementById('playlistDetailCover').style.backgroundImage = `url('${pl.cover}')`;

    const tracksContainer = document.getElementById('playlistDetailTracks');
    tracksContainer.innerHTML = '';
    if (pl.tracks && pl.tracks.length > 0) {
        pl.tracks.forEach((song, index) => {
            const item = document.createElement('div');
            item.className = 'music-song-item';
            item.onclick = () => {
                if (song.url && song.url.startsWith('data:audio')) {
                    // 播放本地导入的歌曲
                    playLocalSong(song);
                } else {
                    // 播放在线歌曲
                    musicPlaySong(song.id, song.title, song.artist, song.cover);
                }
            };
            item.innerHTML = `
                <div style="width: 30px; text-align: center; color: #aaa; font-size: 14px; font-weight: bold;">${index + 1}</div>
                <div class="music-song-info">
                    <div class="music-song-title">${song.title}</div>
                    <div class="music-song-artist">${song.artist}</div>
                </div>
                <div class="music-song-action">播放</div>
            `;
            tracksContainer.appendChild(item);
        });
    } else {
        tracksContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#888; font-size:13px;">歌单为空</div>';
    }

    document.getElementById('musicPlaylistDetailPanel').style.display = 'flex';
}

function closePlaylistDetail() {
    document.getElementById('musicPlaylistDetailPanel').style.display = 'none';
}

function playLocalSong(song) {
    // 更新底部悬浮播放器 UI
    document.querySelector('.music-player-title').innerText = song.title;
    document.querySelector('.music-player-sub').innerText = song.artist;
    document.querySelector('.music-player-disc-inner').style.backgroundImage = `url(${song.cover})`;
    document.querySelector('.music-player-disc-inner').style.backgroundSize = 'cover';
    
    // 更新全屏播放器 UI
    const mpSongName = document.getElementById('mpSongName');
    if (mpSongName) mpSongName.innerText = song.title;
    const mpArtistName = document.getElementById('mpArtistName');
    if (mpArtistName) mpArtistName.innerText = song.artist;
    const mpDiscCover = document.getElementById('mpDiscCover');
    if (mpDiscCover) mpDiscCover.style.backgroundImage = `url(${song.cover})`;
    
    const mpLyricTitle = document.getElementById('mpLyricTitle');
    if (mpLyricTitle) mpLyricTitle.innerText = song.title;
    const mpLyricArtist = document.getElementById('mpLyricArtist');
    if (mpLyricArtist) mpLyricArtist.innerText = song.artist;
    
    currentPlayingSong = song;

    audioPlayer.src = song.url;
    const playPromise = audioPlayer.play();
    if (playPromise !== undefined) {
        playPromise.then(() => {
            const disc = document.querySelector('.mp-disc-outer');
            if (disc) disc.style.animationPlayState = 'running';
            
            const playerPanel = document.getElementById('musicPlayerPanel');
            if (playerPanel) {
                const musicLoginId = ChatDB.getItem('music_current_login_account');
                const savedBg = musicLoginId ? ChatDB.getItem(`music_player_bg_${musicLoginId}`) : null;
                if (!savedBg) {
                    playerPanel.style.backgroundImage = `url('${song.cover}')`;
                }
            }
        }).catch(e => console.error(e));
    }
}
// ==========================================
// 【新增】：音乐分享逻辑 (聊天 & 朋友圈)
// ==========================================

function openMusicShareModal() {
    if (!currentPlayingSong) return alert("当前没有正在播放的歌曲！");
    document.getElementById('musicShareModalOverlay').classList.add('show');
}

function closeMusicShareModal() {
    document.getElementById('musicShareModalOverlay').classList.remove('show');
}

function closeMusicShareChatModal() {
    document.getElementById('musicShareChatModalOverlay').classList.remove('show');
}

// 1. 分享到聊天
function shareMusicToChat() {
    closeMusicShareModal();
    const currentLoginId = ChatDB.getItem('current_login_account');
    if (!currentLoginId) return alert("请先在 Chat 中登录账号！");

    let contacts = JSON.parse(ChatDB.getItem(`contacts_${currentLoginId}`) || '[]');
    let allChars = JSON.parse(ChatDB.getItem('chat_chars') || '[]');
    let remarks = JSON.parse(ChatDB.getItem(`char_remarks_${currentLoginId}`) || '{}');
    
    const listEl = document.getElementById('musicShareContactList');
    listEl.innerHTML = '';
    
    const friends = contacts.map(id => allChars.find(c => c.id === id)).filter(c => c);
    
    if (friends.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; color:#aaa; font-size:12px;">暂无好友可分享</div>';
    } else {
        friends.forEach(f => {
            const displayName = remarks[f.id] || f.netName || f.name;
            const item = document.createElement('div');
            item.style.cssText = 'display: flex; align-items: center; gap: 10px; padding: 10px; background: #f9f9f9; border-radius: 10px; cursor: pointer;';
            item.innerHTML = `
                <div style="width: 36px; height: 36px; border-radius: 8px; background-image: url('${f.avatarUrl || ''}'); background-size: cover; background-color: #eee;"></div>
                <div style="font-size: 14px; font-weight: bold; color: #333;">${displayName}</div>
            `;
            item.onclick = () => confirmShareMusicToChat(f.id);
            listEl.appendChild(item);
        });
    }
    
    document.getElementById('musicShareChatModalOverlay').classList.add('show');
}

function confirmShareMusicToChat(targetCharId) {
    const currentLoginId = ChatDB.getItem('current_login_account');
    let history = JSON.parse(ChatDB.getItem(`chat_history_${currentLoginId}_${targetCharId}`) || '[]');
    
    // 构建仿网易云音乐卡片 HTML
    const shareHtml = `
        <div class="music-share-card" onclick="openMusicApp(); setTimeout(() => musicPlaySong('${currentPlayingSong.id}', '${currentPlayingSong.title.replace(/'/g, "\\'")}', '${currentPlayingSong.artist.replace(/'/g, "\\'")}', '${currentPlayingSong.cover}'), 500);">
            <img src="${currentPlayingSong.cover}">
            <div class="info">
                <div class="title">${currentPlayingSong.title}</div>
                <div class="artist">${currentPlayingSong.artist}</div>
            </div>
            <div class="icon">
                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
            </div>
        </div>
    `;

    history.push({
        role: 'user',
        type: 'text',
        content: shareHtml,
        timestamp: Date.now()
    });
    
    ChatDB.setItem(`chat_history_${currentLoginId}_${targetCharId}`, JSON.stringify(history));
    
    // 更新会话列表顺序
    let sessions = JSON.parse(ChatDB.getItem(`chat_sessions_${currentLoginId}`) || '[]');
    sessions = sessions.filter(id => id !== targetCharId);
    sessions.unshift(targetCharId);
    ChatDB.setItem(`chat_sessions_${currentLoginId}`, JSON.stringify(sessions));
    
    alert('分享成功！');
    closeMusicShareChatModal();
    
    // 如果当前正好在聊天界面，刷新一下
    if (typeof renderChatList === 'function') renderChatList();
    if (typeof currentChatRoomCharId !== 'undefined' && currentChatRoomCharId === targetCharId) {
        renderChatHistory(targetCharId);
    }
}

// 2. 分享到朋友圈
function shareMusicToMoment() {
    closeMusicShareModal();
    const currentLoginId = ChatDB.getItem('current_login_account');
    if (!currentLoginId) return alert("请先在 Chat 中登录账号！");

    // 构建仿网易云音乐卡片 HTML
    const shareHtml = `
        <div class="music-share-card" style="width: 100%; margin-top: 10px; background: #f9f9f9;" onclick="openMusicApp(); setTimeout(() => musicPlaySong('${currentPlayingSong.id}', '${currentPlayingSong.title.replace(/'/g, "\\'")}', '${currentPlayingSong.artist.replace(/'/g, "\\'")}', '${currentPlayingSong.cover}'), 500);">
            <img src="${currentPlayingSong.cover}">
            <div class="info">
                <div class="title">${currentPlayingSong.title}</div>
                <div class="artist">${currentPlayingSong.artist}</div>
            </div>
            <div class="icon">
                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
            </div>
        </div>
    `;

    const newMoment = {
        id: Date.now().toString(),
        authorId: currentLoginId,
        content: `分享单曲：\n${shareHtml}`,
        images: [],
        visibility: 'all',
        timestamp: Date.now(),
        likes: [],
        comments: []
    };

    let moments = JSON.parse(ChatDB.getItem(`moments_${currentLoginId}`) || '[]');
    moments.push(newMoment);
    ChatDB.setItem(`moments_${currentLoginId}`, JSON.stringify(moments));

    alert('已成功分享到朋友圈！');
    
    // 如果当前在朋友圈页面，刷新一下
    if (typeof renderMoments === 'function') renderMoments();
}
