(function () {
    module.exports = class Project {
        constructor(name, watchers, fork = false) {
            this.name = name;
            this.fork = fork;
            this.imgUrl = "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png";
            this.watchers_count = watchers;
        }
    }
})();