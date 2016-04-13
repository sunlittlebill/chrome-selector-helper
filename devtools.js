chrome.devtools.panels.elements.createSidebarPane("Selector", function (sidebar) {
    sidebar.setPage("sideBar.html");

    sidebar.onShown.addListener(function (panelWindow) {

        var resizeFunc = function () {
            var newHeight = (this.document.body.getBoundingClientRect().height + 60) + "px";
            sidebar.setHeight(newHeight);
        };

        resizeFunc();
        panelWindow.onresize = resizeFunc;
        panelWindow.addEventListener("message", resizeFunc.bind(panelWindow));
    });
});