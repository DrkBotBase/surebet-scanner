const axios = require('axios');
const cheerio = require('cheerio');
const moment = require('moment-timezone');

class FlashscoreScraper {
  constructor() {
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://www.flashscore.mobi/',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
    };
  }

  async getMatchData(flashscoreId) {
    try {
      const url = `https://www.flashscore.mobi/match/${flashscoreId}`;
      const response = await axios.get(url, { headers: this.headers });
      const $ = cheerio.load(response.data);

      const team1Url = $('#main > h3 > a:nth-child(1)').attr('href');
      const team2Url = $('#main > h3 > a:nth-child(2)').attr('href');
      
      const team1Name = $('#main > h3 > a:nth-child(1)').text().trim();
      const team2Name = $('#main > h3 > a:nth-child(2)').text().trim();

      const team1Logo = await this.getTeamLogoFromUrl(team1Url);
      const team2Logo = await this.getTeamLogoFromUrl(team2Url);

      const matchStatus = this.getMatchStatus($);
      
      let score = this.getScore($, matchStatus);

      const matchDateTime = this.getMatchDateTime($, matchStatus);

      return {
        id: flashscoreId,
        team1: { 
          name: team1Name, 
          url: team1Url, 
          logo: team1Logo 
        },
        team2: { 
          name: team2Name, 
          url: team2Url, 
          logo: team2Logo 
        },
        score: score,
        status: matchStatus,
        time: matchStatus === 'live' ? this.getMatchTime($) : matchDateTime.time || '',
        eventDate: matchDateTime.eventDate,
        datetime: matchDateTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      throw new Error(`Error obteniendo datos del partido ${flashscoreId}: ${error.message}`);
    }
  }

  getScore($, status) {
    let score = '0-0';
    
    if (status === 'live') {
      const scoreElement = $('#main > div:nth-child(3) > span > b');
      if (scoreElement.length > 0) {
        score = scoreElement.text().trim();
      } else {
        const fallbackScore = $('#main > div:nth-child(3) b');
        if (fallbackScore.length > 0) {
          score = fallbackScore.text().trim();
        }
      }
    } else {
      const scoreElement = $('#main > div:nth-child(3) > b');
      if (scoreElement.length > 0) {
        const scoreText = scoreElement.text().trim();
        if (scoreText && scoreText.includes('-')) {
          score = scoreText;
        } else {
          score = '0-0';
        }
      }
    }
    
    return score;
  }

  getMatchDateTime($, status) {
    let dateText = '';
    $('#main > div').each((i, el) => {
      const text = $(el).text().trim();
      if (text.match(/\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}/)) {
        dateText = text;
        return false;
      }
    });

    if (dateText) {
      return this.convertToColombiaTime(dateText);
    }

    return {
      original: 'No disponible',
      colombia: 'No disponible',
      colombia12h: 'No disponible',
      eventDate: null,
      time: null,
      iso: null,
      timestamp: null
    };
  }

  convertToColombiaTime(dateTimeStr) {
    try {
      const [date, time] = dateTimeStr.split(' ');
      const [day, month, year] = date.split('.');
      
      const flashscoreTime = moment.tz(
        `${year}-${month}-${day} ${time}`, 
        'YYYY-MM-DD HH:mm', 
        'Europe/Zagreb'
      );
      
      const colombiaTime = flashscoreTime.tz('America/Bogota');
      
      const colombiaDateStr = colombiaTime.format('YYYY-MM-DD');
      const colombiaTimeStr = colombiaTime.format('HH:mm');
      const [yearCol, monthCol, dayCol] = colombiaDateStr.split('-').map(Number);
      const [hours, minutes] = colombiaTimeStr.split(':').map(Number);
      
      const eventDate = new Date(Date.UTC(yearCol, monthCol - 1, dayCol, 0, 0, 0));
      
      return {
        original: dateTimeStr,
        colombia: colombiaTime.format('YYYY-MM-DD HH:mm'),
        colombia12h: colombiaTime.format('YYYY-MM-DD h:mm A'),
        eventDate: eventDate,
        time: colombiaTimeStr,
        iso: colombiaTime.toISOString(),
        timestamp: colombiaTime.valueOf()
      };
      
    } catch (error) {
      console.warn(`Error convirtiendo hora: ${dateTimeStr}`, error);
      return {
        original: dateTimeStr,
        colombia: 'Error en conversión',
        colombia12h: 'Error en conversión',
        eventDate: null,
        time: null,
        iso: null,
        timestamp: null,
        error: error.message
      };
    }
  }

  getMatchTime($) {
    const timeElement = $('#main > div:nth-child(4) > span');
    if (timeElement.length > 0) {
      return timeElement.text().trim();
    }
    return '';
  }

  getMatchStatus($) {
    const liveElement = $('#main > div:nth-child(4) > span.live');
    if (liveElement.length > 0) {
      return 'live';
    }

    const finishedElement = $('#main > div:nth-child(4)');
    if (finishedElement.length > 0 && finishedElement.text().includes('Finished')) {
      return 'finished';
    }

    const notStartedElement = $('#main > div:nth-child(4)');
    if (notStartedElement.length > 0 && notStartedElement.hasClass('detail')) {
      const text = notStartedElement.text().trim();
      if (!text.includes('Finished') && !text.includes('First leg') && !text.includes('Aggregate')) {
        return 'not_started';
      }
    }

    return 'unknown';
  }

  async getTeamLogoFromUrl(teamUrl) {
    if (!teamUrl) {
      console.warn('URL del equipo no disponible');
      return null;
    }

    try {
      const response = await axios.get(teamUrl, { 
        headers: {
          ...this.headers,
          'Referer': 'https://www.flashscore.mobi/'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      let logoUrl = null;
      
      const logoSelectors = [
        '#mc > div.container__livetable.singlePageApp > div.container__heading > div.heading > img',
        '.heading__logo--1',
        '.heading__logo',
        'img.heading__logo',
        '.teamLogo img',
        '.team-header__logo img',
        '.logo img'
      ];

      for (const selector of logoSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          logoUrl = element.attr('src');
          if (logoUrl) break;
        }
      }

      if (!logoUrl) {
        $('img').each((i, el) => {
          const src = $(el).attr('src');
          const alt = $(el).attr('alt') || '';
          const className = $(el).attr('class') || '';
          
          if (src && (
            className.includes('logo') || 
            alt.toLowerCase().includes('logo') ||
            src.includes('logo') ||
            src.includes('/image/data/')
          )) {
            logoUrl = src;
            return false;
          }
        });
      }

      if (logoUrl) {
        if (logoUrl.startsWith('//')) {
          logoUrl = 'https:' + logoUrl;
        } else if (logoUrl.startsWith('/')) {
          logoUrl = 'https://www.flashscore.com' + logoUrl;
        }
        return logoUrl;
      } else {
        console.warn(`No se encontró logo para: ${teamUrl}`);
        return null;
      }

    } catch (error) {
      console.error(`Error obteniendo logo de ${teamUrl}: ${error.message}`);
      return null;
    }
  }

  async getMultipleMatches(ids) {
    const results = [];
    for (const id of ids) {
      try {
        const data = await this.getMatchData(id);
        results.push(data);
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        results.push({
          id,
          error: error.message
        });
      }
    }
    return results;
  }
}

// ============ FUNCIÓN SIMPLIFICADA ============
async function getMatchInfo(flashscoreId) {
  const scraper = new FlashscoreScraper();
  return await scraper.getMatchData(flashscoreId);
}

// ============ PRUEBA CON TODOS LOS ESTADOS ============
async function testScraper() {
  const scraper = new FlashscoreScraper();
  
  const matchIds = [
    'QyHcyjU6'
  ];
  
  console.log('🚀 Iniciando scraper...\n');
  console.log('=' .repeat(60));
  
  for (const id of matchIds) {
    try {
      console.log(`\n📊 Partido: ${id}`);
      const matchData = await scraper.getMatchData(id);
      
      console.log(`🏟️ ${matchData.team1.name} vs ${matchData.team2.name}`);
      console.log(`⚽ Marcador: ${matchData.score}`);
      console.log(`📊 Estado: ${matchData.status}`);
      console.log(`⏰ Tiempo: ${matchData.time || 'N/A'}`);
      console.log(`🕐 Hora Colombia: ${matchData.datetime?.colombia || 'N/A'}`);
      console.log(`🖼️ Logo ${matchData.team1.name}: ${matchData.team1.logo || 'No disponible'}`);
      console.log(`🖼️ Logo ${matchData.team2.name}: ${matchData.team2.logo || 'No disponible'}`);
      console.log('-'.repeat(40));
      
    } catch (error) {
      console.error(`❌ Error en ${id}:`, error.message);
    }
  }
}

module.exports = {
  FlashscoreScraper,
  getMatchInfo
};

// Ejecutar directamente
if (require.main === module) {
  testScraper();
}