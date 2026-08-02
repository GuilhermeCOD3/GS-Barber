(function (root, factory) {
    const api = factory();

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }

    root.agendaUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function paraMinutos(horario) {
        if (!horario) return 0;
        const [horas, minutos] = String(horario).split(':').map(Number);
        return horas * 60 + minutos;
    }

    function paraHorario(minutos) {
        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;
        return `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }

    function gerarHorarios(inicio, fim, duracaoMinutos) {
        const inicioMinutos = paraMinutos(inicio);
        const fimMinutos = paraMinutos(fim);
        const duracao = Number(duracaoMinutos) || 45;
        const horarios = [];

        for (let atual = inicioMinutos; atual + duracao <= fimMinutos; atual += duracao) {
            horarios.push(paraHorario(atual));
        }

        return horarios;
    }

    function horarioEstaOcupado(slotHorario, duracaoMinutos, agendamento, dataEscolhida, barbeiroId) {
        if (!agendamento) return false;
        if (agendamento.data !== dataEscolhida) return false;
        if (agendamento.barbeiroId && barbeiroId && agendamento.barbeiroId !== barbeiroId) return false;

        const slotInicio = paraMinutos(slotHorario);
        const slotFim = slotInicio + Number(duracaoMinutos || 45);
        const agendamentoInicio = paraMinutos(agendamento.horario);
        const agendamentoFim = agendamentoInicio + Number(agendamento.duracaoMinutos || duracaoMinutos || 45);

        return slotInicio < agendamentoFim && slotFim > agendamentoInicio;
    }

    return {
        gerarHorarios,
        horarioEstaOcupado,
        paraMinutos,
        paraHorario
    };
});
