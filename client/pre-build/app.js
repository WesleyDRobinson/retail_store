var app = angular.module('RetailStore', ['ui.router', 'xeditable', 'ui.bootstrap']);

app.config(function ($urlRouterProvider, $locationProvider) {
    // This turns off hashbang urls (/#about) and changes it to something normal (/about)
    $locationProvider.html5Mode(true);
    // If we go to a URL that ui-router doesn't have registered, go to the "/" url.
    $urlRouterProvider.otherwise('/');
});


app.run(function (editableOptions, editableThemes) {
    editableOptions.theme = 'bs3'; // bootstrap3 theme. Can be also 'bs2', 'default'
    editableThemes.bs3.buttonsClass = 'btn-sm';
    editableThemes.bs3.inputClass = 'input-default';
});