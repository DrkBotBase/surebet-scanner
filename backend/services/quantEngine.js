function factorial(n) {
    if (n === 0 || n === 1) return 1;
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
}

function poisson(k, lambda) {
    return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

function dixonColesTau(h, a, lambdaH, lambdaA, rho = -0.13) {
    if (h === 0 && a === 0) return 1 - (lambdaH * lambdaA * rho);
    if (h === 1 && a === 0) return 1 + (lambdaA * rho);
    if (h === 0 && a === 1) return 1 + (lambdaH * rho);
    if (h === 1 && a === 1) return 1 - rho;
    return 1.0;
}

function dampeningXG(rawXG) {
    const cap = 2.50;
    if (rawXG <= cap) return rawXG;
    return cap + Math.log(1 + (rawXG - cap));
}

function calcularProbabilidadesPartido(stats) {
    const { homePJ, homeGF, homeGC, awayPJ, awayGF, awayGC, leagueAvg = 1.10 } = stats;
    const avgLiga = Math.max(parseFloat(leagueAvg) || 1.10, 1.00);
    
    const hPJ = parseFloat(homePJ), hGF = parseFloat(homeGF), hGC = parseFloat(homeGC);
    const aPJ = parseFloat(awayPJ), aGF = parseFloat(awayGF), aGC = parseFloat(awayGC);
    
    let rawLambdaHome = (hGF / hPJ * aGC / aPJ) / avgLiga;
    let rawLambdaAway = (aGF / aPJ * hGC / hPJ) / avgLiga;
    
    const lambdaHome = dampeningXG(rawLambdaHome);
    const lambdaAway = dampeningXG(rawLambdaAway);
    
    let p1 = 0, pX = 0, p2 = 0;
    let over15 = 0, under15 = 0;
    let over25 = 0, under25 = 0;
    let over35 = 0, under35 = 0;
    let over45 = 0, under45 = 0;
    let bttsYes = 0, bttsNo = 0;
    let scoreMatrix = [];
    const maxGoles = 7;
    
    for (let h = 0; h <= maxGoles; h++) {
        let rawH = poisson(h, lambdaHome);
        for (let a = 0; a <= maxGoles; a++) {
            let rawA = poisson(a, lambdaAway);
            let tau = dixonColesTau(h, a, lambdaHome, lambdaAway);
            let prob = rawH * rawA * tau;
            scoreMatrix.push({ score: `${h}-${a}`, prob });
            if (h > a) p1 += prob;
            else if (h === a) pX += prob;
            else p2 += prob;
            
            const total = h + a;
            if (total > 1.5) over15 += prob;
            else under15 += prob;
            if (total > 2.5) over25 += prob;
            else under25 += prob;
            if (total > 3.5) over35 += prob;
            else under35 += prob;
            if (total > 4.5) over45 += prob;
            else under45 += prob;
            
            if (h > 0 && a > 0) bttsYes += prob;
            else bttsNo += prob;
        }
    }
    
    const totalP = p1 + pX + p2;
    p1 /= totalP; pX /= totalP; p2 /= totalP;
    over15 /= totalP; under15 /= totalP;
    over25 /= totalP; under25 /= totalP;
    over35 /= totalP; under35 /= totalP;
    over45 /= totalP; under45 /= totalP;
    bttsYes /= totalP; bttsNo /= totalP;
    
    scoreMatrix.sort((a, b) => b.prob - a.prob);
    
    return {
        xgHome: lambdaHome.toFixed(2),
        xgAway: lambdaAway.toFixed(2),
        xgTotal: (lambdaHome + lambdaAway).toFixed(2),
        topScores: scoreMatrix.slice(0, 5).map(s => ({ 
            score: s.score, 
            prob: ((s.prob / totalP) * 100).toFixed(1) + "%" 
        })),
        probs: {
            "1": p1,
            "X": pX,
            "2": p2,
            "1X": p1 + pX,
            "12": p1 + p2,
            "X2": p2 + pX,
            "Over 1.5": over15,
            "Under 1.5": under15,
            "Over 2.5": over25,
            "Under 2.5": under25,
            "Over 3.5": over35,
            "Under 3.5": under35,
            "Over 4.5": over45,
            "Under 4.5": under45,
            "BTTS_SI": bttsYes,
            "BTTS_NO": bttsNo,
            "Handicap -1 Home": p1 - (pX * 0.5),
            "Handicap +1 Away": p2 + (pX * 0.5),
            "Handicap -1 Away": p2 - (pX * 0.5),
            "Handicap +1 Home": p1 + (pX * 0.5)
        }
    };
}

function evaluarValuebets(datos1xBet, datosKambi, probabilidades) {
    const valuebets = [];
    const p = probabilidades.probs;
    
    function agregarValuebet(mercado, linea, seleccion, probTeorica, odds1xBet, oddsKambi) {
        let mejorCuota = 0;
        let mejorBookie = "";
        let cuotaUsada = null;
        let bookieUsado = null;
        
        if (odds1xBet && odds1xBet > mejorCuota) {
            mejorCuota = odds1xBet;
            mejorBookie = "1xBet";
            cuotaUsada = odds1xBet;
            bookieUsado = "1xBet";
        }
        if (oddsKambi && oddsKambi > mejorCuota) {
            mejorCuota = oddsKambi;
            mejorBookie = "BetPlay";
            cuotaUsada = oddsKambi;
            bookieUsado = "BetPlay";
        }
        
        if (mejorCuota > 0 && probTeorica > 0) {
            const ev = (probTeorica * mejorCuota) - 1;
            const evPorcentaje = (ev * 100);
            if (evPorcentaje > 5.0) {
                valuebets.push({
                    mercado,
                    linea: linea || "N/A",
                    seleccion,
                    probabilidadModelo: (probTeorica * 100).toFixed(1) + "%",
                    mejorBookie,
                    mejorCuota: Number(mejorCuota.toFixed(2)),
                    ev: evPorcentaje.toFixed(2) + "%",
                    cuota1xBet: odds1xBet ? Number(odds1xBet.toFixed(2)) : null,
                    cuotaBetPlay: oddsKambi ? Number(oddsKambi.toFixed(2)) : null
                });
            }
        }
    }
    
    if (p["1"]) agregarValuebet("Resultado Final", "N/A", "Local (1)", p["1"], 
        datos1xBet.ganadorTotal?.local, datosKambi.ganadorTotal?.local);
    if (p["X"]) agregarValuebet("Resultado Final", "N/A", "Empate (X)", p["X"], 
        datos1xBet.ganadorTotal?.empate, datosKambi.ganadorTotal?.empate);
    if (p["2"]) agregarValuebet("Resultado Final", "N/A", "Visitante (2)", p["2"], 
        datos1xBet.ganadorTotal?.visitante, datosKambi.ganadorTotal?.visitante);
    
    if (p["1X"]) agregarValuebet("Doble Oportunidad", "N/A", "1X", p["1X"], 
        datos1xBet.dobleOportunidadTotal?.["1X"], datosKambi.dobleOportunidadTotal?.["1X"]);
    if (p["12"]) agregarValuebet("Doble Oportunidad", "N/A", "12", p["12"], 
        datos1xBet.dobleOportunidadTotal?.["12"], datosKambi.dobleOportunidadTotal?.["12"]);
    if (p["X2"]) agregarValuebet("Doble Oportunidad", "N/A", "X2", p["X2"], 
        datos1xBet.dobleOportunidadTotal?.["X2"], datosKambi.dobleOportunidadTotal?.["X2"]);
    
    const lineas = ["1.5", "2.5", "3.5", "4.5"];
    lineas.forEach(linea => {
        const overKey = `Over ${linea}`;
        const underKey = `Under ${linea}`;
        
        if (p[overKey]) {
            const over1x = datos1xBet.golesTotal?.golesPartido?.[linea]?.mas;
            const overKb = datosKambi.golesTotal?.golesPartido?.[linea]?.mas;
            agregarValuebet("Total Goles", linea, "Over", p[overKey], over1x, overKb);
        }
        if (p[underKey]) {
            const under1x = datos1xBet.golesTotal?.golesPartido?.[linea]?.menos;
            const underKb = datosKambi.golesTotal?.golesPartido?.[linea]?.menos;
            agregarValuebet("Total Goles", linea, "Under", p[underKey], under1x, underKb);
        }
    });
    
    if (p["BTTS_SI"]) agregarValuebet("Ambos Marcan", "N/A", "Sí", p["BTTS_SI"], 
        datos1xBet.ambosMarcanTotal?.si, datosKambi.ambosMarcanTotal?.si);
    if (p["BTTS_NO"]) agregarValuebet("Ambos Marcan", "N/A", "No", p["BTTS_NO"], 
        datos1xBet.ambosMarcanTotal?.no, datosKambi.ambosMarcanTotal?.no);
    
    const hcMarkets = [
        { key: "Handicap -1 Home", label: "Hándicap -1 Local", seleccion: "Local -1" },
        { key: "Handicap +1 Away", label: "Hándicap +1 Visitante", seleccion: "Visitante +1" },
        { key: "Handicap -1 Away", label: "Hándicap -1 Visitante", seleccion: "Visitante -1" },
        { key: "Handicap +1 Home", label: "Hándicap +1 Local", seleccion: "Local +1" }
    ];
    
    hcMarkets.forEach(hc => {
        if (p[hc.key]) {
            const hc1xLocal = datos1xBet.handicapTotal?.["1"]?.local;
            const hc1xAway = datos1xBet.handicapTotal?.["1"]?.visitante;
            const hcKbLocal = datosKambi.handicapTotal?.["1"]?.local;
            const hcKbAway = datosKambi.handicapTotal?.["1"]?.visitante;
            
            let odds1x = null;
            let oddsKb = null;
            
            if (hc.key.includes("Home") || hc.key.includes("Local")) {
                odds1x = hc1xLocal;
                oddsKb = hcKbLocal;
            } else {
                odds1x = hc1xAway;
                oddsKb = hcKbAway;
            }
            
            agregarValuebet(hc.label, "1.0", hc.seleccion, p[hc.key], odds1x, oddsKb);
        }
    });
    
    valuebets.sort((a, b) => parseFloat(b.ev) - parseFloat(a.ev));
    return valuebets;
}

module.exports = { calcularProbabilidadesPartido, evaluarValuebets };