const config = {
    webservices: {
        list: ['ton.org', 'ton.sh', 'toncenter.com'],
        interval: 60, // in seconds
    },
    http: {
        host: 'localhost',
        port: 8080,
    },
    mongo: {
        host: 'mongodb',
        username: 'tonstatus',
        password: 'tonstatus',
    }
};

export default config;
