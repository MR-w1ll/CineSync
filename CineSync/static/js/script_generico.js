// ======================= INICIA SOCKET =======================
const current_page_url = document.getElementById('current-page-url').textContent  // Coleta o url da pagina em utilização
const socket = io.connect(current_page_url);                                      // Inicializa o Socket.IO


// ======================= VARIAVEIS =======================
// controle da visibilidade do chat e modo fullscreen do player
let isChatVisible = false;
let isFullscreen = false;

// Aspecto personalizado (16:9 por padrão)
const customAspectRatio = {width: 16,height: 9};
const aspectRatio = customAspectRatio.width / customAspectRatio.height;

const chat = document.getElementById('chat');
const input = document.getElementById('messageInput');
const chat_fullscreen = document.getElementById('chat-fullscreen');
const input_fullscreen = document.getElementById('messageInput-fullscreen');

let username = document.getElementById('user-name').textContent;
if (!username) username = "Anônimo"; // Ajuste

// Inicializa o player do YouTube
let player;
player = document.getElementById('video-player');
console.log(player) // Notificação

// lista de videos na lista de reprodução
let listaVideos = [];




// ======================= SISTEMA DE CONTROLE DO FULL-SCREEN DO PLAYER =======================

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





// ======================= SISTEMA CHAT INTEGRADO =======================

// Recebe e escreve no bloco do chat a menssagem
socket.on('message', (data) => {
    const isMe = data.startsWith(username + ":"); // Verifica se a menssagem é minha
    const msg = document.createElement('div');
    const msg_fullscreen = document.createElement('div');

    


    msg.className = 'msg ' + (isMe ? 'me' : 'other');
    msg.innerText = data;
    chat.appendChild(msg);
    chat.scrollTop = chat.scrollHeight;

    msg_fullscreen.className = 'msg ' + (isMe ? 'me' : 'other');
    msg_fullscreen.innerText = data;
    chat_fullscreen.appendChild(msg_fullscreen);
    chat_fullscreen.scrollTop = chat_fullscreen.scrollHeight;

    if (isMe) {
        msg.style.alignContent = "right";
        msg.style.textAlign = "right";
        msg.style.paddingRight = "40px";
        msg.style.paddingTop = "5px";
        msg.style.backgroundColor = "#6eedf1";


        msg_fullscreen.style.alignContent = "right";
        msg_fullscreen.style.textAlign = "right";
        msg_fullscreen.style.paddingRight = "40px";
        msg_fullscreen.style.paddingTop = "5px";
        msg_fullscreen.style.backgroundColor = "#6eedf1";

    } else {
        msg.style.paddingRight = "40px";
        msg.style.paddingTop = "5px";
        msg.style.backgroundColor = "#fdffa0";

        msg_fullscreen.style.paddingRight = "40px";
        msg_fullscreen.style.paddingTop = "5px";
        msg_fullscreen.style.backgroundColor = "#fdffa0";

    }

    const toggleButton = document.getElementById('chat-toggle-button');
    const toggleButton_fullscreen = document.getElementById('chat-toggle-button-fullscreen');

    if (toggleButton.style.display !== "none" && toggleButton_fullscreen.style.display !== "none") {
        toggleButton.style.backgroundColor = "#ff0000";
        toggleButton_fullscreen.style.backgroundColor = "#ff0000";
    } else {
        console.log("O chat está visível ou com display não definido diretamente.");
    }
    


});

// Envia a menssagem ao servidor
function sendMessage() {
    const text = input.value.trim();
    const text_fullscreen = input_fullscreen.value.trim();

    if (text.length !== 0) {
        socket.send(`${username}: ${text}`);
        input.value = "";
    }
    else if (text_fullscreen.length !== 0) {
        socket.send(`${username}: ${text_fullscreen}`);
        input_fullscreen.value = "";
    }

}

// Enviar a menssagem apertando "enter"
input.addEventListener("keypress", function (e) {
    if (e.key === "Enter") sendMessage();
});




