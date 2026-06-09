/**
 * Axial Inspection — Express Backend
 *
 * Sert les fichiers statiques et expose un endpoint
 * de formulaire de contact via /api/contact.
 *
 * Variables d'environnement (.env) :
 *   PORT          — port d'écoute (défaut 3000)
 *   SMTP_HOST     — serveur SMTP (ex. smtp.gmail.com)
 *   SMTP_PORT     — port SMTP (ex. 587)
 *   SMTP_USER     — adresse courriel expéditeur
 *   SMTP_PASS     — mot de passe / app-password
 *   MAIL_TO       — adresse de réception des formulaires
 */

require('dotenv').config();

const path       = require('path');
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const nodemailer = require('nodemailer');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: false }));

// ─── STATIC FILES ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname), {
  index: 'index.html',
  dotfiles: 'deny',
}));

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function escape(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function validate(body) {
  const { firstName, lastName, email, message } = body;
  const errors = [];
  if (!firstName || !firstName.trim()) errors.push('Prénom requis.');
  if (!lastName  || !lastName.trim())  errors.push('Nom requis.');
  if (!email     || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Courriel invalide.');
  if (!message   || message.trim().length < 10) errors.push('Message trop court (10 caractères minimum).');
  return errors;
}

const serviceLabels = {
  cnd:        'Contrôle Non Destructif',
  soudures:   'Inspection de Soudures',
  tuyauteries:'Inspection de Tuyauteries',
  reservoirs: 'Réservoirs Sous Pression',
  structures: 'Inspection Structurale',
  rapports:   'Rapports & Certifications',
  autre:      'Autre / Consultation',
};

// ─── MAIL TRANSPORT ───────────────────────────────────────────────────────────
let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// ─── CONTACT ENDPOINT ─────────────────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  const errors = validate(req.body);
  if (errors.length) {
    return res.status(400).json({ error: errors[0] });
  }

  const { firstName, lastName, email, phone, company, service, message } = req.body;
  const serviceLabel = serviceLabels[service] || service || 'Non spécifié';

  // Build HTML email
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0D1421;color:#E2E8F0;border-radius:8px;overflow:hidden;">
      <div style="background:#C8993C;padding:24px 32px;">
        <h2 style="margin:0;color:#080C14;font-family:Arial,sans-serif;font-size:20px;letter-spacing:0.05em;">
          AXIAL INSPECTION — Nouveau Message
        </h2>
      </div>
      <div style="padding:32px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:8px 0;color:#7A8FA0;width:130px;">Nom</td><td style="padding:8px 0;">${escape(firstName)} ${escape(lastName)}</td></tr>
          <tr><td style="padding:8px 0;color:#7A8FA0;">Courriel</td><td style="padding:8px 0;"><a href="mailto:${escape(email)}" style="color:#C8993C;">${escape(email)}</a></td></tr>
          ${phone    ? `<tr><td style="padding:8px 0;color:#7A8FA0;">Téléphone</td><td style="padding:8px 0;">${escape(phone)}</td></tr>` : ''}
          ${company  ? `<tr><td style="padding:8px 0;color:#7A8FA0;">Entreprise</td><td style="padding:8px 0;">${escape(company)}</td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#7A8FA0;">Service</td><td style="padding:8px 0;">${escape(serviceLabel)}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #1A2B3C;margin:24px 0;">
        <p style="font-size:13px;color:#7A8FA0;margin:0 0 8px;">Message</p>
        <p style="line-height:1.7;margin:0;white-space:pre-wrap;">${escape(message)}</p>
      </div>
      <div style="padding:16px 32px;background:#080C14;font-size:12px;color:#4A5B6C;">
        Message reçu via axialinspection.ca
      </div>
    </div>
  `;

  // Attempt to send email; fall back to console log in dev
  if (transporter) {
    try {
      await transporter.sendMail({
        from:    `"Axial Inspection" <${process.env.SMTP_USER}>`,
        to:      process.env.MAIL_TO || process.env.SMTP_USER,
        replyTo: email,
        subject: `[Axial Inspection] Demande de ${escape(firstName)} ${escape(lastName)} — ${serviceLabel}`,
        html,
      });
    } catch (err) {
      console.error('[SMTP error]', err.message);
      return res.status(500).json({ error: 'Erreur d\'envoi du courriel. Veuillez réessayer.' });
    }
  } else {
    // Development fallback — log to console
    console.log('\n─── NOUVEAU MESSAGE (mode développement) ───');
    console.log(`De : ${firstName} ${lastName} <${email}>`);
    if (phone)   console.log(`Tél : ${phone}`);
    if (company) console.log(`Entreprise : ${company}`);
    console.log(`Service : ${serviceLabel}`);
    console.log(`Message :\n${message}`);
    console.log('─────────────────────────────────────────\n');
  }

  return res.json({ success: true });
});

// ─── CATCH-ALL → SPA ──────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ─── START ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Axial Inspection — serveur démarré sur http://localhost:${PORT}`);
  if (!transporter) {
    console.log('ℹ️  SMTP non configuré — les messages seront affichés dans la console.');
    console.log('   Créez un fichier .env avec SMTP_HOST, SMTP_USER, SMTP_PASS et MAIL_TO.');
  }
});
