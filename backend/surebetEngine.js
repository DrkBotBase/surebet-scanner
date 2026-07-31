function extraerDatos1xBet(json1xBet) {
    const dataNormalizada = {
        ganadorTotal: {},
        dobleOportunidadTotal: {},
        ambosMarcanTotal: {},
        golesTotal: {},
        handicapTotal: {},
        cornersTotal: {},
        ganadorCorners: {},
        cornersLocalTotal: {},
        cornersVisitanteTotal: {},
        doCorners: {},
        shotsOnGoalHome: {},
        shotsOnGoalAway: {}
    };

    // =============================
    // PARTE 1: (PARTIDO COMPLETO)
    // =============================
    if (json1xBet.eventGroups) {
        json1xBet.eventGroups.forEach(group => {
            const groupId = group.groupId;
            
            // --- GANADOR PARTIDO (1X2) ---
            if (groupId === 1) {
                const eventos = group.events || [];
                eventos.forEach(eventArray => {
                    eventArray.forEach(e => {
                        if (e.type === 1) dataNormalizada.ganadorTotal.local = e.cf;
                        if (e.type === 2) dataNormalizada.ganadorTotal.empate = e.cf;
                        if (e.type === 3) dataNormalizada.ganadorTotal.visitante = e.cf;
                    });
                });
            }
            
            // --- DOBLE OPORTUNIDAD ---
            if (groupId === 8) {
                const col1X = group.events[0] || [];
                const col12 = group.events[1] || [];
                const colX2 = group.events[2] || [];
                
                if (col1X.length > 0 && col1X[0]) {
                    dataNormalizada.dobleOportunidadTotal["1X"] = col1X[0].cf;
                }
                if (col12.length > 0 && col12[0]) {
                    dataNormalizada.dobleOportunidadTotal["12"] = col12[0].cf;
                }
                if (colX2.length > 0 && colX2[0]) {
                    dataNormalizada.dobleOportunidadTotal["X2"] = colX2[0].cf;
                }
            }
            
            // --- AMBOS MARCAN (BTTS) ---
            if (groupId === 19) {
                const eventos = group.events || [];
                eventos.forEach(eventArray => {
                    eventArray.forEach(e => {
                        if (e.type === 180) {
                            dataNormalizada.ambosMarcanTotal.si = e.cf;
                        }
                        if (e.type === 181) {
                            dataNormalizada.ambosMarcanTotal.no = e.cf;
                        }
                    });
                });
            }
            
            // --- TOTAL DE GOLES ---
            if (groupId === 17) {
                const eventosOver = group.events[0] || [];
                const eventosUnder = group.events[1] || [];

                eventosOver.forEach(e => {
                    if (e.type === 9 && e.parameter !== undefined) {
                        const linea = e.parameter.toString();
                        if (!dataNormalizada.golesTotal.golesPartido) dataNormalizada.golesTotal.golesPartido = {};
                        if (!dataNormalizada.golesTotal.golesPartido[linea]) dataNormalizada.golesTotal.golesPartido[linea] = {};
                        dataNormalizada.golesTotal.golesPartido[linea].mas = e.cf;
                    }
                });
                eventosUnder.forEach(e => {
                    if (e.type === 10 && e.parameter !== undefined) {
                        const linea = e.parameter.toString();
                        if (!dataNormalizada.golesTotal.golesPartido) dataNormalizada.golesTotal.golesPartido = {};
                        if (!dataNormalizada.golesTotal.golesPartido[linea]) dataNormalizada.golesTotal.golesPartido[linea] = {};
                        dataNormalizada.golesTotal.golesPartido[linea].menos = e.cf;
                    }
                });
            }
            
            // --- HÁNDICAP ASIÁTICO ---
            if (groupId === 2854) {
                const eventosLocal = group.events[0] || [];
                const eventosVisitante = group.events[1] || [];

                eventosLocal.forEach(e => {
                    if (e.type === 3829 && e.parameter !== undefined) {
                        const linea = e.parameter.toString();
                        if (!dataNormalizada.handicapTotal[linea]) dataNormalizada.handicapTotal[linea] = {};
                        dataNormalizada.handicapTotal[linea].local = e.cf;
                    }
                });
                eventosVisitante.forEach(e => {
                    if (e.type === 3830 && e.parameter !== undefined) {
                        const linea = e.parameter.toString();
                        if (!dataNormalizada.handicapTotal[linea]) dataNormalizada.handicapTotal[linea] = {};
                        dataNormalizada.handicapTotal[linea].visitante = e.cf;
                    }
                });
            }
        });
    }
    
    // ==============================
    // PARTE 2: (SAQUES DE ESQUINA)
    // ==============================
    if (json1xBet.subGamesForMainGame) {
        json1xBet.subGamesForMainGame.forEach(subGame => {
            const subGameName = subGame.subGameName || "";
            const period = subGame.period;
            
            if (subGameName.includes("Saques de esquina") && !period) {
                subGame.eventGroups.forEach(group => {
                    const groupId = group.groupId;

                    // --- GANADOR CORNERS ---
                    if (groupId === 1) {
                        const col1 = group.events[0] || [];
                        const colX = group.events[1] || [];
                        const col2 = group.events[2] || [];
                        
                        if (col1.length > 0 && col1[0]) {
                            dataNormalizada.ganadorCorners["1"] = col1[0].cf;
                        }
                        if (colX.length > 0 && colX[0]) {
                            dataNormalizada.ganadorCorners["X"] = colX[0].cf;
                        }
                        if (col2.length > 0 && col2[0]) {
                            dataNormalizada.ganadorCorners["2"] = col2[0].cf;
                        }
                    }
                    
                    // --- DOBLE OPORTUNIDAD CORNERS ---
                    if (groupId === 8) {
                        const col1X = group.events[0] || [];
                        const col12 = group.events[1] || [];
                        const colX2 = group.events[2] || [];
                        
                        if (col1X.length > 0 && col1X[0]) {
                            dataNormalizada.doCorners["1X"] = col1X[0].cf;
                        }
                        if (col12.length > 0 && col12[0]) {
                            dataNormalizada.doCorners["12"] = col12[0].cf;
                        }
                        if (colX2.length > 0 && colX2[0]) {
                            dataNormalizada.doCorners["X2"] = colX2[0].cf;
                        }
                    }
                    
                    // --- CORNERS PARTIDO ---
                    if (groupId === 17) {
                        const eventosOver = group.events[0] || [];
                        const eventosUnder = group.events[1] || [];

                        eventosOver.forEach(e => {
                            if (e.type === 9 && e.parameter !== undefined) {
                                const linea = e.parameter.toString();
                                if (!dataNormalizada.cornersTotal[linea]) dataNormalizada.cornersTotal[linea] = {};
                                dataNormalizada.cornersTotal[linea].mas = e.cf;
                            }
                        });
                        eventosUnder.forEach(e => {
                            if (e.type === 10 && e.parameter !== undefined) {
                                const linea = e.parameter.toString();
                                if (!dataNormalizada.cornersTotal[linea]) dataNormalizada.cornersTotal[linea] = {};
                                dataNormalizada.cornersTotal[linea].menos = e.cf;
                            }
                        });
                    }
                    
                    // --- CORNERS LOCAL ---
                    if (groupId === 15) {
                        const eventosOver = group.events[0] || [];
                        const eventosUnder = group.events[1] || [];

                        eventosOver.forEach(e => {
                            if (e.type === 11 && e.parameter !== undefined) {
                                const linea = e.parameter.toString();
                                if (!dataNormalizada.cornersLocalTotal[linea]) dataNormalizada.cornersLocalTotal[linea] = {};
                                dataNormalizada.cornersLocalTotal[linea].mas = e.cf;
                            }
                        });
                        eventosUnder.forEach(e => {
                            if (e.type === 12 && e.parameter !== undefined) {
                                const linea = e.parameter.toString();
                                if (!dataNormalizada.cornersLocalTotal[linea]) dataNormalizada.cornersLocalTotal[linea] = {};
                                dataNormalizada.cornersLocalTotal[linea].menos = e.cf;
                            }
                        });
                    }
                    
                    // --- CORNERS VISITANTE ---
                    if (groupId === 62) {
                        const eventosOver = group.events[0] || [];
                        const eventosUnder = group.events[1] || [];

                        eventosOver.forEach(e => {
                            if (e.type === 13 && e.parameter !== undefined) {
                                const linea = e.parameter.toString();
                                if (!dataNormalizada.cornersVisitanteTotal[linea]) dataNormalizada.cornersVisitanteTotal[linea] = {};
                                dataNormalizada.cornersVisitanteTotal[linea].mas = e.cf;
                            }
                        });
                        eventosUnder.forEach(e => {
                            if (e.type === 14 && e.parameter !== undefined) {
                                const linea = e.parameter.toString();
                                if (!dataNormalizada.cornersVisitanteTotal[linea]) dataNormalizada.cornersVisitanteTotal[linea] = {};
                                dataNormalizada.cornersVisitanteTotal[linea].menos = e.cf;
                            }
                        });
                    }
                });
            }
            
            // --- TIROS A PUERTA ---
            if (subGameName === "Tiros entre los tres palos") {
                subGame.eventGroups.forEach(group => {
                    const groupId = group.groupId;

                    // --- SHOTS ON GOAL LOCAL ---
                    if (groupId === 15) {
                        const eventosOver = group.events[0] || [];
                        const eventosUnder = group.events[1] || [];

                        eventosOver.forEach(e => {
                            if (e.type === 11 && e.parameter !== undefined) {
                                const linea = e.parameter.toString();
                                if (!dataNormalizada.shotsOnGoalHome[linea]) dataNormalizada.shotsOnGoalHome[linea] = {};
                                dataNormalizada.shotsOnGoalHome[linea].mas = e.cf;
                            }
                        });
                        eventosUnder.forEach(e => {
                            if (e.type === 12 && e.parameter !== undefined) {
                                const linea = e.parameter.toString();
                                if (!dataNormalizada.shotsOnGoalHome[linea]) dataNormalizada.shotsOnGoalHome[linea] = {};
                                dataNormalizada.shotsOnGoalHome[linea].menos = e.cf;
                            }
                        });
                    }
                    
                    // --- SHOTS ON GOAL VISITANTE ---
                    if (groupId === 62) {
                        const eventosOver = group.events[0] || [];
                        const eventosUnder = group.events[1] || [];

                        eventosOver.forEach(e => {
                            if (e.type === 13 && e.parameter !== undefined) {
                                const linea = e.parameter.toString();
                                if (!dataNormalizada.shotsOnGoalAway[linea]) dataNormalizada.shotsOnGoalAway[linea] = {};
                                dataNormalizada.shotsOnGoalAway[linea].mas = e.cf;
                            }
                        });
                        eventosUnder.forEach(e => {
                            if (e.type === 14 && e.parameter !== undefined) {
                                const linea = e.parameter.toString();
                                if (!dataNormalizada.shotsOnGoalAway[linea]) dataNormalizada.shotsOnGoalAway[linea] = {};
                                dataNormalizada.shotsOnGoalAway[linea].menos = e.cf;
                            }
                        });
                    }
                });
            }
        });
    }

    return dataNormalizada;
}

