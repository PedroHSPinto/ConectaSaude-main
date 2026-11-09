const mongoose = require('mongoose');

const printerSchema = new mongoose.Schema({
  fornecedorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  marca: {
    type: String,
    required: true
  },
  modelo: {
    type: String,
    required: true
  },
  tecnologia: {
    type: String,
    enum: ['FDM', 'SLA', 'FFF'],
    required: true
  },
  disponibilidade: {
    type: String,
    enum: ['Disponível', 'Limitada', 'Manutenção'],
    default: 'Disponível'
  },
  volumeConstrucao: {
    larguraX: Number,
    profundidadeY: Number,
    alturaZ: Number
  },
  materiaisCompativeis: [{
    type: String
  }],
  descricao: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Printer', printerSchema);