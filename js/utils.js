function getElementByIdOrNull(elementId) {
    return document.getElementById(elementId);
}

function setTextContentIfElementExists(elementId, value) {
    const element = getElementByIdOrNull(elementId);

    if (!element) {
        return;
    }

    element.innerText = value;
}

function setHtmlContentIfElementExists(elementId, htmlContent) {
    const element = getElementByIdOrNull(elementId);

    if (!element) {
        return;
    }

    element.innerHTML = htmlContent;
}

function repairMojibake(value) {
    if (value === null || value === undefined) {
        return '';
    }

    const text = String(value);

    if (!/[ÃÂâ]/.test(text)) {
        return text;
    }

    const windows1252Bytes = {
        0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84,
        0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88,
        0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C,
        0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93,
        0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
        0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B,
        0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F
    };

    const getWindows1252Byte = (char) => {
        const code = char.charCodeAt(0);
        if (code <= 255) return code;
        return windows1252Bytes[code] || null;
    };

    const decodeRun = (run) => {
        if (!/[ÃÂâ]/.test(run)) return run;

        try {
            return decodeURIComponent(
                run
                    .split('')
                    .map((char) => `%${getWindows1252Byte(char).toString(16).padStart(2, '0')}`)
                    .join('')
            ) || run;
        } catch (_) {
            return run;
        }
    };

    let repairedText = '';
    let latinRun = '';

    for (const char of text) {
        if (getWindows1252Byte(char) !== null) {
            latinRun += char;
        } else {
            repairedText += decodeRun(latinRun) + char;
            latinRun = '';
        }
    }

    return repairedText + decodeRun(latinRun);
}

function repairObjectText(value) {
    if (typeof value === 'string') {
        return repairMojibake(value);
    }

    if (Array.isArray(value)) {
        return value.map(repairObjectText);
    }

    if (value && typeof value === 'object') {
        Object.keys(value).forEach((key) => {
            value[key] = repairObjectText(value[key]);
        });
    }

    return value;
}

function normalizeText(value) {
    return repairMojibake(value).trim();
}

function normalizeHeaderName(headerName) {
    return repairMojibake(headerName)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function parseNumber(value) {
    if (value === null || value === undefined || value === '') {
        return 0;
    }

    if (typeof value === 'number') {
        // Planilha pode exportar desempenho como decimal (0.725 = 72.5%)
        if (value > 0 && value <= 1) {
            return parseFloat((value * 100).toFixed(2));
        }
        return value;
    }

    const stringValue = String(value).trim();
    const parsedNumber = parseFloat(stringValue.replace('%', '').replace(',', '.')) || 0;

    // Detecta decimal puro sem símbolo de % (ex: "0.725" → 72.5)
    if (!stringValue.includes('%') && parsedNumber > 0 && parsedNumber <= 1) {
        return parseFloat((parsedNumber * 100).toFixed(2));
    }

    return parsedNumber;
}

function parseCapacityCode(rawValue) {
    if (rawValue === null || rawValue === undefined || rawValue === '') {
        return '';
    }

    const normalizedValue = String(rawValue).trim().toLowerCase();

    if (!normalizedValue || normalizedValue.includes('undefined') || normalizedValue.includes('null')) {
        return '';
    }

    return `C${String(rawValue).trim().replace('.0', '')}`;
}

function sanitizeFileName(fileName) {
    return String(fileName || 'arquivo')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '_');
}

function convertTimeToMinutes(timeValue) {
    if (!timeValue) {
        return NaN;
    }

    const normalizedValue = String(timeValue).trim();

    if (/^\d+$/.test(normalizedValue)) {
        return Number(normalizedValue);
    }

    const timeMatch = normalizedValue.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);

    if (!timeMatch) {
        return NaN;
    }

    const hours = Number(timeMatch[1]) || 0;
    const minutes = Number(timeMatch[2]) || 0;
    const seconds = Number(timeMatch[3]) || 0;

    return hours * 60 + minutes + seconds / 60;
}

function calculateAverageTime(timeValues) {
    const validTimesInMinutes = timeValues
        .map(convertTimeToMinutes)
        .filter((minutes) => !Number.isNaN(minutes) && minutes > 0);

    if (!validTimesInMinutes.length) {
        return '0m';
    }

    const totalMinutes = validTimesInMinutes.reduce(
        (accumulator, currentValue) => accumulator + currentValue,
        0
    );

    const averageMinutes = totalMinutes / validTimesInMinutes.length;

    return `${Math.round(averageMinutes)}min`;
}

function setButtonLoadingState(buttonElement, loadingHtml) {
    if (!buttonElement) {
        return null;
    }

    const originalHtml = buttonElement.innerHTML;
    buttonElement.disabled = true;
    buttonElement.innerHTML = loadingHtml;

    return originalHtml;
}

function restoreButtonState(buttonElement, originalHtml) {
    if (!buttonElement) {
        return;
    }

    buttonElement.disabled = false;
    buttonElement.innerHTML = originalHtml;
}
