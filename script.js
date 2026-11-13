/* =====================================
   NEXUS AI — FRONTEND ENGINE
   Connected to the NEXUS AI backend
===================================== */

// Main elements
const messageInput = document.querySelector("#messageInput");
const sendButton = document.querySelector("#sendButton");
const messages = document.querySelector("#messages");
const welcome = document.querySelector("#welcome");
const newChatButton = document.querySelector("#newChatButton");
const chatHistory = document.querySelector("#chatHistory");
const clearButton = document.querySelector("#clearButton");
const mobileMenu = document.querySelector("#mobileMenu");
const sidebar = document.querySelector("#sidebar");
const attachButton = document.querySelector("#attachButton");
const fileInput = document.querySelector("#fileInput");

// Application state
const STORAGE_KEY = "nexus_ai_conversations";

let conversations = [];
let activeConversationId = null;
let isGenerating = false;


// =====================================
// Save and Restore Data
// =====================================

function loadConversations() {
    try {
        conversations = JSON.parse(
            localStorage.getItem(STORAGE_KEY)
        ) || [];

        if (!Array.isArray(conversations)) {
            conversations = [];
        }

    } catch {
        conversations = [];
    }
}

function saveConversations() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(conversations)
        );

    } catch {
        alert("Storage is full or unavailable.");
    }
}

function getActiveConversation() {
    return conversations.find(
        chat => chat.id === activeConversationId
    );
}


// =====================================
// Create New Chat
// =====================================

function createNewChat() {
    const conversation = {
        id: Date.now().toString(),
        title: "New conversation",
        messages: [],
        createdAt: new Date().toISOString()
    };

    conversations.unshift(conversation);

    activeConversationId = conversation.id;

    saveConversations();
    renderHistory();
    renderConversation();

    messageInput.focus();
}


// =====================================
// Render Chat History
// =====================================

function renderHistory() {
    chatHistory.innerHTML = "";

    conversations.forEach(conversation => {

        const button = document.createElement("button");

        button.className = "history-item";
        button.textContent = conversation.title;

        if (conversation.id === activeConversationId) {
            button.style.background = "#8e6af21c";
            button.style.color = "white";
        }

        button.addEventListener("click", () => {

            activeConversationId = conversation.id;

            renderHistory();
            renderConversation();

            sidebar.classList.remove("open");
        });

        chatHistory.appendChild(button);
    });
}


// =====================================
// Create Message Element
// =====================================

function createMessageElement(message) {

    const wrapper = document.createElement("div");
    wrapper.className = `message ${message.role}`;

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";

    avatar.textContent =
        message.role === "user" ? "G" : "N";

    const content = document.createElement("div");
    content.className = "message-content";

    const name = document.createElement("div");
    name.className = "message-name";

    name.textContent =
        message.role === "user" ? "YOU" : "NEXUS AI";

    const text = document.createElement("div");
    text.className = "message-text";

    text.textContent = message.content;

    content.append(name, text);

    wrapper.append(avatar, content);

    return wrapper;
}


// =====================================
// Render Conversation
// =====================================

function renderConversation() {

    messages.innerHTML = "";

    const conversation = getActiveConversation();

    if (!conversation) {
        welcome.style.display = "block";
        return;
    }

    welcome.style.display =
        conversation.messages.length === 0
            ? "block"
            : "none";

    conversation.messages.forEach(message => {

        messages.appendChild(
            createMessageElement(message)
        );

    });

    scrollToBottom();
}

function scrollToBottom() {

    const chatArea = document.querySelector("#chatArea");

    chatArea.scrollTop = chatArea.scrollHeight;
}


// =====================================
// Add Message
// =====================================

function addMessage(role, content) {

    const conversation = getActiveConversation();

    if (!conversation) return;

    const message = {
        role,
        content,
        timestamp: new Date().toISOString()
    };

    conversation.messages.push(message);

    if (
        role === "user" &&
        conversation.messages.length === 1
    ) {
        conversation.title = content.slice(0, 30);
    }

    saveConversations();

    renderHistory();
    renderConversation();
}


// =====================================
// Show Loading State
// =====================================

function showLoading() {

    const loading = document.createElement("div");

    loading.className = "message";
    loading.id = "loadingMessage";

    const avatar = document.createElement("div");

    avatar.className = "message-avatar";
    avatar.textContent = "N";

    const text = document.createElement("div");

    text.className = "message-text";
    text.textContent = "NEXUS AI is thinking...";

    loading.append(avatar, text);

    messages.appendChild(loading);

    scrollToBottom();

    return loading;
}


