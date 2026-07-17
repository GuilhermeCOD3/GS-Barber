// Painel do barbeiro com login simples, sessão e integração opcional ao Firebase.
const formularioLogin = document.getElementById('form-login');
const mensagemLogin = document.getElementById('mensagem-login');
const areaPainel = document.getElementById('area-painel');
const listaPainel = document.getElementById('lista-painel');
const botaoSair = document.getElementById('botao-sair');

const usuarioPadrao = 'barbeiro';
const senhaPadrao = '123456';

let firestore = null;
let firebaseDisponivel = false;

function mostrarMensagem(texto, tipo) {
    mensagemLogin.className = `alert alert-${tipo}`;
    mensagemLogin.textContent = texto;
    mensagemLogin.classList.remove('d-none');
}

function inicializarFirebase() {
    if (!window.firebaseConfig) {
        return;
    }

    const config = window.firebaseConfig;

    if (config.projectId === 'SEU_PROJETO' || config.apiKey === 'SUA_API_KEY') {
        return;
    }

    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(config);
        }
        firestore = firebase.firestore();
        firebaseDisponivel = true;
    } catch (erro) {
        console.warn('Firebase não pôde ser inicializado:', erro);
    }
}

function salvarLocalmente(agendamentos) {
    localStorage.setItem('agendamentosGS', JSON.stringify(agendamentos));
}

async function carregarAgendamentos() {
    const agendamentosLocais = JSON.parse(localStorage.getItem('agendamentosGS') || '[]');

    if (firebaseDisponivel && firestore) {
        try {
            const snapshot = await firestore.collection('agendamentos').orderBy('criadoEm', 'asc').get();
            const agendamentosRemotos = snapshot.docs.map((doc) => doc.data());

            const todos = [...agendamentosLocais, ...agendamentosRemotos.filter((item) => !agendamentosLocais.some((local) => local.id === item.id))];
            salvarLocalmente(todos);
            renderizarAgendamentos(todos);
            return;
        } catch (erro) {
            console.warn('Não foi possível carregar do Firebase:', erro);
        }
    }

    renderizarAgendamentos(agendamentosLocais);
}

function renderizarAgendamentos(agendamentos) {
    listaPainel.innerHTML = '';

    if (agendamentos.length === 0) {
        listaPainel.innerHTML = '<div class="list-group-item text-muted">Nenhum agendamento encontrado.</div>';
        return;
    }

    agendamentos.forEach((agendamento, indice) => {
        const item = document.createElement('div');
        item.className = 'list-group-item';
        item.innerHTML = `
            <div class="d-flex justify-content-between gap-3">
                <div>
                    <strong>${agendamento.nome}</strong><br>
                    <span class="text-muted">${agendamento.servico} • ${agendamento.data} às ${agendamento.horario}</span><br>
                    <span class="text-muted">${agendamento.telefone}</span>
                </div>
                <div class="text-end">
                    <span class="badge bg-gold text-dark mb-2">${agendamento.horario}</span><br>
                    <button class="btn btn-sm btn-outline-gold remover" data-indice="${indice}">Remover</button>
                </div>
            </div>
        `;
        listaPainel.appendChild(item);
    });
}

function entrarNoPainel() {
    areaPainel.classList.remove('d-none');
    sessionStorage.setItem('gsbarber-auth', 'true');
    mostrarMensagem('Login realizado com sucesso.', 'success');
    carregarAgendamentos();
}

function sairDoPainel() {
    areaPainel.classList.add('d-none');
    sessionStorage.removeItem('gsbarber-auth');
    formularioLogin.reset();
    mensagemLogin.className = 'alert d-none';
    mensagemLogin.textContent = '';
}

async function removerAgendamento(indice) {
    const agendamentos = JSON.parse(localStorage.getItem('agendamentosGS') || '[]');
    const agendamentoRemovido = agendamentos[indice];
    agendamentos.splice(indice, 1);
    salvarLocalmente(agendamentos);

    if (firebaseDisponivel && firestore && agendamentoRemovido?.id) {
        try {
            await firestore.collection('agendamentos').doc(agendamentoRemovido.id).delete();
        } catch (erro) {
            console.warn('Erro ao remover no Firebase:', erro);
        }
    }

    carregarAgendamentos();
}

formularioLogin.addEventListener('submit', (evento) => {
    evento.preventDefault();

    const usuario = document.getElementById('usuario').value.trim();
    const senha = document.getElementById('senha').value.trim();

    if (usuario === usuarioPadrao && senha === senhaPadrao) {
        entrarNoPainel();
    } else {
        mostrarMensagem('Usuário ou senha incorretos.', 'danger');
    }
});

botaoSair.addEventListener('click', sairDoPainel);

listaPainel.addEventListener('click', (evento) => {
    if (evento.target.classList.contains('remover')) {
        const indice = Number(evento.target.dataset.indice);
        removerAgendamento(indice);
    }
});

inicializarFirebase();

if (sessionStorage.getItem('gsbarber-auth') === 'true') {
    entrarNoPainel();
}
