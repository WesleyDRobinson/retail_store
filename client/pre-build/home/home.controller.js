app.controller('HomeController', function ($scope, HomeFactory) {
    $scope.seedTests = function ($event) {

        HomeFactory.seedTests();
    };

    $scope.clearDb = function ($event) {

        HomeFactory.clearDbSection('tests');
        HomeFactory.clearDbSection('products');
        HomeFactory.clearDbSection('product_tests');
    };

    $scope.parseCsvFile = function ($event) {

        var file = document.getElementById('csvFileUpload').files[0];
        if (!file) return console.log("No file selected");

        HomeFactory.parseCsvFile(file);
    };

    $scope.productTestArray = [];
    $scope.getProductTests = (function () {

        var ref = new Firebase('https://retail-store.firebaseio.com/');
        var refProductTests = ref.child('product_tests');
        var prodTestRow;

        refProductTests.once('value', function (products) {
            products = products.val();
            // the keys in the products_tests are the product ids
            var productIds = _.keys(products);

            _.forEach(productIds, function (prodId) {
                ref.child('products/' + prodId).once('value', function (prodSnap) {
                    var prod = prodSnap.val();
                    var productTests = products[prodSnap.key()];
                    _.forEach(productTests, function (prodTest, prodKey) {
                        prodTestRow = {
                            prodId: prodId,
                            prodTestId: prodKey,
                            name: prod.name,
                            test: prodTest.test,
                            dateTime: prodTest.dateTime,
                            status: prodTest.status,
                            comment: prodTest.comment
                        };
                        $scope.productTestArray.push(prodTestRow);
                    });
                });
            });
            $scope.productTests = products;
        });
    }());

    $scope.updateItem = function (update, prodId, itemToUpdate, prodTestId) {
        var ref = new Firebase('https://retail-store.firebaseio.com/');
        if (itemToUpdate === 'name') {
            ref.child('products/' + prodId).update({name: update});
        } else {
            var updateObject = {};
            updateObject[itemToUpdate] = update;
            ref.child('product_tests/' + prodId).child(prodTestId).update(updateObject);
        }
    };

    ///////////////////////_______SPEC QUERIES________////////////////////
    // Get tests with status=failed within the past 7 days (604800000 ms)
    $scope.getFailedTestsThisWeek = (function ($event) {

        $scope.failedTestsThisWeek = [];
        var sevenDaysAgo = (_.now() - 604800000).toString();
        var ref = new Firebase('https://retail-store.firebaseio.com/product_tests');
        var tempArray = [];
        ref.once('value', function (products) {
            _.forEach(products.val(), function (product) {
                _.forEach(product, function (test) {
                    if (test.status === 'failed' && test.dateTime > sevenDaysAgo) {
                        tempArray.push(test)
                    }
                });
            });
            $scope.failedTestsThisWeek = tempArray.length ? tempArray : "no tests failed";
        });
    }());
    // get tests with query definition object
    $scope.getTests = function ($event, query) {

        var status = query.status;
        var daysInMilliSeconds = (query.daysOlderThan * 86400000).toString();

        var ref = new Firebase('https://retail-store.firebaseio.com/product_tests');
        var temporary = [];
        ref.once('value', function (products) {
            _.forEach(products.val(), function (product) {
                _.forEach(product, function (test) {
                    if (test.status === status && test.dateTime < daysInMilliSeconds) {
                        temporary.push(test)
                    }
                });
            });
            $scope.pendingTests = temporary.length ? temporary : "no tests pending and older than 3 days";
        });
    };
    // Update products if tests are passed, and return a list if updated
    $scope.validateProductsWhichAllTestsAreComplete = function ($event) {

        var ref = new Firebase('https://retail-store.firebaseio.com/');
        var temp = [];
        ref.child('product_tests').once('value', function (products) {
            _.forEach(products.val(), function (product, productKey) {
                var passedAllTests = _.every(product, function (test) {
                    return test.status === 'passed';
                });
                if (passedAllTests) {
                    var prodRef = ref.child('products/' + productKey);
                    prodRef.update({'state': 'verified'}, function (err) {
                        if (err) console.error("Error: ", err);
                        prodRef.on('value', function (updatedProd) {
                            // Left here on purpose
                            console.log(updatedProd.val());
                            return updatedProd.val();
                        });
                    });
                }
            });
        });
    };
});

app.factory('HomeFactory', function () {
    var ref = new Firebase('https://retail-store.firebaseio.com/');
    var refToTests = ref.child('tests');

    var addTestToDb = function (test) {
        var testRef = refToTests.push(test);
        return testRef.key();
    };

    var addProductToDb = function (product) {
        var productRef = ref.child('products').push(product);
        return productRef.key();
    };

    var seedTests = function () {
        var testOptions = ['coloring', 'durability', 'size'];
        _.times(3, function (n) {
            var testName = testOptions[n];
            var newTest = {
                name: testName,
                description: 'product has proper ' + testName
            };
            addTestToDb(newTest);
        });
    };

    var clearDbSection = function (section) {
        ref.child(section).set({});
    };

    var saveToDb = function (parsedFile) {

        var newProduct;
        var newProductKey;
        var product_test;
        refToTests.once('value', function (tests) {
            _.forEach(parsedFile.data, function (product) {

                newProduct = {
                    name: product.name || 'no name provided',
                    manufacturer: product.manufacturer || 'no manufacturer provided',
                    state: product.state.toLowerCase() || 'unverified'
                };

                if (product.name || product.manufacturer) {
                    // save product to database; unique id returned
                    newProductKey = addProductToDb(newProduct);

                    // create product_tests object for each newProduct
                    var newProductTestRef = ref.child('product_tests/' + newProductKey);
                    _.forEach(tests.val(), function (test) {
                        var dateNow = _.now();
                        product_test = {
                            test: test.name,
                            dateTime: dateNow,
                            status: 'pending',
                            comment: 'Last Action: uploaded'
                        };
                        newProductTestRef.push(product_test);
                    });
                }
            });
        });

    };
    var parseCsvFile = function (file) {
        // Find more info about PapaParse at https://github.com/mholt/PapaParse
        Papa.parse(file, {
            header: true,
            // function invoked with results of file parsing -- defined above
            complete: saveToDb,
            // function called if an error occurs
            error: function (err) {
                throw new Error("Error: ", err, ' There was a problem parsing the data; please try again');
            }
        });
    };

    return {
        addTestToDb: addTestToDb,
        addProductToDb: addProductToDb,
        seedTests: seedTests,
        clearDbSection: clearDbSection,
        parseCsvFile: parseCsvFile
    };

});
