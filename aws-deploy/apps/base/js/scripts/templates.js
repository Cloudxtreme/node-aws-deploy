Templates = window.Templates||{};
Templates.get = function (name) {
    return Templates[name.replace(/[^a-z0-9]/gi,"_")];
};
