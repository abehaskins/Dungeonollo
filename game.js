var Firebase = require('firebase');
var _ = require('underscore');  
var WatchJS = require('watchjs');
var watch = WatchJS.watch;

var Dungeonollo = function (firebaseName, gameName) {
    var self = {};
    
    self._ref = (new Firebase("https://" + firebaseName + ".firebaseio.com"));
    self._gameRef = self._ref.child("dungeonollo").child(gameName);
    self._publicStateRef = self._gameRef.child('publicState');
    
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
                responseRef.set(self._execute(snapshot.val(), playerId, playerRef.child("state"))); 
            });
            
            playerRef.child("events").push("Welcome to Dungeonollo! Run \"begin\" to set up a character!");
        };  
    };
    
    self._execute = function (commandStr, playerId, playerRef) {
        var player =  self._players[playerId];
        var name = commandStr.split(" ")[0];
        var obj = self._commands[name];
        var args = [player, playerRef];
        
        if (!obj) obj = self._commands.default;
        
        if (obj.available && !obj.available.apply(self, args)) obj = self._commands.default;
        
        if (obj.parser) {
            (commandStr.match(obj.parser) || []).forEach(function (str) {
                if (str == commandStr) return;
                args.push(str);
            });
        }
        
        if (obj.broadcast) {
            var players = self._playersInRange(player, obj.broadcast.distance);
            _(players).forEach(function (otherPlayer, otherPlayerId) {
                if (otherPlayer == player) return;
                self._gameRef
                    .child(["players", otherPlayerId, "events"].join('/'))
                    .push(obj.broadcast.func(player, otherPlayer))  ;
            });
        }
        
        return obj.func.apply(self, args);
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
    
    self._commands = {
        default: {
            func: function (player, playerStateRef) {
                return "Unknown Command - use \"help\" for a list of commands";
            }
        },
        help: {
            help: "help - This menu :)",
            func: function (player, playerStateRef) {
                var helpers = ["Commands:\n"];
                _(self._commands).forEach(function (command, name) {
                    if (command.help && (!command.available || command.available.apply(self, [player, playerStateRef]))) {
                        helpers.push(command.help);   
                    }
                });
                return helpers.join("\n");
            },
            broadcast: {
                distance: 1.5, // i.e. 1 block in any direction including diagonal,
                func: function (player, otherPlayer) {
                    // if player is X+1 Y+1 then say Someone is calling for help to the North-east
                    return "Someone near by is yelling for help!";
                }
            }
        },
        begin: {
            help: "begin - create your character and begin the game.",
            func: function (player, playerStateRef, name) {
                playerStateRef.child("isReady").set(true);
                return "You are now ready to begin your adventure!"
            },
            available: function (player, playerStateRef) {
                return !player.isReady;   
            }
        },
        set: {
            parser: /set (.+) (.+)/,
            help: "set (key) (value) - store data about you (name, class, etc).",
            func: function (player, playerStateRef, key, value) {
                playerStateRef.child(key).set(value);
                return key + " has been set to " + value;
            }
        },
        hello: {
            help: "hello - receive a greeting from the server.",
            func: function (player, playerStateRef, name) {
                if (player.name) {
                    return "Hello " + player.name + "!";   
                } else {
                    return "Hello Stranger! (Set your name with \"set name NAME\")";  
                }
            },
            available: function (player, playerStateRef) {
                return player.isReady;   
            }
        }
    };
};

new Dungeonollo(process.argv[2], process.argv[3]);