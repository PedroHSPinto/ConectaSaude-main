const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nomeInstituicao: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,   // "Contato@AACD.org" e "contato@aacd.org" passam a ser o mesmo e-mail
    trim: true
  },
  senha: {
    type: String,
    required: true,
    select: false      // a senha (hash) nunca vem em consultas, a menos que peçamos com .select('+senha')
  },
  perfil: {
    type: String,
    enum: ['cliente', 'fornecedor', 'admin'],
    required: true
  },
  cidade: {
    type: String,
    required: true,
    trim: true
  },
  estado: {
    type: String,
    required: true,
    trim: true,
    uppercase: true
  }
}, {
  timestamps: true
});

// Antes de salvar, transforma a senha em hash (só quando ela foi criada/alterada)
userSchema.pre('save', async function () {
  if (!this.isModified('senha')) return;
  this.senha = await bcrypt.hash(this.senha, 10);
});

// Compara a senha digitada com o hash guardado
userSchema.methods.conferirSenha = function (senhaDigitada) {
  return bcrypt.compare(senhaDigitada, this.senha);
};

module.exports = mongoose.model('User', userSchema);
