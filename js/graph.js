// Query dark mode setting
function isDark() {
    return (
        localStorage.getItem("theme") === "dark" ||
        (!localStorage.getItem("theme") &&
            window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
}

// Get URL of current page and also current node
var curr_url = decodeURI(window.location.href.replace(location.origin, ""));
if (curr_url.endsWith("/")) {
    curr_url = curr_url.slice(0, -1);
}

// 노드 이름 최적화 함수 - 숫자만 추출
function truncateNodeLabel(label, maxLength = 15) {
    if (!label) return '';
    
    // 파일 확장자 제거
    label = label.replace(/\.(md|txt|html|pdf)$/i, '');
    
    // 숫자 패턴 추출 (파일명이 숫자로 시작하는 경우)
    const numberMatch = label.match(/^(\d+)/);
    if (numberMatch) {
        return numberMatch[1]; // 앞의 숫자만 반환
    }
    
    // 숫자가 없는 경우 기존 로직 적용
    // 특수 문자나 숫자로 시작하는 부분 제거 (예: "01. ", "- ", "# " 등)
    label = label.replace(/^[\d\s\-#*\.]+/, '');
    
    // 괄호 안의 내용 제거
    label = label.replace(/\([^)]*\)/g, '');
    label = label.replace(/\[[^\]]*\]/g, '');
    
    // 여러 공백을 하나로 변환 및 앞뒤 공백 제거
    label = label.replace(/\s+/g, ' ').trim();
    
    // 길이 제한
    if (label.length > maxLength) {
        // 단어 단위로 자르기 시도
        const words = label.split(' ');
        let result = '';
        for (const word of words) {
            if ((result + word).length <= maxLength - 3) {
                result += (result ? ' ' : '') + word;
            } else {
                break;
            }
        }
        
        if (result.length > 0) {
            return result + '...';
        } else {
            // 단어가 너무 길면 문자 단위로 자르기
            return label.substring(0, maxLength - 3) + '...';
        }
    }
    
    return label || '?'; // 빈 라벨인 경우 물음표 표시
}
var container = document.getElementById("graph");

// Parse nodes and edges
try {
    var curr_node = graph_data.nodes.filter(
        (node) => curr_url.toLowerCase().endsWith(decodeURI(node.url).toLowerCase())
    );
} catch (error) {
    var curr_node = null;
}
var nodes = null;
var edges = new vis.DataSet(graph_data.edges);

// 노드 라벨 최적화 적용
var optimizedNodes = graph_data.nodes.map(node => {
    const isDarkMode = isDark();
    return {
        ...node,
        label: truncateNodeLabel(node.label || node.title || node.id, 15),
        title: node.label || node.title || node.id, // 원본 제목은 tooltip으로 보존
        font: {
            size: 12,
            face: 'arial',
            color: isDarkMode ? '#ffffff' : '#333333',
            background: isDarkMode ? 'rgba(42,42,42,0.8)' : 'rgba(255,255,255,0.8)',
            strokeWidth: 1,
            strokeColor: isDarkMode ? '#2a2a2a' : '#ffffff'
        }
    };
});

if (curr_node.length > 0) {
    curr_node = curr_node[0];

    // Get nodes connected to current
    var connected_nodes = graph_data.edges
        .filter((edge) => edge.from == curr_node.id || edge.to == curr_node.id)
        .map((edge) => {
            if (edge.from == curr_node.id) {
                return edge.to;
            }
            return edge.from;
        });

    if (graph_is_local) {
        nodes = new vis.DataSet(
            optimizedNodes.filter(
                (node) =>
                    node.id == curr_node.id || connected_nodes.includes(node.id)
            )
        );
    } else {
        nodes = new vis.DataSet(optimizedNodes);
    }
} else {
    curr_node = null;
    nodes = new vis.DataSet(optimizedNodes);
}

// Get nodes and edges from generated javascript
var max_node_val = Math.max(...nodes.map((node) => node.value));

// Highlight current node and set to center
console.log(curr_node);
console.log("-")
console.log(nodes);
if (curr_node) {
    nodes.update({
        id: curr_node.id,
        value: Math.max(4, max_node_val * 2.5),
        shape: "dot",
        color: "#a6a7ed",
        font: {
            strokeWidth: 1,
        },
        x: 0,
        y: 0,
    });
}

// Construct graph with enhanced spacing options
var baseOptions = 
        {
        	nodes: {
        		shape: "dot",
        		color: isDark() ? "#8c8e91" : "#dee2e6",
        		font: {
        			face: "Inter",
        			color: isDark() ? "#c9cdd1" : "#616469",
        			strokeColor: isDark() ? "#c9cdd1" : "#616469",
        		},
        		scaling: {
        			label: {
        				enabled: true,
        			},
        		},
        	},
        	edges: {
        		color: { inherit: "both" },
        		width: 0.8,
        		smooth: {
        			type: "continuous",
        		},
        		hoverWidth: 4,
        	},
        	interaction: {
        		hover: true,
        	},
        	height: "100%",
        	width: "100%",
        	physics: {
        		solver: "repulsion",
        	},
        }
        ;

// Enhanced options for better node spacing
var options = {
    ...baseOptions,
    physics: {
        enabled: true,
        repulsion: {
            nodeDistance: 200, // 노드 간 기본 거리
            centralGravity: 0.1,
            springLength: 150,
            springConstant: 0.05,
            damping: 0.1
        },
        solver: 'repulsion'
    },
    layout: {
        improvedLayout: true
    },
    nodes: {
        ...baseOptions.nodes,
        margin: {
            top: 10,
            right: 10,
            bottom: 10,
            left: 10
        },
        widthConstraint: {
            minimum: 50,
            maximum: 100
        }
    }
};

var graph = new vis.Network(
    container,
    {
        nodes: nodes,
        edges: edges,
    },
    options
);

// Clickable URL
graph.on("selectNode", function (params) {
    if (params.nodes.length === 1) {
        var node = nodes.get(params.nodes[0]);
        var mode = ""
        if (graph_link_replace) {
            mode = "_self"
        } else {
            mode ="_blank";
        }
        window.open(node.root_url, mode);
    }
});

// Focus on current node + scaling
graph.once("afterDrawing", function () {
    if (curr_node) {
        if (!graph_is_local) {
            graph.focus(curr_node.id, {
                scale: Math.max(1.0, Math.min(1.8, container.clientWidth / 600)),
                locked: true,
            });
        }
    } else {
        var clientHeight = container.clientHeight;
        graph.moveTo({
            position: {
                x: 0,
                y: -clientHeight / 2,
            },
            scale: Math.max(0.8, Math.min(1.5, container.clientWidth / 800)),
        });
    }
});

// 줌 컨트롤 버튼 추가
function addZoomControls() {
    // 컨트롤 패널 생성
    const controlPanel = document.createElement('div');
    controlPanel.id = 'graph-controls';
    controlPanel.style.position = 'absolute';
    controlPanel.style.top = '10px';
    controlPanel.style.right = '10px';
    controlPanel.style.zIndex = '1000';
    controlPanel.style.display = 'flex';
    controlPanel.style.flexDirection = 'column';
    controlPanel.style.gap = '5px';

    // 줌 인 버튼
    const zoomInBtn = document.createElement('button');
    zoomInBtn.textContent = '+';
    zoomInBtn.title = 'Zoom In';
    zoomInBtn.style.width = '35px';
    zoomInBtn.style.height = '35px';
    zoomInBtn.style.fontSize = '18px';
    zoomInBtn.style.border = '1px solid #ccc';
    zoomInBtn.style.backgroundColor = '#fff';
    zoomInBtn.style.cursor = 'pointer';
    zoomInBtn.style.borderRadius = '3px';
    zoomInBtn.onclick = () => {
        const currentScale = graph.getScale();
        graph.moveTo({ scale: currentScale * 1.2 });
    };

    // 줌 아웃 버튼
    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.textContent = '−';
    zoomOutBtn.title = 'Zoom Out';
    zoomOutBtn.style.width = '35px';
    zoomOutBtn.style.height = '35px';
    zoomOutBtn.style.fontSize = '18px';
    zoomOutBtn.style.border = '1px solid #ccc';
    zoomOutBtn.style.backgroundColor = '#fff';
    zoomOutBtn.style.cursor = 'pointer';
    zoomOutBtn.style.borderRadius = '3px';
    zoomOutBtn.onclick = () => {
        const currentScale = graph.getScale();
        graph.moveTo({ scale: currentScale * 0.8 });
    };

    // 리셋 버튼
    const resetBtn = document.createElement('button');
    resetBtn.textContent = '⌂';
    resetBtn.title = 'Reset View';
    resetBtn.style.width = '35px';
    resetBtn.style.height = '35px';
    resetBtn.style.fontSize = '16px';
    resetBtn.style.border = '1px solid #ccc';
    resetBtn.style.backgroundColor = '#fff';
    resetBtn.style.cursor = 'pointer';
    resetBtn.style.borderRadius = '3px';
    resetBtn.onclick = () => {
        const optimalScale = Math.max(1.0, Math.min(1.5, container.clientWidth / 800));
        graph.moveTo({
            position: { x: 0, y: 0 },
            scale: optimalScale,
            animation: {
                duration: 500,
                easingFunction: 'easeInOutQuart'
            }
        });
    };

    controlPanel.appendChild(zoomInBtn);
    controlPanel.appendChild(zoomOutBtn);
    controlPanel.appendChild(resetBtn);

    container.style.position = 'relative';
    container.appendChild(controlPanel);
}

// 노드 hover 효과 개선
let hoveredNode = null;
let originalNodeProperties = {};

graph.on("hoverNode", function(params) {
    const nodeId = params.node;
    if (hoveredNode !== nodeId) {
        // 이전 hover 노드 복원
        if (hoveredNode !== null && originalNodeProperties[hoveredNode]) {
            nodes.update({
                id: hoveredNode,
                ...originalNodeProperties[hoveredNode]
            });
        }
        
        // 현재 노드 속성 저장 및 확대
        const node = nodes.get(nodeId);
        hoveredNode = nodeId;
        originalNodeProperties[nodeId] = {
            value: node.value,
            font: node.font ? {...node.font} : undefined
        };
        
        nodes.update({
            id: nodeId,
            value: Math.max(node.value * 1.5, 15),
            font: {
                ...node.font,
                size: Math.max((node.font && node.font.size) || 14, 16),
                strokeWidth: 2
            }
        });
    }
});

graph.on("blurNode", function(params) {
    const nodeId = params.node;
    if (hoveredNode === nodeId && originalNodeProperties[nodeId]) {
        nodes.update({
            id: nodeId,
            ...originalNodeProperties[nodeId]
        });
        hoveredNode = null;
    }
});

// 그래프가 준비되면 줌 컨트롤 추가
addZoomControls();

// 노드 간격 조절 함수
function updateNodeSpacing(distance) {
    if (!graph) return;
    
    const newOptions = {
        physics: {
            enabled: true,
            repulsion: {
                nodeDistance: distance,
                centralGravity: 0.1,
                springLength: distance * 0.75,
                springConstant: 0.05,
                damping: 0.1
            },
            solver: 'repulsion'
        }
    };
    
    graph.setOptions(newOptions);
    
    // 일시적으로 physics를 활성화하여 재배치
    setTimeout(() => {
        graph.stabilize();
    }, 100);
}

// 모달 기능 추가
function initializeGraphModal() {
    const openModalBtn = document.getElementById('openGraphModal');
    const modal = document.getElementById('graphModal');
    const closeModalBtn = document.getElementById('closeGraphModal');
    const modalContent = modal ? modal.querySelector('.graph-modal-content') : null;
    const spacingSlider = document.getElementById('nodeSpacing');
    const spacingValue = document.getElementById('spacingValue');
    
    if (!openModalBtn || !modal || !closeModalBtn || !modalContent) {
        return; // 모달 요소가 없으면 종료
    }
    
    // 간격 조절 슬라이더 이벤트
    if (spacingSlider && spacingValue) {
        spacingSlider.addEventListener('input', function() {
            const distance = parseInt(this.value);
            spacingValue.textContent = distance;
            updateNodeSpacing(distance);
        });
        
        // 초기값 설정
        spacingValue.textContent = spacingSlider.value;
    }
    
    // 모달 닫기 함수 - 부드러운 애니메이션 적용
    function closeModal() {
        modalContent.classList.add('closing');
        modal.style.opacity = '0';
        
        setTimeout(() => {
            modal.classList.remove('show');
            modal.style.display = 'none';
            modal.style.opacity = '1';
            modalContent.classList.remove('closing');
        }, 300);
    }
    
    // 모달 열기
    openModalBtn.addEventListener('click', function() {
        modal.classList.add('show');
        modal.style.display = 'flex';
        modalContent.classList.remove('closing');
        
        // 모달이 열린 후 그래프 크기 조정
        setTimeout(() => {
            if (graph) {
                graph.redraw();
                graph.fit({
                    animation: {
                        duration: 500,
                        easingFunction: 'easeInOutQuart'
                    }
                });
                
                // 간격 조절 슬라이더의 현재 값으로 초기화
                if (spacingSlider) {
                    updateNodeSpacing(parseInt(spacingSlider.value));
                }
            }
        }, 100);
    });
    
    // 모달 닫기 (X 버튼)
    closeModalBtn.addEventListener('click', closeModal);
    
    // 모달 닫기 (배경 클릭)
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
            closeModal();
        }
    });
}

// DOM이 로드되면 모달 초기화
document.addEventListener('DOMContentLoaded', initializeGraphModal);
