const scraperService = require('../services/scraperService');
const { isValidFacebookAdsUrl } = require('../utils/validators');
const { URL } = require('url');

function broadcastProgress(wss, progress) {
  if (wss) {
    const data = JSON.stringify({ type: 'progress', ...progress });
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(data);
      }
    });
  }
}

function startExtraction(req, res) {
  const { url } = req.body;

  if (!url || !isValidFacebookAdsUrl(url)) {
    return res.status(400).json({ error: 'Please provide a valid Facebook Ads Library URL' });
  }

  const session = scraperService.createSession('facebook');

  res.json({
    sessionId: session.id,
    status: session.status,
    message: 'Session created',
  });

  scraperService.startExtraction(session.id, url, (progress) => {
    broadcastProgress(req.app.get('wss'), progress);
  }).catch((err) => {
    console.error('Extraction error:', err.message);
  });
}

function startGoogleExtraction(req, res) {
  const { country, city, businessType } = req.body;

  if (!country || !businessType) {
    return res.status(400).json({ error: 'Country and business type are required' });
  }

  const session = scraperService.createSession('google_maps');

  res.json({
    sessionId: session.id,
    status: session.status,
    message: 'Google Maps extraction started',
  });

  scraperService.startGoogleMapsExtraction(session.id, { country, city, businessType }, (progress) => {
    broadcastProgress(req.app.get('wss'), progress);
  }).catch((err) => {
    console.error('Google Maps extraction error:', err.message);
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
    type: session.type,
    status: session.status,
    progress: session.progress,
    message: session.message,
    totalBusinesses: session.totalBusinesses,
    totalPhones: session.totalPhones,
    totalEmails: session.totalEmails,
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
      type: s.type || 'facebook',
      status: s.status,
      progress: s.progress,
      totalBusinesses: s.totalBusinesses,
      totalPhones: s.totalPhones,
      totalEmails: s.totalEmails,
      createdAt: s.createdAt,
    });
  });
  res.json({ sessions: sessions.sort((a, b) => b.createdAt - a.createdAt).slice(0, 20) });
}

module.exports = { startExtraction, startGoogleExtraction, getStatus, getExport, getSessions };
