# import eventlet
# eventlet.monkey_patch()

from datetime import timedelta, datetime
import PySimpleGUI as sg
import threading
import queue
from flask import Flask, render_template, request, send_from_directory
from flask_socketio import SocketIO, send
from flask_cors import CORS
import pytz
import os

# from extras import *


# ======================== VARIAVEIS ========================
# Obtenha o timezone UTC-3
timezone = pytz.timezone('Etc/GMT+3')  # Nota: GMT+3 significa UTC-3

VERMELHO = "\033[31m"
VERDE    = "\033[32m"
RESET    = "\033[0m"
UPLOAD_FOLDER = 'fotos'
ID = 1

formatted_url = ""
estado = {'velocidade': 1, 'tempo': 0, 'pausado': True, 'data':'horario da atualização'}
lista_de_reproducao = []
RUN_SERVER = ""

user_data = []  # Lista global para armazenar os dados de usuários
FUSO_HORARIO = 'UTC-3'
USUARIOS = {} # USUARIOS = {'nome': {'tempo': 0,'pausado':False, 'velocidade':1}}



# ======================== FUNÇÕES AUXILIARES ========================
def extract_youtube_id(url):
    import re
    regex = r'(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})'
    match = re.match(regex, url)
    return match.group(1) if match else None

def segundos_para_horas(segundos): 
    # Cria um timedelta baseado no número de minutos
    delta = timedelta(seconds=segundos)
    return delta




# ======================== Configurações do Flask e SocketIO ========================
app = Flask(__name__)
app.config['SECRET_KEY'] = 'segredo-super-seguro'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
CORS(app)  # Habilita CORS para todas as rotas
socketio = SocketIO(app, cors_allowed_origins="*")  # Permite CORS para WebSocket

# Fila para comunicação entre Flask e PySimpleGUI
status_queue = queue.Queue()



# ======================== Classe do Painel com PySimpleGUI ========================
class MainPainel:
    def __init__(self, socketio):
        # self.socketio = socketio
        self.janela = self.criar_painel()
        self.main_loop()

    def criar_painel(self):
        layout = [
            [sg.Multiline(size=(40, 10), key="OUTPUT", font=("Helvetica", 12), disabled=True, autoscroll=True)],
            [sg.Button("Exibir Lista", key="BOTAO_LISTA"), sg.Button("Limpar Output", key="BOTAO_LIMPAR"), sg.Button("Foto", key="BOTAO_FOTO")],

            [sg.Table(values=[], headings=["Nome", "Minutagem"], key="TABLE", 
                      auto_size_columns=False, expand_x=True,
                      num_rows=5, enable_events=True)],
            [sg.Button("Atualizar Tabela", key="BOTAO_ATUALIZAR"), sg.Button("Limpar", key="BOTAO_LIMPAR")],
            [sg.Button("Fechar", key="BOTAO_FECHAR")],

        ]
        return sg.Window("Exemplo de Interface com PySimpleGUI", layout)

    def exibir_lista(self, output_element, lista):
        texto_existente = output_element.get()
        texto_novo = "\n".join(lista)
        texto_atualizado = f"{texto_existente}\n{texto_novo}".strip()
        output_element.update(texto_atualizado)

    def processar_status(self, status):
        """Adiciona o status recebido ao Multiline."""
        output_element = self.janela["OUTPUT"]
        texto_existente = output_element.get()
        texto_atualizado = f"{texto_existente}\n{status}".strip()
        output_element.update(texto_atualizado)

    def atualizar_tabela(self, tabela_element, dados):
        """Atualiza a tabela com os dados recebidos."""
        valores_tabela = [[usuario[0], usuario[2]] for usuario in dados]
        tabela_element.update(valores_tabela)

    def exibir_detalhes_usuario(self, usuario):
        """Exibe os detalhes de um usuário no output."""
        detalhes = f"Detalhes do Usuário:\nNome: {usuario[0]}\nVelocidade: {usuario[1]}\nMinutagem: {usuario[2]}\nPausado: {'Sim' if usuario[3] else 'Não'}"
        self.processar_status(detalhes)

    def main_loop(self):
        global user_data
        while True:
            evento, valores = self.janela.read(timeout=100)  # Timeout para checar a fila regularmente

            # Atualiza com dados da fila
            if not status_queue.empty():
                status = status_queue.get()
                self.processar_status(status)

            if evento == sg.WINDOW_CLOSED or evento == "BOTAO_FECHAR":
                break
            if evento == "BOTAO_FOTO":
                socketio.emit('player_command', {'command': 'foto', 'value': 'none'})
                print('oi')

            if evento == "BOTAO_LISTA":
                socketio.emit('player_command', {'command': 'Enviar_Status', 'value': ''})
            if evento == "BOTAO_ATUALIZAR":
                socketio.emit('player_command', {'command': 'Enviar_Status', 'value': ''})

                self.atualizar_tabela(self.janela["TABLE"], user_data)
            if evento == "TABLE" and valores["TABLE"]:
                self.janela["OUTPUT"].update("")
                indice_selecionado = valores["TABLE"][0]
                if 0 <= indice_selecionado < len(user_data):
                    usuario = user_data[indice_selecionado]
                    self.exibir_detalhes_usuario(usuario)
            if evento == "BOTAO_LIMPAR":
                self.janela["OUTPUT"].update("")

        self.janela.close()




