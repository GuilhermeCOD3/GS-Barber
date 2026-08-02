// Painel do barbeiro com login simples, sessão, agenda visual e edição de agendamentos.
const formularioLogin = document.getElementById('form-login');
const mensagemLogin = document.getElementById('mensagem-login');
const areaPainel = document.getElementById('area-painel');
const listaPainel = document.getElementById('lista-painel');
const agendaPainel = document.getElementById('agenda-painel');
const labelSemanaAtual = document.getElementById('label-semana-atual');
const botaoConfiguracoes = document.getElementById('botao-configuracoes');
const modalConfiguracoes = document.getElementById('modal-configuracoes');
const botaoFecharConfiguracoes = document.getElementById('botao-fechar-configuracoes');
const botaoCancelarConfiguracoes = document.getElementById('botao-cancelar-configuracoes');
const formularioConfiguracoes = document.getElementById('form-configuracoes');
const inputConfigNome = document.getElementById('config-nome');
const inputConfigLogo = document.getElementById('config-logo');
const inputConfigTelefone = document.getElementById('config-telefone');
const inputConfigWhatsapp = document.getElementById('config-whatsapp');
const inputConfigHorario = document.getElementById('config-horario');
const selectConfigDuracao = document.getElementById('config-duracao');
const inputConfigDescricao = document.getElementById('config-descricao');
const inputConfigHorarioInicio = document.getElementById('config-horario-inicio');
const inputConfigHorarioFim = document.getElementById('config-horario-fim');
const inputConfigHorarioIntervalo = document.getElementById('config-horario-intervalo');
const inputNovoBarbeiro = document.getElementById('config-novo-barbeiro');
const inputUsuarioBarbeiro = document.getElementById('config-usuario-barbeiro');
const inputSenhaBarbeiro = document.getElementById('config-senha-barbeiro');
const botaoAdicionarBarbeiro = document.getElementById('botao-adicionar-barbeiro');
const listaBarbeiros = document.getElementById('lista-barbeiros');
const listaHorarios = document.getElementById('lista-horarios');
const botaoSemanaAnterior = document.getElementById('botao-semana-anterior');
const botaoHoje = document.getElementById('botao-hoje');
const botaoSemanaSeguinte = document.getElementById('botao-semana-seguinte');
const botaoSair = document.getElementById('botao-sair');
const modalEditar = document.getElementById('modal-editar');
const botaoFecharModal = document.getElementById('botao-fechar-modal');
const botaoCancelarEdicao = document.getElementById('botao-cancelar-edicao');
const formularioEditar = document.getElementById('form-editar-agendamento');
const inputEditarId = document.getElementById('editar-id');
const inputEditarNome = document.getElementById('editar-nome');
const inputEditarTelefone = document.getElementById('editar-telefone');
const selectEditarServico = document.getElementById('editar-servico');
const inputEditarData = document.getElementById('editar-data');
const inputEditarHorario = document.getElementById('editar-horario');
const textareaEditarObservacoes = document.getElementById('editar-observacoes');

const usuarioPadrao = 'barbeiro';
const senhaPadrao = '123456';
let usuariosBarbeiros = {};
let barbeirosAtivos = [];

let firestore = null;
let firebaseDisponivel = false;
let offsetSemanas = 0;
let agendamentosAtuais = [];

function mostrarMensagem(texto, tipo) {
    mensagemLogin.className = `alert alert-${tipo}`;
    mensagemLogin.textContent = texto;
    mensagemLogin.classList.remove('d-none');
}

function carregarUsuariosBarbeiros() {
    try {
        const salvos = JSON.parse(localStorage.getItem('gsbarber-usuarios') || '{}');
        usuariosBarbeiros = salvos && typeof salvos === 'object' ? salvos : {};
    } catch (erro) {
        console.warn('Não foi possível carregar os usuários de barbeiros:', erro);
        usuariosBarbeiros = {};
    }
}

