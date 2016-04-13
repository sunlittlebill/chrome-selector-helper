// receive the 'action' message or print a message within the background page's console
chrome.runtime.onMessage.addListener(function (msg, sender, response) {
    if (!msg['action'] || msg['action'] != "reload") {
        chrome.runtime.reload();
        console.log("reload");
    } else {
        // ...
    }
});