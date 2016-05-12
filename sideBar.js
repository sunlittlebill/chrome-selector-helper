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
    _debug = true; // _debug && console.debug();
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

        _debug && console.debug(result);

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
 * @param modalArrIndex {number}
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
 * @param spanIndex {number}
 * @param modalIndex {number}
 * @param modalArrIndex {number}
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
        calcContainer = document.querySelector(".calc-container"),
        numSpan = document.querySelector(".selector-num");

    selectorSpan.classList.add("active");

    // 隐藏jQuery计算器
    calcContainer.style.display = 'none';

    inspectEval(
        "jQuery.fn.jquery",
        function (result, isException) {
            var toWarn = "";
            if (isException) {
                supportJQ = false;
                toWarn = "注意：此页面不支持jQuery!";
                // selectorSpan.innerHTML = "$('" + selector + "');";
            } else {

                _debug && console.debug("jQuery version " + result);

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

    _debug && console.debug(isCheck);

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
        "item-location", "item-location-auto", "item-location-all", "item-copy", "item-hide", "item-mark-links",
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
            clickListener = markAllLinks;
            break;
        case "item-load-jq":
            clickListener = loadJQ;
            break;
        default:
            break;
    }
    item.addEventListener("click", clickListener.bind(item));
}

// jQuery计算器
var
    clickTag = document.querySelector(".click-to-edit"),
    calcContainer = document.querySelector(".calc-container");

clickTag.addEventListener("click", calc.bind(calcContainer));

/**
 * 定位当前选中的元素(点击后)
 */
function locate() {
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
        span = document.querySelector(".result > .selector.active"),
        input = document.querySelector(".calc-editor");

    if (span) {

        // 针对没有select()方法的元素
        range.selectNode(span);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
    } else {
        input.select();
    }

    try {
        msg = document.execCommand("copy") ? "拷贝成功!" : "拷贝失败!";
    } catch (err) {
        msg = "拷贝失败，该chrome版本不支持此操作!";
    }
    window.getSelection().removeAllRanges();
    toWarn && warn(msg);
}

/**
 * TODO
 * 标记所有的可点击链接
 * 判断是否有jq，没有则提示要求注入
 * cursor:pointer + a[href]
 * visible:true
 * 对于overflow:hidden的(例如焦点图)查找其container
 */
function markAllLinks() {
    inspectEval("jQuery.fn.jquery", function (res, isEx) {
        if (isEx) {
            warn("页面中缺少jQuery，请先注入jQuery！", 1500);
        } else {
            warn("TODO 此功能尚未完成！", 1000);
        }
    });

    function searchLinks() {
        var
            visibleLinks = jQuery(document.links).filter("[href]:visible");
    }

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
                    window.setTimeout(function () {
                        inspectEval("jQuery.fn.jquery", function (r, ex) {
                            if (!ex) {
                                warn("jQuery " + r + " 嵌入成功！", 2000);
                            } else {
                                warn("该页面中无法嵌入jQuery！", 2000);
                            }
                        })
                    }, 1000);
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

/**
 * 根据输入的选择器来查找和标记所能找到元素
 * 注:要能够保存历史
 */
function calc() {
    var
        me = this,
        selector = document.querySelector(".selector");

    //隐藏 .selector
    selector.classList.remove("active");

    me.style.display = 'block';
    me.innerHTML = '';
    destroyInput();

    window['_history'] = window['_history'] || [];
    window['_h_index'] = window['_h_index'] || 0; // 历史记录的当前序号
    window['_s_index'] = -1; // 被编辑选择器选中元素定位用的当前序号
    window['_s_length'] = -1; // 被编辑选择器选中元素定位用的当前序号

    /**
     * 创建查找工具栏
     * <input type="text"><i class="fa fa-caret-left"></i><i class="fa fa-search"></i><i class="fa fa-caret-right"></i>
     */
    var
        input = tag("textarea", "calc-editor",
            {
                title: '使用 alt + up/down 可查看历史记录',
                style: "width: 418px;" + " font-size: 12px; font-family: monospace; border: 1px solid silver"
            }
        ),

        iLeft = tag("i", ['fa', 'fa-caret-left'], {title: '上一个'}),
        iSearch = tag("i", ['fa', 'fa-search'], {title: '搜索/执行jQuery语句 ( enter )'}),
        iRight = tag("i", ['fa', 'fa-caret-right'], {title: "下一个"}),

        str = selector.innerText.trim(),

        selector_holder = input.value;

    input.value = (str != "无" && str != "") ? str : history() ? history() : "";

    // 此次编辑的Selector存入history
    history(null, input.value);

    input.addEventListener("keypress", function (event) {
        var _alt = event['altKey'];

        switch (event["keyCode"]) {
            case 13: // 回车查询
                if (!event['ctrlKey']) {
                    goSearch();
                    event.preventDefault();
                }
                break;
            case 38: // 前一次查询记录
                _alt && (input.value = history(current(-1)));
                break;
            case 40: // 后一次查询记录
                _alt && (input.value = history(current(1)));
                break;
            default:
                break;
        }
    });

    input.addEventListener("blur", function () {
        selector_holder = input.value;
    });

    // 前一次查询记录
    iLeft.addEventListener("click", function () {
        input.value && go(-1);
    });
    // 后一次查询记录
    iRight.addEventListener("click", function () {
        input.value && go(1);
    });
    // 回车查询
    iSearch.addEventListener("click", goSearch.bind(input));

    me.appendChild(input);

    // 调整页面
    resize();

    me.appendChild(tag("br"));
    me.appendChild(iSearch);
    me.appendChild(iLeft);
    me.appendChild(iRight);

    me.appendChild(createCalc());

    input.addEventListener('focus', function () {
        resetOperatorStatus();
    });

    input.focus();

    /**
     * 创建标签
     * @param name
     * @param clazz
     * @param attrs
     * @returns {Element}
     */
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

    /**
     * 翻查历史记录
     * @param flag
     */
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
        if (!input.value) {
            return;
        }

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

                    document.querySelector(".selector-num").innerHTML = window['_s_length'] = Number.parseInt(result);
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

    /**
     * 历史记录
     * @param index
     * @param item
     * @returns {*}
     */
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

    /**
     * 当前历史记录索引
     * @param flag
     * @returns {*}
     */
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

    /* TODO jQuery计算器面板 */
    function createCalc() {
        var
            filtrate = [
                {name: ':visible', hasArgs: false, posit: 'inner'},
                {name: ':lt()', title: ':lt(index)', hasArgs: true, posit: 'inner'},
                {name: ':gt()', title: ':gt(index)', hasArgs: true, posit: 'inner'},
                {name: ':eq()', title: ':eq(index)', hasArgs: true, posit: 'inner'},
                {name: ':odd', hasArgs: false, posit: 'inner'},
                {name: ':even', hasArgs: false, posit: 'inner'},
                {name: ':first', hasArgs: false, posit: 'inner'},
                {name: ':last', hasArgs: false, posit: 'inner'},
                {name: ':hidden', hasArgs: false, posit: 'inner'},
                {name: ':not()', title: ':not(selector)', hasArgs: true, posit: 'inner'},
                {name: ':has()', title: ':has(selector) ', hasArgs: true, posit: 'inner'},
                {name: ':contains()', title: ':contains(text)', hasArgs: true, posit: 'inner'}
            ],
            simpleHandler = [
                {name: '.show()', title: 'show([s,[e],[fn]])', hasArgs: true, posit: 'outer'},
                {name: '.hide()', title: 'hide([s,[e],[fn]])', hasArgs: true, posit: 'outer'},
                {name: '.remove()', title: 'remove([expr])', hasArgs: true, posit: 'outer'},

                {name: '.slice()', title: 'slice(start,[end])', hasArgs: true, posit: 'outer'},
                {name: '.find()', title: 'find(e|o|e)', hasArgs: true, posit: 'outer'},
                {name: '.filter()', title: 'filter(expr|obj|ele|fn)', hasArgs: true, posit: 'outer'},

                {name: '.next()', title: 'next([expr])', hasArgs: true, posit: 'outer'},
                {name: '.nextall()', title: 'nextall([expr])', hasArgs: true, posit: 'outer'},
                {name: '.nextUntil()', title: 'nextUntil([element][,filter])', hasArgs: true, posit: 'outer'},

                {name: '.prev()', title: 'prev([expr])', hasArgs: true, posit: 'outer'},
                {name: '.prevall()', title: 'prevall([expr])', hasArgs: true, posit: 'outer'},
                {name: '.prevUntil()', title: 'filter([element][,filter])', hasArgs: true, posit: 'outer'},

                {name: '.children()', title: 'children([expr])', hasArgs: true, posit: 'outer'},
                {name: '.parent()', title: 'parent([expr])', hasArgs: true, posit: 'outer'},
                {name: '.parents()', title: 'parents([expr])', hasArgs: true, posit: 'outer'},
                {name: '.siblings()', title: 'siblings([expr])', hasArgs: true, posit: 'outer'}
            ],

            eventNames = [
                {name: 'click', hasArgs: true, posit: 'outer'},
                {name: 'dblclick', hasArgs: true, posit: 'outer'}

            ], // selector中没有trigger时触发事件

            container = tag("div", [], {style: "/*width: 300px; height: 100px; border: 1px solid silver*/"});

        var operatorPanel = createLine(['operate-container'], {
            style: 'border: 1px dashed silver; width: 420px; min-height:35px;' +
            ' margin-bottom: 8px;'
        });

        // clear all operator
        operatorPanel.appendChild(clearOperators());
        container.appendChild(operatorPanel);

        // 筛选
        var filtrateLine = createLine();
        for (var i = 0; i < filtrate.length; i++) {
            var btn = createBtn(filtrate[i]['name']);

            btn.dataset['hasArgs'] = filtrate[i]['hasArgs'];
            btn.dataset['posit'] = filtrate[i]['posit'];

            if (filtrate[i]['title']) {
                btn.title = filtrate[i]['title'];
            }else{
                btn.title = filtrate[i]['name'];
            }

            btn.addEventListener("click", addToOperate);
            filtrateLine.appendChild(btn);
        }
        container.appendChild(filtrateLine);

        // 常用方法
        var simpleHandlerLine = createLine();
        for (i = 0; i < simpleHandler.length; i++) {
            btn = createBtn(simpleHandler[i]['name']);

            btn.dataset['hasArgs'] = simpleHandler[i]['hasArgs'];
            btn.dataset['posit'] = simpleHandler[i]['posit'];

            if (simpleHandler[i]['title']) {
                btn.title = simpleHandler[i]['title'];
            }else{
                btn.title = simpleHandler[i]['name'];
            }

            btn.addEventListener("click", addToOperate);
            simpleHandlerLine.appendChild(btn);
        }
        container.appendChild(simpleHandlerLine);

        // 事件
        var eventNamesLine = createLine();
        for (i = 0; i < eventNames.length; i++) {
            eventNamesLine.appendChild(createBtn(eventNames[i]));
        }
        container.appendChild(eventNamesLine);

        container.appendChild(tag("br")); // 调整与下方区域的间隔

        // 鼠标右击查询
        me.addEventListener("mousedown", function () {
            _debug && console.debug(event);
            if(event['which'] == 3){
                goSearch();
            }
        });

        return container;

        /**
         *
         * @param value
         * @param clazz
         * @param attrs
         * @returns {Element}
         */
        function createBtn(value, clazz, attrs) {
            var btn = tag("span", clazz || [], $extends(attrs, {}));
            btn.innerText = value;
            return btn;
        }

        /**
         *
         * @param clazz
         * @param attrs
         * @returns {Element}
         */
        function createLine(clazz, attrs) {
            var _clazz = ['line'];
            if (clazz) {
                _clazz = _clazz.concat(clazz);
            }
            _debug && console.debug(_clazz);
            return tag("div", _clazz, $extends(attrs, {}));
        }

        /**
         *
         */
        function addToOperate() {
            var
                me = this,
                area = document.querySelector(".operate-container"),
                btn = createBtn(me.innerText, ['operate'], {style: 'margin: 2px; width: auto;'}),
                closeBtn = createCloseBtn(btn),
                hasArgs = me.dataset['hasArgs'],
                posit = me.dataset['posit'];

            var btns = area.querySelectorAll(".selected");
            for (var i = 0; i < btns.length; i++) {
                btns[i].classList.remove("selected");
            }

            btn.addEventListener('click', function () {
                var
                    isSelected = this.classList.contains("selected"),
                    _btns = area.querySelectorAll(".selected");

                destroyInput();

                for (i = 0; i < _btns.length; i++) {
                    _btns[i].classList.remove("selected");

                }

                if (btn.isSameNode(this)) {
                    if (isSelected) {
                        this.classList.remove("selected");
                    } else {
                        this.classList.add("selected");
                        initInput();
                    }

                } else {
                    this.classList.add("selected");
                    initInput();
                }
            });

            btn.dataset['posit'] = posit;

            btn.appendChild(closeBtn);
            area.appendChild(btn);
            evalOperator();

            if (hasArgs == 'true') {
                // 触发一次click事件：+selected、触发argsInput
                btn.click();
            }
        }

        /**
         * 清空所有的操作对象
         * @returns {Element}
         */
        function clearOperators() {
            var btn = tag("i", ['fa', 'fa-close'], {style: 'float:right;margin: 0;color: #6F6F6F;'});
            btn.addEventListener("click", function () {
                operatorPanel.innerHTML = "";
                operatorPanel.appendChild(btn);

                evalOperator();
            });
            return btn;
        }
    }

    /**
     * 删除按钮
     * @param target
     * @returns {Element}
     */
    function createCloseBtn(target) {
        var btn = tag("i", [
            'fa', 'fa-close'
        ], {
            style: 'font-size: 10px;width: auto;float: right;margin-top: -3px;margin-right: -1px;color:' +
            ' #6F6F6F;'
        });
        btn.addEventListener("click", function () {
            target.remove();
            evalOperator();
        });
        return btn;
    }

    /**
     * 初始化操作区域操作符状态
     */
    function resetOperatorStatus() {
        destroyInput();
        var btns = document.querySelectorAll(".operate-container .selected");
        for (var i = 0; i < btns.length; i++) {
            btns[i].classList.remove("selected");
        }
    }

    /**
     * 初始化输入监听事件
     */
    function initInput() {
        document.addEventListener("keydown", window.argsInput);
    }

    /**
     * 输入处理逻辑
     * 在点击"选择器"创建calcContainer前需要destroyInput，argsInput挂在window下比较好拿到.
     */
    window.argsInput = function () {
        _debug && console.debug(event);
        var
            code = event['keyCode'],
            shift = event['shiftKey'],

            tag = document.querySelector(".operate.selected");

        if (tag) {
            if (code == 37 || code == 39) { // 移动
                var
                    index = 0,
                    _tag = tag.cloneNode(true),
                    tags = document.querySelectorAll('span.operate');

                // cloneNode不会克隆closeBtn的事件
                _tag.querySelector('i').remove();
                _tag.appendChild(createCloseBtn(_tag));

                for (var k = 0; k < tags.length; k++) {

                    if(tags[k].isSameNode(tag)){

                        if (code == 37) { // 向左
                            index = k - 1;
                            if(index >= 0) {
                                tag.parentNode.insertBefore(_tag, tags[index]);
                                tag.remove();
                                evalOperator();
                            }
                        } else {// 向右
                            index = k + 2;
                            if(index < tags.length + 2) {
                                tag.parentNode.insertBefore(_tag, tags[index]);
                                tag.remove();
                                evalOperator();
                            }
                        }
                        break;
                    }
                }

            } else if (code == 8) {
                tag.innerHTML = tag.innerText.replace(/(.\))$/, ")");
                tag.appendChild(createCloseBtn(tag));
                evalOperator();
            } else {
                //var inputChar = String.fromCharCode(code); // 符号对应不上
                var inputChar = codeToChar(event);

                _debug && console.debug(inputChar);

                if (inputChar && inputChar.trim()) {
                    if (!shift && code >= 65 && code <= 90) {
                        inputChar = inputChar.toLowerCase();
                    }
                    tag.innerText = tag.innerText.replace(")", inputChar + ")");
                    tag.appendChild(createCloseBtn(tag));
                    evalOperator();
                }
            }
        }
    }

    /**
     * 销毁输入监听事件
     */
    function destroyInput() {
        document.removeEventListener("keydown", window.argsInput);
    }

    /**
     * event['keyCode'] 对应字符转换
     */
    function codeToChar(event) {
        var
            result = "",

            code = event['keyCode'],

            shift = event['shiftKey'],

            abc = [
                'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
                'u',
                'v',
                'w', 'x', 'y', 'z'
            ],
            abcCode = [],

            digit = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
            digitCode = [],

            symbol_s = ['*', '+', null, '-', '.', '/'],
            symbolCode_s = [],

            symbol_n = [null, '!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
            symbolCode_n = [],

            symbol_m = [';', '=', ',', '-', '.', '/', '`', '[', '\\', ']', "'"],
            symbolCode_m = [],

            symbol_m_u = [':', '+', '<', '_', '>', '?', '~', '{', '|', '}', '"'],
            symbolCode_m_u = [];

        // 26个字母
        for (var j = 65; j < abc.length + 65; j++) {
            abcCode[j] = abc[j - 65];
        }

        // 主键盘数字
        for (j = 48; j < digit.length + 48; j++) {
            digitCode[j] = digit[j - 48];
        }

        // 主键盘数字 + shift => 符号
        for (j = 48; j < symbol_n.length + 48; j++) {
            symbolCode_n[j] = symbol_n[j - 48];
        }

        // 小键盘数字
        for (j = 96; j < digit.length + 96; j++) {
            digitCode[j] = digit[j - 96];
        }

        // 小键盘符号
        for (j = 106; j < symbol_s.length + 106; j++) {
            symbolCode_s[j] = symbol_s[j - 106];
        }

        // 主键盘符号
        for (j = 186; j < symbol_m.length + 186; j++) {
            symbolCode_m[j] = symbol_m[j - 186];
        }

        // 主键盘符号 + shift
        for (j = 186; j < symbol_m_u.length + 186; j++) {
            symbolCode_m_u[j] = symbol_m_u[j - 186];
        }

        if (abcCode[code] != undefined && abcCode[code] != null) {
            if (shift) {
                result = abcCode[code].toUpperCase();
            } else {
                result = abcCode[code];
            }
        } else if (digitCode[code] != undefined && digitCode[code] != null) {

            if (shift) {
                result = symbolCode_n[code];
            } else {
                result = digitCode[code];
            }
        } else if (symbolCode_s[code] != undefined && symbolCode_s[code] != null) {
            result = symbolCode_s[code];
        } else if (symbolCode_m[code] != undefined && symbolCode_m[code] != null) {
            if (shift) {
                result = symbolCode_m_u[code];
            } else {
                result = symbolCode_m[code];
            }
        } else {
            _debug && warn("codeToChar映射错误！", 1500);
        }

        return result;
    }

    /**
     * 拼接operator到selector
     */
    function evalOperator() {
        var
            selector = selector_holder,
            operatorsContainer = document.querySelector('.operate-container'),
            operators = operatorsContainer.querySelectorAll(".operate-container span");

        if (selector.length == 0) {
            return null;
        }

        if (selector.length > 0) {
            selector = selector.replace(/\;$/, '');
        }

        for (var i = 0; i < operators.length; i++) {
            var
                singleQuoteStr = "')",
                doubleQuoteStr = '")',
                tag = operators[i],
                posit = tag.dataset['posit'],
                value = tag.innerText;

            if (!posit || posit == 'outer') {
                selector = selector + value;
            } else {
                if (selector.endsWith(singleQuoteStr)) {
                    selector = selector.replace(singleQuoteStr, value + singleQuoteStr);

                } else if (selector.endsWith(doubleQuoteStr)) {
                    selector = selector.replace(doubleQuoteStr, value + doubleQuoteStr);
                } else {
                    selector = selector.replace(/\)$/, value + ")");
                }
            }
        }
        selector = selector + ";";
        input.value = selector;
    }

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

            _debug && console.debug(arguments);

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
        warnSpan = document.querySelector(".result .alert"),
        isActive = resultSpan.classList.contains(clazz);

    warnSpan.innerText = msg;
    warnSpan.classList.add(clazz);
    resultSpan.classList.remove(clazz);

    time = time || 1000;
    setTimeout(timer, time);

    function timer() {
        warnSpan.innerText = "";
        warnSpan.classList.remove(clazz);
        isActive && resultSpan.classList.add(clazz);
    }
}

/**
 * 对象继承
 */
function $extends(from, to) {

    if (!from || !to || Array.isArray(from) || Array.isArray(to) || typeof from != typeof to) {
        return to;
    }
    for (var n in from) {
        if (from.hasOwnProperty(n)) {
            to[n] = from[n];
        }
    }
    return to;
}