// ======================= SISTEMA DO PLAYER E COMUNICAÇÃO COM O SERVIDOR E SINCRONIZAÇÃO DOS USUARIOS =======================
// Esse sistema inicia o player, prepara o video e realiza todas as comunicações responsaveis pela sincronização dos usuarios
// "core" da aplicação desenvolvida

document.addEventListener("DOMContentLoaded", function () {
    player = document.getElementById('video-player');


    // Inicialize o player assim que o vídeo estiver pronto para ser reproduzido
    player.addEventListener('canplay', initializePlayer, { once: true });

    // Ouça outros eventos conforme necessário
    player.addEventListener('play', () => {
        console.log('O vídeo começou a ser reproduzido!');
    });

    player.addEventListener('pause', () => {
        console.log('O vídeo foi pausado!');
    });
});

function initializePlayer_TV() {
    player = document.getElementById('player-player');

    player.addEventListener('loadedmetadata', () => {
        console.log('Player carregado e metadados disponíveis');
        setInterval(updateUI, 100);
        setInterval(updateTABELA, 100);
    });

    player.addEventListener('play', () => {
        console.log('Vídeo iniciado');
    });

    player.addEventListener('pause', () => {
        console.log('Vídeo pausado');
    });
}




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

    // Obtém a velocidade do vídeo (playback rate)
    const velocidade = player.playbackRate;
    
    // Obtém o tempo atual do vídeo
    let time = player.currentTime;
    if (command === 'MoveTimer') {
        time = value;
    };

    // Verifica o estado do vídeo (pausado ou reproduzindo)
    let pause = !player.paused;
    console.log(pause)

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
    player.volume = event.target.value / 100;
}
// =================================================================== //




// =================================================================== //
// Função chamada quando o player estiver pronto
function initializePlayer() {
    setInterval(updateUI, 100);
    setInterval(updateTABELA, 100);
}

// Atualizar barra de progresso (NOVO)
function seek(event) {
    const duration = player.duration;
    const newTime = (event.target.value / 100) * duration;
    sendCommand('MoveTimer', newTime)
}

// Atualizar UI (barra de progresso e minutagem) (NOVO)
function updateUI() {
    if (player && player.duration) {
        const currentTime = player.currentTime;
        const duration = player.duration;
        const progress = (currentTime / duration) * 100;

        document.getElementById('current-time').innerText = formatTime(currentTime);
        document.getElementById('progress-bar').value = progress;
        document.getElementById('current-time-fullscreen').innerText = formatTime(currentTime);
        document.getElementById('progress-bar-fullscreen').value = progress;
    }
}

