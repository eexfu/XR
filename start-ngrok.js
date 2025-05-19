const ngrok = require('ngrok');

(async function() {
    try {
        const url = await ngrok.connect({
            addr: 3000,
            proto: 'http'
        });
        console.log('Ngrok tunnel is running at:', url);
    } catch (err) {
        console.error('Error while connecting to ngrok:', err);
    }
})(); 