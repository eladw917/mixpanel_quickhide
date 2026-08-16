# Mixpanel Activity Navigator

A Chrome extension that helps you navigate Mixpanel activity feeds efficiently - filter events, track properties, and analyze user timelines across different profiles.

## 📋 Quick Links

### 👤 For Users
- **[Full Documentation](docs/user/README.md)** - Complete user guide
- **[Quick Start Guide](docs/user/QUICK_START.md)** - Get started in 2 minutes

### 👨‍💻 For Developers
- **[Development Guide](docs/development/DEVELOPMENT.md)** - Setup and architecture
- **[Future Development](docs/development/FUTURE_DEVELOPMENT.md)** - Complete reference for continuing work
- **[Deployment Guide](docs/development/DEPLOYMENT_GUIDE.md)** - How to release and distribute

### 📖 Feature Documentation
- **[Version 1.1.0 Summary](docs/features/VERSION_1.1.0_SUMMARY.md)** - What's new
- **[Properties Filter Feature](docs/features/PROPERTIES_FILTER_FEATURE.md)** - View user properties
- **[Export/Import Feature](docs/features/EXPORT_IMPORT_FEATURE.md)** - Team sharing
- **[Icon Buttons Update](docs/features/ICON_BUTTONS_UPDATE.md)** - UI improvements

---

## 🚀 Quick Start

1. **Load Extension**
   ```
   chrome://extensions/ → Enable Developer Mode → Load unpacked
   ```

2. **Navigate to Mixpanel**
   - Go to any user's activity feed
   - Click extension icon
   - **Filter Events Tab:** Select events to hide → Click "Apply Selected"
   - **Filter Properties Tab:** Check properties to track → View values instantly

3. **Share with Team**
   - Click 📥 Export (exports events or properties based on active tab)
   - Share `.txt` file
   - Teammates click 📤 Import

---

## ✨ Key Features

### Filter Events Tab
- 📥 **Export/Import** - Share event lists with your team
- 🔍 **Search & Filter** - Find events quickly
- ➕ **Manual Add** - Add events that aren't discovered yet
- 🗑️ **Manage Events** - Delete individual events or clear all
- ⚡ **Real-time Sync** - Checkboxes sync with current URL
- 💾 **Persistent Storage** - Events saved across sessions

### Filter Properties Tab  
- 👤 **View User Properties** - See key attributes from current profile
- ✅ **Selective Display** - Only show properties you care about
- 🔍 **Search Properties** - Find properties quickly
- 📋 **Copy Values** - One-click copy of property values
- 🎨 **Formatted Names** - Readable property names (e.g., `$city` → `City`)
- 🔴 **Missing Data Detection** - Highlights properties not on current profile

---

## 📁 Project Structure

```
mixpanel_hide_events/
├── src/                      # Source code
│   ├── content.js            # Injected into Mixpanel pages
│   ├── popup/                # Extension popup UI
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   └── assets/
│       └── icons/            # Extension icons
├── docs/                     # Documentation
│   ├── user/                 # User-facing docs
│   ├── development/          # Developer docs
│   └── features/             # Feature documentation
├── manifest.json             # Extension configuration
├── LICENSE                   # MIT License
└── .gitignore               # Git ignore rules
```

---

## 🛠️ Development

### Setup
```bash
# Clone/download the repository
cd mixpanel_hide_events

# Load in Chrome
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select this directory
```

### Making Changes
1. Edit files in `src/`
2. Reload extension in Chrome
3. Refresh Mixpanel pages
4. Test changes

See [Development Guide](docs/development/DEVELOPMENT.md) for detailed instructions.

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please read the [Development Guide](docs/development/DEVELOPMENT.md) first.

---

## 📞 Support

For help:
1. Check [User Documentation](docs/user/README.md)
2. Review [Troubleshooting](docs/user/README.md#troubleshooting)
3. Check browser console for errors

---

**Version:** 1.4.0  
**Status:** Production Ready ✅  
**Made with ❤️ to make Mixpanel workflows more efficient**

