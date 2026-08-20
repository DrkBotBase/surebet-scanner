const axios = require('axios');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Accept-Language': 'es-CO,es;q=0.9',
    'Cache-Control': 'no-cache'
};

const obtenerUrlKambi = (eventId) => 
    `https://us.offering-api.kambicdn.com/offering/v2018/betplay/betoffer/event/${eventId}.json?lang=es_CO&market=CO&client_id=200&channel_id=3&includeParticipants=true`;

const axiosInstance = axios.create({
    timeout: 15000,
    headers: HEADERS
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

async function obtenerDatosKambi(eventId) {
    try {
        const url = obtenerUrlKambi(eventId);

        const response = await axiosInstance({
            method: 'GET',
            url: url,
            retry: 3,
            retryDelay: 2000
        });
        
        const data = response.data;
        
        return {
            events: data.events?.map(event => ({
                homeName: event.homeName,
                awayName: event.awayName,
                start: event.start,
                participants: event.participants
            })) || [],
            betOffers: data.betOffers?.map(offer => ({
                criterion: {
                    label: offer.criterion?.label,
                    englishLabel: offer.criterion?.englishLabel
                },
                betOfferType: {
                    englishName: offer.betOfferType?.englishName
                },
                outcomes: offer.outcomes?.map(o => ({
                    type: o.type,
                    odds: o.odds,
                    line: o.line,
                    participant: o.participant,
                    label: o.label
                })) || []
            })) || []
        };
    } catch (error) {
        console.error('Error Kambi:', error.message);
        
        if (error.code === 'ECONNABORTED') {
            console.error(' Timeout en Kambi');
        }
        if (error.response?.status === 429) {
            console.error('Rate limit excedido en Kambi');
        }
        return null;
    }
}

module.exports = { obtenerDatosKambi };