function salvarUsuariosBarbeiros() {
    localStorage.setItem('gsbarber-usuarios', JSON.stringify(usuariosBarbeiros));
}

function carregarBarbeirosConfig() {
    const config = window.gsBarberConfig?.carregarConfig();
    barbeirosAtivos = Array.isArray(config?.barbeiros) ? config.barbeiros : [];
    return barbeirosAtivos;
}

function salvarBarbeirosConfig(novaLista) {
    const config = window.gsBarberConfig?.carregarConfig();
    const novaConfig = { ...config, barbeiros: novaLista };
    window.gsBarberConfig?.salvarConfig(novaConfig);
    window.gsBarberConfig?.aplicarConfig(novaConfig);
    return novaConfig;
}

function renderizarListaBarbeiros() {
    const barbeiros = carregarBarbeirosConfig();
    listaBarbeiros.innerHTML = '';

    if (!barbeiros.length) {
        listaBarbeiros.innerHTML = '<div class="text-muted small">Nenhum barbeiro cadastrado.</div>';
        return;
    }

    barbeiros.forEach((barbeiro) => {
        const item = document.createElement('div');
        item.className = 'd-flex justify-content-between align-items-center gap-2 p-2 rounded border border-gold';
        item.innerHTML = `
            <div>
                <strong>${escaparHTML(barbeiro.nome)}</strong><br>
                <small class="text-muted">${escaparHTML(barbeiro.usuario || 'Sem login')}</small>
            </div>
            <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline-gold" data-acao="ativar-barbeiro" data-id="${escaparHTML(barbeiro.id)}">Ativar</button>
                <button class="btn btn-sm btn-remover" data-acao="remover-barbeiro" data-id="${escaparHTML(barbeiro.id)}">Remover</button>
            </div>
        `;
        listaBarbeiros.appendChild(item);
    });
}

function obterHorariosAgenda(config = window.gsBarberConfig?.carregarConfig()) {
    const barbeiro = window.gsBarberConfig?.getBarbeiroAtivo(config);
    if (window.agendaUtils?.gerarHorarios) {
        return window.agendaUtils.gerarHorarios(barbeiro?.horarioInicio || '09:00', barbeiro?.horarioFim || '19:00', barbeiro?.duracaoMinutos || 45);
    }

    const horarios = [];
    const duracao = Number(barbeiro?.duracaoMinutos || 45);
    const inicioMinutos = (Number((barbeiro?.horarioInicio || '09:00').split(':')[0]) * 60) + Number((barbeiro?.horarioInicio || '09:00').split(':')[1] || 0);
    const fimMinutos = (Number((barbeiro?.horarioFim || '19:00').split(':')[0]) * 60) + Number((barbeiro?.horarioFim || '19:00').split(':')[1] || 0);

    for (let atual = inicioMinutos; atual + duracao <= fimMinutos; atual += duracao) {
        const horas = Math.floor(atual / 60);
        const minutos = atual % 60;
        horarios.push(`${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`);
    }

    return horarios;
}

function renderizarListaHorarios() {
    const config = window.gsBarberConfig?.carregarConfig();
    const barbeiro = window.gsBarberConfig?.getBarbeiroAtivo(config);
    const horariosTexto = `${barbeiro?.horarioInicio || '09:00'} às ${barbeiro?.horarioFim || '19:00'} • ${barbeiro?.duracaoMinutos || 45} min`;
    const horarios = obterHorariosAgenda(config);
    listaHorarios.innerHTML = `
        <div class="border rounded p-2">
            <strong>Horário atual</strong><br>
            <span class="text-muted">${escaparHTML(horariosTexto)}</span>
        </div>
        <div class="border rounded p-2 mt-2">
            <strong>Slots disponíveis</strong><br>
            <span class="text-muted">${escaparHTML(horarios.join(', '))}</span>
        </div>
    `;
}