function extraerDatosKambi(jsonKambi) {
    const dataNormalizada = {
        nombreLocal: "",
        nombreVisitante: "",
        fechaInicio: "",
        
        ganadorTotal: {},
        dobleOportunidadTotal: {},
        ambosMarcanTotal: {},
        golesTotal: {},
        handicapTotal: {},
        cornersTotal: {},
        ganadorCorners: {},
        cornersLocalTotal: {},
        cornersVisitanteTotal: {},
        doCorners: {},
        shotsOnGoalHome: {},
        shotsOnGoalAway: {}
    };

    if (jsonKambi.events && jsonKambi.events.length > 0) {
        const event = jsonKambi.events[0];
        dataNormalizada.nombreLocal = event.homeName || "";
        dataNormalizada.nombreVisitante = event.awayName || "";
        dataNormalizada.fechaInicio = event.start || "";
    }

    if (!jsonKambi.betOffers) return dataNormalizada;

    jsonKambi.betOffers.forEach(offer => {
        const mercado = offer.criterion?.label || "";
        const tipoMercado = offer.betOfferType?.englishName || "";
        
        // --- AMBOS MARCAN (BTTS) ---
        if (mercado === "Ambos Equipos Marcarán") {
            offer.outcomes.forEach(o => {
                if (o.odds) {
                    if (o.type === "OT_YES") dataNormalizada.ambosMarcanTotal.si = o.odds / 1000;
                    if (o.type === "OT_NO") dataNormalizada.ambosMarcanTotal.no = o.odds / 1000;
                }
            });
        }

        // --- GANADOR PARTIDO (1X2) ---
        if (mercado === "Resultado Final") { 
            offer.outcomes.forEach(o => {
                if (o.odds) {
                    if (o.type === "OT_ONE") dataNormalizada.ganadorTotal.local = o.odds / 1000;
                    if (o.type === "OT_TWO") dataNormalizada.ganadorTotal.visitante = o.odds / 1000;
                    if (o.type === "OT_CROSS") dataNormalizada.ganadorTotal.empate = o.odds / 1000;
                }
            });
        }

        // --- TOTAL DE GOLES ---
        if (mercado === "Total de goles" || 
            mercado === "Total de goles - 1.ª parte" || 
            mercado === "Total de goles - 2.ª parte") {
            
            let key;
            if (mercado.includes("1.ª") || mercado.includes("1st")) {
                key = "goles1erTiempo";
            } else if (mercado.includes("2.ª") || mercado.includes("2nd")) {
                key = "goles2doTiempo";
            } else {
                key = "golesPartido";
            }
            
            if (!dataNormalizada.golesTotal[key]) {
                dataNormalizada.golesTotal[key] = {};
            }
            
            offer.outcomes.forEach(o => {
                if (!o.odds) return;
                
                let linea = (o.line / 1000).toString();
                if (linea.endsWith('.0')) {
                    linea = linea.replace('.0', '');
                }
                
                if (!dataNormalizada.golesTotal[key][linea]) {
                    dataNormalizada.golesTotal[key][linea] = {};
                }
                
                if (o.type === "OT_OVER") {
                    dataNormalizada.golesTotal[key][linea].mas = o.odds / 1000;
                } else if (o.type === "OT_UNDER") {
                    dataNormalizada.golesTotal[key][linea].menos = o.odds / 1000;
                }
            });
        }

        // --- TOTAL DE TIROS DE ESQUINA ---
        if (mercado === "Total de Tiros de Esquina" || 
            mercado === "Total de Tiros de Esquina - 1.ª parte" || 
            mercado === "Total de Tiros de Esquina - 2.ª parte") {
            
            let key;
            if (mercado.includes("1.ª") || mercado.includes("1st")) {
                key = "corners1erTiempo";
            } else if (mercado.includes("2.ª") || mercado.includes("2nd")) {
                key = "corners2doTiempo";
            } else {
                key = "partido";
            }
            
            if (!dataNormalizada.cornersTotal) {
                dataNormalizada.cornersTotal = {};
            }
            
            if (!dataNormalizada.cornersTotal[key]) {
                dataNormalizada.cornersTotal[key] = {};
            }
            
            offer.outcomes.forEach(o => {
                if (!o.odds) return;
                
                let linea = (o.line / 1000).toString();
                if (linea.endsWith('.0')) {
                    linea = linea.replace('.0', '');
                }
                
                if (!dataNormalizada.cornersTotal[key][linea]) {
                    dataNormalizada.cornersTotal[key][linea] = {};
                }
                
                if (o.type === "OT_OVER") {
                    dataNormalizada.cornersTotal[key][linea].mas = o.odds / 1000;
                } else if (o.type === "OT_UNDER") {
                    dataNormalizada.cornersTotal[key][linea].menos = o.odds / 1000;
                }
            });
        }

        // --- CORNERS LOCAL Y VISITANTE ---
        if (mercado.includes("Total de Tiros de Esquina a favor de")) {
            const nombreEquipo = mercado.replace("Total de Tiros de Esquina a favor de ", "").trim();
            
            let esLocal = nombreEquipo === dataNormalizada.nombreLocal;
            let esVisitante = nombreEquipo === dataNormalizada.nombreVisitante;
            
            if (!esLocal && !esVisitante) {
                esLocal = dataNormalizada.nombreLocal && nombreEquipo.includes(dataNormalizada.nombreLocal);
                esVisitante = dataNormalizada.nombreVisitante && nombreEquipo.includes(dataNormalizada.nombreVisitante);
            }
            
            let targetKey = null;
            if (esLocal) {
                targetKey = "cornersLocalTotal";
            } else if (esVisitante) {
                targetKey = "cornersVisitanteTotal";
            } else {
                return;
            }
            
            if (!dataNormalizada[targetKey]) {
                dataNormalizada[targetKey] = {};
            }
            
            offer.outcomes.forEach(o => {
                if (!o.odds) return;
                
                let linea = (o.line / 1000).toString();
                if (linea.endsWith('.0')) {
                    linea = linea.replace('.0', '');
                }
                
                if (!dataNormalizada[targetKey][linea]) {
                    dataNormalizada[targetKey][linea] = {};
                }
                
                if (o.type === "OT_OVER") {
                    dataNormalizada[targetKey][linea].mas = o.odds / 1000;
                } else if (o.type === "OT_UNDER") {
                    dataNormalizada[targetKey][linea].menos = o.odds / 1000;
                }
            });
        }

        // --- DOBLE OPORTUNIDAD ---
        if (mercado === "Doble Oportunidad") {
            offer.outcomes.forEach(o => {
                if (o.odds) {
                    if (o.type === "OT_ONE_OR_CROSS") dataNormalizada.dobleOportunidadTotal["1X"] = o.odds / 1000;
                    if (o.type === "OT_ONE_OR_TWO") dataNormalizada.dobleOportunidadTotal["12"] = o.odds / 1000;
                    if (o.type === "OT_CROSS_OR_TWO") dataNormalizada.dobleOportunidadTotal["X2"] = o.odds / 1000;
                }
            });
        }
        
        // --- GANADOR CORNERS ---
        if (mercado === "Más Tiros de Esquina") {
            offer.outcomes.forEach(o => {
                if (o.odds) {
                    if (o.type === "OT_ONE") dataNormalizada.ganadorCorners["1"] = o.odds / 1000;
                    if (o.type === "OT_CROSS") dataNormalizada.ganadorCorners["X"] = o.odds / 1000;
                    if (o.type === "OT_TWO") dataNormalizada.ganadorCorners["2"] = o.odds / 1000;
                }
            });
        }

        // --- DOBLE OPORTUNIDAD CORNERS ---
        if (mercado === "Doble Oportunidad - Tiros de Esquina" || 
            mercado === "Doble Oportunidad de Tiros de Esquina") {
            offer.outcomes.forEach(o => {
                if (o.odds) {
                    if (o.type === "OT_ONE_OR_CROSS") dataNormalizada.doCorners["1X"] = o.odds / 1000;
                    if (o.type === "OT_ONE_OR_TWO") dataNormalizada.doCorners["12"] = o.odds / 1000;
                    if (o.type === "OT_CROSS_OR_TWO") dataNormalizada.doCorners["X2"] = o.odds / 1000;
                }
            });
        }

        // --- TIROS A PUERTA LOCAL Y VISITANTE ---
        if (mercado.includes("Total de tiros a puerta por parte de")) {
            const nombreEquipo = mercado.replace("Total de tiros a puerta por parte de ", "").trim();
            
            let esLocal = nombreEquipo === dataNormalizada.nombreLocal;
            let esVisitante = nombreEquipo === dataNormalizada.nombreVisitante;
            
            if (!esLocal && !esVisitante) {
                esLocal = dataNormalizada.nombreLocal && nombreEquipo.includes(dataNormalizada.nombreLocal);
                esVisitante = dataNormalizada.nombreVisitante && nombreEquipo.includes(dataNormalizada.nombreVisitante);
            }
            
            let targetKey = null;
            if (esLocal) {
                targetKey = "shotsOnGoalHome";
            } else if (esVisitante) {
                targetKey = "shotsOnGoalAway";
            } else {
                return;
            }
            
            if (!dataNormalizada[targetKey]) {
                dataNormalizada[targetKey] = {};
            }
            
            offer.outcomes.forEach(o => {
                if (!o.odds) return;
                
                let linea = (o.line / 1000).toString();
                if (linea.endsWith('.0')) {
                    linea = linea.replace('.0', '');
                }
                
                if (!dataNormalizada[targetKey][linea]) {
                    dataNormalizada[targetKey][linea] = {};
                }
                
                if (o.type === "OT_OVER") {
                    dataNormalizada[targetKey][linea].mas = o.odds / 1000;
                } else if (o.type === "OT_UNDER") {
                    dataNormalizada[targetKey][linea].menos = o.odds / 1000;
                }
            });
        }

        // --- HÁNDICAP ASIÁTICO ---
        if (mercado === "Hándicap Asiático " || mercado === "Hándicap Asiático") {
            if (!dataNormalizada.handicapTotal) {
                dataNormalizada.handicapTotal = {};
            }
            
            let localOdds = null;
            let visitanteOdds = null;
            let lineaHandicap = null;
            
            offer.outcomes.forEach(o => {
                if (!o.odds) return;
                
                const linea = (o.line / 1000).toString();
                lineaHandicap = linea;
                
                const nombreParticipante = o.participant || o.label || "";
                let esLocal = nombreParticipante === dataNormalizada.nombreLocal;
                let esVisitante = nombreParticipante === dataNormalizada.nombreVisitante;
                
                if (!esLocal && !esVisitante) {
                    esLocal = dataNormalizada.nombreLocal && nombreParticipante.includes(dataNormalizada.nombreLocal);
                    esVisitante = dataNormalizada.nombreVisitante && nombreParticipante.includes(dataNormalizada.nombreVisitante);
                }
                
                if (esLocal) {
                    localOdds = o.odds / 1000;
                } else if (esVisitante) {
                    visitanteOdds = o.odds / 1000;
                }
            });
            
            if (lineaHandicap !== null && localOdds !== null && visitanteOdds !== null) {
                let clave = Math.abs(parseFloat(lineaHandicap)).toString();
                if (clave.endsWith('.0')) {
                    clave = clave.replace('.0', '');
                }
                
                if (!dataNormalizada.handicapTotal[clave]) {
                    dataNormalizada.handicapTotal[clave] = {};
                }
                
                dataNormalizada.handicapTotal[clave].local = localOdds;
                dataNormalizada.handicapTotal[clave].visitante = visitanteOdds;
            }
        }
    });

    return dataNormalizada;
}

