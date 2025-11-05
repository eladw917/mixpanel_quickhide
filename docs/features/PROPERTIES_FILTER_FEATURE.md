# Filter Properties Feature

**Added in:** Version 1.2.0  
**Status:** ✅ Complete  
**Feature Type:** New Tab

---

## Overview

The **Filter Properties** tab allows you to view and manage user properties from Mixpanel profiles within the extension popup. Only the properties you select are displayed, making it easy to focus on relevant user attributes.

---

## Features

### 1. **Automatic Property Discovery**
- Automatically extracts property names from Mixpanel user profiles
- Parses property data from `profile-editable-property` DOM elements
- Stores discovered properties in a persistent database
- Properties accumulate as you visit different user profiles

### 2. **Property Name Formatting**
- Displays properties in a readable format
- `$city` → `City`
- `$android_app_version` → `Android App Version`
- Hover over formatted names to see original property names

### 3. **Selective Property Viewing**
- Check properties you want to track
- Only selected properties appear in "Current Property Values"
- Changes sync automatically (no Apply button needed)
- Missing properties highlighted in dark red

### 4. **Current Property Values Display**
- Shows property name and value from current profile
- Properties missing on current profile show "Not found on this profile"
- Copy button (📋) to copy property values
- Remove button (×) to unselect properties

### 5. **Property Database Management**
- Search/filter through all discovered properties
- Copy button (📋) to copy property names
- Delete button (×) to remove properties from database
- Properties displayed in formatted, readable form

### 6. **Export/Import System**
- Export selected properties to `.txt` file
- Import properties from file (merges with existing)
- Share property lists with teammates
- Automatically adds imported properties to selection

### 7. **Tab-Aware Operations**
- Top buttons (Export/Import/Clear) adapt based on active tab
- Export in Properties tab: saves selected properties
- Import in Properties tab: adds to database and selects all
- Clear in Properties tab: removes all properties

---

## User Interface

### Tab Layout

#### **Section 1: Current Property Values** (Top)
```
┌─ Current Property Values ─────────────┐
│ City            : Newport News    📋 × │
│ Age             : 63              📋 × │
│ Missing Prop    : Not found...   📋 × │  ← Red text
└─────────────────────────────────────────┘
```
- Property names formatted for readability
- Values stay on one line (ellipsis if too long)
- Hover to show copy/remove buttons
- Missing properties in dark red

#### **Section 2: Stored Properties** (Bottom)
```
┌─ Stored Properties ────────────────────┐
│ 🔍 Search properties...                │
│                                         │
│ ☑ Age                             📋 × │
│ ☑ City                            📋 × │
│ ☑ Android App Version             📋 × │
│ ☐ Email                           📋 × │
└─────────────────────────────────────────┘
```
- Searchable checkbox list
- Auto-saves when checking/unchecking
- Copy button copies formatted name
- Delete button removes from database

---

## Technical Implementation

### Data Flow

```
1. User visits Mixpanel profile page
   ↓
2. Content script parses profile-editable-property elements
   ↓
3. Extracts property names and values from JSON attributes
   ↓
4. Saves property names to discoveredProperties storage
   ↓
5. User opens extension → sees properties in list
   ↓
6. User checks properties → auto-saves to selectedProperties
   ↓
7. Current values fetched and displayed for selected properties
```

### Storage Schema

```javascript
{
  discoveredProperties: [
    "$city",
    "$android_app_version",
    "age",
    "email"
  ],
  selectedProperties: [
    "$city",
    "age"
  ]
}
```

### DOM Parsing

**Target Element:**
```html
<profile-editable-property 
  property='{"name":{"formatted":"age","raw":"age"},
             "renderValue":{"raw":"61","type":"string",
             "isEmpty":false,"renderString":"61"}}'>
</profile-editable-property>
```

**Extraction:**
- Property name: `property.name.raw` → `"age"`
- Property value: `property.renderValue.renderString` → `"61"`

### Property Formatting

