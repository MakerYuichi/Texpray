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
                const reflectionId = response.data.reflection_id
                console.log("Reflection ID:", reflectionId);
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

async function showReflectionUI(originalMessage, reflectionId, inputBox) {
  // Remove any existing overlay
  const existing = document.getElementById("texspray-reflection-ui");
  if (existing) existing.remove();

  if (!reflectionId) {
    console.error("Reflection ID is missing");
    return; // Prevent further execution if reflectionId is undefined
  }


  // Fetch the rephrased alternatives from the backend
  let rephrasedMessage = "";
  try {

    const { access_token } = await new Promise((resolve) =>
            chrome.storage.local.get(["access_token"], resolve)
          );

    const response = await fetch(`https://texpray.onrender.com/reflect/${reflectionId}/alternatives`, {
      headers: {Authorization: `Bearer ${access_token}`}
    });
    const data = await response.json();
    if (data && data.alternatives && data.alternatives.length > 0) {
      rephrasedMessage = data.alternatives.join(' / ');
    } else {
      rephrasedMessage = "No rephrased alternatives found.";
    }
  } catch (error) {
    console.error("Failed to fetch reflection alternatives:", error);
    rephrasedMessage = "Error fetching rephrased alternatives.";
  }

  // Create the overlay element
  const overlay = document.createElement("div");
  overlay.id = "texspray-reflection-ui";
  overlay.style.position = "fixed";
  overlay.style.top = 0;
  overlay.style.left = 0;
  overlay.style.width = "100vw";
  overlay.style.height = "100vh";
  overlay.style.background = "rgba(0,0,0,0.75)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = 9999;

  // Construct the overlay HTML with original and rephrased messages
  overlay.innerHTML = `
    <div style="background:white; padding:20px; max-width:500px; border-radius:10px; text-align:left; font-family:sans-serif">
      <h2 style="margin-top:0">Think Before You Send</h2>
      <p><strong>Original:</strong> ${originalMessage}</p>
      <p><strong>Rephrased:</strong> ${rephrasedMessage}</p>
      <p>💬 How might this message be received? Is this how you'd like to be remembered?</p>
      <button id="confirm-rephrased-send" style="margin-top:10px; background:#25D366; border:none; padding:10px 15px; color:white; border-radius:5px; cursor:pointer">Send Rephrased Message</button>
    </div>
  `;

  document.body.appendChild(overlay);

  // Add Escape key listener properly
  const escHandler = (e) => {
    if (e.key === "Escape") {
      overlay.remove();
      document.removeEventListener("keydown", escHandler);
    }
  };
  document.addEventListener("keydown", escHandler);

  document.getElementById("confirm-rephrased-send").onclick = () => {
    sendMessageManually(inputBox, rephrasedMessage);
    overlay.remove();
    document.removeEventListener("keydown", escHandler);
  };
}



// === Send message manually ===
function sendMessageManually(inputBox, message = "") {
  // Step 1: Focus the input box
  inputBox.focus();

  // Step 2: Set message via native React-compatible way
  inputBox.textContent = message;

  // Step 3: Dispatch a real input event so React knows something changed
  inputBox.dispatchEvent(
    new Event("input", {
      bubbles: true,
      cancelable: true,
    })
  );

  // Step 4: Wait and simulate click on the send button
  setTimeout(() => {
    const sendBtn = document.querySelector('span[data-icon="send"], div[aria-label="Send"]');
    if (sendBtn) {
      sendBtn.click();
      console.log("Clicked WhatsApp send button.");
    } else {
      console.warn("Send button not found. Trying Enter key fallback.");
      const keyDown = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
      });
      inputBox.dispatchEvent(keyDown);
    }
  }, 150);
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
      showReflectionUI(message, reflectionId, inputBox);
      console.log("Reflection ID:", reflectionId);
      warningBox.remove(); 
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