function detectarSurebets(datos1xBet, datosKambi) {
    const surebets = [];
    
    function calcularSurebet(odds1, odds2) {
        if (!odds1 || !odds2) return null;
        
        const porcentaje = (1 / odds1) + (1 / odds2);
        const retorno = 1 / porcentaje;
        const beneficio = (retorno - 1) * 100;
        
        return {
            porcentaje: porcentaje,
            retorno: retorno,
            beneficio: beneficio,
            apuesta1: (1 / odds1) / porcentaje,
            apuesta2: (1 / odds2) / porcentaje
        };
    }
    
    function redondear(numero, decimales = 2) {
        if (typeof numero !== 'number') return numero;
        return Number(numero.toFixed(decimales));
    }
    
    function formatearSurebet(tipo, mercado, linea, bookie1, odds1, bookie2, odds2, beneficio, apuesta1, apuesta2, detalle1, detalle2) {
        return {
            tipo: tipo,
            mercado: mercado,
            linea: linea || "N/A",
            bookie1: bookie1,
            odds1: redondear(odds1),
            bookie2: bookie2,
            odds2: redondear(odds2),
            beneficio: beneficio.toFixed(2) + "%",
            apuesta1: apuesta1 ? apuesta1.toFixed(2) : "N/A",
            apuesta2: apuesta2 ? apuesta2.toFixed(2) : "N/A",
            detalle1: detalle1 || "",
            detalle2: detalle2 || ""
        };
    }
    
    // ============================
    // 1. GANADOR PARTIDO (1X2)
    // ============================
    const ganador1xBet = datos1xBet.ganadorTotal || {};
    const ganadorKambi = datosKambi.ganadorTotal || {};
    
    if (Object.keys(ganador1xBet).length > 0 && Object.keys(ganadorKambi).length > 0) {
        if (ganador1xBet.local && ganadorKambi.empate && ganadorKambi.visitante) {
            const odds1 = ganador1xBet.local;
            const odds2 = (1 / ganadorKambi.empate + 1 / ganadorKambi.visitante) > 0 ? 
                          (1 / ((1 / ganadorKambi.empate) + (1 / ganadorKambi.visitante))) : 0;
            
            if (odds2 > 0) {
                const result = calcularSurebet(odds1, odds2);
                if (result && result.beneficio > 0) {
                    surebets.push(formatearSurebet(
                        "1 vs X2",
                        "Ganador Partido",
                        "N/A",
                        "1xBet",
                        odds1,
                        "BetPlay",
                        odds2,
                        result.beneficio,
                        result.apuesta1,
                        result.apuesta2,
                        `Local (${redondear(odds1)})`,
                        `X2 (${redondear(odds2)})`
                    ));
                }
            }
        }
        
        if (ganador1xBet.empate && ganadorKambi.local && ganadorKambi.visitante) {
            const odds1 = ganador1xBet.empate;
            const odds2 = (1 / ganadorKambi.local + 1 / ganadorKambi.visitante) > 0 ? 
                          (1 / ((1 / ganadorKambi.local) + (1 / ganadorKambi.visitante))) : 0;
            
            if (odds2 > 0) {
                const result = calcularSurebet(odds1, odds2);
                if (result && result.beneficio > 0) {
                    surebets.push(formatearSurebet(
                        "X vs 12",
                        "Ganador Partido",
                        "N/A",
                        "1xBet",
                        odds1,
                        "BetPlay",
                        odds2,
                        result.beneficio,
                        result.apuesta1,
                        result.apuesta2,
                        `Empate (${redondear(odds1)})`,
                        `12 (${redondear(odds2)})`
                    ));
                }
            }
        }
        
        if (ganador1xBet.visitante && ganadorKambi.local && ganadorKambi.empate) {
            const odds1 = ganador1xBet.visitante;
            const odds2 = (1 / ganadorKambi.local + 1 / ganadorKambi.empate) > 0 ? 
                          (1 / ((1 / ganadorKambi.local) + (1 / ganadorKambi.empate))) : 0;
            
            if (odds2 > 0) {
                const result = calcularSurebet(odds1, odds2);
                if (result && result.beneficio > 0) {
                    surebets.push(formatearSurebet(
                        "2 vs 1X",
                        "Ganador Partido",
                        "N/A",
                        "1xBet",
                        odds1,
                        "BetPlay",
                        odds2,
                        result.beneficio,
                        result.apuesta1,
                        result.apuesta2,
                        `Visitante (${redondear(odds1)})`,
                        `1X (${redondear(odds2)})`
                    ));
                }
            }
        }
    }
    
    // ========================
    // 2. DOBLE OPORTUNIDAD
    // ========================
    const doble1xBet = datos1xBet.dobleOportunidadTotal || {};
    const dobleKambi = datosKambi.dobleOportunidadTotal || {};
    
    if (Object.keys(doble1xBet).length > 0 && Object.keys(dobleKambi).length > 0) {
        if (doble1xBet["1X"] && dobleKambi["X2"]) {
            const result = calcularSurebet(doble1xBet["1X"], dobleKambi["X2"]);
            if (result && result.beneficio > 0) {
                surebets.push(formatearSurebet(
                    "1X vs X2",
                    "Doble Oportunidad",
                    "N/A",
                    "1xBet",
                    doble1xBet["1X"],
                    "BetPlay",
                    dobleKambi["X2"],
                    result.beneficio,
                    result.apuesta1,
                    result.apuesta2,
                    `1X (${redondear(doble1xBet["1X"])})`,
                    `X2 (${redondear(dobleKambi["X2"])})`
                ));
            }
        }
        
        if (doble1xBet["12"] && dobleKambi["1X"]) {
            const result = calcularSurebet(doble1xBet["12"], dobleKambi["1X"]);
            if (result && result.beneficio > 0) {
                surebets.push(formatearSurebet(
                    "12 vs 1X",
                    "Doble Oportunidad",
                    "N/A",
                    "1xBet",
                    doble1xBet["12"],
                    "BetPlay",
                    dobleKambi["1X"],
                    result.beneficio,
                    result.apuesta1,
                    result.apuesta2,
                    `12 (${redondear(doble1xBet["12"])})`,
                    `1X (${redondear(dobleKambi["1X"])})`
                ));
            }
        }
        
        if (doble1xBet["12"] && dobleKambi["X2"]) {
            const result = calcularSurebet(doble1xBet["12"], dobleKambi["X2"]);
            if (result && result.beneficio > 0) {
                surebets.push(formatearSurebet(
                    "12 vs X2",
                    "Doble Oportunidad",
                    "N/A",
                    "1xBet",
                    doble1xBet["12"],
                    "BetPlay",
                    dobleKambi["X2"],
                    result.beneficio,
                    result.apuesta1,
                    result.apuesta2,
                    `12 (${redondear(doble1xBet["12"])})`,
                    `X2 (${redondear(dobleKambi["X2"])})`
                ));
            }
        }
    }
    
    // ========================
    // 3. AMBOS MARCAN (BTTS)
    // ========================
    const ambos1xBet = datos1xBet.ambosMarcanTotal || {};
    const ambosKambi = datosKambi.ambosMarcanTotal || {};
    
    if (ambos1xBet.si && ambosKambi.no) {
        const result = calcularSurebet(ambos1xBet.si, ambosKambi.no);
        if (result && result.beneficio > 0) {
            surebets.push(formatearSurebet(
                "Sí vs No",
                "Ambos Marcan",
                "N/A",
                "1xBet",
                ambos1xBet.si,
                "BetPlay",
                ambosKambi.no,
                result.beneficio,
                result.apuesta1,
                result.apuesta2,
                `Sí (${redondear(ambos1xBet.si)})`,
                `No (${redondear(ambosKambi.no)})`
            ));
        }
    }
    
    if (ambos1xBet.no && ambosKambi.si) {
        const result = calcularSurebet(ambos1xBet.no, ambosKambi.si);
        if (result && result.beneficio > 0) {
            surebets.push(formatearSurebet(
                "No vs Sí",
                "Ambos Marcan",
                "N/A",
                "1xBet",
                ambos1xBet.no,
                "BetPlay",
                ambosKambi.si,
                result.beneficio,
                result.apuesta1,
                result.apuesta2,
                `No (${redondear(ambos1xBet.no)})`,
                `Sí (${redondear(ambosKambi.si)})`
            ));
        }
    }
    
    // ====================
    // 4. TOTAL DE GOLES
    // ====================
    const goles1xBet = datos1xBet.golesTotal || {};
    const golesKambi = datosKambi.golesTotal || {};
    
    if (goles1xBet.golesPartido && golesKambi.golesPartido) {
        const lineas1xBet = Object.keys(goles1xBet.golesPartido);
        const lineasKambi = Object.keys(golesKambi.golesPartido);
        const lineasComunes = lineas1xBet.filter(linea => lineasKambi.includes(linea));
        
        lineasComunes.forEach(linea => {
            const over1 = goles1xBet.golesPartido[linea]?.mas;
            const under1 = goles1xBet.golesPartido[linea]?.menos;
            const overK = golesKambi.golesPartido[linea]?.mas;
            const underK = golesKambi.golesPartido[linea]?.menos;
            
            if (over1 && underK) {
                const result = calcularSurebet(over1, underK);
                if (result && result.beneficio > 0) {
                    surebets.push(formatearSurebet(
                        "Over vs Under",
                        "Goles Total",
                        linea,
                        "1xBet",
                        over1,
                        "BetPlay",
                        underK,
                        result.beneficio,
                        result.apuesta1,
                        result.apuesta2,
                        `+${linea} (${redondear(over1)})`,
                        `-${linea} (${redondear(underK)})`
                    ));
                }
            }
            
            if (under1 && overK) {
                const result = calcularSurebet(under1, overK);
                if (result && result.beneficio > 0) {
                    surebets.push(formatearSurebet(
                        "Under vs Over",
                        "Goles Total",
                        linea,
                        "1xBet",
                        under1,
                        "BetPlay",
                        overK,
                        result.beneficio,
                        result.apuesta1,
                        result.apuesta2,
                        `-${linea} (${redondear(under1)})`,
                        `+${linea} (${redondear(overK)})`
                    ));
                }
            }
        });
    }
    
    // ===================
    // 5. CORNERS TOTAL
    // ===================
    const corners1xBet = datos1xBet.cornersTotal || {};
    const cornersKambi = datosKambi.cornersTotal || {};
    
    if (corners1xBet && cornersKambi && cornersKambi.partido) {
        const lineas1xBet = Object.keys(corners1xBet);
        const lineasKambi = Object.keys(cornersKambi.partido);
        const lineasComunes = lineas1xBet.filter(linea => lineasKambi.includes(linea));
        
        lineasComunes.forEach(linea => {
            const over1 = corners1xBet[linea]?.mas;
            const under1 = corners1xBet[linea]?.menos;
            const overK = cornersKambi.partido[linea]?.mas;
            const underK = cornersKambi.partido[linea]?.menos;
            
            if (over1 && underK) {
                const result = calcularSurebet(over1, underK);
                if (result && result.beneficio > 0) {
                    surebets.push(formatearSurebet(
                        "Over vs Under",
                        "Corners Total",
                        linea,
                        "1xBet",
                        over1,
                        "BetPlay",
                        underK,
                        result.beneficio,
                        result.apuesta1,
                        result.apuesta2,
                        `+${linea} (${redondear(over1)})`,
                        `-${linea} (${redondear(underK)})`
                    ));
                }
            }
            
            if (under1 && overK) {
                const result = calcularSurebet(under1, overK);
                if (result && result.beneficio > 0) {
                    surebets.push(formatearSurebet(
                        "Under vs Over",
                        "Corners Total",
                        linea,
                        "1xBet",
                        under1,
                        "BetPlay",
                        overK,
                        result.beneficio,
                        result.apuesta1,
                        result.apuesta2,
                        `-${linea} (${redondear(under1)})`,
                        `+${linea} (${redondear(overK)})`
                    ));
                }
            }
        });
    }
    
    // =====================
    // 6. GANADOR CORNERS
    // =====================
    const ganadorCorners1xBet = datos1xBet.ganadorCorners || {};
    const ganadorCornersKambi = datosKambi.ganadorCorners || {};
    
    if (Object.keys(ganadorCorners1xBet).length > 0 && Object.keys(ganadorCornersKambi).length > 0) {
        if (ganadorCorners1xBet["1"] && ganadorCornersKambi["X"] && ganadorCornersKambi["2"]) {
            const odds1 = ganadorCorners1xBet["1"];
            const odds2 = (1 / ganadorCornersKambi["X"] + 1 / ganadorCornersKambi["2"]) > 0 ? 
                          (1 / ((1 / ganadorCornersKambi["X"]) + (1 / ganadorCornersKambi["2"]))) : 0;
            
            if (odds2 > 0) {
                const result = calcularSurebet(odds1, odds2);
                if (result && result.beneficio > 0) {
                    surebets.push(formatearSurebet(
                        "1 vs X2",
                        "Ganador Corners",
                        "N/A",
                        "1xBet",
                        odds1,
                        "BetPlay",
                        odds2,
                        result.beneficio,
                        result.apuesta1,
                        result.apuesta2,
                        `1 (${redondear(odds1)})`,
                        `X2 (${redondear(odds2)})`
                    ));
                }
            }
        }
        
        if (ganadorCorners1xBet["2"] && ganadorCornersKambi["1"] && ganadorCornersKambi["X"]) {
            const odds1 = ganadorCorners1xBet["2"];
            const odds2 = (1 / ganadorCornersKambi["1"] + 1 / ganadorCornersKambi["X"]) > 0 ? 
                          (1 / ((1 / ganadorCornersKambi["1"]) + (1 / ganadorCornersKambi["X"]))) : 0;
            
            if (odds2 > 0) {
                const result = calcularSurebet(odds1, odds2);
                if (result && result.beneficio > 0) {
                    surebets.push(formatearSurebet(
                        "2 vs 1X",
                        "Ganador Corners",
                        "N/A",
                        "1xBet",
                        odds1,
                        "BetPlay",
                        odds2,
                        result.beneficio,
                        result.apuesta1,
                        result.apuesta2,
                        `2 (${redondear(odds1)})`,
                        `1X (${redondear(odds2)})`
                    ));
                }
            }
        }
    }
    
    // =======================
    // 7. CORNERS LOCAL
    // =======================
    const cornersLocal1xBet = datos1xBet.cornersLocalTotal || {};
    const cornersLocalKambi = datosKambi.cornersLocalTotal || {};
    
    if (Object.keys(cornersLocal1xBet).length > 0 && Object.keys(cornersLocalKambi).length > 0) {
        const lineas1xBet = Object.keys(cornersLocal1xBet);
        const lineasKambi = Object.keys(cornersLocalKambi);
        const lineasComunes = lineas1xBet.filter(linea => lineasKambi.includes(linea));
        
        lineasComunes.forEach(linea => {
            const over1 = cornersLocal1xBet[linea]?.mas;
            const under1 = cornersLocal1xBet[linea]?.menos;
            const overK = cornersLocalKambi[linea]?.mas;
            const underK = cornersLocalKambi[linea]?.menos;
            
            if (over1 && underK) {
                const result = calcularSurebet(over1, underK);
                if (result && result.beneficio > 0) {
                    surebets.push(formatearSurebet(
                        "Over vs Under",
                        "Corners Local",
                        linea,
                        "1xBet",
                        over1,
                        "BetPlay",
                        underK,
                        result.beneficio,
                        result.apuesta1,
                        result.apuesta2,
                        `+${linea} (${redondear(over1)})`,
                        `-${linea} (${redondear(underK)})`
                    ));
                }
            }
            
            if (under1 && overK) {
                const result = calcularSurebet(under1, overK);
                if (result && result.beneficio > 0) {
                    surebets.push(formatearSurebet(
                        "Under vs Over",
                        "Corners Local",
                        linea,
                        "1xBet",
                        under1,
                        "BetPlay",
                        overK,
                        result.beneficio,
                        result.apuesta1,
                        result.apuesta2,
                        `-${linea} (${redondear(under1)})`,
                        `+${linea} (${redondear(overK)})`
                    ));
                }
            }
        });
    }
    
    // ======================
    // 8. CORNERS VISITANTE
    // ======================
    const cornersVisitante1xBet = datos1xBet.cornersVisitanteTotal || {};
    const cornersVisitanteKambi = datosKambi.cornersVisitanteTotal || {};
    
    if (Object.keys(cornersVisitante1xBet).length > 0 && Object.keys(cornersVisitanteKambi).length > 0) {
        const lineas1xBet = Object.keys(cornersVisitante1xBet);
        const lineasKambi = Object.keys(cornersVisitanteKambi);
        const lineasComunes = lineas1xBet.filter(linea => lineasKambi.includes(linea));
        
        lineasComunes.forEach(linea => {
            const over1 = cornersVisitante1xBet[linea]?.mas;
            const under1 = cornersVisitante1xBet[linea]?.menos;
            const overK = cornersVisitanteKambi[linea]?.mas;
            const underK = cornersVisitanteKambi[linea]?.menos;
            
            if (over1 && underK) {
                const result = calcularSurebet(over1, underK);
                if (result && result.beneficio > 0) {
                    surebets.push(formatearSurebet(
                        "Over vs Under",
                        "Corners Visitante",
                        linea,
                        "1xBet",
                        over1,
                        "BetPlay",
                        underK,
                        result.beneficio,
                        result.apuesta1,
                        result.apuesta2,
                        `+${linea} (${redondear(over1)})`,
                        `-${linea} (${redondear(underK)})`
                    ));
                }
            }
            
            if (under1 && overK) {
                const result = calcularSurebet(under1, overK);
                if (result && result.beneficio > 0) {
                    surebets.push(formatearSurebet(
                        "Under vs Over",
                        "Corners Visitante",
                        linea,
                        "1xBet",
                        under1,
                        "BetPlay",
                        overK,
                        result.beneficio,
                        result.apuesta1,
                        result.apuesta2,
                        `-${linea} (${redondear(under1)})`,
                        `+${linea} (${redondear(overK)})`
                    ));
                }
            }
        });
    }
    
    // ==========================
    // 9. TIROS A PUERTA LOCAL
    // ==========================
    const shotsOnGoalHome1xBet = datos1xBet.shotsOnGoalHome || {};
    const shotsOnGoalHomeKambi = datosKambi.shotsOnGoalHome || {};
    
    if (Object.keys(shotsOnGoalHome1xBet).length > 0 && Object.keys(shotsOnGoalHomeKambi).length > 0) {
        const lineas1xBet = Object.keys(shotsOnGoalHome1xBet);
        const lineasKambi = Object.keys(shotsOnGoalHomeKambi);
        const lineasComunes = lineas1xBet.filter(linea => lineasKambi.includes(linea));
        
        lineasComunes.forEach(linea => {
            const over1 = shotsOnGoalHome1xBet[linea]?.mas;
            const under1 = shotsOnGoalHome1xBet[linea]?.menos;
            const overK = shotsOnGoalHomeKambi[linea]?.mas;
            const underK = shotsOnGoalHomeKambi[linea]?.menos;
            
            if (over1 && underK) {
                const result = calcularSurebet(over1, underK);
                if (result && result.beneficio > 0) {
                    surebets.push(formatearSurebet(
                        "Over vs Under",
                        "Tiros a Puerta Local",
                        linea,
                        "1xBet",
                        over1,
                        "BetPlay",
                        underK,
                        result.beneficio,
                        result.apuesta1,
                        result.apuesta2,
                        `+${linea} (${redondear(over1)})`,
                        `-${linea} (${redondear(underK)})`
                    ));
                }
            }
            
            if (under1 && overK) {
                const result = calcularSurebet(under1, overK);
                if (result && result.beneficio > 0) {
                    surebets.push(formatearSurebet(
                        "Under vs Over",
                        "Tiros a Puerta Local",
                        linea,
                        "1xBet",
                        under1,
                        "BetPlay",
                        overK,
                        result.beneficio,
                        result.apuesta1,
                        result.apuesta2,
                        `-${linea} (${redondear(under1)})`,
                        `+${linea} (${redondear(overK)})`
                    ));
                }
            }
        });
    }
    
    // ===============================
    // 10. TIROS A PUERTA VISITANTE
    // ===============================
    const shotsOnGoalAway1xBet = datos1xBet.shotsOnGoalAway || {};
    const shotsOnGoalAwayKambi = datosKambi.shotsOnGoalAway || {};
    
    if (Object.keys(shotsOnGoalAway1xBet).length > 0 && Object.keys(shotsOnGoalAwayKambi).length > 0) {
        const lineas1xBet = Object.keys(shotsOnGoalAway1xBet);
        const lineasKambi = Object.keys(shotsOnGoalAwayKambi);
        const lineasComunes = lineas1xBet.filter(linea => lineasKambi.includes(linea));
        
        lineasComunes.forEach(linea => {
            const over1 = shotsOnGoalAway1xBet[linea]?.mas;
            const under1 = shotsOnGoalAway1xBet[linea]?.menos;
            const overK = shotsOnGoalAwayKambi[linea]?.mas;
            const underK = shotsOnGoalAwayKambi[linea]?.menos;
            
            if (over1 && underK) {
                const result = calcularSurebet(over1, underK);
                if (result && result.beneficio > 0) {
                    surebets.push(formatearSurebet(
                        "Over vs Under",
                        "Tiros a Puerta Visitante",
                        linea,
                        "1xBet",
                        over1,
                        "BetPlay",
                        underK,
                        result.beneficio,
                        result.apuesta1,
                        result.apuesta2,
                        `+${linea} (${redondear(over1)})`,
                        `-${linea} (${redondear(underK)})`
                    ));
                }
            }
            
            if (under1 && overK) {
                const result = calcularSurebet(under1, overK);
                if (result && result.beneficio > 0) {
                    surebets.push(formatearSurebet(
                        "Under vs Over",
                        "Tiros a Puerta Visitante",
                        linea,
                        "1xBet",
                        under1,
                        "BetPlay",
                        overK,
                        result.beneficio,
                        result.apuesta1,
                        result.apuesta2,
                        `-${linea} (${redondear(under1)})`,
                        `+${linea} (${redondear(overK)})`
                    ));
                }
            }
        });
    }
    
    // =========================
    // 11. HÁNDICAP ASIÁTICO
    // =========================
    const handicap1xBet = datos1xBet.handicapTotal || {};
    const handicapKambi = datosKambi.handicapTotal || {};
    
    if (Object.keys(handicap1xBet).length > 0 && Object.keys(handicapKambi).length > 0) {
        const lineas1xBet = Object.keys(handicap1xBet);
        const lineasKambi = Object.keys(handicapKambi);
        const lineasComunes = lineas1xBet.filter(linea => lineasKambi.includes(linea));
        
        lineasComunes.forEach(linea => {
            const local1 = handicap1xBet[linea]?.local;
            const visitante1 = handicap1xBet[linea]?.visitante;
            const localK = handicapKambi[linea]?.local;
            const visitanteK = handicapKambi[linea]?.visitante;
            
            if (local1 && visitanteK) {
                const result = calcularSurebet(local1, visitanteK);
                if (result && result.beneficio > 0) {
                    surebets.push(formatearSurebet(
                        "Local vs Visitante",
                        "Hándicap Asiático",
                        linea,
                        "1xBet",
                        local1,
                        "BetPlay",
                        visitanteK,
                        result.beneficio,
                        result.apuesta1,
                        result.apuesta2,
                        `Local -${linea} (${redondear(local1)})`,
                        `Visitante +${linea} (${redondear(visitanteK)})`
                    ));
                }
            }
            
            if (visitante1 && localK) {
                const result = calcularSurebet(visitante1, localK);
                if (result && result.beneficio > 0) {
                    surebets.push(formatearSurebet(
                        "Visitante vs Local",
                        "Hándicap Asiático",
                        linea,
                        "1xBet",
                        visitante1,
                        "BetPlay",
                        localK,
                        result.beneficio,
                        result.apuesta1,
                        result.apuesta2,
                        `Visitante +${linea} (${redondear(visitante1)})`,
                        `Local -${linea} (${redondear(localK)})`
                    ));
                }
            }
        });
    }
    
    // ===============================
    // 12. DOBLE OPORTUNIDAD CORNERS
    // ===============================
    const doCorners1xBet = datos1xBet.doCorners || {};
    const doCornersKambi = datosKambi.doCorners || {};
    
    if (Object.keys(doCorners1xBet).length > 0 && Object.keys(doCornersKambi).length > 0) {
        if (doCorners1xBet["1X"] && doCornersKambi["X2"]) {
            const result = calcularSurebet(doCorners1xBet["1X"], doCornersKambi["X2"]);
            if (result && result.beneficio > 0) {
                surebets.push(formatearSurebet(
                    "1X vs X2",
                    "Doble Oportunidad Corners",
                    "N/A",
                    "1xBet",
                    doCorners1xBet["1X"],
                    "BetPlay",
                    doCornersKambi["X2"],
                    result.beneficio,
                    result.apuesta1,
                    result.apuesta2,
                    `1X (${redondear(doCorners1xBet["1X"])})`,
                    `X2 (${redondear(doCornersKambi["X2"])})`
                ));
            }
        }
        
        if (doCorners1xBet["12"] && doCornersKambi["1X"]) {
            const result = calcularSurebet(doCorners1xBet["12"], doCornersKambi["1X"]);
            if (result && result.beneficio > 0) {
                surebets.push(formatearSurebet(
                    "12 vs 1X",
                    "Doble Oportunidad Corners",
                    "N/A",
                    "1xBet",
                    doCorners1xBet["12"],
                    "BetPlay",
                    doCornersKambi["1X"],
                    result.beneficio,
                    result.apuesta1,
                    result.apuesta2,
                    `12 (${redondear(doCorners1xBet["12"])})`,
                    `1X (${redondear(doCornersKambi["1X"])})`
                ));
            }
        }
        
        if (doCorners1xBet["12"] && doCornersKambi["X2"]) {
            const result = calcularSurebet(doCorners1xBet["12"], doCornersKambi["X2"]);
            if (result && result.beneficio > 0) {
                surebets.push(formatearSurebet(
                    "12 vs X2",
                    "Doble Oportunidad Corners",
                    "N/A",
                    "1xBet",
                    doCorners1xBet["12"],
                    "BetPlay",
                    doCornersKambi["X2"],
                    result.beneficio,
                    result.apuesta1,
                    result.apuesta2,
                    `12 (${redondear(doCorners1xBet["12"])})`,
                    `X2 (${redondear(doCornersKambi["X2"])})`
                ));
            }
        }
    }
    
    // ===================================================
    // 13. GANADOR CORNERS vs DOBLE OPORTUNIDAD CORNERS
    // ===================================================
    const ganadorCorners1xBet2 = datos1xBet.ganadorCorners || {};
    const ganadorCornersKambi2 = datosKambi.ganadorCorners || {};
    const doCorners1xBet2 = datos1xBet.doCorners || {};
    const doCornersKambi2 = datosKambi.doCorners || {};
    
    // Ganador en BetPlay vs Doble en 1xBet
    if (Object.keys(ganadorCornersKambi2).length > 0 && Object.keys(doCorners1xBet2).length > 0) {
        if (ganadorCornersKambi2["1"] && doCorners1xBet2["X2"]) {
            const result = calcularSurebet(ganadorCornersKambi2["1"], doCorners1xBet2["X2"]);
            if (result && result.beneficio > 0) {
                surebets.push(formatearSurebet(
                    "1 vs X2",
                    "Corners (Ganador vs Doble)",
                    "N/A",
                    "BetPlay",
                    ganadorCornersKambi2["1"],
                    "1xBet",
                    doCorners1xBet2["X2"],
                    result.beneficio,
                    result.apuesta1,
                    result.apuesta2,
                    `1 (${redondear(ganadorCornersKambi2["1"])})`,
                    `X2 (${redondear(doCorners1xBet2["X2"])})`
                ));
            }
        }
        
        if (ganadorCornersKambi2["2"] && doCorners1xBet2["1X"]) {
            const result = calcularSurebet(ganadorCornersKambi2["2"], doCorners1xBet2["1X"]);
            if (result && result.beneficio > 0) {
                surebets.push(formatearSurebet(
                    "2 vs 1X",
                    "Corners (Ganador vs Doble)",
                    "N/A",
                    "BetPlay",
                    ganadorCornersKambi2["2"],
                    "1xBet",
                    doCorners1xBet2["1X"],
                    result.beneficio,
                    result.apuesta1,
                    result.apuesta2,
                    `2 (${redondear(ganadorCornersKambi2["2"])})`,
                    `1X (${redondear(doCorners1xBet2["1X"])})`
                ));
            }
        }
    }
    
    // Ganador en 1xBet vs Doble en BetPlay
    if (Object.keys(ganadorCorners1xBet2).length > 0 && Object.keys(doCornersKambi2).length > 0) {
        if (ganadorCorners1xBet2["1"] && doCornersKambi2["X2"]) {
            const result = calcularSurebet(ganadorCorners1xBet2["1"], doCornersKambi2["X2"]);
            if (result && result.beneficio > 0) {
                surebets.push(formatearSurebet(
                    "1 vs X2",
                    "Corners (Ganador vs Doble)",
                    "N/A",
                    "1xBet",
                    ganadorCorners1xBet2["1"],
                    "BetPlay",
                    doCornersKambi2["X2"],
                    result.beneficio,
                    result.apuesta1,
                    result.apuesta2,
                    `1 (${redondear(ganadorCorners1xBet2["1"])})`,
                    `X2 (${redondear(doCornersKambi2["X2"])})`
                ));
            }
        }
        
        if (ganadorCorners1xBet2["2"] && doCornersKambi2["1X"]) {
            const result = calcularSurebet(ganadorCorners1xBet2["2"], doCornersKambi2["1X"]);
            if (result && result.beneficio > 0) {
                surebets.push(formatearSurebet(
                    "2 vs 1X",
                    "Corners (Ganador vs Doble)",
                    "N/A",
                    "1xBet",
                    ganadorCorners1xBet2["2"],
                    "BetPlay",
                    doCornersKambi2["1X"],
                    result.beneficio,
                    result.apuesta1,
                    result.apuesta2,
                    `2 (${redondear(ganadorCorners1xBet2["2"])})`,
                    `1X (${redondear(doCornersKambi2["1X"])})`
                ));
            }
        }
    }
    
    surebets.sort((a, b) => {
        const beneficioA = parseFloat(a.beneficio);
        const beneficioB = parseFloat(b.beneficio);
        return beneficioB - beneficioA;
    });
    
    return surebets;
}

module.exports = {
    extraerDatos1xBet,
    extraerDatosKambi,
    detectarSurebets
};