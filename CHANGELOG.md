# Changelog

All notable changes to the Mixpanel Activity Navigator extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.2] - 2025-11-25

### Added
- Notification badge on extension icon when active on activity feed pages
- Visual indicator showing extension is ready to use (green checkmark badge)

### Technical
- Added chrome.action badge API integration
- Enhanced user experience with clear visual feedback

## [1.3.1] - 2025-11-13

### Changed
- Reverted experimental profile sidebar detection feature
- Improved code stability and maintainability

### Technical
- Cleaned up redundant documentation files
- Standardized build and release process
- Updated .gitignore for better distribution management

## [1.3.0] - 2024

### Added
- Quick Timeline tab for visualizing event sequences
- Load more events functionality for timeline
- Timeline event filtering and search
- Event count display in timeline

### Changed
- Improved tab navigation system
- Enhanced UI/UX with better tab organization
- Updated documentation structure

## [1.2.0] - 2024

### Added
- Property Finder tab (Filter Properties)
- View user properties from current profile
- Search and filter properties
- Copy property values to clipboard
- Formatted property names (e.g., `$city` → `City`)
- Missing data detection for properties
- Export/Import functionality for properties

### Changed
- Reorganized UI into tabbed interface
- Improved event management system
- Enhanced search functionality across all tabs

## [1.1.0] - 2024

### Added
- Export/Import functionality for sharing event lists
- Copy Analytics ID button
- Share User Page button
- Icon-based action buttons in header
- Improved UI with better visual hierarchy

### Changed
- Updated UI with new icon system
- Migrated from emoji to SVG icons
- Improved button styling and hover states

## [1.0.0] - 2024

### Added
- Initial release
- Feed Cleaner (Filter Events) functionality
- Hide/show events on Mixpanel activity feeds
- Real-time checkbox sync with URL
- Persistent storage across sessions
- Manual event addition
- Search and filter events
- Check all / Uncheck all functionality
- Clear all events functionality

### Features
- Content script injection on Mixpanel profile pages
- Chrome storage for event persistence
- Event auto-discovery from activity feed
- Manual event management

