const axios = require('axios');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json'
};

const obtenerUrlKambi = (eventId) => 
    `https://us.offering-api.kambicdn.com/offering/v2018/betplay/betoffer/event/${eventId}.json?lang=es_CO&market=CO&client_id=200&channel_id=3&includeParticipants=true`;

async function obtenerDatosKambi(eventId) {
    try {
        const url = obtenerUrlKambi(eventId);
        const response = await axios.get(url, { headers: HEADERS });
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
        console.error('❌ Error Kambi:', error.message);
        return null;
    }
}

module.exports = { obtenerDatosKambi };