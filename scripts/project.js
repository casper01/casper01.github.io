(function () {
    module.exports = class Project {
        constructor(name, watchers, homepage) {
            this.name = name;
            this.imgUrl = "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png";
            this.watchers_count = watchers;
            this.homepage = homepage;
        }
    }
})();