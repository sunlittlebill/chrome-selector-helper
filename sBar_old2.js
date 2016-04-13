var
    /**
     * 自动定位开关
     * @type {boolean}
     */
    autoLocateSwitch = false,

    /**
     * 调试开关
     * @type {boolean}
     * @private
     */
    _debug = true;
//_debug = false;

/**
 * 改变选中的元素
 */
chrome.devtools.panels.elements.onSelectionChanged.addListener(function () {

    inspectEval(evalstr, function (result) {
        var
            _result = result,

            content = document.getElementsByClassName("content")[0];

        // 清空上次结果
        clearContent(content);

        // 输出结果
        createTagModal(result["info"], content);

        // 调整窗口
        resize();

        // 高亮(有色层遮盖)选中的元素
        inspectEval("(" + coverToEle.toString() + "($0))");

        // 自动定位到当前选中元素
        autoLocateSwitch && inspectEval("(" + scrollToTag + "())");
    });
});

/**
 * 创建元素模型
 * @param tagInfo
 * @param content
 * @returns {*}
 */
function createTagModal(tagInfo, content) {

    if (!isNotEmptyO(tagInfo)) {
        return;
    }

    var
        index = 0,
        current = tagInfo;

    do {
        content.appendChild(createTagLine(current, index));
        index++;
        current = current["childInfo"];
    }
    while (current != null);

    return content;
}

/**
 * 创建给定元素信息的行
 * @param tagInfo
 * @param index
 * @returns {Element}
 */
function createTagLine(tagInfo, index) {
    var
        clazz = "tag-line-" + index,
        ul = document.createElement("ul"),
        li = document.createElement("li"),
        overFlowHide = "overflow-hide";

    ul.classList.add(clazz);

    // tagName
    tagInfo["tagName"] && li.appendChild(createPiece("tagName", tagInfo["tagName"]));

    // tagId
    tagInfo["tagId"] && li.appendChild(createPiece("tagId", tagInfo["tagId"], overFlowHide));

    // tagClass
    if (isNotEmptyO(tagInfo["tagClass"])) {
        for (var clz in tagInfo["tagClass"]) {
            li.appendChild(createPiece("tagClass", tagInfo["tagClass"][clz], overFlowHide));
        }
    }

    ul.appendChild(li);

    if (isNotEmptyO(tagInfo["attr"])) {
        ul.appendChild(createTagAttr(tagInfo["attr"], clazz));
        ul.classList.add("hasAttr");
        ul.firstChild.insertBefore(createActionTag(clazz + "-attr"), ul.firstChild.firstChild);
    } else {
        ul.classList.add("noAttr");
    }

    return ul;
}

/**
 * 创建元素附属属性
 * @param attrs
 * @param clazz
 * @returns {Element}
 */
function createTagAttr(attrs, clazz) {
    var
        attrClass = "-attr",
        li = document.createElement("li");
    li.classList.add(clazz + attrClass);

    for (var a in attrs) {
        if (attrs.hasOwnProperty(a)) {
            li.appendChild(createPiece(a, attrs[a]));
        }
    }

    return li;
}

/**
 * 创建一个tag属性的span标签
 * @param key
 * @param value
 * @param clazz
 * @returns {Element}
 */
function createPiece(key, value, clazz) {
    var
        label = "",
        span = document.createElement("span");
    span.classList.add(key);

    switch (key) {
        case "tagName":
            break;
        case "tagId":
            label = "#";
            break;
        case "tagClass":
            label = ".";
            break;
        default:
            if (value) {
                label = "[" + key + "=" + value + "]";
            } else {
                label = "[" + key + "]";
            }
            value = "";
            break;
    }

    clazz && span.classList.add(clazz);

    span.innerHTML = label + value;

    span.setAttribute("title", label + value);
    return span;
}

/**
 * 创建展开/折叠标签
 */
