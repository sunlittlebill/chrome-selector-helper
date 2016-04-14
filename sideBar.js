var
    /**
     * 自动定位开关
     * @type {boolean}
     */
    autoLocateSwitch = false,

    modalArrGlobal,

    selectChange,

    selectorGlobal,// 用户自定义selector时使用

    /**
     * 调试开关
     * @type {boolean}
     * @private
     */
    _debug = true;
//_debug = false;

/**
 * 为改变选中的元素添加/删除事件监听器
 * @param toAdd {boolean}
 */
function toggleSelectionListener(toAdd) {
    if (toAdd) {
        chrome.devtools.panels.elements.onSelectionChanged.addListener(selectionChangedListener);
    } else {
        chrome.devtools.panels.elements.onSelectionChanged.removeListener(selectionChangedListener);
    }
}

/**
 * onSelectionChanged listener
 */
function selectionChangedListener() {

    inspectEval(evalstr, function (result) {
        if (!result) {
            return;
        }
        debug(result);
        var content = document.getElementsByClassName("content")[0];

        modalArrGlobal = result["modal"];

        // 清空上次结果
        clearContent(content);

        selectorGlobal = result["selector"];

        // 输出结果
        setResult(selectorGlobal, true);

        createTagModal(modalArrGlobal, content);

        // 调整窗口
        resize();

        // 高亮(有色层遮盖)选中的元素
        inspectEval("(" + coverToEle.toString() + "($0, true))");

        // 自动定位到当前选中元素
        autoLocateSwitch && inspectEval("(" + scrollToTag + "())");
    });
}

/**
 * 创建元素模型
 * @param modalArr {Array}
 * @param content {Element}
 */
function createTagModal(modalArr, content) {

    if (!isNotEmpty(modalArr)) {
        return;
    }

    for (var i = 0; i < modalArr.length; i++) {

        content.appendChild(createTagLine(modalArr, i));
    }
}

/**
 * 创建给定元素信息的行
 * @param modalArr {Array}
 * @param index {number}
 * @returns {Element}
 */
function createTagLine(modalArr, modalArrIndex) {
    var
        modal = modalArr[modalArrIndex],

        _modalIndex = 0,
        _modal = modal[_modalIndex],

        _modalAttrIndex = 1,
        _modalArr = modal[_modalAttrIndex],

        clazz = "tag-line-" + modalArrIndex,
        attrLineClass = "tag-line-attr-" + modalArrIndex,
        ul = document.createElement("ul"),
        li = document.createElement("li");

    ul.classList.add(clazz);

    for (var i = 0; i < _modal.length; i++) {
        li.appendChild(createPiece(_modal[i], i, _modalIndex, modalArrIndex));
    }

    ul.appendChild(li);

    if (_modalArr) {

        ul.appendChild(createTagAttr(_modalArr, attrLineClass));
        ul.classList.add("hasAttr");
        ul.firstChild.insertBefore(createActionTag(attrLineClass), ul.firstChild.firstChild);
    } else {

        ul.classList.add("noAttr");
    }

    return ul;
}

/**
 * 创建元素附属属性
 * @param attrs {Array}
 * @param clazz {string}
 * @returns {Element}
 */
function createTagAttr(attrs, clazz) {

    var li = document.createElement("li");
    li.classList.add(clazz);

    for (var i = 0; i < attrs.length; i++) {

        li.appendChild(createPiece(attrs[i], i));
    }

    return li;
}

/**
 * 创建一个tag属性的span标签
 * @param item {string}
 * @param index {number}
 * @returns {Element}
 */
function createPiece(item, spanIndex, modalIndex, modalArrIndex) {
    var
        clazz = "",
        clazz2 = "item-" + spanIndex,

        str = item["value"],
        isCheck = item["check"],

        overFlowHide = "overflow-hide",
        span = document.createElement("span");
    span.setAttribute("title", str);

    if (str.startsWith(".")) { // class
        clazz = "tagClass";
    } else if (str.startsWith("#")) { // id
        clazz = "tagId";
    } else if (str.startsWith("[")) { // attribute
        clazz = "tagAttr";
    } else { // tag name
        clazz = "tagName";
    }
    span.innerText = str;
    span.classList.add(clazz);
    span.classList.add(clazz2);
    isCheck && span.classList.add("isCheck");

    if (clazz != "tagName") {
        span.classList.add(overFlowHide);
    }

    // 自定义selector时用
    span.dataset.index = [modalArrIndex, modalIndex, spanIndex];

    span.addEventListener("click", pieceListener.bind(span));
    return span;
}

