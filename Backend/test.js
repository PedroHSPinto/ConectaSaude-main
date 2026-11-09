const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./Config/db');
const Printer = require('./Models/printer');
const User = require('./Models/user');

// Carrega as variáveis do .env e conecta ao banco
dotenv.config();

async function rodarTeste() {
  await connectDB();

  try {
    console.log('⏳ Criando usuário de teste (Fornecedor)...');
    
    // 1. Cria um usuário de teste
    const usuarioTeste = await User.create({
      nomeInstituicao: 'FabLab Mauá Teste',
      email: `fablab_${Date.now()}@maua.br`, // E-mail único usando timestamp
      senha: '123456senha',
      perfil: 'fornecedor',
      cidade: 'São Caetano do Sul',
      estado: 'SP',
    });

    console.log(`✅ Usuário criado com sucesso! ID: ${usuarioTeste._id}`);

    // 2. Cria uma impressora associada ao ID desse usuário
    console.log('⏳ Criando impressora de teste...');
    const impressoraTeste = await Printer.create({
      fornecedorId: usuarioTeste._id,
      cidade: usuarioTeste.cidade,
      estado: usuarioTeste.estado,
      emailSolicitacoes: usuarioTeste.email,
      marca: 'Ender',
      modelo: '3 V2',
      tecnologia: 'FDM',
      disponibilidade: 'Disponível',
      volumeConstrucao: {
        larguraX: 220,
        profundidadeY: 220,
        alturaZ: 250,
      },
      materiaisCompativeis: ['PLA', 'PETG', 'ABS'],
      descricao: 'Impressora de teste gravada com sucesso!',
    });

    console.log(`✅ Impressora criada com sucesso! ID: ${impressoraTeste._id}`);

    // 3. Busca a impressora no banco trazendo também os dados do fornecedor (Populate)
    console.log('⏳ Buscando a impressora no banco de dados...');
    const impressoraEncontrada = await Printer.findById(
      impressoraTeste._id
    ).populate('fornecedorId', 'nomeInstituicao email');

    console.log('\n🎉 --- DADOS RETORNADOS DO MONGODB ---');
    console.log(JSON.stringify(impressoraEncontrada, null, 2));
  } catch (error) {
    console.error(`❌ Erro no teste: ${error.message}`);
  } finally {
    // Desconecta do banco de dados ao finalizar o teste
    await mongoose.connection.close();
    console.log('\n🔌 Conexão encerrada.');
  }
}

rodarTeste();