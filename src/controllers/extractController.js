const scraperService = require('../services/scraperService');
const { isValidFacebookAdsUrl } = require('../utils/validators');
const { URL } = require('url');

function startExtraction(req, res) {
  const { url } = req.body;

  if (!url || !isValidFacebookAdsUrl(url)) {
    return res.status(400).json({ error: 'Please provide a valid Facebook Ads Library URL' });
  }

  const session = scraperService.createSession();

  res.json({
    sessionId: session.id,
    status: session.status,
    message: 'Session created',
  });

  scraperService.startExtraction(session.id, url, (progress) => {
    if (req.app.get('wss')) {
      const wss = req.app.get('wss');
      const data = JSON.stringify({ type: 'progress', ...progress });
      wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(data);
        }
      });
    }
  }).catch((err) => {
    console.error('Extraction error:', err.message);
  });
}

function getStatus(req, res) {
  const { sessionId } = req.params;
  const session = scraperService.getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({
    sessionId: session.id,
    status: session.status,
    progress: session.progress,
    message: session.message,
    totalBusinesses: session.totalBusinesses,
    totalPhones: session.totalPhones,
    ads: session.status === 'completed' ? session.ads : undefined,
    results: session.status === 'completed' ? session.results : undefined,
  });
}

async function getExport(req, res) {
  const { sessionId } = req.params;
  const session = scraperService.getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  try {
    const fileName = await scraperService.generateExport(sessionId);
    const filePath = scraperService.exportService.getFilePath(fileName);

    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function getSessions(req, res) {
  const sessions = [];
  scraperService.sessions.forEach((s, id) => {
    sessions.push({
      id,
      status: s.status,
      progress: s.progress,
      totalBusinesses: s.totalBusinesses,
      totalPhones: s.totalPhones,
      createdAt: s.createdAt,
    });
  });
  res.json({ sessions: sessions.sort((a, b) => b.createdAt - a.createdAt).slice(0, 20) });
}

module.exports = { startExtraction, getStatus, getExport, getSessions };
