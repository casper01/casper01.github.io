(function () {

    module.exports = class LanguagesScreen extends Vue {
        
        constructor(langs) {
            let langIndex = 0;
            let allLanguageUnits = 0;
            let languages = []
            for (let name in langs) {
                languages.push({
                    id: "languageBarNo" + langIndex,
                    name: name,
                    value: langs[name]
                });
                langIndex++;
                allLanguageUnits += langs[name];
            }

            languages.sort(function (first, second) {
                return second.value - first.value;
            });

            super({
                el: '#languagesContainer',
                data: {
                    items: languages
                }
            });
            this.setProgressBars(languages, allLanguageUnits);
        }

        setProgressBars(languages, allLanguageUnits) {
            languages.forEach(language => {
                let progressBar = $("#" + language.id);

                let total = Math.round(Math.log(allLanguageUnits) * Math.log(allLanguageUnits));
                let progress = Math.round(Math.log(language.value) * Math.log(language.value));
                progressBar.progress("set total", total);
                progressBar.progress("set progress", progress);
            });
        }
    }
})();