function createActionTag(target) {
    var
        clazz = ["fa-caret-right", "fa-caret-down", "fa"],
        tag = document.createElement("i");

    tag.classList.add(clazz[2]);
    tag.classList.add(clazz[0]);

    tag.setAttribute("target", target);

    tag.addEventListener("click", actionListener.bind(tag));

    return tag;

    /**
     * 展开/折叠事件
     */
    function actionListener() {

        if (this.classList.contains(clazz[0])) {

            this.classList.remove(clazz[0]);
            this.classList.add(clazz[1]);
        } else if (this.classList.contains(clazz[1])) {

            this.classList.remove(clazz[1]);
            this.classList.add(clazz[0]);
        }

        var targetTag = document.getElementsByClassName(this.getAttribute("target"))[0];
        targetTag.classList.toggle("show");

        // 调整窗口高度
        resize();
    }
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
 * 生成选择器
 */
function generateSelector() {

    // 设置结果
    setResult();
    // 拷贝结果
    copyToClipboard();
}

/**
 * 设置结果
 */
function setResult() {

}

// /****************************************nav bar*******************************************/
var
    /**
     * bar item's class
     * @type {string[]}
     */
    barItems = ["item-location", "item-location-auto", "item-copy"],

    /**
     * the tool bar
     * @type {Element}
     */
    bar = document.getElementsByClassName("bar")[0];

for (var i = 0; i < barItems.length; i++) {
    var
        clickListener = null,
        item = bar.querySelector("." + barItems[i]);

    switch (i) {
        // location button
        case 0:
            clickListener = locate;
            break;
        // auto-location button
        case 1:
            clickListener = autoLocate;
            break;
        // copy result to clipboard
        case 2:
            clickListener = copyToClipboard;
            break;
        default:
            break;
    }
    item.addEventListener("click", clickListener.bind(item));
}

/**
 * 定位当前选中的元素(点击后)
 */
function locate() {
    debug("locate");

    inspectEval("(" + scrollToTag + "())");
}

/**
 * 自动定位当前选中的元素(可开关)
 */
function autoLocate() {
    debug("autoLocate");

    var
        switchOff = "fa-toggle-off",
        switchOn = "fa-toggle-on",
        clazzs = this.classList;

    if (clazzs.contains(switchOff)) {
        this.classList.remove(switchOff);
        this.classList.add(switchOn);
    } else if (clazzs.contains(switchOn)) {
        this.classList.remove(switchOn);
        this.classList.add(switchOff);
    }

    autoLocateSwitch = !autoLocateSwitch;
}

/**
 * 拷贝到剪切板
 */
function copyToClipboard() {
    var
        msg = "",
        range = document.createRange(),
        span = document.querySelector(".result > .selector");

    // 针对没有select()方法的元素
    range.selectNode(span);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);

    try {
        msg = document.execCommand("copy") ? "拷贝成功!" : "拷贝失败!";
    } catch (err) {
        msg = "拷贝失败，该chrome版本不支持此操作!";
    }
    window.getSelection().removeAllRanges();
    warn(msg);
}

// TODO /*************************************iframe 相关 **********************************************/
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

// /*************************************其他**********************************************/
/**
 * 注入交互script代码
 * @param evalStr
 * @param callback
 */
function inspectEval(evalStr, callback) {
    chrome.devtools.inspectedWindow.eval(
        evalStr,
        function (result) {
            debug(result);
            if (typeof callback === "function") {
                callback(result);
            }
        }
    );
}

/**
 * 改变窗口高度
 */
function resize() {
    window.postMessage("resize-side-pane", "*");
}

/**
 * nav bar 结果提示
 */
function warn(msg) {
    var
        clazz = "active",
        resultSpan = document.querySelector(".result .selector"),
        warnSpan = document.querySelector(".result .alert");
    warnSpan.innerText = msg;
    warnSpan.classList.add(clazz);
    resultSpan.classList.remove(clazz);

    setTimeout(timer, 1000);

    function timer() {
        warnSpan.innerText = "";
        warnSpan.classList.remove(clazz);
        resultSpan.classList.add(clazz);
    }
}

/**
 * 调试
 */
function debug() {
    _debug && console.debug.apply(console, arguments);
}
