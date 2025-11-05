// 全局变量
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let recognition = null;
let gesturePoints = [];
let isDrawing = false;
let currentText = '';
let finalText = '';

// 语音合成相关变量
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;
let isSpeaking = false;
let touchPositions = [];
let isCapturingTouch = false;

// 将变量暴露到全局作用域，以便测试页面访问
window.touchPositions = touchPositions;

// 后端API配置
const API_BASE_URL = 'http://localhost:8000';

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    
    // 添加测试功能
    addTestFunctionality();
});

function initializeApp() {
    setupVoiceInput();
    setupGestureInput();
    setupTouchCapture();
    setupTextInput();
    setupTestParagraphs();
    setupEventListeners();
    setupTextToSpeech();
    setupPageNarration();
    announceToScreenReader('Text Input Assistant has been loaded successfully');
}

// 语音输入功能
function setupVoiceInput() {
    const holdBtn = document.getElementById('hold-to-record');
    const statusDiv = document.getElementById('voice-status');
    const resultDiv = document.getElementById('voice-result');

    // 检查浏览器支持
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        statusDiv.textContent = '您的浏览器不支持语音识别功能';
        holdBtn.disabled = true;
        return;
    }

    // 初始化语音识别
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'zh-CN';

    recognition.onstart = function() {
        isRecording = true;
        holdBtn.classList.add('recording');
        statusDiv.textContent = '正在听取您的语音...';
        announceToScreenReader('开始录音');
    };

    recognition.onresult = function(event) {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }

        if (interimTranscript) {
            resultDiv.textContent = '临时结果: ' + interimTranscript;
        }

        if (finalTranscript) {
            resultDiv.textContent = '识别结果: ' + finalTranscript;
            processVoiceInput(finalTranscript);
        }
    };

    recognition.onerror = function(event) {
        console.error('语音识别错误:', event.error);
        statusDiv.textContent = '语音识别出错: ' + event.error;
        announceToScreenReader('语音识别出错');
        resetVoiceButton();
    };

    recognition.onend = function() {
        resetVoiceButton();
        statusDiv.textContent = '语音识别结束';
    };

    // 按住录音功能
    holdBtn.addEventListener('mousedown', startVoiceRecording);
    holdBtn.addEventListener('mouseup', stopVoiceRecording);
    holdBtn.addEventListener('mouseleave', stopVoiceRecording);
    
    // 触摸设备支持
    holdBtn.addEventListener('touchstart', function(e) {
        e.preventDefault();
        startVoiceRecording();
    });
    holdBtn.addEventListener('touchend', function(e) {
        e.preventDefault();
        stopVoiceRecording();
    });
}

function startVoiceRecording() {
    if (recognition) {
        recognition.start();
    }
}

function stopVoiceRecording() {
    if (recognition) {
        recognition.stop();
    }
}

function resetVoiceButton() {
    const holdBtn = document.getElementById('hold-to-record');
    isRecording = false;
    holdBtn.classList.remove('recording');
}

function processVoiceInput(text) {
    // 这里可以添加语音命令处理逻辑
    // 例如：判断是输入文字还是修改命令
    const lowerText = text.toLowerCase().trim();
    
    if (lowerText.includes('修改') || lowerText.includes('删除') || lowerText.includes('清除')) {
        handleModificationCommand(text);
    } else {
        handleTextInput(text);
    }
}

function handleModificationCommand(command) {
    announceToScreenReader('检测到修改命令: ' + command);
    // 这里可以添加具体的修改逻辑
    // 例如：删除最后一个词、清除所有文本等
}

function handleTextInput(text) {
    currentText += text + ' ';
    updateFinalText();
    announceToScreenReader('已添加文本: ' + text);
}

// 手势输入功能
function setupGestureInput() {
    const gestureArea = document.getElementById('gesture-area');
    const clearBtn = document.getElementById('clear-gesture');
    const submitBtn = document.getElementById('submit-gesture');

    // 触摸事件
    gestureArea.addEventListener('touchstart', handleGestureStart, { passive: false });
    gestureArea.addEventListener('touchmove', handleGestureMove, { passive: false });
    gestureArea.addEventListener('touchend', handleGestureEnd, { passive: false });

    // 鼠标事件（用于桌面测试）
    gestureArea.addEventListener('mousedown', handleGestureStart);
    gestureArea.addEventListener('mousemove', handleGestureMove);
    gestureArea.addEventListener('mouseup', handleGestureEnd);
    gestureArea.addEventListener('mouseleave', handleGestureEnd);

    clearBtn.addEventListener('click', clearGesture);
    submitBtn.addEventListener('click', submitGesture);
}

function handleGestureStart(e) {
    e.preventDefault();
    isDrawing = true;
    gesturePoints = [];
    
    const rect = e.target.getBoundingClientRect();
    const point = getEventPoint(e, rect);
    gesturePoints.push(point);
    
    e.target.classList.add('active');
    announceToScreenReader('开始绘制手势');
}

function handleGestureMove(e) {
    if (!isDrawing) return;
    e.preventDefault();
    
    const rect = e.target.getBoundingClientRect();
    const point = getEventPoint(e, rect);
    gesturePoints.push(point);
    
    drawGesturePath();
}

function handleGestureEnd(e) {
    if (!isDrawing) return;
    e.preventDefault();
    
    isDrawing = false;
    e.target.classList.remove('active');
    
    if (gesturePoints.length > 0) {
        announceToScreenReader('手势绘制完成，共' + gesturePoints.length + '个点');
    }
}

