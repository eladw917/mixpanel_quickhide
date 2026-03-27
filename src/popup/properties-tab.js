// Property Finder tab logic for Mixpanel Activity Navigator
// Location: src/popup/properties-tab.js

// Display property names as checkboxes
async function displayPropertyNames(propertyNames, selectedProperties) {
  const propertiesList = document.getElementById('propertiesList');

  if (propertyNames.length === 0) {
    propertiesList.innerHTML = '<p class="empty-state">No properties stored yet. Visit a Mixpanel profile page to start.</p>';
    updatePropertySelectionCount();
    return;
  }

  // Save current checkbox states before re-rendering
  const currentStates = {};
  document.querySelectorAll('.property-checkbox').forEach(cb => {
    currentStates[cb.value] = cb.checked;
  });

  propertyNames.sort((a, b) => a.localeCompare(b));

  propertiesList.innerHTML = '';

  propertyNames.forEach(propertyName => {
    const label = document.createElement('label');
    label.className = 'event-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = propertyName;
    checkbox.className = 'property-checkbox';

    if (currentStates.hasOwnProperty(propertyName)) {
      checkbox.checked = currentStates[propertyName];
    } else {
      checkbox.checked = selectedProperties.includes(propertyName);
    }

    checkbox.addEventListener('change', async () => {
      await onPropertyCheckboxChange();
    });

    const span = document.createElement('span');
    span.textContent = formatPropertyName(propertyName);
    span.title = propertyName;

    // Button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'property-item-buttons';
    buttonContainer.style.cssText = 'display: flex; gap: 4px; margin-left: auto;';

    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'delete-event-btn';
    const copyIcon = document.createElement('img');
    copyIcon.src = '../assets/icons/content_copy_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg';
    copyIcon.alt = 'Copy';
    copyIcon.style.cssText = 'width: 14px; height: 14px;';
    copyBtn.appendChild(copyIcon);
    copyBtn.title = 'Copy property name';
    copyBtn.style.opacity = '0';
    copyBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await copyPropertyName(propertyName);
    });

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-event-btn';
    deleteBtn.innerHTML = '×';
    deleteBtn.title = 'Delete property';
    deleteBtn.style.opacity = '0';
    deleteBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await deleteProperty(propertyName);
    });

    buttonContainer.appendChild(copyBtn);
    buttonContainer.appendChild(deleteBtn);

    label.appendChild(checkbox);
    label.appendChild(span);
    label.appendChild(buttonContainer);
    propertiesList.appendChild(label);

    // Show buttons on hover
    label.addEventListener('mouseenter', () => {
      copyBtn.style.opacity = '1';
      deleteBtn.style.opacity = '1';
    });
    label.addEventListener('mouseleave', () => {
      copyBtn.style.opacity = '0';
      deleteBtn.style.opacity = '0';
    });
  });

  updatePropertySelectionCount();
}

// Copy property name to clipboard
async function copyPropertyName(propertyName) {
  try {
    const formattedName = formatPropertyName(propertyName);
    await navigator.clipboard.writeText(formattedName);
    showNotification(`"${formattedName}" copied!`, 'success');
  } catch (error) {
    console.error('[Popup] Error copying to clipboard:', error);
    showNotification('Failed to copy', 'error');
  }
}

// Delete a property from storage
async function deleteProperty(propertyName) {
  const formattedName = formatPropertyName(propertyName);
  if (!confirm(`Delete "${formattedName}"?\n\nIt will be removed until discovered again.`)) {
    return;
  }

  const result = await chrome.storage.local.get(['discoveredProperties', 'selectedProperties']);
  const discoveredProperties = result.discoveredProperties || [];
  const selectedProperties = result.selectedProperties || [];

  const updatedDiscovered = discoveredProperties.filter(p => p !== propertyName);
  const updatedSelected = selectedProperties.filter(p => p !== propertyName);

  await chrome.storage.local.set({
    discoveredProperties: updatedDiscovered,
    selectedProperties: updatedSelected
  });

  await loadStoredPropertyNames();
  await loadAndDisplayPropertyValues();
  showNotification(`"${formattedName}" deleted`, 'success');
}