/**
 * 创建展开/折叠标签
 * @param target {string}
 * @returns {Element}
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
 * 清空html元素的内容
 * @param element {Element}
 */
function clearContent(element) {
    element.innerText = "";
}

/**
 * 设置结果
 * @param selector {string}
 * @param toCopy {boolean}
 */
function setResult(selector, toCopy) {

    var
        selectorSpan = document.querySelector(".selector"),
        numSpan = document.querySelector(".selector-num");

    inspectEval(
        "jQuery.fn.jquery",
        function (result, isException) {
            if (isException) {
                warn("注意：此页面不支持jQuery!");
                selectorSpan.innerHTML = "$('" + selector + "');";
            } else {
                debug("jQuery version " + result);
                selectorSpan.innerHTML = "jQuery('" + selector + "');";
            }

            inspectEval("$$('" + selector + "').length", function (res, ex) {

                if (ex) {
                    numSpan.innerHTML = "长度计算出错!";
                } else {
                    numSpan.innerHTML = res;
                }
            });

            // 拷贝结果
            toCopy && copyToClipboard(false);
        }
    );
}

function pieceListener() {
    var
        isChkCls = "isCheck",
        index = this.dataset.index.split(","),
        isCheck = this.classList.contains(isChkCls);

    this.classList.toggle(isChkCls);
    debug(isCheck);
    modalArrGlobal[index[0]][index[1]][index[2]]["check"] = !isCheck;

    selectorGlobal = modalToSelector();

    setResult(selectorGlobal, false);
}

function modalToSelector() {
    var
        indexCache = -1,

        selector = "";

    selectChange = true;

    for (var i = 0; i < modalArrGlobal.length; i++) {

        var
            sibling = "", // 相邻元素
            subSelector = "",
            modal = modalArrGlobal[i],
            modalItem = modal[0]; // modal[0]: [tagName-object,id-object,class-object,class-object,...]

        for (var j = 0; j < modalItem.length; j++) {
            var itemObject = modalItem[j];
            if (itemObject["check"]) {
                subSelector = subSelector + itemObject['value'];

                // 相邻元素
                sibling = ((indexCache + 1) == i) ? " > " : " ";
            }
        }

        if (subSelector) {
            if (indexCache != -1) {
                selector = selector + sibling + subSelector;
            } else {
                selector = subSelector;
            }
            indexCache = i;
        }
    }
    return selector;
}

// /****************************************nav bar*******************************************/
var
    /**
     * bar item's class
     * @type {string[]}
     */
    barItems = ["item-location", "item-location-auto", "item-location-all", "item-copy"],

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
        // mark all tag
        case 2:
            clickListener = markAll;
            break;
        // copy result to clipboard
        case 3:
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

    if (selectChange) {
        inspectEval("inspect(document.querySelector('" + selectorGlobal + "'))", null);
    }
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

function markAll() {

    inspectEval(
        getTagLeft
        + getTagTop
        + scrollToTag
        + coverToEle
        + " (" + _markAll + ")('" + selectorGlobal + "')"
    );

    function _markAll(selector) {
        var tags = $$(selector);

        for (var i = 0; i < tags.length; i++) {
            if (i == 0) {
                coverToEle(tags[i], true, 0);
            } else {
                coverToEle(tags[i], false, i);
            }
        }
        // scrollToTag();
    }
}

/**
 * 拷贝到剪切板
 */
function copyToClipboard(toWarn) {
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
    toWarn && warn(msg);
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
        function () {
            debug(arguments);
            if (typeof callback === "function") {
                callback.apply(callback, arguments);
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