function getEventPoint(e, rect) {
    let clientX, clientY;
    
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function drawGesturePath() {
    const gestureArea = document.getElementById('gesture-area');
    let pathElement = gestureArea.querySelector('.gesture-path');
    
    if (!pathElement) {
        pathElement = document.createElement('svg');
        pathElement.className = 'gesture-path';
        gestureArea.appendChild(pathElement);
    }
    
    if (gesturePoints.length < 2) return;
    
    const pathData = gesturePoints.reduce((path, point, index) => {
        const command = index === 0 ? 'M' : 'L';
        return path + `${command} ${point.x} ${point.y}`;
    }, '');
    
    pathElement.innerHTML = `<path d="${pathData}" stroke="#667eea" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function clearGesture() {
    gesturePoints = [];
    const gestureArea = document.getElementById('gesture-area');
    const pathElement = gestureArea.querySelector('.gesture-path');
    if (pathElement) {
        pathElement.remove();
    }
    gestureArea.classList.remove('active');
    announceToScreenReader('手势已清除');
}

async function submitGesture() {
    if (gesturePoints.length < 2) {
        announceToScreenReader('请先绘制手势');
        return;
    }
    
    const resultDiv = document.getElementById('gesture-result');
    resultDiv.textContent = '正在识别手势...';
    announceToScreenReader('正在识别手势');
    
    try {
        const suggestions = await sendGestureToBackend(gesturePoints);
        displaySuggestions(suggestions);
        announceToScreenReader('识别完成，找到' + suggestions.length + '个建议');
    } catch (error) {
        console.error('手势识别错误:', error);
        resultDiv.textContent = '手势识别失败: ' + error.message;
        announceToScreenReader('手势识别失败');
    }
}

async function sendGestureToBackend(points) {
    const gestureArea = document.getElementById('gesture-area');
    const rect = gestureArea.getBoundingClientRect();
    
    const data = {
        width: rect.width,
        height: rect.height,
        points_x: points.map(p => p.x),
        points_y: points.map(p => p.y),
        all_points_x: points.map(p => p.x),
        all_points_y: points.map(p => p.y),
        keys: [],
        time: Date.now(),
        sentense: ''
    };
    
    const response = await fetch(`${API_BASE_URL}/getData`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    return result.suggestedWords || [];
}

// 触摸位置捕获功能
function setupTouchCapture() {
    // 只对文本输入框添加触摸事件监听
    const textInput = document.getElementById('text-input');
    if (textInput) {
        textInput.addEventListener('touchstart', handleTextInputTouch, { passive: false });
        textInput.addEventListener('click', handleTextInputClick);
    }
    
    // 创建触摸显示区域
    createTouchDisplayArea();
    
    // 添加触摸位置信息显示区域
    addTouchPositionDisplay();
}

// 文本输入框触摸处理
function handleTextInputTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const textInput = e.target;
    
    const touchData = {
        x: touch.clientX,
        y: touch.clientY,
        timestamp: Date.now(),
        type: 'touch'
    };
    
    const character = getCharacterAtPosition(textInput, touchData.x, touchData.y);
    displayTextPosition(character, touchData);
    
    announceToScreenReader(`触摸位置识别: ${character}`);
}

// 文本输入框点击处理
function handleTextInputClick(e) {
    const textInput = e.target;
    
    const touchData = {
        x: e.clientX,
        y: e.clientY,
        timestamp: Date.now(),
        type: 'click'
    };
    
    const character = getCharacterAtPosition(textInput, touchData.x, touchData.y);
    displayTextPosition(character, touchData);
    
    announceToScreenReader(`点击位置识别: ${character}`);
}

// 根据点击位置获取对应的字符 - 使用浏览器原生API的精确版本
function getCharacterAtPosition(textInput, x, y) {
    const rect = textInput.getBoundingClientRect();
    const relativeX = x - rect.left;
    const relativeY = y - rect.top;
    
    const text = textInput.value || '';
    
    // 如果点击在空文本区域
    if (text.length === 0) {
        return {
            character: '[空文本]',
            position: 'Empty text area',
            coordinates: `(${Math.round(relativeX)}, ${Math.round(relativeY)})`,
            word: '',
            lineText: ''
        };
    }
    
    // 使用浏览器原生的字符位置计算方法
    const result = getCharacterPositionNative(textInput, relativeX, relativeY, text);
    
    return result;
}

// 使用浏览器原生API的字符位置计算
function getCharacterPositionNative(textInput, x, y, text) {
    // 保存当前选择状态
    const originalSelectionStart = textInput.selectionStart;
    const originalSelectionEnd = textInput.selectionEnd;
    
    try {
        // 创建一个临时的选择范围来获取点击位置
        const range = document.createRange();
        const selection = window.getSelection();
        
        // 清除现有选择
        selection.removeAllRanges();
        
        // 设置选择范围到文本输入框
        range.selectNodeContents(textInput);
        selection.addRange(range);
        
        // 使用浏览器原生的坐标到字符位置转换
        const charIndex = getCharacterIndexFromCoordinates(textInput, x, y);
        
        // 恢复原始选择状态
        textInput.setSelectionRange(originalSelectionStart, originalSelectionEnd);
        
        // 分割文本行
        const lines = text.split('\n');
        
        // 计算行号和列号
        let lineNumber = 0;
        let columnNumber = 0;
        let currentIndex = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const lineLength = lines[i].length;
            if (charIndex <= currentIndex + lineLength) {
                lineNumber = i;
                columnNumber = charIndex - currentIndex;
                break;
            }
            currentIndex += lineLength + 1; // +1 for newline character
        }
        
        const line = lines[lineNumber] || '';
        
        // 获取光标位置的完整单词
        const word = getWordAtPosition(line, columnNumber);
        
        // 获取字符
        let character = '';
        if (columnNumber >= 0 && columnNumber < line.length) {
            character = line[columnNumber];
        } else if (columnNumber >= line.length) {
            character = '[行尾]';
        } else {
            character = '[位置超出]';
        }
        
        // 调试信息
        const debugInfo = {
            lineNumber: lineNumber,
            columnNumber: columnNumber,
            charIndex: charIndex,
            adjustedX: Math.round(x),
            adjustedY: Math.round(y),
            lineHeight: Math.round(parseFloat(window.getComputedStyle(textInput).lineHeight) || parseFloat(window.getComputedStyle(textInput).fontSize) * 1.2),
            fontSize: Math.round(parseFloat(window.getComputedStyle(textInput).fontSize)),
            paddingLeft: Math.round(parseFloat(window.getComputedStyle(textInput).paddingLeft) || 0),
            paddingTop: Math.round(parseFloat(window.getComputedStyle(textInput).paddingTop) || 0),
            lineLength: line.length,
            textLength: text.length
        };
        
        return {
            character: character,
            position: `Line ${lineNumber + 1}, Column ${columnNumber + 1}`,
            coordinates: `(${Math.round(x)}, ${Math.round(y)})`,
            word: word,
            lineText: line,
            debug: debugInfo
        };
        
    } catch (error) {
        console.error('字符位置计算错误:', error);
        
        // 恢复原始选择状态
        textInput.setSelectionRange(originalSelectionStart, originalSelectionEnd);
        
        return {
            character: '[计算错误]',
            position: 'Calculation error',
            coordinates: `(${Math.round(x)}, ${Math.round(y)})`,
            word: '',
            lineText: '',
            debug: { error: error.message }
        };
    }
}

// 使用简单但可靠的坐标到字符索引算法
function getCharacterIndexFromCoordinates(textarea, x, y) {
    // 获取textarea的样式和位置信息
    const rect = textarea.getBoundingClientRect();
    const style = window.getComputedStyle(textarea);
    
    // 计算相对于textarea的坐标
    const relativeX = x - rect.left;
    const relativeY = y - rect.top;
    
    // 获取样式信息
    const fontSize = parseFloat(style.fontSize);
    const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.2;
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingTop = parseFloat(style.paddingTop) || 0;
    
    // 调整坐标（减去内边距）
    const adjustedX = relativeX - paddingLeft;
    const adjustedY = relativeY - paddingTop;
    
    // 分割文本行
    const text = textarea.value;
    const lines = text.split('\n');
    
    // 计算行号
    const lineNumber = Math.floor(adjustedY / lineHeight);
    
    // 检查行号是否有效
    if (lineNumber < 0 || lineNumber >= lines.length) {
        return Math.max(0, text.length - 1);
    }
    
    const line = lines[lineNumber];
    
    // 使用Canvas API精确计算字符位置
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    context.font = style.font;
    
    let currentX = 0;
    let charIndex = 0;
    
    // 逐个字符测量，找到点击位置
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const charWidth = context.measureText(char).width;
        
        // 如果点击位置在当前字符范围内
        if (adjustedX >= currentX && adjustedX < currentX + charWidth) {
            // 如果点击在字符的前半部分，选择这个字符
            if (adjustedX < currentX + charWidth / 2) {
                charIndex = i;
            } else {
                charIndex = i + 1;
            }
            break;
        }
        
        currentX += charWidth;
        // 不要在这里更新charIndex，只有在找到匹配时才更新
    }
    
    // 如果点击位置超出当前行，设置为行尾
    if (adjustedX >= currentX) {
        charIndex = line.length;
    }
    
    // 计算在整个文本中的绝对位置
    let absoluteIndex = 0;
    for (let i = 0; i < lineNumber; i++) {
        absoluteIndex += lines[i].length + 1; // +1 for newline
    }
    absoluteIndex += charIndex;
    
    return Math.min(absoluteIndex, text.length);
}

// 辅助函数：根据X坐标计算字符索引 - 更精确版本
function getCharacterIndexAtX(line, x, fontSize) {
    if (!line || line.length === 0) return 0;
    
    // 创建临时canvas来测量字符宽度
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    // 获取文本输入框的字体样式
    const textInput = document.getElementById('text-input');
    const computedStyle = window.getComputedStyle(textInput);
    context.font = computedStyle.font;
    
    let currentX = 0;
    
    // 逐个字符测量宽度，找到点击位置所在的字符
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const charWidth = context.measureText(char).width;
        
        // 如果点击位置在当前字符范围内
        if (x >= currentX && x < currentX + charWidth) {
            // 如果点击在字符的前半部分，选择这个字符
            if (x < currentX + charWidth / 2) {
                return i;
            } else {
                return i + 1;
            }
        }
        
        currentX += charWidth;
    }
    
    // 如果点击位置超过所有字符，返回行尾
    return line.length;
}

// 获取光标位置的完整单词
function getWordAtPosition(line, charIndex) {
    if (!line || line.length === 0) return '';
    
    // 定义单词边界字符
    const wordBoundaries = /[\s\.,!?;:'"()[\]{}]/;
    
    // 找到单词的开始位置
    let start = charIndex;
    while (start > 0 && !wordBoundaries.test(line[start - 1])) {
        start--;
    }
    
    // 找到单词的结束位置
    let end = charIndex;
    while (end < line.length && !wordBoundaries.test(line[end])) {
        end++;
    }
    
    // 提取单词
    const word = line.substring(start, end).trim();
    
    // 如果单词为空，返回光标位置的字符
    if (word === '') {
        if (charIndex < line.length) {
            return line[charIndex];
        } else {
            return '[行尾]';
        }
    }
    
    return word;
}

// 创建触摸显示区域
function createTouchDisplayArea() {
    const touchDisplayArea = document.createElement('div');
    touchDisplayArea.id = 'touch-display-area';
    touchDisplayArea.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
    `;
    
    document.body.appendChild(touchDisplayArea);
}

// 创建触摸指示器
function createTouchIndicator(touchData) {
    const indicator = document.createElement('div');
    indicator.className = 'touch-indicator';
    indicator.id = `touch-${touchData.id}`;
    indicator.style.cssText = `
        position: absolute;
        left: ${touchData.x - 10}px;
        top: ${touchData.y - 10}px;
        width: 20px;
        height: 20px;
        background: #ff4444;
        border: 2px solid #fff;
        border-radius: 50%;
        pointer-events: none;
        z-index: 10001;
        animation: touchPulse 0.5s ease-out;
    `;
    
    // 添加脉冲动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes touchPulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.5); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
        }
    `;
    if (!document.querySelector('#touch-animation-styles')) {
        style.id = 'touch-animation-styles';
        document.head.appendChild(style);
    }
    
    document.getElementById('touch-display-area').appendChild(indicator);
    
    // 3秒后自动移除指示器
    setTimeout(() => {
        if (indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
        }
    }, 3000);
}

// 更新触摸指示器位置
function updateTouchIndicator(touchData) {
    const indicator = document.getElementById(`touch-${touchData.id}`);
    if (indicator) {
        indicator.style.left = `${touchData.x - 10}px`;
        indicator.style.top = `${touchData.y - 10}px`;
        indicator.style.background = '#44ff44'; // 移动时变绿色
    }
}

// 移除触摸指示器
function removeTouchIndicator(touchId) {
    const indicator = document.getElementById(`touch-${touchId}`);
    if (indicator) {
        indicator.style.background = '#4444ff'; // 结束时变蓝色
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 500);
    }
}

// 显示文本位置信息
function displayTextPosition(characterInfo, touchData) {
    const positionDisplay = document.getElementById('touch-position-display');
    if (!positionDisplay) return;
    
    const time = new Date(touchData.timestamp).toLocaleTimeString();
    
    // 创建新的位置信息条目
    const positionEntry = document.createElement('div');
    positionEntry.className = 'touch-position-entry';
    
    // 根据识别的字符信息创建显示内容
    if (characterInfo.character === '[空文本]') {
        positionEntry.innerHTML = `
            <div style="color: #666;">${time} - Clicked on empty text area</div>
        `;
    } else if (characterInfo.character === '[位置超出]') {
        positionEntry.innerHTML = `
            <div style="color: #ff6b6b;">${time} - Click position out of text range</div>
            <div style="color: #888; font-size: 12px;">Coordinates: ${characterInfo.coordinates}</div>
        `;
    } else {
        let debugInfo = '';
        if (characterInfo.debug) {
            debugInfo = `
                <div style="color: #95a5a6; font-size: 10px; margin-top: 4px;">
                    Debug: Line ${characterInfo.debug.lineNumber + 1}, Char ${characterInfo.debug.charIndex + 1}<br>
                    Adjusted: X=${characterInfo.debug.adjustedX}, Y=${characterInfo.debug.adjustedY}<br>
                    Style: LineHeight=${characterInfo.debug.lineHeight}, FontSize=${characterInfo.debug.fontSize}<br>
                    Padding: Left=${characterInfo.debug.paddingLeft}, Top=${characterInfo.debug.paddingTop}<br>
                    Text: LineLength=${characterInfo.debug.lineLength}, TotalLength=${characterInfo.debug.textLength}
                </div>
            `;
        }
        
        positionEntry.innerHTML = `
            <div style="color: #2ecc71; font-weight: bold;">${time} - Recognized character: "${characterInfo.character}"</div>
            <div style="color: #3498db;">Position: ${characterInfo.position}</div>
            <div style="color: #888; font-size: 12px;">Coordinates: ${characterInfo.coordinates}</div>
            ${characterInfo.word ? `<div style="color: #e74c3c; font-weight: bold; font-size: 13px; margin-top: 3px;">Word: "${characterInfo.word}"</div>` : ''}
            ${characterInfo.lineText ? `<div style="color: #95a5a6; font-size: 11px; margin-top: 2px;">Line content: "${characterInfo.lineText}"</div>` : ''}
            ${debugInfo}
        `;
    }
    
    // 添加到显示区域
    positionDisplay.appendChild(positionEntry);
    
    // 限制显示条目数量（只保留最近的8条）
    const entries = positionDisplay.children;
    if (entries.length > 8) {
        positionDisplay.removeChild(entries[0]);
    }
    
    // 自动滚动到底部
    positionDisplay.scrollTop = positionDisplay.scrollHeight;
}

// 添加触摸位置显示区域
function addTouchPositionDisplay() {
    // 查找合适的位置插入显示区域
    const gestureSection = document.querySelector('.input-section');
    if (!gestureSection) return;
    
    const displayDiv = document.createElement('div');
    displayDiv.style.cssText = `
        margin-top: 20px;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #dee2e6;
    `;
    
    displayDiv.innerHTML = `
        <h3 style="margin-bottom: 15px; color: #495057;">Text Character Recognition</h3>
        <div id="touch-position-display" style="
            background: white;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 10px;
            max-height: 250px;
            overflow-y: auto;
            font-family: monospace;
            font-size: 13px;
            line-height: 1.4;
        ">
            <div style="color: #666; text-align: center;">Click or touch in the text input box, and the recognized character information will be displayed here</div>
        </div>
    `;
    
    gestureSection.appendChild(displayDiv);
}

// 清除文本识别显示
function clearTouchPositionDisplay() {
    const positionDisplay = document.getElementById('touch-position-display');
    if (positionDisplay) {
        positionDisplay.innerHTML = '<div style="color: #666; text-align: center;">Click or touch in the text input box, and the recognized character information will be displayed here</div>';
    }
    
    // 清除触摸指示器
    const displayArea = document.getElementById('touch-display-area');
    if (displayArea) {
        displayArea.innerHTML = '';
    }
    
    // 重置触摸位置数组
    touchPositions = [];
}

// 测试段落功能
function setupTestParagraphs() {
    const testButtons = document.querySelectorAll('.test-btn');
    const textInput = document.getElementById('text-input');
    
    const testParagraphs = [
        "Good morning! I wake up at 7 AM every day and start my morning routine. First, I brush my teeth and wash my face. Then I have breakfast with my family. After that, I check my emails and plan my day. Finally, I leave home for work around 8:30 AM.",
        
        "Today was a busy day at the office. I had three important meetings with clients and finished two project reports. My colleague Sarah helped me with the presentation for tomorrow's conference. I also received positive feedback from my manager about the quarterly review. I'm looking forward to the weekend to relax and spend time with friends.",
        
        "I went shopping at the mall this afternoon. I bought a new jacket for the winter season and some groceries for the week. The store was quite crowded, but I found everything I needed. I also stopped by the coffee shop to get my favorite latte. The total cost was reasonable, and I'm satisfied with my purchases.",
        
        "I'm studying for my English exam next week. I've been reading textbooks and practicing grammar exercises every evening. My study group meets twice a week to discuss difficult topics. I also watch educational videos online to improve my pronunciation. I feel confident about passing the exam with a good grade.",
        
        "Last weekend, I attended my friend's birthday party. We had a great time dancing and chatting with old friends. The food was delicious, especially the homemade cake. I also met some interesting new people at the party. We stayed until late in the evening and had wonderful memories together."
    ];
    
    testButtons.forEach((button, index) => {
        button.addEventListener('click', () => {
            // 移除其他按钮的active状态
            testButtons.forEach(btn => btn.classList.remove('active'));
            // 添加当前按钮的active状态
            button.classList.add('active');
            // 将对应段落放入文本框
            textInput.value = testParagraphs[index];
            currentText = testParagraphs[index];
    updateFinalText();
            announceToScreenReader('已加载测试段落 ' + (index + 1));
        });
    });
}

// 文本输入功能
function setupTextInput() {
    const textInput = document.getElementById('text-input');
    textInput.addEventListener('input', handleTextChange);
    }

function handleTextChange(e) {
    currentText = e.target.value;
    updateFinalText();
}

// 建议单词显示
function displaySuggestions(suggestions) {
    const suggestionsDiv = document.getElementById('suggestions');
    suggestionsDiv.innerHTML = '';
    
    suggestions.forEach((suggestion, index) => {
        const button = document.createElement('button');
        button.className = 'suggestion-item';
        button.textContent = suggestion;
        button.setAttribute('aria-label', `建议单词 ${index + 1}: ${suggestion}`);
        button.addEventListener('click', () => selectSuggestion(suggestion));
        suggestionsDiv.appendChild(button);
    });
}

function selectSuggestion(suggestion) {
    currentText += suggestion + ' ';
    updateFinalText();
    announceToScreenReader('已选择建议: ' + suggestion);
}


// 最终文本管理
function updateFinalText() {
    const finalTextDiv = document.getElementById('final-text');
    finalText = currentText.trim();
    finalTextDiv.textContent = finalText || '您的文本将显示在这里...';
}

// 事件监听器设置
function setupEventListeners() {
    const clearAllBtn = document.getElementById('clear-all');
    const copyBtn = document.getElementById('copy-text');
    const readFinalBtn = document.getElementById('read-final');
    
    clearAllBtn.addEventListener('click', clearAll);
    copyBtn.addEventListener('click', copyText);
    readFinalBtn.addEventListener('click', readFinalText);
}

function clearAll() {
    currentText = '';
    gesturePoints = [];
    clearGesture();
    clearText();
    document.getElementById('suggestions').innerHTML = '';
    document.getElementById('voice-result').textContent = '';
    document.getElementById('gesture-result').textContent = '';
    announceToScreenReader('所有内容已清除');
}

function copyText() {
    if (finalText) {
        navigator.clipboard.writeText(finalText).then(() => {
            announceToScreenReader('文本已复制到剪贴板');
        }).catch(err => {
            console.error('复制失败:', err);
            announceToScreenReader('复制失败');
        });
    } else {
        announceToScreenReader('没有文本可复制');
    }
}

function readFinalText() {
    if (finalText) {
        speakText(finalText);
    } else {
        announceToScreenReader('没有文本可朗读');
    }
}

// 语音合成
function speakText(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.8;
        utterance.pitch = 1;
        speechSynthesis.speak(utterance);
    }
}

// 屏幕阅读器支持
function announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.className = 'sr-only';
    announcement.setAttribute('aria-live', 'polite');
    announcement.textContent = message;
    document.body.appendChild(announcement);
    
    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

// 键盘快捷键
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + Enter: 开始语音录制
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isRecording) {
            startVoiceRecording();
        }
    }
    
    // Escape: 停止当前操作
    if (e.key === 'Escape') {
        if (isRecording) {
            stopVoiceRecording();
        }
        if (isDrawing) {
            handleGestureEnd(e);
        }
    }
    
    // Space: 朗读当前文本
    if (e.key === ' ' && e.ctrlKey) {
        e.preventDefault();
        readFinalText();
    }
});

// 错误处理
window.addEventListener('error', function(e) {
    console.error('应用错误:', e.error);
    announceToScreenReader('应用出现错误，请刷新页面重试');
});

// 网络状态检测
window.addEventListener('online', function() {
    announceToScreenReader('网络连接已恢复');
});

window.addEventListener('offline', function() {
    announceToScreenReader('网络连接已断开，部分功能可能不可用');
});

// 添加测试功能
function addTestFunctionality() {
    const textInput = document.getElementById('text-input');
    if (!textInput) return;
    
    // 添加键盘快捷键测试
    textInput.addEventListener('keydown', function(e) {
        // Ctrl + Shift + T: 测试坐标计算
        if (e.ctrlKey && e.shiftKey && e.key === 'T') {
            e.preventDefault();
            testCoordinateCalculation();
        }
        
        // Ctrl + R: 朗读选中文本
        if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            readSelectedText(textInput);
        }
        
        // Ctrl + A: 朗读全部文本
        if (e.ctrlKey && e.key === 'a') {
            e.preventDefault();
            const text = textInput.value;
            if (text) {
                speakText(text);
            }
        }
        
        // Escape: 停止朗读
        if (e.key === 'Escape') {
            stopSpeaking();
        }
    });
    
    // 添加右键菜单测试
    textInput.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        testCoordinateCalculation();
    });
}

// 测试坐标计算功能
function testCoordinateCalculation() {
    const textInput = document.getElementById('text-input');
    const rect = textInput.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(textInput);
    
    console.log('=== 坐标计算测试 ===');
    console.log('TextInput rect:', rect);
    console.log('Font size:', computedStyle.fontSize);
    console.log('Line height:', computedStyle.lineHeight);
    console.log('Padding left:', computedStyle.paddingLeft);
    console.log('Padding top:', computedStyle.paddingTop);
    console.log('Font family:', computedStyle.fontFamily);
    
    // 测试几个关键位置的字符识别
    const testPositions = [
        { x: rect.left + 20, y: rect.top + 20, desc: '左上角' },
        { x: rect.left + rect.width / 2, y: rect.top + 20, desc: '第一行中间' },
        { x: rect.left + rect.width - 20, y: rect.top + 20, desc: '右上角' }
    ];
    
    testPositions.forEach((pos, index) => {
        const character = getCharacterAtPosition(textInput, pos.x, pos.y);
        console.log(`测试位置 ${index + 1} (${pos.desc}):`, character);
    });
}

// 语音合成功能 - 类似iPhone旁白
function setupTextToSpeech() {
    const textInput = document.getElementById('text-input');
    if (!textInput) return;
    
    // 为文本输入框添加点击朗读功能
    textInput.addEventListener('click', function(e) {
        handleTextClick(e, textInput);
    });
    
    // 为文本输入框添加触摸朗读功能
    textInput.addEventListener('touchend', function(e) {
        handleTextClick(e, textInput);
    });
    
    // 添加键盘导航朗读功能
    textInput.addEventListener('keyup', function(e) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || 
            e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            readCurrentPosition(textInput);
        }
    });
}


// 全页面点击朗读（扩展旁白到整个页面）
function setupPageNarration() {
    // 避免重复绑定
    if (window.__pageNarrationBound) return;
    window.__pageNarrationBound = true;

    const shouldIgnoreTarget = (el) => {
        if (!el) return true;
        // 忽略交互/输入控件，避免影响正常点击
        const tag = el.tagName ? el.tagName.toLowerCase() : '';
        if (['input', 'textarea', 'select', 'button', 'label'].includes(tag)) return true;
        if (tag === 'a' && el.getAttribute('href')) return true;
        if (el.isContentEditable) return true;
        // 忽略具有 data-no-tts 的元素
        if (el.closest && el.closest('[data-no-tts]')) return true;
        // 如果在旁白控制按钮区域，忽略
        if (el.closest && el.closest('#speech-controls')) return true;
        return false;
    };

    const handler = (event) => {
        try {
            const textInput = document.getElementById('text-input');
            // 如果文本框处于焦点，且点击不在文本框内，不做全局朗读干扰
            if (textInput && document.activeElement === textInput && !(textInput === event.target || (textInput.contains && textInput.contains(event.target)))) {
                return;
            }
            // 如果点击发生在文本框内部，则交给文本框自身的点击处理函数
            if (textInput && (event.target === textInput || (textInput.contains && textInput.contains(event.target)))) {
                return;
            }
            if (shouldIgnoreTarget(event.target)) return;

            // 基于当前选区/目标节点，提取被点击的“单词/字符”（不扩展窗口）
            const text = getWordFromSelection(event);
            if (text && text.trim()) {
                stopSpeaking();
                speakText(text);
            }
        } catch (e) {
            // 静默失败，避免打断正常点击
        }
    };

    // 使用捕获阶段更容易在元素阻止冒泡前拿到事件坐标
    document.addEventListener('click', handler, true);
    document.addEventListener('touchend', handler, true);
}

// 从当前选区/目标节点提取“单词/字符”（不扩展窗口）
function getWordFromSelection(event) {
    const sel = window.getSelection && window.getSelection();
    let node = sel && sel.anchorNode ? sel.anchorNode : null;
    let offset = sel && typeof sel.anchorOffset === 'number' ? sel.anchorOffset : 0;

    // 若选区无效，尝试从目标节点获取文本节点
    if (!node) {
        node = nearestTextNodeFromTarget(event && event.target);
        offset = 0;
    }

    if (!node) return null;
    if (node.nodeType !== Node.TEXT_NODE) {
        node = nearestTextNodeFromTarget(node);
        offset = 0;
    }
    if (!node || !node.nodeValue) return null;

    const text = node.nodeValue;
    const idx = Math.max(0, Math.min(offset, text.length - 1));
    return extractWordOrChar(text, idx);
}

function nearestTextNodeFromTarget(target) {
    if (!target) return null;
    if (target.nodeType === Node.TEXT_NODE) return target;
    // 先向内查找
    const inward = document.createTreeWalker(target, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => n.nodeValue && n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    });
    const inside = inward.nextNode();
    if (inside) return inside;
    // 再向附近查找
    return findNearestTextNode(target);
}

// 将文本按 token 拆分并返回窗口字符串
function getTokensWindow(line, index, windowSize) {
    const tokens = tokenizeWithRanges(line);
    if (tokens.length === 0) return null;

    // 找到包含 index 的 token；若在空白或间隙，寻找最近的非空白 token
    let hit = -1;
    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        if (index >= t.start && index < t.end) { hit = i; break; }
    }
    if (hit === -1) {
        let best = -1, bestDist = Infinity;
        for (let i = 0; i < tokens.length; i++) {
            const t = tokens[i];
            const dist = Math.min(Math.abs(index - t.start), Math.abs(index - (t.end - 1)));
            if (dist < bestDist) { bestDist = dist; best = i; }
        }
        hit = best === -1 ? 0 : best;
    }

    const start = Math.max(0, hit - windowSize);
    const end = Math.min(tokens.length - 1, hit + windowSize);
    return joinTokens(tokens.slice(start, end + 1));
}

// 将字符串 token 化并附带起止位置
function tokenizeWithRanges(text) {
    const tokens = [];
    let i = 0;
    const isWordChar = (c) => /[\w']/.test(c);
    const isCJK = (c) => /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/.test(c);
    const isWhitespace = (c) => /\s/.test(c);

    while (i < text.length) {
        const c = text[i];
        if (isWhitespace(c)) { i++; continue; }
        if (isCJK(c)) {
            tokens.push({ text: c, start: i, end: i + 1, cjk: true });
            i++;
            continue;
        }
        if (isWordChar(c)) {
            const s = i;
            i++;
            while (i < text.length && isWordChar(text[i])) i++;
            tokens.push({ text: text.slice(s, i), start: s, end: i, cjk: false });
            continue;
        }
        // 标点作为独立 token
        tokens.push({ text: c, start: i, end: i + 1, cjk: false });
        i++;
    }
    return tokens;
}

function joinTokens(tokens) {
    if (!tokens || tokens.length === 0) return '';
    let result = '';
    for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i];
        const prev = tokens[i - 1];
        const needSpace = prev && !prev.cjk && !t.cjk && /[\w']$/.test(prev.text) && /^[\w']/.test(t.text);
        result += (needSpace ? ' ' : '') + t.text;
    }
    return result;
}

// 基于 textarea 的光标位置，返回中心词前后各 windowSize 个 token
function getTokensAroundTextareaCaret(textInput, windowSize) {
    if (!textInput) return null;
    const text = textInput.value || '';
    if (!text) return null;
    const caret = Math.max(0, (textInput.selectionStart || 0) - 1);
    return getTokensWindow(text, caret, windowSize);
}

function findNearestTextNode(el) {
    // 向上找同级文本
    let cur = el;
    while (cur && cur !== document && cur.nodeType !== Node.TEXT_NODE) {
        const prev = previousTextNode(cur);
        if (prev) return prev;
        const next = nextTextNode(cur);
        if (next) return next;
        cur = cur.parentNode;
    }
    return null;
}

function previousTextNode(el) {
    let n = el;
    while (n) {
        if (n.previousSibling) {
            n = n.previousSibling;
            while (n && n.lastChild) n = n.lastChild;
        } else {
            n = n.parentNode;
        }
        if (!n) break;
        if (n.nodeType === Node.TEXT_NODE && n.nodeValue && n.nodeValue.trim()) return n;
    }
    return null;
}

function nextTextNode(el) {
    let n = el;
    while (n) {
        if (n.nextSibling) {
            n = n.nextSibling;
            while (n && n.firstChild) n = n.firstChild;
        } else {
            n = n.parentNode;
        }
        if (!n) break;
        if (n.nodeType === Node.TEXT_NODE && n.nodeValue && n.nodeValue.trim()) return n;
    }
    return null;
}

// 提取点击位置的“词”或字符：
// - 英文/数字：整词（\w 连续）
// - 中文/日文/韩文：单字符，若左右是 CJK，也可扩展为相邻 2-3 字
// - 若为标点，尝试返回所在句子的短片段
function extractWordOrChar(line, index) {
    if (!line || index < 0 || index >= line.length) return null;

    const ch = line[index];
    const isWordChar = /[\w']/;
    const isCJK = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;
    const isWhitespace = /\s/;

    // 英文等：取整词
    if (isWordChar.test(ch)) {
        let s = index, e = index;
        while (s > 0 && isWordChar.test(line[s - 1])) s--;
        while (e < line.length - 1 && isWordChar.test(line[e + 1])) e++;
        return line.substring(s, e + 1);
    }

    // CJK：返回单字符，若左右也是 CJK，则扩展到 2-3 个字符以更自然
    if (isCJK.test(ch)) {
        let s = index, e = index;
        // 尝试向左右各扩展 1 个 CJK 字符
        if (s > 0 && isCJK.test(line[s - 1])) s--;
        if (e < line.length - 1 && isCJK.test(line[e + 1])) e++;
        return line.substring(s, e + 1);
    }

    // 标点或其他：尝试提取所在句子片段
    if (!isWhitespace.test(ch)) {
        const sentenceDelim = /[。！？.!?]/;
        let s = index, e = index;
        while (s > 0 && !sentenceDelim.test(line[s - 1])) s--;
        while (e < line.length - 1 && !sentenceDelim.test(line[e + 1])) e++;
        const snippet = line.substring(s, Math.min(e + 2, line.length));
        return snippet.trim();
    }

    // 空白：返回就近的非空白字符
    let left = index - 1, right = index + 1;
    while (left >= 0 || right < line.length) {
        if (left >= 0 && !isWhitespace.test(line[left])) return extractWordOrChar(line, left);
        if (right < line.length && !isWhitespace.test(line[right])) return extractWordOrChar(line, right);
        left--; right++;
    }
    return null;
}

// 处理文本点击事件
function handleTextClick(event, textInput) {
    event.preventDefault();
    
    // 停止当前朗读
    stopSpeaking();
    
    // 先让浏览器根据这次点击更新光标位置，再读取 selectionStart
    if (textInput && typeof textInput.focus === 'function') {
        textInput.focus();
    }
    
    window.requestAnimationFrame(() => {
        const textToRead = getTextAtSelection(textInput);
        if (textToRead) {
            speakText(textToRead);
        }
    });
}

    // 获取点击位置的文本内容
function getTextAtClickPosition(event, textInput) {
    // 改为基于当前选区读取，避免坐标到字符索引的误差
    return getTextAtSelection(textInput);
}

// 基于当前选区位置获取文本内容（更稳定）
function getTextAtSelection(textInput) {
    if (!textInput) return null;
    const text = textInput.value || '';
    if (!text) return null;
    
    const cursorPosition = getCursorPosition(null, textInput);
    return getTextAroundPosition(text, cursorPosition);
}

// 获取光标位置（基于 selectionStart，更稳健）
function getCursorPosition(event, textInput) {
    const text = (textInput && textInput.value) || '';
    if (!text) return { line: 0, column: 0, text: '', fullText: '' };

    // 直接使用 selectionStart，避免坐标映射误差
    let charIndex = textInput.selectionStart || 0;

    const lines = text.split('\n');
    let currentIndex = 0;
    let lineNumber = 0;
    let columnNumber = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (charIndex <= currentIndex + line.length) {
            lineNumber = i;
            columnNumber = charIndex - currentIndex;
            break;
        }
        currentIndex += line.length + 1; // 加上换行符
    }

    return {
        line: lineNumber,
        column: columnNumber,
        text: lines[lineNumber],
        fullText: text
    };
}

// 获取光标周围的文本内容
function getTextAroundPosition(text, position) {
    if (!position) return text;
    
    const lines = text.split('\n');
    const currentLine = lines[position.line] || '';
    
    // 如果点击在单词中间，尝试获取完整单词
    const wordMatch = getWordAtPosition(currentLine, position.column);
    if (wordMatch) {
        return wordMatch;
    }
    
    // 否则返回当前行的内容
    return currentLine || text;
}

// 获取指定位置的单词
function getWordAtPosition(line, column) {
    if (!line) return null;
    
    // 找到单词边界
    let start = column;
    let end = column;
    
    // 向前查找单词开始
    while (start > 0 && /\w/.test(line[start - 1])) {
        start--;
    }
    
    // 向后查找单词结束
    while (end < line.length && /\w/.test(line[end])) {
        end++;
    }
    
    if (start < end) {
        return line.substring(start, end);
    }
    
    return null;
}

// 朗读文本
function speakText(text) {
    if (!text || text.trim() === '') return;
    
    // 停止当前朗读
    stopSpeaking();
    
    // 创建新的语音合成实例
    currentUtterance = new SpeechSynthesisUtterance(text);
    
    // 设置语音参数
    currentUtterance.rate = 0.9;  // 语速
    currentUtterance.pitch = 1.0; // 音调
    currentUtterance.volume = 1.0; // 音量
    
    // 尝试选择更好的语音
    const voices = speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
        voice.lang.startsWith('en') && voice.name.includes('Enhanced')
    ) || voices.find(voice => voice.lang.startsWith('en'));
    
    if (preferredVoice) {
        currentUtterance.voice = preferredVoice;
    }
    
    // 设置事件监听器
    currentUtterance.onstart = function() {
        isSpeaking = true;
        console.log('开始朗读:', text);
    };
    
    currentUtterance.onend = function() {
        isSpeaking = false;
        console.log('朗读结束');
    };
    
    currentUtterance.onerror = function(event) {
        isSpeaking = false;
        console.error('朗读错误:', event.error);
    };
    
    // 开始朗读
    speechSynthesis.speak(currentUtterance);
}

// 停止朗读
function stopSpeaking() {
    if (isSpeaking) {
        speechSynthesis.cancel();
        isSpeaking = false;
    }
}

// 朗读当前位置
function readCurrentPosition(textInput) {
    const text = textInput.value;
    const cursorPos = textInput.selectionStart || 0;
    
    if (text && cursorPos >= 0) {
        // 获取光标位置的字符
        const char = text[cursorPos];
        if (char) {
            speakText(char);
        }
    }
}

// 朗读选中文本
function readSelectedText(textInput) {
    const selectedText = textInput.value.substring(
        textInput.selectionStart, 
        textInput.selectionEnd
    );
    
    if (selectedText) {
        speakText(selectedText);
    }
}
