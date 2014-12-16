DeploymentRepositoryView = AwsDeploy.View.extend({
    initialize: function () {
        this.template = Templates.get("main/deployment-repository");

        this.repository = new DeploymentRepositoryModel();
        this.repository.deployment_id = this.model.id;
        this.listenTo(this.repository, 'change', this.render);

        this.repository.fetch({
            success: _.bind(function () {
                this.refreshUrls();
            }, this)
        });
    },

    events: {
        "change #repository_type": "onChangeRepositoryType",
        "change #repository_name": "onChangeRepositoryName",
        "change #repository_branch": "onChangeRepositoryBranch",
        "click #link": "link",
        "click #save": "save",
        "click #unlink": "unlink"
    },

    render: function () {
        this.$el.html(this.template(this.repository.toJSON()));
        this.$el.find("#repository_type").val(this.repository.get("repository_type")).prop('disabled', !!this.repository.get("repository_linked"));
        return this;
    },

    onChangeRepositoryType: function (event) {
        this.repository.set("repository_type", event.target.value);
    },

    refreshUrls: function () {
        if (this.repository.get("repository_linked") && !this.repository.get("repository_url")) {
            this.urls = new GithubUrlCollection();
            this.urls.deployment_id = this.model.id;

            var target = this.$el.find("select#repository_name");

            this.urls.fetch({
                reset: true,
                success: _.bind(function (collection) {
                    $("<option>").attr("value","").html("repository.pick-repository").appendTo(target);
                    target.prop("disabled", false);

                    collection.each(function (url) {
                        $("<option>").html(url.get("full_name")).appendTo(target);
                    });
                }, this)
            });
        }
    },

    onChangeRepositoryName: function () {
        var repository_name = this.$el.find("#repository_name").val();

        if (this.repository.get("repository_linked") && !this.repository.get("repository_url")) {
            this.branches = new GithubBranchCollection();
            this.branches.deployment_id = this.model.id;
            this.branches.repository_name = repository_name;

            var target = this.$el.find("select#repository_branch");

            this.branches.fetch({
                reset: true,
                success: _.bind(function (collection) {
                    $("<option>").attr("value", "").html("repository.pick-branch").appendTo(target);
                    target.prop("disabled", false);

                    collection.each(function (branch) {
                        $("<option>").attr("value", branch.get("name")).html(branch.get("name") + " (" + branch.get("sha") + ")").appendTo(target);
                    });
                }, this)
            });
        }
    },

    onChangeRepositoryBranch: function () {
        var repository_name = this.$el.find("#repository_name").val();
        var repository_branch = this.$el.find("#repository_branch").val();

        this.$el.find("button#save").prop('disabled', !(!!repository_name && !!repository_branch));
    },

    save: function (event) {
        event.preventDefault();

        var repository_name = this.$el.find("#repository_name").val();
        var repository_branch = this.$el.find("#repository_branch").val();

        this.repository.save({
            repository_url: repository_name + "#" + repository_branch
        }, {
            wait: true,
            error: function () {
                toastr.error("repository.repo-link-failed");
            }
        })
    },

    link: function (event) {
        event.preventDefault();

        this.repository.emit('link', {
            success: _.bind(function (model, url) {
                window.location.href = url;
            }, this),
            error: function () {
                toastr.error("deployment.repo-link-error");
            }
        });
    },

    unlink: function (event) {
        event.preventDefault();

        this.confirm("repository.unlink-repo-confirm", function (ok) {
            if (ok) {
                this.repository.emit('unlink', {
                    success: _.bind(function () {
                        this.repository.fetch();
                    }, this),
                    error: function () {
                        toastr.error("deployment.repo-unlink-error");
                    }
                });
            }
        });
    }
});