# ======================== Rota e Eventos do Flask ========================

# Pagina inicial / criar ou entrar na sala
@app.route('/')
def index():
    return render_template('entrada.html')

# Sala de video compartilhado
@app.route('/player_video', methods=['POST'])
def player_video():
    global formatted_url, RUN_SERVER, USUARIOS

    youtube_url = request.form['youtube_url']
    user_name   = request.form['user_name']
    RUN_SERVER  = request.form['current_page_url']
    caminho_pagina = 'padrao.html'

    print(RUN_SERVER)

    if youtube_url.strip() == '':
        youtube_url = formatted_url

    if "www.youtube.com" in youtube_url:
        video_id = extract_youtube_id(youtube_url)
        if not video_id:
            return "URL inválida! Por favor, insira um link do YouTube válido.", 400
        formatted_url = f"https://www.youtube.com/embed/{video_id}?enablejsapi=1&controls=0&modestbranding=1&rel=0&disablekb=1"
        caminho_pagina = 'player_youtube.html'

    else:
        formatted_url = youtube_url
        caminho_pagina = 'player_generico.html'


    USUARIOS[user_name] = {'tempo': 0, 'velocidade':1, 'pausado':True}
    return render_template(caminho_pagina, video_url=formatted_url, user_name=user_name)
    # return render_template('index_v2.html', video_url=formatted_url, user_name=user_name)
    # return render_template('player_generico.html', video_url=formatted_url, user_name=user_name)


# Envia os comandos para os usuarios
@socketio.on('player_command')
def handle_player_command(data):
    print(f'\\n\n\n\n\n\n\n\n\n>>>>>>>>>>   {data}')
    global formatted_url, estado, lista_de_reproducao, USUARIOS

    user_name              = data['user_name']
    comando                = data['command']
    velocidade             = data['estado'][0]
    tempo                  = data['estado'][1]
    meta_data              = data['meta_data']
    data_do_envio          = meta_data[0]
    data_hora_iso          = data_do_envio.get('data_hora')
    fuso_horario_navegador = data_do_envio.get("fuso_horario")
    if comando != 'setSpeed':
        pausado                = data['estado'][2]
    else:
        pausado                = estado['pausado']

    # ==============================================================
    data_hora = datetime.fromisoformat(data_hora_iso)
    # Ajustar para UTC
    offset_fuso = int(FUSO_HORARIO[3:6])  # Extrai o offset (ex.: "-3")
    # data_hora_utc = data_hora + timedelta(hours=offset_fuso)
    data_hora_utc = data_hora

    if comando != 'sincronizar':
        estado = {
        'velocidade': velocidade,
        'tempo'     : tempo, # segundos
        'pausado'   : pausado,
        'data'      : data_hora_utc
        }
    if comando == 'Add_item_lista_reproducao': 
        lista_de_reproducao.append(data['value'])
    elif comando == 'Carregar_video_da_lista':
        formatted_url = data['value']['link']        
    elif comando == 'rewind':
        estado['tempo'] -= 10
    elif comando == 'forward':
        estado['tempo'] += 10

    # print(f'[========] COMANDO: {comando}')
    # print(f'{VERMELHO}[=o=] ESTADO MODIFICADO: {estado}{RESET}')

    print(f"\n[#] Comando recebido: {data}")
    print(f'[ESTADO] {estado}')

    USUARIOS[user_name] = {'tempo': tempo, 'velocidade':velocidade, 'pausado':pausado}
    data = {'command': comando, 'value': data['value']}
    socketio.emit('player_command', data )

