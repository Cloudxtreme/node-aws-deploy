var async = require("async");
var debug = require("debug")("aws-deploy:schedule");
var _ = require("lodash");

var cache = require('./cache');

function Scheduler() {
    this.initialize.apply(this, arguments);
}

_.extend(Scheduler.prototype, {
    initialize: function () {
        this.tasks = [];
    },

    start: function () {
        this.__reschedule(0);
    },

    stop: function () {
        if (this.timeout) {
            clearTimeout(this.timeout);
            delete this.timeout;
        }
    },

    register: function (task) {
        this.tasks.push({
            task: task,
            current: task.timeout ? Math.floor(Math.random() * Math.min(30 * 1000, task.timeout)) : Number.MAX_VALUE
        });

        task.scheduler = this;

        this.tasks = _.sortBy(this.tasks, function (task) {
            return task.current;
        });
    },

    run: function (name, data, callback) {
        var taskIndex = _.findIndex(this.tasks, function (task) {
            return task.task.name == name;
        });

        if (taskIndex < 0) {
            async.nextTick(function () {
                callback && callback("task not found");
            });
            return;
        }

        var task = this.tasks[taskIndex];

        debug("explicitly running scheduled job %s: %s", task.task.name, data);

        if (cache.get('schedule:task:' + task.task.name)) {
            async.nextTick(function () {
                callback && callback("task already running");
            });
            return;
        }

        cache.put('schedule:task:' + task.task.name, 1, 60 * 1000);
        task.task.run(data, function (err) {
            cache.del('schedule:task:' + task.task.name);
            callback && callback(err);
        });
    },

    __reschedule: function (timeout) {
        if (this.timeout) {
            clearTimeout(this.timeout);
        }
        this.timeout = setTimeout(this.__run.bind(this), timeout);
    },

    __run: function () {
        delete this.timeout;

        this.tasks.forEach(function (task) {
            if (task.current < Number.MAX_VALUE) {
                task.current = Math.max(0, task.current - 10000); // TODO: get tick count
            }
        });

        var taskIndex = _.findIndex(this.tasks, function (task) {
            return (task.current == 0) && task.task.timeout && !cache.get("schedule:task:" + task.task.name);
        });
        if (taskIndex < 0) {
            this.__reschedule(10 * 1000);
            return;
        }

        var task = this.tasks[taskIndex];
        task.current = task.task.timeout + Math.floor(Math.random() * 5 * 1000);

        this.tasks = _.sortBy(this.tasks, function (task) {
            return task.current;
        });

        debug("running task:", task.task.name);

        cache.put('schedule:task:' + task.task.name, 1, 60 * 1000);
        task.task.run(null, function (err) {
            cache.del('schedule:task:' + task.task.name);

            if (err) {
                debug("error running task %s: %s", task.task.name, err);
            }

            this.__reschedule(10 * 1000);
        }.bind(this));
    }
});

module.exports = new Scheduler();
