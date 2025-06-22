function isMemberRequestsPage() {
  return window.location.href.match(/facebook\.com\/groups\/\d+\/member-requests/);
}

function createCopyButton() {
  const button = document.createElement('button');
  button.className = 'copy-button';
  button.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
    </svg>
  `;
  button.title = "Copy member info";
  return button;
}

function extractMemberInfo(element) {
  // Name and profile link
  const nameLink = element.querySelector('a[aria-label]:not([aria-label*="Send"])');
  const name = nameLink ? nameLink.getAttribute('aria-label') : '';
  let profile = '';
  if (nameLink) {
    let href = nameLink.getAttribute('href');
    // Remove query params
    if (href) {
      href = href.split('?')[0];
      profile = href.startsWith('http') ? href : `https://www.facebook.com${href}`;
    }
  }

  // Requested time (just the time part, e.g., "14 minutes", "2 hours")
  let requested = '';
  // Try abbr first
  const requestedAbbr = Array.from(element.querySelectorAll('span abbr[aria-label]')).find(
    abbr => abbr.parentElement && abbr.parentElement.textContent.includes('Requested')
  );
  if (requestedAbbr) {
    requested = requestedAbbr.getAttribute('aria-label').replace(/\s*ago\s*$/i, '').trim();
  } else {
    // Fallback: look for span containing 'Requested' and extract time
    const requestedSpan = Array.from(element.querySelectorAll('span')).find(
      s => s.textContent && s.textContent.trim().startsWith('Requested')
    );
    if (requestedSpan) {
      // Extract the time part after 'Requested'
      const match = requestedSpan.textContent.match(/Requested\s*(.*)/i);
      if (match && match[1]) {
        requested = match[1].replace(/\s*ago\s*$/i, '').trim();
      }
    }
  }

  // All Q/A pairs
  const qa_pairs = [];
  const liElements = element.querySelectorAll('li.x1y1aw1k');
  liElements.forEach(li => {
    const questionSpan = li.querySelector('.x12scifz');
    const answerSpan = li.querySelector('.xzsf02u');
    if (questionSpan) {
      qa_pairs.push([
        questionSpan.textContent.trim(),
        answerSpan ? answerSpan.textContent.trim() : "N/A"
      ]);
    }
  });

  // Add the copy time
  const copied_at = new Date().toISOString();

  // Build the JSON object
  const data = {
    name,
    profile,
    requested,
    qa_pairs,
    copied_at
  };

  return JSON.stringify(data, null, 2);
}

// Patch: Record the time when copying data
function recordCopyTime() {
  const now = new Date();
  console.log('Data copied at:', now.toISOString());
}

// Add a floating toggle switch to control the XPath depth
function createToggleSwitch() {
  let container = document.getElementById('xpath-toggle-container');
  if (container) return; // Already exists
  container = document.createElement('div');
  container.id = 'xpath-toggle-container';
  container.style.position = 'fixed';
  container.style.top = '20px';
  container.style.right = '20px';
  container.style.zIndex = '9999';
  container.style.background = 'white';
  container.style.border = '1px solid #ccc';
  container.style.borderRadius = '8px';
  container.style.padding = '8px 16px';
  container.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  
  const label = document.createElement('label');
  label.style.display = 'flex';
  label.style.alignItems = 'center';
  label.style.cursor = 'pointer';
  label.style.gap = '8px';
  label.innerText = 'XPath +1';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.id = 'xpath-toggle';
  input.checked = localStorage.getItem('xpathPlusOne') === 'true';
  input.style.marginRight = '4px';
  input.addEventListener('change', () => {
    localStorage.setItem('xpathPlusOne', input.checked ? 'true' : 'false');
    addCopyButtons(); // Refresh buttons with new XPath
  });

  label.prepend(input);
  container.appendChild(label);
  document.body.appendChild(container);
}

// Update addCopyButtons to call recordCopyTime when copying
function addCopyButtons() {
  if (!isMemberRequestsPage()) return;

  // Use the toggle state to determine the XPath
  const plusOne = localStorage.getItem('xpathPlusOne') === 'true';
  const ancestorDepth = plusOne ? 14 : 13;
  const xpath = `//*[contains(text(), 'Send')]/ancestor::*[${ancestorDepth}]`;
  const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

  for (let i = 0; i < result.snapshotLength; i++) {
    const element = result.snapshotItem(i);
    if (!element) continue;
    const elementId = `copy-button-container-${i}`;
    if (element.querySelector(`.copy-button[data-element-id=\"${elementId}\"]`)) continue;
    if (getComputedStyle(element).position === 'static') element.style.position = 'relative';
    const copyButton = createCopyButton();
    copyButton.dataset.elementId = elementId;
    copyButton.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const content = extractMemberInfo(element);
      navigator.clipboard.writeText(content).then(() => {
        recordCopyTime();
        copyButton.classList.add('copy-success');
        setTimeout(() => copyButton.classList.remove('copy-success'), 1000);
      }).catch(err => {
        copyButton.style.backgroundColor = '#f44336';
        setTimeout(() => { copyButton.style.backgroundColor = ''; }, 1000);
      });
    });
    element.appendChild(copyButton);
  }
}

function checkAndAddButtons() {
  addCopyButtons();
  setTimeout(addCopyButtons, 1000);
  setTimeout(addCopyButtons, 2000);
  setTimeout(addCopyButtons, 5000);
}

function initializeExtension() {
  if (!isMemberRequestsPage()) return;
  createToggleSwitch();
  checkAndAddButtons();
  const observer = new MutationObserver(() => checkAndAddButtons());
  observer.observe(document.body, { childList: true, subtree: true, attributes: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}