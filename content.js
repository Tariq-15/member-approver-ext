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

function createFetchButton() {
  const button = document.createElement('button');
  button.className = 'fetch-button';
  button.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM19 18H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6c3.04 0 5.5 2.46 5.5 5.5v.5H19c1.65 0 3 1.35 3 3s-1.35 3-3 3zm-5.55-8h-2.9v3H8l4 4 4-4h-2.55z"/></svg>
  `;
  button.title = "Fetch transaction info";
  return button;
}

function createAddButton() {
  const button = document.createElement('button');
  button.className = 'add-button';
  button.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M13 11h8v2h-8v8h-2v-8H3v-2h8V3h2v8z"/></svg>
  `;
  button.title = "Add member info to Google Sheet";
  return button;
}

function createAddToSheetButton() {
  const button = document.createElement('button');
  button.className = 'add-to-sheet-button';
  button.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFFFFF"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M13 11h8v2h-8v8h-2v-8H3v-2h8V3h2v8z"/></svg>
    <span style="margin-left:4px;">Add to Sheet</span>
  `;
  button.title = "Add member info to Google Sheet (columns)";
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

function findTransactionId(element) {
  let transactionId = null;
  const liElements = element.querySelectorAll('li.x1y1aw1k');
  liElements.forEach(li => {
    const questionSpan = li.querySelector('.x12scifz');
    const answerSpan = li.querySelector('.xzsf02u');
    if (questionSpan && questionSpan.textContent.trim().includes('তোমার ইউনিক ট্রানজেকশন আইডি')) {
      if (answerSpan) {
        transactionId = answerSpan.textContent.trim();
      }
    }
  });
  return transactionId;
}

function findMobileNumber(element) {
  let mobileNumber = null;
  const liElements = element.querySelectorAll('li.x1y1aw1k');
  liElements.forEach(li => {
    const questionSpan = li.querySelector('.x12scifz');
    const answerSpan = li.querySelector('.xzsf02u');
    if (questionSpan && questionSpan.textContent.trim().includes('তোমার রেজিস্টারকৃত মোবাইল নাম্বার')) {
      if (answerSpan) {
        mobileNumber = answerSpan.textContent.trim();
      }
    }
  });
  return mobileNumber;
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
    const ancestorDepth = 12;
    const xpath = `//*[contains(text(), 'Approve') and not(contains(text(), 'Approve all'))]/ancestor::*[${ancestorDepth}]`;
    const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    const allData = [];
    for (let i = 0; i < result.snapshotLength; i++) {
      const element = result.snapshotItem(i);
      if (element) {
        allData.push(extractMemberInfo(element));
      }
    }
    navigator.clipboard.writeText(allData.join('\n'));
  });
  container.appendChild(copyAllBtn);

  document.body.appendChild(container);
}

function getClassLetterFromGroupName() {
  const groupName = getGroupNameFromTitle();
  if (!groupName) return '';
  // Extract only the first digit after 'Class'
  const match = groupName.match(/Class\s*(\d+)/);
  console.log('Group name:', groupName, 'Match:', match);
  if (match && match[1]) {
    return match[1];
  }
  return '';
}

