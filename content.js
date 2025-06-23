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

  return JSON.stringify(data);
}

// Patch: Record the time when copying data
function recordCopyTime() {
  const now = new Date();
  console.log('Data copied at:', now.toISOString());
}

// Remove createToggleSwitch and toggle logic, and create a floating Copy All button only
function createCopyAllButton() {
  let container = document.getElementById('copyall-container');
  if (container) return;
  container = document.createElement('div');
  container.id = 'copyall-container';
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

  // Add Copy All button to the menu
  const copyAllBtn = document.createElement('button');
  copyAllBtn.textContent = 'Copy All';
  copyAllBtn.style.padding = '6px 12px';
  copyAllBtn.style.background = '#4CAF50';
  copyAllBtn.style.color = 'white';
  copyAllBtn.style.border = 'none';
  copyAllBtn.style.borderRadius = '4px';
  copyAllBtn.style.cursor = 'pointer';
  copyAllBtn.addEventListener('click', () => {
    // Always use ancestor depth 13
    const ancestorDepth = 13;
    const xpath = `//*[contains(text(), 'Send')]/ancestor::*[${ancestorDepth}]`;
    const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    const allData = [];
    for (let i = 0; i < result.snapshotLength; i++) {
      const element = result.snapshotItem(i);
      if (element) {
        allData.push(extractMemberInfo(element));
      }
    }
    navigator.clipboard.writeText(allData.join('%$%'));
  });
  container.appendChild(copyAllBtn);

  document.body.appendChild(container);
}

// Update addCopyButtons to always use ancestor depth 13 and remove toggle logic
function addCopyButtons() {
  if (!isMemberRequestsPage()) return;

  const ancestorDepth = 12;
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
    copyButton.classList.remove('copy-button-top'); // Remove top align class, always center
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

// Update initializeExtension to only create the Copy All button
function initializeExtension() {
  if (!isMemberRequestsPage()) return;
  createCopyAllButton();
  checkAndAddButtons();
  const observer = new MutationObserver(() => checkAndAddButtons());
  observer.observe(document.body, { childList: true, subtree: true, attributes: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}