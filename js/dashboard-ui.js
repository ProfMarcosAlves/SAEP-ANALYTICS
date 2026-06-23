function renderGeneralKpis() {
    if (!ApplicationState.studentSummaries.length) {
        return;
    }

    const totalStudents = ApplicationState.studentSummaries.length;

    const averagePerformance =
        ApplicationState.studentSummaries.reduce(
            (accumulator, studentSummary) => accumulator + (Number(studentSummary.desempenho) || 0),
            0
        ) / totalStudents;

    const approvedStudentsCount = ApplicationState.studentSummaries.filter((studentSummary) => {
        const saepLevel = studentSummary.nivelSAEP || getStudentSaepLevel(studentSummary);
        return saepLevel === 'Adequado' || saepLevel === 'Avançado';
    }).length;

    const performances = ApplicationState.studentSummaries.map(
        (studentSummary) => Number(studentSummary.desempenho) || 0
    );

    const bestPerformance = Math.max(...performances);
    const worstPerformance = Math.min(...performances);
    const averageTime = calculateAverageTime(
        ApplicationState.studentSummaries.map((studentSummary) => studentSummary.tempo)
    );

    setTextContentIfElementExists('kpi-media', `${averagePerformance.toFixed(1)}%`);
    setTextContentIfElementExists('kpi-alunos', totalStudents);
    setTextContentIfElementExists(
        'kpi-aprovacao',
        `${((approvedStudentsCount / totalStudents) * 100).toFixed(0)}%`
    );
    setTextContentIfElementExists('kpi-tempo', averageTime);
    setTextContentIfElementExists('kpi-melhor', `${bestPerformance.toFixed(1)}%`);
    setTextContentIfElementExists('kpi-pior', `${worstPerformance.toFixed(1)}%`);
}

function buildKnowledgeHighlightsHtml(knowledgeEntries) {
    return knowledgeEntries
        .map(({ name, performance }) => {
            const knowledgeColor = getLevelColor(getStudentSaepLevel(performance));

            return `
                <div style="display:flex; justify-content:space-between; gap:12px; font-size:12px; margin-top:6px;">
                    <span style="color:#334155; line-height:1.35;">${name}</span>
                    <span style="color:${knowledgeColor}; font-weight:700; white-space:nowrap;">${performance}%</span>
                </div>
            `;
        })
        .join('');
}

function renderCapacityCards(classroomAnalysis) {
    const container = getElementByIdOrNull('containerCapacidades');

    if (!container) {
        return;
    }

    const { sortedCapacityCodes, performanceByCapacity } = classroomAnalysis;

    if (!sortedCapacityCodes.length) {
        container.innerHTML = `
            <div class="capacity-card">
                <div class="capacity-name">Nenhuma capacidade válida encontrada na planilha.</div>
            </div>
        `;
        return;
    }

    container.innerHTML = sortedCapacityCodes
        .map((capacityCode) => {
            const capacityMetrics = performanceByCapacity[capacityCode];
            const capacityPerformance = Number(
                ((capacityMetrics.acertos / capacityMetrics.total) * 100).toFixed(1)
            );
            const saepLevel = getStudentSaepLevel(capacityPerformance);
            const levelColor = getLevelColor(saepLevel);

            const topKnowledgeEntries = Object.entries(capacityMetrics.conhecimentos)
                .map(([knowledgeName, knowledgeMetrics]) => ({
                    name: knowledgeName,
                    performance: Number(
                        ((knowledgeMetrics.acertos / knowledgeMetrics.total) * 100).toFixed(1)
                    )
                }))
                .sort((firstKnowledge, secondKnowledge) => secondKnowledge.performance - firstKnowledge.performance)
                .slice(0, 6);

            return `
                <div class="capacity-card">
                    <div class="capacity-top">
                        <div class="capacity-left">
                            <div class="capacity-badge" style="color:${levelColor}">
                                ${capacityCode}
                            </div>
                            <div class="capacity-name">${getCapacityDisplayName(capacityCode)}</div>
                        </div>
                        <span class="capacity-percent" style="color:${levelColor}">
                            ${capacityPerformance}%
                        </span>
                    </div>

                    <div class="progress-track">
                        <div class="progress-fill" style="width:${capacityPerformance}%; background-color:${levelColor}"></div>
                    </div>

                    <div style="font-size:11px; color:#64748b; margin-top:6px;">
                        ${capacityMetrics.itensUnicos || 0} ${capacityMetrics.itensUnicos === 1 ? 'item' : 'itens'} ·
                        ${capacityMetrics.acertos}/${capacityMetrics.total} respostas corretas
                    </div>

                    <div style="margin-top:10px; border-top:1px solid #e2e8f0; padding-top:8px;">
                        ${buildKnowledgeHighlightsHtml(topKnowledgeEntries)}
                    </div>
                </div>
            `;
        })
        .join('');
}

