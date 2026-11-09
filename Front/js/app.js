(() => {
    'use strict';

    // ---------- Configuração ----------
    // Se o front for aberto pelo próprio servidor (http://localhost:5000) usa caminho relativo;
    // se for aberto por Live Server / arquivo, aponta para o back-end local.
    const API = (location.protocol.startsWith('http') && location.port === '5000')
        ? '/api'
        : 'http://localhost:5000/api';

    const CHAVE_SESSAO = 'conectasaude.sessao';

    // O front usa "aacd"/"fablab"; o banco usa "cliente"/"fornecedor"
    const PERFIL_PARA_API = { aacd: 'cliente', fablab: 'fornecedor' };
    const HOME_DO_PERFIL = {
        cliente: 'html/aacd.html',
        fornecedor: 'html/fablab.html',
        admin: 'html/aacd.html'
    };
    const PAGINAS_DO_PERFIL = {
        cliente: ['aacd.html', 'pedido.html', 'laboratorio_instituicao.html', 'detalhe_laboratorio_instituicao.html'],
        fornecedor: ['fablab.html', 'solicitacoes.html', 'detalhe_solicitacao.html']
    };
    const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

    // ---------- Sessão (token guardado no navegador) ----------
    function lerSessao() {
        try {
            const s = JSON.parse(localStorage.getItem(CHAVE_SESSAO));
            if (!s || !s.token || !s.usuario) return null;
            const { exp } = JSON.parse(atob(s.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
            if (exp && exp * 1000 < Date.now()) { limparSessao(); return null; }
            return s;
        } catch (e) {
            return null;
        }
    }
    function salvarSessao(token, usuario) {
        localStorage.setItem(CHAVE_SESSAO, JSON.stringify({ token, usuario }));
    }
    function limparSessao() {
        localStorage.removeItem(CHAVE_SESSAO);
    }

    // Disponível para as outras telas: CS.fetchAutenticado('/orders') etc.
    window.CS = {
        sessao: lerSessao,
        fetchAutenticado(caminho, opcoes = {}) {
            const s = lerSessao();
            return fetch(API + caminho, {
                ...opcoes,
                headers: { 'Content-Type': 'application/json', ...(opcoes.headers || {}), Authorization: 'Bearer ' + (s ? s.token : '') }
            });
        }
    };

    document.addEventListener('DOMContentLoaded', () => {
        const form = document.getElementById('form-acesso');

        if (form) iniciarHome(form);
        else protegerPaginaInterna();

        // BOTÃO SAIR
        const sair = document.getElementById('botao-sair');
        if (sair) {
            sair.addEventListener('click', (event) => {
                event.preventDefault();
                limparSessao();
                window.location.href = '../index.html';
            });
        }
    });

    // ---------- Páginas internas: exigem login e o perfil certo ----------
    function protegerPaginaInterna() {
        const sessao = lerSessao();
        if (!sessao) {
            sessionStorage.setItem('conectasaude.motivo', 'Sessão não encontrada ou expirada. Entre novamente.');
            console.warn('[Conecta Saúde] sem sessão válida; voltando ao login.');
            window.location.replace('../index.html');
            return;
        }
        const pagina = location.pathname.split('/').pop();
        const permitidas = PAGINAS_DO_PERFIL[sessao.usuario.perfil];
        if (permitidas && !permitidas.includes(pagina)) {
            window.location.replace(HOME_DO_PERFIL[sessao.usuario.perfil].replace('html/', ''));
        }
    }

    // ---------- Home: login e cadastro ----------
    function iniciarHome(form) {
        const $ = (id) => document.getElementById(id);
        const campos = {
            nome: $('nome'), cidade: $('cidade'), estado: $('estado'),
            email: $('email'), senha: $('senha'), aceite: $('aceite')
        };
        const botao = $('botao-acesso');
        const textoBotao = botao.querySelector('.botao-texto');
        const erroGeral = $('erro-acesso');
        let modo = 'login';

        // UFs
        UFS.forEach((uf) => {
            const op = document.createElement('option');
            op.value = uf;
            op.textContent = uf;
            campos.estado.appendChild(op);
        });

        const motivo = sessionStorage.getItem('conectasaude.motivo');
        if (motivo) {
            sessionStorage.removeItem('conectasaude.motivo');
            setTimeout(() => mostrarAviso(motivo, 'info'), 0);
        }

        const perfilSelecionado = () => document.querySelector('input[name="perfil"]:checked')?.value || 'aacd';

        // --- mensagens de erro ---
        function erroCampo(nome, mensagem) {
            const el = $('erro-' + nome);
            if (!el) return;
            el.textContent = mensagem || '';
            el.hidden = !mensagem;
            const input = campos[nome];
            if (input && input.type !== 'checkbox') input.setAttribute('aria-invalid', mensagem ? 'true' : 'false');
        }
        function limparErros() {
            ['nome', 'cidade', 'estado', 'email', 'senha', 'aceite'].forEach((n) => erroCampo(n, ''));
            mostrarAviso('');
        }
        function mostrarAviso(mensagem, tipo) {
            erroGeral.textContent = mensagem || '';
            erroGeral.className = 'aviso' + (tipo ? ' ' + tipo : '');
            erroGeral.hidden = !mensagem;
        }

        // --- alternar Entrar / Criar conta ---
        function definirModo(novo) {
            modo = novo;
            const cadastro = modo === 'cadastro';
            document.querySelectorAll('.abas button').forEach((b) => {
                const ativa = b.dataset.modo === modo;
                b.classList.toggle('ativa', ativa);
                b.setAttribute('aria-pressed', String(ativa));
            });
            ['campo-nome', 'campo-local', 'campo-logo', 'campo-termo'].forEach((id) => { $(id).hidden = !cadastro; });
            document.querySelector('.link-esqueci').hidden = cadastro;
            $('titulo-acesso').textContent = cadastro ? 'Crie sua conta' : 'Acesse a plataforma';
            $('sub-acesso').textContent = cadastro
                ? 'Cadastre sua instituição ou laboratório para começar.'
                : 'Entre para acompanhar pedidos e produções.';
            textoBotao.textContent = cadastro ? 'Criar conta' : 'Entrar';
            campos.senha.autocomplete = cadastro ? 'new-password' : 'current-password';
            atualizarRotuloNome();
            limparErros();
            atualizarBotao();
        }
        function atualizarRotuloNome() {
            $('rotulo-nome').textContent = perfilSelecionado() === 'fablab'
                ? 'Nome do laboratório'
                : 'Nome da unidade da instituição';
        }
        document.querySelectorAll('.abas button').forEach((b) => b.addEventListener('click', () => definirModo(b.dataset.modo)));
        document.querySelectorAll('input[name="perfil"]').forEach((r) => r.addEventListener('change', atualizarRotuloNome));

        // "Acessar" / "Começar agora" levam ao formulário
        ['abrir-acesso', 'comecar'].forEach((id) => {
            const a = $(id);
            if (a) a.addEventListener('click', () => setTimeout(() => campos.email.focus(), 300));
        });

        // --- botão só habilita com e-mail e senha preenchidos ---
        function atualizarBotao() {
            botao.disabled = !(campos.email.value.trim() && campos.senha.value.trim());
        }
        campos.email.addEventListener('input', atualizarBotao);
        campos.senha.addEventListener('input', atualizarBotao);
        atualizarBotao();

        // --- mostrar/ocultar senha e aviso de Caps Lock ---
        const verSenha = $('ver-senha');
        verSenha.addEventListener('click', () => {
            const mostrar = campos.senha.type === 'password';
            campos.senha.type = mostrar ? 'text' : 'password';
            verSenha.setAttribute('aria-pressed', String(mostrar));
            verSenha.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
            verSenha.querySelector('.olho-aberto').style.display = mostrar ? 'none' : '';
            verSenha.querySelector('.olho-fechado').style.display = mostrar ? '' : 'none';
        });
        const avisoCaps = $('aviso-caps');
        const checarCaps = (e) => { avisoCaps.hidden = !(e.getModifierState && e.getModifierState('CapsLock')); };
        campos.senha.addEventListener('keydown', checarCaps);
        campos.senha.addEventListener('keyup', checarCaps);
        campos.senha.addEventListener('blur', () => { avisoCaps.hidden = true; });

        document.querySelector('.link-esqueci').addEventListener('click', () => {
            mostrarAviso('A recuperação de senha ainda não está disponível. Fale com conectasaude@maua.br.', 'info');
        });

        // --- logo (apenas pré-visualização por enquanto; não é enviada ao servidor) ---
        const inputLogo = $('logo');
        $('logo-escolher').addEventListener('click', () => inputLogo.click());
        $('logo-remover').addEventListener('click', () => {
            inputLogo.value = '';
            $('logo-previa').style.backgroundImage = '';
            $('logo-remover').hidden = true;
            const e = $('erro-logo'); e.hidden = true;
        });
        inputLogo.addEventListener('change', () => {
            const arq = inputLogo.files[0];
            const e = $('erro-logo');
            e.hidden = true;
            if (!arq) return;
            if (!['image/png', 'image/jpeg', 'image/webp'].includes(arq.type) || arq.size > 5 * 1024 * 1024) {
                e.textContent = 'Use PNG, JPG ou WebP de até 5 MB.';
                e.hidden = false;
                inputLogo.value = '';
                return;
            }
            const leitor = new FileReader();
            leitor.onload = () => {
                const previa = $('logo-previa');
                previa.style.backgroundImage = `url(${leitor.result})`;
                previa.style.backgroundSize = 'cover';
                previa.style.backgroundPosition = 'center';
                $('logo-remover').hidden = false;
            };
            leitor.readAsDataURL(arq);
        });

        // --- validação no navegador (o servidor valida de novo) ---
        function validar() {
            limparErros();
            let ok = true;
            const falha = (campo, msg) => { erroCampo(campo, msg); ok = false; };

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(campos.email.value.trim())) falha('email', 'Informe um e-mail válido.');
            if (campos.senha.value.length < 8) {
                if (modo === 'cadastro') falha('senha', 'A senha deve ter no mínimo 8 caracteres.');
            }
            if (modo === 'cadastro') {
                if (!campos.nome.value.trim()) falha('nome', 'Informe o nome.');
                if (!campos.cidade.value.trim()) falha('cidade', 'Informe a cidade.');
                if (!campos.estado.value) falha('estado', 'Escolha a UF.');
                if (!campos.aceite.checked) falha('aceite', 'É necessário aceitar os termos para criar a conta.');
            }
            return ok;
        }

        // --- envio ---
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!validar()) return;

            const cadastro = modo === 'cadastro';
            const corpo = cadastro
                ? {
                    nomeInstituicao: campos.nome.value.trim(),
                    email: campos.email.value.trim(),
                    senha: campos.senha.value,
                    perfil: PERFIL_PARA_API[perfilSelecionado()],
                    cidade: campos.cidade.value.trim(),
                    estado: campos.estado.value
                }
                : { email: campos.email.value.trim(), senha: campos.senha.value };

            botao.classList.add('carregando');
            botao.disabled = true;

            try {
                const resposta = await fetch(`${API}/auth/${cadastro ? 'register' : 'login'}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(corpo)
                });
                const dados = await resposta.json().catch(() => ({}));

                if (!resposta.ok) {
                    mostrarAviso(dados.erro || 'Não foi possível concluir. Tente novamente.');
                    return;
                }

                salvarSessao(dados.token, dados.usuario);
                mostrarAviso(cadastro ? 'Conta criada! Entrando…' : 'Bem-vindo! Entrando…', 'ok');
                // O destino é decidido pelo perfil gravado no banco, não pela opção marcada na tela
                window.location.href = HOME_DO_PERFIL[dados.usuario.perfil] || 'html/aacd.html';
            } catch (erro) {
                mostrarAviso('Não foi possível conectar ao servidor. Verifique se o back-end está rodando.');
            } finally {
                botao.classList.remove('carregando');
                atualizarBotao();
            }
        });
    }
})();
