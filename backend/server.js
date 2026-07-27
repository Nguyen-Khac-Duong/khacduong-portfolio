const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');

dns.setServers(['8.8.8.8', '1.1.1.1']);
console.log('DNS servers configured for MongoDB SRV lookup:', dns.getServers());

const app = express();
app.use(express.json());
app.use(cors());

const MONGO_URI = 'mongodb+srv://duongkhac284_db_user:Duong123456@cluster0.vslwndy.mongodb.net/portfolio_db?retryWrites=true&w=majority';
const OWNER_USERNAME = 'duongkhac284@gmail.com';
const OWNER_PASSWORD = '123456';
const OWNER_FULLNAME = 'Nguyễn Khắc Dương';
const PORT = process.env.PORT || 5000;

mongoose.set('strictQuery', false);

// -------------------------------------------------------------
// KẾT NỐI MONGODB
// -------------------------------------------------------------
async function connectMongo() {
    try {
        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 15000
        });
        console.log(`✅ THÀNH CÔNG: Đã kết nối MongoDB Atlas!`);
    } catch (err) {
        console.error('❌ LỖI KẾT NỐI MONGODB:');
        console.error(err.message || err);
        process.exit(1);
    }
}

// -------------------------------------------------------------
// SCHEMA DỮ LIỆU
// -------------------------------------------------------------
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullname: String
});
const User = mongoose.model('User', userSchema);

const skillSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    desc: { type: String, required: true }
});
const Skill = mongoose.model('Skill', skillSchema);

const projectSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    tags: { type: [String], default: [] }
});
const Project = mongoose.model('Project', projectSchema);

// -------------------------------------------------------------
// HÀM KHỞI TẠO DỮ LIỆU MẶC ĐỊNH
// -------------------------------------------------------------
async function findOrCreateDefaultUser() {
    let defaultUser = await User.findOne({ username: OWNER_USERNAME });
    if (!defaultUser) {
        defaultUser = new User({ username: OWNER_USERNAME, password: OWNER_PASSWORD, fullname: OWNER_FULLNAME });
        await defaultUser.save();
    }
    return defaultUser;
}

async function ensureDefaultPortfolio() {
    try {
        const defaultUser = await findOrCreateDefaultUser();

        const skillCount = await Skill.countDocuments({ userId: defaultUser._id });
        const projectCount = await Project.countDocuments({ userId: defaultUser._id });

        if (skillCount === 0) {
            await Skill.insertMany([
                { userId: defaultUser._id, title: 'Frontend', desc: 'HTML, CSS, JAVASCRIPT' },
                { userId: defaultUser._id, title: 'Backend', desc: 'Node.js, Express, MongoDB' },
                { userId: defaultUser._id, title: 'Data', desc: 'Big Data, PySpark, SQL' }
            ]);
            console.log('✅ Đã tạo Skills mặc định.');
        }

        if (projectCount === 0) {
            await Project.insertMany([
                {
                    userId: defaultUser._id,
                    title: 'Smart Door RFID',
                    description: 'Hệ thống cửa thông minh sử dụng thẻ từ RFID và ESP8266, tích hợp quản lý qua Web.',
                    image: 'image/kien-thuc-co-ban-ve-lap-trinh-web-128427.jpg',
                    tags: ['Arduino', 'C++']
                },
                {
                    userId: defaultUser._id,
                    title: 'Yelp Data Analysis',
                    description: 'Phân tích tập dữ liệu Yelp bằng PySpark trên môi trường Big Data.',
                    image: 'image/ngon-ngu-lap-trinh-la-gi-3.jpg',
                    tags: ['Python', 'Big Data']
                }
            ]);
            console.log('✅ Đã tạo Projects mặc định.');
        }
    } catch (err) {
        console.error('❌ Không thể kiểm tra hoặc tạo dữ liệu default:', err.message);
    }
}

