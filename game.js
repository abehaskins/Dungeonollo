var Firebase = require('firebase');
var _ = require('underscore');  
var WatchJS = require('watchjs');
var watch = WatchJS.watch;

var Dungeonollo = function (firebaseName, gameName) {
    var self = {};
    
    self._ref = (new Firebase("https://" + firebaseName + ".firebaseio.com"));
    self._gameRef = self._ref.child("dungeonollo").child(gameName);
    self._publicStateRef = self._gameRef.child('publicState');
    self._data = require('./games/pirates');
    
    self._publicState = {
        hasServer: true,
        players: 0
    };
    
    self._players = {};
    
    // Start everything
    
    self._publicStateRef.once("value", function (snapshot) {
        var _publicState = snapshot.val();
        if (_publicState && _publicState.hasServer) {
            throw "Game has server, not connecting";
        } else {
            self._initialize();
        }
    });
    
    // Methods
    
    self._initialize = function () {
        self._gameRef.child('publicState').remove();
        self._publicStateRef.child('hasServer').onDisconnect().set(false);

        watch(self, "_publicState", function() {
            self._publicStateRef.set(self._publicState);
        }); 

        self._gameRef.child("players").on("child_added", function (snapshot) {
           self._addPlayer(snapshot.val(), snapshot.ref());
        });

        self._addPlayer = function (player, playerRef) {
            if (!player.active) return;
            var playerId = playerRef.name();
            self._publicState.players += 1;
            
            playerRef.on("value", function (snapshot) {
                var player = snapshot.val();
                if (!player) return;
                self._players[playerId] = player.state || {};
            });
            
            playerRef.child("commandQueue").on("child_added", function (snapshot) {
                var responseRef = snapshot.ref().child("response");
                var player = self._players[playerId];
                responseRef.set(self._execute(snapshot.val(), player, playerRef.child("state"))); 
                playerRef.child('state').set(player);
            });
            
            playerRef.child("events").push("Welcome to Dungeonollo! Run \"begin\" to set up a character!");
        };  
    };
    
    self._execute = function (commandStr, player, playerRef) {
        var name = commandStr.split(" ")[0];
        var obj = self._commands[name];
        var args = [];
        
        if (!obj) obj = self._commands.default;
        
        if (obj.available && !obj.available.apply(self, [player].concat(args))) obj = self._commands.default;
        
        if (obj.parser) {
            (commandStr.match(obj.parser) || []).forEach(function (str) {
                if (str == commandStr) return;
                args.push(str);
            });
        }
        
        if (obj.broadcast) {
            self._broadcast(player, obj.broadcast.distance, obj.broadcast.func, args)
        }
        
        return obj.func.apply(self, [player].concat(args));
    };
    
    self._playersInRange = function (broadcastingPlayerState, maxDistance) {
        var x = parseInt(broadcastingPlayerState.x, 10);
        var y = parseInt(broadcastingPlayerState.y, 10);
        var playersInRange = {};
        _(self._players).forEach(function (playerState, playerId) {
            var distance = Math.sqrt(Math.abs(Math.pow(x-playerState.x, 2)+Math.pow(y-playerState.y, 2)));
            if (distance <= maxDistance) {
                 playersInRange[playerId] = playerState;
            }
        });
        return playersInRange;
    };
    
    self._broadcast = function (player, distance, func, args) {
        var players = self._playersInRange(player, distance);
        _(players).forEach(function (otherPlayer, otherPlayerId) {
            if (otherPlayer == player) return;
            self._gameRef
                .child(["players", otherPlayerId, "events"].join('/'))
                .push(func.apply(self, [player, otherPlayer].concat(args)))  ;
        });  
    };
    
    self._commands = require('./commands');
};

new Dungeonollo(process.argv[2], process.argv[3]);