const { startServer } = require('./src/server/server');
const config = require('./src/config/config');
const server = require('./src/server/server');


// Start the application
if (require.main === module) {
    startServer();
}