function escaparHTML(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizarAgendamentos(agendamentos) {
    return (agendamentos || []).map((item, indice) => ({
        ...item,
        id: item.id || `ag-${Date.now()}-${indice}`
    }));
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
    const agendamentosLocais = normalizarAgendamentos(JSON.parse(localStorage.getItem('agendamentosGS') || '[]'));

    if (firebaseDisponivel && firestore) {
        try {
            const snapshot = await firestore.collection('agendamentos').orderBy('criadoEm', 'asc').get();
            const agendamentosRemotos = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));

            const todos = [...agendamentosLocais];
            agendamentosRemotos.forEach((item) => {
                if (!todos.some((local) => local.id === item.id)) {
                    todos.push(item);
                }
            });

            salvarLocalmente(todos);
            renderizarAgendamentos(todos);
            return;
        } catch (erro) {
            console.warn('Não foi possível carregar do Firebase:', erro);
        }
    }

    renderizarAgendamentos(agendamentosLocais);
}

function formatarData(data) {
    if (!data) return 'Data não informada';

    const [ano, mes, dia] = data.split('-').map(Number);
    const dataObj = new Date(ano, mes - 1, dia);

    return dataObj.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
}

function ordenarAgendamentos(agendamentos) {
    return [...agendamentos].sort((a, b) => {
        const ordemData = (a.data || '').localeCompare(b.data || '');
        if (ordemData !== 0) return ordemData;
        return (a.horario || '').localeCompare(b.horario || '');
    });
}

function formatarDataISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function calcularInicioSemana(data) {
    const copia = new Date(data);
    const diaDaSemana = copia.getDay();
    const diferenca = diaDaSemana === 0 ? -6 : 1 - diaDaSemana;
    copia.setDate(copia.getDate() + diferenca);
    copia.setHours(0, 0, 0, 0);
    return copia;
}

function gerarDiasAgenda(quantidade = 7, deslocamentoSemanas = 0) {
    const dias = [];
    const inicioSemana = calcularInicioSemana(new Date());
    inicioSemana.setDate(inicioSemana.getDate() + (deslocamentoSemanas * 7));

    for (let indice = 0; indice < quantidade; indice += 1) {
        const data = new Date(inicioSemana);
        data.setDate(inicioSemana.getDate() + indice);

        const valor = formatarDataISO(data);
        const label = data.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });
        dias.push({ valor, label });
    }

    return dias;
}

function atualizarLabelSemana() {
    const inicioSemana = calcularInicioSemana(new Date());
    inicioSemana.setDate(inicioSemana.getDate() + (offsetSemanas * 7));

    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 6);

    labelSemanaAtual.textContent = `Semana de ${inicioSemana.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} até ${fimSemana.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`;
}

function renderizarAgenda(agendamentos) {
    agendaPainel.innerHTML = '';

    if (agendamentos.length === 0) {
        agendaPainel.innerHTML = '<div class="text-muted">Nenhum agendamento cadastrado ainda.</div>';
        return;
    }

    const dias = gerarDiasAgenda(7, offsetSemanas);
    const horarios = obterHorariosAgenda();
    atualizarLabelSemana();
    const grid = document.createElement('div');
    grid.className = 'agenda-grid';

    dias.forEach((dia) => {
        const coluna = document.createElement('div');
        coluna.className = 'agenda-day';
        coluna.innerHTML = `<div class="agenda-day-title">${escaparHTML(dia.label)}</div>`;

        horarios.forEach((horario) => {
            const agendamentoDoHorario = agendamentos.find((item) => item.data === dia.valor && item.horario === horario);
            const slot = document.createElement('button');
            slot.type = 'button';
            slot.className = 'agenda-slot';

            if (agendamentoDoHorario) {
                slot.classList.add('ocupado');
                slot.innerHTML = `<span class="agenda-slot-hora">${escaparHTML(horario)}</span><span class="agenda-slot-nome">${escaparHTML(agendamentoDoHorario.nome)}</span>`;
                slot.dataset.id = agendamentoDoHorario.id;
            } else {
                slot.innerHTML = `<span class="agenda-slot-hora">${escaparHTML(horario)}</span><span class="agenda-slot-vazio">Livre</span>`;
            }

            slot.addEventListener('click', () => {
                if (agendamentoDoHorario) {
                    abrirModalEditar(agendamentoDoHorario);
                }
            });

            coluna.appendChild(slot);
        });

        grid.appendChild(coluna);
    });

    agendaPainel.appendChild(grid);
}

