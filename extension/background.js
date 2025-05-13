chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed!");

  // Check if the user is logged in during installation
  chrome.storage.local.get(["user_name", "user_karma", "user_id"], (result) => {
    if (!result.user_name) {
      console.log("No user logged in.");
    } else {
      console.log("User logged in: ", result.user_name);
    }
  });
});

// Listen for login event and store user info
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "LOGIN_SUCCESS") {
    console.log("Login success message received", message.data);

    // Store user info in chrome storage with error handling
    chrome.storage.local.set({
      access_token: message.data.access_token,
      user_name: message.data.user_name,
      user_id: message.data.user_id,
      user_karma: message.data.user_karma || 0,  // Default karma if not provided
    }, () => {
      console.log("Received token:", message.data.access_token);
      if (chrome.runtime.lastError) {
        console.error("Error saving user data:", chrome.runtime.lastError);
        sendResponse({ status: "error", message: "Failed to save user data" });
      } else {
        sendResponse({ status: "success", message: "User info saved!" });
      }
    });
    return true;  // Indicates we're using sendResponse asynchronously
  }

  if (message.type === "LOGOUT") {
    // Clear user session from chrome storage with error handling
    chrome.storage.local.clear(() => {
      if (chrome.runtime.lastError) {
        console.error("Error clearing session:", chrome.runtime.lastError);
        sendResponse({ status: "error", message: "Failed to log out" });
      } else {
        console.log("User logged out and session cleared.");
        sendResponse({ status: "success", message: "User logged out!" });
      }
    });
    return true;
  }

  if (message.type === "MODERATE_MESSAGE") {
  const { message: msg, token } = message.payload;

  // Retrieve user_id from chrome storage
  chrome.storage.local.get(["user_id"], (result) => {
    const user_id = result.user_id;
    
    if (!user_id) {
      sendResponse({ error: "User ID is not found in storage" });
      return;
    }

    fetch("https://texpray.onrender.com/moderate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ mssg: msg, user_id: user_id })
    })
      .then(res => res.json().then(data => ({ status: res.status, ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          sendResponse({ error: "Server responded with error", data });
        } else {
          sendResponse({ data });
        }
      })
      .catch(err => {
        sendResponse({ error: err.message });
      });
  });

  return true;  // Keep sendResponse async
}


});

// Inside the extension's background script or service worker
chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [
    {
      id: 1,
      priority: 1,
      action: {
        type: "redirect",
        redirect: {
          extensionPath: "/auth/signup.html"  // Redirect to this file in the extension
        }
      },
      condition: {
        urlFilter: "texpray.onrender.com/auth/signup.html",
        resourceTypes: ["main_frame"]
      }
    }
  ],
  removeRuleIds: [1]  // Clean up old rules (optional)
});