(function () {

    module.exports = class ReposScreen extends Vue {
        constructor(projects) {
            projects.sort(function(a, b) {
                return b.creationDate - a.creationDate;
            });
            super({
                el: '#projectsContainer',
                data: {
                    items: projects
                },
                methods: {
                    redirect: function(project) {
                        window.open(project.homepage, '_blank');
                    }
                }
            });
        }
    }
})();