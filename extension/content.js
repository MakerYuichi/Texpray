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
            return; // Allow native send
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
                showWarningUI(inputBox, cachedMessage, response.data.reflection_id);
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

// === Send message manually ===
function sendMessageManually(inputBox, message = "") {
  inputBox.focus();

  // Clear old content
  inputBox.innerText = "";
  inputBox.textContent = "";

  // Set new content
  inputBox.innerText = message;

  // Trigger input event
  inputBox.dispatchEvent(
    new InputEvent("input", {
      bubbles: true,
      cancelable: true,
      inputType: "insertText",
      data: message
    })
  );

  setTimeout(() => {
    const keyDown = new KeyboardEvent("keydown", {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    });

    const keyUp = new KeyboardEvent("keyup", {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    });

    inputBox.dispatchEvent(keyDown);
    inputBox.dispatchEvent(keyUp);

    console.log("Simulated Enter key to send message.");
  }, 100);
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

  document
    .getElementById("rephraseBtn")
    .addEventListener("click", () => {
      console.log("User chose to rephrase");
      alert("Rephrase feature coming soon.");
    });

  document
    .getElementById("deleteBtn")
    .addEventListener("click", () => {
      inputBox.innerText = "";
      warningBox.remove();
    });

  document
    .getElementById("sendAnywayBtn")
    .addEventListener("click", async () => {
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
