GithubApi = AwsDeploy.Model.extend({
    url: "/github",

    link: function (product_id, callback) {
        this.emit('link', {
            product_id: product_id
        }, {
            success: function (model, resp) {
                window.location.href = resp.endpoint + "/login/oauth/authorize?client_id=" + resp.client + "&scope=repo&state=" + resp.state;
            },

            error: function () {
                callback("begin link failed");
            }
        });
    }
});