// -------------------------------------------------------------
// ROUTES NGƯỜI DÙNG
// -------------------------------------------------------------
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, fullname } = req.body;
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Tài khoản đã tồn tại!' });
        }
        const newUser = new User({ username, password, fullname: fullname || username });
        await newUser.save();
        res.status(201).json({ message: 'Đăng ký thành công!' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username, password });
        if (!user) {
            return res.status(400).json({ message: 'Sai tài khoản hoặc mật khẩu!' });
        }
        res.json({
            message: 'Đăng nhập thành công!',
            user: { id: user._id, username: user.username, fullname: user.fullname }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/users/default', async (req, res) => {
    try {
        const defaultUser = await findOrCreateDefaultUser();
        res.json({ user: { id: defaultUser._id, username: defaultUser.username, fullname: defaultUser.fullname } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/api/owner', async (req, res) => {
    try {
        const owner = await findOrCreateDefaultUser();

        let skills = await Skill.find({ userId: owner._id });
        let projects = await Project.find({ userId: owner._id });

        if (skills.length === 0 || projects.length === 0) {
            await ensureDefaultPortfolio();
            skills = await Skill.find({ userId: owner._id });
            projects = await Project.find({ userId: owner._id });
        }

        res.json({
            user: { id: owner._id, username: owner.username, fullname: owner.fullname },
            skills,
            projects
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// -------------------------------------------------------------
// ROUTES SKILL
// -------------------------------------------------------------
app.get('/api/skills/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const skills = await Skill.find({ userId });
        res.json(skills);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/skills', async (req, res) => {
    try {
        const { userId, title, desc } = req.body;
        if (!userId || !title || !desc) {
            return res.status(400).json({ message: 'userId, title và desc là bắt buộc.' });
        }
        const skill = new Skill({ userId, title, desc });
        await skill.save();
        res.status(201).json({ message: 'Skill đã được tạo thành công.', skill });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.put('/api/skills/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, desc } = req.body;
        const skill = await Skill.findByIdAndUpdate(id, { title, desc }, { new: true });
        if (!skill) {
            return res.status(404).json({ message: 'Không tìm thấy skill.' });
        }
        res.json({ message: 'Skill đã được cập nhật.', skill });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.delete('/api/skills/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Skill.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ message: 'Không tìm thấy skill để xóa.' });
        }
        res.json({ message: 'Skill đã được xóa.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// -------------------------------------------------------------
// ROUTES PROJECT
// -------------------------------------------------------------
app.get('/api/projects/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const projects = await Project.find({ userId });
        res.json(projects);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.post('/api/projects', async (req, res) => {
    try {
        const { userId, title, description, image, tags } = req.body;
        if (!userId || !title || !description) {
            return res.status(400).json({ message: 'userId, title và description là bắt buộc.' });
        }
        const normalizedTags = Array.isArray(tags)
            ? tags
            : typeof tags === 'string'
                ? tags.split(',').map((tag) => tag.trim()).filter(Boolean)
                : [];

        const project = new Project({ userId, title, description, image, tags: normalizedTags });
        await project.save();
        res.status(201).json({ message: 'Project đã được tạo thành công.', project });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.put('/api/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, image, tags } = req.body;
        const normalizedTags = Array.isArray(tags)
            ? tags
            : typeof tags === 'string'
                ? tags.split(',').map((tag) => tag.trim()).filter(Boolean)
                : [];
        const project = await Project.findByIdAndUpdate(
            id,
            { title, description, image, tags: normalizedTags },
            { new: true }
        );
        if (!project) {
            return res.status(404).json({ message: 'Không tìm thấy project.' });
        }
        res.json({ message: 'Project đã được cập nhật.', project });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.delete('/api/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Project.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ message: 'Không tìm thấy project để xóa.' });
        }
        res.json({ message: 'Project đã được xóa.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// -------------------------------------------------------------
// START SERVER
// -------------------------------------------------------------
// -------------------------------------------------------------
// Phục vụ frontend và tài nguyên tĩnh khi deploy cùng backend
// -------------------------------------------------------------
const rootStaticPath = path.resolve(__dirname, '..');
app.use(express.static(rootStaticPath));
app.use(express.static(path.join(rootStaticPath, 'profile')));

app.get('/*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ message: 'API route not found' });
    }
    res.sendFile(path.join(rootStaticPath, 'profile', 'index.html'));
});

async function startServer() {
    await connectMongo();
    await ensureDefaultPortfolio();

    app.listen(PORT, () => {
        console.log(`🚀 Server Backend đang chạy tại: http://localhost:${PORT}`);
    });
}

startServer();