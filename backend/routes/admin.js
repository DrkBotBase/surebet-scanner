const express = require('express');
const router = express.Router();
const moment = require('moment-timezone');
const News = require('../models/News');
const Prediction = require('../models/Prediction');
const Surebet = require('../models/Surebet');
const GoalTable = require('../models/GoalTable');
const SystemConfig = require('../models/SystemConfig');
const upload = require('../middlewares/multer');
const cloudinary = require('../config/cloudinary');
const { getMatchInfo } = require('../services/test');
const { validatePredictionStatus } = require('../services/validateService');

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
        const { event, team1, team2, flashscoreId, time, eventDate, prediction, odds, bookmaker, status, score } = req.body;
        
        //const colombiaDate = moment.utc(eventDate).startOf('day').toDate();
        
        const newPred = new Prediction({ 
            event, 
            team1,
            team2,
            flashscoreId,
            time, 
            eventDate, 
            prediction, 
            odds, 
            bookmaker, 
            status, 
            score: score || '0:0' 
        });
        await newPred.save();
        res.status(201).json(newPred);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/api/predictions/edit/:id', auth, async (req, res) => {
    try {
        const { event, team1, team2, flashscoreId, time, eventDate, prediction, odds, bookmaker, status, score } = req.body;
        const updated = await Prediction.findByIdAndUpdate(req.params.id, {
            event, team1, team2, flashscoreId, time, eventDate, prediction, odds, bookmaker, status, score
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

router.post('/api/predictions/validate/:id', auth, async (req, res) => {
    try {
        const result = await validatePredictionStatus(req.params.id);
        if (!result.success) return res.status(400).json(result);
        res.json(result);
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

router.post('/api/scrape-match', auth, async (req, res) => {
    try {
        const { id } = req.body;
        const matchData = await getMatchInfo(id);
        res.json(matchData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

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
        
        //const colombiaDate = moment.utc(eventDate).startOf('day').toDate();
        
        const newSure = new Surebet({ 
            event, 
            time, 
            eventDate, 
            market, 
            line, 
            percentage, 
            bookmaker1, 
            odds1, 
            bookmaker2, 
            odds2 
        });
        await newSure.save();
        res.status(201).json(newSure);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/api/surebets/edit/:id', auth, async (req, res) => {
    try {
        const { event, time, eventDate, market, line, percentage, bookmaker1, odds1, bookmaker2, odds2 } = req.body;
        
        //const colombiaDate = moment.utc(eventDate).startOf('day').toDate();
        
        const updated = await Surebet.findByIdAndUpdate(req.params.id, {
            event, 
            time, 
            eventDate, 
            market, 
            line, 
            percentage, 
            bookmaker1, 
            odds1, 
            bookmaker2, 
            odds2
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
        const { league, event, team1, team2, flashscoreId, time, eventDate, prediction, odds, bookmaker, status, score } = req.body;
        
        //const colombiaDate = moment.utc(eventDate).startOf('day').toDate();
        
        const newGoal = new GoalTable({ 
            league, 
            event, 
            team1,
            team2,
            flashscoreId,
            time, 
            eventDate, 
            prediction, 
            odds, 
            bookmaker, 
            status, 
            score: score || '0:0' 
        });
        await newGoal.save();
        res.status(201).json(newGoal);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/api/goal-tables/edit/:id', auth, async (req, res) => {
    try {
        const { league, event, team1, team2, flashscoreId, time, eventDate, prediction, odds, bookmaker, status, score } = req.body;
        const updated = await GoalTable.findByIdAndUpdate(req.params.id, {
            league, event, team1, team2, flashscoreId, time, eventDate, prediction, odds, bookmaker, status, score
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

// Configuración de scraper automático
router.get('/api/config/scraper', auth, async (req, res) => {
    try {
        let config = await SystemConfig.findOne({ key: 'autoScraper' });
        if (!config) config = await SystemConfig.create({ key: 'autoScraper', value: false });
        res.json({ enabled: config.value });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/api/config/scraper', auth, async (req, res) => {
    try {
        const { enabled } = req.body;
        await SystemConfig.findOneAndUpdate(
            { key: 'autoScraper' },
            { value: enabled },
            { upsert: true, returnDocument: 'after' }
        );
        res.json({ success: true, enabled });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/api/refresh-match/:type/:id', auth, async (req, res) => {
    try {
        const { type, id } = req.params;
        const Model = type === 'prediction' ? Prediction : GoalTable;
        
        const item = await Model.findById(id);
        if (!item || !item.flashscoreId) {
            return res.status(404).json({ error: 'Partido no encontrado o sin ID de Flashscore' });
        }

        const updatedData = await getMatchInfo(item.flashscoreId);

        item.score = updatedData.score;
        item.status = updatedData.status;
        
        if (updatedData.datetime && updatedData.datetime.iso) {
            item.eventDate = moment.tz(updatedData.datetime.iso, "America/Bogota").startOf('day').toDate();
        }
        
        await item.save();
        res.json({ success: true, data: item });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;