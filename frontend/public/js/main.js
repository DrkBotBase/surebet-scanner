const state = {
    results: JSON.parse(localStorage.getItem('surebetResults') || '[]'),
    loading: false,
    theme: localStorage.getItem('theme') || 'dark',
    modalIndex: null,
    currentTab: 'surebets'
};

function initTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    updateThemeIcon();
}

function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('theme', state.theme);
    updateThemeIcon();
}

function updateThemeIcon() {
    const icon = document.querySelector('.theme-icon');
    if (!icon) return;
    
    if (state.theme === 'dark') {
        icon.innerHTML = `
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        `;
    } else {
        icon.innerHTML = `
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        `;
    }
}

function toggleStats() {
    const content = document.getElementById('statsContent');
    content.classList.toggle('hidden');
    const toggle = document.querySelector('.stats-toggle svg');
    if (toggle) {
        toggle.style.transform = content.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
    }
}

function saveToStorage() {
    localStorage.setItem('surebetResults', JSON.stringify(state.results));
}

function getProfit(surebets) {
    if (!surebets || surebets.length === 0) return 0;
    const maxProfit = Math.max(...surebets.map(s => parseFloat(s.beneficio)));
    return maxProfit || 0;
}

function formatProfit(profit) {
    return profit.toFixed(2) + '%';
}

function formatearFechaInicio(fechaISO) {
    if (!fechaISO) return 'Fecha no disponible';
    try {
        const fecha = new Date(fechaISO);
        const opciones = {
            timeZone: 'America/Bogota',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        };
        const formatter = new Intl.DateTimeFormat('es-CO', opciones);
        const partes = formatter.formatToParts(fecha);
        const dia = partes.find(p => p.type === 'day')?.value || '';
        const mes = partes.find(p => p.type === 'month')?.value || '';
        const anio = partes.find(p => p.type === 'year')?.value || '';
        const hora = partes.find(p => p.type === 'hour')?.value || '';
        const minuto = partes.find(p => p.type === 'minute')?.value || '';
        return `${dia}.${mes}.${anio} - ${hora}:${minuto}`;
    } catch (error) {
        return fechaISO;
    }
}

function formatearFechaRelativa(fechaISO) {
    if (!fechaISO) return '';
    try {
        const ahora = new Date();
        const fecha = new Date(fechaISO);
        const diffMs = fecha - ahora;
        const diffMin = Math.floor(diffMs / 60000);
        const diffHoras = Math.floor(diffMs / 3600000);
        const diffDias = Math.floor(diffMs / 86400000);
        
        if (diffMs < 0) return '🔴 Iniciado';
        if (diffMin < 60) return `🟢 En ${diffMin} min`;
        if (diffHoras < 24) return `🟡 En ${diffHoras}h`;
        if (diffDias < 7) return `🔵 En ${diffDias}d`;
        return `📅 ${formatearFechaInicio(fechaISO)}`;
    } catch (error) {
        return '';
    }
}

