# Coding Standards - Mixpanel Activity Navigator

## Icon Usage Policy

### ✅ DO Use:
- **SVG icons only** for all visual elements
- Store all icons in `src/assets/icons/`
- Use `<img>` tags to reference icons
- Include proper `alt` text for accessibility
- Use Material Design icons or similar professional icon sets

### ❌ DO NOT Use:
- **No emojis in production code** (ever)
- No Unicode characters for icons
- No text-based icons or ASCII art

## Icon Implementation Example

### ✅ Correct:
```html
<button class="icon-btn">
  <img src="../assets/icons/delete_24dp.svg" alt="Delete" class="icon-svg">
</button>
```

### ❌ Incorrect:
```html
<button class="icon-btn">
  <span class="icon">🗑️</span>
</button>
```

## Why No Emojis?

1. **Inconsistent rendering** across different operating systems and browsers
2. **Not professional** - emojis are too casual for enterprise software
3. **Accessibility issues** - screen readers may not handle emojis well
4. **Limited styling** - can't change colors, sizes as easily as SVGs
5. **Poor resolution** - may appear pixelated or blurry at different sizes

## Icon Checklist

Before adding any new visual element, ask:
- [ ] Is this a professional SVG icon?
- [ ] Is it stored in `src/assets/icons/`?
- [ ] Does it have proper alt text?
- [ ] Is it referenced via `<img>` tag?
- [ ] Does it match our existing icon style?

## Current Icon Inventory

### Header Icons (24x24px buttons with 16x16px icons):
- `person_24dp.svg` - Copy Analytics ID
- `link_24dp.svg` - Share User Page
- `file_save_24dp.svg` - Export Events
- `file_open_24dp.svg` - Import Events
- `delete_24dp.svg` - Clear All Events

### Logo:
- `mixpanel.svg` - Brand logo (20x20px in header)

### Extension Icons (for browser):
- `icon16.png` - 16x16px
- `icon32.png` - 32x32px
- `icon48.png` - 48x48px
- `icon128.png` - 128x128px

## Enforcement

This standard is enforced by:
1. **Code comments** in all source files (JS, CSS, HTML)
2. **This documentation** for reference
3. **Code reviews** - check for emoji usage before merging
4. **Developer responsibility** - follow these standards

## Questions?

If you need a new icon:
1. Find a professional SVG icon (Material Design, Feather Icons, etc.)
2. Download the SVG file
3. Place it in `src/assets/icons/`
4. Reference it using `<img>` tag with proper alt text
5. Style it using CSS classes

**Never use emojis as a quick solution!**

