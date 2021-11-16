const config = {
    webservices: {
        list: [
            {
                name: 'ton.org',
                url: 'https://ton.org',
            },
            {
                name: 'ton.sh',
                url: 'https://ton.sh'
            },
            {
                name: 'toncenter.com',
                url: 'https://toncenter.com'
            },
            {
                name: 'ton-eth-bridge',
                url: 'https://ton.org/bridge/'
            },
            {
                name: 'ton-bsc-bridge',
                url: 'https://ton.org/bridge/bsc'
            }
        ],
        intervalContinuous: 60, // in seconds
        intervalLast: 5, // in seconds
    },
    liteservers: {
       intervals: {
           scanBlocks: 1,
           readBlocks: 0.3,
           statistics: 10,
           numberOfValidators: 10,
       }
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
