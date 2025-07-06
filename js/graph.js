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

// Get graph element
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
            graph_data.nodes.filter(
                (node) =>
                    node.id == curr_node.id || connected_nodes.includes(node.id)
            )
        );
    } else {
        nodes = new vis.DataSet(graph_data.nodes);
    }
} else {
    curr_node = null;
    nodes = new vis.DataSet(graph_data.nodes);
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

// Construct graph
var options = 
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
                scale: 0.8,
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
            scale: graph.getScale() * 0.9,
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
        graph.fit({
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
