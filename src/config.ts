export default {
    genesysCloud: {
        // Genesys Cloud region
        // eg. 'mypurecloud.ie', 'euw2.pure.cloud', etc...
        region: 'mypurecloud.com',
        // Client Credentials
        // Client ID
        clientID: 'your-client-id-here',
        // Client Secret
        clientSecret: 'your-client-secret-here'
    },

    postgreSQL: {
        // This must be the local IP of your machine, localhost will not work
        // To find this:
        // macOs (default Wi-Fi interface): ipconfig getifaddr en0
        // Linux (most): hostname -I
        host: 'your-local-ip-address-here',
        // The following values must match their counterparts in docker/docker-compose.yml
        // docker-compose: environment.POSTGRES_USER
        user: 'dbuser',
        // docker-compose: environment.POSTGRES_PASSWORD
        password: 'c0nversat1onMod3lToSql',
        // docker-compose: environment.POSTGRES_DB
        database: 'conversations_db',
        // docker-compose: ports
        port: 5432
    }
}