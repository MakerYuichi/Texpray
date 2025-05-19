console.log("Texspray content script loaded");

const hostname = window.location.hostname;
console.log("Hostname:", hostname);

let forceSend = false;

const observeDOM = (selector, callback) => {
  const observer = new MutationObserver(() => {
    const inputBoxes = document.querySelectorAll(selector);
    const inputBox = Array.from(inputBoxes).find(
      (el) => el.offsetParent !== null && el.offsetHeight > 20 && el.contentEditable === "true"
    );
    if (inputBox) {
      observer.disconnect();
      callback(inputBox);
      console.log("Hooked into inputBox:", inputBox);
    } 
  });

  observer.observe(document.body, { childList: true, subtree: true });
};

const selectors = {
  teams: "div[data-tid='ckeditor-replyConversation'] div[contenteditable='true']",
  slack: "div[role='textbox']",
  whatsapp: "footer div[contenteditable='true']"
};

let activeSelector = null;

if (hostname.includes("teams")) {
  activeSelector = selectors.teams;
} else if (hostname.includes("slack")) {
  activeSelector = selectors.slack;
} else if (hostname.includes("whatsapp")) {
  activeSelector = selectors.whatsapp;
}

console.log("Active Selector:", activeSelector);

if (activeSelector) {
  observeDOM(activeSelector, (inputBox) => {
    console.log("Message box detected, adding keypress listener.");
    let cachedMessage = "";

    inputBox.addEventListener("input", () => {
      cachedMessage = inputBox.innerText?.trim() || "";
    });

    inputBox.addEventListener(
      "keydown",
      async (e) => {
        if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
          if (forceSend) {
            forceSend = false;
            console.log("Force send triggered. Skipping moderation.");
            return;
          }

          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          console.log("Extracted message:", cachedMessage);
          if (!cachedMessage) return;

          const { access_token, user_id } = await new Promise((resolve) =>
            chrome.storage.local.get(["access_token", "user_id"], resolve)
          );
          console.log("Fetched from storage:", { access_token, user_id });

          if (!access_token || !user_id) {
            alert("You must be logged in to use Texspray.");
            return;
          }

          chrome.runtime.sendMessage(
            {
              type: "MODERATE_MESSAGE",
              payload: {
                message: cachedMessage,
                token: access_token
              }
            },
            (response) => {
              if (response?.error) {
                console.error("Moderation request failed:", response.error);
                return;
              }

              console.log("Moderation response:", response.data);

              if (
                response.data.status === "toxic" ||
                response.data.toxicity_score >= 70
              ) {
                const reflectionId = response.data.reflection_id;
                console.log("Reflection ID:", reflectionId);
                showWarningUI(inputBox, cachedMessage, reflectionId);
              } else {
                console.log("Message is clean. Proceed to send.");
                sendMessageManually(inputBox, cachedMessage);
              }
            }
          );
        }
      },
      true
    );
  });
} else {
  console.warn("Texspray: No matching selector for this site.");
}

