// 全局变量
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let recognition = null;
let gesturePoints = [];
let isDrawing = false;
let currentText = '';
let finalText = '';
let touchPositions = [];
let isCapturingTouch = false;

// 将变量暴露到全局作用域，以便测试页面访问
window.touchPositions = touchPositions;

// 后端API配置
const API_BASE_URL = 'http://localhost:8000';

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupVoiceInput();
    setupGestureInput();
    setupTouchCapture();
    setupTextInput();
    setupTestParagraphs();
    setupEventListeners();
    announceToScreenReader('盲人输入助手已加载完成');
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

// 根据点击位置获取对应的字符
function getCharacterAtPosition(textInput, x, y) {
    const rect = textInput.getBoundingClientRect();
    const relativeX = x - rect.left;
    const relativeY = y - rect.top;
    
    // 获取文本输入框的样式信息
    const computedStyle = window.getComputedStyle(textInput);
    const fontSize = parseFloat(computedStyle.fontSize);
    const fontFamily = computedStyle.fontFamily;
    const lineHeight = parseFloat(computedStyle.lineHeight) || fontSize * 1.2;
    
    // 估算字符宽度（中文字符约为字体大小的1倍，英文字符约为0.6倍）
    const avgCharWidth = fontSize * 0.8;
    
    // 计算点击位置对应的字符索引
    const text = textInput.value || '';
    const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
    
    // 计算点击位置在文本中的位置
    const adjustedX = relativeX - paddingLeft;
    const adjustedY = relativeY - paddingTop;
    
    // 计算行号
    const lineNumber = Math.floor(adjustedY / lineHeight);
    
    // 计算在该行的字符位置
    const charIndex = Math.floor(adjustedX / avgCharWidth);
    
    // 获取文本行（简单按换行符分割）
    const lines = text.split('\n');
    if (lineNumber >= 0 && lineNumber < lines.length) {
        const line = lines[lineNumber];
        if (charIndex >= 0 && charIndex < line.length) {
            const character = line[charIndex];
            return {
                character: character,
                position: `${lineNumber + 1}行${charIndex + 1}列`,
                coordinates: `(${Math.round(relativeX)}, ${Math.round(relativeY)})`,
                lineText: line
            };
        } else if (charIndex >= line.length) {
            return {
                character: '[行尾]',
                position: `${lineNumber + 1}行末尾`,
                coordinates: `(${Math.round(relativeX)}, ${Math.round(relativeY)})`,
                lineText: line
            };
        }
    }
    
    // 如果点击在文本末尾或空行
    if (text.length === 0) {
        return {
            character: '[空文本]',
            position: '文本开头',
            coordinates: `(${Math.round(relativeX)}, ${Math.round(relativeY)})`,
            lineText: ''
        };
    }
    
    return {
        character: '[位置超出]',
        position: `${lineNumber + 1}行${charIndex + 1}列`,
        coordinates: `(${Math.round(relativeX)}, ${Math.round(relativeY)})`,
        lineText: lines[lines.length - 1] || ''
    };
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
            <div style="color: #666;">${time} - 点击了空文本区域</div>
        `;
    } else if (characterInfo.character === '[位置超出]') {
        positionEntry.innerHTML = `
            <div style="color: #ff6b6b;">${time} - 点击位置超出文本范围</div>
            <div style="color: #888; font-size: 12px;">坐标: ${characterInfo.coordinates}</div>
        `;
    } else {
        positionEntry.innerHTML = `
            <div style="color: #2ecc71; font-weight: bold;">${time} - 识别字符: "${characterInfo.character}"</div>
            <div style="color: #3498db;">位置: ${characterInfo.position}</div>
            <div style="color: #888; font-size: 12px;">坐标: ${characterInfo.coordinates}</div>
            ${characterInfo.lineText ? `<div style="color: #95a5a6; font-size: 11px; margin-top: 2px;">行内容: "${characterInfo.lineText}"</div>` : ''}
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
        <h3 style="margin-bottom: 15px; color: #495057;">文本字符识别</h3>
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
            <div style="color: #666; text-align: center;">在文本输入框中点击或触摸，识别出的字符信息将显示在这里</div>
        </div>
    `;
    
    gestureSection.appendChild(displayDiv);
}

// 清除文本识别显示
function clearTouchPositionDisplay() {
    const positionDisplay = document.getElementById('touch-position-display');
    if (positionDisplay) {
        positionDisplay.innerHTML = '<div style="color: #666; text-align: center;">在文本输入框中点击或触摸，识别出的字符信息将显示在这里</div>';
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
