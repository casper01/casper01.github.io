(function () {
    'use strict';
    let grabity = require("grabity");
    const backup = require("./backup");

    class Project {
        constructor(name, watchers, fork = false) {
            this.name = name;
            this.fork = fork;
            this.imgUrl = "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png";
            this.watchers_count = watchers;
        }
    }

    class GhApi {
        constructor(username, online) {
            this._online = online;
            this._backup = require("./backup");
            this._username = username;
            this._urls = {
                overallInfo: "https://cors.io/?https://api.github.com/users/" + this._username,
                reposInfo: "https://cors.io/?https://api.github.com/users/" + this._username + "/repos",
                langInfo: function (project) { return "https://api.github.com/repos/" + username + "/" + project.name + "/languages" },
                commitsInfo: function (project) { return "https://api.github.com/repos/" + username + "/" + project.name + "/commits" },
                imageInfo: function (project) { return "https://cors.io/?https://github.com/" + username + "/" + project.name }
            };
            this.overallData;
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
                    // project.languages = [];  // TODO: potrzebne?
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
                    // project.commitsCount = backup.COMMITSBACKUP;
                })
                .done(function (data) {
                    Promise.resolve(data);
                    // project.commitsCount = data.length; // TODO: smiec to i wyzej
                });
        }

        getProjectsImage(projects) {
            let promises = [];
            projects.forEach(project => {
                promises.push(this._getProjectImage(project));
            });
            return Promise.all(promises)
                .catch(function (values) {
                    console.warn("Failed to load images from GitHub project");
                    return Promise.resolve();
                });
        }

        _getProjectImage(project) {
            return (async () => {
                let it = await grabity.grabIt(this._urls.imageInfo(project));
                project.imgUrl = it.image;
            })();
        }

        // getOveralInfo() {
        //     let self = this;
        //     return $.getJSON(this._urls.overallInfo)
        //         .fail(function () {
        //             console.warn("Could not load profile info from Github API");
        //             self.overallData = undefined;
        //         })
        //         .done(function (data) {
        //             console.log("getOveralInfo", data);
        //             self.overallData = data;
        //         });
        // }

        getRepos() {
            if (!this._online) {
                this.projects = backup.REPOSBACKUP
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

    let updateRepos = function (projects) {
        new Vue({
            el: '#projectsContainer',
            data: {
                items: projects
            }
        });
    }

    let updateLanguages = function (projects, langs) {
        let languages = [];
        let ind = 0;
        let valSum = 0;

        for (let key in langs) {
            languages.push({
                id: "languageBarNo" + ind,
                name: key,
                value: langs[key]
            });
            ind++;
            valSum += langs[key];
        }

        // sorting descending
        languages.sort(function (first, second) {
            return second.value - first.value;
        });

        // generating html
        new Vue({
            el: '#languagesContainer',
            data: {
                items: languages
            }
        });

        // setting progress
        languages.forEach(language => {
            let progressBar = $("#" + language.id);
            let proc = Math.round(language.value / valSum * 100) + 1;   // TODO: unused

            // logarythmic scale
            let s = Math.round(Math.log(valSum) * Math.log(valSum));
            let v = Math.round(Math.log(language.value) * Math.log(language.value));

            progressBar.progress("set total", s);
            progressBar.progress("set progress", v);
        });
    }

    let updateStats = function (api) {
        let watchersCnt = 0;

        api.projects.forEach(project => {
            watchersCnt += project.watchers_count;
        });

        new Vue({
            el: '#statsSection',
            data: {
                publicProjects: api.projects.length,
                programmingLanguages: Object.keys(api.languages).length,
                commits: api.commitsSum,
                watchers: watchersCnt
            }
        });
    }

    let api = new GhApi('casper01', false);  // laucer, rosmat
    // api.getOveralInfo();
    // api.getRepos(updateRepos);
    // let p1 = api.getOveralInfo();    // TODO: ta metoda jest nieuzywana
    let p2 = api.getRepos();
    let p1 = p2;    // TODO: troche chaos, naprawic to

    Promise.all([p1, p2])
        .then(function (values) {
            let promises = [];
            promises.push(api.getProjectsLanguages(api.projects));
            promises.push(api.getProjectsCommits(api.projects));
            promises.push(api.getProjectsImage(api.projects));

            Promise.all(promises)
                .then(function () {
                    updateRepos(api.projects);
                    updateLanguages(api.projects, api.languages);
                    updateStats(api);
                })
                .catch(function (value) {
                    console.warn("Error in second promise.all", value);
                });
        })
        .catch(function (value) {
            console.log("Error in first promise.all", value);
        });
}());