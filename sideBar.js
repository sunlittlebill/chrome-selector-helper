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

        attrs[i] && li.appendChild(createPiece(attrs[i], i));
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
        supportJQ = true,
        selectorSpan = document.querySelector(".selector"),
        numSpan = document.querySelector(".selector-num");

    inspectEval(
        "jQuery.fn.jquery",
        function (result, isException) {
            var toWarn = "";
            if (isException) {
                supportJQ = false;
                toWarn = "注意：此页面不支持jQuery!";
                // selectorSpan.innerHTML = "$('" + selector + "');";
            } else {
                debug("jQuery version " + result);
                // selectorSpan.innerHTML = "jQuery('" + selector + "');";
            }

            selectorSpan.innerHTML = "jQuery('" + selector + "');";

            // 拷贝结果
            toCopy && copyToClipboard(_debug);

            // 要先拷贝后再提示(由于提示时会隐藏结果标签，复制不成功)
            toWarn && warn(toWarn);

            inspectEval("$$('" + selector + "').length", function (res, ex) {

                if (ex) {
                    numSpan.innerHTML = "长度计算出错!";
                } else {
                    numSpan.innerHTML = res;
                }
            });
        }
    );
}

/**
 * span {tagName, tagId, tagClass} 事件监听器
 */
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

/**
 * modal 到 selector 的转换
 * @returns {string}
 */
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
    barItems = [
        "item-location", "item-location-auto", "item-location-all", "item-copy", "item-hide", /*"item-mark-links",*/
        "item-load-jq"
    ],

    /**
     * the tool bar
     * @type {Element}
     */
    bar = document.getElementsByClassName("bar")[0];

