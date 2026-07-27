const API_BASE = 'http://localhost:5000/api';
const OWNER_USERNAME = 'duongkhac284@gmail.com';
let pendingDelete = { type: '', id: '' };

function getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser') || 'null');
}

async function getActiveUser() {
    const currentUser = getCurrentUser();
    if (currentUser) return currentUser;

    const ownerData = await fetchOwnerData();
    return ownerData ? ownerData.user : null;
}

function updateHeaderWithUser(user) {
    if (!user) return;
    const nameHeading = document.querySelector('.profile-name') || document.querySelector('h1');
    if (nameHeading) nameHeading.textContent = user.fullname || user.username;

    const userNameSpan = document.querySelector('.user-name');
    if (userNameSpan) userNameSpan.textContent = user.fullname || user.username;
}

async function fetchOwnerData() {
    try {
        const response = await fetch(`${API_BASE}/owner`);
        if (!response.ok) {
            console.error('Không lấy được owner mặc định:', response.statusText);
            return null;
        }
        return await response.json();
    } catch (err) {
        console.error('Lỗi fetch owner data:', err);
        return null;
    }
}

async function loadSkills(userId) {
    try {
        const response = await fetch(`${API_BASE}/skills/${userId}`);
        if (!response.ok) {
            console.error('Không thể tải skills:', response.statusText);
            return;
        }
        const skills = await response.json();
        renderSkills(skills);
    } catch (err) {
        console.error('Lỗi khi load skills:', err);
    }
}

async function loadProjects(userId) {
    try {
        const response = await fetch(`${API_BASE}/projects/${userId}`);
        if (!response.ok) {
            console.error('Không thể tải projects:', response.statusText);
            return;
        }
        const projects = await response.json();
        renderProjects(projects);
    } catch (err) {
        console.error('Lỗi khi load projects:', err);
    }
}

function renderSkills(skills) {
    const skillsFlex = document.querySelector('.skills-flex');
    const addSkillBtn = document.querySelector('.add-new-skill');
    if (!skillsFlex || !addSkillBtn) return;

    const existingCards = skillsFlex.querySelectorAll('.skill-card:not(.add-new-skill)');
    existingCards.forEach(card => card.remove());

    skills.forEach((skill) => {
        const card = document.createElement('div');
        card.className = 'skill-card';
        card.dataset.id = skill._id;
        card.innerHTML = `
            <div class="card-actions">
                <button class="btn-edit" onclick="openEditSkillModal('${skill._id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-delete" onclick="confirmDelete('skill', '${skill._id}')"><i class="fas fa-trash"></i></button>
            </div>
            <i class="icon"></i>
            <h3>${skill.title}</h3>
            <p>${skill.desc}</p>
        `;
        skillsFlex.insertBefore(card, addSkillBtn);
    });
}

function renderProjects(projects) {
    const projectFlex = document.querySelector('.project-flex');
    const addProjectBtn = document.querySelector('.add-new-card');
    if (!projectFlex || !addProjectBtn) return;

    const existingCards = projectFlex.querySelectorAll('.project-card:not(.add-new-card)');
    existingCards.forEach(card => card.remove());

    projects.forEach((project) => {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.dataset.id = project._id;
        const tagsHTML = (project.tags || []).map(tag => `<span class="tag">${tag}</span>`).join(' ');
        card.innerHTML = `
            <div class="card-actions">
                <button class="btn-edit" onclick="openEditProjectModal('${project._id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-delete" onclick="confirmDelete('project', '${project._id}')"><i class="fas fa-trash"></i></button>
            </div>
            <div class="project-image">
                <img src="${project.image || '../image/kien-thuc-co-ban-ve-lap-trinh-web-128427.jpg'}" alt="${project.title}">
                <div class="project-overlay">
                    <p class="project-overlay-desc">${project.description}</p>
                    <a href="#" class="btn-view">Chi tiết</a>
                </div>
            </div>
            <div class="project-info">
                <h3>${project.title}</h3>
                ${tagsHTML}
            </div>
        `;
        projectFlex.insertBefore(card, addProjectBtn);
    });
}

