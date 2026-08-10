const express = require('express');
const router = express.Router();
const News = require('../models/News');
const Prediction = require('../models/Prediction');
const Surebet = require('../models/Surebet');
const GoalTable = require('../models/GoalTable');
const upload = require('../middlewares/multer');
const cloudinary = require('../config/cloudinary');

const auth = (req, res, next) => {
    if (req.session.isAdmin) return next();
    res.redirect('/admin/login');
};

router.get('/login', (req, res) => {
    res.render('admin/login');
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/admin/login');
    });
});

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
        req.session.isAdmin = true;
        return res.redirect('/admin');
    }
    res.redirect('/admin/login');
});

router.get('/', auth, (req, res) => {
    res.render('admin/dashboard');
});

// CRUD Noticias
router.get('/news', auth, async (req, res) => {
    const news = await News.find().sort({ createdAt: -1 });
    res.render('admin/news', { news });
});

router.post('/news', auth, upload.single('image'), async (req, res) => {
    try {
        const result = await cloudinary.uploader.upload(req.file.path);
        const news = new News({
            title: req.body.title,
            body: req.body.body,
            imageUrl: result.secure_url,
            cloudinaryId: result.public_id
        });
        await news.save();
        res.redirect('/admin/news');
    } catch (error) {
        res.status(500).send(error.message);
    }
});

router.post('/news/delete/:id', auth, async (req, res) => {
    try {
        const news = await News.findById(req.params.id);
        await cloudinary.uploader.destroy(news.cloudinaryId);
        await news.deleteOne();
        res.redirect('/admin/news');
    } catch (error) {
        res.status(500).send(error.message);
    }
});

