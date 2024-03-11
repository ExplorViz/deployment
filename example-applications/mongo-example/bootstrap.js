import('./tracer.js').then(() => {
    import('./app.js'); // Startet Ihre Anwendung
}).catch(console.error);
