document.addEventListener("DOMContentLoaded", () => {
  const signupBtn = document.getElementById("signupSubmit");

  // Signup Logic
  if (signupBtn) {
    signupBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      const firstName = document.getElementById("firstName").value.trim();
      const lastName = document.getElementById("lastName").value.trim();
      const middleName = document.getElementById("middleName").value.trim();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;

      if (!firstName || !lastName || !email || !password) {
        alert("Please fill all fields");
        return;
      }

      // Log registration data for debugging
      console.log("Registering data:", {
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName,
        email,
        password,
      });

      try {
        const response = await fetch("https://texpray.onrender.com/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            middle_name: middleName,
            email,
            password,
          }),
        });

        console.log("Response Status:", response.status); // Log the response status
        const data = await response.json();
        console.log("Response Data:", data); // Log the response data

        if (response.ok) {
          alert("Account created successfully! Please log in.");
          window.location.href = "https://texpray.onrender.com/login"; // Redirect to login page
        } else {
          alert(data.detail || "Error during registration.");
        }
      } catch (error) {
        alert("An error occurred while creating the account.");
        console.error(error); // Log the full error for debugging
      }
    });
  } else {
    console.warn("signupSubmit button not found in the DOM.");
  }

  // Login Logic
  const loginBtn = document.getElementById("loginSubmit");

  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      // Check if fields are empty
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

        console.log("Response Status:", res.status); // Log the response status
        const data = await res.json();
        console.log("Response Data:", data); // Log the response data

        if (res.ok) {
          // Store token and user details in Chrome local storage
          await chrome.storage.local.set({
            token: data.access_token,
            user_id: data.user_id,
            user_name: data.user_name,
          });

          // Now fetch user karma
          try {
            const karmaRes = await fetch("https://texpray.onrender.com/karma/${data.user_id}", {
              method: "GET",
              headers: {
                Authorization: `Bearer ${data.access_token}`,
              },
            });

            const karmaData = await karmaRes.json();

            if (karmaRes.ok) {
              await chrome.storage.local.set({
                user_karma: karmaData.user_karma,
              });

              alert("Login successful!");
              window.close(); // Close login popup
            } else {
              alert(karmaData.detail || "Failed to fetch user karma.");
            }
          } catch (karmaErr) {
            console.error("Error fetching karma:", karmaErr);
            alert("Error fetching karma. Please try again.");
          }
        } else {
          alert(data.detail || "Login failed. Please check your credentials.");
        }
      } catch (err) {
        console.error("Login error:", err);
        alert("Error connecting to server. Please try again.");
      }
    });
  }
const forgotBtn = document.getElementById("forgotSubmit");
const emailInput = document.getElementById("email");

if (forgotBtn && emailInput) {
  const spinner = document.createElement('span');
  spinner.innerText = "Sending...";
  spinner.style.display = "none";
  spinner.style.marginLeft = "10px";
  forgotBtn.appendChild(spinner); // Add spinner next to the button text

  forgotBtn.addEventListener("click", async () => {
    const email = emailInput.value.trim();

    if (!email) {
      alert("Please enter your email address.");
      return;
    }

    spinner.style.display = "inline"; // Show the spinner

    try {
      const res = await fetch("https://texpray.onrender.com/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      spinner.style.display = "none"; // Hide the spinner

      if (res.ok) {
        alert("If an account with that email exists, a reset link has been sent.");
        window.close(); // or window.location.href = "login.html";
      } else {
        alert(data.detail || "Error processing the request.");
      }
    } catch (err) {
      console.error("Forgot password error:", err);
      spinner.style.display = "none"; // Hide spinner on error
      alert("Error connecting to server.");
    }
  });
}

const token = window.resetToken;  // This will be dynamically injected by FastAPI

    if (!token) {
      alert("Invalid or missing token.");
      return;
    }

    // Continue with your reset password logic
    const newPasswordInput = document.getElementById("newPassword");
    const confirmPasswordInput = document.getElementById("confirmPassword");
    const resetBtn = document.getElementById("resetSubmit");

    if (resetBtn) {
      resetBtn.addEventListener("click", async (e) => {
        e.preventDefault();

        const newPassword = newPasswordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        // Validate the inputs
        if (!newPassword || !confirmPassword) {
          alert("Please fill in both fields.");
          return;
        }

        if (newPassword !== confirmPassword) {
          alert("Passwords do not match.");
          return;
        }

        try {
          const res = await fetch("https://texpray.onrender.com/reset-password", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token, new_password: newPassword }),
          });

          const data = await res.json();

          if (res.ok) {
            alert("Your password has been reset successfully!");
            window.location.href = "https://texpray.onrender.com/login"; // Redirect to login page
          } else {
            alert(data.detail || "Error resetting password.");
          }
        } catch (err) {
          console.error("Reset password error:", err);
          alert("Error connecting to server.");
        }
      });
    }

});
