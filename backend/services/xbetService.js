const axios = require('axios');

const HEADERS_1XBET = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'es-CO,es;q=0.9',
    'Cache-Control': 'no-cache'
};

const axiosInstance = axios.create({
    timeout: 15000,
    headers: HEADERS_1XBET
});

axiosInstance.interceptors.response.use(
    response => response,
    async error => {
        const { config } = error;
        if (!config || !config.retry) {
            return Promise.reject(error);
        }
        
        config.retryCount = config.retryCount || 0;
        
        if (config.retryCount >= config.retry) {
            return Promise.reject(error);
        }
        
        config.retryCount++;
        
        const delay = Math.min(1000 * Math.pow(2, config.retryCount), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        return axiosInstance(config);
    }
);

async function obtenerCuotas1xBet(idXbet, isLive = false) {
    try {
        const url = isLive
            ? `https://1xbet-c.com/service-api/main-live-feed/v3/gameEvents?cfView=3&countEvents=250&fcountry=91&gameId=${idXbet}&gr=455&grMode=4&lng=es&marketType=1&ref=1&supportedSpecialType=1`
            : `https://1xbet-c.com/service-api/main-line-feed/v1/gameEvents?cfView=3&countEvents=250&country=91&gameId=${idXbet}&gr=455&grMode=4&lng=es&marketType=1&ref=1&supportedSpecialType=1`;
        
        const response = await axiosInstance({
            method: 'GET',
            url: url,
            retry: 3,
            retryDelay: 2000
        });
        
        const data = response.data;
        
        return {
            eventGroups: data.eventGroups?.map(group => ({
                groupId: group.groupId,
                events: group.events?.map(eventArray => 
                    eventArray?.map(e => ({
                        type: e.type,
                        cf: e.cf,
                        parameter: e.parameter
                    })) || []
                ) || []
            })) || [],
            subGamesForMainGame: data.subGamesForMainGame?.map(subGame => ({
                subGameName: subGame.subGameName,
                period: subGame.period,
                eventGroups: subGame.eventGroups?.map(group => ({
                    groupId: group.groupId,
                    events: group.events?.map(eventArray =>
                        eventArray?.map(e => ({
                            type: e.type,
                            cf: e.cf,
                            parameter: e.parameter
                        })) || []
                    ) || []
                })) || []
            })) || []
        };
    } catch (error) {
        console.error('❌ Error 1xBet:', error.message);
        
        if (error.code === 'ECONNABORTED') {
            console.error('⏱️ Timeout en 1xBet');
        }
        if (error.response?.status === 429) {
            console.error('⏳ Rate limit excedido en 1xBet');
        }
        
        return null;
    }
}

module.exports = { obtenerCuotas1xBet };