async function setGuestView() {
    renderSkills([]);
    renderProjects([]);

    const ownerData = await fetchOwnerData();
    if (ownerData && ownerData.user) {
        updateHeaderWithUser(ownerData.user);
        renderSkills(ownerData.skills || []);
        renderProjects(ownerData.projects || []);
    } else {
        updateHeaderWithUser({ fullname: 'Nguyễn Khắc Dương', username: OWNER_USERNAME });
    }

    updateAdminVisibility();
}

async function loadPageData() {
    const currentUser = getCurrentUser();

    if (!currentUser) {
        await setGuestView();
        return;
    }

    if (currentUser.username === OWNER_USERNAME) {
        const ownerData = await fetchOwnerData();
        if (ownerData && ownerData.user) {
            updateHeaderWithUser(ownerData.user);
            renderSkills(ownerData.skills || []);
            renderProjects(ownerData.projects || []);
            updateAdminVisibility();
            return;
        }
    }

    updateHeaderWithUser(currentUser);
    await Promise.all([loadSkills(currentUser.id), loadProjects(currentUser.id)]);
    updateAdminVisibility();
}

document.addEventListener('DOMContentLoaded', async () => {
    updateAdminVisibility();

    const loginForm = document.getElementById('form-login');
    if (loginForm) {
        loginForm.setAttribute('novalidate', 'novalidate');

        new Validator({
            form: '#form-login',
            formGroupSelector: '.form-group',
            errorSelector: '.form-message',
            rules: [
                Validator.isRequired('#login-user', 'Vui lòng nhập tài khoản/email'),
                Validator.isRequired('#login-pass', 'Vui lòng nhập mật khẩu'),
                Validator.minLength('#login-pass', 6)
            ],
            onSubmit: async function (data) {
                try {
                    const response = await fetch(`${API_BASE}/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            username: data.username || data.email,
                            password: data.password
                        })
                    });

                    const result = await response.json();
                    if (response.ok) {
                        localStorage.setItem('isLoggedIn', 'true');
                        localStorage.setItem('currentUser', JSON.stringify(result.user));
                        updateAdminVisibility();
                        await loadPageData();
                        loginForm.reset();
                        closeModal('modal-login');
                        alert(`Đăng nhập thành công! Chào mừng ${result.user.fullname || result.user.username} quay trở lại.`);
                    } else {
                        alert(result.message || 'Sai tài khoản hoặc mật khẩu!');
                    }
                } catch (err) {
                    alert('Không thể kết nối tới Server Backend!');
                }
            }
        });
    }

    const addSkillTrigger = document.querySelector('.add-new-skill');
    if (addSkillTrigger) {
        addSkillTrigger.addEventListener('click', () => openSkillModal());
    }

    const addProjectTrigger = document.querySelector('.add-new-card');
    if (addProjectTrigger) {
        addProjectTrigger.addEventListener('click', () => openProjectModal());
    }

    const confirmDeleteBtn = document.getElementById('btn-confirm-delete-execute');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async function () {
            if (pendingDelete.type === 'skill') {
                await deleteSkillById(pendingDelete.id);
            } else if (pendingDelete.type === 'project') {
                await deleteProjectById(pendingDelete.id);
            }
            closeModal('modal-confirm-delete');
            pendingDelete = { type: '', id: '' };
        });
    }

    window.addEventListener('click', (event) => {
        const dropdown = document.getElementById('user-menu');
        if (dropdown && !dropdown.contains(event.target)) {
            dropdown.classList.remove('active');
        }
        if (event.target.classList.contains('modal')) {
            closeModal(event.target.id);
        }
    });

    await loadPageData();
});

function updateAdminVisibility() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const currentUser = getCurrentUser();

    document.body.classList.toggle('logged-in', isLoggedIn);

    const guestOnlyElements = document.querySelectorAll('.guest-only');
    guestOnlyElements.forEach((element) => {
        const desiredDisplay = element.dataset.guestDisplay || 'block';
        element.style.display = isLoggedIn ? 'none' : desiredDisplay;
    });

    const nameHeading = document.querySelector('.profile-name') || document.querySelector('h1');
    if (nameHeading && currentUser) {
        nameHeading.textContent = currentUser.fullname || currentUser.username;
    }

    const userNameSpan = document.querySelector('.user-name');
    if (userNameSpan && currentUser) {
        userNameSpan.textContent = currentUser.fullname || currentUser.username;
    }

    const addSkillBtn = document.querySelector('.add-new-skill');
    const addProjectBtn = document.querySelector('.add-new-card');
    const actionButtons = document.querySelectorAll('.card-actions');

    if (addSkillBtn) addSkillBtn.style.display = isLoggedIn ? 'flex' : 'none';
    if (addProjectBtn) addProjectBtn.style.display = isLoggedIn ? 'flex' : 'none';
    actionButtons.forEach((btn) => {
        btn.style.display = isLoggedIn ? 'flex' : 'none';
    });
}

function toggleUserDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('user-menu');
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

async function handleLogout(event) {
    if (event) event.preventDefault();

    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('currentUser');

    await setGuestView();

    const dropdown = document.getElementById('user-menu');
    if (dropdown) dropdown.classList.remove('active');

    alert('Đã đăng xuất tài khoản thành công!');
}

function openSkillModal(editId = null) {
    const titleEl = document.getElementById('skill-modal-title');
    const hiddenIdEl = document.getElementById('edit-skill-id');
    const form = document.getElementById('form-skill');

    if (titleEl) titleEl.textContent = editId ? 'Sửa Kỹ Năng' : 'Thêm Kỹ Năng Mới';
    if (hiddenIdEl) hiddenIdEl.value = editId || '';

    if (editId) {
        const card = document.querySelector(`.skill-card[data-id="${editId}"]`);
        if (card) {
            const title = card.querySelector('h3');
            const desc = card.querySelector('p');
            const titleInput = document.getElementById('skill-title');
            const descInput = document.getElementById('skill-desc');
            if (titleInput) titleInput.value = title ? title.textContent.trim() : '';
            if (descInput) descInput.value = desc ? desc.textContent.trim() : '';
        }
    } else if (form) {
        form.reset();
    }

    openModal('modal-skill');
}

function openEditSkillModal(id) {
    openSkillModal(id);
}

async function handleSkillSubmit(event) {
    event.preventDefault();

    const title = document.getElementById('skill-title').value.trim();
    const desc = document.getElementById('skill-desc').value.trim();
    const editId = document.getElementById('edit-skill-id').value;

    if (!title || !desc) {
        alert('Vui lòng nhập đầy đủ thông tin kỹ năng.');
        return;
    }

    if (editId) {
        await updateSkill(editId, title, desc);
    } else {
        await createSkill(title, desc);
    }

    document.getElementById('form-skill').reset();
    closeModal('modal-skill');
}

async function handleProjectSubmit(event) {
    event.preventDefault();

    const title = document.getElementById('project-title').value.trim();
    const description = document.getElementById('project-desc').value.trim();
    const image = document.getElementById('project-image').value.trim();
    const tags = document.getElementById('project-tags').value.trim();
    const editId = document.getElementById('edit-project-id').value;

    if (!title || !description || !tags) {
        alert('Vui lòng nhập đầy đủ thông tin dự án.');
        return;
    }

    if (editId) {
        await updateProject(editId, title, description, image, tags);
    } else {
        await createProject(title, description, image, tags);
    }

    document.getElementById('form-project').reset();
    closeModal('modal-project');
}

async function createSkill(title, desc) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        alert('Bạn cần đăng nhập để thêm kỹ năng.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/skills`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.id, title, desc })
        });
        const result = await response.json();
        if (!response.ok) {
            alert(result.message || 'Tạo kỹ năng thất bại.');
            return;
        }
        await loadSkills(currentUser.id);
    } catch (err) {
        console.error('Lỗi tạo skill:', err);
        alert('Lỗi khi lưu kỹ năng.');
    }
}

async function updateSkill(id, title, desc) {
    try {
        const response = await fetch(`${API_BASE}/skills/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, desc })
        });
        const result = await response.json();
        if (!response.ok) {
            alert(result.message || 'Cập nhật kỹ năng thất bại.');
            return;
        }
        const currentUser = await getActiveUser();
        if (!currentUser) return;
        await loadSkills(currentUser.id);
    } catch (err) {
        console.error('Lỗi cập nhật skill:', err);
        alert('Lỗi khi cập nhật kỹ năng.');
    }
}

async function deleteSkillById(id) {
    try {
        const response = await fetch(`${API_BASE}/skills/${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (!response.ok) {
            alert(result.message || 'Xóa kỹ năng thất bại.');
            return;
        }
        const currentUser = await getActiveUser();
        if (!currentUser) return;
        await loadSkills(currentUser.id);
    } catch (err) {
        console.error('Lỗi xóa skill:', err);
        alert('Lỗi khi xóa kỹ năng.');
    }
}

async function createProject(title, description, image, tagsInput) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        alert('Bạn cần đăng nhập để thêm dự án.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/projects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.id,
                title,
                description,
                image,
                tags: tagsInput.split(',').map(tag => tag.trim()).filter(Boolean)
            })
        });
        const result = await response.json();
        if (!response.ok) {
            alert(result.message || 'Tạo dự án thất bại.');
            return;
        }
        await loadProjects(currentUser.id);
    } catch (err) {
        console.error('Lỗi tạo project:', err);
        alert('Lỗi khi lưu dự án.');
    }
}