router.post('/news/edit/:id', auth, async (req, res) => {
    try {
        await News.findByIdAndUpdate(req.params.id, {
            title: req.body.title,
            body: req.body.body
        });
        res.redirect('/admin/news');
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// CRUD Pronósticos
router.get('/predictions', auth, async (req, res) => {
    const data = await Prediction.find().sort({ createdAt: -1 });
    res.render('admin/predictions', { data });
});
router.post('/predictions', auth, async (req, res) => {
    const { event, time, eventDate, prediction, odds, bookmaker } = req.body;
    await new Prediction({ event, time, eventDate, prediction, odds, bookmaker }).save();
    res.redirect('/admin/predictions');
});
router.post('/predictions/status/:id', auth, async (req, res) => {
    await Prediction.findByIdAndUpdate(req.params.id, { status: req.body.status });
    res.redirect('/admin/predictions');
});
router.post('/predictions/delete/:id', auth, async (req, res) => {
    await Prediction.findByIdAndDelete(req.params.id);
    res.redirect('/admin/predictions');
});

// CRUD Surebets
router.get('/surebets', auth, async (req, res) => {
    const data = await Surebet.find().sort({ createdAt: -1 });
    res.render('admin/surebets', { data });
});
router.post('/surebets', auth, async (req, res) => {
    const { event, time, eventDate, market, line, percentage, bookmaker1, odds1, bookmaker2, odds2 } = req.body;
    await new Surebet({ event, time, eventDate, market, line, percentage, bookmaker1, odds1, bookmaker2, odds2 }).save();
    res.redirect('/admin/surebets');
});
router.post('/surebets/delete/:id', auth, async (req, res) => {
    await Surebet.findByIdAndDelete(req.params.id);
    res.redirect('/admin/surebets');
});

// CRUD Tabla Goles
router.get('/goal-tables', auth, async (req, res) => {
    const data = await GoalTable.find().sort({ createdAt: -1 });
    res.render('admin/goal-tables', { data });
});
router.post('/goal-tables', auth, async (req, res) => {
    const { league, event, time, eventDate, prediction, odds, bookmaker } = req.body;
    await new GoalTable({ league, event, time, eventDate, prediction, odds, bookmaker }).save();
    res.redirect('/admin/goal-tables');
});
router.post('/goal-tables/status/:id', auth, async (req, res) => {
    await GoalTable.findByIdAndUpdate(req.params.id, { status: req.body.status });
    res.redirect('/admin/goal-tables');
});
router.post('/goal-tables/delete/:id', auth, async (req, res) => {
    await GoalTable.findByIdAndDelete(req.params.id);
    res.redirect('/admin/goal-tables');
});

// ==========================================
// SECURE AJAX API ENDPOINTS FOR SINGLE PAGE ADMIN
// ==========================================

// JSON News CRUD
router.get('/api/news', auth, async (req, res) => {
    try {
        const news = await News.find().sort({ createdAt: -1 });
        res.json(news);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/api/news', auth, upload.single('image'), async (req, res) => {
    try {
        let imageUrl = req.body.imageUrl || req.body.imagen || '';
        let cloudinaryId = '';
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path);
            imageUrl = result.secure_url;
            cloudinaryId = result.public_id;
        }
        const news = new News({
            title: req.body.title || req.body.titulo,
            body: req.body.body || req.body.descripcion,
            imageUrl,
            cloudinaryId,
            category: req.body.category || req.body.tag || 'General'
        });
        await news.save();
        res.status(201).json(news);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/api/news/edit/:id', auth, upload.single('image'), async (req, res) => {
    try {
        const updateData = {
            title: req.body.title || req.body.titulo,
            body: req.body.body || req.body.descripcion,
            category: req.body.category || req.body.tag || 'General'
        };
        if (req.file) {
            const news = await News.findById(req.params.id);
            if (news && news.cloudinaryId) {
                try {
                    await cloudinary.uploader.destroy(news.cloudinaryId);
                } catch (e) {
                    console.error('Error destroying old image:', e);
                }
            }
            const result = await cloudinary.uploader.upload(req.file.path);
            updateData.imageUrl = result.secure_url;
            updateData.cloudinaryId = result.public_id;
        } else if (req.body.imageUrl || req.body.imagen) {
            updateData.imageUrl = req.body.imageUrl || req.body.imagen;
        }
        const updated = await News.findByIdAndUpdate(req.params.id, updateData, { returnDocument: 'after' });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/api/news/delete/:id', auth, async (req, res) => {
    try {
        const news = await News.findById(req.params.id);
        if (news && news.cloudinaryId) {
            try {
                await cloudinary.uploader.destroy(news.cloudinaryId);
            } catch (e) {
                console.error('Error destroying Cloudinary image:', e);
            }
        }
        await News.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// JSON Predictions CRUD
router.get('/api/predictions', auth, async (req, res) => {
    try {
        const data = await Prediction.find().sort({ createdAt: -1 });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/api/predictions', auth, async (req, res) => {
    try {
        const { event, time, eventDate, prediction, odds, bookmaker, status } = req.body;
        const newPred = new Prediction({ event, time, eventDate, prediction, odds, bookmaker, status });
        await newPred.save();
        res.status(201).json(newPred);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/api/predictions/edit/:id', auth, async (req, res) => {
    try {
        const { event, time, eventDate, prediction, odds, bookmaker, status } = req.body;
        const updated = await Prediction.findByIdAndUpdate(req.params.id, {
            event, time, eventDate, prediction, odds, bookmaker, status
        }, { returnDocument: 'after' });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/api/predictions/status/:id', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const updated = await Prediction.findByIdAndUpdate(req.params.id, { status }, { returnDocument: 'after' });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/api/predictions/delete/:id', auth, async (req, res) => {
    try {
        await Prediction.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// JSON Surebets CRUD
router.get('/api/surebets', auth, async (req, res) => {
    try {
        const data = await Surebet.find().sort({ createdAt: -1 });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/api/surebets', auth, async (req, res) => {
    try {
        const { event, time, eventDate, market, line, percentage, bookmaker1, odds1, bookmaker2, odds2 } = req.body;
        const newSure = new Surebet({ event, time, eventDate, market, line, percentage, bookmaker1, odds1, bookmaker2, odds2 });
        await newSure.save();
        res.status(201).json(newSure);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/api/surebets/edit/:id', auth, async (req, res) => {
    try {
        const { event, time, eventDate, market, line, percentage, bookmaker1, odds1, bookmaker2, odds2 } = req.body;
        const updated = await Surebet.findByIdAndUpdate(req.params.id, {
            event, time, eventDate, market, line, percentage, bookmaker1, odds1, bookmaker2, odds2
        }, { returnDocument: 'after' });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/api/surebets/delete/:id', auth, async (req, res) => {
    try {
        await Surebet.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// JSON GoalTables CRUD
router.get('/api/goal-tables', auth, async (req, res) => {
    try {
        const data = await GoalTable.find().sort({ createdAt: -1 });
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/api/goal-tables', auth, async (req, res) => {
    try {
        const { league, event, time, eventDate, prediction, odds, bookmaker, status } = req.body;
        const newGoal = new GoalTable({ league, event, time, eventDate, prediction, odds, bookmaker, status });
        await newGoal.save();
        res.status(201).json(newGoal);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/api/goal-tables/edit/:id', auth, async (req, res) => {
    try {
        const { league, event, time, eventDate, prediction, odds, bookmaker, status } = req.body;
        const updated = await GoalTable.findByIdAndUpdate(req.params.id, {
            league, event, time, eventDate, prediction, odds, bookmaker, status
        }, { returnDocument: 'after' });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/api/goal-tables/status/:id', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const updated = await GoalTable.findByIdAndUpdate(req.params.id, { status }, { returnDocument: 'after' });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/api/goal-tables/delete/:id', auth, async (req, res) => {
    try {
        await GoalTable.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
