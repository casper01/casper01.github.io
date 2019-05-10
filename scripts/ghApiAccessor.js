(function () {
    'use strict';

    class GhApi {
        constructor(username) {
            this._username = username;
            this._urls = {
                overallInfo: "https://cors.io/?https://api.github.com/users/" + this._username,
                reposInfo: "https://cors.io/?https://api.github.com/users/" + this._username + "/repos"
            };
        }

        getOveralInfo() {
            $.getJSON(this._urls.overallInfo, function (data) {
                console.log("success", data)
            });
        }

        getRepos(callback) {
            $.getJSON(this._urls.reposInfo, callback);
        }
    };

    let stats = new Vue({
        el: '#statsSection',
        data: {
            publicProjects: 0,
            programmingLanguages: 0,
            codeLines: 0,
            watchers: 0
        }
    });

    // let projects = new Vue({
    //     el: '#projectsContainer',
    //     data: {
    //         items: [
    //             {
    //                 name: "Mój projekt"
    //             }
    //         ]
    //     }
    // });

    let updateRepos = function (repos) {
        let projInfos = [];
        repos.forEach(repo => {
            // do not include forked projects
            if (!repo.fork)
                projInfos.push({ name: repo.name })
        });

        new Vue({
            el: '#projectsContainer',
            data: {
                items: projInfos
            }
        });
    }

    let api = new GhApi('casper01');
    // api.getOveralInfo();
    api.getRepos(updateRepos);

}());