# É chamado pelo usuario para que se sincronize com a ultima atualização de estado do player enviando os parametros necessarios
@socketio.on('sincronizar')
def sincronizar_player():
    global estado, lista_de_reproducao
    
    print('+=== SINCRONIZAÇÃO ===+')
    print(f"[$$] Comando recebido: sincronizar")
    print(f"[$$] Estado:\n {estado}")

    # Atualiza o `data_atual` para incluir o mesmo timezone
    data_atual = timezone.localize(datetime.now())

    velocidade = estado['velocidade']
    tempo      = estado['tempo']
    pausado    = estado['pausado']
    data       = estado['data']
    
    # data       = timezone.localize(data)
    if not pausado:
        # Novo fuso horário correto (exemplo: America/Sao_Paulo)
        fuso_correto = pytz.timezone("America/Sao_Paulo")

        # Reatribuir o fuso horário correto sem mudar a hora
        # data = data.replace(tzinfo=fuso_correto)

        print(f'I: {data}')
        print(f'F: {data_atual}')

        tempo_gasto  =  data_atual - data
        print(f'tempo gasto: {tempo_gasto}')
        tempo_gasto  = tempo_gasto.total_seconds()
        print(f'tempo gasto: {tempo_gasto}')
        print(f'tempo gasto: {type(tempo_gasto)}')
        print(f'velocidade: {velocidade}')
        print(f'velocidade: {type(velocidade)}')

        tempo_gasto  = tempo_gasto * float(velocidade)
        tempo_gasto  = segundos_para_horas(tempo_gasto)
        tempo       +=  tempo_gasto.total_seconds()

    value = {
    'velocidade' : velocidade,
    'tempo'      : tempo,      # segundos
    'pausado'    : pausado,
    'listaVideos': lista_de_reproducao,
    }
    
    print(f'{VERDE}[#] Enviando ESTADO: {value}{RESET}')
    socketio.emit('player_command', {'command':'sincronizar', 'value':value} )

# Usado para integrar o flask com o pysimplegui mandando os status para o painel
@socketio.on('status')
def receber_status(data):
    """Recebe o status e atualiza os dados do usuário."""
    global user_data
    data['estado'][2] = str(segundos_para_horas(data['estado'][2]))

    if user_data != []:
        for id, item in enumerate(user_data):
            # Name == Name
            if item[0] == data['estado'][0]:
                user_data[id] = data['estado']
            else:
                user_data.append(data['estado'])  # Salva o status no user_data
    else:
        user_data.append(data['estado'])  # Salva o status no user_data

    status = f"[#] Nome: {data['estado'][0]}\n[#] Tempo: {data['estado'][2]}\n[#] Pausado: {data['estado'][3]}\n[#] Velocidade: {data['estado'][1]}\n{'_'*20}"
    status_queue.put(status)  # Envia o status para a fila
    print(status)



# ======================== SISTEMA TABELA DE STATUS =======================
@socketio.on('atualizar_tabela')
def atualizar_tabela_estados(data):
    global USUARIOS

    # print('[0000000] Atualizar tabela')

    nome       = data['nome']
    velocidade = data['velocidade']
    tempo      = data['tempo']       # Segundos
    pausado    = data['pausado']

    tempo = f'{segundos_para_horas(tempo)}'[:11]
    USUARIOS[nome] = {'tempo': tempo, 'velocidade':velocidade, 'pausado':pausado}

    # Transformar o dicionário em uma matriz
    data_matrix = [
        [name, details['tempo'], details['pausado'], details['velocidade']]
        for name, details in USUARIOS.items()
    ] 

    data = {'command': 0, 'value': data_matrix}
    socketio.emit('atualizar_tabela', data)



# ======================== SISTEMA DE CHAT INTEGRADO ========================
@socketio.on('message')
def handle_message(data):
    print('Mensagem recebida:', data)
    send(data, broadcast=True)


# ======================== Execução do Servidor e GUI ========================
if __name__ == '__main__':
    print(f'{VERMELHO}[=o=] ESTADO MODIFICADO: {estado}{RESET}')
    # threading.Thread(target=MainPainel, args=(socketio,), daemon=True).start()
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)

