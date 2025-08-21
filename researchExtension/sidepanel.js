document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['researchNotes'], function(result){
        if (result.researchNotes) {
            document.getElementById('notes').value = result.researchNotes;
        }
    });

    document.getElementById('summarizeBtn') .addEventListener('click',summarizeText)
    document.getElementById('saveNotesBtn') .addEventListener('click',saveNotes)
});

async function summarizeText()  {
    try {
        const [tab] = await chrome.tabs.query({ active:true, currentWindow:true})
        const [{result}] = await chrome.scripting.executeScript({
            target: {tabId: tab.id},
            function: ()=> window.getSelection().toString()
        });

        if (!result) {
            showResult('Please select some text first');
            return;
        }

        const response = await fetch ('http://localhost:8080/api/research/process', {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json'},
            body: JSON.stringify({content: result, operation: 'summarize'})
        });

        if(!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const text = await response.text();
        showResult(text.replace(/\n/g,'<br>'));

    } catch (error) {
        showResult('Error:' + error.message);
    }
}

async function saveNotes() {
    const notes = document.getElementById('notes').value;
    chrome.storage.local.set({'researchNotes': notes}, function() {
        alert('Notes saved successfully');
    })
}

function showResult(content) {
    document.getElementById('results').innerHTML = `<div class="result-item"><div class="result-content">${content}</div></div>`;
}

let tabsData = {};

document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.local.get(['researchTabs'], function(result) {
        tabsData = result.researchTabs || {};
        renderTabs();
    });

    document.getElementById('summarizeBtn').addEventListener('click', summarizeText);
    document.getElementById('saveNotesBtn').addEventListener('click', saveAllNotes);
});

async function summarizeText() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const [{ result }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => window.getSelection().toString()
        });

        if (!result) {
            showResult('Please select some text first');
            return;
        }

        const response = await fetch('http://localhost:8080/api/research/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: result, operation: 'summarize' })
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);
        const summary = await response.text();
        showResult(summary.replace(/\n/g, '<br>'));

        // Add new tab
        const url = new URL(tab.url).origin;
        if (!tabsData[url]) {
            tabsData[url] = '';
        }
        renderTabs(url);

    } catch (error) {
        showResult('Error: ' + error.message);
    }
}

function renderTabs(activeKey = null) {
    const container = document.getElementById('tabs-container');
    container.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'tab-header';

    Object.keys(tabsData).forEach((key, index) => {
        const tab = document.createElement('div');
        tab.className = 'tab';
        if (!activeKey && index === 0 || key === activeKey) tab.classList.add('active');
        tab.textContent = key;

        const close = document.createElement('span');
        close.className = 'close-btn';
        close.textContent = '×';
        close.addEventListener('click', (e) => {
            e.stopPropagation();
            delete tabsData[key];
            renderTabs();
        });

        tab.appendChild(close);
        tab.addEventListener('click', () => renderTabs(key));
        header.appendChild(tab);
    });

    container.appendChild(header);

    // Tab contents
    Object.keys(tabsData).forEach((key, index) => {
        const content = document.createElement('div');
        content.className = 'tab-content';
        if (!activeKey && index === 0 || key === activeKey) content.classList.add('active');

        const textarea = document.createElement('textarea');
        textarea.value = tabsData[key];
        textarea.addEventListener('input', (e) => {
            tabsData[key] = e.target.value;
        });

        content.appendChild(textarea);
        container.appendChild(content);
    });
}

function saveAllNotes() {
    chrome.storage.local.set({ researchTabs: tabsData }, function () {
        alert('All notes saved successfully!');
    });
}

function showResult(content) {
    document.getElementById('results').innerHTML =
        `<div class="result-item"><div class="result-content">${content}</div></div>`;
}
