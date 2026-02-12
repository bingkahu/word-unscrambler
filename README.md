# 🔠 Lexicon Pro: Word Unscrambler

Lexicon Pro is a high-performance word engine built to unscramble letters, find dictionary matches using wildcards, and verify anagrams. It is optimized for the edge and deployed via **Cloudflare Pages**.

![License](https://img.shields.io/badge/license-All%20Rights%20Reserved-red)
![Deployment](https://img.shields.io/badge/deployed%20on-Cloudflare%20Pages-orange)

## ✨ Features

- **High-Speed Unscrambler:** Generates all valid word combinations in milliseconds.
- **Wildcard Logic:** Use `?` for blank tiles (powered by character frequency mapping).
- **Anagram Validator:** Real-time comparison of two phrases for exact matches.
- **SPA Architecture:** Seamless navigation between tools without page reloads.
- **Dictionary Integration:** Uses a 370k+ English word list with API-based definitions.
- **Dark Mode:** Built-in theme support for modern browsers.

## 🚀 Live Demo

The application is hosted on the Cloudflare Edge network:
👉 [https://word-unscrambler.pages.dev](https://word-unscrambler.pages.dev)

## 🛠️ Technical Stack

- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3
- **Hosting:** Cloudflare Pages (CI/CD via GitHub)
- **Data:** Dictionary source from `dwyl/english-words`
- **Performance:** Character frequency mapping for wildcard searches.

## 📂 Project Structure

```text
├── index.html          # Application Shell
├── style.css           # Custom UI & Theme Variables
├── app.js              # Permutation Logic & State Management
├── _headers            # Cloudflare Security & Caching rules
├── _redirects          # SPA routing configuration
└── LICENSE             # Proprietary License (All Rights Reserved)
