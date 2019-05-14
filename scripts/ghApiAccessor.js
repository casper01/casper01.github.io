(function () {
    'use strict';
    let GhApi = require("./ghapi");
    let settings = require("./settings");

    let vueObjects = {
        repos: undefined,
        langs: undefined,
        stats: undefined,
        menu: undefined,
    };

    let online = false;
    let api = new GhApi(settings.login, online);

    let updateRepos = function (projects) {
        vueObjects.repos = new Vue({
            el: '#projectsContainer',
            data: {
                items: projects
            }
        });
    }

    let updateLanguages = function (langs) {
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
        vueObjects.languages = new Vue({
            el: '#languagesContainer',
            data: {
                items: languages
            }
        });

        // setting progress
        languages.forEach(language => {
            let progressBar = $("#" + language.id);

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

        vueObjects.stats = new Vue({
            el: '#statsSection',
            data: {
                publicProjects: api.projects.length,
                programmingLanguages: Object.keys(api.languages).length,
                commits: api.commitsSum,
                watchers: watchersCnt
            }
        });
    }

    let onSiteReady = function () {
        vueObjects.menu = new Vue({
            el: "#mainMenu",
            data: {
                login: settings.login
            },
            methods: {
                animateTo: function (destId) {
                    $('html,body').animate({ scrollTop: $(destId).offset().top }, 'slow');
                }
            }
        });


        $('#loginHeader')
            .transition({
                duration: 2000,
                onComplete: function () {
                    $('#infoHeader').transition({ duration: 2000 });
                }
            });
    }

    onSiteReady();


    api.getRepos()
        .then(function (values) {
            let promises = [];
            promises.push(api.getProjectsLanguages(api.projects));
            promises.push(api.getProjectsCommits(api.projects));
            promises.push(api.getProjectsImage(api.projects));

            Promise.all(promises)
                .then(function () {
                    updateRepos(api.projects);
                    updateLanguages(api.languages);
                    updateStats(api);
                })
                .catch(function (value) {
                    console.warn("Error while downloading languages, commits, images", value);
                });
        })
        .catch(function (value) {
            console.log("Error while downloading repos info", value);
        });
}());