function renderKnowledgeSummaryList(classroomAnalysis) {
    const container = getElementByIdOrNull('knowledgeSummaryList');
    const wrap      = getElementByIdOrNull('knowledgeChartWrap');

    // Remove canvas — usamos cards agora
    if (wrap) wrap.style.display = 'none';
    if (window._knowledgeChart) { window._knowledgeChart.destroy(); window._knowledgeChart = null; }

    if (!container) return;

    const knowledgeEntries = buildKnowledgePerformanceEntries(classroomAnalysis)
        .sort((a, b) => b.performance - a.performance); // melhor → pior

    if (!knowledgeEntries.length) {
        container.innerHTML = '<p style="color:#64748b;">Nenhum conhecimento disponível.</p>';
        return;
    }

    const totalItensNaProva        = getTotalItensProva();
    const totalItensContabilizados = knowledgeEntries.reduce((acc, e) => acc + (e.itensUnicos || 0), 0);
    const itensNaoClassificados    = Math.max(0, totalItensNaProva - totalItensContabilizados);

    // Cards em grade 3 colunas — mesmo visual dos capacity-cards
    const cardsHtml = knowledgeEntries.map((entry, idx) => {
        const levelColor = entry.color;
        const perf = entry.performance;

        // Badge: iniciais do nome do conhecimento (ex: "FA" para "Física Aplicada")
        const palavras = entry.knowledgeName.replace(/[,\-]/g, ' ').split(/\s+/).filter(Boolean);
        const badge = palavras.length >= 2
            ? (palavras[0][0] + palavras[1][0]).toUpperCase()
            : entry.knowledgeName.slice(0, 2).toUpperCase();

        return `
            <div class="capacity-card">
                <div class="capacity-top">
                    <div class="capacity-left">
                        <div class="capacity-badge" style="color:${levelColor}; font-size:0.7rem;">
                            ${badge}
                        </div>
                        <div class="capacity-name">${entry.knowledgeName}</div>
                    </div>
                    <span class="capacity-percent" style="color:${levelColor}">
                        ${perf}%
                    </span>
                </div>

                <div class="progress-track">
                    <div class="progress-fill" style="width:${perf}%; background-color:${levelColor}"></div>
                </div>

                <div style="font-size:11px; color:#64748b; margin-top:6px; display:flex; gap:8px; flex-wrap:wrap;">
                    <span>${entry.itensUnicos} ${entry.itensUnicos === 1 ? 'item' : 'itens'} na prova</span>
                    <span>·</span>
                    <span>${entry.acertos}/${entry.total} respostas corretas</span>
                    <span>·</span>
                    <span>${entry.capacidades.length} ${entry.capacidades.length === 1 ? 'capacidade' : 'capacidades'}</span>
                    <span>·</span>
                    <span style="color:${levelColor}; font-weight:700;">${entry.level}</span>
                </div>
            </div>
        `;
    }).join('');

    // Rodapé de totais
    const avisoHtml = itensNaoClassificados > 0
        ? `<span style="color:#f59e0b;font-weight:600;">⚠ ${itensNaoClassificados} item(s) sem campo Conhecimento na planilha</span>`
        : `<span style="color:#22c55e;font-weight:600;">✓ Todos os ${totalItensNaProva} itens classificados</span>`;

    const rodapeHtml = `
        <div style="grid-column:1/-1; font-size:0.8rem; color:#64748b;
                    display:flex; justify-content:space-between; align-items:center;
                    flex-wrap:wrap; gap:6px; padding-top:8px; border-top:1px solid var(--border); margin-top:4px;">
            <span>Itens listados: <strong style="color:var(--text)">${totalItensContabilizados}</strong>
                &nbsp;·&nbsp; Total da prova: <strong style="color:var(--text)">${totalItensNaProva}</strong></span>
            ${avisoHtml}
        </div>`;

    container.innerHTML = `<div class="capacity-grid">${cardsHtml}${rodapeHtml}</div>`;
}

