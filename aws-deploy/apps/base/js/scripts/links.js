(function () {
    var getActiveTarget = function () {
        return '/';
/*
        var url = '/' + window.location.href.split('/').slice(3).join('/') + '/';
        return _.first(_.filter(app_target, function (s) {
            return url.indexOf(s) == 0;
        }));*/
    };

    var matchesTarget = function (url) {
        return true;
/*        return _.any(app_target, function (s) {
            return url.indexOf(s) == 0;
        });*/
    };

    $(document.body).on("click", "a[href^='/']", function (event) {
        var href = $(event.currentTarget).attr('href');

        do {
            if (_.isString($(event.currentTarget).attr('data-toggle'))) {
                break;
            }

            if (_.isString($(event.currentTarget).attr('target'))) {
                break;
            }

            if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
                break;
            }

            if (event.isDefaultPrevented()) {
                break;
            }

            event.preventDefault();

            var url = $(event.currentTarget).attr('href');
            if (matchesTarget(url)) {
                var target = getActiveTarget();
                url = url.slice(target.length);

                app.navigate(url, {trigger: true});
            } else {
                window.location = url;
            }
        } while (0);
    });

    $(document.body).on("mouseover", "a[href^='#']", function (event) {
        do {
            if (_.isString($(event.currentTarget).attr('data-toggle'))) {
                break;
            }

            var target = getActiveTarget();
            if (!target) {
                break;
            }

            var url = $(event.currentTarget).attr('href').slice(1);
            if (window.history && window.history.pushState) {
                $(event.currentTarget).attr('href', target + url);
            }
        } while (0);
    });

    $(document.body).on("click", "a[href^='#']", function (event) {
        do {
            if (_.isString($(event.currentTarget).attr('data-toggle'))) {
                break;
            }

            if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
                break;
            }

            if (event.isDefaultPrevented()) {
                break;
            }

            var target = getActiveTarget();

            var url = $(event.currentTarget).attr('href').slice(1);
            if (window.history && window.history.pushState) {
                $(event.currentTarget).attr('href', target + url);
            }

            if (_.isString($(event.currentTarget).attr('target'))) {
                break;
            }

            event.preventDefault();
            app.navigate(url, {trigger: true});
        } while (0);
    });
}());