async function updateProject(id, title, description, image, tagsInput) {
    try {
        const response = await fetch(`${API_BASE}/projects/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title,
                description,
                image,
                tags: tagsInput.split(',').map(tag => tag.trim()).filter(Boolean)
            })
        });
        const result = await response.json();
        if (!response.ok) {
            alert(result.message || 'Cập nhật dự án thất bại.');
            return;
        }
        const currentUser = await getActiveUser();
        if (!currentUser) return;
        await loadProjects(currentUser.id);
    } catch (err) {
        console.error('Lỗi cập nhật project:', err);
        alert('Lỗi khi cập nhật dự án.');
    }
}

async function deleteProjectById(id) {
    try {
        const response = await fetch(`${API_BASE}/projects/${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (!response.ok) {
            alert(result.message || 'Xóa dự án thất bại.');
            return;
        }
        const currentUser = await getActiveUser();
        if (!currentUser) return;
        await loadProjects(currentUser.id);
    } catch (err) {
        console.error('Lỗi xóa project:', err);
        alert('Lỗi khi xóa dự án.');
    }
}

function openProjectModal(editId = null) {
    const titleEl = document.getElementById('project-modal-title');
    const hiddenIdEl = document.getElementById('edit-project-id');
    const form = document.getElementById('form-project');

    if (titleEl) titleEl.textContent = editId ? 'Sửa Dự Án' : 'Thêm Dự Án Mới';
    if (hiddenIdEl) hiddenIdEl.value = editId || '';

    if (editId) {
        const card = document.querySelector(`.project-card[data-id="${editId}"]`);
        if (card) {
            const title = card.querySelector('.project-info h3');
            const desc = card.querySelector('.project-overlay-desc');
            const image = card.querySelector('.project-image img');
            const tags = Array.from(card.querySelectorAll('.tag')).map(tag => tag.textContent.trim());
            const titleInput = document.getElementById('project-title');
            const descInput = document.getElementById('project-desc');
            const imageInput = document.getElementById('project-image');
            const tagsInput = document.getElementById('project-tags');

            if (titleInput) titleInput.value = title ? title.textContent.trim() : '';
            if (descInput) descInput.value = desc ? desc.textContent.trim() : '';
            if (imageInput) imageInput.value = image ? image.getAttribute('src') : '';
            if (tagsInput) tagsInput.value = tags.join(', ');
        }
    } else if (form) {
        form.reset();
    }

    openModal('modal-project');
}

function openEditProjectModal(id) {
    openProjectModal(id);
}

function confirmDelete(type, id) {
    pendingDelete = { type, id };
    openModal('modal-confirm-delete');
}
