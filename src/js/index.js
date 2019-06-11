// $(':input').on('focus', function () {
//     $(this).parents('.form-group').children('[class^="input-group"]').addClass('text-primary');
// }).on('blur', function () {
//     $(this).parents('.form-group').children('[class^="input-group"]').removeClass('text-primary');
// });

const lottie = require("lottie-web");
const animationData = require("../assets/lottie/animation-w500-h500-dark.json");
const isUrl = require("is-url");


var app = angular.module("myApp", []);

app.controller("formCtrl", function($scope, $http) {
    const {
        ipcRenderer
    } = window.require("electron");
    $scope.deviceID = "";
    $scope.url = "";
    $scope.message = "";
    $scope.isReady = false;
    $scope.animation = null;
    $scope.data = {
        fullscreen: false,
        device_id: "henrik2",
        url: "https://dev.cloudvlt.com",
        debug: false,
        smartcard: true,
        kiosk: false
    };
    $scope.isUrlValid = function(userInput) {
        var res = userInput.match(
            /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g
        );
        if (res == null) return false;
        else return true;
    };
    $scope.submitConfig = function() {
        if (isUrl($scope.url)) {
            $scope.data.url = $scope.url;
            $scope.data.device_id = $scope.deviceID;
            ipcRenderer.send("writeCongifFile", $scope.data);
        } else {
            alert("Url is not valid");
        }
    };
    ipcRenderer.on("configCompleted", (event, obj) => {
        $scope.message = obj;
        $scope.$apply();
        myVar = setTimeout(function() {
            clearTimeout(myVar);
            ipcRenderer.send("restartApp", "");
        }, 3000);
    });
    // Show page loader - Load async data, if any.

    if (!$scope.isReady) {


        window.addEventListener("load", () => {
            $scope.animation = lottie.loadAnimation({
                container: document.getElementById("page-loader-auth"),
                renderer: "svg",
                loop: true,
                autoplay: true,
                //animationData
            });
            const waitTime = setInterval(() => {
                $scope.isReady = true;
                $scope.$apply();
                clearInterval(waitTime);
            }, 3000);
        });
    }
});