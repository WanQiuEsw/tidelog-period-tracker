<p align="center">
  <img src="assets/icons/icon.svg" alt="TideLog logo" width="136" height="136" style="border-radius: 30px;">
</p>

<h1 align="center">TideLog — Cycle Syncing &amp; Local-First Period Compass</h1>

<p align="center">
  A zero-dependency, <strong>100% Local-First</strong> period tracker and hormone cycle-syncing web app with an editorial warm aesthetic (Vanilla HTML5 / CSS3 / JavaScript).
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-C85A42?style=flat-square" alt="Version 1.0.0">
  <img src="https://img.shields.io/badge/HTML5-CSS3-E34F26?style=flat-square&amp;logo=html5&amp;logoColor=white" alt="HTML5 &amp; CSS3">
  <img src="https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?style=flat-square&amp;logo=javascript&amp;logoColor=black" alt="Vanilla JavaScript">
  <img src="https://img.shields.io/badge/Privacy-100%25_Local_First-3D7A68?style=flat-square" alt="100% Local-First Privacy">
  <img src="https://img.shields.io/badge/Design-Cycle_Syncing-7B6B8D?style=flat-square" alt="Cycle Syncing">
</p>

<p align="center">
  <a href="README.md">中文</a> | <strong>English</strong>
</p>

---

## ✨ Overview

Say goodbye to stereotypical neon-pink interfaces, intrusive ads, and cloud privacy anxiety. **TideLog (潮汐历)** reimagines the menstrual and hormonal cycle through an editorial palette of terracotta, sage green, and warm alabaster, translating your 28–35 day rhythm into **Four Body Seasons (Cycle Syncing)**: Inner Winter (Menstrual), Inner Spring (Follicular), Inner Summer (Ovulatory), and Inner Autumn (Luteal).

All data lives **100% inside your browser's `localStorage`** with zero server uploads, featuring a 1-click **Moon-Phase Camouflage Mode**, a clinical **Gynecology Doctor's Card**, a **Partner Care Card Generator**, and a **Future Event Collision Estimator**.

## 🎯 Key Features

- **🧭 Four-Season Energy Compass &amp; Hormone Curves**:
  - Visualizes your current cycle day (`Day X`), estrogen/progesterone dual curves, and dynamic elastic prediction windows.
  - Generates daily **Work/Focus**, **Movement/Nutrition**, and **Self-Compassion** guides tailored to your current hormonal phase.
- **🌙 Moon-Phase Camouflage Mode (Anti-Shoulder-Surfing)**:
  - One click transforms the entire UI into an astronomy &amp; tidal observatory (**StarLog**), replacing sensitive physiological terms with poetic lunar and tidal metaphors for worry-free use in offices or public transit.
- **🌿 3-Second Capsule Logger &amp; Intimate Tag Toggle**:
  - 24 curated capsule tags across 4 categories (*Flow, Body Signals, Mood &amp; Energy, Intimate &amp; Meds*) with one-tap hiding for intimate tags.
- **🩺 Clinical Doctor's Card**:
  - Automatically summarizes your Last Menstrual Period (LMP), cycle length range, average period duration, recent cycle log, and top recurring symptoms into a high-contrast clinical cheat sheet ready to show your gynecologist or copy to the clipboard.
- **💌 Partner Care Card &amp; ✈️ Event Collision Estimator**:
  - **Partner Card**: Translates hormonal states into actionable `✅ Do's` and `❌ Don'ts` in three tones (*Gentle Science, Witty, Minimal*) for easy sharing.
  - **Event Collision Estimator**: Predicts which body season you will be in on a future vacation, exam, or wedding date, complete with a tailored packing checklist.
- **🛡️ 100% Local Privacy Vault &amp; Anomaly Filtering**:
  - Exclude one-off irregular cycles caused by stress or travel so they don't skew your prediction average.
  - Export/import full `.json` backups locally or permanently wipe all local data with a single click.

## 🚀 Quick Start

Zero external dependencies—no `npm install` or build steps required:

1. **Direct Open**: Double-click [`index.html`](index.html) in any modern browser.
2. **Local HTTP Server**:
   ```powershell
   python -m http.server 8080
   ```
   Open [http://127.0.0.1:8080](http://127.0.0.1:8080).

## 🗂️ Directory Structure

```text
tidelog-period-tracker/
├── assets/icons/      # TideLog SVG brand icon
├── index.html         # Main application UI (5 feature tabs & retro logging modal)
├── styles.css         # Global stylesheet (Four-season warm palette & Camo theme)
├── app.js             # Cycle prediction engine, Cycle Syncing data, state & self-checks
├── manifest.json      # Web App Manifest for mobile home-screen installation
├── README.md          # Chinese documentation
└── README.en.md       # English documentation
```