function renderizarAgendamentos(agendamentos) {
    agendamentosAtuais = agendamentos;
    const agendamentosOrdenados = ordenarAgendamentos(agendamentos);
    listaPainel.innerHTML = '';
    renderizarAgenda(agendamentosOrdenados);

    if (agendamentosOrdenados.length === 0) {
        listaPainel.innerHTML = '<div class="list-group-item text-muted">Nenhum agendamento encontrado.</div>';
        return;
    }

    agendamentosOrdenados.forEach((agendamento) => {
        const item = document.createElement('div');
        item.className = 'list-group-item';
        item.innerHTML = `
            <div class="d-flex justify-content-between gap-3 flex-wrap align-items-start">
                <div>
                    <strong>${escaparHTML(agendamento.nome)}</strong><br>
                    <span class="text-muted">${escaparHTML(agendamento.servico)}</span><br>
                    <span class="text-muted">${escaparHTML(agendamento.barbeiroNome || 'Barbeiro não informado')}</span><br>
                    <span class="text-muted">${escaparHTML(formatarData(agendamento.data))}</span><br>
                    <span class="text-muted">${escaparHTML(agendamento.horario)}</span><br>
                    <span class="text-muted">${escaparHTML(agendamento.telefone)}</span>
                </div>
                <div class="text-end">
                    <span class="badge bg-gold text-dark mb-2">${escaparHTML(agendamento.horario)}</span><br>
                    <button class="btn btn-sm btn-editar me-2" data-acao="editar" data-id="${escaparHTML(agendamento.id || '')}">Editar</button>
                    <button class="btn btn-sm btn-remover" data-acao="remover" data-id="${escaparHTML(agendamento.id || '')}">Remover</button>
                </div>
            </div>
        `;
        listaPainel.appendChild(item);
    });
}

function abrirModalEditar(agendamento) {
    inputEditarId.value = agendamento.id || '';
    inputEditarNome.value = agendamento.nome || '';
    inputEditarTelefone.value = agendamento.telefone || '';
    selectEditarServico.value = agendamento.servico || 'Corte';
    inputEditarData.value = agendamento.data || '';
    inputEditarHorario.value = agendamento.horario || '';
    textareaEditarObservacoes.value = agendamento.observacoes || '';
    modalEditar.classList.remove('d-none');
}

function fecharModalEditar() {
    modalEditar.classList.add('d-none');
    formularioEditar.reset();
}

function entrarNoPainel() {
    areaPainel.classList.remove('d-none');
    sessionStorage.setItem('gsbarber-auth', 'true');
    offsetSemanas = 0;
    mostrarMensagem('Login realizado com sucesso.', 'success');
    carregarAgendamentos();
    renderizarListaBarbeiros();
    renderizarListaHorarios();
}

function verificarSessao() {
    if (sessionStorage.getItem('gsbarber-auth') === 'true') {
        entrarNoPainel();
    }
}

function sairDoPainel() {
    areaPainel.classList.add('d-none');
    sessionStorage.removeItem('gsbarber-auth');
    formularioLogin.reset();
    mensagemLogin.className = 'alert d-none';
    mensagemLogin.textContent = '';
    fecharModalEditar();
    fecharModalConfiguracoes();
}

