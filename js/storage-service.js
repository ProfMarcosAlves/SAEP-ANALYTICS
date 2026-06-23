function getSavedCourseKey() {
    return localStorage.getItem(STORAGE_KEYS.course) || '';
}

function saveSelectedCourse(courseKey) {
    if (courseKey) {
        localStorage.setItem(STORAGE_KEYS.course, courseKey);
    } else {
        localStorage.removeItem(STORAGE_KEYS.course);
    }
}

function getSavedTurma() {
    return localStorage.getItem(STORAGE_KEYS.turma) || '';
}

function saveTurma(turmaCode) {
    if (turmaCode) {
        localStorage.setItem(STORAGE_KEYS.turma, turmaCode);
    } else {
        localStorage.removeItem(STORAGE_KEYS.turma);
    }
}

function clearStoredSpreadsheetData() {
    localStorage.removeItem(STORAGE_KEYS.students);
    localStorage.removeItem(STORAGE_KEYS.records);
}

function saveSpreadsheetDataToStorage() {
    localStorage.setItem(STORAGE_KEYS.students, JSON.stringify(ApplicationState.studentSummaries));
    localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(ApplicationState.answerRecords));
}

function loadSpreadsheetDataFromStorage() {
    try {
        ApplicationState.studentSummaries =
            JSON.parse(localStorage.getItem(STORAGE_KEYS.students)) || [];
        ApplicationState.answerRecords =
            JSON.parse(localStorage.getItem(STORAGE_KEYS.records)) || [];
    } catch (error) {
        console.warn('Dados locais inválidos foram limpos:', error);
        clearStoredSpreadsheetData();
        ApplicationState.studentSummaries = [];
        ApplicationState.answerRecords = [];
    }
}
function saveImportedCourseConfig(courseConfigObject) {
    localStorage.setItem(STORAGE_KEYS.courseConfig, JSON.stringify(courseConfigObject));
}

function clearImportedCourseConfig() {
    localStorage.removeItem(STORAGE_KEYS.courseConfig);
}
