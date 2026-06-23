function updateApplicationData(studentSummaries, answerRecords) {
    clearStoredSpreadsheetData();

    ApplicationState.studentSummaries = studentSummaries;
    ApplicationState.answerRecords = answerRecords;

    saveSpreadsheetDataToStorage();
}

function applyDetectedCourseIfAvailable(detectedCourseName, detectedCourseKey) {
    if (!detectedCourseKey) {
        return;
    }

    saveSelectedCourse(detectedCourseKey);

    const courseSelectors = document.querySelectorAll('#courseSelector');

    courseSelectors.forEach((courseSelector) => {
        courseSelector.value = detectedCourseKey;
    });

    ApplicationState.detectedCourseName = detectedCourseName || '';
    ApplicationState.detectedCourseKey = detectedCourseKey;
}

function setUploadButtonLoading(loading) {
    const label = document.querySelector('label[for="uploadPlanilha"]');
    if (!label) return;
    if (loading) {
        label.dataset.originalHtml = label.innerHTML;
        label.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Carregando...</span>';
        label.style.opacity = '0.7';
        label.style.pointerEvents = 'none';
    } else {
        if (label.dataset.originalHtml) label.innerHTML = label.dataset.originalHtml;
        label.style.opacity = '';
        label.style.pointerEvents = '';
    }
}

function aguardarXLSX(callback, tentativas) {
    tentativas = tentativas || 0;
    if (typeof XLSX !== 'undefined') {
        callback();
        return;
    }
    if (tentativas > 50) {
        setUploadButtonLoading(false);
        alert('Erro: a biblioteca de leitura de planilhas não carregou.\nVerifique sua conexão e recarregue a página.');
        return;
    }
    setTimeout(() => aguardarXLSX(callback, tentativas + 1), 100);
}

function handleSpreadsheetUpload(file) {
    if (!file) return;

    setUploadButtonLoading(true);

    aguardarXLSX(() => {
        const fileReader = new FileReader();

        fileReader.onerror = function() {
            setUploadButtonLoading(false);
            alert('Erro ao ler o arquivo. Verifique se o arquivo não está corrompido.');
        };

        fileReader.onload = function handleFileLoad(event) {
            try {
                const fileBuffer = new Uint8Array(event.target.result);

                const {
                    studentSummaries,
                    answerRecords,
                    detectedCourseName,
                    detectedCourseKey,
                    detectedTurma
                } = readSpreadsheetData(fileBuffer);

                const temaAtual   = localStorage.getItem('saep-theme');
                const configAtual = localStorage.getItem(STORAGE_KEYS.courseConfig);

                localStorage.clear();

                if (temaAtual)   localStorage.setItem('saep-theme', temaAtual);
                if (configAtual) localStorage.setItem(STORAGE_KEYS.courseConfig, configAtual);

                updateApplicationData(studentSummaries, answerRecords);
                applyDetectedCourseIfAvailable(detectedCourseName, detectedCourseKey);
                if (!detectedCourseKey) saveSelectedCourse('');
                saveTurma(detectedTurma || '');

                location.reload();
            } catch (error) {
                console.error('Erro ao processar planilha:', error);
                setUploadButtonLoading(false);
                alert(`Erro ao ler a planilha: ${error.message}`);
            }
        };

        fileReader.readAsArrayBuffer(file);
    });
}

function configureSpreadsheetUpload() {
    // Event delegation no document — funciona mesmo se o input
    // for clonado, movido ou inserido dinamicamente no DOM.
    document.addEventListener('change', function(event) {
        if (event.target && event.target.id === 'uploadPlanilha') {
            const file = event.target.files && event.target.files[0];
            if (file) handleSpreadsheetUpload(file);
        }
    });
}

function configurePdfButtons(orderedStudents) {
    const studentPdfButton = getElementByIdOrNull('btnPdfAluno');
    const classroomPdfButton = getElementByIdOrNull('btnPdfTurma');

    if (studentPdfButton) {
        studentPdfButton.addEventListener('click', async () => {
            if (!ApplicationState.selectedStudent) {
                alert('Selecione um aluno antes de gerar o PDF.');
                return;
            }

            await generateStudentVisualPdf(ApplicationState.selectedStudent);
        });
    }

    if (classroomPdfButton) {
        classroomPdfButton.addEventListener('click', async () => {
            await generateClassroomVisualPdf(orderedStudents);
        });
    }
}

function configurePrintButton() {
    const printButton = getElementByIdOrNull('btnPrintBoletim');

    if (!printButton) {
        return;
    }

    printButton.addEventListener('click', () => {
        if (!ApplicationState.selectedStudent) {
            alert('Selecione um aluno antes de imprimir o boletim.');
            return;
        }

        printBoletimSenai(ApplicationState.selectedStudent);
    });
}

/* =========================
   IMPORTAÇÃO DE CONFIGURAÇÃO
========================= */

function readCourseConfigFromExcel(fileBuffer) {
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    const importedConfig = {};

    workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (rows.length < 2) return;

        const courseKey = normalizeHeaderName(sheetName).replace(/\s+/g, '_');

        let nomeCurso = '';
        const escala = {};
        const capacidades = {};
        const diagnosticos = {};

        rows.forEach((row, index) => {
            if (index === 0) return;

            const tipo = normalizeText(row[0]);
            const valor1 = normalizeText(row[1]);
            const valor2 = normalizeText(row[2]);

            if (tipo === 'nome') {
                nomeCurso = valor1;
            } else if (tipo === 'abaixo') {
                escala.abaixo = Number(valor1) || 400;
            } else if (tipo === 'basico') {
                escala.basico = Number(valor1) || 500;
            } else if (tipo === 'adequado') {
                escala.adequado = Number(valor1) || 650;
            } else if (tipo.startsWith('capacidade')) {
                capacidades[valor1] = valor2;
            } else if (tipo.startsWith('diagnostico')) {
                diagnosticos[valor1] = valor2;
            }
        });

        importedConfig[courseKey] = {
            nome: nomeCurso || sheetName,
            escala: {
                abaixo: escala.abaixo || 400,
                basico: escala.basico || 500,
                adequado: escala.adequado || 650
            },
            capacidades,
            diagnosticos
        };
    });

    return importedConfig;
}

function handleCourseConfigUpload(file) {
    if (!file) {
        return;
    }

    const reader = new FileReader();

    reader.onload = function handleConfigLoad(event) {
        try {
            const fileBuffer = new Uint8Array(event.target.result);
            const importedConfig = readCourseConfigFromExcel(fileBuffer);

            if (!Object.keys(importedConfig).length) {
                throw new Error('Nenhum curso válido foi encontrado na planilha de configuração.');
            }

            saveImportedCourseConfig(importedConfig);
            alert('Configuração importada com sucesso. A página será recarregada.');
            location.reload();
        } catch (error) {
            console.error(error);
            alert(`Erro ao importar configuração: ${error.message}`);
        }
    };

    reader.readAsArrayBuffer(file);
}

function configureCourseConfigUpload() {
    document.addEventListener('change', function(event) {
        if (event.target && event.target.id === 'uploadConfig') {
            const file = event.target.files && event.target.files[0];
            if (file) handleCourseConfigUpload(file);
        }
    });
}
