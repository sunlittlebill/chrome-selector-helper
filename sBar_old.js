// 调试开关
var _debug = true;
//var _debug = false;

/**
 * 改变选中的元素
 */
chrome.devtools.panels.elements.onSelectionChanged.addListener(function () {
    chrome.devtools.inspectedWindow.eval(
        evalstr,
        function (result) {

            var content = document.getElementsByClassName("content")[0];

            clearContent(content);

            content.appendChild(createUl(result));

            resize();

            chrome.devtools.inspectedWindow.eval("(" + coverToEle.toString() + "($0))");

            debug(result);
        }
    );

});

/**
 * 创建ul标签
 * @param info {object}
 * @returns {Element}
 */
function createUl(info) {
    var ul = document.createElement("ul");
    for (var a in info) {
        if (info.hasOwnProperty(a)) {

            isNotEmpty(info[a]) && ul.appendChild(createLi({key: a, value: info[a]}));
        }
    }
    return ul;
}

/**
 * 创建ul标签的li元素
 * @param attrItem {object}
 * @returns {Element}
 */
function createLi(attrItem) {

    var li = document.createElement("li");

    if (typeof attrItem["value"] == "object") {
        li.appendChild(document.createTextNode(attrItem["key"] + "："));
        li.appendChild(createUl(attrItem["value"]));
    } else {

        li.innerText = attrItem["key"] + "：" + attrItem["value"];
    }
    return li;
}

/**
 * 判断给定对象是否为空
 * @param obj {object}
 * @returns {boolean}
 */
function isNotEmpty(obj) {
    var
        result = true,
        type = typeof obj;

    switch (type) {
        case "undefined":
            result = false;
            break;
        case "object":
            result = isNotEmptyO(obj);
            break;
        case "string":
            result = obj.trim().length > 0;
            break;
        default:
            var isArr = Array.isArray(obj);
            if (isArr) {
                result = isArr.length > 0;
            } else {
                // number/boolean return true
            }
            break;
    }

    return result;
}

/**
 * 判断对象是否为空
 * @param obj {object}
 * @returns {boolean}
 */
function isNotEmptyO(obj) {

    if (typeof obj === "undefined" || obj === null) {
        return false;
    }

    for (var p in obj) {
        if (obj.hasOwnProperty(p)) {
            return true;
        }
    }
    return false;
}

/**
 * 清空html元素的内容
 * @param element {Element}
 */
function clearContent(element) {
    element.innerText = "";
}

/**
 * 遮盖选中的元素
 * @param ele {Element}
 */
function coverToEle(ele) {
    if (!ele) {
        return;
    }

    var arr = document.querySelectorAll(".-slct");
    for (var i = 0; i < arr.length; i++) {
        arr[i].parentNode.removeChild(arr[i]);
    }

    var div = document.createElement("div");
    div.classList.add("-slct");

    div.style.cursor = "pointer";
    div.style.position = "absolute";
    div.style.zIndex = "999999999999";
    div.style.backgroundColor = "rgb(255, 0, 0)";
    div.style.opacity = 0.7;

    div.style.height = ele.getBoundingClientRect().height + "px";
    div.style.width = ele.getBoundingClientRect().width + "px";
    div.style.top = getTagTop(ele) + "px";
    div.style.left = getTagLeft(ele) + "px";

    div.innerText = "";
    document.body.appendChild(div);
    div.addEventListener("click", function () {
        div.parentElement.removeChild(div);
    });
    // window.scrollTo(ele.x, ele.y);
}

/************************************* TODO iframe 相关 **********************************************/
var iFrames = [];
/**
 * 获取页面中的iframes
 */
function getIFrames() {
    var frames = $$("iframe[src]");
    for (var i = 0; i < frames.length; i++) {

    }
}
/**
 * 监测页面http请求，过滤出iframe
 */
chrome.devtools.network.getHAR(function (har) {

});

/**
 * 判断是否是同源iframe
 */
function isSameOriginFrame(domain, src) {

}

/**
 * 替换非同源frame
 */
function replaceFrame() {

}

/*************************************其他**********************************************/
/**
 * 改变窗口高度
 */
function resize() {
    window.postMessage("resize-side-pane", "*");
}

/**
 * 调试
 */
function debug() {
    _debug && console.debug.apply(console, arguments);
}