// === Show Reflection UI ===
async function showReflectionUI(originalMessage, reflectionId, inputBox) {
  const existing = document.getElementById("texspray-reflection-ui");
  if (existing) existing.remove();

  if (!reflectionId) {
    console.error("Reflection ID is missing");
    return;
  }

  let rephrasedMessageHTML = "";
  try {
    const { access_token } = await new Promise((resolve) =>
      chrome.storage.local.get(["access_token"], resolve)
    );

    const response = await fetch(`https://texpray.onrender.com/reflect/${reflectionId}/alternatives`, {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const data = await response.json();
    if (data?.alternatives?.length > 0) {
      rephrasedMessageHTML = data.alternatives
        .map(
          (alt) => 
          `<button class="texspray-alt-btn" data-alt="${encodeURIComponent(alt)}"
            style="display:block; margin:6px 0; padding:8px; background:#f0f0f0; border:none; border-radius:5px; cursor:pointer;">
            ${alt}
          </button>`
        )
        .join("");
    } else {
      rephrasedMessageHTML = "No rephrased alternatives found.";
    }
  } catch (error) {
    console.error("Failed to fetch reflection alternatives:", error);
    rephrasedMessageHTML = "Error fetching rephrased alternatives.";
  }

  const overlay = document.createElement("div");
  overlay.id = "texspray-reflection-ui";
  overlay.style = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.75);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  `;

  overlay.innerHTML = `
    <div style="background:white; padding:20px; max-width:500px; border-radius:10px; font-family:sans-serif">
      <h2 style="margin-top:0">Think Before You Send</h2>
      <p><strong>Original:</strong> ${originalMessage}</p>
      <p><strong>Choose a Rephrased Message:</strong></p>
      <div>${rephrasedMessageHTML}</div>
      <button id="cancel-reflection" style="margin-top:10px; background:#ccc; border:none; padding:10px 15px; border-radius:5px; cursor:pointer">
        Cancel
      </button>
    </div>
  `;

  document.body.appendChild(overlay);

  console.log("Rendered rephrased buttons:", document.querySelectorAll(".texspray-alt-btn"));

  document.querySelectorAll(".texspray-alt-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const newMessage = decodeURIComponent(btn.dataset.alt);
      console.log("Clicked alternative message:", newMessage);

      overlay.remove();
      document.removeEventListener("keydown", escHandler);

      // Clear existing content safely
      inputBox.focus();
      inputBox.textContent = newMessage;

// Dispatch proper input event to trigger lexical/react updates
     const inputEvent = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      composed: true,
      inputType: 'insertText',
      data: newMessage
    });
    
    inputBox.dispatchEvent(inputEvent);


      await new Promise(resolve => setTimeout(resolve, 200));

      forceSend = true;

      const sendButton = document.querySelector('[aria-label="Send"], [data-testid="send-button"]');
      if (sendButton) {
        sendButton.click();
        console.log('Sent via send button click');
      } else {
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true,
          cancelable: true,
          composed: true
        });
        inputBox.dispatchEvent(enterEvent);
        console.log('Sent via Enter key simulation');
      }
    });
  });

  const escHandler = (e) => {
    if (e.key === "Escape") {
      overlay.remove();
      restoreWarningUI(originalMessage, reflectionId, inputBox);
    }
  };

  document.addEventListener("keydown", escHandler);

  document.getElementById("cancel-reflection").onclick = () => {
    overlay.remove();
    document.removeEventListener("keydown", escHandler);
    restoreWarningUI(originalMessage, reflectionId, inputBox);
  };
}

// === Show warning UI ===
function showWarningUI(inputBox, message, reflectionId) {
  const existing = document.querySelector(".texpray-warning-box");
  if (existing) existing.remove();

  const warningBox = document.createElement("div");
  warningBox.className = "texpray-warning-box";
  warningBox.style = `
    background: #fff3f3;
    border: 1px solid red;
    padding: 8px;
    border-radius: 6px;
    margin-top: 6px;
    font-size: 14px;
    position: relative;
    z-index: 9999;
  `;

  warningBox.innerHTML = `
    <p style="color: red; font-weight: bold;">❗Oops! This message seems toxic.</p>
    <div class="texpray-actions" style="display: flex; gap: 10px; margin-top: 6px;">
      <button id="rephraseBtn">✏️ Rephrase</button>
      <button id="deleteBtn">❌ Delete</button>
      <button id="sendAnywayBtn">🚨 Send Anyway</button>
    </div>
  `;

  const container = inputBox.closest("footer") || inputBox.parentNode;
  if (container && container.appendChild) {
    container.appendChild(warningBox);
  } else {
    console.warn("Texspray: Unable to find container to inject warning UI.");
  }

  document.getElementById("rephraseBtn").addEventListener("click", () => {
    console.log("User chose to rephrase");
    showReflectionUI(message, reflectionId, inputBox);
    warningBox.remove();
  });

  document.getElementById("deleteBtn").addEventListener("click", () => {
    inputBox.innerText = "";
    warningBox.remove();
  });

  document.getElementById("sendAnywayBtn").addEventListener("click", async () => {
    console.log("User chose to send anyway");

    const { access_token, user_id } = await new Promise((resolve) =>
      chrome.storage.local.get(["access_token", "user_id"], resolve)
    );

    try {
      await fetch("https://texpray.onrender.com/moderate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mssg: message,
          is_override: true
        })
      });
      console.log("Override log sent to backend.");
    } catch (err) {
      console.error("Failed to log override to backend:", err);
    }

    warningBox.remove();
    forceSend = true;
    sendMessageManually(inputBox, message);
  });
}

// === Send message manually ===
function sendMessageManually(inputBox, message = "") {
  inputBox.focus();
  inputBox.focus();

// Clear selection and update content
const selection = window.getSelection();
selection.removeAllRanges();

const range = document.createRange();
range.selectNodeContents(inputBox);
range.collapse(false);
selection.addRange(range);

// Update text content
inputBox.textContent = message;

// Fire beforeinput (Lexical listens to this)
const beforeInputEvent = new InputEvent('beforeinput', {
  bubbles: true,
  cancelable: true,
  composed: true,
  inputType: 'insertText',
  data: message
});
inputBox.dispatchEvent(beforeInputEvent);

// Fire input event (with correct data payload)
const inputEvent = new InputEvent('input', {
  bubbles: true,
  cancelable: true,
  composed: true,
  inputType: 'insertText',
  data: message
});
inputBox.dispatchEvent(inputEvent);
console.log("Inserted rephrased message:", message);


  setTimeout(() => {
    const sendBtn = document.querySelector('span[data-icon="send"], div[aria-label="Send"]');
    if (sendBtn) {
      sendBtn.click();
      console.log("Clicked WhatsApp send button.");
    } else {
      const enterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
      });
      inputBox.dispatchEvent(enterEvent);
      console.log("Fallback: triggered Enter key event.");
    }
  }, 250);
}

function restoreWarningUI(message, reflectionId, inputBox) {
  console.log("Restoring warning UI after cancel");
  showWarningUI(inputBox, message, reflectionId);
}
