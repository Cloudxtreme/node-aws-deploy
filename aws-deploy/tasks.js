var schedule = require('./schedule');

var tasks = [
    require('./tasks/check-application-status'),
    require('./tasks/check-repository-status'),
    require('./tasks/create-application-package')
];

tasks.forEach(function (task) {
    schedule.register(task);
});