// Formatar tempo no formato HH:MM:SS (NOVO)
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
    // player = document.getElementById('video-player');

    switch (command) {
        case "playPause":
            if (player.paused) {
                player.play();
                document.getElementById('bt-play').textContent = '▐▐';
                document.getElementById('bt-play').style.paddingLeft = '10px';
                document.getElementById('bt-play-fullscreen').textContent = '▐▐';
                document.getElementById('bt-play-fullscreen').style.paddingLeft = '10px';
            } else {
                player.pause();
                document.getElementById('bt-play').textContent = '▶';
                document.getElementById('bt-play').style.paddingLeft = '15px';
                document.getElementById('bt-play-fullscreen').textContent = '▶';
                document.getElementById('bt-play-fullscreen').style.paddingLeft = '15px';
            }
            break;
        case "MoveTimer":
            player.currentTime = Math.min(Math.max(value, 0), player.duration);
            player.play();
            document.getElementById('bt-play').textContent = '▐▐';
            document.getElementById('bt-play').style.paddingLeft = '10px';
            break;
        case "rewind":
            player.currentTime = Math.max(player.currentTime - 10, 0);
            break;
        case "forward":
            player.currentTime = Math.min(player.currentTime + 10, player.duration);
            break;
        case "setSpeed":
            player.playbackRate = parseFloat(value);
            selectElement.value = value;
            break;

        case "sincronizar":
            selectElement.value = value.velocidade; // Define o item selecionado pelo valor
            player.playbackRate = parseFloat(value.velocidade);

            player.currentTime = Math.min(Math.max(value.tempo, 0), player.duration);
            
            if (value.pausado === true) {
                player.pause();
                document.getElementById('bt-play').textContent = '▶';
                document.getElementById('bt-play').style.paddingLeft = '15px';
            } else {
                player.play();
                document.getElementById('bt-play').textContent = '▐▐';
                document.getElementById('bt-play').style.paddingLeft = '10px';
            }

            listaVideos = value.listaVideos
            atualizarTabelaReproducao();

            console.log('[#] listaVideos abaixo')
            console.log(listaVideos)
            console.log(value)

            
            console.log('[#] Estado da sincronização: OK')
            break;

        case "Enviar_Status":
            let user_name = 'None';
            user_name = document.getElementById('user-name').textContent

            // Obtém a velocidade do vídeo (playback rate)
            const velocidade = player.playbackRate;
            
            // Obtém o tempo atual do vídeo
            let time = player.currentTime;
            if (command === 'MoveTimer') {
                time = value; // Atualiza o tempo, se necessário
            }

            // Verifica o estado do vídeo (pausado ou reproduzindo)
            let pause = player.paused;

            socket.emit("status", { estado:[user_name, velocidade, time, pause] });
            break;
        
        case "Add_item_lista_reproducao":
            console.log('Novo item adcionado na lista de reprodução');
            listaVideos.push(value);
            atualizarTabelaReproducao();   
            break;

        case "Carregar_video_da_lista":
            player.src = value.link;
            player.load();
            player.play();
            break;
        
        case "alerta_emoji":
            if (!ismenoti) {
                alerta_emoji();
            }
            ismenoti = false;

            break

        default:
            console.log("Comando desconhecido:", command);
            break;
    }
}
// =================================================================== //



// =================================================================== //
function updateTABELA() {
    // console.log('Atualizar...')

    let user_name    = 'None';
    user_name        = document.getElementById('user-name').textContent
    const velocidade = player.playbackRate;
    let time         = player.currentTime;
    let pause        = player.paused;

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




// =================================================================== //
// executa comando conforme o evento de visualização ou ocutação/minimização da pagina ocorrem
// Responssavel para resincronizar o player do usuario ao voltar a pagina da sala
// chamando a função "sincronizar()"
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      console.log('Usuário saiu da aba ou minimizou o navegador');
      // Você pode pausar um vídeo, por exemplo
    } else if (document.visibilityState === 'visible') {
      console.log('Usuário voltou para a aba');
      sincronizar()
    }
  });
// =================================================================== //


// =================================================================== //
// Alternar visibilidade do bloco
function toggleReproducao() {
    const bloco = document.getElementById('bloco-lista-reproducao');
    bloco.classList.toggle('hidden');
}

// Adicionar item à lista de reprodução
function adicionarVideo() {
    const nome = document.getElementById('nome-video').value.trim();
    const link = document.getElementById('link-video').value.trim();

    if (nome && link) {
        const novoVideo = {
            id: listaVideos.length + 1,
            nome: nome,
            link: link
        };
        sendCommand('Add_item_lista_reproducao', novoVideo)

        // listaVideos.push(novoVideo);
        // atualizarTabelaReproducao();

        // Limpa campos
        document.getElementById('nome-video').value = "";
        document.getElementById('link-video').value = "";
    }
}

