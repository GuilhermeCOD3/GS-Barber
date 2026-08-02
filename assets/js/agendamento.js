// Lógica do formulário de agendamento da GS Barber.
// A ideia é manter o fluxo simples, com persistência local e sincronização opcional ao Firebase.

const diasParaExibir = 14;
const duracaoPadrao = 45;
const permitirHorariosDuplicados = true;
let agendamentosSalvos = [];
let barbeirosDisponiveis = [];

const selectBarbeiro = document.getElementById('barbeiro');
const selectDuracao = document.getElementById('duracao');
const selectData = document.getElementById('data');
const inputHorario = document.getElementById('horario');
const containerHorarios = document.getElementById('horarios-container');
const listaAgendamentos = document.getElementById('lista-agendamentos');
const formulario = document.getElementById('form-agendamento');
const mensagem = document.getElementById('mensagem');
const resumoAgendamento = document.getElementById('resumo-agendamento');
const inputNome = document.getElementById('nome');
const inputTelefone = document.getElementById('telefone');
const selectServico = document.getElementById('servico');
const inputObservacoes = document.getElementById('observacoes');

let firestore = null;
let firebaseDisponivel = false;

function carregarAgendamentos() {
    try {
        const dadosSalvos = JSON.parse(localStorage.getItem('agendamentosGS') || '[]');
        agendamentosSalvos = Array.isArray(dadosSalvos) ? dadosSalvos : [];
    } catch (erro) {
        console.warn('Não foi possível carregar os agendamentos salvos:', erro);
        agendamentosSalvos = [];
    }
}

function carregarBarbeiros() {
    const config = window.gsBarberConfig?.carregarConfig();
    const barbeiros = config?.barbeiros || [];
    barbeirosDisponiveis = barbeiros;

    selectBarbeiro.innerHTML = '';
    barbeiros.forEach((barbeiro) => {
        const option = document.createElement('option');
        option.value = barbeiro.id;
        option.textContent = barbeiro.nome;
        selectBarbeiro.appendChild(option);
    });

    if (config?.activeBarbeiroId) {
        selectBarbeiro.value = config.activeBarbeiroId;
    }

    const barbeiroSelecionado = barbeiros.find((item) => item.id === selectBarbeiro.value) || barbeiros[0];
    if (barbeiroSelecionado?.duracaoMinutos) {
        selectDuracao.value = String(barbeiroSelecionado.duracaoMinutos);
    }
}

function salvarLocalmente() {
    localStorage.setItem('agendamentosGS', JSON.stringify(agendamentosSalvos));
}