function abrirModalConfiguracoes() {
    const config = window.gsBarberConfig?.carregarConfig();
    const barbeiro = window.gsBarberConfig?.getBarbeiroAtivo(config);

    inputConfigNome.value = barbeiro?.nome || '';
    inputConfigLogo.value = barbeiro?.logoUrl || '';
    inputConfigTelefone.value = barbeiro?.telefone || '';
    inputConfigWhatsapp.value = barbeiro?.whatsapp || '';
    inputConfigHorario.value = barbeiro?.horarioTexto || '';
    selectConfigDuracao.value = String(barbeiro?.duracaoMinutos || 45);
    inputConfigDescricao.value = barbeiro?.descricao || '';
    inputConfigHorarioInicio.value = barbeiro?.horarioInicio || '09:00';
    inputConfigHorarioFim.value = barbeiro?.horarioFim || '19:00';
    inputConfigHorarioIntervalo.value = barbeiro?.duracaoMinutos || 45;

    modalConfiguracoes.classList.remove('d-none');
}

function fecharModalConfiguracoes() {
    modalConfiguracoes.classList.add('d-none');
    formularioConfiguracoes.reset();
}

async function atualizarAgendamentoNoFirebase(agendamento) {
    if (!firebaseDisponivel || !firestore || !agendamento.id) {
        return false;
    }

    try {
        await firestore.collection('agendamentos').doc(agendamento.id).set(agendamento, { merge: true });
        return true;
    } catch (erro) {
        console.warn('Erro ao atualizar no Firebase:', erro);
        return false;
    }
}

async function removerAgendamento(id) {
    const agendamentos = normalizarAgendamentos(JSON.parse(localStorage.getItem('agendamentosGS') || '[]'));
    const agendamentoRemovido = agendamentos.find((item) => item.id === id);
    const agendamentosAtualizados = agendamentos.filter((item) => item.id !== id);
    salvarLocalmente(agendamentosAtualizados);

    if (firebaseDisponivel && firestore && agendamentoRemovido?.id) {
        try {
            await firestore.collection('agendamentos').doc(agendamentoRemovido.id).delete();
        } catch (erro) {
            console.warn('Erro ao remover no Firebase:', erro);
        }
    }

    carregarAgendamentos();
}

async function salvarEdicao(agendamentoAtualizado) {
    const agendamentos = normalizarAgendamentos(JSON.parse(localStorage.getItem('agendamentosGS') || '[]'));
    const indice = agendamentos.findIndex((item) => item.id === agendamentoAtualizado.id);

    if (indice !== -1) {
        agendamentos[indice] = { ...agendamentos[indice], ...agendamentoAtualizado };
        salvarLocalmente(agendamentos);
    }

    const salvoNoFirebase = await atualizarAgendamentoNoFirebase(agendamentoAtualizado);
    carregarAgendamentos();
    fecharModalEditar();

    if (salvoNoFirebase) {
        mostrarMensagem('Agendamento atualizado com sucesso.', 'success');
    } else {
        mostrarMensagem('Agendamento atualizado localmente.', 'warning');
    }
}

function navegarSemana(deslocamento) {
    offsetSemanas += deslocamento;
    if (agendamentosAtuais.length > 0) {
        renderizarAgenda(ordenarAgendamentos(agendamentosAtuais));
    } else {
        atualizarLabelSemana();
    }
}

formularioLogin.addEventListener('submit', (evento) => {
    evento.preventDefault();

    const usuario = document.getElementById('usuario').value.trim();
    const senha = document.getElementById('senha').value.trim();
    carregarUsuariosBarbeiros();

    if (usuario === usuarioPadrao && senha === senhaPadrao) {
        entrarNoPainel();
        return;
    }

    const usuarioBarbeiro = Object.entries(usuariosBarbeiros).find(([, dados]) => dados.usuario === usuario && dados.senha === senha);
    if (usuarioBarbeiro) {
        entrarNoPainel();
        return;
    }

    mostrarMensagem('Usuário ou senha incorretos.', 'danger');
});