// Update addCopyButtons to always use ancestor depth 13 and remove toggle logic
function addCopyButtons() {
  if (!isMemberRequestsPage()) return;

  const groupName = getGroupNameFromTitle();
  const classLetter = getClassLetterFromGroupName();
  const ancestorDepth = 11;
  const xpath = `//*[contains(text(), 'Approve') and not(contains(text(), 'Approve all'))]/ancestor::*[${ancestorDepth}]`;
  const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);

  for (let i = 0; i < result.snapshotLength; i++) {
    const element = result.snapshotItem(i);
    if (!element) continue;
    const elementId = `copy-button-container-${i}`;
    if (element.querySelector(`.copy-button[data-element-id=\"${elementId}\"]`)) continue;
    if (getComputedStyle(element).position === 'static') element.style.position = 'relative';

    // Skip if button group already added to this element
    if (element.dataset.hasButtonGroup === 'true') continue;

    // Remove any existing button group and all add-to-sheet buttons to ensure only one group and one button
    const allButtonGroups = element.querySelectorAll('.button-group');
    allButtonGroups.forEach(bg => bg.remove());
    const allAddToSheetButtons = element.querySelectorAll('.add-to-sheet-button');
    allAddToSheetButtons.forEach(btn => btn.remove());

    // Create a new button group container
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'button-group';
    buttonGroup.style.position = 'absolute';
    buttonGroup.style.top = '50%';
    buttonGroup.style.right = '24px';
    buttonGroup.style.transform = 'translateY(-50%)';
    buttonGroup.style.display = 'flex';
    buttonGroup.style.flexDirection = 'column';
    buttonGroup.style.alignItems = 'center';
    buttonGroup.style.gap = '12px';
    buttonGroup.style.zIndex = '10000';

    // Create and add the copy button
    const copyButton = createCopyButton();
    copyButton.dataset.elementId = elementId;
    copyButton.classList.remove('copy-button-top');
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
    buttonGroup.appendChild(copyButton);

    // Check for transaction ID or mobile number and add fetch button
    const transactionId = findTransactionId(element);
    let searchValue = transactionId;
    let searchType = 'transaction_id';
    if (!transactionId) {
      const mobileNumber = findMobileNumber(element);
      if (mobileNumber) {
        searchValue = mobileNumber;
        searchType = 'mobile';
      }
    }
    
    if (searchValue) {
      // Create and add the fetch button if needed
      const fetchButton = createFetchButton();
      fetchButton.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        let transactionInfoDiv = element.querySelector('.transaction-info');
        if (transactionInfoDiv) {
          transactionInfoDiv.remove();
          return;
        }
        transactionInfoDiv = document.createElement('div');
        transactionInfoDiv.className = 'transaction-info';
        transactionInfoDiv.textContent = 'Loading transaction data...';
        element.appendChild(transactionInfoDiv);
        let url = `https://admin-backend.acsfutureschool.com/api/search?q=${searchValue}`;
        fetch(url)
          .then(response => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
          })
          .then(data => {
            const result = data.data && Array.isArray(data.data) && data.data.length > 0 ? data.data[0] : (Array.isArray(data) && data.length > 0 ? data[0] : data);
            if (result && typeof result === 'object' && result !== null) {
              const transaction = result.transactions && Array.isArray(result.transactions) && result.transactions.length > 0 ? result.transactions[0] : {};
              let hasAcademicProgram = "false";
              if (transaction.enrollments && Array.isArray(transaction.enrollments)) {
                if (transaction.enrollments.some(e => e.course_name === 'একাডেমিক প্রোগ্রাম ২০২৫')) {
                  hasAcademicProgram = "true";
                }
              }
              const filteredData = {
                amount_student_paid: transaction.amount_student_paid,
                academic_program: hasAcademicProgram,
                userClass: result.userClass
              };
              if (filteredData.academic_program !== undefined || filteredData.userClass !== undefined || filteredData.amount_student_paid !== undefined) {
                transactionInfoDiv.innerHTML = `<pre>${JSON.stringify(filteredData, null, 2)}</pre>`;
              } else {
                transactionInfoDiv.textContent = 'Relevant transaction details not found.';
              }
            } else {
              transactionInfoDiv.textContent = 'Transaction data not found.';
            }
          })
          .catch(error => {
            console.error('Error fetching transaction data:', error);
            transactionInfoDiv.textContent = `Error: ${error.message}`;
          });
      });
      buttonGroup.appendChild(fetchButton);
    }

    // Add the Add button
    if (!element.querySelector('.add-button')) {
      const addButton = createAddButton();
      addButton.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        addButton.disabled = true;
        addButton.style.backgroundColor = '#aaa';
        addButton.title = 'Saving...';
        const memberInfo = extractMemberInfo(element);
        // TODO: Replace this URL with your actual Google Apps Script endpoint
        const googleScriptUrl = 'https://script.google.com/macros/s/AKfycbzgsbMLc_Ww1mN9pICJcaCTsj0Tu9wnIHpaNqSBPRh_rZfLp-coZ5Ia-PLPJwDbbyus/exec';
        fetch(googleScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(memberInfo)
        })
        .then(response => response.json())
        .then(data => {
          addButton.style.backgroundColor = '#4CAF50';
          addButton.title = 'Saved!';
          setTimeout(() => {
            addButton.style.backgroundColor = '';
            addButton.title = 'Add member info to Google Sheet';
            addButton.disabled = false;
          }, 1500);
        })
        .catch(error => {
          addButton.style.backgroundColor = '#f44336';
          addButton.title = 'Error!';
          setTimeout(() => {
            addButton.style.backgroundColor = '';
            addButton.title = 'Add member info to Google Sheet';
            addButton.disabled = false;
          }, 1500);
        });
      });
      buttonGroup.appendChild(addButton);
    }

    // Add the button group to the element
    element.appendChild(buttonGroup);
    // Mark this element as having a button group
    element.dataset.hasButtonGroup = 'true';
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

// Utility to extract group name from the page title anchor
function getGroupNameFromTitle() {
  const groupAnchor = document.querySelector('a.x1i10hfl.xjbqb8w.x1ejq31n.x18oe1m7.x1sy0etr.xstzfhl.x972fbf.x10w94by.x1qhh985.x14e42zd.x9f619.x1ypdohk.xt0psk2.xe8uvvx.xdj266r.x14z9mp.xat24cr.x1lziwak.xexx8yu.xyri2b.x18d9i69.x1c1uobl.x16tdsg8.x1hl2dhg.xggy1nq.x1a2a7pz.x1heor9g.xkrqix3.x1sur9pj.x1pd3egz');
  if (groupAnchor) {
    const groupName = groupAnchor.textContent.trim();
    console.log('Group name:', groupName);
    return groupName;
  }
  return null;
}