function renderResults() {
    const container = document.getElementById('results');
    const emptyState = document.getElementById('emptyState');
    const loading = document.getElementById('loading');
    const count = document.getElementById('resultsCount');

    if (state.loading) {
        loading.classList.remove('hidden');
        emptyState.classList.add('hidden');
        container.innerHTML = '';
        count.textContent = '0 partidos';
        return;
    }

    loading.classList.add('hidden');

    if (state.results.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        count.textContent = '0 partidos';
        return;
    }

    emptyState.classList.add('hidden');
    count.textContent = `${state.results.length} partido${state.results.length > 1 ? 's' : ''}`;

    container.innerHTML = state.results.map((result, index) => {
        const profit = getProfit(result.surebets);
        const hasSurebets = result.totalSurebets > 0;
        const hasValuebets = result.totalValuebets > 0;
        const hasOpportunities = hasSurebets || hasValuebets;
        const cardClass = hasOpportunities ? 'has-surebets' : 'no-surebets';
        const iconColor = hasOpportunities ? 'has-surebets' : 'no-surebets';
        const fechaFormateada = formatearFechaInicio(result.fechaInicio);
        const fechaRelativa = formatearFechaRelativa(result.fechaInicio);

        return `
            <div class="result-card ${cardClass}" data-index="${index}" onclick="openModal(${index})">
                <div class="result-card-content">
                    <div class="result-card-left">
                        <div class="result-card-icon ${iconColor}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                ${hasOpportunities ? `
                                    <path d="M12 6v6l4 2"/>
                                ` : `
                                    <line x1="12" y1="8" x2="12" y2="16"/>
                                    <line x1="8" y1="12" x2="16" y2="12"/>
                                `}
                            </svg>
                        </div>
                        <div class="result-card-info">
                            <div class="result-card-title">
                                ${result.nombreLocal || 'Local'} vs ${result.nombreVisitante || 'Visitante'}
                            </div>
                            <div class="result-card-meta">
                                <span class="result-card-date">📅 ${fechaFormateada}</span>
                                <span class="result-card-relative">${fechaRelativa}</span>
                                <span>🆔 1xBet: ${result.idXbet}</span>
                                <span>🆔 BetPlay: ${result.idKambi}</span>
                                ${result.fromCache ? '<span>📦 Caché</span>' : ''}
                            </div>
                            <div class="result-card-badges">
                                ${hasSurebets ? `<span class="badge badge-surebet">🎯 ${result.totalSurebets} Surebets</span>` : ''}
                                ${hasValuebets ? `<span class="badge badge-valuebet">📈 ${result.totalValuebets} Valuebets</span>` : ''}
                                ${result.hasQuantAnalysis ? `<span class="badge badge-quant">📊 Estadísticas</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="result-card-right">
                        ${hasOpportunities ? `
                            <div class="result-card-profit">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
                                    <polyline points="17 6 23 6 23 12"/>
                                </svg>
                                ${formatProfit(profit)}
                            </div>
                        ` : `
                            <div class="result-card-count">Sin oportunidades</div>
                        `}
                        <div class="result-card-arrow">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="9 18 15 12 9 6"/>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function openModal(index) {
    const result = state.results[index];
    if (!result) return;

    state.modalIndex = index;
    state.currentTab = 'surebets';
    const modal = document.getElementById('detailModal');
    const title = document.getElementById('modalTitle');
    const subtitle = document.getElementById('modalSubtitle');

    const fechaFormateada = formatearFechaInicio(result.fechaInicio);
    
    title.textContent = `${result.nombreLocal || 'Local'} vs ${result.nombreVisitante || 'Visitante'}`;
    subtitle.textContent = `📅 ${fechaFormateada} | ID: ${result.idXbet} | ${result.idKambi}`;

    document.getElementById('tabSurebetsCount').textContent = result.totalSurebets || 0;
    document.getElementById('tabValuebetsCount').textContent = result.totalValuebets || 0;

    renderModalContent(result);
    updateActiveTab('surebets');

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function renderModalContent(result) {
    const body = document.getElementById('modalBody');
    const tab = state.currentTab;

    if (tab === 'surebets') {
        renderSurebetsTab(body, result);
    } else if (tab === 'valuebets') {
        renderValuebetsTab(body, result);
    } else if (tab === 'stats') {
        renderStatsTab(body, result);
    }
}

function renderSurebetsTab(body, result) {
    if (result.totalSurebets > 0) {
        body.innerHTML = `
            <div class="modal-surebet-summary">
                <span class="label">Total surebets:</span>
                <span class="value">${result.totalSurebets}</span>
                ${result.mejorSurebet ? `
                    <span class="best-label">Mejor:</span>
                    <span class="best-value">${result.mejorSurebet.beneficio}</span>
                ` : ''}
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px;">
                ${result.surebets.map((surebet, i) => `
                    <div class="modal-surebet-item">
                        <div class="modal-surebet-header">
                            <span class="modal-surebet-market">${surebet.mercado}</span>
                            ${surebet.linea !== 'N/A' ? `<span class="modal-surebet-line">Línea: ${surebet.linea}</span>` : ''}
                            <span class="modal-surebet-profit">${surebet.beneficio}</span>
                        </div>
                        <div class="modal-surebet-odds-container">
                            <div class="modal-odds-vs-icon">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M5 12h14M12 5l7 7-7 7"/>
                                </svg>
                            </div>
                            <div class="modal-odds-box bookie-1">
                                <div style="font-size: 10px; color: var(--text-secondary); text-transform: uppercase;">${surebet.bookie1}</div>
                                <div style="font-size: 16px; font-weight: 700; color: var(--text-primary);">${surebet.odds1}</div>
                                <div style="font-size: 11px; color: var(--text-tertiary);">${surebet.detalle1 || ''}</div>
                                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${surebet.apuesta1}</div>
                            </div>
                            <div class="modal-odds-box bookie-2">
                                <div style="font-size: 10px; color: var(--text-secondary); text-transform: uppercase;">${surebet.bookie2}</div>
                                <div style="font-size: 16px; font-weight: 700; color: var(--text-primary);">${surebet.odds2}</div>
                                <div style="font-size: 11px; color: var(--text-tertiary);">${surebet.detalle2 || ''}</div>
                                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 2px;">${surebet.apuesta2}</div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        body.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--text-secondary);">
                <svg style="width: 48px; height: 48px; margin: 0 auto 12px; opacity: 0.5;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="16"/>
                    <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
                <p style="font-size: 16px; font-weight: 500;">No se encontraron surebets</p>
                <p style="font-size: 13px; margin-top: 4px;">Revisa los IDs o intenta con otro partido</p>
            </div>
        `;
    }
}

function renderValuebetsTab(body, result) {
    if (result.totalValuebets > 0 && result.hasQuantAnalysis) {
        const quant = result.quantAnalysis;
        body.innerHTML = `
            <div class="modal-surebet-summary">
                <span class="label">Total valuebets:</span>
                <span class="value">${result.totalValuebets}</span>
            </div>
            <div style="margin-bottom: 16px; background: var(--bg-card); border-radius: var(--radius-sm); padding: 12px 16px; border: 1px solid var(--border-color);">
                <h4 style="font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">📊 Marcadores más probables</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${quant.topScores.map(s => `
                        <span style="background: var(--bg-secondary); padding: 4px 12px; border-radius: 12px; font-size: 12px; border: 1px solid var(--border-color);">
                            ${s.score} <span style="color: var(--text-tertiary);">${s.prob}</span>
                        </span>
                    `).join('')}
                </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px;">
                ${result.valuebets.map((vb, i) => `
                    <div class="modal-surebet-item" style="border-left: 3px solid var(--accent-yellow);">
                        <div class="modal-surebet-header">
                            <span class="modal-surebet-market">${vb.mercado}</span>
                            ${vb.linea !== 'N/A' ? `<span class="modal-surebet-line">Línea: ${vb.linea}</span>` : ''}
                            <span class="modal-surebet-profit" style="color: var(--accent-yellow);">EV: ${vb.ev}</span>
                        </div>
                        <div class="modal-surebet-odds-container">
                            <div class="modal-vb-box" style="align-items: flex-start;">
                                <div style="font-size: 11px; color: var(--text-tertiary);">Selección</div>
                                <div style="font-weight: 600;">${vb.seleccion}</div>
                            </div>
                            <div class="modal-vb-box">
                                <div style="font-size: 11px; color: var(--text-tertiary);">Probabilidad</div>
                                <div style="font-weight: 600; color: var(--accent-blue);">${vb.probabilidadModelo}</div>
                            </div>
                            <div class="modal-vb-box" style="align-items: flex-end;">
                                <div style="font-size: 11px; color: var(--text-tertiary);">Mejor Cuota</div>
                                <div style="font-weight: 600; color: var(--accent-green);">${vb.mejorBookie}: ${vb.mejorCuota}</div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } else if (!result.hasQuantAnalysis) {
        body.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--text-secondary);">
                <svg style="width: 48px; height: 48px; margin: 0 auto 12px; opacity: 0.5;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v8M8 12h8"/>
                </svg>
                <p style="font-size: 16px; font-weight: 500;">No hay análisis cuantitativo</p>
                <p style="font-size: 13px; margin-top: 4px;">Para calcular valuebets, proporciona las estadísticas del partido al escanear</p>
            </div>
        `;
    } else {
        body.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--text-secondary);">
                <svg style="width: 48px; height: 48px; margin: 0 auto 12px; opacity: 0.5;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="16"/>
                    <line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
                <p style="font-size: 16px; font-weight: 500;">No se encontraron valuebets</p>
                <p style="font-size: 13px; margin-top: 4px;">El EV mínimo es 5% para considerar una valuebet</p>
            </div>
        `;
    }
}

function renderStatsTab(body, result) {
    if (result.hasQuantAnalysis && result.quantAnalysis) {
        const q = result.quantAnalysis;
        const probs = q.probs;
        body.innerHTML = `
            <!-- xG -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 16px; text-align: center;">
                    <div style="color: var(--text-tertiary); font-size: 12px;">xG Local</div>
                    <div style="font-size: 28px; font-weight: 700; color: var(--accent-green);">${q.xgHome}</div>
                </div>
                <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 16px; text-align: center;">
                    <div style="color: var(--text-tertiary); font-size: 12px;">xG Visitante</div>
                    <div style="font-size: 28px; font-weight: 700; color: var(--accent-blue);">${q.xgAway}</div>
                </div>
                <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 16px; text-align: center;">
                    <div style="color: var(--text-tertiary); font-size: 12px;">xG Total</div>
                    <div style="font-size: 28px; font-weight: 700; color: var(--accent-yellow);">${q.xgTotal}</div>
                </div>
            </div>

            <!-- Resultado Final y Doble Oportunidad -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
                <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px 16px; border-left: 3px solid var(--accent-green);">
                    <div style="color: var(--text-tertiary); font-size: 11px;">Local (1)</div>
                    <div style="font-size: 18px; font-weight: 600; color: var(--accent-green);">${(probs["1"] * 100).toFixed(1)}%</div>
                </div>
                <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px 16px; border-left: 3px solid var(--accent-yellow);">
                    <div style="color: var(--text-tertiary); font-size: 11px;">Empate (X)</div>
                    <div style="font-size: 18px; font-weight: 600; color: var(--accent-yellow);">${(probs["X"] * 100).toFixed(1)}%</div>
                </div>
                <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px 16px; border-left: 3px solid var(--accent-blue);">
                    <div style="color: var(--text-tertiary); font-size: 11px;">Visitante (2)</div>
                    <div style="font-size: 18px; font-weight: 600; color: var(--accent-blue);">${(probs["2"] * 100).toFixed(1)}%</div>
                </div>
                <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px 16px; border-left: 3px solid var(--accent-purple);">
                    <div style="color: var(--text-tertiary); font-size: 11px;">Doble Oportunidad</div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 2px;">
                        <span style="font-size: 13px; font-weight: 600; color: var(--accent-green);">1X ${(probs["1X"] * 100).toFixed(1)}%</span>
                        <span style="font-size: 13px; font-weight: 600; color: var(--accent-yellow);">12 ${(probs["12"] * 100).toFixed(1)}%</span>
                        <span style="font-size: 13px; font-weight: 600; color: var(--accent-blue);">X2 ${(probs["X2"] * 100).toFixed(1)}%</span>
                    </div>
                </div>
            </div>

            <!-- Over/Under Múltiples Líneas -->
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
    <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px 16px;">
        <div style="color: var(--text-tertiary); font-size: 11px; margin-bottom: 4px;">Total Goles</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <div style="background: var(--bg-secondary); padding: 8px 6px; border-radius: 4px; text-align: center;">
                <div style="font-size: 10px; color: var(--text-tertiary); white-space: nowrap;">Over 1.5</div>
                <div style="font-size: 14px; font-weight: 600; ${probs["Over 1.5"] > 0.5 ? 'color: var(--accent-green)' : 'color: var(--text-secondary)'};">${(probs["Over 1.5"] * 100).toFixed(1)}%</div>
            </div>
            <div style="background: var(--bg-secondary); padding: 8px 6px; border-radius: 4px; text-align: center;">
                <div style="font-size: 10px; color: var(--text-tertiary); white-space: nowrap;">Under 1.5</div>
                <div style="font-size: 14px; font-weight: 600; ${probs["Under 1.5"] > 0.5 ? 'color: var(--accent-green)' : 'color: var(--text-secondary)'};">${(probs["Under 1.5"] * 100).toFixed(1)}%</div>
            </div>
            <div style="background: var(--bg-secondary); padding: 8px 6px; border-radius: 4px; text-align: center;">
                <div style="font-size: 10px; color: var(--text-tertiary); white-space: nowrap;">Over 2.5</div>
                <div style="font-size: 14px; font-weight: 600; ${probs["Over 2.5"] > 0.5 ? 'color: var(--accent-green)' : 'color: var(--text-secondary)'};">${(probs["Over 2.5"] * 100).toFixed(1)}%</div>
            </div>
            <div style="background: var(--bg-secondary); padding: 8px 6px; border-radius: 4px; text-align: center;">
                <div style="font-size: 10px; color: var(--text-tertiary); white-space: nowrap;">Under 2.5</div>
                <div style="font-size: 14px; font-weight: 600; ${probs["Under 2.5"] > 0.5 ? 'color: var(--accent-green)' : 'color: var(--text-secondary)'};">${(probs["Under 2.5"] * 100).toFixed(1)}%</div>
            </div>
            <div style="background: var(--bg-secondary); padding: 8px 6px; border-radius: 4px; text-align: center;">
                <div style="font-size: 10px; color: var(--text-tertiary); white-space: nowrap;">Over 3.5</div>
                <div style="font-size: 14px; font-weight: 600; ${probs["Over 3.5"] > 0.5 ? 'color: var(--accent-green)' : 'color: var(--text-secondary)'};">${(probs["Over 3.5"] * 100).toFixed(1)}%</div>
            </div>
            <div style="background: var(--bg-secondary); padding: 8px 6px; border-radius: 4px; text-align: center;">
                <div style="font-size: 10px; color: var(--text-tertiary); white-space: nowrap;">Under 3.5</div>
                <div style="font-size: 14px; font-weight: 600; ${probs["Under 3.5"] > 0.5 ? 'color: var(--accent-green)' : 'color: var(--text-secondary)'};">${(probs["Under 3.5"] * 100).toFixed(1)}%</div>
            </div>
            <div style="background: var(--bg-secondary); padding: 8px 6px; border-radius: 4px; text-align: center;">
                <div style="font-size: 10px; color: var(--text-tertiary); white-space: nowrap;">Over 4.5</div>
                <div style="font-size: 14px; font-weight: 600; ${probs["Over 4.5"] > 0.5 ? 'color: var(--accent-green)' : 'color: var(--text-secondary)'};">${(probs["Over 4.5"] * 100).toFixed(1)}%</div>
            </div>
            <div style="background: var(--bg-secondary); padding: 8px 6px; border-radius: 4px; text-align: center;">
                <div style="font-size: 10px; color: var(--text-tertiary); white-space: nowrap;">Under 4.5</div>
                <div style="font-size: 14px; font-weight: 600; ${probs["Under 4.5"] > 0.5 ? 'color: var(--accent-green)' : 'color: var(--text-secondary)'};">${(probs["Under 4.5"] * 100).toFixed(1)}%</div>
            </div>
        </div>
    </div>
    <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px 16px;">
        <div style="color: var(--text-tertiary); font-size: 11px; margin-bottom: 4px;">BTTS</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <div style="background: var(--bg-secondary); padding: 8px 6px; border-radius: 4px; text-align: center;">
                <div style="font-size: 10px; color: var(--text-tertiary);">Sí</div>
                <div style="font-size: 14px; font-weight: 600; ${probs["BTTS_SI"] > 0.5 ? 'color: var(--accent-green)' : 'color: var(--text-secondary)'};">${(probs["BTTS_SI"] * 100).toFixed(1)}%</div>
            </div>
            <div style="background: var(--bg-secondary); padding: 8px 6px; border-radius: 4px; text-align: center;">
                <div style="font-size: 10px; color: var(--text-tertiary);">No</div>
                <div style="font-size: 14px; font-weight: 600; ${probs["BTTS_NO"] > 0.5 ? 'color: var(--accent-green)' : 'color: var(--text-secondary)'};">${(probs["BTTS_NO"] * 100).toFixed(1)}%</div>
            </div>
        </div>
    </div>
</div>

            <!-- Hándicap -->
            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px 16px; margin-bottom: 16px;">
                <div style="color: var(--text-tertiary); font-size: 11px; margin-bottom: 6px;">Hándicap (estimado)</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                    <div style="background: var(--bg-secondary); padding: 4px 10px; border-radius: 4px; display: flex; justify-content: space-between;">
                        <span style="font-size: 11px; color: var(--text-secondary);">Local -1</span>
                        <span style="font-size: 14px; font-weight: 600; ${probs["Handicap -1 Home"] > 0.4 ? 'color: var(--accent-green)' : 'color: var(--text-secondary)'};">${(probs["Handicap -1 Home"] * 100).toFixed(1)}%</span>
                    </div>
                    <div style="background: var(--bg-secondary); padding: 4px 10px; border-radius: 4px; display: flex; justify-content: space-between;">
                        <span style="font-size: 11px; color: var(--text-secondary);">Visitante +1</span>
                        <span style="font-size: 14px; font-weight: 600; ${probs["Handicap +1 Away"] > 0.4 ? 'color: var(--accent-blue)' : 'color: var(--text-secondary)'};">${(probs["Handicap +1 Away"] * 100).toFixed(1)}%</span>
                    </div>
                    <div style="background: var(--bg-secondary); padding: 4px 10px; border-radius: 4px; display: flex; justify-content: space-between;">
                        <span style="font-size: 11px; color: var(--text-secondary);">Visitante -1</span>
                        <span style="font-size: 14px; font-weight: 600; ${probs["Handicap -1 Away"] > 0.4 ? 'color: var(--accent-blue)' : 'color: var(--text-secondary)'};">${(probs["Handicap -1 Away"] * 100).toFixed(1)}%</span>
                    </div>
                    <div style="background: var(--bg-secondary); padding: 4px 10px; border-radius: 4px; display: flex; justify-content: space-between;">
                        <span style="font-size: 11px; color: var(--text-secondary);">Local +1</span>
                        <span style="font-size: 14px; font-weight: 600; ${probs["Handicap +1 Home"] > 0.4 ? 'color: var(--accent-green)' : 'color: var(--text-secondary)'};">${(probs["Handicap +1 Home"] * 100).toFixed(1)}%</span>
                    </div>
                </div>
                <div style="font-size: 10px; color: var(--text-tertiary); margin-top: 6px;">* Estimación basada en probabilidades de resultado</div>
            </div>

            <!-- Marcadores más probables -->
            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px 16px;">
                <h4 style="font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px;">📊 Marcadores más probables</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                    ${q.topScores.map(s => `
                        <span style="background: var(--bg-secondary); padding: 4px 14px; border-radius: 12px; font-size: 13px; border: 1px solid var(--border-color);">
                            ${s.score} <span style="color: var(--text-tertiary);">${s.prob}</span>
                        </span>
                    `).join('')}
                </div>
            </div>
        `;
    } else {
        body.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: var(--text-secondary);">
                <svg style="width: 48px; height: 48px; margin: 0 auto 12px; opacity: 0.5;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v8M8 12h8"/>
                </svg>
                <p style="font-size: 16px; font-weight: 500;">No hay estadísticas disponibles</p>
                <p style="font-size: 13px; margin-top: 4px;">Para ver el análisis cuantitativo, proporciona las estadísticas del partido al escanear</p>
            </div>
        `;
    }
}

function updateActiveTab(tab) {
    document.querySelectorAll('.modal-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
    });
    state.currentTab = tab;
}

function setupModalTabs() {
    document.querySelectorAll('.modal-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            updateActiveTab(tabId);
            const index = state.modalIndex;
            if (index !== null) {
                const result = state.results[index];
                if (result) renderModalContent(result);
            }
        });
    });
}

function closeModal() {
    const modal = document.getElementById('detailModal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    state.modalIndex = null;
}

function refreshMatchFromModal() {
    if (state.modalIndex === null) return;
    const result = state.results[state.modalIndex];
    if (!result) return;

    const { idXbet, idKambi } = result;
    
    let stats = null;
    if (result.hasQuantAnalysis && result.statsUsed) {
        stats = result.statsUsed;
    } else if (result.hasQuantAnalysis) {
        stats = {
            homePJ: 10,
            homeGF: 15,
            homeGC: 12,
            awayPJ: 10,
            awayGF: 18,
            awayGC: 10,
            leagueAvg: 1.10
        };
    }

    state.results.splice(state.modalIndex, 1);
    saveToStorage();
    closeModal();
    renderResults();
    
    scanMatch(idXbet, idKambi, stats);
}

function deleteMatchFromModal() {
    if (state.modalIndex === null) return;
    if (!confirm('¿Eliminar este partido de la lista?')) return;

    state.results.splice(state.modalIndex, 1);
    saveToStorage();
    closeModal();
    renderResults();
}

function getStatsFromForm() {
    const homePJ = document.getElementById('homePJ')?.value;
    const homeGF = document.getElementById('homeGF')?.value;
    const homeGC = document.getElementById('homeGC')?.value;
    const awayPJ = document.getElementById('awayPJ')?.value;
    const awayGF = document.getElementById('awayGF')?.value;
    const awayGC = document.getElementById('awayGC')?.value;
    const leagueAvg = document.getElementById('leagueAvg')?.value;

    if (homePJ && awayPJ) {
        return {
            homePJ: parseFloat(homePJ) || 0,
            homeGF: parseFloat(homeGF) || 0,
            homeGC: parseFloat(homeGC) || 0,
            awayPJ: parseFloat(awayPJ) || 0,
            awayGF: parseFloat(awayGF) || 0,
            awayGC: parseFloat(awayGC) || 0,
            leagueAvg: parseFloat(leagueAvg) || 1.10
        };
    }
    return null;
}

async function scanMatch(idXbet, idKambi, stats = null) {
    state.loading = true;
    renderResults();

    try {
        const payload = { idXbet, idKambi };
        if (stats) {
            payload.stats = stats;
        }

        const response = await fetch('/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al escanear');
        }

        const result = await response.json();
        
        const existingIndex = state.results.findIndex(r => 
            r.idXbet === result.idXbet && r.idKambi === result.idKambi
        );

        if (existingIndex !== -1) {
            state.results[existingIndex] = result;
        } else {
            state.results.unshift(result);
        }
        
        saveToStorage();
        renderResults();

        const status = document.getElementById('status');
        status.textContent = existingIndex !== -1 ? '🔄 Partido actualizado' : '✅ Partido escaneado';
        status.className = 'text-sm text-green-400';

        if (existingIndex === -1) {
            document.querySelectorAll('.stats-input').forEach(input => input.value = '');
        }

    } catch (error) {
        console.error('Error:', error);
        const status = document.getElementById('status');
        status.textContent = '❌ ' + error.message;
        status.className = 'text-sm text-red-400';
        alert('Error: ' + error.message);
    } finally {
        state.loading = false;
        renderResults();
    }
}

async function clearCache() {
    try {
        await fetch('/api/cache', { method: 'DELETE' });
        const status = document.getElementById('status');
        status.textContent = '🗑️ Caché limpiada';
        status.className = 'text-sm text-yellow-400';
        setTimeout(() => {
            status.textContent = 'Listo';
            status.className = 'text-sm text-gray-400';
        }, 2000);
    } catch (error) {
        console.error('Error al limpiar caché:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('clearCache').addEventListener('click', clearCache);
    document.getElementById('scanForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const idXbet = document.getElementById('idXbet').value.trim();
        const idKambi = document.getElementById('idKambi').value.trim();

        if (!idXbet || !idKambi) {
            alert('Por favor ingresa ambos IDs');
            return;
        }

        const stats = getStatsFromForm();
        await scanMatch(idXbet, idKambi, stats);
        
        document.getElementById('idXbet').value = '';
        document.getElementById('idKambi').value = '';
    });

    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('modalRefresh').addEventListener('click', refreshMatchFromModal);
    document.getElementById('modalDelete').addEventListener('click', deleteMatchFromModal);
    document.getElementById('detailModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    setupModalTabs();
    renderResults();
});

window.openModal = openModal;
window.closeModal = closeModal;
window.refreshMatchFromModal = refreshMatchFromModal;
window.deleteMatchFromModal = deleteMatchFromModal;
window.clearCache = clearCache;
window.toggleStats = toggleStats;