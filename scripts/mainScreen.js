(function () {
    let settings = require("./settings");

    module.exports = class MainScreen extends Vue {
        constructor() {
            super({
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
        }
        
        fadeInMainText = function() {
            $('#mainMenuDimmer').css('display', 'none');
            $('#loginHeader')
            .transition({
                duration: 2000,
                onComplete: function () {
                    $('#infoHeader').transition({ duration: 2000 });
                }
            });
        }
    }
})();