botaoConfiguracoes.addEventListener('click', abrirModalConfiguracoes);
botaoFecharConfiguracoes.addEventListener('click', fecharModalConfiguracoes);
botaoCancelarConfiguracoes.addEventListener('click', fecharModalConfiguracoes);
botaoAdicionarBarbeiro.addEventListener('click', () => {
    const nome = inputNovoBarbeiro.value.trim();
    const usuario = inputUsuarioBarbeiro.value.trim();
    const senha = inputSenhaBarbeiro.value.trim();

    if (!nome || !usuario || !senha) {
        mostrarMensagem('Preencha nome, usuário e senha do barbeiro.', 'warning');
        return;
    }

    const configAtual = window.gsBarberConfig?.carregarConfig();
    const novoBarbeiro = {
        id: window.gsBarberConfig?.gerarId?.() || `barbeiro-${Date.now()}`,
        nome,
        usuario,
        senha,
        logoUrl: configAtual?.barbeiros?.[0]?.logoUrl || 'assets/img/icons/WhatsApp Image 2026-07-17 at 18.20.46.jpeg',
        telefone: configAtual?.barbeiros?.[0]?.telefone || '(28) 99932-5487',
        whatsapp: configAtual?.barbeiros?.[0]?.whatsapp || '5528999325487',
        horarioTexto: configAtual?.barbeiros?.[0]?.horarioTexto || 'Segunda a sábado, das 9h às 19h',
        horarioInicio: configAtual?.barbeiros?.[0]?.horarioInicio || '09:00',
        horarioFim: configAtual?.barbeiros?.[0]?.horarioFim || '19:00',
        duracaoMinutos: configAtual?.barbeiros?.[0]?.duracaoMinutos || 45,
        descricao: configAtual?.barbeiros?.[0]?.descricao || 'Barbearia premium'
    };

    const listaAtual = Array.isArray(configAtual?.barbeiros) ? configAtual.barbeiros : [];
    const novaConfig = {
        ...configAtual,
        activeBarbeiroId: novoBarbeiro.id,
        barbeiros: [...listaAtual, novoBarbeiro]
    };

    usuariosBarbeiros[novoBarbeiro.id] = { usuario, senha };
    salvarUsuariosBarbeiros();
    window.gsBarberConfig?.salvarConfig(novaConfig);
    window.gsBarberConfig?.aplicarConfig(novaConfig);
    inputNovoBarbeiro.value = '';
    inputUsuarioBarbeiro.value = '';
    inputSenhaBarbeiro.value = '';
    mostrarMensagem(`Barbeiro ${nome} adicionado.`, 'success');
    abrirModalConfiguracoes();
    renderizarListaBarbeiros();
    renderizarListaHorarios();
});

formularioConfiguracoes.addEventListener('submit', (evento) => {
    evento.preventDefault();

    const configAtual = window.gsBarberConfig?.carregarConfig();
    const barbeiroAtivo = window.gsBarberConfig?.getBarbeiroAtivo(configAtual);

    const dadosAtualizados = {
        ...barbeiroAtivo,
        nome: inputConfigNome.value.trim(),
        logoUrl: inputConfigLogo.value.trim(),
        telefone: inputConfigTelefone.value.trim(),
        whatsapp: inputConfigWhatsapp.value.trim(),
        horarioTexto: inputConfigHorario.value.trim(),
        horarioInicio: inputConfigHorarioInicio.value || '09:00',
        horarioFim: inputConfigHorarioFim.value || '19:00',
        duracaoMinutos: Number(inputConfigHorarioIntervalo.value || selectConfigDuracao.value || 45),
        descricao: inputConfigDescricao.value.trim()
    };

    const novaConfig = {
        ...configAtual,
        barbeiros: configAtual.barbeiros.map((item) => item.id === barbeiroAtivo.id ? dadosAtualizados : item)
    };

    window.gsBarberConfig?.salvarConfig(novaConfig);
    window.gsBarberConfig?.aplicarConfig(novaConfig);
    mostrarMensagem('Configuração salva.', 'success');
    fecharModalConfiguracoes();
    renderizarListaHorarios();
});

