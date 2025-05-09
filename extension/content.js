console.log("Texspray content script loaded")

const observeDOM = (selector, callback) => {
    const observer = MutationObserver(()=>{
        const inputBox = document.querySelector(selector);
        if (inputBox){
            observer.disconnect();
            callback(inputBox);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree : true
    });
};

const selectors = {
    teams: "div[data-tid='ckeditor-replyConversation'] div[contenteditable='true']",
    slack: "div[role='textbox']",
    whatsapp: "div[contenteditable='true'][data-tab='6']"
  };

const hostname = window.location.hostname;
let activeSeclector = null

if (hostname.includes('teams')) activeSeclector=selectors.teams;
else if (hostname.includes('whatsapp')) activeSeclector=selectors.whatsapp;
else if (hostname.includes('slack')) activeSeclector=selectors.slack;

if (activeSeclector) {
    observeDOM(activeSeclector, (inputBox) => {
        console.log("Message Box found");

        inputBox.addEventListener("keydown", async(e) => {
            if (e.key == "Enter" && !e.shiftKey){
                e.preventDefault()
                const message = inputBox.innerText.trim();
                if (!message) return

                console.log("Checking message for toxicity: ", message);
            }
        });
    });
}