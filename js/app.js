function isDashboardPage() {
    return document.body.classList.contains('page-dashboard') && Boolean(getElementByIdOrNull('kpi-media'));
}

function isStudentPage() {
    return document.body.classList.contains('page-student') && Boolean(getElementByIdOrNull('studentSelector'));
}

function isAnalysePage() {
    return document.body.classList.contains('page-analyse') && Boolean(getElementByIdOrNull('analyseContent'));
}

function updateCourseIndicator() {
    const indicator = document.getElementById('courseIndicator');
    const nameEl    = document.getElementById('courseIndicatorName');
    if (!indicator || !nameEl) return;

    const courseConfig = getSelectedCourseConfig();
    if (courseConfig && courseConfig.nome) {
        nameEl.textContent = courseConfig.nome;
        indicator.style.display = 'flex';
    } else {
        indicator.style.display = 'none';
    }
}

function updateTurmaIndicator() {
    const el = document.getElementById('turmaIndicator');
    if (!el) return;
    const turma = getSavedTurma();
    if (turma) {
        const span = el.querySelector('span');
        if (span) span.textContent = turma;
        el.style.display = 'inline-flex';
    } else {
        el.style.display = 'none';
    }
}

function initializeApplication() {
    loadSpreadsheetDataFromStorage();
    populateCourseSelector();
    configureCourseConfigUpload();
    configureSpreadsheetUpload();
    updateCourseIndicator();
    updateTurmaIndicator();

    if (isDashboardPage()) {
        initializeDashboardPage();
    }

    if (isStudentPage()) {
        initializeStudentPage();
    }

    if (isAnalysePage()) {
        initializeAnalysePage();
    }
}

window.onload = initializeApplication;

window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        location.reload();
    }
});

window.addEventListener('storage', (event) => {
    const spreadsheetKeys = [
        STORAGE_KEYS.students,
        STORAGE_KEYS.records,
        STORAGE_KEYS.course,
        STORAGE_KEYS.turma
    ];

    if (spreadsheetKeys.includes(event.key)) {
        location.reload();
    }
});
