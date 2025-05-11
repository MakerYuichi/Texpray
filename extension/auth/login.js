document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginSubmit");

  loginBtn.addEventListener("click", async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
      alert("Please fill in both fields.");
      return;
    }

    try {
      const res = await fetch("https://texpray.onrender.com/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        // Correct string interpolation with backticks (`) for the URL
        const karmaRes = await fetch(`https://texpray.onrender.com/karma/${data.user_id}`, {
          headers: { Authorization: `Bearer ${data.access_token}` },  // Correct template literal here
        });

        const karmaData = await karmaRes.json();

        // Send data to background script to save
        chrome.runtime.sendMessage({
          type: "LOGIN_SUCCESS",
          data: {
            access_token: data.access_token,
            user_id: data.user_id,
            user_name: data.user_name,
            user_karma: karmaData.user_karma || 0,
          },
        }, (response) => {
          if (response.status === "success") {
            document.querySelector(".container").innerHTML = `
  <div class="welcome-box">
    <h2>👋 Welcome, <span style="color: #4CAF50;">${data.user_name}</span>!</h2>
    <p>You're now logged in and ready to use <strong>Texpray</strong>.</p>
    <div class="info-card">
      <h3>✨ What happens now?</h3>
      <ul>
        <li>💬 Your messages will be automatically screened for toxicity before they're sent.</li>
        <li>⚖️ If a message is flagged, you'll be offered kinder alternatives to reflect and rephrase.</li>
        <li>🌟 Every kind interaction earns you <strong>Karma</strong> points!</li>
      </ul>
    </div>
    <div class="karma-box">
      <h3>⭐ Karma Score</h3>
      <p style="font-size: 24px; font-weight: bold; color: #2196F3;">${karmaData.user_karma || 0}</p>
      <p>Your Karma reflects how respectful and positive your interactions are.</p>
    </div>
    <div class="next-steps">
      <p>✅ You can now close this window or open the extension popup to track your Karma in real-time.</p>
    </div>
  </div>
`;
          } else {
            alert("Login succeeded, but storage failed.");
          }
        });
      } else {
        alert(data.detail || "Login failed.");
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Could not connect to server.");
    }
  });
});
