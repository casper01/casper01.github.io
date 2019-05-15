(function () {
    let grabity = require("grabity");
    let Project = require("./project");
    const backup = require("./backup");

    module.exports = class GhApi {
        constructor(username, online) {
            this._online = online;
            this.username = username;
            this._urls = {
                reposInfo: "https://cors.io/?https://api.github.com/users/" + this.username + "/repos",
                langInfo: function (project) { return "https://api.github.com/repos/" + username + "/" + project.name + "/languages" },
                commitsInfo: function (project) { return "https://api.github.com/repos/" + username + "/" + project.name + "/commits" },
                imageInfo: function (project) { return "https://cors.io/?https://github.com/" + username + "/" + project.name }
            };
            this.projects = [];
            this.languages;
            this.commitsSum;
        }

        getProjectsLanguages(projects) {
            if (!this._online) {
                this.languages = backup.LANGBACKUP;
                return Promise.resolve();
            }

            let self = this;
            let promises = [];
            projects.forEach(project => {
                promises.push(this._getProjectLanguages(project));
            });
            return Promise.all(promises)
                .then(function (values) {
                    self.languages = {};
                    values.forEach(value => {
                        for (let key in value) {
                            if (!(key in self.languages)) {
                                self.languages[key] = 0;
                            }
                            self.languages[key] += value[key];
                        }
                    });
                })
                .catch(function (values) {
                    console.warn("Failed to load languages from GitHub API");
                    self.languages = backup.LANGBACKUP;
                    return Promise.resolve();
                });
        }

        _getProjectLanguages(project) {
            let self = this;
            return $.getJSON(this._urls.langInfo(project))
                .fail(function (data) {
                    console.warn("Could not load languages from Github API");
                })
                .done(function (data) {
                    Promise.resolve(data);
                });
        }

        getProjectsCommits(projects) {
            if (!this._online) {
                this.commitsSum = backup.COMMITSBACKUP;
                return Promise.resolve();
            }

            let self = this;
            let promises = [];
            projects.forEach(project => {
                promises.push(this._getProjectCommits(project));
            });
            return Promise.all(promises)
                .then(function (values) {
                    self.commitsSum = 0;
                    values.forEach(v => {
                        self.commitsSum += v.length;
                    });
                })
                .catch(function (values) {
                    console.warn("Failed to load commits from GitHub API");
                    self.commitsSum = backup.COMMITSBACKUP;
                    return Promise.resolve();
                });
        }

        _getProjectCommits(project) {
            let self = this;
            return $.getJSON(this._urls.commitsInfo(project))
                .fail(function (data) {
                    console.warn("Could not load commits from Github API");
                })
                .done(function (data) {
                    Promise.resolve(data);
                });
        }

        getProjectImage(project) {
            return (async () => {
                let it = await grabity.grabIt(this._urls.imageInfo(project));
                console.log("it = ", it);   // TODO: zeby sprawdzic jak sie wywala
                project.imgUrl = it.image;
            })();
        }

        getRepos() {
            if (!this._online) {
                this.projects = [];
                backup.REPOSBACKUP.forEach(repo => {
                    this.projects.push(new Project(repo.name, repo.watchers_count, repo.fork));
                });
                return Promise.resolve();
            }

            let self = this;
            return $.getJSON(this._urls.reposInfo)
                .fail(function () {
                    console.warn("Could not load repositories info from Github API");
                    self.projects = backup.REPOSBACKUP;
                })
                .done(function (data) {
                    self.repos = data;
                    data.forEach(repo => {
                        self.projects.push(new Project(repo.name, repo.watchers_count, repo.fork));
                    });
                });
        }
    };
})();