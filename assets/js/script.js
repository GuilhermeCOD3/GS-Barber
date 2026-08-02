// Arquivo principal para interações e carregamento de conteúdo da Home.
// O código foi separado para manter a lógica organizada e fácil de estudar.

document.addEventListener('DOMContentLoaded', () => {
    const containerServicos = document.getElementById('lista-servicos');

    if (!containerServicos) {
        return;
    }

    const servicosPadrao = [
        {
            nome: 'Corte',
            descricao: 'Cortes modernos, limpos e personalizados para o seu estilo.',
            icone: '✂️'
        },
        {
            nome: 'Barba',
            descricao: 'Modelagem e acabamento profissional para uma barba impecável.',
            icone: '🪒'
        },
        {
            nome: 'Corte + Barba',
            descricao: 'Combo completo com visual elegante e cuidado total.',
            icone: '💈'
        }
    ];

    function renderizarServicos(servicos) {
        containerServicos.innerHTML = '';

        servicos.forEach((servico) => {
            const coluna = document.createElement('div');
            coluna.className = 'col-md-6 col-lg-4';

            coluna.innerHTML = `
                <article class="service-card">
                    <div class="service-icon">${servico.icone}</div>
                    <div class="d-flex justify-content-between align-items-start gap-2">
                        <h3 class="h5 text-gold mb-0">${servico.nome}</h3>
                        <span class="service-badge">Popular</span>
                    </div>
                    <p class="text-muted mb-0 mt-3">${servico.descricao}</p>
                </article>
            `;

            containerServicos.appendChild(coluna);
        });
    }

    async function carregarServicos() {
        try {
            const resposta = await fetch('dados/servicos.json');

            if (!resposta.ok) {
                throw new Error('Falha ao carregar o arquivo JSON.');
            }

            const dados = await resposta.json();
            renderizarServicos(dados);
        } catch (erro) {
            console.warn('Não foi possível carregar o JSON. Usando os serviços padrão.', erro);
            renderizarServicos(servicosPadrao);
        }
    }

    carregarServicos();
});
