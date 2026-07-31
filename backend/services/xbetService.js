const axios = require('axios');

const HEADERS_1XBET = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json'
};

async function obtenerCuotas1xBet(idXbet) {
    try {
        const url = `https://1xbet-c.com/service-api/main-line-feed/v1/gameEvents?cfView=3&countEvents=250&country=91&gameId=${idXbet}&gr=455&grMode=4&lng=es&marketType=1&ref=1&supportedSpecialType=1`;
        const response = await axios.get(url, { headers: HEADERS_1XBET });
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
        return null;
    }
}

module.exports = { obtenerCuotas1xBet };