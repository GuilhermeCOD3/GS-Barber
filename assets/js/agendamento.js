// Lógica do formulário de agendamento da GS Barber.
// A ideia é manter o fluxo simples, com persistência local e sincronização opcional ao Firebase.

const diasParaExibir = 14;
const horariosPadrao = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
const agendamentosSalvos = JSON.parse(localStorage.getItem('agendamentosGS') || '[]');

const selectData = document.getElementById('data');
const inputHorario = document.getElementById('horario');
const containerHorarios = document.getElementById('horarios-container');
const listaAgendamentos = document.getElementById('lista-agendamentos');
const formulario = document.getElementById('form-agendamento');
const mensagem = document.getElementById('mensagem');

let firestore = null;
let firebaseDisponivel = false;

function salvarLocalmente() {
    localStorage.setItem('agendamentosGS', JSON.stringify(agendamentosSalvos));
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

function salvarNoFirebase(dados) {
    if (!firebaseDisponivel || !firestore) {
        return Promise.resolve(false);
    }

    return firestore.collection('agendamentos').doc(dados.id).set({
        ...dados,
        criadoEm: new Date().toISOString()
    }).then(() => true).catch((erro) => {
        console.warn('Erro ao salvar no Firebase:', erro);
        return false;
    });
}

function gerarDatas() {
    const datas = [];
    const hoje = new Date();
    let contador = 0;

    while (datas.length < diasParaExibir) {
        const data = new Date(hoje);
        data.setDate(hoje.getDate() + contador);
        contador += 1;

        if (data.getDay() === 0) {
            continue;
        }

        const valor = data.toISOString().split('T')[0];
        const label = data.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: 'long'
        });
        datas.push({ valor, label });
    }

    return datas;
}

function popularDatas() {
    const datas = gerarDatas();
    selectData.innerHTML = '';

    datas.forEach((item) => {
        const option = document.createElement('option');
        option.value = item.valor;
        option.textContent = item.label;
        selectData.appendChild(option);
    });
}

function horariosDisponiveis(dataEscolhida) {
    const ocupados = agendamentosSalvos
        .filter((agendamento) => agendamento.data === dataEscolhida)
        .map((agendamento) => agendamento.horario);

    return horariosPadrao.filter((horario) => !ocupados.includes(horario));
}

function popularHorarios() {
    const dataEscolhida = selectData.value;
    const horarios = horariosDisponiveis(dataEscolhida);
    const ocupados = agendamentosSalvos
        .filter((agendamento) => agendamento.data === dataEscolhida)
        .map((agendamento) => agendamento.horario);

    containerHorarios.innerHTML = '';
    inputHorario.value = '';

    const mensagemInicial = document.createElement('p');
    mensagemInicial.className = 'text-muted mb-0 w-100';
    mensagemInicial.textContent = 'Escolha um horário disponível:';
    containerHorarios.appendChild(mensagemInicial);

    if (horarios.length === 0 && ocupados.length === 0) {
        const aviso = document.createElement('p');
        aviso.className = 'text-muted mb-0 w-100';
        aviso.textContent = 'Nenhum horário disponível para esta data.';
        containerHorarios.appendChild(aviso);
        return;
    }

    horariosPadrao.forEach((horario) => {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'horario-btn';
        botao.textContent = `${horario}`;

        if (ocupados.includes(horario)) {
            botao.disabled = true;
            botao.textContent = `${horario} (ocupado)`;
        } else {
            botao.addEventListener('click', () => {
                document.querySelectorAll('.horario-btn').forEach((item) => item.classList.remove('ativo'));
                botao.classList.add('ativo');
                inputHorario.value = horario;
            });
        }

        containerHorarios.appendChild(botao);
    });
}

function mostrarAgendamentos() {
    listaAgendamentos.innerHTML = '';

    if (agendamentosSalvos.length === 0) {
        const item = document.createElement('li');
        item.className = 'list-group-item text-muted';
        item.textContent = 'Nenhum agendamento cadastrado ainda.';
        listaAgendamentos.appendChild(item);
        return;
    }

    agendamentosSalvos.forEach((agendamento) => {
        const item = document.createElement('li');
        item.className = 'list-group-item';
        item.innerHTML = `<strong>${agendamento.servico}</strong><br>${agendamento.nome}<br>${agendamento.data} às ${agendamento.horario}`;
        listaAgendamentos.appendChild(item);
    });
}

function mostrarMensagem(texto, tipo) {
    mensagem.className = `alert alert-${tipo} mt-3`;
    mensagem.textContent = texto;
    mensagem.classList.remove('d-none');
}

formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const dados = {
        id: `ag-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        nome: document.getElementById('nome').value.trim(),
        telefone: document.getElementById('telefone').value.trim(),
        servico: document.getElementById('servico').value,
        data: selectData.value,
        horario: inputHorario.value,
        observacoes: document.getElementById('observacoes').value.trim()
    };

    if (!dados.nome || !dados.telefone || !dados.servico || !dados.data || !dados.horario) {
        mostrarMensagem('Preencha todos os campos obrigatórios.', 'danger');
        return;
    }

    agendamentosSalvos.push(dados);
    salvarLocalmente();

    const salvoNoFirebase = await salvarNoFirebase(dados);
    const mensagemWhatsApp = `Olá! Tenho um novo agendamento:%0A%0ANome: ${encodeURIComponent(dados.nome)}%0ATelefone: ${encodeURIComponent(dados.telefone)}%0AServiço: ${encodeURIComponent(dados.servico)}%0AData: ${encodeURIComponent(dados.data)}%0AHorário: ${encodeURIComponent(dados.horario)}%0AObservações: ${encodeURIComponent(dados.observacoes || 'Nenhuma')}`;

    if (salvoNoFirebase) {
        mostrarMensagem('Agendamento confirmado e salvo no Firebase!', 'success');
    } else {
        mostrarMensagem('Agendamento salvo localmente. Configure o Firebase para sincronizar na nuvem.', 'warning');
    }

    window.open(`https://wa.me/5528999325487?text=${mensagemWhatsApp}`, '_blank', 'noopener,noreferrer');

    formulario.reset();
    popularHorarios();
    mostrarAgendamentos();
});

selectData.addEventListener('change', popularHorarios);
inicializarFirebase();
popularDatas();
popularHorarios();
mostrarAgendamentos();
