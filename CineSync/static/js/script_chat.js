let chatVisible = true;


function toggleChat() {
    const chatBlock = document.getElementById('chat-block');
    const toggleButton = document.getElementById('chat-toggle-button');
    const chatBlock_fullscreen = document.getElementById('chat-block-fullscreen');
    const toggleButton_fullscreen = document.getElementById('chat-toggle-button-fullscreen');

    if (chatVisible) {
        chatBlock.style.display = 'none';
        toggleButton.style.display = 'block';
        chatBlock_fullscreen.style.display = 'none';
        toggleButton_fullscreen.style.display = 'block';
    } else {
        chatBlock.style.display = 'flex';
        toggleButton.style.display = 'none';
        chatBlock_fullscreen.style.display = 'flex';
        toggleButton_fullscreen.style.display = 'none';
        toggleButton.style.backgroundColor = "#007bff";
        toggleButton_fullscreen.style.backgroundColor = "#007bff";
    }

    chatVisible = !chatVisible;
}



// function toggleFullscreen() {
//     const elem = document.documentElement;

//     if (!document.fullscreenElement) {
//         elem.requestFullscreen().catch((err) => {
//             alert(`Erro ao entrar em fullscreen: ${err.message}`);
//         });
//     } else {
//         document.exitFullscreen();
//     }
// }







// const socket = io();

// const chat = document.getElementById('chat');
// const input = document.getElementById('messageInput');

// let username = prompt("Escolha um nome de usuário:");
// if (!username) username = "Anônimo";

// socket.on('message', (data) => {
//     const isMe = data.startsWith(username + ":");
//     const msg = document.createElement('div');
//     msg.className = 'msg ' + (isMe ? 'me' : 'other');
//     msg.innerText = data;
//     chat.appendChild(msg);
//     chat.scrollTop = chat.scrollHeight;
// });

// function sendMessage() {
//     const text = input.value.trim();
//     if (text.length === 0) return;
//     socket.send(`${username}: ${text}`);
//     input.value = "";
// }

// input.addEventListener("keypress", function (e) {
//     if (e.key === "Enter") sendMessage();
// });






