(function () {
    let settings = require("./settings");

    module.exports = class ContactScreen extends Vue {
        constructor() {
            super({
                el: "#contactSection",
                data: {
                    url: "https://formspree.io/" + settings.contactEmail
                }
            });
        }
    }
})();