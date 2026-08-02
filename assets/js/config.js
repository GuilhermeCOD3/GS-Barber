(function () {
    const STORAGE_KEY = 'gsbarber-config';

    const DEFAULT_CONFIG = {
        activeBarbeiroId: 'default',
        barbeiros: [
            {
                id: 'default',
                nome: 'GS Barber',
                logoUrl: 'assets/img/icons/WhatsApp Image 2026-07-17 at 18.20.46.jpeg',
                telefone: '(28) 99932-5487',
                whatsapp: '5528999325487',
                horarioTexto: 'Segunda a sábado, das 9h às 19h',
                horarioInicio: '09:00',
                horarioFim: '19:00',
                duracaoMinutos: 45,
                descricao: 'Barbearia premium'
            }
        ]
    };

    function gerarId() {
        return `barbeiro-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    }

    function normalizarConfig(config) {
        const base = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
        const dados = config && typeof config === 'object' ? config : {};
        const barbeiros = Array.isArray(dados.barbeiros) && dados.barbeiros.length > 0
            ? dados.barbeiros.map((item) => ({
                ...item,
                id: item.id || gerarId(),
                nome: item.nome || base.barbeiros[0].nome,
                logoUrl: item.logoUrl || base.barbeiros[0].logoUrl,
                telefone: item.telefone || base.barbeiros[0].telefone,
                whatsapp: item.whatsapp || base.barbeiros[0].whatsapp,
                horarioTexto: item.horarioTexto || `${item.horarioInicio || base.barbeiros[0].horarioInicio} às ${item.horarioFim || base.barbeiros[0].horarioFim}`,
                horarioInicio: item.horarioInicio || base.barbeiros[0].horarioInicio,
                horarioFim: item.horarioFim || base.barbeiros[0].horarioFim,
                duracaoMinutos: Number(item.duracaoMinutos || base.barbeiros[0].duracaoMinutos || 45),
                descricao: item.descricao || base.barbeiros[0].descricao
            }))
            : base.barbeiros;

        const activeId = dados.activeBarbeiroId && barbeiros.some((item) => item.id === dados.activeBarbeiroId)
            ? dados.activeBarbeiroId
            : barbeiros[0]?.id || base.activeBarbeiroId;

        return { activeBarbeiroId: activeId, barbeiros };
    }

    function carregarConfig() {
        try {
            const salvo = localStorage.getItem(STORAGE_KEY);
            if (!salvo) {
                return salvarConfig(DEFAULT_CONFIG);
            }

            const parsed = JSON.parse(salvo);
            return salvarConfig(parsed);
        } catch (erro) {
            console.warn('Não foi possível carregar a configuração da barbearia:', erro);
            return salvarConfig(DEFAULT_CONFIG);
        }
    }

    function salvarConfig(config) {
        const normalized = normalizarConfig(config);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
        return normalized;
    }

    function getBarbeiroAtivo(config) {
        const normalized = normalizarConfig(config);
        return normalized.barbeiros.find((item) => item.id === normalized.activeBarbeiroId) || normalized.barbeiros[0];
    }

    function aplicarConfig(config) {
        const normalized = normalizarConfig(config);
        const barbeiro = getBarbeiroAtivo(normalized);

        const aplicarTexto = (selector, valor) => {
            const elemento = document.querySelector(selector);
            if (elemento) {
                elemento.textContent = valor;
            }
        };

        const aplicarAtributo = (selector, atributo, valor) => {
            const elemento = document.querySelector(selector);
            if (elemento) {
                elemento.setAttribute(atributo, valor);
            }
        };

        aplicarTexto('#nome-barbearia', barbeiro.nome);
        aplicarTexto('#nome-barbearia-home', barbeiro.nome);
        aplicarTexto('#telefone-principal', barbeiro.telefone);
        aplicarTexto('#telefone-contato', barbeiro.telefone);
        aplicarTexto('#horario-principal', barbeiro.horarioTexto);
        aplicarTexto('#horario-principal-home', barbeiro.horarioTexto);
        aplicarTexto('#descricao-barbearia', barbeiro.descricao || 'Barbearia premium');

        const logoElementos = document.querySelectorAll('[data-logo-barbearia]');
        logoElementos.forEach((elemento) => {
            elemento.setAttribute('src', barbeiro.logoUrl || DEFAULT_CONFIG.barbeiros[0].logoUrl);
            elemento.setAttribute('alt', `Logo ${barbeiro.nome}`);
        });

        const linksWhatsApp = document.querySelectorAll('[data-whatsapp-barbearia]');
        linksWhatsApp.forEach((elemento) => {
            elemento.setAttribute('href', `https://wa.me/${barbeiro.whatsapp || '5528999325487'}`);
        });

        const telefoneLink = document.querySelector('[data-telefone-barbearia]');
        if (telefoneLink) {
            telefoneLink.setAttribute('href', `tel:${barbeiro.telefone}`);
        }

        document.documentElement.style.setProperty('--barbeiro-accent', '#d4af37');

        return { config: normalized, barbeiro };
    }

    function alterarBarbeiroAtivo(id) {
        const config = carregarConfig();
        config.activeBarbeiroId = id;
        salvarConfig(config);
        return aplicarConfig(config);
    }

    window.gsBarberConfig = {
        STORAGE_KEY,
        DEFAULT_CONFIG,
        carregarConfig,
        salvarConfig,
        getBarbeiroAtivo,
        aplicarConfig,
        alterarBarbeiroAtivo,
        gerarId
    };

    document.addEventListener('DOMContentLoaded', () => {
        const config = carregarConfig();
        aplicarConfig(config);
    });
})();