// Handle property checkbox change - auto-save and update display
async function onPropertyCheckboxChange() {
  const selectedProperties = getSelectedProperties();
  await chrome.storage.local.set({ selectedProperties });
  await loadAndDisplayPropertyValues();
}

// Filter property names based on search term
function filterPropertyNames(searchTerm) {
  const propertyItems = document.querySelectorAll('#propertiesList .event-item');
  const searchLower = searchTerm.toLowerCase().trim();

  let visibleCount = 0;

  propertyItems.forEach(item => {
    const checkbox = item.querySelector('.property-checkbox');
    const originalName = checkbox.value.toLowerCase();
    const displayName = item.querySelector('span').textContent.toLowerCase();

    const matches = displayName.includes(searchLower) || originalName.includes(searchLower);

    item.style.display = matches ? 'flex' : 'none';
    if (matches) visibleCount++;
  });

  const searchCount = document.getElementById('propertySearchCount');
  if (searchTerm.trim()) {
    searchCount.textContent = `${visibleCount} of ${propertyItems.length}`;
  } else {
    searchCount.textContent = '';
  }
}

// Load and display current property values
async function loadAndDisplayPropertyValues() {
  const propertyValuesList = document.getElementById('propertyValuesList');

  const result = await chrome.storage.local.get(['selectedProperties']);
  const selectedProperties = result.selectedProperties || [];

  if (selectedProperties.length === 0) {
    propertyValuesList.innerHTML = '<p class="empty-state">Check properties below to see their values here.</p>';
    return;
  }

  const isLoaded = currentTab && await checkContentScript();

  if (!isLoaded) {
    propertyValuesList.innerHTML = '<p class="empty-state">Navigate to a Mixpanel profile page to see property values.</p>';
    return;
  }

  try {
    const response = await chrome.tabs.sendMessage(currentTab.id, {
      action: 'getAllProperties'
    });

    if (response && response.properties) {
      displayPropertyValues(response.properties, selectedProperties);
    } else {
      propertyValuesList.innerHTML = '<p class="empty-state">No properties found on this page.</p>';
    }
  } catch (error) {
    console.error('[Popup] Error loading property values:', error);
    propertyValuesList.innerHTML = '<p class="empty-state">Error loading properties. Try refreshing the page.</p>';
  }
}

// Display property values in the UI
function displayPropertyValues(allProperties, selectedProperties) {
  const propertyValuesList = document.getElementById('propertyValuesList');

  if (selectedProperties.length === 0) {
    propertyValuesList.innerHTML = '<p class="empty-state">Check properties below to see their values here.</p>';
    return;
  }

  propertyValuesList.innerHTML = '';

  const sortedNames = selectedProperties.sort((a, b) => a.localeCompare(b));

  sortedNames.forEach(propName => {
    const exists = allProperties.hasOwnProperty(propName);
    const propValue = exists ? allProperties[propName] : 'Not found on this profile';

    const item = document.createElement('div');
    item.className = 'property-value-item';
    if (!exists) item.classList.add('missing');

    const nameSpan = document.createElement('span');
    nameSpan.className = 'property-value-name';
    const formattedName = formatPropertyName(propName);
    nameSpan.textContent = formattedName;
    nameSpan.title = formattedName;

    const separator = document.createElement('span');
    separator.className = 'property-value-separator';
    separator.textContent = ':';

    const valueSpan = document.createElement('span');
    valueSpan.className = 'property-value-text';
    const displayValue = propValue || '(empty)';
    valueSpan.textContent = displayValue;
    valueSpan.title = displayValue;

    // Action buttons container
    const actionButtons = document.createElement('div');
    actionButtons.className = 'property-action-buttons';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'property-action-btn copy-btn';
    const copyIcon = document.createElement('img');
    copyIcon.src = '../assets/icons/content_copy_24dp_1F1F1F_FILL0_wght400_GRAD0_opsz24.svg';
    copyIcon.alt = 'Copy';
    copyIcon.style.cssText = 'width: 14px; height: 14px;';
    copyBtn.appendChild(copyIcon);
    copyBtn.title = 'Copy value';
    copyBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await copyPropertyValue(propName, propValue);
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'property-action-btn remove-btn';
    removeBtn.innerHTML = '×';
    removeBtn.title = 'Remove from selection';
    removeBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await removePropertyFromSelection(propName);
    });

    actionButtons.appendChild(copyBtn);
    actionButtons.appendChild(removeBtn);

    item.appendChild(nameSpan);
    item.appendChild(separator);
    item.appendChild(valueSpan);
    item.appendChild(actionButtons);
    propertyValuesList.appendChild(item);
  });
}

