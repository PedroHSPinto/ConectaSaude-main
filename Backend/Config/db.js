const moongose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await moongose.connect(process.env.MONGO_URI);
        console.log(`Conectado: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Não conectado: ${error.message}`);
        process.exit(1)
    }
};

module.exports = connectDB;

