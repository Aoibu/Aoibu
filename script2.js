// دوال صغيرة تم استخراجها من HTML
function goToEpisode() {
    const ep = document.getElementById('epInput').value;
    if(ep) window.location.href = `${ep}.html`;
}

function reportIssue() {
    const epNumber = document.querySelector('.ep-display').innerText || "Unknown";
    const text = `يوجد مشكلة في الحلقة ${epNumber} من انمي المحقق كونان، يرجى الإصلاح.`;
    const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&screen_name=TheConanSign`;
    window.open(tweetUrl, '_blank');
}

// السكربت الرئيسي
const navPath = window.location.pathname;
const navFileName = navPath.substring(navPath.lastIndexOf('/') + 1);
const epMatch = navFileName.match(/(\d+)/);
const currentEp = epMatch ? epMatch[0] : "82627"; 

document.title = document.title.replace(/{EP}/g, currentEp);

function hideLoader() {
    document.body.classList.add('loaded');
}

window.addEventListener('load', () => setTimeout(hideLoader, 500));
setTimeout(hideLoader, 3000); 

const particleContainer = document.getElementById('particles-container');
if (particleContainer) {
    for (let i = 0; i < 35; i++) {
        let p = document.createElement('div');
        p.classList.add('particle');
        let size = Math.random() * 3 + 1;
        let left = Math.random() * 100;
        let duration = Math.random() * 10 + 10;
        let delay = Math.random() * 10;
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;
        p.style.left = `${left}%`;
        p.style.animation = `floatUp ${duration}s linear ${delay}s infinite`;
        particleContainer.appendChild(p);
    }
}

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if(entry.isIntersecting) entry.target.classList.add('visible');
    });
}, { threshold: 0.1 });
document.querySelectorAll('.glass-card').forEach(el => observer.observe(el));

function changeServer(url, btn) {
    const videoWrap = document.querySelector('.video-wrap');
    if(url.includes('.mp4')) {
        videoWrap.innerHTML = '<video controls autoplay src="' + url + '"></video>';
    } else {
        videoWrap.innerHTML = '<iframe id="videoFrame" src="' + url + '" allowfullscreen></iframe>';
    }
    document.querySelectorAll('.neon-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function shareEpisode() {
    const url = window.location.href;
    navigator.clipboard.writeText(url)
    .then(() => alert("تم نسخ رابط الحلقة!"))
    .catch(() => prompt("انسخ الرابط يدوياً:", url));
}

const prevBtn = document.getElementById("prevEpisode");
const nextBtn = document.getElementById("nextEpisode");
const epNumInt = parseInt(currentEp);

if (!isNaN(epNumInt)) {
    if (epNumInt > 1) {
        prevBtn.setAttribute("href", `${epNumInt - 1}.html`);
    } else {
        prevBtn.style.opacity = "0.4";
        prevBtn.style.pointerEvents = "none";
    }
    nextBtn.setAttribute("href", `${epNumInt + 1}.html`);
}

const RATING_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwzK1u56o3Vz2qiNIEio_NMZKThCkckFCUOG2fi0HZCXn2pDGjxmcy6mxXP3hsZ7HkjWA/exec"; 

function rate(n) {
    let stars = document.querySelectorAll('.stars span');
    stars.forEach((s, index) => {
        s.style.color = index < n ? '#ffd700' : '#333';
        s.style.textShadow = index < n ? '0 0 15px #ffd700' : 'none';
    });

    const msgElement = document.getElementById('rating-msg');
    msgElement.innerText = `جاري إرسال تقييمك (${n}/5)...`;

    fetch(`${RATING_SCRIPT_URL}?episode=${currentEp}&rating=${n}`, {
        method: "POST", mode: "no-cors"
    })
    .then(() => {
        msgElement.innerText = `تم تسجيل تقييمك بنجاح! (${n}/5)`;
        msgElement.style.color = "#00bcd4";
        document.getElementById('rating-stars').style.pointerEvents = 'none';
    })
    .catch(error => {
        msgElement.innerText = `حدث خطأ في الاتصال.`;
        msgElement.style.color = "red";
    });
}

const COMMENTS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwzV7dMLHD51j_DOypZXcrhSBR2YVVruMjsAHfKxCL0CqSf7zRLiWC6ofLpu6KHfoA_/exec"; 
let parentId = "";

document.addEventListener("DOMContentLoaded", fetchComments);

function fetchComments() {
    const container = document.getElementById('comments-container');
    fetch(`${COMMENTS_SCRIPT_URL}?episode=${currentEp}`)
    .then(response => response.json())
    .then(data => {
        container.innerHTML = "";
        if(data.length === 0) {
            container.innerHTML = "<p style='text-align:center; color:#777;'>كن أول من يعلق!</p>";
            return;
        }
        renderComments(data);
    })
    .catch(error => {
        console.error(error);
        container.innerHTML = "<p style='color:red; text-align:center;'>حدث خطأ في تحميل التعليقات.</p>";
    });
}

function renderComments(comments) {
    const container = document.getElementById('comments-container');
    const commentsMap = {};
    comments.forEach(c => { c.children = []; commentsMap[c.id] = c; });

    const roots = [];
    comments.forEach(c => {
        if (c.parent_id && commentsMap[c.parent_id]) {
            commentsMap[c.parent_id].children.push(c);
        } else {
            roots.push(c);
        }
    });

    roots.forEach(root => {
        container.appendChild(createCommentElement(root));
    });
}

function createCommentElement(c) {
    const div = document.createElement('div');
    div.className = 'comment-item';
    div.id = `comment-${c.id}`;
    
    const safeName = escapeHtml(c.name || "متابع");
    const safeContent = escapeHtml(c.content);

    div.innerHTML = `
        <div class="comment-header">
            <span class="comment-author">${safeName}</span>
            <span class="comment-date">${new Date(c.timestamp).toLocaleDateString('ar-EG')}</span>
        </div>
        <div class="comment-body">${safeContent}</div>
        <div class="comment-actions">
            <span class="action-btn" onclick="likeComment('${c.id}', this)">❤️ <span class="like-count">${c.likes}</span></span>
            <span class="action-btn" onclick="setReply('${c.id}', '${safeName}')">↩️ رد</span>
        </div>
    `;

    if (c.children && c.children.length > 0) {
        const replyBox = document.createElement('div');
        replyBox.style.marginRight = "20px";
        replyBox.style.borderRight = "2px solid var(--primary-color)";
        c.children.forEach(kid => replyBox.appendChild(createCommentElement(kid)));
        div.appendChild(replyBox);
    }
    return div;
}

document.getElementById('commentForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const btn = this.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = "جاري الإرسال...";
    btn.disabled = true;

    const formData = new FormData();
    formData.append('action', 'add_comment');
    formData.append('episode', currentEp);
    formData.append('name', document.getElementById('c-name').value);
    formData.append('content', document.getElementById('c-content').value);
    formData.append('parent_id', parentId);

    fetch(COMMENTS_SCRIPT_URL, { method: 'POST', body: formData })
    .then(res => res.json())
    .then(data => {
        if(data.result === "success") {
            document.getElementById('c-content').value = "";
            cancelReply();
            fetchComments();
        } else { alert("خطأ في الإرسال"); }
    })
    .catch(() => alert("فشل الاتصال"))
    .finally(() => { btn.innerText = originalText; btn.disabled = false; });
});

function likeComment(id, btnElement) {
    if(btnElement.classList.contains('liked')) return;
    
    const countSpan = btnElement.querySelector('.like-count');
    const currentCount = parseInt(countSpan.innerText);
    countSpan.innerText = currentCount + 1;
    btnElement.style.color = "#ff3d3d";
    btnElement.classList.add('liked');

    const formData = new FormData();
    formData.append('action', 'like');
    formData.append('id', id);
    
    fetch(COMMENTS_SCRIPT_URL, { method: 'POST', body: formData });
}

function setReply(id, name) {
    parentId = id;
    document.getElementById('reply-status').style.display = 'flex';
    document.getElementById('reply-to-name').innerText = name;
    document.getElementById('c-content').focus();
}

function cancelReply() {
    parentId = "";
    document.getElementById('reply-status').style.display = 'none';
}

function escapeHtml(text) {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
    if ((e.ctrlKey && ['c','u','s'].includes(e.key.toLowerCase())) || e.key === 'F12') e.preventDefault();
});

const schemaData = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": "انمي المحقق كونان الحلقة 82627 مترجمة",
    "description": "مشاهدة الحلقة 82627 من انمي المحقق كونان...",
    "thumbnailUrl": "https://i.ibb.co/0yBsD1vf/11004.jpg",
    "uploadDate": new Date().toISOString(),
    "contentUrl": window.location.href,
    "embedUrl": "Hsbshss"
};
const script = document.createElement('script');
script.type = 'application/ld+json';
script.text = JSON.stringify(schemaData);
document.head.appendChild(script);