function sincronizarAgendamentos() {
    carregarAgendamentos();
    carregarBarbeiros();
    popularDatas();
    popularHorarios();
    mostrarAgendamentos();
    atualizarResumoAgendamento();
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

function formatarDataLocal(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
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

        const valor = formatarDataLocal(data);
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

    if (selectData.options.length > 0) {
        selectData.value = selectData.options[0].value;
    }
}

function gerarHorariosPadrao(duracao, horarioInicio = '09:00', horarioFim = '19:00') {
    if (window.agendaUtils?.gerarHorarios) {
        return window.agendaUtils.gerarHorarios(horarioInicio, horarioFim, duracao);
    }

    const horarios = [];
    const passo = Number(duracao) || 45;
    const inicioMinutos = (Number(horarioInicio.split(':')[0]) * 60) + Number(horarioInicio.split(':')[1] || 0);
    const fimMinutos = (Number(horarioFim.split(':')[0]) * 60) + Number(horarioFim.split(':')[1] || 0);
    let atual = inicioMinutos;

    while (atual + passo <= fimMinutos) {
        const horas = Math.floor(atual / 60);
        const minutos = atual % 60;
        horarios.push(`${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`);
        atual += passo;
    }

    return horarios;
}

function horariosDisponiveis(dataEscolhida, barbeiroId, duracao) {
    const config = window.gsBarberConfig?.carregarConfig();
    const barbeiroSelecionado = (config?.barbeiros || []).find((item) => item.id === barbeiroId) || (config?.barbeiros || [])[0];
    const horarios = gerarHorariosPadrao(duracao, barbeiroSelecionado?.horarioInicio || '09:00', barbeiroSelecionado?.horarioFim || '19:00');
    const agendamentosDoBarbeiro = agendamentosSalvos.filter((agendamento) => agendamento.data === dataEscolhida && (!agendamento.barbeiroId || agendamento.barbeiroId === barbeiroId));

    return horarios.filter((horario) => {
        return !agendamentosDoBarbeiro.some((agendamento) => window.agendaUtils?.horarioEstaOcupado
            ? window.agendaUtils.horarioEstaOcupado(horario, duracao, agendamento, dataEscolhida, barbeiroId)
            : agendamento.horario === horario);
    });
}

function popularHorarios() {
    const dataEscolhida = selectData.value;
    const barbeiroId = selectBarbeiro.value;
    const barbeiroSelecionado = barbeirosDisponiveis.find((item) => item.id === barbeiroId) || barbeirosDisponiveis[0];
    const duracao = Number(selectDuracao.value || barbeiroSelecionado?.duracaoMinutos || 45);
    const horarios = horariosDisponiveis(dataEscolhida, barbeiroId, duracao);
    const ocupados = agendamentosSalvos
        .filter((agendamento) => agendamento.data === dataEscolhida && (!agendamento.barbeiroId || agendamento.barbeiroId === barbeiroId))
        .map((agendamento) => agendamento.horario);

    containerHorarios.innerHTML = '';
    inputHorario.value = '';

    const mensagemInicial = document.createElement('p');
    mensagemInicial.className = 'text-muted mb-0 w-100';
    mensagemInicial.textContent = permitirHorariosDuplicados
        ? 'Escolha o horário desejado:'
        : 'Escolha um horário disponível:';
    containerHorarios.appendChild(mensagemInicial);

    if (horarios.length === 0 && ocupados.length === 0) {
        const aviso = document.createElement('p');
        aviso.className = 'text-muted mb-0 w-100';
        aviso.textContent = 'Nenhum horário disponível para esta data.';
        containerHorarios.appendChild(aviso);
        return;
    }

    horarios.forEach((horario) => {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'horario-btn';
        botao.textContent = `${horario}`;

        const jaOcupado = ocupados.includes(horario);

        if (jaOcupado) {
            botao.classList.add('ocupado');
            botao.textContent = `${horario} (ocupado)`;
        }

        botao.addEventListener('click', () => {
            document.querySelectorAll('.horario-btn').forEach((item) => item.classList.remove('ativo'));
            botao.classList.add('ativo');
            inputHorario.value = horario;
            atualizarResumoAgendamento();
        });

        containerHorarios.appendChild(botao);
    });

    atualizarResumoAgendamento();
}

function formatarDataParaResumo(data) {
    if (!data) return 'Escolha uma data';
    const [ano, mes, dia] = data.split('-').map(Number);
    const dataObj = new Date(ano, mes - 1, dia);
    return dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function atualizarResumoAgendamento() {
    const nome = inputNome.value.trim() || 'Seu nome';
    const servico = selectServico.value || 'Aguardando seleção';
    const data = formatarDataParaResumo(selectData.value);
    const horario = inputHorario.value || 'Selecione um horário';
    const barbeiro = barbeirosDisponiveis.find((item) => item.id === selectBarbeiro.value) || barbeirosDisponiveis[0];

    resumoAgendamento.innerHTML = `
        <div class="summary-item"><span>Nome</span><strong>${nome}</strong></div>
        <div class="summary-item"><span>Serviço</span><strong>${servico}</strong></div>
        <div class="summary-item"><span>Barbeiro</span><strong>${barbeiro?.nome || 'Não informado'}</strong></div>
        <div class="summary-item"><span>Data</span><strong>${data}</strong></div>
        <div class="summary-item"><span>Horário</span><strong>${horario}</strong></div>
    `;
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

[inputNome, inputTelefone, selectServico, inputObservacoes].forEach((campo) => {
    campo.addEventListener('input', atualizarResumoAgendamento);
    campo.addEventListener('change', atualizarResumoAgendamento);
});

formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const barbeiroSelecionado = barbeirosDisponiveis.find((item) => item.id === selectBarbeiro.value) || barbeirosDisponiveis[0];
    const duracaoSelecionada = Number(selectDuracao.value) || 45;
    const dados = {
        id: `ag-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        nome: inputNome.value.trim(),
        telefone: inputTelefone.value.trim(),
        servico: selectServico.value,
        data: selectData.value,
        horario: inputHorario.value,
        duracaoMinutos: duracaoSelecionada,
        barbeiroId: barbeiroSelecionado?.id || '',
        barbeiroNome: barbeiroSelecionado?.nome || '',
        observacoes: inputObservacoes.value.trim()
    };

    if (!dados.nome || !dados.telefone || !dados.servico || !dados.data || !dados.horario) {
        mostrarMensagem('Preencha todos os campos obrigatórios.', 'danger');
        return;
    }

    carregarAgendamentos();
    agendamentosSalvos.push(dados);
    salvarLocalmente();

    const salvoNoFirebase = await salvarNoFirebase(dados);
    const mensagemWhatsApp = `Olá! Tenho um novo agendamento:%0A%0ANome: ${encodeURIComponent(dados.nome)}%0ATelefone: ${encodeURIComponent(dados.telefone)}%0AServiço: ${encodeURIComponent(dados.servico)}%0ABarbeiro: ${encodeURIComponent(dados.barbeiroNome || 'Não informado')}%0AData: ${encodeURIComponent(dados.data)}%0AHorário: ${encodeURIComponent(dados.horario)}%0AObservações: ${encodeURIComponent(dados.observacoes || 'Nenhuma')}`;

    if (salvoNoFirebase) {
        mostrarMensagem('Agendamento confirmado e salvo no Firebase!', 'success');
    } else {
        mostrarMensagem('Agendamento salvo localmente. Configure o Firebase para sincronizar na nuvem.', 'warning');
    }

    window.open(`https://wa.me/5528999325487?text=${mensagemWhatsApp}`, '_blank', 'noopener,noreferrer');

    formulario.reset();
    inputHorario.value = '';
    atualizarResumoAgendamento();
    carregarAgendamentos();
    popularHorarios();
    mostrarAgendamentos();
});

selectBarbeiro.addEventListener('change', () => {
    const barbeiroSelecionado = barbeirosDisponiveis.find((item) => item.id === selectBarbeiro.value) || barbeirosDisponiveis[0];
    if (barbeiroSelecionado?.duracaoMinutos) {
        selectDuracao.value = String(barbeiroSelecionado.duracaoMinutos);
    }
    popularHorarios();
    atualizarResumoAgendamento();
});
selectDuracao.addEventListener('change', () => {
    popularHorarios();
    atualizarResumoAgendamento();
});
selectData.addEventListener('change', () => {
    popularHorarios();
    atualizarResumoAgendamento();
});
window.addEventListener('storage', (evento) => {
    if (evento.key === 'agendamentosGS') {
        sincronizarAgendamentos();
    }
});
window.addEventListener('focus', () => {
    sincronizarAgendamentos();
});
inicializarFirebase();
carregarAgendamentos();
carregarBarbeiros();
popularDatas();
popularHorarios();
mostrarAgendamentos();
atualizarResumoAgendamento();
