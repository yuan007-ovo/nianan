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
    
    addFriendIcon.style.display = 'none';
    settingsIcon.style.display = 'none';

    if(tabName === 'home') {
        btns[0].classList.add('active');
    }
    if(tabName === 'friends') { 
        btns[1].classList.add('active'); 
        addFriendIcon.style.display = 'block'; 
        renderMusicFriends(); 
    }
    if(tabName === 'me') { 
        btns[2].classList.add('active'); 
        settingsIcon.style.display = 'block'; 
        renderMusicMePage(); 
    }
}

// ==========================================
// 2. 个人主页与设置面板
// ==========================================
function renderMusicMePage() {
    const musicLoginId = ChatDB.getItem('music_current_login_account');
    if (!musicLoginId) return;
    let accounts = JSON.parse(ChatDB.getItem('chat_accounts') || '[]');
    const account = accounts.find(a => a.id === musicLoginId);
    if (!account) return;

    document.getElementById('musicMeName').innerText = account.netName || '未命名';
    document.getElementById('musicMeAvatar').style.backgroundImage = account.avatarUrl ? `url(${account.avatarUrl})` : 'none';
    
    renderMyPlaylists();
}

function openMusicSettingsPanel() {
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

function musicOpenApiToggleModal() {
    ['primary', 'secondary', 'tertiary', 'api4', 'api5'].forEach(api => {
        const el = document.getElementById(`api-search-${api}`);
        if (el) el.style.color = currentMusicSearchApi === api ? '#007AFF' : '#111';
    });
    ['miemie', 'zhizhi'].forEach(api => {
        const el = document.getElementById(`api-play-${api}`);
        if (el) el.style.color = currentMusicPlayApi === api ? '#007AFF' : '#111';
    });
    document.getElementById('musicApiToggleModal').classList.add('show');
}

function musicSetSearchApi(api) {
    currentMusicSearchApi = api;
    localStorage.setItem('music_search_api', api);
    musicOpenApiToggleModal(); 
}

function musicSetPlayApi(api) {
    currentMusicPlayApi = api;
    localStorage.setItem('music_play_api', api);
    musicOpenApiToggleModal(); 
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
                item.innerHTML = `
                    <img src="${cover}" class="music-song-cover">
                    <div class="music-song-info">
                        <div class="music-song-title">${title}</div>
                        <div class="music-song-artist">${artist}</div>
                    </div>
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
            audioPlayer.play().then(() => {
                const disc = document.querySelector('.mp-disc-outer');
                if (disc) disc.style.animationPlayState = 'running';
            }).catch(e => {
                alert(`《${title}》可能是 VIP 专属或无版权，无法自动播放。`);
                const disc = document.querySelector('.mp-disc-outer');
                if (disc) disc.style.animationPlayState = 'paused';
            });
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
        div.innerHTML = `
            <div class="music-pl-cover" style="background-image: url('${pl.cover}?param=100y100');"></div>
            <div class="music-pl-info">
                <div class="music-pl-title">${pl.name}</div>
                <div class="music-pl-sub">歌单 · ${pl.trackCount || 0}首</div>
            </div>
            <div class="music-pl-action">
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
        document.getElementById('music-import-url-input').value = '';
        document.getElementById('wyy-uid-input').value = '';
        document.getElementById('musicImportModal').classList.add('show');
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

// 方式二：UID 批量导入
async function musicDoWyyLogin() {
    const uid = document.getElementById('wyy-uid-input').value.trim();
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

    friends.forEach(charId => {
        const char = allChars.find(c => c.id === charId);
        if (!char) return;

        const item = document.createElement('div');
        item.className = 'music-friend-item';
        item.innerHTML = `
            <div class="music-friend-avatar" style="background-image: url('${char.avatarUrl || ''}'); background-size: cover; background-position: center;"></div>
            <div class="music-friend-info">
                <div class="music-friend-name">${char.netName || char.name}</div>
                <div class="music-friend-status">在线</div>
            </div>
            <div class="music-friend-action" onclick="inviteListenTogether('${char.id}', '${char.netName || char.name}')">一起听</div>
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

function inviteListenTogether(charId, charName) {
    const musicLoginId = ChatDB.getItem('music_current_login_account');
    const chatLoginId = ChatDB.getItem('current_login_account');

    if (musicLoginId !== chatLoginId) {
        alert('【账号不匹配】\n您当前在 Music 登录的账号，与 Chat APP 中登录的账号不一致。\n请切换到对应的账号后，再邀请该角色一起听歌！');
        return;
    }

    alert(`邀请成功！正在与 ${charName} 一起听歌...`);
    const statusEl = document.getElementById('mpListenTogetherStatus');
    if (statusEl) {
        statusEl.style.display = 'flex';
        document.getElementById('mpListenTogetherText').innerText = `正在与 ${charName} 一起听歌`;
    }
    openMusicPlayer();
}

// ==========================================
// 6. 全屏播放器逻辑
// ==========================================
function openMusicPlayer() {
    const player = document.getElementById('musicPlayerPanel');
    if (player) player.style.display = 'flex';
}

function closeMusicPlayer() {
    const player = document.getElementById('musicPlayerPanel');
    if (player) player.style.display = 'none';
    const statusEl = document.getElementById('mpListenTogetherStatus');
    if (statusEl) statusEl.style.display = 'none';
}