// =====================================
// Send Message to Real AI
// =====================================

async function sendMessage() {

    const text = messageInput.value.trim();

    if (!text || isGenerating) return;

    if (!activeConversationId) {
        createNewChat();
    }

    messageInput.value = "";
    messageInput.style.height = "34px";

    addMessage("user", text);

    isGenerating = true;

    sendButton.disabled = true;

    const loading = showLoading();

    try {

        const conversation = getActiveConversation();

        // Send conversation history to preserve context

        const apiMessages = conversation.messages

            .filter(message =>
                ["user", "assistant"].includes(message.role) &&
                typeof message.content === "string"
            )

            .map(message => ({
                role: message.role,
                content: message.content
            }));


        // Send request to the server

        const response = await fetch("/api/chat", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                messages: apiMessages
            })

        });


        const result = await response.json().catch(() => ({}));


        if (!response.ok) {

            throw new Error(
                result.error ||
                `Server error (${response.status})`
            );

        }


        if (
            typeof result.reply !== "string" ||
            !result.reply.trim()
        ) {

            throw new Error(
                "The AI server returned an empty response."
            );

        }


        // Display the actual response

        addMessage("assistant", result.reply);


    } catch (error) {

        console.error(
            "NEXUS AI request failed:",
            error
        );

        const errorMessage =
            error.message === "Failed to fetch"

                ? "I couldn't connect to the NEXUS AI server. Make sure it is running, then try again."

                : `Sorry, something went wrong: ${error.message}`;

        addMessage("assistant", errorMessage);


    } finally {

        loading.remove();

        isGenerating = false;

        sendButton.disabled = false;

        messageInput.focus();

    }
}


// =====================================
// Input Events
// =====================================

sendButton.addEventListener("click", sendMessage);


messageInput.addEventListener("keydown", event => {

    if (
        event.key === "Enter" &&
        !event.shiftKey
    ) {

        event.preventDefault();

        sendMessage();

    }

});


messageInput.addEventListener("input", () => {

    messageInput.style.height = "34px";

    messageInput.style.height =
        Math.min(messageInput.scrollHeight, 150) + "px";

});


// =====================================
// Homepage Suggestions
// =====================================

document.querySelectorAll(".suggestion-card").forEach(card => {

    card.addEventListener("click", () => {

        messageInput.value = card.dataset.prompt || "";

        sendMessage();

    });

});


// =====================================
// Create New Chat Button
// =====================================

newChatButton.addEventListener("click", () => {

    createNewChat();

    sidebar.classList.remove("open");

});


// =====================================
// Clear Current Chat
// =====================================

clearButton.addEventListener("click", () => {

    const conversation = getActiveConversation();

    if (!conversation) return;

    conversation.messages = [];

    conversation.title = "New conversation";

    saveConversations();

    renderHistory();

    renderConversation();

});


// =====================================
// Mobile Menu
// =====================================

mobileMenu.addEventListener("click", () => {

    sidebar.classList.toggle("open");

});


// =====================================
// File Selection
// =====================================

// Currently only adds the filename to the message.
// Real file upload and analysis will be added later.

attachButton.addEventListener("click", () => {

    fileInput.click();

});


fileInput.addEventListener("change", () => {

    const file = fileInput.files[0];

    if (!file) return;

    messageInput.value +=

        (messageInput.value ? "\n" : "") +

        `[Selected file: ${file.name}]`;

    messageInput.focus();

    fileInput.value = "";

});


// =====================================
// Sidebar Tools
// =====================================

document.querySelectorAll(".nav-item").forEach(button => {

    button.addEventListener("click", () => {

        document.querySelectorAll(".nav-item").forEach(item => {

            item.classList.remove("active");

        });

        button.classList.add("active");

        const tool = button.dataset.tool;


        if (tool === "writing") {

            messageInput.value =
                "Help me write and improve a piece of content.";

        }

        else if (tool === "ideas") {

            messageInput.value =
                "Generate creative and original ideas for me.";

        }

        else if (tool === "research") {

            messageInput.value =
                "Help me research a topic step by step.";

        }

        else if (tool === "chat") {

            messageInput.value = "";

        }


        messageInput.focus();

        sidebar.classList.remove("open");

    });

});


// =====================================
// Initialize Application
// =====================================

loadConversations();


if (conversations.length > 0) {

    activeConversationId = conversations[0].id;

}

else {

    createNewChat();

}


renderHistory();

renderConversation();