botaoSemanaAnterior.addEventListener('click', () => navegarSemana(-1));
botaoHoje.addEventListener('click', () => {
    offsetSemanas = 0;
    if (agendamentosAtuais.length > 0) {
        renderizarAgenda(ordenarAgendamentos(agendamentosAtuais));
    } else {
        atualizarLabelSemana();
    }
});
botaoSemanaSeguinte.addEventListener('click', () => navegarSemana(1));
botaoSair.addEventListener('click', sairDoPainel);
botaoFecharModal.addEventListener('click', fecharModalEditar);
botaoCancelarEdicao.addEventListener('click', fecharModalEditar);

formularioEditar.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const id = inputEditarId.value.trim();
    const dadosAtualizados = {
        id,
        nome: inputEditarNome.value.trim(),
        telefone: inputEditarTelefone.value.trim(),
        servico: selectEditarServico.value,
        data: inputEditarData.value,
        horario: inputEditarHorario.value,
        observacoes: textareaEditarObservacoes.value.trim()
    };

    if (!dadosAtualizados.id || !dadosAtualizados.nome || !dadosAtualizados.telefone || !dadosAtualizados.data || !dadosAtualizados.horario) {
        mostrarMensagem('Preencha os campos obrigatórios para salvar.', 'danger');
        return;
    }

    await salvarEdicao(dadosAtualizados);
});

listaPainel.addEventListener('click', async (evento) => {
    const botao = evento.target.closest('button');
    if (!botao) return;

    const id = botao.dataset.id;
    if (botao.dataset.acao === 'remover') {
        await removerAgendamento(id);
    }

    if (botao.dataset.acao === 'editar') {
        const agendamentos = normalizarAgendamentos(JSON.parse(localStorage.getItem('agendamentosGS') || '[]'));
        const agendamento = agendamentos.find((item) => item.id === id);
        if (agendamento) {
            abrirModalEditar(agendamento);
        }
    }
});

listaBarbeiros.addEventListener('click', (evento) => {
    const botao = evento.target.closest('button');
    if (!botao) return;

    const id = botao.dataset.id;
    const configAtual = window.gsBarberConfig?.carregarConfig();

    if (botao.dataset.acao === 'ativar-barbeiro') {
        window.gsBarberConfig?.alterarBarbeiroAtivo(id);
        mostrarMensagem('Barbeiro ativo atualizado.', 'success');
        renderizarListaBarbeiros();
        renderizarListaHorarios();
        return;
    }

    if (botao.dataset.acao === 'remover-barbeiro' && id) {
        const barbeiros = Array.isArray(configAtual?.barbeiros) ? configAtual.barbeiros : [];
        const filtrados = barbeiros.filter((item) => item.id !== id);

        if (filtrados.length === 0) {
            mostrarMensagem('É preciso manter pelo menos um barbeiro.', 'warning');
            return;
        }

        const novaConfig = {
            ...configAtual,
            activeBarbeiroId: filtrados[0].id,
            barbeiros: filtrados
        };

        delete usuariosBarbeiros[id];
        salvarUsuariosBarbeiros();
        window.gsBarberConfig?.salvarConfig(novaConfig);
        window.gsBarberConfig?.aplicarConfig(novaConfig);
        mostrarMensagem('Barbeiro removido.', 'success');
        renderizarListaBarbeiros();
        renderizarListaHorarios();
    }
});

modalEditar.addEventListener('click', (evento) => {
    if (evento.target === modalEditar) {
        fecharModalEditar();
    }
});

modalConfiguracoes.addEventListener('click', (evento) => {
    if (evento.target === modalConfiguracoes) {
        fecharModalConfiguracoes();
    }
});

inicializarFirebase();

if (sessionStorage.getItem('gsbarber-auth') === 'true') {
    entrarNoPainel();
}