// Atualiza a tabela HTML
function atualizarTabelaReproducao() {
    const tbody = document.getElementById('tabela-reproducao');
    tbody.innerHTML = "";

    listaVideos.forEach(video => {
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td>${video.id}</td>
            <td>${video.nome}</td>
            <td><a href="${video.link}" target="_blank">🔗</a></td>
            <td><button onclick="selecionarVideo('${video.nome}', '${video.link}')">Selecionar</button></td>
        `;

        tbody.appendChild(tr);
    });
}


// Função para garantir que o elemento existe antes de continuar
function esperarElemento(seletor) {
    return new Promise((resolve) => {
        const elemento = document.querySelector(seletor);
        if (elemento) {
            return resolve(elemento);
        }

        const observer = new MutationObserver(() => {
            const elementoEncontrado = document.querySelector(seletor);
            if (elementoEncontrado) {
                observer.disconnect();
                resolve(elementoEncontrado);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    });
}

// Função principal para preencher a tabela
async function atualizarTabelaReproducao() {
    const tbody = await esperarElemento('#tabela-reproducao'); // Espera o elemento existir

    tbody.innerHTML = "";

    listaVideos.forEach(video => {
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td>${video.id}</td>
            <td>${video.nome}</td>
            <td><a href="${video.link}" target="_blank">🔗</a></td>
            <td><button onclick="selecionarVideo('${video.nome}', '${video.link}')">Selecionar</button></td>
        `;

        tbody.appendChild(tr);
    });
}





// Função chamada ao clicar em "Selecionar"
function selecionarVideo(nome, link) {
    console.log("Selecionado:", nome, link);

    const video_selecionado = {nome: nome, link: link};
    sendCommand('Carregar_video_da_lista', video_selecionado)

    // Aqui você pode:
    // - trocar o src do player
    // - sincronizar com os outros usuários
    // Exemplo:
    // player.src = link;
    // player.load();
    // player.play();

    // Ou emitir comando com socket:
    // sendCommand("trocar_video", link)
}















// ========== PERSONALIZAÇÃO ==========
const EMOJI = "👋";              // Emoji que aparece
const DURATION = 2500;          // Duração da animação
const START_SIZE = "15rem";      // Tamanho inicial
const END_SCALE = 1.2;          // Escala máxima
const OFFSET_Y = "-200px";      // Quão alto ele sobe

// ========== POSICIONAMENTO ==========
const positionMode = "preset";             // "preset" ou "manual"
const presetPosition = "center";     // "center", "top-left", "top-right", "bottom-left", "bottom-right"
const manualX = 200;                       // Usado se positionMode = "manual"
const manualY = 300;

const container = document.getElementById("emoji-container");
const container_fullscreen = document.getElementById("emoji-container-fullscreen");
const button = document.getElementById("wave-button");

let ismenoti = false;

function alerta_emoji() {
    const emoji = document.createElement("div");
    emoji.textContent = EMOJI;
    emoji.classList.add("emoji-wave");
    emoji.style.fontSize = START_SIZE;
    emoji.style.position = "absolute";
    emoji.style.zIndex = "10001";

    if (positionMode === "preset") {
        // Posições predefinidas
        switch (presetPosition) {
            case "center":
                emoji.style.top = "50%";
                emoji.style.left = "50%";
                emoji.style.transform = "translate(-50%, -50%)";
                break;
            case "top-left":
                emoji.style.top = "10px";
                emoji.style.left = "10px";
                break;
            case "top-right":
                emoji.style.top = "10px";
                emoji.style.right = "10px";
                break;
            case "bottom-left":
                emoji.style.bottom = "10px";
                emoji.style.left = "10px";
                break;
            case "bottom-right":
                emoji.style.bottom = "10px";
                emoji.style.right = "10px";
                break;
            default:
                emoji.style.bottom = "10px";
                emoji.style.right = "10px";
        }
    } else if (positionMode === "manual") {
        emoji.style.left = `${manualX}px`;
        emoji.style.top = `${manualY}px`;
    }
    
    if (isFullscreen) {
        container_fullscreen.appendChild(emoji);
    } else {
        container.appendChild(emoji);
    }

    setTimeout(() => {
        emoji.remove();
    }, DURATION);
};

function alerta_emoji_ativacao() {
    ismenoti = true;
    sendCommand("alerta_emoji", null);
};