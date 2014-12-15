function Scheduler() {
    this.initialize.apply(this, arguments);
}

_.extend(Scheduler.prototype, {
    initialize: function () {
    }
});

exports.Scheduler = new Scheduler();