for (var i = 0; i < barItems.length; i++) {
    var
        clickListener = null,
        item = bar.querySelector("." + barItems[i]);

    switch (barItems[i]) {
        // location button
        case "item-location":
            clickListener = locate;
            break;
        // auto-location button
        case "item-location-auto":
            clickListener = autoLocate;
            break;
        // mark all tag
        case "item-location-all":
            clickListener = markAll;
            break;
        // hide tag
        case "item-hide":
            clickListener = hideTag;
            break;
        // copy result to clipboard
        case "item-copy":
            clickListener = copyToClipboard;
            break;
        case "item-mark-links":
            clickListener = copyToClipboard;
            break;
        case "item-load-jq":
            clickListener = loadJQ;
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
        inspectEval("inspect(document.querySelector('" + selectorGlobal + "'))", function () {
            inspectEval("(" + scrollToTag + "())");
            selectChange = false;
        });
    } else {
        inspectEval("(" + scrollToTag + "())");
    }
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
 * 标记所有当前选择器能查找到的元素
 */
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
 * 隐藏标签
 */
function hideTag() {

    inspectEval("(" + _hideOrShowTag + ")('" + selectorGlobal + "')");

    function _hideOrShowTag(selector) {
        var
            key = "hide",
            tags = document.querySelectorAll(selector);

        for (var i = 0; i < tags.length; i++) {

            var status = tags[i].dataset[key];

            if (!status || status == 'false') {
                tags[i].style.visibility = "hidden";
                tags[i].dataset[key] = true;

            } else {
                tags[i].style.visibility = "visible";
                tags[i].dataset[key] = false;
            }
        }
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

/**
 * 给没有jq的页面中嵌入jq
 */
function loadJQ() {
    inspectEval("jQuery.fn.jquery", function (result, isException) {

        if (isException) { // 页面中没有jq

            //var jqSrc = chrome.extension.getURL("jquery.min.js"); // TODO 行不通
            var jqSrc = "https://g.alicdn.com/sj/lib/jquery.min.js";

            inspectEval("(" + _loadJQ + ")('" + jqSrc + "')", function (res, isEx) {
                if (!isEx) {
                    var timer = window.setInterval(function () {
                        inspectEval("jQuery.fn.jquery", function (r, ex) {
                            if (!ex) {
                                window.clearInterval(timer);
                                warn("jQuery " + r + " 嵌入成功！", 2000);
                            }
                        })
                    }, 500);
                } else {
                    warn("嵌入jQuery失败！");
                }
            })

        } else {
            warn("此页面中已有 jQuery " + result + " ");
        }
    });

    function _loadJQ(src) {
        var script = document.createElement("script");
        script.classList.add("load-jq");
        script.src = src;
        document.head.insertBefore(script, document.head.firstChild);

        var timer = window.setInterval(function () {
            if (window['jQuery']) {
                window.clearInterval(timer);
                return jQuery.fn.jquery;
            }
        }, 100)
    }
}

// /*************************************其他**********************************************/

/**
 * 根据输入的选择器来查找和标记所能找到元素
 * 注:要能够保存历史
 */
function pegging() {
    var me = this;

    window['_history'] = window['_history'] || [];
    window['_h_index'] = window['_h_index'] || 0; // 历史记录的当前序号
    window['_s_index'] = -1; // 被编辑选择器选中元素定位用的当前序号
    window['_s_length'] = -1; // 被编辑选择器选中元素定位用的当前序号

    /**
     * 创建查找工具栏
     * <input type="text"><i class="fa fa-caret-left"></i><i class="fa fa-search"></i><i class="fa fa-caret-right"></i>
     */
    var
        input = tag("input", "pegging-editor", {title: '使用 alt + left/right 可查看历史记录'}),
        iLeft = tag("i", ['fa', 'fa-caret-left'], {title: '上一个'}),
        iSearch = tag("i", ['fa', 'fa-search'], {title: '下一个'}),
        iRight = tag("i", ['fa', 'fa-caret-right'], {title: "搜索 ( enter )"});

    input.value = history() ? history() : me.innerText == "无" ? "" : me.innerText;

    input.style.width = '250px';
    input.style.fontSize = '12px';
    input.style.fontFamily = 'monospace';

    history(null, input.value);

    input.addEventListener("keydown", function (event) {
        if (event["keyCode"] == 13) {
            goSearch();
        } else if (event["altKey"] && event["keyCode"] == 37) {
            input.value = history(current(-1));
        } else if (event["altKey"] && event["keyCode"] == 39) {
            input.value = history(current(1));
        }
    });

    iLeft.addEventListener("click", function () {
        go(-1);
    });
    iRight.addEventListener("click", function () {
        go(1);
    });

    iSearch.addEventListener("click", goSearch.bind(input));

    me.innerHTML = "";
    me.appendChild(input);
    me.appendChild(iSearch);

    me.appendChild(iLeft);
    me.appendChild(iRight);

    input.focus();

    function tag(name, clazz, attrs) {
        var tag = document.createElement(name);

        if (typeof clazz == "string") {
            tag.classList.add(clazz);
        } else if (Array.isArray(clazz)) {
            for (var i = 0; i < clazz.length; i++) {
                tag.classList.add(clazz[i]);
            }
        }

        if (typeof attrs == "object") {
            for (var attr in attrs) {
                tag.setAttribute(attr, attrs[attr]);
            }
        }

        return tag;
    }

    function go(flag) {
        if (flag == 1) {
            if (window['_s_index'] + 1 < window['_s_length']) {
                window['_s_index']++;
            }
        } else {
            if (window['_s_index'] > 0) {
                window['_s_index']--;
            }
        }

        inspectEval(getTagLeft
            + getTagTop
            + _scrollToTag
            + " (" + _scrollToTag + ")(" + input.value.replace(");", "")
                                                .replace("jQuery(", "") + "," + window['_s_index'] + ");",
            function (result, isException) {
                if (isException) {
                    warn("选择器错误或者页面不支持jQuery！");
                }
            }
        );

        function _scrollToTag(selector, index) {

            var tag = window['jQuery'] ? jQuery(selector)[index] : $$(selector)[index];

            var cover = document.getElementsByClassName("-slct");
            for (var i = 0; i < cover.length; i++) {
                if (i == index) {
                    cover[i].style.backgroundColor = "green";
                } else {
                    cover[i].style.backgroundColor = "rgb(255, 0, 0)";
                }
            }
            window.scrollTo(getTagLeft(tag), getTagTop(tag));
        }
    }

    /**
     * 标记所有当前选择器能查找到的元素
     */
    function goSearch() {

        history(null, input.value);
        window['_s_index'] = -1;
        window['_s_length'] = 0;

        inspectEval(getTagLeft
            + getTagTop
            + coverToEle
            + " (" + _searchAll + ")(" + input.value.replace(";", "") + ")",
            function (result, isException) {
                if (isException) {
                    warn("选择器错误或者页面不支持jQuery！");
                } else {
                    window['_s_length'] = Number.parseInt(result);
                }
            }
        );

        function _searchAll(tags) {
            for (var i = 0; i < tags.length; i++) {
                if (i == 0) {
                    coverToEle(tags[i], true, 0);
                } else {
                    coverToEle(tags[i], false, i);
                }
            }

            return tags.length;
        }
    }

    function history(index, item) {

        var _history = window['_history'];

        if (index != null) {
            if (index >= 0 && _history.length > 0) {
                return _history[index];
            }
            return "";
        } else if (item) {
            if (!_history.includes(item)) {
                _history[_history.length] = item;
                window['_history'] = _history;
            }
        } else {
            if (_history.length > 0) {
                return _history[_history.length - 1];
            } else {
                return "";
            }
        }
    }

    function current(flag) {
        var current = window['_h_index'];

        switch (flag) {
            case -1 :
                if (current - 1 >= 0) {
                    current--;
                }
                break;
            case 1:
                if (current + 1 < window['_history'].length) {
                    current++;
                }
                break;
            default:
                break;
        }

        return window['_h_index'] = current;
    }
}

var
    clickTag = document.querySelector(".click-to-edit"),
    container = document.querySelector(".selector");

clickTag.addEventListener("click", pegging.bind(container));

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
function warn(msg, time) {
    var
        clazz = "active",
        resultSpan = document.querySelector(".result .selector"),
        warnSpan = document.querySelector(".result .alert");
    warnSpan.innerText = msg;
    warnSpan.classList.add(clazz);
    resultSpan.classList.remove(clazz);

    time = time || 1000;
    setTimeout(timer, time);

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