```javascript
function formatPropertyName(propertyName) {
  // Remove leading $
  let formatted = propertyName.startsWith('$') ? 
                  propertyName.substring(1) : propertyName;
  
  // Replace underscores with spaces
  formatted = formatted.replace(/_/g, ' ');
  
  // Capitalize each word
  formatted = formatted.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return formatted;
}
```

**Examples:**
- `$city` → `City`
- `$android_app_version` → `Android App Version`
- `user_name` → `User Name`

---

## Export/Import Format

### Export Format
```
$city
$android_app_version
age
email
```
- One property per line
- Original format (with `$` prefix if applicable)
- Sorted alphabetically
- Only selected properties exported

### Import Behavior
1. Reads property names from file
2. Adds to `discoveredProperties` (merges, no duplicates)
3. Adds to `selectedProperties` (auto-selects all imported)
4. Updates both UI sections
5. Shows notification: "X properties imported and selected"

---

## Key Interactions

### Automatic Property Selection
- **No "Apply" button needed** - changes save instantly
- Checking a property immediately:
  - Saves to `selectedProperties` storage
  - Fetches current value from page
  - Displays in "Current Property Values"

### Copy Actions
1. **Copy Property Value** (Current Values section)
   - Copies the actual value (e.g., "Newport News")
   - Shows notification: "City copied!"

2. **Copy Property Name** (Stored Properties section)
   - Copies formatted name (e.g., "City")
   - Shows notification: "City copied!"

### Remove Actions
1. **Remove from Selection** (Current Values section)
   - Unchecks property in stored properties
   - Removes from current values display
   - Updates selection count

2. **Delete from Database** (Stored Properties section)
   - Removes from `discoveredProperties`
   - Removes from `selectedProperties`
   - Confirms before deletion

---

## Use Cases

### 1. Focus on Key User Attributes
**Scenario:** You only care about age, city, and app version  
**Solution:**
1. Check those 3 properties in the list
2. They appear at the top instantly
3. Visit any user profile → see only those 3 values

### 2. Share Property Lists with Team
**Scenario:** Team needs to track same properties  
**Solution:**
1. Select properties you care about
2. Click Export → get `mixpanel_properties.txt`
3. Share file with team
4. They click Import → same properties auto-selected

### 3. Identify Missing User Data
**Scenario:** Check which users have email addresses  
**Solution:**
1. Add "email" to selected properties
2. Visit user profiles
3. Properties missing from profile show in red: "Not found on this profile"

### 4. Clean Property Database
**Scenario:** Too many irrelevant properties accumulated  
**Solution:**
1. Search for unwanted properties
2. Hover and click × to delete
3. Or use Clear button to remove all

---

## Benefits

✅ **Efficiency** - Focus on relevant properties only  
✅ **Consistency** - Same properties across team  
✅ **Visibility** - Easily spot missing data  
✅ **Flexibility** - Add/remove properties anytime  
✅ **Portability** - Export/import for sharing  
✅ **Automatic** - No manual configuration needed  
✅ **Non-Intrusive** - Doesn't modify Mixpanel UI  

---

## Comparison: Events vs Properties

| Feature | Filter Events | Filter Properties |
|---------|--------------|-------------------|
| **Purpose** | Hide irrelevant events | View key user attributes |
| **Location** | Activity feed page | Activity feed page |
| **Action** | Modifies URL, hides events | Displays values in popup |
| **Apply Button** | Yes (modifies page) | No (instant display) |
| **Export** | All events | Selected properties only |
| **Import** | Replace or merge | Always merge + select |
| **Discovery** | From URL exclusions | From DOM elements |

---

## Future Enhancements

Potential improvements:
- Property value history tracking
- Property grouping/categories
- Custom property name aliases
- Property value search/filter
- Export with values (CSV format)
- Property comparison across users

---

## Related Documentation

- [Tab System](TAB_SYSTEM.md) - How tabs work
- [Export/Import Feature](EXPORT_IMPORT_FEATURE.md) - Export/import for events
- [User Guide](../user/README.md) - Complete user documentation
- [Development Guide](../development/DEVELOPMENT.md) - Technical details

---

**Version:** 1.2.0  
**Last Updated:** November 2025  
**Status:** Production Ready ✅

