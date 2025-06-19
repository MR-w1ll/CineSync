let isChatVisible = false;
let isFullscreen = false;

// Aspecto personalizado (16:9 por padrão)
const customAspectRatio = {
    width: 16,
    height: 9
};
const aspectRatio = customAspectRatio.width / customAspectRatio.height;

// Alternar visibilidade do chat
function toggleChat() {
    const chatContainer = document.getElementById('chat-container');
    isChatVisible = !isChatVisible;
    chatContainer.style.display = isChatVisible ? 'block' : 'none';
}

// Alternar fullscreen no player-container (que contém o iframe do YouTube)
function toggleFullscreen() {
    const playerContainer = document.getElementById('player-container');
    if (!isFullscreen) {
        if (playerContainer.requestFullscreen) {
            playerContainer.requestFullscreen();
        } else if (playerContainer.webkitRequestFullscreen) {
            playerContainer.webkitRequestFullscreen();
        } else if (playerContainer.mozRequestFullScreen) {
            playerContainer.mozRequestFullScreen();
        } else if (playerContainer.msRequestFullscreen) {
            playerContainer.msRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}

// Atualiza os estilos ao entrar/sair do modo fullscreen
document.addEventListener("fullscreenchange", () => {
    const playerContainer = document.getElementById('player-container');
    const fullscreenBtn = document.getElementById('fullscreen-button');
    const customButtons = document.getElementById('custom-buttons');

    if (document.fullscreenElement) {
        isFullscreen = true;

        // Expande o player com proporção personalizada
        playerContainer.style.width = "100vw";
        playerContainer.style.height = `${100 / aspectRatio}vw`;
        playerContainer.style.position = "relative";

        // Estiliza botão de fullscreen
        fullscreenBtn.style.position = "absolute";
        fullscreenBtn.style.bottom = "10px";
        fullscreenBtn.style.right = "10px";
        fullscreenBtn.style.zIndex = "9999";
        fullscreenBtn.style.display = "block";

        // Mostra botões personalizados
        customButtons.style.display = "flex";

    } else {
        isFullscreen = false;

        // Restaura tamanho do player
        playerContainer.style.width = "";
        playerContainer.style.height = "";
        playerContainer.style.position = "";

        // Botão de fullscreen normal
        fullscreenBtn.style.position = "absolute";
        fullscreenBtn.style.bottom = "10px";
        fullscreenBtn.style.right = "10px";
        fullscreenBtn.style.zIndex = "9999";
        fullscreenBtn.style.display = "block";

        // Esconde botões personalizados
        customButtons.style.display = "none";
    }
});


// Enviar mensagem no chat
document.getElementById('send-message').onclick = function () {
    const message = document.getElementById('chat-input').value;
    if (message) {
        const chatMessages = document.getElementById('chat-messages');
        const messageElement = document.createElement('div');
        messageElement.textContent = message;
        chatMessages.appendChild(messageElement);
        document.getElementById('chat-input').value = '';
    }
};









let isRemoteCommand = false; // Flag para permitir pausas remotas
let pauseAllowed = false; // Flag para controlar se o pause é autorizado

const current_page_url = document.getElementById('current-page-url').textContent

// Inicializa o Socket.IO
const socket = io.connect(current_page_url);

// Inicializa o player do YouTube
let player;

function onYouTubeIframeAPIReady() {
    player = new YT.Player('youtube-player', {
        events: {
            onReady: initializePlayer,
            onStateChange: onPlayerStateChange
        },
    });
}



function onPlayerStateChange(event) {
        if (event.data === YT.PlayerState.PAUSED) {
            if (!pauseAllowed && !isRemoteCommand) {
                player.playVideo(); // Reverte o pause apenas se não for comando remoto
            } else {
                isRemoteCommand = false
            }
        } else {
            if (pauseAllowed && !isRemoteCommand) {
                player.pauseVideo() // Reverte o play apenas se não for comando remoto
            } else {
                isRemoteCommand = false
            }
        }
    }


// Carrega a API do YouTube
const script = document.createElement("script");
script.src = "https://www.youtube.com/iframe_api";
document.head.appendChild(script);

// =================================================================== //
// FUNÇÕES AUXILIARES
function obetr_hora() {
    // Coleta a data e hora local
    const dataHora = new Date();

    // Coleta o offset de fuso horário em minutos (positivo ou negativo)
    const offsetMinutos = dataHora.getTimezoneOffset();

    // Converte o offset para o formato UTC (ex: "UTC-3")
    const horas = Math.floor(Math.abs(offsetMinutos) / 60).toString().padStart(2, '0');
    const minutos = (Math.abs(offsetMinutos) % 60).toString().padStart(2, '0');
    const sinal = offsetMinutos <= 0 ? "+" : "-";
    const fusoHorarioLocal = `UTC${sinal}${horas}:${minutos}`;

    // Prepara os dados para enviar ao servidor
    const dados = {
        data_hora: dataHora.toISOString(), // ISO 8601 para precisão
        fuso_horario: fusoHorarioLocal
    };

    return dados
}
// =================================================================== //



// =================================================================== //
// Envia o comando ao servidor
function sendCommand(command, value = null) {
    const user_name = document.getElementById('user-name').textContent
    const velocidade = document.getElementById('speed-control').value;
    
    let time = player.getCurrentTime();
    if (command === 'MoveTimer') {
        time = value;
    };

    const state = player.getPlayerState();

    let pause = true;
    if (state === YT.PlayerState.PLAYING) {
        pause = true;
        pauseAllowed = true;

    } else {
        pause = false;
        pauseAllowed = false;

    };

    data_de_envio = obetr_hora()

    socket.emit("player_command", { command, value, estado:[velocidade, time, pause], meta_data:[data_de_envio], user_name});

    console.log('[#] Comando enviado: ', command)
}

// Envia o dados de estado para sincronização ao servidor
function sincronizar() {
    socket.emit("sincronizar");
}

// Recebe comandos do servidor
socket.on("player_command", (data) => {
    const { command, value } = data;
    executeCommand(command, value);
});

// Atualizar volume
function setVolume(event) {
    const volume = event.target.value;
    player.setVolume(volume);
}
// =================================================================== //




// =================================================================== //
// Função chamada quando o player estiver pronto
function initializePlayer() {
    setInterval(updateUI, 100);
    setInterval(updateTABELA, 100);
}

// Atualizar barra de progresso
function seek(event) {
    const duration = player.getDuration();
    const newTime = (event.target.value / 100) * duration;
    sendCommand('MoveTimer', newTime)
}

// Atualizar UI (barra de progresso e minutagem)
function updateUI() {
    if (player && typeof player.getCurrentTime === 'function' && typeof player.getDuration === 'function') {
        const currentTime = player.getCurrentTime();
        const duration = player.getDuration();
        const progress = (currentTime / duration) * 100;

        document.getElementById('current-time').innerText = formatTime(currentTime);
        document.getElementById('progress-bar').value = progress;
    }
}

// Formatar tempo no formato HH:MM:SS
function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
// =================================================================== //



// =================================================================== //
// Executa o comando localmente
function executeCommand(command, value = null) {
    console.log('[#] Comando recebido:', command)
    console.log('[#] dados:', value)
    const selectElement = document.getElementById('speed-control'); // Obtém o elemento <select>

    switch (command) {
        case "playPause":
            const state = player.getPlayerState();
            if (state === YT.PlayerState.PLAYING) {
                player.pauseVideo();
                document.getElementById('bt-play').textContent = '▶';
                document.getElementById('bt-play').style.paddingLeft = '15px';
                document.getElementById('bt-play-fullscreen').textContent = '▶';
                document.getElementById('bt-play-fullscreen').style.paddingLeft = '15px';
            } else {
                player.playVideo();
                document.getElementById('bt-play').textContent = '▐▐';
                document.getElementById('bt-play').style.paddingLeft = '10px';
                document.getElementById('bt-play-fullscreen').textContent = '▐▐';
                document.getElementById('bt-play-fullscreen').style.paddingLeft = '10px';
            }
            break;
        case "MoveTimer":
            player.seekTo(value, true);
            break;
        case "rewind":
            player.seekTo(Math.max(player.getCurrentTime() - 10, 0), true);
            break;
        case "forward":
            player.seekTo(Math.min(player.getCurrentTime() + 10, player.getDuration()), true);
            break;
        case "setSpeed":
            player.setPlaybackRate(parseFloat(value));
            selectElement.value = value;
            break;

        case "sincronizar":
            selectElement.value = value.velocidade; // Define o item selecionado pelo valor
            player.setPlaybackRate(parseFloat(value.velocidade));

            isRemoteCommand = true;
            player.seekTo(value.tempo, true);
            if (value.pausado === true) {
                pauseAllowed = false;
                player.pauseVideo();
                document.getElementById('bt-play').textContent = '▶';
                document.getElementById('bt-play').style.paddingLeft = '15px';
            } else {
                pauseAllowed = true;
                player.playVideo();
                document.getElementById('bt-play').textContent = '▐▐';
                document.getElementById('bt-play').style.paddingLeft = '10px';
            }
            
            console.log('[#] Estado da sincronização: OK')
            break;

        case "Enviar_Status":
            let user_name = 'None';
            user_name = document.getElementById('user-name').textContent
            
            const velocidade = document.getElementById('speed-control').value;

            let time = player.getCurrentTime();
            if (command === 'MoveTimer') {
                time = value;
            };
            const state_pause = player.getPlayerState();
            let pause = false;
            if (state_pause === YT.PlayerState.PLAYING) {
                pause = false;
            } else {
                pause = true;
            };

            socket.emit("status", { estado:[user_name, velocidade, time, pause] });
            break;
        default:
            console.log("Comando desconhecido:", command);
    }
}
// =================================================================== //



// =================================================================== //
function updateTABELA() {
    // console.log('Atualizar...')

    let user_name    = 'None';
    user_name        = document.getElementById('user-name').textContent
    const velocidade = document.getElementById('speed-control').value;
    let time         = player.getCurrentTime();
    const state      = player.getPlayerState();
    let pause        = false;

    if (state === YT.PlayerState.PLAYING) {
        pause = false;
    } else {
        pause = true;
    };

    // if (pause !== pause_bt_perssonalizao) { // Esta diferente siguinifica que pausou usando o pause do player 
    //     executeCommand('playPause')
    //     sincronizar()
    // } 

    socket.emit("atualizar_tabela", {nome: user_name, velocidade: velocidade, tempo: time, pausado: pause});
}

// Recebe comandos do servidor
socket.on("atualizar_tabela", (data) => {
    const { command, value } = data;
    updateInfoBlock(value);
});

// Função para adicionar os elementos na tabela
function updateInfoBlock(dataMatrix) {
    // Localiza a tabela do bloco de informações
    const tableBody = document.querySelector("#info-block tbody");

    // Limpa o conteúdo existente na tabela antes de atualizar
    tableBody.innerHTML = "";

    // Percorre a matriz e insere as linhas na tabela
    dataMatrix.forEach((row) => {
        // Cria uma nova linha
        const tableRow = document.createElement("tr");

        // Adiciona as células com os dados
        row.forEach((cell) => {
            const tableCell = document.createElement("td");
            tableCell.textContent = cell;
            tableRow.appendChild(tableCell);
        });

        // Adiciona a linha à tabela
        tableBody.appendChild(tableRow);
    });
}
// =================================================================== //
