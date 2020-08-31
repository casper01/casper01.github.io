(function () {
    module.exports = class StatsScreen extends Vue {
        constructor(projects, languages, commitsSum) {
            let watchersCnt = 0;

            projects.forEach(project => {
                watchersCnt += project.watchers_count;
            });

            super({
                el: '#statsSection',
                data: {
                    publicProjects: projects.length,
                    programmingLanguages: Object.keys(languages).length,
                    commits: commitsSum,
                    watchers: watchersCnt
                }
            });
        }
    }
})();