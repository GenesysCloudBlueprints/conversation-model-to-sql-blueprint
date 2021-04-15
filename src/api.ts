import platformClient from 'purecloud-platform-client-v2';
import config from './config';

var client: platformClient.ApiClientClass;

// Authenticates using Client Credentials
export const connectAPI = async() => {
    const clientId = config.genesysCloud.clientID;
    const clientSecret = config.genesysCloud.clientSecret;

    client = platformClient.ApiClient.instance;
    client.setEnvironment(config.genesysCloud.region);

    await client.loginClientCredentialsGrant(clientId, clientSecret);
}

// Calls POST /api/v2/analytics/conversations/details/query with the given interval
export const getConversations = async(interval: string) => {
    const analyticsApi = new platformClient.AnalyticsApi();

    const result = await analyticsApi.postAnalyticsConversationsDetailsQuery({'interval': interval});

    return result.conversations;
}