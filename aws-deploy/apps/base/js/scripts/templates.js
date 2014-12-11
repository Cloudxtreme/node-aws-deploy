Templates = window.Templates||{};
Templates.get = function (name) {
    return Templates[name.replace(/[\/-]/g,"_")];
};
