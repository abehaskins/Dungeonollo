var dungeonollo = angular.module("Dungeonollo", ["firebase", "ngRoute"]);

dungeonollo.config(function($routeProvider, $locationProvider) {
    $routeProvider
    .when('/game/:serverName/:gameName', {
        templateUrl: 'partials/game.html',
        controller: 'GameClient'
    })
    .otherwise({
        templateUrl: 'partials/setup.html',
        controller: 'GameSetup'
    });

    // configure html5 to get links working on jsfiddle
    //$locationProvider.html5Mode(true);
});

function GameClient($scope, $firebase, $routeParams) {
    var ref, gameRef, playerRef;

    $scope.config = {
        serverName: $routeParams.serverName,
        gameName: $routeParams.gameName
    };

    $scope.history = [];

    $scope.sendCommand = function () {
        console.log(">", $scope.command);
        var ticketRef = playerRef.child('commandQueue').push($scope.command);
        $scope.history.push({type: "> ", text: $scope.command});

        ticketRef.child("response").on("value", function (snapshot) {
            var response = snapshot.val();
            if (!response) return;
            $scope.history.push({type: "", text: response});
            ticketRef.off();
            ticketRef.remove();
        });

        $scope.command = "";
    };

    ref = new Firebase("https://" + $routeParams.serverName + ".firebaseio.com/");
    gameRef = ref.child("dungeonollo").child($routeParams.gameName);

    playerRef = gameRef.child('players').push({"active": true});
    //playerRef.child('active').onDisconnect().set(false);
    playerRef.onDisconnect().remove();

    $firebase(gameRef.child('publicState')).$bind($scope, 'game');
    $firebase(playerRef).$bind($scope, 'player');
    $firebase(playerRef.child('events')).$on("child_added", function (data) {
        $scope.history.push({type: "", text: data.snapshot.value});
    });
}

function GameSetup($scope, $firebase, $location) {
    $scope.initialize = function () {
        $location.path('/game/' + $scope.firebaseName + '/' + $scope.gameName);
    };   
}

// http://stackoverflow.com/questions/12790854/angular-directive-to-scroll-to-a-given-item
dungeonollo.directive('scrollIf', function () {
  return function (scope, element, attributes) {
    setTimeout(function () {
      if (scope.$eval(attributes.scrollIf)) {
        window.scrollTo(0, element[0].offsetTop - 100)
      }
    });
  }
});