(function () {
    'use strict';
    let GhApi = require("./ghapi");
    let ContactScreen = require("./contactScreen");
    let MainScreen = require("./mainScreen");
    let ReposScreen = require("./reposScreen");
    let LanguagesScreen = require("./languagesScreen");
    let StatsScreen = require("./statsScreen");
    let settings = require("./settings");
    let api = new GhApi(settings.login, settings.online);

    let vueObjects = {
        repos: undefined,
        langs: undefined,
        stats: undefined,
        menu: undefined,
        contact: undefined
    };
    
    let loadAllData = function () {
        vueObjects.contact = new ContactScreen();
        vueObjects.menu = new MainScreen();
        api.getRepos().then(getReposCallback).catch(getReposCallback);
    }
    
    let getReposCallback = function () {
        let promises = [];
        promises.push(api.getProjectsLanguages());
        promises.push(api.getProjectsCommits());
        Promise.all(promises).then(getLangsCommitsCallback).catch(getLangsCommitsCallback);
    }

    let getLangsCommitsCallback = function() {
        vueObjects.menu.fadeInMainText();
        vueObjects.repos = new ReposScreen(api.projects);
        vueObjects.langs = new LanguagesScreen(api.languages);
        vueObjects.stats = new StatsScreen(api.projects, api.languages, api.commitsSum);
        showContent();
    }

    let showContent = function() {
        $("#mainContainer").css("display", "block");
    }

    loadAllData();
}());