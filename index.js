const { startServer } = require('./src/server/server');



// Start the application
if (require.main === module) {
    startServer();
}