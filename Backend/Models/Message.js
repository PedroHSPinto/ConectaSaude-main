const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  remetenteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  texto: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Message', messageSchema);