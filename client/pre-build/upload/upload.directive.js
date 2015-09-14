
app.directive('uploadBox', function () {
    return {
        restrict: 'E',
        templateUrl: '/pre-build/upload/upload.html',
        controller: 'UploadController'
    };
});