function renderClassroomHighlights(classroomAnalysis) {
    const container = getElementByIdOrNull('classroomHighlightsBox');

    if (!container) {
        return;
    }

    const highlights = buildClassroomPedagogicalHighlights(classroomAnalysis);

    container.innerHTML = `
        <div class="pedagogical-highlight-wrapper">
            <div class="pedagogical-highlight-header">
                <h3 class="pedagogical-highlight-title">${highlights.summaryTitle}</h3>
            </div>
            <div class="pedagogical-highlight-content">
                ${highlights.summaryHtml}
            </div>
        </div>
    `;
}

function buildRankingTableHeader(sortedCapacityCodes) {
    const capacityHeaders = sortedCapacityCodes
        .map((capacityCode) => `<th class="p-3 border-b text-center">${capacityCode}</th>`)
        .join('');

    return `
        <tr class="table-header">
            <th class="p-3 border-b text-left">Aluno</th>
            ${capacityHeaders}
            <th class="p-3 border-b text-center bg-indigo-50">Nível</th>
        </tr>
    `;
}

function buildRankingTableRows(classroomAnalysis) {
    const { sortedCapacityCodes, studentCapacityPerformance } = classroomAnalysis;

    return [...ApplicationState.studentSummaries]
        .sort((firstStudent, secondStudent) => secondStudent.desempenho - firstStudent.desempenho)
        .map((studentSummary) => {
            const saepLevel = studentSummary.nivelSAEP || getStudentSaepLevel(studentSummary);
            const levelColor = getLevelColor(saepLevel);

            const capacityColumnsHtml = sortedCapacityCodes
                .map((capacityCode) => {
                    const capacityMetrics =
                        studentCapacityPerformance[studentSummary.nome]?.[capacityCode];

                    const capacityPerformance = capacityMetrics && capacityMetrics.total > 0
                        ? Number(((capacityMetrics.acertos / capacityMetrics.total) * 100).toFixed(0))
                        : 0;

                    const capacityColor = getLevelColor(getStudentSaepLevel(capacityPerformance));

                    return `
                        <td class="p-3 text-center font-bold text-xs" style="color:${capacityColor}">
                            ${capacityPerformance}%
                        </td>
                    `;
                })
                .join('');

            return `
                <tr class="border-b hover:bg-gray-50">
                    <td class="p-3 font-semibold text-gray-700 text-xs">${studentSummary.nome}</td>
                    ${capacityColumnsHtml}
                    <td class="p-3 text-center font-black text-white text-xs" style="background-color:${levelColor}">
                        ${saepLevel}
                    </td>
                </tr>
            `;
        })
        .join('');
}

function renderRankingMatrix(classroomAnalysis) {
    const tableHead = getElementByIdOrNull('tabelaCabecalho');
    const tableBody = getElementByIdOrNull('tabelaRanking');

    if (!tableHead || !tableBody) {
        return;
    }

    tableHead.innerHTML = buildRankingTableHeader(classroomAnalysis.sortedCapacityCodes || []);
    tableBody.innerHTML = buildRankingTableRows(classroomAnalysis);
}

function initializeDashboardPage() {
    if (!ApplicationState.studentSummaries.length) {
        return;
    }

    const classroomAnalysis = buildClassroomAnalysisStructures();

    renderGeneralKpis();
    renderCapacityCards(classroomAnalysis);
    renderKnowledgeSummaryList(classroomAnalysis);
    renderClassroomHighlights(classroomAnalysis);

    setTimeout(() => {
        renderRankingMatrix(classroomAnalysis);
    }, 50);
}