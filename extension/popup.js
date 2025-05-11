document.addEventListener("DOMContentLoaded", () => {
  // Handle button clicks
  document.getElementById("loginBtn").addEventListener("click", () => {
    window.open(chrome.runtime.getURL("auth/login.html"), "_blank");
  });

  document.getElementById("registerBtn").addEventListener("click", () => {
    window.open("https://texpray.onrender.com/register", "_blank");
  });

  document.getElementById("logout-btn").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "LOGOUT" }, (response) => {
      if (response.status === "success") {
        location.reload();  // Refresh popup after logout
      }
    });
  });

  // Load user info from storage
  chrome.storage.local.get(["user_name", "user_karma"], (result) => {
    if (result.user_name) {
      // Show user info section
      document.getElementById("user-info").style.display = "block";
      document.getElementById("auth-info").style.display = "none";

      // Fill in user data
      document.getElementById("user-name").innerText = result.user_name;
      document.getElementById("karma-score").innerText = result.user_karma ?? 0;
    } else {
      // Show login/register section
      document.getElementById("auth-info").style.display = "block";
      document.getElementById("user-info").style.display = "none";
    }
  });
});