// Copy property value to clipboard
async function copyPropertyValue(propertyName, propertyValue) {
  try {
    await navigator.clipboard.writeText(propertyValue);
    const formattedName = formatPropertyName(propertyName);
    showNotification(`"${formattedName}" copied!`, 'success');
  } catch (error) {
    console.error('[Popup] Error copying to clipboard:', error);
    showNotification('Failed to copy', 'error');
  }
}

// Remove property from selected properties
async function removePropertyFromSelection(propertyName) {
  const result = await chrome.storage.local.get(['selectedProperties']);
  const selectedProperties = result.selectedProperties || [];

  const updatedSelected = selectedProperties.filter(p => p !== propertyName);
  await chrome.storage.local.set({ selectedProperties: updatedSelected });

  const checkbox = document.querySelector(`.property-checkbox[value="${propertyName}"]`);
  if (checkbox) checkbox.checked = false;

  updatePropertySelectionCount();
  await loadAndDisplayPropertyValues();
  showNotification(`"${propertyName}" removed`, 'success');
}

// Export properties to a .txt file
async function exportProperties() {
  try {
    const result = await chrome.storage.local.get(['selectedProperties']);
    const selectedProperties = result.selectedProperties || [];

    if (selectedProperties.length === 0) {
      showNotification('No properties selected to export', 'error');
      return;
    }

    selectedProperties.sort();
    downloadTextFile(selectedProperties.join('\n'), 'mixpanel_properties.txt');
    showNotification(`${selectedProperties.length} propert${selectedProperties.length !== 1 ? 'ies' : 'y'} exported`, 'success');
  } catch (error) {
    console.error('[Popup] Error exporting properties:', error);
    showNotification('Error exporting properties', 'error');
  }
}

// Import properties from a .txt file
async function importProperties(fileContent) {
  try {
    const lines = fileContent.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) {
      showNotification('No properties found in file', 'error');
      return;
    }

    const uniqueProperties = [...new Set(lines)];

    const result = await chrome.storage.local.get(['discoveredProperties', 'selectedProperties']);
    const discoveredProperties = result.discoveredProperties || [];
    const selectedProperties = result.selectedProperties || [];

    const mergedDiscovered = [...new Set([...discoveredProperties, ...uniqueProperties])];
    const mergedSelected = [...new Set([...selectedProperties, ...uniqueProperties])];

    await chrome.storage.local.set({
      discoveredProperties: mergedDiscovered,
      selectedProperties: mergedSelected
    });

    await loadStoredPropertyNames();
    await loadAndDisplayPropertyValues();

    showNotification(
      `${uniqueProperties.length} propert${uniqueProperties.length !== 1 ? 'ies' : 'y'} imported and selected`,
      'success'
    );
  } catch (error) {
    console.error('[Popup] Error importing properties:', error);
    showNotification('Error importing properties', 'error');
  }
}

// Clear all properties
async function clearProperties() {
  const result = await chrome.storage.local.get(['discoveredProperties', 'selectedProperties']);
  const totalProperties = (result.discoveredProperties || []).length;

  if (totalProperties === 0) {
    showNotification('No properties to clear', 'error');
    return;
  }

  const confirmed = confirm(
    `Are you sure you want to delete ALL ${totalProperties} propert${totalProperties !== 1 ? 'ies' : 'y'}?\n\n` +
    `This will permanently remove all discovered properties from storage.`
  );

  if (confirmed) {
    await chrome.storage.local.set({
      discoveredProperties: [],
      selectedProperties: []
    });

    await loadStoredPropertyNames();
    await loadAndDisplayPropertyValues();
    showNotification('All properties cleared', 'success');
  }
}
