var _ = require('underscore');
module.exports = {
        default: {
            func: function (playerState) {
                return "Unknown Command - use \"help\" for a list of commands";
            }
        },
        help: {
            help: "help - This menu :)",
            func: function (playerState) {
                var helpers = ["Commands:\n"];
                _(this._commands).forEach(function (command, name) {
                    if (command.help && (!command.available || command.available.apply(this, [playerState]))) {
                        helpers.push(command.help);   
                    }
                });
                return helpers.join("\n");
            }
        },
        say: {
            parser: /say (.+)/,
            help: "say (message) - Say something out loud to players within 1 block of you.",
            func: function (playerState, message) {
                return "You say: " + message;
            },
            broadcast: {
                distance: 1.5, // i.e. 1 block in any direction including diagonal,
                func: function (playerState, otherPlayer, message) {
                    // if player is X+1 Y+1 then say Someone is calling for help to the North-east
                    return "You hear someone say: " + message;
                }
            },
            available: function (playerState) {
                return playerState.isReady;   
            }
        },
        begin: {
            help: "begin - create your character and begin the game.",
            func: function (playerState, name) {
                playerState.isReady = true;
                playerState.x = 0;
                playerState.y = 0;
                playerState.inventory = {
                    bandages: 2  
                };
                return "You are now ready to begin your adventure!"
            },
            available: function (playerState) {
                return !playerState.isReady;   
            }
        },
        set: {
            parser: /set (.+) (.+)/,
            help: "set (key) (value) - store data about you (name, class, etc).",
            func: function (playerState, key, value) {
                playerState[key] = value;
                return key + " has been set to " + value;
            }
        },
        hello: {
            help: "hello - receive a greeting from the server.",
            func: function (playerState, name) {
                if (playerState.name) {
                    return "Hello " + playerState.name + "!";   
                } else {
                    return "Hello Stranger! (Set your name with \"set name NAME\")";  
                }
            },
            available: function (playerState) {
                return playerState.isReady;   
            }
        },
        walk: {
            parser: /walk (.+)/,
            help: "walk (north/east/south/west) - move in a direction.",
            func: function (playerState, direction) {
                if (direction == "north" || direction == "up") {
                    playerState.y -= 1;   
                }
                if (direction == "south" || direction == "down") {
                    playerState.y += 1;   
                }
                if (direction == "west" || direction == "left") {
                    playerState.x -= 1;   
                }
                if (direction == "east" || direction == "right") {
                    playerState.x += 1;   
                }
                return this._data.map[playerState.x + 'x' + playerState.y].description;
            },
            available: function (playerState) {
                return playerState.isReady;   
            }   
        },
        look: {
            parser: /look (.+)/,
            help: "look (north/east/south/west) - look in a direction.",
            func: function (playerState, direction) {
                var offset = {x: 0, y:0}
                if (direction == "north" || direction == "up") {
                    offset.y -= 1;   
                }
                if (direction == "south" || direction == "down") {
                    offset.y += 1;   
                }
                if (direction == "west" || direction == "left") {
                    offset.x -= 1;   
                }
                if (direction == "east" || direction == "right") {
                    offset.x += 1;   
                }
                if (offset.x || offset.y) {
                    return this._data.map[(playerState.x+offset.x) + 'x' + (offset.y+playerState.y)].distance_description;   
                } else {
                    return this._data.map[(playerState.x) + 'x' + (playerState.y)].description;   
                }
            },
            available: function (playerState) {
                return playerState.isReady;   
            }   
        },
        take: {
            parser: /take (.+)/,
            help: "take (item) - take an item you find.",
            func: function (playerState, item) {
                var response = [];
                
                var itemExists = this._data.map[(playerState.x) + 'x' + (playerState.y)].items.indexOf(item) >= 0;
                if (!itemExists) return "I don't see that item around here.";
                
                var itemObj = this._data.items[item];
                
                var take = itemObj.take.apply(this, [playerState]);
                response.push(take.msg);
                
                if (take.can) {
                    var items = playerState.inventory[item];
                    items = items? items+1:1;
                    playerState.inventory[item] = items;
                    response.push("+ " + item);
                }
                
                return response.join('\n');
            },
            available: function (playerState) {
                return playerState.isReady;   
            }         
        },
        inventory: {
            parser: /inventory/,
            help: "inventory - view items you are carrying.",
            func: function (playerState) {
                var items = [];
                _(playerState.inventory).forEach(function (itemCount, itemName) {
                    items.push(itemName + " x" + itemCount);
                });
                return items.join("\n");
            },
            available: function (playerState) {
                return playerState.isReady;   
            }         
        },
        use: {
            parser: /inventory/,
            help: "inventory - view items you are carrying.",
            func: function (playerState) {
                var items = [];
                _(playerState.inventory).forEach(function (itemCount, itemName) {
                    items.push(itemName + " x" + itemCount);
                });
                return items.join("\n");
            },
            available: function (playerState) {
                return playerState.isReady;   
            }         
        }
    };