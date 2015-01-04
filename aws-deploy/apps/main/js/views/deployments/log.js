DeploymentLogView = AwsDeploy.View.extend({
    id: "log",
    initialize: function () {
        this.template = Templates.get('main/deployment-log');
        this.listenTo(this.model, 'change', this.render);

        this.collection = new DeploymentLogCollection();
        this.collection.deployment_id = this.model.id;
        this.collection.page_index = 0;
        this.listenTo(this.collection, 'reset', this.addAll);
        this.collection.fetch({
            reset: true,
            success: _.bind(function () {
                this.setInterval(function () {
                    this.collection.fetch({reset: true});
                }, 15000, this);
            }, this)
        });
    },

    render: function () {
        this.$el.html(this.template());
        var root = this.$el.find("tbody");
        _.each(this.getChildViews(), function (view) {
            root.append(view.render().el);
        });
        return this;
    },

    addAll: function () {
        this.closeChildViews();
        this.collection.each(this.addOne, this);
        this.render();
    },

    addOne: function (model) {
        var view = new DeploymentLogItemView({model: model});
        this.addChildView(view);
    }
});

DeploymentLogItemView = AwsDeploy.View.extend({
    tagName: "tr",

    initialize: function () {
        this.template = Templates.get('main/deployment-log-item');
        this.listenTo(this.model, 'change', this.render);
    },

    render: function () {
        this.$el.html(this.template(this.model.toJSON()));
        this.$el.find("pre code").each(function (i, block) {
            hljs.highlightBlock(block);
        });
        return this;
    }
});