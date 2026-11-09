const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const jwt = require('jsonwebtoken');

dotenv.config();

const connectDB = require('./Config/db');
const User = require('./Models/user');
const Message = require('./Models/Message');

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET no arquivo .env (veja .env.example).');
  process.exit(1);
}

connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// Serve o front-end: com o servidor ligado, abra http://localhost:5000
app.use(express.static(path.join(__dirname, '..', 'Front')));

// ---------- Auxiliares de autenticação ----------

const PERFIS_CADASTRO = ['cliente', 'fornecedor']; // 'admin' nunca pode ser criado pelo site
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function gerarToken(usuario) {
  return jwt.sign(
    { id: usuario._id, perfil: usuario.perfil },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

function usuarioPublico(u) {
  return {
    id: u._id,
    nomeInstituicao: u.nomeInstituicao,
    email: u.email,
    perfil: u.perfil,
    cidade: u.cidade,
    estado: u.estado
  };
}

// Middleware: use em rotas que exigem login (header "Authorization: Bearer <token>")
function exigirLogin(req, res, next) {
  const cabecalho = req.headers.authorization || '';
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null;
  if (!token) return res.status(401).json({ erro: 'Faça login para continuar.' });

  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ erro: 'Sessão expirada. Entre novamente.' });
  }
}

// ---------- Cadastro ----------
app.post('/api/auth/register', async (req, res) => {
  try {
    const { nomeInstituicao, email, senha, perfil, cidade, estado } = req.body;

    if (!nomeInstituicao || !email || !senha || !perfil || !cidade || !estado) {
      return res.status(400).json({ erro: 'Preencha todos os campos.' });
    }
    if (!EMAIL_VALIDO.test(email)) {
      return res.status(400).json({ erro: 'Informe um e-mail válido.' });
    }
    if (String(senha).length < 8) {
      return res.status(400).json({ erro: 'A senha deve ter no mínimo 8 caracteres.' });
    }
    if (!PERFIS_CADASTRO.includes(perfil)) {
      return res.status(400).json({ erro: 'Perfil inválido.' });
    }

    const emailNormalizado = String(email).trim().toLowerCase();
    if (await User.findOne({ email: emailNormalizado })) {
      return res.status(409).json({ erro: 'E-mail já cadastrado.' });
    }

    // A senha vira hash dentro do model (pre-save)
    const usuario = await User.create({
      nomeInstituicao, email: emailNormalizado, senha, perfil, cidade, estado
    });

    res.status(201).json({
      sucesso: true,
      token: gerarToken(usuario),
      usuario: usuarioPublico(usuario)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ erro: 'E-mail já cadastrado.' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ erro: 'Dados inválidos.' });
    }
    console.error(error);
    res.status(500).json({ erro: 'Erro interno ao criar a conta.' });
  }
});

// ---------- Login ----------
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ erro: 'Informe e-mail e senha.' });
    }

    const usuario = await User
      .findOne({ email: String(email).trim().toLowerCase() })
      .select('+senha');

    // Mesma mensagem para "e-mail não existe" e "senha errada" (não revela quais e-mails existem)
    if (!usuario || !(await usuario.conferirSenha(String(senha)))) {
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    }

    res.json({
      sucesso: true,
      token: gerarToken(usuario),
      usuario: usuarioPublico(usuario)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro interno ao entrar.' });
  }
});

// ---------- Quem sou eu (valida o token e devolve o usuário) ----------
app.get('/api/auth/me', exigirLogin, async (req, res) => {
  try {
    const usuario = await User.findById(req.auth.id);
    if (!usuario) return res.status(401).json({ erro: 'Usuário não encontrado.' });
    res.json({ sucesso: true, usuario: usuarioPublico(usuario) });
  } catch (error) {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// ---------- Mensagens (inalterado) ----------
app.post('/api/messages', async (req, res) => {
  try {
    const { orderId, remetenteId, texto } = req.body;

    if (!orderId || !remetenteId || !texto) {
      return res.status(400).json({
        erro: 'orderId, remetenteId e texto sao obrigatorios.'
      });
    }

    const mensagem = await Message.create({
      orderId,
      remetenteId,
      texto
    });

    res.status(201).json({
      sucesso: true,
      mensagem
    });
  } catch (error) {
    res.status(500).json({
      erro: error.message
    });
  }
});


app.get('/api/messages/:orderId', async (req, res) => {
  try {
    const mensagens = await Message.find({ orderId: req.params.orderId })
      .populate('remetenteId', 'nomeInstituicao perfil')
      .sort({ createdAt: 1 });

    res.json({
      sucesso: true,
      mensagens
    });
  } catch (error) {
    res.status(500).json({
      erro: error.message
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));
